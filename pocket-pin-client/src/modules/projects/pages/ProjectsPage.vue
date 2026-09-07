<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon as VanIcon, showConfirmDialog } from 'vant'
import AppShell from '@/shared/AppShell.vue'
import { useProjectStore } from '../projectStore'
const store = useProjectStore(); const router = useRouter(); const query = ref(''); const filter = ref<'all' | 'open' | 'done'>('all'); const actionMenuId = ref<string|null>(null)
const visible = computed(() => store.projects.filter((project) => project.name.toLowerCase().includes(query.value.toLowerCase()) && (filter.value === 'all' || (filter.value === 'done') === project.complete)))
async function remove(id: string, name: string) { try { await showConfirmDialog({ title: `删除「${name}」？`, message: '删除后无法恢复，图纸与用量数据都会被移除。', confirmButtonText: '确认删除' }); store.remove(id) } catch {} }
async function duplicate(id:string,name:string){try{await showConfirmDialog({title:`复制「${name}」？`,message:'将创建一份包含全部图层和编辑数据的副本。',confirmButtonText:'确认复制'});store.duplicate(id)}catch{}actionMenuId.value=null}
function toggleComplete(id:string){const project=store.projects.find(item=>item.id===id);if(project)store.update({...project,complete:!project.complete});actionMenuId.value=null}
</script>
<template>
  <app-shell active="projects"><main class="projects-page page-content">
    <section class="page-heading"><span class="eyebrow">你的口袋收藏</span><h1>图纸空间</h1><p>继续创作，或为已完成的作品做个标记。</p></section>
    <div class="search-row"><div class="search-box"><van-icon name="search"/><input v-model="query" placeholder="搜索图纸名称"></div><button class="round-add" @click="router.push(`/studio/${store.create().id}`)"><van-icon name="plus"/></button></div>
    <div class="filter-pills"><button v-for="item in [{k:'all',v:'全部'},{k:'open',v:'未拼完'},{k:'done',v:'已拼完'}]" :key="item.k" :class="{ active: filter === item.k }" @click="filter = item.k as typeof filter">{{ item.v }}</button></div>
    <div v-if="visible.length" class="project-list">
      <article v-for="project in visible" :key="project.id" class="project-list-card">
        <button class="project-preview" @click="router.push(`/studio/${project.id}`)"><van-icon name="apps-o"/><span>{{ project.width }} × {{ project.height }}</span></button>
        <div class="project-meta"><strong>{{ project.name }}</strong><span>{{ project.cells.filter(Boolean).length }} 颗拼豆</span><em :class="{done:project.complete}">{{ project.complete ? '已拼完' : '未拼完' }}</em></div>
        <div class="project-actions"><button aria-label="更多操作" @click="actionMenuId=actionMenuId===project.id?null:project.id"><van-icon name="ellipsis"/></button><div v-if="actionMenuId===project.id" class="project-more-menu"><button @click="router.push(`/studio/${project.id}`)"><van-icon name="edit"/>编辑</button><button @click="duplicate(project.id,project.name)"><van-icon name="orders-o"/>复制</button><button class="danger" @click="remove(project.id, project.name);actionMenuId=null"><van-icon name="delete-o"/>删除</button><hr><button @click="toggleComplete(project.id)"><van-icon :name="project.complete?'revoke':'passed'"/>{{project.complete?'标记为未拼完':'标记为已拼完'}}</button></div></div>
      </article>
    </div><div v-else class="empty-state"><van-icon name="flower-o"/><strong>没有找到图纸</strong><span>换个关键词或开始一张新作品吧。</span></div>
  </main></app-shell>
</template>
