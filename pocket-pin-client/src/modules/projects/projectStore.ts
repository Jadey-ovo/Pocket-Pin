import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { makeProject, normalizeProject, type BeadProject } from '@/core/project'
const indexKey = 'pocket-pin:projects:v2', key = (id: string) => `pocket-pin:project:${id}`
function loadProjects(): BeadProject[] {
  let records: unknown[] = []
  try {
    const index = localStorage.getItem(indexKey)
    if (index) { const ids = JSON.parse(index); if (Array.isArray(ids)) records = ids.map(id => { try { return JSON.parse(localStorage.getItem(key(id)) || 'null') } catch { return null } }) }
    else { const old = JSON.parse(localStorage.getItem('pocket-pin:projects:v1') || '[]'); if (Array.isArray(old)) records = old }
  } catch { /* Storage unavailable: a new local session can still be used. */ }
  return records.map(record => { try { return normalizeProject(record) } catch { return null } }).filter((p): p is BeadProject => Boolean(p)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
export const useProjectStore = defineStore('projects', () => {
  const projects = ref<BeadProject[]>(loadProjects()), currentId = ref<string | null>(null), saveState = ref<'saved' | 'pending' | 'error'>('saved')
  const current = computed(() => projects.value.find(p => p.id === currentId.value) ?? null)
  const drafts = new Set<string>()
  function discardEmptyDraft(id:string){const p=projects.value.find(p=>p.id===id);if(drafts.has(id)&&p&&!p.cells.some(Boolean)){remove(id);drafts.delete(id)}}
  const dirty = new Set(projects.value.map(p => p.id)); let timer: ReturnType<typeof setTimeout> | undefined
  function flush() {
    clearTimeout(timer)
    if (!dirty.size && saveState.value === 'saved') return true
    try {
      for (const id of dirty) { const p = projects.value.find(p => p.id === id); if (p && !drafts.has(id)) localStorage.setItem(key(id), JSON.stringify(p)) }
      localStorage.setItem(indexKey, JSON.stringify(projects.value.filter(p=>!drafts.has(p.id)).map(p => p.id)))
      dirty.clear(); saveState.value = 'saved'; return true
    } catch { saveState.value = 'error'; return false }
  }
  function schedule(id?: string) { if (id) dirty.add(id); saveState.value = 'pending'; clearTimeout(timer); timer = setTimeout(flush, 400) }
  function create(name?: string, width = 52, height = 52) { const p = makeProject(name, width, height); drafts.add(p.id); projects.value.unshift(p); currentId.value = p.id; schedule(p.id); return p }
  function open(id: string) { currentId.value = id }
  function update(p: BeadProject) { if(p.cells.some(Boolean))drafts.delete(p.id); const index = projects.value.findIndex(item => item.id === p.id); if (index < 0) return; projects.value.splice(index, 1); projects.value.unshift({ ...p, updatedAt: new Date().toISOString() }); schedule(p.id) }
  function duplicate(id: string) { const source = projects.value.find(p => p.id === id); if (!source) return; const now = new Date().toISOString(), p = normalizeProject(JSON.parse(JSON.stringify(source)))!; p.id = crypto.randomUUID(); p.name += ' 副本'; p.createdAt = p.updatedAt = now; projects.value.unshift(p); schedule(p.id); return p }
  function remove(id: string) { projects.value = projects.value.filter(p => p.id !== id); dirty.delete(id); schedule(); if (flush()) { try { localStorage.removeItem(key(id)) } catch {} } }
  function importProject(raw: unknown) { const p = normalizeProject(raw); if (!p) throw new Error('图纸尺寸或格子数据无效'); p.id = crypto.randomUUID(); projects.value.unshift(p); currentId.value = p.id; schedule(p.id); return p }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush() })
  return { projects, currentId, current, saveState, discardEmptyDraft, create, open, update, duplicate, remove, flush, importProject }
})
