/**
 * A foto do post, pronta para enviar.
 *
 * Dois bugs da auditoria de 02/11, e os dois morrem aqui:
 *
 * 1. **iPhone não conseguia anexar foto.** A conferência aceitava só
 *    `image/jpeg`, `image/png` e `image/webp`. Foto de iPhone chega em
 *    **HEIC** (`image/heic`), então quem tem iPhone — a maioria das pessoas
 *    da nommi — recebia "Use foto JPG, PNG ou WebP" e não postava nada. É o
 *    mesmo bug que já nos pegou na foto de perfil em 26/10, e a lição
 *    anotada naquele dia era exatamente esta: **conferir só se é imagem, com
 *    teto generoso, e deixar o canvas decidir o resto.** O canvas converte o
 *    HEIC de graça, porque quem desenha a imagem é o Safari, que sabe ler
 *    HEIC.
 *
 * 2. **A foto subia do tamanho que saiu da câmera.** Até 5 MB, e o feed
 *    mostrava o arquivo inteiro como miniatura. Uma foto de 12 MP tem uns
 *    4000 px de lado; na tela ela ocupa 350. Quem rolava o feed baixava
 *    dezenas de megabytes de dados móveis para ver fotos reduzidas pelo
 *    navegador.
 *
 * Agora toda foto passa pelo canvas antes de subir: no máximo 1600 px no
 * maior lado, JPEG. Sai de 4 MB para uns 300 KB, e o que chega no balde é
 * sempre JPEG — não importa o que o celular mandou.
 */

/**
 * Maior lado da foto que vai para o balde.
 *
 * 1600 px é o dobro da maior tela de celular, com folga para quem abre a
 * foto em tela cheia e dá zoom. Reduzir mais economizaria dados e apareceria
 * na hora em que alguém abrisse a foto.
 */
export const MAIOR_LADO = 1600;

/** 0.82 é onde o JPEG ainda não mostra bloco em foto de pele e céu. */
export const QUALIDADE = 0.82;

/** Teto do arquivo que **entra**. Generoso de propósito: o canvas reduz depois. */
export const MAIOR_FOTO_QUE_ENTRA = 30 * 1024 * 1024;

export const ehFoto = (tipo: string) => tipo.startsWith("image/");
export const ehVideo = (tipo: string) => tipo.startsWith("video/");

/**
 * Formatos de vídeo que todo celular toca.
 *
 * O resto **sobe mesmo assim**, e isso é escolha, não descuido: vídeo da
 * galeria do iPhone é `.mov` (`video/quicktime`), e recusar significa que
 * quem tem iPhone não posta vídeo nenhum. Melhor subir e avisar que algum
 * aparelho pode não tocar — o `VideoQueFalha` já mostra recado digno em vez
 * do quadro preto. Converter vídeo no navegador é outra ordem de trabalho.
 */
const VIDEO_QUE_TODO_MUNDO_TOCA = ["video/mp4", "video/webm"];

export function videoPodeNaoTocar(tipo: string): boolean {
  return ehVideo(tipo) && !VIDEO_QUE_TODO_MUNDO_TOCA.includes(tipo);
}

/**
 * Com que tipo o arquivo vai para o balde.
 *
 * Foto é sempre `image/jpeg`, porque passou pelo canvas.
 *
 * Vídeo que não é WebM vai como `video/mp4`, e aqui há um motivo técnico:
 * `.mov` de iPhone e `.mp4` são o **mesmo formato de recipiente** (ISO BMFF),
 * só com assinatura diferente. O Chrome do Android recusa de cara qualquer
 * coisa anunciada como `video/quicktime`, mas toca o conteúdo quando ele vem
 * anunciado como `video/mp4`. Então anunciar assim faz o vídeo de iPhone
 * tocar no Android na maioria dos casos — não em todos, porque iPhone novo
 * grava em HEVC, que o Android não decodifica. É por isso que o aviso
 * continua existindo em vez de a gente dizer que resolveu.
 */
export function tipoParaSubir(tipo: string): string {
  if (ehFoto(tipo)) return "image/jpeg";
  if (tipo === "video/webm") return "video/webm";
  return "video/mp4";
}

export const AVISO_DO_VIDEO =
  "Esse vídeo veio num formato que alguns celulares não tocam. Dá para publicar, mas se quiser garantir, grave pela câmera do app.";

/** O nome do arquivo que sai daqui: sempre `.jpg`, porque sempre é JPEG. */
export function nomeDaFoto(original: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "foto";
  return base.slice(0, 40) + ".jpg";
}

/**
 * Reduz e converte a foto para JPEG. Devolve `null` quando o navegador não
 * consegue nem abrir a imagem.
 *
 * `null` acontece de verdade: um Android que receba um HEIC compartilhado de
 * um iPhone não sabe desenhar aquilo. Nesse caso é melhor dizer que não deu
 * do que subir um arquivo que ninguém vai ver.
 */
export async function fotoParaEnviar(
  file: File,
  maior = MAIOR_LADO,
  qualidade = QUALIDADE,
): Promise<File | null> {
  const endereco = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("não abriu"));
      el.src = endereco;
    });
    const { largura, altura } = medidasReduzidas(img.naturalWidth, img.naturalHeight, maior);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Fundo branco: PNG com transparência viraria preto no JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(img, 0, 0, largura, altura);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualidade),
    );
    if (!blob) return null;
    return new File([blob], nomeDaFoto(file.name), { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

/** Reduz mantendo a proporção, e **nunca aumenta** foto pequena. */
export function medidasReduzidas(
  largura: number,
  altura: number,
  maior = MAIOR_LADO,
): { largura: number; altura: number } {
  const escala = Math.min(1, maior / Math.max(largura, altura));
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}
