import { readFileSync, readdirSync } from "node:fs";
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

/**
 * Bug encontrado em 30/10: existiam dois nomes para "este chip está escolhido",
 * `selected` e `active`, e **só `selected` tinha estilo**. Sete chips pelo app
 * usavam `active` e pareciam exatamente iguais aos não escolhidos: a atividade
 * e a duração do radar, o prazo do "Só entre nós", e os botões de quem cria
 * rolê. A pessoa escolhia e a tela não respondia.
 *
 * A correção foi ter um nome só. Este teste existe para o segundo nome não
 * voltar: chip escolhido é `selected`, e ponto.
 */
describe("chip escolhido tem cara de escolhido", () => {
  const componentes = readdirSync("src/components/friends")
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ nome: f, texto: readFileSync("src/components/friends/" + f, "utf8") }));

  it("o estilo de chip escolhido existe", () => {
    expect(regra(".friends-app .chip.selected")).toContain("background:");
  });

  it("nenhum chip usa um nome de estado que não tem estilo", () => {
    for (const c of componentes) {
      const usaActive = /className=\{"chip"?\s*\+?[^}]*"\s*active"/.test(c.texto);
      expect(usaActive, c.nome + " usa 'active' num chip, que não tem estilo").toBe(false);
    }
  });
});

/**
 * 31/10: ao transformar a comemoração do match em camada por cima da fila, eu
 * acrescentei uma regra `.deu-match` no fim do arquivo com `background:
 * var(--card)`. Mesma força, mais abaixo: ela vencia a regra original e levava
 * junto o `color:#F7F0DE`, deixando texto claro sobre fundo claro. É o bug da
 * figurinha da Ana outra vez, agora na tela mais bonita do app.
 */
describe("a comemoração do match continua legível", () => {
  it("existe uma regra só, com fundo escuro e cor de texto declarada", () => {
    const todas = css.match(/^\.deu-match\{[^}]*\}/gm) ?? [];
    expect(todas).toHaveLength(1);
    expect(todas[0]).toContain("color:");
    expect(todas[0]).toContain("linear-gradient");
  });
});
