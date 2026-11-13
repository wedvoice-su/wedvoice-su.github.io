// 결혼 준비 체크리스트: 예식일 + 우리 상황 → 우리에게 해당하는 일만 남은 시기별 지도와 체크리스트
// 기획 docs/결혼준비-체크리스트/기획.md · 화면 문구 docs/결혼준비-체크리스트/문구/0-화면.txt
// 데이터 data.js (docs/결혼준비-체크리스트/도구/build_data.py가 문구 txt에서 만듦 — 손으로 고치지 않아요) · 공통 기능 shared/common.js
// 고른 것과 체크는 이 폰(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/ready-to-wed/?preview)
const OPEN = false;
// =========================================================

// ===== 화면 문구 (0-화면.txt) =====
const NAME = "결혼 준비 체크리스트";
const KEY = "readyToWed.v1";
const CHECKED_TEXT = "2026년 11월";
const KAKAO = CL.kakao;
const SIT_Q = {
  trip: { t: "신혼여행은요?", o: [["abroad", "해외"], ["domestic", "국내"], ["none", "안 가요·미정"]] },
  when: { t: "언제 떠나요?", o: [["next", "식 다음 날"], ["same", "식 당일"], ["date", "며칠 뒤 — 날짜 넣기"], ["unknown", "아직 몰라요"]] },
  home: { t: "신혼집은요?", o: [["jeonse", "전세"], ["wolse", "월세"], ["buy", "매매"], ["apply", "청약 기다림"], ["have", "이미 살 집 있음"], ["undecided", "미정"]] },
  move: { t: "입주일은요?", o: [["date", "날짜 넣기"], ["after", "식 뒤에 들어가요"], ["unknown", "아직 몰라요"]] },
  loan: { t: "집 대출을 받나요?", o: [["yes", "받아요"], ["no", "안 받아요"], ["undecided", "미정"]] },
  job: { t: "직장에 다니나요?", o: [["both", "둘 다"], ["one", "한 명"], ["none", "아니에요"]] }
};
const ANS = {
  opt: [["yes", "할래요"], ["no", "안 해요"], ["und", "미정"]],
  ask: [["yes", "해당돼요"], ["no", "아니에요"]]
};
const BASE_TAG = { h: "입주일 기준", t: "출발일 기준" };
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// ===== 저장 =====
let canStore = true;
try { localStorage.setItem(KEY + ".t", "1"); localStorage.removeItem(KEY + ".t"); } catch (e) { canStore = false; }
function blank(){ return { v: 1, w: "", sit: {}, a: {}, done: {}, miss: {}, seen: {}, asked: {}, past: {}, saved: 0, noted: 0 }; }
function loadS(){ try { const x = JSON.parse(localStorage.getItem(KEY)); return x && x.v === 1 ? Object.assign(blank(), x) : null; } catch (e) { return null; } }
let S = loadS() || blank();
function saveS(){ S.saved = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { canStore = false; } }
function hasSaved(){ return !!(S.w && S.saved); }

