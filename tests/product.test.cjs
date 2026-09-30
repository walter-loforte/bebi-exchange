const {test}=require('node:test'),assert=require('node:assert/strict');
require('../product-search.js');
test('búsquedas preservan marca y modelo, codifican texto y apuntan a mercados correctos',()=>{
  const links=ProductSearch.links(' Sony WH-1000XM5 & case ');
  const amazon=new URL(links.amazon);assert.equal(amazon.hostname,'www.amazon.com');assert.equal(amazon.searchParams.get('k'),'Sony WH-1000XM5 & case');assert.equal(new URL(links.mercado).hostname,'listado.mercadolibre.com.ar');assert.ok(links.mercado.includes('%26'));
  assert.throws(()=>ProductSearch.links('  '));assert.throws(()=>ProductSearch.links('x'.repeat(181)));
});
test('backend valida origen, método, imagen, cuota y respuesta de IA sin exponer secretos',async()=>{
  const worker=(await import('../backend/worker.mjs')).default;
  const env={ALLOWED_ORIGIN:'https://walter-loforte.github.io',GEMINI_API_KEY:'test-secret',PRODUCT_LIMITER:{limit:async()=>({success:true})}};
  const req=(body,origin=env.ALLOWED_ORIGIN)=>new Request('https://example.test',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await worker.fetch(req({},'https://other.test'),env)).status,403);
  assert.equal((await worker.fetch(req({image:'not image'}),env)).status,400);
  assert.equal((await worker.fetch(req({}),{...env,PRODUCT_LIMITER:{limit:async()=>({success:false})}})).status,429);
  const original=global.fetch;
  try{
    global.fetch=async(url,options)=>{assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));assert.equal(options.headers['x-goog-api-key'],'test-secret');return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({query:'Sony WH-1000XM5',note:'Confirmá la variante.'})}]}}]});};
    const response=await worker.fetch(req({image:'/9j/AA=='}),env);assert.equal(response.status,200);assert.deepEqual(await response.json(),{query:'Sony WH-1000XM5',note:'Confirmá la variante.'});assert.equal(response.headers.get('Cache-Control'),'no-store');
    global.fetch=async()=>new Response('private-provider-error',{status:429});assert.equal((await worker.fetch(req({image:'/9j/AA=='}),env)).status,429);
    global.fetch=async()=>Response.json({candidates:[]});assert.equal((await worker.fetch(req({image:'/9j/AA=='}),env)).status,502);
  }finally{global.fetch=original;}
});
