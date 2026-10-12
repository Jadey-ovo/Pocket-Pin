import {track} from '@/shared/analytics'
import type { BeadProject } from '@/core/project'
import { createProject } from './printModel'
import { downloadPrintPdf, downloadPrintPng, downloadPrintImage, renderPrintCanvas, type PrintExportOptions, downloadUsageWorkbook } from './print'
export function downloadJson(project: BeadProject, legacy = false) {
 track('export_start',{format:legacy?'legacy':'json'});try{
  const blob = new Blob([JSON.stringify(legacy ? { ...project, layers: project.legacyLayers } : project, null, 2)], { type:'application/json' }), url=URL.createObjectURL(blob), a=document.createElement('a')
  a.href=url;a.download=`${project.name}${legacy?'_原始图层备份':''}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);track('export_success',{format:legacy?'legacy':'json'})
 }catch(error){track('export_failure',{format:legacy?'legacy':'json',reason:'export_failed'});throw error}
}
export function toPrintProject(project:BeadProject){
  const p=createProject(project.width,project.height,project.name)
  p.cells=project.cells.map(c=>c?`mard-${c.toLowerCase()}`:null);p.layers[0].cells=p.cells;p.layers[0].name='拼豆图纸';p.settings.beadsPerPack=project.settings?.beadsPerPack||500
  return p
}
export function previewExport(project:BeadProject,options:PrintExportOptions){return renderPrintCanvas(toPrintProject(project),options)}
export async function exportProject(project:BeadProject, format:'pdf'|'png'|'jpg'|'xlsx', author='',custom:Partial<PrintExportOptions>={}) {
  track('export_start',{format});const started=performance.now();try{
  const p=toPrintProject(project)
  const options={showColorCodes:true,showGuideLines:true,projectName:project.name,authorName:author,exportBounds:'canvas' as const,...custom}
  if(format==='pdf')await downloadPrintPdf(p,options);else if(format==='png'||format==='jpg')await downloadPrintImage(p,options,format);else await downloadUsageWorkbook(p);
  track('export_success',{format,duration:performance.now()-started})
  }catch(error){track('export_failure',{format,reason:'export_failed',duration:performance.now()-started});throw error}
}
