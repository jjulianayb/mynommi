/**
 * As regras da nommi, e o que o app faz quando alguém passa delas.
 *
 * São dois andares, e eles não se misturam:
 *
 * 1. **As regras da nommi** valem em toda tribo e ninguém pode tirar. Quem
 *    criou a tribo não escolhe se vale ou não.
 * 2. **As regras da tribo** são escritas por quem criou aquela tribo, e valem
 *    só lá dentro: "avise se não for poder ir", "nada de foto sem permissão".
 *
 * Sobre o que dá para conferir sozinho, e o que não dá:
 *
 * Lista de palavra pega xingamento cru. **Não pega bullying.** Bullying quase
 * nunca tem palavrão: é "ninguém te chamou", é todo mundo responder menos para
 * uma pessoa, é a piada repetida. Isso só pessoa percebe. Por isso a conferência
 * de palavra é um ajudante, e quem segura a tribo de pé continua sendo: quem
 * criou podendo remover, o botão de denunciar, e a fila de moderação.
 *
 * Fingir que um filtro resolve bullying seria pior que não ter filtro, porque
 * a Ju pararia de olhar.
 */

export const REGRAS_DA_NOMMI = [
  "Ninguém é humilhada aqui. Nem por apelido, nem por piada, nem por indireta.",
  "Nada de xingamento contra uma pessoa.",
  "Nada de racismo, machismo, homofobia, transfobia ou capacitismo.",
  "O que é dito numa tribo não sai dela sem quem falou deixar.",
  "Não se cobra foto, dinheiro nem encontro de ninguém.",
] as const;

export const REGRA_DE_FORA =
  "Essas regras valem em toda tribo da nommi e quem criou a tribo não pode tirar.";

/* ---- Conferir o texto ---- */

/**
 * Só tira acento e baixa as maiúsculas.
 *
 * É esta que serve para achar **para quem** o texto está falando, porque aqui
 * a arroba de uma menção continua sendo arroba. Em `normalizar` ela vira "a", e
 * "@ana" viraria "ana".
 */
