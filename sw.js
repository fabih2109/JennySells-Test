const CACHE='jennysells-test-v35';
const ROOT='/JennySells-Test/';
const ASSETS=[
  ROOT,
  ROOT+'index.html',
  ROOT+'manifest.webmanifest',
  ROOT+'icon-192.png',
  ROOT+'icon-512.png',
  ROOT+'icon-maskable-512.png',
  ROOT+'apple-touch-icon.png',
  ROOT+'fix-v4.js',
  ROOT+'ui-v060.js',
  ROOT+'ui-v070.js',
  ROOT+'ui-v090.js',
  ROOT+'ui-v100.js',
  ROOT+'ui-v102.js',
  ROOT+'ui-v104.js',
  ROOT+'vinted-parser-v109.js',
  ROOT+'install-test-v108.js',
  ROOT+'logo-v090.css',
  ROOT+'ui-v112.css',
  ROOT+'ui-v113.css',
  ROOT+'ui-v112.js',
  ROOT+'header-art-v112.svg',
  ROOT+'JennySells_Logo_Final_17-10-2026_v2.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
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