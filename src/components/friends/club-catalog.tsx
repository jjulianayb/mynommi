import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { partners } from '@/lib/friends-data';
import { teiasFor } from '@/lib/teias';
import { Button } from '@/components/ui/button';
import { useDemoSession } from './session';
import { useFriends } from './store';
import { Icon } from './art';
import { EmptyState } from './surfaces';
type Campaign={id:string;name:string;offer:string;category:string;stars:number;icon:string;tone:string};
export function ClubCatalog(){
 const {demoMode}=useDemoSession();const {state}=useFriends();const [category,setCategory]=useState('Todos');const [selected,setSelected]=useState<Campaign|null>(null);const [real,setReal]=useState<Campaign[]>([]);const [loading,setLoading]=useState(!demoMode);const [error,setError]=useState(false);const [teia,setTeia]=useState('');
 useEffect(()=>{if(demoMode)return;let alive=true;void(async()=>{try{const [b,i]=await Promise.all([supabase.from('businesses').select('id,name,kind,offer').eq('active',true),supabase.from('meetup_ideas').select('id,business_id,title,bonus,points').eq('status','publicada')]);if(!alive)return;if(b.error||i.error){setError(true);return;}setReal((i.data??[]).flatMap(idea=>{const host=b.data?.find(x=>x.id===idea.business_id);return host?[{id:idea.id,name:host.name,offer:idea.bonus||host.offer||idea.title,category:host.kind||'Encontros',stars:idea.points,icon:'gift',tone:'teal'}]:[];}));}catch{if(alive)setError(true);}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[demoMode]);
 const catalog=demoMode?partners.map((p,i)=>({id:String(i),name:p.name,offer:p.benefit,category:p.category,stars:p.points,icon:p.icon,tone:p.tone})):real;
 const mine=teiasFor(state);
 return <><div className="page-title"><div><p className="eyebrow">OS ANFITRIÕES CAPRICHARAM</p><h1>Clube Nommi</h1></div><span className="tone-icon yellow"><Icon name="star"/></span></div><p className="intro">Uma mesa, uma rodada, uma boa surpresa pra teia.</p><p className="small-note">Estrelas se ganham saindo e participando — nunca comprando. Use só nas recompensas do Clube.</p><section aria-label="Meu saldo privado de estrelas"><h2>Suas estrelas</h2><p className="small-note">Saldo privado · em breve, junto com os resgates.</p></section><div className="chips">{['Todos',...new Set(catalog.map(c=>c.category))].map(c=><Button variant="outline" className={'chip '+(category===c?'selected':'')} key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</Button>)}</div>
 {loading?<p className="small-note">Buscando as campanhas…</p>:error?<p role="alert" className="form-error">Não foi possível carregar o Clube agora. Tente novamente mais tarde.</p>:catalog.length?<div className="partner-grid">{catalog.filter(c=>category==='Todos'||category===c.category).map(c=><Button variant="ghost" className={'partner-card '+(selected?.id===c.id?'selected':'')} key={c.id} onClick={()=>setSelected(c)}><span className={'tone-icon '+c.tone}><Icon name={c.icon}/></span><span className="partner-category">{c.category}</span><h3>{c.name}</h3><p>{c.offer}</p><span className="reward-chip"><Icon name="star"/>{c.stars} estrelas<Icon name="arrow"/></span></Button>)}</div>:<EmptyState title="A mesa ainda está sendo posta." text="As campanhas dos Anfitriões aparecem aqui quando forem publicadas."/>}
 {selected&&<section className="redemption"><h2>{selected.name}</h2><p>{selected.offer} · {selected.stars} estrelas</p>{mine.length?<label>Sua teia<select className="input" value={mine.some(t=>String(t.id)===teia)?teia:String(mine[0]?.id??'')} onChange={e=>setTeia(e.target.value)}>{mine.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>:<p className="small-note">Você ainda não participa de uma teia.</p>}<p className="small-note">Estrelas e resgates estarão disponíveis numa próxima rodada.</p></section>}
 <div className="section-heading"><h2>Suas teias</h2></div><div className="chips">{mine.map(t=><Button asChild variant="secondary" key={t.id}><Link to="/grupos/$id" params={{id:String(t.id)}}>{t.name}<Icon name="arrow"/></Link></Button>)}</div></>;
}
