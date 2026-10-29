/**
 * Recuperar a senha.
 *
 * Duas telas no mesmo endereço: pedir o link, e escolher a senha nova depois
 * de clicar nele. Quem decide qual delas aparece é o próprio endereço, porque
 * é nele que o link de recuperação deixa a marca.
 */

/** O link de recuperação volta com type=recovery no endereço. */
export function modoDaRecuperacao(hash: string, busca = ""): "pedir" | "escolher" {
  const texto = (hash || "") + "&" + (busca || "");
  return /type=recovery/.test(texto) ? "escolher" : "pedir";
}

/**
 * O recado é o mesmo com e-mail cadastrado ou não.
 * Dizer "esse e-mail não existe" entrega ao curioso quem tem conta na nommi.
 */
export const RECADO_DO_PEDIDO =
  "Se esse e-mail tiver conta na nommi, o link de recuperação chega em instantes. Confira também a caixa de spam.";

/** As duas senhas precisam bater, e a nova precisa ser decente. */
export function confereSenhaNova(senha: string, repetida: string): string | null {
  if (senha.length < 8) return "A senha precisa de pelo menos 8 caracteres.";
  if (!/[a-z]/.test(senha) || !/[A-Z]/.test(senha))
    return "Use pelo menos uma letra maiúscula e uma minúscula.";
  if (!/[0-9]/.test(senha)) return "Use pelo menos um número.";
  if (senha !== repetida) return "As duas senhas não são iguais.";
  return null;
}

/** O que a pessoa lê quando o link já venceu. */
export function recadoDoErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("expired") || m.includes("invalid"))
    return "Esse link venceu. Peça um novo aqui embaixo.";
  if (m.includes("same") || m.includes("different"))
    return "Essa é a senha que você já usava. Escolha outra.";
  if (m.includes("weak") || m.includes("pwned"))
    return "Essa senha é fácil de adivinhar. Escolha outra.";
  if (m.includes("rate") || m.includes("many"))
    return "Muitas tentativas seguidas. Espere alguns minutos.";
  return "Não deu para concluir agora. Tente de novo.";
}
