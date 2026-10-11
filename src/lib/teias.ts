import { groups, type DemoState, type Message } from './friends-data';

export type Teia = { id: number; name: string; mode: string; members: number; icon: string; tone: string; ids: number[]; place?: string; time?: string; rule?: string; moderated?: boolean; host?: string };

/** Teias abertas: entrada imediata, sem aprovação. */
export const openTeias: Teia[] = [
  { id: 3, name: 'Café e conversa · Savassi', mode: 'Presencial', members: 9, icon: 'chat', tone: 'yellow', ids: [4, 1, 10], place: 'Savassi', time: 'Sábados, 10h', host: 'Marina' },
  { id: 4, name: 'Corrida de domingo · Parque Municipal', mode: 'Presencial', members: 14, icon: 'pin', tone: 'teal', ids: [12, 10, 6], place: 'Parque Municipal', time: 'Domingos, 7h', host: 'Lucas' },
  { id: 5, name: 'Séries sem spoiler', mode: 'Online', members: 21, icon: 'star', tone: 'blue', ids: [13, 11, 4], time: 'Qualquer hora', host: 'Helena' },
  { id: 6, name: 'Desabafo sem julgamento', mode: 'Online', members: 17, icon: 'heart', tone: 'red', ids: [8, 7, 2], time: 'Qualquer hora', rule: 'Aqui a gente escuta', moderated: true, host: 'Joana' },
];
export const allTeias: Teia[] = [...groups, ...openTeias];
export const getTeia = (id: number) => allTeias.find((t) => t.id === id);
export const WELCOME_TEXT = 'Oi! Que bom que você chegou. Conta o que te trouxe aqui?';

export function joinedIds(state: Pick<DemoState, 'joinedTeias'>) { return state.joinedTeias ?? []; }
export function isMember(state: Pick<DemoState, 'joinedTeias'>, id: number) { return joinedIds(state).includes(id); }

/** Entra na teia na hora e recebe uma mensagem de boas-vindas (uma única vez). */
export function joinTeia(state: DemoState, id: number): DemoState {
  const t = getTeia(id); if (!t || isMember(state, id)) return state;
  const key = String(id); const msgs = state.groupMessages[key] ?? [];
  const welcome: Message = { text: WELCOME_TEXT, mine: false, author: t.host ?? 'Nommi' };
  return { ...state, joinedTeias: [...joinedIds(state), id], groupMessages: { ...state.groupMessages, [key]: msgs.some((m) => m.text === WELCOME_TEXT) ? msgs : [...msgs, welcome] } };
}
export function leaveTeia(state: DemoState, id: number): DemoState {
  return { ...state, joinedTeias: joinedIds(state).filter((x) => x !== id) };
}
