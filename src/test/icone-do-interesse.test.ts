import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIGURINHAS, iconeDoInteresse } from "@/lib/figurinhas";

const art = readFileSync("src/components/friends/art.tsx", "utf8");
/** Os nomes que o componente Icon sabe desenhar. */
const DESENHADOS = new Set(
  [...art.matchAll(/^\s{2}([a-z][a-zA-Z-]*):\s*$|^\s{2}([a-z][a-zA-Z-]*):\s*'/gm)]
    .map((m) => m[1] ?? m[2])
    .filter(Boolean) as string[],
);

describe("todo interesse vira um ícone que existe", () => {
  // Ícone que não existe no catálogo cai no `star` por padrão, sem erro
  // nenhum: ninguém descobriria o engano olhando a tela, só o desenho errado.
  it("o catálogo inteiro aponta para ícones desenhados", () => {
    for (const f of FIGURINHAS) {
      const ic = iconeDoInteresse(f.nome);
      expect(DESENHADOS.has(ic), `${f.nome} → ${ic}`).toBe(true);
    }
  });
  it("interesse escrito à mão também", () => {
    for (const t of ["pedalar no domingo", "tomar um vinho", "meditação", "coisa inventada"]) {
      expect(DESENHADOS.has(iconeDoInteresse(t)), t).toBe(true);
    }
  });
  it("nunca devolve emoji", () => {
    for (const t of ["café", "coisa que não existe", ""]) {
      expect(iconeDoInteresse(t)).toMatch(/^[a-z]+$/);
    }
  });
  it("acha pela família, sem precisar de acento certo", () => {
    expect(iconeDoInteresse("música")).toBe(iconeDoInteresse("musica"));
  });
});
