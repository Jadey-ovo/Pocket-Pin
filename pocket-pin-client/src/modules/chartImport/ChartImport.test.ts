import {mount,flushPromises} from '@vue/test-utils'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import ChartImport from './ChartImport.vue'
import ChartRegion from './ChartRegion.vue'
import {workflowToastState,closeWorkflowToast} from '@/shared/feedback'
import {detectGrid,mapChart,rectifyChart,type Raster,type ChartResult} from './recognition'
const ocrMock=vi.hoisted(()=>({read:vi.fn(),cancel:vi.fn()}))
vi.mock('./ocr',()=>({createChartOcr:()=>ocrMock}))
let legendBox:object|null=null
const requests:string[]=[]
const width=221,height=181,pixels=new Uint8ClampedArray(width*height*4).fill(255)
for(let y=20;y<=140;y++)for(let x=30;x<=190;x++)pixels.set([...((x-30)%20===0||(y-20)%20===0?[100,100,100]:Math.floor((x-30)/20)%2?[28,156,79]:[244,215,56]),255],(y*width+x)*4)
const image:Raster={width,height,data:pixels}
beforeEach(()=>{closeWorkflowToast();legendBox=null;requests.length=0;ocrMock.read.mockReset().mockResolvedValue([]);ocrMock.cancel.mockReset();
 vi.stubGlobal('ImageData',class{constructor(public data:Uint8ClampedArray,public width:number,public height:number){}})
 vi.stubGlobal('Image',class{onload=()=>{};naturalWidth=width;naturalHeight=height;set src(_:string){queueMicrotask(()=>this.onload())}decode(){return Promise.resolve()}})
 vi.stubGlobal('Worker',class{onmessage:(e:unknown)=>void=()=>{};terminate=vi.fn();postMessage(d:any){requests.push(d.type);queueMicrotask(()=>{try{this.onmessage({data:d.type==='legend'?{id:d.id,box:legendBox}:d.type==='enhance'?{id:d.id,image}:d.type==='detect'?{id:d.id,image,angle:0,grid:detectGrid(image)}:{id:d.id,result:mapChart(image,d.grid,d.legend,d.words,d.blankCodes),sheet:rectifyChart(image,d.grid)}})}catch(error){this.onmessage({data:{id:d.id,error:String(error)}})}})}})
 URL.createObjectURL=vi.fn(()=>'blob:chart-test');URL.revokeObjectURL=vi.fn()
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillRect:vi.fn(),drawImage:vi.fn(),putImageData:vi.fn(),strokeRect:vi.fn(),getImageData:()=>({data:new Uint8ClampedArray(pixels)})} as unknown as CanvasRenderingContext2D)
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,fixture')
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()})
async function setup(save=vi.fn(async(_result:ChartResult)=>true),manual=true){
 const w=mount(ChartImport,{props:{file:new File(['chart'],'chart.png',{type:'image/png'}),save},global:{stubs:{Teleport:true,ChartRegion:{template:'<div/>'}}}})
 if(manual)await w.findAll('button').find(b=>b.text()==='改为手动分步')!.trigger('click')
 await flushPromises();return {w,save}
}
const viewText=(w:ReturnType<typeof mount>)=>w.text()+workflowToastState.view.title+workflowToastState.view.message
async function click(w:ReturnType<typeof mount>,text:string){const b=w.findAll('button').find(b=>b.text()===text||(text==='下一步'&&b.text()==='跳过色号表：对齐网格'));expect(b,text).toBeTruthy();await b!.trigger('click');await flushPromises()}
it('keeps recognition and corrections local until a successful save, including retries',async()=>{
 const save=vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),{w}=await setup(save)
 expect(viewText(w)).not.toContain('8 列 × 6 行');expect(viewText(w)).toContain('未能自动定位色号表')
 expect(viewText(w)).not.toContain('自动定位图例');expect(viewText(w)).not.toContain('识别框内色号');expect(w.find('.chart-busy').exists()).toBe(false)
 await click(w,'下一步');expect(w.find('[aria-label="识别列数"]').exists()).toBe(false);expect(w.findComponent(ChartRegion).attributes('grid-only')).toBe('true')
 await click(w,'下一步');await click(w,'下一步')
 expect(viewText(w)).toContain('8 × 6 格');expect(save).not.toHaveBeenCalled()
 const tile=w.find('.chart-cell-list button');await tile.trigger('click');await click(w,'更换所选色号');await w.find('[aria-label="搜索色号"]').setValue('H7');await w.find('[aria-label="选择 H7"]').trigger('click');await flushPromises()
 expect(w.find('.chart-cell-list button span').text()).toBe('H7')
 const accept=w.find('.chart-check input');if(accept.exists())await accept.setValue(true)
 await click(w,'保存到画板');expect(viewText(w)).toContain('保存失败');expect(w.emitted('close')).toBeUndefined();expect(viewText(w)).toContain('核对识别结果')
 await click(w,'保存到画板');expect(save.mock.calls[1][0].cells).toHaveLength(48);expect(w.emitted('close')).toHaveLength(1);w.unmount()
})
it('opens neighboring original cells on a long press and allows fixing that cell',async()=>{
 const {w}=await setup();await click(w,'下一步');await click(w,'下一步');await click(w,'下一步')
 vi.useFakeTimers();await w.find('.chart-cell-list button').trigger('pointerdown',{button:0});await vi.advanceTimersByTimeAsync(460);await flushPromises()
 expect(w.find('[aria-label="原图位置"]').exists()).toBe(true);expect(w.find('canvas[aria-label="当前格及周围原图，蓝框为当前格"]').exists()).toBe(true)
 await click(w,'修改这一格色号');expect(w.find('[aria-label="选择拼豆颜色"]').exists()).toBe(true);await w.find('[aria-label="搜索色号"]').setValue('A1');await w.find('[aria-label="选择 A1"]').trigger('click');await flushPromises();expect(w.find('.chart-cell-list button span').text()).toBe('A1');w.unmount()
})

