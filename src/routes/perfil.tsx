import { createFileRoute } from '@tanstack/react-router';
import { Profile } from '@/components/friends/more';
export const Route = createFileRoute('/perfil')({
 validateSearch: (search: Record<string, unknown>): {p?:number} => Number.isFinite(Number(search['p'])) && search['p'] !== undefined ? {p:Number(search['p'])} : {},
 head: () => ({ meta: [{title:'Meu nommi e mural — Nommi'},{name:'description',content:'Um perfil feito de amizades: figurinhas e frases aprovadas dos amigos, conexões e teias participantes.'},{property:'og:title',content:'Meu nommi e mural — Nommi'},{property:'og:description',content:'Um perfil feito de amizades: figurinhas e frases aprovadas dos amigos, conexões e teias participantes.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Profile personId={Route.useSearch().p}/>}
