import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/privacidade')({head:()=>({meta:[{title:'Política de Privacidade — Nommi'},{name:'description',content:'Onde seus dados ficam, por quanto tempo e o que você pode exigir da nommi.'},{property:'og:title',content:'Política de Privacidade — Nommi'},{property:'og:description',content:'Onde seus dados ficam, por quanto tempo e o que você pode exigir da nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="privacy"/>}
