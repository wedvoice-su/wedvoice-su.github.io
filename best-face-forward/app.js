// 헤어 · 메이크업 요청서 ㊻: 신부 · 신랑 고르기 → 단계마다 고르기(언제 · 먼저 알릴 것 · 메이크업 · 헤어 · 참고 사진 · 하지 말 것) → 요청서(이미지 · PDF) + 카톡 글
// 기획 docs/헤어-메이크업/기획.md · 조사 docs/헤어-메이크업/조사/ · 문구와 고를 것 text.js · 예시 그림 samples.js(수정 요청서에서 가져옴) · 공통 shared/common.js
// 사진은 이 기기(브라우저) 밖으로 보내지 않아요. 줄인 사진과 고른 것만 이 브라우저 저장소(IndexedDB)에 남겨요.
// 사회자 한마디 상자는 넣지 않아요 — 헤어 · 메이크업은 사회자 영역이 아니라서 (사회자님 기준 11/03 · 11/16 "조언은 최대한 넓게")
// 사진 표시 · 요청서 그림 · PDF 코드는 웨딩사진 수정 요청서(picture-perfect/app.js)와 같은 방식이에요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/best-face-forward/?preview)
const OPEN = false;
// =========================================================

const DBN = "best-face-forward.v1";
const WORK = 1800;          // 작업용 사진 긴 변(px)
const THUMB = 420;          // 목록용 작은 사진 긴 변(px)
const MAXN = 10;            // 참고 사진 수
const SHEET_W = 1240;       // 요청서 그림 너비(px)
const FONT = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
const PINK = "#C2185B";

// ===== 상태 =====
let DOCS = { b: null, g: null };   // 신부 · 신랑 요청서 (따로 저장)
let S = null;               // 지금 쓰는 요청서
let DEMO = false;           // 예시를 보는 중이면 true (저장하지 않아요)
let CUR = "cover";
let STORE_OK = true;
const IMG = new Map();      // 사진 키 → { blob, url, turl }
let ED = null;              // 사진 한 장 화면: { k, pin }
let VIEW = { z: 1, tx: 0, ty: 0 }, L = null;
let OUT = { gen: 0, pages: [], pdf: null, busy: false };
let UNDO = [];
let EXURL = "";
let TRAP = false;
let GHOST = 0;

function blank(who){
  return { v: 1, who, at: 0, seq: 1, info: {}, pick: {}, notes: {}, photos: [], step: 0, tips: {} };
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
function whoName(w){ return w === "g" ? T.whoG : T.whoB; }
function dateWord(v){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if(!m) return v || "";
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return f(T.dateFmt, { m: +m[2], d: +m[3], w: "일월화수목금토"[d.getDay()] });
}
function timeWord(v){
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || ""); if(!m) return v || "";
  const h = +m[1], ap = h < 12 ? T.am : T.pm, hh = h % 12 || 12;
  return `${ap} ${hh}:${m[2]}`;
}

// ===== 고른 것 =====
// 지금 보이는 줄에서 고른 것만 셈해요 (예: "본식"을 풀면 "촬영 때도 받았나요?" 줄이 숨고, 그 줄에서 고른 것도 없는 것으로 봐요 — 고른 것 자체는 남겨 둬요)
function active(doc){
  let act = new Set(Object.values(doc.pick).flat());
  for(let k = 0; k < 5; k++){
    const next = new Set(), ok = x => !x.need || x.need.some(id => act.has(id));
    for(const st of STEPS[doc.who]){ if(!ok(st)) continue; for(const r of st.rows || []) if(ok(r)) for(const id of doc.pick[r.id] || []) next.add(id); }
    if(next.size === act.size && [...next].every(id => act.has(id))) break;
    act = next;
  }
  return act;
}
function shown(doc, x, act){ return !x.need || x.need.some(id => (act || active(doc)).has(id)); }
function stepsOf(doc){ const act = active(doc); return STEPS[doc.who].filter(st => shown(doc, st, act)); }
function rowsOf(doc, st){ const act = active(doc); return (st.rows || []).filter(r => shown(doc, r, act)); }
function fieldVal(doc, fd){ return String(doc.info[fd.id] || "").trim(); }
function picks(doc, r){ const a = doc.pick[r.id] || []; return r.items.filter(it => a.includes(it.id)); }
function itemText(it){ return it.s || it.chip; }
function partOf(doc, id){ return PARTS[doc.who].find(p => p.id === id); }
function howOf(id){ return HOW.find(h => h.id === id) || HOW[0]; }
function pinLine(doc, q){
  const p = partOf(doc, q.part), n = (q.note || "").trim();
  let s = p ? f(howOf(q.how).s, { part: p.s || p.chip }) : "";
  if(n) s = s ? s + " " + n : n;
  return s;
}
function filled(q){ return !!(q.part || (q.note || "").trim()); }
function P(k){ return S.photos.find(p => p.k === k); }
function posPins(p){ return p.pins.filter(q => q.x != null); }
function pinNo(p, q){ return q.x == null ? 0 : posPins(p).indexOf(q) + 1; }
function marks(p){ return p.pins.filter(filled).length; }
// 단계마다 고른 개수 (진행 표시 · 아래 줄 숫자)
function stepCount(doc, st){
  if(st.kind === "photos") return doc.photos.length;
  let n = 0;
  for(const r of rowsOf(doc, st)) n += picks(doc, r).length;
  if((doc.notes[st.id] || "").trim()) n++;
  for(const fd of st.fields || []) if(fieldVal(doc, fd)) n++;
  return n;
}
// 요청 수 = 요청서 본문에 들어가는 것 (기본 단계의 언제 · 이름 같은 것은 빼요) — 요청서 만들기 버튼은 이게 1 이상일 때
function totalCount(doc){
  let n = 0;
  for(const st of stepsOf(doc)) if(st.kind !== "info" && st.kind !== "photos") n += stepCount(doc, st);
  for(const p of doc.photos) n += marks(p);
  return n;
}
// 고른 것 수 = 기본 단계에서 고른 칩까지 (아래 줄 숫자 · 첫 화면 이어서 쓰기)
function pickedCount(doc){
  let n = totalCount(doc);
  const st = stepsOf(doc).find(s => s.kind === "info");
  if(st) for(const r of rowsOf(doc, st)) n += picks(doc, r).length;
  return n;
}
// 요청서에 들어갈 묶음: [{ id, title, box, rows: [{ label, text }] }] — 단계의 ord 순서 (먼저 알아 주세요 → 촬영 비교 → 메이크업 · 헤어 → 하지 말아 주세요)
function sections(doc){
  const out = [];
  for(const st of stepsOf(doc)){
    if(st.kind === "info" || st.kind === "photos") continue;
    const rows = [];
    for(const r of rowsOf(doc, st)){ const ps = picks(doc, r); if(ps.length) rows.push({ label: r.sheet || r.label, text: ps.map(itemText).join(" · ") }); }
    for(const fd of st.fields || []){ const v = fieldVal(doc, fd); if(v) rows.push({ label: fd.sheet || fd.label, text: v }); }
    const note = (doc.notes[st.id] || "").trim();
    if(note) rows.push({ label: T.noteRow, text: note });
    if(rows.length) out.push({ id: st.id, title: st.sheet || st.title, box: st.box || "", rows, ord: st.ord || 9 });
  }
  return out.sort((a, b) => a.ord - b.ord);
}
// 요청서 맨 위 작은 줄: 언제 · 날짜 시간 · 장소 · 담당 · 그 밖의 기본 줄 (적은 것만)
function headBits(doc){
  const a = [], st = stepsOf(doc).find(s => s.kind === "info"), rows = st ? rowsOf(doc, st) : [];
  const line = r => { const ps = picks(doc, r); return ps.length ? (r.pre ? r.pre + " " : "") + ps.map(itemText).join(" · ") : ""; };
  const first = rows[0] && line(rows[0]); if(first) a.push(first);
  const i = doc.info, place = String(i.place || "").trim(), staff = String(i.staff || "").trim();
  if(i.date) a.push(dateWord(i.date) + (i.time ? " " + timeWord(i.time) : ""));
  else if(i.time) a.push(timeWord(i.time));
  if(place) a.push(place);
  if(staff) a.push(f(T.staffFmt, { s: staff }));
  for(const r of rows.slice(1)){ const l = line(r); if(l) a.push(l); }
  return a;
}
function sheetTitle(doc){ const nm = (doc.info.name || "").trim(); return nm ? `${whoName(doc.who)} ${nm}` : f(T.shNoName, { who: whoName(doc.who) }); }
function outPhotos(doc){ return doc.photos; }

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
  if(!S || DEMO || !STORE_OK) return;
  S.at = Date.now();
  try { await DB.put("kv", "doc." + S.who, S); } catch (e) { storeFail(); }
}
function storeFail(){ if(STORE_OK){ STORE_OK = false; toast(T.noStore, 6000); } }
async function wipeDoc(w){
  const d = DOCS[w];
  if(d) for(const p of d.photos){ const im = IMG.get(p.k); if(im){ URL.revokeObjectURL(im.url); URL.revokeObjectURL(im.turl); IMG.delete(p.k); } DB.del("img", p.k).catch(() => {}); }
  DOCS[w] = null;
  try { await DB.del("kv", "doc." + w); } catch (e) {}
}

