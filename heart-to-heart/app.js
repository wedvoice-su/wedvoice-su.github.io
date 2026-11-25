// 결혼 전 대화 카드 ㉔: 약속 → 주제 고르기 → 카드마다 (먼저 답하는 사람이 몰래 답 → 폰 넘기기 → 다음 사람 답 → 같이 열기
//   → 같아요 / 이야기해 볼 것 · 약속 한 줄) → 우리 약속 정리 (이미지 · 카톡 글) · 지난 대화 다시 보기
// 카드 cards.js · 문구 text.js · 공통 기능 shared/common.js · 조사 docs/결혼전-대화카드/조사/ · 기획 docs/결혼전-대화카드/기획.md
// 서버 없음: 답은 이 기기(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/heart-to-heart/?preview)
const OPEN = false;
// =========================================================

const KEY = "heartToHeart.v1";
const NAME_MAX = 8, LINE_MAX = 40, PACT_MAX = 50, Q_MAX = 120;

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const br = s => esc(s).replace(/\n/g, "<br>");
function today(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dFull(d){ const [y, m, dd] = String(d || "").split("-"); return y ? fm(T.dateFmt, { y, m: +m, d: +dd }) : ""; }
function dShort(d){ const [, m, dd] = String(d || "").split("-"); return m ? `${+m}월 ${+dd}일` : ""; }
// 이름 받침에 맞춰 조사 붙이기: {b:이에요} → "현우예요" · "지민이에요"
const JOSA = { "이에요": ["이에요", "예요"], "이": ["이", "가"], "은": ["은", "는"], "을": ["을", "를"], "과": ["과", "와"], "아": ["아", "야"] };
function jong(s){
  const ch = String(s).trim().slice(-1), c = ch.charCodeAt(0);
  if(c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
  if(/[0-9]/.test(ch)) return "013678".includes(ch);
  return false;
}
function withJosa(name, j){ const p = JOSA[j]; return p ? name + (jong(name) ? p[0] : p[1]) : name + j; }
function fm(s, o){
  return String(s).replace(/\{(\w+)(?::([^}]+))?\}/g, (_, k, j) => { const v = o && o[k] != null ? String(o[k]) : ""; return j ? withJosa(v, j) : v; });
}
const cleanName = s => String(s == null ? "" : s).replace(/[<>\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
const cleanLine = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const isDate = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const other = w => w === "a" ? "b" : "a";
// 먼저 답하는 사람: 카드마다 번갈아 (첫 카드는 첫 번째 이름)
const first = i => i % 2 === 0 ? "a" : "b";

// ===== 저장 (이 기기에만) =====
// S = { v, n: {a, b} 이름, L: 마지막에 한 주제, R: [한 번 한 기록] }
// 기록 = { t 주제, d0 시작한 날, d1 끝낸 날, n 그때 이름, o 카드 순서, e: {카드 id: 답}, at: {i, st} 어디까지, done }
// 답 = { q 질문, a, b (고른 보기 글 · 적은 한 줄, "" = 말로 함), m: "same" | "talk", p 약속 한 줄, s: 1 = 넘김 }
function blank(){ return { v: 1, n: { a: "", b: "" }, L: "", R: [], seq: 0 }; }
function cleanEntry(e){
  if(!e || typeof e !== "object") return null;
  const x = { q: cleanLine(e.q, Q_MAX) };
  if(e.s){ x.s = 1; return x; }
  ["a", "b"].forEach(k => { if(typeof e[k] === "string") x[k] = cleanLine(e[k], LINE_MAX); });
  if(e.m === "same" || e.m === "talk") x.m = e.m;
  if(typeof e.p === "string" && e.p.trim()) x.p = cleanLine(e.p, PACT_MAX);
  return x;
}
const STEPS = ["one", "pass", "two", "open"];
function cleanRound(r){
  if(!r || typeof r !== "object" || !TOPIC[r.t] || !isDate(r.d0)) return null;
  let o = Array.isArray(r.o) ? r.o.filter(id => typeof id === "string").slice(0, 40) : TOPIC[r.t].cards.map(c => c.id);
  if(!r.done) o = o.filter(id => CARD[id]);   // 하는 중인 기록은 지금 있는 카드만
  const e = {};
  if(r.e && typeof r.e === "object") o.forEach(id => { const x = cleanEntry(r.e[id]); if(x) e[id] = x; });
  const at = r.at && typeof r.at === "object" ? { i: Math.max(0, Math.min(o.length, Math.floor(+r.at.i) || 0)), st: STEPS.includes(r.at.st) ? r.at.st : "one" } : { i: 0, st: "one" };
  return { id: Number.isInteger(r.id) && r.id >= 0 ? r.id : -1, t: r.t, d0: r.d0, d1: isDate(r.d1) ? r.d1 : "", n: { a: cleanName(r.n && r.n.a), b: cleanName(r.n && r.n.b) }, o, e, at, done: r.done ? 1 : 0 };
}
function load(){
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if(!x || x.v !== 1) return null;
    const R = (Array.isArray(x.R) ? x.R : []).map(cleanRound).filter(Boolean).slice(-300);
    // 기록 번호(id)가 없거나 겹치면 새로 매겨요
    let seq = Math.max(Number.isInteger(x.seq) ? x.seq : 0, ...R.map(r => r.id + 1), 0);
    const used = new Set();
    R.forEach(r => { if(r.id < 0 || used.has(r.id)) r.id = seq++; used.add(r.id); });
    return { v: 1, n: { a: cleanName(x.n && x.n.a), b: cleanName(x.n && x.n.b) }, L: TOPIC[x.L] ? x.L : "", R, seq };
  } catch(e){ return null; }
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || blank();

// ===== 기록 계산 =====
const names = x => ({ a: (x && x.n.a) || S.n.a || T.nameA, b: (x && x.n.b) || S.n.b || T.nameB });
const both = e => !!e && !e.s && typeof e.a === "string" && typeof e.b === "string";
const doneN = x => x.o.filter(id => both(x.e[id])).length;
const skipN = x => x.o.filter(id => x.e[id] && x.e[id].s).length;
// 화면 주소(history)에는 기록 번호(id)를 넣고, 계산은 배열 자리(k)로 해요
const idx = id => S.R.findIndex(x => x.id === id);
function latest(t){ for(let k = S.R.length - 1; k >= 0; k--) if(S.R[k].t === t) return k; return -1; }
function prevDone(r){ const t = S.R[r].t; for(let k = r - 1; k >= 0; k--) if(S.R[k].t === t && S.R[k].done) return k; return -1; }
// i 다음부터 아직 같이 열지 않은 카드 (넘긴 카드 포함). 없으면 -1
function openAfter(r, i){
  const x = S.R[r];
  for(let j = i + 1; j < x.o.length; j++) if(CARD[x.o[j]] && !both(x.e[x.o[j]])) return j;
  return -1;
}
// 같은 보기를 골랐는지 ("아직 모르겠어"끼리는 같은 답으로 치지 않아요)
const sameAns = (c, e) => !!c && !c.line && both(e) && e.a === e.b && e.a !== T.unknown;
const shown = v => v === "" ? T.saidAloud : v;          // 같이 열 때
const kept = v => v === "" ? T.saidAloudPast : v;        // 기록 · 정리 · 이미지

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let SC = { sc: "home" }, promised = false, restFrom = null;
function go(sc, x){ const st = Object.assign({ sc }, x || {}); history.pushState(st, ""); render(st); }
function swap(sc, x){ const st = Object.assign({ sc }, x || {}); history.replaceState(st, ""); render(st); }
function render(st){
  SC = st;
  document.body.classList.remove("is-cover");
  const v = VIEWS[st.sc] || home;
  v(st);
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => render(e.state || { sc: "home" }));
function cover(cls){ document.body.classList.add("is-cover"); app.className = "wrap cover" + (cls ? " " + cls : ""); }
function plain(cls){ document.body.classList.remove("is-cover"); app.className = "wrap" + (cls ? " " + cls : ""); }

const ICON = {
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A10.6 10.6 0 0112 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.2 6.6C4.2 8 2.7 10 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  phone: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="10" width="22" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 44h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M36 30h20m-7-7l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
};

// ===== 1. 첫 화면 =====
function resumable(){
  const k = latest(S.L);
  return k >= 0 && !S.R[k].done ? k : -1;
}
function home(){
  cover();
  const k = resumable(), x = k >= 0 ? S.R[k] : null;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topFree)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${x ? `<button id="resume" class="hot"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { topic: TOPIC[x.t].name, n: Math.min(x.at.i + 1, x.o.length), total: x.o.length }))}</span></button>` : ""}
      <button id="start"><span>${esc(x ? T.otherTopic : T.start)}</span>${x ? "" : `<span class="q">${esc(T.startQ)}</span>`}</button>
    </div>
    ${S.R.length ? `<button class="cover-link" id="past">${esc(T.pastLink)}</button>` : ""}
    <p class="note">${esc(T.coverNote)}</p>
    ${foot()}`;
  if(x) $("#resume").onclick = () => resume(k);
  $("#start").onclick = () => promised ? go("topics") : go("promise");
  if($("#past")) $("#past").onclick = () => go("past");
}

// ===== 2. 약속 =====
function promise(){
  plain("prom-v");
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.back)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(T.promTitle)}</h2>
    <ol class="prom">${T.prom.map(([b, s], i) => `<li><span class="pn">${i + 1}</span><div><b>${esc(b)}</b><p>${esc(s)}</p></div></li>`).join("")}</ol>
    <section class="sec names">
      <h3>${esc(T.namesTitle)}</h3>
      <label class="nm-row"><span class="nm-k">${esc(T.nameA)}</span><input id="nmA" class="nm" maxlength="${NAME_MAX}" autocomplete="off" placeholder="${esc(T.namePh)}" value="${esc(S.n.a)}"></label>
      <label class="nm-row"><span class="nm-k">${esc(T.nameB)}</span><input id="nmB" class="nm" maxlength="${NAME_MAX}" autocomplete="off" placeholder="${esc(T.namePh)}" value="${esc(S.n.b)}"></label>
    </section>
    <div class="btns go-btns">
      <button class="btn main" id="go">${esc(T.promGo)}</button>
      <p class="hint2 center">${esc(T.promNote)}</p>
    </div>
    ${foot()}`;
  const keep = () => { S.n = { a: cleanName($("#nmA").value), b: cleanName($("#nmB").value) }; save(); };
  $$("input.nm").forEach(inp => { inp.oninput = keep; });
  $("#back").onclick = () => go("home");
  $("#go").onclick = () => { keep(); promised = true; go("topics"); };
}

// ===== 3. 주제 고르기 =====
function topics(){
  plain("topics-v");
  const anyRound = S.R.length > 0;
  const recId = (TOPICS.find(t => latest(t.id) < 0) || {}).id;
  const anyDone = S.R.some(x => doneN(x) > 0);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.back)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(T.topTitle)}</h2>
    <p class="lead2">${esc(T.topLead)}</p>
    ${anyDone || anyRound ? `<div class="quick">
      ${anyDone ? `<button class="btn ghost" id="all">${esc(T.topAll)}</button>` : ""}
      ${anyRound ? `<button class="btn ghost" id="past">${esc(T.topPast)}</button>` : ""}
    </div>` : ""}
    <div class="topics">${TOPICS.map(t => {
      const k = latest(t.id), x = k >= 0 ? S.R[k] : null;
      let state = "new", meta = fm(T.topMeta, { n: t.cards.length, min: t.min });
      if(x && x.done){ state = "done"; meta = fm(T.topDone, { date: dShort(x.d1 || x.d0) }); }
      else if(x){ state = "doing"; meta = fm(T.topDoing, { n: Math.min(x.at.i + 1, x.o.length), total: x.o.length }); }
      const badge = t.id === recId ? `<span class="badge-rec">${esc(!anyRound && t.id === "warm" ? T.topFirst : T.topNext)}</span>` : "";
      return `<button class="topic ${state}" data-t="${t.id}">
        <span class="tp-main"><b>${esc(t.name)}</b><small>${t.sub.split(" · ").map(w => `<span class="nw">${esc(w)}</span>`).join(" · ")}</small></span>
        <span class="tp-side">${badge}<span class="tp-meta">${esc(meta)}</span></span>
      </button>`;
    }).join("")}</div>
    <div class="btns sub-btns">
      <button class="text-btn btn-link" id="prom">${esc(T.topPromise)}</button>
    </div>
    ${foot()}`;
  $("#back").onclick = () => go("home");
  $("#prom").onclick = () => go("promise");
  if($("#all")) $("#all").onclick = () => go("all");
  if($("#past")) $("#past").onclick = () => go("past");
  $$(".topic").forEach(b => b.onclick = () => {
    const t = b.dataset.t, k = latest(t);
    if(k >= 0 && S.R[k].done) go("sum", { r: S.R[k].id }); else startTopic(t);
  });
}
function newRound(t){
  S.R.push({ id: S.seq++, t, d0: today(), d1: "", n: { a: S.n.a, b: S.n.b }, o: TOPIC[t].cards.map(c => c.id), e: {}, at: { i: 0, st: "one" }, done: 0 });
  S.L = t; save();
  return S.R.length - 1;
}
function startTopic(t){
  let k = latest(t);
  if(k < 0 || S.R[k].done) k = newRound(t);
  resume(k);
}
// 이어서: 두 번째 사람 차례였으면 "폰 넘기기"부터 (첫 사람 답이 보이지 않게)
function resume(k){
  const x = S.R[k]; S.L = x.t; save();
  let i = x.at.i, st = x.at.st === "two" ? "pass" : x.at.st;
  if(i >= x.o.length || !CARD[x.o[i]]){ i = openAfter(k, -1); st = "one"; }
  if(i < 0){ go("sum", { r: x.id }); return; }
  go("card", { r: x.id, i, st });
}

// ===== 4. 카드: 답하기 · 폰 넘기기 · 같이 열기 =====
function cardView(st){
  const k = idx(st.r), x = S.R[k];
  const cid = x && x.o[st.i], c = cid && CARD[cid];
  if(!c){ swap("topics"); return; }
  const f = first(st.i), s2 = other(f);
  let step = STEPS.includes(st.st) ? st.st : "one", e = x.e[cid];
  const hasF = !!e && !e.s && typeof e[f] === "string";
  if(step === "open" && !both(e)) step = hasF ? "pass" : "one";
  if((step === "pass" || step === "two") && !hasF) step = "one";
  if(step !== st.st){ st = Object.assign({}, st, { st: step }); history.replaceState(st, ""); SC = st; }
  // 앞 단계로 돌아오면 그 뒤 답은 지워요 (다시 고르기)
  if(step === "one") delete x.e[cid];
  if(step === "pass" || step === "two"){ delete e[s2]; delete e.m; delete e.p; }
  x.at = { i: st.i, st: step }; S.L = x.t; save();
  const ctx = { k, x, st, c, cid, f, s2, nm: names(x), top: TOPIC[x.t] };
  if(step === "pass") passView(ctx);
  else if(step === "open") openView(ctx);
  else answerView(ctx, step === "one" ? f : s2);
}
function cardTop(ctx, dark){
  const { st, x, top } = ctx, n = x.o.length;
  return `
    <div class="ctop">
      ${dark ? "<span></span>" : `<button class="top-btn" id="toTopics">‹ ${esc(T.toTopics)}</button>`}
      <button class="rest-btn" id="rest">${ICON.pause}<span>${esc(T.rest)}</span></button>
    </div>
    <div class="cbar"><span class="cname">${esc(top.name)}</span><span class="ccount">${st.i + 1} / ${n}</span></div>
    ${dark ? "" : `<div class="prog" aria-hidden="true"><i style="width:${Math.round((st.i + 1) / n * 100)}%"></i></div>`}`;
}
function bindTop(ctx){
  const t = $("#toTopics"); if(t) t.onclick = () => go("topics");
  $("#rest").onclick = () => { restFrom = SC; go("rest", { r: ctx.st.r }); };
}
function answerView(ctx, who){
  plain("ans-v");
  const { c, st, x, cid, nm } = ctx, step = st.st, ow = other(who);
  const opts = c.line ? [] : c.o.concat(c.unk ? [T.unknown] : []);
  app.innerHTML = `
    ${cardTop(ctx)}
    <div class="turn">${ICON.eye}<div><b>${esc(fm(T.turn, { who: nm[who] }))}</b><span>${esc(fm(T.turnSub, { other: nm[ow] }))}</span></div></div>
    <h2 class="question q-card">${esc(c.q)}</h2>
    ${c.line ? `
      <div class="line-in"><input id="ln" maxlength="${LINE_MAX}" autocomplete="off" enterkeyhint="done" placeholder="${esc(c.ph || T.linePh)}" aria-label="${esc(c.q)}"><span class="cnt" id="cnt">0 / ${LINE_MAX}</span></div>
      <p class="hint2 line-note">${esc(T.lineNote)}</p>
    ` : `
      <p class="hint2">${esc(T.pickOne)}</p>
      <div class="opts" role="radiogroup" aria-label="${esc(c.q)}">${opts.map((o, i) =>
        `<button class="opt${o === T.unknown ? " unk" : ""}" role="radio" aria-checked="false" data-i="${i}"><span class="box">${CHECK}</span><span class="ot">${esc(o)}</span></button>`).join("")}</div>
    `}
    <div class="dock${c.line ? " stay" : ""}">
      <p class="msg" id="msg" role="status"></p>
      <button class="btn main wait" id="ok">${esc(step === "one" ? (c.line ? T.goPassLine : T.goPass) : T.goOpen)}</button>
      ${c.line ? `<button class="btn line" id="say">${esc(T.lineSay)}</button>` : ""}
      <button class="text-btn btn-link" id="skip">${esc(T.skip)}</button>
    </div>
    ${foot()}`;
  bindTop(ctx);
  let sel = null;
  const msg = $("#msg");
  const submit = v => {
    const e = x.e[cid] || { q: c.q };
    e.q = c.q; e[who] = v; x.e[cid] = e; save();
    go("card", { r: st.r, i: st.i, st: step === "one" ? "pass" : "open" });
  };
  if(c.line){
    const inp = $("#ln"), cnt = $("#cnt");
    inp.oninput = () => { cnt.textContent = `${inp.value.length} / ${LINE_MAX}`; const has = !!inp.value.trim(); $("#ok").classList.toggle("wait", !has); if(has) msg.textContent = ""; };
    inp.onkeydown = ev => { if(ev.key === "Enter"){ ev.preventDefault(); inp.blur(); } };
    $("#ok").onclick = () => { const v = cleanLine(inp.value, LINE_MAX); if(!v){ msg.textContent = T.needLine; inp.focus(); return; } submit(v); };
    $("#say").onclick = () => submit("");
  } else {
    $$(".opt").forEach(b => b.onclick = () => {
      sel = opts[+b.dataset.i];
      $$(".opt").forEach(o => { const on = o === b; o.classList.toggle("on", on); o.setAttribute("aria-checked", on); });
      $("#ok").classList.remove("wait"); msg.textContent = "";
    });
    $("#ok").onclick = () => { if(sel == null){ msg.textContent = T.needPick; return; } submit(sel); };
  }
  $("#skip").onclick = () => { x.e[cid] = { q: c.q, s: 1 }; save(); nextCard(ctx.k, st.i); };
}
function passView(ctx){
  cover("pass-v");
  const { st, nm, f, s2 } = ctx, o = { a: nm[f], b: nm[s2] };
  app.innerHTML = `
    ${cardTop(ctx, true)}
    <div class="pass-ic">${ICON.phone}</div>
    <h1 class="pass-h">${br(fm(T.passTitle, o))}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(fm(T.passLead, o))}</p>
    <div class="pick"><button id="go" class="fill"><span>${esc(fm(T.passGo, o))}</span></button></div>
    <button class="cover-link" id="redo">‹ ${esc(fm(T.passRedo, o))}</button>
    ${foot()}`;
  bindTop(ctx);
  $("#go").onclick = () => go("card", { r: st.r, i: st.i, st: "two" });
  $("#redo").onclick = () => go("card", { r: st.r, i: st.i, st: "one" });
}
function openView(ctx){
  plain("open-v");
  const { c, st, x, cid, nm } = ctx, e = x.e[cid];
  const same = sameAns(c, e), bothUnk = !c.line && e.a === T.unknown && e.b === T.unknown;
  if(!c.share && !e.m){ e.m = same ? "same" : "talk"; save(); }
  const last = openAfter(ctx.k, st.i) < 0;
  const hint = bothUnk ? T.talkUnk : c.hint || (same ? T.talkSame : T.talkDefault[st.i % T.talkDefault.length]);
  const pk = prevDone(ctx.k), pe = pk >= 0 ? S.R[pk].e[cid] : null, pn = pk >= 0 ? names(S.R[pk]) : null;
  const badge = c.line ? "" : same ? `<p class="verdict ok">✓ ${esc(T.sameBadge)}</p>` : bothUnk ? `<p class="verdict unk">${esc(T.unkBadge)}</p>` : `<p class="verdict diff">${esc(T.diffBadge)}</p>`;
  app.innerHTML = `
    ${cardTop(ctx)}
    <p class="oq">${esc(c.q)}</p>
    <div class="ans${same ? " same" : ""}">
      <div class="an pa"><span class="who">${esc(nm.a)}</span><b>${esc(shown(e.a))}</b></div>
      <div class="an pb"><span class="who">${esc(nm.b)}</span><b>${esc(shown(e.b))}</b></div>
    </div>
    ${badge}
    <div class="talk">${ICON.talk}<p>${esc(hint)}</p></div>
    ${both(pe) ? `<p class="last"><b>${esc(fm(T.lastTime, { date: dFull(S.R[pk].d1 || S.R[pk].d0) }))}</b> ${esc(pn.a)}: ${esc(kept(pe.a))} · ${esc(pn.b)}: ${esc(kept(pe.b))}</p>` : ""}
    ${c.share ? "" : `
      <div class="mark">
        <p class="mark-q">${esc(T.markQ)}</p>
        <div class="mark-btns">
          <button data-m="same" aria-pressed="${e.m === "same"}">${esc(T.markSame)}</button>
          <button data-m="talk" aria-pressed="${e.m === "talk"}">${esc(T.markTalk)}</button>
        </div>
      </div>`}
    <div class="pact">
      <button class="pact-add" id="pactAdd"${e.p ? " hidden" : ""}>${esc(T.pactAdd)}</button>
      <div class="pact-in"${e.p ? "" : " hidden"}>
        <label for="pact">${esc(T.pactLabel)}</label>
        <input id="pact" maxlength="${PACT_MAX}" autocomplete="off" enterkeyhint="done" placeholder="${esc(T.pactPh)}" value="${esc(e.p || "")}">
      </div>
    </div>
    <div class="dock stay">
      <button class="btn main" id="next">${esc(last ? T.toSum : T.next)} →</button>
    </div>
    ${foot()}`;
  bindTop(ctx);
  $$(".mark-btns button").forEach(b => b.onclick = () => {
    e.m = b.dataset.m; save();
    $$(".mark-btns button").forEach(o => o.setAttribute("aria-pressed", o === b));
  });
  const inp = $("#pact");
  $("#pactAdd").onclick = () => { $("#pactAdd").hidden = true; $(".pact-in").hidden = false; inp.focus(); };
  inp.oninput = () => { const v = cleanLine(inp.value, PACT_MAX); if(v) e.p = v; else delete e.p; save(); };
  inp.onkeydown = ev => { if(ev.key === "Enter"){ ev.preventDefault(); inp.blur(); } };
  $("#next").onclick = () => nextCard(ctx.k, st.i);
}
function nextCard(k, i){
  const x = S.R[k], j = openAfter(k, i);
  if(j >= 0){ go("card", { r: x.id, i: j, st: "one" }); return; }
  x.done = 1; x.d1 = today(); x.at = { i: x.o.length, st: "one" }; save();
  go("sum", { r: x.id, fin: 1 });
}

// ===== 5. 잠깐 쉬기 =====
function rest(st){
  cover("rest-v");
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span></span></div>
    <h1 class="rest-h">${br(T.restTitle)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.restLead)}</p>
    <p class="rest-tip">${esc(T.restTip)}</p>
    <div class="pick">
      <button id="back" class="fill"><span>${esc(T.restBack)}</span></button>
      <button id="sum"><span>${esc(T.restSum)}</span></button>
      <button id="home"><span>${esc(T.restHome)}</span></button>
    </div>
    ${foot()}`;
  $("#back").onclick = () => {
    if(restFrom && restFrom.sc === "card"){ restFrom = null; history.back(); }
    else if(idx(st.r) >= 0) resume(idx(st.r)); else go("topics");
  };
  $("#sum").onclick = () => idx(st.r) >= 0 ? go("sum", { r: st.r }) : go("topics");
  $("#home").onclick = () => go("home");
}

