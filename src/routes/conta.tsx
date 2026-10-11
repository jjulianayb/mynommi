import { createFileRoute } from '@tanstack/react-router';
import { Account } from '@/components/friends/account';
export const Route = createFileRoute('/conta')({
 validateSearch: (s:Record<string,unknown>):{modo?:'entrar'|'criar';anfitriao?:boolean}=>({modo:s.modo==='criar'?'criar':'entrar',anfitriao:s.anfitriao===true||s.anfitriao==='true'}),
 head: () => ({ meta: [{title:'Entrar ou criar conta — Nommi'},{name:'description',content:'Crie sua conta Nommi de pessoa ou de empresa com e-mail, Google ou Apple.'},{property:'og:title',content:'Entrar ou criar conta — Nommi'},{property:'og:description',content:'Crie sua conta Nommi de pessoa ou de empresa com e-mail, Google ou Apple.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});

function Page(){const s=Route.useSearch();return <Account key={String(s.modo)+String(s.anfitriao)} initialMode={s.modo} initialBusiness={s.anfitriao}/>;}
