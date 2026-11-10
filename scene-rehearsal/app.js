// 식전영상 만들기: 템플릿 → 사진 → 글 → 음악 → 미리 보고 만들기
// 11/9: 한 장면에 사진 두 장 — 사진 목록의 "옆에 한 장 더 넣기", 편집 창의 배치(좌우·위아래·큰+작은)·칸 비율. 자료 구조는 normalize() 위 설명
// 2차 업데이트(11/10): ① 찍은 날짜순 정렬(sortByDate) ② 음악에서 쓸 구간 + 박자에 맞춰 넘기기(cutOf·planNow, 4단계 화면) ③ 짧은 폰 영상 넣기(pickClip·insertClip)
//   새로 저장하는 것: S.cut·S.beat, ph: 기록의 taken·vid, 클립은 cl:<id> — 옛 코드는 모두 무시해서 되돌려도 사진·글은 그대로 읽혀요(영상은 첫 장면 사진으로)
// 영상 엔진은 engine.js, 템플릿 디자인은 templates.js, 기본 음원은 music/tracks.js, 공통 기능은 shared/common.js
// 기술 근거·시험 결과·테스트 항목은 docs/식전영상/ (로컬 문서)

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/opening-scene/?preview)
// 시험할 때 ?debug 를 붙이면 기기 점검 결과와 만든 영상 정보가 보여요. (예: …/opening-scene/?preview&debug)
const OPEN = true;
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has("debug");
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SAVE_KEY = "nowShowing.v1";   // 폴더 이름(now-showing → opening-scene, 11/5)이 바뀌어도 저장 이름은 그대로 (만들던 사진·글 유지)
const SAFE = "사진·영상·음악은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.";   // 2차 업데이트: 영상도 넣을 수 있어서 '사진과 음악은' → '사진·영상·음악은' (사회자님 문구 검토 대상)
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

// ===== 상태 (이 휴대폰에 보관해서 새로고침해도 그대로) =====
function fresh(){
  return { step: 0, tpl: TEMPLATES[0].key, groom: "", bride: "", groomEn: "", brideEn: "", date: "", time: "", venue: "", met: "",
    open: 0, openEdit: null,
    story: [[0, true], [1, true], [4, false], [7, true]].map(([pick, on]) => ({ on, pick, edit: null })),
    introOn: false, introGroom: "", introBride: "",
    parentsOn: false, parents: 0, parentsEdit: null,
    thanksOn: true, thanks: 0, thanksEdit: null, close: 0, closeEdit: null,
    track: LIST.length ? LIST[0].id : "", ratio: "16:9", q: "1080",
    cut: null, beat: true };   // cut: 음악에서 쓸 구간 { key, a, b }(없으면 곡 전체), beat: 박자에 맞춰 넘기기 (2차 업데이트)
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
    r.onsuccess = () => { const db = r.result; db.onclose = () => { job = null; }; db.onversionchange = () => { db.close(); job = null; }; res(db); };
    r.onerror = () => { job = null; rej(r.error); };
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    let tx;
    try { tx = db.transaction("kv", mode); } catch (e) { job = null; rej(e); return; }   // 연결이 끊겼으면 다음에 다시 열어요
    const rq = fn(tx.objectStore("kv"));
    tx.oncomplete = () => res(rq ? rq.result : undefined);
    tx.onerror = tx.onabort = () => rej(tx.error);
  }));
  const again = (mode, fn) => run(mode, fn).catch(() => run(mode, fn));   // 한 번 끊겨도 다시 열어서 한 번 더
  return {
    get: k => again("readonly", s => s.get(k)).catch(() => undefined),
    set: (k, v) => again("readwrite", s => s.put(v, k)).then(() => true, () => false),   // 저장 공간이 부족하면 false
    del: k => again("readwrite", s => s.delete(k)).catch(() => {}),
    clear: () => again("readwrite", s => s.clear()).catch(() => {})
  };
})();

let PH = [];        // 사진 { id, bytes, thumbBytes, w, h, taken, vid, clip, url, meta, caption, pair, duo } — 바이트로 들고 있어요(아이폰에서 오래 들고 있던 Blob을 못 읽는 일이 있었어요)
                    // vid: 짧은 영상이면 { len 초 }, clip: 그 영상 MP4 바이트(cl:<id>에 따로 보관). 이때 bytes·thumbBytes는 영상 첫 장면 (2차 업데이트)
                    // taken: 찍은 날짜(밀리초, 모르면 null) — 넣을 때 원본에서 읽어 ph: 기록에 같이 둬요 (날짜순 정렬, 2차 업데이트)
                    // pair: true면 다음 사진과 한 장면에 두 장(11/9), duo: 그 배치 { lay, r } — 둘 다 앞 사진에만 붙어요
let MINE = null;    // 내가 넣은 음악 { name, bytes, type }
let MINE_URL = null;
const mineUrl = () => MINE_URL || (MINE_URL = URL.createObjectURL(new Blob([MINE.bytes], { type: MINE.type })));
const dropMineUrl = () => { if (MINE_URL) URL.revokeObjectURL(MINE_URL); MINE_URL = null; };
let AUD = { key: "", buf: null, beats: null, peaks: null };   // 풀어 둔 음악 (+ 박자 자리, 구간 고르기에 그릴 물결)
let SEL = -1;       // 고른 사진
let PLAYER = null, CUR = null, SAMPLE = null, RESULT = null;
const PREV = new Audio();           // 음원 미리듣기

const jpg = b => new Blob([b], { type: "image/jpeg" });
const bytesOf = async v => { try { return v instanceof ArrayBuffer ? v : v ? await v.arrayBuffer() : null; } catch (e) { return null; } };
let LOST = 0;       // 다시 불러오지 못한 사진 수
async function restore(){
  const order = await DB.get("order");
  if (Array.isArray(order)) for (const id of order) {
    const p = await DB.get("ph:" + id), m = await DB.get("pm:" + id);
    if (!p) { LOST++; continue; }
    const bytes = await bytesOf(p.bytes || p.blob), thumbBytes = (await bytesOf(p.thumbBytes || p.thumb)) || bytes;
    if (!bytes) { LOST++; continue; }
    const item = { id, bytes, thumbBytes, w: p.w, h: p.h, taken: p.taken != null ? p.taken : null, meta: (m ? m.meta : p.meta) || null, caption: (m ? m.caption : p.caption) || "", pair: !!(m && m.pair), duo: (m && m.duo) || null };
    if (p.vid) { const cb = await bytesOf(await DB.get("cl:" + id)); if (cb) { item.vid = p.vid; item.clip = cb; } }   // 클립을 못 읽으면 첫 장면 사진으로 남아요
    item.url = URL.createObjectURL(jpg(thumbBytes));
    PH.push(item);
    if (!p.bytes) { DB.set("ph:" + id, { id, bytes, thumbBytes, w: p.w, h: p.h }); savePhoto(item); }   // 예전 방식으로 저장된 사진은 새 방식으로 옮겨 둬요
  }
  if (LOST) saveOrder();
  normalize();
  const m = await DB.get("music");
  if (m) { const bytes = await bytesOf(m.bytes || m.blob); if (bytes) { MINE = { name: m.name, bytes, type: m.type || (m.blob && m.blob.type) || "audio/mpeg" }; if (!m.bytes) DB.set("music", MINE); } }
}
const saveOrder = () => DB.set("order", PH.map(p => p.id));

