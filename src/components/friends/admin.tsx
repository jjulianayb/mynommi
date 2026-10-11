import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from './art';
import { EmptyState } from './surfaces';
import { useDemoSession } from './session';
import { useFriends } from './store';

type Profile = { id: string; nickname: string; city: string; is_business: boolean; profile_mode: string; created_at: string };
type Business = { id: string; owner_id: string; name: string; kind: string; area: string; active: boolean; interests: string[] };
type Idea = { id: string; business_id: string; title: string; description: string; status: string; points: number; created_at: string };
type Credit = { user_id: string; balance: number; boost_until: string | null };
const TABS = ['Empresas', 'Ideias', 'Créditos', 'Pessoas'] as const;

/** Painel de administração: os dados vêm do servidor e as permissões são conferidas lá. */
export function Admin() {
  const { cloudUser, isAdmin } = useDemoSession();
  const { notify } = useFriends();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Empresas');
  const [profiles, setProfiles] = useState<Profile[]>([]); const [businesses, setBusinesses] = useState<Business[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]); const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true); const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [p, b, i, c] = await Promise.all([
      supabase.from('profiles').select('id,nickname,city,is_business,profile_mode,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('businesses').select('id,owner_id,name,kind,area,active,interests').order('created_at', { ascending: false }).limit(500),
      supabase.from('meetup_ideas').select('id,business_id,title,description,status,points,created_at').order('created_at', { ascending: false }).limit(500),
      supabase.from('credit_accounts').select('user_id,balance,boost_until').limit(1000),
    ]);
    if (p.error || b.error || i.error || c.error) notify('Não foi possível carregar tudo. Tente de novo.');
    setProfiles(p.data ?? []); setBusinesses(b.data ?? []); setIdeas(i.data ?? []); setCredits(c.data ?? []); setLoading(false);
  }, [notify]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  if (!cloudUser) return <EmptyState title="Entre com sua conta." text="O painel de administração só abre para contas autorizadas."><Button asChild><Link to="/conta">Entrar</Link></Button></EmptyState>;
  if (!isAdmin) return <EmptyState title="Acesso restrito." text="Esta conta não tem permissão de administração." />;

  const name = (id: string) => profiles.find(p => p.id === id)?.nickname || id.slice(0, 8);
  const bizName = (id: string) => businesses.find(b => b.id === id)?.name ?? 'Empresa';
  async function toggleBusiness(b: Business) { const { error } = await supabase.from('businesses').update({ active: !b.active }).eq('id', b.id); if (error) { notify('Não foi possível salvar.'); return; } notify(b.active ? 'Empresa ocultada.' : 'Empresa ativada.'); void load(); }
  async function setIdeaStatus(i: Idea, status: string) { const { error } = await supabase.from('meetup_ideas').update({ status }).eq('id', i.id); if (error) { notify('Não foi possível salvar.'); return; } notify('Ideia atualizada.'); void load(); }
  async function removeIdea(i: Idea) { const { error } = await supabase.from('meetup_ideas').delete().eq('id', i.id); if (error) { notify('Não foi possível apagar.'); return; } notify('Ideia apagada.'); void load(); }
  async function adjust(userId: string) {
    const n = Number(amounts[userId]); if (!Number.isInteger(n) || n === 0) { notify('Digite um número inteiro, por exemplo 10 ou -5.'); return; }
    const { error } = await supabase.rpc('admin_adjust_credits', { _user_id: userId, _amount: n, _reason: 'Ajuste do administrador' });
    if (error) { notify(error.message.includes('saldo') ? 'O saldo não pode ficar negativo.' : 'Não foi possível ajustar.'); return; }
    setAmounts(a => ({ ...a, [userId]: '' })); notify('Saldo atualizado.'); void load();
  }

  return <>
    <div className="page-title"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Painel Nommi</h1></div></div>
    <div className="stats"><div><b>{profiles.length}</b><span>contas</span></div><div><b>{businesses.length}</b><span>empresas</span></div><div><b>{ideas.length}</b><span>ideias</span></div><div><b>{credits.reduce((a, c) => a + c.balance, 0)}</b><span>créditos</span></div></div>
    <div className="chips" role="tablist">{TABS.map(t => <Button key={t} role="tab" aria-selected={tab === t} variant="outline" className={'chip ' + (tab === t ? 'selected' : '')} onClick={() => setTab(t)}>{t}</Button>)}<Button variant="ghost" onClick={() => void load()}><Icon name="clock" />Atualizar</Button></div>
    {loading ? <p className="small-note">Carregando…</p> : <div className="activity-list">
      {tab === 'Empresas' && (businesses.length ? businesses.map(b => <article className="activity" key={b.id}><span className="tone-icon teal"><Icon name="gift" /></span><div><h3>{b.name}</h3><p>{b.kind || 'Sem tipo'} · {b.area || 'sem bairro'} · dona: {name(b.owner_id)}</p><p>{b.interests.join(', ')}</p></div><Button variant={b.active ? 'secondary' : 'default'} onClick={() => toggleBusiness(b)}>{b.active ? 'Ocultar' : 'Ativar'}</Button></article>) : <p className="small-note">Nenhuma empresa cadastrada ainda.</p>)}
      {tab === 'Ideias' && (ideas.length ? ideas.map(i => <article className="idea-card" key={i.id}><h3>{i.title}</h3><p className="small-note">{bizName(i.business_id)} · {i.status} · +{i.points} pontos</p><p>{i.description}</p><div className="company-actions">{i.status !== 'publicada' && <Button onClick={() => setIdeaStatus(i, 'publicada')}>Publicar</Button>}{i.status !== 'arquivada' && <Button variant="secondary" onClick={() => setIdeaStatus(i, 'arquivada')}>Arquivar</Button>}<Button variant="ghost" onClick={() => removeIdea(i)}>Apagar</Button></div></article>) : <p className="small-note">Nenhuma ideia salva ainda.</p>)}
      {tab === 'Créditos' && (credits.length ? credits.map(c => <article className="activity" key={c.user_id}><span className="tone-icon yellow"><Icon name="star" /></span><div><h3>{name(c.user_id)}</h3><p>{c.balance} créditos{c.boost_until && new Date(c.boost_until) > new Date() ? ' · em destaque' : ''}</p></div><div className="admin-adjust"><input className="input" inputMode="numeric" aria-label={'Ajuste para ' + name(c.user_id)} placeholder="+10 / -5" value={amounts[c.user_id] ?? ''} onChange={e => setAmounts(a => ({ ...a, [c.user_id]: e.target.value }))} /><Button onClick={() => adjust(c.user_id)}>Ajustar</Button></div></article>) : <p className="small-note">Nenhuma conta ainda.</p>)}
      {tab === 'Pessoas' && profiles.map(p => <article className="activity" key={p.id}><span className="tone-icon blue"><Icon name="users" /></span><div><h3>{p.nickname || 'Sem apelido'}</h3><p>{p.is_business ? 'Empresa' : 'Pessoa'} · {p.profile_mode} · {p.city || 'sem cidade'}</p></div></article>)}
    </div>}
  </>;
}