// ===== 되돌리기 (번호 지우기 · 사진 빼기) =====
function keep(){ UNDO.push(JSON.stringify(S.photos)); if(UNDO.length > 30) UNDO.shift(); }
function undo(){
  const s = UNDO.pop(); if(!s) return;
  S.photos = JSON.parse(s);
  if(ED){ ED.pin = null; if(!P(ED.k)){ ED = null; CUR = "step"; } }
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
async function addOne(src, name, keyPre = S.who){
  const bm = await decode(src);
  const c = scaled(bm, WORK), blob = await jpeg(c, 0.9), tblob = await jpeg(scaled(c, THUMB), 0.82);
  if(bm.close) bm.close();
  const k = keyPre + "p" + (S.seq++) + "_" + Date.now().toString(36);
  IMG.set(k, { blob, url: URL.createObjectURL(blob), turl: URL.createObjectURL(tblob) });
  const p = { k, n: name, w: c.width, h: c.height, pins: [] };
  S.photos.push(p);
  if(STORE_OK && !DEMO) DB.put("img", k, { b: blob, t: tblob }).catch(storeFail);
  return p;
}
async function addFiles(list){
  let files = [...list].filter(x => /^image\//.test(x.type || "") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(x.name || ""));
  const dropped = list.length - files.length;
  files.sort((a, b) => coll.compare(a.name, b.name));
  const room = MAXN - S.photos.length; let many = false;
  if(files.length > room){ files = files.slice(0, Math.max(0, room)); many = true; }
  if(!files.length){ toast(many ? f(T.loadMany, { n: MAXN }) : T.loadNone, 4000); return; }
  let bad = dropped, done = 0, first = null;
  busy(f(T.loading, { d: 0, n: files.length }), 0);
  for(const file of files){
    try { const p = await addOne(file, file.name || ("photo-" + S.seq)); if(!first) first = p; } catch (e) { bad++; }
    done++; busy(f(T.loading, { d: done, n: files.length }), done / files.length);
  }
  busy(null);
  if(!first){ toast(T.loadNone, 4000); return; }
  await saveNow();
  // 넣은 첫 사진을 바로 열어요 (할 일 = 표시하기가 바로 보이게)
  openPhoto(first.k);
  if(many) toast(f(T.loadMany, { n: MAXN }), 5000); else if(bad) toast(f(T.loadBad, { n: bad }), 5000);
}
function busy(text, ratio){
  let b = $("#busy");
  if(text == null){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement("div"); b.id = "busy"; b.innerHTML = `<div><p></p><i><b></b></i></div>`; document.body.appendChild(b); }
  b.querySelector("p").textContent = text; b.querySelector("b").style.width = Math.round((ratio || 0) * 100) + "%";
}

// ===== 예시 =====
// 예시 그림: 수정 요청서의 샘플 그림(정원 클로즈업) 한 장
function sampleCanvas(W, H){
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); SAMPLES.drawSample(x, W, H, 2, 0); x.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
function exampleDoc(w){
  const E = EXAMPLE[w], d = blank(w);
  d.info = Object.assign({}, E.info); d.pick = JSON.parse(JSON.stringify(E.pick)); d.notes = Object.assign({}, E.notes || {});
  return d;
}
async function exampleWithPhoto(w){
  const d = exampleDoc(w), E = EXAMPLE[w];
  const c = sampleCanvas(1500, 1000), blob = await jpeg(c, 0.9), tblob = await jpeg(scaled(c, THUMB), 0.82);
  const k = "demo-" + w;
  const old = IMG.get(k); if(old){ URL.revokeObjectURL(old.url); URL.revokeObjectURL(old.turl); }
  IMG.set(k, { blob, url: URL.createObjectURL(blob), turl: URL.createObjectURL(tblob) });
  d.photos = [{ k, n: T.exPhotoName, w: 1500, h: 1000, pins: JSON.parse(JSON.stringify(E.pins)) }];
  return { d, c };
}
async function startDemo(w = "b"){
  closeOverlays();
  busy(T.exBusy, 0.5);
  try { const { d } = await exampleWithPhoto(w); S = d; DEMO = true; } finally { busy(null); }
  go("out");
}
function endDemo(){ if(!DEMO) return; DEMO = false; S = null; }

// ===== 화면 바꾸기 =====
function go(screen){
  toast("");
  CUR = screen;
  if(screen !== "edit") ED = null;
  if(screen === "step" || screen === "edit" || screen === "out") trap();
  render(); scrollTo(0, 0);
}
// 폰의 뒤로 가기가 사이트를 나가지 않고 이전 단계로 가게
function trap(){ if(TRAP) return; try { history.pushState({ hm: 1 }, ""); TRAP = true; } catch (e) {} }
function goHome(){ closeOverlays(); saveNow(); endDemo(); S = null; renderCover(); scrollTo(0, 0); }
function backStep(){
  if($(".ov")){ closeOverlays(); return; }
  if(CUR === "edit"){ if(ED && ED.pin) closePin(); else toPhotos(); return; }
  if(CUR === "out"){ if(DEMO) goHome(); else { S.step = stepsOf(S).length - 1; go("step"); } return; }
  if(CUR === "step"){ if(S.step > 0){ S.step--; save(); go("step"); } else goHome(); }
}
function render(){
  closeOverlays();
  if(CUR === "soon") return renderSoon();
  if(CUR === "cover" || !S) return renderCover();
  if(CUR === "step") return renderStep();
  if(CUR === "edit") return renderEdit();
  if(CUR === "out") return renderOut();
}
function topBar(left, mid = "", right = ""){ return `<header class="tb">${left}<span class="tb-mid">${mid}</span>${right}</header>`; }

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
function startMeta(w){
  const d = DOCS[w]; if(!d) return w === "g" ? T.startSubG : T.startSubB;
  const n = pickedCount(d), ph = d.photos.length;
  return n || ph ? f(ph ? T.resumeMetaPh : T.resumeMeta, { n, p: ph }) : (w === "g" ? T.startSubG : T.startSubB);
}
function renderCover(){
  CUR = "cover";
  document.body.className = "is-cover hm-body";
  app.className = "wrap cover hm-cover";
  const res = w => DOCS[w] && (pickedCount(DOCS[w]) || DOCS[w].photos.length || Object.values(DOCS[w].info).some(v => String(v || "").trim()));
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${nl(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="whos">
      ${["b", "g"].map(w => `<button class="whob ${w === "b" ? "b" : "g"}" data-a="start" data-w="${w}"><b>${esc(res(w) ? f(T.resumeBtn, { who: whoName(w) }) : f(T.startBtn, { who: whoName(w) }))}</b><span>${esc(startMeta(w))}</span><i aria-hidden="true">→</i></button>`).join("")}
    </div>
    <button class="exlink" data-a="demo">${esc(T.trySample)}</button>
    <p class="trust"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 016.8 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="7" width="10" height="7.2" rx="1.9" fill="currentColor"/></svg>${esc(T.trust)}</p>
    <section class="ex">
      <div class="exh"><b>${esc(T.exTitle)}</b><span>${esc(T.exTag)}</span></div>
      <button class="exi" id="exi" data-a="demo" aria-label="${esc(T.trySample)}">${EXURL ? `<img src="${EXURL}" alt="">` : ""}</button>
    </section>
    <ul class="notes">${T.coverNotes.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    ${foot()}`;
  if(!EXURL) makeExample();
}
// 첫 화면 예시: 신부 예시 요청서 첫 장
async function makeExample(){
  try {
    const d = exampleDoc("b");
    await fontsFor(sheetText(d));
    const pg = await sheetMain(d, 2, { crop: 1500 });
    EXURL = URL.createObjectURL(pg.blob);
    const box = $("#exi"); if(box) box.innerHTML = `<img src="${EXURL}" alt="">`;
  } catch (e) {}
}
function start(w){
  endDemo();
  if(!DOCS[w]) DOCS[w] = blank(w);
  S = DOCS[w];
  const n = stepsOf(S).length;
  if(S.step >= n) S.step = n - 1;
  go("step");
}

// ===== 단계 화면 =====
function stepNav(steps, i){
  return `<nav class="steps" id="steps" aria-label="${esc(T.stepsLabel)}">${steps.map((st, j) => `<button class="sn${j === i ? " on" : ""}${stepCount(S, st) ? " done" : ""}" data-a="goto" data-i="${j}"${j === i ? ' aria-current="step"' : ""}><small>${j + 1}</small>${esc(st.short || st.title)}</button>`).join("")}</nav>`;
}
function chipHTML(r, it, on){
  return `<button class="chip${on ? " on" : ""}${it.sub ? " two" : ""}" data-a="chip" data-r="${r.id}" data-id="${it.id}" aria-pressed="${on}">${esc(it.chip)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>`;
}
function rowHTML(r){
  const sel = S.pick[r.id] || [];
  return `<section class="row" data-row="${r.id}">
    <h2 class="rl">${esc(r.label)}${r.multi ? "" : `<span class="one">${esc(T.pickOne)}</span>`}</h2>
    ${r.help ? `<p class="rh">${esc(r.help)}</p>` : ""}
    <div class="chips">${r.items.map(it => chipHTML(r, it, sel.includes(it.id))).join("")}</div>
  </section>`;
}
function fieldHTML(fd){
  const v = S.info[fd.id] || "";
  return `<label class="nt${fd.half ? " half" : ""}"><small>${esc(fd.label)}</small><input type="${fd.type || "text"}" id="fd-${fd.id}" data-f="${fd.id}" value="${esc(v)}" placeholder="${esc(fd.ph || "")}"${fd.max ? ` maxlength="${fd.max}"` : ""} autocomplete="off" enterkeyhint="done"></label>`;
}
function renderStep(){
  const steps = stepsOf(S), i = clamp(S.step, 0, steps.length - 1), st = steps[i], last = i === steps.length - 1;
  S.step = i;
  document.body.className = "hm-body";
  app.className = "hm step";
  const n = totalCount(S), pn = pickedCount(S);
  let body = "";
  if(st.kind === "photos") body = photosHTML();
  else {
    body = rowsOf(S, st).map(rowHTML).join("");
    if(st.fields) body += `<div class="fields">${st.fields.map(fieldHTML).join("")}</div>`;
    if(st.note) body += `<label class="nt big"><small>${esc(st.note)}</small><textarea id="note" data-s="${st.id}" rows="3" placeholder="${esc(st.notePh || "")}">${esc(S.notes[st.id] || "")}</textarea></label>`;
  }
  const next = steps[i + 1];
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="back">‹ ${esc(i ? T.prev : T.home)}</button>`, `<b>${esc(f(T.docName, { who: whoName(S.who) }))}</b>`, `<button class="tbb" data-a="menu" aria-label="${esc(T.menuLabel)}">⋯</button>`)}
    ${stepNav(steps, i)}
    <div class="pg narrow">
      <h1 class="h">${nl(st.title)}</h1>
      ${st.sub ? `<p class="sub">${esc(st.sub)}</p>` : ""}
      ${body}
    </div>
    <div class="dock"><div class="dock-in">
      ${last ? `<span class="meta">${esc(n ? f(T.dockN, { n: pn }) : T.dockNone)}</span><button class="btn insta${n ? "" : " wait"}" data-a="make">${esc(T.makeBtn)} →</button>`
        : `<span class="meta">${esc(pn ? f(T.dockN, { n: pn }) : T.dockSkip)}</span><button class="btn main" data-a="next">${esc(f(T.nextBtn, { s: next.short || next.title }))} →</button>`}
    </div></div>`;
  const on = $("#steps .sn.on"); if(on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
}
function updStepUI(){
  // 고를 때마다 아래 줄 숫자 · 위 단계 표시만 바꿔요 (화면 전체를 다시 그리면 스크롤이 튀어서)
  const steps = stepsOf(S), n = totalCount(S), pn = pickedCount(S), i = S.step, last = i === steps.length - 1;
  const m = $(".dock .meta"); if(m) m.textContent = last ? (n ? f(T.dockN, { n: pn }) : T.dockNone) : (pn ? f(T.dockN, { n: pn }) : T.dockSkip);
  const mk = $('.dock [data-a="make"]'); if(mk) mk.classList.toggle("wait", !n);
  $$("#steps .sn").forEach((b, j) => { if(steps[j]) b.classList.toggle("done", stepCount(S, steps[j]) > 0); });
}
function gotoStep(j){ const steps = stepsOf(S); S.step = clamp(j, 0, steps.length - 1); save(); go("step"); }
function make(){
  if(!totalCount(S)){ toast(T.makeNone, 3200); return; }
  go("out");
}
function toggleChip(b){
  const steps = stepsOf(S), st = steps[S.step];
  const r = rowsOf(S, st).find(x => x.id === b.dataset.r); if(!r) return;
  const id = b.dataset.id, sel = (S.pick[r.id] = S.pick[r.id] || []), i = sel.indexOf(id);
  const it = r.items.find(x => x.id === id);
  if(i >= 0) sel.splice(i, 1);
  else {
    if(!r.multi) sel.length = 0;
    // 같은 grp끼리는 하나만 (예: 속눈썹 "적게"와 "길게", 머리 길이)
    else if(it && it.grp) for(const o of r.items) if(o.grp === it.grp){ const j = sel.indexOf(o.id); if(j >= 0) sel.splice(j, 1); }
    sel.push(id);
  }
  if(!sel.length) delete S.pick[r.id];
  save();
  const box = b.closest(".row");
  if(box) box.querySelectorAll(".chip").forEach(c => { const on = (S.pick[r.id] || []).includes(c.dataset.id); c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); });
  // 고른 것에 따라 단계나 줄이 생기거나 없어지면 (예: "촬영 때 받아 봤어요" → "지난번과 바꿀 점") 다시 그려요
  const nowSteps = stepsOf(S), added = nowSteps.filter(s => !steps.includes(s));
  const stepsChanged = nowSteps.length !== steps.length || added.length > 0;
  const rowsChanged = rowsOf(S, st).map(x => x.id).join() !== $$(".pg .row").map(x => x.dataset.row).join();
  if(stepsChanged || rowsChanged){ const y = scrollY; renderStep(); scrollTo(0, y); if(added.length) toast(f(T.stepAdded, { s: added[0].short || added[0].title }), 3200); return; }
  updStepUI();
}

// ===== 참고 사진 단계 =====
function thumbHTML(p){
  const im = IMG.get(p.k), wide = p.w >= p.h;
  const dots = posPins(p).filter(filled).map(q => `<i style="left:${(q.x * 100).toFixed(2)}%;top:${(q.y * 100).toFixed(2)}%"></i>`).join("");
  return `<span class="im"><span class="fr" style="${wide ? `width:100%;aspect-ratio:${p.w}/${p.h}` : `height:100%;aspect-ratio:${p.w}/${p.h}`}">${im ? `<img src="${im.turl}" alt="" loading="lazy" draggable="false">` : ""}${dots}</span></span>`;
}
function photosHTML(){
  const ps = S.photos;
  return `
    ${ps.length ? `<div class="grid">
      ${ps.map((p, i) => { const n = marks(p); return `<button class="ph" data-a="open" data-k="${p.k}">${thumbHTML(p)}<span class="nm">${esc(f(T.phName, { i: i + 1 }))}</span><span class="st ${n ? "req" : "todo"}">${esc(n ? f(T.phMarks, { n }) : T.phNone)}</span></button>`; }).join("")}
      ${ps.length < MAXN ? `<button class="ph add" data-a="pick"><span class="im"><span class="plus">＋</span></span><span class="nm">${esc(T.addMore)}</span></button>` : ""}
    </div>` : `<button class="addbig" data-a="pick"><span class="plus">＋</span><b>${esc(T.addFirst)}</b><small>${esc(T.addFirstSub)}</small></button>`}
    <p class="trust in"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 016.8 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="7" width="10" height="7.2" rx="1.9" fill="currentColor"/></svg>${esc(T.trust)}</p>
    <ul class="hints">${T.photoHints.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`;
}
function toPhotos(){ const steps = stepsOf(S), j = steps.findIndex(s => s.kind === "photos"); if(j >= 0) S.step = j; save(); go("step"); }

// ===== 사진 한 장: 번호 찍기 =====
function openPhoto(k){
  ED = { k, pin: null };
  VIEW = { z: 1, tx: 0, ty: 0 };
  toast("");
  CUR = "edit"; trap();
  render(); save();
}
function renderEdit(){
  const p = ED && P(ED.k); if(!p){ toPhotos(); return; }
  document.body.className = "hm-body noscroll";
  app.className = "hm edit";
  const i = S.photos.indexOf(p), im = IMG.get(p.k);
  app.innerHTML = `
    <header class="tb ed-top">
      <button class="tbb txt" data-a="photos">‹ ${esc(T.backPhotos)}</button>
      <span class="ed-name"><small>${i + 1} / ${S.photos.length}</small><b>${esc(f(T.phName, { i: i + 1 }))}</b></span>
      <button class="zoom" data-a="zoom" id="zoomb">${esc(T.zoomIn)}</button>
      <button class="tbb" data-a="pmenu" aria-label="${esc(T.menuLabel)}">⋯</button>
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
  const cur = curPin();
  const px = cur && cur.x != null ? VIEW.tx + cur.x * L.bw : L.sw / 2, py = cur && cur.x != null ? VIEW.ty + cur.y * L.bh : L.sh / 2;
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
    if(e.type === "pointercancel"){ if(g.type === "drag"){ renderPins(); save(); } return; }
    if(g.type === "tap" && Date.now() - g.t < 800){
      if(g.pin) openPin(g.pin);
      else { const o = toPhoto(e.clientX, e.clientY); if(o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1) tapAt(o.x, o.y); }
    } else if(g.type === "drag"){ renderPins(); save(); }
  };
  st.addEventListener("pointerup", end);
  st.addEventListener("pointercancel", end);
  // 폰: 사진을 누른 뒤 따라오는 '클릭'이 방금 올라온 아래 칸의 버튼을 누르지 않게 막아요
  st.addEventListener("touchend", e => { if(e.cancelable) e.preventDefault(); GHOST = Date.now() + 450; }, { passive: false });
  st.addEventListener("wheel", e => {
    e.preventDefault();
    const r = st.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, VIEW.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)));
  }, { passive: false });
  if(window.ResizeObserver){ const ro = new ResizeObserver(() => { if(CUR === "edit" && $("#stage") === st){ layout(); ensureVisible(curPin()); } }); ro.observe(st); }
}
function curPin(){ const p = ED && P(ED.k); return p && ED.pin ? p.pins.find(q => q.id === ED.pin) : null; }
function dropEmpty(p){ const cur = curPin(); if(cur && !filled(cur)) p.pins = p.pins.filter(q => q !== cur); }
function tapAt(x, y){
  const p = P(ED.k), cur = curPin();
  if(cur && cur.x != null && !filled(cur)){ cur.x = x; cur.y = y; renderPins(); save(); return; }
  dropEmpty(p);
  const pin = { id: S.seq++, x, y, part: "", how: "like", note: "" };
  p.pins.push(pin); ED.pin = pin.id;
  renderPins(); renderPanel(); save();
  if(!S.tips.drag){ S.tips.drag = 1; toast(T.dragTip, 3600); }
}
function addWhole(){
  const p = P(ED.k);
  dropEmpty(p);
  const pin = { id: S.seq++, x: null, y: null, part: PARTS[S.who][0].id, how: "like", note: "" };
  p.pins.push(pin); ED.pin = pin.id;
  renderPins(); renderPanel(); save();
}
function openPin(id){
  const p = P(ED.k), cur = curPin();
  if(cur && cur.id !== id && !filled(cur)) p.pins = p.pins.filter(q => q !== cur);
  if(!p.pins.find(q => q.id === id)) return;
  ED.pin = id; renderPins(); renderPanel();
}
function closePin(){ const p = P(ED.k); dropEmpty(p); ED.pin = null; renderPins(); renderPanel(); save(); }
function deletePin(){
  const p = P(ED.k), cur = curPin(); if(!cur) return;
  const had = filled(cur), no = pinNo(p, cur);
  if(had) keep();
  p.pins = p.pins.filter(q => q !== cur); ED.pin = null;
  renderPins(); renderPanel(); save();
  if(had) toast(no ? f(T.pinDeleted, { n: no }) : T.pinDeletedW, 5000, T.undo, undo);
}
function markRow(p, q){
  const no = pinNo(p, q), text = pinLine(S, q);
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
    <div class="rows">${rows.map(q => markRow(p, q)).join("")}${rows.length ? `<p class="more">${esc(T.edMore)}</p>` : ""}</div>
    <div class="acts"><button class="cb" data-a="whole">＋ ${esc(T.whole)}</button></div>
    <div class="navs">
      <button class="btn ghost" data-a="photos">‹ ${esc(T.backPhotos)}</button>
      <button class="btn main" data-a="${last ? "photos" : "nextph"}">${esc(last ? T.photoDone : T.nextPhoto)} ›</button>
    </div>`;
}
function pinEditorHTML(p, pin){
  const whole = pin.x == null, no = pinNo(p, pin);
  return `
    <div class="pe-head"><b>${esc(whole ? T.wholeTitle : f(T.pinTitle, { n: no }))}</b><button class="tl" data-a="pindel">${esc(T.pinDel)}</button><button class="btn-s" data-a="pindone">${esc(T.pinDone)}</button></div>
    <div class="pe-top"><div class="pv"><small id="pvl">${esc(T.previewLabel)}</small><div id="pv"></div>
      <input type="text" id="pnote" value="${esc(pin.note || "")}" placeholder="${esc(T.notePh)}" aria-label="${esc(T.noteLabel)}" autocomplete="off" enterkeyhint="done"></div></div>
    <div class="pe-body">
      <p class="pe-q">${esc(T.partQ)}</p>
      <div class="chips" id="parts">${PARTS[S.who].map(it => `<button class="chip${pin.part === it.id ? " on" : ""}" data-a="part" data-id="${it.id}">${esc(it.chip)}</button>`).join("")}</div>
    </div>
    <div class="pe-foot"><div class="ln" id="hows"><span class="lb">${esc(T.howQ)}</span>${HOW.map(h => `<button class="chip sm${pin.how === h.id ? " on" : ""}" data-a="how" data-id="${h.id}">${esc(h.chip)}</button>`).join("")}</div></div>`;
}
function updPreview(){
  const pin = curPin(), pv = $("#pv"); if(!pin || !pv) return;
  const line = pin.part ? f(howOf(pin.how).s, { part: (partOf(S, pin.part).s || partOf(S, pin.part).chip) }) : "";
  pv.innerHTML = line ? `<p>${esc(line)}</p>` : `<p class="e">${esc(T.previewEmpty)}</p>`;
}
function navPhoto(d){
  const i = S.photos.findIndex(p => p.k === ED.k), j = i + d;
  if(j < 0 || j >= S.photos.length){ toPhotos(); return; }
  openPhoto(S.photos[j].k);
}
function removePhoto(){
  const p = P(ED.k); if(!p) return;
  keep();
  S.photos.splice(S.photos.indexOf(p), 1);
  closeOverlays(); save(); toPhotos();
  toast(T.removed, 5000, T.undo, undo);
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
function sheetText(doc){
  const a = [T.shHead, sheetTitle(doc), headBits(doc).join(" "), T.shPhotosNext, T.shPhotoAll, T.shSide, T.wholeTag, T.noteRow, T.shNothing, f(T.phName, { i: 1 })];
  for(const s of sections(doc)){ a.push(s.title); for(const r of s.rows) a.push(r.label, r.text); }
  for(const p of doc.photos) for(const q of p.pins) a.push(pinLine(doc, q));
  return a.join(" ") + "0123456789 /·()—";
}
async function fontsFor(text){
  if(!document.fonts || !document.fonts.load) return;
  const job = Promise.all([500, 700, 900].map(w => document.fonts.load(`${w} 32px 'Noto Sans KR'`, text).catch(() => null)));
  await Promise.race([job, new Promise(r => setTimeout(r, 2500))]);
}
function sheetHead(x, W, M, title, page, doc){
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillStyle = PINK; x.font = `700 28px ${FONT}`; x.fillText(T.shHead, M, 92);
  x.fillStyle = "#8A8A8A"; x.font = `500 26px ${FONT}`; x.textAlign = "right"; x.fillText(page, W - M, 92); x.textAlign = "left";
  x.fillStyle = "#161616"; x.font = `900 52px ${FONT}`; x.fillText(fitText(x, title, W - M * 2), M, 158);
  // 한 덩어리(예: "함께 받음: 신랑")는 줄이 바뀌어도 쪼개지지 않게 띄어쓰기를 붙은 칸으로
  const bits = headBits(doc).map(t => t.replace(/ /g, "\u00A0"));
  x.font = `500 28px ${FONT}`;
  const lines = wrap(x, bits.join("  ·  ") || "", W - M * 2);
  x.fillStyle = "#555555"; lines.forEach((ln, k) => x.fillText(ln, M, 204 + k * 40));
  return 204 + Math.max(0, lines.length - 1) * 40 + 40;
}
function rrect(x, l, t, w, h, r){ x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function noBadge(x, cx, cy, r, label, whole){
  x.fillStyle = PINK;
  if(whole){ const w = r * 3.3; rrect(x, cx - r, cy - r, w, r * 2, r); x.fill(); x.fillStyle = "#fff"; x.font = `700 ${Math.round(r * 0.95)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, cx - r + w / 2, cy + 1); }
  else { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.fillStyle = "#fff"; x.font = `900 ${Math.round(r * 1.15)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, cx, cy + 1); }
  x.textAlign = "left"; x.textBaseline = "alphabetic";
}
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
// 첫 장: 고른 것 전부 (묶음마다 왼쪽 이름 · 오른쪽 내용). 꼭 알아야 할 것 · 하지 말 것은 색 상자로.
const BOX = { care: { bg: "#FFF4E0", line: "#E0A030", head: "#9A5B00" }, dont: { bg: "#FDECF2", line: "#E58AAE", head: PINK }, redo: { bg: "#EEF3FF", line: "#8EA6E0", head: "#2F4FA0" } };
async function sheetMain(doc, n, opt = {}){
  const W = SHEET_W, M = 64, m = mctx(), LW = 214, TX = M + LW + 20, LH = 46;
  const secs = sections(doc), blocks = [];
  m.font = `500 32px ${FONT}`;
  for(const s of secs){
    const bx = BOX[s.box], pad = bx ? 26 : 0;
    const rows = s.rows.map(r => { m.font = `700 27px ${FONT}`; const ll = wrap(m, r.label, LW - pad); m.font = `500 32px ${FONT}`; const tl = wrap(m, r.text, W - M - TX - pad); return { ll, tl, h: Math.max(tl.length * LH, ll.length * 36) + 20 }; });
    const h = 62 + rows.reduce((a, r) => a + r.h, 0) + (bx ? 34 : 14);
    blocks.push({ s, bx, rows, h });
  }
  const photos = outPhotos(doc);
  const tail = photos.length ? 70 : 0;
  const m2 = mctx(); m2.font = `500 28px ${FONT}`;
  const top0 = 236 + Math.max(0, wrap(m2, headBits(doc).map(t => t.replace(/ /g, "\u00A0")).join("  ·  "), W - M * 2).length - 1) * 40;
  let H = top0 + 30 + blocks.reduce((a, b) => a + b.h + 18, 0) + tail + 40;
  const nothing = !blocks.length && !photos.length;   // 사진 표시만 했으면 "고른 것이 없어요"를 쓰지 않아요
  if(nothing) H += 80;
  if(opt.crop) H = Math.min(H, opt.crop);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  let y = sheetHead(x, W, M, sheetTitle(doc), f(T.shPage, { i: 1, n }), doc) + 30;
  if(nothing){ x.fillStyle = "#5C5C5C"; x.font = `500 32px ${FONT}`; x.fillText(T.shNothing, M, y + 40); y += 80; }
  for(const b of blocks){
    const { s, bx, rows } = b, inset = bx ? 26 : 0;
    if(bx){ x.fillStyle = bx.bg; rrect(x, M - 10, y, W - M * 2 + 20, b.h, 22); x.fill(); x.fillStyle = bx.line; x.fillRect(M - 10, y + 18, 6, b.h - 36); }
    x.fillStyle = bx ? bx.head : PINK; x.font = `900 32px ${FONT}`; x.fillText(s.title, M + inset, y + (bx ? 52 : 40));
    let yy = y + (bx ? 74 : 60);
    if(!bx){ x.fillStyle = "#EEEEEE"; x.fillRect(M, y + 54, W - M * 2, 2); }
    for(const r of rows){
      x.fillStyle = "#7A7A7A"; x.font = `700 27px ${FONT}`; r.ll.forEach((ln, k) => x.fillText(ln, M + inset, yy + 34 + k * 36));
      x.fillStyle = "#161616"; x.font = `500 32px ${FONT}`; r.tl.forEach((ln, k) => x.fillText(ln, TX, yy + 34 + k * LH));
      yy += r.h;
    }
    y += b.h + 18;
  }
  if(photos.length){ x.fillStyle = "#5C5C5C"; x.font = `700 28px ${FONT}`; x.fillText(f(T.shPhotosNext, { n: photos.length }), M, y + 40); }
  if(opt.crop && H === opt.crop){ const g = x.createLinearGradient(0, H - 160, 0, H); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "#fff"); x.fillStyle = g; x.fillRect(0, H - 160, W, 160); }
  return pageOut(c, f(T.fileImg, { i: pad(1), name: T.fileMain }));
}
async function sheetPhoto(doc, p, i, n, opt = {}){
  const W = SHEET_W, M = 64, cw = W - M * 2, m = mctx();
  const pins = p.pins.filter(filled), pos = pins.filter(q => q.x != null), whole = pins.filter(q => q.x == null);
  const rows = [...pos.map((q, j) => ({ tag: String(j + 1), text: pinLine(doc, q) })), ...whole.map(q => ({ tag: T.wholeTag, whole: true, text: pinLine(doc, q) }))];
  if(!rows.length) rows.push({ tag: "", plain: true, text: T.shPhotoAll });
  const LH = 50; m.font = `500 34px ${FONT}`;
  for(const r of rows){ r.tx = M + (r.plain ? 0 : r.whole ? 116 : 76); r.lines = wrap(m, r.text, W - M - r.tx); r.h = Math.max(r.lines.length * LH, 56) + 18; }
  const s = Math.min(cw / p.w, 1180 / p.h), iw = Math.round(p.w * s), ih = Math.round(p.h * s);
  const top = 236, rowsH = rows.reduce((a, r) => a + r.h, 0), H = top + ih + 46 + rowsH + 38;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  // 사진 장은 위 작은 줄 대신 "참고 사진 1"
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillStyle = PINK; x.font = `700 28px ${FONT}`; x.fillText(T.shHead, M, 92);
  x.fillStyle = "#8A8A8A"; x.font = `500 26px ${FONT}`; x.textAlign = "right"; x.fillText(f(T.shPage, { i, n }), W - M, 92); x.textAlign = "left";
  x.fillStyle = "#161616"; x.font = `900 52px ${FONT}`; x.fillText(fitText(x, f(T.phName, { i: i - 1 }), W - M * 2), M, 158);
  x.fillStyle = "#555555"; x.font = `500 28px ${FONT}`; x.fillText(fitText(x, sheetTitle(doc), W - M * 2), M, 204);
  const ix = Math.round((W - iw) / 2);
  x.fillStyle = "#F1F1F1"; x.fillRect(M, top, cw, ih);
  let src = opt.src, own = false;
  if(!src){ src = await decode(IMG.get(p.k).blob); own = true; }
  x.imageSmoothingQuality = "high"; x.drawImage(src, ix, top, iw, ih);
  if(own && src.close) src.close();
  pos.forEach((q, j) => drawMark(x, ix + q.x * iw, top + q.y * ih, j + 1));
  let y = top + ih + 46;
  for(const r of rows){
    if(!r.plain) noBadge(x, M + 26, y + 26, 26, r.tag, r.whole);
    x.fillStyle = r.plain ? "#5C5C5C" : "#161616"; x.font = `500 34px ${FONT}`;
    r.lines.forEach((ln, k) => x.fillText(ln, r.tx, y + 38 + k * LH));
    y += r.h;
  }
  return pageOut(c, f(T.fileImg, { i: pad(i), name: f(T.phName, { i: i - 1 }).replace(/\s+/g, "") }));
}

// ===== 카톡 · 문자에 붙일 글 =====
function outText(doc = S){
  const a = [], bits = headBits(doc);
  a.push(f(T.txHead, { title: sheetTitle(doc) }) + (bits.length ? "\n" + bits.join(" · ") : ""));
  a.push("", T.txHello);
  for(const s of sections(doc)){
    a.push("", "■ " + s.title);
    for(const r of s.rows) a.push(`- ${r.label}: ${r.text}`);
  }
  const ps = outPhotos(doc);
  if(ps.length){
    a.push("", f(T.txPhotos, { n: ps.length }));
    const circ = n => n <= 20 ? String.fromCharCode(0x245F + n) : `(${n})`;
    ps.forEach((p, i) => {
      const pins = p.pins.filter(filled), pos = pins.filter(q => q.x != null), whole = pins.filter(q => q.x == null);
      const parts = pins.length ? [...pos.map((q, j) => circ(j + 1) + " " + pinLine(doc, q)), ...whole.map(q => `[${T.wholeTag}] ` + pinLine(doc, q))] : [T.shPhotoAll];
      a.push(f(T.phName, { i: i + 1 }) + " : " + parts.join(" "));
    });
  }
  a.push("", T.txTail);
  return a.join("\n");
}

// ===== PDF · ZIP (라이브러리 없이 직접 써요) =====
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
  document.body.className = "hm-body";
  app.className = "hm out";
  const ps = outPhotos(S), touch = isTouch(), n = pickedCount(S);
  app.innerHTML = `
    ${topBar(`<button class="tbb txt" data-a="${DEMO ? "home" : "back"}">‹ ${esc(DEMO ? T.home : T.editBack)}</button>`, `<b>${esc(f(T.docName, { who: whoName(S.who) }))}</b>`, DEMO ? "" : `<button class="tbb" data-a="menu" aria-label="${esc(T.menuLabel)}">⋯</button>`)}
    <div class="pg narrow">
      ${DEMO ? `<div class="demo"><b>${esc(T.exBanner)}</b><div class="ln">${["b", "g"].map(w => `<button class="chip sm${S.who === w ? " on" : ""}" data-a="demowho" data-w="${w}">${esc(f(T.exWho, { who: whoName(w) }))}</button>`).join("")}</div>
        <div class="demo-go">${["b", "g"].map(w => `<button class="btn ${w === "b" ? "insta" : "ghost"}" data-a="start" data-w="${w}">${esc(f(T.startBtn, { who: whoName(w) }))}</button>`).join("")}</div></div>` : ""}
      <h1 class="h">${esc(DEMO ? T.exTitleOut : T.outTitle)}</h1>
      <p class="sub">${esc(f(ps.length ? T.outSubPh : T.outSub, { n, p: ps.length }))}</p>
      <div class="strip" id="strip"><p class="busy" id="obusy"></p></div>
      <p class="mini">${esc(T.tapBig)}</p>
      <div class="btns">
        <button class="btn insta" data-a="imgs" id="bimg" disabled>${esc(ps.length ? f(touch ? T.imgSendN : T.imgBtnN, { n: ps.length + 1 }) : (touch ? T.imgSend : T.imgBtn))}</button>
        <button class="btn ghost" data-a="pdf" id="bpdf" disabled>${esc(touch ? T.pdfBtn : T.pdfBtnPc)}</button>
        <button class="btn ghost" data-a="copy">${esc(T.txtBtn)}</button>
      </div>
      <p class="msg" id="msg"></p>
      <section class="bx open"><h2>${esc(T.checkTitle)}</h2><div class="cks plain">${CHECKS.map(c => `<label class="ck"><input type="checkbox"><i>${CHECK}</i><span>${esc(c)}</span></label>`).join("")}</div></section>
      <details class="bx"><summary>${esc(T.txtTitle)}</summary>
        <textarea id="msgtxt" readonly rows="12">${esc(outText())}</textarea>
        <p class="vend">${esc(T.outVendor)}</p>
      </details>
      <section class="bx open"><h2>${esc(T.tipsTitle)}</h2><ol class="tips">${TIPS.map(c => `<li>${esc(c)}</li>`).join("")}</ol></section>
      ${DEMO ? "" : `<p class="again">${esc(T.again)}</p>`}
      ${sign()}
    </div>`;
  buildOut();
}
async function buildOut(){
  const gen = ++OUT.gen, doc = S, ps = outPhotos(doc), n = ps.length + 1;
  for(const pg of OUT.pages) if(pg.url) URL.revokeObjectURL(pg.url);
  OUT.pages = []; OUT.pdf = null; OUT.busy = true;
  const setBusy = d => { const b = $("#obusy"); if(b) b.textContent = f(T.outBusy, { d, n }); };
  setBusy(0);
  try {
    await fontsFor(sheetText(doc));
    const pages = [await sheetMain(doc, n)];
    setBusy(1);
    for(let i = 0; i < ps.length; i++){
      if(gen !== OUT.gen) return;
      pages.push(await sheetPhoto(doc, ps[i], i + 2, n));
      setBusy(i + 2);
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
  start(b){ start(b.dataset.w); },
  demo(){ startDemo("b"); },
  demowho(b){ startDemo(b.dataset.w); },
  back(){ backStep(); },
  home(){ goHome(); },
  menu(){ openMenu([["home", T.menuHome], ["new", f(T.menuNew, { who: whoName(S.who) })]]); },
  pmenu(){ openMenu([["rmphoto", T.removePhoto]]); },
  new(){ closeOverlays(); const w = S.who; sheet({ title: f(T.newTitle, { who: whoName(w) }), body: T.newBody, yes: T.newYes, no: T.cancel, onYes: async () => { await wipeDoc(w); start(w); } }); },
  close(){ closeOverlays(); },
  goto(b){ gotoStep(+b.dataset.i); },
  next(){ gotoStep(S.step + 1); },
  make,
  chip(b){ toggleChip(b); },
  pick(){ $("#file").click(); },
  open(b){ openPhoto(b.dataset.k); },
  photos(){ toPhotos(); },
  nextph(){ navPhoto(1); },
  zoom(){ toggleZoom(); },
  whole(){ addWhole(); },
  pin(b){ openPin(+b.dataset.id); },
  pindone(){ closePin(); },
  pindel(){ deletePin(); },
  rmphoto(){ removePhoto(); },
  part(b){ const pin = curPin(); if(!pin) return; pin.part = pin.part === b.dataset.id && pin.x != null ? "" : b.dataset.id; $$("#parts .chip").forEach(c => c.classList.toggle("on", c.dataset.id === pin.part)); updPreview(); save(); },
  how(b){ const pin = curPin(); if(!pin) return; pin.how = b.dataset.id; $$("#hows .chip").forEach(c => c.classList.toggle("on", c === b)); updPreview(); save(); },
  imgs(){ if(OUT.pages.length) shareOrSave(OUT.pages.map(pageFile), f(T.fileZip, { d: todayStr() })); },
  pdf(){ if(OUT.pdf) shareOrSave([OUT.pdf]); },
  copy(){ copyOut(); },
  big(b){ openBig(+b.dataset.i); },
  one(b){ const pg = OUT.pages[+b.dataset.i]; if(pg) shareOrSave([pageFile(pg)]); }
};

function inputs(){
  const fi = document.createElement("input"); fi.type = "file"; fi.id = "file"; fi.accept = "image/*"; fi.multiple = true; fi.hidden = true;
  fi.addEventListener("change", async () => { const list = [...fi.files]; fi.value = ""; if(list.length && S) await addFiles(list); });
  document.body.appendChild(fi);
  document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(!b || b.disabled) return; if(Date.now() < GHOST && !b.closest("#stage")){ e.preventDefault(); return; } const fn = ACT[b.dataset.a]; if(fn) fn(b, e); });
  document.addEventListener("input", e => {
    const t = e.target; if(!S) return;
    if(t.id === "pnote"){ const pin = curPin(); if(pin){ pin.note = t.value; save(); } }
    else if(t.id === "note"){ S.notes[t.dataset.s] = t.value; save(); updStepUI(); }
    else if(t.dataset && t.dataset.f){ S.info[t.dataset.f] = t.value; save(); updStepUI(); }
  });
  document.addEventListener("keydown", e => {
    const inField = /^(INPUT|TEXTAREA)$/.test((e.target.tagName || ""));
    const sh = $("#sheet");
    if(e.key === "Escape"){ if($(".ov")){ closeOverlays(); return; } if(CUR === "edit"){ if(inField) e.target.blur(); else if(ED.pin) closePin(); else if(VIEW.z > 1.01) toggleZoom(); else toPhotos(); } return; }
    if(e.key === "Enter" && !e.isComposing){
      if(sh && sh._yes){ e.preventDefault(); sh._yes(); return; }
      if(CUR === "edit" && ED.pin && (!inField || e.target.id === "pnote")){ e.preventDefault(); if(inField) e.target.blur(); closePin(); return; }
      if(inField && e.target.tagName === "INPUT"){ e.preventDefault(); e.target.blur(); }
      return;
    }
    if(inField || $(".ov")) return;
    if((e.metaKey || e.ctrlKey) && e.code === "KeyZ" && !e.shiftKey){ if(UNDO.length){ e.preventDefault(); undo(); } return; }
    if(CUR === "edit" && (e.key === "Delete" || e.key === "Backspace") && ED.pin){ e.preventDefault(); deletePin(); }
  });
  // 노트북: 사진을 화면에 끌어다 놓기 (참고 사진 단계 · 사진 화면에서만)
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
  const canDrop = () => S && !DEMO && (CUR === "edit" || (CUR === "step" && stepsOf(S)[S.step].kind === "photos"));
  let dragN = 0;
  document.addEventListener("dragenter", e => { if(!hasFiles(e) || !canDrop()) return; e.preventDefault(); dragN++; document.body.classList.add("dropping"); document.body.dataset.drop = T.dropNow; });
  document.addEventListener("dragover", e => { if(hasFiles(e)) e.preventDefault(); });
  document.addEventListener("dragleave", e => { if(!hasFiles(e)) return; dragN = Math.max(0, dragN - 1); if(!dragN) document.body.classList.remove("dropping"); });
  document.addEventListener("drop", async e => {
    if(!hasFiles(e)) return; e.preventDefault(); dragN = 0; document.body.classList.remove("dropping");
    if(!canDrop()) return;
    const list = [...e.dataTransfer.files]; if(list.length) await addFiles(list);
  });
  addEventListener("resize", () => { if(CUR === "edit") layout(); });
  addEventListener("popstate", () => { TRAP = false; if(CUR === "cover" || CUR === "soon") return; backStep(); if(CUR !== "cover") trap(); });
  addEventListener("pagehide", () => saveNow());
  document.addEventListener("visibilitychange", () => { if(document.hidden) saveNow(); });
}

async function boot(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ renderSoon(); return; }
  inputs();
  try {
    const imgs = await DB.all("img");
    for(const w of ["b", "g"]){
      const d = await DB.get("kv", "doc." + w);
      if(!d || d.who !== w) continue;
      d.photos = (d.photos || []).filter(p => imgs.has(p.k) && imgs.get(p.k) && imgs.get(p.k).b);
      for(const p of d.photos){ const v = imgs.get(p.k); IMG.set(p.k, { blob: v.b, url: URL.createObjectURL(v.b), turl: URL.createObjectURL(v.t || v.b) }); }
      DOCS[w] = Object.assign(blank(w), d);
    }
  } catch (e) { STORE_OK = false; }
  renderCover();
}
window.__hm = { get CUR(){ return CUR; }, get S(){ return S; }, get DOCS(){ return DOCS; }, get OUT(){ return OUT; }, get ED(){ return ED; }, get DEMO(){ return DEMO; }, outText, sections, headBits, totalCount, stepsOf, go, start, tapAt, addFiles, openPhoto };
boot();
