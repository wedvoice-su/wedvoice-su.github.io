// 보증 인원 계산기 ㉑: 네 칸(신랑 · 신부 · 양가 부모님 손님)을 모임별로 세면 → 예상 식사 인원 + 보증 인원 추천
// 셈 core.js · 문구 text.js · 공통 기능 shared/common.js · 기획 docs/보증-인원/기획.md · 조사 docs/보증-인원/조사/조사-정리.md
// 적은 숫자는 이 기기(브라우저)에만 저장해요. 부모님 답은 링크 안에 담겨 오가요(서버 없음).

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/count-us-in/?preview)
const OPEN = true;
// =========================================================

const KEY = "countUsIn.v1";
const ASK_KEY = "countUsIn.ask.v1";
const C = CORE;
const WHO = { g: "신랑 부모님", b: "신부 부모님" };
const PK_OF = { g: "gp", b: "bp" };

// ===== 저장 =====
function blank(){
  const p = {}; C.POCKETS.forEach(k => { p[k] = C.blankPocket(C.KIND[k]); });
  return { v: 1, p, hall: { spare: 10, price: 0, min: 0 } };
}
function clean(x){
  const b = blank();
  if(!x || typeof x !== "object" || x.v !== 1) return null;
  C.POCKETS.forEach(k => { b.p[k] = C.cleanPocket(C.KIND[k], x.p && x.p[k]); });
  const h = x.hall && typeof x.hall === "object" ? x.hall : {};
  b.hall.spare = C.SPARES.includes(h.spare) ? h.spare : 10;
  b.hall.price = C.int(h.price, 9999999);
  b.hall.min = C.int(h.min, 9999);
  return b;
}
function load(){ try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch(e){ return null; } }
function save(){ if(VIEW !== S) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || blank();
let VIEW = S;                    // 예시를 볼 때는 예시 가족, 아니면 S
const isEx = () => VIEW !== S;

function exampleState(){
  const e = blank();
  C.POCKETS.forEach(k => { e.p[k] = C.cleanPocket(C.KIND[k], EXAMPLE[k]); });
  return e;
}

// 부모님 화면에서 적는 것 (부모님 폰에 따로 저장)
function loadAsk(){
  try {
    const x = JSON.parse(localStorage.getItem(ASK_KEY)) || {};
    return { g: C.cleanPocket("parents", x.g), b: C.cleanPocket("parents", x.b) };
  } catch(e){ return { g: C.blankPocket("parents"), b: C.blankPocket("parents") }; }
}
function saveAsk(){ try { localStorage.setItem(ASK_KEY, JSON.stringify(AS)); } catch(e){} }
let AS = null;

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");
const nb = n => C.comma(n);
const range = (lo, hi) => lo === hi ? nb(lo) : nb(lo) + "~" + nb(hi);
const MINUS = "−";

// 링크: 공개 전에는 ?preview 를 붙여요
function pageUrl(query){
  const q = []; if(!OPEN) q.push("preview"); if(query) q.push(query);
  return location.origin + location.pathname + (q.length ? "?" + q.join("&") : "");
}
const askUrl = side => pageUrl("ask=" + side);
const answerUrl = (side, p) => pageUrl("") + "#a=" + C.encodeAnswer(side, p);

// 공유: 휴대폰은 공유 창, 안 되면 복사
async function shareOrCopy(text, url, msgEl, copiedText){
  if(navigator.share){
    try { await navigator.share({ text, url }); msgEl.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msgEl.textContent = ""; return; } }
  }
  await copyText(text + "\n" + url, msgEl, copiedText, url);
}
async function copyText(s, msgEl, done, fallback){
  try { await navigator.clipboard.writeText(s); msgEl.textContent = done; }
  catch(e){ msgEl.textContent = fallback || s; }
}

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let screen = "", cur = "";
function go(sc, k){ history.pushState({ sc, k }, ""); render(sc, k); }
function render(sc, k){
  closeSheet(true);
  screen = sc; cur = k || "";
  document.body.classList.remove("big");
  ({ home, board, pocket, result, askHome, askPocket, askDone, imp: code => importScreen(code, true) })[sc](k);
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  const st = e.state || { sc: ASKSIDE ? "askHome" : "home" };
  if(sheetEl){ closeSheet(true); if(st.sc === screen && !st.sheet) return; }
  if(st.sheet){ if(screen !== st.sc) render(st.sc, st.k); openSheet(st.sheet, false); return; }
  if(st.sc === "result" && st.ex) VIEW = exampleState(); else if(st.sc !== "result") VIEW = S;
  render(st.sc, st.k);
});

