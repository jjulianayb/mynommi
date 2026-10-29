import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { emailSchema, passwordSchema } from "@/lib/nomi-validation";
import { SIGNUP_INTERESTS, signupDetails } from "@/lib/nommi-access";
import { Icon } from "./art";
import { Brand } from "./surfaces";
import { useDemoSession } from "./session";

export function Account({
  initialMode = "entrar",
  initialBusiness = false,
}: {
  initialMode?: "entrar" | "criar";
  initialBusiness?: boolean;
}) {
  const { cloudUser, signOut } = useDemoSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [business, setBusiness] = useState(initialBusiness);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [terms, setTerms] = useState(false);
  async function social(provider: "google" | "apple") {
    setError("");
    setBusy(true);
    try {
      if (business) localStorage.setItem("nommi-business-intent", "1");
      const r = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (r.error) setError("Não foi possível entrar agora. Tente de novo.");
      else if (!r.redirected) void navigate({ to: "/conta" });
    } catch {
      setError("Não foi possível entrar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const em = emailSchema.safeParse(email);
    const pw = passwordSchema.safeParse(password);
    if (!em.success || !pw.success) {
      setError(
        em.error?.issues[0]?.message ?? pw.error?.issues[0]?.message ?? "Confira seu acesso.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "criar") {
        const details = signupDetails({ nickname, city, birthday, interests });
        if (!details.data) {
          setError(details.error ?? "Confira seus dados.");
          return;
        }
        if (!terms) {
          setError("Aceite os Termos e a Privacidade para continuar.");
          return;
        }
        const { error: err } = await supabase.auth.signUp({
          email: em.data,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/conta",
            data: { ...details.data, is_business: business, nommi_profile_pending: true },
          },
        });
        if (err) {
          setError(signupErrorMessage(err));
          return;
        }
        setPassword("");
        setSent(true);
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: em.data, password });
      if (err) {
        setError(
          err.message.toLowerCase().includes("confirm")
            ? "Confirme seu e-mail pelo link que enviamos."
            : "E-mail ou senha não conferem.",
        );
        return;
      }
      void navigate({ to: "/conta" });
    } catch {
      setError("A conexão deu uma pausa. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }
  if (cloudUser) return <CompleteAccount />;
  if (sent)
    return (
      <div className="entry-layout">
        <Brand />
        <h1>Um pulinho no seu e-mail.</h1>
        <p className="intro">
          Confira o link enviado para <b>{email}</b>. Depois da confirmação, seu primeiro rolê
          espera aqui.
        </p>
        <Button
          className="wide"
          onClick={() => {
            setSent(false);
            setMode("entrar");
          }}
        >
          Já confirmei, entrar
        </Button>
      </div>
    );
  return (
    <div className="entry-layout account-page">
      <Brand />
      <div className="account-heading">
        <Icon name="teia" />
        <h1>{mode === "entrar" ? "Bom te ver por aqui." : "Qual é o seu nommi?"}</h1>
        <p className="intro">
          {mode === "criar"
            ? "Três coisas que você curte. Um bom começo de conversa."
            : "O próximo “bora?” pode estar bem perto."}
        </p>
      </div>
      <div className="chips" role="radiogroup" aria-label="Tipo de conta">
        {[false, true].map((b) => (
          <Button
            key={String(b)}
            type="button"
            variant="outline"
            role="radio"
            aria-checked={business === b}
            className={"chip " + (business === b ? "selected" : "")}
            onClick={() => setBusiness(b)}
          >
            {b ? "Sou anfitrião" : "Sou nommi"}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="wide"
        disabled={busy}
        onClick={() => social("google")}
      >
        Continuar com Google
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="wide"
        disabled={busy}
        onClick={() => social("apple")}
      >
        Continuar com Apple
      </Button>
      <p className="small-note account-or">
        {mode === "criar" ? "ou crie com e-mail" : "ou com e-mail"}
      </p>
      <form className="account-form" onSubmit={submit}>
        <label>
          E-mail
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            className="input"
            type="password"
            minLength={8}
            autoComplete={mode === "criar" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {mode === "entrar" && (
          <Link className="forgot-link" to="/recuperar-senha">
            Esqueci minha senha
          </Link>
        )}
        {mode === "criar" && (
          <ul
            className="small-note"
            aria-label="Dicas de senha"
            style={{ listStyle: "none", padding: 0, margin: "-4px 0 4px", display: "grid", gap: 4 }}
          >
            {passwordChecks(password).map((c) => (
              <li
                key={c.label}
                style={{
                  color: c.ok ? "var(--brand-green, var(--primary))" : undefined,
                  fontWeight: c.ok ? 600 : 400,
                }}
              >
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
            <li>
              Dica: junte palavras e números que só você sabe, como Cafe-Domingo-27. Evite 12345678,
              seu nome ou sua data.
            </li>
          </ul>
        )}
        {mode === "criar" && (
          <>
            <label>
              {business ? "Seu nommi ou nome do lugar" : "Seu nommi (apelido)"}
              <input
                className="input"
                maxLength={30}
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </label>
            <div className="account-fields">
              <label>
                Data de nascimento
                <input
                  className="input"
                  type="date"
                  autoComplete="bday"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  required
                />
              </label>
              <label>
                Cidade
                <input
                  className="input"
                  maxLength={80}
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </label>
            </div>
            <fieldset>
              <legend>
                Escolha 3 interesses <small>{interests.length}/3</small>
              </legend>
              <div className="chips">
                {SIGNUP_INTERESTS.map((i) => (
                  <Button
                    type="button"
                    key={i}
                    variant="outline"
                    className={"chip " + (interests.includes(i) ? "selected" : "")}
                    disabled={interests.length === 3 && !interests.includes(i)}
                    aria-pressed={interests.includes(i)}
                    onClick={() =>
                      setInterests((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]))
                    }
                  >
                    {i}
                  </Button>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
              />
              <span>
                Aceito os <Link to="/termos">Termos</Link> e a{" "}
                <Link to="/privacidade">Privacidade</Link>.
              </span>
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button className="wide" disabled={busy}>
          {busy ? "Só um instante…" : mode === "criar" ? "Criar conta" : "Entrar"}
          <Icon name="arrow" />
        </Button>
      </form>
      <Button
        type="button"
        variant="ghost"
        className="wide"
        onClick={() => {
          setMode(mode === "entrar" ? "criar" : "entrar");
          setError("");
        }}
      >
        {mode === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
      </Button>
      <Button asChild variant="ghost" className="wide">
        <Link to="/">Voltar</Link>
      </Button>
    </div>
  );
}
export function passwordChecks(p: string) {
  return [
    { label: "Pelo menos 8 caracteres", ok: p.length >= 8 },
    { label: "Uma letra maiúscula e uma minúscula", ok: /[A-Z]/.test(p) && /[a-z]/.test(p) },
    { label: "Pelo menos um número", ok: /[0-9]/.test(p) },
    { label: "Um símbolo (ex.: ! @ # -)", ok: /[^A-Za-z0-9]/.test(p) },
  ];
}
function signupErrorMessage(err: {
  message: string;
  code?: string | undefined;
  status?: number | undefined;
}) {
  const m = err.message.toLowerCase();
  if (err.code === "weak_password" || m.includes("weak") || m.includes("pwned"))
    return "Essa senha é muito comum ou fácil de adivinhar. Siga as dicas abaixo do campo de senha e tente outra.";
  if (m.includes("registered") || err.code === "user_already_exists")
    return "Este e-mail já tem conta. Use Entrar.";
  if (err.status === 429 || m.includes("rate"))
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo, ou use Google ou Apple.";
  if (m.includes("email")) return "Confira o e-mail digitado e tente de supabase.";
  return "Não foi possível criar a conta agora. Tente de novo ou use Google ou Apple.";
}
function CompleteAccount() {
  const { cloudUser, signOut } = useDemoSession();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [birthday, setBirthday] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!cloudUser) return null;
  if (cloudUser.profileComplete)
    return (
      <div className="entry-layout">
        <Brand />
        <h1>Seu nommi está pronto.</h1>
        <p className="intro">Tem um lugar na roda esperando por você.</p>
        <Button asChild className="wide">
          <Link to={cloudUser.isBusiness ? "/parceiro" : "/"}>
            Ver meu próximo rolê
            <Icon name="arrow" />
          </Link>
        </Button>
        <Button variant="ghost" className="wide" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
    );
  return (
    <div className="entry-layout account-page">
      <Brand />
      <h1>Só falta o seu nommi.</h1>
      <form
        className="account-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = signupDetails({ nickname, birthday, city, interests });
          if (!r.data) {
            setError(r.error ?? "Confira seus dados.");
            return;
          }
          setBusy(true);
          const { error: err } = await supabase
            .from("profiles")
            .update({ nickname: r.data.nickname, city: r.data.city, interests: r.data.interests })
            .eq("id", cloudUser.id);
          if (err) {
            setError("Não foi possível salvar. Tente de novo.");
            setBusy(false);
            return;
          }
          const { error: authError } = await supabase.auth.updateUser({
            data: { ...r.data, nommi_profile_pending: false },
          });
          setBusy(false);
          if (authError) {
            setError("Não foi possível concluir. Tente de novo.");
            return;
          }
          void navigate({ to: cloudUser.isBusiness ? "/parceiro" : "/" });
        }}
      >
        <label>
          Seu nommi
          <input
            className="input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            maxLength={30}
          />
        </label>
        <label>
          Data de nascimento
          <input
            className="input"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
        </label>
        <label>
          Cidade
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <fieldset>
          <legend>3 interesses</legend>
          <div className="chips">
            {SIGNUP_INTERESTS.map((i) => (
              <Button
                type="button"
                key={i}
                variant="outline"
                className={"chip " + (interests.includes(i) ? "selected" : "")}
                disabled={interests.length === 3 && !interests.includes(i)}
                onClick={() =>
                  setInterests((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]))
                }
              >
                {i}
              </Button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button className="wide" disabled={busy}>
          {busy ? "Salvando…" : "Ver meu primeiro rolê"}
          <Icon name="teia" />
        </Button>
      </form>
    </div>
  );
}
