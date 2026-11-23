// 본식 동선 영상 — 화면. 사이트는 하나(down-the-aisle/), 영상은 신랑 · 신부 두 가지.
// 사회자님 11/23 "릴스는 2개로 올릴거야. 근데 사이트는 1개로. 식순은 똑같은데, 사이트를 두 번 접속해서 식순을 두 번 입력해야 하는 불편함"
// 흐름: 첫 화면 → 식순 고르기 → 누구 동선 고르기(신랑 · 신부) → 영상(화면 재생 · MP4 저장 · 링크 보내기)
// 공개 설정은 down-the-aisle/index.html: AISLE_OPEN(사이트 전체) · AISLE_BRIDE_OPEN(신부 버튼 — 그 전엔 흐린 "곧 공개돼요")
// 미리 보기: ?preview = 사이트 공개 뒤 모습(신부 흐림) · ?preview-bride = 신부 영상까지 열림
// 엔진 engine.js · 문구 text.js · 기획 docs/동선영상/기획.md · 영상 문장 docs/동선영상/영상-내용.txt
// 고른 식순은 이 기기(브라우저)에만 저장해요.

const OPEN = !!window.AISLE_OPEN;
const BRIDE_OPEN = !!window.AISLE_BRIDE_OPEN || /preview-bride/i.test(location.search);
const ROLES = ["groom", "bride"];
const isOn = r => r === "groom" || (r === "bride" && BRIDE_OPEN);
const T = AISLE_T.common;
const R = r => AISLE_T[r];
const KEY = "aisle.v1";
const FLOW_KEY = "in-good-order.v2";   // 같은 폰에서 식순표를 만들었으면 식순을 가져와요
const SITE_PATH = (SITES.aisleGroom && SITES.aisleGroom.path) || "down-the-aisle";

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");

// ===== 식순 =====
const DEF = { bride:"father", vows:"front", declare:"mc", blessing:1, song:"friend", kids:0, rings:0, speech:0, event:0 };
const CODE = { bride:["father", "alone", "groom"], vows:["front", "face"], declare:["mc", "father"], song:["friend", "groom", "none"] };
function clean(o){
  const r = Object.assign({}, DEF);
  if (!o || typeof o !== "object") return r;
  for (const k of Object.keys(CODE)) if (CODE[k].includes(o[k])) r[k] = o[k];
  for (const k of ["blessing", "kids", "rings", "speech", "event"]) if (o[k] === 0 || o[k] === 1 || o[k] === true || o[k] === false) r[k] = o[k] ? 1 : 0;
  return r;
}
// 링크에 담는 짧은 글: 예) #o=000010000&r=g (식순 9자리 + 누구 영상인지 g 신랑 · b 신부)
function enc(o){ return [CODE.bride.indexOf(o.bride), CODE.vows.indexOf(o.vows), CODE.declare.indexOf(o.declare), CODE.song.indexOf(o.song), o.blessing, o.kids, o.rings, o.speech, o.event].join(""); }
function dec(s){
  if (!/^[0-2][01][01][0-2][01]{5}$/.test(s || "")) return null;
  const n = s.split("").map(Number);
  return clean({ bride:CODE.bride[n[0]], vows:CODE.vows[n[1]], declare:CODE.declare[n[2]], song:CODE.song[n[3]], blessing:n[4], kids:n[5], rings:n[6], speech:n[7], event:n[8] });
}
function fromFlow(){
  try {
    const d = JSON.parse(localStorage.getItem(FLOW_KEY));
    if (!d || !Array.isArray(d.items) || !d.items.length) return null;
    const has = k => d.items.find(it => it && it.k === k);
    const way = (k, def) => { const it = has(k); return it && it.way ? it.way : def; };
    const song = has("song") ? (way("song", "one") === "groom" ? "groom" : "friend") : "none";
    return clean({ bride:way("bride", "father"), vows:way("vows", "front"), declare:way("declare", "mc"), song,
      blessing:has("blessing") ? 1 : 0, kids:has("kids") ? 1 : 0, rings:has("rings") ? 1 : 0, speech:has("speech") ? 1 : 0, event:has("event") ? 1 : 0 });
  } catch (e) { return null; }
}
function load(){ try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.o ? clean(d.o) : null; } catch (e) { return null; } }
function save(){ try { localStorage.setItem(KEY, JSON.stringify({ o:O })); } catch (e) {} }

