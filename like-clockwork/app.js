// 결혼식 당일 타임테이블 ㊽: 예식 시각 · 예식 간격 · 이동 시간 → 일어날 시각부터 연회장 인사까지 거꾸로 계산
// 셈 core.js · 문구 text.js · 공통 기능 shared/common.js · 기획 docs/당일-타임테이블/기획.md · 조사 docs/당일-타임테이블/조사/조사.md
// 적은 내용은 이 기기(브라우저)에만 저장해요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/like-clockwork/?preview)
const OPEN = false;
// =========================================================

const KEY = "like-clockwork.v1";
const FLOW_KEY = "in-good-order.v2";   // 같은 폰에서 식순표를 만들었으면 예식 시각을 가져와요
const C = CORE;

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");
const MINUS = "−";
const dur = n => C.dur(n);
// 줄에 쓰는 시각: "06:20" (0시 전으로 넘어가면 "전날 23:40")
const clk = m => { const c = C.clock(m); return (c.prev ? T.prevDay + " " : "") + c.t; };

// ===== 저장 =====
function load(){ try { return C.clean(JSON.parse(localStorage.getItem(KEY))); } catch(e){ return null; } }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || C.blank();
function flowInfo(){
  try {
    const d = JSON.parse(localStorage.getItem(FLOW_KEY));
    if(!d || typeof d !== "object") return null;
    const info = d.info || {};
    const total = Array.isArray(d.items) ? d.items.reduce((a, it) => a + (parseInt(it && it.min, 10) || 0), 0) : 0;
    return { time: C.validTime(info.time) ? info.time : "", date: C.validDate(info.date) ? info.date : "", total };
  } catch(e){ return null; }
}
const FLOW = flowInfo();
let fromFlow = false;
if(!S.time && FLOW && FLOW.time){ S.time = FLOW.time; if(!S.date) S.date = FLOW.date; fromFlow = true; }

// 휴대폰은 공유 창, 안 되면 복사
async function shareOrCopy(text, msgEl, copiedText){
  if(navigator.share){
    try { await navigator.share({ text }); msgEl.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msgEl.textContent = ""; return; } }
  }
  try { await navigator.clipboard.writeText(text); msgEl.textContent = copiedText; }
  catch(e){ msgEl.textContent = text; }
}

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let screen = "";
function go(sc){ history.pushState({ sc }, ""); render(sc); }
function render(sc){
  if(sc !== "home" && sc !== "s1" && !S.time) sc = "s1";
  screen = sc;
  ({ home, s1, s2, s3, result })[sc]();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => { render(e.state && e.state.sc ? e.state.sc : "home"); });
