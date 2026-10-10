import cvModule from '@techstark/opencv-js'
import type { GenerationInput } from './colors'
import cascadeXml from './assets/haarcascade_frontalface_default.xml?raw'

// The WASM runtime is bundled with the worker, so generation works without a CDN.
const ready = new Promise<void>(resolve => {
  if (cvModule.Mat) resolve()
  else (cvModule as typeof cvModule & { onRuntimeInitialized: () => void }).onRuntimeInitialized = () => resolve()
})

let detector: InstanceType<typeof cvModule.CascadeClassifier> | undefined
function faceWeights(gray: InstanceType<typeof cvModule.Mat>, input: GenerationInput) {
  const cv = cvModule, scale = input.sampleScale ?? 3
  if (Math.min(gray.cols, gray.rows) < 48) return undefined
  if (!detector) {
    cv.FS_createDataFile('/', 'pocketpin-face.xml', new TextEncoder().encode(cascadeXml), true, false, false)
    detector = new cv.CascadeClassifier()
    if (!detector.load('pocketpin-face.xml')) throw new Error('人物细节模型加载失败')
  }
  const resized = new cv.Mat(), equalized = new cv.Mat(), faces = new cv.RectVector()
  try {
    const ratio = Math.min(1, 480 / Math.max(gray.cols, gray.rows))
    cv.resize(gray, resized, new cv.Size(Math.round(gray.cols * ratio), Math.round(gray.rows * ratio)), 0, 0, cv.INTER_AREA)
    cv.equalizeHist(resized, equalized)
    detector.detectMultiScale(equalized, faces, 1.1, 4, 0, new cv.Size(24, 24), new cv.Size(0, 0))
    if (!faces.size()) return undefined
    const weights = new Uint8Array(input.width * input.height).fill(1)
    for (let i = 0; i < faces.size(); i++) {
      const r = faces.get(i), unit = ratio * scale
      for (let y = Math.max(0, Math.floor(r.y / unit)); y < Math.min(input.height, Math.ceil((r.y + r.height) / unit)); y++)
        for (let x = Math.max(0, Math.floor(r.x / unit)); x < Math.min(input.width, Math.ceil((r.x + r.width) / unit)); x++) weights[y * input.width + x] = 6
    }
    return weights
  } finally { faces.delete(); equalized.delete(); resized.delete() }
}

export async function prepareImage(input: GenerationInput): Promise<GenerationInput> {
  // Cartoon strokes already have intentional geometry and anti-aliasing.
  // Preserve those pixels; only photos need edge-aware smoothing.
  if (input.style === 'cartoon') return input
  await ready
  const cv = cvModule, scale = input.sampleScale ?? 3
  const source = cv.matFromArray(input.height * scale, input.width * scale, cv.CV_8UC4, input.pixels)
  const rgb = new cv.Mat(), smooth = new cv.Mat(), gray = new cv.Mat(), edges = new cv.Mat()
  try {
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB)
    cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY)
    const importance = faceWeights(gray, input)
    cv.bilateralFilter(rgb, smooth, 5, 25, 3, cv.BORDER_REPLICATE)
    cv.cvtColor(smooth, gray, cv.COLOR_RGB2GRAY)
    cv.Canny(gray, edges, 40, 100, 3, true)
    const pixels = new Uint8ClampedArray(input.pixels)
    for (let i = 0; i < pixels.length / 4; i++) {
      // Retain original alpha; filtering must never fill transparent canvas margins.
      for (let ch = 0; ch < 3; ch++) pixels[i * 4 + ch] = smooth.data[i * 3 + ch]
    }
    return { ...input, pixels, importance, edges: new Uint8Array(edges.data) }
  } finally {
    edges.delete(); gray.delete(); smooth.delete(); rgb.delete(); source.delete()
  }
}
