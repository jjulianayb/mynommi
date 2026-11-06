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

/**
 * O que o Pippo faz quanto aos avisos, e qual marca isso gasta.
 *
 * **O bug que isto fecha (06/11): 42 contas, zero avisos ligados.** A marca de
 * "já falei disso" era gravada **antes** de decidir o que mostrar. Ninguém
 * chega com o app já na tela inicial, então a primeira visita caía sempre no
 * ramo "instala primeiro" e queimava a marca. Quando a pessoa instalava
 * depois, o efeito saía na primeira linha e **a oferta de ligar nunca mais
 * aparecia**.
 *
 * Por isso cada caminho tem a sua marca: ensinar a instalar não gasta a
 * chance de oferecer.
 */
export type PassoDoAviso = "oferecer" | "ensinar-instalar" | "nada";

export function passoDoAviso(instalado: boolean, estado: EstadoAvisos): PassoDoAviso {
  if (instalado && estado === "disponivel") return "oferecer";
  // Sem o app na tela inicial não adianta oferecer: no iPhone a notificação
  // só existe assim, e é regra da Apple, não escolha nossa.
  if (!instalado) return "ensinar-instalar";
  // Já ligado, já negado, ou navegador sem suporte: não há o que dizer.
  return "nada";
}

/** A marca é por caminho, nunca uma só para os dois. */
export function marcaDoAviso(passo: PassoDoAviso, me: string): string | null {
  if (passo === "oferecer") return "nommi-pippo-avisos-" + me;
  if (passo === "ensinar-instalar") return "nommi-pippo-instalar-" + me;
  return null;
}

export type ResultadoAtivacao = "ativo" | "negado" | "erro";

/**
 * Quanto tempo esperar o service worker ficar pronto.
 *
 * `navigator.serviceWorker.ready` é uma promessa que **nunca rejeita**: se o
 * registro falhou, ela simplesmente não resolve nunca. Sem prazo, quem tocasse
 * em "ligar os avisos" ficaria esperando para sempre, sem erro e sem recado —
 * e o `catch` lá embaixo nunca dispararia, porque nada foi lançado.
 */
export const PRAZO_DO_SW_MS = 8000;

export async function prontoComPrazo(prazo = PRAZO_DO_SW_MS): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), prazo)),
  ]);
}

/** Liga os avisos: pede a permissão do navegador e guarda a inscrição na conta. */
export async function ativarAvisos(me: string): Promise<ResultadoAtivacao> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "negado";
    await registrarServiceWorker();
    const reg = await prontoComPrazo();
    if (!reg) return "erro";
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
