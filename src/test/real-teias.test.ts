import { describe, it, expect } from "vitest";
import { TRIBOS_ABERTAS_INICIAIS, sortByCity, tribosAbertasVisiveis } from "@/lib/real-teias";
describe("tribos reais por cidade", () => {
  it("mostra primeiro as tribos da cidade da pessoa, sem esconder as outras", () => {
    const list = [
      { id: 1, city: "Belo Horizonte" },
      { id: 2, city: "João Monlevade" },
      { id: 3, city: "São Paulo" },
    ];
    expect(sortByCity(list, "joão monlevade").map((t) => t.id)).toEqual([2, 1, 3]);
  });
});

describe("a vitrine de tribos abertas tem começo curto", () => {
  const muitas = Array.from({ length: 17 }, (_, i) => ({ id: i + 1 }));
  it("mostra as primeiras e guarda o resto atrás de Ver mais", () => {
    expect(TRIBOS_ABERTAS_INICIAIS).toBe(6);
    expect(tribosAbertasVisiveis(muitas, false)).toHaveLength(6);
    expect(tribosAbertasVisiveis(muitas, false)[0]?.id).toBe(1);
  });
  it("Ver mais abre a lista inteira no mesmo lugar", () => {
    expect(tribosAbertasVisiveis(muitas, true)).toHaveLength(17);
  });
  it("catálogo menor que o teto aparece inteiro", () => {
    expect(tribosAbertasVisiveis(muitas.slice(0, 4), false)).toHaveLength(4);
  });
});
