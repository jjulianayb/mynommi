import type { ReactNode } from 'react';
import type { Audience } from '@/lib/friends-data';
import { Icon } from './art';
import { useFriends } from './store';

type Area = 'fotos' | 'roles' | 'teia';
const labels: Record<Area, [string, string]> = { fotos: ['Fotos e momentos', 'A grade de momentos do seu perfil.'], roles: ['Rolês', 'Suas saídas com as suas amizades.'], teia: ['Teia de amizades', 'As teias e pessoas com quem você se conecta.'] };
const audiences: [Audience, string][] = [['todos', 'Todo mundo no Nommi'], ['amizades', 'Só minhas amizades'], ['so-eu', 'Só eu']];
export const defaultVisibility = { fotos: 'amizades', roles: 'amizades', teia: 'todos' } as Record<Area, Audience>;

/** Demo-only: other people's settings are simulated (non-matches keep photos and Rolês for friends only). */
function otherAudience(area: Area, personId: number): Audience { return area === 'teia' ? 'todos' : personId % 2 ? 'amizades' : 'todos' }

export function Gate({ area, own, personId, children }: { area: Area; own: boolean; personId: number; children: ReactNode }) {
  const { state } = useFriends(); const vis = state.visibility ?? defaultVisibility;
  if (own) return <><p className="privacy-badge"><Icon name="lock" />{labels[area][0]}: {audiences.find(a => a[0] === vis[area])?.[1]}</p>{children}</>;
  const a = otherAudience(area, personId); const friend = state.matches.includes(personId);
  if (a === 'todos' || (a === 'amizades' && friend)) return <>{children}</>;
  return <div className="privacy-locked"><Icon name="lock" /><p><b>{labels[area][0]} visíveis só para amizades.</b><br /><span className="small-note">Quando vocês tiverem match, isso aparece aqui.</span></p></div>;
}

export function PrivacyControls() {
  const { state, setState, notify } = useFriends(); const vis = state.visibility ?? defaultVisibility;
  return <div className="privacy-controls"><h2 className="settings-subtitle">Quem pode ver no seu perfil</h2>{(Object.keys(labels) as Area[]).map(k => <div className="privacy-row" key={k}><div><h2>{labels[k][0]}</h2><p className="small-note">{labels[k][1]}</p></div><select className="input" aria-label={'Quem vê ' + labels[k][0]} value={vis[k]} onChange={e => { const v = e.target.value as Audience; setState(s => ({ ...s, visibility: { ...(s.visibility ?? defaultVisibility), [k]: v } })); notify(labels[k][0] + ': ' + audiences.find(a => a[0] === v)?.[1] + '.') }}>{audiences.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>)}</div>;
}
