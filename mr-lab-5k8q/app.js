// MR 바꾸기 시험 페이지
// 음원을 풀고(44.1kHz 스테레오) → 고른 구간만 MR로 바꾸고 → 앞뒤를 0.3초씩 겹쳐 원곡에 이어 붙여 들려줘요.

const SR = 44100, XF = 0.3, PRE = 5, POST = 10, MARGIN = 1;
const HF = "https://huggingface.co/Politrees/UVR_resources/resolve/929e057b81aa49bc2e6490bef8671f47b2c120f6/models/MDXNet/";
const METHODS = {
  center: { label: "① 가운데 소리 지우기", note: "바로 돼요 · 받는 것 없음 · 소리가 한 덩어리(모노)가 돼요" },
  light:  { label: "② AI 가벼운 모델", note: "처음 한 번 30MB 받아요 · 목소리를 모두 빼요",
            model: { url: HF + "UVR_MDXNET_3_9662.onnx", nfft: 6144, dimF: 2048, primary: "Vocals", comp: 1.035, mb: 30 } },
  hq:     { label: "③ AI 고급 모델", note: "처음 한 번 67MB 받아요 · 가벼운 모델보다 약 3배 느려요",
            model: { url: HF + "UVR-MDX-NET-Inst_HQ_3.onnx", nfft: 6144, dimF: 3072, primary: "Instrumental", comp: 1.022, mb: 67 } },
};

const $ = id => document.getElementById(id);
const S = { L: null, R: null, dur: 0, name: "", method: "light", busy: false, urls: [] };
let worker = null, jobId = 0;

const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1); };
const log = (line, cls) => { const d = document.createElement("div"); d.textContent = line; if (cls) d.className = cls; $("log").appendChild(d); $("log").scrollTop = 1e9; };
const url = blob => { const u = URL.createObjectURL(blob); S.urls.push(u); return u; };

// ---------- 기기 정보 ----------
(async function deviceInfo() {
  const ua = navigator.userAgent;
  let gpu = "없음";
  if (navigator.gpu) { try { gpu = (await navigator.gpu.requestAdapter()) ? "있음" : "있지만 못 씀"; } catch (e) { gpu = "있지만 못 씀"; } }
  $("gpuinfo").textContent = "· 이 기기: " + gpu;
  if (gpu !== "있음") $("gpu").checked = false;
  const inApp = /Instagram|FBAN|FBAV|KAKAOTALK|NAVER/i.test(ua) ? " · 앱 안 브라우저" : "";
  log(`[기기] WebGPU ${gpu} · 코어 ${navigator.hardwareConcurrency || "?"} · 메모리 ${navigator.deviceMemory || "?"}GB${inApp}`);
  log(`[기기] ${ua}`);
})();

// ---------- 방법 고르기 ----------
function drawOpts(saved) {
  $("opts").innerHTML = Object.entries(METHODS).map(([k, m]) => {
    const has = m.model && saved && saved.some(x => x.url === m.model.url);
    const note = has ? "저장돼 있어요 · 받지 않고 바로 시작해요" : m.note;
    return `<label class="opt${k === S.method ? " on" : ""}"><input type="radio" name="m" value="${k}"${k === S.method ? " checked" : ""}><div><span>${m.label}</span><small>${note}</small></div></label>`;
  }).join("");
}
drawOpts(null);

// ---------- 저장한 AI 모델 (Cache Storage, worker.js와 같은 이름) ----------
const CACHE = "mr-test-models-v1";
async function savedModels() {
  try {
    if (!(await caches.has(CACHE))) return [];
    const c = await caches.open(CACHE), out = [];
    for (const req of await c.keys()) {
      const r = await c.match(req);
      let n = +r.headers.get("content-length");
      if (!n) n = (await r.blob()).size;
      out.push({ url: req.url, n });
    }
    return out;
  } catch (e) { return null; }
}
async function refreshSaved() {
  const list = await savedModels();
  drawOpts(list);
  if (list === null) { $("saved").textContent = "이 브라우저는 모델을 저장하지 못해요. 쓸 때마다 새로 받아요."; $("wipe").hidden = true; return; }
  if (!list.length) { $("saved").textContent = "이 휴대폰에 저장한 AI 모델이 없어요."; $("wipe").hidden = true; return; }
  const name = u => { const m = Object.values(METHODS).find(m => m.model && m.model.url === u); return m ? m.label.replace(/^\S+\s/, "") : "예전 모델"; };
  const total = list.reduce((s, x) => s + x.n, 0);
  $("saved").textContent = list.map(x => `${name(x.url)} ${Math.round(x.n / 1e6)}MB`).join(" · ") + ` — 이 휴대폰에 저장돼 있어요. 다음엔 받지 않고 바로 시작해요.`;
  $("wipe").textContent = `저장한 AI 모델 지우기 (${Math.round(total / 1e6)}MB)`;
  $("wipe").hidden = false;
}
$("wipe").onclick = async () => {
  if (S.busy) return;
  if (worker) { worker.terminate(); worker = null; }   // 열려 있던 모델도 메모리에서 내려요
  try { await caches.delete(CACHE); } catch (e) {}
  log("[지움] 저장한 AI 모델을 지웠어요");
  await refreshSaved();
  $("saved").textContent = "지웠어요. 다음에 AI 방법을 쓰면 다시 받아요.";
};
refreshSaved();
$("opts").onchange = e => { S.method = e.target.value; document.querySelectorAll(".opt").forEach(o => o.classList.toggle("on", o.querySelector("input").checked)); };

