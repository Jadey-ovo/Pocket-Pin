// Perceptual coordinates keep brightness and hue errors on comparable scales.
export function perceptual(rgb:number[]):number[]{
 const [r,g,b]=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [(.2104542553*l+.793617785*m-.0040720468*s)*100,(1.9779984951*l-2.428592205*m+.4505937099*s)*100,(.0259040371*l+.7827717662*m-.808675766*s)*100];
}
const distance=(a:number[],b:number[])=>1.5*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
type Color={code:string;rgb:number[]};
export function featureQuantize(values:(number[]|null)[],width:number,choices:Color[],limit:number,preserve:boolean):(string|null)[]{
 const labs=values.map(v=>v?perceptual(v):null),palette=choices.map(c=>({...c,lab:perceptual(c.rgb)}));
 const weights=labs.map((v,i)=>{if(!v)return 0;let contrast=0;for(const j of neighbors(i,width,labs.length)){const n=labs[j];if(n)contrast=Math.max(contrast,Math.sqrt(distance(v,n)))}return 1+(preserve?5:1)*Math.min(1,contrast/25)});
 const histogram=new Map<string,{lab:number[];weight:number}>();
 labs.forEach((v,i)=>{if(!v)return;const key=v.map(x=>Math.round(x)).join(',');const bin=histogram.get(key);if(bin)bin.weight+=weights[i];else histogram.set(key,{lab:v,weight:weights[i]})});
 const bins=[...histogram.values()];if(!bins.length)return values.map(()=>null);
 const nearest=(v:number[],list:typeof palette)=>list.reduce((best,c)=>distance(v,c.lab)<distance(v,best.lab)?c:best,list[0]);
 const selected:typeof palette=[];const errors=bins.map(()=>Infinity);
 // Seed with a representative color, then spend the budget on remaining visual error.
 let next=bins.reduce((a,b)=>a.weight>b.weight?a:b).lab;
 for(let k=0;k<Math.min(limit,palette.length,bins.length);k++){
  const available=palette.filter(c=>!selected.some(s=>s.code===c.code));
  const chosen=nearest(next,available);selected.push(chosen);
  let score=-1,index=0;
  bins.forEach((bin,i)=>{errors[i]=Math.min(errors[i],distance(bin.lab,chosen.lab));const loss=errors[i]*Math.sqrt(bin.weight);if(loss>score){score=loss;index=i}});
  if(score<.01)break;next=bins[index].lab;
 }
 // Refine representative colors, constrained to real, allowed bead colors.
 for(let iteration=0;iteration<3;iteration++){
  const sums=selected.map(()=>({sum:[0,0,0],weight:0}));
  bins.forEach(bin=>{const c=nearest(bin.lab,selected),i=selected.indexOf(c),w=bin.weight;sums[i].weight+=w;bin.lab.forEach((v,ch)=>sums[i].sum[ch]+=v*w)});
  const used=new Set<string>();
  selected.forEach((c,i)=>{const sum=sums[i];const available=palette.filter(p=>!used.has(p.code));const replacement=sum.weight?nearest(sum.sum.map(v=>v/sum.weight),available):nearest(c.lab,available);selected[i]=replacement;used.add(replacement.code)});
 }
 const result=labs.map(v=>v?nearest(v,selected):null);
 if(preserve){
  // One synchronous pass: protect strong source boundaries without growing/drawing outlines.
  const original=[...result];
  labs.forEach((v,i)=>{if(!v)return;const candidates=[...selected].sort((a,b)=>distance(v,a.lab)-distance(v,b.lab)).slice(0,3);
   const cost=(c:typeof palette[number])=>{let loss=distance(v,c.lab);for(const j of neighbors(i,width,labs.length)){const n=labs[j],mapped=original[j];if(!n||!mapped)continue;const delta=v[0]-n[0];if(Math.abs(delta)<10)continue;const represented=c.lab[0]-mapped.lab[0];loss+=.3*Math.max(0,Math.min(25,Math.abs(delta))-Math.sign(delta)*represented)**2}return loss};
   result[i]=candidates.reduce((a,b)=>cost(a)<=cost(b)?a:b);
  });
 }
 return result.map(c=>c?.code??null);
}
function neighbors(i:number,width:number,length:number){const out:number[]=[];if(i%width)out.push(i-1);if(i%width<width-1)out.push(i+1);if(i>=width)out.push(i-width);if(i+width<length)out.push(i+width);return out}
