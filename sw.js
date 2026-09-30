const VERSION='20260930-4';
const CACHE='cambio-shell-'+VERSION;
const FILES=['./','./index.html','./style.css','./app.js','./updates.js','./price-reader.js','./photo.js','./amount-reader.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
  await Promise.all((await caches.keys()).filter(key=>key.startsWith('cambio-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
  for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'APP_UPDATED',version:VERSION});
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(url.pathname===new URL('version.json',scope).pathname){event.respondWith(fetch(event.request,{cache:'no-store'}));return;}
  const known=FILES.some(path=>new URL(path,scope).pathname===url.pathname);
  if(!known)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok){const key=new URL(url);key.search='';await cache.put(key.href,response.clone());return response;}
      return (await cache.match(url.href,{ignoreSearch:true}))||response;
    }catch{
      return (await cache.match(url.href,{ignoreSearch:true}))||(event.request.mode==='navigate'?await cache.match(new URL('./index.html',scope).href):null)||Response.error();
    }
  })());
});
