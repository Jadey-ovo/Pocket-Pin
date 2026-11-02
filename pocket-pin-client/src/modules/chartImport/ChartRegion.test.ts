import {mount} from '@vue/test-utils'
import {it,expect} from 'vitest'
import ChartRegion from './ChartRegion.vue'
import {boxQuad,type Quad} from './recognition'
it('offers four corners and keeps legend cropping rectangular during keyboard adjustment',async()=>{
 const w=mount(ChartRegion,{props:{src:'test.png',width:200,height:200,quad:boxQuad({x:20,y:30,width:100,height:80}),rectangular:true,editable:true}})
 expect(w.findAll('circle')).toHaveLength(4);expect(w.find('.chart-zoom').exists()).toBe(false)
 await w.find('[aria-label="左上角"]').trigger('keydown',{key:'ArrowRight'})
 const q=w.emitted('update:quad')![0][0] as Quad
 expect(q[0]).toEqual({x:21,y:30});expect(q[3]).toEqual({x:21,y:110});expect(q[2]).toEqual({x:120,y:110});w.unmount()
})
it('zooms directly inside the image container without separate controls',async()=>{
 const w=mount(ChartRegion,{props:{src:'test.png',width:200,height:200,quad:boxQuad({x:20,y:30,width:100,height:80}),rectangular:true}})
 const before=w.find('svg').attributes('style');w.find('.chart-image-viewport').element.dispatchEvent(new WheelEvent('wheel',{deltaY:-60,clientX:100,clientY:100,cancelable:true}));await w.vm.$nextTick()
 expect(w.find('svg').attributes('style')).not.toBe(before);expect(w.findAll('button')).toHaveLength(0);w.unmount()
})

it('lays the lattice across the whole image with independent position and size handles',()=>{
 const w=mount(ChartRegion,{props:{src:'test.png',width:200,height:200,quad:boxQuad({x:20,y:30,width:100,height:80}),gridOnly:true,editable:true,alignment:{x:20,y:30,cellWidth:20,cellHeight:20}}})
 expect(w.findAll('circle')).toHaveLength(2);expect(w.find('path').exists()).toBe(false);expect(w.find('[aria-label="调整网格位置"]').exists()).toBe(true);expect(w.find('line').attributes('y2')).toBe('200');w.unmount()
})