// ===== 6. 정리 (우리 약속) =====
// 정리 줄 만들기: rounds = [기록 번호], tag = 주제 이름을 붙일지 (모아 보기)
function collect(rounds, tag, withShare){
  const out = { pact: [], same: [], talk: [], share: [] };
  rounds.forEach(k => {
    const x = S.R[k], nm = names(x), tn = TOPIC[x.t].name;
    x.o.forEach(id => {
      const e = x.e[id], c = CARD[id];
      if(!both(e)) return;
      const lbl = (c && c.short) || e.q, t = tag ? tn : "";
      const pair = { a: nm.a, va: kept(e.a), b: nm.b, vb: kept(e.b) };
      if(e.p){ out.pact.push({ t, lbl, text: e.p }); return; }   // 약속을 적은 카드는 '우리 약속'에만
      const isShare = c ? c.share : !e.m;
      if(isShare){ if(withShare) out.share.push(Object.assign({ t, lbl }, pair)); return; }
      if(e.m === "talk") out.talk.push(Object.assign({ t, lbl }, pair));
      else out.same.push(Object.assign({ t, lbl }, e.a === e.b ? { text: kept(e.a) } : { text: T.sameTalked }));
    });
  });
  return out;
}
const hasAny = g => g.pact.length + g.same.length + g.talk.length + g.share.length > 0;
function itemHTML(it){
  const tg = it.t ? `<span class="tg">${esc(it.t)}</span>` : "";
  const body = it.text != null ? `<p>${esc(it.text)}</p>`
    : `<p class="duo"><span><i class="pa">${esc(it.a)}</i> ${esc(it.va)}</span><span><i class="pb">${esc(it.b)}</i> ${esc(it.vb)}</span></p>`;
  return `<li>${tg}<b class="lbl">${esc(it.lbl)}</b>${body}</li>`;
}
function cardHTML(g, head){
  const sec = (k, title, list) => list.length ? `<section class="pc-sec s-${k}"><h3>${esc(title)}</h3><ul>${list.map(itemHTML).join("")}</ul></section>` : "";
  return `
    <article class="card pc" id="card">
      <div class="head"><span class="kind">${esc(T.cardKind)}</span><span class="handle">@wed_voice.su</span></div>
      <h2 class="pc-names">${esc(head.a)} <span class="heart">♥</span> ${esc(head.b)}</h2>
      <p class="pc-date">${esc(head.date)}</p>
      ${sec("pact", T.secPact, g.pact)}
      ${sec("same", T.secSame, g.same)}
      ${sec("talk", T.secTalk, g.talk)}
      ${sec("share", T.secShare, g.share)}
      <p class="pc-foot">${esc(T.cardFoot)}</p>
      ${sign()}
    </article>`;
}
function cardText(g, head){
  const L = [fm(T.txHead, { a: head.a, b: head.b, date: head.date })];
  const line = it => `- ${it.t ? `[${it.t}] ` : ""}${it.lbl}: ${it.text != null ? it.text : `${it.a} ${it.va} / ${it.b} ${it.vb}`}`;
  [[T.secPact, g.pact], [T.secSame, g.same], [T.secTalk, g.talk], [T.secShare, g.share]].forEach(([title, list]) => {
    if(!list.length) return;
    L.push("", "■ " + title); list.forEach(it => L.push(line(it)));
  });
  L.push("", T.txFoot);
  return L.join("\n");
}
function saveBlock(){
  return `
    <div class="after btns">
      <button class="btn main" id="save">${esc(T.save)}</button>
      <button class="btn ghost" id="copy">${esc(T.copyTxt)}</button>
      <p class="msg" id="msg" role="status"></p>
      <textarea id="txt" class="txt" rows="8" readonly hidden></textarea>
      <p class="hint2 center">${esc(T.saveNote)}</p>
    </div>`;
}
function bindSave(text, file){
  $("#save").onclick = saveCard;
  $("#copy").onclick = async () => {
    const msg = $("#msg"), ta = $("#txt");
    try { await navigator.clipboard.writeText(text); msg.textContent = T.copied; ta.hidden = true; }
    catch(e){ msg.textContent = T.copyFail; ta.value = text; ta.hidden = false; ta.focus(); ta.select(); }
  };
  prepareImage(file);
}
const vowsBox = () => (SITES.vows && (SITES.vows.reel || SITES.vows.direct))
  ? `<div class="sec vows"><p>${esc(T.vowsLead)}</p>${siteLink("vows", "btn line", esc(T.vowsBtn))}</div>` : "";
