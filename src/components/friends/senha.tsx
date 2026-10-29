import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema } from "@/lib/nomi-validation";
import { RECADO_DO_PEDIDO, confereSenhaNova, modoDaRecuperacao, recadoDoErro } from "@/lib/senha";
import { Icon } from "./art";
import { Brand } from "./surfaces";

/** Esqueci minha senha: pedir o link, e escolher a senha nova depois de clicar nele. */
export function RecuperarSenha() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"pedir" | "escolher">("pedir");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setModo(modoDaRecuperacao(window.location.hash, window.location.search));
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setModo("escolher");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const em = emailSchema.safeParse(email);
    if (!em.success) {
      setErro("Confira o e-mail digitado.");
      return;
    }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(em.data, {
      redirectTo: window.location.origin + "/recuperar-senha",
    });
    setBusy(false);
    // O recado é o mesmo dando certo ou não: ninguém descobre quem tem conta aqui.
    setEnviado(true);
  }

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    const problema = confereSenhaNova(senha, repetida);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro("");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) {
      setErro(recadoDoErro(error.message));
      return;
    }
    setSenha("");
    setRepetida("");
    setPronto(true);
  }

  if (pronto)
    return (
      <div className="entry-layout">
        <Brand />
        <h1>Senha trocada.</h1>
        <p className="intro">Pode voltar para a nommi, agora com a senha nova.</p>
        <Button className="wide" onClick={() => void navigate({ to: "/" })}>
          Ir para o início
          <Icon name="arrow" />
        </Button>
      </div>
    );

  if (modo === "escolher")
    return (
      <div className="entry-layout account-page">
        <Brand />
        <h1>Escolha sua senha nova.</h1>
        <form className="account-form" onSubmit={trocar}>
          <label>
            Senha nova
            <input
              className="input"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Repita a senha
            <input
              className="input"
              type="password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {erro && (
            <p role="alert" className="form-error">
              {erro}
            </p>
          )}
          <Button className="wide" disabled={busy}>
            {busy ? "Salvando…" : "Salvar senha nova"}
            <Icon name="check" />
          </Button>
        </form>
      </div>
    );

  if (enviado)
    return (
      <div className="entry-layout">
        <Brand />
        <h1>Um pulinho no seu e-mail.</h1>
        <p className="intro">{RECADO_DO_PEDIDO}</p>
        <Button asChild className="wide">
          <Link to="/conta">Voltar para a entrada</Link>
        </Button>
      </div>
    );

  return (
    <div className="entry-layout account-page">
      <Brand />
      <h1>Esqueceu a senha?</h1>
      <p className="intro">Diga seu e-mail que a gente manda um link para você escolher outra.</p>
      <form className="account-form" onSubmit={pedir}>
        <label>
          Seu e-mail
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {erro && (
          <p role="alert" className="form-error">
            {erro}
          </p>
        )}
        <Button className="wide" disabled={busy}>
          {busy ? "Enviando…" : "Mandar o link"}
          <Icon name="send" />
        </Button>
      </form>
      <Button asChild variant="ghost" className="wide">
        <Link to="/conta">Lembrei, quero entrar</Link>
      </Button>
    </div>
  );
}
