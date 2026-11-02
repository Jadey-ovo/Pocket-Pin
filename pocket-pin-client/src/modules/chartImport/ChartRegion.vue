<script setup lang="ts">
import {computed,ref,onMounted,onUnmounted} from 'vue'
import type {Alignment} from './alignment'
import {boxQuad,gridPoint,type Quad,type Point} from './recognition'
const props=defineProps<{src:string;width:number;height:number;quad:Quad;columns?:number;rows?:number;rectangular?:boolean;editable?:boolean;alignment?:Alignment;gridOnly?:boolean}>()
const emit=defineEmits<{'update:quad':[Quad];finish:[];'update:alignment':[Alignment]}>()
const svg=ref<SVGSVGElement>(),viewport=ref<HTMLElement>(),zoom=ref(1),pan=ref({x:0,y:0}),bounds=ref({width:900,height:300})
const baseWidth=computed(()=>Math.max(30,Math.min(bounds.value.width-32,(bounds.value.height-32)*props.width/props.height)))
const displayWidth=computed(()=>baseWidth.value*zoom.value)
const handleSpan=computed(()=>props.alignment?Math.max(3,Math.ceil(60*props.width/displayWidth.value/Math.min(props.alignment.cellWidth,props.alignment.cellHeight))):3)
const corners=computed(()=>[0,1,2,3])
let observer:ResizeObserver|undefined
onMounted(()=>{if(typeof ResizeObserver==='undefined')return;observer=new ResizeObserver(()=>{if(viewport.value)bounds.value={width:viewport.value.clientWidth,height:viewport.value.clientHeight}});if(viewport.value)observer.observe(viewport.value)})
onUnmounted(()=>observer?.disconnect())
const lines=computed(()=>{
 const out:{x1:number;y1:number;x2:number;y2:number}[]=[]
 if(props.gridOnly&&props.alignment){const a=props.alignment;for(let x=((a.x%a.cellWidth)+a.cellWidth)%a.cellWidth;x<props.width;x+=a.cellWidth)out.push({x1:x,y1:0,x2:x,y2:props.height});for(let y=((a.y%a.cellHeight)+a.cellHeight)%a.cellHeight;y<props.height;y+=a.cellHeight)out.push({x1:0,y1:y,x2:props.width,y2:y});return out}
 for(const [count,vertical] of [[props.columns??0,true],[props.rows??0,false]] as const)for(let n=0;n<=count&&count>0;n++){
  const a=gridPoint(props.quad,vertical?n/count:0,vertical?0:n/count),b=gridPoint(props.quad,vertical?n/count:1,vertical?1:n/count);out.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y})
 }
 return out
})
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
const touches=new Map<number,Point>()
let drag:{id:number;index:number;start:Point;quad:Quad;screen:Point;pan:Point;alignment?:Alignment}|null=null,pinch:{distance:number;zoom:number;pan:Point;center:Point}|null=null,changed=false
function point(e:PointerEvent):Point{const m=svg.value?.getScreenCTM();if(!m)return {x:0,y:0};return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse())}
function rectangle(a:Point,b:Point):Quad{return boxQuad({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)})}
function setZoom(value:number,screen:Point){const old=zoom.value,next=clamp(value,1,8),r=viewport.value!.getBoundingClientRect(),anchor={x:screen.x-r.left-r.width/2,y:screen.y-r.top-r.height/2};pan.value={x:anchor.x-(anchor.x-pan.value.x)*next/old,y:anchor.y-(anchor.y-pan.value.y)*next/old};zoom.value=next;if(next===1)pan.value={x:0,y:0}}
function wheel(e:WheelEvent){e.preventDefault();setZoom(zoom.value*Math.exp(-clamp(e.deltaY,-120,120)*.008),{x:e.clientX,y:e.clientY})}
function down(e:PointerEvent,index=-2){if(e.button!==0&&e.button!==1)return;e.preventDefault();touches.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.value?.setPointerCapture(e.pointerId)
 if(touches.size===2){const [a,b]=[...touches.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:zoom.value,pan:{...pan.value},center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};drag=null;return}
 const effective=!props.editable||e.button===1?-2:index
 drag={id:e.pointerId,index:effective,start:point(e),quad:props.quad.map(p=>({...p})) as Quad,screen:{x:e.clientX,y:e.clientY},pan:{...pan.value},alignment:props.alignment?{...props.alignment}:undefined};changed=false
}
function move(e:PointerEvent){if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY})
 if(pinch&&touches.size===2){const [a,b]=[...touches.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};zoom.value=pinch.zoom;pan.value={...pinch.pan};setZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),pinch.center);pan.value={x:pan.value.x+center.x-pinch.center.x,y:pan.value.y+center.y-pinch.center.y};return}
 if(!drag||drag.id!==e.pointerId)return
 if(drag.index===-2){pan.value={x:drag.pan.x+e.clientX-drag.screen.x,y:drag.pan.y+e.clientY-drag.screen.y};return}
 const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y
 if(drag.index>=4&&drag.alignment){const a=drag.alignment;emit('update:alignment',drag.index===4?{...a,x:a.x+dx,y:a.y+dy}:{...a,cellWidth:Math.max(2,a.cellWidth+dx/handleSpan.value),cellHeight:Math.max(2,a.cellHeight+dy/handleSpan.value)});changed=true;return}
 let q:Quad
 if(drag.index===-3)q=rectangle(drag.start,{x:clamp(p.x,0,props.width-1),y:clamp(p.y,0,props.height-1)})
 else if(props.rectangular&&drag.index>=0){const opposite=drag.quad[(drag.index+2)%4],current=drag.quad[drag.index];q=rectangle(opposite,{x:clamp(current.x+dx,0,props.width-1),y:clamp(current.y+dy,0,props.height-1)})}
 else q=drag.quad.map((p,i)=>({x:p.x+(drag!.index<0||i===drag!.index?dx:0),y:p.y+(drag!.index<0||i===drag!.index?dy:0)})) as Quad
 if(q.some(p=>p.x<0||p.y<0||p.x>=props.width||p.y>=props.height))return
 if(props.rectangular&&(q[2].x-q[0].x<3||q[2].y-q[0].y<3))return
 changed=true;emit('update:quad',q)
}
function end(e:PointerEvent){touches.delete(e.pointerId);if(touches.size<2)pinch=null;if(drag?.id===e.pointerId)drag=null;if(!touches.size&&changed){emit('finish');changed=false}}
function key(e:KeyboardEvent,index:number){if(props.gridOnly&&props.alignment&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const a=props.alignment,d=e.shiftKey?1:.1,dx=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:0,dy=e.key==='ArrowUp'?-d:e.key==='ArrowDown'?d:0;emit('update:alignment',index===4?{...a,x:a.x+dx,y:a.y+dy}:{...a,cellWidth:Math.max(2,a.cellWidth+dx),cellHeight:Math.max(2,a.cellHeight+dy)});emit('finish');return}if(!props.editable||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const d=e.shiftKey?5:1,dx=d*(props.columns?Math.abs(props.quad[1].x-props.quad[0].x)/props.columns:1),dy=d*(props.rows?Math.abs(props.quad[3].y-props.quad[0].y)/props.rows:1),current=props.quad[index],p={x:clamp(current.x+(e.key==='ArrowLeft'?-dx:e.key==='ArrowRight'?dx:0),0,props.width-1),y:clamp(current.y+(e.key==='ArrowUp'?-dy:e.key==='ArrowDown'?dy:0),0,props.height-1)}
 const q=props.rectangular?rectangle(props.quad[(index+2)%4],p):props.quad.map((v,i)=>i===index?p:{...v}) as Quad
 emit('update:quad',q);emit('finish')
}
const points=computed(()=>props.quad.map(p=>`${p.x},${p.y}`).join(' '))
</script>
<template>
 <div ref="viewport" class="chart-image-viewport" role="group" aria-label="图纸预览，可滚轮或双指缩放" @wheel="wheel" @pointerdown="down($event,-2)" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @dblclick="zoom=1;pan={x:0,y:0}">
  <svg ref="svg" :viewBox="`0 0 ${width} ${height}`" :style="{width:`${displayWidth}px`,transform:`translate(-50%,-50%) translate(${pan.x}px,${pan.y}px)`}">
   <image :href="src" :width="width" :height="height"/>
   <template v-if="rectangular||editable||columns||gridOnly">
    <path v-if="!gridOnly" :d="`M0 0H${width}V${height}H0Z M${quad[0].x} ${quad[0].y} L${quad[3].x} ${quad[3].y} L${quad[2].x} ${quad[2].y} L${quad[1].x} ${quad[1].y} Z`" fill="#1c231e99" fill-rule="evenodd" pointer-events="none"/>
    <polygon v-if="!gridOnly" :points="points" fill="transparent" stroke="#55c4ad" stroke-width="2" vector-effect="non-scaling-stroke" @pointerdown.stop="down($event,-2)"/>
    <g pointer-events="none"><line v-for="(line,i) in lines" :key="i" v-bind="line" stroke="#51cbb2" stroke-opacity=".65" stroke-width="1" vector-effect="non-scaling-stroke"/></g>
   </template>
   <circle v-for="i in editable&&!gridOnly?corners:[]" :key="i" :cx="quad[i].x" :cy="quad[i].y" :r="width/displayWidth*10" fill="#fffdf6" stroke="#249b83" stroke-width="2" vector-effect="non-scaling-stroke" tabindex="0" role="button" :aria-label="['左上角','右上角','右下角','左下角'][i]" @pointerdown.stop="down($event,i)" @keydown="key($event,i)"/>
   <template v-if="gridOnly&&alignment">
    <circle v-for="(point,i) in [{x:alignment.x+Math.round((width/2-alignment.x)/alignment.cellWidth)*alignment.cellWidth,y:alignment.y+Math.round((height/2-alignment.y)/alignment.cellHeight)*alignment.cellHeight},{x:alignment.x+(Math.round((width/2-alignment.x)/alignment.cellWidth)+handleSpan)*alignment.cellWidth,y:alignment.y+(Math.round((height/2-alignment.y)/alignment.cellHeight)+handleSpan)*alignment.cellHeight}]" :key="i" :cx="point.x" :cy="point.y" :r="width/displayWidth*12" :fill="i?'#438dec':'#ef5963'" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" role="button" tabindex="0" @keydown="key($event,i+4)" :aria-label="i?'调整格子大小':'调整网格位置'" @pointerdown.stop="down($event,i+4)"/>
   </template>
  </svg>
 </div>
</template>
<style scoped>
.chart-image-viewport{position:relative;height:clamp(250px,48dvh,560px);overflow:hidden;background:#252d2a;border-radius:20px;touch-action:none;overscroll-behavior:contain;user-select:none}.chart-image-viewport svg{position:absolute;left:50%;top:50%;display:block;height:auto;max-width:none;touch-action:none}.chart-image-viewport polygon,.chart-image-viewport circle{cursor:move}.chart-image-viewport circle:focus{stroke:#ffb453;stroke-width:4px}
</style>