const fromHash = dec((location.hash.match(/o=([0-9]+)/) || [])[1]);
const hashRole = fromHash ? ({ g:"groom", b:"bride" })[(location.hash.match(/[#&]r=([gb])/) || [])[1]] || null : null;
const saved = load(), flow = saved ? null : fromFlow();
let O = fromHash || saved || flow || clean(null);
let viaFlow = !fromHash && !saved && !!flow;
let started = !!(fromHash || saved);

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
// history.state = { sc:화면, role:누구 영상, trail:[지나온 화면들] } — "식순 바꾸기"가 쌓인 화면을 되감을 수 있게
let PL = null;   // 재생기
let CUR = "home", ROLE = "groom";
function go(sc, role){
  const trail = ((history.state && history.state.trail) || []).concat(CUR);
  history.pushState({ sc, role, trail }, "");
  render(sc, role);
}
// "식순 바꾸기": 지나온 길에 식순 화면이 있으면 거기까지 뒤로(쌓인 화면이 늘지 않게), 없으면 식순 화면으로
function toPick(){
  const tr = (history.state && history.state.trail) || [], i = tr.lastIndexOf("pick");
  if (i >= 0) history.go(-(tr.length - i)); else go("pick");
}
function render(sc, role){
  if (PL) { PL.pause(); PL = null; }
  if (sc === "watch" && !isOn(role)) sc = "who";   // 아직 공개 전 영상(신부)으로 온 링크 → 고르기 화면
  CUR = ({ home:1, pick:1, who:1, watch:1 })[sc] ? sc : "home";
  if (CUR === "watch") ROLE = role;
  ({ home, pick, who, watch })[CUR]();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => { const s = e.state || {}; render(s.sc || "home", s.role); });

const lenKo = s => { s = Math.floor(s); const m = Math.floor(s / 60), r = s % 60; return m ? `${m}분${r ? " " + r + "초" : ""}` : `${r}초`; };
const planOf = role => Aisle.build(role, O, AISLE_V, AISLE_N);

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const [a, q] = fromHash ? [T.received, T.receivedQ] : started ? [T.resume, T.resumeQ] : [T.start, T.startQ];
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick"><button id="go"><span>${esc(a)}</span><span class="q">${esc(q)}</span></button></div>
    ${started ? `<div class="again"><button class="text-btn cover-link" id="repick">${esc(T.restart)}</button></div>` : ""}
    <p class="note">${esc(T.note)}</p>
    ${foot()}`;
  $("#go").onclick = () => {
    if (!started) return go("pick");
    go("who");
    if (fromHash && hashRole && isOn(hashRole)) go("watch", hashRole);   // 받은 링크: 그 영상으로 바로 (뒤로 가면 고르기 화면)
  };
  if ($("#repick")) $("#repick").onclick = () => go("pick");
}

// ===== 식순 고르기 =====
function seg(key){
  const r = T.rows[key];
  return `<section class="sec row">
    <h3>${esc(r.label)}</h3>
    <div class="seg${r.opts.length > 2 ? " three" : ""}" role="group" aria-label="${esc(r.label)}">
      ${r.opts.map(([v, l]) => `<button type="button" data-k="${key}" data-v="${v}" aria-pressed="${String(O[key]) === String(v)}">${esc(l)}</button>`).join("")}
    </div></section>`;
}
function pick(){
  document.body.classList.remove("is-cover");
  app.className = "wrap step";
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(T.pickTitle)}</h2>
    <p class="lead2">${esc(T.pickLead)}</p>
    ${viaFlow ? `<p class="note2">${esc(T.fromFlow)}</p>` : ""}
    ${seg("bride")}${seg("vows")}${seg("declare")}${seg("blessing")}${seg("song")}
    <section class="sec row">
      <h3>${esc(T.extraLabel)}</h3>
      <p class="hint2">${esc(T.extraHelp)}</p>
      <div class="chips">${T.extras.map(([k, l]) => `<button type="button" class="chip" data-x="${k}" aria-pressed="${!!O[k]}">${esc(l)}</button>`).join("")}</div>
    </section>
    <div class="dock"><button class="btn main" id="next">${esc(T.next)}</button></div>`;
  $("#back").onclick = () => history.back();
  $$(".seg button").forEach(b => b.onclick = () => {
    const k = b.dataset.k, v = b.dataset.v;
    O[k] = /^[01]$/.test(v) ? +v : v;
    $$(`.seg button[data-k="${k}"]`).forEach(x => x.setAttribute("aria-pressed", x === b));
  });
  $$(".chip").forEach(b => b.onclick = () => {
    const k = b.dataset.x; O[k] = O[k] ? 0 : 1; b.setAttribute("aria-pressed", !!O[k]);
  });
  $("#next").onclick = () => { O = clean(O); save(); started = true; viaFlow = false; go("who"); };
}

// ===== 누구 동선 고르기 (신랑 · 신부) =====
function who(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover who";
  const card = r => isOn(r)
    ? `<button type="button" data-r="${r}"><span>${esc(R(r).pick)}</span><span class="q">${esc(fm(T.whoLen, { len:lenKo(planOf(r).total) }))}</span></button>`
    : `<button type="button" disabled><span>${esc(R(r).pick)}</span><span class="q">${esc(T.soonFor)}</span></button>`;
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span>${esc(T.name)}</span></div>
    <h1>${br(T.whoTitle)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.whoLead)}</p>
    <div class="pick">${ROLES.map(card).join("")}</div>
    ${BRIDE_OPEN ? "" : `<p class="note soon-note">${esc(T.brideSoon)} <a href="${INSTA}" target="_blank" rel="noopener">${esc(T.soonInsta)}</a></p>`}
    <div class="again"><button class="text-btn cover-link" id="repick">${esc(T.edit)}</button></div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $$(".pick button[data-r]").forEach(b => b.onclick = () => go("watch", b.dataset.r));
  $("#repick").onclick = toPick;
}

// ===== 영상 =====
let RESULT = null;   // { file, url, key }
function linkFor(role){
  // 공개 전이면 ?preview를 붙여요. 미리 보기 주소(?preview-bride 등)로 보고 있었으면 그대로 넘겨요.
  const q = /preview/i.test(location.search) ? location.search : (OPEN ? "" : "?preview");
  return `${ROOT}${SITE_PATH}/${q}#o=${enc(O)}&r=${role === "bride" ? "b" : "g"}`;
}
async function shareOrCopy(text, url, msg){
  if (navigator.share) {
    try { await navigator.share({ text, url }); msg.textContent = ""; return; }
    catch (e) { if (e && e.name === "AbortError") { msg.textContent = ""; return; } }
  }
  try { await navigator.clipboard.writeText(text + "\n" + url); msg.textContent = T.copied; }
  catch (e) { msg.textContent = url; }
}
function watch(){
  document.body.classList.remove("is-cover");
  app.className = "wrap step watch";
  const me = R(ROLE), other = ROLE === "groom" ? "bride" : "groom";
  const P = planOf(ROLE);
  const ia = Aisle.inApp();
  const key = ROLE + enc(O);
  if (RESULT && RESULT.key !== key) { URL.revokeObjectURL(RESULT.url); RESULT = null; }
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">${esc(T.back)}</button><span>${esc(me.name)}</span></div>
    <div class="stage-box">
      <canvas id="cv" aria-label="${esc(me.name)}"></canvas>
      <button class="big-play" id="big" aria-label="${esc(T.play)}"><span></span></button>
    </div>
    <div class="ctl">
      <button class="pp" id="pp" aria-label="${esc(T.play)}"><span class="ico play"></span></button>
      <input type="range" id="seek" min="0" max="${Math.round(P.total * 10)}" value="0" step="1" aria-label="재생 위치">
      <span class="time" id="time">0:00 / ${clock(P.total)}</span>
    </div>
    <p class="scn-l">${esc(T.scenes)}</p>
    <div class="scenes" id="scenes">${P.scenes.map((s, i) => `<button type="button" data-i="${i}">${esc(s.t)}</button>`).join("")}</div>
    <div class="btns">
      <div id="saveBox">${saveBoxHtml(P, ia)}</div>
      <p class="msg" id="msg" role="status"></p>
      <button class="btn ghost send" id="send"><span>${esc(T.sendBtn)}</span><small>${esc(T.sendHelp)}</small></button>
    </div>
    <div class="tip"><b>${esc(T.tipTitle)}</b><p>${esc(T.tip)}</p></div>
    <div class="btns after2">
      ${isOn(other) ? `<button class="btn ghost" id="other">${esc(R(other).see)}</button>` : ""}
      <button class="btn ghost" id="edit">${esc(T.edit)}</button>
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
    </div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $("#edit").onclick = toPick;
  // 다른 사람 영상: 지금 칸을 바꿔 끼워요(뒤로 가기는 그대로 고르기 화면)
  if ($("#other")) $("#other").onclick = () => { history.replaceState(Object.assign({}, history.state, { role:other }), ""); render("watch", other); };
  // 캔버스 크기 (화면 폭 × 기기 픽셀)
  const cv = $("#cv"), box = $(".stage-box");
  const cssW = Math.round(Math.min(box.clientWidth || 320, 380, Math.max(240, window.innerHeight * .6) * 9 / 16)), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.style.width = cssW + "px"; cv.style.height = Math.round(cssW * 16 / 9) + "px";
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssW * 16 / 9 * dpr);
  PL = Aisle.player(cv, P);
  const pp = $("#pp"), big = $("#big"), seek = $("#seek"), time = $("#time");
  const scBox = $("#scenes"), scBtns = $$("#scenes button");
  let lastSc = -1;
  PL.onTick = t => {
    seek.value = Math.round(t * 10);
    time.textContent = `${clock(t)} / ${clock(P.total)}`;
    let i = 0; P.scenes.forEach((s, j) => { if (t >= s.t0 - 1e-6) i = j; });
    if (i !== lastSc) {
      lastSc = i; scBtns.forEach((b, j) => b.setAttribute("aria-current", j === i ? "true" : "false"));
      // 지금 장면 버튼이 줄 밖에 있으면 옆으로 밀어서 보이게 (페이지는 안 움직여요)
      const b = scBtns[i], x = b.getBoundingClientRect().left - scBox.getBoundingClientRect().left;
      if (x < 0 || x + b.offsetWidth > scBox.clientWidth) scBox.scrollTo({ left:scBox.scrollLeft + x - 24, behavior:"smooth" });
    }
  };
  PL.onState = on => {
    pp.innerHTML = `<span class="ico ${on ? "pause" : "play"}"></span>`;
    pp.setAttribute("aria-label", on ? T.pause : T.play);
    big.hidden = on;
  };
  PL.onTick(0);
  const toggle = () => PL.on ? PL.pause() : PL.play();
  pp.onclick = toggle; big.onclick = toggle; cv.onclick = toggle;
  seek.oninput = () => PL.seek(+seek.value / 10);
  scBtns.forEach(b => b.onclick = () => { PL.seek(P.scenes[+b.dataset.i].t0 + .01); if (!PL.on) PL.play(); });
  Aisle.fontsReady().then(() => { if (PL && !PL.on) PL.draw(); });
  $("#send").onclick = () => shareOrCopy(fm(T.sendMsg, { name:me.name }), linkFor(ROLE), $("#msg"));
  bindSave(P, ia);
}
function clock(s){ s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

// ===== 영상 파일로 저장 =====
function saveBoxHtml(P, ia){
  if (ia) return `<div class="inapp"><p>${esc(fm(T.inApp, { app:ia }))}</p><button class="btn ghost" id="copyurl">${esc(T.copyLink)}</button></div>`;
  if (RESULT) return doneHtml();
  return `<button class="btn main save" id="save"><span>${esc(T.save)}</span><small>${esc(fm(T.saveSub, { len:lenKo(P.total) }))}</small></button>`;
}
function doneHtml(){
  const share = Aisle.IOS && navigator.canShare && navigator.canShare({ files:[RESULT.file] });
  return `<div class="done"><p class="done-t">${esc(T.saved)}</p>
    ${share ? `<button class="btn main" id="toPhotos">${esc(T.toPhotos)}</button>` : ""}
    <a class="btn ${share ? "ghost" : "main"}" id="toFile" href="${RESULT.url}" download="${esc(RESULT.file.name)}">${esc(T.toFile)}</a></div>`;
}
let JOB = null;
function bindSave(P, ia){
  const msg = $("#msg");
  if ($("#copyurl")) $("#copyurl").onclick = async () => {
    // 사파리 · 크롬은 저장 칸이 달라서, 고른 식순 · 보던 영상을 링크에 담아 복사해요
    const url = linkFor(ROLE);
    try { await navigator.clipboard.writeText(url); msg.textContent = T.copiedOpen; } catch (e) { msg.textContent = url; }
  };
  if ($("#toFile")) $("#toFile").onclick = () => { msg.textContent = T.fileHint; };
  if ($("#toPhotos")) $("#toPhotos").onclick = async () => {
    try { await navigator.share({ files:[RESULT.file] }); msg.textContent = T.sharedHint; }
    catch (e) { if (!e || e.name !== "AbortError") msg.textContent = T.shareFail; }
  };
  const btn = $("#save"); if (!btn) return;
  btn.onclick = async () => {
    if (JOB) return;
    if (PL) PL.pause();
    const job = JOB = { stop:false };
    const box = $("#saveBox");
    box.innerHTML = `<div class="making"><p class="mk-t" id="mkT">${esc(fm(T.making, { p:0 }))}</p>
      <div class="bar2"><i id="mkBar"></i></div><p class="hint2 center">${esc(T.makingHelp)}</p>
      <button class="text-btn btn-link" id="stop">${esc(T.cancel)}</button></div>`;
    $("#stop").onclick = () => { job.stop = true; };
    msg.textContent = "";
    const key = ROLE + enc(O);
    try {
      const file = await Aisle.exportMp4(P, `${R(ROLE).file}.mp4`, job, p => {
        const t = $("#mkT"), b = $("#mkBar");
        if (t) t.textContent = fm(T.making, { p:Math.floor(p * 100) });
        if (b) b.style.width = (p * 100).toFixed(1) + "%";
      });
      RESULT = { file, url:URL.createObjectURL(file), key };
      if ($("#saveBox")) { $("#saveBox").innerHTML = doneHtml(); bindSave(P, ia); }
    } catch (e) {
      if ($("#saveBox")) { $("#saveBox").innerHTML = saveBoxHtml(P, ia); bindSave(P, ia); }
      if (!e || e.code !== "cancel") msg.textContent = e && e.code === "unsupported" ? T.unsupported : T.failed;
      if (e && e.code !== "cancel") console.error(e);
    } finally { JOB = null; }
  };
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.soonFor)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.soonFor)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.soonLead)}</p>
    <div class="pick"><a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.soonInsta)}</a></div>
    ${foot()}`;
}

// ===== 시작 =====
(function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if (!OPEN && !preview) { soon(); return; }
  if (fromHash) { save(); }
  // 받은 링크의 #o= 는 저장했으니 주소에서 지워요 (식순을 바꾼 뒤 새로 고쳐도 받은 식순으로 되돌아가지 않게)
  history.replaceState({ sc:"home", trail:[] }, "", fromHash ? location.pathname + location.search : location.href);
  render("home");
})();
window.__aisle = { get O(){ return O; }, get ROLE(){ return ROLE; }, get CUR(){ return CUR; }, plan:planOf, enc, dec, BRIDE_OPEN };   // 화면 흐름 시험용
