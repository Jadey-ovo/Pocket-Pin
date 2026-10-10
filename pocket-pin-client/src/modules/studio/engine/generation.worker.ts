import { generateCells, type GenerationInput } from './colors'
import { prepareImage } from './opencv'
self.onmessage = async (event: MessageEvent<GenerationInput & { id: number }>) => {
  const input = event.data
  try { self.postMessage({ id: input.id, cells: generateCells(await prepareImage(input)) }) }
  catch (error) { self.postMessage({ id: input.id, error: error instanceof Error ? error.message : '生成失败，请重试' }) }
}
