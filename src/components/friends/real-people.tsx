import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Avatar, Icon } from './art';
import { EmptyState } from './surfaces';
import { useFriends } from './store';
import { useDemoSession } from './session';
import { usePeopleSearch, usePublicProfile, type PublicProfile } from '@/lib/real-profiles';

function Face({ p, size }: { p: PublicProfile; size: number }) {
  return p.avatar_url ? <img className="real-face" src={p.avatar_url} width={size} height={size} style={{ width: size, height: size }} alt={'Foto de ' + p.nickname} /> : <Avatar id={3} size={size} />;
}

export function PeopleSearch({ userId }: { userId: string }) {
  const { state } = useFriends();
  const [q, setQ] = useState('');
  const { rows, loading } = usePeopleSearch(q, userId);
  const mine = new Set(state.interests ?? []);
  return <section className="people-search">
    <label className="search-field"><Icon name="users" /><input className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por apelido ou cidade" aria-label="Buscar nommi por apelido ou cidade" maxLength={40} /></label>
    {loading && !rows.length ? <p className="small-note">Procurando…</p> : !rows.length ? <EmptyState title={q ? 'Ninguém com esse nome ou cidade.' : 'Ainda há poucos nommi por aqui.'} text="Convide uma amizade para entrar no Nommi."><Button asChild variant="secondary"><Link to="/convidar">Convidar uma amizade</Link></Button></EmptyState> :
      <div className="people-list">{rows.map(p => { const common = p.interests.filter(i => mine.has(i)); return <Link key={p.id} to="/nommi/$id" params={{ id: p.id }} className="conversation">
        <Face p={p} size={56} />
        <div><h3>{p.nickname}</h3><p>{p.city || 'Cidade não informada'}{common.length ? ' · ' + common.length + (common.length === 1 ? ' interesse em comum' : ' interesses em comum') : ''}</p></div><Icon name="arrow" />
      </Link>; })}</div>}
    <p className="small-note">Só aparecem perfis públicos. E-mail e telefone nunca são mostrados.</p>
  </section>;
}

export function PublicNommi({ id }: { id: string }) {
  const { state, notify } = useFriends();
  const { cloudUser, demoMode } = useDemoSession();
  const enabled = !!cloudUser && !demoMode;
  const { ready, profile, teias } = usePublicProfile(id, enabled);
  if (!enabled) return <EmptyState title="Entre na sua conta para ver este nommi." text="Perfis reais ficam visíveis só para quem tem conta."><Button asChild><Link to="/conta">Entrar</Link></Button></EmptyState>;
  if (!ready) return <p className="small-note">Carregando perfil…</p>;
  if (!profile) return <EmptyState title="Este nommi não está disponível." text="O perfil pode ser privado ou não existir mais."><Button asChild variant="secondary"><Link to="/descobrir">Voltar para Descobrir</Link></Button></EmptyState>;
  const mine = new Set(state.interests ?? []);
  const own = cloudUser?.id === profile.id;
  return <section className="profile-top">
    <Button asChild variant="ghost" className="back-link"><Link to="/descobrir"><Icon name="back" />Descobrir</Link></Button>
    <div className="profile-info">
      <Face p={profile} size={108} />
      <div className="profile-name"><h1>{profile.nickname}</h1></div>
      {profile.city && <div className="profile-meta"><span><Icon name="pin" />{profile.city}</span></div>}
      {profile.about && <p>{profile.about}</p>}
      {profile.interests.length > 0 && <div className="interest-tags">{profile.interests.map(i => <span key={i} className={mine.has(i) ? 'common' : ''}>{mine.has(i) ? 'Em comum: ' + i : i}</span>)}</div>}
      {!own && <div className="profile-actions"><Button onClick={() => notify('Pedido de conexão chega na próxima etapa. Por enquanto, chame ' + profile.nickname + ' para uma teia.')}><Icon name="plus" />Conectar</Button></div>}
      <h2 className="settings-subtitle">Teias criadas</h2>
      {teias.length ? <div className="people-list">{teias.map(t => <Link key={t.id} to="/grupos/$id" params={{ id: String(t.id) }} className="conversation"><div><h3>{t.name}</h3><p>{t.kind === 'role' ? 'Rolê aberto' : 'Teia'}{t.city ? ' · ' + t.city : ''}</p></div><Icon name="arrow" /></Link>)}</div> : <p className="small-note">Ainda não criou teias.</p>}
    </div>
  </section>;
}
