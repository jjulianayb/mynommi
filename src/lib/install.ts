/** Instalar a nommi na tela de início do celular, enquanto o app é web. */
export type InstallPlatform = "android" | "ios" | "desktop";

/** Descobre a plataforma pelo identificador do navegador. iPad moderno se apresenta como Mac com toque. */
export function platformOf(ua: string, maxTouchPoints = 0): InstallPlatform {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  return "desktop";
}

/** Passo a passo para quem precisa instalar na mão (iPhone e navegadores sem botão próprio). */
export function installSteps(platform: InstallPlatform): string[] {
  if (platform === "ios")
    return [
      "Toque no botão Compartilhar, embaixo na barra do Safari.",
      "Role a lista e escolha “Adicionar à Tela de Início”.",
      "Confirme em “Adicionar”. A nommi vira um ícone no seu celular.",
    ];
  if (platform === "android")
    return [
      "Toque nos três pontinhos, no canto do navegador.",
      "Escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.",
      "Confirme. A nommi vira um ícone no seu celular.",
    ];
  return [
    "Clique no ícone de instalar, na barra de endereço.",
    "Confirme em “Instalar”.",
    "A nommi abre em janela própria, sem a barra do navegador.",
  ];
}

/** Já está aberto como app instalado? Então não há o que oferecer. */
export function isStandalone(win: {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: { standalone?: boolean };
}): boolean {
  if (win.navigator?.standalone) return true;
  try {
    return !!win.matchMedia?.("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

export const DISMISS_DAYS = 30;

/** Depois de dispensar, o convite some por 30 dias. Valor inválido conta como nunca dispensado. */
export function shouldOffer(dismissedAt: string | null, now = Date.now()): boolean {
  if (!dismissedAt) return true;
  const t = Date.parse(dismissedAt);
  if (Number.isNaN(t)) return true;
  return now - t > DISMISS_DAYS * 86400000;
}
