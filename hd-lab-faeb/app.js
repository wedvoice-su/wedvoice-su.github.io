// 영상 고화질로 바꾸기 시험 페이지 (2026-11-26)
// 영상을 고르고 → 바꿀 구간(1 · 3 · 5초)과 AI에 넣는 크기를 정하고 → 한 장 먼저 바꿔 보고(걸리는 시간도 재요) → 구간 전체를 장면마다 AI로 4배 키워 새 영상으로.
// 바꾸기 전(그냥 키운 것)과 바꾼 뒤를 번갈아 보고, 숫자 · 저장 · 기록. 식전영상(업그레이드) 사이트에 넣기 전에 휴대폰에서 속도와 모양을 보려는 페이지예요.
// 영상은 휴대폰 밖으로 나가지 않아요. 밖에서 받는 것은 AI 모델(같은 폴더 model/)과 계산 도구(onnxruntime-web)뿐이에요.
// 영상을 풀고 다시 압축하는 도구는 식전영상(업그레이드) 사이트의 것을 그대로 빌려 써요 (../opening-scene-plus/lib/mediabunny.min.mjs — 읽기만 해요)

const FPS = 30, SCALE = 4;
const OUT_MAX = 1920, BR = 8e6;                 // 만드는 영상: 긴 쪽 1920px 이하, 8Mbps (식전영상 사이트가 폰 영상을 보관하는 값과 같아요)
const LENS = [1, 3, 5];                          // 바꿀 길이(초)
const QS = new URLSearchParams(location.search);
const ENGINE = QS.has("cpu") ? "cpu" : "auto";  // ?cpu: 그래픽 칩 없이(WASM) 돌려 보기
const PREC = QS.get("prec") || "auto";          // ?prec=fp32 · ?prec=fp16: 모델 판을 정해서 돌려 보기
const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const GAP = LOCAL ? Math.max(0, +QS.get("gap") || 0) : 0;   // 내 컴퓨터에서 시험할 때만: 장면 사이에 쉬는 시간(ms)
const SEEK = QS.has("seek");                    // ?seek: 영상을 화면에서 옮겨 가며 푸는 방식(한 장씩 정확히 못 푸는 형식일 때 쓰는 길)을 일부러 써 보기

const $ = id => document.getElementById(id);
const S = { file: null, name: "", path: "", input: null, vt: null, first: 0, sw: 0, sh: 0, dur: 0, start: 0, len: 3, cap: 0,
            mix: 1, info: null, still: null, res: null, busy: false, cancel: false, pvOk: false };
