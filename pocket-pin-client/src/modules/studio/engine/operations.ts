export type Cells = Array<string | null>
export type Rect = { x: number; y: number; width: number; height: number }
export function bounds(cells: Cells, width: number, height: number): Rect {
  let left = width, top = height, right = -1, bottom = -1
  cells.forEach((cell, i) => { if (cell) { left = Math.min(left, i % width); right = Math.max(right, i % width); top = Math.min(top, Math.floor(i / width)); bottom = Math.max(bottom, Math.floor(i / width)) } })
  return right < 0 ? { x: 0, y: 0, width, height } : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}
export function lineCells(a: number, b: number, width: number): number[] {
  let x = a % width, y = Math.floor(a / width)
  const tx = b % width, ty = Math.floor(b / width), dx = Math.abs(tx - x), dy = -Math.abs(ty - y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1
  let error = dx + dy; const result: number[] = []
  while (true) { result.push(y * width + x); if (x === tx && y === ty) break; const e = error * 2; if (e >= dy) { error += dy; x += sx } if (e <= dx) { error += dx; y += sy } }
  return result
}
export function connected(cells: Cells, width: number, start: number): number[] {
  if (start < 0 || start >= cells.length) return []
  const target = cells[start], seen = new Set<number>(), queue = [start]
  while (queue.length) { const i = queue.pop()!; if (seen.has(i) || cells[i] !== target) continue; seen.add(i); if (i % width > 0) queue.push(i - 1); if (i % width < width - 1) queue.push(i + 1); if (i >= width) queue.push(i - width); if (i + width < cells.length) queue.push(i + width) }
  return [...seen]
}
export function selectionRect(a: number, b: number, width: number): Rect {
  const x = Math.min(a % width, b % width), y = Math.min(Math.floor(a / width), Math.floor(b / width))
  return { x, y, width: Math.abs(a % width - b % width) + 1, height: Math.abs(Math.floor(a / width) - Math.floor(b / width)) + 1 }
}
export function rectIndices(rect: Rect, width: number): number[] {
  const result: number[] = []; for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) result.push(y * width + x); return result
}
export function resizeCells(cells: Cells, oldWidth: number, width: number, height: number, anchor: 'center' | 'top-left'): Cells {
  const dx = anchor === 'center' ? Math.floor((width - oldWidth) / 2) : 0, dy = anchor === 'center' ? Math.floor((height - cells.length / oldWidth) / 2) : 0
  const result: Cells = Array(width * height).fill(null)
  cells.forEach((cell, i) => { const x = i % oldWidth + dx, y = Math.floor(i / oldWidth) + dy; if (x >= 0 && x < width && y >= 0 && y < height) result[y * width + x] = cell }); return result
}
export function imageDimensions(sourceWidth: number, sourceHeight: number, target: number) {
  const ratio = Math.min(Math.max(8, Math.min(180, Math.round(target))) / sourceWidth, 180 / sourceHeight)
  return { width: Math.max(1, Math.round(sourceWidth * ratio)), height: Math.max(1, Math.round(sourceHeight * ratio)) }
}
export function fitImageToBoard(sourceWidth:number,sourceHeight:number,boardWidth:number,boardHeight:number,targetWidth:number){
  const target=Math.max(1,Math.min(180,Math.round(targetWidth)));
  const ratio=Math.min(target/sourceWidth,target/sourceHeight,boardWidth/sourceWidth,boardHeight/sourceHeight);
  return {width:Math.max(1,Math.min(boardWidth,Math.round(sourceWidth*ratio))),height:Math.max(1,Math.min(boardHeight,Math.round(sourceHeight*ratio)))};
}
export function gridOpacity(size: number, position: number, always = false) {
  const major = position % 10 === 0, medium = position % 5 === 0
  if (always) return major ? .32 : medium ? .2 : .12
  const fade = (start: number, end: number) => Math.max(0, Math.min(1, (size - start) / (end - start)))
  return major ? .3 * fade(6, 12) : medium ? .18 * fade(8, 16) : .12 * fade(12, 24)
}
export function zoomAround(view: { x: number; y: number; size: number }, point: { x: number; y: number }, size: number) {
  return { size, x: point.x - (point.x - view.x) * size / view.size, y: point.y - (point.y - view.y) * size / view.size }
}
