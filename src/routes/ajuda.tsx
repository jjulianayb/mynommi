import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/ajuda')({head:()=>({meta:[{title:'Ajuda e cuidado — Nommi'},{name:'description',content:'Encontre respostas sobre amizades, segurança e desafios no Nommi.'},{property:'og:title',content:'Ajuda e cuidado — Nommi'},{property:'og:description',content:'Encontre respostas sobre amizades, segurança e desafios no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="help"/>}
