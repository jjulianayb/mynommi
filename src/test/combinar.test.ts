import { describe, expect, it } from "vitest";
import {
  decisaoDoArrasto,
  interessesOrdenados,
  porqueApareceu,
  recadoDaResposta,
  toCandidata,
  type Candidata,
} from "@/lib/combinar";

const base: Candidata = {
  userId: "u1",
  nome: "Bia",
  avatar: "",
  capa: "",
  cidade: "Belo Horizonte",
  sobre: "",
  interesses: ["Café", "Cinema", "Vinho"],
  objetivos: [],
  lugares: [],
  procurando: "",
  verificada: false,
  emComum: ["Café", "Cinema"],
  afinidade: 5,
  mesmaCidade: true,
  jaMeCurtiu: false,
  fundo: "",
  tribosEmComum: 0,
  fotoFoco: { x: 50, y: 50 },
};

describe("porque apareceu", () => {
  it("diz os interesses em comum quando existem", () => {
    expect(porqueApareceu(base)).toBe("Vocês dois gostam de Café e Cinema");
    expect(porqueApareceu({ ...base, emComum: ["Café"] })).toBe("Vocês dois gostam de Café");
    expect(porqueApareceu({ ...base, emComum: ["a", "b", "c", "d"] })).toContain("a, b, c");
  });
  it("cai para a cidade quando não há interesse em comum", () => {
    expect(porqueApareceu({ ...base, emComum: [] })).toBe("Está em Belo Horizonte, como você");
  });
  it("não inventa afinidade quando não há nada em comum", () => {
    const sem = { ...base, emComum: [], mesmaCidade: false, cidade: "" };
    expect(porqueApareceu(sem)).toBe("Chegou agora na nommi");
  });
});

describe("recado da resposta", () => {
  it("avisa o match pelo nome", () => {
    expect(recadoDaResposta("match", "Bia")).toContain("Bia");
  });
  it("não promete nada quando só um lado quis", () => {
    expect(recadoDaResposta("guardado", "Bia")).not.toContain("Bia");
  });
  it("não culpa ninguém ao passar", () => {
    expect(recadoDaResposta("passou", "Bia")).toBe("Tudo bem. Vamos ver outra pessoa.");
  });
});

describe("interesses ordenados", () => {
  it("põe o que é comum na frente, sem repetir", () => {
    const lista = interessesOrdenados(base);
    expect(lista.map((i) => i.nome)).toEqual(["Café", "Cinema", "Vinho"]);
    expect(lista.filter((i) => i.comum)).toHaveLength(2);
  });
});

describe("arrasto", () => {
  it("não decide por um toque sem intenção", () => {
    expect(decisaoDoArrasto(20, 360)).toBe(null);
    expect(decisaoDoArrasto(-30, 360)).toBe(null);
  });
  it("decide quando o arrasto passa de um terço da tela", () => {
    expect(decisaoDoArrasto(140, 360)).toBe("sim");
    expect(decisaoDoArrasto(-140, 360)).toBe("nao");
  });
  it("mantém um mínimo em telas estreitas", () => {
    expect(decisaoDoArrasto(60, 100)).toBe(null);
  });
});

describe("conversão do banco", () => {
  it("sobrevive a campos vazios", () => {
    const c = toCandidata({
      user_id: "x",
      nickname: null,
      avatar_url: null,
      cover_path: null,
      city: null,
      about: null,
      interests: null,
      goals: null,
      places: null,
      looking_for: null,
      person_verified: null,
      em_comum: null,
      afinidade: null,
      mesma_cidade: null,
      ja_me_curtiu: null,
      background_path: null,
      tribos_em_comum: null,
    });
    expect(c.nome).toBe("Alguém da nommi");
    expect(c.interesses).toEqual([]);
    expect(c.afinidade).toBe(0);
    expect(c.verificada).toBe(false);
  });
});
