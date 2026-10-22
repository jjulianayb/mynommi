// TODO: exigir conta de parceiro autenticada quando houver login real
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";

export type MeetupIdea = {
  title: string;
  description: string;
  when: string;
  teiaSize: string;
  bonus: string;
  welcoming: string;
  points: number;
};
const LIMIT_MSG = "Muitos pedidos agora. Tente de novo em instantes.";
const OFF_MSG = "As ideias estão indisponíveis no momento. Tente mais tarde.";
const hits = new Map<string, number[]>();
let day = { start: 0, count: 0 };
/** Limite em memória (melhor esforço): 3/min e 15/h por IP, 150/dia no total. */
function allow(ip: string, now = Date.now()) {
  if (now - day.start > 86_400_000) day = { start: now, count: 0 };
  if (day.count >= 150) return false;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= 15 || list.filter((t) => now - t < 60_000).length >= 3) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  day.count++;
  if (hits.size > 5000)
    for (const [k, v] of hits) if (!v.some((t) => now - t < 3_600_000)) hits.delete(k);
  return true;
}
const clean = (t: string) =>
  t
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const short = z.string().trim().max(80);
const Input = z.object({
  name: z.string().trim().min(2).max(60),
  kind: short,
  area: short,
  hours: short,
  capacity: short,
  offer: z.string().trim().max(200),
  interests: z.array(z.string().trim().min(1).max(30)).min(1).max(10),
  note: z.string().trim().max(200).optional(),
});
const idea = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "when", "teiaSize", "bonus", "welcoming", "points"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    when: { type: "string" },
    teiaSize: { type: "string" },
    bonus: { type: "string" },
    welcoming: { type: "string" },
    points: { type: "integer" },
  },
};
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: { ideas: { type: "array", items: idea } },
};

export const suggestMeetupIdeas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ideas: MeetupIdea[]; error?: string }> => {
    const ip = (
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0] ||
      "desconhecido"
    ).trim();
    if (!allow(ip)) return { ideas: [], error: LIMIT_MSG };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ideas: [], error: "As ideias de encontros não estão configuradas." };
    const f = {
      name: clean(data.name),
      kind: clean(data.kind),
      area: clean(data.area),
      hours: clean(data.hours),
      capacity: clean(data.capacity),
      offer: clean(data.offer),
      interests: data.interests.map(clean).filter(Boolean),
      note: data.note ? clean(data.note) : "",
    };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          'Você cria ideias de encontros para o Nommi, app que combate a solidão reunindo adultos em "teias" (pequenos grupos de amizade) em lugares parceiros. Escreva em português do Brasil, linguagem neutra de gênero, tom acolhedor, sem emojis. Cada ideia deve: acontecer no próprio estabelecimento, ser leve para quem chega sozinho e não conhece ninguém (inclua um quebra-gelo simples), não ter álcool como foco principal, não ter competição entre pessoas nem ranking, não pressionar consumo. "description" com até 2 frases; "when" com dia e horário sugeridos; "teiaSize" como "4 a 8 pessoas"; "bonus" é um benefício realista que a empresa pode oferecer; "welcoming" explica em 1 frase por que acolhe quem chega sozinho; "points" é um inteiro entre 10 e 40 para a tribo.',
        input: `Crie 4 ideias de encontros diferentes. Estabelecimento: ${f.name} (${f.kind}), região ${f.area}. Horários bons: ${f.hours || "não informado"}. Capacidade: ${f.capacity || "não informada"}. O que oferece para tribos: ${f.offer || "não informado"}. Interesses da tribo da marca: ${f.interests.join(", ")}.${f.note ? " Observação: " + f.note : ""}`,
        text: { format: { type: "json_schema", name: "meetup_ideas", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      console.error("AI gateway status", res.status);
      return { ideas: [], error: res.status === 429 ? LIMIT_MSG : OFF_MSG };
    }
    let text = "";
    let buf = "";
    let refused = false;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5));
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.refusal.delta" || ev.type === "response.failed") refused = true;
        } catch {
          /* linha parcial */
        }
      }
    }
    if (refused) return { ideas: [], error: OFF_MSG };
    try {
      const out = JSON.parse(text) as { ideas: MeetupIdea[] };
      return {
        ideas: out.ideas.slice(0, 4).map((i) => ({
          ...i,
          points: Math.min(40, Math.max(10, Math.round(i.points / 10) * 10)),
        })),
      };
    } catch {
      return { ideas: [], error: "A resposta veio vazia. Tente de supabase." };
    }
  });