// ---------- 음원 풀기 ----------
$("pick").onclick = () => $("file").click();
$("file").onchange = async () => {
  const f = $("file").files[0]; if (!f) return;
  $("fileinfo").textContent = "음원을 푸는 중…";
  try {
    const ab = await f.arrayBuffer();
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const buf = await new Promise((res, rej) => { const p = new OC(2, SR, SR).decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); });
    S.L = buf.getChannelData(0); S.R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0);
    S.dur = buf.length / SR; S.name = f.name.replace(/\.[^.]+$/, "");
    $("fileinfo").textContent = `${f.name} · ${fmt(S.dur).replace(/\.\d$/, "")} · ${buf.numberOfChannels === 1 ? "모노(한 채널)" : "스테레오"}`;
    for (const k of ["a", "b"]) $(k).max = S.dur.toFixed(1);
    setAB(0, Math.min(30, S.dur));
    $("s2").hidden = $("s3").hidden = false;
    log(`[음원] ${f.name} · ${S.dur.toFixed(1)}초 · ${(f.size / 1e6).toFixed(1)}MB`);
  } catch (e) {
    $("fileinfo").textContent = "이 파일은 풀지 못했어요. mp3나 m4a로 다시 해 보세요.";
  }
};

// ---------- 구간 ----------
function setAB(a, b) {
  a = Math.max(0, Math.min(a, S.dur)); b = Math.max(0, Math.min(b, S.dur));
  if (b - a < 2) { if (a + 2 <= S.dur) b = a + 2; else a = b - 2; }
  S.a = Math.round(a * 10) / 10; S.b = Math.round(b * 10) / 10;
  $("a").value = S.a; $("b").value = S.b; $("aTxt").textContent = fmt(S.a); $("bTxt").textContent = fmt(S.b);
}
$("a").oninput = () => setAB(+$("a").value, S.b);
$("b").oninput = () => setAB(S.a, +$("b").value);
document.querySelectorAll(".nudge button").forEach(btn => btn.onclick = () => {
  const d = +btn.dataset.d; btn.dataset.k === "a" ? setAB(S.a + d, S.b) : setAB(S.a, S.b + d);
});
$("hear").onclick = () => {
  const i0 = Math.round(S.a * SR), i1 = Math.round(S.b * SR);
  $("orig").src = url(wav([S.L.subarray(i0, i1), S.R.subarray(i0, i1)]));
  $("orig").hidden = false; $("orig").play();
};

// ---------- ① 가운데 소리 지우기: (왼−오) + 아주 낮은 소리(베이스)는 살림, 모노 ----------
function centerCut(L, R) {
  const n = L.length, out = new Float32Array(n), mid = new Float32Array(n);
  for (let i = 0; i < n; i++) mid[i] = (L[i] + R[i]) / 2;
  const low = biquadLP(biquadLP(mid, 120, 0.5412), 120, 1.3066);   // 4차 버터워스
  for (let i = 0; i < n; i++) out[i] = (L[i] - R[i]) / 2 + low[i];
  return { L: out, R: out };
}
function biquadLP(x, fc, Q) {
  const w = 2 * Math.PI * fc / SR, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}

// ---------- AI (워커) ----------
function runAI(L, R, model, engine, onStep) {
  if (!worker) worker = new Worker("worker.js");
  const id = ++jobId;
  return new Promise((res, rej) => {
    worker.onmessage = e => {
      const d = e.data;
      if (d.type === "step") onStep(d.text, d.pct);
      else if (d.id !== id) return;
      else if (d.type === "done") res(d);
      else if (d.type === "fail") rej(new Error(d.text));
    };
    worker.onerror = e => rej(new Error(e.message || "워커 오류"));
    const l = L.slice(), r = R.slice();
    worker.postMessage({ type: "run", id, L: l, R: r, sr: SR, model, engine }, [l.buffer, r.buffer]);
  });
}

