import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { emailSchema, passwordSchema } from '@/lib/nomi-validation';
import { Icon } from './art';
import { Brand } from './surfaces';
import { useDemoSession } from './session';

/** Contas reais de pessoas e empresas (e-mail e senha, Google ou Apple). */
export function Account() {
  const { cloudUser, signOut } = useDemoSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [business, setBusiness] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);

  async function social(provider: 'google' | 'apple') {
    setError(''); setBusy(true);
    try { if (business) localStorage.setItem('nommi-business-intent', '1'); } catch { /* sem armazenamento */ }
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    setBusy(false);
    if (r.error) { setError('Não foi possível entrar agora. Tente de novo.'); return; }
    if (!r.redirected) void navigate({ to: business ? '/parceiro' : '/' });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const em = emailSchema.safeParse(email); if (!em.success) { setError(em.error.issues[0]?.message ?? 'Confira o e-mail.'); return; }
    const pw = passwordSchema.safeParse(password); if (!pw.success) { setError(pw.error.issues[0]?.message ?? 'Confira a senha.'); return; }
    setBusy(true);
    if (mode === 'criar') {
      if (nickname.trim().length < 2) { setBusy(false); setError('Seu apelido precisa ter pelo menos 2 letras.'); return; }
      const { error: err } = await supabase.auth.signUp({ email: em.data, password, options: { emailRedirectTo: window.location.origin, data: { nickname: nickname.trim().slice(0, 30), is_business: business } } });
      setBusy(false);
      if (err) { setError(err.message.includes('registered') ? 'Este e-mail já tem conta. Use "Entrar".' : 'Não foi possível criar a conta. Tente de novo.'); return; }
      setSent(true); return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email: em.data, password });
    setBusy(false);
    if (err) { setError(err.message.toLowerCase().includes('confirm') ? 'Confirme seu e-mail pelo link que enviamos.' : 'E-mail ou senha não conferem.'); return; }
    void navigate({ to: '/' });
  }

  if (cloudUser) return <div className="entry-layout"><Brand /><h1>Sua conta Nommi</h1><p className="intro">Você entrou como <b>{cloudUser.email}</b>.</p>
    <Button asChild className="wide"><Link to="/">Abrir o Nommi<Icon name="arrow" /></Link></Button>
    <Button variant="secondary" className="wide" onClick={() => signOut()}><Icon name="logout" />Sair</Button></div>;

  if (sent) return <div className="entry-layout"><Brand /><h1>Confira seu e-mail</h1><p className="intro">Enviamos um link para <b>{email}</b>. Toque nele para ativar sua conta e depois entre por aqui.</p><Button className="wide" onClick={() => { setSent(false); setMode('entrar'); }}>Já confirmei, entrar</Button></div>;

  return <div className="entry-layout account-page">
    <Brand />
    <h1>{mode === 'entrar' ? 'Entrar no Nommi' : 'Criar sua conta'}</h1>
    <p className="intro">Para quem quer companhia para sair, conversar e criar novas amizades.</p>
    <div className="chips" role="radiogroup" aria-label="Tipo de conta">
      <Button type="button" variant="outline" role="radio" aria-checked={!business} className={'chip ' + (!business ? 'selected' : '')} onClick={() => setBusiness(false)}>Sou pessoa</Button>
      <Button type="button" variant="outline" role="radio" aria-checked={business} className={'chip ' + (business ? 'selected' : '')} onClick={() => setBusiness(true)}>Sou empresa</Button>
    </div>
    <Button type="button" variant="secondary" className="wide" disabled={busy} onClick={() => social('google')}>Continuar com Google</Button>
    <Button type="button" variant="secondary" className="wide" disabled={busy} onClick={() => social('apple')}>Continuar com Apple</Button>
    <p className="small-note account-or">ou com e-mail</p>
    <form className="account-form" onSubmit={submit}>
      {mode === 'criar' && <label>{business ? 'Nome do estabelecimento ou seu apelido' : 'Qual apelido você quer usar?'}<input className="input" maxLength={30} value={nickname} onChange={e => setNickname(e.target.value)} required /></label>}
      <label>E-mail<input className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Senha<input className="input" type="password" autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <Button className="wide" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}</Button>
    </form>
    <Button type="button" variant="ghost" className="wide" onClick={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setError(''); }}>{mode === 'entrar' ? 'Ainda não tenho conta' : 'Já tenho conta'}</Button>
    {mode === 'criar' && <p className="small-note">Ao criar a conta, você confirma ter 18 anos ou mais e aceita os <Link to="/termos">Termos</Link> e a <Link to="/privacidade">Privacidade</Link>.</p>}
    <Button asChild variant="ghost" className="wide"><Link to="/">Voltar</Link></Button>
  </div>;
}
