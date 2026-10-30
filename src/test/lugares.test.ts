import { describe, expect, it } from "vitest";
import {
  CENTRO_DE_BH,
  doCatalogo,
  filtrarSugestoes,
  juntarSugestoes,
  maisPertoDeVerdade,
  nomeDoLugar,
  pertoDeBH,
  recadoDeLugar,
  type Sugestao,
} from "@/lib/lugares";

const s = (nome: string, fonte: Sugestao["fonte"] = "cidade", area = ""): Sugestao => ({
  nome,
  area,
  cidade: "",
  fonte,
});

// Cidades onde a nommi já tem gente cadastrada. O radar tem que se comportar
// em todas, não só em Belo Horizonte.
const CIDADES = {
  bh: { lat: -19.9227, lng: -43.9441 },
  buritis: { lat: -19.9731, lng: -43.9797 },
  saoPaulo: { lat: -23.5505, lng: -46.6333 },
  rio: { lat: -22.9068, lng: -43.1729 },
  joaoMonlevade: { lat: -19.8103, lng: -43.1736 },
  rioPiracicaba: { lat: -19.9294, lng: -43.1739 },
  florianopolis: { lat: -27.5949, lng: -48.5482 },
};

describe("o catálogo de BH não se mete em outras cidades", () => {
  it("vale perto de BH", () => {
    expect(pertoDeBH(CENTRO_DE_BH.lat, CENTRO_DE_BH.lng)).toBe(true);
    expect(pertoDeBH(CIDADES.buritis.lat, CIDADES.buritis.lng)).toBe(true);
  });
  it("não vale em nenhuma das outras cidades onde já tem gente", () => {
    for (const [nome, c] of Object.entries(CIDADES)) {
      if (nome === "bh" || nome === "buritis") continue;
      expect(pertoDeBH(c.lat, c.lng), nome).toBe(false);
      expect(doCatalogo(c.lat, c.lng), nome).toHaveLength(0);
    }
  });
  it("não diz a quem está em São Paulo que ela está num lugar de BH", () => {
    // Era o bug: nearestPlace percorria uma lista só de BH e devolvia o menos
    // distante, sem olhar a distância.
    expect(maisPertoDeVerdade(CIDADES.saoPaulo.lat, CIDADES.saoPaulo.lng)).toBeNull();
    expect(maisPertoDeVerdade(CIDADES.rio.lat, CIDADES.rio.lng)).toBeNull();
  });
  it("em BH, só aponta o lugar se estiver realmente ali", () => {
    const centro = maisPertoDeVerdade(CENTRO_DE_BH.lat, CENTRO_DE_BH.lng);
    expect(centro?.name).toBeTruthy();
    // No Buritis não há nada do catálogo por perto: melhor nada do que
    // mandar a pessoa para o BH Shopping, que é o que acontecia.
    expect(maisPertoDeVerdade(CIDADES.buritis.lat, CIDADES.buritis.lng)).toBeNull();
  });
  it("no centro de BH, oferece mais de um lugar", () => {
    expect(doCatalogo(CENTRO_DE_BH.lat, CENTRO_DE_BH.lng).length).toBeGreaterThan(1);
  });
});

describe("as fontes se juntam sem repetir", () => {
  it("o lugar da pessoa vem antes do lugar da cidade", () => {
    const j = juntarSugestoes([s("Praça do bairro", "meu")], [s("Café Savassi")]);
    expect(j[0]?.fonte).toBe("meu");
  });
  it("mesmo lugar escrito com e sem acento é um só", () => {
    const j = juntarSugestoes([s("Café Savassi", "meu")], [s("cafe savassi")]);
    expect(j).toHaveLength(1);
    expect(j[0]?.fonte).toBe("meu");
  });
  it("lugar sem nome não entra", () => {
    expect(juntarSugestoes([s("   ")])).toHaveLength(0);
  });
});

describe("procurar sem precisar acertar o acento", () => {
  const todas = [s("Café Savassi"), s("Parque Municipal"), s("Praça da Liberdade", "meu", "Centro")];
  it("acha sem acento", () => {
    expect(filtrarSugestoes(todas, "cafe")).toHaveLength(1);
    expect(filtrarSugestoes(todas, "praca")).toHaveLength(1);
  });
  it("acha pelo bairro", () => {
    expect(filtrarSugestoes(todas, "centro")).toHaveLength(1);
  });
  it("sem nada escrito, devolve tudo", () => {
    expect(filtrarSugestoes(todas, "  ")).toHaveLength(3);
  });
});

describe("o recado nunca pede desculpa por cidade", () => {
  it("sem sugestão, convida a escrever, e cita a cidade da pessoa", () => {
    const r = recadoDeLugar(false, "São Paulo");
    expect(r).toContain("São Paulo");
    expect(/ainda não|desculpa|infelizmente|só em/i.test(r)).toBe(false);
  });
  it("nunca nomeia Belo Horizonte como a cidade que funciona", () => {
    for (const cidade of ["", "São Paulo", "Rio de Janeiro"]) {
      expect(recadoDeLugar(false, cidade)).not.toContain("Belo Horizonte");
      expect(recadoDeLugar(true, cidade)).not.toContain("Belo Horizonte");
    }
  });
});

describe("o nome do lugar", () => {
  it("tira espaço sobrando e respeita o limite da coluna", () => {
    expect(nomeDoLugar("  Café da esquina  ")).toBe("Café da esquina");
    expect(nomeDoLugar("x".repeat(200))).toHaveLength(60);
  });
});
