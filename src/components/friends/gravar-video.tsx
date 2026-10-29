import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { contagemDaGravacao, extensaoDoVideo, formatoDeGravacao } from "@/lib/camera";
import { Icon } from "./art";
import { Sheet } from "./surfaces";

/** Gravar um vídeo curto, na câmera do app. O formato é o que o navegador toca. */
export function GravarVideo({
  titulo,
  dica,
  segundos,
  onPronto,
  onFechar,
}: {
  titulo: string;
  dica: string;
  segundos: number;
  onPronto: (arquivo: Blob, ext: string) => Promise<void> | void;
  onFechar: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState(false);
  const [contagem, setContagem] = useState("0:00");
  const [feito, setFeito] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const desligar = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 } },
          audio: true,
        });
        if (!vivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
      } catch {
        setErro("Libere a câmera e o microfone para a nommi e tente de novo.");
      }
    })();
    return () => {
      vivo = false;
      if (relogio.current) clearInterval(relogio.current);
      desligar();
    };
  }, [desligar]);

  function parar() {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  function comecar() {
    const s = stream.current;
    const tipo = formatoDeGravacao();
    if (!s || !tipo) {
      setErro("Seu navegador não grava vídeo. Dá para escrever no perfil normalmente.");
      return;
    }
    const pedacos: Blob[] = [];
    const rec = new MediaRecorder(s, { mimeType: tipo });
    gravador.current = rec;
    rec.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
    rec.onstop = () => {
      if (relogio.current) clearInterval(relogio.current);
      setGravando(false);
      desligar();
      const blob = new Blob(pedacos, { type: tipo });
      setFeito({ url: URL.createObjectURL(blob), blob, ext: extensaoDoVideo(tipo) });
    };
    const inicio = Date.now();
    rec.start();
    setGravando(true);
    relogio.current = setInterval(() => {
      const { texto, acabou } = contagemDaGravacao(Date.now() - inicio, segundos);
      setContagem(texto);
      if (acabou) parar();
    }, 250);
  }

  return (
    <Sheet title={titulo} onClose={onFechar}>
      {erro && <p className="form-error">{erro}</p>}
      <p className="small-note">{dica}</p>

      <div className="camera-palco">
        {feito ? (
          <video src={feito.url} className="camera-previa" controls playsInline />
        ) : (
          <video ref={video} className="camera-previa" playsInline muted autoPlay />
        )}
        {gravando && (
          <span className="camera-gravando">
            ● {contagem} / 0:{segundos}
          </span>
        )}
      </div>

      {feito ? (
        <div className="camera-acoes-finais">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              URL.revokeObjectURL(feito.url);
              setFeito(null);
              window.location.reload();
            }}
          >
            Gravar de novo
          </Button>
          <Button
            type="button"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              await onPronto(feito.blob, feito.ext);
              setEnviando(false);
            }}
          >
            {enviando ? "Enviando…" : "Usar este vídeo"}
          </Button>
        </div>
      ) : (
        <div className="camera-acoes">
          <button
            type="button"
            className={"camera-disparo" + (gravando ? " gravando" : "")}
            aria-label={gravando ? "Parar de gravar" : "Começar a gravar"}
            onClick={() => (gravando ? parar() : comecar())}
          />
        </div>
      )}
      <p className="small-note">Até {segundos} segundos. Você vê antes de publicar.</p>
    </Sheet>
  );
}
