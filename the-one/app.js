// 웨딩사진 셀렉 도우미 ㊱: 사진 폴더 → 같은 구도 묶기(추천, 고칠 수 있음) → 1차 후보 ♥ → 2차 최종(둘 중 하나) → 3차 최최종(목표 장수) → 작가님께 보낼 파일 번호
// 기획 docs/웨딩사진-셀렉/기획.md · 문구 text.js · 작은 사진 worker.js · 샘플 그림 samples.js · 엑셀 xlsx.js · 공통 shared/common.js
// 사진은 이 컴퓨터(브라우저) 밖으로 보내지 않아요. 작은 사진과 고른 표시만 이 브라우저 저장소(IndexedDB)에 남겨요.
// 사회자 한마디 상자는 넣지 않아요 — 사진 셀렉은 사회자 영역이 아니라서 (사회자님 기준, 2026-11-03)

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/the-one/?preview)
const OPEN = false;
// =========================================================

const DBN = "the-one.v1";
const THUMB = 400;                       // 작은 사진 긴 변(px)
const IMG_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const RAW_EXT = new Set(["cr2", "cr3", "nef", "arw", "raf", "orf", "rw2", "dng", "srw", "pef", "nrw", "3fr", "iiq"]);
const HEIC_EXT = new Set(["heic", "heif"]);
// 묶음 크기 5단계: t = 이 초보다 오래 쉬었다 찍으면 새 묶음 · d = 그림이 이만큼 달라지면 새 묶음 (0~1)
const LV = [{ t: 3, d: 0.07 }, { t: 6, d: 0.10 }, { t: 12, d: 0.14 }, { t: 25, d: 0.19 }, { t: 60, d: 0.26 }];
const UAP = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
const IS_MAC = /mac|iphone|ipad|ipod/i.test(UAP);
const K = IS_MAC
  ? { undo: "⌘ Z", space: "space", enter: "return", esc: "esc", del: "delete" }
  : { undo: "Ctrl Z", space: "Space", enter: "Enter", esc: "Esc", del: "Delete" };

// ===== 상태 =====
let S = blank();
let SAVED = null;            // 저장돼 있던 셀렉 (첫 화면 "이어서 하기")
let GOT = null;              // 상대가 링크로 보낸 셀렉 (아직 사진에 안 붙임)
let CUR = "cover";           // 지금 보이는 화면
let STATS = null;
const FILES = new Map();     // 사진 키 → 원본 File (이 창에서만)
const TH = new Map();        // 사진 키 → { url, blob, w, h, sig } 작은 사진
const URLS = new Map();      // 사진 키 → 원본 주소(blob:)
const PRE = new Map();       // 미리 풀어 둔 원본
let PIDX = new Map(), GIDX = new Map();
let LOAD = { gen: 0, total: 0, done: 0, ready: 0, running: false, bad: 0 };
let DIRH = null, PICK_MODE = "new", STORE_OK = true, PHONE_MODE = false, NO_WORKER = false;
let UNDO = [];
let SEL = { set: new Set(), anchor: null, focus: null };
let VIEW = { z: 1, fx: 0.5, fy: 0.5, ax: 0.5, ay: 0.5 };
let PTR = null, DRAG = null, LB = null, MODAL = null, DEMO = null;

function blank(){
  return { v: 1, at: 0, photos: [], level: 3, sortBy: "time", groups: [], edited: false,
    heart: {}, T: {}, add: {}, out: {}, frame: {}, target: { sel: 0, frame: 0 },
    me: "", partner: null, fmt: { name: "name", sep: "comma", greet: true }, sample: false,
    pos: { screen: "groups", k1: "", ck2: "", k3: "" }, tips: {}, show: { drop: false } };
}

// ===== 작은 도구 =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function f(s, o = {}){ return String(s).replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m); }
function nl(s){ return esc(s).replace(/\n/g, "<br>"); }
function num(n){ return Number(n).toLocaleString("ko-KR"); }
function P(k){ return PIDX.get(k); }
function uniq(a){ return [...new Set(a)]; }
function sortKeys(a){ return a.slice().sort((x, y) => (P(x) ? P(x).o : 0) - (P(y) ? P(y).o : 0)); }
function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
function isPhone(){ return (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches) || innerWidth < 720; }
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function kbd(k){ return `<kbd>${esc(k)}</kbd>`; }
function reindex(){ PIDX = new Map(S.photos.map(p => [p.k, p])); }
const coll = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
function sortPhotos(){
  const byName = (a, b) => coll.compare(a.p || a.n, b.p || b.n);
  S.photos.sort(S.sortBy === "time" ? (a, b) => ((a.t == null) - (b.t == null)) || ((a.t || 0) - (b.t || 0)) || byName(a, b) : byName);
  S.photos.forEach((p, i) => { p.o = i; });
}

