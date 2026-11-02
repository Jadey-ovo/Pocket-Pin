import {locateLegend,flattenLegend,detectGrid,detectSkew,rotateRaster,mapChart,rectifyChart,type Raster,type Grid,type LegendEntry,type Word} from './recognition'
self.onmessage=(event:MessageEvent<{id:number;type:'legend'|'enhance'|'detect'|'map';image:Raster;grid?:Grid;legend?:LegendEntry[];words?:Word[];blankCodes?:string[]}>)=>{
 const {id,type,image}=event.data
 try{
  if(type==='legend'){self.postMessage({id,type,box:locateLegend(image)});return}
  if(type==='enhance'){const normalized=flattenLegend(image);self.postMessage({id,type,image:normalized},{transfer:[normalized.data.buffer as ArrayBuffer]});return}
  if(type==='detect'){
   const skew=detectSkew(image),corrected=skew?rotateRaster(image,-skew):image
   let grid=detectGrid(corrected),raster=corrected,angle=-skew
   const original=detectGrid(image)
   if(original&&(!grid||original.confidence>grid.confidence+.1)){grid=original;raster=image;angle=0}
   self.postMessage({id,type,image:raster,angle,grid})
   }else{
   const result=mapChart(image,event.data.grid!,event.data.legend??[],event.data.words??[],event.data.blankCodes??[]),sheet=rectifyChart(image,event.data.grid!)
   self.postMessage({id,type,result,sheet},{transfer:[sheet.data.buffer as ArrayBuffer]})
  }
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'图纸识别失败，请重新调整'})}
}
