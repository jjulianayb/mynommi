/**
 * Em que navegador a pessoa está.
 *
 * A nommi cresce por WhatsApp, e link aberto dentro do WhatsApp não abre no
 * navegador do celular: abre numa janelinha embutida no próprio WhatsApp. Essa
 * janelinha não guarda direito o que o login do Google precisa guardar, e o
 * retorno falha com "Missing state parameter" numa tela que a pessoa não
 * entende e da qual não tem como sair sozinha.
 *
 * Não dá para consertar a janelinha. Dá para reconhecer e avisar antes, e
 * oferecer o caminho que funciona nela: o cadastro por e-mail.
 */

/** Navegador embutido de outro app (WhatsApp, Instagram, Facebook, TikTok). */
export function ehNavegadorDeApp(ua: string): boolean {
  const u = String(ua ?? "");
  if (/\bFBAN|\bFBAV|FB_IAB|FBIOS/i.test(u)) return true; // Facebook e Messenger
  if (/Instagram/i.test(u)) return true;
  if (/\bLine\//i.test(u)) return true;
  if (/BytedanceWebview|musical_ly|TikTok/i.test(u)) return true;
  if (/\bGSA\//i.test(u)) return true; // app do Google
  // O WhatsApp no Android se anuncia; no iPhone ele se disfarça de Safari e
  // some com a palavra "Safari" no fim da linha, que é como dá para notar.
  if (/WhatsApp/i.test(u)) return true;
  if (/iPhone|iPad/i.test(u) && /AppleWebKit/i.test(u) && !/Safari|CriOS|FxiOS|EdgiOS/i.test(u))
    return true;
  return false;
}

/** O que dizer para quem está na janelinha, sem jargão. */
export const RECADO_DO_NAVEGADOR =
  "Você abriu a nommi dentro de outro aplicativo, e aqui o login do Google não funciona direito. " +
  "Toque nos três pontinhos no canto e escolha abrir no navegador, ou crie sua conta com e-mail aqui mesmo, que funciona.";

/** O login social vale a pena nesta janela? */
export const podeEntrarComGoogle = (ua: string) => !ehNavegadorDeApp(ua);

/**
 * O recado quando o login social volta com erro.
 * Nunca mostra código de erro: quem está entrando não tem o que fazer com ele.
 */
export function recadoDoLoginSocial(dentroDeApp: boolean): string {
  if (dentroDeApp)
    return "O login do Google não funciona dentro desta janelinha. Abra a nommi no navegador do celular, ou crie sua conta com e-mail aqui embaixo.";
  return "O login do Google não completou. Tente de novo, ou crie sua conta com e-mail aqui embaixo, que leva um minuto.";
}
