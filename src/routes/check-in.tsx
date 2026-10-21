import {createFileRoute} from '@tanstack/react-router';
import {SocialPost,CheckIn} from '@/components/friends/social-actions';
export const Route=createFileRoute('/check-in')({head:()=>({meta:[{title:'Fazer check-in — Nommi'},{name:'description',content:'Registre a participação da tribo nos desafios Nommi.'},{property:'og:title',content:'Fazer check-in — Nommi'},{property:'og:description',content:'Registre a participação da tribo nos desafios Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <CheckIn/>}
