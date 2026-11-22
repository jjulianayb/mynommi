import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/components/friends/app';
export const Route = createFileRoute('/')({
 
 head: () => ({ meta: [{title:'Nommi — App de amizade para fazer amigos de verdade'},{name:'description',content:'Nommi é o app de amizade para fazer amigos de verdade: pessoas com os seus interesses, tribos e encontros em lugares reais. Grátis, começando por São Paulo.'},{property:'og:title',content:'Nommi — App de amizade para fazer amigos de verdade'},{property:'og:description',content:'Nommi é o app de amizade para fazer amigos de verdade: pessoas com os seus interesses, tribos e encontros em lugares reais. Grátis, começando por São Paulo.'},{property:'og:type',content:'website'},{property:'og:url',content:'https://nommibr.com.br/'},{name:'twitter:card',content:'summary_large_image'}], links: [{rel:'canonical', href:'https://nommibr.com.br/'}] }),
 component: Page,
});
function Page() {return <Home />}
