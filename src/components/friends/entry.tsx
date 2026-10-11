import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Avatar, Icon, Sticker } from './art';
import { Brand } from './surfaces';
import { useDemoSession } from './session';
import { Account } from './account';
import { presentationDemo } from '@/lib/nommi-access';

export function Welcome(){
 const {startDemo}=useDemoSession();const [slide,setSlide]=useState(0);const [splash,setSplash]=useState(true);const [demo,setDemo]=useState(false);
 useEffect(()=>{setDemo(presentationDemo(window.location.search));const t=setTimeout(()=>setSplash(false),950);return()=>clearTimeout(t);},[]);
 const titles=['Encontre sua teia.','Um café já é um começo.','Tem lugar pra sua teia.'];
 const copy=['Tem quem topa sair. Tem quem prefere só conversar. Você chega do seu jeito.','A conversa pode começar pelo assunto mais simples: “bora?”','Os Anfitriões recebem a teia, preparam o lugar e capricham nas boas surpresas.'];
 if(splash)return <div className="nomi-splash brand-splash" role="status" aria-label="Abrindo Nommi"><Brand/><p>Chega mais. Cabe você na roda.</p></div>;
 return <div className="entry-layout welcome"><header><Brand/></header><div className="welcome-content" key={slide}><div className={'welcome-art slide-'+slide}>{slide===0?<div className="welcome-pair"><Avatar id={7} size={144}/><span className="welcome-heart"><Icon name="teia"/></span><Avatar id={3} size={144}/></div>:slide===1?<div className="welcome-group"><Avatar id={4} size={108}/><Avatar id={7} size={144}/><Avatar id={3} size={108}/></div>:<div className="welcome-prize"><Icon name="star"/><Sticker id={5} size={130}/></div>}<Sticker id={[0,3,5][slide]??0} size={80}/></div><span className="welcome-kicker">{['Teias','Rolês','Anfitriões'][slide]}</span><h1>{titles[slide]}</h1><p>{copy[slide]}</p></div><div className="slide-controls"><Button variant="ghost" size="icon" aria-label="Slide anterior" disabled={slide===0} onClick={()=>setSlide(s=>s-1)}><Icon name="back"/></Button><div className="slide-dots">{titles.map((t,i)=><Button variant="ghost" key={t} className={i===slide?'active':''} aria-label={'Slide '+(i+1)} aria-pressed={i===slide} onClick={()=>setSlide(i)}/>)}</div><Button variant="ghost" size="icon" aria-label="Próximo slide" disabled={slide===2} onClick={()=>setSlide(s=>s+1)}><Icon name="arrow"/></Button></div><div className="welcome-buttons"><Button asChild className="wide"><Link to="/conta" search={{modo:'criar'}}>Criar conta<Icon name="arrow"/></Link></Button><Button asChild variant="secondary" className="wide"><Link to="/conta" search={{modo:'entrar'}}>Já tenho conta</Link></Button><Button asChild variant="ghost" className="wide"><Link to="/conta" search={{anfitriao:true}}>Sou anfitrião</Link></Button>{demo&&<Button type="button" variant="ghost" className="wide" onClick={startDemo}>Abrir apresentação</Button>}</div><p className="entry-disclaimer">Para quem tem 18 anos ou mais.</p></div>;
}
export function Registration(){return <Account initialMode="criar"/>;}
export function Login({partner=false}:{partner?:boolean}){return <Account initialBusiness={partner}/>;}
export function RecoverPassword(){return <Account/>;}
