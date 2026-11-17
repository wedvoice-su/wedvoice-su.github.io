// 본식 스냅 요청서 ㊴: 여섯 칸(예식 · 촬영 범위 · 꼭 찍을 사람 · 식순 · 원판 순서 · 장면)을 고르고 적으면 → 작가님께 보낼 요청서(이미지 · PDF) + 카톡 글 + 사회자 · 가족 대표용 원판 순서표
// 기획 docs/스냅-요청서/기획.md · 조사 docs/스냅-요청서/조사/조사.md · 문구와 목록 text.js · 예시 그림 samples.js(수정 요청서에서 복사) · 공통 shared/common.js
// 적은 내용과 사진은 이 기기(브라우저) 밖으로 보내지 않아요. 이 브라우저 저장소(IndexedDB)에만 남겨요.
// 사회자 한마디 상자는 넣지 않아요 — 사진 촬영은 사회자 영역이 아니라서 (사회자님 기준, 2026-11-03). 원판 순서표만 사회자에게 보내는 길을 둬요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/in-the-frame/?preview)
const OPEN = false;
// =========================================================

const DBN = "in-the-frame.v1";
const FLOW_KEY = "in-good-order.v2";   // 같은 폰의 식순표 (in-good-order/app.js KEY)
const FACE_PX = 480;        // 잘라 둔 얼굴 사진 한 변(px)
const REF_PX = 1600;        // 샘플 사진 긴 변(px)
const MAXREF = 6;           // 샘플 사진 수
const MAXPPL = 30;          // 꼭 찍을 사람 수 (넘치면 안 받아요)
const SHEET_W = 1240;       // 요청서 그림 너비(px)
const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
const PINK = "#C2185B";
// 칸 순서: 요청서의 중심인 "꼭 찍을 장면"이 맨 앞 (사회자님 11/17 "신랑신부의 어떤 샷을 꼭 찍어달라고 요청하는 거")
const SECS = ["shots", "info", "range", "flow", "wp", "people"];
const COUPLE_IDS = COUPLE.flatMap(g => g.items.map(x => x.id));
const MAXOWN = 20;

// ===== 상태 =====
let S = blank();
let REAL = null;            // 예시를 보는 동안 내 요청서를 잠시 맡겨 두는 곳
let EXM = false;            // 예시를 보는 중인지
let CUR = "cover", SEC = "";
let STORE_OK = true;
const IMG = new Map();      // 사진 키 → { blob, url }
let OUT = { gen: 0, pages: [], pdf: null, wp: null, busy: false };
let OPENP = -1;             // 펼친 사람 id
let EXURL = "";
let CROP = null;
let PICK = null;            // 파일 고르기가 끝나면 부를 함수
const FLMEMO = new WeakSet(); // 식순에서 "메모"를 눌러 칸을 연 순서

function blank(){
  return { v: 1, at: 0, seq: 1,
    info: { date: "", time: "", hall: "", g: "", gp: "", b: "", bp: "", cn: "", cr: "", cp: "" },
    range: { start: "", shop: "", shopAt: "", arrive: "", ends: [], party: [], partyNote: "", others: [], othersNote: "", wonpan: "" },
    people: [],
    flow: { items: FLOW.filter(x => x.base).map(x => ({ k: x.k, who: "", star: false })), touched: 0 },
    wp: { pre: "", groups: defaultGroups(""), touched: 0, bq: "", bqTo: "", ev: [], evNote: "", reps: { g: { n: "", p: "" }, b: { n: "", p: "" } } },
    shots: { couple: [], own: [], special: [], detail: [], room: [], spread: [], avoid: [], avoidNote: "", note: "" },
    refs: [] };
}
// 원판 기본 묶음: 가족 → 친척 → 친구 · 지인 (사회자님 11/17). 선원판을 하면 가족 묶음은 식 전(at: "pre")
function defaultGroups(pre){ return WP_DEFAULT.map((k, i) => ({ id: 1000 + i, k, title: "", names: "", at: pre === "yes" && FAMILY.includes(k) ? "pre" : "post" })); }
// 저장돼 있던 것을 지금 모양에 맞춰요 (칸이 늘어도 안 깨지게)
function clean(o){
  const b = blank();
  if(!o || typeof o !== "object") return b;
  const str = v => typeof v === "string" ? v : "";
  const arr = (v, ok) => Array.isArray(v) ? v.filter(x => typeof x === "string" && (!ok || ok.some(y => y.id === x))) : [];
  for(const k of Object.keys(b.info)) b.info[k] = str(o.info && o.info[k]);
  const r = o.range || {};
  for(const k of ["start", "shop", "shopAt", "arrive", "partyNote", "othersNote", "wonpan"]) b.range[k] = str(r[k]);
  b.range.ends = arr(r.ends, ENDS); b.range.party = arr(r.party, PARTY); b.range.others = arr(r.others, OTHERS);
  b.seq = Math.max(1, +o.seq || 1);
  b.people = (Array.isArray(o.people) ? o.people : []).filter(p => p && typeof p === "object").slice(0, MAXPPL).map(p => ({
    id: +p.id || b.seq++, name: str(p.name), rel: str(p.rel), side: p.side === "g" || p.side === "b" ? p.side : "",
    when: arr(p.when, WHEN), look: str(p.look), note: str(p.note), face: str(p.face) }));
  if(o.flow && Array.isArray(o.flow.items)){
    b.flow.items = o.flow.items.filter(it => it && (it.k === "x" ? str(it.title) : FLOW.some(x => x.k === it.k)))
      .map(it => it.k === "x" ? { k: "x", title: str(it.title), who: str(it.who), star: !!it.star } : { k: it.k, who: str(it.who), star: !!it.star });
    b.flow.touched = o.flow.touched ? 1 : 0;
  }
  const w = o.wp || {};
  b.wp.pre = w.pre === "yes" || w.pre === "no" ? w.pre : "";
  if(Array.isArray(w.groups)) b.wp.groups = w.groups.filter(g => g && (WP[g.k] || g.k === "x")).map(g => ({ id: +g.id || b.seq++, k: g.k, title: str(g.title), names: str(g.names), at: g.at === "pre" && b.wp.pre === "yes" ? "pre" : "post" }));
  b.wp.touched = w.touched ? 1 : 0;
  b.wp.bq = BQ.some(x => x.id === w.bq) ? w.bq : "";
  b.wp.bqTo = str(w.bqTo); b.wp.ev = arr(w.ev, EV); b.wp.evNote = str(w.evNote);
  for(const s of ["g", "b"]){ const rp = (w.reps && w.reps[s]) || {}; b.wp.reps[s] = { n: str(rp.n), p: str(rp.p) }; }
  const h = o.shots || {};
  b.shots = { couple: (Array.isArray(h.couple) ? h.couple : []).filter(x => COUPLE_IDS.includes(x)), own: (Array.isArray(h.own) ? h.own : []).map(str).filter(Boolean).slice(0, MAXOWN),
    special: arr(h.special, SPECIAL), detail: arr(h.detail, DETAIL), room: arr(h.room, ROOM), spread: arr(h.spread, SPREAD), avoid: arr(h.avoid, AVOID), avoidNote: str(h.avoidNote), note: str(h.note) };
  b.refs = (Array.isArray(o.refs) ? o.refs : []).filter(x => x && str(x.k)).slice(0, MAXREF).map(x => ({ id: +x.id || b.seq++, k: x.k, note: str(x.note) }));
  const ids = [...b.people, ...b.wp.groups, ...b.refs].map(x => x.id);
  b.seq = Math.max(b.seq, ...ids, 0) + 1;
  b.at = +o.at || 0;
  return b;
}

