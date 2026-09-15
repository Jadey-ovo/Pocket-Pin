import {describe,it,expect} from 'vitest'
import {featureQuantize} from './featureQuantization'
import {generateCells} from './colors'
const choices=[{code:'black',rgb:[0,0,0]},{code:'white',rgb:[255,255,255]},{code:'gray',rgb:[180,180,180]},{code:'light',rgb:[200,200,200]}]
describe('feature-preserving generation',()=>{
 it('keeps rare dark eyes instead of spending the palette on common similar shades',()=>{
  const values=Array.from({length:100},(_,i)=>i===44||i===46?[0,0,0]:i%2?[180,180,180]:[200,200,200]);
  const result=featureQuantize(values,10,choices,2,true);
  expect(result[44]).toBe('black');expect(result[46]).toBe('black');expect(new Set(result).size).toBe(2);
  expect(result.filter(c=>c==='black')).toHaveLength(2);
 });
 it('keeps a one-cell contrasting line and transparent gaps',()=>{
  const values=Array.from({length:25},(_,i)=>i===0?null:i%5===2?[0,0,0]:[255,255,255]);
  const result=featureQuantize(values,5,choices,2,true);
  expect(result[0]).toBeNull();for(let y=0;y<5;y++)expect(result[y*5+2]).toBe('black');
  expect(result.filter(c=>c==='black')).toHaveLength(5);
 });
 it('never exceeds the color budget or introduces colors outside the allowed palette',()=>{
  const values=Array.from({length:100},(_,i)=>[i*2,i,255-i]);
  for(const limit of [1,2,4]){const a=featureQuantize(values,10,choices,limit,true);expect(new Set(a).size).toBeLessThanOrEqual(limit);expect(a.every(c=>choices.some(p=>p.code===c))).toBe(true);expect(featureQuantize(values,10,choices,limit,true)).toEqual(a)}
 });
 it('preserves transparency through the complete generation path',()=>{
  const input={pixels:new Uint8ClampedArray(6*6*4),width:2,height:2,maxColors:2,allowed:['H7','H2'],style:'cartoon' as const,removeBackground:false,tolerance:32};
  expect(generateCells(input)).toEqual([null,null,null,null]);
 });
});
