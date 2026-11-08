import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, passwordSchema } from "@/lib/nomi-validation";
import { essentialDetails } from "@/lib/nommi-access";
import { RECADO_DO_NAVEGADOR } from "@/lib/navegador";
import {
  figurinhaDe,
  figurinhasDoGrupo,
  gruposDeFigurinhas,
  mesmoInteresse,
} from "@/lib/figurinhas";
import { Icon } from "./art";
import { Brand } from "./surfaces";
import { PippoRosto } from "./pippo";
import { passwordChecks, signupErrorMessage } from "./account";
import "./cadastro.css";

/**
 * Cadastro em telas cheias, uma pergunta por tela (decisão da Ju, 07/11, com
 * a correção dela na mesma noite: nada de bloco de entrada em cima das
 * perguntas). A primeira tela é a entrada — marca, Google/Apple, anfitrião e
 * o e-mail. Cada passo seguinte é uma tela limpa: só a barra de progresso,
 * voltar e a pergunta.
 *
 * Ordem: entrada (e-mail) → senha → celular → interesses (escolha 5) →
 * religião → política → dicas → apelido + nascimento. A conta nasce no último
 * passo; o que não dá para guardar antes disso (celular, interesses,
 * religião, política, dicas) vira rascunho em localStorage e é gravado no
 * primeiro acesso, pelas Boas-vindas.
 *
 * Religião e política são dado sensível: "Prefiro não dizer" grava '' (nada
 * fica salvo) e as chaves de exibição nascem desligadas no banco (migração
 * numerada pelo Claude).
 */

export const RASCUNHO_CADASTRO_KEY = "nommi-cadastro-rascunho";

export type Dica = { categoria: "diversao" | "papo_real"; pergunta: string; resposta: string };

export type RascunhoCadastro = {
  celular: string;
  interesses: string[];
  religiao: string;
  politica: string;
  dicas: Dica[];
};

/** Entrada + 7 passos. A barra só aparece depois da entrada. */
const TOTAL_TELAS = 8;

const META_INTERESSES = 5;

const OPCOES_RELIGIAO: { valor: string; rotulo: string }[] = [
  { valor: "catolica", rotulo: "Católica" },
  { valor: "protestante", rotulo: "Protestante" },
  { valor: "espirita", rotulo: "Espírita" },
  { valor: "matriz_africana", rotulo: "Religiões de matriz africana" },
  { valor: "agnosticismo", rotulo: "Agnosticismo" },
  { valor: "ateismo", rotulo: "Ateísmo" },
  { valor: "budismo", rotulo: "Budismo" },
  { valor: "cristianismo", rotulo: "Cristianismo" },
  { valor: "hinduismo", rotulo: "Hinduísmo" },
  { valor: "jainismo", rotulo: "Jainismo" },
  { valor: "judaismo", rotulo: "Judaísmo" },
  { valor: "mormon", rotulo: "Mórmon" },
  { valor: "santos_ultimos_dias", rotulo: "Santos dos Últimos Dias" },
  { valor: "isla", rotulo: "Islã" },
  { valor: "zoroastrismo", rotulo: "Zoroastrismo" },
  { valor: "siquismo", rotulo: "Siquismo" },
  { valor: "espiritualidade", rotulo: "Espiritualidade" },
  { valor: "outra", rotulo: "Outra" },
];

const OPCOES_POLITICA: { valor: string; rotulo: string }[] = [
  { valor: "sem_preferencia", rotulo: "Não gosto de política" },
  { valor: "centro", rotulo: "Centro" },
  { valor: "esquerda", rotulo: "Esquerda" },
  { valor: "direita", rotulo: "Direita" },
  { valor: "socialista", rotulo: "Socialista" },
];

const DICAS_DIVERSAO = [
  "Meu talento inútil é...",
  "A série que eu já vi mil vezes é...",
  "Eu rio sozinha lembrando de...",
  "Meu rolê dos sonhos de graça é...",
  "A música que me faz cantar no trânsito é...",
  "Eu ganho de todo mundo em...",
  "Meu lanche de estrada favorito é...",
  "A coisa mais aleatória que eu sei fazer é...",
];

const DICAS_PAPO_REAL = [
  "Eu me sinto em casa quando...",
  "Uma amizade boa, para mim, é...",
  "O que mais me fez crescer foi...",
  "Eu fico horas falando sobre...",
  "Um dia perfeito para mim tem...",
  "Eu ando aprendendo a...",
  "O que eu mais valorizo numa pessoa é...",
  "Meu jeito de recarregar as energias é...",
];

