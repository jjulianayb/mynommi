import {createFileRoute} from '@tanstack/react-router';
import {CreateChallenge} from '@/components/friends/settings';
export const Route=createFileRoute('/lancar-desafio')({head:()=>({meta:[{title:'Lançar desafio — Nomi'},{name:'description',content:'Prepare um novo desafio para sua turma no Nomi.'},{property:'og:title',content:'Lançar desafio — Nomi'},{property:'og:description',content:'Prepare um novo desafio para sua turma no Nomi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <CreateChallenge />}
