import { describe,it,expect } from 'vitest'
import { hsl,similarColors } from './similarColors'
import { colorByCode } from '@/core/project'
describe('HSL replacement suggestions',()=>{
 it('handles hue and neutral colors without NaN',()=>{expect(hsl('#ff0000')).toEqual([0,1,.5]);expect(hsl('#ffffff')).toEqual([0,0,1]);expect(hsl('#000000')).toEqual([0,0,0])})
 it('returns stable palette choices excluding the source',()=>{const colors=similarColors('H7');expect(colors).toHaveLength(8);expect(new Set(colors.map(c=>c.code)).size).toBe(8);expect(colors.every(c=>c.code!=='H7'&&colorByCode(c.code))).toBe(true);expect(similarColors('H7')).toEqual(colors);expect(similarColors('invalid')).toEqual([])})
})
