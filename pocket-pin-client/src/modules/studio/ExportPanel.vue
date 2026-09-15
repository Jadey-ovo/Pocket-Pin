<script setup lang="ts">
import { showToast } from '@/shared/feedback'
import { t } from '@/shared/i18n'
import { ref, computed, watch, onUnmounted } from 'vue'
import { Button as VanButton, Icon as VanIcon, Field as VanField, Slider as VanSlider, Switch as VanSwitch} from 'vant'
import type { BeadProject } from '@/core/project'
import { previewExport, exportProject, downloadJson } from './engine/export'
const props=defineProps<{project:BeadProject}>()
const watermark=ref(false),watermarkText=ref('Pocket Pin'),opacity=ref(.18),author=ref(''),preview=ref(''),fullPreview=ref(false),working=ref(false),rendering=ref(false),error=ref('')
const options=computed(()=>({showColorCodes:true,showGuideLines:true,projectName:props.project.name,authorName:author.value,exportBounds:'pattern' as const,watermark:{enabled:watermark.value,text:watermarkText.value,opacity:opacity.value}}))
let timer:ReturnType<typeof setTimeout>|undefined,version=0
watch([options,()=>props.project],()=>{clearTimeout(timer);const id=++version;rendering.value=true;timer=setTimeout(async()=>{try{await document.fonts?.ready;if(id!==version)return;const full=previewExport(props.project,options.value),canvas=document.createElement('canvas'),ratio=Math.min(1,1500/Math.max(full.width,full.height));canvas.width=Math.round(full.width*ratio);canvas.height=Math.round(full.height*ratio);canvas.getContext('2d')!.drawImage(full,0,0,canvas.width,canvas.height);full.width=full.height=1;const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(id!==version||!blob)return;if(preview.value)URL.revokeObjectURL(preview.value);preview.value=URL.createObjectURL(blob);error.value=''}catch{if(id===version)error.value='预览生成失败，请重试'}finally{if(id===version)rendering.value=false}},220)},{immediate:true,deep:true})
async function save(format:'png'|'jpg'|'pdf'|'xlsx'|'json'){working.value=true;try{await document.fonts?.ready;if(format==='json')downloadJson(props.project);else await exportProject(props.project,format,author.value,options.value);showToast('已生成导出文件')}catch{showToast('导出失败，请重试')}finally{working.value=false}}
onUnmounted(()=>{version++;clearTimeout(timer);if(preview.value)URL.revokeObjectURL(preview.value)})
</script>
<template>
<div class="pin-export-panel">
  <div class="pin-export-formats"><van-button v-for="f in [{id:'png',icon:'photo-o',name:'PNG 图片'},{id:'jpg',icon:'photo-o',name:'JPG 图片'},{id:'pdf',icon:'description',name:'PDF 图纸'},{id:'xlsx',icon:'orders-o',name:'用量清单'},{id:'json',icon:'edit',name:'编辑备份'}]" :key="f.id" :disabled="working" @click="save(f.id as 'png'|'jpg'|'pdf'|'xlsx'|'json')"><van-icon :name="f.icon"/><span>{{ t(f.name) }}</span></van-button></div>
  <van-field v-model="author" :label="t('作者')" :placeholder="t('选填')" maxlength="40"/>
  <div class="pin-setting"><span>{{ t('平铺水印 · 45°') }}</span><van-switch v-model="watermark" size="22px" :aria-label="t('启用水印')"/></div>
  <template v-if="watermark"><van-field v-model="watermarkText" :label="t('水印文本')" :placeholder="t('输入你的名字或标记')" maxlength="48"/><label class="pin-range">{{ t('水印透明度 ') }}{{ t(Math.round(opacity*100)) }}%<van-slider v-model="opacity" :min="0" :max="1" :step=".01" :aria-label="t('水印透明度')"/></label></template>
  <p v-if="error" role="alert">{{ t(error) }}</p><p v-else-if="rendering">{{ t('正在更新预览…') }}</p>
  <van-button v-if="preview" class="pin-export-preview" :aria-label="t('放大导出图预览')" @click="fullPreview=true"><img :src="preview" alt="导出图预览，包含网格、用量清单和水印"/><span>{{ t('点击放大预览') }}</span></van-button>
  <Teleport to="body"><div v-if="fullPreview" class="pin-export-lightbox" role="dialog" :aria-label="t('导出图预览')" @click.self="fullPreview=false"><van-button class="pin-preview-close" :aria-label="t('关闭导出预览')" @click="fullPreview=false"><van-icon name="cross"/></van-button><img :src="preview" alt="完整导出图预览"/></div></Teleport>
</div>
</template>
