// 웨딩사진 수정 요청서 ㊲ (11/13 사회자님: 이름 "보정 요청서" → "수정 요청서"): 사진 불러오기 → 고칠 곳을 누르면 번호 → 자주 하는 요청 고르기 → 요청서(이미지 · PDF) + 카톡에 붙일 글
// 기획 docs/보정-요청서/기획.md · 문구와 요청 목록 text.js · 샘플 그림 samples.js · 공통 shared/common.js
// 사진은 이 기기(브라우저) 밖으로 보내지 않아요. 줄인 사진과 적은 요청만 이 브라우저 저장소(IndexedDB)에 남겨요.
// 사회자 한마디 상자는 넣지 않아요 — 사진 보정은 사회자 영역이 아니라서 (사회자님 기준, 2026-11-03)

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/picture-perfect/?preview)
const OPEN = false;
// =========================================================

const DBN = "picture-perfect.v1";
const WORK = 2000;          // 작업용 사진 긴 변(px) — 원본 대신 이 크기로 줄여서 써요
const THUMB = 420;          // 목록용 작은 사진 긴 변(px)
const MAXN = 60;            // 한 번에 다루는 사진 수
const SHEET_W = 1240;       // 요청서 그림 너비(px)
const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
const PINK = "#C2185B";

// ===== 상태 =====
let S = blank();
let SAVED = null;           // 저장돼 있던 요청서 (첫 화면 "이어서 쓰기")
let CUR = "cover";          // 지금 보이는 화면
let STORE_OK = true;
const IMG = new Map();      // 사진 키 → { blob, url, turl }
let ED = null;              // 사진 한 장 화면: { k, pin, cat }
let VIEW = { z: 1, tx: 0, ty: 0 }, L = null;
let OUT = { gen: 0, pages: [], pdf: null, busy: false, done: 0, total: 0 };
let UNDO = [];
let EXURL = "";
let TRAP = false;           // 폰 뒤로 가기를 "이전 단계"로 쓰려고 넣어 둔 방문 기록이 있는지
let COM_NEXT = false;       // 요청서를 만들다가 공통 요청으로 들어왔는지 (완료하면 바로 요청서로)
let GHOST = 0;              // 이 시각까지는 사진 밖 버튼 클릭을 무시 (폰의 따라오는 클릭 막기)

function blank(){
  return { v: 1, at: 0, sample: false, seq: 1, photos: [], common: { items: [], dont: [], note: "" },
    info: { g: "", b: "", round: 0 }, fmt: "num", who: "b", deg: 1, cat: "face", pos: { screen: "list", k: "" }, tips: {} };
}

// ===== 작은 도구 =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function f(s, o = {}){ return String(s).replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m); }
function nl(s){ return esc(s).replace(/\n/g, "<br>"); }
function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
function isTouch(){ return matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches; }
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const coll = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
const ITEM = new Map(), ORDER = new Map();
CATS.forEach(c => c.items.forEach(it => { ORDER.set(it.id, ITEM.size); ITEM.set(it.id, Object.assign({ cat: c.id }, it)); }));

// ===== 요청 문장 =====
function whoWord(w){ return w === "b" ? T.whoB + " " : w === "g" ? T.whoG + " " : w === "p" ? T.whoP + " " : ""; }
function degWord(d){ return (DEG.find(x => x.id === d) || DEG[0]).w; }
function sentence(it, pin){ return it.s.replace("{who}", whoWord(pin.who)).replace("{deg}", degWord(pin.deg)); }
function pinItems(pin){ return pin.items.filter(id => ITEM.has(id)).sort((a, b) => ORDER.get(a) - ORDER.get(b)).map(id => ITEM.get(id)); }
function pinSents(pin){ const a = pinItems(pin).map(it => sentence(it, pin)), n = (pin.note || "").trim(); if(n) a.push(n); return a; }
function pinLine(pin){ return pinSents(pin).join(" "); }
function filled(pin){ return pinSents(pin).length > 0; }
function P(k){ return S.photos.find(p => p.k === k); }
function posPins(p){ return p.pins.filter(q => q.x != null); }
function pinNo(p, pin){ return pin.x == null ? 0 : posPins(p).indexOf(pin) + 1; }
function reqN(p){ return p.pins.filter(filled).length; }
function comLists(){
  const c = S.common, note = (c.note || "").split("\n").map(s => s.trim()).filter(Boolean);
  return { doList: COMMON.filter(x => c.items.includes(x.id)).map(x => x.s).concat(note), dont: DONT.filter(x => c.dont.includes(x.id)).map(x => x.s) };
}
function totals(st = S){
  let a = 0, k = 0, t = 0, r = 0;
  for(const p of st.photos){ const n = p.pins.filter(filled).length; r += n; if(n) a++; else if(p.ok) k++; else t++; }
  const cl = st === S ? comLists() : { doList: [], dont: [] };
  return { a, k, t, r, c: cl.doList.length + cl.dont.length };
}
function purge(){ let ch = false; for(const p of S.photos){ const n = p.pins.length; p.pins = p.pins.filter(filled); if(p.pins.length !== n) ch = true; } return ch; }
function outPhotos(){ return S.photos.filter(p => reqN(p) || p.ok); }

