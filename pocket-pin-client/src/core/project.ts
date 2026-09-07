import { basicPalette } from '../../../reference/perler-beads-generator/src/palette'

export type Tool = 'pencil' | 'eraser' | 'fill' | 'remove' | 'recolor' | 'eyedropper' | 'move' | 'copy' | 'paste' | 'shape' | 'text' | 'pan'

export type BeadColor = {
  code: string
  name: string
  hex: string
}

export type ProjectLayer = {
  id: string
  name: string
  type: 'bead' | 'reference'
  visible: boolean
  locked: boolean
  opacity: number
  cells: Array<string | null>
  imageUrl?: string
}

export type BeadProject = {
  id: string
  name: string
  width: number
  height: number
  cells: Array<string | null>
  layers: ProjectLayer[]
  activeLayerId: string
  complete: boolean
  createdAt: string
  updatedAt: string
}

export const palette: BeadColor[] = basicPalette.map((item) => ({
  code: item.primaryCode,
  name: item.name,
  hex: item.hex,
}))

export const makeProject = (name = 'Untitled Pattern', width = 52, height = 52): BeadProject => {
  const now = new Date().toISOString()
  const cells = Array.from({ length: width * height }, () => null) as Array<string | null>
  const layerId = crypto.randomUUID()
  return {
    id: crypto.randomUUID(), name, width, height,
    cells,
    layers: [{ id: layerId, name: '拼豆层 1', type: 'bead', visible: true, locked: false, opacity: 1, cells }],
    activeLayerId: layerId,
    complete: false, createdAt: now, updatedAt: now,
  }
}

export const colorByCode = (code: string | null) => palette.find((color) => color.code === code)
