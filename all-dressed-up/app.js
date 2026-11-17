// 드레스 투어 기록 카드 ㊹: 사진 못 찍는 드레스 투어를 동행(신랑 · 가족 · 친구)이 눌러서 적고, 반응은 녹음으로 남겨요.
// 드레스마다 고른 특징대로 그림 카드가 생기고, 모아 보고, 후보를 이미지 · 글로 보내요. 추천은 하지 않아요.
// 문구 · 선택지 text.js · 그림 draw.js(DR) · 녹음 rec.js(REC) · 공통 기능 shared/common.js · 조사 docs/드레스-투어/조사/
// 적은 내용(localStorage)과 녹음(IndexedDB)은 이 기기에만 있어요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/all-dressed-up/?preview)
const OPEN = false;
// =========================================================

const KEY = "allDressedUp.v1";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const ANDROID = /Android/i.test(navigator.userAgent || "");
const FMAP = new Map(F.map(f => [f.id, f]));
const optsOf = f => f.groups ? f.groups.flatMap(g => g[1]) : f.opts;
const labelOf = (fid, v) => { const f = FMAP.get(fid); const o = f && optsOf(f).find(x => x[0] === v); return o ? o[1] : ""; };
const REACTS = new Map(REACT.map(r => [r[0], r]));

// ===== 저장 =====
function blank(){ return { v: 1, shops: [], dresses: [], seq: 0, askI: 0, recIntro: false }; }
const arr = (x, n) => Array.isArray(x) ? x.filter(v => typeof v === "string").slice(0, n || 30) : [];
const str = (x, n) => typeof x === "string" ? x.slice(0, n) : x == null ? "" : String(x).slice(0, n);
function cleanShop(s, id){
  const o = x => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
  return { id, name: str(s.name, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || "") ? s.date : "", staff: str(s.staff, 30), fee: str(s.fee, 12).replace(/[^\d]/g, ""), perk: str(s.perk, 300), memo: str(s.memo, 600), style: arr(s.style, 6), feel: Object.assign({}, o(s.feel)), leave: Object.assign({}, o(s.leave)), at: +s.at || 0 };
}
function cleanA(a){
  const out = {};
  if(!a || typeof a !== "object") return out;
  F.forEach(f => {
    const v = a[f.id];
    if(f.one){ if(typeof v === "string" && optsOf(f).some(o => o[0] === v)) out[f.id] = v; }
    else { const ok = arr(v).filter(x => optsOf(f).some(o => o[0] === x)); if(ok.length) out[f.id] = ok; }
  });
  return out;
}
function cleanDress(d, id){
  return { id, shop: +d.shop || 0, no: +d.no || 1, a: cleanA(d.a), bride: REACTS.has(d.bride) ? d.bride : "", me: REACTS.has(d.me) ? d.me : "", pick: !!d.pick, hold: !!d.hold, extra: str(d.extra, 6).replace(/[^\d]/g, ""), dname: str(d.dname, 40), memo: str(d.memo, 600), at: +d.at || 0 };
}
function fill(x){
  const b = blank();
  b.shops = (Array.isArray(x.shops) ? x.shops : []).filter(s => s && typeof s === "object" && +s.id > 0).map(s => cleanShop(s, +s.id));
  const ids = new Set(b.shops.map(s => s.id));
  b.dresses = (Array.isArray(x.dresses) ? x.dresses : []).filter(d => d && typeof d === "object" && +d.id > 0 && ids.has(+d.shop)).map(d => cleanDress(d, +d.id));
  b.seq = Math.max(+x.seq || 0, ...b.shops.map(s => s.id), ...b.dresses.map(d => d.id), 0);
  b.askI = +x.askI || 0; b.recIntro = !!x.recIntro;
  return b;
}
let canStore = true;
try { localStorage.setItem(KEY + ".t", "1"); localStorage.removeItem(KEY + ".t"); } catch (e) { canStore = false; }
function loadS(){ try { const x = JSON.parse(localStorage.getItem(KEY)); return x && x.v === 1 ? fill(x) : null; } catch (e) { return null; } }
let MINE = loadS() || blank();
let S = MINE;
const isDemo = () => S !== MINE;
let storeWarned = false, saveT = 0;
function saveS(){
  clearTimeout(saveT); saveT = 0;
  if(isDemo()) return;
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { canStore = false; if(!storeWarned){ storeWarned = true; toast(T.storeFail); } }
}
function saveSoon(){ clearTimeout(saveT); saveT = setTimeout(saveS, 250); }
window.addEventListener("pagehide", () => { if(saveT) saveS(); });
document.addEventListener("visibilitychange", () => { if(document.hidden && saveT) saveS(); });
function demoState(){
  const d = blank();
  SAMPLE.shops.forEach((s, i) => d.shops.push(cleanShop(Object.assign({ date: todayYmd(), at: i + 1 }, s), ++d.seq)));
  const cnt = {};
  SAMPLE.dresses.forEach((x, i) => { const sh = d.shops[x.shop].id; cnt[sh] = (cnt[sh] || 0) + 1; d.dresses.push(cleanDress(Object.assign({}, x, { shop: sh, no: cnt[sh], at: i + 1 }), ++d.seq)); });
  return d;
}

// ===== 샵 · 드레스 =====
const shopById = id => S.shops.find(s => s.id === +id) || null;
const dressById = id => S.dresses.find(d => d.id === +id) || null;
const dressesOf = sid => S.dresses.filter(d => d.shop === +sid).sort((a, b) => a.no - b.no);
const shopName = s => s ? (s.name || fm(T.shopNameDef, { n: S.shops.indexOf(s) + 1 })) : "";
const dressTitle = d => fm(T.dressN, { n: d.no });
function addShop(name, date){
  const s = cleanShop({ name, date: date || todayYmd(), at: Date.now() }, ++S.seq);
  S.shops.push(s); saveS(); return s;
}
function addDress(sid){
  const no = Math.max(0, ...dressesOf(sid).map(d => d.no)) + 1;
  const d = cleanDress({ shop: sid, no, at: Date.now() }, ++S.seq);
  S.dresses.push(d); saveS(); return d;
}
// 고른 특징을 짧은 말로 (카드 · 이미지 · 글)
function tagsOf(d, full){
  const a = d.a, out = [];
  const one = id => { const v = a[id]; return v ? labelOf(id, v) : ""; };
  const many = id => (a[id] || []).map(v => labelOf(id, v)).filter(Boolean);
  if(a.sil) out.push(one("sil"));
  if(a.neck) out.push(one("neck"));
  if(a.slv && a.slv !== "none") out.push(one("slv"));
  out.push(...many("slvx"));
  out.push(...many("fab"));
  if(a.shine && a.shine !== "0") out.push("반짝임 " + one("shine"));
  out.push(...(a.deco || []).filter(v => v !== "plain").map(v => labelOf("deco", v)));
  if(full){ if((a.deco || []).includes("plain")) out.push(labelOf("deco", "plain")); out.push(...many("decoAt").map(x => "장식 " + x)); out.push(...many("pat")); out.push(...many("waist").map(x => "허리 " + x)); }
  if(a.train && a.train !== "0") out.push("뒷자락 " + one("train"));
  if(a.color) out.push(one("color"));
  out.push(...many("back").map(x => "등 " + x));
  return out.filter(Boolean);
}
function moodOf(d){ return (d.a.mood || []).map(v => labelOf("mood", v)); }
function reactText(v){ const r = REACTS.get(v); return r ? `${r[1]} ${r[2]}` : ""; }