function topBar(step){
  return `<div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span class="count">${esc(fm(T.stepOf, { i: step }))}</span></div>`;
}
function bindBack(){ $("#back").onclick = () => history.back(); }

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const started = !!S.time && !fromFlow;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${started
        ? `<button id="resume"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { time: C.korTime(C.parseHM(S.time)) }))}</span></button>`
        : `<button id="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>`}
    </div>
    <p class="note">${esc(T.note)}</p>
    ${started ? `<div class="reset"><button class="text-btn cover-link" id="reset">${esc(T.restart)}</button>
      <div class="reset-ask" id="resetAsk" hidden><p>${esc(T.restartAsk)}</p>
      <div class="reset-btns"><button class="chip-btn" id="resetYes">${esc(T.restartYes)}</button><button class="chip-btn" id="resetNo">${esc(T.restartNo)}</button></div></div></div>` : ""}
    ${foot()}`;
  const st = $("#start"), rs = $("#resume");
  if(st) st.onclick = () => go("s1");
  if(rs) rs.onclick = () => go("result");
  if(started){
    $("#reset").onclick = () => { $("#resetAsk").hidden = false; $("#reset").hidden = true; $("#resetYes").focus(); };
    $("#resetNo").onclick = () => { $("#resetAsk").hidden = true; $("#reset").hidden = false; };
    $("#resetYes").onclick = () => { S = C.blank(); try { localStorage.removeItem(KEY); } catch(e){} render("home"); };
  }
}

// ===== 시각 고르기 (시 · 분) =====
function timeSelects(idp){
  const m = C.parseHM(S.time);
  const h = m == null ? null : Math.floor(m / 60), mm = m == null ? null : m % 60;
  const hours = C.HOURS.slice(); if(h != null && !hours.includes(h)) { hours.push(h); hours.sort((a, b) => a - b); }
  const mins = C.MINS.slice(); if(mm != null && !mins.includes(mm)) { mins.push(mm); mins.sort((a, b) => a - b); }
  return `
    <div class="tsel">
      <select id="${idp}h" aria-label="${esc(T.timeAsk)} ${esc(T.hourPh)}">
        <option value=""${h == null ? " selected" : ""} disabled>${esc(T.hourPh)}</option>
        ${hours.map(x => `<option value="${x}"${x === h ? " selected" : ""}>${esc(fm(T.hourLabel, { ampm: x < 12 ? "오전" : "오후", h: x % 12 || 12 }))}</option>`).join("")}
      </select>
      <select id="${idp}m" aria-label="${esc(T.timeAsk)} ${esc(T.minPh)}">
        <option value=""${mm == null ? " selected" : ""} disabled>${esc(T.minPh)}</option>
        ${mins.map(x => `<option value="${x}"${x === mm ? " selected" : ""}>${esc(fm(T.minLabel, { m: String(x).padStart(2, "0") }))}</option>`).join("")}
      </select>
    </div>`;
}
function bindTimeSelects(idp, onChange){
  const hs = $("#" + idp + "h"), ms = $("#" + idp + "m");
  const upd = () => {
    if(hs.value === "" ) return;
    if(ms.value === ""){ ms.value = "0"; }
    S.time = C.hm(+hs.value, +ms.value); fromFlow = false; save(); onChange();
  };
  hs.onchange = upd; ms.onchange = upd;
}

// ===== 1. 예식 시각 =====
function s1(){
  document.body.classList.remove("is-cover");
  app.className = "wrap step";
  app.innerHTML = `
    ${topBar(1)}
    <h2 class="question">${br(T.s1Title)}</h2>
    <p class="lead2">${esc(T.s1Lead)}</p>
    ${fromFlow ? `<p class="note2">${esc(fm(T.fromFlow, { time: C.korTime(C.parseHM(S.time)) }))}</p>` : ""}
    <section class="sec">
      <h3>${esc(T.timeAsk)}</h3>
      ${timeSelects("t")}
    </section>
    <section class="sec">
      <h3>${esc(T.dateAsk)}</h3>
      <div class="date-row"><input class="in-date" id="date" type="date" value="${esc(S.date)}" aria-label="${esc(T.dateAsk)}">
      <button class="text-btn" id="dateClear"${S.date ? "" : " hidden"}>${esc(T.dateClear)}</button></div>
      <p class="hint2 after">${esc(T.dateHelp)}</p>
    </section>
    <div class="dock"><button class="btn main" id="next"${S.time ? "" : " disabled"}>${esc(T.next)}</button>
      <p class="hint2 center" id="need"${S.time ? " hidden" : ""}>${esc(T.s1Need)}</p></div>`;
  bindBack();
  bindTimeSelects("t", () => { $("#next").disabled = !S.time; $("#need").hidden = !!S.time; });
  const d = $("#date");
  d.onchange = d.oninput = () => { S.date = C.validDate(d.value) ? d.value : ""; $("#dateClear").hidden = !S.date; save(); };
  $("#dateClear").onclick = () => { S.date = ""; d.value = ""; $("#dateClear").hidden = true; save(); d.focus(); };
  $("#next").onclick = () => { if(S.time) { fromFlow = false; save(); go("s2"); } };
}

// ===== 2. 예식 간격 =====
function slotSeg(id){
  const opts = C.SLOTS.includes(S.slot) ? C.SLOTS : C.SLOTS.concat(S.slot).sort((a, b) => a - b);
  return `<div class="seg slots" role="group" aria-label="${esc(T.knob.slot)}" id="${id}">
    ${opts.map(n => `<button type="button" data-slot="${n}" aria-pressed="${S.slot === n}">${esc(fm(T.slotUnit, { n }))}</button>`).join("")}
  </div>`;
}
function s2(){
  document.body.classList.remove("is-cover");
  app.className = "wrap step";
  app.innerHTML = `
    ${topBar(2)}
    <h2 class="question">${br(T.s2Title)}</h2>
    <p class="lead2">${esc(T.s2Lead)}</p>
    <section class="sec">
      ${slotSeg("slots")}
      <dl class="s2-out" id="s2out"></dl>
      <p class="hint2 after" id="s2note"></p>
    </section>
    <button class="btn line unknown" id="unknown">${esc(T.slotUnknown)}</button>
    <div class="dock"><button class="btn main" id="next">${esc(T.next)}</button></div>`;
  bindBack();
  const paint = () => {
    const R = C.calc(S);
    $("#s2out").innerHTML = `
      <div><dt>${esc(T.s2Room)}</dt><dd>${esc(fm(T.s2RoomV, { room: clk(R.room) }))}</dd></div>
      <div><dt>${esc(T.s2Hall)}</dt><dd>${esc(fm(T.s2HallV, { hall: clk(R.hall) }))}</dd></div>`;
    $("#s2note").textContent = fm(T.s2Note, { arrive: dur(R.arrive) });
    $$("#slots button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.slot === S.slot));
  };
  $$("#slots button").forEach(b => { b.onclick = () => { S.slot = +b.dataset.slot; save(); paint(); }; });
  $("#unknown").onclick = () => { S.slot = C.SLOT_DEF; save(); go("s3"); };
  $("#next").onclick = () => go("s3");
  paint();
}

// ===== 숫자 칸 (분) =====
function ctrHtml(key, label, opt){
  const d = C.KNOBS[key], v = key === "arrive" ? C.arriveOf(S) : S.k[key];
  return `
    <div class="ctr" data-key="${key}">
      <button type="button" class="ctr-b" data-d="-1" aria-label="${esc(label)} ${d.step}분 줄이기"${v <= d.min ? " disabled" : ""}>${MINUS}</button>
      ${opt && opt.typing
        ? `<span class="ctr-in"><input class="ctr-n" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${v}" aria-label="${esc(label)} (분)"><i>${esc(T.unitMin)}</i></span>`
        : `<span class="ctr-v" aria-live="polite">${esc(dur(v))}</span>`}
      <button type="button" class="ctr-b" data-d="1" aria-label="${esc(label)} ${d.step}분 늘리기"${v >= d.max ? " disabled" : ""}>+</button>
    </div>`;
}
function setKnob(key, v){
  if(key === "arrive"){ S.k.arrive = C.clampKnob("arrive", v); return; }
  S.k[key] = C.clampKnob(key, v);
}
function getKnob(key){ return key === "arrive" ? C.arriveOf(S) : S.k[key]; }

// ===== 3. 이동 시간 =====
function s3(){
  document.body.classList.remove("is-cover");
  app.className = "wrap step";
  const row = (key, label, extra) => `
    <div class="trow" data-row="${key}">
      <p class="trow-name">${esc(label)}</p>
      ${ctrHtml(key, label, { typing: true })}
      ${extra || ""}
    </div>`;
  app.innerHTML = `
    ${topBar(3)}
    <h2 class="question">${br(T.s3Title)}</h2>
    <p class="lead2">${esc(T.s3Lead)}</p>
    <section class="sec">
      ${row("b.home", T.tBride)}
      <div class="trow g">
        <p class="trow-name">${esc(T.tGroomHead)}</p>
        <div class="seg two" role="group" aria-label="${esc(T.tGroomHead)}" id="tog">
          <button type="button" data-tog="0" aria-pressed="${!S.together}">${esc(T.together.no)}</button>
          <button type="button" data-tog="1" aria-pressed="${S.together}">${esc(T.together.yes)}</button>
        </div>
        <div class="g-home" id="gHome"${S.together ? " hidden" : ""}>
          <p class="trow-sub">${esc(T.tGroomHome)}</p>
          ${ctrHtml("g.home", T.tGroom, { typing: true })}
        </div>
        <p class="hint2 after" id="togHelp"${S.together ? "" : " hidden"}>${esc(T.togetherHelp)}</p>
      </div>
      ${row("toHall", T.tHall)}
    </section>
    <div class="dock"><button class="btn main" id="done">${esc(T.s3Done)}</button></div>`;
  bindBack();
  $$(".trow .ctr").forEach(box => bindTypingCtr(box));
  $$("#tog button").forEach(b => { b.onclick = () => {
    S.together = b.dataset.tog === "1"; save();
    $$("#tog button").forEach(x => x.setAttribute("aria-pressed", x === b));
    $("#gHome").hidden = S.together; $("#togHelp").hidden = !S.together;
  }; });
  $("#done").onclick = () => go("result");
}
function bindTypingCtr(box){
  const key = box.dataset.key, d = C.KNOBS[key], inp = $(".ctr-n", box), [mi, pl] = $$(".ctr-b", box);
  const sync = write => {
    const v = getKnob(key);
    if(write) inp.value = v;
    mi.disabled = v <= d.min; pl.disabled = v >= d.max;
  };
  $$(".ctr-b", box).forEach(b => { b.onclick = () => {
    const v = getKnob(key) + (+b.dataset.d) * d.step;
    setKnob(key, Math.round(v / d.step) * d.step); save(); sync(true);
  }; });
  inp.oninput = () => {
    const v = inp.value.replace(/[^0-9]/g, ""); if(v !== inp.value) inp.value = v;
    if(v !== ""){ setKnob(key, Math.min(+v, d.max)); save(); sync(false); }
  };
  inp.onfocus = () => { setTimeout(() => { try { inp.select(); } catch(e){} }, 0); };
  inp.onblur = () => { sync(true); };
}

// ===== 4. 결과: 타임테이블 =====
let openRow = "";
function rowsOf(R){
  const k = S.k;
  const B = [
    { id: "b.wake", t: R.bWake, label: T.r.wake, tip: T.tip.bWake, ed: ["b.ready"] },
    { id: "b.leave", t: R.bLeave, label: T.r.leave, sub: fm(T.r.leaveSub, { d: dur(k["b.home"]) }), tip: T.tip.bLeave, ed: ["b.home"] },
    { id: "b.shop", t: R.bShop, label: T.r.shop, sub: fm(T.r.shopSubB, { start: clk(R.bStart), d: dur(k["b.shop"]) }), tip: T.tip.bShop, ed: ["b.early", "b.shop"] }
  ];
  const G = S.together ? [
    { id: "g.with", t: R.gShop, label: T.r.withBride, sub: fm(T.r.withSub, { start: clk(R.gStart), d: dur(k["g.shop"]) }), tip: T.tip.gWith, ed: ["together", "g.shop"] }
  ] : [
    { id: "g.wake", t: R.gWake, label: T.r.wake, tip: T.tip.gWake, ed: ["g.ready", "together"] },
    { id: "g.leave", t: R.gLeave, label: T.r.leave, sub: fm(T.r.leaveSub, { d: dur(k["g.home"]) }), tip: T.tip.gLeave, ed: ["g.home", "together"] },
    { id: "g.shop", t: R.gShop, label: T.r.shop, sub: fm(T.r.shopSubG, { start: clk(R.gStart), d: dur(k["g.shop"]) }), tip: T.tip.gShop, ed: ["g.early", "g.shop"] }
  ];
  const roomAtArrive = R.room > R.T - S.slot;
  const Cc = [
    { id: "out", t: R.out, label: T.r.out, sub: fm(T.r.outSub, { d: dur(k.toHall) }), tip: T.tip.out, ed: ["toHall"] },
    { id: "hall", t: R.hall, label: T.r.hall, sub: fm(T.r.hallSub, { d: dur(R.arrive) }), ed: ["arrive"] },
    { id: "room", t: R.room, label: T.r.room, sub: roomAtArrive ? T.r.roomSubArrive : fm(T.r.roomSub, { slot: S.slot }), ed: ["slot"] },
    { id: "greet", t: R.greet, label: T.r.greet, sub: T.r.greetSub, ed: ["greet"] },
    { id: "ceremony", t: R.T, label: T.r.ceremony, sub: fm(T.r.ceremonySub, { d: dur(k.ceremony), end: clk(R.cerEnd) }), ed: ["time", "ceremony"], key: true },
    { id: "photo", t: R.cerEnd, label: T.r.photo, sub: fm(T.r.photoSub, { d: dur(k.photo) }), ed: ["photo"] },
    { id: "banquet", t: R.photoEnd, label: T.r.banquet, sub: fm(T.r.banquetSub, { d: dur(k.banquet), end: clk(R.end) }), ed: ["banquet"] }
  ];
  return { B, G, C: Cc };
}

function edHtml(row){
  const parts = row.ed.map(e => {
    if(e === "together") return `
      <div class="ed-item">
        <p class="ed-l">${esc(T.tGroomHead)}</p>
        <div class="seg two" role="group" aria-label="${esc(T.tGroom)}">
          <button type="button" data-tog="0" aria-pressed="${!S.together}">${esc(T.together.no)}</button>
          <button type="button" data-tog="1" aria-pressed="${S.together}">${esc(T.together.yes)}</button>
        </div>
        <p class="ed-why">${esc(T.togetherHelp)}</p>
      </div>`;
    if(e === "slot") return `
      <div class="ed-item">
        <p class="ed-l">${esc(T.knob.slot)}</p>
        ${slotSeg("edSlot")}
        <p class="ed-why">${esc(T.why.slot)}</p>
      </div>`;
    if(e === "time") return `
      <div class="ed-item">
        <p class="ed-l">${esc(T.knob.time)}</p>
        ${timeSelects("e")}
      </div>`;
    const d = C.KNOBS[e], v = getKnob(e);
    const isDef = e === "arrive" ? S.k.arrive == null : v === d.def;
    let why = T.why[e];
    if(e === "ceremony" && FLOW && FLOW.total) why += " " + fm(T.why.ceremonyFlow, { n: FLOW.total });
    const reset = e === "arrive"
      ? (isDef ? `<span class="ed-auto">${esc(T.autoArrive)}</span>` : `<button type="button" class="text-btn ed-reset" data-reset="${e}">${esc(T.toAuto)}</button>`)
      : (isDef ? "" : `<button type="button" class="text-btn ed-reset" data-reset="${e}">${esc(fm(T.toDefault, { d: dur(d.def) }))}</button>`);
    return `
      <div class="ed-item">
        <div class="ed-top"><p class="ed-l">${esc(T.knob[e])}</p>${ctrHtml(e, T.knob[e])}</div>
        <p class="ed-why">${esc(why)}</p>
        ${reset}
      </div>`;
  }).join("");
  return `<div class="ed no-img" id="ed-${row.id.replace(".", "-")}">${parts}
    <button type="button" class="text-btn ed-close">${esc(T.close)}</button></div>`;
}

function rowHtml(row){
  const open = openRow === row.id;
  const c = C.clock(row.t);
  return `
    <li class="tt-row${row.key ? " key" : ""}${open ? " open" : ""}">
      <button type="button" class="tt-btn" data-r="${row.id}" aria-expanded="${open}">
        <span class="tt-t">${c.prev ? `<small>${esc(T.prevDay)}</small>` : ""}${c.t}</span>
        <span class="tt-w"><b>${esc(row.label)}</b>${row.sub ? `<small>${esc(row.sub)}</small>` : ""}${row.tip ? `<em>${esc(row.tip)}</em>` : ""}</span>
        <span class="tt-chev no-img" aria-hidden="true">${esc(open ? T.editBtnOpen : T.editBtn)}</span>
      </button>
      ${open ? edHtml(row) : ""}
    </li>`;
}

function headLine(R){
  const d = C.korDate(S.date), t = fm(T.headTime, { time: C.korTime(R.T) });
  return d ? d + " " + t : t;
}
function wakeLine(R){
  return S.together ? fm(T.wakeTogether, { bw: clk(R.bWake) }) : fm(T.wakeBoth, { bw: clk(R.bWake), gw: clk(R.gWake) });
}

function cardHtml(R){
  const L = rowsOf(R);
  const sec = (title, rows, cls) => `
    <section class="tt-sec ${cls}">
      <h3 class="tt-h">${esc(title)}</h3>
      <ol class="tt-list">${rows.map(rowHtml).join("")}</ol>
    </section>`;
  return `
    <div class="head"><span class="kind">${esc(T.kind)}</span><span class="handle">@wed_voice.su</span></div>
    <h2 class="tt-title">${esc(headLine(R))}</h2>
    <p class="tt-wake">${esc(wakeLine(R))}</p>
    ${sec(T.secB, L.B, "b")}
    ${sec(T.secG, L.G, "g")}
    ${sec(T.secC, L.C, "c")}
    <div class="tip"><b>${esc(T.tipTitle)}</b><p>${esc(T.mcTip)}</p></div>
    <p class="cfoot">${esc(T.cardFoot)}</p>
    ${sign()}`;
}

function warnHtml(R){
  return R.warn.map(w => {
    const s = fm(T.warn[w], { start: clk(R.bStart), c: dur(S.k.ceremony), p: dur(S.k.photo), slot: S.slot });
    return `<div class="warn"><p>${esc(s)}</p></div>`;
  }).join("");
}
function askHtml(R){
  const shop = T.askShopList.map(s => fm(s, { bs: clk(R.bStart), gs: clk(R.gStart), out: clk(R.out) }));
  if(R.bStart < C.EARLY_FEE) shop.push(T.askShopEarly);
  const hall = T.askHallList.map(s => fm(s, { hall: clk(R.hall) }));
  return `
    <section class="sec ask">
      <h3>${esc(T.askTitle)}</h3>
      <p class="ask-who">${esc(T.askShop)}</p><ul>${shop.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      <p class="ask-who">${esc(T.askHall)}</p><ul>${hall.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
    </section>`;
}

let imgTimer = 0, imgPending = false;
function makeImage(){
  cardFile = null;
  if(typeof window.html2canvas !== "function"){ const b = $("#save"); if(b) b.hidden = true; return; }
  const el = $("#card"); if(!el) return;
  const name = T.imgName + (S.date ? "-" + S.date : "");
  const job = cardJob = (document.fonts ? document.fonts.ready : Promise.resolve())
    .then(() => window.html2canvas(el, {
      scale: 3, backgroundColor: getComputedStyle(document.body).backgroundColor, logging: false,
      onclone: doc => {
        doc.querySelectorAll("#card .no-img").forEach(x => x.remove());
        doc.querySelectorAll("#card .tt-row.open").forEach(x => x.classList.remove("open"));
        const c = doc.getElementById("card"); if(c) c.classList.add("printing");
      }
    }))
    .then(canvas => new Promise(res => canvas.toBlob(res, "image/png")))
    .then(blob => { if(job === cardJob && blob) cardFile = new File([blob], name + ".png", { type: "image/png" }); return cardFile; })
    .catch(() => null);
}

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap res";
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span>${esc(T.resTop)}</span></div>
    <div id="warns"></div>
    <p class="edit-hint">${esc(T.editHint)}</p>
    <article class="card tt" id="card"></article>
    <div id="ask"></div>
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">${esc(T.save)}</button>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="sendTxt">${esc(T.sendText)}</button>
        <button class="btn ghost" id="editTravel">${esc(T.editTravel)}</button>
        ${SITES.flow && SITES.flow.reel ? siteLink("flow", "btn ghost", esc(T.flowLink)) : ""}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
      </div>
    </div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $("#save").onclick = () => { if(imgPending){ clearTimeout(imgTimer); imgPending = false; makeImage(); } saveCard(); };
  $("#sendTxt").onclick = () => shareOrCopy(resultText(C.calc(S)), $("#msg"), T.copied);
  $("#editTravel").onclick = () => go("s3");
  draw(true);
}

// 카드 다시 그리기 (열린 줄 · 누른 버튼 자리 유지)
function draw(first, focusSel){
  const R = C.calc(S);
  if(!R){ render("s1"); return; }
  $("#warns").innerHTML = warnHtml(R);
  $("#card").innerHTML = cardHtml(R);
  $("#ask").innerHTML = askHtml(R);
  bindCard();
  if(focusSel){ const f = $(focusSel); if(f) f.focus(); }
  clearTimeout(imgTimer);
  if(first){ imgPending = false; makeImage(); }
  else { imgPending = true; cardFile = null; imgTimer = setTimeout(() => { imgPending = false; makeImage(); }, 350); }
  window.__lastR = R;
}

function bindCard(){
  $$("#card .tt-btn").forEach(b => { b.onclick = () => {
    const id = b.dataset.r;
    openRow = openRow === id ? "" : id;
    draw(false, `#card .tt-btn[data-r="${id}"]`);
    if(openRow){ const ed = $("#ed-" + id.replace(".", "-")); if(ed) ed.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
  }; });
  const ed = $("#card .ed"); if(!ed) return;
  const rowSel = `#card .tt-btn[data-r="${openRow}"]`;
  $$(".ctr", ed).forEach(box => {
    const key = box.dataset.key, d = C.KNOBS[key];
    $$(".ctr-b", box).forEach(b => { b.onclick = () => {
      setKnob(key, getKnob(key) + (+b.dataset.d) * d.step); save();
      const same = `#card .ctr[data-key="${key}"] .ctr-b[data-d="${b.dataset.d}"]`;
      draw(false, same);
      const f = $(same); if(f && f.disabled){ const o = $(`#card .ctr[data-key="${key}"] .ctr-b:not(:disabled)`); if(o) o.focus(); }
    }; });
  });
  $$("[data-reset]", ed).forEach(b => { b.onclick = () => {
    const key = b.dataset.reset;
    if(key === "arrive") S.k.arrive = null; else S.k[key] = C.KNOBS[key].def;
    save(); draw(false, rowSel);
  }; });
  $$("[data-tog]", ed).forEach(b => { b.onclick = () => {
    S.together = b.dataset.tog === "1"; save();
    openRow = S.together ? "g.with" : "g.wake";
    draw(false, `#card [data-tog="${b.dataset.tog}"]`);
  }; });
  $$("[data-slot]", ed).forEach(b => { b.onclick = () => { S.slot = +b.dataset.slot; save(); draw(false, `#card [data-slot="${S.slot}"]`); }; });
  if($("#eh", ed)) bindTimeSelects("e", () => draw(false, "#card #eh"));
  $(".ed-close", ed).onclick = () => { openRow = ""; draw(false, rowSel); };
}

