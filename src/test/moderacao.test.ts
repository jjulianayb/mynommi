import { describe, expect, it } from "vitest";
import { urgencia, ordenarFila, motivoEmPalavras, toDenuncia, type Denuncia } from "@/lib/moderacao";

const base: Denuncia = { id: "1", motivo: "outro", nota: "", status: "aberta", quando: "2026-10-22T10:00:00Z", quemDenunciou: "Ana", alvoId: "b", alvoNome: "Bia", triboId: null, triboNome: "", denunciasContra: 1 };

describe("moderação", () => {
  it("assédio e segurança são sempre urgentes", () => {
    expect(urgencia({ ...base, motivo: "assedio" })).toBe("alta");
    expect(urgencia({ ...base, motivo: "inseguro" })).toBe("alta");
    expect(urgencia({ ...base, motivo: "golpe" })).toBe("media");
    expect(urgencia(base)).toBe("baixa");
  });
  it("reincidência sobe a urgência", () => {
    expect(urgencia({ ...base, denunciasContra: 3 })).toBe("alta");
    expect(urgencia({ ...base, denunciasContra: 2 })).toBe("media");
  });
  it("urgente primeiro, e entre iguais a mais antiga", () => {
    const fila = ordenarFila([
      { ...base, id: "nova", quando: "2026-10-22T12:00:00Z" },
      { ...base, id: "grave", motivo: "assedio" },
      { ...base, id: "antiga", quando: "2026-10-20T09:00:00Z" },
    ]);
    expect(fila.map(d => d.id)).toEqual(["grave", "antiga", "nova"]);
  });
  it("traduz o motivo", () => {
    expect(motivoEmPalavras("assedio")).toMatch(/Assédio/);
    expect(motivoEmPalavras("desconhecido")).toBe("desconhecido");
  });
  it("usa reserva quando falta nome", () => {
    const d = toDenuncia({ id: "1", reason: "outro", note: "", status: "aberta", created_at: "x", reporter: "", target_user: null, target_nome: "", target_teia: null, teia_nome: "", denuncias_contra: 0 });
    expect(d.quemDenunciou).toBe("nommi");
    expect(d.alvoId).toBeNull();
  });
});