let worker = null, pend = null, mbJob = null, urls = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const even = v => Math.max(2, Math.round(v / 2) * 2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clock = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
const pos = t => { t = Math.max(0, Math.round(t * 10) / 10); return Math.floor(t / 60) + ":" + (t % 60).toFixed(1).padStart(4, "0"); };
const dur = t => { t = Math.max(1, Math.round(t)); const m = Math.floor(t / 60), s = t % 60; return m ? (s ? `${m}분 ${s}초` : `${m}분`) : `${s}초`; };
const secs = ms => (ms < 9950 ? (ms / 1000).toFixed(ms < 995 ? 2 : 1) : String(Math.round(ms / 1000))) + "초";
const log = (line, bad) => { const d = document.createElement("div"); d.textContent = line; if (bad) d.className = "bad"; $("log").appendChild(d); $("log").scrollTop = 1e9; };
const mobile = () => { const u = navigator.userAgent; return /iPhone|iPad|iPod|Android/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); };
const inApp = () => { const u = navigator.userAgent; return /Instagram/i.test(u) ? "인스타그램" : /KAKAOTALK/i.test(u) ? "카카오톡" : /NAVER\(inapp/i.test(u) ? "네이버" : /FBAN|FBAV/i.test(u) ? "페이스북" : / Line\//i.test(u) ? "라인" : /; wv\)/.test(u) ? "앱" : ""; };
const MB = () => mbJob || (mbJob = import("../opening-scene-plus/lib/mediabunny.min.mjs").catch(e => { mbJob = null; throw e; }));
const show = (id, on) => { $(id).hidden = !on; };
const fail = (id, text) => { $(id).textContent = text || ""; $(id).hidden = !text; };
const DEV = mobile() ? "이 휴대폰" : "이 컴퓨터";
const EP = { webgpu: "그래픽 칩(WebGPU)", wasm: "그래픽 칩 없이(WASM)" }, PR = { fp16: "절반 정밀도", fp32: "온 정밀도" };

// ---------- 기기 정보 ----------
(async function deviceInfo() {
  let gpu = "없음", f16 = "";
  if (navigator.gpu) {
    try { const a = await navigator.gpu.requestAdapter(); gpu = a ? "있음" : "있지만 못 씀"; if (a) f16 = a.features.has("shader-f16") ? " · 절반 정밀도 됨" : " · 절반 정밀도 안 됨"; }
    catch (e) { gpu = "있지만 못 씀"; }
  }
  log(`[기기] 그래픽 칩(WebGPU) ${gpu}${f16} · 코어 ${navigator.hardwareConcurrency || "?"} · 메모리 ${navigator.deviceMemory || "?"}GB${inApp() ? " · " + inApp() + " 안 브라우저" : ""}`);
  log(`[기기] ${navigator.userAgent}`);
  let h = "";
  if (gpu !== "있음" || ENGINE === "cpu") h += `<div class="box warn"><b>이 브라우저에서는 아주 느려요</b><p>${ENGINE === "cpu" ? "그래픽 칩 없이 돌리는 시험 주소(?cpu)로 열었어요." : "그래픽 칩으로 계산하는 기능(WebGPU)이 없어요."} 한 장에 수십 초가 걸릴 수 있어요. 한 장 먼저 해 보기까지만 해 보세요.${ENGINE === "cpu" ? "" : " 아이폰은 최신 사파리, 갤럭시는 최신 크롬에서 열면 빨라요."}</p></div>`;
  if (inApp()) h += `<div class="box warn"><b>${esc(inApp())} 안에서 열려 있어요</b><p>느리거나 저장이 안 될 수 있어요. 사파리나 크롬에서 열어 주세요.</p></div>`;
  $("topgate").innerHTML = h;
})();

// ---------- 보는 칸: 전체 보기 ↔ 크게 보기(끌어서 옮기기) ----------
function viewer(box) {
  const pan = box.querySelector(".pan");
  let z = 1, tx = 0, ty = 0, drag = null;
  const apply = () => {
    const W = box.clientWidth, H = box.clientHeight;
    tx = Math.min(0, Math.max(-(z - 1) * W, tx)); ty = Math.min(0, Math.max(-(z - 1) * H, ty));
    pan.style.transform = z === 1 ? "" : `translate(${tx}px, ${ty}px) scale(${z})`;
    box.classList.toggle("zoom", z > 1);
  };
  box.addEventListener("pointerdown", e => { if (z === 1) return; drag = { x: e.clientX, y: e.clientY, tx, ty }; try { box.setPointerCapture(e.pointerId); } catch (_) {} });
  box.addEventListener("pointermove", e => { if (!drag) return; tx = drag.tx + e.clientX - drag.x; ty = drag.ty + e.clientY - drag.y; apply(); });
  const up = () => { drag = null; };
  box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
  return { set(nz) { const W = box.clientWidth, H = box.clientHeight; z = nz; tx = -(z - 1) * W / 2; ty = -(z - 1) * H / 2; apply(); } };
}
// 둘 중 하나 고르기 (바꾸기 전 · 바꾼 뒤, 전체 · 크게, 세기, 길이)
function seg(id, attr, fn) {
  $(id).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    for (const x of $(id).children) { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); }
    fn(b.dataset[attr]);
  });
}
const pick = (id, attr, v) => { for (const x of $(id).children) { const on = x.dataset[attr] === String(v); x.classList.toggle("on", on); x.setAttribute("aria-checked", on); } };
const viewS = viewer($("viewS")), viewV = viewer($("viewV"));
seg("abS", "v", v => { show("cvA", v === "a"); show("cvB", v === "b"); $("capS").textContent = v === "a" ? "바꾸기 전" : "바꾼 뒤"; });
seg("zoomS", "z", z => viewS.set(+z));
seg("zoomV", "z", z => viewV.set(+z));
seg("mix", "m", m => { S.mix = +m; remix(); if (S.res) { S.res = null; show("result", false); } paintGo(); });   // 세기를 바꾸면 만들어 둔 영상은 지워요 (그 세기로 다시 만들어야 하니까)
seg("abV", "v", v => {
  const from = v === "a" ? $("vB") : $("vA"), to = v === "a" ? $("vA") : $("vB");
  try { to.currentTime = from.currentTime; } catch (e) {}
  to.hidden = false; from.hidden = true;
  to.play().catch(() => {}); from.pause();
  $("capV").textContent = v === "a" ? "바꾸기 전" : "바꾼 뒤";
});

// ---------- 1. 영상 고르기 ----------
$("pick").onclick = () => { if (!S.busy) $("file").click(); };
$("file").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (f) await openFile(f); };

