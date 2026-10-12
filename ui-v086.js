(()=>{
  const VERSION='0.8.6-test';
  const ROOT='/JennySells-Test/';

  function addStyles(){
    if(document.getElementById('jennysells-v086-style')) return;
    const s=document.createElement('style');
    s.id='jennysells-v086-style';
    s.textContent=`
      .brand{
        padding:10px 10px 14px!important;
        min-height:0!important;
        height:auto!important;
        display:block!important;
        text-align:center!important;
        overflow:visible!important;
      }
      .js-v086-logo{
        display:block!important;
        width:min(84vw,560px)!important;
        max-width:100%!important;
        height:auto!important;
        max-height:none!important;
        object-fit:contain!important;
        object-position:center center!important;
        margin:0 auto!important;
        overflow:visible!important;
      }
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
        .js-v086-logo{width:min(88vw,520px)!important}
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

  function applyLogo(){
    const brand=document.querySelector('.brand');
    if(!brand) return;
    let img=brand.querySelector('.js-v086-logo');
    if(!img){
      brand.replaceChildren();
      img=document.createElement('img');
      img.className='js-v086-logo';
      img.alt='JennySells – Shopping mit Herz';
      img.decoding='async';
      brand.appendChild(img);
    }
    const wanted=ROOT+'JennySells_Logo_Final.png?v=86';
    if(img.getAttribute('src')!==wanted) img.setAttribute('src',wanted);
  }

  function setVersion(){
    const badge=document.getElementById('appVersion');
    if(badge) badge.textContent='v'+VERSION;
  }

  function run(){addStyles();fixPeriodHeading();applyLogo();setVersion();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  setTimeout(run,200);setTimeout(run,700);setTimeout(run,1500);
  if(typeof refresh==='function'){
    const previousRefresh=refresh;
    refresh=function(){previousRefresh();setTimeout(run,0)};
  }
})();