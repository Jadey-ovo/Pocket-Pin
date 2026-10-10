export type ImageStyle = 'cartoon' | 'realistic'
// A conservative local suggestion: flat, repeated colors are characteristic of
// illustrations. Ambiguous/textured images use the photo path, not cartoon mode.
export function suggestImageStyle(pixels: Uint8ClampedArray, width: number, height: number): ImageStyle {
  const bins = new Map<string, number>(); let count = 0, pairs = 0, flat = 0
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    if (pixels[i + 3] < 100) continue
    count++
    const key = [0, 1, 2].map(ch => Math.floor(pixels[i + ch] / 24)).join(',')
    bins.set(key, (bins.get(key) ?? 0) + 1)
    if (x && pixels[i - 1] >= 100) {
      pairs++
      if ([0, 1, 2].every(ch => Math.abs(pixels[i + ch] - pixels[i - 4 + ch]) <= 6)) flat++
    }
  }
  const coverage = [...bins.values()].sort((a, b) => b - a).slice(0, 12).reduce((a, b) => a + b, 0) / Math.max(1, count)
  return flat / Math.max(1, pairs) > .65 && coverage > .7 ? 'cartoon' : 'realistic'
}
