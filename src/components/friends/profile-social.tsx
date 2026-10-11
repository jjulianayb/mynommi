import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { groups, people } from '@/lib/friends-data';
import { Avatar, Icon } from './art';
import { Sheet } from './surfaces';

/** "Rolês": story-like circles with real outings shared with friends. */
export const roles = [
  { title: 'Karaokê de sexta', place: 'Karaokê Bem-Te-Vi', friend: 1, tone: 'red', icon: 'mic', when: 'há 2 dias' },
  { title: 'Vinho na varanda', place: 'Bar do Vinho Azul', friend: 2, tone: 'blue', icon: 'glass', when: 'há 4 dias' },
  { title: 'Trilha cedinho', place: 'Trilha Aberta', friend: 6, tone: 'teal', icon: 'pin', when: 'semana passada' },
  { title: 'Pizza da turma', place: 'Pizzaria Forno Doce', friend: 10, tone: 'yellow', icon: 'star', when: 'semana passada' },
  { title: 'Cineclube online', place: 'Chamada de vídeo', friend: 8, tone: 'red', icon: 'heart', when: 'há 10 dias' },
];

export function ProfileRoles({ avatar, name }: { avatar: number; name: string }) {
  const [open, setOpen] = useState<number | null>(null); const r = open !== null ? roles[open] : undefined;
  const friend = r && people.find(p => p.id === r.friend);
  return <section className="roles" aria-label="Rolês">
    <h2>Rolês <small>saídas com amigas e amigos</small></h2>
    <div className="roles-row">{roles.map((x, i) => <button key={x.title} type="button" className="role-bubble" onClick={() => setOpen(i)}><span className={'role-ring tone-' + x.tone}><span className="role-pair"><Avatar id={avatar} size={34} /><Avatar id={x.friend} size={34} /></span></span><small>{x.title}</small></button>)}</div>
    {r && <Sheet title={r.title} onClose={() => setOpen(null)}><div className={'role-view tone-bg-' + r.tone}><span className="role-progress">{roles.map((_, i) => <i key={i} className={i <= open! ? 'on' : ''} />)}</span><div className="role-pair big"><Avatar id={avatar} size={88} /><Avatar id={r.friend} size={88} /></div><h3>{name.split(' ')[0]} e {friend?.name.split(' ')[0]}</h3><p><Icon name={r.icon} />{r.place} · {r.when}</p></div>
      <div className="role-actions"><Button variant="secondary" disabled={open === 0} onClick={() => setOpen(o => (o ?? 1) - 1)}>Anterior</Button><Button disabled={open === roles.length - 1} onClick={() => setOpen(o => (o ?? 0) + 1)}>Próximo<Icon name="arrow" /></Button></div>
      <p className="small-note">Ilustração de exemplo. Rolês só aparecem com a aprovação de quem participou.</p></Sheet>}
  </section>;
}

const shots = ['Brinde de sexta', 'Refrão em dupla', 'Café sem pressa', 'Bolo de cenoura', 'Corrida no parque', 'Noite de jogos', 'Feira de domingo', 'Papo online', 'Pôr do sol'];
const tones = ['red', 'blue', 'teal', 'yellow'];
export function ProfileGrid({ avatar }: { avatar: number }) {
  return <section className="profile-grid" aria-label="Momentos">{shots.map((s, i) => { const g = groups[i % groups.length]!; const id = g.ids[i % g.ids.length] ?? 1; return <figure key={s} className={'grid-shot tone-bg-' + tones[i % 4]}><div className="role-pair"><Avatar id={avatar} size={40} /><Avatar id={id} size={40} /></div><figcaption>{s}</figcaption></figure> })}</section>;
}