// ===== 작은 도구 =====
function todayYmd(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dateShort(ymd){ if(!ymd) return ""; const [, m, d] = ymd.split("-"); return `${+m}.${+d}`; }
function timeOf(ms){ const d = new Date(ms); const h = d.getHours(); return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${pad(d.getMinutes())}`; }
function lenText(sec){ sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m ? fm(T.recLen, { m, s }) : fm(T.recLenS, { s }); }
function clock(sec){ sec = Math.max(0, Math.floor(sec)); return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`; }
const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function toast(text, undoFn){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(text)}</span>${undoFn ? `<button type="button" id="toastUndo">${esc(T.undo)}</button>` : ""}`;
  el.classList.toggle("act", !!undoFn);
  if(undoFn) el.querySelector("#toastUndo").onclick = () => { el.classList.remove("on"); undoFn(); };
  el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), undoFn ? 5600 : 2600);
}
function inApp(){
  const ua = navigator.userAgent || "";
  if(/Instagram/i.test(ua)) return "인스타그램";
  if(/KAKAOTALK/i.test(ua)) return "카카오톡";
  if(/NAVER\(inapp/i.test(ua)) return "네이버";
  if(/FBAN|FBAV/i.test(ua)) return "페이스북";
  if(/ Line\//i.test(ua)) return "라인";
  return "";
}
async function shareOrSave(file, doneText){
  const touch = matchMedia("(pointer:coarse)").matches;
  if(touch && navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file] }); return true; }
    catch (e) { if(e && e.name === "AbortError") return false; }
  }
  const url = URL.createObjectURL(file), a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  if(doneText) toast(doneText);
  return true;
}
async function copyText(text, doneText){
  try { await navigator.clipboard.writeText(text); toast(doneText); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
    ta.remove(); toast(ok ? doneText : T.copyFail); return ok;
  }
}
const fileSafe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 30);

// ===== 화면 이동 (휴대폰 뒤로 가기 = 이전 화면) =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
const SCREENS = { home: () => home(), tour: () => tour(), shop: a => shopScreen(a), dress: a => dressScreen(a), all: () => allScreen() };
let CUR = "home", ARG = null;
function show(sc, arg){
  closeSheet(); stopPlay();
  if(saveT) saveS();
  if(!SCREENS[sc]) sc = "home";
  if(sc === "shop" && !shopById(arg)) sc = "tour";
  if(sc === "dress" && !dressById(arg)) sc = "tour";
  CUR = sc; ARG = arg == null ? null : arg;
  SCREENS[sc](ARG);
  renderBar();
}
function depth(){ return (history.state && history.state.d) || 0; }
function go(sc, arg, how){
  const st = { sc, arg: arg == null ? null : arg, d: how === "replace" ? depth() : depth() + 1 };
  how === "replace" ? history.replaceState(st, "") : history.pushState(st, "");
  show(sc, arg);
  window.scrollTo(0, 0);
}
function back(fallback, arg){ if(depth() > 0) history.back(); else go(fallback, arg, "replace"); }
let skipPop = false, afterPop = null;
window.addEventListener("popstate", e => {
  const st = e.state;
  if(skipPop){ skipPop = false; return; }
  if(afterPop){ const f = afterPop; afterPop = null; closeSheet(); f(); return; }
  if(document.getElementById("sheet")){ closeSheet(); return; }
  if(st && st.sheet){ skipPop = true; history.back(); return; }
  if(!st || !st.sc || st.sc === "home"){ if(isDemo()) S = MINE; show("home"); return; }
  show(st.sc, st.arg);
});

// ===== 아래에서 올라오는 창 =====
function openSheet(html, label, opts){
  opts = opts || {};
  const had = !!document.getElementById("sheet");
  closeSheet();
  const tt = document.getElementById("toast"); if(tt) tt.classList.remove("on");
  if(!had) history.pushState(Object.assign({}, history.state, { sheet: true }), "");
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label || "");
  sh.innerHTML = html + (opts.foot != null ? opts.foot : `<div class="sheet-x"><button class="btn ghost" id="sheetX">${esc(opts.close || T.close)}</button></div>`);
  document.body.appendChild(bg); document.body.appendChild(sh);
  bg.onclick = opts.noClose ? null : dismissSheet;
  const x = sh.querySelector("#sheetX"); if(x) x.onclick = dismissSheet;
  sh.scrollTop = 0;
  return sh;
}
function closeSheet(){ ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); }); }
function dismissSheet(){ if(history.state && history.state.sheet) history.back(); else closeSheet(); }
function closeThen(f){ if(history.state && history.state.sheet){ afterPop = f; history.back(); } else { closeSheet(); f(); } }
document.addEventListener("keydown", e => { if(e.key === "Escape" && document.getElementById("sheet")) dismissSheet(); });

// 인스타 · 카톡 안에서 열었을 때: 녹음이 안 될 수 있고 기록이 그 안에만 남아서, 사파리 · 크롬에서 열도록 먼저 권해요
function inAppBox(why){
  const ia = inApp(), app2 = ANDROID ? "크롬" : "사파리", kakao = ia === "카카오톡";
  const intent = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
  return `<p>${esc(fm(why, { from: ia, app: app2 }))}</p>
    <div class="btns">
      ${ANDROID ? `<a class="btn main" href="${esc(intent)}">${esc(T.iaOpenChrome)}</a>` : kakao ? `<a class="btn main" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">${esc(T.iaOpenSafari)}</a>` : ""}
      <button class="btn ${ANDROID || kakao ? "ghost" : "main"}" data-a="iaCopy">${esc(T.iaCopy)}</button>
    </div>
    ${!ANDROID && !kakao ? `<p class="note small">${esc(T.iaHow)}</p>` : ""}
    <p class="msg" id="iaMsg" role="status"></p>`;
}
function inAppSheet(then){
  const ia = inApp();
  if(!ia || inAppSheet.ok){ then(); return; }
  const app2 = ANDROID ? "크롬" : "사파리";
  openSheet(`<h3>${esc(fm(T.iaTitle, { app: app2 }))}</h3>${inAppBox(T.iaBody)}<button class="text-btn center" data-a="iaStay">${esc(T.iaStay)}</button>`, T.name, { foot: "", noClose: true });
  inAppSheet.then = then;
}

function keepOffline(){ if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {}); }
function page(cls, inner){
  document.body.classList.remove("is-cover");
  app.className = "bk " + cls;
  app.innerHTML = inner;
}
function topBar(backLabel, title, right){
  return `<div class="bk-top">
    <button class="home" data-a="back">${esc(T.back)} ${esc(backLabel)}</button>
    <div class="bk-title">${title}</div>
    ${right || '<span class="bk-gap"></span>'}
  </div>${isDemo() ? `<div class="band demo"><span>${esc(T.demoBand)}</span><button data-a="demoExit">${esc(T.demoExit)}</button></div>` : ""}`;
}
function svgOf(d, opt){ return DR.svg(d.a, Object.assign({ seed: d.id * 7 + 3, uid: "x" + d.id + (opt && opt.k || "") }, opt || {})); }
function reactBadge(d){
  const r = REACTS.get(d.bride);
  return r ? `<span class="rb" title="${esc(T.bride)} ${esc(r[2])}">${r[1]}</span>` : "";
}

// ===== 첫 화면 =====
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
function exampleHtml(){
  const d = demoState(), keep = S; S = d;
  const ds = [d.dresses[0], d.dresses[3]];
  const html = `<div class="ex" aria-hidden="true">
    <div class="ex-h"><span>${esc(T.allTitle)}</span><b>${esc(T.exTag)}</b></div>
    <div class="ex-row">${ds.map(x => `<div class="ex-card">
      <div class="ex-pic">${svgOf(x, { k: "ex" })}</div>
      <b>${esc(shopName(shopById(x.shop)))} · ${esc(dressTitle(x))}</b>
      <span class="ex-r">${esc(T.bride)} ${reactText(x.bride)}</span>
      <span class="ex-t">${esc(tagsOf(x).slice(0, 4).join(" · "))}</span>
    </div>`).join("")}</div>
  </div>`;
  S = keep;
  return html;
}
function home(){
  S = MINE;
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  const ns = MINE.shops.length, nd = MINE.dresses.length;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${esc(T.title).replace(/\n/g, "<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${ns ? `<button class="main-go" data-a="resume"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeSub, { s: ns, d: nd }))}</span></button>
        ${nd ? `<button data-a="toAll"><span>${esc(T.seeAll)}</span></button>` : ""}`
      : `<button class="main-go" data-a="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startSub)}</span></button>
        <button data-a="demo"><span>${esc(T.demo)}</span></button>`}
      <button data-a="guide"><span>${esc(T.guideBtn)}</span></button>
    </div>
    ${exampleHtml()}
    <div class="lock">${LOCK}<span><b>${esc(T.lockT)}</b>${esc(T.lockB)}</span></div>
    ${ns ? `<button class="text-btn cover-link" data-a="demo">${esc(T.demo)}</button>` : ""}
    ${foot()}`;
}

