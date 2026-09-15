import type { BeadProject } from '@/core/project'
import { createProject } from '../../../../../reference/perler-beads-generator/src/project'
import { downloadPrintPdf, downloadPrintPng, downloadPrintImage, renderPrintCanvas, type PrintExportOptions, downloadUsageWorkbook } from './print'
export function downloadJson(project: BeadProject, legacy = false) {
  const blob = new Blob([JSON.stringify(legacy ? { ...project, layers: project.legacyLayers } : project, null, 2)], { type:'application/json' }), url=URL.createObjectURL(blob), a=document.createElement('a')
  a.href=url;a.download=`${project.name}${legacy?'_原始图层备份':''}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
}
export function toPrintProject(project:BeadProject){
  const p=createProject(project.width,project.height,project.name)
  p.cells=project.cells.map(c=>c?`mard-${c.toLowerCase()}`:null);p.layers[0].cells=p.cells;p.layers[0].name='拼豆图纸';p.settings.beadsPerPack=project.settings?.beadsPerPack||500
  return p
}
export function previewExport(project:BeadProject,options:PrintExportOptions){return renderPrintCanvas(toPrintProject(project),options)}
export function exportProject(project:BeadProject, format:'pdf'|'png'|'jpg'|'xlsx', author='',custom:Partial<PrintExportOptions>={}) {
  const p=toPrintProject(project)
  const options={showColorCodes:true,showGuideLines:true,projectName:project.name,authorName:author,exportBounds:'pattern' as const,...custom}
  if(format==='pdf')return downloadPrintPdf(p,options);if(format==='png'||format==='jpg')return downloadPrintImage(p,options,format);return downloadUsageWorkbook(p)
}
