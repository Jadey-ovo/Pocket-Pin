import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { makeProject, type BeadProject } from '@/core/project'

const storageKey = 'pocket-pin:projects:v1'

function ensureLayers(item:BeadProject):BeadProject{
  const length=item.width*item.height
  const validLayers=(item.layers??[]).filter(layer=>layer?.id&&Array.isArray(layer.cells)).map(layer=>({...layer,cells:layer.cells.length===length?[...layer.cells]:Array.from({length},(_,index)=>layer.cells[index]??null)}))
  if(validLayers.length){const activeId=validLayers.some(layer=>layer.id===item.activeLayerId)?item.activeLayerId:(validLayers.find(layer=>layer.type==='bead')?.id??validLayers[0].id);return{...item,layers:validLayers,activeLayerId:activeId}}
  const layerId=crypto.randomUUID(),cells=Array.from({length},(_,index)=>item.cells[index]??null)
  return{...item,cells,layers:[{id:layerId,name:'拼豆层 1',type:'bead',visible:true,locked:false,opacity:1,cells:[...cells]}],activeLayerId:layerId}
}

function loadProjects(): BeadProject[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]') as BeadProject[]
    return Array.isArray(value)?value.filter(item=>item?.id&&Array.isArray(item.cells)).map(ensureLayers):[]
  } catch { return [] }
}

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<BeadProject[]>(loadProjects())
  const currentId = ref<string | null>(null)
  const current = computed(() => projects.value.find((item) => item.id === currentId.value) ?? null)

  watch(projects, (value) => localStorage.setItem(storageKey, JSON.stringify(value)), { deep: true })

  function create(name?: string, width = 52, height = 52) {
    const project = ensureLayers(makeProject(name, width, height))
    projects.value.unshift(project)
    currentId.value = project.id
    return project
  }

  function open(id:string){const index=projects.value.findIndex(item=>item.id===id);if(index>=0)projects.value[index]=ensureLayers(projects.value[index]);currentId.value=id}
  function update(project: BeadProject) {
    const index = projects.value.findIndex((item) => item.id === project.id)
    if (index >= 0) projects.value[index] = { ...project, updatedAt: new Date().toISOString() }
  }
  function duplicate(id: string) {
    const source = projects.value.find((item) => item.id === id)
    if (!source) return
    const now = new Date().toISOString()
    const layerIds = new Map(source.layers.map((layer) => [layer.id, crypto.randomUUID()]))
    const layers = source.layers.map((layer) => ({ ...layer, id: layerIds.get(layer.id)!, cells: [...layer.cells] }))
    projects.value.unshift({ ...source, id: crypto.randomUUID(), name: `${source.name} 副本`, cells: [...source.cells], layers, activeLayerId: layerIds.get(source.activeLayerId) ?? layers[0].id, createdAt: now, updatedAt: now })
  }
  function remove(id: string) { projects.value = projects.value.filter((item) => item.id !== id) }

  return { projects, currentId, current, create, open, update, duplicate, remove }
})
