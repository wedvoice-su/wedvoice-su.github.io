// 땡큐 카드 디자인: 1080×1350(4:5) 캔버스에 그려요. 사진은 휴대폰 안에서만 쓰고 어디에도 보내지 않아요.
// 디자인을 추가하려면 맨 아래 DESIGNS에 하나 더 넣으면 돼요.
//   photo : true(사진 필요) / "optional"(있으면 넣고 없으면 글만) / false(글만)
//   gray  : 처음에 흑백으로 보여줄지
//   rect  : 사진 칸 [x, y, 너비, 높이] (사진을 끌어서 옮길 때 기준)

const CW = 1080, CH = 1350;
const FONTS = { script:'"Herr Von Muellerhoff"', ko:'"Gowun Batang"', en:'"Cormorant Garamond"', big:'"Bodoni Moda"' };
const INK = "#2B2622";
const RIBBON = [
  { name:"체리",   c:"#A3252E" },
  { name:"세이지", c:"#6E7D5B" },
  { name:"블랙",   c:"#2A2624" },
  { name:"블루",   c:"#6A88B0" }
];

function fnt(size, fam, w=400){ return `${w} ${size}px ${fam}, "Apple SD Gothic Neo", "Noto Serif KR", serif`; }
// 그림자 번짐은 축소(미리보기 썸네일)를 따라가지 않아서 직접 맞춰 줘요
function px(ctx, v){ return v * ctx.getTransform().a; }
// 둥근 사각형 경로 (ctx.roundRect는 iOS 15 이하에서 안 돼요)
function rr(ctx, x, y, w, h, r){
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ===== 종이 질감 =====
let grainTile = null;
function grain(ctx, alpha, rect){
  if(!grainTile){
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 180;
    const g = grainTile.getContext("2d"), im = g.createImageData(180, 180);
    let s = 11;
    for(let i=0; i<im.data.length; i+=4){
      s = (s * 16807) % 2147483647;
      const v = 128 + (s / 2147483647 - .5) * 140;
      im.data[i] = im.data[i+1] = im.data[i+2] = v; im.data[i+3] = 255;
    }
    g.putImageData(im, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grainTile, "repeat");
  ctx.fillRect(...(rect || [0, 0, CW, CH]));
  ctx.restore();
}
function paper(ctx, color, g=.08){
  ctx.fillStyle = color; ctx.fillRect(0, 0, CW, CH);
  grain(ctx, g);
}

// ===== 글자 =====
function wrapLines(ctx, text, maxW){
  const out = [];
  for(const para of String(text).split("\n")){
    if(!para.trim()){ out.push(""); continue; }
    let line = "";
    for(const word of para.trim().split(/\s+/)){
      const test = line ? line + " " + word : word;
      if(ctx.measureText(test).width <= maxW){ line = test; continue; }
      if(line) out.push(line);
      if(ctx.measureText(word).width <= maxW){ line = word; continue; }
      // 띄어쓰기 없이 긴 낱말은 글자 단위로 나눠요
      line = "";
      for(const ch of word){
        if(ctx.measureText(line + ch).width > maxW && line){ out.push(line); line = ch; }
        else line += ch;
      }
    }
    out.push(line);
  }
  while(out.length && !out[out.length-1]) out.pop();
  return out;
}
// 상자 안에 들어가도록 글자 크기를 줄여 가며 가운데 맞춰 써요. 가장 작게 해도 넘치면 잘라 내고 overflow에 표시해요.
let overflow = false;
function textBlock(ctx, text, o){
  const fam = o.fam || FONTS.ko, lh = o.lh || 1.62, min = o.min || 22;
  o.h = o.h || o.bottom - o.top;
  let s = o.size, lines;
  for(; s >= min; s--){
    ctx.font = fnt(s, fam);
    lines = wrapLines(ctx, text, o.w);
    if(lines.length * s * lh <= o.h) break;
  }
  if(s < min){
    s = min; ctx.font = fnt(s, fam);
    lines = wrapLines(ctx, text, o.w).slice(0, Math.max(1, Math.floor(o.h / (s * lh))));
    overflow = true;
  }
  const total = lines.length * s * lh;
  let y = o.top + (o.h - total) / 2 + s * lh / 2;
  ctx.fillStyle = o.color || INK;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for(const l of lines){ ctx.fillText(l, o.x + o.w / 2, y); y += s * lh; }
}
// 글자 사이를 벌려 쓰기 (캔버스 letterSpacing은 사파리에서 안 될 때가 있어 직접 그려요)
function spaced(ctx, text, x, y, sp, align="center"){
  const cs = [...text], ws = cs.map(c => ctx.measureText(c).width);
  const tot = ws.reduce((a, b) => a + b, 0) + sp * (cs.length - 1);
  let cx = align === "center" ? x - tot / 2 : align === "right" ? x - tot : x;
  const keep = ctx.textAlign; ctx.textAlign = "left";
  cs.forEach((c, i) => { ctx.fillText(c, cx, y); cx += ws[i] + sp; });
  ctx.textAlign = keep;
  return tot;
}
function spacedWidth(ctx, text, sp){
  const cs = [...text];
  return cs.reduce((a, c) => a + ctx.measureText(c).width, 0) + sp * (cs.length - 1);
}
// 손글씨 Thank you. 돌려주는 값은 글자 아래 끝(y 꼬리)의 위치라서, 그 아래부터 문구를 쓰면 안 겹쳐요.
function script(ctx, text, x, y, size, color){
  ctx.font = fnt(size, FONTS.script);
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
  return y + (ctx.measureText(text).actualBoundingBoxDescent || size * .3);
}
// 이름 · 날짜 한 줄
function signLine(ctx, d, y, color, size=30){
  const parts = [];
  if(d.names) parts.push({ t:d.names, font:fnt(size, FONTS.ko), sp:2 });
  if(d.date) parts.push({ t:d.date, font:fnt(size - 1, FONTS.en, 600), sp:4 });
  if(!parts.length) return;
  const gap = 46;
  parts.forEach(p => { ctx.font = p.font; p.w = spacedWidth(ctx, p.t, p.sp); });
  let x = CW / 2 - (parts.reduce((a, p) => a + p.w, 0) + gap * (parts.length - 1)) / 2;
  ctx.fillStyle = color; ctx.textBaseline = "middle";
  parts.forEach((p, i) => {
    ctx.font = p.font; spaced(ctx, p.t, x, y, p.sp, "left"); x += p.w;
    if(i < parts.length - 1){ ctx.fillRect(x + gap / 2 - 1, y - size * .42, 2, size * .84); x += gap; }
  });
}
function mark(ctx, d, color){
  if(!d.mark) return;
  ctx.font = fnt(22, FONTS.en, 600); ctx.fillStyle = color; ctx.textBaseline = "middle";
  spaced(ctx, "@wed_voice.su", CW / 2, CH - 34, 3);
}

// ===== 사진 =====
// 사진 놓을 자리 계산. P.cx, P.cy = 칸 가운데에 오는 사진 속 위치(0~1).
// 사진이 칸을 꽉 채우도록, 사진 끝이 칸 안으로 들어오지 않는 범위로 맞춰서 돌려줘요.
function placePhoto(P, w, h){
  const s = Math.max(w / P.base.width, h / P.base.height) * P.zoom;
  const dw = P.base.width * s, dh = P.base.height * s, hx = w / 2 / dw, hy = h / 2 / dh;
  return { dw, dh, cx:Math.min(1 - hx, Math.max(hx, P.cx)), cy:Math.min(1 - hy, Math.max(hy, P.cy)) };
}
function coverPhoto(ctx, P, gray, x, y, w, h){
  const { dw, dh, cx, cy } = placePhoto(P, w, h);
  ctx.drawImage(gray ? P.gray : P.base, x + w / 2 - cx * dw, y + h / 2 - cy * dh, dw, dh);
}
// 사진 칸 채우기. shape가 있으면 그 모양으로 잘라요. 사진이 없으면 "눌러서 사진 넣기" 칸을 보여줘요.
function photo(ctx, d, r, shape, dark){
  ctx.save();
  ctx.beginPath();
  if(shape) shape(ctx); else ctx.rect(...r);
  ctx.clip();
  if(d.photo) coverPhoto(ctx, d.photo, d.gray, ...r);
  else hole(ctx, r, dark);
  ctx.restore();
}
function hole(ctx, [x, y, w, h], dark){
  ctx.fillStyle = dark ? "#3B3532" : "#DDD6CC"; ctx.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2, c = dark ? "rgba(255,255,255,.72)" : "rgba(43,38,34,.5)";
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 5; ctx.lineJoin = "round";
  ctx.beginPath(); rr(ctx, cx - 52, cy - 70, 104, 76, 16); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy - 32, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); rr(ctx, cx - 20, cy - 82, 40, 14, 5); ctx.fill();
  ctx.font = fnt(32, FONTS.ko); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("눌러서 사진 넣기", cx, cy + 48);
}

// ===== 장식 =====
// 물결 테두리 (둥근 사각형 둘레를 따라 출렁이게)
function wavyRect(ctx, x, y, w, h, r, A, len){
  const sw = w - 2 * r, sh = h - 2 * r, arc = Math.PI * r / 2;
  const P = 2 * (sw + sh) + 4 * arc, L = P / Math.round(P / len), N = Math.ceil(P / 3);
  const at = s => {
    if(s < sw) return [x + r + s, y, 0, -1]; s -= sw;
    if(s < arc){ const a = -Math.PI / 2 + s / r; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; } s -= arc;
    if(s < sh) return [x + w, y + r + s, 1, 0]; s -= sh;
    if(s < arc){ const a = s / r; return [x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; } s -= arc;
    if(s < sw) return [x + w - r - s, y + h, 0, 1]; s -= sw;
    if(s < arc){ const a = Math.PI / 2 + s / r; return [x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; } s -= arc;
    if(s < sh) return [x, y + h - r - s, -1, 0]; s -= sh;
    const a = Math.PI + s / r; return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)];
  };
  ctx.beginPath();
  for(let i = 0; i <= N; i++){
    const s = i / N * P, [px0, py0, nx, ny] = at(Math.min(s, P - .001)), o = A * Math.sin(2 * Math.PI * s / L);
    i ? ctx.lineTo(px0 + nx * o, py0 + ny * o) : ctx.moveTo(px0 + nx * o, py0 + ny * o);
  }
  ctx.closePath();
}
// 선으로 그린 리본
function bow(ctx, cx, cy, s, color, bg){
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = color; ctx.fillStyle = bg;
  for(const k of [-1, 1]){
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(k * 8, 6);
    ctx.bezierCurveTo(k * 30, 50, k * 18, 95, k * 62, 150);
    ctx.lineTo(k * 84, 128);
    ctx.lineTo(k * 98, 158);
    ctx.bezierCurveTo(k * 56, 100, k * 64, 52, k * 22, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 고리
    ctx.beginPath();
    ctx.moveTo(k * 10, -4);
    ctx.bezierCurveTo(k * 48, -78, k * 168, -92, k * 160, -26);
    ctx.bezierCurveTo(k * 154, 26, k * 76, 24, k * 10, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 고리 안쪽 주름
    ctx.beginPath();
    ctx.moveTo(k * 26, -6);
    ctx.bezierCurveTo(k * 62, -40, k * 104, -46, k * 122, -30);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// 소인 (둥근 도장 + 물결 줄)
function postmark(ctx, cx, cy, r, color, ymd){
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 36, 0, Math.PI * 2); ctx.stroke();
  const ring = [..."THANK YOU · WITH LOVE · "], step = Math.PI * 2 / ring.length;
  ctx.font = fnt(21, FONTS.en, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ring.forEach((ch, i) => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * step); ctx.translate(0, -(r - 18));
    ctx.fillText(ch, 0, 0); ctx.restore();
  });
  if(ymd){
    ctx.font = fnt(20, FONTS.en, 600); ctx.fillText(ymd[0], cx, cy - 20);
    ctx.font = fnt(34, FONTS.en, 600); ctx.fillText(`${+ymd[1]}.${+ymd[2]}`, cx, cy + 12);
  }else{
    ctx.font = fnt(56, FONTS.script); ctx.fillText("love", cx, cy + 8);
  }
  ctx.lineWidth = 3;
  for(let k = 0; k < 4; k++){
    const y0 = cy - 39 + k * 26;
    ctx.beginPath();
    for(let x = cx - r - 300; x <= cx - r - 14; x += 4){
      const y = y0 + Math.sin((x - cx) / 22) * 7;
      x === cx - r - 300 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
// 창문 햇살 그림자: 큰 사각형에서 창문 칸을 뚫고, 캔버스 밖에 그린 다음 그림자만 안으로 들여와요
function windowLight(ctx, alpha){
  const off = 6000, a = -0.42, ca = Math.cos(a), sa = Math.sin(a);
  const ox = 600, oy = 560, pw = 300, ph = 430, gap = 30;
  const rot = (x, y) => [ox + x * ca - y * sa - off, oy + x * sa + y * ca];
  ctx.save();
  ctx.shadowColor = `rgba(84,62,40,${alpha})`;
  ctx.shadowBlur = px(ctx, 46);
  ctx.shadowOffsetX = px(ctx, off);
  ctx.beginPath();
  ctx.rect(-off - 400, -400, CW + 800, CH + 800);
  for(const [cxp, cyp] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){
    const x0 = cxp < 0 ? -gap / 2 - pw : gap / 2, y0 = cyp < 0 ? -gap / 2 - ph : gap / 2;
    const pts = [rot(x0, y0), rot(x0 + pw, y0), rot(x0 + pw, y0 + ph), rot(x0, y0 + ph)];
    ctx.moveTo(...pts[0]); pts.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath();
  }
  ctx.fillStyle = "#000";
  ctx.fill("evenodd");
  ctx.restore();
}
// 우표 (가장자리 톱니)
function stamp(ctx, d, x, y, w, h, angle){
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const g = off.getContext("2d");
  g.fillStyle = "#F7F0E5"; g.fillRect(0, 0, w, h);
  photo(g, d, [32, 32, w - 64, h - 64]);
  g.globalCompositeOperation = "destination-out";
  const R = 12, nx = Math.round(w / 38), ny = Math.round(h / 38);
  g.beginPath();
  for(let i = 0; i <= nx; i++){ const cx = i * w / nx; g.moveTo(cx + R, 0); g.arc(cx, 0, R, 0, Math.PI * 2); g.moveTo(cx + R, h); g.arc(cx, h, R, 0, Math.PI * 2); }
  for(let i = 0; i <= ny; i++){ const cy = i * h / ny; g.moveTo(R, cy); g.arc(0, cy, R, 0, Math.PI * 2); g.moveTo(w + R, cy); g.arc(w, cy, R, 0, Math.PI * 2); }
  g.fill();
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,.38)"; ctx.shadowBlur = px(ctx, 34); ctx.shadowOffsetY = px(ctx, 14);
  ctx.drawImage(off, -w / 2, -h / 2);
  ctx.restore();
}

// ===== 디자인 =====
const DESIGNS = [
  { key:"film", label:"필름", photo:true, gray:true, rect:[120, 96, 840, 700],
    draw(ctx, d){
      paper(ctx, "#F2EDE5", .1);
      ctx.save();
      ctx.shadowColor = "rgba(50,38,28,.2)"; ctx.shadowBlur = px(ctx, 28); ctx.shadowOffsetY = px(ctx, 10);
      ctx.fillStyle = "#FBF9F5"; ctx.fillRect(98, 74, 884, 744);
      ctx.restore();
      photo(ctx, d, this.rect);
      if(d.photo) grain(ctx, .14, this.rect);
      const end = script(ctx, "Thank you", CW / 2, 940, 156, INK);
      textBlock(ctx, d.msg, { x:150, top:end + 8, bottom:1190, w:780, size:36, min:24 });
      signLine(ctx, d, 1234, INK, 29);
      mark(ctx, d, "rgba(43,38,34,.45)");
    }},
  { key:"full", label:"사진 가득", photo:true, gray:false, rect:[0, 0, CW, CH],
    draw(ctx, d){
      photo(ctx, d, this.rect, null, true);
      const g = ctx.createLinearGradient(0, 560, 0, CH);
      g.addColorStop(0, "rgba(14,11,9,0)"); g.addColorStop(.45, "rgba(14,11,9,.5)"); g.addColorStop(1, "rgba(14,11,9,.8)");
      ctx.fillStyle = g; ctx.fillRect(0, 560, CW, CH - 560);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = px(ctx, 14);
      const end = script(ctx, "Thank you", CW / 2, 975, 200, "#FFFFFF");
      textBlock(ctx, d.msg, { x:150, top:end + 8, bottom:1205, w:780, size:35, min:24, color:"#FFFFFF" });
      signLine(ctx, d, 1252, "rgba(255,255,255,.94)", 29);
      ctx.restore();
      mark(ctx, d, "rgba(255,255,255,.62)");
    }},
  { key:"arch", label:"아치", photo:true, gray:false, rect:[240, 100, 600, 780],
    draw(ctx, d){
      paper(ctx, "#F6F2EC", .07);
      const arch = (x, y, w, h) => c => { const r = w / 2; c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); };
      ctx.beginPath(); arch(220, 80, 640, 820)(ctx);
      ctx.strokeStyle = "rgba(43,38,34,.38)"; ctx.lineWidth = 2; ctx.stroke();
      photo(ctx, d, this.rect, arch(...this.rect));
      ctx.font = fnt(34, FONTS.en, 600); ctx.fillStyle = INK; ctx.textBaseline = "middle";
      spaced(ctx, "THANK YOU", CW / 2, 960, 16);
      textBlock(ctx, d.msg, { x:150, top:992, w:780, h:150, size:33, min:24 });
      if(d.names){ ctx.font = fnt(34, FONTS.ko); ctx.fillStyle = INK; spaced(ctx, d.names, CW / 2, 1196, 10); }
      if(d.date){ ctx.font = fnt(26, FONTS.en, 600); ctx.fillStyle = "rgba(43,38,34,.7)"; spaced(ctx, d.date, CW / 2, d.names ? 1246 : 1210, 6); }
      mark(ctx, d, "rgba(43,38,34,.45)");
    }},
  { key:"ribbon", label:"리본", photo:"optional", gray:false, colors:true, rect:[300, 320, 480, 520],
    draw(ctx, d){
      const bg = "#FBF7F1", c = d.color;
      paper(ctx, bg, .06);
      wavyRect(ctx, 72, 176, 936, 1096, 70, 8, 52);
      ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.stroke();
      bow(ctx, CW / 2, 176, 1.05, c, bg);
      if(d.photo){
        const [x, y, w, h] = this.rect, oval = c2 => c2.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 16, h / 2 + 16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = c; ctx.globalAlpha = .55; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
        photo(ctx, d, this.rect, oval);
        const end = script(ctx, "Thank you", CW / 2, 968, 140, c);
        textBlock(ctx, d.msg, { x:170, top:end + 8, bottom:1172, w:740, size:33, min:23 });
        signLine(ctx, d, 1210, INK, 28);
      }else{
        const end = script(ctx, "Thank you", CW / 2, 580, 240, c);
        textBlock(ctx, d.msg, { x:170, top:end + 10, bottom:1010, w:740, size:40, min:26 });
        signLine(ctx, d, 1080, INK, 31);
      }
      mark(ctx, d, "rgba(43,38,34,.45)");
    }},
  { key:"stamp", label:"우표", photo:true, gray:false, rect:[262, 128, 556, 696],
    draw(ctx, d){
      ctx.fillStyle = "#5A1B20"; ctx.fillRect(0, 0, CW, CH); grain(ctx, .14);
      stamp(ctx, d, 230, 96, 620, 760, -0.035);
      postmark(ctx, 846, 150, 100, "rgba(246,236,222,.86)", d.ymd);
      const end = script(ctx, "Thank you", CW / 2, 985, 150, "#F4E7D4");
      textBlock(ctx, d.msg, { x:150, top:end + 8, bottom:1200, w:780, size:34, min:24, color:"#F1E4D2" });
      signLine(ctx, d, 1246, "#F1E4D2", 29);
      mark(ctx, d, "rgba(244,231,212,.55)");
    }},
  { key:"mag", label:"매거진", photo:true, gray:true, rect:[0, 0, CW, 800],
    draw(ctx, d){
      paper(ctx, "#F5F2ED", .06);
      photo(ctx, d, this.rect);
      ctx.fillStyle = INK; ctx.fillRect(60, 846, 960, 2.5);
      ctx.font = fnt(24, FONTS.en, 600); ctx.textBaseline = "middle";
      spaced(ctx, "WITH LOVE", 60, 880, 6, "left");
      spaced(ctx, d.date || "OUR WEDDING DAY", 1020, 880, 6, "right");
      ctx.font = fnt(100, FONTS.big);
      const big = 100 * 960 / spacedWidth(ctx, "THANK YOU", 4);
      ctx.font = fnt(big, FONTS.big); ctx.textBaseline = "alphabetic";
      spaced(ctx, "THANK YOU", CW / 2, 1032, 4 * big / 100);
      ctx.fillRect(60, 1064, 960, 2.5);
      textBlock(ctx, d.msg, { x:120, top:1084, w:840, h:150, size:31, min:23 });
      if(d.names){ ctx.font = fnt(28, FONTS.ko); ctx.fillStyle = INK; ctx.textBaseline = "middle"; spaced(ctx, d.names, CW / 2, 1268, 6); }
      mark(ctx, d, "rgba(43,38,34,.45)");
    }},
  { key:"letter", label:"편지", photo:false, gray:false,
    draw(ctx, d){
      paper(ctx, "#F1EADF", .09);
      windowLight(ctx, .2);
      const end = script(ctx, "Thank you", CW / 2, 460, 250, INK);
      textBlock(ctx, d.msg, { x:150, top:end + 16, bottom:1000, w:780, size:40, min:26, lh:1.75 });
      signLine(ctx, d, 1080, INK, 31);
      mark(ctx, d, "rgba(43,38,34,.45)");
    }}
];

// 카드 하나 그리기. scale은 썸네일용 (1 = 원래 크기). 문구가 넘쳐 잘렸으면 true를 돌려줘요.
function drawCard(ctx, D, d, scale=1){
  overflow = false;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  D.draw(ctx, d);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return overflow;
}

// 사진 불러오기: 크기를 줄이고 흑백 사본도 미리 만들어 둬요
async function loadPhoto(file){
  const url = URL.createObjectURL(file);
  try{
    const img = new Image();
    img.src = url;
    await img.decode();
    // 크게 확대해도 흐려지지 않게 긴 쪽 2400px까지 남겨요
    const s = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const base = document.createElement("canvas");
    base.width = Math.round(img.naturalWidth * s); base.height = Math.round(img.naturalHeight * s);
    base.getContext("2d").drawImage(img, 0, 0, base.width, base.height);
    const gray = document.createElement("canvas");
    gray.width = base.width; gray.height = base.height;
    const g = gray.getContext("2d");
    g.drawImage(base, 0, 0);
    const im = g.getImageData(0, 0, gray.width, gray.height), p = im.data;
    for(let i = 0; i < p.length; i += 4){
      const v = (.299 * p[i] + .587 * p[i+1] + .114 * p[i+2] - 128) * 1.1 + 132;
      p[i] = p[i+1] = p[i+2] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    g.putImageData(im, 0, 0);
    return { base, gray, zoom:1, cx:.5, cy:.5 };
  }finally{
    URL.revokeObjectURL(url);
  }
}
