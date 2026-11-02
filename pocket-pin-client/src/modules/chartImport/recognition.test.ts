import {describe,it,expect} from 'vitest'
import {boxQuad,detectGrid,detectAxis,gridPoint,validGrid,mapChart,parseLegend,normalizeCode,parseTsv,rotateRaster,detectSkew,gridCoordinates,subGrid,flattenLegend,locateLegend,parseDigitalLegend,type Raster,type Grid} from './recognition'
import {compareCounts,reassignCells} from './review'
function chart(columns=10,rows=8,size=18):{image:Raster;grid:Grid}{
 const width=columns*size+61,height=rows*size+101,data=new Uint8ClampedArray(width*height*4).fill(255)
 for(let y=20;y<=20+rows*size;y++)for(let x=30;x<=30+columns*size;x++){
  const c=(x-30)%size===0||(y-20)%size===0?[75,75,75]:Math.floor((x-30)/size)%2?[20,130,80]:[245,210,70]
  data.set([...c,255],(y*width+x)*4)
 }
 return {image:{width,height,data},grid:{quad:boxQuad({x:30,y:20,width:columns*size,height:rows*size}),columns,rows,confidence:1}}
}
describe('chart recognition',()=>{
 it('finds the actual periodic grid without page margins or a footer',()=>{
  const {image}=chart(),grid=detectGrid(image)
  expect(grid).not.toBeNull();expect(grid!.columns).toBe(10);expect(grid!.rows).toBe(8)
  expect(Math.abs(grid!.quad[0].x-30)).toBeLessThanOrEqual(2);expect(Math.abs(grid!.quad[0].y-20)).toBeLessThanOrEqual(2)
 })
 it('does not claim a grid exists on a flat photo',()=>{expect(detectAxis(Array(100).fill(12))).toBeNull();expect(detectGrid({width:100,height:100,data:new Uint8ClampedArray(40000).fill(255)})).toBeNull()})
 it('rectifies perspective via four corners and rejects a crossed quadrilateral',()=>{
  const quad:Grid['quad']=[{x:10,y:20},{x:160,y:10},{x:180,y:170},{x:20,y:180}]
  expect(gridPoint(quad,0,0)).toEqual(quad[0]);expect(gridPoint(quad,1,1).x).toBeCloseTo(quad[2].x);expect(gridPoint(quad,1,1).y).toBeCloseTo(quad[2].y)
  const mapped=gridPoint(quad,.27,.61),inverse=gridCoordinates(quad,mapped);expect(inverse.x).toBeCloseTo(.27);expect(inverse.y).toBeCloseTo(.61)
  const image={width:200,height:200,data:new Uint8ClampedArray(160000)}
  expect(validGrid({quad,columns:20,rows:20,confidence:1},image)).toBe(true)
  expect(validGrid({quad:[quad[0],quad[2],quad[1],quad[3]],columns:20,rows:20,confidence:1},image)).toBe(false)
 })
 it('maps source swatches exactly and does not reduce, dither or resize chart cells',()=>{
  const {image,grid}=chart(),legend=[{code:'A5',rgb:[245,210,70],count:40,confidence:99},{code:'B8',rgb:[20,130,80],count:40,confidence:99}]
  const a=mapChart(image,grid,legend),b=mapChart(image,grid,legend)
  expect(a).toEqual(b);expect(a.width).toBe(10);expect(a.height).toBe(8);expect(a.counts).toEqual({A5:40,B8:40});expect(a.uncertain).toEqual([])
  expect(a.cells.slice(0,4)).toEqual(['A5','B8','A5','B8']);expect(compareCounts(a,legend).every(c=>c.delta===0)).toBe(true)
  const changed=reassignCells(a,[0,1],'H7');expect(changed.counts).toEqual({A5:39,B8:39,H7:2});expect(compareCounts(changed,legend).find(s=>s.code==='A5')!.delta).toBe(-1);expect(a.cells[0]).toBe('A5')
  expect(reassignCells(changed,[0],null).cells[0]).toBeNull()
 })
 it('lets an explicit valid cell label resolve nearby source colors, but rejects invalid codes',()=>{
  const {image,grid}=chart(),words=[{x:32,y:23,width:12,height:10,text:'A01',confidence:95},{x:50,y:23,width:12,height:10,text:'Z99',confidence:95}]
  const result=mapChart(image,grid,[],words);expect(result.cells[0]).toBe('A1');expect(result.cells[1]).not.toBe('Z99')
 })
 it('recognizes zero quantities, normalizes leading zeros and rejects unsupported codes',()=>{
  expect(normalizeCode('a01')).toBe('A1');expect(normalizeCode('M6')).toBeNull();expect(normalizeCode('Z1')).toBeNull()
  const {image}=chart(),words=[{x:5,y:5,width:20,height:10,text:'A01',confidence:90},{x:29,y:5,width:10,height:10,text:'x0',confidence:90}]
  expect(parseLegend(words,image)[0]).toMatchObject({code:'A1',count:0})
  const tsv='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t5\t6\t20\t12\t92\tA01'
  expect(parseTsv(tsv)[0]).toMatchObject({text:'A01',x:5,y:6,confidence:92})
 })
 it('reports unknown quantities separately from agreement',()=>{
  const {image,grid}=chart(),result=mapChart(image,grid,[])
  const rows=compareCounts(result,[]);expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.expected===null&&r.delta===null)).toBe(true)
 })
 it('can exclude a declared blank color without erasing other beads',()=>{
  const {image,grid}=chart(),legend=[{code:'H2',rgb:[245,210,70],count:null,confidence:99},{code:'B8',rgb:[20,130,80],count:null,confidence:99}]
  const result=mapChart(image,grid,legend,[],['H2']);expect(result.cells.filter(c=>c===null)).toHaveLength(40);expect(result.cells.filter(Boolean)).toHaveLength(40)
 })
 it('detects and compensates a modest rotation',()=>{
  const {image}=chart(12,10,24),tilted=rotateRaster(image,4),angle=detectSkew(tilted)
  expect(Math.abs(angle-4)).toBeLessThanOrEqual(1.5)
  const grid=detectGrid(rotateRaster(tilted,-angle));expect(grid).not.toBeNull();expect(grid!.columns).toBe(12);expect(grid!.rows).toBe(10)
 })
})

