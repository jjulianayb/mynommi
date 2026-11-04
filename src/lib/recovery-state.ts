// Guarda apenas o tipo do retorno, nunca os tokens. O cliente de autenticação
// pode limpar o fragmento antes de a tela de recuperação montar.
let recoveryReturn = false;
export function captureRecoveryReturn() {
  if (typeof window === "undefined") return;
  recoveryReturn ||= new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
}
export function hasRecoveryReturn() {
  return recoveryReturn;
}
