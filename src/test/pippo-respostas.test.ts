import { describe, expect, it } from "vitest";
import { RESPOSTAS_DO_PIPPO, respostaPara } from "@/lib/pippo-respostas";

describe("respostas do Pippo", () => {
  it("cada pergunta pronta leva à própria resposta", () => {
    for (const r of RESPOSTAS_DO_PIPPO) expect(respostaPara(r.pergunta)?.id).toBe(r.id);
  });
  it("entende texto livre sem acento", () => {
    expect(respostaPara("como marcar um rolê?")?.id).toBe("role");
    expect(respostaPara("quantas pessoas por dia")?.id).toBe("limite");
  });
  it("não inventa resposta", () => {
    expect(respostaPara("qual a previsão do tempo")).toBeNull();
    expect(respostaPara("")).toBeNull();
  });
  it("não escreve Pipo com um p só nem promete o que não existe", () => {
    const tudo = RESPOSTAS_DO_PIPPO.map((r) => r.pergunta + r.resposta).join(" ");
    expect(/\bPipo\b/.test(tudo)).toBe(false);
    expect(/teia/i.test(tudo)).toBe(false);
  });
});
