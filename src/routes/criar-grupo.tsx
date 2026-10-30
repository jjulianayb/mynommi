import {createFileRoute} from '@tanstack/react-router';
import {CreateGroup} from '@/components/friends/settings';
export const Route=createFileRoute('/criar-grupo')({
 // `tipo` e `tribo` chegam quando a pessoa toca em "marcar um rolê desta
 // tribo": o rolê já nasce ligado à tribo de onde veio.
 validateSearch:(s:Record<string,unknown>):{tipo?:'teia'|'role';tribo?:string}=>({
  ...(s['tipo']==='role'?{tipo:'role' as const}:{}),
  ...(typeof s['tribo']==='string'&&/^\d+$/.test(s['tribo'])?{tribo:s['tribo']}:{}),
 }),
 head:()=>({meta:[{title:'Criar tribo — Nommi'},{name:'description',content:'Escolha o nome e o jeito de se encontrar da sua tribo no Nommi.'},{property:'og:title',content:'Criar tribo — Nommi'},{property:'og:description',content:'Escolha o nome e o jeito de se encontrar da sua tribo no Nommi.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){
 const s=Route.useSearch();
 return <CreateGroup initialKind={s.tipo??'teia'} triboId={s.tribo?Number(s.tribo):null}/>;
}
