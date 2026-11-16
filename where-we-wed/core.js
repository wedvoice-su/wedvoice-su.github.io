// 웨딩홀 투어 기록표 — 계산 (화면 없이도 돌아가요: node에서 시험할 수 있게 DOM을 쓰지 않아요)
// 하는 일: 숫자 읽기 · 금액 모양 · 홀 한 곳의 예상 총액 · 견적서 총액 맞춰 보기 · 홀 차례 · "다른 것만"
// 화면은 app.js, 문구 · 질문 목록은 text.js. 셈 구조의 근거는 docs/웨딩홀-투어/조사/2-후기-후회.md 2-4
(function(root){
  const MAN = 10000;

  // 글에서 숫자만: 쉼표 · 공백 · 단위 글자를 떼요. 못 읽으면 null
  function num(v){
    if(typeof v === "number") return isFinite(v) && v >= 0 ? v : null;
    if(v == null) return null;
    const s = String(v).replace(/[,\s]/g, "").replace(/[^0-9.]/g, "");
    if(!s || s === ".") return null;
    const n = parseFloat(s);
    return isFinite(n) && n >= 0 ? n : null;
  }
  const comma = n => Math.round(n).toLocaleString("en-US");
  const commaDec = n => (Number.isInteger(n) ? comma(n) : String(Math.round(n * 10) / 10));
  // 원 → "2,480만 원" / "1억 2,480만 원" / "8,500원" (만 원 아래는 반올림해서 만 단위로, 1만 원이 안 되면 원 그대로)
  function wonShort(won){
    if(won == null || !isFinite(won)) return "";
    const neg = won < 0; let w = Math.abs(Math.round(won));
    if(w < MAN) return (neg ? "-" : "") + comma(w) + "원";
    let man = Math.round(w / MAN);
    const eok = Math.floor(man / 10000); man = man % 10000;
    return (neg ? "-" : "") + (eok ? eok + "억" + (man ? " " : "") : "") + (man ? comma(man) + "만" : "") + " 원";
  }
  const wonFull = won => (won == null || !isFinite(won) ? "" : comma(won) + "원");
  // 치는 동안 읽어 주는 글: 65000 → "6만 5,000원", 24800000 → "2,480만 원", 120000000 → "1억 2,000만 원"
  function wonKo(won){
    if(won == null || !isFinite(won)) return "";
    let w = Math.round(Math.abs(won));
    if(w < MAN) return comma(w) + "원";
    const rest = w % MAN; let man = Math.floor(w / MAN);
    const eok = Math.floor(man / 10000); man = man % 10000;
    const parts = [];
    if(eok) parts.push(eok + "억");
    if(man) parts.push(comma(man) + "만");
    return parts.join(" ") + (rest ? " " + comma(rest) + "원" : " 원");
  }

  // 답 하나를 보기 좋은 글로 (비교표 · 엑셀 · 글 복사에 같이 써요)
  function show(q, v){
    if(v == null || v === "") return "";
    if(q.kind === "man"){ const n = num(v); return n == null ? "" : wonShort(n * MAN); }
    if(q.kind === "won"){ const n = num(v); return n == null ? "" : wonFull(n); }
    if(q.kind === "num"){ const n = num(v); return n == null ? "" : commaDec(n) + (q.unit || ""); }
    if(q.kind === "pick"){ const o = (q.opts || []).find(x => x[0] === v); return o ? o[1] : ""; }
    if(q.kind === "multi"){ if(!Array.isArray(v)) return ""; return (q.opts || []).filter(o => v.includes(o[0])).map(o => o[1]).join(" · "); }
    return String(v).trim();
  }
  function has(q, v){ return show(q, v) !== ""; }

  // ===== 예상 총액 =====
  // a = 그 홀에 적은 답. guests = 같이 맞춰 볼 하객 수(없으면 그 홀의 보증 인원으로 셈해요)
  // 셈: 대관료 + 꽃 추가 + 필수 옵션 + 음료 · 주류(따로일 때) + 식대 × 사람 수 = 소계
  //     사람 수 = 하객 수와 보증 인원 가운데 큰 쪽. 보증 인원을 넘는 사람은 "초과 식대"가 있으면 그 값으로
  //     봉사료(따로일 때): 소계 또는 식대에만 % (안 적으면 전체 · 10%)
  //     부가세(따로일 때): 10%, 봉사료에도 붙는지(안 적으면 붙음)
  //     안 적은 것은 총액이 더 크게 나오는 쪽으로 셈하고 unknown에 알려요 — 예상보다 덜 나오는 편이 낫게.
  //     할인은 셈에 넣지 않아요: 할인된 금액으로 적게 해요(부가세 앞인지 뒤인지 견적서마다 달라서).
  const COST = ["rent", "meal", "guar", "over", "flowerType", "flower", "must", "drinkInc", "drink", "svc", "svcPct", "svcScope", "vat", "vatOnSvc"];
  function calc(a, guests){
    a = a || {};
    const n = k => num(a[k]);
    const meal = n("meal"), guar = n("guar"), over = n("over");
    const G = num(guests);
    const heads = G != null && G > 0 ? Math.max(G, guar || 0) : (guar || 0);
    const flowerOn = a.flowerType !== "base", drinkOn = a.drinkInc !== "all" && a.drinkInc !== "free";
    const fixed = [["rent", n("rent")], ["flower", flowerOn ? n("flower") : null], ["must", n("must")], ["drink", drinkOn ? n("drink") : null]];
    const lines = [];
    let sub = 0;
    for(const [k, v] of fixed) if(v != null && v > 0){ lines.push({ k, won: v * MAN }); sub += v * MAN; }
    let mealWon = 0, extraHeads = 0;
    if(meal != null && heads > 0){
      const base = guar != null && guar > 0 ? Math.min(heads, guar) : heads;
      extraHeads = heads - base;
      const overUnit = over != null && over > 0 ? over : meal;
      mealWon = meal * base + overUnit * extraHeads;
      lines.push({ k: "meal", won: mealWon, heads, base, extraHeads, unit: meal, overUnit });
      sub += mealWon;
    }
    const unknown = [];
    let total = sub, svcWon = 0;
    if(!a.svc) unknown.push("svc");
    if(a.svc === "add"){
      let pct = n("svcPct"); if(pct == null){ pct = 10; unknown.push("svcPct"); }
      if(!a.svcScope) unknown.push("svcScope");
      const onMeal = a.svcScope === "meal";
      svcWon = Math.round((onMeal ? mealWon : sub) * pct / 100);
      if(svcWon > 0) lines.push({ k: "svc", won: svcWon, pct, onMeal });
      total += svcWon;
    }
    if(!a.vat) unknown.push("vat");
    if(a.vat === "add"){
      if(a.svc === "add" && !a.vatOnSvc) unknown.push("vatOnSvc");
      const onSvc = a.svc === "add" ? a.vatOnSvc !== "no" : true;
      const t = Math.round((sub + (onSvc ? svcWon : 0)) * 0.1);
      lines.push({ k: "vat", won: t, pct: 10, onSvc: a.svc === "add" && onSvc });
      total += t;
    }
    // 총액을 내려면 식대와 사람 수(보증 인원 또는 하객 수)가 있어야 해요. 없으면 "더 적어야 하는 것"을 알려 줘요.
    const need = [];
    if(meal == null) need.push("meal");
    if(!(heads > 0)) need.push("guar");
    const ok = need.length === 0;
    return { ok, need, unknown, total: ok ? total : null, sub, lines, heads, guar: guar || 0, guests: G != null && G > 0 ? G : null,
             under: G != null && guar != null && G < guar, perHead: ok && heads > 0 ? Math.round(total / heads) : null, split: a.guarSplit === "each" };
  }

  // 견적서 총액과 맞춰 보기: 견적서는 보통 보증 인원으로 셈해요 → 하객 수 대신 보증 인원으로 셈한 값과 비교
  // 만 원 단위로 적으니 1만 원 안쪽 차이는 같다고 봐요.
  function quoteCheck(a){
    const q = num((a || {}).quoteTotal);
    if(q == null) return null;
    const c = calc(a, null);
    if(!c.ok) return { ok: false, quote: q * MAN };
    const d = c.total - q * MAN;
    return { ok: true, quote: q * MAN, calc: c.total, heads: c.heads, diff: d, same: Math.abs(d) < MAN };
  }

  function starAvg(hall, keys){
    let s = 0, c = 0;
    for(const k of keys){ const v = +((hall.star || {})[k]) || 0; if(v > 0){ s += v; c++; } }
    return c ? Math.round(s / c * 10) / 10 : null;
  }

  // ===== 홀 차례 =====
  function sortHalls(halls, how, guests, starKeys){
    const arr = halls.slice();
    if(how === "total"){
      const t = h => { const c = calc(h.a, guests); return c.ok ? c.total : Infinity; };
      arr.sort((x, y) => t(x) - t(y) || x.id - y.id);
    } else if(how === "star"){
      const t = h => { const v = starAvg(h, starKeys); return v == null ? -1 : v; };
      arr.sort((x, y) => t(y) - t(x) || x.id - y.id);
    } else arr.sort((x, y) => x.id - y.id);
    return arr;
  }

  // 비교표에서 "다른 것만" 볼 때: 홀마다 값이 다르면 true (모두 비었으면 false)
  function differs(vals){
    const s = vals.map(v => String(v == null ? "" : v).trim());
    if(s.every(v => v === "")) return false;
    return s.some(v => v !== s[0]);
  }

  const api = { MAN, num, comma, wonShort, wonFull, wonKo, show, has, calc, quoteCheck, COST, starAvg, sortHalls, differs };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WW = api;
})(typeof window !== "undefined" ? window : globalThis);
