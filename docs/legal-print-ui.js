'use strict';
(() => {
  const fields=['background','dates','hearings','notes','tasks','documents'];
  const labels={background:'Case background',dates:'List of dates and events',hearings:'Hearing chronology and recorded proceedings',notes:'Notes and observations',tasks:'Tasks and follow-up actions',documents:'Document index (names only)'};
  let currentDialog=null;
  function openDialog(id,trigger){
    if(currentDialog)return;
    const dialog=document.createElement('div');dialog.className='tarikh-print-overlay';
    dialog.innerHTML=`<section class="tarikh-print-dialog" role="dialog" aria-modal="true" aria-labelledby="tarikh-print-title">
      <div class="tarikh-print-head"><div><h2 id="tarikh-print-title">Print Case Dossier</h2><p>Bombay High Court-style internal chamber record · A4 · Times New Roman 14 pt</p></div><button type="button" class="btn" data-close aria-label="Close">✕</button></div>
      <p class="tarikh-print-explain">The cause title and record particulars are always included. Choose additional sections for the PDF.</p>
      <div class="tarikh-print-options">${fields.map(f=>`<label class="tarikh-print-option"><input type="checkbox" data-print-include="${f}" checked><span>${labels[f]}</span></label>`).join('')}</div>
      <p class="tarikh-print-info">A4 · 5 cm inner / 3 cm outer mirrored binding margins · 1.5 inch top and bottom · numbered pages. This is an internal chamber record, not a certified court document.</p>
      <div class="tarikh-print-actions"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn pri" data-prepare>Preview PDF</button></div>
      <p class="tarikh-print-status" data-status role="status"></p>
      <div data-output hidden><div class="tarikh-dossier-nav"><button class="btn" data-prev aria-label="Previous page">←</button><span data-page></span><button class="btn" data-next aria-label="Next page">→</button></div><div class="tarikh-dossier-preview" data-preview></div><div class="tarikh-print-actions"><button class="btn" data-download>Save PDF</button><button class="btn pri" data-share>Share / Print PDF</button></div><p class="tarikh-print-info">Use Print or Save to Files in the iPad share sheet. The PDF is not password-protected.</p></div>
    </section>`;
    document.body.appendChild(dialog);currentDialog=dialog;
    const q=s=>dialog.querySelector(s),status=q('[data-status]'),output=q('[data-output]'),preview=q('[data-preview]');let busy=false,result=null,idx=0,renderSeq=0,pdfDoc=null;
    function cleanup(){renderSeq++;if(pdfDoc){pdfDoc.destroy().catch(()=>{});pdfDoc=null;}preview.replaceChildren();output.hidden=true;result=null;}
    function close(){if(busy)return;cleanup();dialog.remove();currentDialog=null;document.removeEventListener('keydown',key);trigger?.focus();}
    function key(e){if(e.key==='Escape')close();}
    document.addEventListener('keydown',key);dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);dialog.onclick=e=>{if(e.target===dialog)close();};
    function showPage(){if(!result)return;const generation=++renderSeq;const canvas=window.tarikhDossier.drawPage(result.pages[idx],1.4);canvas.setAttribute('aria-label','Dossier page '+(idx+1));preview.replaceChildren(canvas);q('[data-page]').textContent=`Page ${idx+1} of ${result.pages.length}`;q('[data-prev]').disabled=idx===0;q('[data-next]').disabled=idx===result.pages.length-1;
      if(pdfDoc) (async()=>{try{const page=await pdfDoc.getPage(idx+1);if(generation!==renderSeq)return;const vp=page.getViewport({scale:1.4}),actual=document.createElement('canvas');actual.width=Math.ceil(vp.width);actual.height=Math.ceil(vp.height);await page.render({canvasContext:actual.getContext('2d'),viewport:vp}).promise;if(generation===renderSeq){actual.setAttribute('aria-label',canvas.getAttribute('aria-label'));preview.replaceChildren(actual);}}catch(e){/* Layout preview is retained if the PDF renderer is unavailable. */}})();
    }
    q('[data-prev]').onclick=()=>{if(idx>0){idx--;showPage();}};q('[data-next]').onclick=()=>{if(result&&idx+1<result.pages.length){idx++;showPage();}};
    dialog.querySelectorAll('[data-print-include]').forEach(x=>x.onchange=()=>{cleanup();status.textContent='Section selection changed. Prepare a new preview.';});
    q('[data-prepare]').onclick=async()=>{if(busy)return;cleanup();busy=true;dialog.querySelectorAll('button,input').forEach(b=>b.disabled=true);status.textContent='Preparing dossier…';try{
      const request={caseId:Number(id),include:Object.fromEntries([...dialog.querySelectorAll('[data-print-include]')].map(ch=>[ch.dataset.printInclude,ch.checked]))};
      result=await window.tarikhDossier.prepare(request);idx=0;output.hidden=false;status.textContent=`${result.pages.length} page(s) prepared.`+(result.raster?` ${result.raster} page(s) rendered as images to preserve non-Latin characters.`:'');
      // The existing bundled PDF.js engine renders the actual generated PDF when available.
      showPage();const prepared=result;
      try{const lib=await import('./vendor/pdfjs/pdf.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',document.baseURI).href;const doc=await lib.getDocument({data:prepared.raw.slice(),isEvalSupported:false,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',document.baseURI).href,cMapUrl:new URL('./vendor/pdfjs/cmaps/',document.baseURI).href,cMapPacked:true}).promise;if(result!==prepared){await doc.destroy();}else{pdfDoc=doc;showPage();}}catch(e){status.textContent+=' Layout preview shown; PDF viewer unavailable.';}
    }catch(e){cleanup();status.textContent='Unable to prepare: '+e.message;}finally{busy=false;dialog.querySelectorAll('button,input').forEach(b=>b.disabled=false);if(result){q('[data-prev]').disabled=idx===0;q('[data-next]').disabled=idx===result.pages.length-1;}}};
    function download(){if(!result)return;const u=URL.createObjectURL(result.file),a=document.createElement('a');a.href=u;a.download=result.file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);status.textContent='PDF download requested. Check Files.';}
    q('[data-download]').onclick=()=>{if(!result)return;if(navigator.canShare?.({files:[result.file]})){navigator.share({files:[result.file],title:result.file.name}).catch(e=>{if(e.name!=='AbortError')status.textContent='Unable to share: '+e.message;});}else download();};
    q('[data-share]').onclick=()=>{if(!result)return;if(navigator.canShare?.({files:[result.file]})){navigator.share({files:[result.file],title:result.file.name}).catch(e=>{if(e.name!=='AbortError')status.textContent='Unable to share: '+e.message;});}else{download();status.textContent='Open the saved PDF in Files to print.';}};
    q('[data-close]').focus();
  }
  function installButtons(){document.querySelectorAll('#view [data-a="editcase"][data-i]').forEach(edit=>{const parent=edit.parentElement;if(!parent||parent.querySelector('[data-tarikh-print-case]'))return;const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Print / Export';b.dataset.tarikhPrintCase=edit.dataset.i;parent.insertBefore(b,edit);});}
  document.addEventListener('click',event=>{const el=event.target instanceof Element?event.target.closest('[data-tarikh-print-case]'):null;if(!el)return;event.preventDefault();openDialog(el.dataset.tarikhPrintCase,el);});
  function start(){const root=document.getElementById('view');if(!root)return;new MutationObserver(installButtons).observe(root,{childList:true,subtree:true});installButtons();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
