import {createFileRoute} from '@tanstack/react-router';
import {InviteFriend} from '@/components/friends/settings';
export const Route=createFileRoute('/convidar')({head:()=>({meta:[{title:'Convidar uma amizade — Nommi'},{name:'description',content:'Convide uma amizade para novas histórias no Nommi.'},{property:'og:title',content:'Convidar uma amizade — Nommi'},{property:'og:description',content:'Convide uma amizade para novas histórias no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <InviteFriend />}
