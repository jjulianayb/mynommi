import { createFileRoute } from '@tanstack/react-router';
import { Discover } from '@/components/friends/app';
export const Route = createFileRoute('/descobrir')({
 
 head: () => ({ meta: [{title:'Descobrir novas amizades — Nommi'},{name:'description',content:'Conheça adultos com interesses em comum e encontre novas amizades por afinidade.'},{property:'og:title',content:'Descobrir novas amizades — Nommi'},{property:'og:description',content:'Conheça adultos com interesses em comum e encontre novas amizades por afinidade.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Discover />}
