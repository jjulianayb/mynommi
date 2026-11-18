import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { editPost } from "@/lib/posts";
import { NAO_SEI_AINDA, RESPOSTAS_DO_PIPPO, respostaPara } from "@/lib/pippo-respostas";
import { foraDaVozDoPippo } from "@/lib/voz-do-pippo";

/**
 * Editar e apagar o que é meu (0071), e as respostas de caminho do Pippo.
 *
 * O que já existia quando o pedido chegou, conferido no banco ao vivo: a
 * política de editar post e a de apagar post **já estavam lá** — editar
 * publicação funcionava no banco e nenhuma tela usava. O que faltava era
 * UPDATE em `teia_messages` e a marca de edição nas duas.
 */
const SQL = readFileSync("drizzle/migrations/0071_editar_e_apagar_o_que_e_meu.sql", "utf8");

describe("o arquivo está mesmo sendo lido", () => {
  it("acha as duas políticas e o gatilho", () => {
    expect(SQL).toContain('CREATE POLICY "Editar meu post"');
    expect(SQL).toContain('CREATE POLICY "Editar minha mensagem"');
    expect(SQL).toContain("FUNCTION public.marca_edicao()");
  });
});

describe("a data da edição é do servidor", () => {
  it("quem carimba é o gatilho, nos dois lugares", () => {
    // Data que o cliente escreve é data que o cliente mente — mesma razão de
    // registrar_aceite (0034).
    expect(SQL).toMatch(/CREATE TRIGGER posts_marca_edicao BEFORE UPDATE ON public\.posts/);
    expect(SQL).toMatch(
      /CREATE TRIGGER teia_messages_marca_edicao BEFORE UPDATE ON public\.teia_messages/,
    );
  });
  it("o cliente não recebe permissão de escrever editado_em", () => {
    const grants = [...SQL.matchAll(/GRANT UPDATE \(([^)]*)\)/g)].map((m) => m[1]!);
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) expect(g, "GRANT UPDATE (" + g + ")").not.toMatch(/editado_em/);
  });
  it("só o texto conta como edição", () => {
    // Moderação mexendo em status não pode marcar o post como "editado" na
    // cara de quem lê.
    const fn = SQL.slice(SQL.indexOf("FUNCTION public.marca_edicao"));
    expect(fn).toMatch(/NEW\.body IS DISTINCT FROM OLD\.body/);
  });
});

describe("a permissão de UPDATE em posts é só do texto", () => {
  it("a permissão larga é revogada antes de dar a estreita", () => {
    const revoke = SQL.indexOf("REVOKE UPDATE ON public.posts FROM authenticated");
    const grant = SQL.indexOf("GRANT UPDATE (body) ON public.posts");
    expect(revoke).toBeGreaterThan(0);
    expect(grant).toBeGreaterThan(revoke);
  });
  it("nenhuma coluna perigosa volta no GRANT", () => {
    // Com status, secret, expires_at, anonymous ou author_id no alcance do
    // cliente, o autor desfazia moderação, furava o "Só entre nós", esticava
    // o prazo e reescrevia a autoria.
    //
    // A lista de colunas é lida por regex, não por `indexOf` de um texto
    // exato: procurar "GRANT UPDATE (body)" fazia o teste passar **sem olhar
    // nada** quando alguém acrescentava uma coluna, porque o texto deixava de
    // existir. Descoberto reintroduzindo o bug de propósito.
    const achado = SQL.match(/GRANT UPDATE \(([^)]*)\) ON public\.posts/);
    expect(achado, "não achei o GRANT UPDATE de posts").toBeTruthy();
    const colunas = achado![1]!.split(",").map((c) => c.trim());
    expect(colunas).toEqual(["body"]);
  });
  it("post removido pela moderação não é editável", () => {
    // O USING olha a linha **velha**. Sem isso o autor punha o status de
    // volta em 'publicado' e ressuscitava o próprio post removido.
    const pol = SQL.slice(SQL.indexOf('CREATE POLICY "Editar meu post"'));
    const ate = pol.slice(0, pol.indexOf(";"));
    const using = ate.slice(ate.indexOf("USING"), ate.indexOf("WITH CHECK"));
    expect(using).toMatch(/status = 'publicado'/);
    expect(using).toMatch(/author_id = auth\.uid\(\)/);
  });
});

describe("mensagem da tribo: só quem escreveu mexe", () => {
  it("a política é pelo remetente", () => {
    const pol = SQL.slice(SQL.indexOf('CREATE POLICY "Editar minha mensagem"'));
    const ate = pol.slice(0, pol.indexOf(";"));
    expect(ate).toMatch(/USING \(sender_id = auth\.uid\(\)\)/);
    expect(ate).toMatch(/WITH CHECK \(sender_id = auth\.uid\(\)\)/);
    expect(ate).toMatch(/TO authenticated/);
  });
  it("a permissão é só do texto: apelido e autor não se reescrevem", () => {
    const achado = SQL.match(/GRANT UPDATE \(([^)]*)\) ON public\.teia_messages/);
    expect(achado, "não achei o GRANT UPDATE de teia_messages").toBeTruthy();
    expect(achado![1]!.split(",").map((c) => c.trim())).toEqual(["body"]);
  });
});