// ===== 브라우저 저장소 (IndexedDB) =====
const DB = {
  p: null,
  open(){
    if(!this.p) this.p = new Promise((res, rej) => {
      let r; try { r = indexedDB.open(DBN, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => { const d = r.result; if(!d.objectStoreNames.contains("kv")) d.createObjectStore("kv"); if(!d.objectStoreNames.contains("thumb")) d.createObjectStore("thumb"); };
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
  putMany(store, list){ return this.run(store, "readwrite", s => { for(const [k, v] of list) s.put(v, k); return null; }); },
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
function storeFail(){ if(STORE_OK){ STORE_OK = false; toast(T.noStore, 5000); } }
function flushThumbs(list){ if(STORE_OK && list.length) DB.putMany("thumb", list).catch(storeFail); }

// ===== 묶음 · 고른 표시 계산 =====
function sigDist(a, b){
  const x = TH.get(a), y = TH.get(b);
  if(!x || !y || !x.sig || !y.sig) return 0;
  let s = 0; for(let i = 0; i < 768; i++) s += Math.abs(x.sig[i] - y.sig[i]);
  return s / 768 / 255;
}
// 찍은 순서대로 보면서, 오래 쉬었거나 그림이 많이 달라지면 새 묶음 (추천일 뿐 — 사용자가 고칠 수 있어요)
function autoGroups(list){
  const L = LV[S.level - 1], out = []; let cur = [], first = null;
  for(let i = 0; i < list.length; i++){
    const p = list[i];
    if(cur.length){
      const q = list[i - 1], d = sigDist(q.k, p.k), d0 = sigDist(first.k, p.k);
      const gap = S.sortBy === "time" && p.t != null && q.t != null ? (p.t - q.t) / 1000 : null;
      let split = d > L.d || d0 > L.d * 1.8;
      if(!split && gap != null && gap > L.t) split = !(gap <= L.t * 4 && d <= L.d * 0.5);
      if(split){ out.push(cur); cur = []; }
    }
    if(!cur.length) first = p;
    cur.push(p.k);
  }
  if(cur.length) out.push(cur);
  return out;
}
const SEP = "\n";
function candsOf(g){ return g.filter(k => S.heart[k]); }
function stats(){
  GIDX = new Map(); S.groups.forEach((g, gi) => g.forEach(k => GIDX.set(k, gi)));
  const fin = new Set(), groups2 = []; let single = 0;
  S.groups.forEach((g, gi) => {
    const c = candsOf(g);
    if(c.length === 1){ fin.add(c[0]); single++; }
    else if(c.length > 1){ const ck = c.join(SEP), st = S.T[ck] || null; groups2.push({ gi, c, ck, st }); if(st && st.done) st.win.forEach(k => fin.add(k)); }
  });
  for(const k in S.add) if(PIDX.has(k)) fin.add(k);
  const finals = S.photos.filter(p => fin.has(p.k) && !S.out[p.k]).map(p => p.k);
  const fset = new Set(finals);
  return { fin, finals, fset, groups2, single, hearts: S.photos.filter(p => S.heart[p.k]).length, frames: finals.filter(k => S.frame[k]).length };
}
function refresh(){ STATS = stats(); }
function myLevel(k){ return STATS.fset.has(k) ? 3 : STATS.fin.has(k) ? 2 : S.heart[k] ? 1 : 0; }
// 되돌리기: 바꾸기 전 모습을 통째로 남겨 둬요
function snap(){ return JSON.stringify({ groups: S.groups, edited: S.edited, heart: S.heart, T: S.T, add: S.add, out: S.out, frame: S.frame, level: S.level, sortBy: S.sortBy, target: S.target }); }
function act(label, fn){ UNDO.push({ label, s: snap() }); if(UNDO.length > 80) UNDO.shift(); fn(); refresh(); save(); }
function undo(){
  const u = UNDO.pop();
  if(!u){ toast(T.undoNone); return; }
  const o = JSON.parse(u.s), resort = o.sortBy !== S.sortBy;
  Object.assign(S, o); if(resort) sortPhotos();
  refresh(); save(); render(); toast(f(T.undone, { what: u.label }));
}

// ===== 상대가 보낸 셀렉 =====
function partnerWho(p = S.partner || GOT){ return (p && p.w) || T.other; }
function pCode(k){ const p = S.partner, ph = P(k); return p && ph ? (p.lv[ph.n] || 0) : 0; }
function pBestSet(){
  const p = S.partner; if(!p) return new Set();
  let best = 0; const m = new Map();
  for(const ph of S.photos){ const c = (p.lv[ph.n] || 0) & 3; if(c){ m.set(ph.k, c); best = Math.max(best, c); } }
  return new Set([...m].filter(([, c]) => c === best).map(([k]) => k));
}
function pBadge(k){
  const c = pCode(k) & 3; if(!c) return "";
  const who = partnerWho();
  return `<span class="pb">${esc(f([0, T.pHeart, T.pFin, T.pBest][c], { who }))}${pCode(k) & 4 ? " ★" : ""}</span>`;
}
function attachPartner(quiet){
  if(GOT){ S.partner = GOT; GOT = null; DB.del("kv", "got").catch(() => {}); }
  if(!S.partner || !S.photos.length) return;
  const n = S.photos.filter(p => S.partner.lv[p.n]).length;
  S.partner.found = n;
  if(!quiet) toast(n ? f(T.gotFound, { who: partnerWho(), n: num(n) }) : f(T.gotNone, { who: partnerWho() }), 4500);
}
async function packStr(s){
  const bytes = new TextEncoder().encode(s);
  if(window.CompressionStream){
    try { const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer(); return "z" + b64u(new Uint8Array(out)); } catch (e) {}
  }
  return "u" + b64u(bytes);
}
async function unpackStr(t){
  const bytes = unb64u(t.slice(1));
  if(t[0] === "z") return new TextDecoder().decode(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  return new TextDecoder().decode(bytes);
}
function b64u(u8){ let s = ""; for(let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64u(t){ t = t.replace(/-/g, "+").replace(/_/g, "/"); while(t.length % 4) t += "="; const s = atob(t), u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function pageUrl(){ const u = new URL(location.origin + location.pathname); if(!OPEN) u.searchParams.set("preview", ""); return u.toString().replace("preview=", "preview"); }
async function partnerLink(){
  const e = [];
  for(const p of S.photos){ let c = myLevel(p.k); if(!c) continue; if(c === 3 && S.frame[p.k]) c |= 4; e.push([p.n, c]); }
  return pageUrl() + "#p=" + await packStr(JSON.stringify({ v: 1, w: S.me, d: todayStr(), e }));
}
async function readPartnerHash(){
  const m = /[#&]p=([A-Za-z0-9_-]+)/.exec(location.hash);
  if(!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const o = JSON.parse(await unpackStr(m[1]));
    if(!o || o.v !== 1 || !Array.isArray(o.e)) throw new Error("bad");
    GOT = { w: o.w || "", d: o.d || "", lv: Object.fromEntries(o.e.filter(x => Array.isArray(x) && typeof x[0] === "string")) };
    DB.put("kv", "got", GOT).catch(() => {});
  } catch (e) { setTimeout(() => toast(T.gotBad, 4500), 300); }
}

// ===== 사진 불러오기 =====
async function filesFromHandle(dir, path = "", out = []){
  for await (const [name, h] of dir.entries()){
    if(name.startsWith(".")) continue;
    if(h.kind === "file") out.push({ file: await h.getFile(), path: path + name });
    else if(h.kind === "directory") await filesFromHandle(h, path + name + "/", out);
  }
  return out;
}
async function walkEntry(en, path, out){
  if(en.name.startsWith(".")) return;
  if(en.isFile) out.push({ file: await new Promise((res, rej) => en.file(res, rej)), path: path + en.name });
  else if(en.isDirectory){
    const rd = en.createReader();
    for(;;){ const batch = await new Promise((res, rej) => rd.readEntries(res, rej)); if(!batch.length) break; for(const c of batch) await walkEntry(c, path + en.name + "/", out); }
  }
}
async function pickFolder(mode = "new"){
  PICK_MODE = mode;
  if(window.showDirectoryPicker && !isPhone()){
    try {
      const h = await window.showDirectoryPicker({ id: "the-one", mode: "read" });
      const list = await filesFromHandle(h, h.name + "/");
      await startLoad(list, { handle: h, reattach: mode === "reattach" });
      return;
    } catch (e) { if(e && e.name === "AbortError") return; }
  }
  $("#pick-dir").click();
}
function pickFiles(mode = "new"){ PICK_MODE = mode; $("#pick-files").click(); }
async function reconnect(){
  if(DIRH && DIRH.requestPermission){
    try {
      if(await DIRH.requestPermission({ mode: "read" }) === "granted"){ reattach((await filesFromHandle(DIRH, DIRH.name + "/")).map(x => x.file)); return; }
    } catch (e) {}
  }
  pickFolder("reattach");
}
// 처음에 불러온 사진과 이름 · 크기가 같은 파일을 다시 이어 붙여요
function reattach(files, quiet){
  const by = new Map(files.map(file => [file.name + "|" + file.size, file])), byName = new Map(files.map(file => [file.name, file]));
  let ok = 0;
  for(const p of S.photos){ const file = by.get(p.k) || (S.sample ? byName.get(p.n) : null); if(file){ FILES.set(p.k, file); ok++; } }
  URLS.forEach(u => URL.revokeObjectURL(u)); URLS.clear(); PRE.clear();
  if(quiet) return ok;
  if(!ok){ toast(T.reNone, 4500); return ok; }
  const miss = S.photos.length - ok;
  toast(f(T.reOk, { n: num(ok) }) + (miss ? " · " + f(T.reMiss, { m: num(miss) }) : ""), 4000);
  render();
  return ok;
}
async function startLoad(list, opt = {}){
  const imgs = [], skip = { zip: 0, raw: 0, heic: 0, other: 0 };
  for(const it of list){
    const n = it.file.name, ext = (n.split(".").pop() || "").toLowerCase();
    if(n.startsWith(".")) continue;
    if(IMG_EXT.has(ext) || /^image\/(jpeg|png|webp)$/.test(it.file.type)) imgs.push(it);
    else if(ext === "zip") skip.zip++;
    else if(RAW_EXT.has(ext)) skip.raw++;
    else if(HEIC_EXT.has(ext)) skip.heic++;
    else skip.other++;
  }
  if(opt.reattach){
    if(opt.handle){ DIRH = opt.handle; DB.put("kv", "dir", DIRH).catch(() => {}); }
    reattach(imgs.map(x => x.file)); return;
  }
  if(!imgs.length){ toast(skip.zip ? T.errZip : T.errNoImg, 4500); return; }
  if(isPhone() && imgs.length > 150 && !opt.ok){
    sheet({ title: T.phoneManyTitle, body: f(T.phoneManyBody, { n: num(imgs.length) }), yes: T.phoneManyYes, no: T.cancel, onYes: () => startLoad(list, Object.assign({}, opt, { ok: true })) });
    return;
  }
  const gen = ++LOAD.gen, me = S.me || (SAVED && SAVED.me) || "";
  closeOverlays();
  // 새 셀렉 시작: 전에 하던 것은 지워요 (사진 파일은 그대로)
  for(const t of TH.values()) URL.revokeObjectURL(t.url);
  URLS.forEach(u => URL.revokeObjectURL(u));
  TH.clear(); URLS.clear(); PRE.clear(); FILES.clear(); UNDO = []; SEL = { set: new Set(), anchor: null, focus: null };
  S = blank(); S.me = me; S.sample = !!opt.sample; SAVED = null;
  if(!GOT){ try { const g = await DB.get("kv", "got"); if(g) GOT = g; } catch (e) {} }
  DIRH = opt.handle || null;
  try { await DB.clear("thumb"); if(DIRH) await DB.put("kv", "dir", DIRH); else await DB.del("kv", "dir"); } catch (e) { STORE_OK = false; }
  const seen = new Set(), ph = [];
  for(const it of imgs){
    const k = it.file.name + "|" + it.file.size; if(seen.has(k)) continue; seen.add(k);
    FILES.set(k, it.file);
    ph.push({ k, n: it.file.name, s: it.file.size, p: it.path || it.file.name, t: it.t != null ? it.t : null, w: it.w || 0, h: it.h || 0, o: 0 });
  }
  S.photos = ph; reindex();
  LOAD = { gen, total: ph.length, done: 0, ready: 0, running: true, bad: 0 };
  const msgs = [];
  if(skip.raw) msgs.push(f(T.errRaw, { n: skip.raw }));
  if(skip.heic) msgs.push(f(T.errHeic, { n: skip.heic }));
  if(skip.other) msgs.push(f(T.errSkip, { n: skip.other }));
  if(ph.length > 1500) msgs.push(f(T.bigFolder, { n: num(ph.length) }));
  if(msgs.length) toast(msgs.join(" "), 5500);
  refresh();
  go("target");
  // 1) 찍은 시각 · 원본 크기 읽기 (파일 앞부분만)
  await pool(ph.filter(p => p.t == null || !p.w), 8, async p => {
    const m = await readMeta(FILES.get(p.k));
    if(p.t == null) p.t = m.t;
    if(!p.w && m.w){ p.w = m.w; p.h = m.h; }
  });
  if(gen !== LOAD.gen) return;
  S.sortBy = S.photos.every(p => p.t != null) ? "time" : "name";
  sortPhotos(); attachPartner(); save();
  // 2) 작은 사진 + 그림 지문 (찍은 순서대로, 앞에서부터 묶음이 생겨요)
  await makeThumbs(gen);
}
async function pool(items, n, fn){ let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while(i < items.length){ const it = items[i++]; try { await fn(it); } catch (e) {} } })); }

// JPEG 앞부분에서 찍은 시각(EXIF)과 가로 · 세로를 읽어요
async function readMeta(file){
  const out = { t: null, w: 0, h: 0, o: 1 };
  if(!file || !(/\.jpe?g$/i.test(file.name) || file.type === "image/jpeg")) return out;
  let dv; try { dv = new DataView(await file.slice(0, 262144).arrayBuffer()); } catch (e) { return out; }
  if(dv.byteLength < 4 || dv.getUint16(0) !== 0xFFD8) return out;
  let i = 2, exif = false;
  while(i + 4 <= dv.byteLength){
    if(dv.getUint8(i) !== 0xFF){ i++; continue; }
    const m = dv.getUint8(i + 1);
    if(m === 0xFF){ i++; continue; }
    if(m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)){ i += 2; continue; }
    const len = dv.getUint16(i + 2);
    if(m === 0xE1 && !exif) exif = parseExif(dv, i + 4, len - 2, out);
    else if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC){ if(i + 9 <= dv.byteLength){ out.h = dv.getUint16(i + 5); out.w = dv.getUint16(i + 7); } break; }
    else if(m === 0xDA) break;
    i += 2 + len;
  }
  if(out.o >= 5 && out.o <= 8){ const t = out.w; out.w = out.h; out.h = t; }
  return out;
}
function parseExif(dv, start, len, out){
  if(start + 14 > dv.byteLength || dv.getUint32(start) !== 0x45786966 || dv.getUint16(start + 4) !== 0) return false;
  const tiff = start + 6, le = dv.getUint16(tiff) === 0x4949, end = Math.min(dv.byteLength, start + len);
  const u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
  if(u16(tiff + 2) !== 42) return false;
  const ifd = (off, cb) => { const p = tiff + off; if(off <= 0 || p + 2 > end) return; const n = u16(p); for(let k = 0; k < n; k++){ const e = p + 2 + k * 12; if(e + 12 > end) break; cb(u16(e), u32(e + 4), e + 8); } };
  const str = (count, vo) => { const p = count > 4 ? tiff + u32(vo) : vo; let s = ""; for(let k = 0; k < count && p + k < end; k++){ const c = dv.getUint8(p + k); if(!c) break; s += String.fromCharCode(c); } return s; };
  let exifOff = 0, dt = "", dt0 = "", sub = "";
  ifd(u32(tiff + 4), (tag, count, vo) => { if(tag === 0x0112) out.o = u16(vo); else if(tag === 0x8769) exifOff = u32(vo); else if(tag === 0x0132) dt0 = str(count, vo); });
  if(exifOff) ifd(exifOff, (tag, count, vo) => { if(tag === 0x9003) dt = str(count, vo); else if(tag === 0x9291) sub = str(count, vo); });
  const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(dt || dt0);
  if(m) out.t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + (sub && /^\d+$/.test(sub.trim()) ? Math.round(parseFloat("0." + sub.trim()) * 1000) : 0);
  return true;
}

// 작은 사진 만들기: 일꾼(Worker) 여러 개가 나눠서 (안 되는 브라우저는 화면에서 직접)
let WK = null, JOB = 0;
function workers(){
  if(WK) return WK;
  WK = [];
  const n = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 2));
  try {
    for(let i = 0; i < n; i++){
      const w = new Worker("worker.js"); w._q = new Map();
      w.onmessage = e => { const j = w._q.get(e.data.id); if(!j) return; w._q.delete(e.data.id); if(e.data.error === "nooffscreen"){ NO_WORKER = true; thumbMain(j.file).then(j.res); } else j.res(e.data.error ? null : e.data); };
      w.onerror = () => { NO_WORKER = true; for(const j of w._q.values()) thumbMain(j.file).then(j.res); w._q.clear(); };
      WK.push(w);
    }
  } catch (e) { WK = []; }
  if(!WK.length) WK = ["main"];
  return WK;
}
function thumbOne(w, p){
  const file = FILES.get(p.k);
  if(!file) return Promise.resolve(null);
  if(w === "main" || NO_WORKER) return thumbMain(file);
  return new Promise(res => { const id = ++JOB; w._q.set(id, { res, file }); w.postMessage({ id, file, max: THUMB, sw: p.w, sh: p.h }); });
}
async function thumbMain(file){
  try {
    let src;
    try { src = await createImageBitmap(file); } catch (e) { src = await loadImg(file); }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    const s = Math.min(1, THUMB / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * s)), h = Math.max(1, Math.round(h0 * s));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, w, h); if(src.close) src.close();
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.82));
    const sc = document.createElement("canvas"); sc.width = sc.height = 16;
    const sx = sc.getContext("2d", { willReadFrequently: true }); sx.drawImage(c, 0, 0, 16, 16);
    const d = sx.getImageData(0, 0, 16, 16).data, sig = new Uint8Array(768);
    for(let i = 0, j = 0; i < d.length; i += 4){ sig[j++] = d[i]; sig[j++] = d[i + 1]; sig[j++] = d[i + 2]; }
    return { blob, w, h, sig };
  } catch (e) { return null; }
}
function loadImg(file){ return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 2000); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u; }); }
async function makeThumbs(gen){
  const list = S.photos.slice(), done = new Uint8Array(list.length), batch = [], ws = workers();
  let next = 0, active = 0;
  await new Promise(resolve => {
    const pump = w => {
      if(gen !== LOAD.gen){ resolve(); return; }
      if(next >= list.length){ if(!active) resolve(); return; }
      const i = next++; active++;
      thumbOne(w, list[i]).then(r => {
        active--;
        if(gen === LOAD.gen){
          const p = list[i];
          if(r && r.blob){ TH.set(p.k, { url: URL.createObjectURL(r.blob), blob: r.blob, w: r.w, h: r.h, sig: r.sig }); if(!p.w){ p.w = r.w; p.h = r.h; } batch.push([p.k, { b: r.blob, w: r.w, h: r.h, sig: r.sig }]); }
          else { p.bad = 1; LOAD.bad++; }
          done[i] = 1; LOAD.done++;
          while(LOAD.ready < list.length && done[LOAD.ready]) LOAD.ready++;
          if(batch.length >= 40) flushThumbs(batch.splice(0));
          progress();
        }
        pump(w);
      });
    };
    ws.forEach(pump);
  });
  if(gen !== LOAD.gen) return;
  flushThumbs(batch.splice(0));
  LOAD.running = false;
  progress(true);
  if(LOAD.bad) toast(f(T.errBad, { n: LOAD.bad }), 4500);
}
let progT = 0;
function progress(final){
  const now = performance.now();
  if(!final && now - progT < 300) return;
  progT = now;
  if(!S.edited) S.groups = autoGroups(S.photos.slice(0, LOAD.ready));
  refresh();
  if(final) save();
  updLoad();
  if(CUR === "groups") renderGroups(true);
  else if(CUR === "p1" && (final || !$(".pane"))) renderP1();
  else updSteps();
}