/** Só dígitos e o +55, no formato que o CHECK do banco aceita. */
function celularParaSalvar(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  return d ? "+55" + d : "";
}

function mascaraCelular(digitos: string): string {
  const d = digitos.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
}

export function Cadastro({
  aoCriar,
  onSocial,
  onAnfitriao,
  onEntrar,
  dentroDeApp,
  convitePendente,
  busySocial,
}: {
  aoCriar: (email: string) => void;
  onSocial: (provider: "google" | "apple") => void;
  onAnfitriao: () => void;
  onEntrar: () => void;
  dentroDeApp: boolean;
  convitePendente: boolean;
  busySocial: boolean;
}) {
  const [passo, setPasso] = useState(0);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [termos, setTermos] = useState(false);
  const [celular, setCelular] = useState("");
  const [interesses, setInteresses] = useState<string[]>([]);
  const [religiao, setReligiao] = useState("");
  const [politica, setPolitica] = useState("");
  const [dicas, setDicas] = useState<(Dica | null)[]>([null, null, null]);
  const [apelido, setApelido] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const avancoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function avancar(agora = false) {
    setErro("");
    if (agora) {
      setPasso((p) => Math.min(p + 1, TOTAL_TELAS - 1));
      return;
    }
    // O avanço automático espera um instante para a pessoa ver o que marcou.
    if (avancoTimer.current) clearTimeout(avancoTimer.current);
    avancoTimer.current = setTimeout(
      () => setPasso((p) => Math.min(p + 1, TOTAL_TELAS - 1)),
      450,
    );
  }

  function voltar() {
    setErro("");
    setPasso((p) => Math.max(p - 1, 0));
  }

  function alternarInteresse(nome: string) {
    setInteresses((v) => {
      if (v.some((e) => mesmoInteresse(e, nome))) return v.filter((e) => !mesmoInteresse(e, nome));
      if (v.length >= META_INTERESSES) return v;
      const novo = [...v, nome];
      if (novo.length === META_INTERESSES) avancar();
      return novo;
    });
  }

  async function criarConta() {
    setErro("");
    const em = emailSchema.safeParse(email);
    const pw = passwordSchema.safeParse(senha);
    if (!em.success || !pw.success) {
      setErro(em.error?.issues[0]?.message ?? pw.error?.issues[0]?.message ?? "Confira seu acesso.");
      return;
    }
    const details = essentialDetails({ nickname: apelido, birthday: nascimento });
    if (!details.data) {
      setErro(details.error ?? "Confira seus dados.");
      return;
    }
    if (!termos) {
      setErro("Aceite os Termos e a Privacidade para continuar.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: em.data,
        password: senha,
        options: {
          emailRedirectTo: window.location.origin + "/conta",
          data: { ...details.data, is_business: false, nommi_profile_pending: true },
        },
      });
      if (err) {
        setErro(signupErrorMessage(err));
        return;
      }
      const rascunho: RascunhoCadastro = {
        celular: celularParaSalvar(celular),
        interesses,
        religiao,
        politica,
        dicas: dicas.filter((d): d is Dica => !!d && !!d.resposta.trim()),
      };
      try {
        localStorage.setItem(RASCUNHO_CADASTRO_KEY, JSON.stringify(rascunho));
      } catch {
        // Sem localStorage o rascunho se perde, mas a conta está criada.
      }
      setSenha("");
      aoCriar(em.data);
    } catch {
      setErro("A conexão deu uma pausa. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  // A entrada é a única tela com marca, Google/Apple e a escolha de anfitrião.
  if (passo === 0)
    return (
      <div className="cd">
        <Brand />
        <div className="account-heading">
          <Icon name="teia" />
          <h1>Qual é o seu nommi?</h1>
          <p className="intro">Crie sua conta. Depois, seu perfil e quem combina com você.</p>
        </div>
        {convitePendente && (
          <div className="pippo-recepcao">
            <PippoRosto altura={64} />
            <p>
              Oi, eu sou o Pippo! Você veio por um convite. Faz seu cadastro aqui embaixo,
              rapidinho. Ele é seu passaporte: quando terminar, você já cai dentro da tribo. E
              ainda pode explorar todas as outras.
            </p>
          </div>
        )}
        <div className="chips" role="radiogroup" aria-label="Tipo de conta">
          <Button
            type="button"
            variant="outline"
            role="radio"
            aria-checked="true"
            className="chip selected"
          >
            Sou nommi
          </Button>
          <Button
            type="button"
            variant="outline"
            role="radio"
            aria-checked="false"
            className="chip"
            onClick={onAnfitriao}
          >
            Sou anfitrião
          </Button>
        </div>
        {dentroDeApp ? (
          <div className="aviso-janelinha">
            <Icon name="lock" />
            <p>{RECADO_DO_NAVEGADOR}</p>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              className="wide"
              disabled={busySocial}
              onClick={() => onSocial("google")}
            >
              Continuar com Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="wide"
              disabled={busySocial}
              onClick={() => onSocial("apple")}
            >
              Continuar com Apple
            </Button>
          </>
        )}
        <p className="small-note account-or">ou crie com e-mail</p>
        <label className="cd-campo">
          E-mail
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro("");
            }}
          />
        </label>
        {erro && (
          <p role="alert" className="form-error">
            {erro}
          </p>
        )}
        <Button
          className="wide"
          disabled={!email.trim()}
          onClick={() => {
            const em = emailSchema.safeParse(email);
            if (!em.success) {
              setErro(em.error.issues[0]?.message ?? "Confira o e-mail.");
              return;
            }
            avancar(true);
          }}
        >
          Continuar
          <Icon name="arrow" />
        </Button>
        <Button type="button" variant="ghost" className="wide" onClick={onEntrar}>
          Já tenho conta
        </Button>
      </div>
    );

  return (
    <div className="cd cd-cheia">
      <div className="cd-topo">
        <button type="button" className="cd-voltar" onClick={voltar} aria-label="Voltar um passo">
          ←
        </button>
        <div className="cd-barra" aria-hidden="true">
          <span style={{ width: Math.round(((passo + 1) / TOTAL_TELAS) * 100) + "%" }} />
        </div>
        <p className="cd-passo">
          {passo + 1} de {TOTAL_TELAS}
        </p>
      </div>

      {passo === 1 && (
        <PassoSenha
          senha={senha}
          onSenha={setSenha}
          termos={termos}
          onTermos={setTermos}
          erro={erro}
          avancar={() => {
            const pw = passwordSchema.safeParse(senha);
            if (!pw.success) {
              setErro(pw.error.issues[0]?.message ?? "Confira a senha.");
              return;
            }
            if (!termos) {
              setErro("Aceite os Termos e a Privacidade para continuar.");
              return;
            }
            avancar(true);
          }}
        />
      )}
      {passo === 2 && (
        <PassoCelular
          valor={celular}
          onChange={setCelular}
          avancar={() => avancar(true)}
          pular={() => avancar(true)}
        />
      )}
      {passo === 3 && (
        <PassoInteresses
          escolhidos={interesses}
          alternar={alternarInteresse}
          pular={() => avancar(true)}
        />
      )}
      {passo === 4 && (
        <PassoSensivel
          titulo="O que é importante para você?"
          pergunta="Sua religião"
          porQue="Religião pesa na afinidade de muita gente. Você só aparece assim se quiser: a chave de exibição nasce desligada e ninguém filtra por isso."
          opcoes={OPCOES_RELIGIAO}
          escolher={(v) => {
            setReligiao(v);
            avancar();
          }}
          pular={() => avancar(true)}
        />
      )}
      {passo === 5 && (
        <PassoSensivel
          titulo="O que é importante para você?"
          pergunta="Sua visão política"
          porQue="Política também define afinidade de amizade. Como na religião: opcional, chave desligada de fábrica, sem filtro público."
          opcoes={OPCOES_POLITICA}
          escolher={(v) => {
            setPolitica(v);
            avancar();
          }}
          pular={() => avancar(true)}
        />
      )}
      {passo === 6 && (
        <PassoDicas dicas={dicas} onChange={setDicas} avancar={() => avancar(true)} />
      )}
      {passo === 7 && (
        <PassoFinal
          apelido={apelido}
          onApelido={setApelido}
          nascimento={nascimento}
          onNascimento={setNascimento}
          erro={erro}
          busy={busy}
          criar={() => void criarConta()}
        />
      )}
    </div>
  );
}

