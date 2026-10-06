import { createFileRoute } from '@tanstack/react-router';
import { Partner } from '@/components/friends/more';
export const Route = createFileRoute('/parceiro')({
 
 head: () => ({ meta: [{title:'Painel do parceiro — Friends'},{name:'description',content:'Confirme visitas de grupos e gerencie campanhas de benefícios na demonstração Friends.'},{property:'og:title',content:'Painel do parceiro — Friends'},{property:'og:description',content:'Confirme visitas de grupos e gerencie campanhas de benefícios na demonstração Friends.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Partner />}
