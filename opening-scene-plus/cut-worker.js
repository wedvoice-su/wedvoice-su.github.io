// 식전영상 · 인물만 오려 내기: AI로 사람 자리를 찾는 일을 화면과 따로(워커에서) 해요. app.js가 불러요. (right-on-cue/mr-worker.js와 같은 방식)
// 모델: MODNet (Apache-2.0, 사람 사진에서 사람만 가려내는 모델). Hugging Face에서 받아 휴대폰 안에 저장해 두고(Cache Storage), 다음부터는 다시 받지 않아요.
// 사진은 이 워커 안에서만 쓰여요. 어디에도 보내지 않아요 (받는 것은 모델 파일과 계산 도구뿐).
// 받는 것  { type:"run", id, rgba(줄인 사진의 점들), w, h, model:{ url, mb }, engine:"auto"|"cpu" }
// 보내는 것 { type:"step", id, phase:"dl"|"init"|"run", a, b } … { type:"done", id, alpha(w×h, 0~255), info } | { type:"fail", id, phase, text }
//   dl = 모델 받는 중 (a / b 바이트), init = 모델 준비 중, run = 사람을 찾는 중

const ORT_VER = "1.22.0";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`;
importScripts(ORT_BASE + "ort.webgpu.min.js");
ort.env.wasm.wasmPaths = ORT_BASE;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

const CACHE = "scene-cut-models-v1";   // app.js의 CUT_CACHE와 같아야 해요
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
    } catch (e) { why = String(e && e.message || e).slice(0, 160); session = null; }
  } else if (engine === "auto") why = "이 브라우저엔 WebGPU가 없어요";
  if (!session) session = await ort.InferenceSession.create(dl.buf, { executionProviders: ["wasm"] });
  SES = { key, session, ep, why, dl, initSec: (performance.now() - t0) / 1000 };
  return { ...SES, reused: false };
}

// ---------- 사진(줄인 것) → 모델 → 사람 자리(0~255) ----------
// 모델에 넣는 값: 빨강·초록·파랑을 -1~1로 (원 모델과 같은 방식), 모양 [1, 3, 높이, 너비]
async function matte(rgba, w, h, session) {
  const n = w * h, x = new Float32Array(3 * n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    x[i] = rgba[p] / 127.5 - 1; x[n + i] = rgba[p + 1] / 127.5 - 1; x[2 * n + i] = rgba[p + 2] / 127.5 - 1;
  }
  const feeds = {}; feeds[session.inputNames[0]] = new ort.Tensor("float32", x, [1, 3, h, w]);
  const out = await session.run(feeds);
  const y = out[session.outputNames[0]];
  const data = y.data instanceof Float32Array ? y.data : await y.getData();
  if (data.length !== n) throw new Error("모델 결과 크기가 달라요 (" + data.length + " / " + n + ")");
  const a = new Uint8Array(n);
  let bad = 0;
  for (let i = 0; i < n; i++) { const v = data[i]; if (!isFinite(v)) { bad++; continue; } a[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255); }
  if (y.dispose) y.dispose();
  return { a, bad };
}

onmessage = async (e) => {
  const d = e.data;
  if (d.type !== "run") return;
  JOB = d.id; PHASE = "";
  try {
    const t0 = performance.now();
    let s = await getSession(d.model, d.engine), r, t1 = performance.now(), retried = "";
    say("run", 0, 1);
    try { r = await matte(d.rgba, d.w, d.h, s.session); if (r.bad > d.w * d.h * .01) throw new Error("결과에 못 쓰는 값이 있어요"); }
    catch (err) {
      // 그래픽 칩(WebGPU)에서 못 돌리는 기기: 느리지만 어디서나 되는 방식(WASM)으로 한 번 더
      if (s.ep !== "webgpu") throw err;
      retried = String(err && err.message || err).slice(0, 160);
      try { await s.session.release(); } catch (_) {}
      SES = null;
      s = await getSession(d.model, "cpu"); t1 = performance.now();
      say("run", 0, 1);
      r = await matte(d.rgba, d.w, d.h, s.session);
    }
    const t2 = performance.now();
    postMessage({ type: "done", id: d.id, alpha: r.a, w: d.w, h: d.h, info: {
      ep: s.ep, why: s.why || retried, threads: ort.env.wasm.numThreads, cached: s.dl.cached, reused: s.reused,
      dlSec: s.reused ? 0 : s.dl.sec, initSec: s.reused ? 0 : s.initSec, prepSec: (t1 - t0) / 1000, runSec: (t2 - t1) / 1000, bad: r.bad,   // reused: 이미 열어 둔 모델을 그대로 씀 (받지도 준비하지도 않음)
    } }, [r.a.buffer]);
  } catch (err) {
    postMessage({ type: "fail", id: d.id, phase: PHASE, text: String(err && err.message || err) });
  }
};