it('automatically recognizes only the legend on entry and defers grid work to step two',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:1}
 ocrMock.read.mockResolvedValue([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98}])
 const {w}=await setup();expect(requests).toEqual(['legend']);expect(ocrMock.read).toHaveBeenCalledTimes(1)
 expect(w.find('[aria-label="图例色号 1"]').text()).toBe('A5')
 expect(viewText(w)).not.toContain('网格，请核对边界');expect(viewText(w)).not.toContain('手动添加')
 await click(w,'下一步');expect(requests).toEqual(['legend','detect']);expect(ocrMock.cancel).not.toHaveBeenCalled();w.unmount()
})
it('shows OCR progress in a nonmodal toast and lets navigation cancel a pending job',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:1}
 let finish:(words:unknown[])=>void=()=>{}
 ocrMock.read.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 const {w}=await setup();expect(workflowToastState.show).toBe(true);expect(workflowToastState.view.phase).toBe('running')
 expect(w.find('.chart-busy').exists()).toBe(false);expect(w.find('.chart-progress-toast').exists()).toBe(false)
 await click(w,'下一步');expect(ocrMock.cancel).toHaveBeenCalled();expect(viewText(w)).toContain('网格对齐')
 finish([]);await flushPromises();expect(viewText(w)).toContain('网格对齐');expect(viewText(w)).not.toContain('自动识别色号表失败');w.unmount()
})

it('automatically retries the rectangle after a corner adjustment',async()=>{
 const {w}=await setup();expect(viewText(w)).toContain('未能自动定位色号表')
 ocrMock.read.mockResolvedValue([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98}])
 vi.useFakeTimers();const region=w.findComponent(ChartRegion)
 region.vm.$emit('update:quad',[{x:1,y:1},{x:100,y:1},{x:100,y:50},{x:1,y:50}]);region.vm.$emit('finish')
 await vi.advanceTimersByTimeAsync(451);await flushPromises();expect(workflowToastState.view.actions).toBeUndefined()
 expect(ocrMock.read).toHaveBeenCalledTimes(1);expect(w.find('[aria-label="图例色号 1"]').text()).toBe('A5')
 expect(viewText(w)).not.toContain('未能自动定位色号表');w.unmount()
})

it('shows one overall percentage and falls back when local OCR exceeds its budget',async()=>{
 vi.useFakeTimers();legendBox={x:1,y:1,width:100,height:50,swatches:1};ocrMock.read.mockImplementation(()=>new Promise(()=>{}))
 const {w}=await setup();expect(workflowToastState.view.title).toContain('正在识别');expect(workflowToastState.view.progress).toBeGreaterThan(0)
 await vi.advanceTimersByTimeAsync(5001);await flushPromises();expect(viewText(w)).toContain('5 秒内未能可靠识别');expect(workflowToastState.show).toBe(true);expect(workflowToastState.view.phase).toBe('attention');expect(ocrMock.cancel).toHaveBeenCalled();w.unmount()
})