function delBox(id, label, ask){
  return `<div class="del-box">
      <button class="text-btn btn-link" id="${id}">${esc(label)}</button>
      <div class="del-ask" id="${id}Ask" hidden><p>${esc(ask)}</p><div class="del-btns"><button class="btn line" id="${id}No">${esc(T.delNo)}</button><button class="btn danger" id="${id}Yes">${esc(T.delYes)}</button></div></div>
    </div>`;
}
function bindDel(id, yes){
  $("#" + id).onclick = () => { $("#" + id).hidden = true; $("#" + id + "Ask").hidden = false; };
  $("#" + id + "No").onclick = () => { $("#" + id).hidden = false; $("#" + id + "Ask").hidden = true; };
  $("#" + id + "Yes").onclick = yes;
}
function sum(st){
  const k = idx(st.r), x = S.R[k];
  if(!x){ swap("topics"); return; }
  plain("sum-v");
  const top = TOPIC[x.t], nm = names(x), g = collect([k], false, true);
  const date = x.d1 || x.d0;
  const head = { a: nm.a, b: nm.b, date: fm(T.cardDate, { date: dFull(date), topic: top.name }) };
  const title = !x.done ? fm(T.sumSoFar, { topic: top.name }) : st.fin ? fm(T.sumDone, { topic: top.name }) : fm(T.sumPast, { topic: top.name, date: dFull(date) });
  const skipped = skipN(x), more = openAfter(k, -1) >= 0;
  const isLatest = latest(x.t) === k;
  // 지난번과 달라진 답
  const pk = prevDone(k), px = pk >= 0 ? S.R[pk] : null;
  const changed = px ? x.o.filter(id => both(x.e[id]) && both(px.e[id]) && (x.e[id].a !== px.e[id].a || x.e[id].b !== px.e[id].b)) : [];
  // 다음 주제: 아직 안 끝낸 첫 주제
  const nextT = st.fin && x.done && isLatest ? TOPICS.find(t => { const kk = latest(t.id); return kk < 0 || !S.R[kk].done; }) : null;
  const allDone = st.fin && x.done && isLatest && !nextT;
  const pn = px ? names(px) : null;
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toTopics">‹ ${esc(T.toTopicList)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(title)}</h2>
    ${hasAny(g) ? `<p class="lead2">${esc(T.sumLead)}</p>` : ""}
    ${changed.length ? `<button class="changed" id="chg">${esc(fm(T.changed, { date: dShort(px.d1 || px.d0), n: changed.length }))} <span>${esc(T.changedSee)} ›</span></button>` : ""}
    ${hasAny(g) ? cardHTML(g, head) + saveBlock() : `<div class="sec empty"><p>${esc(T.emptySum)}</p></div>`}
    ${skipped && x.done && isLatest ? `<div class="sec skip-box"><h3>${esc(fm(T.skipped, { n: skipped }))}</h3><p>${esc(T.skippedLead)}</p><button class="btn line" id="redoSkip">${esc(T.skippedGo)}</button></div>` : ""}
    ${!x.done && more ? `<div class="btns next-box"><button class="btn accent" id="cont">${esc(T.continueGo)}</button></div>` : ""}
    ${nextT ? `<div class="btns next-box"><button class="btn accent" id="nextT">${esc(fm(T.nextTopic, { topic: nextT.name }))} →</button></div>` : ""}
    ${allDone ? `<div class="sec"><p>${esc(T.allTopicsDone)}</p></div>` : ""}
    ${doneN(x) ? `<details class="help detail"><summary>${esc(T.detail)}</summary><ol class="dl">${x.o.map(id => {
      const e = x.e[id], c = CARD[id]; if(!e) return "";
      const q = esc((c && c.q) || e.q);
      if(!both(e)) return `<li class="dl-skip"><p class="dq">${q}</p><p class="dm">${esc(T.skippedTag)}</p></li>`;
      const pe = px && px.e[id], ch = changed.includes(id);
      return `<li><p class="dq">${q}${ch ? ` <em class="chg">${esc(T.changedTag)}</em>` : ""}</p>
        <p class="da"><i class="pa">${esc(nm.a)}</i> ${esc(kept(e.a))}</p><p class="da"><i class="pb">${esc(nm.b)}</i> ${esc(kept(e.b))}</p>
        ${e.m ? `<p class="dm ${e.m}">${esc(e.m === "same" ? T.markSame : T.markTalk)}</p>` : ""}
        ${e.p ? `<p class="dp">${esc(T.secPact)} · ${esc(e.p)}</p>` : ""}
        ${ch && both(pe) ? `<p class="dold">${esc(fm(T.lastTime, { date: dShort(px.d1 || px.d0) }))} — ${esc(pn.a)} ${esc(kept(pe.a))} · ${esc(pn.b)} ${esc(kept(pe.b))}</p>` : ""}
      </li>`;
    }).join("")}</ol></details>` : ""}
    ${g.pact.length ? vowsBox() : ""}
    ${x.done && isLatest && !st.fin ? `<div class="sec redo-box"><button class="btn line" id="redo">${esc(T.redo)}</button><p class="hint2">${esc(T.redoSub)}</p></div>` : ""}
    ${delBox("del", T.del, T.delAsk)}
    ${foot()}`;
  $("#toTopics").onclick = () => go("topics");
  if($("#chg")) $("#chg").onclick = () => { const d = $("details.detail"); d.open = true; d.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); };
  if(hasAny(g)) bindSave(cardText(g, head), fm(T.fileName, { topic: top.name.replace(/\s*·\s*/g, "-").replace(/\s+/g, ""), date }));
  if($("#redoSkip")) $("#redoSkip").onclick = () => { x.done = 0; save(); const j = openAfter(k, -1); go("card", { r: x.id, i: j, st: "one" }); };
  if($("#cont")) $("#cont").onclick = () => resume(k);
  if($("#nextT")) $("#nextT").onclick = () => startTopic(nextT.id);
  if($("#redo")) $("#redo").onclick = () => resume(newRound(x.t));
  bindDel("del", () => {
    S.R.splice(k, 1);
    if(latest(S.L) < 0) S.L = "";
    save();
    history.replaceState({ sc: "topics" }, ""); render({ sc: "topics" });
  });
}

// ===== 7. 우리 약속 모아 보기 =====
function all(){
  plain("sum-v all-v");
  const ks = TOPICS.map(t => latest(t.id)).filter(k => k >= 0 && doneN(S.R[k]) > 0);
  const g = collect(ks, true, false), nm = names(null), d = today();
  const head = { a: nm.a, b: nm.b, date: fm(T.allDate, { date: dFull(d) }) };
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toTopics">‹ ${esc(T.toTopicList)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(T.allTitle)}</h2>
    ${hasAny(g) ? `<p class="lead2">${esc(T.allLead)}</p>${cardHTML(g, head)}${saveBlock()}${g.pact.length ? vowsBox() : ""}`
      : `<div class="sec empty"><p>${esc(T.allEmpty)}</p></div>`}
    ${foot()}`;
  $("#toTopics").onclick = () => go("topics");
  if(hasAny(g)) bindSave(cardText(g, head), fm(T.allFile, { date: d }));
}

