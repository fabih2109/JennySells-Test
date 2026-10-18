(()=>{
  const VERSION='0.10.13-test';
  const ARCHIVE=[
    {date:'2022-03-12',amount:18},{date:'2022-05-21',amount:27},{date:'2022-08-07',amount:31},{date:'2022-11-18',amount:42},{date:'2022-12-10',amount:27},
    {date:'2023-02-11',amount:35},{date:'2023-04-22',amount:46},{date:'2023-06-18',amount:54},{date:'2023-09-02',amount:63},{date:'2023-11-25',amount:49},{date:'2023-12-09',amount:33},
    {date:'2024-01-20',amount:42},{date:'2024-03-17',amount:58},{date:'2024-05-04',amount:71},{date:'2024-07-13',amount:64},{date:'2024-09-21',amount:82},{date:'2024-11-16',amount:54},{date:'2024-12-07',amount:39},
    {date:'2025-01-18',amount:36},{date:'2025-02-15',amount:44},{date:'2025-03-22',amount:61},{date:'2025-04-26',amount:47},{date:'2025-05-31',amount:73},{date:'2025-06-28',amount:55},{date:'2025-07-19',amount:86},{date:'2025-08-30',amount:68},{date:'2025-09-20',amount:91},{date:'2025-10-18',amount:77},{date:'2025-11-15',amount:64},{date:'2025-12-13',amount:53},
    {date:'2026-01-17',amount:41},{date:'2026-02-14',amount:58},{date:'2026-03-21',amount:36},{date:'2026-04-18',amount:72},{date:'2026-05-16',amount:49},{date:'2026-06-20',amount:63},{date:'2026-07-18',amount:81},{date:'2026-08-22',amount:57}
  ];

  function addFont(){
    if(document.querySelector('link[data-jennysells-logo-font-v7]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap';l.dataset.jennysellsLogoFontV7='1';document.head.appendChild(l);
  }

  function addStyles(){
    if(document.getElementById('jennysells-v070-style'))return;
    const s=document.createElement('style');s.id='jennysells-v070-style';s.textContent=`
      .brandmark{font-family:"Alex Brush","Snell Roundhand","Segoe Script","Brush Script MT",cursive!important;font-size:61px!important;font-weight:400!important;font-style:normal!important;line-height:.88!important;letter-spacing:-1.5px!important}
      .brandmark i{font-family:Georgia,serif!important;font-style:normal!important;font-size:.72em!important;vertical-align:13%}
      .stats{gap:12px!important;margin:12px 0 18px!important}
      .stat{position:relative;overflow:hidden;cursor:pointer;transition:transform .14s ease,box-shadow .14s ease;border-left-width:5px!important;border-left-style:solid!important;min-height:112px}
      .stat:active,.period:active{transform:scale(.985)}
      .stat:nth-child(1){background:#eef5ff!important;border-left-color:#3978c5!important}.stat:nth-child(1) .v{color:#225f9f!important}
      .stat:nth-child(2){background:#f5effb!important;border-left-color:#8a4fb0!important}.stat:nth-child(2) .v{color:#66348a!important}
      .stat:nth-child(3){background:#fff4ec!important;border-left-color:#e06c45!important}.stat:nth-child(3) .v{color:#bb4f2d!important}
      .stat:nth-child(4){background:#edf8f1!important;border-left-color:#2e9a63!important}.stat:nth-child(4) .v{color:#23784e!important}
      .stat:after{content:'›';position:absolute;right:13px;top:12px;color:#8a7a8e;font-size:18px;font-weight:800}
      .periods{gap:12px!important;margin-bottom:20px}
      .period{cursor:pointer;min-height:135px;border-left-width:5px!important;transition:transform .14s ease,box-shadow .14s ease;position:relative}
      .period:first-child{background:#edf7ff!important;border-left-color:#3389c9!important}.period:first-child h3{color:#235f8d!important}.period:first-child .money{color:#236fa4!important}
      .period:last-child{background:#eef9f1!important;border-left-color:#34a66a!important}.period:last-child h3{color:#26734d!important}.period:last-child .money{color:#26734d!important}
      .period:after{content:'Diagramm ›';position:absolute;right:12px;top:12px;font-size:9px;font-weight:800;color:#887a8c}
      #channelTiles{gap:12px!important}.tile{box-shadow:0 7px 18px #54385c17!important}
      #channelTiles .tile:nth-child(1){background:#effbf8!important;border-left-color:#18a589!important}
      #channelTiles .tile:nth-child(2){background:#eef5ff!important;border-left-color:#377dcb!important}
      #channelTiles .tile:nth-child(3){background:#fff3ea!important;border-left-color:#e1783f!important}
      #channelTiles .tile:nth-child(1) .ico{background:#dff6f0!important;color:#087f72!important}
      #channelTiles .tile:nth-child(2) .ico{background:#dfeaff!important;color:#2f6fb5!important}
      #channelTiles .tile:nth-child(3) .ico{background:#ffe2cf!important;color:#bd5b26!important}
      .jsMetricModal{display:none;position:fixed;inset:0;z-index:90;background:#21182566;align-items:flex-end}.jsMetricModal.show{display:flex}
      .jsMetricSheet{width:min(100%,520px);max-height:88vh;overflow:auto;margin:auto;background:#fff;border-radius:26px 26px 0 0;padding:18px 16px 28px;box-shadow:0 -12px 35px #2b1a3330}
      .jsMetricHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.jsMetricHead h2{font:800 23px Georgia,serif;margin:0;color:#2b2030}
      .jsClose{border:0;width:36px;height:36px;border-radius:50%;background:#f5edf7;color:#71389b;font-size:22px}
      .jsMetricLead{color:#817486;font-size:12px;line-height:1.4;margin:4px 0 14px}.jsBreakdown{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 14px}
      .jsMini{border-radius:14px;padding:12px;background:#f8f3fa}.jsMini b{display:block;font:800 18px Georgia,serif;color:#54227d}.jsMini span{font-size:10px;color:#817486}
      .jsChart{background:#fffaf7;border:1px solid #eee4ed;border-radius:17px;padding:10px;margin-top:10px}.jsChart svg{display:block;width:100%;height:auto}
      .jsChartLegend{display:flex;justify-content:space-between;gap:8px;color:#817486;font-size:9px;margin:7px 2px 0}.jsChartNote{font-size:10px;color:#8a798f;margin-top:9px;line-height:1.4}
      .jsMetricList{display:grid;gap:7px;margin-top:10px}.jsMetricList .row{box-shadow:none;border:1px solid #f0e8f2}
      @media(max-width:380px){.brandmark{font-size:53px!important}.stats,.periods{gap:9px!important}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('jsMetricModal'))return;
    const m=document.createElement('div');m.id='jsMetricModal';m.className='jsMetricModal';m.innerHTML=`<div class="jsMetricSheet"><div class="jsMetricHead"><h2 id="jsMetricTitle">Details</h2><button class="jsClose" id="jsMetricClose">×</button></div><div id="jsMetricBody"></div></div>`;document.body.appendChild(m);
    document.getElementById('jsMetricClose').onclick=()=>m.classList.remove('show');m.onclick=e=>{if(e.target===m)m.classList.remove('show')};
  }

  const fmt=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const itemNet=i=>Number(i.soldPrice||0)-Number(i.shipping||0)-Number(i.fees||0);
  function currentSold(){return (typeof items!=='undefined'?items:[]).filter(i=>i.status==='sold'&&i.soldDate).map(i=>({date:i.soldDate,amount:itemNet(i),title:i.title,source:i.source}));}
  function allChartSales(){return [...ARCHIVE,...currentSold()];}

  function lineChart(points,labels,color='#71389b'){
    const W=420,H=210,p={l:38,r:12,t:16,b:34};
    const max=Math.max(10,...points),x=i=>p.l+(points.length===1?0:i*(W-p.l-p.r)/(points.length-1)),y=v=>p.t+(max-v)*(H-p.t-p.b)/max;
    const path=points.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
    const ticks=[0,.25,.5,.75,1].map(f=>Math.round(max*f));
    const grid=ticks.map(v=>`<line x1="${p.l}" x2="${W-p.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eadfea" stroke-width="1"/><text x="${p.l-6}" y="${y(v)+3}" text-anchor="end" font-size="8" fill="#8a798f">${v}€</text>`).join('');
    const dots=points.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.4" fill="${color}"/><text x="${x(i)}" y="${y(v)-8}" text-anchor="middle" font-size="7.5" fill="#5b4c60">${v?Math.round(v):''}</text>`).join('');
    const step=Math.max(1,Math.ceil(labels.length/6)),labs=labels.map((l,i)=>i%step===0||i===labels.length-1?`<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="8" fill="#817486">${l}</text>`:'').join('');
    return `<div class="jsChart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Einnahmenverlauf">${grid}<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labs}</svg></div>`;
  }

  function monthSeries(){const now=new Date(2026,9,1),sales=allChartSales(),pts=[],labs=[];for(let k=11;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth()-k,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');pts.push(sales.filter(s=>s.date.startsWith(key)).reduce((a,s)=>a+s.amount,0));labs.push(d.toLocaleDateString('de-DE',{month:'short'}).replace('.',''));}return {pts,labs};}
  function yearSeries(){const sales=allChartSales(),years=[2022,2023,2024,2025,2026];return {labs:years.map(String),pts:years.map(y=>sales.filter(s=>s.date.startsWith(String(y))).reduce((a,s)=>a+s.amount,0))};}

  function openMetric(title,html){ensureModal();document.getElementById('jsMetricTitle').textContent=title;document.getElementById('jsMetricBody').innerHTML=html;document.getElementById('jsMetricModal').classList.add('show');document.querySelectorAll('#jsMetricBody .itemOpen').forEach(b=>b.onclick=()=>{document.getElementById('jsMetricModal').classList.remove('show');if(typeof openEditor==='function'&&typeof items!=='undefined')openEditor(items.find(i=>i.id===b.dataset.id));});}
  function listHtml(arr){if(!arr.length)return '<div class="note">Keine passenden Artikel.</div>';return `<div class="jsMetricList">${arr.slice(0,8).map(i=>typeof rowHtml==='function'?rowHtml(i):`<div>${i.title}</div>`).join('')}</div>`;}

  function bindMetrics(){
    if(typeof items==='undefined')return;
    const cards=[...document.querySelectorAll('.stats .stat')];
    if(cards[0])cards[0].onclick=()=>{const a=items.filter(i=>['online','reserved'].includes(i.status));openMetric('Aktiv online',`<p class="jsMetricLead">Alle derzeit aktiven oder reservierten Angebote. Zusammen ergeben sie das noch offene Verkaufspotenzial.</p><div class="jsBreakdown"><div class="jsMini"><b>${a.length}</b><span>aktive / reservierte Artikel</span></div><div class="jsMini"><b>${fmt(a.reduce((s,i)=>s+Number(i.price||0),0))}</b><span>Angebotssumme</span></div></div>${listHtml(a)}`)};
    if(cards[1])cards[1].onclick=()=>{const sold=items.filter(i=>i.status==='sold').length,online=items.filter(i=>i.status==='online').length,res=items.filter(i=>i.status==='reserved').length,draft=items.filter(i=>i.status==='draft').length;openMetric('Artikel gesamt',`<p class="jsMetricLead">Alle aktuell in JennySells gespeicherten Artikel – unabhängig vom Verkaufsstatus.</p><div class="jsBreakdown"><div class="jsMini"><b>${online}</b><span>Online</span></div><div class="jsMini"><b>${res}</b><span>Reserviert</span></div><div class="jsMini"><b>${sold}</b><span>Verkauft</span></div><div class="jsMini"><b>${draft}</b><span>Entwurf</span></div></div>${listHtml(items)}`)};
    if(cards[2])cards[2].onclick=()=>{const a=items.filter(i=>['online','reserved'].includes(i.status));openMetric('Offenes Potenzial',`<p class="jsMetricLead">Summe der aktuellen Angebotspreise aller noch nicht verkauften aktiven Artikel. Das ist kein garantierter Erlös, sondern das theoretische Verkaufspotenzial.</p><div class="jsBreakdown"><div class="jsMini"><b>${fmt(a.reduce((s,i)=>s+Number(i.price||0),0))}</b><span>offene Angebotssumme</span></div><div class="jsMini"><b>${a.length}</b><span>Angebote</span></div></div>${listHtml(a.sort((x,y)=>Number(y.price||0)-Number(x.price||0)))}`)};
    if(cards[3])cards[3].onclick=()=>{const s=items.filter(i=>i.status==='sold');openMetric('Einnahmen',`<p class="jsMetricLead">Tatsächlich erfasster Nettoerlös aus verkauften Artikeln: Verkaufspreis abzüglich Versand und Gebühren.</p><div class="jsBreakdown"><div class="jsMini"><b>${fmt(s.reduce((a,i)=>a+itemNet(i),0))}</b><span>Nettoerlös</span></div><div class="jsMini"><b>${s.length}</b><span>Verkäufe</span></div></div>${listHtml(s.sort((a,b)=>(b.soldDate||'').localeCompare(a.soldDate||'')))}`)};

    const periods=[...document.querySelectorAll('.periods .period')];
    if(periods[0]){periods[0].onclick=()=>{const s=monthSeries();openMetric('Monatliche Einnahmen',`<p class="jsMetricLead">Netto-Verkaufseinnahmen der letzten 12 Monate. Für die Demo werden ältere archivierte Beispielverkäufe ergänzt, damit der Verlauf sichtbar wird.</p>${lineChart(s.pts,s.labs,'#3389c9')}<div class="jsChartNote">Aktuelle JennySells-Artikel bleiben unverändert; ältere Werte dienen nur als Demo-Verkaufshistorie.</div>`);};}
    if(periods[1]){periods[1].onclick=()=>{const s=yearSeries();openMetric('Jährliche Einnahmen',`<p class="jsMetricLead">Entwicklung der Netto-Verkaufseinnahmen über mehrere Jahre – inklusive archivierter Demo-Historie.</p>${lineChart(s.pts,s.labs,'#34a66a')}<div class="jsChartNote">Die historischen Werte dienen der Demo des langfristigen Trends.</div>`);};}
  }

  function patchSettings(){const v=document.getElementById('appVersion');if(v)v.textContent='v'+VERSION;}
  function init(){addFont();addStyles();ensureModal();bindMetrics();patchSettings();}
  init();
  if(typeof refresh==='function'){const prev=refresh;refresh=function(){prev();setTimeout(()=>{bindMetrics();patchSettings();},0)};}
})();