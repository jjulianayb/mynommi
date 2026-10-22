import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/covers";
import {
  CENTRO,
  moverFoco,
  paraCss,
  salvarEnquadramento,
  type Enquadramento,
} from "@/lib/enquadrar";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";

/**
 * Ajustar o enquadramento: a pessoa arrasta a própria imagem até ficar como ela quer.
 * Vale para a capa e para a foto — é a mesma conta, muda só o formato da moldura.
 */
export function AjustarEnquadramento({
  me,
  alvo,
  imagem,
  valor,
  onSalvo,
  compacto = false,
}: {
  me: string;
  alvo: "capa" | "foto";
  imagem: string;
  valor: Enquadramento;
  onSalvo: () => void;
  compacto?: boolean;
}) {
  const { notify } = useFriends();
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState<Enquadramento>(valor ?? CENTRO);
  const [salvando, setSalvando] = useState(false);
  const arrasto = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const src = imagem.startsWith("http") ? imagem : publicUrl(imagem);

  if (!imagem) return null;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={compacto ? "enquadrar-redondo" : undefined}
        aria-label={alvo === "capa" ? "Ajustar a capa" : "Ajustar a foto"}
        onClick={() => {
          setFoco(valor ?? CENTRO);
          setAberto(true);
        }}
      >
        <Icon name="image" />
        {!compacto && "Ajustar"}
      </Button>

      {aberto && (
        <Sheet
          onClose={() => setAberto(false)}
          title={alvo === "capa" ? "Ajustar a capa" : "Ajustar a foto"}
        >
          <p className="small-note">
            Arraste a imagem até ficar do jeito que você quer. É assim que as outras pessoas vão
            ver.
          </p>

          <div
            className={"enquadrar-moldura " + (alvo === "capa" ? "capa" : "foto")}
            style={{ backgroundImage: `url(${src})`, backgroundPosition: paraCss(foco) }}
            onPointerDown={(e) => {
              arrasto.current = {
                x: e.clientX,
                y: e.clientY,
                w: e.currentTarget.clientWidth,
                h: e.currentTarget.clientHeight,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const a = arrasto.current;
              if (!a) return;
              setFoco((f) => moverFoco(f, e.clientX - a.x, e.clientY - a.y, a.w, a.h));
              arrasto.current = { ...a, x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => {
              arrasto.current = null;
            }}
            onPointerCancel={() => {
              arrasto.current = null;
            }}
            role="img"
            aria-label={alvo === "capa" ? "Prévia da capa" : "Prévia da foto"}
          >
            <span className="enquadrar-dica">
              <Icon name="arrow" />
              arraste
            </span>
          </div>

          <div className="enquadrar-acoes">
            <Button type="button" variant="ghost" onClick={() => setFoco(CENTRO)}>
              Centralizar
            </Button>
            <Button
              type="button"
              disabled={salvando}
              onClick={async () => {
                setSalvando(true);
                const ok = await salvarEnquadramento(me, alvo, foco);
                setSalvando(false);
                notify(ok ? "Pronto, ficou assim." : "Não deu para salvar agora.");
                if (ok) {
                  setAberto(false);
                  onSalvo();
                }
              }}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
