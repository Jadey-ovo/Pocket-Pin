// Only anonymous operation metadata is sent; artwork, names and image bytes stay on the device.
type EventName='visit'|'creation_start'|'image_import_success'|'image_import_failure'|'generation_start'|'generation_success'|'generation_failure'|'export_start'|'export_success'|'export_failure'
type Details={duration?:number;format?:string;reason?:string}
const endpoint='https://pocketpin-events.jadey-owo.chatgpt.site/api/events'
let visitor='',session='',creation='',lastActivity=0,initialized=false
let attribution={source:'',medium:'',campaign:''}
const creations=new Map<string,string>()
const queue:Record<string,unknown>[]=[]
let timer:ReturnType<typeof setTimeout>|undefined
const random=()=>crypto.randomUUID()
function read(key:string){try{return localStorage.getItem(key)}catch{return null}}
function write(key:string,value:string){try{localStorage.setItem(key,value)}catch{}}
function flush(){clearTimeout(timer);if(!queue.length)return;const items=queue.splice(0,20),body=JSON.stringify(items);void fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body,credentials:'omit',keepalive:true}).catch(()=>{});if(queue.length)timer=setTimeout(flush,500)}
export function track(name:EventName,details:Details={}){
 if(!import.meta.env.PROD||!initialized)return;
 try{
  const now=Date.now();ensureSession(now);
  queue.push(event(name,now,details));if(queue.length>=20)flush();else{clearTimeout(timer);timer=setTimeout(flush,500)}
 }catch{/* Analytics must never interrupt creation or export. */}
}
function ensureSession(now:number){if(now-lastActivity>30*60000){session=random();creation='';creations.clear();queue.push(event('visit',now,{}))}lastActivity=now;try{sessionStorage.setItem('pocket-pin:analytics-session',JSON.stringify({id:session,at:now}))}catch{}}
function event(name:EventName,at:number,details:Details){return {id:random(),name,at,visitor,session,creation,...attribution,device:matchMedia('(pointer: coarse)').matches?'mobile':'desktop',version:'2026.10.12',...details}}
export function startCreation(localProjectId:string){
 try{ensureSession(Date.now());let id=creations.get(localProjectId);if(!id){id=random();creations.set(localProjectId,id)}creation=id;track('creation_start')}catch{}
}
export function initAnalytics(){
 if(!import.meta.env.PROD||initialized||navigator.doNotTrack==='1')return;
 try{visitor=read('pocket-pin:anonymous-visitor')||random();write('pocket-pin:anonymous-visitor',visitor);session=random();lastActivity=Date.now();try{const saved=JSON.parse(sessionStorage.getItem('pocket-pin:analytics-session')||'null');if(saved&&lastActivity-saved.at<30*60000&&/^[a-zA-Z0-9_-]{8,80}$/.test(saved.id))session=saved.id}catch{};const query=new URLSearchParams(location.search);attribution={source:(query.get('utm_source')||'').slice(0,100),medium:(query.get('utm_medium')||'').slice(0,100),campaign:(query.get('utm_campaign')||'').slice(0,100)};initialized=true;track('visit');document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});window.addEventListener('pagehide',flush)}catch{}
}
