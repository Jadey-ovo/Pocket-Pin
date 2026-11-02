import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import ImagePlacement from './ImagePlacement.vue'
import type { Crop } from './PhotoCrop.vue'
async function setup(ratio:number,crop:Crop={x:0,y:0,width:1,height:1}){
 const w=mount(ImagePlacement,{props:{src:'test.png',modelValue:crop}}),img=w.find('img').element
 Object.defineProperties(img,{naturalWidth:{value:ratio*400},naturalHeight:{value:400}});await w.find('img').trigger('load')
 vi.spyOn(w.find('.pin-placement-frame').element,'getBoundingClientRect').mockReturnValue({width:200,height:200/ratio} as DOMRect)
 for(const el of [w.find('.pin-placement-crop'),...w.findAll('.pin-placement-handle')])Object.defineProperty(el.element,'setPointerCapture',{value:vi.fn()})
 return w
}
function latest(w:Awaited<ReturnType<typeof setup>>){return w.emitted('update:modelValue')!.at(-1)![0] as Crop}
it.each([.5,2])('keeps the entire %s aspect photo fixed and selects its full width',async ratio=>{
 const w=await setup(ratio);expect(w.emitted('update:modelValue')).toBeUndefined();expect(w.find('.pin-placement-crop').attributes('style')).toContain('width: 100%');expect(w.find('img').attributes('style')).toBeUndefined();expect(w.findAll('.pin-placement-handle')).toHaveLength(4);w.unmount()
})
it.each([['nw',-1,-1],['ne',1,-1],['sw',-1,1],['se',1,1]] as const)('resizes %s within the photo while keeping the opposite corner fixed',async(corner,sx,sy)=>{
 const c={x:.1,y:.1,width:.8,height:.8},w=await setup(2,c),h=w.find(`.pin-placement-handle.${corner}`),image=w.find('.pin-placement-frame').attributes('style')
 await h.trigger('pointerdown',{clientX:100,clientY:100,pointerId:1,button:0});await h.trigger('pointermove',{clientX:100-sx*20,clientY:100-sy*10,pointerId:1})
 const n=latest(w);expect(n.width).toBeCloseTo(.7);expect(n.height).toBeCloseTo(.7);expect(sx<0?n.x+n.width:n.x).toBeCloseTo(sx<0?c.x+c.width:c.x);expect(sy<0?n.y+n.height:n.y).toBeCloseTo(sy<0?c.y+c.height:c.y)
 expect(w.find('.pin-placement-frame').attributes('style')).toBe(image)
 await h.trigger('pointermove',{clientX:100+sx*1000,clientY:100+sy*1000,pointerId:1});const bound=latest(w);expect(bound.x).toBeGreaterThanOrEqual(0);expect(bound.y).toBeGreaterThanOrEqual(0);expect(bound.x+bound.width).toBeLessThanOrEqual(1);expect(bound.y+bound.height).toBeLessThanOrEqual(1);w.unmount()
})
it('moves only the crop and clamps to the image boundary',async()=>{
 const w=await setup(2,{x:.1,y:.1,width:.5,height:.5}),box=w.find('.pin-placement-crop');await box.trigger('pointerdown',{clientX:100,clientY:100,pointerId:1,button:0});await box.trigger('pointermove',{clientX:1000,clientY:-1000,pointerId:2});expect(w.emitted('update:modelValue')).toBeUndefined();await box.trigger('pointermove',{clientX:1000,clientY:-1000,pointerId:1});expect(latest(w)).toEqual({x:.5,y:0,width:.5,height:.5});await box.trigger('pointercancel',{pointerId:1});const count=w.emitted('update:modelValue')!.length;await box.trigger('pointermove',{clientX:100,clientY:100,pointerId:1});expect(w.emitted('update:modelValue')).toHaveLength(count);w.unmount()
})
it('repairs legacy crops that extended beyond the image',async()=>{const w=await setup(2,{x:0,y:-.5,width:1,height:2});expect(latest(w)).toEqual({x:0,y:0,width:1,height:1});w.unmount()})
it('supports keyboard corner adjustments and disables interaction while generating',async()=>{const w=await setup(1),h=w.find('.pin-placement-handle.se');await h.trigger('keydown',{key:'ArrowLeft'});expect(latest(w).width).toBeCloseTo(.99);await w.setProps({disabled:true});const count=w.emitted('update:modelValue')!.length;await h.trigger('keydown',{key:'ArrowLeft'});await h.trigger('pointerdown',{clientX:100,clientY:100,pointerId:1,button:0});await h.trigger('pointermove',{clientX:80,clientY:80,pointerId:1});expect(w.emitted('update:modelValue')).toHaveLength(count);w.unmount()})
