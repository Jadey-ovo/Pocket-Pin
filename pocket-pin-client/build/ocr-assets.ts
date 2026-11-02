import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'
// Serve identical, locally hosted OCR assets in development and production.
export function ocrAssets():Plugin {
 const require=createRequire(import.meta.url),root=dirname(require.resolve('tesseract.js/package.json')),core=dirname(require.resolve('tesseract.js-core/package.json')),lang=dirname(require.resolve('@tesseract.js-data/eng/package.json'))
 const files=new Map<string,string>([['worker.min.js',join(root,'dist/worker.min.js')],['eng.traineddata.gz',join(lang,'4.0.0/eng.traineddata.gz')],['LICENSE-tesseract',join(root,'LICENSE.md')],['LICENSE-core',join(core,'LICENSE')]])
 for(const name of readdirSync(core))if(/\.wasm(\.js)?$/.test(name))files.set(name,join(core,name))
 return {name:'pocketpin-local-ocr',configureServer(server){server.middlewares.use((req,res,next)=>{
  const name=(req.url??'').split('?')[0].replace(/^.*\/ocr\//,'');const path=files.get(name)
  if(!path||!(req.url??'').includes('/ocr/'))return next()
  res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.wasm')?'application/wasm':'application/octet-stream');res.end(readFileSync(path))
 })},generateBundle(){for(const [name,path] of files)this.emitFile({type:'asset',fileName:`ocr/${name}`,source:readFileSync(path)})}}
}
