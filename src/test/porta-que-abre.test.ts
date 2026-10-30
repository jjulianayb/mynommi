import { describe, expect, it } from "vitest";
import {
  PORTAS,
  convitePelaPorta,
  faltamParaAPorta,
  fraseDaPorta,
  portaAberta,
  proximaPorta,
  quantoEncheu,
} from "@/lib/porta-que-abre";
import {
  MAX_CONVITES_POR_VEZ,
  enderecoDoWhatsApp,
  linkParaTribo,
  recadoDoLote,
  soNumeros,
  textoParaTribo,
} from "@/lib/convite-em-lote";

describe("a porta da tribo diz a verdade", () => {
  it("tribo vazia convida em vez de acusar vazio", () => {
    expect(fraseDaPorta(0)).toContain("Seja a primeira");
  });
  it("diz o número real e o que falta", () => {
    expect(fraseDaPorta(4)).toBe("4 pessoas aqui. Faltam 6 para abrir o primeiro rolê.");
    expect(fraseDaPorta(1)).toBe("1 pessoa aqui. Faltam 2 para abrir a primeira conversa.");
  });
  it("nunca infla o número: a frase só usa quem está lá", () => {
    for (const n of [0, 1, 4, 9, 30]) {
      const f = fraseDaPorta(n);
      if (n > 0) expect(f).toContain(String(n));
    }
  });
  it("tribo cheia não inventa meta nova", () => {
    expect(proximaPorta(99)).toBe(null);
    expect(fraseDaPorta(99)).toContain("completa");
    expect(faltamParaAPorta(99)).toBe(0);
  });
  it("a barra enche entre uma porta e a seguinte", () => {
    expect(quantoEncheu(0)).toBe(0);
    // Ao cruzar uma porta a barra recomeça do zero rumo à próxima: é o que
    // mantém o objetivo à vista em vez de uma barra quase cheia para sempre.
    expect(quantoEncheu(3)).toBe(0);
    expect(quantoEncheu(6)).toBeGreaterThan(0);
    expect(quantoEncheu(9)).toBeGreaterThan(quantoEncheu(6));
    expect(quantoEncheu(99)).toBe(100);
    for (const n of [0, 1, 5, 12, 40]) {
      expect(quantoEncheu(n)).toBeGreaterThanOrEqual(0);
      expect(quantoEncheu(n)).toBeLessThanOrEqual(100);
    }
  });
  it("o convite muda de tom conforme falta pouco", () => {
    expect(convitePelaPorta(2)).toContain("Falta uma");
    expect(convitePelaPorta(99)).toBe("");
  });
  it("as portas são crescentes e nenhuma cobra rolê antes da hora", () => {
    const ems = PORTAS.map((p) => p.em);
    expect([...ems].sort((a, b) => a - b)).toEqual(ems);
    expect(portaAberta(3, "a primeira conversa")).toBe(true);
    expect(portaAberta(3, "o primeiro rolê")).toBe(false);
  });
});

describe("convidar em lote", () => {
  it("o link cai dentro da tribo, não só na porta do app", () => {
    const l = linkParaTribo("https://nommibr.com.br", "ANA-7K2P", 100015);
    expect(l).toBe("https://nommibr.com.br/conta?modo=criar&convite=ANA-7K2P&tribo=100015");
  });
  it("sem tribo, o link é o geral", () => {
    expect(linkParaTribo("https://nommibr.com.br/", "X1")).toBe(
      "https://nommibr.com.br/conta?modo=criar&convite=X1",
    );
  });
  it("o texto diz quem convidou: é isso que faz alguém instalar", () => {
    const t = textoParaTribo("Ana", "https://l", "Caminhada", 6);
    expect(t).toContain("Ana");
    expect(t).toContain("Caminhada");
    expect(t).toContain("Faltam 6");
  });
  it("sem nome, não inventa pessoa nenhuma", () => {
    expect(textoParaTribo("", "https://l")).toContain("Uma amiga");
  });
  it("telefone brasileiro sem país ganha o 55", () => {
    expect(soNumeros("(31) 98888-7777")).toBe("5531988887777");
    expect(soNumeros("+55 31 98888-7777")).toBe("5531988887777");
    expect(soNumeros("")).toBe("");
  });
  it("sem telefone, o WhatsApp abre para escolher a pessoa", () => {
    expect(enderecoDoWhatsApp("oi")).toBe("https://wa.me/?text=oi");
    expect(enderecoDoWhatsApp("oi", "31988887777")).toContain("wa.me/5531988887777");
  });
  it("o contador mostra o avanço da rodada", () => {
    expect(recadoDoLote(0)).toContain(String(MAX_CONVITES_POR_VEZ));
    expect(recadoDoLote(3)).toContain("3 convites mandados");
    expect(recadoDoLote(50)).toContain("completa");
  });
});
