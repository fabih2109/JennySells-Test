(()=>{
  const VERSION='0.11.1-test';
  const ROOT='/JennySells-Test/';
  let logoPromise=null;

  function addStyles(){
    if(document.getElementById('jennysells-v091-style')) return;
    const s=document.createElement('style');
    s.id='jennysells-v091-style';
    s.textContent=`
      .brand{padding:10px 4px 8px!important;min-height:0!important;height:auto!important;overflow:visible!important;text-align:center!important}
      .brand::before{display:none!important;content:none!important;background:none!important}
      .brand>*{display:block!important}
      .brand-logo{display:block!important;width:100%!important;max-width:480px!important;height:auto!important;object-fit:contain!important;margin:0 auto!important}
      .stats{gap:9px!important;margin:9px 0 13px!important}
      .stat{min-height:74px!important;padding:8px 14px 7px!important;border-radius:17px!important}
      .stat b{font-size:22px!important;line-height:1!important;margin:0!important}
      .stat small{font-size:13px!important;line-height:1.12!important;margin-top:5px!important;font-weight:650!important}
      .stat:after{top:8px!important;right:12px!important}
      .periods{gap:9px!important;margin:8px 0 14px!important}
      .period{min-height:96px!important;padding:9px 14px 8px!important;border-radius:17px!important}
      .period .eyebrow{font-size:10px!important;line-height:1!important}
      .period h3{font-size:17px!important;line-height:1.1!important;margin:4px 0 5px!important}
      .period .money{font-size:22px!important;line-height:1!important}
      .period .meta{font-size:10.5px!important;line-height:1.1!important;margin-top:6px!important}
      .period:after{top:8px!important;right:11px!important}
      @media(max-width:380px){
        .brand-logo{max-width:450px!important}
        .stat{min-height:70px!important;padding:7px 12px!important}
        .period{min-height:92px!important;padding:8px 12px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function fixPeriodHeading(){
    const periods=document.querySelector('#home .periods');
    if(!periods || !periods.parentNode) return;
    const heading=[...document.querySelectorAll('#home .sec')].find(el=>/Einnahmen im Zeitraum/i.test(el.textContent||''));
    if(heading && heading.nextElementSibling!==periods) periods.parentNode.insertBefore(heading,periods);
  }

  function ensureImportLaunch(){
    if(document.getElementById('marketImportLaunch')) return;
    const home=document.getElementById('home');
    if(!home) return;
    const anchor=home.querySelector('.sec');
    if(!anchor) return;
    const b=document.createElement('button');
    b.id='marketImportLaunch';
    b.className='jsImportLaunch';
    b.innerHTML='<b>📷 Verkaufsartikel importieren</b><span>Link übernehmen + mehrere Screenshots auswerten</span>';
    b.onclick=()=>{
      const bg=document.getElementById('jsImportBg');
      if(!bg) return;
      const input=document.getElementById('jsShotInput');
      const shots=document.getElementById('jsShots');
      const status=document.getElementById('jsShotStatus');
      const cover=document.getElementById('jsCoverHint');
      const next=document.getElementById('jsContinueImport');
      const url=document.getElementById('jsImportUrl');
      if(input) input.value='';
      if(shots) shots.innerHTML='';
      if(status){status.className='jsImportStatus warn';status.textContent='Noch keine Screenshots ausgewählt.';}
      if(cover){cover.className='jsImportStatus warn';cover.textContent='Zuerst Screenshots auswählen.';}
      if(next){next.disabled=true;next.textContent='Mit ausgewähltem Titelbild weiter';}
      if(url){url.textContent='Noch kein Link übernommen.';url.dataset.url='';url.dataset.source='';}
      bg.classList.add('show');
    };
    home.insertBefore(b,anchor);
  }

  async function loadFinalLogo(){
    if(logoPromise) return logoPromise;
    logoPromise=Promise.resolve(`${ROOT}JennySells_Logo_Final_17-10-2026_v2.png?v=20261017v2`);
    return logoPromise;
  }

  async function applyLogo(){
    const brand=document.querySelector('.brand');
    if(!brand) return;
    try{
      const src=await loadFinalLogo();
      let img=brand.querySelector('.brand-logo');
      if(!img){
        img=new Image();
        img.className='brand-logo';
        img.alt='JennySells – Shopping mit Herz';
        img.decoding='async';
        img.onload=()=>brand.replaceChildren(img);
      }
      if(img.src!==src) img.src=src;
    }catch(err){
      console.error('JennySells logo could not be loaded',err);
    }
  }

  function versionParts(v=''){
    const m=String(v).match(/(\d+)\.(\d+)\.(\d+)/);
    return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null;
  }

  function compareVersions(a,b){
    for(let i=0;i<3;i++){
      if(a[i]>b[i]) return 1;
      if(a[i]<b[i]) return -1;
    }
    return 0;
  }

  function setVersion(){
    const badge=document.getElementById('appVersion');
    const current=badge?versionParts(badge.textContent):null;
    const target=versionParts(VERSION);
    if(badge && (!current || !target || compareVersions(current,target)<=0)) badge.textContent='v'+VERSION;
    document.documentElement.dataset.jennysellsVersion=VERSION;
  }

  function run(){
    addStyles();
    fixPeriodHeading();
    setVersion();
    applyLogo();
    ensureImportLaunch();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  setTimeout(run,200);
  setTimeout(run,700);
  setTimeout(run,1100);
  setTimeout(run,1800);
  setTimeout(run,3000);
  setTimeout(ensureImportLaunch,1300);

  if(typeof refresh==='function'){
    const previousRefresh=refresh;
    refresh=function(){previousRefresh();setTimeout(run,0)};
  }
})();