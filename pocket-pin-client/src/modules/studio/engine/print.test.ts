import { describe, expect, it } from 'vitest'
import { createProject } from './printModel'
import { cropProjectToPattern } from './print'
describe('print bounds',()=>{
  it('exports the occupied dimensions without adding empty bead rows',()=>{const p=createProject(52,65);p.cells.fill('mard-h7');const printed=cropProjectToPattern(p);expect(printed.width).toBe(52);expect(printed.height).toBe(65);expect(printed.cells).toHaveLength(3380)})
  it('crops empty margins while keeping the exact colors and counts',()=>{const p=createProject(8,8);p.cells[18]='mard-h7';p.cells[19]='mard-h2';p.cells[26]='mard-a1';const printed=cropProjectToPattern(p);expect([printed.width,printed.height]).toEqual([2,2]);expect(printed.cells).toEqual(['mard-h7','mard-h2','mard-a1',null])})
})

import { vi, afterEach } from 'vitest'
import { renderPrintCanvas, drawWatermark, downloadPrintImage } from './print'
afterEach(()=>vi.restoreAllMocks())
describe('styled print output',()=>{
 it('tiles the requested watermark at 45 degrees and restores drawing state',()=>{const context={save:vi.fn(),restore:vi.fn(),translate:vi.fn(),rotate:vi.fn(),measureText:()=>({width:100}),fillText:vi.fn(),globalAlpha:1} as unknown as CanvasRenderingContext2D;drawWatermark(context,400,600,{text:'我的拼豆',opacity:.3});expect(context.rotate).toHaveBeenCalledWith(-Math.PI/4);expect(context.globalAlpha).toBe(.3);expect(vi.mocked(context.fillText).mock.calls.length).toBeGreaterThan(4);expect(context.restore).toHaveBeenCalled()})
 it('uses a minimum paper width for small patterns and uses white base grid lines',()=>{const strokes:string[]=[];const context=new Proxy({strokeStyle:'',measureText:()=>({width:100})},{get:(target,key)=>key==='stroke'?()=>strokes.push(target.strokeStyle):key in target?target[key as keyof typeof target]:()=>{}}) as unknown as CanvasRenderingContext2D;vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);const p=createProject(1,1);p.cells[0]='mard-h7';const canvas=renderPrintCanvas(p,{showColorCodes:true,showGuideLines:true,projectName:'小图纸'});expect(canvas.width).toBeGreaterThan(1000);expect(strokes).toContain('#ffffff')})
 it('draws thin red guides every five cells and thicker guides every ten across board boundaries',()=>{const strokes:{color:string;width:number}[]=[];const target={strokeStyle:'',lineWidth:0,measureText:()=>({width:100})};const context=new Proxy(target,{get:(obj,key)=>key==='stroke'?()=>strokes.push({color:obj.strokeStyle,width:obj.lineWidth}):key in obj?obj[key as keyof typeof obj]:()=>{}}) as unknown as CanvasRenderingContext2D;vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);const p=createProject(35,35);p.cells.fill('mard-h7');renderPrintCanvas(p,{showColorCodes:true,showGuideLines:true});const red=strokes.filter(s=>s.color==='#b92c3c');expect(red.filter(s=>s.width===1.1)).toHaveLength(6);expect(red.filter(s=>s.width===2.4)).toHaveLength(6);expect(strokes.some(s=>s.color==='#ffffff'&&s.width===.7)).toBe(true)})
 it('encodes JPG as JPEG and rejects failed image encoding',async()=>{const context=new Proxy({},{get:()=>()=>{}}) as CanvasRenderingContext2D;vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);const encode=vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(null));const p=createProject(1,1);p.cells[0]='mard-h7';await expect(downloadPrintImage(p,{showColorCodes:true,showGuideLines:true},'jpg')).rejects.toThrow('图片生成失败');expect(encode.mock.calls[0][1]).toBe('image/jpeg')})
})

it('keeps square or 4:3 paper and bounds large export memory',()=>{
 const context=new Proxy({},{get:()=>()=>{}}) as CanvasRenderingContext2D;
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
 for(const [w,h] of [[11,11],[52,65],[180,180],[180,29]]){
  const p=createProject(w,h);p.cells.fill('mard-h7');
  const canvas=renderPrintCanvas(p,{showColorCodes:true,showGuideLines:true});
  const ratio=canvas.width/canvas.height;
  expect(Math.min(Math.abs(ratio-1),Math.abs(ratio-4/3))).toBeLessThan(.002);
  expect(canvas.width*canvas.height).toBeLessThan(16010000);
 }
});
