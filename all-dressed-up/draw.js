// 드레스 투어 기록 카드 · 드레스 그림 (고른 특징대로 앞모습을 그려요)
// DR.svg(a, opt) → <svg> 글자. a = 드레스 특징(text.js의 F id들), opt = { seed, w, h, crop, bg }
// DR.pic(kind, id) → 선택지 단추에 들어가는 작은 그림 (치마 모양 · 넥라인 · 소매 · 뒷자락 · 천 · 색)
// 그림 좌표: 가로 200 · 세로 310. 가운데 x = 100, 어깨 y ≈ 58, 허리 y = 118, 밑단 y ≈ 266.
const DR = (() => {
  const LINE = "#7A6F63", BODY = "#EADFD3", BG = "#F5F1EB";
  const FILL = { white: "#FFFFFF", off: "#FBF6EC", ivory: "#F4EBD8", champ: "#E9D5BA", color: "#EFCAD5" };
  const SPARK = "#B9A57A";
  const r1 = n => Math.round(n * 10) / 10;

  // 몸(목 · 어깨 · 팔): 드레스 밑에 옅게
  const ARM = { L: [[66, 60], [57, 120], [53, 170]], R: [[134, 60], [143, 120], [147, 170]] };
  function bodyPath(){
    return `<path d="M92 24 L92 43 C86 50 76 52 66 55 C58 57 55 63 57 70 L143 70 C145 63 142 57 134 55 C124 52 114 50 108 43 L108 24 Z" fill="${BODY}"/>` +
      ["L", "R"].map(s => `<polyline points="${ARM[s].map(p => p.join(",")).join(" ")}" fill="none" stroke="${BODY}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  }
  // 팔을 따라 t0 ~ t1(0 어깨 · 1 손목) 구간을 감싸는 소매 모양
  function armPt(side, t){
    const a = ARM[side], seg = t < .5 ? 0 : 1, u = seg ? (t - .5) * 2 : t * 2;
    const p = a[seg], q = a[seg + 1];
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, q[0] - p[0], q[1] - p[1]];
  }
  function sleevePoly(side, t0, t1, w0, w1){
    const N = 6, L = [], R = [];
    for(let i = 0; i <= N; i++){
      const t = t0 + (t1 - t0) * i / N, w = w0 + (w1 - w0) * i / N, [x, y, dx, dy] = armPt(side, t), len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * w, ny = dx / len * w;
      L.push([r1(x + nx), r1(y + ny)]); R.unshift([r1(x - nx), r1(y - ny)]);
    }
    return L.concat(R).map(p => p.join(",")).join(" ");
  }

  // 허리 높이 · 너비
  function waistOf(a){
    let y = a.sil === "emp" ? 92 : 118, hw = a.waist === "nip" ? 15.5 : 18;
    if(a.waist === "low" && a.sil !== "emp") y = 132;
    if(a.sil === "emp") hw = 16;
    return { y, hw };
  }
  // 윗부분 테두리: 왼쪽 겨드랑이 → … → 오른쪽 겨드랑이 (점 목록 + 곡선은 따로)
  function topEdge(neck){
    switch(neck){
      case "heart": return "M72 75 C76 66 92 64 100 77 C108 64 124 66 128 75";
      case "v": return "M72 75 L74 59 L85 55 L100 88 L115 55 L126 59 L128 75";
      case "dv": return "M72 75 L75 58 L84 55 L100 106 L116 55 L125 58 L128 75";
      case "sq": return "M72 75 L74 59 L84 57 L84 77 L116 77 L116 57 L126 59 L128 75";
      case "round": return "M72 75 L74 59 L86 55 Q100 82 114 55 L126 59 L128 75";
      case "boat": return "M72 75 L64 62 L72 55 Q100 64 128 55 L136 62 L128 75";
      case "off": return "M62 77 L60 66 Q100 80 140 66 L138 77";
      case "halter": return "M72 76 L90 40 L95 38 L100 72 L105 38 L110 40 L128 76";
      case "one": return "M72 76 L64 62 L71 54 L82 56 L128 73";
      case "high": return "M72 75 L64 62 L80 52 L92 45 L92 31 L108 31 L108 45 L120 52 L136 62 L128 75";
      case "ill": case "str": default: return neck === "ill" ? "M72 75 C76 66 92 64 100 77 C108 64 124 66 128 75" : "M72 74 L128 74";
    }
  }
  function bodicePath(a){
    const w = waistOf(a), top = topEdge(a.neck), y = w.y, hw = w.hw;
    const lx = a.neck === "off" ? 62 : 72, rx = a.neck === "off" ? 138 : 128, ty = a.neck === "off" ? 77 : 75;
    const vd = a.waist === "vdrop" && a.sil !== "emp" ? 10 : 0;
    // 오른쪽 겨드랑이 → 허리 → 왼쪽 겨드랑이로 닫아요
    return `${top} C${rx + 1} ${ty + 16} ${100 + hw + 3} ${y - 22} ${100 + hw} ${y} ${vd ? `L100 ${y + vd} ` : ""}L${100 - hw} ${y} C${100 - hw - 3} ${y - 22} ${lx - 1} ${ty + 16} ${lx} ${ty} Z`;
  }
  // 치마: [모양 경로, 밑단 왼쪽 x, 밑단 오른쪽 x, 밑단 y]
  function skirt(a){
    const w = waistOf(a), y = w.y, L = 100 - w.hw, R = 100 + w.hw;
    switch(a.sil){
      case "ball": return [`M${L} ${y} C${L - 22} ${y + 18} 26 ${y + 70} 22 264 Q100 284 178 264 C174 ${y + 70} ${R + 22} ${y + 18} ${R} ${y} Z`, 22, 178, 264];
      case "mer": return [`M${L} ${y} C${L - 6} ${y + 26} ${L - 6} ${y + 50} ${L} 200 C${L + 2} 222 62 248 46 266 Q100 278 154 266 C138 248 ${R - 2} 222 ${R} 200 C${R + 6} ${y + 50} ${R + 6} ${y + 26} ${R} ${y} Z`, 46, 154, 266];
      case "tru": return [`M${L} ${y} C${L - 5} ${y + 22} ${L - 4} ${y + 42} ${L} 172 C${L - 4} 202 60 240 50 266 Q100 278 150 266 C140 240 ${R + 4} 202 ${R} 172 C${R + 4} ${y + 42} ${R + 5} ${y + 22} ${R} ${y} Z`, 50, 150, 266];
      case "slim": return [`M${L} ${y} C${L - 4} ${y + 40} ${L - 7} 220 ${L - 8} 266 Q100 271 ${R + 8} 266 C${R + 7} 220 ${R + 4} ${y + 40} ${R} ${y} Z`, L - 8, R + 8, 266];
      case "emp": return [`M${L} ${y} C${L - 8} ${y + 60} 66 220 58 266 Q100 274 142 266 C134 220 ${R + 8} ${y + 60} ${R} ${y} Z`, 58, 142, 266];
      case "short": return [`M${L} ${y} C${L - 10} ${y + 30} 64 180 58 206 Q100 216 142 206 C136 180 ${R + 10} ${y + 30} ${R} ${y} Z`, 58, 142, 206];
      case "a": default: return [`M${L} ${y} C${L - 12} ${y + 40} 48 220 44 266 Q100 278 156 266 C152 220 ${R + 12} ${y + 40} ${R} ${y} Z`, 44, 156, 266];
    }
  }
  function trainPath(sk, n){
    if(!n) return "";
    // 앞모습에서 뒷자락은 치마 뒤로 바닥에 깔려 양옆 · 아래로 보여요 (살짝 어둡게 + 접힌 선)
    const [, l, r, hy] = sk, e = Math.min([0, 3, 10, 20, 32][n], l - 6), h = Math.min([0, 7, 14, 24, 36][n], (304 - hy) / 1.35), y0 = hy - 30;
    const d = `M${l + 10} ${y0} C${l - e * .4} ${hy - 8} ${l - e} ${hy + h * .6} ${l - e * .4} ${hy + h} Q100 ${hy + h * 1.35} ${r + e * .4} ${hy + h} C${r + e} ${hy + h * .6} ${r + e * .4} ${hy - 8} ${r - 10} ${y0} Z`;
    let folds = "";
    if(n >= 2) [-.6, -.2, .2, .6].forEach(k => { folds += `<path d="M${r1(100 + k * (r - l) * .45)} ${hy + 2} L${r1(100 + k * ((r - l) / 2 + e * .7))} ${r1(hy + h * (1.1 - Math.abs(k) * .3))}" stroke="${LINE}" stroke-width=".9" opacity=".3"/>`; });
    return `<path d="${d}" fill="url(#tr)" stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round"/><path d="${d}" fill="${LINE}" opacity=".07"/>${folds}`;
  }
  // 흔들림 없는 무작위 (같은 드레스는 늘 같은 반짝이 자리)
  function rnd(seed){ let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sparkles(rand, n, box, big){
    let s = "";
    for(let i = 0; i < n; i++){
      const x = r1(box[0] + rand() * box[2]), y = r1(box[1] + rand() * box[3]);
      if(big && i % 4 === 0) s += `<path d="M${x} ${y - 3.2} L${x + .9} ${y - .9} L${x + 3.2} ${y} L${x + .9} ${y + .9} L${x} ${y + 3.2} L${x - .9} ${y + .9} L${x - 3.2} ${y} L${x - .9} ${y - .9} Z" fill="${SPARK}"/>`;
      else s += `<circle cx="${x}" cy="${y}" r="${(.7 + rand() * .7).toFixed(2)}" fill="${SPARK}"/>`;
    }
    return s;
  }
  function flower(x, y, r, col){
    let p = "";
    for(let i = 0; i < 5; i++){ const g = i * 72 * Math.PI / 180; p += `<circle cx="${r1(x + Math.cos(g) * r)}" cy="${r1(y + Math.sin(g) * r)}" r="${r1(r * .62)}"/>`; }
    return `<g fill="${col}" opacity=".9">${p}<circle cx="${x}" cy="${y}" r="${r1(r * .5)}" fill="#fff"/></g>`;
  }
  const has = (a, k, v) => Array.isArray(a[k]) && a[k].includes(v);

  function svg(a, opt){
    a = a || {}; opt = opt || {};
    const id = "d" + (opt.uid || Math.floor(Math.random() * 1e9).toString(36));
    const rand = rnd(opt.seed || 7);
    const fill = FILL[a.color] || FILL.white, unset = !a.sil;
    const sk = skirt(a), w = waistOf(a), sil = a.sil;
    const atAll = !Array.isArray(a.decoAt) || !a.decoAt.length || has(a, "decoAt", "all");
    const at = k => atAll || has(a, "decoAt", k);
    const fab = k => has(a, "fab", k), deco = k => has(a, "deco", k);
    const shine = +a.shine || 0;
    let back = "", under = "", over = "", tex = "", top = "";

    // 뒤쪽: 케이프 · 오버스커트 · 뒷자락
    if(deco("cape")) back += `<path d="M64 58 C46 90 38 160 40 214 L100 222 L160 214 C162 160 154 90 136 58 Z" fill="${fill}" opacity=".55" stroke="${LINE}" stroke-width="1.1" stroke-dasharray="3 3"/>`;
    if(deco("over")) back += `<path d="M${100 - w.hw - 2} ${w.y} C60 ${w.y + 40} 18 220 14 ${sk[3] + 4} Q100 ${sk[3] + 22} 186 ${sk[3] + 4} C182 220 140 ${w.y + 40} ${100 + w.hw + 2} ${w.y} Z" fill="${fill}" opacity=".6" stroke="${LINE}" stroke-width="1.1"/>`;
    back += trainPath(sk, +a.train || 0);

    // 소매 (뒤에 깔리는 것: 팔을 감쌈)
    const sl = a.slv, sx = a.slvx || [], sheer = sx.includes("sheer"), puff = sx.includes("puff"), bell = sx.includes("bell");
    const slvSpan = { cap: [0, .12], short: [0, .36], three: [0, .72], long: [0, 1], offs: [.06, .34] }[sl];
    let sleeves = "";
    if(slvSpan){
      ["L", "R"].forEach(s => {
        const w0 = puff ? 11 : 8.5, w1 = bell ? 13 : sl === "cap" ? 8 : 7.5;
        sleeves += `<polygon points="${sleevePoly(s, slvSpan[0], slvSpan[1], w0, w1)}" fill="${fill}" ${sheer ? 'fill-opacity=".55"' : ""} stroke="${LINE}" stroke-width="1.4" stroke-linejoin="round"/>`;
        if(puff){ const [x, y] = armPt(s, slvSpan[0] + .05); sleeves += `<ellipse cx="${r1(x)}" cy="${r1(y + 2)}" rx="11" ry="9" fill="${fill}" stroke="${LINE}" stroke-width="1.4"/>`; }
        if(sheer && has(a, "fab", "lace")) sleeves += "";
      });
    }
    // 끈
    const strapX = { strap: [[82, 70, 80, 56], [118, 70, 120, 56]], tank: [[80, 72, 78, 56], [120, 72, 122, 56]] }[sl];
    if(strapX && !["halter", "one", "high", "boat", "off"].includes(a.neck)){
      const sw = sl === "tank" ? 7 : 2.4;
      strapX.forEach(p => { sleeves += `<line x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" stroke="${sl === "tank" ? LINE : LINE}" stroke-width="${sw + (sl === "tank" ? 2.6 : 0)}" stroke-linecap="round"/>${sl === "tank" ? `<line x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>` : ""}`; });
    }

    // 몸판
    const bod = bodicePath(a), skp = sk[0];
    under += `<path d="${skp}" fill="${fill}" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round" ${unset ? 'stroke-dasharray="4 3"' : ""}/>`;
    under += `<path d="${bod}" fill="${fill}" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>`;

    // 천 무늬 (드레스 모양 안에만)
    const clip = `<clipPath id="${id}c"><path d="${skp}"/><path d="${bod}"/></clipPath>`;
    const skBox = [sk[1], w.y, sk[2] - sk[1], sk[3] - w.y], bdBox = [72, 66, 56, w.y - 66];
    if(fab("silk") || fab("taffeta") || (!a.fab || !a.fab.length) && !unset){
      // 실크 광택: 치마 왼쪽에 부드러운 빛 한 줄 (밑단까지 내리지 않아요)
      const sy0 = w.y + 10, sy1 = w.y + (sk[3] - w.y) * .72, sx0 = 100 - w.hw + 5, sx1 = sil === "mer" || sil === "slim" || sil === "tru" ? 100 - w.hw + 2 : (sk[1] + 100) / 2 - 4;
      tex += `<path d="M${sx0} ${sy0} C${sx0 - 4} ${sy0 + 40} ${sx1 + 2} ${sy1 - 50} ${sx1} ${sy1}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/>`;
      tex += `<path d="M${100 + w.hw - 2} ${w.y + 14} C${sk[2] - 30} ${w.y + 70} ${sk[2] - 26} ${sk[3] - 70} ${sk[2] - 28} ${sk[3] - 10}" fill="none" stroke="${LINE}" stroke-width="1" opacity=".22"/>`;
    }
    if(fab("taffeta")) tex += `<path d="M100 ${w.y + 20} L96 ${sk[3]} M118 ${w.y + 30} L126 ${sk[3]}" stroke="${LINE}" stroke-width="1" opacity=".3" fill="none"/>`;
    if(fab("tulle") || fab("glit")){
      for(let i = 1; i <= 4; i++){
        const t = i / 5, yy = w.y + (sk[3] - w.y) * t, hw = w.hw + ((sk[2] - sk[1]) / 2 - w.hw) * Math.pow(t, sil === "mer" || sil === "tru" ? 3 : 1);
        tex += `<path d="M${r1(100 - hw - 2)} ${r1(yy)} Q100 ${r1(yy + 8 + i * 2)} ${r1(100 + hw + 2)} ${r1(yy)}" fill="none" stroke="${LINE}" stroke-width=".9" opacity=".32"/>`;
      }
    }
    if(fab("organza") || fab("chiffon")){
      [-14, 2, 16].forEach((dx, i) => { tex += `<path d="M${100 + dx * .5} ${w.y + 10} C${100 + dx} ${w.y + 60} ${100 + dx * 2.2} ${sk[3] - 60} ${100 + dx * 2.6} ${sk[3] - 2}" fill="none" stroke="${LINE}" stroke-width=".9" opacity="${fab("chiffon") ? .3 : .22}"/>`; });
    }
    if(fab("lace") || deco("embro") || a.pat === "flower" || has(a, "pat", "flower")){
      const n = fab("lace") ? 22 : 10;
      for(let i = 0; i < n; i++){
        const inB = i < n * .3, b = inB ? bdBox : skBox;
        tex += flower(r1(b[0] + rand() * b[2]), r1(b[1] + 4 + rand() * (b[3] - 8)), 2.1 + rand() * 1.2, "#C9BCAA");
      }
    }
    if(has(a, "pat", "geo")){
      for(let y = w.y + 10; y < sk[3]; y += 12) for(let x = sk[1] + 6; x < sk[2]; x += 12) tex += `<circle cx="${x + ((y / 12) % 2 ? 6 : 0)}" cy="${y}" r="1.1" fill="${LINE}" opacity=".35"/>`;
    }
    // 반짝임 · 비즈 · 스팽글
    let nSp = shine * 9 + (fab("bead") ? 18 : 0) + (fab("glit") ? 12 : 0) + (deco("bead") ? 14 : 0) + (deco("seq") ? 14 : 0);
    if(nSp){
      const big = shine >= 2 || deco("seq") || fab("bead");
      if(at("chest")) tex += sparkles(rand, Math.ceil(nSp * (atAll ? .4 : .7)), bdBox, big);
      if(at("skirt") || atAll) tex += sparkles(rand, Math.ceil(nSp * (atAll ? .8 : 1)), [skBox[0] + 6, skBox[1], skBox[2] - 12, skBox[3]], big);
      if(at("hem") && !atAll) tex += sparkles(rand, nSp, [sk[1] + 4, sk[3] - 26, sk[2] - sk[1] - 8, 22], big);
      if(at("waist") && !atAll) tex += sparkles(rand, Math.ceil(nSp * .6), [100 - w.hw - 4, w.y - 10, w.hw * 2 + 8, 18], big);
    }
    if(deco("stone")) [[92, 88], [108, 88], [100, 98], [86, 104], [114, 104]].forEach(p => { if(p[1] < w.y - 2) tex += `<path d="M${p[0]} ${p[1] - 3.5} L${p[0] + 3} ${p[1]} L${p[0]} ${p[1] + 3.5} L${p[0] - 3} ${p[1]} Z" fill="#fff" stroke="${SPARK}" stroke-width="1"/>`; });
    // 주름
    if(deco("flounce")){
      [.42, .64, .84].forEach(t => {
        const yy = w.y + (sk[3] - w.y) * t, hw = w.hw + ((sk[2] - sk[1]) / 2 - w.hw) * Math.pow(t, sil === "mer" || sil === "tru" ? 3 : 1);
        let d = `M${r1(100 - hw)} ${r1(yy)}`; const n = 7, step = hw * 2 / n;
        for(let i = 0; i < n; i++) d += ` q${r1(step / 2)} 6 ${r1(step)} 0`;
        tex += `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.1" opacity=".6"/>`;
      });
    }
    if(deco("pleat")) for(let i = -3; i <= 3; i++) tex += `<path d="M${100 + i * w.hw / 3.2} ${w.y + 2} L${100 + i * (sk[2] - sk[1]) / 7.6} ${sk[3] - 2}" stroke="${LINE}" stroke-width=".9" opacity=".35"/>`;
    if(deco("shirr")) for(let i = 0; i < 5; i++) tex += `<path d="M${80 + i * 2} ${80 + i * 7} Q100 ${84 + i * 7} ${120 - i * 2} ${80 + i * 7}" fill="none" stroke="${LINE}" stroke-width=".8" opacity=".45"/>`;
    if(deco("drape")) tex += `<path d="M74 82 C92 92 108 104 ${100 + w.hw} ${w.y - 2} M76 96 C92 104 104 110 ${100 + w.hw - 4} ${w.y + 4} M126 80 C110 90 100 96 96 ${w.y - 6}" fill="none" stroke="${LINE}" stroke-width="1" opacity=".45"/>`;
    if(deco("appl")){
      for(let i = 0; i < 9; i++){ const t = rand(); tex += flower(r1(100 - w.hw - 4 + rand() * (w.hw * 2 + 8) * (1 + t)), r1(w.y - 30 + rand() * 70), 3 + rand() * 1.6, "#BBAE9C"); }
    }

    // 위에 얹는 장식
    if(a.waist !== "straight" && sil !== "slim" && !deco("belt")) top += `<path d="M${100 - w.hw} ${w.y} ${a.waist === "vdrop" && sil !== "emp" ? `L100 ${w.y + 10} ` : ""}L${100 + w.hw} ${w.y}" fill="none" stroke="${LINE}" stroke-width="1.1" opacity=".55"/>`;
    if(deco("belt")) top += `<path d="M${100 - w.hw - 1} ${w.y - 4} L${100 + w.hw + 1} ${w.y - 4} L${100 + w.hw + 1.5} ${w.y + 4} L${100 - w.hw - 1.5} ${w.y + 4} Z" fill="${fill}" stroke="${LINE}" stroke-width="1.3"/>` + sparkles(rnd(3), 6, [100 - w.hw, w.y - 3, w.hw * 2, 6], false);
    if(deco("ribbon")) top += `<g stroke="${LINE}" stroke-width="1.3" fill="${fill}" stroke-linejoin="round"><path d="M${100 + w.hw - 6} ${w.y} L${100 + w.hw + 10} ${w.y - 9} L${100 + w.hw + 10} ${w.y + 7} Z"/><path d="M${100 + w.hw - 6} ${w.y} L${100 + w.hw - 22} ${w.y - 9} L${100 + w.hw - 22} ${w.y + 7} Z"/><path d="M${100 + w.hw - 8} ${w.y + 2} L${100 + w.hw - 14} ${w.y + 30} M${100 + w.hw - 4} ${w.y + 2} L${100 + w.hw + 4} ${w.y + 32}" fill="none"/><circle cx="${100 + w.hw - 6}" cy="${w.y}" r="3"/></g>`;
    if(deco("flower3d")) top += flower(76, 78, 5.5, "#D8CCBB") + flower(84, w.y - 2, 4.5, "#D8CCBB") + flower(124, 72, 4, "#D8CCBB");
    if(deco("pearl")){
      const pts = { heart: [[74, 72], [80, 67.5], [87, 66], [94, 70], [100, 76], [106, 70], [113, 66], [120, 67.5], [126, 72]], str: [[74, 74], [82, 74], [90, 74], [100, 74], [110, 74], [118, 74], [126, 74]] };
      (pts[a.neck] || [[86, 58], [90, 64], [94, 70], [100, 75], [106, 70], [110, 64], [114, 58]]).forEach(p => { top += `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="#fff" stroke="${SPARK}" stroke-width=".9"/>`; });
    }
    if(deco("feather")){
      for(let i = 0; i < 16; i++){ const x = sk[1] + 6 + i * (sk[2] - sk[1] - 12) / 15, y = sk[3] - 4 + Math.sin(i) * 2; top += `<path d="M${r1(x)} ${r1(y)} q-3 -9 1 -14 q4 5 -1 14" fill="${fill}" stroke="${LINE}" stroke-width=".8" opacity=".85"/>`; }
    }
    if(deco("ruffle")){
      let d = `M${sk[1] - 1} ${sk[3] - 1}`; const n = 12, st = (sk[2] - sk[1] + 2) / n;
      for(let i = 0; i < n; i++) d += ` q${r1(st / 2)} 7 ${r1(st)} 0`;
      top += `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.3"/>`;
    }
    if(deco("scallop")){
      let d = `M${sk[1] + 2} ${sk[3] - 3}`; const n = 10, st = (sk[2] - sk[1] - 4) / n;
      for(let i = 0; i < n; i++) d += ` a${r1(st / 2)} ${r1(st / 2)} 0 0 0 ${r1(st)} 0`;
      top += `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="1.1" opacity=".75"/>`;
    }
    if(deco("slit")) top += `<path d="M${(100 + sk[2]) / 2 - 6} ${sk[3] - 2} L${100 + w.hw - 2} ${Math.max(w.y + 40, 178)}" stroke="${LINE}" stroke-width="1.4" fill="none"/><path d="M${(100 + sk[2]) / 2 - 4} ${sk[3] - 3} L${100 + w.hw} ${Math.max(w.y + 44, 182)} L${(100 + sk[2]) / 2 + 2} ${sk[3] - 4} Z" fill="${BODY}"/>`;
    if(deco("cut")) top += `<path d="M100 ${w.y - 16} L106 ${w.y - 8} L100 ${w.y} L94 ${w.y - 8} Z" fill="${BODY}" stroke="${LINE}" stroke-width="1.2"/>`;
    // 일루전 · 하이넥 비침
    if(a.neck === "ill") top += `<path d="M72 75 L64 62 L80 52 L92 45 L92 38 L108 38 L108 45 L120 52 L136 62 L128 75 C124 66 108 64 100 77 C92 64 76 66 72 75 Z" fill="${fill}" fill-opacity=".5" stroke="${LINE}" stroke-width="1" stroke-dasharray="2 2"/>`;
    if(a.neck === "high") top += `<path d="M92 36 L108 36" stroke="${LINE}" stroke-width="1" opacity=".5"/>`;
    if(a.neck === "halter") top += `<path d="M90 40 Q100 34 110 40" fill="none" stroke="${LINE}" stroke-width="1.4"/>`;

    const short = sil === "short" ? `<path d="M88 214 L86 262 M112 214 L114 262" stroke="${BODY}" stroke-width="11" stroke-linecap="round"/>` : "";
    const vb = opt.crop || "0 0 200 310";
    const bg = opt.bg === false ? "" : `<rect x="-50" y="-50" width="300" height="420" fill="${opt.bg || BG}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${opt.w ? `width="${opt.w}"` : ""} ${opt.h ? `height="${opt.h}"` : ""} role="img" aria-label="${opt.label ? String(opt.label).replace(/"/g, "") : "드레스 그림"}" preserveAspectRatio="xMidYMid meet">
<defs>${clip}<linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".75"/></linearGradient></defs>
${bg}${short}${back}${bodyPath()}${sleeves}${under}<g clip-path="url(#${id}c)">${tex}</g>${top}</svg>`;
  }

  // ===== 선택지 단추 그림 =====
  const SW = { silk: "", bead: "", lace: "", tulle: "", glit: "", organza: "", chiffon: "", crepe: "", taffeta: "" };
  function swatch(k){
    const f = "#FFFFFF";
    let t = "";
    if(k === "silk") t = `<path d="M6 30 C14 18 22 14 34 6" stroke="#fff" stroke-width="7" opacity=".95"/><path d="M4 22 C12 14 18 10 26 4" stroke="${LINE}" stroke-width="1" opacity=".25"/>`;
    if(k === "bead") t = sparkles(rnd(11), 18, [3, 3, 34, 34], true);
    if(k === "glit") t = `<path d="M0 12 Q20 18 40 12 M0 24 Q20 30 40 24" stroke="${LINE}" stroke-width=".9" opacity=".35" fill="none"/>` + sparkles(rnd(5), 9, [3, 3, 34, 34], false);
    if(k === "lace") t = flower(11, 12, 3.2, "#C9BCAA") + flower(28, 26, 3.4, "#C9BCAA") + flower(28, 8, 2.4, "#C9BCAA") + flower(10, 30, 2.4, "#C9BCAA");
    if(k === "tulle") t = `<path d="M0 10 Q20 16 40 10 M0 20 Q20 26 40 20 M0 30 Q20 36 40 30" stroke="${LINE}" stroke-width=".9" opacity=".4" fill="none"/>`;
    if(k === "organza") t = `<rect x="0" y="0" width="40" height="40" fill="${BODY}" opacity=".45"/><path d="M8 0 C12 14 10 26 14 40 M24 0 C28 14 26 26 30 40" stroke="${LINE}" stroke-width=".9" opacity=".3" fill="none"/>`;
    if(k === "chiffon") t = `<path d="M6 0 C14 12 4 26 12 40 M20 0 C28 12 18 26 26 40 M34 0 C40 12 32 26 38 40" stroke="${LINE}" stroke-width=".9" opacity=".35" fill="none"/>`;
    if(k === "crepe") t = `<path d="M3 8 l3 1 M14 5 l3 -1 M26 9 l2 1 M7 19 l3 -1 M20 17 l2 1 M32 20 l3 -1 M5 31 l3 1 M17 29 l2 -1 M29 33 l3 1" stroke="${LINE}" stroke-width=".8" opacity=".35"/>`;
    if(k === "taffeta") t = `<path d="M10 0 L8 40 M26 0 L30 40" stroke="${LINE}" stroke-width="1" opacity=".3"/><path d="M16 0 C20 12 18 28 22 40" stroke="#fff" stroke-width="5" opacity=".9" fill="none"/>`;
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><clipPath id="sw${k}"><rect x="0" y="0" width="40" height="40" rx="10"/></clipPath><g clip-path="url(#sw${k})"><rect width="40" height="40" fill="${k === "organza" ? "#FFFFFF" : f}"/>${t}</g><rect x=".7" y=".7" width="38.6" height="38.6" rx="9.5" fill="none" stroke="${LINE}" stroke-opacity=".45" stroke-width="1.2"/></svg>`;
  }
  function pic(kind, v){
    if(kind === "color") return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="${FILL[v] || "#fff"}" stroke="${LINE}" stroke-opacity=".55" stroke-width="1.4"/></svg>`;
    if(kind === "fab") return swatch(v);
    const base = { sil: "a", neck: "str", slv: "none", color: "white", shine: "0", fab: ["crepe"] };
    if(kind === "sil") return svg(Object.assign(base, { sil: v }), { crop: "16 20 168 270", uid: "ps" + v, bg: false, seed: 1 });
    if(kind === "neck") return svg(Object.assign(base, { neck: v, slv: v === "off" ? "offs" : "none" }), { crop: "52 24 96 72", uid: "pn" + v, bg: false, seed: 1 });
    if(kind === "slv") return svg(Object.assign(base, { neck: v === "none" ? "str" : v === "offs" ? "off" : ["strap", "tank"].includes(v) ? "sq" : "round", slv: v }), { crop: "34 28 132 150", uid: "pl" + v, bg: false, seed: 1 });
    if(kind === "train") return svg(Object.assign(base, { train: v }), { crop: "4 196 192 114", uid: "pt" + v, bg: false, seed: 1 });
    return "";
  }
  return { svg, pic, FILL };
})();
