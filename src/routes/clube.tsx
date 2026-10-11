import { Link, createFileRoute } from '@tanstack/react-router';
import { Club } from '@/components/friends/more';
export const Route = createFileRoute('/clube')({
 
 head: () => ({ meta: [{title:'Clube de benefícios — Nommi'},{name:'description',content:'Encontre benefícios em bares, beleza e lazer para aproveitar com suas teias.'},{property:'og:title',content:'Clube de benefícios — Nommi'},{property:'og:description',content:'Encontre benefícios em bares, beleza e lazer para aproveitar com suas teias.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Club />}
