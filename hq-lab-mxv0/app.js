// 입장곡 음질 올리기 시험 페이지
// 음원을 풀고(44.1kHz) → 고른 곳(30초 또는 곡 전체)을 워커에 넘겨 AI(Apollo)로 올리고 → 원래 소리와 번갈아 들려주고, 그림 · 숫자 · 저장.
// 음원은 휴대폰 밖으로 나가지 않아요. 밖에서 받는 것은 AI 모델 파일(처음 한 번) 뿐이에요.

const SR = 44100, PART = 30, TC = 64;           // PART = "30초만 먼저"의 길이, TC = 모델에 한 번에 넣는 칸 수 (1칸 = 0.01초)
const MARGIN = Math.round(0.75 * SR);           // 올릴 곳 앞뒤로 같이 넣는 여분 (가장자리가 깨끗하게 나오게. 결과에서는 버려요)
// AI 모델 주소. 2026-11-26부터 이 페이지와 같은 폴더(model/)에 둬요 → 따로 올릴 것 없이 바로 써 볼 수 있어요. 파일이 없으면 "AI 모델 준비 중"으로 보여요.
// 정식 사이트에 넣을 때는 사회자님 Hugging Face 저장소로 옮겨요 (33MB라 많은 사람이 받으면 GitHub 전송량을 먹어요 — docs/음질-올리기/이어서-할-일.md)
const MODEL = { url: new URL("model/apollo_stream_w16.onnx", location.href).href, mb: 33 };
// 내 컴퓨터에서 시험할 때만: ?model=/경로 로 같은 주소 안의 파일을 쓸 수 있어요 (공개 주소에서는 안 먹어요)
let GAP = 0;                                    // 내 컴퓨터에서 시험할 때만: ?gap=300 → 계산 한 번마다 0.3초씩 쉬어요 (맥 화면이 멈추지 않게)
if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
  const q = new URLSearchParams(location.search), m = q.get("model");
  if (m && m[0] === "/") MODEL.url = location.origin + m;
  GAP = Math.max(0, +q.get("gap") || 0);
}
const CACHE = "hq-lab-models-v1";               // worker.js의 CACHE와 같아야 해요
const KEY = "hq-lab.v1";                        // 이 휴대폰에서 걸린 시간 기록 (다음에 어림해 주려고)

const $ = id => document.getElementById(id);
const S = { buf: null, name: "", dur: 0, mode: "part", start: 0, busy: false, gpu: null, model: "checking", savedMb: 0, wiped: false,
            res: null, ab: "B", pos: 0, ceil: 0 };
