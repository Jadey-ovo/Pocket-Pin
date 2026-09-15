import type { ObjectDirective } from 'vue'
/** Native touch scrolling; mouse/pen dragging with click suppression after a drag. */
export const vDragScroll: ObjectDirective<HTMLElement> = {
 mounted(el){
  let start=0,scroll=0,id=-1,dragged=false
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;start=e.clientX;scroll=el.scrollLeft;id=e.pointerId;dragged=false})
  el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const dx=e.clientX-start;if(!dragged&&Math.abs(dx)>5){dragged=true;el.setPointerCapture(id)}if(dragged){e.preventDefault();el.scrollLeft=scroll-dx}})
  const finish=(e:PointerEvent)=>{if(e.pointerId!==id)return;id=-1;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId)}
  el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish)
  el.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false}},true)
  el.addEventListener('wheel',e=>{if(el.scrollWidth<=el.clientWidth)return;const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!delta)return;const before=el.scrollLeft;el.scrollLeft+=delta;if(el.scrollLeft!==before)e.preventDefault()},{passive:false})
 }
}
