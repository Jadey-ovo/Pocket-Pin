<script setup lang="ts">
import {ref,onMounted,onUnmounted,watch,nextTick} from 'vue'
import {t} from '@/shared/i18n'
import {colorByCode} from '@/core/project'
const props=defineProps<{cells:(string|null)[];sourceWidth:number;sourceHeight:number;width:number;height:number;modelValue:{x:number;y:number}}>()
const emit=defineEmits<{'update:modelValue':[ {x:number;y:number} ]}>()
const canvas=ref<HTMLCanvasElement>();let unit=1,drag:{x:number;y:number;ox:number;oy:number;id:number}|null=null,observer:ResizeObserver|undefined
function paint(){const c=canvas.value;if(!c)return;const w=c.clientWidth,h=c.clientHeight,d=devicePixelRatio||1;c.width=w*d;c.height=h*d;if(!w||!h)return;const ctx=c.getContext('2d');if(!ctx)return;ctx.scale(d,d);unit=Math.max(1,Math.min((w-88)/Math.max(props.width,props.sourceWidth),(h-88)/Math.max(props.height,props.sourceHeight)));const left=(w-props.width*unit)/2,top=(h-props.height*unit)/2;ctx.fillStyle='#fffdf6';ctx.fillRect(left,top,props.width*unit,props.height*unit);props.cells.forEach((code,i)=>{if(!code)return;const x=i%props.sourceWidth+props.modelValue.x,y=Math.floor(i/props.sourceWidth)+props.modelValue.y;ctx.globalAlpha=(x<0||y<0||x>=props.width||y>=props.height)?0.5:1;ctx.fillStyle=colorByCode(code)?.hex||'#fff';ctx.fillRect(left+x*unit,top+y*unit,unit,unit)});ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(left,top,props.width*unit,props.height*unit);ctx.strokeStyle='#705944';ctx.lineWidth=1;ctx.strokeRect(left-2,top-2,props.width*unit+4,props.height*unit+4)}
function down(e:PointerEvent){if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,y:e.clientY,ox:props.modelValue.x,oy:props.modelValue.y,id:e.pointerId};canvas.value!.setPointerCapture(e.pointerId)}
function move(e:PointerEvent){if(!drag||drag.id!==e.pointerId)return;emit('update:modelValue',{x:drag.ox+Math.round((e.clientX-drag.x)/unit),y:drag.oy+Math.round((e.clientY-drag.y)/unit)})}
onMounted(()=>{paint();if(typeof ResizeObserver==='undefined')return;observer=new ResizeObserver(paint);observer.observe(canvas.value!)});onUnmounted(()=>observer?.disconnect());watch(()=>[props.width,props.height,props.modelValue,props.cells],()=>nextTick(paint))
</script>
<template><div class="pin-board-placement"><canvas ref="canvas" :aria-label="t('拖动图纸调整豆板裁切位置')" @pointerdown="down" @pointermove="move" @pointerup="drag=null" @pointercancel="drag=null"/><small>{{t('拖动图纸调整位置，框外豆子不会保留')}}</small></div></template>
<style scoped>.pin-board-placement{position:absolute;inset:0;display:flex;flex-direction:column;padding-bottom:70px;background:var(--animal-bg)}canvas{width:100%;flex:1;min-height:0;touch-action:none;cursor:grab}small{text-align:center;font-size:12px;color:var(--animal-muted);padding:8px}</style>
