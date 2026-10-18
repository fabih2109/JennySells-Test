const KEY='jennysellsItemsV4';
const eur=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>new Date().toISOString().slice(0,10);
const icons={Vinted:'V',Kleinanzeigen:'K',Basar:'🧺',eBay:'e',Privat:'♥'};
const clothes=['👖','🧥','👕','👟','🧸','📚','🚲','🍼','🧢','🧩'];
let items=[];
let currentChild='';
const $=s=>document.querySelector(s);

const demo=[
['C&A Jogginghose','C&A','86','Hose / Jogginghose','Ben','Sehr gut','Vinted','online',12,'2026-10-05',null,null,'Keller → Kiste 86/92','👖'],
['H&M Winterjacke','H&M','104','Jacke','Felix','Gut','Vinted','online',18,'2026-09-27',null,null,'Garderobe','🧥'],
['Nike Sweatshirt','Nike','110','Pullover','Felix','Sehr gut','Vinted','reserved',16,'2026-10-02',null,null,'Kiste 104/110','👕'],
['Zara Jeans','Zara','98','Hose','Felix','Gut','Vinted','sold',10,'2026-09-18',8,'2026-10-03','Kiste 98/104','👖'],
['Lupilu Regenhose','Lupilu','92','Outdoor','Ben','Gut','Vinted','online',7,'2026-10-01',null,null,'Kiste 86/92','👖'],
['Adidas Sneaker','Adidas','28','Schuhe','Felix','Gut','Vinted','sold',14,'2026-09-10',10,'2026-09-29','Schuhschrank','👟'],
['Ergee Schlafanzug Set','Ergee','86','Schlafanzug','Ben','Sehr gut','Vinted','online',9,'2026-10-08',null,null,'Kiste 86/92','👕'],
['Name It Strickpulli','Name It','104','Pullover','Felix','Sehr gut','Vinted','draft',11,'',null,null,'Kiste 104/110','👕'],
['Sterntaler Mütze','Sterntaler','51','Mütze','Ben','Gut','Vinted','sold',6,'2026-09-02',4,'2026-09-21','Winterkiste','🧢'],
['Finkid Softshelljacke','Finkid','110','Jacke','Felix','Sehr gut','Vinted','online',20,'2026-10-09',null,null,'Garderobe','🧥'],
['Puky Laufrad','Puky','','Fahrzeug','Felix','Gut','Kleinanzeigen','sold',45,'2026-08-20',35,'2026-09-04','Garage','🚲'],
['Playmobil Feuerwehr','Playmobil','','Spielzeug','Felix','Sehr gut','Kleinanzeigen','online',21,'2026-10-01',null,null,'Spielzeugkiste','🧩'],
['BabyBjörn Wippe','BabyBjörn','','Baby','Ben','Gut','Kleinanzeigen','sold',35,'2026-08-15',27.5,'2026-09-12','Dachboden','🍼'],
['LEGO Duplo Set','LEGO','','Spielzeug','Felix','Gut','Kleinanzeigen','online',22,'2026-10-07',null,null,'Spielzimmer','🧩'],
['Kinderbücher Paket','Ravensburger','','Bücher','Felix','Gut','Kleinanzeigen','sold',12,'2026-09-01',8,'2026-09-23','Bücherregal','📚'],
['Winterstiefel','Superfit','27','Schuhe','Felix','Gut','Kleinanzeigen','online',16,'2026-10-06',null,null,'Schuhschrank','👟'],
['Matschküche Zubehör','','','Spielzeug','Felix','Gut','Kleinanzeigen','online',10,'',null,null,'Garage','🧸'],
['Babybody Paket 5x','Lupilu','74','Bodies','Ben','Gut','Basar','sold',8,'2026-09-14',7.5,'2026-09-14','Basarkiste','👕'],
['Holzpuzzle Paket','','','Spielzeug','Felix','Gut','Basar','sold',6,'2026-09-14',5,'2026-09-14','Basarkiste','🧩'],
['Babymütze + Schal','','80','Accessoires','Ben','Sehr gut','Basar','sold',4,'2026-09-14',3.5,'2026-09-14','Basarkiste','🧢']
];

