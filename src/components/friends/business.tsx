import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { partners, people, getPartner, money } from '@/lib/friends-data';
import { CREDIT_PACKS, PAY_METHODS, BOOST_COST, INVITE_BOOST_COST, buyCredits, boostProfile, isBoosted, type PayMethod } from '@/lib/credits';
import { brandTeiaFor, isMember, joinTeia, leaveTeia } from '@/lib/teias';
import { Avatar, Cover, Icon, Sticker } from './art';
import { EmptyState } from './surfaces';
import { useFriends } from './store';
import { useDemoSession } from './session';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

/** Carteira da conta real: saldo e destaque guardados no servidor. */
function CloudWallet({ userId }: { userId: string }) {
  const { notify } = useFriends();
  const [acc, setAcc] = useState<{ balance: number; boost_until: string | null } | null>(null);
  const [hist, setHist] = useState<{ amount: number; reason: string; created_at: string }[]>([]);
  async function load() {
    const [a, h] = await Promise.all([
      supabase.from('credit_accounts').select('balance,boost_until').eq('user_id', userId).maybeSingle(),
      supabase.from('credit_ledger').select('amount,reason,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);
    setAcc(a.data ?? { balance: 0, boost_until: null }); setHist(h.data ?? []);
  }
  useEffect(() => { void load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const boosted = !!acc?.boost_until && new Date(acc.boost_until) > new Date();
  async function boost() {
    const { error } = await supabase.rpc('spend_boost');
    if (error) { notify(error.message.includes('saldo') ? 'Faltam créditos para o destaque.' : 'Não foi possível destacar agora.'); return; }
    notify('Seu perfil está em destaque por 24 h.'); void load();
  }
  return <>
    <Heading title="Carteira" label="CRÉDITOS DE ALCANCE · SUA CONTA" />
    <p className="intro">Seu saldo fica guardado na sua conta e vale em qualquer aparelho.</p>
    <section className="card wallet-balance"><span className="tone-icon yellow"><Icon name="star" /></span><div><small>Seu saldo</small><strong>{acc ? acc.balance : '…'} créditos</strong></div>{boosted && <span className="boost-badge"><Icon name="spark" />Em destaque até {fmt(acc!.boost_until as string)}</span>}</section>
    <div className="activity-list"><article className="activity"><span className="tone-icon red"><Icon name="spark" /></span><div><h3>Destaque por 24 h</h3><p>Seu perfil aparece antes para quem combina · {BOOST_COST} créditos</p></div><Button onClick={boost} disabled={!acc}>{boosted ? 'Estender' : 'Destacar'}</Button></article></div>
    <div className="section-heading"><h2>Adicionar créditos</h2></div>
    <p className="small-note">A compra com Pix, Apple Pay e Google Pay chega na próxima etapa. Até lá, a equipe Nommi pode adicionar créditos pelo painel de administração.</p>
    <div className="section-heading"><h2>Histórico</h2></div>
    {hist.length ? <div className="activity-list">{hist.map((h, i) => <div className="activity" key={i}><span className={'tone-icon ' + (h.amount > 0 ? 'teal' : 'red')}><Icon name={h.amount > 0 ? 'plus' : 'spark'} /></span><div><h3>{h.reason}</h3><p>{fmt(h.created_at)}</p></div><b>{h.amount > 0 ? '+' : ''}{h.amount}</b></div>)}</div> : <p className="small-note">Ainda não há movimentações.</p>}
  </>;
}

function Heading({ title, label }: { title: string; label?: string }) { return <div className="page-title"><div>{label && <p className="eyebrow">{label}</p>}<h1>{title}</h1></div></div>; }
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function Wallet() {
  const { cloudUser } = useDemoSession();
  if (cloudUser) return <CloudWallet userId={cloudUser.id} />;
  return <DemoWallet />;
}
function DemoWallet() {
  const { state, setState, notify } = useFriends();
  const [pack, setPack] = useState<string>('p30');
  const [method, setMethod] = useState<PayMethod>('Pix');
  const [paying, setPaying] = useState(false);
  const boosted = isBoosted(state);
  const chosen = CREDIT_PACKS.find(p => p.id === pack);
  function pay() {
    setPaying(true);
    setTimeout(() => { setState(s => buyCredits(s, pack, method)); setPaying(false); notify('Créditos adicionados nesta demonstração. Nenhuma cobrança.'); }, method === 'Pix' ? 3000 : 1200);
  }
  return <>
    <Heading title="Carteira" label="CRÉDITOS DE ALCANCE" />
    <p className="intro">Use créditos para aparecer para mais gente com interesses em comum. Sem ranking: o destaque só coloca você um pouco mais perto de quem combina.</p>
    <section className="card wallet-balance"><span className="tone-icon yellow"><Icon name="star" /></span><div><small>Seu saldo</small><strong>{state.credits ?? 0} créditos</strong></div>{boosted && <span className="boost-badge"><Icon name="spark" />Em destaque até {fmt(state.boostUntil as string)}</span>}</section>
    <div className="section-heading"><h2>Usar créditos</h2></div>
    <div className="activity-list">
      <article className="activity"><span className="tone-icon red"><Icon name="spark" /></span><div><h3>Destaque por 24 h</h3><p>Seu perfil aparece antes no Descobrir e no Radar · {BOOST_COST} créditos</p></div><Button onClick={() => { const next = boostProfile(state); if (!next) { notify('Faltam créditos. Escolha um pacote abaixo.'); return; } setState(next); notify(boosted ? 'Destaque estendido por mais 24 h.' : 'Seu perfil está em destaque por 24 h.'); }}>{boosted ? 'Estender' : 'Destacar'}</Button></article>
      <article className="activity"><span className="tone-icon teal"><Icon name="gift" /></span><div><h3>Destacar convite</h3><p>Seu plano sobe em "Planos perto de você" · {INVITE_BOOST_COST} créditos</p></div><Button asChild variant="secondary"><Link to="/convites">Escolher</Link></Button></article>
    </div>
    {state.profileMode === 'privado' && <p className="small-note">Seu perfil é privado: o destaque aparece só para quem já é amizade.</p>}
    <div className="section-heading"><h2>Adicionar créditos</h2></div>
    <div className="pack-grid" role="radiogroup" aria-label="Pacotes de créditos">{CREDIT_PACKS.map(p => <Button key={p.id} type="button" variant="outline" role="radio" aria-checked={pack === p.id} className={'pack-card ' + (pack === p.id ? 'selected' : '')} onClick={() => setPack(p.id)}><strong>{p.credits}</strong><span>créditos</span><small>{money(p.price)}</small></Button>)}</div>
    <div className="chips" role="radiogroup" aria-label="Forma de pagamento">{PAY_METHODS.map(m => <Button key={m} type="button" variant="outline" role="radio" aria-checked={method === m} className={'chip ' + (method === m ? 'selected' : '')} onClick={() => setMethod(m)}>{m}</Button>)}</div>
    {method === 'Pix' && <section className="card pix-box"><div className="pix-qr" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => <i key={i} className={(i * 7 + i % 5) % 3 ? '' : 'on'} />)}</div><div><h3>Pix copia e cola</h3><p className="pix-code">00020126NOMMI.DEMO5204000053039865802BR</p><Button variant="secondary" size="sm" onClick={async () => { try { await navigator.clipboard.writeText('00020126NOMMI.DEMO5204000053039865802BR'); notify('Código Pix de exemplo copiado.'); } catch { notify('Não foi possível copiar.'); } }}><Icon name="link" />Copiar</Button></div></section>}
    <Button className="wide" disabled={paying} onClick={pay}><Icon name="check" />{paying ? (method === 'Pix' ? 'Aguardando o Pix…' : 'Confirmando…') : `Pagar ${chosen ? money(chosen.price) : ''} com ${method}`}</Button>
    <p className="small-note">Demonstração, nenhuma cobrança.</p>
    <div className="section-heading"><h2>Histórico</h2></div>
    {(state.creditHistory ?? []).length ? <div className="activity-list">{(state.creditHistory ?? []).map((h, i) => <div className="activity" key={i}><span className={'tone-icon ' + (h.amount > 0 ? 'teal' : 'red')}><Icon name={h.amount > 0 ? 'plus' : 'spark'} /></span><div><h3>{h.label}</h3><p>{fmt(h.at)}</p></div><b>{h.amount > 0 ? '+' : ''}{h.amount}</b></div>)}</div> : <p className="small-note">Ainda não há movimentações.</p>}
  </>;
}

const AMBASSADORS: Record<number, number[]> = { 0: [7, 6], 1: [4, 2], 2: [1], 3: [10], 4: [6], 5: [12, 8] };

export function Company({ id }: { id: number }) {
  const { state, setState, notify } = useFriends();
  const p = partners[id];
  if (!p) return <EmptyState title="Empresa não encontrada." text="Ela pode ter saído do Clube."><Button asChild><Link to="/clube">Ver o Clube</Link></Button></EmptyState>;
  const teia = brandTeiaFor(id);
  const member = teia ? isMember(state, teia.id) : false;
  const ambassadors = (AMBASSADORS[id] ?? []).map(pid => people.find(x => x.id === pid)).filter(x => !!x && !state.blocked.includes(x.id));
  return <>
    <Cover tone={p.tone} />
    <div className="company-head"><span className={'tone-icon ' + p.tone}><Icon name={p.icon} /></span><div><p className="eyebrow">{p.category.toUpperCase()} · PARCEIRO NOMMI</p><h1>{p.name}</h1><p className="small-note">Região aproximada · Belo Horizonte</p></div></div>
    <section className="redemption"><h2>Para teias</h2><p>{p.benefit} · {p.points} pontos da teia</p><p className="small-note">{p.visits===1?'1 encontro':p.visits+' encontros'} de teias por aqui neste mês.</p></section>
    {teia && <section className="redemption"><span className="boost-badge"><Icon name="users" />Teia da marca</span><h2>{teia.name}</h2><p>{teia.time} · {teia.members} pessoas · entrada sem aprovação</p><div className="company-actions">{member ? <><Button asChild><Link to="/grupos/$id" params={{ id: String(teia.id) }}><Icon name="chat" />Abrir conversa</Link></Button><Button variant="secondary" onClick={() => { setState(s => leaveTeia(s, teia.id)); notify('Você saiu da teia.'); }}>Sair da teia</Button></> : <Button onClick={() => { setState(s => joinTeia(s, teia.id)); notify('Você entrou! Diga oi para a teia.'); }}><Icon name="users" />Entrar</Button>}</div></section>}
    <div className="section-heading"><h2>Quem agita aqui</h2></div>
    {ambassadors.length ? <div className="activity-list">{ambassadors.map(a => a && <Link to="/perfil" search={{ p: a.id }} className="activity" key={a.id}><Avatar id={a.id} size={44} /><div><h3>{a.name}</h3><p>Leva a teia para cá com frequência</p></div><span className="boost-badge"><Icon name="star" />Agita aqui</span></Link>)}</div> : <p className="small-note">Ainda ninguém por aqui.</p>}
    <div className="section-heading"><h2>Mural de quem foi</h2></div>
    <div className="company-wall">{[id % 6, (id + 2) % 6, (id + 4) % 6].map(s => <Sticker key={s} id={s} size={88} />)}</div>
    <p className="small-note">Primeiro encontro? Prefira um lugar público e avise alguém de confiança.</p>
  </>;
}

/** Bloco do painel do parceiro: comunidade da marca e alcance. */
export function PartnerCommunity() {
  const teia = brandTeiaFor(0); const p = getPartner(0);
  return <>
    <div className="section-heading"><h2>Comunidade da marca</h2><Link to="/empresa/$id" params={{ id: '0' }}>Ver perfil<Icon name="arrow" /></Link></div>
    <div className="stats partner-stats"><div><b>{teia?.members ?? 0}</b><span>na teia</span></div><div><b>{p.visits * 3}</b><span>visitas/mês</span></div><div><b>2</b><span>agitam aqui</span></div><div><b>1</b><span>convite destacado</span></div></div>
    <p className="small-note">Sua teia da marca reúne quem gosta do lugar. Use créditos de alcance para mostrar seus encontros a mais gente por perto.</p>
    <Button asChild variant="secondary" className="wide"><Link to="/carteira"><Icon name="star" />Créditos de alcance</Link></Button>
  </>;
}