// ===== 화면 공통 =====
function go(screen){
  closeOverlays();
  if(screen === "cover"){ CUR = "cover"; render(); return; }
  CUR = screen;
  if(["groups", "p1", "p2", "p3", "send"].includes(screen)) S.pos.screen = screen;
  resetView(true);
  if(S.photos.length) refresh();   // 화면을 옮길 때마다 숫자를 새로 세요
  render(); save();
  window.scrollTo(0, 0);
}
function render(){
  document.body.classList.toggle("touch", isPhone());
  if(CUR === "soon") return renderSoon();
  if(CUR === "cover" || !S.photos.length) return renderCover();
  if(!STATS) refresh();
  ({ target: renderTarget, groups: renderGroups, p1: renderP1, p2: renderP2, p3: renderP3, send: renderSend })[CUR]();
}
function stepsHTML(){
  const st = STATS, n3 = st.finals.length;
  const steps = [["groups", T.stepGroups, num(S.groups.length)], ["p1", T.step1, num(st.hearts)], ["p2", T.step2, num(st.fin.size)], ["p3", T.step3, S.target.sel ? `${n3}/${S.target.sel}` : num(n3)], ["send", T.stepSend, ""]];
  return steps.map(([k, l, c]) => `<button class="step${CUR === k ? " on" : ""}" data-go="${k}">${esc(l)}${c !== "" ? `<span class="sc">${c}</span>` : ""}</button>`).join("");
}
function updSteps(){ const n = $("#steps"); if(n) n.innerHTML = stepsHTML(); }
function loadChip(){ return `<span class="lchip" id="lchip"${LOAD.running ? "" : " hidden"}><i class="spin"></i>${esc(f(T.loading, { d: num(LOAD.done), n: num(LOAD.total) }))}</span>`; }
function updLoad(){ const c = $("#lchip"); if(!c) return; c.hidden = !LOAD.running; c.innerHTML = `<i class="spin"></i>${esc(f(T.loading, { d: num(LOAD.done), n: num(LOAD.total) }))}`; const t = $("#tload"); if(t){ t.hidden = !LOAD.running; t.querySelector("b").style.width = (LOAD.total ? LOAD.done / LOAD.total * 100 : 0) + "%"; t.querySelector("span").textContent = f(T.loading, { d: num(LOAD.done), n: num(LOAD.total) }); } }
function shell(inner, cls = ""){
  document.body.className = "one-body" + (isPhone() ? " touch" : "");
  app.className = "one";
  const noOrig = S.photos.length && !FILES.size && !LOAD.running;
  return `<div class="shell">
    <header class="hdr">
      <button class="logo" data-go="cover">${esc(T.name)}</button>
      <nav class="steps" id="steps" aria-label="${esc(T.ariaSteps)}">${stepsHTML()}</nav>
      <div class="hr">${loadChip()}${isPhone() ? "" : `<button class="hbtn" data-a="help">${kbd("?")}<span>${esc(T.helpBtn)}</span></button>`}<button class="hbtn dots" data-a="menu" aria-label="${esc(T.ariaMenu)}">⋯</button></div>
    </header>
    ${noOrig ? `<div class="warnbar">${esc(T.noOrig)} <button class="b small" data-a="reconnect">${esc(T.noOrigBtn)}</button></div>` : ""}
    <main class="stage ${cls}" id="stage">${inner}</main>
  </div>`;
}
// 안내 한 줄: 폰에서는 키보드 설명 대신 버튼 설명 (T.○○Phone)
function tipHTML(id, text, phoneText){ if(isPhone() && phoneText) text = phoneText; return S.tips[id] ? "" : `<div class="tip" data-tip="${id}"><span>${esc(text)}</span><button class="x" data-a="tipx" data-id="${id}" aria-label="${esc(T.close)}">×</button></div>`; }
function thumbImg(k){ const t = TH.get(k); return t ? `<img src="${t.url}" alt="" loading="lazy" draggable="false">` : `<span class="ph"></span>`; }

// ===== 큰 사진 칸 (1차 · 2차 · 크게 보기) =====
// 작은 사진을 먼저 띄우고 원본이 풀리면 바꿔 끼워요. 확대는 VIEW를 같이 써서 두 칸이 같은 자리를 보여 줘요.
function paneHTML(k, cls = ""){ return `<div class="pane ${cls}" data-k="${esc(k)}"><img class="lo" alt="" draggable="false"><img class="hi" alt="" draggable="false"></div>`; }
function origUrl(k){ let u = URLS.get(k); if(!u){ const file = FILES.get(k); if(!file) return ""; u = URL.createObjectURL(file); URLS.set(k, u); } return u; }
function fillPane(el, k){
  if(!el) return;
  if(k != null) el.dataset.k = k;
  k = el.dataset.k;
  const lo = el.querySelector(".lo"), hi = el.querySelector(".hi"), th = TH.get(k), p = P(k);
  el._w = (p && p.w) || (th && th.w) || 3; el._h = (p && p.h) || (th && th.h) || 2;
  if(th) lo.src = th.url; else lo.removeAttribute("src");
  hi.classList.remove("on"); hi.onload = null;
  const u = origUrl(k);
  if(u){
    hi.onload = () => { if(el.dataset.k !== k) return; if(hi.naturalWidth){ el._w = hi.naturalWidth; el._h = hi.naturalHeight; } hi.classList.add("on"); layoutPane(el); };
    if(hi.getAttribute("src") !== u) hi.src = u; else if(hi.complete) hi.onload();
  } else hi.removeAttribute("src");
  el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  layoutPane(el);
}
function layoutPane(el){
  const PW = el.clientWidth, PH = el.clientHeight; if(!PW || !PH) return;
  const a = el._w / el._h; let w, h;
  if(PW / PH > a){ h = PH; w = PH * a; } else { w = PW; h = PW / a; }
  const W = w * VIEW.z, H = h * VIEW.z;
  let left = VIEW.ax * PW - VIEW.fx * W, top = VIEW.ay * PH - VIEW.fy * H;
  left = W <= PW ? (PW - W) / 2 : clamp(left, PW - W, 0);
  top = H <= PH ? (PH - H) / 2 : clamp(top, PH - H, 0);
  el._r = { left, top, W, H };
  for(const img of el.querySelectorAll("img")){ img.style.width = W + "px"; img.style.height = H + "px"; img.style.transform = `translate(${left}px,${top}px)`; }
  el.classList.toggle("zoomed", VIEW.z > 1);
}
function layoutAll(){ $$(".pane").forEach(layoutPane); }
function resetView(silent){ VIEW = { z: 1, fx: 0.5, fy: 0.5, ax: 0.5, ay: 0.5 }; if(!silent){ layoutAll(); zoomLabels(); } }
function zoomAt(el, ax, ay, z){
  if(el && el._r && el._r.W){ VIEW.fx = clamp((ax * el.clientWidth - el._r.left) / el._r.W, 0, 1); VIEW.fy = clamp((ay * el.clientHeight - el._r.top) / el._r.H, 0, 1); }
  VIEW.ax = ax; VIEW.ay = ay; VIEW.z = z; layoutAll(); zoomLabels();
}
function toggleZoom(){
  if(VIEW.z > 1){ resetView(); return; }
  if(PTR && PTR.el && document.body.contains(PTR.el)) zoomAt(PTR.el, PTR.x, PTR.y, 2.5);
  else { VIEW = { z: 2.5, fx: 0.5, fy: 0.36, ax: 0.5, ay: 0.5 }; layoutAll(); zoomLabels(); }
}
function zoomLabels(){ $$(".zl").forEach(s => { s.textContent = VIEW.z > 1 ? T.zoomOff : s.dataset.on || T.zoom; }); }
function panBy(el, dx, dy){
  const r = el._r; if(!r) return;
  const PW = el.clientWidth, PH = el.clientHeight;
  const left = r.W <= PW ? (PW - r.W) / 2 : clamp(r.left + dx, PW - r.W, 0);
  const top = r.H <= PH ? (PH - r.H) / 2 : clamp(r.top + dy, PH - r.H, 0);
  VIEW.fx = (VIEW.ax * PW - left) / r.W; VIEW.fy = (VIEW.ay * PH - top) / r.H; layoutAll();
}
function bindPanes(root = document){
  for(const el of $$(".pane", root)){
    if(el._bound) continue; el._bound = true;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(); PTR = { el, x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; if(el._drag){ panBy(el, e.clientX - el._drag.x, e.clientY - el._drag.y); el._drag = { x: e.clientX, y: e.clientY }; } });
    el.addEventListener("pointerleave", () => { if(PTR && PTR.el === el) PTR = null; });
    el.addEventListener("pointerdown", e => { if(VIEW.z > 1 && e.button === 0){ el._drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); } });
    el.addEventListener("pointerup", () => { el._drag = null; });
    el.addEventListener("dblclick", e => { const b = el.getBoundingClientRect(); if(VIEW.z > 1) resetView(); else zoomAt(el, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, 2.5); });
    el.addEventListener("wheel", e => {
      if(e.ctrlKey || e.metaKey){
        e.preventDefault();
        const b = el.getBoundingClientRect(), z = clamp(VIEW.z * Math.exp(-e.deltaY * 0.01), 1, 8);
        if(z <= 1.01) resetView(); else zoomAt(el, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, z);
      } else if(VIEW.z > 1){ e.preventDefault(); panBy(el, -e.deltaX, -e.deltaY); }
    }, { passive: false });
  }
}
function prefetch(keys){
  for(const k of keys){
    if(!k || PRE.has(k)) continue;
    const u = origUrl(k); if(!u) continue;
    const im = new Image(); im.decoding = "async"; im.src = u; if(im.decode) im.decode().catch(() => {});
    PRE.set(k, im);
    while(PRE.size > 6) PRE.delete(PRE.keys().next().value);
  }
}
window.addEventListener("resize", () => { layoutAll(); if(CUR === "cover") render(); });

