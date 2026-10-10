<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { t } from '@/shared/i18n'
import type { Crop } from './PhotoCrop.vue'
const props = defineProps<{ src: string; modelValue: Crop; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [Crop] }>()
const workspace = ref<HTMLElement>(), frame = ref<HTMLElement>(), side = ref(240), ratio = ref(1), bounds = ref({width: 320, height: 320}), interacting = ref(false)
const corners = [
  { id: 'nw', label: '左上角等比缩放', sx: -1, sy: -1 },
  { id: 'ne', label: '右上角等比缩放', sx: 1, sy: -1 },
  { id: 'sw', label: '左下角等比缩放', sx: -1, sy: 1 },
  { id: 'se', label: '右下角等比缩放', sx: 1, sy: 1 },
]
// Crop dimensions are normalized to the source image, not to the square canvas.
// A square source viewport therefore needs crop.height = crop.width * imageRatio.
const placement = computed(() => {
  const c = props.modelValue, height = c.width * ratio.value
  return { ...c, y: c.y + (c.height - height) / 2, height }
})
const imageStyle = computed(() => {
  const c = placement.value
  return { width: `${100 / c.width}%`, height: `${100 / c.height}%`, left: `${-c.x / c.width * 100}%`, top: `${-c.y / c.height * 100}%` }
})
function handleStyle(sx: number, sy: number) {
  const c = placement.value
  const clamp = (n: number, size: number) => {
    const margin = Math.max(0, (size - side.value) / 2 - 22) / side.value
    return Math.max(-margin, Math.min(1 + margin, n))
  }
  return { left: `${clamp(((sx < 0 ? 0 : 1) - c.x) / c.width, bounds.value.width) * 100}%`, top: `${clamp(((sy < 0 ? 0 : 1) - c.y) / c.height, bounds.value.height) * 100}%` }
}
let observer: ResizeObserver | undefined
let drag: { x: number; y: number; crop: Crop; size: number; id: number; sx: number; sy: number } | null = null
onMounted(() => {
  const resize = () => {
    if (workspace.value) {
      bounds.value = {width: workspace.value.clientWidth, height: workspace.value.clientHeight}
      // Leave space outside the crop frame to see the original photo edges.
      side.value = Math.max(1, Math.min(bounds.value.width - 88, bounds.value.height - 88, 460))
    }
  }
  resize()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(resize)
  if (workspace.value) observer.observe(workspace.value)
})
onUnmounted(() => observer?.disconnect())
watch(() => props.src, () => { drag = null; interacting.value = false })
watch(() => props.disabled, disabled => { if (disabled) { drag = null; interacting.value = false } })
function loaded(event: Event) {
  const img = event.target as HTMLImageElement
  ratio.value = img.naturalWidth / img.naturalHeight
  // Also repair a placement previously distorted by the old zoom control.
  const c = placement.value
  if (Math.abs(c.height - props.modelValue.height) > 1e-6) emit('update:modelValue', c)
}
function down(e: PointerEvent, sx = 0, sy = 0) {
  if (props.disabled || !frame.value || drag || e.button !== 0) return
  e.preventDefault(); e.stopPropagation()
  interacting.value = true
  drag = { x: e.clientX, y: e.clientY, crop: { ...placement.value }, size: frame.value.clientWidth, id: e.pointerId, sx, sy }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.id || props.disabled) return
  e.preventDefault()
  const { crop: c, size, sx, sy } = drag, dx = (e.clientX - drag.x) / size, dy = (e.clientY - drag.y) / size
  if (!sx) {
    emit('update:modelValue', { ...c, x: c.x - dx * c.width, y: c.y - dy * c.height })
    return
  }
  const w = 1 / c.width, h = 1 / c.height
  // Project pointer movement onto the diagonal. This stays proportional even
  // when the pointer moves horizontally or vertically rather than diagonally.
  const factor = Math.max(.15 / Math.max(w, h), Math.min(8 / Math.max(w, h), 1 + (dx * sx * w + dy * sy * h) / (w * w + h * h)))
  const width = c.width / factor, height = c.height / factor
  const anchorX = ((sx < 0 ? 1 : 0) - c.x) / c.width
  const anchorY = ((sy < 0 ? 1 : 0) - c.y) / c.height
  emit('update:modelValue', { x: (sx < 0 ? 1 : 0) - anchorX * width, y: (sy < 0 ? 1 : 0) - anchorY * height, width, height })
}
function end(e: PointerEvent) { if (drag?.id === e.pointerId) { drag = null; interacting.value = false } }
function keyScale(e: KeyboardEvent, sx: number, sy: number) {
  if (props.disabled || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
  e.preventDefault()
  const c = placement.value, factor = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1.05 : 1 / 1.05
  const zoom = Math.max(1 / c.width, 1 / c.height) * factor
  if (zoom < .15 || zoom > 8) return
  const width = c.width / factor, height = c.height / factor
  emit('update:modelValue', { x: (sx < 0 ? 1 : 0) - ((sx < 0 ? 1 : 0) - c.x) / factor, y: (sy < 0 ? 1 : 0) - ((sy < 0 ? 1 : 0) - c.y) / factor, width, height })
}
</script>
<template>
  <div class="pin-placement">
    <div ref="workspace" class="pin-placement-workspace" :class="{interacting}">
      <div ref="frame" class="pin-placement-frame" :style="{width: `${side}px`, height: `${side}px`}" :aria-label="t('拖动图片调整画布位置')" @pointerdown="down($event)" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
        <div class="pin-placement-viewport">
          <img :src="src" :style="imageStyle" draggable="false" :alt="t('待生成区域')" @load="loaded"/>
          <div class="pin-placement-image-outline" :style="imageStyle" aria-hidden="true"/>
          <div class="pin-placement-crop-outline" aria-hidden="true"><div v-if="interacting" class="pin-placement-grid"/><i v-for="corner in corners" :key="corner.id" :class="corner.id"/></div>
        </div>
        <button v-for="corner in corners" :key="corner.id" type="button" class="pin-placement-handle" :class="corner.id" :style="handleStyle(corner.sx, corner.sy)" :aria-label="t(corner.label)" :disabled="disabled" @pointerdown="down($event, corner.sx, corner.sy)" @keydown="keyScale($event, corner.sx, corner.sy)"><span/></button>
      </div>
    </div>
    <small>{{ t('框内生成图纸 · 拖动图片，拖动四角等比缩放') }}</small>
  </div>
</template>
<style>
.pin-placement{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 12px 12px}
.pin-placement-workspace{flex:1;min-height:0;width:100%;display:grid;place-items:center;overflow:hidden;isolation:isolate}
.pin-placement-frame{position:relative;flex:none;touch-action:none;cursor:grab;background:repeating-conic-gradient(#eee9df 0% 25%,#fffdf6 0% 50%) 0/16px 16px}
.pin-placement-frame:active{cursor:grabbing}
.pin-placement-viewport{position:absolute;inset:0;overflow:visible}
.pin-placement-viewport img{position:absolute;display:block;max-width:none!important;max-height:none!important;height:auto!important;object-fit:contain!important;pointer-events:none;user-select:none}
.pin-placement-image-outline{position:absolute;pointer-events:none;outline:1px solid #70594499}
.pin-placement-crop-outline{position:absolute;inset:0;pointer-events:none;border:1px solid #fff;box-shadow:0 0 0 1px #35261955}
.pin-placement-crop-outline>i{position:absolute;width:18px;height:18px;border:3px solid #fff;filter:drop-shadow(0 1px 1px #35261966)}
.pin-placement-crop-outline>.nw{left:-2px;top:-2px;border-right:0;border-bottom:0}
.pin-placement-crop-outline>.ne{right:-2px;top:-2px;border-left:0;border-bottom:0}
.pin-placement-crop-outline>.sw{left:-2px;bottom:-2px;border-right:0;border-top:0}
.pin-placement-crop-outline>.se{right:-2px;bottom:-2px;border-left:0;border-top:0}
.pin-placement-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 33%,#fff8 33%,#fff8 33.4%,transparent 33.4%,transparent 66.6%,#fff8 66.6%,#fff8 67%,transparent 67%),linear-gradient(transparent 33%,#fff8 33%,#fff8 33.4%,transparent 33.4%,transparent 66.6%,#fff8 66.6%,#fff8 67%,transparent 67%)}
.pin-placement-handle{position:absolute;z-index:2;display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;background:transparent;transform:translate(-50%,-50%);touch-action:none}
.pin-placement-handle span{width:13px;height:13px;border:2px solid var(--animal-primary);border-radius:3px;background:var(--animal-paper,#fffdf6);box-shadow:0 1px 4px #35261933;pointer-events:none}
.pin-placement-handle.nw,.pin-placement-handle.se{cursor:nwse-resize}
.pin-placement-handle.ne,.pin-placement-handle.sw{cursor:nesw-resize}
.pin-placement-handle:focus-visible{outline:2px solid var(--animal-primary);border-radius:8px}
.pin-placement-handle:disabled{pointer-events:none;opacity:.5}
.pin-placement small{flex:none;min-height:20px;margin-bottom:60px;padding:0 12px;font-size:12px;color:var(--animal-muted);text-align:center}
</style>
