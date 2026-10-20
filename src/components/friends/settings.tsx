import { createRealTeia } from "@/lib/real-teias";
import { createRole, MIN_CAPACITY, MAX_CAPACITY } from "@/lib/roles";
import { saveCloudProfile } from "@/lib/real-profiles";
import { hasSharedTeia, teiasFor } from "@/lib/teias";
import { resizePhoto } from "@/lib/photo-resize";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setShowCounts } from "@/lib/follows";
import { CoverEditor } from "./cover-editor";
import { novo } from "@/lib/cloud-novo";
import { coverStyle } from "@/lib/covers";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Avatar, Icon, Sticker } from "./art";
import { Sheet, EmptyState } from "./surfaces";
import { useFriends } from "./store";
import { useDemoSession } from "./session";
import { PrivacyControls, ProfileModeSetting } from "./privacy";
import { emptyState, people, groups, partners } from "@/lib/friends-data";
import { ageOn, profileSchema } from "@/lib/nomi-validation";
function MyCovers({ me }: { me: string }) {
  const [cover, setCover] = useState("");
  const [bg, setBg] = useState("");
  useEffect(() => {
    void novo
      .from("profiles")
      .select("cover_path,background_path")
      .eq("id", me)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as { cover_path?: string; background_path?: string } | null;
        setCover(d?.cover_path ?? "");
        setBg(d?.background_path ?? "");
      });
  }, [me]);
  return (
    <section className="cover-settings">
      <h2 className="settings-subtitle">Capa e plano de fundo</h2>
      <div className="cover-preview" style={coverStyle(cover)}>
        {!cover && <span>Capa padrão da nommi</span>}
      </div>
      <CoverEditor
        target={{ kind: "perfil", userId: me }}
        slot="cover"
        current={cover}
        onSaved={setCover}
      />
      <div className="cover-preview" style={coverStyle(bg)}>
        {!bg && <span>Fundo padrão da nommi</span>}
      </div>
      <CoverEditor
        target={{ kind: "perfil", userId: me }}
        slot="background"
        current={bg}
        onSaved={setBg}
      />
      <p className="small-note">
        A capa aparece no topo do seu perfil. O plano de fundo aparece atrás das suas conversas.
      </p>
    </section>
  );
}
function ShowCountsToggle({ me }: { me: string }) {
  const { notify } = useFriends();
  const [on, setOn] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void supabase
      .from("profiles")
      .select("show_counts")
      .eq("id", me)
      .maybeSingle()
      .then(({ data }) => {
        setOn((data as { show_counts?: boolean } | null)?.show_counts !== false);
        setReady(true);
      });
  }, [me]);
  return (
    <div className="setting-toggle">
      <div>
        <h2>Mostrar meus números no perfil</h2>
        <p>Seguidores, amigos, teias e posts. Você sempre vê os seus.</p>
      </div>
      <input
        aria-label="Mostrar meus números no perfil"
        type="checkbox"
        disabled={!ready}
        checked={on}
        onChange={async (e) => {
          const v = e.target.checked;
          setOn(v);
          const ok = await setShowCounts(me, v);
          notify(
            ok
              ? v
                ? "Seus números voltaram a aparecer."
                : "Seus números ficaram só para você."
              : "Não deu para salvar agora.",
          );
          if (!ok) setOn(!v);
        }}
      />
    </div>
  );
}
export function Settings({ section }: { section: string }) {
  const { state, setState, notify } = useFriends();
  const { erase, signOut, cloudUser, demoMode } = useDemoSession();
  const cloud = !!cloudUser && !demoMode;
  const navigate = useNavigate();
  const [name, setName] = useState(state.nickname);
  const [city, setCity] = useState(state.city);
  const [about, setAbout] = useState(state.about ?? "");
  const [confirm, setConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="settings-page">
      <Button asChild variant="ghost" className="back-link">
        <Link to="/perfil">
          <Icon name="back" />
          Meu nommi
        </Link>
      </Button>
      <h1>
        {section === "privacidade"
          ? "Sua privacidade"
          : section === "seguranca"
            ? "Segurança e bloqueios"
            : "Editar perfil"}
      </h1>
      <div className="settings-tabs">
        <Button asChild variant={section === "perfil" ? "default" : "secondary"}>
          <Link to="/configuracoes" search={{ section: "perfil" }}>
            Perfil
          </Link>
        </Button>
        <Button asChild variant={section === "privacidade" ? "default" : "secondary"}>
          <Link to="/configuracoes" search={{ section: "privacidade" }}>
            Privacidade
          </Link>
        </Button>
        <Button asChild variant={section === "seguranca" ? "default" : "secondary"}>
          <Link to="/configuracoes" search={{ section: "seguranca" }}>
            Segurança
          </Link>
        </Button>
      </div>
      {section === "perfil" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const result = profileSchema.safeParse({ nickname: name, city });
            if (!result.success) {
              setError(result.error.issues[0]?.message || "Confira seus dados.");
              return;
            }
            const extra = { about: about.trim().slice(0, 140) };
            if (cloud) {
              void saveCloudProfile(cloudUser!.id, { ...result.data, ...extra }).then((ok) => {
                if (ok) {
                  setState((s) => ({ ...s, ...result.data, ...extra }));
                  notify("Perfil salvo. Já aparece em todos os seus aparelhos.");
                } else setError("Não deu para salvar agora. Confira a internet.");
              });
              setError("");
              return;
            }
            setState((s) => ({ ...s, ...result.data, ...extra }));
            notify("Perfil atualizado!");
            setError("");
          }}
        >
          <div className="photo-upload">
            {state.photo ? (
              <img src={state.photo} alt="Sua foto de perfil" />
            ) : (
              <Avatar id={3} size={96} />
            )}
            <label className="photo-label">
              Trocar foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Trocar foto de perfil"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 2097152) {
                    setError("Escolha uma foto JPG, PNG ou WebP de até 2 MB.");
                    return;
                  }
                  resizePhoto(file)
                    .then(async (photo) => {
                      if (cloud) {
                        if (!(await saveCloudProfile(cloudUser!.id, { avatar_url: photo }))) {
                          setError("Não deu para salvar a foto. Tente outra menor.");
                          return;
                        }
                      }
                      setState((s) => ({ ...s, photo }));
                      notify(
                        cloud
                          ? "Foto salva em todos os seus aparelhos."
                          : "Foto atualizada neste navegador.",
                      );
                    })
                    .catch(() => setError("Não foi possível ler essa foto."));
                }}
              />
            </label>
            {state.photo && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (cloud) void saveCloudProfile(cloudUser!.id, { avatar_url: "" });
                  setState((s) => ({ ...s, photo: "" }));
                }}
              >
                Usar avatar ilustrado
              </Button>
            )}
          </div>
          <label>
            Apelido
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </label>
          <label>
            Cidade
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
            />
          </label>
          <label>
            Sobre mim <small>opcional</small>
            <textarea
              className="input"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="Uma frase sobre você"
            />
          </label>
          <p className="small-note">{about.length}/140</p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button className="wide">
            <Icon name="check" />
            Salvar alterações
          </Button>
        </form>
      )}
      {section === "perfil" && cloud && <MyCovers me={cloudUser!.id} />}
      {section === "privacidade" && (
        <>
          <ProfileModeSetting />
          <PrivacyControls />
          <div className="setting-toggle">
            <div>
              <h2>Mostrar só a cidade</h2>
              <p>Nunca mostramos endereço ou localização exata.</p>
            </div>
            <input
              aria-label="Mostrar só a cidade"
              type="checkbox"
              checked={state.cityOnly}
              onChange={(e) => {
                setState((s) => ({ ...s, cityOnly: e.target.checked }));
                notify("Privacidade atualizada.");
              }}
            />
          </div>
          {cloud && <ShowCountsToggle me={cloudUser!.id} />}
          <div className="setting-toggle">
            <div>
              <h2>Mural com aprovação</h2>
              <p>Você escolhe quais figurinhas aparecem.</p>
            </div>
            <input
              aria-label="Mural com aprovação"
              type="checkbox"
              checked={state.wallApproval}
              onChange={(e) => {
                setState((s) => ({ ...s, wallApproval: e.target.checked }));
                notify("Preferência do mural atualizada.");
              }}
            />
          </div>
          <div className="entry-tip">
            <Icon name="lock" />
            <p>Seus dados de demonstração ficam neste navegador. Nenhuma localização é coletada.</p>
          </div>
          <Button asChild variant="secondary" className="wide">
            <Link to="/privacidade">
              Ler Política de Privacidade
              <Icon name="arrow" />
            </Link>
          </Button>
        </>
      )}
      {section === "seguranca" && (
        <>
          <h2 className="settings-subtitle">Pessoas bloqueadas</h2>
          {state.blocked.length ? (
            people
              .filter((p) => state.blocked.includes(p.id))
              .map((p) => (
                <div className="blocked-person" key={p.id}>
                  <Avatar id={p.id} size={48} />
                  <h3>{p.name}</h3>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setState((s) => ({ ...s, blocked: s.blocked.filter((id) => id !== p.id) }));
                      notify(
                        p.name +
                          " não está mais na sua lista de bloqueios. A conversa exige um encontro na mesma teia.",
                      );
                    }}
                  >
                    Desbloquear
                  </Button>
                </div>
              ))
          ) : (
            <EmptyState
              title="Seu círculo está tranquilo."
              text="Nenhuma pessoa bloqueada. Você sempre pode denunciar ou bloquear em Descobrir e nas conversas."
            />
          )}
          <div className="security-note">
            <Icon name="lock" />
            <p>Contas reais usam acesso protegido. A apresentação não salva senhas.</p>
          </div>
          <Button
            variant="secondary"
            className="wide"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            <Icon name="logout" />
            Sair
          </Button>
          <Button variant="ghost" className="wide danger-text" onClick={() => setConfirm(true)}>
            <Icon name="trash" />
            Limpar dados deste aparelho
          </Button>
        </>
      )}
      {confirm && (
        <Sheet title="Limpar dados deste aparelho?" onClose={() => setConfirm(false)}>
          <div className="delete-confirm">
            <Sticker id={4} size={96} />
            <p>
              Esta ação limpa os dados deste aparelho e encerra a sessão. Não exclui a conta real.
            </p>
            <label>
              Digite EXCLUIR para confirmar
              <input
                className="input"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                maxLength={10}
              />
            </label>
            <Button
              className="wide"
              disabled={confirmation !== "EXCLUIR"}
              onClick={() => {
                setState(emptyState);
                erase();
                setConfirm(false);
                navigate({ to: "/", replace: true });
              }}
            >
              Limpar dados deste aparelho
            </Button>
            <Button className="wide" variant="secondary" onClick={() => setConfirm(false)}>
              Manter minha conta
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
export function Notifications() {
  const { state } = useFriends();
  const pendingWall = state.wall.filter((w) => w.status === "pending").length;
  const pendingCheck = state.challenges.filter((c) => c.status === "pending");
  const newMatches = people.filter(
    (p) =>
      hasSharedTeia(state, p.id) &&
      !state.blocked.includes(p.id) &&
      (state.messages[String(p.id)] ?? []).length === 0,
  );
  const invited = (state.invites ?? []).filter((i) => i.invitedMe && !i.joined.includes(3));
  const empty = !pendingWall && !pendingCheck.length && !newMatches.length && !invited.length;
  return (
    <>
      <h1>Notificações</h1>
      <p className="intro">Pequenos convites para grandes histórias.</p>
      {empty ? (
        <EmptyState
          title="Tudo tranquilo por aqui."
          text="Quando alguém quiser conversar, deixar uma figurinha ou te chamar para um plano, aparece aqui."
        >
          <Button asChild variant="secondary">
            <Link to="/convites">Ver planos de hoje</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="activity-list">
          {newMatches.map((p) => (
            <Link key={p.id} className="activity" to="/conversas" search={{ p: p.id }}>
              <span className="tone-icon red">
                <Icon name="heart" />
              </span>
              <div>
                <h3>Teia em comum com {p.name.split(" ")[0]}</h3>
                <p>A conversa já está aberta.</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
          {pendingWall > 0 && (
            <Link className="activity" to="/perfil">
              <span className="tone-icon yellow">
                <Icon name="star" />
              </span>
              <div>
                <h3>
                  {pendingWall === 1
                    ? "Uma figurinha espera sua aprovação"
                    : pendingWall + " figurinhas esperam sua aprovação"}
                </h3>
                <p>Veja no seu mural.</p>
              </div>
              <Icon name="arrow" />
            </Link>
          )}
          {pendingCheck.map((c) => (
            <Link key={c.id} className="activity" to="/grupos/$id" params={{ id: String(c.group) }}>
              <span className="tone-icon blue">
                <Icon name="users" />
              </span>
              <div>
                <h3>Check-in aguardando: {c.name}</h3>
                <p>O Anfitrião ainda vai confirmar.</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
          {invited.map((i) => (
            <Link key={i.id} className="activity" to="/convites">
              <span className="tone-icon teal">
                <Icon name="gift" />
              </span>
              <div>
                <h3>Convite: {i.title}</h3>
                <p>{i.date}</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
export function Legal({ kind }: { kind: "terms" | "privacy" | "help" }) {
  return (
    <div className="legal-page">
      <Button asChild variant="ghost" className="back-link">
        <Link to="/perfil">
          <Icon name="back" />
          Voltar ao Nommi
        </Link>
      </Button>
      <div className="legal-art">
        <Sticker id={kind === "help" ? 4 : 0} size={88} />
      </div>
      <h1>
        {kind === "terms"
          ? "Termos de Uso"
          : kind === "privacy"
            ? "Política de Privacidade"
            : "Como podemos ajudar?"}
      </h1>
      <p className="legal-disclaimer">
        {kind === "help"
          ? "Cuidar das amizades também é cuidar de você."
          : "Texto demonstrativo. A versão final precisa de revisão jurídica antes do lançamento."}
      </p>
      {kind === "terms" ? (
        <>
          <h2>Um espaço para amizade</h2>
          <p>
            O Nommi é destinado a pessoas com 18 anos ou mais. Respeito, consentimento e cuidado
            devem fazer parte de todos os encontros.
          </p>
          <h2>Esta demonstração</h2>
          <p>
            Perfis, Anfitriões, conversas e benefícios são exemplos. Os exemplos pertencem à
            apresentação. Contas reais usam confirmação por e-mail. Recompensas com estrelas ainda
            não permitem resgates.
          </p>
          <h2>Convivência e segurança</h2>
          <p>
            Não publique conteúdo ofensivo ou dados sensíveis de outras pessoas. Você pode denunciar
            e bloquear contatos nas conversas e em Descobrir.
          </p>
          <h2>Encontros e benefícios</h2>
          <p>
            Pontos pertencem à teia e só são liberados após a confirmação simulada de uma visita.
            Combine encontros em locais públicos e cuide da sua segurança.
          </p>
        </>
      ) : kind === "privacy" ? (
        <>
          <h2>O que fica neste navegador</h2>
          <p>
            Apelido, cidade, data de nascimento, preferências, foto opcional, conversas simuladas e
            uma sessão de demonstração podem ser salvos localmente. Senhas não são salvas.
          </p>
          <h2>Localização aproximada</h2>
          <p>
            O perfil mostra somente a cidade informada por você, ou oculta a cidade quando você
            desativa essa preferência.
          </p>
          <h2>Radar nommi</h2>
          <p>
            O Radar nommi só funciona quando você o liga, e só depois de você autorizar a
            localização no aparelho. Nesse momento guardamos uma posição arredondada para cerca de 1
            km, o nome do lugar que você escreveu e a cidade, para calcular quem está por perto. Sua
            localização exata nunca é salva nem mostrada: outras pessoas veem apenas a distância
            aproximada, nunca o ponto onde você está.
          </p>
          <p>
            Esses dados valem pelo tempo que você escolher, de 15 minutos a 4 horas, e são apagados
            quando esse tempo acaba ou quando você sai do radar. Quem bloqueou você, ou foi
            bloqueado por você, nunca aparece no radar. Perfis privados também ficam de fora.
          </p>
          <h2>Fotos, vídeos e stories</h2>
          <p>
            Fotos e vídeos de posts e stories ficam em um espaço privado e só são servidos a quem
            tem permissão para ver aquele conteúdo. Stories somem sozinhos em 24 horas. Capas e
            planos de fundo ficam em um espaço público, porque aparecem no seu perfil.
          </p>
          <h2>Seu controle</h2>
          <p>
            Você pode editar o perfil, escolher a aprovação de figurinhas, bloquear pessoas ou
            apagar todos os dados locais em Segurança e bloqueios.
          </p>
          <h2>Serviços externos</h2>
          <p>
            Contas reais usam Lovable Cloud. Conversas e teias compartilhadas ainda aguardam
            integração; a apresentação guarda simulações neste aparelho.
          </p>
        </>
      ) : (
        <>
          <details open>
            <summary>Como começa uma conversa?</summary>
            <p>
              A conversa direta abre depois de duas pessoas participarem de um encontro na mesma
              teia.
            </p>
          </details>
          <details>
            <summary>Como a teia ganha pontos?</summary>
            <p>
              O check-in gera um código. Depois da confirmação pelo Anfitrião, os pontos vão para a
              teia.
            </p>
          </details>
          <details>
            <summary>Como denunciar ou bloquear?</summary>
            <p>
              Use os botões visíveis em Descobrir ou na conversa. Gerencie os bloqueios no menu do
              perfil.
            </p>
          </details>
          <details>
            <summary>Como confirmar meu e-mail?</summary>
            <p>
              O cadastro real envia um link de confirmação. Confira a caixa de spam e se o endereço
              foi digitado corretamente.
            </p>
          </details>
          <div className="help-cvv">
            <Icon name="heart" />
            <h2>Você não precisa passar por tudo sem companhia.</h2>
            <p>O Nommi não substitui apoio psicológico. Para apoio emocional, ligue 188 (CVV).</p>
            <Button asChild>
              <a href="tel:188">Ligar 188</a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function CreateChallenge() {
  const { state, setState, notify } = useFriends();
  const navigate = useNavigate();
  const mine = teiasFor(state);
  const [chosenGroup, setGroup] = useState<number | null>(null);
  const group = mine.some((t) => t.id === chosenGroup) ? chosenGroup : mine[0]?.id;
  const [type, setType] = useState("Karaokê");
  const [points, setPoints] = useState(20);
  const [partner, setPartner] = useState(0);
  return (
    <div className="action-page">
      <h1>Lançar desafio</h1>
      <p className="intro">Um plano simples para juntar a teia.</p>
      <Sticker id={3} size={96} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (group === undefined || group === null) return;
          setState((s) => ({
            ...s,
            challenges: [
              ...s.challenges,
              {
                id: Math.max(0, ...s.challenges.map((c) => c.id)) + 1,
                group,
                name: type + " da teia",
                points,
                partner,
                status: "open",
              },
            ],
          }));
          notify("Desafio lançado!");
          navigate({ to: "/grupos/$id", params: { id: String(group) } });
        }}
      >
        <label>
          Teia
          <select
            className="input"
            value={group ?? ""}
            onChange={(e) => setGroup(Number(e.target.value))}
          >
            {teiasFor(state).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Tipo de encontro</legend>
          <div className="chips">
            {["Karaokê", "Vinho", "Day spa", "Trilha"].map((t) => (
              <Button
                type="button"
                key={t}
                variant={type === t ? "default" : "secondary"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </fieldset>
        <label>
          Pontos da teia
          <select
            className="input"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          >
            {[10, 20, 30, 40].map((p) => (
              <option key={p} value={p}>
                {p} pontos
              </option>
            ))}
          </select>
        </label>
        <label>
          Anfitrião associado
          <select
            className="input"
            value={partner}
            onChange={(e) => setPartner(Number(e.target.value))}
          >
            {partners.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button className="wide" disabled={group === undefined}>
          <Icon name="spark" />
          Lançar desafio
        </Button>
      </form>
    </div>
  );
}
export function CreateGroup() {
  const { state, setState, notify } = useFriends();
  const { demoMode, cloudUser } = useDemoSession();
  const navigate = useNavigate();
  const [kind, setKind] = useState<"teia" | "role">("teia");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("Presencial");
  const [city, setCity] = useState(state.city);
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [limited, setLimited] = useState(false);
  const [capacity, setCapacity] = useState(6);
  const [busy, setBusy] = useState(false);
  const real = !!cloudUser && !demoMode;
  const isRole = kind === "role";
  return (
    <div className="action-page">
      <h1>{isRole ? "Criar um rolê" : "Criar minha teia"}</h1>
      <p className="intro">
        {isRole
          ? "Marque dia, lugar e quantas pessoas cabem."
          : "Pode começar pequeno. Duas cadeiras já são uma roda."}
      </p>
      <div className="action-art">
        <Avatar id={7} size={80} />
        <Avatar id={3} size={104} />
        <Avatar id={4} size={80} />
      </div>
      {!demoMode && !cloudUser ? (
        <EmptyState
          title="Entre na sua conta para criar."
          text="Assim todo mundo que entrar vê a mesma conversa."
        />
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim().length < 3) {
              notify("Dê um nome de pelo menos 3 letras.");
              return;
            }
            if (real) {
              if (city.trim().length < 2) {
                notify(isRole ? "Diga a cidade do rolê." : "Diga a cidade da teia.");
                return;
              }
              const when = startsAt ? new Date(startsAt) : null;
              if (isRole && when && when.getTime() <= Date.now()) {
                notify("Escolha uma data que ainda vai acontecer.");
                return;
              }
              setBusy(true);
              const id = isRole
                ? await createRole(cloudUser!.id, state.nickname || "nommi", {
                    name,
                    city,
                    place,
                    mode,
                    startsAt: when,
                    capacity: limited ? capacity : null,
                  })
                : await createRealTeia(
                    { kind: "teia", name, mode, city, place },
                    cloudUser!.id,
                    state.nickname || "nommi",
                  );
              setBusy(false);
              if (!id) {
                notify("Não deu para criar agora. Tente de novo.");
                return;
              }
              notify(
                isRole
                  ? "Rolê criado! Agora é só chamar a galera."
                  : "Teia criada! Agora chame sua turma.",
              );
              void navigate({ to: "/grupos/$id", params: { id: String(id) } });
              return;
            }
            const id = Date.now();
            setState((s) => ({
              ...s,
              createdTeias: [
                ...(s.createdTeias ?? []),
                {
                  id,
                  name: name.trim(),
                  mode,
                  members: 1,
                  ids: [3],
                  icon: isRole ? "pin" : "teia",
                  tone: isRole ? "yellow" : "teal",
                  host: s.nickname,
                  place: s.city,
                },
              ],
              joinedTeias: [...(s.joinedTeias ?? []), id],
            }));
            notify("Criado nesta apresentação.");
            void navigate({ to: "/grupos/$id", params: { id: String(id) } });
          }}
        >
          {real && (
            <div className="settings-tabs">
              <Button
                type="button"
                variant={kind === "teia" ? "default" : "secondary"}
                onClick={() => setKind("teia")}
              >
                <Icon name="teia" />
                Teia
              </Button>
              <Button
                type="button"
                variant={kind === "role" ? "default" : "secondary"}
                onClick={() => setKind("role")}
              >
                <Icon name="pin" />
                Rolê
              </Button>
            </div>
          )}
          <label>
            {isRole ? "Nome do rolê" : "Nome da teia"}
            <input
              className="input"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Como vocês se encontram?
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {["Presencial", "Online", "Híbrido"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {real && (
            <label>
              Cidade
              <input
                className="input"
                value={city}
                maxLength={80}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </label>
          )}
          {real && (
            <label>
              Lugar <small>opcional</small>
              <input
                className="input"
                value={place}
                maxLength={80}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Bairro, praça, bar…"
              />
            </label>
          )}
          {real && isRole && (
            <>
              <label>
                Dia e hora <small>opcional</small>
                <input
                  className="input"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>
              <div className="setting-toggle">
                <div>
                  <h2>Limitar vagas</h2>
                  <p>Quando lotar, ninguém mais consegue dizer “Quero ir”.</p>
                </div>
                <input
                  aria-label="Limitar vagas"
                  type="checkbox"
                  checked={limited}
                  onChange={(e) => setLimited(e.target.checked)}
                />
              </div>
              {limited && (
                <label>
                  Quantas pessoas cabem
                  <input
                    className="input"
                    type="number"
                    min={MIN_CAPACITY}
                    max={MAX_CAPACITY}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </label>
              )}
            </>
          )}
          <Button className="wide" disabled={busy}>
            <Icon name={isRole ? "pin" : "teia"} />
            {busy ? "Criando…" : isRole ? "Criar rolê" : "Criar teia"}
          </Button>
        </form>
      )}
    </div>
  );
}
export function InviteFriend() {
  const { state, notify } = useFriends();
  const [copied, setCopied] = useState(false);
  return (
    <div className="action-page">
      <h1>Convidar uma amizade</h1>
      <p className="intro">Você já sabe quem tem que estar nessa história.</p>
      <div className="action-art">
        <Sticker id={0} size={112} />
        <Sticker id={5} size={112} />
      </div>
      <blockquote>Vem para o Nommi! Um lugar para conversar, combinar e continuar.</blockquote>
      <Button
        className="wide"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              "Vem para o Nommi! Amizades para conversar, combinar e continuar. " +
                window.location.origin,
            );
            setCopied(true);
            notify("Convite copiado!");
          } catch {
            notify("Não foi possível copiar. Você pode selecionar o texto do convite acima.");
          }
        }}
      >
        <Icon name="link" />
        {copied ? "Convite copiado" : "Copiar convite"}
      </Button>
      <h2 className="settings-subtitle">Convidar uma amizade para sua teia</h2>
      {teiasFor(state).map((g) => (
        <Button
          variant="secondary"
          className="wide"
          key={g.id}
          onClick={() => notify("Convite para " + g.name + " preparado nesta demonstração.")}
        >
          <Icon name="users" />
          {g.name}
          <Icon name="arrow" />
        </Button>
      ))}
    </div>
  );
}