// ===== 샵 목록 =====
function tour(){
  const shops = S.shops.slice().sort((a, b) => a.at - b.at), nd = S.dresses.length;
  page("tour", `${topBar(T.toHome, esc(T.tourTitle), nd ? `<button class="gear" data-a="toAll">${esc(T.allTitle)}</button>` : "")}
    <button class="guide-card" data-a="guide"><span>💬</span><b>${esc(T.guideCard)}</b><i>›</i></button>
    <h3 class="h3">${esc(T.shopsH)}</h3>
    ${shops.length ? `<ul class="shops">${shops.map(s => {
      const ds = dressesOf(s.id);
      return `<li><button class="shop-card" data-a="openShop" data-id="${s.id}">
        <span class="sc-h"><b>${esc(shopName(s))}</b><em>${esc(dateShort(s.date))}${ds.length ? " · " + esc(fm(T.shopCount, { n: ds.length })) : ""}</em></span>
        <span class="sc-ds">${ds.length ? ds.slice(0, 6).map(d => `<span class="mini">${svgOf(d, { k: "t" })}${reactBadge(d)}${d.pick ? '<i class="pk">♥</i>' : ""}</span>`).join("") : `<span class="sc-none">${esc(T.shopNoDress)}</span>`}</span>
      </button></li>`;
    }).join("")}</ul>` : ""}
    <button class="add-big ${shops.length ? "" : "first"}" data-a="newShop">${esc(shops.length ? T.addShop : T.addFirstShop)}</button>
    ${nd ? `<button class="out-btn main all-go" data-a="toAll"><span><b>${esc(T.toAll)}</b><span>${esc(fm(T.toAllSub, { n: nd }))}</span></span><i>›</i></button>` : ""}
  `);
}
function shopSheet(s){
  const n = s ? S.shops.indexOf(s) + 1 : S.shops.length + 1;
  const sh = openSheet(`<h3>${esc(s ? T.shopEditT : fm(T.shopNewT, { n }))}</h3>
    <label class="lbl" for="shName">${esc(T.shopName)}</label>
    <input class="in" id="shName" maxlength="40" autocomplete="off" placeholder="${esc(T.shopNamePh)}" value="${esc(s ? s.name : "")}">
    <p class="note small">${esc(fm(T.shopNameNote, { n }))}</p>
    <label class="lbl" for="shDate">${esc(T.shopDate)}</label>
    <input class="in" id="shDate" type="date" value="${esc(s ? s.date : todayYmd())}">
    ${s ? `<button class="text-btn danger center" data-a="delShop" data-id="${s.id}">${esc(T.shopDel)}</button>` : ""}`, T.shopName, {
    foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.cancel)}</button><button class="btn main" data-a="shopOk" data-id="${s ? s.id : ""}">${esc(s ? T.save : T.shopGo)}</button></div>`
  });
  if(!s) setTimeout(() => { const i = $("#shName"); if(i) i.focus(); }, 60);
  $("#shName", sh).addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); $('[data-a="shopOk"]', sh).click(); } });
}

// ===== 샵 화면 =====
let SH = null;
function leaveDone(s, k){
  if(s.leave[k]) return true;
  if(k === "perk" && s.perk.trim()) return true;
  if(k === "hold" && dressesOf(s.id).some(d => d.hold)) return true;
  return false;
}
function shopScreen(id){
  const s = SH = shopById(id), ds = dressesOf(s.id);
  const left = LEAVE.filter(l => !leaveDone(s, l[0])).length;
  const clips = REC.clipsOf(c => c.shop === s.id && !c.dress);
  page("shop", `${topBar(T.toTour, `<button class="title-btn" data-a="editShop" data-id="${s.id}">${esc(shopName(s))} <small>✎</small></button>`, S.dresses.length ? `<button class="gear" data-a="toAll">${esc(T.allTitle)}</button>` : "")}
    <div class="sh-sub">${esc(dateShort(s.date))}${s.staff ? " · " + esc(s.staff) : ""}</div>
    <h3 class="h3">${esc(T.dressesH)} <span>${ds.length ? esc(fm(T.shopCount, { n: ds.length })) : ""}</span></h3>
    ${ds.length ? `<div class="tiles">${ds.map(d => `<button class="tile" data-a="openDress" data-id="${d.id}">
        <span class="tile-pic">${svgOf(d, { k: "s" })}</span>
        <b>${esc(dressTitle(d))}${d.pick ? ' <i class="pk">♥</i>' : ""}</b>
        <em>${d.bride ? esc(reactText(d.bride)) : "&nbsp;"}</em>
      </button>`).join("")}
      <button class="tile add" data-a="addDress" data-id="${s.id}"><span>＋</span><b>${esc(T.addDress.replace("＋ ", ""))}</b></button></div>`
    : `<button class="add-big first" data-a="addDress" data-id="${s.id}">${esc(T.addFirstDress)}<small>${esc(T.addFirstDressSub)}</small></button>`}

    <section class="card-sec leave ${left ? "" : "all-ok"}">
      <div class="cs-h"><h3>${esc(T.leaveH)}</h3><span>${left ? esc(fm(T.leaveLeft, { n: left })) : "✓ " + esc(T.leaveDone)}</span></div>
      ${LEAVE.map(l => { const on = leaveDone(s, l[0]); return `<button class="chk ${on ? "on" : ""}" data-a="leave" data-k="${l[0]}" aria-pressed="${on}"><span class="box">${CHECK}</span><span>${esc(l[1])}</span></button>`; }).join("")}
    </section>

    <section class="card-sec">
      <div class="cs-h"><h3>${esc(T.infoH)}</h3><span>${esc(T.infoLead)}</span></div>
      <label class="lbl" for="fPerk">${esc(T.perk)}</label>
      <textarea class="in area" id="fPerk" data-sf="perk" maxlength="300" placeholder="${esc(T.perkPh)}">${esc(s.perk)}</textarea>
      <div class="two">
        <div><label class="lbl" for="fStaff">${esc(T.staff)}</label><input class="in sm" id="fStaff" data-sf="staff" maxlength="30" placeholder="${esc(T.staffPh)}" value="${esc(s.staff)}"></div>
        <div><label class="lbl" for="fFee">${esc(T.fee)}</label><div class="unit-in"><input class="in sm" id="fFee" data-sf="fee" inputmode="numeric" maxlength="9" placeholder="${esc(T.feePh)}" value="${esc(s.fee ? comma(s.fee) : "")}"><span>${esc(T.won)}</span></div></div>
      </div>
      <label class="lbl">${esc(T.styleH)}</label>
      <div class="chips">${SHOPSTYLE.map(o => `<button class="chip ${s.style.includes(o[0]) ? "on" : ""}" data-a="shopStyle" data-v="${o[0]}" aria-pressed="${s.style.includes(o[0])}">${esc(o[1])}</button>`).join("")}</div>
      ${SHOPFEEL.map(f => `<label class="lbl">${esc(f[1])}</label><div class="seg">${f[2].map(o => `<button class="${s.feel[f[0]] === o[0] ? "on" : ""} ${o[0] === "bad" ? "bad" : ""}" data-a="shopFeel" data-k="${f[0]}" data-v="${o[0]}" aria-pressed="${s.feel[f[0]] === o[0]}">${esc(o[1])}</button>`).join("")}</div>`).join("")}
      <label class="lbl" for="fSMemo">${esc(T.shopMemo)}</label>
      <textarea class="in area" id="fSMemo" data-sf="memo" maxlength="600" placeholder="${esc(T.shopMemoPh)}">${esc(s.memo)}</textarea>
    </section>

    ${clips.length ? `<section class="card-sec"><div class="cs-h"><h3>${esc(T.recsH)}</h3><span>${esc(T.recShop)}</span></div>${clips.map(clipRow).join("")}</section>` : ""}
    <div class="bar-space"></div>
  `);
}

// ===== 드레스 화면 =====
let D = null;
function chipHtml(f, o, d){
  const v = d.a[f.id], on = f.one ? v === o[0] : (v || []).includes(o[0]);
  const attrs = `data-a="pickF" data-f="${f.id}" data-v="${o[0]}" aria-pressed="${on}"`;
  if(f.pic) return `<button class="pc ${f.pic} ${on ? "on" : ""}" ${attrs}><span class="pc-i">${DR.pic(f.pic, o[0])}</span><b>${esc(o[1])}</b>${o[2] ? `<small>${esc(o[2])}</small>` : ""}</button>`;
  return `<button class="chip ${f.one ? "" : "multi"} ${on ? "on" : ""}" ${attrs}>${esc(o[1])}${o[2] ? `<small>${esc(o[2])}</small>` : ""}</button>`;
}
function fieldHtml(f, d){
  const head = `<div class="f-h"><h4>${esc(f.t)}</h4>${f.sub ? `<span>${esc(f.sub)}</span>` : ""}</div>`;
  if(f.id === "shine") return `<div class="fld" id="f-${f.id}">${head}<div class="seg shine">${f.opts.map(o => { const on = d.a.shine === o[0]; return `<button class="${on ? "on" : ""}" data-a="pickF" data-f="shine" data-v="${o[0]}" aria-pressed="${on}"><i class="sp sp${o[0]}"></i>${esc(o[1])}</button>`; }).join("")}</div>${f.hint ? `<p class="f-hint">${esc(f.hint)}</p>` : ""}</div>`;
  if(f.groups) return `<div class="fld" id="f-${f.id}">${head}${f.groups.map(g => `${g[0] ? `<p class="g-h">${esc(g[0])}</p>` : ""}<div class="chips">${g[1].map(o => chipHtml(f, o, d)).join("")}</div>`).join("")}</div>`;
  return `<div class="fld" id="f-${f.id}">${head}<div class="${f.pic ? "pcs " + f.pic : "chips"}">${f.opts.map(o => chipHtml(f, o, d)).join("")}</div>${f.hint ? `<p class="f-hint">${esc(f.hint)}</p>` : ""}</div>`;
}
function reactRow(key, label, d){
  return `<div class="rr"><span class="rr-l">${esc(label)}</span><div class="rr-b" role="group" aria-label="${esc(label)}">${REACT.map(r => { const on = d[key] === r[0]; return `<button class="${on ? "on" : ""}" data-a="react" data-k="${key}" data-v="${r[0]}" aria-pressed="${on}" aria-label="${esc(r[2])}"><span>${r[1]}</span><small>${esc(r[2])}</small></button>`; }).join("")}</div></div>`;
}
function dressScreen(id){
  const d = D = dressById(id), s = shopById(d.shop);
  const clips = REC.clipsOf(c => c.dress === d.id);
  const secs = SECS.map((sec, i) => {
    const main = sec.ids.map(id2 => FMAP.get(id2)).filter(f => f && !f.more), more = sec.ids.map(id2 => FMAP.get(id2)).filter(f => f && f.more);
    const moreOn = more.some(f => (f.one ? d.a[f.id] : (d.a[f.id] || []).length));
    return `<section class="sec" id="sec${i}"><h3 class="sec-t">${esc(sec.t)}</h3>
      ${main.map(f => fieldHtml(f, d)).join("")}
      ${more.length ? `<details class="more" ${moreOn ? "open" : ""}><summary>${esc(T.moreOpen)} · ${esc(more.map(f => f.t).join(" · "))}</summary>${more.map(f => fieldHtml(f, d)).join("")}</details>` : ""}
      ${i === SECS.length - 1 ? `
        <div class="two">
          <div><label class="lbl" for="fExtra">${esc(T.extraCost)}</label><div class="unit-in"><input class="in sm" id="fExtra" data-df="extra" inputmode="numeric" maxlength="5" placeholder="${esc(T.extraPh)}" value="${esc(d.extra)}"><span>${esc(T.man)}</span></div></div>
          <div><label class="lbl" for="fDname">${esc(T.dname)}</label><input class="in sm" id="fDname" data-df="dname" maxlength="40" placeholder="${esc(T.dnamePh)}" value="${esc(d.dname)}"></div>
        </div>
        <label class="lbl" for="fMemo">${esc(T.memo)}</label>
        <textarea class="in area" id="fMemo" data-df="memo" maxlength="600" placeholder="${esc(T.memoPh)}">${esc(d.memo)}</textarea>` : ""}
    </section>`;
  }).join("");
  page("dress", `${topBar(shopName(s), `${esc(dressTitle(d))}`, `<button class="mini-top" data-a="toTop" aria-label="${esc(T.dressN.replace("{n}", d.no))}">${svgOf(d, { k: "m", bg: false })}</button>`)}
    <nav class="jump">${["반응"].concat(SECS.map(x => x.t)).map((t, i) => `<button data-a="jump" data-i="${i - 1}">${esc(t)}</button>`).join("")}</nav>
    <section class="hero" id="sec-1">
      <div class="hero-pic" id="pic">${svgOf(d, { k: "h" })}</div>
      <div class="hero-r">
        ${reactRow("bride", T.bride, d)}
        ${reactRow("me", T.me, d)}
        <div class="tg">
          <button class="tgl pick ${d.pick ? "on" : ""}" data-a="pickD" aria-pressed="${d.pick}">${d.pick ? "♥" : "♡"} ${esc(T.pick)}</button>
          <button class="tgl ${d.hold ? "on" : ""}" data-a="holdD" aria-pressed="${d.hold}">${d.hold ? "✓ " + esc(T.holdOn) : esc(T.hold)}</button>
        </div>
      </div>
      <p class="tags ${tagsOf(d).length ? "" : "empty-t"}" id="tags">${esc(tagsOf(d).join(" · ") || T.emptyHelp)}</p>
    </section>
    <div class="ask"><span class="ask-l">💬 ${esc(T.askBtn)}</span><b id="askQ">${esc(ASK[S.askI % ASK.length])}</b><button data-a="askNext">${esc(T.askNext)} ›</button></div>
    ${clips.length ? `<section class="card-sec recs"><div class="cs-h"><h3>${esc(T.recDressH)}</h3><span>${esc(fm(T.recHere, { n: clips.length }))}</span></div>${clips.map(clipRow).join("")}</section>` : ""}
    ${secs}
    <button class="text-btn danger center" data-a="delDress">${esc(T.dressDel)}</button>
    <div class="bar-space"></div>
  `);
}
function refreshDress(){
  if(!D) return;
  const p = $("#pic"); if(p) p.innerHTML = svgOf(D, { k: "h" });
  const m = $(".mini-top"); if(m) m.innerHTML = svgOf(D, { k: "m", bg: false });
  const t = $("#tags"); if(t){ const tg = tagsOf(D); t.textContent = tg.join(" · ") || T.emptyHelp; t.classList.toggle("empty-t", !tg.length); }
}

// ===== 모아 보기 =====
let FILT = "all", SORT = "tour";
function listFor(f, so){
  let L = S.dresses.slice();
  if(f === "pick") L = L.filter(d => d.pick);
  if(f === "hold") L = L.filter(d => d.hold);
  const sOrd = id => { const s = shopById(id); return s ? s.at : 0; };
  L.sort((a, b) => sOrd(a.shop) - sOrd(b.shop) || a.no - b.no);
  if(so === "bride") L.sort((a, b) => (+b.bride || 0) - (+a.bride || 0) || (+b.me || 0) - (+a.me || 0));
  return L;
}
function allScreen(){
  const n = { all: S.dresses.length, pick: S.dresses.filter(d => d.pick).length, hold: S.dresses.filter(d => d.hold).length };
  const L = listFor(FILT, SORT);
  page("all", `${topBar(T.toBack, esc(T.allTitle), "")}
    <div class="seg filt">${[["all", T.fAll], ["pick", T.fPick], ["hold", T.fHold]].map(f => `<button class="${FILT === f[0] ? "on" : ""}" data-a="filt" data-v="${f[0]}" aria-pressed="${FILT === f[0]}">${esc(f[1])} <small>${n[f[0]]}</small></button>`).join("")}</div>
    <div class="sorts">${[["tour", T.sortTour], ["bride", T.sortBride]].map(o => `<button class="${SORT === o[0] ? "on" : ""}" data-a="sort" data-v="${o[0]}" aria-pressed="${SORT === o[0]}">${esc(o[1])}</button>`).join("")}</div>
    ${L.length ? `<ul class="dcards">${L.map(d => {
      const s = shopById(d.shop), good = (d.a.good || []).map(v => labelOf("good", v)), bad = (d.a.bad || []).map(v => labelOf("bad", v));
      const nc = REC.clipsOf(c => c.dress === d.id).length;
      return `<li class="dcard">
        <button class="dc-main" data-a="openDress" data-id="${d.id}">
          <span class="dc-pic">${svgOf(d, { k: "a" })}</span>
          <span class="dc-b">
            <b>${esc(shopName(s))} · ${esc(dressTitle(d))}</b>
            ${d.dname ? `<em class="dc-n">${esc(d.dname)}</em>` : ""}
            <span class="dc-r">${d.bride ? `${esc(T.bride)} ${esc(reactText(d.bride))}` : ""}${d.bride && d.me ? " · " : ""}${d.me ? `${esc(T.me)} ${esc(reactText(d.me))}` : ""}</span>
            <span class="dc-t">${esc(tagsOf(d).join(" · ") || T.emptyTags)}</span>
            ${good.length ? `<span class="dc-g">＋ ${esc(good.join(", "))}</span>` : ""}
            ${bad.length ? `<span class="dc-x">－ ${esc(bad.join(", "))}</span>` : ""}
            <span class="dc-m">${d.hold ? `<i class="tagx">${esc(T.holdOn)}</i>` : ""}${d.extra ? `<i class="tagx">추가금 ${esc(comma(d.extra))}만 원</i>` : ""}${nc ? `<i class="tagx">🎙 ${nc}</i>` : ""}</span>
          </span>
        </button>
        <button class="dc-pick ${d.pick ? "on" : ""}" data-a="pickCard" data-id="${d.id}" aria-pressed="${d.pick}" aria-label="${esc(T.pick)}">${d.pick ? "♥" : "♡"}</button>
      </li>`;
    }).join("")}</ul>` : `<p class="empty">${esc(FILT === "pick" ? T.pickEmpty : T.allEmpty)}</p>`}
    ${S.dresses.length ? `<section class="block">
      <h3>${esc(T.outH)}</h3>
      <div class="outs">
        <button class="out-btn main" data-a="outImg"><span><b>${esc(n.pick ? T.outImg : T.outImgAll)}</b><span>${esc(n.pick ? T.outImgSub : T.outImgAllSub)}</span></span><i>↓</i></button>
        <button class="out-btn" data-a="outText"><span><b>${esc(T.outText)}</b><span>${esc(T.outTextSub)}</span></span><i>⧉</i></button>
      </div>
    </section>` : ""}
    <div class="bar-space"></div>
  `);
}
function outList(){
  const picks = listFor("pick", "tour");
  return picks.length ? { L: picks, title: T.imgTitle } : { L: listFor("all", "bride").slice(0, 6), title: T.imgTitleAll };
}
function outText(){
  const { L, title } = outList();
  const lines = [`[${title}] ${dateShort(todayYmd())}`, ""];
  L.forEach(d => {
    const s = shopById(d.shop), good = (d.a.good || []).map(v => labelOf("good", v)), bad = (d.a.bad || []).map(v => labelOf("bad", v));
    lines.push(`${d.pick ? "♥ " : ""}${shopName(s)} · ${dressTitle(d)}${d.dname ? ` (${d.dname})` : ""}`);
    const r = [d.bride ? `${T.bride} ${reactText(d.bride)}` : "", d.me ? `${T.me} ${reactText(d.me)}` : ""].filter(Boolean).join(" · ");
    if(r) lines.push(r);
    const tg = tagsOf(d, true); if(tg.length) lines.push(tg.join(" · "));
    const md = moodOf(d); if(md.length) lines.push("분위기: " + md.join(", "));
    if(good.length) lines.push("좋았던 점: " + good.join(", "));
    if(bad.length) lines.push("아쉬운 점: " + bad.join(", "));
    const ex = [d.extra ? `추가금 ${comma(d.extra)}만 원` : "", d.hold ? T.holdOn : "", (d.a.use || []).length ? (d.a.use.map(v => labelOf("use", v)).join("·") + " 후보") : ""].filter(Boolean).join(" · ");
    if(ex) lines.push(ex);
    if(d.memo.trim()) lines.push("메모: " + d.memo.trim());
    lines.push("");
  });
  return lines.join("\n").trim();
}

// ===== 이미지 만들기 (캔버스에 직접 그려요) =====
function svgImage(svgText){
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => ok(img); img.onerror = no;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  });
}
function wrapLines(ctx, text, maxW){
  const out = []; let line = "";
  for(const word of String(text).split(/(\s+)/)){
    const t = line + word;
    if(ctx.measureText(t).width > maxW && line.trim()){ out.push(line.trim()); line = word.trimStart(); }
    else line = t;
  }
  if(line.trim()) out.push(line.trim());
  // 한 단어가 너무 길면 글자로 자름
  return out.flatMap(l => { if(ctx.measureText(l).width <= maxW) return [l]; const r = []; let c = ""; for(const ch of l){ if(ctx.measureText(c + ch).width > maxW){ r.push(c); c = ch; } else c += ch; } if(c) r.push(c); return r; });
}
async function makeImage(){
  const { L, title } = outList();
  const FONT = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  try { await Promise.all(["400", "700", "900"].map(w => document.fonts.load(`${w} 30px "Noto Sans KR"`))); } catch (e) {}
  const W = 1080, P = 64, PIC_W = 300, PIC_H = 465, TX = P + PIC_W + 40, TW = W - TX - P;
  const c = document.createElement("canvas"), ctx = c.getContext("2d");
  const f = (w, s) => { ctx.font = `${w} ${s}px ${FONT}`; };
  // 1. 높이 재기
  const blocks = L.map(d => {
    const s = shopById(d.shop), rows = [];
    rows.push(["900", 40, "#161616", `${shopName(s)} · ${dressTitle(d)}${d.pick ? "  ♥" : ""}`]);
    if(d.dname) rows.push(["500", 26, "#8A8A8A", d.dname]);
    const r = [d.bride ? `${T.bride} ${reactText(d.bride)}` : "", d.me ? `${T.me} ${reactText(d.me)}` : ""].filter(Boolean).join("   ");
    if(r) rows.push(["700", 30, "#161616", r]);
    const tg = tagsOf(d); if(tg.length) rows.push(["500", 27, "#3A3A3A", tg.join(" · ")]);
    const md = moodOf(d); if(md.length) rows.push(["500", 26, "#5C5C5C", "분위기  " + md.join(", ")]);
    const good = (d.a.good || []).map(v => labelOf("good", v)), bad = (d.a.bad || []).map(v => labelOf("bad", v));
    if(good.length) rows.push(["700", 26, "#2E7D32", "＋ " + good.join(", ")]);
    if(bad.length) rows.push(["700", 26, "#C2185B", "－ " + bad.join(", ")]);
    const ex = [d.extra ? `추가금 ${comma(d.extra)}만 원` : "", d.hold ? T.holdOn : ""].filter(Boolean).join(" · ");
    if(ex) rows.push(["700", 26, "#B26A00", ex]);
    if(d.memo.trim()) rows.push(["500", 25, "#5C5C5C", "“" + d.memo.trim().slice(0, 90) + "”"]);
    let h = 0;
    const lines = rows.map(([w, sz, col, text]) => { f(w, sz); const ls = wrapLines(ctx, text, TW); h += ls.length * sz * 1.42 + 8; return { w, sz, col, ls }; });
    return { d, lines, h: Math.max(PIC_H, h) + 56 };
  });
  const HEAD = 190, FOOT = 120, H = HEAD + blocks.reduce((a, b) => a + b.h, 0) + FOOT;
  c.width = W; c.height = H;
  ctx.fillStyle = "#F7F4EF"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#161616"; ctx.fillRect(0, 0, W, 12);
  f("900", 58); ctx.fillStyle = "#161616"; ctx.textBaseline = "alphabetic"; ctx.fillText(title, P, 108);
  f("700", 28); ctx.fillStyle = "#8A8A8A"; ctx.fillText(`${dateShort(todayYmd())} · ${L.length}벌`, P, 152);
  let y = HEAD;
  for(const b of blocks){
    ctx.fillStyle = "#FFFFFF"; roundRect(ctx, P - 20, y, W - (P - 20) * 2, b.h - 24, 28); ctx.fill();
    try { const img = await svgImage(svgOf(b.d, { k: "img", w: PIC_W, h: PIC_H, bg: "#F5F1EB" })); ctx.save(); roundRect(ctx, P, y + 20, PIC_W, PIC_H, 20); ctx.clip(); ctx.drawImage(img, P, y + 20, PIC_W, PIC_H); ctx.restore(); } catch (e) {}
    let ty = y + 20;
    for(const ln of b.lines){ f(ln.w, ln.sz); ctx.fillStyle = ln.col; for(const t of ln.ls){ ty += ln.sz * 1.18; ctx.fillText(t, TX, ty); ty += ln.sz * .24; } ty += 8; }
    y += b.h;
  }
  f("700", 26); ctx.fillStyle = "#8A8A8A"; ctx.fillText("결혼식사회자 이상운 · @wed_voice.su", P, H - 56);
  f("500", 22); ctx.fillText(T.name, P, H - 22);
  return new Promise(ok => c.toBlob(b => ok(b), "image/png"));
}
function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ===== 녹음 =====
let recTimer = 0;
function recTarget(){
  if(CUR === "dress" && D) return { shop: D.shop, dress: D.id };
  if(CUR === "shop" && SH) return { shop: SH.id, dress: null };
  return null;
}
function recWhere(c){
  if(!c) return "";
  const d = c.dress ? dressById(c.dress) : null;
  return d ? fm(T.recTo, { n: d.no }) + (CUR === "dress" && D && D.shop === d.shop ? "" : ` · ${shopName(shopById(d.shop))}`) : T.recToShop;
}
function renderBar(){
  let bar = document.getElementById("rbar");
  const can = ["shop", "dress"].includes(CUR), on = REC.active;
  if(!(can || on)){ if(bar) bar.remove(); clearInterval(recTimer); return; }
  if(!bar){ bar = document.createElement("div"); bar.id = "rbar"; bar.className = "rbar"; document.body.appendChild(bar); }
  const add = CUR === "dress" ? `<button class="rb-add" data-a="nextDress">${esc(T.nextDress)}</button>` : CUR === "shop" ? `<button class="rb-add" data-a="addDress" data-id="${SH.id}">${esc(T.addDress)}</button>` : "";
  if(on){
    const c = REC.cur;
    // 녹음 중: 위에 빨간 줄(시간 · 어디에 저장 중 · 멈추기), 아래에 드레스 추가
    bar.innerHTML = `<div class="rb-strip" role="status"><i class="dot"></i><b id="recT">${clock((Date.now() - c.at) / 1000)}</b><small>${esc(recWhere(c))}</small><button data-a="rec">■ ${esc(T.recStop)}</button></div>${add}`;
    clearInterval(recTimer);
    recTimer = setInterval(() => { const t = $("#recT"), c2 = REC.cur; if(t && c2) t.textContent = clock((Date.now() - c2.at) / 1000); }, 1000);
  } else {
    clearInterval(recTimer);
    bar.innerHTML = `${isDemo() ? "" : `<button class="rb-rec" data-a="rec"><i class="dot"></i><span><b>${esc(T.recStart)}</b></span></button>`}${add}`;
  }
  bar.classList.toggle("solo", bar.children.length < 2);
  bar.classList.toggle("recording", on);
}
async function startRec(){
  const to = recTarget();
  if(!to) return;
  try { await REC.start(to); }
  catch (e) {
    const ia = inApp();
    if(ia) openSheet(`<h3>${esc(T.recNoT)}</h3>${inAppBox(T.recNoApp)}`, T.recNoT);
    else openSheet(`<h3>${esc(T.recNoT)}</h3><p>${esc(e && e.kind === "support" ? T.recNoSupport : T.recNoPerm)}</p>`, T.recNoT);
    renderBar();
    return;
  }
  renderBar();
}
REC.on({
  change: () => renderBar(),
  cut: () => { renderBar(); refreshClips(); toast(T.recCut); }
});
function refreshClips(){ if(CUR === "dress" || CUR === "shop"){ const y = window.scrollY; show(CUR, ARG); window.scrollTo(0, y); } }
function clipRow(c){
  const open = REC.active && REC.cur && REC.cur.id === c.id;
  return `<div class="clip" data-clip="${c.id}">
    <button class="cl-play" data-a="play" data-clip="${c.id}" ${open ? "disabled" : ""}>${open ? "● " + esc(T.recOn) : esc(T.recPlay)}</button>
    <span class="cl-m"><b>${esc(timeOf(c.at))}</b><small>${esc(lenText(c.dur))}${c.cut ? " · " + esc(T.recCutTag) : ""}</small></span>
    <button class="cl-b" data-a="saveClip" data-clip="${c.id}" ${open ? "disabled" : ""} aria-label="${esc(T.recFile)}">↓</button>
    <button class="cl-b" data-a="delClip" data-clip="${c.id}" ${open ? "disabled" : ""} aria-label="${esc(T.recDel)}">✕</button>
  </div>`;
}
let player = null, playing = null;
function stopPlay(){
  if(player){ try { player.pause(); } catch (e) {} if(player.src) URL.revokeObjectURL(player.src); player = null; }
  if(playing){ const b = $(`.cl-play[data-clip="${playing}"]`); if(b) b.textContent = T.recPlay; playing = null; }
}
async function playClip(id, btn){
  if(playing === id){ stopPlay(); return; }
  stopPlay();
  const blob = await REC.blobOf(id);
  if(!blob || !blob.size) return;
  player = new Audio(URL.createObjectURL(blob));
  playing = id; btn.textContent = T.recPause;
  player.onended = () => stopPlay();
  try { await player.play(); } catch (e) { stopPlay(); }
}
function clipName(c){
  const d = c.dress ? dressById(c.dress) : null, s = shopById(c.shop);
  const t = new Date(c.at);
  return `${T.fileName}_${fileSafe(shopName(s) || "샵")}_${d ? fileSafe(dressTitle(d)) : "상담"}_${pad(t.getHours())}${pad(t.getMinutes())}.${REC.extOf(c.mime)}`;
}

// ===== 지우기 (되돌리기 5초) =====
let purge = [];
function purgeLater(ids){ if(!ids.length) return; purge.push(ids); setTimeout(() => { const i = purge.indexOf(ids); if(i >= 0){ purge.splice(i, 1); REC.remove(ids); } }, 6500); }
function cancelPurge(ids){ const i = purge.indexOf(ids); if(i >= 0) purge.splice(i, 1); }
async function delDress(d){
  const s = shopById(d.shop);
  if(REC.active && REC.cur && REC.cur.dress === d.id) await REC.split({ shop: d.shop, dress: null });
  const idx = S.dresses.indexOf(d), hidden = REC.hide(REC.clipsOf(c => c.dress === d.id).map(c => c.id)), ids = hidden.map(c => c.id);
  S.dresses.splice(idx, 1); saveS();
  if(!isDemo()) purgeLater(ids);
  const undo = () => { cancelPurge(ids); REC.unhide(hidden); S.dresses.splice(idx, 0, d); saveS(); if(CUR === "shop") show("shop", s.id); };
  const after = () => { show("shop", s.id); toast(fm(T.dressDeleted, { n: d.no }), undo); };
  if(depth() > 0){ afterPop = after; history.back(); } else go("shop", s.id, "replace"), toast(fm(T.dressDeleted, { n: d.no }), undo);
}
async function delShop(s){
  if(REC.active && REC.cur && REC.cur.shop === s.id) await REC.stop();
  const idx = S.shops.indexOf(s), ds = S.dresses.filter(d => d.shop === s.id);
  const hidden = REC.hide(REC.clipsOf(c => c.shop === s.id).map(c => c.id)), ids = hidden.map(c => c.id);
  S.shops.splice(idx, 1); S.dresses = S.dresses.filter(d => d.shop !== s.id); saveS();
  if(!isDemo()) purgeLater(ids);
  const undo = () => { cancelPurge(ids); REC.unhide(hidden); S.shops.splice(idx, 0, s); S.dresses.push(...ds); saveS(); if(CUR === "tour") show("tour"); };
  closeThen(() => { history.replaceState({ sc: "tour", arg: null, d: Math.max(0, depth()) }, ""); show("tour"); toast(fm(T.shopDeleted, { name: shopName(s) }), undo); });
}

// ===== 안내 창 =====
function guideSheet(){
  openSheet(`<h3>${esc(T.guideT)}</h3>
    <p class="g-h2">👀 ${esc(T.guideLookH)}</p>
    <ol class="glist">${LOOK.map(l => `<li><b>${esc(l[0])}</b><span>${esc(l[1])}</span></li>`).join("")}</ol>
    <p class="g-h2">💬 ${esc(T.guideAskH)}</p>
    <ul class="glist ask-l">${ASK.map(q => `<li>“${esc(q)}”</li>`).join("")}</ul>
    <p class="g-h2">📝 ${esc(T.guideTipH)}</p>
    <ul class="glist tip-l">${LOOK_TIP.map(q => `<li>${esc(q)}</li>`).join("")}</ul>`, T.guideT);
}
function recIntroSheet(){
  openSheet(`<h3>🎙 ${esc(T.recIntroT)}</h3><ul class="glist tip-l">${T.recIntro.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`, T.recIntroT, {
    foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.cancel)}</button><button class="btn main" data-a="recGo">${esc(T.recGo)}</button></div>`
  });
}

