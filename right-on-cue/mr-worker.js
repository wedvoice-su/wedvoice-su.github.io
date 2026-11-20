// 큐시트 음원 편집 · 하이라이트 앞 가사 빼기(MR): AI로 목소리를 빼는 일을 화면과 따로(워커에서) 해요. edit.js가 불러요.
// 모델: UVR MDX-Net (Hugging Face에서 받아 휴대폰 안에 저장, 다음부터는 다시 받지 않아요)
// 받는 것  { type:"run", id, L, R, sr, model:{url,nfft,dimF,primary,comp,mb}, engine:"auto"|"cpu" }
// 보내는 것 { type:"step", id, phase:"dl"|"init"|"run", a, b } … { type:"done", id, L, R, info } | { type:"fail", id, phase, text }
//   dl = 모델 받는 중 (a / b 바이트), init = 모델 준비 중, run = 목소리 빼는 중 (a / b 조각)

const ORT_VER = "1.22.0";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`;
importScripts(ORT_BASE + "ort.webgpu.min.js");
ort.env.wasm.wasmPaths = ORT_BASE;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const HOP = 1024, DIM_T = 256, CHUNK = HOP * (DIM_T - 1), OVERLAP = 0.25;
const CACHE = "cue-mr-models-v1";   // edit.js의 MR_CACHE와 같아야 해요
let SES = null;   // { key, session, ep }

let JOB = null, PHASE = "";
const say = (phase, a, b) => { PHASE = phase; postMessage({ type: "step", id: JOB, phase, a, b }); };

// ---------- 모델 받기 (한 번 받으면 Cache Storage에 저장) ----------
async function getModel(m) {
  let cache = null;
  try { cache = await caches.open(CACHE); } catch (e) {}
  if (cache) {
    const hit = await cache.match(m.url);
    if (hit) return { buf: await hit.arrayBuffer(), cached: true, sec: 0 };
    // 예전 주소로 받아 둔 모델이 남아 있으면 지워요 (모델 주소가 바뀌어도 30MB가 쌓이지 않게)
    try { for (const k of await cache.keys()) await cache.delete(k); } catch (e) {}
  }
  const t0 = performance.now();
  say("dl", 0, m.mb * 1e6);
  const res = await fetch(m.url);
  if (!res.ok) throw new Error("모델을 받지 못했어요 (" + res.status + ")");
  const total = +res.headers.get("content-length") || m.mb * 1e6;
  const reader = res.body.getReader(), parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    say("dl", got, total);
  }
  const buf = new Uint8Array(got);
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  const sec = (performance.now() - t0) / 1000;
  if (cache) { try { await cache.put(m.url, new Response(buf, { headers: { "content-length": String(got), "content-type": "application/octet-stream" } })); } catch (e) {} }
  return { buf: buf.buffer, cached: false, sec };
}

async function getSession(m, engine) {
  const key = m.url + "|" + engine;
  if (SES && SES.key === key) return { ...SES, reused: true };
  if (SES) { try { await SES.session.release(); } catch (e) {} SES = null; }
  const dl = await getModel(m);
  say("init");
  const t0 = performance.now();
  let session = null, ep = "wasm", why = "";
  if (engine === "auto" && self.navigator.gpu) {
    try {
      session = await ort.InferenceSession.create(dl.buf, { executionProviders: ["webgpu"] });
      ep = "webgpu";
    } catch (e) { why = String(e && e.message || e).slice(0, 120); session = null; }
  } else if (engine === "auto") why = "이 브라우저엔 WebGPU가 없어요";
  if (!session) session = await ort.InferenceSession.create(dl.buf, { executionProviders: ["wasm"] });
  SES = { key, session, ep, why, dl, initSec: (performance.now() - t0) / 1000 };
  return { ...SES, reused: false };
}

// ---------- FFT: 길이 N = r × 2^k (r = 1, 3, 5) ----------
function makeFFT(N) {
  let r = 1;
  for (const c of [3, 5]) if (N % c === 0) r = c;
  const M = N / r;
  if (M & (M - 1)) throw new Error("FFT 길이 " + N + "는 못 해요");
  const bits = Math.log2(M), rev = new Uint32Array(M);
  for (let i = 0; i < M; i++) { let x = i, y = 0; for (let b = 0; b < bits; b++) { y = (y << 1) | (x & 1); x >>= 1; } rev[i] = y; }
  const cM = new Float64Array(M / 2), sM = new Float64Array(M / 2);
  for (let i = 0; i < M / 2; i++) { cM[i] = Math.cos(-2 * Math.PI * i / M); sM[i] = Math.sin(-2 * Math.PI * i / M); }
  const cN = new Float64Array(N), sN = new Float64Array(N);   // W_N^k
  for (let k = 0; k < N; k++) { cN[k] = Math.cos(-2 * Math.PI * k / N); sN[k] = Math.sin(-2 * Math.PI * k / N); }
  const subR = [], subI = [];
  for (let j = 0; j < r; j++) { subR.push(new Float64Array(M)); subI.push(new Float64Array(M)); }
  const cr = new Float64Array(r * r), sr = new Float64Array(r * r);   // W_r^(j q)
  for (let j = 0; j < r; j++) for (let q = 0; q < r; q++) { cr[j * r + q] = Math.cos(-2 * Math.PI * j * q / r); sr[j * r + q] = Math.sin(-2 * Math.PI * j * q / r); }
  const tR = new Float64Array(r), tI = new Float64Array(r);

  function fft2(re, im) {   // 길이 M, 제자리
    for (let i = 0; i < M; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= M; size <<= 1) {
      const half = size >> 1, step = M / size;
      for (let s = 0; s < M; s += size) {
        for (let k = 0, w = 0; k < half; k++, w += step) {
          const a = s + k, b = a + half, wr = cM[w], wi = sM[w];
          const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
    }
  }
  // re, im: 길이 N (Float64Array), 제자리 정변환
  return function fft(re, im) {
    if (r === 1) { fft2(re, im); return; }
    for (let j = 0; j < r; j++) { const R = subR[j], I = subI[j]; for (let n = 0; n < M; n++) { R[n] = re[r * n + j]; I[n] = im[r * n + j]; } fft2(R, I); }
    for (let k = 0; k < M; k++) {
      for (let j = 0; j < r; j++) {
        const w = (j * k) % N, yr = subR[j][k], yi = subI[j][k];
        tR[j] = yr * cN[w] - yi * sN[w]; tI[j] = yr * sN[w] + yi * cN[w];
      }
      for (let q = 0; q < r; q++) {
        let xr = 0, xi = 0;
        for (let j = 0; j < r; j++) { const c = cr[j * r + q], s = sr[j * r + q]; xr += tR[j] * c - tI[j] * s; xi += tR[j] * s + tI[j] * c; }
        re[k + M * q] = xr; im[k + M * q] = xi;
      }
    }
  };
}

// ---------- 한 조각(CHUNK) → 모델 → 악기 소리(또는 목소리) ----------
function makeChunker(nfft, dimF) {
  const fft = makeFFT(nfft), P = nfft / 2;
  const win = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / nfft);   // periodic hann
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  const padL = new Float64Array(CHUNK + nfft), padR = new Float64Array(CHUNK + nfft);
  const input = new Float32Array(4 * dimF * DIM_T);
  const outL = new Float64Array(CHUNK + nfft), outR = new Float64Array(CHUNK + nfft), wsum = new Float64Array(CHUNK + nfft);
  for (let t = 0; t < DIM_T; t++) for (let i = 0; i < nfft; i++) wsum[t * HOP + i] += win[i] * win[i];
  const plane = dimF * DIM_T;

  function stft(L, R) {   // L, R: 길이 CHUNK → input [4, dimF, DIM_T]
    for (let i = 0; i < CHUNK + nfft; i++) {   // reflect 덧대기
      let j = i - P;
      if (j < 0) j = -j; else if (j >= CHUNK) j = 2 * (CHUNK - 1) - j;
      padL[i] = L[j]; padR[i] = R[j];
    }
    for (let t = 0; t < DIM_T; t++) {
      const o = t * HOP;
      for (let i = 0; i < nfft; i++) { re[i] = padL[o + i] * win[i]; im[i] = padR[o + i] * win[i]; }
      fft(re, im);
      for (let k = 0; k < dimF; k++) {
        const nk = k === 0 ? 0 : nfft - k;
        const zr = re[k], zi = im[k], cr = re[nk], ci = -im[nk];   // conj(Z[N-k])
        const at = k * DIM_T + t, keep = k < 3 ? 0 : 1;            // 맨 아래 3칸은 0 (원본 방식)
        input[at] = keep * (zr + cr) / 2;                // L 실수
        input[plane + at] = keep * (zi + ci) / 2;        // L 허수
        input[2 * plane + at] = keep * (zi - ci) / 2;    // R 실수
        input[3 * plane + at] = keep * -(zr - cr) / 2;   // R 허수
      }
    }
    return input;
  }

  function istft(spec) {   // spec [4, dimF, DIM_T] → outL, outR (길이 CHUNK)
    outL.fill(0); outR.fill(0);
    for (let t = 0; t < DIM_T; t++) {
      re.fill(0); im.fill(0);
      for (let k = 0; k < dimF && k <= P; k++) {
        const at = k * DIM_T + t;
        const ar = spec[at], ai = k === 0 ? 0 : spec[plane + at], br = spec[2 * plane + at], bi = k === 0 ? 0 : spec[3 * plane + at];
        re[k] = ar - bi; im[k] = ai + br;
        if (k > 0 && k < P) { re[nfft - k] = ar + bi; im[nfft - k] = br - ai; }
      }
      for (let i = 0; i < nfft; i++) im[i] = -im[i];   // 역변환 = conj(fft(conj)) / N
      fft(re, im);
      const o = t * HOP;
      for (let i = 0; i < nfft; i++) { outL[o + i] += re[i] / nfft * win[i]; outR[o + i] -= im[i] / nfft * win[i]; }
    }
    for (let i = 0; i < CHUNK; i++) { const w = Math.max(wsum[i + P], 1e-8); outL[i] = outL[i + P] / w; outR[i] = outR[i + P] / w; }
  }
  return { stft, istft, outL, outR };
}

async function separate(L, R, m, session) {
  const nfft = m.nfft, trim = nfft / 2, gen = CHUNK - 2 * trim, n = L.length;
  const pad = gen + trim - (n % gen), len = trim + n + pad;
  const mixL = new Float32Array(len), mixR = new Float32Array(len);
  mixL.set(L, trim); mixR.set(R, trim);
  const resL = new Float64Array(len), resR = new Float64Array(len), div = new Float64Array(len);
  const step = Math.floor((1 - OVERLAP) * CHUNK), ck = makeChunker(nfft, m.dimF);
  const partL = new Float32Array(CHUNK), partR = new Float32Array(CHUNK);
  const runs = Math.ceil(len / step), name = session.inputNames[0];
  const times = [];
  for (let i = 0, r = 0; i < len; i += step, r++) {
    say("run", r, runs);
    const end = Math.min(i + CHUNK, len), cnt = end - i;
    partL.fill(0); partR.fill(0);
    partL.set(mixL.subarray(i, end)); partR.set(mixR.subarray(i, end));
    const t0 = performance.now();
    const x = ck.stft(partL, partR);
    const feeds = {}; feeds[name] = new ort.Tensor("float32", x, [1, 4, m.dimF, DIM_T]);
    const out = await session.run(feeds);
    const y = out[session.outputNames[0]];
    const data = y.data instanceof Float32Array ? y.data : await y.getData();
    ck.istft(data);
    if (y.dispose) y.dispose();
    times.push((performance.now() - t0) / 1000);
    for (let j = 0; j < cnt; j++) {
      const w = cnt > 1 ? 0.5 - 0.5 * Math.cos(2 * Math.PI * j / (cnt - 1)) : 1;
      resL[i + j] += ck.outL[j] * w; resR[i + j] += ck.outR[j] * w; div[i + j] += w;
    }
  }
  const oL = new Float32Array(n), oR = new Float32Array(n), vocal = m.primary !== "Instrumental";
  let bad = 0;
  for (let j = 0; j < n; j++) {
    const d = Math.max(div[trim + j], 1e-8);
    let sL = resL[trim + j] / d * m.comp, sR = resR[trim + j] / d * m.comp;
    if (!isFinite(sL) || !isFinite(sR)) { bad++; sL = sR = 0; }
    oL[j] = vocal ? L[j] - sL : sL; oR[j] = vocal ? R[j] - sR : sR;
  }
  return { L: oL, R: oR, runs: times.length, times, bad };
}

onmessage = async (e) => {
  const d = e.data;
  if (d.type !== "run") return;
  JOB = d.id; PHASE = "";
  try {
    const t0 = performance.now();
    const s = await getSession(d.model, d.engine);
    const t1 = performance.now();
    const r = await separate(d.L, d.R, d.model, s.session);
    const t2 = performance.now();
    postMessage({ type: "done", id: d.id, L: r.L, R: r.R, info: {
      ep: s.ep, why: s.why, threads: ort.env.wasm.numThreads, cached: s.dl.cached, reused: s.reused,
      dlSec: s.dl.sec, initSec: s.reused ? 0 : s.initSec, prepSec: (t1 - t0) / 1000,
      runSec: (t2 - t1) / 1000, runs: r.runs, perRun: r.times, bad: r.bad,
    } }, [r.L.buffer, r.R.buffer]);
  } catch (err) {
    postMessage({ type: "fail", id: d.id, phase: PHASE, text: String(err && err.message || err) });
  }
};
