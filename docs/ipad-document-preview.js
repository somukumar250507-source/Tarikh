(() => {
 const seen = new WeakSet();
 function scan() {
   document.querySelectorAll('.ipad-image-viewer').forEach(host => {
     if(seen.has(host)) return; seen.add(host);
     host.querySelector('[data-image-fit]').onclick=()=>host.classList.remove('actual');
     host.querySelector('[data-image-full]').onclick=()=>host.classList.add('actual');
   });
   document.querySelectorAll('.ipad-word-preview').forEach(async host => {
     if(seen.has(host)) return; seen.add(host);
     const status=document.createElement('div'); status.className='word-status'; status.textContent='Loading Word document…'; host.append(status);
     try {
       if(!window.docx?.renderAsync) throw new Error('Word preview engine is unavailable');
       const url=new URL(host.dataset.wordUrl); if(url.protocol!=='blob:'||url.origin!==location.origin) throw new Error('Invalid local document URL');
       const r=await fetch(url); if(!r.ok) throw new Error('Stored document could not be read');
       const blob=await r.blob(); if(!host.isConnected) return;
       const content=document.createElement('div'); host.append(content);
       const shadow=content.attachShadow({mode:'open'});
       const styles=document.createElement('div'), body=document.createElement('div'); shadow.append(styles,body);
       await window.docx.renderAsync(blob,body,styles,{className:'tarikh-word',inWrapper:true,breakPages:true,ignoreLastRenderedPageBreak:false,renderAltChunks:false,useBase64URL:true});
       shadow.addEventListener('click',e=>{if(e.composedPath().some(n=>n instanceof HTMLAnchorElement))e.preventDefault();});
       status.remove();
     } catch(e) {status.textContent='Word preview unavailable: '+e.message+'. Use Open externally to view the original.';}
   });
 }
 new MutationObserver(scan).observe(document.body,{childList:true,subtree:true}); scan();
})();
