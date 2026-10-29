import {createFileRoute} from '@tanstack/react-router';
import {RecuperarSenha} from '@/components/friends/senha';
export const Route=createFileRoute('/recuperar-senha')({head:()=>({meta:[{title:'Esqueci minha senha | nommi'},{name:'description',content:'Esqueceu a senha? A gente manda um link para você escolher outra.'},{property:'og:title',content:'Esqueci minha senha | nommi'},{property:'og:description',content:'Esqueceu a senha? A gente manda um link para você escolher outra.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){return <RecuperarSenha />}