function reset() {
  stale();
  try { if (S.input) S.input.dispose(); } catch (e) {}
  urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
  Object.assign(S, { file: null, input: null, vt: null, path: "", first: 0, sw: 0, sh: 0, dur: 0, start: 0, pvOk: false });
  ["s2", "s3", "s4", "fileinfo"].forEach(id => show(id, false));
  fail("err1", "");
}
// 바꾼 결과를 지워요 (구간 · 크기를 바꾸면 다시 해야 하니까)
function stale() {
  S.still = null; S.res = null;
  show("still", false); show("result", false); show("s4", false);
  fail("err3", ""); fail("err4", "");
  $("vA").removeAttribute("src"); $("vB").removeAttribute("src");
  paintOne();
}
const meta = v => new Promise(res => {
  if (v.readyState >= 1) return res(true);
  const to = setTimeout(() => res(false), 8000);
  v.onloadedmetadata = () => { clearTimeout(to); res(true); };
  v.onerror = () => { clearTimeout(to); res(false); };
});
async function openFile(f) {
  reset();
  S.file = f; S.name = (f.name || "영상").replace(/\.[^.]+$/, "");
  const pv = $("pv"), url = URL.createObjectURL(f); urls.push(url);
  pv.src = url; pv.load();
  S.pvOk = await meta(pv) && pv.videoWidth > 0;
  if (S.pvOk) { try { await pv.play(); } catch (e) {} pv.pause(); }   // 아이폰은 한 번 재생을 시작해야 장면을 읽어 와요
  let why = "";
  try {
    const mb = await MB();
    const input = new mb.Input({ source: new mb.BlobSource(f), formats: mb.ALL_FORMATS });
    const vt = await input.getPrimaryVideoTrack();
    if (SEEK) { why = "시험: 화면에서 옮겨 가며"; try { input.dispose(); } catch (e) {} }
    else if (vt && await vt.canDecode()) {
      S.input = input; S.vt = vt; S.path = "mb";
      S.sw = await vt.getDisplayWidth(); S.sh = await vt.getDisplayHeight();
      S.first = await vt.getFirstTimestamp(); S.dur = (await vt.computeDuration()) - S.first;
    } else { why = vt ? "이 영상 형식은 바로 풀 수 없어요" : "영상이 없는 파일이에요"; try { input.dispose(); } catch (e) {} }
  } catch (e) { why = String(e && e.message || e).slice(0, 160); }
  if (!S.path && S.pvOk && isFinite(pv.duration)) { S.path = "video"; S.sw = pv.videoWidth; S.sh = pv.videoHeight; S.dur = pv.duration; }
  if (!S.path || !S.sw || !S.sh || !(S.dur >= .3)) {
    log(`[영상] ${f.name} · 열지 못함 (${why || "알 수 없음"})`, true);
    fail("err1", S.path && S.dur < .3 ? "영상이 너무 짧아요. 0.3초보다 긴 영상을 골라 주세요." : "이 영상은 열 수 없어요. 다른 영상으로 해 보세요.");
    S.path = ""; return;
  }
  log(`[영상] ${f.name} · ${S.sw}×${S.sh} · ${S.dur.toFixed(1)}초 · ${(f.size / 1048576).toFixed(1)}MB · 푸는 방식 ${S.path === "mb" ? "한 장씩 정확히" : "화면에서 옮겨 가며" + (why ? ` (${why})` : "")}`);
  $("fileinfo").innerHTML = `<b>${esc(f.name || "영상")}</b><span>${S.sw}×${S.sh} · ${dur(S.dur)}</span>`;
  show("fileinfo", true);
  $("pick").textContent = "다른 영상 고르기"; $("pick").className = "btn line";
  show("pickNote", false);
  S.len = [...LENS].reverse().find(n => n <= S.dur + .05) || 1; if (S.len > 3) S.len = 3;
  S.start = 0;
  const long = Math.max(S.sw, S.sh);
  S.cap = long <= 640 ? long : 480;
  $("pvBox").classList.toggle("tall", S.sh > S.sw); $("viewS").classList.toggle("tall", S.sh > S.sw); $("viewV").classList.toggle("tall", S.sh > S.sw);
  show("pvBox", S.pvOk); show("playSeg", S.pvOk);
  paintPick();
  show("s2", true); show("s3", true);
  $("s2").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- 2. 어디를 바꿀까요? ----------
// AI에 넣는 크기(긴 쪽 cap) → 넣는 크기 iw×ih, 만드는 영상 크기 ow×oh
function dims(cap) {
  const long = Math.max(S.sw, S.sh), k = Math.min(1, cap / long);
  const iw = Math.max(8, Math.round(S.sw * k)), ih = Math.max(8, Math.round(S.sh * k));
  const f = Math.min(1, OUT_MAX / (Math.max(iw, ih) * SCALE));
  return { iw, ih, ow: even(iw * SCALE * f), oh: even(ih * SCALE * f) };
}
function paintPick() {
  const long = Math.max(S.sw, S.sh), span = Math.min(S.len, S.dur);
  $("lens").innerHTML = LENS.map(n => `<button data-n="${n}" role="radio" aria-checked="${n === S.len}" class="${n === S.len ? "on" : ""}"${n > S.dur + .05 && n !== LENS[0] ? " disabled" : ""}>${n}초<small>${n > S.dur + .05 && n !== LENS[0] ? "영상이 더 짧아요" : Math.round(Math.min(n, S.dur) * FPS) + "장"}</small></button>`).join("");
  const st = $("start"); st.max = Math.max(0, Math.floor((S.dur - span) * 10) / 10); st.value = S.start = Math.min(S.start, +st.max);
  const whole = +st.max <= 0;   // 영상이 고른 길이보다 짧거나 같으면 옮길 데가 없어요 → 처음부터 끝까지
  st.hidden = whole; document.querySelector(".nudge").hidden = whole;
  $("startLab").textContent = whole ? "영상 처음부터 끝까지 바꿔요" : "어디부터 바꿀까요?";
  $("startTxt").textContent = `${pos(S.start)} ~ ${pos(S.start + span)}`;
  const caps = [];
  caps.push(long <= 960 ? { cap: long, t: "원래 크기 그대로 넣기" } : { cap: 960, t: "긴 쪽 960으로 줄여서 넣기" });
  if (long > 640) caps.push({ cap: 640, t: "긴 쪽 640으로 줄여서 넣기" });
  if (long > 480) caps.push({ cap: 480, t: "긴 쪽 480으로 줄여서 넣기" });
  const px = c => { const d = dims(c); return d.iw * d.ih; }, least = px(caps[caps.length - 1].cap);
  $("sizes").innerHTML = caps.map((c, i) => {
    const d = dims(c.cap), r = px(c.cap) / least, on = c.cap === S.cap;
    return `<label class="opt${on ? " on" : ""}"><input type="radio" name="cap" value="${c.cap}"${on ? " checked" : ""}><div><span>${c.t}</span><small>${d.iw}×${d.ih} → ${d.ow}×${d.oh}${caps.length > 1 ? (i === caps.length - 1 ? " · 가장 빨라요" : ` · 시간이 약 ${r.toFixed(1)}배`) : ""}</small></div></label>`;
  }).join("");
  $("sizeNote").textContent = long > 960 ? `이 영상은 이미 커요 (${S.sw}×${S.sh}). 일부러 작게 줄인 다음 AI로 다시 키워서, 작은 영상이었다면 어떻게 보일지 흉내 내요.`
    : long > 480 ? "줄여서 넣으면 빨라지지만, 원래 영상의 또렷함을 조금 버리게 돼요." : "AI가 가로 · 세로를 4배로 키워요.";
  seekPv();
}
function seekPv() { if (!S.pvOk) return; const pv = $("pv"); pv.pause(); try { pv.currentTime = Math.min(Math.max(0, S.dur - .05), S.start + .001); } catch (e) {} }
$("lens").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled || S.busy) return; S.len = +b.dataset.n; paintPick(); if (S.res) { S.res = null; show("result", false); } paintEst(); paintGo(); });
$("start").oninput = e => { if (S.busy) { e.target.value = S.start; return; } S.start = +e.target.value; $("startTxt").textContent = `${pos(S.start)} ~ ${pos(S.start + Math.min(S.len, S.dur))}`; seekPv(); stale(); };
document.querySelector(".nudge").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || S.busy) return;
  const st = $("start"); S.start = Math.min(+st.max, Math.max(0, Math.round((S.start + +b.dataset.d) * 10) / 10)); st.value = S.start;
  $("startTxt").textContent = `${pos(S.start)} ~ ${pos(S.start + Math.min(S.len, S.dur))}`; seekPv(); stale();
});
$("sizes").addEventListener("change", e => { if (S.busy) { paintPick(); return; } S.cap = +e.target.value; paintPick(); stale(); });
$("playSeg").onclick = async () => {
  const pv = $("pv"), end = Math.min(S.dur, S.start + S.len);
  if (!pv.paused) { pv.pause(); return; }
  try { pv.currentTime = S.start; await pv.play(); } catch (e) { return; }
  const tick = () => { if (pv.paused) return; if (pv.currentTime >= end) { pv.pause(); seekPv(); return; } requestAnimationFrame(tick); };
  tick();
};

