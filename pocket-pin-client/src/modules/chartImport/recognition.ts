import { palette, colorByCode } from '@/core/project'
import { perceptual } from '@/modules/studio/engine/featureQuantization'
export type Raster = { width:number; height:number; data:Uint8ClampedArray }
export type Box = {x:number;y:number;width:number;height:number}
export type Point = {x:number;y:number}
export type Quad = [Point,Point,Point,Point]
export type Grid = {quad:Quad; columns:number; rows:number; confidence:number}
export type Word = Box & {text:string;confidence:number}
export type LegendEntry = {code:string;count:number|null;rgb:number[];confidence:number;calibrated?:boolean}
export type ChartResult = {width:number;height:number;cells:(string|null)[];uncertain:number[];counts:Record<string,number>}
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))
const colors=palette.map(c=>({code:c.code,rgb:rgb(c.hex),lab:perceptual(rgb(c.hex))}))
const distance=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+(v-b[i])**2,0)
export const boxQuad=(b:Box):Quad=>[{x:b.x,y:b.y},{x:b.x+b.width,y:b.y},{x:b.x+b.width,y:b.y+b.height},{x:b.x,y:b.y+b.height}]
export function normalizeCode(text:string):string|null {
 const match=text.toUpperCase().replace(/\s/g,'').match(/^([A-HM])0*(\d{1,2})$/)
 const code=match?match[1]+Number(match[2]):''
 return colorByCode(code)?code:null
}
export function normalizeOcrCode(text:string):string|null{
 const direct=normalizeCode(text);if(direct)return direct
 const cleaned=text.toUpperCase().replace(/\s/g,''),match=cleaned.match(/^([A-HM])([0-9OISZLBG]{1,2})$/)
 if(!match)return null
 return normalizeCode(match[1]+match[2].replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5').replace(/Z/g,'2').replace(/B/g,'8').replace(/G/g,'6'))
}
export function parseTsv(tsv:string):Word[]{
 return tsv.trim().split('\n').flatMap(line=>{
  const c=line.split('\t');if(c.length<12||c[0]!=='5'||!c[11].trim())return []
  const [x,y,width,height,confidence]=c.slice(6,11).map(Number)
  return [x,y,width,height,confidence].every(Number.isFinite)?[{x,y,width,height,confidence,text:c.slice(11).join('\t').trim()}]:[]
 })
}
export function pixel(image:Raster,x:number,y:number):number[]{
 const i=(Math.max(0,Math.min(image.height-1,Math.round(y)))*image.width+Math.max(0,Math.min(image.width-1,Math.round(x))))*4
 return Array.from(image.data.slice(i,i+3))
}
// A robust dominant bin ignores the text and grid crossing the cell center.
export function dominant(samples:number[][]):number[]{
 const bins=new Map<string,number[][]>()
 for(const p of samples){const key=p.map(c=>Math.floor(c/24)).join(',');const bin=bins.get(key)??[];bin.push(p);bins.set(key,bin)}
 const group=[...bins.values()].sort((a,b)=>b.length-a.length)[0]??[[255,255,255]]
 return [0,1,2].map(ch=>group.reduce((s,p)=>s+p[ch],0)/group.length)
}
function bestWords(words:Word[]):Word[]{
 // OCR passes can shift a token by one pixel. Keep the strongest reading at
 // that position instead of letting an earlier low-confidence quantity win.
 return words.filter(w=>!words.some(n=>n!==w&&n.confidence>w.confidence&&Math.abs(n.x+n.width/2-w.x-w.width/2)<Math.max(n.width,w.width)*.35&&Math.abs(n.y+n.height/2-w.y-w.height/2)<Math.max(n.height,w.height)*.45))
}
export function parseLegend(words:Word[],image:Raster):LegendEntry[]{
 words=bestWords(words)
 const entries=new Map<string,LegendEntry>()
 for(const w of words){
  // Accept code + quantity when OCR joins a row, but never guess letters.
  const parts=w.text.trim().replace(/\s+(?=\d+[颗粒个]?已?$)/,'x').replace(/\s/g,'').match(/^([A-HM][0-9OISZLBG]{1,3})(?:[×xX*:：](\d+))?$/i)
  const code=normalizeOcrCode(parts?.[1]??w.text);if(!code)continue
  const next=words.filter(n=>n!==w&&/^[×xX*:：]?\d{1,6}[颗粒个]?$/.test(n.text)&&n.x>=w.x+w.width-2&&Math.abs(n.y+n.height/2-w.y-w.height/2)<Math.max(w.height,n.height)*.65).sort((a,b)=>a.x-b.x)[0]
  const below=words.filter(n=>n!==w&&/^[×xX*:：]?\d{1,6}[颗粒个]?$/.test(n.text)&&n.y>=w.y+w.height-2&&n.y-w.y-w.height<w.height*2.5&&Math.abs(n.x+n.width/2-w.x-w.width/2)<Math.max(w.width,n.width)*.7).sort((a,b)=>a.y-b.y)[0]
  const crossesCode=next&&words.some(n=>n!==w&&normalizeOcrCode(n.text)&&n.x>w.x+w.width&&n.x<next.x&&Math.abs(n.y+n.height/2-w.y-w.height/2)<Math.max(n.height,w.height)*.65)
  const adjacent=next&&!crossesCode&&next.x-w.x-w.width<w.height*8&&/^[×xX*:：]?\d{1,6}[颗粒个]?$/.test(next.text)?next:below
  const quantity=(parts?.[2]??adjacent?.text??'').replace(/^[×xX*:：]/,'').replace(/[颗粒个]$/,'')
  const count=/^\d{1,6}$/.test(quantity??'')?Number(quantity):null
  // The source swatch, rather than a presumed screen HEX, calibrates the grid.
  const samples:number[][]=[]
  for(const [dx,dy] of [[-.25,.5],[.2,-.3],[.8,-.3],[.2,1.3],[.8,1.3]]){
   const x=w.x+w.width*dx,y=w.y+w.height*dy
   if(x>=0&&y>=0&&x<image.width&&y<image.height)samples.push(pixel(image,x,y))
  }
  const sampled=dominant(samples),spread=Math.max(...sampled)-Math.min(...sampled)
  const source=spread>16||sampled.reduce((a,b)=>a+b,0)<540?sampled:rgb(colorByCode(code)!.hex)
  const entry={code,count,rgb:source,calibrated:source===sampled,confidence:w.confidence-(normalizeCode(parts?.[1]??w.text)?0:15)}
  const old=entries.get(code);if(!old||(entry.count!==null&&old.count===null)||(entry.count===null)===(old.count===null)&&entry.confidence>old.confidence)entries.set(code,entry)
 }
 return [...entries.values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
}
/** Near-exact MARD swatches are an independent check on OCR (e.g. B15/B16).
 * Only digital-color matches within 9 RGB units qualify; photos still use text OCR. */
export function parseDigitalLegend(words:Word[],image:Raster):LegendEntry[]{
 words=bestWords(words)
 const {width,height,data}=image,total=width*height,mask=new Uint16Array(total),cache=new Map<number,number>(),queue=new Int32Array(total),entries:LegendEntry[]=[],swatches:(Box & {id:number})[]=[]
 for(let i=0;i<total;i++){
  const j=i*4,r=data[j],g=data[j+1],b=data[j+2],key=r*65536+g*256+b
  let code=cache.get(key)
  if(code===undefined){let best=81,index=-1;for(let k=0;k<colors.length;k++){const c=colors[k].rgb,d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(d<best){best=d;index=k}}code=index+1;cache.set(key,code)}
  mask[i]=code
 }
 const used=new Uint8Array(total)
 for(let seed=0;seed<total;seed++){
  const id=mask[seed];if(!id||used[seed])continue
  let head=0,tail=1,l=seed%width,r=l,t=Math.floor(seed/width),b=t;queue[0]=seed;used[seed]=1
  while(head<tail){const k=queue[head++],x=k%width,y=Math.floor(k/width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)
   for(const n of [x?k-1:-1,x<width-1?k+1:-1,y?k-width:-1,y<height-1?k+width:-1])if(n>=0&&!used[n]&&mask[n]===id){used[n]=1;queue[tail++]=n}
  }
  const w=r-l+1,h=b-t+1
  if(w<10||h<10||w>width*.2||h>height*.75||w/h<.6||w/h>3||tail<w*h*.45)continue
  swatches.push({x:l,y:t,width:w,height:h,id})
 }
 const chips=swatches.filter(b=>!swatches.some(n=>n!==b&&n.x>b.x&&n.y>b.y&&n.x+n.width<b.x+b.width&&n.y+n.height<b.y+b.height&&n.width*n.height>b.width*b.height*.12))
 const sizes=chips.map(b=>b.height).sort((a,b)=>a-b),typical=sizes[Math.floor(sizes.length*.9)]??0
 const widths=chips.filter(b=>b.height>=typical*.8&&b.height<=typical*1.2).map(b=>b.width).sort((a,b)=>a-b),typicalWidth=widths[Math.floor(widths.length/2)]??typical
 for(const swatch of chips){
  const {x:l,y:t,width:w,height:h,id}=swatch,r=l+w-1,b=t+h-1
  if(h<typical*.65||h>typical*1.4||w<typical*.6||w>typicalWidth*1.6)continue
  const numeric=words.filter(n=>/^[×xX*:：]?\d{1,6}[颗粒个]?$/.test(n.text)&&n.confidence>=55)
  const rightLimit=Math.min(r+h*5,...chips.filter(n=>n.x>r&&n.height>=typical*.65&&Math.abs(n.y+n.height/2-(t+b)/2)<h*.5).map(n=>n.x-h*.1))
  const next=numeric.filter(n=>n.x>=r&&n.x<rightLimit&&Math.abs(n.y+n.height/2-(t+b)/2)<h*.45).sort((a,b)=>a.x-b.x||b.confidence-a.confidence)[0]
  const below=numeric.filter(n=>n.y>=b&&n.y-b<h*1.5&&Math.abs(n.x+n.width/2-(l+r)/2)<w*.6).sort((a,b)=>a.y-b.y||b.confidence-a.confidence)[0]
  const token=next??below
  const count=token?Number(token.text.replace(/^[×xX*:：]/,'').replace(/[颗粒个]$/,'')):null,color=colors[id-1]
  entries.push({code:color.code,count,rgb:color.rgb,calibrated:true,confidence:token?Math.min(99,token.confidence):0})
 }
 // A white patch or a glyph may resemble another swatch. Preserve the code;
 // conflicting quantities remain unknown instead of dropping the entire list.
 const unique=[...new Set(entries.map(e=>e.code))].map(code=>{
  const matches=entries.filter(e=>e.code===code),known=matches.filter(e=>e.count!==null).sort((a,b)=>b.confidence-a.confidence)
  return new Set(known.map(e=>e.count)).size>1?{...matches[0],count:null,confidence:0}:known[0]??matches[0]
 })
 return unique.length>=2?unique.sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})):[]
}
export function legendBounds(words:Word[],image:Raster,grid?:Grid):Box|null{
 const bottom=grid?Math.max(...grid.quad.map(p=>p.y)):image.height*.45
 const codes=words.filter(w=>(normalizeOcrCode(w.text)||/^[x×]\d{1,6}$/i.test(w.text))&&w.confidence>=25&&(w.y>bottom||w.x>Math.max(...(grid?.quad.map(p=>p.x)??[image.width*.6]))))
 if(codes.length<2)return null
 const left=Math.max(0,Math.min(...codes.map(w=>w.x))-image.width*.09),top=Math.max(0,Math.min(...codes.map(w=>w.y))-image.height*.015)
 const right=Math.min(image.width,Math.max(...codes.map(w=>w.x+w.width))+image.width*.08),end=Math.min(image.height,Math.max(...codes.map(w=>w.y+w.height))+image.height*.025)
 return {x:left,y:top,width:right-left,height:end-top}
}
function projection(image:Raster,vertical:boolean):number[]{
 const size=vertical?image.width:image.height,cross=vertical?image.height:image.width,out=Array(size).fill(0)
 for(let p=1;p<size-1;p++){
  let sum=0,quiet=0,samples=0,previous:number[]|undefined
  for(let k=1;k<cross-1;k+=2){
   const x=vertical?p:k,y=vertical?k:p,offset=vertical?4:image.width*4,i=(y*image.width+x)*4
   const a=[0,1,2].reduce((s,c)=>s+Math.abs(image.data[i-offset+c]-image.data[i+offset+c]),0)/3
   sum+=Math.min(100,a)
   const current=[image.data[i],image.data[i+1],image.data[i+2]]
   if(previous&&current.every((v,ch)=>Math.abs(v-previous![ch])<18))quiet++
   previous=current;samples++
  }
  out[p]=sum/Math.max(1,cross/2)*Math.pow(quiet/Math.max(1,samples-1),5)
 }
 return out
}
export function detectAxis(profile:number[]):{start:number;end:number;count:number;confidence:number}|null{
 const mean=profile.reduce((s,v)=>s+v,0)/profile.length
 const variance=profile.reduce((s,v)=>s+(v-mean)**2,0)/profile.length
 if(variance<1)return null
 const threshold=mean+Math.sqrt(variance)*.25,peaks:number[]=[]
 for(let i=2;i<profile.length-2;i++)if(profile[i]>threshold&&profile[i]>=profile[i-1]&&profile[i]>=profile[i+1]){
  if(peaks.length&&i-peaks.at(-1)!<3){if(profile[i]>profile[peaks.at(-1)!])peaks[peaks.length-1]=i}
  else peaks.push(i)
 }
 if(peaks.length<5)return null
 const periods=new Map<number,number>()
 for(let i=1;i<peaks.length;i++)for(let j=Math.max(0,i-2);j<i;j++){
  const d=peaks[i]-peaks[j];if(d>=5&&d<=160)periods.set(d,(periods.get(d)??0)+Math.min(profile[peaks[i]],profile[peaks[j]]))
 }
 const candidates=[...periods].sort((a,b)=>b[1]-a[1]).slice(0,16)
 let best:{start:number;end:number;count:number;confidence:number;score:number}|null=null
 for(const [basePeriod] of candidates)for(let fraction=-5;fraction<=5;fraction++){const period=basePeriod+fraction/10;for(const phase of peaks.slice(0,Math.min(80,peaks.length))){
  const bins=new Map<number,number>()
  for(const p of peaks){const k=Math.round((p-phase)/period);if(Math.abs(p-phase-k*period)>Math.max(1.5,period*.08))continue;const old=bins.get(k);if(old===undefined||profile[p]>profile[old])bins.set(k,p)}
  const aligned=[...bins.values()].sort((a,b)=>a-b)
  if(aligned.length<5)continue
  // Choose the longest contiguous run; page decorations must not expand the board.
  let run:number[]=[],longest:number[]=[]
  for(const p of aligned){if(run.length&&p-run.at(-1)!>period*1.55){if(run.length>longest.length)longest=run;run=[]}run.push(p)}
  if(run.length>longest.length)longest=run
  if(longest.length<5)continue
  let start=longest[0],end=longest.at(-1)!
  // Outer grid borders can have less contrast than internal lines. Extend only
  // to a matching local peak at the inferred period, never to arbitrary margins.
  const near=(target:number)=>{let index=Math.round(target);for(let d=-2;d<=2;d++){const n=Math.round(target)+d;if(n>1&&n<profile.length-2&&profile[n]>profile[index])index=n}return index}
  for(let direction of [-1,1])for(let n=0;n<4;n++){
   const target=(direction<0?start:end)+direction*period;if(target<2||target>profile.length-3)break
   const p=near(target);if(profile[p]<mean+Math.sqrt(variance)*.2)break
   if(direction<0)start=p;else end=p
  }
  const count=Math.round((end-start)/period)
  if(count<4||count>4096)continue
  const confidence=Math.min(1,longest.length/(count+1)),score=longest.reduce((s,p)=>s+profile[p],0)*confidence/Math.pow(period,.08)
  if(!best||score>best.score)best={start,end,count,confidence,score}
 }}
 return best
}
export function detectGrid(image:Raster):Grid|null{
 let xp=projection(image,true),yp=projection(image,false)
 // Our exported red frame/5-cell guides are outside the coordinate labels.
 // Constrain the periodic search to this frame so labels cannot become extra cells.
 const rows=new Uint16Array(image.height),columns=new Uint16Array(image.width)
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;if(Math.abs(image.data[i]-185)<22&&Math.abs(image.data[i+1]-44)<22&&Math.abs(image.data[i+2]-60)<22){rows[y]++;columns[x]++}}
 const linesX=Array.from(columns).flatMap((n,i)=>n>image.height*.3?[i]:[]),linesY=Array.from(rows).flatMap((n,i)=>n>image.width*.3?[i]:[])
 const frame=linesX.length>=2&&linesY.length>=2?{left:linesX[0],right:linesX.at(-1)!,top:linesY[0],bottom:linesY.at(-1)!}:null
 if(frame&&frame.right-frame.left>image.width*.3&&frame.bottom-frame.top>image.height*.3){
  xp=xp.map((v,i)=>i>=frame.left-2&&i<=frame.right+2?v:0);yp=yp.map((v,i)=>i>=frame.top-2&&i<=frame.bottom+2?v:0)
 }else if(frame)return detectGridWithoutFrame(xp,yp)
 const x=detectAxis(xp),y=detectAxis(yp)
 if(!x||!y)return null
 if(frame){
  let paper=0,samples=0
  for(let x=frame.left+5;x<frame.right-5;x+=11){const p=pixel(image,x,frame.top-4);paper+=Number(p.every((v,i)=>Math.abs(v-[239,224,203][i])<15));samples++}
  if(samples&&paper/samples>.8){
   const spacing=(lines:number[])=>{const centers:number[]=[];let run:number[]=[];for(const n of lines){if(run.length&&n-run.at(-1)!>2){centers.push(run.reduce((a,b)=>a+b,0)/run.length);run=[]}run.push(n)}if(run.length)centers.push(run.reduce((a,b)=>a+b,0)/run.length);const gaps=centers.slice(1).map((n,i)=>n-centers[i]).sort((a,b)=>a-b);const median=gaps[Math.floor(gaps.length/2)],regular=gaps.filter(n=>Math.abs(n-median)<median*.15);return regular.reduce((a,b)=>a+b,0)/Math.max(1,regular.length)}
   const dx=spacing(linesX),dy=spacing(linesY),guideStep=Math.min(dx,dy)/5,axisStep=Math.min((x.end-x.start)/x.count,(y.end-y.start)/y.count),cellStep=Math.abs(axisStep*2-guideStep)<guideStep*.12?axisStep:guideStep,columns=Math.round((frame.right-frame.left)/cellStep),rows=Math.round((frame.bottom-frame.top)/cellStep)
   if(columns>=5&&rows>=5&&columns*rows<=1048576)return {quad:boxQuad({x:frame.left,y:frame.top,width:frame.right-frame.left,height:frame.bottom-frame.top}),columns,rows,confidence:1}
  }
  const columns=Math.round((frame.right-frame.left)/((x.end-x.start)/x.count)),rows=Math.round((frame.bottom-frame.top)/((y.end-y.start)/y.count))
  if(columns>=4&&rows>=4&&columns*rows<=1048576)return {quad:boxQuad({x:frame.left,y:frame.top,width:frame.right-frame.left,height:frame.bottom-frame.top}),columns,rows,confidence:Math.min(x.confidence,y.confidence)}
 }
 return {quad:boxQuad({x:x.start,y:y.start,width:x.end-x.start,height:y.end-y.start}),columns:x.count,rows:y.count,confidence:Math.min(x.confidence,y.confidence)}
}
function detectGridWithoutFrame(xp:number[],yp:number[]):Grid|null{
 const x=detectAxis(xp),y=detectAxis(yp);return x&&y?{quad:boxQuad({x:x.start,y:y.start,width:x.end-x.start,height:y.end-y.start}),columns:x.count,rows:y.count,confidence:Math.min(x.confidence,y.confidence)}:null
}
// Estimate skew from long, nearly horizontal/vertical image edges. Use a mode
// rather than a mean so text strokes and diagonal subject contours do not vote equally.
export function detectSkew(image:Raster):number{
 const points:{x:number;y:number;weight:number}[]=[],cx=image.width/2,cy=image.height/2
 // Long-line projection voting survives stair-stepped screenshot edges better
 // than estimating an angle from individual raster gradients.
 const stride=Math.max(2,Math.ceil(Math.max(image.width,image.height)/900))
 for(let y=2;y<image.height-2;y+=stride)for(let x=2;x<image.width-2;x+=stride){
  const i=(y*image.width+x)*4,dx=[0,1,2].reduce((s,c)=>s+Math.abs(image.data[i-4+c]-image.data[i+4+c]),0)/3,dy=[0,1,2].reduce((s,c)=>s+Math.abs(image.data[i-image.width*4+c]-image.data[i+image.width*4+c]),0)/3
  const weight=Math.max(dx,dy);if(weight>35)points.push({x:x-cx,y:y-cy,weight:Math.min(100,weight)})
 }
 if(points.length<30)return 0
 const diagonal=Math.ceil(Math.hypot(image.width,image.height)),offset=diagonal/2
 let best=0,score=-1
 for(let angle=-12;angle<=12;angle+=.5){
  const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),xp=new Float64Array(diagonal+2),yp=new Float64Array(diagonal+2)
  for(const p of points){xp[Math.round(c*p.x+s*p.y+offset)]+=p.weight;yp[Math.round(-s*p.x+c*p.y+offset)]+=p.weight}
  let total=0;for(let i=0;i<xp.length;i++)total+=xp[i]*xp[i]+yp[i]*yp[i]
  if(total>score){score=total;best=angle}
 }
 return Math.abs(best)<.5?0:best
}
export function rotateRaster(image:Raster,degrees:number):Raster{
 const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),out=new Uint8ClampedArray(image.data.length).fill(255),cx=(image.width-1)/2,cy=(image.height-1)/2
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  const sx=Math.round(c*(x-cx)+s*(y-cy)+cx),sy=Math.round(-s*(x-cx)+c*(y-cy)+cy)
  if(sx<0||sy<0||sx>=image.width||sy>=image.height)continue
  const i=(y*image.width+x)*4,j=(sy*image.width+sx)*4;out.set(image.data.subarray(j,j+4),i)
 }
 return {...image,data:out}
}
// Square-to-quadrilateral homography. Four independently adjustable corners
// allow both rotation and perspective to be corrected before sampling cells.
export function gridPoint(quad:Quad,u:number,v:number):Point{
 const [a,b,c,d]=quad,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y,den=dx1*dy2-dx2*dy1
 const g=Math.abs(den)<1e-9?0:(dx3*dy2-dx2*dy3)/den,h=Math.abs(den)<1e-9?0:(dx1*dy3-dx3*dy1)/den,k=g*u+h*v+1
 return {x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/k,y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/k}
}
export function gridCoordinates(quad:Quad,p:Point):Point{
 const [a,b,c,d]=quad,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y,den=dx1*dy2-dx2*dy1
 const g=Math.abs(den)<1e-9?0:(dx3*dy2-dx2*dy3)/den,h=Math.abs(den)<1e-9?0:(dx1*dy3-dx3*dy1)/den
 const aa=b.x-a.x+g*b.x-p.x*g,bb=d.x-a.x+h*d.x-p.x*h,dd=b.y-a.y+g*b.y-p.y*g,ee=d.y-a.y+h*d.y-p.y*h,xx=p.x-a.x,yy=p.y-a.y,det=aa*ee-bb*dd
 return Math.abs(det)<1e-9?{x:-1,y:-1}:{x:(xx*ee-bb*yy)/det,y:(aa*yy-xx*dd)/det}
}
export function subGrid(grid:Grid,left:number,top:number,right:number,bottom:number):Grid{
 left=Math.max(0,Math.min(grid.columns-1,Math.round(left)));right=Math.max(left+1,Math.min(grid.columns,Math.round(right)))
 top=Math.max(0,Math.min(grid.rows-1,Math.round(top)));bottom=Math.max(top+1,Math.min(grid.rows,Math.round(bottom)))
 const points:Quad=[gridPoint(grid.quad,left/grid.columns,top/grid.rows),gridPoint(grid.quad,right/grid.columns,top/grid.rows),gridPoint(grid.quad,right/grid.columns,bottom/grid.rows),gridPoint(grid.quad,left/grid.columns,bottom/grid.rows)]
 return {...grid,quad:points,columns:right-left,rows:bottom-top}
}
export function rectifyChart(image:Raster,grid:Grid):Raster{
 const tile=Math.max(2,Math.min(40,Math.floor(1800/Math.max(grid.columns,grid.rows)))),width=grid.columns*tile,height=grid.rows*tile,data=new Uint8ClampedArray(width*height*4)
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=gridPoint(grid.quad,(x+.5)/width,(y+.5)/height),sx=Math.min(image.width-1,Math.max(0,Math.round(p.x))),sy=Math.min(image.height-1,Math.max(0,Math.round(p.y))),i=(y*width+x)*4,j=(sy*image.width+sx)*4
  for(let ch=0;ch<4;ch++)data[i+ch]=image.data[j+ch]
 }
 return {width,height,data}
}
export function validGrid(grid:Grid,image:Raster):boolean{
 if(!Number.isInteger(grid.columns)||!Number.isInteger(grid.rows)||grid.columns<1||grid.rows<1||grid.columns*grid.rows>1048576)return false
 const q=grid.quad
 if(!q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<image.width&&p.y<image.height))return false
 return q.every((p,i)=>{const b=q[(i+1)%4],c=q[(i+2)%4];return (b.x-p.x)*(c.y-b.y)-(b.y-p.y)*(c.x-b.x)>0})&&Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y)/grid.columns>=2&&Math.hypot(q[3].x-q[0].x,q[3].y-q[0].y)/grid.rows>=2
}
export function mapChart(image:Raster,grid:Grid,legend:LegendEntry[],words:Word[]=[],blankCodes:string[]=[]):ChartResult{
 if(!validGrid(grid,image))throw new Error('请检查四角顺序、行列数与范围；每格至少需要 2 个像素')
 if(legend.some(e=>!colorByCode(e.code))||new Set(legend.map(e=>e.code)).size!==legend.length)throw new Error('色号无效或重复，请先校对图例')
 const choices=legend.length?legend.map(e=>({code:e.code,lab:perceptual(e.rgb)})):colors
 const cells:(string|null)[]=[],uncertain:number[]=[],counts:Record<string,number>={}
 const tokens=new Map<number,{code:string;word:Word}>()
 for(const word of words){
  const code=normalizeOcrCode(word.text);if(!code||word.confidence<65)continue
  const uv=gridCoordinates(grid.quad,{x:word.x+word.width/2,y:word.y+word.height/2})
  if(uv.x<0||uv.y<0||uv.x>=1||uv.y>=1)continue
  const x=Math.floor(uv.x*grid.columns),y=Math.floor(uv.y*grid.rows),i=y*grid.columns+x
  const prior=tokens.get(i);if(!prior||word.confidence>prior.word.confidence)tokens.set(i,{code,word})
 }

 for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.columns;x++){
  const samples:number[][]=[]
  for(const dy of [.18,.3,.7,.82])for(const dx of [.18,.3,.7,.82]){const p=gridPoint(grid.quad,(x+dx)/grid.columns,(y+dy)/grid.rows);samples.push(pixel(image,p.x,p.y))}
  const value=dominant(samples),lab=perceptual(value),ranked=choices.map(c=>({code:c.code,error:distance(lab,c.lab)})).sort((a,b)=>a.error-b.error)
  const label=tokens.get(y*grid.columns+x)
  const acceptedLabel=label&&(!legend.length||legend.some(e=>e.code===label.code))
  const code=acceptedLabel?label!.code:ranked[0].code,i=cells.length
  const needsReview=!!label&&(!acceptedLabel||!normalizeCode(label.word.text)||label.code!==ranked[0].code&&ranked[0].error<25)||!acceptedLabel&&(ranked[0].error>100||ranked.length>1&&ranked[1].error-ranked[0].error<3)
  if(needsReview)uncertain.push(i)
  const cell=blankCodes.includes(code)?null:code
  cells.push(cell);if(cell)counts[cell]=(counts[cell]??0)+1
 }
 return {width:grid.columns,height:grid.rows,cells,uncertain,counts}
}

