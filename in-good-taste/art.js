// 혼주 취향 테스트 ㊵ · 직접 그린 그림 (한복 · 양장 · 머리 모양). 실제 사진은 저작권 때문에 쓰지 않아요.
const ART = (() => {
  const SKIN = "#F1D2B9", SKIN_LINE = "#D9B096", HAIR = "#3B302C", INK = "#4A3B36";

  // 흰색과 섞기 (t = 0~1, 1이면 흰색)
  function tint(hex, t){
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = c => Math.round(c + (255 - c) * t);
    return "#" + [m(r), m(g), m(b)].map(c => c.toString(16).padStart(2, "0")).join("");
  }
  // 검정과 섞기
  function shade(hex, t){
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const m = c => Math.round(c * (1 - t));
    return "#" + [m(r), m(g), m(b)].map(c => c.toString(16).padStart(2, "0")).join("");
  }
  const svg = (vb, body, label) => `<svg viewBox="${vb}" role="img" aria-label="${label || ""}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  // ===== 한복 (저고리 · 치마 · 고름) =====
  function hanbok(jeo, chima, trim, label){
    const fold = "rgba(0,0,0,.09)";
    return svg("0 0 100 112", `
      <path d="M31 36 Q24 70 11 106 Q50 113 89 106 Q76 70 69 36 Z" fill="${chima}"/>
      <path d="M42 44 Q38 76 33 108 M58 44 Q62 76 67 108 M50 44 L50 110" stroke="${fold}" stroke-width="1.4" fill="none"/>
      <path d="M31 13 Q15 19 7 44 L20 51 Q24 35 33 30 Z" fill="${jeo}"/>
      <path d="M69 13 Q85 19 93 44 L80 51 Q76 35 67 30 Z" fill="${jeo}"/>
      <path d="M7 44 L20 51 L22 46 L10 40 Z" fill="${trim}"/>
      <path d="M93 44 L80 51 L78 46 L90 40 Z" fill="${trim}"/>
      <path d="M30 12 L70 12 L71 40 Q50 45 29 40 Z" fill="${jeo}"/>
      <path d="M58 11 L43 36" stroke="${trim}" stroke-width="7" stroke-linecap="round"/>
      <path d="M42 11 L52 25" stroke="${trim}" stroke-width="7" stroke-linecap="round"/>
      <path d="M58 9 L44 32 M42 9 L51 22" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M45 34 Q44 52 41 70 L46 70 Q48 52 48 35 Z" fill="${trim}"/>
      <path d="M48 35 Q52 50 53 64 L57 63 Q55 49 50 34 Z" fill="${trim}"/>
      <ellipse cx="46.5" cy="34.5" rx="4.2" ry="3" fill="${trim}"/>`, label);
  }
  // ===== 양장 (원피스 + 짧은 소매) =====
  function dress(fill, trim, label){
    return svg("0 0 100 112", `
      <path d="M38 9 Q50 17 62 9 L75 15 L82 37 L71 40 L68 31 Q70 62 83 106 Q50 112 17 106 Q30 62 32 31 L29 40 L18 37 L25 15 Z" fill="${fill}"/>
      <path d="M38 9 Q50 17 62 9" stroke="${trim}" stroke-width="2.4" fill="none"/>
      <path d="M33 47 Q50 51 67 47" stroke="${trim}" stroke-width="3" fill="none"/>
      <path d="M44 51 Q41 78 36 107 M56 51 Q59 78 64 107" stroke="rgba(0,0,0,.08)" stroke-width="1.4" fill="none"/>`, label);
  }
  // 고른 답(옷 · 1순위 색 · 느낌 · 포인트)으로 옷 그림
  function outfit(wear, fam, tone, point, label){
    const pal = CORE.PAL[fam] || CORE.PAL.pink;
    const c = pal[tone || "pastel"];
    const light = tint(c, tone === "pastel" ? 0.55 : 0.72);
    const trim = tone === "deep" ? shade(c, .25) : tone === "pastel" ? pal.vivid : pal.deep;
    if(wear === "dress") return dress(c, trim, label);
    if(point === "jeogori") return hanbok(c, light, trim, label);
    if(point === "same") return hanbok(c, c, trim, label);
    return hanbok(light, c, trim, label);
  }
  // 색 계열 견본 (파스텔 · 선명 · 깊은 세 칸)
  function swatch(fam){
    const p = CORE.PAL[fam];
    return `<span class="sw" aria-hidden="true"><i style="background:${p.pastel}"></i><i style="background:${p.vivid}"></i><i style="background:${p.deep}"></i></span>`;
  }

  // ===== 어머님 머리 =====
  // o: { len, hair: "up"|"dry", bang: "open"|"side"|"down", vol: "calm"|"full" }
  function mom(o, label){
    o = Object.assign({ len: "mid", hair: "dry", bang: "side", vol: "calm" }, o || {});
    const full = o.vol === "full";
    const top = full ? 15 : 22;           // 정수리 높이
    const wide = full ? 4 : 0;            // 옆 볼륨
    let back = "";
    if(o.hair === "up"){
      // 뒤로 올려 묶은 머리: 뒤통수 위쪽에 쪽(번)이 비쳐 보이게
      back = `<ellipse cx="${66 + wide}" cy="${top + 13}" rx="${10 + wide / 2}" ry="${9 + wide / 2}" fill="${HAIR}"/>
        <path d="M${61 + wide} ${top + 9} q5 3 9 9" stroke="#5A4A44" stroke-width="1.1" fill="none"/>`;
    } else {
      const end = { short: 50, bob: 66, mid: 80, long: 96 }[o.len] || 80;
      const w = (o.len === "short" ? 18 : 22) + wide;
      back = `<path d="M${50 - w} ${end} Q${48 - w - 4} ${top + 6} 50 ${top} Q${52 + w + 4} ${top + 6} ${50 + w} ${end}
        Q${50 + w - 6} ${end + 4} ${50 + w - 10} ${end - 3} L${50 - w + 10} ${end - 3} Q${50 - w + 6} ${end + 4} ${50 - w} ${end} Z" fill="${HAIR}"/>`;
    }
    const cap = (o.hair === "up" ? 3 : 4) + wide;
    const capTop = top + 2;
    const bangs = {
      open: `<path d="M${34 - cap} 46 Q${32 - cap} ${capTop} 50 ${capTop} Q${68 + cap} ${capTop} ${66 + cap} 46 Q66 34 50 32 Q34 34 ${34 - cap} 46 Z" fill="${HAIR}"/>
             <path d="M42 33 Q46 ${capTop + 6} 52 ${capTop + 3} M56 33 Q57 ${capTop + 7} 61 ${capTop + 5}" stroke="#5A4A44" stroke-width="1.1" fill="none"/>`,
      side: `<path d="M${34 - cap} 48 Q${32 - cap} ${capTop} 50 ${capTop} Q${68 + cap} ${capTop} ${66 + cap} 46 Q66 34 60 33 Q47 37 36 50 Q${34 - cap} 51 ${34 - cap} 48 Z" fill="${HAIR}"/>`,
      down: `<path d="M${34 - cap} 47 Q${32 - cap} ${capTop} 50 ${capTop} Q${68 + cap} ${capTop} ${66 + cap} 47 L66 43 Q50 46 34 43 Z" fill="${HAIR}"/>`
    }[o.bang] || "";
    return svg("0 0 100 100", `
      ${back}
      <path d="M17 100 Q19 83 40 79 L60 79 Q81 83 83 100 Z" fill="#D8D0C8"/>
      <rect x="44" y="60" width="12" height="21" rx="4" fill="${SKIN}"/>
      <ellipse cx="34.5" cy="49" rx="3" ry="4.5" fill="${SKIN}"/><ellipse cx="65.5" cy="49" rx="3" ry="4.5" fill="${SKIN}"/>
      <ellipse cx="50" cy="47" rx="15.5" ry="19.5" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width=".6"/>
      ${bangs}
      <path d="M42 49 q2.5 -2 5 0 M53 49 q2.5 -2 5 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M46.5 57.5 q3.5 2.2 7 0" stroke="#C26A6A" stroke-width="1.4" fill="none" stroke-linecap="round"/>`, label);
  }
  // ===== 아버님 머리 =====
  function dad(part, label){
    const hairTop = part === "open"
      ? `<path d="M34 42 Q32 22 50 21 Q68 22 66 42 Q65 31 50 29.5 Q35 31 34 42 Z" fill="${HAIR}"/>
         <path d="M41 30 Q45 24 52 23 M55 30 Q58 25 62 25" stroke="#6A5A54" stroke-width="1.1" fill="none"/>`
      : `<path d="M34 45 Q32 22 50 21 Q68 22 66 44 Q64 34 57 31 L55 30 Q45 34 36 46 Z" fill="${HAIR}"/>
         <path d="M56 22.5 L55.5 30" stroke="${SKIN_LINE}" stroke-width="1"/>`;
    return svg("0 0 100 100", `
      <path d="M15 100 Q17 82 40 78 L60 78 Q83 82 85 100 Z" fill="#3B4252"/>
      <path d="M43 78 L50 93 L57 78 Z" fill="#FFFFFF"/><path d="M48.5 82 L51.5 82 L52.5 98 L50 100 L47.5 98 Z" fill="#8C2F45"/>
      <rect x="44" y="59" width="12" height="20" rx="4" fill="${SKIN}"/>
      <ellipse cx="34" cy="48" rx="3" ry="4.5" fill="${SKIN}"/><ellipse cx="66" cy="48" rx="3" ry="4.5" fill="${SKIN}"/>
      <path d="M34 44 Q34 66 50 67 Q66 66 66 44 Q66 28 50 27 Q34 28 34 44 Z" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width=".6"/>
      ${hairTop}
      <path d="M41 43 h6 M53 43 h6" stroke="${HAIR}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M42 48.5 q2.5 -1.6 5 0 M53 48.5 q2.5 -1.6 5 0" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M46 58 q4 1.6 8 0" stroke="#A86060" stroke-width="1.4" fill="none" stroke-linecap="round"/>`, label);
  }

  return { tint, shade, hanbok, dress, outfit, swatch, mom, dad };
})();
