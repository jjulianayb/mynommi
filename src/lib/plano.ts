/**
 * O que muda entre Grátis e Pro, em números e frases, num lugar só.
 * O banco (migração 0049) é quem decide; aqui a tela fala a mesma língua.
 * Mudou número aqui? Muda lá, e vice-versa.
 */

/** Perfis que o Descobrir entrega por dia. */
export const PERFIS_GRATIS_POR_DIA = 3;
export const PERFIS_PRO_POR_DIA = 9;

/** Amizades que o plano grátis fecha pelo match. No Pro não tem teto. */
export const MATCHES_GRATIS = 3;

/** Tribos que uma pessoa com Pro pode criar. No grátis, nenhuma. */
export const TRIBOS_PRO = 3;

/** Validade dos Pippins de presente (boas-vindas e convite). Comprado não vence. */
export const DIAS_DE_PIPPIN = 90;

/** O que dizer quando o baralho do dia acaba. */
export function fraseTetoDePerfis(pro: boolean): string {
  return pro
    ? `São ${PERFIS_PRO_POR_DIA} apresentações por dia, e você aproveitou todas. Amanhã a nommi volta com gente nova.`
    : `São ${PERFIS_GRATIS_POR_DIA} apresentações por dia no plano grátis. Amanhã vem gente nova — e no Pro são ${PERFIS_PRO_POR_DIA} por dia.`;
}

/** O que dizer quando o plano grátis não fecha mais match. */
export function fraseTetoDeMatch(): string {
  return `O plano grátis fecha até ${MATCHES_GRATIS} amizades pelo match. No Pro, não tem limite.`;
}

/** O que dizer quando a cota de tribos do Pro enche. */
export function fraseTetoDeTribos(): string {
  return `O Pro deixa você criar até ${TRIBOS_PRO} tribos suas.`;
}

/** Aviso da carteira sobre validade dos Pippins de presente. */
export function fraseValidadePippins(aVencer: number, venceEm: Date | null): string {
  if (!aVencer || !venceEm) return `Pippins de presente valem ${DIAS_DE_PIPPIN} dias. Pippin comprado não vence.`;
  const dia = venceEm.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return aVencer === 1
    ? `1 Pippin vence em ${dia}. Pippin comprado não vence.`
    : `${aVencer} Pippins vencem a partir de ${dia}. Pippin comprado não vence.`;
}
