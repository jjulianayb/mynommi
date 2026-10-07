import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { groups } from '@/lib/friends-data';
import { Avatar, Icon } from './art';
import { Sheet } from './surfaces';
import { useFriends } from './store';

export type ConnectionMode = 'Presencial' | 'Virtual' | 'Híbrida';
const modeIcon: Record<ConnectionMode, string> = { Presencial: 'pin', Virtual: 'chat', Híbrida: 'spark' };
export const slug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

export function NommiIdentity({ name, avatar, interests, mode, own }: { name: string; avatar: number; interests: string[]; mode: ConnectionMode; own: boolean }) {
  const { setState, notify } = useFriends(); const [card, setCard] = useState(false); const handle = 'nommi.me/' + slug(name.split(' ')[0] ?? name);
  return <div className="nommi-identity">
    <Button variant="secondary" className="nommi-handle" onClick={() => setCard(true)}><Icon name="link" />{own ? 'Seu Nommi' : 'Nommi'}: <b>{handle}</b></Button>
    <div className="mode-row" role="group" aria-label="Modo de amizade">{(['Presencial', 'Virtual', 'Híbrida'] as ConnectionMode[]).map(m => own
      ? <Button key={m} size="sm" variant={mode === m ? 'default' : 'ghost'} aria-pressed={mode === m} onClick={() => { setState(s => ({ ...s, mode: m })); notify('Modo de amizade: ' + m + '.') }}><Icon name={modeIcon[m]} />{m}</Button>
      : mode === m && <span key={m} className="mode-chip"><Icon name={modeIcon[m]} />Prefere amizade {m.toLowerCase()}</span>)}</div>
    {card && <Sheet title="Card Nommi" onClose={() => setCard(false)}><div className="nommi-card"><Avatar id={avatar} size={88} /><h3>{name}</h3><p className="nommi-card-handle">{handle}</p><div className="chips">{interests.slice(0, 3).map(i => <span className="mode-chip" key={i}>{i}</span>)}<span className="mode-chip"><Icon name={modeIcon[mode]} />{mode}</span></div><p className="small-note">Perfil de demonstração · Maiores de 18</p></div><Button className="wide" onClick={async () => { try { await navigator.clipboard.writeText('https://' + handle); notify('Link do Nommi copiado.'); setCard(false) } catch { notify('Não foi possível copiar. Tente novamente.') } }}><Icon name="link" />Copiar meu link</Button></Sheet>}
  </div>;
}

export function SocialWeb({ name, avatar, photo }: { name: string; avatar: number; photo?: string }) {
  const [sel, setSel] = useState(0); const g = groups[sel] ?? groups[0]!;
  const pos = [{ x: 50, y: 14 }, { x: 15, y: 74 }, { x: 85, y: 74 }];
  return <section className="social-web"><h2>Minha teia</h2><p className="small-note">Como {name.split(' ')[0]} se conecta com as pessoas.</p>
    <div className="web-canvas">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{pos.map((p, i) => <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} className={'web-line ' + (groups[i]?.tone ?? '')} />)}</svg>
      <div className="web-center">{photo ? <img src={photo} alt="" /> : <Avatar id={avatar} size={72} />}</div>
      {groups.map((gr, i) => <Button key={gr.id} variant="ghost" className={'web-node ' + gr.tone + (sel === i ? ' selected' : '')} style={{ left: pos[i]!.x + '%', top: pos[i]!.y + '%' }} onClick={() => setSel(i)} aria-pressed={sel === i}><span className={'tone-icon ' + gr.tone}><Icon name={gr.icon} /></span><small>{gr.name}</small></Button>)}
    </div>
    <article className="web-detail"><div className="row"><span className={'tone-icon ' + g.tone}><Icon name={g.icon} /></span><div><h3>{g.name}</h3><p>{g.mode} · {g.members} pessoas · {3 + sel} encontros juntas</p></div></div>
      <div className="web-moments">{g.ids.slice(0, 4).map((id, i) => <figure key={id} className={'web-moment ' + ['red', 'blue', 'teal', 'yellow'][i]}><div className="avatar-stack"><Avatar id={avatar} size={34} /><Avatar id={id} size={34} /></div><figcaption>{['Brinde de sexta', 'Refrão em dupla', 'Café sem pressa', 'Papo online'][i]}</figcaption></figure>)}</div>
      <p className="small-note">Ilustrações de exemplo. Fotos reais só com aprovação de todas.</p></article>
  </section>;
}
