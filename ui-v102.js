(()=>{
  if(window.JennySellsV104)return;
  const s=document.createElement('script');
  s.src='/JennySells-Test/ui-v104.js?v=104';
  s.async=false;
  s.onerror=()=>console.error('JennySells v0.10.4 konnte nicht geladen werden.');
  document.head.appendChild(s);
})();