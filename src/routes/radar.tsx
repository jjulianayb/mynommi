import {createFileRoute} from '@tanstack/react-router';
import {RadarSection} from '@/components/friends/radar-section';
export const Route=createFileRoute('/radar')({head:()=>({meta:[{title:'Radar Nommi — quem topa um café por perto'},{name:'description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:title',content:'Radar Nommi — quem topa um café por perto'},{property:'og:description',content:'Ative seu bonequinho Nommi em lugares públicos e veja quem também topa um café agora.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:RadarPage});


function RadarPage(){return <RadarSection/>;}
