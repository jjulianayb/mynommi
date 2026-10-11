import { createFileRoute } from '@tanstack/react-router';
import { GroupDetail } from '@/components/friends/app';
export const Route = createFileRoute('/grupos_/$id')({
 
 head: () => ({ meta: [{title:'Encontros da teia — Nommi'},{name:'description',content:'Combine desafios, acompanhe os pontos e converse com sua teia.'},{property:'og:title',content:'Encontros da teia — Nommi'},{property:'og:description',content:'Combine desafios, acompanhe os pontos e converse com sua teia.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <GroupDetail id={Number(Route.useParams().id)}/>}
