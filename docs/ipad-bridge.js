/* Local workspace storage: transactional IndexedDB. Workspace data is not application-encrypted. */
(() => {
'use strict';
const key='tarikh-ipad-ui-preview-v1';
const fresh=()=>({seq:0,workspaces:[],settings:{},data:{}});
const dbReady=new Promise((resolve,reject)=>{const r=indexedDB.open('tarikh-ipad-backend',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('files');};r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);});
const legacy=()=>JSON.parse(localStorage.getItem(key)||'null')||fresh();
const urls=new Map();
window.tarikhReleaseDocumentURL=(id,url)=>{id=Number(id);if(urls.get(id)===url&&url){URL.revokeObjectURL(url);urls.delete(id);}};
const extensions=new Set('pdf doc docx odt rtf txt csv xls xlsx ppt pptx png jpg jpeg gif webp bmp tif tiff'.split(' '));
const mime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',pdf:'application/pdf',txt:'text/plain',csv:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp'};
function pick(){return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.multiple=true;input.accept=[...extensions].map(x=>'.'+x).join(',');input.style.display='none';document.body.append(input);const finish=files=>{input.remove();resolve(files);};input.addEventListener('change',()=>finish([...input.files]),{once:true});input.addEventListener('cancel',()=>finish([]),{once:true});input.click();});}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}

function calendarParseDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const make = (day, month, year) => {
    day = Number(day);
    month = Number(month);
    year = Number(year);

    if (year < 1000 || year > 9999) return '';

    const d = new Date(Date.UTC(year, month - 1, day));

    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) return '';

    return [
      String(year).padStart(4, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0')
    ].join('-');
  };

  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return make(m[3], m[2], m[1]);

  m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return make(m[1], m[2], m[3]);

  // Excel date serial numbers.
  if (/^\d{5}$/.test(raw)) {
    const serial = Number(raw);
    if (serial >= 30000 && serial <= 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return make(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear());
    }
  }

  // Named dates such as "1 January 2027" or "1st January, 2027".
  const cleaned = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/,/g, ' ');

  const parsed = new Date(cleaned);

  if (!Number.isNaN(parsed.getTime())) {
    return make(
      parsed.getDate(),
      parsed.getMonth() + 1,
      parsed.getFullYear()
    );
  }

  return '';
}

function calendarParseCsv(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || '';

  const delimiters = [',', ';', '\t'];
  const delimiter = delimiters.sort((a, b) =>
    firstLine.split(b).length - firstLine.split(a).length
  )[0];

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && ch === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (!quoted && (ch === '\n' || ch === '\r')) {
      row.push(field.trim());

      if (row.some(Boolean)) rows.push(row);

      row = [];
      field = '';

      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += ch;
    }
  }

  if (quoted) throw Error("Unclosed quoted CSV field");
  if (field.length || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  return rows;
}

function calendarHolidayRows(text) {
  const rows = calendarParseCsv(
    String(text).replace(/^\uFEFF/, '')
  );

  if (!rows.length) {
    throw new Error('The selected CSV file is empty.');
  }

  const normalise = value =>
    String(value || '').toLowerCase().replace(/[^a-z]/g, '');

  const firstHeader = rows[0].map(normalise);
  const headerDateIndex = firstHeader.findIndex(
    value => value === 'date' || value.startsWith('date')
  );

  const hasHeader =
    headerDateIndex >= 0 &&
    !calendarParseDate(rows[0][headerDateIndex]);

  const headers = hasHeader ? firstHeader : [];
  const dateIndex = hasHeader
    ? headerDateIndex
    : -1;

  const nameIndex = hasHeader
    ? headers.findIndex(value =>
        /holiday|occasion|festival|observance|particular|description|title|name|event/.test(value)
      )
    : -1;

  const notesIndex = hasHeader
    ? headers.findIndex(value => /notes|remarks|remark/.test(value))
    : -1;

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const results = [];
  let skipped = 0;

  for (const cells of dataRows) {
    const actualDateIndex = hasHeader
      ? dateIndex
      : cells.findIndex(value => calendarParseDate(value));

    const date = actualDateIndex >= 0
      ? calendarParseDate(cells[actualDateIndex])
      : '';

    if (!date) {
      skipped++;
      continue;
    }

    let name = '';

    if (hasHeader && nameIndex >= 0) {
      name = cells[nameIndex] || '';
    } else {
      name = cells
        .filter((value, index) => {
          if (index === actualDateIndex) return false;

          if (hasHeader) {
            const header = headers[index] || '';
            if (/^(day|weekday|srno|serialno|sno|number)$/.test(header)) {
              return false;
            }
          }

          if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(value)) {
            return false;
          }

          return Boolean(value);
        })
        .join(' - ');
    }

    name = String(name).trim();

    if (!name) {
      skipped++;
      continue;
    }

    const notes = notesIndex >= 0 && notesIndex !== nameIndex
      ? String(cells[notesIndex] || '').trim()
      : '';

    results.push({ date, name, notes });
  }

  if (!results.length) {
    throw new Error(
      'No valid holiday rows were found. Use columns date, holiday and notes. ' +
      'Accepted dates include DD-MM-YYYY, DD/MM/YYYY and YYYY-MM-DD.'
    );
  }

  return { results, skipped };
}