let worker = null, job = null, actx = null, playing = null, saveUrl = "";

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
const dur = t => { t = Math.max(1, Math.round(t)); const m = Math.floor(t / 60), s = t % 60; return m ? (s ? `${m}분 ${s}초` : `${m}분`) : `${s}초`; };
const eul = s => s + (/분$/.test(s) ? "을" : "를");           // "30초를" · "3분을"
const khz = hz => (hz / 1000).toFixed(hz % 1000 ? 1 : 0) + "kHz";
const log = (line, bad) => { const d = document.createElement("div"); d.textContent = line; if (bad) d.className = "bad"; $("log").appendChild(d); $("log").scrollTop = 1e9; };
const mobile = () => { const u = navigator.userAgent; return /iPhone|iPad|iPod|Android/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); };
const inApp = () => { const u = navigator.userAgent; return /Instagram/i.test(u) ? "인스타그램" : /KAKAOTALK/i.test(u) ? "카카오톡" : /NAVER\(inapp/i.test(u) ? "네이버" : /FBAN|FBAV/i.test(u) ? "페이스북" : / Line\//i.test(u) ? "라인" : /; wv\)/.test(u) ? "앱" : ""; };
const TRASH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.3h11M6.2 4.3V2.7h3.6v1.6M4 4.3l.7 9.1h6.6l.7-9.1M6.6 6.8v4.3M9.4 6.8v4.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const memo = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };

// ---------- 기기 정보 ----------
(async function deviceInfo() {
  let gpu = "없음";
  if (navigator.gpu) { try { gpu = (await navigator.gpu.requestAdapter()) ? "있음" : "있지만 못 씀"; } catch (e) { gpu = "있지만 못 씀"; } }
  S.gpu = gpu === "있음";
  log(`[기기] 그래픽 칩(WebGPU) ${gpu} · 코어 ${navigator.hardwareConcurrency || "?"} · 메모리 ${navigator.deviceMemory || "?"}GB${inApp() ? " · " + inApp() + " 안 브라우저" : ""}`);
  log(`[기기] ${navigator.userAgent}`);
  paintGo();
})();

// ---------- 갤럭시 + 인스타그램 안 브라우저: 파일 고르기가 사진만 띄워요 → 크롬에서 열기 ----------
if (/Android/i.test(navigator.userAgent) && /Instagram/i.test(navigator.userAgent)) {
  $("chrome").href = "intent://" + location.host + location.pathname + location.search + "#Intent;scheme=" + location.protocol.replace(":", "") + ";package=com.android.chrome;end";
  $("inapp").hidden = false;
}

// ---------- AI 모델: 저장돼 있나 / 받을 수 있나 ----------
async function savedSize() {            // 저장돼 있으면 바이트 수, 없으면 0, 알 수 없으면 -1
  try {
    if (!(await caches.has(CACHE))) return 0;
    const hit = await (await caches.open(CACHE)).match(MODEL.url);
    if (!hit) return 0;
    return +hit.headers.get("content-length") || (await hit.blob()).size;
  } catch (e) { return -1; }
}
async function checkModel() {
  const n = await savedSize();
  if (n > 0) { S.model = "saved"; S.savedMb = Math.round(n / 1e6); }
  else {
    S.savedMb = 0;
    try {
      // 주소만 확인해요 (받지는 않아요). 파일이 있으면 200 (Hugging Face에 둘 때는 다른 주소로 넘겨줘요 = 있다는 뜻), 없으면 401 · 404
      const r = await fetch(MODEL.url, { method: "HEAD", redirect: "manual", cache: "no-store" });
      S.model = (r.type === "opaqueredirect" || r.ok) ? "ready" : "soon";
    } catch (e) { S.model = "offline"; }
  }
  paintGo(); paintModel();
}

// 맨 위 알림 + 3번 칸의 버튼 · 안내
function paintGo() {
  const soon = S.model === "soon", off = S.model === "offline", slow = S.gpu === false;
  let gate = "";
  if (soon) gate = `<div class="box"><b>AI 모델을 준비하는 중이에요</b><p>아직 음질 올리기를 쓸 수 없어요. 준비가 끝나면 아래 버튼이 켜져요.</p></div>`;
  else if (off) gate = `<div class="box warn"><b>인터넷에 연결되지 않았어요</b><p>AI 모델(${MODEL.mb}MB)을 받으려면 인터넷이 필요해요. 연결한 뒤 다시 확인해 주세요.</p><button class="btn line" id="recheck">다시 확인하기</button></div>`;
  else if (slow) gate = `<div class="box warn"><b>이 브라우저에서는 아주 오래 걸려요</b><p>그래픽 칩(GPU)을 쓸 수 없어서, 30초를 올리는 데 30분 넘게 걸릴 수 있어요. 아이폰은 사파리, 갤럭시는 크롬 최신 버전에서 열어 보세요.</p></div>`;
  // 음원을 고르기 전에는 맨 위에, 고른 뒤에는 3번 칸 버튼 위에 보여요
  $("topgate").innerHTML = S.buf ? "" : gate;
  $("gate").innerHTML = S.busy || !S.buf ? "" : gate;
  const re = $("recheck"); if (re) re.onclick = () => { S.model = "checking"; paintGo(); checkModel(); };
  const go = $("go");
  go.hidden = S.busy;
  go.disabled = !S.buf || soon || off || S.model === "checking";
  // 이미 같은 곳을 올렸으면 "다시 올리기"는 한 단계 낮은 모양으로 (그때 제일 큰 버튼은 4번 칸의 듣기 · 저장)
  const again = sameAsResult();
  go.className = "btn" + (slow && !soon && !off ? " ghost" : again ? " line" : "");
  go.textContent = slow && !soon && !off ? "그래도 해 보기" : again ? "같은 곳 다시 올리기" : "음질 올리기";
  // 버튼 아래 한두 줄: 모델을 받는지 + 얼마나 걸릴지
  const lines = [];
  if (!S.busy && S.buf && !soon && !off) {
    if (S.model === "checking") lines.push("AI 모델을 확인하는 중…");
    else if (S.model === "ready") lines.push(`처음 한 번만 AI 모델 ${MODEL.mb}MB를 받아요 (와이파이 추천).`);
    const sec = S.mode === "all" ? S.dur : Math.min(PART, S.dur), m = memo();
    if (m.spd) lines.push(`이 휴대폰 기록으로 어림하면 ${eul(dur(sec))} 올리는 데 약 ${dur(m.spd * sec * (S.buf.numberOfChannels > 1 ? 1 : 0.5))} 걸려요.`);
    else lines.push(S.mode === "all" && S.dur > PART + 5 ? "곡 전체는 오래 걸려요. 처음이라면 ‘30초만 먼저’로 걸리는 시간을 알아보세요." : "얼마나 걸리는지는 휴대폰마다 달라요. 한 번 해 보면 여기에 걸리는 시간이 나와요.");
  }
  $("foot").innerHTML = lines.map(esc).join("<br>");
  $("foot").hidden = !lines.length;
}
function sameAsResult() { return !!S.res && S.res.mode === S.mode && (S.mode === "all" || S.res.start === S.start); }

// 저장된 AI 모델 칸 (저장돼 있을 때, 또는 방금 지웠을 때만 보여요)
function paintModel() {
  const el = $("s5");
  if (S.busy || (S.model !== "saved" && !S.wiped)) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = S.model === "saved" ? `
      <p class="mm-t">이 휴대폰에 저장된 AI 모델 · ${S.savedMb}MB</p>
      <p class="muted">${S.res ? "음질 올리기를 다 했으면 지워서 휴대폰 공간을 비워 주세요. 올린 음원은 그대로 남아요." : "저장돼 있어서 받지 않고 바로 시작해요. 더 쓰지 않을 거면 지워 주세요."}</p>
      <button class="btn line" id="wipe">${TRASH}AI 모델 지우기</button>
      ${S.wiped === "fail" ? `<p class="err">지우지 못했어요. 다시 눌러 주세요.</p>` : ""}`
    : `<p class="gone" role="status">✓ 휴대폰에서 AI 모델을 지웠어요. 다시 음질을 올리면 ${MODEL.mb}MB를 새로 받아요.</p>`;
  const w = $("wipe");
  if (w) w.onclick = async () => {
    if (S.busy) return;
    w.disabled = true; w.textContent = "지우는 중…";
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }     // 열려 있던 모델도 메모리에서 내려요
    try { await caches.delete(CACHE); } catch (e) {}
    const left = await savedSize();
    S.wiped = left > 0 ? "fail" : "ok";
    if (left <= 0) log("[지움] 저장한 AI 모델을 지웠어요");
    await checkModel();
  };
}
checkModel();

