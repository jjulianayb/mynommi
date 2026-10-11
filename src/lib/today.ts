import type { DemoState } from './friends-data';

export type ConnectChoice = 'Conversar agora' | 'Sair hoje' | 'Só ver gente por aí';
export const HEAVY = 'Hoje está pesado';
export const CONNECT_OPTIONS: string[] = ['Conversar agora', 'Sair hoje', 'Só ver gente por aí', HEAVY];

/** Data local no formato AAAA-MM-DD. */
export function localDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function greeting(hour: number, nick: string) {
  if (hour >= 5 && hour < 12) return `Bom dia, ${nick}. Um oi já é um começo.`;
  if (hour >= 12 && hour < 18) return `Boa tarde, ${nick}. Um oi já é um começo.`;
  return `Boa noite, ${nick}. Você não precisa ficar sem companhia esta noite.`;
}

type Answer = { person: number; text: string };
export const DAILY_QUESTIONS: { q: string; answers: Answer[] }[] = [
  { q: 'Qual música você ouviria hoje de olhos fechados?', answers: [{ person: 7, text: 'Qualquer coisa do Milton. Me acalma.' }, { person: 12, text: 'Uma trilha de filme bem antiga.' }, { person: 6, text: 'Aquela do karaokê de sábado, claro.' }] },
  { q: 'Qual foi o melhor café da sua vida?', answers: [{ person: 4, text: 'Um coado na casa da minha avó.' }, { person: 10, text: 'Na estrada, às 6h, com neblina.' }, { person: 1, text: 'O de hoje cedo, sinceramente.' }] },
  { q: 'Que lugar da sua cidade você mostraria a um amigo?', answers: [{ person: 2, text: 'O mirante perto da Pampulha.' }, { person: 8, text: 'Uma livraria pequena no centro.' }, { person: 7, text: 'O mercado num sábado de manhã.' }] },
  { q: 'Qual comida te lembra casa?', answers: [{ person: 6, text: 'Bolo de fubá saindo do forno.' }, { person: 11, text: 'Arroz, feijão e ovo frito.' }, { person: 4, text: 'Pão de queijo, sem discussão.' }] },
  { q: 'O que você faria num domingo perfeito?', answers: [{ person: 12, text: 'Trilha cedo e cochilo à tarde.' }, { person: 13, text: 'Série, sofá e alguém para comentar.' }, { person: 2, text: 'Almoço longo com gente boa.' }] },
  { q: 'Qual pequena coisa melhorou sua semana?', answers: [{ person: 1, text: 'Uma mensagem inesperada de alguém.' }, { person: 8, text: 'Terminei um livro bom.' }, { person: 10, text: 'Achei uma padaria nova.' }] },
  { q: 'Que hobby você gostaria de começar?', answers: [{ person: 7, text: 'Cerâmica. Sempre quis.' }, { person: 11, text: 'Cozinhar pratos de outros países.' }, { person: 6, text: 'Dançar, mesmo sem saber.' }] },
  { q: 'Qual filme você reveria hoje?', answers: [{ person: 13, text: 'Um clássico de sessão da tarde.' }, { person: 4, text: 'Qualquer comédia romântica boba.' }, { person: 12, text: 'Uma animação que me faz rir.' }] },
  { q: 'Que conselho bom você já recebeu?', answers: [{ person: 8, text: 'Ninguém está reparando tanto em você.' }, { person: 2, text: 'Coma antes de decidir algo.' }, { person: 1, text: 'Vai com medo mesmo.' }] },
  { q: 'Qual viagem curta você faria amanhã?', answers: [{ person: 12, text: 'Uma cidade histórica aqui perto.' }, { person: 10, text: 'Uma cachoeira com a turma.' }, { person: 7, text: 'Uma praia, mesmo longe.' }] },
  { q: 'O que te faz rir sem esforço?', answers: [{ person: 6, text: 'Vídeos de bicho fazendo arte.' }, { person: 11, text: 'Meus amigos contando histórias.' }, { person: 4, text: 'Minhas próprias trapalhadas.' }] },
  { q: 'Qual cheiro te traz uma boa lembrança?', answers: [{ person: 1, text: 'Terra molhada depois da chuva.' }, { person: 13, text: 'Protetor solar.' }, { person: 8, text: 'Livro novo.' }] },
  { q: 'Que mania sua as pessoas acham engraçada?', answers: [{ person: 2, text: 'Dou nome para as plantas.' }, { person: 7, text: 'Canto narrando o que estou fazendo.' }, { person: 10, text: 'Organizo tudo por cor.' }] },
  { q: 'Que programa simples você topa esta semana?', answers: [{ person: 4, text: 'Um café depois do trabalho.' }, { person: 6, text: 'Cozinhar junto e ver uma série.' }, { person: 12, text: 'Caminhar no parque.' }] },
];

export function questionFor(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const days = Math.floor(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1) / 86_400_000);
  return DAILY_QUESTIONS[((days % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length]!;
}

/** Matches em que a pessoa ainda não falou por último (no máximo 2). */
export function awaitingReply(state: Pick<DemoState, 'matches' | 'blocked' | 'messages'>, max = 2) {
  return state.matches.filter((id) => {
    if (state.blocked.includes(id)) return false;
    const msgs = state.messages[String(id)] ?? [];
    return msgs.length === 0 || !msgs[msgs.length - 1]!.mine;
  }).slice(0, max);
}

/** Há algo pendente de verdade para o sino? */
export function hasPending(state: DemoState) {
  return state.wall.some((w) => w.status === 'pending')
    || state.challenges.some((c) => c.status === 'pending')
    || state.matches.some((id) => !state.blocked.includes(id) && (state.messages[String(id)] ?? []).length === 0)
    || (state.invites ?? []).some((i) => i.host !== 3 && (i.invitedMe ?? false) && !i.joined.includes(3));
}
