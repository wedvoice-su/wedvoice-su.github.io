// 축의금 장부 ㊳: 봉투를 보면서 이름 · 금액만 치면 → 신랑측 · 신부측 합계 · 확인할 것 · 정산서 · 엑셀 장부
// 기획 docs/축의금-장부/기획.md · 조사 docs/축의금-장부/조사/ · 화면 문구 text.js · 계산 core.js(DN) · 엑셀 xlsx.js · 공통 기능 shared/common.js
// 적은 내용은 이 기기(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/duly-noted/?preview)
const OPEN = false;
// =========================================================

const KEY = "dulyNoted.v1";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const won = n => DN.won(n);
const SIDES = ["g", "b"];
const sideName = s => (s === "b" ? T.sideB : T.sideG);
const whoName = (side, k) => { const w = WHO.find(x => x[0] === k); return !w ? "" : typeof w[1] === "string" ? w[1] : w[1][side]; };
const whoShort = (side, k) => whoName(side, k).replace(/ 손님$/, "");   // 제목 "누구 손님" 옆에서는 짧게: 신랑 · 부모님
const ANDROID = /Android/i.test(navigator.userAgent || "");

// ===== 저장 =====
let canStore = true;
try { localStorage.setItem(KEY + ".t", "1"); localStorage.removeItem(KEY + ".t"); } catch (e) { canStore = false; }
// opt: no 봉투 번호 · tk 식권 수 · who 누구 손님 · later 이름만 먼저(접수대 방식) / cash 센 지폐 / tks 식권 받은 장수 · 남은 장수 / skip 없는 번호로 넘긴 것
function blank(){ return { v: 1, rows: [], seq: 0, side: "g", opt: { no: true, tk: false, who: false, later: false }, cash: { g: {}, b: {} }, tks: { g: {}, b: {} }, skip: { g: [], b: [] }, info: { g: "", b: "", date: "" }, setup: 0, saved: 0, filed: 0, filedN: 0 }; }
function fill(x){ const b = blank(); return Object.assign(b, x, { opt: Object.assign(b.opt, x.opt), cash: Object.assign(b.cash, x.cash), tks: Object.assign(b.tks, x.tks), skip: Object.assign(b.skip, x.skip), info: Object.assign(b.info, x.info) }); }
function loadS(){ try { const x = JSON.parse(localStorage.getItem(KEY)); return x && x.v === 1 && Array.isArray(x.rows) ? fill(x) : null; } catch (e) { return null; } }
let MINE = loadS() || blank();   // 내 장부
let S = MINE;                    // 지금 보는 장부 (예시 장부를 볼 때는 따로 만든 것)
const isDemo = () => S !== MINE;
let storeWarned = false;
function saveS(){
  if(isDemo()) return;
  S.saved = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { canStore = false; if(!storeWarned){ storeWarned = true; toast(T.storeFail); } }
}
function demoState(){
  const d = blank(); d.opt = { no: true, tk: true, who: true, later: false }; d.setup = 1;
  const no = { g: 0, b: 0 }, tk2 = { g: 0, b: 0 };
  for(const [side, how, name, man, tk, who, rel] of SAMPLE){ d.rows.push({ id: ++d.seq, side, how, no: how === "c" ? ++no[side] : null, name, amt: man * DN.MAN, tk, who, rel, memo: "", th: 0, ok: 0, at: 0 }); tk2[side] += tk; }
  d.tks = { g: { got: 150, left: 150 - tk2.g }, b: { got: 150, left: 150 - tk2.b } };
  return d;
}

// ===== 줄 =====
function nextNo(side){ let m = 0; for(const r of S.rows) if(r.side === side && r.how !== "a" && r.no > m) m = r.no; return m + 1; }
function addRow(o){
  const r = Object.assign({ id: ++S.seq, side: S.side, how: "c", no: null, name: "", amt: null, tk: 0, who: "", rel: "", memo: "", th: 0, ok: 0, at: Date.now() }, o);
  S.rows.push(r); saveS(); return r;
}
function delRow(id){ const i = S.rows.findIndex(r => r.id === id); if(i < 0) return null; const [r] = S.rows.splice(i, 1); saveS(); return r; }
function getChecks(){ return DN.checks(S.rows, { skip: S.skip }); }
function flagMap(ck){
  const m = new Map(), put = (r, why) => { if(!m.has(r.id)) m.set(r.id, []); m.get(r.id).push(why); };
  ck.noName.forEach(r => put(r, "noName")); ck.noAmt.forEach(r => put(r, "noAmt")); ck.big.forEach(r => put(r, "big"));
  ck.sameName.forEach(l => l.forEach(r => put(r, "same")));
  for(const side of SIDES) for(const n of ck.dupNo[side]) S.rows.filter(r => r.side === side && r.how !== "a" && r.no === n && !r.ok).forEach(r => put(r, "dup"));
  return m;
}
function byNo(a, b){ return (a.side === b.side ? 0 : a.side === "g" ? -1 : 1) || (a.how === b.how ? 0 : a.how === "a" ? 1 : -1) || ((a.no || 1e9) - (b.no || 1e9)) || (a.id - b.id); }

