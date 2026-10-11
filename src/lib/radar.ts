import { people, visibleInListings } from './friends-data';

export type PlaceType = 'Café' | 'Parque' | 'Cinema' | 'Shopping' | 'Livraria' | 'Parceiro' | 'Praça';
export type Place = { name: string; type: PlaceType; area: string; lat: number; lng: number };
export const PLACE_TYPES: PlaceType[] = ['Café', 'Parque', 'Cinema', 'Shopping', 'Livraria', 'Praça', 'Parceiro'];
export const ACTIVITIES = ['Tomar um café', 'Dar uma volta', 'Ir ao cinema', 'Bater papo', 'Comer algo', 'Só dizer oi'] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** Lugares públicos de exemplo em Belo Horizonte (coordenadas aproximadas do bairro). */
export const PLACES: Place[] = [
  { name: 'Café do Mercado Central', type: 'Café', area: 'Centro', lat: -19.9227, lng: -43.9441 },
  { name: 'Café Savassi', type: 'Café', area: 'Savassi', lat: -19.9389, lng: -43.9346 },
  { name: 'Café da Praça da Liberdade', type: 'Café', area: 'Funcionários', lat: -19.9320, lng: -43.9381 },
  { name: 'Padaria Lourdes', type: 'Café', area: 'Lourdes', lat: -19.9339, lng: -43.9452 },
  { name: 'Parque Municipal', type: 'Parque', area: 'Centro', lat: -19.9245, lng: -43.9352 },
  { name: 'Parque das Mangabeiras', type: 'Parque', area: 'Mangabeiras', lat: -19.9497, lng: -43.9157 },
  { name: 'Lagoa da Pampulha', type: 'Parque', area: 'Pampulha', lat: -19.8516, lng: -43.9716 },
  { name: 'Parque Lagoa do Nado', type: 'Parque', area: 'Itapoã', lat: -19.8306, lng: -43.9500 },
  { name: 'Cine Belas Artes', type: 'Cinema', area: 'Lourdes', lat: -19.9318, lng: -43.9469 },
  { name: 'Cinema do Shopping Cidade', type: 'Cinema', area: 'Centro', lat: -19.9207, lng: -43.9396 },
  { name: 'Shopping Pátio Savassi', type: 'Shopping', area: 'Savassi', lat: -19.9406, lng: -43.9339 },
  { name: 'BH Shopping', type: 'Shopping', area: 'Belvedere', lat: -19.9757, lng: -43.9443 },
  { name: 'Shopping Del Rey', type: 'Shopping', area: 'Caiçara', lat: -19.8752, lng: -43.9749 },
  { name: 'Livraria Quixote', type: 'Livraria', area: 'Savassi', lat: -19.9373, lng: -43.9323 },
  { name: 'Livraria da Praça', type: 'Livraria', area: 'Funcionários', lat: -19.9327, lng: -43.9366 },
  { name: 'Praça da Liberdade', type: 'Praça', area: 'Funcionários', lat: -19.9318, lng: -43.9383 },
  { name: 'Praça da Estação', type: 'Praça', area: 'Centro', lat: -19.9167, lng: -43.9338 },
  { name: 'Karaokê Bem-Te-Vi', type: 'Parceiro', area: 'Centro', lat: -19.9195, lng: -43.9381 },
  { name: 'Bar do Vinho Azul', type: 'Parceiro', area: 'Savassi', lat: -19.9395, lng: -43.9360 },
  { name: 'Pizzaria Forno Doce', type: 'Parceiro', area: 'Santa Tereza', lat: -19.9157, lng: -43.9150 },
];
const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function searchPlaces(q: string, type?: PlaceType | ''): Place[] {
  const n = norm(q);
  return PLACES.filter(p => (!type || p.type === type) && (!n || norm(p.name).includes(n) || norm(p.area).includes(n)));
}
/** Distância aproximada em km (fórmula de haversine). */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Converte a posição do aparelho no lugar público mais próximo; a coordenada não sai desta função. */
export function nearestPlace(lat: number, lng: number): Place {
  return PLACES.reduce((best, p) => (km({ lat, lng }, p) < km({ lat, lng }, best) ? p : best), PLACES[0] as Place);
}
/** Distância de caminhada aproximada, sem números exatos. */
export function distanceLabel(k: number) { return k < 0.3 ? 'no mesmo lugar' : k < 0.8 ? 'a 5 min' : k < 2 ? 'a 15 min' : 'a mais de 20 min'; }

/** Nommis de exemplo ativos agora, cada um em um lugar e com uma vontade. */
export const ACTIVE_NOMMIS: { id: number; place: string; activity: Activity }[] = [
  { id: 7, place: 'Café Savassi', activity: 'Tomar um café' }, { id: 4, place: 'Shopping Pátio Savassi', activity: 'Ir ao cinema' },
  { id: 6, place: 'Parque Municipal', activity: 'Dar uma volta' }, { id: 1, place: 'Praça da Liberdade', activity: 'Bater papo' },
  { id: 12, place: 'Parque das Mangabeiras', activity: 'Dar uma volta' }, { id: 10, place: 'Cine Belas Artes', activity: 'Ir ao cinema' },
  { id: 2, place: 'Café do Mercado Central', activity: 'Comer algo' }, { id: 8, place: 'Livraria Quixote', activity: 'Só dizer oi' },
  { id: 13, place: 'Livraria da Praça', activity: 'Tomar um café' }, { id: 11, place: 'Praça da Estação', activity: 'Bater papo' },
];

/** Quem está por perto (até ~3 km), respeitando bloqueios e perfis privados, do mais perto ao mais longe. */
export function nearbyNommis(here: Place, opts: { matches: number[]; blocked: number[]; activity?: Activity | '' }) {
  return ACTIVE_NOMMIS.flatMap(n => {
    const person = people.find(p => p.id === n.id); const place = PLACES.find(p => p.name === n.place);
    if (!person || !place || opts.blocked.includes(n.id) || !visibleInListings(person, opts.matches)) return [];
    if (opts.activity && n.activity !== opts.activity) return [];
    const d = n.place === here.name ? 0 : km(here, place);
    return d > 3 ? [] : [{ ...n, person, km: d, label: distanceLabel(d) }];
  }).sort((a, b) => a.km - b.km);
}
