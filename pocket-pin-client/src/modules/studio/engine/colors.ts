import { palette } from '@/core/project'
import { featureQuantize, perceptual } from './featureQuantization'
import type { Cells } from './operations'
export const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const entries = palette.map(c => ({ ...c, rgb: rgb(c.hex) })), byCode = new Map(entries.map(c => [c.code, c]))
const distance = (a: number[], b: number[]) => .3 * (a[0] - b[0]) ** 2 + .59 * (a[1] - b[1]) ** 2 + .11 * (a[2] - b[2]) ** 2
function nearest(value: number[], choices: typeof entries) { let best = choices[0], min = Infinity; for (const item of choices) { const d = distance(value, item.rgb); if (d < min) { min = d; best = item } } return best.code }
export function reduceColors(cells: Cells, limit: number, protectedCodes: string[] = []): Cells {
  const counts = new Map<string, number>(); cells.forEach(c => { if (c) counts.set(c, (counts.get(c) || 0) + 1) })
  const keep = [...new Set(protectedCodes)].filter(c => counts.has(c) && byCode.has(c))
  if (keep.length > limit) throw new Error('保护色数量不能超过色数上限')
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([c]) => c).filter(c => byCode.has(c))
  for (const c of ranked) { if (keep.length >= limit) break; if (!keep.includes(c)) keep.push(c) }
  if (!keep.length) return [...cells]
  const choices = keep.map(c => byCode.get(c)!), mapping = new Map(ranked.map(c => [c, keep.includes(c) ? c : nearest(byCode.get(c)!.rgb, choices)]))
  return cells.map(c => c ? mapping.get(c) || null : null)
}
export type GenerationInput = { pixels: Uint8ClampedArray; width: number; height: number; maxColors: number; allowed: string[]; style: 'cartoon' | 'realistic'; removeBackground: boolean; tolerance: number; sampleScale?: number; edges?: Uint8Array; importance?: Uint8Array }
export function generateCells(input: GenerationInput): Cells {
  const choices = entries.filter(c => !input.allowed.length || input.allowed.includes(c.code))
  if (!choices.length) throw new Error('请至少选择一种可用颜色')
  const { width, height, pixels } = input, scale = input.sampleScale ?? 3, stride = width * scale
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 180 || height > 180 || !Number.isInteger(scale) || scale < 1 || scale > 8 || pixels.length !== width * height * scale * scale * 4) throw new Error('图片尺寸或像素数据无效')
  const values: (number[] | null)[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const samples: number[][] = []; let edge = false
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const index = (y * scale + sy) * stride + x * scale + sx, i = index * 4
      if (pixels[i + 3] >= 100) { samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]); edge ||= !!input.edges?.[index] }
    }
    if (samples.length < Math.ceil(scale * scale / 2)) { values.push(null); continue }
    const average = (list: number[][]) => [0, 1, 2].map(ch => list.reduce((sum, sample) => sum + sample[ch], 0) / list.length)
    const mean = average(samples), luminance = perceptual(mean)[0]
    // Retain a narrow dark stroke even when it occupies a minority of the bead.
    const dark = samples.filter(sample => perceptual(sample)[0] < luminance - 22)
    if (input.style === 'realistic' && dark.length >= Math.max(2, Math.ceil(samples.length * .16)) && edge) { values.push(average(dark)); continue }
    if (input.style === 'realistic') { values.push(mean); continue }
    const groups = new Map<string, number[][]>()
    for (const sample of samples) {
      const key = sample.map(v => Math.round(v / 32)).join(',')
      const group = groups.get(key) ?? []; group.push(sample); groups.set(key, group)
    }
    const dominant = [...groups.values()].sort((a, b) => b.length - a.length)[0]
    values.push(average(dominant))
  }
  if (input.removeBackground) removeBorderBackground(values, width, height, input.tolerance)
  return featureQuantize(values, width, choices, Math.max(1, Math.min(211, Math.round(input.maxColors))), input.style === 'cartoon', false, input.importance)
}

function removeBorderBackground(values: (number[] | null)[], width: number, height: number, tolerance: number) {
  // Only remove regions connected to an image corner. Enclosed whites (eyes, clothes)
  // and unrelated colors on the border remain part of the drawing.
  const original = [...values], visited = new Set<number>()
  for (const corner of [0, width - 1, (height - 1) * width, width * height - 1]) {
    let seed = corner
    if (!original[seed]) {
      let best = Infinity
      original.forEach((value, i) => {
        if (!value) return
        const d = Math.abs(i % width - corner % width) + Math.abs(Math.floor(i / width) - Math.floor(corner / width))
        if (d < best) { best = d; seed = i }
      })
    }
    const background = original[seed]; if (!background) continue
    const queue = [seed], seen = new Set<number>()
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head]; if (seen.has(i)) continue; seen.add(i)
      const value = original[i]
      if (!value || Math.sqrt(distance(value, background)) > tolerance) continue
      visited.add(i)
      if (i % width) queue.push(i - 1)
      if (i % width < width - 1) queue.push(i + 1)
      if (i >= width) queue.push(i - width)
      if (i + width < original.length) queue.push(i + width)
    }
  }
  visited.forEach(i => values[i] = null)
}
