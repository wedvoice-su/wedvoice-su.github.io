// 상견례 대화 카드 ㉕: ① 둘이 맞추기(+양가 부모님이 아시는지) → ② 이야기거리(선택) → ③ 부모님께 보낼 큰 글씨 판 → ④ 당일 한 장
// 셈 · 글 만들기 core.js · 문구 text.js · 공통 기능 shared/common.js · 기획 docs/상견례-대화카드/기획.md · 조사 docs/상견례-대화카드/조사/
// 적은 내용은 이 기기(브라우저)에만 저장해요. 서버로 보내는 것은 없어요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/breaking-bread/?preview)
const OPEN = false;
// =========================================================

const KEY = "breaking-bread.v1";
const C = CORE;
const N = C.ITEMS.length;

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => C.fill(s, o);
const br = s => esc(s).replace(/\n/g, "<br>");
const other = s => s === "g" ? "b" : "g";
const q = s => "“" + s + "”";

// ===== 저장 =====
function load(){ try { return C.clean(JSON.parse(localStorage.getItem(KEY))); } catch(e){ return null; } }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || C.blank();
const started = () => C.answered(S) > 0 || !!(S.names.g || S.names.b);

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
const STEP = { s1: 0, item: 0, know: 0, fam: 1, kid: 1, topics: 1, board: 2, day: 3, glance: 3 };
let screen = "", cur = null;
function go(sc, k){ history.pushState({ sc, k: k == null ? null : k }, ""); render(sc, k); }
function render(sc, k){
  screen = sc; cur = k == null ? null : k;
  document.body.classList.remove("is-cover", "typing", "dark-page");
  ({ home, s1, item, know, fam, kid, topics, board, day, glance, ex })[sc](k);
  if(STEP[sc] != null && sc !== "glance" && sc !== "item"){ S.last = sc; save(); }
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  const st = e.state && e.state.sc ? e.state : { sc: "home" };
  render(st.sc, st.k);
});
function page(cls){ app.className = "wrap " + cls; }
function topBar(label){
  return `<div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span class="count">${esc(label || "")}</span></div>`;
}
function bindBack(){ const b = $("#back"); if(b) b.onclick = () => history.back(); }
// 위쪽 네 단계 (눌러서 옮겨 가기)
function nav(i){
  return `<nav class="steps" aria-label="${esc(T.navAria)}">${T.nav.map((t, j) =>
    `<button type="button" data-step="${j}" class="${j === i ? "on" : ""}"${j === i ? ' aria-current="step"' : ""}><b>${j + 1}</b><span>${esc(t)}</span></button>`).join("")}</nav>`;
}
function stepTarget(j){
  if(j === 0) return C.answered(S) ? ["know"] : ["s1"];
  if(j === 1) return ["fam", "g"];
  if(j === 2) return ["board", "g"];
  return ["day"];
}
function bindNav(){
  $$(".steps button").forEach(b => { b.onclick = () => { const [sc, k] = stepTarget(+b.dataset.step); if(sc === screen && (k || null) === cur) return; go(sc, k); }; });
}
// 적는 칸에 있을 때는 아래 버튼을 붙박지 않아요 (키보드가 칸을 가리지 않게)
function bindTyping(){
  $$("input").forEach(el => {
    el.addEventListener("focus", () => document.body.classList.add("typing"));
    el.addEventListener("blur", () => document.body.classList.remove("typing"));
  });
}

