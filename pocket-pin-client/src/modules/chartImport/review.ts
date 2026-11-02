import type {ChartResult,LegendEntry} from './recognition'
export function countCells(cells:(string|null)[]):Record<string,number>{const counts:Record<string,number>={};for(const c of cells)if(c)counts[c]=(counts[c]??0)+1;return counts}
export function compareCounts(result:ChartResult,legend:LegendEntry[]){
 const counts=countCells(result.cells)
 return [...new Set([...Object.keys(counts),...legend.map(e=>e.code)])].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(code=>{const expected=legend.find(e=>e.code===code)?.count??null,actual=counts[code]??0;return {code,actual,expected,delta:expected===null?null:actual-expected}})
}
export function reassignCells(result:ChartResult,indices:number[],code:string|null):ChartResult{
 const selected=new Set(indices),cells=result.cells.map((c,i)=>selected.has(i)?code:c)
 return {...result,cells,counts:countCells(cells),uncertain:result.uncertain.filter(i=>!selected.has(i))}
}
