/* JennySells v0.11.3: lokaler Schnellverkauf per Original-Link */
(()=>{
'use strict';
const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const euro=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const today=()=>{const d=new Date(),f=n=>String(n).padStart(2,'0');return [d.getFullYear(),f(d.getMonth()+1),f(d.getDate())].join('-');};
const track=/^(utm_|fbclid$|gclid$|msclkid$|ref$|referrer$|source$|share$|share_id$|tracking|campaign$|from$|session|_gl$|si$)/i;
let matched=null,busy=false,count=0,photo='',photoSeq=0,priorFocus=null;
function extractUrl(text){
 let v=String(text||'').trim();
 const find=v.match(/https?:\/\/[^\s<>"'\x60]+/i);
 if(find)v=find[0];
 else if(/^(?:www\.|(?:m\.)?(?:vinted|kleinanzeigen|ebay)\.)/i.test(v))v='https://'+v;
 v=v.replace(/[)\]}\u201d,.!?;]+$/,'');
 try{const u=new URL(v);if(!/^https?:$/.test(u.protocol)||!u.hostname||u.username||u.password)return null;return u;}catch{return null;}
}
function canonicalKey(raw){
 const u=extractUrl(raw);if(!u)return '';
 const host=u.hostname.toLowerCase().replace(/^(?:www|m|mobile)\./,'');
 let path;
 try{path=decodeURI(u.pathname);}catch{path=u.pathname;}
 path=path.replace(/\/+/g,'/').replace(/\/$/,'').toLowerCase()||'/';
 let m;
 if(/(^|\.)vinted\.[a-z.]+$/.test(host)){
  m=path.match(/\/items\/(\d{4,})(?:-|\/|$)/);
  if(m)return 'vinted:item:'+m[1];
 }
 if(/(^|\.)ebay\.[a-z.]+$/.test(host)){
  m=path.match(/\/itm\/(?:[^/]+\/)?(\d{8,16})(?:\/|$)/);
  if(m)return 'ebay:item:'+m[1];
 }
 if(host==='kleinanzeigen.de'||host==='ebay-kleinanzeigen.de'){
  m=path.match(/\/(\d{5,}-\d+-\d+)(?:\/|$)/);
  if(m)return 'kleinanzeigen:item:'+m[1];
 }
 const params=[];
 u.searchParams.forEach((v,k)=>{if(!track.test(k))params.push([k.toLowerCase(),v]);});
 params.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
 return host+path+(params.length?'?'+new URLSearchParams(params).toString():'');
}
function resolveLink(raw,all){
 const key=canonicalKey(raw);
 if(!key)return {kind:'invalid'};
 const matches=all.filter(i=>i&&i.url&&canonicalKey(i.url)===key);
 if(!matches.length)return {kind:'missing'};
 if(matches.length>1)return {kind:'ambiguous',results:matches};
 return matches[0].status==='sold'?{kind:'already-sold',item:matches[0]}:{kind:'match',item:matches[0]};
}
function parsePrice(raw){
 let v=String(raw??'').trim().replace(/\s|\u00a0|€/g,'');
 if(!v)return null;
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(v))v=v.replace(/\./g,'').replace(',','.');
 else if(/^\d+(?:[,.]\d{1,2})?$/.test(v))v=v.replace(',','.');
 else return null;
 const n=Number(v);
 return Number.isFinite(n)&&n>=0&&n<=1e6?Math.round(n*100)/100:null;
}
function validDate(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [y,m,d]=s.split('-').map(Number),check=new Date(y,m-1,d);
 return check.getFullYear()===y&&check.getMonth()+1===m&&check.getDate()===d&&s<=today();
}
function list(){return typeof items!=='undefined'&&Array.isArray(items)?items:[];}
function message(t,error=false){const e=q('#jsQSMessage');e.textContent=t;e.hidden=!t;e.classList.toggle('jsQSError',error);}
function clearPhoto(){
 photoSeq++;
 if(photo){URL.revokeObjectURL(photo);photo='';}
 const img=q('#jsQSThumb');if(img){img.hidden=true;img.removeAttribute('src');}
}
async function showPhoto(key){
 const seq=++photoSeq;if(!key||!('indexedDB' in window))return;
 let db;
 try{
  db=await new Promise((res,rej)=>{const req=indexedDB.open('JennySellsDB',2);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});
  const blob=await new Promise((res,rej)=>{const req=db.transaction('images','readonly').objectStore('images').get(key);req.onsuccess=()=>res(req.result?.blob);req.onerror=()=>rej(req.error);});
  if(!blob||seq!==photoSeq||q('#jsQuickSale').hidden)return;
  if(photo)URL.revokeObjectURL(photo);
  photo=URL.createObjectURL(blob);
  q('#jsQSThumb').src=photo;q('#jsQSThumb').hidden=false;q('#jsQSFallback').hidden=true;
 }catch(e){console.warn('Schnellverkauf Titelbild:',e);}
 finally{db?.close();}
}
function phase(which){q('#jsQSSearch').hidden=which!=='search';q('#jsQSForm').hidden=which!=='form';}
function reset(next=false){
 matched=null;clearPhoto();phase('search');
 q('#jsQSLink').value='';q('#jsQSSoldPrice').value='';q('#jsQSSoldDate').value=today();
 q('#jsQSFormError').textContent='';q('#jsQSFallback').hidden=false;
 if(!next)message('');
 q('#jsQSLink').focus();
}
function open(){
 if(!window.JennySellsData?.getStatus?.().ready){alert('Die lokale Datenbank ist noch nicht bereit. Bitte die App erneut öffnen.');return;}
 priorFocus=document.activeElement;count=0;busy=false;
 q('#jsQSCounter').textContent='';q('#jsQuickSale').hidden=false;
 document.body.classList.add('jsOverlayOpen');reset();
}
function close(){
 if(busy)return;
 q('#jsQuickSale').hidden=true;document.body.classList.remove('jsOverlayOpen');
 matched=null;clearPhoto();
 if(priorFocus?.isConnected)priorFocus.focus();
}
function lookup(){
 if(busy)return;
 const raw=q('#jsQSLink').value;
 if(!raw.trim()){message('Bitte zuerst den Original-Link einfügen.',true);return;}
 const result=resolveLink(raw,list());
 if(result.kind==='invalid'){message('Ungültiger Link. Bitte einen vollständigen https://-Link einfügen.',true);return;}
 if(result.kind==='missing'){message('Kein Artikel mit diesem Link gespeichert. Bitte den Original-Link im Artikel prüfen.',true);return;}
 if(result.kind==='ambiguous'){message('Dieser Link ist '+result.results.length+' Artikeln zugeordnet. Bitte die doppelten Einträge in der Suche prüfen.',true);return;}
 if(result.kind==='already-sold'){message('„'+result.item.title+'“ ist bereits als verkauft gespeichert.',true);return;}
 const a=result.item;matched=a.id;
 q('#jsQSFoundTitle').textContent=a.title||'Artikel';
 q('#jsQSFoundMeta').textContent=[a.brand,a.size&&'Gr. '+a.size,a.source].filter(Boolean).join(' · ');
 q('#jsQSFoundAsking').textContent=a.price==null?'–':euro(a.price);
 q('#jsQSFoundStatus').textContent=(typeof statusLabel==='function'?statusLabel(a.status):a.status)||'Online';
 q('#jsQSFallback').textContent=a.emoji||'👕';q('#jsQSFallback').hidden=false;
 q('#jsQSSoldDate').value=today();q('#jsQSSoldPrice').value='';q('#jsQSFormError').textContent='';
 message('');phase('form');showPhoto(a.coverImageKey);q('#jsQSSoldPrice').focus();
}
async function save(next){
 if(busy||matched===null)return;
 const input=q('#jsQSSoldPrice'),date=q('#jsQSSoldDate').value,price=parsePrice(input.value),err=q('#jsQSFormError');
 err.textContent='';
 if(price===null){err.textContent='Bitte Verkaufspreis eingeben, z. B. 2,50.';input.focus();return;}
 if(!validDate(date)){err.textContent='Bitte ein gültiges Verkaufsdatum (heute oder früher) wählen.';q('#jsQSSoldDate').focus();return;}
 const ix=list().findIndex(i=>i.id===matched);
 if(ix<0){err.textContent='Artikel nicht gefunden. Link bitte erneut eingeben.';return;}
 const original=items[ix];
 if(original.status==='sold'){err.textContent='Dieser Artikel ist bereits verkauft. Keine Änderungen gespeichert.';return;}
 if(!window.JennySellsData?.getStatus?.().ready||typeof window.JennySellsData.queueSave!=='function'){
  err.textContent='Datenbank nicht bereit. Nichts gespeichert.';return;
 }
 busy=true;q('#jsQSSaveNext').disabled=true;q('#jsQSSaveClose').disabled=true;
 const updated={...original,status:'sold',soldPrice:price,soldDate:date};
 items[ix]=updated;
 try{
  await window.JennySellsData.queueSave(items);
  ++count;
  try{if(typeof refresh==='function')refresh();}catch(e){console.error('Schnellverkauf Ansicht:',e);}
  q('#jsQSCounter').textContent=count===1?'1 Verkauf gespeichert':count+' Verkäufe gespeichert';
  busy=false;q('#jsQSSaveNext').disabled=false;q('#jsQSSaveClose').disabled=false;
  if(next){reset(true);message('„'+updated.title+'“ als verkauft gespeichert. Nächsten Link einfügen.');}
  else close();
 }catch(e){
  items[ix]=original;busy=false;q('#jsQSSaveNext').disabled=false;q('#jsQSSaveClose').disabled=false;
  err.textContent='Speichern fehlgeschlagen: '+(e?.message||'Unbekannter Fehler')+'. Keine Änderung übernommen.';
 }
}
function mount(){
 if(q('#jsQuickSale')||!q('#sold'))return;
 const button=document.createElement('button');button.id='jsQSLaunch';button.type='button';
 button.innerHTML='<span class="jsQSLaunchIcon" aria-hidden="true">✓</span><span><b>Schnellverkauf</b><small>Per Original-Link finden & verkaufen</small></span><span class="jsQSLaunchArrow">›</span>';
 q('#sold .hero')?.insertAdjacentElement('afterend',button);
 const el=document.createElement('div');el.id='jsQuickSale';el.className='jsQSBackdrop';el.hidden=true;
 el.innerHTML=
 '<div class="jsQSSheet" role="dialog" aria-modal="true" aria-labelledby="jsQSTitle">'+
 '<header class="jsQSHeader"><button type="button" class="jsCircleBack" id="jsQSClose" aria-label="Zurück">‹</button><div><small>VERKAUFT</small><h2 id="jsQSTitle">Schnellverkauf</h2></div><span id="jsQSCounter" aria-live="polite"></span></header>'+
 '<div id="jsQSSearch"><p>Original-Link des verkauften Artikels einfügen. JennySells gleicht ihn ausschließlich mit den lokal gespeicherten Artikeln ab.</p>'+
 '<label for="jsQSLink">Original-Link</label><textarea id="jsQSLink" rows="2" placeholder="https://www.vinted.de/items/…" autocomplete="off" spellcheck="false"></textarea>'+
 '<button type="button" class="jsQSPrimary" id="jsQSFind">Artikel finden →</button>'+
 '<div class="jsQSMessage" id="jsQSMessage" role="status" aria-live="polite" hidden></div></div>'+
 '<form id="jsQSForm" hidden>'+
 '<div class="jsQSFound"><div class="jsQSFoundImg"><img id="jsQSThumb" alt="Titelbild" hidden><span id="jsQSFallback">👕</span></div>'+
 '<div class="jsQSFoundText"><strong id="jsQSFoundTitle"></strong><small id="jsQSFoundMeta"></small><span>Angebot: <b id="jsQSFoundAsking"></b> · <em id="jsQSFoundStatus"></em></span></div></div>'+
 '<div class="jsQSFields"><div><label for="jsQSSoldPrice">Verkaufspreis (€)</label><input id="jsQSSoldPrice" type="text" inputmode="decimal" placeholder="z. B. 2,50" autocomplete="off" required></div>'+
 '<div><label for="jsQSSoldDate">Verkaufsdatum</label><input id="jsQSSoldDate" type="date" required></div></div>'+
 '<div class="jsQSFormError" id="jsQSFormError" role="alert" aria-live="assertive"></div>'+
 '<button class="jsQSPrimary" id="jsQSSaveNext" type="submit">✓ Speichern & nächster Link</button>'+
 '<button class="jsQSSecondary" id="jsQSSaveClose" type="button">Speichern & schließen</button>'+
 '<button class="jsQSText" id="jsQSChangeLink" type="button">‹ Anderen Link eingeben</button></form></div>';
 document.body.appendChild(el);
 button.onclick=open;q('#jsQSClose').onclick=close;q('#jsQSFind').onclick=lookup;
 q('#jsQSChangeLink').onclick=()=>reset();
 q('#jsQSForm').onsubmit=e=>{e.preventDefault();save(true);};
 q('#jsQSSaveClose').onclick=()=>save(false);
 el.addEventListener('click',e=>{if(e.target===el)close();});
 document.addEventListener('keydown',e=>{
  if(el.hidden)return;
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='Enter'&&!q('#jsQSSearch').hidden&&document.activeElement===q('#jsQSLink')){e.preventDefault();lookup();}
 });
}
window.JennySellsQuickSale={canonicalKey,resolveLink,parsePrice,validDate};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();