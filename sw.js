const CACHE='jennysells-test-v18';
const ROOT='/JennySells-Test/';
const ASSETS=[
  ROOT,
  ROOT+'index.html',
  ROOT+'manifest.webmanifest',
  ROOT+'icon-192.png',
  ROOT+'icon-512.png',
  ROOT+'fix-v4.js',
  ROOT+'ui-v060.js',
  ROOT+'ui-v070.js',
  ROOT+'ui-v090.js',
  ROOT+'logo-v090.css',
  ROOT+'assets/logo-final-01.txt',
  ROOT+'assets/logo-final-02.txt',
  ROOT+'assets/logo-final-03.txt',
  ROOT+'assets/logo-final-04.txt',
  ROOT+'assets/logo-final-05.txt'
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