// ===== 브라우저 저장소 (IndexedDB) =====
const DB = {
  p: null,
  open(){
    if(!this.p) this.p = new Promise((res, rej) => {
      let r; try { r = indexedDB.open(DBN, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => { const d = r.result; if(!d.objectStoreNames.contains("kv")) d.createObjectStore("kv"); if(!d.objectStoreNames.contains("img")) d.createObjectStore("img"); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blocked"));
    });
    return this.p;
  },
  async run(store, mode, fn){
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store); let v;
      const q = fn(s); if(q) q.onsuccess = () => { v = q.result; };
      t.oncomplete = () => res(v); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  get(store, k){ return this.run(store, "readonly", s => s.get(k)); },
  put(store, k, v){ return this.run(store, "readwrite", s => s.put(v, k)); },
  del(store, k){ return this.run(store, "readwrite", s => s.delete(k)); },
  clear(store){ return this.run(store, "readwrite", s => s.clear()); },
  async all(store){
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, "readonly"), out = new Map(), c = t.objectStore(store).openCursor();
      c.onsuccess = () => { const cur = c.result; if(cur){ out.set(cur.key, cur.value); cur.continue(); } };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    });
  }
};
let saveT = 0;
function save(){ clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
async function saveNow(){
  if(!STORE_OK || !S.photos.length) return;
  S.at = Date.now();
  try { await DB.put("kv", "state", S); } catch (e) { storeFail(); }
}
function storeFail(){ if(STORE_OK){ STORE_OK = false; toast(T.noStore, 6000); } }
async function wipe(){
  for(const v of IMG.values()){ URL.revokeObjectURL(v.url); URL.revokeObjectURL(v.turl); }
  IMG.clear(); S = blank(); SAVED = null; UNDO = []; ED = null; OUT.gen++;
  try { await DB.clear("kv"); await DB.clear("img"); } catch (e) {}
}

// ===== 되돌리기 =====
function snap(){ return JSON.stringify({ photos: S.photos, common: S.common }); }
function keep(){ UNDO.push(snap()); if(UNDO.length > 30) UNDO.shift(); }
function undo(){
  const s = UNDO.pop(); if(!s) return;
  const o = JSON.parse(s); S.photos = o.photos; S.common = o.common;
  if(ED){ ED.pin = null; if(!P(ED.k)){ ED = null; CUR = "list"; } }
  save(); render(); toast("");
}

// ===== 사진 불러오기 =====
function loadImg(src){ return new Promise((res, rej) => { const u = URL.createObjectURL(src), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 3000); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u; }); }
async function decode(src){ try { return await createImageBitmap(src); } catch (e) { return loadImg(src); } }
function jpeg(c, q = 0.9){ return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", q)); }
function scaled(bm, max){
  const bw = bm.naturalWidth || bm.width, bh = bm.naturalHeight || bm.height, s = Math.min(1, max / Math.max(bw, bh));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bw * s)); c.height = Math.max(1, Math.round(bh * s));
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = "high"; x.drawImage(bm, 0, 0, c.width, c.height);
  return c;
}
async function addOne(src, name){
  const bm = await decode(src);
  const c = scaled(bm, WORK), blob = await jpeg(c, 0.9), tblob = await jpeg(scaled(c, THUMB), 0.82);
  if(bm.close) bm.close();
  const k = "p" + (S.seq++);
  IMG.set(k, { blob, url: URL.createObjectURL(blob), turl: URL.createObjectURL(tblob) });
  S.photos.push({ k, n: name, w: c.width, h: c.height, ok: false, pins: [] });
  if(STORE_OK) DB.put("img", k, { b: blob, t: tblob }).catch(storeFail);
}
async function addFiles(list, opt = {}){
  let files = [...list].filter(x => /^image\//.test(x.type || "") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(x.name || ""));
  const dropped = list.length - files.length;
  files.sort((a, b) => coll.compare(a.name, b.name));
  const room = MAXN - S.photos.length; let many = false;
  if(files.length > room){ files = files.slice(0, Math.max(0, room)); many = true; }
  if(!files.length){ toast(many ? f(T.loadMany, { n: MAXN }) : T.loadNone, 4000); return; }
  const first = !S.photos.length; let bad = dropped, done = 0;
  busy(f(T.loading, { d: 0, n: files.length }), 0);
  for(const file of files){
    try { await addOne(file, file.name || ("photo-" + S.seq)); } catch (e) { bad++; }
    done++; busy(f(T.loading, { d: done, n: files.length }), done / files.length);
  }
  busy(null);
  if(!S.photos.length){ toast(T.loadNone, 4000); return; }
  if(opt.sample) S.sample = true;
  await saveNow();
  // 처음 불러왔으면 목록을 거치지 않고 바로 첫 사진으로 (할 일이 바로 보이게). 더 넣은 것이면 목록으로.
  if(first) openPhoto(S.photos[0].k); else go("list");
  if(many) toast(f(T.loadMany, { n: MAXN }), 5000); else if(bad) toast(f(T.loadBad, { n: bad }), 5000); else if(first && S.photos.length > 1) toast(f(T.loaded, { n: S.photos.length }), 3000);
}
function busy(text, ratio){
  let b = $("#busy");
  if(text == null){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement("div"); b.id = "busy"; b.innerHTML = `<div><p></p><i><b></b></i></div>`; document.body.appendChild(b); }
  b.querySelector("p").textContent = text; b.querySelector("b").style.width = Math.round((ratio || 0) * 100) + "%";
}
// 샘플 그림: 고칠 거리가 보이게 비상구 표시와 소화기를 그려 넣어요
function sampleFlaw(x, W, H, pose){
  const u = H / 100;
  if(pose !== 2){
    const sx = W - 17 * u, sy = 7 * u;
    x.fillStyle = "#1E9E57"; x.fillRect(sx, sy, 11 * u, 5 * u);
    x.fillStyle = "#fff"; x.fillRect(sx + 1.2 * u, sy + 1.3 * u, 3.4 * u, 2.4 * u); x.fillRect(sx + 6 * u, sy + 2 * u, 3.6 * u, 1 * u);
    const ex = 6 * u, ey = H - 23 * u;
    x.fillStyle = "#C62828"; x.fillRect(ex, ey, 4.2 * u, 10 * u); x.fillStyle = "#222"; x.fillRect(ex + 1.2 * u, ey - 1.8 * u, 1.8 * u, 1.8 * u);
    x.fillStyle = "#EEE"; x.fillRect(ex + 0.7 * u, ey + 3 * u, 2.8 * u, 2.4 * u);
  } else {
    x.strokeStyle = "rgba(40,28,22,.75)"; x.lineWidth = Math.max(1, u * 0.22); x.lineCap = "round";
    const cx = W * 0.61, cy = H * 0.2;
    for(const [dx, dy, ex2, ey2] of [[0, 0, 3.5, -4], [1.2, 0.4, 5.5, -2.2], [-0.8, 0.2, -3.6, -3.4]]){ x.beginPath(); x.moveTo(cx + dx * u, cy + dy * u); x.quadraticCurveTo(cx + (dx + ex2) * u * 0.5, cy + (dy + ey2) * u, cx + (dx + ex2) * u, cy + (dy + ey2 * 0.7) * u); x.stroke(); }
  }
}
function sampleCanvas(pose, shot, W, H){
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); SAMPLES.drawSample(x, W, H, pose, shot); x.setTransform(1, 0, 0, 1, 0, 0); sampleFlaw(x, W, H, pose);
  return c;
}
async function startSample(){
  await wipe();
  const list = [];
  for(const [i, [pose, shot, W, H]] of [[2, 0, 1800, 1200], [0, 2, 1800, 1200], [3, 0, 1200, 1800]].entries()){
    const blob = await jpeg(sampleCanvas(pose, shot, W, H), 0.9);
    list.push(new File([blob], `SAMPLE_${pad(i + 1)}.jpg`, { type: "image/jpeg" }));
  }
  await addFiles(list, { sample: true });
}

// ===== 화면 바꾸기 =====
function go(screen){
  if(purge()) save();
  toast("");   // 앞 화면에서 뜬 알림이 다음 화면을 가리지 않게
  CUR = screen;
  if(screen !== "edit") ED = null;
  if(screen !== "common") COM_NEXT = false;
  if(screen !== "cover" && screen !== "soon"){ S.pos.screen = screen === "edit" ? "edit" : "list"; trap(); }
  render(); scrollTo(0, 0);
}
// 폰의 뒤로 가기(버튼 · 옆으로 밀기)가 사이트를 나가지 않고 이전 단계로 가게: 방문 기록을 하나 넣어 두고, 뒤로 가면 한 단계 물러난 뒤 다시 넣어요.
function trap(){ if(TRAP) return; try { history.pushState({ pp: 1 }, ""); TRAP = true; } catch (e) {} }
function goHome(){ closeOverlays(); purge(); saveNow(); if(S.photos.length) SAVED = { st: S, imgs: null }; renderCover(); scrollTo(0, 0); }
function backStep(){
  if($(".ov")){ closeOverlays(); return; }
  if(CUR === "edit"){ if(ED && ED.pin) closePin(); else go("list"); return; }
  if(CUR === "common" || CUR === "out"){ go("list"); return; }
  if(CUR === "list") goHome();
}
function render(){
  closeOverlays();
  if(CUR === "soon") return renderSoon();
  if(CUR === "cover") return renderCover();
  if(CUR === "list") return renderList();
  if(CUR === "edit") return renderEdit();
  if(CUR === "common") return renderCommon();
  if(CUR === "out") return renderOut();
}
function topBar(left, right = ""){ return `<header class="tb">${left}<span class="tb-sp"></span>${right}</header>`; }

// ===== 공개 전 · 첫 화면 =====
function renderSoon(){
  CUR = "soon";
  document.body.className = "is-cover";
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.soonTop)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.soonFor)}</p>
    <h1>${nl(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.soonLead)}</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.soonInsta)}</a>
      ${siteLink("groom", "go", `<span>${esc(T.soonOther)}</span>`)}
    </div>
    ${foot()}`;
}
function renderCover(){
  CUR = "cover";
  document.body.className = "is-cover pp-body";
  app.className = "wrap cover pp-cover";
  const sv = SAVED ? totals(SAVED.st) : null;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    ${SAVED ? `<button class="resume" data-a="resume"><b>${esc(T.resumeTitle)}</b><span>${esc(f(T.resumeMeta, { n: SAVED.st.photos.length, r: sv.r }))}</span><i aria-hidden="true">→</i></button>` : ""}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${nl(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="btns">
      <button class="btn insta" data-a="pick">${esc(SAVED ? T.newStart : T.pick)}</button>
      <button class="btn dark" data-a="sample">${esc(T.trySample)}</button>
    </div>
    <p class="trust"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 016.8 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="7" width="10" height="7.2" rx="1.9" fill="currentColor"/></svg>${esc(T.trust)}</p>
    <p class="drop">${esc(T.dropHint)}</p>
    <section class="ex">
      <div class="exh"><b>${esc(T.exTitle)}</b><span>${esc(T.exTag)}</span></div>
      <div class="exi" id="exi">${EXURL ? `<img src="${EXURL}" alt="">` : ""}</div>
    </section>
    <ul class="notes"><li>${esc(T.noteWhich)}</li><li>${esc(T.noteBoth)}</li></ul>
    ${foot()}`;
  if(!EXURL) makeExample();
}
// 첫 화면 예시: 샘플 그림에 요청 3개를 적은 요청서 한 장
async function makeExample(){
  try {
    const c = sampleCanvas(2, 0, 1500, 1000);
    const p = { k: "", n: "IMG_0412.jpg", w: 1500, h: 1000, ok: false, pins: [
      { id: 1, x: 0.613, y: 0.2, who: "b", items: ["h.out"], deg: 1, note: "" },
      { id: 2, x: 0.725, y: 0.63, who: "b", items: ["b.arm"], deg: 1, note: "" },
      { id: 3, x: 0.365, y: 0.515, who: "g", items: ["f.jaw"], deg: 2, note: "" },
      { id: 4, x: null, y: null, who: "", items: ["a.warm"], deg: 1, note: "" }] };
    await fontsFor(p.pins.map(pinLine).join(" ") + p.n);
    const pg = await sheetPhoto(p, 2, 9, { src: c, info: { g: "", b: "", round: 0 } });
    EXURL = URL.createObjectURL(pg.blob);
    const box = $("#exi"); if(box) box.innerHTML = `<img src="${EXURL}" alt="">`;
  } catch (e) {}
}
async function resume(){
  if(!SAVED) return;
  S = Object.assign(blank(), SAVED.st);
  if(SAVED.imgs) for(const [k, v] of SAVED.imgs){ if(P(k) && v && v.b) IMG.set(k, { blob: v.b, url: URL.createObjectURL(v.b), turl: URL.createObjectURL(v.t || v.b) }); }
  SAVED = null;
  go("list");
}
function confirmNew(then){
  if(!SAVED && !S.photos.length){ then(); return; }
  sheet({ title: T.newTitle, body: T.newBody, yes: T.newYes, no: T.cancel, onYes: async () => { await wipe(); then(); } });
}

