import { useRef } from "react";

/**
 * Curtir mensagem com dois toques.
 *
 * Pedido da Ju (04/11): "tem que ter a opção da pessoa curtir, dar like, igual
 * o Instagram, deu dois toques da coração."
 *
 * Por que isto importa mais do que parece: a Tribo do Pippo tinha **41
 * pessoas e zero mensagens**. Escrever numa sala com quarenta pessoas é
 * exposição; **tocar num coração não é.** O curtir é a participação de menor
 * atrito que existe, e é o que faz quem arriscou a primeira mensagem não
 * receber silêncio de volta.
 */

/**
 * Janela entre os dois toques.
 *
 * 320 ms é a média dos sistemas operacionais para toque duplo. Mais curto
 * exige precisão que ninguém tem com o dedo; mais longo faz dois toques
 * separados, em duas mensagens diferentes, virarem um só.
 */
export const DOIS_TOQUES_MS = 320;

export function ehDoisToques(
  ultimoToqueEm: number | null,
  agora: number,
  janela = DOIS_TOQUES_MS,
): boolean {
  if (ultimoToqueEm === null) return false;
  return agora - ultimoToqueEm <= janela;
}

/**
 * Devolve o manipulador de toque que chama `aoDobrar` no segundo toque.
 *
 * O estado fica numa `ref` e não no estado da tela de propósito: o primeiro
 * toque não pode redesenhar nada. Redesenhar a lista de mensagens a cada
 * toque solto seria caro e piscaria a tela sem motivo.
 */
export function useDoisToques(aoDobrar: () => void) {
  const ultimo = useRef<number | null>(null);
  return (e: React.MouseEvent | React.TouchEvent) => {
    const agora = Date.now();
    if (ehDoisToques(ultimo.current, agora)) {
      // Só no segundo toque: sem isto o celular seleciona a palavra embaixo do
      // dedo. No primeiro toque não barramos nada, senão ninguém mais consegue
      // marcar e copiar o texto de uma mensagem.
      e.preventDefault();
      ultimo.current = null;
      aoDobrar();
      return;
    }
    ultimo.current = agora;
  };
}

/**
 * Quantos corações mostrar ao lado da mensagem.
 *
 * Zero não mostra número: "0" ao lado de cada mensagem numa tribo quieta
 * parece placar de fracasso, e é exatamente a sala que a gente está tentando
 * destravar. O botão continua lá, só sem número.
 */
export function rotuloDeCoracoes(quantos: number): string {
  return quantos > 0 ? String(quantos) : "";
}

/** O que o leitor de tela ouve. */
export function recadoDoCoracao(euCurti: boolean, quantos: number): string {
  if (euCurti) return quantos > 1 ? `Você e mais ${quantos - 1} curtiram` : "Você curtiu";
  if (quantos > 0) return quantos === 1 ? "1 pessoa curtiu" : `${quantos} pessoas curtiram`;
  return "Curtir";
}
