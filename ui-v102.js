(()=>{
  if(window.JennySellsV103)return;
  const s=document.createElement('script');
  s.src='/JennySells-Test/ui-v103.js?v=103';
  s.async=false;
  s.onerror=()=>console.error('JennySells v0.10.3 konnte nicht geladen werden.');
  document.head.appendChild(s);
})();