// ===== 사진 목록 =====
function thumbHTML(p){
  const im = IMG.get(p.k), wide = p.w >= p.h;
  const dots = posPins(p).filter(filled).map(q => `<i style="left:${(q.x * 100).toFixed(2)}%;top:${(q.y * 100).toFixed(2)}%"></i>`).join("");
  return `<span class="im"><span class="fr" style="${wide ? `width:100%;aspect-ratio:${p.w}/${p.h}` : `height:100%;aspect-ratio:${p.w}/${p.h}`}">${im ? `<img src="${im.turl}" alt="" loading="lazy" draggable="false">` : ""}${dots}</span></span>`;
}
function renderList(){
  document.body.className = "pp-body";
  app.className = "pp list";
  const t = totals(), cl = comLists(), cn = cl.doList.length + cl.dont.length, any = t.r + t.k + t.c > 0;
  app.innerHTML = `
    ${topBar(`<b class="tb-name">${esc(T.name)}</b>`, `<button class="tbb" data-a="menu" aria-label="menu">⋯</button>`)}
    <div class="pg">
      <h1 class="h">${nl(T.listTitle)}</h1>
      <p class="sub">${esc(t.a + t.k ? f(T.listStat, { n: S.photos.length, a: t.a, k: t.k, t: t.t }) : f(T.listSub, { n: S.photos.length }))}${S.sample ? ` <span class="tag">${esc(T.sampleTag)}</span>` : ""}</p>
      <div class="grid">
        ${S.photos.map(p => { const n = reqN(p); return `<button class="ph" data-a="open" data-k="${p.k}">${thumbHTML(p)}<span class="nm">${esc(p.n)}</span><span class="st ${n ? "req" : p.ok ? "ok" : "todo"}">${esc(n ? f(T.cardReq, { n }) : p.ok ? T.cardOk : T.cardTodo)}</span></button>`; }).join("")}
        ${S.photos.length < MAXN ? `<button class="ph add" data-a="pick"><span class="im"><span class="plus">＋</span></span><span class="nm">${esc(T.addMore)}</span></button>` : ""}
      </div>
      <button class="ccard${cn ? " on" : ""}" data-a="common"><span><b>${esc(T.commonCard)}</b><small>${esc(cn ? f(T.commonCardN, { n: cn }) : T.commonCardSub)}</small></span><i aria-hidden="true">›</i></button>
    </div>
    <div class="dock"><div class="dock-in"><span class="meta">${esc(any ? f(T.makeMeta, { p: t.a + t.k, r: t.r }) : T.makeHint)}</span><button class="btn insta${any ? "" : " wait"}" data-a="make">${esc(T.makeBtn)} →</button></div></div>`;
}
function make(){
  purge();
  const t = totals();
  if(!t.r && !t.k && !t.c){ toast(T.makeNone, 3200); return; }
  // 처음 한 번: 공통 요청을 아직 안 봤으면 물어봐요 (공통 요청 칸이 사진들 아래에 있어서 놓치기 쉬워요)
  if(!t.c && !S.tips.common){
    S.tips.common = 1; save();
    sheet({ title: T.askComTitle, body: T.askComBody, yes: T.askComYes, no: T.askComNo, onYes: () => { COM_NEXT = true; go("common"); }, onNo: () => go("out") });
    return;
  }
  go("out");
}

