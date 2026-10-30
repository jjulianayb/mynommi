import { describe, expect, it } from "vitest";
import {
  LIMITES,
  PERSONALIZACAO_VAZIA,
  arrumarPersonalizacao,
  desenhoDaFigurinha,
  linkDaTribo,
  podeTerLinkPublico,
  quantoFalta,
  recadoDaIdentidade,
  recadoDeQuemCria,
  recadoDoLink,
  recadoSemRole,
  separarRoles,
  textoDeDivulgacao,
  type Personalizacao,
  type RoleDaTribo,
} from "@/lib/tribo-da-dona";

const p = (extra: Partial<Personalizacao> = {}): Personalizacao => ({
  ...PERSONALIZACAO_VAZIA,
  ...extra,
});

const role = (extra: Partial<RoleDaTribo> = {}): RoleDaTribo => ({
  id: 1,
  name: "Café no sábado",
  place: "Café Savassi",
  city: "Belo Horizonte",
  when_text: "",
  starts_at: null,
  capacity: null,
  going_count: 0,
  i_am_going: false,
  creator_nickname: "Ju",
  i_am_creator: false,
  ja_passou: false,
  ...extra,
});

describe("a figurinha da tribo", () => {
  it("vem do catálogo, pelo nome", () => {
    expect(desenhoDaFigurinha("café")).toBeTruthy();
  });
  it("nome de fora do catálogo não desenha nada", () => {
    // Importa porque o valor vem do banco: se virasse texto solto, qualquer
    // coisa gravada ali apareceria na tela.
    expect(desenhoDaFigurinha("<script>")).toBe("");
    expect(desenhoDaFigurinha("inventado")).toBe("");
  });
  it("e é jogada fora ao salvar", () => {
    expect(arrumarPersonalizacao(p({ figurinha: "inventado" })).figurinha).toBe("");
    expect(arrumarPersonalizacao(p({ figurinha: "café" })).figurinha).toBe("café");
  });
});

describe("o que a dona escreve", () => {
  it("respeita o limite de cada coluna", () => {
    const longo = "a".repeat(2000);
    const a = arrumarPersonalizacao(
      p({ missao: longo, valores: longo, visao: longo, rule: longo, about: longo }),
    );
    expect(a.missao).toHaveLength(LIMITES.missao);
    expect(a.valores).toHaveLength(LIMITES.valores);
    expect(a.visao).toHaveLength(LIMITES.visao);
    expect(a.rule).toHaveLength(LIMITES.regra);
    expect(a.about).toHaveLength(LIMITES.sobre);
  });
  it("tira espaço sobrando sem comer as linhas", () => {
    expect(arrumarPersonalizacao(p({ valores: "  Respeito\nEscuta  " })).valores).toBe(
      "Respeito\nEscuta",
    );
  });
  it("quem escreve nas duas opções nunca sai de todos ou criadora", () => {
    const a = arrumarPersonalizacao(
      p({ who_posts: "qualquer" as never, who_roles: "qualquer" as never }),
    );
    expect(a.who_posts).toBe("todos");
    expect(a.who_roles).toBe("todos");
  });
});

describe("o quanto a tribo está montada", () => {
  it("conta só o que foi escrito", () => {
    expect(quantoFalta(p()).feitos).toBe(0);
    expect(quantoFalta(p({ missao: "x", figurinha: "café" })).feitos).toBe(2);
  });
  it("campo só com espaço não conta como escrito", () => {
    expect(quantoFalta(p({ missao: "   " })).feitos).toBe(0);
  });
  it("o recado convida e nunca cobra", () => {
    for (const q of [p(), p({ missao: "x" }), p({ missao: "x", valores: "y", visao: "z" })]) {
      const r = recadoDaIdentidade(q);
      expect(/precisa|obrigat|falta preencher|incompleta/i.test(r)).toBe(false);
    }
    expect(recadoDaIdentidade(p({ missao: "x" }))).toContain("depois");
  });
});

describe("quem cria rolê", () => {
  it("diz em palavras, não em rótulo técnico", () => {
    expect(recadoDeQuemCria("todos")).toContain("Qualquer pessoa");
    expect(recadoDeQuemCria("criadora")).toContain("Só você");
  });
  it("quando ninguém marcou rolê, o recado depende de quem pode marcar", () => {
    expect(recadoSemRole(true, "criadora")).toContain("marcar o primeiro");
    expect(recadoSemRole(false, "criadora")).toContain("quem criou a tribo");
    expect(recadoSemRole(false, "todos")).not.toContain("quem criou");
  });
});

describe("o link da tribo", () => {
  it("é endereço de página, não código de convite", () => {
    const l = linkDaTribo("https://nommibr.com.br", 100018);
    expect(l).toBe("https://nommibr.com.br/tribo/100018");
    // Código de convite é pessoal e vale uma vez; link de divulgação é usado
    // por muita gente. Não pode carregar código nenhum.
    expect(l).not.toContain("convite");
    expect(l).not.toContain("?");
  });
  it("não dobra a barra quando a origem já termina em barra", () => {
    expect(linkDaTribo("https://nommibr.com.br/", 7)).toBe("https://nommibr.com.br/tribo/7");
  });
  it("o texto de divulgação diz o que a nommi é, para quem nunca ouviu falar", () => {
    const t = textoDeDivulgacao("Café e IA", "São Paulo", "https://x/tribo/1");
    expect(t).toContain("Café e IA");
    expect(t).toContain("São Paulo");
    expect(t).toContain("https://x/tribo/1");
    expect(t).toContain("amizade");
  });
  it("sem cidade, o texto não fica com espaço solto", () => {
    expect(textoDeDivulgacao("Trilhas", "", "https://x/tribo/2")).not.toContain("  ");
  });
});

describe("tribo sensível não tem página pública", () => {
  it("nem se a dona pedir", () => {
    expect(podeTerLinkPublico(true)).toBe(false);
    expect(podeTerLinkPublico(false)).toBe(true);
  });
  it("e o recado explica por quê, sem culpar a dona", () => {
    const r = recadoDoLink(true, false);
    expect(r).toContain("delicado");
    expect(r).toContain("convite");
    expect(/você não pode|proibido|não permitimos/i.test(r)).toBe(false);
  });
  it("com a página no ar, avisa que qualquer pessoa com o link vê a tribo", () => {
    expect(recadoDoLink(false, true)).toContain("Qualquer pessoa");
  });
});

describe("os rolês da tribo", () => {
  it("separa o que vem do que já passou", () => {
    const s = separarRoles([role({ id: 1 }), role({ id: 2, ja_passou: true })]);
    expect(s.proximos.map((r) => r.id)).toEqual([1]);
    expect(s.passados.map((r) => r.id)).toEqual([2]);
  });
});
