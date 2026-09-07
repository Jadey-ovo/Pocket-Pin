<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { colorByCode } from '@/core/project'
const props=defineProps<{width:number;height:number;cells:Array<string|null>;detailed?:boolean}>()
const canvas=ref<HTMLCanvasElement|null>(null)
function contrast(hex:string){const n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;return r*.299+g*.587+b*.114<150?'#fff':'#302b28'}
function draw(){
  const el=canvas.value;if(!el)return
  if(!props.detailed||el.closest('.board-crop-stage')){
    const dpr=Math.max(1,devicePixelRatio||1),w=480,h=Math.max(120,Math.round(w*props.height/props.width));el.width=w*dpr;el.height=h*dpr
    const ctx=el.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,w,h)
    const size=Math.min(w/props.width,h/props.height),ox=(w-props.width*size)/2,oy=(h-props.height*size)/2
    props.cells.forEach((code,index)=>{if(!code)return;ctx.fillStyle=colorByCode(code)?.hex||'#fff';ctx.fillRect(ox+(index%props.width)*size,oy+Math.floor(index/props.width)*size,Math.max(1,size),Math.max(1,size))});return
  }
  const cell=28,pad=28,title=52,used=[...new Set(props.cells.filter((x):x is string=>Boolean(x)))],legendRows=Math.ceil(used.length/8),w=Math.max(props.width*cell+pad*2,8*112+pad*2),h=title+props.height*cell+54+legendRows*34
  el.width=w;el.height=h;const ctx=el.getContext('2d')!;ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,w,h);ctx.fillStyle='#574437';ctx.font='800 20px sans-serif';ctx.fillText('拼豆图纸预览',pad,32)
  const ox=(w-props.width*cell)/2,oy=title
  props.cells.forEach((code,index)=>{const x=ox+(index%props.width)*cell,y=oy+Math.floor(index/props.width)*cell,hex=code?(colorByCode(code)?.hex||'#fff'):'#fff';ctx.fillStyle=hex;ctx.fillRect(x,y,cell,cell);if(code){ctx.fillStyle=contrast(hex);ctx.font='700 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(code,x+cell/2,y+cell/2)}})
  for(let x=0;x<=props.width;x++){ctx.beginPath();ctx.strokeStyle=x%10===0?'rgba(87,68,55,.82)':x%5===0?'rgba(87,68,55,.58)':'rgba(87,68,55,.25)';ctx.lineWidth=x%10===0?2.5:x%5===0?1.5:.6;ctx.moveTo(ox+x*cell,oy);ctx.lineTo(ox+x*cell,oy+props.height*cell);ctx.stroke()}
  for(let y=0;y<=props.height;y++){ctx.beginPath();ctx.strokeStyle=y%10===0?'rgba(87,68,55,.82)':y%5===0?'rgba(87,68,55,.58)':'rgba(87,68,55,.25)';ctx.lineWidth=y%10===0?2.5:y%5===0?1.5:.6;ctx.moveTo(ox,oy+y*cell);ctx.lineTo(ox+props.width*cell,oy+y*cell);ctx.stroke()}
  const ly=oy+props.height*cell+28;ctx.fillStyle='#574437';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='800 13px sans-serif';ctx.fillText('拼豆用量',pad,ly)
  used.forEach((code,index)=>{const item=colorByCode(code),x=pad+(index%8)*112,y=ly+10+Math.floor(index/8)*34,count=props.cells.filter(value=>value===code).length,hex=item?.hex||'#fff';ctx.fillStyle=hex;ctx.fillRect(x,y,54,24);ctx.fillStyle=contrast(hex);ctx.font='700 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${code}  ${count}`,x+27,y+12)})
}
watch(()=>[props.width,props.height,props.cells,props.detailed],draw,{deep:true});onMounted(draw)
</script>
<template><canvas ref="canvas" class="mini-preview-canvas" aria-label="图纸实时预览"></canvas></template>
