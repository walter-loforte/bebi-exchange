(()=>{
  const el=id=>document.getElementById(id);let photo=null,controller=null,generation=0;
  const endpoint=window.PRODUCT_API_URL;
  function resetLinks(){el('product-links').hidden=true;}
  function cancel(){generation++;controller?.abort();controller=null;el('identify-product').disabled=!photo||!endpoint;el('product-cancel').hidden=true;}
  el('product-camera-button').onclick=()=>el('product-camera').click();
  el('product-gallery-button').onclick=()=>el('product-gallery').click();
  async function load(file){
    cancel();photo=null;el('identify-product').disabled=true;el('product-preview').hidden=true;el('product-preview').removeAttribute('src');resetLinks();el('product-query').value='';el('product-hint').textContent='';
    if(!file)return;
    const id=generation;let url;
    try{
      if(file.size>20*1024*1024)throw Error('Elegí una foto de menos de 20 MB.');
      url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();if(id!==generation)return;
      const scale=Math.min(1,1280/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',.85);photo=data.split(',')[1];el('product-preview').src=data;el('product-preview').hidden=false;el('identify-product').disabled=!endpoint;
      el('product-status').textContent=endpoint?'Foto lista. Tocá Identificar producto para enviarla a la IA.':'Foto lista. La identificación por IA todavía no está activada. Podés escribir el producto y buscarlo.';
    }catch{el('product-status').textContent='No pudimos abrir la foto. Usá JPG, PNG o una imagen de menos de 20 MB.';}finally{if(url)URL.revokeObjectURL(url);}
  }
  for(const name of ['product-camera','product-gallery'])el(name).onchange=e=>{const file=e.target.files[0];e.target.value='';load(file);};
  el('product-cancel').onclick=()=>{cancel();el('product-status').textContent='Identificación cancelada.';};
  el('identify-product').onclick=async()=>{
    if(!photo||!endpoint)return;cancel();const id=generation;controller=new AbortController();const activeController=controller,signal=activeController.signal;const timer=setTimeout(()=>activeController.abort(),45000);
    el('identify-product').disabled=true;el('product-cancel').hidden=false;resetLinks();el('product-query').value='';el('product-status').textContent='Identificando el producto…';
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:photo}),signal});
      const data=await response.json();if(id!==generation)return;if(!response.ok)throw Error(data.error||'No pudimos identificar el producto. Intentá más tarde.');
      if(typeof data.query!=='string'||!data.query.trim())throw Error('No pudimos reconocer el producto. Probá otra foto de la etiqueta o escribí el modelo.');
      el('product-query').value=data.query.slice(0,180);el('product-hint').textContent=typeof data.note==='string'?data.note:'';
      el('product-status').textContent='Revisá la marca y el modelo antes de buscar. La identificación puede ser aproximada.';el('product-query').focus();
    }catch(error){if(id===generation)el('product-status').textContent=error.name==='AbortError'?'La consulta tardó demasiado. Intentá otra vez.':error.message;}
    finally{clearTimeout(timer);if(id===generation){controller=null;el('identify-product').disabled=!photo||!endpoint;el('product-cancel').hidden=true;}}
  };
  el('product-query').oninput=resetLinks;
  el('product-form').onsubmit=event=>{
    event.preventDefault();try{const urls=ProductSearch.links(el('product-query').value);el('product-amazon').href=urls.amazon;el('product-mercado').href=urls.mercado;el('product-links').hidden=false;el('product-status').textContent='Búsquedas listas. Compará el modelo, la variante y el precio en cada plataforma.';}catch(error){el('product-status').textContent=error.message;resetLinks();}
  };
  if(!endpoint)el('product-status').textContent='Identificación por IA pendiente de activación. Ya podés buscar escribiendo el producto.';
})();