// ===== 사진 한 장: 번호 찍기 =====
function openPhoto(k){
  purge();
  ED = { k, pin: null, cat: S.cat || "face" };
  VIEW = { z: 1, tx: 0, ty: 0 };
  toast("");
  S.pos = { screen: "edit", k }; CUR = "edit"; COM_NEXT = false; trap();
  render(); save();
}
function renderEdit(){
  const p = ED && P(ED.k); if(!p){ go("list"); return; }
  document.body.className = "pp-body noscroll";
  app.className = "pp edit";
  const i = S.photos.indexOf(p), im = IMG.get(p.k);
  app.innerHTML = `
    <header class="tb ed-top">
      <button class="tbb txt" data-a="list">‹ ${esc(T.back)}</button>
      <button class="ed-name" data-a="rename"><small>${i + 1} / ${S.photos.length}${S.sample ? " · " + esc(T.sampleTag) : ""}</small><b>${esc(p.n)}</b></button>
      <button class="zoom" data-a="zoom" id="zoomb">${esc(T.zoomIn)}</button>
      <button class="tbb" data-a="pmenu" aria-label="menu">⋯</button>
    </header>
    <div class="stage" id="stage">
      <div class="cv" id="cv"><img id="ph" src="${im ? im.url : ""}" alt="" draggable="false"><div id="pins"></div></div>
      <div class="hint" id="hint"><i></i><b>${esc(T.edHint)}</b><span>${esc(isTouch() ? T.edHintSub : T.edHintSubPc)}</span></div>
    </div>
    <section class="panel" id="panel"></section>`;
  bindStage(); layout(); renderPins(); renderPanel();
}
function layout(){
  const st = $("#stage"), p = ED && P(ED.k); if(!st || !p) return;
  const sw = st.clientWidth, sh = st.clientHeight; if(!sw || !sh) return;
  const s = Math.min(sw / p.w, sh / p.h);
  L = { sw, sh, bw: p.w * s, bh: p.h * s };
  clampView(); applyView();
}
function clampView(){
  const w = L.bw * VIEW.z, h = L.bh * VIEW.z;
  VIEW.tx = w <= L.sw ? (L.sw - w) / 2 : clamp(VIEW.tx, L.sw - w, 0);
  VIEW.ty = h <= L.sh ? (L.sh - h) / 2 : clamp(VIEW.ty, L.sh - h, 0);
}
function applyView(){
  const cv = $("#cv"); if(!cv) return;
  cv.style.width = L.bw + "px"; cv.style.height = L.bh + "px";
  cv.style.transform = `translate(${VIEW.tx}px,${VIEW.ty}px) scale(${VIEW.z})`;
  cv.style.setProperty("--iz", String(1 / VIEW.z));
  const b = $("#zoomb"); if(b){ b.textContent = VIEW.z > 1.01 ? T.zoomOut : T.zoomIn; b.classList.toggle("on", VIEW.z > 1.01); }
}
function zoomAt(px, py, z){
  z = clamp(z, 1, 6);
  const cx = (px - VIEW.tx) / VIEW.z, cy = (py - VIEW.ty) / VIEW.z;
  VIEW.z = z; VIEW.tx = px - cx * z; VIEW.ty = py - cy * z;
  clampView(); applyView();
}
function toPhoto(cx, cy){
  const r = $("#stage").getBoundingClientRect();
  return { x: ((cx - r.left - VIEW.tx) / VIEW.z) / L.bw, y: ((cy - r.top - VIEW.ty) / VIEW.z) / L.bh };
}
function ensureVisible(pin){
  if(!pin || pin.x == null || !L) return;
  const px = VIEW.tx + pin.x * L.bw * VIEW.z, py = VIEW.ty + pin.y * L.bh * VIEW.z, m = 44;
  let dx = 0, dy = 0;
  if(px < m) dx = m - px; else if(px > L.sw - m) dx = L.sw - m - px;
  if(py < m) dy = m - py; else if(py > L.sh - m) dy = L.sh - m - py;
  if(dx || dy){ VIEW.tx += dx; VIEW.ty += dy; clampView(); applyView(); }
}
function toggleZoom(){
  if(VIEW.z > 1.01){ VIEW = { z: 1, tx: 0, ty: 0 }; clampView(); applyView(); return; }
  const p = P(ED.k), cur = ED.pin && p.pins.find(q => q.id === ED.pin && q.x != null);
  const px = cur ? VIEW.tx + cur.x * L.bw : L.sw / 2, py = cur ? VIEW.ty + cur.y * L.bh : L.sh / 2;
  zoomAt(px, py, 2.6);
}
function renderPins(){
  const box = $("#pins"), p = ED && P(ED.k); if(!box || !p) return;
  box.innerHTML = posPins(p).map((q, i) => `<button class="pin${q.id === ED.pin ? " cur" : ""}" data-id="${q.id}" style="left:${(q.x * 100).toFixed(3)}%;top:${(q.y * 100).toFixed(3)}%" aria-label="${i + 1}"><b>${i + 1}</b></button>`).join("");
  const h = $("#hint"); if(h) h.hidden = p.pins.length > 0 || !!ED.pin;
}
// 사진 위 손가락 · 마우스: 톡 누르면 번호, 번호를 끌면 옮기기, 확대했을 때 끌면 사진 움직이기, 두 손가락은 확대
function bindStage(){
  const st = $("#stage"); if(!st) return;
  const PT = new Map(); let G = null;
  const at = e => ({ x: e.clientX, y: e.clientY });
  st.addEventListener("pointerdown", e => {
    if(e.pointerType === "mouse" && e.button !== 0) return;
    try { st.setPointerCapture(e.pointerId); } catch (err) {}
    PT.set(e.pointerId, at(e));
    if(PT.size === 1){
      const pe = e.target.closest(".pin");
      G = { type: "tap", sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t: Date.now(), pin: pe ? +pe.dataset.id : 0 };
    } else if(PT.size === 2){
      const [a, b] = [...PT.values()];
      G = { type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: VIEW.z };
    }
  });
  st.addEventListener("pointermove", e => {
    if(!PT.has(e.pointerId) || !G) return;
    PT.set(e.pointerId, at(e));
    if(G.type === "pinch" && PT.size >= 2){
      const [a, b] = [...PT.values()], r = st.getBoundingClientRect();
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, G.z0 * Math.hypot(a.x - b.x, a.y - b.y) / G.d0);
      return;
    }
    if(G.type === "tap" && Math.hypot(e.clientX - G.sx, e.clientY - G.sy) > 8){
      G.type = G.pin ? "drag" : VIEW.z > 1.01 ? "pan" : "none";
      if(G.type === "drag") keep();
    }
    if(G.type === "drag"){
      const p = P(ED.k), q = p.pins.find(x => x.id === G.pin); if(!q) return;
      const o = toPhoto(e.clientX, e.clientY); q.x = clamp(o.x, 0, 1); q.y = clamp(o.y, 0, 1);
      const el = $(`.pin[data-id="${q.id}"]`); if(el){ el.style.left = (q.x * 100).toFixed(3) + "%"; el.style.top = (q.y * 100).toFixed(3) + "%"; el.classList.add("drag"); }
    } else if(G.type === "pan"){
      VIEW.tx += e.clientX - G.lx; VIEW.ty += e.clientY - G.ly; clampView(); applyView();
    }
    G.lx = e.clientX; G.ly = e.clientY;
  });
  const end = e => {
    if(!PT.has(e.pointerId)) return;
    PT.delete(e.pointerId);
    const g = G;
    if(PT.size){ G = { type: "none" }; return; }
    G = null; if(!g) return;
    if(e.type === "pointercancel") { if(g.type === "drag"){ renderPins(); save(); } return; }
    if(g.type === "tap" && Date.now() - g.t < 800){
      if(g.pin) openPin(g.pin);
      else { const o = toPhoto(e.clientX, e.clientY); if(o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1) tapAt(o.x, o.y); }
    } else if(g.type === "drag"){ renderPins(); save(); }
  };
  st.addEventListener("pointerup", end);
  st.addEventListener("pointercancel", end);
  // 폰: 사진을 누른 뒤 따라오는 '클릭'이 방금 올라온 아래 칸의 버튼(완료 · 지우기)을 누르지 않게 막아요
  st.addEventListener("touchend", e => { if(e.cancelable) e.preventDefault(); GHOST = Date.now() + 450; }, { passive: false });
  st.addEventListener("wheel", e => {
    e.preventDefault();
    const r = st.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, VIEW.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)));
  }, { passive: false });
  if(window.ResizeObserver){ const ro = new ResizeObserver(() => { if(CUR === "edit" && $("#stage") === st){ layout(); if(ED && ED.pin){ const p = P(ED.k); ensureVisible(p && p.pins.find(q => q.id === ED.pin)); } } }); ro.observe(st); }
}
function curPin(){ const p = ED && P(ED.k); return p && ED.pin ? p.pins.find(q => q.id === ED.pin) : null; }
function tapAt(x, y){
  const p = P(ED.k), cur = curPin();
  if(cur && cur.x != null && !filled(cur)){ cur.x = x; cur.y = y; renderPins(); save(); return; }
  if(cur && !filled(cur)) p.pins = p.pins.filter(q => q !== cur);
  // 누구는 방금 고른 사람을 이어받고(한 사람씩 훑는 경우가 많아서), 얼마나는 늘 "살짝만"부터 (과한 보정 후회가 가장 많아서)
  const pin = { id: S.seq++, x, y, who: S.who, items: [], deg: 1, note: "" };
  p.pins.push(pin); p.ok = false;
  ED.pin = pin.id; if(ED.cat === "all") ED.cat = S.cat && S.cat !== "all" ? S.cat : "face";
  renderPins(); renderPanel(); save();
  if(!S.tips.drag){ S.tips.drag = 1; toast(T.dragTip, 3600); }
}
function addWhole(){
  const p = P(ED.k);
  const pin = { id: S.seq++, x: null, y: null, who: "", items: [], deg: 1, note: "" };
  p.pins.push(pin); p.ok = false; ED.pin = pin.id; ED.cat = "all";
  renderPins(); renderPanel(); save();
}
function openPin(id){
  const p = P(ED.k), cur = curPin();
  if(cur && cur.id !== id && !filled(cur)) p.pins = p.pins.filter(q => q !== cur);
  const pin = p.pins.find(q => q.id === id); if(!pin) return;
  ED.pin = id;
  if(pin.x == null) ED.cat = "all";
  else { const first = pinItems(pin)[0]; ED.cat = first ? first.cat : (ED.cat === "all" ? "face" : ED.cat); }
  renderPins(); renderPanel();
}
function closePin(){
  const p = P(ED.k), cur = curPin();
  if(cur && !filled(cur)) p.pins = p.pins.filter(q => q !== cur);
  ED.pin = null;
  renderPins(); renderPanel(); save();
}
function deletePin(){
  const p = P(ED.k), cur = curPin(); if(!cur) return;
  const had = filled(cur), no = pinNo(p, cur);
  if(had) keep();
  p.pins = p.pins.filter(q => q !== cur); ED.pin = null;
  renderPins(); renderPanel(); save();
  if(had) toast(no ? f(T.pinDeleted, { n: no }) : T.pinDel, 5000, T.undo, undo);
}
function rowHTML(p, q){
  const no = pinNo(p, q), text = pinLine(q);
  return `<button class="rw" data-a="pin" data-id="${q.id}">${no ? `<i class="no">${no}</i>` : `<i class="no wh">${esc(T.wholeTag)}</i>`}<span>${text ? esc(text) : `<em>${esc(T.rowEmpty)}</em>`}</span><u aria-hidden="true">›</u></button>`;
}
function renderPanel(){
  const pn = $("#panel"), p = ED && P(ED.k); if(!pn || !p) return;
  const cur = curPin();
  pn.classList.toggle("editing", !!cur);
  if(cur){ pn.innerHTML = pinEditorHTML(p, cur); updPreview(); return; }
  const i = S.photos.indexOf(p), last = i === S.photos.length - 1;
  const rows = [...posPins(p), ...p.pins.filter(q => q.x == null)];
  pn.innerHTML = `
    <div class="rows">${rows.map(q => rowHTML(p, q)).join("")}${rows.length ? `<p class="more">${esc(T.edMore)}</p>` : ""}</div>
    <div class="acts">
      <button class="cb" data-a="whole">＋ ${esc(T.whole)}</button>
      ${rows.length ? "" : `<button class="cb${p.ok ? " on" : ""}" data-a="ok">${esc(p.ok ? T.okOff : T.okOn)}</button>`}
    </div>
    <div class="navs">
      <button class="btn ghost" data-a="prev"${i ? "" : " disabled"}>‹ ${esc(T.prev)}</button>
      <button class="btn ${last ? "insta" : "main"}" data-a="next">${esc(last ? T.lastGo : T.next)} ›</button>
    </div>`;
}
function pinEditorHTML(p, pin){
  const whole = pin.x == null, no = pinNo(p, pin);
  const cats = whole ? CATS.filter(c => c.id === "all") : CATS.filter(c => c.id !== "all");
  const cat = cats.find(c => c.id === ED.cat) || cats[0];
  return `
    <div class="pe-head"><b>${esc(whole ? T.wholeTitle : f(T.pinTitle, { n: no }))}</b><button class="tl" data-a="pindel">${esc(T.pinDel)}</button><button class="btn-s" data-a="pindone">${esc(T.pinDone)}</button></div>
    <div class="pe-top">
      <div class="pv"><small id="pvl">${esc(T.previewLabel)}</small><div id="pv"></div>
        <input type="text" id="note" value="${esc(pin.note || "")}" placeholder="${esc(T.previewEmpty)}" aria-label="${esc(T.noteLabel)}" autocomplete="off" enterkeyhint="done"></div>
    </div>
    <div class="pe-body">
      ${whole ? "" : `<div class="tabs" id="tabs">${cats.map(c => `<button class="tab${c.id === cat.id ? " on" : ""}" data-a="cat" data-id="${c.id}">${esc(c.label)}${pin.items.some(id => ITEM.has(id) && ITEM.get(id).cat === c.id) ? `<i></i>` : ""}</button>`).join("")}</div>`}
      <div class="chips" id="chips">${cat.items.map(it => `<button class="chip${pin.items.includes(it.id) ? " on" : ""}" data-a="chip" data-id="${it.id}">${esc(it.chip)}</button>`).join("")}</div>
    </div>
    <div class="pe-foot" id="pefoot">
      <div class="ln" id="lndeg"><span class="lb">${esc(T.degLabel)}</span>${DEG.map(d => `<button class="chip sm${pin.deg === d.id ? " on" : ""}" data-a="deg" data-v="${d.id}">${esc(d.chip)}</button>`).join("")}</div>
      ${whole ? "" : `<div class="ln" id="lnwho"><span class="lb">${esc(T.whoLabel)}</span>${[["b", T.whoB], ["g", T.whoG], ["p", T.whoP], ["", T.whoN]].map(([v, t]) => `<button class="chip sm${pin.who === v ? " on" : ""}" data-a="who" data-v="${v}">${esc(t)}</button>`).join("")}</div>`}
    </div>`;
}
function updPreview(){
  const pin = curPin(), pv = $("#pv"); if(!pin || !pv) return;
  const its = pinItems(pin), sents = its.map(it => sentence(it, pin));
  // 맨 위 칸: 고른 요청의 문장 → 그 아래 직접 쓰는 칸. 아무것도 안 골랐으면 글 칸만 보이고, 흐린 글씨가 할 일을 알려 줘요.
  pv.innerHTML = sents.map(x => `<p>${esc(x)}</p>`).join("") + [...new Set(its.filter(it => it.hard).map(it => it.hard === true ? T.hardNote : it.hard))].map(h => `<p class="hard">${esc(h)}</p>`).join("");
  pv.hidden = !sents.length;
  const lb = $("#pvl"); if(lb) lb.hidden = !sents.length;
  const note = $("#note"); if(note){ note.placeholder = sents.length ? T.notePh : T.previewEmpty; note.classList.toggle("more", sents.length > 0); }
  // 얼마나 · 누구: 고른 요청에 그 자리가 있을 때만 아래에 나타나요 (처음엔 고를 것만 보이게)
  const w = $("#lnwho"), d = $("#lndeg"), ft = $("#pefoot");
  const hasW = its.some(it => it.s.includes("{who}")), hasD = its.some(it => it.s.includes("{deg}"));
  if(w) w.hidden = !hasW;
  if(d) d.hidden = !hasD;
  if(ft) ft.hidden = !(hasD || (w && hasW));
  $$("#tabs .tab").forEach(t => { const has = pin.items.some(id => ITEM.has(id) && ITEM.get(id).cat === t.dataset.id); const i = t.querySelector("i"); if(has && !i) t.insertAdjacentHTML("beforeend", "<i></i>"); else if(!has && i) i.remove(); });
}
function navPhoto(d){
  const i = S.photos.findIndex(p => p.k === ED.k), j = i + d;
  if(j < 0) return;
  if(j >= S.photos.length){ make(); return; }
  openPhoto(S.photos[j].k);
}
function renamePhoto(){
  const p = P(ED.k); if(!p) return;
  const o = overlay("sheet", `<h2>${esc(T.renameTitle)}</h2><p>${esc(T.renameSub)}</p><input type="text" id="rn" value="${esc(p.n)}" autocomplete="off" enterkeyhint="done"><div class="orow"><button class="btn insta" id="sy">${esc(T.renameOk)}</button><button class="btn ghost" id="sn">${esc(T.cancel)}</button></div>`);
  const ok = () => { const v = $("#rn").value.trim(); if(v){ p.n = v.slice(0, 80); save(); } closeOverlays(); renderEdit(); };
  $("#sy").onclick = ok; $("#sn").onclick = closeOverlays; o._yes = ok;
  const inp = $("#rn"); inp.focus(); inp.select();
}
function removePhoto(){
  const p = P(ED.k); if(!p) return;
  keep();
  const i = S.photos.indexOf(p);
  S.photos.splice(i, 1);
  closeOverlays();
  if(!S.photos.length){ save(); DB.del("kv", "state").catch(() => {}); go("list"); }
  else { save(); go("list"); }
  toast(T.removed, 5000, T.undo, undo);
}

