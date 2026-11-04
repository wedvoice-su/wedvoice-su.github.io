// 식전영상 만들기: 템플릿 → 사진 → 글 → 음악 → 미리 보고 만들기
// 영상 엔진은 engine.js, 템플릿 디자인은 templates.js, 기본 음원은 music/tracks.js, 공통 기능은 shared/common.js
// 기술 근거·시험 결과·테스트 항목은 docs/식전영상/ (로컬 문서)

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/now-showing/?preview)
// 시험할 때 ?debug 를 붙이면 기기 점검 결과와 만든 영상 정보가 보여요. (예: …/now-showing/?preview&debug)
const OPEN = false;
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has("debug");
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SAVE_KEY = "nowShowing.v1";
const SAFE = "사진과 음악은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.";
const MAX_PHOTOS = 60;
const STEPS = 5;
const LIST = TRACKS.filter(t => !t.local || LOCAL);
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.6v10.8L13 8z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.6h3v10.8H4zM9 2.6h3v10.8H9z" fill="currentColor"/></svg>';

// ===== 영상 속 추천 문장 (초안: 사회자님 검토 전, 근거: docs/식전영상/조사-문구.md) =====
// 하객께는 '-습니다' 한 줄(15~25자), 영어는 제목·끝 문장에만. "서로 다른 두 사람", "새로운 시작", "평범한 ~ 특별"은 뺐어요(여러 곳에 반복돼 식상할 위험).
// { t, alt }: t의 {만난해}·{연애}·{일수}는 '사귄 날'로 채워요. 사귄 날을 안 쓰면 alt를 써요.
const WORDS = {
  open: ["우리 결혼합니다", "Our Wedding Day", "오늘의 신랑, 신부를 소개합니다", "함께 웃어온 시간 끝에\n오늘 부부가 됩니다", "We are getting married"],
  story: [
    { t: "{만난해}년, 처음 만난 날", alt: "처음 만난 날" },
    "함께 걸어온 시간",
    "함께 먹고 걷고 여행하며\n추억을 쌓았습니다",
    "웃는 날도 서툰 날도\n서로의 편이 되어 주었습니다",
    { t: "함께한 지 {일수}일째", alt: "함께한 날들" },
    { t: "{연애} 연애의 마침표", alt: "긴 연애의 마침표" },
    "이제 연인에서\n평생의 가족이 되려 합니다",
    "그리고 오늘"
  ],
  thanks: ["귀한 걸음으로 함께해 주신 마음\n잊지 않겠습니다", "저희의 시작을 축복해 주셔서\n감사합니다", "오늘, 함께해 주셔서\n감사합니다"],
  parents: ["사랑으로 키워 주셔서\n감사합니다", "두 분의 사랑으로\n오늘의 저희가 있습니다", "엄마, 아빠\n고맙습니다. 잘 살게요"],
  close: ["앞으로의 모든 계절도\n함께하겠습니다", "서로 아끼며\n행복하게 살겠습니다", "To be continued...", "이제 곧 예식이 시작됩니다"]   // 마지막 줄은 한 번만 틀 때용 (반복 재생이면 시점이 안 맞음)
};
// 완성 화면 안내 (초안, 근거: docs/식전영상/조사-상영실무.md)
const HOWTO = [
  "카톡으로 보낼 땐 + → '파일'로 보내 주세요. '파일'로 보내면 원본 그대로 가요.",
  "카톡 파일은 시간이 지나면 받을 수 없어요. 식장에서 바로 저장해 달라고 해 주세요.",
  "메일은 25MB가 넘으면 링크로 가요. 식장이 미리 내려받았는지 확인해 주세요.",
  "USB에도 한 벌 담아 두세요. 식장에는 예식 1주일 전까지 보내는 게 안전해요."
];
const MC_TIP = "식전영상을 하객 입장 동안 반복해서 틀지, 예식 직전에 한 번 틀지 식장·사회자와 미리 정해 두세요. 한 번만 튼다면 사회자의 착석 안내 바로 뒤가 가장 많이 봐요.";