// ===== 작은 도구 =====
function toast(text, undoFn){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(text)}</span>${undoFn ? `<button type="button" id="toastUndo">${esc(T.undo)}</button>` : ""}`;
  el.classList.toggle("act", !!undoFn);   // 되돌리기 버튼이 있을 때만 눌리고, 아니면 아래 버튼을 가리지 않아요
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
function todayYmd(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dots(ymd){ return String(ymd || "").replace(/-/g, "."); }
function stamp(t){ const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
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
function markFiled(){ if(isDemo()) return; S.filed = Date.now(); S.filedN = S.rows.length; saveS(); const n = $("#filedNote"); if(n) n.textContent = fm(T.lastFile, { t: stamp(S.filed) }); }

// ===== 화면 이동 (휴대폰 뒤로 가기 = 이전 화면) =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
const TABS = ["book", "list", "sum"];
const SCREENS = { home: () => home(), book: () => book(), list: () => list(), sum: () => sum(), paste: () => paste(), mark: () => mark() };
let CUR = "home";
function show(sc){
  closeSheet();
  document.body.classList.remove("typing");
  if(!SCREENS[sc]) sc = "home";
  CUR = sc;
  SCREENS[sc]();
}
// 탭끼리 오갈 때는 기록을 쌓지 않아요. 그래서 탭에서 뒤로 가기 = 첫 화면.
function go(sc, how){
  const replace = how === "replace" || (how !== "push" && TABS.includes(sc) && TABS.includes(CUR));
  const st = { sc };
  replace ? history.replaceState(st, "") : history.pushState(st, "");
  show(sc);
}
let skipPop = false, afterPop = null;
window.addEventListener("popstate", e => {
  const st = e.state;
  if(skipPop){ skipPop = false; return; }
  if(afterPop){ const f = afterPop; afterPop = null; closeSheet(); f(); return; }
  if(document.getElementById("sheet")){ closeSheet(); return; }
  if(st && st.sheet){ skipPop = true; history.back(); return; }
  show(st && st.sc ? st.sc : "home");
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
  sh.innerHTML = html + (opts.foot != null ? opts.foot : `<div class="sheet-x"><button class="btn ghost" id="sheetX">${esc(opts.close || T.optsDone)}</button></div>`);
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

// 인스타 · 카톡 안에서 열었을 때
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
  const d = demoState(), st = DN.stats(d.rows), show = d.rows.filter(r => r.side === "g").slice(0, 4);
  return `<div class="ex" aria-hidden="true">
    <div class="ex-h"><span>${esc(T.exTitle)}</span><b>${esc(T.exTag)}</b></div>
    <div class="ex-big"><div><span>${esc(T.sideG)}</span><b>${esc(won(st.g.amt))}</b></div><div><span>${esc(T.sideB)}</span><b>${esc(won(st.b.amt))}</b></div></div>
    ${show.map(r => `<div class="ex-row"><em>${r.no}</em><b>${esc(r.name)}</b><span>${esc(won(r.amt))}</span></div>`).join("")}
  </div>`;
}
function home(){
  S = MINE;
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  const n = MINE.rows.length, st = n ? DN.stats(MINE.rows) : null;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${esc(T.title).replace(/\n/g, "<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${n ? `<button class="main-go" data-a="start"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { n, amt: won(st.all.amt) }))}</span></button>`
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

// ===== 장부 화면 틀 =====
function bandsHtml(tab){
  let h = "";
  if(isDemo()) h += `<div class="band demo"><span>${esc(T.demoBand)}</span><button data-a="demoExit">${esc(T.demoExit)}</button></div>`;
  else if(tab === "book" && S.rows.length >= 20 && !S.filed) h += `<div class="band"><span>${esc(T.fileBand)}</span><button data-a="tab" data-t="sum">${esc(T.fileBandGo)}</button></div>`;
  return h;
}
function frame(tab, inner){
  document.body.classList.remove("is-cover");
  app.className = "bk";
  const ck = S.rows.length ? getChecks().count : 0;
  const names = { book: T.tabBook, list: T.tabList, sum: T.tabSum };
  app.innerHTML = `
    <div class="bk-top"><button class="home" data-a="home">‹ ${esc(T.toHome)}</button><b>${esc(T.name)}</b><button class="gear" data-a="opts">${esc(T.optsBtn)}</button></div>
    <nav class="tabs" aria-label="${esc(T.name)}"><div class="tabs-in">${TABS.map(t => `<button class="tab${t === tab ? " on" : ""}" data-a="tab" data-t="${t}"${t === tab ? ' aria-current="page"' : ""}>${esc(names[t])}${t === "sum" && ck ? `<span class="dot" id="ckDot">${ck}</span>` : ""}</button>`).join("")}</div></nav>
    ${bandsHtml(tab)}
    ${inner}`;
}
function sidesHtml(){
  const st = DN.stats(S.rows);
  return SIDES.map(s => `<button class="side ${s}${S.side === s ? " on" : ""}" data-a="side" data-s="${s}" aria-pressed="${S.side === s}"><b>${esc(sideName(s))}</b><span>${esc(fm(T.sideMeta, { n: st[s].n, amt: won(st[s].amt) }))}</span></button>`).join("");
}
function rowHtml(r, o){
  o = o || {};
  const meta = [];
  if(o.side) meta.push(`<span class="tag ${r.side}">${esc(sideName(r.side))}</span>`);
  if(S.opt.tk && r.tk) meta.push(`<span>${esc(fm(T.tkTag, { n: r.tk }))}</span>`);
  if(S.opt.who && r.who) meta.push(`<span>${esc(whoName(r.side, r.who))}</span>`);
  if(r.rel) meta.push(`<span>${esc(r.rel)}</span>`);
  if(r.memo) meta.push(`<span>${esc(r.memo)}</span>`);
  if(r.th) meta.push(`<span class="tag ok">${esc(T.thTag)}</span>`);
  const no = r.how === "a" ? `<span class="r-no acct">${esc(T.acctTag)}</span>` : `<span class="r-no">${r.no || "–"}</span>`;
  return `<li><button class="row" data-a="edit" data-id="${r.id}">${no}<span class="r-main"><b${r.name ? "" : ' class="none"'}>${esc(r.name || T.noName)}</b>${meta.length ? `<span class="r-meta">${meta.join("")}</span>` : ""}</span><span class="r-amt${r.amt == null ? " none" : ""}">${esc(r.amt == null ? T.noAmt : won(r.amt))}</span></button></li>`;
}

// ===== 적기 =====
const F = { how: "c", no: null, noNone: false, tk: 1, who: "", rel: "", memo: "" };
function curNo(){ return F.noNone ? null : (F.no || nextNo(S.side)); }
function noBoxHtml(){
  if(F.how === "a") return `<span class="f-no acct">${esc(T.acctLabel)}</span>`;
  if(!S.opt.no) return `<span class="f-no acct">${esc(sideName(S.side))}</span>`;
  return `<button class="f-no" data-a="setNo" data-keep>${esc(F.noNone ? T.noNoLabel : fm(T.noLabel, { side: sideName(S.side), n: curNo() }))} <small>${esc(T.noChange)}</small></button>`;
}
function book(){
  frame("book", `
    <div class="bk-cols">
      <div class="bk-left">
        <div id="fillBox"></div>
        <div class="sides" id="sides">${sidesHtml()}</div>
        <section class="form ${S.side}" id="form" aria-label="${esc(T.tabBook)}">
          <div class="f-head">
            <span id="fNoBox"></span>
            <div class="how" role="group" aria-label="${esc(T.editHow)}"><button data-a="how" data-h="c" data-keep>${esc(T.howCash)}</button><button data-a="how" data-h="a" data-keep>${esc(T.howAcct)}</button></div>
          </div>
          <input class="in" id="fName" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" maxlength="40" aria-label="${esc(T.nameLabel)}">
          <div id="fOpts"></div>
          <div id="fAmtBox">
          <div class="amt-row">
            <div class="amt-in"><input class="in" id="fAmt" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="12" placeholder="${esc(T.amtPh)}" aria-label="${esc(T.amtLabel)}"><span>${esc(T.amtUnit)}</span></div>
            <button class="add" data-a="add" data-keep>${esc(T.addBtn)}</button>
          </div>
          <div class="quick" role="group" aria-label="${esc(T.amtLabel)}">${QUICK.map(q => `<button class="qa" data-a="quick" data-q="${q}" data-keep>${q}<small>${esc(T.quickUnit)}</small></button>`).join("")}</div>
          <p class="quick-tip first">${esc(T.quickTip)}</p>
          <p class="quick-tip first only-wide">${esc(T.wideTip)}</p>
          </div>
          <div id="fLaterBox" hidden>
            <button class="btn main later-add" data-a="addLater" data-keep>${esc(T.laterAdd)}</button>
            <p class="quick-tip first">${esc(T.laterNote)}</p>
          </div>
          <div class="f-last" id="fLast" role="status"></div>
          <div class="f-msg" id="fMsg" role="alert"></div>
          <button class="text-btn small" id="fLaterOff" data-a="laterOff" hidden>${esc(T.laterOff)}</button>
          <details class="more-f" id="fMore"${F.rel || F.memo ? " open" : ""}>
            <summary>${esc(T.moreF)}</summary>
            <span class="lbl">${esc(T.relLabel)}</span>
            <div class="chips" id="fRel"></div>
            <label class="lbl" for="fMemo">${esc(T.memoLabel)}</label>
            <input class="in sm" id="fMemo" type="text" autocomplete="off" maxlength="60" placeholder="${esc(T.memoPh)}">
          </details>
        </section>
        <div class="tools"><button class="tool" data-a="paste">${esc(T.toolPaste)}</button><button class="tool" data-a="side" data-s="${S.side === "g" ? "b" : "g"}" id="toolSwitch"></button></div>
      </div>
      <div class="bk-right">
        <div class="sec-h"><h3 id="recentH"></h3><button class="text-btn small" data-a="tab" data-t="list">${esc(T.seeAll)}</button></div>
        <div id="recent"></div>
      </div>
    </div>`);
  const nameEl = $("#fName"), amtEl = $("#fAmt"), memoEl = $("#fMemo");
  memoEl.value = F.memo;
  // 한글을 치다가 Enter를 누르면 글자가 아직 조합 중이라, 조합이 끝난 다음에 처리해요
  nameEl.addEventListener("keydown", e => {
    if(e.key !== "Enter") return;
    if(e.isComposing || e.keyCode === 229){ setTimeout(nameEnter, 40); return; }
    e.preventDefault(); nameEnter();
  });
  amtEl.addEventListener("keydown", e => { if(e.key === "Enter" && !e.isComposing){ e.preventDefault(); commit(); } });
  nameEl.addEventListener("focus", () => { if(!matchMedia("(pointer:coarse)").matches) return; setTimeout(() => { const f = $("#form"); if(!f) return; const top = f.getBoundingClientRect().top; if(top > 12 || top < -4) window.scrollTo({ top: window.scrollY + top - 8 }); }, 60); });
  nameEl.addEventListener("input", () => fMsg(""));
  amtEl.addEventListener("input", () => fMsg(""));
  memoEl.addEventListener("input", () => { F.memo = memoEl.value; });
  refreshForm(); refreshBook();
  window.scrollTo(0, 0);
  if(matchMedia("(min-width:900px)").matches) nameEl.focus();
}
function nameEnter(){
  const nameEl = $("#fName"); if(!nameEl) return;
  const p = DN.parseLine(DN.normLine(nameEl.value));
  if(S.opt.later || (p && p.name && p.amt != null)) commit(); else $("#fAmt").focus();
}
function fMsg(text, btn, act){
  const el = $("#fMsg"); if(!el) return;
  el.innerHTML = text ? `${esc(text)}${btn ? ` <button class="text-btn inline" data-a="${act}" data-keep>${esc(btn)}</button>` : ""}` : "";
}
// 번호 · 받은 방법 · 식권 · 누구 손님 · 관계 — 고른 것이 바뀔 때마다 그 부분만 다시 그려요 (이름 칸의 글과 커서는 그대로)
function refreshForm(){
  const form = $("#form"); if(!form) return;
  form.className = "form " + S.side;
  $$(".how button", form).forEach(b => { const on = b.dataset.h === F.how; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  $("#fNoBox").innerHTML = noBoxHtml();
  $("#fAmtBox").hidden = !!S.opt.later; $("#fLaterBox").hidden = !S.opt.later; $("#fLaterOff").hidden = !S.opt.later;
  $("#fName").setAttribute("enterkeyhint", S.opt.later ? "done" : "next");
  $("#fName").placeholder = F.how === "a" ? T.namePhAcct : T.namePh;
  let h = "";
  if(S.opt.tk) h += `<div class="opt-row"><span class="lbl">${esc(T.tkLabel)}</span><div class="step"><button data-a="tk" data-d="-1" data-keep aria-label="−">−</button><b id="fTk">${esc(fm(T.tkUnit, { n: F.tk }))}</b><button data-a="tk" data-d="1" data-keep aria-label="+">+</button></div></div>`;
  if(S.opt.who) h += `<div class="opt-row"><span class="lbl">${esc(T.whoLabel)}</span><div class="chips">${WHO.map(([k]) => `<button class="chip${F.who === k ? " on" : ""}" data-a="who" data-w="${k}" data-keep aria-pressed="${F.who === k}">${esc(whoShort(S.side, k))}</button>`).join("")}</div></div>`;
  $("#fOpts").innerHTML = h;
  $("#fRel").innerHTML = RELS.map(r => `<button class="chip${F.rel === r ? " on" : ""}" data-a="rel" data-r="${esc(r)}" data-keep aria-pressed="${F.rel === r}">${esc(r)}</button>`).join("")
    + `<input class="in sm" id="fRelIn" type="text" autocomplete="off" maxlength="20" placeholder="${esc(T.relPh)}" value="${esc(RELS.includes(F.rel) ? "" : F.rel)}" style="flex:1 1 120px;min-width:120px">`;
  $("#fRelIn").oninput = e => { F.rel = e.target.value.trim(); $$("#fRel .chip").forEach(c => c.classList.remove("on")); };
}
function refreshBook(){
  const sides = $("#sides"); if(!sides) return;
  sides.innerHTML = sidesHtml();
  const wide = matchMedia("(min-width:900px)").matches;
  const mine = S.rows.filter(r => r.side === S.side).sort((a, b) => b.id - a.id);
  $("#recentH").textContent = fm(wide ? T.recentAll : T.recentTitle, { side: sideName(S.side) });
  $("#recent").innerHTML = mine.length ? `<ul class="rows">${(wide ? mine : mine.slice(0, 6)).map(r => rowHtml(r)).join("")}</ul>` : `<p class="empty"><b>${esc(T.emptyTitle)}</b>${esc(T.emptyBody)}</p>`;
  const sw = $("#toolSwitch"), other = S.side === "g" ? "b" : "g";
  sw.dataset.s = other; sw.textContent = fm(T.toolSwitch, { side: sideName(other) });
  $("#fNoBox").innerHTML = noBoxHtml();
  const unk = S.rows.filter(r => r.amt == null).length, fb = $("#fillBox");
  if(fb) fb.innerHTML = unk ? `<div class="band"><span>${esc(fm(T.fillBand, { n: unk }))}</span><button data-a="mark" data-m="amt">${esc(T.fillGo)}</button></div>` : "";
  const dot = $("#ckDot"), n = S.rows.length ? getChecks().count : 0, tab = $('.tab[data-t="sum"]');
  if(dot) n ? dot.textContent = n : dot.remove(); else if(n && tab) tab.insertAdjacentHTML("beforeend", `<span class="dot" id="ckDot">${n}</span>`);
}
// 장부에 한 줄 적기.
//   amtWon을 주면(금액 버튼) 그 금액으로, 안 주면 금액 칸 → 이름 칸의 "김철수 10" 순서로 읽어요.
//   o.later: 금액 없이 이름만 (접수대 방식 · "금액은 나중에 적기") · o.noName: 이름 없는 봉투로
function commit(amtWon, o){
  o = o || {};
  const nameEl = $("#fName"), amtEl = $("#fAmt"); if(!nameEl) return;
  let name = nameEl.value.replace(/\s+/g, " ").trim(), amt = amtWon, tk = F.tk;
  const later = !!o.later || (S.opt.later && amt === undefined);
  if(amt === undefined){
    const a = later ? "" : amtEl.value.trim();
    if(a){ amt = DN.parseAmt(a); if(amt == null){ fMsg(T.badAmt); amtEl.focus(); return; } }
    else {
      const p = DN.parseLine(DN.normLine(name));
      if(p && p.name && p.amt != null){ name = p.name; amt = p.amt; if(p.tk != null && S.opt.tk) tk = p.tk; }
      else if(later) amt = null;
    }
  }
  if(amt === undefined){
    if(name) fMsg(T.needAmt, T.noAmtAdd, "noAmtAdd"); else fMsg(T.needName);
    (name ? amtEl : nameEl).focus(); return;
  }
  if(!name && !o.noName){ commit.hold = { amt, later }; fMsg(T.needName, T.noNameAdd, "noNameAdd"); nameEl.focus(); return; }
  const cash = F.how !== "a";
  const r = addRow({ side: S.side, how: F.how, no: cash && S.opt.no ? curNo() : null, name, amt, tk: S.opt.tk && cash ? tk : 0, who: S.opt.who ? F.who : "", rel: F.rel, memo: F.memo.trim() });
  F.no = null; F.noNone = false; F.tk = 1; F.who = ""; F.rel = ""; F.memo = ""; commit.hold = null;
  nameEl.value = ""; amtEl.value = ""; $("#fMemo").value = ""; fMsg("");
  refreshForm(); refreshBook();
  nameEl.focus();
  const key = x => String(x.name || "").replace(/\s+/g, ""), twin = !!r.name && S.rows.some(x => x.id !== r.id && x.side === r.side && key(x) === key(r));
  setLast(r, twin);
}
// 방금 적은 줄을 금액 버튼 아래에 한 줄로 보여 줘요 (누르면 되돌리기). 화면을 가리지 않아서 다음 봉투를 바로 적을 수 있어요.
let LAST = null;
function setLast(r, twin){
  const el = $("#fLast"), form = $("#form"); if(!el) return;
  LAST = r || null;
  form.classList.toggle("has-last", !!r);
  el.innerHTML = r ? `<span>✓ ${esc(fm(T.added, { side: sideName(r.side), no: r.how === "a" ? T.acctTag : r.no ? r.no + "번" : "", name: r.name || T.noName, amt: r.amt == null ? T.noAmt : won(r.amt) }).replace(/\s+/g, " "))}${twin ? ` <em>${esc(T.addedTwin)}</em>` : ""}</span><button class="text-btn small" data-a="undoLast" data-keep>${esc(T.undo)}</button>` : "";
}

// ===== 번호 바꾸기 창 =====
function noSheet(){
  const sh = openSheet(`<h3>${esc(T.noTitle)}</h3><p>${esc(T.noBody)}</p>
    <input class="in" id="noIn" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${curNo()}">
    <div class="btns"><button class="btn main" id="noSet">${esc(T.noSet)}</button><button class="text-btn" id="noNone">${esc(T.noNone)}</button><button class="text-btn" id="noOff">${esc(T.noOff)}</button></div>`, T.noTitle);
  const inp = sh.querySelector("#noIn");
  sh.querySelector("#noNone").onclick = () => { F.noNone = true; F.no = null; closeThen(() => { refreshForm(); const el = $("#fName"); if(el) el.focus(); }); };
  const set = () => { const n = parseInt(inp.value, 10); if(n > 0){ F.no = n; F.noNone = false; closeThen(() => { refreshForm(); const el = $("#fName"); if(el) el.focus(); }); } else inp.focus(); };
  sh.querySelector("#noSet").onclick = set;
  inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); set(); } };
  sh.querySelector("#noOff").onclick = () => { S.opt.no = false; F.no = null; saveS(); closeThen(() => { refreshForm(); refreshBook(); }); };
  setTimeout(() => { inp.focus(); inp.select(); }, 60);
}

// ===== 줄 고치기 창 =====
function segHtml(id, pairs, cur){ return `<div class="seg" id="${id}" role="group">${pairs.map(([k, l]) => `<button data-k="${k}" class="${k === cur ? "on" : ""}" aria-pressed="${k === cur}">${esc(l)}</button>`).join("")}</div>`; }
function bindSeg(sh, id, fn){ $$(`#${id} button`, sh).forEach(b => b.onclick = () => { $$(`#${id} button`, sh).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); }); fn(b.dataset.k); }); }
function editSheet(id){
  const r = S.rows.find(x => x.id === id); if(!r) return;
  const d = Object.assign({}, r), why = flagMap(getChecks()).get(r.id) || (r.ok ? ["ok"] : null);
  const sh = openSheet(`<h3>${esc(T.editTitle)}</h3>
    <span class="lbl">${esc(T.editSide)}</span>${segHtml("eSide", SIDES.map(s => [s, sideName(s)]), d.side)}
    <span class="lbl">${esc(T.editHow)}</span>${segHtml("eHow", [["c", T.howCash], ["a", T.howAcct]], d.how)}
    <label class="lbl" for="eName">${esc(T.nameLabel)}</label>
    <input class="in" id="eName" type="text" autocomplete="off" maxlength="40" value="${esc(d.name)}">
    <label class="lbl" for="eAmt">${esc(T.amtLabel)}</label>
    <div class="amt-in"><input class="in" id="eAmt" type="text" inputmode="decimal" autocomplete="off" maxlength="12" value="${d.amt == null ? "" : esc(DN.manText(d.amt))}"><span>${esc(T.amtUnit)}</span></div>
    <div id="eNoBox"></div>
    ${S.opt.tk ? `<div class="opt-row"><span class="lbl">${esc(T.tkLabel)}</span><div class="step"><button id="eTkM" aria-label="−">−</button><b id="eTk"></b><button id="eTkP" aria-label="+">+</button></div></div>` : ""}
    ${S.opt.who ? `<span class="lbl">${esc(T.whoLabel)}</span><div class="chips" id="eWho"></div>` : ""}
    <label class="lbl" for="eRel">${esc(T.relLabel)}</label>
    <input class="in sm" id="eRel" type="text" autocomplete="off" maxlength="20" value="${esc(d.rel)}" list="relList"><datalist id="relList">${RELS.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <label class="lbl" for="eMemo">${esc(T.memoLabel)}</label>
    <input class="in sm" id="eMemo" type="text" autocomplete="off" maxlength="60" value="${esc(d.memo)}" placeholder="${esc(T.memoPh)}">
    <div style="margin-top:12px">
      <div class="sw"><div><b>${esc(T.editTh)}</b></div><button class="tg${d.th ? " on" : ""}" id="eTh" role="switch" aria-checked="${!!d.th}" aria-label="${esc(T.editTh)}"></button></div>
      ${why ? `<div class="sw"><div><b>${esc(T.editOk)}</b><span>${esc(T.editOkSub)}</span></div><button class="tg${d.ok ? " on" : ""}" id="eOk" role="switch" aria-checked="${!!d.ok}" aria-label="${esc(T.editOk)}"></button></div>` : ""}
    </div>`, T.editTitle, { foot: `<div class="sheet-x two-b"><button class="btn ghost danger" id="eDel">${esc(T.del)}</button><button class="btn main" id="eSave">${esc(T.save)}</button></div>` });
  const drawNo = () => { $("#eNoBox", sh).innerHTML = d.how === "c" && S.opt.no ? `<label class="lbl" for="eNo">${esc(T.editNo)}</label><input class="in sm" id="eNo" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="${d.no || ""}">` : ""; };
  const drawWho = () => { const el = $("#eWho", sh); if(!el) return; el.innerHTML = WHO.map(([k]) => `<button class="chip${d.who === k ? " on" : ""}" data-w="${k}" aria-pressed="${d.who === k}">${esc(whoName(d.side, k))}</button>`).join(""); $$("button", el).forEach(b => b.onclick = () => { d.who = d.who === b.dataset.w ? "" : b.dataset.w; drawWho(); }); };
  const drawTk = () => { const el = $("#eTk", sh); if(el) el.textContent = fm(T.tkUnit, { n: d.tk || 0 }); };
  drawNo(); drawWho(); drawTk();
  bindSeg(sh, "eSide", k => { d.side = k; drawWho(); });
  bindSeg(sh, "eHow", k => { d.how = k; if(k === "c" && !d.no && S.opt.no) d.no = nextNo(d.side); drawNo(); });
  if(S.opt.tk){ $("#eTkM", sh).onclick = () => { d.tk = Math.max(0, (d.tk || 0) - 1); drawTk(); }; $("#eTkP", sh).onclick = () => { d.tk = Math.min(99, (d.tk || 0) + 1); drawTk(); }; }
  const tog = (sel, key) => { const b = $(sel, sh); if(b) b.onclick = () => { d[key] = d[key] ? 0 : 1; b.classList.toggle("on", !!d[key]); b.setAttribute("aria-checked", String(!!d[key])); }; };
  tog("#eTh", "th"); tog("#eOk", "ok");
  $("#eSave", sh).onclick = () => {
    const a = $("#eAmt", sh).value.trim(), amt = a ? DN.parseAmt(a) : null;   // 비우면 "금액 아직", 0이면 빈 봉투
    if(a && amt == null){ $("#eAmt", sh).focus(); toast(T.badAmt); return; }
    const noEl = $("#eNo", sh);
    Object.assign(r, { side: d.side, how: d.how, name: $("#eName", sh).value.replace(/\s+/g, " ").trim(), amt, tk: d.tk || 0, who: d.who, rel: $("#eRel", sh).value.trim(), memo: $("#eMemo", sh).value.trim(), th: d.th, ok: d.ok,
      no: d.how === "c" ? (noEl ? (parseInt(noEl.value, 10) || null) : r.no) : null });
    saveS(); closeThen(() => { show(CUR); toast(T.saved); });
  };
  $("#eDel", sh).onclick = () => {
    const gone = delRow(r.id), at = S.rows.length;
    closeThen(() => { show(CUR); toast(fm(T.delDone, { name: gone.name || T.noName }), () => { S.rows.splice(Math.min(at, S.rows.length), 0, gone); S.rows.sort((a, b) => a.id - b.id); saveS(); show(CUR); }); });
  };
}