// ===== 날짜 =====
const MS = 864e5;
function today(){ const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function pd(s){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function add(d, n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function diff(a, b){ return Math.round((a - b) / MS); }          // a - b (일)
function md(d){ return `${d.getMonth() + 1}월 ${d.getDate()}일`; }
function mdY(d){ return d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ${md(d)}` : md(d); }   // 올해가 아니면 연도도
function full(d){ return `${d.getFullYear()}년 ${md(d)} (${DOW[d.getDay()]})`; }
function stamp(t){ const d = new Date(t); return `${md(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function W(){ return pd(S.w); }
// 입주일·출발일: 모르면 예식일로 기본값 (기획 6절: 입주 D-45 · 출발 다음 날)
function homeDate(){
  const w = W(), s = S.sit;
  if(s.move === "date" && pd(s.hdate)) return { d: pd(s.hdate), guess: false };
  if(s.move === "after") return { d: add(w, 30), guess: true };
  return { d: add(w, -45), guess: s.home !== "have" };
}
function tripDate(){
  const w = W(), s = S.sit;
  if(s.when === "same") return { d: w, guess: false };
  if(s.when === "next") return { d: add(w, 1), guess: false };
  if(s.when === "date" && pd(s.tdate)) return { d: pd(s.tdate), guess: false };
  return { d: add(w, 1), guess: true };
}
// 예식까지 남은 날 → 시기 (1 D-1년 · 2 D-6달 · 3 D-1달 · 4 D-7 · 5 D-1 · 6 D-day · 7 식 후)
function periodOfDays(n){ return n >= 181 ? 1 : n >= 31 ? 2 : n >= 8 ? 3 : n >= 2 ? 4 : n === 1 ? 5 : n === 0 ? 6 : 7; }
function curPeriod(){ return periodOfDays(diff(W(), today())); }
const PNAME = Object.fromEntries(CL.periods.map(p => [p[0], p[1]]));
const PDESC = Object.fromEntries(CL.periods.map(p => [p[0], p[2]]));
const PSTART = { 1: -365, 2: -180, 3: -30, 4: -7, 5: -1, 6: 0, 7: 1 };   // 시기가 시작되는 날 (달력 알림)

// ===== 카드 =====
const ITEMS = CL.items;
const BY = Object.fromEntries(ITEMS.map(i => [i.n, i]));
function dates(it){
  if(!it.b) return null;
  const base = it.b === "h" ? homeDate() : it.b === "t" ? tripDate() : { d: W(), guess: false };
  return { s: add(base.d, it.s), d: add(base.d, it.d), guess: base.guess, b: it.b };
}
function periodOf(it){ const x = dates(it); return x ? periodOfDays(diff(W(), x.d)) : it.p; }
function sitVal(k){
  const s = S.sit;
  if(k === "loan" && s.home === "have") return "no";
  if(k === "when" && s.trip === "none") return "";
  return s[k] || "";
}
function taxOk(){
  // 혼인신고 날짜를 대충 잡아서(식 전이면 예식 30일 전, 아니면 예식 14일 뒤) 지금 법의 대상 기간 안인지 봐요
  const w = W(), est = S.a["2-14"] === "before" ? add(w, -30) : add(w, 14);
  return est <= pd(CL.taxEnd);
}
function clause(cl){
  if(cl === "tax") return taxOk();
  if(cl.startsWith("or:")) return cl.slice(3).split("|").some(clause);
  let m = /^a:(\d-\d\d)(!?=)(.+)$/.exec(cl);
  if(m){ const v = S.a[m[1]], l = m[3].split(","); return m[2] === "=" ? l.includes(v) : !l.includes(v); }
  m = /^(\w+)(!?=)(.+)$/.exec(cl);
  if(m){ const v = sitVal(m[1]), l = m[3].split(","); return m[2] === "=" ? l.includes(v) : !l.includes(v); }
  return true;
}
function condOk(it){ return it.c.every(clause); }
// in: 할 일 · und: 미정(아직 정할 것) · q: 아직 안 물어본 것 · out: 빠짐
function status(it){
  if(it.k === "hide" || !condOk(it)) return "out";
  const v = S.a[it.n];
  if(v === "no") return "out";
  if(it.k === "opt" || it.k === "ask") return v === undefined ? "q" : v === "und" ? "und" : "in";
  if(it.k === "choice" && v === "und") return "und";
  return "in";
}
function shown(it){ const s = status(it); return s === "in" || s === "und"; }
function itemsIn(p){ return ITEMS.filter(it => periodOf(it) === p); }
function opened(p){ return p <= curPeriod() || !!S.asked[p]; }
function isLate(it){ const x = dates(it); return !!x && diff(today(), x.d) > 0; }
// 지금 시기 안에서 마감이 이미 지난 일 (늦게 시작한 커플: 질문 대신 "하셨어요?"로 물어요)
function lateItems(){ const c = curPeriod(); return itemsIn(c).filter(it => isLate(it) && status(it) !== "out"); }
// 질문 카드가 필요한가
function needsQ(it){
  if(it.k === "hide" || !condOk(it)) return false;
  if(it.k === "opt" || it.k === "ask" || it.k === "choice") return S.a[it.n] === undefined;
  if(it.k === "def") return !S.seen[it.n] && S.a[it.n] === undefined;
  return false;
}

// ===== 작은 도구 =====
function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function chk(on){ return `<span class="cb${on ? " on" : ""}" aria-hidden="true">${CHECK}</span>`; }
function toast(text){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = text; el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600);
}
function dday(n){ return n > 0 ? `D-${n}` : n === 0 ? "D-day" : `D+${-n}`; }
function inApp(){
  const ua = navigator.userAgent || "";
  if(/Instagram/i.test(ua)) return "인스타그램";
  if(/KAKAOTALK/i.test(ua)) return "카카오톡";
  if(/NAVER\(inapp/i.test(ua)) return "네이버";
  if(/FBAN|FBAV/i.test(ua)) return "페이스북";
  if(/ Line\//i.test(ua)) return "라인";
  return "";
}
const ANDROID = /Android/i.test(navigator.userAgent || "");
const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ===== 화면 이동 (휴대폰 뒤로 가기 = 이전 단계) =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
const SCREENS = { home: () => home(), date: () => stepDate(), sit: () => stepSit(), past: () => stepPast(), q: () => stepQ(), result: () => result() };
function show(sc){
  closeSheet();
  if(!SCREENS[sc]) sc = "home";
  if(sc !== "home" && sc !== "date" && !W()) sc = "home";
  if(sc === "q" && !flow) sc = W() ? "result" : "home";
  if(sc === "past" && !pastRun){ const pq = W() ? pastQueue() : []; if(pq.length) pastRun = { list: pq, i: 0, one: null }; else sc = W() ? "sit" : "home"; }
  SCREENS[sc]();
}
function go(sc, how){
  const st = { sc, back: how !== "replace" };
  how === "replace" ? history.replaceState(st, "") : history.pushState(st, "");
  show(sc);
}
function goBack(prev){ if(history.state && history.state.back) history.back(); else go(prev, "replace"); }
let skipPop = false, afterPop = null;
window.addEventListener("popstate", e => {
  const st = e.state;
  if(skipPop){ skipPop = false; return; }
  if(afterPop){ const f = afterPop; afterPop = null; closeSheet(); f(); return; }   // 창을 닫고 다음 화면으로 (closeThen)
  if(document.getElementById("sheet")){ closeSheet(); return; }
  if(st && st.sheet){ skipPop = true; history.back(); return; }
  if(st && st.sc) show(st.sc);
});

// ===== 아래에서 올라오는 창 =====
function openSheet(html, label, opts){
  const had = !!document.getElementById("sheet");
  closeSheet();
  const tt = document.getElementById("toast"); if(tt) tt.classList.remove("on");
  if(!had) history.pushState(Object.assign({}, history.state, { sheet: true }), "");
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label || "설명");
  sh.innerHTML = html + (opts && opts.noClose ? "" : `<div class="sheet-x"><button class="btn ghost" id="sheetX">${(opts && opts.close) || "닫기"}</button></div>`);
  document.body.appendChild(bg); document.body.appendChild(sh);
  bg.onclick = opts && opts.noClose ? null : dismissSheet;
  const x = document.getElementById("sheetX"); if(x) x.onclick = dismissSheet;
  sh.scrollTop = 0;
  (x || sh.querySelector("button")).focus({ preventScroll: true });
  return sh;
}
function closeSheet(){ ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); }); }
function dismissSheet(){ if(history.state && history.state.sheet) history.back(); else closeSheet(); }
// 창을 닫은 뒤 다른 화면으로 갈 때: 창 기록을 먼저 되돌리고(비동기) 그다음에 이동해요
function closeThen(f){ if(history.state && history.state.sheet){ afterPop = f; history.back(); } else { closeSheet(); f(); } }
document.addEventListener("keydown", e => { if(e.key === "Escape" && document.getElementById("sheet")) dismissSheet(); });

// 처음 답할 때 한 번: 저장 안내 (0-화면 58)
function firstNote(then){
  if(S.noted){ then(); return; }
  S.noted = 1; saveS();
  const sh = openSheet(`<h3>이 폰에만 저장돼요</h3><p>고른 건 이 휴대폰의 이 브라우저에만 저장돼요. 다른 폰이나 다른 앱에서 보려면 결과 화면의 "내 체크리스트 링크"를 카톡 나와의 채팅에 보내 두세요.</p>`, "저장 안내", { close: "알겠어요" });
  const x = sh.querySelector("#sheetX"); x.onclick = () => closeThen(then);
}
// 인스타·카톡 안에서 열었을 때 (0-화면 59)
function inAppSheet(then){
  const ia = inApp();
  if(!ia || inAppSheet.ok){ then(); return; }
  const app2 = ANDROID ? "크롬" : "사파리", kakao = ia === "카카오톡";
  const intent = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
  const sh = openSheet(`<h3>${esc(app2)}에서 열어 주세요</h3>
    <p>${esc(ia)} 안에서는 고른 게 ${esc(app2)}로 넘어가지 않아요. ${esc(app2)}에서 열고 시작해 주세요.</p>
    <div class="btns">
      ${ANDROID ? `<a class="btn main" href="${esc(intent)}">크롬에서 열기</a>` : kakao ? `<a class="btn main" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">사파리에서 열기</a>` : ""}
      <button class="btn ${ANDROID || kakao ? "ghost" : "main"}" id="iaCopy">링크 복사하기</button>
      <button class="text-btn" id="iaStay">여기서 그냥 할게요</button>
    </div>
    ${!ANDROID && !kakao ? `<p class="note small">화면 위 ⋯ 를 누르고 '외부 브라우저에서 열기'를 누르거나, 링크를 복사해서 사파리에 붙여 넣어 주세요.</p>` : ""}
    <p class="msg" id="iaMsg" role="status"></p>`, "브라우저 안내", { noClose: true });
  sh.querySelector("#iaCopy").onclick = async () => {
    const m = sh.querySelector("#iaMsg");
    try { await navigator.clipboard.writeText(location.href); m.textContent = "링크를 복사했어요. 사파리 주소창에 붙여 넣어 주세요."; } catch (e) { m.textContent = location.href; }
  };
  sh.querySelector("#iaStay").onclick = () => { inAppSheet.ok = true; closeThen(then); };
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  const saved = hasSaved();
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>전부 무료</span></div>
    ${brandLogo()}
    <p class="for">결혼 준비하는 예비부부를 위한</p>
    <h1>결혼 준비,<br>뭐부터 하죠?</h1>
    <div class="bar"></div>
    <p class="lead">예식일을 넣고 질문에 답하면, 우리에게 해당하는 일만 남은 시기별 체크리스트가 완성돼요.</p>
    <div class="pick">
      ${saved ? `<button id="resume"><span>이어서 보기</span><span class="q">마지막 저장 ${esc(stamp(S.saved))}</span></button>` : ""}
      <button id="start"><span>${saved ? "처음부터 새로 만들기" : "내 체크리스트 만들기"}</span><span class="q">3분</span></button>
    </div>
    ${!saved ? `<button class="text-btn cover-link" id="other">다른 폰·브라우저에서 만들었나요?</button>` : ""}
    <p class="note">결혼식·신혼여행·신혼집·행정까지 140가지 넘는 일을 시기별로 정리했어요. ${CHECKED_TEXT} 조사.</p>
    ${!canStore ? `<p class="note warn-note">여기서는 창을 닫으면 사라져요. 결과 화면의 "내 체크리스트 링크"로 보관하세요.</p>` : ""}
    ${foot()}`;
  document.getElementById("start").onclick = () => {
    if(saved){ confirmReset(() => { S = blank(); go("date"); }); return; }
    go("date");
  };
  const r = document.getElementById("resume"); if(r) r.onclick = () => resume();
  const o = document.getElementById("other"); if(o) o.onclick = () => openSheet(`<h3>저장된 체크리스트가 없어요</h3><p>이 브라우저엔 저장된 체크리스트가 없어요. 다른 브라우저에서 만드셨다면, 그쪽에서 "내 체크리스트 링크"를 보내서 열어 주세요.</p>`, "안내", { close: "처음 시작하기" });
}
function confirmReset(then){
  const sh = openSheet(`<h3>처음부터 새로 만들까요?</h3><p>지금 이 폰에 있는 체크리스트(고른 것과 체크)는 사라져요. 남겨 두려면 먼저 "내 체크리스트 링크"를 보내 두세요.</p>
    <div class="btns"><button class="btn main" id="rsYes">새로 만들기</button></div>`, "새로 만들기", { close: "그대로 두기" });
  sh.querySelector("#rsYes").onclick = () => { closeSheet(); history.replaceState({ sc: "home", back: false }, ""); then(); };
}

// ===== 1. 예식일 =====
function stepHead(left, title, sub){
  return `<div class="top"><button class="text-btn back" id="back" aria-label="이전 단계로">← 이전</button><span class="count">${left || ""}</span></div>
    <h2 class="q-title">${title}</h2>${sub ? `<p class="q-sub">${sub}</p>` : ""}`;
}
function stepDate(){
  plain();
  const t = today(), max = add(t, 365 * 3);
  app.innerHTML = `${stepHead("예식일", "예식일이<br>언제예요?", "예식일을 기준으로 할 일마다 실제 날짜를 붙여 드려요.")}
    <div class="panel">
      <label class="lbl" for="wd">예식일</label>
      <input class="in date" type="date" id="wd" value="${esc(S.w)}" max="${ymd(max)}">
      <p class="dd" id="dd" aria-live="polite"></p>
    </div>
    <div id="pastBox"></div>
    <p class="msg" id="msg"></p>
    <div class="btns sticky-go"><button class="btn main" id="next">다음</button></div>`;
  const inp = document.getElementById("wd"), dd = document.getElementById("dd"), pb = document.getElementById("pastBox");
  const paint = () => {
    const d = pd(inp.value); pb.innerHTML = ""; document.getElementById("msg").textContent = "";
    if(!d){ dd.textContent = ""; return; }
    const n = diff(d, t);
    if(n < 0){
      dd.textContent = "";
      pb.innerHTML = `<div class="callout"><p>이미 지난 날짜예요. 식 뒤에 할 일(부록)만 보여 드릴까요?</p><div class="btn-row"><button class="btn main" id="afterOnly">부록 보기</button><button class="btn ghost" id="again">날짜 다시 넣기</button></div></div>`;
      document.getElementById("afterOnly").onclick = () => setWedding(d, true);
      document.getElementById("again").onclick = () => { inp.value = ""; paint(); inp.focus(); };
      return;
    }
    dd.innerHTML = `오늘은 <b>${dday(n)}</b> · 지금은 <b>"${PNAME[periodOfDays(n)]}"</b> 시기예요`;
  };
  inp.oninput = paint; inp.onchange = paint; paint();
  document.getElementById("back").onclick = () => goBack("home");
  document.getElementById("next").onclick = () => {
    const d = pd(inp.value);
    if(!d){ document.getElementById("msg").textContent = "예식일을 넣어 주세요."; return; }
    if(diff(d, t) < 0){ paint(); return; }
    inAppSheet(() => setWedding(d, false));
  };
}
function setWedding(d, afterOnly){
  const changed = S.w && S.w !== ymd(d);
  S.w = ymd(d);
  if(changed){ S.asked = {}; S.past = {}; }   // 예식일이 바뀌면 시기를 다시 물어요 (답과 체크는 그대로)
  if(afterOnly){ for(let p = 1; p <= 6; p++) S.past[p] = 1; }
  saveS();
  go(afterOnly ? "result" : "sit");
}

// ===== 2. 우리 상황 =====
function stepSit(){
  plain();
  const s = S.sit;
  const seg = (k, wide) => `<div class="chips${wide ? " wide" : ""}" role="radiogroup" aria-label="${esc(SIT_Q[k].t)}">${SIT_Q[k].o.map(([v, l]) => `<button class="chip${s[k] === v ? " on" : ""}" data-k="${k}" data-v="${v}" role="radio" aria-checked="${s[k] === v}">${esc(l)}</button>`).join("")}</div>`;
  const draw = () => {
    const t = today();
    app.innerHTML = `${stepHead("우리 상황", "우리 상황을<br>골라 주세요", "해당 없는 일은 빼고 보여 드릴게요. 4가지만 골라 주세요.")}
      <div class="sitq"><p class="sq-t"><span class="sq-n">1</span>${SIT_Q.trip.t}</p>${seg("trip")}
        ${s.trip && s.trip !== "none" ? `<div class="follow"><p class="sq-f">${SIT_Q.when.t}</p>${seg("when", true)}
          ${s.when === "date" ? `<input class="in date" type="date" id="td" value="${esc(s.tdate || "")}" min="${esc(S.w)}" aria-label="신혼여행 출발일">` : ""}</div>` : ""}
      </div>
      <div class="sitq"><p class="sq-t"><span class="sq-n">2</span>${SIT_Q.home.t}</p>${seg("home")}
        ${["jeonse", "wolse", "buy"].includes(s.home) ? `<div class="follow"><p class="sq-f">${SIT_Q.move.t}</p>${seg("move", true)}
          ${s.move === "date" ? `<input class="in date" type="date" id="hd" value="${esc(s.hdate || "")}" min="${ymd(t)}" aria-label="신혼집 입주일">` : ""}</div>` : ""}
      </div>
      ${s.home !== "have" ? `<div class="sitq"><p class="sq-t"><span class="sq-n">3</span>${SIT_Q.loan.t}</p>${seg("loan")}</div>` : ""}
      <div class="sitq"><p class="sq-t"><span class="sq-n">${s.home !== "have" ? 4 : 3}</span>${SIT_Q.job.t}</p>${seg("job")}</div>
      <p class="note small">"아직 몰라요·미정"을 골라도 돼요. 정해지면 언제든 바꿀 수 있어요. 그동안은 예식일 기준으로 날짜를 잡아 둘게요.</p>
      <p class="msg" id="msg"></p>
      <div class="btns sticky-go"><button class="btn main" id="next">다음</button></div>`;
    document.getElementById("back").onclick = () => goBack("date");
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      s[k] = v;
      if(k === "trip" && v === "none"){ delete s.when; delete s.tdate; }
      if(k === "home" && !["jeonse", "wolse", "buy"].includes(v)){ delete s.move; delete s.hdate; }
      if(k === "home" && v === "have") delete s.loan;
      saveS(); const y = window.scrollY; draw(); window.scrollTo(0, y);
      if(v === "date"){ const el = document.getElementById(k === "when" ? "td" : "hd"); if(el) el.focus(); }
    });
    const td = document.getElementById("td"); if(td) td.onchange = () => { s.tdate = td.value; saveS(); };
    const hd = document.getElementById("hd"); if(hd) hd.onchange = () => { s.hdate = hd.value; saveS(); };
    document.getElementById("next").onclick = () => {
      const msg = document.getElementById("msg");
      const need = ["trip", "home", "job"].concat(s.home !== "have" ? ["loan"] : []).concat(s.trip && s.trip !== "none" ? ["when"] : []).concat(["jeonse", "wolse", "buy"].includes(s.home) ? ["move"] : []);
      const miss = need.filter(k => !s[k]);
      if(miss.length){ msg.textContent = `"${SIT_Q[miss[0]].t}"를 골라 주세요.`; return; }
      if(s.when === "date" && !pd(s.tdate)){ msg.textContent = "신혼여행 출발일을 넣어 주세요."; return; }
      if(s.move === "date" && !pd(s.hdate)){ msg.textContent = "입주일을 넣어 주세요."; return; }
      saveS();
      firstNote(() => afterSit());
    };
  };
  draw();
}
function afterSit(){
  if(pastQueue().length){ pastRun = { list: pastQueue(), i: 0, one: null }; go("past"); return; }
  startQ(curPeriod(), true);
}

// ===== 3. 지난 시기 점검 =====
let pastRun = null;   // { list: [시기…], i, one: { list:[n…], j } }
function pastQueue(){
  const c = curPeriod(), out = [];
  for(let p = 1; p < c && p < 7; p++) if(!S.asked[p] && !S.past[p] && pastItems(p).length) out.push(p);
  if(c < 7 && !S.asked[c] && !S.past["L" + c] && lateItems().length) out.push("L");
  return out;
}
function pastItems(p){ return p === "L" ? lateItems() : itemsIn(p).filter(it => status(it) !== "out"); }
function pastKey(p){ return p === "L" ? "L" + curPeriod() : p; }
function pastName(p){ return p === "L" ? "기한 지난 일" : PNAME[p]; }
// "다 했어요"로 체크할 일: 꼭 하는 일 · 해당돼서 들어간 일 (선택은 '하나씩'에서)
function pastMain(p){ return pastItems(p).filter(it => !["q"].includes(status(it))); }
function stepPast(){
  plain();
  const p = pastRun.list[pastRun.i];
  if(p === undefined){ pastRun = null; startQ(curPeriod(), true, "replace"); return; }
  if(pastRun.one) return stepPastOne(p);
  const main = pastMain(p), qs = pastItems(p).filter(it => status(it) === "q");
  const title = p === "L" ? `기한이 지난 일 ${main.length}개,<br>다 하셨어요?` : `${PNAME[p]} 할 일 ${main.length}개,<br>다 하셨어요?`;
  const sub = p === "L" ? `지금 시기(${PNAME[curPeriod()]}) 안에서 마감이 이미 지난 일이에요` : `빠진 것 없나 빠르게 볼게요 · ${esc(PDESC[p])}`;
  app.innerHTML = `${stepHead(`${pastRun.i + 1} / ${pastRun.list.length}`, title, sub)}
    <ul class="names">${main.map(it => `<li>${esc(it.name)}</li>`).join("")}</ul>
    ${qs.length ? `<p class="note small">할지 말지 고르는 일 ${qs.length}개는 '하나씩 볼게요'에서 볼 수 있어요.</p>` : ""}
    <div class="btns sticky-go">
      <button class="btn main" id="allDone">다 했어요</button>
      <button class="btn ghost" id="oneByOne">하나씩 볼게요</button>
    </div>`;
  document.getElementById("back").onclick = () => goBack("sit");
  document.getElementById("allDone").onclick = () => {
    main.forEach(it => { S.done[it.n] = 1; delete S.miss[it.n]; });
    S.past[pastKey(p)] = 1; saveS(); pastRun.i++; go("past");
  };
  document.getElementById("oneByOne").onclick = () => { pastRun.one = { list: pastItems(p).map(it => it.n), j: 0 }; go("past"); };
}
function stepPastOne(p){
  const one = pastRun.one, n = one.list[one.j];
  if(n === undefined){
    if(pastRun.back){ pastRun = null; history.replaceState({ sc: "result", back: false }, ""); result(p === "L" ? curPeriod() : p); return; }
    S.past[pastKey(p)] = 1; saveS(); pastRun.one = null; pastRun.i++; go("past", "replace"); return;
  }
  const it = BY[n], cur = S.done[n] ? "done" : S.miss[n] ? "miss" : S.a[n] === "no" ? "no" : "";
  app.innerHTML = `${stepHead(`${pastName(p)} · ${one.j + 1} / ${one.list.length}`, esc(it.name), "")}
    <p class="q-due">${esc(dueText(it))}${tagHtml(it)}</p>
    ${it.desc ? `<p class="q-desc">${esc(it.desc)}</p>` : ""}
    ${detailHtml(it, { compact: true })}
    <div class="answers3">${[["done", "했어요"], ["miss", "아직"], ["no", "안 해요"]].map(([v, l]) => `<button class="ans${cur === v ? " on" : ""}" data-v="${v}">${l}</button>`).join("")}</div>
    <p class="note small">"아직"을 고르면 결과 화면의 "기한이 지난 일"에 모여요. "안 해요"는 목록에서 빠져요.</p>`;
  bindDetail(it);
  document.getElementById("back").onclick = () => {
    if(one.j > 0){ one.j--; stepPastOne(p); window.scrollTo(0, 0); return; }
    if(pastRun.back){ pastRun = null; goBack("result"); return; }
    pastRun.one = null; stepPast();
  };
  app.querySelectorAll(".ans").forEach(b => b.onclick = () => {
    const v = b.dataset.v;
    delete S.done[n]; delete S.miss[n];
    if(v === "no") S.a[n] = "no";
    else { if(S.a[n] === "no" || S.a[n] === undefined || S.a[n] === "und"){ if(it.k === "opt" || it.k === "ask") S.a[n] = "yes"; else delete S.a[n]; } if(v === "done") S.done[n] = 1; else S.miss[n] = 1; }
    saveS(); one.j++; stepPastOne(p); window.scrollTo(0, 0);
  });
}

// ===== 4. 지금 시기 질문 (카드 한 장에 하나) =====
let flow = null;   // { p, hist:[답한 카드…], redo: 다시 보는 카드, fwd:[이전으로 돌아가며 지나친 카드…], first: 처음 만들 때인지 }
function startQ(p, first, how){
  flow = { p, hist: [], redo: null, fwd: [], first: !!first };
  if(!nextQ()){ finishQ(); return; }
  go("q", how);
}
function askable(it){ return needsQ(it) && !isLate(it); }   // 마감이 지난 일은 질문 대신 "하셨어요?"로
function nextQ(){
  if(flow.redo) return BY[flow.redo];
  return itemsIn(flow.p).find(it => askable(it) && !flow.hist.includes(it.n) && !flow.fwd.includes(it.n)) || null;
}
function qTotal(){ return flow.hist.length + (flow.redo ? 1 : 0) + flow.fwd.length + itemsIn(flow.p).filter(it => askable(it) && !flow.hist.includes(it.n) && !flow.fwd.includes(it.n) && it.n !== flow.redo).length; }
function subRange(it){
  if(periodOf(it) !== 2) return "";
  const x = dates(it); if(!x) return "";
  const n = diff(W(), x.d);
  return n >= 121 ? "6~4달 전" : n >= 61 ? "4~2달 전" : "2~1달 전";
}
function dueText(it){
  const x = dates(it);
  if(!x) return it.when || "";
  const late = diff(today(), x.d);
  return `${mdY(x.d)}까지${late > 0 ? ` · ${late}일 지남` : ""}`;
}
function spanText(it){
  const x = dates(it); if(!x) return it.when || "";
  const late = diff(today(), x.d);
  return `${x.s < x.d ? `${mdY(x.s)} ~ ` : ""}${mdY(x.d)}${late > 0 ? ` · ${late}일 지남` : ""}`;
}
function stepQ(){
  plain();
  const it = nextQ();
  if(!it){ finishQ(); return; }
  const p = flow.p, idx = flow.hist.length + 1, tot = qTotal();
  const mustN = itemsIn(p).filter(x => ["must", "auto"].includes(x.k) && status(x) === "in").length;
  const v = S.a[it.n];
  const opts = it.k === "choice" ? it.choices : it.k === "def" ? null : ANS[it.k];
  const sub = subRange(it);
  app.innerHTML = `
    <div class="top"><button class="text-btn back" id="back" aria-label="이전 질문으로">← 이전</button><span class="count">${idx} / ${tot} · ${PNAME[p]}${sub ? ` · ${sub}` : ""}</span></div>
    <div class="qcard">
      <h2 class="q-title">${esc(it.name)}</h2>
      <p class="q-due">${esc(dueText(it))}${tagHtml(it)}</p>
      <p class="q-desc">${esc(it.desc || "")}</p>
      ${it.who ? `<p class="q-who">${esc(it.who)}</p>` : ""}
      ${it.yes || it.no ? `<div class="yn">${it.yes ? `<p><b>하면</b><span>${esc(it.yes)}</span></p>` : ""}${it.no ? `<p><b>안 하면</b><span>${esc(it.no)}</span></p>` : ""}</div>` : ""}
      <details class="more-d"><summary>옵션 · 팁 더 보기</summary>${detailHtml(it, { noDesc: true, noYn: true })}</details>
    </div>
    ${opts ? `<div class="answers3${opts.length > 3 ? " four" : ""}">${opts.map(([val, l]) => `<button class="ans${v === val ? " on" : ""}" data-v="${val}">${esc(l)}</button>`).join("")}</div>`
      : `<div class="btns"><button class="btn main" id="keep">목록에 넣어 둘게요</button><button class="text-btn" id="notMe">해당 없어요</button></div>`}
    <div class="under">
      ${it.k === "def" ? "<span></span>" : `<button class="text-btn" id="skip">건너뛰기 (미정)</button>`}
      ${tot - idx >= 3 ? `<button class="text-btn" id="later">나머지는 나중에 고를게요</button>` : ""}
    </div>
    ${mustN ? `<p class="note small">꼭 하는 일 ${mustN}개는 묻지 않고 바로 목록에 넣었어요.</p>` : ""}`;
  bindDetail(it);
  document.getElementById("back").onclick = () => {
    if(!flow.hist.length){ flow.redo = null; flow.fwd = []; goBack(flow.first ? "sit" : "result"); return; }
    if(flow.redo) flow.fwd.push(flow.redo);
    flow.redo = flow.hist.pop();
    stepQ(); window.scrollTo(0, 0);
  };
  const answer = val => {
    if(val === null){ delete S.a[it.n]; S.seen[it.n] = 1; }
    else S.a[it.n] = val;
    if(it.k === "def") S.seen[it.n] = 1;
    saveS();
    flow.hist.push(it.n);
    flow.redo = null;
    while(flow.fwd.length){ const n = flow.fwd.pop(); if(condOk(BY[n])){ flow.redo = n; break; } }
    stepQ(); window.scrollTo(0, 0);
  };
  app.querySelectorAll(".ans").forEach(b => b.onclick = () => answer(b.dataset.v));
  const keep = document.getElementById("keep"); if(keep) keep.onclick = () => answer(null);
  const notMe = document.getElementById("notMe"); if(notMe) notMe.onclick = () => answer("no");
  const skip = document.getElementById("skip"); if(skip) skip.onclick = () => answer("und");
  const later = document.getElementById("later"); if(later) later.onclick = () => finishQ();
}
function finishQ(){
  const p = flow.p, first = flow.first;
  S.asked[p] = 1; saveS(); flow = null;
  if(first){ history.replaceState({ sc: "result", back: false }, ""); reveal("내 체크리스트,\n완성됐어요!", () => result()); }
  else { history.replaceState({ sc: "result", back: false }, ""); result(p); }
}

// ===== 카드 자세히 (질문 카드 · 목록의 i 창 같이 씀) =====
function tagHtml(it){
  const x = dates(it); const tags = [];
  if(x && BASE_TAG[x.b]) tags.push(BASE_TAG[x.b] + (x.guess ? " (가정)" : ""));
  if(it.n === "2-36") tags.push("계약일 기준");
  return tags.map(t => `<span class="tag">${esc(t)}</span>`).join("");
}
function toolsHtml(it){
  const keys = (it.tools || []).filter(k => SITES[k] && (SITES[k].reel || SITES[k].direct));
  if(!keys.length) return "";
  const LABEL = { date: "결혼 좋은 날 찾기", flow: "결혼식 식순표", serenade: "축가 테스트", select: "웨딩사진 셀렉 도우미", retouch: "웨딩사진 수정 요청서", declare: "성혼선언문 만들기", blessing: "덕담 만들기", table: "청모 장소 찾기", parents: "양가 부모님 안내", cue: "입장 타이밍 큐시트", film: "식전영상 만들기", groom: "신랑 입장곡 찾기", bride: "신부 입장곡 찾기", march: "행진곡 찾기", vows: "혼인서약서 만들기", parentsQuiz: "부모님 본식 퀴즈", pack: "신혼여행 짐 싸기", thanks: "감사 문자·땡큐 카드" };
  return `<div class="tools"><p class="d-h">무료 도구</p>${keys.map(k => siteLink(k, "tool-btn", `<span>${esc(LABEL[k] || k)}</span><span aria-hidden="true">→</span>`)).join("")}</div>`;
}
function linksHtml(it){
  if(!it.links || !it.links.length) return "";
  const date = it.links.map(l => l.date).filter(Boolean).sort().pop();
  const dd = pd(date);
  return `<div class="links"><p class="d-h">${esc(it.linkHead || "확인할 곳")}</p>
    ${it.links.map(l => `<p class="lk"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>${l.note ? `<span>${esc(l.note)}</span>` : ""}${l.extra ? `<span>${esc(l.extra)}</span>` : ""}</p>`).join("")}
    <p class="stamp">${dd ? `${dd.getFullYear()}년 ${md(dd)} 확인 · ` : ""}바뀔 수 있으니 공식 사이트에서 다시 확인하세요</p></div>`;
}
function detailHtml(it, o){
  o = o || {};
  const parts = [];
  if(!o.noDesc && !o.compact && it.desc) parts.push(`<p>${esc(it.desc)}</p>`);
  if(!o.noYn && !o.compact && (it.yes || it.no)) parts.push(`<div class="yn">${it.yes ? `<p><b>하면</b><span>${esc(it.yes)}</span></p>` : ""}${it.no ? `<p><b>안 하면</b><span>${esc(it.no)}</span></p>` : ""}</div>`);
  if(it.opts) parts.push(`<p class="d-l"><b>옵션</b><span>${esc(it.opts)}</span></p>`);
  (it.tips || []).forEach(t => parts.push(`<p class="d-l tip-l"><b>팁</b><span>${esc(t)}</span></p>`));
  if(it.check && it.check.length) parts.push(`<div class="d-check"><p class="d-h">확인할 것</p><ul>${it.check.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>`);
  parts.push(linksHtml(it));
  parts.push(toolsHtml(it));
  if(it.mc) parts.push(`<div class="mc"><b>결혼식사회자 이상운</b><p>${esc(it.mc)}</p>${it.kakao ? `<a class="btn kakao" href="${esc(KAKAO)}" target="_blank" rel="noopener">예식 문의 (카톡)</a>` : ""}</div>`);
  else if(it.kakao) parts.push(`<a class="btn kakao" href="${esc(KAKAO)}" target="_blank" rel="noopener">예식 문의 (카톡)</a>`);
  const html = parts.filter(Boolean).join("");
  return o.compact ? (html ? `<details class="more-d"><summary>자세히 보기</summary>${html}</details>` : "") : html;
}
function bindDetail(){ /* 링크는 그냥 a 태그라 따로 묶을 것이 없어요 */ }
// 목록에서 i를 누르면: 자세히 + 답 바꾸기
function itemSheet(n){
  const it = BY[n], st = status(it), x = dates(it), v = S.a[n];
  const ctl = it.k === "opt" || it.k === "ask" || it.k === "choice"
    ? `<div class="answers3 in-sheet${it.k === "choice" ? " four" : ""}">${(it.k === "choice" ? it.choices : ANS[it.k]).map(([val, l]) => `<button class="ans${v === val ? " on" : ""}" data-v="${val}">${esc(l)}</button>`).join("")}</div>`
    : `<button class="text-btn small" id="drop">${st === "out" ? "목록에 다시 넣기" : "이 일은 안 해요 (목록에서 빼기)"}</button>`;
  const sh = openSheet(`<p class="sheet-kind">${PNAME[periodOf(it)]}${subRange(it) ? ` · ${subRange(it)}` : ""}</p><h3>${esc(it.name)}</h3>
    <p class="when">${esc(spanText(it))}${tagHtml(it)}</p>
    ${x && x.guess ? `<p class="stamp">${x.b === "h" ? "입주일" : "출발일"}을 몰라서 예식일 기준으로 잡았어요. <button class="text-btn inline" id="fixDate">${x.b === "h" ? "입주일" : "출발일"} 넣기</button></p>` : ""}
    ${detailHtml(it)}
    <div class="sheet-ctl">${ctl}</div>`, it.name);
  sh.querySelectorAll(".ans").forEach(b => b.onclick = () => { S.a[n] = b.dataset.v; saveS(); dismissSheet(); setTimeout(() => result(), 0); });
  const dr = sh.querySelector("#drop"); if(dr) dr.onclick = () => { if(st === "out") delete S.a[n]; else S.a[n] = "no"; saveS(); dismissSheet(); setTimeout(() => result(), 0); };
  const fx = sh.querySelector("#fixDate"); if(fx) fx.onclick = () => { closeSheet(); go("sit"); };
}

// ===== 5. 내 체크리스트 (지도 + 목록) =====
function result(focusP){
  if(!W()){ home(); return; }
  plain();
  app.className = "wrap res";
  const t = today(), w = W(), n = diff(w, t), cur = curPeriod();
  const all = ITEMS.filter(it => it.k !== "hide");
  const vis = it => shown(it) && opened(periodOf(it));
  const due = it => { const x = dates(it); return x ? x.d : null; };
  const week = all.filter(it => vis(it) && status(it) === "in" && !S.done[it.n] && due(it) && diff(due(it), t) >= 0 && diff(due(it), t) <= 6);
  const und = all.filter(it => vis(it) && status(it) === "und");
  const missed = all.filter(it => vis(it) && status(it) === "in" && !S.done[it.n] && (periodOf(it) < cur || isLate(it)));
  const dropped = all.filter(it => status(it) === "out" && condOk(it) && S.a[it.n] === "no");
  const hd = homeDate(), td = tripDate();
  const guessNote = [];
  if(hd.guess && S.sit.home && S.sit.home !== "have") guessNote.push("입주일");
  if(td.guess && S.sit.trip && S.sit.trip !== "none") guessNote.push("출발일");
  app.innerHTML = `
    <div class="rhead">
      <div class="rh-t"><p class="rh-kind">${NAME}</p><h2>예식까지 <span class="nw">${dday(n)}</span></h2><p class="rh-sub">${esc(full(w))}</p></div>
      <div class="rh-act"><button class="chip-btn send" id="shareTop">링크 보내기</button></div>
    </div>
    ${!canStore ? `<p class="band">여기서는 창을 닫으면 사라져요. 아래 "내 체크리스트 링크"로 보관하세요.</p>` : ""}
    ${mapHtml(cur)}
    ${guessNote.length ? `<button class="notice" id="guess"><b>가정</b><span>${guessNote.join("·")}을 몰라서 예식일 기준으로 잡았어요. ${guessNote[0]}을 넣으면 정확해져요.</span><span class="ar" aria-hidden="true">›</span></button>` : ""}
    ${groupHtml("s-week", "이번 주 할 일", week, "이번 주에 마감인 일이 없어요. 아래 시기별 목록에서 미리 챙겨 보세요.", it => rowHtml(it))}
    ${und.length ? groupHtml("s-und", "아직 정할 것", und, "", it => rowHtml(it, `${dates(it) ? md(due(it)) + "까지 정하면 돼요" : "정해지면 골라 주세요"}`), "미정으로 고른 일이에요.") : ""}
    ${missed.length ? groupHtml("s-miss", "기한이 지난 일", missed, "", it => rowHtml(it), "늦었지만 아직 할 수 있어요. 했으면 체크해 주세요.") : ""}
    ${[1, 2, 3, 4, 5, 6, 7].map(p => periodHtml(p, cur)).join("")}
    ${dropped.length ? `<details class="fold removed"><summary>뺀 것 ${dropped.length}개 (안 해요·아니에요)</summary><ul class="items">${dropped.map(it => `<li class="it gone"><span class="it-t"><b>${esc(it.name)}</b></span><button class="text-btn small" data-back="${it.n}">되돌리기</button></li>`).join("")}</ul></details>` : ""}
    <section class="sec end">
      <div class="btns">
        <button class="btn main" id="share">내 체크리스트 링크 복사</button>
        <div class="btn-row">
          <button class="btn ghost" id="ics">휴대폰 달력에 알림 넣기</button>
          <button class="btn ghost" id="img">이번 시기 이미지로 저장</button>
        </div>
        <button class="btn ghost" id="copy">목록 글로 복사</button>
      </div>
      <p class="msg" id="msg"></p>
      <p class="note small">링크를 보낸 뒤에 고친 건 상대 폰에 보이지 않아요. 바꿨으면 다시 보내 주세요. 달력 알림은 시기가 시작되는 날마다 하나씩 들어가요(최대 6개).</p>
      <div class="end-links">
        <button class="text-btn" id="editSit">상황 바꾸기</button>
        <button class="text-btn" id="editDate">예식일 바꾸기</button>
        <button class="text-btn" id="reset">처음부터 다시</button>
        <a class="text-btn" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
      </div>
      <p class="note small saved-line">마지막 저장 ${S.saved ? esc(stamp(S.saved)) : "–"} · ${canStore ? "이 휴대폰" : "저장 안 됨(링크로 보관)"}</p>
      <p class="note small">※ 모든 정보는 ${CHECKED_TEXT} 기준 참고용이에요. 제도·요금은 바뀔 수 있으니 항목마다 붙은 공식 사이트에서 다시 확인하세요.</p>
      ${sign()}
    </section>
    ${foot()}`;
  bindResult();
  if(focusP){ const el = document.getElementById("p" + focusP); if(el) el.scrollIntoView({ block: "start" }); }
}
function mapHtml(cur){
  const cells = [1, 2, 3, 4, 5, 6, 7].map(p => {
    const list = itemsIn(p).filter(it => it.k !== "hide");
    const op = opened(p);
    const left = op ? list.filter(it => status(it) === "in" && !S.done[it.n]).length : list.filter(it => ["in", "q"].includes(status(it))).length;
    const total = op ? list.filter(it => status(it) === "in").length : left;
    const tool = list.some(it => shown(it) && (it.tools || []).some(k => SITES[k] && (SITES[k].reel || SITES[k].direct)));
    const cls = p < cur ? "past" : p === cur ? "now" : "next";
    const doneAll = op && total > 0 && left === 0;
    return `<a class="mc-cell ${cls}${doneAll ? " clear" : ""}" href="#p${p}" data-p="${p}" aria-label="${PNAME[p]} ${p === cur ? "(지금) " : ""}남은 할 일 ${left}개">
      ${p === cur ? `<span class="here">지금</span>` : ""}
      <b>${PNAME[p]}</b><span class="mc-n">${doneAll ? "✓" : left}</span>${tool ? `<span class="mc-tool" title="무료 도구 있음">●</span>` : ""}</a>`;
  }).join("");
  return `<div class="map-h"><b>결혼 준비 지도</b><span>숫자 = 남은 일 · <span class="dot">●</span> 무료 도구</span></div>
  <nav class="map" aria-label="결혼 준비 지도"><div class="map-row">${cells}</div></nav>`;
}
function groupHtml(id, title, list, empty, row, lead){
  return `<section class="sec grp-sec" id="${id}">
    <div class="sec-h"><h3>${title}</h3><span class="sec-tag">${list.length}개</span></div>
    ${lead ? `<p class="sec-lead">${lead}</p>` : ""}
    ${list.length ? `<div class="grp"><ul class="items">${list.map(row).join("")}</ul></div>` : `<p class="empty">${empty}</p>`}
  </section>`;
}
function rowHtml(it, sub){
  const on = !!S.done[it.n], x = dates(it), t = today();
  let when = sub || "";
  if(!when){
    if(x){ const late = diff(t, x.d); when = !on && late > 0 ? `${late}일 지남` : `${md(x.d)}까지`; }
    else when = it.when || "";
  }
  const late = !sub && x && !on && diff(t, x.d) > 0;
  return `<li class="it${on ? " on" : ""}" data-n="${it.n}">
    <button class="it-main" role="checkbox" aria-checked="${on}">${chk(on)}
      <span class="it-t"><b>${esc(it.name)}</b><span class="it-w${late ? " late" : ""}">${esc(when)}</span>${status(it) === "und" ? `<span class="tag und">미정</span>` : ""}${tagHtml(it)}</span>
    </button>
    <button class="it-i" data-info="${it.n}" aria-label="${esc(it.name)} 자세히">i</button>
  </li>`;
}
function periodHtml(p, cur){
  const list = itemsIn(p).filter(it => it.k !== "hide");
  const op = opened(p);
  const head = `<div class="sec-h"><h3>${PNAME[p]}<small>${esc(PDESC[p])}</small></h3>${p === cur ? `<span class="sec-tag now">지금 시기</span>` : ""}</div>`;
  if(!op){
    const cnt = list.filter(it => ["in", "q"].includes(status(it))).length;
    return `<section class="sec per later" id="p${p}">${head}
      <div class="later-box"><p>할 일 ${cnt}개 · 그때 다시 물어볼게요</p><button class="btn small" data-pre="${p}">미리 정하기</button></div></section>`;
  }
  const rows = list.filter(shown);
  const q = list.filter(it => status(it) === "q");
  const done = rows.filter(it => S.done[it.n]).length;
  let body;
  if(p === 2){
    const subs = [["6~4달 전", 121, 999], ["4~2달 전", 61, 120], ["2~1달 전", 0, 60]];
    body = subs.map(([l, lo, hi]) => {
      const r = rows.filter(it => { const x = dates(it); const d = x ? diff(W(), x.d) : 100; return d >= lo && d <= hi; });
      return r.length ? `<div class="grp"><div class="grp-h"><b>${l}</b><span class="grp-n">${r.filter(it => S.done[it.n]).length} / ${r.length}</span></div><ul class="items">${r.map(it => rowHtml(it)).join("")}</ul></div>` : "";
    }).join("");
  } else body = rows.length ? `<div class="grp"><ul class="items">${rows.map(it => rowHtml(it)).join("")}</ul></div>` : `<p class="empty">이 시기에 남은 일이 없어요.</p>`;
  return `<section class="sec per" id="p${p}">${head}
    <p class="sec-lead">${rows.length ? `${done} / ${rows.length} 했어요` : ""}${q.length ? ` · 아직 안 고른 일 ${q.length}개 <button class="text-btn inline" data-ask="${p}">고르기</button>` : ""}</p>
    ${body}</section>`;
}
function bindResult(){
  document.getElementById("shareTop").onclick = () => shareLink(true);
  document.getElementById("share").onclick = () => shareLink(false);
  document.getElementById("copy").onclick = copyList;
  document.getElementById("ics").onclick = saveIcs;
  document.getElementById("img").onclick = saveImage;
  document.getElementById("editSit").onclick = () => go("sit");
  document.getElementById("editDate").onclick = () => go("date");
  document.getElementById("reset").onclick = () => confirmReset(() => { S = blank(); saveS(); go("home", "replace"); });
  const g = document.getElementById("guess"); if(g) g.onclick = () => go("sit");
  app.querySelectorAll(".it[data-n] .it-main").forEach(b => b.onclick = () => {
    const li = b.closest(".it"), n = li.dataset.n;
    S.done[n] = S.done[n] ? 0 : 1; if(!S.done[n]) delete S.done[n]; else delete S.miss[n];
    saveS();
    const on = !!S.done[n];
    app.querySelectorAll(`.it[data-n="${n}"]`).forEach(x => { x.classList.toggle("on", on); x.querySelector(".it-main").setAttribute("aria-checked", on); x.querySelector(".cb").classList.toggle("on", on); });
    const m = app.querySelector(".map"), mh = app.querySelector(".map-h");
    if(m && mh){ mh.remove(); m.outerHTML = mapHtml(curPeriod()); }
    bindMap();
  });
  app.querySelectorAll("[data-info]").forEach(b => b.onclick = () => itemSheet(b.dataset.info));
  app.querySelectorAll("[data-pre]").forEach(b => b.onclick = () => startQ(+b.dataset.pre, false));
  app.querySelectorAll("[data-ask]").forEach(b => b.onclick = () => {
    const p = +b.dataset.ask, c = curPeriod(), qs = itemsIn(p).filter(it => status(it) === "q");
    const fresh = qs.filter(it => !isLate(it)), late = qs.filter(isLate);
    if(p > c || (p === c && fresh.length)){ startQ(p, false); return; }
    pastRun = { list: [p === c ? "L" : p], i: 0, one: { list: (p === c ? late : qs).map(it => it.n), j: 0 }, back: true };
    go("past");
  });
  app.querySelectorAll("[data-back]").forEach(b => b.onclick = () => { delete S.a[b.dataset.back]; saveS(); result(); });
  bindMap();
}
function bindMap(){
  app.querySelectorAll(".mc-cell").forEach(a => a.onclick = e => {
    e.preventDefault();
    const el = document.getElementById("p" + a.dataset.p); if(el) el.scrollIntoView({ block: "start" });
  });
}

// ===== 링크 (답과 체크를 주소 # 뒤에 담아요) =====
function b64e(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64d(s){ s = s.replace(/-/g, "+").replace(/_/g, "/"); while(s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }
function packState(){
  const o = { w: S.w, s: S.sit, a: S.a, d: Object.keys(S.done), m: Object.keys(S.miss), e: Object.keys(S.seen), k: Object.keys(S.asked).map(Number), p: Object.keys(S.past).map(Number) };
  return b64e(JSON.stringify(o));
}
function unpack(str){
  const o = JSON.parse(b64d(str));
  if(!o || !pd(o.w)) throw new Error("bad");
  const x = blank();
  x.w = o.w; x.sit = o.s || {}; x.a = o.a || {}; x.noted = 1;
  (o.d || []).forEach(n => x.done[n] = 1); (o.m || []).forEach(n => x.miss[n] = 1); (o.e || []).forEach(n => x.seen[n] = 1);
  (o.k || []).forEach(p => x.asked[p] = 1); (o.p || []).forEach(p => x.past[p] = 1);
  return x;
}
function linkUrl(){
  const u = location.origin + location.pathname + (OPEN ? "" : "?preview");
  return `${u}#s=${packState()}`;
}
async function shareLink(top){
  const url = linkUrl(), msg = document.getElementById("msg");
  const done = "링크를 복사했어요. 카톡 나와의 채팅이나 신랑(신부)에게 보내 두세요.";
  try { await navigator.clipboard.writeText(url); msg.textContent = done; if(top) toast(done); }
  catch (e) {
    if(navigator.share){ try { await navigator.share({ title: NAME, url }); return; } catch (er) { if(er && er.name === "AbortError") return; } }
    msg.textContent = url; if(top) msg.scrollIntoView({ block: "center" });
  }
}
function fromHash(){
  const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash || "");
  if(!m) return false;
  let incoming;
  try { incoming = unpack(m[1]); } catch (e) { history.replaceState(null, "", location.pathname + location.search); toast("링크를 읽지 못했어요. 링크가 잘렸는지 확인해 주세요."); return false; }
  history.replaceState(null, "", location.pathname + location.search);
  const same = hasSaved() && packState() === m[1];
  if(!hasSaved() || same){ S = incoming; saveS(); go("result", "replace"); return true; }
  // 이 폰에 다른 체크리스트가 있으면 묻기 (0-화면 62)
  go("home", "replace");
  const sh = openSheet(`<h3>이 링크의 체크리스트로 바꿀까요?</h3><p>지금 이 폰에 있는 건 사라져요.</p>
    <p class="stamp">링크: 예식 ${esc(full(pd(incoming.w)))} · 이 폰: 예식 ${esc(full(W()))}, 마지막 저장 ${esc(stamp(S.saved))}</p>
    <div class="btns"><button class="btn main" id="useLink">바꾸기</button></div>`, "링크로 바꾸기", { close: "지금 것 그대로" });
  sh.querySelector("#useLink").onclick = () => { S = incoming; saveS(); closeSheet(); go("result", "replace"); };
  return true;
}

// ===== 목록 글로 복사 (0-화면 68) =====
function copyList(){
  const t = today(), w = W(), cur = curPeriod(), msg = document.getElementById("msg");
  const line = it => { const x = dates(it); return `${S.done[it.n] ? "☑" : "☐"} ${it.name}${x ? `(${x.d.getMonth() + 1}/${x.d.getDate()}까지)` : it.when ? `(${it.when})` : ""}`; };
  const vis = it => shown(it) && opened(periodOf(it));
  const lines = [`[결혼 준비 체크리스트] 예식 ${w.getFullYear()}년 ${md(w)} · ${dday(diff(w, t))}`];
  const week = ITEMS.filter(it => vis(it) && status(it) === "in" && !S.done[it.n] && periodOf(it) >= cur && dates(it) && diff(dates(it).d, t) <= 6);
  if(week.length) lines.push("", "▷ 이번 주", ...week.map(line));
  for(const p of [1, 2, 3, 4, 5, 6, 7]){
    if(!opened(p)) continue;
    const list = itemsIn(p).filter(it => status(it) === "in");
    if(list.length) lines.push("", `▷ ${PNAME[p]} (${PDESC[p]})`, ...list.map(line));
  }
  const und = ITEMS.filter(it => vis(it) && status(it) === "und");
  if(und.length) lines.push("", "▷ 아직 정할 것", ...und.map(it => `☐ ${it.name}`));
  lines.push("", `※ ${CHECKED_TEXT} 기준 참고용이에요. 제도·요금은 공식 사이트에서 다시 확인하세요.`, linkUrl().split("#")[0], "", "결혼식사회자 이상운 @wed_voice.su");
  navigator.clipboard.writeText(lines.join("\n")).then(() => { msg.textContent = "목록을 복사했어요. 메모장이나 카톡에 붙여 넣으세요."; }, () => { msg.textContent = "복사하지 못했어요. 화면을 캡처해 주세요."; });
}

// ===== 휴대폰 달력 알림 (시기마다 하나, 최대 6개) =====
function saveIcs(){
  const w = W(), t = today(), msg = document.getElementById("msg"), url = linkUrl().split("#")[0];
  const evs = [];
  for(const p of [1, 2, 3, 4, 5, 6, 7]){
    const day = add(w, PSTART[p]);
    if(diff(day, t) <= 0) continue;
    evs.push({ p, day });
  }
  const list = evs.slice(0, 6);
  if(!list.length){ msg.textContent = "앞으로 남은 시기가 없어서 알림을 넣을 게 없어요."; return; }
  const dt = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const now = new Date(), st = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const fold = s => s.replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//wedvoice-su//ready-to-wed//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for(const { p, day } of list){
    body.push("BEGIN:VEVENT", `UID:ready-to-wed-${S.w}-${p}@wedvoice-su.github.io`, `DTSTAMP:${st}`,
      `DTSTART:${dt(day)}T090000`, `DTEND:${dt(day)}T093000`,
      `SUMMARY:${fold(`[결혼 준비] ${PNAME[p]} 할 일 볼 날`)}`,
      `DESCRIPTION:${fold(`이번 시기 할 일을 확인하세요.\n${url}`)}`, `URL:${url}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${fold(`${PNAME[p]} 할 일 볼 날`)}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
  }
  body.push("END:VCALENDAR");
  const blob = new Blob([body.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const file = new File([blob], "결혼준비-알림.ics", { type: "text/calendar" });
  const href = URL.createObjectURL(blob);
  if(IOS){ location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(body.join("\r\n") + "\r\n"); msg.textContent = `달력 알림 ${list.length}개를 열었어요. '모두 추가'를 눌러 주세요.`; }
  else {
    const a = document.createElement("a"); a.href = href; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    msg.textContent = `달력 파일(알림 ${list.length}개)을 저장했어요. 파일을 열면 달력에 들어가요.`;
  }
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}

// ===== 이번 시기 이미지 (9:16) =====
async function saveImage(){
  const msg = document.getElementById("msg");
  if(typeof window.html2canvas !== "function"){ msg.textContent = "이미지를 만들지 못했어요. 화면을 캡처해 주세요."; return; }
  msg.textContent = "이미지를 만드는 중이에요…";
  const cur = curPeriod();
  const due = it => { const x = dates(it); return x ? x.d.getTime() : Infinity; };
  const list = itemsIn(cur).filter(it => status(it) === "in")
    .sort((a, b) => (S.done[a.n] ? 1 : 0) - (S.done[b.n] ? 1 : 0) || due(a) - due(b));
  const left = list.filter(it => !S.done[it.n]).length;
  const max = 12, rest = list.length - max;
  const holder = document.createElement("div"); holder.className = "shot-holder";
  holder.innerHTML = `<div class="shot" id="shot">
    <p class="shot-k">${NAME}</p>
    <p class="shot-p">${PNAME[cur]} · ${esc(PDESC[cur])}</p>
    <h2>이번 시기<br>할 일 ${list.length}개</h2>
    <p class="shot-left">남은 일 ${left}개 · 한 일 ${list.length - left}개</p>
    <ul>${list.slice(0, max).map(it => { const x = dates(it); return `<li class="${S.done[it.n] ? "on" : ""}"><span class="sb">${S.done[it.n] ? "✓" : ""}</span><b>${esc(it.name).replace(/·/g, "·\u2060")}</b><em>${x ? `${x.d.getMonth() + 1}/${x.d.getDate()}` : ""}</em></li>`; }).join("")}</ul>
    ${rest > 0 ? `<p class="shot-more">외 ${rest}개</p>` : ""}
    <p class="shot-w">예식 ${esc(full(W()))}</p>
    ${sign()}
  </div>`;
  document.body.appendChild(holder);
  try {
    if(document.fonts) await document.fonts.ready;
    const canvas = await window.html2canvas(document.getElementById("shot"), { scale: 3, backgroundColor: getComputedStyle(document.body).backgroundColor, logging: false });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const file = new File([blob], `결혼준비_${PNAME[cur]}.png`, { type: "image/png" });
    if(navigator.canShare && navigator.canShare({ files: [file] })){
      try { await navigator.share({ files: [file] }); msg.textContent = ""; return; } catch (e) { if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
    }
    const url = URL.createObjectURL(file), a = document.createElement("a");
    a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    msg.textContent = "이미지를 저장했어요.";
  } catch (e) { msg.textContent = "이미지를 만들지 못했어요. 화면을 캡처해 주세요."; }
  finally { holder.remove(); }
}

// ===== 다시 열었을 때 =====
function resume(){
  if(!hasSaved()){ go("home"); return; }
  if(curPeriod() === 7 && !S.asked[7]){ startQ(7, false); return; }
  const pq = pastQueue();
  if(pq.length){ pastRun = { list: pq, i: 0, one: null }; go("past"); return; }
  const c = curPeriod();
  if(!S.asked[c] && itemsIn(c).some(askable)){ startQ(c, true); return; }
  go("result");
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>곧 공개</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>결혼 준비,<br>뭐부터 하죠?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom", "go", `<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

window.addEventListener("hashchange", () => { if(/[#&]s=/.test(location.hash)) fromHash(); });

// ===== 시작 =====
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  if(fromHash()) return;
  go("home", "replace");
}
route();