// ===== 상태 (이 휴대폰에 보관해서 새로고침해도 그대로) =====
function fresh(){
  return { step: 0, tpl: TEMPLATES[0].key, groom: "", bride: "", groomEn: "", brideEn: "", date: "", time: "", venue: "", met: "",
    open: 0, openEdit: null,
    story: [[0, true], [1, true], [4, false], [7, true]].map(([pick, on]) => ({ on, pick, edit: null })),
    introOn: false, introGroom: "", introBride: "",
    parentsOn: false, parents: 0, parentsEdit: null,
    thanksOn: true, thanks: 0, thanksEdit: null, close: 0, closeEdit: null,
    track: LIST.length ? LIST[0].id : "", ratio: "16:9", q: "1080" };
}
function read(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
let S = Object.assign(fresh(), read());
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

// 사진·내 음악은 크기가 커서 IndexedDB에 보관해요 (이 휴대폰 안에만)
const DB = (() => {
  let job = null;
  const open = () => job || (job = new Promise((res, rej) => {
    const r = indexedDB.open("nowShowing", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const tx = db.transaction("kv", mode), rq = fn(tx.objectStore("kv"));
    tx.oncomplete = () => res(rq ? rq.result : undefined);
    tx.onerror = tx.onabort = () => rej(tx.error);
  }));
  return {
    get: k => run("readonly", s => s.get(k)).catch(() => undefined),
    set: (k, v) => run("readwrite", s => s.put(v, k)).catch(() => {}),
    del: k => run("readwrite", s => s.delete(k)).catch(() => {}),
    clear: () => run("readwrite", s => s.clear()).catch(() => {})
  };
})();

let PH = [];        // 사진 { id, blob, thumb, w, h, url }
let MINE = null;    // 내가 넣은 음악 { name, blob }
let AUD = { key: "", buf: null };   // 풀어 둔 음악
let SEL = -1;       // 고른 사진
let PLAYER = null, CUR = null, SAMPLE = null, RESULT = null;
const PREV = new Audio();           // 음원 미리듣기

async function restore(){
  const order = await DB.get("order");
  if (Array.isArray(order)) for (const id of order) {
    const p = await DB.get("ph:" + id);
    if (p && p.blob) PH.push({ ...p, url: URL.createObjectURL(p.thumb || p.blob) });
  }
  const m = await DB.get("music");
  if (m && m.blob) MINE = m;
}
const saveOrder = () => DB.set("order", PH.map(p => p.id));

// ===== 글 =====
const tpl = () => TEMPLATES.find(x => x.key === S.tpl) || TEMPLATES[0];
// 사귄 날로 채우는 말: {만난해} 2019 · {연애} 5년(1년 안 되면 8개월) · {일수} 1,234 (사귄 날부터 예식 날까지, 예식 날을 안 쓰면 오늘까지)
function ymd(s){ const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); }
function fillWord(w){
  if (typeof w === "string") return w;
  if (!S.met) return w.alt;
  const met = ymd(S.met), end = S.date ? ymd(S.date) : new Date();
  const days = Math.round((end - met) / 864e5) + 1;
  if (!(days > 0)) return w.alt;
  const months = (end.getFullYear() - met.getFullYear()) * 12 + end.getMonth() - met.getMonth() - (end.getDate() < met.getDate() ? 1 : 0);
  const span = months >= 12 ? `${Math.floor(months / 12)}년` : `${Math.max(1, months)}개월`;
  return w.t.replace(/\{만난해\}/g, met.getFullYear()).replace(/\{연애\}/g, span).replace(/\{일수\}/g, days.toLocaleString("ko-KR"));
}
const pickOf = (arr, i) => fillWord(arr[((i % arr.length) + arr.length) % arr.length]);
function lineOf(id){
  for (const k of ["open", "thanks", "parents", "close"]) if (id === k) return S[k + "Edit"] != null ? S[k + "Edit"] : pickOf(WORDS[k], S[k]);
  const x = S.story[+id.slice(5)];
  return x.edit != null ? x.edit : pickOf(WORDS.story, x.pick);
}
function data(){
  return { groom: S.groom.trim(), bride: S.bride.trim(), groomEn: S.groomEn.trim().toUpperCase(), brideEn: S.brideEn.trim().toUpperCase(),
    date: S.date, time: S.time, venue: S.venue.trim(),
    open: [lineOf("open"), ""], story: S.story.map((x, i) => x.on ? { text: lineOf("story" + i) } : null).filter(x => x && x.text.trim()),
    captions: PH.map(p => p.caption || ""),
    intro: S.introOn ? { groom: S.introGroom.trim(), bride: S.introBride.trim() } : null,
    parents: S.parentsOn ? lineOf("parents") : "", thanks: S.thanksOn ? lineOf("thanks") : "", close: lineOf("close") };
}
function sampleText(d){
  return [d.groom, d.bride, d.groomEn, d.brideEn, d.venue, ...d.open, ...d.story.map(s => s.text), d.intro ? d.intro.groom + d.intro.bride : "", d.parents, d.thanks, d.close,
    "민준 서연 신랑 신부 0123456789 .,:·#♥& ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 년 월 일 요일 오전 오후 시 분"].join(" ");
}
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const lenKo = s => { const m = Math.floor(s / 60), r = Math.round(s % 60); return m ? `${m}분${r ? ` ${r}초` : ""}` : `${r}초`; };

// ===== 화면 이동 (휴대폰 뒤로 가기 = 한 화면 전) =====
const $ = s => app.querySelector(s);
function stopAll(){
  if (PLAYER) { PLAYER.destroy(); PLAYER = null; }
  if (CUR && CUR.bank) { CUR.bank.close(); }
  CUR = null;
  PREV.pause();
}
function go(step){
  stopAll(); SEL = -1;
  S.step = step; save();
  history.pushState({ step }, "");
  render(); window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  stopAll(); SEL = -1;
  S.step = e.state && e.state.step != null ? e.state.step : 0;
  if (S.step === 6 && !RESULT) S.step = 5;
  if (S.step !== 6) save();
  render(); window.scrollTo(0, 0);
});
function render(){
  const f = [home, stepTpl, stepPhotos, stepWords, stepMusic, stepMake, done][S.step || 0] || home;
  if (f !== home) { document.body.classList.remove("is-cover"); app.className = "wrap"; }
  f();
}
const topBar = n => `<div class="top"><span>식전영상 만들기</span><span class="count">${n} / ${STEPS}</span></div>`;
const navBar = (prev, next, dis) => `<div class="navbar"><button class="btn ghost" id="prev">${prev}</button><button class="btn main" id="next"${dis ? " disabled" : ""}>${next}</button></div><p class="msg" id="msg" role="status"></p>`;
function bindNav(next){ $("#prev").onclick = () => history.back(); if (next) $("#next").onclick = next; }
const say = (t, id = "#msg") => { const m = $(id); if (m) m.textContent = t; };

// ===== 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>식전영상,<br>사진만 고르면<br>완성돼요</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick"><a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a></div>
    ${foot()}`;
}

// ===== 첫 화면 =====
function inAppBox(ia){
  const android = Movie.ANDROID, kakao = ia === "카카오톡", app2 = android ? "크롬" : "사파리";
  const intent = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`;
  return `<div class="inapp">
    <b>${esc(ia)} 안에서는 영상을 저장할 수 없어요</b>
    <p>${app2}에서 열어 주세요. 여기서 넣은 사진과 글은 ${app2}로 넘어가지 않아서, 먼저 옮긴 뒤에 시작하는 게 좋아요.</p>
    ${android ? `<a class="btn main" href="${esc(intent)}">크롬에서 열기</a>`
      : kakao ? `<a class="btn main" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">사파리에서 열기</a>` : ""}
    <button class="btn ghost" id="copyurl">링크 복사하기</button>
    ${!android && !kakao ? `<p class="note" style="color:#ddd">화면 위 ⋯ 를 누르고 '외부 브라우저에서 열기'를 누르거나, 링크를 복사해서 사파리에 붙여 넣어 주세요.</p>` : ""}
    <p class="msg" id="iamsg" role="status"></p>
  </div>`;
}
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const ia = Movie.inApp(), started = PH.length > 0 || !!(S.groom || S.bride);
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">예비 신랑·신부님을 위한</p>
    <h1>식전영상,<br>사진만 고르면<br>완성돼요</h1>
    <div class="bar"></div>
    <p class="lead">템플릿을 고르고 사진과 글을 넣으면, 식장 스크린에 틀 영상(MP4)이 휴대폰에서 바로 만들어져요.</p>
    ${Movie.MOBILE ? `<p class="note pc">컴퓨터에서 열면 사진 고르기와 파일 저장이 더 편하고, 영상도 더 빨리 만들어져요.</p>` : ""}
    ${ia ? inAppBox(ia) : ""}
    <div class="pick">
      ${started ? `<button id="resume"><span>이어서 만들기</span><span class="q">사진 ${PH.length}장</span></button>` : ""}
      <button id="start"><span>${started ? "처음부터 새로" : "만들기 시작"}</span><span class="q">5단계 · 무료</span></button>
    </div>
    <p class="msg" id="msg" role="status" style="color:var(--cover-sub);margin-top:10px"></p>
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    ${DEBUG ? `<p class="note" style="color:var(--cover-sub);margin-top:18px">시험용 정보예요. 주소에 debug가 있을 때만 보여요.</p><pre class="report" id="report">기기 점검 중…</pre><button class="text-btn" id="copyrep" style="color:var(--cover-sub)">결과 복사하기</button>` : ""}
    ${foot()}`;
  if ($("#copyurl")) $("#copyurl").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); say("링크를 복사했어요. 사파리 주소창에 붙여 넣어 주세요.", "#iamsg"); }
    catch (e) { say(location.href, "#iamsg"); }
  };
  if ($("#resume")) $("#resume").onclick = () => go(1);
  let armed = false;
  $("#start").onclick = async () => {
    if (started && !armed) { armed = true; say("만들던 사진과 글이 지워져요. 한 번 더 누르면 새로 시작해요."); return; }
    if (started) {
      PH.forEach(p => URL.revokeObjectURL(p.url)); PH = []; MINE = null; AUD = { key: "", buf: null };
      await DB.clear();
      S = fresh(); save();
    }
    go(1);
  };
  if (DEBUG) {
    Movie.probe().then(r => {
      const el = $("#report");
      if (el) el.textContent = Object.entries(r).map(([k, v]) => `${k}: ${v === true ? "예" : v === false ? "아니오" : v}`).join("\n");
    });
    $("#copyrep").onclick = async () => { try { await navigator.clipboard.writeText($("#report").textContent); $("#copyrep").textContent = "복사했어요"; } catch (e) {} };
  }
}

