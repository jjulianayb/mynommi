import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Brand } from './surfaces';
import { useDemoSession } from './session';
import { Account } from './account';
import { presentationDemo } from '@/lib/nommi-access';
import rioPhoto from '@/assets/welcome-rio.jpg';

export function Welcome(){
 const {startDemo}=useDemoSession();const [splash,setSplash]=useState(true);const [demo,setDemo]=useState(false);
 useEffect(()=>{setDemo(presentationDemo(window.location.search));const t=setTimeout(()=>setSplash(false),950);return()=>clearTimeout(t);},[]);
 if(splash)return <div className="nomi-splash brand-splash" role="status" aria-label="Abrindo Nommi"><Brand/><p>Chega mais. Cabe você na roda.</p></div>;
 return <div className="welcome-rio">
  <img className="welcome-rio-photo" src={rioPhoto} alt="" width={768} height={1536}/>
  <div className="welcome-rio-overlay" aria-hidden="true"/>
  <div className="welcome-rio-content">
   <div className="welcome-rio-brand"><Brand/></div>
   <p className="welcome-rio-manifesto">Novas pessoas.<br/>Novas histórias.<br/>Novas teias.</p>
   <div className="welcome-rio-buttons">
    <Link className="welcome-rio-primary" to="/conta" search={{modo:'criar'}}>Criar conta</Link>
    <Link className="welcome-rio-secondary" to="/conta" search={{modo:'entrar'}}>Entrar</Link>
    <div className="welcome-rio-links"><Link to="/conta" search={{anfitriao:true}}>Sou anfitrião</Link>{demo&&<button type="button" onClick={startDemo}>Abrir apresentação</button>}</div>
   </div>
   <p className="welcome-rio-note">Para quem tem 18 anos ou mais.</p>
  </div>
 </div>;
}
export function Registration(){return <Account initialMode="criar"/>;}
export function Login({partner=false}:{partner?:boolean}){return <Account initialBusiness={partner}/>;}
export function RecoverPassword(){return <Account/>;}
