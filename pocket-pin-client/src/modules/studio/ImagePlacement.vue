<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { t } from '@/shared/i18n'
import type { Crop } from './PhotoCrop.vue'
const props = defineProps<{ src: string; modelValue: Crop; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [Crop] }>()
const workspace = ref<HTMLElement>(), frame = ref<HTMLElement>(), ratio = ref(1), bounds = ref({width:320,height:320}), interacting = ref(false)
const corners = [{id:'nw',label:'调整裁剪框左上角',sx:-1,sy:-1},{id:'ne',label:'调整裁剪框右上角',sx:1,sy:-1},{id:'sw',label:'调整裁剪框左下角',sx:-1,sy:1},{id:'se',label:'调整裁剪框右下角',sx:1,sy:1}]
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
function normalize(c:Crop):Crop {
  const width=clamp(c.width,.05,1),height=clamp(c.height,.05,1)
  return {x:clamp(c.x,0,1-width),y:clamp(c.y,0,1-height),width,height}
}
const crop=computed(()=>normalize(props.modelValue))
const fit=computed(()=>{const width=Math.max(1,Math.min(bounds.value.width-48,(bounds.value.height-48)*ratio.value));return {width:`${width}px`,height:`${width/ratio.value}px`}})
const cropStyle=computed(()=>({left:`${crop.value.x*100}%`,top:`${crop.value.y*100}%`,width:`${crop.value.width*100}%`,height:`${crop.value.height*100}%`}))
let observer:ResizeObserver|undefined
let drag:{x:number;y:number;crop:Crop;width:number;height:number;id:number;sx:number;sy:number}|null=null
function cancel(){drag=null;interacting.value=false}
onMounted(()=>{const resize=()=>{if(workspace.value)bounds.value={width:workspace.value.clientWidth,height:workspace.value.clientHeight};cancel()};resize();if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);if(workspace.value)observer.observe(workspace.value)};window.addEventListener('blur',cancel)})
onUnmounted(()=>{observer?.disconnect();window.removeEventListener('blur',cancel)})
watch(()=>props.src,cancel)
watch(()=>props.disabled,disabled=>{if(disabled)cancel()})
function loaded(e:Event){const image=e.target as HTMLImageElement;ratio.value=image.naturalWidth/Math.max(1,image.naturalHeight);const c=normalize(props.modelValue);if(JSON.stringify(c)!==JSON.stringify(props.modelValue))emit('update:modelValue',c)}
function down(e:PointerEvent,sx=0,sy=0){if(props.disabled||!frame.value||drag||e.button!==0)return;e.preventDefault();e.stopPropagation();const rect=frame.value.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,crop:{...crop.value},width:Math.max(1,rect.width),height:Math.max(1,rect.height),id:e.pointerId,sx,sy};interacting.value=true;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
function adjusted(c:Crop,dx:number,dy:number,sx:number,sy:number):Crop {
  if(!sx)return {...c,x:clamp(c.x+dx,0,1-c.width),y:clamp(c.y+dy,0,1-c.height)}
  let x=c.x,y=c.y,right=c.x+c.width,bottom=c.y+c.height
  if(sx<0)x=clamp(x+dx,0,right-.05);else right=clamp(right+dx,x+.05,1)
  if(sy<0)y=clamp(y+dy,0,bottom-.05);else bottom=clamp(bottom+dy,y+.05,1)
  return {x,y,width:right-x,height:bottom-y}
}
function move(e:PointerEvent){if(!drag||e.pointerId!==drag.id||props.disabled)return;e.preventDefault();emit('update:modelValue',adjusted(drag.crop,(e.clientX-drag.x)/drag.width,(e.clientY-drag.y)/drag.height,drag.sx,drag.sy))}
function end(e:PointerEvent){if(drag?.id===e.pointerId)cancel()}
function keyScale(e:KeyboardEvent,sx:number,sy:number){if(props.disabled||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?.05:.01;emit('update:modelValue',adjusted(crop.value,e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0,sx,sy))}
</script>
<template>
  <div class="pin-placement">
    <div ref="workspace" class="pin-placement-workspace" :class="{interacting}">
      <div ref="frame" class="pin-placement-frame" :style="fit">
        <img :src="src" draggable="false" :alt="t('固定居中的导入图片')" @load="loaded"/>
        <div class="pin-placement-mask" aria-hidden="true"><div :style="cropStyle"/></div>
        <div class="pin-placement-crop" :style="cropStyle" :aria-label="t('拖动裁剪框调整范围')" @pointerdown="down($event)" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
          <div class="pin-placement-crop-outline" aria-hidden="true"><div class="pin-placement-grid"/><i v-for="corner in corners" :key="corner.id" :class="corner.id"/></div>
          <button v-for="corner in corners" :key="corner.id" type="button" class="pin-placement-handle" :class="corner.id" :style="{left:corner.sx<0?'0%':'100%',top:corner.sy<0?'0%':'100%'}" :aria-label="t(corner.label)" :disabled="disabled" @pointerdown="down($event,corner.sx,corner.sy)" @keydown="keyScale($event,corner.sx,corner.sy)"><span/></button>
        </div>
      </div>
    </div>
    <small>{{t('拖动四角裁剪 · 拖动框内移动')}}</small>
  </div>
</template>
<style>
.pin-placement{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 12px 12px}
.pin-placement-workspace{flex:1;min-height:0;width:100%;display:grid;place-items:center;overflow:hidden;isolation:isolate}
.pin-placement-frame{position:relative;flex:none;touch-action:none;background:var(--animal-paper)}
.pin-placement-frame>img{display:block;width:100%;height:100%;max-width:none!important;max-height:none!important;object-fit:contain;pointer-events:none;user-select:none}
.pin-placement-mask{position:absolute;inset:0;overflow:hidden;pointer-events:none}.pin-placement-mask>div{position:absolute;box-shadow:0 0 0 2000px #35261966}
.pin-placement-crop{position:absolute;touch-action:none;cursor:move}
.pin-placement-crop-outline{position:absolute;inset:0;pointer-events:none;border:1px solid #fff;box-shadow:0 0 0 1px #35261955}
.pin-placement-crop-outline>i{position:absolute;width:18px;height:18px;border:3px solid #fff;filter:drop-shadow(0 1px 1px #35261966)}
.pin-placement-crop-outline>.nw{left:-2px;top:-2px;border-right:0;border-bottom:0}.pin-placement-crop-outline>.ne{right:-2px;top:-2px;border-left:0;border-bottom:0}.pin-placement-crop-outline>.sw{left:-2px;bottom:-2px;border-right:0;border-top:0}.pin-placement-crop-outline>.se{right:-2px;bottom:-2px;border-left:0;border-top:0}
.pin-placement-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 33%,#fff8 33%,#fff8 33.4%,transparent 33.4%,transparent 66.6%,#fff8 66.6%,#fff8 67%,transparent 67%),linear-gradient(transparent 33%,#fff8 33%,#fff8 33.4%,transparent 33.4%,transparent 66.6%,#fff8 66.6%,#fff8 67%,transparent 67%)}
.pin-placement-handle{position:absolute;z-index:2;display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;background:transparent;transform:translate(-50%,-50%);touch-action:none}
.pin-placement-handle span{width:13px;height:13px;border:2px solid var(--animal-primary);border-radius:3px;background:var(--animal-paper);box-shadow:0 1px 4px #35261933;pointer-events:none}
.pin-placement-handle.nw,.pin-placement-handle.se{cursor:nwse-resize}.pin-placement-handle.ne,.pin-placement-handle.sw{cursor:nesw-resize}.pin-placement-handle:focus-visible{outline:2px solid var(--animal-primary);border-radius:8px}.pin-placement-handle:disabled{pointer-events:none;opacity:.5}
.pin-placement small{flex:none;min-height:20px;margin-bottom:60px;padding:0 12px;font-size:12px;color:var(--animal-muted);text-align:center}
</style>
