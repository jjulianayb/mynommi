import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "./art";
import { EmptyState, Sheet } from "./surfaces";
import { useFriends } from "./store";
import { CoverEditor } from "./cover-editor";
import { StatsLine, Feed, WallPanel } from "./social-feed";
import { MinhasEstrelas } from "./presenca";
import { useEstrelas } from "@/lib/presenca";
import { coverStyle } from "@/lib/covers";
import { paraCss } from "@/lib/enquadrar";
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
  size = 108,
  foco,
}: {
  avatar: string;
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
    <Avatar id={3} size={size} />
  );
}

/** A página pessoal: é por ela que alguém decide se quer se conectar com você. */
export function MyNommi({ me }: { me: string }) {
  const { pagina, ready, reload } = usePaginaPessoal(me);
  const [editando, setEditando] = useState(false);
  const { estrelas } = useEstrelas(me);
  if (!ready) return <p className="small-note">Abrindo seu nommi…</p>;
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
    <section className="mynommi">
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
          />
          <CoverEditor
            target={{ kind: "perfil", userId: me }}
            slot="cover"
            current={pagina.cover}
            onSaved={() => void reload()}
            label="Capa"
          />
        </span>
      </div>

      <div className="mynommi-topo">
        <span className="mynommi-foto-wrap">
          <Face avatar={pagina.avatar} foco={pagina.fotoFoco} />
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
          {pagina.city && (
            <p>
              <Icon name="pin" />
              {pagina.city}
            </p>
          )}
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/configuracoes" search={{ section: "perfil" }}>
            <Icon name="settings" />
            Editar
          </Link>
        </Button>
      </div>

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

      <StatsLine userId={me} />
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

      {pagina.interests.length > 0 && (
        <>
          <h2 className="settings-subtitle">Meus interesses</h2>
          <div className="interest-tags">
            {pagina.interests.map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        </>
      )}

      <div className="section-heading">
        <h2>Lugares que eu curto</h2>
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

      <h2 className="settings-subtitle">Meu plano de fundo</h2>
      <div className="cover-preview" style={coverStyle(pagina.background)}>
        {!pagina.background && <span>Fundo padrão da nommi</span>}
      </div>
      <CoverEditor
        target={{ kind: "perfil", userId: me }}
        slot="background"
        current={pagina.background}
        onSaved={() => void reload()}
      />

      <h2 className="settings-subtitle">Meus amigos dizem</h2>
      <WallPanel me={me} ownerId={me} nickname={pagina.nickname} canWrite={false} />

      <h2 className="settings-subtitle">O que eu publiquei</h2>
      <Feed
        me={me}
        nickname={pagina.nickname}
        scope={{ authorId: me }}
        emptyTitle="Você ainda não publicou nada."
        emptyText="Conte como foi um rolê e sua página ganha vida."
      />

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
