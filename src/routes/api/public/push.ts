/*
 * Envio de avisos push. Quem chama é o gatilho do banco (migração 0054) quando
 * chega notificação nova; o segredo em push_config garante que só ele chama.
 * O aviso viaja sem conteúdo ("tem novidade"): nada privado passa pelo serviço
 * de push do navegador. Inscrições vencidas (404/410) são removidas.
 */
import { createFileRoute } from "@tanstack/react-router";

const b64u = (dados: string | Uint8Array): string => {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : dados;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Assinatura VAPID (ES256): é o que prova ao serviço de push que o envio é nosso. */
async function jwtVapid(aud: string, jwk: JsonWebKey): Promise<string> {
  const cabecalho = b64u(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const corpo = b64u(
    JSON.stringify({
      aud,
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: "mailto:contato@nommibr.com.br",
    }),
  );
  const chave = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      chave,
      new TextEncoder().encode(`${cabecalho}.${corpo}`),
    ),
  );
  return `${cabecalho}.${corpo}.${b64u(assinatura)}`;
}

/** Envia um "cutucão" sem carga: o service worker mostra o aviso genérico. */
async function empurrar(endpoint: string, jwk: JsonWebKey, publico: string): Promise<number> {
  try {
    const jwt = await jwtVapid(new URL(endpoint).origin, jwk);
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${publico}`,
        TTL: "43200",
        Urgency: "normal",
      },
    });
    return r.status;
  } catch {
    return 0;
  }
}

export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // As tabelas da 0054 ainda não estão no types.ts gerado.
        const admin = supabaseAdmin as unknown as { from: (t: string) => any };
        const { data: confLinhas } = await admin.from("push_config").select("chave, valor");
        const conf: Record<string, string> = {};
        for (const l of (confLinhas ?? []) as { chave: string; valor: string }[]) conf[l.chave] = l.valor;
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
        const dado = request.headers.get("x-push-segredo") ?? "";
        if (!conf["segredo"] || !timingSafeEqual(digest(dado), digest(conf["segredo"])))
          return new Response("Unauthorized", { status: 401 });
        const corpo = (await request.json().catch(() => null)) as { user_id?: string } | null;
        const userId = corpo?.user_id ?? "";
        if (!/^[0-9a-fA-F-]{36}$/.test(userId))
          return Response.json({ ok: false, erro: "user_id inválido" }, { status: 400 });
        if (!conf["vapid_privado_jwk"] || !conf["vapid_publico"])
          return Response.json({ ok: false, erro: "push sem chave" }, { status: 500 });
        const jwk = JSON.parse(conf["vapid_privado_jwk"]) as JsonWebKey;
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("endpoint")
          .eq("user_id", userId);
        let enviados = 0;
        for (const s of (subs ?? []) as { endpoint: string }[]) {
          const status = await empurrar(s.endpoint, jwk, conf["vapid_publico"]);
          await admin.from("push_envios").insert({
            user_id: userId,
            endpoint: s.endpoint,
            status,
            erro: status === 0 ? "falha de rede" : null,
          });
          if (status === 404 || status === 410)
            await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          if (status >= 200 && status < 300) enviados++;
        }
        return Response.json({ ok: true, enviados });
      },
    },
  },
});
