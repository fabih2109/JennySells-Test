(()=>{
  const VERSION='0.8.0-test';
  const ROOT='/JennySells-Test/';

  function addStyles(){
    if(document.getElementById('jennysells-v080-style'))return;
    const s=document.createElement('style');
    s.id='jennysells-v080-style';
    s.textContent=`
      .brand{padding:2px 4px 0!important;display:flex!important;justify-content:center!important;align-items:center!important}
      .js-v080-logo{display:block;width:min(78vw,360px);height:auto;max-width:100%;margin:2px auto 4px;object-fit:contain}
      .stats{gap:10px!important;margin:10px 0 15px!important}
      .stat{min-height:88px!important;padding:10px 14px 9px!important;border-radius:17px!important}
      .stat b{font-size:21px!important;line-height:1.05!important}
      .stat small{font-size:12px!important;line-height:1.2!important;margin-top:3px!important;font-weight:600!important}
      .stat:after{top:9px!important;right:12px!important}
      .periods{gap:10px!important;margin-bottom:16px!important}
      .period{min-height:112px!important;padding:11px 14px 10px!important;border-radius:17px!important}
      .period .eyebrow{font-size:10px!important}
      .period h3{font-size:17px!important;margin:3px 0 6px!important}
      .period .money{font-size:22px!important}
      .period .meta{font-size:10.5px!important;margin-top:5px!important}
      .period:after{top:9px!important;right:11px!important}
      @media(max-width:380px){
        .js-v080-logo{width:min(82vw,330px)}
        .stat{min-height:84px!important;padding:9px 12px 8px!important}
        .stat small{font-size:11.5px!important}
        .period{min-height:108px!important;padding:10px 12px 9px!important}
      }
    `;
    document.head.appendChild(s);
  }

  async function applyLogo(){
    const brand=document.querySelector('.brand');
    if(!brand||brand.querySelector('.js-v080-logo'))return;
    try{
      const r=await fetch(ROOT+'JennySells_Logo_Final.b64',{cache:'no-store'});
      if(!r.ok)return;
      const b64=(await r.text()).trim();
      brand.innerHTML='';
      const img=document.createElement('img');
      img.className='js-v080-logo';
      img.alt='JennySells – Shopping mit Herz';
      img.src='data:image/png;base64,'+b64;
      brand.appendChild(img);
    }catch(e){}
  }

  function setVersion(){
    const badge=document.getElementById('appVersion');
    if(badge)badge.textContent='v'+VERSION;
  }

  function run(){addStyles();applyLogo();setVersion()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,300);setTimeout(run,1000);

  if(typeof refresh==='function'){
    const previousRefresh=refresh;
    refresh=function(){previousRefresh();run()};
  }
})();