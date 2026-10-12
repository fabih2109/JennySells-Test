(()=>{
  const ROOT='/JennySells-Test/';

  // Compatibility shim for clients that still have the old v0.8.6 service worker.
  // The logo is no longer replaced by JavaScript. Instead we load the final,
  // embedded logo stylesheet and then the current UI layer.
  if(!document.querySelector('link[data-jennysells-logo-v090]')){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href=ROOT+'logo-v090.css?v=90';
    l.dataset.jennysellsLogoV090='1';
    document.head.appendChild(l);
  }

  if(!document.querySelector('script[data-jennysells-ui-v090]')){
    const s=document.createElement('script');
    s.src=ROOT+'ui-v090.js?v=90';
    s.dataset.jennysellsUiV090='1';
    document.body.appendChild(s);
  }
})();