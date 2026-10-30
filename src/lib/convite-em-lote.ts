/**
 * Convidar em lote.
 *
 * Chegar às primeiras cem pessoas é problema de distribuição, não de produto.
 * Hoje convidar é: abrir a tela, copiar o link, abrir o WhatsApp, escolher a
 * pessoa, colar, voltar, repetir. Ninguém faz isso cinquenta vezes.
 *
 * Aqui o link já leva a pessoa para dentro da tribo certa, o texto já vem
 * pronto e com o nome de quem convida, e o WhatsApp abre com tudo preenchido.
 * Tudo o que o navegador permite sem pedir sua agenda de contatos — e a nommi
 * não pede, nunca.
 */

export const MAX_CONVITES_POR_VEZ = 50;

/** O link que cai dentro da tribo, e não só na porta do app. */
export function linkParaTribo(origem: string, codigo: string, teiaId?: number | string): string {
  const base = String(origem ?? "").replace(/\/+$/, "");
  const alvo = teiaId ? `&tribo=${encodeURIComponent(String(teiaId))}` : "";
  return `${base}/conta?modo=criar&convite=${encodeURIComponent(codigo)}${alvo}`;
}

/**
 * O texto do convite. Quem convida aparece pelo nome: convite de gente
 * conhecida é o que faz alguém instalar um app novo.
 */
export function textoParaTribo(
  quem: string,
  link: string,
  tribo?: string,
  faltam?: number,
): string {
  const nome = String(quem ?? "").trim() || "Uma amiga";
  if (tribo && faltam && faltam > 0)
    return (
      `${nome} te chamou para a tribo ${tribo} na nommi. ` +
      `Faltam ${faltam} ${faltam === 1 ? "pessoa" : "pessoas"} para a tribo abrir. Vem? ${link}`
    );
  if (tribo) return `${nome} te chamou para a tribo ${tribo} na nommi. Vem? ${link}`;
  return (
    `${nome} te chamou para a nommi, um app para fazer amizade de verdade: ` +
    `você entra numa tribo por interesse e conversa com gente que gosta do mesmo que você. ${link}`
  );
}

/** O endereço que abre o WhatsApp já com o texto escrito. */
export function enderecoDoWhatsApp(texto: string, telefone?: string): string {
  const t = encodeURIComponent(String(texto ?? ""));
  const numero = soNumeros(telefone ?? "");
  return numero ? `https://wa.me/${numero}?text=${t}` : `https://wa.me/?text=${t}`;
}

/** Telefone vira só dígitos; o resto é enfeite que quebra o link. */
export function soNumeros(bruto: string): string {
  const d = String(bruto ?? "").replace(/\D/g, "");
  if (!d) return "";
  // Número brasileiro escrito sem o país ganha o 55 na frente.
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
}

/** Quantos convites ainda cabem nesta rodada. */
export const quantosFaltam = (jaMandados: number) =>
  Math.max(0, MAX_CONVITES_POR_VEZ - Math.max(0, Math.floor(jaMandados)));

/** O recado do contador, para a pessoa ver que está andando. */
export function recadoDoLote(mandados: number, meta = MAX_CONVITES_POR_VEZ): string {
  const m = Math.max(0, Math.floor(mandados));
  if (m === 0) return `Mande até ${meta} convites de uma vez.`;
  if (m >= meta) return "Rodada completa. Recomece quando quiser.";
  return `${m} ${m === 1 ? "convite mandado" : "convites mandados"}. Faltam ${meta - m}.`;
}
