import {describe,it,expect} from 'vitest';
import {ageOn,emailSchema,passwordSchema,passwordStrength} from '../lib/nomi-validation';
describe('Nomi entry validation',()=>{
 it('blocks under 18 until exact birthday',()=>{const today=new Date('2026-10-06T12:00:00');expect(ageOn('2008-10-07',today)).toBe(17);expect(ageOn('2008-10-06',today)).toBe(18)});
 it('rejects future and malformed dates',()=>{expect(ageOn('2027-01-01',new Date('2026-10-06T12:00:00'))).toBe(-1);expect(ageOn('invalid')).toBe(-1)});
 it('checks email and password inputs',()=>{expect(emailSchema.safeParse('not-email').success).toBe(false);expect(emailSchema.safeParse('beth@example.com').success).toBe(true);expect(passwordSchema.safeParse('123').success).toBe(false);expect(passwordSchema.safeParse('SomenteDemo123').success).toBe(true)});
 it('scores passwords consistently',()=>{expect(passwordStrength('')).toBe(0);expect(passwordStrength('Ficticia123!')).toBe(4)});
});