// ===== 모든 사진 공통 요청 =====
function renderCommon(){
  document.body.className = "pp-body";
  app.className = "pp common";
  const ck = (list, sel, a) => list.map(c => `<button class="ck${sel.includes(c.id) ? " on" : ""}" data-a="${a}" data-id="${c.id}" aria-pressed="${sel.includes(c.id)}"><i>${CHECK}</i><span>${esc(c.s)}</span></button>`).join("");
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="list">‹ ${esc(T.back)}</button>`)}
    <div class="pg narrow">
      <h1 class="h">${esc(T.comTitle)}</h1>
      <p class="sub">${esc(T.comSub)}</p>
      <h2 class="gh">${esc(T.comDo)}</h2>
      <div class="cks">${ck(COMMON, S.common.items, "com")}</div>
      <h2 class="gh">${esc(T.comDont)}</h2>
      <div class="cks">${ck(DONT, S.common.dont, "dont")}</div>
      <label class="nt big"><small>${esc(T.comNote)}</small><textarea id="cnote" rows="3" placeholder="${esc(T.comNotePh)}">${esc(S.common.note || "")}</textarea></label>
    </div>
    <div class="dock"><div class="dock-in"><button class="btn insta" data-a="comdone">${esc(COM_NEXT ? T.comDoneGo : T.comDone)}${COM_NEXT ? " →" : ""}</button></div></div>`;
}

