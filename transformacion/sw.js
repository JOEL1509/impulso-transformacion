const CACHE='impulso-offline-v4-tnc';
const ASSETS=['./','index.html','ui.css','ui.js','seeds.js','store.js','io.js','core.js','wellness.js','workout-plan.js','food-catalog.js','restaurant-catalog.js','nutrition.js','nutrition-ui.js','session-image.js','tnc-logo.png','icon.svg','manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
  const allowed=ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname);
  if(!allowed)return;
  e.respondWith(fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return response;}).catch(()=>caches.match(e.request)));
});

