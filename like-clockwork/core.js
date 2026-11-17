// 결혼식 당일 타임테이블 ㊽ · 계산만 (화면 없음)
// 시각은 모두 "그날 0시부터 몇 분"으로 셉니다. 예: 13:00 = 780
// 근거: docs/당일-타임테이블/조사/조사.md (기본값마다 출처) · 사회자님 11/17 (예식 30분 · 원판 30분 · 연회장 인사 1시간~ · 폐백 없음)
const CORE = (() => {
  // 고칠 수 있는 시간 (분): 기본값 · 최소 · 최대 · 한 번 누를 때
  const KNOBS = {
    "b.ready": { def: 60,  min: 0,  max: 240, step: 10 },  // 신부: 일어나서 집 나서기까지
    "b.home":  { def: 30,  min: 0,  max: 300, step: 5 },   // 신부: 집 → 헤메샵
    "b.early": { def: 10,  min: 0,  max: 60,  step: 5 },   // 신부: 샵 예약 시각보다 일찍 도착
    "b.shop":  { def: 180, min: 60, max: 360, step: 10 },  // 신부: 헤어 · 메이크업 · 드레스
    "g.ready": { def: 60,  min: 0,  max: 240, step: 10 },
    "g.home":  { def: 30,  min: 0,  max: 300, step: 5 },
    "g.early": { def: 10,  min: 0,  max: 60,  step: 5 },
    "g.shop":  { def: 90,  min: 20, max: 240, step: 10 },  // 신랑: 헤어 · 메이크업 (샵 아웃에 맞춰 끝)
    "toHall":  { def: 30,  min: 0,  max: 300, step: 5 },   // 헤메샵 → 웨딩홀
    "arrive":  { def: null, min: 20, max: 240, step: 10 }, // 웨딩홀 도착: 예식 몇 분 전 (null = 예식 간격 + 30분)
    "greet":   { def: 30,  min: 0,  max: 120, step: 5 },   // 하객 맞이 · 리허설: 예식 몇 분 전
    "ceremony":{ def: 30,  min: 10, max: 120, step: 5 },   // 예식
    "photo":   { def: 30,  min: 0,  max: 90,  step: 5 },   // 원판 촬영
    "banquet": { def: 60,  min: 0,  max: 240, step: 10 }   // 연회장 인사 (1시간~)
  };
  const SLOTS = [60, 70, 80, 90, 120];   // 예식 간격(대관 시간)
  const SLOT_DEF = 60;
  const ARRIVE_PLUS = 30;               // 웨딩홀 도착 = 예식 − (예식 간격 + 30분)
  const EARLY_FEE = 6 * 60;             // 이 시각 전 시작이면 얼리 스타트 비용이 붙는 샵이 많아요
  const TOO_EARLY = 5 * 60;             // 이 시각 전에는 진행하지 않는 샵도 있어요
  const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  function blankKnobs(){ const k = {}; Object.keys(KNOBS).forEach(x => { k[x] = KNOBS[x].def; }); return k; }
  function blank(){ return { v: 1, date: "", time: "", slot: SLOT_DEF, together: false, k: blankKnobs() }; }
  function int(v){ v = parseInt(v, 10); return isNaN(v) ? null : v; }
  function clampKnob(key, v){
    const d = KNOBS[key]; if(!d) return null;
    v = int(v);
    if(v == null) return d.def;
    return Math.max(d.min, Math.min(d.max, v));
  }
  function validTime(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return !!m && +m[1] < 24 && +m[2] < 60; }
  function validDate(d){ return /^\d{4}-\d{2}-\d{2}$/.test(d || ""); }
  function clean(x){
    if(!x || typeof x !== "object" || x.v !== 1) return null;
    const b = blank();
    b.date = validDate(x.date) ? x.date : "";
    b.time = validTime(x.time) ? x.time : "";
    b.slot = SLOTS.includes(x.slot) ? x.slot : (int(x.slot) && int(x.slot) >= 30 && int(x.slot) <= 180 ? int(x.slot) : SLOT_DEF);
    b.together = x.together === true;
    const k = x.k && typeof x.k === "object" ? x.k : {};
    Object.keys(KNOBS).forEach(key => {
      if(key === "arrive") b.k.arrive = k.arrive == null ? null : clampKnob("arrive", k.arrive);
      else b.k[key] = key in k ? clampKnob(key, k[key]) : KNOBS[key].def;
    });
    return b;
  }

  function parseHM(t){ const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  const pad2 = n => String(n).padStart(2, "0");
  function hm(h, m){ return pad2(h) + ":" + pad2(m); }
  // 06:20 처럼. 0시 전으로 넘어가면 prev = true (전날)
  function clock(m){
    const prev = m < 0, x = ((m % 1440) + 1440) % 1440;
    return { t: pad2(Math.floor(x / 60)) + ":" + pad2(x % 60), prev };
  }
  // "오후 1시 20분"
  function korTime(m){
    const x = ((m % 1440) + 1440) % 1440, h = Math.floor(x / 60), mm = x % 60;
    return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시${mm ? ` ${mm}분` : ""}`;
  }
  // "1시간 30분" · "30분" · "0분"
  function dur(n){
    const h = Math.floor(n / 60), m = n % 60;
    if(!h) return m + "분";
    return h + "시간" + (m ? " " + m + "분" : "");
  }
  function korDate(d){
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if(!m) return "";
    const dt = new Date(+m[1], +m[2] - 1, +m[3]), w = "일월화수목금토"[dt.getDay()];
    return `${+m[2]}월 ${+m[3]}일 (${w})`;
  }

  function arriveOf(s){ return s.k.arrive == null ? s.slot + ARRIVE_PLUS : s.k.arrive; }

  // 거꾸로 계산: 예식 → 웨딩홀 도착 → 샵 출발 → 샵 시작 → 샵 도착 → 집 출발 → 일어나기
  function calc(s){
    const T = parseHM(s.time);
    if(T == null) return null;
    const k = s.k, arrive = arriveOf(s);
    const hall = T - arrive;
    const out = hall - k.toHall;
    const bStart = out - k["b.shop"];
    const bShop = bStart - k["b.early"];
    const bLeave = bShop - k["b.home"];
    const bWake = bLeave - k["b.ready"];
    const gStart = out - k["g.shop"];
    let gShop, gLeave, gWake;
    if(s.together){ gShop = bShop; gLeave = bLeave; gWake = bWake; }
    else { gShop = gStart - k["g.early"]; gLeave = gShop - k["g.home"]; gWake = gLeave - k["g.ready"]; }
    const room = Math.max(T - s.slot, hall);       // 신부대기실 · 사진 촬영: 앞 예식이 시작할 때부터 (도착보다 이르면 도착 시각)
    const greet = Math.max(T - k.greet, hall);     // 하객 맞이 · 리허설
    const cerEnd = T + k.ceremony;
    const photoEnd = cerEnd + k.photo;
    const end = photoEnd + k.banquet;
    const warn = [];
    if(bStart < TOO_EARLY) warn.push("tooEarly");
    else if(bStart < EARLY_FEE) warn.push("earlyFee");
    if(k.ceremony + k.photo > s.slot) warn.push("slotShort");
    if(s.together && gStart < gShop) warn.push("groomBefore");
    return { T, arrive, hall, out, bStart, bShop, bLeave, bWake, gStart, gShop, gLeave, gWake, room, greet, cerEnd, photoEnd, end, warn,
      autoArrive: s.k.arrive == null };
  }

  return { KNOBS, SLOTS, SLOT_DEF, ARRIVE_PLUS, EARLY_FEE, TOO_EARLY, HOURS, MINS,
    blank, clean, clampKnob, parseHM, hm, clock, korTime, korDate, dur, arriveOf, calc, validTime, validDate };
})();
if(typeof module !== "undefined") module.exports = CORE;
