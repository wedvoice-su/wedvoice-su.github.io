// 결혼 호칭 정리표 ㉖: 신부 · 신랑 고르기 → 배우자 가족 고르기 → 누구를 뭐라고 부르는지 그림 한 장 (이미지 저장)
// 화면 문구 · 호칭 자료 data.js · 공통 기능 shared/common.js · 조사 docs/결혼-호칭/조사/조사-정리.md
// 고른 가족은 이 기기(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/kith-and-kin/?preview)
const OPEN = false;
// =========================================================

const KEY = "kithAndKin.v1";
const SIB_MAX = 4;
const SIB_KINDS = ["ob", "os", "yb", "ys"];
const OLDER = { ob: 1, os: 1 };

// ===== 저장 =====
function famBlank(){ return { par: { fa: true, mo: true }, gp: { gf: false, gm: false }, sibs: [], eld: {}, seq: 0 }; }
function blank(){ return { v: 1, side: "", fam: { bride: famBlank(), groom: famBlank() }, alt: true, me: false }; }
function cleanFam(f){
  const b = famBlank();
  if(!f || typeof f !== "object") return b;
  const o = x => (x && typeof x === "object" ? x : {});
  b.par = { fa: o(f.par).fa !== false, mo: o(f.par).mo !== false };
  b.gp = { gf: !!o(f.gp).gf, gm: !!o(f.gp).gm };
  ELDERS.forEach(e => { if(o(f.eld)[e.id]) b.eld[e.id] = true; });
  b.sibs = (Array.isArray(f.sibs) ? f.sibs : []).filter(s => s && SIB_KINDS.includes(s.k)).slice(0, SIB_MAX)
    .map((s, i) => ({ id: +s.id > 0 ? +s.id : i + 1, k: s.k, wed: !!s.wed, name: String(s.name || "").slice(0, 10), spName: String(s.spName || "").slice(0, 10) }));
  b.seq = Math.max(+f.seq || 0, ...b.sibs.map(s => s.id), 0);
  return b;
}
function load(){
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if(!x || x.v !== 1) return null;
    const b = blank();
    b.side = x.side === "bride" || x.side === "groom" ? x.side : "";
    b.fam = { bride: cleanFam(x.fam && x.fam.bride), groom: cleanFam(x.fam && x.fam.groom) };
    b.alt = x.alt !== false; b.me = !!x.me;
    return b;
  } catch(e){ return null; }
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
let S = load() || blank();

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const F = () => S.fam[S.side];
const SD = () => SIDE[S.side];
// {sp} → 남편/아내, {me} → 신부/신랑, 그 밖의 {키}는 o에서
function fm(s, o){
  const sd = SIDE[S.side] || SIDE.bride;
  return String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : k === "sp" ? sd.sp : k === "me" ? sd.me : ""));
}
const br = s => esc(s).replace(/\n/g, "<br>");
// '…' 안의 말을 굵게
const quoteB = s => esc(s).replace(/'([^']+)'/g, "<b>‘$1’</b>");
// 형제자매를 그림 순서로: 손위(넣은 순서) → 손아래(넣은 순서)
function sibsInOrder(){ const s = F().sibs; return [...s.filter(x => OLDER[x.k]), ...s.filter(x => !OLDER[x.k])]; }

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let screen = "home";
function go(sc){ history.pushState({ sc }, ""); render(sc); }
function render(sc){
  closeSheet(false);
  if(sc !== "home" && !S.side) sc = "home";
  screen = sc;
  ({ home, fam, res })[sc]();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  const st = e.state || { sc: "home" };
  if(sheetEl){ closeSheet(false); if(st.sc === screen) return; }
  render(st.sc);
});

