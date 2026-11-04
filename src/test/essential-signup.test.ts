import { expect, it } from "vitest";
import { essentialDetails } from "@/lib/nommi-access";
it("deixa cidade e interesses para o perfil", () => {
  expect(
    essentialDetails({ nickname: "Teste", birthday: "1995-05-20" }, new Date("2026-11-04")).data,
  ).toMatchObject({ city: "", interests: [] });
});
it("mantém barreira de maioridade e apelido", () => {
  expect(
    essentialDetails({ nickname: "Teste", birthday: "2020-01-01" }, new Date("2026-11-04")).error,
  ).toContain("18");
  expect(essentialDetails({ nickname: "A", birthday: "1995-05-20" }).error).toContain("apelido");
});
