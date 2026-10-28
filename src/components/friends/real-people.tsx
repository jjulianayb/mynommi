import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { coverStyle } from "@/lib/covers";
import { Button } from "@/components/ui/button";
import { Avatar, Icon } from "./art";
import { Esqueleto, EmptyState } from "./surfaces";
import { useFriends } from "./store";
import { useDemoSession } from "./session";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, connectionState, otherId } from "@/lib/connections";
import { usePeopleSearch, usePublicProfile, type PublicProfile } from "@/lib/real-profiles";
import { StatsLine, FollowButton, WallPanel, Feed, SafetyMenu } from "./social-feed";
import { Selos } from "./selos";
import { connectionState as _cs } from "@/lib/connections";

function Face({ p, size }: { p: PublicProfile; size: number }) {
  return p.avatar_url ? (
    <img
      className="real-face"
      src={p.avatar_url}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt={"Foto de " + p.nickname}
    />
  ) : (
    <Avatar id={3} size={size} />
  );
}

export function PeopleSearch({ userId }: { userId: string }) {
  const { state } = useFriends();
  const [q, setQ] = useState("");
  const { rows, loading } = usePeopleSearch(q, userId);
  const mine = new Set(state.interests ?? []);
  return (
    <section className="people-search">
      <Button asChild variant="secondary">
        <Link to="/amigos">
          <Icon name="users" />
          Meus amigos e pedidos
        </Link>
      </Button>
      <label className="search-field">
        <Icon name="users" />
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por apelido ou cidade"
          aria-label="Buscar nommi por apelido ou cidade"
          maxLength={40}
        />
      </label>
      {loading && !rows.length ? (
        <p className="small-note">Procurando…</p>
      ) : !rows.length ? (
        <EmptyState
          title={q ? "Ninguém com esse nome ou cidade." : "Ainda há poucos nommi por aqui."}
          text="Convide uma amizade para entrar no Nommi."
        >
          <Button asChild variant="secondary">
            <Link to="/convidar">Convidar uma amizade</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="people-list">
          {rows.map((p) => {
            const common = p.interests.filter((i) => mine.has(i));
            return (
              <Link key={p.id} to="/nommi/$id" params={{ id: p.id }} className="conversation">
                <Face p={p} size={56} />
                <div>
                  <h3>{p.nickname}</h3>
                  <p>
                    {p.city || "Cidade não informada"}
                    {common.length
                      ? " · " +
                        common.length +
                        (common.length === 1 ? " interesse em comum" : " interesses em comum")
                      : ""}
                  </p>
                </div>
                <Icon name="arrow" />
              </Link>
            );
          })}
        </div>
      )}
      <p className="small-note">
        Só aparecem perfis públicos. E-mail e telefone nunca são mostrados.
      </p>
    </section>
  );
}

function ProfileCover({ userId }: { userId: string }) {
  const [cover, setCover] = useState("");
  useEffect(() => {
    void supabase
      .from("profiles")
      .select("cover_path")
      .eq("id", userId)
      .maybeSingle()
      .then((r: { data: unknown }) =>
        setCover((r.data as { cover_path?: string } | null)?.cover_path ?? ""),
      );
  }, [userId]);
  return <div className="profile-cover-custom" style={coverStyle(cover) as React.CSSProperties} />;
}