function seed(){return demo.map((d,i)=>({id:'demo'+i,title:d[0],brand:d[1],size:d[2],category:d[3],child:d[4],condition:d[5],source:d[6],status:d[7],price:d[8],onlineSince:d[9],soldPrice:d[10],soldDate:d[11],storage:d[12],emoji:d[13],purchasePrice:null,purchaseYear:'',url:'',note:'',shipping:0,fees:0,createdAt:new Date(Date.now()-i*86400000).toISOString()}));}
function load(){try{items=JSON.parse(localStorage.getItem(KEY)||'null')||seed()}catch{items=seed()}save();}
function save(){localStorage.setItem(KEY,JSON.stringify(items));}
function net(i){return Number(i.soldPrice||0)-Number(i.shipping||0)-Number(i.fees||0);}
function statusLabel(s){return {online:'Online',reserved:'Reserviert',sold:'Verkauft',draft:'Entwurf'}[s]||s;}
function statusClass(s){return s==='sold'?'sold':s==='reserved'?'res':s==='draft'?'draft':'';}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function rowHtml(i){const amount=i.status==='sold'?eur(net(i)):eur(i.price);return `<button class="row itemOpen" data-id="${i.id}"><div class="thumb">${i.emoji||'👕'}</div><div><b>${esc(i.title)}</b><small>${esc([i.brand,i.size&&('Gr. '+i.size),i.color,i.source].filter(Boolean).join(' · '))}</small></div><div class="right"><strong>${amount}</strong><span class="pill ${statusClass(i.status)}">${statusLabel(i.status)}</span></div></button>`;}
function dashboard(){const active=items.filter(i=>['online','reserved'].includes(i.status));const sold=items.filter(i=>i.status==='sold');$('#stActive').textContent=active.length;$('#stTotal').textContent=items.length;$('#stPotential').textContent=eur(active.reduce((a,i)=>a+Number(i.price||0),0));$('#stRevenue').textContent=eur(sold.reduce((a,i)=>a+net(i),0));const channels=['Vinted','Kleinanzeigen','Basar'];$('#channelTiles').innerHTML=channels.map(c=>{const a=items.filter(i=>i.source===c),r=a.filter(i=>i.status==='sold').reduce((s,i)=>s+net(i),0);return `<button class="tile channelGo" data-channel="${c}"><span class="badge">${a.length}</span><div class="ico">${icons[c]}</div><b>${c}</b><small>${eur(r)} Einnahmen</small></button>`}).join('');$('#recentSold').innerHTML=[...sold].sort((a,b)=>(b.soldDate||'').localeCompare(a.soldDate||'')).slice(0,4).map(rowHtml).join('')||'<div class="note">Noch nichts verkauft.</div>';$('#recentItems').innerHTML=[...items].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5).map(rowHtml).join('');bindRows();}
function renderItems(){let q=$('#globalSearch').value.trim().toLowerCase(),source=$('#sourceFilter').value,status=$('#statusFilter').value;let filtered=items.filter(i=>{const hay=[i.title,i.brand,i.size,i.category,i.color,i.source,i.note].join(' ').toLowerCase();return (!q||hay.includes(q))&&(!source||i.source===source)&&(!status||i.status===status)&&(!currentChild||i.child===currentChild);});$('#resultCount').textContent=`${filtered.length} von ${items.length} Artikeln`;$('#itemList').innerHTML=filtered.map(rowHtml).join('')||'<div class="note">Keine Artikel gefunden.</div>';bindRows();}
function renderSold(){let s=items.filter(i=>i.status==='sold');$('#soldRevenue').textContent=eur(s.reduce((a,i)=>a+net(i),0));$('#soldCount').textContent=s.length;$('#soldList').innerHTML=s.map(rowHtml).join('')||'<div class="note">Noch nichts verkauft.</div>';bindRows();}
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

$('#saveItem').onclick=()=>{let r=collect();let ix=items.findIndex(x=>x.id===r.id);if(ix>=0)items[ix]=r;else items.unshift(r);save();$('#editorBg').classList.remove('show');refresh();go('items');};
$('#deleteItem').onclick=()=>{items=items.filter(i=>i.id!==$('#editId').value);save();$('#editorBg').classList.remove('show');refresh();};
$('#closeEditor').onclick=()=>$('#editorBg').classList.remove('show');
$('#editorBg').onclick=e=>{if(e.target.id==='editorBg')$('#editorBg').classList.remove('show');};
$('#fStatus').onchange=syncSale;['#fSoldPrice','#fShipping','#fFees'].forEach(x=>$(x).oninput=calcNet);
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.status)$('#statusFilter').value=b.dataset.status;go(b.dataset.go);});
$('#quickAdd').onclick=$('#navAdd').onclick=()=>openEditor();
$('#globalSearch').oninput=()=>{go('items');renderItems();};
$('#sourceFilter').onchange=renderItems;$('#statusFilter').onchange=renderItems;
document.addEventListener('click',e=>{let t=e.target.closest('.channelGo');if(t){$('#sourceFilter').value=t.dataset.channel;go('items');}});
if($('#resetDemo'))$('#resetDemo').onclick=()=>{items=seed();save();currentChild='';$('#globalSearch').value='';$('#sourceFilter').value='';$('#statusFilter').value='';refresh();go('home');};
load();refresh();parseShare();