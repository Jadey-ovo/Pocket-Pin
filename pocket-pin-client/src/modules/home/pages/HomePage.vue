<script setup lang="ts">
import { showConfirmDialog,showToast } from '@/shared/feedback'
import { t } from '@/shared/i18n'
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Icon as VanIcon, Popup as VanPopup, Field as VanField, List as VanList} from 'vant'
import ExportPanel from '../HomeExport.vue'
import ProjectSwipe from '../ProjectSwipe.vue'
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
const swipedId=ref<string|null>(null)
const view=ref<'cards'|'list'>('cards'),filterOpen=ref(false)
const filterOptions=computed(()=>[{id:'all',text:`全部 (${store.projects.length})`},{id:'done',text:`已拼 (${store.projects.filter(p=>p.complete).length})`},{id:'open',text:`待拼 (${store.projects.filter(p=>!p.complete).length})`}])
watch(view,()=>swipedId.value=null)
const query=ref(''),filter=ref<'all'|'open'|'done'>('all'),actionMenuId=ref<string|null>(null)
const visible=computed(()=>store.projects.filter(project=>project.name.toLowerCase().includes(query.value.toLowerCase())&&(filter.value==='all'||(filter.value==='done')===project.complete)))
const pageSize=24,shown=ref(pageSize),loading=ref(false)
const loadedProjects=computed(()=>visible.value.slice(0,shown.value))
const finished=computed(()=>shown.value>=visible.value.length)
async function loadMore(){shown.value+=pageSize;await nextTick();loading.value=false}
watch([query,filter],()=>{shown.value=pageSize;swipedId.value=null})
const projectStats=computed(()=>new Map(store.projects.filter(p=>loadedProjects.value.includes(p)||p.id===actionMenuId.value).map(p=>{const beads=p.cells.filter((c):c is string=>Boolean(c));return [p.id,{count:beads.length,colors:new Set(beads).size}]})))
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

      <div class="search-row"><div class="search-box"><van-icon name="search"/><input v-model="query" :placeholder="t('搜索图纸名称')"></div></div>
      <van-popup v-model:show="filterOpen" position="bottom" teleport="body" round class="pin-library-filter-sheet"><div class="pin-sheet-handle"/><h3>{{t('筛选图纸')}}</h3><button v-for="option in filterOptions" :key="option.id" :aria-pressed="filter===option.id" :class="{chosen:filter===option.id}" @click="filter=option.id as typeof filter;filterOpen=false"><span>{{t(option.text)}}</span></button></van-popup>
      <div class="pin-library-toolbar"><div class="pin-view-tabs" role="tablist" :aria-label="t('图纸视图')"><i :class="{'is-list':view==='list'}" aria-hidden="true"/><button role="tab" :aria-selected="view==='cards'" :aria-label="t('卡片视图')" @click="view='cards'"><van-icon name="apps-o"/></button><button role="tab" :aria-selected="view==='list'" :aria-label="t('列表视图')" @click="view='list'"><van-icon name="bars"/></button></div><button class="pin-library-filter" :class="{active:filter!=='all'}" :aria-label="t('筛选图纸')" :aria-expanded="filterOpen" @click="filterOpen=true"><van-icon name="filter-o"/></button></div>
      <van-list v-if="visible.length" v-model:loading="loading" :finished="finished" :offset="240" @load="loadMore"><div class="project-list" :class="view==='cards'?'project-grid':'pin-library-list'">
        <project-swipe v-for="project in loadedProjects" :key="project.id" :enabled="view==='list'" :open="swipedId===project.id" @update:open="swipedId=$event?project.id:null"><template #actions><button :aria-label="t('编辑')" @click.stop="swipedId=null;router.push(`/studio/${project.id}`)"><tool-glyph name="pencil"/><span>{{t('编辑')}}</span></button><button :aria-label="t('复制图纸')" @click.stop="swipedId=null;duplicate(project.id,project.name)"><tool-glyph name="copy"/><span>{{t('复制图纸')}}</span></button><button :aria-label="t('导出')" @click.stop="swipedId=null;actionMenuId=project.id;exporting=true"><tool-glyph name="download"/><span>{{t('导出')}}</span></button><button class="danger" :aria-label="t('删除')" @click.stop="swipedId=null;remove(project.id,project.name)"><van-icon name="delete-o"/><span>{{t('删除')}}</span></button></template><article class="project-list-card" role="button" tabindex="0" @click="actionMenuId=project.id" @keydown.enter="actionMenuId=project.id" @keydown.space.prevent="actionMenuId=project.id">
          <div class="project-preview"><pattern-thumbnail :project="project"/><span v-if="project.complete" class="pin-card-done" :aria-label="t('已拼')" :title="t('已拼')"><svg class="pin-done-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg></span></div>
          <div class="project-meta-window"><div class="project-meta"><strong>{{project.name}}</strong><div class="pin-card-stats" :aria-label="t(`尺寸 ${project.width} × ${project.height} 格，${projectStats.get(project.id)?.colors} 色，消耗 ${projectStats.get(project.id)?.count} 颗`)"><span>{{project.width}} × {{project.height}}</span><span>{{t(`${projectStats.get(project.id)?.colors||0} 色`)}}</span><span>{{t(`${projectStats.get(project.id)?.count||0} 颗`)}}</span></div></div></div>

        </article></project-swipe>
      </div></van-list>
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
            <div class="pin-sheet-pattern"><pattern-thumbnail :project="actionProject"/></div><div class="pin-sheet-stats" :aria-label="t('图纸信息')"><span>{{actionProject.width}} × {{actionProject.height}} {{t('格')}}</span><span>{{t(`${projectStats.get(actionProject.id)?.colors||0} 色`)}}</span><span>{{t(`${projectStats.get(actionProject.id)?.count||0} 颗`)}}</span></div>
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
