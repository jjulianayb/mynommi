import { describe, expect, it } from "vitest";
import {
  cleanInstagram,
  cleanPlaces,
  completeness,
  missingParts,
  MAX_PLACES,
} from "@/lib/pagina-pessoal";

const cheia = {
  avatar: "f.png",
  about: "oi",
  interests: ["café"],
  places: ["Mercado"],
  lookingFor: "amizade",
  city: "BH",
  cover: "c.jpg",
};

describe("página pessoal", () => {
  it("limpa o Instagram de arroba e link", () => {
    expect(cleanInstagram("@ju.camargo")).toBe("ju.camargo");
    expect(cleanInstagram("https://instagram.com/ju_camargo")).toBe("ju_camargo");
    expect(cleanInstagram("  ju camargo! ")).toBe("jucamargo");
  });
  it("tira lugares repetidos e vazios, e para em oito", () => {
    expect(cleanPlaces(["Mercado", "mercado", "  ", "Parque"])).toEqual(["Mercado", "Parque"]);
    expect(cleanPlaces(Array.from({ length: 12 }, (_, i) => "Lugar " + i))).toHaveLength(
      MAX_PLACES,
    );
  });
  it("mede o quanto a página está preenchida", () => {
    expect(completeness(cheia)).toBe(100);
    expect(completeness({ ...cheia, avatar: "", cover: "" })).toBeLessThan(100);
    expect(
      completeness({
        avatar: "",
        about: "",
        interests: [],
        places: [],
        lookingFor: "",
        city: "",
        cover: "",
      }),
    ).toBe(0);
  });
  it("diz o que falta, em português", () => {
    expect(missingParts(cheia)).toEqual([]);
    expect(missingParts({ ...cheia, avatar: "", places: [] })).toEqual([
      "uma foto sua",
      "lugares que você curte",
    ]);
  });
});
