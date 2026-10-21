import { createFileRoute } from '@tanstack/react-router';
import { Company } from '@/components/friends/business';
export const Route = createFileRoute('/empresa/$id')({
 head: () => ({ meta: [{title:'Empresa parceira — Nommi'},{name:'description',content:'Benefícios para tribos, tribo da marca e quem agita por aqui.'},{property:'og:title',content:'Empresa parceira — Nommi'},{property:'og:description',content:'Benefícios para tribos, tribo da marca e quem agita por aqui.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() { return <Company id={Number(Route.useParams().id)} />; }
