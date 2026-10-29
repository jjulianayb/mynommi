import {createFileRoute} from '@tanstack/react-router';
import {Legal} from '@/components/friends/settings';
export const Route=createFileRoute('/termos')({head:()=>({meta:[{title:'Termos de Uso — Nommi'},{name:'description',content:'Os combinados da nommi: 18 anos, respeito, e o que acontece quando alguém passa do ponto.'},{property:'og:title',content:'Termos de Uso — Nommi'},{property:'og:description',content:'Os combinados da nommi: 18 anos, respeito, e o que acontece quando alguém passa do ponto.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Legal kind="terms"/>}