function PassoSenha({
  senha,
  onSenha,
  termos,
  onTermos,
  erro,
  avancar,
}: {
  senha: string;
  onSenha: (v: string) => void;
  termos: boolean;
  onTermos: (v: boolean) => void;
  erro: string;
  avancar: () => void;
}) {
  const checks = useMemo(() => passwordChecks(senha), [senha]);
  return (
    <section className="cd-tela" aria-labelledby="cd-t1">
      <h2 id="cd-t1">Crie uma senha.</h2>
      <p className="cd-sub">Prefira uma senha que você não usa em outro lugar.</p>
      <input
        className="input"
        type="password"
        autoComplete="new-password"
        value={senha}
        onChange={(e) => onSenha(e.target.value)}
      />
      <ul className="cd-senha-dicas">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : ""}>
            {c.label}
          </li>
        ))}
      </ul>
      <label className="checkbox-line">
        <input type="checkbox" checked={termos} onChange={(e) => onTermos(e.target.checked)} />
        <span>
          Aceito os <Link to="/termos">Termos</Link> e a <Link to="/privacidade">Privacidade</Link>.
        </span>
      </label>
      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}
      <div className="cd-acoes">
        <span />
        <Button disabled={!senha} onClick={avancar}>
          Continuar
          <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}

function PassoCelular({
  valor,
  onChange,
  avancar,
  pular,
}: {
  valor: string;
  onChange: (v: string) => void;
  avancar: () => void;
  pular: () => void;
}) {
  const digitos = valor.replace(/\D/g, "");
  const valido = digitos.length >= 10;
  return (
    <section className="cd-tela" aria-labelledby="cd-t2">
      <h2 id="cd-t2">Qual é o seu celular?</h2>
      <p className="cd-sub">
        A gente nunca divulga o seu número. Ele não aparece no seu perfil e serve só para a sua
        conta.
      </p>
      <div className="cd-celular">
        <span className="cd-ddi">+55</span>
        <input
          className="input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(21) 99999-9999"
          value={mascaraCelular(valor)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="cd-acoes">
        <Button variant="ghost" onClick={pular}>
          Pular
        </Button>
        <Button disabled={!valido} onClick={avancar}>
          Continuar
          <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}

function PassoInteresses({
  escolhidos,
  alternar,
  pular,
}: {
  escolhidos: string[];
  alternar: (nome: string) => void;
  pular: () => void;
}) {
  const cheio = escolhidos.length >= META_INTERESSES;
  return (
    <section className="cd-tela" aria-labelledby="cd-t3">
      <h2 id="cd-t3">Escolha 5 coisas que te interessam.</h2>
      <p className="cd-sub">É assim que a nommi encontra gente que combina com você.</p>
      <p className="cd-contador" aria-live="polite">
        {escolhidos.length} de {META_INTERESSES}
      </p>
      <div className="cd-grade-rolar">
        {gruposDeFigurinhas().map((g) => (
          <div className="cd-grupo" key={g}>
            <h3>{g}</h3>
            <div className="cd-grade">
              {figurinhasDoGrupo(g).map((f) => {
                const marcado = escolhidos.some((e) => mesmoInteresse(e, f.nome));
                return (
                  <button
                    type="button"
                    key={f.nome}
                    className={"cd-chip" + (marcado ? " marcada" : "")}
                    aria-pressed={marcado}
                    disabled={cheio && !marcado}
                    onClick={() => alternar(f.nome)}
                  >
                    <b aria-hidden="true">{figurinhaDe(f.nome)}</b>
                    {f.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="cd-acoes">
        <Button variant="ghost" onClick={pular}>
          Pular
        </Button>
        {cheio && (
          <Button onClick={pular}>
            Continuar
            <Icon name="arrow" />
          </Button>
        )}
      </div>
    </section>
  );
}

function PassoSensivel({
  titulo,
  pergunta,
  porQue,
  opcoes,
  escolher,
  pular,
}: {
  titulo: string;
  pergunta: string;
  porQue: string;
  opcoes: { valor: string; rotulo: string }[];
  escolher: (valor: string) => void;
  pular: () => void;
}) {
  return (
    <section className="cd-tela" aria-labelledby={"cd-" + pergunta}>
      <h2 id={"cd-" + pergunta}>{titulo}</h2>
      <p className="cd-pergunta">{pergunta}</p>
      <p className="cd-porque">{porQue}</p>
      <div className="cd-lista" role="listbox" aria-label={pergunta}>
        {opcoes.map((o) => (
          <button type="button" key={o.valor} className="cd-opcao" onClick={() => escolher(o.valor)}>
            {o.rotulo}
          </button>
        ))}
      </div>
      <button type="button" className="cd-opcao cd-neutra" onClick={() => escolher("")}>
        Prefiro não dizer
      </button>
      <div className="cd-acoes">
        <Button variant="ghost" onClick={pular}>
          Pular
        </Button>
        <span />
      </div>
    </section>
  );
}

const ROTULOS_SLOT = ["Primeira dica", "Segunda dica", "Terceira dica"];

function PassoDicas({
  dicas,
  onChange,
  avancar,
}: {
  dicas: (Dica | null)[];
  onChange: (d: (Dica | null)[]) => void;
  avancar: () => void;
}) {
  const [sheet, setSheet] = useState<number | null>(null);
  const [aba, setAba] = useState<"diversao" | "papo_real">("diversao");
  const [completando, setCompletando] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const preenchidas = dicas.filter(Boolean).length;

  function escolherPergunta(pergunta: string) {
    setCompletando(pergunta);
    setResposta("");
  }
  function salvarDica() {
    if (sheet === null || !completando || !resposta.trim()) return;
    const nova: Dica = { categoria: aba, pergunta: completando, resposta: resposta.trim() };
    onChange(dicas.map((d, i) => (i === sheet ? nova : d)));
    setCompletando(null);
    setSheet(null);
  }

  return (
    <section className="cd-tela" aria-labelledby="cd-t6">
      <h2 id="cd-t6">O que te faz ser você?</h2>
      <p className="cd-sub">Complete até 3 frases. Quanto mais dicas, mais conexões.</p>
      <div className="cd-slots">
        {ROTULOS_SLOT.map((rotulo, i) => {
          const d = dicas[i];
          return (
            <button
              type="button"
              key={rotulo}
              className={"cd-slot" + (d ? " preenchido" : "")}
              onClick={() => {
                setSheet(i);
                setAba("diversao");
                setCompletando(null);
              }}
            >
              {d ? (
                <>
                  <b>{d.pergunta}</b>
                  <span>{d.resposta}</span>
                </>
              ) : (
                <>
                  <b>{rotulo}</b>
                  <span>+ Adicionar</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="cd-acoes">
        {preenchidas === 0 ? (
          <Button variant="ghost" onClick={avancar}>
            Pular
          </Button>
        ) : (
          <span />
        )}
        {preenchidas > 0 && (
          <Button onClick={avancar}>
            Continuar
            <Icon name="arrow" />
          </Button>
        )}
      </div>

      {sheet !== null && (
        <div className="cd-sheet-fundo" role="presentation" onClick={() => setSheet(null)}>
          <div
            className="cd-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Escolha uma dica"
            onClick={(e) => e.stopPropagation()}
          >
            {completando ? (
              <>
                <h3>{completando}</h3>
                <input
                  className="input"
                  maxLength={120}
                  autoFocus
                  placeholder="Complete do seu jeito"
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                />
                <div className="cd-acoes">
                  <Button variant="ghost" onClick={() => setCompletando(null)}>
                    Voltar
                  </Button>
                  <Button disabled={!resposta.trim()} onClick={salvarDica}>
                    Salvar dica
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3>Escolha uma dica</h3>
                <div className="cd-abas" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aba === "diversao"}
                    className={aba === "diversao" ? "ativa" : ""}
                    onClick={() => setAba("diversao")}
                  >
                    Um pouco de diversão
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aba === "papo_real"}
                    className={aba === "papo_real" ? "ativa" : ""}
                    onClick={() => setAba("papo_real")}
                  >
                    Papo real
                  </button>
                </div>
                <div className="cd-perguntas">
                  {(aba === "diversao" ? DICAS_DIVERSAO : DICAS_PAPO_REAL).map((p) => (
                    <button type="button" key={p} className="cd-opcao" onClick={() => escolherPergunta(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PassoFinal({
  apelido,
  onApelido,
  nascimento,
  onNascimento,
  erro,
  busy,
  criar,
}: {
  apelido: string;
  onApelido: (v: string) => void;
  nascimento: string;
  onNascimento: (v: string) => void;
  erro: string;
  busy: boolean;
  criar: () => void;
}) {
  return (
    <section className="cd-tela" aria-labelledby="cd-t7">
      <h2 id="cd-t7">Como a gente te chama?</h2>
      <p className="cd-sub">Seu nommi é o apelido que aparece para as pessoas.</p>
      <label className="cd-campo">
        Seu nommi (apelido)
        <input
          className="input"
          maxLength={30}
          autoComplete="nickname"
          value={apelido}
          onChange={(e) => onApelido(e.target.value)}
        />
      </label>
      <label className="cd-campo">
        Data de nascimento
        <input
          className="input"
          type="date"
          autoComplete="bday"
          value={nascimento}
          onChange={(e) => onNascimento(e.target.value)}
        />
      </label>
      <p className="small-note">O Nommi é para quem tem 18 anos ou mais.</p>
      {erro && (
        <p role="alert" className="form-error">
          {erro}
        </p>
      )}
      <div className="cd-acoes">
        <span />
        <Button disabled={busy || !apelido.trim() || !nascimento} onClick={criar}>
          {busy ? "Só um instante…" : "Criar conta"}
          <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}
