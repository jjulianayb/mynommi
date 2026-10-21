import { Link, createFileRoute } from '@tanstack/react-router';
import { Groups } from '@/components/friends/app';
export const Route = createFileRoute('/grupos')({
 
 head: () => ({ meta: [{title:'Suas tribos — Nommi'},{name:'description',content:'Reúna amizades, combine encontros e participe de desafios com a tribo.'},{property:'og:title',content:'Suas tribos — Nommi'},{property:'og:description',content:'Reúna amizades, combine encontros e participe de desafios com a tribo.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Groups />}