// ---------- AI (워커) ----------
function ask(msg, transfer, onstep, wait) {
  return new Promise((res, rej) => {
    try { worker = worker || new Worker("worker.js"); } catch (e) { rej(e); return; }
    const id = Date.now() + "-" + Math.random();
    let dog = 0;
    const end = () => { clearTimeout(dog); pend = null; };
    const die = err => { end(); try { worker.terminate(); } catch (_) {} worker = null; S.info = null; rej(err); };
    const watch = () => { clearTimeout(dog); dog = setTimeout(() => die(new Error("너무 오래 걸려요")), wait || 240000); };
    pend = { die };
    worker.onmessage = ev => {
      const d = ev.data; if (d.id !== id) return;
      if (d.type === "step" || d.type === "tile") { watch(); if (onstep) onstep(d); return; }
      end();
      if (d.type === "fail") rej(Object.assign(new Error(d.text || "fail"), { phase: d.phase })); else res(d);
    };
    worker.onerror = ev => die(new Error((ev && ev.message) || "워커를 열지 못했어요"));
    watch();
    worker.postMessage(Object.assign({ id }, msg), transfer || []);
  });
}
async function ensureModel(onstep) {
  if (S.info) return S.info;
  const r = await ask({ type: "init", engine: ENGINE, prec: PREC }, null, onstep);
  S.info = r.info;
  log(`[AI] ${EP[r.info.ep]} · ${PR[r.info.prec]}(${r.info.mb}MB) · 받기 ${r.info.dlSec.toFixed(1)}초 · 준비 ${r.info.initSec.toFixed(1)}초${r.info.why ? " · " + r.info.why : ""}`);
  return S.info;
}

