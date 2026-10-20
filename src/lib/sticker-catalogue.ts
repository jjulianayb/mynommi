const images = import.meta.glob<string>("../assets/stickers/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
export const chatStickers = [
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
].map((caption, id) => ({ id, caption, src: images["../assets/stickers/" + id + ".png"] ?? "" }));
export function isStickerId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id >= 0 && id < chatStickers.length;
}
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
