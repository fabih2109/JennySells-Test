(()=>{
  const VERSION='0.10.9-test';

  function addFont(){
    if(document.querySelector('link[data-jennysells-logo-font]')) return;
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';pre1.dataset.jennysellsLogoFont='1';document.head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';pre2.dataset.jennysellsLogoFont='1';document.head.appendChild(pre2);
    const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';font.dataset.jennysellsLogoFont='1';document.head.appendChild(font);
  }

  function addStyles(){
    if(document.getElementById('jennysells-v060-style')) return;
    const style=document.createElement('style');style.id='jennysells-v060-style';style.textContent=`
      .brandmark{font-family:"Great Vibes","Brush Script MT","Segoe Script","Snell Roundhand",cursive!important;font-size:58px!important;font-style:normal!important;font-weight:400!important;line-height:.9!important;letter-spacing:-1px!important}
      .brandmark i{font-family:Georgia,serif!important;font-style:normal!important;font-size:.72em!important;vertical-align:14%}
      .bottom{grid-template-columns:1fr 1fr 1.15fr 1fr 1fr 1fr!important}
      .periods{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .period{background:#fff;border-radius:17px;padding:14px;box-shadow:0 6px 17px #54385c12;border-left:4px solid #b887cf}
      .period .eyebrow{font-size:9px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#8b7891}
      .period h3{font:800 17px Georgia,serif;margin:4px 0 10px;color:#54227d}
      .period .money{font:800 22px Georgia,serif;color:#287a50;display:block}
      .period .meta{display:flex;justify-content:space-between;gap:6px;margin-top:7px;color:#817486;font-size:9px}
      .settingsCard{background:#fff;border-radius:17px;padding:15px;box-shadow:0 6px 17px #54385c12;margin:8px 0}
      .settingsRow{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid #f0e8f2}
      .settingsRow:last-child{border-bottom:0}.settingsRow span{color:#817486;font-size:11px}.settingsRow strong{text-align:right;font-size:12px}
      .versionBadge{display:inline-flex;background:#f0e3f5;color:#704289;border-radius:999px;padding:6px 10px;font-weight:900;font-size:11px}
      @media(max-width:380px){.brandmark{font-size:50px!important}}
    `;document.head.appendChild(style);
  }

  function ensurePeriodCards(){
    const home=document.getElementById('home');if(!home)return;
    const hero=home.querySelector('.hero');if(hero)hero.remove();
    if(document.getElementById('monthRevenue'))return;
    const stats=home.querySelector('.stats');if(!stats)return;
    const wrap=document.createElement('div');
    wrap.innerHTML=`<div class="sec"><h2>Einnahmen im Zeitraum</h2><span>Netto</span></div>
      <div class="periods">
        <div class="period"><div class="eyebrow">Monat</div><h3 id="monthLabel">–</h3><span class="money" id="monthRevenue">0 €</span><div class="meta"><span id="monthCount">0 Verkäufe</span><span id="monthAvg">Ø 0 €</span></div></div>
        <div class="period"><div class="eyebrow">Jahr</div><h3 id="yearLabel">–</h3><span class="money" id="yearRevenue">0 €</span><div class="meta"><span id="yearCount">0 Verkäufe</span><span id="yearAvg">Ø 0 €</span></div></div>
      </div>`;
    while(wrap.firstChild) stats.parentNode.insertBefore(wrap.firstChild,stats.nextSibling);
  }

  function ensureSettings(){
    if(document.getElementById('settings'))return;
    const app=document.querySelector('.app');if(!app)return;
    const section=document.createElement('section');section.className='view';section.id='settings';section.innerHTML=`
      <div class="hero"><h1>Einstellungen</h1><p>JennySells Testversion</p></div>
      <div class="settingsCard">
        <div class="settingsRow"><span>App-Version</span><strong><span class="versionBadge" id="appVersion">v${VERSION}</span></strong></div>
        <div class="settingsRow"><span>Datenhaltung</span><strong>Lokal auf diesem Gerät</strong></div>
        <div class="settingsRow"><span>Demo-Datensatz</span><strong>20 Beispielartikel</strong></div>
        <div class="settingsRow"><span>Projekt</span><strong>JennySells-Test</strong></div>
      </div>
      <button class="action secondary" id="resetDemoSettings">↻ Demo-Daten zurücksetzen</button>
      <div class="note">Testversion: Noch keine Cloud-Synchronisation. Die Daten liegen aktuell im lokalen Browser-/App-Speicher.</div>`;
    app.appendChild(section);
    const reset=document.getElementById('resetDemoSettings');if(reset&&typeof resetDemo==='function')reset.onclick=resetDemo;

    const nav=document.querySelector('.bottom');
    if(nav&&!nav.querySelector('[data-go="settings"]')){
      const b=document.createElement('button');b.className='nav';b.dataset.go='settings';b.innerHTML='<span>⚙</span>Einstellungen';b.onclick=()=>go('settings');nav.appendChild(b);
    }
  }

  function renderPeriods(){
    if(typeof items==='undefined'||typeof net!=='function'||typeof eur!=='function')return;
    const sold=items.filter(i=>i.status==='sold');
    const now=new Date();const year=String(now.getFullYear());const monthKey=year+'-'+String(now.getMonth()+1).padStart(2,'0');
    const monthSold=sold.filter(i=>(i.soldDate||'').startsWith(monthKey));
    const yearSold=sold.filter(i=>(i.soldDate||'').startsWith(year));
    const monthRev=monthSold.reduce((a,i)=>a+net(i),0),yearRev=yearSold.reduce((a,i)=>a+net(i),0);
    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
    set('monthLabel',now.toLocaleDateString('de-DE',{month:'long',year:'numeric'}).replace(/^./,m=>m.toUpperCase()));
    set('monthRevenue',eur(monthRev));set('monthCount',monthSold.length+' '+(monthSold.length===1?'Verkauf':'Verkäufe'));set('monthAvg','Ø '+eur(monthSold.length?monthRev/monthSold.length:0));
    set('yearLabel',year);set('yearRevenue',eur(yearRev));set('yearCount',yearSold.length+' '+(yearSold.length===1?'Verkauf':'Verkäufe'));set('yearAvg','Ø '+eur(yearSold.length?yearRev/yearSold.length:0));
    set('appVersion','v'+VERSION);
  }

  addFont();addStyles();ensurePeriodCards();ensureSettings();renderPeriods();
  if(typeof refresh==='function'){
    const originalRefresh=refresh;
    refresh=function(){originalRefresh();ensurePeriodCards();ensureSettings();renderPeriods()};
  }
})();