// ===== 칸 설정 창 =====
function swHtml(k, t, s){ return `<div class="sw"><div><b>${esc(t)}</b><span>${esc(s)}</span></div><button class="tg${S.opt[k] ? " on" : ""}" data-o="${k}" role="switch" aria-checked="${!!S.opt[k]}" aria-label="${esc(t)}"></button></div>`; }
function bindSw(sh){ $$(".tg[data-o]", sh).forEach(b => b.onclick = () => { const k = b.dataset.o; S.opt[k] = !S.opt[k]; b.classList.toggle("on", S.opt[k]); b.setAttribute("aria-checked", String(S.opt[k])); if(k === "no"){ F.no = null; F.noNone = false; } saveS(); }); }
// 처음 시작할 때 한 번: 어떻게 적을지 + 같이 적을 칸
function setupSheet(){
  let later = false;
  const sh = openSheet(`<h3>${esc(T.setupTitle)}</h3>
    <div class="ways" role="radiogroup" aria-label="${esc(T.setupTitle)}">
      <button class="way on" data-w="open" role="radio" aria-checked="true"><b>${esc(T.setupOpen)}</b><span>${esc(T.setupOpenSub)}</span></button>
      <button class="way" data-w="desk" role="radio" aria-checked="false"><b>${esc(T.setupDesk)}</b><span>${esc(T.setupDeskSub)}</span></button>
    </div>
    <span class="lbl" style="margin-top:18px">${esc(T.setupCols)}</span>
    ${swHtml("no", T.optNo, T.optNoSub)}${swHtml("tk", T.optTk, T.optTkSub)}${swHtml("who", T.optWho, T.optWhoSub)}
    <p class="note small">${esc(T.setupLead)}</p>`, T.setupTitle, { foot: `<div class="sheet-x"><button class="btn main" id="suGo">${esc(T.setupGo)}</button></div>` });
  $$(".way", sh).forEach(b => b.onclick = () => { later = b.dataset.w === "desk"; $$(".way", sh).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); }); });
  bindSw(sh);
  sh.querySelector("#suGo").onclick = () => { S.opt.later = later; S.setup = 1; saveS(); closeThen(() => go("book")); };
}
function optsSheet(){
  const sh = openSheet(`<h3>${esc(T.optsTitle)}</h3>
    ${swHtml("no", T.optNo, T.optNoSub)}${swHtml("tk", T.optTk, T.optTkSub)}${swHtml("who", T.optWho, T.optWhoSub)}${swHtml("later", T.optLater, T.optLaterSub)}
    <span class="lbl" style="margin-top:18px">${esc(T.infoTitle)}</span>
    <div class="btn-row"><input class="in sm" id="iG" type="text" autocomplete="off" maxlength="12" placeholder="${esc(T.infoG)}" aria-label="${esc(T.infoG)}" value="${esc(S.info.g)}"><input class="in sm" id="iB" type="text" autocomplete="off" maxlength="12" placeholder="${esc(T.infoB)}" aria-label="${esc(T.infoB)}" value="${esc(S.info.b)}"></div>
    <label class="lbl" for="iD">${esc(T.infoDate)}</label>
    <input class="in sm" id="iD" type="date" value="${esc(S.info.date)}">
    ${S.rows.length && !isDemo() ? `<div class="btns"><button class="text-btn danger" id="wipe">${esc(T.wipe)}</button></div>` : ""}`, T.optsTitle, { onClose: () => { if(TABS.includes(CUR)) show(CUR); } });
  bindSw(sh);
  const bind = (sel, k) => { $(sel, sh).oninput = e => { S.info[k] = e.target.value.trim(); saveS(); }; };
  bind("#iG", "g"); bind("#iB", "b"); bind("#iD", "date");
  const w = $("#wipe", sh); if(w) w.onclick = wipeSheet;
}
function wipeSheet(){
  const sh = openSheet(`<h3>${esc(T.wipeTitle)}</h3><p>${esc(fm(T.wipeBody, { n: S.rows.length }))}</p>
    <div class="btns"><button class="btn main" id="wYes" style="background:var(--late);color:#fff">${esc(T.wipeYes)}</button></div>`, T.wipeTitle, { close: T.wipeNo });
  sh.querySelector("#wYes").onclick = () => { MINE = S = blank(); saveS(); closeThen(() => { go("book", "replace"); toast(T.wiped); }); };
}

