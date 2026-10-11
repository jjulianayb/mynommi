import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { useFriends } from './store';
import { demoState, emptyState } from '@/lib/friends-data';
import { supabase } from '@/integrations/supabase/client';
type DemoSession={email:string;partner:boolean};
export type CloudUser={id:string;email:string};
type SessionContext={session:DemoSession|null;ready:boolean;demoMode:boolean;cloudUser:CloudUser|null;isAdmin:boolean;signIn:(email:string,partner?:boolean)=>void;signOut:()=>void;erase:()=>void;startDemo:()=>void;startPartnerDemo:()=>void};
const Context=createContext<SessionContext|null>(null);
const SAVE_ERROR='Não foi possível salvar suas alterações neste aparelho.';
export function DemoSessionProvider({children}:{children:ReactNode}){
 const {notify,setState}=useFriends();
 const [session,setSession]=useState<DemoSession|null>(null);const [ready,setReady]=useState(false);const [demoMode,setDemoMode]=useState(false);
 const [cloudUser,setCloudUser]=useState<CloudUser|null>(null);const [isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{try{setDemoMode(localStorage.getItem('nommi-demo-mode')!==null);const raw=localStorage.getItem('nomi-demo-session');if(raw){const data=JSON.parse(raw);if(typeof data.email==='string'&&typeof data.partner==='boolean')setSession(data)}}catch{}setReady(true)},[]);
 // Conta real (Lovable Cloud): acompanha a sessão e o papel de administração, conferido no servidor.
 useEffect(()=>{
  let alive=true;
  async function load(u:{id:string;email?:string|undefined}|null){
   if(!alive)return;
   if(!u){setCloudUser(null);setIsAdmin(false);return}
   setCloudUser({id:u.id,email:u.email??''});
   const {data}=await supabase.rpc('has_role',{_user_id:u.id,_role:'admin'});if(alive)setIsAdmin(data===true);
   try{if(localStorage.getItem('nommi-business-intent')){localStorage.removeItem('nommi-business-intent');await supabase.from('profiles').update({is_business:true}).eq('id',u.id)}}catch{}
   // Primeira entrada com conta real: abre o app como conta nova (sem dados de exemplo).
   const {data:p}=await supabase.from('profiles').select('nickname,city,interests,about,profile_mode,is_business').eq('id',u.id).maybeSingle();
   if(!alive)return;
   let saved:DemoSession|null=null;try{const raw=localStorage.getItem('nomi-demo-session');saved=raw?JSON.parse(raw):null}catch{}
   if(!saved||saved.email!==u.email){
    try{localStorage.removeItem('nommi-demo-mode')}catch{}setDemoMode(false);
    setState({...emptyState,nickname:p?.nickname??'',city:p?.city||emptyState.city,interests:p?.interests??[],about:p?.about??'',profileMode:p?.profile_mode==='privado'?'privado':'publico',adult:true});
    const next={email:u.email??'',partner:!!p?.is_business};setSession(next);try{localStorage.setItem('nomi-demo-session',JSON.stringify(next))}catch{}
   }
  }
  const {data:sub}=supabase.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'||event==='INITIAL_SESSION')void load(s?.user??null)});
  return()=>{alive=false;sub.subscription.unsubscribe()};
 },[setState]);
 function signIn(email:string,partner=false){const next={email,partner};setSession(next);try{localStorage.setItem('nomi-demo-session',JSON.stringify(next))}catch{notify(SAVE_ERROR)}}
 function startDemo(){try{localStorage.setItem('nommi-demo-mode','1')}catch{notify(SAVE_ERROR)}setDemoMode(true);setState(demoState);signIn('demo@nommi.app')}
 function startPartnerDemo(){try{localStorage.setItem('nommi-demo-mode','1')}catch{notify(SAVE_ERROR)}setDemoMode(true);setState(demoState);signIn('parceiro@nommi.app',true)}
 function signOut(){setSession(null);try{localStorage.removeItem('nomi-demo-session')}catch{}if(cloudUser)void supabase.auth.signOut()}
 function erase(){signOut();try{localStorage.removeItem('friends-visual-v1');localStorage.removeItem('nommi-demo-mode')}catch{}setDemoMode(false)}
 return <Context.Provider value={{session,ready,demoMode,cloudUser,isAdmin,signIn,signOut,erase,startDemo,startPartnerDemo}}>{children}</Context.Provider>
}
export function useDemoSession(){const ctx=useContext(Context);if(!ctx)throw new Error('DemoSessionProvider required');return ctx}
