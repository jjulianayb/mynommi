import { describe, it, expect } from 'vitest';
import { connectionState, otherId } from '@/lib/connections';
const row = (status: string) => ({ id: '1', requester_id: 'a', addressee_id: 'b', status, created_at: '' });
describe('conexões', () => {
  it('sem pedido', () => expect(connectionState(undefined, 'a')).toBe('nenhuma'));
  it('quem pediu vê enviada', () => expect(connectionState(row('pendente'), 'a')).toBe('enviada'));
  it('quem recebeu vê recebida', () => expect(connectionState(row('pendente'), 'b')).toBe('recebida'));
  it('aceita vira amigos para os dois', () => { expect(connectionState(row('aceita'), 'a')).toBe('amigos'); expect(connectionState(row('aceita'), 'b')).toBe('amigos'); });
  it('outra pessoa', () => expect(otherId(row('aceita'), 'b')).toBe('a'));
});
