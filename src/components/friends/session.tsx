import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { useFriends } from './store';
import { demoState } from '@/lib/friends-data';
type DemoSession={email:string;partner:boolean};
type SessionContext={session:DemoSession|null;ready:boolean;demoMode:boolean;signIn:(email:string,partner?:boolean)=>void;signOut:()=>void;erase:()=>void;startDemo:()=>void};
const Context=createContext<SessionContext|null>(null);
const SAVE_ERROR='Não foi possível salvar suas alterações neste aparelho.';
export function DemoSessionProvider({children}:{children:ReactNode}){
 const {notify,setState}=useFriends();
 const [session,setSession]=useState<DemoSession|null>(null);const [ready,setReady]=useState(false);const [demoMode,setDemoMode]=useState(false);
 useEffect(()=>{try{setDemoMode(localStorage.getItem('nommi-demo-mode')!==null);const raw=localStorage.getItem('nomi-demo-session');if(raw){const data=JSON.parse(raw);if(typeof data.email==='string'&&typeof data.partner==='boolean')setSession(data)}}catch{}setReady(true)},[]);
 function signIn(email:string,partner=false){const next={email,partner};setSession(next);try{localStorage.setItem('nomi-demo-session',JSON.stringify(next))}catch{notify(SAVE_ERROR)}}
 function startDemo(){try{localStorage.setItem('nommi-demo-mode','1')}catch{notify(SAVE_ERROR)}setDemoMode(true);setState(demoState);signIn('demo@nommi.app')}
 function signOut(){setSession(null);try{localStorage.removeItem('nomi-demo-session')}catch{}}
 function erase(){signOut();try{localStorage.removeItem('friends-visual-v1');localStorage.removeItem('nommi-demo-mode')}catch{}setDemoMode(false)}
 return <Context.Provider value={{session,ready,demoMode,signIn,signOut,erase,startDemo}}>{children}</Context.Provider>
}
export function useDemoSession(){const ctx=useContext(Context);if(!ctx)throw new Error('DemoSessionProvider required');return ctx}
