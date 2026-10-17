import { createFileRoute } from '@tanstack/react-router';
import { GroupDetail } from '@/components/friends/app';
export const Route = createFileRoute('/grupos_/$id')({
 
 head: () => ({ meta: [{title:'Sua comunidade — Nommi'},{name:'description',content:'Conheça os participantes, acompanhe encontros e converse com sua teia no Nommi.'},{property:'og:title',content:'Sua comunidade — Nommi'},{property:'og:description',content:'Conheça os participantes, acompanhe encontros e converse com sua teia no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <GroupDetail id={Number(Route.useParams().id)}/>}