const appearanceKeys=['background_light','background_dark','profile_picture'];
function checkAppearance(key){if(!appearanceKeys.includes(key))throw Error('Invalid appearance setting');}
function pickOne(accept){return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept=accept;input.style.display='none';document.body.append(input);const done=f=>{input.remove();resolve(f);};input.addEventListener('change',()=>done(input.files[0]||null),{once:true});input.addEventListener('cancel',()=>done(null),{once:true});input.click();});}
async function appearanceImage(file){const ext=file.name.split('.').pop().toLowerCase();const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};if(!types[ext]||file.size>25*1024*1024)throw Error('Choose a PNG, JPG, WEBP or GIF smaller than 25 MB.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error('Invalid image');}finally{URL.revokeObjectURL(url);}return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file.slice(0,file.size,types[ext]));});}
function actionPanel(title,build){const dialog=document.createElement('dialog');dialog.className='glass panel ipad-action-dialog';const heading=document.createElement('h3');heading.textContent=title;dialog.append(heading);const button=(label,action)=>{const b=document.createElement('button');b.className='btn';b.textContent=label;b.addEventListener('click',action);dialog.append(b);return b;};build(dialog,button);button('Close',()=>dialog.close());dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();}
function shareDocument(blob,record){const f=new File([blob],record.original_name,{type:blob.type||record.mime_type||'application/octet-stream'});actionPanel(record.original_name,(dialog,button)=>{button('Save / Download',()=>download(f,f.name));if(navigator.canShare?.({files:[f]}))button('Share / Open in another app',async()=>{try{await navigator.share({files:[f],title:f.name});}catch(e){if(e.name!=='AbortError')alert(e.message);}});});}
function normalizeMeetingLink(value){let text=String(value||'').trim();if(!text)throw Error('No online meeting link is saved.');if(/[\s\\]/.test(text))throw Error('Invalid meeting link.');if(text.startsWith('//'))text='https:'+text;else if(!/^https?:\/\//i.test(text)){if(/^[a-z][a-z0-9+.-]*:/i.test(text))throw Error('Only HTTP and HTTPS meeting links are supported.');text='https://'+text;}let u;try{u=new URL(text);}catch{throw Error('Invalid meeting link.');}if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)throw Error('Invalid meeting link.');return u.href;}
function meetingLink(url){actionPanel('Open meeting link',(dialog,button)=>{const a=document.createElement('a');a.className='btn pri';a.textContent='Open meeting';a.href=url;a.target='_blank';a.rel='noopener noreferrer';dialog.append(a);});}

const tables=['cases','events','hearings','tasks','notes','meetings','documents','holidays'];
const active=s=>s.workspaces.find(w=>w.active)||null;
const store=s=>{const w=active(s);if(!w)throw Error('Create or activate a workspace first.');return s.data[w.id];};
const rows=(s,t)=>active(s)?store(s)[t]:[];
const select=(a,f={})=>a.filter(r=>Object.entries(f||{}).every(([k,v])=>String(r[k])===String(v)));
const sort=(a,keys)=>a.slice().sort((x,y)=>{for(const k of keys){const c=String(x[k]??'').localeCompare(String(y[k]??''));if(c)return c;}return 0;});
const save=(s,a,r,defaults={})=>{if(r.id){const old=a.find(x=>x.id===Number(r.id));if(!old)throw Error('Record not found');Object.assign(old,r,{id:old.id});return old.id;}const id=++s.seq;a.push({...defaults,...r,id});return id;};
const remove=(a,id)=>{const i=a.findIndex(r=>r.id===Number(id));if(i>=0)a.splice(i,1);};
const orders={cases:['title'],events:['date'],hearings:['date','time'],tasks:['done','due'],meetings:['date','start_time','title']};
const defaults={cases:{status:'Pending'},tasks:{done:0,priority:'Normal'},events:{historical:0}};
const unsupported=()=>{throw Error('This operation is not available in Tarikh for iPad.');};
function invoke(s,ch,...a){
 const [x,y,z]=a;
 switch(ch){
 case 'ws:list':return s.workspaces.slice().sort((a,b)=>b.active-a.active);
 case 'ws:active':return active(s);
 case 'ws:save':{const id=save(s,s.workspaces,x,{active:0,type:'Legal Intern'});if(!s.data[id])s.data[id]=Object.fromEntries(tables.map(t=>[t,[]]));if(!active(s))s.workspaces.find(w=>w.id===id).active=1;return id;}
 case 'ws:activate':if(!s.workspaces.some(w=>w.id===Number(x)))throw Error('Workspace not found');s.workspaces.forEach(w=>w.active=Number(w.id===Number(x)));return true;
 case 'ws:delete-info':{const d=s.data[x];if(!d)throw Error('Workspace not found');return {...Object.fromEntries(tables.map(t=>[t,d[t].length])),backupCopies:0};}
 case 'ws:delete':{const w=s.workspaces.find(w=>w.id===Number(x));if(!w)throw Error('Workspace not found');remove(s.workspaces,x);delete s.data[x];if(!active(s)&&s.workspaces.length)s.workspaces[0].active=1;return {deletedName:w.name,active:active(s),cleanupPending:false};}
 case 'set:get':return s.settings[x]??'';
 case 'set:set':s.settings[x]=y;return true;
 case 'appearance:get':return Object.fromEntries(appearanceKeys.map(k=>[k,s.settings['appearance_'+k]||'']));
 case 'appearance:clear':checkAppearance(x);delete s.settings['appearance_'+x];return true;
 case 'appearance:store':checkAppearance(x);s.settings['appearance_'+x]=y;return y;
 case 'meetings:open-link':{const m=rows(s,'meetings').find(r=>r.id===Number(x));if(!m?.meeting_link)throw Error('No online meeting link is saved.');return normalizeMeetingLink(m.meeting_link);}
 case 'calendar:holidays:apply':{if(active(s)?.id!==z||z==null)throw Error('Workspace changed; retry import');const d=store(s).holidays;for(const r of x.results){const i=d.findIndex(h=>h.date===r.date);const item={...r,source:y};if(i<0)d.push(item);else d[i]=item;}return {cancelled:false,imported:x.results.length,skipped:x.skipped,filename:y,holidaysSynced:0,holidaysFailed:0,holidaysRemaining:0};}
 case 'glass:native:set':return true; // CSS effect only; no native window
 case 'list':if(!orders[x])throw Error('Invalid table');return sort(select(rows(s,x),y),orders[x]);
 case 'save':{if(!['cases','events','hearings','tasks'].includes(x))throw Error('Invalid table');const r={...y};for(const k of ['case_id','source_hearing_id','done','historical'])if(k in r)r[k]=r[k]===''||r[k]==null?null:Number(r[k]);if(x==='hearings'&&rows(s,x).some(h=>h.case_id===r.case_id&&h.date===r.date&&h.id!==Number(r.id)))throw Error('A record already exists for that date.');return save(s,store(s)[x],r,defaults[x]);}
 case 'del':{const d=store(s);if(!['cases','events','hearings','tasks'].includes(x))throw Error('Invalid table');if(x==='cases'){const ids=d.hearings.filter(h=>h.case_id===Number(y)).map(h=>h.id);for(const t of ['events','hearings','documents'])d[t]=d[t].filter(r=>r.case_id!==Number(y));for(const t of ['tasks','notes'])d[t].forEach(r=>{if(r.case_id===Number(y))r.case_id=null;if(ids.includes(r.hearing_id))r.hearing_id=null;if(ids.includes(r.source_hearing_id))r.source_hearing_id=null;});}if(x==='hearings'){d.tasks.forEach(r=>{if(r.source_hearing_id===Number(y))r.source_hearing_id=null;});d.notes.forEach(r=>{if(r.hearing_id===Number(y))r.hearing_id=null;});}remove(d[x],y);return true;}
 case 'notes:list':return rows(s,'notes').map(n=>{const c=rows(s,'cases').find(c=>c.id===Number(n.case_id));const h=rows(s,'hearings').find(h=>h.id===Number(n.hearing_id));return {...n,case_title:c?.title,case_number:c?.number,hearing_date:h?.date,hearing_purpose:h?.purpose};}).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
 case 'notes:save':{const now=new Date().toISOString();return save(s,store(s).notes,{...x,title:x.title||'Untitled note',updated_at:now},{created_at:now});}
 case 'notes:delete':remove(store(s).notes,x);return true;
 case 'meetings:list':return sort(select(rows(s,'meetings'),x),orders.meetings);
 case 'meetings:save':return save(s,store(s).meetings,x);
 case 'meetings:delete':remove(store(s).meetings,x);return true;
 case 'documents:list':{let d=rows(s,'documents');if(x?.case_id!=null)d=d.filter(r=>r.case_id===Number(x.case_id));else if(x?.reference)d=d.filter(r=>r.is_reference===1);else if(x?.unassigned)d=d.filter(r=>r.case_id==null&&!r.is_reference);return d.map(r=>({...r,case_title:rows(s,'cases').find(c=>c.id===r.case_id)?.title||r.case_title||'Unassigned case'})).sort((a,b)=>b.id-a.id);}
 case 'documents:delete':{if(!rows(s,'documents').some(r=>r.id===Number(x)))throw Error('Document not found');remove(store(s).documents,x);return true;}
 case 'next':{const h=rows(s,'hearings').find(r=>r.id===Number(x));if(!h)throw Error('Hearing not found');const [id,date,time,purpose]=a;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid date');const existing=rows(s,'hearings').find(r=>r.case_id===h.case_id&&r.date===date);let nextId;if(existing){if(time)existing.time=time;if(purpose)existing.purpose=purpose;nextId=existing.id;}else nextId=save(s,store(s).hearings,{case_id:h.case_id,date,time:time||null,purpose:purpose||null,court:h.court,bench:h.bench,room:h.room,advocate:h.advocate});const c=rows(s,'cases').find(r=>r.id===h.case_id);if(c)c.next_hearing=date;return nextId;}
 case 'task:from-hearing':{const h=rows(s,'hearings').find(r=>r.id===Number(x.hearingId));if(!h)throw Error('Hearing not found');const title=String(x.title||'').trim(),date=String(x.dueDate||''),time=String(x.dueTime||'17:00');if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||! /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid task title or due date/time');const old=rows(s,'tasks').find(r=>r.source_hearing_id===h.id);const id=save(s,store(s).tasks,{...(old?{id:old.id}:{}),title,due:date+'T'+time,priority:['Low','Normal','High'].includes(x.priority)?x.priority:'Normal',case_id:h.case_id,source_hearing_id:h.id,notified:0,notes:[`Created from hearing dated ${h.date}.`,h.court?'Court: '+h.court:'',h.purpose?'Purpose: '+h.purpose:'',h.action?'Further action: '+h.action:''].filter(Boolean).join('\n')},{done:0});return {id,created:!old};}
 case 'calendar:holidays:list':return sort(rows(s,'holidays'),['date']);
 case 'calendar:holiday:save':{const d=store(s).holidays;const i=d.findIndex(h=>h.date===x);const r={date:x,name:y||'Court Holiday',notes:z||'',source:'Manual'};if(i<0)d.push(r);else d[i]=r;return {...r,sync:{}};}
 case 'calendar:holiday:delete':{const d=store(s);d.holidays=d.holidays.filter(h=>h.date!==x);return true;}
 case 'apple:status':return {connected:false,email:'',calendars:[],selectedHref:'',selectedName:'',provider:'',encryptionAvailable:false};
 case 'calendar:sync-status':return {connected:false};
 default:return unsupported();
 }
}
function transact(db,ch,args,selected){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','files'],'readwrite'),state=tx.objectStore('state'),files=tx.objectStore('files');let result, failure;
 tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(failure||tx.error||Error('Storage transaction aborted'));tx.onerror=()=>{};
 const request=state.get('main');request.onsuccess=()=>{try{const s=request.result||legacy();const before=JSON.stringify(s);const oldIds=new Set(Object.values(s.data).flatMap(d=>d.documents.map(r=>r.id)));const [x]=args;
 if(ch==='documents:upload'){
   const w=active(s);if(!w||w.id!==selected.workspace)throw Error('Workspace changed; retry upload');const reference=x?.reference===true;const c=reference?null:rows(s,'cases').find(r=>r.id===Number(x?.caseId));if(!reference&&!c)throw Error('Select a valid case');
   result=[];for(const f of selected.files){const extension=f.name.split('.').pop().toLowerCase();if(!extensions.has(extension))throw Error('Unsupported file type: '+f.name);if(f.size>250*1024*1024)throw Error('File exceeds 250 MiB: '+f.name);const id=save(s,store(s).documents,{case_id:c?.id??null,case_title:c?.title??null,original_name:f.name,extension,mime_type:mime[extension]||f.type||'application/octet-stream',size_bytes:f.size,sha256:f.sha256,is_reference:reference?1:0,created_at:new Date().toISOString()});files.put(f.bytes,id);result.push(id);}
 }else if(ch==='documents:url'||ch==='documents:open-external'){
   const record=rows(s,'documents').find(r=>r.id===Number(x));if(!record)throw Error('Document not found');const r=files.get(record.id);r.onsuccess=()=>{if(!r.result){failure=Error('Stored file missing');tx.abort();return;}result={blob:r.result instanceof ArrayBuffer?new Blob([r.result],{type:record.mime_type||'application/octet-stream'}):r.result,record};};
 }else if(ch==='storage:workspace-id'){result=active(s)?.id??null;
 }else if(ch==='storage:status'){result={backend:'IndexedDB',records:Object.values(s.data).reduce((n,d)=>n+Object.values(d).reduce((m,a)=>m+a.length,0),0),documents:oldIds.size};
 }else result=invoke(s,ch,...args);
 const newIds=new Set(Object.values(s.data).flatMap(d=>d.documents.map(r=>r.id)));for(const id of oldIds)if(!newIds.has(id)){files.delete(id);if(urls.has(id)){URL.revokeObjectURL(urls.get(id));urls.delete(id);}}
 if(!request.result||JSON.stringify(s)!==before)state.put(s,'main');
 }catch(e){failure=e;tx.abort();}};
});}
window.api={call:async(ch,...args)=>{try{const db=await dbReady;let selected;if(ch==='documents:upload'){// invoke picker before awaiting database operations, preserving user activation
 throw Error('Internal upload routing error');
 }let d=await transact(db,ch,args,selected);if(ch==='documents:url'){const id=d.record.id;if(!urls.has(id))urls.set(id,URL.createObjectURL(d.blob));d=urls.get(id);}else if(ch==='documents:open-external'){shareDocument(d.blob,d.record);d=true;}else if(ch==='meetings:open-link'){meetingLink(d);d=true;}return {ok:1,d};}catch(e){return {ok:0,e:e.message};}}};
// Dossier: a single read-only snapshot of the active workspace; no attachment bytes or writes.
async function dossierRecord(request){
 const id=Number(request?.caseId);if(!Number.isSafeInteger(id)||id<1)throw Error('Invalid case identifier');
 const db=await dbReady;
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('state','readonly'), r=tx.objectStore('state').get('main');let result, failure;
  r.onsuccess=()=>{try{const s=r.result||legacy(), w=active(s);if(!w)throw Error('No active workspace');const d=store(s), c=d.cases.find(x=>Number(x.id)===id);if(!c)throw Error('Case not found in active workspace');
   const match=x=>Number(x.case_id)===id, hearings=sort(d.hearings.filter(match),['date','time','id']), ids=new Set(hearings.map(x=>Number(x.id)));
   result={c,hearings,events:sort(d.events.filter(match),['date','id']),notes:sort(d.notes.filter(x=>match(x)||ids.has(Number(x.hearing_id))),['updated_at','id']),tasks:sort(d.tasks.filter(x=>match(x)||ids.has(Number(x.source_hearing_id))),['due','id']),docs:sort(d.documents.filter(match),['original_name','id']).map(x=>({original_name:x.original_name})),mode:'case'};
  }catch(e){failure=e;}};
  tx.oncomplete=()=>failure?reject(failure):resolve(result);tx.onabort=()=>reject(tx.error||Error('Dossier read failed'));
 });
}
const baseDossierCall=window.api.call;
window.api.call=async(ch,...args)=>{if(ch!=='legal-print:record')return baseDossierCall(ch,...args);try{return {ok:1,d:await dossierRecord(args[0])};}catch(e){return {ok:0,e:e.message};}};
const original=window.api.call;
let activeWorkspace=null;
window.api.call=async(ch,...args)=>{if(['calendar:holidays:import','calendar:holidays:template','appearance:choose'].includes(ch)){try{if(ch==='calendar:holidays:template'){download(new Blob(['date,holiday,notes\r\n'],{type:'text/csv'}),'Tarikh-Court-Holiday-Template.csv');return {ok:1,d:{cancelled:false}};}if(ch==='appearance:choose'){checkAppearance(args[0]);const f=await pickOne('.png,.jpg,.jpeg,.webp,.gif');if(!f)return {ok:1,d:null};const data=await appearanceImage(f);return original('appearance:store',args[0],data);}const workspace=activeWorkspace;const f=await pickOne('.csv,text/csv');if(!f)return {ok:1,d:{cancelled:true}};if(f.size>5*1024*1024)throw Error('The CSV file must be smaller than 5 MB.');const parsed=calendarHolidayRows(await f.text());return original('calendar:holidays:apply',parsed,f.name,workspace);}catch(e){return {ok:0,e:e.message};}}if(ch==='documents:upload'){try{const workspace=activeWorkspace;const picked=await pick();if(!picked.length)return {ok:1,d:[]};const files=[];for(const f of picked){if(f.size>250*1024*1024)throw Error('File exceeds 250 MiB: '+f.name);const bytes=await f.arrayBuffer();if(bytes.byteLength!==f.size)throw Error('Upload read length mismatch: '+f.name);files.push({name:f.name,size:f.size,type:f.type,bytes,sha256:await digest(bytes)});}const db=await dbReady;return {ok:1,d:await transact(db,ch,args,{workspace,files})};}catch(e){return {ok:0,e:e.message};}}const result=await original(ch,...args);if(result.ok&&ch==='ws:active')activeWorkspace=result.d?.id??null;if(result.ok&&ch==='ws:activate')activeWorkspace=Number(args[0]);return result;};
// Portable backup: 8-byte magic, 4-byte header length, JSON metadata, binary files.
const requestValue=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
async function snapshot(){const db=await dbReady;return new Promise((res,rej)=>{const tx=db.transaction(['state','files'],'readonly'), st=tx.objectStore('state'),fs=tx.objectStore('files');const a=st.get('main'),b=fs.getAllKeys(),c=fs.getAll();tx.oncomplete=()=>res({state:a.result||legacy(),keys:b.result,blobs:c.result});tx.onabort=()=>rej(tx.error);});}
function validateState(s){if(!s||!Number.isSafeInteger(s.seq)||s.seq<0||!Array.isArray(s.workspaces)||!s.settings||typeof s.settings!=='object'||!s.data||typeof s.data!=='object')throw Error('Invalid backup state');const seen=new Set();for(const w of s.workspaces){if(!Number.isSafeInteger(w.id)||w.id<=0||seen.has(w.id)||w.id>s.seq)throw Error('Invalid workspace ID');seen.add(w.id);const d=s.data[w.id];if(!d||tables.some(t=>!Array.isArray(d[t])))throw Error('Invalid workspace tables');}if(Object.keys(s.data).length!==seen.size||s.workspaces.filter(w=>w.active).length!==(seen.size?1:0))throw Error('Invalid workspace mapping');const ids=new Set();for(const d of Object.values(s.data))for(const t of tables)for(const r of d[t]){if(!r||typeof r!=='object')throw Error('Invalid record');if(t==='holidays')continue;if(!Number.isSafeInteger(r.id)||r.id<=0||r.id>s.seq||seen.has(r.id)||ids.has(r.id))throw Error('Invalid record ID');ids.add(r.id);}for(const d of Object.values(s.data)){
 const cases=new Set(d.cases.map(r=>r.id)), hearings=new Map(d.hearings.map(r=>[r.id,r]));
 for(const t of ['events','hearings','tasks','notes','documents','meetings'])for(const r of d[t]){
  if(r.case_id!=null&&r.case_id!==''&&!cases.has(Number(r.case_id)))throw Error(`Invalid case reference in ${t} record ${r.id}`);
  for(const k of ['hearing_id','source_hearing_id'])if(r[k]!=null&&r[k]!==''){
   const h=hearings.get(Number(r[k]));if(!h)throw Error(`Invalid hearing reference in ${t} record ${r.id}`);
   if(r.case_id!=null&&r.case_id!==''&&Number(h.case_id)!==Number(r.case_id))throw Error(`Case/hearing mismatch in ${t} record ${r.id}`);
  }
 }
}return Object.values(s.data).flatMap(d=>d.documents);}
async function digest(buffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');}
const ZIP_LIMIT=512*1024*1024, META_LIMIT=64*1024*1024;
function zipLibrary(){if(!window.JSZip)throw Error('Offline ZIP library missing; prepare application dependencies first.');return window.JSZip;}
async function inspectStorage(){
 const snap=await snapshot(), docs=validateState(snap.state), map=new Map(snap.keys.map((k,i)=>[k,snap.blobs[i]])), entries=[], problems=[];
 for(const d of docs){try{const stored=map.get(d.id);if(!(stored instanceof ArrayBuffer)&&!(stored instanceof Blob))throw Error('missing binary data');const bytes=stored instanceof ArrayBuffer?stored:await stored.arrayBuffer();if(bytes.byteLength!==Number(d.size_bytes))throw Error(`expected ${d.size_bytes}, read ${bytes.byteLength} bytes; recover from a verified backup`);const sha256=await digest(bytes);if(d.sha256&&d.sha256!==sha256)throw Error('stored checksum mismatch');entries.push({d,bytes,sha256});}catch(e){problems.push(`${d.original_name} (ID ${d.id}): ${e.message}`);}map.delete(d.id);}
 if(map.size)problems.push(`${map.size} unreferenced attachment(s); investigate before exporting.`);
 return {state:snap.state,entries,problems,documents:docs.length};
}
async function healthCheck(){const r=await inspectStorage();return {documents:r.documents,verified:r.entries.length,problems:r.problems};}
// Encrypted envelope v1: magic (8), salt (32), nonce (12), ciphertext + GCM tag (16).
// The complete 52-byte header is authenticated. KDF parameters are fixed by magic/version.
const ENC_MAGIC=new TextEncoder().encode('TARIKHE1'), ENC_HEADER=52, ENC_ROUNDS=600000;
const RAW_LIMIT=ZIP_LIMIT+16*1024*1024;
async function backupKey(password,salt){
 const material=password instanceof CryptoKey?password:await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ENC_ROUNDS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptArchive(raw,password){
 if(typeof password!=='string'||Array.from(password).length<12)throw Error('Use at least 12 characters for the backup password.');
 if(raw.byteLength>RAW_LIMIT)throw Error('Backup exceeds current export safety limit');
 const header=new Uint8Array(ENC_HEADER);header.set(ENC_MAGIC);header.set(crypto.getRandomValues(new Uint8Array(44)),8);
 const key=await backupKey(password,header.subarray(8,40));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:header.subarray(40,52),additionalData:header,tagLength:128},key,raw);
 const out=new Uint8Array(ENC_HEADER+encrypted.byteLength);out.set(header);out.set(new Uint8Array(encrypted),ENC_HEADER);return out;
}
async function decryptArchive(raw,password){
 if(raw.byteLength<ENC_HEADER+16||raw.byteLength>RAW_LIMIT+ENC_HEADER+16)throw Error('Invalid encrypted backup size');
 const bytes=new Uint8Array(raw),header=bytes.subarray(0,ENC_HEADER);
 if(!ENC_MAGIC.every((b,i)=>header[i]===b))throw Error('Unsupported backup: select a password-protected Tarikh backup. Unencrypted backups are not supported.');
 const key=await backupKey(password,header.subarray(8,40));
 try{return await crypto.subtle.decrypt({name:'AES-GCM',iv:header.subarray(40,52),additionalData:header,tagLength:128},key,bytes.subarray(ENC_HEADER));}
 catch(e){throw Error('Incorrect backup password or damaged encrypted backup. No records changed.');}
}
async function exportBackup(password){
 const r=await inspectStorage();if(r.problems.length)throw Error(r.problems.join('\n'));const Zip=zipLibrary(),z=new Zip();const enc=new TextEncoder();
 const database=enc.encode(JSON.stringify(r.state));if(database.byteLength>META_LIMIT)throw Error('Database metadata exceeds supported size');
 const files=r.entries.map(({d,bytes,sha256})=>({id:d.id,path:`attachments/${d.id}.bin`,size:bytes.byteLength,sha256}));
 const m={format:3,created:new Date().toISOString(),database:{path:'database.json',size:database.byteLength,sha256:await digest(database)},files};
 const manifest=enc.encode(JSON.stringify(m));if(manifest.byteLength>META_LIMIT||database.byteLength+manifest.byteLength+files.reduce((n,f)=>n+f.size,0)>ZIP_LIMIT)throw Error('Backup exceeds 512 MiB safety limit. Large-workspace streaming export is not yet supported.');
 z.file('manifest.json',manifest);z.file('database.json',database);for(const {d,bytes} of r.entries)z.file(`attachments/${d.id}.bin`,bytes,{createFolders:false});
 const raw=await z.generateAsync({type:'uint8array',compression:'STORE'});const encrypted=await encryptArchive(raw,password);const file=new File([encrypted],`Tarikh-${new Date().toISOString().replace(/[:.]/g,'-')}.tarikh`,{type:'application/octet-stream'});await parseBackup(file,password);return file;
}
// Read central directory before decompression: reject duplicate names, compressed entries,
// ZIP64, encrypted archives and excessive sizes. Our writer uses STORE only.
function checkZipDirectory(raw){
 const v=new DataView(raw),u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);let end=-1;
 for(let p=raw.byteLength-22;p>=Math.max(0,raw.byteLength-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===raw.byteLength){end=p;break;}
 if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw Error('Invalid ZIP directory');const count=u16(end+10),start=u32(end+16),size=u32(end+12);if(count===65535||start+size!==end)throw Error('Unsupported ZIP directory');let p=start,total=0;const names=new Set(),dec=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){if(p+46>end||u32(p)!==0x02014b50)throw Error('Invalid ZIP entry');const flags=u16(p+8),method=u16(p+10),packed=u32(p+20),len=u32(p+24),nl=u16(p+28),xl=u16(p+30),cl=u16(p+32),next=p+46+nl+xl+cl;if(next>end||flags&1||method!==0||packed!==len||len===0xffffffff)throw Error('Unsupported or damaged ZIP entry');const name=dec.decode(raw.slice(p+46,p+46+nl));if(names.has(name)||!(/^(manifest\.json|database\.json|attachments\/[1-9][0-9]*\.bin|attachments\/)$/).test(name))throw Error('Unexpected or duplicate ZIP entry: '+name);if((name.endsWith('.json')&&len>META_LIMIT)||(name.endsWith('.bin')&&len>250*1024*1024))throw Error('ZIP entry exceeds safety limit');names.add(name);total+=len;if(total>ZIP_LIMIT)throw Error('ZIP contents exceed safety limit');p=next;}
 if(p!==end||!names.has('manifest.json')||!names.has('database.json'))throw Error('Incomplete ZIP directory');return names;
}
async function parseZip(raw){
 const names=checkZipDirectory(raw),Zip=zipLibrary(),z=await Zip.loadAsync(raw,{checkCRC32:true});
 const read=async name=>{const f=z.file(name);if(!f)throw Error('Missing ZIP entry: '+name);return f.async('arraybuffer');};
 const dec=new TextDecoder('utf-8',{fatal:true}),m=JSON.parse(dec.decode(await read('manifest.json')));if(m.format!==3||!Array.isArray(m.files)||m.database?.path!=='database.json')throw Error('Unsupported ZIP backup manifest');
 const verify=async (path,entry)=>{const bytes=await read(path);if(!Number.isSafeInteger(entry.size)||bytes.byteLength!==entry.size||!/^[a-f0-9]{64}$/.test(entry.sha256||'')||await digest(bytes)!==entry.sha256)throw Error('Integrity check failed: '+path);return bytes;};
 const state=JSON.parse(dec.decode(await verify('database.json',m.database))),docs=validateState(state),map=new Map(docs.map(d=>[d.id,d])),blobs=[];if(m.files.length!==docs.length)throw Error('Attachment count mismatch');
 names.delete('manifest.json');names.delete('database.json');names.delete('attachments/');
 for(const e of m.files){const d=map.get(e.id),path=`attachments/${e.id}.bin`;if(!d||e.path!==path||e.size!==Number(d.size_bytes)||!names.delete(path))throw Error('Invalid attachment index: '+e.id);const bytes=await verify(path,e);if(d.sha256&&d.sha256!==e.sha256)throw Error('Database attachment checksum mismatch: '+e.id);d.sha256=e.sha256;blobs.push([e.id,bytes]);map.delete(e.id);}
 if(map.size||names.size)throw Error('Unexpected or missing attachments');return {state,blobs,format:3};
}
async function parseBackup(file,password){if(file.size>RAW_LIMIT+ENC_HEADER+16)throw Error('Backup exceeds current import safety limit');const raw=await file.arrayBuffer();if(raw.byteLength!==file.size)throw Error('Backup file read length mismatch');const plain=await decryptArchive(raw,password);return parseZip(plain);}
async function restoreBackup(parsed){const db=await dbReady;await new Promise((res,rej)=>{const tx=db.transaction(['state','files'],'readwrite');tx.oncomplete=res;tx.onabort=()=>rej(tx.error||Error('Restore aborted'));try{const fs=tx.objectStore('files');fs.clear();for(const [id,b] of parsed.blobs)fs.put(b,id);tx.objectStore('state').put(parsed.state,'main');}catch(e){tx.abort();rej(e);}});for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();}
window.tarikhBackup={exportBackup,parseBackup,restoreBackup,healthCheck,async status(){const s=await snapshot();return {workspaces:s.state.workspaces.length,cases:Object.values(s.state.data).reduce((n,d)=>n+d.cases.length,0),documents:Object.values(s.state.data).reduce((n,d)=>n+d.documents.length,0),bytes:s.blobs.reduce((n,b)=>n+(b instanceof ArrayBuffer?b.byteLength:b.size),0)};}};
// POINT 9A: classic STORE ZIP, encrypted in independently authenticated 1 MiB frames.
// No plaintext temporary archive. Old encrypted envelope remains importable.
const LARGE_MAGIC=new TextEncoder().encode('TARIKHE2'), CHUNK=1048576, MAX_ZIP=0xfffffffe, MAX_ENTRY=250*CHUNK;
const te=new TextEncoder(), td=new TextDecoder('utf-8',{fatal:true});
const bytes=n=>new Uint8Array(n), view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
function join(...a){const b=bytes(a.reduce((n,x)=>n+x.byteLength,0));let p=0;for(const x of a){b.set(x,p);p+=x.byteLength;}return b;}
function same(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i]);}
function need(ok,msg){if(!ok)throw Error(msg);}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function local(e){const n=te.encode(e.name),b=bytes(30+n.length),v=view(b);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);v.setUint32(14,e.crc,true);v.setUint32(18,e.size,true);v.setUint32(22,e.size,true);v.setUint16(26,n.length,true);b.set(n,30);return b;}
function central(e){const n=te.encode(e.name),b=bytes(46+n.length),v=view(b);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(14,33,true);v.setUint32(16,e.crc,true);v.setUint32(20,e.size,true);v.setUint32(24,e.size,true);v.setUint16(28,n.length,true);v.setUint32(42,e.offset,true);b.set(n,46);return b;}
function endZip(count,size,offset){const b=bytes(22),v=view(b);v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return b;}
function frameInfo(header,index,n){const f=bytes(8);view(f).setUint32(0,index);view(f).setUint32(4,n);const iv=bytes(12);iv.set(header.subarray(40,48));view(iv).setUint32(8,index);return {f,params:{name:'AES-GCM',iv,additionalData:join(header,f),tagLength:128}};}
async function encryptedWriter(write,password){need(password instanceof CryptoKey||(typeof password==='string'&&Array.from(password).length>=12),'Use at least 12 characters for the backup password.');const header=join(LARGE_MAGIC,crypto.getRandomValues(bytes(40))),key=await backupKey(password,header.subarray(8,40));await write(header);let i=0,buf=bytes(CHUNK),used=0;
 async function emit(b){const {f,params}=frameInfo(header,i++,b.length);await write(join(f,new Uint8Array(await crypto.subtle.encrypt(params,key,b))));}
 return {async push(b){for(let p=0;p<b.length;){const n=Math.min(CHUNK-used,b.length-p);buf.set(b.subarray(p,p+n),used);used+=n;p+=n;if(used===CHUNK){await emit(buf);used=0;}}},async finish(){if(used)await emit(buf.subarray(0,used));await emit(bytes(0));}};
}
async function readSlice(file,p,n){need(p+n<=file.size,'Truncated encrypted backup');const b=new Uint8Array(await file.slice(p,p+n).arrayBuffer());need(b.length===n,'Backup file read length mismatch');return b;}
async function encryptedReader(file,password){const header=await readSlice(file,0,48);need(same(header.subarray(0,8),LARGE_MAGIC),'Unsupported encrypted backup');const key=await backupKey(password,header.subarray(8,40));let pos=48,index=0,buf=bytes(0),at=0,ended=false,short=false,total=0;
 async function next(){need(!ended,'Unexpected end of archive');const f=await readSlice(file,pos,8),v=view(f),n=v.getUint32(4);need(v.getUint32(0)===index&&n<=CHUNK&&(!short||n===0),'Invalid encrypted frame');const {params}=frameInfo(header,index++,n);pos+=8;const c=await readSlice(file,pos,n+16);pos+=n+16;try{buf=new Uint8Array(await crypto.subtle.decrypt(params,key,c));}catch(e){throw Error('Incorrect backup password or damaged encrypted backup. No records changed.');}at=0;total+=n;need(total<=MAX_ZIP,'ZIP size limit exceeded');if(n<CHUNK)short=true;if(!n){ended=true;need(pos===file.size,'Unexpected bytes after authenticated end');}}
 return {async read(n){need(Number.isSafeInteger(n)&&n>=0&&n<=MAX_ENTRY,'Invalid ZIP read size');const out=bytes(n);let p=0;while(p<n){if(at===buf.length)await next();need(!ended,'Truncated ZIP archive');const k=Math.min(n-p,buf.length-at);out.set(buf.subarray(at,at+k),p);p+=k;at+=k;}return out;},async finish(){need(at===buf.length,'Unexpected ZIP trailing bytes');await next();need(ended,'Missing authenticated end');}};
}
// Hold the IndexedDB transaction active across crypto/disk awaits. Only one attachment is fetched at a time.
async function held(mode,fn){const db=await dbReady,tx=db.transaction(['state','files'],mode),st=tx.objectStore('state'),fs=tx.objectStore('files');let running=true;const queue=[];const completion=new Promise((res,rej)=>{tx.oncomplete=res;tx.onabort=()=>rej(tx.error||Error('Storage transaction aborted'));});completion.catch(()=>{});function tick(){if(!running)return;const r=st.count();r.onsuccess=()=>{for(const job of queue.splice(0))job();tick();};}function wrap(store){return Object.fromEntries(['get','getAllKeys','put','clear'].map(method=>[method,(...args)=>new Promise((res,rej)=>{queue.push(()=>{try{const r=store[method](...args);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});})]));}tick();try{const result=await Promise.race([fn(wrap(st),wrap(fs)),completion.then(()=>{throw Error('Storage transaction ended early');})]);running=false;await completion;return result;}catch(e){running=false;try{tx.abort();}catch(_){}await completion.catch(()=>{});throw e;}}
async function docBytes(fs,d){const stored=await fs.get(d.id);need(stored instanceof ArrayBuffer||stored instanceof Blob,'Missing attachment '+d.id);const b=new Uint8Array(stored instanceof ArrayBuffer?stored:await stored.arrayBuffer());need(b.length===Number(d.size_bytes)&&b.length<=MAX_ENTRY,'Attachment read length mismatch: '+d.id);const sha256=await digest(b);need(!d.sha256||d.sha256===sha256,'Stored checksum mismatch: '+d.id);return {b,sha256};}
async function writeZip(writer,st,fs,progress){const state=await st.get('main')||legacy(),docs=validateState(state),keys=await fs.getAllKeys(),ids=new Set(docs.map(d=>d.id));need(keys.length===docs.length&&keys.every(k=>ids.has(k)),'Missing or orphaned attachments');need(docs.length+2<65535,'Too many ZIP entries');let offset=0;const entries=[],files=[];
 async function push(b){offset+=b.length;need(offset<=MAX_ZIP,'Classic ZIP limit reached (under 4 GiB).');await writer.push(b);}
 async function add(name,b){const e={name,size:b.length,crc:crc(b),offset};entries.push(e);await push(local(e));await push(b);}
 const database=te.encode(JSON.stringify(state));need(database.length<=META_LIMIT,'Database metadata too large');await add('database.json',database);let i=0;for(const d of docs){const {b,sha256}=await docBytes(fs,d),path=`attachments/${d.id}.bin`;await add(path,b);files.push({id:d.id,path,size:b.length,sha256});progress?.(`Preparing attachment ${++i}/${docs.length}…`);}
 const manifest=te.encode(JSON.stringify({format:3,created:new Date().toISOString(),database:{path:'database.json',size:database.length,sha256:await digest(database)},files}));need(manifest.length<=META_LIMIT,'Manifest too large');await add('manifest.json',manifest);const start=offset;for(const e of entries)await push(central(e));await push(endZip(entries.length,offset-start,start));await writer.finish();}
async function readZip(reader,onEntry,progress){let offset=0;const entries=[], seen=new Set();async function read(n){const b=await reader.read(n);offset+=n;return b;}let state,dbHash,dbSize,manifest,docs,actual=new Map();
 while(true){const start=offset,sig=await read(4);if(view(sig).getUint32(0,true)===0x02014b50){need(entries.length>0,'Missing ZIP entries');let expected=central(entries[0]);need(same(sig,expected.subarray(0,4))&&same(await read(expected.length-4),expected.subarray(4)),'ZIP directory mismatch');for(const e of entries.slice(1)){expected=central(e);need(same(await read(expected.length),expected),'ZIP directory mismatch');}need(same(await read(22),endZip(entries.length,offset-start-22,start)),'ZIP end mismatch');break;}
 need(view(sig).getUint32(0,true)===0x04034b50&&entries.length<65534,'Invalid ZIP local entry');const h=join(sig,await read(26)),v=view(h),n=v.getUint16(26,true),size=v.getUint32(22,true);need(n>0&&n<100&&size<=MAX_ENTRY,'Invalid ZIP entry size');const name=td.decode(await read(n)),e={name,size,crc:v.getUint32(14,true),offset:start};need(same(join(h,te.encode(name)),local(e))&&!seen.has(name),'Unsupported or duplicate ZIP entry');seen.add(name);entries.push(e);need(name.endsWith('.bin')||size<=META_LIMIT,'Metadata too large');const b=await read(size);need(crc(b)===e.crc,'ZIP CRC mismatch: '+name);
 if(name==='database.json'){need(!state&&entries.length===1,'Database must be first');state=JSON.parse(td.decode(b));docs=new Map(validateState(state).map(d=>[d.id,d]));dbHash=await digest(b);dbSize=size;}
 else if(name==='manifest.json'){need(state&&!manifest,'Invalid manifest order');manifest=JSON.parse(td.decode(b));}
 else {need(state&&!manifest&&/^attachments\/[1-9][0-9]*\.bin$/.test(name),'Unexpected ZIP entry');const id=Number(name.split('/')[1].split('.')[0]),d=docs.get(id);need(d&&size===Number(d.size_bytes)&&!actual.has(id),'Attachment index mismatch');const sha256=await digest(b);need(!d.sha256||d.sha256===sha256,'Attachment checksum mismatch');actual.set(id,{id,path:name,size,sha256});d.sha256=sha256;await onEntry?.(id,b.buffer);progress?.(`Verified attachment ${actual.size}/${docs.size}…`);}
 }
 await reader.finish();need(manifest?.format===3&&state&&manifest.database?.path==='database.json'&&manifest.database.size===dbSize&&manifest.database.sha256===dbHash&&Array.isArray(manifest.files)&&manifest.files.length===docs.size&&actual.size===docs.size,'Invalid archive manifest');for(const e of manifest.files){const a=actual.get(e.id);need(a&&a.path===e.path&&a.size===e.size&&a.sha256===e.sha256,'Manifest attachment mismatch');actual.delete(e.id);}need(!actual.size,'Missing manifest entries');return {state,blobs:{length:docs.size},format:3};}
const oldParseBackup=parseBackup,oldRestoreBackup=restoreBackup;
let tempName=null;
async function diskWriter(handle,name){if(typeof handle.createWritable==='function')return handle.createWritable();const w=new Worker('./backup-disk-worker.js');let pending=null;w.onmessage=e=>{if(!pending)return;const {resolve,reject}=pending;pending=null;e.data.ok?resolve():reject(Error(e.data.error));};w.onerror=e=>{pending?.reject(Error(e.message||'Backup storage worker failed'));pending=null;};function call(type,data){return new Promise((resolve,reject)=>{pending={resolve,reject};w.postMessage({type,name,data});});}try{await call('open');}catch(e){w.terminate();throw e;}return {write:b=>call('write',b),async close(){try{await call('close');}finally{w.terminate();}},async abort(){w.terminate();}};}

async function largeExport(password,progress,retained=false){need(navigator.storage?.getDirectory,'Disk-backed backup storage is unavailable on this iPad. No data changed.');const root=await navigator.storage.getDirectory();if(!retained&&tempName){await root.removeEntry(tempName).catch(()=>{});tempName=null;}const name=`${retained?"Tarikh-Recovery":"Tarikh"}-${new Date().toISOString().replace(/[:.]/g,"-")}-${crypto.randomUUID().slice(0,8)}.tarikh`,handle=await root.getFileHandle(name,{create:true});let stream;try{stream=await diskWriter(handle,name);const writer=await encryptedWriter(b=>stream.write(b),password);await held('readonly',(st,fs)=>writeZip(writer,st,fs,progress));await stream.close();stream=null;const file=await handle.getFile();await readZip(await encryptedReader(file,password),null,progress);if(!retained)tempName=name;return file;}catch(e){if(stream)await stream.abort().catch(()=>{});await root.removeEntry(name).catch(()=>{});throw e;}}
async function largeParse(file,password,progress){const magic=await readSlice(file,0,8);if(!same(magic,LARGE_MAGIC))return oldParseBackup(file,password);const parsed=await readZip(await encryptedReader(file,password),null,progress);return {...parsed,largeFile:file,password};}
async function largeRestore(parsed,progress){if(!parsed.largeFile)return oldRestoreBackup(parsed);const reader=await encryptedReader(parsed.largeFile,parsed.password);try{await held('readwrite',async(st,fs)=>{await fs.clear();const result=await readZip(reader,(id,b)=>fs.put(b,id),progress);await st.put(result.state,'main');});}finally{parsed.password=null;}for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();}
async function largeHealth(){return held('readonly',async(st,fs)=>{const s=await st.get('main')||legacy(),docs=validateState(s),keys=new Set(await fs.getAllKeys()),problems=[];let verified=0;for(const d of docs){try{await docBytes(fs,d);verified++;}catch(e){problems.push(`${d.original_name}: ${e.message}`);}keys.delete(d.id);}if(keys.size)problems.push(`${keys.size} orphaned attachments`);return {documents:docs.length,verified,problems};});}
async function largeStatus(){return held('readonly',async(st)=>{const s=await st.get('main')||legacy(),docs=validateState(s);return {workspaces:s.workspaces.length,cases:Object.values(s.data).reduce((n,d)=>n+d.cases.length,0),documents:docs.length,bytes:docs.reduce((n,d)=>n+Number(d.size_bytes),0)};});}
async function releaseTemp(){if(!tempName)return;const root=await navigator.storage.getDirectory();await root.removeEntry(tempName);tempName=null;}
async function cleanupTemps(){const root=await navigator.storage.getDirectory();let removed=0;for await(const [name,handle] of root.entries()){
 if(handle.kind!=='file'||name===tempName||!/^Tarikh-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}\.tarikh$/.test(name))continue;
 try{const f=await handle.getFile();if(Date.now()-f.lastModified>7*86400000){await root.removeEntry(name);removed++;}}catch(e){console.warn('Temporary backup cleanup deferred',e);}
}return removed;}
window.tarikhBackup={cleanupTemps,releaseTemp,exportBackup:largeExport,parseBackup:largeParse,restoreBackup:largeRestore,healthCheck:largeHealth,status:largeStatus};

})();
