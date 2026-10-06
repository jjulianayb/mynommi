import { createFileRoute } from '@tanstack/react-router';
import { Profile } from '@/components/friends/more';
export const Route = createFileRoute('/perfil')({
 validateSearch: (search: Record<string, unknown>) => ({ p: search.p && Number.isFinite(Number(search.p)) ? Number(search.p) : undefined }),
 head: () => ({ meta: [{title:'Perfil e mural — Nomi'},{name:'description',content:'Um perfil feito de amizades: mural de figurinhas, grupos, lugares e troféus.'},{property:'og:title',content:'Perfil e mural — Nomi'},{property:'og:description',content:'Um perfil feito de amizades: mural de figurinhas, grupos, lugares e troféus.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Profile personId={Route.useSearch().p}/>}
