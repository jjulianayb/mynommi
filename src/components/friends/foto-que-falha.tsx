import { useEffect, useState } from "react";
import { RECADO_DA_MIDIA, RECADO_DO_VIDEO, TENTATIVAS } from "@/lib/midia-que-vence";

/**
 * Imagem que sabe falhar.
 *
 * Até 02/11 **não existia um único tratamento de erro de imagem em todo o
 * app**. Quando uma foto não vinha — endereço vencido, arquivo apagado,
 * celular sem rede — a pessoa via o ícone de imagem quebrada do navegador.
 * Aquilo não diz nada, não oferece saída, e passa a impressão de app
 * defeituoso.
 *
 * Aqui a imagem tenta de novo **uma vez**, com um parâmetro diferente no
 * endereço para o navegador não devolver o erro do cache. Se falhar outra vez,
 * não é prazo vencido: é arquivo que sumiu ou aparelho sem internet, e aí
 * insistir só gasta bateria e dados de quem já está sem rede. Nesse caso
 * aparece uma moldura com um recado curto, no lugar do ícone quebrado.
 */
export function FotoQueFalha({
  src,
  alt,
  className,
  style,
  onDesistiu,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Avisa quem está por fora, para a tela poder recarregar a lista inteira. */
  onDesistiu?: () => void;
}) {
  const [tentativas, setTentativas] = useState(0);
  const [desistiu, setDesistiu] = useState(false);

  // Endereço novo = tentativa zerada. Sem isto, trocar a foto de uma pessoa
  // por outra herdaria o estado de falha da anterior.
  useEffect(() => {
    setTentativas(0);
    setDesistiu(false);
  }, [src]);

  if (desistiu || !src)
    return (
      <span className={"midia-falhou " + (className ?? "")} style={style} role="img" aria-label={alt}>
        <small>{RECADO_DA_MIDIA}</small>
      </span>
    );

  return (
    <img
      src={tentativas > 0 ? separador(src) + "tentativa=" + tentativas : src}
      alt={alt}
      className={className ?? ""}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (tentativas < TENTATIVAS) {
          setTentativas((n) => n + 1);
          return;
        }
        setDesistiu(true);
        onDesistiu?.();
      }}
    />
  );
}

/**
 * Vídeo que sabe falhar, pelo mesmo motivo.
 * Vídeo não tenta de novo sozinho: recarregar vídeo em celular com dados
 * limitados é caro, e o toque de "tentar" tem que ser da pessoa.
 */
export function VideoQueFalha({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [src]);

  if (falhou || !src)
    return (
      <span className={"midia-falhou " + (className ?? "")}>
        <small>{RECADO_DO_VIDEO}</small>
      </span>
    );

  return (
    <video
      src={src}
      className={className ?? ""}
      poster={poster ?? ""}
      controls
      playsInline
      preload="metadata"
      onError={() => setFalhou(true)}
    />
  );
}

/** `?` ou `&`, conforme o endereço assinado já tenha parâmetros (e tem). */
function separador(url: string): string {
  return url.includes("?") ? url + "&" : url + "?";
}