// ---------- 음원 풀기 ----------
$("pick").onclick = () => { if (!S.busy) $("file").click(); };
$("file").onchange = async () => {
  const f = $("file").files[0]; if (!f || S.busy) return;
  stopSound(); dropResult();
  S.buf = null; $("s2").hidden = $("s3").hidden = true; $("meter").hidden = true; $("inapp").hidden = true;
  $("fileinfo").className = "muted"; $("fileinfo").textContent = "음원을 여는 중…";
  try {
    const ab = await f.arrayBuffer();
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const buf = await new Promise((res, rej) => { const p = new OC(2, SR, SR).decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); });
    if (buf.length < SR * 2) throw new Error("short");
    S.buf = buf; S.dur = buf.length / SR; S.name = f.name.replace(/\.[^.]+$/, "");
    $("fileinfo").innerHTML = `<b>${esc(f.name)}</b> · ${dur(S.dur)} · ${buf.numberOfChannels === 1 ? "모노(한쪽 소리)" : "스테레오"}`;
    $("pick").textContent = "다른 음원 고르기"; $("pick").className = "btn ghost";
    // 높은 소리가 어디까지 들어 있나 (곡 전체에서 골고루 400칸)
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    S.ceil = hqCeiling(hqAvgSpectrum(L, R, buf.length, 400));
    paintMeter();
    S.mode = S.dur > PART + 5 ? "part" : "all";
    S.start = S.dur >= 120 ? 60 : 0;
    paintOpts(); setStart(S.start);
    $("s2").hidden = $("s3").hidden = false;
    log(`[음원] ${f.name} · ${S.dur.toFixed(1)}초 · ${(f.size / 1e6).toFixed(1)}MB · ${buf.numberOfChannels === 1 ? "모노" : "스테레오"} · 높은 소리 ${khz(S.ceil)}까지`);
  } catch (e) {
    $("fileinfo").className = "err";
    $("fileinfo").textContent = e && e.message === "short" ? "음원이 너무 짧아요. 2초보다 긴 음원으로 해 주세요." : "이 파일은 열지 못했어요. mp3나 m4a 음원 파일로 다시 해 주세요.";
  }
  $("file").value = "";
  paintGo();
};

