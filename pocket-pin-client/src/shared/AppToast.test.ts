import {mount,flushPromises} from '@vue/test-utils'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import AppToast from './AppToast.vue'
import {beginWorkflowToast,updateWorkflowToast,reopenWorkflowToast,closeWorkflowToast,workflowToastState,toastState,showToast} from './feedback'

beforeEach(()=>{closeWorkflowToast();toastState.show=false})
afterEach(()=>{vi.useRealTimers();document.body.innerHTML=''})
const setup=()=>mount(AppToast,{attachTo:document.body})

it('shows a five second residence bar and closes without actions or a close button',async()=>{
 vi.useFakeTimers();const owner=Symbol()
 beginWorkflowToast(owner,{title:'正在识别色号表',message:'读取框选区域',phase:'running',progress:.2})
 const w=setup();await flushPromises()
 expect(document.querySelectorAll('.pin-workflow-content button')).toHaveLength(0)
 await vi.advanceTimersByTimeAsync(2500);await flushPromises()
 expect(Number(document.querySelector('[aria-label="提示剩余停留时间"]')?.getAttribute('value'))).toBeCloseTo(.5,1)
 expect(workflowToastState.show).toBe(true)
 updateWorkflowToast(owner,{title:'识别完成',message:'已识别 40 色，请确认',phase:'success'});await flushPromises()
 await vi.advanceTimersByTimeAsync(4999);expect(workflowToastState.show).toBe(true)
 await vi.advanceTimersByTimeAsync(51);expect(workflowToastState.show).toBe(false);w.unmount()
})
it('does not reopen on updates, interrupt a persistent status with ordinary toasts, or accept stale owners',async()=>{
 const owner=Symbol(),stale=Symbol();beginWorkflowToast(owner,{title:'部分识别',message:'结果已保留',phase:'attention'})
 const w=setup();showToast('普通提示');await flushPromises();expect(document.body.textContent).toContain('结果已保留');expect(document.body.textContent).not.toContain('普通提示')
 closeWorkflowToast();updateWorkflowToast(owner,{title:'识别完成',message:'完成',phase:'success'});expect(workflowToastState.show).toBe(false)
 updateWorkflowToast(stale,{title:'旧任务',message:'过期结果',phase:'error'});expect(workflowToastState.view.title).toBe('识别完成')
 reopenWorkflowToast(owner);await flushPromises();expect(workflowToastState.show).toBe(true);expect(document.body.textContent).toContain('识别完成');w.unmount()
})
