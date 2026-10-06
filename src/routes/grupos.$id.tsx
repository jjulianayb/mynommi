import { createFileRoute } from '@tanstack/react-router';
import { GroupDetail } from '@/components/friends/app';
export const Route = createFileRoute('/grupos/$id')({
 
 head: () => ({ meta: [{title:'Encontros do grupo — Friends'},{name:'description',content:'Combine desafios, acompanhe os pontos e converse com seu grupo de amigos.'},{property:'og:title',content:'Encontros do grupo — Friends'},{property:'og:description',content:'Combine desafios, acompanhe os pontos e converse com seu grupo de amigos.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <GroupDetail id={Number(Route.useParams().id)}/>}
