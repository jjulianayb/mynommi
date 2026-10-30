import { createRealTeia } from "@/lib/real-teias";
import { createRole, MIN_CAPACITY, MAX_CAPACITY } from "@/lib/roles";
import { saveCloudProfile } from "@/lib/real-profiles";
import { hasSharedTeia, teiasFor } from "@/lib/tribos";
import { resizePhoto } from "@/lib/photo-resize";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setShowCounts } from "@/lib/follows";
import { CoverEditor } from "./cover-editor";
import { coverStyle } from "@/lib/covers";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SemFoto, Avatar, Icon, Sticker } from "./art";
import { Sheet, EmptyState } from "./surfaces";
import { useFriends } from "./store";
import { useDemoSession } from "./session";
import { PrivacyControls, ProfileModeSetting } from "./privacy";
import { emptyState, people, groups, partners } from "@/lib/friends-data";
import { ageOn, profileSchema } from "@/lib/nomi-validation";
import { PRAZOS, RESPONSAVEL, VERSAO_DOS_TEXTOS, quemResponde } from "@/lib/politica";
import { MeusDireitos } from "./meus-dados";
import { apagarFotoAntiga, enviarFotoDePerfil, recadoDaFoto } from "@/lib/foto-perfil";
import { MAX_SOBRE } from "@/lib/perfil-texto";
import { FotoInstantanea } from "./foto-instantanea";
import { recadoDoEnvio } from "@/lib/foto";
import { FIGURAS, type Figura } from "@/lib/sem-foto";
function MyCovers({ me }: { me: string }) {
  const [cover, setCover] = useState("");
  const [bg, setBg] = useState("");
  useEffect(() => {
    void supabase
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
        <p>Seguidores, amigos, tribos e posts. Você sempre vê os seus.</p>
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
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [figura, setFigura] = useState<Figura>("neutro");
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
          <div className={"photo-upload" + (enviandoFoto ? " enviando" : "")}>
            {state.photo ? (
              <img src={state.photo} alt="Sua foto de perfil" />
            ) : (
              <SemFoto size={96} />
            )}
            <FotoInstantanea
              onPronta={async (jpeg) => {
                // A foto aparece já; o envio acontece atrás, e só fala se falhar.
                setState((s) => ({ ...s, photo: jpeg }));
                setError("");
                if (!cloud) {
                  notify("Foto atualizada neste navegador.");
                  return;
                }
                setEnviandoFoto(true);
                // A foto vira arquivo no armazenamento. Se o envio do arquivo
                // falhar, ainda tentamos guardar embutido: melhor a foto feia
                // por dentro do que a pessoa sem foto nenhuma.
                const anterior = state.photo;
                const caminho = await enviarFotoDePerfil(cloudUser!.id, jpeg);
                const ok = await saveCloudProfile(cloudUser!.id, {
                  avatar_url: caminho ?? jpeg,
                });
                setEnviandoFoto(false);
                if (ok) {
                  if (caminho) void apagarFotoAntiga(anterior);
                  notify(recadoDaFoto("pronta"));
                } else setError(recadoDaFoto("sem_rede"));
              }}
            />
            {enviandoFoto && <p className="small-note">{recadoDaFoto("subindo")}</p>}
            {!state.photo && cloud && (
              <>
                <p className="small-note">Sem foto? Escolha seu bonequinho.</p>
                <div className="figuras">
                  {FIGURAS.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      className="figura-opcao"
                      aria-pressed={figura === f.id}
                      onClick={async () => {
                        setFigura(f.id);
                        await saveCloudProfile(cloudUser!.id, { avatar_figura: f.id });
                        notify("Pronto. É assim que você aparece enquanto não põe foto.");
                      }}
                    >
                      <SemFoto nome={state.nickname} figura={f.id} size={64} />
                      {f.nome}
                    </button>
                  ))}
                </div>
              </>
            )}
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
              maxLength={MAX_SOBRE}
              rows={6}
              placeholder="Conta um pouco da sua história, do que você gosta de fazer, do tipo de amizade que você quer encontrar por aqui."
            />
          </label>
          <p className="small-note">
            {about.length}/{MAX_SOBRE}
          </p>
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
            <p>
              {cloud
                ? "Seu perfil e suas conversas ficam num servidor, não no seu aparelho. A política conta onde, por quanto tempo e o que você pode exigir."
                : "Os dados desta apresentação ficam neste navegador. Conta real guarda no servidor."}
            </p>
          </div>
          <Button asChild variant="secondary" className="wide">
            <Link to="/privacidade">
              Ler Política de Privacidade
              <Icon name="arrow" />
            </Link>
          </Button>
          {cloud && <MeusDireitos />}
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
                          " não está mais na sua lista de bloqueios. A conversa exige um encontro na mesma tribo.",
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
                <h3>Tribo em comum com {p.name.split(" ")[0]}</h3>
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
          : `Em vigor desde ${VERSAO_DOS_TEXTOS.split("-").reverse().join("/")}.`}
      </p>
      {kind === "terms" ? (
        <>
          <h2>Um espaço para amizade</h2>
          <p>
            A nommi é para quem tem 18 anos ou mais. Aqui as pessoas se encontram por interesse e
            por tribo, não por aparência. Respeito e consentimento valem em toda conversa e em todo
            encontro.
          </p>
          <h2>O que a gente espera de você</h2>
          <p>
            Seja você mesma: foto sua, nome pelo qual você atende. Não publique conteúdo ofensivo
            nem dado de outra pessoa sem a permissão dela. Não use a nommi para vender, cobrar ou
            arrastar gente para fora do app.
          </p>
          <h2>O que a gente faz quando alguém passa do ponto</h2>
          <p>
            Ameaça, assédio e conteúdo envolvendo menor de idade derrubam a conta na hora, antes de
            qualquer análise. O resto entra na fila de denúncias e é respondido em até 72 horas.
            Quem denuncia nunca é identificado para quem foi denunciado.
          </p>
          <h2>Encontros</h2>
          <p>
            Rolê é combinado entre as pessoas, não pela nommi. Combine em lugar público, avise
            alguém de confiança e saia se não estiver à vontade. Estrelas e pontos são
            reconhecimento dentro do app e não podem ser comprados.
          </p>
          <h2>Sua conta é sua</h2>
          <p>
            Você pode apagar sua conta a qualquer momento, em Meu nommi, sem pedir nada a ninguém.
            Some tudo: perfil, conversas, fotos e tribos.
          </p>
        </>
      ) : kind === "privacy" ? (
        <>
          <h2>Quem cuida dos seus dados</h2>
          <p>{quemResponde()}</p>
          <p>
            Dúvida, pedido ou reclamação sobre seus dados: <b>{RESPONSAVEL.email}</b>. A gente
            responde em até 15 dias.
          </p>
          <h2>Onde seus dados ficam</h2>
          <p>
            Seu perfil, suas conversas, suas tribos e suas fotos ficam num servidor, não no seu
            aparelho, protegidos por regras que conferem, a cada leitura, se quem está pedindo tem
            direito de ver aquilo. Esse servidor fica fora do Brasil, e por isso a gente exige por
            contrato da empresa que hospeda as mesmas proteções que a lei brasileira exige da nommi.
          </p>
          <h2>O que a gente guarda</h2>
          <p>
            Só o que o app precisa para funcionar: seu e-mail e sua senha (guardada embaralhada,
            ninguém aqui consegue ler) ou sua conta Google; apelido, cidade, interesses, o texto
            sobre você, o que você procura, seu Instagram se você colocar, suas fotos e seus vídeos;
            quem você disse que quer conhecer; o que você escreve nas conversas, nas tribos e no
            mural; e o dia em que você abriu o app. Só o dia, nada de tela, clique ou caminho.
          </p>
          <p>
            A nommi não pede CPF, não pede documento, não pede cartão e não lê sua agenda de
            contatos.
          </p>
          <h2>O match não é sobre sua cara</h2>
          <p>
            A fila de pessoas é montada pelos interesses em comum, pelas tribos em comum e pela
            cidade. Interesse raro pesa mais do que interesse comum. Quem você recusou nunca fica
            sabendo, e a nommi nunca mostra um número de compatibilidade.
          </p>
          <h2>Os dados delicados</h2>
          <p>
            Entrar numa tribo política, religiosa ou LGBT diz muito sobre você. A lei chama isso de
            dado sensível, e a gente trata assim: antes de você entrar numa tribo dessas, a nommi
            avisa e pergunta se você concorda. Você pode sair quando quiser, e sair apaga sua
            participação. Esse dado nunca sai da nommi: não vira anúncio, não vira lista, não é
            vendido e não é compartilhado com ninguém.
          </p>
          <h2>Radar nommi</h2>
          <p>
            O Radar só funciona quando você o liga, e só depois de você autorizar a localização no
            aparelho. Nesse momento guardamos uma posição arredondada para cerca de 1 km, o nome do
            lugar que você escreveu e a cidade. Sua localização exata nunca é mostrada: as outras
            pessoas veem apenas uma distância aproximada.
          </p>
          <p>
            Esses dados valem pelo tempo que você escolher, de 15 minutos a 4 horas, e são apagados
            quando esse tempo acaba ou quando você sai do radar. Quem bloqueou você, ou foi
            bloqueado por você, nunca aparece no radar.
          </p>
          <h2>Quem mais vê</h2>
          <p>
            Dentro da nommi, quem vê o quê é você que decide: perfil público ou fechado, tribo
            aberta ou fechada, mural com ou sem aprovação, e vídeo de amigo só entra na sua página
            se você deixar.
          </p>
          <p>
            Fora da nommi, seus dados vão para dois lugares, e só porque o app não roda sem eles: a
            empresa que hospeda o banco e os arquivos, e a Google, se você entrar pela conta Google.
            A nommi não vende seus dados, não troca seus dados e não entrega seus dados para quem
            quer te vender coisa. Se um juiz ou a polícia pedir algo por ordem legal, a gente cumpre,
            e avisa você quando a lei deixar.
          </p>
          <h2>Quanto tempo a gente guarda</h2>
          <ul className="legal-prazos">
            {PRAZOS.map((p) => (
              <li key={p.o}>
                <b>{p.o}:</b> {p.quanto}
              </li>
            ))}
          </ul>
          <h2>O que você pode exigir da gente</h2>
          <p>
            A qualquer hora, de graça: saber tudo o que a nommi tem sobre você, corrigir o que
            estiver errado, levar seus dados embora num arquivo, apagar sua conta inteira, tirar o
            consentimento que você deu para uma tribo sensível, e reclamar da gente na ANPD, a
            autoridade brasileira de proteção de dados. Baixar seus dados e apagar sua conta estão
            em Meu nommi, sem precisar falar com ninguém.
          </p>
          <h2>Idade</h2>
          <p>
            A nommi é para quem tem 18 anos ou mais, e a data de nascimento é conferida no cadastro.
            Se a gente descobrir uma conta de menor de idade, a conta é apagada. Se você vir uma,
            denuncie dentro do app.
          </p>
          <h2>Quando isto mudar</h2>
          <p>
            Se a gente mudar alguma coisa que importa, avisa dentro do app antes de valer. A data
            desta versão está no começo da página.
          </p>
        </>
      ) : (
        <>
          <details open>
            <summary>Como começa uma conversa?</summary>
            <p>
              A conversa direta abre depois de duas pessoas participarem de um encontro na mesma
              tribo.
            </p>
          </details>
          <details>
            <summary>Como a tribo ganha pontos?</summary>
            <p>
              O check-in gera um código. Depois da confirmação pelo Anfitrião, os pontos vão para a
              tribo.
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
      <p className="intro">Um plano simples para juntar a tribo.</p>
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
                name: type + " da tribo",
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
          Tribo
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
          Pontos da tribo
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
  const [soEu, setSoEu] = useState(false);
  const [fechada, setFechada] = useState(false);
  const [sensivel, setSensivel] = useState(false);
  const [capacity, setCapacity] = useState(6);
  const [busy, setBusy] = useState(false);
  const real = !!cloudUser && !demoMode;
  const isRole = kind === "role";
  return (
    <div className="action-page">
      <h1>{isRole ? "Criar um rolê" : "Criar minha tribo"}</h1>
      <p className="intro">
        {isRole
          ? "Marque dia, lugar e quantas pessoas cabem."
          : "Pode começar pequeno. Duas cadeiras já são uma roda."}
      </p>
      <div className="action-art">
        <Avatar id={7} size={80} />
        <SemFoto size={104} />
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
                notify(isRole ? "Diga a cidade do rolê." : "Diga a cidade da tribo.");
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
                    {
                      kind: "teia",
                      name,
                      mode,
                      city,
                      place,
                      whoPosts: soEu ? "criadora" : "todos",
                      entrada: fechada ? "fechada" : "aberta",
                      sensivel,
                    },
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
                  : "Tribo criada! Agora chame sua turma.",
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
                Tribo
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
            {isRole ? "Nome do rolê" : "Nome da tribo"}
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
          {real && !isRole && (
            <div className="setting-toggle">
              <div>
                <h2>Só eu posso falar</h2>
                <p>Modo recado: as pessoas entram e leem, mas quem escreve é você.</p>
              </div>
              <input
                aria-label="Só eu posso falar"
                type="checkbox"
                checked={soEu}
                onChange={(e) => setSoEu(e.target.checked)}
              />
            </div>
          )}
          {real && !isRole && (
            <div className="setting-toggle">
              <div>
                <h2>Tribo fechada</h2>
                <p>
                  {fechada
                    ? "Quem quiser entrar manda um pedido e você decide."
                    : "Qualquer pessoa entra na hora, sem pedir."}
                </p>
              </div>
              <input
                aria-label="Tribo fechada"
                type="checkbox"
                checked={fechada}
                onChange={(e) => setFechada(e.target.checked)}
              />
            </div>
          )}
          {real && !isRole && (
            <div className="setting-toggle">
              <div>
                <h2>Tribo de política, religião ou orientação</h2>
                <p>
                  {sensivel
                    ? "Quem quiser entrar vai ser avisada antes e vai dizer se concorda. É o que a lei pede para esse tipo de tribo."
                    : "Marque se a tribo é sobre política, religião, orientação sexual, saúde ou origem."}
                </p>
              </div>
              <input
                aria-label="Tribo de política, religião ou orientação"
                type="checkbox"
                checked={sensivel}
                onChange={(e) => setSensivel(e.target.checked)}
              />
            </div>
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
            {busy ? "Criando…" : isRole ? "Criar rolê" : "Criar tribo"}
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
      <h2 className="settings-subtitle">Convidar uma amizade para sua tribo</h2>
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
