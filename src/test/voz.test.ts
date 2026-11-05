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

/**
 * Texto que a pessoa lê na tela.
 *
 * A versão anterior disto casava aspas **de duas em duas** ao longo do
 * arquivo inteiro. Quando o número de aspas antes desalinha, o par deixa de
 * ser uma string e passa a ser o miolo entre duas — e a string de verdade é
 * pulada. Foi assim que `label="QUEM RECEBE A TEIA"` ficou meses na tela com
 * o teste passando. Teste que dá falsa confiança é pior que teste nenhum.
 *
 * Agora a extração é ancorada: valor de prop que aparece na tela, e texto
 * solto entre tags. Nada de contar aspas.
 */
const PROPS_VISIVEIS =
  /\b(?:title|label|placeholder|alt|text|intro|rotulo|emptyTitle|emptyText|aria-label)=\{?"([^"]{3,})"/g;
const TEXTO_ENTRE_TAGS = />\s*([A-Za-zÀ-ÿ][^<>{}]{3,})\s*</g;

function textoVisivel(fonte: string): string[] {
  const achados = [
    ...[...fonte.matchAll(PROPS_VISIVEIS)].map((m) => m[1] as string),
    ...[...fonte.matchAll(TEXTO_ENTRE_TAGS)].map((m) => m[1] as string),
  ];
  return achados.map((t) => t.trim()).filter((t) => t.length > 2);
}

describe("o nome do grupo na tela é tribo", () => {
  // Decisão antiga da Ju, repetida por ela em 04/11: não existe mais teia, é
  // tribo. No banco e nas rotas o nome antigo continua, porque renomear
  // tabela quebraria o que já está gravado — mas na tela, nunca.
  it("nenhum texto visível diz teia", () => {
    for (const a of arquivos) {
      for (const t of textoVisivel(a.texto)) {
        expect(/\bteias?\b/i.test(t), `${a.nome}: ${t}`).toBe(false);
      }
    }
  });

  it("o teste enxerga o que está na tela", () => {
    // Prova de que a extração funciona: se ela voltar vazia, o teste acima
    // passa sem olhar nada — que foi exatamente o defeito anterior.
    const amostra = textoVisivel('<Heading title="Meu espaço" label="QUEM RECEBE A TEIA" />');
    expect(amostra).toContain("QUEM RECEBE A TEIA");
  });
});

describe("nenhum rótulo em caixa alta por cima dos títulos", () => {
  /**
   * A Ju detestou isso em 02/11 ("não transmite credibilidade"). Eu tirei os
   * seis que usavam a prop `kicker` do `Title` e **não vi que o `Heading`
   * tinha outra prop fazendo a mesma coisa** — sobraram cinco, inclusive
   * "QUEM RECEBE A TEIA". Agora o teste olha o resultado na tela, não o nome
   * da prop: qualquer frase em caixa alta cai aqui, venha de onde vier.
   */
  it("nenhuma frase visível é toda em maiúscula", () => {
    for (const a of arquivos) {
      for (const t of textoVisivel(a.texto)) {
        if (!/\s/.test(t)) continue; // palavra solta pode ser sigla
        if (!/[A-ZÀ-Ý]/.test(t)) continue;
        expect(t === t.toUpperCase(), `${a.nome}: ${t}`).toBe(false);
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