// ---------- 장면 한 장 다루기 ----------
const seek = (v, t) => new Promise((res, rej) => {
  if (Math.abs(v.currentTime - t) < 1e-4 && v.readyState >= 2) return res();
  const to = setTimeout(() => rej(new Error("영상 장면을 옮기다 멈췄어요")), 8000);
  v.onseeked = () => { clearTimeout(to); res(); };
  v.currentTime = t;
});
const lastT = () => Math.max(0, S.dur - 1 / FPS - .001);
// 작업대: 넣는 장면(cIn) · AI가 돌려준 4배 장면(cModel) · 바꾸기 전(cBase, 그냥 키운 것) · 바꾼 뒤(cOut)
function bench(cBase, cOut) {
  const d = dims(S.cap), mk = (w, h, c) => { c = c || document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const cIn = mk(d.iw, d.ih), cModel = mk(d.iw * SCALE, d.ih * SCALE);
  cBase = mk(d.ow, d.oh, cBase); cOut = mk(d.ow, d.oh, cOut);
  const xIn = cIn.getContext("2d", { willReadFrequently: true, alpha: false }), xModel = cModel.getContext("2d", { alpha: false });
  const xBase = cBase.getContext("2d", { alpha: false }), xOut = cOut.getContext("2d", { alpha: false });
  [xIn, xBase, xOut].forEach(x => { x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; });
  return { d, cIn, cModel, cBase, cOut, xIn, xModel, xBase, xOut };
}
// 바꾼 뒤 = 바꾸기 전 위에 AI 장면을 세기만큼 얹은 것
function blend(B) { B.xOut.globalAlpha = 1; B.xOut.drawImage(B.cBase, 0, 0); B.xOut.globalAlpha = S.mix; B.xOut.drawImage(B.cModel, 0, 0, B.d.ow, B.d.oh); B.xOut.globalAlpha = 1; }
async function oneFrame(B, src, onstep) {
  B.xIn.drawImage(src, 0, 0, B.d.iw, B.d.ih);
  const id = B.xIn.getImageData(0, 0, B.d.iw, B.d.ih);
  const r = await ask({ type: "frame", rgba: id.data, w: B.d.iw, h: B.d.ih }, [id.data.buffer], onstep);
  B.xModel.putImageData(new ImageData(r.rgba, r.w, r.h), 0, 0);
  B.xBase.drawImage(B.cIn, 0, 0, B.d.ow, B.d.oh);
  blend(B);
  return r;
}
function remix() { if (S.still) blend(S.still.B); }

// ---------- 3. 한 장 먼저 해 보기 ----------
const bar = (id, v) => { $(id).style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + "%"; };
const stepText = d => d.phase === "dl" ? `AI 모델을 받는 중… ${Math.round((d.a || 0) / 1048576 * 10) / 10}MB` : d.phase === "init" ? "AI 모델을 준비하는 중…" : "";
function lock(on) {
  S.busy = on;
  ["pick", "one", "go", "playSeg"].forEach(id => { $(id).disabled = on; });
}
$("one").onclick = async () => {
  if (S.busy || !S.path) return;
  lock(true); stale(); fail("err3", "");
  show("run1", true); $("st1").textContent = "준비하는 중…"; bar("fill1", .05);
  try {
    await ensureModel(d => { $("st1").textContent = stepText(d) || "준비하는 중…"; bar("fill1", d.phase === "dl" ? .05 + .35 * (d.a / (d.b || 1)) : .45); });
    $("st1").textContent = "장면을 꺼내는 중…"; bar("fill1", .5);
    let src;
    if (S.path === "mb") {
      const mb = await MB(), got = await new mb.CanvasSink(S.vt, { poolSize: 1 }).getCanvas(S.first + Math.min(S.start, lastT()));
      if (!got) throw new Error("영상 장면을 읽지 못했어요");
      src = got.canvas;
    } else { await seek($("pv"), Math.min(S.start, lastT())); src = $("pv"); }
    const B = bench($("cvA"), $("cvB"));
    $("st1").textContent = "AI가 장면을 바꾸는 중…"; bar("fill1", .6);
    const tile = d => { if (d.type === "tile") bar("fill1", .6 + .35 * d.k / d.n); };
    let r = await oneFrame(B, src, tile), first = r.ms;
    if (r.ms < 4000) r = await oneFrame(B, src, tile);     // 처음 한 번은 준비 때문에 더 걸려요 → 금방 끝나는 기기면 한 번 더 돌려 그 시간을 써요
    S.still = { B, ms: r.ms, first, tiles: r.tiles };
    const d = B.d;
    log(`[한 장] ${d.iw}×${d.ih} → ${d.ow}×${d.oh} · 조각 ${r.tiles}개 · ${EP[S.info.ep]} · ${PR[S.info.prec]} · 한 장 ${secs(r.ms)} (처음 ${secs(first)})`);
    bar("fill1", 1);
    pick("abS", "v", "b"); show("cvA", false); show("cvB", true); $("capS").textContent = "바꾼 뒤";
    pick("zoomS", "z", 1); show("still", true); viewS.set(1);
    paintOne(); paintEst(); show("s4", true); paintGo();
  } catch (e) {
    log(`[한 장] 실패: ${String(e && e.message || e)}`, true);
    fail("err3", /오래/.test(e && e.message) ? "너무 오래 걸려서 그만뒀어요. 더 작은 크기로 넣어 보세요." : "이 장면을 바꾸지 못했어요. 다시 눌러 주세요. 계속 안 되면 아래 기록을 복사해서 보내 주세요.");
  } finally { show("run1", false); lock(false); }
};
// 한 장에 걸린 시간으로 구간 전체를 어림해요 (풀기 · 압축에 드는 시간을 장마다 0.08초 더해요)
const frames = () => Math.max(1, Math.round(Math.min(S.len, S.dur - S.start) * FPS));
const guess = () => S.still ? frames() * (S.still.ms + 80) / 1000 : 0;
function paintOne() { $("one").textContent = S.still ? "한 장 다시 해 보기" : "한 장 먼저 해 보기"; $("one").className = S.still ? "btn line" : "btn"; }
function paintEst() {
  if (!S.still) return;
  $("est").innerHTML = `${DEV}에서 한 장에 ${secs(S.still.ms)} 걸렸어요.<small>${S.len}초 영상(${frames()}장)을 다 바꾸면 약 ${dur(guess())} 걸려요.</small>`;
}
function paintGo() {
  $("go").textContent = S.res ? "다시 만들기" : `${S.len}초 영상으로 만들기`;
  $("go").className = S.res ? "btn line" : "btn";
  $("foot").textContent = S.still ? `${frames()}장 · 약 ${dur(guess())} · AI 세기 ${Math.round(S.mix * 100)}%` : "";
}

// ---------- 4. 영상으로 만들기 ----------
$("stop").onclick = () => { S.cancel = true; $("stop").disabled = true; $("st4").textContent = "그만두는 중…"; };
$("go").onclick = async () => {
  if (S.busy || !S.still) return;
  lock(true); S.cancel = false; S.res = null; fail("err4", ""); show("result", false);
  show("run4", true); $("stop").disabled = false; $("st4").textContent = "준비하는 중…"; bar("fill4", 0); $("el4").textContent = "지난 시간 0:00";
  $("pv").pause();
  let wake = null, it = null, done = false;
  const t0 = performance.now(), N = frames(), T = { dec: 0, ai: 0, net: 0, enc: 0 };   // 풀기 · AI(장면을 주고받는 시간 포함) · 그중 계산만 · 압축
  const tick = setInterval(() => { $("el4").textContent = "지난 시간 " + clock((performance.now() - t0) / 1000); }, 500);
  try {
    try { wake = await navigator.wakeLock.request("screen"); } catch (e) {}
    const mb = await MB();
    await ensureModel(d => { $("st4").textContent = stepText(d) || "준비하는 중…"; });
    const B = bench(), d = B.d;
    if (!(await mb.canEncodeVideo("avc", { width: d.ow, height: d.oh, bitrate: BR }))) throw Object.assign(new Error("H.264 압축을 못 해요"), { kind: "enc" });
    const make = cv => {
      const target = new mb.BufferTarget(), output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });
      const src = new mb.CanvasSource(cv, { codec: "avc", bitrate: BR, keyFrameInterval: 1 });
      output.addVideoTrack(src, { frameRate: FPS });
      return { target, output, src };
    };
    const A = make(B.cOut); await A.output.start();
    let P = null;   // 바꾸기 전 영상 (같이 만들어서 견줘요. 압축기를 둘 못 여는 기기면 없이 가요)
    try { P = make(B.cBase); await P.output.start(); } catch (e) { P = null; log(`[영상] 바꾸기 전 영상은 못 만들어요: ${String(e && e.message || e).slice(0, 120)}`, true); }
    const ts = []; for (let i = 0; i < N; i++) ts.push(Math.min(lastT(), S.start + i / FPS));
    if (S.path === "mb") it = new mb.CanvasSink(S.vt, { poolSize: 2 }).canvasesAtTimestamps(ts.map(t => S.first + t));
    for (let i = 0; i < N; i++) {
      if (S.cancel) throw Object.assign(new Error("cancel"), { kind: "cancel" });
      const a = performance.now();
      let src;
      if (it) { const r = await it.next(); if (!r || !r.value) throw new Error("영상 장면을 읽지 못했어요 (" + (i + 1) + "번째)"); src = r.value.canvas; }
      else { await seek($("pv"), ts[i]); src = $("pv"); }
      const b = performance.now();
      const r = await oneFrame(B, src);
      const c = performance.now();
      await A.src.add(i / FPS, 1 / FPS);
      if (P) await P.src.add(i / FPS, 1 / FPS);
      const e = performance.now();
      T.dec += b - a; T.ai += c - b; T.net += r.ms; T.enc += e - c;
      const el = (e - t0) / 1000, left = el / (i + 1) * (N - i - 1);
      $("st4").textContent = `${i + 1} / ${N}장 · 남은 시간 약 ${dur(left)}`;
      bar("fill4", (i + 1) / N);
      if (GAP) await sleep(GAP);
    }
    $("st4").textContent = "영상으로 묶는 중…";
    A.src.close(); await A.output.finalize();
    if (P) { P.src.close(); await P.output.finalize(); }
    done = true;
    const total = (performance.now() - t0) / 1000;
    S.res = { d, N, total, T, mix: S.mix, len: N / FPS, tiles: S.still.tiles,
              a: new Blob([A.target.buffer], { type: "video/mp4" }), p: P ? new Blob([P.target.buffer], { type: "video/mp4" }) : null };
    log(`[영상] ${d.iw}×${d.ih} → ${d.ow}×${d.oh} · ${N}장 · 총 ${dur(total)} · 한 장 평균 ${secs(total * 1000 / N)} (풀기 ${secs(T.dec / N)} · AI ${secs(T.ai / N)}, 그중 계산 ${secs(T.net / N)} · 압축 ${secs(T.enc / N)}) · ${EP[S.info.ep]} · ${PR[S.info.prec]} · 세기 ${Math.round(S.mix * 100)}% · ${(S.res.a.size / 1048576).toFixed(1)}MB`);
    paintResult();
  } catch (e) {
    if (e && e.kind === "cancel") log(`[영상] 그만둠 (${clock((performance.now() - t0) / 1000)} 지남)`);
    else {
      log(`[영상] 실패: ${String(e && e.message || e)}`, true);
      fail("err4", e && e.kind === "enc" ? "이 브라우저에서는 영상으로 묶을 수 없어요. 사파리나 크롬 최신판에서 열어 주세요." : "영상을 만들다 멈췄어요. 다시 눌러 주세요. 계속 안 되면 더 짧게, 더 작은 크기로 해 보세요.");
    }
  } finally {
    clearInterval(tick);
    if (it && it.return && !done) { try { await it.return(); } catch (e) {} }
    try { if (wake) await wake.release(); } catch (e) {}
    show("run4", false); lock(false); paintGo();
  }
};

