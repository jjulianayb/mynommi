import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/components/friends/app';
export const Route = createFileRoute('/')({
 
 head: () => ({ meta: [{title:'Início — Nommi'},{name:'description',content:'Amizades para conversar, combinar e continuar. Conheça pessoas e acompanhe suas teias.'},{property:'og:title',content:'Início — Nommi'},{property:'og:description',content:'Amizades para conversar, combinar e continuar. Conheça pessoas e acompanhe suas teias.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Home />}
