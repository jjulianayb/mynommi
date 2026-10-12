import { describe, it, expect } from 'vitest';
import { toMessage } from './shared-teias';
const row = { id: '1', teia_key: '0', sender_id: 'a', author: 'Bia', body: 'oi', sticker: null, created_at: '2026-10-12T18:00:00Z' };
describe('toMessage', () => {
  it('marca como minha a mensagem enviada por mim', () => { expect(toMessage(row, 'a').mine).toBe(true); });
  it('mostra o apelido de quem enviou de outro celular', () => { const m = toMessage(row, 'b'); expect(m.mine).toBe(false); expect(m.author).toBe('Bia'); });
});
