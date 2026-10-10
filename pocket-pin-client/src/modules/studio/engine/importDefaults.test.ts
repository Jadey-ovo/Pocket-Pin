import { expect, it } from 'vitest'
import { suggestImageStyle } from './importDefaults'
it('suggests cartoon for repeated flat colors and photo for textured imagery', () => {
  const flat = new Uint8ClampedArray(96*96*4), textured = new Uint8ClampedArray(flat.length)
  for(let y=0;y<96;y++)for(let x=0;x<96;x++){
    flat.set(x<48?[240,220,180,255]:[25,25,25,255],(y*96+x)*4)
    textured.set([(x*31+y*13)%256,(x*17+y*23)%256,(x*19+y*7)%256,255],(y*96+x)*4)
  }
  expect(suggestImageStyle(flat,96,96)).toBe('cartoon')
  expect(suggestImageStyle(textured,96,96)).toBe('realistic')
  expect(suggestImageStyle(new Uint8ClampedArray(flat.length),96,96)).toBe('realistic')
})
