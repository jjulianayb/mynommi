import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { groups, people } from '@/lib/friends-data';
import { momentPhoto } from '@/lib/friends-photos';
import { Avatar, Icon } from './art';
import { Sheet } from './surfaces';

/** "Rolês": story-like circles with real outings shared with friends. */
export const roles = [
  { title: 'Karaokê de sexta', place: 'Karaokê Bem-Te-Vi', friend: 1, tone: 'red', icon: 'mic', when: 'há 2 dias', photo: momentPhoto.karaoke },
  { title: 'Vinho na varanda', place: 'Bar do Vinho Azul', friend: 2, tone: 'blue', icon: 'glass', when: 'há 4 dias', photo: momentPhoto.vinho },
  { title: 'Trilha cedinho', place: 'Trilha Aberta', friend: 6, tone: 'teal', icon: 'pin', when: 'semana passada', photo: momentPhoto.trilha },
  { title: 'Pizza da teia', place: 'Pizzaria Forno Doce', friend: 10, tone: 'yellow', icon: 'star', when: 'semana passada', photo: momentPhoto.pizza },
  { title: 'Bolo de cenoura', place: 'Casa da Tati', friend: 6, tone: 'red', icon: 'heart', when: 'há 10 dias', photo: momentPhoto.bolo },
  { title: 'Corrida no parque', place: 'Parque Municipal', friend: 8, tone: 'teal', icon: 'pin', when: 'há 12 dias', photo: momentPhoto.corrida },
];

export function ProfileRoles({ avatar, name }: { avatar: number; name: string }) {
  const [open, setOpen] = useState<number | null>(null); const r = open !== null ? roles[open] : undefined;
  const friend = r && people.find(p => p.id === r.friend);
  return <section className="roles" aria-label="Rolês">
    <h2>Rolês <small>saídas com amigas e amigos</small></h2>
    <div className="roles-row">{roles.map((x, i) => <button key={x.title} type="button" className="role-bubble" onClick={() => setOpen(i)}><span className={'role-ring tone-' + x.tone}><img className="role-thumb" src={x.photo} alt="" loading="lazy" /></span><small>{x.title}</small></button>)}</div>
    {r && <Sheet title={r.title} onClose={() => setOpen(null)}><div className={'role-view tone-bg-' + r.tone}><span className="role-progress">{roles.map((_, i) => <i key={i} className={i <= open! ? 'on' : ''} />)}</span><img className="role-photo" src={r.photo} alt={r.title} /><div className="role-view-people"><Avatar id={avatar} size={44} /><Avatar id={r.friend} size={44} /></div><h3>{name.split(' ')[0]} e {friend?.name.split(' ')[0]}</h3><p><Icon name={r.icon} />{r.place} · {r.when}</p></div>
      <div className="role-actions"><Button variant="secondary" disabled={open === 0} onClick={() => setOpen(o => (o ?? 1) - 1)}>Anterior</Button><Button disabled={open === roles.length - 1} onClick={() => setOpen(o => (o ?? 0) + 1)}>Próximo<Icon name="arrow" /></Button></div>
      <p className="small-note">Foto de exemplo. Rolês só aparecem com a aprovação de quem participou.</p></Sheet>}
  </section>;
}

const shots: { label: string; photo?: string }[] = [
  { label: 'Brinde de sexta', photo: momentPhoto.vinho },
  { label: 'Refrão em dupla', photo: momentPhoto.karaoke },
  { label: 'Bolo de cenoura', photo: momentPhoto.bolo },
  { label: 'Corrida no parque', photo: momentPhoto.corrida },
  { label: 'Trilha com a teia', photo: momentPhoto.trilha },
  { label: 'Pizza de domingo', photo: momentPhoto.pizza },
];
export function ProfileGrid({ avatar }: { avatar: number }) {
  return <section className="profile-grid" aria-label="Momentos">{shots.map((s, i) => { const g = groups[i % groups.length]!; const id = g.ids[i % g.ids.length] ?? 1; return <figure key={s.label} className="grid-shot">{s.photo ? <img src={s.photo} alt={s.label} loading="lazy" /> : <div className="role-pair"><Avatar id={avatar} size={40} /><Avatar id={id} size={40} /></div>}<figcaption>{s.label}</figcaption></figure> })}</section>;
}
