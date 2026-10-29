import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

const regra = (seletor: string) => {
  const esc = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(esc + "\\{[^}]*\\}"))?.[0] ?? "";
};

/**
 * Bug da Ana, 29/10: as figurinhas de interesse ficavam com texto branco sobre
 * pílula branca, ilegíveis até serem clicadas. A pílula tem fundo claro e não
 * declarava cor nenhuma, então herdava o claro de `.tom-escuro`, que é a classe
 * da página de quem escolheu um fundo escuro.
 *
 * A lição vale para qualquer superfície clara: dentro de uma página de tom
 * escuro, quem não diz a própria cor de texto some.
 */
describe("superfície clara declara a própria cor de texto", () => {
  it("a figurinha de interesse diz a cor dela", () => {
    const r = regra(".fig");
    expect(r).toContain("background:var(--card)");
    expect(r).toContain("color:");
  });
  it("existe a trava para as superfícies claras dentro de página escura", () => {
    expect(css).toContain(".tom-escuro .fig");
  });
  it("a figurinha escolhida continua branca sobre o verde", () => {
    expect(css).toContain(".tom-escuro .fig.marcada{color:#fff}");
    const geral = css.indexOf(".tom-escuro .fig,");
    const marcada = css.indexOf(".tom-escuro .fig.marcada");
    expect(marcada).toBeGreaterThan(geral);
  });
  it("o chip do cadastro, sobre a foto do Rio, continua com texto escuro", () => {
    const r = regra(".cenario-conteudo .chip");
    expect(r).toContain("color:#1E2A24");
  });
  it("o disparo da câmera tem contorno próprio, com força maior que o reset de botão", () => {
    expect(regra(".camera-disparo")).toContain("background:#fff");
    const forte = regra(".friends-app .camera-disparo");
    expect(forte).toMatch(/box-shadow:0 0 0 3px/);
    expect(forte).toContain("width:74px");
    const reset = css.indexOf(".friends-app button {");
    expect(css.indexOf(".friends-app .camera-disparo")).toBeGreaterThan(reset);
  });
});
