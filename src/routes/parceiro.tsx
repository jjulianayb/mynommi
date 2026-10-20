import { createFileRoute } from '@tanstack/react-router';
import { Partner } from '@/components/friends/more';
export const Route = createFileRoute('/parceiro')({
 
 head: () => ({ meta: [{title:'Painel do Anfitrião — Nommi'},{name:'description',content:'Apresente seu estabelecimento e crie ideias de encontros para a teia da marca.'},{property:'og:title',content:'Painel do Anfitrião — Nommi'},{property:'og:description',content:'Apresente seu estabelecimento e crie ideias de encontros para a teia da marca.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Partner />}
