/**
 * Respostas do Pippo com dados de verdade da internet, sem chave e sem custo:
 * - Clima: previsão do CPTEC/INPE via BrasilAPI (gratuita, sem chave, CORS aberto).
 * - Dólar: cotação comercial via AwesomeAPI (gratuita, sem chave, CORS aberto).
 * A Open-Meteo ficou de fora de propósito: o plano grátis dela proíbe uso
 * comercial, e a nommi tem assinatura. Toda resposta termina com fonte e hora.
 * Se a internet falhar, o Pippo avisa e continua o papo.
 */

export type PerguntaDeDados = { tipo: "clima"; cidade: string } | { tipo: "dolar" };

const GATILHOS_CLIMA = [
  "clima",
  "previsao",
  "chuva",
  "chover",
  "chovendo",
  "temperatura",
  "graus",
  "nublado",
  "ensolarado",
  "guarda-chuva",
  "guarda chuva",
];
const GATILHOS_DOLAR = ["dolar", "dolares", "cotacao", "cambio"];

function limpa(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cidade pedida depois de "em/no/na/de" — ou Belo Horizonte, a casa da nommi. */
function cidadeDaPergunta(t: string): string {
  const m = t.match(/ (?:em|no|na|de|da|do) ([a-z ]{2,40}) /);
  if (!m) return "Belo Horizonte";
  const cidade = (m[1] ?? "")
    .replace(/ (hoje|agora|amanha|semana|tarde|noite|amanhã)$/, "")
    .trim();
  return cidade.length >= 2 ? cidade : "Belo Horizonte";
}

/** Detecta pergunta de clima ou de dólar no texto livre. */
export function perguntaDeDados(texto: string): PerguntaDeDados | null {
  const t = " " + limpa(texto) + " ";
  if (t.trim().length < 2) return null;
  if (GATILHOS_DOLAR.some((g) => t.includes(" " + g + " ") || t.includes(" " + g))) {
    return { tipo: "dolar" };
  }
  if (GATILHOS_CLIMA.some((g) => t.includes(" " + g + " ") || t.includes(" " + g))) {
    return { tipo: "clima", cidade: cidadeDaPergunta(t) };
  }
  return null;
}

function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function rotuloDia(iso: string, hojeISO: string): string {
  if (iso === hojeISO) return "Hoje";
  const amanha = new Date(hojeISO + "T12:00:00");
  amanha.setDate(amanha.getDate() + 1);
  if (iso === amanha.toISOString().slice(0, 10)) return "Amanhã";
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
}

type CidadeCPTEC = { nome: string; id: number; estado: string };
type PrevisaoCPTEC = {
  cidade: string;
  estado: string;
  atualizado_em: string;
  clima: { data: string; condicao_desc: string; min: number; max: number }[];
};

/** Previsão dos próximos dias para a cidade, com fonte e data da atualização. */
export async function climaAgora(cidade: string): Promise<string[]> {
  try {
    const r = await fetch(
      `https://brasilapi.com.br/api/cptec/v1/cidade/${encodeURIComponent(cidade)}`,
    );
    if (!r.ok) throw new Error("cidade");
    const cidades = (await r.json()) as CidadeCPTEC[];
    if (!Array.isArray(cidades) || !cidades.length) {
      return [
        `Não achei ${cidade} no mapa do CPTEC. Tenta uma cidade maior pertinho daí?`,
      ];
    }
    const alvo = cidades[0] as CidadeCPTEC;
    const pr = await fetch(
      `https://brasilapi.com.br/api/cptec/v1/clima/previsao/${alvo.id}`,
    );
    if (!pr.ok) throw new Error("previsao");
    const prev = (await pr.json()) as PrevisaoCPTEC;
    const hojeISO = new Date().toLocaleDateString("en-CA");
    const dias = prev.clima.slice(0, 2).map(
      (d) => `${rotuloDia(d.data, hojeISO)}: ${d.condicao_desc.toLowerCase()}, de ${d.min}° a ${d.max}°.`,
    );
    return [
      `Olhei o céu de ${prev.cidade} (${prev.estado}) para você:`,
      ...dias,
      `Fonte: CPTEC/INPE, via BrasilAPI, atualizado em ${dataBR(prev.atualizado_em)}.`,
    ];
  } catch {
    return ["Tentei olhar o céu agora e a internet tropeçou. Pergunta de novo daqui a pouquinho?"];
  }
}

/** Cotação comercial do dólar agora, com fonte e hora. */
export async function dolarAgora(): Promise<string[]> {
  try {
    const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    if (!r.ok) throw new Error("dolar");
    const d = (await r.json()) as {
      USDBRL: { bid: string; pctChange: string; create_date: string };
    };
    const q = d.USDBRL;
    const valor = Number(q.bid).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const pct = Math.abs(Number(q.pctChange)).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    });
    const sentido = Number(q.pctChange) >= 0 ? `alta de ${pct}%` : `queda de ${pct}%`;
    const [data = "", hora = ""] = q.create_date.split(" ");
    return [
      `O dólar está em ${valor}, em ${sentido} hoje.`,
      `Fonte: AwesomeAPI (cotação comercial), às ${hora?.slice(0, 5)} de ${dataBR(data)}.`,
    ];
  } catch {
    return ["A cotação não abriu aqui agora. Pergunta de novo daqui a pouquinho?"];
  }
}
