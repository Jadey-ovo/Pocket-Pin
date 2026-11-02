<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,shallowRef,watch} from 'vue'
import {colorByCode} from '@/core/project'
import {showConfirmDialog,beginWorkflowToast,updateWorkflowToast,reopenWorkflowToast,closeWorkflowToast,type WorkflowToastView} from '@/shared/feedback'
import BeadColorChip from '@/shared/BeadColorChip.vue'
import ColorPickerSheet from '@/shared/ColorPickerSheet.vue'
import {alignmentFromGrid,fullImageGrid,regionOnGrid,type Alignment} from './alignment'
import ChartRegion from './ChartRegion.vue'
import {boxQuad,parseLegend,parseDigitalLegend,gridPoint,subGrid,validGrid,type Raster,type Grid,type Quad,type Word,type LegendEntry,type ChartResult} from './recognition'
import {compareCounts,reassignCells,countCells} from './review'
import {createChartOcr} from './ocr'
const props=defineProps<{file:File;save:(result:ChartResult)=>Promise<boolean>}>()
const emit=defineEmits<{close:[]}>()
const alignment=ref<Alignment>(),autoRegion=ref<Quad>(),legendEditIndex=ref<number|null>(null),reviewCodes=ref<string[]>([])
const region=ref({left:0,top:0,right:52,bottom:52})
const selectedGrid=computed(()=>grid.value?subGrid(grid.value,region.value.left,region.value.top,region.value.right,region.value.bottom):undefined)
const step=ref<1|2|3|4>(1),busy=ref(false),status=ref(''),progress=ref(0),error=ref(''),notice=ref('')
const raster=shallowRef<Raster>(),src=ref(''),legendQuad=ref<Quad>(boxQuad({x:0,y:0,width:1,height:1})),grid=ref<Grid>(),legend=ref<LegendEntry[]>([]),blankCodes=ref<string[]>([])
const result=shallowRef<ChartResult>(),ocrWords=shallowRef<Word[]>([]),selected=ref<number[]>([]),reviewFilter=ref('mismatch'),cellLimit=ref(168),assignOpen=ref(false)
const dialogRoot=ref<HTMLElement>(),previousFocus=typeof document==='undefined'?null:document.activeElement as HTMLElement|null
const peekIndex=ref<number|null>(null),peekCanvas=ref<HTMLCanvasElement>(),thumbs=shallowRef<string[]>([]),preview=ref('')
const legendManual=ref(false),gridManual=ref(false),legendReady=ref(false),gridReady=ref(false)
const workflowOwner=Symbol('chart-import'),workflowMode=ref<'auto'|'adjusting'|'cancelled'>('auto'),legendExpected=ref(0)
const autoElapsed=ref(0)
let autoStarted=Date.now(),elapsedTimer:ReturnType<typeof setInterval>|undefined
const elapsedLabel=computed(()=>`${Math.floor(autoElapsed.value/60)}:${String(autoElapsed.value%60).padStart(2,'0')}`)
const importMode=ref<'automatic'|'manual'>('automatic'),autoFailed=ref(false)
const automatic=computed(()=>importMode.value==='automatic'&&!result.value)
const overallProgress=computed(()=>automatic.value?Math.min(1,([0,.3,.55,.65][step.value-1]??0)+progress.value*([.3,.25,.1,.35][step.value-1]??0)):progress.value)
let autoRun=0
function manualSteps(){autoRun++;importMode.value='manual';autoFailed.value=false;if(busy.value)stop();if(step.value===4&&!result.value)step.value=3}
async function recognizeAutomatically(){
 if(!raster.value)return
 const token=++autoRun,current=()=>alive&&token===autoRun&&importMode.value==='automatic'
 importMode.value='automatic';autoFailed.value=false;autoStarted=Date.now();autoElapsed.value=0
 if(busy.value)stop()
 error.value='';result.value=undefined
 if(!legendReady.value){step.value=1;await readLegend(legendManual.value);if(!current())return;if(error.value||!legendReady.value){autoFailed.value=true;return}}
 await goStep(2);if(!current())return;if(error.value||!gridReady.value){autoFailed.value=true;return}
 await goStep(3);if(!current())return
 if(!selectedGrid.value||!validGrid(selectedGrid.value,raster.value!)){error.value='未能确定图纸范围，请切换手动分步调整。';autoFailed.value=true;return}
 await goStep(4);if(!current())return;if(error.value||!result.value)autoFailed.value=true
}
let saved=false
let recognitionTimer:ReturnType<typeof setTimeout>|undefined,legendKey=''
let operation=0,progressStart=.1,progressEnd=.9
let worker:Worker|undefined,job=0,alive=true,pending:{id:number;resolve:(v:any)=>void;reject:(e:Error)=>void}|undefined,ocr:ReturnType<typeof createChartOcr>|undefined,longPress:ReturnType<typeof setTimeout>|undefined,held=false
const summary=computed(()=>result.value?compareCounts(result.value,legend.value):[])
const mismatches=computed(()=>summary.value.filter(e=>e.delta!==null&&e.delta!==0))
const filteredCells=computed(()=>result.value?.cells.flatMap((code,i)=>{
 const mismatch=summary.value.find(s=>s.code===code)?.delta
 if(reviewCodes.value.length&&(!code||!reviewCodes.value.includes(code)))return []
 if(reviewFilter.value==='consistent'&&mismatch!==0)return []
 if(reviewFilter.value==='mismatch'&&mismatch===0)return []
 return [i]
})??[])
const legendValid=computed(()=>legend.value.every(e=>colorByCode(e.code)&&e.count!==undefined&&(e.count===null||Number.isInteger(e.count)&&e.count>=0))&&new Set(legend.value.map(e=>e.code)).size===legend.value.length)
const canSave=computed(()=>!!result.value?.cells.some(Boolean))
const title=computed(()=>['色号汇总表','网格对齐','选择图纸区域','核对识别结果'][step.value-1])
function canvasOf(image:Raster){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(image.data),image.width,image.height),0,0);return c}
function run(type:'legend'|'enhance'|'detect'|'map',payload:Record<string,unknown>){
 if(pending)return Promise.reject(new Error('请等待当前识别完成'))
 worker??=new Worker(new URL('./recognition.worker.ts',import.meta.url),{type:'module'})
 return new Promise<any>((resolve,reject)=>{
  const id=++job;pending={id,resolve,reject};worker!.onmessage=e=>{if(!pending||e.data.id!==pending.id||!alive)return;const p=pending;pending=undefined;e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data)}
  worker!.onerror=()=>{pending?.reject(new Error('图纸识别失败，请重试'));pending=undefined}
  // Vue proxies cannot be cloned by postMessage.
  worker!.postMessage({id,type,...payload})
 })
}
function plainGrid(){return JSON.parse(JSON.stringify(selectedGrid.value)) as Grid}
async function goStep(target:1|2|3|4){
 const previousStep=step.value
 stop(busy.value);error.value='';notice.value='';workflowMode.value='auto';step.value=target;if(!automatic.value)reopenWorkflowToast(workflowOwner)
 if(target===1){if(!legendReady.value)await readLegend(legendManual.value);return}
 if(target===2){if(!gridReady.value)await detect();return}
 if(target===3){if(grid.value&&previousStep===2)region.value=regionOnGrid(grid.value,autoRegion.value??grid.value.quad);return}
 await recognize()
}
function adjustRegion(quad:Quad){if(grid.value)region.value=regionOnGrid(grid.value,quad)}
function updateAlignment(value:Alignment){if(!raster.value)return;if(busy.value)stop();alignment.value=value;grid.value=fullImageGrid(value,raster.value);gridReady.value=true;result.value=undefined}
function autoAlign(){if(step.value===2)void detect();else if(grid.value)region.value=regionOnGrid(grid.value,autoRegion.value??grid.value.quad)}
function updateQuad(quad:Quad){
 if(busy.value)stop()
 workflowMode.value='adjusting';error.value=''
 if(step.value===1){legendQuad.value=quad;legendReady.value=false}
 else if(step.value===3)adjustRegion(quad)
 else if(grid.value){grid.value.quad=quad;gridReady.value=true}
 result.value=undefined
}
function adjustmentFinished(){if(step.value===1){clearTimeout(recognitionTimer);recognitionTimer=setTimeout(()=>void readLegend(true),350)}}
function stop(disposeOcr=true){clearTimeout(recognitionTimer);operation++;job++;worker?.terminate();worker=undefined;pending?.reject(new Error('识别已取消'));pending=undefined;if(disposeOcr){ocr?.cancel();ocr=undefined}busy.value=false;status.value='';progress.value=0}
async function task(message:string,work:(isCurrent:()=>boolean)=>Promise<void>){
 if(busy.value)return
 const token=++operation,isCurrent=()=>alive&&operation===token
 busy.value=true;error.value='';workflowMode.value='auto';status.value=message;progress.value=.02;progressStart=.1;progressEnd=.9;if(!automatic.value)reopenWorkflowToast(workflowOwner)
 const timeout=message==='正在保存图纸…'?undefined:setTimeout(()=>{if(!isCurrent())return;stop();if(step.value===1)legendManual.value=true;if(step.value===2){gridManual.value=true;if(!grid.value&&raster.value)grid.value={quad:boxQuad({x:1,y:1,width:raster.value.width-3,height:raster.value.height*.68}),columns:52,rows:52,confidence:0}}if(step.value===2&&grid.value&&raster.value&&!alignment.value){autoRegion.value=grid.value.quad;alignment.value=alignmentFromGrid(grid.value);grid.value=fullImageGrid(alignment.value,raster.value)}error.value='5 秒内未能可靠识别，请调整区域后重试'},5000)
 recognitionTimer=timeout
 try{await work(isCurrent);if(isCurrent())progress.value=1}catch(e){if(isCurrent())error.value=e instanceof Error?e.message:'识别失败，请重试'}finally{clearTimeout(timeout);if(isCurrent()){busy.value=false;status.value=''}}
}
async function detect(){if(!raster.value)return;await task('正在本机识别网格…',async(isCurrent)=>{
 const data=await run('detect',{image:raster.value});if(!isCurrent())return
 raster.value=data.image;src.value=canvasOf(data.image).toDataURL('image/png');legendKey=''
 grid.value=data.grid??{quad:boxQuad({x:1,y:1,width:data.image.width-3,height:data.image.height*.68}),columns:52,rows:52,confidence:0}
 autoRegion.value=grid.value!.quad;alignment.value=alignmentFromGrid(grid.value!);grid.value=fullImageGrid(alignment.value,data.image)
 gridReady.value=!!data.grid;gridManual.value=!data.grid
 if(!data.grid)throw new Error('自动对齐失败，请拖动红色点调整位置、蓝色点调整格子大小')
 })}
