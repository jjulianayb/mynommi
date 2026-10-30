/**
 * Um endereço só para a nommi.
 *
 * O login do Google guarda uma chave no navegador antes de sair e confere essa
 * chave quando volta. Navegador guarda por endereço: `www.nommibr.com.br` e
 * `nommibr.com.br` são dois lugares diferentes para ele. Quem começa num e
 * volta no outro perde a chave, e o retorno falha com "Missing state
 * parameter" numa tela que a pessoa não entende.
 *
 * Por isso a nommi fica num endereço só. Quem chegar pelo `www` é mandado para
 * o endereço sem `www` antes de qualquer coisa acontecer.
 */

/** O endereço para onde mandar, ou null quando já está no lugar certo. */
export function enderecoCanonico(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  // Endereço de desenvolvimento e de prévia ficam como estão.
  if (!u.hostname.startsWith("www.")) return null;
  const semWww = u.hostname.slice(4);
  // Só mexe quando sobra um domínio de verdade, nunca em "www.localhost".
  if (!semWww.includes(".")) return null;
  u.hostname = semWww;
  return u.toString();
}

/** Chamado uma vez, bem no começo, antes de qualquer login. */
export function irParaOEnderecoCerto(): void {
  if (typeof window === "undefined") return;
  const destino = enderecoCanonico(window.location.href);
  if (destino) window.location.replace(destino);
}
