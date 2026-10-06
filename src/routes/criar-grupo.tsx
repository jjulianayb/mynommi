import {createFileRoute} from '@tanstack/react-router';
import {CreateGroup} from '@/components/friends/settings';
export const Route=createFileRoute('/criar-grupo')({head:()=>({meta:[{title:'Criar grupo — Nomi'},{name:'description',content:'Reúna uma nova turma com afinidades no Nomi Pro.'},{property:'og:title',content:'Criar grupo — Nomi'},{property:'og:description',content:'Reúna uma nova turma com afinidades no Nomi Pro.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <CreateGroup />}
