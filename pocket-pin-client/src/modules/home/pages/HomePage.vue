<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon as VanIcon, Popup as VanPopup, showConfirmDialog, showToast } from 'vant'
import AppShell from '@/shared/AppShell.vue'
import { useProjectStore } from '@/modules/projects/projectStore'
import { colorByCode, type BeadProject } from '@/core/project'

const router=useRouter(),store=useProjectStore(),fileInput=ref<HTMLInputElement|null>(null)
const query=ref(''),filter=ref<'all'|'open'|'done'>('all'),actionMenuId=ref<string|null>(null)
const visible=computed(()=>store.projects.filter(project=>project.name.toLowerCase().includes(query.value.toLowerCase())&&(filter.value==='all'||(filter.value==='done')===project.complete)))
const actionProject=computed(()=>store.projects.find(project=>project.id===actionMenuId.value)??null)
const projectSheetOpen=computed({get:()=>Boolean(actionMenuId.value),set:(show:boolean)=>{if(!show)actionMenuId.value=null}})
const previewProject=ref<BeadProject|null>(null),previewCanvas=ref<HTMLCanvasElement|null>(null)

function newProject(){const project=store.create();router.push(`/studio/${project.id}`)}
function choosePhoto(){fileInput.value?.click()}
function importPhoto(event:Event){const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;if(!/^image\/(png|jpeg|webp)$/.test(file.type))return showToast('请选择 PNG、JPG 或 WebP 图片');const project=store.create(file.name.replace(/\.[^.]+$/,'')||'我的图纸');sessionStorage.setItem(`pocket-pin:import:${project.id}`,URL.createObjectURL(file));input.value='';router.push(`/studio/${project.id}?import=1`)}
async function remove(id:string,name:string){try{await showConfirmDialog({title:`删除「${name}」？`,message:'删除后无法恢复，图纸与用量数据都会被移除。',confirmButtonText:'确认删除'});store.remove(id)}catch{}actionMenuId.value=null}
async function duplicate(id:string,name:string){try{await showConfirmDialog({title:`复制「${name}」？`,message:'将创建一份包含全部图层和编辑数据的副本。',confirmButtonText:'确认复制'});store.duplicate(id)}catch{}actionMenuId.value=null}
function toggleComplete(id:string){const project=store.projects.find(item=>item.id===id);if(project)store.update({...project,complete:!project.complete});actionMenuId.value=null}
function renameProject(project:BeadProject){const name=window.prompt('重命名图纸',project.name)?.trim();if(name)store.update({...project,name});actionMenuId.value=null}
async function showPreview(project:BeadProject){previewProject.value=project;await nextTick();const canvas=previewCanvas.value;if(!canvas)return;const size=Math.max(2,Math.floor(560/Math.max(project.width,project.height))),dpr=devicePixelRatio||1;canvas.width=project.width*size*dpr;canvas.height=project.height*size*dpr;canvas.style.aspectRatio=`${project.width}/${project.height}`;const ctx=canvas.getContext('2d')!;ctx.scale(dpr,dpr);ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,project.width*size,project.height*size);project.cells.forEach((code,index)=>{if(!code)return;ctx.fillStyle=colorByCode(code)?.hex??'#fff';ctx.fillRect(index%project.width*size,Math.floor(index/project.width)*size,size,size)})}
</script>

<template>
  <app-shell active="home">
    <main class="home-page projects-page page-content home-workspace">
      <section class="creation-grid" aria-label="开始创作">
        <button class="action-card photo-card" @click="choosePhoto"><span class="action-icon"><van-icon name="photograph"/></span><strong>导入照片</strong><small>自动生成拼豆图纸</small></button>
        <button class="action-card blank-card" @click="newProject"><span class="action-icon"><van-icon name="edit"/></span><strong>创作图纸</strong><small>从 52 × 52 空白画布开始</small></button>
        <input ref="fileInput" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" @change="importPhoto">
      </section>

      <section class="page-heading workspace-heading"><span class="eyebrow">你的口袋收藏</span><h1>图纸空间</h1><p>继续创作，或为已完成的作品做个标记。</p></section>
      <div class="search-row"><div class="search-box"><van-icon name="search"/><input v-model="query" placeholder="搜索图纸名称"></div></div>
      <div class="filter-pills"><button v-for="item in [{k:'all',v:'全部'},{k:'open',v:'未拼完'},{k:'done',v:'已拼完'}]" :key="item.k" :class="{active:filter===item.k}" @click="filter=item.k as typeof filter">{{item.v}}</button></div>
      <div v-if="visible.length" class="project-list">
        <article v-for="project in visible" :key="project.id" class="project-list-card" role="button" tabindex="0" @click="showPreview(project)" @keydown.enter="showPreview(project)">
          <div class="project-preview"><van-icon name="apps-o"/><span>{{project.width}} × {{project.height}}</span></div>
          <div class="project-meta"><strong>{{project.name}}</strong><span>{{project.cells.filter(Boolean).length}} 颗拼豆</span></div>
          <div class="project-actions"><button aria-label="更多操作" @click.stop="actionMenuId=project.id"><van-icon name="ellipsis"/></button></div>
        </article>
      </div>
      <div v-else class="empty-state"><van-icon name="flower-o"/><strong>没有找到图纸</strong><span>换个关键词或开始一张新作品吧。</span></div>
      <van-popup v-model:show="projectSheetOpen" position="bottom" teleport="body" :lock-scroll="false" class="more-sheet share-sheet"><div v-if="actionProject" class="sheet-content"><div class="sheet-handle"></div><h3>{{actionProject.name}}</h3><div class="share-sheet-actions"><button @click="router.push(`/studio/${actionProject.id}`);projectSheetOpen=false">编辑</button><button @click="renameProject(actionProject)">重命名</button><button @click="duplicate(actionProject.id,actionProject.name)">复制</button><button @click="toggleComplete(actionProject.id)">{{actionProject.complete?'标为未拼完':'标为已拼完'}}</button><button class="danger" @click="remove(actionProject.id,actionProject.name)">删除</button></div></div></van-popup>
      <van-popup :show="Boolean(previewProject)" round teleport="body" :lock-scroll="false" class="preview-popup" @click-overlay="previewProject=null"><div v-if="previewProject" class="preview-content"><div><h3>{{previewProject.name}}</h3><button aria-label="关闭预览" @click="previewProject=null"><van-icon name="cross"/></button></div><canvas ref="previewCanvas"></canvas><button @click="router.push(`/studio/${previewProject.id}`)">进入编辑</button></div></van-popup>
    </main>
  </app-shell>
</template>