// ===== 1. 템플릿 =====
function sampleBank(){
  if (SAMPLE) return SAMPLE;
  const c = document.createElement("canvas"); c.width = 1600; c.height = 1000;
  const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 1600, 1000);
  g.addColorStop(0, "#e3cdb8"); g.addColorStop(.55, "#ad9280"); g.addColorStop(1, "#5d4b45");
  x.fillStyle = g; x.fillRect(0, 0, 1600, 1000);
  for (let i = 0; i < 26; i++) {
    const cx = (i * 397) % 1600, cy = (i * 241) % 1000, r = 30 + (i * 53) % 110;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, "rgba(255,244,230,.55)"); rg.addColorStop(1, "rgba(255,244,230,0)");
    x.fillStyle = rg; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
  const ph = { img: c, bg: c, w: 1600, h: 1000 };
  return (SAMPLE = { size: 1, get: () => ph, need: async () => {}, close(){} });
}
function stepTpl(){
  app.innerHTML = `${topBar(1)}
    <h2 class="title">어떤 분위기로 만들까요?</h2>
    <p class="sub">마지막 단계에서 미리 보면서 바꿀 수도 있어요.</p>
    <div class="tpls">${TEMPLATES.map(T => `
      <button data-k="${T.key}" class="${T.key === S.tpl ? "on" : ""}" aria-pressed="${T.key === S.tpl}">
        <canvas width="480" height="270"></canvas><b>${esc(T.name)}</b><span>${esc(T.desc)}</span>
      </button>`).join("")}</div>
    ${navBar("처음으로", "다음: 사진 넣기")}`;
  app.querySelectorAll(".tpls button").forEach(b => b.onclick = () => {
    S.tpl = b.dataset.k; save();
    app.querySelectorAll(".tpls button").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
  });
  bindNav(() => go(2));
  thumbs();
}
async function thumbs(){
  const d = data();
  d.groom = d.groom || "민준"; d.bride = d.bride || "서연"; d.date = d.date || "2026-11-21"; d.time = d.time || "12:30";
  for (const b of app.querySelectorAll(".tpls button")) {
    const T = TEMPLATES.find(x => x.key === b.dataset.k), cv = b.querySelector("canvas");
    await Movie.fonts(T, sampleText(d));
    if (!cv.isConnected) return;
    const P = Movie.plan(T, d, 1, 0), M = Movie.scene(P, 1920, 1080, T, d, sampleBank());
    const ctx = cv.getContext("2d", { alpha: false });
    ctx.setTransform(cv.width / 1920, 0, 0, cv.width / 1920, 0, 0);
    Movie.frame(ctx, Math.min(P.segs[0].dur - .3, T.thumbAt || 3.4), M);
  }
}

