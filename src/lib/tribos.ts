import { groups, type DemoState, type Message } from "./friends-data";

export type Tribo = {
  id: number;
  name: string;
  mode: string;
  members: number;
  icon: string;
  tone: string;
  ids: number[];
  place?: string;
  time?: string;
  rule?: string;
  moderated?: boolean;
  host?: string;
  partner?: number;
  about?: string;
  official?: boolean;
};

/** Tribos abertas: entrada imediata, sem aprovação. */
export const openTeias: Tribo[] = [
  {
    id: 3,
    name: "Café e conversa · Savassi",
    mode: "Presencial",
    members: 9,
    icon: "chat",
    tone: "yellow",
    ids: [4, 1, 10],
    place: "Savassi",
    time: "Sábados, 10h",
    host: "Marina",
  },
  {
    id: 4,
    name: "Corrida de domingo · Parque Municipal",
    mode: "Presencial",
    members: 14,
    icon: "pin",
    tone: "teal",
    ids: [12, 10, 6],
    place: "Parque Municipal",
    time: "Domingos, 7h",
    host: "Lucas",
  },
  {
    id: 5,
    name: "Séries sem spoiler",
    mode: "Online",
    members: 21,
    icon: "star",
    tone: "blue",
    ids: [13, 11, 4],
    time: "Qualquer hora",
    host: "Helena",
  },
  {
    id: 6,
    name: "Desabafo sem julgamento",
    mode: "Online",
    members: 17,
    icon: "heart",
    tone: "red",
    ids: [8, 7, 2],
    time: "Qualquer hora",
    rule: "Aqui a gente escuta",
    moderated: true,
    host: "Joana",
  },
];
/** Tribos de marca: abertas, criadas por empresas parceiras (índice em partners). */
export const brandTeias: Tribo[] = [
  {
    id: 7,
    name: "Corredores do Trilha Aberta",
    mode: "Presencial",
    members: 26,
    icon: "pin",
    tone: "teal",
    ids: [12, 10, 8],
    place: "Mangabeiras",
    time: "Domingos, 7h",
    host: "Trilha Aberta",
    partner: 5,
  },
  {
    id: 8,
    name: "Quinta do karaokê",
    mode: "Presencial",
    members: 31,
    icon: "mic",
    tone: "red",
    ids: [7, 6, 1],
    place: "Centro",
    time: "Quintas, 20h",
    host: "Karaokê Bem-Te-Vi",
    partner: 0,
  },
  {
    id: 9,
    name: "Confraria do Vinho Azul",
    mode: "Presencial",
    members: 18,
    icon: "glass",
    tone: "blue",
    ids: [4, 2, 7],
    place: "Savassi",
    time: "Sextas, 19h",
    host: "Bar do Vinho Azul",
    partner: 1,
  },
];
export const brandTeiaFor = (partner: number) => brandTeias.find((t) => t.partner === partner);
export const allTeias: Tribo[] = [...groups, ...openTeias, ...brandTeias];
export const getTeia = (id: number) => allTeias.find((t) => t.id === id);
export function teiasFor(state: Pick<DemoState, "joinedTeias" | "createdTeias">) {
  return [...allTeias, ...(state.createdTeias ?? [])].filter((t) =>
    (state.joinedTeias ?? []).includes(t.id),
  );
}
export function teiaFor(state: Pick<DemoState, "createdTeias">, id: number) {
  return state.createdTeias?.find((t) => t.id === id) ?? getTeia(id);
}
export function hasSharedTeia(state: DemoState, personId: number) {
  if (state.blocked.includes(personId)) return false;
  const attended = [
    ...(state.attendedTeias ?? []),
    ...state.challenges.filter((c) => c.status === "done").map((c) => c.group),
  ];
  return attended.some((id) => teiaFor(state, id)?.ids.includes(personId));
}
export const WELCOME_TEXT = "Oi! Que bom que você chegou. Conta o que te trouxe aqui?";

export function joinedIds(state: Pick<DemoState, "joinedTeias">) {
  return state.joinedTeias ?? [];
}
export function isMember(state: Pick<DemoState, "joinedTeias">, id: number) {
  return joinedIds(state).includes(id);
}

/** Entra na tribo na hora e recebe uma mensagem de boas-vindas (uma única vez). */
export function joinTeia(state: DemoState, id: number): DemoState {
  const t = teiaFor(state, id);
  if (!t || isMember(state, id)) return state;
  const key = String(id);
  const msgs = state.groupMessages[key] ?? [];
  const welcome: Message = { text: WELCOME_TEXT, mine: false, author: t.host ?? "Nommi" };
  return {
    ...state,
    joinedTeias: [...joinedIds(state), id],
    groupMessages: {
      ...state.groupMessages,
      [key]: msgs.some((m) => m.text === WELCOME_TEXT) ? msgs : [...msgs, welcome],
    },
  };
}
export function leaveTeia(state: DemoState, id: number): DemoState {
  return { ...state, joinedTeias: joinedIds(state).filter((x) => x !== id) };
}
