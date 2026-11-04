// 식전영상 엔진: 장면 순서 만들기 → 한 장씩 그리기 → MP4로 묶기. 화면은 app.js, 템플릿 디자인은 templates.js
// 영상 압축은 lib/의 Mediabunny 1.64.0(MPL-2.0)이 브라우저에 들어 있는 웹코덱스(WebCodecs)로 해요. 서버로 아무것도 보내지 않아요.
//  - 아이폰·맥 사파리: Mediabunny가 영상을 Baseline 방식으로 만들어요(사파리 영상 멈춤 버그 우회). 같은 화질을 내려고 비트레이트를 조금 더 줘요.
//  - 음악 압축: 사파리는 보조 인코더(WASM AAC), 나머지는 브라우저 내장 AAC
//  - 파일은 되도록 휴대폰 저장 공간(OPFS)에 바로 써서 메모리를 아껴요. 안 되면 메모리에 모아요.

const Movie = (() => {
  const FPS = 30, SR = 48000, ABR = 192000;
  const UA = navigator.userAgent;
  const IOS = /iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/i.test(UA);
  const MOBILE = IOS || ANDROID;
  const WEBKIT = IOS || (/AppleWebKit/.test(UA) && !/Chrome|Chromium|Edg\//.test(UA));
  const VBR = WEBKIT ? { 720: 6e6, 1080: 12e6, 2160: 36e6 } : { 720: 5e6, 1080: 10e6, 2160: 30e6 };
  // 카톡 파일 한도(300MB) 안에 들도록 720p·1080p는 파일을 280MB 아래로 맞춰요. 영상이 길면 비트레이트를 낮춰요. (4K는 USB·메일용)
  const CAP = 280e6;
  function bitrate(q, total){
    const b = VBR[q];
    if (String(q) === '2160' || !(total > 0)) return b;
    return Math.max(2e6, Math.min(b, Math.floor((CAP * 8 * .985 - ABR * total) / total)));
  }

  const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const out3 = p => 1 - Math.pow(1 - p, 3);
  const lerp = (a, b, p) => a + (b - a) * p;
  const rise = (u, at, d) => ease(cl((u - at) / d));      // u초가 at부터 d초 동안 0 → 1

  // 비율 "16:9"·"9:16", 화질 720·1080·2160(짧은 쪽 픽셀) → [가로, 세로]
  function size(ratio, q){
    const [a, b] = String(ratio).split(':').map(Number), s = +q;
    return a >= b ? [Math.round(s * a / b / 2) * 2, s] : [s, Math.round(s * b / a / 2) * 2];
  }

  // 인스타·카톡 같은 앱 안 브라우저 (여기선 만든 영상을 저장할 수 없어요)
  function inApp(){
    if (/Instagram/i.test(UA)) return '인스타그램';
    if (/KAKAOTALK/i.test(UA)) return '카카오톡';
    if (/NAVER\(inapp/i.test(UA)) return '네이버';
    if (/FBAN|FBAV/i.test(UA)) return '페이스북';
    if (/ Line\//i.test(UA)) return '라인';
    if (/; wv\)/.test(UA)) return '앱';
    return '';
  }

  // ===== 라이브러리: 만들기·점검할 때만 불러와요 =====
  let mbJob = null, aacOn = false;
  const HERE = document.currentScript ? new URL('.', document.currentScript.src).href : document.baseURI;  // engine.js가 있는 폴더
  const libUrl = f => new URL('lib/' + f, HERE).href;
  function MB(){ return mbJob || (mbJob = import(libUrl('mediabunny.min.mjs'))); }
  async function wasmAac(){
    if (aacOn) return;
    const m = await import(libUrl('mediabunny-aac-encoder.min.mjs'));
    m.registerAacEncoder(); aacOn = true;
  }

  // ===== 사진 =====
  // 넣을 때 한 번 줄여서 보관하고(긴 쪽 MAX px), 영상에 쓸 때는 지금 장면과 다음 장면 사진만 풀어 둬요.
  // (20~40장을 한꺼번에 풀면 아이폰 메모리를 넘어요)
  const MAX = MOBILE ? 2560 : 4096;
  const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  async function shrink(file){
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const sw = img.naturalWidth, sh = img.naturalHeight, k = Math.min(1, MAX / Math.max(sw, sh));
      const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
      const tc = document.createElement('canvas'), tk = 360 / Math.max(c.width, c.height);
      tc.width = Math.round(c.width * tk); tc.height = Math.round(c.height * tk);
      const tx = tc.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(c, 0, 0, tc.width, tc.height);
      const [blob, thumb] = [await toBlob(c, 'image/jpeg', .9), await toBlob(tc, 'image/jpeg', .82)];
      const out = { blob, thumb, w: c.width, h: c.height };
      c.width = c.height = tc.width = tc.height = 0;
      if (!blob) throw new Error('사진을 줄이지 못했어요');
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  // 흐린 배경: 아주 작게 줄였다 키우면 부드럽게 흐려져요 (모든 브라우저에서 같은 모양)
  function blurred(img){
    let src = img, c = null;
    for (const s of [24, 96]) {
      const k = s / Math.max(src.width, src.height);
      c = document.createElement('canvas');
      c.width = Math.max(2, Math.round(src.width * k)); c.height = Math.max(2, Math.round(src.height * k));
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
      src = c;
    }
    return c;
  }
  function bank(items){   // items: [{ blob, w, h }]
    const ready = new Map(), pending = new Map();
    function load(i){
      if (ready.has(i)) return Promise.resolve(ready.get(i));
      if (pending.has(i)) return pending.get(i);
      const pr = createImageBitmap(items[i].blob).then(img => {
        const v = { img, bg: blurred(img), w: img.width, h: img.height };
        pending.delete(i); ready.set(i, v); return v;
      });
      pending.set(i, pr);
      return pr;
    }
    return {
      size: items.length,
      get: i => ready.get(i) || null,
      async need(now, soon = []){
        const keep = new Set([...now, ...soon]);
        for (const [i, v] of ready) if (!keep.has(i)) { if (v.img.close) v.img.close(); ready.delete(i); }
        soon.forEach(i => { load(i).catch(() => {}); });
        await Promise.all(now.map(load));
      },
      close(){ for (const v of ready.values()) if (v.img.close) v.img.close(); ready.clear(); }
    };
  }

  // ===== 장면 순서 =====
  // 여는 장면 → 사진(이야기 문구는 사진 위에) → 하객 인사 → 닫는 장면.
  // 사진 한 장 시간은 음악 길이에 맞춰 정하되, 템플릿의 최소·최대 시간 안에서만.
  function plan(tpl, d, n, musicDur){
    const T = tpl.time, parentsDur = T.parents || T.thanks;
    const fixed = T.open + (d.parents ? parentsDur : 0) + (d.thanks ? T.thanks : 0) + T.close;
    // 무빙포스터처럼 사진이 적은 템플릿(fill)은 곡이 끝날 때까지 사진을 처음부터 다시 돌려요
    const target = (musicDur || fixed + n * 5) - fixed;
    const reps = tpl.fill && n && musicDur ? Math.max(1, Math.ceil(target / (n * T.max))) : 1;
    let per = n ? target / (n * reps) : 0;
    per = Math.max(T.min, Math.min(T.max, per));
    const segs = [{ kind: 'open', dur: T.open, i: tpl.openPhoto && n ? 0 : null }];
    for (let r = 0; r < reps; r++) for (let i = 0; i < n; i++) segs.push({ kind: 'photo', i, k: r * n + i, dur: per });
    // 신랑·신부 소개: 1번 사진 = 신랑, 2번 사진 = 신부
    const intro = d.intro && n >= 2 ? d.intro : null;
    if (intro) { segs[1].intro = { who: '신랑', name: d.groom, en: d.groomEn, tags: intro.groom }; segs[2].intro = { who: '신부', name: d.bride, en: d.brideEn, tags: intro.bride }; }
    // 이야기 문구는 소개 사진 뒤 사진들에 고르게
    const story = (d.story || []).filter(s => s && s.text), from = intro ? 2 : 0, room = n - from;
    if (room > 0) story.forEach((s, j) => { const g = segs[from + Math.min(room - 1, Math.floor(j * room / story.length)) + 1]; g.caption = s.text; g.ch = j + 1; });
    if (d.parents) segs.push({ kind: tpl.parents ? 'parents' : 'thanks', dur: parentsDur, text: d.parents, i: tpl.thanksPhoto && n ? Math.max(0, n - 1) : null });
    if (d.thanks) segs.push({ kind: 'thanks', dur: T.thanks, text: d.thanks, i: tpl.thanksPhoto && n ? Math.max(0, n - 1) : null });
    // closePhoto: 'first'면 1번 사진으로 끝나요 (반복 재생할 때 처음으로 자연스럽게 이어지게)
    segs.push({ kind: 'close', dur: T.close, i: tpl.closePhoto && n ? (tpl.closePhoto === 'first' ? 0 : n - 1) : null });
    let t = 0;
    segs.forEach(s => { s.start = t; t += s.dur; });
    return { segs, total: t, per, n, reps };
  }
  function at(segs, t){
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].start <= t) lo = m; else hi = m - 1; }
    return lo;
  }
  // 지금 그려야 하는 사진(now)과 곧 쓸 사진(soon)
  function photosAt(P, t, xf){
    const s = P.segs, k = at(s, t), now = [], soon = [];
    const add = (arr, g) => { if (g && g.i != null && !arr.includes(g.i)) arr.push(g.i); };
    add(now, s[k]);
    if (s[k + 1] && t > s[k + 1].start - xf - .05) add(now, s[k + 1]);
    add(soon, s[k + 1]); add(soon, s[k + 2]);
    return { now, soon, key: now.join(',') };
  }

  // ===== 그리기 도구 (templates.js에서 써요) =====
  function veil(ctx, W, H, color, a){
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  function cover(ctx, img, x, y, w, h, sc = 1, px = 0, py = 0){
    const s = Math.max(w / img.width, h / img.height) * sc, dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2 + px * (dw - w) / 2, y + (h - dh) / 2 + py * (dh - h) / 2, dw, dh);
  }
  // 사진 한 장: 천천히 확대·이동(켄 번즈). 사진 비율이 칸과 많이 다르면(세로 사진을 가로 영상에) 흐린 배경 위에 사진 전체를 보여 줘요.
  function photo(ctx, M, ph, s, u, o = {}){
    const xf = M.tpl.xf, p = cl((u + xf) / (s.dur + xf)), e = ease(p), k = s.k != null ? s.k : (s.i || 0);
    const z = o.zoom != null ? o.zoom : .07, zin = k % 2 === 0, sc = zin ? 1 + z * e : 1 + z * (1 - e);
    const dirs = [[.6, 0], [-.6, 0], [0, .5], [0, -.5], [.5, .4], [-.5, -.4]], [dx, dy] = dirs[k % dirs.length];
    const [bx, by, bw, bh] = o.box || [0, 0, M.W, M.H];
    const ar = ph.w / ph.h, br = bw / bh;
    const fit = o.fit || (Math.max(ar / br, br / ar) > 1.45 ? 'blur' : 'cover');
    ctx.save();
    if (o.box) { ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); }
    if (fit === 'cover') cover(ctx, ph.img, bx, by, bw, bh, sc, dx * (e - .5) * 2, dy * (e - .5) * 2);
    else if (fit === 'contain') {                   // 칸 안에 사진 전체 (배경은 템플릿이 칠해요)
      const s2 = Math.min(bw / ph.w, bh / ph.h) * sc, dw = ph.w * s2, dh = ph.h * s2;
      ctx.drawImage(ph.img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
    } else {
      cover(ctx, ph.bg, bx, by, bw, bh, 1.08);
      ctx.fillStyle = o.dim || 'rgba(0,0,0,.28)'; ctx.fillRect(bx, by, bw, bh);
      const s2 = Math.min(bw / ph.w, bh / ph.h) * (o.inset || .9) * sc, dw = ph.w * s2, dh = ph.h * s2;
      ctx.drawImage(ph.img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
    }
    ctx.restore();
  }
  const font = (w, px, fam) => `${w} ${Math.round(px)}px ${fam}`;
  function text(ctx, str, x, y, o){
    if (!str) return;
    ctx.save();
    ctx.font = font(o.weight || 400, o.size, o.family);
    ctx.fillStyle = o.color || '#fff';
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = Math.round(o.spacing) + 'px';
    if (o.alpha != null) ctx.globalAlpha *= cl(o.alpha);
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.size * .3; }
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  // 띄어쓰기 기준으로 줄 나누기 (\n은 그대로 줄바꿈)
  function wrap(ctx, str, maxW, o){
    ctx.save(); ctx.font = font(o.weight || 400, o.size, o.family);
    if (o.spacing && 'letterSpacing' in ctx) ctx.letterSpacing = Math.round(o.spacing) + 'px';
    const out = [];
    for (const para of String(str || '').split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const tryLine = line ? line + ' ' + w : w;
        if (line && ctx.measureText(tryLine).width > maxW) { out.push(line); line = w; } else line = tryLine;
      }
      out.push(line);
    }
    ctx.restore();
    return out;
  }
  // 여러 줄 글: y는 글 덩어리의 가운데. o.reveal(i)로 줄마다 나타나는 정도(0~1)를 정할 수 있어요.
  function block(ctx, str, x, y, o){
    const L = wrap(ctx, str, o.maxW || 1e9, o), lh = o.size * (o.lh || 1.5);
    const top = y - (L.length - 1) * lh / 2;
    L.forEach((ln, i) => {
      const a = o.reveal ? o.reveal(i, L.length) : 1;
      if (a > 0) text(ctx, ln, x, top + i * lh + (1 - a) * (o.rise || 0), { ...o, alpha: (o.alpha != null ? o.alpha : 1) * a });
    });
    return L.length * lh;
  }
  // 타자 치듯 한 글자씩
  function typed(str, p){ const a = Array.from(String(str || '')); return a.slice(0, Math.round(a.length * cl(p))).join(''); }

  let grainC = null;
  function grain(ctx, M, t, a){
    if (!grainC) {
      grainC = document.createElement('canvas'); grainC.width = grainC.height = 256;
      const g = grainC.getContext('2d'), d = g.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0);
    }
    const f = Math.floor(t * 12), ox = (f * 73) % 256, oy = (f * 151) % 256;
    ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(grainC, 'repeat');
    ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(ox, oy, M.W + 256, M.H + 256);
    ctx.restore();
  }
  function vignette(ctx, M, a){
    const key = 'vig' + M.W + 'x' + M.H;
    let c = M.cache[key];
    if (!c) {
      c = M.cache[key] = document.createElement('canvas'); c.width = M.W; c.height = M.H;
      const x = c.getContext('2d'), m = Math.max(M.W, M.H);
      const g = x.createRadialGradient(M.W / 2, M.H / 2, m * .28, M.W / 2, M.H / 2, m * .78);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      x.fillStyle = g; x.fillRect(0, 0, M.W, M.H);
    }
    ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, 0, 0); ctx.restore();
  }
  // 아래쪽을 살짝 어둡게 (글자가 잘 보이게)
  function scrim(ctx, M, from, a){
    const g = ctx.createLinearGradient(0, M.H * from, 0, M.H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, M.H * from, M.W, M.H * (1 - from)); ctx.restore();
  }

  // ===== 한 프레임 =====
  function frame(ctx, t, M){
    const { P, W, H, tpl } = M, segs = P.segs, xf = tpl.xf, k = at(segs, t), s = segs[k], n = segs[k + 1];
    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = tpl.bg; ctx.fillRect(0, 0, W, H);
    const mix = n && t > n.start - xf ? ease(cl((t - (n.start - xf)) / xf)) : 0;
    if (mix > 0 && tpl.trans === 'dip') {          // 색으로 사라졌다가 나타나기
      if (mix < .5) { seg(ctx, s, t, M); veil(ctx, W, H, tpl.dip || '#000', mix * 2); }
      else { seg(ctx, n, t, M); veil(ctx, W, H, tpl.dip || '#000', (1 - mix) * 2); }
    } else if (mix > 0 && tpl.trans === 'slide') { // 옆으로 넘기기
      ctx.save(); ctx.translate(-W * .3 * mix, 0); seg(ctx, s, t, M); ctx.restore();
      ctx.save(); ctx.translate(W * (1 - mix), 0); seg(ctx, n, t, M); ctx.restore();
    } else {                                        // 겹쳐 넘어가기
      seg(ctx, s, t, M);
      if (mix > 0) { ctx.save(); ctx.globalAlpha = mix; seg(ctx, n, t, M); ctx.restore(); }
    }
    if (tpl.over) tpl.over(ctx, M, t);
    if (!tpl.loop) veil(ctx, W, H, tpl.edge || '#000', 1 - Math.min(cl(t / .8), cl((P.total - t) / 1.6)));   // 반복 재생 템플릿은 검은 화면 없이 처음으로 이어져요
    ctx.restore();
  }
  function seg(ctx, s, t, M){
    ctx.save();
    M.tpl[s.kind](ctx, M, s, t - s.start);
    ctx.restore();
  }
  function scene(P, W, H, tpl, d, ph){ return { P, W, H, tpl, d, bank: ph, cache: {} }; }

  // ===== 글꼴: 다 받은 뒤에 그려요 (안 그러면 다른 글씨체로 영상이 만들어져요) =====
  async function fonts(tpl, sample){
    if (!document.fonts) return;
    await Promise.all((tpl.fonts || []).map(f => document.fonts.load(f, sample).catch(() => {})));
  }

  // ===== 소리 =====
  async function decode(buf){ return await new OfflineAudioContext(2, SR, SR).decodeAudioData(buf); }
  // 음악을 영상 길이에 맞춰요: 처음 0.6초 서서히 커지고, 끝 4초 서서히 줄어요. 곡이 짧으면 처음부터 다시
  async function mix(src, total){
    const oc = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
    if (src) {
      const s = oc.createBufferSource(); s.buffer = src; s.loop = src.duration < total;
      const g = oc.createGain();
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, .6);
      g.gain.setValueAtTime(1, Math.max(.6, total - 4)); g.gain.linearRampToValueAtTime(0, total);
      s.connect(g); g.connect(oc.destination); s.start(0);
    }
    const out = await oc.startRendering();
    if (src) louder(out);
    return out;
  }
  // 너무 작게 저장된 음악만 키워요 (식장에서 더 작게 들려요). 이미 큰 곡은 그대로, 소리가 찢어지지 않게 가장 큰 소리는 -1dB 아래로
  function louder(buf){
    const ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
    let peak = 0, sum = 0, n = 0;
    for (const d of ch) for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; n++; }
    const rms = Math.sqrt(sum / Math.max(1, n));
    if (!rms || rms >= .1) return;                       // -20dBFS보다 크면 그대로
    const g = Math.min(.158 / rms, .89 / Math.max(peak, 1e-6), 4);   // 목표 -16dBFS, 최대 4배(12dB)
    if (g <= 1.05) return;
    for (const d of ch) for (let i = 0; i < d.length; i++) d[i] *= g;
  }

  // ===== 휴대폰 저장 공간(OPFS)에 바로 쓰기: 쓰고 다시 읽어 봐서 제대로 되는 기기에서만 =====
  async function diskOK(dir){
    try {
      const h = await dir.getFileHandle('selftest.bin', { create: true });
      const w = await h.createWritable();
      await w.write({ type: 'write', position: 0, data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) });
      await w.write({ type: 'write', position: 4, data: new Uint8Array([9, 9]) });
      await w.write({ type: 'write', position: 10, data: new Uint8Array([7]) });
      await w.close();
      const b = new Uint8Array(await (await h.getFile()).arrayBuffer());
      await dir.removeEntry('selftest.bin');
      return b.length === 11 && b[3] === 4 && b[4] === 9 && b[5] === 9 && b[6] === 7 && b[8] === 0 && b[10] === 7;
    } catch (e) { return false; }
  }
  async function cleanup(){
    try {
      const dir = await navigator.storage.getDirectory();
      const names = [];
      for await (const [n] of dir.entries()) if (/\.(mp4|bin)$/.test(n)) names.push(n);
      for (const n of names) await dir.removeEntry(n).catch(() => {});
    } catch (e) {}
  }
  async function target(mb, name, info){
    try {
      if (navigator.storage && navigator.storage.getDirectory) {
        await cleanup();
        const dir = await navigator.storage.getDirectory();
        if (await diskOK(dir)) {
          const h = await dir.getFileHandle(name, { create: true });
          const w = await h.createWritable();
          info.store = '휴대폰 저장 공간';
          return { fastStart: 'reserve', target: new mb.StreamTarget(w, { chunked: true }),
            file: async () => new File([await h.getFile()], name, { type: 'video/mp4' }) };
        }
      }
    } catch (e) {}
    const t = new mb.BufferTarget();
    info.store = '메모리';
    return { fastStart: 'in-memory', target: t, file: async () => new File([t.buffer], name, { type: 'video/mp4' }) };
  }

  // ===== 만들기 =====
  // job: { P, tpl, d, bank, ratio, q, music(AudioBuffer|null), name, stop(취소하면 true) }
  async function make(job, onp){
    const mb = await MB();
    const [W, H] = size(job.ratio, job.q), vbr = bitrate(job.q, job.P.total);
    const info = { W, H, bitrate: vbr, webkit: WEBKIT };
    if (!(await mb.canEncodeVideo('avc', { width: W, height: H, bitrate: vbr, frameRate: FPS }))) {
      throw Object.assign(new Error(`이 기기에서는 ${W}×${H} 영상을 만들 수 없어요`), { code: 'size' });
    }
    if (WEBKIT || !(await mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: SR, bitrate: ABR }))) { await wasmAac(); info.audio = '보조 인코더(WASM AAC)'; }
    else info.audio = '내장 AAC';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { alpha: false });
    const M = scene(job.P, W, H, job.tpl, job.d, job.bank);
    const total = job.P.total, frames = Math.round(total * FPS);
    await fonts(job.tpl, job.sample || '');
    const audio = await mix(job.music, total);
    const tg = await target(mb, job.name, info);
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: tg.fastStart }), target: tg.target });
    const vs = new mb.CanvasSource(cv, { codec: 'avc', bitrate: vbr, keyFrameInterval: 2, onEncoderConfig: c => { info.codec = c.codec; } });
    output.addVideoTrack(vs, { frameRate: FPS, maximumPacketCount: frames + 60 });
    const as = new mb.AudioBufferSource({ codec: 'aac', bitrate: ABR });
    output.addAudioTrack(as, { maximumPacketCount: Math.ceil(total * 100 * 1.4) + 200 });
    let wake = null;
    const lock = async () => { try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) {} };
    const vis = () => { if (document.visibilityState === 'visible') lock(); else info.left = (info.left || 0) + 1; };
    document.addEventListener('visibilitychange', vis);
    await lock();
    const T0 = performance.now();
    try {
      await output.start();
      await as.add(audio); as.close();
      let key = '';
      for (let i = 0; i < frames; i++) {
        if (job.stop) throw Object.assign(new Error('그만 만들었어요'), { code: 'cancel' });
        const t = i / FPS, need = photosAt(job.P, t, job.tpl.xf);
        if (need.key !== key) { await job.bank.need(need.now, need.soon); key = need.key; }
        frame(ctx, t, M);
        await vs.add(t, 1 / FPS);
        if (i % 10 === 9 || i === frames - 1) {
          if (onp) onp({ done: (i + 1) / frames, elapsed: (performance.now() - T0) / 1000, canvas: cv });
          await new Promise(r => setTimeout(r, 0));
        }
      }
      vs.close();
      if (onp) onp({ done: 1, finishing: true, elapsed: (performance.now() - T0) / 1000 });
      await output.finalize();
    } catch (e) {
      try { await output.cancel(); } catch (_) {}
      throw e;
    } finally {
      document.removeEventListener('visibilitychange', vis);
      try { if (wake) await wake.release(); } catch (e) {}
    }
    const file = await tg.file();
    Object.assign(info, { seconds: (performance.now() - T0) / 1000, frames, size: file.size, length: total });
    return { file, info };
  }

  // ===== 미리보기: 화면용 작은 캔버스에 실제 속도로 재생 =====
  function player(canvas, M, audio){
    const ctx = canvas.getContext('2d', { alpha: false }), sc = canvas.width / M.W;
    let ac = null, node = null, t0 = 0, pos = 0, on = false, raf = 0, ended = null, ticker = null;
    const now = () => on ? pos + (ac.currentTime - t0) : pos;
    function draw(t){
      const need = photosAt(M.P, t, M.tpl.xf);
      M.bank.need(need.now, need.soon).catch(() => {});
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      frame(ctx, t, M);
      if (ticker) ticker(t);
    }
    function loop(){
      const t = now();
      if (t >= M.P.total) { stop(); pos = 0; draw(0); if (ended) ended(); return; }
      draw(t); raf = requestAnimationFrame(loop);
    }
    async function play(){
      if (on) return;
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      try { await ac.resume(); } catch (e) {}
      if (audio) { node = ac.createBufferSource(); node.buffer = audio; node.connect(ac.destination); node.start(0, pos); }
      t0 = ac.currentTime; on = true; loop();
    }
    function stop(){
      if (!on) return;
      pos = now(); on = false; cancelAnimationFrame(raf);
      try { if (node) node.stop(); } catch (e) {}
      node = null;
    }
    return {
      play, pause: stop, draw, time: now,
      get playing(){ return on; },
      seek(t){ const was = on; stop(); pos = Math.max(0, Math.min(M.P.total - .05, t)); draw(pos); if (was) play(); },
      set onend(f){ ended = f; }, set ontick(f){ ticker = f; },
      destroy(){ stop(); if (ac) ac.close().catch(() => {}); }
    };
  }

  // ===== 시험용 점검 (?debug) =====
  async function probe(){
    const r = { '브라우저': UA, '앱 안 브라우저': inApp() || '아님', '아이폰': IOS, '안드로이드': ANDROID, '사파리 계열(WebKit)': WEBKIT,
      'VideoEncoder': typeof VideoEncoder !== 'undefined', 'AudioEncoder': typeof AudioEncoder !== 'undefined' };
    try {
      const mb = await MB();
      for (const q of [720, 1080, 2160]) for (const ra of ['16:9', '9:16']) {
        const [w, h] = size(ra, q);
        r[`H.264 ${w}×${h}`] = await mb.canEncodeVideo('avc', { width: w, height: h, bitrate: VBR[q], frameRate: FPS }).catch(() => false);
      }
      r['내장 AAC'] = await mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: SR, bitrate: ABR }).catch(() => false);
    } catch (e) { r['라이브러리'] = '못 불러옴: ' + e.message; }
    try { r['저장 공간에 바로 쓰기(OPFS)'] = await diskOK(await navigator.storage.getDirectory()); } catch (e) { r['저장 공간에 바로 쓰기(OPFS)'] = false; }
    r['화면 꺼짐 방지'] = 'wakeLock' in navigator;
    try { r['공유 창'] = !!(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(8)], 't.mp4', { type: 'video/mp4' })] })); } catch (e) { r['공유 창'] = false; }
    r['CPU 코어'] = navigator.hardwareConcurrency || '?';
    if (navigator.deviceMemory) r['메모리(GB)'] = navigator.deviceMemory;
    return r;
  }

  return {
    FPS, IOS, ANDROID, MOBILE, WEBKIT, VBR, bitrate, size, inApp, shrink, bank, plan, photosAt, frame, scene, fonts,
    decode, mix, make, player, probe, cleanup,
    kit: { cl, ease, out3, lerp, rise, veil, cover, photo, text, wrap, block, typed, grain, vignette, scrim, font }
  };
})();