// 음원에 들어 있는 소리 높이 (막대 하나 + 한 줄)
function paintMeter() {
  const c = S.ceil, pct = Math.max(4, Math.min(100, c / 20000 * 100));
  $("meterT").textContent = "이 음원에 들어 있는 소리 높이";
  $("meterFill").style.width = pct.toFixed(0) + "%";
  $("meterD").textContent = c >= 19000 ? `높은 소리까지 거의 다 들어 있어요 (약 ${khz(c)}). 이미 음질이 좋은 음원이라, 올려도 차이가 거의 없을 수 있어요.`
    : c >= 17000 ? `높은 소리가 조금 깎여 있어요 (약 ${khz(c)}까지). 올려도 차이가 작을 수 있어요.`
    : `높은 소리가 중간에서 끊겨 있어요 (약 ${khz(c)}까지 · 사람이 듣는 끝은 약 20kHz). 용량을 줄이면서 깎인 음원이에요. 음질을 올리면 이 빈 곳이 채워져요.`;
  $("meter").hidden = false;
}

// ---------- 어디를 올릴까요 ----------
function paintOpts() {
  const short = S.dur <= PART + 5;
  const o = short ? [["all", `곡 전체 (${dur(S.dur)})`, "짧은 음원이라 전체를 올려요."]]
    : [["part", "30초만 먼저", "빨리 끝나요. 먼저 들어 보고, 마음에 들면 곡 전체를 올리세요."], ["all", `곡 전체 (${dur(S.dur)})`, "오래 걸려요. 30초를 먼저 해 보고 고르세요."]];
  $("opts").innerHTML = o.map(([k, t, d]) => `<label class="opt${k === S.mode ? " on" : ""}"><input type="radio" name="mode" value="${k}"${k === S.mode ? " checked" : ""}><div><span>${esc(t)}</span><small>${esc(d)}</small></div></label>`).join("");
  $("startBox").hidden = S.mode !== "part";
}
$("opts").onchange = e => { if (S.busy) return; S.mode = e.target.value; stopSound(); paintOpts(); paintGo(); };
function setStart(v) {
  const max = Math.max(0, Math.floor(S.dur - PART));
  S.start = Math.max(0, Math.min(max, Math.round(v)));
  $("start").max = max; $("start").value = S.start;
  $("startTxt").textContent = `${fmt(S.start)} ~ ${fmt(Math.min(S.dur, S.start + PART))}`;
  $("start").setAttribute("aria-valuetext", $("startTxt").textContent);
}
$("start").oninput = () => { if (S.busy) { $("start").value = S.start; return; } stopSound(); setStart(+$("start").value); paintGo(); };
document.querySelectorAll(".nudge button").forEach(b => b.onclick = () => { if (S.busy) return; stopSound(); setStart(S.start + +b.dataset.d); paintGo(); });