// ===== 목록 =====
const L = { q: "", side: "all", f: "all", sort: "no", only: null };
const SORTS = ["no", "new", "amt", "name"];
function listRows(){
  let rows = S.rows.slice();
  if(L.only){ const ids = new Set(L.only.ids); return rows.filter(r => ids.has(r.id)).sort(byNo); }
  if(L.side !== "all") rows = rows.filter(r => r.side === L.side);
  if(L.f === "cash") rows = rows.filter(r => r.how !== "a");
  else if(L.f === "acct") rows = rows.filter(r => r.how === "a");
  else if(L.f === "check"){ const m = flagMap(getChecks()); rows = rows.filter(r => m.has(r.id)); }
  else if(L.f === "noth") rows = rows.filter(r => !r.th);
  const q = L.q.trim();
  if(q) rows = rows.filter(r => DN.match(r.name, q) || DN.match(r.rel, q) || DN.match(r.memo, q));
  if(L.sort === "no") rows.sort(byNo);
  else if(L.sort === "new") rows.sort((a, b) => b.id - a.id);
  else if(L.sort === "amt") rows.sort((a, b) => b.amt - a.amt || byNo(a, b));
  else rows.sort((a, b) => (a.name || "힣").localeCompare(b.name || "힣", "ko") || byNo(a, b));
  return rows;
}
function list(){
  const sortName = { no: T.sortNo, new: T.sortNew, amt: T.sortAmt, name: T.sortName };
  const chip = (cur, k, l, a) => `<button class="tool${cur === k ? " on" : ""}" data-a="${a}" data-k="${k}" aria-pressed="${cur === k}">${esc(l)}</button>`;
  frame("list", `<div class="bk-one" style="max-width:none">
    ${L.only ? `<div class="band"><span>${esc(fm(T.onlyBand, { what: L.only.what }))}</span><button data-a="onlyClear">${esc(T.onlyClear)}</button></div>` : `
    <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg><input class="in" id="q" type="search" autocomplete="off" placeholder="${esc(T.searchPh)}" aria-label="${esc(T.searchPh)}" value="${esc(L.q)}"></div>
    <div class="tools">${chip(L.side, "all", T.fAll, "lside")}${chip(L.side, "g", T.sideG, "lside")}${chip(L.side, "b", T.sideB, "lside")}</div>
    <div class="tools">${chip(L.f, "cash", T.fCash, "lf")}${chip(L.f, "acct", T.fAcct, "lf")}${chip(L.f, "check", T.fCheck, "lf")}${chip(L.f, "noth", T.fNoTh, "lf")}<button class="tool" data-a="sort">${esc(fm(T.sortBtn, { s: sortName[L.sort] }))}</button></div>`}
    <p class="count-line" id="lCount"></p>
    <div id="lRows"></div>
  </div>`);
  drawList();
  const q = $("#q"); if(q) q.oninput = () => { L.q = q.value; drawList(); };
  window.scrollTo(0, 0);
}
function drawList(){
  const rows = listRows(), el = $("#lRows"); if(!el) return;
  $("#lCount").innerHTML = `<b>${esc(fm(T.listCount, { n: rows.length, amt: won(DN.stats(rows).all.amt) }))}</b>`;
  el.innerHTML = rows.length ? `<ul class="rows">${rows.map(r => rowHtml(r, { side: L.side === "all" || !!L.only })).join("")}</ul>`
    : S.rows.length ? `<p class="empty">${esc(T.listNone)}</p>` : `<p class="empty"><b>${esc(T.emptyTitle)}</b>${esc(T.sumEmptyBody)}</p>`;
}

// ===== 정산 =====
let cashSide = "g";
function sumRowsHtml(st, withCount){
  const row = (label, f, cls) => `<tr${cls ? ` class="${cls}"` : ""}><th>${esc(label)}</th><td>${f(st.g)}</td><td>${f(st.b)}</td><td>${f(st.all)}</td></tr>`;
  const cnt = n => n + "건";
  let h = row(T.docRowCashN, x => cnt(x.cashN)) + row(T.docRowCash, x => esc(won(x.cash))) + row(T.docRowAcctN, x => cnt(x.acctN)) + row(T.docRowAcct, x => esc(won(x.acct))) + row(T.docRowSum, x => esc(won(x.amt)), "sumrow");
  if(S.opt.tk){
    h += row(T.docRowTk, x => fm(T.tkUnit, { n: x.tk }));
    const og = tkOut("g"), ob = tkOut("b"), tx = v => v == null ? "–" : fm(T.tkUnit, { n: v });
    if(withCount && (og != null || ob != null)) h += `<tr><th>${esc(T.docRowTkOut)}</th><td>${tx(og)}</td><td>${tx(ob)}</td><td>${tx((og || 0) + (ob || 0))}</td></tr>`;
  }
  if(st.all.noName) h += row(T.docRowNoName, x => cnt(x.noName));
  if(st.all.unk) h += row(T.docRowUnk, x => cnt(x.unk));
  if(withCount){
    const cg = DN.cashTotal(S.cash.g), cb = DN.cashTotal(S.cash.b);
    if(cg || cb){
      const dg = cg ? cg - st.g.cash : null, db = cb ? cb - st.b.cash : null, sg = d => d == null ? "–" : d === 0 ? "0원" : (d > 0 ? "+" : "") + won(d);
      h += `<tr><th>${esc(T.docRowCount)}</th><td>${cg ? esc(won(cg)) : "–"}</td><td>${cb ? esc(won(cb)) : "–"}</td><td>${esc(won(cg + cb))}</td></tr>`;
      h += `<tr><th>${esc(T.docRowDiff)}</th><td>${esc(sg(dg))}</td><td>${esc(sg(db))}</td><td>${esc(sg((dg || 0) + (db || 0)))}</td></tr>`;
    }
  }
  return h;
}
// 나간 식권 = 받은 장수 − 남은 장수 (안 넣었으면 null)
function tkOut(side){ const t = S.tks[side] || {}; return +t.got > 0 ? (+t.got || 0) - (+t.left || 0) : null; }
function whoRows(st){
  const out = [];
  for(const side of SIDES){
    for(const [k] of WHO){ const x = st.who[side + ":" + k]; if(x) out.push({ side, k, label: `${sideName(side)} · ${whoName(side, k)}`, n: x.n, amt: x.amt }); }
    const none = st.who[side + ":"]; if(none) out.push({ side, k: "", label: `${sideName(side)} · ${T.whoNone}`, n: none.n, amt: none.amt });
  }
  return out;
}
function checksHtml(ck){
  const li = [];
  for(const side of SIDES){
    if(ck.gaps[side].length) li.push(`<li><span>${esc(fm(T.ckGap, { side: sideName(side), list: DN.ranges(ck.gaps[side]) }))}</span><span style="display:flex;gap:6px;flex:0 0 auto"><button data-a="gapGo" data-s="${side}">${esc(T.ckGapGo)}</button><button data-a="gapSkip" data-s="${side}" style="background:transparent;color:var(--warn);border:1.5px solid var(--warn)">${esc(T.ckGapSkip)}</button></span></li>`);
    for(const n of ck.dupNo[side]){ const l = S.rows.filter(r => r.side === side && r.how !== "a" && r.no === n && !r.ok); li.push(`<li><span>${esc(fm(T.ckDup, { side: sideName(side), no: n, n: l.length }))}</span><button data-a="ckSee" data-ids="${l.map(r => r.id).join(",")}" data-what="${esc(fm(T.ckDup, { side: sideName(side), no: n, n: l.length }))}">${esc(T.ckSee)}</button></li>`); }
  }
  const one = (list, text) => { if(list.length) li.push(`<li><span>${esc(text)}</span><button data-a="ckSee" data-ids="${list.map(r => r.id).join(",")}" data-what="${esc(text)}">${esc(T.ckSee)}</button></li>`); };
  one(ck.noName, fm(T.ckNoName, { n: ck.noName.length }));
  if(ck.noAmt.length) li.push(`<li><span>${esc(fm(T.ckNoAmt, { n: ck.noAmt.length }))}</span><button data-a="mark" data-m="amt">${esc(T.ckFill)}</button></li>`);
  for(const l of ck.sameName) one(l, fm(T.ckSame, { names: `${l[0].name} (${sideName(l[0].side)} ${l.length}줄)` }));
  one(ck.big, fm(T.ckBig, { n: ck.big.length }));
  return li.length ? `<ul class="ck">${li.join("")}</ul>` : `<p class="allok">${CHECK.replace('stroke="#fff"', 'stroke="currentColor"').replace("<svg", '<svg width="18" height="18"')}${esc(T.ckAllOk)}</p>`;
}
function cashHtml(st){
  const c = S.cash[cashSide] || {}, tot = DN.cashTotal(c), led = st[cashSide].cash, d = tot - led;
  const cmp = !tot ? `<div class="cmp wait">${esc(fm(T.cashWait, { side: sideName(cashSide), amt: won(led) }))}</div>`
    : d === 0 ? `<div class="cmp ok">${esc(fm(T.cashOk, { amt: won(tot) }))}</div>`
    : `<div class="cmp diff">${esc(fm(T.cashSum, { amt: won(tot) }))} — ${esc(fm(d > 0 ? T.cashMore : T.cashLess, { d: won(Math.abs(d)) }))}</div>`;
  return `${segHtml("cashSeg", SIDES.map(s => [s, sideName(s)]), cashSide)}
    <div class="bills">${DN.BILLS.map(b => `<label for="bill${b}">${esc(fm(T.bill, { b: DN.comma(b) }))}</label><input class="in" id="bill${b}" data-bill="${b}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" placeholder="0" value="${c[b] || ""}" aria-label="${esc(fm(T.bill, { b: DN.comma(b) }))} ${esc(T.billUnit)}"><output>${c[b] ? esc(won(b * c[b])) : ""}</output>`).join("")}
      <label for="billEtc">${esc(T.cashEtc)}</label><input class="in" id="billEtc" data-bill="etc" type="text" inputmode="numeric" maxlength="11" placeholder="0" value="${c.etc ? DN.comma(c.etc) : ""}"><output>${esc(T.cashEtcUnit)}</output>
    </div>${cmp}`;
}
function sum(){
  const st = DN.stats(S.rows);
  if(!S.rows.length){
    frame("sum", `<div class="bk-one"><div class="block" style="margin-top:14px"><h3>${esc(T.sumEmptyTitle)}</h3><p class="lead">${esc(T.sumEmptyBody)}</p><button class="btn main" data-a="tab" data-t="book">${esc(T.sumEmptyGo)}</button></div>${keepHtml()}</div>`);
    window.scrollTo(0, 0); return;
  }
  const ck = getChecks(), wr = S.opt.who ? whoRows(st) : [], left = S.opt.who ? S.rows.filter(r => !r.who).length : 0, maxBand = Math.max(1, ...st.bands.map(b => b.n));
  const half = s => `<div class="half ${s}"><span>${esc(sideName(s))}</span><b>${esc(won(st[s].amt))}</b><small>${esc(fm(T.halfMeta, { c: st[s].cashN, a: st[s].acctN }))}${S.opt.tk ? ` · ${esc(fm(T.tkTag, { n: st[s].tk }))}` : ""}</small></div>`;
  // 폰에서는 order 순서(합계 → 확인할 것 → 내보내기 → 맞추기 → 나눠 보기 → 보관 → 다음), 넓은 화면에서는 왼쪽 · 오른쪽 두 칸
  frame("sum", `<div class="sum-grid">
    <div>
      <section class="sum-card" style="order:1">
        <p class="sum-k">${esc(T.sumKicker)}</p>
        <p class="sum-big">${esc(won(st.all.amt))}</p>
        <p class="sum-sub">${esc(fm(T.sumSub, { n: st.all.n, c: st.all.cashN, a: st.all.acctN }))}${S.opt.tk ? esc(fm(T.sumSubTk, { t: st.all.tk })) : ""}</p>
        <div class="two">${half("g")}${half("b")}</div>
      </section>
      <section class="block" style="order:2"><h3>${esc(T.ckTitle)} ${ck.count ? `<span class="badge">${ck.count}</span>` : ""}</h3><p class="lead">${esc(T.ckLead)}</p>${checksHtml(ck)}</section>
      <section class="block" style="order:4"><h3>${esc(T.cashTitle)}</h3><p class="lead">${esc(T.cashLead)}</p><div id="cashBox">${cashHtml(st)}</div></section>
      ${S.opt.tk ? `<section class="block" style="order:5"><h3>${esc(T.tkTitle)}</h3><p class="lead">${esc(T.tkLead)}</p><div id="tkBox">${tkHtml(st)}</div></section>` : ""}
    </div>
    <div>
      <section class="block" style="order:3"><h3>${esc(T.outTitle)}</h3><p class="lead">${esc(T.outLead)}</p>
        <div class="outs">
          <button class="out-btn main" data-a="xlsx"><span><b>${esc(T.outXlsx)}</b><span>${esc(T.outXlsxSub)}</span></span><i>↓</i></button>
          <button class="out-btn" data-a="img"><span><b>${esc(T.outImg)}</b><span>${esc(T.outImgSub)}</span></span><i>↓</i></button>
          <button class="out-btn" data-a="text"><span><b>${esc(T.outText)}</b><span>${esc(T.outTextSub)}</span></span><i>›</i></button>
          <button class="out-btn" data-a="print"><span><b>${esc(T.outPrint)}</b><span>${esc(T.outPrintSub)}</span></span><i>›</i></button>
        </div>
        <p class="msg" id="msg" role="status"></p>
      </section>
      ${S.opt.who ? `<section class="block" style="order:6"><h3>${esc(T.whoTitle)}</h3><p class="lead">${esc(T.whoLead)}</p>
        <table class="kv"><thead><tr><th>${esc(T.whoColWho)}</th><th>${esc(T.whoColN)}</th><th>${esc(T.whoColAmt)}</th></tr></thead><tbody>${wr.map(x => `<tr><th>${esc(x.label)}</th><td>${x.n}</td><td>${esc(won(x.amt))}</td></tr>`).join("")}</tbody></table>
        ${left ? `<button class="btn main" data-a="mark" data-m="who" style="margin-top:12px">${esc(fm(T.whoGo, { n: left }))}</button>` : ""}
        <p class="note small">${esc(T.whoTax)}</p></section>` : ""}
      ${st.rel.length ? `<section class="block" style="order:7"><h3>${esc(T.relTitle)}</h3><p class="lead">${esc(T.relLead)}</p>
        <table class="kv"><thead><tr><th>${esc(T.colRel)}</th><th>${esc(T.whoColN)}</th><th>${esc(T.whoColAmt)}</th></tr></thead><tbody>${relRows(st).map(x => `<tr><th>${esc(x.rel)}</th><td>${x.n}</td><td>${esc(won(x.amt))}</td></tr>`).join("")}</tbody></table></section>` : ""}
      <section class="block" style="order:8"><h3>${esc(T.bandTitle)}</h3><p class="lead">${esc(fm(T.bandLead, { avg: won(Math.round(st.avg / 1000) * 1000) }))}</p>
        <div class="bars">${st.bands.filter(b => b.n).map(b => `<div class="bar-r"><span>${esc(b.label)}</span><i style="width:${Math.max(3, Math.round(b.n / maxBand * 100))}%"></i><em>${b.n}건</em></div>`).join("")}</div></section>
      ${keepHtml(9)}
      <section class="next-box" style="order:10"><b>${esc(T.nextTitle)}</b><p>${esc(T.nextBody)}</p>
        ${siteLink("thanks", "btn", esc(T.nextThanks))}
        <button class="btn" data-a="mark" data-m="th">${esc(T.nextMark)}</button></section>
    </div>
  </div>`);
  bindCash(); bindTk();
  window.scrollTo(0, 0);
}
// 소속 · 관계별: 적은 것 + "안 적음" 한 줄
function relRows(st){
  const none = S.rows.filter(r => !String(r.rel || "").trim());
  return none.length ? [...st.rel, { rel: T.relNone, n: none.length, amt: DN.stats(none).all.amt }] : st.rel;
}
let tkSide = "g";
function tkCmpHtml(st){
  const out = tkOut(tkSide), led = st[tkSide].tk;
  if(out == null) return `<div class="cmp wait">${esc(fm(T.tkWait, { side: sideName(tkSide), n: led }))}</div>`;
  const d = out - led;
  return d === 0 ? `<div class="cmp ok">${esc(fm(T.tkOk, { n: out }))}</div>` : `<div class="cmp diff">${esc(fm(d > 0 ? T.tkMore : T.tkLess, { n: out, d: Math.abs(d) }))}</div>`;
}
function tkHtml(st){
  const t = S.tks[tkSide] || {};
  const inp = (k, label) => `<label for="tk_${k}">${esc(label)}</label><input class="in" id="tk_${k}" data-tk="${k}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="0" value="${t[k] || ""}"><output>${esc(T.billUnit)}</output>`;
  return `${segHtml("tkSeg", SIDES.map(s => [s, sideName(s)]), tkSide)}<div class="bills">${inp("got", T.tkGot)}${inp("left", T.tkLeft)}</div>${tkCmpHtml(st)}`;
}
function bindTk(){
  const box = $("#tkBox"); if(!box) return;
  bindSeg(box, "tkSeg", k => { tkSide = k; box.innerHTML = tkHtml(DN.stats(S.rows)); bindTk(); });
  $$("input[data-tk]", box).forEach(inp => inp.oninput = () => {
    S.tks[tkSide] = S.tks[tkSide] || {}; S.tks[tkSide][inp.dataset.tk] = parseInt(inp.value.replace(/[^\d]/g, ""), 10) || 0; saveS();
    const tmp = document.createElement("div"); tmp.innerHTML = tkCmpHtml(DN.stats(S.rows));
    $(".cmp", box).replaceWith(tmp.firstElementChild);
  });
}
function keepHtml(order){
  return `<section class="block"${order ? ` style="order:${order}"` : ""}><h3>${esc(T.keepTitle)}</h3><p class="lead">${esc(T.keepLead)}</p>
    <div class="outs">
      ${S.rows.length ? `<button class="out-btn" data-a="backup"><span><b>${esc(T.keepSave)}</b><span>${esc(T.keepSaveSub)}</span></span><i>↓</i></button>` : ""}
      <button class="out-btn" data-a="load"><span><b>${esc(T.keepLoad)}</b><span>${esc(T.keepLoadSub)}</span></span><i>↑</i></button>
    </div>
    ${isDemo() ? "" : `<p class="note small" id="filedNote">${esc(S.filed ? fm(T.lastFile, { t: stamp(S.filed) }) : T.lastFileNone)}</p>`}</section>`;
}
function bindCash(){
  const box = $("#cashBox"); if(!box) return;
  bindSeg(box, "cashSeg", k => { cashSide = k; box.innerHTML = cashHtml(DN.stats(S.rows)); bindCash(); });
  $$("input[data-bill]", box).forEach(inp => inp.oninput = () => {
    const k = inp.dataset.bill, v = parseInt(inp.value.replace(/[^\d]/g, ""), 10) || 0;
    S.cash[cashSide] = S.cash[cashSide] || {}; S.cash[cashSide][k] = v; saveS();
    if(k !== "etc") inp.nextElementSibling.textContent = v ? won(+k * v) : "";
    const st = DN.stats(S.rows), tmp = document.createElement("div"); tmp.innerHTML = cashHtml(st);
    const old = $(".cmp", box), neu = $(".cmp", tmp); if(old && neu) old.replaceWith(neu);
  });
}

