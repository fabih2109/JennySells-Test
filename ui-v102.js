(()=>{
  const VERSION=window.JennySellsVersion;
  const setVersion=()=>{
    const el=document.getElementById('appVersion');
    if(el) el.textContent='V'+VERSION;
    document.documentElement.dataset.jennysellsVersion=VERSION;
  };
  if(window.JennySellsV104){setVersion();return;}
  const s=document.createElement('script');
  s.src='/JennySells-Test/ui-v104.js?v='+encodeURIComponent(VERSION);
  s.async=false;
  s.onload=()=>{setVersion();setTimeout(setVersion,900);setTimeout(setVersion,1800);};
  s.onerror=()=>console.error('JennySells V'+VERSION+' konnte nicht geladen werden.');
  document.head.appendChild(s);
  setTimeout(setVersion,1200);
  setTimeout(setVersion,2400);
})();