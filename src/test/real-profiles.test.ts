import { describe, it, expect } from 'vitest';
import { cleanQuery } from '@/lib/real-profiles';
describe('busca de pessoas', () => {
  it('remove caracteres que quebram o filtro', () => { expect(cleanQuery(' Ju,(%) ')).toBe('Ju'); });
  it('limita a 40 letras', () => { expect(cleanQuery('a'.repeat(60))).toHaveLength(40); });
});