// ===== 8. 지난 대화 다시 보기 =====
function past(st){
  plain("past-v");
  const days = {};
  S.R.forEach((x, k) => { (days[x.d0] = days[x.d0] || []).push(k); });
  const order = Object.keys(days).sort().reverse();
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toTopics">‹ ${esc(T.toTopicList)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(T.pastTitle)}</h2>
    ${order.length ? `<p class="lead2">${esc(T.pastLead)}</p>` : `<div class="sec empty"><p>${esc(st.cleared ? T.pastCleared : T.pastEmpty)}</p></div>`}
    ${order.map(d => `<section class="sec past-day"><h3>${esc(dFull(d))}</h3>${days[d].slice().reverse().map(k => {
      const x = S.R[k];
      const meta = x.done ? fm(T.pastDone, { n: doneN(x) }) : fm(T.pastDoing, { n: doneN(x), total: x.o.length });
      return `<button class="past-row${x.done ? " done" : ""}" data-r="${x.id}"><b>${esc(TOPIC[x.t].name)}</b><span>${esc(meta)}</span><span class="chev" aria-hidden="true">›</span></button>`;
    }).join("")}</section>`).join("")}
    ${order.length ? delBox("clear", T.pastClear, T.pastClearAsk) : ""}
    ${foot()}`;
  $("#toTopics").onclick = () => go("topics");
  $$(".past-row").forEach(b => b.onclick = () => go("sum", { r: +b.dataset.r }));
  if(order.length) bindDel("clear", () => {
    S = blank(); promised = false;
    try { localStorage.removeItem(KEY); } catch(e){}
    swap("past", { cleared: 1 });
  });
}

// ===== 아직 공개 전 =====
function soon(){
  cover();
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

const VIEWS = { home, promise, topics, card: cardView, rest, sum, all, past };

// ===== 시작 =====
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  history.replaceState({ sc: "home" }, "");
  render({ sc: "home" });
}
route();
window.__talk = { get S(){ return S; }, get SC(){ return SC; }, openAfter, collect };   // 화면 흐름 시험용
