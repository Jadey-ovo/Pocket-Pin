import { generateCells, type GenerationInput } from './colors'
self.onmessage = (event: MessageEvent<GenerationInput & { id: number }>) => {
  try { self.postMessage({ id: event.data.id, cells: generateCells(event.data) }) }
  catch (error) { self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : '生成失败，请重试' }) }
}