export function PublicNommi({ id }: { id: string }) {
  const { state, notify } = useFriends();
  const { cloudUser, demoMode } = useDemoSession();
  const enabled = !!cloudUser && !demoMode;
  const { ready, profile, tribos } = usePublicProfile(id, enabled);
  const con = useConnections(enabled ? cloudUser!.id : null);
  if (!enabled)
    return (
      <EmptyState
        title="Entre na sua conta para ver este nommi."
        text="Perfis reais ficam visíveis só para quem tem conta."
      >
        <Button asChild>
          <Link to="/conta">Entrar</Link>
        </Button>
      </EmptyState>
    );
  if (!ready) return <Esqueleto tipo="perfil" />;
  if (!profile)
    return (
      <EmptyState
        title="Este nommi não está disponível."
        text="O perfil pode ser privado ou não existir mais."
      >
        <Button asChild variant="secondary">
          <Link to="/descobrir">Voltar para Descobrir</Link>
        </Button>
      </EmptyState>
    );
  const mine = new Set(state.interests ?? []);
  const own = cloudUser?.id === profile.id;
  return (
    <section className="profile-top">
      <Button asChild variant="ghost" className="back-link">
        <Link to="/descobrir">
          <Icon name="back" />
          Descobrir
        </Link>
      </Button>
      <div className="profile-info">
        <Face p={profile} size={108} />
        <div className="profile-name">
          <h1>{profile.nickname}</h1>
          {!own && (
            <SafetyMenu
              me={cloudUser!.id}
              targetUserId={profile.id}
              targetUserName={profile.nickname}
            />
          )}
        </div>
        <StatsLine userId={profile.id} />
        {profile.city && (
          <div className="profile-meta">
            <span>
              <Icon name="pin" />
              {profile.city}
            </span>
          </div>
        )}
        {profile.about && <p>{profile.about}</p>}
        {profile.interests.length > 0 && (
          <div className="interest-tags">
            {profile.interests.map((i) => (
              <span key={i} className={mine.has(i) ? "common" : ""}>
                {mine.has(i) ? "Em comum: " + i : i}
              </span>
            ))}
          </div>
        )}
        {cloudUser && (
          <Selos
            me={cloudUser.id}
            dono={profile.id}
            nome={profile.nickname}
            souAmiga={
              !own &&
              con.ready &&
              connectionState(
                con.rows.find((r) => otherId(r, cloudUser.id) === profile.id),
                cloudUser.id,
              ) === "amigos"
            }
          />
        )}
        {!own &&
          con.ready &&
          (() => {
            const row = con.rows.find((r) => otherId(r, cloudUser!.id) === profile.id);
            const st = connectionState(row, cloudUser!.id);
            return (
              <div className="profile-actions">
                {st === "nenhuma" && (
                  <Button
                    onClick={async () =>
                      notify(
                        (await con.ask(profile.id))
                          ? "Pedido enviado para " + profile.nickname + "."
                          : "Não foi possível enviar o pedido.",
                      )
                    }
                  >
                    <Icon name="plus" />
                    Conectar
                  </Button>
                )}
                {st === "enviada" && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await con.remove(row!.id);
                      notify("Pedido cancelado.");
                    }}
                  >
                    Pedido enviado · cancelar
                  </Button>
                )}
                {st === "recebida" && (
                  <>
                    <Button
                      onClick={async () => {
                        await con.accept(row!.id);
                        notify("Agora vocês são amigos.");
                      }}
                    >
                      Aceitar pedido
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await con.remove(row!.id);
                      }}
                    >
                      Recusar
                    </Button>
                  </>
                )}
                {!own && <FollowButton me={cloudUser!.id} target={profile.id} />}
                {st === "amigos" && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (confirm("Desfazer a amizade com " + profile.nickname + "?")) {
                        await con.remove(row!.id);
                        notify("Amizade desfeita.");
                      }
                    }}
                  >
                    Amigos · desfazer
                  </Button>
                )}
              </div>
            );
          })()}
        <WallPanel
          me={cloudUser!.id}
          ownerId={profile.id}
          nickname={state.nickname || "nommi"}
          canWrite={
            !own &&
            con.rows.some((r) => r.status === "aceita" && otherId(r, cloudUser!.id) === profile.id)
          }
        />
        <h2 className="settings-subtitle">Posts</h2>
        <Feed
          me={cloudUser!.id}
          nickname={state.nickname || "nommi"}
          scope={{ authorId: profile.id }}
          emptyTitle={"Ainda sem posts."}
          emptyText={profile.nickname + " ainda não publicou nada que você possa ver."}
        />
        <h2 className="settings-subtitle">Tribos criadas</h2>
        {tribos.length ? (
          <div className="people-list">
            {tribos.map((t) => (
              <Link
                key={t.id}
                to="/grupos/$id"
                params={{ id: String(t.id) }}
                className="conversation"
              >
                <div>
                  <h3>{t.name}</h3>
                  <p>
                    {t.kind === "role" ? "Rolê aberto" : "Tribo"}
                    {t.city ? " · " + t.city : ""}
                  </p>
                </div>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="small-note">Ainda não criou tribos.</p>
        )}
      </div>
    </section>
  );
}

function useProfiles(ids: string[]) {
  const [map, setMap] = useState<Record<string, PublicProfile>>({});
  const key = ids.slice().sort().join(",");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    void supabase
      .from("profiles")
      .select("id,nickname,city,about,interests,avatar_url")
      .in("id", key.split(","))
      .then(({ data }) => {
        if (alive)
          setMap(
            Object.fromEntries(((data as PublicProfile[] | null) ?? []).map((p) => [p.id, p])),
          );
      });
    return () => {
      alive = false;
    };
  }, [key]);
  return map;
}

