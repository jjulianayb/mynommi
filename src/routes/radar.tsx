import {createFileRoute,Link} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {Avatar,Icon} from '@/components/friends/art';
import {people,visibleInListings} from '@/lib/friends-data';
import {useFriends} from '@/components/friends/store';

export const Route=createFileRoute('/radar')({head:()=>({meta:[{title:'Radar Nommi — quem topa um café por perto'},{name:'description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:title',content:'Radar Nommi — quem topa um café por perto'},{property:'og:description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Radar});

const places=['Shopping Pátio Savassi','Parque Municipal','Café do Mercado Central','Livraria Quixote'];
const moods=['Topa um café','Bater papo','Dar uma volta','Só dizer oi'];
const nearbyAll=[{id:7,x:22,y:30,mood:'Topa um café'},{id:4,x:70,y:24,mood:'Dar uma volta'},{id:6,x:78,y:66,mood:'Topa um café'},{id:1,x:28,y:72,mood:'Bater papo'}];

function Radar(){
  const {state}=useFriends();const nearby=nearbyAll.filter(n=>{const p=people.find(x=>x.id===n.id);return !!p&&visibleInListings(p,state.matches)});
  const [on,setOn]=useState(false);const [place,setPlace]=useState(places[0]!);const [mood,setMood]=useState(moods[0]!);
  const [mins,setMins]=useState(60);const [pick,setPick]=useState<number|null>(null);const [sent,setSent]=useState<number[]>([]);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem('nommi-radar')||'{}');if(v.on){setOn(true);setPlace(v.place);setMood(v.mood);setMins(v.mins)}}catch{}},[]);
  useEffect(()=>{localStorage.setItem('nommi-radar',JSON.stringify({on,place,mood,mins}))},[on,place,mood,mins]);
  const sel=nearby.find(n=>n.id===pick);const person=sel&&people.find(p=>p.id===sel.id);
  return <main className="screen radar-page">
    <header className="radar-head"><h1>Radar Nommi</h1><p>Ative seu bonequinho num lugar público e veja quem também está disponível para um café ou uma conversa.</p></header>
    {!on?<section className="card radar-setup">
      <label>Onde você está<select value={place} onChange={e=>setPlace(e.target.value)}>{places.map(p=><option key={p}>{p}</option>)}</select></label>
      <div><b>Estou a fim de</b><div className="chips">{moods.map(m=><button key={m} type="button" className={'chip'+(m===mood?' active':'')} aria-pressed={m===mood} onClick={()=>setMood(m)}>{m}</button>)}</div></div>
      <div><b>Por quanto tempo</b><div className="chips">{[30,60,120].map(m=><button key={m} type="button" className={'chip'+(m===mins?' active':'')} aria-pressed={m===mins} onClick={()=>setMins(m)}>{m<60?m+' min':m/60+'h'}</button>)}</div></div>
      <button type="button" className="button primary" onClick={()=>setOn(true)}>Ativar meu bonequinho</button>
      {state.profileMode==='privado'&&<p className="muted small">Seu perfil é privado: no radar, só quem já tem match com você te vê.</p>}<p className="muted small">Mostramos só o lugar, nunca sua localização exata. Você some do radar quando o tempo acaba.</p>
    </section>:<>
      <section className="radar-map" aria-label={'Pessoas Nommi em '+place}>
        <span className="radar-ring r1"/><span className="radar-ring r2"/><span className="radar-ring r3"/>
        <div className="radar-me"><Avatar id={3} size={56}/><small>Você</small></div>
        {nearby.map(n=>{const p=people.find(x=>x.id===n.id);return <button key={n.id} type="button" className="radar-pin" style={{left:n.x+'%',top:n.y+'%'}} onClick={()=>setPick(n.id)} aria-label={p?.name+' — '+n.mood}><Avatar id={n.id} size={44}/><small>{p?.name.split(' ')[0]}</small></button>})}
      </section>
      <div className="card radar-status"><Icon name="pin"/><div><b>{place}</b><p className="muted small">{mood} · visível por {mins<60?mins+' min':mins/60+'h'} · {nearby.length} Nommis por aqui</p></div><button type="button" className="button ghost" onClick={()=>{setOn(false);setPick(null)}}>Sair do radar</button></div>
      {sel&&person&&<section className="card radar-card">
        <div className="radar-card-top"><Avatar id={person.id} size={64}/><div><h2>{person.name}, {person.age}</h2><p className="mode-chip">{sel.mood}</p><p className="muted small">Curte {person.interests.join(' e ')}</p></div></div>
        {sent.includes(person.id)?<p className="radar-ok">Convite enviado. Se {person.name.split(' ')[0]} aceitar, vocês combinam pelo chat.</p>:
        <div className="radar-actions"><button type="button" className="button primary" onClick={()=>setSent([...sent,person.id])}>Convidar para um café</button><Link to="/perfil" search={{p:person.id} as never} className="button ghost">Ver perfil</Link></div>}
        <p className="muted small">Encontros do Radar acontecem só em lugares públicos. Avise alguém de confiança e use Denunciar ou Bloquear se algo incomodar.</p>
      </section>}
    </>}
  </main>
}
