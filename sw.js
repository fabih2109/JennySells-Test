const CACHE='jennysells-test-v51';
const ROOT='/JennySells-Test/';
const ASSETS=[
  ROOT,
  ROOT+'index.html',
  ROOT+'manifest.webmanifest?v=130',
  ROOT+'icon-192.png?v=107',
  ROOT+'icon-512.png?v=107',
  ROOT+'icon-maskable-512.png?v=107',
  ROOT+'apple-touch-icon.png?v=107',
  ROOT+'fix-v4.js?v=130',
  ROOT+'ui-v060.js?v=130',
  ROOT+'ui-v070.js?v=130',
  ROOT+'ui-v090.js?v=128',
  ROOT+'ui-v100.js?v=128',
  ROOT+'ui-v102.js?v=128',
  ROOT+'ui-v104.js?v=0.13.1',
  ROOT+'vinted-parser-v109.js?v=111',
  ROOT+'install-test-v108.js?v=108',
  ROOT+'logo-v090.css?v=90',
  ROOT+'ui-v112.css?v=112',
  ROOT+'ui-v113.css?v=116',
  ROOT+'ui-v112.js?v=130',
  ROOT+'data-v117.js?v=131',
  ROOT+'data-v117.css?v=130',
  ROOT+'ui-v119.js?v=130',
  ROOT+'ui-v119.css?v=130',
  ROOT+'quick-sale-v121.js?v=121',
  ROOT+'quick-sale-v121.css?v=121',
  ROOT+'article-covers-v124.js?v=130',
  ROOT+'article-covers-v124.css?v=124',
  ROOT+'metric-grid-v125.css?v=130',
  ROOT+'article-grid-v127.css?v=127',
  ROOT+'header-art-v112.svg',
  ROOT+'JennySells_Logo_Final_17-10-2026_v2.png?v=20261017v2'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(asset=>new Request(asset,{cache:'reload'})))));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response && response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      }
      return response;
    }catch(e){
      return (await caches.match(event.request)) || (event.request.mode==='navigate' ? await caches.match(ROOT+'index.html') : Response.error());
    }
  })());
});
