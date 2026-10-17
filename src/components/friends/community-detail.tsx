import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Icon } from './art';
import { momentPhoto } from '@/lib/friends-photos';
import type { Teia } from '@/lib/teias';
import { people } from '@/lib/friends-data';

function communityPhoto(teia: Teia) {
 const name = teia.name.toLowerCase();
 if (/vinho/.test(name)) return momentPhoto.vinho;
 if (/karaokê|música|sair/.test(name)) return momentPhoto.karaoke;
 if (/corrida/.test(name)) return momentPhoto.corrida;
 if (/café|conversa|séries/.test(name)) return momentPhoto.pizza;
 return momentPhoto.trilha;
}

function DemoPost({teia, text, nickname}: {teia: Teia; text?: string; nickname: string}) {
 const [liked, setLiked] = useState(false);
 const [comment, setComment] = useState('');
 const [comments, setComments] = useState<string[]>([]);
 const author = people.find(p => p.id === teia.ids[0]);
 return <article className="community-post">
  <header><Avatar id={author?.id ?? 3} size={40}/><div><h3>{author?.name ?? teia.host ?? 'nommi'}</h3><span>Post da apresentação</span></div><Icon name="teia"/></header>
  <p>{text ?? 'Uma boa companhia transforma qualquer passeio. Quem vem no próximo encontro?'}</p>
  <div className="community-post-gallery"><img src={communityPhoto(teia)} alt="Encontro ilustrativo da teia"/><img src={momentPhoto.trilha} alt="Paisagem de uma trilha"/><img src={momentPhoto.pizza} alt="Mesa para compartilhar"/></div>
  <div className="community-post-reactions"><Button variant="ghost" aria-label="Curtir publicação" aria-pressed={liked} onClick={()=>setLiked(v=>!v)} className={liked?'is-liked':''}><Icon name="heart"/>{liked?1:0}</Button><span><Icon name="chat"/>{comments.length}</span></div>
  {comments.map((c,i)=><div className="community-comment" key={i}><Avatar id={3} size={28}/><p><b>{nickname || 'Você'}</b><br/>{c}</p></div>)}
  <form className="community-comment-form" onSubmit={e=>{e.preventDefault();if(!comment.trim())return;setComments(v=>[...v,comment.trim()]);setComment('');}}><Avatar id={3} size={28}/><input className="input" aria-label="Comentário na publicação" placeholder="Escreva um comentário…" maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)}/><Button size="icon" aria-label="Enviar comentário" disabled={!comment.trim()}><Icon name="send"/></Button></form>
 </article>;
}

export function CommunityDetail({teia, member, demoMode, nickname, members, onJoin, joining, conversation, events, firstMessage}: {
 teia: Teia; member: boolean; demoMode: boolean; nickname: string;
 members: {user_id: string; nickname: string}[]; onJoin: ()=>void; joining: boolean;
 conversation: ReactNode; events: ReactNode; firstMessage?: string;
}) {
 const [tab,setTab]=useState('Posts');
 const memberCount=demoMode?teia.members:members.length;
 return <div className="community-detail">
  <div className="community-cover"><img src={communityPhoto(teia)} alt="Capa ilustrativa da teia"/><span className="community-cover-caption">{demoMode?'Apresentação':'Imagem ilustrativa'}</span></div>
  <section className="community-summary">
   <span className="community-avatar"><Icon name={teia.icon}/></span>
   <div className="community-title-row"><div><h1>{teia.name}</h1><p>{memberCount} {memberCount===1?'participante':'participantes'}<span>·</span>{teia.mode}</p></div><Button onClick={member?()=>setTab('Posts'):onJoin} disabled={joining}><Icon name={member?'check':'plus'}/>{joining?'Entrando…':member?'Na teia':'Entrar'}</Button></div>
   <p className="community-description">{teia.rule || 'Um assunto em comum, boas conversas e novos encontros. Aqui tem espaço para chegar do seu jeito.'}</p>
   {(teia.place||teia.time)&&<div className="community-location">{teia.place&&<span><Icon name="pin"/>{teia.place}</span>}{teia.time&&<span><Icon name="clock"/>{teia.time}</span>}</div>}
  </section>
  <div role="tablist" aria-label="Conteúdo da teia" className="community-tabs">{['Membros','Posts','Eventos'].map(t=><Button key={t} variant="ghost" role="tab" id={'community-tab-'+t} aria-controls={'community-panel-'+t} aria-selected={tab===t} onClick={()=>setTab(t)}>{t}</Button>)}</div>
  <section role="tabpanel" id={'community-panel-'+tab} aria-labelledby={'community-tab-'+tab} className="community-panel" key={tab}>
   {tab==='Posts'&&<>{demoMode?<DemoPost teia={teia} text={firstMessage} nickname={nickname}/>:<div className="community-quiet"><Icon name="image"/><h2>Ainda não há posts nesta teia.</h2></div>}{conversation}</>}
   {tab==='Membros'&&<><div className="community-section-heading"><h2>Quem faz parte</h2><span>{memberCount} {memberCount===1?'participante':'participantes'}</span></div><div className="community-members">{demoMode?teia.ids.map(id=>{const p=people.find(p=>p.id===id);return <div className="community-member" key={id}><Avatar id={id} size={48}/><div><h3>{p?.name ?? 'nommi'}</h3><p>{p?.city ?? teia.mode}</p></div></div>}):members.map(m=><div className="community-member" key={m.user_id}><span className="community-member-icon"><Icon name="users"/></span><h3>{m.nickname || 'nommi'}</h3></div>)}</div>{!member&&!demoMode&&<p className="small-note">Entre na teia para conhecer os participantes.</p>}</>}
   {tab==='Eventos'&&events}
  </section>
 </div>;
}