// ---------- 만들기 ----------
$("go").onclick = async () => {
  if (S.busy || !S.L) return;
  S.busy = true; $("go").disabled = true; $("s4").hidden = true;
  const bar = document.querySelector(".bar"), fill = bar.firstElementChild;
  const step = (t, p) => { $("status").textContent = t; if (p != null) { bar.hidden = false; fill.style.width = (p * 100).toFixed(1) + "%"; } };
  const M = METHODS[S.method], a = S.a, b = S.b;
  const p0 = Math.max(0, a - MARGIN), p1 = Math.min(S.dur, b + MARGIN);
  const i0 = Math.round(p0 * SR), i1 = Math.round(p1 * SR);
  const L = S.L.subarray(i0, i1), R = S.R.subarray(i0, i1);
  const t0 = performance.now();
  let mr, info = null;
  try {
    if (S.method === "center") { step("가운데 소리 지우는 중…", null); await new Promise(r => setTimeout(r, 30)); mr = centerCut(L, R); }
    else {
      step("준비하는 중…", 0);
      const d = await runAI(L, R, M.model, $("gpu").checked ? "auto" : "cpu", step);
      mr = { L: d.L, R: d.R }; info = d.info;
    }
  } catch (e) {
    step("", null); bar.hidden = true;
    $("status").innerHTML = `<span class="err">못 만들었어요: ${e.message}</span>`;
    log(`[실패] ${M.label} · ${e.message}`, "err");
    S.busy = false; $("go").disabled = false; return;
  }
  const total = (performance.now() - t0) / 1000;
  bar.hidden = true; $("status").textContent = "다 됐어요. 아래에서 들어 보세요.";
  showResult(mr, i0, a, b);

  const len = (b - a).toFixed(1);
  let sum = `${M.label} · ${len}초 구간 · 걸린 시간 ${total.toFixed(1)}초`;
  let line = `[결과] ${M.label} · 구간 ${fmt(a)}~${fmt(b)} (${len}초) · 총 ${total.toFixed(1)}초`;
  if (info) {
    const eng = info.ep === "webgpu" ? "그래픽 칩" : `CPU(스레드 ${info.threads})`;
    const dl = info.reused ? "모델 이미 열림" : info.cached ? "모델 저장본 사용" : `모델 받기 ${info.dlSec.toFixed(1)}초`;
    const per = info.perRun.length ? (info.perRun.reduce((x, y) => x + y, 0) / info.perRun.length).toFixed(2) : "-";
    sum += ` (${eng} · ${dl} · 처리 ${info.runSec.toFixed(1)}초)`;
    line += ` · ${eng} · ${dl} · 준비 ${info.initSec.toFixed(1)}초 · 처리 ${info.runSec.toFixed(1)}초 = ${info.runs}조각 × 평균 ${per}초` +
            (info.why ? ` · WebGPU 안 씀: ${info.why}` : "") + (info.bad ? ` · 이상한 값 ${info.bad}개` : "");
  }
  $("sum").textContent = sum; log(line);
  window.__last = { method: S.method, a, b, p0, L: mr.L, R: mr.R, info, total };
  S.busy = false; $("go").disabled = false;
  if (info) refreshSaved();
};

function showResult(mr, i0, a, b) {
  for (const u of S.urls.splice(0)) URL.revokeObjectURL(u);
  const q0 = Math.round(Math.max(0, a - PRE) * SR), q1 = Math.round(Math.min(S.dur, b + POST) * SR);
  const ia = Math.round(a * SR), ib = Math.round(b * SR), xf = Math.round(XF * SR);
  const n = q1 - q0, oL = new Float32Array(n), oR = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    const i = q0 + j;
    let g = 0;
    if (i >= ia && i < ib) {
      g = 1;
      if (ia > 0 && i < ia + xf) g = (i - ia) / xf;
      if (ib < S.L.length && i >= ib - xf) g = Math.min(g, (ib - i) / xf);
    }
    const k = i - i0;
    oL[j] = g ? (1 - g) * S.L[i] + g * mr.L[k] : S.L[i];
    oR[j] = g ? (1 - g) * S.R[i] + g * mr.R[k] : S.R[i];
  }
  const joined = wav([oL, oR]);
  $("joined").src = url(joined);
  $("mronly").src = url(wav([mr.L.subarray(ia - i0, ib - i0), mr.R.subarray(ia - i0, ib - i0)]));
  $("dl").href = url(joined); $("dl").download = `${S.name}_MR시험_${S.method}.wav`;
  $("s4").hidden = false;
  $("s4").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- wav 만들기 (16비트 스테레오) ----------
function wav([L, R]) {
  const n = L.length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 4, true);
  const pcm = new Int16Array(buf, 44);
  for (let i = 0; i < n; i++) {
    pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767;
    pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767;
  }
  return new Blob([buf], { type: "audio/wav" });
}

$("copy").onclick = async () => {
  const text = [...$("log").children].map(d => d.textContent).join("\n");
  try { await navigator.clipboard.writeText(text); $("copy").textContent = "복사했어요"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("log")); getSelection().removeAllRanges(); getSelection().addRange(r); $("copy").textContent = "글자를 길게 눌러 복사해 주세요"; }
  setTimeout(() => $("copy").textContent = "기록 복사하기", 2500);
};