// Normalize differently colored legend swatches to black text on white without
// sending the image anywhere. Only compact, sufficiently large components are
// changed; a connected chart grid must never be mistaken for one swatch.
export function flattenLegend(image:Raster):Raster{
 const {width,height,data}=image,total=width*height,visited=new Uint8Array(total),queue=new Int32Array(total),out=new Uint8ClampedArray(data.length).fill(255)
 const eligible=(i:number)=>{const j=i*4,r=data[j],g=data[j+1],b=data[j+2];return data[j+3]>=100&&(Math.max(r,g,b)-Math.min(r,g,b)>40||(.3*r+.59*g+.11*b)<210)}
 for(let i=0;i<total;i++){const j=i*4,v=.3*data[j]+.59*data[j+1]+.11*data[j+2]<150?0:255;out[j]=out[j+1]=out[j+2]=v}
 for(let seed=0;seed<total;seed++){
  if(visited[seed]||!eligible(seed))continue
  let head=0,tail=1,left=seed%width,right=left,top=Math.floor(seed/width),bottom=top;queue[0]=seed;visited[seed]=1
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)
   for(const n of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(n>=0&&!visited[n]&&eligible(n)){visited[n]=1;queue[tail++]=n}
  }
  const w=right-left+1,h=bottom-top+1
  if(w<12||h<10||w/h<.65||w/h>4||w>width*.25||h>height*.65||w*h<total*.002)continue
  const samples:number[][]=[]
  for(let y=top+2;y<bottom-1;y+=Math.max(1,Math.floor(h/16)))for(let x=left+2;x<right-1;x+=Math.max(1,Math.floor(w/16)))samples.push(pixel(image,x,y))
  const background=dominant(samples)
  if(samples.filter(p=>p.every((v,ch)=>Math.abs(v-background[ch])<30)).length<samples.length*.4)continue
  // Remove the paper outside rounded/circular swatches by flood filling contrast
  // from their boundary. Only enclosed contrasting strokes are label text.
  const contrast=new Uint8Array(w*h),exterior=new Uint8Array(w*h),flood=new Int32Array(w*h)
  head=0;tail=0
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=((top+y)*width+left+x)*4,k=y*w+x
   contrast[k]=Number(Math.hypot(data[i]-background[0],data[i+1]-background[1],data[i+2]-background[2])>65)
   if(contrast[k]&&(x===0||y===0||x===w-1||y===h-1)){exterior[k]=1;flood[tail++]=k}
  }
  while(head<tail){const k=flood[head++],x=k%w,y=Math.floor(k/w)
   for(const n of [x?k-1:-1,x<w-1?k+1:-1,y?k-w:-1,y<h-1?k+w:-1])if(n>=0&&contrast[n]&&!exterior[n]){exterior[n]=1;flood[tail++]=n}
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((top+y)*width+left+x)*4,k=y*w+x,v=contrast[k]&&!exterior[k]?0:255;out[i]=out[i+1]=out[i+2]=v}

 }
 return {width,height,data:out}
}

