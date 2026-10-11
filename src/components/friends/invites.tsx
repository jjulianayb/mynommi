import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { people, type Invite } from '@/lib/friends-data';
import { Avatar, Icon } from './art';
import { useFriends } from './store';

const ME = 3;
const CATEGORIES = ['Academia', 'Vinho', 'Celebração', 'Trilha', 'Cozinha', 'Outro'] as const;
const catTone: Record<string, string> = { Academia: 'teal', Vinho: 'blue', Celebração: 'red', Trilha: 'teal', Cozinha: 'yellow', Outro: 'yellow' };
const catIcon: Record<string, string> = { Academia: 'users', Vinho: 'glass', Celebração: 'gift', Trilha: 'pin', Cozinha: 'star', Outro: 'spark' };

const inviteSchema = z.object({
  title: z.string().trim().min(3, 'Dê um nome ao convite.').max(60),
  category: z.enum(CATEGORIES),
  date: z.string().trim().min(3, 'Informe quando vai acontecer.').max(40),
  place: z.string().trim().min(3, 'Informe um local aproximado.').max(60),
});

export function InviteCard({ invite }: { invite: Invite }) {
  const { setState, notify } = useFriends();
  const host = people.find(p => p.id === invite.host);
  const going = invite.joined.includes(ME);
  const others = invite.joined.filter(id => id !== ME && id !== invite.host).slice(0, 4);
  function toggle() {
    setState(s => ({ ...s, invites: (s.invites ?? []).map(i => i.id === invite.id ? { ...i, joined: i.joined.includes(ME) ? i.joined.filter(x => x !== ME) : [...i.joined, ME] } : i) }));
    notify(going ? 'Você saiu do convite.' : 'Presença confirmada! A pessoa anfitriã foi avisada nesta demonstração.');
  }
  return <article className="invite-card">
    <div className="invite-head"><span className={'tone-icon ' + (catTone[invite.category] ?? 'yellow')}><Icon name={catIcon[invite.category] ?? 'spark'} /></span><div><h3>{invite.title}</h3><p>{invite.category}</p></div></div>
    <p className="invite-when"><Icon name="clock" />{invite.date}</p>
    <p className="invite-where"><Icon name="pin" />{invite.place}</p>
    <div className="invite-people">
      {invite.host !== ME && host && <span className="invite-host"><Avatar id={invite.host} size={30} />{host.name.split(' ')[0]} convida</span>}
      {invite.host === ME && <span className="invite-host">Seu convite</span>}
      <span className="avatar-stack">{others.map(id => <Avatar key={id} id={id} size={26} />)}{invite.joined.length > 0 && <b className="invite-count">{invite.joined.length} {invite.joined.length === 1 ? 'pessoa vai' : 'pessoas vão'}</b>}</span>
    </div>
    <Button variant={going ? 'secondary' : 'default'} className="wide" onClick={toggle}><Icon name={going ? 'check' : 'heart'} />{going ? 'Você vai' : 'Quero ir'}</Button>
  </article>;
}

export function Invites() {
  const { state, setState, notify } = useFriends();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(''); const [category, setCategory] = useState<string>('Academia');
  const [date, setDate] = useState(''); const [place, setPlace] = useState(''); const [error, setError] = useState('');
  const invites = (state.invites ?? []).filter(i => i.host !== undefined && !state.blocked.includes(i.host));

  function create(e: React.FormEvent) {
    e.preventDefault();
    const result = inviteSchema.safeParse({ title, category, date, place });
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Confira os campos.'); return; }
    setState(s => ({ ...s, invites: [...(s.invites ?? []), { id: Date.now(), ...result.data, host: ME, joined: [ME] }] }));
    setTitle(''); setDate(''); setPlace(''); setError(''); setCreating(false);
    notify('Convite publicado nesta demonstração!');
  }

  return <div className="action-page invites-page">
    <div className="section-heading"><h1>Convites</h1><Button variant="secondary" onClick={() => setCreating(c => !c)}><Icon name="plus" />Criar convite</Button></div>
    <p className="intro">Academia, vinho, uma celebração: proponha um plano e veja quem topa. O local é sempre aproximado.</p>
    {creating && <form className="invite-form" onSubmit={create}>
      <label>Nome do convite<input className="input" required maxLength={60} placeholder="Ex.: Corrida de domingo cedo" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Atividade<select className="input" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>Quando<input className="input" required maxLength={40} placeholder="Ex.: Domingo, 7h30" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Local aproximado<input className="input" required maxLength={60} placeholder="Ex.: Perto da Lagoa da Pampulha" value={place} onChange={e => setPlace(e.target.value)} /></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <Button className="wide"><Icon name="send" />Publicar convite</Button>
    </form>}
    <div className="invite-list">{invites.map(i => <InviteCard key={i.id} invite={i} />)}</div>
    <p className="small-note">Demonstração com convites fictícios. Endereços exatos só são compartilhados depois que você confirma presença.</p>
  </div>;
}