function cropCanvas(quad:Quad){const r=raster.value!,left=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.x)))),top=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.y)))),width=Math.max(1,Math.ceil(Math.max(...quad.map(p=>p.x)))-left),height=Math.max(1,Math.ceil(Math.max(...quad.map(p=>p.y)))-top)
 const source=canvasOf(r),c=document.createElement('canvas'),scale=Math.min(3,Math.max(2.6,1800/width),Math.sqrt(3000000/(width*height)));c.width=Math.round(width*scale);c.height=Math.round(height*scale);const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,left,top,width,height,0,0,c.width,c.height)
 return {canvas:c,left,top,scale:c.width/width}
}
async function readWords(canvas:HTMLCanvasElement){
 ocr??=createChartOcr(p=>progress.value=Math.max(progress.value,progressStart+p*(progressEnd-progressStart)))
 return ocr.read(canvas)
}
async function readLegend(manual=false){if(!raster.value)return;await task('正在本机定位色号表…',async(isCurrent)=>{
 try{
  let expectedSwatches=0
  if(!manual){
   const data=await run('legend',{image:raster.value});if(!isCurrent())return
   if(!data.box)throw new Error('未能自动定位色号表，请用对角矩形框选图例区域')
   legendQuad.value=boxQuad(data.box);expectedSwatches=data.box.swatches??0;legendExpected.value=expectedSwatches;progress.value=.12
  }
  const key=JSON.stringify(legendQuad.value)
  if(legendReady.value&&legendKey===key)return
  status.value='正在本机识别色号与数量…'
  const cut=cropCanvas(legendQuad.value),source={width:cut.canvas.width,height:cut.canvas.height,data:cut.canvas.getContext('2d')!.getImageData(0,0,cut.canvas.width,cut.canvas.height).data}
  // Preserve every usable stage. Missing quantities must not erase known codes,
  // including when OCR later fails to load or exceeds its time budget.
  const publish=(entries:LegendEntry[])=>{if(entries.length){legend.value=entries;legendKey=key;legendReady.value=false}}
  const swatches=parseDigitalLegend([],source)
  if(swatches.length>=Math.max(2,expectedSwatches*.9)){publish(swatches);expectedSwatches=Math.max(expectedSwatches,swatches.length);legendExpected.value=expectedSwatches}
  progressStart=.12;progressEnd=.7
  let words=await readWords(cut.canvas);if(!isCurrent())return
  let entries=parseLegend(words,source)
  const digital=parseDigitalLegend(words,source);if(digital.length>=Math.max(2,expectedSwatches*.9))entries=digital
  publish(entries)
  if(!entries.length||entries.length<expectedSwatches*.8||entries.some(e=>e.count===null||e.confidence<65)){
   status.value='正在增强色号表文字…';progress.value=Math.max(progress.value,.72);progressStart=.74;progressEnd=.96
   const data=await run('enhance',{image:source});if(!isCurrent())return
   words=[...words,...await readWords(canvasOf(data.image))];if(!isCurrent())return
   entries=parseLegend(words,source)
   const checked=parseDigitalLegend(words,source);if(checked.length>=Math.max(2,expectedSwatches*.9))entries=checked
   publish(entries)
  }
  if(!entries.length)throw new Error('已定位图例区域，但还没有读出可用色号。请拖动角点，使框内包含完整的色号与数量。')
  if(entries.length<expectedSwatches*.95||entries.some(e=>e.count===null))throw new Error(`已保留 ${entries.length} 个色号${entries.some(e=>e.count===null)?`，其中 ${entries.filter(e=>e.count===null).length} 项数量未识别`:`，图例预计有 ${expectedSwatches} 个色块`}。拖动角点可重新识别，也可直接补全下方结果。`)
  legend.value=entries;legendReady.value=true;legendKey=key;legendManual.value=manual
 }catch(e){if(isCurrent())legendManual.value=true;throw e}
 })}
