import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A rede para o furo de 07/11.
 *
 * `DROP FUNCTION` + `CREATE FUNCTION` **zera a ACL**, e o padrão do Postgres é
 * EXECUTE para PUBLIC — do qual o `anon` herda. Foi assim que
 * `perfil_de_amigo` ficou aberta para quem não está logado enquanto as irmãs
 * dela foram fechadas na mesma migração: ela tinha sido recriada com DROP.
 * Ao varrer o banco, eram **41 funções** nessa situação, 26 com SECURITY
 * DEFINER.
 *
 * Guarda no corpo (`IF auth.uid() IS NULL THEN RETURN`) é a segunda linha de
 * defesa, não a primeira: basta uma função nova esquecer a guarda para a porta
 * estar aberta. A primeira linha é a permissão.
 *
 * Este teste lê as migrações, não o banco — o ambiente de teste não alcança
 * produção. Ele pega o erro **na hora de escrever**, que é onde custa barato.
 */
const PASTA = "drizzle/migrations";

/** Abertas de propósito. Qualquer nome novo aqui é decisão consciente. */
const PODEM_RESPONDER_A_ANONIMO = new Set([
  // A página pública da tribo é anônima por desenho.
  "tribo_publica",
  // Citadas dentro de políticas RLS: revogar faria a leitura de quem não
  // está logado virar erro de permissão em vez de vazio. Só devolvem
  // booleano sobre quem está chamando.
  "is_teia_member",
  "pode_criar_role_na_tribo",
  "posso_ver_a_mensagem",
]);

type Achada = { arquivo: string; nome: string; corpo: string };

function funcoesSecurityDefiner(): Achada[] {
  const achadas: Achada[] = [];
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(`${PASTA}/${arquivo}`, "utf8");
    // Cada CREATE [OR REPLACE] FUNCTION até o próximo, ou até o fim.
    const pedacos = sql.split(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/i).slice(1);
    for (const pedaco of pedacos) {
      const nome = (pedaco.match(/^(?:public\.)?([a-z0-9_]+)/i) ?? [])[1];
      if (!nome) continue;
      if (!/SECURITY\s+DEFINER/i.test(pedaco)) continue;
      achadas.push({ arquivo, nome, corpo: pedaco });
    }
  }
  return achadas;
}

describe("função SECURITY DEFINER não nasce aberta para anônimo", () => {
  const achadas = funcoesSecurityDefiner();

  it("o teste está realmente lendo as migrações", () => {
    // Extrator que volta vazio faz o teste abaixo passar sem olhar nada — foi
    // exatamente assim que o teste de voz deu falsa confiança por semanas.
    expect(achadas.length).toBeGreaterThan(20);
    expect(achadas.map((a) => a.nome)).toContain("perfil_de_amigo");
  });

  it("toda função nova tem REVOKE de PUBLIC e anon no mesmo arquivo", () => {
    const faltando: string[] = [];
    for (const { arquivo, nome } of achadas) {
      if (PODEM_RESPONDER_A_ANONIMO.has(nome)) continue;
      const sql = readFileSync(`${PASTA}/${arquivo}`, "utf8");
      // Serve o REVOKE nominal ou o laço que varre e fecha (0066).
      const fechaEssa = new RegExp(
        `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+(?:public\\.)?${nome}\\s*\\(`,
        "i",
      ).test(sql);
      const fechaEmLote = /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon/i.test(sql);
      if (!fechaEssa && !fechaEmLote) faltando.push(`${arquivo}: ${nome}`);
    }
    // As migrações antigas ficam de fora: a 0066 varreu e fechou todas de uma
    // vez. O que este teste protege é o que vier **depois** dela.
    const depoisDa0066 = faltando.filter((f) => {
      const n = Number((f.match(/^(\d{4})/) ?? [])[1] ?? 0);
      return n >= 66;
    });
    expect(depoisDa0066, "sem REVOKE de PUBLIC/anon:\n" + depoisDa0066.join("\n")).toEqual([]);
  });

  it("a lista de exceções é curta e explícita", () => {
    // Exceção é decisão, não descuido. Se esta lista crescer, alguém está
    // abrindo porta sem perceber.
    expect(PODEM_RESPONDER_A_ANONIMO.size).toBeLessThanOrEqual(6);
  });
});

describe("a 0066 fechou o que precisava e deixou o que devia", () => {
  const sql = readFileSync(`${PASTA}/0066_funcao_nao_responde_a_anonimo.sql`, "utf8");

  it("mantém abertas só as quatro de propósito", () => {
    for (const nome of PODEM_RESPONDER_A_ANONIMO) expect(sql).toContain(nome);
  });

  it("o bloqueio vale nos dois ramos do perfil_de_amigo", () => {
    // O ramo público ignorava bloqueio: a política da tabela escondia o
    // perfil, mas a RPC entregava — e a tela usa a RPC quando a tabela vem
    // vazia, então quem foi bloqueado via o perfil.
    const fn = sql.slice(sql.indexOf("FUNCTION public.perfil_de_amigo"));
    expect(fn).toContain("is_blocked_between");
    const ondeBloqueio = fn.indexOf("is_blocked_between");
    const ondeRamos = fn.indexOf("profile_mode = 'publico' OR");
    expect(ondeBloqueio).toBeGreaterThan(0);
    expect(ondeRamos).toBeGreaterThan(0);
    // O bloqueio tem que vir como condição irmã, antes do OR dos dois ramos.
    expect(ondeBloqueio).toBeLessThan(ondeRamos);
  });
});