describe("apagar o post: a linha sai antes dos arquivos", () => {
  const fonte = readFileSync("src/lib/posts.ts", "utf8");
  const corpo = fonte.slice(fonte.indexOf("export async function deletePost"));
  const ate = corpo.slice(0, corpo.indexOf("return true"));

  it("a linha é apagada antes da mídia", () => {
    // Era o contrário: falhar no meio deixava o post de pé com as fotos já
    // apagadas do balde — post com imagem quebrada que ninguém arruma.
    // Mesmo bug do remove() do story, corrigido em 17/11.
    const linha = ate.indexOf('from("posts").delete()');
    const arquivo = ate.indexOf(".remove(paths)");
    expect(linha).toBeGreaterThan(0);
    expect(arquivo).toBeGreaterThan(0);
    expect(linha, "a mídia está sendo apagada antes da linha").toBeLessThan(arquivo);
  });
  it("falhar na linha não chega a tocar nos arquivos", () => {
    expect(ate).toMatch(/if \(error\) return false;/);
  });
});

describe("editar post: recusa antes de falar com o servidor", () => {
  it("texto vazio não vira edição", async () => {
    // Não chega a chamar o banco: `cleanBody` corta antes.
    expect(await editPost("qualquer", "   ")).toEqual({
      ok: false,
      error: "Escreva algo antes de salvar.",
    });
  });
  it("zero linhas alteradas não é sucesso", () => {
    // Sem `.select()`, a política recusando devolveria sucesso silencioso: a
    // tela diria "salvo" e o texto continuaria o antigo.
    const fonte = readFileSync("src/lib/posts.ts", "utf8");
    const fn = fonte.slice(fonte.indexOf("export async function editPost"));
    const ate = fn.slice(0, fn.indexOf("\n}"));
    expect(ate).toContain('.select("id")');
    expect(ate).toMatch(/length === 0/);
  });
});

describe("o Pippo diz o caminho, não a definição", () => {
  /**
   * O caso da Ana Flávia (17/11): ela perguntou "como editar minha tribo?" e
   * o Pippo explicou **o que é** uma tribo. Ela já sabia; queria o botão.
   */
  it("a pergunta da Ana cai na resposta de caminho", () => {
    const r = respostaPara("como editar minha tribo?");
    expect(r?.id).toBe("editar-tribo");
    expect(r?.resposta).toMatch(/Editar minha tribo/);
  });
  it("as perguntas de caminho não caem na definição de tribo", () => {
    const casos: [string, string][] = [
      ["como edito minha tribo", "editar-tribo"],
      ["quero trocar a capa da tribo", "capa-tribo"],
      ["como apago uma publicacao minha", "editar-post"],
      ["onde vejo minhas notificacoes", "ver-avisos"],
      ["onde ficam os roles", "onde-roles"],
    ];
    for (const [pergunta, id] of casos) expect(respostaPara(pergunta)?.id, pergunta).toBe(id);
  });
  it("o caminho diz onde tocar, em ordem", () => {
    const deCaminho = ["editar-tribo", "capa-tribo", "editar-post", "ver-avisos", "onde-roles"];
    const achadas = RESPOSTAS_DO_PIPPO.filter((r) => deCaminho.includes(r.id));
    expect(achadas.map((r) => r.id).sort()).toEqual([...deCaminho].sort());
    for (const r of achadas)
      // Caminho sem verbo de toque é explicação disfarçada de caminho.
      expect(r.resposta, r.id).toMatch(/toque|abra|menu/i);
  });
  it("o que é tribo continua respondendo o que é tribo", () => {
    // A régua nova não pode ter roubado a pergunta antiga.
    expect(respostaPara("o que e uma tribo")?.id).toBe("tribo");
  });
});

describe("quando ele não sabe", () => {
  it("admite e encaminha, em vez de inventar", () => {
    expect(respostaPara("qual o sentido da vida")).toBeNull();
    const texto = NAO_SEI_AINDA.join(" ");
    expect(texto).toMatch(/não sei|nao sei/i);
    expect(texto).toMatch(/Ajuda/);
  });
  it("o recado de não saber respeita a régua de voz do Pippo", () => {
    // Mascote dando notícia de erro, senha ou denúncia é o jeito mais rápido
    // de a pessoa achar que o app está tirando sarro dela.
    expect(foraDaVozDoPippo(NAO_SEI_AINDA.join(" "))).toEqual([]);
  });
});
