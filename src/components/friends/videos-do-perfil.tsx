import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SEGUNDOS_DE_APRESENTACAO,
  apagarMeuVideo,
  conviteDoVideo,
  enderecoDoVideo,
  enviarVideo,
  salvarMeuVideo,
  useVideosDaPagina,
} from "@/lib/video-perfil";
import { Icon } from "./art";
import { GravarVideo } from "./gravar-video";
import { useFriends } from "./store";

/** O vídeo da própria pessoa: quem ela é e que amizade procura. */
export function MeuVideo({
  me,
  path,
  souDono,
  nome,
  onMudou,
}: {
  me: string;
  path: string;
  souDono: boolean;
  nome: string;
  onMudou: () => void;
}) {
  const { notify } = useFriends();
  const [url, setUrl] = useState("");
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    void enderecoDoVideo(path).then(setUrl);
  }, [path]);

  return (
    <section className="videos-perfil">
      <div className="section-heading">
        <h2>{souDono ? "Meu vídeo" : `${nome.split(" ")[0]} em 30 segundos`}</h2>
        {souDono && (
          <Button variant="ghost" size="sm" onClick={() => setGravando(true)}>
            <Icon name="image" />
            {path ? "Regravar" : "Gravar"}
          </Button>
        )}
      </div>

      {path && url ? (
        <div className="video-cartao">
          <video src={url} controls playsInline preload="metadata" />
          {souDono && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await apagarMeuVideo(me, path);
                notify(ok ? "Vídeo tirado da sua página." : "Não deu para tirar agora.");
                if (ok) onMudou();
              }}
            >
              Tirar da página
            </Button>
          )}
        </div>
      ) : (
        <p className="small-note">{conviteDoVideo(souDono, nome)}</p>
      )}

      {gravando && (
        <GravarVideo
          titulo="Seu vídeo de apresentação"
          dica="Diga seu nome, o que você gosta de fazer e que tipo de amizade você procura."
          segundos={SEGUNDOS_DE_APRESENTACAO}
          onFechar={() => setGravando(false)}
          onPronto={async (blob, ext) => {
            const envio = await enviarVideo(me, blob, ext);
            if (!envio.ok) {
              notify(envio.erro);
              return;
            }
            const ok = await salvarMeuVideo(me, envio.path);
            notify(ok ? "Vídeo no ar na sua página." : "Não deu para salvar agora.");
            if (ok) {
              setGravando(false);
              onMudou();
            }
          }}
        />
      )}
    </section>
  );
}

/** Os vídeos dos amigos falando da pessoa. Entra na página só com a licença do dono. */
export function VideosDeAmigos({
  me,
  dono,
  nome,
  souAmiga,
}: {
  me: string;
  dono: string;
  nome: string;
  souAmiga: boolean;
}) {
  const { notify } = useFriends();
  const souDono = me === dono;
  const { noAr, esperando, ready, gravarSobre, decidir, tirar } = useVideosDaPagina(dono, souDono);
  const [gravando, setGravando] = useState(false);
  const primeiro = nome.split(" ")[0];

  if (!ready) return null;

  return (
    <section className="videos-perfil">
      <div className="section-heading">
        <h2>{souDono ? "Amigos falando de você" : `Amigos falando de ${primeiro}`}</h2>
        {souAmiga && !souDono && (
          <Button variant="ghost" size="sm" onClick={() => setGravando(true)}>
            <Icon name="plus" />
            Gravar
          </Button>
        )}
      </div>

      {noAr.length === 0 && esperando.length === 0 ? (
        <p className="small-note">
          {souDono
            ? "Ninguém gravou sobre você ainda. Peça para uma amiga: é o que mais convence quem chega aqui."
            : `Ninguém gravou sobre ${primeiro} ainda.`}
        </p>
      ) : (
        <div className="videos-fila">
          {noAr.map((v) => (
            <figure className="video-cartao" key={v.id}>
              <video src={v.url} controls playsInline preload="metadata" />
              <figcaption>{v.quem}</figcaption>
              {(souDono || v.de === me) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () =>
                    notify((await tirar(v)) ? "Vídeo tirado." : "Não deu para tirar agora.")
                  }
                >
                  Tirar
                </Button>
              )}
            </figure>
          ))}
        </div>
      )}

      {souDono && esperando.length > 0 && (
        <div className="videos-esperando">
          <h3>Esperando sua licença</h3>
          {esperando.map((v) => (
            <figure className="video-cartao" key={v.id}>
              <video src={v.url} controls playsInline preload="metadata" />
              <figcaption>{v.quem} gravou sobre você</figcaption>
              <div className="video-acoes">
                <Button
                  size="sm"
                  onClick={async () =>
                    notify((await decidir(v.id, true)) ? "Está na sua página." : "Não deu agora.")
                  }
                >
                  <Icon name="check" />
                  Deixar na página
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () =>
                    notify((await decidir(v.id, false)) ? "Recusado." : "Não deu agora.")
                  }
                >
                  Agora não
                </Button>
              </div>
            </figure>
          ))}
          <p className="small-note">
            Ninguém põe vídeo na sua página sem você deixar. Nem quem gravou.
          </p>
        </div>
      )}

      {gravando && (
        <GravarVideo
          titulo={`Falar sobre ${primeiro}`}
          dica={`Conte como ${primeiro} é e por que vale a pena conhecer. ${primeiro} vê antes de entrar na página.`}
          segundos={SEGUNDOS_DE_APRESENTACAO}
          onFechar={() => setGravando(false)}
          onPronto={async (blob, ext) => {
            const r = await gravarSobre(me, blob, ext);
            notify(r.ok ? `Enviado. ${primeiro} decide se entra na página.` : r.erro);
            if (r.ok) setGravando(false);
          }}
        />
      )}
    </section>
  );
}
