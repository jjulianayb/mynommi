import {describe,it,expect} from 'vitest';
import {chatStickers,isStickerId,recentStickerIds} from '@/lib/sticker-catalogue';
describe('Nomi sticker catalogue',()=>{
 it('contains 24 unique ready-to-render originals',()=>{expect(chatStickers).toHaveLength(24);expect(new Set(chatStickers.map(s=>s.caption)).size).toBe(24);expect(chatStickers.every(s=>s.src.length>0)).toBe(true)});
 it('validates sticker IDs',()=>{expect(isStickerId(23)).toBe(true);for(const id of [-1,24,1.5,'0',null])expect(isStickerId(id)).toBe(false)});
 it('keeps most recently sent first without duplicates or invalid IDs',()=>{expect(recentStickerIds([2,5,7,99],5)).toEqual([5,2,7]);expect(recentStickerIds([2],99)).toEqual([2])});
});
