import { createFileRoute } from '@tanstack/react-router';
import { Wallet } from '@/components/friends/business';
export const Route = createFileRoute('/carteira')({
 head: () => ({ meta: [{title:'Carteira de Pippins — Nommi'},{name:'description',content:'Adicione Pippins com Pix, Apple Pay ou Google Pay e apareça para mais gente com interesses em comum.'},{property:'og:title',content:'Carteira de créditos — Nommi'},{property:'og:description',content:'Adicione Pippins e apareça para mais gente com interesses em comum.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Wallet,
});
