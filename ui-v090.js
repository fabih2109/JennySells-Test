(()=>{
  const VERSION='0.9.0-test';

  function addStyles(){
    if(document.getElementById('jennysells-v090-style')) return;
    const s=document.createElement('style');
    s.id='jennysells-v090-style';
    s.textContent=`
      .brand{padding:14px 8px 12px!important;min-height:0!important;height:auto!important;overflow:visible!important;text-align:center!important}
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

  function setVersion(){
    const badge=document.getElementById('appVersion');
    if(badge) badge.textContent='v'+VERSION;
  }

  function run(){addStyles();fixPeriodHeading();setVersion();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  setTimeout(run,200);setTimeout(run,700);
  if(typeof refresh==='function'){
    const previousRefresh=refresh;
    refresh=function(){previousRefresh();setTimeout(run,0)};
  }
})();