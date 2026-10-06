import { createFileRoute } from '@tanstack/react-router';
import { Pro } from '@/components/friends/more';
export const Route = createFileRoute('/pro')({
 
 head: () => ({ meta: [{title:'Friends Pro — Friends'},{name:'description',content:'Compare Grátis e Pro e experimente o plano Pro de forma simulada, sem cobrança.'},{property:'og:title',content:'Friends Pro — Friends'},{property:'og:description',content:'Compare Grátis e Pro e experimente o plano Pro de forma simulada, sem cobrança.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}] }),
 component: Page,
});
function Page() {return <Pro />}
