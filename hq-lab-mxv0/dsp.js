// 음질 올리기 시험: 소리 ↔ 스펙트럼(높낮이별 세기) 계산. worker.js가 불러 써요 (시험할 때는 node에서도 불러요).
// Apollo가 배운 방식 그대로: 44.1kHz, 한 칸 882개(20ms), 441개씩 옮김, hann 창, 양 끝은 거울처럼 접어서 덧댐.

const HQ_WIN = 882, HQ_HOP = 441, HQ_BIN = 442;

// ---------- FFT: 길이 N = 2 · 3 · 5 · 7 의 곱 (882 = 2 × 3 × 3 × 7 × 7) ----------
function hqMakeFFT(N) {
  const fac = [];
  let m = N;
  for (const p of [2, 3, 5, 7]) while (m % p === 0) { fac.push(p); m /= p; }
  if (m !== 1) throw new Error("FFT 길이 " + N + "는 못 해요");
  const cs = new Float64Array(N), sn = new Float64Array(N);          // e^(-2πik/N)
  for (let k = 0; k < N; k++) { cs[k] = Math.cos(-2 * Math.PI * k / N); sn[k] = Math.sin(-2 * Math.PI * k / N); }
  const tr = new Float64Array(8), ti = new Float64Array(8);

  // in[io + j·st] (j = 0 … n-1) → out[oo … oo+n)
  function rec(inR, inI, io, st, outR, outI, oo, n, lv) {
    if (n === 1) { outR[oo] = inR[io]; outI[oo] = inI[io]; return; }
    const p = fac[lv], mm = n / p, tw = N / n, tp = N / p;
    for (let j = 0; j < p; j++) rec(inR, inI, io + j * st, st * p, outR, outI, oo + j * mm, mm, lv + 1);
    if (p === 2) {
      for (let k = 0; k < mm; k++) {
        const a = oo + k, b = a + mm, w = k * tw;
        const xr = outR[b] * cs[w] - outI[b] * sn[w], xi = outR[b] * sn[w] + outI[b] * cs[w];
        outR[b] = outR[a] - xr; outI[b] = outI[a] - xi; outR[a] += xr; outI[a] += xi;
      }
      return;
    }
    for (let k = 0; k < mm; k++) {
      for (let j = 0; j < p; j++) {
        const at = oo + j * mm + k, w = (j * k * tw) % N;
        tr[j] = outR[at] * cs[w] - outI[at] * sn[w]; ti[j] = outR[at] * sn[w] + outI[at] * cs[w];
      }
      for (let q = 0; q < p; q++) {
        let xr = tr[0], xi = ti[0];
        for (let j = 1; j < p; j++) { const w = ((j * q) % p) * tp; xr += tr[j] * cs[w] - ti[j] * sn[w]; xi += tr[j] * sn[w] + ti[j] * cs[w]; }
        outR[oo + q * mm + k] = xr; outI[oo + q * mm + k] = xi;
      }
    }
  }
  // 정변환: (inR, inI) → (outR, outI). 들어온 것과 나가는 것은 다른 배열이어야 해요
  return function fft(inR, inI, outR, outI) { rec(inR, inI, 0, 1, outR, outI, 0, N, 0); };
}

// ---------- 한 곡(구간)을 조각조각 스펙트럼으로 바꾸고, 다시 소리로 합치는 도구 ----------
// L, R: Float32Array (길이 n). 모노면 R = null
function hqMakeStft(L, R, n) {
  const N = HQ_WIN, H = HQ_HOP, F = HQ_BIN, P = N / 2;
  if (n <= P) throw new Error("소리가 너무 짧아요");
  const fft = hqMakeFFT(N), frames = 1 + Math.floor(n / H);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const aR = new Float64Array(N), aI = new Float64Array(N), bR = new Float64Array(N), bI = new Float64Array(N);
  const outL = new Float32Array(n + N), outR = R ? new Float32Array(n + N) : null;
  const at = i => { let j = i - P; if (j < 0) j = -j; else if (j >= n) j = 2 * (n - 1) - j; return j; };

  // t0 … t0+cnt-1 번째 칸의 스펙트럼을 [2, 442, W] 모양(실수 판, 허수 판)의 xL, xR 앞쪽 cnt칸에 적어요 (나머지 칸은 건드리지 않아요)
  function analyze(t0, cnt, W, xL, xR) {
    const plane = F * W;
    for (let t = 0; t < cnt; t++) {
      const o = (t0 + t) * H;
      for (let i = 0; i < N; i++) { const j = at(o + i); aR[i] = L[j] * win[i]; aI[i] = R ? R[j] * win[i] : 0; }
      fft(aR, aI, bR, bI);
      for (let k = 0; k < F; k++) {
        const nk = k === 0 ? 0 : N - k;
        const zr = bR[k], zi = bI[k], cr = bR[nk], ci = -bI[nk];     // conj(Z[N-k])
        const p = k * W + t;
        xL[p] = (zr + cr) / 2; xL[plane + p] = (zi + ci) / 2;
        if (xR) { xR[p] = (zi - ci) / 2; xR[plane + p] = -(zr - cr) / 2; }
      }
    }
  }

  // 모델이 낸 스펙트럼 yL, yR ([2, 442, W]) 의 a … b-1 번째 칸을 소리로 바꿔 쌓아요. 칸 j 는 곡의 (t0 + j) 번째 칸이에요
  function synth(t0, W, a, b, yL, yR) {
    const plane = F * W;
    for (let t = a; t < b; t++) {
      aR.fill(0); aI.fill(0);
      for (let k = 0; k < F; k++) {
        const p = k * W + t, edge = k === 0 || k === P;
        const lr = yL[p], li = edge ? 0 : yL[plane + p], rr = yR ? yR[p] : 0, ri = (edge || !yR) ? 0 : yR[plane + p];
        // Z[k] = A + iB, Z[N-k] = conj(A) + i·conj(B). 역변환 = conj(fft(conj(Z))) / N 이라 conj(Z)를 넣어요
        aR[k] = lr - ri; aI[k] = -(li + rr);
        if (!edge) { aR[N - k] = lr + ri; aI[N - k] = -(rr - li); }
      }
      fft(aR, aI, bR, bI);
      const o = (t0 + t) * H;
      for (let i = 0; i < N; i++) {
        const w = win[i];
        outL[o + i] += bR[i] / N * w;
        if (outR) outR[o + i] -= bI[i] / N * w;
      }
    }
  }

  // 다 쌓은 뒤: 창 값(겹친 두 칸의 창² 합)으로 나누고 앞뒤 덧댄 부분을 잘라서 돌려줘요. 쌓던 배열을 그대로 써요 (메모리 아끼기)
  function finish() {
    for (let i = 0; i < n; i++) {
      const p = i + P, t1 = Math.floor(p / H);
      let w = 0;
      if (t1 < frames) { const a = win[p - t1 * H]; w += a * a; }
      if (t1 - 1 < frames) { const a = win[p - (t1 - 1) * H]; w += a * a; }
      w = Math.max(w, 1e-11);
      outL[i] = outL[p] / w;
      if (outR) outR[i] = outR[p] / w;
    }
    return { L: outL.subarray(0, n), R: outR ? outR.subarray(0, n) : null };
  }
  return { frames, analyze, synth, finish };
}