// ===== 첫 화면 =====
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
function miniKeys(){
  const rows = KEYROWS.filter(r => r[4]);
  return `<div class="kmini"><p class="kt">${esc(T.keysTitle)}</p>
    <table><thead><tr><th>${esc(T.helpDo)}</th><th class="${IS_MAC ? "now" : ""}">${esc(T.helpMac)}</th><th class="${IS_MAC ? "" : "now"}">${esc(T.helpWin)}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${r[0] === T.hCommon ? "" : `<small>${esc(r[0])}</small> `}${esc(r[1])}</td><td class="${IS_MAC ? "now" : ""}">${keyCell(r[2])}</td><td class="${IS_MAC ? "" : "now"}">${keyCell(r[3])}</td></tr>`).join("")}</tbody></table></div>`;
}
function keyCell(s){ return esc(s).replace(/\[\[(.+?)\]\]/g, "<kbd>$1</kbd>"); }
function gotBanner(){
  const g = GOT || (SAVED && SAVED.partner && !SAVED.partner.found ? SAVED.partner : null);
  return g ? `<div class="gotbar">${esc(f(T.gotBanner, { who: partnerWho(g) }))}</div>` : "";
}
function resumeCard(s){
  const tmp = S; S = s; reindex(); const st = stats(); S = tmp; reindex(); if(S.photos.length) refresh();
  return `<button class="resume" data-a="resume"><b>${esc(T.resumeTitle)} →</b><span>${esc(f(T.resumeMeta, { n: num(s.photos.length), h: num(st.hearts), f: num(st.fin.size), s: num(st.finals.length) }))}</span></button>`;
}
function renderCover(){
  CUR = "cover";
  document.body.className = "one-body cv-body" + (isPhone() ? " touch" : "");
  app.className = "one";
  const saved = S.photos.length ? S : SAVED;
  if(isPhone()) return renderPhone(saved);
  app.innerHTML = `
  <div class="cv">
    <div class="cv-top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${gotBanner()}
    <div class="cv-grid">
      <div class="cv-l">
        ${brandLogo()}
        <p class="cv-k">${esc(T.kicker)}</p>
        <h1>${nl(T.title)}</h1>
        <div class="cv-bar"></div>
        <p class="cv-lead">${esc(T.lead)}</p>
        ${saved ? resumeCard(saved) : ""}
        <div class="cv-btns">
          <button class="b ${saved ? "ghost" : "main"} big" data-a="pickFolder">${esc(saved ? T.newStart : T.pickFolder)}</button>
          <button class="b ghost big" data-a="sample">${esc(T.trySample)}</button>
        </div>
        <button class="tlink" data-a="pickFiles">${esc(T.pickFiles)}</button>
        <p class="cv-drop">${esc(T.dropHint)}</p>
        <ul class="cv-notes"><li>${esc(T.notePrivacy)}</li><li>${esc(T.noteZip)}</li><li>${esc(T.noteBoth)}</li></ul>
      </div>
      <div class="cv-r">
        <div class="demo" id="demo"></div>
        ${miniKeys()}
      </div>
    </div>
    ${foot()}
  </div>
  <div class="dropveil" id="dropveil"><span>${esc(T.dropNow)}</span></div>`;
  demoMount(false);
}
function renderPhone(saved){
  app.innerHTML = `
  <div class="cv phone">
    <div class="cv-top"><span>${esc(T.name)}</span><span>${esc(T.phoneTop)}</span></div>
    ${gotBanner()}
    ${brandLogo()}
    <p class="cv-k">${esc(T.kicker)}</p>
    <h1>${nl(T.title)}</h1>
    <div class="cv-bar"></div>
    <p class="cv-lead">${esc(T.lead)}</p>
    <div class="demo" id="demo"></div>
    <div class="pbox">
      <h2>${esc(T.phoneBoxTitle)}</h2>
      <p>${esc(T.phoneBoxBody)}</p>
      <button class="b main" data-a="phoneShare">${esc(T.phoneShare)}</button>
      <button class="b ghost" data-a="phoneCopy">${esc(T.phoneCopy)}</button>
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${PHONE_MODE ? `<div class="pbox">
      <p class="note">${esc(T.phonePickNote)}</p>
      ${saved ? resumeCard(saved) : ""}
      <button class="b main" data-a="pickFiles">${esc(T.phonePick)}</button>
      <button class="b ghost" data-a="sample">${esc(T.trySample)}</button>
    </div>` : `<button class="tlink center" data-a="phoneAnyway">${esc(T.phoneAnyway)}</button>`}
    ${foot()}
  </div>`;
  demoMount(true);
}
// 첫 화면 체험: 샘플 사진 6장으로 "둘 중 하나"
async function demoMount(phone){
  const box = $("#demo"); if(!box) return;
  if(!DEMO){ box.innerHTML = `<div class="demo-wait"></div>`; DEMO = { urls: await SAMPLES.sampleUrls(2, 6, 960, 640), L: 0, R: 1, next: 2, done: false }; }
  const b = $("#demo"); if(!b) return;
  // 폰에서도 나란히 작게 (위아래로 놓으면 "노트북에서 해 주세요" 안내가 너무 아래로 밀려서)
  const d = DEMO, lab = [T.demoLeft, T.demoRight];
  b.className = "demo" + (phone ? " small" : "");
  b.innerHTML = `
    <div class="dh"><b>${esc(T.demoTitle)}</b><span class="tag">${esc(T.demoSampleTag)}</span></div>
    <p class="ds">${esc(phone ? T.demoSubPhone : T.demoSub)}</p>
    ${d.done ? `<div class="dwin"><img src="${d.urls[d.L]}" alt=""><p>${esc(T.demoDone)}</p><button class="b ghost small" data-a="demoAgain">${esc(T.demoAgain)}</button></div>`
      : `<div class="dpair"><div class="dimg" id="dL"><img src="${d.urls[d.L]}" alt=""></div><div class="dimg" id="dR"><img src="${d.urls[d.R]}" alt=""></div></div>
      <div class="dbtns"><button class="b ghost" data-a="demoL">${phone ? "" : kbd("←") + " "}${esc(lab[0])}</button><button class="b ghost" data-a="demoR">${esc(lab[1])}${phone ? "" : " " + kbd("→")}</button></div>`}`;
}
function demoPick(side){
  const d = DEMO; if(!d || d.done) return;
  if(d.next >= d.urls.length){ if(side === "R") d.L = d.R; d.done = true; }
  else if(side === "L") d.R = d.next++; else d.L = d.next++;
  demoMount(isPhone());
  const el = $(side === "L" ? "#dR" : "#dL"); if(el){ el.classList.add("swap"); }
}
function keyCover(e, code){
  if(code === "ArrowLeft"){ e.preventDefault(); demoPick("L"); return true; }
  if(code === "ArrowRight"){ e.preventDefault(); demoPick("R"); return true; }
  return false;
}
async function resume(){
  const s = SAVED; if(!s) return;
  S = Object.assign(blank(), s); SAVED = null; reindex();
  for(const t of TH.values()) URL.revokeObjectURL(t.url);
  TH.clear();
  try { const all = await DB.all("thumb"); for(const [k, v] of all) TH.set(k, { url: URL.createObjectURL(v.b), blob: v.b, w: v.w, h: v.h, sig: v.sig }); } catch (e) {}
  if(!GOT){ try { const g = await DB.get("kv", "got"); if(g) GOT = g; } catch (e) {} }
  if(GOT) attachPartner();
  refresh();
  if(S.sample){ const list = await SAMPLES.makeSamples(); reattach(list.map(x => new File([x.blob], x.name, { type: "image/jpeg" })), true); }
  else {
    try {
      const h = await DB.get("kv", "dir");
      if(h){ DIRH = h; if(h.queryPermission && await h.queryPermission({ mode: "read" }) === "granted") reattach((await filesFromHandle(h, h.name + "/")).map(x => x.file), true); }
    } catch (e) {}
  }
  go(S.pos.screen || "groups");
}
async function startSample(){
  const list = await SAMPLES.makeSamples();
  startLoad(list.map(x => ({ file: new File([x.blob], x.name, { type: "image/jpeg" }), path: x.name, t: x.t, w: x.w, h: x.h })), { sample: true });
}
function confirmNew(then){
  if(!S.photos.length && !SAVED){ then(); return; }
  sheet({ title: T.newTitle, body: T.newBody, yes: T.newYes, no: T.cancel, onYes: then });
}

// ===== 몇 장 골라야 해요? =====
function renderTarget(){
  app.innerHTML = shell(`
    <div class="card target">
      <h1>${esc(T.targetTitle)}</h1>
      <p class="lead2">${esc(T.targetLead)}</p>
      ${[["sel", T.targetSel, T.targetSelSub], ["frame", T.targetFrame, T.targetFrameSub]].map(([k, l, sub]) => `
      <div class="trow"><div><b>${esc(l)}</b><span>${esc(sub)}</span></div>
        <div class="stepper"><button class="b small" data-a="tminus" data-t="${k}" aria-label="−">−</button><input id="t-${k}" type="number" inputmode="numeric" min="0" max="999" value="${S.target[k] || ""}" placeholder="0"><span>${esc(T.unit)}</span><button class="b small" data-a="tplus" data-t="${k}" aria-label="+">+</button></div></div>`).join("")}
      <div class="tbtns"><button class="b main big" data-a="tnext">${esc(T.targetNext)}</button><button class="b ghost big" data-a="tskip">${esc(T.targetSkip)}</button></div>
      <div class="tload" id="tload"${LOAD.running ? "" : " hidden"}><span>${esc(f(T.loading, { d: num(LOAD.done), n: num(LOAD.total) }))}</span><i><b style="width:${LOAD.total ? LOAD.done / LOAD.total * 100 : 0}%"></b></i></div>
    </div>`, "scroll");
  bindPanes();
  const i = $("#t-sel"); if(i && !isPhone()) i.focus();
  for(const k of ["sel", "frame"]) $("#t-" + k).addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); targetSave(); } });
}
function targetSave(){
  const v = k => clamp(parseInt($("#t-" + k).value, 10) || 0, 0, 999);
  const sel = v("sel"), frame = v("frame");
  if(sel !== S.target.sel || frame !== S.target.frame) act(T.aTarget, () => { S.target = { sel, frame }; });
  go(S.pos.screen === "target" ? "groups" : (S.pos.screen || "groups"));
}

// ===== 묶음 =====
function renderGroups(keepScroll){
  const st = $("#stage"), sy = st ? st.scrollTop : 0;
  const busy = LOAD.running, gs = S.groups;
  const noTime = S.photos.some(p => p.t == null) && S.sortBy === "name";
  const hasTime = S.photos.some(p => p.t != null);
  app.innerHTML = shell(`
    <div class="gwrap">
      <div class="ghd">
        <div><h1>${esc(T.groupsTitle)}</h1><p class="lead2">${esc(T.groupsSub)}</p>
          ${noTime ? `<p class="note">${esc(T.groupsNoTime)}</p>` : ""}
          ${busy ? `<p class="note busy">${esc(f(T.groupsWait, { d: num(LOAD.done), n: num(LOAD.total) }))}</p>` : ""}</div>
        <div class="gctl">
          <span class="gstat">${esc(f(T.groupsStats, { g: num(gs.length), n: num(S.photos.length) }))}</span>
          <label class="slider"><span>${esc(T.groupsSize)}</span><small>${esc(T.groupsFiner)}</small><input type="range" id="lv" min="1" max="5" step="1" value="${S.level}" ${busy ? "disabled" : ""}><small>${esc(T.groupsCoarser)}</small></label>
          ${hasTime ? `<div class="seg"><span>${esc(T.groupsSort)}</span><button class="${S.sortBy === "time" ? "on" : ""}" data-a="sort" data-v="time" ${busy ? "disabled" : ""}>${esc(T.sortTime)}</button><button class="${S.sortBy === "name" ? "on" : ""}" data-a="sort" data-v="name" ${busy ? "disabled" : ""}>${esc(T.sortName)}</button></div>` : ""}
          <button class="b main" data-go="p1">${esc(T.groupsGo)} →</button>
        </div>
      </div>
      ${tipHTML("groups", f(T.groupsTip, { mod: IS_MAC ? "⌘" : "Ctrl" }), T.groupsTipPhone)}
      <div class="glist${busy ? " busy" : ""}" id="glist">${gs.map((g, gi) => groupRow(g, gi, busy)).join("")}</div>
    </div>
    <div class="selbar" id="selbar" hidden></div>`, "scroll");
  const stage = $("#stage"); if(keepScroll && stage) stage.scrollTop = sy;
  updSel();
  const lv = $("#lv"); if(lv) lv.addEventListener("change", () => regroup(+lv.value));
}
function groupRow(g, gi, busy){
  const p0 = P(g[0]), time = p0 && p0.t != null ? new Date(p0.t).toISOString().slice(11, 19) : "";
  const hearts = g.filter(k => S.heart[k]).length;
  return `<section class="grow" data-g="${gi}">
    <div class="gh"><b>${esc(f(T.groupHead, { i: gi + 1 }))}</b><span>${esc(f(T.groupCount, { n: g.length }))}</span>${hearts ? `<span class="hc">♥ ${hearts}</span>` : ""}${time ? `<span class="gt">${time}</span>` : ""}
      ${!busy && gi < S.groups.length - 1 ? `<button class="tlink small" data-a="merge" data-g="${gi}">${esc(T.groupMerge)} ↓</button>` : ""}</div>
    <div class="gth">${g.map(k => `<button class="th${SEL.set.has(k) ? " sel" : ""}${SEL.focus === k ? " focus" : ""}" data-gk="${esc(k)}" draggable="${busy ? "false" : "true"}" title="${esc(P(k).n)}">${thumbImg(k)}${S.heart[k] ? `<i class="hb">♥</i>` : ""}${pCode(k) ? `<i class="pd"></i>` : ""}</button>`).join("")}</div>
  </section>`;
}
function updSel(){
  const bar = $("#selbar"); if(!bar) return;
  $$(".th").forEach(t => { const k = t.dataset.gk; t.classList.toggle("sel", SEL.set.has(k)); t.classList.toggle("focus", SEL.focus === k); });
  const n = SEL.set.size;
  bar.hidden = !n || LOAD.running;
  if(n) bar.innerHTML = `<b>${esc(f(T.selCount, { n }))}</b>
    <button class="b small" data-a="selPrev">${kbd("[")} ${esc(T.selPrev)}</button>
    <button class="b small" data-a="selNext">${esc(T.selNext)} ${kbd("]")}</button>
    <button class="b small" data-a="selNew">${kbd("N")} ${esc(T.selNew)}</button>
    <button class="tlink small" data-a="selClear">${esc(T.selClear)} ${kbd(K.esc)}</button>`;
}
function flatKeys(){ return S.groups.flat(); }
function selectTo(k, e = {}){
  const fl = flatKeys();
  if(e.shiftKey && SEL.anchor){
    const a = fl.indexOf(SEL.anchor), b = fl.indexOf(k);
    SEL.set = new Set(fl.slice(Math.min(a, b), Math.max(a, b) + 1));
  } else if(e.metaKey || e.ctrlKey){
    if(SEL.set.has(k)) SEL.set.delete(k); else SEL.set.add(k);
    SEL.anchor = k;
  } else { SEL.set = new Set([k]); SEL.anchor = k; }
  SEL.focus = k; updSel();
  const el = $(`.th[data-gk="${CSS.escape(k)}"]`); if(el) el.scrollIntoView({ block: "nearest" });
}
function selKeys(){ return sortKeys([...SEL.set].filter(k => GIDX.has(k))); }
function moveKeys(keys, to){   // to: 묶음 번호 · -1이면 새 묶음
  if(!keys.length) return;
  act(to < 0 ? T.aNewGroup : T.aMove, () => {
    const ks = new Set(keys);
    let gs = S.groups.map(g => g.filter(k => !ks.has(k)));
    if(to >= 0) gs[to].push(...keys); else gs.push(keys.slice());
    gs = gs.filter(g => g.length).map(sortKeys);
    gs.sort((a, b) => P(a[0]).o - P(b[0]).o);
    S.groups = gs; S.edited = true;
  });
  renderGroups(true);
}
function selMove(dir){
  const ks = selKeys(); if(!ks.length || LOAD.running) return;
  const gis = ks.map(k => GIDX.get(k));
  if(dir < 0){ const t = Math.min(...gis) - 1; if(t < 0){ toast(T.firstGroup); return; } moveKeys(ks, t); }
  else { const t = Math.max(...gis) + 1; if(t >= S.groups.length){ toast(T.lastGroup); return; } moveKeys(ks, t); }
}
function regroup(level, sortBy){
  const apply = () => act(T.aRegroup, () => { if(level) S.level = level; if(sortBy && sortBy !== S.sortBy){ S.sortBy = sortBy; sortPhotos(); } S.groups = autoGroups(S.photos); S.edited = false; });
  if(S.edited) sheet({ title: T.regroupTitle, body: T.regroupBody, yes: T.regroupYes, no: T.regroupNo, onYes: () => { apply(); renderGroups(); }, onNo: () => renderGroups(true) });
  else { apply(); renderGroups(true); }
}
function keyGroups(e, code){
  if(LOAD.running) return false;
  const fl = flatKeys(); if(!fl.length) return false;
  const cur = SEL.focus && GIDX.has(SEL.focus) ? SEL.focus : null;
  const mv = k => { e.preventDefault(); if(e.shiftKey && SEL.anchor) selectTo(k, { shiftKey: true }); else selectTo(k); };
  if(code === "ArrowRight" || code === "ArrowLeft"){ const i = cur ? fl.indexOf(cur) : -1; mv(fl[clamp(i + (code === "ArrowRight" ? 1 : -1), 0, fl.length - 1)] || fl[0]); return true; }
  if(code === "ArrowDown" || code === "ArrowUp"){ const gi = cur ? GIDX.get(cur) : -1, t = clamp(gi + (code === "ArrowDown" ? 1 : -1), 0, S.groups.length - 1); mv(S.groups[t][0]); return true; }
  if(code === "BracketLeft"){ e.preventDefault(); selMove(-1); return true; }
  if(code === "BracketRight"){ e.preventDefault(); selMove(1); return true; }
  if(code === "KeyN"){ e.preventDefault(); const ks = selKeys(); if(ks.length) moveKeys(ks, -1); return true; }
  if(code === "Escape"){ SEL = { set: new Set(), anchor: null, focus: SEL.focus }; updSel(); return true; }
  if(code === "Enter" || code === "NumpadEnter"){ e.preventDefault(); go("p1"); return true; }
  return false;
}
// 묶음 사이 끌어다 놓기
document.addEventListener("dragstart", e => {
  const t = e.target.closest && e.target.closest(".th[data-gk]"); if(!t || LOAD.running) return;
  const k = t.dataset.gk;
  if(!SEL.set.has(k)) selectTo(k);
  DRAG = selKeys();
  e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/x-the-one", String(DRAG.length));
});
document.addEventListener("dragend", () => { DRAG = null; $$(".grow.over").forEach(r => r.classList.remove("over")); });

// ===== 1차 · 후보 =====
function flat1(){ return S.groups.flat(); }
function renderP1(){
  const list = flat1();
  if(!list.length){ app.innerHTML = shell(`<div class="empty"><p>${esc(f(T.p1Wait, { d: num(LOAD.done), n: num(LOAD.total) }))}</p></div>`, "scroll"); return; }
  if(!list.includes(S.pos.k1)) S.pos.k1 = list[0];
  app.innerHTML = shell(`
    <div class="p1">
      ${tipHTML("p1", T.p1Tip, T.p1TipPhone)}
      <div class="viewer" id="viewer">
        ${paneHTML(S.pos.k1)}
        <div class="chip tl" id="c1"></div>
        <div class="bigheart" id="bh">♥</div>
        <div class="vbad" id="vb"></div>
        <div class="fname" id="fn"></div>
      </div>
      <div class="acts">
        <button class="act" data-a="p1prev">${kbd("←")} ${esc(T.p1Prev)}</button>
        <button class="act heart" data-a="p1heart" id="hbtn"></button>
        <button class="act" data-a="p1next">${esc(T.p1Next)} ${kbd("→")}</button>
        <button class="act" data-a="zoom">${kbd("Z")} <span class="zl">${esc(T.zoom)}</span></button>
        <span class="count" id="h1"></span>
      </div>
      <div class="strip" id="strip"></div>
    </div>`, "fixed");
  bindPanes();
  updP1(true);
}
function updP1(fresh){
  const list = flat1(), k = S.pos.k1, gi = GIDX.get(k);
  if(gi == null) return;
  const g = S.groups[gi], on = !!S.heart[k], pane = $(".pane");
  if(pane && (fresh || pane.dataset.k !== k)) fillPane(pane, k);
  $("#c1").textContent = f(T.p1Chip, { g: gi + 1, G: S.groups.length, i: g.indexOf(k) + 1, n: g.length });
  $("#bh").classList.toggle("on", on);
  $("#vb").innerHTML = pBadge(k);
  $("#fn").textContent = P(k).n;
  const hb = $("#hbtn"); hb.classList.toggle("on", on); hb.innerHTML = `${kbd(K.space)} ♥ ${esc(on ? T.p1Unheart : T.p1Heart)}`;
  $("#h1").textContent = f(T.p1Count, { n: num(STATS.hearts) });
  const strip = $("#strip");
  if(strip.dataset.g !== String(gi) || fresh || strip.dataset.n !== String(g.length)){ strip.dataset.g = gi; strip.dataset.n = g.length; strip.innerHTML = g.map(x => `<button class="sth" data-k1="${esc(x)}">${thumbImg(x)}<i class="hb">♥</i>${pCode(x) ? `<i class="pd"></i>` : ""}</button>`).join(""); }
  $$(".sth", strip).forEach(b => { const x = b.dataset.k1; b.classList.toggle("on", x === k); b.classList.toggle("h", !!S.heart[x]); });
  const cur = $(".sth.on", strip); if(cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
  const i = list.indexOf(k);
  prefetch([list[i + 1], list[i + 2], list[i - 1]]);
  updSteps();
}
function nav1(d){
  const list = flat1(), i = list.indexOf(S.pos.k1), j = i + d;
  if(j >= list.length){ if(LOAD.running) toast(f(T.p1Wait, { d: num(LOAD.done), n: num(LOAD.total) })); else showEnd1(); return; }
  if(j < 0) return;
  closeEnd1(); S.pos.k1 = list[j]; updP1(); save();
}
function navGroup1(d){
  const gi = GIDX.get(S.pos.k1), t = gi + d;
  if(t < 0) return;
  if(t >= S.groups.length){ if(!LOAD.running) showEnd1(); return; }
  closeEnd1(); S.pos.k1 = S.groups[t][0]; updP1(); save();
}
function heart1(){
  const k = S.pos.k1, on = !S.heart[k];
  act(on ? T.aHeart : T.aUnheart, () => { if(on) S.heart[k] = 1; else delete S.heart[k]; });
  if(on){ const b = $("#bh"); if(b){ b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); } nav1(1); if(CUR === "p1" && !$("#end1")) return; }
  updP1();
}
function showEnd1(){
  if($("#end1")) return;
  const v = $("#viewer"); if(!v) return;
  v.insertAdjacentHTML("beforeend", `<div class="endp" id="end1"><b>${esc(f(T.p1EndTitle, { n: num(STATS.hearts) }))}</b>
    <div><button class="b main" data-go="p2">${esc(T.p1EndGo)} ${kbd(K.enter)}</button><button class="b ghost" data-a="end1x">${esc(T.p1EndStay)}</button></div></div>`);
  updP1();
}
function closeEnd1(){ const e = $("#end1"); if(e) e.remove(); }
function keyP1(e, code){
  switch(code){
    case "ArrowRight": e.preventDefault(); nav1(1); return true;
    case "ArrowLeft": e.preventDefault(); nav1(-1); return true;
    case "ArrowDown": e.preventDefault(); navGroup1(1); return true;
    case "ArrowUp": e.preventDefault(); navGroup1(-1); return true;
    case "Space": e.preventDefault(); if(!e.repeat) heart1(); return true;
    case "KeyZ": e.preventDefault(); toggleZoom(); return true;
    case "Escape": if(VIEW.z > 1) resetView(); else closeEnd1(); return true;
    case "Enter": case "NumpadEnter": if($("#end1")){ e.preventDefault(); go("p2"); return true; } return false;
  }
  return false;
}

// ===== 2차 · 최종 (둘 중 하나) =====
// 고른 쪽은 그 자리에 남고, 진 쪽 자리에 다음 후보가 올라와요. ↑ 둘 다 남기기 = 두 장 모두 최종에 넣고 계속 비교.
function cur2(){
  const list = STATS.groups2; if(!list.length) return null;
  let idx = list.findIndex(x => x.ck === S.pos.ck2);
  if(idx < 0){ idx = list.findIndex(x => !(x.st && x.st.done)); if(idx < 0) idx = 0; S.pos.ck2 = list[idx].ck; }
  const cur = list[idx];
  if(!cur.st){ cur.st = S.T[cur.ck] = { L: cur.c[0], R: cur.c[1], q: cur.c.slice(2), kept: [], done: false, win: [] }; save(); }
  return { list, idx, cur };
}
function renderP2(){
  const s = cur2(), phone = isPhone();
  if(!s){
    app.innerHTML = shell(`<div class="empty"><h2>${esc(T.p2NoneTitle)}</h2><p>${esc(T.p2NoneBody)}</p><div class="row"><button class="b ghost" data-go="p1">← ${esc(T.step1)}</button><button class="b main" data-go="p3">${esc(T.step3)} →</button></div></div>`, "scroll");
    return;
  }
  const { list, idx, cur } = s, st = cur.st;
  const allDone = list.every(x => x.st && x.st.done);
  const head = `<div class="p2top">
      <div class="p2h"><b>${esc(f(T.p2Head, { i: idx + 1, n: list.length, c: cur.c.length }))}</b>${st.done ? "" : `<span class="rem">${esc(f(T.p2Remain, { n: st.q.length + 1 }))}</span>`}</div>
      <div class="cands" id="cands">${candStrip(cur)}</div>
      <div class="gnav"><button class="b small" data-a="p2pg" ${idx ? "" : "disabled"}>‹ ${esc(T.p2PrevG)}</button><button class="b small" data-a="p2ng" ${idx < list.length - 1 ? "" : "disabled"}>${esc(T.p2NextG)} ›</button></div>
    </div>`;
  if(st.done){
    app.innerHTML = shell(`<div class="p2 done">
      ${allDone ? `<div class="alldone"><b>${esc(f(T.p2AllTitle, { n: num(STATS.fin.size) }))}</b>${STATS.single ? `<span>${esc(f(T.p2Single, { n: STATS.single }))}</span>` : ""}<button class="b main" data-go="p3">${esc(T.p2AllGo)} → ${kbd(K.enter)}</button></div>` : ""}
      ${head}
      <div class="wins"><h2>${esc(f(T.p2Done, { i: idx + 1, n: st.win.length }))} ✓</h2>
        <div class="wgrid">${st.win.map(k => `<figure>${thumbImg(k)}<figcaption>${esc(P(k).n)}</figcaption></figure>`).join("")}</div>
        <div class="row"><button class="b ghost" data-a="p2redo">${esc(T.p2Redo)}</button>${idx < list.length - 1 ? `<button class="b main" data-a="p2ng">${esc(T.p2NextG)} → ${allDone ? "" : kbd(K.enter)}</button>` : ""}</div>
      </div></div>`, "scroll");
    return;
  }
  app.innerHTML = shell(`<div class="p2">
      ${tipHTML("p2", T.p2Tip, T.p2TipPhone)}
      ${head}
      <div class="duo${phone ? " stack" : ""}">
        <div class="side">${paneHTML(st.L)}<div class="sideb"><button class="pickb" data-a="p2L">${phone ? "" : kbd("←") + " "}${esc(phone ? T.p2Up : T.p2Left)}</button><span class="fname2" id="nL">${esc(P(st.L).n)}</span><span id="bL">${pBadge(st.L)}</span></div></div>
        <div class="side">${paneHTML(st.R)}<div class="sideb"><button class="pickb" data-a="p2R">${esc(phone ? T.p2Down : T.p2Right)}${phone ? "" : " " + kbd("→")}</button><span class="fname2" id="nR">${esc(P(st.R).n)}</span><span id="bR">${pBadge(st.R)}</span></div></div>
      </div>
      <div class="acts">
        <button class="act" data-a="p2both">${kbd("↑")} ${esc(T.p2Both)}</button>
        <button class="act" data-a="zoom">${kbd("Z")} <span class="zl" data-on="${esc(T.p2ZoomBoth)}">${esc(VIEW.z > 1 ? T.zoomOff : T.p2ZoomBoth)}</span></button>
        <button class="act" data-a="undo">${kbd(K.undo)} ${esc(T.undoBtn)}</button>
      </div>
    </div>`, "fixed");
  bindPanes();
  const panes = $$(".pane");
  fillPane(panes[0], st.L); fillPane(panes[1], st.R);
  prefetch(st.q.slice(0, 2));
}
function candStrip(cur){
  const st = cur.st || {};
  return cur.c.map(k => {
    let cls = "", lab = "";
    if(st.done){ cls = st.win.includes(k) ? "win" : "out"; lab = st.win.includes(k) ? T.stWin : ""; }
    else if(k === st.L){ cls = "l"; lab = T.stL; }
    else if(k === st.R){ cls = "r"; lab = T.stR; }
    else if(st.kept && st.kept.includes(k)){ cls = "kept"; lab = T.stKept; }
    else if(st.q && st.q.includes(k)){ cls = "wait"; }
    else { cls = "out"; lab = T.stOut; }
    return `<span class="cd ${cls}">${thumbImg(k)}${lab ? `<i>${esc(lab)}</i>` : ""}</span>`;
  }).join("");
}
function pick2(side){
  const s = cur2(); if(!s || s.cur.st.done) return;
  const ck = s.cur.ck;
  act(side === "both" ? T.aBoth : T.aPick, () => {
    const st = S.T[ck];
    if(side === "both"){ for(const k of [st.L, st.R]) if(k && !st.kept.includes(k)) st.kept.push(k); st.R = st.q.shift() || null; }
    else if(side === "L") st.R = st.q.shift() || null;
    else st.L = st.q.shift() || null;
    if(!st.L || !st.R){ st.done = true; st.win = sortKeys(uniq([...st.kept, st.L || st.R].filter(Boolean))); }
  });
  const st = S.T[ck];
  if(st.done){
    toast(f(T.p2Done, { i: s.idx + 1, n: st.win.length }) + " ✓");
    const nx = STATS.groups2.findIndex((x, i) => i > s.idx && !(x.st && x.st.done));
    const any = nx >= 0 ? nx : STATS.groups2.findIndex(x => !(x.st && x.st.done));
    if(any >= 0){ S.pos.ck2 = STATS.groups2[any].ck; resetView(true); }
    renderP2(); return;
  }
  // 바뀐 칸만 다시 채워요
  const panes = $$(".pane");
  if(side === "R") fillPane(panes[0], st.L); else fillPane(panes[1], st.R);
  $("#nL").textContent = P(st.L).n; $("#nR").textContent = P(st.R).n;
  $("#bL").innerHTML = pBadge(st.L); $("#bR").innerHTML = pBadge(st.R);
  const s2 = cur2(); $("#cands").innerHTML = candStrip(s2.cur);
  const rem = $(".rem"); if(rem) rem.textContent = f(T.p2Remain, { n: st.q.length + 1 });
  prefetch(st.q.slice(0, 2));
  updSteps();
}
function navGroup2(d){
  const s = cur2(); if(!s) return;
  const t = s.idx + d; if(t < 0 || t >= s.list.length) return;
  S.pos.ck2 = s.list[t].ck; resetView(true); renderP2(); save();
}
function keyP2(e, code){
  const s = cur2(); if(!s) return false;
  if(s.cur.st.done){
    if(code === "Enter" || code === "NumpadEnter"){ e.preventDefault(); if(s.list.every(x => x.st && x.st.done)) go("p3"); else navGroup2(1); return true; }
    if(code === "ArrowRight"){ e.preventDefault(); navGroup2(1); return true; }
    if(code === "ArrowLeft"){ e.preventDefault(); navGroup2(-1); return true; }
    return false;
  }
  switch(code){
    case "ArrowLeft": e.preventDefault(); if(!e.repeat) pick2("L"); return true;
    case "ArrowRight": e.preventDefault(); if(!e.repeat) pick2("R"); return true;
    case "ArrowUp": e.preventDefault(); if(!e.repeat) pick2("both"); return true;
    case "KeyZ": e.preventDefault(); toggleZoom(); return true;
    case "Escape": resetView(); return true;
  }
  return false;
}

// ===== 3차 · 최최종 =====
function secs3(){
  const st = STATS, fset = st.fset, pb = pBestSet();
  const finals = st.finals;
  const partner = S.partner ? S.photos.filter(p => pb.has(p.k) && !fset.has(p.k) && !S.out[p.k]).map(p => p.k) : [];
  const ps = new Set(partner);
  const outs = S.photos.filter(p => st.fin.has(p.k) && S.out[p.k]).map(p => p.k);
  const drop = S.photos.filter(p => S.heart[p.k] && !st.fin.has(p.k) && !ps.has(p.k)).map(p => p.k);
  const out = [{ id: "final", title: T.p3SecFinal, keys: finals }];
  if(partner.length) out.push({ id: "partner", title: f(T.p3SecPartner, { who: partnerWho() }), keys: partner });
  if(outs.length) out.push({ id: "out", title: T.p3SecOut, keys: outs });
  if(drop.length) out.push({ id: "drop", title: T.p3SecDrop, keys: drop, fold: true });
  return out;
}
function visible3(){ return secs3().flatMap(s => (s.fold && !S.show.drop) ? [] : s.keys.map(k => ({ k, sec: s.id }))); }
function renderP3(){
  const st = STATS, n = st.finals.length, t = S.target.sel, ft = S.target.frame;
  const secs = secs3();
  const vis = visible3();
  if(!vis.some(v => v.k === S.pos.k3)) S.pos.k3 = vis.length ? vis[0].k : "";
  let state = "", stateCls = "";
  if(t){ if(n > t){ state = f(T.p3Over, { d: n - t }); stateCls = "over"; } else if(n < t){ state = f(T.p3Under, { d: t - n }); stateCls = "under"; } else { state = T.p3Ok + " ✓"; stateCls = "ok"; } }
  app.innerHTML = shell(`<div class="p3">
    <div class="p3h">
      <div class="cnt"><b>${esc(f(T.p3Count, { n: num(n) }))}</b>${t ? `<span class="tg">${esc(f(T.p3Target, { t }))}</span><span class="st ${stateCls}">${esc(state)}</span>` : ""}
        <button class="tlink small" data-go="target">${esc(t ? T.p3ChangeTarget : T.p3SetTarget)}</button></div>
      <div class="fr">${esc(ft ? f(T.p3Frame, { n: st.frames, t: ft }) : f(T.p3FrameNoT, { n: st.frames }))}</div>
      <button class="b main" data-go="send">${esc(T.p3Go)} →</button>
    </div>
    ${tipHTML("p3", T.p3Tip, T.p3TipPhone)}
    ${!n && secs.length === 1 ? `<div class="empty"><p>${esc(T.p3Empty)}</p><button class="b ghost" data-go="p2">← ${esc(T.step2)}</button></div>` : ""}
    ${secs.map(s => `<section class="sec3" data-sec="${s.id}">
      <h2>${esc(s.title)} <span>${num(s.keys.length)}</span>${s.fold ? `<button class="tlink small" data-a="fold">${esc(S.show.drop ? T.p3Hide : T.p3Show)}</button>` : ""}</h2>
      ${s.fold && !S.show.drop ? "" : s.keys.length ? `<div class="g3">${s.keys.map(k => item3(k, s.id)).join("")}</div>` : `<p class="note">${esc(T.p3Empty)}</p>`}
    </section>`).join("")}
  </div>`, "scroll");
  const fe = $(".it.focus"); if(fe) fe.scrollIntoView({ block: "nearest" });
}
function item3(k, sec){
  const fr = sec === "final" && S.frame[k];
  const btn = sec === "final" ? T.p3Remove : sec === "out" ? T.p3Back : T.p3Add;
  return `<div class="it${S.pos.k3 === k ? " focus" : ""}${fr ? " framed" : ""}" data-k3="${esc(k)}" data-sec="${sec}">
    <button class="im" data-a="lb" data-k="${esc(k)}">${thumbImg(k)}${fr ? `<i class="star">★</i>` : ""}</button>
    <div class="itb">${pBadge(k)}</div>
    <div class="itn">${esc(P(k).n)}</div>
    <div class="ita"><button class="b small" data-a="x3" data-k="${esc(k)}">${isPhone() ? "" : kbd("X") + " "}${esc(btn)}</button>${sec === "final" ? `<button class="b small${fr ? " on" : ""}" data-a="f3" data-k="${esc(k)}">${isPhone() ? "" : kbd("F") + " "}★ ${esc(T.p3FrameBtn)}</button>` : ""}</div>
  </div>`;
}
function secOf(k){ const v = visible3().find(x => x.k === k); return v ? v.sec : (STATS.fset.has(k) ? "final" : S.out[k] ? "out" : "drop"); }
function toggle3(k){
  const sec = secOf(k), same = visible3().filter(v => v.sec === sec), j = same.findIndex(v => v.k === k);
  const nx = j >= 0 ? (same[j + 1] || same[j - 1]) : null;
  const label = sec === "final" ? T.aRemove : sec === "out" ? T.aBack : T.aAdd;
  if(sec === "final") act(label, () => { S.out[k] = 1; });
  else if(sec === "out") act(label, () => { delete S.out[k]; });
  else act(label, () => { S.add[k] = 1; delete S.out[k]; });
  toast(`${label} ✓ · ${K.undo} ${T.undoBtn}`, 1600);
  // 같은 칸의 다음 사진으로 넘어가요 (X만 계속 눌러도 차례로 고를 수 있게)
  const to = nx ? nx.k : k;
  S.pos.k3 = to;
  if(LB){ LB.k = to; renderLB(); } else renderP3();
}
function frame3(k){
  if(secOf(k) !== "final") return;
  act(T.aFrame, () => { if(S.frame[k]) delete S.frame[k]; else S.frame[k] = 1; });
  if(LB) renderLB(); else renderP3();
}
function focus3(k){ S.pos.k3 = k; $$(".it").forEach(el => el.classList.toggle("focus", el.dataset.k3 === k)); const el = $(`.it[data-k3="${CSS.escape(k)}"]`); if(el) el.scrollIntoView({ block: "nearest" }); }
function cols3(sec){ const its = $$(`.sec3[data-sec="${sec}"] .it`); if(its.length < 2) return 1; const top = its[0].offsetTop; let c = 0; for(const it of its){ if(it.offsetTop !== top) break; c++; } return c || 1; }
function keyP3(e, code){
  if(LB) return keyLB(e, code);
  const vis = visible3(); if(!vis.length) return false;
  let i = vis.findIndex(v => v.k === S.pos.k3); if(i < 0) i = 0;
  const v = vis[i];
  switch(code){
    case "ArrowRight": e.preventDefault(); focus3(vis[Math.min(vis.length - 1, i + 1)].k); return true;
    case "ArrowLeft": e.preventDefault(); focus3(vis[Math.max(0, i - 1)].k); return true;
    case "ArrowDown": case "ArrowUp": {
      e.preventDefault();
      const c = cols3(v.sec), d = code === "ArrowDown" ? c : -c;
      focus3(vis[clamp(i + d, 0, vis.length - 1)].k); return true;
    }
    case "KeyX": case "Backspace": case "Delete": e.preventDefault(); if(!e.repeat) toggle3(v.k); return true;
    case "KeyF": e.preventDefault(); if(!e.repeat) frame3(v.k); return true;
    case "Enter": case "NumpadEnter": case "Space": e.preventDefault(); openLB(v.k); return true;
  }
  return false;
}
// 크게 보기 (3차)
function openLB(k){ LB = { k }; resetView(true); renderLB(); }
function closeLB(){ LB = null; const l = $("#lb"); if(l) l.remove(); resetView(true); renderP3(); }
function renderLB(){
  let l = $("#lb");
  if(!l){ l = document.createElement("div"); l.id = "lb"; l.className = "lb"; document.body.appendChild(l); }
  const vis = visible3();
  if(!vis.some(v => v.k === LB.k)){ if(!vis.length){ closeLB(); return; } LB.k = vis[0].k; }
  const k = LB.k, sec = secOf(k), i = vis.findIndex(v => v.k === k), fr = sec === "final" && S.frame[k];
  const btn = sec === "final" ? T.p3Remove : sec === "out" ? T.p3Back : T.p3Add;
  const secT = secs3().find(s => s.id === sec), same = vis.filter(v => v.sec === sec), j = same.findIndex(v => v.k === k);
  l.innerHTML = `<div class="lbh"><b>${esc(secT ? secT.title : "")} · ${j + 1} / ${same.length}</b><span>${esc(P(k).n)}</span>${pBadge(k)}<button class="b small" data-a="lbx">${esc(T.close)} ${kbd(K.esc)}</button></div>
    <div class="lbv">${paneHTML(k)}${fr ? `<i class="star big">★</i>` : ""}</div>
    <div class="acts"><button class="act" data-a="lbp">${kbd("←")}</button><button class="act" data-a="x3" data-k="${esc(k)}">${kbd("X")} ${esc(btn)}</button>${sec === "final" ? `<button class="act${fr ? " on" : ""}" data-a="f3" data-k="${esc(k)}">${kbd("F")} ★ ${esc(T.p3FrameBtn)}</button>` : ""}<button class="act" data-a="zoom">${kbd("Z")} <span class="zl">${esc(VIEW.z > 1 ? T.zoomOff : T.zoom)}</span></button><button class="act" data-a="lbn">${kbd("→")}</button></div>`;
  bindPanes(l);
  fillPane($(".pane", l), k);
  prefetch([vis[i + 1] && vis[i + 1].k, vis[i - 1] && vis[i - 1].k]);
  S.pos.k3 = k;
}
function lbStep(d){ const vis = visible3(), i = vis.findIndex(v => v.k === LB.k); const j = clamp(i + d, 0, vis.length - 1); if(j !== i){ LB.k = vis[j].k; renderLB(); } }
function keyLB(e, code){
  switch(code){
    case "ArrowRight": e.preventDefault(); lbStep(1); return true;
    case "ArrowLeft": e.preventDefault(); lbStep(-1); return true;
    case "KeyX": case "Backspace": case "Delete": e.preventDefault(); if(!e.repeat) toggle3(LB.k); return true;
    case "KeyF": e.preventDefault(); if(!e.repeat) frame3(LB.k); return true;
    case "KeyZ": e.preventDefault(); toggleZoom(); return true;
    case "Escape": case "Enter": case "NumpadEnter": case "Space": e.preventDefault(); if(VIEW.z > 1 && code === "Escape") resetView(); else closeLB(); return true;
  }
  return false;
}

// ===== 보내기 =====
function nameFor(k){
  const n = P(k).n, base = n.replace(/\.[^.]+$/, "");
  if(S.fmt.name === "noext") return base;
  if(S.fmt.name === "num"){ const m = base.match(/\d+/g); return m ? m[m.length - 1] : base; }
  return n;
}
function sendText(){
  const fin = STATS.finals, fr = fin.filter(k => S.frame[k]);
  const join = a => a.map(nameFor).join(S.fmt.sep === "lines" ? "\n" : ", ");
  const L = [];
  if(S.fmt.greet) L.push(T.msgHello, "");
  L.push(f(T.msgSel, { n: fin.length }), join(fin));
  if(fr.length) L.push("", f(T.msgFrame, { n: fr.length }), join(fr));
  if(S.fmt.greet) L.push("", T.msgBye);
  return L.join("\n");
}
function numClash(){ if(S.fmt.name !== "num") return false; const a = STATS.finals.map(nameFor); return new Set(a).size !== a.length; }
function renderSend(){
  const fin = STATS.finals, other = S.me === T.bride ? T.groom : S.me === T.groom ? T.bride : T.other;
  const chip = (k, v, l) => `<button class="chip2${S.fmt[k] === v ? " on" : ""}" data-a="fmt" data-k="${k}" data-v="${v}">${esc(l)}</button>`;
  app.innerHTML = shell(`<div class="send">
    <div class="sl card">
      <h1>${esc(T.sendTitle)}</h1>
      ${fin.length ? `
      <div class="chips">${chip("name", "name", T.sendName)}${chip("name", "noext", T.sendNoExt)}${chip("name", "num", T.sendNum)}<span class="sp"></span>${chip("sep", "comma", T.sendComma)}${chip("sep", "lines", T.sendLines)}<span class="sp"></span><button class="chip2${S.fmt.greet ? " on" : ""}" data-a="greet">${esc(T.sendGreet)}</button></div>
      ${numClash() ? `<p class="warn">${esc(T.sendClash)}</p>` : ""}
      <textarea id="msgtxt" readonly rows="${clamp(sendText().split("\n").length + 1, 8, 22)}">${esc(sendText())}</textarea>
      <div class="row"><button class="b main" data-a="copyTxt">${esc(T.sendCopy)}</button><button class="b ghost" data-a="saveTxt">${esc(T.sendTxt)}</button></div>
      <p class="msg" id="msg" role="status"></p>
      <p class="note">${esc(T.sendNote)}</p>` : `<p class="note">${esc(T.sendEmpty)}</p><button class="b ghost" data-go="p3">← ${esc(T.step3)}</button>`}
    </div>
    <div class="sr">
      ${fin.length ? `<div class="card"><h2>${esc(T.sheetTitle)}</h2><p>${esc(T.sheetBody)}</p><button class="b ghost" data-a="sheet">${esc(T.sheetBtn)}</button></div>` : ""}
      <div class="card"><h2>${esc(T.xlsxTitle)}</h2><p>${esc(T.xlsxBody)}</p><button class="b ghost" data-a="xlsx">${esc(T.xlsxBtn)}</button></div>
      <div class="card"><h2>${esc(f(T.partnerTitle, { other }))}</h2><p>${esc(T.partnerBody)}</p>
        <div class="chips"><span class="lab">${esc(T.partnerMe)}</span><button class="chip2${S.me === T.bride ? " on" : ""}" data-a="me" data-v="${esc(T.bride)}">${esc(T.bride)}</button><button class="chip2${S.me === T.groom ? " on" : ""}" data-a="me" data-v="${esc(T.groom)}">${esc(T.groom)}</button></div>
        <div class="row"><button class="b ghost" data-a="plink">${esc(T.partnerCopy)}</button>${navigator.share ? `<button class="b ghost" data-a="pshare">${esc(T.partnerShare)}</button>` : ""}</div>
        <p class="msg" id="pmsg" role="status"></p></div>
      ${S.partner ? `<div class="card"><h2>${esc(f(T.gotTitle, { who: partnerWho() }))}</h2><p>${esc(f(T.gotMeta, { d: S.partner.d || "", n: num(S.partner.found || 0) }))}</p><button class="tlink small" data-a="pclear">${esc(T.gotClear)}</button></div>` : ""}
      <div class="links">${siteLink("filmPlus", "b ghost", esc(T.linkFilm))}<a class="b ghost" href="${INSTA}" target="_blank" rel="noopener">${esc(T.linkInsta)}</a></div>
      ${sign()}
    </div>
  </div>`, "scroll");
}
function download(blob, name){
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
async function copyText(text, msgId, done){
  const m = $("#" + msgId);
  try { await navigator.clipboard.writeText(text); if(m) m.textContent = done; toast(done); }
  catch (e) { if(m) m.textContent = T.copyFail; const ta = $("#msgtxt"); if(ta){ ta.focus(); ta.select(); } }
}
async function saveSheet(){
  const keys = STATS.finals; if(!keys.length) return;
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  const cols = keys.length <= 12 ? 4 : keys.length <= 30 ? 5 : 6, W = 2400, pad = 70, gap = 26;
  const cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = cw * 0.74, cap = 44, head = 200, footH = 120;
  const rows = Math.ceil(keys.length / cols), H = head + rows * (ch + cap + gap) + footH;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), font = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  x.fillStyle = "#141414"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#FFFFFF"; x.font = `900 72px ${font}`; x.textBaseline = "alphabetic"; x.fillText(f(T.sheetHead, { n: keys.length }), pad, 118);
  x.fillStyle = "#F06292"; x.fillRect(pad, 146, 96, 9);
  x.fillStyle = "#A8A8A8"; x.font = `500 32px ${font}`; x.textAlign = "right"; x.fillText(todayStr() + (STATS.frames ? " · " + f(T.sheetFrame, { n: STATS.frames }) : ""), W - pad, 118); x.textAlign = "left";
  for(let i = 0; i < keys.length; i++){
    const k = keys[i], col = i % cols, row = Math.floor(i / cols), cx = pad + col * (cw + gap), cy = head + row * (ch + cap + gap);
    x.fillStyle = "#1F1F1F"; x.fillRect(cx, cy, cw, ch);
    const t = TH.get(k);
    if(t){ try { const bm = await createImageBitmap(t.blob); const s = Math.min(cw / bm.width, ch / bm.height), w = bm.width * s, h = bm.height * s; x.drawImage(bm, cx + (cw - w) / 2, cy + (ch - h) / 2, w, h); if(bm.close) bm.close(); } catch (e) {} }
    x.fillStyle = S.frame[k] ? "#E2C17A" : "#BDBDBD"; x.font = `500 26px ${font}`;
    x.fillText((S.frame[k] ? "★ " : "") + P(k).n, cx + 2, cy + ch + 34, cw - 4);
  }
  x.fillStyle = "#8A8A8A"; x.font = `700 28px ${font}`; x.fillText(T.sheetFoot, pad, H - 50);
  const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
  download(blob, f(T.fileSheet, { n: keys.length, d: todayStr() }));
  toast(T.saved);
  return blob;
}
function saveXlsx(){
  if(typeof window.xlsxBook !== "function") return;
  const st = STATS, who = S.partner ? partnerWho() : "";
  const head = T.xlsxCols.split(",").concat(who ? [who] : []);
  const rows = S.photos.map((p, i) => {
    const r = [i + 1, p.n, GIDX.has(p.k) ? GIDX.get(p.k) + 1 : "", S.heart[p.k] ? "♥" : "", st.fin.has(p.k) ? "✔" : "", st.fset.has(p.k) ? "✔" : "", st.fset.has(p.k) && S.frame[p.k] ? "★" : ""];
    if(who){ const c = pCode(p.k) & 3; r.push(["", "♥", T.step2, T.step3][c] || ""); }
    return r;
  });
  const blob = window.xlsxBook([{ name: T.xlsxSheet, title: f(T.xlsxHead, { name: T.name, d: todayStr(), n: st.finals.length }), note: T.xlsxNote, head, widths: [7, 30, 7, 9, 9, 11, 7].concat(who ? [12] : []), styles: [5, 4, 5, 5, 5, 5, 5].concat(who ? [5] : []), rows }]);
  download(blob, f(T.fileXlsx, { d: todayStr() }));
  toast(T.saved);
}

// ===== 창 (단축키 · 확인 · 메뉴) · 알림 =====
function toast(msg, ms = 2400){
  let t = $("#toast");
  if(!t){ t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), ms);
}
function overlay(id, html, cls = ""){
  closeOverlays();
  const o = document.createElement("div"); o.id = id; o.className = "ov " + cls; o.innerHTML = `<div class="ovc" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", e => { if(e.target === o) closeOverlays(); });
  document.body.appendChild(o); MODAL = id;
  return o;
}
function closeOverlays(){ for(const id of ["help", "sheet", "menu"]){ const o = $("#" + id); if(o) o.remove(); } MODAL = null; }
function sheet({ title, body, yes, no, onYes, onNo }){
  const o = overlay("sheet", `<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="row"><button class="b main" id="sy">${esc(yes)} ${kbd(K.enter)}</button><button class="b ghost" id="sn">${esc(no)}</button></div>`);
  o._yes = () => { closeOverlays(); onYes && onYes(); };
  o._no = () => { closeOverlays(); onNo && onNo(); };
  $("#sy").onclick = o._yes; $("#sn").onclick = o._no;
}
function openHelp(){
  if(MODAL === "help"){ closeOverlays(); return; }
  const groups = uniq(KEYROWS.map(r => r[0]));
  overlay("help", `<div class="hh"><h2>${esc(T.helpTitle)}</h2><button class="b small" data-a="close">${esc(T.close)} ${kbd(K.esc)}</button></div>
    ${isPhone() ? `<p class="note">${esc(T.helpPhone)}</p>` : ""}
    <table class="ktab"><thead><tr><th></th><th>${esc(T.helpDo)}</th><th class="${IS_MAC ? "now" : ""}">${esc(T.helpMac)}${IS_MAC ? `<small>${esc(T.helpNow)}</small>` : ""}</th><th class="${IS_MAC ? "" : "now"}">${esc(T.helpWin)}${IS_MAC ? "" : `<small>${esc(T.helpNow)}</small>`}</th></tr></thead>
    <tbody>${groups.map(g => KEYROWS.filter(r => r[0] === g).map((r, i) => `<tr${i ? "" : ` class="gfirst"`}><th>${i ? "" : esc(g)}</th><td>${esc(r[1])}</td><td class="${IS_MAC ? "now" : ""}">${keyCell(r[2])}</td><td class="${IS_MAC ? "" : "now"}">${keyCell(r[3])}</td></tr>`).join("")).join("")}</tbody></table>`, "wide");
}
function openMenu(){
  if(MODAL === "menu"){ closeOverlays(); return; }
  const noOrig = S.photos.length && !S.sample;
  overlay("menu", `<div class="mlist">
    <button data-a="m-target">${esc(T.menuTarget)}</button>
    ${noOrig ? `<button data-a="reconnect">${esc(T.menuReconnect)}</button>` : ""}
    <button data-go="cover">${esc(T.menuHome)}</button>
    <button class="danger" data-a="m-new">${esc(T.menuNew)}</button></div>`, "menu");
}
function modalKey(e){
  const o = $("#" + MODAL);
  if(e.code === "Escape"){ e.preventDefault(); if(o && o._no) o._no(); else closeOverlays(); return; }
  if((e.code === "Enter" || e.code === "NumpadEnter") && o && o._yes && !(e.target && e.target.tagName === "BUTTON")){ e.preventDefault(); o._yes(); return; }
  if(MODAL === "help" && (e.key === "?" || (e.code === "Slash" && e.shiftKey))){ e.preventDefault(); closeOverlays(); }
}

