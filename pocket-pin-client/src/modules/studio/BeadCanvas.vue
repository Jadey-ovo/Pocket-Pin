<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { colorByCode, type BeadProject, type ProjectLayer, type Tool } from '@/core/project'
const props = withDefaults(defineProps<{ project: BeadProject; layers?: ProjectLayer[]; tool: Tool; color: string; grid: boolean; coordinates?: boolean; round: boolean; zoom?: number; boardTone?: 'light'|'dark'; recolorMode?:'single'|'same'; movePending?:boolean; selectedIds?:number[]; visible?: boolean; locked?: boolean }>(), { coordinates: false, zoom: 1, boardTone: 'light', recolorMode:'single', movePending:false, selectedIds:()=>[], visible: true, locked: false, layers: () => [] })
const emit = defineEmits<{ change: [cells: Array<string | null>]; pick: [code: string]; focus:[index:number]; action: [index: number]; range:[tool:Tool,start:number,end:number] }>()
const canvas = ref<HTMLCanvasElement | null>(null); let painting = false; let lastIndex = -1;let rangeStart=-1,rangeEnd=-1
function draw() {
  const el = canvas.value; if (!el) return
  // Zoom changes the canvas' real render resolution. CSS scaling a fixed bitmap
  // makes grid lines and bead edges blurry at high magnification.
  const baseSize = Math.max(8, Math.min(20, 620 / Math.max(props.project.width, props.project.height)))
  const size = Math.max(4, Math.round(baseSize * props.zoom))
  const logicalWidth=props.project.width*size,logicalHeight=props.project.height*size
  const dpr = Math.max(1,Math.min(devicePixelRatio||1,16384/Math.max(logicalWidth,logicalHeight)))
  el.width = Math.round(logicalWidth*dpr);el.height=Math.round(logicalHeight*dpr)
  el.style.width=`${logicalWidth}px`;el.style.height=`${logicalHeight}px`
  const ctx = el.getContext('2d')!;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle=props.boardTone==='dark'?'#302b28':'#fffdf7';ctx.fillRect(0,0,logicalWidth,logicalHeight)
  const drawCells=(cells:Array<string|null>,opacity=1)=>{ctx.globalAlpha=opacity;cells.forEach((code, index) => {if(!code)return;const x=index%props.project.width,y=Math.floor(index/props.project.width);ctx.fillStyle=colorByCode(code)?.hex||code;if(props.round){const radius=props.zoom<=.55?size*.48:size*.41;ctx.beginPath();ctx.arc(x*size+size/2,y*size+size/2,radius,0,Math.PI*2);ctx.fill();if(props.zoom>.72){ctx.strokeStyle=props.boardTone==='dark'?'rgba(255,255,255,.24)':'rgba(87,68,55,.2)';ctx.lineWidth=Math.max(.65,Math.min(1.5,size*.07));ctx.stroke();ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.arc(x*size+size*.39,y*size+size*.36,size*.1,0,Math.PI*2);ctx.fill()}}else{const inset=props.zoom<1?0:1;ctx.fillRect(x*size+inset,y*size+inset,size-inset*2,size-inset*2);if(props.zoom>=1){ctx.strokeStyle=props.boardTone==='dark'?'rgba(255,255,255,.3)':'rgba(87,68,55,.24)';ctx.lineWidth=Math.max(1,Math.min(2,size*.08));ctx.strokeRect(x*size+1.5,y*size+1.5,size-3,size-3)}}});ctx.globalAlpha=1}
  if(props.layers.length) props.layers.filter(layer=>layer.type==='bead'&&layer.visible).forEach(layer=>drawCells(layer.cells,layer.opacity));else if(props.visible)drawCells(props.project.cells)
  // Use translucent overlays instead of exposing the white board between
  // beads. This keeps the grid readable without overpowering the artwork.
  const gridLevel=props.zoom<=.55?1:props.zoom<1?2:3
  const gridColor=(position:number)=>{const dark=props.boardTone==='dark',major=position%10===0,medium=position%5===0,alpha=gridLevel===1?(major?.13:.045):gridLevel===2?(major?.22:medium?.12:.065):(major?.4:medium?.23:.1);return dark?`rgba(255,255,255,${alpha})`:`rgba(70,55,44,${alpha})`}
  if (props.grid) {
    for(let x=0;x<=props.project.width;x++){
      const line=gridLevel===3&&x%10===0?1.5:gridLevel===1?.5:1,pos=x*size+(line===1?.5:0);ctx.beginPath();ctx.strokeStyle=gridColor(x);ctx.lineWidth=line;ctx.moveTo(pos,0);ctx.lineTo(pos,logicalHeight);ctx.stroke()
    }
    for(let y=0;y<=props.project.height;y++){
      const line=gridLevel===3&&y%10===0?1.5:gridLevel===1?.5:1,pos=y*size+(line===1?.5:0);ctx.beginPath();ctx.strokeStyle=gridColor(y);ctx.lineWidth=line;ctx.moveTo(0,pos);ctx.lineTo(logicalWidth,pos);ctx.stroke()
    }
  }
  if(props.coordinates&&size>=8){ctx.fillStyle='rgba(87,68,55,.72)';ctx.font='600 7px Nunito';ctx.textAlign='left';ctx.textBaseline='top';for(let x=0;x<props.project.width;x+=10)ctx.fillText(String(x+1),x*size+2,2);for(let y=10;y<props.project.height;y+=10)ctx.fillText(String(y+1),2,y*size+2)}
  if(props.selectedIds.length){const xs=props.selectedIds.map(index=>index%props.project.width),ys=props.selectedIds.map(index=>Math.floor(index/props.project.width)),minX=Math.min(...xs),minY=Math.min(...ys),cellW=Math.max(...xs)-minX+1,cellH=Math.max(...ys)-minY+1,hovering=painting&&props.tool==='move'&&rangeEnd>=0,targetX=hovering?Math.max(0,Math.min(props.project.width-cellW,rangeEnd%props.project.width-Math.floor(cellW/2))):minX,targetY=hovering?Math.max(0,Math.min(props.project.height-cellH,Math.floor(rangeEnd/props.project.width)-Math.floor(cellH/2))):minY,x=targetX*size,y=targetY*size,w=cellW*size,h=cellH*size;ctx.save();ctx.fillStyle='rgba(91,175,159,.12)';ctx.shadowColor='rgba(48,43,40,.32)';ctx.shadowBlur=Math.max(8,size*.7);ctx.shadowOffsetY=Math.max(3,size*.25);ctx.fillRect(x,y,w,h);ctx.shadowColor='transparent';if(hovering){props.selectedIds.forEach(index=>{const code=props.project.cells[index];if(!code)return;const px=(targetX+index%props.project.width-minX)*size,py=(targetY+Math.floor(index/props.project.width)-minY)*size;ctx.fillStyle=colorByCode(code)?.hex||code;if(props.round){ctx.beginPath();ctx.arc(px+size/2,py+size/2,size*.41,0,Math.PI*2);ctx.fill()}else ctx.fillRect(px+1,py+1,size-2,size-2)})}ctx.strokeStyle='#5baf9f';ctx.lineWidth=Math.max(2,size*.12);ctx.setLineDash([Math.max(5,size*.4),Math.max(3,size*.24)]);ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.restore()}
  if(painting&&rangeStart>=0&&rangeEnd>=0){const sx=rangeStart%props.project.width,sy=Math.floor(rangeStart/props.project.width),ex=rangeEnd%props.project.width,ey=Math.floor(rangeEnd/props.project.width),x=Math.min(sx,ex)*size,y=Math.min(sy,ey)*size,w=(Math.abs(ex-sx)+1)*size,h=(Math.abs(ey-sy)+1)*size;ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=4;ctx.setLineDash([8,5]);ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);ctx.restore()}
}
function indexAt(event: PointerEvent) { const el=canvas.value!; const rect=el.getBoundingClientRect(); const x=Math.max(0,Math.min(props.project.width-1,Math.floor((event.clientX-rect.left)/rect.width*props.project.width))); const y=Math.max(0,Math.min(props.project.height-1,Math.floor((event.clientY-rect.top)/rect.height*props.project.height))); return y*props.project.width+x }
function connected(cells:Array<string|null>,start:number,sameColor=true){const target=cells[start],queue=[start],seen=new Set<number>();while(queue.length){const i=queue.pop()!;if(seen.has(i)||(sameColor?cells[i]!==target:!cells[i]))continue;seen.add(i);const x=i%props.project.width;if(x>0)queue.push(i-1);if(x<props.project.width-1)queue.push(i+1);if(i>=props.project.width)queue.push(i-props.project.width);if(i<cells.length-props.project.width)queue.push(i+props.project.width)}return seen}
function apply(index: number) { if(props.locked||index<0||index>=props.project.cells.length||index===lastIndex)return; lastIndex=index; const cells=[...props.project.cells];
  if(props.tool==='eyedropper'){const code=cells[index];if(code)emit('pick',code);return}
  if(['move','copy','paste','text','pan'].includes(props.tool)){emit('action',index);return}
  if(props.tool==='recolor'){const target=cells[index];if(!target)return;emit('focus',index);if(props.recolorMode==='same')cells.forEach((value,i)=>{if(value===target)cells[i]=props.color});else cells[index]=props.color}
  else cells[index]=props.tool==='eraser'?null:props.color;emit('change',cells) }
