import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O resgate por código (decisão da Ju, 12/11): o desconto vale para todas as
 * usuárias, e o anfitrião valida o código no balcão. A promessa que este
 * arquivo segura é a do meio: **o anfitrião nunca recebe telefone, e-mail ou
 * id de quem chegou** — só o apelido, e só na hora de validar.
 *
 * Os três testes de ambiguidade existem por um motivo concreto. A versão que
 * chegou pronta tinha `WHERE expires_at < now()` dentro de uma função cujo
 * parâmetro de saída também se chama `expires_at`. O plpgsql aceita criar a
 * função assim e só reclama **quando alguém chama**: a migração teria
 * aplicado limpa, o teste de permissão teria passado, e a primeira pessoa a
 * tocar em "resgatar" levaria um erro. Alias na tabela é o que fecha isso.
 */
const SQL = readFileSync("drizzle/migrations/0069_resgates_e_plano_anfitriao.sql", "utf8");

/** Cada corpo de função do arquivo, com o nome e os parâmetros de saída. */
type Funcao = { nome: string; saidas: string[]; corpo: string };

function funcoes(): Funcao[] {
  const achadas: Funcao[] = [];
  const pedacos = SQL.split(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+/i).slice(1);
  for (const pedaco of pedacos) {
    const nome = (pedaco.match(/^(?:public\.)?([a-z0-9_]+)/i) ?? [])[1];
    if (!nome) continue;
    const tabela = pedaco.match(/RETURNS\s+TABLE\s*\(([\s\S]*?)\)\s*\n?LANGUAGE/i);
    const saidas = tabela
      ? tabela[1]!.split(",").map((p) => p.trim().split(/\s+/)[0]!.toLowerCase())
      : [];
    achadas.push({ nome, saidas, corpo: pedaco });
  }
  return achadas;
}

describe("o arquivo está mesmo sendo lido", () => {
  // Extrator que volta vazio faz todo teste abaixo passar sem olhar nada. Foi
  // assim que o teste de voz deu falsa confiança por semanas.
  it("acha as funções do resgate", () => {
    const nomes = funcoes().map((f) => f.nome);
    for (const n of ["gerar_resgate", "validar_resgate", "meus_resgates", "anfitriao_status"])
      expect(nomes, "não achou " + n).toContain(n);
  });
  it("acha os parâmetros de saída", () => {
    const gerar = funcoes().find((f) => f.nome === "gerar_resgate")!;
    expect(gerar.saidas).toEqual(["codigo", "expires_at", "oferta", "anfitriao"]);
  });
});

describe("no WHERE, coluna com nome de parâmetro de saída anda com apelido", () => {
  /**
   * A regra exata, porque "use sempre apelido" é larga demais e reprova
   * `WHERE id = v_r.id`, que não tem risco nenhum. O erro de ambiguidade só
   * acontece quando o nome da coluna **é igual** ao de um parâmetro de saída
   * da própria função. Fora do WHERE o plpgsql não substitui nada: alvo de
   * SET e lista de colunas do INSERT são seguros.
   */
  for (const f of funcoes().filter((x) => x.saidas.length > 0)) {
    it(`${f.nome}: nada de ${f.saidas.join(", ")} solto no WHERE`, () => {
      const problemas: string[] = [];
      for (const trecho of f.corpo.split(";")) {
        if (!/public\.resgates/i.test(trecho)) continue;
        const onde = trecho.match(/\bWHERE\b([\s\S]*)$/i);
        if (!onde) continue;
        for (const saida of f.saidas) {
          // Solto = sem ponto antes. `r.status` está protegido; `status` não.
          if (new RegExp(`(?<![.\\w])${saida}\\b`, "i").test(onde[1]!))
            problemas.push(`${saida} em: ${trecho.trim().split("\n")[0]}`);
        }
      }
      expect(problemas, f.nome).toEqual([]);
    });
  }

  it("a régua pegaria o erro que veio pronto", () => {
    // Sem este caso, um extrator quebrado deixa tudo acima verde sem olhar
    // nada — foi assim que o teste de voz deu falsa confiança por semanas.
    const comBug = "UPDATE public.resgates SET status = 'x' WHERE expires_at < now()";
    const onde = comBug.match(/\bWHERE\b([\s\S]*)$/i)![1]!;
    expect(/(?<![.\w])expires_at\b/.test(onde)).toBe(true);
    const corrigido = "UPDATE public.resgates r SET status = 'x' WHERE r.expires_at < now()";
    expect(/(?<![.\w])expires_at\b/.test(corrigido.match(/\bWHERE\b([\s\S]*)$/i)![1]!)).toBe(false);
  });
});