// ===== 요청서 그림 =====
let MCTX = null;
function mctx(){ if(!MCTX) MCTX = document.createElement("canvas").getContext("2d"); return MCTX; }
function wrap(x, text, maxW){
  const out = [];
  for(const para of String(text).split("\n")){
    let line = "";
    for(const word of para.split(" ")){
      const t = line ? line + " " + word : word;
      if(x.measureText(t).width <= maxW){ line = t; continue; }
      if(line){ out.push(line); line = ""; }
      let w = word;
      while(x.measureText(w).width > maxW && w.length > 1){ let i = w.length - 1; while(i > 1 && x.measureText(w.slice(0, i)).width > maxW) i--; out.push(w.slice(0, i)); w = w.slice(i); }
      line = w;
    }
    out.push(line);
  }
  return out;
}
function fitText(x, text, maxW){ if(x.measureText(text).width <= maxW) return text; let t = text; while(t.length > 1 && x.measureText(t + "…").width > maxW) t = t.slice(0, -1); return t + "…"; }
async function fontsFor(text){
  if(!document.fonts || !document.fonts.load) return;
  const all = text + T.kind0 + T.kind1 + T.kind2 + "서0123456789 /·";
  const job = Promise.all([500, 700, 900].map(w => document.fonts.load(`${w} 32px 'Noto Sans KR'`, all).catch(() => null)));
  await Promise.race([job, new Promise(r => setTimeout(r, 2500))]);
}
// 요청서 · 글 맨 위 이름: "어떤 요청인가요?"에서 고른 것에 따라 수정 요청 / 보정 요청 / 재수정 요청
function kindOf(info){ return T["kind" + (info.round || 0)] || T.kind0; }
function subLine(info){
  const a = [];
  if(info.g && info.b) a.push(f(T.shNames, { g: info.g, b: info.b })); else if(info.g) a.push(T.whoG + " " + info.g); else if(info.b) a.push(T.whoB + " " + info.b);
  a.push(todayStr());
  return a.join("  ·  ");
}
function sheetHead(x, W, M, title, page, info){
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillStyle = PINK; x.font = `700 28px ${FONT}`; x.fillText(f(T.shHead, { kind: kindOf(info) }), M, 92);
  x.fillStyle = "#8A8A8A"; x.font = `500 26px ${FONT}`; x.textAlign = "right"; x.fillText(page, W - M, 92); x.textAlign = "left";
  x.fillStyle = "#161616"; x.font = `900 50px ${FONT}`; x.fillText(fitText(x, title, W - M * 2), M, 156);
  x.fillStyle = "#6A6A6A"; x.font = `500 26px ${FONT}`; x.fillText(fitText(x, subLine(info), W - M * 2), M, 200);
  return 236;
}
function noBadge(x, cx, cy, r, label, whole){
  x.fillStyle = PINK;
  if(whole){ const w = r * 3.3; rrect(x, cx - r, cy - r, w, r * 2, r); x.fill(); x.fillStyle = "#fff"; x.font = `700 ${Math.round(r * 0.95)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, cx - r + w / 2, cy + 1); }
  else { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.fillStyle = "#fff"; x.font = `900 ${Math.round(r * 1.15)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, cx, cy + 1); }
  x.textAlign = "left"; x.textBaseline = "alphabetic";
}
function rrect(x, l, t, w, h, r){ x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
// 사진 위 표시: 고칠 자리가 가려지지 않게 고리로 두르고, 번호는 고리 오른쪽 위에
function drawMark(x, cx, cy, n, R = 30){
  x.save();
  x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 8;
  x.lineWidth = 9; x.strokeStyle = "#fff"; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  x.shadowBlur = 0;
  x.lineWidth = 5; x.strokeStyle = PINK; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  const bx = cx + R * 0.82, by = cy - R * 0.82, br = R * 0.62;
  x.fillStyle = "#fff"; x.beginPath(); x.arc(bx, by, br + 3, 0, Math.PI * 2); x.fill();
  x.restore();
  noBadge(x, bx, by, br, String(n));
}
async function pageOut(c, name){
  const blob = await jpeg(c, 0.9), bytes = new Uint8Array(await blob.arrayBuffer());
  return { blob, bytes, w: c.width, h: c.height, name };
}
async function sheetPhoto(p, i, n, opt = {}){
  const W = SHEET_W, M = 64, cw = W - M * 2, info = opt.info || S.info, m = mctx();
  const pins = p.pins.filter(filled), pos = pins.filter(q => q.x != null), whole = pins.filter(q => q.x == null);
  const rows = [...pos.map((q, j) => ({ tag: String(j + 1), text: pinLine(q) })), ...whole.map(q => ({ tag: T.wholeTag, whole: true, text: pinLine(q) }))];
  if(!rows.length) rows.push({ tag: "", ok: true, text: T.shOk });
  const LH = 50; m.font = `500 34px ${FONT}`;
  for(const r of rows){ r.tx = M + (r.ok ? 0 : r.whole ? 116 : 76); r.lines = wrap(m, r.text, W - M - r.tx); r.h = Math.max(r.lines.length * LH, 56) + 18; }
  const s = Math.min(cw / p.w, 1180 / p.h), iw = Math.round(p.w * s), ih = Math.round(p.h * s);
  const top = 236, rowsH = rows.reduce((a, r) => a + r.h, 0), H = top + ih + 46 + rowsH + 38;   // 맨 아래 서명 줄은 없어요 (사회자님 11/13: 작가님께 가는 문서라서 뺌)
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  sheetHead(x, W, M, p.n, f(T.shPage, { i, n }), info);
  const ix = Math.round((W - iw) / 2);
  x.fillStyle = "#F1F1F1"; x.fillRect(M, top, cw, ih);
  let src = opt.src, own = false;
  if(!src){ src = await decode(IMG.get(p.k).blob); own = true; }
  x.imageSmoothingQuality = "high"; x.drawImage(src, ix, top, iw, ih);
  if(own && src.close) src.close();
  pos.forEach((q, j) => drawMark(x, ix + q.x * iw, top + q.y * ih, j + 1));
  let y = top + ih + 46;
  for(const r of rows){
    if(!r.ok) noBadge(x, M + 26, y + 26, 26, r.tag, r.whole);
    x.fillStyle = r.ok ? "#5C5C5C" : "#161616"; x.font = `500 34px ${FONT}`;
    r.lines.forEach((ln, k) => x.fillText(ln, r.tx, y + 38 + k * LH));
    y += r.h;
  }
  return pageOut(c, f(T.fileImg, { i: pad(i), name: baseName(p.n) }));
}
function baseName(n){ return String(n).replace(/\.[A-Za-z0-9]{2,5}$/, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) || "photo"; }
async function sheetCover(list, n){
  const W = SHEET_W, M = 64, m = mctx(), cl = comLists(), info = S.info, LH = 50;
  const blocks = [];
  m.font = `500 34px ${FONT}`;
  const sec = (title, arr) => { if(!arr.length) return; blocks.push({ k: "h", text: title }); for(const s of arr) blocks.push({ k: "li", lines: wrap(m, s, W - M * 2 - 44) }); blocks.push({ k: "gap", h: 22 }); };
  sec(T.shDo, cl.doList); sec(T.shDont, cl.dont);
  if(!cl.doList.length && !cl.dont.length){ blocks.push({ k: "p", lines: wrap(m, T.shNoCommon, W - M * 2) }); blocks.push({ k: "gap", h: 22 }); }
  blocks.push({ k: "h", text: T.shList });
  m.font = `500 30px ${FONT}`;
  list.forEach((p, i) => { const r = reqN(p); blocks.push({ k: "ph", no: i + 2, name: p.n, st: r ? f(T.cardReq, { n: r }) : T.cardOk }); });
  blocks.push({ k: "gap", h: 18 }); m.font = `500 26px ${FONT}`; blocks.push({ k: "sm", lines: wrap(m, T.shSide, W - M * 2) });
  const hOf = b => b.k === "h" ? 62 : b.k === "li" || b.k === "p" ? b.lines.length * LH + 10 : b.k === "ph" ? 52 : b.k === "sm" ? b.lines.length * 38 + 6 : b.h;
  const t = totals(), top = 236 + 64, H = top + blocks.reduce((a, b) => a + hOf(b), 0) + 44;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  sheetHead(x, W, M, T.shCover, f(T.shPage, { i: 1, n }), info);
  x.fillStyle = "#161616"; x.font = `700 32px ${FONT}`;
  x.fillText(f(T.shCoverSum, { p: list.length, r: t.r }) + (t.k ? "  ·  " + f(T.shCoverOk, { k: t.k }) : ""), M, 262);
  let y = top;
  for(const b of blocks){
    if(b.k === "h"){ x.fillStyle = PINK; x.font = `700 30px ${FONT}`; x.fillText(b.text, M, y + 40); }
    else if(b.k === "li"){ x.fillStyle = PINK; x.beginPath(); x.arc(M + 12, y + 26, 7, 0, Math.PI * 2); x.fill(); x.fillStyle = "#161616"; x.font = `500 34px ${FONT}`; b.lines.forEach((ln, k) => x.fillText(ln, M + 44, y + 38 + k * LH)); }
    else if(b.k === "p"){ x.fillStyle = "#5C5C5C"; x.font = `500 34px ${FONT}`; b.lines.forEach((ln, k) => x.fillText(ln, M, y + 38 + k * LH)); }
    else if(b.k === "sm"){ x.fillStyle = "#7A7A7A"; x.font = `500 26px ${FONT}`; b.lines.forEach((ln, k) => x.fillText(ln, M, y + 30 + k * 38)); }
    else if(b.k === "ph"){
      x.fillStyle = "#8A8A8A"; x.font = `700 26px ${FONT}`; x.fillText(String(b.no), M, y + 36);
      x.font = `500 30px ${FONT}`; x.textAlign = "right"; x.fillStyle = b.st === T.cardOk ? "#5C5C5C" : PINK; x.fillText(b.st, W - M, y + 36); const sw = x.measureText(b.st).width; x.textAlign = "left";
      x.fillStyle = "#161616"; x.fillText(fitText(x, b.name, W - M * 2 - 70 - sw - 30), M + 70, y + 36);
      x.fillStyle = "#EEEEEE"; x.fillRect(M, y + 50, W - M * 2, 1);
    }
    y += hOf(b);
  }
  return pageOut(c, f(T.fileImg, { i: pad(1), name: T.shCover.replace(/\s+/g, "") }));
}
function outText(){
  const cl = comLists(), list = outPhotos(), a = [], info = S.info, who = [];
  if(info.g) who.push(T.whoG + " " + info.g); if(info.b) who.push(T.whoB + " " + info.b);
  a.push(f(T.txHead, { kind: kindOf(info) }) + (who.length ? " " + who.join(" · ") : ""));
  a.push(T.txHello);
  if(cl.doList.length){ a.push("", T.txCommon); cl.doList.forEach(s => a.push("- " + s)); }
  if(cl.dont.length){ a.push("", T.txDont); cl.dont.forEach(s => a.push("- " + s)); }
  const circ = n => n <= 20 ? String.fromCharCode(0x245F + n) : `(${n})`;
  const oneLine = S.fmt === "line";
  if(oneLine) a.push("");
  for(const p of list){
    const pins = p.pins.filter(filled), pos = pins.filter(q => q.x != null), whole = pins.filter(q => q.x == null);
    const parts = pins.length ? [...pos.map((q, i) => circ(i + 1) + " " + pinLine(q)), ...whole.map(q => `[${T.wholeTag}] ` + pinLine(q))] : [T.txOk];
    if(oneLine) a.push(p.n + " : " + parts.join(" "));
    else { a.push("", "■ " + p.n); parts.forEach(x => a.push(x)); }
  }
  a.push("", T.txTail);
  return a.join("\n");
}

// ===== PDF · ZIP (라이브러리 없이 직접 써요) =====
// PDF: 쪽마다 요청서 그림(JPEG) 한 장을 그대로 넣어요. 글자는 그림 안에 있어서 글꼴 문제가 없어요.
function makePdf(pages){
  const enc = new TextEncoder(), parts = [], off = []; let len = 0;
  const put = d => { const u = typeof d === "string" ? enc.encode(d) : d; parts.push(u); len += u.length; };
  const obj = (n, body) => { off[n] = len; put(`${n} 0 obj\n`); body(); put(`\nendobj\n`); };
  put("%PDF-1.4\n"); put(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
  const N = pages.length;
  obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => put(`<< /Type /Pages /Count ${N} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`));
  pages.forEach((pg, i) => {
    const a = 3 + i * 3, PW = 595.28, PH = +(PW * pg.h / pg.w).toFixed(2), content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    obj(a, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${a + 2} 0 R >> >> /Contents ${a + 1} 0 R >>`));
    obj(a + 1, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(a + 2, () => { put(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`); put(pg.bytes); put("\nendstream"); });
  });
  const total = 2 + N * 3, xref = len;
  put(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for(let n = 1; n <= total; n++) put(String(off[n]).padStart(10, "0") + " 00000 n \n");
  put(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
const CRC_T = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8){ let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files){
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  for(const fl of files){
    const nm = enc.encode(fl.name), crc = crc32(fl.bytes), sz = fl.bytes.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
    h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, fl.bytes);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
    c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + sz;
  }
  const cs = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" });
}

