<script setup lang="ts">
import { showConfirmDialog,showToast } from '@/shared/feedback'
import { t } from '@/shared/i18n'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon as VanIcon, Popup as VanPopup, Field as VanField} from 'vant'
import ExportPanel from '../HomeExport.vue'
import '@/modules/studio/studio.css'
import { readSource, saveSource, deleteSource } from '@/modules/studio/sourceImage'
import PatternThumbnail from '@/shared/PatternThumbnail.vue'
import ToolGlyph from '@/modules/studio/ToolGlyph.vue'
import AppShell from '@/shared/AppShell.vue'
import { useProjectStore } from '@/modules/projects/projectStore'
import { type BeadProject } from '@/core/project'

const router=useRouter(),store=useProjectStore(),fileInput=ref<HTMLInputElement|null>(null)
const exporting=ref(false)
const renaming=ref(false),renameDraft=ref('')
const query=ref(''),filter=ref<'all'|'open'|'done'>('all'),actionMenuId=ref<string|null>(null)
const visible=computed(()=>store.projects.filter(project=>project.name.toLowerCase().includes(query.value.toLowerCase())&&(filter.value==='all'||(filter.value==='done')===project.complete)))
const closingProject=ref<BeadProject|null>(null)
watch(actionMenuId,id=>{if(id)closingProject.value=store.projects.find(p=>p.id===id)||null},{flush:'sync'})
const actionProject=computed(()=>store.projects.find(project=>project.id===actionMenuId.value)??closingProject.value)
const projectSheetOpen=computed({get:()=>Boolean(actionMenuId.value),set:(show:boolean)=>{if(!show){actionMenuId.value=null;renaming.value=false;exporting.value=false}}})

function newProject(){const project=store.create();router.push(`/studio/${project.id}`)}
function choosePhoto(){fileInput.value?.click()}
function importPhoto(event:Event){const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type))return showToast('请选择 PNG、JPG 或 WebP 图片');const project=store.create(file.name.replace(/\.[^.]+$/,'')||'我的图纸');sessionStorage.setItem(`pocket-pin:import:${project.id}`,URL.createObjectURL(file));input.value='';router.push(`/studio/${project.id}?import=1`)}
async function remove(id:string,name:string){try{await showConfirmDialog({title:`删除「${name}」？`,message:'删除后无法恢复。',confirmButtonText:'确认删除'});store.remove(id);try{await deleteSource(id)}catch{}}catch{}actionMenuId.value=null}
async function duplicate(id:string,name:string){try{await showConfirmDialog({title:`复制「${name}」？`,message:'保留原图，创建副本。',confirmButtonText:'确认复制'});const copy=store.duplicate(id);if(copy){try{const source=await readSource(id);if(source)await saveSource(copy.id,source)}catch{}showToast('图纸副本已创建')}}catch{}actionMenuId.value=null}
function setComplete(complete:boolean){if(actionProject.value&&actionProject.value.complete!==complete){store.update({...actionProject.value,complete});showToast(complete?'已标记为已拼':'已标记为待拼')}}
function renameProject(project:BeadProject){renameDraft.value=project.name;renaming.value=true}
function saveName(){if(actionProject.value&&renameDraft.value.trim()){store.update({...actionProject.value,name:renameDraft.value.trim()});renaming.value=false;showToast('名称已保存')}}
</script>