// ===== 사진 만들기 · 보내기 =====
let IMG = { job: Promise.resolve(null), files: null };
function prepImages(els, names, bg){
  const my = IMG = { job: null, files: null };
  if(typeof window.html2canvas !== "function"){ my.job = Promise.resolve(null); return; }
  my.job = (document.fonts ? document.fonts.ready : Promise.resolve()).then(async () => {
    const files = [];
    for(let i = 0; i < els.length; i++){
      const canvas = await window.html2canvas(els[i], { scale: 3, backgroundColor: bg, logging: false });
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      if(!blob) return null;
      files.push(new File([blob], names[i] + ".png", { type: "image/png" }));
    }
    my.files = files;
    return files;
  }).catch(() => null);
}
async function sendImages(msg){
  const my = IMG;
  let files = my.files;
  if(!files){ msg.textContent = T.imgMaking; files = await my.job; }
  if(!files){ msg.textContent = T.imgFail; return; }
  if(navigator.canShare && navigator.canShare({ files })){
    try { await navigator.share({ files }); msg.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
  }
  files.forEach((f, i) => setTimeout(() => {
    const url = URL.createObjectURL(f), a = document.createElement("a");
    a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, i * 400));
  msg.textContent = T.imgSaved;
}
async function copyText(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch(e){
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch(e2){ return false; }
  }
}
// 휴대폰은 공유 창(카톡 고르기), 안 되면 복사
async function shareText(text, msg, box){
  if(navigator.share){
    try { await navigator.share({ text }); msg.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
  }
  if(await copyText(text)){ msg.textContent = T.copied; if(box) box.hidden = true; return; }
  msg.textContent = T.copyFail;
  if(box){ box.hidden = false; box.value = text; box.focus(); box.select(); }
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  page("cover");
  const st = started();
  const resumeStep = T.nav[STEP[S.last] != null ? STEP[S.last] : 0];
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <ol class="cov-steps">${T.coverSteps.map(([t, d], i) => `<li><b>${i + 1}</b><span><strong>${esc(t)}</strong><small>${esc(d)}</small></span></li>`).join("")}</ol>
    <div class="pick">
      ${st ? `<button id="resume" class="main-go"><span>${esc(T.resume)}</span><span class="q">${esc(fm(T.resumeQ, { step: resumeStep }))}</span></button>`
           : `<button id="start" class="main-go"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>`}
      <button id="ex"><span>${esc(T.example)}</span><span class="q">${esc(T.exampleQ)}</span></button>
    </div>
    <p class="note">${esc(T.note)}</p>
    ${st ? `<div class="reset"><button class="text-btn cover-link" id="reset">${esc(T.restart)}</button>
      <div class="reset-ask" id="resetAsk" hidden><p>${esc(T.restartAsk)}</p>
      <div class="reset-btns"><button class="chip-btn" id="resetYes">${esc(T.restartYes)}</button><button class="chip-btn" id="resetNo">${esc(T.restartNo)}</button></div></div></div>` : ""}
    ${foot()}`;
  const sb = $("#start"), rb = $("#resume");
  if(sb) sb.onclick = () => go("s1");
  $("#ex").onclick = () => go("ex");
  if(rb) rb.onclick = () => { const sc = STEP[S.last] != null ? S.last : "s1"; go(sc, sc === "fam" || sc === "board" ? "g" : null); };
  if(st){
    $("#reset").onclick = () => { $("#resetAsk").hidden = false; $("#reset").hidden = true; $("#resetYes").focus(); };
    $("#resetNo").onclick = () => { $("#resetAsk").hidden = true; $("#reset").hidden = false; };
    $("#resetYes").onclick = () => { S = C.blank(); try { localStorage.removeItem(KEY); } catch(e){} render("home"); };
  }
}

// ===== 1. 이름 · 날짜 =====
function s1(){
  page("step s1");
  app.innerHTML = `
    ${topBar("")}
    ${nav(0)}
    <h2 class="question">${br(T.s1Title)}</h2>
    <p class="lead2">${esc(T.s1Lead)}</p>
    <div class="sec">
      <div class="two-in">
        <label class="fld"><span>${esc(T.nameG)}</span><input id="ng" value="${esc(S.names.g)}" maxlength="${C.MAX.name}" placeholder="${esc(T.namePhG)}" autocomplete="off"></label>
        <label class="fld"><span>${esc(T.nameB)}</span><input id="nb" value="${esc(S.names.b)}" maxlength="${C.MAX.name}" placeholder="${esc(T.namePhB)}" autocomplete="off"></label>
      </div>
    </div>
    <div class="sec">
      <h3>${esc(T.meetTitle)}</h3>
      <label class="fld"><span>${esc(T.meetDate)}</span><input id="md" type="date" value="${esc(S.meet.date)}"></label>
      <label class="fld"><span>${esc(T.meetPlace)}</span><input id="mp" value="${esc(S.meet.place)}" maxlength="${C.MAX.place}" placeholder="${esc(T.meetPlacePh)}" autocomplete="off"></label>
      <p class="hint2">${esc(T.meetHelp)}</p>
    </div>
    <div class="info"><b>${esc(T.orderTitle)}</b><p>${esc(T.orderBody)}</p></div>
    <div class="dock"><button class="btn main" id="go">${esc(T.s1Go)}</button></div>
    ${foot()}`;
  bindBack(); bindNav(); bindTyping();
  $("#ng").oninput = e => { S.names.g = e.target.value.slice(0, C.MAX.name); save(); };
  $("#nb").oninput = e => { S.names.b = e.target.value.slice(0, C.MAX.name); save(); };
  $("#md").onchange = e => { S.meet.date = /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : ""; save(); };
  $("#mp").oninput = e => { S.meet.place = e.target.value.slice(0, C.MAX.place); save(); };
  $("#go").onclick = () => go("item", { i: 0 });
}

// ===== 1. 하나씩 고르기 =====
function statBox(){
  const max = Math.max(...T.statRows.map(r => r[1]));
  return `<div class="stat">
    <p class="stat-t">${esc(T.statTitle)}</p>
    <p class="stat-b">${esc(T.statBody)}</p>
    ${T.statRows.map(([a, n]) => `<div class="stat-r"><span>${esc(a)}</span><i><em style="width:${Math.round(n / max * 100)}%"></em></i><b>${n}%</b></div>`).join("")}
    <p class="stat-src">${esc(T.statSrc)}</p>
  </div>`;
}
function item(k){
  const i = Math.min(Math.max(k && Number.isInteger(k.i) ? k.i : 0, 0), N - 1), ret = k && k.ret;
  const it = C.ITEMS[i], x = S.items[it.k], d = T.items[it.k];
  page("step item");
  const lab = p => p === "undecided" ? T.undecided : d.picks[p].l;
  app.innerHTML = `
    ${topBar(fm(T.itemCount, { i: i + 1, n: N }))}
    ${nav(0)}
    <div class="prog" aria-hidden="true"><i style="width:${Math.round((i + 1) / N * 100)}%"></i></div>
    <p class="grp">${esc(it.grp === "A" ? T.grpA : T.grpB)}</p>
    <h2 class="question">${br(d.q)}</h2>
    <p class="what">${esc(d.what)}</p>
    <div class="answers" role="group" aria-label="${esc(d.name)}">
      ${it.picks.map((p, j) => `${j ? '<div class="div"></div>' : ""}<button type="button" data-p="${p}" class="${x.pick === p ? "on" : ""}" aria-pressed="${x.pick === p}"><span class="box">${CHECK}</span><span>${esc(lab(p))}</span></button>`).join("")}
    </div>
    ${it.note ? `<div class="note-in" id="noteBox"${it.note.includes(x.pick) ? "" : " hidden"}>
      <label class="fld"><span>${esc(d.noteLabel)}</span><input id="note" value="${esc(x.note)}" maxlength="${C.MAX.note}" placeholder="${esc(d.notePh)}" autocomplete="off"></label>
      <button class="btn main" id="noteGo">${esc(T.noteNext)}</button></div>` : ""}
    ${it.stat ? statBox() : ""}
    <div class="under"><span></span><button type="button" class="text-btn" id="skip">${esc(ret ? T.keep : T.skip)}</button></div>
    ${foot()}`;
  bindBack(); bindNav(); bindTyping();
  const advance = () => { if(ret){ history.back(); return; } if(i + 1 < N) go("item", { i: i + 1 }); else go("know"); };
  $$(".answers button").forEach(b => b.onclick = () => {
    if(app.dataset.lock) return;
    const p = b.dataset.p;
    if(x.pick && x.pick !== p) x.know = { g: false, b: false };   // 결론이 바뀌면 부모님이 아시는 것도 다시
    x.pick = p;
    if(!(it.note && it.note.includes(p))) x.note = "";
    save();
    $$(".answers button").forEach(o => { o.classList.toggle("on", o === b); o.setAttribute("aria-pressed", o === b); });
    if(it.note && it.note.includes(p)){
      $("#noteBox").hidden = false;
      return;
    }
    if($("#noteBox")) $("#noteBox").hidden = true;
    app.dataset.lock = "1";
    setTimeout(() => { delete app.dataset.lock; advance(); }, reduce ? 60 : 260);
  });
  const ni = $("#note");
  if(ni){
    ni.oninput = e => { x.note = e.target.value.slice(0, C.MAX.note); save(); };
    ni.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); ni.blur(); advance(); } };
    $("#noteGo").onclick = advance;
  }
  $("#skip").onclick = advance;
}

// ===== 1. 확인: 양가 부모님도 아세요? =====
function know(){
  page("step know");
  const K = C.knowInfo(S);
  const nameOf = k => T.items[k].name;
  const pct = K.total ? Math.round(K.all / K.total * 100) : 0;
  const rows = K.rows.map(r => {
    const k = r.k, x = r.x, und = x.pick === "undecided";
    return `<div class="kr${und ? " und" : ""}">
      <button type="button" class="kr-top" data-edit="${k}"><span class="kr-n">${esc(nameOf(k))}</span><span class="kr-v">${esc(C.shortOf(S, k))}</span><span class="kr-e">${esc(T.knowEdit)}</span></button>
      ${und ? `<p class="kr-hint">${esc(T.undecidedHint)}</p>
        <details class="kr-ask"><summary>${esc(T.askFirst)}</summary><p>${esc(q(C.askLine(k)))}</p></details>`
      : `<div class="kr-k">${["g", "b"].map(s => `<button type="button" class="kchip${x.know[s] ? " on" : ""}" data-know="${k}" data-s="${s}" aria-pressed="${x.know[s]}"><span class="box">${CHECK}</span><span class="kchip-t">${esc(s === "g" ? T.knowG : T.knowB)}<small>${esc(x.know[s] ? T.knowOn : T.knowOff)}</small></span></button>`).join("")}</div>`}
    </div>`;
  }).join("");
  const tell = ["g", "b"].filter(s => K.missing[s].length).map(s => `
    <p class="tell-who">${esc(T.tellWho[s])}</p>
    <ul class="tell">${K.missing[s].map(k => `<li>${esc(q(C.tellLine(S, k)))}</li>`).join("")}</ul>`).join("");
  const bRows = C.ITEMS.filter(it => it.grp === "B").map(it => `
    <button type="button" class="b-row" data-edit="${it.k}"><span>${esc(T.items[it.k].name)}</span><b>${esc(S.items[it.k].pick ? (S.items[it.k].pick === "undecided" ? T.undecided : T.items[it.k].picks[S.items[it.k].pick].l) : T.bNone)}</b></button>`).join("");
  app.innerHTML = `
    ${topBar("")}
    ${nav(0)}
    <h2 class="question">${br(T.knowTitle)}</h2>
    <p class="lead2">${esc(T.knowLead)}</p>
    ${K.rows.length ? `
      ${K.total ? `<div class="meter"><div class="meter-t"><span>${esc(T.knowMeter)}</span><b>${esc(fm(T.knowMeterV, { n: K.all, t: K.total }))}</b></div><i><em style="width:${pct}%"></em></i></div>` : ""}
      <div class="krs">${rows}</div>
      ${K.total ? `<div class="sec tell-box"><h3>${esc(tell ? T.tellTitle : T.tellAll)}</h3>${tell ? `<p class="hint2">${esc(fm(T.tellRule, { x: T.partnerWord }))}</p>${tell}` : ""}</div>` : ""}`
    : `<div class="sec"><p>${esc(T.knowEmpty)}</p><button class="btn main" id="toItems">${esc(T.knowEmptyBtn)}</button></div>`}
    <div class="sec b-box"><h3>${esc(T.bTitle)}</h3>${bRows}</div>
    <div class="dock"><button class="btn main" id="go">${esc(T.knowNext)}</button></div>
    ${foot()}`;
  bindBack(); bindNav();
  $$("[data-edit]").forEach(b => b.onclick = () => go("item", { i: C.IT[b.dataset.edit].i, ret: "know" }));
  $$("[data-know]").forEach(b => b.onclick = () => {
    const x = S.items[b.dataset.know]; x.know[b.dataset.s] = !x.know[b.dataset.s]; save();
    const y = window.scrollY; know(); window.scrollTo(0, y);
    const again = $(`[data-know="${b.dataset.know}"][data-s="${b.dataset.s}"]`); if(again) again.focus();
  });
  const ti = $("#toItems"); if(ti) ti.onclick = () => go("item", { i: 0 });
  $("#go").onclick = () => go("fam", "g");
}

// ===== 2. 이야기거리: 가족 =====
function customCount(){ return C.customCards(S).length; }
function fam(s){
  s = s === "b" ? "b" : "g";
  page("step fam");
  const f = S.fam[s];
  const person = r => {
    const p = f[r];
    return `<section class="sec person" data-r="${r}">
      <div class="p-head"><h3>${esc(T.sideName[s] + " " + T.honor[r])}</h3></div>
      <div class="p-on"><span>${esc(T.comes)}</span><div class="seg">
        <button type="button" data-on="1" aria-pressed="${p.on}">${esc(T.comesYes)}</button>
        <button type="button" data-on="0" aria-pressed="${!p.on}">${esc(T.comesNo)}</button></div></div>
      <div class="p-body"${p.on ? "" : " hidden"}>
        <p class="lab">${esc(T.likes)}</p>
        <div class="chips">${C.LIKES.map(([l]) => `<button type="button" class="chip" data-like="${esc(l)}" aria-pressed="${p.likes.includes(l)}">${esc(l)}</button>`).join("")}</div>
        <label class="fld"><span>${esc(T.likeOther)}</span><input data-f="like2" value="${esc(p.like2)}" maxlength="${C.MAX.like2}" placeholder="${esc(T.likeOtherPh)}" autocomplete="off"></label>
        <div class="two-in">
          <label class="fld"><span>${esc(T.homeL)}</span><input data-f="home" value="${esc(p.home)}" maxlength="${C.MAX.home}" placeholder="${esc(T.homePh)}" autocomplete="off"></label>
          <label class="fld"><span>${esc(T.jobL)}</span><input data-f="job" value="${esc(p.job)}" maxlength="${C.MAX.job}" placeholder="${esc(T.jobPh)}" autocomplete="off"></label>
        </div>
      </div>
    </section>`;
  };
  app.innerHTML = `
    ${topBar(fm(T.famStep, { i: s === "g" ? 1 : 2 }))}
    ${nav(1)}
    <h2 class="question">${br(T.famTitle[s])}</h2>
    <p class="lead2">${esc(T.famLead)}</p>
    ${person("fa")}${person("mo")}
    <section class="sec">
      <label class="fld"><span>${esc(T.sibL)}</span><input data-ff="sib" value="${esc(f.sib)}" maxlength="${C.MAX.sib}" placeholder="${esc(T.sibPh)}" autocomplete="off"></label>
      <label class="fld"><span>${esc(T.avoidL)}</span><input data-ff="avoid" value="${esc(f.avoid)}" maxlength="${C.MAX.avoid}" placeholder="${esc(T.avoidPh)}" autocomplete="off"></label>
      <p class="hint2">${esc(T.avoidHelp)}</p>
    </section>
    <div class="dock"><p class="dock-line" id="cnt" role="status"></p><button class="btn main" id="go">${esc(s === "g" ? T.famNextG : T.famNextB)}</button></div>
    ${foot()}`;
  bindBack(); bindNav(); bindTyping();
  const upd = () => { const n = customCount(); $("#cnt").textContent = n ? fm(T.famDock, { n }) : T.famDockNone; };
  upd();
  $$(".person").forEach(sec => {
    const p = f[sec.dataset.r];
    $$("[data-on]", sec).forEach(b => b.onclick = () => {
      p.on = b.dataset.on === "1"; save();
      $$("[data-on]", sec).forEach(o => o.setAttribute("aria-pressed", (o.dataset.on === "1") === p.on));
      $(".p-body", sec).hidden = !p.on; upd();
    });
    $$("[data-like]", sec).forEach(b => b.onclick = () => {
      const l = b.dataset.like, at = p.likes.indexOf(l);
      if(at >= 0) p.likes.splice(at, 1); else p.likes.push(l);
      b.setAttribute("aria-pressed", at < 0); save(); upd();
    });
    $$("[data-f]", sec).forEach(el => el.oninput = () => { p[el.dataset.f] = el.value.slice(0, C.MAX[el.dataset.f]); save(); upd(); });
  });
  $$("[data-ff]").forEach(el => el.oninput = () => { f[el.dataset.ff] = el.value.slice(0, C.MAX[el.dataset.ff]); save(); upd(); });
  $("#go").onclick = () => s === "g" ? go("fam", "b") : go("kid");
}

// ===== 2. 서로의 좋은 점 =====
function kid(){
  page("step kid");
  const box = s => `<section class="sec">
    <h3>${esc(fm(T.kidPick, { side: T.sideName[s], name: S.names[s] || "" }).trim())}</h3>
    <p class="hint2">${esc(fm(T.kidUse, { other: T.sideName[other(s)] }))}</p>
    <div class="chips" data-kid="${s}">${T.praise.map(([l], i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="${S.kid[s].includes(i)}">${esc(l)}</button>`).join("")}</div>
    <p class="msg left" data-msg="${s}" role="status"></p>
  </section>`;
  app.innerHTML = `
    ${topBar(fm(T.famStep, { i: 3 }))}
    ${nav(1)}
    <h2 class="question">${br(T.kidTitle)}</h2>
    <p class="lead2">${esc(T.kidLead)}</p>
    ${box("g")}${box("b")}
    <section class="sec">
      <label class="fld"><span>${esc(T.storyL)}</span><input id="story" value="${esc(S.story)}" maxlength="${C.MAX.story}" placeholder="${esc(T.storyPh)}" autocomplete="off"></label>
      <label class="fld"><span>${esc(T.menuL)}</span><input id="menu" value="${esc(S.menu)}" maxlength="${C.MAX.menu}" placeholder="${esc(T.menuPh)}" autocomplete="off"></label>
    </section>
    <div class="dock"><button class="btn main" id="go">${esc(T.kidNext)}</button></div>
    ${foot()}`;
  bindBack(); bindNav(); bindTyping();
  $$("[data-kid]").forEach(wrap => {
    const s = wrap.dataset.kid, msg = $(`[data-msg="${s}"]`);
    $$("button", wrap).forEach(b => b.onclick = () => {
      const i = +b.dataset.i, at = S.kid[s].indexOf(i);
      if(at >= 0){ S.kid[s].splice(at, 1); msg.textContent = ""; }
      else if(S.kid[s].length >= C.PRAISE_MAX){ msg.textContent = T.kidMax; return; }
      else S.kid[s].push(i);
      b.setAttribute("aria-pressed", at < 0); save();
    });
  });
  $("#story").oninput = e => { S.story = e.target.value.slice(0, C.MAX.story); save(); };
  $("#menu").oninput = e => { S.menu = e.target.value.slice(0, C.MAX.menu); save(); };
  $("#go").onclick = () => go("topics");
}

// ===== 2. 화제 카드 =====
function whoLine(c){
  if(c.hint) return esc(c.to);
  return esc(fm(T.fromTo, { from: c.from === "both" ? T.fromBoth : T.sideName[c.from], to: c.to }));
}
function cardHtml(c){
  return `<div class="tc${c.custom ? " mine" : ""}">
    <p class="tc-who">${whoLine(c)}${c.custom ? ` <span class="tag">${esc(T.tagCustom)}</span>` : ""}</p>
    <p class="tc-line">${esc(c.hint ? c.line : q(c.line))}</p>
    ${c.why ? `<p class="tc-why">${esc(c.why)}</p>` : ""}
  </div>`;
}
function topics(){
  page("step topics");
  const P = C.topics(S);
  app.innerHTML = `
    ${topBar("")}
    ${nav(1)}
    <h2 class="question">${br(T.topicsTitle)}</h2>
    <p class="lead2">${esc(T.topicsLead)}</p>
    ${P.custom.length ? `<section class="tcs"><h3>${esc(T.topicsCustom)}</h3><p class="hint2">${esc(T.topicsCustomSub)}</p>${P.custom.map(cardHtml).join("")}</section>`
      : `<div class="info"><p>${esc(T.topicsEmpty)}</p><button class="btn line" id="toFam">${esc(T.topicsEmptyBtn)}</button></div>`}
    <section class="tcs"><h3>${esc(T.topicsBasic)}</h3>${P.basic.map(cardHtml).join("")}</section>
    <div class="dock"><button class="btn main" id="go">${esc(T.topicsNext)}</button></div>
    ${foot()}`;
  bindBack(); bindNav();
  const tf = $("#toFam"); if(tf) tf.onclick = () => go("fam", "g");
  $("#go").onclick = () => go("board", "g");
}

// ===== 3. 부모님께 보낼 판 =====
// 판 블록 → 쪽 나누기 단위. 목록은 한 줄씩 나눠서, 쪽 끝에 남는 자리를 채워요
let LIST_ID = 0;
function units(b, head){
  const t = b.t ? `<h4>${esc(b.t)}</h4>` : "";
  const one = html => [{ html: `<div class="pb-u">${head}${html}</div>` }];
  const sub = b.sub ? `<p class="pb-sub">${esc(b.sub)}</p>` : "";
  if(b.type === "lead") return one(`<p class="pb-lead">${esc(b.text)}</p>`);
  if(b.type === "when") return one(`<div class="pb-when">${t}${b.text ? `<p class="pb-big">${esc(b.text)}</p>` : ""}<p>${esc(b.sub)}</p></div>`);
  if(b.type === "quote") return one(`<div class="pb-blk">${t}<p class="pb-q">${esc(q(b.text))}</p>${sub}</div>`);
  if(b.type === "from") return [{ html: `<div class="pb-u"><p class="pb-from">${esc(b.text)}</p></div>`, soft: true }];
  if(b.type === "list" || (b.type === "done" && b.items.length)){
    const id = "l" + (++LIST_ID), done = b.type === "done", tag = b.num ? "ol" : "ul";
    const cls = "pb-blk" + (b.no ? " no" : "") + (done ? " done" : "");
    const li = x => done ? `<li class="${x.both ? "both" : ""}"><b>${esc(x.name)}</b><span>${esc(x.val)}</span></li>` : `<li>${esc(x)}</li>`;
    const L = b.items.map((x, j) => j === 0
      ? { html: `<div class="pb-u">${head}<div class="${cls}">${t}<${tag} data-l="${id}">${li(x)}</${tag}></div></div>` }
      : { list: id, li: li(x), wrap: `<div class="pb-u"><div class="${cls}"><${tag} data-l="${id}"${b.num ? ` start="${j + 1}"` : ""}></${tag}></div></div>` });
    if(done && b.items.some(x => x.both)) L.push({ html: `<div class="pb-u"><p class="pb-legend">${esc(T.pb.doneLegend)}</p></div>`, soft: true });
    if(b.sub) L.push({ html: `<div class="pb-u">${sub}</div>`, soft: true });
    return L;
  }
  if(b.type === "done") return one(`<div class="pb-blk done">${t}<p>${esc(b.empty)}</p>${sub}</div>`);
  return one(`<div class="pb-blk">${t}<p>${esc(b.text)}</p>${sub}</div>`);
}
// 판을 휴대폰 한 화면 크기 사진으로 나눠요 (부모님 카톡에서 확대 없이 읽히게: 가로 1 : 세로 2 넘지 않게)
const PAGE_RATIO = 2;
function paginate(wrap, B, s){
  const head = fm(T.textHead, { side: T.sideName[s] }).replace(/^\[|\]$/g, "");
  const U = [];
  B.sections.forEach(sec => sec.blocks.forEach((b, i) => units(b, i === 0 ? `<h3 class="pb-h">${esc(sec.t)}</h3>` : "").forEach(u => U.push(u))));
  U.push({ html: `<div class="pb-u">${sign()}</div>`, glue: true });
  wrap.innerHTML = "";
  const maxH = Math.round(wrap.clientWidth * PAGE_RATIO);
  const newPage = () => {
    const a = document.createElement("article"); a.className = "pb-page"; a.dataset.n = "0";
    a.innerHTML = `<p class="pb-top"><span>${esc(head)}</span><span class="pb-n"></span></p>`;
    wrap.appendChild(a); return a;
  };
  // 한 단위 넣기 → 되돌리는 함수
  const put = (pg, u) => {
    if(!u.list){ pg.insertAdjacentHTML("beforeend", u.html); const el = pg.lastElementChild; return () => pg.removeChild(el); }
    let list = pg.querySelector(`[data-l="${u.list}"]`), wrapEl = null;
    if(!list){ pg.insertAdjacentHTML("beforeend", u.wrap); wrapEl = pg.lastElementChild; list = wrapEl.querySelector("[data-l]"); }
    list.insertAdjacentHTML("beforeend", u.li); const li = list.lastElementChild;
    return () => { list.removeChild(li); if(wrapEl) pg.removeChild(wrapEl); };
  };
  let pg = newPage();
  U.forEach(u => {
    const undo = put(pg, u);
    // 끝에 붙는 짧은 줄(soft)은 조금 넘쳐도 같은 쪽에 둬요 → 서명만 남는 쪽이 생기지 않게
    if(!u.glue && pg.dataset.n !== "0" && pg.offsetHeight > maxH * (u.soft ? 1.15 : 1)){ undo(); pg = newPage(); put(pg, u); }
    pg.dataset.n = String(+pg.dataset.n + 1);
  });
  const pages = $$(".pb-page", wrap);
  pages.forEach((p, i) => { $(".pb-n", p).textContent = fm(T.pageOf, { i: i + 1, n: pages.length }); });
  return pages;
}
function board(s){
  s = s === "b" ? "b" : "g";
  page("step board");
  const B = C.board(S, s);
  const miss = B.missing.length ? `<div class="warn miss"><b>${esc(fm(T.missTitle, { side: T.sideName[s], n: B.missing.length }))}</b><p>${esc(T.missBody)}</p>
    ${B.missing.map(k => `<div class="miss-r"><span><b>${esc(T.items[k].name)}</b> ${esc(C.shortOf(S, k))}</span><button type="button" class="chip-btn2" data-told="${k}">${esc(T.missBtn)}</button></div>`).join("")}</div>` : "";
  const und = B.undecided.length ? `<p class="hint2">${esc(fm(T.undecTitle, { list: B.undecided.map(k => T.items[k].name).join(" · ") }))} ${esc(T.undecBody)}</p>` : "";
  app.innerHTML = `
    ${topBar("")}
    ${nav(2)}
    <h2 class="question">${esc(T.boardTitle)}</h2>
    <p class="lead2">${esc(T.boardLead)}</p>
    <div class="tabs2" role="tablist">${["g", "b"].map(x => `<button type="button" role="tab" data-tab="${x}" aria-selected="${x === s}">${esc(T.boardTab[x])}</button>`).join("")}</div>
    <p class="who-send">${esc(fm(T.boardWho, { side: T.sideName[s] }))}</p>
    ${miss}${und}
    <div class="pb-wrap printable" id="pbWrap"></div>
    <div class="after">
      <div class="btns">
        <button class="btn ghost" id="sendTxt">${esc(T.sendText)}</button>
        <textarea class="copy-box" id="copyBox" hidden readonly aria-label="${esc(T.sendText)}"></textarea>
        <button class="btn ghost" id="print">${esc(T.printBtn)}</button>
        <p class="hint2 center">${esc(T.printHint)}</p>
        <button class="btn line" id="go">${esc(T.boardNext)}</button>
      </div>
    </div>
    <div class="dock"><p class="msg" id="msg" role="status"></p><button class="btn main" id="sendImg"></button><p class="dock-hint">${esc(T.sendImgHint)}</p></div>
    ${foot()}`;
  bindBack(); bindNav();
  const wrap = $("#pbWrap");
  const lay = () => {
    const pages = paginate(wrap, B, s);
    $("#sendImg").textContent = fm(T.sendImg, { n: pages.length });
    prepImages(pages, pages.map((_, i) => T.imgName[s] + "-" + (i + 1)), "#FFFFFF");
  };
  lay();
  // 글꼴이 늦게 오면 높이가 달라져요 → 다 오면 한 번 더 나눠요
  if(document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { if(screen === "board" && cur === s && wrap.isConnected) lay(); });
  $$("[data-tab]").forEach(b => b.onclick = () => { if(b.dataset.tab === s) return; history.replaceState({ sc: "board", k: b.dataset.tab }, ""); render("board", b.dataset.tab); });
  $$("[data-told]").forEach(b => b.onclick = () => { S.items[b.dataset.told].know[s] = true; save(); const y = window.scrollY; board(s); window.scrollTo(0, y); });
  $("#sendImg").onclick = () => sendImages($("#msg"));
  $("#sendTxt").onclick = () => shareText(C.boardText(S, s), $("#msg"), $("#copyBox"));
  $("#print").onclick = () => window.print();
  $("#go").onclick = () => go("day");
}

// ===== 4. 당일 한 장 =====
function day(){
  page("step day");
  const D = C.day(S);
  const who = c => c.hint ? esc(c.to) : esc(fm(T.fromTo, { from: c.from === "both" ? T.fromBoth : T.sideName[c.from], to: c.to }));
  app.innerHTML = `
    ${topBar("")}
    ${nav(3)}
    <h2 class="question">${br(T.dayTitle)}</h2>
    <p class="lead2">${esc(T.dayLead)}</p>
    <div class="day-tools"><button class="btn ghost" id="glance">${esc(T.glanceBtn)}</button><button class="btn ghost" id="print">${esc(T.printBtn)}</button></div>
    <p class="hint2">${esc(T.glanceHint)}</p>
    <article class="sheet printable" id="sheet">
      <div class="sh-head"><span class="sh-kind">${esc(T.dayKind)}</span><span class="sh-handle">@wed_voice.su</span></div>
      ${D.head || D.when ? `<p class="sh-who">${esc([D.head, D.when].filter(Boolean).join(" · "))}</p>` : ""}
      <div class="sh-cols">
        <section class="sh-steps"><h4>${esc(T.stepsT)}</h4><ol>${D.steps.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join("")}</ol></section>
        ${D.moments.map((m, i) => `<section class="mo">
          <h4><b>${i + 1}</b>${esc(m.t)}${m.sub ? `<small>${esc(m.sub)}</small>` : ""}</h4>
          <ul>${m.cards.map(c => `<li><span class="mo-who">${who(c)}</span><span class="mo-line">${esc(c.hint ? c.line : q(c.line))}</span></li>`).join("")}</ul>
        </section>`).join("")}
        <section class="sh-fix"><h4>${esc(T.fixTitle)}</h4><ul>${D.fix.map(f => `<li><span class="mo-who">${esc(f.when)}</span><span class="mo-line">${esc(q(f.line))}</span>${f.how ? `<small>${esc(f.how)}</small>` : ""}</li>`).join("")}</ul></section>
        <section class="sh-avoid"><h4>${esc(T.avoidTitle)}</h4><ul>${D.avoid.map(a => `<li>${esc(a)}</li>`).join("")}</ul></section>
        ${D.match.length ? `<section class="sh-match"><h4>${esc(T.matchT)}</h4><ul>${D.match.map(([a, b]) => `<li><b>${esc(a)}</b> ${esc(b)}</li>`).join("")}</ul></section>` : ""}
        <section class="sh-after"><h4>${esc(T.afterT)}</h4><p>${esc(q(D.after))}</p></section>
      </div>
      <p class="sh-quiet">${esc(D.quiet)}</p>
      ${sign()}
    </article>
    <div class="after">
      <div class="btns">
        <button class="btn ghost" id="sendTxt">${esc(T.sendDayText)}</button>
        <textarea class="copy-box" id="copyBox" hidden readonly aria-label="${esc(T.sendDayText)}"></textarea>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
        <button class="text-btn btn-link" id="home">${esc(T.homeBtn)}</button>
      </div>
    </div>
    <div class="dock"><p class="msg" id="msg" role="status"></p><button class="btn main" id="save">${esc(T.saveImg)}</button></div>
    ${foot()}`;
  bindBack(); bindNav();
  prepImages([$("#sheet")], [T.imgName.day], "#FFFFFF");
  $("#save").onclick = () => sendImages($("#msg"));
  $("#print").onclick = () => window.print();
  $("#glance").onclick = () => go("glance");
  $("#sendTxt").onclick = () => shareText(C.dayText(S), $("#msg"), $("#copyBox"));
  $("#home").onclick = () => go("home");
}

// ===== 4. 화장실에서 볼 한 화면 =====
function glance(){
  document.body.classList.add("is-cover", "dark-page");
  page("glance");
  const G = C.glance(S);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(T.glanceBack)}</button><span></span></div>
    <article class="gl" id="gl">
      <h2>${esc(T.glanceTitle)}</h2>
      ${G.when ? `<p class="gl-when">${esc(G.when)}</p>` : ""}
      <dl>${G.rows.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl>
    </article>
    <div class="btns gl-btns"><button class="btn main" id="save">${esc(T.saveImg)}</button><p class="msg" id="msg" role="status"></p></div>`;
  bindBack();
  prepImages([$("#gl")], [T.imgName.glance], "#161616");
  $("#save").onclick = () => sendImages($("#msg"));
}

// ===== 예시 먼저 보기 (가상의 가족 · 저장하지 않아요) =====
function ex(){
  page("step board ex");
  const E = C.clean(T.exampleState) || C.blank();
  app.innerHTML = `
    ${topBar(T.exTop)}
    <h2 class="question">${br(T.exTitle)}</h2>
    <p class="lead2">${esc(T.exLead)}</p>
    <div class="pb-wrap" id="pbWrap"></div>
    <div class="dock"><button class="btn main" id="go">${esc(T.exGo)}</button></div>
    ${foot()}`;
  bindBack();
  paginate($("#pbWrap"), C.board(E, "b"), "b");
  if(document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { if(screen === "ex") paginate($("#pbWrap"), C.board(E, "b"), "b"); });
  $("#go").onclick = () => started() ? go(STEP[S.last] != null ? S.last : "s1", S.last === "fam" || S.last === "board" ? "g" : null) : go("s1");
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  page("cover");
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
window.__bb = { get S(){ return S; }, get screen(){ return screen; } };   // 화면 흐름 시험용
