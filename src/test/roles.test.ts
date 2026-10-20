import { describe, expect, it } from "vitest";
import { toRole, whenLabel, spotsLabel, goingBlocker, sortRoles, type RoleRow } from "@/lib/roles";

const now = new Date("2026-10-20T12:00:00Z");
const base: RoleRow = {
  id: 1,
  kind: "role",
  name: "Café no bairro",
  mode: "Presencial",
  category: "Café",
  city: "BH",
  place: "Buritis",
  when_text: "Sábado à tarde",
  creator_nickname: "Ana",
  created_at: "2026-10-01T00:00:00Z",
  starts_at: "2026-10-25T19:00:00Z",
  capacity: 6,
  going_count: 4,
  i_am_going: false,
};

describe("rolê", () => {
  it("calcula vagas restantes", () => {
    expect(toRole(base, now).spotsLeft).toBe(2);
    expect(toRole({ ...base, going_count: 6 }, now).full).toBe(true);
    expect(toRole({ ...base, capacity: null }, now).spotsLeft).toBeNull();
  });
  it("sabe o que já passou", () => {
    expect(toRole({ ...base, starts_at: "2026-10-19T19:00:00Z" }, now).past).toBe(true);
    expect(toRole(base, now).past).toBe(false);
    expect(toRole({ ...base, starts_at: null }, now).past).toBe(false);
  });
  it("mostra a data quando existe e o texto livre quando não", () => {
    expect(whenLabel(toRole(base, now))).toMatch(/\d{2}/);
    expect(whenLabel(toRole({ ...base, starts_at: null }, now))).toBe("Sábado à tarde");
  });
  it("escreve as vagas de um jeito compreensível", () => {
    expect(spotsLabel(toRole(base, now))).toBe("4/6 · 2 vagas");
    expect(spotsLabel(toRole({ ...base, going_count: 5 }, now))).toBe("5/6 · 1 vaga");
    expect(spotsLabel(toRole({ ...base, going_count: 6 }, now))).toBe("Lotado");
    expect(spotsLabel(toRole({ ...base, capacity: null, going_count: 1 }, now))).toBe(
      "1 pessoa vai",
    );
    expect(spotsLabel(toRole({ ...base, capacity: null, going_count: 3 }, now))).toBe(
      "3 pessoas vão",
    );
  });
});

describe("botão Quero ir", () => {
  it("explica por que não dá para ir", () => {
    expect(goingBlocker(toRole(base, now), false)).toBeNull();
    expect(goingBlocker(toRole(base, now), true)).toMatch(/organiza/);
    expect(
      goingBlocker(toRole({ ...base, starts_at: "2026-10-01T10:00:00Z" }, now), false),
    ).toMatch(/já aconteceu/);
    expect(goingBlocker(toRole({ ...base, going_count: 6 }, now), false)).toMatch(/vagas acabaram/);
  });
  it("quem já está dentro continua podendo desistir mesmo lotado", () => {
    expect(
      goingBlocker(toRole({ ...base, going_count: 6, i_am_going: true }, now), false),
    ).toBeNull();
  });
});

describe("ordem da lista", () => {
  it("primeiro os próximos, depois os sem data, por último os que passaram", () => {
    const list = [
      toRole({ ...base, id: 1, starts_at: "2026-10-19T10:00:00Z" }, now),
      toRole({ ...base, id: 2, starts_at: null }, now),
      toRole({ ...base, id: 3, starts_at: "2026-10-30T10:00:00Z" }, now),
      toRole({ ...base, id: 4, starts_at: "2026-10-21T10:00:00Z" }, now),
    ];
    expect(sortRoles(list, now).map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });
});
