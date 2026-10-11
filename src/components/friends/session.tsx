import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useFriends } from './store';
import { demoState, emptyState } from '@/lib/friends-data';
import { signupDetails } from '@/lib/nommi-access';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
type DemoSession={email:string;partner:boolean};
export type CloudUser={id:string;email:string;isBusiness:boolean;profileComplete:boolean};
type SessionContext={session:DemoSession|null;ready:boolean;demoMode:boolean;cloudUser:CloudUser|null;isAdmin:boolean;signIn:(email:string,partner?:boolean)=>void;signOut:()=>void;erase:()=>void;startDemo:()=>void;startPartnerDemo:()=>void};
const Context=createContext<SessionContext|null>(null);
export function DemoSessionProvider({children}:{children:ReactNode}){
 const {notify,setState}=useFriends();const navigate=useNavigate();const queryClient=useQueryClient();
 const [session,setSession]=useState<DemoSession|null>(null);const [ready,setReady]=useState(false);const [demoMode,setDemoMode]=useState(false);
 const [cloudUser,setCloudUser]=useState<CloudUser|null>(null);const [isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{
  let alive=true;let version=0;
  async function load(u:User|null){
   const request=++version;
   if(!u){if(!alive)return;setCloudUser(null);setIsAdmin(false);try{const raw=localStorage.getItem('nomi-demo-session');const d=raw?JSON.parse(raw):null;if(localStorage.getItem('nommi-demo-mode')&&d?.email==='demo@nommi.app'){setDemoMode(true);setSession({email:d.email,partner:false});}else{setDemoMode(false);setSession(null);}}catch{setSession(null);}setReady(true);return;}
   const {data:role}=await supabase.rpc('has_role',{_user_id:u.id,_role:'admin'});
   const {data:profile}=await supabase.from('profiles').select('nickname,city,interests,about,profile_mode,is_business').eq('id',u.id).maybeSingle();
   if(!alive||request!==version)return;
   let p=profile;
   const meta=u.user_metadata;
   // Complete profile fields collected at signup using existing owner-editable columns only.
   if(meta.nommi_profile_pending===true){
    const r=signupDetails({nickname:typeof meta.nickname==='string'?meta.nickname:'',city:typeof meta.city==='string'?meta.city:'',birthday:typeof meta.birthday==='string'?meta.birthday:'',interests:Array.isArray(meta.interests)?meta.interests:[]});
    if(r.data){const {data:saved}=await supabase.from('profiles').update({nickname:r.data.nickname,city:r.data.city,interests:r.data.interests}).eq('id',u.id).select('nickname,city,interests,about,profile_mode,is_business').maybeSingle();if(saved)p=saved;}
   }
   try{if(localStorage.getItem('nommi-business-intent')){const {error}=await supabase.from('profiles').update({is_business:true}).eq('id',u.id);if(!error&&p)p={...p,is_business:true};localStorage.removeItem('nommi-business-intent');}}catch{}
   if(!alive||request!==version)return;
   const next={email:u.email??'',partner:p?.is_business===true};
   const birthday=typeof meta.birthday==='string'?meta.birthday:'';
   const complete=!!p&&!!signupDetails({nickname:p.nickname,city:p.city,birthday,interests:p.interests}).data;
   setCloudUser({id:u.id,email:u.email??'',isBusiness:next.partner,profileComplete:complete});setIsAdmin(role===true);setDemoMode(false);setSession(next);
   try{localStorage.removeItem('nommi-demo-mode');localStorage.removeItem('nomi-demo-session');}catch{}
   setState(s=>s.accountId===u.id?{...s,nickname:p?.nickname??'',city:p?.city??'',interests:p?.interests??[],birthday,about:p?.about??'',profileMode:p?.profile_mode==='privado'?'privado':'publico'}:{...emptyState,accountId:u.id,invites:[],nickname:p?.nickname??'',city:p?.city??'',interests:p?.interests??[],birthday,about:p?.about??'',profileMode:p?.profile_mode==='privado'?'privado':'publico',adult:complete});
   setReady(true);
  }
  const {data:sub}=supabase.auth.onAuthStateChange((event,s)=>{if(['SIGNED_IN','SIGNED_OUT','USER_UPDATED','INITIAL_SESSION'].includes(event))setTimeout(()=>{void load(s?.user??null)},0);});
  return()=>{alive=false;sub.subscription.unsubscribe();};
 },[setState]);
 function signIn(email:string,partner=false){const next={email,partner};setSession(next);try{localStorage.setItem('nomi-demo-session',JSON.stringify(next));}catch{notify('Não foi possível salvar neste aparelho.');}}
 function startDemo(){if(cloudUser)return;try{localStorage.setItem('nommi-demo-mode','1');}catch{}setDemoMode(true);setState(demoState);signIn('demo@nommi.app');}
 function startPartnerDemo(){notify('O painel é exclusivo de contas reais de Anfitriões.');}
 async function signOut(){await queryClient.cancelQueries();queryClient.clear();if(cloudUser)await supabase.auth.signOut();setCloudUser(null);setIsAdmin(false);setSession(null);setDemoMode(false);setState(emptyState);try{localStorage.removeItem('nomi-demo-session');localStorage.removeItem('nommi-demo-mode');localStorage.removeItem('friends-visual-v1');localStorage.removeItem('nommi-radar');}catch{}void navigate({to:'/conta',replace:true});}
 function erase(){void signOut();}
 return <Context.Provider value={{session,ready,demoMode,cloudUser,isAdmin,signIn,signOut,erase,startDemo,startPartnerDemo}}>{children}</Context.Provider>;
}
export function useDemoSession(){const ctx=useContext(Context);if(!ctx)throw new Error('DemoSessionProvider required');return ctx;}
