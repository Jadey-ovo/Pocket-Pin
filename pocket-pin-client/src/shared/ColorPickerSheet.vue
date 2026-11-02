<script setup lang="ts">
import {computed,ref,watch,nextTick} from 'vue'
import {Button as VanButton} from 'vant'
import {palette} from '@/core/project'
import {t} from './i18n'
import BeadColorChip from './BeadColorChip.vue'
import {vDragScroll} from '@/modules/studio/dragScroll'
const props=withDefaults(defineProps<{show:boolean;color?:string;family?:string;recommended?:typeof palette;bottom?:number;teleport?:boolean}>(),{color:'',family:'全部',bottom:0,teleport:false})
const emit=defineEmits<{'update:show':[boolean];'update:family':[string];choose:[string]}>()
const family=ref(props.family),query=ref(''),ordered=[...palette].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
const families=computed(()=>[...(props.recommended?['推荐']:[]),'全部',...new Set(ordered.map(c=>c.code.match(/^[A-Za-z]+/)?.[0]||''))])
const colors=computed(()=>(family.value==='推荐'?props.recommended??[]:ordered.filter(c=>family.value==='全部'||c.code.startsWith(family.value))).filter(c=>c.code.toLowerCase().includes(query.value.toLowerCase())))
watch(()=>props.family,value=>family.value=value)
const searchInput=ref<HTMLInputElement>()
watch(()=>props.show,async value=>{if(value){query.value='';await nextTick();searchInput.value?.focus()}})
function choose(code:string){emit('choose',code);emit('update:show',false)}
function setFamily(value:string){family.value=value;emit('update:family',value)}
</script>
<template>
 <Teleport to="body" :disabled="!teleport"><Transition name="pin-mode"><div v-if="show" class="pin-palette-backdrop shared-color-backdrop" :style="{bottom:`${bottom}px`,zIndex:teleport?3200:50}" @click.self="emit('update:show',false)" @keydown.esc.stop="emit('update:show',false)">
 <section class="pin-palette-sheet shared-color-sheet" role="dialog" aria-modal="true" :aria-label="t('选择拼豆颜色')"><div class="pin-sheet-handle"/><header><strong>{{t('选择拼豆颜色')}}</strong><button aria-label="关闭色号选择" @click="emit('update:show',false)">×</button></header>
 <input ref="searchInput" v-model="query" aria-label="搜索色号" :placeholder="t('输入色号，如 A1')"/>
 <div v-drag-scroll class="pin-family-list"><van-button v-for="f in families" :key="f" :class="{chosen:family===f}" @click="setFamily(f)">{{t(f)}}</van-button></div>
 <div class="pin-swatches"><van-button v-for="c in colors" :key="c.code" :aria-label="`选择 ${c.code}`" :aria-pressed="color===c.code" :class="{chosen:color===c.code}" @click="choose(c.code)"><bead-color-chip :code="c.code"/></van-button></div>
 </section></div></Transition></Teleport>
</template>
<style scoped>
.shared-color-backdrop{position:fixed;inset:0;display:flex;align-items:flex-end;background:#30261d55}.shared-color-sheet{box-sizing:border-box;width:100%;max-height:min(65dvh,580px);padding:12px 18px max(16px,env(safe-area-inset-bottom));background:var(--animal-paper,#fffaf0);border-radius:26px 26px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 30px #0002;color:var(--animal-text,#574437)}header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}header button{background:transparent;border:0;font-size:24px;cursor:pointer;width:40px;height:40px;color:inherit}.shared-color-sheet>input{font:inherit;font-size:14px;padding:12px;border:1px solid var(--animal-border,#dfcfb4);border-radius:12px;background:var(--animal-bg,#f5edda);color:inherit;margin-bottom:8px}.pin-family-list{display:flex;gap:8px;overflow:auto;flex-shrink:0;padding:4px 0 12px}.pin-family-list .van-button{flex-shrink:0;min-height:36px}.pin-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px;overflow:auto;min-height:0;padding:5px}.pin-swatches .van-button{height:auto;min-height:56px;border:0;background:transparent;padding:6px}.pin-swatches .chosen{outline:2px solid var(--animal-primary,#58aa98);outline-offset:-2px;border-radius:12px}
</style>
