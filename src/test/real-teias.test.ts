import { describe, it, expect } from "vitest";
import { sortByCity } from "@/lib/real-teias";
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