// ===== 한 장면에 사진 두 장 (11/9) =====
// 앞 사진의 pair가 true면 다음 사진과 한 장면이에요. 표시가 마지막 사진에 있거나 이미 뒤 칸이 된 사진에 있으면 지워요 (언제나 한 가지 모양이 되게)
// 표시가 하나도 없으면 11/9 전과 똑같이 사진 한 장 = 장면 하나
function normalize(){
  for (let i = 0; i < PH.length; i++) {
    if (!PH[i].pair) continue;
    if (i + 1 >= PH.length || PH[i].vid || PH[i + 1].vid) { PH[i].pair = false; savePhoto(PH[i]); continue; }   // 영상은 한 장면에 하나만
    if (PH[i + 1].pair) { PH[i + 1].pair = false; savePhoto(PH[i + 1]); }
    i++;
  }
}
const pairs = () => PH.map((p, i) => p.pair && i + 1 < PH.length ? i : -1).filter(i => i >= 0);   // Movie.plan에 넘기는 앞 사진 번호들
function scenes(){ const out = []; for (let i = 0; i < PH.length; i++) { if (PH[i].pair && i + 1 < PH.length) { out.push([i, i + 1]); i++; } else out.push([i]); } return out; }   // [i] 또는 [i, j]
const sceneOf = i => scenes().find(s => s.includes(i)) || [i];
// i번 사진과 다음 사진을 한 장면으로. 장면의 글은 앞 사진 것을 쓰니, 뒤 사진에만 글이 있으면 앞으로 옮겨요
function pairUp(i){
  if (i + 1 >= PH.length || PH[i].vid || PH[i + 1].vid) return;
  PH[i].pair = true; PH[i].duo = null;
  if (!(PH[i].caption || "").trim() && (PH[i + 1].caption || "").trim()) { PH[i].caption = PH[i + 1].caption; PH[i + 1].caption = ""; savePhoto(PH[i + 1]); }
  savePhoto(PH[i]); normalize();
}
function unpair(i){ PH[i].pair = false; savePhoto(PH[i]); }
// 사진 한 장을 at 자리에 넣어요 (줄여서 이 휴대폰에 보관). 저장 공간이 부족하면 false
async function insertPhoto(at, file){
  const p = await Movie.shrink(file);
  UNDO = null;   // 사진이 바뀌면 정렬 되돌리기는 없어요
  p.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ok = await DB.set("ph:" + p.id, { id: p.id, bytes: p.bytes, thumbBytes: p.thumbBytes, w: p.w, h: p.h, taken: p.taken });
  PH.splice(at, 0, { ...p, url: URL.createObjectURL(jpg(p.thumbBytes)), meta: null, caption: "", pair: false, duo: null });
  saveOrder();   // 한 장마다 (중간에 페이지가 닫혀도 넣은 데까지는 남게)
  return ok;
}
// ===== 짧은 영상 (2차 업데이트) =====
// c = Movie.clip()이 만든 것 { clip: MP4, vid: { len }, bytes·thumbBytes·w·h: 첫 장면, taken }. 사진과 같은 목록에 들어가고, 영상 장면은 늘 한 장면에 하나
const MAX_CLIPS = 10, CLIP_LENS = [3, 4, 5];
const clipCount = () => PH.filter(p => p.vid).length;
const clipLens = () => { const o = {}; PH.forEach((p, i) => { if (p.vid && p.clip) o[i] = p.vid.len; }); return o; };   // Movie.plan에 넘기는 { 사진 번호: 영상 길이 }
async function insertClip(at, c){
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ok = await DB.set("ph:" + id, { id, bytes: c.bytes, thumbBytes: c.thumbBytes, w: c.w, h: c.h, taken: c.taken, vid: c.vid });
  const ok2 = await DB.set("cl:" + id, c.clip);
  PH.splice(at, 0, { id, bytes: c.bytes, thumbBytes: c.thumbBytes, w: c.w, h: c.h, taken: c.taken, vid: c.vid, clip: c.clip, url: URL.createObjectURL(jpg(c.thumbBytes)), meta: null, caption: "", pair: false, duo: null });
  UNDO = null; saveOrder();
  return ok && ok2;
}
async function replaceClip(i, c){
  const old = PH[i];
  URL.revokeObjectURL(old.url);
  Object.assign(old, { bytes: c.bytes, thumbBytes: c.thumbBytes, w: c.w, h: c.h, taken: c.taken, vid: c.vid, clip: c.clip, url: URL.createObjectURL(jpg(c.thumbBytes)), meta: null });
  await DB.set("ph:" + old.id, { id: old.id, bytes: c.bytes, thumbBytes: c.thumbBytes, w: c.w, h: c.h, taken: c.taken, vid: c.vid });
  await DB.set("cl:" + old.id, c.clip);
  savePhoto(old); normalize();   // 두 장 장면에 있던 사진이면 한 장씩으로 풀려요
}
// 폰 영상에서 쓸 3~5초를 고르는 창. 고르면 그 부분만 작게 다시 만들어서 돌려줘요(안 넣으면 null). 뒤로 가기 = 안 넣기
function pickClip(file, label){
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), box = document.createElement("div");
    let len = 4, start = 0, dur = 0, busy = false, over = false, result = null;
    box.className = "editor clipper"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "영상에서 쓸 부분 고르기");
    box.innerHTML = `<div class="in">
      <div class="ed-top"><b>영상에서 쓸 부분 고르기</b><span class="count">${esc(label || "")}</span></div>
      <div class="ed-stage clip-stage"><video playsinline muted preload="auto"></video></div>
      <p class="drag" id="clhint">영상을 여는 중…</p>
      <div class="seg" id="cllen">${CLIP_LENS.map(v => `<button data-v="${v}" class="${v === len ? "on" : ""}">${v}초</button>`).join("")}</div>
      <label class="range"><span id="clat">시작 0:00</span><input type="range" id="clstart" min="0" max="0" step="0.05" value="0" aria-label="시작 위치"></label>
      <button class="btn main" id="clok" disabled>이 부분 넣기</button>
      <button class="btn ghost" id="clno">이 영상은 안 넣기</button>
      <p class="msg" id="clmsg" role="status"></p>
    </div>`;
    document.body.appendChild(box); document.body.style.overflow = "hidden";
    history.pushState({ step: S.step, ed: 1 }, "");
    const q = x => box.querySelector(x), v = q("video"), sl = q("#clstart");
    const finish = () => {
      if (over) return; over = true;
      v.pause(); v.removeAttribute("src"); try { v.load(); } catch (e) {}
      URL.revokeObjectURL(url); box.remove(); document.body.style.overflow = "";
      resolve(result);
    };
    ED = { close: finish };                                    // 창 닫기는 뒤로 가기(전체 popstate)에서 — 사진 편집 창과 같은 방식
    // 뒤로 가기 신호가 안 오는 브라우저에서도 창이 닫히게 조금 기다렸다 직접 닫아요 (안 그러면 사진 넣기가 멈춘 채로 남아요)
    const leave = r => { result = r; history.back(); setTimeout(() => { if (!over) { if (ED && ED.close === finish) ED = null; finish(); } }, 1500); };
    const show = () => {
      const use = Math.min(len, dur);
      sl.max = Math.max(0, dur - use).toFixed(2); start = Math.min(start, +sl.max); sl.value = start; sl.disabled = busy || +sl.max <= 0;
      q("#clat").textContent = `시작 ${mmss(start)}`;
      box.querySelectorAll("#cllen button").forEach(b => { b.classList.toggle("on", +b.dataset.v === len); b.disabled = busy || (+b.dataset.v > dur + .05 && +b.dataset.v !== CLIP_LENS[0]); });
    };
    const play = () => { try { v.currentTime = start; } catch (e) {} v.play().catch(() => {}); };
    const ready = () => {   // 영상 길이를 알게 되면 한 번만
      if (dur || over) return;
      const d = isFinite(v.duration) ? v.duration : 0;
      if (!d) return;
      if (d < 1) { q("#clhint").textContent = "1초보다 짧은 영상은 넣을 수 없어요."; return; }
      dur = d;
      while (len > CLIP_LENS[0] && len > dur + .05) len--;
      q("#clhint").textContent = "고른 부분이 되풀이돼요. 소리는 빼고 넣어서, 영상에는 배경 음악만 나와요.";
      q("#clok").disabled = false; show(); play();
    };
    v.onloadedmetadata = v.ondurationchange = ready;
    v.onerror = () => { q("#clhint").textContent = "이 영상은 열 수 없어요. 다른 영상을 골라 주세요."; };
    v.ontimeupdate = () => { if (!busy && dur && (v.currentTime >= start + Math.min(len, dur) - .04 || v.currentTime < start - .3)) play(); };
    v.onended = () => { if (!busy) play(); };
    v.src = url;
    v.play().catch(() => {});   // 아이폰은 재생을 걸어야 영상 정보를 읽어 오기도 해요 (소리 없이, 화면 안에서)
    sl.oninput = () => { start = +sl.value; q("#clat").textContent = `시작 ${mmss(start)}`; v.pause(); try { v.currentTime = start; } catch (e) {} };
    sl.onchange = () => { if (!busy) play(); };
    box.querySelectorAll("#cllen button").forEach(b => b.onclick = () => { if (busy) return; len = +b.dataset.v; show(); play(); });
    q("#clno").onclick = () => leave(null);
    q("#clok").onclick = async () => {
      if (busy || !dur) return;
      busy = true; v.pause(); q("#clok").disabled = true; show();
      const msg = q("#clmsg");
      msg.textContent = "영상 준비 중…";
      try {
        const c = await Movie.clip(file, start, Math.min(len, dur), p => { msg.textContent = `영상 준비 중… ${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`; }, DEBUG && QS.has("capturetest") ? "capture" : undefined);
        if (DEBUG) console.log("clip", c.how, c.why, c.vid, c.w, c.h, c.clip.byteLength);
        if (!over) leave(c);
      } catch (e) {
        if (over) return;
        busy = false; q("#clok").disabled = false; show();
        msg.textContent = "이 영상은 넣을 수 없어요. 다른 영상을 골라 주세요.";
        if (DEBUG) msg.textContent += ` (${(e && e.message) || e})`;
      }
    };
  });
}

// ===== 찍은 날짜순 정렬 (2차 업데이트) =====
// 장면 단위로 정렬해요(두 장 장면은 두 사진 중 이른 날짜로, 둘이 같이 움직여요). 날짜를 모르는 장면은 지금 순서 그대로 맨 뒤에
let UNDO = null;   // 정렬하기 직전 순서 (되돌리기용, 사진을 넣거나 빼면 지워요)
const dated = () => PH.filter(p => p.taken != null).length;
function sortByDate(){
  const SC = scenes(), when = s => { const ts = s.map(i => PH[i].taken).filter(x => x != null); return ts.length ? Math.min(...ts) : null; };
  const rows = SC.map((s, q) => ({ s, q, k: when(s) }));
  rows.sort((a, b) => ((a.k == null) - (b.k == null)) || (a.k != null && b.k != null ? a.k - b.k : 0) || a.q - b.q);
  const before = PH.slice(), next = rows.flatMap(r => r.s.map(i => PH[i]));
  const moved = next.some((p, i) => p !== before[i]);
  if (moved) { UNDO = before.map(p => p.id); PH = next; saveOrder(); }
  return { moved, unknown: rows.filter(r => r.k == null).reduce((n, r) => n + r.s.length, 0) };
}
function undoSort(){
  if (!UNDO) return false;
  const by = new Map(PH.map(p => [p.id, p])), back = UNDO.map(id => by.get(id)).filter(Boolean);
  UNDO = null;
  if (back.length !== PH.length) return false;
  PH = back; normalize(); saveOrder(); return true;
}
const whenKo = t => { const d = new Date(t); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };

