import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BeadCanvas from './BeadCanvas.vue'
let resize:()=>void
beforeEach(()=>{
  vi.stubGlobal('ResizeObserver',class { constructor(callback:()=>void){resize=callback} observe(){} disconnect(){} })
  vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{})
  HTMLElement.prototype.setPointerCapture=vi.fn()
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:400,bottom:400,width:400,height:400,toJSON:()=>({})})
})
afterEach(()=>vi.restoreAllMocks())
function setup(){const wrapper=mount(BeadCanvas,{props:{width:8,height:8,cells:Array(64).fill(null),tool:'pencil',color:'H7'}});resize();return wrapper}
async function event(w:ReturnType<typeof setup>,type:string,id:number,x:number,y:number){await w.trigger(type,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y})}
describe('browser pointer gesture transactions',()=>{
 it('moves the reference image instead of panning the bead board',async()=>{const w=setup();await w.setProps({referenceEditing:true,tool:'pan',referenceX:0,referenceY:0,referenceScale:1});const scales=w.emitted('scale')?.length;await event(w,'pointerdown',1,150,150);await event(w,'pointermove',1,182,166);await event(w,'pointerup',1,182,166);const transform=w.emitted('referenceTransform')![0][0] as {x:number;y:number;scale:number};expect(transform.x).toBeGreaterThan(0);expect(transform.y).toBeGreaterThan(0);expect(transform.scale).toBe(1);expect(w.emitted('change')).toBeUndefined();expect(w.emitted('scale')?.length).toBe(scales);w.unmount()})

 it('draws on the first touch at a small scale without zooming',async()=>{const w=setup();await w.setProps({width:100,height:100,cells:Array(10000).fill(null)});resize();const before=w.emitted('scale')?.length||0;await event(w,'pointerdown',1,200,200);await event(w,'pointerup',1,200,200);expect(w.emitted('change')).toHaveLength(1);expect(w.emitted('scale')?.length||0).toBe(before);w.unmount()})
  it('restores the exact scale after a held overall preview and blocks drawing during it',async()=>{const w=setup();w.vm.zoomIn();const before=w.emitted('scale')!.at(-1)![0];w.vm.beginPreview();await event(w,'pointerdown',1,90,90);await event(w,'pointerup',1,90,90);expect(w.emitted('change')).toBeUndefined();w.vm.endPreview();expect(w.emitted('scale')!.at(-1)![0]).toBe(before);w.unmount()})

  it('commits a continuous stroke once, on pointer up',async()=>{const w=setup();await event(w,'pointerdown',1,90,90);await event(w,'pointermove',1,250,90);expect(w.emitted('change')).toBeUndefined();await event(w,'pointerup',1,250,90);expect(w.emitted('change')).toHaveLength(1);expect((w.emitted('change')![0][0] as unknown[]).filter(Boolean)).toHaveLength(6);w.unmount()})
  it('rolls back the unfinished stroke on second finger and never resumes until all fingers lift',async()=>{const w=setup();await event(w,'pointerdown',1,90,90);await event(w,'pointermove',1,122,90);await event(w,'pointerdown',2,250,250);await event(w,'pointerup',2,250,250);await event(w,'pointermove',1,200,90);await event(w,'pointerup',1,200,90);expect(w.emitted('change')).toBeUndefined();w.unmount()})
  it('cancels rather than commits on pointercancel',async()=>{const w=setup();await event(w,'pointerdown',1,90,90);await event(w,'pointercancel',1,90,90);expect(w.emitted('change')).toBeUndefined();w.unmount()})
  it('does not commit on lost capture',async()=>{const w=setup();await event(w,'pointerdown',1,90,90);await event(w,'lostpointercapture',1,90,90);expect(w.emitted('change')).toBeUndefined();w.unmount()})
  it('previews a diagonal rectangle without modifying cells and fills it only on release',async()=>{const w=setup();await w.setProps({tool:'fill'});await event(w,'pointerdown',1,154,154);await event(w,'pointermove',1,90,90);expect(w.emitted('change')).toBeUndefined();await event(w,'pointerup',1,90,90);const cells=w.emitted('change')![0][0] as unknown[];expect(cells.filter(Boolean)).toHaveLength(9);expect(cells[0]).toBe('H7');expect(cells[18]).toBe('H7');expect(cells[3]).toBeNull();w.unmount()})
  it('cancels rectangular fill when a second finger starts navigation',async()=>{const w=setup();await w.setProps({tool:'fill'});await event(w,'pointerdown',1,90,90);await event(w,'pointermove',1,154,154);await event(w,'pointerdown',2,250,250);await event(w,'pointerup',2,250,250);await event(w,'pointerup',1,154,154);expect(w.emitted('change')).toBeUndefined();w.unmount()})
  it('blocks all edit paths when locked',async()=>{const w=setup();await w.setProps({locked:true,tool:'fill'});await event(w,'pointerdown',1,90,90);await event(w,'pointerup',1,90,90);expect(w.emitted('change')).toBeUndefined();w.unmount()})
})

