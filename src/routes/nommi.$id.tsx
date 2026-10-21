import { createFileRoute } from '@tanstack/react-router';
import { PublicNommi } from '@/components/friends/real-people';
export const Route = createFileRoute('/nommi/$id')({
 head: () => ({ meta: [{title:'Perfil de um nommi — Nommi'},{name:'description',content:'Conheça o perfil público de outra pessoa no Nommi: cidade, interesses e tribos.'},{property:'og:title',content:'Perfil de um nommi — Nommi'},{property:'og:description',content:'Conheça o perfil público de outra pessoa no Nommi: cidade, interesses e tribos.'},{property:'og:type',content:'profile'},{name:'twitter:card',content:'summary'}] }),
 component: Page,
});
function Page() {return <PublicNommi id={Route.useParams().id}/>}
