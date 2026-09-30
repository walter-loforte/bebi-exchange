const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function worker(fetch){
  const events={},store=new Map(),scope='https://example.com/bebi-exchange/';
  const cache={addAll:async requests=>{assert(requests.every(r=>r.cache==='reload'));},put:async(key,value)=>store.set(key,value),match:async(key,options)=>store.get(options?.ignoreSearch?String(key).split('?')[0]:String(key))};
  const context={URL,Request,Response,fetch,caches:{open:async()=>cache},self:{registration:{scope},addEventListener:(name,handler)=>events[name]=handler,skipWaiting:async()=>{}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../sw.js'),'utf8'),context);
  return {events,store,scope,request:async path=>{let pending;events.fetch({request:new Request(scope+path),respondWith:value=>pending=value});return pending;}};
}
test('instala archivos sin reutilizar la caché HTTP',async()=>{const w=worker();let pending;w.events.install({waitUntil:value=>pending=value});await pending;});
test('consulta los archivos en red sin caché y mantiene copia offline',async()=>{const w=worker(async(req,options)=>{assert.equal(options.cache,'no-store');return new Response('nuevo');});assert.equal(await(await w.request('app.js?v=3')).text(),'nuevo');assert(w.store.has(w.scope+'app.js'));});
test('recupera archivos offline aunque el HTML use una versión en la URL',async()=>{const w=worker(async()=>{throw Error('offline');});w.store.set(w.scope+'app.js',new Response('offline'));assert.equal(await(await w.request('app.js?v=3')).text(),'offline');});
test('una consulta de versión offline falla en lugar de devolver un dato viejo',async()=>{const w=worker(async()=>{throw Error('offline');});w.store.set(w.scope+'version.json',new Response('{}'));await assert.rejects(w.request('version.json?t=1'),/offline/);});
