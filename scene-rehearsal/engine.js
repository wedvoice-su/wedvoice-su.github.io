// 식전영상 엔진: 장면 순서 만들기 → 한 장씩 그리기 → MP4로 묶기. 화면은 app.js, 템플릿 디자인은 templates.js
// 한 장면에 사진 두 장(11/9): plan()의 pairs, 그리기 도구 duo·slots·duoBoxes. 두 장 표시가 없는 사진은 전과 똑같이 그려요
// 2차 업데이트(11/10): 찍은 날짜 takenAt · 박자 beats + plan의 opt.beats(snap) · 음악 구간 mix(…, cut) · 짧은 영상 clip + plan의 opt.clips(feeder·liveVideos)
//   셋 다 안 쓰면(opt 없음) 전과 똑같은 길이에요
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
  function MB(){ return mbJob || (mbJob = import(libUrl('mediabunny.min.mjs')).catch(e => { mbJob = null; throw e; })); }
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
      if (!blob || !thumb) throw new Error('사진을 줄이지 못했어요');
      // 바이트(ArrayBuffer)로 들고 있어요. 아이폰에서 오래 들고 있던 Blob을 못 읽는 일이 있었어요
      const out = { bytes: await blob.arrayBuffer(), thumbBytes: await thumb.arrayBuffer(), w: c.width, h: c.height, taken: await takenAt(file) };
      c.width = c.height = tc.width = tc.height = 0;
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  // ===== 찍은 날짜 (2차 업데이트, 날짜순 정렬용) =====
  // 줄인 사진에는 날짜 정보가 안 남아서, 넣을 때 원본 파일에서 한 번 읽어 둬요 (밀리초, 모르면 null)
  // 1) 사진 안의 Exif 찍은 날짜 → 2) 파일 이름의 날짜(20210512_123456, 2021-05-12) → 3) 모름
  // 카톡으로 받은 사진은 날짜 정보가 지워져 있고 파일 이름(KakaoTalk_날짜)도 받은 날이라 모름으로 둬요
  async function takenAt(file){
    try {
      let t = exifDate(new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()));
      if (t == null && /hei[cf]/i.test((file.type || '') + (file.name || ''))) t = exifDate(new Uint8Array(await file.slice(0, 24 * 1024 * 1024).arrayBuffer()));   // HEIC는 날짜가 뒤쪽에 있을 수 있어요
      if (t != null) return t;
    } catch (e) {}
    return nameDate(file.name || '');
  }
  const okDate = (y, mo, d, h = 0, mi = 0, s = 0) => {
    if (y < 1990 || y > new Date().getFullYear() + 1 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
    return new Date(y, mo - 1, d, h, mi, s).getTime();
  };
  // "Exif\0\0" 다음의 TIFF 머리 → IFD0 → Exif IFD의 DateTimeOriginal(0x9003)·DateTimeDigitized(0x9004), 없으면 IFD0 DateTime(0x0132)
  function exifDate(b){
    for (let i = 0; i + 14 < b.length; i++) {
      if (b[i] !== 0x45 || b[i + 1] !== 0x78 || b[i + 2] !== 0x69 || b[i + 3] !== 0x66 || b[i + 4] || b[i + 5]) continue;
      const t = i + 6, le = b[t] === 0x49 && b[t + 1] === 0x49;
      if (!le && !(b[t] === 0x4d && b[t + 1] === 0x4d)) continue;
      try {
        const dv = new DataView(b.buffer, b.byteOffset + t, b.length - t), u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
        if (u16(2) !== 42) continue;
        const ifd = o => { const n = u16(o), out = {}; for (let k = 0; k < n && k < 400; k++) { const e = o + 2 + k * 12; out[u16(e)] = e; } return out; };
        const str = e => { const n = Math.min(u32(e + 4), 40), off = n > 4 ? u32(e + 8) : e + 8; let s = ''; for (let k = 0; k < n; k++) s += String.fromCharCode(dv.getUint8(off + k)); return s; };
        const ifd0 = ifd(u32(4));
        let s = '';
        if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769] + 8)); s = ex[0x9003] ? str(ex[0x9003]) : ex[0x9004] ? str(ex[0x9004]) : ''; }
        if (!s && ifd0[0x0132]) s = str(ifd0[0x0132]);
        const m = /(\d{4}):(\d\d):(\d\d)[ T](\d\d):(\d\d):(\d\d)/.exec(s);
        return m ? okDate(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]) : null;
      } catch (e) { return null; }
    }
    return null;
  }
  function nameDate(name){
    if (/^kakaotalk/i.test(name)) return null;
    let m = /(?:^|\D)((?:19|20)\d\d)(\d\d)(\d\d)[_\- T]?(\d\d)(\d\d)(\d\d)/.exec(name);   // 20210512_123456 (안드로이드·픽셀·스크린샷)
    if (m) return okDate(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]);
    m = /(?:^|\D)((?:19|20)\d\d)[-.](\d\d)[-.](\d\d)(?!\d)/.exec(name);                       // 2021-05-12
    return m ? okDate(+m[1], +m[2], +m[3]) : null;
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
  // 사진 풀기: 바이트로 새 Blob을 만들어 createImageBitmap, 안 되면 <img>로 한 번 더
  // (11/4 아이폰 iOS 26.6: "An error occurred reading the Blob argument to createImageBitmap" — 저장 공간에 큰 덩어리를 쓴 직후)
  async function decodePhoto(it){
    const bytes = it.bytes || (it.blob && await it.blob.arrayBuffer());
    try { return await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' })); }
    catch (e) {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      try {
        const img = new Image(); img.src = url; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c;
      } finally { URL.revokeObjectURL(url); }
    }
  }
  function bank(items){   // items: [{ bytes, w, h, meta }]
    const ready = new Map(), pending = new Map(), gen = new Map();
    let closed = false;
    function load(i){
      if (ready.has(i)) return Promise.resolve(ready.get(i));
      if (pending.has(i)) return pending.get(i);
      const g = gen.get(i) || 0;
      const pr = decodePhoto(items[i]).then(img => {
        if (closed || (gen.get(i) || 0) !== g) { if (img.close) img.close(); return null; }   // 그사이 닫혔거나 사진이 바뀌었으면 버려요
        const v = { img, bg: blurred(img), w: img.width, h: img.height };
        pending.delete(i); ready.set(i, v); return v;
      }, e => {
        pending.delete(i);
        throw Object.assign(new Error(`${i + 1}번 사진을 읽지 못했어요`), { code: 'photo', photo: i + 1, cause: e && e.message });
      });
      pending.set(i, pr);
      return pr;
    }
    return {
      size: items.length,
      get: i => ready.get(i) || null,
      meta: i => (items[i] && items[i].meta) || null,   // 사진 편집에서 맞춘 위치 { cx, cy, z, fit }
      duo: i => (items[i] && items[i].duo) || null,     // 두 장 장면의 배치 { lay, r } (앞 사진에 붙어 있어요)
      clip: i => (items[i] && items[i].vid && items[i].clip) || null,   // 짧은 영상이면 클립 MP4 바이트 (사진 자리엔 첫 장면이 들어 있어요)
      clipLen: i => (items[i] && items[i].vid && items[i].vid.len) || 0,
      async need(now, soon = []){
        const keep = new Set([...now, ...soon]);
        for (const [i, v] of ready) if (!keep.has(i)) { if (v.img.close) v.img.close(); ready.delete(i); }
        soon.forEach(i => { load(i).catch(() => {}); });
        if (closed) return;
        await Promise.all(now.map(load));
      },
      drop(i){ gen.set(i, (gen.get(i) || 0) + 1); const v = ready.get(i); if (v && v.img.close) v.img.close(); ready.delete(i); pending.delete(i); },   // 사진을 바꿨을 때
      close(){ closed = true; for (const v of ready.values()) if (v.img.close) v.img.close(); ready.clear(); pending.clear(); }
    };
  }

  // ===== 장면 순서 =====
  // 여는 장면 → 사진(이야기 문구는 사진 위에) → 하객 인사 → 닫는 장면.
  // 사진 한 장면 시간은 음악 길이에 맞춰 정하되, 템플릿의 최소·최대 시간 안에서만.
  // pairs: 다음 사진과 한 장면에 두 장으로 넣을 사진 번호들(앞 사진). 없으면 장면 하나 = 사진 한 장 (11/9 전과 같아요)
  // 두 장 장면은 { kind: 'photo', i: 앞 사진, j: 뒤 사진 }, 한 장 장면은 j가 없어요
  // opt(2차 업데이트): { clips: { 사진 번호: 영상 길이(초) }, beats: [영상 시간 기준 박자(초)], down: 마디 첫 박의 번호(0~3), fit: 음악 길이에 꼭 맞추기 }
  //   영상 장면은 사진 시간 대신 그 영상 길이만큼 (겹쳐 들어오는 시간 포함), 박자가 있으면 장면이 바뀌는 순간을 박자에 맞춰요(snap)
  //   fit(음악에서 구간을 골랐을 때): 보통 속도로는 구간보다 길어지면 글 없는 사진부터 빠르게(템플릿의 time.fast초까지),
  //     그래도 길면 여는·인사·닫는 장면을 짧게(time.short). 그래도 넘치면 전처럼 음악이 한 번 더 이어져요
  function plan(tpl, d, n, musicDur, pairs, opt){
    const T = tpl.time, parentsDur = T.parents || T.thanks;
    const fixed = T.open + (d.parents ? parentsDur : 0) + (d.thanks ? T.thanks : 0) + T.close;
    const B = opt && opt.beats && opt.beats.length >= 8 ? opt.beats : null, beat = B ? medianGap(B) : 0;   // 한 박의 길이(초)
    // 영상 장면의 길이: 겹쳐 들어오는 동안부터 클립이 흐르니 그만큼(0.6초까지) 빼요 — 클립이 먼저 끝나면 다음 장면으로 겹쳐 넘어가는 동안 마지막 장면에 멈춰 있어요
    // (겹침 시간보다는 길게. 박자에 맞출 땐 겹침 시간이 한 박으로 짧아져요: snap)
    const xfv = beat > .25 && beat < 2 && !tpl.keepXf ? Math.min(tpl.xf, Math.max(.35, beat)) : tpl.xf;
    const clips = (opt && opt.clips) || {}, vdur = i => clips[i] ? Math.max(1.5, xfv + .3, clips[i] - Math.min(xfv, .6)) : 0;
    const pairAt = new Set(pairs || []), scenes = [];   // [i] 또는 [i, j]
    for (let i = 0; i < n; i++) { if (pairAt.has(i) && i + 1 < n && !clips[i] && !clips[i + 1]) { scenes.push([i, i + 1]); i++; } else scenes.push([i]); }
    const sc = scenes.length;
    const vsum = scenes.reduce((a, [i, j]) => a + (j == null ? vdur(i) : 0), 0), psc = vsum ? scenes.filter(([i, j]) => !(j == null && clips[i])).length : sc;
    // 무빙포스터처럼 사진이 적은 템플릿(fill)은 곡이 끝날 때까지 사진을 처음부터 다시 돌려요
    const md = Math.min(musicDur || 0, 600);   // 아주 긴 음악은 10분까지만 써요
    const target = (md || fixed + psc * 5 + vsum) - fixed;
    const reps = tpl.fill && sc && md ? Math.max(1, Math.floor(target / (psc * T.min + vsum))) : 1;
    let per = psc ? (vsum ? (target / reps - vsum) / psc : target / (sc * reps)) : 0;
    per = Math.max(T.min, Math.min(T.max, per));
    const segs = [{ kind: 'open', dur: T.open, i: tpl.openPhoto && n ? 0 : null }];
    for (let r = 0; r < reps; r++) scenes.forEach(([i, j], q) => {
      const g = { kind: 'photo', i, k: r * sc + q, dur: per };
      if (j != null) g.j = j; else if (clips[i]) { g.dur = vdur(i); g.vid = true; }
      segs.push(g);
    });
    // 신랑·신부 소개: 1번 사진 = 신랑, 2번 사진 = 신부 (두 장 장면이면 그 사진이 든 칸에: 앞 칸 intro, 뒤 칸 intro2)
    const intro = d.intro && n >= 2 ? d.intro : null;
    if (intro) {
      const tag = [{ who: '신랑', name: d.groom, en: d.groomEn, tags: intro.groom }, { who: '신부', name: d.bride, en: d.brideEn, tags: intro.bride }];
      for (let q = 0; q < sc; q++) { const g = segs[q + 1]; if (tag[g.i]) g.intro = tag[g.i]; if (g.j != null && tag[g.j]) g.intro2 = tag[g.j]; }
    }
    // 사진 편집에서 그 사진에 넣은 글이 먼저(두 장 장면은 앞 사진 글, 없으면 뒤 사진 글). 이야기 문구는 소개 사진 뒤, 글이 없는 장면들에 고르게
    const own = d.captions || [], has = i => !!(own[i] && own[i].trim());
    for (let q = 0; q < sc; q++) { const g = segs[q + 1]; if (has(g.i)) g.caption = own[g.i]; else if (g.j != null && has(g.j)) g.caption = own[g.j]; }
    const story = (d.story || []).filter(s => s && s.text), free = [];
    for (let q = 0; q < sc; q++) { const g = segs[q + 1]; if (!g.intro && !g.intro2 && !g.caption) free.push(g); }
    const use = story.slice(0, free.length);
    use.forEach((s, j) => { const g = free[Math.floor(j * free.length / use.length)]; g.caption = s.text; g.ch = j + 1; });
    if (d.parents) segs.push({ kind: tpl.parents ? 'parents' : 'thanks', dur: parentsDur, text: d.parents, i: tpl.thanksPhoto && n ? Math.max(0, n - 1) : null });
    if (d.thanks) segs.push({ kind: 'thanks', dur: T.thanks, text: d.thanks, i: tpl.thanksPhoto && n ? Math.max(0, n - 1) : null });
    // closePhoto: 'first'면 1번 사진으로 끝나요 (반복 재생할 때 처음으로 자연스럽게 이어지게)
    segs.push({ kind: 'close', dur: T.close, i: tpl.closePhoto && n ? (tpl.closePhoto === 'first' ? 0 : n - 1) : null });
    let fast = 0, avgFit = 0, every = false;   // fast: 빠르게 넘길 때 가장 짧은 사진 시간(2.5초보다 짧을 때만), avgFit: 구간에 맞춰 줄인 평균 시간, every: 사진 시간을 박 수로 정했는지
    if (opt && opt.fit && md > 0 && reps === 1) {
      let over = segs.reduce((a, s) => a + s.dur, 0) - md;
      if (over > .01) {
        const plain = segs.filter(s => s.kind === 'photo' && !s.vid && !s.caption && !s.intro && !s.intro2), floor = Math.min(per, T.fast || 1.5), np = plain.length;
        // 박자에 맞출 거면 사진 시간은 박 수로 딱 떨어져야 해요: 가장 짧은 사진 = base (k박, 0.7초보다 짧지 않게, time.fast보다 많이 짧지 않게)
        let base = 0;
        if (beat > .25 && beat < 2) { let k = Math.max(Math.ceil(.7 / beat - 1e-6), Math.floor(floor / beat + 1e-6)); if (k * beat < floor * .7) k++; base = Math.min(per, k * beat); }
        // 1) 글 없는 사진 한 장의 평균 시간(avg)을 time.fast까지 줄이고
        let avg = np ? Math.max(floor, base, per - over / np) : per;
        over -= np * (per - avg);
        // 2) 그래도 길면 여는·인사·닫는 장면을 time.short까지 줄이고
        const fx = segs.filter(s => s.kind !== 'photo'), room = fx.map(s => Math.max(0, s.dur - ((T.short && T.short[s.kind]) || s.dur))), sum = room.reduce((a, b) => a + b, 0);
        const less = over > .01 && sum > 0 ? Math.min(over, sum) : 0;
        if (less > 0) { fx.forEach((s, i) => { s.dur -= room[i] * less / sum; }); over -= less; }
        // 3) 그래도 길면 사진을 base까지 (박자에 맞출 때만: time.fast보다 조금 짧아질 수 있어요)
        if (np && base && over > .01 && avg > base) { const d = Math.min(avg - base, over / np); avg -= d; over -= d * np; }
        if (np && avg < per - .01) {
          avgFit = avg;
          let shortest = avg;
          if (base) {   // 사진마다 박 수로: 모자라는 박은 고르게 한 박씩 더 — 박 수로 안 떨어지면 박자에 맞추다 조금씩 밀려 전체가 길어져요
            const E = Math.max(0, Math.floor(np * (avg - base) / beat + 1e-6)), each = Math.floor(E / np), more = E - each * np;
            plain.forEach((s, q) => { s.dur = base + (each + (more && Math.floor((q + 1) * more / np) > Math.floor(q * more / np) ? 1 : 0)) * beat; });
            shortest = base + each * beat; every = true;
          } else plain.forEach(s => { s.dur = avg; });
          if (shortest < 2.5) fast = shortest;
        }
      }
    }
    let t = 0;
    segs.forEach(s => { s.start = t; t += s.dur; });
    const P = { segs, total: t, per, n, reps, sc };
    if (avgFit) P.avg = avgFit;
    if (fast) {   // 빠르게 넘길 때: 겹쳐 넘어가는 시간도 그만큼 짧게, 색으로 사라졌다 나타나는 넘김(dip)은 깜빡여 보여서 겹쳐 넘기기로 (frame)
      P.fast = fast;
      P.xf = Math.max(.2, Math.min(tpl.xf, fast * .4));
    }
    if (every) P.every = true;
    if (B) snap(P, tpl, B, opt.down || 0, md);
    return P;
  }
  function medianGap(B){ const g = []; for (let k = 1; k < B.length; k++) g.push(B[k] - B[k - 1]); g.sort((a, b) => a - b); return g[g.length >> 1]; }
  // ===== 박자에 맞추기 (2차 업데이트) =====
  // 장면이 바뀌는 순간(겹쳐 넘어가는 한가운데)을 원래 자리에서 가장 가까운 박자에 놓아요. 사진 장면은 마디의 1·3박, 첫 사진은 마디 첫 박
  // 장면마다 길이가 조금씩(반 마디 안) 달라지지만 전체 길이는 거의 그대로. 겹쳐 넘어가는 시간(xf)은 한 박 정도로 짧게 (박자가 또렷하게 느껴지게)
  function snap(P, tpl, B, down, musicDur){
    const segs = P.segs, m = medianGap(B);
    if (!(m > .25 && m < 2)) return;
    // 겹쳐 넘어가는 시간: 보통은 한 박, 빠르게 넘길 때(P.fast)는 반 박 (사진 시간의 40%를 넘지 않게)
    // (템플릿이 keepXf면 — 천천히 움직이는 무빙포스터 — 겹침 시간은 그대로 두고 자리만 박자에 맞춰요)
    const xf = P.fast ? Math.max(.2, Math.min(tpl.xf, tpl.keepXf ? tpl.xf : m / 2, P.fast * .4)) : tpl.keepXf ? tpl.xf : Math.min(tpl.xf, Math.max(.35, m)), half = xf / 2;
    // 박자 자리 후보: 마디의 1·3박(strong), 1박(bar). 구간에 맞추느라 사진 시간을 박 수로 정했으면(P.every) 모든 박 — 박마다 딱 맞아요
    // 사진이 많아 음악이 한 번 더 돌면(영상이 음악보다 길면) 같은 박자가 음악 길이만큼 뒤에서 되풀이돼요
    const every = !!P.every;
    const strong = [], bar = [], all = [], I = segs.map(s => s.start), reps = musicDur > 1 ? Math.min(40, Math.max(1, Math.ceil((P.total + m) / musicDur))) : 1;
    for (let r = 0; r < reps; r++) B.forEach((b, k) => { const ph = ((k - down) % 4 + 4) % 4, t = b + r * musicDur + half; all.push(t); if (every || ph % 2 === 0) strong.push(t); if (ph === 0) bar.push(t); });
    const pick = (arr, want, min) => {
      let best = null;
      for (const c of arr) { if (c < min) continue; if (best == null || Math.abs(c - want) < Math.abs(best - want)) best = c; else if (c > want) break; }
      return best;
    };
    // 한 장면의 가장 짧은 길이: 원래 길이의 60%. 글 없는 사진만은, 원래 길이가 후보 간격의 배수가 아니면 바로 아래 배수까지 허락해요
    // (예: 2.1초짜리를 1.2초 간격에 맞추면 1.2초와 2.4초를 섞어야 평균이 맞아요 — 안 그러면 늘 긴 쪽만 골라 전체가 길어져요. 글이 있는 장면은 읽을 시간이 필요해서 60%를 지켜요)
    // 겹침 시간보다는 길게, 빠르게 넘길 때도 0.7초보다 짧은 장면은 없게
    const N = I.slice(), end = (strong.length ? strong[strong.length - 1] : 0) + m, gs = (every ? 1 : 2) * m;
    for (let j = 1; j < segs.length; j++) {
      const D = I[j] - I[j - 1], q = segs[j - 1], plain = q.kind === 'photo' && !q.vid && !q.caption && !q.intro && !q.intro2;
      const lo = plain ? Math.floor(D / gs + .03) * gs * .96 : D;
      const min = N[j - 1] + Math.max(xf + (P.fast ? .2 : .4), Math.min(D * .6, lo), P.fast ? Math.min(.7, D * .8) : 0);
      let c = I[j] <= end ? pick(j === 1 ? bar : strong, I[j], min) : null;
      // 고른 자리가 원래 자리에서 한 박(첫 사진은 두 박)보다 멀면 — 앞 장면이 짧아 가까운 1·3박을 못 쓸 때 — 아무 박이나 더 가까운 쪽으로 (안 그러면 짧은 장면마다 뒤로 밀려요)
      if (I[j] <= end && !every && (c == null || Math.abs(c - I[j]) > (j === 1 ? 2 : 1) * m + .05)) { const any = pick(all, I[j], min); if (any != null && (c == null || Math.abs(any - I[j]) < Math.abs(c - I[j]))) c = any; }
      N[j] = c != null && c <= end ? c : Math.max(min, N[j - 1] + (I[j] - I[j - 1]));
    }
    segs.forEach((s, j) => { s.start = N[j]; if (j < segs.length - 1) s.dur = N[j + 1] - N[j]; });
    const last = segs[segs.length - 1];
    // 음악보다 조금(닫는 장면의 40% 안) 길어졌으면 닫는 장면을 그만큼 줄여 음악 안에 끝내요. 많이 넘치면(사진이 많은 경우) 전처럼 음악이 한 번 더 이어져요
    if (musicDur && last.start + last.dur > musicDur + .05 && last.start + last.dur * .6 <= musicDur) last.dur = musicDur - last.start;
    P.total = last.start + last.dur;
    P.xf = xf; P.bpm = Math.round(60 / m);
  }
  function at(segs, t){
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].start <= t) lo = m; else hi = m - 1; }
    return lo;
  }
  // 지금 그려야 하는 사진(now)과 곧 쓸 사진(soon)
  function photosAt(P, t, xf){
    const s = P.segs, k = at(s, t), now = [], soon = [];
    const add = (arr, g) => { if (g) for (const v of [g.i, g.j]) if (v != null && !arr.includes(v)) arr.push(v); };
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
  // 사용자가 맞춘 사진 위치: z 확대(1~3), cx·cy = 칸 가운데에 올 사진 위치(0~1). 사진이 칸을 꽉 채우도록 끝에서 멈춰요 (땡큐 카드와 같은 방식)
  function place(img, w, h, z = 1, cx = .5, cy = .5){
    const s = Math.max(w / img.width, h / img.height) * z, dw = img.width * s, dh = img.height * s;
    const hx = Math.min(.5, w / (2 * dw)), hy = Math.min(.5, h / (2 * dh));
    return { dw, dh, cx: Math.min(1 - hx, Math.max(hx, cx)), cy: Math.min(1 - hy, Math.max(hy, cy)) };
  }
  function framed(ctx, img, x, y, w, h, z, cx, cy){
    const q = place(img, w, h, z, cx, cy);
    ctx.drawImage(img, x + w / 2 - q.cx * q.dw, y + h / 2 - q.cy * q.dh, q.dw, q.dh);
  }
  // 사진 한 장: 천천히 확대·이동(켄 번즈). 사진 비율이 칸과 많이 다르면(세로 사진을 가로 영상에) 흐린 배경 위에 사진 전체를 보여 줘요.
  function photo(ctx, M, ph, s, u, o = {}){
    const xf = M.tpl.xf, p = cl((u + xf) / (s.dur + xf)), e = ease(p), k = s.k != null ? s.k : (s.i || 0);
    const z = o.zoom != null ? o.zoom : .07, zin = k % 2 === 0, sc = zin ? 1 + z * e : 1 + z * (1 - e);
    const dirs = [[.6, 0], [-.6, 0], [0, .5], [0, -.5], [.5, .4], [-.5, -.4]], [dx, dy] = dirs[k % dirs.length];
    const [bx, by, bw, bh] = o.box || [0, 0, M.W, M.H];
    const ar = ph.w / ph.h, br = bw / bh, meta = (M.bank.meta && M.bank.meta(s.i)) || {};
    const auto = o.auto || (Math.max(ar / br, br / ar) > 1.45 ? 'blur' : 'cover');
    const fit = o.fit || (meta.fit === 'cover' ? 'cover' : meta.fit === 'whole' ? 'blur' : auto);
    ctx.save();
    if (o.clip) { ctx.beginPath(); o.clip(ctx); ctx.clip(); }   // 프레임(11/11): 네모 대신 그 모양으로 잘라요
    else if (o.box) { ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); }
    if (fit === 'cover') {   // 사용자가 맞춘 위치를 가운데에 두고 조금만 움직여요
      const z0 = meta.z || 1, amp = .05 / z0;
      framed(ctx, ph.img, bx, by, bw, bh, z0 * sc, (meta.cx ?? .5) + dx * (e - .5) * amp, (meta.cy ?? .5) + dy * (e - .5) * amp);
    }
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
  // 아래쪽을 살짝 어둡게 (글자가 잘 보이게). box를 주면 그 칸 안에만
  function scrim(ctx, M, from, a, box){
    const [x, y, w, h] = box || [0, 0, M.W, M.H];
    const g = ctx.createLinearGradient(0, y + h * from, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y + h * from, w, h * (1 - from)); ctx.restore();
  }

  // ===== 한 장면에 사진 두 장 (11/9) =====
  // 배치 d = { lay: 'lr' 좌우 · 'tb' 위아래 · 'pip' 큰+작은, r: 비율 } — 좌우·위아래의 r은 앞 칸 비중(.3~.7), 큰+작은의 r은 작은 사진 크기(.25~.5)
  // 템플릿은 duo(M, lay) → { box: 두 장을 넣을 틀, gap: 칸 사이 간격, lay: 기본 배치, corner: 작은 사진 자리 'br'·'tr'·'bl'·'tl' }
  const DUO_R = { lr: .5, tb: .5, pip: .38 }, DUO_LIM = { lr: [.3, .7], tb: [.3, .7], pip: [.25, .5] };
  function slots(box, d, gap = 0, corner = 'br'){
    const [x, y, w, h] = box, lay = (d && d.lay) || 'lr', r = (d && d.r) || DUO_R[lay];
    if (lay === 'tb') { const a = h * r - gap / 2; return [[x, y, w, a], [x, y + a + gap, w, h - a - gap]]; }
    if (lay === 'pip') {
      const sw = w * r, sh = h * r, m = Math.min(w, h) * .045;
      return [[x, y, w, h], [corner.includes('l') ? x + m : x + w - sw - m, corner.includes('t') ? y + m : y + h - sh - m, sw, sh]];
    }
    const a = w * r - gap / 2; return [[x, y, a, h], [x + a + gap, y, w - a - gap, h]];
  }
  // ===== 프레임 (11/11, 사회자님: 두 장을 네모로만 두는 건 별로 → 모양 틀을 고르고, 틀도 옮길 수 있게) =====
  // d.fr = 'round' 둥근 사각 · 'circle' 원 · 'heart' 하트 · 'arch' 아치 (없으면 전처럼 네모 칸)
  // d.fp = [[dx, dy, sc], [dx, dy, sc]]: 칸마다 틀을 옮긴 만큼(두 장 틀 너비·높이에 대한 비율)과 크기(1 = 기본), d.bg = 템플릿 duoBg의 몇 번째 바탕색
  // 틀이 있으면 칸 안에 그 모양을 넣고, 그 모양을 감싸는 네모를 boxes로 돌려줘요 — 사진 맞춤·편집 창은 이 네모를 '칸'으로 그대로 써요
  // 모양은 path(ctx, x, y, w, h)로 그려요. ar = 가로/세로 비율(0이면 칸 모양 그대로)
  function rr(c, x, y, w, h, r){ c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const FRAMES = {
    round: { ar: 0, path: (c, x, y, w, h) => rr(c, x, y, w, h, Math.min(w, h) * .12) },
    circle: { ar: 1, path: (c, x, y, w, h) => { c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.closePath(); } },
    heart: { ar: 1.08, path: (c, x, y, w, h) => {
      const X = v => x + w * v, Y = v => y + h * v;
      c.moveTo(X(.5), Y(.28));
      c.bezierCurveTo(X(.5), Y(.1), X(.36), Y(0), X(.25), Y(0)); c.bezierCurveTo(X(.1), Y(0), X(0), Y(.12), X(0), Y(.3));
      c.bezierCurveTo(X(0), Y(.55), X(.25), Y(.75), X(.5), Y(1)); c.bezierCurveTo(X(.75), Y(.75), X(1), Y(.55), X(1), Y(.3));
      c.bezierCurveTo(X(1), Y(.12), X(.9), Y(0), X(.75), Y(0)); c.bezierCurveTo(X(.64), Y(0), X(.5), Y(.1), X(.5), Y(.28)); c.closePath();
    } },
    arch: { ar: .78, path: (c, x, y, w, h) => { const r = w / 2; c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); } }
  };
  const FP_LIM = [.5, 1.8];   // 틀 크기(기본의 몇 배)
  function frameBox(F, cell, area, fp){
    const [cx, cy, cw, ch] = cell, [ax, ay, aw, ah] = area, pad = Math.min(cw, ch) * .05;
    let w = cw - 2 * pad, h = ch - 2 * pad;
    if (F.ar) { h = Math.min(h, w / F.ar); w = h * F.ar; }
    const k = Math.min(Math.max(FP_LIM[0], Math.min(FP_LIM[1], (fp && fp[2]) || 1)), aw / w, ah / h);   // 두 장 틀보다 커지지는 않게
    w *= k; h *= k;
    const x = cx + cw / 2 + ((fp && fp[0]) || 0) * aw - w / 2, y = cy + ch / 2 + ((fp && fp[1]) || 0) * ah - h / 2;
    return [Math.max(ax, Math.min(ax + aw - w, x)), Math.max(ay, Math.min(ay + ah - h, y)), w, h];   // 틀 밖으로는 못 나가요
  }
  // 템플릿 기본값과 사용자가 고른 배치를 합쳐 두 칸의 자리를 돌려줘요 (그리기와 편집 창이 같은 계산을 써요)
  function duoBoxes(M, tpl, d){
    d = d || {};
    const D = tpl.duo(M, d.lay), lay = d.lay || D.lay || 'lr';
    const R = { lay, D, r: d.r || DUO_R[lay], boxes: slots(D.box, { lay, r: d.r }, D.gap || 0, D.corner) };
    const F = d.fr ? FRAMES[d.fr] : null;
    if (F) {
      const pal = tpl.duoBg || [];
      R.fr = d.fr; R.cells = R.boxes;
      R.boxes = R.cells.map((c, k) => frameBox(F, c, D.box, d.fp && d.fp[k]));
      R.bg = pal[d.bg | 0] || pal[0] || null;                         // { c 색, name 이름, light 밝은 색인지 }
      R.path = (ctx, k) => F.path(ctx, ...R.boxes[k]);
    }
    return R;
  }
  // 한 장 장면의 프레임 (11/11 3판, 사회자님: "한 장 장면에도 선택할 수 있도록"): 두 장 장면과 같은 값(d.fr · d.bg · d.fp[0])을 그 사진에 붙여 써요
  // 틀 하나를 템플릿의 두 장 틀(duo().box) 자리에 넣고, 바탕색도 그 자리에. 프레임이 없으면 null → 템플릿이 전과 똑같이 그려요
  function soloBox(M, tpl, d){
    const F = d && d.fr ? FRAMES[d.fr] : null;
    if (!F) return null;
    const D = tpl.duo(M), pal = tpl.duoBg || [];
    const R = { fr: d.fr, lay: 'one', D, cells: [D.box], boxes: [frameBox(F, D.box, D.box, d.fp && d.fp[0])], bg: pal[d.bg | 0] || pal[0] || null };
    R.path = ctx => F.path(ctx, ...R.boxes[0]);
    return R;
  }
  function solo(ctx, M, s, u, o = {}){
    const R = soloBox(M, M.tpl, M.bank.duo && M.bank.duo(s.i));
    if (!R) return null;
    const p = M.bank.get(s.i);
    duoBack(ctx, M, R);
    if (p) { duoShade(ctx, M, R, 0); photo(ctx, M, p, s, u, { box: R.boxes[0], zoom: o.zoom, auto: 'cover', fit: o.fit ? o.fit(s.i) : undefined, clip: c => R.path(c, 0) }); }
    return R;
  }
  function rim(ctx, b, color, w){ ctx.save(); ctx.fillStyle = color; ctx.fillRect(b[0] - w, b[1] - w, b[2] + 2 * w, b[3] + 2 * w); ctx.restore(); }
  // 틀이 있는 두 장 장면의 바탕과 틀 아래 것: 바탕색(두 장 틀 안), 틀마다 옅은 그림자(조금 어긋나게 한 번 — 흐림 효과는 느려서 안 써요)
  function duoBack(ctx, M, R){
    if (R.bg) { ctx.save(); ctx.fillStyle = R.bg.c; ctx.fillRect(...R.D.box); ctx.restore(); }
  }
  function duoShade(ctx, M, R, k, ringColor){
    const m = Math.min(M.W, M.H);
    ctx.save(); ctx.translate(m * .006, m * .008); ctx.beginPath(); R.path(ctx, k); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fill(); ctx.restore();
    if (ringColor) { ctx.save(); ctx.beginPath(); R.path(ctx, k); ctx.strokeStyle = ringColor; ctx.lineWidth = Math.max(4, m * .012); ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }   // 큰+작은의 작은 사진: 흰 테두리
  }
  // 두 칸에 사진 한 장씩: 칸마다 photo()와 같은 켄 번즈(뒤 칸은 반대 방향), 큰+작은의 작은 사진엔 흰 테두리
  // o.under(box, 사진 번호): 사진을 그리기 전에 칸 아래 그릴 것(그림자 등), o.fit(사진 번호): 맞춤 방식을 직접 정할 때
  function duo(ctx, M, s, u, o = {}){
    const R = duoBoxes(M, M.tpl, M.bank.duo && M.bank.duo(s.i)), [A, B] = R.boxes;
    const one = (idx, b, kk, k) => {
      const p = M.bank.get(idx); if (!p) return;
      if (R.fr) duoShade(ctx, M, R, k, k === 1 && R.lay === 'pip' ? (o.rim || '#fff') : null);
      else if (o.under) o.under(b, idx);
      photo(ctx, M, p, { ...s, i: idx, k: kk }, u, { box: b, zoom: o.zoom, auto: 'cover', fit: o.fit ? o.fit(idx) : undefined, clip: R.fr ? c => R.path(c, k) : undefined });
    };
    if (R.fr) duoBack(ctx, M, R);
    one(s.i, A, s.k, 0);
    if (R.lay === 'pip' && !R.fr) rim(ctx, B, o.rim || '#fff', Math.max(2, Math.min(M.W, M.H) * .006));
    one(s.j, B, s.k + 1, 1);
    return R;
  }

  // ===== 한 프레임 =====
  function frame(ctx, t, M){
    const { P, W, H, tpl } = M, segs = P.segs, xf = P.xf || tpl.xf, k = at(segs, t), s = segs[k], n = segs[k + 1];
    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = tpl.bg; ctx.fillRect(0, 0, W, H);
    const mix = n && t > n.start - xf ? ease(cl((t - (n.start - xf)) / xf)) : 0;
    if (mix > 0 && tpl.trans === 'dip' && !P.fast) {          // 색으로 사라졌다가 나타나기 (빠르게 넘길 땐 깜빡여 보여서 겹쳐 넘기기)
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
    const f = s.vid && M.live && M.live.get(s);
    if (f) {   // 영상 장면: 그 순간의 영상 프레임을 사진 자리에 (흐린 배경은 첫 장면 것)
      const b = M.bank, p = b.get(s.i), fw = f.videoWidth || f.width, fh = f.videoHeight || f.height;
      M.bank = Object.assign(Object.create(b), { get: i => i === s.i && p ? { img: f, bg: p.bg, w: fw, h: fh } : b.get(i) });
      try { M.tpl[s.kind](ctx, M, s, t - s.start); } finally { M.bank = b; }
    } else M.tpl[s.kind](ctx, M, s, t - s.start);
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
  // cut(2차 업데이트) = { a, b }: 곡에서 쓸 구간(초). 중간에서 시작하면 1초 동안 커지고, 모자라면 그 구간만 다시
  async function mix(src, total, cut){
    const oc = new OfflineAudioContext(2, Math.ceil(total * SR), SR);
    if (src && cut) {
      const a = Math.max(0, Math.min(src.duration - .5, cut.a || 0)), b = Math.min(src.duration, Math.max(a + .5, cut.b || src.duration)), fin = a > .05 ? 1 : .6;
      const s = oc.createBufferSource(); s.buffer = src;
      if (b - a < total) { s.loop = true; s.loopStart = a; s.loopEnd = b; }
      const g = oc.createGain();
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(1, fin);
      g.gain.setValueAtTime(1, Math.max(fin, total - 4)); g.gain.linearRampToValueAtTime(0, total);
      s.connect(g); g.connect(oc.destination); s.start(0, a);
    } else if (src) {
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

  // ===== 박자 찾기 (2차 업데이트) =====
  // 음악에서 박자 자리를 찾아요. 결과 { bpm, beats: [초], down: 마디 첫 박인 박자 번호(0~3), clear: 박자가 뚜렷한 정도(0~1) }, 못 찾으면 null
  //  1) 낮은·중간·높은 소리로 나눠 약 11.6ms마다 세기를 재고, 세기가 갑자기 커지는 정도(온셋)를 더해요
  //  2) 온셋의 자기상관으로 빠르기를 찾아요 (1분에 50~200박, 110박 근처를 조금 더 믿어요)
  //  3) 그 빠르기로 박자 자리를 하나씩 따라가요 (동적 계획법, Ellis 2007 방식 — 빠르기가 조금 흔들리는 곡도 따라가요)
  //  4) 네 박 가운데 소리가 가장 센 자리를 마디 첫 박으로 봐요
  async function beats(buf){
    const sr = buf.sampleRate, hop = Math.round(sr * .0116), hs = hop / sr;
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const N = Math.floor(L.length / hop);
    if (N < 600) return null;   // 7초보다 짧은 소리
    const kL = 1 - Math.exp(-2 * Math.PI * 150 / sr), kH = 1 - Math.exp(-2 * Math.PI * 2500 / sr);
    const E = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
    let l1 = 0, l2 = 0, h1 = 0, i = 0;
    for (let n = 0; n < N; n++) {
      let el = 0, em = 0, eh = 0;
      for (const end = i + hop; i < end; i++) {
        const x = (L[i] + R[i]) * .5;
        l1 += kL * (x - l1); l2 += kL * (l1 - l2); h1 += kH * (x - h1);
        const mi = h1 - l2, hi = x - h1;
        el += l2 * l2; em += mi * mi; eh += hi * hi;
      }
      E[0][n] = el; E[1][n] = em; E[2][n] = eh;
      if (n % 5000 === 4999) await new Promise(r => setTimeout(r, 0));   // 화면이 멈춘 것처럼 보이지 않게 잠깐씩 쉬어요
    }
    const on = new Float32Array(N), lowOn = new Float32Array(N);
    E.forEach((e, b) => {
      let mx = 0;
      for (let n = 0; n < N; n++) if (e[n] > mx) mx = e[n];
      if (!mx) return;
      let prev = Math.log1p(1000 * e[0] / mx);
      for (let n = 1; n < N; n++) { const v = Math.log1p(1000 * e[n] / mx), d = v - prev; prev = v; if (d > 0) { on[n] += d; if (b === 0) lowOn[n] = d; } }
    });
    // 주변(앞뒤 0.4초) 평균보다 튀는 만큼만 남기고, 크기를 맞춰요
    const ps = new Float64Array(N + 1), o = new Float32Array(N), Wn = Math.round(.4 / hs);
    for (let n = 0; n < N; n++) ps[n + 1] = ps[n] + on[n];
    let sd = 0, mean = 0;
    for (let n = 0; n < N; n++) { const a = Math.max(0, n - Wn), b = Math.min(N, n + Wn + 1), v = Math.max(0, on[n] - (ps[b] - ps[a]) / (b - a)); o[n] = v; sd += v * v; }
    sd = Math.sqrt(sd / N);
    if (!(sd > 0)) return null;   // 소리가 없는 파일
    for (let n = 0; n < N; n++) { o[n] /= sd; mean += o[n]; }
    mean /= N;
    // 빠르기
    const lo = Math.floor(60 / 200 / hs), hi = Math.ceil(60 / 50 / hs), ac = new Float64Array(hi * 2 + 3);
    for (let lag = 0; lag < ac.length; lag++) {
      let v = 0;
      for (let n = 0, e2 = N - lag; n < e2; n++) v += (o[n] - mean) * (o[n + lag] - mean);
      ac[lag] = v / (N - lag);
      if (lag % 60 === 59) await new Promise(r => setTimeout(r, 0));
    }
    let top = -1e9, bl = 0;
    for (let lag = lo; lag <= hi; lag++) {
      const wgt = Math.exp(-.5 * Math.pow(Math.log2(60 / (lag * hs) / 110) / .9, 2)), v = wgt * (ac[lag] + .5 * ac[lag * 2]);
      if (v > top) { top = v; bl = lag; }
    }
    if (!bl || !(ac[0] > 0)) return null;
    const y0 = ac[bl - 1], y1 = ac[bl], y2 = ac[bl + 1], dd = y0 - 2 * y1 + y2;
    const per = bl + (dd < 0 ? Math.max(-.5, Math.min(.5, .5 * (y0 - y2) / dd)) : 0);   // 한 박의 길이(칸)
    // 박자 자리 따라가기
    const a = Math.max(1, Math.round(per / 2)), b = Math.round(per * 2), pen = new Float32Array(b + 1);
    for (let d = a; d <= b; d++) pen[d] = -100 * Math.pow(Math.log(d / per), 2);
    const score = new Float32Array(N), back = new Int32Array(N).fill(-1);
    for (let n = 0; n < N; n++) {
      let m = -1e9, mi = -1;
      for (let d = a, e2 = Math.min(b, n); d <= e2; d++) { const v = score[n - d] + pen[d]; if (v > m) { m = v; mi = n - d; } }
      if (mi >= 0 && m > 0) { score[n] = o[n] + m; back[n] = mi; } else score[n] = o[n];
    }
    let endN = N - 1; top = -1e9;
    for (let n = Math.max(0, N - Math.round(per * 2)); n < N; n++) if (score[n] > top) { top = score[n]; endN = n; }
    const idx = [];
    for (let n = endN; n >= 0; n = back[n]) idx.push(n);
    idx.reverse();
    if (idx.length < 8) return null;
    // 마디 첫 박
    const str = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
    idx.forEach((n, k) => { let v = 0; for (let j = Math.max(0, n - 2); j <= Math.min(N - 1, n + 2); j++) v = Math.max(v, lowOn[j] * 2 + on[j]); str[k % 4] += v; cnt[k % 4]++; });
    let down = 0;
    for (let k = 1; k < 4; k++) if (str[k] / Math.max(1, cnt[k]) > str[down] / Math.max(1, cnt[down])) down = k;
    return { bpm: Math.round(60 / (per * hs)), beats: idx.map(n => +((n + .5) * hs).toFixed(4)), down, clear: +Math.max(0, Math.min(1, ac[bl] / ac[0])).toFixed(3) };
  }

  // ===== 짧은 영상 (2차 업데이트) =====
  // 폰 영상에서 고른 3~5초를 소리 없이 작은 MP4(H.264 · 긴 쪽 1920px 이하 · 초당 30장)로 다시 만들어 이 휴대폰에 보관해요. 원본(수백 MB)은 보관하지 않아요
  //  1차: Mediabunny 변환(웹코덱스로 풀고 다시 압축) → 못 푸는 형식이면 2차: <video>를 한 장씩 옮겨 가며 캔버스로 압축
  // 보관 모양은 사진과 같아요: 첫 장면 JPEG(위치 맞추기·목록·옛 코드용) + 클립 MP4(clip) + 길이(vid.len)
  const CLIP_MAX = 1920, CLIP_BR = 8e6;
  const isVideo = f => /^video\//.test(f.type || '') || /\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name || '');
  const even = v => Math.max(2, Math.round(v / 2) * 2);
  async function clip(file, start, len, onp, only){   // only: 시험용 — 'capture'면 2차 방식만 써요 (?debug&capturetest)
    const mb = await MB();
    let out;
    try { if (only === 'capture') throw new Error('시험: 2차 방식'); out = await clipConvert(mb, file, start, len, onp); out.how = '변환'; }
    catch (e) { out = await clipCapture(mb, file, start, len, onp); out.how = '한 장씩'; out.why = (e && e.message) || String(e); }
    const p = await clipPoster(mb, out.bytes);
    let taken = out.taken;   // 찍은 날짜: 아이폰 촬영일 표시 → 파일에 적힌 만든 시각 → 파일 이름
    if (taken == null) taken = await mvhdDate(file);
    if (taken == null) taken = nameDate(file.name || '');
    return { clip: out.bytes, vid: { len: p.len }, bytes: p.bytes, thumbBytes: p.thumbBytes, w: p.w, h: p.h, taken, how: out.how, why: out.why || '' };
  }
  // MP4·MOV의 moov > mvhd에 적힌 만든 시각 (1904-01-01 UTC부터 센 초). 파일의 큰 상자를 차례로 건너뛰며 moov를 찾아요 (폰 영상은 moov가 맨 뒤에 있기도 해요)
  async function mvhdDate(file){
    try {
      let off = 0;
      for (let n = 0; n < 64 && off + 16 <= file.size; n++) {
        const h = new DataView(await file.slice(off, off + 16).arrayBuffer());
        let size = h.getUint32(0);
        const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
        if (size === 1) size = h.getUint32(8) * 4294967296 + h.getUint32(12); else if (size === 0) size = file.size - off;
        if (size < 8) return null;
        if (type === 'moov') {
          const b = new Uint8Array(await file.slice(off + 8, off + Math.min(size, 8192)).arrayBuffer());
          for (let i = 4; i + 20 < b.length; i++) if (b[i] === 0x6d && b[i + 1] === 0x76 && b[i + 2] === 0x68 && b[i + 3] === 0x64) {   // 'mvhd'
            const dv = new DataView(b.buffer, b.byteOffset + i + 4, b.length - i - 4), secs = dv.getUint8(0) === 1 ? dv.getUint32(4) * 4294967296 + dv.getUint32(8) : dv.getUint32(4);
            if (!secs) return null;
            const d = new Date((secs - 2082844800) * 1000);
            return okDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
          }
          return null;
        }
        off += size;
      }
    } catch (e) {}
    return null;
  }
  async function clipConvert(mb, file, start, len, onp){
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    try {
      const vt = await input.getPrimaryVideoTrack();
      if (!vt) throw new Error('영상이 없는 파일이에요');
      if (!(await vt.canDecode())) throw new Error('이 영상 형식은 바로 풀 수 없어요');
      const dw = await vt.getDisplayWidth(), dh = await vt.getDisplayHeight(), k = Math.min(1, CLIP_MAX / Math.max(dw, dh));
      let taken = null;
      try { const tags = await input.getMetadataTags(); if (tags && tags.date instanceof Date && !isNaN(tags.date)) taken = okDate(tags.date.getFullYear(), tags.date.getMonth() + 1, tags.date.getDate(), tags.date.getHours(), tags.date.getMinutes(), tags.date.getSeconds()); } catch (e) {}
      const target = new mb.BufferTarget();
      const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target });
      const conv = await mb.Conversion.init({ input, output, tracks: 'primary', showWarnings: false,
        video: { codec: 'avc', width: even(dw * k), height: even(dh * k), fit: 'fill', bitrate: CLIP_BR, frameRate: FPS, forceTranscode: true, allowRotationMetadata: false },
        audio: { discard: true }, trim: { start, end: start + len } });
      if (!conv.isValid) throw new Error('이 영상은 변환할 수 없어요');
      if (onp) conv.onProgress = v => onp(v);
      await conv.execute();
      if (!target.buffer || target.buffer.byteLength < 1000) throw new Error('변환 결과가 비었어요');
      return { bytes: target.buffer, taken };
    } finally { try { input.dispose(); } catch (e) {} }
  }
  async function clipCapture(mb, file, start, len, onp){
    const url = URL.createObjectURL(file), v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    try {
      await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('이 영상은 열 수 없어요')); v.src = url; v.load(); });
      try { await v.play(); } catch (e) {}   // 아이폰은 한 번 재생을 시작해야 장면을 읽어 와요
      v.pause();
      const dw = v.videoWidth, dh = v.videoHeight;
      if (!dw || !dh) throw new Error('이 영상은 열 수 없어요');
      const k = Math.min(1, CLIP_MAX / Math.max(dw, dh)), cv = document.createElement('canvas');
      cv.width = even(dw * k); cv.height = even(dh * k);
      const ctx = cv.getContext('2d', { alpha: false });
      const target = new mb.BufferTarget(), output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target });
      const src = new mb.CanvasSource(cv, { codec: 'avc', bitrate: CLIP_BR, keyFrameInterval: 1 });
      output.addVideoTrack(src, { frameRate: FPS });
      await output.start();
      const dur = isFinite(v.duration) ? v.duration : start + len, n = Math.max(1, Math.round(Math.min(len, Math.max(.2, dur - start)) * FPS));
      const seek = t => new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('영상 장면을 옮기다 멈췄어요')), 8000);
        v.onseeked = () => { clearTimeout(to); res(); };
        v.currentTime = t;
      });
      for (let f = 0; f < n; f++) {
        await seek(Math.max(0, Math.min(dur - .002, start + f / FPS)));
        ctx.drawImage(v, 0, 0, cv.width, cv.height);
        await src.add(f / FPS, 1 / FPS);
        if (onp) onp((f + 1) / n);
      }
      src.close();
      await output.finalize();
      return { bytes: target.buffer, taken: null };
    } finally { URL.revokeObjectURL(url); v.removeAttribute('src'); try { v.load(); } catch (e) {} }
  }
  async function clipPoster(mb, bytes){
    const input = new mb.Input({ source: new mb.BufferSource(bytes), formats: mb.ALL_FORMATS });
    try {
      const vt = await input.getPrimaryVideoTrack();
      const first = await vt.getFirstTimestamp(), len = (await vt.computeDuration()) - first;
      const got = await new mb.CanvasSink(vt, {}).getCanvas(first);
      if (!got) throw new Error('영상 첫 장면을 읽지 못했어요');
      const c = got.canvas, tc = document.createElement('canvas'), tk = Math.min(1, 360 / Math.max(c.width, c.height));
      tc.width = Math.round(c.width * tk); tc.height = Math.round(c.height * tk);
      const tx = tc.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(c, 0, 0, tc.width, tc.height);
      const [blob, thumb] = [await toBlob(c, 'image/jpeg', .9), await toBlob(tc, 'image/jpeg', .82)];
      if (!blob || !thumb) throw new Error('영상 첫 장면을 저장하지 못했어요');
      return { bytes: await blob.arrayBuffer(), thumbBytes: await thumb.arrayBuffer(), w: c.width, h: c.height, len: +Math.max(.5, len).toFixed(3) };
    } finally { try { input.dispose(); } catch (e) {} }
  }
  // 영상을 만들 때: 영상 장면이 보이는 프레임마다 클립을 처음부터 차례로 한 장씩 풀어요. live = 장면 → 그 순간의 프레임(캔버스)
  // 장면이 겹쳐 들어오기 시작할 때(start - xf) 클립이 0초부터 흐르고, 클립이 먼저 끝나면 마지막 장면에 멈춰 있어요
  function feeder(mb, P, bank, xf){
    const V = P.segs.filter(s => s.vid && bank.clip && bank.clip(s.i)).map(s => {
      const a = s.start - xf;
      return { s, a, f0: Math.max(0, Math.floor(a * FPS)), f1: Math.ceil((s.start + s.dur) * FPS) + 1, it: null, input: null, done: false };
    });
    const live = new Map();
    const shut = v => {
      const { it, input } = v;
      v.it = v.input = null; v.done = true; live.delete(v.s);
      Promise.resolve(it && it.return ? it.return() : null).catch(() => {}).then(() => { try { if (input) input.dispose(); } catch (e) {} });
    };
    const self = {
      live, count: V.length, failed: 0,
      async at(f){
        for (const v of V) {
          if (v.done || f < v.f0) continue;
          if (f >= v.f1) { shut(v); continue; }
          try {
            if (!v.it) {
              v.input = new mb.Input({ source: new mb.BufferSource(bank.clip(v.s.i)), formats: mb.ALL_FORMATS });
              const tr = await v.input.getPrimaryVideoTrack(), first = await tr.getFirstTimestamp();
              const end = first + Math.max(0, (await tr.computeDuration()) - first - 1 / FPS), ts = [];
              for (let g = v.f0; g < v.f1; g++) ts.push(Math.min(end, first + Math.max(0, g / FPS - v.a)));
              v.it = new mb.CanvasSink(tr, { poolSize: 2 }).canvasesAtTimestamps(ts);
            }
            const r = await v.it.next();
            if (r && r.value) live.set(v.s, r.value.canvas);
          } catch (e) { self.failed++; self.why = (e && e.message) || String(e); shut(v); }   // 이 클립을 못 풀면 그 장면은 첫 장면 사진으로 (영상 전체는 계속 만들어요)
        }
      },
      close(){ V.forEach(v => { if (!v.done) shut(v); }); }
    };
    return self;
  }
  // 미리 보기의 영상 장면: 클립을 <video>로 열어 장면 시간에 맞춰 재생하거나(재생 중) 그 자리에 세워 둬요(멈춤). 실제로 만들 때는 feeder가 한 장씩 정확히 풀어요
  function liveVideos(M){
    const V = M.P.segs.filter(s => s.vid && M.bank.clip && M.bank.clip(s.i));
    if (!V.length) return null;
    const xf = M.P.xf || M.tpl.xf, els = new Map(), live = new Map();   // els: 사진 번호 → <video>
    const el = i => {
      let v = els.get(i);
      if (v) return v;
      v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      v.onloadedmetadata = () => { v.width = v.videoWidth; v.height = v.videoHeight; };   // 그리기 도구가 width·height로 사진 크기를 읽어요
      v.src = URL.createObjectURL(new Blob([M.bank.clip(i)], { type: 'video/mp4' }));
      els.set(i, v);
      return v;
    };
    return {
      live,
      // t: 영상 시간, playing: 재생 중인지, redraw: 멈춘 채 장면을 옮겼을 때 그 장면이 준비되면 부를 것
      sync(t, playing, redraw){
        const busy = new Set();
        for (const s of V) {
          const a = s.start - xf, b = s.start + s.dur;
          if (t < a - 1.5 || t >= b) { live.delete(s); continue; }
          const v = el(s.i);
          busy.add(s.i);
          const ct = Math.max(0, Math.min((isFinite(v.duration) ? v.duration : 99) - .04, t - a));
          if (playing && t >= a) {
            v._want = null;
            const far = Math.abs(v.currentTime - ct) > .3;
            if (v._noplay) { if (!v.seeking && Math.abs(v.currentTime - ct) > .1) v.currentTime = ct; }   // 자동 재생이 막힌 폰(저전력 모드 등): 조금씩 옮겨 가며 보여 줘요
            else if (v.paused || v.ended) { if (far || !v.ended) { v.currentTime = ct; v.play().catch(() => { v._noplay = true; }); } }   // 끝까지 간 영상은 마지막 장면에 멈춰 있어요 (뒤로 돌아오면 다시 재생)
            else if (far) v.currentTime = ct;
          } else {
            if (!v.paused) v.pause();
            if (v._want !== ct) { v._want = ct; if (redraw) v.onseeked = redraw; v.currentTime = ct; }
            if (v.readyState < 2 && redraw) v.onloadeddata = redraw;
          }
          if (t >= a && v.readyState >= 2 && v.width) live.set(s, v); else live.delete(s);
        }
        for (const [i, v] of els) if (!busy.has(i) && !v.paused) v.pause();
      },
      pause(){ for (const v of els.values()) if (!v.paused) v.pause(); },
      close(){ for (const v of els.values()) { v.pause(); v.onseeked = v.onloadeddata = v.onloadedmetadata = null; const u = v.src; v.removeAttribute('src'); try { v.load(); } catch (e) {} URL.revokeObjectURL(u); } els.clear(); live.clear(); }
    };
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
  // force: 'memory'면 저장 공간을 안 쓰고 메모리에 모아요 (저장 공간 쓰기가 멈춘 기기에서 다시 만들 때)
  async function target(mb, name, info, force){
    try {
      if (force !== 'memory' && navigator.storage && navigator.storage.getDirectory) {
        await cleanup();
        const dir = await navigator.storage.getDirectory();
        if (await diskOK(dir)) {
          const h = await dir.getFileHandle(name, { create: true });
          const w = await h.createWritable();
          info.store = '휴대폰 저장 공간';
          return { fastStart: 'reserve', target: new mb.StreamTarget(w, { chunked: true, chunkSize: 4 * 1024 * 1024 }),   // 4MB씩 나눠 써요 (16MB씩 쓸 때 아이폰에서 사진을 못 읽는 일이 있었어요)
            file: async () => new File([await h.getFile()], name, { type: 'video/mp4' }) };
        }
      }
    } catch (e) {}
    const t = new mb.BufferTarget();
    info.store = '메모리';
    return { fastStart: 'in-memory', target: t, file: async () => new File([t.buffer], name, { type: 'video/mp4' }) };
  }

  // ===== 만들기 =====
  // job: { P, tpl, d, bank, ratio, q, music(AudioBuffer|null), cut(음악에서 쓸 구간 { a, b }, 없으면 곡 전체), name, stop(취소하면 true),
  //        wake(버튼을 누른 순간 요청한 화면 꺼짐 방지), store('memory' 강제), onStage(단계, info), tries }
  // 멈춤 감지: 화면이 켜져 있는데 한동안 한 걸음도 못 나가면 'stall' 오류로 끝내요 → app.js가 다른 방식으로 한 번 더 만들어요
  const PATIENCE = { '라이브러리': 60, '글꼴': 60, '음악': 60, '저장 준비': 60, '음악 압축': 150, '영상': 25, '마무리': 120 };
  async function make(job, onp){
    const info = { webkit: WEBKIT, tries: job.tries || 1 };
    let wake = job.wake ? await Promise.resolve(job.wake).catch(() => null) : null;
    info.wake = wake ? '켜짐' : (navigator.wakeLock ? '못 켬' : '없음');
    const relock = async () => {
      try { if (navigator.wakeLock && (!wake || wake.released)) { wake = await navigator.wakeLock.request('screen'); job.wakeNow = wake; info.wake = '다시 켬'; } } catch (e) {}
    };
    let last = performance.now(), tickAt = last, stage = '라이브러리', stallReject = null;
    const stall = new Promise((_, rej) => { stallReject = rej; });
    stall.catch(() => {});
    const beat = s => { last = performance.now(); if (s && s !== stage) { stage = s; info.stage = s; if (job.onStage) job.onStage(s, info); } };
    const dog = setInterval(() => {
      const now = performance.now();
      // 화면이 꺼졌다 켜졌거나(타이머가 한참 멈춤) 다른 앱에 있었으면 처음부터 다시 셈
      if (now - tickAt > 6000 || document.visibilityState !== 'visible') last = now;
      tickAt = now;
      if (now - last > (PATIENCE[stage] || 60) * 1000) {
        clearInterval(dog);
        stallReject(Object.assign(new Error(`진행이 멈췄어요 (${stage}${info.at ? ' ' + info.at : ''})`), { code: 'stall', stage }));
      }
    }, 2000);
    const w = p => Promise.race([p, stall]);
    const vis = () => { last = performance.now(); if (document.visibilityState === 'visible') relock(); else info.left = (info.left || 0) + 1; };
    document.addEventListener('visibilitychange', vis);
    let output = null, fd = null;
    try {
      const mb = await w(MB());
      const [W, H] = size(job.ratio, job.q), vbr = bitrate(job.q, job.P.total);
      Object.assign(info, { W, H, bitrate: vbr });
      if (!(await w(mb.canEncodeVideo('avc', { width: W, height: H, bitrate: vbr, frameRate: FPS })))) {
        throw Object.assign(new Error(`이 기기에서는 ${W}×${H} 영상을 만들 수 없어요`), { code: 'size' });
      }
      if (WEBKIT || !(await w(mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: SR, bitrate: ABR })))) { await w(wasmAac()); info.audio = '보조 인코더(WASM AAC)'; }
      else info.audio = '내장 AAC';
      beat('글꼴');
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { alpha: false });
      const M = scene(job.P, W, H, job.tpl, job.d, job.bank);
      const total = job.P.total, frames = Math.round(total * FPS);
      await w(fonts(job.tpl, job.sample || ''));
      beat('음악');
      const audio = await w(mix(job.music, total, job.cut));
      fd = feeder(mb, job.P, job.bank, job.P.xf || job.tpl.xf);   // 영상 장면이 있으면 클립을 한 장씩 풀어 줘요
      if (fd.count) { M.live = fd.live; info.clips = fd.count; }
      if (job.P.bpm) info.bpm = job.P.bpm;
      beat('저장 준비');
      const tg = await w(target(mb, job.name, info, job.store));
      if (job.onStage) job.onStage('저장 준비', info);
      output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: tg.fastStart }), target: tg.target });
      const vs = new mb.CanvasSource(cv, { codec: 'avc', bitrate: vbr, keyFrameInterval: 2, onEncoderConfig: c => { info.codec = c.codec; } });
      output.addVideoTrack(vs, { frameRate: FPS, maximumPacketCount: frames + 60 });
      const as = new mb.AudioBufferSource({ codec: 'aac', bitrate: ABR });
      output.addAudioTrack(as, { maximumPacketCount: Math.ceil(total * 100 * 1.4) + 200 });
      if (!wake) await relock();
      const T0 = performance.now();
      await w(output.start());
      beat('음악 압축');
      await w(as.add(audio)); as.close();
      beat('영상');
      let key = '', posterJob = null, drawT = 0, addT = 0;
      const posterAt = Math.round(Math.min(job.P.segs[0].dur * .75, total / 2) * FPS);   // 완성 화면 영상 칸에 보일 장면
      for (let i = 0; i < frames; i++) {
        if (job.stop) throw Object.assign(new Error('그만 만들었어요'), { code: 'cancel' });
        const t = i / FPS, need = photosAt(job.P, t, job.tpl.xf);
        if (need.key !== key) { await w(job.bank.need(need.now, need.soon)); key = need.key; }
        if (job.simStall && job.tries === 1 && i === 60) await w(new Promise(() => {}));   // 시험용(?debug&stalltest): 첫 번째는 일부러 멈춰 보기
        if (fd.count) await w(fd.at(i));
        const a = performance.now();
        frame(ctx, t, M);
        const b = performance.now();
        if (i === posterAt) posterJob = new Promise(r => cv.toBlob(r, 'image/jpeg', .85));
        await w(vs.add(t, 1 / FPS));
        drawT += b - a; addT += performance.now() - b;
        beat();
        if (i % 10 === 9 || i === frames - 1) {
          info.at = `${i + 1}/${frames}`;
          if (onp) onp({ done: (i + 1) / frames, elapsed: (performance.now() - T0) / 1000, canvas: cv });
          await new Promise(r => setTimeout(r, 0));
        }
      }
      info.drawMs = +(drawT / frames).toFixed(1); info.addMs = +(addT / frames).toFixed(1);   // 한 장 그리는 데 / 압축에 넘기는 데 걸린 시간
      if (fd.failed) { info.clipFail = fd.failed; info.clipWhy = fd.why; }   // 못 푼 영상 장면 수 (그 장면은 첫 장면 사진으로 들어갔어요)
      vs.close();
      beat('마무리');
      if (onp) onp({ done: 1, finishing: true, elapsed: (performance.now() - T0) / 1000 });
      await w(output.finalize());
      const pb = posterJob ? await posterJob : null;
      if (pb) info.poster = URL.createObjectURL(pb);
      const file = await w(tg.file());
      Object.assign(info, { seconds: +((performance.now() - T0) / 1000).toFixed(1), frames, size: file.size, length: total });
      return { file, info };
    } catch (e) {
      if (output) { try { await Promise.race([output.cancel(), new Promise(r => setTimeout(r, 3000))]); } catch (_) {} }
      if (e && typeof e === 'object') { e.info = info; if (e.cause) info.cause = e.cause; }
      throw e;
    } finally {
      if (fd) fd.close();
      clearInterval(dog);
      document.removeEventListener('visibilitychange', vis);
    }
  }

  // ===== 미리보기: 화면용 작은 캔버스에 실제 속도로 재생 =====
  function player(canvas, M, audio){
    const ctx = canvas.getContext('2d', { alpha: false }), sc = canvas.width / M.W;
    let ac = null, node = null, t0 = 0, pos = 0, on = false, dead = false, starting = false, raf = 0, ended = null, ticker = null;
    const now = () => on ? pos + (ac.currentTime - t0) : pos;
    const LV = liveVideos(M);   // 영상 장면이 있을 때만 (2차 업데이트)
    if (LV) M.live = LV.live;
    const again = () => { if (dead || on) return; LV.sync(pos, false, again); ctx.setTransform(sc, 0, 0, sc, 0, 0); frame(ctx, pos, M); };   // 멈춘 장면의 영상이 준비되면 다시 그려요
    function draw(t){
      if (dead) return;
      const need = photosAt(M.P, t, M.tpl.xf);
      const job = M.bank.need(need.now, need.soon);
      if (LV) LV.sync(t, on, again);
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      frame(ctx, t, M);
      if (ticker) ticker(t);
      // 멈춘 채 장면을 옮기면 사진이 아직 안 풀려 있을 수 있어요 → 풀리면 그 장면을 다시 그려요
      job.then(() => { if (!dead && !on && Math.abs(pos - t) < 1e-3) { if (LV) LV.sync(t, false, again); ctx.setTransform(sc, 0, 0, sc, 0, 0); frame(ctx, t, M); } }).catch(() => {});
    }
    function loop(){
      if (!on || dead) return;   // 멈췄거나 닫혔으면 그리기를 끝내요
      const t = now();
      if (t >= M.P.total) { stop(); pos = 0; draw(0); if (ended) ended(); return; }
      draw(t); raf = requestAnimationFrame(loop);
    }
    async function play(){
      if (on || dead || starting) return;   // 빠르게 두 번 눌러도 한 번만
      starting = true;
      try {
        // 아이폰 무음 스위치를 켜 둬도 미리 보기 소리가 나게 (지원하는 브라우저만)
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        try { await ac.resume(); } catch (e) {}
        if (on || dead) return;
        if (audio) { node = ac.createBufferSource(); node.buffer = audio; node.connect(ac.destination); node.start(0, pos); }
        t0 = ac.currentTime; on = true; loop();
      } finally { starting = false; }
    }
    function stop(){
      if (!on) return;
      pos = now(); on = false; cancelAnimationFrame(raf);
      try { if (node) node.stop(); } catch (e) {}
      node = null;
      if (LV) LV.pause();
    }
    return {
      play, pause: stop, draw, time: now,
      get playing(){ return on; },
      seek(t){ const was = on; stop(); pos = Math.max(0, Math.min(M.P.total - .05, t)); draw(pos); if (was) play(); },
      set onend(f){ ended = f; }, set ontick(f){ ticker = f; },
      destroy(){ stop(); dead = true; cancelAnimationFrame(raf); if (LV) { LV.close(); M.live = null; } if (ac) ac.close().catch(() => {}); }
    };
  }

  // ===== 시험용 점검 (?debug) =====
  async function probe(){
    const r = { '브라우저': UA, '앱 안 브라우저': inApp() || '아님', '아이폰': IOS, '안드로이드': ANDROID, '사파리 계열(WebKit)': WEBKIT,
      'VideoEncoder': typeof VideoEncoder !== 'undefined', 'AudioEncoder': typeof AudioEncoder !== 'undefined', 'VideoDecoder': typeof VideoDecoder !== 'undefined' };
    try {
      const mb = await MB();
      for (const q of [720, 1080, 2160]) for (const ra of ['16:9', '9:16']) {
        const [w, h] = size(ra, q);
        r[`H.264 ${w}×${h}`] = await mb.canEncodeVideo('avc', { width: w, height: h, bitrate: VBR[q], frameRate: FPS }).catch(() => false);
      }
      r['내장 AAC'] = await mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: SR, bitrate: ABR }).catch(() => false);
      r['풀 수 있는 영상 형식'] = await mb.getDecodableVideoCodecs().then(a => a.join(', ') || '없음').catch(() => '?');   // 짧은 영상 넣기(2차 업데이트): hevc가 없으면 아이폰 기본 영상은 한 장씩 옮겨요
    } catch (e) { r['라이브러리'] = '못 불러옴: ' + e.message; }
    try { r['저장 공간에 바로 쓰기(OPFS)'] = await diskOK(await navigator.storage.getDirectory()); } catch (e) { r['저장 공간에 바로 쓰기(OPFS)'] = false; }
    r['화면 꺼짐 방지'] = 'wakeLock' in navigator;
    try { r['공유 창'] = !!(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(8)], 't.mp4', { type: 'video/mp4' })] })); } catch (e) { r['공유 창'] = false; }
    r['CPU 코어'] = navigator.hardwareConcurrency || '?';
    if (navigator.deviceMemory) r['메모리(GB)'] = navigator.deviceMemory;
    return r;
  }

  return {
    FPS, IOS, ANDROID, MOBILE, WEBKIT, VBR, bitrate, size, inApp, shrink, takenAt, bank, plan, photosAt, frame, scene, fonts,
    decode, mix, make, player, probe, cleanup, beats, clip, isVideo,
    segAt: (P, t) => P.segs[at(P.segs, t)],
    kit: { cl, ease, out3, lerp, rise, veil, cover, place, framed, photo, text, wrap, block, typed, grain, vignette, scrim, font,
      slots, duoBoxes, duo, rim, DUO_R, DUO_LIM, FRAMES, FP_LIM, duoBack, duoShade, rr, soloBox, solo }
  };
})();