it('keeps recognized codes and unknown quantities when the legend is only partially read',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:2}
 ocrMock.read.mockResolvedValue([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98},{x:8,y:35,width:20,height:12,text:'B8',confidence:98}])
 const {w}=await setup();expect(w.findAll('[aria-label^="图例色号"]')).toHaveLength(2);expect(viewText(w)).toContain('已保留');expect(w.text()).toContain('已识别 2 色，请确认');expect(w.text()).not.toContain('0 个色号')
 expect(workflowToastState.view.phase).toBe('attention');expect(workflowToastState.show).toBe(true)
 await w.find('[aria-label="图例数量 2"]').setValue('36');await flushPromises();expect(workflowToastState.view.phase).toBe('success');expect(viewText(w)).not.toContain('数量未识别');w.unmount()
})
it('closing the global status does not cancel OCR or reopen on completion',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:1};let finish:(v:any[])=>void=()=>{}
 ocrMock.read.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));const {w}=await setup()
 closeWorkflowToast();expect(workflowToastState.show).toBe(false);expect(ocrMock.cancel).not.toHaveBeenCalled()
 finish([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98}]);await flushPromises()
 expect(w.find('[aria-label="图例色号 1"]').exists()).toBe(true);expect(workflowToastState.show).toBe(false)
 await click(w,'识别状态');expect(workflowToastState.show).toBe(true);expect(workflowToastState.view.phase).toBe('success');w.unmount()
})

it('selects multiple color groups and assigns all their cells through the shared palette',async()=>{
 const {w,save}=await setup();await click(w,'下一步');await click(w,'下一步');await click(w,'下一步')
 expect(w.find('.chart-selection').exists()).toBe(false)
 expect(w.text()).not.toContain('全部色号')
 const groups=w.findAll('.chart-color-tabs button');expect(groups.length).toBe(2)
 await groups[0].trigger('click');await groups[1].trigger('click');await click(w,'更换所选色号')
 await w.find('[aria-label="搜索色号"]').setValue('H7');await w.find('[aria-label="选择 H7"]').trigger('click');await flushPromises()
 await click(w,'保存到画板');expect(save.mock.calls[0][0].cells.every(c=>c==='H7')).toBe(true);w.unmount()
})

it('automatically completes recognition and reaches review without saving',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:1}
 ocrMock.read.mockResolvedValue([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98}])
 const {w,save}=await setup(undefined,false)
 expect(requests).toContain('detect');expect(requests).toContain('map');expect(w.text()).toContain('核对识别结果');expect(w.text()).toContain('8 × 6 格');expect(save).not.toHaveBeenCalled();w.unmount()
})
it('offers a manual fallback at the failed stage without losing partial legend results',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:2}
 ocrMock.read.mockResolvedValue([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'x64',confidence:98},{x:8,y:35,width:20,height:12,text:'B8',confidence:98}])
 const {w}=await setup(undefined,false);expect(w.text()).toContain('需要手动调整');expect(requests).not.toContain('detect')
 await click(w,'改为手动分步');expect(w.findAll('[aria-label^="图例色号"]')).toHaveLength(2);expect(w.find('[aria-label="图例数量 2"]').element).toHaveProperty('value','0');expect(w.find('.needs-review').exists()).toBe(false);w.unmount()
})
it('switches to manual during recognition and ignores the cancelled automatic continuation',async()=>{
 legendBox={x:1,y:1,width:100,height:50,swatches:1};let finish:(v:any[])=>void=()=>{}
 ocrMock.read.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));const {w}=await setup(undefined,false)
 await click(w,'改为手动分步');expect(ocrMock.cancel).toHaveBeenCalled()
 finish([{x:8,y:10,width:20,height:12,text:'A5',confidence:98},{x:32,y:10,width:20,height:12,text:'64',confidence:98}]);await flushPromises()
 expect(requests).not.toContain('detect');expect(w.text()).toContain('切换自动识别');expect(w.text()).toContain('色号汇总表');w.unmount()
})
