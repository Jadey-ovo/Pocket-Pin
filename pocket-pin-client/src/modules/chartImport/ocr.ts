import type { Worker } from 'tesseract.js'
import {parseTsv,type Word} from './recognition'
export function createChartOcr(onProgress:(value:number)=>void){
 let worker:Worker|undefined,cancelled=false
 return {
  async read(canvas:HTMLCanvasElement):Promise<Word[]>{
   if(cancelled)throw new Error('识别已取消')
   const {createWorker,OEM,PSM}=await import('tesseract.js')
   if(!worker){
    const base=new URL(`${import.meta.env.BASE_URL}ocr/`,window.location.origin).href
    const created=await createWorker('eng',OEM.LSTM_ONLY,{workerPath:`${base}worker.min.js`,corePath:base,langPath:base,logger:m=>{if(!cancelled)onProgress(m.status==='recognizing text'?m.progress:0)}})
    if(cancelled){await created.terminate();throw new Error('识别已取消')}
    worker=created
    await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1',tessedit_char_whitelist:'ABCDEFGHM0123456789xX*:'})
   }
   const {data}=await worker.recognize(canvas,{}, {tsv:true,text:true})
   if(cancelled)throw new Error('识别已取消')
   return parseTsv(data.tsv??'')
  },
  cancel(){cancelled=true;if(worker){void worker.terminate();worker=undefined}}
 }
}