// ===== 내보내기: 엑셀 =====
function fileBase(){ const d = S.info.date || todayYmd(); return `축의금장부_${d}`; }
function docSub(){
  const names = [S.info.g, S.info.b].filter(Boolean).join(" · ");
  return [names, S.info.date ? fm(T.docDate, { d: dots(S.info.date) }) : "", fm(T.docMade, { d: dots(todayYmd()) })].filter(Boolean).join("  ·  ");
}
function xlsxSheets(){
  const st = DN.stats(S.rows), rows = S.rows.slice().sort(byNo), col = window.xlsxCol;
  // 장부 칸: 켠 칸만 넣어요
  const cols = [
    { k: "side", h: T.colSide, w: 9, s: 5, v: r => sideName(r.side) },
    { k: "no", h: T.colNo, w: 7, s: 5, v: r => (r.how === "a" ? "" : r.no || ""), on: S.opt.no },
    { k: "name", h: T.colName, w: 20, s: 4, v: r => r.name || T.noName },
    { k: "amt", h: T.colAmt, w: 14, s: 6, v: r => (r.amt == null ? "" : r.amt) },
    { k: "how", h: T.colHow, w: 10, s: 5, v: r => (r.how === "a" ? T.howAcct : T.howCash) },
    { k: "tk", h: T.colTk, w: 7, s: 12, v: r => r.tk || 0, on: S.opt.tk },
    { k: "who", h: T.colWho, w: 11, s: 5, v: r => whoName(r.side, r.who), on: S.opt.who },
    { k: "rel", h: T.colRel, w: 16, s: 4, v: r => r.rel || "" },
    { k: "memo", h: T.colMemo, w: 26, s: 4, v: r => r.memo || "" },
    { k: "th", h: T.colTh, w: 10, s: 5, v: r => (r.th ? T.xlThYes : "") }
  ].filter(c => c.on !== false);
  const ci = k => cols.findIndex(c => c.k === k), L1 = k => col(ci(k));
  const ledger = (name, list, withSide, note) => {
    const cs = withSide ? cols : cols.filter(c => c.k !== "side"), last = Math.max(5, list.length + 4), idx = k => cs.findIndex(c => c.k === k), CL = k => col(idx(k));
    const total = cs.map((c, i) => i === 0 ? { v: T.xlTotal, s: 13 }
      : c.k === "name" ? { f: `SUBTOTAL(103,${CL("name")}5:${CL("name")}${last})`, v: list.length, s: 14 }
      : c.k === "amt" ? { f: `SUBTOTAL(109,${CL("amt")}5:${CL("amt")}${last})`, v: DN.stats(list).all.amt, s: 8 }
      : c.k === "tk" ? { f: `SUBTOTAL(109,${CL("tk")}5:${CL("tk")}${last})`, v: DN.stats(list).all.tk, s: 14 } : { v: "", s: 13 });
    const end = col(cs.length - 1);
    return { name, widths: cs.map(c => c.w), freeze: 4, filter: `A4:${end}${last}`, titleRow: 4, merges: [`A1:${end}1`, `A2:${end}2`],
      rows: [{ ht: 26, cells: [{ v: `${T.name} — ${name}`, s: 2 }] }, { ht: 34, cells: [{ v: note, s: 3 }] }, { ht: 22, cells: total }, { ht: 22, cells: cs.map(c => ({ v: c.h, s: 1 })) },
        ...list.map(r => cs.map(c => ({ v: c.v(r), s: c.s })))] };
  };
  // 정산 요약: 전체 장부 시트를 보는 수식 + 미리 계산한 값
  const A = `'${T.xlAll}'!`, rng = k => `${A}$${L1(k)}:$${L1(k)}`, q = s => `"${s}"`;
  const two = f => `${f(q(T.sideG))}+${f(q(T.sideB))}`;   // 양쪽 합: 별표(*) 같은 조건 없이 신랑측 + 신부측을 따로 세어 더해요 (어느 프로그램에서 열어도 같게)
  const cnt = (side, how) => `COUNTIFS(${rng("side")},${q(sideName(side))},${rng("how")},${q(how)})`;
  const sm = (side, how) => `SUMIFS(${rng("amt")},${rng("side")},${q(sideName(side))},${rng("how")},${q(how)})`;
  const R = [], add = cells => { R.push(cells); return R.length; };
  add({ ht: 28, cells: [{ v: T.docTitle, s: 2 }] });
  add({ ht: 20, cells: [{ v: docSub(), s: 3 }] });
  add({ ht: 34, cells: [{ v: T.xlNote, s: 3 }] });
  add([]);
  add({ ht: 22, cells: [T.docColKind, T.sideG, T.sideB, T.docColSum].map(v => ({ v, s: 1 })) });
  const line = (label, fg, fb, vg, vb, s, sLast) => { const n = R.length + 1; add([{ v: label, s: 4 }, { f: fg, v: vg, s }, { f: fb, v: vb, s }, { f: `B${n}+C${n}`, v: vg + vb, s: sLast || s }]); return n; };
  line(T.docRowCashN, cnt("g", T.howCash), cnt("b", T.howCash), st.g.cashN, st.b.cashN, 12);
  const rCash = line(T.docRowCash, sm("g", T.howCash), sm("b", T.howCash), st.g.cash, st.b.cash, 6);
  line(T.docRowAcctN, cnt("g", T.howAcct), cnt("b", T.howAcct), st.g.acctN, st.b.acctN, 12);
  const rAcct = line(T.docRowAcct, sm("g", T.howAcct), sm("b", T.howAcct), st.g.acct, st.b.acct, 6);
  add([{ v: T.docRowSum, s: 13 }, { f: `B${rCash}+B${rAcct}`, v: st.g.amt, s: 8 }, { f: `C${rCash}+C${rAcct}`, v: st.b.amt, s: 8 }, { f: `D${rCash}+D${rAcct}`, v: st.all.amt, s: 8 }]);
  if(S.opt.tk) line(T.docRowTk, `SUMIFS(${rng("tk")},${rng("side")},${q(T.sideG)})`, `SUMIFS(${rng("tk")},${rng("side")},${q(T.sideB)})`, st.g.tk, st.b.tk, 12);
  const og = tkOut("g"), ob = tkOut("b");
  if(S.opt.tk && (og != null || ob != null)){ const n = R.length + 1; add([{ v: T.docRowTkOut, s: 4 }, { v: og == null ? "" : og, s: 12 }, { v: ob == null ? "" : ob, s: 12 }, { f: `B${n}+C${n}`, v: (og || 0) + (ob || 0), s: 12 }]); }
  if(st.all.noName) line(T.docRowNoName, `COUNTIFS(${rng("side")},${q(T.sideG)},${rng("name")},${q(T.noName)})`, `COUNTIFS(${rng("side")},${q(T.sideB)},${rng("name")},${q(T.noName)})`, st.g.noName, st.b.noName, 12);
  // 빈칸을 세는 식은 프로그램마다 다르게 읽을 수 있어서, "전체 − 값이 있는 줄"로 세요
  const unkF = sd => `COUNTIFS(${rng("side")},${q(sd)})-COUNTIFS(${rng("side")},${q(sd)},${rng("amt")},">=0")`;
  if(st.all.unk) line(T.docRowUnk, unkF(T.sideG), unkF(T.sideB), st.g.unk, st.b.unk, 12);
  const cg = DN.cashTotal(S.cash.g), cb = DN.cashTotal(S.cash.b);
  if(cg || cb){
    const n = R.length + 1;
    add([{ v: T.docRowCount, s: 4 }, { v: cg || "", s: 6 }, { v: cb || "", s: 6 }, { f: `B${n}+C${n}`, v: cg + cb, s: 6 }]);
    add([{ v: T.docRowDiff, s: 4 }, cg ? { f: `B${n}-B${rCash}`, v: cg - st.g.cash, s: 6 } : { v: "", s: 6 }, cb ? { f: `C${n}-C${rCash}`, v: cb - st.b.cash, s: 6 } : { v: "", s: 6 }, { v: "", s: 6 }]);
  }
  // "안 나눈 분 · 안 적음" 줄은 빈칸을 세지 않고 "전체 − 위에 나온 줄"로 계산해요 (빈칸을 세는 식은 프로그램마다 다르게 읽어요)
  if(S.opt.who){
    add([]); add({ ht: 22, cells: [{ v: T.whoTitle, s: 9 }] });
    add({ ht: 22, cells: [T.whoColWho, T.whoColN, T.whoColAmt].map(v => ({ v, s: 1 })) });
    for(const side of SIDES){
      const sd = `${rng("side")},${q(sideName(side))}`; let first = 0, lastR = 0;
      for(const x of whoRows(st).filter(y => y.side === side)){
        const n = R.length + 1;
        if(x.k){
          const w = `${rng("who")},${q(whoName(side, x.k))}`;
          add([{ v: x.label, s: 4 }, { f: `COUNTIFS(${sd},${w})`, v: x.n, s: 12 }, { f: `SUMIFS(${rng("amt")},${sd},${w})`, v: x.amt, s: 6 }]);
          if(!first) first = n; lastR = n;
        } else add([{ v: x.label, s: 4 }, { f: `COUNTIFS(${sd})${first ? `-SUM(B${first}:B${lastR})` : ""}`, v: x.n, s: 12 }, { f: `SUMIFS(${rng("amt")},${sd})${first ? `-SUM(C${first}:C${lastR})` : ""}`, v: x.amt, s: 6 }]);
      }
    }
  }
  if(st.rel.length){
    add([]); add({ ht: 22, cells: [{ v: T.relTitle, s: 9 }] });
    add({ ht: 22, cells: [T.colRel, T.whoColN, T.whoColAmt].map(v => ({ v, s: 1 })) });
    const crit = t => "=" + t.replace(/~/g, "~~").replace(/\*/g, "~*").replace(/\?/g, "~?").replace(/"/g, '""'); let first = 0, lastR = 0;
    for(const x of relRows(st)){
      const n = R.length + 1;
      if(x.rel !== T.relNone){
        const w = `,${rng("rel")},${q(crit(x.rel))}`;
        add([{ v: x.rel, s: 4 }, { f: two(sd => `COUNTIFS(${rng("side")},${sd}${w})`), v: x.n, s: 12 }, { f: two(sd => `SUMIFS(${rng("amt")},${rng("side")},${sd}${w})`), v: x.amt, s: 6 }]);
        if(!first) first = n; lastR = n;
      } else add([{ v: x.rel, s: 4 }, { f: `${two(sd => `COUNTIFS(${rng("side")},${sd})`)}-SUM(B${first}:B${lastR})`, v: x.n, s: 12 }, { f: `${two(sd => `SUMIFS(${rng("amt")},${rng("side")},${sd})`)}-SUM(C${first}:C${lastR})`, v: x.amt, s: 6 }]);
    }
  }
  add([]); add({ ht: 22, cells: [{ v: T.bandTitle, s: 9 }] });
  add({ ht: 22, cells: [T.docColKind, T.whoColN, T.whoColAmt].map(v => ({ v, s: 1 })) });
  st.bands.forEach((b, i) => {
    const [lo, hi] = DN.BANDS[i];
    const cond = `,${rng("amt")},">="&${lo === 0 ? 1 : lo}` + (hi === Infinity ? "" : `,${rng("amt")},"<="&${hi}`);
    add([{ v: b.label, s: 4 }, { f: two(sd => `COUNTIFS(${rng("side")},${sd}${cond})`), v: b.n, s: 12 }, { f: two(sd => `SUMIFS(${rng("amt")},${rng("side")},${sd}${cond})`), v: b.amt, s: 6 }]);
  });
  const sheets = [{ name: T.xlSum, widths: [24, 17, 17, 17], merges: ["A1:D1", "A2:D2", "A3:D3"], rows: R },
    ledger(T.xlAll, rows, true, T.xlListNote)];
  for(const s of SIDES){ const l = rows.filter(r => r.side === s); if(l.length) sheets.push(ledger(sideName(s), l, false, T.xlListNote)); }
  return sheets;
}
async function saveXlsx(){
  const msg = $("#msg");
  let file;
  try { const blob = window.xlsxBook(xlsxSheets()); file = new File([blob], fileBase() + ".xlsx", { type: blob.type }); }
  catch (e) { if(msg) msg.textContent = T.xlsxFail; return; }
  if(await shareOrSave(file, T.xlsxDone)){ markFiled(); if(msg) msg.textContent = ""; }
}

// ===== 내보내기: 정산서 이미지 =====
function docHtml(){
  const st = DN.stats(S.rows), wr = S.opt.who ? whoRows(st).filter(x => x.k) : [];
  return `<div class="shot" id="shot">
    <p class="shot-k">${esc(T.name)}</p>
    <h2>${esc(T.docTitle)}</h2>
    <p class="shot-d">${esc(docSub())}</p>
    <div class="shot-big"><span>${esc(T.sumKicker)}</span><b>${esc(won(st.all.amt))}</b><small>${esc(fm(T.sumSub, { n: st.all.n, c: st.all.cashN, a: st.all.acctN }))}</small></div>
    <table><thead><tr><th>${esc(T.docColKind)}</th><th>${esc(T.sideG)}</th><th>${esc(T.sideB)}</th><th>${esc(T.docColSum)}</th></tr></thead><tbody>${sumRowsHtml(st, true)}</tbody></table>
    ${wr.length ? `<h4>${esc(T.whoTitle)}</h4><table><tbody>${wr.map(x => `<tr><th>${esc(x.label)}</th><td>${x.n}건</td><td>${esc(won(x.amt))}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="shot-n">${esc(T.docNote)}</p>
  </div>`;   // 가족에게 보내는 돈 문서라 사회자 서명은 넣지 않아요 (수정 요청서 요청서 그림과 같은 기준, 11/13)
}
async function saveImage(){
  const msg = $("#msg");
  if(typeof window.html2canvas !== "function"){ msg.textContent = T.imgFail; return; }
  msg.textContent = T.imgWait;
  const holder = document.createElement("div"); holder.className = "shot-holder"; holder.innerHTML = docHtml();
  document.body.appendChild(holder);
  try {
    if(document.fonts) await document.fonts.ready;
    const canvas = await window.html2canvas(holder.firstElementChild, { scale: 3, backgroundColor: "#ffffff", logging: false });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const ok = await shareOrSave(new File([blob], fileBase().replace("장부", "정산서") + ".png", { type: "image/png" }), T.imgDone);
    msg.textContent = "";
  } catch (e) { msg.textContent = T.imgFail; }
  finally { holder.remove(); }
}

// ===== 내보내기: 글 =====
function sumText(){
  const st = DN.stats(S.rows), L2 = [T.txtHead + (S.info.date ? " " + dots(S.info.date) : "")];
  L2.push(fm(T.txtTotal, { amt: won(st.all.amt), n: st.all.n }));
  for(const s of SIDES) L2.push(fm(T.txtSide, { side: sideName(s), amt: won(st[s].amt), c: st[s].cashN, a: st[s].acctN }));
  if(S.opt.tk) L2.push(fm(T.txtTk, { t: st.all.tk, g: st.g.tk, b: st.b.tk }));
  if(S.opt.who){ const wr = whoRows(st); if(wr.length){ L2.push(""); for(const x of wr) L2.push(fm(T.txtWho, { who: x.label, amt: won(x.amt), n: x.n })); } }
  return L2.join("\n");
}
function listText(what, rows){
  const l = rows.slice().sort(byNo);
  return [fm(T.txtListHead, { what, n: l.length, amt: won(DN.stats(l).all.amt) }), ...l.map((r, i) => `${i + 1}. ${r.name || T.noName} ${r.amt == null ? T.noAmt : won(r.amt)}${r.how === "a" ? ` (${T.howAcct})` : ""}`)].join("\n");
}
function textSheet(){
  const st = DN.stats(S.rows);
  const kinds = [["sum", T.txtSum], ["all", T.txtAll], ...SIDES.filter(s => st[s].n).map(s => [s, sideName(s)])];
  if(S.opt.who) for(const x of whoRows(st)) if(x.k) kinds.push([`${x.side}:${x.k}`, x.label]);
  let cur = "sum";
  const make = k => k === "sum" ? sumText() : k === "all" ? listText(T.txtAll.replace(" 명단", ""), S.rows) : SIDES.includes(k) ? listText(sideName(k), S.rows.filter(r => r.side === k))
    : listText(kinds.find(x => x[0] === k)[1], S.rows.filter(r => r.side + ":" + r.who === k));
  const sh = openSheet(`<h3>${esc(T.txtTitle)}</h3>
    <div class="chips" id="tKinds">${kinds.map(([k, l]) => `<button class="chip${k === cur ? " on" : ""}" data-k="${esc(k)}" aria-pressed="${k === cur}">${esc(l)}</button>`).join("")}</div>
    <textarea class="paste" id="tOut" readonly style="margin-top:12px;min-height:220px"></textarea>
    <p class="msg" id="tMsg" role="status"></p>`, T.txtTitle, { foot: `<div class="sheet-x two-b"><button class="btn ghost" id="sheetX">${esc(T.optsDone)}</button><button class="btn main" id="tCopy">${esc(T.txtCopy)}</button></div>` });
  const out = $("#tOut", sh); out.value = make(cur);
  $$("#tKinds button", sh).forEach(b => b.onclick = () => { cur = b.dataset.k; $$("#tKinds button", sh).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); }); out.value = make(cur); out.scrollTop = 0; $("#tMsg", sh).textContent = ""; });
  $("#tCopy", sh).onclick = async () => {
    const m = $("#tMsg", sh);
    try { await navigator.clipboard.writeText(out.value); m.textContent = T.txtCopied; }
    catch (e) { out.focus(); out.select(); m.textContent = T.txtCopyFail; }
  };
}

