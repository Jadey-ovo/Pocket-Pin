import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import router from '@/app/router'
import HomePage from './HomePage.vue'

describe('HomePage', () => {
  it('presents the product entry points', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [createPinia(), router] },
    })

    expect(wrapper.text()).toContain('图纸空间')
    expect(wrapper.text()).toContain('导入照片')
    expect(wrapper.text()).toContain('创作图纸')
  })
})
