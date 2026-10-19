/* JennySells v0.10.12 — design layer, real saved data only. */
(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const money=n=>Number(n||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
  const netAmount=i=>Number(i.soldPrice||0)-Number(i.shipping||0)-Number(i.fees||0);
  const symbols={
    box:'<rect x="4" y="8" width="16" height="13" rx="1"/><path d="m4 8 8-5 8 5m-8-5v18m-8-13 8 5 8-5"/>',
    tag:'<path d="M20 12 12 20 3 11V4h7z"/><circle cx="7.5" cy="8" r="1.4"/>',
    bars:'<path d="M5 20v-6m7 6V8m7 12V4"/>',
    coins:'<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 2 12 2 12 0V6M3 11v4c0 2 12 2 12 0v-4"/><path d="M16 10c3-1 5 0 5 2v5c0 2-5 3-7 2"/>',
    note:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 13h7M9 17h7"/>',
    home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    check:'<path d="m4 12 5 5L20 5"/>',
    gear:'<path d="M10 2h4l.6 2.5 2 1 2.5-1 2 3.5-2 2v2l2 2-2 3.5-2.5-1-2 1L14 22h-4l-.6-2.5-2-1-2.5 1-2-1-2 3.5-2-2v-2l-2-2 2-3.5 2.5 1 2-1z"/><circle cx="12" cy="12" r="3"/>',
    scan:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><rect x="8" y="8" width="8" height="8" rx="2"/>',
    camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>'
  };
  const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(symbols[name]||symbols.box)+'</svg>';
  let mode='month',mounted=false;

  function navStyle(){
    const icons={home:'home',items:'search',sold:'check',stats:'bars',settings:'gear'};
    $$('.bottom .nav').forEach(button=>{
      const name=icons[button.dataset.go];
      if(!name||button.dataset.jsIconDone)return;
      const span=button.querySelector('span');if(span)span.innerHTML=icon(name);
      button.dataset.jsIconDone='1';
    });
    const soldNav=$('.bottom [data-go="sold"]');
    if(soldNav&&soldNav.lastChild&&soldNav.lastChild.nodeType===Node.TEXT_NODE)soldNav.lastChild.textContent='Verkauf';
    $('#navAdd')?.setAttribute('aria-label','Artikel hinzufügen');
  }
  function metricStyle(){
    $$('#home .stats .stat').forEach((card,i)=>{
      if(!card.querySelector('.metricIcon'))card.insertAdjacentHTML('afterbegin','<span class="metricIcon" aria-hidden="true">'+icon(['box','tag','bars','coins'][i]||'box')+'</span>');
      card.setAttribute('role','button');card.setAttribute('tabindex','0');
      if(!card.dataset.jsKeyboard){
        card.dataset.jsKeyboard='1';
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
      }
    });
    $$('#sold .stats .stat').forEach((card,i)=>{
      if(!card.querySelector('.metricIcon'))card.insertAdjacentHTML('afterbegin','<span class="metricIcon" aria-hidden="true">'+icon(i?'bars':'coins')+'</span>');
    });
  }
  function importStyle(){
    const btn=$('#marketImportLaunch');if(!btn||btn.dataset.jsRefined)return;
    btn.dataset.jsRefined='1';
    btn.innerHTML='<span class="jsImportSymbol" aria-hidden="true">'+icon('camera')+'</span><span class="jsImportText"><b>Verkaufsartikel importieren</b><span>Link & Screenshots auswerten</span></span><span class="jsImportArrow" aria-hidden="true">›</span>';
    btn.setAttribute('aria-label','Verkaufsartikel importieren');
  }
  function ensurePages(){
    const app=$('.app');if(!app)return;
    if(!$('#newest')){
      const page=document.createElement('section');page.id='newest';page.className='view';
      page.innerHTML='<div class="hero"><h1>Neueste Artikel</h1><p>Deine zuletzt hinzugefügten Verkaufsartikel auf einen Blick ♡</p></div>'+
       '<div class="jsNewestCounts">'+
        '<div class="jsMiniMetric"><div class="jsMiniIcon">'+icon('tag')+'</div><div><b id="jsNewCount">0</b><span>Neu (30 Tage)</span></div></div>'+
        '<div class="jsMiniMetric"><div class="jsMiniIcon">'+icon('box')+'</div><div><b id="jsNewOnline">0</b><span>Online</span></div></div>'+
        '<div class="jsMiniMetric"><div class="jsMiniIcon">'+icon('note')+'</div><div><b id="jsNewDraft">0</b><span>Entwurf</span></div></div>'+
       '</div>'+
       '<div class="jsSectionTitle"><h2>Neueste Artikel</h2><button id="jsNewestAll" type="button">Alle Artikel ›</button></div>'+
       '<div class="panel jsListPanel" id="newestList"></div>';
      const stats=$('#stats');if(stats)stats.parentNode.insertBefore(page,stats);
      else app.appendChild(page);
      $('#jsNewestAll').onclick=()=>go('items');
    }
    const sec=$$('#home .sec').find(x=>/^Übersicht/.test(x.textContent.trim()));
    if(sec&&!$('#jsNewestHomeLink')){
      const existing=sec.querySelector('[data-go="items"]');
      const links=document.createElement('div');links.className='jsHeadingLinks';
      const newest=document.createElement('button');newest.id='jsNewestHomeLink';newest.type='button';newest.textContent='Neueste ›';newest.onclick=()=>go('newest');
      links.appendChild(newest);if(existing)links.appendChild(existing);
      sec.appendChild(links);
    }
    if($('#items .hero')&&!$('#jsNewestSearchLink')){
      const btn=document.createElement('button');btn.type='button';btn.className='chip';btn.id='jsNewestSearchLink';btn.textContent='Neueste Artikel ›';
      btn.onclick=()=>go('newest');$('#items .hero').appendChild(btn);
    }
    const sold=$('#soldList');
    if(sold&&!$('#jsSoldHeading')){
      const head=document.createElement('div');head.id='jsSoldHeading';head.className='jsSectionTitle';
      head.innerHTML='<h2>Zuletzt verkauft</h2><button id="jsSoldShowAll" type="button">Alle Artikel ›</button>';
      sold.insertAdjacentElement('beforebegin',head);
      $('#jsSoldShowAll').onclick=()=>{$('#statusFilter').value='sold';go('items');};
    }
    ['soldList','itemList'].forEach(id=>$('#'+id)?.classList.add('jsListPanel'));
    ['recentSold','recentItems'].forEach(id=>{
      const node=$('#'+id);const prev=node?.previousElementSibling;
      if(prev?.classList.contains('sec'))prev.classList.add('jsHomeLegacyRecent');
    });
  }
  function newestData(){
    const source=typeof items!=='undefined'?items:[];
    const sorted=[...source].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    const cutoff=Date.now()-30*86400000;
    const last30=sorted.filter(i=>{const ms=Date.parse(i.createdAt||'');return Number.isFinite(ms)&&ms>=cutoff;});
    const set=(id,v)=>{const el=$('#'+id);if(el)el.textContent=String(v);};
    set('jsNewCount',last30.length);
    set('jsNewOnline',last30.filter(i=>i.status==='online').length);
    set('jsNewDraft',last30.filter(i=>i.status==='draft').length);
    const list=$('#newestList');
    if(list){
      list.innerHTML=sorted.length&&typeof rowHtml==='function'?sorted.map(rowHtml).join(''):'<p class="note">Noch keine Artikel vorhanden.</p>';
      if(typeof bindRows==='function')bindRows();
    }
  }
  function getChart(){
    const src=typeof items!=='undefined'?items:[],now=new Date();
    const dates=mode==='month'?Array.from({length:12},(_,i)=>new Date(now.getFullYear(),now.getMonth()-11+i,1)):
      Array.from({length:5},(_,i)=>new Date(now.getFullYear()-4+i,0,1));
    const sums=dates.map(d=>{
      const prefix=mode==='month'?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'):String(d.getFullYear());
      return src.filter(i=>i.status==='sold'&&(i.soldDate||'').startsWith(prefix)).reduce((s,i)=>s+netAmount(i),0);
    });
    const labels=dates.map(d=>mode==='month'?d.toLocaleDateString('de-DE',{month:'short'}).replace('.',''):String(d.getFullYear()));
    const lastDate=dates[dates.length-1],prefix=mode==='month'?lastDate.getFullYear()+'-'+String(lastDate.getMonth()+1).padStart(2,'0'):String(lastDate.getFullYear());
    const count=src.filter(i=>i.status==='sold'&&(i.soldDate||'').startsWith(prefix)).length;
    const title=mode==='month'?lastDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'}):String(lastDate.getFullYear());
    return {sums,labels,title,count};
  }
  function graph(values,labels){
    const w=330,h=180,l=36,r=7,t=14,b=30,m=Math.ceil(Math.max(10,...values.map(x=>Math.max(0,x)))/10)*10;
    const x=i=>l+i*((w-l-r)/Math.max(1,values.length-1));
    const y=v=>t+((m-v)/m)*(h-t-b);
    const pts=values.map((v,i)=>[x(i),y(Math.max(0,v))]);
    const line=pts.map(([xx,yy],i)=>(i?'L':'M')+xx.toFixed(2)+' '+yy.toFixed(2)).join(' ');
    const area=line+' L '+x(values.length-1)+' '+(h-b)+' L '+l+' '+(h-b)+' Z';
    const grid=[0,.25,.5,.75,1].map(p=>{
      const yy=y(m*p);return '<line x1="'+l+'" y1="'+yy+'" x2="'+(w-r)+'" y2="'+yy+'" stroke="#E9DFF4" stroke-dasharray="3 3"/><text x="'+(l-4)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9" fill="#8A7D9B">'+Math.round(m*p)+' €</text>';
    }).join('');
    const dots=pts.map(([xx,yy])=>'<circle cx="'+xx+'" cy="'+yy+'" r="3.6" stroke="white" stroke-width="1.6" fill="#7E22CF"/>').join('');
    const step=Math.max(1,Math.ceil(labels.length/6));
    const text=labels.map((label,i)=>(i%step===0||i===labels.length-1)?'<text x="'+x(i)+'" y="'+(h-7)+'" font-size="9" fill="#83728D" text-anchor="middle">'+label+'</text>':'').join('');
    return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Netto-Verkaufseinnahmen im Zeitverlauf">'+
      '<defs><linearGradient id="jsGraphFill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#D69AF4" stop-opacity=".48"/><stop offset="1" stop-color="#F8ECFE" stop-opacity=".1"/></linearGradient></defs>'+
      grid+'<path d="'+area+'" fill="url(#jsGraphFill)"/><path d="'+line+'" stroke="#7820C8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+dots+text+'</svg>';
  }
  function ensureChart(){
    const period=$('#home .periods');if(!period)return;
    const heading=$$('#home .sec').find(x=>/Einnahmen im Zeitraum/.test(x.querySelector('h2')?.textContent||''));
    heading?.classList.add('jsLegacyPeriodHeading');
    if($('#jsHomeChart'))return;
    const div=document.createElement('div');div.id='jsHomeChart';div.className='jsHomeChart';
    div.innerHTML='<div class="jsChartHead"><h3>Einnahmen im Zeitraum <button type="button" class="jsChartInfo" id="jsChartDetails" aria-label="Mehr über Einnahmen">i</button></h3><button type="button" class="jsChartMode" id="jsChartMode">Monat⌄</button></div>'+
      '<div class="jsChartMain"><div class="jsChartSummary"><span class="jsChartPeriod" id="jsChartPeriod">—</span><strong id="jsChartAmount">0,00 €</strong><small id="jsChartCount">0 Verkäufe</small><div class="jsChartChange" id="jsChartChange">–</div></div><div class="jsChartPlot" id="jsChartPlot"></div></div>'+
      '<div class="jsChartNote">Nettoerlöse aus gespeicherten Verkäufen.</div>';
    period.insertAdjacentElement('afterend',div);
    $('#jsChartMode').onclick=()=>{mode=mode==='month'?'year':'month';drawChart();};
    $('#jsChartDetails').onclick=()=>{
      const data=getChart();
      const modal=$('#jsMetricModal');
      if(!modal)return;
      $('#jsMetricTitle').textContent=mode==='month'?'Monatliche Einnahmen':'Jährliche Einnahmen';
      $('#jsMetricBody').innerHTML='<p class="jsMetricLead">Nettoerlöse aus den gespeicherten JennySells-Verkäufen.</p>'+
        '<div class="jsChart">'+graph(data.sums,data.labels)+'</div>'+
        '<div class="jsChartNote">Nettoerlös = Verkaufspreis minus Versandkosten und Gebühren.</div>';
      modal.classList.add('show');
    };
  }
  function drawChart(){
    if(!$('#jsHomeChart'))return;
    const data=getChart(),a=data.sums;
    const current=a[a.length-1],previous=a[a.length-2]||0;
    const delta=previous?(current-previous)/Math.abs(previous)*100:null;
    const change=delta===null?(current>0?'Neu':'Keine Verkäufe'):(delta>=0?'↗ +':'↘ ')+Math.round(delta)+' %';
    $('#jsChartMode').textContent=mode==='month'?'Monat⌄':'Jahr⌄';
    $('#jsChartPeriod').textContent=data.title;
    $('#jsChartAmount').textContent=money(current);
    $('#jsChartCount').textContent=data.count+' '+(data.count===1?'Verkauf':'Verkäufe');
    $('#jsChartChange').textContent=change;$('#jsChartChange').classList.toggle('down',delta!==null&&delta<0);
    $('#jsChartPlot').innerHTML=graph(a,data.labels);
  }

  let statsYearOnly=false;
  const safe=val=>String(val||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderStatistics(){
    const source=typeof items!=='undefined'?items:[];
    const year=String(new Date().getFullYear());
    const sold=source.filter(i=>i.status==='sold'&&(!statsYearOnly||(i.soldDate||'').startsWith(year)));
    const total=sold.reduce((sum,item)=>sum+netAmount(item),0);
    const groups=[['statsChannels','source','Einnahmen nach Kanal','Nettoerlöse nach Verkaufsplattformen'],
                  ['statsChildren','category','Einnahmen nach Kategorie','Welche Kategorien bringen die meisten Einnahmen?']];
    groups.forEach(([id,key,title,description])=>{
      const box=$('#'+id);if(!box)return;
      const panel=box.closest('.panel');
      if(panel){
        panel.classList.add('jsStatsPanel');
        const heading=panel.querySelector('h3');if(heading)heading.textContent=title;
        if(!panel.querySelector('.jsStatsSubtitle')){
          const sub=document.createElement('div');sub.className='jsStatsSubtitle';sub.textContent=description;
          if(heading)heading.insertAdjacentElement('afterend',sub);
        }
        if(!panel.querySelector('.jsStatsFilter')){
          const filter=document.createElement('button');filter.type='button';filter.className='jsStatsFilter';
          filter.setAttribute('aria-label','Zeitraum der Statistik umschalten');
          filter.onclick=()=>{statsYearOnly=!statsYearOnly;renderStatistics();};
          panel.insertBefore(filter,box);
        }
        const filter=panel.querySelector('.jsStatsFilter');
        if(filter)filter.textContent=statsYearOnly?year+' ⌄':'Gesamt ⌄';
      }
      const totals=new Map();
      sold.forEach(i=>{const label=String(i[key]||'Sonstige').trim()||'Sonstige';totals.set(label,(totals.get(label)||0)+netAmount(i));});
      const rows=[...totals.entries()].sort((a,b)=>b[1]-a[1]);
      box.innerHTML=rows.length?rows.map(([label,value])=>{
        const percent=total>0?Math.max(0,Math.min(100,(value/total)*100)):0;
        const rounded=Math.round(percent);
        const symbolText=key==='source'?({Vinted:'V',Kleinanzeigen:'K',Basar:'🧺',eBay:'e'}[label]||'♥'):
          (/Schuh/i.test(label)?'👟':/Fahrzeug|Auto/i.test(label)?'🚗':/Buch/i.test(label)?'📚':/Baby|Body/i.test(label)?'👕':'◇');
        return '<button type="button" class="jsStatsRow" data-kind="'+key+'" data-key="'+safe(label)+'">'+
          '<span class="jsStatsIcon">'+symbolText+'</span>'+
          '<span class="jsStatsName"><b>'+safe(label)+'</b><strong>'+money(value)+'</strong></span>'+
          '<span class="jsStatsBar"><i style="width:'+percent.toFixed(1)+'%"></i></span>'+
          '<span class="jsStatsPercent">'+rounded+' %</span><span class="jsStatsArrow">›</span>'+
          '</button>';
      }).join(''):'<p class="note">Noch keine passenden Verkäufe vorhanden.</p>';
      box.querySelectorAll('.jsStatsRow').forEach(btn=>btn.onclick=()=>{
        const search=$('#globalSearch'),sourceFilter=$('#sourceFilter'),status=$('#statusFilter');
        if(sourceFilter)sourceFilter.value=btn.dataset.kind==='source'?btn.dataset.key:'';
        if(search)search.value=btn.dataset.kind==='category'?btn.dataset.key:'';
        if(status)status.value='sold';
        go('items');
      });
    });
  }

  function activate(){
    if(mounted)return;mounted=true;
    navStyle();metricStyle();ensurePages();ensureChart();importStyle();
    newestData();drawChart();renderStatistics();
    if(typeof refresh==='function'&&!refresh.__v112){
      const previous=refresh;const newer=function(...args){const result=previous.apply(this,args);newestData();drawChart();renderStatistics();return result;};
      newer.__v112=true;refresh=newer;
    }
    if(typeof go==='function'&&!go.__v112){
      const previous=go;const newer=function(id,...args){
        const out=previous.call(this,id,...args);
        if(id==='newest'){
          $$('.bottom .nav').forEach(b=>b.classList.toggle('sel',b.dataset.go==='items'));
          newestData();
        }
        if(id==='home')drawChart();
        if(id==='stats')renderStatistics();
        return out;
      };
      newer.__v112=true;go=newer;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activate,{once:true});
  else activate();
})();