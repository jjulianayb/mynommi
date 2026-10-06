import { createFileRoute } from '@tanstack/react-router';
import { Groups } from '@/components/friends/app';
export const Route = createFileRoute('/grupos')({
 
 head: () => ({ meta: [{title:'Seus grupos — Nomi'},{name:'description',content:'Reúna amigos, combine encontros e participe de desafios em grupo.'},{property:'og:title',content:'Seus grupos — Nomi'},{property:'og:description',content:'Reúna amigos, combine encontros e participe de desafios em grupo.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Groups />}
