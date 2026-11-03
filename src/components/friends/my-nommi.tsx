import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon } from "./art";
import { Esqueleto, EmptyState, Sheet } from "./surfaces";
import { useFriends } from "./store";
import { CoverEditor } from "./cover-editor";
import { StatsLine, Feed, WallPanel } from "./social-feed";
import { MOSTRAR_SECOES_DE_AMIGOS } from "@/lib/flags";
import { MinhasEstrelas } from "./presenca";
import { useEstrelas } from "@/lib/presenca";
import { coverStyle } from "@/lib/covers";
import { paraCss } from "@/lib/enquadrar";
import { estiloDoFundo, fundoEhFoto, tomDoFundo } from "@/lib/fundos";
import { figurinhaDe } from "@/lib/figurinhas";
import { EscolherFundo } from "./escolher-fundo";
import { FotoInstantanea } from "./foto-instantanea";
import { CameraStory } from "./camera-story";
import { useStories } from "@/lib/stories";
import { apagarFotoAntiga, enviarFotoDePerfil } from "@/lib/foto-perfil";
import { saveCloudProfile } from "@/lib/real-profiles";
import { EscolherInteresses } from "./escolher-interesses";
import { Selos } from "./selos";
import { useMeuTitulo } from "@/lib/embaixadora";
import { MeuVideo, VideosDeAmigos } from "./videos-do-perfil";
import { VinculosSheet } from "./vinculos-sheet";
import type { TipoVinculo } from "@/lib/vinculos";
import { AjustarEnquadramento } from "./enquadrar";
import {
  usePaginaPessoal,
  savePagina,
  completeness,
  missingParts,
  cleanPlaces,
  MAX_PLACES,
  MAX_LOOKING,
  type PaginaPessoal,
} from "@/lib/pagina-pessoal";

function Face({
  avatar,
  nome = "",
  size = 108,
  foco,
}: {
  avatar: string;
  nome?: string;
  size?: number;
  foco?: { x: number; y: number };
}) {
  return avatar ? (
    <img
      className="story-face mynommi-foto"
      src={avatar}
      alt=""
      width={size}
      height={size}
      style={foco ? { objectPosition: paraCss(foco) } : undefined}
    />
  ) : (
    <SemFoto nome={nome} size={size} />
  );
}

/** Seção dobrável da página: o título fica sempre visível e o conteúdo abre
    no toque. Começa aberta quando já tem conteúdo, fechada quando vazia. */
function Secao({
  titulo,
  aberta,
  children,
}: {
  titulo: string;
  aberta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="mynommi-secao" open={aberta}>
      <summary>
        <span>{titulo}</span>
      </summary>
      <div className="mynommi-secao-corpo">{children}</div>
    </details>
  );
}

