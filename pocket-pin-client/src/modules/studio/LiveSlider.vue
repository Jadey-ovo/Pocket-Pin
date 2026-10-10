<script setup lang="ts">
import { ref } from 'vue'
import { Slider } from 'vant'
defineOptions({inheritAttrs:false})
const props=withDefaults(defineProps<{modelValue:number;min?:number;max?:number;step?:number;disabled?:boolean}>(),{min:0,max:100,step:1,disabled:false})
const emit=defineEmits<{ 'update:modelValue':[value:number];change:[value:number] }>()
const root=ref<HTMLElement>(),dragging=ref(false)
let pointer:number|null=null,start=0,current=0,suppressClick=false
function update(event:PointerEvent){const rect=root.value!.getBoundingClientRect();if(!rect.width)return;const raw=props.min+(event.clientX-rect.left)/rect.width*(props.max-props.min);current=Math.min(props.max,Math.max(props.min,Number((props.min+Math.round((raw-props.min)/props.step)*props.step).toFixed(8))));emit('update:modelValue',current)}
function down(event:PointerEvent){if(props.disabled||event.pointerType==='touch'||event.button!==0)return;event.preventDefault();event.stopPropagation();suppressClick=true;pointer=event.pointerId;start=props.modelValue;dragging.value=true;root.value!.setPointerCapture(pointer);update(event)}
function move(event:PointerEvent){if(event.pointerId!==pointer)return;event.preventDefault();update(event)}
function end(event:PointerEvent){if(event.pointerId!==pointer)return;if(event.type==='pointerup')update(event);pointer=null;dragging.value=false;if(current!==start)emit('change',current)}
function click(event:MouseEvent){if(suppressClick){suppressClick=false;event.preventDefault();event.stopPropagation()}}
</script>
<template><div ref="root" class="pin-live-slider" :class="{'is-dragging':dragging}" @pointerdown.capture="down" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @click.capture="click"><Slider v-bind="$attrs" :model-value="modelValue" :min="min" :max="max" :step="step" :disabled="disabled" @update:model-value="emit('update:modelValue',$event as number)" @change="emit('change',$event as number)"/></div></template>
<style>
.pin-live-slider{width:100%;padding:12px 0;touch-action:pan-y;user-select:none}
.pin-live-slider.is-dragging .van-slider__bar{transition:none!important}
</style>