// ===== 키보드 =====
// 글자(ㅋ/z) 대신 키 자리(e.code)로 알아들어요 → 한/영 상태와 상관없어요
document.addEventListener("keydown", e => {
  const tg = e.target, tag = tg && tg.tagName;
  if(MODAL){ modalKey(e); return; }
  const typing = tag === "INPUT" && !["range", "button", "checkbox"].includes(tg.type) || tag === "TEXTAREA" || tag === "SELECT" || (tg && tg.isContentEditable);
  if(typing){ if(e.code === "Escape") tg.blur(); return; }
  if((tag === "BUTTON" || tag === "A") && ["Space", "Enter", "NumpadEnter"].includes(e.code)) return;   // 포커스된 버튼은 브라우저가 눌러요
  const mod = e.metaKey || e.ctrlKey;
  if(mod && e.code === "KeyZ" && !e.shiftKey){ if(CUR === "cover" || CUR === "soon") return; e.preventDefault(); undo(); return; }
  if(mod || e.altKey) return;
  if(e.key === "?" || (e.code === "Slash" && e.shiftKey)){ e.preventDefault(); openHelp(); return; }
  const fn = { cover: keyCover, groups: keyGroups, p1: keyP1, p2: keyP2, p3: keyP3 }[CUR];
  if(fn) fn(e, e.code);
});