// ===== 내보내기: 인쇄 =====
function printDoc(){
  let pa = $("#printArea"); if(!pa){ pa = document.createElement("div"); pa.id = "printArea"; pa.className = "print-area"; document.body.appendChild(pa); }
  const st = DN.stats(S.rows), wr = S.opt.who ? whoRows(st) : [];
  const head = `<th class="c">${esc(T.colNo)}</th><th>${esc(T.colName)}</th><th class="r">${esc(T.colAmt)}</th>${S.opt.tk ? `<th class="c">${esc(T.colTk)}</th>` : ""}${S.opt.who ? `<th>${esc(T.colWho)}</th>` : ""}<th>${esc(T.colRel)} · ${esc(T.colMemo)}</th>`;
  const table = side => {
    const l = S.rows.filter(r => r.side === side).sort(byNo); if(!l.length) return "";
    return `<h2>${esc(sideName(side))} — ${l.length}건 · ${esc(won(st[side].amt))}</h2><table><thead><tr>${head}</tr></thead><tbody>${l.map(r => `<tr><td class="c">${r.how === "a" ? esc(T.acctTag) : r.no || ""}</td><td>${esc(r.name || T.noName)}</td><td class="r">${r.amt == null ? "" : esc(DN.comma(r.amt))}</td>${S.opt.tk ? `<td class="c">${r.tk || ""}</td>` : ""}${S.opt.who ? `<td>${esc(whoName(r.side, r.who))}</td>` : ""}<td>${esc([r.rel, r.memo].filter(Boolean).join(" · "))}</td></tr>`).join("")}</tbody></table>`;
  };
  pa.innerHTML = `<h1>${esc(T.docTitle)}</h1><p>${esc(docSub())}</p>
    <table><thead><tr><th>${esc(T.docColKind)}</th><th class="r">${esc(T.sideG)}</th><th class="r">${esc(T.sideB)}</th><th class="r">${esc(T.docColSum)}</th></tr></thead><tbody>${sumRowsHtml(st, true).replace(/<td>/g, '<td class="r">')}</tbody></table>
    ${wr.length ? `<h2>${esc(T.whoTitle)}</h2><table><tbody>${wr.map(x => `<tr><th>${esc(x.label)}</th><td class="r">${x.n}건</td><td class="r">${esc(won(x.amt))}</td></tr>`).join("")}</tbody></table>` : ""}
    <h2>${esc(T.docHand)}</h2>
    <table class="hand"><tbody>
      <tr><th>${esc(T.docHandBy)}</th><td></td><th>${esc(T.docHandWhen)}</th><td></td></tr>
      <tr><th>${esc(T.docHandFrom)}</th><td class="sg">${esc(T.docHandSign)}</td><th>${esc(T.docHandTo)}</th><td class="sg">${esc(T.docHandSign)}</td></tr>
    </tbody></table>
    <p>${esc(T.docHandNote)}</p>
    ${table("g")}${table("b")}
    <p style="margin-top:10pt">${esc(T.docNote)}</p>`;
  setTimeout(() => window.print(), 60);
}

