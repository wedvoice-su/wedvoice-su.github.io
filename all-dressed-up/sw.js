// 드레스 투어 기록 카드 · 인터넷이 끊겨도 사이트가 열리게 하는 파일 (서비스 워커)
// 드레스숍은 지하 · 와이파이가 약한 곳이 많아서, 한 번 열면 인터넷 없이도 열리게 해요.
//   - 우리 파일(화면 · 그림 · 녹음 · 문구): 인터넷이 되면 늘 새 것을 받고, 안 되면(또는 4초 넘게 답이 없으면) 저장본을 써요.
//   - 바깥 파일(글꼴): 한 번 받으면 저장본을 써요.
// 적은 기록과 녹음은 여기서 다루지 않아요. 그건 app.js · rec.js가 이 기기에 따로 저장해요.
// 범위: 이 폴더(/all-dressed-up/)에서 연 화면만. 다른 사이트에는 영향이 없어요.
const CACHE = "all-dressed-up-v1";
const CORE = ["./", "app.css", "app.js", "draw.js", "rec.js", "text.js", "../shared/brand.css", "../shared/common.js", "../shared/img/logo-gold.png", "../shared/img/icon-180.png"];
const EXTRA = ["https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"];
const OUTSIDE = /(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$/;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith("all-dressed-up-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin === self.location.origin) e.respondWith(netFirst(req, url));
  else if(OUTSIDE.test(url.hostname)) e.respondWith(cacheFirst(req));
});
async function netFirst(req, url){
  const c = await caches.open(CACHE), nav = req.mode === "navigate";
  const key = nav ? url.origin + url.pathname : req;
  const saved = await c.match(key, { ignoreSearch: nav });
  const net = fetch(req).then(res => { if(res && res.ok) c.put(key, res.clone()).catch(() => {}); return res; });
  if(!saved) return net;
  const late = new Promise(r => setTimeout(() => r(saved), 4000));
  const res = await Promise.race([net.catch(() => saved), late]);
  return res && res.ok ? res : saved;
}
async function cacheFirst(req){
  const c = await caches.open(CACHE), saved = await c.match(req);
  if(saved) return saved;
  const res = await fetch(req);
  if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {});
  return res;
}
