(()=>{
  const VERSION='0.11.3-test';
  const setVersion=()=>{
    const el=document.getElementById('appVersion');
    if(el) el.textContent='v'+VERSION;
    document.documentElement.dataset.jennysellsVersion=VERSION;
  };
  if(window.JennySellsV104){setVersion();return;}
  const s=document.createElement('script');
  s.src='/JennySells-Test/ui-v104.js?v=120';
  s.async=false;
  s.onload=()=>{setVersion();setTimeout(setVersion,900);setTimeout(setVersion,1800);};
  s.onerror=()=>console.error('JennySells v0.11.3 konnte nicht geladen werden.');
  document.head.appendChild(s);
  setTimeout(setVersion,1200);
  setTimeout(setVersion,2400);
})();