// ===== 요청서 (결과) =====
function renderOut(){
  document.body.className = "pp-body";
  app.className = "pp out";
  const t = totals(), list = outPhotos(), touch = isTouch();
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="list">‹ ${esc(T.back)}</button>`, `<button class="tbb" data-a="menu" aria-label="menu">⋯</button>`)}
    <div class="pg narrow">
      <h1 class="h">${esc(T.outTitle)}</h1>
      <p class="sub">${esc(f(T.outSub, { p: list.length, r: t.r }))}</p>
      ${t.t ? `<p class="skip">${esc(f(T.outSkip, { n: t.t }))} <button class="tl" data-a="list">${esc(T.outSkipBtn)}</button></p>` : ""}
      <div class="kind"><span class="lb2">${esc(T.infoRound)}</span>
        <div class="ln" id="rounds">${[0, 1, 2].map(r => `<button class="chip sm${(T["kind" + S.info.round] ? S.info.round : 0) === r ? " on" : ""}" data-a="round" data-v="${r}">${esc(T["round" + r])}</button>`).join("")}</div></div>
      <div class="strip" id="strip"><p class="busy" id="obusy"></p></div>
      <p class="mini">${esc(T.tapBig)}</p>
      <div class="btns">
        <button class="btn insta" data-a="pdf" id="bpdf" disabled>${esc(touch ? T.pdfBtn : T.pdfBtnPc)}</button>
        <button class="btn ghost" data-a="imgs" id="bimg" disabled>${esc(f(T.imgBtn, { n: list.length + 1 }))}</button>
        <button class="btn ghost" data-a="copy">${esc(T.txtBtn)}</button>
      </div>
      <p class="msg" id="msg"></p>
      <section class="bx open"><h2>${esc(T.checkTitle)}</h2><div class="cks plain">${CHECKS.map(c => `<label class="ck"><input type="checkbox"><i>${CHECK}</i><span>${esc(c)}</span></label>`).join("")}</div></section>
      <details class="bx"><summary>${esc(T.txtTitle)}</summary>
        <div class="ln" id="fmts"><span class="lb">${esc(T.fmtLabel)}</span>${[["num", T.fmtNum], ["line", T.fmtLine]].map(([v, t]) => `<button class="chip sm${S.fmt === v ? " on" : ""}" data-a="fmt" data-v="${v}">${esc(t)}</button>`).join("")}</div>
        <textarea id="msgtxt" readonly rows="10">${esc(outText())}</textarea>
        <p class="vend">${esc(T.outVendor)}</p>
      </details>
      <details class="bx"${S.info.g || S.info.b ? " open" : ""}><summary>${esc(T.infoTitle)}</summary>
        <div class="two"><label class="nt"><small>${esc(T.infoGroom)}</small><input type="text" id="ig" value="${esc(S.info.g)}" maxlength="20" autocomplete="off"></label>
        <label class="nt"><small>${esc(T.infoBride)}</small><input type="text" id="ib" value="${esc(S.info.b)}" maxlength="20" autocomplete="off"></label></div>
        ${S.sample ? "" : `<p class="vend">${esc(T.nameTip)}</p>`}
      </details>
      <section class="bx open"><h2>${esc(T.tipsTitle)}</h2><ol class="tips">${TIPS.map(c => `<li>${esc(c)}</li>`).join("")}</ol></section>
      <p class="again">${esc(T.again)}</p>
      ${sign()}
    </div>`;
  buildOut();
}
let outT = 0;
function rebuildSoon(){ clearTimeout(outT); outT = setTimeout(() => { if(CUR === "out"){ const ta = $("#msgtxt"); if(ta) ta.value = outText(); buildOut(); } }, 600); }
async function buildOut(){
  const gen = ++OUT.gen, list = outPhotos(), n = list.length + 1;
  for(const pg of OUT.pages) if(pg.url) URL.revokeObjectURL(pg.url);
  OUT.pages = []; OUT.pdf = null; OUT.busy = true; OUT.done = 0; OUT.total = n;
  const setBusy = () => { const b = $("#obusy"); if(b) b.textContent = f(T.outBusy, { d: OUT.done, n }); };
  const bp = $("#bpdf"), bi = $("#bimg"); if(bp) bp.disabled = true; if(bi) bi.disabled = true;
  const strip = $("#strip"); if(strip && !$("#obusy")) strip.insertAdjacentHTML("afterbegin", `<p class="busy" id="obusy"></p>`);
  setBusy();
  try {
    const cl = comLists();
    await fontsFor(list.map(p => p.n + p.pins.map(pinLine).join(" ")).join(" ") + cl.doList.join(" ") + cl.dont.join(" ") + T.shCover + T.shDo + T.shDont + T.shList + T.shOk + T.shNoCommon + T.shSide + T.cardReq + T.cardOk + T.wholeTag + subLine(S.info) + T.shCoverSum + T.shCoverOk);
    const pages = [await sheetCover(list, n)];
    OUT.done = 1; setBusy();
    for(let i = 0; i < list.length; i++){
      if(gen !== OUT.gen) return;
      pages.push(await sheetPhoto(list[i], i + 2, n));
      OUT.done = i + 2; setBusy();
      await new Promise(r => setTimeout(r, 0));
    }
    if(gen !== OUT.gen) return;
    for(const pg of pages) pg.url = URL.createObjectURL(pg.blob);
    OUT.pages = pages;
    OUT.pdf = new File([makePdf(pages)], f(T.filePdf, { d: todayStr() }), { type: "application/pdf" });
    OUT.busy = false;
    if(CUR !== "out") return;
    const st = $("#strip"); if(st) st.innerHTML = pages.map((pg, i) => `<button class="shp" data-a="big" data-i="${i}"><img src="${pg.url}" alt="" loading="lazy"></button>`).join("");
    const b1 = $("#bpdf"), b2 = $("#bimg"); if(b1) b1.disabled = false; if(b2) b2.disabled = false;
  } catch (e) {
    if(gen !== OUT.gen) return;
    OUT.busy = false; const b = $("#obusy"); if(b) b.textContent = T.saveFail;
  }
}
function download(blob, name){
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 8000);
}
async function shareOrSave(files, zipName){
  const msg = $("#msg");
  if(isTouch() && navigator.canShare && navigator.canShare({ files })){
    try { await navigator.share({ files }); if(msg) msg.textContent = ""; return; }
    catch (e) { if(e && e.name === "AbortError") return; }
  }
  if(files.length === 1) download(files[0], files[0].name);
  else if(zipName){ const bytes = await Promise.all(files.map(async fl => ({ name: fl.name, bytes: new Uint8Array(await fl.arrayBuffer()) }))); download(makeZip(bytes), zipName); }
  if(msg) msg.textContent = T.saved; toast(T.saved);
}
function pageFile(pg){ return new File([pg.blob], pg.name, { type: "image/jpeg" }); }
async function copyOut(){
  const text = outText(), msg = $("#msg");
  try { await navigator.clipboard.writeText(text); if(msg) msg.textContent = T.copied; toast(T.copied); }
  catch (e) { if(msg) msg.textContent = T.copyFail; const d = $("#msgtxt"); if(d){ d.closest("details").open = true; d.focus(); d.select(); } }
}
function openBig(i){
  const pg = OUT.pages[i]; if(!pg) return;
  overlay("big", `<div class="bigh"><span>${i + 1} / ${OUT.pages.length}</span><button class="btn-s" data-a="one" data-i="${i}">${esc(T.saveOne)}</button><button class="btn-s gh" data-a="close">${esc(T.close)}</button></div><div class="bigs"><img src="${pg.url}" alt=""></div>`, "full");
}

