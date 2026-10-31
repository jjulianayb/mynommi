const images = import.meta.glob<string>("../assets/stickers/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const pippoImages = import.meta.glob<string>("../assets/stickers/pippo/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

type StickerPack = "tribo" | "pippo";
export type ChatStickerEntry = { id: number; caption: string; src: string; pack: StickerPack };

const triboCaptions = [
  "super legal",
  "da hora demais",
  "ama vinhos",
  "estrela do karaokê",
  "ouvinte nota 10",
  "topa tudo",
  "bora marcar",
  "tô chegando",
  "saudade de você",
  "bom dia, turma",
  "boa noite",
  "café e conversa",
  "rindo até amanhã",
  "me conta tudo",
  "abraço apertado",
  "hoje eu topo",
  "preciso de férias",
  "mandou bem",
  "tá combinado",
  "que orgulho",
  "só mais uma música",
  "paz e carinho",
  "amei demais",
  "a gente junto",
];

/** Pacote do Pippo, o mascote. Figurinhas aprovadas pela Ju em 31/10/2026. */
const pippoCaptions = [
  "Um café resolve isso",
  "Resumindo, é tenso",
  "Minha grana é pouca, mas a irresponsabilidade é gigante",
  "É bolacha, não biscoito",
  "Que drama!",
  "Setor de milagres, bom dia!",
  "Eu vejo gente doida toda vez que entro nesse grupo",
  "O bagulho é doido",
  "Vida longa aos loucos",
  "Eu gosto assim: clima hostil",
  "Confusão só presta grande",
  "Que inicie o estrago",
  "Trem tá feio",
  "Bora marcar?",
  "Partiu café!",
  "Sextou!",
  "Que isso, meu filho!",
  "Deus me livre, mas quem me dera",
  "Só vou se tiver pão de queijo",
  "Eita, que delícia de encontro",
  "Confia no Pippo",
  "Do NEIDA",
  "Do NEIDA",
  "Pippo é sábio",
  "Pippo love you",
  "Ui que linda",
  "Divooooou",
  "Pippo gosta",
  "Achei conceito",
];

export const PIPPO_FIRST_ID = triboCaptions.length;
export const PIPPO_COUNT = pippoCaptions.length;

export const chatStickers: ChatStickerEntry[] = [
  ...triboCaptions.map((caption, id) => ({
    id,
    caption,
    pack: "tribo" as StickerPack,
    src: images["../assets/stickers/" + id + ".png"] ?? "",
  })),
  ...pippoCaptions.map((caption, i) => ({
    id: PIPPO_FIRST_ID + i,
    caption,
    pack: "pippo" as StickerPack,
    src: pippoImages["../assets/stickers/pippo/pippo-" + String(i + 1).padStart(2, "0") + ".png"] ?? "",
  })),
];

export function isStickerId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id >= 0 && id < chatStickers.length;
}
export function isPippoSticker(id: number): boolean {
  return id >= PIPPO_FIRST_ID && id < PIPPO_FIRST_ID + PIPPO_COUNT;
}

/** O pacote do Pippo é exclusivo do plano pago. Como o plano ainda não existe,
 *  o pacote fica visível na bandeja, mas bloqueado para envio. */
export const pippoPackLocked = true;

export function recentStickerIds(previous: number[], id: number) {
  return isStickerId(id)
    ? [id, ...previous.filter((value) => value !== id && isStickerId(value))].slice(0, 24)
    : previous;
}

const normalize = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Busca por palavra na legenda, sem exigir acento. Termo vazio devolve tudo. */
export function searchStickers(query: string): typeof chatStickers {
  const q = normalize(query);
  if (!q) return chatStickers;
  const words = q.split(/\s+/);
  return chatStickers.filter((s) => {
    const c = normalize(s.caption);
    return words.every((w) => c.includes(w));
  });
}

/** Busca nas figurinhas criadas pela pessoa. */
export function searchCustom<T extends { caption: string }>(list: T[], query: string): T[] {
  const q = normalize(query);
  if (!q) return list;
  const words = q.split(/\s+/);
  return list.filter((s) => {
    const c = normalize(s.caption);
    return words.every((w) => c.includes(w));
  });
}
