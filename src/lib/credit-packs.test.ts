import { describe, expect, it } from 'vitest';
import { creditsForPrice } from './credits';
describe('pacotes pagos', () => {
  it('10 créditos', () => expect(creditsForPrice('credits_10_once')).toBe(10));
  it('30 créditos', () => expect(creditsForPrice('credits_30_once')).toBe(30));
  it('80 créditos', () => expect(creditsForPrice('credits_80_once')).toBe(80));
  it('pacote desconhecido não concede', () => expect(creditsForPrice('x')).toBeUndefined());
});
