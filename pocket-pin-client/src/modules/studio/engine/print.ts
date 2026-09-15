import { getColor, mappedCode } from '../../../../../reference/perler-beads-generator/src/palette';
import type { BeadLayer, BeadProject, UsageRow } from '../../../../../reference/perler-beads-generator/src/types';

export type PrintExportOptions = {
  format?: 'png' | 'jpg' | 'pdf';
  watermark?: { text: string; opacity: number; enabled: boolean };
  exportBounds?: 'pattern' | 'canvas';
  showColorCodes: boolean;
  showGuideLines: boolean;
  projectName?: string;
  fileName?: string;
  authorName?: string;
  layerName?: string;
  layerLabelPrefix?: string;
};

const PRINT_EXPORT_PPI = 330;
const CSS_PIXEL_PPI = 96;
const MAX_EXPORT_CANVAS_SIDE = 12000;
const PRINT_EXPORT_SCALE = PRINT_EXPORT_PPI / CSS_PIXEL_PPI;

export function downloadProjectJson(project: BeadProject): void {
  downloadBlob(`${safeName(project.name || '\u62fc\u8c46\u7f16\u8f91\u8bb0\u5f55')}-\u7f16\u8f91\u8bb0\u5f55_perler.json`, JSON.stringify(project, null, 2), 'application/json');
}

export function downloadUsageCsv(project: BeadProject, usage: UsageRow[]): void {
  const totalBeads = usage.reduce((sum, row) => sum + row.count, 0);
  const summaryRows = [
    ['\u9879\u76ee\u540d\u79f0', project.name],
    ['\u8272\u53f7\u54c1\u724c', project.activeBrand],
    ['\u753b\u5e03\u5c3a\u5bf8', `${project.width} x ${project.height}`],
    ['\u603b\u9897\u6570', totalBeads],
    ['\u989c\u8272\u6570', usage.length],
    ['\u6bcf\u5305\u6570\u91cf', `${project.settings.beadsPerPack} \u9897/\u5305`],
    [],
  ];
  const header = ['\u8272\u53f7\u54c1\u724c', '\u8272\u53f7', '\u989c\u8272\u540d\u79f0', 'HEX', '\u6570\u91cf', '\u9884\u8ba1\u5305\u6570'];
  const rows = usage.map((row) =>
    [
      project.activeBrand,
      mappedCode(row.color, project.activeBrand),
      row.color.name,
      row.color.hex,
      row.count,
      row.packs,
    ]
      .map(csvCell)
      .join(',')
  );
  const content = [
    ...summaryRows.map((row) => row.map(csvCell).join(',')),
    header.map(csvCell).join(','),
    ...rows,
  ].join('\n');
  downloadBlob(`${safeName(project.name || '\u62fc\u8c46\u56fe\u7eb8')}-\u7528\u91cf\u6e05\u5355.csv`, `\ufeff${content}`, 'text/csv;charset=utf-8');
}

