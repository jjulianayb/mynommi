import { describe, it, expect } from 'vitest';
import { PLACES, nearestPlace, nearbyNommis, distanceLabel, searchPlaces } from '@/lib/radar';
const savassi = PLACES.find(p => p.name === 'Café Savassi')!;
describe('Radar Nommi', () => {
  it('tem pelo menos 20 lugares públicos', () => { expect(PLACES.length).toBeGreaterThanOrEqual(20); });
  it('converte a posição no lugar público mais próximo', () => { expect(nearestPlace(-19.9246, -43.9353).name).toBe('Parque Municipal'); });
  it('busca por nome ou bairro sem acento', () => { expect(searchPlaces('pampulha').map(p => p.name)).toContain('Lagoa da Pampulha'); expect(searchPlaces('', 'Cinema')).toHaveLength(2); });
  it('distância só aproximada', () => { expect(distanceLabel(0)).toBe('no mesmo lugar'); expect(distanceLabel(0.5)).toBe('a 5 min'); expect(distanceLabel(1.5)).toBe('a 15 min'); });
  it('perfil privado só aparece para quem tem match', () => {
    expect(nearbyNommis(savassi, { matches: [], blocked: [] }).some(n => n.id === 13)).toBe(false);
    expect(nearbyNommis(savassi, { matches: [13], blocked: [] }).some(n => n.id === 13)).toBe(true);
  });
  it('filtra pelo que a pessoa topa e esconde bloqueados', () => {
    const r = nearbyNommis(savassi, { matches: [], blocked: [4], activity: 'Ir ao cinema' });
    expect(r.every(n => n.activity === 'Ir ao cinema')).toBe(true); expect(r.some(n => n.id === 4)).toBe(false);
  });
  it('mais perto primeiro', () => { const r = nearbyNommis(savassi, { matches: [], blocked: [] }); expect(r[0]?.label).toBe('no mesmo lugar'); });
});
