import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FILTRO_PADRAO,
  SEGUNDOS_DE_VIDEO,
  contagemDaGravacao,
  desenharQuadro,
  extensaoDoVideo,
  filtroCss,
  filtrosDoGrupo,
  formatoDeGravacao,
  gruposDeFiltro,
  tamanhoDoStory,
} from "@/lib/camera";
import { MAX_CAPTION, type StoryAudience } from "@/lib/stories";
import { Icon } from "./art";
import { Sheet } from "./surfaces";
import { useFriends } from "./store";

type Publicar = (
  file: File,
  caption: string,
  audience: StoryAudience,
) => Promise<{ ok: boolean; error?: string }>;

/** A câmera do story: abre, filtra ao vivo, tira e publica. */
export function CameraStory({ onClose, onPublish }: { onClose: () => void; onPublish: Publicar }) {
  const { notify } = useFriends();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [frente, setFrente] = useState(true);
  const [filtro, setFiltro] = useState(FILTRO_PADRAO);
  const [foto, setFoto] = useState<{ url: string; file: File } | null>(null);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<StoryAudience>("todos");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [video2, setVideo2] = useState<{ url: string; file: File } | null>(null);
  const [gravando, setGravando] = useState(false);
  const [contagem, setContagem] = useState("0:00");
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);

  const desligar = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const ligar = useCallback(async () => {
    desligar();
    setErro("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: frente ? "user" : "environment", width: { ideal: 1080 } },
        audio: false,
      });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => undefined);
      }
    } catch {
      setErro(
        "Não consegui abrir sua câmera. Libere o acesso à câmera para a nommi nas permissões do navegador e tente de novo.",
      );
    }
  }, [frente, desligar]);

  useEffect(() => {
    if (!foto && !video2) void ligar();
    return desligar;
  }, [ligar, desligar, foto, video2]);

  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto.url);
    },
    [foto],
  );

  function pararVideo() {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  function gravarVideo() {
    const s = stream.current;
    const tipo = formatoDeGravacao();
    if (!s || !tipo) {
      setErro("Seu navegador não grava vídeo. Dá para tirar foto normalmente.");
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
      const file = new File([blob], `story.${extensaoDoVideo(tipo)}`, { type: tipo });
      setVideo2({ url: URL.createObjectURL(blob), file });
    };
    const inicio = Date.now();
    rec.start();
    setGravando(true);
    setContagem("0:00");
    relogio.current = setInterval(() => {
      const { texto, acabou } = contagemDaGravacao(Date.now() - inicio);
      setContagem(texto);
      if (acabou) pararVideo();
    }, 250);
  }

  useEffect(
    () => () => {
      if (relogio.current) clearInterval(relogio.current);
    },
    [],
  );

  async function tirar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const { w, h } = tamanhoDoStory(v.videoWidth, v.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    desenharQuadro(ctx, v, filtro, frente);

    // reduz para o tamanho de publicação
    const saida = document.createElement("canvas");
    saida.width = w;
    saida.height = h;
    saida.getContext("2d")?.drawImage(canvas, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((r) => saida.toBlob(r, "image/jpeg", 0.88));
    if (!blob) {
      setErro("Não consegui guardar a foto. Tente de novo.");
      return;
    }
    const file = new File([blob], "story.jpg", { type: "image/jpeg" });
    desligar();
    setFoto({ url: URL.createObjectURL(blob), file });
  }

  return (
    <Sheet title="Story de agora" onClose={onClose}>
      {erro && <p className="form-error">{erro}</p>}

      <div className="camera-palco">
        {video2 ? (
          <video src={video2.url} className="camera-previa" controls playsInline />
        ) : foto ? (
          <img src={foto.url} alt="Prévia do seu story" className="camera-previa" />
        ) : (
          <video
            ref={video}
            className="camera-previa"
            style={{
              filter: filtroCss(filtro),
              transform: frente ? "scaleX(-1)" : undefined,
            }}
            playsInline
            muted
            autoPlay
          />
        )}
        {gravando && <span className="camera-gravando">● {contagem}</span>}
        {!foto && !video2 && !erro && (
          <button
            type="button"
            className="camera-virar"
            aria-label="Virar a câmera"
            onClick={() => setFrente((v) => !v)}
          >
            <Icon name="clock" />
          </button>
        )}
      </div>

      {!foto && !video2 ? (
        <>
          <div className="filtros">
            {gruposDeFiltro().map((g) => (
              <div className="filtros-grupo" key={g}>
                <h3>{g}</h3>
                <div className="filtros-fila">
                  {filtrosDoGrupo(g).map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      className={"filtro" + (filtro === f.id ? " marcado" : "")}
                      aria-pressed={filtro === f.id}
                      onClick={() => setFiltro(f.id)}
                    >
                      <span style={{ filter: f.css === "none" ? undefined : f.css }} />
                      {f.nome}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="camera-acoes">
            <button
              type="button"
              className="camera-disparo"
              aria-label="Tirar a foto"
              onClick={() => void tirar()}
            />
          </div>
          <p className="small-note">
            Foto ou vídeo de até {SEGUNDOS_DE_VIDEO} segundos. Some em 1 hora — é o agora, não o
            álbum da semana.
          </p>
        </>
      ) : (
        <>
          <label className="field">
            <span>Legenda</span>
            <input
              className="input"
              value={caption}
              maxLength={MAX_CAPTION}
              placeholder="O que está rolando?"
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <div className="settings-tabs">
            <Button
              type="button"
              variant={audience === "todos" ? "default" : "secondary"}
              onClick={() => setAudience("todos")}
            >
              Para quem me segue
            </Button>
            <Button
              type="button"
              variant={audience === "amizades" ? "default" : "secondary"}
              onClick={() => setAudience("amizades")}
            >
              Só amizades
            </Button>
          </div>
          <div className="camera-acoes-finais">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (foto) URL.revokeObjectURL(foto.url);
                if (video2) URL.revokeObjectURL(video2.url);
                setFoto(null);
                setVideo2(null);
              }}
            >
              Tirar outra
            </Button>
            <Button
              type="button"
              disabled={enviando}
              onClick={async () => {
                setEnviando(true);
                const escolhido = video2 ?? foto;
                if (!escolhido) return;
                const r = await onPublish(escolhido.file, caption, audience);
                setEnviando(false);
                if (r.ok) {
                  notify("Story no ar. Some em 1 hora.");
                  onClose();
                } else setErro(r.error ?? "Não deu para publicar agora.");
              }}
            >
              {enviando ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