export function simples(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Deixa o texto comparável com a lista de palavras.
 *
 * Além do acento e das maiúsculas, desfaz o troca-letra mais comum (@ por a,
 * 0 por o) e encolhe letra repetida: "vaaaadia" e "vadiiiia" viram "vadia".
 * Encolhe para **uma** letra, não duas — com duas, "vadiiiia" viraria "vadiia"
 * e passaria. Palavra do português com três letras iguais seguidas não existe,
 * então não se perde nada.
 *
 * O que ela **não** faz é juntar letras separadas por espaço, de propósito:
 * "v a c a" viraria "vaca", e aí "Ela tem uma v a c a" seria barrado. Falso
 * positivo custa mais caro que um xingamento criativo, que a denúncia pega.
 */
export function normalizar(texto: string): string {
  return simples(texto)
    .replace(/[@4]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/(.)\1{2,}/g, "$1");
}

/**
 * Xingamento: palavra cujo uso é atacar uma pessoa.
 *
 * Só barra **quando vai endereçada a alguém** (veja `vaiContraAlguem`). A mesma
 * palavra contando o que aconteceu com você — "ela me chamou de X" — não é
 * ataque, é desabafo, e é exatamente a pessoa que mais precisa falar. Barrar
 * essa pessoa seria o pior erro possível aqui.
 */
export const XINGAMENTOS = [
  "vadia",
  "vagabunda",
  "piranha",
  "retardada",
  "retardado",
  "imbecil",
  "idiota",
  "burra",
  "burro",
  "gorda nojenta",
  "recalcada",
  "escrota",
  "otaria",
  "otario",
  "corna",
  "lixo de gente",
  "nojenta",
  "ridicula",
  // Xingamento só quando vai endereçado: solto é palavrão e leva aviso;
  // mandado na cara de alguém é ataque.
  "foder",
  "fuder",
] as const;

/**
 * Palavra que **só** é ofensa quando vai endereçada, e que fora disso é uma
 * palavra comum: "macaca" é bicho, "crioulo" é palavra de uso corrente em
 * parte do país.
 *
 * Sem alvo, essas não geram nem aviso. Mandar "tem palavrão aí" para quem
 * escreveu "vi uma macaca no zoológico" é errado e soa acusatório — e uma
 * regra que acusa inocente é uma regra que a Ju vai querer desligar.
 */
export const SO_COM_ALVO = ["macaca", "crioula", "crioulo", "mulata"] as const;

/**
 * Ataque a um grupo inteiro. Esses não dependem de estar endereçados: dizer
 * numa roda já é o ato.
 */
export const ATAQUE_A_GRUPO = [
  "viado",
  "viadinho",
  "bicha nojenta",
  "traveco",
  "sapatao nojenta",
  "preta suja",
  "mongoloide",
  "aleijada de merda",
  "volta pro seu pais",
] as const;

/** Palavrão sem alvo. Avisa, não barra: "que merda de dia" não machuca ninguém. */
export const PALAVRAO = [
  "merda",
  "porra",
  "caralho",
  "puta que pariu",
  "foda",
  "fodase",
  "foda se",
  "cacete",
  "bosta",
] as const;

/** Marcas de que o texto está endereçado a uma pessoa. */
const APONTA = [
  /\bvoce\s+(e|eh|ta|esta|parece)\b/,
  /\bvc\s+(e|eh|ta|esta|parece)\b/,
  /\bsua\b/,
  /\bseu\b/,
  /\btu\s+(e|eh|ta|esta)\b/,
  /\bvai\s+(se|tomar|catar)\b/,
  /\bcala\s+a\s+boca\b/,
  /@\w/,
];

export function vaiContraAlguem(texto: string): boolean {
  // Usa `simples`, e não `normalizar`: a troca de @ por a comeria a arroba de
  // uma menção, e "@ana" viraria "ana".
  const t = simples(texto);
  return APONTA.some((r) => r.test(t));
}

/** Acha a palavra inteira, para "assassina" não cair por causa de "ass". */
function temPalavra(normalizado: string, palavra: string): boolean {
  const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`).test(normalizado);
}

export type Veredito = {
  nivel: "ok" | "avisa" | "barra";
  /** O que dizer para a pessoa. Nunca repete a palavra de volta na cara dela. */
  recado: string;
};

export const RECADO_BARRADO =
  "Isso é xingamento contra uma pessoa, e aqui isso não vai. Diga o que te incomodou, sem atacar quem está do outro lado.";
export const RECADO_GRUPO =
  "Isso ofende um grupo inteiro de gente, e a nommi não é lugar para isso.";
export const RECADO_AVISO =
  "Tem palavrão aí. Pode mandar assim mesmo se for o seu jeito de falar, só não vale descer para cima de ninguém.";

export function conferirRespeito(texto: string): Veredito {
  const t = normalizar(texto ?? "");
  if (!t.trim()) return { nivel: "ok", recado: "" };

  if (ATAQUE_A_GRUPO.some((p) => temPalavra(t, p)))
    return { nivel: "barra", recado: RECADO_GRUPO };

  const aponta = vaiContraAlguem(texto);

  // Só conta quando vai endereçada. Sem alvo, nem aviso: é palavra comum.
  if (aponta && SO_COM_ALVO.some((p) => temPalavra(t, p)))
    return { nivel: "barra", recado: RECADO_BARRADO };

  const xinga = XINGAMENTOS.some((p) => temPalavra(t, p));
  if (xinga && aponta) return { nivel: "barra", recado: RECADO_BARRADO };
  if (xinga) return { nivel: "avisa", recado: RECADO_AVISO };

  if (PALAVRAO.some((p) => temPalavra(t, p))) return { nivel: "avisa", recado: RECADO_AVISO };

  return { nivel: "ok", recado: "" };
}

/**
 * O recado quando o banco recusa o texto.
 *
 * A trava final é do banco, não da tela: se a tela falhar ou alguém escrever
 * direto, o gatilho recusa do mesmo jeito. Quando isso acontece a mensagem do
 * banco não pode chegar crua na pessoa — erro técnico na cara de quem está
 * conversando é o tipo de coisa que já corrigimos no login.
 */
export function recadoDoBanco(erro: unknown): string | null {
  const m = (erro as { message?: string } | null)?.message ?? "";
  if (!m) return null;
  if (m.includes("nommi_ataque_a_grupo")) return RECADO_GRUPO;
  if (m.includes("nommi_xingamento")) return RECADO_BARRADO;
  return null;
}