// ===== 보관 · 옮기기 =====
function saveBackup(){
  const data = { app: "duly-noted", v: 1, at: Date.now(), rows: S.rows, seq: S.seq, opt: S.opt, cash: S.cash, tks: S.tks, skip: S.skip, info: S.info };
  const file = new File([JSON.stringify(data)], fileBase().replace("장부", "장부백업") + ".json", { type: "application/json" });
  shareOrSave(file, T.backupDone).then(ok => { if(ok) markFiled(); });
}
function pickBackup(){
  let fi = $("#bkFile"); if(!fi){ fi = document.createElement("input"); fi.type = "file"; fi.id = "bkFile"; fi.accept = ".json,application/json"; fi.hidden = true; document.body.appendChild(fi); }
  fi.value = "";
  fi.onchange = async () => {
    const f = fi.files && fi.files[0]; if(!f) return;
    let d = null;
    try { d = JSON.parse(await f.text()); } catch (e) {}
    if(!d || d.app !== "duly-noted" || !Array.isArray(d.rows)){ toast(T.loadBad); return; }
    loadSheet(d);
  };
  fi.click();
}
function cleanRow(r){ return { side: r.side === "b" ? "b" : "g", how: r.how === "a" ? "a" : "c", no: +r.no > 0 ? Math.floor(+r.no) : null, name: String(r.name || "").slice(0, 40), amt: r.amt == null ? null : Math.max(0, Math.round(+r.amt || 0)), tk: Math.max(0, Math.round(+r.tk || 0)), who: WHO.some(w => w[0] === r.who) ? r.who : "", rel: String(r.rel || "").slice(0, 20), memo: String(r.memo || "").slice(0, 60), th: r.th ? 1 : 0, ok: r.ok ? 1 : 0, at: +r.at || 0 }; }
// 백업 파일의 설정 · 센 지폐 · 식권 장수도 숫자와 짧은 글로만 받아요 (다른 것이 섞인 파일을 열어도 화면이 깨지지 않게)
function cleanMeta(d){
  const num = (o, keys) => { const out = {}; for(const k of keys){ const v = Math.max(0, Math.round(+((o || {})[k]) || 0)); if(v) out[k] = v; } return out; };
  const both = (o, keys) => ({ g: num(o && o.g, keys), b: num(o && o.b, keys) });
  const nos = a => (Array.isArray(a) ? a : []).map(Number).filter(n => n > 0 && n < 10000).map(Math.floor);
  const o = d.opt || {}, i = d.info || {}, txt = v => String(v || "").slice(0, 12);
  return { opt: { no: o.no !== false, tk: !!o.tk, who: !!o.who, later: !!o.later }, cash: both(d.cash, [...DN.BILLS, "etc"]), tks: both(d.tks, ["got", "left"]),
    skip: { g: nos(d.skip && d.skip.g), b: nos(d.skip && d.skip.b) }, info: { g: txt(i.g), b: txt(i.b), date: /^\d{4}-\d{2}-\d{2}$/.test(i.date || "") ? i.date : "" } };
}
function loadSheet(d){
  if(isDemo()){ S = MINE; }
  const rows = d.rows.map(cleanRow), amt = DN.stats(rows).all.amt, meta = cleanMeta(d);
  const apply = merge => {
    let n = 0, dup = 0;
    if(!merge){ MINE = S = fill(Object.assign({ v: 1, rows: [], setup: 1 }, meta)); }
    else { S.setup = 1; for(const k of ["tk", "who"]) if(meta.opt[k]) S.opt[k] = true; for(const k of ["g", "b", "date"]) if(!S.info[k] && meta.info[k]) S.info[k] = meta.info[k]; }
    const key = r => [r.side, r.how, r.no, r.name, r.amt].join("|"), have = new Set(S.rows.map(key));
    for(const r of rows){ if(merge && have.has(key(r))){ dup++; continue; } S.rows.push(Object.assign(r, { id: ++S.seq })); n++; }
    saveS();
    closeThen(() => { go(TABS.includes(CUR) ? CUR : "book", CUR === "home" ? undefined : "replace"); toast(merge ? fm(T.loadMerged, { n, d: dup }) : fm(T.loadDone, { n })); });
  };
  if(!S.rows.length){ openSheet(`<h3>${esc(T.loadTitle)}</h3><p>${esc(fm(T.loadBody, { n: rows.length, amt: won(amt), m: 0 }))}</p><div class="btns"><button class="btn main" id="ldYes">${esc(T.otherLoad)}</button></div>`, T.loadTitle, { close: T.wipeNo }).querySelector("#ldYes").onclick = () => apply(false); return; }
  const sh = openSheet(`<h3>${esc(T.loadTitle)}</h3><p>${esc(fm(T.loadBody, { n: rows.length, amt: won(amt), m: S.rows.length }))}</p>
    <div class="btns"><button class="btn main" id="ldMerge">${esc(T.loadMerge)}</button><p class="note small" style="text-align:center;margin-top:0">${esc(T.loadMergeSub)}</p><button class="text-btn danger" id="ldRep">${esc(T.loadReplace)}</button></div>`, T.loadTitle, { close: T.wipeNo });
  sh.querySelector("#ldMerge").onclick = () => apply(true);
  sh.querySelector("#ldRep").onclick = () => apply(false);
}