<template>
  <app-shell active="home">
    <main class="home-page projects-page page-content home-workspace">
      <section class="creation-grid" :aria-label="t('开始创作')">
        <button class="action-card photo-card" @click="choosePhoto"><span class="action-icon"><van-icon name="photograph"/></span><strong>{{ t('导入照片') }}</strong></button>
        <button class="action-card blank-card" @click="newProject"><span class="action-icon"><van-icon name="edit"/></span><strong>{{ t('创作图纸') }}</strong></button>
        <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="importPhoto">
      </section>

      <section class="page-heading workspace-heading"><h1>{{ t('图纸空间') }}</h1></section>
      <div class="search-row"><div class="search-box"><van-icon name="search"/><input v-model="query" :placeholder="t('搜索图纸名称')"></div></div>
      <div class="filter-pills"><button v-for="item in [{k:'all',v:'全部'},{k:'open',v:'待拼'},{k:'done',v:'已拼'}]" :key="item.k" :class="{active:filter===item.k}" @click="filter=item.k as typeof filter">{{ t(item.v) }}</button></div>
      <div v-if="visible.length" class="project-list project-grid">
        <article v-for="project in visible" :key="project.id" class="project-list-card" role="button" tabindex="0" @click="actionMenuId=project.id" @keydown.enter="actionMenuId=project.id" @keydown.space.prevent="actionMenuId=project.id">
          <div class="project-preview"><pattern-thumbnail :project="project"/></div>
          <div class="project-meta"><strong>{{project.name}}</strong><span class="pin-bead-count" :aria-label="t(`${project.cells.filter(Boolean).length} 颗拼豆`)"><i class="brand-pin" aria-hidden="true"></i>{{ project.cells.filter(Boolean).length }}</span></div>

        </article>
      </div>
      <div v-else class="empty-state"><van-icon name="flower-o"/><strong>{{ t('没有找到图纸') }}</strong><span>{{ t('换个关键词或开始一张新作品吧。') }}</span></div>
      <van-popup v-model:show="projectSheetOpen" @closed="closingProject=null" position="bottom" transition="pin-sheet-slide" teleport="body" :lock-scroll="true" class="more-sheet share-sheet pin-project-sheet" :class="{'is-exporting':exporting}">
        <div v-if="actionProject" class="sheet-content">
          <div class="sheet-handle"></div>
          <div class="pin-project-sheet-heading">
            <button v-if="exporting" class="pin-sheet-back" :aria-label="t('返回')" @click="exporting=false"><van-icon name="arrow-left"/></button>
            <h3><span v-if="exporting">{{ t('导出') }}</span><button v-else class="pin-sheet-name" :aria-label="t('重命名作品')" @click="renameProject(actionProject)">{{actionProject.name}}</button></h3>
            <div v-if="!exporting" class="pin-completion-tabs" role="group" :aria-label="t('拼豆进度')"><i :class="{done:actionProject.complete}"/><button :aria-pressed="!actionProject.complete" @click="setComplete(false)">{{ t('待拼') }}</button><button :aria-pressed="actionProject.complete" @click="setComplete(true)">{{ t('已拼') }}</button></div>
          </div>

          <Transition name="pin-export-page" mode="out-in"><div v-if="exporting" key="export" class="pin-home-export"><export-panel :project="actionProject"/></div>
          <div v-else key="preview" class="pin-project-preview-page">
            <div class="pin-sheet-pattern"><pattern-thumbnail :project="actionProject"/></div>
            <div class="share-sheet-actions pin-project-action-grid">
              <button @click="router.push(`/studio/${actionProject.id}`);projectSheetOpen=false"><tool-glyph name="pencil"/><span>{{ t('编辑') }}</span></button>
              <button @click="duplicate(actionProject.id,actionProject.name)"><tool-glyph name="copy"/><span>{{ t('复制图纸') }}</span></button>
              <button @click="exporting=true"><tool-glyph name="download"/><span>{{ t('导出') }}</span></button>
              <button class="danger" @click="remove(actionProject.id,actionProject.name)"><van-icon name="delete-o"/><span>{{ t('删除') }}</span></button>
            </div>
          </div></Transition>
        </div>
      </van-popup>
      <van-popup v-model:show="renaming" position="bottom" teleport="body" transition="pin-sheet-slide" class="pin-rename-popup">          <div class="pin-project-rename"><van-field v-model="renameDraft" maxlength="60" :label="t('作品名称')" @keydown.enter="saveName"/><div><button :aria-label="t('取消改名')" @click="renaming=false"><van-icon name="cross"/></button><span>{{ t('作品名称') }}</span><button :aria-label="t('保存名称')" :disabled="!renameDraft.trim()" @click="saveName"><van-icon name="success"/></button></div></div></van-popup>
    </main>
  </app-shell>
</template>
