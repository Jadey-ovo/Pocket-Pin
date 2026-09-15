import { afterEach, expect, it } from 'vitest'
import { locale, setLanguage, t } from './i18n'
afterEach(()=>setLanguage('zh'))
it('switches labels and persists the selected language',()=>{setLanguage('en');expect(locale.value).toBe('en');expect(t('画笔')).toBe('Brush');expect(localStorage.getItem('pin:language')).toBe('en');expect(document.documentElement.lang).toBe('en');setLanguage('zh');expect(t('画笔')).toBe('画笔')})