// ---------- 이어 달리기 계획: 한 번에 TC칸씩 넣어요. 모델 출력은 DELAY칸(54) 늦게 나와요 ----------
// (모델이 시간 쪽으로 앞뒤 54칸을 봐서, 직전 칸들을 기억(state)으로 넘겨 가며 이어 계산해요. 통째로 한 것과 값이 같아요)
// 돌려주는 것: [{ in0: 넣을 첫 칸, cnt: 넣을 칸 수(모자라면 나머지는 0), o0: 출력 0번 칸이 가리키는 곡의 칸, a·b: 출력에서 쓸 칸 [a, b) }]
const HQ_DELAY = 54;
function hqStreamPlan(frames, TC, delay) {
  const D = delay == null ? HQ_DELAY : delay, runs = Math.ceil((frames + D) / TC), out = [];
  for (let k = 0; k < runs; k++) {
    const in0 = k * TC, cnt = Math.max(0, Math.min(TC, frames - in0)), o0 = in0 - D;
    out.push({ in0, cnt, o0, a: Math.max(0, -o0), b: Math.max(0, Math.min(TC, frames - o0)) });
  }
  return out;
}

// ---------- 음원에 높은 소리가 어디까지 들어 있나 ----------
// 곡 전체에서 골고루 count칸을 뽑아 높낮이별 평균 세기(442칸, 1칸 = 50Hz)를 구해요. 왼쪽 · 오른쪽을 더한 세기예요
function hqAvgSpectrum(L, R, n, count) {
  const N = HQ_WIN, F = HQ_BIN, fft = hqMakeFFT(N), avg = new Float64Array(F);
  const aR = new Float64Array(N), aI = new Float64Array(N), bR = new Float64Array(N), bI = new Float64Array(N);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const frames = Math.max(1, Math.min(count, Math.floor((n - N) / HQ_HOP)));
  if (n < N) return avg;
  for (let f = 0; f < frames; f++) {
    const o = Math.floor(f * (n - N) / frames);
    for (let i = 0; i < N; i++) { aR[i] = L[o + i] * win[i]; aI[i] = R ? R[o + i] * win[i] : 0; }
    fft(aR, aI, bR, bI);
    for (let k = 0; k < F; k++) { const nk = k === 0 ? 0 : N - k; avg[k] += bR[k] * bR[k] + bI[k] * bI[k] + bR[nk] * bR[nk] + bI[nk] * bI[nk]; }
  }
  for (let k = 0; k < F; k++) avg[k] /= frames;
  return avg;
}
// 평균 세기(442칸)에서 "소리가 있는 가장 높은 곳"(Hz). 가장 큰 곳보다 HQ_CEIL_DB 만큼 작은 소리까지를 "있다"고 봐요
const HQ_CEIL_DB = 80;
function hqCeiling(avg) {
  const F = avg.length, sm = new Float64Array(F);
  let ref = 0;
  for (let k = 0; k < F; k++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, k - 2); j <= Math.min(F - 1, k + 2); j++) { s += avg[j]; c++; }
    sm[k] = s / c; if (sm[k] > ref) ref = sm[k];
  }
  if (!(ref > 0)) return 0;
  const thr = ref * Math.pow(10, -HQ_CEIL_DB / 10);
  for (let k = F - 1; k >= 2; k--) if (sm[k] > thr && sm[k - 1] > thr && sm[k - 2] > thr) return k * 50;
  return 0;
}
// 16kHz 위 소리가 전체에서 차지하는 크기 (dB. 0에 가까울수록 많아요)
function hqHighDb(avg) {
  let hi = 0, all = 0;
  for (let k = 0; k < avg.length; k++) { all += avg[k]; if (k >= 320) hi += avg[k]; }
  return all > 0 ? 10 * Math.log10(hi / all + 1e-20) : -200;
}

if (typeof module !== "undefined") module.exports = { HQ_WIN, HQ_HOP, HQ_BIN, HQ_DELAY, HQ_CEIL_DB, hqMakeFFT, hqMakeStft, hqStreamPlan, hqAvgSpectrum, hqCeiling, hqHighDb };
