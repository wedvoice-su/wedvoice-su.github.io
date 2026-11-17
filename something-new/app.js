// 신부 관리 찾아보기 ㊶: 예식일 → 신경 쓰이는 곳 고르기 → 방법들을 "설명 · 후기에 따르면"으로 나란히 + 내 날짜로 바꾼 시기 + 후기 검색어
// 문구 text.js · 방법 · 근거 data.js · 공통 기능 shared/common.js · 기획 docs/신부-관리/기획.md · 조사 docs/신부-관리/조사/
// 추천하지 않아요. 병원 · 샵 이름과 링크, 개별 후기 링크는 넣지 않아요(의료법 56조 · 27조, docs/신부-관리/조사/C-의료법-확인.md).
// 고른 날짜 · 고민은 이 기기(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/something-new/?preview)
const OPEN = false;
// =========================================================

const KEY = "somethingNew.v1";
const DAY = 86400000;
const WORRY = {}; GROUPS.forEach(g => g.worries.forEach(w => { WORRY[w.id] = { ...w, g: g.id }; }));
const WAY = {}; WAYS.forEach(w => { WAY[w.id] = w; });
const CLINIC = { clinic: 1, dental: 1 };

// ===== 저장 =====
function blank(){ return { v: 1, wed: "", shoot: "", noDate: false, worries: [], clinic: true, picked: [], tab: "ways" }; }
function okDate(s){ return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toDate(s)) ? s : ""; }
function clean(x){
  if(!x || typeof x !== "object" || x.v !== 1) return null;
  const b = blank();
  b.wed = okDate(x.wed); b.shoot = okDate(x.shoot);
  b.noDate = !!x.noDate && !b.wed;
  b.worries = (Array.isArray(x.worries) ? x.worries : []).filter(id => WORRY[id]);
  b.clinic = x.clinic !== false;
  b.picked = (Array.isArray(x.picked) ? x.picked : []).filter(id => WAY[id]);
  b.tab = x.tab === "cal" ? "cal" : "ways";
  return b;
}
function load(){ try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch(e){ return null; } }
function save(){ if(VIEW !== S) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || blank();
let VIEW = S;                       // 예시를 볼 때는 예시, 아니면 S
const isEx = () => VIEW !== S;

function exampleState(){
  const e = blank();
  e.wed = ymd(new Date(today().getTime() + 120 * DAY));
  e.shoot = ymd(new Date(today().getTime() + 50 * DAY));
  e.worries = EXAMPLE.worries.filter(id => WORRY[id]);
  e.picked = EXAMPLE.picked.filter(id => WAY[id]);
  return e;
}
const EXAMPLE = { worries: ["tone", "shoulder", "underarm", "nail", "swell"], picked: [] };

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");
const WD = ["일", "월", "화", "수", "목", "금", "토"];
function today(){ const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function toDate(s){ const [y, m, d] = String(s).split("-").map(Number); const x = new Date(y, m - 1, d); x.setHours(0, 0, 0, 0); return x; }
function ymd(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function addDays(d, n){ const x = new Date(d.getTime()); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; }
const md = d => (d.getMonth() + 1) + "월 " + d.getDate() + "일";
const mdw = d => md(d) + "(" + WD[d.getDay()] + ")";
function mdRange(a, b){            // a ≤ b
  if(+a === +b) return md(a);
  if(a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return md(a) + "~" + b.getDate() + "일";
  return md(a) + "~" + md(b);
}
// 예식 며칠 전 → 말
function rel(n){
  if(n >= 56 && n % 30 === 0) return (n / 30) + "개월";
  if(n >= 7 && n % 7 === 0) return (n / 7) + "주";
  return n + "일";
}
function relRange(arr){
  const lo = Math.min(...arr), hi = Math.max(...arr);
  if(lo === hi) return rel(lo);
  const a = rel(lo), b = rel(hi);
  const ua = a.replace(/\d+/, ""), ub = b.replace(/\d+/, "");
  return ua === ub ? a.replace(ua, "") + "~" + b : a + "~" + b;
}
const wedD = () => VIEW.wed ? toDate(VIEW.wed) : null;
const shootD = () => VIEW.shoot ? toDate(VIEW.shoot) : null;
const dLeft = () => VIEW.wed ? Math.round((toDate(VIEW.wed) - today()) / DAY) : null;

// 링크: 공개 전에는 ?preview 를 붙여요
function pageUrl(){ return location.origin + location.pathname + (OPEN ? "" : "?preview"); }
const naverUrl = q => "https://search.naver.com/search.naver?ssc=tab.blog.all&query=" + encodeURIComponent(q);
const ytUrl = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

// ===== 방법 고르기 =====
function waysFor(st){
  const set = new Set(st.worries);
  return WAYS.filter(w => w.worries.some(id => set.has(id)) && (st.clinic || !CLINIC[w.where]));
}
// 시기 계산: 끝내기(end) · 시작(start)을 내 날짜로
function dueOf(w){
  const d = w.due;
  if(!d) return null;
  const hasEnd = !!(d.end && d.end.length), hasStart = !!(d.start && d.start.length);
  if(!hasEnd && !hasStart) return null;
  const W = wedD(), t = today();
  const r = { hasEnd, hasStart };
  if(hasEnd){ r.lo = Math.min(...d.end); r.hi = Math.max(...d.end); r.rel = relRange(d.end); }
  if(hasStart){ r.slo = Math.min(...d.start); r.shi = Math.max(...d.start); r.srel = relRange(d.start); }
  if(W){
    if(hasEnd){
      r.a = addDays(W, -r.hi); r.b = addDays(W, -r.lo);          // a ≤ b
      r.state = t > r.b ? "past" : t >= r.a ? "now" : "ok";
      const SH = shootD();
      if(SH && d.shoot && SH < W){ r.ha = addDays(SH, -r.hi); r.hb = addDays(SH, -r.lo); r.hstate = t > r.hb ? "past" : "ok"; }
    }
    if(hasStart){ r.sa = addDays(W, -r.shi); r.sb = addDays(W, -r.slo); r.sstate = t > r.sb ? "past" : "ok"; }
  }
  return r;
}
function dueChip(w){
  const r = dueOf(w);
  if(!r) return `<span class="due none">${esc(T.dueNone)}</span>`;
  if(!r.hasEnd){
    if(!r.sa) return `<span class="due start">${esc(fm(T.startRel, { r: r.srel }))}</span>`;
    if(r.sstate === "past") return `<span class="due past">${esc(T.duePastStart)}</span>`;
    if(today() >= r.sa) return `<span class="due start now">${esc(T.startNow)}</span>`;
    return `<span class="due start">${esc(fm(T.startFrom, { date: +r.sa === +r.sb ? md(r.sa) : mdRange(r.sa, r.sb) }))}</span>`;
  }
  if(!r.a) return `<span class="due">${esc(fm(T.dueRel, { r: r.rel }))}</span>`;
  const txt = +r.a === +r.b ? fm(T.dueBy, { date: md(r.a) }) : fm(T.dueByRange, { a: mdRange(r.a, r.b) });
  const cls = r.state === "past" ? " past" : r.state === "now" ? " now" : "";
  return `<span class="due${cls}">${esc(r.state === "past" ? T.duePast : r.state === "now" ? fm(T.dueNow, { b: md(r.b) }) : txt)}</span>`;
}

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let screen = "";
function go(sc, extra){ history.pushState({ sc, ...(extra || {}) }, ""); render(sc); }
function render(sc){
  screen = sc;
  ({ home, when, pick, res })[sc]();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  const st = e.state || { sc: "home" };
  if(st.sc === "res" && st.ex) VIEW = exampleState();
  else if(st.sc !== "res" || !st.ex) VIEW = S;
  if(st.sc === "res" && !VIEW.worries.length){ VIEW = S; render(S.worries.length ? "res" : "pick"); return; }
  render(st.sc);
});

// ===== 1. 첫 화면 =====
function home(){
  VIEW = S;
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const started = S.worries.length > 0;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${started
        ? `<button id="resume"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { n: S.worries.length }))}</span></button>`
        : `<button id="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>`}
      <button id="ex"><span>${esc(T.example)}</span><span class="q">${esc(T.exampleQ)}</span></button>
    </div>
    <p class="ref-cover"><b>참고용</b>${esc(T.ref)}</p>
    <p class="note">${esc(T.noteSave)}</p>
    ${started ? `<div class="reset"><button class="text-btn cover-link" id="reset">${esc(T.restart)}</button>
      <div class="reset-ask" id="resetAsk" hidden><p>${esc(T.restartAsk)}</p>
      <div class="reset-btns"><button class="chip-btn" id="resetYes">${esc(T.restartYes)}</button><button class="chip-btn" id="resetNo">${esc(T.restartNo)}</button></div></div></div>` : ""}
    ${foot()}`;
  const st = $("#start"), rs = $("#resume");
  if(st) st.onclick = () => go("when");
  if(rs) rs.onclick = () => go("res");
  $("#ex").onclick = () => { VIEW = exampleState(); go("res", { ex: 1 }); };
  if(started){
    $("#reset").onclick = () => { $("#resetAsk").hidden = false; $("#reset").hidden = true; $("#resetYes").focus(); };
    $("#resetNo").onclick = () => { $("#resetAsk").hidden = true; $("#reset").hidden = false; };
    $("#resetYes").onclick = () => { S = blank(); VIEW = S; save(); render("home"); };
  }
}

// ===== 2. 예식일 =====
function when(){
  VIEW = S;
  document.body.classList.remove("is-cover");
  app.className = "wrap when";
  const min = ymd(today());
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toHome">‹ ${esc(T.name)}</button><span class="count">${esc(fm(T.step, { n: 1 }))}</span></div>
    <h2 class="question">${br(T.whenTitle)}</h2>
    <p class="lead2">${esc(T.whenLead)}</p>
    <div class="sec">
      <label class="lbl" for="wed">${esc(T.wedLabel)}</label>
      <input class="date" type="date" id="wed" min="${min}" value="${esc(S.wed)}">
      <button class="opt-line${S.noDate ? " on" : ""}" id="noDate" aria-pressed="${S.noDate}"><span class="box">${CHECK}</span><span>${esc(T.noDate)}</span></button>
      <p class="err" id="wedErr" role="alert" hidden></p>
    </div>
    <div class="sec" id="shootSec"${S.noDate ? " hidden" : ""}>
      <label class="lbl" for="shoot">${esc(T.shootLabel)}</label>
      <p class="hint2">${esc(T.shootHint)}</p>
      <input class="date" type="date" id="shoot" min="${min}" value="${esc(S.shoot)}">
      <p class="err" id="shootErr" role="alert" hidden></p>
    </div>
    <div class="dock"><button class="btn main" id="next">${esc(T.next)}</button></div>
    ${foot()}`;
  const wed = $("#wed"), shoot = $("#shoot"), nd = $("#noDate");
  const check = () => {
    const we = $("#wedErr"), se = $("#shootErr");
    we.hidden = se.hidden = true;
    let ok = true;
    if(wed.value && toDate(wed.value) < today()){ we.textContent = T.pastDate; we.hidden = false; ok = false; }
    if(shoot.value && toDate(shoot.value) < today()){ se.textContent = T.pastDate; se.hidden = false; ok = false; }
    else if(shoot.value && wed.value && toDate(shoot.value) > toDate(wed.value)){ se.textContent = T.shootAfter; se.hidden = false; ok = false; }
    $("#next").disabled = !ok || (!okDate(wed.value) && !S.noDate);
    return ok;
  };
  wed.addEventListener("input", () => { if(wed.value){ S.noDate = false; nd.classList.remove("on"); nd.setAttribute("aria-pressed", "false"); $("#shootSec").hidden = false; } S.wed = okDate(wed.value); save(); check(); });
  shoot.addEventListener("input", () => { S.shoot = okDate(shoot.value); save(); check(); });
  nd.onclick = () => {
    S.noDate = !S.noDate;
    if(S.noDate){ S.wed = ""; S.shoot = ""; wed.value = ""; shoot.value = ""; }
    nd.classList.toggle("on", S.noDate); nd.setAttribute("aria-pressed", String(S.noDate));
    $("#shootSec").hidden = S.noDate;
    save(); check();
  };
  $("#toHome").onclick = () => go("home");
  $("#next").onclick = () => { if(check()) go("pick"); };
  check();
}

// ===== 3. 고민 고르기 =====
function pick(){
  VIEW = S;
  document.body.classList.remove("is-cover");
  app.className = "wrap pickw";
  const on = new Set(S.worries);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toWhen">‹ ${esc(T.wedLabel)}</button><span class="count">${esc(fm(T.step, { n: 2 }))}</span></div>
    <h2 class="question">${br(T.pickTitle)}</h2>
    <p class="lead2">${esc(T.pickLead)}</p>
    ${GROUPS.map(g => `
      <section class="grp">
        <h3>${esc(g.name)}</h3>
        <div class="chips">
          ${g.worries.map(w => `<button class="chip${on.has(w.id) ? " on" : ""}" data-w="${w.id}" aria-pressed="${on.has(w.id)}"><span class="box">${CHECK}</span><span>${esc(w.label)}</span></button>`).join("")}
        </div>
      </section>`).join("")}
    <button class="sec switch-row" id="clinic" role="switch" aria-checked="${S.clinic}"><span class="sw-t">${esc(T.clinicLabel)}</span><span class="switch" aria-hidden="true"><span class="knob"></span></span></button>
    <p class="hint2 after" id="clinicOff"${S.clinic ? " hidden" : ""}>${esc(T.clinicOff)}</p>
    <div class="dock">
      <p class="dock-line" id="cnt" aria-live="polite"></p>
      <button class="btn main" id="see">${esc(T.seeResult)}</button>
    </div>
    ${foot()}`;
  const upd = () => {
    const n = S.worries.length;
    $("#cnt").innerHTML = `<span>${esc(n ? fm(T.pickCount, { n }) : T.pickNone)}</span>`;
    $("#see").disabled = !n;
  };
  $$("[data-w]").forEach(b => {
    b.onclick = () => {
      const id = b.dataset.w, i = S.worries.indexOf(id);
      if(i >= 0) S.worries.splice(i, 1); else S.worries.push(id);
      // 고민 순서는 화면 순서대로
      const order = Object.keys(WORRY); S.worries.sort((a, c) => order.indexOf(a) - order.indexOf(c));
      b.classList.toggle("on", i < 0); b.setAttribute("aria-pressed", String(i < 0));
      save(); upd();
    };
  });
  $("#clinic").onclick = () => {
    S.clinic = !S.clinic; $("#clinic").setAttribute("aria-checked", String(S.clinic));
    $("#clinicOff").hidden = S.clinic; save();
  };
  $("#toWhen").onclick = () => go("when");
  $("#see").onclick = () => { S.tab = "ways"; save(); go("res"); };
  upd();
}

// ===== 4. 결과 =====
let openCards = new Set();
function res(){
  document.body.classList.remove("is-cover");
  app.className = "wrap resw";
  const V = VIEW, list = waysFor(V), dl = dLeft();
  const tab = V.tab === "cal" ? "cal" : "ways";
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(isEx() ? "‹ " + T.name : T.backPick)}</button><span></span></div>
    ${isEx() ? `<div class="ex-bar"><span>${esc("예시예요 · 예식 120일 전 · 웨딩촬영 50일 뒤")}</span><button class="btn accent sm" id="exStart">${esc("내 것으로 시작")}</button></div>` : ""}
    <h2 class="question">${esc(dl != null ? fm(T.resTitleDate, { d: dl }) : T.resTitleNoDate)}</h2>
    <p class="lead2">${esc(fm(T.resLead, { w: V.worries.length, m: list.length }))}${V.wed ? " · " + esc("본식 " + mdw(wedD())) : ""}</p>
    <p class="ref-bar" role="note">${esc(T.refBar)}</p>
    <div class="tabs" role="tablist">
      <button role="tab" id="tWays" aria-selected="${tab === "ways"}">${esc(T.tabWays)}</button>
      <button role="tab" id="tCal" aria-selected="${tab === "cal"}">${esc(T.tabCal)}</button>
    </div>
    <div id="pane">${tab === "ways" ? waysPane(V, list) : calPane(V, list)}</div>
    ${bottomBoxes()}
    ${foot()}`;
  $("#back").onclick = () => isEx() ? go("home") : go("pick");
  const ex = $("#exStart"); if(ex) ex.onclick = () => { VIEW = S; go(S.wed || S.noDate ? "pick" : "when"); };
  $("#tWays").onclick = () => switchTab("ways");
  $("#tCal").onclick = () => switchTab("cal");
  bindPane(tab);
}
function switchTab(t){
  VIEW.tab = t; save();
  const list = waysFor(VIEW);
  $("#pane").innerHTML = t === "ways" ? waysPane(VIEW, list) : calPane(VIEW, list);
  $("#tWays").setAttribute("aria-selected", String(t === "ways"));
  $("#tCal").setAttribute("aria-selected", String(t === "cal"));
  bindPane(t);
}
function bindPane(t){
  if(t === "ways"){
    $$(".way-h").forEach(b => { b.onclick = () => toggleCard(b.closest(".way")); });
    $$("[data-pick]").forEach(b => { b.onclick = () => togglePick(b.dataset.pick); });
  } else {
    $("#save").onclick = saveCard;
    $("#copy").onclick = copyCal;
    $$("[data-goway]").forEach(b => { b.onclick = () => { openCards.add(b.dataset.goway); switchTab("ways"); const el = $(`.way[data-id="${b.dataset.goway}"]`); if(el) el.scrollIntoView({ block: "start" }); }; });
    prepareImage(T.saveName);
  }
}
function toggleCard(el){
  const id = el.dataset.id, open = !el.classList.contains("open");
  if(open) openCards.add(id); else openCards.delete(id);
  // 같은 방법이 여러 고민에 나오면 모두 같이 열고 닫아요
  $$(`.way[data-id="${id}"]`).forEach(x => { x.classList.toggle("open", open); $(".way-h", x).setAttribute("aria-expanded", String(open)); $(".way-b", x).hidden = !open; });
}
function togglePick(id){
  const P = VIEW.picked, i = P.indexOf(id);
  if(i >= 0) P.splice(i, 1); else P.push(id);
  save();
  $$(`[data-pick="${id}"]`).forEach(b => { b.classList.toggle("on", i < 0); b.setAttribute("aria-pressed", String(i < 0)); $(".pk-t", b).textContent = i < 0 ? T.picked : T.pick; });
  $$(`.way[data-id="${id}"] .pk-mark`).forEach(m => { m.hidden = i >= 0; });
}

// --- 방법 보기 ---
function waysPane(V, list){
  const by = {}; list.forEach(w => w.worries.forEach(id => { (by[id] = by[id] || []).push(w); }));
  return `
    <p class="hint2">${esc(T.waysHint)}</p>
    ${commonBox()}
    ${V.worries.map(id => {
      const ws = by[id] || [];
      return `<section class="wgrp">
        <h3>${esc(WORRY[id].label)}</h3>
        ${ws.length ? ws.map(w => wayCard(w, V)).join("") : `<p class="hint2">${esc(V.clinic ? "이 고민에 맞는 방법 자료를 아직 정리하지 못했어요." : "병원 밖에서 하는 방법은 아직 정리하지 못했어요. 위 고민 고르기에서 ‘병원 시술도 같이 보기’를 켜 보세요.")}</p>`}
      </section>`;
    }).join("")}`;
}
function wayCard(w, V){
  const open = openCards.has(w.id), picked = V.picked.includes(w.id);
  // 근거 번호: 카드 안에서 나온 순서대로 1, 2, 3…
  const ids = [];
  const use = arr => (arr || []).map(s => { if(!SRC[s]) return 0; let i = ids.indexOf(s); if(i < 0){ ids.push(s); i = ids.length - 1; } return i + 1; }).filter(Boolean);
  const refs = arr => { const n = use(arr); return n.length ? ` <span class="refs">${n.map(x => `<span class="ref">${x}</span>`).join("")}</span>` : ""; };
  const r = dueOf(w);
  const one = x => x.one ? ` <span class="one">${esc(T.srcOne)}</span>` : "";
  const says = (w.says || []).map(x => `<li${x.nf ? ' class="nf"' : ""}>${x.k ? `<b>${esc(x.k)}</b> ` : ""}${esc(x.v)}${refs(x.s)}${one(x)}</li>`).join("");
  let due = "";
  if(w.due){
    const lines = [];
    (w.due.says || []).forEach(x => lines.push(`<li${x.nf ? ' class="nf"' : ""}>${esc(x.v)}${refs(x.s)}${one(x)}</li>`));
    if(w.due.v) lines.push(`<li>${esc(w.due.v)}${refs(w.due.s)}</li>`);
    if(r && (r.a || r.sa)){
      const parts = [];
      if(r.sa) parts.push((+r.sa === +r.sb ? md(r.sa) : mdRange(r.sa, r.sb)) + "쯤 시작");
      if(r.a) parts.push(+r.a === +r.b ? md(r.a) + "까지 끝내기" : mdRange(r.a, r.b) + " 사이에 끝내기");
      lines.push(`<li class="mine"><b>${esc(T.mine)}</b> ${esc(parts.join(" · "))}</li>`);
      if(r.ha) lines.push(`<li class="mine"><b>${esc(T.mineShoot)}</b> ${esc(+r.ha === +r.hb ? md(r.ha) + "까지 끝내기" : mdRange(r.ha, r.hb) + " 사이에 끝내기")}</li>`);
      if(r.state === "past" || (!r.hasEnd && r.sstate === "past")) lines.push(`<li class="warn-li">${esc(r.hasEnd ? T.pastNote : T.pastStartNote)}</li>`);
    } else if(r){
      const parts = [];
      if(r.srel) parts.push(fm(T.startRel, { r: r.srel }));
      if(r.rel) parts.push(fm(T.dueRel, { r: r.rel }));
      lines.push(`<li class="mine"><b>${esc(T.mineNoDate)}</b> ${esc(parts.join(" · "))}</li>`);
    }
    if(!w.due.v && w.due.s) refs(w.due.s);
    due = lines.length ? `<h4>${esc(T.dueTitle)}</h4><ul>${lines.join("")}</ul>` : "";
  }
  const price = !w.price ? "" : w.price.none
    ? `<h4>${esc(T.price)}</h4><p class="price-none">${esc(w.price.v)}</p>`
    : `<h4>${esc(T.price)} <span class="tag-ref">${esc("참고용")}</span></h4>${(w.price.lines || [{ v: w.price.v, s: w.price.s }]).map(x => `<p class="price">${esc(x.v)}${refs(x.s)}${one(x)}</p>`).join("")}<p class="price-ref">${esc(T.priceRef)}</p>`;
  const heard = (w.heard || []).length ? `<h4>${esc(T.heard)}</h4><ul>${w.heard.map(x => `<li>${esc(x.v)}${refs(x.s)}</li>`).join("")}</ul>` : "";
  const ask = (w.ask || []).length ? `<h4>${esc(T.ask)}</h4><ul class="ask">${w.ask.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const find = (w.q || []).length ? `<h4>${esc(T.find)}</h4>
    <div class="finds">${w.q.map(q => `<div class="find"><span class="fq">${esc(q)}</span><span class="fbtn"><a href="${naverUrl(q)}" target="_blank" rel="noopener">${esc(T.findNaver)}</a><a href="${ytUrl(q)}" target="_blank" rel="noopener">${esc(T.findYoutube)}</a></span></div>`).join("")}</div>
    <p class="hint2 small">${esc(T.findHint)}</p>` : "";
  const what = w.what ? `<h4>${esc(T.what)}</h4><p>${esc(w.what)}${refs(w.whatS)}</p>` : "";
  const saysH = says ? `<h4>${esc(T.says)}</h4><ul>${says}</ul>` : "";
  const body = what + saysH + due + price + heard + ask + find;
  const srcs = ids.length ? `<details class="srcs"><summary>${esc(fm(T.srcTitle, { n: ids.length }))}</summary><ol>${ids.map(s => srcLi(SRC[s])).join("")}</ol></details>` : "";
  return `
    <article class="way${open ? " open" : ""}" data-id="${w.id}">
      <button class="way-h" aria-expanded="${open}">
        <span class="wh-top"><span class="where w-${w.where}">${esc(T.where[w.where])}</span><span class="pk-mark"${picked ? "" : " hidden"}>${esc("담음")}</span></span>
        <span class="wh-name">${esc(w.name)}</span>
        <span class="wh-due">${dueChip(w)}</span>
      </button>
      <div class="way-b"${open ? "" : " hidden"}>
        <button class="pick-btn${picked ? " on" : ""}" data-pick="${w.id}" aria-pressed="${picked}"><span class="box">${CHECK}</span><span class="pk-t">${esc(picked ? T.picked : T.pick)}</span></button>
        ${body}
        ${srcs}
      </div>
    </article>`;
}
function srcLi(s){
  return `<li><span class="sk sk-${s.k}">${esc(T.srcKind[s.k] || s.k)}</span> <a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.d ? ` <span class="sd">${esc(s.d)}</span>` : ""}</li>`;
}

// 여러 출처에 공통으로 나온 말 (고민과 상관없이)
function commonBox(){
  if(!COMMON.length) return "";
  return `<details class="help common"><summary>${esc(fm(T.commonTitle, { n: COMMON.length }))}</summary><ul>${COMMON.map(x => `<li>${esc(x.v)}${(x.s || []).filter(s => SRC[s]).map(s => ` <a class="mini" href="${esc(SRC[s].u)}" target="_blank" rel="noopener">${esc(T.srcKind[SRC[s].k] || "")} · ${esc(SRC[s].t)}</a>`).join("")}</li>`).join("")}</ul></details>`;
}

// --- 내 달력 ---
function calRows(V, list){
  const picked = V.picked.filter(id => list.some(w => w.id === id));
  const use = picked.length ? list.filter(w => picked.includes(w.id)) : list;
  const rows = [], none = [];
  use.forEach(w => {
    const r = dueOf(w);
    if(!r){ none.push(w); return; }
    if(r.hasStart) rows.push({ w, kind: "start", n: r.shi, n2: r.slo, a: r.sa, b: r.sb, state: r.hasEnd ? "" : r.sstate });
    if(r.hasEnd) rows.push({ w, kind: "end", n: r.hi, n2: r.lo, a: r.a, b: r.b, state: r.state });
    if(r.ha) rows.push({ w, kind: "shoot", n: null, a: r.ha, b: r.hb, state: r.hstate });
  });
  rows.sort((x, y) => x.a && y.a ? (x.a - y.a) || (x.kind === "start" ? -1 : 1) : (y.n - x.n));
  return { rows, none, pickedN: picked.length };
}
// 달력 날짜 칸: 범위는 두 줄로 (11월 2일 / ~1월 1일)
function calRange(a, b){
  const same = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return `<span class="d1">${esc(md(a))}</span><span class="d2">~${esc(same ? b.getDate() + "일" : md(b))}</span>`;
}
function calPane(V, list){
  const { rows, none, pickedN } = calRows(V, list);
  const W = wedD(), SH = shootD();
  let lastHead = "";
  const lines = rows.map(x => {
    let head = "";
    if(x.a){ const h = x.a.getFullYear() + "년 " + (x.a.getMonth() + 1) + "월"; if(h !== lastHead){ lastHead = h; head = `<li class="mh">${esc(h)}</li>`; } }
    const when = x.a ? (+x.a === +x.b ? esc(mdw(x.a)) : calRange(x.a, x.b)) : esc("예식 " + relRange([x.n, x.n2]) + " 전");
    const kind = x.kind === "start" ? T.calStart : x.kind === "shoot" ? T.calShoot : T.calEnd;
    return `${head}<li class="cr${x.state === "past" ? " past" : ""}"><span class="cw">${when}</span><span class="cn"><button class="cl" data-goway="${x.w.id}">${esc(x.w.name)}</button><span class="ck k-${x.kind}">${esc(kind)}</span>${x.state === "past" ? `<span class="ck k-past">${esc("시기 지남")}</span>` : ""}</span></li>`;
  }).join("");
  return `
    <p class="hint2">${esc(pickedN ? fm(T.calPickedOnly, { n: pickedN }) : T.calEmptyPicked)}</p>
    <div class="card cal" id="card">
      <div class="head"><span class="kind">${esc(T.calTitle)}</span><span class="handle">@wed_voice.su</span></div>
      <p class="cal-sub">${esc(W ? (SH ? fm(T.calSubShoot, { date: mdw(W), shoot: mdw(SH) }) : fm(T.calSub, { date: mdw(W) })) : T.calSubNoDate)}</p>
      <ol class="cal-list">${lines || ""}${W ? `<li class="cr wed"><span class="cw">${esc(mdw(W))}</span><span class="cn"><b>${esc("본식")}</b></span></li>` : ""}</ol>
      ${none.length ? `<p class="cal-none"><b>${esc(T.calNoDue)}</b> ${esc(none.map(w => w.name).join(" · "))}</p>` : ""}
      <p class="stamp">${esc(T.calStamp)}</p>
      ${sign()}
    </div>
    <div class="btns after-card">
      <button class="btn main" id="save">${esc(T.save)}</button>
      <button class="btn ghost" id="copy">${esc(T.copy)}</button>
      <p class="msg" id="msg" role="status"></p>
    </div>`;
}
async function copyCal(){
  const V = VIEW, { rows, none } = calRows(V, waysFor(V)), W = wedD();
  const L = [T.calTitle + " (참고용)"];
  if(W) L.push("본식 " + mdw(W) + (shootD() ? " · 촬영 " + mdw(shootD()) : ""));
  L.push("");
  rows.forEach(x => {
    const when = x.a ? (+x.a === +x.b ? mdw(x.a) : mdRange(x.a, x.b)) : "예식 " + relRange([x.n, x.n2]) + " 전";
    const kind = x.kind === "start" ? T.calStart : x.kind === "shoot" ? T.calShoot : T.calEnd;
    L.push("· " + when + " " + kind + " — " + x.w.name + (x.state === "past" ? " (시기 지남)" : ""));
  });
  if(none.length) L.push("· 시기 설명 없음 — " + none.map(w => w.name).join(", "));
  L.push("", "※ " + T.calStamp);
  if(OPEN) L.push(pageUrl());
  const msg = $("#msg");
  try { await navigator.clipboard.writeText(L.join("\n")); msg.textContent = T.copied; }
  catch(e){ msg.textContent = "복사하지 못했어요. 화면을 캡처해 주세요."; }
}

// --- 아래 상자: 후기 읽는 법 · 공식 자료 · 만든 방법 ---
function bottomBoxes(){
  const how = HOWTO.length ? `<details class="help"><summary>${esc(T.howTitle)}</summary><ul>${HOWTO.map(x => `<li>${esc(x.v)}${(x.s || []).filter(s => SRC[s]).map(s => ` <a class="mini" href="${esc(SRC[s].u)}" target="_blank" rel="noopener">${esc(SRC[s].t)}</a>`).join("")}</li>`).join("")}</ul></details>` : "";
  const safe = SAFE.length ? `<details class="help"><summary>${esc(T.safeTitle)}</summary><ol class="srcl">${SAFE.filter(s => SRC[s]).map(s => srcLi(SRC[s])).join("")}</ol></details>` : "";
  const about = `<details class="help"><summary>${esc(T.aboutTitle)}</summary><ul>${ABOUT.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
  return `<div class="boxes">${how}${safe}${about}</div>`;
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.soonTop)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.soonFor)}</p>
    <h1>${br(T.title)}</h1>
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
  history.replaceState({ sc: "home" }, "");
  render("home");
}
route();
window.__sn = { get S(){ return S; }, get VIEW(){ return VIEW; }, dueOf, waysFor };   // 화면 흐름 시험용
