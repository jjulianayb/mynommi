import {createFileRoute,redirect} from '@tanstack/react-router';
import {Login} from '@/components/friends/entry';
export const Route=createFileRoute('/login-parceiro')({beforeLoad:()=>{throw redirect({to:'/conta',search:{anfitriao:true},replace:true});},head:()=>({meta:[{title:'Entrada de Anfitriões — Nommi'},{name:'description',content:'Acesso simulado à área dos Anfitriões Nommi.'},{property:'og:title',content:'Entrada de Anfitriões — Nommi'},{property:'og:description',content:'Acesso simulado à área dos Anfitriões Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Login partner/>}