// ===== 1. 첫 화면 =====
function home(){
  VIEW = S;
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const R = C.calcAll(S);
  const started = R.all.inv > 0;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${started
        ? `<button id="resume"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { n: nb(R.all.inv) }))}</span></button>`
        : `<button id="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>`}
      <button id="ex"><span>${esc(T.example)}</span><span class="q">${esc(T.exampleQ)}</span></button>
    </div>
    <p class="note">${esc(T.note)}</p>
    ${started ? `<div class="reset"><button class="text-btn cover-link" id="reset">${esc(T.restart)}</button>
      <div class="reset-ask" id="resetAsk" hidden><p>${esc(T.restartAsk)}</p>
      <div class="reset-btns"><button class="chip-btn" id="resetYes">${esc(T.restartYes)}</button><button class="chip-btn" id="resetNo">${esc(T.restartNo)}</button></div></div></div>` : ""}
    ${foot()}`;
  const st = $("#start"), rs = $("#resume");
  if(st) st.onclick = () => go("board");
  if(rs) rs.onclick = () => go("board");
  $("#ex").onclick = () => { VIEW = exampleState(); history.pushState({ sc: "result", ex: 1 }, ""); render("result"); };
  if(started){
    $("#reset").onclick = () => { $("#resetAsk").hidden = false; $("#reset").hidden = true; $("#resetYes").focus(); };
    $("#resetNo").onclick = () => { $("#resetAsk").hidden = true; $("#reset").hidden = false; };
    $("#resetYes").onclick = () => { S = blank(); VIEW = S; save(); render("home"); };
  }
}

// ===== 2. 네 칸 =====
function board(){
  VIEW = S;
  document.body.classList.remove("is-cover");
  app.className = "wrap board";
  const R = C.calcAll(S);
  const card = k => {
    const P = R.P[k], parents = C.KIND[k] === "parents", side = C.SIDE_OF[k];
    const line = P.filled ? fm(T.pkLine, { n: nb(P.inv), lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명") : T.pkEmpty;
    return `
      <section class="pk${P.filled ? " on" : ""}" data-k="${k}">
        <div class="pk-top">
          <h3>${esc(T.pk[k])}</h3>
          ${S.p[k].from === "parents" ? `<span class="pk-from">${esc(T.pkFrom)}</span>` : ""}
        </div>
        <p class="pk-sub">${esc(T.pkSub[k])}</p>
        <p class="pk-line">${esc(line)}</p>
        <div class="pk-btns">
          <button class="btn line sm" data-w="${k}">${esc(P.filled ? T.edit : parents ? T.writeParents : T.write)}</button>
          ${parents ? `<button class="btn ${P.filled ? "line" : "accent"} sm send" data-s="${side}">${esc(T.sendParents)}</button>` : ""}
        </div>
      </section>`;
  };
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="toHome">‹ ${esc(T.name)}</button><span></span></div>
    <h2 class="question">${br(T.boardTitle)}</h2>
    <p class="lead2">${esc(T.boardLead)}</p>
    <div class="pks">${C.POCKETS.map(card).join("")}</div>
    <section class="paste" aria-labelledby="pasteT">
      <h3 id="pasteT">${esc(T.pasteTitle)}</h3>
      <p class="hint2">${esc(T.pasteLead)}</p>
      <div class="paste-in">
        <input id="pasteIn" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="${esc(T.pastePh)}" aria-label="${esc(T.pasteTitle)}" aria-describedby="pasteMsg">
        <button type="button" class="btn line sm" id="pasteBtn">${esc(T.pasteBtn)}</button>
      </div>
      <p class="warn-sm" id="pasteMsg" role="status" hidden></p>
    </section>
    ${dockHtml(R)}`;
  $("#toHome").onclick = () => go("home");
  $$("[data-w]").forEach(b => { b.onclick = () => go("pocket", b.dataset.w); });
  $$("[data-s]").forEach(b => { b.onclick = () => { history.pushState({ sc: "board", sheet: b.dataset.s }, ""); openSheet(b.dataset.s, true); }; });
  bindPaste();
  bindDock();
  // 부모님 답을 막 넣은 칸: 눈에 띄게 + 화면 가운데로 (render가 맨 위로 올린 다음에)
  if(justK){
    const c = $(`.pk[data-k="${justK}"]`); justK = "";
    if(c){ c.classList.add("just"); requestAnimationFrame(() => c.scrollIntoView({ block: "center" })); }
  }
}
let justK = "";

