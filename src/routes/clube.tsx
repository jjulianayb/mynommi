import { Link, createFileRoute } from '@tanstack/react-router';
import { Club } from '@/components/friends/more';
export const Route = createFileRoute('/clube')({
 
 head: () => ({ meta: [{title:'Clube de benefícios — Nomi'},{name:'description',content:'Encontre benefícios em bares, beleza e lazer para aproveitar com seus amigos.'},{property:'og:title',content:'Clube de benefícios — Nomi'},{property:'og:description',content:'Encontre benefícios em bares, beleza e lazer para aproveitar com seus amigos.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <><div className="group-view-tabs"><Link to="/grupos">Meus grupos</Link><Link to="/clube" className="selected">Clube</Link></div><Club /></>}
