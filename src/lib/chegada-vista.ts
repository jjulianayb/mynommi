/**
 * Lembra que a pessoa já passou pelos primeiros passos.
 * Fica no aparelho de propósito: é preferência de tela, não dado da conta.
 */
const chave = (userId: string) => "nommi-chegada-vista-" + userId;

export function chegadaJaVista(userId: string | null): boolean {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(chave(userId)) === "1";
  } catch {
    return false;
  }
}

export function esconderChegada(userId: string, marcar: (v: boolean) => void): void {
  marcar(true);
  try {
    window.localStorage.setItem(chave(userId), "1");
  } catch {
    /* navegador sem armazenamento: some só nesta visita */
  }
}
