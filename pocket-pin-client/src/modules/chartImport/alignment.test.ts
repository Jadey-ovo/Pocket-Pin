import {it,expect} from 'vitest'
import {alignmentFromGrid,fullImageGrid,regionOnGrid} from './alignment'
import {boxQuad,subGrid,validGrid} from './recognition'
import {makeProject,normalizeProject} from '@/core/project'
it('extends detected cell spacing across the image then snaps the drawing region back to cells',()=>{
 const detected={quad:boxQuad({x:30,y:20,width:160,height:120}),columns:8,rows:6,confidence:1}
 const whole=fullImageGrid(alignmentFromGrid(detected),{width:221,height:181})
 expect(whole.columns).toBe(10);expect(whole.rows).toBe(9)
 const region=regionOnGrid(whole,boxQuad({x:31,y:21,width:158,height:118})),selected=subGrid(whole,region.left,region.top,region.right,region.bottom)
 expect(selected.columns).toBe(8);expect(selected.rows).toBe(6);expect(selected.quad).toEqual(detected.quad)
})
it('imports and restores a drawing larger than 180 cells per side',()=>{
 const p=makeProject('大图',208,208);p.cells[0]='A5';p.cells[p.cells.length-1]='H7'
 const restored=normalizeProject(JSON.parse(JSON.stringify(p)))!
 expect(restored.width).toBe(208);expect(restored.cells.at(-1)).toBe('H7')
 expect(validGrid({quad:boxQuad({x:1,y:1,width:832,height:832}),columns:208,rows:208,confidence:1},{width:840,height:840,data:new Uint8ClampedArray()})).toBe(true)
})