export function downloadUsageWorkbook(project: BeadProject): void {
  const usageLayers = (project.layers ?? []).filter((layer) => layer.includeInUsage);
  const sheets = [
    {
      name: '\u603b\u6570',
      rows: usageSheetRows(project, '\u603b\u6570', summarizeLayerUsage(project, usageLayers)),
    },
    ...usageLayers.map((layer, index) => ({
      name: usageLayerSheetName(layer, index),
      rows: usageSheetRows(project, usageLayerSheetName(layer, index), summarizeLayerUsage(project, [layer])),
    })),
  ];
  const workbook = createXlsxWorkbook(sheets);
  downloadBlob(`${safeName(project.name || '\u62fc\u8c46\u56fe\u7eb8')}-\u7528\u91cf\u6e05\u5355.xlsx`, workbook, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function downloadPrintImage(project: BeadProject, options: PrintExportOptions, format: 'png'|'jpg'='png'): Promise<void> {
  for(const item of printLayerProjects(project,options)){
    const layerOptions={...options,layerName:item.layerName},canvas=renderPrintCanvas(item.project,layerOptions),mime=format==='jpg'?'image/jpeg':'image/png';
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败')),mime,.96));
    downloadBlob(`${printFileName(layerOptions)}.${format}`,blob,mime);
  }
}
export function downloadPrintPng(project:BeadProject,options:PrintExportOptions={showColorCodes:true,showGuideLines:true}){return downloadPrintImage(project,options,'png')}

export function downloadPrintPdf(project: BeadProject, options: PrintExportOptions = { showColorCodes: true, showGuideLines: true }): void {
  printLayerProjects(project, options).forEach((item) => {
    const layerOptions = { ...options, layerName: item.layerName };
    const canvas = renderPrintCanvas(item.project, layerOptions);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    const jpegBytes = dataUrlToBytes(dataUrl);
    const pdf = createSingleImagePdf(jpegBytes, canvas.width, canvas.height, PRINT_EXPORT_PPI);
    downloadBlob(`${printFileName(layerOptions)}.pdf`, pdf, 'application/pdf');
  });
}

export function renderPrintCanvas(project: BeadProject, options: PrintExportOptions): HTMLCanvasElement {
  const printProject=options.exportBounds==='canvas'?project:cropProjectToPattern(project),usage=summarizeProjectUsage(printProject);
  const margin=30,labelBand=24,headerHeight=88;
  // Grow small patterns to balance a long palette; keep large grids legible.
  const legendRows=Math.max(1,Math.ceil(usage.length/3));
  const chipHeight=40,chipGap=8,legendWidth=320;
  const legendHeight=legendRows*(chipHeight+chipGap)-chipGap;
  const cellSize=Math.max(24,Math.min(40,Math.ceil(legendHeight/printProject.height)));
  const gridWidth=printProject.width*cellSize,gridHeight=printProject.height*cellSize;
  const boardWidth=Math.max(240,gridWidth+labelBand*2),bodyHeight=Math.max(gridHeight+labelBand*2,legendHeight);
  const contentWidth=boardWidth+28+legendWidth;
  const naturalWidth=contentWidth+margin*2,naturalHeight=margin+headerHeight+bodyHeight+margin;
  const ratio=naturalWidth/naturalHeight>1.16?4/3:1;
  const width=Math.max(naturalWidth,naturalHeight*ratio),height=width/ratio;
  const bodyLeft=(width-contentWidth)/2,bodyTop=margin+headerHeight+(height-naturalHeight)/2;
  const gridLeft=bodyLeft+(boardWidth-gridWidth)/2,gridTop=bodyTop+labelBand;
  const scale=resolvePrintScale(width,height),canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
  const context=canvas.getContext('2d');if(!context)throw new Error('Canvas is not available.');context.scale(scale,scale);
  context.fillStyle='#f5ecd8';context.fillRect(0,0,width,height);
  context.fillStyle='#fffaf0';roundRect(context,12,12,width-24,height-24,22);context.fill();
  context.fillStyle='#705944';context.textAlign='left';context.textBaseline='middle';context.font='700 25px Nunito, "Noto Sans SC", sans-serif';context.fillText(printDisplayName(options),margin,margin+15,contentWidth);
  context.font='500 13px Nunito, "Noto Sans SC", sans-serif';context.fillStyle='#927960';context.fillText(`${printProject.width} × ${printProject.height} 格   ·   ${usage.length} 色   ·   ${usage.reduce((sum,row)=>sum+row.count,0)} 颗`,margin,margin+45);
  context.fillText(options.authorName?.trim()?`Pocket Pin  ·  ${options.authorName.trim()}`:'Pocket Pin · 拼豆图纸',margin,margin+65,contentWidth);
  drawCoordinateBands(context,printProject,gridLeft,gridTop,labelBand,cellSize);
  for(let y=0;y<printProject.height;y++)for(let x=0;x<printProject.width;x++){
    const left=gridLeft+x*cellSize,top=gridTop+y*cellSize,color=getColor(printProject.cells[y*printProject.width+x]);context.fillStyle=color?.hex??'#fffdf7';context.fillRect(left,top,cellSize,cellSize);
    if(options.showColorCodes&&color){context.fillStyle=luminance(color.rgb)<130?'#ffffff':'#503d30';context.font=`700 ${Math.max(8,Math.floor(cellSize*.38))}px Nunito, sans-serif`;context.textAlign='center';context.fillText(color.primaryCode,left+cellSize/2,top+cellSize/2+.4)}
  }
  context.strokeStyle='#cf454f';context.lineWidth=1.25;context.beginPath();for(let x=0;x<=printProject.width;x++){context.moveTo(gridLeft+x*cellSize,gridTop);context.lineTo(gridLeft+x*cellSize,gridTop+gridHeight)}for(let y=0;y<=printProject.height;y++){context.moveTo(gridLeft,gridTop+y*cellSize);context.lineTo(gridLeft+gridWidth,gridTop+y*cellSize)}context.stroke();
  if(options.showGuideLines)drawPrintGuideLines(context,printProject,gridLeft,gridTop,cellSize);drawOuterGridFrame(context,gridLeft,gridTop,gridWidth,gridHeight);
  drawUsageLegend(context,usage,bodyLeft+boardWidth+28,bodyTop,legendWidth,chipHeight,chipGap);
  if(options.watermark?.enabled&&options.watermark.text.trim())drawWatermark(context,width,height,options.watermark);
  return canvas;
}
export function drawWatermark(context:CanvasRenderingContext2D,width:number,height:number,watermark:{text:string;opacity:number}){
  context.save();context.globalAlpha=Math.max(0,Math.min(1,watermark.opacity));context.fillStyle='#705944';context.font='600 22px Nunito, "Noto Sans SC", sans-serif';context.textAlign='center';context.textBaseline='middle';context.translate(width/2,height/2);context.rotate(-Math.PI/4);
  const radius=Math.hypot(width,height)/2,step=Math.max(180,context.measureText(watermark.text).width+90);
  for(let y=-radius;y<=radius;y+=120)for(let x=-radius;x<=radius;x+=step)context.fillText(watermark.text,x,y);
  context.restore();
}

function resolvePrintScale(width: number, height: number): number {
  const sideLimit = Math.min(MAX_EXPORT_CANVAS_SIDE / width, MAX_EXPORT_CANVAS_SIDE / height);
  return Math.min(PRINT_EXPORT_SCALE, sideLimit, Math.sqrt(16000000 / (width * height)));
}

function drawCoordinateBands(
  context: CanvasRenderingContext2D,
  project: BeadProject,
  gridLeft: number,
  gridTop: number,
  labelBand: number,
  cellSize: number,
): void {
  context.save();
  context.fillStyle = '#efe0cb';
  context.strokeStyle = '#dec2ac';
  context.lineWidth = 0.7;
  context.font = `700 ${Math.max(9, Math.min(12, cellSize * 0.44))}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (let x = 0; x < project.width; x += 1) {
    const left = gridLeft + x * cellSize;
    const label = String(x + 1);
    context.fillRect(left, gridTop - labelBand, cellSize, labelBand);
    context.strokeRect(left, gridTop - labelBand, cellSize, labelBand);
    context.fillRect(left, gridTop + project.height * cellSize, cellSize, labelBand);
    context.strokeRect(left, gridTop + project.height * cellSize, cellSize, labelBand);
    context.fillStyle = '#705944';
    context.fillText(label, left + cellSize / 2, gridTop - labelBand / 2);
    context.fillText(label, left + cellSize / 2, gridTop + project.height * cellSize + labelBand / 2);
    context.fillStyle = '#efe0cb';
  }

  for (let y = 0; y < project.height; y += 1) {
    const top = gridTop + y * cellSize;
    const label = String(y + 1);
    context.fillRect(gridLeft - labelBand, top, labelBand, cellSize);
    context.strokeRect(gridLeft - labelBand, top, labelBand, cellSize);
    context.fillRect(gridLeft + project.width * cellSize, top, labelBand, cellSize);
    context.strokeRect(gridLeft + project.width * cellSize, top, labelBand, cellSize);
    context.fillStyle = '#705944';
    context.fillText(label, gridLeft - labelBand / 2, top + cellSize / 2);
    context.fillText(label, gridLeft + project.width * cellSize + labelBand / 2, top + cellSize / 2);
    context.fillStyle = '#efe0cb';
  }
  context.restore();
}

function drawPrintGuideLines(
  context: CanvasRenderingContext2D,
  project: BeadProject,
  gridLeft: number,
  gridTop: number,
  cellSize: number,
): void {
  context.save();
  context.strokeStyle = '#b92c3c';
  context.lineWidth = 2.4;
  guideLineEdges(project.width, project.boardSettings.boardWidth).forEach((x, index) => {
    context.setLineDash([]);
    const left = gridLeft + x * cellSize;
    context.beginPath();
    context.moveTo(left, gridTop);
    context.lineTo(left, gridTop + project.height * cellSize);
    context.stroke();
  });
  guideLineEdges(project.height, project.boardSettings.boardHeight).forEach((y, index) => {
    context.setLineDash([]);
    const top = gridTop + y * cellSize;
    context.beginPath();
    context.moveTo(gridLeft, top);
    context.lineTo(gridLeft + project.width * cellSize, top);
    context.stroke();
  });
  context.restore();
}

function guideLineEdges(totalCells: number, boardCells: number): number[] {
  const edges = new Set<number>();
  const boardSize = Math.max(1, boardCells);
  for (let boardStart = 0; boardStart < totalCells; boardStart += boardSize) {
    const segmentLength = Math.min(boardSize, totalCells - boardStart);
    for (let offset = 5; offset < segmentLength; offset += 5) {
      edges.add(boardStart + offset);
    }
    if (boardStart + segmentLength < totalCells) edges.add(boardStart + segmentLength);
  }
  return [...edges].filter((value) => value > 0 && value < totalCells).sort((a, b) => a - b);
}

function drawOuterGridFrame(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
  context.save();
  context.strokeStyle = '#b92c3c';
  context.lineWidth = 2.4;
  context.strokeRect(left, top, width, height);
  context.restore();
}

function drawUsageLegend(context:CanvasRenderingContext2D,usage:Array<{color:NonNullable<ReturnType<typeof getColor>>;count:number}>,left:number,top:number,width:number,chipHeight:number,chipGap:number):void{
  context.save();
  const columns=3,actual=(width-(columns-1)*chipGap)/columns;
  context.textBaseline='middle';
  usage.forEach((row,index)=>{
    const x=left+index%columns*(actual+chipGap),y=top+Math.floor(index/columns)*(chipHeight+chipGap);
    context.fillStyle='#f5ecd8';roundRect(context,x,y,actual,chipHeight,10);context.fill();
    context.fillStyle=row.color.hex;roundRect(context,x+4,y+4,36,32,8);context.fill();
    context.strokeStyle='#d7c0a5';context.lineWidth=.7;context.stroke();
    context.fillStyle=luminance(row.color.rgb)<130?'#ffffff':'#503d30';context.textAlign='center';
    context.font='700 11px Nunito, sans-serif';context.fillText(row.color.primaryCode,x+22,y+chipHeight/2);
    context.fillStyle='#705944';context.textAlign='right';context.font='700 13px Nunito, sans-serif';
    context.fillText(String(row.count),x+actual-8,y+chipHeight/2,actual-48);
  });
  context.restore();
}

function summarizeProjectUsage(project: BeadProject): Array<{ color: NonNullable<ReturnType<typeof getColor>>; count: number }> {
  const counts = new Map<string, number>();
  project.cells.forEach((colorId) => {
    if (!colorId) return;
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  });
  return [...counts.entries()]
    .flatMap(([colorId, count]) => {
      const color = getColor(colorId);
      return color ? [{ color, count }] : [];
    })
    .sort((a,b)=>a.color.primaryCode.localeCompare(b.color.primaryCode,undefined,{numeric:true}));
}

function printLayerProjects(project: BeadProject, options: PrintExportOptions): Array<{ project: BeadProject; layerName?: string }> {
  const layers = project.layers ?? [];
  const nonEmptyLayers = layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => layer.cells.some(Boolean));
  if (nonEmptyLayers.length <= 1) return [{ project }];
  return nonEmptyLayers.map(({ layer, index }) => {
    const layerName = printLayerName(layer, index, options.layerLabelPrefix);
    const layerCells = normalizeLayerCells(layer.cells, project.width, project.height);
    const printLayer = {
      ...layer,
      visible: true,
      cells: layerCells,
    };
    return {
      layerName,
      project: {
        ...project,
        cells: layerCells,
        layers: [printLayer],
        activeLayerId: printLayer.id,
      },
    };
  });
}

function printLayerName(layer: BeadLayer, index: number, layerLabelPrefix = '图层'): string {
  const fallback = layerLabelPrefix === 'Layer' ? `Layer ${index + 1}` : `${layerLabelPrefix}${index + 1}`;
  const custom = layer.customName && layer.name.trim() ? layer.name.trim() : '';
  return custom ? `${fallback}-${custom}` : fallback;
}

function normalizeLayerCells(cells: Array<string | null>, width: number, height: number): Array<string | null> {
  const length = width * height;
  return Array.from({ length }, (_, index) => cells[index] ?? null);
}

type UsageWorkbookRow = Array<string | number>;

function usageSheetRows(
  project: BeadProject,
  sheetTitle: string,
  usage: Array<{ color: NonNullable<ReturnType<typeof getColor>>; count: number; packs: number }>,
): UsageWorkbookRow[] {
  const totalBeads = usage.reduce((sum, row) => sum + row.count, 0);
  return [
    ['\u9879\u76ee\u540d\u79f0', project.name || '\u62fc\u8c46\u56fe\u7eb8'],
    ['\u8868\u683c', sheetTitle],
    ['\u8272\u53f7\u54c1\u724c', project.activeBrand],
    ['\u753b\u5e03\u5c3a\u5bf8', `${project.width} x ${project.height}`],
    ['\u603b\u9897\u6570', totalBeads],
    ['\u989c\u8272\u6570', usage.length],
    ['\u6bcf\u5305\u6570\u91cf', `${project.settings.beadsPerPack} \u9897/\u5305`],
    [],
    ['\u8272\u53f7\u54c1\u724c', '\u8272\u53f7', '\u989c\u8272\u540d\u79f0', 'HEX', '\u6570\u91cf', '\u9884\u8ba1\u5305\u6570'],
    ...usage.map((row) => [
      project.activeBrand,
      mappedCode(row.color, project.activeBrand),
      row.color.name,
      row.color.hex,
      row.count,
      row.packs,
    ]),
  ];
}

function summarizeLayerUsage(
  project: BeadProject,
  layers: BeadLayer[],
): Array<{ color: NonNullable<ReturnType<typeof getColor>>; count: number; packs: number }> {
  const counts = new Map<string, number>();
  layers.forEach((layer) => {
    layer.cells.forEach((colorId) => {
      if (!colorId) return;
      counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .flatMap(([colorId, count]) => {
      const color = getColor(colorId);
      return color ? [{ color, count, packs: Math.ceil(count / project.settings.beadsPerPack) }] : [];
    })
    .sort((a,b)=>a.color.primaryCode.localeCompare(b.color.primaryCode,undefined,{numeric:true}));
}

function usageLayerSheetName(layer: BeadLayer, index: number): string {
  const name = layer.customName && layer.name.trim() ? layer.name.trim() : `\u56fe\u5c42 ${index + 1}`;
  return name;
}

function createXlsxWorkbook(sheets: Array<{ name: string; rows: UsageWorkbookRow[] }>): Blob {
  const safeSheets = uniqueSheetNames(sheets.map((sheet) => sheet.name));
  const files: Array<{ path: string; content: string }> = [
    { path: '[Content_Types].xml', content: xlsxContentTypes(sheets.length) },
    { path: '_rels/.rels', content: xlsxRootRels() },
    { path: 'xl/workbook.xml', content: xlsxWorkbookXml(safeSheets) },
    { path: 'xl/_rels/workbook.xml.rels', content: xlsxWorkbookRels(sheets.length) },
    { path: 'xl/styles.xml', content: xlsxStyles() },
    ...sheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: xlsxWorksheet(sheet.rows),
    })),
  ];
  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function xlsxContentTypes(sheetCount: number): string {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`;
}

function xlsxRootRels(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
}

function xlsxWorkbookXml(sheetNames: string[]): string {
  const sheets = sheetNames.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets}</sheets></workbook>`;
}

function xlsxWorkbookRels(sheetCount: number): string {
  const sheetRels = Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function xlsxStyles(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>';
}

function xlsxWorksheet(rows: UsageWorkbookRow[]): string {
  const sheetRows = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cells = row.map((value, columnIndex) => xlsxCell(value, columnName(columnIndex), rowNumber, rowIndex === 8)).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="12" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="12" customWidth="1"/><col min="5" max="6" width="12" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function xlsxCell(value: string | number, column: string, row: number, header: boolean): string {
  const style = header ? ' s="1"' : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${column}${row}"${style}><v>${value}</v></c>`;
  }
  return `<c r="${column}${row}" t="inlineStr"${style}><is><t>${escapeXml(String(value))}</t></is></c>`;
}

function uniqueSheetNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name, index) => {
    const base = sanitizeSheetName(name || `Sheet ${index + 1}`);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      const tail = ` ${suffix}`;
      candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  });
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

function columnName(index: number): string {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function zipStore(files: Array<{ path: string; content: string }>): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, contentBytes.length, true);
    local.setUint32(22, contentBytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);
    parts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 0, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, contentBytes.length, true);
    central.setUint32(24, contentBytes.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });
  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return concatBytes([...parts, ...centralParts, end]);
}

function concatBytes(chunks: Uint8Array[]): ArrayBuffer {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output.buffer;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function cropProjectToPattern(project: BeadProject): BeadProject {
  const occupied = project.cells.flatMap((colorId, index) => (colorId ? [index] : []));
  if (occupied.length === 0) return project;
  const xs = occupied.map((index) => index % project.width);
  const ys = occupied.map((index) => Math.floor(index / project.width));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sourceWidth = maxX - minX + 1;
  const sourceHeight = maxY - minY + 1;
  const width = sourceWidth;
  const height = sourceHeight;
  const cells: Array<string | null> = Array.from({ length: width * height }, () => null);
  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      cells[y * width + x] = project.cells[(minY + y) * project.width + (minX + x)] ?? null;
    }
  }
  return {
    ...project,
    width,
    height,
    cells,
    boardSettings: {
      ...project.boardSettings,
      boardWidth: project.boardSettings.boardWidth,
      boardHeight: project.boardSettings.boardHeight,
    },
  };
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function luminance(rgb: [number, number, number]): number {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function csvCell(value: string | number | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function safeName(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'perler-pattern';
}

function printDisplayName(options: PrintExportOptions): string {
  const baseName = options.projectName?.trim() || defaultPrintName();
  return options.layerName ? `${baseName} ${options.layerName}` : baseName;
}

function printFileName(options: PrintExportOptions): string {
  const baseName = options.fileName?.trim() || options.projectName?.trim() || defaultPrintName();
  return safeName(options.layerName ? `${baseName}_${options.layerName}` : baseName);
}

function defaultPrintName(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `\u62fc\u8c46\u56fe\u7eb8_${stamp}`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function createSingleImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number, ppi: number): Blob {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let length = 0;
  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    parts.push(toArrayBuffer(bytes));
    length += bytes.length;
  };
  const pushBytes = (bytes: Uint8Array) => {
    parts.push(toArrayBuffer(bytes));
    length += bytes.length;
  };
  const object = (id: number, chunks: Array<string | Uint8Array>) => {
    offsets[id] = length;
    pushText(`${id} 0 obj\n`);
    chunks.forEach((chunk) => (typeof chunk === 'string' ? pushText(chunk) : pushBytes(chunk)));
    pushText('\nendobj\n');
  };

  const pageWidth = Math.max(480, (imageWidth / ppi) * 72);
  const pageHeight = pageWidth * (imageHeight / imageWidth);
  const content = `q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im0 Do\nQ`;

  pushText('%PDF-1.4\n');
  object(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  object(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
  object(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  object(4, [
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    '\nendstream',
  ]);
  object(5, [`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`]);

  const xrefStart = length;
  pushText('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id += 1) {
    pushText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function downloadBlob(fileName: string, content: BlobPart, type: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
