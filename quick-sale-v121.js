/* JennySells v0.11.4: Einzel- und Paket-Schnellverkauf über lokale Original-Links */
(()=>{
'use strict';
const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const euro=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const today=()=>{const d=new Date(),f=n=>String(n).padStart(2,'0');return [d.getFullYear(),f(d.getMonth()+1),f(d.getDate())].join('-');};
const track=/^(utm_|fbclid$|gclid$|msclkid$|ref$|referrer$|source$|share$|share_id$|tracking|campaign$|from$|session|_gl$|si$)/i;
let matched=null,busy=false,count=0,photo='',photoSeq=0,priorFocus=null;
let currentStep='type',packageReferences=[],packageLinkCount=0,packageDraftPrice='',packageDraftDate='';
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

const STEPS=['type','single-search','single-form','package-count','package-links','package-form'];
const MIN_PACKAGE_ITEMS=2,MAX_PACKAGE_ITEMS=50;
function note(id,messageText,error=false){
 const el=q('#'+id);if(!el)return;
 el.textContent=messageText||'';
 el.hidden=!messageText;
 el.classList.toggle('jsQSError',!!error);
}
function step(target,focus=true){
 if(!STEPS.includes(target))throw new Error('Unbekannter Verkaufsschritt');
 currentStep=target;
 STEPS.forEach(name=>{
  const el=q('#jsQSStep-'+name);
  if(el)el.hidden=name!==target;
 });
 if(focus){
  const selectors={
   'type':'#jsQSChoiceSingle','single-search':'#jsQSLink','single-form':'#jsQSSoldPrice',
   'package-count':'#jsQSPackageCount','package-links':'#jsQSPackageLinks input',
   'package-form':'#jsQSPackagePrice'
  };
  q(selectors[target])?.focus({preventScroll:true});
 }
 const area=q('.jsQSSheet');
 if(area)area.scrollTop=0;
}
function resetSaleFlow(success=''){
 matched=null;packageReferences=[];packageLinkCount=0;packageDraftPrice='';packageDraftDate='';
 q('#jsQSPackageLinkFields')?.replaceChildren();
 clearPhoto();
 q('#jsQSLink').value='';
 q('#jsQSSoldPrice').value='';
 q('#jsQSSoldDate').value=today();
 q('#jsQSFormError').textContent='';
 note('jsQSMessage','');
 note('jsQSPackageCountError','');
 note('jsQSPackageLinkError','');
 note('jsQSPackageFormError','');
 note('jsQSChoiceMessage',success);
 step('type');
}
function open(){
 if(!window.JennySellsData?.getStatus?.().ready){
  alert('Die lokale Datenbank ist noch nicht bereit. Bitte die App erneut öffnen.');return;
 }
 priorFocus=document.activeElement;count=0;busy=false;
 q('#jsQSCounter').textContent='';
 q('#jsQuickSale').hidden=false;
 document.body.classList.add('jsOverlayOpen');
 resetSaleFlow();
}
function close(){
 if(busy)return;
 q('#jsQuickSale').hidden=true;
 document.body.classList.remove('jsOverlayOpen');
 matched=null;packageReferences=[];clearPhoto();
 if(priorFocus?.isConnected)priorFocus.focus();
}
function chooseSaleType(type){
 note('jsQSChoiceMessage','');
 if(type==='single'){
  matched=null;
  q('#jsQSLink').value='';
  q('#jsQSSoldPrice').value='';
  q('#jsQSSoldDate').value=today();
  note('jsQSMessage','');
  step('single-search');
 }else if(type==='package'){
  packageReferences=[];
  q('#jsQSPackageCount').value=packageLinkCount||5;
  note('jsQSPackageCountError','');
  step('package-count');
 }
}
function goBack(){
 if(busy)return;
 switch(currentStep){
  case 'type':close();break;
  case 'single-search':resetSaleFlow();break;
  case 'single-form':
   matched=null;clearPhoto();step('single-search');break;
  case 'package-count':resetSaleFlow();break;
  case 'package-links':packageReferences=[];step('package-count');break;
  case 'package-form':
   packageDraftPrice=q('#jsQSPackagePrice').value;
   packageDraftDate=q('#jsQSPackageDate').value;
   packageReferences=[];
   step('package-links');break;
 }
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
 const item=result.item;matched=item.id;
 q('#jsQSFoundTitle').textContent=item.title||'Artikel';
 q('#jsQSFoundMeta').textContent=[item.brand,item.size&&'Gr. '+item.size,item.source].filter(Boolean).join(' · ');
 q('#jsQSFoundAsking').textContent=item.price==null?'–':euro(item.price);
 q('#jsQSFoundStatus').textContent=(typeof statusLabel==='function'?statusLabel(item.status):item.status)||'Online';
 q('#jsQSFallback').textContent=item.emoji||'👕';q('#jsQSFallback').hidden=false;
 q('#jsQSSoldDate').value=today();q('#jsQSSoldPrice').value='';
 q('#jsQSFormError').textContent='';
 message('');step('single-form');showPhoto(item.coverImageKey);
}
async function saveSingle(next){
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
 busy=true;toggleSaveButtons(true);
 // Single article continues to use the established sale format and existing statistics.
 const updated={...original,status:'sold',soldPrice:price,soldDate:date,saleType:'single'};
 items[ix]=updated;
 try{
  await window.JennySellsData.queueSave(items);
  count++;
  refreshSafely();
  busy=false;toggleSaveButtons(false);
  if(next)resetSaleFlow('„'+updated.title+'“ verkauft. Einzelartikel oder neues Paket wählen.');
  else close();
  setCounter();
 }catch(e){
  items[ix]=original;busy=false;toggleSaveButtons(false);
  err.textContent='Speichern fehlgeschlagen: '+(e?.message||'Unbekannter Fehler')+'. Keine Änderung übernommen.';
 }
}
function toggleSaveButtons(disabled){
 ['jsQSSaveNext','jsQSSaveClose','jsQSPackageSaveNext','jsQSPackageSaveClose'].forEach(id=>{
  const b=q('#'+id);if(b)b.disabled=disabled;
 });
}
function setCounter(){
 const el=q('#jsQSCounter');
 if(el)el.textContent=count===1?'1 Verkauf gespeichert':count+' Verkäufe gespeichert';
}
function refreshSafely(){
 try{if(typeof refresh==='function')refresh();}
 catch(e){console.error('Schnellverkauf: Ansicht konnte nicht aktualisiert werden',e);}
}
function packageCountNext(){
 const raw=q('#jsQSPackageCount').value.trim();
 const n=Number(raw);
 if(!/^\d+$/.test(raw)||!Number.isInteger(n)||n<MIN_PACKAGE_ITEMS||n>MAX_PACKAGE_ITEMS){
  note('jsQSPackageCountError','Bitte zwischen 2 und 50 Artikel eingeben.',true);return;
 }
 note('jsQSPackageCountError','');
 if(packageLinkCount!==n){
  packageDraftPrice='';packageDraftDate='';
 }
 packageLinkCount=n;
 createPackageLinks(n);
 step('package-links');
}
function createPackageLinks(n){
 const region=q('#jsQSPackageLinkFields');
 const values=[...region.querySelectorAll('input')].map(el=>el.value);
 region.replaceChildren();
 for(let index=0;index<n;index++){
  const row=document.createElement('div');
  row.className='jsQSPackageLinkRow';
  const label=document.createElement('label');
  const input=document.createElement('input');
  input.id='jsQSPackageLink'+index;
  input.type='url';input.inputMode='url';input.autocomplete='off';
  input.spellcheck=false;
  input.placeholder='Vinted- oder anderer Artikellink …';
  input.value=values[index]||'';
  label.htmlFor=input.id;
  label.textContent='Artikel '+(index+1);
  const status=document.createElement('small');status.className='jsQSPackageLinkStatus';
  status.setAttribute('aria-live','polite');
  row.append(label,input,status);
  region.append(row);
 }
 q('#jsQSPackageLinkLead').textContent='Genau '+n+' verschiedene Original-Links einfügen.';
 note('jsQSPackageLinkError','');
}
function validatePackageLinks(){
 const inputs=[...q('#jsQSPackageLinkFields').querySelectorAll('input')];
 const selected=[],usedIds=new Set(),usedKeys=new Set();
 let firstError=null,firstInvalid=null;
 inputs.forEach((input,index)=>{
  const status=input.parentElement.querySelector('.jsQSPackageLinkStatus');
  status.textContent='';input.classList.remove('jsQSInvalid');
  const raw=input.value.trim(),key=canonicalKey(raw);
  let issue='';
  if(!raw)issue='Link fehlt.';
  else if(!key)issue='Kein gültiger Link.';
  else if(usedKeys.has(key))issue='Dieser Link wurde bereits eingegeben.';
  else{
   const result=resolveLink(raw,list());
   if(result.kind==='invalid')issue='Ungültiger Link.';
   else if(result.kind==='missing')issue='Kein gespeicherter Artikel zu diesem Link.';
   else if(result.kind==='ambiguous')issue='Link gehört zu mehreren gespeicherten Artikeln.';
   else if(result.kind==='already-sold')issue='Dieser Artikel ist bereits verkauft.';
   else if(usedIds.has(result.item.id))issue='Dieser Artikel wurde bereits ausgewählt.';
   else if(result.kind==='match'){
    const price=Number(result.item.price);
    if(result.item.price===null||result.item.price===undefined||!Number.isFinite(price)||price<0)
     issue='Angebotspreis fehlt oder ist ungültig. Bitte zuerst im Artikel ergänzen.';
    else selected.push({id:result.item.id,key});
   }
  }
  if(issue){
   input.classList.add('jsQSInvalid');status.textContent=issue;
   if(!firstError){firstError='Artikel '+(index+1)+': '+issue;firstInvalid=input;}
  }else{
   usedKeys.add(key);usedIds.add(selected[selected.length-1].id);
   const article=selected[selected.length-1];
   const item=list().find(x=>x.id===article.id);
   status.textContent='✓ '+(item?.title||'Artikel')+' · '+euro(item?.price);
  }
 });
 if(firstError){
  packageReferences=[];
  note('jsQSPackageLinkError','Bitte die markierten Links korrigieren. Es wurde nichts geändert.',true);
  firstInvalid?.focus();return false;
 }
 if(selected.length!==packageLinkCount){
  note('jsQSPackageLinkError','Alle '+packageLinkCount+' Links müssen eindeutig zugeordnet sein.',true);
  packageReferences=[];return false;
 }
 const totalCents=selected.reduce((sum,entry)=>{
  const item=list().find(i=>i.id===entry.id);
  return sum+Math.round(Number(item.price)*100);
 },0);
 if(!Number.isSafeInteger(totalCents)||totalCents<=0){
  note('jsQSPackageLinkError','Die Summe der Angebotspreise muss größer als 0 € sein. Bitte Artikelpreise prüfen.',true);
  packageReferences=[];return false;
 }
 packageReferences=selected;
 note('jsQSPackageLinkError','');
 q('#jsQSPackagePrice').value=packageDraftPrice;
 q('#jsQSPackageDate').value=packageDraftDate||today();
 populatePackageSummary();
 step('package-form');
 return true;
}
function currentPackage(){
 if(packageReferences.length!==packageLinkCount||packageLinkCount<MIN_PACKAGE_ITEMS)return {error:'Artikel-Links bitte erneut prüfen.'};
 const used=new Set(),entries=[];
 for(const reference of packageReferences){
  const item=list().find(i=>i.id===reference.id);
  if(!item||canonicalKey(item.url)!==reference.key)return {error:'Ein Artikel-Link hat sich geändert. Bitte Links erneut prüfen.'};
  if(item.status==='sold')return {error:'„'+item.title+'“ ist bereits verkauft. Bitte Links erneut prüfen.'};
  if(used.has(item.id))return {error:'Ein Artikel wurde doppelt ausgewählt.'};
  used.add(item.id);
  if(item.price===null||item.price===undefined||!Number.isFinite(Number(item.price))||Number(item.price)<0)return {error:'Bei „'+item.title+'“ fehlt der gültige Angebotspreis.'};
  const cents=Math.round(Number(item.price)*100);
  if(!Number.isSafeInteger(cents))return {error:'Angebotspreis ist zu groß.'};
  entries.push({item,weight:cents,key:reference.key});
 }
 const sum=entries.reduce((total,entry)=>total+entry.weight,0);
 if(!Number.isSafeInteger(sum)||sum<=0)return {error:'Die Angebotspreissumme muss größer als 0 € sein.'};
 return {entries,sum};
}
// Largest remainder allocation with integer cent values: always exactly the package total.
function allocateCents(totalCents,weights){
 if(!Number.isSafeInteger(totalCents)||totalCents<0||weights.some(w=>!Number.isSafeInteger(w)||w<0))throw new Error('Ungültige Cent-Beträge');
 const weightSum=weights.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(weightSum)||weightSum<=0)throw new Error('Angebotspreissumme muss größer als 0 sein');
 const sum=BigInt(weightSum),total=BigInt(totalCents);
 const parts=weights.map((weight,index)=>{
  const product=BigInt(weight)*total;
  return {index,cents:Number(product/sum),remainder:product%sum};
 });
 let rest=totalCents-parts.reduce((a,b)=>a+b.cents,0);
 const ordered=[...parts].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
 for(let i=0;i<rest;i++)ordered[i].cents++;
 return parts.map(part=>part.cents);
}
function packageCalculation(){
 const selected=currentPackage();
 if(selected.error)return selected;
 const price=parsePrice(q('#jsQSPackagePrice').value);
 if(price===null)return {error:'Bitte einen gültigen Gesamtverkaufspreis eingeben.'};
 const cents=Math.round(price*100);
 if(!Number.isSafeInteger(cents))return {error:'Paketpreis ist zu hoch.'};
 const splits=allocateCents(cents,selected.entries.map(x=>x.weight));
 return {...selected,price,totalCents:cents,splits};
}
function populatePackageSummary(){
 const result=currentPackage(),summary=q('#jsQSPackageRecap');
 if(result.error){note('jsQSPackageFormError',result.error,true);summary.textContent='';return;}
 const original=euro(result.sum/100);
 q('#jsQSPackageOriginal').textContent=original;
 q('#jsQSPackageArticleCount').textContent=result.entries.length+' Artikel';
 summary.innerHTML=result.entries.map((entry,index)=>
  '<div class="jsQSPackageReviewRow"><span>'+esc((index+1)+'. '+(entry.item.title||'Artikel'))+'</span><strong>'+euro(entry.weight/100)+'</strong></div>'
 ).join('');
 renderAllocationPreview();
}
function renderAllocationPreview(){
 const output=q('#jsQSPackagePreview');
 const raw=q('#jsQSPackagePrice').value.trim();
 if(!raw){output.textContent='Gesamtverkaufspreis eingeben. Die anteiligen Einzelpreise werden automatisch berechnet.';return;}
 const result=packageCalculation();
 if(result.error){output.textContent=result.error;return;}
 const percentage=(100*result.totalCents/result.sum).toLocaleString('de-DE',{maximumFractionDigits:2});
 output.innerHTML='<div class="jsQSPackagePreviewTop"><span>Anteilige Aufteilung</span><b>'+esc(percentage)+' % der Angebotspreise</b></div>'+
  result.entries.map((entry,index)=>
    '<div class="jsQSPackagePreviewRow"><span>'+esc(entry.item.title||'Artikel')+'</span>'+
    '<strong>'+euro(result.splits[index]/100)+'</strong></div>'
  ).join('')+
  '<div class="jsQSPackagePreviewTotal"><span>Gesamterlös</span><strong>'+euro(result.splits.reduce((a,b)=>a+b,0)/100)+'</strong></div>';
}
function packageIdentifier(){
 if(window.crypto?.randomUUID)return 'JS-PKT-'+window.crypto.randomUUID();
 return 'JS-PKT-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
}
async function savePackage(next){
 if(busy)return;
 const err=q('#jsQSPackageFormError');err.textContent='';
 const calc=packageCalculation(),date=q('#jsQSPackageDate').value;
 if(calc.error){err.textContent=calc.error;return;}
 if(!validDate(date)){err.textContent='Bitte ein gültiges Verkaufsdatum (heute oder früher) wählen.';q('#jsQSPackageDate').focus();return;}
 if(!window.JennySellsData?.getStatus?.().ready||typeof window.JennySellsData.queueSave!=='function'){
  err.textContent='Datenbank nicht bereit. Es wurde nichts gespeichert.';return;
 }
 const ids=new Set(calc.entries.map(x=>x.item.id));
 const previous=list().map(i=>i); // rollback is scoped to this transaction
 const pkgId=packageIdentifier(),price=calc.totalCents/100,originalTotal=calc.sum/100;
 const mapping=new Map(calc.entries.map((entry,index)=>[
  entry.item.id,{
   ...entry.item,
   status:'sold',soldPrice:calc.splits[index]/100,soldDate:date,
   shipping:0,fees:0,
   saleType:'package',soldInPackage:true,
   packageId:pkgId,packageTotalPrice:price,
   packageOriginalTotal:originalTotal,packageItemCount:calc.entries.length,
   packageItemIndex:index+1
  }
 ]));
 busy=true;toggleSaveButtons(true);
 items=items.map(item=>mapping.get(item.id)||item);
 try{
  await window.JennySellsData.queueSave(items);
  count++;
  refreshSafely();
  busy=false;toggleSaveButtons(false);
  if(next)resetSaleFlow('Paket mit '+ids.size+' Artikeln für '+euro(price)+' gespeichert. Nächste Verkaufsart wählen.');
  else close();
  setCounter();
 }catch(e){
  items=previous;
  busy=false;toggleSaveButtons(false);
  err.textContent='Paket konnte nicht gespeichert werden: '+(e?.message||'Unbekannter Fehler')+'. Kein Teilverkauf übernommen.';
 }
}
function install(){
 if(q('#jsQuickSale')||!q('#sold'))return;
 const button=document.createElement('button');button.id='jsQSLaunch';button.type='button';
 button.innerHTML='<span class="jsQSLaunchIcon" aria-hidden="true">✓</span><span><b>Schnellverkauf</b><small>Einzelartikel oder ganzes Paket verkaufen</small></span><span class="jsQSLaunchArrow">›</span>';
 q('#sold .hero')?.insertAdjacentElement('afterend',button);
 const el=document.createElement('div');el.id='jsQuickSale';el.className='jsQSBackdrop';el.hidden=true;
 el.innerHTML=
 '<div class="jsQSSheet" role="dialog" aria-modal="true" aria-labelledby="jsQSTitle">'+
 '<header class="jsQSHeader"><button type="button" class="jsCircleBack" id="jsQSClose" aria-label="Zurück">‹</button>'+
  '<div><small>VERKAUFT</small><h2 id="jsQSTitle">Schnellverkauf</h2></div><span id="jsQSCounter" aria-live="polite"></span></header>'+
 '<div id="jsQSStep-type"><p class="jsQSIntro">Wie wurde verkauft?</p>'+
  '<button type="button" class="jsQSTypeOption" id="jsQSChoiceSingle"><span class="jsQSOptionIcon">♡</span><span><b>Einzelartikel</b><small>Einen Artikel per Link finden und verkaufen</small></span><span aria-hidden="true">›</span></button>'+
  '<button type="button" class="jsQSTypeOption" id="jsQSChoicePackage"><span class="jsQSOptionIcon">▣</span><span><b>Paketverkauf</b><small>Mehrere Artikel mit einem Gesamtpreis verkaufen</small></span><span aria-hidden="true">›</span></button>'+
  '<div class="jsQSMessage" id="jsQSChoiceMessage" role="status" aria-live="polite" hidden></div></div>'+
 '<div id="jsQSStep-single-search" hidden><p class="jsQSIntro">Original-Link des verkauften Artikels eingeben. Der Abgleich findet nur in JennySells statt.</p>'+
  '<label for="jsQSLink">Original-Link</label><textarea id="jsQSLink" rows="2" placeholder="https://www.vinted.de/items/…" autocomplete="off" spellcheck="false"></textarea>'+
  '<button type="button" class="jsQSPrimary" id="jsQSFind">Artikel finden →</button>'+
  '<div class="jsQSMessage" id="jsQSMessage" role="status" aria-live="polite" hidden></div></div>'+
 '<form id="jsQSStep-single-form" hidden>'+
  '<div class="jsQSFound"><div class="jsQSFoundImg"><img id="jsQSThumb" alt="Titelbild" hidden><span id="jsQSFallback">👕</span></div>'+
  '<div class="jsQSFoundText"><strong id="jsQSFoundTitle"></strong><small id="jsQSFoundMeta"></small><span>Angebot: <b id="jsQSFoundAsking"></b> · <em id="jsQSFoundStatus"></em></span></div></div>'+
  '<div class="jsQSFields"><div><label for="jsQSSoldPrice">Verkaufspreis (€)</label><input id="jsQSSoldPrice" type="text" inputmode="decimal" placeholder="z. B. 2,50" autocomplete="off"></div>'+
  '<div><label for="jsQSSoldDate">Verkaufsdatum</label><input id="jsQSSoldDate" type="date"></div></div>'+
  '<div class="jsQSFormError" id="jsQSFormError" role="alert" aria-live="assertive"></div>'+
  '<button class="jsQSPrimary" id="jsQSSaveNext" type="submit">✓ Speichern & weiter</button>'+
  '<button class="jsQSSecondary" id="jsQSSaveClose" type="button">Speichern & schließen</button>'+
  '<button class="jsQSText" id="jsQSChangeLink" type="button">‹ Anderen Link eingeben</button></form>'+
 '<div id="jsQSStep-package-count" hidden>'+
  '<p class="jsQSIntro">Wie viele unterschiedliche Artikel wurden zusammen verkauft?</p>'+
  '<label for="jsQSPackageCount">Artikel im Paket (2–50)</label>'+
  '<input id="jsQSPackageCount" type="number" min="2" max="50" step="1" inputmode="numeric" value="5">'+
  '<div class="jsQSFormError" id="jsQSPackageCountError" role="alert" aria-live="assertive" hidden></div>'+
  '<button type="button" class="jsQSPrimary" id="jsQSPackageCountNext">Weiter zu den Artikellinks →</button></div>'+
 '<div id="jsQSStep-package-links" hidden><p class="jsQSIntro" id="jsQSPackageLinkLead"></p>'+
  '<div id="jsQSPackageLinkFields"></div>'+
  '<div class="jsQSFormError" id="jsQSPackageLinkError" role="alert" aria-live="assertive" hidden></div>'+
  '<button type="button" class="jsQSPrimary" id="jsQSPackageCheck">Alle Links prüfen →</button></div>'+
 '<form id="jsQSStep-package-form" hidden>'+
  '<div class="jsQSPackageSummaryHeader"><b id="jsQSPackageArticleCount"></b><span>Summe Angebotspreise: <strong id="jsQSPackageOriginal"></strong></span></div>'+
  '<details class="jsQSPackageDetails"><summary>Ausgewählte Artikel ansehen</summary><div id="jsQSPackageRecap"></div></details>'+
  '<div class="jsQSFields"><div><label for="jsQSPackagePrice">Gesamtverkaufspreis (€)</label>'+
  '<input id="jsQSPackagePrice" type="text" inputmode="decimal" placeholder="z. B. 40,00" autocomplete="off"></div>'+
  '<div><label for="jsQSPackageDate">Verkaufsdatum</label><input id="jsQSPackageDate" type="date"></div></div>'+
  '<div class="jsQSPackagePreview" id="jsQSPackagePreview" aria-live="polite"></div>'+
  '<div class="jsQSFormError" id="jsQSPackageFormError" role="alert" aria-live="assertive"></div>'+
  '<button type="submit" class="jsQSPrimary" id="jsQSPackageSaveNext">✓ Paket speichern & weiter</button>'+
  '<button type="button" class="jsQSSecondary" id="jsQSPackageSaveClose">Paket speichern & schließen</button>'+
  '<button type="button" class="jsQSText" id="jsQSPackageEditLinks">‹ Artikellinks korrigieren</button>'+
 '</form></div>';
 document.body.appendChild(el);
 button.onclick=open;
 q('#jsQSClose').onclick=goBack;
 q('#jsQSChoiceSingle').onclick=()=>chooseSaleType('single');
 q('#jsQSChoicePackage').onclick=()=>chooseSaleType('package');
 q('#jsQSFind').onclick=lookup;
 q('#jsQSChangeLink').onclick=()=>{matched=null;clearPhoto();step('single-search');};
 q('#jsQSStep-single-form').onsubmit=e=>{e.preventDefault();saveSingle(true);};
 q('#jsQSSaveClose').onclick=()=>saveSingle(false);
 q('#jsQSPackageCountNext').onclick=packageCountNext;
 q('#jsQSPackageCount').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();packageCountNext();}});
 q('#jsQSPackageCheck').onclick=validatePackageLinks;
 q('#jsQSPackagePrice').addEventListener('input',renderAllocationPreview);
 q('#jsQSStep-package-form').onsubmit=e=>{e.preventDefault();savePackage(true);};
 q('#jsQSPackageSaveClose').onclick=()=>savePackage(false);
 q('#jsQSPackageEditLinks').onclick=()=>{packageReferences=[];step('package-links');};
 el.addEventListener('click',e=>{if(e.target===el)close();});
 document.addEventListener('keydown',e=>{
  if(el.hidden)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();goBack();return;}
  if(e.key==='Enter'&&currentStep==='single-search'&&document.activeElement===q('#jsQSLink')){
   e.preventDefault();lookup();
  }
 });
}
window.JennySellsQuickSale={canonicalKey,resolveLink,parsePrice,validDate,allocateCents};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();