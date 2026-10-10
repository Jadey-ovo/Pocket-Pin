<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
const props=defineProps<{enabled:boolean;open:boolean}>()
const emit=defineEmits<{ 'update:open':[value:boolean] }>()
const root=ref<HTMLElement>()
function outside(e:PointerEvent){if(props.enabled&&props.open&&root.value&&!e.composedPath().includes(root.value)){offset.value=null;dragging.value=false;pointer=-1;emit('update:open',false)}}
onMounted(()=>document.addEventListener('pointerdown',outside,true))
onUnmounted(()=>document.removeEventListener('pointerdown',outside,true))
const offset=ref<number|null>(null),dragging=ref(false)
let pointer=-1,startX=0,startY=0,startOffset=0,suppress=false
const width=240
function down(e:PointerEvent){if(!props.enabled||e.button!==0||(e.target as HTMLElement).closest('.pin-swipe-actions'))return;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;startOffset=props.open?-width:0;suppress=false}
function move(e:PointerEvent){if(e.pointerId!==pointer)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(!dragging.value){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>6){pointer=-1;return}if(Math.abs(dx)<6)return;dragging.value=true;suppress=true;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}e.preventDefault();offset.value=Math.max(-width,Math.min(0,startOffset+dx))}
function end(e:PointerEvent){if(e.pointerId!==pointer)return;pointer=-1;if(dragging.value){emit('update:open',e.type==='pointercancel'?props.open:(offset.value??0)<-width/3)}dragging.value=false;offset.value=null}
function click(e:MouseEvent){if(suppress){e.preventDefault();e.stopPropagation();suppress=false}else if(props.open&&!(e.target as HTMLElement).closest('.pin-swipe-actions')){emit('update:open',false);e.stopPropagation()}}
</script>
<template><div ref="root" :class="enabled?'pin-project-swipe':'pin-project-swipe-disabled'" @pointerdown="down" @pointermove="move" @pointerup="end" @pointercancel="end" @click.capture="click" @dragstart.prevent><div v-if="enabled" class="pin-swipe-actions"><slot name="actions"/></div><div class="pin-swipe-content" :class="{'is-dragging':dragging,'is-open':enabled&&(open||dragging)}" :style="enabled?{'--swipe-progress':-(offset??(open?-width:0))/width}:undefined"><slot/></div></div></template>
<style>
.pin-project-swipe{position:relative;overflow:hidden;border-radius:24px;border:1px solid var(--animal-border);background:var(--animal-surface);touch-action:pan-y;user-select:none}.pin-swipe-content{position:relative;transition:transform .2s var(--animal-motion)}.pin-swipe-content.is-dragging{transition:none}.pin-project-swipe-disabled,.pin-project-swipe-disabled>.pin-swipe-content{display:contents}.pin-swipe-actions{position:absolute;inset:0 0 0 auto;width:240px;display:flex;align-items:stretch;gap:4px;padding:6px;background:var(--animal-surface)}.pin-swipe-actions button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;flex:1;min-width:0;padding:4px;border:0;border-radius:16px;background:var(--animal-mint);color:var(--animal-primary-dark);font:inherit;font-size:10px;font-weight:700;cursor:pointer}.pin-swipe-actions button.danger{background:var(--animal-coral);color:var(--animal-paper)}.pin-swipe-actions .tool-glyph,.pin-swipe-actions .van-icon{width:21px;height:21px;font-size:21px}.home-workspace .pin-library-list .pin-project-swipe .project-list-card{margin:0;border:0;border-radius:0;background:var(--animal-surface)}
</style>

<style>
/* The thumbnail remains anchored while only the metadata slides. */
.pin-project-swipe .pin-swipe-content{transform:none;overflow:hidden}
.home-workspace .pin-library-list .pin-project-swipe .project-list-card{overflow:hidden}
.pin-project-swipe .project-preview{z-index:2;background:var(--animal-surface)}
.pin-project-swipe .project-meta{transform:translateX(var(--swipe-offset,0px));transition:transform .2s var(--animal-motion)}
.pin-project-swipe .is-dragging .project-meta{transition:none}
.pin-project-swipe .pin-swipe-actions{width:calc(100% - 108px);max-width:240px;padding-left:4px;z-index:1;visibility:hidden;pointer-events:none}
.pin-project-swipe:has(.is-open) .pin-swipe-actions{visibility:visible;pointer-events:auto}
.pin-project-swipe .pin-swipe-content{pointer-events:none}
.pin-project-swipe .project-preview,.pin-project-swipe .project-meta{pointer-events:auto}
</style>
<style>
.pin-project-swipe .pin-swipe-actions{z-index:0}
.pin-project-swipe .pin-swipe-content{z-index:1}
.home-workspace .pin-library-list .pin-project-swipe .project-list-card{background:transparent}
.pin-project-swipe .project-meta{background:var(--animal-surface);min-height:88px;display:flex;flex-direction:column;justify-content:center}
</style>

<style>
.pin-project-swipe .project-meta-window{min-width:0;overflow:hidden;pointer-events:none}
.pin-project-swipe .project-meta{width:100%;min-width:0;transform:translateX(calc(var(--swipe-progress,0) * -100%));pointer-events:auto}
.pin-project-swipe .pin-swipe-actions{left:112px;right:0;width:auto;max-width:none}
.pin-project-swipe-disabled .project-meta-window{display:contents}
</style>
<style>
/* Keep the sliding cover as tall as the entire action area. */
.pin-project-swipe{isolation:isolate;z-index:0}
.pin-project-swipe .project-meta-window{align-self:stretch;margin:-10px -10px -10px 0;display:flex}
.pin-project-swipe .project-meta{min-height:108px;padding:10px;box-sizing:border-box}
</style>
