import { describe, it, expect } from "vitest";
import {
  PLACES,
  nearestPlace,
  nearbyNommis,
  distanceLabel,
  searchPlaces,
  coarse,
  kmLabel,
  suggestPlaces,
  presenceRow,
} from "@/lib/radar";
const savassi = PLACES.find((p) => p.name === "Café Savassi")!;
describe("Radar Nommi", () => {
  it("tem pelo menos 20 lugares públicos", () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(20);
  });
  it("converte a posição no lugar público mais próximo", () => {
    expect(nearestPlace(-19.9246, -43.9353).name).toBe("Parque Municipal");
  });
  it("busca por nome ou bairro sem acento", () => {
    expect(searchPlaces("pampulha").map((p) => p.name)).toContain("Lagoa da Pampulha");
    expect(searchPlaces("", "Cinema")).toHaveLength(2);
  });
  it("distância só aproximada", () => {
    expect(distanceLabel(0)).toBe("no mesmo lugar");
    expect(distanceLabel(0.5)).toBe("a 5 min");
    expect(distanceLabel(1.5)).toBe("a 15 min");
  });
  it("perfil privado só aparece para quem tem match", () => {
    expect(nearbyNommis(savassi, { matches: [], blocked: [] }).some((n) => n.id === 13)).toBe(
      false,
    );
    expect(nearbyNommis(savassi, { matches: [13], blocked: [] }).some((n) => n.id === 13)).toBe(
      true,
    );
  });
  it("filtra pelo que a pessoa topa e esconde bloqueados", () => {
    const r = nearbyNommis(savassi, { matches: [], blocked: [4], activity: "Ir ao cinema" });
    expect(r.every((n) => n.activity === "Ir ao cinema")).toBe(true);
    expect(r.some((n) => n.id === 4)).toBe(false);
  });
  it("mais perto primeiro", () => {
    const r = nearbyNommis(savassi, { matches: [], blocked: [] });
    expect(r[0]?.label).toBe("no mesmo lugar");
  });
});

describe("radar nommi global", () => {
  it("guarda a posição arredondada, não a exata", () => {
    expect(coarse(-19.92278)).toBe(-19.92);
    expect(coarse(-43.94417)).toBe(-43.94);
    expect(coarse(0)).toBe(0);
  });
  it("fala a distância em passos de caminhada e depois em quilômetros", () => {
    expect(kmLabel(0.1)).toBe("no mesmo lugar");
    expect(kmLabel(0.5)).toBe("a 5 min a pé");
    expect(kmLabel(1.5)).toBe("a 15 min a pé");
    expect(kmLabel(4.2)).toBe("a 4 km");
    expect(kmLabel(23)).toBe("a 23 km daqui");
  });
  it("sugere lugares quando há catálogo por perto e nada quando a pessoa está longe", () => {
    expect(suggestPlaces(-19.9227, -43.9441).length).toBeGreaterThan(0);
    expect(suggestPlaces(48.8566, 2.3522)).toHaveLength(0);
  });
  it("monta a presença com tempo entre 15 min e 4 h", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const r = presenceRow(
      {
        userId: "u",
        placeName: "  Café da esquina  ",
        activity: "Tomar um café",
        minutes: 60,
        lat: -19.92278,
        lng: -43.94417,
      },
      now,
    );
    expect(r.place_name).toBe("Café da esquina");
    expect(r.lat).toBe(-19.92);
    expect(r.until).toBe("2026-10-20T13:00:00.000Z");
    expect(presenceRow({ userId: "u", placeName: "x", activity: "a", minutes: 1 }, now).until).toBe(
      "2026-10-20T12:15:00.000Z",
    );
    expect(
      presenceRow({ userId: "u", placeName: "x", activity: "a", minutes: 9999 }, now).until,
    ).toBe("2026-10-20T16:00:00.000Z");
  });
  it("sem posição do aparelho, guarda nulo em vez de inventar", () => {
    const r = presenceRow({ userId: "u", placeName: "Praça", activity: "Bater papo", minutes: 30 });
    expect(r.lat).toBeNull();
    expect(r.lng).toBeNull();
  });
  it('lugar em branco vira "Por aí"', () => {
    expect(
      presenceRow({ userId: "u", placeName: "   ", activity: "a", minutes: 30 }).place_name,
    ).toBe("Por aí");
  });
});
