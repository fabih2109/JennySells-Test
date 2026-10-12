const CACHE='jennysells-test-v15';
const ROOT='/JennySells-Test/';
const ASSETS=[ROOT,ROOT+'index.html',ROOT+'manifest.webmanifest',ROOT+'icon-192.png',ROOT+'icon-512.png',ROOT+'fix-v4.js',ROOT+'ui-v060.js',ROOT+'ui-v070.js',ROOT+'ui-v086.js',ROOT+'JennySells_Logo_Final.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
async function pageWithFix(request){
  let response;
  try{response=await fetch(request,{cache:'no-store'});}catch(e){response=await caches.match(ROOT+'index.html')||await caches.match(ROOT);}
  if(!response)return new Response('Offline',{status:503});
  let html=await response.text();
  if(!html.includes('fix-v4.js')) html=html.replace('</body>','<script src="'+ROOT+'fix-v4.js"></script></body>');
  if(!html.includes('ui-v060.js')) html=html.replace('</body>','<script src="'+ROOT+'ui-v060.js"></script></body>');
  if(!html.includes('ui-v070.js')) html=html.replace('</body>','<script src="'+ROOT+'ui-v070.js"></script></body>');
  if(!html.includes('ui-v086.js')) html=html.replace('</body>','<script src="'+ROOT+'ui-v086.js?v=86"></script></body>');
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname.startsWith(ROOT)){
    event.respondWith(pageWithFix(event.request));
    return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
});