function validateLegendEdits(){if(legend.value.length&&legendValid.value&&legend.value.every(e=>e.count!==null)&&legend.value.length>=legendExpected.value*.95){legendReady.value=true;error.value='';workflowMode.value='auto'}}
function setCode(index:number,value:string){if(busy.value)stop();const code=value.toUpperCase().trim();legend.value[index].code=code;const color=colorByCode(code);if(color&&!legend.value[index].calibrated)legend.value[index].rgb=[1,3,5].map(i=>parseInt(color.hex.slice(i,i+2),16));validateLegendEdits()}
function setQuantity(index:number,value:string){if(busy.value)stop();legend.value[index].count=value.trim()===''?null:Number(value);validateLegendEdits()}
async function recognize(){if(!raster.value||!grid.value)return;await task('正在逐格识别色号…',async(isCurrent)=>{
 if(!selectedGrid.value||!validGrid(selectedGrid.value,raster.value!))throw new Error('请调整选区或网格大小，避免格子过小')
 // Calibrated swatches map all cells first. OCR only a bounded sheet of ambiguous
 // cells, instead of thousands of labels in the complete drawing.
 let data=await run('map',{image:raster.value,grid:plainGrid(),legend:JSON.parse(JSON.stringify(legend.value)),words:[],blankCodes:[...blankCodes.value]})
 if(!isCurrent())return
 progress.value=.2
 const candidates:number[]=data.result.uncertain.slice(0,64)
 ocrWords.value=[]
 if(candidates.length){
  const sheet=canvasOf(data.sheet),tile=56,cols=8,c=document.createElement('canvas');c.width=cols*tile;c.height=Math.ceil(candidates.length/cols)*tile
  const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)
  const g=selectedGrid.value!,sw=sheet.width/g.columns,sh=sheet.height/g.rows
  candidates.forEach((i,k)=>ctx.drawImage(sheet,(i%g.columns+.08)*sw,(Math.floor(i/g.columns)+.08)*sh,sw*.84,sh*.84,k%cols*tile+4,Math.floor(k/cols)*tile+4,tile-8,tile-8))
  progressStart=.25;progressEnd=.85
  try{
   const words=await readWords(c);if(!isCurrent())return
   ocrWords.value=words.flatMap(w=>{const k=Math.floor((w.y+w.height/2)/tile)*cols+Math.floor((w.x+w.width/2)/tile),i=candidates[k];if(i===undefined)return []
    const p=gridPoint(g.quad,(i%g.columns+.5)/g.columns,(Math.floor(i/g.columns)+.5)/g.rows)
    return [{...w,x:p.x-.5,y:p.y-.5,width:1,height:1}]
   })
  }catch(e){if(!isCurrent())throw e;notice.value='部分格子文字未识别，请核对标记的格子'}
  progress.value=.9
  data=await run('map',{image:raster.value,grid:plainGrid(),legend:JSON.parse(JSON.stringify(legend.value)),words:ocrWords.value,blankCodes:[...blankCodes.value]})
 }
 if(!isCurrent())return
 result.value=data.result;selected.value=[];reviewFilter.value=summary.value.every(s=>s.delta===0)?'consistent':'mismatch';reviewCodes.value=[];step.value=4;cellLimit.value=168;thumbs.value=[canvasOf(data.sheet).toDataURL('image/jpeg',.88)];drawPreview()
 })}