export function MyFriends() {
  const { notify } = useFriends();
  const { cloudUser, demoMode } = useDemoSession();
  const me = cloudUser && !demoMode ? cloudUser.id : null;
  const con = useConnections(me);
  const people = useProfiles(me ? con.rows.map((r) => otherId(r, me)) : []);
  if (!me)
    return (
      <EmptyState
        title="Entre na sua conta para ver seus amigos."
        text="Amizades reais ficam guardadas na sua conta."
      >
        <Button asChild>
          <Link to="/conta">Entrar</Link>
        </Button>
      </EmptyState>
    );
  if (!con.ready) return <p className="small-note">Carregando…</p>;
  const name = (id: string) => people[id]?.nickname || "Um nommi";
  const face = (id: string) =>
    people[id] ? <Face p={people[id]} size={48} /> : <Avatar id={3} size={48} />;
  const received = con.rows.filter((r) => r.status === "pendente" && r.addressee_id === me);
  const sent = con.rows.filter((r) => r.status === "pendente" && r.requester_id === me);
  const friends = con.rows.filter((r) => r.status === "aceita");
  return (
    <section className="people-search">
      <h1>Meus amigos</h1>
      <h2 className="settings-subtitle">Pedidos recebidos</h2>
      {received.length ? (
        <div className="people-list">
          {received.map((r) => (
            <div key={r.id} className="conversation">
              {face(r.requester_id)}
              <div>
                <h3>{name(r.requester_id)}</h3>
                <p>Quer se conectar com você</p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  await con.accept(r.id);
                  notify("Agora vocês são amigos.");
                }}
              >
                Aceitar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void con.remove(r.id)}>
                Recusar
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="small-note">Nenhum pedido supabase.</p>
      )}
      <h2 className="settings-subtitle">Amigos ({friends.length})</h2>
      {friends.length ? (
        <div className="people-list">
          {friends.map((r) => {
            const o = otherId(r, me);
            return (
              <Link key={r.id} to="/nommi/$id" params={{ id: o }} className="conversation">
                {face(o)}
                <div>
                  <h3>{name(o)}</h3>
                  <p>{people[o]?.city || "Amizade no Nommi"}</p>
                </div>
                <Icon name="arrow" />
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Você ainda não tem amigos aqui."
          text="Procure pessoas em Descobrir e toque em Conectar."
        >
          <Button asChild variant="secondary">
            <Link to="/descobrir">Ir para Descobrir</Link>
          </Button>
        </EmptyState>
      )}
      {sent.length > 0 && (
        <>
          <h2 className="settings-subtitle">Pedidos enviados</h2>
          <div className="people-list">
            {sent.map((r) => (
              <div key={r.id} className="conversation">
                {face(r.addressee_id)}
                <div>
                  <h3>{name(r.addressee_id)}</h3>
                  <p>Aguardando resposta</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void con.remove(r.id)}>
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
