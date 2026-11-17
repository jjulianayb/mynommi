import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { portaDaTribo, recadoDaPorta } from "@/lib/porta-da-tribo";

/**
 * A remoção passou a valer (0070).
 *
 * O `AGENTS.md` afirmava desde a 0030 que a remoção "impede a pessoa de entrar
 * de novo até alguém desfazer". **Nunca foi verdade**: ao varrer o banco,
 * `teia_removals` era lida por **uma** função, a de apagar a conta. A tabela
 * era só escrita. Provado em transação com ROLLBACK em 16/11: a removida
 * entrou de volta na mesma hora.
 *
 * São três portas, e a terceira é a que quase passou: `responder_pedido()` é
 * SECURITY DEFINER e insere em `teia_members` **por cima da RLS**, então
 * fechar as duas políticas não bastava.
 */
const DIR = "drizzle/migrations";
const SQL = readFileSync(`${DIR}/0070_remocao_que_segura.sql`, "utf8");

describe("a trava existe nas três portas", () => {
  it("1) entrar direto: posso_entrar_na_tribo consulta a remoção", () => {
    const fn = SQL.slice(SQL.indexOf("FUNCTION public.posso_entrar_na_tribo"));
    const corpo = fn.slice(0, fn.indexOf("REVOKE"));
    expect(corpo).toMatch(/NOT public\.fui_removida_da_tribo\(_teia\)/);
  });

  it("2) pedir para entrar: a política recusa quem foi removida", () => {
    const pol = SQL.slice(SQL.indexOf('CREATE POLICY "Pedir para entrar"'));
    const ate = pol.slice(0, pol.indexOf(";"));
    expect(ate).toMatch(/NOT public\.fui_removida_da_tribo\(teia_id\)/);
    // A condição antiga não pode ter sido perdida ao recriar a política.
    expect(ate).toMatch(/NOT public\.tribo_e_aberta\(teia_id\)/);
    expect(ate).toMatch(/user_id = auth\.uid\(\)/);
    expect(ate).toMatch(/TO authenticated/);
  });

  it("3) ser aceita: responder_pedido barra antes de inserir", () => {
    const fn = SQL.slice(SQL.indexOf("FUNCTION public.responder_pedido"));
    const corpo = fn.slice(0, fn.indexOf("REVOKE"));
    expect(corpo).toMatch(/RETURN 'removida'/);
    // A guarda tem que vir ANTES do INSERT, senão não guarda nada.
    expect(corpo.indexOf("RETURN 'removida'")).toBeLessThan(
      corpo.indexOf("INSERT INTO public.teia_members"),
    );
    // Aqui não serve fui_removida_da_tribo(): ela pergunta por auth.uid(), que
    // neste ponto é a criadora, não quem está sendo aceita.
    expect(corpo).toMatch(/r\.user_id = _quem/);
  });

  it("a remoção não é mais uma tabela só de escrita", () => {
    // O defeito de origem em uma linha: quem consultava teia_removals.
    const lidaPor = readdirSync(DIR)
      .filter((f) => f.endsWith(".sql"))
      .filter((f) => readFileSync(`${DIR}/${f}`, "utf8").includes("teia_removals"));
    expect(lidaPor.length).toBeGreaterThan(1);
    expect(lidaPor).toContain("0070_remocao_que_segura.sql");
  });
});

describe("CREATE OR REPLACE, nunca DROP, nas funções que já existiam", () => {
  it("não há DROP FUNCTION nesta migração", () => {
    // DROP + CREATE zera a ACL e o padrão do Postgres é EXECUTE para PUBLIC,
    // do qual o anon herda. Foi assim que perfil_de_amigo ficou aberta (0066).
    expect(/DROP\s+FUNCTION/i.test(SQL)).toBe(false);
  });
  it("toda função da migração tem REVOKE de PUBLIC e anon", () => {
    const nomes = [...SQL.matchAll(/CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)/g)].map(
      (m) => m[1]!,
    );
    expect(nomes.length).toBe(4);
    for (const n of nomes)
      expect(SQL, n + " sem REVOKE").toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${n}\\(`),
      );
  });
});

describe("a lista do desfazer é de quem cuida da tribo", () => {
  it("remocoes_da_tribo confere criadora ou admin", () => {
    const fn = SQL.slice(SQL.indexOf("FUNCTION public.remocoes_da_tribo"));
    const corpo = fn.slice(0, fn.indexOf("REVOKE"));
    expect(corpo).toMatch(/is_teia_creator\(_teia, auth\.uid\(\)\)/);
    expect(corpo).toMatch(/has_role\(auth\.uid\(\), 'admin'\)/);
  });
});

describe("o que o botão diz para quem foi removida", () => {
  const base = {
    souMembro: false,
    souCriadora: false,
    entrada: "aberta" as const,
    meuPedido: null,
  };

  it("em tribo aberta, não diz mais entrar", () => {
    expect(portaDaTribo({ ...base, fuiRemovida: true })).toBe("removida");
    expect(portaDaTribo({ ...base, fuiRemovida: false })).toBe("entrar");
  });
  it("em tribo fechada, não diz pedir", () => {
    expect(portaDaTribo({ ...base, entrada: "fechada", fuiRemovida: true })).toBe("removida");
  });
  it("vem antes do consentimento", () => {
    // Pedir para consentir numa tribo de onde ela foi removida é pedir à toa:
    // a trava do banco recusaria depois do sim.
    expect(portaDaTribo({ ...base, sensivel: true, jaConsenti: false, fuiRemovida: true })).toBe(
      "removida",
    );
  });
  it("quem está dentro nunca vê isso", () => {
    expect(portaDaTribo({ ...base, souMembro: true, fuiRemovida: true })).toBe("dentro");
    expect(portaDaTribo({ ...base, souCriadora: true, fuiRemovida: true })).toBe("dentro");
  });
  it("sem a informação, a porta se comporta como antes", () => {
    // A tela pode ainda não passar o campo; isso não pode mudar nada.
    expect(portaDaTribo(base)).toBe("entrar");
  });

  it("o recado diz quem pode desfazer e não dá o motivo", () => {
    const frase = recadoDaPorta("removida");
    expect(frase.length).toBeGreaterThan(10);
    // O motivo é de quem cuida da tribo. E erro mudo faz a pessoa tentar dez
    // vezes achando que o app está quebrado.
    expect(/motivo|porque|denúncia|expuls/i.test(frase)).toBe(false);
    expect(frase).toMatch(/tribo/i);
  });
});