// ===== 누르기 =====
const ACT = {
  back(){
    if(CUR === "dress" && D) back("shop", D.shop);
    else if(CUR === "shop") back("tour");
    else if(CUR === "all") back("tour");
    else { if(isDemo()) S = MINE; back("home"); }
  },
  start(){ inAppSheet(() => { go("tour"); shopSheet(null); }); },
  resume(){ inAppSheet(() => { const last = S.shops.slice().sort((a, b) => b.at - a.at)[0]; go("tour"); if(last){ go("shop", last.id); } }); },
  toAll(){ if(CUR !== "all") go("all"); },
  demo(){ S = demoState(); go("tour"); },
  demoExit(){ S = MINE; if(depth() > 0){ afterPop = () => { show("home"); }; history.go(-depth()); } else show("home"); },
  guide(){ guideSheet(); },
  iaCopy(){ const m = $("#iaMsg"); navigator.clipboard.writeText(location.href).then(() => { if(m) m.textContent = T.iaCopied; }, () => { if(m) m.textContent = location.href; }); },
  iaStay(){ inAppSheet.ok = true; const f = inAppSheet.then || (() => {}); closeThen(f); },
  newShop(){ shopSheet(null); },
  editShop(el){ shopSheet(shopById(el.dataset.id)); },
  async shopOk(el){
    const name = ($("#shName").value || "").trim(), date = $("#shDate").value || "";
    if(el.dataset.id){
      const s = shopById(el.dataset.id); s.name = name.slice(0, 40); s.date = date; saveS();
      closeThen(() => show(CUR, ARG));
    } else {
      const s = addShop(name, date);
      if(REC.active && !isDemo()) await REC.split({ shop: s.id, dress: null });
      closeThen(() => go("shop", s.id));
    }
  },
  delShop(el){ const s = shopById(el.dataset.id); if(s) delShop(s); },
  openShop(el){ go("shop", +el.dataset.id); },
  async addDress(el){
    const sid = +(el.dataset.id || (SH && SH.id));
    const d = addDress(sid);
    if(REC.active && !isDemo()) await REC.split({ shop: sid, dress: d.id });
    go("dress", d.id);
  },
  async nextDress(){
    if(!D) return;
    const d = addDress(D.shop);
    if(REC.active && !isDemo()) await REC.split({ shop: d.shop, dress: d.id });
    go("dress", d.id, "replace");
    toast(fm(T.dressN, { n: d.no }));
  },
  openDress(el){ go("dress", +el.dataset.id); },
  leave(el){ const k = el.dataset.k, on = leaveDone(SH, k); if(on && !SH.leave[k]) return; SH.leave[k] = on ? 0 : 1; saveS(); const y = scrollY; show("shop", SH.id); scrollTo(0, y); },
  shopStyle(el){ const v = el.dataset.v, a = SH.style, i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); saveS(); el.classList.toggle("on", i < 0); el.setAttribute("aria-pressed", i < 0); },
  shopFeel(el){ const k = el.dataset.k, v = el.dataset.v; SH.feel[k] = SH.feel[k] === v ? "" : v; saveS(); $$(`[data-a="shopFeel"][data-k="${k}"]`).forEach(b => { const on = SH.feel[k] === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); },
  pickF(el){
    const f = FMAP.get(el.dataset.f), v = el.dataset.v, a = D.a;
    if(f.one){ a[f.id] = a[f.id] === v ? undefined : v; if(!a[f.id]) delete a[f.id]; }
    else {
      let L = (a[f.id] || []).slice(); const i = L.indexOf(v);
      if(i >= 0) L.splice(i, 1); else { L.push(v); if(f.id === "deco"){ if(v === "plain") L = ["plain"]; else L = L.filter(x => x !== "plain"); } }
      if(L.length) a[f.id] = L; else delete a[f.id];
    }
    saveS();
    $$(`[data-a="pickF"][data-f="${f.id}"]`).forEach(b => { const on = f.one ? a[f.id] === b.dataset.v : (a[f.id] || []).includes(b.dataset.v); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    refreshDress();
  },
  react(el){
    const k = el.dataset.k, v = el.dataset.v; D[k] = D[k] === v ? "" : v; saveS();
    $$(`[data-a="react"][data-k="${k}"]`).forEach(b => { const on = D[k] === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  },
  pickD(el){ D.pick = !D.pick; saveS(); el.classList.toggle("on", D.pick); el.setAttribute("aria-pressed", D.pick); el.innerHTML = `${D.pick ? "♥" : "♡"} ${esc(T.pick)}`; toast(D.pick ? T.picked : T.unpicked); },
  holdD(el){ D.hold = !D.hold; saveS(); el.classList.toggle("on", D.hold); el.setAttribute("aria-pressed", D.hold); el.textContent = D.hold ? "✓ " + T.holdOn : T.hold; },
  pickCard(el){ const d = dressById(el.dataset.id); d.pick = !d.pick; saveS(); const y = scrollY; show("all"); scrollTo(0, y); toast(d.pick ? T.picked : T.unpicked); },
  askNext(){ S.askI = (S.askI + 1) % ASK.length; saveSoon(); const q = $("#askQ"); if(q) q.textContent = ASK[S.askI]; },
  jump(el){ const i = +el.dataset.i, t = document.getElementById(i < 0 ? "sec-1" : "sec" + i); if(t){ const y = t.getBoundingClientRect().top + scrollY - 104; scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" }); } },
  toTop(){ scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); },
  delDress(){ if(D) delDress(D); },
  filt(el){ FILT = el.dataset.v; show("all"); },
  sort(el){ SORT = el.dataset.v; show("all"); },
  async outImg(el){
    el.disabled = true; toast(T.imgMaking);
    try { const b = await makeImage(); if(b) await shareOrSave(new File([b], `${T.fileName}_${todayYmd()}.png`, { type: "image/png" }), T.imgSaved); }
    finally { el.disabled = false; }
  },
  outText(){ copyText(outText(), T.textCopied); },
  rec(){
    if(REC.active){ REC.stop().then(() => { toast(T.recSaved); refreshClips(); }); return; }
    if(isDemo()) return;
    if(!S.recIntro){ recIntroSheet(); return; }
    startRec();
  },
  recGo(){ S.recIntro = true; saveS(); closeThen(startRec); },
  play(el){ playClip(el.dataset.clip, el); },
  async saveClip(el){
    const c = REC.clips().find(x => x.id === el.dataset.clip); if(!c) return;
    const b = await REC.blobOf(c.id); if(!b) return;
    shareOrSave(new File([b], clipName(c), { type: b.type || "audio/mp4" }), T.recSaved);
  },
  delClip(el){
    const id = el.dataset.clip, hidden = REC.hide([id]); stopPlay();
    const ids = [id]; purgeLater(ids);
    refreshClips();
    toast(T.recDel, () => { cancelPurge(ids); REC.unhide(hidden); refreshClips(); });
  }
};
document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]");
  if(!el || el.disabled) return;
  const f = ACT[el.dataset.a];
  if(f){ e.preventDefault(); f(el); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if(t.dataset.df && D){
    let v = t.value;
    if(t.dataset.df === "extra"){ v = v.replace(/[^\d]/g, "").slice(0, 5); if(t.value !== v) t.value = v; }
    D[t.dataset.df] = v; saveSoon(); return;
  }
  if(t.dataset.sf && SH){
    let v = t.value;
    if(t.dataset.sf === "fee"){ const raw = v.replace(/[^\d]/g, "").slice(0, 8); SH.fee = raw; const c = raw ? comma(raw) : ""; if(t.value !== c) t.value = c; saveSoon(); return; }
    SH[t.dataset.sf] = v; saveSoon();
    if(t.dataset.sf === "perk"){ const b = $('[data-a="leave"][data-k="perk"]'); if(b){ const on = leaveDone(SH, "perk"); b.classList.toggle("on", on); } }
  }
});
document.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.matches && e.target.matches("input.in")) e.target.blur(); });

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.soonTop)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.soonFor)}</p>
    <h1>${esc(T.title).replace(/\n/g, "<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.soonLead)}</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.soonInsta)}</a>
      ${siteLink("groom", "go", `<span>${esc(T.soonOther)}</span>`)}
    </div>
    ${foot()}`;
}

// ===== 시작 =====
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  keepOffline();
  history.replaceState({ sc: "home", arg: null, d: 0 }, "");
  show("home");
  REC.ready.then(() => { if(CUR === "shop" || CUR === "dress") refreshClips(); });
}
route();
window.__ad = { get S(){ return S; }, get MINE(){ return MINE; }, get D(){ return D; }, get CUR(){ return CUR; }, tagsOf, outText, makeImage, REC };   // 화면 흐름 시험용
