// 본식 동선 영상 엔진 — 신랑(at-the-altar/) · 신부(down-the-aisle/) 사이트가 같이 써요.
// 식순 → 장면 순서(build) → 한 장씩 그리기(drawFrame) → 화면 재생(player) · MP4 저장(exportMp4)
// 그림: 하객석 뒤에서 본 일반 웨딩홀 (사회자님 11/18 시안 2). 화면에는 주인공만 진하게, 문장 한 줄씩.
// 바닥 좌표: u = 옆(버진로드 반폭 단위, 왼쪽 −, 신랑 측 = 왼쪽), d = 깊이(0 입구 → 1 단상 앞 → 1.04 단상 위)
// 영상 압축은 lib/의 Mediabunny 1.64.0(MPL-2.0)이 브라우저에 들어 있는 웹코덱스(WebCodecs)로 해요. 서버로 아무것도 보내지 않아요.

const Aisle = (() => {
  const FPS = 30, VW = 480, VH = 854, VBR = 1.6e6;   // 영상: 세로 480×854 (11/9 정함), 소리 없음
  const UA = navigator.userAgent;
  const IOS = /iP(hone|ad|od)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/i.test(UA);
  const HERE = document.currentScript ? new URL(".", document.currentScript.src).href : document.baseURI;

  // ===== 색 · 사람 모양 =====
  const C = { bg:"#FBF7F2", room:"#F6EFE7", wall:"#EFE2D2", flower:"#F2C9D3", flower2:"#F7DCE2", stage:"#E4D3BE",
    seat:"#F1EBE4", road:"#F5DCE2", ink:"#222222", sub:"#8A7F76", skin:"#EBCDB3", hair:"#2F2622" };
  const LOOK = {
    groom:  { body:"#2E3D63", leg:"#1C2440", kind:"suit", shirt:true },
    bride:  { body:"#FFFFFF", edge:"#E2B9C5", kind:"dress", veil:true },
    father: { body:"#6F7680", leg:"#555B63", kind:"suit" },   // 신부 아버님
    gdad:   { body:"#555B63", leg:"#44494F", kind:"suit" },   // 신랑 아버님
    gmom:   { body:"#9DB3D6", kind:"hanbok" },                // 신랑 어머님
    bmom:   { body:"#E9A9BB", kind:"hanbok" },                // 신부 어머님
    elder:  { body:"#6F7680", leg:"#555B63", kind:"suit" },   // 덕담 · 성혼선언 하시는 어른
    singer: { body:"#8C8C8C", leg:"#6E6E6E", kind:"suit" },   // 축사 · 축가 하는 분
    kid:    { body:"#F3D27A", edge:"#E2BC5A", kind:"dress", sz:.58 },   // 화동
    c1:     { kind:"candle" }, c2: { kind:"candle" }
  };
  const ACTORS = ["c1", "c2", "gmom", "bmom", "gdad", "father", "elder", "singer", "kid", "bride", "groom"];
  const GLOW = { groom:"#2E3D63", bride:"#D6336C" };
  const FAINT = .5;

  // ===== 투영 (바닥 → 화면 360×640) =====
  const Y = d => 520 - 306 * d;
  const X = (u, d) => { const m = Math.abs(u), w = Math.max(14, 48 - 34 * d);   // 버진로드 밖(|u|>1)은 넓게
    return 180 + Math.sign(u) * (Math.min(m, 1) + Math.max(0, m - 1) * 2.2) * w; };
  const S = d => 1.18 - .56 * Math.min(d, 1.06);

  // ===== 카메라 =====
  const WIDE = { fx:180, fy:330, z:1 }, STAGE = { fx:180, fy:206, z:2.3 }, FRONT = { fx:180, fy:250, z:1.75 };
  const RIGHT = { fx:238, fy:250, z:1.75 }, LEFT = { fx:122, fy:250, z:1.75 };

  // ===== 식순 → 장면 순서 =====
  // o: { bride:"father"|"alone"|"groom", vows:"front"|"face", declare:"mc"|"father", blessing, song:"friend"|"groom"|"none", kids, rings, speech, event }
  // V: 화면 문장 { both:{키:[윗줄, 아랫줄]}, groom:{…}, bride:{…} } · N: 식순 이름 (text.js)
  function build(role, o, V, N){
    const me = role, G = "groom", B = "bride";
    const a = w => w === me ? 1 : FAINT;
    const steps = [];
    let pend = null;   // 다음 걸음에 섞을 정리 (숙인 고개 펴기 · 서약서 내리기 · 나온 분 들어가기)
    const cap = key => V[role][key] || V.both[key] || ["", ""];
    const step = (t, key, dur, set, cam) => {
      const s = {};
      const merge = obj => { for (const [k, v] of Object.entries(obj || {})) s[k] = Object.assign(s[k] || {}, v); };
      merge(pend); pend = null; merge(set);
      const [l1, l2] = cap(key);
      steps.push({ t, a:l1, b:l2 || "", dur, set:s, cam });
    };
    const clean = (extra) => { pend = Object.assign({
      groom:{ bow:0, paper:0, kneel:0 }, bride:{ bow:0, paper:0 }, elder:{ a:0 }, kid:{ a:0 }
    }, extra || {}); };
    const ST = { g:{ u:-1.25, d:1.04 }, b:{ u:1.25, d:1.04 } };   // 단상 위 (신랑 왼쪽 · 신부 오른쪽)
    const AI = { g:{ u:-.45, d:.9 }, b:{ u:.45, d:.9 } };          // 버진로드 앞자리
    let where = "stage";
    const down = t => {
      if (where !== "stage") return;
      step(t, "down", 3.0, { groom:{ ...AI.g, f:"F" }, bride:{ ...AI.b, f:"F" }, elder:{ a:0 } }, FRONT);
      where = "aisle";
    };

    // --- 화촉점화 · 신랑 입장 (신랑 영상만) ---
    const together = o.bride === "groom";
    if (me === G) {
      step(N.candle, "candle", 3.2, { groom:{ u:together ? -.4 : 0, d:.02, f:"B", a:1 },
        gmom:{ u:-1.25, d:.95, f:"B", a:FAINT }, bmom:{ u:1.25, d:.95, f:"B", a:FAINT },
        c1:{ u:-.8, d:.97, a:FAINT }, c2:{ u:.8, d:.97, a:FAINT } }, WIDE);
      clean({ gmom:{ a:0 }, bmom:{ a:0 }, c1:{ a:0 }, c2:{ a:0 } });
      if (!together) {
        step(N.groom, "entry1", 2.2, {}, WIDE);
        step(N.groom, "entry2", 3.0, { groom:{ d:.45 } }, { fx:180, fy:330, z:1.1 });
        step(N.groom, "entry3", 2.4, { groom:{ f:"L", bow:28 } });
        step(N.groom, "entry4", 2.4, { groom:{ f:"R", bow:28 } });
        step(N.groom, "entry5", 2.8, { groom:{ f:"B", bow:0, d:.96 } }, FRONT);
        step(N.groom, "entry6", 2.2, { groom:{ f:"F" } });
      }
    }

    // --- 신부 입장 ---
    const NB = N.bride;
    if (o.bride === "father") {
      if (me === G) {
        step(NB, "bf1", 4.8, { bride:{ sd:0, u:.05, d:.7, f:"B", a:FAINT }, father:{ sd:0, u:.6, d:.7, f:"B", a:FAINT },
          groom:{ u:-.8, d:.78, dl:.45 } }, WIDE);
        step(NB, "bf2", 2.6, { groom:{ bow:22 } }, FRONT);
        step(NB, "hand", 2.2, { groom:{ bow:0 }, father:{ u:2.4, d:.8, a:0 } });
      } else {
        const fol = { fx:180, fy:420, z:1.5 };
        step(NB, "door", 2.4, { bride:{ u:.05, d:0, f:"B", a:1 }, groom:{ u:0, d:.96, f:"F", a:FAINT } }, fol);
        step(NB, "greet1", 2.4, { bride:{ bow:24 } });
        step(NB, "bf3", 2.4, { bride:{ bow:0 }, father:{ u:.6, d:.02, f:"B", a:FAINT } });
        step(NB, "bf4", 3.0, { bride:{ d:.3 }, father:{ d:.3 } }, { fx:180, fy:380, z:1.45 });
        step(NB, "eyes", 2.8, { bride:{ d:.5 }, father:{ d:.5 } }, { fx:180, fy:335, z:1.4 });
        step(NB, "dress", 3.0, { bride:{ d:.7 }, father:{ d:.7 }, groom:{ u:-.62, d:.78, dl:.35 } }, { fx:180, fy:290, z:1.5 });
        step(NB, "bf7", 2.2, { groom:{ bow:22 } });
        step(NB, "bf7", 2.0, { groom:{ bow:0 }, father:{ u:2.4, d:.8, a:0 } });
      }
    } else if (o.bride === "alone") {
      if (me === G) {
        step(NB, "ba1", 4.4, { bride:{ sd:0, u:.05, d:.45, f:"B", a:FAINT }, groom:{ u:-.65, d:.53, dl:.3 } }, WIDE);
        step(NB, "bouquet", 2.8, { groom:{ kneel:1 } }, { fx:180, fy:330, z:1.5 });
        step(NB, "hand", 2.2, { groom:{ kneel:0 } });
      } else {
        const fol = { fx:180, fy:420, z:1.5 };
        step(NB, "door", 2.4, { bride:{ u:.05, d:0, f:"B", a:1 }, groom:{ u:0, d:.96, f:"F", a:FAINT } }, fol);
        step(NB, "greet1", 2.4, { bride:{ bow:24 } });
        step(NB, "eyes", 2.8, { bride:{ bow:0, d:.25 } }, { fx:180, fy:390, z:1.45 });
        step(NB, "dress", 3.0, { bride:{ d:.45 }, groom:{ u:-.75, d:.53, dl:.2 } }, { fx:180, fy:350, z:1.5 });
        step(NB, "ba5", 2.2, {});
      }
    } else {   // 신랑과 함께 입장
      if (me === B) step(NB, "door", 2.4, { bride:{ u:.4, d:0, f:"B", a:1 }, groom:{ u:-.4, d:0, f:"B", a:FAINT } }, { fx:180, fy:420, z:1.4 });
      else step(NB, "door", 2.4, { bride:{ u:.4, d:0, f:"B", a:FAINT }, groom:{ u:-.4, d:0, f:"B" } }, { fx:180, fy:420, z:1.4 });
      step(NB, "go", 2.8, { bride:{ d:.35 }, groom:{ d:.35 } }, { fx:180, fy:370, z:1.4 });
      step(NB, "bg3", 2.8, { bride:{ d:.7 }, groom:{ d:.7 } }, { fx:180, fy:300, z:1.45 });
    }
    step(NB, "up", 3.2, { groom:{ ...ST.g, f:"B", bow:0, kneel:0 }, bride:{ ...ST.b, f:"B" } }, STAGE);

    // --- 맞절 ---
    step(N.bow, "bow1", 2.0, { groom:{ f:"R" }, bride:{ f:"L" } }, STAGE);
    step(N.bow, "bow2", 2.6, { groom:{ bow:34 }, bride:{ bow:26 } });
    if (me === G) step(N.bow, "bow3", 2.0, {});
    step(N.bow, "bow4", 2.4, { groom:{ bow:0 }, bride:{ bow:0 } });

    // --- 화동 입장 ---
    if (o.kids) {
      step(N.kids, "kids1", 3.6, { kid:{ sd:.5, u:0, d:.98, f:"B", a:FAINT }, groom:{ f:"F" }, bride:{ f:"F" } }, { fx:180, fy:250, z:1.6 });
      step(N.kids, "kids2", 2.6, { groom:{ kneel:.45, bow:10 }, bride:{ bow:14 } });
      clean();
    }

    // --- 혼인서약 ---
    if (o.vows === "face") {
      step(N.vows, "vm1", 2.4, { groom:{ f:"R", paper:1 }, bride:{ f:"L", paper:1 } }, STAGE);
      step(N.vows, "v2", 2.4, {});
      step(N.vows, "v3", 2.4, {});
      step(N.vows, "mic", 2.2, {});
      step(N.vows, "vm5", 2.2, {});
    } else {
      step(N.vows, "vf1", 2.4, { groom:{ f:"F", paper:1 }, bride:{ f:"F", paper:1 } }, STAGE);
      step(N.vows, "v2", 2.4, {});
      step(N.vows, "v3", 2.4, {});
      step(N.vows, "mic", 2.2, {});
      step(N.vows, "vf5", 2.2, {});
    }
    clean();

    // --- 예물 교환 ---
    if (o.rings) {
      step(N.rings, "r1", 2.6, { groom:{ f:"R" }, bride:{ f:"L" } }, STAGE);
      step(N.rings, "r2", 2.2, {});
      step(N.rings, "r3", 2.6, { groom:{ f:"F" }, bride:{ f:"F" } });
    }

    // --- 성혼선언 ---
    if (o.declare === "father") {
      step(N.declare, "df1", 2.6, { elder:{ u:0, d:1.13, f:"F", a:FAINT }, groom:{ f:"B" }, bride:{ f:"B" } }, STAGE);
      step(N.declare, "d2", 2.2, {});
    } else {
      step(N.declare, "dm1", 2.2, { groom:{ f:"F" }, bride:{ f:"F" } }, STAGE);
      step(N.declare, "d2", 2.2, {});
    }

    // --- 덕담 ---
    if (o.blessing) {
      step(N.blessing, "bl1", 2.6, { elder:{ u:0, d:1.13, f:"F", a:FAINT }, groom:{ f:"B" }, bride:{ f:"B" } }, STAGE);
      step(N.blessing, "bl2", 2.4, { groom:{ bow:24 }, bride:{ bow:20 } });
      clean();
    } else if (o.declare === "father") clean();

    // --- 축사 ---
    if (o.speech) {
      down(N.speech);
      step(N.speech, "sp2", 2.6, { singer:{ u:2.6, d:.93, f:"L", a:FAINT }, groom:{ f:"R" }, bride:{ f:"R" } }, FRONT);
      step(N.speech, "talk", 2.8, { bride:{ f:"L" } });
    }

    // --- 축가 ---
    if (o.song === "friend") {
      down(N.song);
      step(N.song, "sg2", 2.4, { singer:{ u:2.6, d:.93, f:"L", a:FAINT }, groom:{ f:"R" }, bride:{ f:"R" } }, FRONT);
      step(N.song, "talk", 2.8, { bride:{ f:"L" } });
    } else if (o.song === "groom") {
      down(N.song);
      if (me === G) {
        step(N.song, "gs1", 3.2, { singer:{ a:0 }, groom:{ u:2.3, d:.8, f:"R" }, bride:{ f:"R" } }, FRONT);
        step(N.song, "gs2", 2.6, { groom:{ f:"L" } });
        step(N.song, "gs3", 3.0, { groom:{ ...AI.g, f:"L" }, bride:{ f:"F" } });
      } else {
        step(N.song, "gs1", 3.2, { singer:{ a:0 }, groom:{ u:2.3, d:.96, f:"R" }, bride:{ f:"R" } }, FRONT);   // 신부 영상: 신랑은 신부 뒤로 지나가요
        step(N.song, "gs1", 2.6, { groom:{ f:"L" } });
        step(N.song, "gs1", 3.0, { groom:{ ...AI.g, f:"L" }, bride:{ f:"F" } });
      }
    }

    // --- 영상 상영 ---
    if (o.event) step(N.event, "ev", 2.6, { singer:{ a:0 }, groom:{ f:"B" }, bride:{ f:"B" } }, where === "stage" ? STAGE : FRONT);

    // --- 부모님 인사 · 하객 인사 ---
    down(N.parents);
    const NP = N.parents, NG = N.guests;
    const near = me === G ? { g:.76, b:.88 } : { g:.88, b:.76 };   // 주인공이 화면 앞쪽에
    step(NP, me === G ? "p1" : "p1", 3.0, { singer:{ a:0 }, father:{ u:2.7, d:.76, f:"L", a:FAINT, dl:.4 }, bmom:{ u:3.0, d:.88, f:"L", a:FAINT, dl:.4 },
      groom:{ u:me === G ? 1.0 : 1.2, d:near.g, f:"R" }, bride:{ u:me === G ? 1.2 : 1.0, d:near.b, f:"R" } }, RIGHT);
    step(NP, me === G ? "p2" : "p1", 2.4, { groom:{ bow:30 }, bride:{ bow:20 } });
    step(NP, "hug", 2.4, { groom:{ bow:0 }, bride:{ bow:0 }, father:{ u:2.0 }, bmom:{ u:2.3 } });
    step(NP, "p4", 3.4, { father:{ u:2.7, a:0 }, bmom:{ u:3.0, a:0 }, gdad:{ u:-2.7, d:.76, f:"R", a:FAINT, dl:.4 }, gmom:{ u:-3.0, d:.88, f:"R", a:FAINT, dl:.4 },
      groom:{ u:me === G ? -1.0 : -1.2, d:near.g, f:"L" }, bride:{ u:me === G ? -1.2 : -1.0, d:near.b, f:"L" } }, LEFT);
    step(NP, "p4", 1.8, { groom:{ bow:30 }, bride:{ bow:20 } });
    step(NG, "p5", 3.0, { gdad:{ a:0 }, gmom:{ a:0 }, groom:{ ...AI.g, f:"F", bow:0 }, bride:{ ...AI.b, f:"F", bow:0 } }, FRONT);
    step(NG, "p6", 2.4, { groom:{ bow:30 }, bride:{ bow:30 } });

    // --- 행진 ---
    step(N.march, "m1", 2.6, { groom:{ bow:0, d:.62 }, bride:{ bow:0, d:.62 } }, { fx:180, fy:300, z:1.35 });
    step(N.march, "m2", 2.6, { groom:{ d:.32 }, bride:{ d:.32 } }, WIDE);
    step(N.march, "m3", 2.6, { groom:{ d:.03 }, bride:{ d:.03 } });
    step(N.march, "m4", 2.6, { groom:{ f:"B", bow:28 }, bride:{ f:"B", bow:28 } });
    step(N.march, "m5", 2.8, { groom:{ bow:0 }, bride:{ bow:0 } });
    step("", "end1", 2.6, { groom:{ a:0 }, bride:{ a:0 } });
    step("", "end2", 2.4, {});
    return plan(steps, me);
  }

  // ===== 장면 순서 → 걸음마다 시작 · 끝 상태 =====
  function plan(steps, main){
    const base = () => ({ u:0, d:0, f:"B", bow:0, a:0, paper:0, kneel:0 });
    let state = Object.fromEntries(ACTORS.map(k => [k, base()]));
    let cam = { ...WIDE }, T = 0;
    const out = steps.map(st => {
      const from = JSON.parse(JSON.stringify(state)), to = JSON.parse(JSON.stringify(state)), dl = {}, sd = {};
      for (const [k, v] of Object.entries(st.set || {})) {
        const { dl:x, sd:y, ...rest } = v;
        Object.assign(to[k], rest); dl[k] = x || 0; if (y !== undefined) sd[k] = y;
      }
      // 처음 나타나는 사람은 그 자리(또는 sd 깊이)에서 나타나요
      for (const k of ACTORS) if (from[k].a === 0 && to[k].a > 0) { from[k].u = to[k].u; from[k].d = sd[k] ?? to[k].d; from[k].f = to[k].f; from[k].bow = 0; }
      if (T === 0) for (const k of ACTORS) from[k].a = to[k].a;   // 첫 장면은 사람이 처음부터 보이게 (영상 첫 화면 · 멈춘 화면)
      const camTo = st.cam ? { ...st.cam } : { ...cam };
      const p = { st, t0:T, from, to, dl, camFrom:cam, camTo };
      T += st.dur; state = to; cam = camTo; return p;
    });
    // 장면 목록 (같은 식순 이름이 이어지면 한 장면)
    const scenes = [];
    out.forEach(p => { if (p.st.t && (!scenes.length || scenes[scenes.length - 1].t !== p.st.t)) scenes.push({ t:p.st.t, t0:p.t0 }); });
    return { steps:out, total:T, main, scenes };
  }

  // ===== 그리기 =====
  const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const P2 = {};
  const path = s => P2[s] || (P2[s] = new Path2D(s));
  const HALL = [
    ["M-400 40 H760 V210 H-400 Z", C.room],
    ["M112 182 L112 110 Q112 74 180 74 Q248 74 248 110 L248 182 Z", C.wall],
    ["M84 182 L276 182 L292 206 L68 206 Z", C.stage],
    ["M-400 700 L-400 206 L166 206 L132 520 L112 700 Z", C.seat],
    ["M760 700 L760 206 L194 206 L228 520 L248 700 Z", C.seat],
    ["M112 700 L248 700 L194 206 L166 206 Z", C.road]
  ];
  const FLOWERS = [[122, 104, 11, C.flower], [238, 104, 11, C.flower], [140, 84, 8, C.flower2], [220, 84, 8, C.flower2]];
  const HAIR_F = "M-10.5 -62 Q-10 -73 0 -73 Q10 -73 10.5 -62 Q4 -67 -10.5 -62 Z";
  const HAIR_S = "M-10.5 -60 Q-11 -73 1 -72 Q8 -71 9 -66 Q0 -66 -2 -56 Q-6 -52 -10.5 -60 Z";
  const VEIL = "M-11 -66 Q-16 -40 -12 -24 L12 -24 Q16 -40 11 -66 Z";
  const FLAME = "M0 -46 Q5 -39 0 -35 Q-5 -39 0 -46 Z";

  function rr(ctx, x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, color, stroke){ rr(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
  function circle(ctx, x, y, r, color){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }

  function head(ctx, f){
    if (f === "B") { circle(ctx, 0, -60, 10.5, C.hair); return; }
    circle(ctx, 0, -60, 10.5, C.skin);
    ctx.fillStyle = C.hair; ctx.fill(path(f === "F" ? HAIR_F : HAIR_S));
  }
  function figure(ctx, k, L, s){
    if (L.kind === "candle") {
      fillRR(ctx, -3, -34, 6, 34, 2, "#D9C7AE");
      ctx.fillStyle = "#F4B860"; ctx.fill(path(FLAME)); return;
    }
    const side = s.f === "L" || s.f === "R", kneel = s.kneel || 0, drop = kneel * 10;
    // 다리 · 치마
    if (L.kind === "suit") {
      const lh = 14 - kneel * 8;
      fillRR(ctx, -7, -lh, 6, lh, 2, L.leg); fillRR(ctx, 1, -lh, 6, lh, 2, L.leg);
    } else if (L.kind === "dress") {
      ctx.beginPath(); ctx.moveTo(-9, -30); ctx.lineTo(9, -30); ctx.lineTo(28, 0); ctx.lineTo(-28, 0); ctx.closePath();
      ctx.fillStyle = L.body; ctx.fill(); ctx.strokeStyle = L.edge; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(10, -30); ctx.lineTo(22, 0); ctx.lineTo(-22, 0); ctx.closePath();
      ctx.fillStyle = L.body; ctx.fill();
    }
    // 윗몸 (숙이기)
    ctx.save();
    ctx.translate(0, drop);
    const b = s.bow || 0;
    if (side) { ctx.translate(0, -26); ctx.rotate(b * Math.PI / 180); ctx.translate(0, 26); }
    else { ctx.translate(0, b * .22); ctx.scale(1, 1 - b / 140); }
    if (L.veil && s.f !== "F") { ctx.save(); ctx.globalAlpha *= .75; ctx.fillStyle = "#FFFFFF"; ctx.fill(path(VEIL)); ctx.strokeStyle = L.edge; ctx.lineWidth = 1; ctx.stroke(path(VEIL)); ctx.restore(); }
    if (L.kind === "suit") {
      fillRR(ctx, -13, -50, 26, 38, 9, L.body);
      if (L.shirt && s.f === "F") {
        ctx.beginPath(); ctx.moveTo(-5, -49); ctx.lineTo(0, -36); ctx.lineTo(5, -49); ctx.closePath(); ctx.fillStyle = "#FFFFFF"; ctx.fill();
        ctx.fillStyle = "#1C2440"; ctx.fillRect(-1.5, -46, 3, 9);
      }
    } else if (L.kind === "dress") {
      fillRR(ctx, -9, -50, 18, 24, 6, L.body, L.edge);
    } else {
      fillRR(ctx, -11, -50, 22, 22, 7, L.body);
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(-11, -36, 22, 5);
    }
    head(ctx, s.f);
    if (s.paper > .5) {
      if (s.f === "F") fillRR(ctx, -9, -44, 18, 12, 1.5, "#FFFFFF", "#CFC6BC");
      else if (side) fillRR(ctx, 6, -47, 9, 12, 1.5, "#FFFFFF", "#CFC6BC");
    }
    ctx.restore();
  }

  function stateAt(P, t){
    t = Math.max(0, Math.min(P.total - 1e-3, t));
    let p = P.steps[P.steps.length - 1];
    for (const q of P.steps) if (t >= q.t0 && t < q.t0 + q.st.dur) { p = q; break; }
    const lt = t - p.t0, dur = p.st.dur;
    const mv = Math.max(.01, Math.min(dur * .85, dur - .3));
    const kc = ease(lt / mv);
    const cam = { fx:lerp(p.camFrom.fx, p.camTo.fx, kc), fy:lerp(p.camFrom.fy, p.camTo.fy, kc), z:lerp(p.camFrom.z, p.camTo.z, kc) };
    const list = [];
    for (const k of ACTORS) {
      const A = p.from[k], B = p.to[k], dl = p.dl[k] || 0;
      if (A.a <= .01 && B.a <= .01) continue;
      const km = ease((lt / mv - dl) / (1 - dl));
      const s = { u:lerp(A.u, B.u, km), d:lerp(A.d, B.d, km), a:lerp(A.a, B.a, Math.max(0, Math.min(1, (lt - (A.a === 0 ? dl * mv : 0)) / .5))), paper:B.paper,
        bow:lerp(A.bow, B.bow, ease(lt / .7)), kneel:lerp(A.kneel || 0, B.kneel || 0, ease(lt / .7)), f:B.f };
      let sx = 1;
      if (A.f !== B.f) { const kt = Math.min(1, lt / .5); s.f = kt < .5 ? A.f : B.f; sx = Math.max(.12, Math.abs(1 - 2 * kt)); }
      const moving = (A.u !== B.u || A.d !== B.d) && km > 0 && km < 1;
      const bob = moving ? -Math.abs(Math.sin(lt * Math.PI * 2)) * 2 * S(s.d) : 0;
      list.push({ k, s, sx, bob });
    }
    list.sort((x, y) => y.s.d - x.s.d);   // 먼 사람부터
    return { p, lt, cam, list };
  }

  const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  function drawFrame(ctx, P, t, W, H){
    const { p, lt, cam, list } = stateAt(P, t);
    const k = W / 360;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 360, H / k);
    ctx.save();
    ctx.translate(180, 330); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
    for (const [d, c] of HALL) { ctx.fillStyle = c; ctx.fill(path(d)); }
    for (const [x, y, r, c] of FLOWERS) circle(ctx, x, y, r, c);
    for (const it of list) {
      const L = LOOK[it.k], s = it.s, x = X(s.u, s.d), y = Y(s.d), sc = S(s.d) * (L.sz || 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
      if (it.k === P.main) { ctx.save(); ctx.globalAlpha *= .16; ctx.beginPath(); ctx.ellipse(x, y, 30 * sc, 7 * sc, 0, 0, Math.PI * 2); ctx.fillStyle = GLOW[P.main]; ctx.fill(); ctx.restore(); }
      ctx.translate(x, y + it.bob); ctx.scale(sc * it.sx * (s.f === "L" ? -1 : 1), sc);
      figure(ctx, it.k, L, s);
      ctx.restore();
    }
    ctx.restore();
    // 위 · 아래 글자 자리
    ctx.fillStyle = C.bg; ctx.fillRect(0, 540, 360, 100); ctx.fillRect(0, 0, 360, 66);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    if (p.st.t) { ctx.fillStyle = C.sub; ctx.font = `700 15px ${FONT}`; ctx.fillText(p.st.t, 180, 44); }
    const fade = p.t0 === 0 ? 1 : Math.min(1, lt / .25);
    ctx.globalAlpha = fade; ctx.fillStyle = C.ink;
    const line = (s, y) => {
      let size = 25; ctx.font = `900 ${size}px ${FONT}`;
      while (size > 17 && ctx.measureText(s).width > 334) { size -= 1; ctx.font = `900 ${size}px ${FONT}`; }
      ctx.fillText(s, 180, y);
    };
    if (p.st.b) { line(p.st.a, 582); line(p.st.b, 616); } else line(p.st.a, 598);
    ctx.globalAlpha = 1;
  }

  // ===== 화면 재생 =====
  function player(canvas, P){
    const ctx = canvas.getContext("2d", { alpha:false });
    let t = 0, on = false, last = 0, raf = 0;
    const api = { onTick:null, onEnd:null, onState:null };
    const draw = () => { drawFrame(ctx, P, t, canvas.width, canvas.height); if (api.onTick) api.onTick(t); };
    const loop = now => {
      if (!on) return;
      t += Math.min(.1, (now - last) / 1000); last = now;
      if (t >= P.total) { t = P.total; on = false; draw(); if (api.onState) api.onState(false); if (api.onEnd) api.onEnd(); return; }
      draw(); raf = requestAnimationFrame(loop);
    };
    Object.assign(api, {
      play(){ if (on) return; if (t >= P.total - .05) t = 0; on = true; last = performance.now(); raf = requestAnimationFrame(loop); if (api.onState) api.onState(true); },
      pause(){ if (!on) return; on = false; cancelAnimationFrame(raf); draw(); if (api.onState) api.onState(false); },
      seek(x){ t = Math.max(0, Math.min(P.total, x)); last = performance.now(); draw(); },
      draw, get t(){ return t; }, get on(){ return on; }, total:P.total
    });
    draw();
    return api;
  }

  // ===== MP4 저장 =====
  function inApp(){
    if (/Instagram/i.test(UA)) return "인스타그램";
    if (/KAKAOTALK/i.test(UA)) return "카카오톡";
    if (/NAVER\(inapp/i.test(UA)) return "네이버";
    if (/FBAN|FBAV/i.test(UA)) return "페이스북";
    if (/ Line\//i.test(UA)) return "라인";
    if (/; wv\)/.test(UA)) return "앱";
    return "";
  }
  let mbJob = null;
  const MB = () => mbJob || (mbJob = import(new URL("lib/mediabunny.min.mjs", HERE).href).catch(e => { mbJob = null; throw e; }));
  async function fontsReady(){
    try { await Promise.all([document.fonts.load(`900 25px "Noto Sans KR"`, "가"), document.fonts.load(`700 15px "Noto Sans KR"`, "가")]); } catch (e) {}
  }
  // job: { stop } · onp(0~1)
  async function exportMp4(P, name, job, onp){
    const mb = await MB();
    if (typeof VideoEncoder === "undefined" || !(await mb.canEncodeVideo("avc", { width:VW, height:VH, bitrate:VBR, frameRate:FPS }).catch(() => false)))
      throw Object.assign(new Error("이 기기에서는 영상 파일을 만들 수 없어요"), { code:"unsupported" });
    let wake = null;
    try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {}
    const cv = document.createElement("canvas"); cv.width = VW; cv.height = VH;
    const ctx = cv.getContext("2d", { alpha:false });
    await fontsReady();
    const target = new mb.BufferTarget();
    const output = new mb.Output({ format:new mb.Mp4OutputFormat({ fastStart:"in-memory" }), target });
    const frames = Math.round(P.total * FPS);
    const vs = new mb.CanvasSource(cv, { codec:"avc", bitrate:VBR, keyFrameInterval:2 });
    output.addVideoTrack(vs, { frameRate:FPS, maximumPacketCount:frames + 60 });
    try {
      await output.start();
      for (let i = 0; i < frames; i++) {
        if (job.stop) throw Object.assign(new Error("그만 만들었어요"), { code:"cancel" });
        drawFrame(ctx, P, i / FPS, VW, VH);
        await vs.add(i / FPS, 1 / FPS);
        if (i % 15 === 14 || i === frames - 1) { if (onp) onp((i + 1) / frames); await new Promise(r => setTimeout(r, 0)); }
      }
      vs.close();
      await output.finalize();
      return new File([target.buffer], name, { type:"video/mp4" });
    } catch (e) {
      try { await Promise.race([output.cancel(), new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
      throw e;
    } finally { try { if (wake) await wake.release(); } catch (e) {} }
  }

  return { build, drawFrame, stateAt, player, exportMp4, inApp, fontsReady, IOS, ANDROID, FPS, VW, VH };
})();