it('snaps a selected chart region to complete grid cells',()=>{
 const {grid}=chart(),cut=subGrid(grid,1.2,2.1,8.1,6.9)
 expect(cut.columns).toBe(7);expect(cut.rows).toBe(5);expect(cut.quad[0]).toEqual(gridPoint(grid.quad,.1,.25));
})
it('normalizes light text on dark legend swatches without changing the input',()=>{
 const width=300,height=100,data=new Uint8ClampedArray(width*height*4).fill(255)
 for(let y=20;y<60;y++)for(let x=20;x<80;x++)data.set([20,60,100,255],(y*width+x)*4)
 for(let y=32;y<48;y++)for(let x=35;x<41;x++)data.set([255,255,255,255],(y*width+x)*4)
 const before=new Uint8ClampedArray(data),flat=flattenLegend({width,height,data})
 expect(Array.from(flat.data.slice((25*width+25)*4,(25*width+25)*4+3))).toEqual([255,255,255])
 expect(Array.from(flat.data.slice((38*width+38)*4,(38*width+38)*4+3))).toEqual([0,0,0])
 expect(data).toEqual(before)
})

it.each(['right','bottom'])('locates a %s legend without grid inference or OCR',position=>{
 const width=400,height=400,data=new Uint8ClampedArray(width*height*4).fill(255)
 for(let n=0;n<4;n++){
  const left=position==='right'?320:30+n*75,top=position==='right'?40+n*65:320
  for(let y=top;y<top+20;y++)for(let x=left;x<left+24;x++)data.set([30+n*35,100,70,255],(y*width+x)*4)
 }
 const box=locateLegend({width,height,data});expect(box).not.toBeNull();expect(box!.swatches).toBe(4)
 if(position==='right')expect(box!.x).toBeGreaterThan(280);else expect(box!.y).toBeGreaterThan(280)
})
it('returns failure rather than running OCR over a full image when no legend is found',()=>{
 const {image}=chart();expect(locateLegend(image)).toBeNull()
})

