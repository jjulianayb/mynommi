import {createFileRoute} from '@tanstack/react-router';
import {CreateGroup} from '@/components/friends/settings';
export const Route=createFileRoute('/criar-grupo')({head:()=>({meta:[{title:'Criar teia — Nommi'},{name:'description',content:'Reúna uma nova teia com afinidades no Nommi Pro.'},{property:'og:title',content:'Criar teia — Nommi'},{property:'og:description',content:'Reúna uma nova teia com afinidades no Nommi Pro.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <CreateGroup />}
