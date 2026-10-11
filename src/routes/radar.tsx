import {createFileRoute,Link} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Avatar,Icon} from '@/components/friends/art';
import {EmptyState} from '@/components/friends/surfaces';
import {useFriends} from '@/components/friends/store';
import {useDemoSession} from '@/components/friends/session';
import {supabase} from '@/integrations/supabase/client';
import {km,distanceLabel} from '@/lib/radar';
import {SAMPLE_BOOSTED_PEOPLE} from '@/lib/credits';
import {ACTIVITIES,PLACES,PLACE_TYPES,nearestPlace,nearbyNommis,searchPlaces,type Activity,type Place,type PlaceType} from '@/lib/radar';

export const Route=createFileRoute('/radar')({head:()=>({meta:[{title:'Radar Nommi — quem topa um café por perto'},{name:'description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:title',content:'Radar Nommi — quem topa um café por perto'},{property:'og:description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Radar});

type Saved={on:boolean;place:string;activity:Activity;mins:number;until:number};
function Radar(){
  const {state,notify}=useFriends();const {cloudUser}=useDemoSession();
  const [on,setOn]=useState(false);const [place,setPlace]=useState<Place>(PLACES[0]!);const [custom,setCustom]=useState('');
  const [query,setQuery]=useState('');const [type,setType]=useState<PlaceType|''>('');const [activity,setActivity]=useState<Activity>('Tomar um café');
  const [mins,setMins]=useState(60);const [filter,setFilter]=useState<Activity|''>('');const [pick,setPick]=useState<number|null>(null);const [sent,setSent]=useState<number[]>([]);const [locating,setLocating]=useState(false);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem('nommi-radar')||'{}') as Partial<Saved>;const p=PLACES.find(x=>x.name===v.place);if(v.on&&p&&(v.until??0)>Date.now()){setOn(true);setPlace(p);if(v.activity)setActivity(v.activity);if(v.mins)setMins(v.mins)}}catch{}},[]);
  function save(next:Partial<Saved>){try{localStorage.setItem('nommi-radar',JSON.stringify({on,place:place.name,activity,mins,until:Date.now()+mins*60000,...next}))}catch{}}
  function locate(){if(!('geolocation' in navigator)){notify('Seu aparelho não permite localização. Escolha o lugar na lista.');return}setLocating(true);navigator.geolocation.getCurrentPosition(pos=>{const p=nearestPlace(pos.coords.latitude,pos.coords.longitude);setPlace(p);setCustom('');setQuery('');setLocating(false);notify('Lugar mais próximo: '+p.name+'. Sua localização exata não é guardada.')},()=>{setLocating(false);notify('Não conseguimos sua localização. Escolha o lugar na lista.')},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})}
  const results=searchPlaces(query,type);
  const nearby=nearbyNommis(place,{matches:state.matches,blocked:state.blocked,activity:filter});
  const sel=nearby.find(n=>n.id===pick);
  const label=custom||place.name;
  return <main className="screen radar-page">
    <header className="radar-head"><h1>Radar Nommi</h1><p>Diga onde você está e o que topa agora. Veja outros Nommis por perto para um café, uma volta ou um cinema.</p></header>
    {!on?<section className="card radar-setup">
      <Button type="button" variant="secondary" className="wide" onClick={locate} disabled={locating}><Icon name="pin"/>{locating?'Procurando…':'Usar minha localização'}</Button>
      <label>Ou procure o lugar<input className="input" value={query} placeholder="Ex.: Savassi, cinema, parque" onChange={e=>setQuery(e.target.value)}/></label>
      <div className="chips">{(['',...PLACE_TYPES] as const).map(t=><button key={t||'todos'} type="button" className={'chip'+(t===type?' active':'')} aria-pressed={t===type} onClick={()=>setType(t)}>{t||'Todos'}</button>)}</div>
      <div className="radar-places" role="listbox" aria-label="Lugares públicos">{results.slice(0,8).map(p=><button key={p.name} type="button" role="option" aria-selected={p.name===place.name&&!custom} className={'radar-place'+(p.name===place.name&&!custom?' active':'')} onClick={()=>{setPlace(p);setCustom('')}}><b>{p.name}</b><small>{p.type} · {p.area}</small></button>)}{!results.length&&<p className="muted small">Nenhum lugar com esse nome na lista.</p>}</div>
      {query.trim().length>2&&!results.length&&<Button type="button" variant="outline" onClick={()=>{setCustom(query.trim().slice(0,60));notify('Lugar anotado. Mostramos quem está mais perto do centro da cidade.')}}>Estou em "{query.trim().slice(0,60)}"</Button>}
      <p className="radar-here"><Icon name="pin"/>Você está em: <b>{label}</b></p>
      <div><b>Topo agora</b><div className="chips">{ACTIVITIES.map(m=><button key={m} type="button" className={'chip'+(m===activity?' active':'')} aria-pressed={m===activity} onClick={()=>setActivity(m)}>{m}</button>)}</div></div>
      <div><b>Por quanto tempo</b><div className="chips">{[30,60,120].map(m=><button key={m} type="button" className={'chip'+(m===mins?' active':'')} aria-pressed={m===mins} onClick={()=>setMins(m)}>{m<60?m+' min':m/60+'h'}</button>)}</div></div>
      <Button type="button" className="wide" onClick={async()=>{if(cloudUser){const {error}=await supabase.from('radar_presence').upsert({user_id:cloudUser.id,place_name:label.slice(0,60),area:place.area,activity,until:new Date(Date.now()+mins*60000).toISOString()});if(error){notify('Não foi possível entrar no radar agora. Tente de novo.');return}}setOn(true);save({on:true})}}>Ativar meu bonequinho</Button>
      {state.profileMode==='privado'&&<p className="muted small">Seu perfil é privado: no radar, só quem já tem match com você te vê.</p>}<p className="muted small">Só lugares públicos. Nunca mostramos nem guardamos sua localização exata. Você some do radar quando o tempo acaba.</p>
    </section>:<>
      <section className="radar-map" aria-label={'Nommis perto de '+label}>
        <span className="radar-ring r1"/><span className="radar-ring r2"/><span className="radar-ring r3"/>
        <div className="radar-me"><Avatar id={3} size={56}/><small>Você</small></div>
        {nearby.slice(0,6).map((n,i)=>{const ang=i*1.05+0.4,r=n.km<0.3?22:n.km<0.8?32:42;return <button key={n.id} type="button" className={'radar-pin'+(SAMPLE_BOOSTED_PEOPLE.includes(n.id)?' boosted':'')} style={{left:50+Math.cos(ang)*r+'%',top:50+Math.sin(ang)*r+'%'}} onClick={()=>setPick(n.id)} aria-label={n.person.name+' — '+n.activity+', '+n.label}><Avatar id={n.id} size={44}/><small>{n.person.name.split(' ')[0]}</small></button>})}
      </section>
      <div className="card radar-status"><Icon name="pin"/><div><b>{label}</b><p className="muted small">{activity} · visível por {mins<60?mins+' min':mins/60+'h'} · {nearby.length} Nommis por perto</p></div><Button type="button" variant="ghost" onClick={()=>{setOn(false);setPick(null);save({on:false});if(cloudUser)void supabase.from('radar_presence').delete().eq('user_id',cloudUser.id)}}>Sair do radar</Button></div>
      {sel&&<section className="card radar-card">
        <div className="radar-card-top"><Avatar id={sel.id} size={64}/><div><h2>{sel.person.name}, {sel.person.age}</h2><p className="mode-chip">{sel.activity}</p><p className="muted small">{sel.place} · {sel.label}</p><p className="muted small">Curte {sel.person.interests.join(' e ')}</p></div></div>
        {sent.includes(sel.id)?<p className="radar-ok">Convite enviado. Se {sel.person.name.split(' ')[0]} topar, vocês combinam pelo chat.</p>:
        <div className="radar-actions"><Button type="button" onClick={()=>{setSent([...sent,sel.id]);notify('Convite enviado para '+sel.person.name.split(' ')[0]+'.')}}>Topo também</Button><Button asChild variant="secondary"><Link to="/perfil" search={{p:sel.id}}>Ver perfil</Link></Button></div>}
        <p className="muted small">Primeiro encontro? Prefira um lugar público e avise alguém de confiança.</p>
      </section>}
      {cloudUser&&<RealNearby here={place} me={cloudUser.id}/>}<div className="section-heading"><h2>{cloudUser?'Exemplos por perto':'Perto de você'}</h2></div>
      <div className="chips">{(['',...ACTIVITIES] as const).map(m=><button key={m||'todos'} type="button" className={'chip'+(m===filter?' active':'')} aria-pressed={m===filter} onClick={()=>setFilter(m)}>{m||'Tudo'}</button>)}</div>
      {nearby.length?<div className="activity-list">{nearby.map(n=><button type="button" className="activity radar-row" key={n.id} onClick={()=>{setPick(n.id);window.scrollTo({top:0,behavior:'smooth'})}}><Avatar id={n.id} size={44}/><div><h3>{n.person.name.split(' ')[0]} · topa {n.activity.toLowerCase()}</h3><p>{n.place} · {n.label}</p></div><Icon name="arrow"/></button>)}</div>:<EmptyState title="Ninguém por perto com essa vontade agora." text="Tente outra opção ou entre numa teia aberta."><Button asChild><Link to="/grupos" hash="teias-abertas">Ver teias abertas</Link></Button></EmptyState>}
    </>}
  </main>
}

type Real={user_id:string;place_name:string;area:string;activity:string;nickname:string;interests:string[];km:number};
/** Nommis reais no radar agora (só perfis públicos; a regra é conferida no servidor). */
function RealNearby({here,me}:{here:Place;me:string}){
  const {notify}=useFriends();const [list,setList]=useState<Real[]|null>(null);const [sent,setSent]=useState<string[]>([]);
  useEffect(()=>{let alive=true;(async()=>{
    const {data:pres}=await supabase.from('radar_presence').select('user_id,place_name,area,activity,until').gt('until',new Date().toISOString()).neq('user_id',me).limit(100);
    const ids=(pres??[]).map(p=>p.user_id);if(!ids.length){if(alive)setList([]);return}
    const {data:profs}=await supabase.from('profiles').select('id,nickname,interests').in('id',ids);
    const out=(pres??[]).flatMap(p=>{const pr=profs?.find(x=>x.id===p.user_id);if(!pr)return[];const pl=PLACES.find(x=>x.name===p.place_name)??PLACES.find(x=>x.area===p.area);const d=p.place_name===here.name?0:pl?km(here,pl):5;return d>3?[]:[{...p,nickname:pr.nickname||'Nommi',interests:pr.interests??[],km:d}]}).sort((a,b)=>a.km-b.km);
    if(alive)setList(out)})();return()=>{alive=false}},[here,me]);
  return <><div className="section-heading"><h2>Nommis de verdade por perto</h2></div>
    {list===null?<p className="small-note">Procurando…</p>:list.length?<div className="activity-list">{list.map(r=><article className="activity" key={r.user_id}><span className="tone-icon teal"><Icon name="users"/></span><div><h3>{r.nickname} · topa {r.activity.toLowerCase()}</h3><p>{r.place_name} · {distanceLabel(r.km)}{r.interests.length?' · curte '+r.interests.slice(0,2).join(' e '):''}</p></div>{sent.includes(r.user_id)?<span className="boost-badge"><Icon name="check"/>Registrado</span>:<Button onClick={()=>{setSent([...sent,r.user_id]);notify('Interesse registrado. Quando o chat entre contas reais chegar, vocês poderão combinar por lá.')}}>Topo também</Button>}</article>)}</div>:<p className="small-note">Ainda ninguém com conta real por aqui agora. Você aparece para quem chegar depois.</p>}</>;
}