it.each(['bottom','top','left','right'])('excludes a dense drawing and finds the %s legend',side=>{
 const width=600,height=600,data=new Uint8ClampedArray(width*height*4).fill(255)
 const fill=(x:number,y:number,w:number,h:number,color:number[])=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)data.set([...color,255],(py*width+px)*4)}
 // Isolated, varied cells in the drawing used to outvote real legend swatches.
 for(let y=140;y<440;y+=12)for(let x=140;x<440;x+=12)fill(x,y,10,10,[(x*7)%180,70,(y*3)%140])
 for(let n=0;n<4;n++){const x=side==='left'?30:side==='right'?500:110+n*90,y=side==='top'?30:side==='bottom'?500:110+n*90;fill(x,y,22,20,[40+n*30,100,70])}
 const found=locateLegend({width,height,data});expect(found).not.toBeNull();expect(found!.swatches).toBe(4)
 if(side==='bottom')expect(found!.y).toBeGreaterThan(450)
 if(side==='top')expect(found!.y+found!.height).toBeLessThan(140)
 if(side==='left')expect(found!.x+found!.width).toBeLessThan(140)
 if(side==='right')expect(found!.x).toBeGreaterThan(450)
})
it('pairs quantities below swatches, and prefers complete readings over code-only duplicates',()=>{
 const {image}=chart(),word=(text:string,x:number,y:number,confidence=90)=>({text,x,y,width:20,height:10,confidence})
 const entries=parseLegend([word('A5',20,20),word('128',20,35),word('B8',90,20),word('x64',120,20),word('A5',20,20,99)],image)
 expect(entries.map(e=>[e.code,e.count])).toEqual([['A5',128],['B8',64]])
})
it('accepts an OCR-joined code and quantity separated by whitespace',()=>{
 const {image}=chart();expect(parseLegend([{text:'A5 128',x:2,y:2,width:50,height:12,confidence:90}],image)[0].count).toBe(128)
})

it('reads digital swatches independently of OCR errors and ignores their surrounding cards',()=>{
 const width=1000,height=150,data=new Uint8ClampedArray(width*height*4).fill(255)
 const fill=(x:number,y:number,w:number,h:number,color:number[])=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)data.set([...color,255],(py*width+px)*4)}
 const codes=['A5','B8','C12','H16'],values=[[244,215,56],[28,156,79],[28,51,77],[29,20,20]]
 const words=codes.slice(0,3).map((_,i)=>({x:110+i*230,y:56,width:30,height:18,confidence:96,text:String(100+i)}))
 for(let i=0;i<4;i++){fill(10+i*230,30,190,70,[245,236,216]);fill(20+i*230,40,50,50,values[i]);fill(35+i*230,54,12,18,[255,255,255])}
 const entries=parseDigitalLegend(words,{width,height,data})
 expect(entries.map(e=>[e.code,e.count])).toEqual(codes.map((c,i)=>[c,i<3?100+i:null]))
})
it('does not borrow another color quantity when the current quantity is missing',()=>{
 const width=500,height=100,data=new Uint8ClampedArray(width*height*4).fill(255)
 for(let y=20;y<80;y++)for(let x=20;x<80;x++)data.set([244,215,56,255],(y*width+x)*4)
 for(let y=20;y<80;y++)for(let x=170;x<230;x++)data.set([28,156,79,255],(y*width+x)*4)
 const words=[{text:'45',x:270,y:40,width:20,height:20,confidence:98}]
 expect(parseDigitalLegend(words,{width,height,data}).map(e=>[e.code,e.count])).toEqual([['A5',null],['B8',45]])
 const parsed=parseLegend([{text:'A5',x:20,y:40,width:20,height:20,confidence:98},{text:'B8',x:170,y:40,width:20,height:20,confidence:98},...words],{width,height,data})
 expect(parsed.map(e=>[e.code,e.count])).toEqual([['A5',null],['B8',45]])
})
it('keeps 104 square cells when downsampling hides alternate vertical guides',()=>{
 const width=800,height=800,data=new Uint8ClampedArray(width*height*4).fill(255),left=60,top=60,size=676,step=size/104
 const set=(x:number,y:number,c:number[])=>data.set([...c,255],(y*width+x)*4)
 for(let y=40;y<757;y++)for(let x=40;x<757;x++)set(x,y,[239,224,203])
 for(let y=top;y<=top+size;y++)for(let x=left;x<=left+size;x++){
  const gx=(x-left)/step,gy=(y-top)/step;set(x,y,Math.abs(gx-Math.round(gx))<.1||Math.abs(gy-Math.round(gy))<.1?[255,255,255]:[30+(Math.floor(gx/5)%4)*30,80+(Math.floor(gy/5)%4)*20,60])
 }
 for(let n=0;n<=104;n++){
  if(n%10===0||n===104){const x=Math.round(left+n*step);for(let y=top;y<=top+size;y++)set(x,y,[185,44,60])}
  if(n%5===0||n===104){const y=Math.round(top+n*step);for(let x=left;x<=left+size;x++)set(x,y,[185,44,60])}
 }
 const grid=detectGrid({width,height,data});expect(grid?.columns).toBe(104);expect(grid?.rows).toBe(104)
})