describe("o anfitrião vê o mínimo", () => {
  const validar = funcoes().find((f) => f.nome === "validar_resgate")!;

  it("devolve só ok, oferta, apelido e motivo", () => {
    expect(validar.saidas).toEqual(["ok", "oferta", "apelido", "motivo"]);
  });

  it("do perfil, só o apelido sai da função", () => {
    // `p.id` no ON é chave de junção, não sai para ninguém. O que importa é
    // o que a função **lê** do perfil: a lista entre SELECT e INTO.
    const lista = validar.corpo.match(/SELECT([\s\S]*?)INTO\s+v_r/i)![1]!;
    const doPerfil = [...lista.matchAll(/\bp\.([a-z_]+)/g)].map((m) => m[1]);
    expect([...new Set(doPerfil)]).toEqual(["nickname"]);
    expect(/celular|email|e_mail|telefone/i.test(validar.corpo)).toBe(false);
  });
  it("nem o id da usuária encosta na saída", () => {
    // user_id só pode aparecer como chave de junção, nunca num RETURN QUERY.
    for (const linha of validar.corpo.split("\n"))
      if (/RETURN QUERY/i.test(linha)) expect(linha, linha).not.toMatch(/user_id|v_r\.id/);
  });

  it("só o dono do negócio daquele resgate valida", () => {
    expect(validar.corpo).toMatch(/b\.owner_id\s*=\s*auth\.uid\(\)/);
  });
});

describe("a tabela não se lê por fora", () => {
  it("RLS ligada e permissão tirada de todo mundo", () => {
    expect(SQL).toMatch(/ALTER TABLE public\.resgates ENABLE ROW LEVEL SECURITY/i);
    expect(SQL).toMatch(/REVOKE ALL ON public\.resgates FROM PUBLIC, anon, authenticated/i);
  });
  it("não cria política nenhuma: o acesso é só por RPC", () => {
    // Uma policy aqui abriria a leitura direta e o anfitrião passaria a
    // enxergar user_id das usuárias.
    expect(/CREATE POLICY[\s\S]*?ON public\.resgates/i.test(SQL)).toBe(false);
  });
  it("um código ativo por campanha é regra do banco, não só da função", () => {
    // Duas abas abertas criariam dois sem o índice.
    expect(SQL).toMatch(/CREATE UNIQUE INDEX[^;]*public\.resgates[^;]*WHERE status = 'ativo'/i);
  });
});

describe("tabela nova com dado de pessoa entra nas duas funções", () => {
  // A regra da casa, aqui no caso concreto desta migração. A geral está em
  // apagar-conta.test.ts.
  it("resgates sai na exportação", () => {
    const f = funcoes().find((x) => x.nome === "meus_dados")!;
    expect(f.corpo).toContain("public.resgates");
  });
  it("resgates some quando a conta é apagada", () => {
    const f = funcoes().find((x) => x.nome === "apagar_minha_conta")!;
    expect(f.corpo).toMatch(/DELETE FROM public\.resgates WHERE user_id = eu/i);
  });
  it("quem validou some sem arrastar o histórico de outra pessoa", () => {
    const f = funcoes().find((x) => x.nome === "apagar_minha_conta")!;
    expect(f.corpo).toMatch(/UPDATE public\.resgates SET validado_por = NULL/i);
    // RESTRICT faria o apagar da conta do anfitrião falhar calado.
    expect(SQL).toMatch(/validado_por uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/i);
  });
});