// ===== 2. 사진 =====
function guess(n){
  const T = tpl(), d = data(), P = Movie.plan(T, d, n, AUD.buf ? AUD.buf.duration : 0);
  const c = T.name.charCodeAt(T.name.length - 1) - 0xAC00, eun = c >= 0 && c < 11172 && c % 28 ? "은" : "는";   // 받침 있으면 '은'
  return n ? `약 ${lenKo(P.total)} 영상` : `${T.name}${eun} ${T.photos[0]}~${T.photos[1]}장을 추천해요`;
}
function stepPhotos(){
  app.innerHTML = `${topBar(2)}
    <h2 class="title">사진을 넣어 주세요</h2>
    <p class="sub">넣은 순서대로 나와요. 사진을 누르면 순서를 바꾸거나, 위치·크기를 맞추고 글을 넣을 수 있어요.</p>
    <label class="btn main add"><input type="file" id="pick" accept="image/*" multiple>${PH.length ? "사진 더 넣기" : "사진 고르기"}</label>
    <p class="busy" id="busy" role="status"></p>
    <div class="count-line"><span>${PH.length}장${PH.length >= MAX_PHOTOS ? " (최대)" : ""}</span><span>${guess(PH.length)}</span></div>
    <div class="photos">${PH.map((p, i) => `<button data-i="${i}" class="${i === SEL ? "on" : ""}" aria-label="${i + 1}번 사진"><img src="${p.url}" alt=""><span class="no">${i + 1}</span>${p.caption ? `<span class="tag">글</span>` : edited(p) ? `<span class="tag">✎</span>` : ""}</button>`).join("")}</div>
    ${SEL >= 0 && PH[SEL] ? `<div class="photo-tools">
      <p class="which">${SEL + 1}번 사진</p>
      <button class="btn main wide" id="edit">편집하기 · 위치 · 크기 · 글</button>
      <button class="btn ghost" id="mvl"${SEL === 0 ? " disabled" : ""}>← 앞으로</button>
      <button class="btn ghost" id="mvr"${SEL === PH.length - 1 ? " disabled" : ""}>뒤로 →</button>
      <button class="btn ghost" id="rm">빼기</button></div>` : ""}
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    ${navBar("이전", "다음: 글 넣기", PH.length === 0)}`;
  $("#pick").onchange = e => addPhotos(e.target.files);
  app.querySelectorAll(".photos button").forEach(b => b.onclick = () => { const i = +b.dataset.i; SEL = SEL === i ? -1 : i; stepPhotos(); });
  const move = d => { const j = SEL + d; if (j < 0 || j >= PH.length) return; [PH[SEL], PH[j]] = [PH[j], PH[SEL]]; SEL = j; saveOrder(); stepPhotos(); };
  if ($("#edit")) $("#edit").onclick = () => editPhoto(SEL);
  if ($("#mvl")) $("#mvl").onclick = () => move(-1);
  if ($("#mvr")) $("#mvr").onclick = () => move(1);
  if ($("#rm")) $("#rm").onclick = () => {
    const [p] = PH.splice(SEL, 1); URL.revokeObjectURL(p.url); DB.del("ph:" + p.id);
    SEL = Math.min(SEL, PH.length - 1); saveOrder(); stepPhotos();
  };
  bindNav(() => go(3));
}
// ===== 사진 편집: 끌어서 옮기기 · 두 손가락으로 확대 · 꽉 채우기/사진 전체 · 이 사진에 넣을 글 (땡큐 카드와 같은 손동작) =====
const DRAG_HINT = "사진을 끌어서 옮기고, 두 손가락으로 벌려서 확대할 수 있어요";
const ZMAX = 3;
let RESUME_AT = null;   // 미리 보기에서 편집하러 갔다 오면 그 장면부터
function savePhoto(p){ DB.set("ph:" + p.id, { id: p.id, blob: p.blob, thumb: p.thumb, w: p.w, h: p.h, meta: p.meta || null, caption: p.caption || "" }); }
const edited = p => !!(p.meta && (p.meta.z > 1.01 || Math.abs(p.meta.cx - .5) > .005 || Math.abs(p.meta.cy - .5) > .005 || (p.meta.fit && p.meta.fit !== "auto")));
function editPhoto(start){
  if (!PH[start]) return;
  let i = start, P = null, M = null, seg = null, raf = 0, saveT = 0, edgeT = 0;
  const T = tpl(), [W, H] = Movie.size(S.ratio, "720"), tall = H > W, bank = Movie.bank(PH), touches = new Map();
  const box = document.createElement("div");
  box.className = "editor"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "사진 편집");
  document.body.appendChild(box); document.body.style.overflow = "hidden";
  history.pushState({ step: S.step, ed: 1 }, "");
  const meta = () => (PH[i].meta = PH[i].meta || { cx: .5, cy: .5, z: 1, fit: "auto" });
  const later = () => { clearTimeout(saveT); const p = PH[i]; saveT = setTimeout(() => savePhoto(p), 400); };
  const geom = () => { const ph = bank.get(i); if (!ph || !M) return null; const b = T.box ? T.box(M, ph) : [0, 0, W, H]; return { ph, bw: b[2], bh: b[3] }; };
  // 지금 '사진 전체'(흐린 배경)로 보이는지: 직접 고른 경우, 또는 자동인데 사진과 칸 비율이 많이 다른 경우
  const whole = g => { const m = PH[i].meta || {}; if (m.fit === "whole") return true; if (m.fit === "cover" || !T.autoFit) return false; const ar = g.ph.w / g.ph.h, br = g.bw / g.bh; return Math.max(ar / br, br / ar) > 1.45; };
  function draw(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const c = box.querySelector("canvas");
      if (!c || !M) return;
      const x = c.getContext("2d", { alpha: false });
      x.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
      Movie.frame(x, seg.start + seg.dur * .5, M);
    });
  }
  function replan(){
    const d = data();
    P = Movie.plan(T, d, PH.length, AUD.buf ? AUD.buf.duration : 0);
    seg = P.segs.find(g => g.kind === "photo" && g.i === i);
    M = Movie.scene(P, W, H, T, d, bank);
  }
  const syncFit = () => box.querySelectorAll("#edfit button").forEach(b => b.classList.toggle("on", b.dataset.v === ((PH[i].meta || {}).fit || "auto")));
  const edge = () => {
    const h = box.querySelector("#edhint");
    h.textContent = meta().z < ZMAX - .01 ? "사진 끝에 닿았어요. 확대하면 더 옮길 수 있어요." : "사진 끝에 닿았어요.";
    clearTimeout(edgeT); edgeT = setTimeout(() => { h.textContent = DRAG_HINT; }, 2200);
  };
  async function shell(){
    const m = PH[i].meta || {}, introHere = S.introOn && i < 2 && PH.length >= 2;
    box.innerHTML = `<div class="in">
      <div class="ed-top"><b>사진 편집</b><span class="count">${i + 1} / ${PH.length}</span></div>
      <div class="ed-stage${tall ? " tall" : ""}"><canvas width="${W >= H ? 720 : 405}" height="${W >= H ? 405 : 720}"></canvas></div>
      <p class="drag" id="edhint">${DRAG_HINT}</p>
      <label class="range"><span>사진 크기</span><input type="range" id="edzoom" min="1" max="${ZMAX}" step="0.01" value="${m.z || 1}"></label>
      <div class="seg" id="edfit">${[["auto", "자동"], ["cover", "꽉 채우기"], ["whole", "사진 전체"]].map(([v, l]) => `<button data-v="${v}" class="${(m.fit || "auto") === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <label class="field"><span>이 사진에 넣을 글 <em>(안 써도 돼요)</em></span><textarea id="edcap" rows="2" maxlength="40" placeholder="예: 헬스장에서 시작된 이야기">${esc(PH[i].caption || "")}</textarea></label>
      ${introHere ? `<p class="note" style="margin-top:-4px">1·2번 사진에는 신랑·신부 소개가 나와서, 여기 쓴 글은 영상에 안 나와요.</p>` : ""}
      <div class="ed-nav"><button class="btn ghost" id="edprev"${i === 0 ? " disabled" : ""}>← 이전 사진</button><button class="btn ghost" id="ednext"${i === PH.length - 1 ? " disabled" : ""}>다음 사진 →</button></div>
      <button class="btn main" id="eddone">완료</button>
      <button class="text-btn btn-link" id="edreset">처음 위치로</button>
    </div>`;
    const c = box.querySelector("canvas"), q$ = s => box.querySelector(s);
    const toV = e => { const r = c.getBoundingClientRect(), k = W / r.width; return { x: e.clientX * k, y: e.clientY * k }; };
    c.onpointerdown = e => {
      const g = geom(); if (!g) return;
      if (whole(g)) { meta().fit = "cover"; syncFit(); draw(); }   // 사진 전체로 보이는 중에 끌면 꽉 채우기로 바꿔요
      c.setPointerCapture(e.pointerId); touches.set(e.pointerId, toV(e));
    };
    c.onpointermove = e => {
      if (!touches.has(e.pointerId)) return;
      const g = geom(); if (!g) return;
      const m = meta(), prev = touches.get(e.pointerId), now = toV(e);
      touches.set(e.pointerId, now);
      if (touches.size === 1) {
        const a = Movie.kit.place(g.ph.img, g.bw, g.bh, m.z, m.cx, m.cy);
        const want = { cx: m.cx - (now.x - prev.x) / a.dw, cy: m.cy - (now.y - prev.y) / a.dh };
        const b = Movie.kit.place(g.ph.img, g.bw, g.bh, m.z, want.cx, want.cy);
        m.cx = b.cx; m.cy = b.cy;
        if (Math.abs(b.cx - want.cx) > 1e-4 || Math.abs(b.cy - want.cy) > 1e-4) edge();
      } else {
        const other = [...touches].find(([id]) => id !== e.pointerId)[1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(now.x - other.x, now.y - other.y);
        if (d0 < 1) return;
        m.z = Math.max(1, Math.min(ZMAX, m.z * d1 / d0));
        const b = Movie.kit.place(g.ph.img, g.bw, g.bh, m.z, m.cx, m.cy); m.cx = b.cx; m.cy = b.cy;
        q$("#edzoom").value = m.z;
      }
      draw(); later();
    };
    c.onpointerup = c.onpointercancel = e => { touches.delete(e.pointerId); };
    c.onwheel = e => {
      e.preventDefault();
      const g = geom(); if (!g) return;
      const m = meta(); if (whole(g)) { m.fit = "cover"; syncFit(); }
      m.z = Math.max(1, Math.min(ZMAX, m.z * Math.exp(-e.deltaY * .0015)));
      const b = Movie.kit.place(g.ph.img, g.bw, g.bh, m.z, m.cx, m.cy); m.cx = b.cx; m.cy = b.cy;
      q$("#edzoom").value = m.z; draw(); later();
    };
    q$("#edzoom").oninput = e => {
      const g = geom(); if (!g) return;
      const m = meta(); if (whole(g)) { m.fit = "cover"; syncFit(); }
      m.z = +e.target.value;
      const b = Movie.kit.place(g.ph.img, g.bw, g.bh, m.z, m.cx, m.cy); m.cx = b.cx; m.cy = b.cy;
      draw(); later();
    };
    box.querySelectorAll("#edfit button").forEach(b => b.onclick = () => { meta().fit = b.dataset.v; syncFit(); draw(); later(); });
    let capT = 0;
    q$("#edcap").oninput = e => { PH[i].caption = e.target.value; clearTimeout(capT); capT = setTimeout(() => { replan(); draw(); }, 150); later(); };
    const go2 = j => { clearTimeout(saveT); savePhoto(PH[i]); i = j; shell(); };
    q$("#edprev").onclick = () => { if (i > 0) go2(i - 1); };
    q$("#ednext").onclick = () => { if (i < PH.length - 1) go2(i + 1); };
    q$("#eddone").onclick = () => history.back();
    q$("#edreset").onclick = () => { PH[i].meta = { cx: .5, cy: .5, z: 1, fit: "auto" }; q$("#edzoom").value = 1; syncFit(); draw(); later(); };
    replan();
    await Movie.fonts(T, sampleText(data()));
    await bank.need([i], [i + 1, i - 1].filter(j => j >= 0 && j < PH.length));
    draw();
  }
  const onPop = () => {
    window.removeEventListener("popstate", onPop);
    clearTimeout(saveT); savePhoto(PH[i]);
    bank.close(); box.remove(); document.body.style.overflow = "";
  };
  window.addEventListener("popstate", onPop);
  shell();
}

async function addPhotos(files){
  const arr = [...(files || [])], room = MAX_PHOTOS - PH.length, use = arr.slice(0, Math.max(0, room));
  let bad = 0;
  $("#pick").disabled = true;
  for (let i = 0; i < use.length; i++) {
    say(`사진 정리 중… ${i + 1} / ${use.length}`, "#busy");
    try {
      const p = await Movie.shrink(use[i]);
      p.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await DB.set("ph:" + p.id, { id: p.id, blob: p.blob, thumb: p.thumb, w: p.w, h: p.h });
      PH.push({ ...p, url: URL.createObjectURL(p.thumb) });
    } catch (e) { bad++; }
  }
  saveOrder();
  stepPhotos();
  const notes = [];
  if (arr.length > use.length) notes.push(`사진은 ${MAX_PHOTOS}장까지 넣을 수 있어요.`);
  if (bad) notes.push(`${bad}장은 열 수 없어서 뺐어요.`);
  say(notes.join(" "), "#busy");
}

// ===== 3. 글 =====
function lineBox(id, label, toggle, on){
  const v = lineOf(id);
  return `<div class="line${on ? "" : " off"}" data-id="${id}">
    <div class="head">${toggle ? `<label class="toggle"><input type="checkbox" data-on="${id}"${on ? " checked" : ""}>${label}</label>` : `<span>${label}</span>`}
      <button class="text-btn" data-next="${id}"${on ? "" : " disabled"}>다른 문장</button></div>
    <textarea rows="${Math.max(1, v.split("\n").length)}" data-edit="${id}" maxlength="60"${on ? "" : " disabled"}>${esc(v)}</textarea>
  </div>`;
}
function stepWords(){
  app.innerHTML = `${topBar(3)}
    <h2 class="title">영상에 들어갈 글</h2>
    <p class="sub">추천 문장을 그대로 써도 되고, 눌러서 고쳐도 돼요. 줄을 바꾸면 영상에서도 줄이 바뀌어요.</p>
    <div class="panel">
      <div class="row2">
        <label class="field">신랑 이름<input id="groom" value="${esc(S.groom)}" placeholder="예: 민준" maxlength="12" autocomplete="off"></label>
        <label class="field">신부 이름<input id="bride" value="${esc(S.bride)}" placeholder="예: 서연" maxlength="12" autocomplete="off"></label>
      </div>
      <div class="row2">
        <label class="field"><span>영문 이름 <em>(선택)</em></span><input id="groomEn" value="${esc(S.groomEn)}" placeholder="MINJUN" maxlength="16" autocomplete="off" autocapitalize="characters"></label>
        <label class="field"><span>영문 이름 <em>(선택)</em></span><input id="brideEn" value="${esc(S.brideEn)}" placeholder="SEOYEON" maxlength="16" autocomplete="off" autocapitalize="characters"></label>
      </div>
      <div class="row2 dates">
        <label class="field">예식 날짜<input type="date" id="date" value="${esc(S.date)}"></label>
        <label class="field"><span>사귄 날 <em>(선택)</em></span><input type="date" id="met" value="${esc(S.met)}"></label>
      </div>
      <p class="note" style="margin:-4px 2px 0">사귄 날을 넣으면 "함께한 지 1,234일째" 같은 문장에 날수가 들어가요.</p>
    </div>
    <h3 class="sec">여는 장면</h3>
    ${lineBox("open", "큰 글씨", false, true)}
    <h3 class="sec">신랑·신부 소개<em>1번 사진은 신랑, 2번 사진은 신부</em></h3>
    <div class="line${S.introOn ? "" : " off"}">
      <div class="head"><label class="toggle"><input type="checkbox" id="introOn"${S.introOn ? " checked" : ""}>넣기</label><span></span></div>
      <div class="intro-fields">
        <label class="field">신랑 소개<input id="introGroom" value="${esc(S.introGroom)}" placeholder="#다정함 #ENFJ #요리왕" maxlength="30" autocomplete="off"${S.introOn ? "" : " disabled"}></label>
        <label class="field">신부 소개<input id="introBride" value="${esc(S.introBride)}" placeholder="#웃음많음 #INFP #여행" maxlength="30" autocomplete="off"${S.introOn ? "" : " disabled"}></label>
      </div>
    </div>
    <h3 class="sec">사진 위 이야기<em>사진 사이사이에 나와요</em></h3>
    ${S.story.map((x, i) => lineBox("story" + i, `${i + 1}번째 넣기`, true, x.on)).join("")}
    <p class="note">어디서 만났는지 적으면 더 두 분다워져요. 예: 헬스장에서 시작된 이야기</p>
    <h3 class="sec">부모님께</h3>
    ${lineBox("parents", "넣기", true, S.parentsOn)}
    <h3 class="sec">하객께 인사</h3>
    ${lineBox("thanks", "넣기", true, S.thanksOn)}
    <h3 class="sec">마지막 장면</h3>
    ${lineBox("close", "큰 글씨", false, true)}
    <p class="note">식장에서 하객 입장 동안 반복해서 튼다면 "곧 예식이 시작됩니다"는 시점이 안 맞을 수 있어요.</p>
    ${navBar("이전", "다음: 음악 고르기")}`;
  ["groom", "bride", "groomEn", "brideEn", "date", "met", "introGroom", "introBride"].forEach(k => { $("#" + k).oninput = e => { S[k] = e.target.value; save(); }; });
  ["date", "met"].forEach(k => { $("#" + k).onchange = () => stepWords(); });   // 날수 문장 다시 채우기
  $("#introOn").onchange = e => { S.introOn = e.target.checked; save(); stepWords(); };
  app.querySelectorAll("textarea[data-edit]").forEach(t => t.oninput = () => {
    const id = t.dataset.edit, v = t.value;
    if (id.startsWith("story")) S.story[+id.slice(5)].edit = v; else S[id + "Edit"] = v;
    t.rows = Math.max(1, v.split("\n").length);
    save();
  });
  app.querySelectorAll("[data-next]").forEach(b => b.onclick = () => {
    const id = b.dataset.next;
    if (id.startsWith("story")) { const x = S.story[+id.slice(5)]; x.pick++; x.edit = null; } else { S[id]++; S[id + "Edit"] = null; }
    save();
    const t = app.querySelector(`textarea[data-edit="${id}"]`); t.value = lineOf(id); t.rows = Math.max(1, t.value.split("\n").length);
  });
  app.querySelectorAll("[data-on]").forEach(c => c.onchange = () => {
    const id = c.dataset.on;
    if (id.startsWith("story")) S.story[+id.slice(5)].on = c.checked; else S[id + "On"] = c.checked;
    save(); stepWords();
  });
  bindNav(() => go(4));
}

// ===== 4. 음악 =====
async function music(){
  const key = S.track === "mine" ? (MINE ? `mine:${MINE.name}:${MINE.blob.size}` : "") : S.track;
  if (!key) return null;
  if (AUD.key === key) return AUD.buf;
  let ab;
  if (S.track === "mine") ab = await MINE.blob.arrayBuffer();
  else {
    const t = LIST.find(x => x.id === S.track);
    if (!t) return null;
    const r = await fetch(t.file);
    if (!r.ok) throw new Error("음원을 받지 못했어요");
    ab = await r.arrayBuffer();
  }
  const buf = await Movie.decode(ab);
  AUD = { key, buf };
  return buf;
}
function trackRow(id, title, sub, canPlay){
  const on = S.track === id;
  return `<div class="track${on ? " on" : ""}">
    <span class="box">${CHECK}</span>
    <button class="pick" data-t="${id}" aria-pressed="${on}"><b>${esc(title)}</b><span>${esc(sub)}</span></button>
    ${canPlay ? `<button class="play" data-p="${id}" aria-label="미리듣기">${PLAY}</button>` : ""}
  </div>`;
}
function stepMusic(){
  app.innerHTML = `${topBar(4)}
    <h2 class="title">배경 음악</h2>
    <p class="sub">휴대폰에 있는 음악 파일을 골라 주세요. 영상 길이는 음악 길이에 맞춰지고, 끝은 서서히 작아지며 끝나요.</p>
    <label class="btn main add"><input type="file" id="mine" accept="audio/*,.mp3,.m4a,.wav,.aac">${MINE ? "다른 음악 고르기" : "음악 파일 고르기"}</label>
    <p class="note">mp3·m4a 파일을 넣을 수 있어요. 아이폰은 '파일' 앱에 있는 음악만 고를 수 있어요.</p>
    <p class="busy" id="busy" role="status"></p>
    <div class="tracks" style="margin-top:14px">
      ${LIST.map(t => trackRow(t.id, t.title, `${t.by} · ${t.mood}`, true)).join("")}
      ${MINE ? trackRow("mine", MINE.name, "내가 고른 음악", true) : ""}
      ${trackRow("", "음악 없이", "소리 없는 영상", false)}
    </div>
    ${navBar("이전", "다음: 미리 보기")}`;
  app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.track = b.dataset.t; save(); PREV.pause(); stepMusic(); });
  app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    const id = b.dataset.p, src = id === "mine" ? URL.createObjectURL(MINE.blob) : (LIST.find(x => x.id === id) || {}).file;
    if (!src) return;
    const same = PREV.dataset.id === id && !PREV.paused;
    app.querySelectorAll("[data-p]").forEach(x => x.innerHTML = PLAY);
    if (same) { PREV.pause(); return; }
    if (PREV.dataset.id !== id) { PREV.src = src; PREV.dataset.id = id; }
    PREV.play().then(() => { b.innerHTML = PAUSE; }).catch(() => say("미리듣기를 열지 못했어요.", "#busy"));
  });
  $("#mine").onchange = async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    say("음악 확인 중…", "#busy");
    try {
      const buf = await Movie.decode(await f.arrayBuffer());
      MINE = { name: f.name.replace(/\.[^.]+$/, ""), blob: f };
      await DB.set("music", MINE);
      AUD = { key: `mine:${MINE.name}:${f.size}`, buf };
      S.track = "mine"; save(); PREV.pause(); PREV.dataset.id = "";
      stepMusic();
      say(`${lenKo(buf.duration)}짜리 음악을 넣었어요.`, "#busy");
    } catch (err) { say("이 파일은 열 수 없어요. mp3나 m4a 파일로 넣어 주세요.", "#busy"); }
  };
  bindNav(() => go(5));
}

// ===== 5. 미리 보고 만들기 =====
function seg(id, items, cur){
  return `<div class="seg${items.length > 3 ? " grid2" : ""}" id="${id}">${items.map(([v, label, small, dis]) =>
    `<button data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}"${dis ? " disabled" : ""}>${label}${small ? `<small>${small}</small>` : ""}</button>`).join("")}</div>`;
}
function stepMake(){
  const ia = Movie.inApp();
  app.innerHTML = `${topBar(5)}
    <h2 class="title">미리 보고 만들기</h2>
    <div class="stage" id="stage"><canvas id="pv" width="16" height="9"></canvas><button class="playbtn" id="play" aria-label="재생">${PLAY}</button></div>
    <div class="scrub"><span id="cur">0:00</span><input type="range" id="seek" min="0" max="1000" value="0" aria-label="재생 위치"><span id="len">-:--</span></div>
    <button class="btn ghost scene-edit" id="sceneEdit" disabled>멈춘 장면의 사진을 편집할 수 있어요</button>
    <h3 class="sec">템플릿</h3>
    ${seg("tplseg", TEMPLATES.map(T => [T.key, esc(T.name)]), S.tpl)}
    <h3 class="sec">비율</h3>
    ${seg("ratio", [["16:9", "가로 16:9", "식장 스크린"], ["9:16", "세로 9:16", "인스타·휴대폰"]], S.ratio)}
    <p class="note">식장 화면 비율을 모르면 가로 16:9로 만들어요. 아주 넓은 LED 화면이라면 어떤 크기로 받는지 식장에 물어봐 주세요.</p>
    <h3 class="sec">화질</h3>
    ${seg("q", [["720", "720p", "빠르게"], ["1080", "1080p", "식장용 추천"]], S.q)}
    <div class="facts" id="facts"></div>
    ${ia ? `<div class="block-inapp"><b>${esc(ia)} 안에서는 저장할 수 없어요</b><p>${Movie.ANDROID ? "크롬" : "사파리"}에서 이 주소를 열어 다시 만들어 주세요.</p></div>` : ""}
    <div class="navbar"><button class="btn ghost" id="prev">이전</button><button class="btn main" id="make" disabled>동영상 만들기</button></div>
    <p class="msg" id="msg" role="status"></p>
    <p class="note">만드는 동안 화면을 켠 채로 이 화면에 있어 주세요. 다른 앱에 다녀오면 멈출 수 있어요.</p>
    ${DEBUG ? `<pre class="report" id="report"></pre>` : ""}`;
  $("#prev").onclick = () => history.back();
  const pick = (id, key) => app.querySelectorAll(`#${id} button`).forEach(b => b.onclick = () => {
    if (b.disabled || String(S[key]) === b.dataset.v) return;
    S[key] = b.dataset.v; save();
    app.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle("on", x === b));
    preview();
  });
  pick("tplseg", "tpl"); pick("ratio", "ratio"); pick("q", "q");
  $("#make").onclick = makeIt;
  preview();
}
let previewJob = 0;
async function preview(){
  const job = ++previewJob;
  stopAll();
  const T = tpl(), d = data(), [W, H] = Movie.size(S.ratio, S.q), tall = H > W;
  const stage = $("#stage"), cv = $("#pv");
  stage.classList.toggle("tall", tall); stage.classList.remove("playing");
  $("#play").innerHTML = PLAY;
  $("#make").disabled = true;
  say("미리 보기 준비 중…");
  let buf = null;
  try { buf = await music(); } catch (e) { say("음악을 열지 못했어요. 음악 없이 만들어져요."); }
  if (job !== previewJob) return;
  const P = Movie.plan(T, d, PH.length, buf ? buf.duration : 0);
  const dpr = Math.min(2, window.devicePixelRatio || 1), cssW = stage.clientWidth || 400;
  cv.width = Math.round(Math.min(W, cssW * dpr)); cv.height = Math.round(cv.width * H / W);
  await Movie.fonts(T, sampleText(d));
  const bank = Movie.bank(PH), mixed = await Movie.mix(buf, P.total);
  if (job !== previewJob) { bank.close(); return; }
  const M = Movie.scene(P, W, H, T, d, bank);
  CUR = { T, d, P, buf, bank, W, H };
  const start = RESUME_AT != null ? Math.min(RESUME_AT, P.total - .1) : Math.min(3.2, P.total / 2);
  RESUME_AT = null;
  await bank.need(Movie.photosAt(P, start, T.xf).now);
  if (job !== previewJob) return;
  PLAYER = Movie.player(cv, M, mixed);
  PLAYER.draw(start);
  const seek = $("#seek"), curEl = $("#cur");
  $("#len").textContent = mmss(P.total);
  const sceneBtn = $("#sceneEdit");
  const scene = t => {   // 멈춰 있고 사진 장면이면 그 사진 편집
    const g = Movie.segAt(P, t), ok = !PLAYER.playing && g && g.kind === "photo";
    sceneBtn.disabled = !ok;
    sceneBtn.textContent = ok ? `${g.i + 1}번 사진 편집하기` : (PLAYER.playing ? "멈추면 그 장면의 사진을 편집할 수 있어요" : "사진 장면에서 멈추면 편집할 수 있어요");
    sceneBtn.dataset.i = ok ? g.i : "";
  };
  const tick = t => { curEl.textContent = mmss(t); if (!seek.matches(":active")) seek.value = Math.round(t / P.total * 1000); scene(t); };
  PLAYER.ontick = tick;
  tick(start);
  sceneBtn.onclick = () => { if (sceneBtn.dataset.i === "") return; RESUME_AT = PLAYER.time(); PLAYER.pause(); editPhoto(+sceneBtn.dataset.i); };
  PLAYER.onend = () => { stage.classList.remove("playing"); $("#play").innerHTML = PLAY; };
  seek.oninput = () => PLAYER.seek(seek.value / 1000 * P.total);
  const toggle = () => {
    if (PLAYER.playing) { PLAYER.pause(); stage.classList.remove("playing"); $("#play").innerHTML = PLAY; scene(PLAYER.time()); }
    else { PLAYER.play(); stage.classList.add("playing"); $("#play").innerHTML = PAUSE; }
  };
  $("#play").onclick = toggle; cv.onclick = toggle;
  const mb = Math.round((Movie.bitrate(S.q, P.total) + 192000) * P.total / 8 / 1e6);
  $("#facts").innerHTML = `<b>${lenKo(P.total)}</b><span>사진 ${PH.length}장 · 한 장에 약 ${P.per.toFixed(1)}초</span><span>${buf ? "음악 " + lenKo(buf.duration) : "음악 없음"}</span><span>파일 약 ${mb}MB</span>`;
  say(P.total > 300 ? "영상이 5분을 넘어요. 식전영상은 3~5분이 알맞고, 길면 하객이 지루해할 수 있어요. 사진을 줄여 보세요."
    : buf && buf.duration < P.total - .5 ? "사진이 많아서 음악이 한 번 더 이어져요. 사진을 줄이면 음악 한 곡에 맞출 수 있어요." : "");
  $("#make").disabled = !PH.length || !!Movie.inApp();
  if (!PH.length) say("사진을 먼저 넣어 주세요.");
}
// 파일 이름에 예식 날짜와 이름 (식장에서 여러 파일 사이에서 찾기 쉽게)
function fileName(){
  const who = [S.groom.trim(), S.bride.trim()].filter(Boolean).join("_").replace(/[\\/:*?"<>|]/g, "");
  return ["식전영상", (S.date || "").replace(/-/g, ""), who].filter(Boolean).join("_") + ".mp4";
}
function overlay(job, W, H){
  const box = document.createElement("div");
  box.className = "making"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "영상 만드는 중");
  box.innerHTML = `<div class="in">
    <canvas width="${W >= H ? 480 : 270}" height="${W >= H ? 270 : 480}"></canvas>
    <progress max="1" value="0"></progress>
    <p class="st" role="status">준비 중…</p>
    <p class="warn">다 만들어질 때까지 화면을 켠 채로 이 화면에 있어 주세요.<br>다른 앱에 다녀오면 멈출 수 있어요.</p>
    <button class="text-btn" id="mkstop">그만 만들기</button></div>`;
  document.body.appendChild(box);
  const cv = box.querySelector("canvas"), bar = box.querySelector("progress"), st = box.querySelector(".st");
  box.querySelector("#mkstop").onclick = () => { job.stop = true; st.textContent = "멈추는 중…"; };
  return {
    progress(p){
      bar.value = p.done;
      if (p.finishing) st.textContent = "마무리 중…";
      else {
        const left = p.done > .03 ? Math.max(0, p.elapsed / p.done - p.elapsed) : null;
        st.textContent = `만드는 중 ${Math.floor(p.done * 100)}%${left != null ? ` · 약 ${left > 60 ? Math.ceil(left / 60) + "분" : Math.ceil(left) + "초"} 남음` : ""}`;
      }
      if (p.canvas) cv.getContext("2d").drawImage(p.canvas, 0, 0, cv.width, cv.height);
    },
    fail(e){
      const msg = e && e.code === "size" ? e.message + ". 화질을 낮춰서 다시 만들어 주세요."
        : "영상을 만들다 멈췄어요. 화면을 켠 채로 이 화면에서 다시 만들어 주세요.";
      box.querySelector(".in").innerHTML = `<p class="err">${esc(msg)}</p>${DEBUG ? `<pre class="report">${esc((e && (e.stack || e.message)) || e)}</pre>` : ""}<button class="btn main" id="mkok">확인</button>`;
      box.querySelector("#mkok").onclick = () => box.remove();
    },
    close(){ box.remove(); }
  };
}
async function makeIt(){
  if (!CUR || !PH.length) return;
  if (Movie.inApp()) { say("앱 안에서는 저장할 수 없어요. 사파리·크롬에서 열어 주세요."); return; }
  const { T, d, P, buf, W, H } = CUR;
  stopAll();
  if (RESULT) { URL.revokeObjectURL(RESULT.url); RESULT = null; }
  const job = { P, tpl: T, d, bank: Movie.bank(PH), ratio: S.ratio, q: S.q, music: buf, name: fileName(), sample: sampleText(d), stop: false };
  const ov = overlay(job, W, H);
  try {
    const { file, info } = await Movie.make(job, p => ov.progress(p));
    ov.close();
    RESULT = { file, info, url: URL.createObjectURL(file) };
    S.step = 6; history.pushState({ step: 6 }, "");
    render(); window.scrollTo(0, 0);
  } catch (e) {
    if (e && e.code === "cancel") { ov.close(); preview(); }
    else { ov.fail(e); preview(); }
  } finally { job.bank.close(); }
}

// ===== 완성 =====
function done(){
  if (!RESULT) { S.step = 5; stepMake(); return; }
  const { file, info, url } = RESULT;
  const share = Movie.IOS && navigator.canShare && navigator.canShare({ files: [file] });
  app.innerHTML = `
    <div class="top"><span>식전영상 만들기</span><span class="count">완성</span></div>
    <h2 class="title">식전영상이 완성됐어요</h2>
    <div class="result"><video src="${url}"${info.poster ? ` poster="${info.poster}"` : ""} controls playsinline preload="metadata"></video></div>
    <p class="meta">${info.W}×${info.H} · ${lenKo(info.length)} · ${Math.round(file.size / 1048576)}MB</p>
    <div class="btns">
      ${share ? `<button class="btn main" id="save">사진첩에 저장하기</button>` : ""}
      <a class="btn ${share ? "ghost" : "main"}" href="${url}" download="${esc(file.name)}">파일로 받기</a>
      <p class="msg" id="msg" role="status"></p>
    </div>
    <div class="panel howto"><b>식장에 보낼 때</b><ol>${HOWTO.map(h => `<li>${esc(h)}</li>`).join("")}</ol></div>
    <div class="tip"><b>사회자 한마디</b><p>${esc(MC_TIP)}</p></div>
    <div class="btns" style="margin-top:18px">
      <button class="btn ghost" id="again">설정 바꿔서 다시 만들기</button>
      ${siteLink("flow", "btn ghost", "결혼식 식순표 만들기")}
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
    </div>
    ${DEBUG ? `<p class="note" style="margin-top:18px">시험용 정보예요. 주소에 debug가 있을 때만 보여요.</p><pre class="report" id="report">${esc([navigator.userAgent, ...Object.entries(info).map(([k, v]) => `${k}: ${v}`)].join("\n"))}</pre><button class="text-btn btn-link" id="copyrep">결과 복사하기</button>` : ""}
    ${foot()}`;
  if ($("#copyrep")) $("#copyrep").onclick = async () => { try { await navigator.clipboard.writeText($("#report").textContent); $("#copyrep").textContent = "복사했어요"; } catch (e) {} };
  if ($("#save")) $("#save").onclick = async () => {
    try { await navigator.share({ files: [file] }); say("공유 창에서 '동영상 저장'을 누르면 사진첩에 들어가요."); }
    catch (e) { if (!e || e.name !== "AbortError") say("공유 창을 열지 못했어요. '파일로 받기'를 눌러 주세요."); }
  };
  $("#again").onclick = () => history.back();
}

// ===== 시작 =====
(async () => {
  if (!OPEN && !QS.has("preview")) { soon(); return; }
  await restore();
  if (!TEMPLATES.some(t => t.key === S.tpl)) S.tpl = TEMPLATES[0].key;
  if (S.track && S.track !== "mine" && !LIST.some(t => t.id === S.track)) S.track = LIST.length ? LIST[0].id : "";
  if (S.track === "mine" && !MINE) S.track = "";
  if (!["720", "1080"].includes(String(S.q))) S.q = "1080";   // 4K는 뺐어요 (11/4)
  let step = Math.max(0, Math.min(5, S.step || 0));
  if (step > 2 && !PH.length) step = 2;
  history.replaceState({ step: 0 }, "");
  for (let i = 1; i <= step; i++) history.pushState({ step: i }, "");
  S.step = step; save();
  render();
  Movie.cleanup();   // 지난번에 만든 영상 파일은 휴대폰 저장 공간에서 지워요
})();
