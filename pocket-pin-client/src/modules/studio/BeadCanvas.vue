<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { colorByCode, type Tool } from '@/core/project'
import { bounds, rectIndices, gridOpacity, lineCells, selectionRect, zoomAround, type Cells, type Rect } from './engine/operations'
const props = withDefaults(defineProps<{ width: number; height: number; cells: Cells; tool: Tool; color: string; grid?: 'auto'|'off'|'always'; coordinates?: boolean; boards?: boolean; codes?: boolean; round?: boolean; locked?: boolean; visible?: boolean; selection?: Rect|null; cleanSelection?:boolean;referenceEditing?:boolean;beadOpacity?:number; highlights?: number[]; reference?: string; referenceOpacity?: number; referenceScale?: number; referenceX?: number; referenceY?: number }>(), { grid:'auto', visible:true, highlights:()=>[], referenceOpacity:.35, referenceScale:1, referenceX:0, referenceY:0 })
const emit = defineEmits<{ change: [cells: Cells]; pick: [code: string]; focus: [index: number]; select: [rect: Rect]; place: [index: number]; scale: [value: number]; busy: [value: boolean]; context: [value: string];referenceTransform:[value:{scale:number;x:number;y:number}] }>()
const host = ref<HTMLElement|null>(null), canvas = ref<HTMLCanvasElement|null>(null), hint = ref('双指缩放与移动'), scaleLabel = ref(100)
let size = 12, ox = 0, oy = 0, vw = 1, vh = 1, frame = 0, observer: ResizeObserver | undefined, fitted = false, refImage: HTMLImageElement | null = null
let previewView:{size:number;x:number;y:number}|null=null
function beginPreview(){if(previewView)return;resetGesture();previewView={size,x:ox,y:oy};fit(true)}
function endPreview(){if(!previewView)return;size=previewView.size;ox=previewView.x;oy=previewView.y;previewView=null;scaleLabel.value=Math.round(size/12*100);emit('scale',scaleLabel.value);schedule()}
const pointers = new Map<number, { x: number; y: number }>()
let magnifierLeft = true
let navigating = false, draft: Cells|null = null, last = -1, startIndex = -1, endIndex = -1, pointerKind = '', focusIndex = -1, downTool: Tool = 'pan'
function point(e: PointerEvent | WheelEvent) { const r = host.value!.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top } }
function indexAt(p: {x:number;y:number}) { const x=Math.floor((p.x-ox)/size), y=Math.floor((p.y-oy)/size); return x<0||x>=props.width||y<0||y>=props.height ? -1 : y*props.width+x }
function clampedIndexAt(p:{x:number;y:number}) { const x=Math.max(0,Math.min(props.width-1,Math.floor((p.x-ox)/size))),y=Math.max(0,Math.min(props.height-1,Math.floor((p.y-oy)/size)));return y*props.width+x }
function constrain() { ox=Math.min(vw-32, Math.max(32-props.width*size,ox)); oy=Math.min(vh-32,Math.max(32-props.height*size,oy)) }
function schedule() { if(!frame) frame=requestAnimationFrame(()=>{frame=0;draw()}) }
function zoomTo(next: number, p = {x:vw/2,y:vh/2}) { const view=zoomAround({x:ox,y:oy,size},p,Math.max(.25,Math.min(96,next))); size=view.size;ox=view.x;oy=view.y;constrain();scaleLabel.value=Math.round(size/12*100);emit('scale',scaleLabel.value);schedule() }
function pinchTo(next:number,from:{x:number;y:number},to:{x:number;y:number}){const view=zoomAround({x:ox,y:oy,size},from,Math.max(.25,Math.min(96,next)));size=view.size;ox=view.x+to.x-from.x;oy=view.y+to.y-from.y;constrain();scaleLabel.value=Math.round(size/12*100);emit('scale',scaleLabel.value);schedule()}
function fit(content=false) { if(host.value){const viewport=host.value.getBoundingClientRect();vw=viewport.width;vh=viewport.height} const r=content?bounds(props.cells,props.width,props.height):{x:0,y:0,width:props.width,height:props.height};size=Math.max(.25,Math.min(32,Math.min((vw-48)/r.width,(vh-48)/r.height)));ox=(vw-r.width*size)/2-r.x*size;oy=(vh-r.height*size)/2-r.y*size;fitted=true;scaleLabel.value=Math.round(size/12*100);emit('scale',scaleLabel.value);schedule() }
function cancelDraft() { draft=null;last=startIndex=endIndex=-1;focusIndex=-1;schedule() }
function report(i:number){if(['pencil','eraser'].includes(props.tool)&&i>=0)emit('context',`第${i%props.width+1}列 · 第${Math.floor(i/props.width)+1}行 · ${props.cells[i]||'空格'}`)}
function resetGesture() { emit('context',''); pointers.clear();navigating=false;cancelDraft();emit('busy',false) }
function paint(index:number) { if(index<0){last=-1;return} if(!draft)draft=[...props.cells]; for(const i of last<0?[index]:lineCells(last,index,props.width))draft[i]=downTool==='eraser'?null:props.color;last=index;focusIndex=index;schedule() }
function down(e:PointerEvent) {
  if(previewView)return
  if(e.button!==0&&e.button!==1&&e.button!==2)return
  host.value!.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));emit('busy',true)
  if(pointers.size>1){navigating=true;cancelDraft();return}
  magnifierLeft=point(e).x>=vw/2;pointerKind=e.pointerType;downTool=props.tool;navigating=props.tool==='pan'||e.button!==0
  if(navigating)return
  if(props.locked&&props.tool!=='eyedropper') { hint.value='图纸已锁定，请先在设置中解锁';return }
  const p=point(e),i=indexAt(p);if(i<0)return
  startIndex=endIndex=i;focusIndex=i;report(i)
  if(props.tool==='pencil'||props.tool==='eraser')paint(i)

  schedule()
}
function move(e:PointerEvent) {
  if(!pointers.has(e.pointerId))return
  const before=[...pointers.values()],old=pointers.get(e.pointerId)!,p=point(e);pointers.set(e.pointerId,p)
  if(props.referenceEditing){let scale=props.referenceScale,x=props.referenceX,y=props.referenceY;if(pointers.size>=2){const after=[...pointers.values()],a=before[0],b=before[1],c=after[0],d=after[1],dist=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;const next=Math.max(.05,Math.min(8,scale*Math.hypot(c.x-d.x,c.y-d.y)/Math.max(1,dist))),factor=next/scale;x+=(cx-ox-x*size)*(1-factor)/size+((c.x+d.x)/2-cx)/size;y+=(cy-oy-y*size)*(1-factor)/size+((c.y+d.y)/2-cy)/size;scale=next}else{x+=(p.x-old.x)/size;y+=(p.y-old.y)/size}emit('referenceTransform',{scale,x,y});schedule();return}
  if(pointers.size>=2){const after=[...pointers.values()],a=before[0],b=before[1],c=after[0],d=after[1],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},nextMid={x:(c.x+d.x)/2,y:(c.y+d.y)/2},dist=Math.hypot(a.x-b.x,a.y-b.y);if(dist>0)pinchTo(size*Math.hypot(c.x-d.x,c.y-d.y)/dist,mid,nextMid);return}
  if(navigating){ox+=p.x-old.x;oy+=p.y-old.y;constrain();schedule();return}
  if(startIndex<0)return
  const i=downTool==='fill'||downTool==='select'?clampedIndexAt(p):indexAt(p);if(i>=0){endIndex=i;focusIndex=i;report(i);hint.value=`第 ${i%props.width+1} 列 · 第 ${Math.floor(i/props.width)+1} 行 · ${props.cells[i]||'空格'}`}
  if((downTool==='paste'||downTool==='move')&&i>=0)emit('place',i);if(downTool==='pencil'||downTool==='eraser')paint(i);else schedule()
}
function up(e:PointerEvent) {
  if(!pointers.has(e.pointerId))return
  const valid=!navigating&&e.type==='pointerup'&&startIndex>=0
  if(valid){
    const p=point(e),i=downTool==='fill'||downTool==='select'?clampedIndexAt(p):indexAt(p);
    // A captured release outside the board must not discard work done inside it.
    if(draft){
      if(i>=0&&(downTool==='pencil'||downTool==='eraser'))paint(i);
      if(draft.some((c,j)=>c!==props.cells[j]))emit('change',draft);
    } else if(i>=0){
      if(downTool==='fill'&&!props.locked){const cells=[...props.cells];rectIndices(selectionRect(startIndex,i,props.width),props.width).forEach(j=>cells[j]=props.color);if(cells.some((c,j)=>c!==props.cells[j]))emit('change',cells)}
      else if(downTool==='eyedropper'){if(props.cells[i])emit('pick',props.cells[i]!)}
      else if(downTool==='recolor')emit('focus',i)
      else if(downTool==='select')emit('select',selectionRect(startIndex,i,props.width))
      else if(downTool==='paste'||downTool==='move')emit('place',i)
    }
  }
  pointers.delete(e.pointerId);cancelDraft();if(!pointers.size){navigating=false;emit('busy',false)}else navigating=true
}
function wheel(e:WheelEvent){
  if(previewView)return;
  e.preventDefault();
  const unit=e.deltaMode===1?16:e.deltaMode===2?vh:1;
  const delta=(e.deltaY||e.deltaX)*unit;
  if(!Number.isFinite(delta)||!delta)return;
  resetGesture();
  zoomTo(size*Math.exp(-Math.max(-600,Math.min(600,delta))*.002),point(e));
}
function draw() {
  const el=canvas.value;if(!el)return
  const dpr=Math.min(window.devicePixelRatio||1,3),w=Math.round(vw*dpr),h=Math.round(vh*dpr)
  if(el.width!==w||el.height!==h){el.width=w;el.height=h}
  const ctx=el.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,vw,vh)
  const tokens=getComputedStyle(host.value!),paper=tokens.getPropertyValue('--animal-paper').trim(),ink=tokens.getPropertyValue('--animal-text').trim(),primary=tokens.getPropertyValue('--animal-primary').trim(),border=tokens.getPropertyValue('--animal-border').trim()
  ctx.fillStyle=paper;ctx.fillRect(ox,oy,props.width*size,props.height*size)
  if(refImage&&!previewView){ctx.save();ctx.globalAlpha=props.referenceOpacity;ctx.drawImage(refImage,ox+props.referenceX*size,oy+props.referenceY*size,props.width*size*props.referenceScale,props.width*size*props.referenceScale*refImage.naturalHeight/refImage.naturalWidth);ctx.restore()}
  const cells=draft||props.cells,x0=Math.max(0,Math.floor(-ox/size)),y0=Math.max(0,Math.floor(-oy/size)),x1=Math.min(props.width,Math.ceil((vw-ox)/size)),y1=Math.min(props.height,Math.ceil((vh-oy)/size))
  ctx.globalAlpha=props.beadOpacity??1;
  if(props.visible)for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const code=cells[y*props.width+x];if(!code)continue;ctx.fillStyle=colorByCode(code)?.hex||paper;const px=ox+x*size,py=oy+y*size;if(!previewView&&props.round&&size>=12){ctx.beginPath();ctx.arc(px+size/2,py+size/2,size*.44,0,Math.PI*2);ctx.fill()}else {const left=Math.round(px*dpr)/dpr,top=Math.round(py*dpr)/dpr;ctx.fillRect(left,top,Math.round((px+size)*dpr)/dpr-left,Math.round((py+size)*dpr)/dpr-top)};if(!previewView&&props.codes&&size>=28){const hex=colorByCode(code)!.hex,n=parseInt(hex.slice(1),16);ctx.fillStyle=((n>>16)*.3+((n>>8)&255)*.59+(n&255)*.11)<145?paper:ink;ctx.font=`700 ${Math.min(13,size*.27)}px Nunito, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(code,px+size/2,py+size/2)}}
  ctx.globalAlpha=1;
  const gridLine=(position:number,vertical:boolean)=>{const alpha=gridOpacity(size,position,props.grid==='always');if(!alpha)return;ctx.globalAlpha=alpha;ctx.strokeStyle=ink;ctx.lineWidth=1/dpr;ctx.beginPath();if(vertical){const px=Math.round((ox+position*size)*dpr)/dpr+.5/dpr;ctx.moveTo(px,Math.max(0,oy));ctx.lineTo(px,Math.min(vh,oy+props.height*size))}else{const py=Math.round((oy+position*size)*dpr)/dpr+.5/dpr;ctx.moveTo(Math.max(0,ox),py);ctx.lineTo(Math.min(vw,ox+props.width*size),py)}ctx.stroke()}
  if(!previewView&&props.grid!=='off'){for(let x=x0;x<=x1;x++)gridLine(x,true);for(let y=y0;y<=y1;y++)gridLine(y,false)}ctx.globalAlpha=1
  if(!previewView&&props.boards&&size>=6){ctx.strokeStyle=primary;ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.globalAlpha=Math.min(.65,(size-6)/12);for(let x=52;x<props.width;x+=52){ctx.beginPath();ctx.moveTo(ox+x*size,oy);ctx.lineTo(ox+x*size,oy+props.height*size);ctx.stroke()}for(let y=52;y<props.height;y+=52){ctx.beginPath();ctx.moveTo(ox,oy+y*size);ctx.lineTo(ox+props.width*size,oy+y*size);ctx.stroke()}ctx.setLineDash([]);ctx.globalAlpha=1}
  ctx.strokeStyle=border;ctx.lineWidth=1;ctx.strokeRect(ox,oy,props.width*size,props.height*size)
  if(!previewView&&props.coordinates&&size>=6){const step=size>=32?1:size>=12?5:10;ctx.font='600 10px Nunito, sans-serif';ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';for(let x=x0;x<x1;x++)if(x%step===0)ctx.fillText(String(x+1),ox+(x+.5)*size,Math.max(12,oy-12));for(let y=y0;y<y1;y++)if(y%step===0)ctx.fillText(String(y+1),Math.max(12,ox-16),oy+(y+.5)*size)}
  if(!previewView&&props.highlights.length){const selected=new Set(props.highlights);ctx.beginPath();for(const i of selected){const col=i%props.width,row=Math.floor(i/props.width),x=ox+col*size,y=oy+row*size;if(col===0||!selected.has(i-1)){ctx.moveTo(x,y);ctx.lineTo(x,y+size)}if(col===props.width-1||!selected.has(i+1)){ctx.moveTo(x+size,y);ctx.lineTo(x+size,y+size)}if(row===0||!selected.has(i-props.width)){ctx.moveTo(x,y);ctx.lineTo(x+size,y)}if(row===props.height-1||!selected.has(i+props.width)){ctx.moveTo(x,y+size);ctx.lineTo(x+size,y+size)}}if(!props.cleanSelection){ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke()}ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([])}
  const rect=startIndex>=0&&endIndex>=0&&(downTool==='select'||downTool==='fill')?selectionRect(startIndex,endIndex,props.width):props.selection
  if(rect&&!previewView){ctx.strokeStyle=props.cleanSelection?'#fff':primary;ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(ox+rect.x*size,oy+rect.y*size,rect.width*size,rect.height*size);ctx.setLineDash([])}
  if(focusIndex>=0&&!navigating&&['pencil','eraser'].includes(downTool)){const x=ox+focusIndex%props.width*size,y=oy+Math.floor(focusIndex/props.width)*size;ctx.strokeStyle=ink;ctx.lineWidth=2;if(downTool==='eraser'){ctx.beginPath();ctx.arc(x+size/2,y+size/2,Math.max(4,size*.35),0,Math.PI*2);ctx.fillStyle=paper;ctx.globalAlpha=.7;ctx.fill();ctx.globalAlpha=1;ctx.stroke()}else ctx.strokeRect(x,y,size,size)
    if(pointerKind==='touch'&&draft){const mx=magnifierLeft?8:Math.max(8,vw-98),my=8;ctx.fillStyle=paper;ctx.fillRect(mx,my,90,90);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=focusIndex%props.width+dx,cy=Math.floor(focusIndex/props.width)+dy;if(cx<0||cx>=props.width||cy<0||cy>=props.height)continue;ctx.fillStyle=colorByCode(cells[cy*props.width+cx])?.hex||paper;ctx.fillRect(mx+(dx+1)*30,my+(dy+1)*30,30,30)}ctx.strokeStyle=primary;ctx.strokeRect(mx+30,my+30,30,30);ctx.strokeRect(mx,my,90,90)}
  }
}
watch(()=>[props.cells,props.grid,props.codes,props.boards,props.coordinates,props.round,props.selection,props.highlights,props.visible,props.referenceOpacity,props.referenceScale,props.referenceX,props.referenceY],schedule)
watch(()=>[props.width,props.height],()=>{resetGesture();fit()})
watch(()=>[props.tool,props.locked],resetGesture)
watch(()=>props.reference,url=>{refImage=null;if(url){const image=new Image();image.onload=()=>{if(props.reference===url){refImage=image;schedule()}};image.src=url}else schedule()},{immediate:true})
onMounted(()=>{observer=new ResizeObserver(()=>{const r=host.value!.getBoundingClientRect(),oldW=vw,oldH=vh;vw=r.width;vh=r.height;if(!fitted)fit();else{ox+=(vw-oldW)/2;oy+=(vh-oldH)/2;constrain();schedule()}});observer.observe(host.value!);host.value!.addEventListener('wheel',wheel,{passive:false});window.addEventListener('blur',resetGesture)})
onUnmounted(()=>{host.value?.removeEventListener('wheel',wheel);observer?.disconnect();cancelAnimationFrame(frame);window.removeEventListener('blur',resetGesture)})
defineExpose({ beginPreview,endPreview, fit, zoomIn:()=>zoomTo(size*1.25), zoomOut:()=>zoomTo(size/1.25), cancel:resetGesture })
</script>
<template><div ref="host" class="pin-viewport" :data-tool="tool" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @contextmenu.prevent><canvas ref="canvas" aria-label="拼豆编辑画布"></canvas></div></template>