// ===== 한꺼번에 붙여넣기 =====
const P = { side: "g", how: "a", text: "", res: null, nameCol: -1, amtCol: -1 };
function subTop(title, back){ return `<div class="bk-top"><button class="home" data-a="back">‹ ${esc(back)}</button><b>${esc(title)}</b><span style="width:64px"></span></div>`; }
function paste(){
  document.body.classList.remove("is-cover");
  app.className = "bk";
  app.innerHTML = `${subTop(T.pasteTitle, T.pasteBack)}
    <div class="bk-one">
      <section class="block" style="margin-top:4px">
        <p class="lead">${esc(T.pasteLead)}</p>
        <span class="lbl">${esc(T.pasteSide)}</span>${segHtml("pSide", SIDES.map(s => [s, sideName(s)]), P.side)}
        <span class="lbl">${esc(T.pasteHow)}</span>${segHtml("pHow", [["a", T.howAcct], ["c", T.howCash]], P.how)}
        <textarea class="paste" id="pText" placeholder="${esc(T.pastePh)}" aria-label="${esc(T.pasteTitle)}" spellcheck="false"></textarea>
        <p class="note small" style="margin-top:6px">${esc(T.pasteHint)} ${esc(T.pasteSafe)}</p>
        <button class="btn main" data-a="pRead" style="margin-top:12px">${esc(T.pasteRead)}</button>
      </section>
      <div id="pOut"></div>
    </div>`;
  $("#pText").value = P.text;
  bindSeg(app, "pSide", k => { P.side = k; });
  bindSeg(app, "pHow", k => { P.how = k; });
  if(P.res) drawPaste();
  window.scrollTo(0, 0);
}
function pasteRows(){
  if(!P.res) return { rows: [], bad: [] };
  if(P.res.table) return P.nameCol >= 0 && P.amtCol >= 0 && P.nameCol !== P.amtCol ? DN.rowsFromTable(P.res.table, P.nameCol, P.amtCol) : { rows: [], bad: [] };
  return P.res;
}
function drawPaste(){
  const out = $("#pOut"); if(!out) return;
  const { rows, bad } = pasteRows(), t = P.res.table;
  let h = `<section class="block"><h3>${esc(T.pastePreview)}</h3>`;
  if(t){
    const opt = c => `<option value="">${esc(T.pasteColNone)}</option><option value="n"${P.nameCol === c ? " selected" : ""}>${esc(T.pasteColName)}</option><option value="a"${P.amtCol === c ? " selected" : ""}>${esc(T.pasteColAmt)}</option>`;
    h += `<p class="lead">${esc(T.pasteCols)}</p><div class="pv-wrap"><table class="pv"><thead><tr>${Array.from({ length: t.width }, (_, c) => `<th><select data-c="${c}" aria-label="${c + 1}">${opt(c)}</select></th>`).join("")}</tr></thead>
      <tbody>${t.grid.slice(0, 6).map(r => `<tr>${Array.from({ length: t.width }, (_, c) => `<td class="${c === P.nameCol ? "nm" : c === P.amtCol ? "am" : ""}">${esc(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  if(rows.length){
    h += `<p class="count-line"><b>${esc(fm(T.pasteCount, { n: rows.length, amt: won(DN.stats(rows).all.amt) }))}</b></p>
      <ul class="rows" style="background:var(--paper)">${rows.slice(0, 200).map((r, i) => `<li><span class="row" style="cursor:default"><span class="r-no">${i + 1}</span><span class="r-main"><b>${esc(r.name)}</b></span><span class="r-amt">${esc(won(r.amt))}</span></span></li>`).join("")}</ul>`;
  } else if(!t) h += `<p class="empty" style="background:var(--paper)">${esc(T.pasteEmpty)}</p>`;
  if(bad.length) h += `<div class="badl"><b>${esc(fm(T.pasteBad, { n: bad.length }))}</b>${bad.slice(0, 8).map(esc).join("<br>")}${bad.length > 8 ? "<br>…" : ""}</div>`;
  if(rows.length) h += `<button class="btn main" data-a="pAdd" style="margin-top:14px">${esc(fm(T.pasteAdd, { n: rows.length }))}</button>`;
  out.innerHTML = h + `</section>`;
  $$("select[data-c]", out).forEach(sel => sel.onchange = () => {
    const c = +sel.dataset.c;
    if(sel.value === "n"){ P.nameCol = c; if(P.amtCol === c) P.amtCol = -1; }
    else if(sel.value === "a"){ P.amtCol = c; if(P.nameCol === c) P.nameCol = -1; }
    else { if(P.nameCol === c) P.nameCol = -1; if(P.amtCol === c) P.amtCol = -1; }
    drawPaste();
  });
}

// ===== 표시하기 (누구 손님 · 감사 인사 · 금액 채우기) =====
const M = { mode: "who", only: true, shown: null };
const markTodo = r => (M.mode === "who" ? !r.who : M.mode === "th" ? !r.th : r.amt == null);
// 금액 채우기의 한 줄: 아직이면 금액 버튼, 넣었으면 금액 + "고치기"
function fillLi(r){
  const head = `<span class="tag ${r.side}">${esc(sideName(r.side))}</span>${r.how === "a" ? `<em class="mk-no">${esc(T.acctTag)}</em>` : r.no ? `<em class="mk-no">${r.no}번</em>` : ""}<b${r.name ? "" : ' class="none"'}>${esc(r.name || T.noName)}</b>`;
  if(r.amt != null) return `<div class="mk-h">${head}<span class="r-amt">${esc(won(r.amt))}</span><button class="text-btn small" data-a="fillRedo" data-id="${r.id}">${esc(T.fillRedo)}</button></div>`;
  return `<div class="mk-h">${head}</div>
    <div class="quick nine">${QUICK.map(q => `<button class="qa" data-a="fillAmt" data-id="${r.id}" data-q="${q}">${q}<small>${esc(T.quickUnit)}</small></button>`).join("")}<button class="qa zero" data-a="fillAmt" data-id="${r.id}" data-q="0">${esc(T.fillEmpty)}</button></div>
    <div class="amt-row"><div class="amt-in"><input class="in sm" data-fill="${r.id}" type="text" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="${esc(T.fillDirect)}" aria-label="${esc(T.amtLabel)}"><span>${esc(T.amtUnit)}</span></div><button class="add sm" data-a="fillSet" data-id="${r.id}">${esc(T.fillSet)}</button></div>`;
}
function mark(){
  document.body.classList.remove("is-cover");
  app.className = "bk";
  const mode = M.mode, title = { who: T.markWhoTitle, th: T.markThTitle, amt: T.markAmtTitle }[mode], lead = { who: T.markWhoLead, th: T.markThLead, amt: T.markAmtLead }[mode];
  // 처음 들어올 때 보여 줄 줄을 정해 두고, 누르는 동안에는 줄이 사라지지 않게 해요 (잘못 눌러도 바로 고칠 수 있게)
  if(!M.shown) M.shown = new Set(S.rows.filter(r => !M.only || markTodo(r)).map(r => r.id));
  const rows = S.rows.filter(r => M.shown.has(r.id)).sort(byNo);
  const li = r => mode === "who"
    ? `<li class="mk-li" data-id="${r.id}"><div class="mk-h"><span class="tag ${r.side}">${esc(sideName(r.side))}</span><b>${esc(r.name || T.noName)}</b><span class="r-amt">${esc(r.amt == null ? T.noAmt : won(r.amt))}</span></div><div class="chips">${WHO.map(([k]) => `<button class="chip${r.who === k ? " on" : ""}" data-a="markWho" data-id="${r.id}" data-w="${k}" aria-pressed="${r.who === k}">${esc(whoName(r.side, k))}</button>`).join("")}</div></li>`
    : mode === "th"
    ? `<li><button class="row mk-th${r.th ? " on" : ""}" data-a="markTh" data-id="${r.id}" aria-pressed="${!!r.th}"><span class="cb${r.th ? " on" : ""}">${CHECK}</span><span class="r-main"><b>${esc(r.name || T.noName)}</b><span class="r-meta"><span class="tag ${r.side}">${esc(sideName(r.side))}</span>${r.rel ? `<span>${esc(r.rel)}</span>` : ""}</span></span><span class="r-amt">${esc(r.amt == null ? T.noAmt : won(r.amt))}</span></button></li>`
    : `<li class="mk-li" data-id="${r.id}">${fillLi(r)}</li>`;
  app.innerHTML = `${subTop(title, T.markBack)}
    <div class="bk-one">
      <p class="note small" style="margin:0 4px 10px;font-size:14px">${esc(lead)}</p>
      ${mode === "amt" ? "" : `<div class="tools" style="margin:0 0 10px"><button class="tool${M.only ? " on" : ""}" data-a="markOnly" aria-pressed="${M.only}">${esc(mode === "who" ? T.markOnlyLeft : T.markThOnly)}</button></div>`}
      <p class="count-line" id="mLeft"></p>
      ${rows.length ? `<ul class="rows mk">${rows.map(li).join("")}</ul>` : ""}
      <div id="mDone"></div>
      ${mode === "th" ? `<div class="next-box">${siteLink("thanks", "btn", esc(T.nextThanks))}</div>` : ""}
    </div>`;
  markLeft();
  window.scrollTo(0, 0);
}
function markLeft(){
  const el = $("#mLeft"); if(!el) return;
  const mode = M.mode, n = S.rows.filter(markTodo).length;
  const left = { who: T.markWhoLeft, th: T.markThLeft, amt: T.markAmtLeft }[mode], all = { who: T.markWhoAll, th: T.markThAll, amt: T.markAmtAll }[mode];
  el.innerHTML = `<b>${esc(n ? fm(left, { n }) : all)}</b>`;
  const done = $("#mDone"); if(done) done.innerHTML = mode === "amt" && !n ? `<button class="btn main" data-a="fillDone" style="margin-top:14px">${esc(T.fillDone)}</button>` : "";
}
function fillSetAmt(id, amt){
  const r = S.rows.find(x => x.id === id); if(!r) return;
  r.amt = amt; saveS();
  const li = $(`.mk-li[data-id="${id}"]`); if(li) li.innerHTML = fillLi(r);
  markLeft();
}
document.addEventListener("keydown", e => {
  const inp = e.target.closest && e.target.closest("input[data-fill]");
  if(inp && e.key === "Enter" && !e.isComposing){ e.preventDefault(); ACT.fillSet(inp); }
});

// ===== 누르는 것들 =====
const ACT = {
  start(){ inAppSheet(() => { S = MINE; if(!S.setup && !S.rows.length) setupSheet(); else go("book"); }); },
  demo(){ S = demoState(); L.only = null; go("book"); },
  demoExit(){ S = MINE; L.only = null; go("book", "replace"); },
  other(){ const sh = openSheet(`<h3>${esc(T.otherTitle)}</h3><p>${esc(T.otherBody)}</p><div class="btns"><button class="btn main" id="otLoad">${esc(T.otherLoad)}</button></div>`, T.otherTitle); sh.querySelector("#otLoad").onclick = () => closeThen(pickBackup); },
  home(){ if(history.state && history.state.sc && history.state.sc !== "home") history.back(); else go("home", "replace"); },
  back(){ history.back(); },
  tab(b){ L.only = null; go(b.dataset.t); },
  opts(){ optsSheet(); },
  side(b){ S.side = b.dataset.s; F.no = null; F.noNone = false; saveS(); setLast(null); refreshForm(); refreshBook(); },
  how(b){ F.how = b.dataset.h; refreshForm(); const n = $("#fName"); if(n) n.focus(); },
  tk(b){ F.tk = Math.max(0, Math.min(99, F.tk + +b.dataset.d)); const el = $("#fTk"); if(el) el.textContent = fm(T.tkUnit, { n: F.tk }); },
  who(b){ F.who = F.who === b.dataset.w ? "" : b.dataset.w; refreshForm(); },
  rel(b){ F.rel = F.rel === b.dataset.r ? "" : b.dataset.r; refreshForm(); },
  quick(b){ commit(+b.dataset.q * DN.MAN); },
  add(){ commit(); },
  noNameAdd(){ const h = commit.hold; if(h) commit(h.amt === null ? undefined : h.amt, { noName: true, later: h.later }); },
  noAmtAdd(){ commit(undefined, { later: true }); },
  undoLast(){ const r = LAST; if(!r) return; delRow(r.id); setLast(null); const n2 = $("#fName"); if(n2 && !n2.value) n2.value = r.name; refreshForm(); refreshBook(); toast(T.undone); if(n2) n2.focus(); },
  addLater(){ commit(undefined, { later: true }); },
  laterOff(){ S.opt.later = false; saveS(); refreshForm(); const a = $("#fName"); if(a) a.focus(); },
  fillAmt(b){ fillSetAmt(+b.dataset.id, +b.dataset.q * DN.MAN); },
  fillSet(b){ const id = +(b.dataset.id || b.dataset.fill), inp = $(`input[data-fill="${id}"]`); if(!inp) return; const v = inp.value.trim(), amt = v ? DN.parseAmt(v) : null; if(amt == null){ inp.focus(); toast(T.badAmt); return; } fillSetAmt(id, amt); },
  fillRedo(b){ fillSetAmt(+b.dataset.id, null); const inp = $(`input[data-fill="${b.dataset.id}"]`); if(inp) inp.focus(); },
  fillDone(){ go("sum", "replace"); },
  setNo(){ noSheet(); },
  edit(b){ editSheet(+b.dataset.id); },
  paste(){ P.side = S.side; P.res = null; P.text = ""; go("paste"); },
  pRead(){ P.text = $("#pText").value; P.res = DN.parsePaste(P.text); if(P.res.table){ P.nameCol = P.res.table.guess.name; P.amtCol = P.res.table.guess.amt; } drawPaste(); const o = $("#pOut"); if(o) o.scrollIntoView({ behavior: "smooth", block: "start" }); },
  pAdd(){
    const { rows } = pasteRows(); if(!rows.length) return;
    const keep = S.side; S.side = P.side;
    for(const r of rows) addRow({ side: P.side, how: P.how, no: P.how === "c" && S.opt.no ? nextNo(P.side) : null, name: r.name, amt: r.amt, tk: P.how === "c" && S.opt.tk ? (r.tk != null ? r.tk : 1) : 0 });
    S.side = P.side; saveS();
    const n = rows.length; P.res = null; P.text = "";
    history.back(); setTimeout(() => toast(fm(T.pasteAdded, { side: sideName(P.side), n })), 80);
  },
  lside(b){ L.side = b.dataset.k; list(); },
  lf(b){ L.f = L.f === b.dataset.k ? "all" : b.dataset.k; list(); },
  sort(){ L.sort = SORTS[(SORTS.indexOf(L.sort) + 1) % SORTS.length]; list(); },
  onlyClear(){ L.only = null; list(); },
  ckSee(b){ L.only = { ids: b.dataset.ids.split(",").map(Number), what: b.dataset.what }; go("list", "push"); },   // 뒤로 가기 = 정산으로
  gapGo(b){ const side = b.dataset.s, g = getChecks().gaps[side]; if(!g.length) return; S.side = side; F.how = "c"; F.no = g[0]; saveS(); go("book"); },
  gapSkip(b){ const side = b.dataset.s, g = getChecks().gaps[side]; if(!g.length) return; S.skip[side] = [...new Set([...(S.skip[side] || []), ...g])]; saveS(); sum(); toast(fm(T.ckSkipDone, { side: sideName(side), list: DN.ranges(g) })); },
  xlsx(){ saveXlsx(); },
  img(){ saveImage(); },
  text(){ textSheet(); },
  print(){ printDoc(); },
  backup(){ saveBackup(); },
  load(){ pickBackup(); },
  mark(b){ M.mode = b.dataset.m; M.only = true; M.shown = null; go("mark"); },   // who 누구 손님 · th 감사 인사 · amt 금액 채우기
  markOnly(){ M.only = !M.only; M.shown = null; mark(); },
  markWho(b){ const r = S.rows.find(x => x.id === +b.dataset.id); if(!r) return; r.who = r.who === b.dataset.w ? "" : b.dataset.w; saveS(); $$(`.mk-li[data-id="${r.id}"] .chip`).forEach(c => { const on = c.dataset.w === r.who; c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); }); markLeft(); },
  markTh(b){ const r = S.rows.find(x => x.id === +b.dataset.id); if(!r) return; r.th = r.th ? 0 : 1; saveS(); b.classList.toggle("on", !!r.th); b.setAttribute("aria-pressed", String(!!r.th)); $(".cb", b).classList.toggle("on", !!r.th); markLeft(); }
};
document.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if(!b || b.disabled) return; const fn = ACT[b.dataset.a]; if(fn) fn(b, e); });
// 금액 버튼 · 식권 버튼을 눌러도 이름 칸의 커서(자판)가 그대로 있게
document.addEventListener("mousedown", e => { if(e.target.closest("[data-keep]")) e.preventDefault(); });
// 폰에서 적는 동안에는 아래 탭을 숨기고 적는 칸을 화면 위로 올려요 (자판 위 좁은 자리를 금액 버튼에 내줘요).
// 다시 나오는 때: 다른 곳을 누르거나, 자판을 내리거나(안드로이드 뒤로 가기는 커서가 그대로 남아서 화면 높이로 알아채요), 커서가 칸을 떠날 때.
const inForm = el => !!(el && el.closest && el.closest("#form input"));
const setTyping = on => document.body.classList.toggle("typing", !!on && matchMedia("(pointer:coarse)").matches);
document.addEventListener("focusin", e => { if(inForm(e.target)) setTyping(true); });
document.addEventListener("focusout", () => setTimeout(() => { if(!inForm(document.activeElement)) setTyping(false); }, 150));
document.addEventListener("pointerdown", e => { const t = e.target; if(!t || !t.closest) return; if(t.closest("#form")){ if(inForm(t)) setTyping(true); } else if(!t.closest("#toast")) setTyping(false); });
if(window.visualViewport){
  let kbSeen = false;
  window.visualViewport.addEventListener("resize", () => {
    const open = window.visualViewport.height < window.innerHeight - 120;
    if(open) kbSeen = true; else if(kbSeen){ kbSeen = false; setTyping(false); }
  });
}

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
  go("home", "replace");
}
route();
window.__dn = { get S(){ return S; }, get MINE(){ return MINE; }, F, L, P, M };   // 화면 흐름 시험용
