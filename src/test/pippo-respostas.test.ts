import { describe, expect, it } from "vitest";
import {
  RESPOSTAS_DO_PIPPO,
  baloes,
  papoPara,
  respostaPara,
  respostaPorId,
} from "@/lib/pippo-respostas";

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

  it("sugere só perguntas que existem", () => {
    for (const r of RESPOSTAS_DO_PIPPO)
      for (const id of r.depois) expect(respostaPorId(id)).not.toBeNull();
  });
  it("quebra a resposta em balões curtos sem perder texto", () => {
    for (const r of RESPOSTAS_DO_PIPPO) {
      const b = baloes(r.resposta);
      expect(b.join(" ")).toBe(r.resposta);
      expect(b.every((x) => x.length <= 220)).toBe(true);
    }
  });
  it("responde conversa fiada", () => {
    expect(papoPara("oi!")).not.toBeNull();
    expect(papoPara("valeu")).not.toBeNull();
    expect(papoPara("qual a previsão do tempo")).toBeNull();
  });
});
