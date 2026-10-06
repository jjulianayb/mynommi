import {createFileRoute} from '@tanstack/react-router';
import {SocialPost,CheckIn} from '@/components/friends/social-actions';
export const Route=createFileRoute('/escrever-amiga')({head:()=>({meta:[{title:'Escrever sobre uma amiga — Nommi'},{name:'description',content:'Celebre sua amizade com um carinho na demonstração Nommi.'},{property:'og:title',content:'Escrever sobre uma amiga — Nommi'},{property:'og:description',content:'Celebre sua amizade com um carinho na demonstração Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <SocialPost kind="friend"/>}