// ===== 음악에서 쓸 구간 · 박자에 맞춰 넘기기 (2차 업데이트) =====
// S.cut = { key, a, b }: 그 음악(key)에서 쓸 구간(초). 다른 음악을 고르면 곡 전체로 돌아가요. 영상 길이 = 구간 길이
// S.beat: 박자에 맞춰 넘기기(기본 켬). 박자가 흐린 곡(clear < BEAT_MIN)은 꺼진 것으로 다뤄요
const CUT_MIN = 10, BEAT_MIN = .06;   // BEAT_MIN: 13곡 시험에서 다른 분석 도구와 박자 자리가 맞던 곡은 .08 이상, 안 맞던 곡은 .03 (docs/식전영상/기획.md 2차 업데이트)
const audKey = () => S.track === "mine" ? (MINE ? `mine:${MINE.name}:${MINE.bytes.byteLength}` : "") : S.track;
const curBuf = () => (AUD.buf && AUD.key && AUD.key === audKey() ? AUD.buf : null);   // 지금 고른 음악이 풀려 있을 때만
function cutOf(buf){
  if (!buf) return null;
  const D = buf.duration, c = S.cut && S.cut.key === AUD.key ? S.cut : null;
  if (!c || D <= CUT_MIN) return { a: 0, b: D, whole: true };
  const a = Math.max(0, Math.min(D - CUT_MIN, +c.a || 0)), b = Math.max(a + CUT_MIN, Math.min(D, +c.b || D));
  return { a, b, whole: a < .05 && b > D - .05 };
}
const beatClear = () => !!(AUD.beats && AUD.beats.clear >= BEAT_MIN);
function planOpt(buf){
  const o = { clips: clipLens() }, c = cutOf(buf);
  if (c && !c.whole) o.fit = true;   // 구간을 골랐으면 영상을 그 길이에 맞춰요 (사진이 많으면 빠르게 넘김)
  if (c && buf === AUD.buf && S.beat !== false && beatClear()) {
    const B = AUD.beats.beats, k0 = B.findIndex(x => x >= c.a - .02);
    if (k0 >= 0) {
      o.beats = [];
      for (let k = k0; k < B.length && B[k] < c.b; k++) o.beats.push(B[k] - c.a);
      o.down = (((AUD.beats.down - k0) % 4) + 4) % 4;   // 구간 안에서 마디 첫 박인 번호
    }
  }
  return o;
}
// 지금 사진·글·음악 구간·박자·영상으로 장면 순서 만들기 (미리 보기·편집 창·길이 어림이 같은 계산을 써요)
function planNow(T, d, buf){ const c = cutOf(buf); return Movie.plan(T, d, PH.length, c ? c.b - c.a : 0, pairs(), planOpt(buf)); }

