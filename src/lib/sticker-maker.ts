export type CustomSticker = { id: string; src: string; caption: string };
export const MAX_CUSTOM_STICKERS = 30;
export const MAX_CAPTION = 24;

/** Adiciona uma figurinha criada ou salva, sem duplicar (mesma imagem) e com limite de 30, mais recente primeiro. */
export function addCustomSticker(list: CustomSticker[], sticker: CustomSticker): CustomSticker[] {
  return [sticker, ...list.filter(s => s.src !== sticker.src && s.id !== sticker.id)].slice(0, MAX_CUSTOM_STICKERS);
}
export function cleanCaption(t: string) { return t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION); }

/** Cria a figurinha no navegador: recorte redondo, contorno branco e legenda branca com contorno escuro (WebP 320 px). */
export async function makeSticker(file: File, caption: string): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const el = new Image(); el.onload = () => res(el); el.onerror = () => rej(new Error('Imagem inválida')); el.src = url; });
    const S = 320, c = document.createElement('canvas'); c.width = S; c.height = S;
    const ctx = c.getContext('2d'); if (!ctx) throw new Error('Canvas indisponível');
    const r = S / 2 - 14, cx = S / 2, cy = S / 2 - 10;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    const text = cleanCaption(caption);
    if (text) {
      ctx.font = '800 34px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = '#1B2230'; ctx.strokeText(text, cx, S - 34, S - 16);
      ctx.fillStyle = '#fff'; ctx.fillText(text, cx, S - 34, S - 16);
    }
    return c.toDataURL('image/webp', 0.8);
  } finally { URL.revokeObjectURL(url); }
}
