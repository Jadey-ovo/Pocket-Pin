import { describe, expect, it } from 'vitest'
import { connected, gridOpacity, imageDimensions, lineCells, resizeCells, zoomAround } from './operations'
import { generateCells, reduceColors } from './colors'
import { makeProject, normalizeProject } from '@/core/project'
describe('pattern editing rules',()=>{
  it('fills only four-way connected cells without wrapping rows',()=>{expect(connected(['H7',null,'H7','H7',null,'H7'],3,0)).toEqual([0,3])})
  it('interpolates fast diagonal strokes without holes',()=>{expect(lineCells(0,24,5)).toEqual([0,6,12,18,24]);expect(lineCells(4,0,5)).toEqual([4,3,2,1,0])})
  it('keeps the pinch anchor fixed',()=>{const v=zoomAround({x:10,y:20,size:10},{x:60,y:70},25);expect((60-v.x)/v.size).toBe(5);expect((70-v.y)/v.size).toBe(5)})
  it('hides fine grids at low scale and gradually reveals them',()=>{expect(gridOpacity(5,10)).toBe(0);expect(gridOpacity(10,1)).toBe(0);expect(gridOpacity(18,1)).toBeGreaterThan(0);expect(gridOpacity(18,1)).toBeLessThan(gridOpacity(24,1))})
  it('preserves tall image ratio when the long side hits 180',()=>{expect(imageDimensions(100,400,104)).toEqual({width:45,height:180})})
  it('centers and crops explicitly',()=>{expect(resizeCells(['H7','H2','H3','H4'],2,4,4,'center')).toEqual([null,null,null,null,null,'H7','H2',null,null,'H3','H4',null,null,null,null,null])})
  it('keeps a protected rare color and enforces the cap',()=>{const cells=reduceColors(['H7','H7','H2','A1'],2,['A1']);expect(cells[3]).toBe('A1');expect(new Set(cells).size).toBeLessThanOrEqual(2);expect(()=>reduceColors(['H7','H2'],1,['H7','H2'])).toThrow()})
  it('generates only allowed colors and preserves transparent cells',()=>{const pixels=new Uint8ClampedArray(6*3*4);for(let y=0;y<3;y++)for(let x=0;x<3;x++){const i=(y*6+x)*4;pixels[i]=255;pixels[i+3]=255}const cells=generateCells({pixels,width:2,height:1,maxColors:2,allowed:['H7'],style:'cartoon',removeBackground:false,tolerance:32});expect(cells).toEqual(['H7',null])})
  it('backs up all old layers while merging visible cells',()=>{const p=makeProject('old',8,8);p.layers[0].cells[0]='H7';p.layers.push({...p.layers[0],id:'hidden',visible:false,cells:Array(64).fill('H2')});const next=normalizeProject(p)!;expect(next.layers).toHaveLength(1);expect(next.cells[0]).toBe('H7');expect(next.legacyLayers).toHaveLength(2)})
  it('rejects malformed dimensions before allocating data',()=>{expect(normalizeProject({width:1e9,height:1e9,cells:[]})).toBeNull()})
})

import { fitImageToBoard } from './operations'
it('fits portrait, landscape and rotated images within the actual board',()=>{
 expect(fitImageToBoard(100,150,72,72,72)).toEqual({width:48,height:72});
 expect(fitImageToBoard(150,100,72,72,72)).toEqual({width:72,height:48});
 expect(fitImageToBoard(100,100,29,58,29)).toEqual({width:29,height:29});
 expect(fitImageToBoard(100,100,100,50,40)).toEqual({width:40,height:40});
 expect(fitImageToBoard(100,150,72,72,36)).toEqual({width:24,height:36});
 expect(fitImageToBoard(100,150,29,29,180)).toEqual({width:19,height:29});
});
