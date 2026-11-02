/**
 * Avisos push da nommi. A inscrição é voluntária: a pessoa toca no botão do
 * Pippo, no app instalado, e o navegador ainda pede a permissão dela. Cada
 * aviso sai quando chega notificação nova para ela — nunca em massa.
 * A chave pública VAPID pode circular no cliente; a privada fica só no servidor.
 */
import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLICO =
  "BKc0ah1PXBUTDyCCzhKQCm30utdfaCp_unXCQFoMiNky_Dr4_TPA_ElpwKQlMHjT8e1D8Go0GRCluczxhkdi8DM";

export function pushSuportado(nav: Navigator, win: Window): boolean {
  return "serviceWorker" in nav && "PushManager" in win && "Notification" in win;
}

export type EstadoAvisos = "sem-suporte" | "ativo" | "negado" | "disponivel";

/** Como estão os avisos neste aparelho agora. */
export function estadoDosAvisos(win: Window = window): EstadoAvisos {
  if (!pushSuportado(win.navigator, win)) return "sem-suporte";
  const p = (win as unknown as { Notification: { permission: string } }).Notification.permission;
  if (p === "granted") return "ativo";
  if (p === "denied") return "negado";
  return "disponivel";
}

/** O service worker é o carteiro dos avisos: sem ele registrado nada chega. */
export async function registrarServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* sem service worker o app segue igual; só os avisos não chegam */
  }
}

export type ResultadoAtivacao = "ativo" | "negado" | "erro";

/** Liga os avisos: pede a permissão do navegador e guarda a inscrição na conta. */
export async function ativarAvisos(me: string): Promise<ResultadoAtivacao> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "negado";
    await registrarServiceWorker();
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: deBase64Url(VAPID_PUBLICO) as BufferSource,
    });
    const j = sub.toJSON();
    const keys = j.keys as Record<string, string> | undefined;
    if (!j.endpoint || !keys?.["p256dh"] || !keys?.["auth"]) return "erro";
    // A tabela entrou na migração 0054; o types.ts gerado ainda não a conhece.
    const db = supabase as unknown as { from: (t: string) => any };
    const { error } = await db.from("push_subscriptions").upsert(
      {
        user_id: me,
        endpoint: j.endpoint,
        p256dh: keys["p256dh"],
        auth: keys["auth"],
        user_agent: navigator.userAgent.slice(0, 200),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    return error ? "erro" : "ativo";
  } catch {
    return "erro";
  }
}

/** Chave pública VAPID no formato que o navegador pede (65 bytes, ponto cru). */
export function deBase64Url(valor: string): Uint8Array {
  const b64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const cru = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(cru.length);
  for (let i = 0; i < cru.length; i++) out[i] = cru.charCodeAt(i);
  return out;
}
