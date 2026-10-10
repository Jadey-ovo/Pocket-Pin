import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import ImagePlacement from './ImagePlacement.vue'
import type { Crop } from './PhotoCrop.vue'

async function setup(ratio: number, crop: Crop) {
  const w = mount(ImagePlacement, { props: { src: 'test.png', modelValue: crop } })
  const img = w.find('img').element
  Object.defineProperties(img, { naturalWidth: { value: ratio * 400 }, naturalHeight: { value: 400 } })
  await w.find('img').trigger('load')
  const frame = w.find('.pin-placement-frame').element
  Object.defineProperty(frame, 'clientWidth', { value: 200 })
  Object.defineProperty(frame, 'setPointerCapture', { value: vi.fn() })
  for (const handle of w.findAll('.pin-placement-handle')) Object.defineProperty(handle.element, 'setPointerCapture', { value: vi.fn() })
  return w
}
function latest(w: Awaited<ReturnType<typeof setup>>) { return w.emitted('update:modelValue')!.at(-1)![0] as Crop }
it('repairs a previously stretched non-square photo and removes the zoom slider', async () => {
  const w = await setup(2, { x: 0, y: 0, width: 1, height: .5 })
  const c = latest(w)
  expect(c.height).toBe(2);expect(c.y + c.height / 2).toBe(.25)
  expect(w.findAll('.pin-placement-handle')).toHaveLength(4)
  expect(w.find('.van-slider').exists()).toBe(false)
  expect(w.find('.pin-placement-grid').exists()).toBe(false)
  expect(w.find('.pin-placement-image-outline').exists()).toBe(true)
  w.unmount()
})
it.each([['nw', -1, -1], ['ne', 1, -1], ['sw', -1, 1], ['se', 1, 1]] as const)('scales %s proportionally while holding the opposite corner fixed', async (corner, sx, sy) => {
  for (const ratio of [.5, 2]) {
    const initial = { x: .1, y: .2, width: 1, height: ratio }
    const w = await setup(ratio, initial), handle = w.find(`.pin-placement-handle.${corner}`)
    await handle.trigger('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, button: 0 })
    await handle.trigger('pointermove', { clientX: 100 + sx * 40, clientY: 100 + sy * 20, pointerId: 1 })
    const c = latest(w)
    expect(c.width).toBeLessThan(initial.width)
    expect(c.height / c.width).toBeCloseTo(ratio)
    const ax = sx < 0 ? 1 : 0, ay = sy < 0 ? 1 : 0
    expect((ax - c.x) / c.width).toBeCloseTo((ax - initial.x) / initial.width)
    expect((ay - c.y) / c.height).toBeCloseTo((ay - initial.y) / initial.height)
    await handle.trigger('pointerup', { pointerId: 1 });w.unmount()
  }
})
it('moves the photo without altering scale or responding to another pointer', async () => {
  const w = await setup(2, { x: 0, y: -.5, width: 1, height: 2 }), frame = w.find('.pin-placement-frame')
  await frame.trigger('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, button: 0 })
  expect(w.find('.pin-placement-grid').exists()).toBe(true)
  await frame.trigger('pointermove', { clientX: 140, clientY: 120, pointerId: 2 })
  expect(w.emitted('update:modelValue')).toBeUndefined()
  await frame.trigger('pointermove', { clientX: 140, clientY: 120, pointerId: 1 })
  expect(latest(w)).toEqual({x: -.2, y: -.7, width: 1, height: 2})
  await frame.trigger('pointercancel', {pointerId: 1})
  expect(w.find('.pin-placement-grid').exists()).toBe(false)
  const count = w.emitted('update:modelValue')!.length
  await frame.trigger('pointermove', { clientX: 160, clientY: 140, pointerId: 1 })
  expect(w.emitted('update:modelValue')).toHaveLength(count);w.unmount()
})
