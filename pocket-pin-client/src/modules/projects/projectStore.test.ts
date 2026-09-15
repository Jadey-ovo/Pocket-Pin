import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { makeProject } from '@/core/project'
import { useProjectStore } from './projectStore'
beforeEach(()=>{localStorage.clear();setActivePinia(createPinia());vi.useFakeTimers()})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks()})
describe('project persistence',()=>{
 it('isolates corrupt records',()=>{const p=makeProject();localStorage.setItem('pocket-pin:projects:v2',JSON.stringify(['bad',p.id]));localStorage.setItem('pocket-pin:project:bad','invalid JSON');localStorage.setItem(`pocket-pin:project:${p.id}`,JSON.stringify(p));expect(useProjectStore().projects.map(p=>p.id)).toEqual([p.id])})
 it('preserves legacy source bytes during migration',()=>{const p=makeProject(),raw=JSON.stringify([p]);localStorage.setItem('pocket-pin:projects:v1',raw);const s=useProjectStore();s.flush();expect(localStorage.getItem('pocket-pin:projects:v1')).toBe(raw);expect(JSON.parse(localStorage.getItem('pocket-pin:projects:v2')!)).toEqual([p.id])})
 it('debounces writes and saves current cells',()=>{const s=useProjectStore(),p=s.create();p.cells[0]='H7';s.update(p);expect(s.saveState).toBe('pending');vi.advanceTimersByTime(400);expect(s.saveState).toBe('saved');expect(JSON.parse(localStorage.getItem(`pocket-pin:project:${p.id}`)!).cells[0]).toBe('H7')})
 it('retains dirty data and exposes storage errors for retry',()=>{const s=useProjectStore(),p=s.create();const mock=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')});expect(s.flush()).toBe(false);expect(s.saveState).toBe('error');expect(s.current?.id).toBe(p.id);mock.mockRestore();expect(s.flush()).toBe(true);expect(s.saveState).toBe('saved')})
})
it('does not persist empty new projects and discards them on leaving',()=>{const s=useProjectStore(),p=s.create();s.flush();expect(JSON.parse(localStorage.getItem('pocket-pin:projects:v2')!)).toEqual([]);s.discardEmptyDraft(p.id);expect(s.projects).toHaveLength(0)})
it('keeps a project that has recorded beads even after clearing it',()=>{const s=useProjectStore(),p=s.create();s.update({...p,cells:p.cells.map((_,i)=>i===0?'H7':null)});s.update({...s.current!,cells:p.cells.map(()=>null)});s.discardEmptyDraft(p.id);expect(s.projects).toHaveLength(1);s.flush();expect(JSON.parse(localStorage.getItem('pocket-pin:projects:v2')!)).toEqual([p.id])})
