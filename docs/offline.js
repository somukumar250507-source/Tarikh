// Share the registration promise with the Settings update panel.
window.tarikhWorkerRegistration=(async()=>{
 if(!('serviceWorker' in navigator))throw Error('Service workers are unavailable.');
 return navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
})();
(async()=>{try{
 await window.tarikhWorkerRegistration;
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',check);};
  const check=()=>{if(navigator.serviceWorker.controller){cleanup();resolve();}};
  const timer=setTimeout(()=>{cleanup();reject(Error('Offline cache is not ready.'));},60000);
  navigator.serviceWorker.addEventListener('controllerchange',check);check();
 });
 try{await navigator.storage?.persist?.();}catch(e){console.warn('Persistent storage request unavailable:',e.message);}
}catch(e){console.error(e);alert('Offline installation not confirmed: '+e.message+' Stay online and reopen the same Tarikh icon.');}})();