// ---------- 소리 내기 (미리 듣기 · 번갈아 듣기) ----------
function ctx() {
  if (!actx) {
    const C = window.AudioContext || window.webkitAudioContext; actx = new C();
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}      // 아이폰 무음 스위치가 켜져 있어도 들리게
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function stopSound() {
  const p = playing; playing = null;
  if (p) { for (const n of p.nodes) { try { n.onended = null; n.stop(); } catch (e) {} } if (p.kind === "ab") S.pos = Math.min(p.len, Math.max(0, actx.currentTime - p.t0)); }
  $("hear").textContent = "이 30초 들어 보기";
  paintPlayer();
}
$("hear").onclick = () => {
  if (S.busy || !S.buf) return;
  if (playing && playing.kind === "prev") { stopSound(); return; }
  stopSound();
  const c = ctx(), src = c.createBufferSource();
  src.buffer = S.buf; src.connect(c.destination);
  src.start(0, S.start, Math.min(PART, S.dur - S.start));
  src.onended = () => { if (playing && playing.nodes[0] === src) { playing = null; $("hear").textContent = "이 30초 들어 보기"; } };
  playing = { kind: "prev", nodes: [src] };
  $("hear").textContent = "■ 멈추기";
};

function abPlay(off) {
  const r = S.res; if (!r) return;
  stopSound();
  const c = ctx(), len = r.n / SR;
  off = off >= len - 0.05 ? 0 : Math.max(0, off);
  const gA = c.createGain(), gB = c.createGain();
  gA.gain.value = S.ab === "A" ? 1 : 0; gB.gain.value = S.ab === "B" ? 1 : 0;
  const a = c.createBufferSource(), b = c.createBufferSource();
  a.buffer = S.buf; b.buffer = r.buf;
  a.connect(gA); gA.connect(c.destination); b.connect(gB); gB.connect(c.destination);
  const when = c.currentTime + 0.06;
  a.start(when, r.i0 / SR + off, len - off); b.start(when, off, len - off);
  b.onended = () => { if (playing && playing.nodes[1] === b) { playing = null; S.pos = 0; paintPlayer(); } };
  playing = { kind: "ab", nodes: [a, b], gA, gB, t0: when - off, len };
  paintPlayer(); tick();
}
function tick() {
  if (!playing || playing.kind !== "ab") return;
  S.pos = Math.min(playing.len, Math.max(0, actx.currentTime - playing.t0));
  if (!seeking) { $("seek").value = S.pos; }
  $("time").textContent = `${fmt(S.pos)} / ${fmt(playing.len)}`;
  requestAnimationFrame(tick);
}
function paintPlayer() {
  const r = S.res; if (!r) return;
  const on = !!(playing && playing.kind === "ab"), len = r.n / SR;
  $("play").textContent = on ? "■ 멈추기" : "▶ 듣기";
  $("seek").max = len.toFixed(2); if (!seeking) $("seek").value = S.pos;
  $("time").textContent = `${fmt(S.pos)} / ${fmt(len)}`;
  $("abA").classList.toggle("on", S.ab === "A"); $("abB").classList.toggle("on", S.ab === "B");
  $("abA").setAttribute("aria-checked", S.ab === "A"); $("abB").setAttribute("aria-checked", S.ab === "B");
}
let seeking = false;
$("play").onclick = () => { if (playing && playing.kind === "ab") stopSound(); else abPlay(S.pos); };
$("seek").oninput = () => { seeking = true; S.pos = +$("seek").value; $("time").textContent = `${fmt(S.pos)} / ${fmt(S.res ? S.res.n / SR : 0)}`; };
$("seek").onchange = () => { seeking = false; const p = +$("seek").value; if (playing && playing.kind === "ab") abPlay(p); else { S.pos = p; paintPlayer(); } };
function pickAB(k) {
  S.ab = k;
  if (playing && playing.kind === "ab") {       // 같은 자리에서 바로 바꿔요 (틱 소리가 안 나게 아주 짧게 넘김)
    const t = actx.currentTime;
    playing.gA.gain.setTargetAtTime(k === "A" ? 1 : 0, t, 0.008); playing.gB.gain.setTargetAtTime(k === "B" ? 1 : 0, t, 0.008);
    paintPlayer();
  } else abPlay(S.pos);                         // 멈춰 있으면 누른 소리로 바로 들려줘요
}
$("abA").onclick = () => pickAB("A");
$("abB").onclick = () => pickAB("B");

// ---------- 음질 올리기 ----------
// 올릴 곳 [i0, i1) 앞뒤에 여분을 붙여요. 곡 밖으로 나가는 부분은 거울처럼 접어요
function padded(ch, i0, i1) {
  const len = ch.length, n = i1 - i0, out = new Float32Array(n + 2 * MARGIN);
  for (let j = 0; j < out.length; j++) {
    let i = i0 - MARGIN + j;
    if (i < 0) i = -i; if (i >= len) i = 2 * (len - 1) - i;
    out[j] = ch[i < 0 ? 0 : i >= len ? len - 1 : i];
  }
  return out;
}
function runWorker(msg, move, onStep) {
  return new Promise((res, rej) => {
    let wk;
    try { wk = worker || (worker = new Worker("worker.js")); } catch (err) { err.phase = "load"; rej(err); return; }
    const id = Date.now() + "-" + Math.random();
    job = { id, rej };
    const fail = err => { if (!job || job.id !== id) return; job = null; try { wk.terminate(); } catch (_) {} if (worker === wk) worker = null; rej(err); };
    wk.onmessage = ev => {
      const d = ev.data;
      if (!job || job.id !== id || d.id !== id) return;
      if (d.type === "step") { onStep(d); return; }
      if (d.type === "done") { job = null; res(d); return; }
      const err = new Error(d.text || "fail"); err.phase = d.phase; fail(err);
    };
    wk.onerror = ev => { const err = new Error((ev && ev.message) || "worker"); err.phase = "load"; fail(err); };
    wk.postMessage({ ...msg, id }, move);
  });
}
function stopJob() {
  const j = job; if (!j) return;
  job = null;
  if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
  const c = new Error("cancel"); c.cancel = true; j.rej(c);
}
$("stop").onclick = stopJob;

function setBusy(on) {
  S.busy = on;
  $("run").hidden = !on;
  for (const id of ["pick", "start", "hear"]) $(id).disabled = on;
  document.querySelectorAll("#opts input, .nudge button").forEach(b => b.disabled = on);
  paintGo(); paintModel();
}

$("go").onclick = async () => {
  if (S.busy || !S.buf || $("go").disabled) return;
  stopSound();
  $("err").hidden = true;
  const buf = S.buf, mode = S.mode, start = S.start;
  const i0 = mode === "all" ? 0 : Math.round(start * SR), i1 = mode === "all" ? buf.length : Math.min(buf.length, i0 + PART * SR), n = i1 - i0;
  let c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  if (c1) { let same = true; for (let i = i0; i < i1; i += 7) if (c0[i] !== c1[i]) { same = false; break; } if (same) c1 = null; }    // 양쪽이 같은 소리면 한 번만 해요
  const L = padded(c0, i0, i1), R = c1 ? padded(c1, i0, i1) : null;
  setBusy(true);
  const st = $("status"), fill = $("fill"), el = $("elapsed"), t0 = performance.now();
  st.textContent = "준비하는 중…"; fill.style.width = "0%"; el.textContent = "지난 시간 0:00";
  const clock = setInterval(() => { el.textContent = "지난 시간 " + fmt((performance.now() - t0) / 1000); }, 500);
  $("s3").scrollIntoView({ block: "nearest", behavior: "smooth" });
  let wake = null, tRun = 0, done = null, fail = null;
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {}      // 기다리는 동안 화면이 꺼지지 않게
  try {
    const move = [L.buffer]; if (R) move.push(R.buffer);
    done = await runWorker({ type: "run", L, R, keep: [MARGIN, MARGIN + n], model: MODEL, engine: S.gpu ? "auto" : "cpu", tc: TC, cols: 360, gap: GAP }, move, d => {
      let text, pct = 0;
      if (d.phase === "dl") { pct = d.b ? Math.min(1, d.a / d.b) : 0; text = `AI 모델 받는 중… ${Math.round(d.a / 1e6)} / ${Math.round(d.b / 1e6)}MB (처음 한 번만)`; }
      else if (d.phase === "init") text = "AI 모델 준비하는 중…";
      else {
        if (!tRun || d.a === 0) tRun = performance.now();
        pct = d.b ? d.a / d.b : 0;
        const left = d.a > 0 ? Math.ceil((performance.now() - tRun) / 1000 / d.a * (d.b - d.a)) : 0;
        text = `음질을 올리는 중… ${Math.round(pct * 100)}%` + (left > 0 ? ` · 약 ${dur(left)} 남았어요` : "");
      }
      st.textContent = text; fill.style.width = (pct * 100).toFixed(1) + "%";
    });
  } catch (err) { fail = err; }
  clearInterval(clock);
  if (wake) { try { wake.release(); } catch (e) {} }
  const total = (performance.now() - t0) / 1000;
  if (fail) {
    setBusy(false);
    if (!fail.cancel) {
      const net = fail.phase === "dl" || fail.phase === "load";
      $("err").textContent = net ? "AI 모델을 받지 못했어요. 인터넷을 확인하고 다시 해 주세요."
        : "이 휴대폰에서는 음질을 올리지 못했어요. ‘30초만 먼저’로 줄이거나, 다른 브라우저(사파리 · 크롬)에서 다시 해 보세요.";
      $("err").hidden = false;
      log(`[실패] ${mode === "all" ? "곡 전체" : "30초"} · ${fail.phase || "?"} · ${fail.message} · ${total.toFixed(1)}초 뒤`, true);
    } else log(`[그만둠] ${total.toFixed(1)}초 뒤`);
    checkModel();                                 // 그만뒀어도 모델은 받아 뒀을 수 있어요
    return;
  }
  showResult(done, { buf, mode, start, i0, n, total, stereo: !!R });
  setBusy(false);
  S.wiped = false;
  checkModel();
  $("s4").scrollIntoView({ block: "start", behavior: "smooth" });
};

function dropResult() {
  stopSound();
  S.res = null; S.pos = 0; S.ab = "B";
  if (saveUrl) { try { URL.revokeObjectURL(saveUrl); } catch (e) {} saveUrl = ""; }
  $("s4").hidden = true;
}

function showResult(d, q) {
  dropResult();
  const info = d.info, n = q.n, nch = q.buf.numberOfChannels;
  // 들려줄 소리 (원래 음원과 같은 채널 수)
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const out = new OC(1, 1, SR).createBuffer(nch, n, SR);
  out.getChannelData(0).set(d.L); if (nch > 1) out.getChannelData(1).set(d.R || d.L);
  const wav = makeWav(out);
  S.res = { buf: out, i0: q.i0, n, mode: q.mode, start: q.start, wav, info };
  S.pos = 0; S.ab = "B";
  // 그림 + 높은 소리 숫자
  const pic = d.pic, F = pic.h, avgA = new Float64Array(F), avgB = new Float64Array(F);
  for (let c = 0; c < pic.w; c++) for (let k = 0; k < F; k++) { avgA[k] += pic.a[c * F + k]; avgB[k] += pic.b[c * F + k]; }
  let ref = 0; for (let i = 0; i < pic.a.length; i++) { if (pic.a[i] > ref) ref = pic.a[i]; if (pic.b[i] > ref) ref = pic.b[i]; }
  drawPic($("picA"), pic.a, pic.w, F, ref); drawPic($("picB"), pic.b, pic.w, F, ref);
  const cA = hqCeiling(avgA), cB = hqCeiling(avgB), hA = hqHighDb(avgA), hB = hqHighDb(avgB);
  // 숫자
  const sec = n / SR, rate = info.runSec / sec * 60, per = info.perRun, avg = per.length > 1 ? per.slice(1).reduce((a, b) => a + b, 0) / (per.length - 1) : per[0];
  const eng = info.ep === "webgpu" ? "그래픽 칩 (WebGPU)" : "CPU만 (그래픽 칩 못 씀)";
  const get = !info.reused && !info.cached && info.dlSec >= 1 ? ` · 모델 받기 ${dur(info.dlSec)} 포함` : "";
  $("nums").innerHTML = [
    ["올린 길이", `${dur(sec)}${q.mode === "all" ? " (곡 전체)" : ` (${fmt(q.start)} ~ ${fmt(q.start + sec)})`}`],
    ["걸린 시간", `${dur(q.total)}${get}`],
    ["소리 1분을 올리는 데", dur(rate)],
    ["계산한 곳", eng],
    ["높은 소리가 있는 곳", cB > cA + 400 ? `${khz(cA)}까지 → ${khz(cB)}까지` : `${khz(cA)}까지 → 그대로`],
  ].map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join("");
  $("doneT").textContent = cB > cA + 400 ? "✓ 다 됐어요. 번갈아 들어 보세요." : "✓ 다 됐어요. 이 음원은 원래 높은 소리까지 들어 있어서 차이가 작을 수 있어요.";
  try { localStorage.setItem(KEY, JSON.stringify({ spd: info.runSec / sec * (q.stereo ? 1 : 2), ep: info.ep, at: Date.now() })); } catch (e) {}
  paintSave(); paintPlayer();
  $("s4").hidden = false;
  const dl = info.reused ? "모델 이미 열림" : info.cached ? "모델 저장본 사용" : `모델 받기 ${info.dlSec.toFixed(1)}초`;
  log(`[결과] ${q.mode === "all" ? "곡 전체" : `30초(${fmt(q.start)}~)`} ${sec.toFixed(1)}초 · ${q.stereo ? "스테레오" : "한쪽만 계산"} · 총 ${q.total.toFixed(1)}초 · ${info.ep === "webgpu" ? "그래픽 칩" : `CPU(스레드 ${info.threads})`} · ${dl} · 준비 ${info.initSec.toFixed(1)}초 · 처리 ${info.runSec.toFixed(1)}초 = ${info.runs}번 × 평균 ${avg.toFixed(2)}초 (첫 번 ${per[0].toFixed(2)}초) · 소리 1분에 ${rate.toFixed(0)}초 · 높은 소리 ${khz(cA)}→${khz(cB)} · 16kHz 위 ${hA.toFixed(1)}→${hB.toFixed(1)}dB` + (info.why ? ` · WebGPU 안 씀: ${info.why}` : ""));
  window.__last = { info, total: q.total, sec, cA, cB, hA, hB };
}

// 소리 그림: 가로 = 시간, 세로 = 소리 높이(위가 높은 소리), 밝기 = 크기. 두 그림은 같은 눈금이에요
function drawPic(cv, p, w, F, ref) {
  const H = 221, g = cv.getContext("2d");
  cv.width = w; cv.height = H;
  const img = g.createImageData(w, H), px = img.data;
  const stops = [[0, 0, 4], [59, 15, 112], [182, 54, 121], [251, 136, 97], [252, 253, 191]];
  for (let y = 0; y < H; y++) {
    const k = (H - 1 - y) * 2;
    for (let x = 0; x < w; x++) {
      const v = Math.max(p[x * F + k], p[x * F + Math.min(F - 1, k + 1)]);
      let t = (10 * Math.log10(v / ref + 1e-12) + 100) / 100; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const f = t * 4, i = Math.min(3, Math.floor(f)), u = f - i, a = stops[i], b = stops[i + 1], o = (y * w + x) * 4;
      px[o] = a[0] + (b[0] - a[0]) * u; px[o + 1] = a[1] + (b[1] - a[1]) * u; px[o + 2] = a[2] + (b[2] - a[2]) * u; px[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

// ---------- 저장 (wav, 16비트) ----------
function makeWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, ab = new ArrayBuffer(44 + n * ch * 2), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * ch * 2, true);
  const pcm = new Int16Array(ab, 44);
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) { const x = d[i] * 32767; pcm[i * ch + c] = x > 32767 ? 32767 : x < -32768 ? -32768 : x; } }
  return new Blob([ab], { type: "audio/wav" });
}
function paintSave() {
  const r = S.res, all = r.mode === "all", name = `${S.name}_음질올림${all ? "" : "_30초"}.wav`;
  const file = new File([r.wav], name, { type: "audio/wav" });
  saveUrl = URL.createObjectURL(file);
  let share = false; try { share = mobile() && !!navigator.canShare && navigator.canShare({ files: [file] }); } catch (e) {}
  const stuck = !share && !!inApp();            // 앱 안이고 공유 창도 없으면 저장할 길이 없어요
  $("save").innerHTML = `
    <p class="file"><b>${esc(name)}</b><span>${(r.wav.size / 1048576).toFixed(1)}MB</span></p>
    ${share ? `<button class="btn" id="sh">올린 음원 보내기 · 저장하기</button>` : ""}
    ${stuck ? `<div class="box warn"><p>${esc(inApp())} 안에서는 음원을 저장할 수 없어요. 사파리나 크롬에서 열어 주세요.</p></div>`
            : `<a class="btn${share ? " line" : ""}" id="dl" href="${saveUrl}" download="${esc(name)}">${share ? "파일로 받기" : "올린 음원 저장하기"}</a>`}
    <p class="muted" id="saveMsg" role="status" hidden></p>
    <p class="muted">${all ? "음질이 깎이지 않는 wav 파일로 저장돼요. 그래서 용량이 커요." : "지금은 올린 30초만 들어 있어요. 곡 전체를 저장하려면 위 2번에서 ‘곡 전체’를 골라 다시 올려 주세요."}</p>`;
  const msg = $("saveMsg"), say = t => { msg.textContent = t; msg.hidden = !t; };
  const sh = $("sh");
  if (sh) sh.onclick = async () => {
    try { await navigator.share({ files: [file] }); say(""); }
    catch (e) { if (!e || e.name !== "AbortError") say("공유 창을 열지 못했어요. ‘파일로 받기’를 눌러 주세요."); }
  };
  const dl = $("dl"); if (dl) dl.onclick = () => say("저장했어요. 휴대폰의 ‘파일’(다운로드)에서 찾을 수 있어요.");
}

$("copy").onclick = async () => {
  const text = [...$("log").children].map(d => d.textContent).join("\n");
  try { await navigator.clipboard.writeText(text); $("copy").textContent = "복사했어요"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("log")); getSelection().removeAllRanges(); getSelection().addRange(r); $("copy").textContent = "글자를 길게 눌러 복사해 주세요"; }
  setTimeout(() => $("copy").textContent = "기록 복사하기", 2500);
};
