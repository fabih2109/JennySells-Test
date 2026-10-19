const CACHE='jennysells-test-v44';
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
  ROOT+'data-v117.js',
  ROOT+'data-v117.css',
  ROOT+'ui-v119.js',
  ROOT+'ui-v119.css',
  ROOT+'quick-sale-v121.js',
  ROOT+'quick-sale-v121.css',
  ROOT+'article-covers-v124.js',
  ROOT+'article-covers-v124.css',
  ROOT+'demo-images/article-01.svg',
  ROOT+'demo-images/article-02.svg',
  ROOT+'demo-images/article-03.svg',
  ROOT+'demo-images/article-04.svg',
  ROOT+'demo-images/article-05.svg',
  ROOT+'demo-images/article-06.svg',
  ROOT+'demo-images/article-07.svg',
  ROOT+'demo-images/article-08.svg',
  ROOT+'demo-images/article-09.svg',
  ROOT+'demo-images/article-10.svg',
  ROOT+'demo-images/article-11.svg',
  ROOT+'demo-images/article-12.svg',
  ROOT+'demo-images/article-13.svg',
  ROOT+'demo-images/article-14.svg',
  ROOT+'demo-images/article-15.svg',
  ROOT+'demo-images/article-16.svg',
  ROOT+'demo-images/article-17.svg',
  ROOT+'demo-images/article-18.svg',
  ROOT+'demo-images/article-19.svg',
  ROOT+'demo-images/article-20.svg',
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