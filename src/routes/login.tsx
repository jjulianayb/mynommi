import {createFileRoute} from '@tanstack/react-router';
import {Login} from '@/components/friends/entry';
export const Route=createFileRoute('/login')({head:()=>({meta:[{title:'Entrar no Nomi — Nomi'},{name:'description',content:'Acesse suas amizades nesta demonstração Nomi.'},{property:'og:title',content:'Entrar no Nomi — Nomi'},{property:'og:description',content:'Acesse suas amizades nesta demonstração Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Login />}
