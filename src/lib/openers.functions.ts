// TODO: exigir usuário autenticado quando houver login real
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getRequestHeader } from '@tanstack/react-start/server';

const LIMIT_MSG = 'Muitos pedidos agora. Tente de novo em instantes.';
const hits = new Map<string, number[]>();
let day = { start: 0, count: 0 };
/** Limite em memória (melhor esforço): 5/min e 30/h por IP, 300/dia no total. */
function allow(ip: string, now = Date.now()): boolean {
  if (now - day.start > 86_400_000) day = { start: now, count: 0 };
  if (day.count >= 300) return false;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= 30 || list.filter((t) => now - t < 60_000).length >= 5) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list); day.count++;
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 3_600_000)) hits.delete(k);
  return true;
}
const clean = (t: string) => t.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim();

const Input = z.object({
  name: z.string().trim().min(1).max(40),
  shared: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  note: z.string().trim().max(200).optional(),
});

const schema = {
  type: 'object', additionalProperties: false, required: ['openers'],
  properties: { openers: { type: 'array', items: { type: 'string' } } },
};

/** Public demo endpoint: only receives a first name + interests, never stores anything. */
export const suggestOpeners = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ openers: string[]; error?: string }> => {
    const ip = (getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for')?.split(',')[0] || 'desconhecido').trim();
    if (!allow(ip)) return { openers: [], error: LIMIT_MSG };
    const name = clean(data.name); const shared = data.shared.map(clean).filter(Boolean); const note = data.note ? clean(data.note).slice(0, 200) : '';
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { openers: [], error: 'A sugestão de mensagens não está configurada.' };
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra', stream: true, store: false,
        reasoning: { effort: 'low' },
        instructions: 'Você ajuda adultos a começar amizades no app Nommi. Escreva em português do Brasil, tom leve, caloroso e respeitoso, sem flerte, sem emojis, sem pedir dados pessoais nem endereço. Cada mensagem tem no máximo 2 frases e termina com uma pergunta aberta. Sugira encontros só em lugares públicos.',
        input: `Crie 3 mensagens de abertura diferentes para ${name}. Interesses em comum: ${shared.join(', ')}.${note ? ' Contexto: ' + note : ''}`,
        text: { format: { type: 'json_schema', name: 'openers', strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 429 ? LIMIT_MSG : 'As sugestões estão indisponíveis no momento. Tente mais tarde.';
      console.error('AI gateway status', res.status);
      return { openers: [], error: msg };
    }
    let text = ''; let buf = ''; const reader = res.body.getReader(); const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const l of lines) {
        if (!l.startsWith('data:')) continue;
        try { const ev = JSON.parse(l.slice(5)); if (ev.type === 'response.output_text.delta') text += ev.delta; } catch { /* ignore */ }
      }
    }
    try { const out = JSON.parse(text) as { openers: string[] }; return { openers: out.openers.slice(0, 3) }; }
    catch { return { openers: [], error: 'A resposta veio vazia. Tente de novo.' }; }
  });
