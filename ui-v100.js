(()=>{
  const VERSION='0.11.7-test';
  const DB_NAME='JennySellsDB';
  const DB_VERSION=2;
  const IMAGE_STORE='images';
  let importFiles=[];
  let importCandidates=[];
  let selectedCandidate=0;
  let pendingCover=null;
  let pendingItemId=null;
  const objectUrls=new Map();

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE,{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function putImage(key,blob){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IMAGE_STORE,'readwrite');
      tx.objectStore(IMAGE_STORE).put({key,blob,createdAt:new Date().toISOString()});
      tx.oncomplete=()=>{db.close();resolve(key)};
      tx.onerror=()=>{db.close();reject(tx.error)};
    });
  }

  async function getImage(key){
    if(!key)return null;
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IMAGE_STORE,'readonly');
      const req=tx.objectStore(IMAGE_STORE).get(key);
      req.onsuccess=()=>{db.close();resolve(req.result?.blob||null)};
      req.onerror=()=>{db.close();reject(req.error)};
    });
  }

  async function deleteImage(key){
    if(!key)return;
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IMAGE_STORE,'readwrite');
      tx.objectStore(IMAGE_STORE).delete(key);
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(tx.error)};
    });
  }

  function addStyles(){
    if(q('#jsImportV100Style'))return;
    const s=document.createElement('style');
    s.id='jsImportV100Style';
    s.textContent=`
      .jsImportLaunch{width:100%;border:0;border-radius:17px;background:linear-gradient(135deg,#71389b,#8f55b4);color:#fff;padding:14px 15px;margin:10px 0 15px;text-align:left;box-shadow:0 7px 18px #54385c22}
      .jsImportLaunch b{display:block;font-size:14px}.jsImportLaunch span{display:block;font-size:10px;opacity:.9;margin-top:3px}
      .jsImportBg{display:none;position:fixed;inset:0;z-index:110;background:#21182566;align-items:flex-end}.jsImportBg.show{display:flex}
      .jsImportSheet{width:min(100%,520px);max-height:91vh;overflow:auto;margin:auto;background:#fff;border-radius:26px 26px 0 0;padding:18px 16px 28px;box-shadow:0 -12px 35px #2b1a3330}
      .jsImportHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.jsImportHead h2{font:800 22px Georgia,serif;margin:0}.jsImportClose{border:0;width:36px;height:36px;border-radius:50%;background:#f5edf7;color:#71389b;font-size:22px}
      .jsImportStep[hidden]{display:none!important}.jsImportLead{font-size:11px;line-height:1.4;color:#817486;margin:5px 0 10px}
      .jsImportStep{background:#fff;border:1px solid #e9dfe9;border-radius:17px;padding:12px;margin:9px 0}.jsImportStep h3{font:800 15px Georgia,serif;margin:0 0 7px}.jsImportStep p{font-size:10.5px;color:#817486;line-height:1.4;margin:4px 0 9px}
      .jsImportBtn{width:100%;border:0;border-radius:13px;padding:12px;background:#f0e3f5;color:#704289;font-weight:800;text-align:center}.jsImportBtn.primary{background:#71389b;color:#fff}.jsImportBtn:disabled{opacity:.45}
      .jsImportUrl{font-size:10px;word-break:break-all;background:#fff;border:1px solid #eadfee;border-radius:12px;padding:9px;margin-top:8px;color:#62566a}
      .jsPlatform{display:inline-flex;align-items:center;padding:4px 7px;border-radius:99px;background:#f0e3f5;color:#704289;font-size:9px;font-weight:800;margin-bottom:6px}
      .jsShots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.jsShot{position:relative;border:2px solid #eadfee;border-radius:15px;padding:6px;background:#fff}.jsShot.selected{border-color:#71389b;box-shadow:0 0 0 2px #eadcf2}.jsShot img{display:block;width:100%;aspect-ratio:.9;object-fit:cover;border-radius:10px;background:#f4eef5}.jsShot label{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;margin:7px 2px 1px;color:#5e4d64}.jsShot input{accent-color:#71389b}.jsShot small{display:block;color:#8a7c8e;font-size:9px;margin:2px}
      .jsImportStatus{font-size:10.5px;border-radius:12px;padding:9px;background:#edf8f1;color:#277147;margin-top:8px}.jsImportStatus.warn{background:#fff4e5;color:#8d621f}
      .jsCoverPreview{display:none;align-items:center;gap:10px;background:#faf6fb;border:1px solid #eee4ed;border-radius:14px;padding:8px;margin:0 0 10px}.jsCoverPreview.show{display:flex}.jsCoverPreview img{width:66px;height:74px;object-fit:cover;border-radius:10px}.jsCoverPreview div{font-size:10px;color:#817486}.jsCoverPreview b{display:block;color:#4f3f55;font-size:11px;margin-bottom:3px}
      .row .thumb.hasCover{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;color:transparent!important}
      @media(max-width:370px){.jsShots{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureUi(){
    if(!q('#marketImportLaunch')){
      q('#vintedImportLaunch')?.remove();
      const hero=q('#home .hero');
      if(hero){
        const b=document.createElement('button');
        b.id='marketImportLaunch';
        b.className='jsImportLaunch';
        b.innerHTML='<b>📷 Verkaufsartikel importieren</b><span>Link übernehmen + mehrere Screenshots auswerten</span>';
        hero.insertAdjacentElement('afterend',b);
        b.onclick=openImport;
      }
    }
    q('#jsImportBg')?.remove();
    const m=document.createElement('div');
    m.id='jsImportBg';
    m.className='jsImportBg';
    m.innerHTML=`<div class="jsImportSheet">
      <div class="jsImportHead"><h2>Artikel importieren</h2><button class="jsImportClose" id="jsImportClose">×</button></div>
      <div class="jsImportLead">Vinted, eBay und Kleinanzeigen: Link + Screenshots.</div>
      <div class="jsImportStep"><h3>1 · Link</h3><button class="jsImportBtn" id="jsReadClipboard">Link einfügen</button><div class="jsImportUrl" id="jsImportUrl">Noch kein Link</div></div>
      <div class="jsImportStep"><h3>2 · Screenshots</h3><input id="jsShotInput" type="file" accept="image/*" multiple hidden><button class="jsImportBtn" id="jsChooseShots">Bilder auswählen</button><div id="jsShotStatus" class="jsImportStatus warn">Keine Bilder ausgewählt</div><div class="jsShots" id="jsShots"></div></div>
      <div class="jsImportStep" id="jsLegacyCoverStep" hidden><h3>Legacy-Titelbild</h3><div id="jsCoverHint" class="jsImportStatus warn"></div></div>
      <button class="jsImportBtn primary" id="jsContinueImport" disabled>Mit ausgewähltem Titelbild weiter</button>
    </div>`;
    document.body.appendChild(m);
    q('#jsImportClose').onclick=closeImport;
    m.onclick=e=>{if(e.target===m)closeImport()};
    q('#jsReadClipboard').onclick=readClipboard;
    q('#jsChooseShots').onclick=()=>q('#jsShotInput').click();
    q('#jsShotInput').onchange=e=>handleFiles(e.target.files);
    q('#jsContinueImport').onclick=continueImport;
    ensureEditorCover();
  }

  function ensureEditorCover(){
    if(q('#jsEditorCover'))return;
    const form=q('#editorBg .formgrid');
    if(!form)return;
    const box=document.createElement('div');
    box.id='jsEditorCover';
    box.className='jsCoverPreview full';
    box.innerHTML='<img alt="Titelbild"><div><b>Titelbild</b><span>Wird lokal auf diesem Gerät gespeichert.</span></div>';
    form.insertAdjacentElement('beforebegin',box);
  }

  function resetImport(){
    importFiles=[];
    importCandidates.forEach(c=>{if(c.url)URL.revokeObjectURL(c.url)});
    importCandidates=[];
    selectedCandidate=0;
    if(q('#jsShotInput'))q('#jsShotInput').value='';
    if(q('#jsShots'))q('#jsShots').innerHTML='';
    if(q('#jsShotStatus')){q('#jsShotStatus').className='jsImportStatus warn';q('#jsShotStatus').textContent='Keine Bilder ausgewählt.'}
    if(q('#jsCoverHint')){q('#jsCoverHint').className='jsImportStatus warn';q('#jsCoverHint').textContent='Bilder auswählen.'}
    if(q('#jsContinueImport'))q('#jsContinueImport').disabled=true;
  }

  function openImport(){
    resetImport();
    q('#jsImportUrl').textContent='Noch kein Link';
    q('#jsImportUrl').dataset.url='';
    q('#jsImportUrl').dataset.source='';
    q('#jsImportBg').classList.add('show');
  }
  function closeImport(){q('#jsImportBg')?.classList.remove('show')}

  function firstUrl(text=''){
    const m=String(text).match(/https?:\/\/[^\s<>"']+/i);
    return m?m[0].replace(/[),.;!?]+$/,''):'';
  }

  function humanizeSlug(s=''){
    try{s=decodeURIComponent(s)}catch{}
    return s.replace(/\.(html?|php)$/i,'').replace(/[-_+]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function detectMarketplace(url=''){
    let u;
    try{u=new URL(url)}catch{return {source:'Privat',label:'Web-Link',id:'',title:'',size:'',brand:''}}
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    const path=u.pathname;
    let source='Privat',label=host,id='',slug='';

    if(host.includes('vinted.')){
      source='Vinted';label='Vinted';
      const m=path.match(/\/items\/(\d+)-?([^/?#]*)/i);
      if(m){id=m[1]||'';slug=m[2]||''}
    }else if(host==='kleinanzeigen.de'||host.endsWith('.kleinanzeigen.de')||host.includes('ebay-kleinanzeigen.')){
      source='Kleinanzeigen';label='Kleinanzeigen';
      const m=path.match(/\/s-anzeige\/([^/]+)\/(\d+(?:-\d+)*)/i);
      if(m){slug=m[1]||'';id=m[2]||''}
      else{const parts=path.split('/').filter(Boolean);slug=parts.find((p,i)=>parts[i-1]==='s-anzeige')||''}
    }else if(host.includes('ebay.')){
      source='eBay';label='eBay';
      const m=path.match(/\/itm\/(?:([^/]+)\/)?(\d{8,})/i);
      if(m){slug=m[1]||'';id=m[2]||''}
      else{const parts=path.split('/').filter(Boolean);const itm=parts.indexOf('itm');if(itm>=0){slug=parts[itm+1]&&!/^\d+$/.test(parts[itm+1])?parts[itm+1]:'';id=parts.find((p,i)=>i>itm&&/^\d{8,}$/.test(p))||''}}
    }else{
      const parts=path.split('/').filter(Boolean);
      slug=[...parts].reverse().find(p=>!/^\d+$/.test(p)&&p.length>2)||'';
    }

    const title=humanizeSlug(slug);
    const size=(title.match(/(?:größe|gr\.?|size)\s*([0-9]{2,3}|[xsml]{1,3})\b/i)||[])[1]||'';
    let brand='';
    if(source==='Vinted'&&title){
      const first=title.split(/\s+/)[0]||'';
      brand=/^ca$/i.test(first)?'C&A':first;
    }
    return {source,label,id,title,size,brand,host};
  }

  async function readClipboard(){
    const out=q('#jsImportUrl');
    try{
      const text=await navigator.clipboard.readText();
      const url=firstUrl(text);
      if(!url)throw new Error('Kein Web-Link in der Zwischenablage gefunden.');
      const meta=detectMarketplace(url);
      out.innerHTML=`<span class="jsPlatform">${meta.label}</span><br>${url.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}`;
      out.dataset.url=url;
      out.dataset.source=meta.source;
    }catch(err){
      out.textContent=err.message||'Zwischenablage konnte nicht gelesen werden. Link bitte erneut kopieren.';
      out.dataset.url='';out.dataset.source='';
    }
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const u=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Bild konnte nicht gelesen werden.'))};
      img.src=u;
    });
  }

  async function makeCandidate(file,index){
    const img=await loadImage(file);
    const iw=img.naturalWidth,ih=img.naturalHeight;
    const cropW=iw;
    const wantedH=Math.round(iw/0.90);
    const cropH=Math.min(Math.round(ih*0.62),wantedH,ih);
    const y=Math.max(0,Math.min(ih-cropH,Math.round(ih*0.08)));
    const maxW=900,scale=Math.min(1,maxW/cropW);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(cropW*scale));
    canvas.height=Math.max(1,Math.round(cropH*scale));
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.drawImage(img,0,y,cropW,cropH,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
    if(!blob)throw new Error('Bildausschnitt konnte nicht erstellt werden.');
    return {index,blob,url:URL.createObjectURL(blob),name:file.name||`Screenshot ${index+1}`};
  }

  async function handleFiles(list){
    importFiles=[...list].filter(f=>f.type.startsWith('image/'));
    importCandidates.forEach(c=>{if(c.url)URL.revokeObjectURL(c.url)});
    importCandidates=[];
    const status=q('#jsShotStatus');
    if(!importFiles.length){resetImport();return}
    status.className='jsImportStatus';
    status.textContent=`${importFiles.length} Screenshot${importFiles.length===1?'':'s'} ausgewählt · Bildausschnitte werden vorbereitet …`;
    q('#jsChooseShots').disabled=true;
    try{
      for(let i=0;i<importFiles.length;i++)importCandidates.push(await makeCandidate(importFiles[i],i));
      selectedCandidate=0;
      renderCandidates();
      status.textContent=`${importFiles.length} Screenshot${importFiles.length===1?'':'s'} stehen für die Datenerkennung bereit.`;
      q('#jsCoverHint').className='jsImportStatus';
      q('#jsCoverHint').textContent='Genau ein Titelbild ist ausgewählt. Beim Speichern werden die übrigen temporären Bildausschnitte automatisch verworfen.';
      q('#jsContinueImport').disabled=false;
    }catch(err){
      status.className='jsImportStatus warn';
      status.textContent=err.message||'Screenshots konnten nicht verarbeitet werden.';
    }finally{q('#jsChooseShots').disabled=false}
  }

  function renderCandidates(){
    const box=q('#jsShots');
    box.innerHTML=importCandidates.map((c,i)=>`<div class="jsShot ${i===selectedCandidate?'selected':''}" data-shot="${i}"><img src="${c.url}" alt="Bildausschnitt ${i+1}"><label><input type="radio" name="jsCover" value="${i}" ${i===selectedCandidate?'checked':''}> Titelbild</label><small>Screenshot ${i+1}</small></div>`).join('');
    qa('input[name="jsCover"]').forEach(r=>r.onchange=()=>{selectedCandidate=Number(r.value);renderCandidates()});
  }

  async function continueImport(){
    if(!importCandidates.length)return;
    const chosen=importCandidates[selectedCandidate]||importCandidates[0];
    const url=q('#jsImportUrl').dataset.url||'';
    const meta=detectMarketplace(url);
    const draft=typeof blank==='function'?blank():{id:Date.now().toString(36),createdAt:new Date().toISOString()};
    draft.source=meta.source;
    draft.url=url;
    draft.title=meta.title||`${meta.label}-Artikel`;
    draft.brand=meta.brand||'';
    draft.size=meta.size||'';
    draft.onlineSince=''; // An imported listing's publication date is unknown unless the source provides a precise date.
    const key='cover:'+draft.id;
    q('#jsContinueImport').disabled=true;
    q('#jsContinueImport').textContent='Titelbild wird gespeichert …';
    try{
      await putImage(key,chosen.blob);
      pendingCover=key;
      pendingItemId=draft.id;
      draft.coverImageKey=key;
      closeImport();
      const info=[`${meta.label}-Import`,`${importFiles.length} Screenshot${importFiles.length===1?'':'s'} als Datenquelle`,'genau 1 Titelbild wird gespeichert',meta.id?`Angebots-ID ${meta.id}`:''].filter(Boolean).join(' · ');
      if(typeof openEditor==='function')openEditor(draft,info);
    }catch(err){
      alert(err.message||'Titelbild konnte nicht gespeichert werden.');
    }finally{
      q('#jsContinueImport').disabled=false;
      q('#jsContinueImport').textContent='Mit ausgewähltem Titelbild weiter';
    }
  }

  async function showCoverInEditor(item){
    ensureEditorCover();
    if(window.JennySellsCovers?.showInEditor)return window.JennySellsCovers.showInEditor(item);
    const box=q('#jsEditorCover'),img=box?.querySelector('img');
    if(!box||!img)return;
    const key=item?.coverImageKey||(item?.id===pendingItemId?pendingCover:null);
    if(!key){box.classList.remove('show');img.removeAttribute('src');return}
    try{
      const blob=await getImage(key);
      if(!blob){box.classList.remove('show');return}
      const old=objectUrls.get(img);if(old)URL.revokeObjectURL(old);
      const u=URL.createObjectURL(blob);objectUrls.set(img,u);img.src=u;box.classList.add('show');
    }catch{box.classList.remove('show')}
  }

  async function applyCovers(){
    if(window.JennySellsCovers?.schedule){window.JennySellsCovers.schedule();return;}
    if(typeof items==='undefined')return;
    const rows=qa('.itemOpen');
    for(const row of rows){
      const id=row.dataset.id;
      const item=items.find(x=>x.id===id);
      const thumb=row.querySelector('.thumb');
      if(!item?.coverImageKey||!thumb)continue;
      try{
        const blob=await getImage(item.coverImageKey);
        if(window.JennySellsCovers?.schedule){window.JennySellsCovers.schedule();return;}
        if(!blob)continue;
        const old=objectUrls.get(thumb);if(old)URL.revokeObjectURL(old);
        const u=URL.createObjectURL(blob);objectUrls.set(thumb,u);
        thumb.classList.add('hasCover');thumb.style.backgroundImage=`url("${u}")`;thumb.textContent='';
      }catch{}
    }
  }

  function patchCore(){
    if(typeof collect==='function'&&!collect.__v100){
      const previous=collect;
      const patched=function(){
        const r=previous();
        if(r.id===pendingItemId&&pendingCover)r.coverImageKey=pendingCover;
        return r;
      };
      patched.__v100=true;collect=patched;
    }
    if(typeof openEditor==='function'&&!openEditor.__v100){
      const previous=openEditor;
      const patched=function(item,note=''){
        const result=previous(item,note);
        setTimeout(()=>showCoverInEditor(item),0);
        return result;
      };
      patched.__v100=true;openEditor=patched;
    }
    const saveBtn=q('#saveItem');
    if(saveBtn&&!saveBtn.dataset.v100){
      saveBtn.dataset.v100='1';
      const previous=saveBtn.onclick;
      saveBtn.onclick=e=>{
        const id=q('#editId')?.value;
        if(previous)previous.call(saveBtn,e);
        if(id===pendingItemId&&!q('#editorBg')?.classList.contains('show')){pendingItemId=null;pendingCover=null}
        setTimeout(applyCovers,0);
      };
    }
    const delBtn=q('#confirmDelete');
    if(delBtn&&!delBtn.dataset.v100){
      delBtn.dataset.v100='1';
      const previous=delBtn.onclick;
      delBtn.onclick=e=>{
        const id=q('#editId')?.value;
        const item=typeof items!=='undefined'?items.find(x=>x.id===id):null;
        if(previous)previous.call(delBtn,e);
        if(item?.coverImageKey){const saved=window.JennySellsData?.whenSaved?.()||Promise.resolve();saved.then(()=>deleteImage(item.coverImageKey)).catch(err=>console.error('Cover deletion skipped, article save failed:',err));}
        setTimeout(applyCovers,0);
      };
    }
    if(typeof refresh==='function'&&!refresh.__v100){
      const previous=refresh;
      const patched=function(){const r=previous();setTimeout(applyCovers,0);return r};
      patched.__v100=true;refresh=patched;
    }
  }

  function setVersion(){const el=q('#appVersion');if(el)el.textContent='v'+VERSION}

  function run(){addStyles();ensureUi();patchCore();setVersion();setTimeout(applyCovers,0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,250);
})();