// ===== 1. 첫 화면: 신부 · 신랑 고르기 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      <button data-side="bride"><span>${esc(T.pickBride)}</span><span class="q">${esc(T.pickBrideQ)}</span></button>
      <button data-side="groom"><span>${esc(T.pickGroom)}</span><span class="q">${esc(T.pickGroomQ)}</span></button>
    </div>
    <p class="note">${esc(T.coverNote)}</p>
    ${foot()}`;
  app.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { S.side = b.dataset.side; save(); go("fam"); });
}

// ===== 2. 배우자 가족 고르기 =====
function chip(grp, k, label){
  const on = !!F()[grp][k];
  return `<button class="chip" data-grp="${grp}" data-k="${k}" aria-pressed="${on}"><span class="ck">${CHECK}</span><span>${esc(label)}</span></button>`;
}
function sibRow(s){
  const sd = SD(), who = sd.sib[s.k], spWho = sd.spOf[s.k];
  return `
    <div class="sib" data-id="${s.id}">
      <div class="sib-top">
        <b class="sib-k">${esc(who)}</b>
        <input class="nm" data-f="name" value="${esc(s.name)}" placeholder="${esc(fm(T.namePh, { who: "" }).trim())}" maxlength="10" autocomplete="off" aria-label="${esc(fm(T.namePh, { who }))}">
        <button class="x" data-del aria-label="${esc(who + " " + T.remove)}">×</button>
      </div>
      <label class="wed"><input type="checkbox" data-f="wed" ${s.wed ? "checked" : ""}><span>${esc(T.wedLabel)}</span><span class="wed-sub">${esc(spWho)}도 넣어요</span></label>
      ${s.wed ? `<input class="nm sp-nm" data-f="spName" value="${esc(s.spName)}" placeholder="${esc(fm(T.namePh, { who: spWho }))}" maxlength="10" autocomplete="off">` : ""}
    </div>`;
}
// 형제자매 목록: 손위 → (배우자 ♥ 나 자리) → 손아래. 그림과 같은 순서
function sibList(){
  const s = sibsInOrder(); if(!s.length) return "";
  const n = s.filter(x => OLDER[x.k]).length;
  const me = `<div class="sib-me"><span>${esc(fm(T.sibMe)).replace("♥", '<span class="heart">♥</span>')}</span></div>`;
  return [...s.slice(0, n).map(sibRow), me, ...s.slice(n).map(sibRow)].join("");
}
function fam(){
  document.body.classList.remove("is-cover");
  app.className = "wrap fam";
  const sd = SD(), f = F(), full = f.sibs.length >= SIB_MAX;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><button class="top-btn" id="chg">${esc(fm(T.famTop))} · ${esc(T.famChange)}</button></div>
    <h2 class="question">${br(fm(T.famQ))}</h2>
    <p class="fam-lead">${esc(T.famLead)}</p>
    <section class="sec">
      <h3>${esc(fm(T.secPar))}</h3>
      <div class="chips">${chip("par", "fa", "아버지")}${chip("par", "mo", "어머니")}</div>
    </section>
    <section class="sec">
      <h3>${esc(fm(T.secSib))}</h3>
      <p class="hint2">${esc(T.secSibHint)}</p>
      <div class="sibs">${sibList()}</div>
      <div class="adds">${SIB_KINDS.map(k => `<button class="add" data-add="${k}" ${full ? "disabled" : ""}>+ ${esc(sd.sib[k])}</button>`).join("")}</div>
      ${full ? `<p class="hint2 max">${esc(T.sibMax)}</p>` : ""}
    </section>
    <section class="sec">
      <h3>${esc(T.secMore)} <span class="sub">${esc(T.secMoreSub)}</span></h3>
      <p class="lbl">${esc(fm(T.secGp))}</p>
      <div class="chips">${chip("gp", "gf", "할아버지")}${chip("gp", "gm", "할머니")}</div>
      <p class="lbl">${esc(T.secEld)}</p>
      <div class="chips">${ELDERS.map(e => chip("eld", e.id, e.label)).join("")}</div>
      <p class="hint2">${esc(T.eldHint)}</p>
    </section>
    <div class="dock"><button class="btn main" id="go">${esc(T.go)}</button></div>
    ${foot()}`;

  $("#chg").onclick = () => go("home");
  $("#go").onclick = () => go("res");
  app.querySelectorAll(".chip").forEach(b => b.onclick = () => {
    const g = F()[b.dataset.grp], k = b.dataset.k;
    g[k] = !g[k]; if(!g[k] && b.dataset.grp === "eld") delete g[k];
    b.setAttribute("aria-pressed", !!g[k]); save();
  });
  app.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
    const f = F(); if(f.sibs.length >= SIB_MAX) return;
    const id = ++f.seq; f.sibs.push({ id, k: b.dataset.add, wed: false, name: "", spName: "" }); save();
    keepScroll(fam);
    const row = app.querySelector(`.sib[data-id="${id}"]`);
    if(row){ row.classList.add("new"); row.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
  });
  app.querySelectorAll(".sib").forEach(row => {
    const s = F().sibs.find(x => x.id === +row.dataset.id);
    row.querySelector("[data-del]").onclick = () => { F().sibs = F().sibs.filter(x => x !== s); save(); keepScroll(fam); };
    row.querySelector("[data-f=wed]").onchange = e => {
      s.wed = e.target.checked; save(); keepScroll(fam);
      if(s.wed){ const sp = app.querySelector(`.sib[data-id="${s.id}"] .sp-nm`); if(sp) sp.scrollIntoView({ block: "nearest" }); }
    };
    row.querySelectorAll("input.nm").forEach(inp => inp.oninput = () => { s[inp.dataset.f] = inp.value.trim().slice(0, 10); save(); });
  });
}
// 다시 그려도 보던 자리 그대로
function keepScroll(fn){ const y = window.scrollY; fn(); window.scrollTo(0, y); }
// 엔터를 누르면 자판을 내려요
document.addEventListener("keydown", e => { if(e.key === "Enter" && e.target.matches && e.target.matches("input.nm")) e.target.blur(); });

