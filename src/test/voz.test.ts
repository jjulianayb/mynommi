import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A voz da nommi.
 *
 * Reclamação da Ju, 02/11: "tem uns textos muito engessados, não estão com cara
 * de aplicativo". O exemplo que ela deu foi **"GENTE DE VERDADE"** em letra
 * maiúscula por cima de "Encontre sua tribo", e ela tem razão: a nommi não usar
 * perfil falso é um valor nosso, não manchete. Quem abre o app quer ver gente,
 * não ler a política editorial.
 *
 * Eram **seis** desses rótulos em caixa alta ("UM ENCONTRO DE CADA VEZ",
 * "AMIZADES QUE CONTINUAM", "SUAS TEIAS"), e eles sozinhos davam ao app cara de
 * folheto institucional. Foram removidos, e a prop `kicker` do `Title` ficou
 * sem uso de propósito.
 *
 * A régua da voz são as legendas do Pippo, que a Ju aprovou em 31/10:
 * "Setor de milagres, bom dia!", "Trem tá feio", "Que inicie o estrago",
 * "Sextou!". Gíria sem exagero, frase curta, jeito de quem fala — não de quem
 * redige.
 */

const COMPONENTES = "src/components/friends";
const arquivos = readdirSync(COMPONENTES)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ nome: f, texto: readFileSync(`${COMPONENTES}/${f}`, "utf8") }));

describe("nenhum rótulo de slogan por cima dos títulos", () => {
  it("a prop kicker não é usada em lugar nenhum", () => {
    for (const a of arquivos) {
      expect(a.texto.includes("kicker="), `${a.nome} voltou a usar kicker`).toBe(false);
    }
  });
});

describe("a tela não explica a política da nommi para quem está usando", () => {
  // "A nommi só mostra gente de verdade" é verdade e é importante — mas é
  // conversa de bastidor. Na tela, soa como desculpa pela fila curta.
  const DE_BASTIDOR = [
    "só mostra gente de verdade",
    "gente de verdade",
    "perfis reais",
    "não usamos perfis",
  ];
  it.each(DE_BASTIDOR)("não diz %s na tela", (frase) => {
    for (const a of arquivos) {
      expect(a.texto.toLowerCase().includes(frase.toLowerCase()), a.nome).toBe(false);
    }
  });
});

describe("o nome do grupo na tela é tribo", () => {
  // Decisão antiga da Ju. No banco e nas rotas continua "teia"; na tela, não.
  // "SUAS TEIAS" aparecia em caixa alta por cima de "Suas tribos", as duas
  // palavras na mesma linha, contradizendo a decisão dela.
  it("nenhum texto visível diz teia", () => {
    for (const a of arquivos) {
      const visiveis = [...a.texto.matchAll(/"([^"]{4,})"/g)]
        .map((m) => m[1] as string)
        // Casar aspas de dois em dois pega também o **miolo entre** dois
        // valores (`, teia: ` em `{ roles: "x", teia: "y" }`), que é código e
        // não texto. Por isso: tem que começar com letra, e chave de objeto
        // fica de fora — `teia: "todos"` é dado de visibilidade já gravado, e
        // renomear quebraria o que está salvo.
        .filter(
          (t) =>
            /\s/.test(t) &&
            /^[A-Za-zÀ-ÿ]/.test(t) &&
            !t.includes("/") &&
            !t.includes("-") &&
            !/^[a-z_]+:/.test(t) &&
            !/^[a-z_]+ [a-z_]+$/.test(t),
        );
      for (const t of visiveis) {
        expect(/\bteias?\b/i.test(t), `${a.nome}: ${t}`).toBe(false);
      }
    }
  });
});

/**
 * "Vocês dois" aparecia em oito lugares — na chamada do Descobrir, na carta do
 * match, no tour e no recado de resposta guardada. Além de truncado, é
 * masculino: a nommi fala com quem está lendo, e não sabe (nem pergunta) o
 * gênero de ninguém.
 *
 * E "já são amizade" usava amizade como status, não como coisa — "se vocês dois
 * quiserem se conhecer, já são amizade" foi o texto que a Ju apontou como o
 * pior da tela.
 */
describe("a nommi não fala com a pessoa no masculino nem no feminino", () => {
  const LIBS = "src/lib";
  const todos = [
    ...arquivos,
    ...readdirSync(LIBS)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => ({ nome: f, texto: readFileSync(`${LIBS}/${f}`, "utf8") })),
  ];
  it.each(["vocês dois", "já são amizade"])("não diz %s", (frase) => {
    for (const a of todos) {
      expect(a.texto.toLowerCase().includes(frase), a.nome).toBe(false);
    }
  });
});
