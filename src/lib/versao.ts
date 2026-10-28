import { useEffect, useState } from "react";

/**
 * O app é uma página só. Quem adicionou a nommi na tela de início fica com ela
 * aberta por dias, rodando o código antigo — foi o que aconteceu com a Ana:
 * testou uma correção que já estava no ar e viu a tela velha.
 * Aqui a gente pergunta de vez em quando se mudou, e avisa.
 */

/** Carimbo gerado no build. Muda a cada publicação. */
export const MINHA_VERSAO: string = typeof __NOMMI_VERSAO__ === "string" ? __NOMMI_VERSAO__ : "dev";

export const ENDERECO_DA_VERSAO = "/versao.json";
export const DE_QUANTO_EM_QUANTO = 10 * 60 * 1000;

/** Só é versão nova se veio um carimbo, é diferente, e nenhum dos dois é dev. */
export function temVersaoNova(minha: string, doServidor: unknown): boolean {
  if (typeof doServidor !== "string" || !doServidor) return false;
  if (minha === "dev" || doServidor === "dev") return false;
  return minha !== doServidor;
}

export async function versaoDoServidor(buscar = fetch): Promise<string | null> {
  try {
    const r = await buscar(`${ENDERECO_DA_VERSAO}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    const dados: unknown = await r.json();
    const v = (dados as { versao?: unknown } | null)?.versao;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

/** Avisa quando há versão nova. Pergunta ao abrir, ao voltar para o app e de tempos em tempos. */
export function useVersaoNova(): boolean {
  const [nova, setNova] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let vivo = true;
    const conferir = async () => {
      if (!vivo || document.visibilityState === "hidden") return;
      const v = await versaoDoServidor();
      if (vivo && temVersaoNova(MINHA_VERSAO, v)) setNova(true);
    };
    void conferir();
    const relogio = setInterval(() => void conferir(), DE_QUANTO_EM_QUANTO);
    const aoVoltar = () => void conferir();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, []);

  return nova;
}

declare const __NOMMI_VERSAO__: string | undefined;
