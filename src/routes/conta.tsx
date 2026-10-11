import { createFileRoute } from '@tanstack/react-router';
import { Account } from '@/components/friends/account';
export const Route = createFileRoute('/conta')({
 head: () => ({ meta: [{title:'Entrar ou criar conta — Nommi'},{name:'description',content:'Crie sua conta Nommi de pessoa ou de empresa com e-mail, Google ou Apple.'},{property:'og:title',content:'Entrar ou criar conta — Nommi'},{property:'og:description',content:'Crie sua conta Nommi de pessoa ou de empresa com e-mail, Google ou Apple.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Account,
});
