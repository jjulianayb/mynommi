import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
type DemoSession={email:string;partner:boolean};
type SessionContext={session:DemoSession|null;ready:boolean;signIn:(email:string,partner?:boolean)=>void;signOut:()=>void;erase:()=>void};
const Context=createContext<SessionContext|null>(null);
export function DemoSessionProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<DemoSession|null>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem('nomi-demo-session');if(raw){const data=JSON.parse(raw);if(typeof data.email==='string'&&typeof data.partner==='boolean')setSession(data)}}catch{}setReady(true)},[]);
 function signIn(email:string,partner=false){const next={email,partner};setSession(next);try{localStorage.setItem('nomi-demo-session',JSON.stringify(next))}catch{}}
 function signOut(){setSession(null);try{localStorage.removeItem('nomi-demo-session')}catch{}}
 function erase(){signOut();try{localStorage.removeItem('friends-visual-v1')}catch{}}
 return <Context.Provider value={{session,ready,signIn,signOut,erase}}>{children}</Context.Provider>
}
export function useDemoSession(){const ctx=useContext(Context);if(!ctx)throw new Error('DemoSessionProvider required');return ctx}
