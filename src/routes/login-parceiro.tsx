import {createFileRoute} from '@tanstack/react-router';
import {Login} from '@/components/friends/entry';
export const Route=createFileRoute('/login-parceiro')({head:()=>({meta:[{title:'Entrada de parceiros — Nomi'},{name:'description',content:'Acesso simulado à área dos parceiros Nomi.'},{property:'og:title',content:'Entrada de parceiros — Nomi'},{property:'og:description',content:'Acesso simulado à área dos parceiros Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Login partner/>}