// ===== 부모님 답 붙여 넣기 =====
// 카톡 메시지를 통째로 복사해도 돼요(설명 글 + 링크). 링크 속 #a= 뒤만 찾아 써요.
function findAnswer(s){
  s = String(s || "").trim();
  if(!s) return { err: "empty" };
  const m = s.match(/(?:#|%23)a=([A-Za-z0-9_-]+)/);
  if(m) return C.decodeAnswer(m[1]) ? { code: m[1] } : { err: "cut" };
  if(/^[A-Za-z0-9_-]{20,}$/.test(s) && C.decodeAnswer(s)) return { code: s };
  if(/[?&]ask=[gb](?![A-Za-z0-9])/.test(s)) return { err: "ask" };
  return { err: "not" };
}
function bindPaste(){
  const inp = $("#pasteIn"), msg = $("#pasteMsg");
  const say = s => { msg.textContent = s || ""; msg.hidden = !s; };
  const tryIt = (s, typing) => {
    const r = findAnswer(s);
    if(r.code){ say(""); inp.value = ""; inp.blur(); history.pushState({ sc: "imp", k: r.code }, ""); render("imp", r.code); return; }
    if(typing && (r.err === "empty" || (r.err === "not" && s.trim().length < 12))){ say(""); return; }   // 아직 적는 중
    say({ empty: T.pasteEmpty, ask: T.pasteAsk, not: T.pasteNot, cut: T.pasteCut }[r.err]);
  };
  inp.oninput = () => tryIt(inp.value, true);
  inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); tryIt(inp.value, false); } };
  // 버튼: 클립보드에서 바로 가져오기. 안 되는 폰(카톡 · 인스타 안 창 등)은 빈칸에 직접 붙여 넣게 안내
  $("#pasteBtn").onclick = async () => {
    let s = null;
    try { if(navigator.clipboard && navigator.clipboard.readText) s = await navigator.clipboard.readText(); } catch(e){ s = null; }
    if(s == null){ say(T.pasteManual); inp.focus(); return; }
    inp.value = s; tryIt(s, false);
  };
}
function dockHtml(R){
  const has = R.all.inv > 0;
  return `
    <div class="dock" aria-live="polite">
      <p class="dock-line">${has ? `<span>${esc(fm(T.dockLine, { lo: nb(R.all.lo), hi: nb(R.all.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명"))}</span><b>${esc(fm(T.dockRec, { rec: nb(R.all.rec) }))}</b>` : `<span>${esc(T.dockEmpty)}</span>`}</p>
      <button class="btn main" id="toResult"${has ? "" : " disabled"}>${esc(T.seeResult)}</button>
    </div>`;
}
function bindDock(){ const b = $("#toResult"); if(b) b.onclick = () => go("result"); }

// ===== 부모님께 보내기 (아래에서 올라오는 창) =====
let sheetEl = null, sheetFrom = null;
function openSheet(side, focus){
  closeSheet(true);
  sheetFrom = document.activeElement;
  sheetEl = document.createElement("div");
  sheetEl.className = "sheet-bg";
  sheetEl.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">
      <h3 id="sh-t" tabindex="-1">${esc(fm(T.sendTitle, { who: WHO[side] }))}</h3>
      <p>${esc(T.sendLead)}</p>
      <div class="btns">
        <button class="btn main" id="shSend">${esc(T.sendBtn)}</button>
        <button class="btn ghost" id="shCopy">${esc(T.sendCopy)}</button>
        <p class="msg" id="shMsg" role="status"></p>
      </div>
      <p class="sh-after">${esc(T.sendAfter)}</p>
      <button class="text-btn btn-link" id="shClose">${esc(T.sendClose)}</button>
    </div>`;
  document.body.appendChild(sheetEl);
  document.body.classList.add("sheet-open");
  const msg = $("#shMsg", sheetEl);
  $("#shSend", sheetEl).onclick = () => shareOrCopy(T.sendText, askUrl(side), msg, T.sendCopied);
  $("#shCopy", sheetEl).onclick = () => copyText(askUrl(side), msg, T.sendCopied);
  const close = () => history.back();
  $("#shClose", sheetEl).onclick = close;
  sheetEl.onclick = e => { if(e.target === sheetEl) close(); };
  sheetEl.onkeydown = e => {
    if(e.key === "Escape"){ e.preventDefault(); close(); }
    if(e.key === "Tab"){
      const f = $$("button", sheetEl); const i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  };
  if(focus !== false) $("#sh-t", sheetEl).focus();
}
function closeSheet(){
  if(!sheetEl) return;
  sheetEl.remove(); sheetEl = null;
  document.body.classList.remove("sheet-open");
  if(sheetFrom && document.contains(sheetFrom)) sheetFrom.focus();
  sheetFrom = null;
}

// ===== 3. 칸 적기 (신랑 · 신부 · 부모님이 같이 써요) =====
// o = { kind, p(칸), title, lead, ask(부모님 화면?), onSave(), dock(), doneText, onDone() }
function pocketScreen(o){
  const kind = o.kind, p = o.p, parents = kind === "parents";
  const tierSeg = (key, t, extra) => `
    <div class="seg" role="group" aria-label="${esc(T.tierAsk)}" data-tk="${key}"${extra}>
      ${C.TIERS.map(x => `<button type="button" data-t="${x}" aria-pressed="${t === x}">${esc(T.tier[x])}</button>`).join("")}
    </div>`;
  const ctr = (key, field, n, label) => `
    <div class="ctr" data-ck="${key}" data-f="${field}">
      <button type="button" class="ctr-b" data-d="-1" aria-label="${esc(fm(T.minus, { label }))}"${n ? "" : " disabled"}>${MINUS}</button>
      <input class="ctr-n" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${n}" aria-label="${esc(label)} ${esc(T.unit)}">
      <button type="button" class="ctr-b" data-d="1" aria-label="${esc(fm(T.plus, { label }))}">+</button>
    </div>`;
  const rowHtml = d => {
    const x = p.rows[d.k], label = T.row[kind][d.k];
    if(d.kin){
      const any = x.n + x.c > 0;
      return `
        <div class="row kin" data-k="${d.k}">
          <p class="row-name">${esc(label)}</p>
          <div class="kin-ctrs">
            <div class="kin-c"><span>${esc(T.adults)}</span>${ctr(d.k, "n", x.n, label + " " + T.adults)}</div>
            <div class="kin-c"><span>${esc(T.kids)}</span>${ctr(d.k, "c", x.c, label + " " + T.kids)}</div>
          </div>
          ${tierSeg(d.k, x.t, any ? "" : " hidden")}
        </div>`;
    }
    return `
      <div class="row" data-k="${d.k}">
        <div class="row-top"><p class="row-name">${esc(label)}</p>${ctr(d.k, "n", x.n, label)}</div>
        ${d.direct ? `<p class="row-help">${esc(T.busHelp)}</p>` : tierSeg(d.k, x.t, x.n ? "" : " hidden")}
      </div>`;
  };
  const extraHtml = x => `
    <div class="row extra" data-x="${x.id}">
      <div class="x-top">
        <input class="nm" type="text" maxlength="20" value="${esc(x.label)}" placeholder="${esc(T.addPh)}" aria-label="${esc(T.addPh)}">
        <button type="button" class="x" data-del="${x.id}" aria-label="${esc(T.delRow)}">×</button>
      </div>
      <div class="x-ctr">${ctr("x" + x.id, "n", x.n, x.label || T.rowNoName)}</div>
      ${tierSeg("x" + x.id, x.t, x.n ? "" : " hidden")}
    </div>`;
  const kinRows = C.ROWS[kind].filter(d => d.kin || d.direct), mateRows = C.ROWS[kind].filter(d => !d.kin && !d.direct);
  const compOpts = parents ? T.compParents : T.compCouple;

  document.body.classList.remove("is-cover");
  if(o.ask) document.body.classList.add("big");
  app.className = "wrap pocket";
  app.innerHTML = `
    <div class="top">${o.backBtn || ""}<span></span></div>
    <h2 class="question">${br(o.title)}</h2>
    <p class="lead2">${esc(o.lead)}</p>
    ${parents ? "" : `<p class="note2">${esc(T.kinElsewhere)}</p>`}
    <details class="help"${o.ask ? " open" : ""}><summary>${esc(T.tierHelpTitle)}</summary><p>${esc(T.tierHelp)}</p><p>${esc(T.typeHint)}</p></details>
    ${parents ? `<section class="sec"><h3>${esc(T.secKin)}</h3><p class="hint2">${esc(T.kinHelp)}</p>${kinRows.map(rowHtml).join("")}</section>` : ""}
    <section class="sec">
      ${parents ? `<h3>${esc(T.secMates)}</h3>` : ""}
      ${mateRows.map(rowHtml).join("")}
      <div id="extras">${p.extra.map(extraHtml).join("")}</div>
      <button type="button" class="add" id="addRow">${esc(T.addRow)}</button>
    </section>
    <section class="sec comp">
      <h3>${br(parents ? T.compAskParents : T.compAskCouple)}</h3>
      <p class="hint2">${esc(parents ? T.compSub : T.compSubCouple)}</p>
      <div class="opts3" role="group">
        ${compOpts.map((s, i) => `<button type="button" class="opt" data-c="${i}" aria-pressed="${p.comp === i}"><span class="ck">${CHECK}</span><span class="opt-t"><b>${esc(s)}</b><small class="opt-ex"></small></span></button>`).join("")}
      </div>
      <p class="warn-sm" id="compNone"${p.comp == null ? "" : " hidden"}>${esc(T.compNone)}</p>
    </section>
    ${parents ? `
    <section class="sec">
      <h3>${esc(o.ask ? T.firstAskP : T.firstAsk)}</h3>
      <div class="yn" role="group">
        <button type="button" class="opt sm" data-first="1" aria-pressed="${p.first === true}"><span class="ck">${CHECK}</span><b>${esc(T.firstYes)}</b></button>
        <button type="button" class="opt sm" data-first="0" aria-pressed="${p.first === false}"><span class="ck">${CHECK}</span><b>${esc(T.firstNo)}</b></button>
      </div>
      <p class="hint2 after">${esc(T.firstHelp)}</p>
      <p class="lbl">${esc(o.ask ? T.prevAskP : T.prevAsk)}</p>
      <div class="prev-in"><input class="num" id="prev" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${p.prev == null ? "" : p.prev}" placeholder="${esc(T.prevPh)}" aria-label="${esc(o.ask ? T.prevAskP : T.prevAsk)}"><span>${esc(T.unit)}</span></div>
      <p class="hint2 after">${esc(T.prevHelp)}</p>
    </section>` : ""}
    <div class="dock" aria-live="polite">
      <p class="dock-line" id="pdock"></p>
      <button class="btn main" id="done">${esc(o.doneText || T.done)}</button>
    </div>`;

  const changed = () => { o.onSave(); refresh(); };
  function refresh(){
    const P = C.calcPocket(kind, p);
    $("#pdock").innerHTML = o.dock(P);
    // 같이 오는 답 옆 예시 숫자: 적은 숫자가 있으면 그 숫자로
    const n = P.mates > 0 ? P.mates : 10;
    $$(".opt[data-c]").forEach(b => { $(".opt-ex", b).textContent = fm(T.compEx, { n: nb(n), m: nb(Math.round(n * C.COMP[+b.dataset.c])) }); });
    $("#compNone").hidden = p.comp != null || P.mates === 0;
  }
  const target = key => key[0] === "x" ? p.extra.find(x => "x" + x.id === key) : p.rows[key];
  // 숫자 칸
  function bindCtr(box){
    const key = box.dataset.ck, f = box.dataset.f, inp = $(".ctr-n", box), minus = $("[data-d='-1']", box);
    const row = box.closest(".row");
    const setN = (v, write) => {
      const t = target(key); if(!t) return;
      t[f] = C.int(v);
      if(write) inp.value = t[f];
      minus.disabled = !t[f];
      const seg = $(".seg", row);
      if(seg){ const tt = target(key); seg.hidden = !((tt.n || 0) + (tt.c || 0)); }
      changed();
    };
    $$(".ctr-b", box).forEach(b => { b.onclick = () => setN((target(key)[f] || 0) + (+b.dataset.d), true); });
    inp.oninput = () => { const v = inp.value.replace(/[^0-9]/g, ""); if(v !== inp.value) inp.value = v; setN(v, false); };
    inp.onfocus = () => { setTimeout(() => { try { inp.select(); } catch(e){} }, 0); };
    inp.onblur = () => { inp.value = target(key) ? target(key)[f] : 0; };
  }
  function bindSeg(seg){
    $$("button", seg).forEach(b => { b.onclick = () => {
      const t = target(seg.dataset.tk); if(!t) return;
      t.t = b.dataset.t;
      $$("button", seg).forEach(x => x.setAttribute("aria-pressed", x === b));
      changed();
    }; });
  }
  function bindExtra(el){
    const id = +el.dataset.x, x = () => p.extra.find(e => e.id === id);
    bindCtr($(".ctr", el)); bindSeg($(".seg", el));
    const nm = $(".nm", el);
    nm.oninput = () => { if(x()){ x().label = nm.value.slice(0, 20); o.onSave(); } };
    $("[data-del]", el).onclick = () => {
      p.extra = p.extra.filter(e => e.id !== id); el.remove(); changed(); $("#addRow").focus();
    };
  }
  $$(".row:not(.extra) .ctr").forEach(bindCtr);
  $$(".row:not(.extra) .seg").forEach(bindSeg);
  $$(".row.extra").forEach(bindExtra);
  $("#addRow").onclick = () => {
    if(p.extra.length >= 12) return;
    p.seq += 1; const x = { id: p.seq, label: "", n: 0, t: "half" }; p.extra.push(x);
    const w = document.createElement("div"); w.innerHTML = extraHtml(x).trim();
    const el = w.firstChild; el.classList.add("new"); $("#extras").appendChild(el); bindExtra(el);
    $(".nm", el).focus(); changed();
  };
  $$(".opt[data-c]").forEach(b => { b.onclick = () => {
    p.comp = +b.dataset.c; $$(".opt[data-c]").forEach(x => x.setAttribute("aria-pressed", x === b)); changed();
  }; });
  $$("[data-first]").forEach(b => { b.onclick = () => {
    p.first = b.dataset.first === "1"; $$("[data-first]").forEach(x => x.setAttribute("aria-pressed", x === b)); changed();
  }; });
  const pv = $("#prev");
  if(pv) pv.oninput = () => { const v = pv.value.replace(/[^0-9]/g, ""); if(v !== pv.value) pv.value = v; p.prev = v === "" ? null : C.int(v, 9999); changed(); };
  $("#done").onclick = o.onDone;
  refresh();
}

function pocket(k){
  VIEW = S;
  if(!C.KIND[k]){ render("board"); return; }
  const kind = C.KIND[k];
  pocketScreen({
    kind, p: S.p[k], title: T.pocketTitle[k], lead: kind === "parents" ? T.leadParents : T.leadCouple,
    backBtn: `<button class="top-btn" id="back">${esc(T.back)}</button>`,
    onSave: save,
    dock: P => {
      const R = C.calcAll(S);
      const mine = P.filled ? fm(T.pocketDock, { lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명") : T.pocketDockEmpty;
      return `<span>${esc(mine)}</span>${R.all.inv ? `<b>${esc(fm(T.pocketDockRec, { rec: nb(R.all.rec) }))}</b>` : ""}`;
    },
    onDone: () => history.back()
  });
  $("#back").onclick = () => history.back();
}

// ===== 4. 결과 =====
function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap res";
  const R0 = C.calcAll(VIEW);
  if(!R0.all.inv){
    app.innerHTML = `
      <div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span></span></div>
      <h2 class="question">${esc(T.emptyTitle)}</h2>
      <p class="lead2">${esc(T.emptyLead)}</p>
      <button class="btn main" id="toBoard">${esc(T.emptyBtn)}</button>
      ${foot()}`;
    $("#back").onclick = () => history.back();
    $("#toBoard").onclick = () => go("board");
    return;
  }
  const h = VIEW.hall;
  app.innerHTML = `
    ${isEx() ? `<div class="ex-banner"><span>${esc(T.exBanner)}</span><button class="btn main sm" id="exStart">${esc(T.exStart)}</button></div>`
      : `<div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span>${esc(T.resTop)}</span></div>`}
    <div id="missing"></div>
    <div id="cardBox"></div>
    <div id="notes"></div>
    <section class="sec hall">
      <h3>${esc(T.hallTitle)}</h3>
      <p class="hint2">${esc(T.hallSub)}</p>
      <p class="lbl">${esc(T.spareAsk)}</p>
      <div class="seg wide" role="group" aria-label="${esc(T.spareAsk)}" id="spare">
        ${C.SPARES.map(s => `<button type="button" data-sp="${s}" aria-pressed="${h.spare === s}">${s}%</button>`).join("")}
      </div>
      <p class="hint2 after">${esc(T.spareHelp)}</p>
      <div class="hall-in">
        <label><span>${esc(T.priceAsk)}</span><span class="in"><input class="num" id="price" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${h.price || ""}" placeholder="${esc(T.pricePh)}"><i>원</i></span><small id="priceKo"></small></label>
        <label><span>${esc(T.minAsk)}</span><span class="in"><input class="num" id="min" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${h.min || ""}" placeholder="${esc(T.minPh)}"><i>명</i></span></label>
      </div>
      <div id="hallOut"></div>
    </section>
    <section class="sec ask">
      <h3>${esc(T.askTitle)}</h3>
      <ol>${T.askList.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    </section>
    <details class="help how"><summary>${esc(T.howTitle)}</summary><ul>${T.howList.map(s => `<li>${esc(s)}</li>`).join("")}</ul></details>
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">${esc(T.save)}</button>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="copyTxt">${esc(T.copyText)}</button>
        ${isEx() ? "" : `<button class="btn ghost" id="editNums">${esc(T.editNums)}</button>`}
        ${SITES.tour && SITES.tour.reel ? siteLink("tour", "btn ghost", esc(T.tourLink)) : ""}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
      </div>
    </div>
    ${foot()}`;

  let firstDraw = true;
  const draw = () => {
    const R = C.calcAll(VIEW);
    $("#missing").innerHTML = R.missing.length && !isEx()
      ? `<div class="warn"><b>${esc(T.missingTitle)}</b><p>${esc(fm(T.missingLine, { list: R.missing.map(k => T.pk[k]).join(" · ") }))}</p><button class="btn line sm" id="fillMissing">${esc(T.missingBtn)}</button></div>` : "";
    const fmi = $("#fillMissing"); if(fmi) fmi.onclick = () => go("board");
    $("#cardBox").innerHTML = cardHtml(R);
    // 참고: 첫 혼사 · 지난 결혼
    const notes = [];
    ["g", "b"].forEach(sd => {
      const k = PK_OF[sd], pp = VIEW.p[k], P = R.P[k];
      if(pp.first === true && P.filled) notes.push(fm(T.firstNote, { who: WHO[sd], hi: nb(P.hi) }));
      if(pp.prev != null && pp.prev > 0) notes.push(fm(T.prevNote, { who: WHO[sd], p: nb(pp.prev), lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명"));
    });
    $("#notes").innerHTML = notes.length ? `<div class="notes">${notes.map(s => `<p>${esc(s)}</p>`).join("")}</div>` : "";
    // 예식장 숫자
    const N = C.hallNote(R.all, VIEW.hall), out = [];
    if(N.total) out.push(fm(T.moneyLine, { rec: nb(R.all.rec), sum: C.won(N.total), ten: C.won(N.ten) }));
    if(N.min){
      if(N.over > 0) out.push(fm(T.minOver, { min: nb(N.min), d: nb(N.over), lo: nb(R.all.lo), w: nb(N.waste), money: N.wasteWon ? fm(T.minMoney, { won: C.won(N.wasteWon) }) : "" }));
      else out.push(fm(T.minOk, { min: nb(N.min) }));
    }
    $("#hallOut").innerHTML = out.map((s, i) => `<p class="hall-o${N.over > 0 && i === out.length - 1 ? " warn-o" : ""}">${esc(s)}</p>`).join("");
    $("#priceKo").textContent = VIEW.hall.price ? C.won(VIEW.hall.price) : "";
    const nm = "보증인원-" + R.all.rec + "명";
    clearTimeout(imgTimer);
    if(firstDraw){ firstDraw = false; prepareImage(nm); } else imgTimer = setTimeout(() => prepareImage(nm), 350);
    window.__lastR = R;
  };
  draw();

  $$("#spare button").forEach(b => { b.onclick = () => {
    VIEW.hall.spare = +b.dataset.sp; $$("#spare button").forEach(x => x.setAttribute("aria-pressed", x === b)); save(); draw();
  }; });
  const numIn = (id, key, max) => { const el = $("#" + id); el.oninput = () => {
    const v = el.value.replace(/[^0-9]/g, ""); if(v !== el.value) el.value = v;
    VIEW.hall[key] = C.int(v, max); save(); draw();
  }; };
  numIn("price", "price", 9999999); numIn("min", "min", 9999);

  $("#save").onclick = saveCard;
  $("#copyTxt").onclick = () => copyText(resultText(C.calcAll(VIEW)), $("#msg"), T.copied);
  const ed = $("#editNums"); if(ed) ed.onclick = () => go("board");
  const bk = $("#back"); if(bk) bk.onclick = () => history.back();
  const xs = $("#exStart"); if(xs) xs.onclick = () => { VIEW = S; go("board"); };
}

let imgTimer = 0;
function cardHtml(R){
  const max = Math.max(1, ...C.POCKETS.map(k => R.P[k].hi));
  const bars = C.POCKETS.map(k => {
    const P = R.P[k];
    return `<div class="bar-row${P.filled ? "" : " none"}">
      <span class="bar-l">${esc(T.pk[k])}</span>
      <span class="bar-t"><i class="b-hi" style="width:${(P.hi / max * 100).toFixed(1)}%"></i><i class="b-lo" style="width:${(P.lo / max * 100).toFixed(1)}%"></i></span>
      <span class="bar-n">${P.filled ? range(P.lo, P.hi) + "명" : "—"}</span>
    </div>`;
  }).join("");
  const kids = R.all.kidsHi > 0 ? range(R.all.kidsLo, R.all.kidsHi) : "";
  return `
    <article class="card cnt" id="card">
      <div class="head"><span class="kind">${esc(T.resKind)}</span><span class="handle">@wed_voice.su</span></div>
      <p class="rec-lead">${esc(T.recLead)}</p>
      <h2 class="rec"><span class="rec-n">${esc(fm(T.recBig, { rec: nb(R.all.rec) }))}</span><span class="rec-t">${esc(T.recTail)}</span></h2>
      <p class="rec-why">${esc(fm(T.recWhy, { sp: R.spare }))}</p>
      <div class="meal"><b>${esc(fm(T.mealLine, { lo: nb(R.all.lo), hi: nb(R.all.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명"))}</b><span>${esc(fm(T.mealSub, { lo: nb(R.all.lo), hi: nb(R.all.hi) }))}</span></div>
      <div class="side"><p class="sec-t">${esc(T.sideTitle)}</p><p class="side-n">${esc(sideLine(R))}</p></div>
      <div class="bars"><p class="sec-t">${esc(T.barsTitle)}</p>${bars}</div>
      ${kids ? `<p class="kids">${esc(fm(T.kidsNote, { kids }))}</p>` : ""}
      <p class="cfoot">${esc(T.cardFoot)}</p>
      ${sign()}
    </article>`;
}

function sideLine(R){
  const one = (lab, x) => lab + " " + (x.inv ? fm(T.sideN, { n: nb(x.rec) }) : T.sideNone);
  return one(T.sideG, R.g) + " · " + one(T.sideB, R.b);
}
function resultText(R){
  const L = [T.textHead, fm(T.textRec, { rec: nb(R.all.rec) }), fm(T.textSide, { line: sideLine(R) }),
    fm(T.textMeal, { lo: nb(R.all.lo), hi: nb(R.all.hi) })];
  C.POCKETS.forEach(k => { const P = R.P[k]; if(P.filled) L.push(fm(T.textRow, { label: T.pk[k], lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명")); });
  L.push(fm(T.textSpare, { sp: R.spare }));
  L.push(location.origin + location.pathname);
  return L.join("\n");
}

// ===== 5. 부모님 화면 (?ask=g · ?ask=b) =====
const ASKSIDE = (() => { const a = new URLSearchParams(location.search).get("ask"); return a === "g" || a === "b" ? a : ""; })();

function askHome(){
  document.body.classList.add("is-cover", "big");
  app.className = "wrap cover ask-cover";
  const P = C.calcPocket("parents", AS[ASKSIDE]);
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.askFor[ASKSIDE])}</p>
    <h1 class="ask-h1">${br(T.askTitle2)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.askLead)}</p>
    <div class="pick"><button id="askGo"><span>${esc(P.filled ? T.askResume : T.askStart)}</span></button></div>
    <p class="note">${esc(T.note)}</p>
    ${foot()}`;
  $("#askGo").onclick = () => go("askPocket");
}
function askPocket(){
  const p = AS[ASKSIDE];
  pocketScreen({
    kind: "parents", p, ask: true, title: T.askPocketTitle[ASKSIDE], lead: T.leadParents,
    backBtn: `<button class="top-btn" id="back">‹ ${esc(T.askFor[ASKSIDE].replace(/께$/, ""))}</button>`,
    onSave: saveAsk,
    dock: P => `<span>${esc(P.filled ? fm(T.askSummary, { n: nb(P.inv), lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명") : T.pocketDockEmpty)}</span>`,
    doneText: T.askDone,
    onDone: () => go("askDone")
  });
  $("#back").onclick = () => history.back();
}
function askDone(){
  document.body.classList.remove("is-cover");
  document.body.classList.add("big");
  app.className = "wrap ask-done";
  const p = AS[ASKSIDE], P = C.calcPocket("parents", p);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.askEdit)}</button><span></span></div>
    <h2 class="question">${esc(T.askDoneTitle)}</h2>
    ${P.filled ? `
      <div class="sum-box"><p>${esc(fm(T.askSummary, { n: nb(P.inv), lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명"))}</p></div>
      <div class="btns">
        <button class="btn main" id="askSend">${esc(T.askSend)}</button>
        <p class="hint2 center">${esc(T.askSendHint)}</p>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="askCopy">${esc(T.askCopy)}</button>
        <button class="btn ghost" id="askEdit">${esc(T.askEdit)}</button>
      </div>`
    : `<p class="lead2">${esc(T.askEmpty)}</p><button class="btn main" id="askEdit">${esc(T.askEdit)}</button>`}
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $("#askEdit").onclick = () => history.back();
  if(P.filled){
    const url = answerUrl(ASKSIDE, p), msg = $("#msg");
    $("#askSend").onclick = () => shareOrCopy(T.askShareText, url, msg, T.askCopied);
    $("#askCopy").onclick = () => copyText(url, msg, T.askCopied);
  }
}

// ===== 6. 부모님 답 받기 =====
// 두 길: ① 답 링크를 눌러서 열림(#a=…) ② 네 칸 맨 아래에 붙여 넣음(pasted = true, 지금 쓰는 창이 곧 원래 적던 곳)
function importScreen(code, pasted){
  document.body.classList.remove("is-cover");
  app.className = "wrap imp";
  const got = C.decodeAnswer(code);
  const clearHash = () => history.replaceState({ sc: "home" }, "", pageUrl(""));
  if(!got){
    app.innerHTML = `<h2 class="question">${esc(T.impBad)}</h2><button class="btn main" id="impHome">${esc(T.impHome)}</button>${foot()}`;
    $("#impHome").onclick = () => { if(pasted){ history.back(); return; } clearHash(); render("home"); };
    return;
  }
  const k = PK_OF[got.side], P = C.calcPocket("parents", got.pocket);
  const saved = pasted ? S : load(), hasData = !!saved && C.calcAll(saved).all.inv > 0;
  const curFilled = hasData && C.calcPocket("parents", saved.p[k]).filled;
  app.innerHTML = `
    <div class="top">${pasted ? `<button class="top-btn" id="impBack">${esc(T.back)}</button>` : `<span>${esc(T.name)}</span>`}<span></span></div>
    <h2 class="question">${br(fm(T.impTitle, { who: WHO[got.side] }))}</h2>
    <div class="sum-box"><p>${esc(fm(T.impLine, { n: nb(P.inv), lo: nb(P.lo), hi: nb(P.hi) }).replace(/(\d[\d,]*)~\1명/, "$1명"))}</p>
      <p class="sec-t imp-t">${esc(T.impListTitle)}</p><ul class="imp-list">${impItems(got.pocket).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    ${hasData || pasted ? `
      ${curFilled ? `<p class="lead2">${esc(fm(T.impReplace, { pk: T.pk[k] }))}</p>` : ""}
      <div class="btns"><button class="btn main" id="impPut">${esc(fm(T.impBtn, { pk: T.pk[k] }))}</button></div>`
    : `
      <div class="warn"><p>${esc(T.impNoData)}</p><ol class="imp-steps">${T.impSteps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>
      <div class="btns">
        <button class="btn main" id="impCopy">${esc(T.impCopy)}</button>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="impPut">${esc(T.impHere)}</button>
      </div>`}
    ${foot()}`;
  const cp = $("#impCopy"); if(cp) cp.onclick = () => copyText(location.href, $("#msg"), T.impCopied);
  const bk = $("#impBack"); if(bk) bk.onclick = () => history.back();
  $("#impPut").onclick = () => {
    if(!pasted) S = load() || blank();
    VIEW = S;
    S.p[k] = got.pocket; save();
    justK = k;
    if(pasted){ history.back(); return; }   // 네 칸으로 돌아가요 (뒤로 가기 한 번 더 = 첫 화면)
    clearHash(); history.pushState({ sc: "board" }, ""); render("board");
  };
}

function impItems(p){
  const L = [];
  C.ROWS.parents.forEach(d => {
    const x = p.rows[d.k], label = T.row.parents[d.k];
    if(d.kin){ if(x.n || x.c) L.push(fm(T.impKin, { label, a: nb(x.n), c: nb(x.c) })); }
    else if(x.n) L.push(fm(T.impRow, { label, n: nb(x.n) }));
  });
  p.extra.forEach(x => { if(x.n) L.push(fm(T.impRow, { label: x.label || T.rowNoName, n: nb(x.n) })); });
  if(p.comp != null) L.push(fm(T.impComp, { v: T.compParents[p.comp] }));
  if(p.first === true) L.push(T.impFirst);
  if(p.prev) L.push(fm(T.impPrev, { p: nb(p.prev) }));
  return L;
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
  const h = location.hash;
  if(h.startsWith("#a=")){ importScreen(h.slice(3)); return; }
  if(ASKSIDE){ AS = loadAsk(); history.replaceState({ sc: "askHome" }, ""); render("askHome"); return; }
  history.replaceState({ sc: "home" }, "");
  render("home");
}
route();
// 이미 열린 창에 부모님 답 링크를 붙여 넣으면 주소의 # 뒤만 바뀌어요 → 그때도 답 받기 화면으로
window.addEventListener("hashchange", () => {
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if((OPEN || preview) && location.hash.startsWith("#a=")){ closeSheet(true); importScreen(location.hash.slice(3)); window.scrollTo(0, 0); }
});
window.__cnt = { get S(){ return S; }, get AS(){ return AS; }, get VIEW(){ return VIEW; } };   // 화면 흐름 시험용
