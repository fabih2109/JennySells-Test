const KEY='jennysellsItemsV4';
const eur=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>new Date().toISOString().slice(0,10);
const icons={Vinted:'V',Kleinanzeigen:'K',Basar:'🧺',eBay:'e',Privat:'♥'};
const clothes=['👖','🧥','👕','👟','🧸','📚','🚲','🍼','🧢','🧩'];
let items=[];
let currentChild='';
const $=s=>document.querySelector(s);

function load(){try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');items=Array.isArray(stored)?stored:[]}catch{items=[]}/* IndexedDB hydration in data-v117.js; never overwrite storage during bootstrap. */}
function save(){if(window.JennySellsData?.queueSave)return window.JennySellsData.queueSave(items);localStorage.setItem(KEY,JSON.stringify(items));}
function net(i){return Number(i.soldPrice||0)-Number(i.shipping||0)-Number(i.fees||0);}
function statusLabel(s){return {online:'Online',reserved:'Reserviert',sold:'Verkauft',draft:'Entwurf'}[s]||s;}
function statusClass(s){return s==='sold'?'sold':s==='reserved'?'res':s==='draft'?'draft':'';}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function rowHtml(i){const amount=i.status==='sold'?eur(net(i)):eur(i.price);const src=i.source||'Privat';const srcClass=src==='Kleinanzeigen'?' source-Kleinanzeigen':'';return `<button class="row itemOpen" data-id="${esc(i.id)}"><div class="thumb">${esc(i.emoji||'👕')}</div><div class="rowMain"><b>${esc(i.title)}</b><small>${esc([i.brand,i.size&&('Gr. '+i.size),src].filter(Boolean).join(' · '))}</small><span class="marketChip${srcClass}"><span class="marketSymbol">${esc(icons[src]||'♥')}</span>${esc(src)}</span>${i.status==='sold'&&(i.saleType==='package'||i.soldInPackage)?'<span class="jsPackageBadge">📦 Im Paket verkauft</span>':''}</div><div class="right"><strong>${amount}</strong><span class="pill ${statusClass(i.status)}">${esc(statusLabel(i.status))}</span></div><span class="rowChevron" aria-hidden="true">›</span></button>`;}
function dashboard(){const active=items.filter(i=>['online','reserved'].includes(i.status));const sold=items.filter(i=>i.status==='sold');$('#stActive').textContent=active.length;$('#stTotal').textContent=items.length;$('#stPotential').textContent=eur(active.reduce((a,i)=>a+Number(i.price||0),0));$('#stRevenue').textContent=eur(sold.reduce((a,i)=>a+net(i),0));const channels=['Vinted','Kleinanzeigen','Basar'];$('#channelTiles').innerHTML=channels.map(c=>{const a=items.filter(i=>i.source===c),r=a.filter(i=>i.status==='sold').reduce((s,i)=>s+net(i),0);return `<button class="tile channelGo" data-channel="${c}"><span class="badge">${a.length} Artikel</span><div class="ico">${icons[c]}</div><b>${c}</b><small>${eur(r)}</small></button>`}).join('');$('#recentSold').innerHTML=[...sold].sort((a,b)=>(b.soldDate||'').localeCompare(a.soldDate||'')).slice(0,4).map(rowHtml).join('')||'<div class="note">Noch nichts verkauft.</div>';$('#recentItems').innerHTML=[...items].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5).map(rowHtml).join('');bindRows();}
/* Suche v0.11.5: Kategorie und Größe als kombinierbare Filter; URL-Suche bleibt lokal. */
const searchCollator=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
const searchText=value=>String(value??'').trim().replace(/\s+/g,' ');
const searchFold=value=>searchText(value).toLocaleLowerCase('de-DE');
const searchSize=value=>searchFold(value).replace(/\s*([\/–-])\s*/g,'$1');
function fillSearchFacet(id,label,values,fold){
 const select=$('#'+id);
 if(!select)return;
 const distinct=new Map();
 values.forEach(raw=>{
  const value=searchText(raw),key=fold(value);
  if(key&&!distinct.has(key))distinct.set(key,value);
 });
 const options=[...distinct.values()].sort(searchCollator.compare);
 const signature=JSON.stringify(options);
 if(select.dataset.optionsSignature===signature)return;
 const prior=select.value,priorKey=fold(prior);
 select.replaceChildren(new Option(label,''));
 options.forEach(value=>select.add(new Option(value,value)));
 const existing=options.find(value=>fold(value)===priorKey);
 select.value=existing||'';
 select.dataset.optionsSignature=signature;
}
function syncSearchFacets(){
 const configured=window.JennySellsData?.getStatus?.().categories||[];
 fillSearchFacet('categoryFilter','Alle Kategorien',
  [...configured,...items.map(item=>item.category)],searchFold);
 fillSearchFacet('sizeFilter','Alle Größen',
  items.map(item=>item.size),searchSize);
}
function matchesSearchItem(item,query,source,status,category,size,normalizedUrl){
 const candidate=[item.title,item.brand,item.size,item.category,item.color,item.source,item.note,item.url]
  .map(searchText).join(' ').toLocaleLowerCase('de-DE');
 const linked=normalizedUrl&&item.url&&window.JennySellsQuickSale?.canonicalKey?.(item.url)===normalizedUrl;
 return (!query||candidate.includes(query)||linked)&&
  (!source||item.source===source)&&(!status||item.status===status)&&
  (!category||searchFold(item.category)===searchFold(category))&&
  (!size||searchSize(item.size)===searchSize(size))&&
  (!currentChild||item.child===currentChild);
}
function renderItems(){
 syncSearchFacets();
 const query=searchFold($('#globalSearch')?.value);
 const source=$('#sourceFilter')?.value||'',status=$('#statusFilter')?.value||'';
 const category=$('#categoryFilter')?.value||'',size=$('#sizeFilter')?.value||'';
 const normalizedUrl=window.JennySellsQuickSale?.canonicalKey?.($('#globalSearch')?.value||'')||'';
 const filtered=items.filter(item=>matchesSearchItem(item,query,source,status,category,size,normalizedUrl));
 $('#resultCount').textContent=filtered.length+' von '+items.length+' Artikeln';
 $('#itemList').innerHTML=filtered.map(rowHtml).join('')||'<div class="note">Keine Artikel gefunden. Passe die Suchbegriffe oder Filter an.</div>';
 const clear=$('#jsSearchReset');
 if(clear)clear.hidden=!(query||source||status||category||size);
 bindRows();
}
function renderSold(){let s=items.filter(i=>i.status==='sold');$('#soldRevenue').textContent=eur(s.reduce((a,i)=>a+net(i),0));$('#soldCount').textContent=s.length;$('#soldList').innerHTML=s.sort((a,b)=>(b.soldDate||'').localeCompare(a.soldDate||'')).map(rowHtml).join('')||'<div class="note">Noch nichts verkauft.</div>';bindRows();}
function stats(){const sold=items.filter(i=>i.status==='sold');const group=key=>Object.entries(sold.reduce((a,i)=>{let k=i[key]||'Sonstige';a[k]=(a[k]||0)+net(i);return a;},{})).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="row"><div class="thumb">${key==='source'?(icons[k]||'•'):'♥'}</div><div><b>${esc(k)}</b><small>Nettoerlös</small></div><div class="right"><strong>${eur(v)}</strong></div></div>`).join('');$('#statsChannels').innerHTML=group('source');$('#statsChildren').innerHTML=group('category');}
function children(){/* Child filtering was intentionally retired in v0.10.9. */}
function refresh(){dashboard();renderItems();renderSold();stats();children();}
function go(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));$('#'+id).classList.add('on');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('sel',n.dataset.go===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='items')renderItems();}
function bindRows(){document.querySelectorAll('.itemOpen').forEach(b=>b.onclick=()=>openEditor(items.find(i=>i.id===b.dataset.id)));}
function blank(){return {id:uid(),title:'',brand:'',size:'',category:'',color:'',condition:'',source:'Vinted',status:'online',price:null,onlineSince:today(),url:'',note:'',soldPrice:null,soldDate:'',shipping:0,fees:0,emoji:'👕',createdAt:new Date().toISOString()};}
function openEditor(i=blank(),note=''){ $('#editorBg').classList.add('show');$('#editId').value=i.id||'';$('#editorTitle').textContent=items.some(x=>x.id===i.id)?'Artikel bearbeiten':'Artikel hinzufügen';const map={fTitle:'title',fBrand:'brand',fSize:'size',fCategory:'category',fColor:'color',fCondition:'condition',fSource:'source',fStatus:'status',fPrice:'price',fOnlineSince:'onlineSince',fUrl:'url',fNote:'note',fSoldPrice:'soldPrice',fSoldDate:'soldDate',fShipping:'shipping',fFees:'fees'};Object.entries(map).forEach(([id,k])=>$('#'+id).value=i[k]??'');$('#importNote').classList.toggle('hidden',!note);$('#importNote').textContent=note;syncSale();calcNet();$('#deleteItem').classList.toggle('hidden',!items.some(x=>x.id===i.id));}
function syncSale(){$('#saleBox').classList.toggle('hidden',$('#fStatus').value!=='sold');}
function calcNet(){$('#netPreview').textContent=eur(Number($('#fSoldPrice').value||0)-Number($('#fShipping').value||0)-Number($('#fFees').value||0));}
function num(id){let v=$(id).value;return v===''?null:Number(v);}
function collect(){let old=items.find(x=>x.id===$('#editId').value)||blank();return {...old,id:$('#editId').value||uid(),title:$('#fTitle').value.trim(),brand:$('#fBrand').value.trim(),size:$('#fSize').value.trim(),category:$('#fCategory').value.trim(),color:$('#fColor').value.trim(),condition:$('#fCondition').value,source:$('#fSource').value,status:$('#fStatus').value,price:num('#fPrice'),onlineSince:$('#fOnlineSince').value,url:$('#fUrl').value.trim(),note:$('#fNote').value.trim(),soldPrice:num('#fSoldPrice'),soldDate:$('#fSoldDate').value,shipping:num('#fShipping')||0,fees:num('#fFees')||0};}
function parseShare(){const qp=new URLSearchParams(location.search);let incoming=[qp.get('title'),qp.get('text'),qp.get('url')].filter(Boolean).join('\n');if(!incoming)return;const um=incoming.match(/https?:\/\/[^\s]+/i);let url=um?um[0]:'';let t=(incoming.split(url)[0]||'').replace(/\|\s*Vinted\s*$/i,'').trim();let idm=url.match(/\/items\/(\d+)-?([^/?#]*)/i);let slug=idm&&idm[2]?decodeURIComponent(idm[2]).replace(/-/g,' ').replace(/\bgrosse\b/gi,'Größe'):'';if(!t)t=slug;let parts=t.split('|').map(x=>x.trim()).filter(Boolean),size=(t.match(/(?:Größe|Gr\.?)\s*(\d{2,3})/i)||[])[1]||'',brand=parts[0]||'',category=parts.slice(1).filter(p=>!/(Größe|Gr\.)/i.test(p)).join(' / ');let i=blank();i.title=t||'Vinted-Artikel';i.brand=brand;i.size=size;i.category=category;i.source='Vinted';i.url=url;i.onlineSince=today();openEditor(i,'Von Vinted geteilt · Artikel-ID '+(idm?idm[1]:'erkannt'));history.replaceState({},'',location.pathname);}

$('#saveItem').onclick=()=>{if(window.JennySellsData?.validateEditorCategory&&!window.JennySellsData.validateEditorCategory())return;let r=collect();let ix=items.findIndex(x=>x.id===r.id);if(ix>=0)items[ix]=r;else items.unshift(r);save();$('#editorBg').classList.remove('show');refresh();go('items');};
function hideDeleteConfirm(){const bg=$('#deleteConfirmBg');bg.hidden=true;$('#deleteItem').focus();}
$('#deleteItem').onclick=()=>{
  const bg=$('#deleteConfirmBg'),item=items.find(i=>i.id===$('#editId').value);
  if(!item)return;
  $('#jsDeleteConfirmText').textContent='„'+(item.title||'Dieser Artikel')+'“ und das dazugehörige Titelbild wirklich dauerhaft löschen?';
  bg.hidden=false;$('#cancelDelete').focus();
};
$('#cancelDelete').onclick=hideDeleteConfirm;
$('#deleteConfirmBg').onclick=e=>{if(e.target.id==='deleteConfirmBg')hideDeleteConfirm()};
$('#confirmDelete').onclick=()=>{
  const id=$('#editId').value;
  if(!items.some(i=>i.id===id)){hideDeleteConfirm();return}
  items=items.filter(i=>i.id!==id);
  save();$('#deleteConfirmBg').hidden=true;$('#editorBg').classList.remove('show');refresh();
};
document.addEventListener('keydown',e=>{
  const bg=$('#deleteConfirmBg');
  if(e.key==='Escape'&&bg&&!bg.hidden){e.preventDefault();hideDeleteConfirm()}
});
$('#closeEditor').onclick=()=>$('#editorBg').classList.remove('show');
$('#editorBg').onclick=e=>{if(e.target.id==='editorBg')$('#editorBg').classList.remove('show');};
$('#fStatus').onchange=syncSale;['#fSoldPrice','#fShipping','#fFees'].forEach(x=>$(x).oninput=calcNet);
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.status)$('#statusFilter').value=b.dataset.status;go(b.dataset.go);});
$('#navAdd').onclick=()=>openEditor();
$('#globalSearch').oninput=()=>{go('items');renderItems();};
$('#sourceFilter').onchange=renderItems;$('#statusFilter').onchange=renderItems;
$('#categoryFilter').onchange=renderItems;$('#sizeFilter').onchange=renderItems;
$('#jsSearchReset').onclick=()=>{$('#globalSearch').value='';['sourceFilter','statusFilter','categoryFilter','sizeFilter'].forEach(id=>$('#'+id).value='');currentChild='';renderItems();$('#globalSearch').focus();};
document.addEventListener('click',e=>{let t=e.target.closest('.channelGo');if(t){$('#sourceFilter').value=t.dataset.channel;go('items');}});
load();refresh();parseShare();