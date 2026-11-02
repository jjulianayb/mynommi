/**
 * Endereço de mídia que vence, e o que fazer quando vence.
 *
 * As fotos dos posts, os stories e o vídeo do perfil ficam num armazenamento
 * fechado. Para mostrar, o app pede um endereço temporário assinado. Esse
 * endereço **vence**.
 *
 * O bug (auditoria de 02/11): o prazo era de 1 hora, e a nommi é uma página só
 * que fica aberta por dias — quem põe na tela de início não fecha nunca. Nada
 * recarregava esses endereços quando a pessoa voltava ao app, e **não existia
 * um único tratamento de erro de imagem em todo o app**. Então: abria de
 * manhã, as fotos apareciam; voltava à tarde, e aparecia o ícone de imagem
 * quebrada do navegador. A pessoa conclui que o app está quebrado, e está
 * certa.
 *
 * Explica também por que ninguém conseguia reproduzir: quem testa acabou de
 * abrir o app, e dentro da primeira hora está tudo bem.
 *
 * Três coisas resolvem, e as três são necessárias:
 *   1. **prazo maior** — de 1 hora para 8, que cobre o dia de uso;
 *   2. **recarregar ao voltar** — quando o app volta para a frente depois de
 *      um tempo, os endereços são pedidos de novo;
 *   3. **tratar o erro** — se mesmo assim uma imagem falhar, tentar de novo
 *      uma vez com endereço novo, e só então mostrar algo digno.
 *
 * Só o prazo maior não resolve: um aparelho que fica com o app aberto o fim de
 * semana inteiro passa de qualquer prazo. E só recarregar não resolve: a
 * primeira falha acontece antes de a pessoa voltar.
 */

/**
 * Quanto tempo o endereço assinado vale.
 *
 * Oito horas cobre um dia de uso sem obrigar o app a pedir endereço novo a
 * toda hora. Não é "para sempre" de propósito: endereço assinado que não vence
 * é endereço público com passos extras, e o armazenamento é fechado por um
 * motivo — foto de post e story são de quem pode ver, não de quem tem o link.
 */
export const VALIDADE_DA_MIDIA = 8 * 60 * 60;

/**
 * A partir de quando vale a pena pedir endereço novo ao voltar para o app.
 *
 * Recarregar a cada troca de aba seria desperdício puro; esperar até vencer
 * deixa a pessoa ver a imagem quebrada primeiro. Metade do prazo é o meio
 * termo: renova cedo o bastante para nunca vencer na mão dela.
 */
export const RENOVA_DEPOIS_DE_MS = (VALIDADE_DA_MIDIA / 2) * 1000;

export function precisaRenovar(pedidoEm: number | null, agora = Date.now()): boolean {
  if (pedidoEm === null) return true;
  return agora - pedidoEm >= RENOVA_DEPOIS_DE_MS;
}

/**
 * Quantas vezes tentar de novo quando uma imagem falha.
 *
 * Uma só. Duas falhas seguidas com endereço novo não é prazo vencido, é
 * arquivo que não existe mais ou aparelho sem internet — e insistir aí só
 * gasta bateria e dados de quem já está sem rede.
 */
export const TENTATIVAS = 1;

/**
 * O que a pessoa vê quando a imagem não vem mesmo.
 *
 * Nunca o ícone de imagem quebrada do navegador, que é o que ela via antes:
 * aquilo não diz nada e parece defeito do app. Isto diz o que houve e o que
 * fazer, em uma linha.
 */
export const RECADO_DA_MIDIA = "Esta foto não carregou. Puxe a tela para baixo para tentar de novo.";
export const RECADO_DO_VIDEO = "Este vídeo não carregou. Puxe a tela para baixo para tentar de novo.";

/**
 * Avisa quando o app volta para a frente depois de um tempo parado.
 *
 * Só `focus` não basta: no celular, trocar de app dispara `visibilitychange`,
 * e voltar para a aba dispara `focus`. Os dois precisam estar ligados, e a
 * função devolve o desligamento — ouvinte de janela que ninguém desliga vaza a
 * cada tela montada.
 */
export function aoVoltarParaOApp(quando: () => void): () => void {
  const aoVoltar = () => {
    if (document.visibilityState === "visible") quando();
  };
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("focus", aoVoltar);
  return () => {
    document.removeEventListener("visibilitychange", aoVoltar);
    window.removeEventListener("focus", aoVoltar);
  };
}
