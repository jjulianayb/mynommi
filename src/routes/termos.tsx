import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/termos')({head:()=>({meta:[{title:'Termos de Uso — Nomi'},{name:'description',content:'Combinados de convivência e termos demonstrativos do Nomi.'},{property:'og:title',content:'Termos de Uso — Nomi'},{property:'og:description',content:'Combinados de convivência e termos demonstrativos do Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="terms"/>}
