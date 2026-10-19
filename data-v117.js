/* JennySells v0.11.0 – IndexedDB, safe backups, editable categories and themes.
   Adapted to Jennylicious's store/ZIP and theme approach, not its recipe schema. */
(()=>{
'use strict';
const DB_NAME='JennySellsDB',DB_VERSION=2;
const STORES=['images','articles','categories','settings','meta'];
const LEGACY_KEY='jennysellsItemsV4';
const THEMES={
 purple:{name:'Lila',accent:'#71389b',soft:'#f0e3f5',bg:'#f9e9fc',bg2:'#fff8fc',dark:'#54227d'},
 green:{name:'Grün',accent:'#3f7d58',soft:'#e2f0e6',bg:'#edf7ef',bg2:'#fffaf3',dark:'#23553a'},
 blue:{name:'Blau',accent:'#3973a8',soft:'#e1edf7',bg:'#edf5fb',bg2:'#fffaf3',dark:'#244c78'},
 red:{name:'Rot',accent:'#a74455',soft:'#f5e3e6',bg:'#fbf0f2',bg2:'#fff9f3',dark:'#7a2738'},
 gold:{name:'Gold',accent:'#a87819',soft:'#f5ecd8',bg:'#fbf6e9',bg2:'#fffaf2',dark:'#77540e'}
};
const DEFAULT_CATS=['Accessoires','Baby','Bücher','Fahrzeug','Hose','Jacke','Kleid','Mütze','Outdoor','Pullover','Schlafanzug','Schuhe','Spielzeug','Sonstiges'];
let db=null,ready=false,restoring=false,writeChain=Promise.resolve(),categories=[],theme='purple',lastPersisted=[],categoryOverride='',pendingBackupFile=null,statusMessage='';
const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const normalizedSingular=s=>norm(s).replace(/\b([a-z]{4,})(?:en|ern|er|e|s)\b/g,'$1');
function similarity(a,b){
 const x=norm(a),y=norm(b);if(!x||!y)return 0;if(x===y)return 1;
 const short=normalizedSingular(x),long=normalizedSingular(y);
 if(short===long)return .96;
 if(x.length>=5&&y.length>=5&&(x.includes(y)||y.includes(x)))return .88;
 let prev=Array.from({length:y.length+1},(_,i)=>i);
 for(let i=1;i<=x.length;i++){const cur=[i];for(let j=1;j<=y.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));prev=cur;}
 const levenshtein=1-prev[y.length]/Math.max(x.length,y.length);
 const aa=new Set(x.split(' ')),bb=new Set(y.split(' ')),inter=[...aa].filter(t=>bb.has(t)).length;
 return Math.max(levenshtein,inter/Math.max(1,aa.size+bb.size-inter));
}
function findCategory(name,ignore=''){
 const exact=categories.find(c=>norm(c)===norm(name)&&norm(c)!==norm(ignore));
 if(exact)return {type:'exact',name:exact,score:1};
 let match=null,score=0;
 for(const c of categories){if(norm(c)===norm(ignore))continue;let v=similarity(name,c);if(v>score){score=v;match=c;}}
 return score>=.74?{type:'similar',name:match,score}:null;
}
function openDB(){
 if(db)return Promise.resolve(db);
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const d=req.result;
    if(!d.objectStoreNames.contains('images'))d.createObjectStore('images',{keyPath:'key'});
    for(const s of ['articles','categories','settings','meta'])if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:s==='articles'?'id':s==='categories'?'name':'key'});
  };
  req.onsuccess=()=>{db=req.result;db.onversionchange=()=>{db.close();db=null};resolve(db);};
  req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Datenbank wird von einem anderen Fenster blockiert'));
 });
}
function request(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function get(store,key){const d=await openDB();return request(d.transaction(store,'readonly').objectStore(store).get(key));}
async function all(store){const d=await openDB();return request(d.transaction(store,'readonly').objectStore(store).getAll());}
async function transact(stores,fn){
 const d=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction(stores,'readwrite');
  try{fn(tx);}catch(err){tx.abort();reject(err);return;}
  tx.oncomplete=()=>resolve();
  tx.onabort=()=>reject(tx.error||new Error('Datenbankvorgang abgebrochen'));
  tx.onerror=()=>{};
 });
}
function snapshot(arr){return JSON.parse(JSON.stringify(arr));}
function notify(msg,warning=false){
 statusMessage=msg;
 const el=q('#jsDataStatus');if(el){el.textContent=msg;el.classList.toggle('warn',warning);}
 if(warning){console.error('JennySells:',msg);window.alert(msg);}
}
async function persistCategories(){
 const entries=[...categories].sort((a,b)=>a.localeCompare(b,'de')).map(name=>({name,createdAt:new Date().toISOString()}));
 await transact(['categories'],tx=>{const os=tx.objectStore('categories');os.clear();entries.forEach(x=>os.put(x));});
 renderCategories();updateCategoryDatalist();
}
function queueSave(newItems){
 if(restoring)return Promise.reject(new Error('Wiederherstellung läuft'));
 const copy=snapshot(newItems);
 if(!ready){return Promise.reject(new Error('IndexedDB ist noch nicht bereit; Daten wurden nicht gespeichert.'));} // Never silently discard writes.
 writeChain=writeChain.then(async()=>{
  const previously=lastPersisted;
  const day=new Date().toISOString().slice(0,10);
  const lastSafety=await get('meta','lastSafetyDay');
  const lastIndex=await get('meta','dailySafetyIndex');
  let index=Array.isArray(lastIndex?.value)?lastIndex.value.slice():[];
  const previousDays=index.slice();
  if(lastSafety?.value!==day){index=[...new Set([...index,day])].sort().slice(-7);}
  await transact(['articles','meta'],tx=>{
    const art=tx.objectStore('articles');art.clear();copy.forEach(item=>art.put(item));
    const m=tx.objectStore('meta');m.put({key:'initialized',value:true,updatedAt:new Date().toISOString()});
    if(lastSafety?.value!==day){
      const createdAt=new Date().toISOString();
      m.put({key:'lastSafetyDay',value:day});
      m.put({key:'safetySnapshot',items:previously,createdAt});
      m.put({key:'dailySafety:'+day,items:previously,createdAt});
      m.put({key:'dailySafetyIndex',value:index});
      for(const removed of previousDays){if(!index.includes(removed))m.delete('dailySafety:'+removed);}
    }
  });
  lastPersisted=copy;
  notify(copy.length+' Artikel in IndexedDB gespeichert.');
 }).catch(err=>{ready=false;notify('Speichern fehlgeschlagen! Keine weiteren Änderungen vornehmen. Bitte zuerst ein Backup der vorhandenen Daten prüfen. '+err.message,true);throw err;});
 return writeChain;
}
async function bootstrap(){
 const d=await openDB();
 let marker=await get('meta','initialized'),stored=[];
 if(marker?.value===true){stored=await all('articles');}
 else{
  const current=Array.isArray(items)?snapshot(items):[];
  let legacy=null;
  try{legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null')}catch{}
  const initial=Array.isArray(legacy)?legacy:current;
  await transact(['articles','meta'],tx=>{
    const a=tx.objectStore('articles');a.clear();initial.forEach(item=>a.put(item));
    tx.objectStore('meta').put({key:'initialized',value:true,updatedAt:new Date().toISOString(),migratedFrom:'localStorage'});
  });
  stored=initial;
 }
 items=stored;lastPersisted=snapshot(stored);
 const c=await all('categories');
 categories=c.map(x=>x.name).filter(Boolean);
 if(!categories.length){categories=[...DEFAULT_CATS];}
 const used=stored.map(i=>i.category?.trim()).filter(Boolean);
 for(const name of used){if(!categories.some(c=>norm(c)===norm(name)))categories.push(name);}
 categories=[...new Map(categories.map(x=>[norm(x),x])).values()];
 await persistCategories();
 const savedTheme=await get('settings','theme');
 theme=THEMES[savedTheme?.value]?savedTheme.value:'purple';
 applyTheme(theme,false);
 ready=true;
 refresh();
 notify('IndexedDB bereit: '+stored.length+' Artikel, '+categories.length+' Kategorien, Bilder separat.');
 const app=q('.app');if(app)app.removeAttribute('inert');
 q('.bottom')?.removeAttribute('inert');
 q('#jsDataLoading')?.remove();
 setupEditorCategory();
}
function updateCategoryDatalist(){
 const dl=q('#jsCategoryOptions');
 if(dl)dl.innerHTML=categories.sort((a,b)=>a.localeCompare(b,'de')).map(c=>'<option value="'+esc(c)+'"></option>').join('');
}
function showDialog(title,body,actions){
 const wrap=q('#jsDataDialog');if(!wrap)return;
 q('#jsDataDialogTitle').textContent=title;
 q('#jsDataDialogBody').textContent=body;
 const buttons=q('#jsDataDialogActions');buttons.textContent='';
 for(const a of actions){const btn=document.createElement('button');btn.type='button';btn.textContent=a.text;btn.className=a.danger?'jsDataDanger':a.primary?'jsDataPrimary':'';btn.onclick=()=>{hideDialog();a.run?.();};buttons.appendChild(btn);}
 wrap.hidden=false;
 buttons.querySelector('button')?.focus();
}
function hideDialog(){const el=q('#jsDataDialog');if(el)el.hidden=true;}
function ensureCategory(name,override=false){
 const clean=String(name||'').trim().replace(/\s+/g,' ');
 if(!clean)return {type:'empty'};
 const found=findCategory(clean);
 if(found?.type==='exact')return {type:'existing',name:found.name};
 if(found?.type==='similar'&&!override)return {type:'similar',name:found.name};
 categories.push(clean);
 persistCategories().catch(e=>notify('Kategorie konnte nicht gespeichert werden: '+e.message,true));
 return {type:'new',name:clean};
}
function validateEditorCategory(){
 const input=q('#fCategory');if(!input)return true;
 const value=input.value.trim().replace(/\s+/g,' ');
 if(!value)return true;
 const result=ensureCategory(value,categoryOverride===norm(value));
 if(result.type==='similar'){
  showDialog('Ähnliche Kategorie gefunden','„'+value+'“ ähnelt der vorhandenen Kategorie „'+result.name+'“. Verwende die bestehende Kategorie oder lege bewusst eine neue an.',[
   {text:'Vorhandene verwenden',primary:true,run:()=>{input.value=result.name;categoryOverride='';q('#saveItem')?.click();}},
   {text:'Trotzdem neu anlegen',run:()=>{categoryOverride=norm(value);q('#saveItem')?.click();}},
   {text:'Abbrechen'}
  ]);return false;
 }
 categoryOverride='';input.value=result.name||value;
 return true;
}
function setupEditorCategory(){
 const inp=q('#fCategory');if(!inp)return;
 if(!q('#jsCategoryOptions')){const dl=document.createElement('datalist');dl.id='jsCategoryOptions';document.body.appendChild(dl);}
 inp.setAttribute('list','jsCategoryOptions');updateCategoryDatalist();
 if(inp.dataset.jsCategoryReady)return;inp.dataset.jsCategoryReady='1';
 const tip=document.createElement('div');tip.id='jsCategoryHint';tip.className='jsCategoryHint';inp.insertAdjacentElement('afterend',tip);
 inp.addEventListener('input',()=>{
  categoryOverride='';
  const found=findCategory(inp.value);
  tip.textContent=found?.type==='exact'?'Bereits vorhanden: '+found.name:found?.type==='similar'?'Ähnliche Kategorie vorhanden: '+found.name:'Neue Kategorie wird beim Speichern automatisch übernommen.';
  tip.classList.toggle('warn',found?.type==='similar');
 });
}
async function renameCategory(oldName,newName){
 const name=newName.trim().replace(/\s+/g,' ');
 if(!name||name.length>80)return notify('Bitte eine Kategorie mit maximal 80 Zeichen eingeben.',true);
 const found=findCategory(name,oldName);
 if(found)return showDialog('Kategorie schon vorhanden','„'+name+'“ ist identisch oder ähnlich zu „'+found.name+'“. Bitte eindeutige Bezeichnungen verwenden.',[{text:'OK',primary:true}]);
 const idx=categories.indexOf(oldName);if(idx<0)return;
 categories[idx]=name;
 items.forEach(i=>{if(norm(i.category)===norm(oldName))i.category=name;});
 await persistCategories();await queueSave(items);refresh();
}
function removeCategory(name){
 const usage=items.filter(i=>norm(i.category)===norm(name)).length;
 if(usage){showDialog('Kategorie wird verwendet','„'+name+'“ ist '+usage+' Artikel(n) zugewiesen. Benenne sie zuerst um oder wähle eine andere Kategorie für diese Artikel.',[{text:'OK',primary:true}]);return;}
 showDialog('Kategorie löschen?','„'+name+'“ aus den Standards entfernen?',[
  {text:'Abbrechen'}, {text:'Entfernen',danger:true,run:()=>{categories=categories.filter(c=>c!==name);persistCategories().catch(e=>notify(e.message,true));}}
 ]);
}
function renderCategories(){
 const target=q('#jsCategoryList');if(!target)return;
 target.innerHTML=categories.slice().sort((a,b)=>a.localeCompare(b,'de')).map(name=>
  '<div class="jsCategoryRow"><b>'+esc(name)+'</b><span>'+items.filter(i=>norm(i.category)===norm(name)).length+' Artikel</span><button type="button" data-rename="'+esc(name)+'">Bearbeiten</button><button type="button" data-remove="'+esc(name)+'" aria-label="Kategorie '+esc(name)+' entfernen">×</button></div>'
 ).join('');
 target.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>{const old=b.dataset.rename,proposal=prompt('Kategorie umbenennen:',old);if(proposal!==null&&proposal.trim()!==old)renameCategory(old,proposal).catch(e=>notify(e.message,true));});
 target.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeCategory(b.dataset.remove));
}
function addCategoryFromSettings(){
 const inp=q('#jsCategoryNew'),value=inp?.value.trim();if(!value)return;
 if(value.length>80)return notify('Kategorie ist zu lang (maximal 80 Zeichen).',true);
 const found=ensureCategory(value);
 if(found.type==='similar')return showDialog('Ähnliche Kategorie vorhanden','„'+value+'“ ähnelt „'+found.name+'“. Trotzdem hinzufügen?',[
  {text:'Vorhandene verwenden',primary:true,run:()=>{inp.value='';}},
  {text:'Trotzdem hinzufügen',run:()=>{ensureCategory(value,true);inp.value='';}},
  {text:'Abbrechen'}
 ]);
 if(found.type==='existing')return showDialog('Kategorie existiert bereits','„'+found.name+'“ ist schon vorhanden.',[{text:'OK',primary:true}]);
 inp.value='';
}
function applyTheme(choice,save=true){
 if(!THEMES[choice])choice='purple';theme=choice;
 const entry=THEMES[theme];document.documentElement.dataset.jsTheme=theme;
 const r=document.documentElement.style;
 r.setProperty('--js-custom-accent',entry.accent);r.setProperty('--js-custom-soft',entry.soft);
 r.setProperty('--js-custom-bg',entry.bg);r.setProperty('--js-custom-bg2',entry.bg2);r.setProperty('--js-custom-dark',entry.dark);
 const meta=q('meta[name="theme-color"]');if(meta)meta.content=entry.accent;
 q('#jsThemeChoices')?.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.theme===theme));
 if(save)transact(['settings'],tx=>tx.objectStore('settings').put({key:'theme',value:theme})).catch(e=>notify(e.message,true));
}
const MORE_SECTIONS={
 backup:{title:'Export / Backup',subtitle:'Vollständige Sicherungen und Wiederherstellung'},
 categories:{title:'Standard-Kategorien',subtitle:'Kategorien verwalten und Dubletten vermeiden'},
 design:{title:'Design',subtitle:'Farbdesign und Hintergrund wählen'},
 app:{title:'App-Einstellungen',subtitle:'Version, lokaler Speicher und Demo-Daten'},
 about:{title:'Über JennySells',subtitle:'Deine Artikelübersicht mit Herz'}
};
let currentMoreSection='';
function openMoreSection(section){
 if(!MORE_SECTIONS[section])return;
 const landing=q('#jsMoreLanding'),detail=q('#jsMoreDetail');
 if(!landing||!detail)return;
 currentMoreSection=section;landing.hidden=true;detail.hidden=false;
 detail.querySelector('h2').textContent=MORE_SECTIONS[section].title;
 detail.querySelector('.jsMoreSubtitle').textContent=MORE_SECTIONS[section].subtitle;
 detail.querySelectorAll('.jsMorePanel').forEach(p=>p.hidden=p.dataset.morePanel!==section);
 if(section==='categories')renderCategories();
 if(section==='design')applyTheme(theme,false);
 if(section==='backup'&&statusMessage){
  const status=q('#jsDataStatus');if(status)status.textContent=statusMessage;
 }
 window.scrollTo({top:0,behavior:'auto'});
}
function closeMoreSection(){
 currentMoreSection='';
 const landing=q('#jsMoreLanding'),detail=q('#jsMoreDetail');
 if(landing)landing.hidden=false;
 if(detail)detail.hidden=true;
 window.scrollTo({top:0,behavior:'auto'});
}
function createSettings(){
 const sec=q('#settings');if(!sec||q('#jsDataSettings'))return;
 const originalCard=sec.querySelector('.settingsCard');
 const demoReset=q('#resetDemoSettings'),oldNote=sec.querySelector(':scope > .note');
 sec.querySelector(':scope > .hero')?.remove();
 const wrap=document.createElement('div');wrap.id='jsDataSettings';
 wrap.innerHTML=
 '<div class="jsMoreLanding" id="jsMoreLanding">'+
  '<div class="jsMoreWelcome"><h1>Mehr</h1><p>Alles rund um deine JennySells-App</p></div>'+
  '<div class="jsMoreMenu">'+
   '<button type="button" data-more-action="import"><span class="jsMoreGlyph">↓</span><span>Verkaufsartikel importieren</span><span class="jsMoreChevron">›</span></button>'+
   '<button type="button" data-more-section="backup"><span class="jsMoreGlyph">↑</span><span>Export / Backup</span><span class="jsMoreChevron">›</span></button>'+
   '<button type="button" data-more-section="categories"><span class="jsMoreGlyph">☷</span><span>Standard-Kategorien</span><span class="jsMoreChevron">›</span></button>'+
   '<button type="button" data-more-section="design"><span class="jsMoreGlyph">◉</span><span>Design</span><span class="jsMoreChevron">›</span></button>'+
   '<button type="button" data-more-section="app"><span class="jsMoreGlyph">⚙</span><span>App-Einstellungen</span><span class="jsMoreChevron">›</span></button>'+
   '<button type="button" data-more-section="about"><span class="jsMoreGlyph">ⓘ</span><span>Über JennySells</span><span class="jsMoreChevron">›</span></button>'+
  '</div></div>'+
 '<div class="jsMoreDetail" id="jsMoreDetail" hidden>'+
  '<div class="jsMoreDetailTop"><button type="button" id="jsMoreBack" aria-label="Zurück zu Mehr">‹ Mehr</button><h2></h2><p class="jsMoreSubtitle"></p></div>'+
  '<div class="jsMorePanel" data-more-panel="backup" hidden>'+
   '<div class="jsDataCard"><h3>💾 Datenbank & Sicherung</h3><p>Vollständiges ZIP-Backup mit sämtlichen Artikeln und lokal gespeicherten Titelbildern. Zum Wechseln des Geräts oder nach einer Neuinstallation ZIP importieren.</p>'+
    '<div class="jsDataStatus" id="jsDataStatus" aria-live="polite"></div>'+
    '<button class="jsDataAction primary" type="button" id="jsBackupExport">📦 Komplett-Backup erstellen (.zip)</button>'+
    '<button class="jsDataAction" type="button" id="jsBackupRestore">↙ Komplett-Backup wiederherstellen</button>'+
    '<button class="jsDataAction" type="button" id="jsLocalBackups">🛟 Lokale Tages-Sicherungen (bis 7 Tage)</button>'+
    '<div class="jsDataFoot">Das ZIP enthält Artikel, Kategorien, Design, Verkaufshistorie, Original-Links und Titelbilder. Backups außerhalb der App speichern – am besten auch auf einem zweiten Gerät oder in einem privaten Cloud-Ordner.</div>'+
    '<details class="jsDataAdvanced" id="jsDataAdvanced"><summary>Weitere Optionen: JSON-Datenaustausch</summary><p>Nur für den gezielten Austausch von Artikeldaten. JSON enthält keine Bilddateien und ersetzt kein Komplett-Backup. Bestehende Artikel-IDs werden beim Import übersprungen.</p>'+
      '<button class="jsDataAction" type="button" id="jsJsonExport">⇧ Artikel als JSON exportieren (ohne Bilder)</button>'+
      '<button class="jsDataAction" type="button" id="jsJsonImport">⇩ Artikel aus JSON importieren (ohne Bilder)</button>'+
    '</details>'+
   '</div></div>'+
  '<div class="jsMorePanel" data-more-panel="categories" hidden>'+
   '<div class="jsDataCard"><h3>🏷️ Standard-Kategorien</h3><p>Kategorien bearbeiten, ergänzen oder umbenennen. Beim Erstellen und Importieren eines Artikels werden neue Kategorien übernommen und ähnliche Bezeichnungen vorher geprüft.</p>'+
    '<div class="jsCategoryList" id="jsCategoryList"></div>'+
    '<div class="jsAddCategory"><input id="jsCategoryNew" placeholder="Neue Kategorie …" maxlength="80" aria-label="Neue Kategorie"><button id="jsCategoryAdd" type="button">Hinzufügen</button></div>'+
   '</div></div>'+
  '<div class="jsMorePanel" data-more-panel="design" hidden>'+
   '<div class="jsDataCard"><h3>🎨 Design auswählen</h3><p>Standard ist Lila mit Flieder-Hintergrund. Das Design wird auf diesem Gerät gespeichert.</p>'+
    '<div class="jsThemeChoices" id="jsThemeChoices">'+Object.entries(THEMES).map(([id,x])=>
      '<button type="button" data-theme="'+id+'" style="--theme-color:'+x.accent+';--theme-light:'+x.soft+'"><i></i>'+x.name+'</button>').join('')+'</div>'+
   '</div></div>'+
  '<div class="jsMorePanel" data-more-panel="app" id="jsMoreAppPanel" hidden></div>'+
  '<div class="jsMorePanel" data-more-panel="about" hidden>'+
   '<div class="jsDataCard"><h3>♥ JennySells</h3><p>Shopping mit Herz: Verkaufsartikel aus Vinted, Kleinanzeigen, eBay, Basar und weiteren Kanälen an einem Ort verwalten.</p>'+
    '<div class="jsMoreInfoRow"><span>Version</span><strong>v0.11.6-test</strong></div>'+
    '<div class="jsMoreInfoRow"><span>Datenhaltung</span><strong>IndexedDB, lokal</strong></div>'+
    '<div class="jsMoreInfoRow"><span>Synchronisierung</span><strong>Keine Cloud-Synchronisation</strong></div>'+
    '<p>Du kontrollierst deine Daten. Sichere die App regelmäßig über „Export / Backup“ als ZIP-Datei.</p>'+
   '</div></div>'+
 '</div>';
 sec.appendChild(wrap);
 const appPanel=q('#jsMoreAppPanel');
 if(originalCard)appPanel.appendChild(originalCard);
 if(demoReset)appPanel.appendChild(demoReset);
 if(oldNote)appPanel.appendChild(oldNote);
 q('#jsMoreLanding').querySelectorAll('[data-more-section]').forEach(b=>b.onclick=()=>openMoreSection(b.dataset.moreSection));
 q('[data-more-action="import"]').onclick=()=>{
  const launch=q('#marketImportLaunch');
  if(launch)launch.click();
  else notify('Verkaufsartikel-Import konnte nicht geöffnet werden. Bitte die Startseite prüfen.',true);
 };
 q('#jsMoreBack').onclick=closeMoreSection;
 q('#jsThemeChoices').querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>applyTheme(b.dataset.theme));
 q('#jsCategoryAdd').onclick=addCategoryFromSettings;
 q('#jsCategoryNew').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCategoryFromSettings();}});
 q('#jsBackupExport').onclick=exportZip;
 q('#jsBackupRestore').onclick=()=>{q('#jsBackupInput').value='';q('#jsBackupInput').click();};
 q('#jsLocalBackups').onclick=showLocalBackups;
 q('#jsJsonExport').onclick=exportJson;
 q('#jsJsonImport').onclick=()=>{q('#jsJsonInput').value='';q('#jsJsonInput').click();};
 renderCategories();applyTheme(theme,false);
 if(statusMessage){const status=q('#jsDataStatus');if(status)status.textContent=statusMessage;}
}
function mount(){
 if(!q('#jsDataDialog')){
  const wrapper=document.createElement('div');wrapper.id='jsDataDialog';wrapper.hidden=true;wrapper.innerHTML='<div class="jsDataDialogPanel" role="alertdialog" aria-modal="true" aria-labelledby="jsDataDialogTitle"><h2 id="jsDataDialogTitle"></h2><p id="jsDataDialogBody"></p><div id="jsDataDialogActions"></div></div>';document.body.appendChild(wrapper);
  wrapper.addEventListener('click',ev=>{if(ev.target===wrapper)hideDialog();});
 }
 if(!q('#jsBackupInput')){
  const inp=document.createElement('input');inp.type='file';inp.hidden=true;inp.id='jsBackupInput';inp.accept='.zip,application/zip';document.body.appendChild(inp);inp.onchange=restoreFile;
 }
 if(!q('#jsJsonInput')){
  const inp=document.createElement('input');inp.type='file';inp.hidden=true;inp.id='jsJsonInput';inp.accept='.json,application/json';document.body.appendChild(inp);inp.onchange=importJsonFile;
 }
 createSettings();
 if(q('#settings')&&typeof go==='function'&&!go.__jsDBSettings){
  const previous=go;
  const wrapped=function(id,...args){const result=previous.call(this,id,...args);if(id==='settings'){createSettings();closeMoreSection();}return result;};
  wrapped.__jsDBSettings=true;go=wrapped;
 }
}
async function showLocalBackups(){
 try{
  await writeChain.catch(()=>{});
  const record=await get('meta','dailySafetyIndex'),days=Array.isArray(record?.value)?record.value.slice().reverse():[];
  const backups=(await Promise.all(days.map(day=>get('meta','dailySafety:'+day)))).filter(x=>Array.isArray(x?.items));
  if(!backups.length)return showDialog('Lokale Sicherungen','Noch keine Tages-Sicherung vorhanden. Die erste wird beim nächsten erfolgreichen Speichern erstellt.',[{text:'OK',primary:true}]);
  showDialog('Lokale Sicherungen','Wähle einen früheren Artikelstand. Kategorien, Einstellungen und Bilddateien bleiben unverändert. Zusätzlich immer ein externes ZIP-Backup aufbewahren.',[
   ...backups.map(s=>({text:new Date(s.createdAt).toLocaleDateString('de-DE')+' · '+s.items.length+' Artikel',run:()=>askRestoreLocal(s)})),
   {text:'Abbrechen'}
  ]);
 }catch(e){notify('Lokale Sicherung konnte nicht gelesen werden: '+e.message,true);}
}
function askRestoreLocal(safety){
 showDialog('Artikelstand wiederherstellen?','Artikel vom '+new Date(safety.createdAt).toLocaleString('de-DE')+' wiederherstellen? Aktuelle Artikel werden ersetzt, gespeicherte Titelbilder bleiben erhalten.',[
  {text:'Abbrechen'},
  {text:'Artikel ersetzen',danger:true,run:async()=>{
   const before=items;
   items=snapshot(safety.items);
   try{await queueSave(items);refresh();notify('Artikel-Sicherungsstand wiederhergestellt.');}
   catch(e){items=before;notify('Lokale Wiederherstellung fehlgeschlagen: '+e.message,true);}
  }}
 ]);
}
async function exportJson(){
 try{
  await writeChain;
  const payload={format:'JennySellsArticles',formatVersion:1,appVersion:'0.11.6-test',createdAt:new Date().toISOString(),articles:await all('articles'),categories,settings:{theme}};
  const f=new File([JSON.stringify(payload,null,2)],'JennySells_Artikel_'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
  offerFile(f,'JSON-Export ohne Titelbilder');
 }catch(e){notify('JSON-Export fehlgeschlagen: '+e.message,true);}
}
function offerFile(file,label){
 pendingBackupFile=file;
 const existing=q('#jsDataSaveFile');if(existing)existing.remove();
 const btn=document.createElement('button');btn.id='jsDataSaveFile';btn.className='jsDataAction primary';btn.textContent='⬇ '+label+' speichern / teilen ('+(file.size/1024/1024).toFixed(1)+' MB)';
 q('#jsDataStatus')?.insertAdjacentElement('afterend',btn);
 btn.onclick=async()=>{
  try{
   if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'JennySells Sicherung'});
   else{const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}
  }catch(e){if(e.name!=='AbortError')notify('Speichern/Teilen nicht möglich: '+e.message,true);}
 };
 notify('Datei ist bereit. Tippe auf „speichern / teilen“, um sie außerhalb der App abzulegen.');
}
function dosDT(d=new Date()){return {date:(((Math.max(1980,d.getFullYear())-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31),time:((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31)};}
const crcTable=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
async function zipStore(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;const dt=dosDT();
 for(const entry of files){
  const name=enc.encode(entry.name),blob=entry.data instanceof Blob?entry.data:new Blob([entry.data]),bytes=new Uint8Array(await blob.arrayBuffer()),size=bytes.length,crc=crc32(bytes);
  if(size>0xffffffff)throw new Error('Eine ZIP-Datei ist zu groß');
  const lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);lv.setUint16(10,dt.time,true);lv.setUint16(12,dt.date,true);
  lv.setUint32(14,crc,true);lv.setUint32(18,size,true);lv.setUint32(22,size,true);lv.setUint16(26,name.length,true);lh.set(name,30);parts.push(lh,blob);
  const ch=new Uint8Array(46+name.length),v=new DataView(ch.buffer);
  v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint16(10,0,true);
  v.setUint16(12,dt.time,true);v.setUint16(14,dt.date,true);v.setUint32(16,crc,true);v.setUint32(20,size,true);v.setUint32(24,size,true);
  v.setUint16(28,name.length,true);v.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length+size;
 }
 const cdOffset=offset,cdSize=central.reduce((a,x)=>a+x.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
 v.setUint32(12,cdSize,true);v.setUint32(16,cdOffset,true);
 return new Blob([...parts,...central,end],{type:'application/zip'});
}
async function readZip(file){
 if(file.size>300*1024*1024)throw new Error('Die Datei ist zu groß');
 const bytes=new Uint8Array(await file.arrayBuffer()),dv=new DataView(bytes.buffer);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){end=i;break;}}
 if(end<0)throw new Error('Kein gültiges ZIP');
 const count=dv.getUint16(end+10),offset=dv.getUint32(end+16),out=new Map();
 if(count>5000)throw new Error('Zu viele Dateien im Backup');
 let p=offset;
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||dv.getUint32(p,true)!==0x02014b50)throw new Error('ZIP-Verzeichnis beschädigt');
  const method=dv.getUint16(p+10,true),packed=dv.getUint32(p+20,true),unpacked=dv.getUint32(p+24,true),nameLength=dv.getUint16(p+28,true),extra=dv.getUint16(p+30,true),comment=dv.getUint16(p+32,true),local=dv.getUint32(p+42,true);
  const name=new TextDecoder().decode(bytes.slice(p+46,p+46+nameLength));
  if(local+30>bytes.length||dv.getUint32(local,true)!==0x04034b50)throw new Error('ZIP-Eintrag fehlerhaft');
  const start=local+30+dv.getUint16(local+26,true)+dv.getUint16(local+28,true);
  if(start+packed>bytes.length)throw new Error('Unvollständige ZIP-Datei');
  const part=bytes.slice(start,start+packed);let data=part;
  if(method===8){if(!('DecompressionStream' in window))throw new Error('ZIP-Kompression nicht unterstützt');data=new Uint8Array(await new Response(new Blob([part]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}
  else if(method!==0)throw new Error('Nicht unterstütztes ZIP-Verfahren');
  if(data.length!==unpacked||crc32(data)!==dv.getUint32(p+16,true))throw new Error('Prüfsumme oder Dateigröße ungültig: '+name);
  out.set(name,data);p+=46+nameLength+extra+comment;
 }
 return out;
}
async function exportZip(){
 if(!ready)return notify('Datenbank ist noch nicht bereit.',true);
 try{
  await writeChain;notify('Backup wird zusammengestellt …');
  const [articles,images]=await Promise.all([all('articles'),all('images')]);
  const manifest=[],files=[];
  images.forEach((entry,index)=>{
   const blob=entry.blob;if(!(blob instanceof Blob))return;
   const ext=blob.type.includes('png')?'png':blob.type.includes('jpeg')?'jpg':'webp';
   const ref='images/'+String(index+1).padStart(4,'0')+'.'+ext;
   manifest.push({key:entry.key,ref,type:blob.type,createdAt:entry.createdAt||''});
   files.push({name:ref,data:blob});
  });
  const json={format:'JennySellsBackup',formatVersion:1,appVersion:'0.11.6-test',dbVersion:DB_VERSION,createdAt:new Date().toISOString(),articles,categories,settings:{theme},images:manifest};
  const zip=await zipStore([{name:'backup.json',data:new TextEncoder().encode(JSON.stringify(json))},...files]);
  offerFile(new File([zip],'JennySells_Backup_'+new Date().toISOString().slice(0,10)+'.zip',{type:'application/zip'}),'Komplett-Backup ZIP');
 }catch(e){notify('Backup fehlgeschlagen: '+e.message,true);}
}
async function restoreFile(ev){
 const file=ev.target.files?.[0];ev.target.value='';if(!file)return;
 try{
  notify('Backup wird geprüft …');
  const files=await readZip(file),raw=files.get('backup.json');if(!raw)throw new Error('backup.json fehlt');
  const value=JSON.parse(new TextDecoder().decode(raw));
  if(value?.format!=='JennySellsBackup'||value.formatVersion!==1||!Array.isArray(value.articles)||!Array.isArray(value.categories)||!Array.isArray(value.images))throw new Error('Nicht unterstütztes JennySells-Backup');
  if(value.articles.some(i=>!i||typeof i.id!=='string'||typeof i.title!=='string'))throw new Error('Artikelstruktur ungültig');
  const imgs=value.images.map(x=>{
   if(!x||typeof x.key!=='string'||typeof x.ref!=='string'||!files.has(x.ref))throw new Error('Backup-Bild fehlt');
   return {key:x.key,blob:new Blob([files.get(x.ref)],{type:x.type||'image/jpeg'}),createdAt:x.createdAt||new Date().toISOString()};
  });
  showDialog('Backup wirklich wiederherstellen?',file.name+' enthält '+value.articles.length+' Artikel und '+imgs.length+' Bilder. Die aktuellen lokalen JennySells-Daten werden vollständig ersetzt. Vorher unbedingt ein eigenes Backup erstellen.',[
   {text:'Abbrechen'},
   {text:'Ja, ersetzen',danger:true,run:()=>restoreConfirmed(value,imgs)}
  ]);
 }catch(e){notify('Wiederherstellung abgebrochen: '+e.message+' – aktuelle Daten unverändert.',true);}
}
async function restoreConfirmed(backup,images){
 try{
  restoring=true;await writeChain.catch(()=>{});ready=false;
  await transact(STORES,tx=>{
   STORES.forEach(s=>tx.objectStore(s).clear());
   backup.articles.forEach(i=>tx.objectStore('articles').put(i));
   images.forEach(i=>tx.objectStore('images').put(i));
   backup.categories.forEach(name=>{if(typeof name==='string'&&name.trim())tx.objectStore('categories').put({name:name.trim()});});
   tx.objectStore('settings').put({key:'theme',value:THEMES[backup.settings?.theme]?backup.settings.theme:'purple'});
   tx.objectStore('meta').put({key:'initialized',value:true,restoredAt:new Date().toISOString()});
  });
  localStorage.removeItem(LEGACY_KEY);
  location.reload();
 }catch(e){restoring=false;ready=false;notify('Wiederherstellen fehlgeschlagen: '+e.message+'. Vorhandenen Datenbestand prüfen, bevor etwas gespeichert wird.',true);}
}
async function importJsonFile(ev){
 const file=ev.target.files?.[0];ev.target.value='';if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data?.format!=='JennySellsArticles'||data.formatVersion!==1||!Array.isArray(data.articles))throw new Error('Keine unterstützte Artikel-JSON-Datei');
  const entries=data.articles;
  if(entries.some(i=>!i||typeof i.id!=='string'||typeof i.title!=='string'))throw new Error('Ungültige Artikel');
  const existing=new Set(items.map(i=>i.id));
  const toAdd=entries.filter(i=>!existing.has(i.id));
  const similar=[...new Map(toAdd.map(i=>{
    const name=String(i.category||'').trim(),match=name?findCategory(name):null;
    return match?.type==='similar'?[norm(name),{name,match:match.name}]:['',null];
  }).filter(x=>x[1])).values()];
  const applyImport=async(useExisting)=>{
    const copies=snapshot(toAdd);
    for(const i of copies){
      const name=String(i.category||'').trim(),match=name?findCategory(name):null;
      if(match?.type==='exact'||(useExisting&&match?.type==='similar'))i.category=match.name;
    }
    items=[...copies,...items];
    for(const name of [...(data.categories||[]),...copies.map(i=>i.category)]){
      if(typeof name==='string'&&name.trim()&&!categories.some(c=>norm(c)===norm(name)))categories.push(name.trim());
    }
    try{await queueSave(items);await persistCategories();refresh();notify(copies.length+' Artikel importiert.');}
    catch(e){notify('Import nicht vollständig: '+e.message,true);}
  };
  const detail=toAdd.length+' neue Artikel aus „'+file.name+'“ ergänzen? '+(entries.length-toAdd.length)+' identische Artikel-IDs werden übersprungen. Bilder sind in JSON-Dateien nicht enthalten.';
  const warnings=similar.length?' ACHTUNG, ähnliche Kategorien: '+similar.slice(0,6).map(x=>'„'+x.name+'“ / „'+x.match+'“').join(', ')+'.':'';
  showDialog(similar.length?'Ähnliche Kategorien gefunden':'Artikel importieren?',detail+warnings,similar.length?[
   {text:'Abbrechen'},
   {text:'Bestehende Kategorien verwenden',primary:true,run:()=>applyImport(true)},
   {text:'Trotzdem neu übernehmen',run:()=>applyImport(false)}
  ]:[
   {text:'Abbrechen'},
   {text:'Artikel ergänzen',primary:true,run:()=>applyImport(true)}
  ]);
 }catch(e){notify('JSON-Import nicht möglich: '+e.message,true);}
}
function askResetDemo(){
 showDialog('Demo-Daten wirklich neu laden?','Achtung: Alle aktuellen Artikel werden durch die 20 eingebetteten Beispielartikel ersetzt. Zuvor unbedingt ein Komplett-Backup erstellen.',[
  {text:'Abbrechen'},
  {text:'20 Demo-Artikel laden',danger:true,run:async()=>{
   items=seed();
   try{await queueSave(items);refresh();notify('Demo-Datensatz geladen.');}catch(e){notify('Demo-Reset fehlgeschlagen: '+e.message,true);}
  }}
 ]);
}
window.JennySellsData={askResetDemo,queueSave,whenSaved:()=>writeChain,validateEditorCategory,findCategory,similarity,getStatus:()=>({ready,theme,categories:[...categories],count:items.length}),exportZip,exportJson};
function startup(){
 const app=q('.app');if(app)app.setAttribute('inert','');
 q('.bottom')?.setAttribute('inert','');
 mount();
 const flag=document.createElement('div');flag.id='jsDataLoading';flag.textContent='JennySells-Datenbank wird geladen …';document.body.appendChild(flag);
 bootstrap().catch(e=>{
  notify('IndexedDB konnte nicht gestartet werden: '+e.message+'. Es wurden keine Daten überschrieben. Bitte Browser-Speicher und Berechtigungen prüfen.',true);
  q('#jsDataLoading')?.remove();
  // Editing deliberately remains blocked to prevent accidental fallback overwrite.
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});
else startup();
})();