// ===== 누르기 (한곳에서 받아요) =====
const ACTIONS = {
  pickFolder: () => confirmNew(() => pickFolder("new")),
  pickFiles: () => confirmNew(() => pickFiles("new")),
  sample: () => confirmNew(startSample),
  resume: () => { if(S.photos.length) go(S.pos.screen || "groups"); else resume(); },
  reconnect: () => { closeOverlays(); reconnect(); },
  phoneAnyway: () => { PHONE_MODE = true; render(); },
  phoneCopy: () => copyText(pageUrl(), "msg", T.phoneCopied),
  phoneShare: async () => { const url = pageUrl(); if(navigator.share){ try { await navigator.share({ title: T.name, text: T.phoneShareText, url }); return; } catch (e) { if(e && e.name === "AbortError") return; } } copyText(url, "msg", T.phoneCopied); },
  demoL: () => demoPick("L"), demoR: () => demoPick("R"),
  demoAgain: () => { if(DEMO){ DEMO.L = 0; DEMO.R = 1; DEMO.next = 2; DEMO.done = false; } demoMount(isPhone()); },
  help: () => openHelp(), menu: () => openMenu(), close: () => closeOverlays(),
  "m-target": () => { closeOverlays(); go("target"); },
  "m-new": () => { closeOverlays(); sheet({ title: T.newTitle, body: T.newBody, yes: T.newYes, no: T.cancel, onYes: async () => { try { await DB.clear("thumb"); await DB.del("kv", "state"); await DB.del("kv", "dir"); } catch (e) {} for(const t of TH.values()) URL.revokeObjectURL(t.url); TH.clear(); FILES.clear(); URLS.clear(); LOAD.gen++; LOAD.running = false; S = blank(); SAVED = null; UNDO = []; go("cover"); } }); },
  tipx: el => { S.tips[el.dataset.id] = 1; save(); const t = el.closest(".tip"); if(t) t.remove(); layoutAll(); },
  tminus: el => { const i = $("#t-" + el.dataset.t); i.value = Math.max(0, (parseInt(i.value, 10) || 0) - 1); },
  tplus: el => { const i = $("#t-" + el.dataset.t); i.value = Math.min(999, (parseInt(i.value, 10) || 0) + 1); },
  tnext: () => targetSave(),
  tskip: () => go(S.pos.screen === "target" ? "groups" : (S.pos.screen || "groups")),
  sort: el => { if(el.dataset.v !== S.sortBy) regroup(0, el.dataset.v); },
  merge: el => { const gi = +el.dataset.g; act(T.aMerge, () => { S.groups[gi] = sortKeys(S.groups[gi].concat(S.groups[gi + 1])); S.groups.splice(gi + 1, 1); S.edited = true; }); renderGroups(true); },
  selPrev: () => selMove(-1), selNext: () => selMove(1), selNew: () => moveKeys(selKeys(), -1),
  selClear: () => { SEL = { set: new Set(), anchor: null, focus: SEL.focus }; updSel(); },
  p1prev: () => nav1(-1), p1next: () => nav1(1), p1heart: () => heart1(), end1x: () => closeEnd1(),
  zoom: () => toggleZoom(), undo: () => undo(),
  p2L: () => pick2("L"), p2R: () => pick2("R"), p2both: () => pick2("both"),
  p2pg: () => navGroup2(-1), p2ng: () => navGroup2(1),
  p2redo: () => { const s = cur2(); if(!s) return; act(T.aRedo, () => { delete S.T[s.cur.ck]; }); renderP2(); },
  x3: el => toggle3(el.dataset.k), f3: el => frame3(el.dataset.k),
  lb: el => { focus3(el.dataset.k); openLB(el.dataset.k); },
  lbx: () => closeLB(), lbp: () => lbStep(-1), lbn: () => lbStep(1),
  fold: () => { S.show.drop = !S.show.drop; save(); renderP3(); },
  fmt: el => { S.fmt[el.dataset.k] = el.dataset.v; save(); renderSend(); },
  greet: () => { S.fmt.greet = !S.fmt.greet; save(); renderSend(); },
  copyTxt: () => copyText(sendText(), "msg", T.sendCopied),
  saveTxt: () => { download(new Blob(["﻿" + sendText().replace(/\n/g, "\r\n")], { type: "text/plain;charset=utf-8" }), f(T.fileTxt, { n: STATS.finals.length, d: todayStr() })); toast(T.saved); },
  sheet: () => saveSheet(), xlsx: () => saveXlsx(),
  me: el => { S.me = el.dataset.v; save(); renderSend(); },
  plink: async () => copyText(await partnerLink(), "pmsg", T.partnerCopied),
  pshare: async () => { const url = await partnerLink(); try { await navigator.share({ title: T.name, text: T.partnerText, url }); } catch (e) { if(!(e && e.name === "AbortError")) copyText(url, "pmsg", T.partnerCopied); } },
  pclear: () => { S.partner = null; refresh(); save(); renderSend(); }
};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-a],[data-go],[data-gk],[data-k1],[data-k3]");
  if(!el) return;
  if(el.tagName === "BUTTON" && e.detail > 0) el.blur();   // 마우스로 누른 뒤 Space가 그 버튼을 또 누르지 않게
  if(el.dataset.a){ const fn = ACTIONS[el.dataset.a]; if(fn){ e.preventDefault(); fn(el, e); } return; }
  if(el.dataset.go){ e.preventDefault(); if(el.dataset.go === "cover"){ closeOverlays(); CUR = "cover"; render(); } else go(el.dataset.go); return; }
  if(el.dataset.gk){ if(!LOAD.running) selectTo(el.dataset.gk, e); return; }
  if(el.dataset.k1){ closeEnd1(); S.pos.k1 = el.dataset.k1; updP1(); save(); return; }
  if(el.dataset.k3 && !e.target.closest("button")) focus3(el.dataset.k3);
});
// 묶음 줄에 사진 놓기
document.addEventListener("dragover", e => {
  const types = e.dataTransfer ? [...e.dataTransfer.types] : [];
  if(DRAG && types.includes("text/x-the-one")){ const row = e.target.closest && e.target.closest(".grow"); if(row){ e.preventDefault(); $$(".grow.over").forEach(r => { if(r !== row) r.classList.remove("over"); }); row.classList.add("over"); } return; }
  if(types.includes("Files")){ e.preventDefault(); if(CUR === "cover"){ const v = $("#dropveil"); if(v) v.classList.add("on"); } else e.dataTransfer.dropEffect = "none"; }
});
document.addEventListener("dragleave", e => { if(CUR === "cover" && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= innerWidth || e.clientY >= innerHeight)){ const v = $("#dropveil"); if(v) v.classList.remove("on"); } });
document.addEventListener("drop", e => {
  if(DRAG){ const row = e.target.closest && e.target.closest(".grow"); e.preventDefault(); const keys = DRAG; DRAG = null; if(row) moveKeys(keys, +row.dataset.g); return; }
  if(!e.dataTransfer) return;
  e.preventDefault();
  if(CUR !== "cover") return;   // 사진 폴더는 첫 화면에서 놓아요 (다른 화면에선 브라우저가 파일을 열지 않게만)
  const v = $("#dropveil"); if(v) v.classList.remove("on");
  // 놓인 목록은 기다리는 사이에 사라져요 → 먼저 다 꺼내 둬요
  const items = [...(e.dataTransfer.items || [])].filter(i => i.kind === "file");
  const hp = items.length === 1 && items[0].getAsFileSystemHandle ? items[0].getAsFileSystemHandle() : null;
  const entries = items.map(i => i.webkitGetAsEntry ? i.webkitGetAsEntry() : null).filter(Boolean);
  const plain = [...e.dataTransfer.files];
  confirmNew(async () => {
    if(hp){ try { const h = await hp; if(h && h.kind === "directory"){ startLoad(await filesFromHandle(h, h.name + "/"), { handle: h }); return; } } catch (err) {} }
    if(entries.length){ const out = []; for(const en of entries) await walkEntry(en, "", out); startLoad(out); return; }
    startLoad(plain.map(file => ({ file, path: file.name })));
  });
});

