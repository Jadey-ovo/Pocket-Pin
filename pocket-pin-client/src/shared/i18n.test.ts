import { afterEach, expect, it } from 'vitest'
import { locale, setLanguage, t } from './i18n'
afterEach(()=>setLanguage('zh'))
it('switches labels and persists the selected language',()=>{setLanguage('en');expect(locale.value).toBe('en');expect(t('画笔')).toBe('Brush');expect(localStorage.getItem('pin:language')).toBe('en');expect(document.documentElement.lang).toBe('en');setLanguage('zh');expect(t('画笔')).toBe('画笔')})
it('uses compact English labels and translates filter counts and new controls',()=>{setLanguage('en');expect(t('复制图纸')).toBe('Copy');expect(t('圆豆')).toBe('Round');expect(t('已拼 (12)')).toBe('Done (12)');expect(t('全部 (36)')).toBe('All (36)');expect(t('颗数消耗')).toBe('Beads');expect(t('未命名作品')).toBe('Untitled pattern');expect(t('框内生成图纸 · 拖动图片，拖动四角等比缩放')).toBe('Drag to position · Drag corners to resize');setLanguage('zh');expect(t('已拼 (12)')).toBe('已拼 (12)')})
