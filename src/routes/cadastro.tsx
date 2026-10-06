import { createFileRoute } from '@tanstack/react-router';
import { Signup } from '@/components/friends/more';
export const Route = createFileRoute('/cadastro')({
 
 head: () => ({ meta: [{title:'Criar meu perfil — Friends'},{name:'description',content:'Escolha seu apelido, interesses e privacidade para conhecer novas amizades.'},{property:'og:title',content:'Criar meu perfil — Friends'},{property:'og:description',content:'Escolha seu apelido, interesses e privacidade para conhecer novas amizades.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Signup />}
