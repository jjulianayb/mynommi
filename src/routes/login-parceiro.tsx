import {createFileRoute} from '@tanstack/react-router';
import {Login} from '@/components/friends/entry';
export const Route=createFileRoute('/login-parceiro')({head:()=>({meta:[{title:'Entrada de parceiros — Nommi'},{name:'description',content:'Acesso simulado à área dos parceiros Nommi.'},{property:'og:title',content:'Entrada de parceiros — Nommi'},{property:'og:description',content:'Acesso simulado à área dos parceiros Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Login partner/>}
