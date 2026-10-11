import { Link, createFileRoute } from '@tanstack/react-router';
import { Groups } from '@/components/friends/app';
export const Route = createFileRoute('/grupos')({
 
 head: () => ({ meta: [{title:'Suas teias — Nommi'},{name:'description',content:'Reúna amizades, combine encontros e participe de desafios com a teia.'},{property:'og:title',content:'Suas teias — Nommi'},{property:'og:description',content:'Reúna amizades, combine encontros e participe de desafios com a teia.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <><div className="group-view-tabs"><Link to="/grupos" className="selected">Minhas teias</Link><Link to="/clube">Clube</Link></div><Groups /></>}
