import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { chatStickers, isStickerId, recentStickerIds } from '@/lib/sticker-catalogue';
import { Icon } from './art';
import { useFriends } from './store';

export function ChatSticker({id}:{id:number}) {
 const sticker=chatStickers[id];
 if(!sticker)return null;
 return <img className="chat-sticker-image" src={sticker.src} width={512} height={512} alt={sticker.caption} draggable={false}/>;
}
export function ChatStickerTray({onSend,onClose}:{onSend:(id:number)=>void;onClose:()=>void}) {
 const {state,setState}=useFriends();
 const [tab,setTab]=useState<'Recentes'|'Favoritas'|'Pacotes'>('Pacotes');
 const tray=useRef<HTMLElement>(null);
 const favorites=(state.favoriteStickers??[]).filter(isStickerId);
 const recent=(state.recentStickers??[]).filter(isStickerId);
 const ids=tab==='Recentes'?recent:tab==='Favoritas'?favorites:chatStickers.map(s=>s.id);
 useEffect(()=>{tray.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})},[]);
 function toggleFavorite(id:number){setState(s=>({...s,favoriteStickers:(s.favoriteStickers??[]).includes(id)?(s.favoriteStickers??[]).filter(v=>v!==id):[...(s.favoriteStickers??[]),id]}))}
 return <section className="chat-sticker-tray" aria-label="Bandeja de figurinhas" ref={tray} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
  <div className="sticker-tray-heading"><span>Figurinhas</span><Button variant="ghost" size="icon" type="button" aria-label="Fechar figurinhas" onClick={onClose}><Icon name="close"/></Button></div>
  <div className="sticker-tray-tabs" role="tablist" aria-label="Coleções de figurinhas">{(['Recentes','Favoritas','Pacotes'] as const).map(name=><Button type="button" variant="ghost" role="tab" aria-selected={tab===name} aria-controls="sticker-tray-panel" id={'sticker-tab-'+name} key={name} onClick={()=>setTab(name)}><Icon name={name==='Recentes'?'clock':name==='Favoritas'?'heart':'stickers'}/>{name}</Button>)}</div>
  <div id="sticker-tray-panel" role="tabpanel" aria-labelledby={'sticker-tab-'+tab} className="sticker-tray-panel">
   {tab==='Pacotes'&&<div className="sticker-pack-heading"><span className="sticker-pack-mark"><Icon name="stickers"/></span><div><strong>Turma Nommi</strong><small>24 figurinhas · pacote original</small></div><Icon name="check"/></div>}
   {!ids.length?<div className="sticker-tray-empty"><ChatSticker id={tab==='Recentes'?7:20}/><p>{tab==='Recentes'?'Suas próximas figurinhas ficam aqui.':'Ainda não há favoritas.'}</p></div>:<div className="chat-sticker-grid">{ids.map(id=>{const s=chatStickers[id];if(!s)return null;return <div className="chat-sticker-tile" key={id}><Button variant="ghost" type="button" className="chat-sticker-send" aria-label={'Enviar figurinha '+s.caption} onClick={()=>{setState(prev=>({...prev,recentStickers:recentStickerIds(prev.recentStickers??[],id)}));onSend(id)}}><ChatSticker id={id}/></Button><Button variant="ghost" type="button" size="icon" className="sticker-favorite" aria-label={(favorites.includes(id)?'Remover dos favoritos: ':'Favoritar: ')+s.caption} aria-pressed={favorites.includes(id)} title={favorites.includes(id)?'Remover dos favoritos':'Favoritar figurinha'} onClick={()=>toggleFavorite(id)}><Icon name="heart"/></Button></div>})}</div>}
  </div>
 </section>;
}
