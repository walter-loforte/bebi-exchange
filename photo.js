(() => {
  'use strict';
  const el = id => document.getElementById(id);
  let generation = 0, worker = null, previewURL = null, libraryPromise = null;
  const buttons = [el('take-photo'), el('choose-photo')];
  function busy(value) { buttons.forEach(b => b.disabled = value); el('scan-cancel').hidden = !value; el('scan-progress').hidden = !value; el('photo-panel').setAttribute('aria-busy', String(value)); }
  function releasePhoto() { if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null; el('photo-preview').removeAttribute('src'); el('photo-preview').hidden = true; }
  function terminate() { const old = worker; worker = null; if (old) old.terminate().catch(() => {}); }
  function cancel() { generation++; terminate(); busy(false); el('photo-review').hidden = true; releasePhoto(); el('scan-status').textContent = 'Lectura cancelada. Podés elegir otra foto.'; }
  function library() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
      const timer = setTimeout(() => { script.remove(); libraryPromise = null; reject(Error('No pudimos cargar el lector. Revisá tu conexión e intentá de nuevo.')); },20000);
      script.onload = () => { clearTimeout(timer); resolve(window.Tesseract); };
      script.onerror = () => { clearTimeout(timer); script.remove(); libraryPromise = null; reject(Error('No pudimos cargar el lector. Revisá tu conexión e intentá de nuevo.')); };
      document.head.append(script);
    });
    return libraryPromise;
  }
  async function imageCanvas(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      const scale = Math.min(1, 2200 / Math.max(image.naturalWidth,image.naturalHeight));
      if (!image.naturalWidth) throw Error('Imagen vacía');
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas;
    } catch { throw Error('No pudimos abrir esa imagen. Probá con una foto JPG o PNG.'); }
    finally { URL.revokeObjectURL(url); }
  }
  function setCandidate(candidate) {
    el('photo-amount').value = candidate ? candidate.amount.toFixed(2).replace('.',',') : '';
    el('photo-currency').value = candidate?.currency || '';
    el('currency-hint').textContent = candidate?.unsupported ? 'El texto indica otra moneda o monedas en conflicto. Confirmá que el precio corresponda a CLP, ARS o USD.' : candidate?.currency ? `Moneda identificada en el texto: ${candidate.currency}. Revisá que coincida con la foto.` : 'No se pudo identificar la moneda. El símbolo $ por sí solo es ambiguo; elegí CLP, ARS o USD.';
    el('photo-error').hidden = true;
  }
  function review(text,confidence) {
    const candidates = window.PriceReader.extract(text);
    const select = el('photo-candidates'); select.replaceChildren();
    candidates.forEach((c,i) => { const option = document.createElement('option'); option.value = i; option.textContent = `${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(c.amount)} ${c.currency || '· confirmar moneda'} — ${c.line}`; select.append(option); });
    select.onchange = () => setCandidate(candidates[Number(select.value)]);
    el('candidate-field').hidden = candidates.length < 2;
    setCandidate(candidates[0]);
    el('ocr-text').textContent = text.trim() || 'No se reconoció texto.';
    el('scan-status').textContent = !candidates.length ? 'No encontramos un precio claro. Podés ingresarlo abajo o probar con una foto más cercana.' : confidence < 65 ? 'La lectura no es clara. Revisá el precio y la moneda antes de convertir.' : candidates.length > 1 ? 'Encontramos varios importes. Elegí el precio que querés convertir.' : 'Precio encontrado. Revisalo y convertí.';
    el('photo-review').hidden = false; el('photo-amount').focus({preventScroll:true});
  }
  async function scan(file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { el('scan-status').textContent = 'La imagen es demasiado grande. Usá una foto de menos de 20 MB.'; return; }
    if (file.type && !file.type.startsWith('image/')) { el('scan-status').textContent = 'Elegí un archivo de imagen.'; return; }
    const current = ++generation; terminate(); releasePhoto(); busy(true); el('photo-review').hidden = true;
    el('scan-progress').removeAttribute('value'); el('scan-status').textContent = 'Preparando la foto y el lector. La primera vez puede tardar unos segundos…';
    let timer;
    try {
      const operation = (async () => {
        const canvas = await imageCanvas(file);
        if (current !== generation) return;
        previewURL = URL.createObjectURL(file); el('photo-preview').src = previewURL; el('photo-preview').hidden = false;
        const Tesseract = await library();
        if (current !== generation) return;
        const instance = await Tesseract.createWorker('eng',1,{
          workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
          corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
          langPath:'https://tessdata.projectnaptha.com/4.0.0',
          logger(message) { if (current !== generation) return; if (message.status === 'recognizing text') { const percent = Math.round(message.progress * 100); el('scan-status').textContent = `Leyendo el precio… ${percent}%`; el('scan-progress').value = percent; } },
        });
        if (current !== generation) { await instance.terminate(); return; }
        worker = instance;
        await instance.setParameters({tessedit_pageseg_mode:Tesseract.PSM.SPARSE_TEXT});
        const {data} = await instance.recognize(canvas);
        if (current === generation) review(data.text,data.confidence);
      })();
      await Promise.race([operation,new Promise((_,reject) => { timer = setTimeout(() => reject(Error('La lectura tardó demasiado. Probá una foto más cercana, bien iluminada y con conexión.')),90000); })]);
    } catch(error) { if(current === generation) { el('scan-status').textContent = error.message || 'No pudimos leer la foto. Volvé a intentarlo.'; generation++; } }
    finally { clearTimeout(timer); if(current === generation || current + 1 === generation) { terminate(); busy(false); } }
  }
  el('take-photo').onclick = () => el('camera-file').click(); el('choose-photo').onclick = () => el('gallery-file').click();
  for (const id of ['camera-file','gallery-file']) el(id).onchange = e => { const file=e.target.files[0]; e.target.value=''; scan(file); };
  el('scan-cancel').onclick = cancel;
  el('photo-dismiss').onclick = () => { cancel(); el('scan-status').textContent='Acercá la cámara al precio e incluí el símbolo o nombre de la moneda.'; };
  el('photo-review').onsubmit = event => {
    event.preventDefault(); const value=window.PriceReader.number(el('photo-amount').value), code=el('photo-currency').value;
    if(value===null || !['CLP','ARS','USD'].includes(code)){el('photo-error').textContent='Revisá el monto y seleccioná una moneda.';el('photo-error').hidden=false;return;}
    document.getElementById('amount').value=value.toFixed(2).replace('.',',');
    const radio=document.querySelector(`[name=currency][value=${code}]`); radio.checked=true; radio.dispatchEvent(new Event('change',{bubbles:true}));
    el('photo-review').hidden=true; releasePhoto(); el('scan-status').textContent='Precio aplicado al conversor. Podés tomar otra foto.';
    document.getElementById('amount').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
  };
})();