// ===== 창 · 알림 =====
function toast(msg, ms = 2600, btn, fn){
  let t = $("#toast");
  if(!t){ t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  if(!msg){ t.classList.remove("on"); return; }
  t.innerHTML = `<span>${esc(msg)}</span>${btn ? `<button>${esc(btn)}</button>` : ""}`;
  const b = t.querySelector("button"); if(b) b.onclick = () => { t.classList.remove("on"); fn && fn(); };
  t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), ms);
}
function overlay(id, html, cls = ""){
  closeOverlays();
  const o = document.createElement("div"); o.id = id; o.className = "ov " + cls; o.innerHTML = `<div class="ovc" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", e => { if(e.target === o) closeOverlays(); });
  document.body.appendChild(o);
  return o;
}
function closeOverlays(){ for(const id of ["sheet", "menu", "big"]){ const o = $("#" + id); if(o) o.remove(); } }
function sheet({ title, body, yes, no, onYes, onNo }){
  const o = overlay("sheet", `<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="orow"><button class="btn insta" id="sy">${esc(yes)}</button><button class="btn ghost" id="sn">${esc(no)}</button></div>`);
  o._yes = () => { closeOverlays(); onYes && onYes(); };
  $("#sy").onclick = o._yes; $("#sn").onclick = () => { closeOverlays(); onNo && onNo(); };
}
function openMenu(items){
  overlay("menu", `<div class="mlist">${items.map(([a, t]) => `<button data-a="${a}">${esc(t)}</button>`).join("")}<button data-a="close" class="c">${esc(T.cancel)}</button></div>`, "bottom");
}

// ===== 누르기 =====
const ACT = {
  pick(){ if(CUR === "cover" && SAVED){ confirmNew(() => { renderCover(); $("#file").click(); }); return; } $("#file").click(); },
  sample(){ confirmNew(startSample); },
  resume,
  menu(){ openMenu([["home", T.menuHome], ["new", T.menuNew]]); },
  pmenu(){ openMenu([["rename", T.rename], ["rmphoto", T.removePhoto]]); },
  home(){ goHome(); },
  new(){ closeOverlays(); sheet({ title: T.newTitle, body: T.newBody, yes: T.newYes, no: T.cancel, onYes: async () => { await wipe(); renderCover(); scrollTo(0, 0); } }); },
  close(){ closeOverlays(); },
  open(b){ openPhoto(b.dataset.k); },
  common(){ S.tips.common = 1; go("common"); },
  comdone(){ const next = COM_NEXT; go(next ? "out" : "list"); },
  make,
  list(){ go("list"); },
  prev(){ navPhoto(-1); },
  next(){ navPhoto(1); },
  zoom(){ toggleZoom(); },
  whole(){ addWhole(); },
  ok(){ const p = P(ED.k); p.ok = !p.ok; save(); renderPanel(); if(p.ok) toast(T.okNote); },
  pin(b){ openPin(+b.dataset.id); },
  pindone(){ closePin(); },
  pindel(){ deletePin(); },
  rename(){ closeOverlays(); renamePhoto(); },
  rmphoto(){ removePhoto(); },
  cat(b){ ED.cat = b.dataset.id; S.cat = ED.cat; const p = P(ED.k), pin = curPin(); if(!pin) return; const note = $("#note"), nv = note ? note.value : pin.note; $("#panel").innerHTML = pinEditorHTML(p, pin); const n2 = $("#note"); if(n2) n2.value = nv; updPreview(); const tb = $("#tabs .tab.on"); if(tb && tb.scrollIntoView) tb.scrollIntoView({ block: "nearest", inline: "center" }); },
  chip(b){ const pin = curPin(); if(!pin) return; const id = b.dataset.id, i = pin.items.indexOf(id); if(i >= 0) pin.items.splice(i, 1); else pin.items.push(id); b.classList.toggle("on", i < 0); updPreview(); save(); },
  who(b){ const pin = curPin(); if(!pin) return; pin.who = b.dataset.v; S.who = pin.who; $$("#lnwho .chip").forEach(c => c.classList.toggle("on", c === b)); updPreview(); save(); },
  deg(b){ const pin = curPin(); if(!pin) return; pin.deg = +b.dataset.v; $$("#lndeg .chip").forEach(c => c.classList.toggle("on", c === b)); updPreview(); save(); },
  com(b){ tog(S.common.items, b); },
  dont(b){ tog(S.common.dont, b); },
  fmt(b){ S.fmt = b.dataset.v; $$("#fmts .chip").forEach(c => c.classList.toggle("on", c === b)); const ta = $("#msgtxt"); if(ta) ta.value = outText(); save(); },
  round(b){ S.info.round = +b.dataset.v; $$("#rounds .chip").forEach(c => c.classList.toggle("on", c === b)); const ta = $("#msgtxt"); if(ta) ta.value = outText(); save(); rebuildSoon(); },
  pdf(){ if(OUT.pdf) shareOrSave([OUT.pdf]); },
  imgs(){ if(OUT.pages.length) shareOrSave(OUT.pages.map(pageFile), f(T.fileZip, { d: todayStr() })); },
  copy(){ copyOut(); },
  big(b){ openBig(+b.dataset.i); },
  one(b){ const pg = OUT.pages[+b.dataset.i]; if(pg) shareOrSave([pageFile(pg)]); }
};
function tog(arr, b){ const id = b.dataset.id, i = arr.indexOf(id); if(i >= 0) arr.splice(i, 1); else arr.push(id); b.classList.toggle("on", i < 0); b.setAttribute("aria-pressed", String(i < 0)); save(); }

function inputs(){
  const fi = document.createElement("input"); fi.type = "file"; fi.id = "file"; fi.accept = "image/*"; fi.multiple = true; fi.hidden = true;
  fi.addEventListener("change", async () => { const list = [...fi.files]; fi.value = ""; if(list.length) await addFiles(list); });
  document.body.appendChild(fi);
  document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(!b || b.disabled) return; if(Date.now() < GHOST && !b.closest("#stage")){ e.preventDefault(); return; } const fn = ACT[b.dataset.a]; if(fn) fn(b, e); });
  document.addEventListener("input", e => {
    const t = e.target;
    if(t.id === "note"){ const pin = curPin(); if(pin){ pin.note = t.value; updPreview(); save(); } }
    else if(t.id === "cnote"){ S.common.note = t.value; save(); }
    else if(t.id === "ig"){ S.info.g = t.value.trim(); save(); rebuildSoon(); }
    else if(t.id === "ib"){ S.info.b = t.value.trim(); save(); rebuildSoon(); }
  });
  document.addEventListener("keydown", e => {
    const inField = /^(INPUT|TEXTAREA)$/.test((e.target.tagName || ""));
    const sh = $("#sheet");
    if(e.key === "Escape"){ if($(".ov")){ closeOverlays(); return; } if(CUR === "edit"){ if(inField) e.target.blur(); else if(ED.pin) closePin(); else if(VIEW.z > 1.01) toggleZoom(); else go("list"); } return; }
    if(e.key === "Enter" && !e.isComposing){ if(sh && sh._yes){ e.preventDefault(); sh._yes(); return; } if(CUR === "edit" && ED.pin && (!inField || e.target.id === "note")){ e.preventDefault(); if(inField) e.target.blur(); closePin(); } return; }
    if(inField || $(".ov")) return;
    if((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey){ if(UNDO.length){ e.preventDefault(); undo(); } return; }
    if(CUR !== "edit" || e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.key === "ArrowLeft" && !ED.pin){ e.preventDefault(); navPhoto(-1); }
    else if(e.key === "ArrowRight" && !ED.pin){ e.preventDefault(); const i = S.photos.findIndex(p => p.k === ED.k); if(i < S.photos.length - 1) navPhoto(1); }
    else if((e.key === "Delete" || e.key === "Backspace") && ED.pin){ e.preventDefault(); deletePin(); }
  });
  // 노트북: 사진을 화면에 끌어다 놓기
  let dragN = 0;
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
  document.addEventListener("dragenter", e => { if(!hasFiles(e)) return; e.preventDefault(); dragN++; document.body.classList.add("dropping"); document.body.dataset.drop = T.dropNow; });
  document.addEventListener("dragover", e => { if(hasFiles(e)) e.preventDefault(); });
  document.addEventListener("dragleave", e => { if(!hasFiles(e)) return; dragN = Math.max(0, dragN - 1); if(!dragN) document.body.classList.remove("dropping"); });
  document.addEventListener("drop", async e => {
    if(!hasFiles(e)) return; e.preventDefault(); dragN = 0; document.body.classList.remove("dropping");
    const list = [...e.dataTransfer.files]; if(!list.length) return;
    if(CUR === "cover" && SAVED){ confirmNew(() => addFiles(list)); return; }
    await addFiles(list);
  });
  addEventListener("resize", () => { if(CUR === "edit") layout(); });
  addEventListener("popstate", () => { TRAP = false; if(CUR === "cover" || CUR === "soon") return; backStep(); if(CUR !== "cover") trap(); });
  addEventListener("pagehide", () => { purge(); saveNow(); });
  document.addEventListener("visibilitychange", () => { if(document.hidden) saveNow(); });
}

async function boot(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ renderSoon(); return; }
  inputs();
  try {
    const st = await DB.get("kv", "state");
    if(st && st.photos && st.photos.length){
      const imgs = await DB.all("img");
      st.photos = st.photos.filter(p => imgs.has(p.k) && imgs.get(p.k) && imgs.get(p.k).b);
      if(st.photos.length) SAVED = { st, imgs };
    }
  } catch (e) { STORE_OK = false; }
  renderCover();
}
window.__pp = { get CUR(){ return CUR; }, get S(){ return S; }, get OUT(){ return OUT; }, get ED(){ return ED; }, get VIEW(){ return VIEW; }, get L(){ return L; }, outText, makePdf, makeZip, totals, go, openPhoto, tapAt, addFiles };
boot();