// ===== 3. 호칭표 (이미지 한 장) =====
// 그림에 넣을 칸 목록: { key, name, wed, short }
function shown(){
  const f = F(), out = { gp: [], par: [], kids: [], eld: [] };
  ["gf", "gm"].forEach(k => { if(f.gp[k]) out.gp.push({ key: k }); });
  ["fa", "mo"].forEach(k => { if(f.par[k]) out.par.push({ key: k }); });
  sibsInOrder().forEach(s => {
    const row = [{ key: s.k, name: s.name, wed: s.wed }];
    if(s.wed) row.push({ key: s.k + "_sp", name: s.spName, short: SD().spOf[s.k] });
    out.kids.push(row);
  });
  // 우리 부부는 손위와 손아래 사이
  const older = F().sibs.filter(x => OLDER[x.k]).length;
  out.kids.splice(older, 0, "couple");
  ELDERS.forEach(e => { if(f.eld[e.id]) out.eld.push([{ key: e.id + "_a" }, { key: e.id + "_b" }]); });
  return out;
}
let CELLS = [];   // 칸 번호 → 칸 정보 (자세히 보기용)
// 요즘 많이 쓰는 말: alt 또는 (now면) call의 두 번째 말
// "지민 씨"가 줄 끝에서 갈라지지 않게 이름과 "씨" 사이는 붙는 띄어쓰기
function altOf(r, c){ return r.alt ? r.alt.replace("{name}", c.name || "○○").replace(/ 씨$/, "\u00a0씨") : r.now ? r.call.split(" · ")[1] : ""; }
function callOf(r, c){ return (c.wed && r.wed) || r.call; }
function cell(c){
  const r = KIN[S.side][c.key], x = CELLS.push(c) - 1;
  const parts = callOf(r, c).split(" · ");
  const label = (c.short || r.short) + (c.name ? " · " + c.name : "");
  const alt = S.alt && !r.now ? altOf(r, c) : "", me = S.me ? r.me || "" : "";
  const orTag = S.alt && r.now ? `<i class="tg t-alt">${esc(T.tagAlt)}</i> ` : esc(T.or) + " ";
  return `<div class="cell" role="button" tabindex="0" data-x="${x}" aria-label="${esc(label + ", " + parts.join(" 또는 ") + ", 자세히 보기")}">
      <span class="rel">${esc(label)}</span>
      <b class="call">${esc(parts[0])}</b>
      ${parts[1] ? `<span class="or">${orTag}<b>${esc(parts[1])}</b></span>` : ""}
      ${alt ? `<span class="alt"><i class="tg t-alt">${esc(T.tagAlt)}</i> ${esc(alt)}</span>` : ""}
      ${me ? `<span class="tome"><i class="tg t-me">${esc(T.tagMe)}</i> ${esc(me)}</span>` : ""}
    </div>`;
}
function pair(cs){ return `<div class="pair${cs.length > 1 ? " two" : ""}">${cs.map(cell).join("")}</div>`; }
function allCells(sh){ return [...sh.gp, ...sh.par, ...sh.kids.filter(k => k !== "couple").flat(), ...sh.eld.flat()]; }
function anyAlt(sh){ return allCells(sh).some(c => KIN[S.side][c.key].alt || KIN[S.side][c.key].now); }
// 근거 링크 한 줄
function refLink(k, label){ return `<li><a href="${esc(REF[k].url)}" target="_blank" rel="noopener">${esc(label || REF[k].label)}<span class="ext" aria-hidden="true"> ↗</span></a></li>`; }
function res(){
  document.body.classList.remove("is-cover");
  app.className = "wrap res";
  CELLS = [];
  const sh = shown(), f = F(), hasAlt = anyAlt(sh), showAlt = S.alt && hasAlt;
  const src2020 = showAlt && allCells(sh).some(c => KIN[S.side][c.key].alt);
  const kids = sh.kids.map(k => k === "couple"
    ? `<div class="kid"><div class="couple">${esc(fm(T.couple)).replace("♥", '<span class="heart">♥</span>')}</div></div>`
    : `<div class="kid">${pair(k)}</div>`).join("");
  const hasTop = sh.gp.length || sh.par.length;
  const sadon = f.par.fa && f.par.mo ? T.sadonBoth : f.par.fa ? T.sadonFa : f.par.mo ? T.sadonMo : "";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(fm(T.resKind))}</span></div>
    <div class="opts">
      ${hasAlt ? `<button class="chip sm" id="optAlt" aria-pressed="${S.alt}"><span class="ck">${CHECK}</span><span>${esc(T.optAlt)}</span></button>` : ""}
      <button class="chip sm" id="optMe" aria-pressed="${S.me}"><span class="ck">${CHECK}</span><span>${esc(T.optMe)}</span></button>
    </div>
    <p class="tap-hint">${esc(fm(T.tapHint))}</p>
    <article class="card kin" id="card">
      <div class="head"><span class="kind">${esc(fm(T.resKind))}</span><span class="handle">@wed_voice.su</span></div>
      <h2 class="kin-title">${br(fm(T.resTitle))}</h2>
      <div class="legend">
        <span>${esc(T.legendCall)}</span>
        ${showAlt ? `<span><i class="tg t-alt">${esc(T.tagAlt)}</i> ${esc(T.legendAlt)}</span>` : ""}
        ${S.me ? `<span><i class="tg t-me">${esc(T.tagMe)}</i> ${esc(T.legendMe)}</span>` : ""}
      </div>
      <div class="tree">
        ${sh.gp.length ? pair(sh.gp) + (sh.par.length ? '<div class="stem"></div>' : "") : ""}
        ${sh.par.length ? pair(sh.par) : ""}
        <div class="kids${hasTop ? " from-top" : ""}">${kids}</div>
      </div>
      ${sh.eld.length ? `<div class="eld"><p class="sec-t">${esc(T.rowEld)}</p>${sh.eld.map(pair).join("")}</div>` : ""}
      ${sadon ? `<div class="sadon"><b>${esc(T.sadonTitle)}</b><p>${quoteB(fm(sadon))}</p><p class="s2">${quoteB(T.sadonSub)}</p></div>` : ""}
      <p class="cfoot">${esc(fm(T.cardFoot))}</p>
      <p class="csrc">${esc(T.cardSrc)}${src2020 ? esc(T.cardSrc2020) : ""}</p>
      ${sign()}
    </article>
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">${esc(T.save)}</button>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="edit">${esc(T.edit)}</button>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
        <button class="text-btn btn-link" id="restart">${esc(T.restart)}</button>
      </div>
    </div>
    <section class="refs" aria-labelledby="refs-t">
      <h3 id="refs-t">${esc(T.refsTitle)}</h3>
      <p>${esc(T.refsLead)}</p>
      <ul>${["std", "qna", "khan", "hk"].map(k => refLink(k)).join("")}</ul>
    </section>
    ${foot()}`;

  $("#save").onclick = saveCard;
  $("#edit").onclick = () => history.back();
  $("#restart").onclick = () => go("home");
  const opt = (id, k) => { const b = $(id); if(b) b.onclick = () => { S[k] = !S[k]; save(); keepScroll(res); }; };
  opt("#optAlt", "alt"); opt("#optMe", "me");
  app.querySelectorAll(".cell").forEach(el => {
    el.onclick = () => openSheet(+el.dataset.x, el);
    el.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openSheet(+el.dataset.x, el); } };
  });
  prepareImage("결혼호칭-" + SD().sp + "가족");
}

// ===== 자세히 보기 (아래에서 올라오는 창) =====
let sheetEl = null, sheetFrom = null;
function openSheet(x, from){
  const c = CELLS[x]; if(!c) return;
  const r = KIN[S.side][c.key], call = callOf(r, c), alt = altOf(r, c);
  const rel = r.rel + (c.name ? " · " + c.name : "");
  const row = (dt, dd, sub) => dd ? `<div class="sh-row"><dt>${esc(dt)}</dt><dd>${esc(dd)}${sub ? `<small>${esc(sub)}</small>` : ""}</dd></div>` : "";
  sheetFrom = from;
  sheetEl = document.createElement("div");
  sheetEl.className = "sheet-bg";
  sheetEl.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t">
      <p class="sh-rel">${esc(rel)}</p>
      <h3 class="sh-call" id="sh-t" tabindex="-1">${esc(call.split(" · ").join(" / "))}</h3>
      <dl class="sh-dl">
        ${row(T.sCall, call.split(" · ").join(", "))}
        ${row(fm(T.sSp), r.sp)}
        ${row(T.sOt, r.ot)}
        ${row(T.sAlt, alt, r.altSrc)}
        ${row(T.sMe, r.me)}
      </dl>
      ${r.note ? `<p class="sh-note">${quoteB(r.note)}</p>` : ""}
      <p class="sh-src">${esc(T.sSrc)}</p>
      <ul class="sh-links">${refLink("std", T.srcStd + (r.src ? " " + r.src : ""))}${(r.refs || []).map(k => refLink(k)).join("")}</ul>
      <button class="btn main" id="shClose">${esc(T.close)}</button>
    </div>`;
  document.body.appendChild(sheetEl);
  document.body.classList.add("sheet-open");
  history.pushState({ sc: screen, sheet: 1 }, "");
  sheetEl.addEventListener("click", e => { if(e.target === sheetEl) history.back(); });
  $("#shClose", sheetEl).onclick = () => history.back();
  sheetEl.addEventListener("keydown", e => {
    if(e.key === "Escape") history.back();
    if(e.key === "Tab"){
      const f = [...sheetEl.querySelectorAll("a, button")], i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  $("#sh-t", sheetEl).focus();
}
function closeSheet(){
  if(!sheetEl) return;
  sheetEl.remove(); sheetEl = null;
  document.body.classList.remove("sheet-open");
  if(sheetFrom && document.contains(sheetFrom)) sheetFrom.focus();
  sheetFrom = null;
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
window.__kin = { get S(){ return S; }, shown, get CELLS(){ return CELLS; } };   // 화면 흐름 시험용
