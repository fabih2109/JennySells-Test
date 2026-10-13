(()=>{
  const VERSION='0.10.2-test';
  const DB_NAME='JennySellsDB';
  const DB_VERSION=1;
  const IMAGE_STORE='images';
  let sourceFiles=[];
  let smartCrops=[];
  let cropPromise=Promise.resolve();
  let ocrWorker=null;
  let ocrSuggestion=null;
  let tesseractPromise=null;
  let lastOcrText='';

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function addStyles(){
    if(q('#jsV102Style'))return;
    const s=document.createElement('style');
    s.id='jsV102Style';
    s.textContent=`
      .jsSmartBox{margin-top:9px;padding:10px;border:1px solid #e6d9eb;border-radius:14px;background:#fff}
      .jsSmartBox.hidden{display:none}.jsSmartTitle{font-size:11px;font-weight:900;color:#5d4369;margin-bottom:6px}
      .jsSmartText{font-size:9.5px;line-height:1.4;color:#817486;margin:5px 0 8px}
      .jsSmartProgress{font-size:10px;border-radius:11px;padding:8px;background:#f5edf7;color:#704289;margin-top:8px}
      .jsSmartProgress.ok{background:#edf8f1;color:#277147}.jsSmartProgress.warn{background:#fff4e5;color:#8d621f}
      .jsSmartResult{display:grid;grid-template-columns:1fr auto;gap:5px 9px;margin-top:8px;padding:9px;border-radius:11px;background:#faf6fb;font-size:10px}
      .jsSmartResult b{color:#5b4563}.jsSmartResult span{text-align:right;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .jsSmartNote{font-size:9px;color:#8b7c90;margin-top:7px;line-height:1.35}
    `;
    document.head.appendChild(s);
  }

  function ensureUi(){
    const status=q('#jsShotStatus');
    if(!status || q('#jsSmartBox'))return;
    const box=document.createElement('div');
    box.id='jsSmartBox';
    box.className='jsSmartBox hidden';
    box.innerHTML=`
      <div class="jsSmartTitle">✨ Automatische Erkennung · v0.10.2</div>
      <div class="jsSmartText">JennySells erstellt parallel einen plattformabhängigen Titelbild-Zuschnitt. Optional kann die App Titel, Preis und Größe direkt auf dem Gerät aus den Screenshots lesen.</div>
      <button class="jsImportBtn" id="jsRunOcr" type="button">🔎 Titel & Preis erkennen</button>
      <div class="jsSmartProgress warn" id="jsSmartProgress">Screenshots auswählen, dann Erkennung starten.</div>
      <div class="jsSmartResult hidden" id="jsSmartResult"></div>
      <div class="jsSmartNote">OCR läuft lokal im Browser. Beim ersten Start werden die Texterkennungs-Komponenten geladen; es wird kein kostenpflichtiger KI-Dienst benötigt.</div>`;
    status.insertAdjacentElement('afterend',box);
    q('#jsRunOcr').addEventListener('click',runOcr);

    const input=q('#jsShotInput');
    if(input && !input.dataset.v102){
      input.dataset.v102='1';
      input.addEventListener('change',e=>captureFiles(e.target.files));
    }
    const launch=q('#marketImportLaunch');
    if(launch && !launch.dataset.v102){
      launch.dataset.v102='1';
      launch.addEventListener('click',resetSmartState);
    }
    const cont=q('#jsContinueImport');
    if(cont && !cont.dataset.v102){
      cont.dataset.v102='1';
      cont.addEventListener('click',()=>setTimeout(()=>applyEnhancementsToEditor(),80));
    }
  }

  function resetSmartState(){
    sourceFiles=[];
    smartCrops=[];
    cropPromise=Promise.resolve();
    ocrSuggestion=null;
    lastOcrText='';
    const box=q('#jsSmartBox');
    if(box)box.classList.add('hidden');
    const r=q('#jsSmartResult');
    if(r){r.classList.add('hidden');r.innerHTML=''}
    setProgress('Screenshots auswählen, dann Erkennung starten.','warn');
  }

  function setProgress(text,state=''){
    const el=q('#jsSmartProgress');
    if(!el)return;
    el.textContent=text;
    el.className='jsSmartProgress'+(state?' '+state:'');
  }

  function getSource(){
    return q('#jsImportUrl')?.dataset?.source || 'Privat';
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const u=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Screenshot konnte nicht gelesen werden.'))};
      img.src=u;
    });
  }

  function cropProfile(source,iw,ih){
    if(ih<=iw*1.18)return {top:0,bottom:1,label:'Originalbild'};
    if(source==='Kleinanzeigen')return {top:.08,bottom:.57,label:'Kleinanzeigen'};
    if(source==='Vinted')return {top:.07,bottom:.61,label:'Vinted'};
    if(source==='eBay')return {top:.09,bottom:.59,label:'eBay'};
    return {top:.08,bottom:.62,label:'Standard'};
  }

  async function makeSmartCrop(file,index,source){
    const img=await loadImage(file);
    const iw=img.naturalWidth,ih=img.naturalHeight;
    const p=cropProfile(source,iw,ih);
    let y=Math.round(ih*p.top);
    let cropH=Math.round(ih*(p.bottom-p.top));
    const targetH=Math.round(iw/0.92);
    cropH=Math.min(cropH,targetH,ih-y);
    if(cropH<1){y=0;cropH=ih}
    const maxW=900,scale=Math.min(1,maxW/iw);
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(iw*scale));
    c.height=Math.max(1,Math.round(cropH*scale));
    const ctx=c.getContext('2d',{alpha:false});
    ctx.drawImage(img,0,y,iw,cropH,0,0,c.width,c.height);
    const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.9));
    if(!blob)throw new Error('Titelbild-Zuschnitt konnte nicht erzeugt werden.');
    return {index,blob,profile:p.label};
  }

  function captureFiles(list){
    sourceFiles=[...list].filter(f=>f.type?.startsWith('image/'));
    smartCrops=[];
    ocrSuggestion=null;
    lastOcrText='';
    const box=q('#jsSmartBox');
    if(box)box.classList.toggle('hidden',!sourceFiles.length);
    const r=q('#jsSmartResult');
    if(r){r.classList.add('hidden');r.innerHTML=''}
    if(!sourceFiles.length){setProgress('Screenshots auswählen, dann Erkennung starten.','warn');return}
    const source=getSource();
    setProgress(`Auto-Zuschnitt für ${sourceFiles.length} Screenshot${sourceFiles.length===1?'':'s'} wird vorbereitet …`);
    cropPromise=(async()=>{
      try{
        smartCrops=[];
        for(let i=0;i<sourceFiles.length;i++)smartCrops.push(await makeSmartCrop(sourceFiles[i],i,source));
        const label=smartCrops[0]?.profile||'Standard';
        setProgress(`Auto-Zuschnitt bereit (${label}). OCR kann jetzt gestartet werden.`,'ok');
      }catch(err){
        smartCrops=[];
        setProgress(err.message||'Auto-Zuschnitt fehlgeschlagen. Der bisherige Zuschnitt bleibt aktiv.','warn');
      }
    })();
  }

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(tesseractPromise)return tesseractPromise;
    tesseractPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.async=true;
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR-Bibliothek konnte nicht initialisiert werden.'));
      s.onerror=()=>reject(new Error('OCR-Komponenten konnten nicht geladen werden. Internetverbindung prüfen.'));
      document.head.appendChild(s);
    });
    return tesseractPromise;
  }

  async function getOcrWorker(){
    if(ocrWorker)return ocrWorker;
    const T=await loadTesseract();
    ocrWorker=await T.createWorker(['deu','eng'],1,{logger:m=>{
      if(typeof m.progress==='number')setProgress(`Texterkennung: ${Math.round(m.progress*100)} % · ${m.status||''}`);
    }});
    return ocrWorker;
  }

  function normalizePrice(raw=''){
    let s=raw.replace(/\s/g,'').replace(/€/g,'');
    if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(','))s=s.replace(',','.');
    else if(/^\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    const n=Number(s.replace(/[^0-9.]/g,''));
    return Number.isFinite(n)?n:null;
  }

  function extractSuggestions(text=''){
    const cleaned=String(text).replace(/\r/g,'');
    const lines=cleaned.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const priceMatches=[...cleaned.matchAll(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*€/g)];
    const prices=priceMatches.map(m=>normalizePrice(m[1])).filter(n=>n!==null&&n>=0&&n<1000000);
    const price=prices.length?prices[0]:null;
    const stop=/^(vinted|kleinanzeigen|ebay|anzeige|teilen|merken|kaufen|nachricht|versand|zahlung|sicher bezahlen|beschreibung|details|ähnliche artikel|privater nutzer|reserviert|verkauft)$/i;
    const candidates=lines.slice(0,28).map((line,index)=>{
      const letters=(line.match(/[A-Za-zÄÖÜäöüß]/g)||[]).length;
      const words=line.split(/\s+/).length;
      let score=letters+Math.min(line.length,70)*.25+Math.min(words,8)*2-index*.35;
      if(stop.test(line))score-=100;
      if(/€|VB\b|inkl\.|zzgl\.|versand|zahlung|nachricht|kaufen/i.test(line))score-=35;
      if(/^\d+[\s:.,-]*$/.test(line))score-=100;
      if(line.length<6||line.length>115)score-=40;
      return {line,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const title=candidates[0]?.line||'';
    const size=(cleaned.match(/(?:größe|gr\.?|size)\s*[:\-]?\s*([0-9]{2,3}(?:\/[0-9]{2,3})?|[xsml]{1,3})\b/i)||[])[1]||'';
    return {title,price,size,text:cleaned};
  }

  function renderSuggestion(s){
    const box=q('#jsSmartResult');
    if(!box)return;
    const euro=s.price===null?'–':s.price.toLocaleString('de-DE',{minimumFractionDigits:s.price%1?2:0,maximumFractionDigits:2})+' €';
    box.innerHTML=`<b>Titel</b><span>${escapeHtml(s.title||'–')}</span><b>Preis</b><span>${euro}</span><b>Größe</b><span>${escapeHtml(s.size||'–')}</span>`;
    box.classList.remove('hidden');
  }

  function escapeHtml(v=''){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function runOcr(){
    if(!sourceFiles.length){setProgress('Bitte zuerst mindestens einen Screenshot auswählen.','warn');return}
    const btn=q('#jsRunOcr');
    btn.disabled=true;
    try{
      setProgress('OCR wird geladen …');
      const worker=await getOcrWorker();
      const texts=[];
      for(let i=0;i<sourceFiles.length;i++){
        setProgress(`Screenshot ${i+1}/${sourceFiles.length} wird gelesen …`);
        const ret=await worker.recognize(sourceFiles[i]);
        texts.push(ret?.data?.text||'');
      }
      lastOcrText=texts.join('\n');
      ocrSuggestion=extractSuggestions(lastOcrText);
      renderSuggestion(ocrSuggestion);
      setProgress('Erkennung abgeschlossen. Die Vorschläge werden beim Weitergehen in die Artikelmaske übernommen.','ok');
    }catch(err){
      console.error(err);
      setProgress(err.message||'Texterkennung fehlgeschlagen. Du kannst den Artikel trotzdem manuell weiterbearbeiten.','warn');
    }finally{btn.disabled=false}
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IMAGE_STORE))db.createObjectStore(IMAGE_STORE,{keyPath:'key'})};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }

  async function overwriteCover(key,blob){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IMAGE_STORE,'readwrite');
      tx.objectStore(IMAGE_STORE).put({key,blob,createdAt:new Date().toISOString(),cropVersion:VERSION});
      tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};
    });
  }

  function selectedShotIndex(){
    const r=q('input[name="jsCover"]:checked');
    return r?Number(r.value)||0:0;
  }

  async function waitForEditor(){
    for(let i=0;i<30;i++){
      const id=q('#editId')?.value;
      if(id && q('#editorBg')?.classList.contains('show'))return id;
      await new Promise(r=>setTimeout(r,70));
    }
    return q('#editId')?.value||'';
  }

  function isGenericTitle(v=''){
    return !v || /^(vinted|kleinanzeigen|ebay|web-link|privat)[ -]?artikel$/i.test(v.trim());
  }

  async function applyEnhancementsToEditor(){
    if(!sourceFiles.length)return;
    const idx=selectedShotIndex();
    await cropPromise.catch(()=>{});
    const id=await waitForEditor();
    if(!id)return;

    const crop=smartCrops[idx]||smartCrops[0];
    if(crop?.blob){
      try{
        await overwriteCover('cover:'+id,crop.blob);
        const img=q('#jsEditorCover img');
        const box=q('#jsEditorCover');
        if(img&&box){img.src=URL.createObjectURL(crop.blob);box.classList.add('show')}
      }catch(err){console.warn('v0.10.2 crop overwrite failed',err)}
    }

    if(ocrSuggestion){
      const title=q('#fTitle'),price=q('#fPrice'),size=q('#fSize');
      if(title && ocrSuggestion.title && (isGenericTitle(title.value)||ocrSuggestion.title.length>title.value.trim().length+12)) title.value=ocrSuggestion.title;
      if(price && (price.value===''||Number(price.value)===0) && ocrSuggestion.price!==null) price.value=String(ocrSuggestion.price);
      if(size && !size.value.trim() && ocrSuggestion.size) size.value=ocrSuggestion.size;
      const note=q('#importNote');
      if(note){
        const extra=`Automatisch erkannt: ${ocrSuggestion.title?'Titel':'–'}${ocrSuggestion.price!==null?' · Preis '+ocrSuggestion.price.toLocaleString('de-DE')+' €':''}${ocrSuggestion.size?' · Größe '+ocrSuggestion.size:''}. Bitte kurz prüfen.`;
        note.textContent=(note.textContent?note.textContent+' · ':'')+extra;
        note.classList.remove('hidden');
      }
    }
  }

  function setVersion(){
    const el=q('#appVersion');
    if(el)el.textContent='v'+VERSION;
    document.documentElement.dataset.jennysellsVersion=VERSION;
  }

  function run(){
    addStyles();
    ensureUi();
    setVersion();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,320));
  else setTimeout(run,320);
  setTimeout(run,700);
  window.JennySellsV102={version:VERSION};
})();
