(()=>{
  const VERSION='0.10.0-test';
  const DB_NAME='JennySellsDB';
  const DB_VERSION=1;
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
    if(!key) return null;
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
      .jsImportLead{font-size:11px;line-height:1.45;color:#817486;margin:8px 0 12px}
      .jsImportStep{background:#faf6fb;border:1px solid #eee4ed;border-radius:17px;padding:12px;margin:9px 0}.jsImportStep h3{font:800 15px Georgia,serif;margin:0 0 7px}.jsImportStep p{font-size:10.5px;color:#817486;line-height:1.4;margin:4px 0 9px}
      .jsImportBtn{width:100%;border:0;border-radius:13px;padding:12px;background:#f0e3f5;color:#704289;font-weight:800;text-align:center}.jsImportBtn.primary{background:#71389b;color:#fff}.jsImportBtn:disabled{opacity:.45}
      .jsImportUrl{font-size:10px;word-break:break-all;background:#fff;border:1px solid #eadfee;border-radius:12px;padding:9px;margin-top:8px;color:#62566a}
      .jsShots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.jsShot{position:relative;border:2px solid #eadfee;border-radius:15px;padding:6px;background:#fff}.jsShot.selected{border-color:#71389b;box-shadow:0 0 0 2px #eadcf2}.jsShot img{display:block;width:100%;aspect-ratio:.9;object-fit:cover;border-radius:10px;background:#f4eef5}.jsShot label{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;margin:7px 2px 1px;color:#5e4d64}.jsShot input{accent-color:#71389b}.jsShot small{display:block;color:#8a7c8e;font-size:9px;margin:2px}
      .jsImportStatus{font-size:10.5px;border-radius:12px;padding:9px;background:#edf8f1;color:#277147;margin-top:8px}.jsImportStatus.warn{background:#fff4e5;color:#8d621f}
      .jsCoverPreview{display:none;align-items:center;gap:10px;background:#faf6fb;border:1px solid #eee4ed;border-radius:14px;padding:8px;margin:0 0 10px}.jsCoverPreview.show{display:flex}.jsCoverPreview img{width:66px;height:74px;object-fit:cover;border-radius:10px}.jsCoverPreview div{font-size:10px;color:#817486}.jsCoverPreview b{display:block;color:#4f3f55;font-size:11px;margin-bottom:3px}
      .row .thumb.hasCover{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;color:transparent!important}
      @media(max-width:370px){.jsShots{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureUi(){
    if(!q('#vintedImportLaunch')){
      const hero=q('#home .hero');
      if(hero){
        const b=document.createElement('button');
        b.id='vintedImportLaunch';
        b.className='jsImportLaunch';
        b.innerHTML='<b>📷 Von Vinted importieren</b><span>Link übernehmen + mehrere Screenshots auswerten</span>';
        hero.insertAdjacentElement('afterend',b);
        b.onclick=openImport;
      }
    }
    if(!q('#jsImportBg')){
      const m=document.createElement('div');
      m.id='jsImportBg';
      m.className='jsImportBg';
      m.innerHTML=`<div class="jsImportSheet">
        <div class="jsImportHead"><h2>Vinted importieren</h2><button class="jsImportClose" id="jsImportClose">×</button></div>
        <div class="jsImportLead">Mehrere Screenshots dürfen als Importquelle dienen. Für den Artikel wird am Ende genau ein Titelbild gespeichert; die übrigen Bildausschnitte werden verworfen.</div>
        <div class="jsImportStep"><h3>1 · Vinted-Link</h3><p>Link in Vinted kopieren und hier direkt aus der Zwischenablage übernehmen.</p><button class="jsImportBtn" id="jsReadClipboard">Link aus Zwischenablage übernehmen</button><div class="jsImportUrl" id="jsImportUrl">Noch kein Link übernommen.</div></div>
        <div class="jsImportStep"><h3>2 · Screenshots</h3><p>Wähle 1 bis mehrere Screenshots desselben Vinted-Artikels. Alle bleiben während des Imports als Informationsquelle verfügbar.</p><input id="jsShotInput" type="file" accept="image/*" multiple hidden><button class="jsImportBtn" id="jsChooseShots">Screenshots auswählen</button><div id="jsShotStatus" class="jsImportStatus warn">Noch keine Screenshots ausgewählt.</div><div class="jsShots" id="jsShots"></div></div>
        <div class="jsImportStep"><h3>3 · Titelbild auswählen</h3><p>Aus jedem Screenshot wird ein temporärer Bildausschnitt erzeugt. Wähle genau einen als Titelbild. Nur dieser wird dauerhaft in JennySells gespeichert.</p><div id="jsCoverHint" class="jsImportStatus warn">Zuerst Screenshots auswählen.</div></div>
        <button class="jsImportBtn primary" id="jsContinueImport" disabled>Mit ausgewähltem Titelbild weiter</button>
      </div>`;
      document.body.appendChild(m);
      q('#jsImportClose').onclick=closeImport;
      m.onclick=e=>{if(e.target===m)closeImport()};
      q('#jsReadClipboard').onclick=readClipboard;
      q('#jsChooseShots').onclick=()=>q('#jsShotInput').click();
      q('#jsShotInput').onchange=e=>handleFiles(e.target.files);
      q('#jsContinueImport').onclick=continueImport;
    }
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
    q('#jsShotInput').value='';
    q('#jsShots').innerHTML='';
    q('#jsShotStatus').className='jsImportStatus warn';
    q('#jsShotStatus').textContent='Noch keine Screenshots ausgewählt.';
    q('#jsCoverHint').className='jsImportStatus warn';
    q('#jsCoverHint').textContent='Zuerst Screenshots auswählen.';
    q('#jsContinueImport').disabled=true;
  }

  function openImport(){
    resetImport();
    q('#jsImportUrl').textContent='Noch kein Link übernommen.';
    q('#jsImportUrl').dataset.url='';
    q('#jsImportBg').classList.add('show');
  }

  function closeImport(){q('#jsImportBg').classList.remove('show')}

  function findVintedUrl(text=''){
    const m=String(text).match(/https?:\/\/(?:www\.)?vinted\.[^\s/]+\/items\/\d+[^\s]*/i);
    return m?m[0].replace(/[),.;]+$/,''):'';
  }

  async function readClipboard(){
    const out=q('#jsImportUrl');
    try{
      const text=await navigator.clipboard.readText();
      const url=findVintedUrl(text);
      if(!url) throw new Error('Kein Vinted-Link in der Zwischenablage gefunden.');
      out.textContent=url;out.dataset.url=url;
    }catch(err){
      out.textContent=err.message||'Zwischenablage konnte nicht gelesen werden. Link bitte erneut in Vinted kopieren.';
      out.dataset.url='';
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
    if(!blob) throw new Error('Bildausschnitt konnte nicht erstellt werden.');
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
      for(let i=0;i<importFiles.length;i++) importCandidates.push(await makeCandidate(importFiles[i],i));
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

  function parseUrl(url){
    const idm=url.match(/\/items\/(\d+)-?([^/?#]*)/i);
    const slug=idm&&idm[2]?decodeURIComponent(idm[2]).replace(/-/g,' ').replace(/\bgrosse\b/gi,'Größe'):'';
    const size=(slug.match(/(?:Größe|Gr\.?)\s*(\d{2,3})/i)||[])[1]||'';
    const words=slug.trim().split(/\s+/).filter(Boolean);
    let brand='';
    if(words.length) brand=words[0].replace(/^ca$/i,'C&A');
    return {id:idm?idm[1]:'',slug,size,brand};
  }

  async function continueImport(){
    if(!importCandidates.length)return;
    const chosen=importCandidates[selectedCandidate]||importCandidates[0];
    const url=q('#jsImportUrl').dataset.url||'';
    const parsed=parseUrl(url);
    const draft=typeof blank==='function'?blank():{id:Date.now().toString(36),createdAt:new Date().toISOString()};
    draft.source='Vinted';
    draft.url=url;
    draft.title=parsed.slug||'Vinted-Artikel';
    draft.brand=parsed.brand;
    draft.size=parsed.size;
    draft.onlineSince=typeof today==='function'?today():new Date().toISOString().slice(0,10);
    const key='cover:'+draft.id;
    q('#jsContinueImport').disabled=true;
    q('#jsContinueImport').textContent='Titelbild wird gespeichert …';
    try{
      await putImage(key,chosen.blob);
      pendingCover=key;
      pendingItemId=draft.id;
      draft.coverImageKey=key;
      closeImport();
      if(typeof openEditor==='function') openEditor(draft,`Vinted-Import · ${importFiles.length} Screenshot${importFiles.length===1?'':'s'} als Datenquelle · genau 1 Titelbild wird gespeichert${parsed.id?' · Artikel-ID '+parsed.id:''}`);
    }catch(err){
      q('#jsCoverHint').className='jsImportStatus warn';
      q('#jsCoverHint').textContent='Titelbild konnte nicht lokal gespeichert werden.';
    }finally{
      q('#jsContinueImport').disabled=false;
      q('#jsContinueImport').textContent='Mit ausgewähltem Titelbild weiter';
    }
  }

  async function showCoverInEditor(item){
    ensureEditorCover();
    const box=q('#jsEditorCover'),img=box?.querySelector('img');
    if(!box||!img){return}
    const key=item?.coverImageKey || (item?.id===pendingItemId?pendingCover:null);
    if(!key){box.classList.remove('show');img.removeAttribute('src');return}
    try{
      const blob=await getImage(key);
      if(!blob){box.classList.remove('show');return}
      const u=URL.createObjectURL(blob);
      img.onload=()=>URL.revokeObjectURL(u);
      img.src=u;box.classList.add('show');
    }catch{box.classList.remove('show')}
  }

  async function applyCovers(){
    if(typeof items==='undefined')return;
    for(const item of items){
      if(!item.coverImageKey)continue;
      const row=q(`.itemOpen[data-id="${CSS.escape(item.id)}"]`);
      const thumb=row?.querySelector('.thumb');
      if(!thumb)continue;
      try{
        let u=objectUrls.get(item.coverImageKey);
        if(!u){const blob=await getImage(item.coverImageKey);if(!blob)continue;u=URL.createObjectURL(blob);objectUrls.set(item.coverImageKey,u)}
        thumb.textContent='';thumb.classList.add('hasCover');thumb.style.backgroundImage=`url("${u}")`;
      }catch{}
    }
  }

  function patchCore(){
    if(typeof collect==='function' && !collect.__v100){
      const previous=collect;
      const patched=function(){
        const r=previous();
        if(r.id===pendingItemId && pendingCover) r.coverImageKey=pendingCover;
        return r;
      };
      patched.__v100=true;collect=patched;
    }
    if(typeof openEditor==='function' && !openEditor.__v100){
      const previous=openEditor;
      const patched=function(i,note){const out=previous(i,note);setTimeout(()=>showCoverInEditor(i),0);return out};
      patched.__v100=true;openEditor=patched;
    }
    if(typeof refresh==='function' && !refresh.__v100){
      const previous=refresh;
      const patched=function(){const out=previous();setTimeout(applyCovers,0);return out};
      patched.__v100=true;refresh=patched;
    }
    const saveBtn=q('#saveItem');
    if(saveBtn && !saveBtn.dataset.v100){
      saveBtn.dataset.v100='1';
      const previous=saveBtn.onclick;
      saveBtn.onclick=e=>{
        const id=q('#editId')?.value;
        if(previous) previous.call(saveBtn,e);
        if(id===pendingItemId){pendingItemId=null;pendingCover=null}
        setTimeout(applyCovers,0);
      };
    }
    const delBtn=q('#deleteItem');
    if(delBtn && !delBtn.dataset.v100){
      delBtn.dataset.v100='1';
      const previous=delBtn.onclick;
      delBtn.onclick=e=>{
        const id=q('#editId')?.value;
        const item=typeof items!=='undefined'?items.find(x=>x.id===id):null;
        const key=item?.coverImageKey;
        if(previous) previous.call(delBtn,e);
        if(key) deleteImage(key).catch(()=>{});
      };
    }
  }

  function setVersion(){const el=q('#appVersion');if(el)el.textContent='v'+VERSION}

  function run(){addStyles();ensureUi();patchCore();setVersion();setTimeout(applyCovers,0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,250);setTimeout(run,900);
})();