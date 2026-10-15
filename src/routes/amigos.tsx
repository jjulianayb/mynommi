import { createFileRoute } from '@tanstack/react-router';
import { MyFriends } from '@/components/friends/real-people';
export const Route = createFileRoute('/amigos')({
 head: () => ({ meta: [{title:'Meus amigos — Nommi'},{name:'description',content:'Veja seus amigos no Nommi e aceite pedidos de conexão.'},{property:'og:title',content:'Meus amigos — Nommi'},{property:'og:description',content:'Veja seus amigos no Nommi e aceite pedidos de conexão.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }),
 component: () => <MyFriends />,
});
