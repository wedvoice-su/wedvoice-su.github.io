// 혼주 취향 테스트 ㊵ · 질문 순서 · 조건 · 링크에 담기 · 양가 비교 (화면 없는 계산만 — node로도 시험해요)
(function(root){
  // 색 계열 7가지 × 느낌 3가지 (그림에 쓰는 색)
  const FAMS = ["pink", "red", "blue", "green", "purple", "beige", "gray"];
  const TONES = ["pastel", "vivid", "deep"];
  const PAL = {
    pink:   { pastel: "#F5CFD9", vivid: "#EC6F96", deep: "#B0446A" },
    red:    { pastel: "#EDC5CC", vivid: "#C8394F", deep: "#7E2338" },
    blue:   { pastel: "#CDE1F3", vivid: "#4A86D4", deep: "#26406E" },
    green:  { pastel: "#CBEBDD", vivid: "#2EAB8B", deep: "#1F5C4B" },
    purple: { pastel: "#E1D4F0", vivid: "#8E5CC9", deep: "#4F3577" },
    beige:  { pastel: "#F3E9D6", vivid: "#D8AE4E", deep: "#8D6B3A" },
    gray:   { pastel: "#E4E5E8", vivid: "#AEB4BD", deep: "#43474E" }
  };

  // 질문: o = 고를 수 있는 값(순서가 곧 링크 번호라 뒤에만 붙여요) · multi = 여러 개(최대 개수) · none = 고르면 나머지가 빠지는 값
  //       memo = "있어요"를 고르면 메모 칸 · sec = 화면 위 구역 이름 · when = 이 질문이 나오는 조건
  const Q = {
    who:   { o: ["both", "m", "f"], sec: "who" },
    wear:  { o: ["hanbok", "dress"], sec: "wear" },
    color: { o: FAMS, multi: 2, sec: "wear" },
    tone:  { o: TONES, sec: "wear" },
    point: { o: ["chima", "jeogori", "same"], sec: "wear", when: a => a.wear === "hanbok" },
    place: { o: ["hall", "couple", "pro", "usual", "visit", "self"], sec: "place", when: a => a.who !== "f" || a.fget !== "none" },
    share: { o: ["same", "room", "apart"], sec: "place", when: a => ["hall", "couple", "pro", "visit"].includes(a.place) && (a.who !== "f" || a.fget !== "none") },
    len:   { o: ["short", "bob", "mid", "long"], sec: "mhair" },
    hair:  { o: ["up", "dry"], sec: "mhair" },
    wig:   { o: ["add", "ifneed", "own"], sec: "mhair", when: a => a.hair === "up" },
    bang:  { o: ["open", "side", "down"], sec: "mhair" },
    vol:   { o: ["calm", "full"], sec: "mhair" },
    grayM: { o: ["dye", "keep", "few"], sec: "mhair" },
    usual: { o: ["none", "light", "full"], sec: "mface" },
    depth: { o: ["same", "clear", "bright"], sec: "mface" },
    lash:  { o: ["yes", "no"], sec: "mface" },
    care:  { o: ["spot", "wrinkle", "eye", "brow", "crown", "none"], multi: 6, none: "none", sec: "mface" },
    skinM: { o: ["no", "yes"], memo: "memoM", sec: "mface" },
    fget:  { o: ["both", "hair", "face", "none"], sec: "dad" },
    part:  { o: ["open", "part"], sec: "dad", when: a => a.fget === "both" || a.fget === "hair" },
    grayF: { o: ["dye", "keep", "few"], sec: "dad" },
    skinF: { o: ["no", "yes"], memo: "memoF", sec: "dad", when: a => a.fget === "both" || a.fget === "face" }
  };
  const MOM = ["wear", "color", "tone", "point", "place", "share", "len", "hair", "wig", "bang", "vol", "grayM", "usual", "depth", "lash", "care", "skinM"];
  const DAD = ["fget", "part", "grayF", "skinF"];
  const DAD_ONLY = ["fget", "place", "share", "part", "grayF", "skinF"];   // 아버님만: 받을지 먼저, 받으시면 받는 곳
  const ALL = Object.keys(Q);

  const on = (id, a) => !Q[id].when || Q[id].when(a);
  // 지금 답에 맞춰 나오는 질문 (순서대로)
  function list(a){
    if(!a || !a.who) return ["who"];
    const seq = a.who === "both" ? MOM.concat(DAD) : a.who === "m" ? MOM : DAD_ONLY;
    return ["who"].concat(seq.filter(id => on(id, a)));
  }
  function answered(id, a){
    const v = a[id];
    if(Q[id].multi) return Array.isArray(v) && v.length > 0;
    return v != null && Q[id].o.includes(v);
  }
  // after 다음부터 아직 안 고른 첫 질문 (없으면 null = 다 고름)
  function nextOpen(a, after){
    const L = list(a);
    const i = after ? L.indexOf(after) : -1;
    for(let j = i + 1; j < L.length; j++) if(!answered(L[j], a)) return L[j];
    for(let j = 0; j <= i && j < L.length; j++) if(!answered(L[j], a)) return L[j];
    return null;
  }
  const complete = a => !!a && list(a).every(id => answered(id, a));
  // 화면 위 "n / 전체"용: 아직 안 고른 갈림길은 질문이 더 나오는 쪽으로 가정 → 전체 수가 늘지 않고 줄기만 해요
  function most(a){
    const x = Object.assign({}, a);
    if(!x.who) x.who = "both";
    if(!x.wear) x.wear = "hanbok";
    if(!x.fget) x.fget = "both";
    if(!x.place) x.place = "pro";
    if(!x.hair) x.hair = "up";
    return list(x);
  }
  const started = a => !!a && !!a.who;

  // 저장된 답 정리 (모르는 값은 버려요)
  function clean(x){
    const a = {};
    if(!x || typeof x !== "object") return a;
    ALL.forEach(id => {
      const q = Q[id], v = x[id];
      if(q.multi){
        if(Array.isArray(v)){
          let arr = [...new Set(v.filter(k => q.o.includes(k)))];
          if(q.none && arr.includes(q.none) && arr.length > 1) arr = arr[arr.length - 1] === q.none ? [q.none] : arr.filter(k => k !== q.none);
          arr = arr.slice(0, q.multi);
          if(arr.length) a[id] = arr;
        }
      } else if(q.o.includes(v)) a[id] = v;
    });
    ["memoM", "memoF"].forEach(k => { if(typeof x[k] === "string") a[k] = cleanMemo(x[k]); });
    if(typeof x.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.d)) a.d = x.d;
    return a;
  }
  const cleanMemo = s => String(s).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

  // 나오는 질문의 답만 남기기 (안 나오는 질문의 예전 답은 카드 · 링크에 넣지 않아요)
  function shown(a){
    const out = {};
    list(a).forEach(id => { if(answered(id, a)) out[id] = Array.isArray(a[id]) ? a[id].slice() : a[id]; });
    if(out.skinM === "yes" && a.memoM) out.memoM = a.memoM;
    if(out.skinF === "yes" && a.memoF) out.memoF = a.memoF;
    if(a.d) out.d = a.d;
    return out;
  }

  // ===== 링크에 담기 (#a=…) =====
  function b64e(str){
    const bytes = new TextEncoder().encode(str); let bin = "";
    bytes.forEach(x => { bin += String.fromCharCode(x); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(s){
    s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while(s.length % 4) s += "=";
    const bin = atob(s);
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
  // side: "g"(신랑 측) · "b"(신부 측)
  function encode(side, a){
    const s = shown(a), r = {};
    Object.keys(s).forEach(id => {
      if(!Q[id]) return;
      r[id] = Q[id].multi ? s[id].map(k => Q[id].o.indexOf(k)) : Q[id].o.indexOf(s[id]);
    });
    const o = { v: 1, s: side, a: r };
    if(s.d) o.d = s.d;
    if(s.memoM) o.mm = s.memoM;
    if(s.memoF) o.mf = s.memoF;
    return b64e(JSON.stringify(o));
  }
  function decode(code){
    try {
      const o = JSON.parse(b64d(code));
      if(!o || o.v !== 1 || (o.s !== "g" && o.s !== "b") || !o.a || typeof o.a !== "object") return null;
      const x = {};
      Object.keys(o.a).forEach(id => {
        const q = Q[id], v = o.a[id]; if(!q) return;
        x[id] = q.multi ? (Array.isArray(v) ? v.map(i => q.o[i]).filter(Boolean) : []) : q.o[v];
      });
      x.memoM = o.mm; x.memoF = o.mf; x.d = o.d;
      const a = shown(clean(x));
      if(!complete(a) || !a.d) return null;
      return { side: o.s, a };
    } catch(e){ return null; }
  }

  // ===== 두 답이 같은지 · 무엇이 바뀌었는지 =====
  const same = (x, y) => JSON.stringify(x == null ? null : x) === JSON.stringify(y == null ? null : y);
  function diff(oldA, newA){
    const o = shown(oldA), n = shown(newA), ids = [];
    ALL.forEach(id => { if(!same(o[id], n[id])) ids.push(id); });
    if(!same(o.memoM || "", n.memoM || "") && !ids.includes("skinM")) ids.push("skinM");
    if(!same(o.memoF || "", n.memoF || "") && !ids.includes("skinF")) ids.push("skinF");
    return ids;
  }

  // ===== 양가 비교: 맞춰 볼 것 =====
  // 결과: [{ k, lv: "ok" | "warn" | "info", ... }] — 문구는 화면(text.js)에서 붙여요
  const momSide = a => a.who === "both" || a.who === "m";
  const TRAD_OFF = { g: ["pink", "red"], b: ["blue"] };   // 전통 배색(신랑 측 푸른 · 신부 측 분홍)과 반대인 1순위
  function compare(g, b){
    const out = [];
    if(momSide(g) && momSide(b)){
      out.push(g.wear === b.wear ? { k: "wearSame", lv: "ok", v: g.wear } : { k: "wearDiff", lv: "warn" });
      const g1 = g.color[0], b1 = b.color[0];
      out.push(g1 === b1 ? { k: "colorSame", lv: "warn", fam: g1 } : { k: "colorDiff", lv: "ok", g: g.color, b: b.color });
      out.push({ k: "colorTrad", lv: "info", off: TRAD_OFF.g.includes(g1) || TRAD_OFF.b.includes(b1) });
      out.push(g.tone === b.tone ? { k: "toneSame", lv: "ok", v: g.tone } : { k: "toneDiff", lv: "warn", g: g.tone, b: b.tone });
      if(g.wear === "hanbok" && b.wear === "hanbok")
        out.push(g.point === b.point ? { k: "pointSame", lv: "info", v: g.point } : { k: "pointDiff", lv: "info", g: g.point, b: b.point });
    }
    const sh = shopCheck(g, b); if(sh) out.push(sh);
    if(momSide(g) && momSide(b)) out.push({ k: "hairBoth", lv: "info", g: g.hair, b: b.hair });
    return out;
  }
  function shopCheck(g, b){
    const own = s => ["usual", "self"].includes(s.place);
    if(!g.place || !b.place) return null;
    if(own(g) || own(b)){ const side = own(g) ? "g" : "b"; return { k: "shopOwn", lv: "info", side, v: (own(g) ? g : b).place }; }
    if(!g.share || !b.share) return null;
    if(g.share === "apart" || b.share === "apart") return { k: "shopApart", lv: "info", side: g.share === "apart" ? (b.share === "apart" ? "gb" : "g") : "b" };
    if(g.share === "room" || b.share === "room") return { k: "shopRoom", lv: "info", side: g.share === "room" ? (b.share === "room" ? "gb" : "g") : "b" };
    return { k: "shopSame", lv: "ok" };
  }

  const CORE = { FAMS, TONES, PAL, Q, MOM, DAD, ALL, list, most, answered, nextOpen, complete, started, clean, cleanMemo, shown, encode, decode, diff, compare, same };
  if(typeof module !== "undefined" && module.exports) module.exports = CORE; else root.CORE = CORE;
})(typeof window !== "undefined" ? window : globalThis);