// ===== 작은 도구 =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function f(s, o = {}){ return String(s).replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m); }
function nl(s){ return esc(s).replace(/\n/g, "<br>"); }
function isTouch(){ return matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches; }
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseHM(t){ const m = /^(\d{1,2}):(\d{2})/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function korTime(t){ const m = parseHM(t); if(m == null) return ""; const h = Math.floor(m / 60), mm = m % 60; return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시${mm ? ` ${mm}분` : ""}`; }
function korDate(d, withYear){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if(!m) return "";
  const dt = new Date(+m[1], +m[2] - 1, +m[3]), w = "일월화수목금토"[dt.getDay()];
  return `${withYear ? m[1] + "년 " : ""}${+m[2]}월 ${+m[3]}일 (${w})`;
}
function lab(list, id){ const x = list.find(y => y.id === id); return x ? x.t : ""; }
function labs(list, ids){ return list.filter(x => ids.includes(x.id)).map(x => x.t); }
function getPath(p){ return p.split(".").reduce((o, k) => o == null ? o : o[k], S); }
function setPath(p, v){ const ks = p.split("."), last = ks.pop(); const o = ks.reduce((a, k) => a[k], S); if(o) o[last] = v; }
function flowTitle(it){ return it.k === "x" ? it.title : (FLOW.find(x => x.k === it.k) || {}).t || ""; }
function wpTitle(g){ return g.k === "x" ? (g.title.trim() || T.wpTitle) : WP[g.k]; }
const trimv = s => String(s || "").trim();

// ===== 칸이 채워졌는지 =====
function filled(id, st = S){
  const i = st.info, r = st.range, h = st.shots;
  if(id === "info") return !!(i.date || i.time || trimv(i.hall) || trimv(i.g) || trimv(i.b) || trimv(i.cn) || trimv(i.cp));
  if(id === "range") return !!(r.start || r.arrive || r.ends.length || r.others.length || trimv(r.othersNote) || r.wonpan);
  if(id === "people") return st.people.some(pOk) || guestFilled(st);
  if(id === "flow") return !!(st.flow.touched && st.flow.items.length);
  if(id === "wp") return wpFilled(st);
  if(id === "shots") return !!(h.couple.length || h.own.length || h.special.length || h.detail.length || st.refs.length);
  return false;
}
function guestFilled(st){ const h = st.shots; return !!(h.room.length || h.spread.length || h.avoid.length || trimv(h.avoidNote) || trimv(h.note)); }
function wpFilled(st){ const w = st.wp; return !!(w.touched && (w.groups.length || (w.bq && w.bq !== "none") || w.ev.length || trimv(w.evNote))); }
function wpEvRows(st){
  const w = st.wp, a = [];
  if(w.bq && w.bq !== "none") a.push([T.kBq, lab(BQ, w.bq) + (trimv(w.bqTo) ? " — " + f(T.vBqTo, { n: trimv(w.bqTo) }) : "")]);
  const ev = [...labs(EV, w.ev), trimv(w.evNote)].filter(Boolean);
  if(ev.length) a.push([T.kEv, ev.join(" · ")]);
  return a;
}
function nCouple(st = S){ return st.shots.couple.length + st.shots.own.length; }
function pOk(p){ return !!(trimv(p.name) || trimv(p.rel) || p.face); }
function nFilled(st = S){ return SECS.filter(id => filled(id, st)).length; }
function line(id){
  if(!filled(id)) return "";
  const i = S.info, r = S.range, h = S.shots;
  if(id === "info") return [korDate(i.date), korTime(i.time), trimv(i.hall)].filter(Boolean).join(" · ") || [trimv(i.g), trimv(i.b)].filter(Boolean).join(" · ") || T.sec.info.name;
  if(id === "range"){ const a = []; if(r.start) a.push(lab(START, r.start)); a.push(T.vEndBase + (r.ends.length ? " + " + labs(ENDS, r.ends).join(" · ") : "")); if(r.others.length) a.push(labs(OTHERS, r.others).join(" · ")); return a.join(" · "); }
  if(id === "people"){ const ps = S.people.filter(pOk), fc = ps.filter(p => p.face).length, a = []; if(ps.length) a.push(`하객 ${ps.length}명` + (fc ? " · " + f(T.pplFaceN, { n: fc }) : "")); if(guestFilled(S)) a.push("대기실 · 피할 것 적음"); return a.join(" · "); }
  if(id === "flow"){ const s = S.flow.items.filter(x => x.star).length; return `식순 ${S.flow.items.length}개` + (s ? ` · ★ ${s}개` : ""); }
  if(id === "wp"){ const g = S.wp.groups, a = []; if(S.wp.pre === "yes") a.push("선원판"); if(g.length) a.push(`${g.length}묶음`); if(S.wp.bq && S.wp.bq !== "none") a.push(lab(BQ, S.wp.bq)); a.push(...labs(EV, S.wp.ev)); return a.join(" · "); }
  if(id === "shots"){ const n = nCouple(), a = []; if(n) a.push(`장면 ${n}개`); const m = h.special.length + h.detail.length; if(m) a.push(`연출 · 소품 ${m}개`); if(S.refs.length) a.push(`샘플 ${S.refs.length}장`); return a.join(" · "); }
  return "";
}

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
function save(){ if(EXM) return; clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
async function saveNow(){
  if(EXM || !STORE_OK) return;
  S.at = Date.now();
  try { await DB.put("kv", "state", JSON.parse(JSON.stringify(S))); } catch (e) { storeFail(); }
}
function storeFail(){ if(STORE_OK){ STORE_OK = false; toast(T.noStore, 6000); } }
async function wipe(){
  for(const [k, v] of IMG){ if(!k.startsWith("ex-")){ URL.revokeObjectURL(v.url); IMG.delete(k); } }
  S = blank(); OPENP = -1; OUT.gen++;
  try { await DB.clear("kv"); await DB.clear("img"); } catch (e) {}
}

// ===== 사진 =====
function loadImg(src){ return new Promise((res, rej) => { const u = URL.createObjectURL(src), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 3000); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; im.src = u; }); }
async function decode(src){ try { return await createImageBitmap(src); } catch (e) { return loadImg(src); } }
function jpeg(c, q = 0.9){ return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", q)); }
function dims(bm){ return [bm.naturalWidth || bm.width, bm.naturalHeight || bm.height]; }
function scaled(bm, max){
  const [bw, bh] = dims(bm), s = Math.min(1, max / Math.max(bw, bh));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bw * s)); c.height = Math.max(1, Math.round(bh * s));
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = "high"; x.drawImage(bm, 0, 0, c.width, c.height);
  return c;
}
async function putImg(blob, key){
  const k = key || "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  IMG.set(k, { blob, url: URL.createObjectURL(blob) });
  // 저장소 쓰기는 기다리지 않아요 (화면이 바로 바뀌게). 실패하면 알림만.
  if(!EXM && !k.startsWith("ex-") && STORE_OK) DB.put("img", k, blob).catch(storeFail);
  return k;
}
async function delImg(k){
  if(!k || k.startsWith("ex-")) return;
  const v = IMG.get(k); if(v){ URL.revokeObjectURL(v.url); IMG.delete(k); }
  if(!EXM){ try { await DB.del("img", k); } catch (e) {} }
}
function imgUrl(k){ const v = IMG.get(k); return v ? v.url : ""; }
function pickFiles(multiple, fn){ const fi = $("#file"); fi.multiple = !!multiple; PICK = fn; fi.click(); }

// ===== 화면 바꾸기 =====
// 화면마다 방문 기록을 하나씩 넣어서, 폰의 뒤로 가기가 사이트를 나가지 않고 이전 화면으로 가요.
function go(sc, sec = ""){ try { history.pushState({ sc, sec }, ""); } catch (e) {} show(sc, sec); }
function show(sc, sec = ""){
  closeOverlays();
  toast("");
  if(sc === "cover" && EXM) exitExample();
  if(sc !== "out" && EXM) exitExample();
  CUR = sc; SEC = sec || "";
  render(); scrollTo(0, 0);
}
function render(){
  if(CUR === "soon") return renderSoon();
  if(CUR === "cover") return renderCover();
  if(CUR === "board") return renderBoard();
  if(CUR === "sec") return renderSec();
  if(CUR === "out") return renderOut();
}
function rerender(){ const y = scrollY; render(); scrollTo(0, y); }
function topBar(left, right = ""){ return `<header class="tb">${left}<span class="tb-sp"></span>${right}</header>`; }
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 016.8 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="7" width="10" height="7.2" rx="1.9" fill="currentColor"/></svg>';

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
  document.body.className = "is-cover sf-body";
  app.className = "wrap cover sf-cover";
  const n = nFilled();
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    ${n ? `<button class="resume" data-a="start"><b>${esc(T.resumeTitle)}</b><span>${esc(f(T.resumeMeta, { n }))}</span><i aria-hidden="true">→</i></button>` : ""}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${nl(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="btns">
      ${n ? "" : `<button class="btn insta" data-a="start">${esc(T.start)}</button>`}
      <button class="btn dark" data-a="example">${esc(T.example)}</button>
      ${n ? `<button class="tl cover-tl" data-a="new">${esc(T.newStart)}</button>` : ""}
    </div>
    <p class="trust">${LOCK}${esc(T.trust)}</p>
    <section class="ex">
      <div class="exh"><b>${esc(T.exTitle)}</b><span>${esc(T.exTag)}</span></div>
      <button class="exi" id="exi" data-a="example" aria-label="${esc(T.example)}">${EXURL ? `<img src="${EXURL}" alt="">` : ""}</button>
    </section>
    <ul class="notes">${T.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    ${foot()}`;
  if(!EXURL) makeCoverExample();
}
// 첫 화면 예시: 예시 요청서의 "꼭 찍어 주세요 — 사람" 한 장
async function makeCoverExample(){
  try {
    await exampleImages();
    const st = exampleState(), list = pagesOf(st);
    const pg = await renderPage(list[0], { head: T.shHead, page: f(T.shPage, { i: 1, n: list.length }), st, name: "ex" });
    EXURL = URL.createObjectURL(pg.blob);
    const box = $("#exi"); if(box) box.innerHTML = `<img src="${EXURL}" alt="">`;
  } catch (e) {}
}

// ===== 예시 =====
const AV = [
  { bg: "#F6DCE3", skin: "#EBC7A8", hair: "#B9B6B2", style: "bun", top: "#E58FA7", collar: "#FFFFFF" },
  { bg: "#DCEAF5", skin: "#F1D2B8", hair: "#2B211C", style: "long", top: "#9CC3E6", collar: "" },
  { bg: "#E4E8DA", skin: "#E6BE9C", hair: "#1C1A19", style: "short", top: "#283A5B", collar: "#FFFFFF" }
];
function drawFace(i){
  const a = AV[i % AV.length], W = 480, c = document.createElement("canvas"); c.width = W; c.height = W;
  const x = c.getContext("2d"), e = (cx, cy, rx, ry, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); };
  x.fillStyle = a.bg; x.fillRect(0, 0, W, W);
  if(a.style === "long"){ x.fillStyle = a.hair; x.beginPath(); x.ellipse(240, 250, 120, 170, 0, Math.PI, 0); x.lineTo(360, 420); x.lineTo(120, 420); x.closePath(); x.fill(); }
  e(240, 520, 190, 150, a.top);
  if(a.collar){ x.fillStyle = a.collar; x.beginPath(); x.moveTo(190, 380); x.lineTo(240, 450); x.lineTo(290, 380); x.lineTo(270, 372); x.lineTo(240, 418); x.lineTo(210, 372); x.closePath(); x.fill(); }
  x.fillStyle = a.skin; x.fillRect(214, 300, 52, 80);
  e(240, 230, 92, 112, a.skin);
  if(a.style === "bun"){ e(240, 150, 100, 62, a.hair); e(240, 96, 46, 40, a.hair); e(168, 210, 26, 60, a.hair); e(312, 210, 26, 60, a.hair); }
  else if(a.style === "long"){ e(240, 156, 104, 66, a.hair); e(160, 230, 30, 84, a.hair); e(320, 230, 30, 84, a.hair); }
  else { e(240, 150, 98, 56, a.hair); e(160, 190, 18, 40, a.hair); e(320, 190, 18, 40, a.hair); }
  x.fillStyle = "#2A2220"; e(205, 238, 9, 10, "#2A2220"); e(275, 238, 9, 10, "#2A2220");
  x.strokeStyle = "#B5705F"; x.lineWidth = 6; x.lineCap = "round"; x.beginPath(); x.arc(240, 270, 30, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  e(190, 268, 16, 10, "rgba(240,140,140,.35)"); e(290, 268, 16, 10, "rgba(240,140,140,.35)");
  return c;
}
let EXIMG = null;
async function exampleImages(){
  if(EXIMG) return EXIMG;
  EXIMG = (async () => {
    for(let i = 0; i < AV.length; i++) if(!IMG.has("ex-f" + i)) await putImg(await jpeg(drawFace(i), 0.9), "ex-f" + i);
    const sh = [[0, 2], [1, 0]];
    for(let i = 0; i < sh.length; i++){
      if(IMG.has("ex-r" + i)) continue;
      const c = document.createElement("canvas"); c.width = 1200; c.height = 900;
      if(window.SAMPLES) SAMPLES.drawSample(c.getContext("2d"), 1200, 900, sh[i][0], sh[i][1]);
      await putImg(await jpeg(c, 0.88), "ex-r" + i);
    }
  })();
  return EXIMG;
}
function exampleState(){
  const E = EXAMPLE, st = blank();
  Object.assign(st.info, E.info);
  st.range = JSON.parse(JSON.stringify(E.range));
  st.people = E.people.map((p, i) => ({ id: i + 1, name: p.name, rel: p.rel, side: p.side, when: p.when.slice(), look: p.look, note: p.note, face: "ex-f" + p.face }));
  st.flow = { items: E.flow.map(a => a[0] === "x" ? { k: "x", title: a[1], who: a[2] || "", star: !!a[3] } : { k: a[0], who: a[1] || "", star: !!a[2] }), touched: 1 };
  st.wp.pre = E.wp.pre;
  st.wp.groups = defaultGroups(E.wp.pre).map(g => Object.assign(g, { names: E.wp.names[g.k] || "" }));
  Object.assign(st.wp, { touched: 1, bq: E.wp.bq, bqTo: E.wp.bqTo, ev: E.wp.ev.slice(), evNote: E.wp.evNote, reps: JSON.parse(JSON.stringify(E.wp.reps)) });
  st.shots = JSON.parse(JSON.stringify(E.shots));
  st.refs = E.refs.map((r, i) => ({ id: 200 + i, k: "ex-r" + i, note: r.note }));
  st.seq = 300;
  return st;
}
async function startExample(){
  await exampleImages();
  if(!EXM){ saveNow(); REAL = S; S = exampleState(); EXM = true; }
  try { history.pushState({ sc: "out", sec: "", ex: 1 }, ""); } catch (e) {}
  CUR = "out"; SEC = ""; closeOverlays(); render(); scrollTo(0, 0);
}
function exitExample(){ if(!EXM) return; S = REAL || blank(); REAL = null; EXM = false; OUT.gen++; }

// ===== 칸 목록 =====
function renderBoard(){
  document.body.className = "sf-body";
  app.className = "sf board";
  const n = nFilled();
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="home">‹ 첫 화면</button>`, `<button class="tbb" data-a="menu" aria-label="메뉴">⋯</button>`)}
    <div class="pg">
      <h1 class="h">${nl(T.boardTitle)}</h1>
      <p class="sub">${esc(T.boardLead)}</p>
      <div class="cards">
        ${SECS.map((id, i) => { const ok = filled(id); return `
        <button class="scard${ok ? " on" : ""}${i ? "" : " main"}" data-a="sec" data-id="${id}">
          <span class="no">${ok ? CHECK : i + 1}</span>
          <span class="tx"><b>${esc(T.sec[id].name)}${i ? "" : ` <span class="tag">${esc(T.mainTag)}</span>`}</b><small>${esc(T.sec[id].sub)}</small><em>${esc(ok ? line(id) : T.empty)}</em></span>
          <i aria-hidden="true">›</i>
        </button>`; }).join("")}
      </div>
      <p class="trust2">${LOCK}${esc(T.trust)}</p>
    </div>
    <div class="dock"><div class="dock-in"><span class="meta">${esc(n ? f(T.dockN, { n }) : T.dockNone)}</span><button class="btn insta${n ? "" : " wait"}" data-a="out">${esc(T.seeOut)} →</button></div></div>`;
}

// ===== 칸 하나 =====
function chips(path, list, mode = "tog", re = false){
  const v = getPath(path);
  return `<div class="chips">${list.map(x => { const on = mode === "one" ? v === x.id : v.includes(x.id); return `<button class="chip${on ? " on" : ""}" data-a="${mode}" data-k="${path}" data-v="${x.id}"${re ? ' data-re="1"' : ""} aria-pressed="${on}">${esc(x.t)}</button>`; }).join("")}</div>`;
}
function inp(path, o = {}){
  const v = getPath(path) || "";
  const type = o.type || "text";
  return `<label class="nt${o.cls ? " " + o.cls : ""}">${o.label ? `<small>${esc(o.label)}</small>` : ""}${o.area
    ? `<textarea data-k="${path}" rows="${o.rows || 2}" placeholder="${esc(o.ph || "")}" maxlength="${o.max || 400}">${esc(v)}</textarea>`
    : `<input type="${type}" data-k="${path}" value="${esc(v)}" placeholder="${esc(o.ph || "")}" ${type === "tel" ? 'inputmode="tel" autocomplete="off"' : 'autocomplete="off"'} maxlength="${o.max || 80}"${o.id ? ` id="${o.id}"` : ""}>`}</label>`;
}
function hint(s, cls = ""){ return `<p class="hint3${cls ? " " + cls : ""}">${esc(s)}</p>`; }
function lbl(s){ return `<h3 class="lb3">${esc(s)}</h3>`; }

function renderSec(){
  const id = SEC, i = SECS.indexOf(id);
  if(i < 0){ CUR = "board"; return renderBoard(); }
  document.body.className = "sf-body";
  app.className = "sf sec sec-" + id;
  const next = SECS[i + 1];
  const body = { info: secInfo, range: secRange, people: secPeople, flow: secFlow, wp: secWp, shots: secShots }[id]();
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="board">‹ ${esc(T.back)}</button>`, `<span class="tb-name">${i + 1} / ${SECS.length}</span>`)}
    <div class="pg">
      <h1 class="h">${esc(T.sec[id].name)}</h1>
      ${body}
    </div>
    <div class="dock"><div class="dock-in">${next
      ? `<button class="btn insta" data-a="next">${esc(f(T.doneNext, { name: T.sec[next].name }))} →</button>`
      : `<button class="btn insta" data-a="out">${esc(T.seeOut)} →</button>`}</div></div>`;
}

// ① 예식 · 연락처
function flowStore(){
  try { const d = JSON.parse(localStorage.getItem(FLOW_KEY) || "null"); return d && Array.isArray(d.items) && d.items.length ? d : null; } catch (e) { return null; }
}
function secInfo(){
  const fs = flowStore(), fi = fs && fs.info, can = fi && (fi.date || fi.time || fi.venue || fi.groom || fi.bride);
  return `
    ${can ? `<button class="btn line sm imp" data-a="infoimp">${esc(T.fromFlow)}</button>` : ""}
    <div class="two">${inp("info.date", { label: T.infoDate, type: "date" })}${inp("info.time", { label: T.infoTime, type: "time" })}</div>
    ${inp("info.hall", { label: T.infoHall, ph: T.infoHallPh })}
    ${hint(T.infoHallHint)}
    <div class="two np">${inp("info.g", { label: T.infoG, max: 20 })}${inp("info.gp", { label: T.infoPhone, type: "tel", max: 20 })}</div>
    <div class="two np">${inp("info.b", { label: T.infoB, max: 20 })}${inp("info.bp", { label: T.infoPhone, type: "tel", max: 20 })}</div>
    <section class="sec2">
      ${lbl(T.infoContact)}
      ${hint(T.infoContactHint)}
      <div class="two np">${inp("info.cn", { label: T.infoCn, max: 20 })}${inp("info.cp", { label: T.infoCp, type: "tel", max: 20 })}</div>
      ${inp("info.cr", { label: T.infoCr, ph: T.infoCrPh, max: 30 })}
    </section>`;
}
// ② 촬영 범위
function secRange(){
  const r = S.range;
  return `
    ${lbl(T.rgStart)}${chips("range.start", START, "one", true)}${hint(T.rgStartHint)}
    ${r.start === "shop" ? `<div class="sub2">${inp("range.shop", { label: T.rgShop, ph: T.rgShopPh, max: 40 })}${inp("range.shopAt", { label: T.rgShopAt, type: "time", cls: "half" })}${hint(T.rgShopAtHint)}</div>` : ""}
    ${lbl(T.rgArrive)}${inp("range.arrive", { type: "time", cls: "half" })}${hint(T.rgArriveHint)}
    ${lbl(T.rgEnd)}${chips("range.ends", ENDS, "tog", true)}${hint(T.rgEndHint)}
    ${r.ends.includes("party") ? `<div class="sub2"><p class="lb4">${esc(T.rgParty)}</p>${chips("range.party", PARTY)}${inp("range.partyNote", { ph: T.rgPartyPh, max: 80 })}</div>` : ""}
    ${lbl(T.rgOthers)}${chips("range.others", OTHERS)}${inp("range.othersNote", { ph: T.rgOthersPh, max: 120 })}${hint(T.rgOthersHint)}
    ${lbl(T.rgWonpan)}${chips("range.wonpan", WONPAN, "one")}${hint(T.rgWonpanHint)}`;
}
// ⑥ 꼭 찍을 하객 · 피할 것
function faceHTML(p, cls = ""){
  const u = p.face && imgUrl(p.face);
  const ini = trimv(p.name).slice(-2) || "?";
  return `<span class="face${cls ? " " + cls : ""}${u ? " has" : ""}">${u ? `<img src="${u}" alt="">` : `<span>${esc(ini)}</span>`}</span>`;
}
function secPeople(){
  const list = S.people;
  return `
    <p class="sub">${esc(T.pplLead)}</p>
    <div class="ppl">
      ${list.length ? list.map((p, i) => OPENP === p.id ? personForm(p, i) : `
      <button class="prow" data-a="pexp" data-id="${p.id}">
        ${faceHTML(p, "sm")}
        <span class="tx"><b>${esc(trimv(p.name) || T.pplNoName)}</b><small>${esc([trimv(p.rel), p.side ? T.side[p.side] : ""].filter(Boolean).join(" · "))}</small></span>
        <i aria-hidden="true">${esc(T.edit)}</i>
      </button>`).join("") : `<p class="empty2">${esc(T.pplEmpty)}</p>`}
    </div>
    ${list.length < MAXPPL ? `<button class="btn line add" data-a="padd">${esc(T.pplAdd)}</button>` : ""}
    ${list.length >= 4 ? hint(T.pplFew, "warn2") : ""}
    ${lbl(T.shRoom)}${chips("shots.room", ROOM)}${hint(T.shRoomHint)}
    ${lbl(T.shSpread)}${chips("shots.spread", SPREAD)}${hint(T.shSpreadHint)}
    ${lbl(T.shAvoid)}${chips("shots.avoid", AVOID)}${inp("shots.avoidNote", { area: true, ph: T.shAvoidPh, rows: 2 })}${hint(T.shAvoidHint)}
    ${lbl(T.shNote)}${inp("shots.note", { area: true, ph: T.shNotePh, rows: 3 })}`;
}
function personForm(p, i){
  const base = `people.${i}`;
  return `
  <div class="pcard" id="pc${p.id}">
    <div class="pface">
      <button class="facebtn" data-a="face" data-i="${i}" aria-label="${esc(T.pplFaceAdd)}">${faceHTML(p, "lg")}</button>
      <div class="pfb">
        <button class="btn-s" data-a="face" data-i="${i}">${esc(p.face ? T.pplFaceChange : T.pplFaceAdd)}</button>
        ${p.face ? `<button class="btn-s gh" data-a="facedel" data-i="${i}">${esc(T.pplFaceDel)}</button>` : ""}
        <p class="hint3">${esc(T.pplFaceHint)}</p><p class="lock3">${LOCK}${esc(T.photoLock)}</p>
      </div>
    </div>
    <div class="two">${inp(base + ".name", { label: T.pplName, ph: T.pplNamePh, max: 20, id: "pname" })}${inp(base + ".rel", { label: T.pplRel, ph: T.pplRelPh, max: 30 })}</div>
    <div class="chips rels">${RELS.map(r => `<button class="chip sm" data-a="prel" data-i="${i}" data-v="${esc(r)}">${esc(r)}</button>`).join("")}</div>
    <p class="lb4">${esc(T.pplSide)}</p>${chips(base + ".side", [{ id: "g", t: T.side.g }, { id: "b", t: T.side.b }], "one")}
    <p class="lb4">${esc(T.pplWhen)}</p>${chips(base + ".when", WHEN)}
    ${inp(base + ".look", { label: T.pplLook, ph: T.pplLookPh, max: 60 })}
    ${hint(T.pplLookHint)}
    ${inp(base + ".note", { label: T.pplNote, ph: T.pplNotePh, max: 80 })}
    <div class="prow2"><button class="btn line sm" data-a="pclose">${esc(T.pplClose)}</button><button class="tl" data-a="pdel" data-i="${i}">${esc(T.pplDel)}</button></div>
  </div>`;
}
// ④ 식순 · 이벤트
function flowRows(){
  const rows = [], items = S.flow.items, inc = new Set(items.filter(x => x.k !== "x").map(x => x.k));
  const ci = k => FLOW.findIndex(x => x.k === k);
  let last = -1;
  items.forEach((it, idx) => {
    if(it.k !== "x"){ const c = ci(it.k); for(let j = last + 1; j < c; j++) if(!inc.has(FLOW[j].k)) rows.push({ out: FLOW[j] }); last = Math.max(last, c); }
    rows.push({ idx, it });
  });
  for(let j = last + 1; j < FLOW.length; j++) if(!inc.has(FLOW[j].k)) rows.push({ out: FLOW[j] });
  return rows;
}
function secFlow(){
  const fs = flowStore(), items = S.flow.items;
  let n = 0;
  return `
    <p class="sub">${esc(T.flLead)}</p>
    ${fs ? `<div class="impc"><p>${esc(T.flImportHint)}</p><button class="btn line sm" data-a="fimp">${esc(T.flImport)}</button></div>` : ""}
    ${items.length ? "" : hint(T.flEmpty, "warn2")}
    <ol class="fl">${flowRows().map(r => {
      if(r.out) return `<li class="fo"><span class="t">${esc(r.out.t)}</span><button class="chip sm" data-a="fin" data-k="${r.out.k}">${esc(T.flAddIn)}</button></li>`;
      const it = r.it, c = it.k === "x" ? {} : (FLOW.find(x => x.k === it.k) || {}), ph = c.ph || T.flWhoPh;
      // 누가가 중요한 순서(화촉점화 · 축가 등)만 칸을 바로 보여 주고, 나머지는 "메모" 버튼을 눌러야 칸이 열려요
      const showIn = !c.memo || trimv(it.who) || FLMEMO.has(it);
      n++;
      return `<li class="fi${it.star ? " star" : ""}${it.k === "x" ? " cx" : ""}${showIn ? "" : " slim"}">
        <div class="fh"><span class="n">${n}</span><span class="t">${esc(flowTitle(it))}</span>
          ${showIn ? "" : `<button class="chip sm mm" data-a="fmemo" data-i="${r.idx}">${esc(T.flMemo)}</button>`}
          <button class="chip sm st${it.star ? " on" : ""}" data-a="fstar" data-i="${r.idx}" aria-pressed="${it.star}">${esc(T.flStar)}</button>
          <button class="x" data-a="fout" data-i="${r.idx}" aria-label="${esc(T.flOut)}">✕</button></div>
        ${showIn ? `<input class="fw" data-k="flow.items.${r.idx}.who" value="${esc(it.who)}" placeholder="${esc(ph)}" maxlength="80" autocomplete="off">` : ""}
      </li>`;
    }).join("")}</ol>
    <section class="sec2">
      ${lbl(T.flCustom)}
      ${hint(T.flWhy)}
      <div class="chips">${T.flCustomEx.map(x => `<button class="chip sm" data-a="fcx" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <label class="nt"><input id="fct" placeholder="${esc(T.flCustomPh)}" maxlength="40" autocomplete="off"></label>
      <div class="frow"><label class="nt sel"><small>${esc(T.flCustomAfter)}</small><select id="fca">
        <option value="-1">${esc(T.flCustomFirst)}</option>
        ${items.map((it, i) => `<option value="${i}"${i === items.length - 1 ? " selected" : ""}>${i + 1}. ${esc(flowTitle(it))}</option>`).join("")}
      </select></label><button class="btn insta sm" data-a="fcadd">${esc(T.flCustomAdd)}</button></div>
    </section>`;
}
// ⑤ 원판 · 부케 — 기본 가족 → 친척 → 친구 · 지인, 선원판을 하면 가족 묶음은 "식 전" 목록으로 (사회자님 11/17)
function wpListHTML(at){
  const g = S.wp.groups, idx = g.map((x, i) => i).filter(i => !at || g[i].at === at);
  if(!idx.length) return `<p class="empty2">${esc(T.wpNone)}</p>`;
  return `<ol class="wpl">${idx.map((i, n) => { const x = g[i]; return `
    <li class="wpg">
      <div class="wh"><span class="n">${n + 1}</span>${x.k === "x"
        ? `<input class="wt" data-k="wp.groups.${i}.title" value="${esc(x.title)}" placeholder="${esc(T.wpCustomPh)}" maxlength="30" autocomplete="off" aria-label="${esc(T.wpTitle)}">`
        : `<span class="t">${esc(WP[x.k])}</span>`}
        <span class="mv"><button data-a="wup" data-i="${i}" aria-label="${esc(T.wpUp)}"${n ? "" : " disabled"}>↑</button><button data-a="wdown" data-i="${i}" aria-label="${esc(T.wpDown)}"${n < idx.length - 1 ? "" : " disabled"}>↓</button><button data-a="wdel" data-i="${i}" aria-label="${esc(T.wpDel)}">✕</button></span></div>
      <textarea class="wn" data-k="wp.groups.${i}.names" rows="2" maxlength="300" placeholder="${esc(WP_PH[x.k] || T.wpNamesPh)}" aria-label="${esc(T.wpNames)}">${esc(x.names)}</textarea>
    </li>`; }).join("")}</ol>`;
}
function secWp(){
  const w = S.wp, pre = w.pre === "yes";
  return `
    <p class="sub">${esc(T.wpLead)}</p>
    ${lbl(T.wpPre)}
    <div class="chips">${WPPRE.map(x => `<button class="chip${w.pre === x.id ? " on" : ""}" data-a="wppre" data-v="${x.id}" aria-pressed="${w.pre === x.id}">${esc(x.t)}</button>`).join("")}</div>
    ${hint(T.wpPreHint)}
    ${hint(T.wpNamesHint, "strong")}
    ${pre ? `<h4 class="wpl-h first">${esc(T.wpPreList)}</h4>${wpListHTML("pre")}<h4 class="wpl-h">${esc(T.wpPostList)}</h4>${wpListHTML("post")}` : wpListHTML("")}
    <button class="btn line add" data-a="wadd">${esc(T.wpAdd)}</button>
    <section class="sec2">
      ${lbl(T.wpEvTitle)}
      ${hint(T.wpEvHint)}
      <p class="lb4">${esc(T.wpBq)}</p>${chips("wp.bq", BQ, "one", true)}
      ${w.bq === "throw" || w.bq === "give" ? inp("wp.bqTo", { label: T.wpBqTo, ph: T.wpBqToPh, max: 30 }) : ""}
      <p class="lb4">${esc(T.wpEv)}</p>${chips("wp.ev", EV)}
      ${inp("wp.evNote", { ph: T.wpEvPh, max: 80 })}
    </section>
    <section class="sec2">
      ${lbl(T.wpReps)}
      ${hint(T.wpRepsHint)}
      ${["g", "b"].map(s => `<div class="two np">${inp(`wp.reps.${s}.n`, { label: f(T.wpRepName, { side: T.side[s] }), max: 20 })}${inp(`wp.reps.${s}.p`, { label: T.wpRepPhone, type: "tel", max: 20 })}</div>`).join("")}
    </section>`;
}
// ① 꼭 찍을 장면 — 신랑 · 신부 (요청서의 중심)
function secShots(){
  const refs = S.refs, own = S.shots.own;
  return `
    <p class="sub">${esc(T.shLead)}</p>
    ${hint(T.shCoupleHint)}
    ${COUPLE.map(g => `<p class="lb4 grp">${esc(g.g)}</p>${chips("shots.couple", g.items, "tog", true)}`).join("")}
    ${lbl(T.shOwn)}
    ${own.length ? `<ul class="own">${own.map((s, i) => `<li><span>${esc(s)}</span><button class="tl" data-a="owndel" data-i="${i}">${esc(T.shOwnDel)}</button></li>`).join("")}</ul>` : ""}
    ${own.length < MAXOWN ? `<div class="frow"><label class="nt"><input id="owt" placeholder="${esc(T.shOwnPh)}" maxlength="60" autocomplete="off"></label><button class="btn insta sm" data-a="ownadd">${esc(T.shOwnAdd)}</button></div>` : ""}
    ${nCouple() > 8 ? hint(T.shMany, "warn2") : ""}
    ${lbl(T.shSpecial)}${chips("shots.special", SPECIAL)}${hint(T.shSpecialHint)}
    ${lbl(T.shDetail)}${chips("shots.detail", DETAIL)}${hint(T.shDetailHint)}
    ${lbl(T.shRefs)}${hint(T.shRefsHint)}<p class="lock3">${LOCK}${esc(T.photoLock)}</p>
    <div class="refs">${refs.map((r, i) => `
      <div class="ref"><img src="${imgUrl(r.k)}" alt=""><input data-k="refs.${i}.note" value="${esc(r.note)}" placeholder="${esc(T.shRefNotePh)}" maxlength="60" autocomplete="off"><button class="tl" data-a="refdel" data-i="${i}">${esc(T.shRefDel)}</button></div>`).join("")}</div>
    ${refs.length < MAXREF ? `<button class="btn line add" data-a="refadd">${esc(T.shRefsAdd)}</button>` : hint(f(T.shRefsMax, { n: MAXREF }))}`;
}

// ===== 얼굴 자르기 =====
async function openCrop(file, i){
  overlay("crop", `<h2>${esc(T.cropTitle)}</h2><p>${esc(T.cropBusy)}</p>`, "crop");
  pushOv();
  let c;
  try { const bm = await decode(file); c = scaled(bm, 1400); if(bm.close) bm.close(); }
  catch (e) { closeOv(); toast(T.cropFail); return; }
  const [w, h] = [c.width, c.height];
  CROP = { c, w, h, i, cx: 0.5, cy: w > h ? 0.42 : 0.32, r: 0.2 };
  const o = $("#crop"); if(!o) return;
  o.querySelector(".ovc").innerHTML = `<h2>${esc(T.cropTitle)}</h2><p>${esc(T.cropLead)}</p>
    <div class="cropw"><div class="cropst" id="cst"><div class="ring" id="ring"></div></div></div>
    <label class="sz"><span>${esc(T.cropSize)}</span><input type="range" id="csz" min="6" max="50" step="1" value="${Math.round(CROP.r * 100)}"></label>
    <div class="orow"><button class="btn insta" data-a="cropok">${esc(T.cropOk)}</button><button class="btn ghost" data-a="close">${esc(T.cancel)}</button></div>`;
  c.className = "cropc"; $("#cst").prepend(c);
  placeRing();
  const st = $("#cst"); let down = false;
  const at = e => { const b = c.getBoundingClientRect(); CROP.cx = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)); CROP.cy = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)); placeRing(); };
  st.addEventListener("pointerdown", e => { down = true; try { st.setPointerCapture(e.pointerId); } catch (er) {} at(e); e.preventDefault(); });
  st.addEventListener("pointermove", e => { if(down) at(e); });
  st.addEventListener("pointerup", () => { down = false; });
  st.addEventListener("pointercancel", () => { down = false; });
  $("#csz").addEventListener("input", e => { CROP.r = +e.target.value / 100; placeRing(); });
}
function placeRing(){
  const ring = $("#ring"); if(!ring || !CROP) return;
  const { w, h, cx, cy, r } = CROP, R = r * Math.min(w, h);
  Object.assign(ring.style, { left: ((cx * w - R) / w * 100) + "%", top: ((cy * h - R) / h * 100) + "%", width: (2 * R / w * 100) + "%", height: (2 * R / h * 100) + "%" });
}
async function cropOk(){
  if(!CROP) return;
  const { c, w, h, cx, cy, r, i } = CROP, R = r * Math.min(w, h);
  const o = document.createElement("canvas"); o.width = FACE_PX; o.height = FACE_PX;
  const x = o.getContext("2d"); x.fillStyle = "#EEEEEE"; x.fillRect(0, 0, FACE_PX, FACE_PX); x.imageSmoothingQuality = "high";
  x.drawImage(c, cx * w - R, cy * h - R, 2 * R, 2 * R, 0, 0, FACE_PX, FACE_PX);
  const p = S.people[i]; CROP = null;
  if(!p){ closeOv(); return; }
  const old = p.face;
  p.face = await putImg(await jpeg(o, 0.9));
  if(old) delImg(old);
  save(); await closeOv(); rerender();
}

// ===== 요청서 그림 =====
let MCTX = null;
function mctx(){ if(!MCTX) MCTX = document.createElement("canvas").getContext("2d"); return MCTX; }
function wrap(x, text, maxW){
  const out = [];
  for(const para of String(text).split("\n")){
    let ln = "";
    for(const word of para.split(" ")){
      const t = ln ? ln + " " + word : word;
      if(x.measureText(t).width <= maxW){ ln = t; continue; }
      if(ln){ out.push(ln); ln = ""; }
      let w = word;
      while(x.measureText(w).width > maxW && w.length > 1){ let k = w.length - 1; while(k > 1 && x.measureText(w.slice(0, k)).width > maxW) k--; out.push(w.slice(0, k)); w = w.slice(k); }
      ln = w;
    }
    out.push(ln);
  }
  return out;
}
function fitText(x, text, maxW){ if(x.measureText(text).width <= maxW) return text; let t = text; while(t.length > 1 && x.measureText(t + "…").width > maxW) t = t.slice(0, -1); return t + "…"; }
async function fontsFor(text){
  if(!document.fonts || !document.fonts.load) return;
  const all = text + "0123456789 /·()→★•—:+";
  const job = Promise.all([500, 700, 900].map(w => document.fonts.load(`${w} 32px 'Noto Sans KR'`, all).catch(() => null)));
  await Promise.race([job, new Promise(r => setTimeout(r, 2500))]);
}
function rrect(x, l, t, w, h, r){ x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function subLine(st){
  const i = st.info, a = [];
  const nm = [trimv(i.g) && "신랑 " + trimv(i.g), trimv(i.b) && "신부 " + trimv(i.b)].filter(Boolean).join(" · ");
  if(nm) a.push(nm);
  const when = [korDate(i.date), korTime(i.time)].filter(Boolean).join(" ");
  if(when) a.push(when);
  if(trimv(i.hall)) a.push(trimv(i.hall));
  return a.join("  ·  ");
}
// 블록 높이 재기
const M = 64, CW = SHEET_W - M * 2, KW = 230;
function measure(b){
  const x = mctx();
  if(b.t === "h") return b.H = 92;
  if(b.t === "gap") return b.H = b.h;
  if(b.t === "sub") return b.H = 54;
  if(b.t === "kv"){ x.font = `500 32px ${FONT}`; b.lines = wrap(x, b.v, CW - KW); return b.H = b.lines.length * 46 + 18; }
  if(b.t === "li"){ x.font = `${b.bold ? 700 : 500} 32px ${FONT}`; b.lines = wrap(x, b.text, CW - 64); x.font = `500 28px ${FONT}`; b.subs = b.sub ? wrap(x, b.sub, CW - 64) : []; return b.H = b.lines.length * 46 + b.subs.length * 40 + 20; }
  if(b.t === "p"){ x.font = `500 ${b.sz || 30}px ${FONT}`; b.lines = wrap(x, b.text, CW); return b.H = b.lines.length * Math.round((b.sz || 30) * 1.45) + 12; }
  if(b.t === "person"){
    const tw = CW - 200; x.font = `500 28px ${FONT}`;
    b.rows = b.lines.map(([k, v]) => ({ k, v: wrap(x, v, tw - 150) }));
    x.font = `700 28px ${FONT}`; b.relL = b.rel ? wrap(x, b.rel, tw) : [];
    const th = 54 + b.relL.length * 40 + 8 + b.rows.reduce((a, r) => a + r.v.length * 40 + 4, 0);
    return b.H = Math.max(196, th + 20) + 26;
  }
  if(b.t === "wpg"){ x.font = `500 30px ${FONT}`; b.lines = b.names ? wrap(x, b.names, CW - 76) : []; return b.H = b.lines.length ? 56 + b.lines.length * 44 + 28 : 92; }
  if(b.t === "photos"){
    const cw = (CW - 28) / 2; b.rowsH = [];
    for(let r = 0; r < b.items.length; r += 2){
      let hh = 0;
      for(const it of b.items.slice(r, r + 2)){ const [iw, ih] = dims(it.img); it.h = Math.min(cw * ih / iw, 760); x.font = `500 28px ${FONT}`; it.lines = it.note ? wrap(x, it.note, cw - 50) : []; hh = Math.max(hh, it.h + 20 + Math.max(1, it.lines.length) * 40); }
      b.rowsH.push(hh + 30);
    }
    return b.H = b.rowsH.reduce((a, v) => a + v, 0);
  }
  return b.H = 0;
}
function badge(x, cx, cy, r, label, fill = PINK){
  x.fillStyle = fill; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#fff"; x.font = `900 ${Math.round(r * (String(label).length > 1 ? 0.95 : 1.15))}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, cx, cy + 1);
  x.textAlign = "left"; x.textBaseline = "alphabetic";
}
function drawBlock(x, b, y){
  if(b.t === "h"){
    x.fillStyle = PINK; x.fillRect(M, y + 34, 8, 36);
    x.fillStyle = "#161616"; x.font = `900 36px ${FONT}`; x.fillText(b.text, M + 24, y + 64);
    x.fillStyle = "#E4E4E4"; x.fillRect(M, y + 86, CW, 2);
  } else if(b.t === "sub"){
    x.fillStyle = PINK; x.font = `700 26px ${FONT}`; x.fillText(b.text, M, y + 40);
  } else if(b.t === "kv"){
    x.fillStyle = "#7A7A7A"; x.font = `700 28px ${FONT}`; x.fillText(b.k, M, y + 38);
    x.fillStyle = b.dim ? "#9A9A9A" : "#161616"; x.font = `500 32px ${FONT}`;
    b.lines.forEach((ln, k) => x.fillText(ln, M + KW, y + 38 + k * 46));
  } else if(b.t === "li"){
    if(b.mark === "•"){ x.fillStyle = PINK; x.beginPath(); x.arc(M + 14, y + 27, 8, 0, Math.PI * 2); x.fill(); }
    else if(b.mark) badge(x, M + 22, y + 26, 22, b.mark, b.star ? PINK : "#9A9A9A");
    x.fillStyle = b.star ? PINK : "#161616"; x.font = `${b.bold || b.star ? 700 : 500} 32px ${FONT}`;
    b.lines.forEach((ln, k) => x.fillText(ln, M + 64, y + 38 + k * 46));
    x.fillStyle = "#5C5C5C"; x.font = `500 28px ${FONT}`;
    b.subs.forEach((ln, k) => x.fillText(ln, M + 64, y + 38 + b.lines.length * 46 + k * 40 - 4));
  } else if(b.t === "p"){
    const sz = b.sz || 30; x.fillStyle = b.grey ? "#7A7A7A" : "#161616"; x.font = `${b.bold ? 700 : 500} ${sz}px ${FONT}`;
    b.lines.forEach((ln, k) => x.fillText(ln, M, y + sz + 6 + k * Math.round(sz * 1.45)));
  } else if(b.t === "person"){
    const R = 84, cx = M + R, cy = y + R + 12;
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.closePath();
    if(b.img){ x.clip(); x.drawImage(b.img, cx - R, cy - R, 2 * R, 2 * R); }
    else { x.fillStyle = "#F1E3E8"; x.fill(); x.fillStyle = PINK; x.font = `900 46px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(trimv(b.name).slice(-2) || "?", cx, cy + 2); x.textAlign = "left"; x.textBaseline = "alphabetic"; }
    x.restore();
    if(b.n){ x.fillStyle = "#fff"; x.beginPath(); x.arc(cx - R + 16, cy - R + 16, 26, 0, Math.PI * 2); x.fill(); badge(x, cx - R + 16, cy - R + 16, 22, String(b.n)); }
    const tx = M + 200;
    x.fillStyle = "#161616"; x.font = `900 40px ${FONT}`; x.fillText(fitText(x, b.name || T.pplNoName, CW - 200), tx, y + 50);
    let yy = y + 50;
    x.fillStyle = PINK; x.font = `700 28px ${FONT}`; b.relL.forEach(ln => { yy += 40; x.fillText(ln, tx, yy); });
    yy += 8;
    for(const r of b.rows){ x.fillStyle = "#7A7A7A"; x.font = `700 26px ${FONT}`; x.fillText(r.k, tx, yy + 40); x.fillStyle = "#161616"; x.font = `500 28px ${FONT}`; r.v.forEach((ln, k) => x.fillText(ln, tx + 150, yy + 40 + k * 40)); yy += r.v.length * 40 + 4; }
    x.fillStyle = "#EEEEEE"; x.fillRect(M, y + b.H - 14, CW, 2);
  } else if(b.t === "wpg"){
    badge(x, M + 26, y + 34, 26, String(b.n));
    x.fillStyle = "#161616"; x.font = `900 34px ${FONT}`; x.fillText(fitText(x, b.title, CW - 76), M + 76, y + 46);
    x.fillStyle = "#161616"; x.font = `500 30px ${FONT}`; b.lines.forEach((ln, k) => x.fillText(ln, M + 76, y + 98 + k * 44));
    x.fillStyle = "#EEEEEE"; x.fillRect(M, y + b.H - 12, CW, 2);
  } else if(b.t === "photos"){
    const cw = (CW - 28) / 2; let yy = y;
    for(let r = 0, ri = 0; r < b.items.length; r += 2, ri++){
      b.items.slice(r, r + 2).forEach((it, k) => {
        const lx = M + k * (cw + 28), [iw] = dims(it.img), w = Math.min(cw, it.h * iw / dims(it.img)[1]);
        x.fillStyle = "#F1F1F1"; x.fillRect(lx, yy, cw, it.h);
        x.drawImage(it.img, lx + (cw - w) / 2, yy, w, it.h);
        badge(x, lx + 30, yy + 30, 22, String(it.n));
        x.fillStyle = "#161616"; x.font = `500 28px ${FONT}`;
        it.lines.forEach((ln, j) => x.fillText(ln, lx, yy + it.h + 46 + j * 40));
      });
      yy += b.rowsH[ri];
    }
  }
}
// 한 장 그리기: 맨 위(요청서 이름 · 쪽 · 제목 · 이름 줄) + 블록들
async function renderPage(pg, o){
  const st = o.st || S;
  for(const b of pg.blocks){
    if(b.t === "person" && b.face){ const v = IMG.get(b.face); if(v) try { b.img = await decode(v.blob); } catch (e) { b.img = null; } }
    if(b.t === "photos") for(const it of b.items){ const v = IMG.get(it.k); it.img = v ? await decode(v.blob) : null; }
    if(b.t === "photos") b.items = b.items.filter(it => it.img);
  }
  await fontsFor(JSON.stringify(pg) + subLine(st) + o.head + pg.title + T.pplNoName);
  const sub = subLine(st), top = sub ? 236 : 196;
  const H = top + 10 + pg.blocks.reduce((a, b) => a + measure(b), 0) + 50;
  const c = document.createElement("canvas"); c.width = SHEET_W; c.height = Math.ceil(H);
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, SHEET_W, c.height);
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillStyle = PINK; x.font = `700 28px ${FONT}`; x.fillText(o.head, M, 92);
  if(o.page){ x.fillStyle = "#8A8A8A"; x.font = `500 26px ${FONT}`; x.textAlign = "right"; x.fillText(o.page, SHEET_W - M, 92); x.textAlign = "left"; }
  x.fillStyle = "#161616"; x.font = `900 52px ${FONT}`; x.fillText(fitText(x, pg.title, CW), M, 158);
  if(sub){ x.fillStyle = "#6A6A6A"; x.font = `500 26px ${FONT}`; x.fillText(fitText(x, sub, CW), M, 204); }
  let y = top;
  for(const b of pg.blocks){ drawBlock(x, b, y); y += b.H; }
  for(const b of pg.blocks){ if(b.img && b.img.close) b.img.close(); if(b.items) for(const it of b.items) if(it.img && it.img.close) it.img.close(); }
  const blob = await jpeg(c, 0.9), bytes = new Uint8Array(await blob.arrayBuffer());
  return { blob, bytes, w: c.width, h: c.height, name: o.name || "page.jpg" };
}

// ===== 요청서 내용 (그림 · 글이 같이 써요) =====
function infoRows(st){
  const i = st.info, a = [];
  const when = [korDate(i.date, true), korTime(i.time)].filter(Boolean).join(" ");
  if(when) a.push([T.kDate, when]);
  if(trimv(i.hall)) a.push([T.kHall, trimv(i.hall)]);
  if(trimv(i.g) || trimv(i.gp)) a.push([T.kGroom, [trimv(i.g), trimv(i.gp)].filter(Boolean).join("  ")]);
  if(trimv(i.b) || trimv(i.bp)) a.push([T.kBride, [trimv(i.b), trimv(i.bp)].filter(Boolean).join("  ")]);
  if(trimv(i.cn) || trimv(i.cp)) a.push([T.kContact, [trimv(i.cn) + (trimv(i.cr) ? ` (${trimv(i.cr)})` : ""), trimv(i.cp)].filter(Boolean).join("  ")]);
  return a;
}
function rangeRows(st){
  if(!filled("range", st)) return [];
  const r = st.range, a = [];
  if(r.start){ let v = lab(START, r.start); if(r.start === "shop"){ const d = [trimv(r.shop), r.shopAt ? f(T.vShopAt, { t: korTime(r.shopAt) }) : ""].filter(Boolean).join(", "); if(d) v += " — " + d; } a.push([T.kStart, v]); }
  a.push([T.kArrive, korTime(r.arrive) || T.vCheck]);
  a.push([T.kEnd, T.vEndBase + (r.ends.length ? " + " + labs(ENDS, r.ends).join(" · ") : "")]);
  if(r.ends.includes("party") && (r.party.length || trimv(r.partyNote))) a.push([T.kParty, [...labs(PARTY, r.party), trimv(r.partyNote)].filter(Boolean).join(" · ")]);
  if(r.others.length || trimv(r.othersNote)) a.push([T.kOthers, [labs(OTHERS, r.others).join(" · "), trimv(r.othersNote)].filter(Boolean).join(" — ")]);
  if(r.wonpan) a.push([T.kWonpan, lab(WONPAN, r.wonpan)]);
  return a;
}
// 꼭 찍을 장면 (신랑 · 신부): [[장면 묶음 이름, [장면, …]], …] — 고른 것만, 직접 적은 장면은 맨 끝
function coupleList(st){
  const h = st.shots, out = [];
  for(const g of COUPLE){ const its = g.items.filter(x => h.couple.includes(x.id)).map(x => x.t); if(its.length) out.push([g.g, its]); }
  if(h.own.length) out.push([T.hOwn, h.own.slice()]);
  return out;
}
function moreRows(st){
  const h = st.shots, a = [];
  if(h.special.length) a.push([T.kSpecial, labs(SPECIAL, h.special).join(" · ")]);
  if(h.detail.length) a.push([T.kDetail, labs(DETAIL, h.detail).join(" · ")]);
  return a;
}
function guestRows(st){
  const h = st.shots, a = [];
  if(h.room.length) a.push([T.kRoom, labs(ROOM, h.room).join(" · ")]);
  if(h.spread.length) a.push([T.kSpread, labs(SPREAD, h.spread).join(" · ")]);
  return a;
}
function avoidList(st){ const h = st.shots; return [...labs(AVOID, h.avoid), ...trimv(h.avoidNote).split("\n").map(trimv).filter(Boolean)]; }
function okPeople(st){ return st.people.filter(pOk); }
function personLines(p){
  const a = [];
  const w = WHEN.filter(x => p.when.includes(x.id)).map(x => x.s);
  if(w.length) a.push([T.pWith, w.join(" · ")]);
  if(trimv(p.look)) a.push([T.pLook, trimv(p.look)]);
  if(trimv(p.note)) a.push([T.pNote, trimv(p.note)]);
  return a;
}
function hasFlow(st){ return filled("flow", st); }
function pagePeople(st){
  const blocks = okPeople(st).map((p, i) => ({ t: "person", n: i + 1, face: p.face, name: trimv(p.name), rel: [trimv(p.rel), p.side ? T.side[p.side] : ""].filter(Boolean).join(" · "), lines: personLines(p) }));
  const gr = guestRows(st);
  if(gr.length){ blocks.push({ t: "h", text: T.hTogether }); gr.forEach(([k, v]) => blocks.push({ t: "kv", k, v })); }
  return { key: "people", title: T.pgPeople, blocks };
}
function pageRangeFlow(st){
  const rr = rangeRows(st), fl = hasFlow(st), blocks = [];
  if(rr.length){ blocks.push({ t: "h", text: T.hRange }); rr.forEach(([k, v]) => blocks.push({ t: "kv", k, v, dim: v === T.vCheck })); }
  if(fl){
    if(rr.length) blocks.push({ t: "h", text: T.hFlow });
    blocks.push({ t: "p", text: T.flStarLegend, grey: true, sz: 26 }, { t: "gap", h: 8 });
    st.flow.items.forEach((it, i) => blocks.push({ t: "li", mark: String(i + 1), star: it.star, text: flowTitle(it) + (it.star ? "  ★" : ""), sub: trimv(it.who) }));
  }
  return { key: "rangeflow", title: rr.length && fl ? T.pgRangeFlow : rr.length ? T.pgRange : T.pgFlow, blocks };
}
// 원판: 선원판을 하면 "식 전 · 선원판"과 "식 끝나고 · 원판"으로 나눠 번호를 따로 매겨요
function wpGroupsOf(st, at){ return st.wp.groups.filter(g => !at || g.at === at); }
function wpBlocks(st){
  const w = st.wp, blocks = [], pre = w.pre === "yes";
  const list = at => wpGroupsOf(st, at).forEach((g, i) => blocks.push({ t: "wpg", n: i + 1, title: wpTitle(g), names: trimv(g.names).replace(/\n+/g, " ") }));
  if(pre){ blocks.push({ t: "h", text: T.wpPreList }); list("pre"); blocks.push({ t: "h", text: T.wpPostList }); list("post"); }
  else list("");
  const ev = wpEvRows(st);
  if(ev.length){ blocks.push({ t: "h", text: T.hWpEv }); ev.forEach(([k, v]) => blocks.push({ t: "kv", k, v })); }
  const reps = ["g", "b"].filter(s => trimv(w.reps[s].n) || trimv(w.reps[s].p));
  if(reps.length){ blocks.push({ t: "h", text: T.wpRepsLine }); reps.forEach(s => blocks.push({ t: "kv", k: T.side[s], v: [trimv(w.reps[s].n), trimv(w.reps[s].p)].filter(Boolean).join("  ") })); }
  if(st.range.wonpan){ blocks.push({ t: "gap", h: 10 }, { t: "kv", k: T.kWonpan, v: lab(WONPAN, st.range.wonpan) }); }
  blocks.push({ t: "gap", h: 16 }, { t: "p", text: T.wpSendTo, grey: true, sz: 26 });
  return blocks;
}
function pageWp(st){ return { key: "wp", title: T.pgWp, blocks: wpBlocks(st) }; }
function pageRefs(st){ return { key: "refs", title: T.pgRefs, blocks: [{ t: "photos", items: st.refs.map((r, i) => ({ k: r.k, note: trimv(r.note), n: i + 1 })) }] }; }
// 요청서 쪽 목록 (적은 칸만). 1쪽 = 꼭 찍어 주세요 (예식 · 꼭 찍을 장면 · 연출 · 소품 · 피할 것 · 그 밖에)
function pagesOf(st){
  const later = [];
  if(rangeRows(st).length || hasFlow(st)) later.push(pageRangeFlow(st));
  if(wpFilled(st)) later.push(pageWp(st));
  if(okPeople(st).length || guestRows(st).length) later.push(pagePeople(st));
  if(st.refs.length) later.push(pageRefs(st));
  const b = [];
  const ir = infoRows(st), cl = coupleList(st), mr = moreRows(st), av = avoidList(st), note = trimv(st.shots.note);
  if(ir.length){ b.push({ t: "h", text: T.hWhen }); ir.forEach(([k, v]) => b.push({ t: "kv", k, v })); }
  if(cl.length){
    b.push({ t: "h", text: T.hCouple });
    let n = 0;
    cl.forEach(([g, its]) => { b.push({ t: "sub", text: g }); its.forEach(s => b.push({ t: "li", mark: String(++n), text: s, bold: true })); });
  }
  if(mr.length){ b.push({ t: "h", text: T.hMore }); mr.forEach(([k, v]) => b.push({ t: "kv", k, v })); }
  if(av.length){ b.push({ t: "h", text: T.hAvoid }); av.forEach(s => b.push({ t: "li", mark: "•", text: s })); }
  if(note){ b.push({ t: "h", text: T.hNote }); b.push({ t: "p", text: note }); }
  if(!b.length) return later;
  if(later.length){
    b.push({ t: "h", text: T.hInside });
    later.forEach((pg, i) => {
      const what = pg.key === "rangeflow" ? [rangeRows(st).length ? T.vInsideRange : "", hasFlow(st) ? f(T.vInsideFlow, { n: st.flow.items.length, s: st.flow.items.filter(x => x.star).length }) : ""].filter(Boolean).join(" · ")
        : pg.key === "wp" ? [st.wp.groups.length ? f(T.vInsideWp, { n: st.wp.groups.length }) : "", ...wpEvRows(st).map(r => r[1].split(" — ")[0])].filter(Boolean).join(" · ")
        : pg.key === "people" ? (okPeople(st).length ? f(T.vInsidePeople, { n: okPeople(st).length }) : T.hTogether)
        : f(T.vInsideRefs, { n: st.refs.length });
      b.push({ t: "li", mark: String(i + 2), text: what });
    });
  }
  return [{ key: "main", title: T.pgMain, blocks: b }].concat(later);
}
const PGFILE = { main: "꼭찍을장면", rangeflow: "촬영범위식순", wp: "원판순서", people: "꼭찍을하객", refs: "샘플" };

// 카톡에 붙일 글 (그림과 같은 순서)
function outText(st = S){
  const a = [], i = st.info;
  const who = [trimv(i.g) && "신랑 " + trimv(i.g), trimv(i.b) && "신부 " + trimv(i.b)].filter(Boolean).join(" · ");
  a.push(`[${T.shHead}]` + (who ? " " + who : ""));
  a.push(T.txHello);
  const sec = (title, rows) => { if(!rows.length) return; a.push("", "■ " + title); rows.forEach(r => a.push(r)); };
  sec(T.hWhen, infoRows(st).map(([k, v]) => `- ${k}: ${v}`));
  let n = 0;
  sec(T.hCouple, coupleList(st).flatMap(([g, its]) => its.map(s => `${++n}. [${g}] ${s}`)));
  sec(T.hMore, moreRows(st).map(([k, v]) => `- ${k}: ${v}`));
  sec(T.hAvoid, avoidList(st).map(s => "- " + s));
  if(trimv(st.shots.note)) sec(T.hNote, [trimv(st.shots.note)]);
  sec(T.hRange, rangeRows(st).map(([k, v]) => `- ${k}: ${v}`));
  if(hasFlow(st)) sec(`${T.hFlow} (${T.flStarLegend})`, st.flow.items.map((it, k) => `${k + 1}. ${flowTitle(it)}${it.star ? " ★" : ""}${trimv(it.who) ? " — " + trimv(it.who) : ""}`));
  if(wpFilled(st)) sec(T.pgWp, wpLines(st));
  const ps = okPeople(st);
  sec(T.pgPeople, [...ps.map((p, k) => {
    const rel = [trimv(p.rel), p.side ? T.side[p.side] : ""].filter(Boolean);
    const head = `${k + 1}. ${trimv(p.name) || T.pplNoName}` + (rel.length ? ` (${rel.join(" · ")})` : "");
    return [head + (p.face ? " [얼굴 사진 있음]" : ""), ...personLines(p).map(([kk, v]) => `   ${kk}: ${v}`)].join("\n");
  }), ...guestRows(st).map(([k, v]) => `- ${k}: ${v}`)]);
  if(st.refs.length) sec(`${T.pgRefs} ${st.refs.length}장`, st.refs.map((r, k) => `${k + 1}. ${trimv(r.note) || "사진 " + (k + 1)}`));
  const img = ps.some(p => p.face) || st.refs.length;
  a.push("", img ? T.txTail : T.txTailNoImg);
  return a.join("\n");
}
function wpLines(st){
  const w = st.wp, a = [];
  const lines = at => wpGroupsOf(st, at).map((g, k) => `${k + 1}. ${wpTitle(g)}${trimv(g.names) ? " — " + trimv(g.names).replace(/\n+/g, " ") : ""}`);
  if(w.pre === "yes") a.push(`[${T.wpPreList}]`, ...lines("pre"), `[${T.wpPostList}]`, ...lines("post"));
  else a.push(...lines(""));
  wpEvRows(st).forEach(([k, v]) => a.push(`- ${k}: ${v}`));
  const reps = ["g", "b"].filter(s => trimv(w.reps[s].n) || trimv(w.reps[s].p));
  if(reps.length) a.push(`${T.wpRepsLine}: ` + reps.map(s => `${T.side[s]} ${[trimv(w.reps[s].n), trimv(w.reps[s].p)].filter(Boolean).join(" ")}`).join(" · "));
  return a;
}
function wpText(st = S){
  const i = st.info, head = [trimv(i.g) && "신랑 " + trimv(i.g), trimv(i.b) && "신부 " + trimv(i.b)].filter(Boolean).join(" · ");
  const when = [korDate(i.date), korTime(i.time), trimv(i.hall)].filter(Boolean).join(" ");
  return [`[${T.shWpHead}]` + (head ? " " + head : ""), when, T.txWpHello, "", ...wpLines(st)].filter((x, k) => k !== 1 || x).join("\n");
}

// ===== PDF · ZIP (라이브러리 없이 직접 써요 — 수정 요청서와 같은 코드) =====
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
function missing(){
  const i = S.info, a = [];
  if(!nCouple()) a.push(["shots", T.miss.shots]);
  if(!i.date || !i.time) a.push(["info", T.miss.date]);
  if(!trimv(i.hall)) a.push(["info", T.miss.hall]);
  if(!trimv(i.cn) || !trimv(i.cp)) a.push(["info", T.miss.contact]);
  if(!S.range.arrive) a.push(["range", T.miss.arrive]);
  if(wpFilled(S)){
    const g = S.wp.groups, nn = g.filter(x => FAMILY.includes(x.k) && !trimv(x.names)).length;
    if(nn) a.push(["wp", f(T.miss.wpNames, { n: nn })]);
    if(g.length && !["g", "b"].some(s => trimv(S.wp.reps[s].n))) a.push(["wp", T.miss.reps]);
  }
  return a;
}
function renderOut(){
  document.body.className = "sf-body";
  app.className = "sf out";
  const n = nFilled(), touch = isTouch();
  if(!n && !EXM){
    app.innerHTML = `${topBar(`<button class="tbb txt" data-a="board">‹ ${esc(T.back)}</button>`)}
      <div class="pg"><h1 class="h">${esc(T.outEmptyTitle)}</h1><p class="sub">${esc(T.outEmptyLead)}</p><div class="btns" style="margin-top:20px"><button class="btn insta" data-a="board">${esc(T.outEmptyBtn)}</button></div></div>`;
    return;
  }
  const miss = EXM ? [] : missing(), hasWp = wpFilled(S);
  app.innerHTML = `
    ${topBar(EXM ? `<button class="tbb txt" data-a="home">‹ 첫 화면</button>` : `<button class="tbb txt" data-a="board">‹ ${esc(T.back)}</button>`)}
    <div class="pg">
      ${EXM ? `<div class="exb"><p>${esc(T.exBanner)}</p><button class="btn-s" data-a="exmine">${esc(T.exMine)}</button></div>` : ""}
      <h1 class="h">${esc(T.outTitle)}</h1>
      <p class="sub" id="osub">&nbsp;</p>
      ${miss.length ? `<div class="miss"><b>${esc(T.missTitle)}</b><ul>${miss.map(([id, t]) => `<li><span>${esc(t)}</span><button class="tl" data-a="sec" data-id="${id}">${esc(T.missGo)}</button></li>`).join("")}</ul></div>` : ""}
      <div class="strip" id="strip"><p class="busy" id="obusy"></p></div>
      <p class="mini">${esc(T.tapBig)}</p>
      <div class="btns">
        <button class="btn insta" data-a="pdf" id="bpdf" disabled>${esc(touch ? T.pdfBtn : T.pdfBtnPc)}</button>
        <button class="btn ghost" data-a="imgs" id="bimg" disabled>${esc(f(T.imgBtn, { n: "…" }))}</button>
        <button class="btn ghost" data-a="copy">${esc(T.txtBtn)}</button>
      </div>
      <p class="msg" id="msg"></p>
      <details class="bx"><summary>${esc(T.txtTitle)}</summary>
        <textarea id="msgtxt" readonly rows="12">${esc(outText())}</textarea>
        <p class="vend">${esc(T.txtNote)}</p>
      </details>
      <section class="bx open mc"><h2>${esc(T.famTitle)}</h2>
        ${hasWp ? `<p class="vend">${esc(T.famLead)}</p>
        <div class="btns"><button class="btn line" data-a="famimg" id="bwp" disabled>${esc(T.famImg)}</button><button class="btn line" data-a="famtxt">${esc(T.famTxt)}</button></div>
        <p class="msg" id="msg2"></p>` : `<p class="vend">${esc(T.famNone)}</p>`}
      </section>
      <section class="bx open"><h2>${esc(T.checkTitle)}</h2><div class="cks plain">${T.checks.map(c => `<label class="ck"><input type="checkbox"><i>${CHECK}</i><span>${esc(c)}</span></label>`).join("")}</div></section>
      ${EXM ? "" : `<button class="btn ghost more" data-a="board">${esc(T.editMore)}</button>`}
      ${sign()}
    </div>`;
  buildOut();
}
async function buildOut(){
  const gen = ++OUT.gen;
  for(const pg of OUT.pages) if(pg.url) URL.revokeObjectURL(pg.url);
  OUT.pages = []; OUT.pdf = null; OUT.wp = null; OUT.busy = true;
  const st = S, list = pagesOf(st), n = list.length;
  const setBusy = d => { const b = $("#obusy"); if(b) b.textContent = f(T.outBusy, { d, n }); };
  setBusy(0);
  try {
    const pages = [];
    for(let i = 0; i < n; i++){
      if(gen !== OUT.gen) return;
      const pg = list[i];
      pages.push(await renderPage(pg, { head: T.shHead, page: f(T.shPage, { i: i + 1, n }), st, name: f(T.fileImg, { i: i + 1, name: PGFILE[pg.key] }) }));
      setBusy(i + 1);
      await new Promise(r => setTimeout(r, 0));
    }
    if(gen !== OUT.gen) return;
    if(wpFilled(st)) OUT.wp = await renderPage(pageWp(st), { head: T.shWpHead, page: "", st, name: T.fileWp });
    if(gen !== OUT.gen) return;
    for(const pg of pages) pg.url = URL.createObjectURL(pg.blob);
    OUT.pages = pages;
    OUT.pdf = new File([makePdf(pages)], f(T.filePdf, { d: st.info.date || todayStr() }), { type: "application/pdf" });
    OUT.busy = false;
    if(CUR !== "out") return;
    const s = $("#strip"); if(s) s.innerHTML = pages.map((pg, i) => `<button class="shp" data-a="big" data-i="${i}" aria-label="${i + 1}"><img src="${pg.url}" alt=""></button>`).join("");
    const os = $("#osub"); if(os) os.textContent = f(T.outSub, { p: pages.length });
    const b1 = $("#bpdf"), b2 = $("#bimg"), b3 = $("#bwp");
    if(b1) b1.disabled = false;
    if(b2){ b2.disabled = false; b2.textContent = f(T.imgBtn, { n: pages.length }); }
    if(b3) b3.disabled = false;
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
async function shareOrSave(files, zipName, msgId = "msg"){
  const msg = $("#" + msgId);
  if(isTouch() && navigator.canShare && navigator.canShare({ files })){
    try { await navigator.share({ files }); if(msg) msg.textContent = ""; return; }
    catch (e) { if(e && e.name === "AbortError") return; }
  }
  if(files.length === 1) download(files[0], files[0].name);
  else if(zipName){ const bytes = await Promise.all(files.map(async fl => ({ name: fl.name, bytes: new Uint8Array(await fl.arrayBuffer()) }))); download(makeZip(bytes), zipName); }
  if(msg) msg.textContent = T.saved; toast(T.saved);
}
function pageFile(pg){ return new File([pg.blob], pg.name, { type: "image/jpeg" }); }
async function copyText(text, msgId){
  const msg = $("#" + msgId);
  try { await navigator.clipboard.writeText(text); if(msg) msg.textContent = T.copied; toast(T.copied); }
  catch (e) { if(msg) msg.textContent = T.copyFail; const d = $("#msgtxt"); if(d && msgId === "msg"){ d.closest("details").open = true; d.focus(); d.select(); } }
}
function openBig(i){
  const pg = OUT.pages[i]; if(!pg) return;
  overlay("big", `<div class="bigh"><span>${i + 1} / ${OUT.pages.length}</span><button class="btn-s" data-a="pg1" data-i="${i}">${esc(T.saveOne)}</button><button class="btn-s gh" data-a="close">${esc(T.close)}</button></div><div class="bigs"><img src="${pg.url}" alt=""></div>`, "full");
  pushOv();
}

// ===== 창 · 알림 =====
function toast(msg, ms = 2600){
  let t = $("#toast");
  if(!t){ t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  if(!msg){ t.classList.remove("on"); return; }
  t.innerHTML = `<span>${esc(msg)}</span>`;
  t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), ms);
}
function overlay(id, html, cls = ""){
  closeOverlays();
  const o = document.createElement("div"); o.id = id; o.className = "ov " + cls; o.innerHTML = `<div class="ovc" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", e => { if(e.target === o) closeOv(); });
  document.body.appendChild(o); document.body.classList.add("noscroll");
  return o;
}
// 창을 열 때 방문 기록을 하나 넣어서, 폰의 뒤로 가기가 창만 닫게 해요
function pushOv(){ try { history.pushState({ sc: CUR, sec: SEC, ov: 1, ex: EXM ? 1 : 0 }, ""); } catch (e) {} }
function closeOverlays(){ for(const o of $$(".ov")) o.remove(); document.body.classList.remove("noscroll"); CROP = null; }
// 창 닫기: 넣어 둔 방문 기록을 되돌린 뒤(뒤로 가기가 끝난 뒤) 다음 일을 해요
function closeOv(){
  return new Promise(res => {
    if(!(history.state && history.state.ov)){ closeOverlays(); res(); return; }
    let tm = 0;
    const h = () => { window.removeEventListener("popstate", h); clearTimeout(tm); setTimeout(res, 0); };
    window.addEventListener("popstate", h);
    tm = setTimeout(() => { window.removeEventListener("popstate", h); closeOverlays(); res(); }, 500);
    history.back();
  });
}
function sheet({ title, body, yes, no, onYes }){
  const o = overlay("sheet", `<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="orow"><button class="btn insta" id="sy">${esc(yes)}</button><button class="btn ghost" id="sn">${esc(no)}</button></div>`);
  pushOv();
  $("#sy").onclick = async () => { await closeOv(); if(onYes) onYes(); };
  $("#sn").onclick = () => closeOv();
  return o;
}
function openMenu(items){
  overlay("menu", `<div class="mlist">${items.map(([a, t, extra]) => `<button data-a="${a}"${extra || ""}>${esc(t)}</button>`).join("")}<button data-a="close" class="c">${esc(T.cancel)}</button></div>`, "bottom");
  pushOv();
}

// ===== 칸 고치기 동작 =====
function touchFlow(){ S.flow.touched = 1; }
function flowInsert(k){
  const items = S.flow.items, c = FLOW.findIndex(x => x.k === k);
  let at = items.length;
  for(let i = 0; i < items.length; i++){ const it = items[i]; if(it.k !== "x" && FLOW.findIndex(x => x.k === it.k) > c){ at = i; break; } }
  items.splice(at, 0, { k, who: "", star: false });
}
function flowImport(){
  const d = flowStore(); if(!d) return;
  const old = S.flow.items, used = new Set();
  const items = d.items.map(it => {
    if(!it) return null;
    if(it.k === "custom"){ const t = trimv(it.title); return t ? { k: "x", title: t, who: typeof it.note === "string" ? trimv(it.note) : "", star: false } : null; }
    if(!FLOW.some(x => x.k === it.k)) return null;
    const prev = old.find(o => o.k === it.k);
    const way = (WAYS[it.k] && WAYS[it.k][it.way]) || "";
    const who = prev && trimv(prev.who) ? prev.who : (typeof it.note === "string" && trimv(it.note) && !way ? trimv(it.note) : way);
    used.add(it.k);
    return { k: it.k, who, star: !!(prev && prev.star) };
  }).filter(Boolean);
  for(const o of old) if(o.k === "x" && !items.some(x => x.k === "x" && x.title === o.title)) items.push(o);
  S.flow.items = items; touchFlow(); save(); rerender(); toast(T.flImported);
}
// 선원판을 켜면 가족 묶음(부모님 · 신랑 측 · 신부 측 가족)이 "식 전" 목록으로, 끄면 다시 원판 맨 앞으로
function wpSetPre(v){
  const w = S.wp; w.pre = v; w.touched = 1;
  for(const g of w.groups) g.at = v === "yes" && FAMILY.includes(g.k) ? "pre" : "post";
  w.groups = [...w.groups.filter(g => g.at === "pre"), ...w.groups.filter(g => g.at !== "pre")];
  const fam = w.groups.filter(g => FAMILY.includes(g.k)), rest = w.groups.filter(g => !FAMILY.includes(g.k));
  if(v !== "yes") w.groups = [...fam, ...rest];
  save(); rerender();
}
// 같은 목록(식 전 / 식 끝나고) 안에서 한 칸 옮기기
function wpMove(i, d){
  const g = S.wp.groups, at = g[i] && g[i].at, same = g.map((x, k) => k).filter(k => g[k].at === at), p = same.indexOf(i), j = same[p + d];
  if(j == null) return;
  [g[i], g[j]] = [g[j], g[i]]; S.wp.touched = 1; save(); rerender();
}

// ===== 누르기 =====
const ACT = {
  start(){ go("board"); },
  example(){ startExample(); },
  new(){ sheet({ title: T.newTitle, body: T.newBody, yes: T.newYes, no: T.cancel, onYes: async () => { await wipe(); go("cover"); } }); },
  home(){ go("cover"); },
  board(){ go("board"); },
  menu(){ openMenu([["home", T.menuHome], ["new", T.menuNew]]); },
  sec(b){ if(EXM) exitExample(); go("sec", b.dataset.id); },
  next(){ const i = SECS.indexOf(SEC); go("sec", SECS[i + 1]); },
  out(){ go("out"); },
  close(){ closeOv(); },
  tog(b){
    const arr = getPath(b.dataset.k), v = b.dataset.v, i = arr.indexOf(v);
    if(i >= 0) arr.splice(i, 1); else arr.push(v);
    b.classList.toggle("on", i < 0); b.setAttribute("aria-pressed", String(i < 0));
    if(b.dataset.k.startsWith("wp.")) S.wp.touched = 1;
    save(); if(b.dataset.re) rerender();
  },
  one(b){
    const k = b.dataset.k, v = b.dataset.v, now = getPath(k) === v ? "" : v;
    setPath(k, now);
    if(k.startsWith("wp.")) S.wp.touched = 1;
    $$(`[data-a="one"][data-k="${k}"]`).forEach(c => { const on = c.dataset.v === now; c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); });
    save(); if(b.dataset.re) rerender();
  },
  infoimp(){
    const d = flowStore(); if(!d || !d.info) return;
    const i = S.info, fi = d.info;
    if(!i.date && fi.date) i.date = fi.date; if(!i.time && fi.time) i.time = fi.time;
    if(!trimv(i.hall) && fi.venue) i.hall = fi.venue; if(!trimv(i.g) && fi.groom) i.g = fi.groom; if(!trimv(i.b) && fi.bride) i.b = fi.bride;
    save(); rerender(); toast(T.fromFlowDone);
  },
  padd(){
    if(S.people.length >= MAXPPL) return;
    const p = { id: S.seq++, name: "", rel: "", side: "", when: [], look: "", note: "", face: "" };
    S.people.push(p); OPENP = p.id; save(); rerender();
    const el = $("#pc" + p.id); if(el) el.scrollIntoView({ block: "start", behavior: "smooth" });
    setTimeout(() => { const n = $("#pname"); if(n && !isTouch()) n.focus(); }, 300);
  },
  pexp(b){ OPENP = +b.dataset.id; rerender(); const el = $("#pc" + OPENP); if(el) el.scrollIntoView({ block: "start" }); },
  pclose(){ OPENP = -1; rerender(); },
  pdel(b){
    const i = +b.dataset.i, p = S.people[i]; if(!p) return;
    const go2 = () => { if(p.face) delImg(p.face); S.people.splice(i, 1); OPENP = -1; save(); rerender(); };
    if(pOk(p)) sheet({ title: T.pplDel + "?", body: trimv(p.name) || T.pplNoName, yes: T.pplDel, no: T.cancel, onYes: go2 }); else go2();
  },
  prel(b){ const i = +b.dataset.i, p = S.people[i]; if(!p) return; p.rel = b.dataset.v; const el = $(`[data-k="people.${i}.rel"]`); if(el) el.value = p.rel; save(); },
  face(b){ const i = +b.dataset.i; pickFiles(false, files => { if(files[0]) openCrop(files[0], i); }); },
  facedel(b){ const p = S.people[+b.dataset.i]; if(!p || !p.face) return; delImg(p.face); p.face = ""; save(); rerender(); },
  cropok(){ cropOk(); },
  fin(b){ flowInsert(b.dataset.k); touchFlow(); save(); rerender(); },
  fout(b){ S.flow.items.splice(+b.dataset.i, 1); touchFlow(); save(); rerender(); },
  fstar(b){ const it = S.flow.items[+b.dataset.i]; if(!it) return; it.star = !it.star; touchFlow(); save(); b.classList.toggle("on", it.star); b.setAttribute("aria-pressed", String(it.star)); b.closest("li").classList.toggle("star", it.star); },
  fmemo(b){ const i = +b.dataset.i, it = S.flow.items[i]; if(!it) return; FLMEMO.add(it); rerender(); const el = $(`[data-k="flow.items.${i}.who"]`); if(el) el.focus(); },
  fcx(b){ const el = $("#fct"); if(el){ el.value = b.dataset.v; el.focus(); } },
  fcadd(){
    const el = $("#fct"), t = el ? trimv(el.value) : ""; if(!t){ if(el) el.focus(); return; }
    const after = +($("#fca") || {}).value;
    S.flow.items.splice(isNaN(after) ? S.flow.items.length : after + 1, 0, { k: "x", title: t, who: "", star: true });
    touchFlow(); save(); rerender();
  },
  ownadd(){
    const el = $("#owt"), t = el ? trimv(el.value) : ""; if(!t){ if(el) el.focus(); return; }
    if(S.shots.own.length >= MAXOWN) return;
    S.shots.own.push(t); save(); rerender(); const n = $("#owt"); if(n && !isTouch()) n.focus();
  },
  owndel(b){ S.shots.own.splice(+b.dataset.i, 1); save(); rerender(); },
  fimp(){ if(S.flow.touched) sheet({ title: T.flImport, body: T.flImportAsk, yes: T.flImportYes, no: T.cancel, onYes: flowImport }); else flowImport(); },
  wppre(b){ const v = b.dataset.v; wpSetPre(S.wp.pre === v ? "" : v); },
  wup(b){ wpMove(+b.dataset.i, -1); },
  wdown(b){ wpMove(+b.dataset.i, 1); },
  wdel(b){
    const i = +b.dataset.i, g = S.wp.groups[i]; if(!g) return;
    const go2 = () => { S.wp.groups.splice(i, 1); S.wp.touched = 1; save(); rerender(); };
    if(trimv(g.names)) sheet({ title: wpTitle(g), body: T.wpDel + "?", yes: T.wpDel, no: T.cancel, onYes: go2 }); else go2();
  },
  wadd(){
    const used = new Set(S.wp.groups.map(g => g.k));
    openMenu([...Object.keys(WP).filter(k => !used.has(k)).map(k => ["wnew", WP[k], ` data-k="${k}"`]), ["wnew", T.wpAddCustom, ' data-k="x"']]);
  },
  wnew(b){
    const k = b.dataset.k, g = S.wp.groups, at = S.wp.pre === "yes" && FAMILY.includes(k) ? "pre" : "post", item = { id: S.seq++, k, title: "", names: "", at };
    if(at === "pre"){ const last = g.map(x => x.at).lastIndexOf("pre"); g.splice(last + 1, 0, item); } else g.push(item);
    S.wp.touched = 1;
    save(); closeOv().then(() => { rerender(); const el = $(`[data-k="wp.groups.${g.indexOf(item)}.${k === "x" ? "title" : "names"}"]`); if(el){ el.scrollIntoView({ block: "center" }); if(!isTouch()) el.focus(); } });
  },
  refadd(){
    pickFiles(true, async files => {
      const room = MAXREF - S.refs.length; let bad = 0;
      toast(T.photoBusy, 15000);
      for(const fl of files.slice(0, room)){
        try { const bm = await decode(fl); const c = scaled(bm, REF_PX); if(bm.close) bm.close(); const k = await putImg(await jpeg(c, 0.88)); S.refs.push({ id: S.seq++, k, note: "" }); }
        catch (e) { bad++; }
      }
      toast("");
      if(files.length > room) toast(f(T.shRefsMax, { n: MAXREF })); else if(bad) toast(T.photoFail);
      save(); rerender();
    });
  },
  refdel(b){ const i = +b.dataset.i, r = S.refs[i]; if(!r) return; delImg(r.k); S.refs.splice(i, 1); save(); rerender(); },
  pdf(){ if(OUT.pdf) shareOrSave([OUT.pdf]); },
  imgs(){ if(OUT.pages.length) shareOrSave(OUT.pages.map(pageFile), f(T.fileZip, { d: S.info.date || todayStr() })); },
  copy(){ copyText(outText(), "msg"); },
  famimg(){ if(OUT.wp) shareOrSave([pageFile(OUT.wp)], null, "msg2"); },
  famtxt(){ copyText(wpText(), "msg2"); },
  big(b){ openBig(+b.dataset.i); },
  pg1(b){ const pg = OUT.pages[+b.dataset.i]; if(pg) shareOrSave([pageFile(pg)]); },
  exmine(){ exitExample(); go("board"); }
};

function inputs(){
  const fi = document.createElement("input"); fi.type = "file"; fi.id = "file"; fi.accept = "image/*"; fi.hidden = true;
  fi.addEventListener("change", () => { const list = [...fi.files]; fi.value = ""; const fn = PICK; PICK = null; if(list.length && fn) fn(list); });
  document.body.appendChild(fi);
  document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(!b || b.disabled) return; const fn = ACT[b.dataset.a]; if(fn){ e.preventDefault(); fn(b, e); } });
  document.addEventListener("input", e => {
    const t = e.target, k = t.dataset && t.dataset.k; if(!k) return;
    if(EXM) return;
    setPath(k, t.value);
    if(k.startsWith("flow.")) touchFlow();
    if(k.startsWith("wp.")) S.wp.touched = 1;
    save();
    if(k.startsWith("people.") && /\.(name|rel)$/.test(k)){ const i = +k.split(".")[1], p = S.people[i], fc = p && $(`#pc${p.id} .face:not(.has) span`); if(fc) fc.textContent = trimv(p.name).slice(-2) || "?"; }
  });
  document.addEventListener("change", e => { const t = e.target; if(t.dataset && t.dataset.k && (t.type === "date" || t.type === "time")){ setPath(t.dataset.k, t.value); save(); } });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape" && $(".ov")){ closeOv(); return; }
    if(e.key === "Enter" && !e.isComposing && e.target.id === "fct"){ e.preventDefault(); ACT.fcadd(); }
    if(e.key === "Enter" && !e.isComposing && e.target.id === "owt"){ e.preventDefault(); ACT.ownadd(); }
  });
  addEventListener("popstate", e => {
    const st = e.state || { sc: "cover" }, wantEx = !!st.ex, same = st.sc === CUR && (st.sec || "") === SEC && wantEx === EXM;
    if($(".ov")){ closeOverlays(); if(same) return; }
    if(same) return;
    if(wantEx){ startExampleNoPush(); return; }
    if(EXM) exitExample();
    show(st.sc, st.sec);
  });
  addEventListener("pagehide", () => saveNow());
  document.addEventListener("visibilitychange", () => { if(document.hidden) saveNow(); });
}
async function startExampleNoPush(){ await exampleImages(); if(!EXM){ REAL = S; S = exampleState(); EXM = true; } CUR = "out"; SEC = ""; closeOverlays(); render(); scrollTo(0, 0); }

