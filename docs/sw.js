importScripts('./cache-assets.js');
const PREFIX='tarikh-pages:'+self.registration.scope+':';
const CACHE=PREFIX+'v1000';
// Manual activation: retain current worker until user explicitly installs.
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(self.TARIKH_ASSETS.map(url=>new Request(new URL(url,self.location.href),{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data?.type==='GET_VERSION')e.ports[0]?.postMessage({version:'1.0.0'});if(e.data?.type==='SKIP_WAITING')e.waitUntil(self.skipWaiting());});
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 await self.clients.claim();
 // Keep current and newest older Tarikh cache; never touch newer or unrelated caches.
 try{const older=(await caches.keys()).map(name=>({name,match:name.startsWith(PREFIX)?/^v(\d+)$/.exec(name.slice(PREFIX.length)):null})).filter(x=>x.match&&Number(x.match[1])<1000).sort((a,b)=>Number(b.match[1])-Number(a.match[1]));for(const x of older.slice(1))await caches.delete(x.name);}catch(err){console.warn('Cache cleanup deferred',err);}
})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope)||!['http:','https:'].includes(u.protocol))return;if(u.pathname.endsWith('/version.json')){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>new Response('Offline',{status:503})));return;}e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;if(e.request.mode==='navigate')return c.match('./index.html');return new Response('Not cached',{status:404});}));});
