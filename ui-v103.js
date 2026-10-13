(()=>{
  const VERSION='0.10.3-test';
  const DB_NAME='JennySellsDB';
  const DB_VERSION=1;
  const IMAGE_STORE='images';
  let files=[];
  let crops=[];
  let cropRun=0;
  const previewUrls=[];
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function source(){return q('#jsImportUrl')?.dataset?.source||''}
  function revokePreviews(){while(previewUrls.length){try{URL.revokeObjectURL(previewUrls.pop())}catch{}}}
  function loadImage(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Bild konnte nicht gelesen werden.'))};img.src=u})}

  function rowMean(data,w,y,x0,x1){
    let s=0,n=0;
    for(let x=x0;x<x1;x+=2){const i=(y*w+x)*4;s+=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722);n++}
    return n?s/n:0;
  }
  function meanRange(arr,a,b){a=Math.max(0,a);b=Math.min(arr.length,b);let s=0,n=0;for(let i=a;i<b;i++){s+=arr[i];n++}return n?s/n:0}

  // Kleinanzeigen often shows the product photo first and a dark/light information card below it.
  // Detect a strong brightness transition; if it is not reliable, use a conservative photo-only fallback.
  function detectKleinanzeigenBottom(img){
    const sw=180, sh=Math.max(1,Math.round(img.naturalHeight*sw/img.naturalWidth));
    const c=document.createElement('canvas');c.width=sw;c.height=sh;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,sw,sh);
    const d=ctx.getImageData(0,0,sw,sh).data;
    const x0=Math.round(sw*.12),x1=Math.round(sw*.88);
    const means=[];for(let y=0;y<sh;y++)means.push(rowMean(d,sw,y,x0,x1));
    const from=Math.round(sh*.24),to=Math.round(sh*.58);
    let bestY=-1,bestScore=0;
    for(let y=from;y<to;y++){
      const above=meanRange(means,y-14,y-3),below=meanRange(means,y+3,y+16);
      const drop=above-below;
      // A UI information block is usually much flatter/darker than the photo above it.
      if(drop>bestScore && drop>24 && below<125){bestScore=drop;bestY=y}
    }
    if(bestY>0){
      const ratio=bestY/sh;
      if(ratio>=.30&&ratio<=.52)return ratio;
    }
    return .41;
  }

  async function makeCrop(file,index){
    const img=await loadImage(file),iw=img.naturalWidth,ih=img.naturalHeight;
    if(ih<=iw*1.12)return null;
    let top=.075,bottom=.41;
    if(source()==='Kleinanzeigen')bottom=detectKleinanzeigenBottom(img);
    else return null; // v0.10.3 intentionally fixes Kleinanzeigen only; other platform profiles stay in v0.10.2.
    bottom=Math.max(top+.18,Math.min(bottom,.52));
    const y=Math.round(ih*top),cropH=Math.max(1,Math.round(ih*(bottom-top)));
    const maxW=1000,scale=Math.min(1,maxW/iw);
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(iw*scale));c.height=Math.max(1,Math.round(cropH*scale));
    const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(img,0,y,iw,cropH,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.91));
    return blob?{index,blob,top,bottom}:null;
  }

  function showFinalPreviews(){
    if(source()!=='Kleinanzeigen'||!crops.length)return;
    revokePreviews();
    const shots=qa('#jsShots .jsShot');
    crops.forEach((crop,i)=>{
      if(!crop)return;
      const img=shots[i]?.querySelector('img');if(!img)return;
      const u=URL.createObjectURL(crop.blob);previewUrls.push(u);img.src=u;
      const small=shots[i].querySelector('small');
      if(small)small.textContent=`Screenshot ${i+1} · finaler Auto-Crop`;
    });
    const hint=q('#jsCoverHint');
    if(hint){hint.className='jsImportStatus';hint.textContent='Die Vorschau zeigt jetzt den finalen Kleinanzeigen-Titelbild-Ausschnitt. Der Text-/Preisblock wird nicht mitgespeichert.'}
  }

  async function prepare(list){
    files=[...list].filter(f=>f.type?.startsWith('image/'));crops=[];
    if(!files.length||source()!=='Kleinanzeigen')return;
    const my=++cropRun;
    try{
      for(let i=0;i<files.length;i++)crops[i]=await makeCrop(files[i],i);
      if(my!==cropRun)return;
      // v0.10.1 renders its candidates asynchronously; refresh the displayed preview after it is done.
      setTimeout(showFinalPreviews,120);
      setTimeout(showFinalPreviews,450);
    }catch(e){console.warn('Kleinanzeigen crop v0.10.3 failed',e)}
  }

  function selectedIndex(){const r=q('input[name="jsCover"]:checked');return r?Number(r.value)||0:0}
  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IMAGE_STORE))db.createObjectStore(IMAGE_STORE,{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function putCover(key,blob){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(IMAGE_STORE,'readwrite');tx.objectStore(IMAGE_STORE).put({key,blob,createdAt:new Date().toISOString(),cropVersion:VERSION});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  async function waitEditor(){for(let i=0;i<35;i++){const id=q('#editId')?.value;if(id&&q('#editorBg')?.classList.contains('show'))return id;await new Promise(r=>setTimeout(r,70))}return q('#editId')?.value||''}

  async function applyFinalCrop(){
    if(source()!=='Kleinanzeigen'||!crops.length)return;
    const crop=crops[selectedIndex()]||crops.find(Boolean);if(!crop)return;
    const id=await waitEditor();if(!id)return;
    // Run after v0.10.2 so this is the final stored title image.
    await new Promise(r=>setTimeout(r,180));
    try{
      await putCover('cover:'+id,crop.blob);
      const img=q('#jsEditorCover img'),box=q('#jsEditorCover');
      if(img&&box){const u=URL.createObjectURL(crop.blob);previewUrls.push(u);img.src=u;box.classList.add('show')}
      const note=q('#importNote');
      if(note&&!note.textContent.includes('Titelbild zugeschnitten'))note.textContent += ' · Titelbild zugeschnitten';
    }catch(e){console.warn('Final crop save failed',e)}
  }

  function setVersion(){const el=q('#appVersion');if(el)el.textContent='v'+VERSION}
  function hook(){
    const input=q('#jsShotInput');
    if(input&&!input.dataset.v103){input.dataset.v103='1';input.addEventListener('change',e=>prepare(e.target.files))}
    const cont=q('#jsContinueImport');
    if(cont&&!cont.dataset.v103){cont.dataset.v103='1';cont.addEventListener('click',()=>setTimeout(applyFinalCrop,260))}
    const launch=q('#marketImportLaunch');
    if(launch&&!launch.dataset.v103){launch.dataset.v103='1';launch.addEventListener('click',()=>{files=[];crops=[];cropRun++;revokePreviews()})}
    setVersion();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  setTimeout(hook,300);
})();