function paintResult() {
  const r = S.res, vA = $("vA"), vB = $("vB");
  const ub = URL.createObjectURL(r.a); urls.push(ub); vB.src = ub;
  if (r.p) { const ua = URL.createObjectURL(r.p); urls.push(ua); vA.src = ua; }
  $("abV").hidden = !r.p;
  pick("abV", "v", "b"); vA.hidden = true; vB.hidden = false; $("capV").textContent = "바꾼 뒤";
  pick("zoomV", "z", 1);
  show("result", true); viewV.set(1);
  vB.play().catch(() => {});
  $("nums").innerHTML = [
    ["AI에 넣은 크기", `${r.d.iw}×${r.d.ih}`],
    ["만든 영상 크기", `${r.d.ow}×${r.d.oh}`],
    ["길이 · 장면 수", `${r.len.toFixed(1)}초 · ${r.N}장`],
    ["걸린 시간", dur(r.total)],
    ["한 장 평균", secs(r.total * 1000 / r.N)],
    ["그중 AI 계산", secs(r.T.net / r.N)],
    ["돌린 방식", `${EP[S.info.ep]} · ${PR[S.info.prec]}`],
    ["AI 세기", Math.round(r.mix * 100) + "%"],
    ["5초 영상이라면", "약 " + dur(r.total / r.N * 150)],
  ].map(([k, v]) => `<li><span>${k}</span><b>${esc(v)}</b></li>`).join("");
  paintSave();
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- 저장 (mp4) ----------
function paintSave() {
  const r = S.res, list = [{ k: "a", blob: r.a, name: `${S.name}_고화질.mp4`, t: "바꾼 영상" }];
  if (r.p) list.push({ k: "p", blob: r.p, name: `${S.name}_바꾸기전.mp4`, t: "바꾸기 전 영상" });
  const stuckIn = inApp();
  $("save").innerHTML = list.map((f, i) => {
    f.file = new File([f.blob], f.name, { type: "video/mp4" });
    f.url = URL.createObjectURL(f.file); urls.push(f.url);
    try { f.share = mobile() && !!navigator.canShare && navigator.canShare({ files: [f.file] }); } catch (e) { f.share = false; }
    const cls = i ? "btn line" : "btn";
    return `<p class="file"><b>${esc(f.name)}</b><span>${(f.blob.size / 1048576).toFixed(1)}MB</span></p>` +
      (f.share ? `<button class="${cls}" data-sh="${i}">${f.t} 저장하기</button>`
        : stuckIn ? `<div class="box warn"><p>${esc(stuckIn)} 안에서는 영상을 저장할 수 없어요. 사파리나 크롬에서 열어 주세요.</p></div>`
        : `<a class="${cls}" href="${f.url}" download="${esc(f.name)}">${f.t} 저장하기</a>`);
  }).join("") + `<p class="muted" id="saveMsg" role="status" hidden></p><p class="muted">소리는 들어 있지 않아요 (식전영상 사이트도 폰 영상은 소리 없이 써요).</p>`;
  const say = t => { $("saveMsg").textContent = t; $("saveMsg").hidden = !t; };
  $("save").onclick = async e => {
    const b = e.target.closest("[data-sh]");
    if (!b) { if (e.target.closest("a[download]")) say("저장했어요. ‘파일’(다운로드)에서 찾을 수 있어요."); return; }
    const f = list[+b.dataset.sh];
    try { await navigator.share({ files: [f.file] }); say(""); }
    catch (err) { if (!err || err.name !== "AbortError") say("저장 창을 열지 못했어요. 사파리나 크롬에서 열어 다시 해 보세요."); }
  };
}

$("copy").onclick = async () => {
  const text = [...$("log").children].map(d => d.textContent).join("\n");
  try { await navigator.clipboard.writeText(text); $("copy").textContent = "복사했어요"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("log")); getSelection().removeAllRanges(); getSelection().addRange(r); $("copy").textContent = "글자를 길게 눌러 복사해 주세요"; }
  setTimeout(() => $("copy").textContent = "기록 복사하기", 2500);
};
