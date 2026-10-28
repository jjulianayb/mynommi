import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  limitarZoom,
  escalaQueCobre,
  pedacoDaFoto,
  prenderNaMoldura,
} from "@/lib/foto";
import { Icon } from "./art";
import { Sheet } from "./surfaces";

const QUADRO = 272;

/**
 * Escolher foto e ver na hora. Nada de esperar o envio para descobrir se deu certo:
 * a foto aparece no mesmo toque, a pessoa enquadra, e o envio acontece depois.
 */
export function FotoInstantanea({
  rotulo = "Trocar foto",
  onPronta,
}: {
  rotulo?: string;
  /** Recebe o JPEG já recortado. Quem chama decide o que fazer com ele. */
  onPronta: (jpeg: string) => void | Promise<void>;
}) {
  const [bruta, setBruta] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [desl, setDesl] = useState({ x: 0, y: 0 });
  const [erro, setErro] = useState("");
  const [cortando, setCortando] = useState(false);
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      if (bruta) URL.revokeObjectURL(bruta.url);
    },
    [bruta],
  );

  function escolher(file: File) {
    setErro("");
    if (!file.type.startsWith("image/")) {
      setErro("Esse arquivo não é uma foto.");
      return;
    }
    // A foto aparece na hora: o navegador já tem o arquivo, não precisa de servidor.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBruta({ url, img });
      setZoom(1);
      setDesl({ x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setErro("Não consegui abrir essa foto. Tente outra, ou tire uma agora.");
    };
    img.src = url;
  }

  async function usar() {
    if (!bruta) return;
    setCortando(true);
    const { naturalWidth: w, naturalHeight: h } = bruta.img;
    const { sx, sy, s } = pedacoDaFoto(w, h, QUADRO, zoom, desl);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCortando(false);
      setErro("Seu navegador não conseguiu recortar a foto.");
      return;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(bruta.img, sx, sy, s, s, 0, 0, 512, 512);
    const jpeg = canvas.toDataURL("image/jpeg", 0.85);
    setCortando(false);
    URL.revokeObjectURL(bruta.url);
    setBruta(null);
    await onPronta(jpeg);
  }

  const e = bruta
    ? escalaQueCobre(bruta.img.naturalWidth, bruta.img.naturalHeight, QUADRO) * zoom
    : 1;

  return (
    <>
      <label className="photo-label">
        {rotulo}
        <input
          type="file"
          accept="image/*"
          aria-label={rotulo}
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = "";
            if (f) escolher(f);
          }}
        />
      </label>
      {erro && !bruta && <p className="form-error">{erro}</p>}

      {bruta && (
        <Sheet title="Enquadre sua foto" onClose={() => setBruta(null)}>
          <p className="small-note">Arraste para escolher o pedaço. Use a barra para aproximar.</p>

          <div
            className="corte"
            style={{ width: QUADRO, height: QUADRO }}
            onPointerDown={(ev) => {
              arrasto.current = { x: ev.clientX, y: ev.clientY };
              ev.currentTarget.setPointerCapture(ev.pointerId);
            }}
            onPointerMove={(ev) => {
              const a = arrasto.current;
              if (!a || !bruta) return;
              setDesl((d) =>
                prenderNaMoldura(
                  { x: d.x + (ev.clientX - a.x), y: d.y + (ev.clientY - a.y) },
                  bruta.img.naturalWidth,
                  bruta.img.naturalHeight,
                  QUADRO,
                  zoom,
                ),
              );
              arrasto.current = { x: ev.clientX, y: ev.clientY };
            }}
            onPointerUp={() => {
              arrasto.current = null;
            }}
            onPointerCancel={() => {
              arrasto.current = null;
            }}
          >
            <img
              src={bruta.url}
              alt=""
              draggable={false}
              style={{
                width: bruta.img.naturalWidth * e,
                height: bruta.img.naturalHeight * e,
                transform: `translate(calc(-50% + ${desl.x}px), calc(-50% + ${desl.y}px))`,
              }}
            />
          </div>

          <label className="corte-zoom">
            <Icon name="image" />
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              aria-label="Aproximar a foto"
              onChange={(ev) => {
                const z = limitarZoom(Number(ev.target.value));
                setZoom(z);
                if (bruta)
                  setDesl((d) =>
                    prenderNaMoldura(d, bruta.img.naturalWidth, bruta.img.naturalHeight, QUADRO, z),
                  );
              }}
            />
          </label>

          {erro && <p className="form-error">{erro}</p>}
          <div className="corte-acoes">
            <Button type="button" variant="ghost" onClick={() => setBruta(null)}>
              Escolher outra
            </Button>
            <Button type="button" disabled={cortando} onClick={() => void usar()}>
              {cortando ? "Um instante…" : "Usar esta foto"}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
