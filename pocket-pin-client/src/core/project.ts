import { basicPalette } from '../../../reference/perler-beads-generator/src/palette'
export type Tool = 'pencil' | 'eraser' | 'fill' | 'remove' | 'recolor' | 'eyedropper' | 'move' | 'copy' | 'paste' | 'shape' | 'text' | 'pan' | 'select'
export type BeadColor = { code: string; name: string; hex: string }
export type ProjectLayer = { id: string; name: string; type: 'bead' | 'reference'; visible: boolean; locked: boolean; opacity: number; cells: Array<string | null>; imageUrl?: string }
export type EditorSettings = { reference?:{url:string;opacity:number;scale:number;x:number;y:number}; grid: 'auto' | 'off' | 'always'; coordinates: boolean; boards: boolean; codes: boolean; round: boolean; color: string; recent: string[]; beadsPerPack: number }
export const defaultSettings = (): EditorSettings => ({ grid: 'auto', coordinates: true, boards: true, codes: false, round: false, color: 'H7', recent: ['H7', 'H2'], beadsPerPack: 500 })
export type BeadProject = { id: string; name: string; width: number; height: number; cells: Array<string | null>; layers: ProjectLayer[]; activeLayerId: string; complete: boolean; createdAt: string; updatedAt: string; settings?: EditorSettings; legacyLayers?: ProjectLayer[] }
export const palette: BeadColor[] = basicPalette.map(item => ({ code: item.primaryCode, name: item.name, hex: item.hex }))
const colors = new Map(palette.map(c => [c.code, c]))
export const colorByCode = (code: string | null) => colors.get(code || '')
export const makeProject = (name = '未命名图纸', width = 52, height = 52): BeadProject => {
  const now = new Date().toISOString(), cells = Array<string | null>(width * height).fill(null), id = crypto.randomUUID()
  return { id: crypto.randomUUID(), name, width, height, cells, layers: [{ id, name: '拼豆图纸', type: 'bead', visible: true, locked: false, opacity: 1, cells }], activeLayerId: id, complete: false, createdAt: now, updatedAt: now, settings: defaultSettings() }
}
/** Normalize each record independently. Old layers remain in the editable backup. */
export function normalizeProject(value: unknown): BeadProject | null {
  if (!value || typeof value !== 'object') return null
  const item = value as BeadProject
  if (!Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1 || item.width > 180 || item.height > 180 || !Array.isArray(item.cells) || item.cells.length !== item.width * item.height) return null
  const clean = (cells: Array<string | null>) => Array.from({ length: item.width * item.height }, (_, i) => colors.has(cells[i] || '') ? cells[i] : null)
  const source = Array.isArray(item.layers) ? item.layers.filter(l => l && l.type !== 'reference' && Array.isArray(l.cells)) : []
  let cells = clean(item.cells)
  if (source.length > 1) { cells.fill(null); source.filter(l => l.visible !== false).forEach(l => clean(l.cells).forEach((c, i) => { if (c) cells[i] = c })) }
  else if (source.length === 1) cells = clean(source[0].cells)
  const defaults = defaultSettings(), rawSettings = item.settings
  const settings: EditorSettings = { ...defaults }
  if (rawSettings && typeof rawSettings === 'object') {
    if (['auto','off','always'].includes(rawSettings.grid)) settings.grid = rawSettings.grid
    for (const field of ['coordinates','boards','codes','round'] as const) if (typeof rawSettings[field] === 'boolean') settings[field] = rawSettings[field]
    if (colors.has(rawSettings.color)) settings.color = rawSettings.color
    if (Array.isArray(rawSettings.recent)) settings.recent = [...new Set(rawSettings.recent.filter(c => colors.has(c)))].slice(0,7)
    if (Number.isFinite(rawSettings.beadsPerPack)) settings.beadsPerPack = Math.max(1, Math.min(10000, Math.round(rawSettings.beadsPerPack)))
  }
  const base = makeProject(typeof item.name === 'string' ? item.name : '导入图纸', item.width, item.height)
  const layer = { ...base.layers[0], id: source[0]?.id || base.activeLayerId, visible: source.length > 1 ? true : source[0]?.visible !== false, locked: source.length > 1 ? false : Boolean(source[0]?.locked), cells }
  return { ...base, id: item.id || base.id, cells, layers: [layer], activeLayerId: layer.id, complete: Boolean(item.complete), createdAt: item.createdAt || base.createdAt, updatedAt: item.updatedAt || base.updatedAt, settings, legacyLayers: item.legacyLayers || (Array.isArray(item.layers) && (source.length > 1 || item.layers.some(l => l.type === 'reference')) ? item.layers : undefined) }
}
