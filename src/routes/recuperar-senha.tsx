import {createFileRoute} from '@tanstack/react-router';
import {RecoverPassword} from '@/components/friends/entry';
export const Route=createFileRoute('/recuperar-senha')({head:()=>({meta:[{title:'Recuperar acesso — Nommi'},{name:'description',content:'Recuperação de senha demonstrativa do Nommi.'},{property:'og:title',content:'Recuperar acesso — Nommi'},{property:'og:description',content:'Recuperação de senha demonstrativa do Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <RecoverPassword />}
