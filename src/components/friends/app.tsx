import { CommunityDetail } from "./community-detail";
import { useDemoSession } from "./session";
import { useSharedTeia } from "@/lib/shared-teias";
import { useRealTeias, useRealTeia, toTeia, sortByCity } from "@/lib/real-teias";
import { RadarSection } from "./radar-section";
import { Feed, CreatePostForm, RolesList, RoleCard } from "./social-feed";
import { InstallBanner } from "./install-banner";
import { StoriesStrip } from "./stories-strip";
import { VitrineTop, MatchCards } from "./home-vitrine";
import { DirectConversations } from "./direct-chat";
import { TribeSecrets } from "./tribe-secrets";
import { Chegada } from "./chegada";
import { PresencaDoRole } from "./presenca";
import { useChegada, faseDaTribo } from "@/lib/chegada";
import { CoverEditor } from "./cover-editor";
import { useTeiaCovers } from "@/lib/covers";
import { useRoles } from "@/lib/roles";
import { Combinar, PessoasParaVoce } from "./combinar";
import { BotaoDaPorta, PedidosDaTribo } from "./porta-da-tribo";
import { MinhasTribos } from "./minhas-tribos";
import { marcarTriboVista } from "@/lib/minhas-tribos";
import type { MeuPedido } from "@/lib/porta-da-tribo";
import { chegadaJaVista, esconderChegada } from "@/lib/chegada-vista";
import { PeopleSearch } from "./real-people";
import { momentPhoto } from "@/lib/friends-photos";
import { OpenerSuggest } from "./opener-suggest";
import { ProfileModeBadge, FirstMeetNotice } from "./privacy";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Esqueleto, EmptyState, BrandMark } from "./surfaces";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  hasSharedTeia,
  teiasFor,
  teiaFor,
  allTeias,
  openTeias,
  getTeia,
  isMember,
  joinTeia,
  leaveTeia,
} from "@/lib/tribos";
import {
  awaitingReply,
  greeting,
  localDate,
  questionFor,
  CONNECT_OPTIONS,
  HEAVY,
  type ConnectChoice,
} from "@/lib/today";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon, Sticker, Cover } from "./art";
import { useFriends } from "./store";
import { ChatSticker, ChatStickerTray, SaveStickerButton } from "./chat-stickers";
import {
  people,
  visibleInListings,
  groups,
  partners,
  getPartner,
  WHEN_OPTIONS,
  REGION_OPTIONS,
  inviteWhen,
  inviteRegion,
  type Person,
  type Message,
  type Invite,
} from "@/lib/friends-data";
import { roles } from "./profile-social";
import { withBoosts, SAMPLE_BOOSTED_PEOPLE } from "@/lib/credits";
import { InviteCard, PlanFilterBar, type PlanFiltersValue } from "./invites";
const navigation = [
  { to: "/" as const, label: "Início", icon: "home" },
  { to: "/descobrir" as const, label: "Descobrir", icon: "spark" },
  { to: "/conversas" as const, label: "Conversas", icon: "chat" },
  { to: "/grupos" as const, label: "Tribos", icon: "users" },
  { to: "/clube" as const, label: "Clube", icon: "gift" },
  { to: "/perfil" as const, label: "Perfil", icon: "heart" },
];
export function FriendsShell({ children }: { children: ReactNode }) {
  return (
    <div className="friends-app">
      <header className="app-header">
        <Link to="/" className="wordmark" aria-label="nommi — Gente que combina com você">
          <BrandMark />
        </Link>
        <span className="brand-note">conversar, combinar e continuar.</span>
        <Button asChild variant="secondary" className="pro-link">
          <Link to="/pro">
            <Icon name="spark" />
            Nommi Pro
          </Link>
        </Button>
      </header>
      <div className="app-body">
        <aside className="desktop-nav">
          <p className="eyebrow">SEU CÍRCULO, DO SEU JEITO</p>
          {navigation.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "selected" }}
            >
              <Icon name={n.icon} />
              {n.label}
            </Link>
          ))}
          <div className="side-divider" />
          <Link to="/cadastro">
            <Icon name="users" />
            Cadastro
          </Link>
          <Link to="/parceiro">
            <Icon name="glass" />
            Painel do Anfitrião
          </Link>
          <div className="side-art">
            <Sticker id={0} size={96} />
            <Sticker id={5} size={80} />
          </div>
          <p className="side-caption">
            Bons encontros.
            <br />
            Novas histórias.
          </p>
        </aside>
        <main className="screen">
          {children}
          <footer className="safety-note">
            Perfis e valores fictícios · Somente maiores de 18 anos.
            <br />O Nommi não substitui apoio psicológico. CVV 188.
            <div>
              <Link to="/cadastro">Cadastro</Link>
              <span>·</span>
              <Link to="/pro">Nommi Pro</Link>
              <span>·</span>
              <Link to="/parceiro">Painel do Anfitrião</Link>
            </div>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {navigation.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            activeProps={{ className: "selected" }}
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
function Title({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function ToneIcon({ icon, tone }: { icon: string; tone: string }) {
  return (
    <span className={"tone-icon " + tone}>
      <Icon name={icon} />
    </span>
  );
}
function Chips({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string[];
  onSelect: (s: string) => void;
}) {
  return (
    <div className="chips">
      {items.map((s) => (
        <Button
          type="button"
          variant="outline"
          className={selected.includes(s) ? "chip selected" : "chip"}
          aria-pressed={selected.includes(s)}
          key={s}
          onClick={() => onSelect(s)}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
function Stack({ ids }: { ids: number[] }) {
  return (
    <div className="avatar-stack">
      {ids.map((id) => (
        <Avatar key={id} id={id} size={32} />
      ))}
    </div>
  );
}
function Safety({ person }: { person: number }) {
  const { setState, notify } = useFriends();
  return (
    <div className="safety-actions">
      <Button
        variant="ghost"
        onClick={() => {
          const reason = window.prompt("Qual é o motivo da denúncia?");
          if (reason?.trim())
            notify("Denúncia registrada nesta demonstração. Valeu por cuidar da tribo.");
        }}
      >
        <Icon name="flag" />
        Denunciar
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          if (window.confirm("Bloquear esta pessoa e encerrar a conversa?")) {
            setState((s) => ({
              ...s,
              blocked: [...s.blocked, person],
              matches: s.matches.filter((id) => id !== person),
            }));
            notify("Pessoa bloqueada. A conversa foi encerrada.");
          }
        }}
      >
        <Icon name="block" />
        Bloquear
      </Button>
    </div>
  );
}
function Match({ person, onClose }: { person: Person; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <section
        className="match-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vocês se encontraram na mesma tribo!"
      >
        <Icon name="spark" />
        <h2>Vocês se encontraram na mesma tribo!</h2>
        <div className="match-pair">
          <SemFoto size={112} />
          <Avatar id={person.id} size={112} />
        </div>
        <h3>Tribo em comum.</h3>
        <p>
          Você e {person.name.split(" ")[0]} já compartilharam um encontro.
          <br />
          Uma boa conversa começa aqui.
        </p>
        <Button asChild className="wide">
          <Link to="/conversas" search={{ p: person.id }}>
            Mandar mensagem
            <Icon name="chat" />
          </Link>
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Continuar descobrindo
          <Icon name="arrow" />
        </Button>
      </section>
    </div>
  );
}
function useInterest() {
  const { state, setState, notify } = useFriends();
  const [match, setMatch] = useState<Person | null>(null);
  function interest(p: Person) {
    if (state.blocked.includes(p.id)) {
      notify("Esta pessoa está bloqueada.");
      return;
    }
    if (hasSharedTeia(state, p.id)) {
      setState((s) => ({
        ...s,
        matches: [...new Set([...s.matches, p.id])],
        messages: { ...s.messages, [p.id]: s.messages[p.id] || [] },
      }));
      setMatch(p);
    } else {
      setState((s) => ({ ...s, sent: [...new Set([...s.sent, p.id])] }));
      notify("Que tal combinar numa tribo? A conversa direta abre depois de um encontro em comum.");
    }
  }
  return {
    interest,
    matchOverlay: match ? <Match person={match} onClose={() => setMatch(null)} /> : null,
  };
}
const HOME_FILTERS = ["Todas", "Amizade", "Tribos", "Eventos"];
const NEARBY_DISTANCES = ["a 5 min", "a 10 min", "a 15 min", "perto de você"];
const MOVIMENTO_CARDS = [
  {
    photo: momentPhoto.karaoke,
    alt: "Amigos cantando no karaokê",
    title: "Noite de karaokê",
    meta: "Sexta · Savassi",
    members: 5,
  },
  {
    photo: momentPhoto.vinho,
    alt: "Taças de vinho em um bar",
    title: "Vinho para novos começos",
    meta: "Sexta · Bar do Vinho Azul",
    members: 8,
  },
  {
    photo: momentPhoto.trilha,
    alt: "Trilha ao ar livre com a tribo",
    title: "Trilha de domingo",
    meta: "Domingo · Mangabeiras",
    members: 6,
  },
  {
    photo: momentPhoto.corrida,
    alt: "Corrida no parque",
    title: "Corrida no parque",
    meta: "Domingo · Parque Municipal",
    members: 4,
  },
];
export function Home() {
  const { state, setState, notify } = useFriends();
  const { demoMode, cloudUser } = useDemoSession();
  const realHome = !!cloudUser && !demoMode;
  const chegada = useChegada(realHome ? cloudUser!.id : null);
  const minhasTribos = chegada.sugeridas.length
    ? chegada.sugeridas.filter((t) => t.iAmMember).length
    : 0;
  const [verInicio, setVerInicio] = useState(() => chegadaJaVista(cloudUser?.id ?? null));
  const navigate = useNavigate();
  const [today, setToday] = useState("");
  const [answer, setAnswer] = useState("");
  const [filter, setFilter] = useState("Todas");
  useEffect(() => setToday(localDate(new Date())), []);
  const question = today ? questionFor(today) : null;
  const answered = (state.dailyAnswers ?? []).find((a) => a.date === today);
  const recommended =
    [...openTeias, ...allTeias].find((t) =>
      state.interests.some((i) => t.name.toLowerCase().includes(i)),
    ) ?? openTeias[0];
  const member = recommended ? isMember(state, recommended.id) : false;
  const attending = recommended
    ? recommended.ids.filter(
        (id) =>
          visibleInListings(people.find((p) => p.id === id) ?? { id }, state.matches) &&
          !state.blocked.includes(id),
      )
    : [];
  const city = state.city || "Brasil";
  const nearby = demoMode
    ? people
        .filter(
          (p) =>
            p.id !== 3 &&
            p.city === state.city &&
            visibleInListings(p, state.matches) &&
            !state.blocked.includes(p.id),
        )
        .slice(0, 6)
    : [];
  const suggested = (demoMode ? openTeias : []).slice(0, 3);
  const mostrarChegada = realHome && chegada.ready && minhasTribos < 1 && !verInicio;
  return (
    <>
      <VitrineTop nickname={state.nickname} city={city} avatar={state.photo} />
      {realHome && <StoriesStrip me={cloudUser!.id} nickname={state.nickname || "nommi"} />}
      {realHome && (filter === "Todas" || filter === "Amizade") && (
        <PessoasParaVoce me={cloudUser!.id} />
      )}
      {mostrarChegada && (
        <section className="chegada-card">
          <header>
            <h2>Primeiros passos</h2>
            <button type="button" onClick={() => esconderChegada(cloudUser!.id, setVerInicio)}>
              Agora não
            </button>
          </header>
          <Chegada
            me={cloudUser!.id}
            onPronto={() => esconderChegada(cloudUser!.id, setVerInicio)}
          />
        </section>
      )}
      {!realHome && (filter === "Todas" || filter === "Amizade") && (
        <MatchCards list={nearby} myInterests={state.interests} />
      )}
      <div className="home-filters" role="tablist" aria-label="Filtrar o início">
        {HOME_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={"home-filter" + (filter === f ? " selected" : "")}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {(filter === "Todas" || filter === "Eventos") && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Movimento por aí</h2>
            <Link to="/convites" className="section-link">
              Ver planos
              <Icon name="arrow" />
            </Link>
          </div>
          <div className="movimento-carousel">
            {MOVIMENTO_CARDS.map((c) => (
              <Link to="/convites" className="movimento-card" key={c.title}>
                <img src={c.photo} alt={c.alt} />
                <div className="movimento-card-info">
                  <h3>{c.title}</h3>
                  <p>
                    {c.meta} · {c.members} pessoas
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {!demoMode && (
            <p className="small-note">
              Exemplos visuais da apresentação. Os planos reais da sua cidade aparecem em Rolês.
            </p>
          )}
        </section>
      )}
      {(filter === "Todas" || filter === "Tribos") && <MinhasTribos ativo={realHome} />}
      {(filter === "Todas" || filter === "Tribos") && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Para você conhecer</h2>
            <Link to="/grupos" hash="teias-abertas" className="section-link">
              Ver todas
              <Icon name="arrow" />
            </Link>
          </div>
          {suggested.length ? (
            <div className="home-teia-list">
              {suggested.map((t) => {
                const m = isMember(state, t.id);
                return (
                  <article className="home-teia-card" key={t.id}>
                    <ToneIcon icon={t.icon} tone={t.tone} />
                    <div className="home-teia-info">
                      <h3>{t.name}</h3>
                      <p>
                        {t.mode} · {t.members} pessoas{t.time ? " · " + t.time : ""}
                      </p>
                      <Stack ids={t.ids} />
                    </div>
                    <Button
                      variant={m ? "secondary" : "default"}
                      onClick={() => {
                        if (!m) {
                          setState((s) => joinTeia(s, t.id));
                          notify("Você entrou! Diga oi para a tribo.");
                        }
                        void navigate({ to: "/grupos/$id", params: { id: String(t.id) } });
                      }}
                    >
                      <Icon name={m ? "check" : "plus"} />
                      {m ? "Abrir" : "Entrar"}
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="As primeiras tribos chegam por aqui."
              text="Quando houver tribos abertas na sua cidade, elas vão aparecer nesta lista."
            >
              <Button asChild>
                <Link to="/criar-grupo">
                  <Icon name="plus" />
                  Criar minha tribo
                </Link>
              </Button>
            </EmptyState>
          )}
        </section>
      )}
      {demoMode && recommended && (filter === "Todas" || filter === "Eventos") && (
        <section className="today-role">
          <div className="today-role-copy">
            <span className="eyebrow">SUGESTÃO DA APRESENTAÇÃO</span>
            <h2>{recommended.name}</h2>
            <p>{(recommended.place ?? "Online") + " · " + (recommended.time ?? "Sem pressa")}</p>
            <Button
              className="wide"
              onClick={() => {
                if (!member) {
                  setState((s) => joinTeia(s, recommended.id));
                  notify("Você entrou na tribo desta apresentação.");
                }
                void navigate({ to: "/grupos/$id", params: { id: String(recommended.id) } });
              }}
            >
              <Icon name={member ? "check" : "teia"} />
              {member ? "Abrir minha tribo" : "Quero ir"}
            </Button>
            <div className="today-going">
              <h3>Quem da sua tribo vai</h3>
              {attending.length ? (
                <>
                  <Stack ids={attending} />
                  <p>
                    {attending
                      .map((id) => people.find((p) => p.id === id)?.name.split(" ")[0])
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </>
              ) : (
                <p>As presenças confirmadas vão aparecer aqui.</p>
              )}
            </div>
          </div>
        </section>
      )}
      {realHome && (filter === "Todas" || filter === "Eventos") && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Rolês abertos</h2>
            <Link to="/convites" className="section-link">
              Ver todos
              <Icon name="arrow" />
            </Link>
          </div>
          <RolesList me={cloudUser!.id} nickname={state.nickname || "nommi"} />
        </section>
      )}
      {realHome && (filter === "Todas" || filter === "Amizade" || filter === "Tribos") && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Da sua rede</h2>
            <Link to="/postar-momento" className="section-link">
              Publicar
              <Icon name="plus" />
            </Link>
          </div>
          <Feed
            me={cloudUser!.id}
            nickname={state.nickname || "nommi"}
            emptyTitle="Seu início ainda está quieto."
            emptyText="Siga pessoas, entre numa tribo ou publique algo para começar."
          />
        </section>
      )}
      {question && (
        <section className="daily-question compact-question">
          <span className="episode-label">
            <Icon name="spark" />
            Pergunta do dia
          </span>
          <h2>{question.q}</h2>
          {answered ? (
            <p className="small-note">“{answered.text}”</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = answer.trim();
                if (!text) return;
                setState((s) => ({
                  ...s,
                  dailyAnswers: [
                    { date: today, text },
                    ...(s.dailyAnswers ?? []).filter((a) => a.date !== today),
                  ],
                }));
                setAnswer("");
                notify("Resposta guardada neste aparelho.");
              }}
            >
              <input
                className="input"
                aria-label="Sua resposta"
                maxLength={140}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Pode ser em poucas palavras"
              />
              <Button size="icon" aria-label="Enviar resposta" disabled={!answer.trim()}>
                <Icon name="send" />
              </Button>
            </form>
          )}
        </section>
      )}
      <InstallBanner />
      <InstallBanner />
      <details className="home-radar">
        <summary>
          <Icon name="pin" />
          <span>Um café por perto?</span>
          <Icon name="arrow" />
        </summary>
        <RadarSection />
      </details>
    </>
  );
}
function RadarPorta() {
  return (
    <Link to="/radar" className="radar-porta">
      <span className="radar-porta-icone">
        <Icon name="pin" />
      </span>
      <div>
        <b>Radar nommi</b>
        <p>Diga onde você está agora e veja quem topa um café por perto.</p>
      </div>
      <Icon name="arrow" />
    </Link>
  );
}
export function Discover() {
  const { cloudUser, demoMode: dm } = useDemoSession();
  if (cloudUser && !dm)
    return (
      <>
        <Title title="Encontre sua tribo" kicker="GENTE DE VERDADE" />
        <p className="intro">
          Veja do que a pessoa gosta. Se vocês dois quiserem se conhecer, já são amizade.
        </p>
        <Combinar me={cloudUser.id} />
        <details className="descobrir-busca">
          <summary>Procurar alguém pelo apelido ou pela cidade</summary>
          <RadarPorta />
          <PeopleSearch userId={cloudUser.id} />
        </details>
      </>
    );
  return <DemoDiscover />;
}
function DemoDiscover() {
  const { state, notify } = useFriends();
  const { demoMode } = useDemoSession();
  const { interest, matchOverlay } = useInterest();
  const [filters, setFilters] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const list = withBoosts(
    (demoMode ? people : []).filter(
      (p) =>
        !state.blocked.includes(p.id) &&
        visibleInListings(p, state.matches) &&
        (!filters.length || filters.some((f) => p.filters.includes(f))),
    ),
    SAMPLE_BOOSTED_PEOPLE,
  );
  const p = list[index];
  const [waiting, setWaiting] = useState(false);
  const nextSteps = (
    <>
      <Button asChild>
        <Link to="/grupos" hash="teias-abertas">
          <Icon name="users" />
          Entrar numa tribo
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link to="/convites">Ver planos de hoje</Link>
      </Button>
    </>
  );
  return (
    <>
      <Title title="Novas amizades" kicker="UM ENCONTRO DE CADA VEZ" />
      <p className="intro">Qual assunto rende um bom café?</p>
      {state.profileMode === "privado" && <ProfileModeBadge mode="privado" />}
      {waiting && p && (
        <section className="card">
          <h2>Enquanto isso, que tal conversar com mais gente?</h2>
          <div className="episode-actions">{nextSteps}</div>
        </section>
      )}
      <Chips
        items={["Online", "Por perto", "Tribos"]}
        selected={filters}
        onSelect={(f) => {
          setIndex(0);
          setFilters((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
        }}
      />
      {p ? (
        <div className="discover-wrap">
          <article className="discover-card">
            <Cover />
            <div className="discover-person">
              <Avatar id={p.id} size={148} />
              <span className="online-status">{p.availability}</span>
              {SAMPLE_BOOSTED_PEOPLE.includes(p.id) && (
                <span className="boost-badge">
                  <Icon name="spark" />
                  Em destaque
                </span>
              )}
              <h2>
                {p.name}, {p.age}
              </h2>
              <p>
                <Icon name="pin" />
                {p.city} · {p.area}
              </p>
              <div className="interest-tags">
                {p.interests.map((i) => (
                  <span key={i}>{i}</span>
                ))}
              </div>
              <div className="why">
                <Icon name="spark" />
                <div>
                  <h3>Por que sugerimos</h3>
                  <p>{p.why}</p>
                </div>
              </div>
            </div>
          </article>
          <div className="discover-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setIndex((i) => i + 1);
                notify("Tudo bem. Vamos conhecer outra pessoa.");
              }}
            >
              <Icon name="close" />
              Agora não
            </Button>
            <Button
              onClick={() => {
                interest(p);
                if (!p.mutual) {
                  setWaiting(true);
                  setIndex((i) => i + 1);
                }
              }}
            >
              <Icon name="heart" />
              Tenho curiosidade
            </Button>
          </div>
          <Safety person={p.id} />
          <p className="small-note">Só a cidade é compartilhada. Afinidades são opcionais.</p>
        </div>
      ) : (
        <EmptyState title="Você viu todo mundo por hoje." text="Amanhã tem gente nova.">
          {nextSteps}
        </EmptyState>
      )}
      {matchOverlay}
    </>
  );
}
function MessageList({ messages }: { messages: Message[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  return (
    <div className="message-list">
      {messages.map((m, i) => (
        <div
          className={
            "message-row " + (m.mine ? "mine" : "") + (m.text ? "" : " sticker-message-row")
          }
          key={i}
        >
          {!m.mine && <Avatar id={7} size={28} />}
          <div className="message-content">
            {m.author && <small>{m.author}</small>}
            {m.text ? (
              <p className="bubble">{m.text}</p>
            ) : (
              <>
                <ChatSticker id={m.sticker ?? 0} custom={m.custom} />
                {!m.mine && <SaveStickerButton message={m} />}
              </>
            )}
            <time className="message-time">{m.time ?? "09:41"}</time>
          </div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
function Composer({ onSend }: { onSend: (m: Message) => void }) {
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    setStickers(false);
    toggle.current?.focus();
  }
  function send(m: Message) {
    onSend({
      ...m,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });
  }
  return (
    <div
      className="chat-composer-area"
      onKeyDown={(e) => {
        if (e.key === "Escape" && stickers) close();
      }}
    >
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            send({ text: text.trim(), mine: true });
            setText("");
          }
        }}
      >
        <Button
          ref={toggle}
          variant="secondary"
          size="icon"
          type="button"
          aria-label={stickers ? "Fechar bandeja de figurinhas" : "Abrir figurinhas"}
          aria-expanded={stickers}
          onClick={() => setStickers((s) => !s)}
        >
          <Icon name="stickers" />
        </Button>
        <input
          className="input"
          aria-label="Mensagem"
          placeholder="Escreva uma mensagem"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button size="icon" aria-label="Enviar mensagem" disabled={!text.trim()}>
          <Icon name="send" />
        </Button>
      </form>
      {stickers && (
        <ChatStickerTray
          onSend={(id) => send({ sticker: id, mine: true })}
          onSendCustom={(c) => send({ custom: c, mine: true })}
          onClose={close}
        />
      )}
    </div>
  );
}
function Invite({ name, onClose }: { name: string; onClose: () => void }) {
  const { state, notify } = useFriends();
  return (
    <div className="modal-backdrop">
      <section
        className="simple-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Convidar para a tribo"
      >
        <div className="section-heading">
          <h2>Convidar {name}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar convite">
            <Icon name="close" />
          </Button>
        </div>
        {teiasFor(state).map((g) => (
          <Button
            className="invite-option"
            variant="secondary"
            key={g.id}
            onClick={() => {
              notify("Convite enviado para " + name + " entrar em " + g.name + ".");
              onClose();
            }}
          >
            <ToneIcon icon={g.icon} tone={g.tone} />
            {g.name}
            <Icon name="arrow" />
          </Button>
        ))}
      </section>
    </div>
  );
}
export function Conversations({ personId }: { personId?: number | undefined }) {
  const { cloudUser, demoMode } = useDemoSession();
  if (cloudUser && !demoMode)
    return (
      <>
        <Title title="Conversas" kicker="AMIZADES QUE CONTINUAM" />
        <DirectConversations me={cloudUser.id} />
      </>
    );
  return <DemoConversations {...(personId !== undefined ? { personId } : {})} />;
}
function DemoConversations({ personId }: { personId?: number | undefined }) {
  const { state, setState } = useFriends();
  const [invite, setInvite] = useState(false);
  const p = people.find(
    (p) => p.id === personId && hasSharedTeia(state, p.id) && !state.blocked.includes(p.id),
  );
  return (
    <>
      <Title title="Conversas" kicker="AMIZADES QUE CONTINUAM" />
      {p ? (
        <section className="chat-panel">
          <div className="chat-heading">
            <Button asChild variant="ghost" size="icon">
              <Link to="/conversas" aria-label="Voltar para conversas">
                <Icon name="back" />
              </Link>
            </Button>
            <Avatar id={p.id} size={44} />
            <div>
              <h2>{p.name}</h2>
              <span className="online-status">Tribo em comum</span>
            </div>
          </div>
          <Safety person={p.id} />
          <MessageList messages={state.messages[p.id] || []} />
          {!(state.messages[p.id] || []).length && (
            <OpenerSuggest personId={p.id} name={p.name} interests={p.interests} />
          )}
          <Composer
            onSend={(m) =>
              setState((s) => ({
                ...s,
                messages: { ...s.messages, [p.id]: [...(s.messages[p.id] || []), m] },
              }))
            }
          />
          <Button variant="secondary" className="wide" onClick={() => setInvite(true)}>
            <Icon name="users" />
            Convidar para a tribo
          </Button>
          {invite && <Invite name={p.name} onClose={() => setInvite(false)} />}
        </section>
      ) : (
        <>
          <p className="intro">A conversa continua depois do rolê.</p>
          {!people.some((p) => hasSharedTeia(state, p.id)) && (
            <EmptyState
              title="Seu primeiro oi está por vir"
              text="Conversas abrem depois de vocês participarem de um encontro na mesma tribo. Enquanto isso, um plano ou uma tribo são ótimos começos."
            >
              <Button asChild>
                <Link to="/convites">Ver planos de hoje</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/grupos" hash="teias-abertas">
                  Entrar numa tribo
                </Link>
              </Button>
            </EmptyState>
          )}
          <div className="conversation-list">
            {people
              .filter((p) => hasSharedTeia(state, p.id))
              .map((p) => (
                <Link to="/conversas" search={{ p: p.id }} className="conversation" key={p.id}>
                  <Avatar id={p.id} size={62} />
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {state.messages[p.id]?.at(-1)?.text ||
                        (state.messages[p.id]?.length
                          ? "Figurinha"
                          : "Tribo em comum. Bora dizer oi?")}
                    </p>
                  </div>
                  <Icon name="arrow" />
                </Link>
              ))}
          </div>
          <p className="small-note">
            A conversa direta fica disponível depois de um encontro na mesma tribo.
          </p>
        </>
      )}
    </>
  );
}
function GroupCard({ id }: { id: number }) {
  const { state } = useFriends();
  const g = teiaFor(state, id);
  if (!g) return null;
  return (
    <article className="group-card">
      <div className="row">
        <ToneIcon icon={g.icon} tone={g.tone} />
        <div>
          <h3>{g.name}</h3>
          <p>
            {g.mode} · {g.members} pessoas
          </p>
        </div>
      </div>
      <div className="row group-members">
        <Stack ids={g.ids} />
        <span>Belo Horizonte · {g.mode === "Online" ? "online" : "cidade aproximada"}</span>
      </div>
      <div className="progress">
        <progress max="50" value={state.points[id] ?? 0} />
      </div>
      <div className="group-card-bottom">
        <span>
          <b>{state.points[id] ?? 0}</b> / 50 pontos da tribo
        </span>
        <Button asChild variant="secondary">
          <Link to="/grupos/$id" params={{ id: String(id) }}>
            Ver tribo
            <Icon name="arrow" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
export function Groups() {
  const { cloudUser, demoMode } = useDemoSession();
  return cloudUser && !demoMode ? <RealGroups userId={cloudUser.id} /> : <DemoGroups />;
}
function RealGroups({ userId }: { userId: string }) {
  const { state, notify } = useFriends();
  const navigate = useNavigate();
  const real = useRealTeias(userId);
  const mine = real.rows.filter((r) => real.joined.includes(r.id));
  const open = sortByCity(
    real.rows.filter((r) => !real.joined.includes(r.id)),
    state.city,
  );
  return (
    <>
      <Title title="Suas tribos" kicker="SUAS TEIAS">
        <Button asChild variant="secondary">
          <Link to="/criar-grupo">
            <Icon name="plus" />
            Criar tribo
          </Link>
        </Button>
      </Title>
      <p className="intro">Um assunto em comum. Muitos encontros pela frente.</p>
      {!real.ready ? (
        <Esqueleto tipo="cartoes" />
      ) : mine.length ? (
        <div className="group-grid">
          {mine.map((r) => (
            <article className="group-card card-vivo" key={r.id}>
              <div className="row">
                <ToneIcon
                  icon={r.kind === "role" ? "pin" : "teia"}
                  tone={r.kind === "role" ? "yellow" : "teal"}
                />
                <div>
                  <h3>
                    {r.name}
                    {r.official && (
                      <span className="tribo-oficial">
                        <Icon name="check" />
                        da nommi
                      </span>
                    )}
                    {r.audience === "mulheres" && (
                      <span className="tribo-publico">espaço de mulheres</span>
                    )}
                  </h3>
                  <p>
                    {r.kind === "role" ? "Rolê aberto" : r.mode}
                    {r.city ? " · " + r.city : ""}
                    {r.when_text ? " · " + r.when_text : ""}
                    {r.member_count
                      ? " · " + r.member_count + (r.member_count === 1 ? " pessoa" : " pessoas")
                      : ""}
                  </p>
                </div>
              </div>
              <div className="group-card-bottom">
                <Button asChild variant="secondary">
                  <Link to="/grupos/$id" params={{ id: String(r.id) }}>
                    Abrir conversa
                    <Icon name="arrow" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void real.leave(r.id);
                    notify("Você saiu da tribo. Pode voltar quando quiser.");
                  }}
                >
                  Sair
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Você ainda não está numa tribo."
          text="Entre numa tribo aberta aqui embaixo ou crie a sua e chame quem você quiser."
        >
          <Button asChild>
            <Link to="/criar-grupo">
              <Icon name="plus" />
              Criar minha tribo
            </Link>
          </Button>
        </EmptyState>
      )}
      <section id="teias-abertas" className="open-teias">
        <div className="section-heading">
          <h2>Tribos abertas para entrar</h2>
        </div>
        <p className="small-note">
          {open.length
            ? "As tribos da nommi vêm primeiro. " +
              (state.city ? "Depois, as de " + state.city + ". " : "") +
              "Entre com um toque. Sair também é simples."
            : "Ainda não há outras tribos abertas. Que tal ser a primeira pessoa a criar uma?"}
        </p>
        <div className="group-grid">
          {open.map((r) => (
            <article className="group-card card-vivo" key={r.id}>
              <div className="row">
                <ToneIcon
                  icon={r.kind === "role" ? "pin" : "teia"}
                  tone={r.kind === "role" ? "yellow" : "teal"}
                />
                <div>
                  <h3>
                    {r.name}
                    {r.official && (
                      <span className="tribo-oficial">
                        <Icon name="check" />
                        da nommi
                      </span>
                    )}
                    {r.audience === "mulheres" && (
                      <span className="tribo-publico">espaço de mulheres</span>
                    )}
                  </h3>
                  <p>
                    {r.kind === "role" ? "Rolê aberto" : r.mode}
                    {r.city ? " · " + r.city : ""}
                    {r.place ? " · " + r.place : ""}
                    {r.when_text ? " · " + r.when_text : ""}
                    {r.member_count
                      ? " · " + r.member_count + (r.member_count === 1 ? " pessoa" : " pessoas")
                      : ""}
                  </p>
                </div>
              </div>
              {r.about && <p className="tribo-about">{r.about}</p>}
              {r.rule && (
                <p className="small-note">
                  <Icon name="lock" /> {r.rule}
                </p>
              )}
              {!r.official && r.creator_nickname && (
                <p className="small-note">Criada por {r.creator_nickname}</p>
              )}
              <div className="group-card-bottom">
                <BotaoDaPorta
                  me={userId}
                  teiaId={r.id}
                  entrada={r.entrada === "fechada" ? "fechada" : "aberta"}
                  meuPedido={(r.meu_pedido as MeuPedido) ?? null}
                  souMembro={!!r.i_am_member}
                  souCriadora={!!r.i_am_creator}
                  sensivel={!!r.sensivel}
                  jaConsenti={!!r.ja_consenti}
                  aoPedir={() => void real.reload()}
                  aoEntrar={async () => {
                    if (await real.join(r.id, state.nickname || "nommi")) {
                      notify("Você entrou! Diga oi para a tribo.");
                      void navigate({ to: "/grupos/$id", params: { id: String(r.id) } });
                    } else notify("Não deu para entrar agora. Tente de novo.");
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="episode-actions">
        <Button asChild variant="secondary">
          <Link to="/convites">
            <Icon name="pin" />
            Ver rolês abertos
          </Link>
        </Button>
      </div>
    </>
  );
}
function DemoGroups() {
  const { state, setState, notify } = useFriends();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "teias-abertas")
      setTimeout(
        () =>
          document
            .getElementById("teias-abertas")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        60,
      );
  }, [hash]);
  const { demoMode } = useDemoSession();
  const mine = teiasFor(state);
  function join(id: number) {
    setState((s) => joinTeia(s, id));
    notify("Você entrou! Diga oi para a tribo.");
  }
  return (
    <>
      <Title title="Suas tribos" kicker="SUAS TEIAS">
        <Button asChild variant="secondary">
          <Link to="/criar-grupo">
            <Icon name="plus" />
            Criar tribo
          </Link>
        </Button>
      </Title>
      <p className="intro">Um assunto em comum. Muitos encontros pela frente.</p>
      {mine.length ? (
        <div className="group-grid">
          {mine.map((g) => (
            <GroupCard id={g.id} key={g.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Você ainda não está numa tribo."
          text="Os encontros da sua cidade vão aparecer aqui quando as tribos compartilhadas estiverem prontas."
        />
      )}
      <section
        id="teias-abertas"
        className={"open-teias" + (hash === "teias-abertas" ? " highlight" : "")}
      >
        <div className="section-heading">
          <h2>Tribos abertas para entrar</h2>
        </div>
        <p className="small-note">
          {demoMode
            ? "Entre com um toque. Sair também é simples."
            : "Ainda não há tribos abertas publicadas. As primeiras chegam por aqui."}
        </p>
        <div className="group-grid">
          {(demoMode ? openTeias : []).map((t) => {
            const member = isMember(state, t.id);
            return (
              <article className="group-card" key={t.id}>
                <div className="row">
                  <ToneIcon icon={t.icon} tone={t.tone} />
                  <div>
                    <h3>{t.name}</h3>
                    <p>
                      {t.mode}
                      {t.moderated ? " · moderada" : ""} · {t.members} pessoas
                      {t.time ? " · " + t.time : ""}
                    </p>
                  </div>
                </div>
                {t.rule && (
                  <p className="privacy-badge">
                    <Icon name="heart" />
                    Regra da tribo: {t.rule}
                  </p>
                )}
                <div className="row group-members">
                  <Stack ids={t.ids} />
                  <span>{t.place ?? "Online"}</span>
                </div>
                <div className="group-card-bottom">
                  {member ? (
                    <>
                      <Button asChild variant="secondary">
                        <Link to="/grupos/$id" params={{ id: String(t.id) }}>
                          Abrir conversa
                          <Icon name="arrow" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setState((s) => leaveTeia(s, t.id));
                          notify("Você saiu da tribo. Pode voltar quando quiser.");
                        }}
                      >
                        Sair da tribo
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => join(t.id)}>
                      <Icon name="plus" />
                      Entrar
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="section-heading">
        <h2>Desafios e encontros</h2>
      </div>
      <div className="episode-actions">
        <Button asChild variant="secondary">
          <Link to="/check-in">
            <Icon name="pin" />
            Fazer check-in
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/lancar-desafio">
            <Icon name="spark" />
            Lançar desafio
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/conversas">
            <Icon name="chat" />
            Conversas da tribo
          </Link>
        </Button>
      </div>
      {demoMode && state.pro && (
        <Button
          onClick={() =>
            notify("O teste Pro está ativo. A criação real de tribos fica para a próxima etapa.")
          }
        >
          <Icon name="plus" />
          Nova tribo Pro
        </Button>
      )}
    </>
  );
}
export function GroupDetail({ id }: { id: number }) {
  const { state, setState, notify } = useFriends();
  const { demoMode, cloudUser } = useDemoSession();
  const cloud = !!cloudUser && !demoMode;
  const shared = useSharedTeia(
    id,
    cloud ? (cloudUser?.id ?? null) : null,
    state.nickname || "nommi",
  );
  const realTeia = useRealTeia(id, cloud && id >= 100000);
  const covers = useTeiaCovers(cloud && id >= 100000 ? id : null);
  // Entrou na tribo: daqui para trás está tudo lido, e o Início para de marcar novo.
  useEffect(() => {
    if (cloud && id >= 100000) void marcarTriboVista(id);
  }, [cloud, id]);
  const amCreator = !!cloudUser && realTeia.row?.created_by === cloudUser.id;
  const g =
    (cloud && realTeia.row
      ? { ...toTeia(realTeia.row), members: shared.members.length }
      : undefined) ?? (demoMode ? teiaFor(state, id) : undefined);
  const member = cloud ? shared.joined : isMember(state, id);
  const [joining, setJoining] = useState(false);
  const [kind, setKind] = useState("Karaokê");
  const [points, setPoints] = useState(20);
  const [partner, setPartner] = useState(0);
  if (cloud && id >= 100000 && !realTeia.ready) return <Esqueleto tipo="perfil" />;
  if (!g || (!demoMode && !cloud && !isMember(state, id)))
    return (
      <EmptyState
        title="Esta tribo não está disponível."
        text="As tribos da apresentação não são tribos entre contas reais."
      />
    );
  function checkIn(challengeId: number) {
    const code = "CHK-" + challengeId + "-4821";
    setState((s) => ({
      ...s,
      challenges: s.challenges.map((c) =>
        c.id === challengeId ? { ...c, status: "pending", code } : c,
      ),
    }));
    notify("Check-in enviado: " + code + ". Aguardando confirmação do Anfitrião.");
  }
  async function enter() {
    if (joining) return;
    if (cloud) {
      setJoining(true);
      try {
        const ok = await shared.join();
        notify(
          ok ? "Você entrou! Diga oi para a tribo." : "Não deu para entrar agora. Tente de novo.",
        );
      } finally {
        setJoining(false);
      }
      return;
    }
    setState((s) => joinTeia(s, id));
    notify("Você entrou! Diga oi para a tribo.");
  }
  return (
    <>
      <Button asChild variant="ghost" className="back-link">
        <Link to="/grupos">
          <Icon name="back" />
          Suas tribos
        </Link>
      </Button>
      <CommunityDetail
        tribo={g}
        member={member}
        demoMode={demoMode}
        nickname={state.nickname}
        members={shared.members}
        onJoin={() => void enter()}
        joining={joining}
        firstMessage={state.groupMessages[id]?.find((m) => m.text)?.text}
        events={
          <>
            {cloud && cloudUser && realTeia.row?.kind === "role" && (
              <PresencaDoRole
                me={cloudUser.id}
                roleId={id}
                startsAt={realTeia.row?.starts_at ?? null}
                souOrganizadora={realTeia.row?.i_am_creator === true}
                euVou={realTeia.row?.i_am_going === true}
              />
            )}
            <div className="goal-band">
              <div className="row">
                <Icon name="gift" />
                <h2>Próxima parada: day spa</h2>
                <b>{state.points[id] ?? 0} / 50</b>
              </div>
              <progress max="50" value={state.points[id] ?? 0} />
              <p>
                {(state.points[id] ?? 0) >= 50
                  ? "Bônus liberado: day spa com a tribo!"
                  : "Mais " +
                    (50 - (state.points[id] ?? 0)) +
                    " pontos para o dia de beleza com a tribo."}
              </p>
            </div>
            <section>
              <FirstMeetNotice />
              <h2>Desafios da tribo</h2>
              {state.challenges
                .filter((c) => c.group === id)
                .map((c) => (
                  <article className="challenge" key={c.id}>
                    <ToneIcon icon={getPartner(c.partner).icon} tone={getPartner(c.partner).tone} />
                    <div>
                      <h3>{c.name}</h3>
                      <p>
                        +{c.points} pontos · {getPartner(c.partner).name}
                      </p>
                      {c.code && (
                        <small>
                          Código: <b>{c.code}</b>
                        </small>
                      )}
                    </div>
                    <Button
                      variant={c.status === "open" ? "default" : "secondary"}
                      disabled={c.status !== "open"}
                      onClick={() => checkIn(c.id)}
                    >
                      {c.status === "open"
                        ? "Check-in"
                        : c.status === "pending"
                          ? "Aguardando"
                          : "Confirmado"}
                    </Button>
                  </article>
                ))}
              {!state.challenges.some((c) => c.group === id) && (
                <p>Ainda não há desafios. Que tal combinar o primeiro?</p>
              )}
              <form
                className="challenge-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setState((s) => ({
                    ...s,
                    challenges: [
                      ...s.challenges,
                      {
                        id: Math.max(0, ...s.challenges.map((c) => c.id)) + 1,
                        group: id,
                        name: kind + " da tribo",
                        points,
                        partner,
                        status: "open",
                      },
                    ],
                  }));
                  notify("Desafio lançado! Já está na lista da tribo.");
                }}
              >
                <h3>Lançar novo desafio</h3>
                <Chips
                  items={["Karaokê", "Vinho", "Day spa", "Trilha"]}
                  selected={[kind]}
                  onSelect={setKind}
                />
                <div className="point-control">
                  <span>Pontos</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Diminuir pontos"
                    disabled={points <= 10}
                    onClick={() => setPoints((p) => p - 10)}
                  >
                    −
                  </Button>
                  <b>{points}</b>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Aumentar pontos"
                    disabled={points >= 40}
                    onClick={() => setPoints((p) => p + 10)}
                  >
                    <Icon name="plus" />
                  </Button>
                </div>
                <label>
                  Anfitrião associado
                  <select
                    className="input"
                    value={partner}
                    onChange={(e) => setPartner(Number(e.target.value))}
                  >
                    {partners.map((p, i) => (
                      <option value={i} key={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className="wide">
                  <Icon name="spark" />
                  Lançar desafio
                </Button>
              </form>
            </section>
          </>
        }
        secrets={
          cloud && cloudUser ? (
            <TribeSecrets
              me={cloudUser.id}
              triboId={id}
              isMember={member}
              nickname={state.nickname || "nommi"}
              canPost={realTeia.row?.i_can_post !== false}
            />
          ) : undefined
        }
        pedidos={
          amCreator && cloudUser ? (
            <PedidosDaTribo teiaId={id} souCriadora={amCreator} />
          ) : undefined
        }
        coverPath={covers.cover}
        coverEditor={
          amCreator && cloudUser ? (
            <CoverEditor
              target={{ kind: "teia", teiaId: id, userId: cloudUser.id }}
              slot="cover"
              current={covers.cover}
              onSaved={covers.setCover}
              label="Trocar capa"
            />
          ) : undefined
        }
        posts={
          cloud ? (
            <Feed
              me={cloudUser!.id}
              nickname={state.nickname || "nommi"}
              scope={{ teiaId: id }}
              emptyTitle="Ainda não há posts nesta tribo."
              emptyText="Publique o primeiro e chame a tribo para a conversa."
            />
          ) : undefined
        }
        conversation={
          <>
            {member ? (
              <section className="group-chat">
                <h2>Conversa da tribo</h2>
                {cloud && (
                  <p className="intro">
                    {shared.members.length === 1
                      ? "Só você por enquanto. Chame alguém!"
                      : shared.members.length + " nommi nesta tribo, em qualquer celular."}
                  </p>
                )}
                <MessageList messages={cloud ? shared.messages : state.groupMessages[id] || []} />
                <Composer
                  onSend={(m) => {
                    if (cloud) {
                      if (m.custom) {
                        notify("Figurinhas criadas por você ainda ficam só neste aparelho.");
                        return;
                      }
                      void shared.send(m).then((ok) => {
                        if (!ok)
                          notify("Não deu para enviar. Confira a internet e tente de supabase.");
                      });
                      return;
                    }
                    setState((s) => ({
                      ...s,
                      groupMessages: {
                        ...s.groupMessages,
                        [id]: [...(s.groupMessages[id] || []), m],
                      },
                    }));
                  }}
                />
                <div className="safety-actions">
                  <Button
                    variant="ghost"
                    onClick={() => notify("Denúncia da tribo registrada nesta demonstração.")}
                  >
                    <Icon name="flag" />
                    Denunciar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      notify("Notificações e convites desta tribo bloqueados nesta demonstração.")
                    }
                  >
                    <Icon name="block" />
                    Bloquear
                  </Button>
                </div>
              </section>
            ) : (
              <section className="group-chat">
                <h2>Conversa da tribo</h2>
                <EmptyState
                  title="Entre para ver a conversa."
                  text={
                    "Entrar é um toque, sem aprovação." +
                    (g.rule ? " Regra da tribo: " + g.rule + "." : "")
                  }
                >
                  <Button onClick={() => void enter()} disabled={joining}>
                    <Icon name="plus" />
                    Entrar
                  </Button>
                </EmptyState>
              </section>
            )}
          </>
        }
      />
    </>
  );
}