function thumbStyle(i:number){const width=result.value?.width??1;return {backgroundImage:`url(${thumbs.value[0]??''})`,backgroundSize:`${width*100}% ${(result.value?.height??1)*100}%`,backgroundPosition:`${width===1?0:i%width/(width-1)*100}% ${result.value?.height===1?0:Math.floor(i/width)/((result.value?.height??2)-1)*100}%`}}
function drawPreview(){if(!result.value)return;const p=result.value,c=document.createElement('canvas');c.width=p.width*5;c.height=p.height*5;const ctx=c.getContext('2d')!;ctx.fillStyle='#fffdf6';ctx.fillRect(0,0,c.width,c.height);p.cells.forEach((code,i)=>{if(code){ctx.fillStyle=colorByCode(code)!.hex;ctx.fillRect(i%p.width*5,Math.floor(i/p.width)*5,5,5)}});preview.value=c.toDataURL()}
function toggle(i:number){if(held){held=false;return}selected.value=selected.value.includes(i)?selected.value.filter(n=>n!==i):[...selected.value,i]}
function press(i:number,e:PointerEvent){if(e.button!==0)return;held=false;clearTimeout(longPress);longPress=setTimeout(()=>{held=true;void peek(i)},450)}
function release(){clearTimeout(longPress)}
async function peek(i:number){peekIndex.value=i;await nextTick();const c=peekCanvas.value;if(!c||!grid.value||!raster.value||!result.value)return
 const p=result.value,x=i%p.width,y=Math.floor(i/p.width),source=new Image();source.src=thumbs.value[0];await source.decode();if(peekIndex.value!==i)return;const ctx=c.getContext('2d')!;c.width=c.height=360
 ctx.fillStyle='#fffdf6';ctx.fillRect(0,0,360,360)
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=p.width||yy>=p.height)continue
  const tw=source.naturalWidth/p.width,th=source.naturalHeight/p.height
  ctx.drawImage(source,xx*tw,yy*th,tw,th,(dx+3)*360/7,(dy+3)*360/7,360/7,360/7)
 }
 ctx.strokeStyle='#37a6ed';ctx.lineWidth=4;ctx.strokeRect(3*360/7,3*360/7,360/7,360/7)
}
function chooseColor(code:string){if(legendEditIndex.value!==null){setCode(legendEditIndex.value,code);legendEditIndex.value=null;return}assign(code)}
function assign(code:string|null){if(!result.value)return;const indices=[...new Set([...selected.value,...result.value.cells.flatMap((c,i)=>c&&reviewCodes.value.includes(c)?[i]:[])])];if(!indices.length)return;result.value=reassignCells(result.value,indices,code);selected.value=[];reviewCodes.value=[];assignOpen.value=false;drawPreview()}
async function save(){if(!result.value||!canSave.value)return;await task('正在保存图纸…',async()=>{if(await props.save({...result.value!,counts:countCells(result.value!.cells)})){saved=true;emit('close')}else throw new Error('保存失败，识别结果已保留，请重试')})}
async function close(){if(status.value==='正在保存图纸…')return;if(busy.value)stop();if(result.value){try{await showConfirmDialog({title:'退出图纸识别？',message:'本次识别和校对尚未保存。'})}catch{return}}emit('close')}
const workflowView=computed<WorkflowToastView>(()=>{
 if(!raster.value&&!error.value)return {phase:'running',title:'正在准备原图',message:'正在本机读取图片。',progress:0}
 if(busy.value)return {phase:'running',title:step.value===1?'正在识别色号表':step.value===2?'正在对齐网格':'正在识别图纸',message:'本机识别中，可以继续调整。',progress:overallProgress.value}
 if(error.value)return {phase:'attention',title:'请核对识别结果',message:error.value}
 return {phase:'success',title:step.value===1?'色号表识别完成':step.value===2?'网格已自动对齐':step.value===3?'请选择图纸区域':'图纸识别完成',message:step.value===1?`已识别 ${legend.value.length} 色，请确认`:step.value===2?'拖动红色点调整位置，蓝色点调整格子大小。':step.value===3?'拖动四个角点调整区域。':'可选择色号批量修改。'}
})
beginWorkflowToast(workflowOwner,workflowView.value)
closeWorkflowToast()
watch(automatic,(value,previous)=>{if(previous&&!value)reopenWorkflowToast(workflowOwner)})
watch(workflowView,view=>updateWorkflowToast(workflowOwner,view))
function handleKey(e:KeyboardEvent){if(e.key==='Tab'){const scope=document.querySelector('.shared-color-sheet')??dialogRoot.value?.querySelector('.chart-modal section')??dialogRoot.value;const items=[...(scope?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')??[]),...(scope===dialogRoot.value?document.querySelectorAll<HTMLElement>('.pin-workflow-toast button:not(:disabled)'):[])];if(items?.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return}if(e.key==='Escape'){if(peekIndex.value!==null)peekIndex.value=null;else if(assignOpen.value)assignOpen.value=false;else void close()}}
onMounted(async()=>{elapsedTimer=setInterval(()=>{if(automatic.value&&!autoFailed.value)autoElapsed.value=Math.floor((Date.now()-autoStarted)/1000)},250);window.addEventListener('keydown',handleKey);await nextTick();dialogRoot.value?.querySelector<HTMLElement>('button')?.focus();const image=new Image(),url=URL.createObjectURL(props.file)
 image.onload=async()=>{URL.revokeObjectURL(url);if(!alive)return;const scale=Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.naturalWidth*scale));c.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);raster.value={width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};src.value=c.toDataURL();legendQuad.value=boxQuad({x:1,y:1,width:c.width-3,height:c.height-3});if(importMode.value==='automatic')await recognizeAutomatically();else await readLegend()}
 image.onerror=()=>{URL.revokeObjectURL(url);autoFailed.value=true;error.value='图片读取失败，请重新选择 PNG、JPG 或 WebP 图片'};image.src=url
})
onUnmounted(()=>{clearInterval(elapsedTimer);autoRun++;alive=false;stop();release();updateWorkflowToast(workflowOwner,{phase:saved?'success':'waiting',title:saved?'图纸已保存':'已退出图纸导入',message:saved?'识别结果已保存到画板。':result.value||legend.value.length?'本次导入已结束，未保存的识别结果没有写入画板。':'本次导入已结束。',actions:[]});window.removeEventListener('keydown',handleKey);previousFocus?.focus()})
</script>

<template>
 <Teleport to="body"><section ref="dialogRoot" class="chart-import" :class="{'chart-import-automatic':automatic}" role="dialog" aria-modal="true" aria-label="导入图纸识别" aria-owns="global-workflow-toast">
  <header class="chart-header"><button class="chart-icon" aria-label="关闭图纸导入" @click="close">×</button><div><small>MARD 211 色 · 导入图纸</small><h2>{{automatic?'自动识别图纸':title}}</h2></div><button class="chart-status-toggle" @click="reopenWorkflowToast(workflowOwner)">识别状态</button><span>{{step}} / 4</span></header>
  <nav class="chart-steps" aria-label="识别步骤"><span v-for="(name,i) in ['色号表','对齐网格','选择区域','校对保存']" :key="name" :class="{current:step===i+1,done:step>i+1}" :aria-current="step===i+1?'step':undefined">{{i+1}} {{name}}</span></nav>
  <main class="chart-body" :aria-busy="busy">
   <section v-if="automatic" class="chart-auto" aria-label="自动识别流程">
    <button class="chart-manual-switch" @click="manualSteps">改为手动分步</button>
    <div class="chart-auto-dots" aria-hidden="true"><i v-for="i in 4" :key="i" :class="{current:step===i,done:step>i}"/></div>
    <h2>{{autoFailed?'需要手动调整':'自动识别中'}} · {{elapsedLabel}}</h2>
    <p class="chart-auto-caption">{{autoFailed?'已保留识别结果，可切换手动分步继续':'在本机自动识别，完成后进入校对'}}</p>
    <progress :value="overallProgress" max="1" aria-label="自动识别总进度"/>
    <p v-if="autoFailed" class="chart-error">{{error}}</p>
    <ol class="chart-auto-stages">
     <li :class="{done:!!raster,current:!raster}"><span class="chart-stage-icon">{{raster?'✓':'1'}}</span><div><strong>准备原图</strong><small>{{raster?'就绪':'读取中…'}}</small></div></li>
     <li class="chart-analysis-stage" :class="{done:step===4,current:step<4&&!!raster}"><div class="chart-stage-heading"><span class="chart-stage-icon">{{step===4?'✓':'2'}}</span><strong>解析图纸</strong></div><div class="chart-analysis-parts"><div v-for="(label,i) in ['读取图例','对齐网格','选择范围']" :key="label" :class="{done:step>i+1,current:step===i+1&&!!raster}"><b>{{step>i+1?'✓':step===i+1?'◌':'○'}} {{label}}</b><small>{{step>i+1?'已完成':step===i+1?(autoFailed?'待调整':'识别中…'):'等待中'}}</small></div></div></li>
     <li :class="{current:step===4}"><span class="chart-stage-icon">3</span><strong>逐格识别</strong><small>{{step===4?(autoFailed?'待调整':'识别中…'):'等待中'}}</small></li>
     <li><span class="chart-stage-icon">4</span><strong>校对保存</strong><small>等待中</small></li>
    </ol>
    <button v-if="autoFailed" class="chart-auto-retry" @click="recognizeAutomatically">重新自动识别</button>
   </section>
   <div v-if="!automatic&&step<4" class="chart-actions"><button :disabled="busy" @click="recognizeAutomatically">切换自动识别</button></div>
   <template v-if="raster&&step<4">
    <chart-region :src="src" :width="raster.width" :height="raster.height" :quad="step===1?legendQuad:step===3&&selectedGrid?selectedGrid.quad:grid?.quad??legendQuad" :columns="step===3?selectedGrid?.columns:undefined" :rows="step===3?selectedGrid?.rows:undefined" :rectangular="step!==2" :editable="!automatic" :grid-only="step===2" :alignment="alignment" @update:alignment="updateAlignment" @update:quad="updateQuad" @finish="adjustmentFinished"/>
    <div v-if="!automatic&&(step===2||step===3)" class="chart-actions"><button :disabled="busy" @click="autoAlign">自动对齐</button></div>
    <template v-if="step===1&&!automatic">
     <p class="chart-notice">已识别 {{legend.length}} 色，请确认</p>
     <div class="chart-legend" aria-label="识别的色号与数量"><div v-for="(entry,i) in legend" :key="i"><button class="chart-legend-color" :aria-label="`图例色号 ${i+1}`" @click="legendEditIndex=i;assignOpen=true"><bead-color-chip :code="entry.code"/></button><input :value="entry.count??0" type="number" inputmode="numeric" min="0" step="1" :aria-label="`图例数量 ${i+1}`" @focus="($event.target as HTMLInputElement).select()" @input="setQuantity(i,($event.target as HTMLInputElement).value)"/></div></div>
     <p v-if="!legendValid" class="chart-error">请修正无效或重复的色号；数量须为非负整数，也可留空。</p>
    </template>
    <template v-if="step===3&&!automatic">
     <label class="chart-check"><input type="checkbox" :checked="blankCodes.includes('H2')" @change="blankCodes=($event.target as HTMLInputElement).checked?['H2']:[]"/>将 H2 白色格设为空白（白色图案也会移除）</label>
    </template>
   </template>
   <chart-region v-if="step===4&&!result&&raster" :src="src" :width="raster.width" :height="raster.height" :quad="selectedGrid?.quad??legendQuad" :columns="selectedGrid?.columns" :rows="selectedGrid?.rows"/>
   <template v-if="step===4&&result">
    <div class="chart-review-top"><img :src="preview" alt="识别后的图纸预览"/><div><b>{{result.width}} × {{result.height}} 格 · {{Object.keys(countCells(result.cells)).length}} 色</b><p>{{result.cells.filter(Boolean).length}} 颗 · {{result.uncertain.length}} 格待核对</p><button @click="peek(0)">查看原图位置</button></div></div>
    <div class="chart-actions" aria-label="校对筛选"><button v-for="filter in ['consistent','mismatch']" :key="filter" :aria-pressed="reviewFilter===filter" @click="reviewFilter=filter;reviewCodes=[];selected=[];cellLimit=168">{{filter==='consistent'?'一致':'不一致'}} {{summary.filter(s=>filter==='consistent'?s.delta===0:s.delta!==0).length}}</button></div>
    <div class="chart-color-tabs"><button v-for="s in summary.filter(s=>reviewFilter==='consistent'?s.delta===0:s.delta!==0)" :key="s.code" :aria-pressed="reviewCodes.includes(s.code)" @click="reviewCodes=reviewCodes.includes(s.code)?reviewCodes.filter(c=>c!==s.code):[...reviewCodes,s.code];cellLimit=168"><bead-color-chip :code="s.code"/><small>{{s.actual}}{{s.expected===null?'':` / ${s.expected}`}}</small></button></div>
    <div v-if="selected.length||reviewCodes.length" class="chart-actions"><button @click="legendEditIndex=null;assignOpen=true">更换所选色号</button></div>
    <div class="chart-cell-list" aria-label="逐格校对"><button v-for="i in filteredCells.slice(0,cellLimit)" :key="i" :style="thumbStyle(i)" :class="{selected:selected.includes(i),uncertain:result.uncertain.includes(i)}" :aria-label="`第 ${Math.floor(i/result.width)+1} 行第 ${i%result.width+1} 列 ${result.cells[i]??'空白'}`" :aria-pressed="selected.includes(i)" @click="toggle(i)" @pointerdown="press(i,$event)" @pointerup="release" @pointerleave="release" @pointercancel="release" @contextmenu.prevent="peek(i)"><span>{{result.cells[i]??'空白'}}</span></button></div>
    <p v-if="!filteredCells.length">当前筛选没有格子。</p><button v-if="filteredCells.length>cellLimit" @click="cellLimit+=168">继续加载（{{cellLimit}} / {{filteredCells.length}}）</button>

   </template>
  </main>
  <footer v-if="!automatic" class="chart-footer"><button @click="step===1?close():goStep((step-1) as 1|2|3)">{{step===1?'取消':'上一步'}}</button><button v-if="step===1" class="primary" :disabled="!raster||!legendValid" @click="goStep(2)">下一步</button><button v-else-if="step===2" class="primary" :disabled="!grid||!raster||!validGrid(grid,raster)" @click="goStep(3)">下一步</button><button v-else-if="step===3" class="primary" @click="goStep(4)">下一步</button><button v-else class="primary" :disabled="busy||!canSave" @click="save">保存到画板</button></footer>

  <div v-if="peekIndex!==null" class="chart-modal" @click.self="peekIndex=null"><section role="dialog" aria-modal="true" aria-label="原图位置"><header><h3>原图位置</h3><button aria-label="关闭原图位置" @click="peekIndex=null">×</button></header><canvas ref="peekCanvas" aria-label="当前格及周围原图，蓝框为当前格"/><p>第 {{Math.floor(peekIndex/(result?.width??1))+1}} 行，第 {{peekIndex%(result?.width??1)+1}} 列 · {{result?.cells[peekIndex]??'空白'}}</p><button @click="selected=[peekIndex];peekIndex=null;assignOpen=true">修改这一格色号</button></section></div>
  <color-picker-sheet v-model:show="assignOpen" :teleport="true" :color="legendEditIndex!==null?legend[legendEditIndex]?.code:reviewCodes[0]??''" @choose="chooseColor"/>

 </section></Teleport>
</template>

<style scoped>
.chart-import-automatic .chart-header{position:absolute;top:12px;left:12px;border:0;padding:0;z-index:3}.chart-import-automatic .chart-header>div,.chart-import-automatic .chart-header>.chart-status-toggle,.chart-import-automatic .chart-header>span,.chart-import-automatic .chart-steps{display:none}.chart-import-automatic .chart-icon{border-radius:50%;box-shadow:0 3px 12px #0001}.chart-import.chart-import-automatic .chart-body{display:flex;flex-direction:column;width:100%;padding:0;margin:0;background:#e6e8e8}.chart-import-automatic :deep(.chart-image-viewport){order:1;flex:none;height:44dvh;border-radius:0;background:#e6e8e8}.chart-auto{order:2;flex:1;padding:22px max(20px,calc((100% - 560px)/2)) 28px;background:var(--animal-paper,#fffdf6);border-radius:28px 28px 0 0;display:flex;flex-direction:column;align-items:center}.chart-import .chart-manual-switch{font-size:12px;min-height:34px;padding:7px 16px;border-radius:22px;background:transparent;border-color:#e8e5df}.chart-auto-dots{display:flex;gap:7px;justify-content:center;margin:18px 0 16px}.chart-auto-dots i{width:7px;height:7px;border-radius:8px;background:#e1e3df}.chart-auto-dots i.current{width:24px;background:#438d70}.chart-auto-dots i.done{background:#81aa94}.chart-auto h2{font-size:20px;margin:0;color:var(--animal-text,#574337)}.chart-auto .chart-auto-caption{margin:8px 0;color:var(--animal-muted,#93877c);font-size:12px;text-align:center}.chart-auto progress{width:100%;height:3px;margin:8px 0 16px;accent-color:#438d70}.chart-auto-stages{list-style:none;padding:0;margin:0;width:100%;display:grid;gap:10px}.chart-auto-stages>li{display:flex;align-items:center;gap:10px;border:1px solid #eae8e1;border-radius:16px;padding:16px;color:#a0a29c;font-size:14px}.chart-auto-stages strong{font-size:14px;font-weight:600}.chart-auto-stages small{font-size:11px;font-weight:400;margin-left:auto}.chart-auto-stages>li>div>small{display:block;margin-top:6px}.chart-stage-icon{width:24px;flex:none;font-size:18px;text-align:center}.chart-auto-stages .current{color:var(--animal-text,#574337)}.chart-auto-stages .done .chart-stage-icon{color:#349675}.chart-auto-stages>li.chart-analysis-stage{display:block}.chart-stage-heading{display:flex;gap:10px;align-items:center}.chart-analysis-parts{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px;margin-top:14px}.chart-analysis-parts>div{padding:12px;border-radius:12px;background:#f1f2ef;font-size:12px;color:#a0a29c}.chart-analysis-parts>div:first-child{grid-row:span 2}.chart-analysis-parts b{font-weight:600}.chart-analysis-parts small{display:block;margin-top:8px;color:#999d96}.chart-auto-retry{margin-top:16px}
.chart-import{position:fixed;inset:0;z-index:600;background:var(--animal-bg,#f8f3e8);color:var(--animal-text,#574337);display:flex;flex-direction:column;font-family:inherit}.chart-import button{font:inherit;cursor:pointer;border:1px solid var(--animal-border,#e1d7c5);background:var(--animal-paper,#fffdf6);color:inherit;border-radius:14px;padding:10px 14px;min-height:42px}.chart-import button:disabled{opacity:.45;cursor:default}.chart-import button:focus-visible,.chart-import input:focus-visible{outline:3px solid #55b79c;outline-offset:2px}.chart-header{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--animal-border)}.chart-header div{flex:1}.chart-header h2{font-size:18px;margin:3px 0}.chart-header small{color:var(--animal-muted);font-size:11px}.chart-icon{font-size:22px!important;width:42px;padding:0!important}.chart-steps{display:flex;justify-content:center;gap:18px;padding:12px 16px;font-size:12px;flex-wrap:wrap}.chart-steps span{color:var(--animal-muted)}.chart-steps .current{color:#26896e;font-weight:800}.chart-steps .done{color:#5c927c}.chart-body{overflow:auto;flex:1;min-height:0;width:min(100%,960px);margin:auto;padding:4px 20px 28px}.chart-body p{font-size:13px;line-height:1.65}.chart-notice{padding:12px 16px;background:#d4e2d4;border-radius:14px;color:#284b3c;font-weight:700}.chart-error{padding:10px 14px;background:#fbe4dc;border-radius:14px;color:#9e4234}.chart-help{color:var(--animal-muted)}.chart-actions,.chart-dimensions,.chart-selection{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}.chart-actions button[aria-pressed=true]{background:#dceee3;border-color:#80b79e}.chart-dimensions label{display:flex;align-items:center;gap:6px}.chart-import input:not([type=checkbox]){background:var(--animal-paper);border:1px solid var(--animal-border);color:inherit;border-radius:10px;padding:10px;font:inherit;min-width:0}.chart-dimensions input{width:78px}.chart-legend{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.chart-legend>div{display:flex;flex-direction:column;gap:6px;align-items:center;padding:8px 4px;border-radius:12px}.chart-import .chart-legend-color{padding:0;border:0;background:transparent;min-height:0;flex:none;width:clamp(40px,10vw,60px);height:clamp(40px,10vw,60px)}.chart-legend-color :deep(.bead-color-chip){width:100%;height:100%;min-width:0;font-size:12px;border-radius:12px}.chart-import .chart-legend input[type=number]{flex:none;width:clamp(40px,10vw,60px);box-sizing:border-box;text-align:center;font-size:12px;padding:7px 2px;appearance:textfield;-moz-appearance:textfield}.chart-legend input::-webkit-inner-spin-button,.chart-legend input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.chart-legend i,.chart-palette i,.chart-color-tabs i{display:block;width:26px;height:26px;border-radius:8px;flex:none;border:1px solid #0001}.chart-check{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.6;padding:12px;margin:12px 0;background:var(--animal-paper);border-radius:14px}.chart-check input{accent-color:#388d70;margin-top:4px}.chart-footer{display:flex;gap:12px;padding:12px max(20px,calc((100vw - 920px)/2)) max(12px,env(safe-area-inset-bottom));border-top:1px solid var(--animal-border);background:var(--animal-bg)}.chart-footer button{flex:1}.chart-import .primary{background:#438d70;color:#fff;border-color:#438d70;font-weight:700}.chart-review-top{display:flex;gap:14px;align-items:center}.chart-review-top>img{width:100px;max-height:130px;object-fit:contain;image-rendering:pixelated;border-radius:8px;background:var(--animal-paper)}.chart-review-top b{font-size:15px}.chart-review-top p{margin:5px 0}.chart-color-tabs{display:flex;gap:8px;overflow:auto;padding:10px 0}.chart-color-tabs button{flex:none;min-width:76px;display:flex;align-items:center;flex-direction:row;gap:8px;padding:8px}.chart-color-tabs button[aria-pressed=true]{border:2px solid #388d70}.chart-color-tabs small{font-size:10px;white-space:nowrap}.chart-color-tabs em{font-style:normal;font-size:10px;color:#347d60}.chart-color-tabs .diff{color:#b44a3b}.chart-cell-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px}.chart-cell-list button{position:relative;aspect-ratio:1;padding:0;overflow:hidden;background-color:#eee;border:2px solid transparent;border-radius:12px;touch-action:pan-y;user-select:none;-webkit-touch-callout:none}.chart-cell-list button span{position:absolute;bottom:0;inset-inline:0;background:#1b261fbb;color:white;font-size:10px;padding:3px}.chart-cell-list .selected{border:3px solid #279478;box-shadow:0 0 0 2px #b5d9c6}.chart-cell-list .uncertain::after{content:'?';position:absolute;right:3px;top:3px;color:#663a0b;background:#ffdaa0;border-radius:10px;width:18px;height:18px;font-weight:bold;font-size:12px}.chart-selection{font-size:11px;position:sticky;top:0;background:var(--animal-bg);z-index:2;padding:8px 0}.chart-selection button{min-height:34px;padding:7px 9px}.chart-modal{position:fixed;inset:0;z-index:610;display:grid;place-items:center;background:#1c272878;padding:20px}.chart-modal>section{background:var(--animal-bg);padding:20px;border-radius:24px;width:min(100%,500px);max-height:85dvh;overflow:auto;box-shadow:0 18px 60px #0003}.chart-modal header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.chart-modal h3{margin:0;font-size:18px}.chart-modal canvas{width:100%;border-radius:12px;image-rendering:auto}.chart-modal p{font-size:12px}.chart-modal input{width:100%}.chart-palette{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:15px}.chart-palette button{display:flex;align-items:center;gap:6px;font-size:11px;padding:8px}.chart-status-toggle{font-size:12px!important;min-height:34px!important;padding:7px 10px!important}

@media(max-width:520px){.chart-header{padding:10px 14px}.chart-body{padding-inline:14px}.chart-steps{gap:10px;font-size:11px}.chart-palette{grid-template-columns:repeat(3,1fr)}.chart-footer{padding-inline:14px}.chart-legend{gap:6px}.chart-legend>div{padding:6px 2px}}
</style>