async function boot(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ renderSoon(); return; }
  inputs();
  try {
    const st = await DB.get("kv", "state");
    if(st) S = clean(st);
    const imgs = await DB.all("img");
    const used = new Set([...S.people.map(p => p.face), ...S.refs.map(r => r.k)].filter(Boolean));
    for(const [k, b] of imgs){ if(used.has(k) && b) IMG.set(k, { blob: b, url: URL.createObjectURL(b) }); else DB.del("img", k).catch(() => {}); }
    for(const p of S.people) if(p.face && !IMG.has(p.face)) p.face = "";
    S.refs = S.refs.filter(r => IMG.has(r.k));
  } catch (e) { STORE_OK = false; }
  try { history.replaceState({ sc: "cover", sec: "" }, ""); } catch (e) {}
  CUR = "cover"; render();
}
// 시험용 (docs/스냅-요청서/도구/flow.js): mine() = 예시 내용을 내 요청서 자리에 넣기 (저장은 안 해요)
window.__sf = { get CUR(){ return CUR; }, get SEC(){ return SEC; }, get S(){ return S; }, get OUT(){ return OUT; }, get EXM(){ return EXM; }, outText, wpText, pagesOf, missing, makePdf, go, IMG,
  async mine(){ await exampleImages(); S = exampleState(); EXM = false; } };
boot();
