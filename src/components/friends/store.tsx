import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { initialState, demoInvites, type DemoState, type Invite } from '@/lib/friends-data';
import { Button } from '@/components/ui/button';
import { Icon } from './art';
const Context=createContext<{state:DemoState;setState:Dispatch<SetStateAction<DemoState>>;notify:(text:string)=>void}|null>(null);
export function FriendsProvider({children}:{children:ReactNode}){
 const [state,setState]=useState<DemoState>(initialState);const [ready,setReady]=useState(false);const [toast,setToast]=useState('');
 useEffect(()=>{try{const saved=localStorage.getItem('friends-visual-v1');if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed.challenges)&&Array.isArray(parsed.matches)){const saved:Array<Invite>=Array.isArray(parsed.invites)?parsed.invites:[];setState({...initialState,...parsed,invites:parsed.accountId?saved:[...saved,...demoInvites.filter(d=>!saved.some(x=>x.id===d.id))]})}}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('friends-visual-v1',JSON.stringify(state))}catch{setToast('Não foi possível salvar suas alterações neste aparelho.')}},[state,ready]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(t)},[toast]);
 return <Context.Provider value={{state,setState,notify:setToast}}>{children}{toast&&<div className="friend-toast" role="status"><Icon name="check"/><span>{toast}</span><Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={()=>setToast('')}><Icon name="close"/></Button></div>}</Context.Provider>
}
export function useFriends(){const v=useContext(Context);if(!v)throw new Error('FriendsProvider is required');return v}