describe('board boundary gestures',()=>{
 it.each([[0,0,4],[400,400,49],[0,154,4],[154,400,14]])('clamps rectangle releases at %s,%s',async(x,y,count)=>{const w=setup();await w.setProps({tool:'fill'});await event(w,'pointerdown',1,122,122);await event(w,'pointermove',1,x,y);await event(w,'pointerup',1,x,y);expect((w.emitted('change')![0][0] as unknown[]).filter(Boolean)).toHaveLength(count);w.unmount()});
 it.each(['pencil','eraser'] as const)('preserves %s strokes released outside',async(tool)=>{const w=setup();await w.setProps({tool,cells:Array(64).fill(tool==='eraser'?'H7':null)});await event(w,'pointerdown',1,90,90);await event(w,'pointermove',1,154,90);await event(w,'pointermove',1,400,90);await event(w,'pointerup',1,400,90);const cells=w.emitted('change')![0][0] as unknown[];expect(cells.filter(Boolean)).toHaveLength(tool==='eraser'?61:3);w.unmount()});
 it('clamps selection and resumes a new gesture after releasing outside',async()=>{const w=setup();await w.setProps({tool:'select'});await event(w,'pointerdown',1,90,90);await event(w,'pointerup',1,400,400);expect(w.emitted('select')![0][0]).toEqual({x:0,y:0,width:8,height:8});await w.setProps({tool:'fill'});await event(w,'pointerdown',2,90,90);await event(w,'pointerup',2,90,90);expect(w.emitted('change')).toHaveLength(1);w.unmount()});
 it('uses the returned endpoint after dragging outside and back inside',async()=>{const w=setup();await w.setProps({tool:'fill'});await event(w,'pointerdown',1,90,90);await event(w,'pointermove',1,400,400);await event(w,'pointermove',1,122,122);await event(w,'pointerup',1,122,122);expect((w.emitted('change')![0][0] as unknown[]).filter(Boolean)).toHaveLength(4);w.unmount()});
});

describe('wheel zoom',()=>{
 it.each([0,1,2])('zooms in both directions with delta mode %s',async(deltaMode)=>{const w=setup();const before=w.emitted('scale')!.at(-1)![0] as number;w.element.dispatchEvent(new WheelEvent('wheel',{deltaY:-3,deltaMode,clientX:200,clientY:200,cancelable:true}));const enlarged=w.emitted('scale')!.at(-1)![0] as number;expect(enlarged).toBeGreaterThan(before);w.element.dispatchEvent(new WheelEvent('wheel',{deltaY:3,deltaMode,clientX:200,clientY:200,cancelable:true}));expect(w.emitted('scale')!.at(-1)![0]).toBeLessThan(enlarged);expect(w.emitted('change')).toBeUndefined();w.unmount()});
});
