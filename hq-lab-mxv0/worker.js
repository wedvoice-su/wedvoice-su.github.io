// 음질 올리기 시험: AI(Apollo)로 깎인 소리를 채우는 일을 화면과 따로(워커에서) 해요. app.js가 불러요.
// 모델: Apollo (Kai Li, Yi Luo · CC BY-SA 4.0) 를 ONNX로 바꾼 것. Hugging Face에서 받아 휴대폰 안에 저장하고, 다음부터는 다시 받지 않아요.
// 받는 것  { type:"run", id, L, R(모노면 null), keep:[k0, k1], model:{url, mb}, engine:"auto"|"cpu", tc, cols }
//   L · R = 올릴 부분 + 앞뒤 여분(0.75초쯤). keep = 그 가운데 돌려줄 부분. tc = 한 번에 넣는 칸 수 (1칸 = 0.01초)
// 보내는 것 { type:"step", id, phase:"dl"|"init"|"run", a, b } … { type:"done", id, L, R, info, pic } | { type:"fail", id, phase, text }
//   dl = 모델 받는 중 (a / b 바이트), init = 모델 준비 중, run = 음질 올리는 중 (a / b 조각)

// 시험할 때만: new Worker("worker.js?ort=1.24.3") 처럼 다른 버전을 불러 볼 수 있어요 (숫자.숫자.숫자 모양만)
const ORT_ASK = new URLSearchParams(self.location.search).get("ort") || "";
const ORT_VER = /^\d+\.\d+\.\d+$/.test(ORT_ASK) ? ORT_ASK : "1.22.0";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`;
importScripts(ORT_BASE + "ort.webgpu.min.js", "dsp.js");
ort.env.wasm.wasmPaths = ORT_BASE;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const CACHE = "hq-lab-models-v1";   // app.js의 CACHE와 같아야 해요
let SES = null;                     // { key, session, ep, why, dl, initSec }
let JOB = null, PHASE = "";
const say = (phase, a, b) => { PHASE = phase; postMessage({ type: "step", id: JOB, phase, a, b }); };

// ---------- 모델 받기 (한 번 받으면 Cache Storage에 저장) ----------
async function getModel(m) {
  let cache = null;
  try { cache = await caches.open(CACHE); } catch (e) {}
  if (cache) {
    const hit = await cache.match(m.url);
    if (hit) return { buf: await hit.arrayBuffer(), cached: true, sec: 0 };
    // 예전 주소로 받아 둔 모델이 남아 있으면 지워요 (모델 주소가 바뀌어도 쌓이지 않게)
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
    say("dl", got, Math.max(total, got));
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
    } catch (e) { why = String(e && e.message || e).slice(0, 160); session = null; }
  } else if (engine === "auto") why = "이 브라우저엔 WebGPU가 없어요";
  if (!session) session = await ort.InferenceSession.create(dl.buf, { executionProviders: ["wasm"] });
  SES = { key, session, ep, why, dl: { cached: dl.cached, sec: dl.sec }, initSec: (performance.now() - t0) / 1000 };
  return { ...SES, reused: false };
}

// ---------- 음질 올리기: TC칸씩 스펙트럼 → 모델 → 다시 소리 (이어 달리기) ----------
// L, R: 앞뒤에 여분을 붙인 소리. keep = [k0, k1): 돌려줄 부분 (여분을 뺀 곳)
const STATE_N = 18 * 80 * 6 * 256;
async function restore(L, R, keep, session, tc, cols) {
  const n = L.length, F = HQ_BIN, H = HQ_HOP, st = hqMakeStft(L, R, n), plan = hqStreamPlan(st.frames, tc);
  const nch = R ? 2 : 1, runs = plan.length * nch;
  // 그림(스펙트로그램)용: 돌려줄 부분만, 가로 W칸 × 세로 442칸에 소리 세기를 모아요 (전 · 후)
  const f0 = Math.ceil(keep[0] / H), f1 = Math.max(f0 + 1, Math.min(st.frames, Math.ceil(keep[1] / H)));
  const W = Math.max(1, Math.min(cols || 360, f1 - f0));
  const picIn = new Float32Array(W * F), picOut = new Float32Array(W * F), picCnt = new Uint32Array(W);
  const times = [], size = 2 * F * tc;
  const xL = new Float32Array(size), xR = R ? new Float32Array(size) : null;
  let stL = new Float32Array(STATE_N), stR = R ? new Float32Array(STATE_N) : null;      // 기억(직전 6칸 × 18군데). 처음엔 0
  let r = 0;

  const runOne = async (x, state) => {
    const t0 = performance.now();
    const out = await session.run({ spec: new ort.Tensor("float32", x, [1, 2, F, tc]), state: new ort.Tensor("float32", state, [18, 80, 6, 256]) });
    const y = out.out, s2 = out.state_out;
    const data = y.data instanceof Float32Array ? y.data : await y.getData();
    const next = s2.data instanceof Float32Array ? s2.data : await s2.getData();
    if (y.dispose) y.dispose(); if (s2.dispose) s2.dispose();
    times.push((performance.now() - t0) / 1000);
    for (let i = 0; i < data.length; i += 97) if (!isFinite(data[i])) throw new Error("계산 결과에 이상한 값이 나왔어요");
    say("run", ++r, runs);
    return { data, next };
  };
  // 배열 x 의 j0 … j1-1 번째 칸 (칸 j = 곡의 t0 + j 번째 칸) 의 세기를 그림에 더해요
  const addPic = (pic, x, t0, j0, j1, count) => {
    const plane = F * tc;
    for (let j = j0; j < j1; j++) {
      const t = t0 + j;
      if (t < f0 || t >= f1) continue;
      const col = Math.min(W - 1, Math.floor((t - f0) * W / (f1 - f0)));
      if (count) picCnt[col]++;
      for (let k = 0; k < F; k++) { const p = k * tc + j, re = x[p], im = x[plane + p]; pic[col * F + k] += re * re + im * im; }
    }
  };

  say("run", 0, runs);
  for (const c of plan) {
    xL.fill(0); if (xR) xR.fill(0);                       // 곡이 끝난 뒤 칸은 0 (밀어내기)
    if (c.cnt) st.analyze(c.in0, c.cnt, tc, xL, xR);
    addPic(picIn, xL, c.in0, 0, c.cnt, true); if (xR) addPic(picIn, xR, c.in0, 0, c.cnt, false);
    const a = await runOne(xL, stL); stL = a.next;
    let b = null;
    if (xR) { b = await runOne(xR, stR); stR = b.next; }
    if (c.b > c.a) {
      st.synth(c.o0, tc, c.a, c.b, a.data, b ? b.data : null);
      addPic(picOut, a.data, c.o0, c.a, c.b, false); if (b) addPic(picOut, b.data, c.o0, c.a, c.b, false);
    }
  }
  for (let col = 0; col < W; col++) {
    const d = Math.max(1, picCnt[col]) * nch;
    for (let k = 0; k < F; k++) { picIn[col * F + k] /= d; picOut[col * F + k] /= d; }
  }
  const o = st.finish();
  return { L: o.L.subarray(keep[0], keep[1]), R: o.R ? o.R.subarray(keep[0], keep[1]) : null,
           runs: times.length, times, frames: st.frames, pic: { w: W, h: F, a: picIn, b: picOut } };
}

onmessage = async (e) => {
  const d = e.data;
  if (d.type !== "run") return;
  JOB = d.id; PHASE = "";
  try {
    const t0 = performance.now();
    const s = await getSession(d.model, d.engine);
    const t1 = performance.now();
    const keep = d.keep || [0, d.L.length];
    const r = await restore(d.L, d.R, keep, s.session, d.tc, d.cols);
    const t2 = performance.now();
    const move = [r.L.buffer, r.pic.a.buffer, r.pic.b.buffer]; if (r.R) move.push(r.R.buffer);
    postMessage({ type: "done", id: d.id, L: r.L, R: r.R, pic: r.pic, info: {
      ep: s.ep, why: s.why, threads: ort.env.wasm.numThreads, cached: s.dl.cached, reused: s.reused,
      dlSec: s.dl.sec, initSec: s.reused ? 0 : s.initSec, prepSec: (t1 - t0) / 1000,
      runSec: (t2 - t1) / 1000, runs: r.runs, perRun: r.times, frames: r.frames, tc: d.tc,
    } }, move);
  } catch (err) {
    postMessage({ type: "fail", id: d.id, phase: PHASE, text: String(err && err.message || err) });
  }
};
