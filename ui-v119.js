/* JennySells v0.11.2: Jennylicious-like navigation, safe article viewer, single plus menu. */
(()=>{
  'use strict';
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euro=n=>Number(n??0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const fmtDate=x=>{
    if(!x)return '–';
    const d=new Date(/^\d{4}-\d\d-\d\d$/.test(x)?x+'T12:00:00':x);
    return Number.isNaN(d.valueOf())?String(x):d.toLocaleDateString('de-DE');
  };
  const svg=(name)=>name==='pencil'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 2-2a2.1 2.1 0 0 0-3-3l-2 2-7 7-1 4z"/><path d="m16 9 3 3"/></svg>':
    name==='file'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>':
    name==='camera'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></svg>':'';

  let started=false,shownId=null,coverURL='',lastFocus=null,latestOrigin='home';

  function editRoute(){
    const el=q('#settings .jsMoreWelcome h1');
    if(el)el.textContent='Mehr';
    q('#settings .jsMoreWelcome p')?.remove();
    const nav=q('.bottom [data-go="settings"]');
    if(nav){
      nav.innerHTML='<span class="jsMoreNavIcon" aria-hidden="true">☰</span>Mehr';
      nav.setAttribute('aria-label','Mehr');
    }
    q('#settings [data-more-action="import"]')?.remove();
    const reset=q('#resetDemoSettings');
    if(reset){const advanced=q('#jsDataAdvanced');if(advanced){advanced.appendChild(reset);reset.classList.add('jsAdvancedReset');}}
    q('#settings [data-more-section="app"]')?.remove();
    q('#settings [data-more-panel="app"]')?.remove();
    q('#settings .jsMorePanel[data-more-panel="about"]')?.replaceChildren();
    const about=q('#settings .jsMorePanel[data-more-panel="about"]');
    if(about){
      about.innerHTML='<div class="jsAboutCard">'+
        '<div class="jsAboutHeart" aria-hidden="true">♥</div>'+
        '<h3>JennySells</h3><div class="jsAboutMotto">SHOPPING MIT HERZ</div>'+
        '<div class="jsAboutVersion">Version v0.11.7-test</div>'+
        '</div>';
    }
    const menuTitle=q('#settings .jsMoreDetailTop h2');
    const titleRow=q('#settings .jsMoreDetailTop');
    if(menuTitle&&titleRow&&!titleRow.querySelector('.jsDetailHeader')){
      const mini=document.createElement('div');mini.className='jsDetailHeader';
      const back=q('#jsMoreBack');
      if(back){
        back.textContent='‹';
        back.setAttribute('aria-label','Zurück zu Mehr');
        back.classList.add('jsCircleBack');
        mini.appendChild(back);
      }
      const labels=document.createElement('div');labels.className='jsDetailHeading';
      const cap=document.createElement('div');cap.className='jsDetailEyebrow';cap.textContent='JENN YSELLS'.replace(' ','');
      mini.appendChild(labels);labels.appendChild(cap);
      labels.appendChild(menuTitle);
      titleRow.insertBefore(mini,titleRow.firstChild);
    }
    const head=q('#settings .jsMoreDetailTop .jsMoreSubtitle');
    if(head)head.hidden=true;
  }
  function relocateSearch(){
    const bar=q('.app > .search')||q('.app .search');
    const page=q('#items');
    if(bar&&page){const hero=page.querySelector('.hero');hero?hero.insertAdjacentElement('afterend',bar):page.prepend(bar);bar.classList.add('jsSearchOnly');}
    const title=page?.querySelector('.hero h1');if(title)title.textContent='Suche';
    const sub=page?.querySelector('.hero p');if(sub)sub.textContent='Finde deine Artikel – filtern, ansehen oder bearbeiten';
    const field=q('#globalSearch');if(field)field.oninput=()=>{if(typeof renderItems==='function')renderItems();};
  }
  function ensurePlus(){
    if(q('#jsPlusMenu'))return;
    const bg=document.createElement('div');bg.className='jsJDialog';bg.id='jsPlusMenu';bg.hidden=true;
    bg.innerHTML='<div class="jsJDialogSheet" role="dialog" aria-modal="true" aria-labelledby="jsPlusTitle">'+
      '<div class="jsJDialogTop"><h2 id="jsPlusTitle">Artikel hinzufügen</h2><button class="jsCircleBack" id="jsPlusClose" aria-label="Zurück">‹</button></div>'+
      '<p>Wie möchtest du deinen Verkaufsartikel anlegen?</p>'+
      '<button class="jsPlusOption" id="jsCreateManual" type="button"><span class="jsPlusOptionIcon">'+svg('file')+'</span><span><b>Manuell erstellen</b><small>Artikeldaten selbst eingeben</small></span><i>›</i></button>'+
      '<button class="jsPlusOption" id="jsCreateImport" type="button"><span class="jsPlusOptionIcon">'+svg('camera')+'</span><span><b>Über Link & Fotos importieren</b><small>Link und Screenshots auswerten</small></span><i>›</i></button>'+
      '</div>';
    document.body.appendChild(bg);
    const close=()=>{bg.hidden=true;document.body.classList.remove('jsOverlayOpen');q('#navAdd')?.focus();};
    bg.addEventListener('click',e=>{if(e.target===bg)close();});
    q('#jsPlusClose').onclick=close;
    q('#jsCreateManual').onclick=()=>{close();if(typeof openEditor==='function')openEditor();};
    q('#jsCreateImport').onclick=()=>{
      close();
      const launch=q('#marketImportLaunch');
      if(launch)launch.click();
      else window.alert('Der Screenshot-Import ist derzeit nicht verfügbar.');
    };
    const btn=q('#navAdd');
    if(btn){btn.onclick=()=>{lastFocus=document.activeElement;bg.hidden=false;q('#jsCreateManual')?.focus();};btn.setAttribute('aria-label','Artikel hinzufügen – Optionen wählen');}
  }
  function getItem(id){return (typeof items!=='undefined'&&Array.isArray(items)?items:[]).find(i=>String(i.id)===String(id));}
  function detailRow(name,val,optional=false){
    if(optional&&(val===null||val===undefined||String(val).trim()===''))return '';
    return '<div class="jsViewerDataRow"><span>'+esc(name)+'</span><strong>'+esc(val===null||val===undefined||val===''?'–':val)+'</strong></div>';
  }
  function renderDetail(item){
    const main=q('#jsViewContent');if(!main)return;
    const source=item.source||'Privat';
    const sold=item.status==='sold',p=item.price===null||item.price===undefined?'–':euro(item.price);
    const inPackage=sold&&(item.saleType==='package'||item.soldInPackage);
    const status=typeof statusLabel==='function'?statusLabel(item.status||'online'):item.status||'Online';
    const amount=sold?euro(Number(item.soldPrice||0)-Number(item.shipping||0)-Number(item.fees||0)):p;
    const url=(()=>{try{const u=new URL(item.url);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}})();
    const demoPhoto=window.JennySellsCovers?.demoPath?.(item)||'';
    const photo=item.coverImageKey?'<img class="jsViewerCover" id="jsViewerCover" alt="Titelbild des Artikels" hidden><span id="jsViewerCoverFallback">'+esc(item.emoji||'♡')+'</span>':
      demoPhoto?'<img class="jsViewerCover" src="'+esc(demoPhoto)+'" alt="Beispielbild zum Artikel" loading="eager">':
      '<span id="jsViewerCoverFallback">'+esc(item.emoji||'♡')+'</span>';
    main.innerHTML=
      '<div class="jsViewerPhoto">'+photo+'</div>'+
      '<div class="jsViewerInfo">'+
       '<div class="jsViewerStatus"><span>'+esc(source)+'</span><span class="jsViewerStatusPill">'+esc(status)+'</span></div>'+
       '<h3>'+esc(item.title||'Unbenannter Artikel')+'</h3>'+
       '<div class="jsViewerPrice">'+amount+'</div>'+ 
       (inPackage?'<div class="jsViewerPackageInfo">📦 Im Paket verkauft · anteiliger Verkaufspreis</div>':'')+
       '<div class="jsViewerData">'+
       detailRow('Marke',item.brand)+detailRow('Größe',item.size)+detailRow('Kategorie',item.category)+
       detailRow('Zustand',item.condition)+detailRow('Farbe',item.color)+
       detailRow('Kanal',source)+detailRow('Status',status)+
       detailRow('Angebotspreis',p)+detailRow('Online seit',fmtDate(item.onlineSince))+
       detailRow('Erstellt am',fmtDate(item.createdAt),true)+
       (sold?detailRow('Verkaufspreis',euro(item.soldPrice))+detailRow('Verkaufsdatum',fmtDate(item.soldDate))+
        (inPackage?detailRow('Verkaufsart','Paketverkauf')+
         detailRow('Paketpreis gesamt',euro(item.packageTotalPrice))+
         detailRow('Angebotspreise gesamt',euro(item.packageOriginalTotal))+
         detailRow('Artikel im Paket',item.packageItemCount)+
         detailRow('Paket-Referenz',(item.packageId||'').slice(-12),true):'')+
         detailRow('Versand',euro(item.shipping))+detailRow('Gebühren',euro(item.fees)): '')+
       '</div>'+
       (item.note?'<div class="jsViewerNote"><h4>Notiz</h4><p>'+esc(item.note).replace(/\n/g,'<br>')+'</p></div>':'')+
       (url?'<a class="jsViewerLink" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Originalanzeige öffnen ↗</a>':'')+
      '</div>';
    if(item.coverImageKey)loadCover(item.coverImageKey,item.id);
    q('#jsViewerTitle').textContent='Artikel ansehen';
  }
  async function loadCover(key,id){
    let blob=null;
    try{
      const d=await new Promise((resolve,reject)=>{
        const r=indexedDB.open('JennySellsDB',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
      });
      try{
        blob=await new Promise((resolve,reject)=>{
          const tx=d.transaction('images','readonly');
          const req=tx.objectStore('images').get(key);
          req.onsuccess=()=>resolve(req.result?.blob||null);req.onerror=()=>reject(req.error);
        });
      }finally{d.close();}
    }catch(e){console.warn('Artikelbild konnte nicht geladen werden',e);}
    if(!blob||shownId!==id)return;
    const image=q('#jsViewerCover');if(!image)return;
    if(coverURL)URL.revokeObjectURL(coverURL);
    coverURL=URL.createObjectURL(blob);
    image.src=coverURL;image.hidden=false;
    q('#jsViewerCoverFallback')?.remove();
  }
  function showDetail(id){
    const item=getItem(id);if(!item)return;
    shownId=item.id;lastFocus=document.activeElement;
    const bg=q('#jsViewerBg');renderDetail(item);
    bg.hidden=false;document.body.classList.add('jsOverlayOpen');
    q('#jsViewerBack')?.focus();
  }
  function hideDetail(){
    shownId=null;const bg=q('#jsViewerBg');
    if(bg)bg.hidden=true;
    document.body.classList.remove('jsOverlayOpen');
    if(coverURL){URL.revokeObjectURL(coverURL);coverURL='';}
    if(lastFocus?.isConnected)lastFocus.focus();
  }
  function ensureViewer(){
    if(q('#jsViewerBg'))return;
    const bg=document.createElement('div');bg.id='jsViewerBg';bg.className='jsViewerBg';bg.hidden=true;
    bg.innerHTML='<div class="jsViewerSheet" role="dialog" aria-modal="true" aria-labelledby="jsViewerTitle">'+
      '<div class="jsViewerTop"><button class="jsCircleBack" id="jsViewerBack" type="button" aria-label="Zurück">‹</button>'+
      '<div class="jsViewerHead"><span>ARTIKEL</span><h2 id="jsViewerTitle">Artikel ansehen</h2></div>'+
      '<button class="jsViewerPencil" id="jsViewerEdit" type="button" aria-label="Artikel bearbeiten" title="Bearbeiten">'+svg('pencil')+'</button></div>'+
      '<div id="jsViewContent"></div>'+
      '<div class="jsViewerActions"><button id="jsViewerDelete" type="button">Artikel löschen</button></div>'+
      '</div>';
    document.body.appendChild(bg);
    q('#jsViewerBack').onclick=hideDetail;
    bg.addEventListener('click',e=>{if(e.target===bg)hideDetail();});
    q('#jsViewerEdit').onclick=()=>{
      const item=getItem(shownId);if(!item)return;
      hideDetail();
      if(typeof openEditor==='function')openEditor(item);
    };
    q('#jsViewerDelete').onclick=()=>{
      const item=getItem(shownId);if(!item)return;
      q('#editId').value=item.id;
      q('#deleteItem')?.click();
    };
    const existing=q('#confirmDelete');
    existing?.addEventListener('click',()=>{
      if(shownId&&!getItem(shownId))setTimeout(hideDetail,0);
    });
  }
  function patchRows(){
    if(typeof bindRows!=='function'||bindRows.__v119)return;
    const orig=bindRows;
    const next=function(...args){
      const r=orig.apply(this,args);
      qa('.itemOpen').forEach(b=>{
        b.onclick=()=>showDetail(b.dataset.id);
        b.setAttribute('aria-label','Artikel ansehen: '+(getItem(b.dataset.id)?.title||'Artikel'));
      });
      return r;
    };
    next.__v119=true;bindRows=next;
    bindRows();
  }
  function ensureNewestBack(){
    const hero=q('#newest .hero');if(!hero||q('#jsNewestBack'))return;
    const btn=document.createElement('button');
    btn.id='jsNewestBack';btn.type='button';btn.className='jsCircleBack';
    btn.textContent='‹';btn.setAttribute('aria-label','Zurück');
    btn.onclick=()=>{if(typeof go==='function')go(latestOrigin);};
    hero.insertAdjacentElement('afterbegin',btn);
  }
  function patchNavigation(){
    if(typeof go==='function'&&!go.__v119){
      const orig=go;const patched=function(id,...args){
        const former=document.body.dataset.jsCurrentPage||'home';
        if(id==='newest'&&former!=='newest')latestOrigin=former==='items'?'items':'home';
        const out=orig.call(this,id,...args);
        document.body.dataset.jsCurrentPage=id;
        if(id==='settings')editRoute();
        if(shownId)hideDetail();
        return out;
      };
      patched.__v119=true;go=patched;
    }
    if(typeof refresh==='function'&&!refresh.__v119){
      const orig=refresh;const patched=function(...args){
        const r=orig.apply(this,args);
        patchRows();return r;
      };
      patched.__v119=true;refresh=patched;
    }
    const initial=qa('.view.on')[0];document.body.dataset.jsCurrentPage=initial?.id||'home';
  }
  function unifyBackButtons(){
    const closers=[
      ['#closeEditor','Zurück'],
      ['#jsImportClose','Zurück'],
      ['#jsMetricClose','Zurück']
    ];
    for(const [id,label] of closers){
      const node=q(id);if(!node)continue;
      node.textContent='‹';node.classList.add('jsCircleBack');
      node.setAttribute('aria-label',label);
    }
    const importHead=q('.jsImportHead h2');if(importHead)importHead.textContent='Verkaufsartikel importieren';
  }
  function setup(){
    if(started)return;started=true;
    editRoute();relocateSearch();ensurePlus();ensureViewer();ensureNewestBack();unifyBackButtons();patchNavigation();patchRows();
    // ui-v100 reconstructs its import sheet once during startup; reapply the consistent back button afterwards.
    setTimeout(unifyBackButtons,400);setTimeout(unifyBackButtons,900);
    // Keep the original import launcher as the technical entry point for the OCR flow, but never display it.
    const importBtn=q('#marketImportLaunch');
    if(importBtn)importBtn.setAttribute('aria-hidden','true');
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      if(!q('#jsPlusMenu')?.hidden){q('#jsPlusClose')?.click();return;}
      if(!q('#deleteConfirmBg')?.hidden)return;
      if(!q('#jsViewerBg')?.hidden){hideDetail();return;}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();