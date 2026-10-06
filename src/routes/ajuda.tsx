import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/ajuda')({head:()=>({meta:[{title:'Ajuda e cuidado — Nomi'},{name:'description',content:'Encontre respostas sobre amizades, segurança e desafios no Nomi.'},{property:'og:title',content:'Ajuda e cuidado — Nomi'},{property:'og:description',content:'Encontre respostas sobre amizades, segurança e desafios no Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="help"/>}
