(()=>{
  const VERSION='0.10.13-test';
  const DB_NAME='JennySellsDB';
  const DB_VERSION=1;
  const IMAGE_STORE='images';
  const q=s=>document.querySelector(s);

  let files=[];
  let ocrWorker=null;
  let tesseractPromise=null;
  let suggestion=null;
  let ocrDone=false;
  let manualCropBlob=null;
  let cropIndex=0;
  let cropImg=null;
  let cropUrl='';
  let drag=null;
  const cropState={zoom:1,x:0,y:0,base:1,iw:1,ih:1,vw:1,vh:1};

  function addStyles(){
    if(q('#jsV104Style'))return;
    const s=document.createElement('style');
    s.id='jsV104Style';
    s.textContent=`
      #jsShots{display:none!important}
      .jsV104Input{width:100%;border:1px solid #eadfee;border-radius:12px;padding:11px 12px;background:#fff;color:#3f3344;margin-top:8px}
      .jsV104Row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:8px}
      .jsV104SmallBtn{border:0;border-radius:12px;padding:11px 13px;background:#f0e3f5;color:#704289;font-weight:800;white-space:nowrap}
      .jsV104Box{margin:9px 0;padding:12px;border:1px solid #e9dfe9;border-radius:17px;background:#fff}
      .jsV104Box.hidden{display:none}.jsV104Box h4{margin:0 0 8px;font:800 15px Georgia,serif;color:#573b66}
      .jsV104Help{font-size:10.5px;line-height:1.4;color:#817486;margin:0 0 9px}
      .jsV104Progress{font-size:10.5px;border-radius:12px;padding:9px;background:#fff4e5;color:#8d621f;margin-top:8px}
      .jsV104Progress.ok{background:#edf8f1;color:#277147}.jsV104Progress.busy{background:#f5edf7;color:#704289}
      .jsV104Result{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:9px;padding:11px;border-radius:12px;background:#faf6fb;font-size:11px}
      .jsV104Field{min-width:0}.jsV104Field.wide{grid-column:1/-1}.jsV104Field b{display:block;color:#817486;font-size:9px;margin:0 0 2px}
      .jsV104Field span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#382b40}
      .jsV104Field.wide span{white-space:normal;line-height:1.35}
      .jsOcrHint{grid-column:1/-1;color:#95671f;font-size:10px;line-height:1.35}
      .jsCropWrap{margin-top:10px}.jsCropViewport{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;border-radius:18px;background:#221b26;touch-action:none;user-select:none;-webkit-user-select:none}
      .jsCropViewport img{position:absolute;left:50%;top:50%;max-width:none;max-height:none;transform-origin:center center;pointer-events:none;will-change:transform}
      .jsCropFrame{position:absolute;inset:0;border:2px solid #fff9;box-shadow:inset 0 0 0 1px #0003;pointer-events:none;border-radius:18px}
      .jsCropHint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:#211825aa;color:#fff;border-radius:99px;padding:6px 10px;font-size:9px;white-space:nowrap;pointer-events:none}
      .jsZoomRow{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;margin-top:10px;color:#6d5a74;font-size:10px;font-weight:800}
      .jsZoomRow input{width:100%;accent-color:#71389b}
      .jsCropSelect{width:100%;border:1px solid #dbc9e5;background:#fff;border-radius:12px;padding:9px 10px;color:#4f3f55;margin-bottom:9px}
      .jsCropConfirm{width:100%;border:0;border-radius:13px;padding:12px;background:#71389b;color:#fff;font-weight:900;margin-top:9px}
      .jsCropConfirm:disabled{opacity:.45}
    `;
    document.head.appendChild(s);
  }

  function firstUrl(text=''){
    const m=String(text).match(/https?:\/\/[^\s<>"']+/i);
    return m?m[0].replace(/[),.;!?]+$/,''):'';
  }
  function humanize(s=''){
    try{s=decodeURIComponent(s)}catch{}
    return s.replace(/\.(html?|php)$/i,'').replace(/[-_+]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function detectMarketplace(url=''){
    let u;try{u=new URL(url)}catch{return {source:'Privat',label:'Web-Link',id:'',title:'',size:'',brand:''}}
    const host=u.hostname.toLowerCase().replace(/^www\./,''),path=u.pathname;
    let source='Privat',label=host,id='',slug='';
    if(host.includes('vinted.')){source='Vinted';label='Vinted';const m=path.match(/\/items\/(\d+)-?([^/?#]*)/i);if(m){id=m[1]||'';slug=m[2]||''}}
    else if(host==='kleinanzeigen.de'||host.endsWith('.kleinanzeigen.de')||host.includes('ebay-kleinanzeigen.')){source='Kleinanzeigen';label='Kleinanzeigen';const m=path.match(/\/s-anzeige\/([^/]+)\/(\d+(?:-\d+)*)/i);if(m){slug=m[1]||'';id=m[2]||''}}
    else if(host.includes('ebay.')){source='eBay';label='eBay';const m=path.match(/\/itm\/(?:([^/]+)\/)?(\d{8,})/i);if(m){slug=m[1]||'';id=m[2]||''}}
    const title=humanize(slug);
    const size=(title.match(/(?:größe|gr\.?|size)\s*([0-9]{2,3}(?:\/[0-9]{2,3})?|[xsml]{1,3})\b/i)||[])[1]||'';
    let brand='';if(source==='Vinted'&&title){const f=title.split(/\s+/)[0]||'';brand=/^ca$/i.test(f)?'C&A':f}
    return {source,label,id,title,size,brand};
  }

  function ensureUi(){
    const urlBox=q('#jsImportUrl');
    if(urlBox&&!q('#jsManualUrl')){
      const row=document.createElement('div');
      row.innerHTML=`<input id="jsManualUrl" class="jsV104Input" type="url" inputmode="url" autocapitalize="off" autocomplete="off" placeholder="Link alternativ einfügen"><div class="jsV104Row"><span class="jsV104Help">Oder Link manuell eingeben</span><button id="jsApplyManualUrl" class="jsV104SmallBtn" type="button">Übernehmen</button></div>`;
      urlBox.insertAdjacentElement('beforebegin',row);
      q('#jsApplyManualUrl').onclick=applyManualUrl;
    }

    const status=q('#jsShotStatus');
    if(status&&!q('#jsV104Ocr')){
      const box=document.createElement('div');
      box.id='jsV104Ocr';box.className='jsV104Box hidden';
      box.innerHTML=`<h4>3 · Daten erkennen</h4><div class="jsV104Help">Titel, Preis und Artikeldetails automatisch auslesen.</div><button class="jsImportBtn" id="jsV104RunOcr" type="button">🔎 Daten erkennen</button><div class="jsV104Progress" id="jsV104Progress">Bilder auswählen</div><div class="jsV104Result hidden" id="jsV104Result"></div>`;
      (status.closest('.jsImportStep')||status).insertAdjacentElement('afterend',box);
      q('#jsV104RunOcr').onclick=runOcr;
    }

    const oldSmart=q('#jsSmartBox');if(oldSmart)oldSmart.remove();
    const steps=[...document.querySelectorAll('.jsImportStep')];
    const step3=steps.find(x=>/^3\s*[·.-]/.test(x.querySelector('h3')?.textContent?.trim()||''));
    if(step3)step3.style.display='none';

    if(!q('#jsV104Crop')){
      const cont=q('#jsContinueImport');
      if(cont){
        const crop=document.createElement('div');
        crop.id='jsV104Crop';crop.className='jsV104Box hidden';
        crop.innerHTML=`<h4>4 · Titelbild festlegen</h4><div class="jsV104Help">Ausschnitt verschieben oder zoomen. Nur dieses Bild wird gespeichert.</div><select id="jsCropSelect" class="jsCropSelect"></select><div class="jsCropWrap"><div id="jsCropViewport" class="jsCropViewport"><img id="jsCropImg" alt="Bildausschnitt"><div class="jsCropFrame"></div><div class="jsCropHint">Ziehen zum Verschieben</div></div><div class="jsZoomRow"><span>−</span><input id="jsCropZoom" type="range" min="1" max="3" value="1" step="0.01"><span>＋</span></div><button id="jsCropConfirm" class="jsCropConfirm" type="button">Bildausschnitt übernehmen</button><div id="jsCropStatus" class="jsV104Progress">Zuerst Texterkennung durchführen.</div></div>`;
        cont.insertAdjacentElement('beforebegin',crop);
        q('#jsCropSelect').onchange=()=>{cropIndex=Number(q('#jsCropSelect').value)||0;manualCropBlob=null;openCropImage()};
        q('#jsCropZoom').oninput=()=>{cropState.zoom=Number(q('#jsCropZoom').value)||1;clampCrop();renderCrop();manualCropBlob=null;setCropStatus('Bildausschnitt geändert – bitte erneut übernehmen.','')};
        q('#jsCropConfirm').onclick=confirmCrop;
        setupCropPointer();
        cont.textContent='Artikel übernehmen';
        cont.addEventListener('click',guardContinue,true);
      }
    }

    const input=q('#jsShotInput');
    if(input&&!input.dataset.v104){input.dataset.v104='1';input.addEventListener('change',e=>captureFiles(e.target.files))}
    const launch=q('#marketImportLaunch');
    if(launch&&!launch.dataset.v104){launch.dataset.v104='1';launch.addEventListener('click',reset)}
    setVersion();
  }

  function applyManualUrl(){
    const raw=q('#jsManualUrl')?.value||'';
    const url=firstUrl(raw)||raw.trim();
    const out=q('#jsImportUrl');
    try{
      new URL(url);
      const m=detectMarketplace(url);
      out.innerHTML=`<span class="jsPlatform">${m.label}</span><br>${url}`;
      out.dataset.url=url;out.dataset.source=m.source;
    }catch{
      out.textContent='Bitte einen vollständigen Web-Link einfügen.';out.dataset.url='';out.dataset.source='';
    }
  }

  function reset(){
    files=[];suggestion=null;ocrDone=false;manualCropBlob=null;cropIndex=0;
    if(cropUrl){URL.revokeObjectURL(cropUrl);cropUrl=''}
    const u=q('#jsManualUrl');if(u)u.value='';
    q('#jsV104Ocr')?.classList.add('hidden');q('#jsV104Crop')?.classList.add('hidden');
    const r=q('#jsV104Result');if(r){r.classList.add('hidden');r.innerHTML=''}
    setProgress('Bilder auswählen');setCropStatus('Zuerst Daten erkennen','');
  }

  function captureFiles(list){
    files=[...list].filter(f=>f.type?.startsWith('image/'));
    suggestion=null;ocrDone=false;manualCropBlob=null;cropIndex=0;
    const box=q('#jsV104Ocr');if(box)box.classList.toggle('hidden',!files.length);
    q('#jsV104Crop')?.classList.add('hidden');
    const result=q('#jsV104Result');if(result){result.classList.add('hidden');result.innerHTML=''}
    setProgress(files.length?`${files.length} Bild${files.length===1?'':'er'} bereit`:'Bilder auswählen');
    const sel=q('#jsCropSelect');if(sel){sel.innerHTML=files.map((f,i)=>`<option value="${i}">Screenshot ${i+1}${f.name?' · '+escapeHtml(f.name):''}</option>`).join('')}
  }

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(tesseractPromise)return tesseractPromise;
    tesseractPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.async=true;s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR konnte nicht initialisiert werden.'));s.onerror=()=>reject(new Error('OCR-Komponenten konnten nicht geladen werden.'));document.head.appendChild(s)});
    return tesseractPromise;
  }
  async function getWorker(){
    if(ocrWorker)return ocrWorker;
    const T=await loadTesseract();
    ocrWorker=await T.createWorker(['deu','eng'],1,{logger:m=>{if(typeof m.progress==='number')setProgress(`Texterkennung: ${Math.round(m.progress*100)} %`,'busy')}});
    return ocrWorker;
  }
  function normalizePrice(raw=''){
    let s=raw.replace(/\s/g,'').replace(/€/g,'');
    if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');else if(/^\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    const n=Number(s.replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:null;
  }
  function extract(text=''){
    const cleaned=String(text).replace(/\r/g,'');
    const lines=cleaned.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const prices=[...cleaned.matchAll(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*€/g)].map(m=>normalizePrice(m[1])).filter(n=>n!==null&&n>=0&&n<1000000);
    const stop=/^(vinted|kleinanzeigen|ebay|anzeige|teilen|merken|kaufen|nachricht|versand|zahlung|sicher bezahlen|beschreibung|details|ähnliche artikel|privater nutzer|reserviert|verkauft)$/i;
    const candidates=lines.slice(0,30).map((line,index)=>{const letters=(line.match(/[A-Za-zÄÖÜäöüß]/g)||[]).length,words=line.split(/\s+/).length;let score=letters+Math.min(line.length,70)*.25+Math.min(words,8)*2-index*.35;if(stop.test(line))score-=100;if(/€|VB\b|inkl\.|zzgl\.|versand|zahlung|nachricht|kaufen/i.test(line))score-=35;if(/^\d+[\s:.,-]*$/.test(line))score-=100;if(line.length<6||line.length>115)score-=40;return {line,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const size=(cleaned.match(/(?:größe|gr\.?|size)\s*[:\-]?\s*([0-9]{2,3}(?:\/[0-9]{2,3})?|[xsml]{1,3})\b/i)||[])[1]||'';
    return {title:candidates[0]?.line||'',price:prices.length?prices[0]:null,size};
  }
  async function runOcr(){
    if(!files.length)return;
    const btn=q('#jsV104RunOcr');btn.disabled=true;
    try{
      setProgress('OCR wird geladen …','busy');const w=await getWorker();const texts=[];
      for(let i=0;i<files.length;i++){setProgress(`Screenshot ${i+1}/${files.length} wird gelesen …`,'busy');const r=await w.recognize(files[i]);texts.push(r?.data?.text||'')}
      const meta=detectMarketplace(q('#jsImportUrl')?.dataset.url||'');
      suggestion=(meta.source==='Vinted'&&window.JennySellsVintedParser?.parse)
        ? window.JennySellsVintedParser.parse(texts,q('#jsImportUrl')?.dataset.url||'')
        : extract(texts.join('\n'));
      renderSuggestion();ocrDone=true;setProgress('Daten erkannt ✓','ok');
      q('#jsV104Crop')?.classList.remove('hidden');cropIndex=0;if(q('#jsCropSelect'))q('#jsCropSelect').value='0';await openCropImage();
    }catch(e){setProgress(e.message||'Texterkennung fehlgeschlagen.','');}
    finally{btn.disabled=false}
  }
  function renderSuggestion(){
    const r=q('#jsV104Result');if(!r||!suggestion)return;
    const euro=suggestion.price===null?'–':suggestion.price.toLocaleString('de-DE',{maximumFractionDigits:2})+' €';
    const fields=[['Titel',suggestion.title],['Preis',euro],['Größe',suggestion.size],['Marke',suggestion.brand],['Kategorie',suggestion.category],['Zustand',suggestion.condition],['Farbe',suggestion.color],['Online seit',suggestion.uploadedRelative?'ca. '+suggestion.uploadedRelative:'']];
    r.innerHTML=fields.map(([label,value])=>`<div class="jsV104Field${label==='Titel'?' wide':''}"><b>${escapeHtml(label)}</b><span>${escapeHtml(value||'–')}</span></div>`).join('');
    if(suggestion.warnings?.length)r.insertAdjacentHTML('beforeend',suggestion.warnings.map(w=>`<div class="jsOcrHint">${escapeHtml(w)}</div>`).join(''));
    r.classList.remove('hidden');
  }
  function setProgress(text,state=''){const e=q('#jsV104Progress');if(e){e.textContent=text;e.className='jsV104Progress'+(state?' '+state:'')}}
  function setCropStatus(text,state=''){const e=q('#jsCropStatus');if(e){e.textContent=text;e.className='jsV104Progress'+(state?' '+state:'')}}
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function openCropImage(){
    if(!files[cropIndex])return;
    manualCropBlob=null;
    if(cropUrl)URL.revokeObjectURL(cropUrl);
    cropUrl=URL.createObjectURL(files[cropIndex]);
    const img=q('#jsCropImg');cropImg=img;
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=cropUrl});
    cropState.iw=img.naturalWidth;cropState.ih=img.naturalHeight;cropState.zoom=1;cropState.x=0;cropState.y=0;if(q('#jsCropZoom'))q('#jsCropZoom').value='1';
    requestAnimationFrame(()=>{measureCrop();clampCrop();renderCrop();setCropStatus('Ausschnitt einstellen und anschließend übernehmen.','')});
  }
  function measureCrop(){
    const v=q('#jsCropViewport');if(!v||!cropImg)return;
    const r=v.getBoundingClientRect();cropState.vw=r.width;cropState.vh=r.height;cropState.base=Math.max(r.width/cropState.iw,r.height/cropState.ih);
  }
  function clampCrop(){
    const s=cropState.base*cropState.zoom,dw=cropState.iw*s,dh=cropState.ih*s;
    const mx=Math.max(0,(dw-cropState.vw)/2),my=Math.max(0,(dh-cropState.vh)/2);
    cropState.x=Math.max(-mx,Math.min(mx,cropState.x));cropState.y=Math.max(-my,Math.min(my,cropState.y));
  }
  function renderCrop(){
    if(!cropImg)return;const s=cropState.base*cropState.zoom;
    cropImg.style.width=cropState.iw+'px';cropImg.style.height=cropState.ih+'px';cropImg.style.transform=`translate(-50%,-50%) translate(${cropState.x}px,${cropState.y}px) scale(${s})`;
  }
  function setupCropPointer(){
    const v=q('#jsCropViewport');if(!v||v.dataset.bound)return;v.dataset.bound='1';
    v.addEventListener('pointerdown',e=>{if(!ocrDone)return;v.setPointerCapture?.(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:cropState.x,oy:cropState.y}});
    v.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;cropState.x=drag.ox+(e.clientX-drag.x);cropState.y=drag.oy+(e.clientY-drag.y);clampCrop();renderCrop();manualCropBlob=null;setCropStatus('Bildausschnitt geändert – bitte erneut übernehmen.','')});
    const end=e=>{if(drag&&drag.id===e.pointerId)drag=null};v.addEventListener('pointerup',end);v.addEventListener('pointercancel',end);
  }
  async function confirmCrop(){
    if(!cropImg)return;
    measureCrop();clampCrop();
    const s=cropState.base*cropState.zoom;
    const displayLeft=cropState.vw/2-(cropState.iw*s)/2+cropState.x;
    const displayTop=cropState.vh/2-(cropState.ih*s)/2+cropState.y;
    let sx=(0-displayLeft)/s,sy=(0-displayTop)/s,sw=cropState.vw/s,sh=cropState.vh/s;
    sx=Math.max(0,Math.min(cropState.iw-sw,sx));sy=Math.max(0,Math.min(cropState.ih-sh,sy));
    const out=document.createElement('canvas');out.width=800;out.height=1000;const ctx=out.getContext('2d',{alpha:false});ctx.drawImage(cropImg,sx,sy,sw,sh,0,0,out.width,out.height);
    manualCropBlob=await new Promise(r=>out.toBlob(r,'image/jpeg',.9));
    if(manualCropBlob)setCropStatus('✓ Bildausschnitt übernommen. Du kannst jetzt weitergehen.','ok');
  }

  function guardContinue(e){
    if(!files.length)return;
    if(!ocrDone){e.preventDefault();e.stopImmediatePropagation();setProgress('Bitte zuerst Titel & Preis erkennen.','');q('#jsV104Ocr')?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(!manualCropBlob){e.preventDefault();e.stopImmediatePropagation();setCropStatus('Bitte den gewünschten Bildausschnitt zuerst übernehmen.','');q('#jsV104Crop')?.scrollIntoView({behavior:'smooth',block:'center'});return}
    setTimeout(applyAfterContinue,100);
  }
  async function waitEditor(){for(let i=0;i<40;i++){const id=q('#editId')?.value;if(id&&q('#editorBg')?.classList.contains('show'))return id;await new Promise(r=>setTimeout(r,60))}return q('#editId')?.value||''}
  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IMAGE_STORE))db.createObjectStore(IMAGE_STORE,{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function putCover(key,blob){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(IMAGE_STORE,'readwrite');tx.objectStore(IMAGE_STORE).put({key,blob,createdAt:new Date().toISOString(),cropVersion:VERSION});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  function genericTitle(v=''){return !v||/^(vinted|kleinanzeigen|ebay|web-link|privat)[ -]?artikel$/i.test(v.trim())}
  async function applyAfterContinue(){
    const id=await waitEditor();if(!id)return;await new Promise(r=>setTimeout(r,120));
    if(manualCropBlob){try{await putCover('cover:'+id,manualCropBlob);const img=q('#jsEditorCover img'),box=q('#jsEditorCover');if(img&&box){img.src=URL.createObjectURL(manualCropBlob);box.classList.add('show')}}catch(e){console.warn('manual crop save failed',e)}}
    if(suggestion){
      const meta=detectMarketplace(q('#jsImportUrl')?.dataset.url||'');
      const title=q('#fTitle'),price=q('#fPrice'),size=q('#fSize');
      if(meta.source==='Vinted'){
        const fields=[['#fTitle','title'],['#fBrand','brand'],['#fSize','size'],['#fCondition','condition'],['#fColor','color'],['#fCategory','category']];
        for(const [selector,key] of fields){const el=q(selector);if(el&&suggestion[key])el.value=suggestion[key]}
        if(price&&suggestion.price!==null)price.value=String(suggestion.price);
        const since=q('#fOnlineSince');if(since)since.value=suggestion.onlineSince||'';
      }else{
        if(title&&suggestion.title&&(genericTitle(title.value)||suggestion.title.length>title.value.trim().length+10))title.value=suggestion.title;
        if(price&&(price.value===''||Number(price.value)===0)&&suggestion.price!==null)price.value=String(suggestion.price);
        if(size&&!size.value.trim()&&suggestion.size)size.value=suggestion.size;
      }
      const note=q('#importNote');
      if(note){
        const extra=`Automatisch erkannt: ${suggestion.title?'Titel':'–'}${suggestion.price!==null?' · Angebotspreis '+suggestion.price.toLocaleString('de-DE')+' €':''}${suggestion.size?' · Größe '+suggestion.size:''}${suggestion.uploadedRelative?' · Vinted: hochgeladen '+suggestion.uploadedRelative+' (Datum ungenau)':''} · Titelbild manuell eingestellt. Bitte vor dem Speichern prüfen.`;
        note.textContent=(note.textContent?note.textContent+' · ':'')+extra;note.classList.remove('hidden');
      }
    }
  }
  function setVersion(){const el=q('#appVersion');if(el)el.textContent='v'+VERSION;document.documentElement.dataset.jennysellsVersion=VERSION}
  function run(){addStyles();ensureUi();setVersion()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,320));else setTimeout(run,320);setTimeout(run,750);
  window.JennySellsV104={version:VERSION};
})();