/** A página pessoal: é por ela que alguém decide se quer se conectar com você. */
export function MyNommi({ me }: { me: string }) {
  const { pagina, ready, reload } = usePaginaPessoal(me);
  const { titulo } = useMeuTitulo(true);
  const [editando, setEditando] = useState(false);
  const [listaVinculos, setListaVinculos] = useState<TipoVinculo | null>(null);
  const [mexendoInteresses, setMexendoInteresses] = useState(false);
  const [postandoStory, setPostandoStory] = useState(false);
  const [ajustarCapaAgora, setAjustarCapaAgora] = useState(0);
  const { publish: publicarStory } = useStories(me);
  const { estrelas } = useEstrelas(me);
  if (!ready) return <Esqueleto tipo="perfil" />;
  if (!pagina)
    return (
      <EmptyState
        title="Sua página ainda não abriu."
        text="Recarregue a tela ou entre de novo na sua conta."
      />
    );

  const falta = missingParts(pagina);
  const pronto = completeness(pagina);

  return (
    <section className={"mynommi tom-" + tomDoFundo(pagina.background)}>
      {/* O atalho de trocar foto fica no cantinho do avatar, como o botão de
          enquadrar, sem empurrar o nome nem a capa. */}
      <style>{`.mynommi-foto-wrap .photo-label{position:absolute;left:-8px;bottom:-4px;padding:6px 10px;font-size:11px!important;line-height:1.2;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:2}.mynommi-secao{margin:26px 0 14px}.mynommi-secao>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;font-size:20px;font-weight:700;list-style:none}.mynommi-secao>summary::-webkit-details-marker{display:none}.mynommi-secao>summary::after{content:"";width:10px;height:10px;border-right:2.5px solid currentColor;border-bottom:2.5px solid currentColor;transform:rotate(45deg);transition:transform .15s;flex:none;margin-right:6px}.mynommi-secao[open]>summary::after{transform:rotate(-135deg)}.mynommi-secao-corpo{padding-top:14px}.mynommi-secao .section-heading{margin:0 0 12px}.mynommi-secao .section-heading h2{display:none}.mynommi-secao-acoes{display:flex;justify-content:flex-end;margin-bottom:8px}`}</style>
      <div
        className={"mynommi-fundo" + (fundoEhFoto(pagina.background) ? " foto" : "")}
        style={estiloDoFundo(pagina.background)}
        aria-hidden="true"
      />
      <div
        className="mynommi-capa"
        style={{ ...coverStyle(pagina.cover), backgroundPosition: paraCss(pagina.capaFoco) }}
      >
        <span className="mynommi-capa-edit">
          <AjustarEnquadramento
            me={me}
            alvo="capa"
            imagem={pagina.cover}
            valor={pagina.capaFoco}
            onSalvo={() => void reload()}
            autoAbrir={ajustarCapaAgora > 0}
            onAutoFechou={() => setAjustarCapaAgora(0)}
          />
          <CoverEditor
            target={{ kind: "perfil", userId: me }}
            slot="cover"
            current={pagina.cover}
            onSaved={() => void reload()}
            label="Capa"
            onUploaded={() => setAjustarCapaAgora(Date.now())}
          />
        </span>
      </div>

      <div className="mynommi-topo">
        <span className="mynommi-foto-wrap">
          <Face avatar={pagina.avatar} nome={pagina.nickname} foco={pagina.fotoFoco} />
          <FotoInstantanea
            onPronta={async (jpeg) => {
              // Atalho direto: troca a foto sem passar pelo Editar. Mesmo
              // caminho do settings — sobe o arquivo e guarda o endereço.
              const anterior = pagina.avatar;
              const caminho = await enviarFotoDePerfil(me, jpeg);
              const ok = await saveCloudProfile(me, { avatar_url: caminho ?? jpeg });
              if (ok && caminho) void apagarFotoAntiga(anterior);
              void reload();
            }}
          />
          {pagina.avatar && (
            <AjustarEnquadramento
              me={me}
              alvo="foto"
              imagem={pagina.avatar}
              valor={pagina.fotoFoco}
              onSalvo={() => void reload()}
              compacto
            />
          )}
        </span>
        <div className="mynommi-nome">
          <h1>{pagina.nickname}</h1>
          {titulo.embaixadora && (
            <span className="selo-embaixadora" title="Chegou no começo da nommi">
              <Icon name="crown" />
              Embaixadora
            </span>
          )}
          {pagina.city && (
            <p>
              <Icon name="pin" />
              {pagina.city}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPostandoStory(true)}>
          <Icon name="plus" />
          Story
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/configuracoes" search={{ section: "perfil" }}>
            <Icon name="settings" />
            Editar
          </Link>
        </Button>
      </div>
      {postandoStory && (
        <CameraStory onClose={() => setPostandoStory(false)} onPublish={publicarStory} />
      )}

      {falta.length > 0 && (
        <div className="mynommi-falta">
          <div className="mynommi-barra">
            <span style={{ width: pronto + "%" }} />
          </div>
          <p>
            <b>Sua página está {pronto}% pronta.</b> Quem chega aqui decide se quer te conhecer.
            Falta {falta.slice(0, 2).join(" e ")}.
          </p>
          <Button size="sm" onClick={() => setEditando(true)}>
            <Icon name="plus" />
            Completar agora
          </Button>
        </div>
      )}

      <StatsLine userId={me} onOpen={setListaVinculos} />
      <MinhasEstrelas
        saldo={estrelas.saldo}
        ganhasSemana={estrelas.ganhasSemana}
        presencas={estrelas.presencas}
      />

      {pagina.lookingFor && (
        <p className="mynommi-procuro">
          <Icon name="spark" />
          {pagina.lookingFor}
        </p>
      )}
      {pagina.about && <p className="mynommi-sobre">{pagina.about}</p>}

      <Secao titulo="Meus interesses" aberta={pagina.interests.length > 0 || mexendoInteresses}>
        <div className="mynommi-secao-acoes">
          <Button variant="ghost" size="sm" onClick={() => setMexendoInteresses((v) => !v)}>
            <Icon name={mexendoInteresses ? "close" : "plus"} />
            {mexendoInteresses ? "Fechar" : "Mexer"}
          </Button>
        </div>
        {mexendoInteresses ? (
        <EscolherInteresses
          me={me}
          atuais={pagina.interests}
          onSalvo={() => {
            setMexendoInteresses(false);
            void reload();
          }}
        />
      ) : pagina.interests.length > 0 ? (
        <div className="meus-interesses">
          {pagina.interests.map((i) => (
            <span key={i}>
              {figurinhaDe(i)} {i}
            </span>
          ))}
        </div>
      ) : (
          <p className="small-note">
            Você ainda não marcou nenhum interesse. É por eles que o match acontece.
          </p>
        )}
      </Secao>

      <Secao titulo="Lugares que eu curto" aberta={pagina.places.length > 0}>
        <div className="mynommi-secao-acoes">
          <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
            <Icon name="plus" />
            Editar
          </Button>
        </div>
        {pagina.places.length ? (
        <div className="interest-tags">
          {pagina.places.map((p) => (
            <span key={p}>
              <Icon name="pin" />
              {p}
            </span>
          ))}
        </div>
      ) : (
          <p className="small-note">
            Diga três lugares que você frequenta. É o que faz alguém pensar “eu também vou lá”.
          </p>
        )}
      </Secao>

      <Secao titulo="Plano de fundo">
        <EscolherFundo me={me} atual={pagina.background} onSalvo={() => void reload()} />
        <details className="descobrir-busca">
          <summary>Prefiro usar uma foto minha de fundo</summary>
          <CoverEditor
            target={{ kind: "perfil", userId: me }}
            slot="background"
            current={pagina.background}
            onSaved={() => void reload()}
          />
        </details>
      </Secao>

      <Secao titulo="Meu vídeo" aberta={!!pagina.video}>
        <MeuVideo
          me={me}
          path={pagina.video ?? ""}
          souDono
          nome={pagina.nickname}
          onMudou={() => void reload()}
        />
      </Secao>

      {MOSTRAR_SECOES_DE_AMIGOS && (
        <>
          <Secao titulo="Amigos falando de você" aberta>
            <VideosDeAmigos me={me} dono={me} nome={pagina.nickname} souAmiga={false} />
          </Secao>

          <Secao titulo="O que seus amigos dizem" aberta>
            <Selos me={me} dono={me} nome={pagina.nickname} souAmiga={false} />
          </Secao>

          <Secao titulo="Recados dos amigos" aberta>
            <WallPanel me={me} ownerId={me} nickname={pagina.nickname} canWrite={false} />
          </Secao>
        </>
      )}

      <Secao titulo="O que eu publiquei" aberta>
        <Feed
        me={me}
        nickname={pagina.nickname}
        scope={{ authorId: me }}
        emptyTitle="Você ainda não publicou nada."
        emptyText="Conte como foi um rolê e sua página ganha vida."
        />
      </Secao>

      {editando && (
        <EditarPagina
          me={me}
          pagina={pagina}
          onClose={() => {
            setEditando(false);
            void reload();
          }}
        />
      )}
      {listaVinculos && (
        <VinculosSheet me={me} tipo={listaVinculos} onClose={() => setListaVinculos(null)} />
      )}
    </section>
  );
}

/** O que só existe aqui: lugares, o que procuro e o @ do Instagram. */
function EditarPagina({
  me,
  pagina,
  onClose,
}: {
  me: string;
  pagina: PaginaPessoal;
  onClose: () => void;
}) {
  const { notify } = useFriends();
  const [places, setPlaces] = useState<string[]>(pagina.places.length ? pagina.places : [""]);
  const [procuro, setProcuro] = useState(pagina.lookingFor);
  const [insta, setInsta] = useState(pagina.instagram);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet title="Completar meu nommi" onClose={onClose}>
      <label>
        O que você procura aqui <small>uma frase</small>
        <input
          className="input"
          maxLength={MAX_LOOKING}
          value={procuro}
          placeholder="Ex.: gente para caminhar de manhã"
          onChange={(e) => setProcuro(e.target.value)}
        />
      </label>

      <b className="partner-label">Lugares que você curte</b>
      <p className="small-note">Bairro, café, parque, quadra. Até {MAX_PLACES}.</p>
      {places.map((p, i) => (
        <div className="row" key={i}>
          <input
            className="input"
            maxLength={40}
            value={p}
            placeholder="Ex.: Mercado Central"
            onChange={(e) => setPlaces(places.map((v, n) => (n === i ? e.target.value : v)))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tirar este lugar"
            onClick={() => setPlaces(places.filter((_, n) => n !== i))}
          >
            <Icon name="close" />
          </Button>
        </div>
      ))}
      {places.length < MAX_PLACES && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setPlaces([...places, ""])}
        >
          <Icon name="plus" />
          Mais um lugar
        </Button>
      )}

      <label>
        Seu Instagram <small>opcional</small>
        <input
          className="input"
          maxLength={40}
          value={insta}
          placeholder="@seuperfil"
          onChange={(e) => setInsta(e.target.value)}
        />
      </label>
      <p className="small-note">
        A nommi não confere esse perfil. Serve só para as pessoas te reconhecerem.
      </p>

      <Button
        className="wide"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const ok = await savePagina(me, {
            places: cleanPlaces(places),
            lookingFor: procuro,
            instagram: insta,
          });
          setBusy(false);
          notify(ok ? "Sua página ficou mais completa." : "Não deu para salvar agora.");
          if (ok) onClose();
        }}
      >
        <Icon name="check" />
        {busy ? "Salvando…" : "Salvar"}
      </Button>
    </Sheet>
  );
}
