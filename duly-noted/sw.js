// 축의금 장부 · 인터넷이 끊겨도 사이트가 열리게 하는 파일 (서비스 워커)
// 하는 일: 사이트 파일을 이 기기에 한 벌 저장해 두고, 인터넷이 안 될 때 그 저장본으로 화면을 열어요.
//   - 우리 파일(화면 · 계산 · 문구 · 엑셀): 인터넷이 되면 늘 새 것을 받고, 안 되면(또는 4초 넘게 답이 없으면) 저장본을 써요.
//     그래서 사이트를 고쳐 올리면 다음에 열 때 바로 새 것이 보여요.
//   - 바깥 파일(글꼴 · 이미지 만드는 도구): 한 번 받으면 저장본을 써요.
// 장부 내용(이름 · 금액)은 여기서 다루지 않아요. 그건 app.js가 이 기기에 따로 저장해요.
// 범위: 이 폴더(/duly-noted/)에서 연 화면만. 다른 사이트에는 영향이 없어요.
const CACHE = "duly-noted-v1";
const CORE = ["./", "app.css", "app.js", "core.js", "text.js", "xlsx.js", "../shared/brand.css", "../shared/common.js", "../shared/img/logo-gold.png", "../shared/img/icon-180.png"];
const EXTRA = ["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"];
const OUTSIDE = /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$/;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);                                              // 이게 다 받아져야 설치가 끝나요
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));       // 바깥 파일은 못 받아도 넘어가요
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith("duly-noted-") && k !== CACHE) await caches.delete(k);
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

// 우리 파일: 새 것 먼저, 안 되면 저장본
async function netFirst(req, url){
  const c = await caches.open(CACHE), nav = req.mode === "navigate";
  const key = nav ? url.origin + url.pathname : req;                  // 화면 주소는 ?preview 같은 꼬리를 떼고 저장해요
  const saved = await c.match(key, { ignoreSearch: nav });
  const net = fetch(req).then(res => { if(res && res.ok) c.put(key, res.clone()).catch(() => {}); return res; });
  if(!saved) return net;                                               // 저장본이 없으면 인터넷으로만
  const late = new Promise(r => setTimeout(() => r(saved), 4000));
  const res = await Promise.race([net.catch(() => saved), late]);
  return res && res.ok ? res : saved;
}
// 바깥 파일: 저장본 먼저, 없으면 받아서 저장
async function cacheFirst(req){
  const c = await caches.open(CACHE), saved = await c.match(req);
  if(saved) return saved;
  const res = await fetch(req);
  if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {});
  return res;
}
