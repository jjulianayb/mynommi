import { createFileRoute } from '@tanstack/react-router';
import { Partner } from '@/components/friends/more';
export const Route = createFileRoute('/parceiro')({
 
 head: () => ({ meta: [{title:'Painel do parceiro — Nommi'},{name:'description',content:'Confirme visitas de teias e gerencie campanhas de benefícios na demonstração Nommi.'},{property:'og:title',content:'Painel do parceiro — Nommi'},{property:'og:description',content:'Confirme visitas de teias e gerencie campanhas de benefícios na demonstração Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Partner />}
