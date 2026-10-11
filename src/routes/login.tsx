import {createFileRoute,redirect} from '@tanstack/react-router';
import {Login} from '@/components/friends/entry';
export const Route=createFileRoute('/login')({beforeLoad:()=>{throw redirect({to:'/conta',search:{modo:'entrar'},replace:true});},head:()=>({meta:[{title:'Entrar no Nommi — Nommi'},{name:'description',content:'Acesse suas amizades nesta demonstração Nommi.'},{property:'og:title',content:'Entrar no Nommi — Nommi'},{property:'og:description',content:'Acesse suas amizades nesta demonstração Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Login />}
