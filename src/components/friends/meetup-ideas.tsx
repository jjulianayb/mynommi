import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoSession } from './session';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { suggestMeetupIdeas, type MeetupIdea } from '@/lib/meetup-ideas.functions';
import { Icon } from './art';
import { useFriends } from './store';

const INTERESTS = ['café', 'karaokê', 'leitura', 'corrida', 'trilhas', 'culinária', 'séries', 'música', 'jogos de tabuleiro', 'bem-estar', 'cinema', 'idiomas'];
export type PartnerProfile = { name: string; kind: string; area: string; hours: string; capacity: string; offer: string; interests: string[]; note: string };
export const defaultPartnerProfile: PartnerProfile = { name: 'Karaokê Bem-Te-Vi', kind: 'Karaokê e petiscos', area: 'Centro', hours: 'Terça a quinta, 19h às 22h', capacity: 'Até 30 pessoas', offer: '6 rodadas de chope ou sucos para a teia', interests: ['karaokê', 'música'], note: '' };

/** Painel do Anfitrião: perfil do estabelecimento, comunidade da marca e ideias de encontros com IA. */
export function PartnerIdeas() {
  const { state, setState, notify } = useFriends();
  const saved = state.partnerProfile ?? defaultPartnerProfile;
  const [f, setF] = useState<PartnerProfile>(saved);
  const [ideas, setIdeas] = useState<MeetupIdea[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const run = useServerFn(suggestMeetupIdeas);
  const { cloudUser } = useDemoSession();
  const [bizId, setBizId] = useState<string | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<{ id: string; title: string; status: string }[]>([]);
  async function loadSaved(id: string) { const { data } = await supabase.from('meetup_ideas').select('id,title,status').eq('business_id', id).order('created_at', { ascending: false }); setSavedIdeas(data ?? []); }
  useEffect(() => { if (!cloudUser) return; let alive = true; (async () => {
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', cloudUser.id).order('created_at').limit(1).maybeSingle();
    if (!alive || !data) return; setBizId(data.id);
    setF({ name: data.name, kind: data.kind, area: data.area, hours: data.hours, capacity: data.capacity, offer: data.offer, interests: data.interests, note: data.note });
    void loadSaved(data.id);
  })(); return () => { alive = false; }; }, [cloudUser]);
  async function saveBusiness(): Promise<string | null> {
    if (!cloudUser) return null;
    const row = { owner_id: cloudUser.id, name: f.name.trim(), kind: f.kind, area: f.area, hours: f.hours, capacity: f.capacity, offer: f.offer, interests: f.interests, note: f.note };
    const r = bizId ? await supabase.from('businesses').update(row).eq('id', bizId).select('id').single() : await supabase.from('businesses').insert(row).select('id').single();
    if (r.error) { notify('Não foi possível salvar o perfil da empresa.'); return null; }
    setBizId(r.data.id); return r.data.id;
  }
  async function saveIdea(i: MeetupIdea) {
    const id = bizId ?? await saveBusiness(); if (!id || !cloudUser) return;
    const { error } = await supabase.from('meetup_ideas').insert({ business_id: id, owner_id: cloudUser.id, title: i.title.slice(0, 120), description: i.description.slice(0, 600), when_text: i.when.slice(0, 120), teia_size: i.teiaSize.slice(0, 60), bonus: i.bonus.slice(0, 300), welcoming: i.welcoming.slice(0, 300), points: i.points, status: 'publicada' });
    if (error) { notify('Não foi possível salvar a ideia.'); return; }
    notify('Ideia salva e publicada para as teias.'); void loadSaved(id);
  }
  const set = (k: keyof PartnerProfile) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));
  async function generate() {
    if (!f.interests.length) { setError('Escolha pelo menos um interesse da comunidade.'); return; }
    if (f.name.trim().length < 2) { setError('Informe o nome do estabelecimento.'); return; }
    setState(s => ({ ...s, partnerProfile: f })); if (cloudUser) void saveBusiness(); setLoading(true); setError('');
    try { const r = await run({ data: { ...f, note: f.note || undefined } }); setIdeas(r.ideas); if (r.error) setError(r.error); }
    catch { setError('As ideias estão indisponíveis no momento. Tente mais tarde.'); }
    finally { setLoading(false); }
  }
  function applyIdea(i: MeetupIdea) {
    setState(s => ({ ...s, challenges: [...s.challenges, { id: Math.max(0, ...s.challenges.map(c => c.id)) + 1, group: 0, name: i.title.slice(0, 60), points: i.points, partner: 0, status: 'open' }] }));
    notify('Encontro criado como desafio para as teias.');
  }
  return <section className="partner-ideas">
    <div className="section-heading"><h2>Perfil e comunidade</h2></div>
    <p className="small-note">Conte como é o seu lugar e do que sua comunidade gosta. A IA sugere encontros acolhedores para atrair teias.</p>
    <div className="partner-form">
      <label>Nome do estabelecimento<input className="input" maxLength={60} value={f.name} onChange={set('name')} /></label>
      <label>Tipo de lugar<input className="input" maxLength={80} value={f.kind} onChange={set('kind')} placeholder="Ex.: café, livraria, academia" /></label>
      <label>Bairro aproximado<input className="input" maxLength={80} value={f.area} onChange={set('area')} /></label>
      <label>Horários bons para teias<input className="input" maxLength={80} value={f.hours} onChange={set('hours')} /></label>
      <label>Capacidade aproximada<input className="input" maxLength={80} value={f.capacity} onChange={set('capacity')} /></label>
      <label>O que oferece para teias<input className="input" maxLength={200} value={f.offer} onChange={set('offer')} /></label>
    </div>
    <b className="partner-label">Interesses da comunidade da marca</b>
    <div className="chips">{INTERESTS.map(t => { const on = f.interests.includes(t); return <Button key={t} type="button" variant="outline" className={'chip ' + (on ? 'selected' : '')} aria-pressed={on} onClick={() => setF(v => ({ ...v, interests: on ? v.interests.filter(x => x !== t) : [...v.interests, t].slice(0, 10) }))}>{t}</Button>; })}</div>
    <label className="partner-label">Algo mais? (opcional)<textarea className="input" rows={2} maxLength={200} value={f.note} onChange={set('note')} placeholder="Ex.: temos um palco pequeno e mesas grandes" /></label>
    <Button className="wide" onClick={generate} disabled={loading}><Icon name="spark" />{loading ? 'Pensando em encontros…' : ideas.length ? 'Gerar outras' : 'Gerar ideias de encontros'}</Button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {ideas.length > 0 && <div className="activity-list idea-list">{ideas.map((i, k) => <article className="idea-card" key={k}>
      <h3>{i.title}</h3><p>{i.description}</p>
      <p className="small-note"><Icon name="clock" />{i.when} · {i.teiaSize}</p>
      <p className="small-note"><Icon name="gift" />{i.bonus} · +{i.points} pontos da teia</p>
      <p className="idea-welcome"><Icon name="heart" />{i.welcoming}</p>
      <div className="company-actions">{cloudUser && <Button onClick={() => saveIdea(i)}><Icon name="check" />Salvar e publicar</Button>}<Button variant="secondary" onClick={() => applyIdea(i)}><Icon name="spark" />Usar como desafio</Button></div>
    </article>)}</div>}
    {cloudUser && savedIdeas.length > 0 && <><div className="section-heading"><h2>Ideias salvas</h2></div><div className="activity-list">{savedIdeas.map(s => <div className="activity" key={s.id}><span className="tone-icon teal"><Icon name="check" /></span><div><h3>{s.title}</h3><p>{s.status}</p></div></div>)}</div></>}
    <p className="small-note">{cloudUser ? 'O perfil da empresa e as ideias salvas ficam guardados na sua conta.' : 'Na demonstração, o perfil fica só neste aparelho.'} Ideias criadas por IA: revise antes de divulgar.</p>
  </section>;
}
