import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/termos')({head:()=>({meta:[{title:'Termos de Uso — Nommi'},{name:'description',content:'Combinados de convivência e termos demonstrativos do Nommi.'},{property:'og:title',content:'Termos de Uso — Nommi'},{property:'og:description',content:'Combinados de convivência e termos demonstrativos do Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="terms"/>}
