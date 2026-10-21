import { useDemoSession } from "./session";
import { isRealHost } from "@/lib/nommi-access";
import { ClubCatalog } from "./club-catalog";
import { teiasFor, hasSharedTeia, allTeias } from "@/lib/tribos";
import { EmptyState } from "./surfaces";
import { questionFor } from "@/lib/today";
import { NommiIdentity, SocialWeb } from "./social-web";
import { ProfileRoles, ProfileGrid } from "./profile-social";
import { Gate, ProfileModeBadge } from "./privacy";
import { OpenerSuggest } from "./opener-suggest";
import { useState } from "react";
import { ProfileMenu } from "./social-shell";
import { OtherProfileMenu } from "./social-actions";
import { ageOn } from "@/lib/nomi-validation";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, Icon, Sticker, StickerPicker } from "./art";
import { useFriends } from "./store";
import { PartnerCommunity } from "./business";
import { PartnerIdeas } from "./meetup-ideas";
import profileCover from "@/assets/moments/trilha.jpg";
import { people, groups, partners, money, getPartner, getGroup } from "@/lib/friends-data";
function Heading({ title, label }: { title: string; label?: string }) {
  return (
    <div className="page-title">
      <div>
        {label && <p className="eyebrow">{label}</p>}
        <h1>{title}</h1>
      </div>
    </div>
  );
}
function PartnerIcon({ index }: { index: number }) {
  const p = getPartner(index);
  return (
    <span className={"tone-icon " + p.tone}>
      <Icon name={p.icon} />
    </span>
  );
}
export function Profile({ personId }: { personId?: number | undefined }) {
  const { state, setState, notify } = useFriends();
  const { cloudUser, demoMode, isAdmin } = useDemoSession();
  const [tab, setTab] = useState("Tribo de amizades");
  const [place, setPlace] = useState(0);
  const [inviting, setInviting] = useState(false);
  const person = people.find((p) => p.id === personId) || people[0];
  if (!person) return null;
  const own = personId === undefined;
  if (!own && !demoMode)
    return (
      <EmptyState
        title="Este nommi não está disponível."
        text="Este perfil pertence à apresentação."
      />
    );
  const name = own ? state.nickname : person.name;
  const avatar = own ? 3 : person.id;
  return (
    <>
      <section className="profile-top profile-2026">
        {own ? <ProfileMenu /> : <OtherProfileMenu personId={person.id} />}
        <div className="profile-cover-photo">
          <img src={profileCover} alt="" aria-hidden="true" />
        </div>
        <div className="profile-info">
          {own && state.photo ? (
            <img className="profile-photo" src={state.photo} alt="Sua foto de perfil" />
          ) : (
            <Avatar id={avatar} size={108} />
          )}
          <div className="profile-name">
            <h1>{name}</h1>
            {(!own || state.birthday) && <span>{own ? ageOn(state.birthday) : person.age}</span>}
          </div>
          {own ? (
            <ProfileModeBadge mode={state.profileMode ?? "publico"} />
          ) : person.private ? (
            <ProfileModeBadge mode="privado" />
          ) : null}
          <div className="profile-meta">
            <span>
              <Icon name="pin" />
              {own
                ? state.cityOnly
                  ? state.city
                  : "Cidade não exibida"
                : person.city + " · " + person.area}
            </span>
            {!own && <span className="online-status">{person.availability}</span>}
          </div>
          {own ? (
            state.about ? (
              <p>{state.about}</p>
            ) : (
              <Button asChild variant="secondary">
                <Link to="/configuracoes" search={{ section: "perfil" }}>
                  <Icon name="plus" />
                  Escreva uma frase sobre você
                </Link>
              </Button>
            )
          ) : (
            <p>{person.about}</p>
          )}
          <div className="stats">
            <div>
              <b>{own ? state.matches.length : 18}</b>
              <span>conexões</span>
            </div>
            <div>
              <b>
                {own
                  ? (state.joinedTeias ?? []).length
                  : groups.filter((g) => g.ids.includes(person.id)).length}
              </b>
              <span>tribos</span>
            </div>
            <div>
              <b>{own ? state.visits.length : 7}</b>
              <span>rolês</span>
            </div>
          </div>
          {(own ? state.interests : person.interests).length > 0 && (
            <div className="profile-pills">
              {(own ? state.interests : person.interests).slice(0, 8).map((t, i) => (
                <span key={t} className={"pill-" + (i % 4)}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {(own ? teiasFor(state) : groups.filter((g) => g.ids.includes(person.id))).length > 0 && (
            <div className="profile-communities">
              <h2>Comunidades</h2>
              <div className="profile-community-row">
                {(own ? teiasFor(state) : groups.filter((g) => g.ids.includes(person.id))).map(
                  (g) => (
                    <Link
                      key={g.id}
                      to="/grupos/$id"
                      params={{ id: String(g.id) }}
                      className="profile-community"
                    >
                      <span className={"tone-icon " + g.tone}>
                        <Icon name={g.icon} />
                      </span>
                      <b>{g.name}</b>
                      <small>{g.members} pessoas</small>
                    </Link>
                  ),
                )}
              </div>
            </div>
          )}
          <NommiIdentity
            name={name}
            avatar={avatar}
            interests={own ? state.interests : person.interests}
            mode={
              own
                ? (state.mode ?? "Híbrida")
                : person.filters.includes("Online")
                  ? person.filters.includes("Por perto")
                    ? "Híbrida"
                    : "Virtual"
                  : "Presencial"
            }
            own={own}
          />
          {own && (state.dailyAnswers ?? []).length > 0 && (
            <section className="card">
              <h2>Minhas respostas</h2>
              <p className="small-note">
                Quem visita seu perfil conhece um pouco de você por aqui.
              </p>
              <ul className="checkin-list">
                {(state.dailyAnswers ?? []).slice(0, 5).map((a) => (
                  <li key={a.date}>
                    <b>{questionFor(a.date).q}</b> {a.text}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(!own || state.matches.length > 0) && (
            <>
              <Gate area="roles" own={own} personId={person.id}>
                <ProfileRoles avatar={avatar} name={name} />
              </Gate>
              <Gate area="fotos" own={own} personId={person.id}>
                <ProfileGrid avatar={avatar} />
              </Gate>
            </>
          )}
          {!own && (
            <div className="profile-actions">
              <Button
                onClick={() => {
                  if (own)
                    notify(
                      "Você está no seu perfil. Descubra novas amizades para enviar curiosidade.",
                    );
                  else
                    notify(
                      "Curiosidade enviada para " +
                        name +
                        ". A conversa abre depois de um rolê na mesma tribo.",
                    );
                }}
              >
                <Icon name="heart" />
                Tenho curiosidade
              </Button>
              <Button variant="secondary" onClick={() => setInviting((s) => !s)}>
                <Icon name="users" />
                Convidar
              </Button>
            </div>
          )}
          {inviting && (
            <div className="chips">
              {teiasFor(state).map((g) => (
                <Button
                  variant="secondary"
                  key={g.id}
                  onClick={() => {
                    notify("Convite enviado para " + g.name + ".");
                    setInviting(false);
                  }}
                >
                  {g.name}
                </Button>
              ))}
            </div>
          )}
          {!own && hasSharedTeia(state, person.id) && (
            <OpenerSuggest personId={person.id} name={person.name} interests={person.interests} />
          )}
          {!own && (
            <div className="safety-actions">
              <Button
                variant="ghost"
                onClick={() => notify("Denúncia registrada nesta demonstração.")}
              >
                <Icon name="flag" />
                Denunciar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setState((s) => ({
                    ...s,
                    blocked: [...new Set([...s.blocked, person.id])],
                    matches: s.matches.filter((id) => id !== person.id),
                  }));
                  notify("Pessoa bloqueada.");
                }}
              >
                <Icon name="block" />
                Bloquear
              </Button>
            </div>
          )}
          {own && (
            <div className="profile-account-links">
              <Button asChild variant="secondary" className="wide">
                <Link to="/conversas">
                  <Icon name="chat" />
                  Conversas · tribo em comum
                </Link>
              </Button>
              {isRealHost(cloudUser, demoMode) && (
                <>
                  <Button asChild variant="secondary" className="wide">
                    <Link to="/parceiro">
                      <Icon name="gift" />
                      Meu espaço de Anfitrião
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" className="wide">
                    <Link to="/carteira">
                      <Icon name="spark" />
                      Carteira · Brilho
                    </Link>
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button asChild variant="ghost" className="wide">
                  <Link to="/admin">
                    <Icon name="lock" />
                    Administração
                  </Link>
                </Button>
              )}
              <p className="small-note pro-discreet">Nommi Pro · novidades mais pra frente.</p>
            </div>
          )}
        </div>
      </section>
      <div className="profile-tabs" role="tablist">
        {[
          ["Tribo de amizades", "users"],
          ["Meus amigos dizem", "stickers"],
          [own ? "Minhas tribos" : "Tribos", "users"],
          ["Lugares", "pin"],
        ].map(([t, icon]) => (
          <Button
            key={t}
            variant="ghost"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t ?? "Mural")}
          >
            <Icon name={icon ?? "star"} />
            {t}
          </Button>
        ))}
      </div>
      <section className="profile-panel" role="tabpanel">
        {tab === "Tribo de amizades" && own && !state.matches.length && (
          <EmptyState
            title="Sua tribo de amizades começa aqui."
            text="Cada encontro puxa um fio. O próximo pode ser o seu."
          >
            <Button asChild>
              <Link to="/descobrir">Conhecer pessoas</Link>
            </Button>
          </EmptyState>
        )}
        {tab === "Tribo de amizades" && !(own && !state.matches.length) && (
          <Gate area="teia" own={own} personId={person.id}>
            <SocialWeb name={name} avatar={avatar} photo={own ? state.photo : ""} />
          </Gate>
        )}
        {tab === "Meus amigos dizem" && (
          <>
            <h2>Meus amigos dizem</h2>
            {!state.wall.some((w) => w.status === "approved") && (
              <p className="small-note">
                O mural ainda está vazio. As figurinhas das suas amizades vão aparecer aqui.
              </p>
            )}
            <div className="sticker-wall">
              {state.wall
                .filter((w) => w.status === "approved")
                .map((w, i) => (
                  <Sticker key={i} id={w.id} author={w.author} />
                ))}
            </div>
            {(!own || state.matches.length > 0) && (
              <blockquote>
                “É quem escolhe a música da viagem.”<small>Carla, amizade do karaokê</small>
              </blockquote>
            )}
            <h3>Deixe uma figurinha</h3>
            <p className="small-note">
              As figurinhas chegam ao mural depois da aprovação de quem tem o perfil.
            </p>
            <StickerPicker
              onPick={(id) => {
                setState((s) => ({
                  ...s,
                  wall: [
                    ...s.wall,
                    { id, author: own ? "Carla (exemplo)" : state.nickname, status: "pending" },
                  ],
                }));
                notify("Figurinha enviada para aprovação.");
              }}
            />
            {own && state.wall.some((w) => w.status === "pending") && (
              <section className="approval">
                <h3>Aguardando sua aprovação</h3>
                {state.wall.map((w, i) =>
                  w.status === "pending" ? (
                    <div className="row" key={i}>
                      <Sticker id={w.id} size={52} author={w.author} />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            wall: s.wall.map((x, j) =>
                              j === i ? { ...x, status: "approved" } : x,
                            ),
                          }));
                          notify("Figurinha aprovada e colada no mural.");
                        }}
                      >
                        <Icon name="check" />
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setState((s) => ({ ...s, wall: s.wall.filter((_, j) => j !== i) }));
                          notify("Contribuição recusada.");
                        }}
                      >
                        Recusar
                      </Button>
                    </div>
                  ) : null,
                )}
              </section>
            )}
          </>
        )}
        {(tab === "Tribos" || tab === "Minhas tribos") && (
          <>
            <h2>{own ? "Minhas tribos" : "Tribos de " + name.split(" ")[0]}</h2>
            <p className="small-note">
              {own
                ? "As tribos de que você participa."
                : "As tribos de que " + name.split(" ")[0] + " participa."}
            </p>
            {(own ? teiasFor(state) : groups.filter((g) => g.ids.includes(person.id))).length ===
              0 && <p className="small-note">Ainda sem tribos visíveis.</p>}
            {(own ? teiasFor(state) : groups.filter((g) => g.ids.includes(person.id))).map((g) => (
              <article className="group-card" key={g.id}>
                <div className="row">
                  <span className={"tone-icon " + g.tone}>
                    <Icon name={g.icon} />
                  </span>
                  <div>
                    <h3>{g.name}</h3>
                    <p>
                      {g.mode} · {g.members} pessoas
                    </p>
                  </div>
                </div>
                <div className="avatar-stack">
                  {g.ids.map((id) => (
                    <Avatar key={id} id={id} size={30} />
                  ))}
                </div>
                <div className="group-card-bottom">
                  <Button asChild>
                    <Link to="/grupos/$id" params={{ id: String(g.id) }}>
                      Check-in
                      <Icon name="arrow" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </>
        )}
        {tab === "Lugares" && demoMode && (
          <>
            <h2>Onde a tribo se encontra</h2>
            <div className="place-map">
              <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
                <path className="map-water" d="M0 40C20 30 30 50 50 38S80 20 100 30V60H0z" />
                <path className="map-road" d="M10 0L30 60M60 0L45 60M0 25H100" />
              </svg>
              {partners.slice(0, 4).map((p, i) => (
                <Button
                  key={p.name}
                  variant="ghost"
                  className={"map-pin pin-" + i + " " + p.tone + (place === i ? " selected" : "")}
                  aria-label={p.name}
                  onClick={() => setPlace(i)}
                >
                  <Icon name={p.icon} />
                </Button>
              ))}
            </div>
            <article className="place-detail">
              <div className="row">
                <PartnerIcon index={place} />
                <div>
                  <h3>{getPartner(place).name}</h3>
                  <p>{getPartner(place).visits} visitas da tribo</p>
                </div>
              </div>
              <span className="reward-chip">
                <Icon name="gift" />
                {getPartner(place).benefit}
              </span>
            </article>
            <h3>Check-ins recentes</h3>
            <ul className="checkin-list">
              {partners
                .filter((p) => p.visits > 0)
                .slice(0, 3)
                .map((p) => (
                  <li key={p.name}>
                    <Icon name="check" />
                    {p.name} · com a tribo
                  </li>
                ))}
            </ul>
            <p className="small-note">Mapa ilustrativo. Sem localização em tempo real.</p>
          </>
        )}
        {tab === "Lugares" && !demoMode && (
          <EmptyState
            title="O mapa dos seus encontros começa aqui."
            text="Os lugares aparecem depois dos rolês com a tribo."
          />
        )}
      </section>
    </>
  );
}
export function Club() {
  return <ClubCatalog />;
}
export function Signup() {
  const { state, setState, notify } = useFriends();
  const [name, setName] = useState(state.nickname);
  const [interests, setInterests] = useState(state.interests);
  const [goals, setGoals] = useState(state.goals);
  const [city, setCity] = useState(state.cityOnly);
  const [approval, setApproval] = useState(state.wallApproval);
  const [adult, setAdult] = useState(false);
  const [created, setCreated] = useState(false);
  function toggle(arr: string[], x: string) {
    return arr.includes(x) ? arr.filter((v) => v !== x) : [...arr, x];
  }
  return (
    <div className="signup-wrap">
      <Heading title="Vamos montar seu perfil" label="AMIZADES COMEÇAM COM UM OI" />
      <div className="signup-avatar">
        <Avatar id={3} size={96} />
        <Sticker id={0} size={66} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!adult) {
            notify("O Nommi é para maiores de 18 anos.");
            return;
          }
          setState((s) => ({
            ...s,
            nickname: name.trim(),
            interests,
            goals,
            cityOnly: city,
            wallApproval: approval,
            adult: true,
          }));
          setCreated(true);
          notify("Perfil criado! Suas escolhas foram salvas neste navegador.");
        }}
      >
        <label>
          Como devemos te chamar?
          <input
            className="input"
            value={name}
            required
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu apelido"
          />
        </label>
        <fieldset>
          <legend>O que você procura?</legend>
          <div className="chips">
            {["conversar online", "gente por perto", "teias"].map((g) => (
              <Button
                type="button"
                key={g}
                variant="outline"
                className={"chip " + (goals.includes(g) ? "selected" : "")}
                onClick={() => setGoals(toggle(goals, g))}
              >
                {g}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Seus interesses <small>opcional</small>
          </legend>
          <div className="chips">
            {[
              "karaokê",
              "vinho",
              "séries",
              "viagens",
              "trilhas",
              "culinária",
              "games",
              "livros",
            ].map((i) => (
              <Button
                type="button"
                key={i}
                variant="outline"
                className={"chip " + (interests.includes(i) ? "selected" : "")}
                onClick={() => setInterests(toggle(interests, i))}
              >
                {i}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Privacidade</legend>
          <label className="checkbox-line">
            <input type="checkbox" checked={city} onChange={(e) => setCity(e.target.checked)} />
            Mostrar só a cidade
          </label>
          <p className="small-note">
            A localização é sempre aproximada. Nunca mostramos seu endereço.
          </p>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={approval}
              onChange={(e) => setApproval(e.target.checked)}
            />
            Mural com aprovação
          </label>
        </fieldset>
        <label className="checkbox-line">
          <input
            type="checkbox"
            required
            checked={adult}
            onChange={(e) => setAdult(e.target.checked)}
          />
          Tenho 18 anos ou mais
        </label>
        <Button className="wide" disabled={!name.trim()}>
          <Icon name="check" />
          {created ? "Perfil criado" : "Criar meu perfil"}
        </Button>
        {created && (
          <Button asChild variant="secondary" className="wide">
            <Link to="/">
              Conhecer minhas sugestões
              <Icon name="arrow" />
            </Link>
          </Button>
        )}
      </form>
    </div>
  );
}
export function Pro() {
  return (
    <>
      <Heading title="Nommi Pro" />
      <p className="small-note pro-discreet">
        Estamos preparando o Pro. Por enquanto, não há assinatura ou teste para ativar.
      </p>
      <Button asChild variant="secondary" className="wide">
        <Link to="/perfil">
          Voltar ao meu nommi
          <Icon name="arrow" />
        </Link>
      </Button>
    </>
  );
}
export function Partner() {
  return (
    <>
      <Heading title="Meu espaço de Anfitrião" label="QUEM RECEBE A TEIA" />
      <p className="intro">Seu lugar, o que a tribo curte e uma boa desculpa pra se reunir.</p>
      <PartnerIdeas />
      <div className="section-heading">
        <h2>Dar Brilho aos encontros</h2>
      </div>
      <Button asChild variant="secondary" className="wide">
        <Link to="/carteira">
          <Icon name="spark" />
          Abrir Carteira
        </Link>
      </Button>
    </>
  );
}
