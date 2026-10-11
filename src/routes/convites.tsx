import {createFileRoute} from '@tanstack/react-router';
import {Invites} from '@/components/friends/invites';
export const Route=createFileRoute('/convites')({head:()=>({meta:[{title:'Convites para atividades — Nommi'},{name:'description',content:'Convites para academia, vinho, celebrações e mais: veja quem vai e junte-se a pessoas com os mesmos planos.'},{property:'og:title',content:'Convites para atividades — Nommi'},{property:'og:description',content:'Convites para academia, vinho, celebrações e mais: veja quem vai e junte-se a pessoas com os mesmos planos.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Invites/>}