// ===== 글 =====
const tpl = () => TEMPLATES.find(x => x.key === S.tpl) || TEMPLATES[0];
// 사귄 날로 채우는 말: {만난해} 2019 · {연애} 5년(1년 안 되면 8개월) · {일수} 1,234 (사귄 날부터 예식 날까지, 예식 날을 안 쓰면 오늘까지)
function ymd(s){ const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); }
function fillWord(w){
  if (typeof w === "string") return w;
  if (!S.met) return w.alt;
  const today = new Date(), met = ymd(S.met), end = S.date ? ymd(S.date) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
const mmss = s => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
const lenKo = s => { const t = Math.round(s), m = Math.floor(t / 60), r = t % 60; return m ? `${m}분${r ? ` ${r}초` : ""}` : `${r}초`; };

// ===== 화면 이동 (휴대폰 뒤로 가기 = 한 화면 전) =====
const $ = s => app.querySelector(s);
let ED = null;       // 열린 사진 편집 창 { close }
let MAKING = null;   // 만드는 중 화면 { hint }
function stopAll(){
  previewJob++;      // 준비 중이던 미리 보기는 버려요
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
  // 만드는 중에는 뒤로 가지 않아요 (그만 만들기로 멈춰요)
  if (MAKING) { history.pushState({ step: 5 }, ""); MAKING.hint(); return; }
  // 사진 편집 창만 닫고, 보던 목록 위치·고른 사진은 그대로
  if (ED) {
    const st = e.state && e.state.step;
    ED.close(); ED = null;
    if (st === S.step) { if (S.step === 2) stepPhotos(); else if (S.step === 5) preview(); return; }
  }
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
// ===== 새 기능 알림 (11/9): 첫 화면과 단계 화면 위에 작게. 닫으면 이 휴대폰에서 다시 안 보여요 — 예전에 링크를 받은 분도 새 기능을 알 수 있게 =====
// 다음 업데이트 때는 v를 바꾸고 글을 고치면 다시 한 번 보여요. 만들던 단계로 바로 들어가는 분은 첫 화면을 안 거치니 단계 화면(topBar)에도 넣어요
const NEWS = { v: "v2-1", title: "새 기능 3가지", text: "노래 박자에 맞춰 사진 넘기기 · 폰 영상 넣기(3~5초) · 찍은 날짜순 정렬이 생겼어요. 음악에서 쓸 구간도 고를 수 있어요." };   // 1차(11/9): { v: "duo-1", "새 기능 · 한 장면에 사진 두 장" }
const NEWS_KEY = "nowShowing.news";
const newsSeen = () => { try { return localStorage.getItem(NEWS_KEY) === NEWS.v; } catch (e) { return true; } };   // 저장이 안 되는 브라우저에선 매번 뜨지 않게 아예 안 보여요
const newsBar = () => newsSeen() ? "" : `<div class="news" role="status"><span class="new">NEW</span><p><b>${esc(NEWS.title)}</b>${esc(NEWS.text)}</p><button type="button" id="newsx" aria-label="알림 닫기">×</button></div>`;
app.addEventListener("click", e => {   // 화면을 다시 그려도 닫기가 되게 한 번만 걸어 둬요
  const b = e.target.closest && e.target.closest("#newsx"); if (!b) return;
  try { localStorage.setItem(NEWS_KEY, NEWS.v); } catch (x) {}
  const n = b.closest(".news"); if (n) n.remove();
});
const topBar = n => `<div class="top"><span>식전영상 만들기</span><span class="count">${n} / ${STEPS}</span></div>${newsBar()}`;
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
    <p>${app2}에서 열어 주세요. 여기서 넣은 사진과 글은 ${android ? "크롬으로" : "사파리로"} 넘어가지 않아서, 먼저 브라우저 이동 후에 시작하는 게 좋아요.</p>
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
    <p class="lead">템플릿을 고르고 사진과 글을 넣으면, 식장 스크린에 틀 영상(MP4)이 바로 만들어져요.</p>
    ${newsBar()}
    ${Movie.MOBILE ? `<p class="note pc">컴퓨터에서 열면 사진 고르기와 파일 저장이 더 편하고, 영상도 더 빨리 만들어져요.</p>` : ""}
    ${ia ? inAppBox(ia) : `<div class="pick">
      ${started ? `<button id="resume"><span>이어서 만들기</span><span class="q">${clipCount() ? `사진 ${PH.length - clipCount()}장 · 영상 ${clipCount()}개` : `사진 ${PH.length}장`}</span></button>` : ""}
      <button id="start"><span>${started ? "처음부터 새로" : "만들기 시작"}</span><span class="q">5단계 · 무료</span></button>
    </div>
    <p class="msg" id="msg" role="status" style="color:var(--cover-sub);margin-top:10px"></p>`}
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    ${DEBUG ? `<p class="note" style="color:var(--cover-sub);margin-top:18px">시험용 정보예요. 주소에 debug가 있을 때만 보여요.</p><pre class="report" id="report">기기 점검 중…</pre><button class="text-btn" id="copyrep" style="color:var(--cover-sub)">결과 복사하기</button>` : ""}
    ${foot()}`;
  if ($("#copyurl")) $("#copyurl").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); say(`링크를 복사했어요. ${Movie.ANDROID ? "크롬" : "사파리"} 주소창에 붙여 넣어 주세요.`, "#iamsg"); }
    catch (e) { say(location.href, "#iamsg"); }
  };
  if ($("#resume")) $("#resume").onclick = () => go(1);
  let armed = false;
  if ($("#start")) $("#start").onclick = async () => {
    if (started && !armed) { armed = true; say("만들던 사진과 글이 지워져요. 한 번 더 누르면 새로 시작해요."); return; }
    if (started) {
      PH.forEach(p => URL.revokeObjectURL(p.url)); PH = []; MINE = null; dropMineUrl(); AUD = { key: "", buf: null };
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
  const T = tpl(), d = data(), P = planNow(T, d, curBuf());
  const c = T.name.charCodeAt(T.name.length - 1) - 0xAC00, eun = c >= 0 && c < 11172 && c % 28 ? "은" : "는";   // 받침 있으면 '은'
  return n ? `약 ${lenKo(P.total)} 영상` : `${T.name}${eun} ${T.photos[0]}~${T.photos[1]}장을 추천해요`;
}
function stepPhotos(){
  const SC = scenes(), pairOf = i => { const s = SC.find(x => x.includes(i)); return s && s.length === 2 ? (s[0] === i ? "pa" : "pb") : ""; };
  const cur = SEL >= 0 && PH[SEL] ? SC.find(x => x.includes(SEL)) : null, q = cur ? SC.indexOf(cur) : -1, pr = !!(cur && cur.length === 2);
  const nv = clipCount(), isV = !!(cur && PH[SEL].vid), what = isV ? "영상" : "사진";
  app.innerHTML = `${topBar(2)}
    <h2 class="title">사진을 넣어 주세요</h2>
    <p class="sub">넣은 순서대로 나와요. 사진을 누르면 순서를 바꾸거나, 위치·크기를 맞추고 글을 넣을 수 있어요. 한 장면에 두 장을 넣을 수도 있어요.</p>
    <label class="btn main add"><input type="file" id="pick" accept="image/*,video/*" multiple>${PH.length ? "사진·영상 더 넣기" : "사진·영상 고르기"}</label>
    <p class="note addnote">폰으로 찍은 영상도 넣을 수 있어요. 3~5초만 골라서, 소리 없이 들어가요.</p>
    <p class="busy" id="busy" role="status"></p>
    <div class="count-line"><span>${nv ? `사진 ${PH.length - nv}장 · 영상 ${nv}개` : `${PH.length}장`}${PH.length >= MAX_PHOTOS ? " (최대)" : ""}${SC.length < PH.length ? ` · 장면 ${SC.length}개` : ""}</span><span>${guess(PH.length)}</span></div>
    ${PH.length >= 2 ? `<div class="sortrow"><button class="text-btn" id="sortd">찍은 날짜순으로 정렬</button>${UNDO ? `<button class="text-btn" id="unsort">정렬 되돌리기</button>` : ""}</div>` : ""}
    <div class="photos">${PH.map((p, i) => `<button data-i="${i}" class="${i === SEL ? "on " : ""}${pairOf(i)}" aria-label="${i + 1}번 ${p.vid ? "영상" : "사진"}${pairOf(i) ? " (한 장면에 두 장)" : ""}"><img src="${p.url}" alt=""><span class="no">${i + 1}</span>${pairOf(i) ? `<span class="pr">2장</span>` : p.vid ? `<span class="pr vd">▶ ${Math.round(p.vid.len)}초</span>` : ""}${p.caption ? `<span class="tag">글</span>` : edited(p) ? `<span class="tag">✎</span>` : ""}</button>`).join("")}</div>
    ${cur ? `<div class="photo-tools">
      <p class="which">${pr ? `${cur[0] + 1}·${cur[1] + 1}번 사진 (한 장면)` : isV ? `${SEL + 1}번 영상 (${Math.round(PH[SEL].vid.len)}초, 소리 없이)` : `${SEL + 1}번 사진`}${PH[SEL].taken != null ? `<span class="when">${pr ? `${SEL + 1}번 ` : ""}${whenKo(PH[SEL].taken)} 찍음</span>` : ""}</p>
      <button class="btn main half" id="edit">편집하기</button>
      <label class="btn ghost add half"><input type="file" id="swap" accept="image/*,video/*">${pr ? `${SEL + 1}번 ` : ""}${what} 바꾸기</label>
      <button class="btn ghost" id="mvl"${q === 0 ? " disabled" : ""}>← 앞으로</button>
      <button class="btn ghost" id="mvr"${q === SC.length - 1 ? " disabled" : ""}>뒤로 →</button>
      <button class="btn ghost" id="rm">${pr ? `${SEL + 1}번 ` : ""}빼기</button>
      ${pr ? `<button class="btn ghost wide" id="unpair">두 사진을 한 장씩 따로 보이기</button>`
        : PH.length < MAX_PHOTOS && !isV ? `<label class="btn ghost add wide"><input type="file" id="pairpick" accept="image/*">옆에 한 장 더 넣기 (한 장면에 두 장)</label>` : ""}</div>` : ""}
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    ${navBar("이전", "다음: 글 넣기", PH.length === 0)}`;
  $("#pick").onchange = e => addPhotos(e.target.files);
  if (LOST) { say(`예전에 넣은 사진 ${LOST}장을 다시 불러오지 못했어요. 다시 넣어 주세요.`, "#busy"); LOST = 0; }
  if (ADDING) lockPhotos();
  app.querySelectorAll(".photos button").forEach(b => b.onclick = () => { const i = +b.dataset.i; SEL = SEL === i ? -1 : i; stepPhotos(); });
  // 순서 바꾸기는 장면 단위예요 (두 장 장면은 둘이 같이 움직여요)
  const move = d => {
    const t = q + d; if (q < 0 || t < 0 || t >= SC.length) return;
    const [a, b] = d < 0 ? [SC[t], cur] : [cur, SC[t]], start = a[0], off = SEL - cur[0];
    const block = PH.splice(start, a.length + b.length);
    PH.splice(start, 0, ...block.slice(a.length), ...block.slice(0, a.length));
    SEL = (d < 0 ? start : start + b.length) + off;
    saveOrder(); stepPhotos();
  };
  if ($("#edit")) $("#edit").onclick = () => editPhoto(SEL);
  if ($("#sortd")) $("#sortd").onclick = () => {
    if (dated() < 2) { say("찍은 날짜를 알 수 있는 사진이 2장보다 적어요. 카톡으로 받은 사진이나 이 기능이 생기기 전에 넣은 사진은 날짜 정보가 없어요.", "#busy"); return; }
    const r = sortByDate(); SEL = -1; stepPhotos();
    say(!r.moved ? "이미 찍은 날짜순이에요." : `찍은 날짜순으로 정렬했어요.${r.unknown ? ` 날짜를 모르는 사진 ${r.unknown}장은 맨 뒤에 있어요.` : ""}`, "#busy");
  };
  if ($("#unsort")) $("#unsort").onclick = () => { const ok = undoSort(); SEL = -1; stepPhotos(); say(ok ? "정렬하기 전 순서로 되돌렸어요." : "사진이 바뀌어서 되돌릴 수 없어요.", "#busy"); };
  if ($("#swap")) $("#swap").onchange = async e => {
    const f = e.target.files && e.target.files[0], at = SEL; if (!f) return;
    try {
      if (Movie.isVideo(f)) {   // 영상이면 쓸 부분부터 골라요 (안 넣기를 누르면 그대로)
        if (!PH[at].vid && clipCount() >= MAX_CLIPS) { say(`영상은 ${MAX_CLIPS}개까지 넣을 수 있어요.`, "#busy"); return; }
        lockPhotos();
        const c = await pickClip(f, "");
        if (c && PH[at]) { await replaceClip(at, c); UNDO = null; }
        SEL = at; stepPhotos();
        if (c) say(`${at + 1}번을 영상으로 바꿨어요. 넣어 둔 글은 그대로예요.`, "#busy");
        return;
      }
      say("사진 바꾸는 중…", "#busy");
      await replacePhoto(at, f); stepPhotos(); say(`${at + 1}번 사진을 바꿨어요. 넣어 둔 글은 그대로예요.`, "#busy");
    } catch (x) { stepPhotos(); say("이 파일은 열 수 없어요.", "#busy"); }
  };
  if ($("#mvl")) $("#mvl").onclick = () => move(-1);
  if ($("#mvr")) $("#mvr").onclick = () => move(1);
  if ($("#rm")) $("#rm").onclick = () => {
    if (pr) { if (SEL === cur[0]) PH[SEL].pair = false; else unpair(cur[0]); }   // 짝이던 사진은 한 장으로 남아요
    const [p] = PH.splice(SEL, 1); URL.revokeObjectURL(p.url); DB.del("ph:" + p.id); DB.del("pm:" + p.id); if (p.vid) DB.del("cl:" + p.id); UNDO = null;
    SEL = Math.min(SEL, PH.length - 1); normalize(); saveOrder(); stepPhotos();
  };
  if ($("#unpair")) $("#unpair").onclick = () => { unpair(cur[0]); stepPhotos(); say(`${cur[0] + 1}번과 ${cur[1] + 1}번 사진이 한 장씩 따로 나와요.`, "#busy"); };
  if ($("#pairpick")) $("#pairpick").onchange = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    say("사진 넣는 중…", "#busy"); lockPhotos();
    try { await insertPhoto(SEL + 1, f); pairUp(SEL); stepPhotos(); say(`${SEL + 1}·${SEL + 2}번 사진이 한 장면에 나와요. 편집하기에서 배치를 바꿀 수 있어요.`, "#busy"); }
    catch (x) { stepPhotos(); say("이 사진은 열 수 없어요.", "#busy"); }
  };
  bindNav(() => go(3));
}
// ===== 사진 편집: 끌어서 옮기기 · 두 손가락으로 확대 · 꽉 채우기/사진 전체 · 이 사진에 넣을 글 (땡큐 카드와 같은 손동작) =====
// 두 장 장면(11/9)이면 칸을 눌러 고르고 그 칸의 사진을 맞춰요. 배치(좌우·위아래·큰+작은)와 칸 비율도 여기서 바꿔요
const DRAG_HINT = "사진을 끌어서 옮기고, 두 손가락으로 벌려서 확대할 수 있어요";
const VID_HINT = "영상의 첫 장면이에요. 여기서 맞춘 위치·크기가 영상 내내 똑같이 적용돼요";
const DUO_HINT = ["① 칸 사진을 맞추는 중이에요. 다른 칸을 누르면 그 칸을 맞춰요", "② 칸 사진을 맞추는 중이에요. 다른 칸을 누르면 그 칸을 맞춰요"];
const LAYS = [["lr", "좌우"], ["tb", "위아래"], ["pip", "큰+작은"]];
const ZMAX = 3;
let RESUME_AT = null;   // 미리 보기에서 편집하러 갔다 오면 그 장면부터
async function replacePhoto(i, file){
  const p = await Movie.shrink(file), old = PH[i];
  URL.revokeObjectURL(old.url);
  if (old.vid) DB.del("cl:" + old.id);   // 영상을 사진으로 바꾸면 클립은 지워요
  Object.assign(old, { bytes: p.bytes, thumbBytes: p.thumbBytes, w: p.w, h: p.h, taken: p.taken, vid: null, clip: null, url: URL.createObjectURL(jpg(p.thumbBytes)), meta: null });
  DB.set("ph:" + old.id, { id: old.id, bytes: p.bytes, thumbBytes: p.thumbBytes, w: p.w, h: p.h, taken: p.taken });
  savePhoto(old);
}
// 위치·글·두 장 표시는 사진 파일과 다른 칸(pm:)에 따로 저장해요. 바꿀 때마다 큰 사진 기록을 다시 쓰지 않으려고요
function savePhoto(p){ DB.set("pm:" + p.id, { meta: p.meta || null, caption: p.caption || "", pair: !!p.pair, duo: p.duo || null }); }
const edited = p => !!(p.meta && (p.meta.z > 1.01 || Math.abs(p.meta.cx - .5) > .005 || Math.abs(p.meta.cy - .5) > .005 || (p.meta.fit && p.meta.fit !== "auto")));
function editPhoto(start){
  if (!PH[start]) return;
  const first = sceneOf(start);
  let i = first[0], act = first.length === 2 && start === first[1] ? 1 : 0;   // i: 장면의 앞 사진, act: 두 장 장면에서 지금 맞추는 칸(0 앞, 1 뒤)
  let P = null, M = null, seg = null, raf = 0, saveT = 0, edgeT = 0;
  const T = tpl(), [W, H] = Movie.size(S.ratio, "720"), tall = H > W, touches = new Map();
  let bank = Movie.bank(PH);
  const box = document.createElement("div");
  box.className = "editor"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "사진 편집");
  document.body.appendChild(box); document.body.style.overflow = "hidden";
  history.pushState({ step: S.step, ed: 1 }, "");
  const two = () => !!(PH[i].pair && i + 1 < PH.length);     // 두 장 장면인지
  const cur = () => (two() && act === 1 ? i + 1 : i);          // 지금 맞추는 사진 번호
  const hint = () => two() ? DUO_HINT[act] : PH[i].vid ? VID_HINT : DRAG_HINT;
  const meta = () => (PH[cur()].meta = PH[cur()].meta || { cx: .5, cy: .5, z: 1, fit: "auto" });
  const dirty = new Set();   // 곧 저장할 사진들 (칸을 오가며 고쳐도 하나도 안 빠지게)
  const flush = () => { clearTimeout(saveT); dirty.forEach(savePhoto); dirty.clear(); };
  const later = p => { dirty.add(p || PH[cur()]); clearTimeout(saveT); saveT = setTimeout(flush, 400); };
  const duoR = () => two() && M ? Movie.kit.duoBoxes(M, T, PH[i].duo) : null;
  const geom = () => {
    const idx = cur(), ph = bank.get(idx); if (!ph || !M) return null;
    const b = two() ? duoR().boxes[act] : (T.box ? T.box(M, ph) : [0, 0, W, H]);
    return { ph, idx, bw: b[2], bh: b[3] };
  };
  // 지금 '사진 전체'(흐린 배경)로 보이는지: 직접 고른 경우, 또는 자동인데 사진과 칸 비율이 많이 다른 경우 (두 장 장면의 자동은 늘 꽉 채우기)
  const whole = g => { const m = PH[g.idx].meta || {}; if (m.fit === "whole") return true; if (m.fit === "cover" || two() || !T.autoFit) return false; const ar = g.ph.w / g.ph.h, br = g.bw / g.bh; return Math.max(ar / br, br / ar) > 1.45; };
  function draw(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const c = box.querySelector("canvas");
      if (!c || !M) return;
      const x = c.getContext("2d", { alpha: false });
      x.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
      Movie.frame(x, seg.start + seg.dur * .5, M);
      const R = duoR();
      if (R) {   // 지금 맞추는 칸에 흰 테두리
        const [bx, by, bw, bh] = R.boxes[act], lw = Math.max(3, W * .004);
        x.save(); x.lineWidth = lw * 2; x.strokeStyle = "rgba(0,0,0,.35)"; x.strokeRect(bx + lw, by + lw, bw - 2 * lw, bh - 2 * lw);
        x.lineWidth = lw; x.strokeStyle = "#fff"; x.strokeRect(bx + lw, by + lw, bw - 2 * lw, bh - 2 * lw); x.restore();
      }
    });
  }
  function replan(){
    const d = data();
    P = planNow(T, d, curBuf());
    seg = P.segs.find(g => g.kind === "photo" && g.i === i);
    M = Movie.scene(P, W, H, T, d, bank);
  }
  const syncFit = () => box.querySelectorAll("#edfit button").forEach(b => b.classList.toggle("on", b.dataset.v === ((PH[cur()].meta || {}).fit || "auto")));
  const edge = () => {
    const h = box.querySelector("#edhint");
    h.textContent = meta().z < ZMAX - .01 ? "사진 끝에 닿았어요. 확대하면 더 옮길 수 있어요." : "사진 끝에 닿았어요.";
    clearTimeout(edgeT); edgeT = setTimeout(() => { h.textContent = hint(); }, 2200);
  };
  async function shell(){
    replan();
    const pr = two(), m = PH[cur()].meta || {}, introHere = S.introOn && i < 2 && PH.length >= 2;
    const R = duoR(), LIM = R ? Movie.kit.DUO_LIM[R.lay] : null, SC = scenes(), q = SC.findIndex(s => s[0] === i);
    const isV = !!PH[i].vid, canJoin = !pr && !isV && i + 1 < PH.length && !PH[i + 1].pair && !PH[i + 1].vid, slot = pr ? (act ? "② " : "① ") : "";
    box.innerHTML = `<div class="in">
      <div class="ed-top"><b>${isV ? "영상 편집" : "사진 편집"}</b><span class="count">${pr ? `${i + 1}·${i + 2}` : i + 1} / ${PH.length}</span></div>
      <div class="ed-stage${tall ? " tall" : ""}"><canvas width="${W >= H ? 720 : 405}" height="${W >= H ? 405 : 720}"></canvas></div>
      <p class="drag" id="edhint">${hint()}</p>
      ${pr ? `<div class="seg lay" id="edlay">${LAYS.map(([v, l]) => `<button data-v="${v}" class="${R.lay === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <label class="range"><span id="edrl">${R.lay === "pip" ? "작은 사진 크기" : "앞 칸 비중"}</span><input type="range" id="edr" min="${LIM[0]}" max="${LIM[1]}" step="0.01" value="${R.r}"></label>` : ""}
      <label class="range"><span id="edzl">${slot}사진 크기</span><input type="range" id="edzoom" min="1" max="${ZMAX}" step="0.01" value="${m.z || 1}"></label>
      <div class="seg" id="edfit">${[["auto", "자동"], ["cover", "꽉 채우기"], ["whole", "사진 전체"]].map(([v, l]) => `<button data-v="${v}" class="${(m.fit || "auto") === v ? "on" : ""}">${l}</button>`).join("")}</div>
      <label class="field"><span>이 ${pr ? "장면" : isV ? "영상" : "사진"}에 넣을 글 <em>(안 써도 돼요)</em></span><textarea id="edcap" rows="2" maxlength="40" placeholder="예: 헬스장에서 시작된 이야기">${esc(PH[i].caption || "")}</textarea></label>
      ${introHere ? `<p class="note" style="margin-top:-4px">1·2번 사진에는 신랑·신부 소개가 나와서, 여기 쓴 글은 영상에 안 나와요.</p>` : ""}
      <div class="ed-nav"><button class="btn ghost" id="edprev"${q <= 0 ? " disabled" : ""}>← 이전 ${pr ? "장면" : "사진"}</button><button class="btn ghost" id="ednext"${q >= SC.length - 1 ? " disabled" : ""}>다음 ${pr ? "장면" : "사진"} →</button></div>
      <button class="btn main" id="eddone">완료</button>
      ${isV ? `<button class="btn ghost" id="edreset">처음 위치로</button>`
        : `<div class="ed-nav"><label class="btn ghost add"><input type="file" id="edswap" accept="image/*"><span id="edswapl">${slot}다른 사진으로 바꾸기</span></label><button class="btn ghost" id="edreset">처음 위치로</button></div>`}
      ${pr ? `<button class="btn ghost" id="edsplit">두 사진을 한 장씩 따로 보이기</button>`
        : isV ? "" : `<div class="ed-nav"><label class="btn ghost add${PH.length >= MAX_PHOTOS ? " off" : ""}"><input type="file" id="edpair" accept="image/*"${PH.length >= MAX_PHOTOS ? " disabled" : ""}>옆에 한 장 더 넣기</label><button class="btn ghost" id="edjoin"${canJoin ? "" : " disabled"}>다음 사진과 한 장면에</button></div>`}
      <p class="msg" id="edmsg" role="status"></p>
    </div>`;
    const c = box.querySelector("canvas"), q$ = s => box.querySelector(s);
    const toV = e => { const r = c.getBoundingClientRect(), k = W / r.width; return { x: e.clientX * k, y: e.clientY * k }; };   // 끌기용 (차이만 써요)
    const toC = e => { const r = c.getBoundingClientRect(), k = W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }; };   // 누른 자리 (화면 안 좌표)
    // 칸을 바꾸면 슬라이더·버튼·안내도 그 칸 것으로 (화면을 다시 만들지 않아요: 끌던 손가락이 끊기지 않게)
    const syncSlot = () => { const mm = PH[cur()].meta || {}; q$("#edzoom").value = mm.z || 1; syncFit(); q$("#edhint").textContent = hint(); q$("#edzl").textContent = `${act ? "② " : "① "}사진 크기`; q$("#edswapl").textContent = `${act ? "② " : "① "}다른 사진으로 바꾸기`; };
    const slotAt = v => {   // 두 장 장면: 누른 자리의 칸 (큰+작은은 작은 사진 먼저)
      const R2 = duoR(); if (!R2) return -1;
      const inb = ([x, y, w, h]) => v.x >= x && v.x <= x + w && v.y >= y && v.y <= y + h;
      return inb(R2.boxes[1]) ? 1 : inb(R2.boxes[0]) ? 0 : -1;
    };
    c.onpointerdown = e => {
      const v = toV(e);
      if (two() && touches.size === 0) { const k = slotAt(toC(e)); if (k >= 0 && k !== act) { act = k; syncSlot(); draw(); } }
      const g = geom(); if (!g) return;
      if (whole(g)) { meta().fit = "cover"; syncFit(); draw(); }   // 사진 전체로 보이는 중에 끌면 꽉 채우기로 바꿔요
      try { c.setPointerCapture(e.pointerId); } catch (x) {}   // 일부 브라우저는 붙잡기를 거절해요 — 그래도 끌기는 돼요
      touches.set(e.pointerId, v);
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
    if (pr) {
      box.querySelectorAll("#edlay button").forEach(b => b.onclick = () => {
        PH[i].duo = { lay: b.dataset.v, r: null }; later(PH[i]);   // 배치를 바꾸면 비율은 그 배치의 기본값으로
        box.querySelectorAll("#edlay button").forEach(x => x.classList.toggle("on", x === b));
        const R2 = duoR(), L2 = Movie.kit.DUO_LIM[R2.lay], r = q$("#edr"); r.min = L2[0]; r.max = L2[1]; r.value = R2.r;
        q$("#edrl").textContent = R2.lay === "pip" ? "작은 사진 크기" : "앞 칸 비중";
        draw();
      });
      q$("#edr").oninput = e => { PH[i].duo = { lay: (PH[i].duo || {}).lay || null, r: +e.target.value }; later(PH[i]); draw(); };
      q$("#edsplit").onclick = () => { flush(); unpair(i); act = 0; shell(); };
    } else if (!isV) {
      q$("#edpair").onchange = async e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        q$("#edmsg").textContent = "사진 넣는 중…";
        try { await insertPhoto(i + 1, f); flush(); pairUp(i); bank.close(); bank = Movie.bank(PH); act = 1; shell(); }   // 뒤에 사진이 끼어들어 번호가 밀리니 사진 창고를 새로
        catch (x) { q$("#edmsg").textContent = "이 사진은 열 수 없어요."; }
      };
      q$("#edjoin").onclick = () => { if (!canJoin) return; flush(); pairUp(i); act = 0; shell(); };
    }
    let capT = 0;
    q$("#edcap").oninput = e => { PH[i].caption = e.target.value; clearTimeout(capT); capT = setTimeout(() => { replan(); draw(); }, 150); later(PH[i]); };
    const go2 = j => { flush(); i = j; act = 0; shell(); };
    q$("#edprev").onclick = () => { if (q > 0) go2(SC[q - 1][0]); };
    q$("#ednext").onclick = () => { if (q < SC.length - 1) go2(SC[q + 1][0]); };
    q$("#eddone").onclick = () => history.back();
    if (q$("#edswap")) q$("#edswap").onchange = async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      q$("#edmsg").textContent = "사진 바꾸는 중…";
      try { const k = cur(); await replacePhoto(k, f); bank.drop(k); shell(); }
      catch (x) { q$("#edmsg").textContent = "이 사진은 열 수 없어요."; }
    };
    q$("#edreset").onclick = () => { PH[cur()].meta = { cx: .5, cy: .5, z: 1, fit: "auto" }; q$("#edzoom").value = 1; syncFit(); draw(); later(); };
    await Movie.fonts(T, sampleText(data()));
    await bank.need(pr ? [i, i + 1] : [i], [i - 1, i + (pr ? 2 : 1)].filter(j => j >= 0 && j < PH.length));
    draw();
  }
  ED = { close(){ flush(); if (PH[i]) savePhoto(PH[i]); bank.close(); box.remove(); document.body.style.overflow = ""; } };   // 닫기는 뒤로 가기(전체 popstate)에서
  shell();
}

let ADDING = false;
const lockPhotos = () => app.querySelectorAll(".photos button, #pick, #next, #prev, .photo-tools button, .photo-tools input").forEach(b => { b.disabled = true; });
async function addPhotos(files){
  if (ADDING) return;
  ADDING = true;
  const arr = [...(files || [])], room = MAX_PHOTOS - PH.length, use = arr.slice(0, Math.max(0, room));
  const vn = use.filter(Movie.isVideo).length;
  let bad = 0, unsaved = 0, vi = 0, vover = 0;
  lockPhotos();
  try {
    for (let i = 0; i < use.length; i++) {
      if (S.step === 2) say(`사진 정리 중… ${i + 1} / ${use.length}`, "#busy");
      try {
        if (Movie.isVideo(use[i])) {   // 영상: 쓸 부분을 고르는 창을 하나씩 열어요 (2차 업데이트)
          vi++;
          if (clipCount() >= MAX_CLIPS) { vover++; continue; }
          const c = await pickClip(use[i], vn > 1 ? `영상 ${vi} / ${vn}` : "");
          if (c && !(await insertClip(PH.length, c))) unsaved++;
        } else if (!(await insertPhoto(PH.length, use[i]))) unsaved++;
      }
      catch (e) { bad++; }
    }
  } finally { ADDING = false; }
  if (S.step !== 2) return;   // 그사이 다른 화면으로 갔으면 그 화면을 덮지 않아요
  stepPhotos();
  const notes = [];
  if (arr.length > use.length) notes.push(`사진은 ${MAX_PHOTOS}장까지 넣을 수 있어요.`);
  if (vover) notes.push(`영상은 ${MAX_CLIPS}개까지 넣을 수 있어요.`);
  if (bad) notes.push(`${bad}장은 열 수 없어서 뺐어요.`);
  if (unsaved) notes.push("휴대폰 저장 공간이 부족해서 일부 사진을 이 폰에 보관하지 못했어요. 새로고침하면 사라질 수 있어요.");
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
        <label class="field"><span>영문 이름 <em>(선택)</em></span><input id="groomEn" value="${esc(S.groomEn)}" placeholder="MINJUN" maxlength="16" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"></label>
        <label class="field"><span>영문 이름 <em>(선택)</em></span><input id="brideEn" value="${esc(S.brideEn)}" placeholder="SEOYEON" maxlength="16" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"></label>
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
// 음악을 풀고(decode) 박자 자리까지 찾아서 AUD에 둬요. 같은 음악을 여러 곳에서 한꺼번에 불러도 한 번만 풀어요
let AUDJOB = { key: "", job: null };
async function setAud(key, buf){
  let beats = null;
  try { beats = await Movie.beats(buf); } catch (e) {}
  AUD = { key, buf, beats, peaks: null };
}
function music(){
  const key = audKey();
  if (!key) return Promise.resolve(null);
  if (AUD.key === key && AUD.buf) return Promise.resolve(AUD.buf);
  if (AUDJOB.key === key && AUDJOB.job) return AUDJOB.job;
  const job = (async () => {
    let ab;
    if (S.track === "mine") ab = MINE.bytes.slice(0);
    else {
      const t = LIST.find(x => x.id === S.track);
      if (!t) return null;
      const r = await fetch(t.file);
      if (!r.ok) throw new Error("음원을 받지 못했어요");
      ab = await r.arrayBuffer();
    }
    const buf = await Movie.decode(ab);
    await setAud(key, buf);
    return buf;
  })();
  AUDJOB = { key, job };
  const clear = () => { if (AUDJOB.job === job) AUDJOB = { key: "", job: null }; };
  job.then(clear, clear);
  return job;
}
function trackRow(id, title, sub, canPlay){
  const on = S.track === id;
  return `<div class="track${on ? " on" : ""}">
    <span class="box">${CHECK}</span>
    <button class="pick" data-t="${id}" aria-pressed="${on}"><b>${esc(title)}</b><span>${esc(sub)}</span></button>
    ${canPlay ? `<button class="play" data-p="${id}" aria-label="미리듣기">${PLAY}</button>` : ""}
  </div>`;
}
// 구간 고르기에 그리는 소리 물결 (곡 전체를 240칸으로)
function peaksOf(buf){
  if (AUD.buf === buf && AUD.peaks) return AUD.peaks;
  const N = 240, L = buf.getChannelData(0), step = Math.max(1, Math.floor(L.length / N)), out = new Float32Array(N);
  let top = 0;
  for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step, e = Math.min(L.length, j + step); j < e; j += 48) { const v = Math.abs(L[j]); if (v > m) m = v; } out[i] = m; if (m > top) top = m; }
  if (top > 0) for (let i = 0; i < N; i++) out[i] /= top;
  if (AUD.buf === buf) AUD.peaks = out;
  return out;
}
function drawWave(cv, buf, a, b, head){
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 300, h = cv.clientHeight || 56;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const x = cv.getContext("2d"), P = peaksOf(buf), D = buf.duration, css = getComputedStyle(cv);
  const on = css.getPropertyValue("--accent").trim() || "#c2185b", off = css.getPropertyValue("--line").trim() || "#ccc", ink = css.getPropertyValue("--ink").trim() || "#111";
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  const bw = w / P.length;
  for (let i = 0; i < P.length; i++) {
    const t = (i + .5) / P.length * D, bh = Math.max(2, P[i] * (h - 6));
    x.fillStyle = t >= a && t <= b ? on : off;
    x.fillRect(i * bw + bw * .15, (h - bh) / 2, bw * .7, bh);
  }
  if (head != null) { x.fillStyle = ink; x.fillRect(Math.max(0, Math.min(w - 2, head / D * w - 1)), 0, 2, h); }
}
const CUT_QUICK = [[0, "곡 전체", ""], [180, "3분", ""], [60, "1분", "인스타용"], [30, "30초", "사진이 적을 때"]];
const quickOf = (a, b, D) => { if (a < .05 && b > D - .05) return "0"; const hit = CUT_QUICK.find(([v]) => v && Math.abs(b - a - v) < .15); return hit ? String(hit[0]) : ""; };
function stepMusic(){
  const buf = curBuf(), c = cutOf(buf), D = buf ? buf.duration : 0, bt = buf ? AUD.beats : null, clear = !!(buf && beatClear());
  app.innerHTML = `${topBar(4)}
    <h2 class="title">배경 음악</h2>
    <p class="sub">휴대폰에 있는 음악 파일을 골라 주세요. 영상 길이는 음악에서 고른 구간 길이에 맞춰지고, 끝은 서서히 작아지며 끝나요.</p>
    <label class="btn main add"><input type="file" id="mine" accept="audio/*,.mp3,.m4a,.wav,.aac">${MINE ? "다른 음악 고르기" : "음악 파일 고르기"}</label>
    <p class="note">mp3·m4a 파일을 넣을 수 있어요. 아이폰은 '파일' 앱에 있는 음악만 고를 수 있어요.</p>
    <p class="busy" id="busy" role="status">${!buf && audKey() ? "음악 확인 중…" : ""}</p>
    <div class="tracks" style="margin-top:14px">
      ${LIST.map(t => trackRow(t.id, t.title, `${t.by} · ${t.mood}`, true)).join("")}
      ${MINE ? trackRow("mine", MINE.name, "내가 고른 음악", true) : ""}
      ${trackRow("", "음악 없이", "소리 없는 영상", false)}
    </div>
    ${buf ? `<h3 class="sec">음악에서 쓸 구간<em>이 길이만큼 영상이 돼요</em></h3>
    <div class="panel cut">
      <canvas id="wave" aria-hidden="true"></canvas>
      <div class="cut-info"><span id="cta"></span><b id="ctl"></b><span id="ctb"></span></div>
      <label class="range"><span>시작</span><input type="range" id="cuta" min="0" max="${D.toFixed(1)}" step="0.1" value="${c.a.toFixed(1)}" aria-label="구간 시작"${D <= CUT_MIN ? " disabled" : ""}></label>
      <label class="range"><span>끝</span><input type="range" id="cutb" min="0" max="${D.toFixed(1)}" step="0.1" value="${c.b.toFixed(1)}" aria-label="구간 끝"${D <= CUT_MIN ? " disabled" : ""}></label>
      ${seg("cutq", CUT_QUICK.map(([v, l, sm]) => [v, l, sm, v > 0 && D < v + .5]), quickOf(c.a, c.b, D))}
      <button class="btn ghost cutplay" id="cutplay">${PLAY}<span>고른 구간 들어 보기</span></button>
    </div>
    <h3 class="sec">박자</h3>
    <div class="panel"><label class="toggle"><input type="checkbox" id="beat"${S.beat !== false && clear ? " checked" : ""}${clear ? "" : " disabled"}>노래 박자에 맞춰 사진 넘기기</label>
      <p class="note" id="beatnote" style="margin:0">${clear ? `이 곡은 1분에 약 ${bt.bpm}박이에요. 사진이 바뀌는 순간을 박자에 맞추고, 넘어가는 시간도 짧게 해요.` : "이 곡은 박자가 뚜렷하지 않아서, 사진을 같은 간격으로 넘겨요."}</p></div>` : ""}
    ${navBar("이전", "다음: 미리 보기")}`;
  const stopCut = () => { if (PREV.dataset.cut) { PREV.pause(); PREV.dataset.cut = ""; } const cb = $("#cutplay"); if (cb) cb.innerHTML = `${PLAY}<span>고른 구간 들어 보기</span>`; };
  app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.track = b.dataset.t; save(); PREV.pause(); PREV.dataset.cut = ""; stepMusic(); });
  app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    const id = b.dataset.p, src = id === "mine" ? mineUrl() : (LIST.find(x => x.id === id) || {}).file;
    if (!src) return;
    const same = PREV.dataset.id === id && !PREV.paused && !PREV.dataset.cut;
    stopCut();
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
      const bytes = await f.arrayBuffer();
      const buf2 = await Movie.decode(bytes.slice(0));
      dropMineUrl(); PREV.removeAttribute("src");
      MINE = { name: f.name.replace(/\.[^.]+$/, ""), bytes, type: f.type || "audio/mpeg" };
      await DB.set("music", MINE);
      await setAud(`mine:${MINE.name}:${bytes.byteLength}`, buf2);
      S.track = "mine"; S.cut = null; save(); PREV.pause(); PREV.dataset.id = ""; PREV.dataset.cut = "";
      stepMusic();
      say(`${lenKo(buf2.duration)}짜리 음악을 넣었어요.`, "#busy");
    } catch (err) { say("이 파일은 열 수 없어요. mp3나 m4a 파일로 넣어 주세요.", "#busy"); }
  };
  if (buf) {
    const A = $("#cuta"), B = $("#cutb"), wave = $("#wave");
    let a = c.a, b = c.b;
    const paint = () => {
      $("#cta").textContent = mmss(a); $("#ctb").textContent = mmss(b); $("#ctl").textContent = lenKo(b - a);
      drawWave(wave, buf, a, b, PREV.dataset.cut && !PREV.paused ? PREV.currentTime : null);
      const qk = quickOf(a, b, D);
      app.querySelectorAll("#cutq button").forEach(x => x.classList.toggle("on", x.dataset.v === qk));
    };
    const commit = () => { S.cut = a < .05 && b > D - .05 ? null : { key: AUD.key, a: +a.toFixed(2), b: +b.toFixed(2) }; save(); };
    A.oninput = () => { stopCut(); a = Math.max(0, Math.min(+A.value, D - CUT_MIN)); if (b - a < CUT_MIN) { b = Math.min(D, a + CUT_MIN); B.value = b; } A.value = a; paint(); };
    B.oninput = () => { stopCut(); b = Math.min(D, Math.max(+B.value, CUT_MIN)); if (b - a < CUT_MIN) { a = Math.max(0, b - CUT_MIN); A.value = a; } B.value = b; paint(); };
    A.onchange = B.onchange = commit;
    app.querySelectorAll("#cutq button").forEach(x => x.onclick = () => {
      if (x.disabled) return;
      const len = +x.dataset.v;
      stopCut();
      if (!len) { a = 0; b = D; } else { if (a + len > D) a = Math.max(0, D - len); b = Math.min(D, a + len); }
      A.value = a; B.value = b; commit(); paint();
    });
    $("#cutplay").onclick = () => {
      if (PREV.dataset.cut && !PREV.paused) { stopCut(); paint(); return; }
      const id = S.track, src = id === "mine" ? mineUrl() : (LIST.find(x => x.id === id) || {}).file;
      if (!src) return;
      app.querySelectorAll("[data-p]").forEach(x => x.innerHTML = PLAY);
      if (PREV.dataset.id !== id) { PREV.src = src; PREV.dataset.id = id; }
      PREV.dataset.cut = "1";
      const from = a, start = () => { PREV.onloadedmetadata = null; try { PREV.currentTime = from; } catch (x) {} PREV.play().then(() => { const cb = $("#cutplay"); if (cb) cb.innerHTML = `${PAUSE}<span>멈추기</span>`; }).catch(() => { PREV.dataset.cut = ""; say("미리듣기를 열지 못했어요.", "#busy"); }); };
      if (PREV.readyState >= 1) start(); else { PREV.onloadedmetadata = start; PREV.load(); }
    };
    PREV.ontimeupdate = () => {   // 고른 구간 끝에서 멈추고, 물결 위에 지금 자리를 보여 줘요
      if (!PREV.dataset.cut || S.step !== 4 || !wave.isConnected) return;
      if (PREV.currentTime >= b || PREV.ended) stopCut();
      paint();
    };
    $("#beat").onchange = e => { S.beat = e.target.checked; save(); };
    paint();
  } else if (audKey()) {   // 새로 열었거나 다른 음악을 고른 직후: 음악을 풀고 나서 구간·박자 칸을 보여 줘요
    const key = audKey();
    music().then(got => { if (S.step === 4 && audKey() === key && got && !$("#wave") && $("#mine")) stepMusic(); },
      () => { if (S.step === 4 && audKey() === key) say("이 음악을 열지 못했어요. 다른 파일을 골라 주세요.", "#busy"); });
  }
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
    <p class="note">만드는 동안 화면을 켠 채로 이 화면에 있어 주세요. 다른 앱에 다녀오면 멈출 수 있어요.</p>`;
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
  stopAll();
  const job = ++previewJob;
  const stage = $("#stage"), cv = $("#pv");
  if (!stage || !cv) return;
  const alive = () => job === previewJob && S.step === 5 && cv.isConnected;   // 준비하는 사이 다른 화면으로 갔거나 다시 준비하면 그만
  const T = tpl(), d = data(), [W, H] = Movie.size(S.ratio, S.q), tall = H > W;
  stage.classList.toggle("tall", tall); stage.classList.remove("playing");
  $("#play").innerHTML = PLAY;
  $("#make").disabled = true;
  say("미리 보기 준비 중…");
  let bank = null;
  try {
    let buf = null;
    try { buf = await music(); } catch (e) { say("음악을 열지 못했어요. 음악 없이 만들어져요."); }
    if (!alive()) return;
    const P = planNow(T, d, buf), cut = cutOf(buf), part = cut && !cut.whole ? { a: cut.a, b: cut.b } : undefined;   // part: 음악에서 쓸 구간 (곡 전체면 없음)
    const dpr = Math.min(2, window.devicePixelRatio || 1), cssW = stage.clientWidth || 400;
    cv.width = Math.round(Math.min(W, cssW * dpr)); cv.height = Math.round(cv.width * H / W);
    await Movie.fonts(T, sampleText(d));
    if (!alive()) return;
    bank = Movie.bank(PH);
    const mixed = await Movie.mix(buf, P.total, part);
    if (!alive()) { bank.close(); return; }
    const M = Movie.scene(P, W, H, T, d, bank);
    CUR = { T, d, P, buf, bank, W, H, cut: part, M };
    const start = RESUME_AT != null ? Math.min(RESUME_AT, P.total - .1) : Math.min(3.2, P.total / 2);
    RESUME_AT = null;
    await bank.need(Movie.photosAt(P, start, T.xf).now);
    if (!alive()) return;
    PLAYER = Movie.player(cv, M, mixed);
    PLAYER.seek(start);   // 보이는 장면 = 재생이 시작되는 장면
    const seek = $("#seek"), curEl = $("#cur");
    $("#len").textContent = mmss(P.total);
    const sceneBtn = $("#sceneEdit");
    const scene = t => {   // 멈춰 있고 사진 장면이면 그 사진 편집
      const g = Movie.segAt(P, t), ok = !PLAYER.playing && g && g.kind === "photo";
      sceneBtn.disabled = !ok;
      sceneBtn.textContent = ok ? `${g.j != null ? `${g.i + 1}·${g.j + 1}` : g.i + 1}번 ${g.vid ? "영상" : "사진"} 편집하기` : (PLAYER.playing ? "멈추면 그 장면의 사진을 편집할 수 있어요" : "사진 장면에서 멈추면 편집할 수 있어요");
      sceneBtn.dataset.i = ok ? g.i : "";
    };
    const tick = t => { curEl.textContent = mmss(t); if (!seek.matches(":active")) seek.value = Math.round(t / P.total * 1000); scene(t); };
    PLAYER.ontick = tick;
    tick(start);
    sceneBtn.onclick = () => { if (sceneBtn.dataset.i === "" || !PLAYER) return; RESUME_AT = PLAYER.time(); PLAYER.pause(); editPhoto(+sceneBtn.dataset.i); };
    PLAYER.onend = () => { stage.classList.remove("playing"); $("#play").innerHTML = PLAY; };
    seek.oninput = () => { if (PLAYER) PLAYER.seek(seek.value / 1000 * P.total); };
    const toggle = () => {
      if (!PLAYER) return;
      if (PLAYER.playing) { PLAYER.pause(); stage.classList.remove("playing"); $("#play").innerHTML = PLAY; scene(PLAYER.time()); }
      else { PLAYER.play(); stage.classList.add("playing"); $("#play").innerHTML = PAUSE; }
    };
    $("#play").onclick = toggle; cv.onclick = toggle;
    const mb = Math.round((Movie.bitrate(S.q, P.total) + 192000) * P.total / 8 / 1e6);
    const two = P.sc != null && P.sc < PH.length;   // 두 장 장면이 있으면 장면 수도
    const nv = clipCount(), mlen = cut ? cut.b - cut.a : 0;
    $("#facts").innerHTML = `<b>${lenKo(P.total)}</b><span>${nv ? `사진 ${PH.length - nv}장 · 영상 ${nv}개` : `사진 ${PH.length}장`}${two ? ` · 장면 ${P.sc}개` : ""} · 한 ${two ? "장면" : "장"}에 약 ${P.avg ? `${(P.fast || P.avg).toFixed(1)}~` : ""}${P.per.toFixed(1)}초</span><span>${buf ? `음악 ${lenKo(mlen)}${part ? " (고른 구간)" : ""}` : "음악 없음"}</span>${P.bpm ? `<span>박자에 맞춤 (1분에 ${P.bpm}박)</span>` : ""}<span>파일 약 ${mb}MB</span>`;
    const crash = lastCrash();
    say(crash ? "지난번에 영상을 만들다 멈추고 페이지가 다시 열렸어요. 화면을 켠 채로 다시 만들어 주세요. 계속 멈추면 720p로 바꾸거나 컴퓨터에서 만들어 주세요."
      : P.total > 300 ? (mlen > 300 ? "영상이 5분을 넘어요. 식전영상은 3~5분이 알맞고, 길면 하객이 지루해할 수 있어요. 음악 단계에서 쓸 구간을 줄여 보세요." : "영상이 5분을 넘어요. 식전영상은 3~5분이 알맞고, 길면 하객이 지루해할 수 있어요. 사진을 줄여 보세요.")
      : buf && mlen < P.total - .5 ? (part ? "고른 구간보다 사진이 많아서 음악이 한 번 더 이어져요. 사진을 줄이거나 음악 구간을 늘리면 맞출 수 있어요." : "사진이 많아서 음악이 한 번 더 이어져요. 사진을 줄이면 음악 한 곡에 맞출 수 있어요.")
      : P.fast ? `고른 구간에 맞추느라, 글이 없는 사진은 한 장에 약 ${P.fast.toFixed(1)}초씩 빠르게 넘어가요. 천천히 넘기려면 음악 구간을 늘리거나 사진을 줄여 주세요.` : "");
    $("#make").disabled = !PH.length || !!Movie.inApp();
    if (!PH.length) say("사진을 먼저 넣어 주세요.");
  } catch (e) {
    if (bank && !(CUR && CUR.bank === bank)) bank.close();
    if (!alive()) return;
    say(e && e.code === "photo" ? `${e.photo}번 사진을 읽지 못했어요. 사진 목록에서 그 사진을 눌러 '사진 바꾸기'로 다시 넣어 주세요.` : "미리 보기를 준비하지 못했어요. 새로고침해 주세요.");
    $("#make").disabled = true;
  }
}
// 파일 이름에 예식 날짜와 이름 (식장에서 여러 파일 사이에서 찾기 쉽게)
function fileName(){
  const who = [S.groom.trim(), S.bride.trim()].filter(Boolean).join("_").replace(/[\\/:*?"<>|]/g, "");
  return ["식전영상", (S.date || "").replace(/-/g, ""), who].filter(Boolean).join("_") + ".mp4";
}
// 만들다가 페이지가 통째로 다시 열리면(휴대폰 메모리 부족 등) 다음에 알 수 있게 표시를 남겨 둬요
const RENDER_KEY = "nowShowing.rendering";
function markRender(info){ try { localStorage.setItem(RENDER_KEY, JSON.stringify({ t: Date.now(), store: (info && info.store) || "", at: (info && info.at) || "", q: S.q })); } catch (e) {} }
function clearRender(){ try { localStorage.removeItem(RENDER_KEY); } catch (e) {} }
function lastCrash(){ try { const v = JSON.parse(localStorage.getItem(RENDER_KEY)); return v && Date.now() - v.t < 6 * 3600e3 ? v : null; } catch (e) { return null; } }
const infoLines = info => Object.entries(info || {}).filter(([k]) => k !== "poster").map(([k, v]) => `${k}: ${v}`).join("\n");
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
  let note = "";
  box.querySelector("#mkstop").onclick = () => { job.stop = true; st.textContent = "멈추는 중…"; };
  return {
    progress(p){
      bar.value = p.done;
      if (p.finishing) st.textContent = "마무리 중…";
      else {
        const left = p.done > .03 ? Math.max(0, p.elapsed / p.done - p.elapsed) : null;
        st.textContent = `${note}만드는 중 ${Math.floor(p.done * 100)}%${left != null ? ` · 약 ${left > 60 ? Math.ceil(left / 60) + "분" : Math.ceil(left) + "초"} 남음` : ""}`;
      }
      if (p.canvas) cv.getContext("2d").drawImage(p.canvas, 0, 0, cv.width, cv.height);
    },
    hint(){ box.querySelector(".warn").textContent = "만드는 중에는 뒤로 갈 수 없어요. 멈추려면 '그만 만들기'를 눌러 주세요."; },
    retry(){ note = "다시 "; bar.value = 0; st.textContent = "멈춰서 다른 방식으로 다시 만들고 있어요…"; },
    fail(e){
      const msg = e && e.code === "size" ? e.message + ". 화질을 낮춰서 다시 만들어 주세요."
        : e && e.code === "stall" ? "이 휴대폰에서 영상 만들기가 계속 멈춰요. 화질을 720p로 바꾸거나, 컴퓨터에서 만들어 주세요."
        : e && e.code === "photo" ? `${e.photo}번 사진을 읽지 못했어요. 사진 목록에서 그 사진을 눌러 '사진 바꾸기'로 다시 넣어 주세요.`
        : "영상을 만들다 멈췄어요. 화면을 켠 채로 이 화면에서 다시 만들어 주세요.";
      const rep = [(e && e.message) || String(e), infoLines(e && e.info), navigator.userAgent].filter(Boolean).join("\n");
      box.querySelector(".in").innerHTML = `<p class="err">${esc(msg)}</p>${DEBUG ? `<pre class="report" id="failrep">${esc(rep)}</pre><button class="text-btn" id="failcopy" style="color:#bbb;align-self:center">결과 복사하기</button>` : ""}<button class="btn main" id="mkok">확인</button>`;
      if (box.querySelector("#failcopy")) box.querySelector("#failcopy").onclick = async () => { try { await navigator.clipboard.writeText(rep); box.querySelector("#failcopy").textContent = "복사했어요"; } catch (x) {} };
      box.querySelector("#mkok").onclick = () => box.remove();
    },
    close(){ box.remove(); }
  };
}
async function makeIt(){
  // 화면 꺼짐 방지는 누른 바로 그 순간에 요청해요 (사파리는 누른 직후에만 허락해 줄 수 있어요)
  const wake = navigator.wakeLock ? navigator.wakeLock.request("screen").catch(() => null) : null;
  const release = () => { [wake, job && job.wakeNow].forEach(x => Promise.resolve(x).then(w => w && !w.released && w.release()).catch(() => {})); };
  let job = null;
  if (!CUR || !PH.length) { release(); return; }
  if (Movie.inApp()) { release(); say("앱 안에서는 저장할 수 없어요. 사파리·크롬에서 열어 주세요."); return; }
  const { T, d, P, buf, W, H, cut } = CUR;
  stopAll();
  if (RESULT) { URL.revokeObjectURL(RESULT.url); if (RESULT.info.poster) URL.revokeObjectURL(RESULT.info.poster); RESULT = null; }
  // 지난번에 만들다 페이지가 다시 열렸으면(메모리 부족일 수 있어요) 이번엔 메모리를 덜 쓰는 쪽으로
  const crash = lastCrash();
  job = { P, tpl: T, d, bank: Movie.bank(PH), ratio: S.ratio, q: S.q, music: buf, cut, name: fileName(), sample: sampleText(d), stop: false, wake,
    store: crash && crash.store === "메모리" ? "disk" : undefined, onStage: (s, info) => markRender(info), simStall: DEBUG && QS.has("stalltest") };
  markRender({});
  const ov = overlay(job, W, H);
  MAKING = ov;
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      job.tries = attempt; job.stop = false;
      try {
        const { file, info } = await Movie.make(job, p => ov.progress(p));
        if (crash) info.before = `지난번 멈춤: ${crash.store || "?"} ${crash.at || ""}`;
        clearRender(); ov.close();
        RESULT = { file, info, url: URL.createObjectURL(file) };
        S.step = 6; history.pushState({ step: 6 }, "");
        render(); window.scrollTo(0, 0);
        return;
      } catch (e) {
        if (e && e.code === "cancel") { clearRender(); ov.close(); preview(); return; }
        // 멈췄으면 한 번은 다른 저장 방식으로 다시 (저장 공간 ↔ 메모리)
        if (e && (e.code === "stall" || e.code === "photo") && attempt === 1 && !job.stop) {
          job.store = e.info && e.info.store === "휴대폰 저장 공간" ? "memory" : "disk";
          job.bank.close(); job.bank = Movie.bank(PH);
          ov.retry();
          continue;
        }
        clearRender(); ov.fail(e); preview(); return;
      }
    }
  } finally { MAKING = null; job.bank.close(); release(); }
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
    <div class="btns" style="margin-top:18px">
      <button class="btn ghost" id="again">설정 바꿔서 다시 만들기</button>
      ${siteLink("flow", "btn ghost", "결혼식 식순표 만들기")}
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
    </div>
    ${DEBUG ? `<p class="note" style="margin-top:18px">시험용 정보예요. 주소에 debug가 있을 때만 보여요.</p><pre class="report" id="report">${esc([navigator.userAgent, infoLines(info)].join("\n"))}</pre><button class="text-btn btn-link" id="copyrep">결과 복사하기</button>` : ""}
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
  const hs = history.state;
  let step;
  if (hs && hs.step != null) {   // 새로고침: 화면 기록이 이미 있어요 → 그대로 두고 그 화면만 다시 그려요
    step = Math.max(0, Math.min(5, hs.step));   // 완성 화면(6)은 영상이 사라져서 미리 보기로
    if (step > 2 && !PH.length) step = 2;
    if (step !== hs.step || hs.ed) history.replaceState({ step }, "");
  } else {                        // 처음 열기: 이어서 만들던 단계까지 기록을 쌓아 뒤로 가기가 한 화면씩 되게
    step = Math.max(0, Math.min(5, S.step || 0));
    if (step > 2 && !PH.length) step = 2;
    history.replaceState({ step: 0 }, "");
    for (let i = 1; i <= step; i++) history.pushState({ step: i }, "");
  }
  if (Movie.inApp() && step > 0) { step = 0; history.replaceState({ step: 0 }, ""); }   // 인스타·카톡 안: 첫 화면 안내에서 멈춰요
  S.step = step; save();
  render();
  Movie.cleanup();   // 지난번에 만든 영상 파일은 휴대폰 저장 공간에서 지워요
})();
