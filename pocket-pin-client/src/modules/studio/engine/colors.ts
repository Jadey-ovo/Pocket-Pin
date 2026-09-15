import { palette } from '@/core/project'
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
export type GenerationInput = { pixels: Uint8ClampedArray; width: number; height: number; maxColors: number; allowed: string[]; style: 'cartoon' | 'realistic'; removeBackground: boolean; tolerance: number }
export function generateCells(input: GenerationInput): Cells {
  const choices = entries.filter(c => !input.allowed.length || input.allowed.includes(c.code))
  if (!choices.length) throw new Error('请至少选择一种可用颜色')
  const { width, height, pixels } = input, stride = width * 3
  const corners = [0, (stride - 1) * 4, (stride * (height * 3 - 1)) * 4, (stride * height * 3 - 1) * 4]
  const background = [0, 1, 2].map(ch => corners.reduce((s, i) => s + pixels[i + ch], 0) / 4)
  const cells: Cells = [], cache = new Map<string,string>()
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const samples: number[][] = []
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) { const i = ((y * 3 + sy) * stride + x * 3 + sx) * 4; if (pixels[i + 3] >= 100) samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]) }
    if (samples.length < 5) { cells.push(null); continue }
    let value = [0, 1, 2].map(ch => Math.round(samples.reduce((sum, s) => sum + s[ch], 0) / samples.length))
    if (input.style === 'cartoon') { const groups = new Map<string, number[][]>(); for (const sample of samples) { const key = sample.map(v => Math.round(v / 32)).join(','); groups.set(key, [...(groups.get(key) || []), sample]) }; const dominant = [...groups.values()].sort((a, b) => b.length - a.length)[0]; value = [0, 1, 2].map(ch => Math.round(dominant.reduce((sum, sample) => sum + sample[ch], 0) / dominant.length)) }
    if (input.removeBackground && Math.sqrt(distance(value, background)) <= input.tolerance) { cells.push(null); continue }
    const key=value.join(',');if(!cache.has(key))cache.set(key,nearest(value,choices));cells.push(cache.get(key)!)
  }
  return reduceColors(cells,Math.max(1,Math.min(211,Math.round(input.maxColors))))
}
