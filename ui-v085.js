(()=>{
  const VERSION='0.8.5-test';
  const ROOT='/JennySells-Test/';

  function addStyles(){
    if(document.getElementById('jennysells-v085-style')) return;
    const s=document.createElement('style');
    s.id='jennysells-v085-style';
    s.textContent=`
      .brand{padding:10px 12px 18px!important;min-height:175px!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;overflow:visible!important}
      .js-v085-logo{display:block!important;width:min(82vw,560px)!important;max-width:100%!important;max-height:none!important;height:auto!important;object-fit:contain!important;margin:0 auto!important}
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
        .brand{min-height:165px!important;padding:9px 10px 16px!important}
        .js-v085-logo{width:min(84vw,520px)!important}
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

  async function applyLogo(){
    const brand=document.querySelector('.brand');
    if(!brand) return;
    let img=brand.querySelector('.js-v085-logo');
    if(!img){
      brand.replaceChildren();
      img=document.createElement('img');
      img.className='js-v085-logo';
      img.alt='JennySells – Shopping mit Herz';
      img.decoding='async';
      brand.appendChild(img);
    }
    if(img.dataset.loaded==='1' || img.dataset.loading==='1') return;
    img.dataset.loading='1';
    try{
      const files=['logo-00.txt','logo-00-tail.txt','logo-01.txt','logo-02.txt','logo-02-tail.txt','logo-03.txt'];
      const parts=await Promise.all(files.map(async file=>{
        const r=await fetch(`${ROOT}assets/${file}?v=85`,{cache:'no-store'});
        if(!r.ok) throw new Error(`${file}: ${r.status}`);
        return r.text();
      }));
      const b64=parts.join('').replace(/\s+/g,'');
      const bin=atob(b64);
      if(bin.length<10000 || bin.charCodeAt(0)!==137 || bin.charCodeAt(1)!==80 || bin.charCodeAt(2)!==78 || bin.charCodeAt(3)!==71) throw new Error('Invalid reconstructed PNG');
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      if(window.__jennysellsLogoUrl) URL.revokeObjectURL(window.__jennysellsLogoUrl);
      window.__jennysellsLogoUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
      img.onload=()=>{img.dataset.loaded='1';img.dataset.loading='0';};
      img.onerror=()=>{img.dataset.loading='0';console.error('JennySells logo image decode failed');};
      img.src=window.__jennysellsLogoUrl;
    }catch(err){
      img.dataset.loading='0';
      console.error('JennySells logo load failed',err);
    }
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