import { describe, expect, it } from 'vitest'
import { generateCells, type GenerationInput } from './colors'
import { colorByCode } from '@/core/project'

function fixture(width: number, height: number, color: (x: number, y: number) => number[], scale = 3): GenerationInput {
  const pixels = new Uint8ClampedArray(width * height * scale * scale * 4)
  for (let y = 0; y < height * scale; y++) for (let x = 0; x < width * scale; x++) pixels.set([...color(x, y), 255], (y * width * scale + x) * 4)
  return { pixels, width, height, sampleScale: scale, maxColors: 2, allowed: ['H7', 'H2'], style: 'cartoon', removeBackground: false, tolerance: 30 }
}
describe('complete feature generation', () => {
  it('reserves a rare eye color through the actual generation entry point', () => {
    const input = fixture(10, 10, (x, y) => y >= 12 && y < 15 && (x >= 12 && x < 15 || x >= 18 && x < 21) ? [0,0,0] : [220,220,220])
    const cells = generateCells(input)
    expect(cells[44]).toBe('H7'); expect(cells[46]).toBe('H7')
    expect(cells.filter(c => c === 'H7')).toHaveLength(2)
  })
  it('keeps line width without promoting minority edge coverage to another dark bead', () => {
    const input = fixture(5, 5, x => x >= 12 && x < 20 ? [0,0,0] : [255,255,255], 6)
    const cells = generateCells(input)
    for (let y = 0; y < 5; y++) {
      expect(cells[y * 5 + 2]).toBe('H7')
      expect(cells[y * 5 + 3]).toBe('H2')
    }
    expect(cells.filter(c => c === 'H7')).toHaveLength(5)
  })
  it('removes corner-connected whites while retaining enclosed white details', () => {
    const input = fixture(5, 5, (x,y) => { const a=Math.floor(x/3), b=Math.floor(y/3); return a>=1&&a<=3&&b>=1&&b<=3&&!(a===2&&b===2)?[0,0,0]:[255,255,255] })
    input.removeBackground = true
    const cells = generateCells(input)
    expect(cells[0]).toBeNull(); expect(cells[12]).toBe('H2'); expect(cells[6]).toBe('H7')
  })
  it('retains an intentional gray edge instead of forcing it to black', () => {
    const input = fixture(5, 3, x => x < 3 ? [0,0,0] : x < 6 ? [72,70,78] : [255,255,255])
    input.allowed=['H7','H5','H2'];input.maxColors=3
    const cells=generateCells(input)
    for (let y=0;y<3;y++) expect(cells[y*5+1]).toBe('H5')
  })
  it('does not invent many shades for a nearly flat noisy surface', () => {
    const input = fixture(12, 12, (x,y) => {const v=190+(x*17+y*7)%7;return [v,v,v]})
    input.allowed=[]; input.maxColors=24
    const cells=generateCells(input)
    expect(new Set(cells).size).toBeLessThanOrEqual(2)
    expect(cells.every(c=>!!colorByCode(c))).toBe(true)
  })
})
