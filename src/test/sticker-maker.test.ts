import {describe,it,expect} from 'vitest';
import {addCustomSticker,cleanCaption,MAX_CUSTOM_STICKERS} from '@/lib/sticker-maker';
describe('Figurinhas criadas e salvas',()=>{
 it('salva a mais recente primeiro sem duplicar a mesma imagem',()=>{const a={id:'a',src:'x',caption:'oi'};const b={id:'b',src:'y',caption:'tchau'};expect(addCustomSticker([a,b],{id:'c',src:'x',caption:'oi'}).map(s=>s.id)).toEqual(['c','b'])});
 it('guarda no máximo 30',()=>{const list=Array.from({length:30},(_,i)=>({id:String(i),src:'s'+i,caption:''}));expect(addCustomSticker(list,{id:'n',src:'n',caption:''})).toHaveLength(MAX_CUSTOM_STICKERS)});
 it('limpa a legenda e limita a 24 letras',()=>{expect(cleanCaption('  oi\n turma  ')).toBe('oi turma');expect(cleanCaption('a'.repeat(40))).toHaveLength(24)});
});
