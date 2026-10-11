import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

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
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { openers: [], error: 'A sugestão de mensagens não está configurada.' };
    const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'fetch' },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra', stream: true, store: false,
        reasoning: { effort: 'low' },
        instructions: 'Você ajuda adultos a começar amizades no app Nommi. Escreva em português do Brasil, tom leve, caloroso e respeitoso, sem flerte, sem emojis, sem pedir dados pessoais nem endereço. Cada mensagem tem no máximo 2 frases e termina com uma pergunta aberta. Sugira encontros só em lugares públicos.',
        input: `Crie 3 mensagens de abertura diferentes para ${data.name}. Interesses em comum: ${data.shared.join(', ')}.${data.note ? ' Contexto: ' + data.note : ''}`,
        text: { format: { type: 'json_schema', name: 'openers', strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 429 ? 'Muitos pedidos agora. Tente de novo em instantes.' : res.status === 402 || res.status === 403 ? 'Os créditos de IA acabaram. Peça para a dona do app adicionar mais.' : 'Não foi possível sugerir mensagens agora.';
      console.error('AI gateway', res.status, await res.text().catch(() => ''));
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
