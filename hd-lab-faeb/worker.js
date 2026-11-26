// 영상 고화질로 바꾸기 시험 · AI를 돌리는 곳 (화면과 따로, 워커). app.js가 불러요. (opening-scene-plus/cut-worker.js와 같은 방식)
// 모델: Real-ESRGAN general x4v3 (BSD-3-Clause, Xintao Wang 2021) — 장면 한 장을 넣으면 가로·세로 4배로 또렷하게 키워 줘요. 같은 폴더 model/ 에서 받아요.
// 장면은 이 워커 안에서만 쓰여요. 어디에도 보내지 않아요 (받는 것은 모델 파일과 계산 도구뿐).
// 받는 것  { type:"init", id, engine:"auto"|"cpu", prec:"auto"|"fp16"|"fp32" }
//          { type:"frame", id, rgba(w×h 장면의 점들), w, h }
// 보내는 것 { type:"step", id, phase:"dl"|"init", a, b } · { type:"ready", id, info }
//          { type:"tile", id, k, n } · { type:"done", id, rgba(4w×4h), w, h, ms, tiles } · { type:"fail", id, phase, text }

const ORT_VER = "1.22.0";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`;
importScripts(ORT_BASE + "ort.webgpu.min.js");
ort.env.wasm.wasmPaths = ORT_BASE;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

// 모델 두 판: 절반 정밀도(fp16, 2.4MB, 빠름) · 온 정밀도(fp32, 4.9MB). 결과 차이는 눈에 안 보여요 (평균 0.17 / 255)
const MODELS = { fp16: { url: "model/realesr-general-x4v3-fp16.onnx", mb: 2.4 }, fp32: { url: "model/realesr-general-x4v3.onnx", mb: 4.9 } };
const SCALE = 4;
const PAD = 12;          // 조각으로 나눌 때 이웃 조각과 겹치는 여분 (조각 가장자리가 어색하지 않게. 겹친 곳의 절반씩만 써요)
const AREA = 160000;     // 한 번에 넣는 조각의 넓이 한도 (점 수). 480×270 영상은 통째로, 그보다 크면 나눠서 넣어요 → 휴대폰 메모리를 넘지 않게
let SES = null;          // { session, ep, prec, why, dlSec, initSec }
let JOB = null, PHASE = "";
const say = (phase, a, b) => { PHASE = phase; postMessage({ type: "step", id: JOB, phase, a, b }); };
const BYTES = {};

async function getModel(prec) {
  if (BYTES[prec]) return { buf: BYTES[prec], sec: 0 };
  const m = MODELS[prec], t0 = performance.now();
  say("dl", 0, m.mb * 1e6);
  const res = await fetch(m.url);
  if (!res.ok) throw new Error("모델을 받지 못했어요 (" + res.status + ")");
  const total = +res.headers.get("content-length") || m.mb * 1e6, reader = res.body.getReader(), parts = [];
  let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; say("dl", got, total); }
  const buf = new Uint8Array(got);
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  BYTES[prec] = buf;
  return { buf, sec: (performance.now() - t0) / 1000 };
}

// 장면 조각(tw×th, rgba 안의 tx·ty 자리) → 모델 → 4배 조각의 값들 (빨강 면 · 초록 면 · 파랑 면, 0~1)
async function runTile(session, rgba, w, tx, ty, tw, th) {
  const n = tw * th, x = new Float32Array(3 * n);
  for (let yy = 0; yy < th; yy++) {
    let p = ((ty + yy) * w + tx) * 4, i = yy * tw;
    for (let xx = 0; xx < tw; xx++, p += 4, i++) { x[i] = rgba[p] / 255; x[n + i] = rgba[p + 1] / 255; x[2 * n + i] = rgba[p + 2] / 255; }
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", x, [1, 3, th, tw]) });
  const y = out[session.outputNames[0]];
  const data = y.data instanceof Float32Array ? y.data : await y.getData();
  if (y.dispose) y.dispose();
  if (data.length !== 3 * n * SCALE * SCALE) throw new Error("모델 결과 크기가 달라요");
  return data;
}

// 이 기기에서 모델이 제대로 도는지: 작은 그림(48×48, 부드러운 색 띠)을 넣어 보고, 결과가 넣은 그림과 비슷한지 봐요 (못 쓰는 값이나 엉뚱한 그림이면 탈락)
async function sane(session) {
  const w = 48, h = 48, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4) { rgba[p] = 40 + x * 3; rgba[p + 1] = 60 + y * 3; rgba[p + 2] = 120 + ((x + y) & 15) * 4; rgba[p + 3] = 255; }
  const d = await runTile(session, rgba, w, 0, 0, w, h), W = w * SCALE, n = W * h * SCALE;
  let bad = 0, diff = 0, cnt = 0;
  for (let y = 0; y < h * SCALE; y += 3) for (let x = 0; x < W; x += 3) {
    const i = y * W + x, p = ((y >> 2) * w + (x >> 2)) * 4;
    for (let c = 0; c < 3; c++) { const v = d[c * n + i]; if (!isFinite(v)) { bad++; continue; } diff += Math.abs(v - rgba[p + c] / 255); cnt++; }
  }
  const mean = cnt ? diff / cnt : 1;
  return { ok: bad === 0 && mean < .12, bad, mean: +mean.toFixed(4) };
}

async function getSession(engine, prec) {
  // 해 볼 순서: 그래픽 칩 + 절반 정밀도 → 그래픽 칩 + 온 정밀도 → 그래픽 칩 없이(WASM, 아주 느림)
  let plan = [["webgpu", "fp16"], ["webgpu", "fp32"], ["wasm", "fp32"]];
  if (engine === "cpu" || !self.navigator.gpu) plan = plan.filter(p => p[0] === "wasm");
  if (prec === "fp16" || prec === "fp32") { const only = plan.filter(p => p[1] === prec); if (only.length) plan = only; }
  const why = [];
  if (engine !== "cpu" && !self.navigator.gpu) why.push("이 브라우저엔 WebGPU가 없어요");
  for (const [ep, pr] of plan) {
    let session = null;
    try {
      const dl = await getModel(pr);
      say("init");
      const t0 = performance.now();
      session = await ort.InferenceSession.create(dl.buf, { executionProviders: [ep] });
      const s = await sane(session);
      if (!s.ok) throw new Error(`시험 그림이 이상해요 (못 쓰는 값 ${s.bad}, 차이 ${s.mean})`);
      return { session, ep, prec: pr, why: why.join(" / "), dlSec: dl.sec, initSec: (performance.now() - t0) / 1000 };
    } catch (e) {
      why.push(`${ep} ${pr}: ${String(e && e.message || e).slice(0, 140)}`);
      if (session) { try { await session.release(); } catch (_) {} }
    }
  }
  throw new Error(why.join(" / ") || "모델을 열지 못했어요");
}

// 영상의 가로(또는 세로) v를 조각으로: 조각 길이 t, 시작 자리들 at, 조각마다 맡는 곳의 경계 cut (이웃과 겹친 곳의 한가운데)
function split(v, n) {
  const t = n === 1 ? v : Math.min(v, Math.ceil(v / n) + 2 * PAD), at = [], cut = [0];
  for (let k = 0; k < n; k++) at.push(n === 1 ? 0 : Math.round(k * (v - t) / (n - 1)));
  for (let k = 1; k < n; k++) cut.push(Math.round((at[k - 1] + t + at[k]) / 2));
  cut.push(v);
  return { t, at, cut };
}
function grid(w, h) {
  let nx = 1, ny = 1;
  const side = (v, n) => (n === 1 ? v : Math.min(v, Math.ceil(v / n) + 2 * PAD));
  while (side(w, nx) * side(h, ny) > AREA && (nx < 8 || ny < 8)) { if (side(w, nx) >= side(h, ny)) nx++; else ny++; }
  return { X: split(w, nx), Y: split(h, ny), nx, ny };
}

async function upscale(rgba, w, h, id) {
  const g = grid(w, h), W = w * SCALE, H = h * SCALE, out = new Uint8ClampedArray(W * H * 4), n = g.nx * g.ny;
  let k = 0;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const tx = g.X.at[i], ty = g.Y.at[j], tw = g.X.t, th = g.Y.t;
    const d = await runTile(SES.session, rgba, w, tx, ty, tw, th);
    const TW = tw * SCALE, plane = TW * th * SCALE;
    const x0 = g.X.cut[i] * SCALE, x1 = g.X.cut[i + 1] * SCALE, y0 = g.Y.cut[j] * SCALE, y1 = g.Y.cut[j + 1] * SCALE;
    for (let oy = y0; oy < y1; oy++) {
      let q = (oy * W + x0) * 4, s = (oy - ty * SCALE) * TW + (x0 - tx * SCALE);
      for (let ox = x0; ox < x1; ox++, q += 4, s++) { out[q] = d[s] * 255; out[q + 1] = d[plane + s] * 255; out[q + 2] = d[2 * plane + s] * 255; out[q + 3] = 255; }
    }
    k++;
    if (n > 1) { postMessage({ type: "tile", id, k, n }); await new Promise(r => setTimeout(r, 0)); }   // 조각 사이에 숨을 돌려요 (화면이 멈추지 않게)
  }
  return { out, W, H, tiles: n };
}

onmessage = async (e) => {
  const d = e.data;
  JOB = d.id; PHASE = "";
  try {
    if (d.type === "init") {
      if (SES) { try { await SES.session.release(); } catch (_) {} SES = null; }
      SES = await getSession(d.engine || "auto", d.prec || "auto");
      postMessage({ type: "ready", id: d.id, info: { ep: SES.ep, prec: SES.prec, why: SES.why, dlSec: SES.dlSec, initSec: SES.initSec, threads: ort.env.wasm.numThreads, mb: MODELS[SES.prec].mb } });
    } else if (d.type === "frame") {
      if (!SES) throw new Error("모델이 아직 준비되지 않았어요");
      PHASE = "run";
      const t0 = performance.now(), r = await upscale(d.rgba, d.w, d.h, d.id);
      postMessage({ type: "done", id: d.id, rgba: r.out, w: r.W, h: r.H, ms: performance.now() - t0, tiles: r.tiles }, [r.out.buffer]);
    }
  } catch (err) {
    postMessage({ type: "fail", id: d.id, phase: PHASE, text: String(err && err.message || err).slice(0, 400) });
  }
};
