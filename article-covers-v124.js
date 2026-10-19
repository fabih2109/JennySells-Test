/* JennySells v0.11.7: IndexedDB thumbnail + demo image pipeline.
   Original image blobs stay in images store; article records and backups remain unchanged. */
(()=>{
'use strict';
const ROOT='/JennySells-Test/demo-images/';
const DB_NAME='JennySellsDB',DB_VERSION=2;
const resolved=new Map(),inflight=new Map();
let queued=false,editorTicket=0;
const q=s=>document.querySelector(s);

function demoPath(item){
 if(!item)return '';
 const match=/^demo(\d{1,2})$/.exec(String(item.id??''));
 if(match){const n=Number(match[1]);if(n>=0&&n<20)return ROOT+'article-'+String(n+1).padStart(2,'0')+'.svg';}
 const path=String(item.demoImage||'');
 return /^\/JennySells-Test\/demo-images\/article-(?:0[1-9]|1\d|20)\.svg$/.test(path)?path:'';
}
function makeKeyList(item){
 if(!item)return [];
 const keys=[];
 if(typeof item.coverImageKey==='string'&&item.coverImageKey.trim())keys.push(item.coverImageKey.trim());
 // Repair the display of an older imported record whose key was not copied to the article.
 if(item.id&&(!/^demo\d{1,2}$/.test(String(item.id)))){
  const fallback='cover:'+String(item.id);
  if(!keys.includes(fallback))keys.push(fallback);
 }
 return keys;
}
function readImageBlob(key){
 return new Promise((resolve,reject)=>{
  let db;
  let settled=false;
  function settle(err,value){
   if(settled)return;settled=true;
   try{db?.close();}catch{}
   if(err)reject(err);else resolve(value||null);
  }
  let open;
  try{open=indexedDB.open(DB_NAME,DB_VERSION);}catch(e){reject(e);return;}
  open.onerror=()=>settle(open.error||new Error('IndexedDB konnte nicht geöffnet werden'));
  open.onblocked=()=>settle(new Error('IndexedDB wird blockiert'));
  open.onsuccess=()=>{
   db=open.result;
   try{
    const tx=db.transaction('images','readonly');
    const get=tx.objectStore('images').get(key);
    get.onsuccess=()=>settle(null,get.result?.blob||null);
    get.onerror=()=>settle(get.error||new Error('Bild konnte nicht geladen werden'));
    tx.onabort=()=>settle(tx.error||new Error('Bildzugriff wurde abgebrochen'));
   }catch(e){settle(e);}
  };
 });
}
function imageUrlForKey(key){
 if(resolved.has(key))return Promise.resolve(resolved.get(key));
 if(inflight.has(key))return inflight.get(key);
 const task=readImageBlob(key).then(blob=>{
  if(!blob||typeof blob.size!=='number')return null;
  const src=URL.createObjectURL(blob);
  resolved.set(key,src);
  return src;
 }).catch(error=>{
  console.warn('JennySells: Bild konnte nicht gelesen werden:',key,error);
  return null;
 }).finally(()=>{inflight.delete(key);});
 inflight.set(key,task);
 return task;
}
async function imageForItem(item){
 for(const key of makeKeyList(item)){
  const src=await imageUrlForKey(key);
  if(src)return {src,key,source:'indexeddb'};
 }
 const fallback=demoPath(item);
 return fallback?{src:fallback,key:'',source:'demo'}:null;
}
function showImageInThumb(thumb,item){
 if(!thumb||!item)return;
 const keys=makeKeyList(item);
 const wanted=keys.join('\n')+'|'+demoPath(item)+'|'+String(item.emoji||'');
 if(thumb.dataset.jsCoverSignature===wanted&&thumb.querySelector('.jsArticleCoverImg'))return;
 thumb.dataset.jsCoverSignature=wanted;
 thumb.classList.add('jsArticleThumb');
 thumb.classList.remove('hasCover');
 thumb.style.backgroundImage='none';
 const emoji=document.createElement('span');
 emoji.className='jsArticleThumbFallback';
 emoji.textContent=item.emoji||'👕';
 const img=document.createElement('img');
 img.className='jsArticleCoverImg';
 img.alt='';
 img.loading='eager';
 img.decoding='async';
 img.draggable=false;
 img.style.opacity='0';
 thumb.replaceChildren(emoji,img);
 const loadTicket=wanted;
 const accept=ref=>{
  if(!ref||!thumb.isConnected||thumb.dataset.jsCoverSignature!==loadTicket)return;
  img.onload=()=>{
   if(thumb.dataset.jsCoverSignature!==loadTicket)return;
   img.classList.add('ready');
   img.style.opacity='1';
   emoji.hidden=true;
   thumb.dataset.jsImageSource=ref.source;
  };
  img.onerror=()=>{
   if(thumb.dataset.jsCoverSignature!==loadTicket)return;
   img.style.opacity='0';emoji.hidden=false;
   thumb.dataset.jsImageSource='error';
  };
  img.src=ref.src;
  if(img.complete&&img.naturalWidth>0)img.onload();
 };
 imageForItem(item).then(accept).catch(e=>console.warn('JennySells: Artikelvorschau',e));
}
function syncAll(){
 queued=false;
 if(typeof items==='undefined'||!Array.isArray(items))return;
 const byId=new Map(items.map(item=>[String(item.id),item]));
 document.querySelectorAll('.itemOpen').forEach(row=>{
  const item=byId.get(row.dataset.id),thumb=row.querySelector('.thumb');
  if(item&&thumb)showImageInThumb(thumb,item);
 });
}
function schedule(){
 if(queued)return;
 queued=true;
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(syncAll);
 else Promise.resolve().then(syncAll);
}
async function showInEditor(item){
 const ticket=++editorTicket;
 const box=q('#jsEditorCover'),img=box?.querySelector('img');
 if(!box||!img)return;
 box.classList.remove('show');
 img.removeAttribute('src');
 img.style.opacity='0';
 box.dataset.jsImageKind='';
 const label=box.querySelector('b');
 const hint=box.querySelector('span');
 if(label)label.textContent='Titelbild';
 if(hint)hint.textContent='Wird lokal auf diesem Gerät gespeichert.';
 const reference=await imageForItem(item);
 if(ticket!==editorTicket||!box.isConnected)return;
 const editingId=q('#editId')?.value;
 if(editingId&&item?.id&&editingId!==String(item.id))return;
 if(!reference)return;
 img.onload=()=>{
  if(ticket!==editorTicket)return;
  img.style.opacity='1';
  box.classList.add('show');
 };
 img.onerror=()=>{if(ticket!==editorTicket)return;box.classList.remove('show');};
 if(label)label.textContent=reference.source==='demo'?'Beispielbild':'Titelbild';
 if(hint)hint.textContent=reference.source==='demo'?'Demonstrationsbild – kein echtes Produktfoto.':'Lokal gespeichertes Artikelbild.';
 box.dataset.jsImageKind=reference.source;
 img.src=reference.src;
 if(img.complete&&img.naturalWidth>0)img.onload();
}
function attach(){
 if(typeof bindRows==='function'&&!bindRows.__jsCovers){
  const prev=bindRows;
  const wrapped=function(...args){const result=prev.apply(this,args);schedule();return result;};
  wrapped.__jsCovers=true;bindRows=wrapped;
 }
 const root=q('.app')||document.body;
 if(typeof MutationObserver==='function'&&root){
  const obs=new MutationObserver(changes=>{
   if(changes.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.itemOpen')||node.querySelector?.('.itemOpen')))))schedule();
  });
  obs.observe(root,{childList:true,subtree:true});
 }
 schedule();
}
window.JennySellsCovers={demoPath,imageForItem,showInEditor,syncAll,schedule};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
else attach();
})();