import { mount } from '@vue/test-utils'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import StorageNotice from './StorageNotice.vue'
const key = 'pocket-pin:storage-notice:v1'
const options = { global: { stubs: { VanDialog: { props: ['show'], template: '<div v-if="show"><slot/><button @click="$emit(\'confirm\');$emit(\'update:show\',false)">确认</button></div>' } } } }
beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())
it('explains local storage and remembers acknowledgment on later visits', async () => {
  const w = mount(StorageNotice, options)
  expect(w.text()).toContain('不会自动同步')
  expect(w.text()).toContain('分享网站链接不会分享你的图纸')
  expect(w.findAll('ol > li')).toHaveLength(3)
  expect(w.text()).toContain('重要作品建议及时导出图纸')
  expect(w.text()).not.toContain('JSON')
  await w.find('button').trigger('click')
  expect(localStorage.getItem(key)).toBe('acknowledged')
  w.unmount()
  const next = mount(StorageNotice, options)
  expect(next.find('button').exists()).toBe(false)
  next.unmount()
})
it('allows dismissal even if browser storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable') })
  const w = mount(StorageNotice, options)
  await w.find('button').trigger('click')
  expect(w.find('button').exists()).toBe(false)
  w.unmount()
})
