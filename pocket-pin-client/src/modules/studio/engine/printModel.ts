import { palette } from '@/core/project'

export type PrintColor = {
  primaryCode: string
  name: string
  hex: string
  rgb: [number, number, number]
}

export type BeadLayer = {
  id: string
  name: string
  customName: boolean
  visible: boolean
  includeInUsage: boolean
  cells: Array<string | null>
}

export type BeadProject = {
  name: string
  width: number
  height: number
  cells: Array<string | null>
  layers: BeadLayer[]
  activeLayerId: string
  activeBrand: 'MARD'
  settings: { beadsPerPack: number }
  boardSettings: { boardWidth: number; boardHeight: number }
}

export type UsageRow = { color: PrintColor; count: number; packs: number }

const colors = new Map<string, PrintColor>(palette.map(({ code, name, hex }) => {
  const rgb: [number, number, number] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
  return [`mard-${code.toLowerCase()}`, { primaryCode: code, name, hex, rgb }]
}))

export function getColor(id: string | null): PrintColor | undefined {
  return id ? colors.get(id.toLowerCase()) : undefined
}

export function mappedCode(color: PrintColor, _brand: string): string {
  return color.primaryCode
}

export function createProject(width: number, height: number, name = '拼豆图纸'): BeadProject {
  const cells = Array<string | null>(width * height).fill(null)
  const layer: BeadLayer = { id: crypto.randomUUID(), name: '拼豆图纸', customName: false, visible: true, includeInUsage: true, cells }
  return {
    name, width, height, cells, layers: [layer], activeLayerId: layer.id,
    activeBrand: 'MARD', settings: { beadsPerPack: 500 },
    boardSettings: { boardWidth: 29, boardHeight: 29 },
  }
}
