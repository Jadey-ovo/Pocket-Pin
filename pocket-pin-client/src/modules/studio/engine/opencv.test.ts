// @vitest-environment node
import { expect, it, vi } from 'vitest'
// Load the real CommonJS runtime without Vite's thenable module interop.
vi.mock('@techstark/opencv-js', async () => {
  const { createRequire } = await import('node:module')
  return { default: createRequire(import.meta.url)('@techstark/opencv-js') }
})
import { prepareImage } from './opencv'
import { generateCells } from './colors'
it('runs the real OpenCV runtime, retains alpha and detects a contrasting contour', async () => {
  const pixels = new Uint8ClampedArray(18 * 18 * 4)
  for (let y=0;y<18;y++) for(let x=0;x<18;x++) {
    const v=x>=6&&x<12?0:255
    pixels.set([v,v,v,y===0?0:255],(y*18+x)*4)
  }
  const input={pixels,width:3,height:3,sampleScale:6,maxColors:2,allowed:['H7','H2'],style:'realistic' as const,removeBackground:false,tolerance:32}
  const prepared=await prepareImage(input)
  expect(prepared.edges?.some(v=>v>0)).toBe(true)
  for(let i=0;i<18*18;i++)expect(prepared.pixels[i*4+3]).toBe(pixels[i*4+3])
  expect(generateCells(prepared)).toEqual(['H2','H7','H2','H2','H7','H2','H2','H7','H2'])
}, 30000)

it('preserves original cartoon edge pixels including alpha and antialiasing', async () => {
  const pixels = new Uint8ClampedArray([0,0,0,255,72,70,78,200,255,255,255,0])
  const input={pixels,width:3,height:1,sampleScale:1,maxColors:3,allowed:[],style:'cartoon' as const,removeBackground:false,tolerance:32}
  const prepared=await prepareImage(input)
  expect(prepared.pixels).toEqual(pixels)
  expect(prepared.edges).toBeUndefined()
})
