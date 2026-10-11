import { boostInvite, INVITE_BOOST_COST } from '@/lib/credits';
import { FirstMeetNotice } from './privacy';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { people, WHEN_OPTIONS, REGION_OPTIONS, type Invite, type When } from '@/lib/friends-data';
import { Avatar, Icon } from './art';
import { Sheet } from './surfaces';
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
  when: z.string().refine(v => WHEN_OPTIONS.includes(v as When), 'Escolha quando vai acontecer.'),
  region: z.string().refine(v => REGION_OPTIONS.includes(v), 'Escolha uma região aproximada.'),
});

export function InviteCard({ invite }: { invite: Invite }) {
  const { state, setState, notify } = useFriends();
  const boosted = (state.boostedInvites ?? []).includes(invite.id);
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
    {boosted && <span className="boost-badge"><Icon name="spark" />Em destaque</span>}
    {invite.host === ME && !boosted && <Button variant="outline" className="wide" onClick={() => { const next = boostInvite(state, invite.id); if (!next) { notify('Faltam créditos. Adicione na Carteira.'); return; } setState(next); notify('Convite em destaque.'); }}><Icon name="spark" />Destacar · {INVITE_BOOST_COST} créditos</Button>}
    <Button variant={going ? 'secondary' : 'default'} className="wide" onClick={toggle}><Icon name={going ? 'check' : 'heart'} />{going ? 'Você vai' : 'Quero ir'}</Button>
  </article>;
}

export type PlanFiltersValue = { activity: string; when: string; region: string };
const NO_FILTER: PlanFiltersValue = { activity: 'Todas', when: 'Qualquer dia', region: 'Toda a cidade' };
const FILTER_DEFS = [
  { key: 'activity' as const, label: 'Atividade', icon: 'spark', placeholder: 'Todas' },
  { key: 'when' as const, label: 'Quando', icon: 'clock', placeholder: 'Qualquer dia' },
  { key: 'region' as const, label: 'Região', icon: 'pin', placeholder: 'Toda a cidade' },
];

export function PlanFilterBar({ options, value, onChange, onClear, showClear }: { options: Record<keyof PlanFiltersValue, string[]>; value: PlanFiltersValue; onChange: (v: PlanFiltersValue) => void; onClear: () => void; showClear: boolean }) {
  const [open, setOpen] = useState<keyof PlanFiltersValue | null>(null);
  const current = FILTER_DEFS.find(f => f.key === open);
  return <div className="plan-filters">
    <div className="plan-filter-pills">{FILTER_DEFS.map(f => <Button type="button" variant="outline" key={f.key} className={value[f.key] !== f.placeholder ? 'plan-pill on' : 'plan-pill'} aria-haspopup="dialog" onClick={() => setOpen(f.key)}><Icon name={f.icon} />{f.label}{value[f.key] !== f.placeholder && <b>{value[f.key]}</b>}<Icon name="arrow" className="pill-caret" /></Button>)}</div>
    {showClear && <Button type="button" variant="ghost" className="plan-clear" onClick={onClear}><Icon name="close" />Limpar filtros</Button>}
    {current && <Sheet title={current.label} onClose={() => setOpen(null)}><div className="plan-sheet-options">{options[current.key].map(o => <Button type="button" variant={value[current.key] === o ? 'default' : 'secondary'} key={o} onClick={() => { onChange({ ...value, [current.key]: o }); setOpen(null); }}>{o}{value[current.key] === o && <Icon name="check" />}</Button>)}</div></Sheet>}
  </div>;
}

export function Invites() {
  const { state, setState, notify } = useFriends();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(''); const [category, setCategory] = useState<string>('Academia');
  const [date, setDate] = useState(''); const [place, setPlace] = useState(''); const [error, setError] = useState('');
  const [when, setWhen] = useState(''); const [region, setRegion] = useState('');
  const invites = (state.invites ?? []).filter(i => i.host !== undefined && !state.blocked.includes(i.host));

  function create(e: React.FormEvent) {
    e.preventDefault();
    const result = inviteSchema.safeParse({ title, category, date, place, when, region });
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Confira os campos.'); return; }
    setState(s => ({ ...s, invites: [...(s.invites ?? []), { id: Date.now(), title: result.data.title, category: result.data.category, date: result.data.date, place: result.data.place, when: result.data.when as When, region: result.data.region, host: ME, joined: [ME] }] }));
    setTitle(''); setDate(''); setPlace(''); setWhen(''); setRegion(''); setError(''); setCreating(false);
    notify('Convite publicado nesta demonstração!');
  }

  return <div className="action-page invites-page">
    <div className="section-heading"><h1>Convites</h1><Button variant="secondary" onClick={() => setCreating(c => !c)}><Icon name="plus" />Criar convite</Button></div>
    <FirstMeetNotice />
    <p className="intro">Academia, vinho, uma celebração: proponha um plano e veja quem topa. O local é sempre aproximado.</p>
    {creating && <form className="invite-form" onSubmit={create}>
      <label>Nome do convite<input className="input" required maxLength={60} placeholder="Ex.: Corrida de domingo cedo" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Atividade<select className="input" value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>Quando<input className="input" required maxLength={40} placeholder="Ex.: Domingo, 7h30" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Periodo<select className="input" value={when} onChange={e => setWhen(e.target.value)}><option value="">Escolha…</option>{WHEN_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}</select></label>
      <label>Local aproximado<input className="input" required maxLength={60} placeholder="Ex.: Perto da Lagoa da Pampulha" value={place} onChange={e => setPlace(e.target.value)} /></label>
      <label>Região aproximada<select className="input" value={region} onChange={e => setRegion(e.target.value)}><option value="">Escolha…</option>{REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <Button className="wide"><Icon name="send" />Publicar convite</Button>
    </form>}
    <div className="invite-list">{invites.map(i => <InviteCard key={i.id} invite={i} />)}</div>
    <p className="small-note">Demonstração com convites fictícios. Endereços exatos só são compartilhados depois que você confirma presença.</p>
  </div>;
}
