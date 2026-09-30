(() => {
  const VERSION='20260930-4', button=document.getElementById('update-app'),status=document.getElementById('app-update-status');
  let registration=null,checking=false,lastCheck=0;
  function available(){status.textContent='Hay una nueva versión disponible.';button.textContent='Actualizar app';button.dataset.available='true';}
  async function check(manual=false){
    if(checking)return;
    checking=true;lastCheck=Date.now();if(manual){button.disabled=true;status.textContent='Buscando actualizaciones…';}
    try{
      if(registration)await registration.update();
      const response=await fetch('./version.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Sin conexión');
      const latest=await response.json();if(typeof latest.version!=='string')throw Error('Versión inválida');
      if(latest.version!==VERSION)available();else if(manual)status.textContent='La app está actualizada.';
    }catch{if(manual)status.textContent='No pudimos buscar actualizaciones. Revisá tu conexión.';}
    finally{checking=false;button.disabled=false;}
  }
  button.onclick=()=>{
    if(button.dataset.available==='true'){
      try{sessionStorage.setItem('bebi-update-input',JSON.stringify({amount:document.getElementById('amount').value,currency:document.querySelector('[name=currency]:checked').value}));}catch{}
      const next=new URL(location.href);next.searchParams.set('v',Date.now());location.replace(next.href);
    }else check(true);
  };
  try{const saved=JSON.parse(sessionStorage.getItem('bebi-update-input'));sessionStorage.removeItem('bebi-update-input');if(saved&&['CLP','ARS','USD'].includes(saved.currency)&&typeof saved.amount==='string'){document.getElementById('amount').value=saved.amount;const radio=document.querySelector(`[name=currency][value=${saved.currency}]`);radio.checked=true;radio.dispatchEvent(new Event('change'));}}catch{}
  if('serviceWorker'in navigator){
    navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='APP_UPDATED'&&event.data.version!==VERSION)available();});
    navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(value=>{registration=value;check();}).catch(()=>check());
  }else check();
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastCheck>30000)check();});
  window.addEventListener('online',()=>check());
})();
