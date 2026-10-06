import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/privacidade')({head:()=>({meta:[{title:'Política de Privacidade — Nomi'},{name:'description',content:'Conheça o uso dos dados locais nesta demonstração Nomi.'},{property:'og:title',content:'Política de Privacidade — Nomi'},{property:'og:description',content:'Conheça o uso dos dados locais nesta demonstração Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="privacy"/>}
