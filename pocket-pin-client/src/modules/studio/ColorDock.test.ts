import { mount } from '@vue/test-utils'
import { describe,it,expect,vi } from 'vitest'
import ColorDock from './ColorDock.vue'
describe('palette interactions',()=>{
 it('places the icon picker before the short family label',()=>{const w=mount(ColorDock,{props:{color:'H7',canPick:true}});expect(w.find('.pin-family-trigger').text()).toBe('H');expect(w.find('.pin-palette-dock').findAll('button')[0].attributes('aria-label')).toBe('从豆板取色');expect(w.find('.pin-pick-color').exists()).toBe(false);w.unmount()})
 it('toggles the sheet from the same family button',async()=>{const w=mount(ColorDock,{props:{color:'H7',canPick:true}}),b=w.find('.pin-family-trigger');await b.trigger('click');expect(b.attributes('aria-expanded')).toBe('true');await b.trigger('click');expect(b.attributes('aria-expanded')).toBe('false');w.unmount()})
 it('drags the color strip with a mouse without selecting a color',async()=>{const w=mount(ColorDock,{props:{color:'H7',canPick:true}}),strip=w.find('.pin-palette-strip'),el=strip.element as HTMLElement;el.setPointerCapture=vi.fn();el.hasPointerCapture=()=>true;el.releasePointerCapture=vi.fn();await strip.trigger('pointerdown',{pointerType:'mouse',pointerId:1,button:0,clientX:200,clientY:10});await strip.trigger('pointermove',{pointerType:'mouse',pointerId:1,clientX:100,clientY:10});await strip.trigger('pointerup',{pointerType:'mouse',pointerId:1,clientX:100,clientY:10});expect(el.scrollLeft).toBe(100);await strip.find('button').trigger('click');expect(w.emitted('choose')).toBeUndefined();w.unmount()})
})
