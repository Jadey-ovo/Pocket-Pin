<script setup lang="ts">
import { t } from '@/shared/i18n'
import { computed, ref, watch } from 'vue'
import { Button as VanButton, Icon as VanIcon } from 'vant'
import { vDragScroll } from './dragScroll'
import ToolGlyph from './ToolGlyph.vue'
import { palette } from '@/core/project'
const props=defineProps<{color:string;canPick:boolean;canErase?:boolean;erasing?:boolean; recommended?: typeof palette; defaultRecommended?:boolean}>()
const emit=defineEmits<{choose:[code:string];pick:[];erase:[]}>()
const dock=ref<HTMLElement|null>(null),sheetBottom=ref(132)
function open(){sheetBottom.value=window.innerHeight-(dock.value?.getBoundingClientRect().top||0);expanded.value=true}
const family=ref(props.defaultRecommended?'推荐':props.color.match(/^[A-Za-z]+/)?.[0]||'全部'),expanded=ref(false)
const ordered=[...palette].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
const families=computed(()=>[...(props.recommended?['推荐']:[]),'全部',...new Set(ordered.map(c=>c.code.match(/^[A-Za-z]+/)?.[0]||''))])
const colors=computed(()=>family.value==='推荐'?props.recommended||[]:ordered.filter(c=>family.value==='全部'||c.code.match(/^[A-Za-z]+/)?.[0]===family.value))
watch(()=>props.color,code=>{if(!expanded.value&&family.value!=='推荐')family.value=code.match(/^[A-Za-z]+/)?.[0]||'全部'})
let startY=0,startX=0
function swipe(e:PointerEvent){if(startY-e.clientY>24&&Math.abs(e.clientX-startX)<24)open()}
</script>
<template>
<div ref="dock" class="pin-palette-dock" @pointerdown="startY=$event.clientY;startX=$event.clientX" @pointerup="swipe">
  <van-button v-if="canPick" class="pin-icon-button pin-pick-inline" :aria-label="t('从豆板取色')" @click="expanded=false;emit('pick')"><tool-glyph name="eyedropper"/></van-button>
  <van-button v-if="canErase" class="pin-icon-button pin-erase-inline" :class="{chosen:erasing}" :aria-label="t('橡皮')" :aria-pressed="erasing" @click="expanded=false;emit('erase')"><tool-glyph name="eraser"/></van-button>
  <van-button class="pin-family-trigger" :aria-label="t('选择色系或展开色板')"  :aria-expanded="expanded" @click="expanded?expanded=false:open()">{{ t(family) }}<van-icon :name="expanded?'arrow-down':'arrow-up'"/></van-button>
  <div v-drag-scroll class="pin-palette-strip"><van-button v-for="c in colors" :key="c.code" :aria-label="`选择 ${c.code}`" :aria-pressed="color===c.code" :class="{chosen:color===c.code}" @click="emit('choose',c.code)"><i :style="{'--bead-color':c.hex}"></i><small>{{ t(c.code) }}</small></van-button></div>
</div>
<Transition name="pin-mode"><div v-if="expanded" class="pin-palette-backdrop" :style="{bottom:`${sheetBottom}px`}" @click.self="expanded=false">
  <section class="pin-palette-sheet" role="dialog" :aria-label="t('选择拼豆颜色')">
    <div class="pin-sheet-handle"></div>
    <div v-drag-scroll class="pin-family-list"><van-button v-for="f in families" :key="f" :class="{chosen:family===f}" @click="family=f">{{ t(f) }}</van-button></div>
    <div class="pin-swatches"><van-button v-for="c in colors" :key="c.code" :aria-label="`选择 ${c.code}`" :aria-pressed="color===c.code" :class="{chosen:color===c.code}" @click="emit('choose',c.code)"><i :style="{'--bead-color':c.hex}"></i><b>{{ t(c.code) }}</b></van-button></div>

  </section>
</div></Transition>
</template>
