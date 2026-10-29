/**
 * A explicação que aparece na primeira vez que a pessoa abre cada tela.
 *
 * O tour do começo mostra onde ficam as coisas. Isso aqui é outra coisa: no
 * momento em que a pessoa abre o Radar, ela quer saber **o que isso faz e por
 * que existe**, não onde fica. Explicação no lugar certo, na hora certa, e
 * some depois de lida.
 *
 * Fica guardado por aparelho, não na conta: é preferência de tela, igual ao
 * tour. Quem trocar de celular vê de novo, e está tudo bem.
 */

export type Explicacao = {
  chave: string;
  titulo: string;
  texto: string;
  dica?: string;
};

export const EXPLICACOES: Explicacao[] = [
  {
    chave: "radar",
    titulo: "O Radar é para quando você já está na rua.",
    texto:
      "Você liga, diz onde está, e vê quem da nommi está por perto agora. Serve para o encontro que acontece sem combinar: você está num café, alguém da sua tribo está a dois quarteirões.",
    dica: "Ninguém vê o seu ponto exato, só uma distância aproximada. E some sozinho no tempo que você escolher.",
  },
  {
    chave: "descobrir",
    titulo: "Aqui é pelo que vocês gostam, não pela foto.",
    texto:
      "A fila é montada pelos interesses e pelas tribos que vocês têm em comum. Interesse raro pesa mais que interesse comum, porque é ele que explica o encontro.",
    dica: "Quem você passa nunca fica sabendo. Quanto mais interesses você marcar, melhor fica a fila.",
  },
  {
    chave: "tribos",
    titulo: "Tribo é conversa, não compromisso.",
    texto:
      "Muita gente entra só para conversar e fazer amizade. Marcar rolê é opcional, e tem tribo que nunca marca nada. Está valendo do mesmo jeito.",
  },
  {
    chave: "stories",
    titulo: "Story aqui é o agora.",
    texto:
      "Vale uma hora e some. Não é álbum da semana: é o café que você está tomando, a fila do show, o cachorro no colo.",
    dica: "Dá para tirar na hora ou escolher da galeria, e salvar no celular depois.",
  },
  {
    chave: "roles",
    titulo: "Rolê é o encontro com dia e hora.",
    texto:
      "Alguém propõe, quem quiser diz que vai. Combine em lugar público e avise alguém de confiança. A nommi não organiza nada: quem combina são vocês.",
  },
  {
    chave: "selos",
    titulo: "Selo é o que os amigos dizem de você.",
    texto:
      "Ninguém se descreve direito. Os selos são o jeito do app entender você por fora, pelo que as pessoas que já te conhecem carimbam.",
    dica: "Você nunca descobre quem carimbou, e pode tirar qualquer selo da sua página.",
  },
  {
    chave: "perguntas",
    titulo: "Essas perguntas são para quebrar o gelo.",
    texto:
      "Qual filme você veria hoje, qual café, o que você quer fazer agora. Não é teste e não vale nota: é assunto pronto para começar conversa com quem respondeu parecido.",
  },
  {
    chave: "clube",
    titulo: "O clube são os lugares parceiros.",
    texto:
      "Cafés, bares e espaços que recebem tribos da nommi. Quando você vai e confirma presença, a tribo ganha estrela.",
  },
  {
    chave: "conversas",
    titulo: "Conversa a sós abre quando vira amizade.",
    texto:
      "Não dá para mandar mensagem para quem não aceitou você. É de propósito: numa rede de amizade, caixa de entrada aberta vira porta para chateação.",
  },
];

export const explicacaoDe = (chave: string): Explicacao | null =>
  EXPLICACOES.find((e) => e.chave === chave) ?? null;

const CHAVE = "nommi-explicado";

function lidas(): string[] {
  try {
    const cru = localStorage.getItem(CHAVE);
    const lista = cru ? (JSON.parse(cru) as unknown) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function jaExplicado(chave: string): boolean {
  return lidas().includes(chave);
}

export function marcarExplicado(chave: string): void {
  try {
    const lista = lidas();
    if (!lista.includes(chave)) localStorage.setItem(CHAVE, JSON.stringify([...lista, chave]));
  } catch {
    // Aparelho sem armazenamento: a explicação volta na próxima. Melhor do que sumir.
  }
}

/** "Ver as explicações de novo", do menu: volta tudo ao começo. */
export function esquecerExplicacoes(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}