// ===== 시작 =====
function inputs(){
  const a = document.createElement("input"); a.type = "file"; a.id = "pick-dir"; a.multiple = true; a.webkitdirectory = true; a.hidden = true;
  const b = document.createElement("input"); b.type = "file"; b.id = "pick-files"; b.multiple = true; b.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"; b.hidden = true;
  for(const i of [a, b]){
    i.addEventListener("change", () => { const list = [...i.files].map(file => ({ file, path: file.webkitRelativePath || file.name })); i.value = ""; if(list.length) startLoad(list, { reattach: PICK_MODE === "reattach" }); });
    document.body.appendChild(i);
  }
}
async function boot(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ renderSoon(); return; }
  inputs();
  await readPartnerHash();
  try {
    const st = await DB.get("kv", "state");
    if(st && st.v === 1 && st.photos && st.photos.length) SAVED = st;
    if(!GOT){ const g = await DB.get("kv", "got"); if(g) GOT = g; }
  } catch (e) { STORE_OK = false; }
  CUR = "cover"; render();
}
// 시험용 손잡이 (자동 시험에서만 써요)
window.__one = { get S(){ return S; }, get STATS(){ return STATS; }, get LOAD(){ return LOAD; }, get CUR(){ return CUR; }, get VIEW(){ return VIEW; }, get FILES(){ return FILES; }, get TH(){ return TH; }, startLoad, startSample, go, sendText, partnerLink, saveSheet, autoGroups };
boot();