/** Coarse page layout only: locate the dense drawing, without inferring grid lines/counts. */
export function drawingBounds(image:Raster):Box|null{
 const {width,height,data}=image,tile=Math.max(4,Math.round(Math.min(width,height)/70)),cols=Math.ceil(width/tile),rows=Math.ceil(height/tile)
 const luminance=(i:number)=>.3*data[i]+.59*data[i+1]+.11*data[i+2]
 const levels:number[]=[];for(let i=0;i<data.length;i+=Math.max(4,Math.floor(data.length/4096/4)*4))levels.push(luminance(i))
 levels.sort((a,b)=>a-b);const paper=levels[Math.floor(levels.length*.9)]??255
 const mask=new Uint8Array(cols*rows)
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  let ink=0,n=0
  for(let py=y*tile;py<Math.min(height,(y+1)*tile);py+=2)for(let px=x*tile;px<Math.min(width,(x+1)*tile);px+=2){const i=(py*width+px)*4;ink+=Number(luminance(i)<paper-28);n++}
  mask[y*cols+x]=Number(ink/Math.max(1,n)>.48)
 }
 let best:Box|null=null,bestArea=0
 const queue=new Int32Array(mask.length)
 for(let seed=0;seed<mask.length;seed++){
  if(mask[seed]!==1)continue
  let head=0,tail=1,l=seed%cols,r=l,t=Math.floor(seed/cols),b=t;queue[0]=seed;mask[seed]=2
  while(head<tail){const i=queue[head++],x=i%cols,y=Math.floor(i/cols);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)
   for(const v of [x?i-1:-1,x<cols-1?i+1:-1,y?i-cols:-1,y<rows-1?i+cols:-1])if(v>=0&&mask[v]===1){mask[v]=2;queue[tail++]=v}
  }
  const w=(r-l+1)*tile,h=(b-t+1)*tile
  if(tail*tile*tile>width*height*.07&&w>width*.2&&h>height*.2&&tail>bestArea){bestArea=tail;best={x:Math.max(0,l*tile-tile),y:Math.max(0,t*tile-tile),width:Math.min(width,(r+2)*tile)-Math.max(0,l*tile-tile),height:Math.min(height,(b+2)*tile)-Math.max(0,t*tile-tile)}}
 }
 return best
}
/** Find separated legend swatches outside the drawing on any of its four sides. */
export function locateLegend(image:Raster):(Box & {swatches:number})|null{
 // Layout analysis does not need source resolution. Keep work bounded on phone photos.
 if(Math.max(image.width,image.height)>1000){
  const scale=1000/Math.max(image.width,image.height),width=Math.round(image.width*scale),height=Math.round(image.height*scale),data=new Uint8ClampedArray(width*height*4)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const src=(Math.min(image.height-1,Math.floor(y/scale))*image.width+Math.min(image.width-1,Math.floor(x/scale)))*4;data.set(image.data.subarray(src,src+4),(y*width+x)*4)}
  const found=locateLegend({width,height,data});return found?{x:found.x/scale,y:found.y/scale,width:found.width/scale,height:found.height/scale,swatches:found.swatches}:null
 }
 const {width,height,data}=image,body=drawingBounds(image),visited=new Uint8Array(width*height),queue=new Int32Array(width*height),boxes:Box[]=[]
 const outside=(x:number,y:number)=>!body||x<body.x||x>body.x+body.width||y<body.y||y>body.y+body.height
 const levels:number[]=[];for(let i=0;i<data.length;i+=Math.max(4,Math.floor(data.length/4096/4)*4))levels.push(.3*data[i]+.59*data[i+1]+.11*data[i+2]);levels.sort((a,b)=>a-b);const paper=levels[Math.floor(levels.length*.9)]??255
 const eligible=(i:number)=>{const j=i*4,r=data[j],g=data[j+1],b=data[j+2];return data[j+3]>=100&&(Math.max(r,g,b)-Math.min(r,g,b)>40||.3*r+.59*g+.11*b<paper*.78)}
 for(let seed=0;seed<visited.length;seed++){
  if(visited[seed]||!outside(seed%width,Math.floor(seed/width))||!eligible(seed))continue
  let head=0,tail=1,left=seed%width,right=left,top=Math.floor(seed/width),bottom=top;queue[0]=seed;visited[seed]=1
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)
   for(const n of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(n>=0&&!visited[n]&&eligible(n)){visited[n]=1;queue[tail++]=n}
  }
  const w=right-left+1,h=bottom-top+1
  if(w<5||h<5||w>width*.18||h>height*.14||w/h<.5||w/h>3.5||tail/(w*h)<.55)continue
  if(body&&left<body.x+body.width&&right>body.x&&top<body.y+body.height&&bottom>body.y)continue
  const samples:number[][]=[];for(let y=top+1;y<bottom;y+=Math.max(1,Math.floor(h/8)))for(let x=left+1;x<right;x+=Math.max(1,Math.floor(w/8)))samples.push(pixel(image,x,y))
  const bg=dominant(samples),uniform=samples.filter(p=>p.every((v,ch)=>Math.abs(v-bg[ch])<28)).length/Math.max(1,samples.length)
  if(uniform>.6)boxes.push({x:left,y:top,width:w,height:h})
 }
 const isolated=boxes.filter(b=>!boxes.some(other=>other!==b&&Math.hypot(Math.max(0,other.x-b.x-b.width,b.x-other.x-other.width),Math.max(0,other.y-b.y-b.height,b.y-other.y-other.height))<Math.min(b.width,b.height)*.4))
 const groups=body?[
  isolated.filter(b=>b.y>=body.y+body.height),isolated.filter(b=>b.x>=body.x+body.width),
  isolated.filter(b=>b.x+b.width<=body.x),isolated.filter(b=>b.y+b.height<=body.y),
 ]:[isolated.filter(b=>b.y>height*.65),isolated.filter(b=>b.x>width*.65),isolated.filter(b=>b.x+b.width<width*.35),isolated.filter(b=>b.y+b.height<height*.35)]
 const group=groups.sort((a,b)=>b.length-a.length)[0]
 if(group.length<2)return null
 const typical=group.map(b=>Math.min(b.width,b.height)).sort((a,b)=>a-b)[Math.floor(group.length/2)]
 const coherent=group.filter(b=>Math.min(b.width,b.height)>typical*.5&&Math.min(b.width,b.height)<typical*2)
 if(coherent.length<2)return null
 const pad=Math.max(...coherent.map(b=>b.width));let left=Math.max(0,Math.min(...coherent.map(b=>b.x))-typical*.4),top=Math.max(0,Math.min(...coherent.map(b=>b.y))-typical*.4)
 let right=Math.min(width-1,Math.max(...coherent.map(b=>b.x+b.width))+pad*2.8),bottom=Math.min(height-1,Math.max(...coherent.map(b=>b.y+b.height))+typical*1.5)
 if(body){if(coherent.every(b=>b.y>=body.y+body.height))top=Math.max(top,body.y+body.height);if(coherent.every(b=>b.x>=body.x+body.width))left=Math.max(left,body.x+body.width);if(coherent.every(b=>b.y+b.height<=body.y))bottom=Math.min(bottom,body.y);if(coherent.every(b=>b.x+b.width<=body.x))right=Math.min(right,body.x)}
 return {x:left,y:top,width:right-left,height:bottom-top,swatches:coherent.length}
}
