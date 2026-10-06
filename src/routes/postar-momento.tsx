import {createFileRoute} from '@tanstack/react-router';
import {SocialPost,CheckIn} from '@/components/friends/social-actions';
export const Route=createFileRoute('/postar-momento')({head:()=>({meta:[{title:'Postar um momento — Nommi'},{name:'description',content:'Guarde os bons momentos com sua turma no Nommi.'},{property:'og:title',content:'Postar um momento — Nommi'},{property:'og:description',content:'Guarde os bons momentos com sua turma no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <SocialPost kind="moment"/>}
