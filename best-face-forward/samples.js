// 샘플 사진: 실제 웨딩 사진 대신 쓰는 그림이에요 (사회자님 사진을 받으면 바꿀 수 있어요).
// 같은 구도 4가지 × 컷 6장. 컷마다 눈 감음 · 웃음 · 고개 · 부케 높이 · 구도가 조금씩 달라서, 둘씩 놓고 비교하는 연습이 돼요.
//   drawSample(ctx, W, H, pose, shot) · makeSamples({ w, h, shots, poses }) → [{ name, blob, t, w, h }] · sampleUrls(pose, shots, w, h) → [url]
(function(){
  const SKIN_B = "#F3D1B8", SKIN_G = "#E9C09F", HAIR_B = "#3B2A22", HAIR_G = "#1E1B1A";
  const POSES = [
    { name: "아치 앞 나란히", bg: ["#F4EADF", "#DCC7AE"], floor: ["#CFB596", "#B69B7A"], deco: "arch", cam: { s: 1.02, x: 0, y: 0.01 }, gap: 0.115, look: 0 },
    { name: "커튼 앞 마주 보기", bg: ["#F2DFE0", "#D4AFB3"], floor: ["#C59BA1", "#A87E85"], deco: "curtain", cam: { s: 1.1, x: 0, y: 0.02 }, gap: 0.09, look: 1 },
    { name: "정원 클로즈업", bg: ["#E4EBDC", "#BCCBAF"], floor: ["#A5B594", "#8C9D7B"], deco: "plants", cam: { s: 2.15, x: 0, y: -0.19 }, gap: 0.105, look: 0 },
    { name: "밤 조명 세로", bg: ["#2D3856", "#111726"], floor: ["#161C2E", "#0B0F1B"], deco: "lights", cam: { s: 1.22, x: 0, y: 0.03 }, gap: 0.1, look: 0, tall: true }
  ];
  // 컷마다 다른 점: eb·eg 눈 뜸(1)/감음(0) · sb·sg 웃음 0~2 · tb·tg 고개(도) · bq 부케 높이 · veil 베일 날림 · dx·dy·ds 구도 · ex 밝기
  const SHOTS = [
    { eb: 1, eg: 1, sb: 1, sg: 1, tb: 0, tg: 0, bq: 0, veil: 0.1, dx: 0, dy: 0, ds: 0, ex: 0 },
    { eb: 0, eg: 1, sb: 1, sg: 1, tb: -2, tg: 1, bq: 0.008, veil: 0.35, dx: 0.004, dy: 0, ds: 0.01, ex: 0.025 },
    { eb: 1, eg: 1, sb: 2, sg: 2, tb: 4, tg: -3, bq: -0.006, veil: 0.6, dx: -0.003, dy: 0.002, ds: 0.016, ex: -0.012 },
    { eb: 1, eg: 0, sb: 2, sg: 1, tb: 2, tg: -2, bq: 0, veil: 0.8, dx: 0.006, dy: -0.002, ds: 0.006, ex: 0.03 },
    { eb: 1, eg: 1, sb: 0, sg: 0, tb: -3, tg: 3, bq: 0.014, veil: 0.25, dx: -0.006, dy: 0, ds: -0.01, ex: -0.03 },
    { eb: 1, eg: 1, sb: 2, sg: 1, tb: 6, tg: -5, bq: -0.01, veil: 1, dx: 0.002, dy: 0.003, ds: 0.022, ex: 0.012 }
  ];

  function rnd(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ell(x, cx, cy, rx, ry, rot = 0){ x.beginPath(); x.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); x.fill(); }
  function limb(x, x1, y1, x2, y2, w, color){ x.strokeStyle = color; x.lineWidth = w; x.lineCap = "round"; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }
  function rr(x, l, t, w, h, r){ x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); x.fill(); }

  function drawSample(x, W, H, pose, shot){
    const P = POSES[pose % POSES.length], V = SHOTS[shot % SHOTS.length], A = W / H;
    x.setTransform(1, 0, 0, 1, 0, 0);
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg[0]); g.addColorStop(1, P.bg[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const s = P.cam.s * (1 + V.ds), cx = A / 2 + P.cam.x + V.dx, cy = 0.5 + P.cam.y + V.dy;
    x.save();
    x.setTransform(H * s, 0, 0, H * s, W / 2 - cx * H * s, H / 2 - cy * H * s);
    const fy = 0.845, mid = A / 2;
    deco(x, P, A, fy, pose * 97 + 13);
    g = x.createLinearGradient(0, fy, 0, fy + 0.4); g.addColorStop(0, P.floor[0]); g.addColorStop(1, P.floor[1]);
    x.fillStyle = g; x.fillRect(-4, fy, A + 8, 4);
    x.fillStyle = "rgba(0,0,0,0.16)"; ell(x, mid, fy + 0.012, 0.29, 0.03);
    const gx = mid - P.gap, bx = mid + P.gap;
    veil(x, bx, V, P);
    groom(x, gx, fy, V, P, mid);
    bride(x, bx, fy, V, P, mid);
    x.restore();
    if(V.ex){ x.fillStyle = V.ex > 0 ? `rgba(255,250,240,${V.ex})` : `rgba(0,0,0,${-V.ex})`; x.fillRect(0, 0, W, H); }
    const r = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
    r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,0.24)");
    x.fillStyle = r; x.fillRect(0, 0, W, H);
  }

  function deco(x, P, A, fy, seed){
    const mid = A / 2, R = rnd(seed);
    if(P.deco === "arch"){
      x.fillStyle = "rgba(255,255,255,0.42)";
      const l = mid - 0.3, rgt = mid + 0.3, top = 0.1, rad = 0.3;
      x.beginPath(); x.moveTo(l, fy); x.lineTo(l, top + rad); x.arc(mid, top + rad, rad, Math.PI, 0); x.lineTo(rgt, fy); x.closePath(); x.fill();
      x.strokeStyle = "rgba(255,255,255,0.7)"; x.lineWidth = 0.008;
      x.beginPath(); x.moveTo(l + 0.02, fy); x.lineTo(l + 0.02, top + rad); x.arc(mid, top + rad, rad - 0.02, Math.PI, 0); x.lineTo(rgt - 0.02, fy); x.stroke();
      for(const sx of [-1, 1]){
        const fx = mid + sx * 0.36;
        x.fillStyle = "#BFA27F"; rr(x, fx - 0.012, 0.6, 0.024, fy - 0.6, 0.006);
        for(let i = 0; i < 9; i++){ x.fillStyle = ["#F6C9D2", "#FFFFFF", "#EFD9B4", "#E7A9B6"][i % 4]; ell(x, fx + (R() - 0.5) * 0.09, 0.58 + (R() - 0.5) * 0.06, 0.022, 0.022); }
        x.fillStyle = "rgba(120,150,110,0.7)"; ell(x, fx - 0.04, 0.6, 0.03, 0.012, -0.4); ell(x, fx + 0.04, 0.61, 0.03, 0.012, 0.4);
      }
    } else if(P.deco === "curtain"){
      for(let i = -40; i < 60; i++){
        const px = i * 0.035;
        const gg = x.createLinearGradient(px, 0, px + 0.035, 0);
        gg.addColorStop(0, "rgba(255,255,255,0.10)"); gg.addColorStop(0.5, "rgba(255,255,255,0.28)"); gg.addColorStop(1, "rgba(120,60,70,0.10)");
        x.fillStyle = gg; x.fillRect(px, -1, 0.035, fy + 1);
      }
      x.fillStyle = "rgba(255,255,255,0.35)"; ell(x, mid, 0.07, 0.6, 0.06);
    } else if(P.deco === "plants"){
      for(let i = 0; i < 26; i++){
        const side = i % 2 ? 1 : -1, lx = mid + side * (0.22 + R() * 0.12), ly = 0.04 + R() * 0.5;
        x.fillStyle = `rgba(${70 + R() * 40 | 0},${110 + R() * 40 | 0},${70 + R() * 30 | 0},${0.55 + R() * 0.3})`;
        ell(x, lx, ly, 0.05 + R() * 0.03, 0.018 + R() * 0.01, (R() - 0.5) * 2.4);
      }
      x.fillStyle = "rgba(255,255,255,0.25)"; for(let i = 0; i < 12; i++) ell(x, mid + (R() - 0.5) * 0.7, 0.05 + R() * 0.45, 0.012, 0.012);
    } else if(P.deco === "lights"){
      for(let i = 0; i < 70; i++){
        const r = 0.008 + R() * 0.035;
        x.fillStyle = `rgba(${240 + R() * 15 | 0},${200 + R() * 40 | 0},${130 + R() * 60 | 0},${0.08 + R() * 0.25})`;
        ell(x, mid + (R() - 0.5) * 1.4, R() * 0.75, r, r);
      }
      x.strokeStyle = "rgba(255,230,180,0.35)"; x.lineWidth = 0.003;
      x.beginPath(); x.moveTo(mid - 0.8, 0.12); x.quadraticCurveTo(mid, 0.3, mid + 0.8, 0.12); x.stroke();
      for(let i = 0; i <= 24; i++){ const t = i / 24, px = mid - 0.8 + 1.6 * t, py = (1 - t) * (1 - t) * 0.12 + 2 * (1 - t) * t * 0.3 + t * t * 0.12; x.fillStyle = "rgba(255,226,160,0.95)"; ell(x, px, py + 0.006, 0.006, 0.006); }
    }
  }

  function veil(x, cx, V, P){
    const w = V.veil;
    x.fillStyle = "rgba(255,255,255,0.5)";
    x.beginPath(); x.moveTo(cx - 0.01, 0.262);
    x.bezierCurveTo(cx + 0.09 + w * 0.03, 0.33, cx + 0.12 + w * 0.06, 0.6, cx + 0.15 + w * 0.08, 0.83);
    x.quadraticCurveTo(cx + 0.08 + w * 0.04, 0.85, cx + 0.03, 0.83);
    x.bezierCurveTo(cx + 0.05, 0.6, cx + 0.04, 0.38, cx + 0.025, 0.3);
    x.closePath(); x.fill();
    x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 0.002; x.stroke();
  }

  function groom(x, cx, fy, V, P, mid){
    const suit = "#23252D", suit2 = "#353946";
    x.fillStyle = suit; rr(x, cx - 0.043, 0.6, 0.037, fy - 0.6, 0.012); rr(x, cx + 0.006, 0.6, 0.037, fy - 0.6, 0.012);
    x.fillStyle = "#101114"; ell(x, cx - 0.03, fy - 0.002, 0.028, 0.01); ell(x, cx + 0.029, fy - 0.002, 0.028, 0.01);
    let g = x.createLinearGradient(cx - 0.08, 0, cx + 0.08, 0); g.addColorStop(0, suit2); g.addColorStop(0.5, suit); g.addColorStop(1, suit2);
    x.fillStyle = g; x.beginPath();
    x.moveTo(cx - 0.08, 0.39); x.quadraticCurveTo(cx - 0.084, 0.358, cx - 0.048, 0.352); x.lineTo(cx + 0.048, 0.352);
    x.quadraticCurveTo(cx + 0.084, 0.358, cx + 0.08, 0.39); x.lineTo(cx + 0.068, 0.645); x.lineTo(cx - 0.068, 0.645); x.closePath(); x.fill();
    x.fillStyle = "#F7F6F2"; x.beginPath(); x.moveTo(cx - 0.027, 0.352); x.lineTo(cx + 0.027, 0.352); x.lineTo(cx, 0.475); x.closePath(); x.fill();
    x.strokeStyle = "rgba(255,255,255,0.14)"; x.lineWidth = 0.0025;
    x.beginPath(); x.moveTo(cx - 0.027, 0.352); x.lineTo(cx - 0.004, 0.475); x.moveTo(cx + 0.027, 0.352); x.lineTo(cx + 0.004, 0.475); x.stroke();
    x.fillStyle = "#121318"; x.beginPath(); x.moveTo(cx, 0.364); x.lineTo(cx - 0.02, 0.354); x.lineTo(cx - 0.02, 0.374); x.closePath(); x.moveTo(cx, 0.364); x.lineTo(cx + 0.02, 0.354); x.lineTo(cx + 0.02, 0.374); x.closePath(); x.fill();
    ell(x, cx, 0.364, 0.006, 0.006);
    x.fillStyle = "#0E0F12"; ell(x, cx, 0.5, 0.0045, 0.0045); ell(x, cx, 0.545, 0.0045, 0.0045);
    x.fillStyle = "#F4A6B8"; ell(x, cx - 0.05, 0.405, 0.01, 0.01); x.fillStyle = "#FFFFFF"; ell(x, cx - 0.044, 0.398, 0.006, 0.006); x.fillStyle = "#7FA36E"; ell(x, cx - 0.056, 0.416, 0.009, 0.004, 0.6);
    limb(x, cx - 0.072, 0.38, cx - 0.084, 0.6, 0.032, suit);
    x.fillStyle = SKIN_G; ell(x, cx - 0.084, 0.615, 0.015, 0.016);
    limb(x, cx + 0.072, 0.38, mid - 0.006, 0.575, 0.032, suit);
    x.fillStyle = SKIN_G; ell(x, mid - 0.004, 0.588, 0.015, 0.016);
    x.fillStyle = "#D9AE8C"; rr(x, cx - 0.015, 0.325, 0.03, 0.035, 0.01);
    head(x, cx, 0.292, 0.053, V.tg + (P.look ? 8 : 0), { eyes: V.eg, smile: V.sg, look: P.look ? 1 : 0, skin: SKIN_G, who: "g" });
  }

  function bride(x, cx, fy, V, P, mid){
    let g = x.createLinearGradient(cx - 0.17, 0, cx + 0.17, 0); g.addColorStop(0, "#E6E1DE"); g.addColorStop(0.45, "#FFFFFF"); g.addColorStop(1, "#E2DCD8");
    x.fillStyle = g; x.beginPath();
    x.moveTo(cx - 0.036, 0.47); x.bezierCurveTo(cx - 0.07, 0.6, cx - 0.15, 0.76, cx - 0.165, fy + 0.012);
    x.quadraticCurveTo(cx, fy + 0.034, cx + 0.165, fy + 0.012); x.bezierCurveTo(cx + 0.15, 0.76, cx + 0.07, 0.6, cx + 0.036, 0.47);
    x.closePath(); x.fill();
    x.strokeStyle = "rgba(90,70,60,0.07)"; x.lineWidth = 0.003;
    for(let i = -3; i <= 3; i++){ x.beginPath(); x.moveTo(cx + i * 0.008, 0.49); x.quadraticCurveTo(cx + i * 0.03, 0.68, cx + i * 0.05, fy + 0.01); x.stroke(); }
    x.fillStyle = SKIN_B; rr(x, cx - 0.05, 0.345, 0.1, 0.04, 0.016);
    x.fillStyle = "#FCFBF9"; x.beginPath(); x.moveTo(cx - 0.045, 0.372); x.quadraticCurveTo(cx, 0.385, cx + 0.045, 0.372); x.lineTo(cx + 0.035, 0.478); x.lineTo(cx - 0.035, 0.478); x.closePath(); x.fill();
    x.fillStyle = "#EBDDC6"; x.fillRect(cx - 0.037, 0.466, 0.074, 0.012);
    limb(x, cx - 0.047, 0.362, mid + 0.006, 0.578, 0.019, SKIN_B);
    x.fillStyle = SKIN_B; ell(x, mid + 0.006, 0.585, 0.013, 0.014);
    const by = 0.5 + V.bq;
    limb(x, cx + 0.047, 0.362, cx + 0.03, by + 0.01, 0.019, SKIN_B);
    bouquet(x, cx + 0.018, by);
    x.fillStyle = "#E5BFA3"; rr(x, cx - 0.013, 0.335, 0.026, 0.03, 0.01);
    head(x, cx, 0.307, 0.049, V.tb + (P.look ? -8 : 0), { eyes: V.eb, smile: V.sb, look: P.look ? -1 : 0, skin: SKIN_B, who: "b" });
  }

  function bouquet(x, cx, cy){
    x.fillStyle = "#6E9462"; ell(x, cx - 0.03, cy + 0.012, 0.024, 0.009, -0.5); ell(x, cx + 0.03, cy + 0.014, 0.024, 0.009, 0.5); ell(x, cx, cy + 0.03, 0.012, 0.022);
    const C = ["#F6C3CF", "#FFFFFF", "#F2D7B6", "#E9A3B4", "#FBE6EA"];
    const pts = [[0, -0.012], [-0.022, -0.002], [0.022, -0.002], [-0.012, 0.014], [0.012, 0.014], [0, 0.004], [-0.03, 0.012], [0.03, 0.012]];
    pts.forEach(([dx, dy], i) => { x.fillStyle = C[i % C.length]; ell(x, cx + dx, cy + dy, 0.014, 0.014); x.fillStyle = "rgba(0,0,0,0.06)"; ell(x, cx + dx + 0.003, cy + dy + 0.003, 0.005, 0.005); });
    x.fillStyle = "#F4EEE6"; x.beginPath(); x.moveTo(cx - 0.006, cy + 0.03); x.lineTo(cx - 0.018, cy + 0.07); x.lineTo(cx - 0.004, cy + 0.068); x.closePath(); x.fill();
  }

  function head(x, cx, cy, r, tilt, o){
    x.save(); x.translate(cx, cy); x.rotate(tilt * Math.PI / 180);
    const hair = o.who === "b" ? HAIR_B : HAIR_G;
    if(o.who === "b"){ x.fillStyle = hair; ell(x, 0, -r * 0.12, r * 1.12, r * 1.04); ell(x, r * 0.12, -r * 1.02, r * 0.48, r * 0.4); }
    x.fillStyle = o.who === "b" ? "#E7BFA3" : "#D9AC8A"; ell(x, -r * 0.98, r * 0.08, r * 0.17, r * 0.22); ell(x, r * 0.98, r * 0.08, r * 0.17, r * 0.22);
    x.fillStyle = o.skin; ell(x, 0, 0, r, r * 1.08);
    x.fillStyle = hair; x.beginPath();
    if(o.who === "g"){
      // 위를 덮는 머리 + 이마 위 가르마 앞머리
      x.moveTo(-r * 1.05, -r * 0.12); x.ellipse(0, -r * 0.16, r * 1.06, r * 1.0, 0, Math.PI, Math.PI * 2);
      x.quadraticCurveTo(r * 0.75, -r * 0.42, r * 0.2, -r * 0.5); x.quadraticCurveTo(-r * 0.35, -r * 0.58, -r * 0.62, -r * 0.4);
      x.quadraticCurveTo(-r * 0.9, -r * 0.3, -r * 1.05, -r * 0.12);
    } else {
      // 가운데 가르마, 옆머리는 귀 아래까지
      x.moveTo(-r * 1.08, r * 0.32); x.lineTo(-r * 1.08, -r * 0.14); x.ellipse(0, -r * 0.14, r * 1.08, r * 1.0, 0, Math.PI, Math.PI * 2);
      x.lineTo(r * 1.08, r * 0.32); x.quadraticCurveTo(r * 0.86, -r * 0.48, 0, -r * 0.64); x.quadraticCurveTo(-r * 0.86, -r * 0.48, -r * 1.08, r * 0.32);
    }
    x.fill();
    if(o.who === "b"){ x.fillStyle = "#EBD394"; for(let i = -3; i <= 3; i++) ell(x, i * r * 0.17, -r * 0.8 + Math.abs(i) * r * 0.06, r * 0.055, r * 0.055); }
    const ey = r * 0.1, ex = r * 0.38, lk = (o.look || 0) * r * 0.08, ink = "#211816";
    for(const sx of [-1, 1]){
      const ecx = sx * ex + lk;
      if(o.eyes){
        x.fillStyle = ink; ell(x, ecx, ey, r * 0.088, r * 0.12);
        x.fillStyle = "#FFFFFF"; ell(x, ecx + r * 0.028, ey - r * 0.04, r * 0.03, r * 0.03);
        if(o.who === "b"){ x.strokeStyle = ink; x.lineWidth = r * 0.035; x.beginPath(); x.moveTo(ecx + sx * r * 0.06, ey - r * 0.1); x.lineTo(ecx + sx * r * 0.14, ey - r * 0.16); x.stroke(); }
      } else {
        x.strokeStyle = ink; x.lineWidth = r * 0.055; x.lineCap = "round";
        x.beginPath(); x.arc(ecx, ey - r * 0.04, r * 0.1, 0.18 * Math.PI, 0.82 * Math.PI); x.stroke();
      }
    }
    x.strokeStyle = o.who === "b" ? "#4A372D" : HAIR_G; x.lineWidth = r * 0.06; x.lineCap = "round";
    for(const sx of [-1, 1]){ x.beginPath(); x.moveTo(sx * ex - r * 0.14 + lk, -r * 0.16); x.quadraticCurveTo(sx * ex + lk, -r * 0.25, sx * ex + r * 0.14 + lk, -r * 0.18); x.stroke(); }
    x.fillStyle = "rgba(238,118,128,0.24)"; ell(x, -r * 0.56, r * 0.36, r * 0.17, r * 0.12); ell(x, r * 0.56, r * 0.36, r * 0.17, r * 0.12);
    const my = r * 0.52 + lk * 0, mx = lk * 0.6;
    if(o.smile === 0){
      x.strokeStyle = o.who === "b" ? "#B95067" : "#7B3B32"; x.lineWidth = r * 0.06; x.beginPath(); x.moveTo(mx - r * 0.13, my); x.quadraticCurveTo(mx, my + r * 0.03, mx + r * 0.13, my); x.stroke();
    } else if(o.smile === 1){
      x.strokeStyle = o.who === "b" ? "#B95067" : "#7B3B32"; x.lineWidth = r * 0.065; x.beginPath(); x.arc(mx, my - r * 0.14, r * 0.21, 0.22 * Math.PI, 0.78 * Math.PI); x.stroke();
    } else {
      x.fillStyle = "#7A2B2E"; x.beginPath(); x.moveTo(mx - r * 0.25, my - r * 0.05); x.quadraticCurveTo(mx, my + r * 0.34, mx + r * 0.25, my - r * 0.05); x.closePath(); x.fill();
      x.fillStyle = "#FFFFFF"; x.beginPath(); x.moveTo(mx - r * 0.21, my - r * 0.04); x.quadraticCurveTo(mx, my + r * 0.08, mx + r * 0.21, my - r * 0.04); x.closePath(); x.fill();
    }
    x.restore();
  }

  async function makeSamples(o = {}){
    const W = o.w || 1800, H = o.h || 1200, shots = o.shots || 6, poses = o.poses || [0, 1, 2, 3];
    const base = Date.UTC(2026, 9, 18, 5, 0, 0);   // 시각은 사진 사이의 차이만 써요
    const out = []; let n = 1;
    for(const [pi, p] of poses.entries()){
      const tall = POSES[p].tall, w = tall ? H : W, h = tall ? W : H;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d");
      for(let s = 0; s < shots; s++){
        drawSample(x, w, h, p, s);
        const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.86));
        // 둘째 구도는 5번째 컷부터 11초 쉬었다 찍은 것처럼 (쉬어도 같은 묶음으로 묶이는지 보려고)
        const t = base + pi * 150000 + s * 2500 + (pi === 1 && s >= 4 ? 11000 : 0);
        out.push({ name: `SAMPLE_${String(n++).padStart(4, "0")}.jpg`, blob, t, w, h });
      }
    }
    return out;
  }

  async function sampleUrls(pose, shots, w, h){
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), out = [];
    for(let s = 0; s < shots; s++){
      drawSample(x, w, h, pose, s);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.88));
      out.push(URL.createObjectURL(blob));
    }
    return out;
  }

  window.SAMPLES = { drawSample, makeSamples, sampleUrls, POSES, SHOTS };
})();
