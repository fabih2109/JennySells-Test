(()=>{
  const VERSION='0.8.1-test';
  const ROOT='/JennySells-Test/';

  function addStyles(){
    if(document.getElementById('jennysells-v081-style')) return;
    const s=document.createElement('style');
    s.id='jennysells-v081-style';
    s.textContent=`
      .brand{padding:4px 4px 2px!important;display:flex!important;justify-content:center!important;align-items:center!important;min-height:104px!important}
      .js-v081-logo{display:block;width:min(72vw,330px);height:auto;max-width:100%;margin:4px auto 6px;object-fit:contain}
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
        .brand{min-height:96px!important}
        .js-v081-logo{width:min(74vw,310px)}
        .stat{min-height:84px!important;padding:9px 12px 8px!important}
        .stat small{font-size:11.5px!important}
        .period{min-height:108px!important;padding:10px 12px 9px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function fixPeriodHeading(){
    const periods=document.querySelector('#home .periods');
    if(!periods || !periods.parentNode) return;
    const headings=[...document.querySelectorAll('#home .sec')];
    const heading=headings.find(el=>/Einnahmen im Zeitraum/i.test(el.textContent||''));
    if(heading && heading.nextElementSibling!==periods){
      periods.parentNode.insertBefore(heading,periods);
    }
  }

  async function applyLogo(){
    const brand=document.querySelector('.brand');
    if(!brand) return;
    if(brand.querySelector('.js-v081-logo')) return;
    try{
      const r=await fetch(ROOT+'JennySells_Logo_Final.b64?v=81',{cache:'no-store'});
      if(!r.ok) throw new Error('Logo source '+r.status);
      const b64=(await r.text()).replace(/\s+/g,'');
      const bin=atob(b64);
      if(bin.length<8 || bin.charCodeAt(1)!==80 || bin.charCodeAt(2)!==78 || bin.charCodeAt(3)!==71) throw new Error('Invalid PNG data');
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      const blob=new Blob([bytes],{type:'image/png'});
      const url=URL.createObjectURL(blob);
      const img=document.createElement('img');
      img.className='js-v081-logo';
      img.alt='JennySells';
      img.decoding='async';
      img.onload=()=>setTimeout(()=>URL.revokeObjectURL(url),1000);
      img.onerror=()=>{URL.revokeObjectURL(url);};
      img.src=url;
      brand.replaceChildren(img);
    }catch(err){
      console.error('JennySells logo load failed',err);
      const broken=brand.querySelector('img');
      if(broken) broken.remove();
    }
  }

  function setVersion(){
    const badge=document.getElementById('appVersion');
    if(badge) badge.textContent='v'+VERSION;
  }

  function run(){addStyles();fixPeriodHeading();applyLogo();setVersion();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  setTimeout(run,250);setTimeout(run,900);setTimeout(run,1800);

  if(typeof refresh==='function'){
    const previousRefresh=refresh;
    refresh=function(){previousRefresh();setTimeout(run,0)};
  }
})();