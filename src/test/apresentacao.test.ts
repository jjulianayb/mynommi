import { describe, expect, it } from "vitest";
import {
  COMO_FUNCIONA,
  ETAPAS,
  TOTAL_DE_PASSOS,
  limparResposta,
  progresso,
  recadoDaPrivacidade,
  recadoDoFim,
  respondeuAlgo,
  respostasParaSalvar,
} from "@/lib/apresentacao";

describe("as perguntas", () => {
  it("nenhuma pergunta é íntima: nada de estado civil, filhos, religião ou renda", () => {
    const tudo = ETAPAS.map((e) => e.titulo + " " + e.ajuda + " " + e.exemplo)
      .join(" ")
      .toLowerCase();
    for (const proibida of [
      "casad",
      "solteir",
      "namor",
      "filho",
      "religi",
      "igreja",
      "renda",
      "salári",
      "ganha",
      "peso",
      "corpo",
    ])
      expect(tudo).not.toContain(proibida);
  });
  it("cada etapa diz onde a resposta vai parar", () => {
    for (const e of ETAPAS) expect(["pagina", "sugestao"]).toContain(e.onde);
  });
  it("a pergunta do que a pessoa não gosta não vai para a página dela", () => {
    const naoTopa = ETAPAS.find((e) => e.chave === "naoTopa")!;
    expect(naoTopa.onde).toBe("sugestao");
    expect(recadoDaPrivacidade("sugestao")).toContain("não aparece na sua página");
    expect(recadoDaPrivacidade("pagina")).toContain("aparece na sua página");
  });
  it("a história tem espaço de parágrafo, não de frase", () => {
    expect(ETAPAS.find((e) => e.chave === "historia")!.max).toBeGreaterThanOrEqual(600);
  });
  it("cada etapa escreve num campo diferente do perfil", () => {
    const campos = ETAPAS.map((e) => e.campo);
    expect(new Set(campos).size).toBe(campos.length);
  });
});

describe("o progresso", () => {
  it("começa longe do fim e termina em 100", () => {
    expect(progresso(1)).toBeLessThan(50);
    expect(progresso(TOTAL_DE_PASSOS)).toBe(100);
  });
  it("passo fora da conta não estoura a barra", () => {
    expect(progresso(-5)).toBe(0);
    expect(progresso(999)).toBe(100);
  });
});

describe("o que é salvo", () => {
  it("só vai para o banco o que a pessoa escreveu", () => {
    expect(respostasParaSalvar({ historia: "  ", procura: "gente de domingo" })).toEqual({
      looking_for: "gente de domingo",
    });
  });
  it("pular tudo não escreve nada", () => {
    expect(respostasParaSalvar({})).toEqual({});
    expect(respondeuAlgo({})).toBe(false);
  });
  it("texto perde quebra de linha e comando, e respeita o limite", () => {
    expect(limparResposta("oi\u0000\n  tudo   bem", 50)).toBe("oi tudo bem");
    expect(limparResposta("a".repeat(900), 200).length).toBe(200);
  });
});

describe("o fecho", () => {
  it("quem pulou tudo não é repreendido", () => {
    const r = recadoDoFim({});
    expect(r).toContain("Sem problema");
    expect(/precisa|obrigat|deveria/i.test(r)).toBe(false);
  });
  it("quem respondeu em parte é convidado, não cobrado", () => {
    expect(recadoDoFim({ historia: "oi" })).toContain("quando der vontade");
  });
  it("explica os três caminhos para achar gente", () => {
    expect(COMO_FUNCIONA).toHaveLength(3);
    const tudo = COMO_FUNCIONA.map((c) => c.titulo + c.texto).join(" ");
    expect(tudo).toContain("Descobrir");
    expect(tudo).toContain("Tribo");
    expect(tudo).toContain("rolê");
  });
  it("a tribo é apresentada sem obrigação de marcar nada", () => {
    const tribo = COMO_FUNCIONA.find((c) => c.titulo.includes("tribo"))!;
    expect(tribo.texto).toContain("não obriga");
  });
});
