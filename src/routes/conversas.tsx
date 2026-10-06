import { createFileRoute } from '@tanstack/react-router';
import { Conversations } from '@/components/friends/app';
export const Route = createFileRoute('/conversas')({
 validateSearch: (search: Record<string, unknown>): {p?:number} => Number.isFinite(Number(search['p'])) && search['p'] !== undefined ? {p:Number(search['p'])} : {},
 head: () => ({ meta: [{title:'Conversas — Nomi'},{name:'description',content:'Continue suas amizades com conversas de texto e figurinhas após o match.'},{property:'og:title',content:'Conversas — Nomi'},{property:'og:description',content:'Continue suas amizades com conversas de texto e figurinhas após o match.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Conversations personId={Route.useSearch().p}/>}