// ===== 글로 보내기 =====
function resultText(R){
  const L = rowsOf(R), k = S.k;
  const line = (t, label, extra) => clk(t) + " " + label + (extra ? " (" + extra + ")" : "");
  const out = [fm(T.textHead, { head: headLine(R) }), ""];
  out.push(T.textSecB);
  out.push(line(R.bWake, T.r.wake));
  out.push(line(R.bLeave, T.r.leave, fm(T.r.leaveSub, { d: dur(k["b.home"]) })));
  out.push(line(R.bShop, T.r.shop, fm(T.textShop, { start: clk(R.bStart), d: dur(k["b.shop"]) })));
  out.push("", T.textSecG);
  if(S.together){
    out.push(line(R.gShop, T.r.withBride, fm(T.textShop, { start: clk(R.gStart), d: dur(k["g.shop"]) })));
  } else {
    out.push(line(R.gWake, T.r.wake));
    out.push(line(R.gLeave, T.r.leave, fm(T.r.leaveSub, { d: dur(k["g.home"]) })));
    out.push(line(R.gShop, T.r.shop, fm(T.textShop, { start: clk(R.gStart), d: dur(k["g.shop"]) })));
  }
  out.push("", T.textSecC);
  out.push(line(R.out, T.r.out, fm(T.textOut, { d: dur(k.toHall) })));
  out.push(line(R.hall, T.r.hall));
  out.push(line(R.room, T.r.room));
  out.push(line(R.greet, T.r.greet));
  out.push(line(R.T, T.r.ceremony, dur(k.ceremony)));
  out.push(line(R.cerEnd, T.r.photo, dur(k.photo)));
  out.push(line(R.photoEnd, T.r.banquet, fm(T.textBanquet, { d: dur(k.banquet), end: clk(R.end) })));
  return out.join("\n");
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
      ${siteLink("flow", "go", `<span>${esc(T.soonOther)}</span>`)}
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
window.__tt = { get S(){ return S; }, calc: () => C.calc(S), text: () => resultText(C.calc(S)) };   // 화면 흐름 시험용
