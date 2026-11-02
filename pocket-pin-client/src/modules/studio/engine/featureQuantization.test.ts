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

it('prioritizes colors in detected face cells without changing transparency or the palette',()=>{
 const choices=[{code:'gray',rgb:[180,180,180]},{code:'white',rgb:[255,255,255]},{code:'skin',rgb:[175,145,135]}]
 const values=Array.from({length:100},(_,i)=>i<12?[175,145,135]:i<32?[255,255,255]:[180,180,180])
 const importance=new Uint8Array(100).fill(1);importance.fill(6,0,12)
 const cells=featureQuantize(values,10,choices,2,false,false,importance)
 expect(cells.slice(0,12)).toEqual(Array(12).fill('skin'))
 expect(new Set(cells).size).toBeLessThanOrEqual(2)
})

it('retains useful realistic tonal steps with a generous budget',()=>{
 const tones=[100,120,140,160,180].map((v,i)=>({code:`tone${i}`,rgb:[v,v,v]}));
 const values=Array.from({length:100},(_,i)=>tones[Math.floor(i/20)].rgb);
 const result=featureQuantize(values,10,tones,211,false,false);
 expect(new Set(result).size).toBe(5);
 for(let i=0;i<values.length;i++)expect(result[i]).toBe(tones[Math.floor(i/20)].code);
});

it('does not spend unused colors chasing an out-of-gamut source color',()=>{
 const gray=[60,160,220,240,255].map((v,i)=>({code:`gray${i}`,rgb:[v,v,v]}));
 const values=Array.from({length:100},(_,i)=>[220+(i%5)*7,0,0]);
 for(const cartoon of [true,false]){
  const result=featureQuantize(values,10,gray,211,cartoon,false);
  expect(new Set(result).size).toBe(1);
 }
});

it('protects non-face details across the image without filling flat areas with noise',()=>{
 const colors=[{code:'paper',rgb:[230,230,230]},{code:'line',rgb:[30,30,30]},{code:'flower',rgb:[220,40,70]},{code:'leaf',rgb:[40,150,60]}];
 const values=Array.from({length:400},(_,i)=>i===21?colors[2].rgb:i===378?colors[3].rgb:i%20===10?colors[1].rgb:colors[0].rgb);
 const importance=new Uint8Array(400).fill(1);importance.fill(6,140,200);
 const result=featureQuantize(values,20,colors,211,false,false,importance);
 expect(result[21]).toBe('flower');expect(result[378]).toBe('leaf');
 expect(result.filter(c=>c==='line')).toHaveLength(20);
 expect(new Set(result).size).toBe(4);
});
