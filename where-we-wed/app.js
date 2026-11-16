// 웨딩홀 투어 기록표 ㊺: 홀마다 꼭 물어볼 질문을 보면서 답을 적으면 → 같은 하객 수로 맞춘 예상 총액 · 홀 비교표(이미지 · 엑셀 · 글)
// 기획 docs/웨딩홀-투어/기획.md · 조사 docs/웨딩홀-투어/조사/ · 화면 문구와 질문 목록 text.js · 계산 core.js(WW) · 엑셀 xlsx.js · 공통 기능 shared/common.js
// 적은 내용은 이 기기(브라우저)에만 저장해요. 어디로도 보내지 않아요. 가격 자료는 사이트에 없고, 받은 견적을 직접 적어요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/where-we-wed/?preview)
const OPEN = false;
// =========================================================

const KEY = "whereWeWed.v1";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const ANDROID = /Android/i.test(navigator.userAgent || "");
const QMAP = new Map(QS.map(q => [q.id, q]));
const STAR_KEYS = STARS.map(s => s[0]);
const SORTS = ["tour", "total", "star"];

// ===== 저장 =====
let canStore = true;
try { localStorage.setItem(KEY + ".t", "1"); localStorage.removeItem(KEY + ".t"); } catch (e) { canStore = false; }
// halls 홀 목록 · guests 같이 맞춰 볼 하객 수 · custom 내가 더한 질문 · sort 비교표 차례 · diff 비교표에서 다른 것만
function blank(){ return { v: 1, halls: [], seq: 0, guests: null, custom: [], sort: "tour", diff: false, saved: 0, filed: 0 }; }
function cleanHall(h, id){
  const o = x => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
  return { id, name: String(h.name || "").slice(0, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(h.date || "") ? h.date : "", a: Object.assign({}, o(h.a)), m: Object.assign({}, o(h.m)), star: Object.assign({}, o(h.star)), good: String(h.good || ""), bad: String(h.bad || ""), at: +h.at || 0 };
}
function fill(x){
  const b = blank();
  b.halls = (Array.isArray(x.halls) ? x.halls : []).filter(h => h && typeof h === "object").map((h, i) => cleanHall(h, +h.id > 0 ? +h.id : i + 1));
  b.seq = Math.max(+x.seq || 0, ...b.halls.map(h => h.id), 0);
  b.guests = WW.num(x.guests) > 0 ? Math.round(WW.num(x.guests)) : null;
  b.custom = (Array.isArray(x.custom) ? x.custom : []).filter(c => c && /^c\d+$/.test(c.id) && c.q).map(c => ({ id: c.id, q: String(c.q).slice(0, 60) }));
  b.sort = SORTS.includes(x.sort) ? x.sort : "tour";
  b.diff = !!x.diff; b.saved = +x.saved || 0; b.filed = +x.filed || 0;
  return b;
}
function loadS(){ try { const x = JSON.parse(localStorage.getItem(KEY)); return x && x.v === 1 ? fill(x) : null; } catch (e) { return null; } }
let MINE = loadS() || blank();   // 내 기록
let S = MINE;                    // 지금 보는 기록 (예시를 볼 때는 따로 만든 것)
const isDemo = () => S !== MINE;
let storeWarned = false, saveT = 0;
function saveS(){
  clearTimeout(saveT);
  if(isDemo()) return;
  S.saved = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { canStore = false; if(!storeWarned){ storeWarned = true; toast(T.storeFail); } }
}
function saveSoon(){ clearTimeout(saveT); saveT = setTimeout(saveS, 250); }
window.addEventListener("pagehide", () => { if(saveT) saveS(); });
document.addEventListener("visibilitychange", () => { if(document.hidden && saveT) saveS(); });
function demoState(){
  const d = blank(); d.guests = SAMPLE.guests;
  SAMPLE.halls.forEach((h, i) => d.halls.push(cleanHall(Object.assign({ at: i + 1 }, h), ++d.seq)));
  return d;
}

// ===== 질문 · 홀 =====
function customQs(){ return S.custom.map(c => ({ id: c.id, sec: "mine", q: c.q, kind: "text", ph: T.mineAnsPh, mine: true })); }
function everyQ(){ return QS.concat(customQs()); }
function getQ(id){ return QMAP.get(id) || customQs().find(q => q.id === id) || null; }
function hallById(id){ return S.halls.find(h => h.id === +id) || null; }
function addHall(name, date){ const h = cleanHall({ name, date, at: Date.now() }, ++S.seq); S.halls.push(h); saveS(); return h; }
function calcOf(h){ return WW.calc(h.a, S.guests); }
// 딸린 질문이 보일지: sub = { of, when }(when은 하나 또는 목록) 또는 { and: [ … ] }
function condOk(h, c){ const v = h.a[c.of]; return Array.isArray(c.when) ? c.when.includes(v) : v === c.when; }
function subShown(h, q){ if(!q.sub) return true; return q.sub.and ? q.sub.and.every(c => condOk(h, c)) : condOk(h, q.sub); }
function subOf(q){ return !q.sub ? [] : q.sub.and ? q.sub.and.map(c => c.of) : [q.sub.of]; }
// "꼭 확인할 것" = 처음부터 보이는 질문 + 거기 딸린 질문(봉사료 "몇 %") + 내가 더한 질문. "더 물어볼 것"(접힌 칸)은 빼요.
// opt = "모르면 비워 두세요" 질문: 딸린 질문이어도 꼭 확인할 것에 넣지 않아요 (남은 것에 계속 남지 않게)
function isCore(q){ return !q.opt && !!(q.core || q.mine || (q.sub && (QMAP.get(subOf(q)[0]) || {}).core)); }
function mustOf(h){ return everyQ().filter(q => isCore(q) && subShown(h, q)); }
function leftOf(h){ return mustOf(h).filter(q => !WW.has(q, h.a[q.id])); }
let ONLY = false;   // 홀 화면 "남은 것만 보기"
function unitOf(q){ return q.kind === "man" ? T.uMan : q.kind === "won" ? T.uWon : q.unit || ""; }
function baseText(){ return S.guests ? fm(T.baseOn, { n: WW.comma(S.guests) }) : T.baseOff; }
function totalText(c){ return c.ok ? WW.wonShort(c.total) : ""; }
function headsText(c){
  if(!c.ok) return "";
  if(c.guests == null) return fm(T.headsGuar, { n: WW.comma(c.heads) });
  if(c.under) return fm(T.headsUnder, { n: WW.comma(c.heads), g: WW.comma(c.guests) });
  return fm(T.headsGuests, { n: WW.comma(c.heads) });
}
function dateShort(ymd){ if(!ymd) return ""; const [, m, d] = ymd.split("-"); return `${+m}.${+d}`; }
function todayYmd(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function sortedHalls(){ return WW.sortHalls(S.halls, S.sort, S.guests, STAR_KEYS); }

// ===== 작은 도구 =====
function toast(text, undoFn){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(text)}</span>${undoFn ? `<button type="button" id="toastUndo">${esc(T.undo)}</button>` : ""}`;
  el.classList.toggle("act", !!undoFn);
  if(undoFn) el.querySelector("#toastUndo").onclick = () => { el.classList.remove("on"); undoFn(); };
  el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), undoFn ? 5200 : 2600);
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
function fileBase(){ return `${T.fileName}_${todayYmd()}`; }

// ===== 화면 이동 (휴대폰 뒤로 가기 = 이전 화면) =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
const SCREENS = { home: () => home(), list: () => list(), hall: a => hall(a), cmp: () => cmp() };
let CUR = "home", ARG = null;
function show(sc, arg){
  closeSheet();
  if(saveT) saveS();
  if(!SCREENS[sc]) sc = "home";
  if(sc === "hall" && !hallById(arg)) sc = "list";
  CUR = sc; ARG = arg == null ? null : arg;
  SCREENS[sc](ARG);
}
function depth(){ return (history.state && history.state.d) || 0; }
function go(sc, arg, how){
  const from = how === "replace" ? (history.state && history.state.from) || null : CUR;
  const st = { sc, arg: arg == null ? null : arg, d: how === "replace" ? depth() : depth() + 1, from };
  how === "replace" ? history.replaceState(st, "") : history.pushState(st, "");
  show(sc, arg);
}
// 위쪽 "‹" 버튼: 들어온 길이 있으면 그 길로 돌아가고, 없으면(주소로 바로 들어온 경우) 정해 둔 화면으로
function back(fallback, arg){ if(depth() > 0) history.back(); else go(fallback, arg, "replace"); }
// 어느 화면에서 왔는지 → "‹" 버튼 이름 (목록 / 비교표 / 처음)
function fromSc(){ return (history.state && history.state.from) || null; }
function backLabel(){ const f = fromSc(); return f === "cmp" ? T.toCmp : f === "hall" ? T.toHall : f === "home" ? T.toHome : T.toList; }
let skipPop = false, afterPop = null;
window.addEventListener("popstate", e => {
  const st = e.state;
  if(skipPop){ skipPop = false; return; }
  if(afterPop){ const f = afterPop; afterPop = null; closeSheet(); f(); return; }
  if(document.getElementById("sheet")){ closeSheet(); return; }
  if(st && st.sheet){ skipPop = true; history.back(); return; }
  if(!st || !st.sc || st.sc === "home"){ S = MINE; show("home"); return; }
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
  if(opts.onClose) sh._onClose = opts.onClose;
  return sh;
}
function closeSheet(){
  const sh = document.getElementById("sheet"), f = sh && sh._onClose;
  ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); });
  if(f) f();
}
function dismissSheet(){ if(history.state && history.state.sheet) history.back(); else closeSheet(); }
// 창을 닫은 뒤 다른 일을 할 때: 창 기록을 먼저 되돌리고(비동기) 그다음에 해요
function closeThen(f){ if(history.state && history.state.sheet){ afterPop = f; history.back(); } else { closeSheet(); f(); } }
document.addEventListener("keydown", e => { if(e.key === "Escape" && document.getElementById("sheet")) dismissSheet(); });

// 인스타 · 카톡 안에서 열었을 때: 여러 날에 걸쳐 쓰는 기록이라, 사파리 · 크롬에서 열도록 먼저 권해요
function inAppSheet(then){
  const ia = inApp();
  if(!ia || inAppSheet.ok){ then(); return; }
  const app2 = ANDROID ? "크롬" : "사파리", kakao = ia === "카카오톡";
  const intent = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
  const sh = openSheet(`<h3>${esc(fm(T.iaTitle, { app: app2 }))}</h3>
    <p>${esc(fm(T.iaBody, { from: ia, app: app2 }))}</p>
    <div class="btns">
      ${ANDROID ? `<a class="btn main" href="${esc(intent)}">${esc(T.iaOpenChrome)}</a>` : kakao ? `<a class="btn main" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">${esc(T.iaOpenSafari)}</a>` : ""}
      <button class="btn ${ANDROID || kakao ? "ghost" : "main"}" id="iaCopy">${esc(T.iaCopy)}</button>
      <button class="text-btn" id="iaStay">${esc(T.iaStay)}</button>
    </div>
    ${!ANDROID && !kakao ? `<p class="note small">${esc(T.iaHow)}</p>` : ""}
    <p class="msg" id="iaMsg" role="status"></p>`, T.name, { foot: "", noClose: true });
  sh.querySelector("#iaCopy").onclick = async () => {
    const m = sh.querySelector("#iaMsg");
    try { await navigator.clipboard.writeText(location.href); m.textContent = T.iaCopied; } catch (e) { m.textContent = location.href; }
  };
  sh.querySelector("#iaStay").onclick = () => { inAppSheet.ok = true; closeThen(then); };
}

// ===== 첫 화면 =====
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
function exampleHtml(){
  const d = demoState(), keep = S; S = d;
  const hs = d.halls.slice(0, 3), rows = EX_ROWS.map(id => getQ(id)).filter(Boolean);
  const html = `<div class="ex" aria-hidden="true">
    <div class="ex-h"><span>${esc(T.exTitle)}</span><b>${esc(T.exTag)}</b></div>
    <table class="ex-t"><thead><tr><th></th>${hs.map(h => `<th>${esc(h.name)}</th>`).join("")}</tr></thead><tbody>
      <tr class="big"><th>${esc(T.rowTotal)}</th>${hs.map(h => `<td>${esc(totalText(calcOf(h)))}</td>`).join("")}</tr>
      ${rows.map(q => `<tr><th>${esc(q.short || q.q)}</th>${hs.map(h => `<td>${esc(WW.show(q, h.a[q.id]) || "–")}</td>`).join("")}</tr>`).join("")}
    </tbody></table>
    <p class="ex-n">${esc(fm(T.exNote, { n: WW.comma(d.guests) }))}</p>
  </div>`;
  S = keep;
  return html;
}
function home(){
  S = MINE;
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  const n = MINE.halls.length;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${esc(T.title).replace(/\n/g, "<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${n ? `<button class="main-go" data-a="start"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { n }))}</span></button>`
          : `<button class="main-go" data-a="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>`}
      <button data-a="demo"><span>${esc(T.demo)}</span><span class="q">${esc(T.demoQ)}</span></button>
    </div>
    <div class="lock">${LOCK}<div><b>${esc(T.lockTitle)}</b><span>${esc(T.lockBody)}</span></div></div>
    ${exampleHtml()}
    ${!n ? `<button class="text-btn cover-link" data-a="other">${esc(T.otherAsk)}</button>` : ""}
    <p class="note">${esc(T.noteWho)}</p>
    ${!canStore ? `<p class="note warn-note">${esc(T.noStore)}</p>` : ""}
    ${foot()}`;
}

// ===== 틀 =====
function topBar(backLabel, title, right){
  return `<div class="bk-top"><button class="home" data-a="back">‹ ${esc(backLabel)}</button><b class="bk-title">${esc(title)}</b>${right || '<span class="bk-gap"></span>'}</div>`;
}
function bandsHtml(){
  let h = `<div id="netBox">${netHtml()}</div>`;
  if(isDemo()) h += `<div class="band demo"><span>${esc(T.demoBand)}</span><button data-a="demoExit">${esc(T.demoExit)}</button></div>`;
  return h;
}
function netHtml(){ return navigator.onLine === false ? `<div class="band net" role="status">${esc(T.offBand)}</div>` : ""; }
function netUpdate(){ const el = $("#netBox"); if(el) el.innerHTML = netHtml(); }
window.addEventListener("offline", netUpdate);
window.addEventListener("online", netUpdate);
function keepOffline(){ if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {}); }
function page(cls, inner){
  document.body.classList.remove("is-cover");
  app.className = "bk " + cls;
  app.innerHTML = inner;
}

// ===== 홀 목록 (1 하객 수 → 2 홀 기록 → 3 비교표) =====
function hallCardHtml(h){
  const c = calcOf(h), left = leftOf(h).length, st = WW.starAvg(h, STAR_KEYS);
  return `<li><button class="hall-card" data-a="open" data-id="${h.id}">
    <span class="hc-h"><b>${esc(h.name)}</b>${h.date ? `<em>${esc(fm(T.tourOn, { d: dateShort(h.date) }))}</em>` : ""}</span>
    <span class="hc-total">${c.ok ? `<small>${esc(T.rowTotal)}</small><strong>${esc(totalText(c))}</strong>` : `<small class="none">${esc(T.totalNeed)}</small>`}</span>
    <span class="hc-meta"><span class="${left ? "left" : "ok"}">${esc(left ? fm(T.cardLeft, { n: left }) : T.cardDone)}</span>${st != null ? `<span>★ ${st.toFixed(1)}</span>` : ""}<i aria-hidden="true">›</i></span>
  </button></li>`;
}
function list(){
  const n = S.halls.length;
  page("list", `
    ${topBar(T.toHome, T.name, `<button class="gear" data-a="more">${esc(T.moreBtn)}</button>`)}
    ${bandsHtml()}
    <section class="step">
      <div class="step-h"><i>1</i><h3>${esc(T.step1)}</h3></div>
      <button class="base${S.guests ? " on" : ""}" data-a="guests"><span>${S.guests ? `<b>${esc(fm(T.guestsN, { n: WW.comma(S.guests) }))}</b><small>${esc(T.guestsOnSub)}</small>` : `<b>${esc(T.guestsAsk)}</b><small>${esc(T.guestsOffSub)}</small>`}</span><em>${esc(S.guests ? T.change : T.enter)}</em></button>
    </section>
    <section class="step">
      <div class="step-h"><i>2</i><h3>${esc(T.step2)}</h3>${n ? `<span>${esc(fm(T.hallsN, { n }))}</span>` : ""}</div>
      ${n ? `<ul class="halls">${S.halls.map(hallCardHtml).join("")}</ul>` : `<p class="empty"><b>${esc(T.emptyTitle)}</b>${esc(T.emptyBody)}</p>`}
      <button class="add-hall${n ? "" : " first"}" data-a="add">${esc(n ? T.addHall : T.addFirst)}</button>
    </section>
    <section class="step">
      <div class="step-h"><i>3</i><h3>${esc(T.step3)}</h3></div>
      <button class="btn main" data-a="cmp"${n ? "" : " disabled"}>${esc(T.cmpGo)}</button>
      <p class="note small">${esc(n === 0 ? T.cmpHint0 : n === 1 ? T.cmpHint1 : T.cmpHint2)}</p>
    </section>
    <section class="block before">
      <h3>${esc(T.beforeTitle)}</h3>
      <p class="lead">${esc(T.beforeBody)}</p>
      <button class="out-btn" data-a="askShot"><span><b>${esc(T.askShot)}</b><span>${esc(T.askShotSub)}</span></span><i aria-hidden="true">↓</i></button>
      ${linksHtml()}
    </section>
    <div class="shot-holder" id="shotHolder" aria-hidden="true"></div>`);
  window.scrollTo(0, 0);
}
function linksHtml(){
  return `<ul class="links">${LINKS.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener"><b>${esc(l.name)}</b><span>${esc(l.desc)}</span></a></li>`).join("")}</ul>
    <p class="note small">${esc(T.linksNote)}</p>`;
}

// ===== 홀 한 곳 기록 =====
let H = null;   // 지금 적고 있는 홀
function numShow(q, v){ const n = WW.num(v); return n == null ? "" : q.dec ? String(n) : WW.comma(n); }
function inputHtml(h, q){
  const v = h.a[q.id];
  if(q.kind === "pick") return `<div class="chips" role="group" aria-label="${esc(q.q)}">${q.opts.map(([k, l]) => `<button type="button" class="chip${v === k ? " on" : ""}" data-pick="${q.id}" data-k="${k}" aria-pressed="${v === k}">${esc(l)}</button>`).join("")}</div>`;
  if(q.kind === "multi"){ const arr = Array.isArray(v) ? v : []; return `<div class="chips" role="group" aria-label="${esc(q.q)}">${q.opts.map(([k, l]) => `<button type="button" class="chip multi${arr.includes(k) ? " on" : ""}" data-multi="${q.id}" data-k="${k}" aria-pressed="${arr.includes(k)}">${esc(l)}</button>`).join("")}</div>`; }
  if(q.kind === "text") return `<input class="in sm" id="in-${q.id}" data-q="${q.id}" value="${esc(v || "")}" placeholder="${esc(q.ph || "")}" autocomplete="off" enterkeyhint="done">`;
  const quick = q.quick ? `<div class="chips quick" role="group" aria-label="${esc(T.quickAria)}">${q.quick.map(x => `<button type="button" class="chip sm${WW.num(v) === x ? " on" : ""}" data-quick="${q.id}" data-v="${x}">${esc((Number.isInteger(x) ? WW.comma(x) : String(x)) + (q.kind === "man" ? "만" : q.unit || ""))}</button>`).join("")}</div>` : "";
  return `<div class="unit-in"><input class="in" id="in-${q.id}" data-q="${q.id}" inputmode="${q.dec ? "decimal" : "numeric"}" value="${esc(numShow(q, v))}" placeholder="${esc(q.ph || "")}" autocomplete="off" enterkeyhint="done"><span>${esc(unitOf(q))}</span></div>${quick}`;
}
function liveText(q, v, h){
  if(q.id === "quoteTotal" && h){
    const qc = WW.quoteCheck(h.a);
    if(!qc) return "";
    if(!qc.ok) return T.qcNeed;
    return qc.same ? fm(T.qcSame, { n: WW.comma(qc.heads) }) : fm(T.qcDiff, { calc: WW.wonShort(qc.calc), n: WW.comma(qc.heads), d: WW.wonShort(Math.abs(qc.diff)) });
  }
  if(q.kind === "won"){ const n = WW.num(v); return n != null && n >= 10000 ? WW.wonKo(n) : ""; }
  if(q.kind === "man"){ const n = WW.num(v); return n != null && n >= 10000 ? WW.wonKo(n * WW.MAN) : ""; }
  return "";
}
function liveCls(q, h){
  if(q.id !== "quoteTotal") return "q-live";
  const qc = WW.quoteCheck(h.a);
  return "q-live check" + (qc && qc.ok ? (qc.same ? " ok" : " warn") : "");
}
function qHtml(h, q){
  const memo = (h.m || {})[q.id] || "", done = WW.has(q, h.a[q.id]);
  const info = q.info ? `<details class="q-info"><summary>${esc(q.info.title)}</summary><p>${esc(q.info.body)}</p>${q.info.url ? `<a href="${esc(q.info.url)}" target="_blank" rel="noopener">${esc(q.info.urlText || q.info.url)} ↗</a>` : ""}</details>` : "";
  return `<div class="qrow${done ? " done" : ""}" data-row="${q.id}"${subShown(h, q) ? "" : " hidden"}>
    <div class="q-h"><label ${q.kind === "pick" || q.kind === "multi" ? "" : `for="in-${q.id}"`}>${q.see ? `<span class="q-tag">${esc(T.tagSee)}</span>` : ""}${esc(q.q)}</label>${memo ? "" : `<button class="q-memo-btn" data-a="memo" data-id="${q.id}">${esc(T.memoAdd)}</button>`}${q.mine ? `<button class="q-x" data-a="mineDel" data-id="${q.id}" aria-label="${esc(T.mineDel)}">×</button>` : ""}</div>
    ${q.why ? `<p class="q-why">${esc(q.why)}</p>` : ""}
    ${info}
    ${inputHtml(h, q)}
    <p class="${liveCls(q, h)}" id="live-${q.id}">${esc(liveText(q, h.a[q.id], h))}</p>
    <input class="in sm q-memo" data-memo="${q.id}" value="${esc(memo)}" placeholder="${esc(q.memoPh || T.memoPh)}" autocomplete="off" enterkeyhint="done"${memo ? "" : " hidden"}>
  </div>`;
}
function secLeftN(h, sec){ return leftOf(h).filter(q => q.sec === sec).length; }
function secTag(n){ return n ? `<span class="left">${esc(fm(T.secLeft, { n }))}</span>` : `<span class="ok">${esc(T.secAllDone)}</span>`; }
function secHtml(h, s){
  // 딸린 질문(예: 봉사료 "몇 %")은 부모 질문과 같은 칸에 둬요(isCore). 부모가 펼친 칸에 있는데 딸린 질문만 접힌 칸에 있으면 안 보여요.
  const qs = QS.filter(q => q.sec === s.id), core = qs.filter(isCore), more = qs.filter(q => !isCore(q));
  if(ONLY){
    // 남은 것만: 아직 안 적은 "꼭 확인할 것"만. 그리면서 정해서, 적는 도중에 칸이 사라지지 않아요.
    const left = core.filter(q => subShown(h, q) && !WW.has(q, h.a[q.id]));
    if(!left.length) return "";
    return `<section class="sec" id="sec-${s.id}"><div class="sec-h"><h3>${esc(s.name)}</h3><span id="pg-${s.id}">${secTag(left.length)}</span></div><div class="qs">${left.map(q => qHtml(h, q)).join("")}</div></section>`;
  }
  const openMore = more.some(q => WW.has(q, h.a[q.id]) || (h.m || {})[q.id]);
  return `<section class="sec" id="sec-${s.id}">
    <div class="sec-h"><h3>${esc(s.name)}</h3><span id="pg-${s.id}">${secTag(secLeftN(h, s.id))}</span></div>
    ${s.lead ? `<p class="sec-lead">${esc(s.lead)}</p>` : ""}
    <div class="qs">${core.map(q => qHtml(h, q)).join("")}</div>
    ${more.length ? `<details class="more-q"${openMore ? " open" : ""}><summary>${esc(fm(T.moreQ, { n: more.filter(q => !q.sub).length }))}</summary><div class="qs">${more.map(q => qHtml(h, q)).join("")}</div></details>` : ""}
    ${s.tip ? `<div class="tip"><b>${esc(T.tipTitle)}</b><p>${esc(s.tip)}</p></div>` : ""}
  </section>`;
}
function mineHtml(h){
  let qs = customQs();
  if(ONLY){ qs = qs.filter(q => !WW.has(q, h.a[q.id])); if(!qs.length) return ""; }
  return `<section class="sec" id="sec-mine">
    <div class="sec-h"><h3>${esc(T.mineTitle)}</h3></div>
    <p class="sec-lead">${esc(T.mineLead)}</p>
    ${qs.length ? `<div class="qs">${qs.map(q => qHtml(h, q)).join("")}</div>` : ""}
    ${ONLY ? "" : `<button class="add-q" data-a="mineAdd">${esc(T.mineAdd)}</button>`}
  </section>`;
}
function starsHtml(h){
  if(ONLY) return "";
  return `<section class="sec" id="sec-feel">
    <div class="sec-h"><h3>${esc(T.feelTitle)}</h3></div>
    <p class="sec-lead">${esc(T.feelLead)}</p>
    <div class="stars">${STARS.map(([k, l]) => { const v = +(h.star[k]) || 0; return `<div class="star-r"><span>${esc(l)}</span><div class="star-b" role="group" aria-label="${esc(l)}">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="st${i <= v ? " on" : ""}" data-star="${k}" data-v="${i}" aria-label="${esc(fm(T.starAria, { n: i }))}" aria-pressed="${i === v}">★</button>`).join("")}</div></div>`; }).join("")}</div>
    <label class="lbl" for="fGood">${esc(T.goodLbl)}</label>
    <textarea class="in area" id="fGood" data-f="good" rows="2" placeholder="${esc(T.goodPh)}">${esc(h.good)}</textarea>
    <label class="lbl" for="fBad">${esc(T.badLbl)}</label>
    <textarea class="in area" id="fBad" data-f="bad" rows="2" placeholder="${esc(T.badPh)}">${esc(h.bad)}</textarea>
  </section>`;
}
function sumBarInner(h){
  const c = calcOf(h);
  return c.ok
    ? `<span><small>${esc(T.rowTotal)} · ${esc(headsText(c))}</small><b>${esc(totalText(c))}</b></span><i>${esc(T.detail)} ›</i>`
    : `<span><small>${esc(T.rowTotal)}</small><b class="none">${esc(T.totalNeed)}</b></span><i>${esc(T.detail)} ›</i>`;
}
function chkHtml(h){
  const all = mustOf(h).length, left = leftOf(h).length, done = all - left;
  return `<div class="chk-t">${left ? `<b>${esc(fm(T.leftN, { n: left }))}</b>` : `<b class="ok">${esc(T.leftNone)}</b>`}<span>${esc(fm(T.leftOf, { all, done }))}</span></div>
    <div class="chk-bar" aria-hidden="true"><i style="width:${all ? Math.round(done / all * 100) : 100}%"></i></div>
    <button class="tgl${ONLY ? " on" : ""}" data-a="onlyLeft" aria-pressed="${ONLY}"><span class="cb${ONLY ? " on" : ""}">${CHECK}</span>${esc(T.onlyLeft)}</button>`;
}
function leaveHtml(h){
  const left = leftOf(h);
  if(!left.length) return `<p class="leave-ok">${esc(T.leaveOk)}</p>`;
  return `<h3>${esc(T.leaveTitle)}</h3><p class="lead">${esc(fm(T.leaveBody, { n: left.length }))}</p>
    <div class="chips">${left.map(q => `<button type="button" class="chip" data-a="goQ" data-id="${q.id}">${esc(q.short || q.q)}</button>`).join("")}</div>`;
}
function hall(id){
  const h = H = hallById(id);
  if(hall.last !== h.id){ ONLY = false; hall.last = h.id; }
  const none = ONLY && !leftOf(h).length;
  page("hall", `
    ${topBar(backLabel(), h.name, `<button class="gear" data-a="hallMenu">${esc(T.hallMenu)}</button>`)}
    ${bandsHtml()}
    <p class="hall-sub"><span id="hallDate">${esc(h.date ? fm(T.tourOnLong, { d: h.date.replace(/-/g, ".") }) : T.tourNoDate)}</span></p>
    <button class="sumbar" id="sumBar" data-a="detail">${sumBarInner(h)}</button>
    <div class="chk" id="chk">${chkHtml(h)}</div>
    ${ONLY ? "" : `<nav class="jump" aria-label="${esc(T.jumpAria)}">${SECS.map(s => `<button data-a="jump" data-id="${s.id}">${esc(s.jump || s.name)}</button>`).join("")}<button data-a="jump" data-id="feel">${esc(T.feelShort)}</button></nav>`}
    ${none ? `<div class="sec all-done"><b>${esc(T.allDoneTitle)}</b><p>${esc(T.allDoneBody)}</p><button class="btn ghost" data-a="onlyLeft">${esc(T.allDoneBtn)}</button></div>` : ""}
    ${SECS.map(s => secHtml(h, s)).join("")}
    ${mineHtml(h)}
    ${starsHtml(h)}
    <section class="leave" id="leaveBox">${leaveHtml(h)}</section>
    <div class="btns end">
      <button class="btn main" data-a="cmp">${esc(T.cmpGo)}</button>
      <button class="btn ghost" data-a="toList">${esc(T.toListBtn)}</button>
    </div>
    <p class="note small">${esc(T.calcNote)}</p>`);
  window.scrollTo(0, 0);
}
function refreshHall(){
  if(CUR !== "hall" || !H) return;
  const bar = $("#sumBar"); if(bar) bar.innerHTML = sumBarInner(H);
  const ck = $("#chk"); if(ck) ck.innerHTML = chkHtml(H);
  const lv = $("#leaveBox"); if(lv) lv.innerHTML = leaveHtml(H);
  for(const s of SECS){ const el = $("#pg-" + s.id); if(el) el.innerHTML = secTag(secLeftN(H, s.id)); }
  const qt = $("#live-quoteTotal"), qq = getQ("quoteTotal"); if(qt && qq){ qt.textContent = liveText(qq, H.a.quoteTotal, H); qt.className = liveCls(qq, H); }
}
function setAnswer(q, raw){
  if(!H) return;
  let v = raw;
  if(q.kind === "man" || q.kind === "won" || q.kind === "num"){ const n = WW.num(raw); v = n == null ? "" : n; }
  else if(q.kind === "text") v = String(raw).slice(0, 200);
  else if(q.kind === "multi") v = Array.isArray(raw) && raw.length ? raw : "";
  if(v === "" || v == null) delete H.a[q.id]; else H.a[q.id] = v;
  const row = $(`[data-row="${q.id}"]`); if(row) row.classList.toggle("done", WW.has(q, H.a[q.id]));
  const live = $("#live-" + q.id); if(live) live.textContent = liveText(q, H.a[q.id], H);
  // 이 답에 딸린 질문(예: 봉사료가 따로 붙을 때만 묻는 "몇 %")을 보이거나 숨겨요
  for(const s of QS) if(subOf(s).includes(q.id)){ const r = $(`[data-row="${s.id}"]`); if(r) r.hidden = !subShown(H, s); }
  saveSoon(); refreshHall();
}
// 숫자 칸: 치는 동안 쉼표를 넣어 줘요 (65000 → 65,000)
function onType(el){
  const q = getQ(el.dataset.q); if(!q) return;
  if(q.kind === "text"){ setAnswer(q, el.value); return; }
  let s = el.value.replace(q.dec ? /[^0-9.]/g : /[^0-9]/g, "");
  if(q.dec){ const i = s.indexOf("."); if(i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ""); }
  if(s.length > 9) s = s.slice(0, 9);
  const n = WW.num(s);
  const shown = n == null ? "" : q.dec ? s : WW.comma(n);
  if(el.value !== shown) el.value = shown;
  $$(`[data-quick="${q.id}"]`).forEach(b => b.classList.toggle("on", n != null && +b.dataset.v === n));
  setAnswer(q, n == null ? "" : n);
}

// ===== 창들 =====
function guestsSheet(){
  const sh = openSheet(`<h3>${esc(T.gTitle)}</h3>
    <p>${esc(T.gBody)}</p>
    <div class="unit-in big"><input class="in" id="gIn" inputmode="numeric" value="${S.guests ? WW.comma(S.guests) : ""}" placeholder="${esc(T.gPh)}" autocomplete="off" enterkeyhint="done" aria-label="${esc(T.gTitle)}"><span>${esc(T.uHeads)}</span></div>
    <div class="chips g-chips">${[100, 150, 200, 250, 300, 400].map(n => `<button type="button" class="chip" data-g="${n}">${n}</button>`).join("")}</div>
    <p class="note small">${esc(T.gNote)}</p>`, T.gTitle,
    { foot: `<div class="sheet-x two-b"><button class="btn ghost" id="gClear">${esc(T.gClear)}</button><button class="btn main" id="gOk">${esc(T.gOk)}</button></div>` });
  const inp = sh.querySelector("#gIn");
  inp.oninput = () => { const n = WW.num(inp.value.replace(/[^0-9]/g, "").slice(0, 4)); inp.value = n == null ? "" : WW.comma(n); };
  $$("[data-g]", sh).forEach(b => b.onclick = () => { inp.value = b.dataset.g; });
  const done = n => { S.guests = n; saveS(); closeThen(() => { show(CUR, ARG); toast(n ? fm(T.gSaved, { n: WW.comma(n) }) : T.gCleared); }); };
  sh.querySelector("#gOk").onclick = () => { const n = WW.num(inp.value); done(n > 0 ? Math.round(n) : null); };
  sh.querySelector("#gClear").onclick = () => done(null);
  inp.onkeydown = e => { if(e.key === "Enter") sh.querySelector("#gOk").click(); };
}
function hallForm(h){
  const isNew = !h;
  const sh = openSheet(`<h3>${esc(isNew ? T.addTitle : T.editTitle)}</h3>
    <label class="lbl" for="hName">${esc(T.nameLbl)}</label>
    <input class="in" id="hName" value="${esc(h ? h.name : "")}" placeholder="${esc(T.namePh)}" maxlength="40" autocomplete="off" enterkeyhint="done">
    <label class="lbl" for="hDate">${esc(T.dateLbl)}</label>
    <input class="in sm" id="hDate" type="date" value="${esc(h ? h.date : todayYmd())}">
    <p class="f-msg" id="hMsg" role="alert"></p>`, isNew ? T.addTitle : T.editTitle,
    { foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.cancel)}</button><button class="btn main" id="hOk">${esc(isNew ? T.addOk : T.editOk)}</button></div>` });
  const name = sh.querySelector("#hName"), date = sh.querySelector("#hDate");
  const ok = () => {
    const nm = name.value.trim();
    if(!nm){ sh.querySelector("#hMsg").textContent = T.nameNeed; name.focus(); return; }
    if(isNew){ const nh = addHall(nm, date.value); closeThen(() => go("hall", nh.id)); }
    else { h.name = nm.slice(0, 40); h.date = /^\d{4}-\d{2}-\d{2}$/.test(date.value) ? date.value : ""; saveS(); closeThen(() => show(CUR, ARG)); }
  };
  sh.querySelector("#hOk").onclick = ok;
  name.onkeydown = e => { if(e.key === "Enter") ok(); };
  if(isNew && !matchMedia("(pointer:coarse)").matches) name.focus();
}
function hallMenuSheet(){
  const h = H; if(!h) return;
  const sh = openSheet(`<h3>${esc(h.name)}</h3>
    <div class="outs">
      <button class="out-btn" id="mEdit"><span><b>${esc(T.menuEdit)}</b><span>${esc(T.menuEditSub)}</span></span><i aria-hidden="true">›</i></button>
      <button class="out-btn" id="mCopy"><span><b>${esc(T.menuCopy)}</b><span>${esc(T.menuCopySub)}</span></span><i aria-hidden="true">›</i></button>
      <button class="out-btn" id="mDel"><span><b class="danger">${esc(T.menuDel)}</b><span>${esc(T.menuDelSub)}</span></span><i aria-hidden="true">›</i></button>
    </div>`, h.name);
  sh.querySelector("#mEdit").onclick = () => closeThen(() => hallForm(h));
  sh.querySelector("#mCopy").onclick = () => {
    const nh = cleanHall(Object.assign({}, h, { name: (h.name + " " + T.copyTail).slice(0, 40), at: Date.now() }), ++S.seq);
    S.halls.push(nh); saveS();
    closeThen(() => { go("hall", nh.id, "replace"); toast(T.copied); });
  };
  sh.querySelector("#mDel").onclick = () => {
    const i = S.halls.indexOf(h); if(i < 0) return;
    S.halls.splice(i, 1); saveS();
    closeThen(() => {
      const undo = () => { S.halls.splice(Math.min(i, S.halls.length), 0, h); saveS(); show(CUR, ARG); };
      if(depth() > 0){ afterPop = () => { const st = history.state || {}; show(st.sc === "cmp" && S.halls.length ? "cmp" : "list"); toast(fm(T.deleted, { name: h.name }), undo); }; history.back(); }
      else { go("list", null, "replace"); toast(fm(T.deleted, { name: h.name }), undo); }
    });
  };
}
const LINE_NAME = () => ({ rent: T.lnRent, flower: T.lnFlower, must: T.lnMust, drink: T.lnDrink, meal: T.lnMeal, svc: T.lnSvc, vat: T.lnVat });
function lineLabel(l){
  const nm = LINE_NAME()[l.k] || l.k;
  if(l.k === "meal") return l.extraHeads > 0 && l.overUnit !== l.unit
    ? fm(T.lnMealOver, { unit: WW.wonFull(l.unit), base: WW.comma(l.base), over: WW.wonFull(l.overUnit), extra: WW.comma(l.extraHeads) })
    : fm(T.lnMealX, { unit: WW.wonFull(l.unit), n: WW.comma(l.heads) });
  if(l.k === "svc") return `${nm} ${l.pct}%${l.onMeal ? " " + T.lnOnMeal : ""}`;
  if(l.k === "vat") return `${nm} ${l.pct}%${l.onSvc ? " " + T.lnOnSvc : ""}`;
  return nm;
}
function detailHtml(h){
  const c = calcOf(h);
  if(!c.ok) return `<p>${esc(T.detailNeed)}</p><ul class="need">${c.need.map(k => `<li>${esc((getQ(k) || {}).q || k)}</li>`).join("")}</ul>`;
  return `<p class="d-base">${esc(headsText(c))}</p>
    <table class="kv">${c.lines.map(l => `<tr><th>${esc(lineLabel(l))}</th><td>${esc(l.won < 0 ? "−" + WW.wonFull(-l.won) : WW.wonFull(l.won))}</td></tr>`).join("")}
      <tr class="sumrow"><th>${esc(T.rowTotal)}</th><td>${esc(WW.wonFull(c.total))}</td></tr>
      <tr><th>${esc(T.rowPer)}</th><td>${esc(WW.wonFull(c.perHead))}</td></tr></table>
    ${c.under ? `<p class="d-warn">${esc(fm(T.underNote, { g: WW.comma(c.guests), n: WW.comma(c.guar) }))}</p>` : ""}
    ${c.unknown.map(k => `<p class="d-warn">${esc(T["unk_" + k] || k)}</p>`).join("")}
    ${c.split ? `<p class="d-warn">${esc(T.splitNote)}</p>` : ""}
    <p class="note small">${esc(T.calcNote)}</p>`;
}
function detailSheet(h){
  const sh = openSheet(`<h3>${esc(fm(T.detailTitle, { name: h.name }))}</h3>${detailHtml(h)}
    <button class="text-btn" id="dGuests">${esc(S.guests ? T.detailGuestsChange : T.detailGuestsSet)}</button>`, T.detail);
  sh.querySelector("#dGuests").onclick = () => closeThen(guestsSheet);
}
function mineAddSheet(){
  const sh = openSheet(`<h3>${esc(T.mineAddTitle)}</h3>
    <p>${esc(T.mineAddBody)}</p>
    <input class="in sm" id="mqIn" placeholder="${esc(T.mineQPh)}" maxlength="60" autocomplete="off" enterkeyhint="done" aria-label="${esc(T.mineAddTitle)}">
    <p class="f-msg" id="mqMsg" role="alert"></p>`, T.mineAddTitle,
    { foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.cancel)}</button><button class="btn main" id="mqOk">${esc(T.mineAddOk)}</button></div>` });
  const inp = sh.querySelector("#mqIn");
  const ok = () => {
    const q = inp.value.trim();
    if(!q){ sh.querySelector("#mqMsg").textContent = T.mineNeed; inp.focus(); return; }
    const n = S.custom.reduce((m, c) => Math.max(m, +c.id.slice(1) || 0), 0) + 1;
    S.custom.push({ id: "c" + n, q: q.slice(0, 60) }); saveS();
    closeThen(() => { const y = window.scrollY; show(CUR, ARG); window.scrollTo(0, y); const el = $("#in-c" + n); if(el){ el.scrollIntoView({ block: "center" }); if(!matchMedia("(pointer:coarse)").matches) el.focus(); } });
  };
  sh.querySelector("#mqOk").onclick = ok;
  inp.onkeydown = e => { if(e.key === "Enter") ok(); };
  if(!matchMedia("(pointer:coarse)").matches) inp.focus();
}
function moreSheet(){
  const sh = openSheet(`<h3>${esc(T.moreTitle)}</h3>
    <p>${esc(T.moreBody)}</p>
    <div class="outs">
      <button class="out-btn" id="bkSave"><span><b>${esc(T.bkSave)}</b><span>${esc(T.bkSaveSub)}</span></span><i aria-hidden="true">↓</i></button>
      <button class="out-btn" id="bkLoad"><span><b>${esc(T.bkLoad)}</b><span>${esc(T.bkLoadSub)}</span></span><i aria-hidden="true">↑</i></button>
      <button class="out-btn" id="wipe"><span><b class="danger">${esc(T.wipe)}</b><span>${esc(T.wipeSub)}</span></span><i aria-hidden="true">›</i></button>
    </div>
    ${inApp() ? `<p class="note small">${esc(fm(T.bkInApp, { from: inApp(), app: ANDROID ? "크롬" : "사파리" }))}</p>` : ""}
    <p class="msg" id="moreMsg" role="status"></p>`, T.moreTitle);
  sh.querySelector("#bkSave").onclick = saveBackup;
  sh.querySelector("#bkLoad").onclick = pickBackup;
  sh.querySelector("#wipe").onclick = () => closeThen(wipeSheet);
}
function wipeSheet(){
  const sh = openSheet(`<h3>${esc(T.wipeTitle)}</h3><p>${esc(fm(T.wipeBody, { n: S.halls.length }))}</p>`, T.wipeTitle,
    { foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.cancel)}</button><button class="btn main danger-bg" id="wipeOk">${esc(T.wipeOk)}</button></div>` });
  sh.querySelector("#wipeOk").onclick = () => {
    if(isDemo()){ closeThen(() => {}); return; }
    const old = JSON.stringify(MINE);
    MINE = blank(); S = MINE; saveS();
    closeThen(() => { show("list"); toast(T.wiped, () => { MINE = fill(JSON.parse(old)); S = MINE; saveS(); show("list"); }); });
  };
}

// ===== 백업 파일 =====
function saveBackup(){
  if(isDemo()){ toast(T.demoNoSave); return; }
  const file = new File([JSON.stringify({ app: "where-we-wed", v: 1, at: Date.now(), data: MINE })], fileBase() + ".json", { type: "application/json" });
  MINE.filed = Date.now(); saveS();
  shareOrSave(file, T.bkSaved);
}
function pickBackup(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let d = null;
      try { const x = JSON.parse(rd.result); d = x && x.app === "where-we-wed" && x.data && x.data.v === 1 ? fill(x.data) : null; } catch (e) {}
      if(!d || !d.halls.length){ const m = $("#moreMsg"); if(m) m.textContent = T.bkBad; else toast(T.bkBad); return; }
      loadSheet(d);
    };
    rd.readAsText(f);
  };
  inp.click();
}
function mergeIn(d){
  const map = {};
  for(const c of d.custom){
    const same = MINE.custom.find(x => x.q === c.q);
    if(same){ map[c.id] = same.id; continue; }
    const n = MINE.custom.reduce((m, x) => Math.max(m, +x.id.slice(1) || 0), 0) + 1;
    MINE.custom.push({ id: "c" + n, q: c.q }); map[c.id] = "c" + n;
  }
  for(const h of d.halls){
    const nh = cleanHall(h, ++MINE.seq);
    for(const obj of [nh.a, nh.m]) for(const k of Object.keys(obj)) if(/^c\d+$/.test(k)){ const v = obj[k]; delete obj[k]; if(map[k]) obj["\u0000" + map[k]] = v; }
    for(const obj of [nh.a, nh.m]) for(const k of Object.keys(obj)) if(k[0] === "\u0000"){ obj[k.slice(1)] = obj[k]; delete obj[k]; }
    MINE.halls.push(nh);
  }
  if(!MINE.guests && d.guests) MINE.guests = d.guests;
}
function loadSheet(d){
  const has = MINE.halls.length;
  const sh = openSheet(`<h3>${esc(T.loadTitle)}</h3>
    <p>${esc(fm(T.loadBody, { n: d.halls.length, names: d.halls.map(h => h.name).join(", ") }))}</p>
    <div class="btns">
      ${has ? `<button class="btn main" id="ldAdd">${esc(fm(T.loadAdd, { n: has }))}</button><button class="btn ghost" id="ldSwap">${esc(T.loadSwap)}</button>`
            : `<button class="btn main" id="ldSwap">${esc(T.loadGo)}</button>`}
    </div>`, T.loadTitle, { close: T.cancel });
  const fin = () => { S = MINE; saveS(); closeThen(() => { show("list"); toast(T.loaded); }); };
  const add = sh.querySelector("#ldAdd"); if(add) add.onclick = () => { mergeIn(d); fin(); };
  sh.querySelector("#ldSwap").onclick = () => { MINE = d; fin(); };
}

// ===== 비교표 =====
// 줄 목록: { kind: "group" | "row", label, cells[], cls } — 화면 · 이미지 · 글 · 엑셀이 같이 써요
function cellOf(h, q){
  const raw = h.a[q.id], v = WW.show(q, raw), memo = ((h.m || {})[q.id] || "").trim();
  const o = q.kind === "pick" ? (q.opts || []).find(x => x[0] === raw) : null;
  // na = 꼭 확인할 것인데 아직 안 물어본 칸 · bad = 아쉬운 답(고르기에서 3번째 칸이 "bad")
  return { v, memo, na: !v && isCore(q) && subShown(h, q), bad: !!(o && o[2] === "bad") };
}
// 한 줄에서 가장 나은 칸에 표시: score는 홀마다 숫자(없으면 null), better는 "low"(작을수록 좋음) · "high"
function markBest(cells, score, better){
  const xs = score.filter(x => x != null && isFinite(x));
  if(xs.length < 2 || xs.every(x => x === xs[0])) return;
  const b = better === "low" ? Math.min(...xs) : Math.max(...xs);
  score.forEach((x, i) => { if(x === b) cells[i].best = true; });
}
function scoreOf(h, q){
  if(!subShown(h, q)) return null;
  const raw = h.a[q.id];
  if(q.kind === "pick"){ if(!q.rank) return null; const i = (q.opts || []).findIndex(x => x[0] === raw); return i < 0 || q.opts[i][2] === "skip" ? null : i; }
  if(q.kind !== "num" && q.kind !== "man" && q.kind !== "won") return null;
  return WW.num(raw);
}
function cmpRows(hs, opt){
  opt = opt || {};
  const rows = [], calcs = hs.map(calcOf);
  const push = (label, cells, cls) => rows.push({ kind: "row", label, cells, cls: cls || "" });
  rows.push({ kind: "group", label: T.grpTotal });
  const tot = calcs.map(c => ({ v: c.ok ? WW.wonShort(c.total) : "", memo: c.ok ? "" : T.cellNeed }));
  markBest(tot, calcs.map(c => (c.ok ? c.total : null)), "low");
  push(T.rowTotal, tot, "total");
  const per = calcs.map(c => ({ v: c.ok ? WW.wonFull(c.perHead) : "", memo: "" }));
  markBest(per, calcs.map(c => (c.ok ? c.perHead : null)), "low");
  push(T.rowPer, per);
  push(T.rowHeads, calcs.map(c => ({ v: c.ok ? fm(T.headsCell, { n: WW.comma(c.heads) }) : "", memo: c.ok && c.under ? fm(T.headsCellUnder, { n: WW.comma(c.guar) }) : "" })));
  const secs = SECS.slice().sort((x, y) => (x.cmp || 99) - (y.cmp || 99)).map(s => ({ id: s.id, name: s.name })).concat([{ id: "mine", name: T.mineTitle }]);
  for(const s of secs){
    const qs = everyQ().filter(q => q.sec === s.id);
    const part = [];
    for(const q of qs){
      const cells = hs.map(h => (subShown(h, q) ? cellOf(h, q) : { v: "", memo: "" }));
      if(cells.every(c => !c.v && !c.memo && !c.na)) continue;
      if(q.better || q.rank) markBest(cells, hs.map(h => scoreOf(h, q)), q.rank ? "low" : q.better);
      part.push({ kind: "row", label: q.short || q.q, cells, cls: "", id: q.id });
    }
    if(part.length){ rows.push({ kind: "group", label: s.name }); rows.push(...part); }
  }
  const feel = [];
  if(hs.some(h => WW.starAvg(h, STAR_KEYS) != null)){
    const avg = hs.map(h => { const v = WW.starAvg(h, STAR_KEYS); return { v: v == null ? "" : "★ " + v.toFixed(1), memo: "" }; });
    markBest(avg, hs.map(h => WW.starAvg(h, STAR_KEYS)), "high");
    feel.push({ kind: "row", label: T.rowStar, cells: avg, cls: "star" });
    for(const [k, l] of STARS){
      if(!hs.some(h => +(h.star[k]) > 0)) continue;
      const cells = hs.map(h => ({ v: +(h.star[k]) > 0 ? "★".repeat(+h.star[k]) : "", memo: "" }));
      markBest(cells, hs.map(h => (+(h.star[k]) > 0 ? +h.star[k] : null)), "high");
      feel.push({ kind: "row", label: l, cells, cls: "starrow" });
    }
  }
  if(hs.some(h => h.good.trim())) feel.push({ kind: "row", label: T.goodLbl, cells: hs.map(h => ({ v: h.good.trim(), memo: "" })), cls: "long" });
  if(hs.some(h => h.bad.trim())) feel.push({ kind: "row", label: T.badLbl, cells: hs.map(h => ({ v: h.bad.trim(), memo: "" })), cls: "long" });
  if(feel.length){ rows.push({ kind: "group", label: T.feelTitle }); rows.push(...feel); }
  if(!opt.diff) return rows;
  // 다른 것만: 홀마다 값이 같은 줄을 빼고, 줄이 하나도 안 남은 묶음 제목도 빼요
  const out = [];
  for(let i = 0; i < rows.length; i++){
    const r = rows[i];
    if(r.kind === "group"){ out.push(r); continue; }
    if(r.cls === "total" || WW.differs(r.cells.map(c => c.v + "|" + c.memo))) out.push(r);
  }
  return out.filter((r, i) => r.kind !== "group" || (out[i + 1] && out[i + 1].kind === "row"));
}
function tableHtml(hs, rows, forShot){
  return `<table class="cmp-t${forShot ? " shot-t" : ""}"><thead><tr><th class="c0">${esc(T.colItem)}</th>${hs.map(h => `<th>${forShot ? `<span>${esc(h.name)}</span>` : `<button data-a="open" data-id="${h.id}">${esc(h.name)}</button>`}${h.date ? `<small>${esc(fm(T.tourOn, { d: dateShort(h.date) }))}</small>` : ""}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => r.kind === "group"
      ? `<tr class="grp"><th class="c0" colspan="${hs.length + 1}"><span>${esc(r.label)}</span></th></tr>`
      : `<tr class="${r.cls}"><th class="c0">${esc(r.label)}</th>${r.cells.map(c => `<td class="${[c.best ? "best" : "", c.bad ? "bad" : "", c.na ? "na" : ""].filter(Boolean).join(" ")}">${c.v ? `<b>${c.best ? '<em class="mk">✓</em>' : ""}${esc(c.v)}</b>` : c.na ? `<em class="na">${esc(T.cellNotAsked)}</em>` : c.memo ? "" : `<i>–</i>`}${c.memo ? `<small>${esc(c.memo)}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function cmp(){
  const hs = sortedHalls(), n = hs.length;
  if(!n){ go("list", null, "replace"); return; }
  const rows = cmpRows(hs, { diff: S.diff && n > 1 });
  page("cmp", `
    ${topBar(backLabel(), T.cmpTitle)}
    ${bandsHtml()}
    <button class="base${S.guests ? " on" : ""}" data-a="guests"><span>${S.guests ? `<b>${esc(fm(T.guestsN, { n: WW.comma(S.guests) }))}</b><small>${esc(T.guestsOnSub)}</small>` : `<b>${esc(T.guestsAsk)}</b><small>${esc(T.guestsOffSub)}</small>`}</span><em>${esc(S.guests ? T.change : T.enter)}</em></button>
    ${n > 1 ? `<div class="cmp-ctl">
      <div class="seg" role="group" aria-label="${esc(T.sortAria)}">${SORTS.map(k => `<button data-a="sort" data-k="${k}" class="${S.sort === k ? "on" : ""}" aria-pressed="${S.sort === k}">${esc(T["sort_" + k])}</button>`).join("")}</div>
      <button class="tgl${S.diff ? " on" : ""}" data-a="diff" aria-pressed="${!!S.diff}"><span class="cb${S.diff ? " on" : ""}">${CHECK}</span>${esc(T.diffOnly)}</button>
    </div>` : `<p class="note small one">${esc(T.cmpOne)}</p>`}
    <div class="cmp-wrap" id="cmpWrap" tabindex="0" aria-label="${esc(T.cmpTitle)}">${tableHtml(hs, rows)}</div>
    <p class="legend">${legendHtml()}</p>
    ${n > 2 ? `<p class="note small swipe only-phone">${esc(T.swipe)}</p>` : ""}
    <section class="block">
      <h3>${esc(T.outTitle)}</h3>
      <div class="outs">
        <button class="out-btn main" data-a="saveImg"><span><b>${esc(T.outImg)}</b><span>${esc(T.outImgSub)}</span></span><i aria-hidden="true">↓</i></button>
        <button class="out-btn" data-a="saveXlsx"><span><b>${esc(T.outXlsx)}</b><span>${esc(T.outXlsxSub)}</span></span><i aria-hidden="true">↓</i></button>
        <button class="out-btn" data-a="copyTxt"><span><b>${esc(T.outTxt)}</b><span>${esc(T.outTxtSub)}</span></span><i aria-hidden="true">⧉</i></button>
      </div>
      <p class="msg" id="outMsg" role="status"></p>
    </section>
    <p class="note small">${esc(T.calcNote)}</p>
    <div class="shot-holder" id="shotHolder" aria-hidden="true"></div>`);
  window.scrollTo(0, 0);
}
function legendHtml(){ return `<span><em class="mk">✓</em>${esc(T.lgBest)}</span><span class="bad">${esc(T.lgBad)}</span><span><em class="na">${esc(T.cellNotAsked)}</em>${esc(T.lgNa)}</span>`; }
function cmpSub(){ return `${S.guests ? fm(T.baseOn, { n: WW.comma(S.guests) }) : T.baseOff} · ${todayYmd().replace(/-/g, ".")}`; }
async function shoot(html, name, msgEl){
  const holder = $("#shotHolder");
  if(!holder || typeof window.html2canvas !== "function"){ if(msgEl) msgEl.textContent = T.imgFail; return; }
  if(msgEl) msgEl.textContent = T.imgMaking;
  holder.innerHTML = html;
  try {
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    const el = holder.firstElementChild;
    const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff", logging: false, windowWidth: el.offsetWidth + 40 });
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    holder.innerHTML = "";
    if(!blob) throw new Error("no blob");
    if(msgEl) msgEl.textContent = "";
    await shareOrSave(new File([blob], name + ".png", { type: "image/png" }), T.imgSaved);
  } catch (e) { holder.innerHTML = ""; if(msgEl) msgEl.textContent = T.imgFail; }
}
function saveImage(){
  const hs = sortedHalls(), rows = cmpRows(hs, { diff: S.diff && hs.length > 1 });
  const w = 118 + 150 * hs.length + 56;
  shoot(`<div class="shot" style="width:${w}px"><p class="shot-k">${esc(T.shotKicker)}</p><h2>${esc(T.cmpTitle)}</h2><p class="shot-d">${esc(cmpSub())}</p>
    ${tableHtml(hs, rows, true)}
    <p class="legend">${legendHtml()}</p>
    <p class="shot-n">${esc(T.calcNote)}</p>${sign()}</div>`, fileBase(), $("#outMsg"));
}
function askShot(){
  const li = q => `<li><i></i><span><b>${q.see ? `<em>${esc(T.tagSee)}</em>` : ""}${esc(q.q)}</b>${q.why ? `<small>${esc(q.why)}</small>` : ""}</span></li>`;
  const phone = QS.filter(q => q.phone && q.core);
  const secs = SECS.map(s => ({ s, qs: QS.filter(q => q.sec === s.id && q.core && !q.sub && !q.phone) })).filter(x => x.qs.length);
  const custom = customQs();
  shoot(`<div class="shot ask" style="width:520px"><p class="shot-k">${esc(T.shotKicker)}</p><h2>${esc(T.askTitle)}</h2><p class="shot-d">${esc(T.askSub)}</p>
    <h4>${esc(T.askPhone)} <small>${esc(T.askPhoneSub)}</small></h4><ul>${phone.map(li).join("")}</ul>
    ${secs.map(x => `<h4>${esc(x.s.name)}</h4><ul>${x.qs.map(li).join("")}</ul>`).join("")}
    ${custom.length ? `<h4>${esc(T.mineTitle)}</h4><ul>${custom.map(li).join("")}</ul>` : ""}
    <p class="shot-n">${esc(T.askNote)}</p>${sign()}</div>`, T.askFile, null);
  toast(T.imgMaking);
}
function cmpText(){
  const hs = sortedHalls(), out = [`[${T.cmpTitle}] ${cmpSub()}`];
  const marks = "①②③④⑤⑥⑦⑧⑨⑩";
  hs.forEach((h, i) => {
    const c = calcOf(h);
    out.push("");
    out.push(`${marks[i] || (i + 1) + "."} ${h.name}${h.date ? ` (${fm(T.tourOn, { d: dateShort(h.date) })})` : ""}`);
    if(c.ok) out.push(`- ${T.rowTotal}: ${WW.wonShort(c.total)} (${T.rowPer} ${WW.wonFull(c.perHead)})`);
    for(const s of SECS.map(x => x.id).concat(["mine"])){
      const bits = [];
      for(const q of everyQ()){
        if(q.sec !== s || !subShown(h, q)) continue;
        const cl = cellOf(h, q); if(!cl.v && !cl.memo) continue;
        bits.push(`${q.short || q.q} ${cl.v}${cl.memo ? `(${cl.memo})` : ""}`.replace(/\s+/g, " ").trim());
      }
      if(bits.length) out.push(`- ${bits.join(" · ")}`);
    }
    const st = WW.starAvg(h, STAR_KEYS);
    if(st != null) out.push(`- ${T.rowStar} ★ ${st.toFixed(1)}`);
    if(h.good.trim()) out.push(`- ${T.goodLbl}: ${h.good.trim()}`);
    if(h.bad.trim()) out.push(`- ${T.badLbl}: ${h.bad.trim()}`);
  });
  out.push(""); out.push(T.txtTail);
  return out.join("\n");
}

// ===== 엑셀 =====
// 시트 1 "비교표": 위쪽은 수식으로 셈해서, 엑셀에서 하객 수나 견적 숫자를 고치면 예상 총액이 따라 바뀌어요. 시트 2 "전체 기록": 모든 질문 · 메모
function xlsxSheets(){
  const hs = sortedHalls(), n = hs.length, C = i => xlsxCol(i + 1);
  const head = [{ v: T.colItem, s: 1 }].concat(hs.map(h => ({ v: h.name, s: 1 })));
  const blankRow = () => [""].concat(hs.map(() => ""));
  const rows = [], merges = [`A1:${C(n - 1)}1`, `A2:${C(n - 1)}2`];
  rows.push({ ht: 28, cells: [{ v: T.cmpTitle, s: 2 }] });
  rows.push({ ht: 34, cells: [{ v: T.xNote, s: 3 }] });
  rows.push([{ v: T.xGuests, s: 7 }, { v: S.guests || "", s: 12 }, { v: T.xGuestsNote, s: 3 }]);
  const G = "$B$3";
  rows.push(blankRow());
  rows.push(head);                                   // 5
  const rowNo = {};
  const moneyRow = (key, label, f) => { rowNo[key] = rows.length + 1; rows.push([{ v: label, s: 4 }].concat(hs.map((h, i) => f(h, i)))); };
  const man = k => (h => { const v = WW.num(h.a[k]); return { v: v == null ? "" : v * WW.MAN, s: 6 }; });
  const raw = (k, s) => (h => { const v = WW.num(h.a[k]); return { v: v == null ? "" : v, s }; });
  moneyRow("rent", T.lnRent, man("rent"));
  const manIf = (k, on) => (h => { const v = on(h) ? WW.num(h.a[k]) : null; return { v: v == null ? "" : v * WW.MAN, s: 6 }; });
  moneyRow("flower", T.lnFlower, manIf("flower", h => h.a.flowerType !== "base"));
  moneyRow("must", T.lnMust, man("must"));
  moneyRow("drink", T.lnDrink, manIf("drink", h => h.a.drinkInc !== "all" && h.a.drinkInc !== "free"));
  moneyRow("meal", T.xMeal, raw("meal", 6));
  moneyRow("over", T.xOver, raw("over", 6));
  moneyRow("guar", T.xGuar, raw("guar", 12));
  moneyRow("svc", T.xSvc, h => ({ v: h.a.svc === "add" ? (WW.num(h.a.svcPct) != null ? WW.num(h.a.svcPct) : 10) : 0, s: 12 }));
  moneyRow("scope", T.xScope, h => ({ v: h.a.svc === "add" && h.a.svcScope === "meal" ? 0 : 1, s: 12 }));
  moneyRow("vat", T.xVat, h => ({ v: h.a.vat === "add" ? 10 : 0, s: 12 }));
  moneyRow("vos", T.xVatOnSvc, h => ({ v: h.a.vatOnSvc === "no" ? 0 : 1, s: 12 }));
  const R = (k, i) => `${C(i)}${rowNo[k]}`;
  const calcs = hs.map(calcOf);
  // 식대를 내는 사람 수 = 하객 수와 보증 인원 가운데 큰 쪽 (하객 수를 비우면 보증 인원)
  moneyRow("heads", T.xHeads, (h, i) => ({ f: `IF(${G}>0,MAX(${G},${R("guar", i)}),${R("guar", i)})`, v: calcs[i].heads, s: 12 }));
  moneyRow("mealSum", T.xMealSum, (h, i) => {
    const base = `IF(${R("guar", i)}>0,MIN(${R("heads", i)},${R("guar", i)}),${R("heads", i)})`;
    const l = calcs[i].lines.find(x => x.k === "meal");
    return { f: `${R("meal", i)}*${base}+IF(${R("over", i)}>0,${R("over", i)},${R("meal", i)})*(${R("heads", i)}-${base})`, v: l ? l.won : 0, s: 6 };
  });
  moneyRow("sub", T.xSub, (h, i) => ({ f: `MAX(0,${R("rent", i)}+${R("flower", i)}+${R("must", i)}+${R("drink", i)}+${R("mealSum", i)})`, v: calcs[i].sub, s: 6 }));
  moneyRow("svcWon", T.xSvcWon, (h, i) => { const l = calcs[i].lines.find(x => x.k === "svc"); return { f: `ROUND(IF(${R("scope", i)}=1,${R("sub", i)},${R("mealSum", i)})*${R("svc", i)}/100,0)`, v: l ? l.won : 0, s: 6 }; });
  moneyRow("vatWon", T.xVatWon, (h, i) => { const l = calcs[i].lines.find(x => x.k === "vat"); return { f: `ROUND((${R("sub", i)}+IF(${R("vos", i)}=1,${R("svcWon", i)},0))*${R("vat", i)}/100,0)`, v: l ? l.won : 0, s: 6 }; });
  rowNo.total = rows.length + 1;
  rows.push([{ v: T.rowTotal, s: 13 }].concat(hs.map((h, i) => ({ f: `IF(AND(${R("meal", i)}>0,${R("heads", i)}>0),${R("sub", i)}+${R("svcWon", i)}+${R("vatWon", i)},0)`, v: calcs[i].ok ? calcs[i].total : 0, s: 8 }))));
  rowNo.per = rows.length + 1;
  rows.push([{ v: T.rowPer, s: 4 }].concat(hs.map((h, i) => ({ f: `IF(${R("heads", i)}>0,ROUND(${R("total", i)}/${R("heads", i)},0),0)`, v: calcs[i].ok ? calcs[i].perHead : 0, s: 6 }))));
  rows.push(blankRow());
  // 아래는 글로 된 비교 (셈에 쓴 줄은 위에 있어서 빼요)
  const skip = new Set(["rent", "meal", "guar", "over", "flower", "must", "drink", "svc", "svcPct", "svcScope", "vat", "vatOnSvc"]);   // 위 수식 줄에 이미 있는 것
  // 맨 위 "예상 총액" 묶음(제목 + 3줄)과 셈에 쓴 견적 줄은 위에 수식으로 넣었으니 빼고, 줄이 안 남은 묶음 제목도 빼요
  const tail0 = cmpRows(hs, {}).slice(4).filter(r => !(r.id && skip.has(r.id)));
  const tail = tail0.filter((r, i) => r.kind !== "group" || (tail0[i + 1] && tail0[i + 1].kind === "row"));
  for(const r of tail){
    if(r.kind === "group"){ rows.push([{ v: r.label, s: 9 }]); continue; }
    rows.push([{ v: r.label, s: 4 }].concat(r.cells.map(c => ({ v: [c.v || (c.na ? T.cellNotAsked : ""), c.memo].filter(Boolean).join("\n"), s: 4 }))));
  }
  const sheet1 = { name: T.xSheet1, widths: [26].concat(hs.map(() => 22)), rows, freeze: 5, merges, landscape: n > 2 };
  // 시트 2: 모든 질문 (안 적은 것도) + 메모
  const rows2 = [[{ v: T.xSheet2Title, s: 2 }], [{ v: T.xSheet2Note, s: 3 }], [{ v: T.xSec, s: 1 }, { v: T.xQ, s: 1 }].concat(hs.map(h => ({ v: h.name, s: 1 })))];
  const secName = id => (SECS.find(s => s.id === id) || { name: T.mineTitle }).name;
  for(const q of everyQ()){
    rows2.push([{ v: secName(q.sec), s: 5 }, { v: q.q, s: 4 }].concat(hs.map(h => { const c = subShown(h, q) ? cellOf(h, q) : { v: "", memo: "" }; return { v: [c.v, c.memo].filter(Boolean).join("\n"), s: 4 }; })));
  }
  for(const [k, l] of STARS) rows2.push([{ v: T.feelTitle, s: 5 }, { v: l, s: 4 }].concat(hs.map(h => ({ v: +(h.star[k]) > 0 ? +h.star[k] : "", s: 12 }))));
  rows2.push([{ v: T.feelTitle, s: 5 }, { v: T.goodLbl, s: 4 }].concat(hs.map(h => ({ v: h.good.trim(), s: 4 }))));
  rows2.push([{ v: T.feelTitle, s: 5 }, { v: T.badLbl, s: 4 }].concat(hs.map(h => ({ v: h.bad.trim(), s: 4 }))));
  rows2.push([{ v: T.feelTitle, s: 5 }, { v: T.dateLbl, s: 4 }].concat(hs.map(h => ({ v: h.date ? h.date.replace(/-/g, ".") : "", s: 5 }))));
  const sheet2 = { name: T.xSheet2, widths: [14, 34].concat(hs.map(() => 26)), rows: rows2, freeze: 3, merges: [`A1:${xlsxCol(n + 1)}1`, `A2:${xlsxCol(n + 1)}2`], landscape: true, titleRow: 3 };
  return [sheet1, sheet2];
}
async function saveXlsx(){
  const msg = $("#outMsg");
  try {
    const blob = xlsxBook(xlsxSheets());
    await shareOrSave(new File([blob], fileBase() + ".xlsx", { type: blob.type }), T.xlsxSaved);
    if(msg) msg.textContent = "";
  } catch (e) { if(msg) msg.textContent = T.xlsxFail; }
}

// ===== 누르기 =====
const ACT = {
  start(){ inAppSheet(() => { S = MINE; go("list"); }); },
  demo(){ S = demoState(); go("cmp"); },
  demoExit(){ S = MINE; if(depth() > 0){ afterPop = () => { show("home"); ACT.start(); }; history.go(-depth()); } else ACT.start(); },
  other(){
    const sh = openSheet(`<h3>${esc(T.otherTitle)}</h3><p>${esc(T.otherBody)}</p><div class="btns"><button class="btn main" id="otLoad">${esc(T.bkLoad)}</button></div>
      ${inApp() ? `<p class="note small">${esc(fm(T.bkInApp, { from: inApp(), app: ANDROID ? "크롬" : "사파리" }))}</p>` : ""}<p class="msg" id="moreMsg" role="status"></p>`, T.otherTitle);
    sh.querySelector("#otLoad").onclick = pickBackup;
  },
  home(){ S = MINE; if(depth() > 0) history.go(-depth()); else show("home"); },
  back(){
    if(CUR === "list"){ ACT.home(); return; }
    back("list");
  },
  more(){ moreSheet(); },
  guests(){ guestsSheet(); },
  add(){ hallForm(null); },
  open(el){ go("hall", +el.dataset.id); },
  cmp(){ if(!S.halls.length) return; if(CUR === "hall" && fromSc() === "cmp") history.back(); else go("cmp"); },
  toList(){ if(fromSc() === "list") history.back(); else go("list"); },
  hallMenu(){ hallMenuSheet(); },
  detail(){ if(H) detailSheet(H); },
  jump(el){ const t = $("#sec-" + el.dataset.id); if(t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); },
  onlyLeft(){ ONLY = !ONLY; show(CUR, ARG); const c = $("#chk"); if(c) window.scrollTo(0, Math.max(0, c.getBoundingClientRect().top + window.scrollY - 140)); },
  goQ(el){
    const row = $(`[data-row="${el.dataset.id}"]`); if(!row) return;
    const d = row.closest("details"); if(d) d.open = true;
    row.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
    const inp = row.querySelector("input[data-q]");
    if(inp && !matchMedia("(pointer:coarse)").matches) inp.focus({ preventScroll: true });
  },
  memo(el){
    const row = el.closest(".qrow"), inp = row && row.querySelector(".q-memo");
    if(!inp) return;
    inp.hidden = false; el.remove(); inp.focus();
  },
  mineAdd(){ mineAddSheet(); },
  mineDel(el){
    const id = el.dataset.id, i = S.custom.findIndex(c => c.id === id); if(i < 0) return;
    const c = S.custom[i], kept = S.halls.map(h => [h, h.a[id], (h.m || {})[id]]);
    S.custom.splice(i, 1); S.halls.forEach(h => { delete h.a[id]; delete h.m[id]; }); saveS();
    const y = window.scrollY; show(CUR, ARG); window.scrollTo(0, y);
    toast(T.mineDeleted, () => { S.custom.splice(i, 0, c); kept.forEach(([h, a, m]) => { if(a != null) h.a[id] = a; if(m) h.m[id] = m; }); saveS(); const y2 = window.scrollY; show(CUR, ARG); window.scrollTo(0, y2); });
  },
  sort(el){ S.sort = el.dataset.k; saveS(); const x = $("#cmpWrap").scrollLeft; show("cmp"); $("#cmpWrap").scrollLeft = x; },
  diff(){ S.diff = !S.diff; saveS(); const y = window.scrollY; show("cmp"); window.scrollTo(0, y); },
  saveImg(){ saveImage(); },
  saveXlsx(){ saveXlsx(); },
  copyTxt(){ copyText(cmpText(), T.txtCopied); },
  askShot(){ askShot(); }
};
document.addEventListener("click", e => {
  const pick = e.target.closest("[data-pick]");
  if(pick && H && CUR === "hall"){
    const q = getQ(pick.dataset.pick), k = pick.dataset.k, on = H.a[q.id] === k;
    $$(`[data-pick="${q.id}"]`).forEach(b => { const me = b === pick && !on; b.classList.toggle("on", me); b.setAttribute("aria-pressed", me); });
    setAnswer(q, on ? "" : k);
    return;
  }
  const mu = e.target.closest("[data-multi]");
  if(mu && H && CUR === "hall"){
    const q = getQ(mu.dataset.multi), k = mu.dataset.k, cur = Array.isArray(H.a[q.id]) ? H.a[q.id].slice() : [];
    const i = cur.indexOf(k); if(i >= 0) cur.splice(i, 1); else cur.push(k);
    mu.classList.toggle("on", i < 0); mu.setAttribute("aria-pressed", i < 0);
    setAnswer(q, q.opts.map(o => o[0]).filter(x => cur.includes(x)));
    return;
  }
  const qk = e.target.closest("[data-quick]");
  if(qk && H && CUR === "hall"){
    const q = getQ(qk.dataset.quick), inp = $("#in-" + q.id); if(!q || !inp) return;
    inp.value = qk.dataset.v; onType(inp);
    $$(`[data-quick="${q.id}"]`).forEach(b => b.classList.toggle("on", b === qk));
    return;
  }
  const star = e.target.closest("[data-star]");
  if(star && H && CUR === "hall"){
    const k = star.dataset.star, v = +star.dataset.v, cur = +(H.star[k]) || 0, nv = cur === v ? 0 : v;
    if(nv) H.star[k] = nv; else delete H.star[k];
    $$(`[data-star="${k}"]`).forEach(b => { b.classList.toggle("on", +b.dataset.v <= nv); b.setAttribute("aria-pressed", +b.dataset.v === nv); });
    saveSoon();
    return;
  }
  const el = e.target.closest("[data-a]");
  if(!el || el.disabled) return;
  const f = ACT[el.dataset.a];
  if(f) f(el);
});
document.addEventListener("input", e => {
  const t = e.target;
  if(!H || CUR !== "hall") return;
  if(t.dataset.q){ onType(t); return; }
  if(t.dataset.memo){ const v = t.value.slice(0, 200); if(v.trim()) H.m[t.dataset.memo] = v; else delete H.m[t.dataset.memo]; saveSoon(); return; }
  if(t.dataset.f){ H[t.dataset.f] = t.value.slice(0, 500); saveSoon(); }
});
// 엔터를 누르면 자판을 내려요 (한 줄 칸)
document.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.matches && e.target.matches("input[data-q],input[data-memo]")) e.target.blur(); });

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
}
route();
window.__ww = { get S(){ return S; }, get MINE(){ return MINE; }, get H(){ return H; }, get CUR(){ return CUR; }, cmpRows, cmpText, xlsxSheets, sortedHalls, calcOf };   // 화면 흐름 시험용
