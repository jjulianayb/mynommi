import { createFileRoute } from '@tanstack/react-router';
import { Admin } from '@/components/friends/admin';
export const Route = createFileRoute('/admin')({
 head: () => ({ meta: [{title:'Administração — Nommi'},{name:'description',content:'Gerencie empresas, ideias de encontros e créditos do Nommi.'},{property:'og:title',content:'Administração — Nommi'},{property:'og:description',content:'Gerencie empresas, ideias de encontros e créditos do Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}] }),
 component: Admin,
});
