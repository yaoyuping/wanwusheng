const CACHE='wanwusheng-v5.11.1';
const ASSETS=['./','./index.html','./styles.css','./upgrade.css','./v3.css','./v4.css?v=4.5','./backup.css?v=4.5.1','./backup.js?v=5.10.2','./app.js?v=5.10.2','./upgrade.js?v=5.11.0','./v3.js?v=5.10.0','./v4.js?v=4.5','./ai-v452.css?v=4.5.2','./ai-v452.js?v=4.5.2','./v453.css?v=4.5.3','./v453.js?v=4.5.3','./v46.css?v=4.6.0','./v46.js?v=5.10.0','./v47.css?v=4.7.0','./v47.js?v=4.7.0','./v48.css?v=4.8.0','./v48.js?v=5.10.0','./v49.css?v=4.9.0','./v49.js?v=4.9.0','./v50.css?v=5.0.0','./v50.js?v=5.11.0','./v51.css?v=5.1.0','./v51.js?v=5.1.0','./v52.css?v=5.2.0','./v52.js?v=5.2.0','./v53.css?v=5.3.0','./v53.js?v=5.7.0','./v54.css?v=5.6.0','./v54.js?v=5.7.0','./v55.css?v=5.5.0','./v55.js?v=5.7.0','./assets/leaflet/leaflet.css?v=1.9.4','./assets/leaflet/leaflet.js?v=1.9.4','./assets/leaflet/images/layers.png','./assets/leaflet/images/layers-2x.png','./assets/leaflet/images/marker-icon.png','./v56.css?v=5.8.4','./v56.js?v=5.10.0','./v57.css?v=5.7.3','./v57.js?v=5.7.3','./v59.css?v=5.11.0','./v59.js?v=5.11.0','./v59-push.js?v=5.11.1','./pages.css?v=5.10.0','./pages.js?v=5.10.1','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if (e.request.mode==='navigate') {
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return r}).catch(()=>caches.match('./index.html')));
 } else {
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r})));
 }
});

self.addEventListener('push', event => {
 let message = {};
 try { message = event.data?.json() || {}; } catch { /* Show the generic reminder below. */ }
 event.waitUntil(self.registration.showNotification(String(message.title || '万物生 · 养护提醒').slice(0, 100), {
  body: String(message.body || '有新的养护提醒，请打开养护日历查看。').slice(0, 300),
  tag: String(message.tag || 'yiyu-care').slice(0, 100),
  icon: new URL('./icon-192.png', self.registration.scope).href,
  badge: new URL('./icon-192.png', self.registration.scope).href
 }));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil((async () => {
  const base = new URL('./', self.registration.scope), target = new URL('./#care', base);
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const client = windows.find(window => { const url = new URL(window.url); return url.origin === base.origin && url.pathname.startsWith(base.pathname); });
  if (client) { await client.focus(); client.postMessage({ type: 'YIYU_OPEN_CARE' }); }
  else await self.clients.openWindow(target.href);
 })());
});
