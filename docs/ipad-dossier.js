'use strict';
(() => {
const htmlEscape = value => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const text = value => htmlEscape(value).replace(/\r\n|\r|\n/g, '<br>');
const nonempty = value => value !== null && value !== undefined && String(value).trim() !== '';
const dateDisplay = value => {
  if (!nonempty(value)) return 'Not recorded';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(value);
  const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', {day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(d);
};
const para = value => `<p class="legal-paragraph">${text(value)}</p>`;
const section = (num, name, body) => `<section class="legal-section"><h2>${num}. ${htmlEscape(name)}</h2>${body || '<p>Not recorded.</p>'}</section>`;
const numbered = items => items.map((x, index) => `<div class="numbered-paragraph"><span class="para-num">${index + 1}.</span><div>${text(x)}</div></div>`).join('');
const tableCell = (value, kind = 'td') => `<${kind}>${text(value)}</${kind}>`;
const particularsTable = pairs => {
  const rows = pairs.filter(([,value]) => nonempty(value));
  if (!rows.length) return para('Not recorded.');
  return `<table class="legal-table particulars-table"><colgroup><col class="particular-name-col"><col></colgroup><tbody>${rows.map(([name,value]) => `<tr>${tableCell(name,'th')}${tableCell(value)}</tr>`).join('')}</tbody></table>`;
};
const hearingTable = hs => {
  if (!hs.length) return para('No hearing records.');
  return `<table class="legal-table hearing-chronology-table">
    <colgroup><col class="hearing-date-col"><col class="hearing-listing-col"><col></colgroup>
    <thead><tr><th scope="col">Date / Time</th><th scope="col">Listing Particulars</th><th scope="col">Proceedings / Record</th></tr></thead>
    <tbody>${hs.map(h => {
      const listing = [
        ['Court', h.court], ['Bench',h.bench], ['Room',h.room],
        ['Board',[h.board_type,h.board_no].filter(nonempty).join(' / ')],
        ['Serial',h.serial], ['Purpose',h.purpose], ['Advocate',h.advocate]
      ].filter(([,v]) => nonempty(v)).map(([name,value])=>`<div class="table-item"><strong>${htmlEscape(name)}:</strong> ${text(value)}</div>`).join('');
      const recorded = [
        ['Minutes / Proceedings',h.minutes],
        ['Orders / Directions (user-recorded)',h.orders],
        ['Further Action',h.action]
      ].filter(([,v])=>nonempty(v)).map(([name,value])=>`<div class="table-item"><strong>${htmlEscape(name)}:</strong> ${text(value)}</div>`).join('');
      return `<tr><td>${htmlEscape(dateDisplay(h.date))}${nonempty(h.time)?`<div>${text(h.time)}</div>`:''}</td><td>${listing||'Not recorded.'}</td><td>${recorded||'Not recorded.'}</td></tr>`;
    }).join('')}</tbody></table>`;
};
const field = (name, value) => nonempty(value) ? `<div class="detail"><span class="detail-name">${htmlEscape(name)}:</span><span>${text(value)}</span></div>` : '';
// Tabular legal appendices. Headers are repeated by Chromium on continuation pages.
const datesTable = rows => {
  if (!rows.length) return para('No dates recorded.');
  return `<table class="legal-table dates-table">
    <colgroup><col class="serial-col"><col class="dates-date-col"><col></colgroup>
    <thead><tr><th scope="col">Sr. No.</th><th scope="col">Date</th><th scope="col">Particulars / Events</th></tr></thead>
    <tbody>${rows.map((r,i) => `<tr>
      <td>${i+1}.</td>
      <td>${htmlEscape(dateDisplay(r.date))}</td>
      <td><strong>${htmlEscape(r.kind || 'Event')}</strong>${nonempty(r.text) ? `<div class="table-item">${text(r.text)}</div>` : ''}${r.historical ? '<div class="table-item">Historical record</div>' : ''}</td>
    </tr>`).join('')}</tbody></table>`;
};
const documentsTable = docs => {
  if (!docs.length) return para('No documents indexed.');
  return `<table class="legal-table documents-table">
    <colgroup><col class="serial-col"><col></colgroup>
    <thead><tr><th scope="col">Sr. No.</th><th scope="col">Description of Document</th></tr></thead>
    <tbody>${docs.map((d,i)=>`<tr><td>${i+1}.</td><td>${text(d.original_name || 'Unnamed document')}</td></tr>`).join('')}</tbody></table>`;
};
const tasksTable = tasks => {
  if (!tasks.length) return para('No tasks recorded.');
  return `<table class="legal-table tasks-table">
    <colgroup><col class="serial-col"><col><col class="task-status-col"></colgroup>
    <thead><tr><th scope="col">Sr. No.</th><th scope="col">Task / Particulars</th><th scope="col">Due Date / Status</th></tr></thead>
    <tbody>${tasks.map((t,i) => `<tr>
      <td>${i+1}.</td>
      <td><strong>${text(t.title || 'Untitled task')}</strong>${nonempty(t.notes) ? `<div class="table-item">${text(t.notes)}</div>` : ''}</td>
      <td>${nonempty(t.due) ? `<div>${text(dateDisplay(t.due))}</div>` : ''}
        ${nonempty(t.priority) ? `<div class="table-item">Priority: ${text(t.priority)}</div>` : ''}
        <div class="table-item">${t.done ? 'Completed' : 'Pending'}</div>
      </td>
    </tr>`).join('')}</tbody></table>`;
};
const notesSections = notes => notes.map((n, index) => `<div class="entry"><h3>${index+1}. ${htmlEscape(n.title || 'Untitled note')}</h3><p class="minor">${n.hearing_id ? 'Linked to hearing' : 'Case note'}${n.updated_at ? ' · Updated ' + htmlEscape(dateDisplay(n.updated_at)) : ''}</p>${para(n.content || '')}</div>`).join('');
function buildHtml(record, options) {
  const { c, hearings, events, notes, tasks, docs, mode, hearing } = record;
  const settings = options || {};
  const include = settings.include || {};
  const included = key => include[key] !== false;
  const shortTitle = [c.number, c.title].filter(nonempty).join(' — ').slice(0, 120);
  const parties = nonempty(c.parties) ? para(c.parties) : '';
  // 'parties' in Tarikh is a free-text field; do not invent applicant/respondent roles.
  const cause = `<header class="cause-title"><p class="court">${text(c.court || 'COURT / AUTHORITY NOT RECORDED')}</p>${nonempty(c.number) ? `<p class="case-number">${text(c.number)}</p>` : ''}<p class="matter-title">${text(c.title)}</p>${parties ? `<div class="parties">${parties}</div>` : ''}</header>`;
  const heading = mode === 'hearing' ? 'RECORD OF HEARING' : 'CASE RECORD AND PROCEEDINGS';
  const blocks = [];
  let num = 0;
  const add = (name, body) => blocks.push(section(++num,name,body));
  if (mode === 'hearing') {
    add('PARTICULARS OF THE HEARING', particularsTable([
      ['Date of Hearing',dateDisplay(hearing.date)],['Time',hearing.time],
      ['Court / Authority',hearing.court || c.court],['Bench',hearing.bench],
      ['Room',hearing.room],['Board',[hearing.board_type,hearing.board_no].filter(nonempty).join(' / ')],
      ['Serial No.',hearing.serial],['Purpose',hearing.purpose],['Advocate',hearing.advocate]
    ]));
    if (included('minutes')) add('MINUTES / PROCEEDINGS',nonempty(hearing.minutes) ? para(hearing.minutes) : para('Not recorded.'));
    if (included('orders')) add('ORDERS / DIRECTIONS (USER-RECORDED)',nonempty(hearing.orders) ? para(hearing.orders) : para('Not recorded.'));
    if (included('actions')) add('FURTHER ACTION',nonempty(hearing.action) ? para(hearing.action) : para('Not recorded.'));
    if (included('notes')) add('HEARING-LINKED NOTES', notesSections(notes.filter(n => Number(n.hearing_id) === Number(hearing.id))) || para('No hearing-linked notes recorded.'));
  } else {
    add('PARTICULARS OF THE CASE', particularsTable([
      ['Case Number',c.number],['Court / Authority',c.court],['Case Type',c.type],
      ['Filing Date',nonempty(c.filed) ? dateDisplay(c.filed) : ''],
      ['Present Stage',c.stage],['Present Status',c.status],['Client',c.client],
      ['Next Hearing',nonempty(c.next_hearing) ? dateDisplay(c.next_hearing) : '']
    ]));
    if (included('background') && nonempty(c.background)) add('BACKGROUND',para(c.background));
    if (included('dates')) {
      const combined = [...events.map(e=>({...e,kind:e.kind||'Event'})),...hearings.map(h=>({date:h.date,kind:'Hearing',text:[h.purpose,h.minutes,h.orders].filter(nonempty).join(' — ')}))].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
      add('LIST OF DATES AND EVENTS',datesTable(combined));
    }
    if (included('hearings')) add('RECORD OF HEARINGS',hearingTable(hearings));
    if (included('notes')) add('NOTES AND OBSERVATIONS',notesSections(notes) || para('No case notes recorded.'));
    if (included('tasks')) add('DIRECTIONS AND TASKS',tasksTable(tasks));
    if (included('documents')) add('INDEX OF DOCUMENTS',documentsTable(docs));
  }
  const reference = String(shortTitle || 'Case record').replace(/[^a-zA-Z0-9 ._\-\/()]/g, ' ').slice(0, 90);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${htmlEscape(heading)}</title><style>
    /* Bombay High Court e-filing-style working-document preset (not a filed pleading). */
    /* Duplex paper-book binding margins (Bombay High Court Appellate Side):
       odd/front page:  left 5cm, right 3cm;
       even/back page: left 3cm, right 5cm.
       Keep existing top and bottom margins. */
    @page {
      size: A4;
      margin-top: 1.5in;
      margin-bottom: 1.5in;
      margin-left: 5cm;
      margin-right: 3cm;
      @top-right { content: "${reference.replace(/["\\]/g,'')}"; font: 8pt "Times New Roman",serif; color: #444; }
      @bottom-center { content: "Page " counter(page); font: 10pt "Times New Roman",serif; }
    }
    @page :right { margin-left: 5cm; margin-right: 3cm; }
    @page :left { margin-left: 3cm; margin-right: 5cm; }
    @page :first { margin-left: 5cm; margin-right: 3cm; @top-right { content: none; } }
    * { box-sizing: border-box; }
    html,body { margin:0; padding:0; background:white; color:#000; }
    body { font: 14pt/1.5 "Times New Roman",Times,serif; text-align:justify; }
    .cause-title { text-align:center; margin:0 0 24pt; }
    .court { font-weight:700; text-transform:uppercase; margin:0 0 7pt; }
    .case-number { margin:0 0 10pt; }
    .matter-title { font-weight:700; margin:10pt 0; }
    .parties { text-align:justify; margin:12pt 0; white-space:normal; }
    .parties p { margin:0; }
    h1 { font: bold 14pt/1.5 "Times New Roman",serif; text-align:center; text-decoration:underline; margin:22pt 0; }
    h2 { font: bold 14pt/1.5 "Times New Roman",serif; text-align:left; margin:20pt 0 8pt; break-after:avoid; page-break-after:avoid; }
    h3 { font: bold 14pt/1.5 "Times New Roman",serif; margin:16pt 0 7pt; break-after:avoid; page-break-after:avoid; }
    h4 { font: bold 14pt/1.5 "Times New Roman",serif; margin:10pt 0 6pt; break-after:avoid; page-break-after:avoid; }
    p { margin:0 0 8pt; orphans:3; widows:3; }
    .legal-table { width:100%; border-collapse:collapse; table-layout:fixed; margin:7pt 0 14pt; text-align:left; font:14pt/1.5 "Times New Roman",Times,serif; }
    .legal-table th,.legal-table td { border:1px solid #000; padding:6pt 7pt; vertical-align:top; overflow-wrap:anywhere; word-break:normal; }
    .legal-table th { font-weight:700; text-align:left; }
    .legal-table thead { display:table-header-group; }
    .legal-table tr { break-inside:avoid; page-break-inside:avoid; }
    .legal-table tbody { break-inside:auto; }
    .legal-table .particular-name-col { width:38%; }
    .hearing-chronology-table { font-size:11pt; line-height:1.35; }
    .dates-table, .documents-table, .tasks-table { font-size:11pt; line-height:1.35; }
    .serial-col { width:12%; }
    .dates-date-col { width:29%; }
    .task-status-col { width:31%; }

    .hearing-date-col { width:23%; }
    .hearing-listing-col { width:35%; }
    .table-item + .table-item { margin-top:5pt; }
    .table-item strong { font-weight:700; }
    .detail { display:flex; gap:10pt; break-inside:avoid; margin:0 0 4pt; text-align:left; }
    .detail-name { flex:0 0 36%; }
    .detail span:last-child { flex:1; min-width:0; overflow-wrap:anywhere; white-space:pre-wrap; }
    .legal-paragraph { text-align:justify; overflow-wrap:anywhere; }
    .entry,.hearing-entry { margin:0 0 12pt; }
    .entry-details { margin:5pt 0 10pt; }
    .minor { font-size:11pt; }
    .doc-index { display:flex; gap:12pt; margin-bottom:8pt; }
    .doc-index span:last-child { overflow-wrap:anywhere; }
    .end-note { font-size:10pt; text-align:center; margin:24pt 0 0; }
  </style></head><body>${cause}<h1>${heading}</h1>${blocks.join('')}<p class="end-note">Prepared from records maintained in Tarikh for internal chamber reference. Not a certified court record or judicial order.</p></body></html>`;
}
// A4 layout in PDF points. Explicit pagination makes binding margins independent of WebKit's @page support.
const W=210*72/25.4,H=297*72/25.4,INNER=50*72/25.4,OUTER=30*72/25.4,TOP=108,BOTTOM=108,CW=W-INNER-OUTER;
const measureCanvas=document.createElement('canvas'),measure=measureCanvas.getContext('2d');
const font=(size,bold)=>`${bold?'bold ':''}${size}pt "Times New Roman", Times, serif`;
const metrics=[[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,761,500,0,333,500,444,1000,500,500,333,1000,556,333,889,0,611,0,0,333,333,444,444,350,500,1000,333,980,389,333,722,0,444,722,250,333,500,500,500,500,200,500,333,760,276,500,564,333,760,333,400,564,300,300,333,500,453,250,333,300,310,500,750,750,750,444,722,722,722,722,722,722,889,667,611,611,611,611,333,333,333,333,722,722,722,722,722,722,722,564,722,722,722,722,722,722,556,500,444,444,444,444,444,444,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,564,500,500,500,500,500,500,500,500],[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,761,500,0,333,500,500,1000,500,500,333,1000,556,333,1000,0,667,0,0,333,333,500,500,350,500,1000,333,1000,389,333,722,0,444,722,250,333,500,500,500,500,220,500,333,747,300,500,570,333,747,333,400,570,300,300,333,556,540,250,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,570,500,556,556,556,556,500,556,500]];
function width(t,size,bold){const bytes=ansi(t);if(bytes)return bytes.reduce((sum,b)=>sum+metrics[bold?1:0][b],0)*size/1000;measure.font=`${bold?'bold ':''}${size}px "Times New Roman", Times, serif`;return measure.measureText(t).width;}
function wrap(value,max,size,bold){
 const out=[];for(const paragraph of String(value).replace(/\r\n?/g,'\n').split('\n')){
  let line='';for(const word of paragraph.split(/\s+/u).filter(Boolean)){
   if(width(line?line+' '+word:word,size,bold)<=max){line+=(line?' ':'')+word;continue;}
   if(line){out.push(line);line='';}if(width(word,size,bold)<=max){line=word;continue;}
   for(const ch of Array.from(word)){if(line&&width(line+ch,size,bold)>max){out.push(line);line='';}line+=ch;}
  }out.push(line);
 }return out;
}
function elementText(el){function read(n){if(n.nodeType===3)return n.nodeValue.replace(/\s+/g,' ');if(n.nodeType!==1)return '';if(n.tagName==='BR')return '\n';const value=Array.from(n.childNodes,read).join('');return n!==el&&n.tagName==='DIV'?'\n'+value.trim()+'\n':value;}return read(el).split('\n').map(x=>x.trim()).join('\n').trim();}
function layout(record,request){
 const parsed=new DOMParser().parseFromString(buildHtml(record,request),'text/html'), pages=[];let page,y;
 const reference=[record.c.number,record.c.title].filter(nonempty).join(' — ');
 function op(v){page.ops.push(v);}
 function txt(t,x,y,size=14,bold=false,align='left',underline=false,justify=0){if(t)op({kind:'text',t,x,y,size,bold,align,underline,justify});}
 function rect(x,y,w,h){op({kind:'rect',x,y,w,h});}
 function newPage(){if(pages.length>=200)throw Error('Dossier exceeds the 200-page output limit. Select fewer sections.');page={left:pages.length%2?OUTER:INNER,ops:[]};pages.push(page);y=TOP;if(pages.length>1){const r=wrap(reference,CW,8,false)[0]||'';txt(r,page.left+CW,TOP-20,8,false,'right');}txt('Page '+pages.length,W/2,H-BOTTOM/2,10,false,'center');}
 function ensure(h){if(y+h>H-BOTTOM+0.01)newPage();}
 function paragraph(t,{size=14,bold=false,align='left',before=0,after=8,underline=false,keep=0}={}){
  const leading=size*1.5,lines=wrap(t,CW-2,size,bold);ensure(before+leading+keep);y+=before;
  for(let i=0;i<lines.length;i++){ensure(leading);const x=align==='center'?page.left+CW/2:page.left;txt(lines[i],x,y+size,size,bold,align==='justify'?'left':align,underline,align==='justify'&&i!==lines.length-1&&width(lines[i],size,bold)>CW*.72&&lines[i].split(' ').length>1?CW-2:0);y+=leading;}y+=after;
 }
 function table(el){
  const type=el.className,part=type.includes('particulars-table'),size=part?14:11,leading=size*(part?1.5:1.35),pad=6;
  const proportions=part?[.38,.62]:type.includes('hearing-chronology')?[.23,.35,.42]:type.includes('dates-table')?[.12,.29,.59]:type.includes('tasks-table')?[.12,.57,.31]:[.12,.88];const widths=proportions.map(x=>x*CW);
  const header=el.querySelector('thead tr');const rows=Array.from(el.querySelectorAll('tbody tr'));
  function rowData(tr){return Array.from(tr.cells).map((cell,i)=>({bold:cell.tagName==='TH',lines:wrap(elementText(cell),widths[i]-2*pad-2,size,cell.tagName==='TH')}));}
  function drawRow(data,start,count){const h=count*leading+2*pad;let x=page.left;data.forEach((cell,i)=>{rect(x,y,widths[i],h);for(let j=0;j<count;j++){const line=cell.lines[start+j];if(line!==undefined)txt(line,x+pad,y+pad+size+j*leading,size,cell.bold);}x+=widths[i];});y+=h;}
  const head=header?rowData(header):null,headLines=head?Math.max(...head.map(x=>x.lines.length)):0,headHeight=head?headLines*leading+2*pad:0;
  function repeat(){if(head)drawRow(head,0,headLines);}
  ensure(7+headHeight+leading+2*pad);y+=7;repeat();
  for(const tr of rows){const data=rowData(tr),n=Math.max(...data.map(x=>x.lines.length));let done=0;const full=n*leading+2*pad;
   if(full<=H-TOP-BOTTOM-headHeight&&y+full>H-BOTTOM){newPage();repeat();}
   while(done<n){let count=Math.floor((H-BOTTOM-y-2*pad)/leading+1e-7);if(count<1){newPage();repeat();count=Math.floor((H-BOTTOM-y-2*pad)/leading+1e-7);}if(count<1)throw Error('Table header is too large for the page.');count=Math.min(count,n-done);drawRow(data,done,count);done+=count;if(done<n){newPage();repeat();}}
  }y+=14;
 }
 newPage();const cause=parsed.querySelector('.cause-title');for(const el of cause.children){paragraph(el.classList.contains('court')?elementText(el).toUpperCase():elementText(el),{bold:el.classList.contains('court')||el.classList.contains('matter-title'),align:el.classList.contains('parties')?'left':'center',after:7});}
 paragraph(parsed.querySelector('h1').textContent,{bold:true,align:'center',underline:true,before:14,after:20,keep:30});
 for(const block of parsed.querySelectorAll('.legal-section')){for(const el of block.children){if(el.tagName==='H2')paragraph(elementText(el),{bold:true,before:12,after:8,keep:36});else if(el.tagName==='TABLE')table(el);else if(el.classList.contains('entry')){for(const child of el.children)paragraph(elementText(child),{size:child.classList.contains('minor')?11:14,bold:child.tagName==='H3',before:child.tagName==='H3'?8:0,keep:child.tagName==='H3'?25:0,align:child.classList.contains('legal-paragraph')?'justify':'left'});}else paragraph(elementText(el),{align:'justify'});}}
 paragraph(parsed.querySelector('.end-note').textContent,{size:10,align:'center',before:12});return pages;
}
const enc=new TextEncoder();
// Standard PDF fonts use WinAnsi. Unsupported scripts are rendered with the iPad's fonts
// on that page only, rather than silently substituting or dropping characters.
const extra='€\u0000‚ƒ„…†‡ˆ‰Š‹Œ\u0000Ž\u0000\u0000‘’“”•–—˜™š›œ\u0000žŸ';
function ansi(t){const a=[];for(const c of t){const n=c.codePointAt(0);if(n>=32&&n<=126||n>=160&&n<=255)a.push(n);else{const k=extra.indexOf(c);if(k<0||c==='\u0000')return null;a.push(128+k);}}return a;}
const num=n=>Number(n.toFixed(3)).toString();
function drawPage(page,scale=2){const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);const ctx=canvas.getContext('2d',{alpha:false});ctx.scale(canvas.width/W,canvas.height/H);ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='black';ctx.strokeStyle='black';ctx.lineWidth=.65;
 for(const o of page.ops){if(o.kind==='rect'){ctx.strokeRect(o.x,o.y,o.w,o.h);continue;}ctx.font=`${o.bold?'bold ':''}${o.size}px "Times New Roman", Times, serif`;ctx.textAlign=o.align;ctx.textBaseline='alphabetic';if(o.justify){let x=o.x;const words=o.t.split(' '),gap=(o.justify-words.reduce((s,t)=>s+ctx.measureText(t).width,0))/(words.length-1);for(const word of words){ctx.fillText(word,x,o.y);x+=ctx.measureText(word).width+gap;}}else ctx.fillText(o.t,o.x,o.y);if(o.underline){const w=ctx.measureText(o.t).width;const x=o.align==='center'?o.x-w/2:o.align==='right'?o.x-w:o.x;ctx.beginPath();ctx.moveTo(x,o.y+2);ctx.lineTo(x+w,o.y+2);ctx.stroke();}}
 return canvas;}
function jpeg(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Cannot render dossier page')),'image/jpeg',.96));}
function vectorContent(page){let s='0 g 0 G 0.65 w\n';for(const o of page.ops){if(o.kind==='rect'){s+=`${num(o.x)} ${num(H-o.y-o.h)} ${num(o.w)} ${num(o.h)} re S\n`;continue;}const w=width(o.t,o.size,o.bold),x=o.align==='center'?o.x-w/2:o.align==='right'?o.x-w:o.x;const space=o.justify?(o.justify-w)/(o.t.split(' ').length-1):0;const hex=ansi(o.t).map(v=>v.toString(16).padStart(2,'0')).join('');s+=`BT /${o.bold?'F2':'F1'} ${num(o.size)} Tf ${num(space)} Tw 1 0 0 1 ${num(x)} ${num(H-o.y)} Tm <${hex}> Tj ET\n`;if(o.underline)s+=`${num(x)} ${num(H-o.y-2)} m ${num(x+w)} ${num(H-o.y-2)} l S\n`; }return s;}
async function makePdf(pages){let length=0;const chunks=[],offsets=[0];let raster=0;const add=v=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.byteLength;};const obj=(n,fn)=>{offsets[n]=length;add(n+' 0 obj\n');fn();add('\nendobj\n');};const stream=(dict,bytes)=>{add(`<< ${dict} /Length ${bytes.byteLength} >>\nstream\n`);add(bytes);add('\nendstream');};
 add('%PDF-1.4\n');obj(1,()=>add('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>add('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>`${5+i*3} 0 R`).join(' ')+'] >>'));obj(3,()=>add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'));obj(4,()=>add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'));
 for(let i=0;i<pages.length;i++){const p=pages[i],n=5+i*3,needsRaster=p.ops.some(o=>o.kind==='text'&&!ansi(o.t));let content;
  if(needsRaster){raster++;const canvas=drawPage(p,3),blob=await jpeg(canvas),b=new Uint8Array(await blob.arrayBuffer()),w=canvas.width,h=canvas.height;canvas.width=canvas.height=0;obj(n,()=>add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /XObject << /Im ${n+2} 0 R >> >> /Contents ${n+1} 0 R >>`));content=`q ${num(W)} 0 0 ${num(H)} 0 0 cm /Im Do Q`;obj(n+1,()=>stream('',enc.encode(content)));obj(n+2,()=>stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,b));}
  else{obj(n,()=>add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n+1} 0 R >>`));obj(n+1,()=>stream('',enc.encode(vectorContent(p))));obj(n+2,()=>add('null'));}if(length>80*1024*1024)throw Error('Dossier PDF exceeds 80 MiB. Select fewer sections.');
 }
 const start=length;add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);const raw=new Uint8Array(length);let at=0;for(const c of chunks){raw.set(c,at);at+=c.byteLength;}return {raw,raster};
}
async function prepare(request){const response=await window.api.call('legal-print:record',request);if(!response.ok)throw Error(response.e||'Unable to read case');const pages=layout(response.d,request),result=await makePdf(pages);const name=String(response.d.c.number||response.d.c.title||'Case').replace(/[^a-zA-Z0-9 ._-]/g,'_').slice(0,65)||'Case';return {...result,pages,file:new File([result.raw],`${name}-Case-Dossier.pdf`,{type:'application/pdf'})};}
window.tarikhDossier={prepare,drawPage};
})();