function start(e:PointerEvent){painting=true;lastIndex=-1;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);const index=indexAt(e);if(props.tool==='move'&&props.movePending){rangeStart=index;rangeEnd=index;draw();return}if(['fill','remove','copy','move'].includes(props.tool)){rangeStart=index;rangeEnd=index;draw();return}apply(index)}
function move(e:PointerEvent){if(painting&&['pencil','eraser'].includes(props.tool))apply(indexAt(e));else if(painting&&rangeStart>=0){rangeEnd=indexAt(e);draw()}}
function stop(e?:PointerEvent){if(painting&&rangeStart>=0&&e){const end=indexAt(e);if(props.tool==='move'&&props.movePending)emit('range','move',rangeStart,end);else if(props.tool==='fill'||props.tool==='remove'){const sx=rangeStart%props.project.width,sy=Math.floor(rangeStart/props.project.width),ex=end%props.project.width,ey=Math.floor(end/props.project.width),cells=[...props.project.cells];for(let y=Math.min(sy,ey);y<=Math.max(sy,ey);y++)for(let x=Math.min(sx,ex);x<=Math.max(sx,ex);x++)cells[y*props.project.width+x]=props.tool==='remove'?null:props.color;emit('change',cells)}else emit('range',props.tool,rangeStart,end)}painting=false;rangeStart=-1;rangeEnd=-1;lastIndex=-1;draw()}
function focusAt(e:PointerEvent){e.preventDefault();emit('focus',indexAt(e))}
watch(() => [props.project.width,props.project.height,props.project.cells,props.layers,props.grid,props.coordinates,props.round,props.zoom,props.boardTone,props.visible,props.selectedIds], draw, { deep: true }); onMounted(draw)
</script>
<template><canvas ref="canvas" class="bead-canvas" :data-tool="tool" aria-label="拼豆编辑画布" @pointerdown="start" @pointermove="move" @pointerup="stop" @pointercancel="stop" @contextmenu="focusAt"></canvas></template>
