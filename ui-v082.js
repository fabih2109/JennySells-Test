(()=>{
  const VERSION='0.8.2-test';
  const ROOT='/JennySells-Test/';
  function styles(){
    if(document.getElementById('jennysells-v082-style'))return;
    const s=document.createElement('style');s.id='jennysells-v082-style';s.textContent=`
      .brand{padding:6px 2px 8px!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:center!important}
      .js-v082-logo{display:block!important;width:min(94vw,440px)!important;max-width:100%!important;height:auto!important;object-fit:contain!important;margin:0 auto!important}
      .stats{gap:10px!important;margin:10px 0 14px!important}
      .stat{min-height:76px!important;padding:8px 14px 7px!important;border-radius:17px!important}
      .stat b{font-size:22px!important;line-height:1!important;margin:0!important}
      .stat small{font-size:13px!important;line-height:1.12!important;margin-top:5px!important;font-weight:650!important}
      .stat:after{top:8px!important;right:12px!important}
      .periods{gap:10px!important;margin:8px 0 15px!important}
      .period{min-height:98px!important;padding:9px 14px 8px!important;border-radius:17px!important}
      .period .eyebrow{font-size:10px!important;line-height:1!important}
      .period h3{font-size:17px!important;line-height:1.1!important;margin:4px 0 5px!important}
      .period .money{font-size:22px!important;line-height:1!important}
      .period .meta{font-size:10.5px!important;line-height:1.1!important;margin-top:6px!important}
      .period:after{top:8px!important;right:11px!important}
      @media(max-width:380px){.js-v082-logo{width:min(94vw,400px)!important}.stat{min-height:72px!important;padding:7px 12px!important}.period{min-height:94px!important;padding:8px 12px!important}}
    `;document.head.appendChild(s);
  }
  function logo(){
    const brand=document.querySelector('.brand');if(!brand)return;
    let img=brand.querySelector('.js-v082-logo');
    if(!img){brand.replaceChildren();img=document.createElement('img');img.className='js-v082-logo';img.alt='JennySells – Shopping mit Herz';brand.appendChild(img)}
    const wanted=ROOT+'JennySells_Logo_Final.png?v=82';if(!img.src.includes('JennySells_Logo_Final.png'))img.src=wanted;
  }
  function heading(){const p=document.querySelector('#home .periods');if(!p||!p.parentNode)return;const h=[...document.querySelectorAll('#home .sec')].find(x=>/Einnahmen im Zeitraum/i.test(x.textContent||''));if(h&&h.nextElementSibling!==p)p.parentNode.insertBefore(h,p)}
  function version(){const b=document.getElementById('appVersion');if(b)b.textContent='v'+VERSION}
  function run(){styles();logo();heading();version()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setTimeout(run,200);setTimeout(run,700);setTimeout(run,1500);
  if(typeof refresh==='function'){const r=refresh;refresh=function(){r();setTimeout(run,0)}}
})();