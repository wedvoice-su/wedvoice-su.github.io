// 보증 인원 계산기 ㉑ — 셈 (화면 없이도 돌아가요: node에서 시험할 수 있게 DOM을 쓰지 않아요)
// 하는 일: 모임 줄 목록 · 한 칸(몫)의 예상 식사 인원 · 양가 · 합계 · 보증 인원 추천 · 부모님 링크 주고받기
// 화면은 app.js, 문구는 text.js. 셈 근거는 docs/보증-인원/조사/조사-정리.md 6절, 정한 것은 docs/보증-인원/기획.md
(function(root){
  // 사이(얼마나 오실지)별 비율 [적게, 많이] — 업체 글 1 · 0.8 · 0.5, 후기 0.9 · 70% (사회자님 11/16 "추천대로")
  const TIERS = ["must", "likely", "half"];
  const W = { must: [0.9, 1.0], likely: [0.7, 0.8], half: [0.5, 0.5] };
  // 같이 오는 사람: 대부분 혼자 · 절반쯤 · 거의 다 → 10분 중 1 · 5 · 9분이 한 사람씩 더 (사회자님 11/16 "더 구체적으로")
  const COMP = [1.1, 1.5, 1.9];
  const SPARES = [10, 15, 20];   // 예식장 여유분 % (후기 10~20%, 기본 10)
  const MAXN = 999;

  // 칸(몫) 네 개: 신랑 · 신부 손님은 couple, 양가 부모님 손님은 parents
  const POCKETS = ["groom", "bride", "gp", "bp"];
  const KIND = { groom: "couple", bride: "couple", gp: "parents", bp: "parents" };
  const SIDE_OF = { groom: "g", gp: "g", bride: "b", bp: "b" };

  // 모임 줄 (k = 저장 이름, t = 기본 사이, kin = 어른 · 아이를 사람 수로, direct = 사람 수 그대로)
  const ROWS = {
    couple: [
      { k: "fc", t: "must" },     // 가까운 친구
      { k: "fs", t: "likely" },   // 학교 동창
      { k: "fu", t: "likely" },   // 대학 · 동아리
      { k: "wt", t: "likely" },   // 직장 같은 팀
      { k: "wo", t: "half" },     // 직장 다른 팀
      { k: "wp", t: "half" },     // 전 직장
      { k: "cl", t: "half" },     // 모임 · 동호회
      { k: "rl", t: "likely" },   // 종교 모임
      { k: "et", t: "half" }      // 그 밖에
    ],
    parents: [
      { k: "kf", t: "must", kin: true },      // 친척 · 아버지 쪽
      { k: "km", t: "must", kin: true },      // 친척 · 어머니 쪽
      { k: "bus", t: "must", direct: true },  // 대절버스로 오실 분
      { k: "ff", t: "likely" },   // 아버지 친구 · 동창
      { k: "fm", t: "likely" },   // 어머니 친구 · 동창
      { k: "wf", t: "likely" },   // 아버지 직장
      { k: "wm", t: "likely" },   // 어머니 직장
      { k: "rl", t: "likely" },   // 종교 모임
      { k: "tn", t: "half" },     // 동네 · 이웃
      { k: "hb", t: "half" },     // 취미 · 운동 모임
      { k: "bz", t: "half" },     // 사업 · 거래처
      { k: "et", t: "half" }      // 그 밖에
    ]
  };
  const rowDef = (kind, k) => ROWS[kind].find(r => r.k === k);

  // ===== 숫자 다루기 =====
  function int(v, max){
    const n = typeof v === "number" ? Math.floor(v) : Math.floor(Number(String(v == null ? "" : v).replace(/[^0-9]/g, "")));
    if(!isFinite(n) || n < 0) return 0;
    return Math.min(n, max == null ? MAXN : max);
  }
  const comma = n => Math.round(n).toLocaleString("en-US");
  // 원 → "8만 원" · "1,840만 원" · "62만 4,000원" · "1억 2,000만 원"
  function won(w){
    if(w == null || !isFinite(w)) return "";
    w = Math.round(Math.abs(w));
    if(w < 10000) return comma(w) + "원";
    const rest = w % 10000; let man = Math.floor(w / 10000);
    const eok = Math.floor(man / 10000); man = man % 10000;
    const parts = [];
    if(eok) parts.push(eok + "억");
    if(man) parts.push(comma(man) + "만");
    return parts.join(" ") + (rest ? " " + comma(rest) + "원" : " 원");
  }

  // ===== 빈 칸 · 정리 =====
  function blankPocket(kind){
    const rows = {};
    ROWS[kind].forEach(r => { rows[r.k] = r.kin ? { n: 0, c: 0, t: r.t } : { n: 0, t: r.t }; });
    return { rows, extra: [], seq: 0, comp: null, first: null, prev: null, from: "" };
  }
  // 저장 · 링크에서 읽은 것을 믿지 않고 모양을 맞춰요
  function cleanPocket(kind, p){
    const b = blankPocket(kind);
    if(!p || typeof p !== "object") return b;
    const rows = p.rows && typeof p.rows === "object" ? p.rows : {};
    ROWS[kind].forEach(r => {
      const x = rows[r.k]; if(!x || typeof x !== "object") return;
      b.rows[r.k].n = int(x.n);
      if(r.kin) b.rows[r.k].c = int(x.c);
      if(TIERS.includes(x.t)) b.rows[r.k].t = x.t;
    });
    b.extra = (Array.isArray(p.extra) ? p.extra : []).slice(0, 12).map((x, i) => ({
      id: +x.id > 0 ? Math.floor(+x.id) : i + 1,
      label: String(x.label == null ? "" : x.label).replace(/[\u0000-\u001f]/g, "").slice(0, 20),
      n: int(x.n),
      t: TIERS.includes(x.t) ? x.t : "half"
    }));
    b.seq = Math.max(int(p.seq, 1e6), ...b.extra.map(x => x.id), 0);
    b.comp = [0, 1, 2].includes(p.comp) ? p.comp : null;
    if(kind === "parents"){
      b.first = p.first === true || p.first === false ? p.first : null;
      b.prev = p.prev == null || p.prev === "" ? null : int(p.prev, 9999);
    }
    b.from = p.from === "parents" ? "parents" : "";
    return b;
  }

  // ===== 한 칸의 셈 =====
  // inv = 알릴 분(사람 수: 모임 줄 + 친척 어른 · 아이 + 버스), lo · hi = 예상 식사 인원 적게 · 많이, kidsLo · kidsHi = 그중 어린이
  function calcPocket(kind, p){
    let inv = 0, lo = 0, hi = 0, kLo = 0, kHi = 0, mates = 0;
    const m = COMP[p.comp == null ? 0 : p.comp];
    ROWS[kind].forEach(r => {
      const x = p.rows[r.k], w = W[x.t] || W.half;
      if(r.kin){
        const people = x.n + x.c;
        inv += people; lo += people * w[0]; hi += people * w[1]; kLo += x.c * w[0]; kHi += x.c * w[1];
      } else if(r.direct){
        inv += x.n; lo += x.n * w[0]; hi += x.n * w[1];
      } else {
        inv += x.n; mates += x.n; lo += x.n * w[0] * m; hi += x.n * w[1] * m;
      }
    });
    p.extra.forEach(x => {
      const w = W[x.t] || W.half;
      inv += x.n; mates += x.n; lo += x.n * w[0] * m; hi += x.n * w[1] * m;
    });
    return { inv, mates, lo: Math.round(lo), hi: Math.round(hi), kidsLo: Math.round(kLo), kidsHi: Math.round(kHi), filled: inv > 0, compSet: p.comp != null };
  }

  // 보증 인원 추천: 적게 쪽, 다만 많이 오면 여유분 안에 들어오게 (사회자님 11/16 "yes")
  function recommend(lo, hi, spare){
    if(hi <= 0) return 0;
    const s = SPARES.includes(spare) ? spare : 10;
    return Math.max(lo, Math.ceil(hi / (1 + s / 100) - 1e-9));
  }

  // 네 칸 전부: 칸별 · 양가별 · 합계 + 추천
  function calcAll(S){
    const P = {}; POCKETS.forEach(k => { P[k] = calcPocket(KIND[k], S.p[k]); });
    const sum = keys => keys.reduce((a, k) => ({
      inv: a.inv + P[k].inv, lo: a.lo + P[k].lo, hi: a.hi + P[k].hi, kidsLo: a.kidsLo + P[k].kidsLo, kidsHi: a.kidsHi + P[k].kidsHi
    }), { inv: 0, lo: 0, hi: 0, kidsLo: 0, kidsHi: 0 });
    const g = sum(["groom", "gp"]), b = sum(["bride", "bp"]), all = sum(POCKETS);
    const sp = S.hall && SPARES.includes(S.hall.spare) ? S.hall.spare : 10;
    g.rec = recommend(g.lo, g.hi, sp); b.rec = recommend(b.lo, b.hi, sp); all.rec = recommend(all.lo, all.hi, sp);
    const missing = POCKETS.filter(k => !P[k].filled);
    return { P, g, b, all, spare: sp, missing };
  }

  // 예식장 숫자(선택): 1인 식대 · 최소 보증 인원
  function hallNote(all, hall){
    const price = hall && hall.price > 0 ? hall.price : 0;
    const min = hall && hall.min > 0 ? hall.min : 0;
    const out = { price, min };
    if(price && all.rec){ out.total = all.rec * price; out.ten = 10 * price; }
    if(min && all.rec){
      out.over = Math.max(0, min - all.rec);         // 홀 최소가 추천보다 몇 명 많은지
      out.waste = Math.max(0, min - all.lo);         // 적게 오면 빈자리 몇 명분
      if(price) out.wasteWon = out.waste * price;
    }
    return out;
  }

  // ===== 부모님 링크 주고받기 =====
  // 링크 안에 답을 담아요(서버 없음). 모양: base64url(JSON) — 이름은 안 담겨요(모임 이름만)
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
  // side: "g"(신랑 부모님) · "b"(신부 부모님)
  function encodeAnswer(side, p){
    const r = {};
    ROWS.parents.forEach(d => {
      const x = p.rows[d.k]; const ti = TIERS.indexOf(x.t);
      if(x.n || (d.kin && x.c) || x.t !== d.t) r[d.k] = d.kin ? [x.n, ti, x.c] : [x.n, ti];
    });
    const o = { v: 1, s: side, r, x: p.extra.filter(x => x.n || x.label).map(x => [x.label, x.n, TIERS.indexOf(x.t)]) };
    if(p.comp != null) o.c = p.comp;
    if(p.first != null) o.f = p.first ? 1 : 0;
    if(p.prev != null) o.p = p.prev;
    return b64e(JSON.stringify(o));
  }
  function decodeAnswer(code){
    try {
      const o = JSON.parse(b64d(code));
      if(!o || o.v !== 1 || (o.s !== "g" && o.s !== "b")) return null;
      const p = blankPocket("parents");
      const r = o.r && typeof o.r === "object" ? o.r : {};
      ROWS.parents.forEach(d => {
        const a = r[d.k]; if(!Array.isArray(a)) return;
        p.rows[d.k].n = int(a[0]);
        if(TIERS[a[1]]) p.rows[d.k].t = TIERS[a[1]];
        if(d.kin) p.rows[d.k].c = int(a[2]);
      });
      p.extra = (Array.isArray(o.x) ? o.x : []).slice(0, 12).map((a, i) => ({
        id: i + 1, label: String(a && a[0] != null ? a[0] : "").replace(/[\u0000-\u001f]/g, "").slice(0, 20),
        n: int(a && a[1]), t: TIERS[a && a[2]] || "half"
      }));
      p.seq = p.extra.length;
      p.comp = [0, 1, 2].includes(o.c) ? o.c : null;
      p.first = o.f === 1 ? true : o.f === 0 ? false : null;
      p.prev = o.p == null ? null : int(o.p, 9999);
      p.from = "parents";
      return { side: o.s, pocket: p };
    } catch(e){ return null; }
  }

  const CORE = { TIERS, W, COMP, SPARES, POCKETS, KIND, SIDE_OF, ROWS, rowDef, int, comma, won,
    blankPocket, cleanPocket, calcPocket, recommend, calcAll, hallNote, encodeAnswer, decodeAnswer };
  if(typeof module !== "undefined" && module.exports) module.exports = CORE; else root.CORE = CORE;
})(typeof window !== "undefined" ? window : globalThis);
