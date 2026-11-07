import { describe, expect, it } from "vitest";
import { opcoesDeFiltro, type Candidata } from "@/lib/combinar";

function carta(emComum: string[], interesses: string[]): Candidata {
  return {
    userId: Math.random().toString(36).slice(2),
    nome: "Teste",
    avatar: "",
    capa: "",
    cidade: "",
    sobre: "",
    interesses,
    objetivos: [],
    lugares: [],
    procurando: "",
    procurandoTags: [],
    estado: "",
    estadoCivil: "",
    verificada: false,
    emComum,
    tribosEmComum: 0,
    fundo: "",
    selosEmComum: [],
    selosDoPovo: [],
    afinidade: emComum.length,
    mesmaCidade: false,
    jaMeCurtiu: false,
    idade: null,
    online: false,
    fotoFoco: { x: 50, y: 50 },
  } as Candidata;
}

describe("Filtro do Descobrir", () => {
  it("só oferece interesses que a própria pessoa escolheu", () => {
    // Audita tem café, livros, música, trilhas e vinho. O baralho tem gente
    // com viagens, cerveja e idiomas — interesses que nunca foram dela.
    const fila = [
      carta(["vinho", "música"], ["vinho", "música", "viagens"]),
      carta(["livros"], ["livros", "cerveja", "idiomas"]),
      carta(["café"], ["café", "séries"]),
    ];
    const opcoes = opcoesDeFiltro(fila);
    expect(opcoes).toEqual(["vinho", "música", "livros", "café"]);
    expect(opcoes).not.toContain("viagens");
    expect(opcoes).not.toContain("cerveja");
    expect(opcoes).not.toContain("idiomas");
    expect(opcoes).not.toContain("séries");
  });

  it("não oferece interesse meu que ninguém da fila tem", () => {
    // "trilhas" é meu, mas ninguém na fila tem: opção inútil, só mostraria
    // fila vazia.
    const fila = [carta(["café"], ["café"])];
    expect(opcoesDeFiltro(fila)).toEqual(["café"]);
  });

  it("fila vazia não mostra opção nenhuma", () => {
    expect(opcoesDeFiltro([])).toEqual([]);
  });
});
