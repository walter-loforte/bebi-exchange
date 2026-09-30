(() => {
  const el=id=>document.getElementById(id),dialog=el('scanner'),stage=el('crop-stage'),image=el('crop-image'),rect=el('crop-box');
  let box={x:.15,y:.4,w:.7,h:.2},drag=null,url=null,scanCurrency='CLP',worker=null,job=0,libraryPromise=null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function currency(){return document.querySelector('[name=currency]:checked').value;}
  function syncCurrency(){el('scan-currency').textContent=currency();el('take-photo').textContent='Escanear precio en '+currency();}
  document.querySelectorAll('[name=currency]').forEach(input=>input.addEventListener('change',syncCurrency));syncCurrency();
  function draw(){rect.style.left=box.x*100+'%';rect.style.top=box.y*100+'%';rect.style.width=box.w*100+'%';rect.style.height=box.h*100+'%';}
  function busy(value){el('read-amount').disabled=value;el('crop-reset').disabled=value;stage.classList.toggle('reading',value);el('scan-progress').hidden=!value;el('scan-cancel').hidden=!value;}
  function terminate(){const old=worker;worker=null;if(old)old.terminate().catch(()=>{});}
  function cancel(){job++;terminate();busy(false);el('scanner-status').textContent='Lectura cancelada. Ajustá el recuadro e intentá otra vez.';}
  function close(){cancel();dialog.close();if(url)URL.revokeObjectURL(url);url=null;image.removeAttribute('src');}
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});el('scanner-close').onclick=close;el('scan-cancel').onclick=cancel;
  function point(event){const bounds=stage.getBoundingClientRect();return {x:clamp((event.clientX-bounds.left)/bounds.width,0,1),y:clamp((event.clientY-bounds.top)/bounds.height,0,1)};}
  stage.onpointerdown=event=>{
    if(el('read-amount').disabled)return;event.preventDefault();const p=point(event);const handle=event.target.dataset.corner;
    drag={p,box:{...box},mode:handle||(event.target===rect?'move':'draw')};stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove=event=>{
    if(!drag)return;const p=point(event),start=drag.box,dx=p.x-drag.p.x,dy=p.y-drag.p.y;
    if(drag.mode==='move'){box={...start,x:clamp(start.x+dx,0,1-start.w),y:clamp(start.y+dy,0,1-start.h)};}
    else{let x1,x2,y1,y2;if(drag.mode==='draw'){x1=drag.p.x;y1=drag.p.y;x2=p.x;y2=p.y;}else{x1=drag.mode.includes('w')?p.x:start.x;x2=drag.mode.includes('e')?p.x:start.x+start.w;y1=drag.mode.includes('n')?p.y:start.y;y2=drag.mode.includes('s')?p.y:start.y+start.h;}box={x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};}
    draw();
  };
  stage.onpointerup=()=>{drag=null;if(box.w<.03||box.h<.02){box={x:.15,y:.4,w:.7,h:.2};draw();}el('photo-review').hidden=true;};stage.onpointercancel=()=>{drag=null;};
  rect.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||el('read-amount').disabled)return;event.preventDefault();const step=event.shiftKey?.005:.02,corner=event.target.dataset.corner,dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;if(!corner){box.x=clamp(box.x+dx,0,1-box.w);box.y=clamp(box.y+dy,0,1-box.h);}else{if(corner.includes('e'))box.w=clamp(box.w+dx,.03,1-box.x);if(corner.includes('s'))box.h=clamp(box.h+dy,.02,1-box.y);if(corner.includes('w')){const x=clamp(box.x+dx,0,box.x+box.w-.03);box.w+=box.x-x;box.x=x;}if(corner.includes('n')){const y=clamp(box.y+dy,0,box.y+box.h-.02);box.h+=box.y-y;box.y=y;}}draw();el('photo-review').hidden=true;};
  el('crop-reset').onclick=()=>{box={x:.15,y:.4,w:.7,h:.2};draw();el('photo-review').hidden=true;};
  async function open(file){
    if(!file)return;const status=el('scan-status');
    if(file.size>20*1024*1024){status.textContent='Usá una imagen de menos de 20 MB.';return;}
    if(file.type&&!file.type.startsWith('image/')){status.textContent='Elegí una imagen JPG o PNG.';return;}
    job++;terminate();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);image.src=url;
    try{await image.decode();}catch{status.textContent='No pudimos abrir la imagen. Probá con JPG o PNG.';URL.revokeObjectURL(url);url=null;return;}
    scanCurrency=currency();el('scanner-currency').textContent=scanCurrency;el('review-currency').textContent=scanCurrency;
    stage.style.width=`min(100%, ${Math.min(520,420*image.naturalWidth/image.naturalHeight)}px)`;
    box={x:.15,y:.4,w:.7,h:.2};draw();busy(false);el('photo-review').hidden=true;el('scanner-status').textContent='Marcá únicamente los dígitos del precio actual. Dejá afuera el símbolo $, el precio anterior y las palabras.';
    dialog.showModal();
  }
  el('take-photo').onclick=()=>el('camera-file').click();el('choose-photo').onclick=()=>el('gallery-file').click();
  for(const id of ['camera-file','gallery-file'])el(id).onchange=event=>{const file=event.target.files[0];event.target.value='';open(file);};
  function library(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';const timer=setTimeout(()=>{script.remove();libraryPromise=null;reject(Error('No pudimos cargar el lector. Revisá tu conexión.'));},20000);script.onload=()=>{clearTimeout(timer);resolve(window.Tesseract);};script.onerror=()=>{clearTimeout(timer);script.remove();libraryPromise=null;reject(Error('No pudimos cargar el lector. Revisá tu conexión.'));};document.head.append(script);});return libraryPromise;
  }
  function review(readings,prepared){
    const candidates=AmountReader.rank(readings);el('photo-amount').value=candidates[0]?candidates[0].amount.toFixed(2).replace('.',','):'';
    const select=el('photo-candidates');select.replaceChildren();for(const [i,c]of candidates.entries()){const option=document.createElement('option');option.value=i;option.textContent=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(c.amount)+' '+scanCurrency;select.append(option);}
    select.onchange=()=>{el('photo-amount').value=candidates[Number(select.value)].amount.toFixed(2).replace('.',',');};el('candidate-field').hidden=candidates.length<2;
    const agrees=candidates[0]?.votes>=2,clear=agrees&&candidates.length===1&&candidates[0].confidence>=65;
    el('scanner-status').textContent=!candidates.length?'No pudimos leer un monto. Ajustá el recuadro o escribilo abajo.':clear?'Monto leído. Comparalo con el recorte antes de convertir.':'Las lecturas no son concluyentes. Revisá el monto o ajustá el recuadro.';
    el('crop-preview').src=prepared.gray.toDataURL('image/png');el('photo-error').hidden=true;el('photo-review').hidden=false;
    el('photo-review').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  el('read-amount').onclick=async()=>{
    const current=++job;busy(true);el('photo-review').hidden=true;el('scan-progress').removeAttribute('value');el('scanner-status').textContent='Preparando el recorte…';let timer;
    try{
      let prepared=AmountReader.prepare(image,box);
      const operation=(async()=>{
        const T=await library();if(current!==job)return;
        const instance=await T.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0'});
        if(current!==job){await instance.terminate();return;}worker=instance;
        el('scanner-status').textContent='Separando el monto de letras y signos...';
        await instance.setParameters({tessedit_char_whitelist:'',tessedit_pageseg_mode:'7'});
        const detection=await instance.recognize(prepared.gray,{},{blocks:true});
        if(current!==job)return;
        prepared=AmountReader.isolate(prepared,detection.data);
        const readings=[];
        for(const [i,pass]of [[prepared.gray,'7'],[prepared.gray,'13'],[prepared.binary,'13']].entries()){
          if(current!==job)return;el('scanner-status').textContent=`Leyendo solo el monto… ${i+1}/3`;el('scan-progress').value=i*33;
          await instance.setParameters({tessedit_char_whitelist:'0123456789.,',tessedit_pageseg_mode:pass[1]});
          const {data}=await instance.recognize(pass[0]);readings.push({text:data.text,confidence:data.confidence});
        }
        if(current===job)review(readings,prepared);
      })();
      await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('La lectura tardó demasiado. Probá un recorte más pequeño y revisá tu conexión.')),90000);})]);
    }catch(error){if(current===job){el('scanner-status').textContent=error.message;job++;}}
    finally{clearTimeout(timer);if(current===job||current+1===job){terminate();busy(false);}}
  };
  el('photo-review').onsubmit=event=>{event.preventDefault();const value=PriceReader.number(el('photo-amount').value);if(value===null){el('photo-error').textContent='Ingresá un monto válido.';el('photo-error').hidden=false;return;}el('amount').value=value.toFixed(2).replace('.',',');const radio=document.querySelector(`[name=currency][value=${scanCurrency}]`);radio.checked=true;radio.dispatchEvent(new Event('change'));close();el('scan-status').textContent='Precio aplicado. Podés escanear otro.';el('amount').scrollIntoView({block:'center',behavior:'smooth'});};
})();
