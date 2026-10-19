/* JennySells v0.11.6 – reliable article thumbnails.
   The existing coverImageKey remains the canonical IndexedDB image reference.
   Existing demo IDs resolve to twenty bundled vector preview images.
*/
(()=>{
  'use strict';
  const DB_NAME='JennySellsDB',DB_VERSION=2;
  const ROOT='/JennySells-Test/demo-images/';
  const covers=new Map();
  let queued=false;
  const query=s=>document.querySelector(s);

  function demoPath(item){
    if(!item)return '';
    const match=/^demo(\d{1,2})$/.exec(String(item.id??''));
    if(match){
      const n=Number(match[1]);
      if(n>=0&&n<20)return ROOT+'article-'+String(n+1).padStart(2,'0')+'.svg';
    }
    const path=String(item.demoImage||'');
    return /^\/JennySells-Test\/demo-images\/article-(?:0[1-9]|1\d|20)\.svg$/.test(path)?path:'';
  }

  function getCoverUrl(key){
    if(!key)return Promise.resolve(null);
    if(covers.has(key))return covers.get(key);
    const work=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onerror=()=>reject(request.error||new Error('IndexedDB konnte nicht geöffnet werden'));
      request.onsuccess=()=>{
        const db=request.result;
        let finished=false;
        const done=(err,blob)=>{
          if(finished)return;finished=true;
          try{db.close();}catch{}
          if(err)reject(err);
          else resolve(blob instanceof Blob?URL.createObjectURL(blob):null);
        };
        try{
          const tx=db.transaction('images','readonly');
          const get=tx.objectStore('images').get(key);
          get.onsuccess=()=>done(null,get.result?.blob);
          get.onerror=()=>done(get.error||new Error('Titelbild konnte nicht gelesen werden'));
          tx.onabort=()=>done(tx.error||new Error('Bilddatenbank wurde unterbrochen'));
        }catch(e){done(e);}
      };
    }).catch(err=>{
      covers.delete(key);
      console.warn('JennySells: Titelbild konnte nicht geladen werden',err);
      return null;
    });
    covers.set(key,work);
    return work;
  }

  function paint(thumb,item){
    if(!thumb||!item)return;
    const key=typeof item.coverImageKey==='string'?item.coverImageKey.trim():'';
    const illustration=key?'':demoPath(item);
    const token=key?'db:'+key:illustration?'demo:'+illustration:'noimage:'+String(item.emoji||'👕');
    if(thumb.dataset.jsCoverToken===token && thumb.querySelector('.jsArticleThumbImage'))return;
    thumb.dataset.jsCoverToken=token;
    thumb.classList.add('jsArticleThumb');
    thumb.classList.remove('hasCover');
    thumb.style.backgroundImage='none';

    const fallback=document.createElement('span');
    fallback.className='jsArticleThumbFallback';
    fallback.textContent=item.emoji||'👕';
    const img=document.createElement('img');
    img.className='jsArticleThumbImage';
    img.alt='';
    img.loading='lazy';
    img.decoding='async';
    img.hidden=true;
    thumb.replaceChildren(fallback,img);

    function finish(src){
      if(!src||!thumb.isConnected||thumb.dataset.jsCoverToken!==token)return;
      img.onload=()=>{
        if(thumb.dataset.jsCoverToken!==token)return;
        img.hidden=false;
        fallback.hidden=true;
      };
      img.onerror=()=>{
        if(thumb.dataset.jsCoverToken!==token)return;
        img.hidden=true;
        fallback.hidden=false;
      };
      img.src=src;
      if(img.complete&&img.naturalWidth>0)img.onload();
    }

    if(key)getCoverUrl(key).then(finish);
    else if(illustration)finish(illustration);
  }

  function syncAll(){
    queued=false;
    if(typeof items==='undefined'||!Array.isArray(items))return;
    const map=new Map(items.map(item=>[String(item.id),item]));
    document.querySelectorAll('.itemOpen').forEach(row=>{
      const item=map.get(row.dataset.id);
      const thumb=row.querySelector('.thumb');
      if(item&&thumb)paint(thumb,item);
    });
  }
  function schedule(){
    if(queued)return;
    queued=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(syncAll);
    else Promise.resolve().then(syncAll);
  }
  function attach(){
    if(typeof bindRows==='function'&&!bindRows.__jsCovers){
      const previous=bindRows;
      const wrapped=function(...args){
        const result=previous.apply(this,args);
        schedule();
        return result;
      };
      wrapped.__jsCovers=true;
      bindRows=wrapped;
    }
    const root=query('.app')||document.body;
    if(typeof MutationObserver==='function'&&root){
      const observer=new MutationObserver(changes=>{
        for(const mutation of changes){
          if([...mutation.addedNodes].some(node=>
            node.nodeType===1&&(node.matches?.('.itemOpen')||node.querySelector?.('.itemOpen'))
          )){schedule();break;}
        }
      });
      observer.observe(root,{childList:true,subtree:true});
    }
    schedule();
  }

  window.JennySellsCovers={demoPath,syncAll,schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();