import { Link, createFileRoute } from '@tanstack/react-router';
import { Groups } from '@/components/friends/app';
export const Route = createFileRoute('/grupos')({
 
 head: () => ({ meta: [{title:'Seus grupos — Nommi'},{name:'description',content:'Reúna amigos, combine encontros e participe de desafios em grupo.'},{property:'og:title',content:'Seus grupos — Nommi'},{property:'og:description',content:'Reúna amigos, combine encontros e participe de desafios em grupo.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <><div className="group-view-tabs"><Link to="/grupos" className="selected">Meus grupos</Link><Link to="/clube">Clube</Link></div><Groups /></>}
