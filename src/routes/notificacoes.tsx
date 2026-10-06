import {createFileRoute} from '@tanstack/react-router';
import {Notifications} from '@/components/friends/settings';
export const Route=createFileRoute('/notificacoes')({head:()=>({meta:[{title:'Notificações — Nommi'},{name:'description',content:'Acompanhe novidades dos seus encontros e conversas no Nommi.'},{property:'og:title',content:'Notificações — Nommi'},{property:'og:description',content:'Acompanhe novidades dos seus encontros e conversas no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <Notifications />}
