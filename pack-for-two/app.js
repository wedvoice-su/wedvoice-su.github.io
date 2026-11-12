// 신혼여행 짐 싸기 ㉞: 여행지 · 머무는 곳 · 출발 월 · 박 수 · 우리 여행 조건 → 그 달 날씨와 입국 규정에 맞춘 짐 체크리스트
// 기획 docs/사이트-아이디어.md 34 · 결정 docs/신혼여행-짐/사회자님-정할-것.md · 데이터 data.js (docs/신혼여행-짐/도구/build_site.py로 만듦) · 공통 기능 shared/common.js
// 체크 표시는 이 폰(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/pack-for-two/?preview)
const OPEN = false;
// =========================================================

// ===== 화면 문구 (문구를 바꾸려면 여기만 고치면 돼요) =====
const NAME = "신혼여행 짐 싸기";
const KEY = "pack-for-two.v1";
const CHECKED_TEXT = "2026년 11월";   // 자료를 마지막으로 확인한 때
const NOTICE_SHORT = `참고용이에요 · ${CHECKED_TEXT} 확인`;
const NOTICE_LONG = [
  `이 목록은 ${CHECKED_TEXT}에 정부·공공기관·관광청 같은 공식 자료를 먼저 보고 만든 참고용이에요.`,
  "입국 규정·관광세·반입 금지 물건·현지 사정은 갑자기 바뀔 수 있어요. 떠나기 전에 항목마다 붙은 공식 사이트에서 꼭 다시 확인하세요.",
  "날씨는 그 달의 30년 평균(평년값)이에요. 실제 날씨는 해마다 다르니, 출발 1주 전 일기예보로 한 번 더 맞춰 보세요.",
  "옷차림·수량은 흔히 쓰는 기준이라 정답이 아니에요. 두 분 일정과 취향에 맞게 고쳐 쓰세요 — 목록에서 빼고 더할 수 있어요.",
  "항목을 누르면 왜 넣었는지와 출처가 보여요."
];
const PRIVACY = "체크 표시는 이 폰에만 저장되고 어디로도 보내지 않아요.";
// 사회자 한마디 상자는 넣지 않아요 — 신혼여행 짐은 사회자 영역이 아니라서 (사회자님 기준, 2026-11-03)

const WHO = { each: "각자", share: "같이", bride: "신부", groom: "신랑", user: "쓰는 사람" };
const NEED = { must: "꼭", opt: "" };
// 우리 여행 조건 (4단계). def: 여행지별 처음 값
const OPTS = [
  { k: "swim", t: "바다·수영장에서 놀아요", d: "수영복·방수팩·물놀이 짐", def: d => !["italy", "spain"].includes(d) },
  { k: "after", t: "식 끝나고 바로 떠나요", d: "메이크업 지울 것, 웨딩카에 캐리어 싣기", def: () => true },
  { k: "snap", t: "허니문 스냅을 찍어요", d: "스냅 옷·삼각대, 촬영 금지 장소 안내", def: () => false },
  { k: "drive", t: "렌터카를 운전해요", d: "운전에 필요한 면허 서류", def: () => false },
  { k: "meds", t: "평소 먹는 약이 있어요", d: "처방전·기내 가방 약", def: () => false },
  { k: "lens", t: "안경·렌즈를 써요", d: "여분 안경·렌즈 세정액", def: () => false },
  { k: "smoke", t: "담배·전자담배를 피워요", d: "기내 규정, 가져가면 안 되는 나라", def: () => false }
];
// 흔히 쓰는 기온별 옷차림 (나무위키 등 여러 곳이 같은 경계 — 공식 기준 아님)
const WEAR = [[28, "민소매·반팔·반바지·린넨 옷"], [23, "반팔·얇은 셔츠·얇은 긴팔"], [20, "긴팔·얇은 가디건"], [17, "얇은 니트·얇은 재킷·바람막이"],
  [12, "재킷·가디건·맨투맨"], [9, "재킷·트렌치코트·니트"], [5, "코트·가죽 재킷·니트"], [-99, "패딩·두꺼운 코트·목도리·장갑"]];
const WEAR_SRC = ["W:wear-namu", "W:wear-daissong", "W:wear-everycalc"];
const UVL = ["", "낮음", "보통", "높음", "매우 높음", "위험"];
const RAIN_UP = 10;   // 비 온 날이 한 달에 이만큼 넘으면 우산·우비를 "꼭"으로 올려요 — 공식 기준이 아니라 이 사이트의 기준(3일에 한 번꼴)
const MON_NOW = (() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1 }; })();
const YEARS = [2026, 2027, 2028].filter(y => y >= MON_NOW.y);

// 한국 출발 비행기 규정 (공통 조사 4절, 공식 출처만)
const FLIGHT = [
  { t: "보조배터리는 기내 가방에만", b: "부치는 짐에 넣으면 안 돼요. 1인 2개까지(160Wh 이하, 100Wh 넘으면 항공사 승인). 기내에서는 충전도 사용도 안 돼요. 머리 위 선반에 두지 말고 몸에 지니거나 앞좌석 주머니에 둬요. 단자는 절연 테이프나 지퍼백으로 감싸요.", s: ["G01", "G02", "G05", "G06", "G09"] },
  { t: "액체는 100ml 용기 + 1L 지퍼백", b: "기내 가방에는 용기 하나 100ml 이하, 1인 1L 투명 지퍼백 1개까지예요. 치약·선크림·젤·고추장도 액체로 봐요. 면세품은 봉투를 안 뜯으면 괜찮아요.", s: ["G01", "G02", "G03"] },
  { t: "무선 고데기는 미리 확인", b: "배터리가 안 빠지는 건 대부분 못 가져가요(부치는 짐도 안 돼요). 배터리가 빠지면 배터리만 기내로 들고 카운터에서 승인을 받으세요. 항공사마다 조금씩 달라요.", s: ["G01", "G09", "V10", "V11", "V12", "V13"] },
  { t: "라이터·전자담배는 몸에", b: "라이터는 1인 1개 몸에 지녀요. 전자담배도 기내 가방에만, 기내 사용·충전은 안 돼요. 둘 다 부치는 짐에 넣으면 안 돼요.", s: ["G01", "G06", "G09"] },
  { t: "칼·가위", b: "칼은 길이와 상관없이 기내에 못 가져가요(부치는 짐은 가능). 가위는 날이 6cm 넘으면 부치는 짐에 넣어요.", s: ["G01", "G03"] },
  { t: "스프레이", b: "부치는 짐의 헤어스프레이·향수 같은 스프레이는 1개 500ml, 1인 2L까지예요. 불붙는 살충 스프레이는 못 가져가요.", s: ["G01", "G03", "G09"] },
  { t: "현금 1만 달러", b: "미화 1만 달러 넘게 가지고 나가면 세관에 신고해요.", s: ["G02", "G08"] }
];
// 모든 여행지에 같이 나오는 출국 전 할 일
const BEFORE_COMMON = [
  { id: "c-perk", title: "허니문 특전 조건 물어보기", body: "리조트마다 서류(혼인증명서·청첩장)와 기간·최소 박 수가 달라요. 예약할 때 특별 요청란에 허니문이라고 적고 물어보세요.", when: "숙소 예약할 때", who: "share", src: ["H01", "H02", "H03", "H04", "H07", "T07", "T08", "V27", "V28"] },
  { id: "c-car", title: "웨딩카 트렁크에 신혼여행 캐리어 싣기", body: "웨딩카 트렁크를 미리 비워 두고 캐리어를 실어 두면 식 끝나고 바로 공항으로 갈 수 있어요.", when: "결혼식 전날·당일 아침", who: "share", src: ["W05", "W06"], opt: "after" }
];
// (?) 설명 창
const HELP = {
  notice: { t: "이 목록을 볼 때 알아 둘 것", p: NOTICE_LONG },
  wear: { t: "옷차림은 이렇게 골랐어요", p: [
    "그 달 낮 최고·밤 최저 평균 기온을, 많이 쓰이는 ‘기온별 옷차림’ 표(8단계)에 맞춰 봤어요.",
    "이 표는 공식 기준이 아니라 흔히 쓰는 기준이에요. 기상청 같은 기관이 정한 옷차림 표는 없어요.",
    "낮과 밤이 다른 칸이면 벗고 입기 쉽게 겹쳐 입는 게 좋다고 흔히 말해요."
  ], s: WEAR_SRC },
  uv: { t: "자외선은 이렇게 봤어요", p: [
    "자외선 지수 3 이상이면 선크림·모자·선글라스, 6 이상이면 긴 소매 옷도, 8 이상이면 오전 10시~오후 3시 바깥 활동을 줄이라고 기상청·WHO가 안내해요.",
    "선크림은 2시간마다, 물에서 나오면 다시 발라요(식약처·CDC).",
    "여행지 자외선 값은 맑은 날 기준 평균이라 실제와 다를 수 있어요."
  ], s: ["W:kma-uv", "W:who-uv", "W:cdc-sun", "W:mfds-sun"] },
  rain: { t: "우산·우비는 이렇게 정했어요", p: [
    `그 달 비 온 날 평균이 ${RAIN_UP}일을 넘거나(3일에 한 번꼴), 여행지 공식 자료가 우기라고 하면 ‘꼭’으로 올려요.`,
    "이 숫자는 공식 기준이 아니라 이 사이트가 정한 기준이에요. 그보다 적어도 비는 올 수 있으니 접는 우산 하나는 있으면 좋아요.",
    "‘비 온 날’은 관측소마다 1mm 이상 또는 0.1mm 이상으로 세는 기준이 달라요."
  ], s: [] },
  sea: { t: "바닷물이 차가울 때", p: [
    "물 온도 21°C 아래에 오래 있으면 여름에도 저체온이 올 수 있어요(미국 해양대기청). 기온이 아니라 물 온도에 맞춰 입으라고 해요(미국 기상청).",
    "물놀이 업체에서 잠수복(웻슈트)을 빌려주는지 미리 물어보세요."
  ], s: ["W:noaa-water", "W:nws-cold"] },
  cold: { t: "추운 곳은 이렇게", p: [
    "얇은 옷을 여러 겹 입고, 장갑·목도리·모자와 바람 막는 겉옷을 챙기라고 질병관리청·CDC가 안내해요.",
    "몇 도부터 패딩인지는 공식 기준이 없어서, 흔히 쓰는 기온별 옷차림 표를 따랐어요."
  ], s: ["W:kdca-cold", "W:cdc-cold", ...WEAR_SRC] },
  qty: { t: "수량은 이렇게 셌어요", p: [
    "속옷·양말: 여행 일수 + 1 (여러 여행 안내가 비슷한 숫자를 줘요).",
    "상의는 일수의 절반쯤(중간에 한 번 빨래하면), 하의는 일주일에 2~3벌이 흔히 쓰는 숫자예요.",
    "모두 관행이라 정답이 아니에요. 여행 일수는 ‘박 + 1’로 셌어요."
  ], s: ["B04", "B08", "M01", "V30"] },
  flight: { t: "공항에서 걸리기 쉬운 것", p: ["한국에서 출발할 때 기준이에요. 항공사마다 조금씩 다를 수 있으니 예약한 항공사 안내를 한 번 더 보세요."], s: ["G01", "G02", "G03", "G09"] }
};

// ===== 저장 =====
function loadS(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function saveS(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const S = Object.assign({ trip: null, checks: {}, removed: {}, custom: {}, ui: { filter: "all", hideDone: false } }, loadS());
let draft = null;   // 고르는 중인 여행 조건
let editing = false;

// ===== 작은 도구 =====
function D(id){ return PACK.dest[id]; }
function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function r0(x){ return x == null ? "–" : Math.round(x); }
function srcOf(key, dest){
  if(key.startsWith("W:")){ const w = PACK.wsrc[key]; return w ? { name: w[0], url: w[1], grade: w[2] } : null; }
  if(dest && dest.sources && dest.sources[key]) return dest.sources[key];
  return PACK.csrc[key] || null;
}
function monthName(m){ return m + "월"; }
function tripText(t){ const d = D(t.d); return `${d.name} · ${t.y}년 ${t.m}월 · ${t.n}박`; }
function areaNames(t){ const d = D(t.d); return d.areas.filter(a => t.areas.includes(a.key)).map(a => a.short || a.label).join("·"); }
function wearOf(t){ for(const [lo, w] of WEAR) if(Math.round(t) >= lo) return w; return WEAR[WEAR.length - 1][1]; }
function wearIdx(t){ return WEAR.findIndex(([lo]) => Math.round(t) >= lo); }
function chk(on){ return `<span class="cb${on ? " on" : ""}" aria-hidden="true">${CHECK}</span>`; }
// 원칙 A1(11/12): 공식 출처 1곳뿐이면 딱지, 2순위 출처면 딱지
function oneTag(x){ return x.grade === "2순위" ? `<span class="one">참고 출처</span>` : x.single ? `<span class="one">공식 출처 1곳</span>` : ""; }
// 이슈 날짜 글("1/1~2, 1/30~2/1", "4/2~4·9~11", "갈룽안 1/13·8/11")에서 고른 달에 걸린 것만 골라요
function datesIn(str, m){
  const out = []; let cur = null, lab = "";
  for(const raw of String(str).split(/\s*[,·]\s*/)){
    const tok = raw.replace(/\(.*?\)/g, "").trim();
    const mm = [...tok.matchAll(/(\d{1,2})\/\d{1,2}/g)].map(x => +x[1]);
    let a, b, text = tok;
    if(mm.length){ const l = tok.slice(0, tok.search(/\d/)).trim(); if(l) lab = l + " "; else if(!/^\d/.test(tok)) lab = ""; a = mm[0]; b = mm[mm.length - 1]; cur = b; text = tok.replace(/^\D+/, ""); }
    else if(cur && /^\d{1,2}(~\d{1,2})?$/.test(tok)){ a = b = cur; text = `${cur}/${tok}`; }
    else continue;
    if(a <= b ? (m >= a && m <= b) : (m >= a || m <= b)) out.push(lab + text);
  }
  return out;
}
function linkOut(l){ return l && l.url ? `<a class="out" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "공식 사이트")} ↗</a>` : ""; }

// ===== 설명 창 (아래에서 올라오는 시트) =====
function openSheet(html, label){
  closeSheet();
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label || "설명");
  sh.innerHTML = html + `<button class="btn ghost" id="sheetX">닫기</button>`;
  document.body.appendChild(bg); document.body.appendChild(sh);
  bg.onclick = closeSheet; document.getElementById("sheetX").onclick = closeSheet;
  document.getElementById("sheetX").focus();
}
function closeSheet(){ ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); }); }
document.addEventListener("keydown", e => { if(e.key === "Escape") closeSheet(); });
function srcList(keys, dest){
  const list = (keys || []).map(k => srcOf(k, dest)).filter(Boolean);
  if(!list.length) return "";
  return `<p class="src-h">출처</p><ul class="src">${list.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.grade ? ` <span class="grade">${esc(s.grade)}</span>` : ""}${s.date ? ` <span class="sdate">${esc(s.date)}</span>` : ""}</li>`).join("")}</ul>`;
}
function openHelp(key, dest){
  const h = HELP[key]; if(!h) return;
  openSheet(`<h3>${esc(h.t)}</h3>${h.p.map(x => `<p>${esc(x)}</p>`).join("")}${srcList(h.s, dest)}`, h.t);
}
app.addEventListener("click", e => {
  const b = e.target.closest("[data-help]");
  if(b){ e.preventDefault(); openHelp(b.dataset.help, S.trip && D(S.trip.d)); }
});

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  const t = S.trip && D(S.trip.d) ? S.trip : null;
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>여행지 ${PACK.order.length}곳</span></div>
    ${brandLogo()}
    <p class="for">식 끝나고 바로 떠나는 신혼부부를 위한</p>
    <h1>신혼여행 짐,<br>다 쌌어요?</h1>
    <div class="bar"></div>
    <p class="lead">여행지·출발 월·박 수만 고르면, 그 달 날씨와 입국 규정까지 맞춘 짐 체크리스트를 만들어 드려요.</p>
    <div class="pick">
      ${t ? `<button id="resume"><span>이어서 보기</span><span class="q">${esc(tripText(t))}</span></button>` : ""}
      <button id="start"><span>${t ? "새로 만들기" : "짐 목록 만들기"}</span><span class="q">1분</span></button>
    </div>
    <p class="note">※ 모든 정보는 참고용이에요. ${CHECKED_TEXT}에 공식 자료로 확인했지만 입국 규정과 현지 사정은 바뀔 수 있으니, 떠나기 전 공식 사이트에서 다시 확인하세요.</p>
    <p class="note">${PRIVACY}</p>
    ${foot()}`;
  document.getElementById("start").onclick = () => { draft = null; stepDest(); };
  const r = document.getElementById("resume"); if(r) r.onclick = () => result(true);
}

// ===== 고르기 단계 =====
function stepHead(n, total, title, sub){
  return `<div class="top"><button class="text-btn back" id="back" aria-label="이전 단계로">← 이전</button><span class="count">${n} / ${total}</span></div>
    <h2 class="q-title">${title}</h2>${sub ? `<p class="q-sub">${sub}</p>` : ""}`;
}
function totalSteps(){ return draft && D(draft.d) && D(draft.d).areas.length > 1 ? 4 : 3; }

function stepDest(){
  plain();
  app.innerHTML = `${stepHead(1, draft ? totalSteps() : 4, "어디로 떠나요?", "한국 신혼부부가 많이 가는 6곳이에요.")}
    <div class="dests">${PACK.order.map(id => { const d = D(id); return `<button class="dest${draft && draft.d === id ? " on" : ""}" data-d="${id}"><b>${nameHtml(d.name)}</b><span>${esc((d.tagline || "").split(" · ")[0])}</span></button>`; }).join("")}</div>
    <p class="note small">다른 여행지는 조사가 끝나는 대로 더할게요.</p>
    ${foot()}`;
  document.getElementById("back").onclick = home;
  app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    const id = b.dataset.d, d = D(id);
    if(!draft || draft.d !== id){
      const keep = draft || (S.trip ? S.trip : null);
      draft = {
        d: id,
        areas: d.areas.filter(a => a.default).map(a => a.key),
        y: keep ? keep.y : nextMonth().y, m: keep ? keep.m : nextMonth().m, n: keep ? keep.n : 5,
        o: Object.fromEntries(OPTS.map(o => [o.k, o.def(id)]))
      };
      if(!draft.areas.length) draft.areas = [d.areas[0].key];
    }
    d.areas.length > 1 ? stepArea() : stepWhen();
  });
}
function nameHtml(n){ const m = String(n).match(/^(.*?)\s*(\(.+\))$/); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(n); }
function nextMonth(){ let { y, m } = MON_NOW; m++; if(m > 12){ m = 1; y++; } return { y, m }; }

function stepArea(){
  plain();
  const d = D(draft.d);
  const draw = () => {
    app.innerHTML = `${stepHead(2, 4, esc((d.areaQuestion || "어디에 머무세요?").replace(/\s*\(.*\)\s*$/, "")), "여러 곳을 골라도 돼요. 날씨는 곳마다 보여 주고, 짐은 가장 덥고 추운 곳에 맞춰요.")}
      <div class="list">${d.areas.map(a => { const on = draft.areas.includes(a.key); return `<button class="row-btn${on ? " on" : ""}" data-a="${a.key}" role="checkbox" aria-checked="${on}">${chk(on)}<span class="rb-t"><b>${esc(a.label)}</b>${a.note ? `<span>${esc(a.note)}</span>` : ""}</span></button>`; }).join("")}</div>
      <p class="msg" id="msg"></p>
      <div class="btns sticky-go"><button class="btn main" id="next">다음</button></div>`;
    document.getElementById("back").onclick = stepDest;
    app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
      const k = b.dataset.a, i = draft.areas.indexOf(k);
      i < 0 ? draft.areas.push(k) : draft.areas.splice(i, 1);
      draw();
    });
    document.getElementById("next").onclick = () => {
      if(!draft.areas.length){ document.getElementById("msg").textContent = "한 곳 이상 골라 주세요."; return; }
      stepWhen();
    };
  };
  draw();
}

function stepWhen(){
  plain();
  const d = D(draft.d), multi = d.areas.length > 1, n = multi ? 3 : 2, tot = totalSteps();
  const past = (y, m) => y < MON_NOW.y || (y === MON_NOW.y && m < MON_NOW.m);
  if(past(draft.y, draft.m)){ const nm = nextMonth(); draft.y = nm.y; draft.m = nm.m; }
  if(!YEARS.includes(draft.y)) draft.y = YEARS[0];
  const draw = () => {
    app.innerHTML = `${stepHead(n, tot, "언제, 며칠 떠나요?", "출발하는 달의 날씨로 짐을 골라요.")}
      <div class="panel">
        <p class="lbl">출발 연도</p>
        <div class="seg">${YEARS.map(y => `<button class="sg${draft.y === y ? " on" : ""}" data-y="${y}" aria-pressed="${draft.y === y}">${y}년</button>`).join("")}</div>
        <p class="lbl">출발 월</p>
        <div class="months">${Array.from({ length: 12 }, (_, i) => i + 1).map(m => { const off = past(draft.y, m); return `<button class="mo${draft.m === m ? " on" : ""}" data-m="${m}" ${off ? "disabled" : ""} aria-pressed="${draft.m === m}">${m}월</button>`; }).join("")}</div>
        <p class="lbl">며칠 밤 자요?</p>
        <div class="stepper">
          <button class="st" id="minus" aria-label="하룻밤 줄이기" ${draft.n <= 2 ? "disabled" : ""}>−</button>
          <span class="st-v"><b>${draft.n}박</b><span>여행 ${draft.n + 1}일로 셀게요</span></span>
          <button class="st" id="plus" aria-label="하룻밤 늘리기" ${draft.n >= 14 ? "disabled" : ""}>+</button>
        </div>
      </div>
      <p class="note small">날씨는 그 달의 30년 평균(평년값)이라 참고용이에요. 비행기에서 자는 밤은 빼고 숙소에서 자는 밤만 세면 돼요.</p>
      <div class="btns sticky-go"><button class="btn main" id="next">다음</button></div>`;
    document.getElementById("back").onclick = () => multi ? stepArea() : stepDest();
    app.querySelectorAll("[data-y]").forEach(b => b.onclick = () => { draft.y = +b.dataset.y; if(past(draft.y, draft.m)) draft.m = nextMonth().m; draw(); });
    app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { draft.m = +b.dataset.m; draw(); });
    document.getElementById("minus").onclick = () => { draft.n = Math.max(2, draft.n - 1); draw(); };
    document.getElementById("plus").onclick = () => { draft.n = Math.min(14, draft.n + 1); draw(); };
    document.getElementById("next").onclick = stepOpts;
  };
  draw();
}

function stepOpts(){
  plain();
  const tot = totalSteps();
  const draw = () => {
    app.innerHTML = `${stepHead(tot, tot, "우리 여행에 해당하는 걸<br>모두 골라 주세요", "고른 것만 짐 목록에 넣어요. 나중에 바꿀 수 있어요.")}
      <div class="list">${OPTS.map(o => { const on = !!draft.o[o.k]; return `<button class="row-btn${on ? " on" : ""}" data-o="${o.k}" role="checkbox" aria-checked="${on}">${chk(on)}<span class="rb-t"><b>${esc(o.t)}</b><span>${esc(o.d)}</span></span></button>`; }).join("")}</div>
      <div class="btns sticky-go"><button class="btn main" id="make">짐 목록 만들기</button></div>`;
    document.getElementById("back").onclick = stepWhen;
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { draft.o[b.dataset.o] = !draft.o[b.dataset.o]; draw(); });
    document.getElementById("make").onclick = () => { S.trip = draft; saveS(); reveal("짐 목록\n완성!", () => result()); };
  };
  draw();
}

// ===== 목록 계산 =====
function inMonth(x, m){ return !x.months || x.months.includes(m); }
function inAreas(x, areas){ return !x.areas || x.areas.some(a => areas.includes(a)); }
function optOk(x, o){ return !x.when || !!o[x.when]; }

function weatherOf(t){
  const d = D(t.d);
  const rows = d.areas.filter(a => t.areas.includes(a.key)).map(a => ({ a, r: (d.climate[a.key] || []).find(x => x.m === t.m) })).filter(x => x.r);
  const vals = k => rows.map(x => x.r[k]).filter(v => v != null);
  const hiMax = vals("hi").length ? Math.max(...vals("hi")) : null;
  const loMin = vals("lo").length ? Math.min(...vals("lo")) : null;
  const rdMax = vals("rd").length ? Math.max(...vals("rd")) : null;
  const uvMax = vals("uv").length ? Math.max(...vals("uv")) : null;
  const seaMin = vals("sea").length ? Math.min(...vals("sea")) : null;
  const coldest = rows.filter(x => x.r.lo != null).sort((p, q) => p.r.lo - q.r.lo)[0];
  const wettest = rows.filter(x => x.r.rd != null).sort((p, q) => q.r.rd - p.r.rd)[0];
  const rainySeason = rows.some(x => /우기|비가 잦/.test(x.r.season || ""));
  return { rows, hiMax, loMin, rdMax, uvMax, seaMin, coldest, wettest, rainySeason };
}

function issuesOf(t){
  const d = D(t.d);
  return (d.issues || []).filter(x => inMonth(x, t.m) && inAreas(x, t.areas));
}

function buildItems(t){
  const d = D(t.d), w = weatherOf(t), o = t.o, days = t.n + 1;
  const map = new Map(), order = [];
  const add = it => { if(!map.has(it.id)) order.push(it.id); map.set(it.id, it); };
  for(const c of PACK.items){
    if(!optOk(c, o)) continue;
    add({ ...c, srcDest: false, notes: [] });
  }
  for(const p of d.pack || []){
    if(!inMonth(p, t.m) || !inAreas(p, t.areas) || !optOk(p, o)){
      // hideBase: 이 여행지에서는 고친 칸이 맞는 지역에서만 공통 짐을 보여 줘요 (예: 멕시코는 국제운전면허증을 인정하지 않음)
      if(p.override && p.hideBase && map.has(p.override)){ map.delete(p.override); order.splice(order.indexOf(p.override), 1); }
      continue;
    }
    if(p.override){
      const base = map.get(p.override); if(!base) continue;
      const it = { ...base };
      if(p.name) it.name = p.name;
      if(p.why) it.why = p.why;
      if(p.need) it.need = p.need;
      it.src = [...(base.src || [])]; it.dsrc = [...(p.src || [])]; it.local = true;
      map.set(base.id, it);
    } else {
      add({ ...p, dsrc: p.src || [], src: [], notes: [], local: true });
    }
  }
  // 이슈가 챙기라고 한 것
  for(const is of issuesOf(t)) for(const pid of is.packIds || []){
    const it = map.get(pid); if(it){ it.need = "must"; (it.notes = it.notes || []).push(`${is.title} — ${monthName(t.m)}`); }
  }
  // 날씨로 고치는 것
  const ws = [];
  if(w.hiMax != null && w.loMin != null){
    const tops = map.get("tops");
    if(tops){
      tops.wx = `낮 ${r0(w.hiMax)}°C → ${wearOf(w.hiMax)}${wearIdx(w.hiMax) !== wearIdx(w.loMin) ? ` · 밤 ${r0(w.loMin)}°C → ${wearOf(w.loMin)}. 벗고 입기 쉽게 겹쳐 입어요` : ""}`;
      tops.help = "wear"; tops.wsrc = WEAR_SRC;
    }
    const layer = map.get("layer");
    if(layer && (w.loMin < 20 || wearIdx(w.hiMax) !== wearIdx(w.loMin))){
      layer.need = "must"; layer.help = "wear"; layer.wsrc = WEAR_SRC;
      layer.wx = w.loMin >= 12 && w.loMin < 20 ? `밤 ${r0(w.loMin)}°C → ${wearOf(w.loMin)}` : `밤 ${r0(w.loMin)}°C — 저녁·실내 냉방·기내용`;
    }
    // 그 지역 전용 옷을 여행지 자료가 이미 넣었으면(예: 할레아칼라 방한복) 그 지역은 빼고 계산해요
    const covered = new Set((d.pack || []).filter(p => !p.override && p.cat === "clothes" && p.areas && inMonth(p, t.m) && optOk(p, o)).flatMap(p => p.areas));
    const rest = w.rows.filter(x => x.r.lo != null && !covered.has(x.a.key)).sort((p, q) => p.r.lo - q.r.lo);
    if(rest.length && rest[0].r.lo <= 11){   // 12~16°C는 위 "얇은 겉옷"이 맡아요
      const lo = rest[0].r.lo, where = w.rows.length > 1 ? `${rest[0].a.short || rest[0].a.label} ` : "";
      const nm = lo <= 4 ? "패딩·두꺼운 코트" : lo <= 8 ? "코트" : "재킷·트렌치코트";
      add({ id: "w-warm", cat: "clothes", name: `따뜻한 겉옷 (${nm})`, need: "must", who: "each", why: "추운 시간·곳에 입어요.", wx: `${where}밤 ${r0(lo)}°C`, src: [], wsrc: [...WEAR_SRC, "W:kdca-cold"], help: "cold", notes: [] });
      if(lo <= 4) add({ id: "w-winter", cat: "clothes", name: "목도리·장갑·모자", need: "must", who: "each", why: "얇은 옷을 겹쳐 입고 장갑·목도리·모자를 챙기라고 질병관리청·CDC가 안내해요.", wx: `${where}밤 ${r0(lo)}°C`, src: [], wsrc: ["W:kdca-cold", "W:cdc-cold"], help: "cold", notes: [] });
    }
  }
  const umb = map.get("umbrella");
  if(umb && w.rdMax != null){
    umb.wx = `비 온 날 한 달 평균 ${r0(w.rdMax)}일${w.wettest && w.rows.length > 1 ? ` (${w.wettest.a.short || w.wettest.a.label})` : ""}`;
    if(w.rdMax > RAIN_UP || w.rainySeason) umb.need = "must";
    umb.help = "rain";
  }
  if(w.uvMax != null && w.uvMax >= 2){
    for(const id of ["sunscreen", "hat"]){
      const it = map.get(id); if(!it) continue;
      it.need = "must"; it.wx = `자외선 ${UVL[w.uvMax]}`; it.help = "uv"; it.wsrc = ["W:kma-uv", "W:who-uv"];
    }
  }
  // 수량
  const q = { underwear: `1인 ${days + 1}장`, socks: `1인 ${days + 1}켤레`, tops: `상의 1인 ${Math.ceil(days / 2)}벌쯤 · 하의 2~3벌` };
  if(o.swim) q.swimsuit = "1인 1~2벌";
  for(const [id, v] of Object.entries(q)){ const it = map.get(id); if(it){ it.qty = v; it.qhelp = true; } }
  // 직접 더한 것 · 뺀 것
  for(const c of (S.custom[t.d] || [])) add({ id: c.id, cat: c.cat, name: c.name, need: "opt", who: "", why: "직접 더한 짐이에요.", src: [], custom: true, notes: [] });
  const removed = new Set(S.removed[t.d] || []);
  const all = order.map(id => map.get(id));
  return { items: all.filter(x => !removed.has(x.id)), removedItems: all.filter(x => removed.has(x.id)), w };
}

function beforeOf(t){
  const d = D(t.d);
  const list = (d.before || []).filter(x => inAreas(x, t.areas) && inMonth(x, t.m)).map(x => ({ ...x, dest: true }));
  for(const b of BEFORE_COMMON) if(!b.opt || t.o[b.opt]) list.push({ ...b, dest: false });
  return list;
}

// ===== 결과 =====
function result(resume){
  const t = S.trip; if(!t || !D(t.d)){ home(); return; }
  plain();
  const d = D(t.d), { items, removedItems, w } = buildItems(t), issues = issuesOf(t), before = beforeOf(t);
  const checks = S.checks[t.d] || (S.checks[t.d] = {});
  const leave = (d.leave || []).filter(x => inAreas(x, t.areas) && (optOk(x, t.o) || x.level === "ban"));
  const local = (d.local || []).filter(x => inAreas(x, t.areas) && optOk(x, t.o));
  app.className = "wrap res";
  app.innerHTML = `
    <div class="rhead">
      <div class="rh-t"><p class="rh-kind">${NAME}</p><h2>${esc(d.name)}</h2><p class="rh-sub">${t.y}년 ${t.m}월 · ${t.n}박${d.areas.length > 1 ? ` · ${esc(areaNames(t))}` : ""}</p></div>
      <button class="chip-btn" id="edit">조건 바꾸기</button>
    </div>
    <button class="notice" data-help="notice"><b>참고용</b><span>${CHECKED_TEXT} 공식 자료로 확인 · 출발 전 다시 확인하세요</span><span class="ar" aria-hidden="true">›</span></button>
    <div class="prog" id="prog"></div>
    <nav class="tabs" id="tabs" aria-label="목록 바로가기">
      <a href="#s-wx" data-t="s-wx">날씨</a><a href="#s-todo" data-t="s-todo">할 일</a><a href="#s-pack" data-t="s-pack">짐</a><a href="#s-leave" data-t="s-leave">두고 갈 것</a>${local.length || d.power ? `<a href="#s-local" data-t="s-local">현지</a>` : ""}
    </nav>
    ${wxHtml(t, d, w, issues)}
    ${todoHtml(t, d, before, checks)}
    <section class="sec" id="s-pack">
      <div class="sec-h"><h3>짐 체크리스트</h3><button class="text-btn small" id="editList">${editing ? "다 고쳤어요" : "목록 고치기"}</button></div>
      <div class="filters" id="filters"></div>
      <div id="packList"></div>
      <p class="sec-foot">수량·옷차림은 흔히 쓰는 기준이에요 <button class="text-btn inline" data-help="qty">수량은 어떻게?</button></p>
    </section>
    ${leaveHtml(t, d, leave)}
    ${localHtml(d, local)}
    <section class="sec end">
      <div class="btns">
        <button class="btn main" id="share">목록 링크 보내기</button>
        <div class="btn-row">
          <button class="btn ghost" id="copy">글로 복사하기</button>
          <button class="btn ghost" id="xlsx">엑셀로 저장하기</button>
        </div>
      </div>
      <p class="msg" id="msg"></p>
      <p class="note small">${PRIVACY} 링크를 받은 신랑·신부도 같은 목록을 보고, 체크는 각자 폰에 따로 해요.</p>
      <p class="note small">※ 모든 정보는 ${CHECKED_TEXT} 기준 참고용이에요. 입국 규정·현지 사정은 바뀔 수 있으니 공식 사이트에서 다시 확인하세요. <button class="text-btn inline" id="allSrc">출처 모두 보기</button></p>
      <button class="text-btn btn-link" id="restart">처음부터 다시 고르기</button>
      ${sign()}
    </section>
    ${foot()}`;
  document.getElementById("edit").onclick = () => { draft = JSON.parse(JSON.stringify(t)); stepDest(); };
  document.getElementById("restart").onclick = () => { draft = null; stepDest(); };
  document.getElementById("editList").onclick = () => { editing = !editing; document.getElementById("editList").textContent = editing ? "다 고쳤어요" : "목록 고치기"; drawPack(); };
  document.getElementById("share").onclick = shareTrip;
  document.getElementById("copy").onclick = copyList;
  document.getElementById("xlsx").onclick = saveXlsx;
  document.getElementById("allSrc").onclick = () => allSources(d);
  // 할 일 체크
  app.querySelectorAll("[data-todo]").forEach(b => b.onkeydown = e => { if(e.target === b && (e.key === " " || e.key === "Enter")){ e.preventDefault(); b.click(); } });
  app.querySelectorAll("[data-todo]").forEach(b => b.onclick = e => {
    if(e.target.closest("a,button")) return;
    const id = "todo:" + b.dataset.todo; checks[id] = !checks[id]; if(!checks[id]) delete checks[id]; saveS();
    b.classList.toggle("on", !!checks[id]); b.setAttribute("aria-checked", !!checks[id]); b.querySelector(".cb").classList.toggle("on", !!checks[id]);
    paintProg();
  });
  app.querySelectorAll("[data-src]").forEach(b => b.onclick = () => {
    const [kind, i] = b.dataset.src.split(":");
    const x = kind === "is" ? issues[+i] : kind === "lv" ? leave[+i] : kind === "lc" ? local[+i] : kind === "fl" ? FLIGHT[+i] : kind === "td" ? before[+i] : null;
    if(!x) return;
    const title = x.title || x.t, body = x.body || x.b;
    openSheet(`<h3>${esc(title)}</h3>${x.single ? `<p class="stamp">공식 출처 1곳에서만 확인한 내용이에요.</p>` : x.grade === "2순위" ? `<p class="stamp">공식 기관이 아닌 출처(다른 나라 정부 안내·언론)로 확인한 내용이에요.</p>` : ""}<p>${esc(body)}</p>${x.when ? `<p class="when">언제: ${esc(x.when)}</p>` : ""}${kind === "is" && x.dates && x.dates[String(S.trip.y)] ? `<p class="when">${S.trip.y}년 전체: ${esc(x.dates[String(S.trip.y)])}</p>` : ""}${x.link ? `<p>${linkOut(x.link)}</p>` : ""}<p class="stamp">${CHECKED_TEXT} 확인 · 참고용 — 바뀔 수 있으니 공식 사이트에서 다시 확인하세요</p>${srcList(x.src || x.s, kind === "fl" || (kind === "td" && !x.dest) ? null : d)}`, title);
  });
  drawPack();
  watchTabs();
  // 다시 열었고 이미 챙기던 중이면 짐 칸부터 보여 줘요
  if(resume && Object.keys(checks).some(k => !k.startsWith("todo:"))){ const sp = document.getElementById("s-pack"); if(sp) sp.scrollIntoView({ block: "start" }); }
}

function wxHtml(t, d, w, issues){
  const rows = w.rows.map(({ a, r }) => `
    <div class="wx">
      <div class="wx-h"><b>${esc(a.label)}</b>${r.season ? `<span class="season">${esc(r.season)}</span>` : ""}</div>
      <div class="wx-g">
        <span><em>낮</em><b>${r0(r.hi)}°</b></span><span><em>밤</em><b>${r0(r.lo)}°</b></span>
        <span><em>비 온 날</em><b>${r.rd == null ? "–" : r0(r.rd) + "일"}</b></span>
        ${r.sea != null ? `<span><em>바닷물</em><b>${r0(r.sea)}°</b></span>` : ""}
        ${r.uv ? `<span><em>자외선</em><b>${UVL[r.uv]}</b></span>` : ""}
      </div>
      ${a.note ? `<p class="wx-n">${esc(a.note)}</p>` : ""}
    </div>`).join("");
  const tips = [];
  if(w.hiMax != null) tips.push(`<li><b>옷</b><span>낮엔 ${esc(wearOf(w.hiMax))}${wearIdx(w.hiMax) !== wearIdx(w.loMin) ? `, 밤엔 ${esc(wearOf(w.loMin))}` : ""} <button class="qm" data-help="wear" aria-label="옷차림 기준 설명">?</button></span></li>`);
  if(w.uvMax >= 2) tips.push(`<li><b>햇빛</b><span>선크림·모자·선글라스${w.uvMax >= 3 ? ", 긴 소매 옷" : ""}${w.uvMax >= 4 ? ", 오전 10시~오후 3시엔 그늘로" : ""} <button class="qm" data-help="uv" aria-label="자외선 기준 설명">?</button></span></li>`);
  if(t.o.swim && w.seaMin != null && w.seaMin < 21) tips.push(`<li class="warn"><b>바닷물</b><span>${r0(w.seaMin)}°C — 21°C 아래 물에 오래 있으면 저체온이 올 수 있어요 <button class="qm" data-help="sea" aria-label="바닷물 온도 설명">?</button></span></li>`);
  if(w.loMin != null && w.loMin <= 8) tips.push(`<li class="warn"><b>추위</b><span>밤 ${r0(w.loMin)}°C${w.coldest && w.rows.length > 1 ? `(${esc(w.coldest.a.short || w.coldest.a.label)})` : ""} — 겹쳐 입고 따뜻한 겉옷 <button class="qm" data-help="cold" aria-label="추위 대비 설명">?</button></span></li>`);
  const period = [...new Set(w.rows.map(x => ((x.a.period || "").match(/(\d{4})\s*[–-]\s*(\d{4})/) || []).slice(1).join("~")).filter(Boolean))].map(p => p + "년").join("·");
  const card = (x, i) => {
    const all = x.dates && x.dates[String(t.y)], pick = all ? datesIn(all, t.m) : [];
    const dates = pick.length ? `${t.m}월: ${pick.join(", ")}` : all;
    return `<button class="issue ${x.level === "caution" ? "caution" : "info"}" data-src="is:${i}"><b>${esc(x.title)}${oneTag(x)}</b><span>${esc(x.body)}</span>${dates ? `<span class="dates">${t.y}년 ${esc(dates)}</span>` : ""}<span class="more">${pick.length ? "전체 날짜·출처 ›" : "출처 ›"}</span></button>`;
  };
  const cau = issues.map((x, i) => [x, i]).filter(([x]) => x.level === "caution"), inf = issues.map((x, i) => [x, i]).filter(([x]) => x.level !== "caution");
  const iss = cau.map(([x, i]) => card(x, i)).join("") + (inf.length > 2 && cau.length
    ? `<details class="fold"><summary>그 밖에 알아 둘 것 ${inf.length}개</summary><div class="issues">${inf.map(([x, i]) => card(x, i)).join("")}</div></details>`
    : inf.map(([x, i]) => card(x, i)).join(""));
  return `<section class="sec" id="s-wx">
    <div class="sec-h"><h3>${t.m}월 날씨</h3><span class="sec-tag">평년값</span></div>
    ${rows}
    ${tips.length ? `<ul class="tips">${tips.join("")}</ul>` : ""}
    <p class="sec-foot">${period ? `${esc(period)} ` : "여러 해 "}평균값(평년값)이라 실제와 달라요. 출발 1주 전 일기예보를 꼭 보세요.</p>
    ${iss ? `<h4 class="sub-h">${t.m}월에 알아 둘 것</h4><div class="issues">${iss}</div>` : ""}
  </section>`;
}

function todoHtml(t, d, before, checks){
  return `<section class="sec" id="s-todo">
    <div class="sec-h"><h3>출국 전 할 일</h3><span class="sec-tag">${CHECKED_TEXT} 확인</span></div>
    <p class="sec-lead">입국 규정은 바뀔 수 있어요. 각 항목의 공식 사이트에서 마지막으로 확인하세요.</p>
    <div class="todos">${before.map((x, i) => { const on = !!checks["todo:" + x.id]; return `
      <div class="todo${on ? " on" : ""}" data-todo="${esc(x.id)}" role="checkbox" aria-checked="${on}" tabindex="0">
        ${chk(on)}
        <div class="td-t"><b>${esc(x.title)}${oneTag(x)}</b><span>${esc(x.body)}</span>
          <span class="td-meta">${x.when ? `<span class="when">${esc(x.when)}</span>` : ""}${x.who && WHO[x.who] ? `<span class="who">${WHO[x.who]}</span>` : ""}${linkOut(x.link)}<button class="text-btn tiny" data-src="td:${i}">출처</button></span>
        </div>
      </div>`; }).join("")}</div>
  </section>`;
}

function leaveHtml(t, d, leave){
  const ban = leave.filter(x => x.level === "ban"), cau = leave.filter(x => x.level !== "ban");
  const card = (x, i) => `<button class="lv ${x.level === "ban" ? "ban" : "cau"}" data-src="lv:${i}"><b>${esc(x.title)}${oneTag(x)}</b><span>${esc(x.body)}</span><span class="more">근거·공식 사이트 ›</span></button>`;
  return `<section class="sec" id="s-leave">
    <div class="sec-h"><h3>두고 갈 것 · 조심할 것</h3><span class="sec-tag">${CHECKED_TEXT} 확인</span></div>
    ${ban.length ? `<h4 class="sub-h">가져가면 안 돼요</h4><div class="lvs">${ban.map(x => card(x, leave.indexOf(x))).join("")}</div>` : ""}
    ${cau.length ? `<h4 class="sub-h">조건이 있어요</h4><div class="lvs">${cau.map(x => card(x, leave.indexOf(x))).join("")}</div>` : ""}
    <details class="fold"><summary>공항 보안검색에서 걸리기 쉬운 것 (한국 출발)</summary>
      <div class="lvs">${FLIGHT.map((x, i) => `<button class="lv cau" data-src="fl:${i}"><b>${esc(x.t)}</b><span>${esc(x.b)}</span><span class="more">출처 ›</span></button>`).join("")}</div>
    </details>
  </section>`;
}

function localHtml(d, local){
  if(!local.length && !d.power) return "";
  return `<section class="sec" id="s-local">
    <div class="sec-h"><h3>현지에서 알아 둘 것</h3></div>
    ${d.power ? `<div class="power"><b>전기</b><span>${esc(d.power.text || "")}${d.power.adapter ? ` — ${esc(d.power.adapter)}` : ""}</span></div>` : ""}
    <div class="lcs">${local.map((x, i) => `<button class="lc" data-src="lc:${i}"><b>${esc(x.title)}${oneTag(x)}</b><span>${esc(x.body)}</span></button>`).join("")}</div>
  </section>`;
}

// ===== 짐 목록 (체크할 때 화면 전체를 다시 그리지 않게 따로 그려요) =====
const FILTERS = [["all", "전체"], ["must", "꼭 챙길 것"], ["groom", "신랑"], ["bride", "신부"], ["share", "같이"]];
function passFilter(x, f){
  if(f === "all") return true;
  if(f === "must") return x.need === "must";
  if(f === "share") return x.who === "share";
  if(f === "groom") return ["each", "groom", "user"].includes(x.who);
  if(f === "bride") return ["each", "bride", "user"].includes(x.who);
  return true;
}
function drawPack(){
  const t = S.trip, { items, removedItems } = buildItems(t), checks = S.checks[t.d] || {};
  const f = S.ui.filter || "all", hide = !!S.ui.hideDone;
  document.getElementById("filters").innerHTML = `
    <div class="seg">${FILTERS.map(([k, l]) => `<button class="sg${f === k ? " on" : ""}" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    <label class="hide"><input type="checkbox" id="hideDone" ${hide ? "checked" : ""}> 챙긴 것 숨기기</label>`;
  const groups = PACK.cats.map(([cid, cl]) => {
    const list = items.filter(x => x.cat === cid && passFilter(x, f));
    const shown = list.filter(x => !(hide && checks[x.id]));
    const done = list.filter(x => checks[x.id]).length;
    if(!list.length && !editing) return "";
    return `<div class="grp" data-cat="${cid}">
      <div class="grp-h"><b>${esc(cl)}</b><span class="grp-n">${done} / ${list.length}</span></div>
      <ul class="items">${shown.map(x => itemHtml(x, !!checks[x.id])).join("")}
      ${!shown.length && list.length ? `<li class="all-done">다 챙겼어요 ✓</li>` : ""}</ul>
      ${editing ? `<form class="add" data-add="${cid}"><input class="in" name="n" maxlength="40" placeholder="${esc(cl)}에 짐 더하기" aria-label="${esc(cl)}에 더할 짐 이름"><button class="btn small">더하기</button></form>` : ""}
    </div>`;
  }).join("");
  document.getElementById("packList").innerHTML = groups + (removedItems.length ? `
    <details class="fold removed"><summary>뺀 짐 ${removedItems.length}개</summary>
      <ul class="items">${removedItems.map(x => `<li class="it gone"><span class="it-t"><b>${esc(x.name)}</b></span><button class="text-btn small" data-back="${esc(x.id)}">되돌리기</button></li>`).join("")}</ul>
    </details>` : "");
  // 이벤트
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { S.ui.filter = b.dataset.f; saveS(); drawPack(); });
  document.getElementById("hideDone").onchange = e => { S.ui.hideDone = e.target.checked; saveS(); drawPack(); };
  document.querySelectorAll(".it[data-id]").forEach(li => {
    const id = li.dataset.id;
    li.querySelector(".it-main").onclick = () => {
      const c = S.checks[t.d] || (S.checks[t.d] = {});
      c[id] = !c[id]; if(!c[id]) delete c[id]; saveS();
      if(S.ui.hideDone && c[id]){ drawPack(); }
      else { li.classList.toggle("on", !!c[id]); li.querySelector(".it-main").setAttribute("aria-checked", !!c[id]); li.querySelector(".cb").classList.toggle("on", !!c[id]); paintGroup(li.closest(".grp")); }
      paintProg();
    };
    const info = li.querySelector("[data-info]"); if(info) info.onclick = () => itemSheet(id);
    const rm = li.querySelector("[data-rm]"); if(rm) rm.onclick = () => {
      const x = (S.custom[t.d] || []).findIndex(c => c.id === id);
      if(x >= 0) S.custom[t.d].splice(x, 1);
      else { const r = S.removed[t.d] || (S.removed[t.d] = []); if(!r.includes(id)) r.push(id); }
      saveS(); drawPack(); paintProg();
    };
  });
  document.querySelectorAll("[data-back]").forEach(b => b.onclick = () => { S.removed[t.d] = (S.removed[t.d] || []).filter(x => x !== b.dataset.back); saveS(); drawPack(); paintProg(); });
  document.querySelectorAll("[data-add]").forEach(fm => fm.onsubmit = e => {
    e.preventDefault();
    const name = fm.n.value.trim(); if(!name) return;
    (S.custom[t.d] || (S.custom[t.d] = [])).push({ id: "u" + Date.now().toString(36), cat: fm.dataset.add, name });
    saveS(); drawPack(); paintProg();
    const again = document.querySelector(`[data-add="${fm.dataset.add}"] input`); if(again) again.focus();
  });
  paintProg();
}
function itemHtml(x, on){
  const tag = x.who && WHO[x.who] ? `<span class="who w-${x.who}">${WHO[x.who]}</span>` : "";
  const need = x.need === "must" ? `<span class="need">꼭</span>` : "";
  const sub = [x.wx ? `<span class="wxn">${esc(x.wx)}</span>` : "", ...(x.notes || []).map(n => `<span class="wxn">${esc(n)}</span>`)].join("");
  return `<li class="it${on ? " on" : ""}${x.local ? " local" : ""}" data-id="${esc(x.id)}">
    <button class="it-main" role="checkbox" aria-checked="${on}">${chk(on)}
      <span class="it-t"><b>${esc(x.name)}</b>${x.qty ? `<span class="qty">${esc(x.qty)}</span>` : ""}<span class="tags">${need}${tag}${x.local ? `<span class="loc">이 여행지</span>` : ""}</span>${sub ? `<span class="subs">${sub}</span>` : ""}</span>
    </button>
    ${editing ? `<button class="it-x" data-rm aria-label="${esc(x.name)} 빼기">빼기</button>` : x.custom ? "" : `<button class="it-i" data-info aria-label="${esc(x.name)} 이유와 출처">i</button>`}
  </li>`;
}
// 숨기기가 꺼져 있을 때만 불려요 → 그 묶음의 짐이 모두 화면에 있어요
function paintGroup(g){
  if(!g) return;
  const lis = [...g.querySelectorAll(".it[data-id]")], n = g.querySelector(".grp-n");
  if(n) n.textContent = `${lis.filter(li => li.classList.contains("on")).length} / ${lis.length}`;
}
function paintProg(){
  const t = S.trip, { items } = buildItems(t), c = S.checks[t.d] || {};
  const done = items.filter(x => c[x.id]).length, before = beforeOf(t), bd = before.filter(x => c["todo:" + x.id]).length;
  const pct = items.length ? Math.round(done / items.length * 100) : 0;
  const el = document.getElementById("prog"); if(!el) return;
  el.innerHTML = `<div class="pg-row"><b>짐 ${done} / ${items.length}</b><span>출국 전 할 일 ${bd} / ${before.length}</span></div>
    <div class="pg-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="짐 챙긴 비율"><span style="width:${pct}%"></span></div>
    ${pct === 100 ? `<p class="pg-done">짐을 다 챙겼어요! 즐거운 신혼여행 되세요 💐</p>` : ""}`;
}
function itemSheet(id){
  const t = S.trip, d = D(t.d), it = buildItems(t).items.find(x => x.id === id); if(!it) return;
  const keys = [...(it.src || []).map(k => ({ k, dest: null })), ...(it.dsrc || []).map(k => ({ k, dest: d })), ...(it.wsrc || []).map(k => ({ k, dest: null }))];
  const seen = new Set(), list = [];
  for(const { k, dest } of keys){ if(seen.has(k)) continue; seen.add(k); const s = srcOf(k, dest); if(s) list.push(s); }
  openSheet(`<h3>${esc(it.name)}</h3>
    ${it.why ? `<p>${esc(it.why)}</p>` : ""}
    ${it.wx ? `<p class="when">${esc(it.wx)}${it.help ? ` <button class="text-btn inline" id="sheetHelp">기준 보기</button>` : ""}</p>` : ""}
    ${(it.notes || []).map(n => `<p class="when">${esc(n)}</p>`).join("")}
    ${it.qty ? `<p class="when">수량: ${esc(it.qty)} (흔히 쓰는 기준)</p>` : ""}
    ${it.single ? `<p class="stamp">공식 출처 1곳에서만 확인한 내용이에요.</p>` : ""}
    <p class="stamp">${it.local ? `${esc(d.name)} 자료 · ` : ""}${CHECKED_TEXT} 확인 · 참고용</p>
    ${list.length ? `<p class="src-h">출처</p><ul class="src">${list.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.grade ? ` <span class="grade">${esc(s.grade)}</span>` : ""}</li>`).join("")}</ul>` : ""}`, it.name);
  const h = document.getElementById("sheetHelp"); if(h) h.onclick = () => openHelp(it.help, d);
}
function allSources(d){
  const groups = [[`${d.name} 자료`, Object.values(d.sources || {})], ["공통 짐·비행기 규정", Object.values(PACK.csrc)], ["날씨 기준", Object.values(PACK.wsrc).map(w => ({ name: w[0], url: w[1], grade: w[2] }))]];
  openSheet(`<h3>출처 모두 보기</h3><p>${CHECKED_TEXT}에 확인한 자료예요. 공식 자료를 먼저 썼고, 여행사·여행 안내는 두 곳 이상에서 같은 말을 할 때만 넣었어요.</p>
    ${groups.map(([h, l]) => `<p class="src-h">${esc(h)} (${l.length})</p><ul class="src">${l.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.grade ? ` <span class="grade">${esc(s.grade)}</span>` : ""}</li>`).join("")}</ul>`).join("")}`, "출처 모두 보기");
}

// 바로가기 탭: 보고 있는 칸을 표시
function watchTabs(){
  const tabs = document.getElementById("tabs"); if(!tabs || !("IntersectionObserver" in window)) return;
  tabs.querySelectorAll("a").forEach(a => a.onclick = e => { e.preventDefault(); const s = document.getElementById(a.dataset.t); if(s) s.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); });
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if(en.isIntersecting){ tabs.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.t === en.target.id)); } });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["s-wx", "s-todo", "s-pack", "s-leave", "s-local"].forEach(id => { const s = document.getElementById(id); if(s) io.observe(s); });
  // 맨 아래에 닿으면 마지막 탭을 켜요 (끝 칸은 탭이 없어서)
  if(!window._tabEnd){ window._tabEnd = true; window.addEventListener("scroll", () => {
    const tb = document.getElementById("tabs"); if(!tb) return;
    if(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8){ const as = tb.querySelectorAll("a"); as.forEach((a, i) => a.classList.toggle("on", i === as.length - 1)); }
  }, { passive: true }); }
}

// ===== 보내기 · 복사 =====
function tripUrl(t){
  const u = new URL(location.origin + location.pathname);
  if(!OPEN) u.searchParams.set("preview", "");
  u.searchParams.set("d", t.d); u.searchParams.set("y", t.y); u.searchParams.set("m", t.m); u.searchParams.set("n", t.n);
  u.searchParams.set("a", t.areas.join(",")); u.searchParams.set("o", OPTS.filter(o => t.o[o.k]).map(o => o.k).join(","));
  return u.toString().replace("preview=&", "preview&");
}
async function shareTrip(){
  const t = S.trip, url = tripUrl(t), msg = document.getElementById("msg");
  const text = `신혼여행 짐 목록이에요. ${tripText(t)}`;
  if(navigator.share){ try { await navigator.share({ title: NAME, text, url }); msg.textContent = ""; return; } catch (e) { if(e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); msg.textContent = "링크를 복사했어요. 카톡에 붙여 넣어 보내세요."; }
  catch (e) { msg.textContent = url; }
}
async function copyList(){
  const t = S.trip, d = D(t.d), { items } = buildItems(t), c = S.checks[t.d] || {}, msg = document.getElementById("msg");
  const lines = [`[신혼여행 짐] ${tripText(t)}`, `※ 참고용 — ${CHECKED_TEXT} 확인. 입국 규정·현지 사정은 바뀔 수 있으니 출발 전 공식 사이트에서 다시 확인하세요.`, "", "■ 출국 전 할 일"];
  for(const b of beforeOf(t)) lines.push(`${c["todo:" + b.id] ? "☑" : "☐"} ${b.title}${b.when ? ` (${b.when})` : ""}`);
  for(const [cid, cl] of PACK.cats){
    const list = items.filter(x => x.cat === cid); if(!list.length) continue;
    lines.push("", `■ ${cl}`);
    for(const x of list) lines.push(`${c[x.id] ? "☑" : "☐"} ${x.name}${x.qty ? ` — ${x.qty}` : ""}${x.who && WHO[x.who] ? ` [${WHO[x.who]}]` : ""}`);
  }
  const ban = (d.leave || []).filter(x => x.level === "ban");
  if(ban.length){ lines.push("", "■ 가져가면 안 돼요"); for(const x of ban) lines.push(`✕ ${x.title}`); }
  lines.push("", tripUrl(t));
  try { await navigator.clipboard.writeText(lines.join("\n")); msg.textContent = "목록을 복사했어요. 메모장이나 카톡에 붙여 넣으세요."; }
  catch (e) { msg.textContent = "복사하지 못했어요. 화면을 캡처해 주세요."; }
}

// ===== 엑셀로 저장 (xlsx.js) =====
// 시트 5개: 짐 목록 · 출국 전 할 일 · 두고 갈 것 · 날씨 · 알아 둘 것. 시트마다 2행에 참고용 안내.
function xlsxSheets(t){
  const d = D(t.d), { items, w } = buildItems(t), c = S.checks[t.d] || {};
  const title = `${NAME} — ${tripText(t)}${d.areas.length > 1 ? ` (${areaNames(t)})` : ""}`;
  const ref = `※ 참고용이에요. ${CHECKED_TEXT}에 공식 자료로 확인했지만 입국 규정·관광세·현지 사정은 바뀔 수 있으니 떠나기 전 공식 사이트에서 다시 확인하세요.`;
  const join = a => a.filter(Boolean).join(" / ");
  const cat = Object.fromEntries(PACK.cats);
  const pack = [];
  for(const [cid] of PACK.cats) for(const x of items.filter(i => i.cat === cid))
    pack.push([c[x.id] ? "✔" : "", cat[cid], x.name, x.qty || "", WHO[x.who] || "", x.need === "must" ? "꼭" : "", x.custom ? "직접 더함" : x.local ? "이 여행지" : "공통", join([x.why, x.wx, ...(x.notes || []), x.single ? "공식 출처 1곳에서만 확인" : ""])]);
  const before = beforeOf(t).map(b => [c["todo:" + b.id] ? "✔" : "", b.title + (b.single ? " (공식 출처 1곳)" : ""), b.body, b.when || "", WHO[b.who] || "", b.link ? b.link.label : "", b.link ? b.link.url : ""]);
  const leave = (d.leave || []).filter(x => inAreas(x, t.areas) && (optOk(x, t.o) || x.level === "ban"))
    .map(x => [x.level === "ban" ? "가져가면 안 돼요" : "조건이 있어요", x.title + (x.single ? " (공식 출처 1곳)" : x.grade === "2순위" ? " (참고 출처)" : ""), x.body, x.link ? x.link.label : "", x.link ? x.link.url : ""])
    .concat(FLIGHT.map(x => ["공항 보안검색 (한국 출발)", x.t, x.b, "", ""]));
  const wx = w.rows.map(({ a, r }) => [a.label, r.hi == null ? "" : Math.round(r.hi), r.lo == null ? "" : Math.round(r.lo), r.rd == null ? "" : Math.round(r.rd), r.sea == null ? "" : Math.round(r.sea), r.uv ? UVL[r.uv] : "", r.season || ""]);
  const know = issuesOf(t).map(x => { const all = x.dates && x.dates[String(t.y)]; return [`${t.m}월에 알아 둘 것`, x.title, x.body, all ? `${t.y}년: ${all}` : ""]; })
    .concat(d.power ? [["전기", d.power.text || "", d.power.adapter || "", ""]] : [])
    .concat((d.local || []).filter(x => inAreas(x, t.areas) && optOk(x, t.o)).map(x => ["현지", x.title + (x.single ? " (공식 출처 1곳)" : ""), x.body, ""]));
  return [
    { name: "짐 목록", title, note: `${ref} 챙긴 짐은 '챙김' 칸에서 ✔를 고르면 회색 줄로 바뀌어요. 머리줄의 ▼로 분류·누구별로 거를 수 있어요.`, check: true,
      head: ["챙김", "분류", "짐", "수량", "누구", "꼭", "구분", "이유 · 날씨"], widths: [7, 13, 34, 22, 9, 6, 10, 62], styles: [5, 4, 4, 4, 5, 5, 5, 4], rows: pack },
    { name: "출국 전 할 일", title, note: ref, check: true,
      head: ["완료", "할 일", "내용", "언제", "누구", "공식 사이트", "주소"], widths: [7, 30, 58, 26, 8, 28, 46], styles: [5, 4, 4, 4, 5, 4, 4], rows: before },
    { name: "두고 갈 것", title, note: ref,
      head: ["구분", "항목", "내용", "공식 사이트", "주소"], widths: [18, 30, 66, 28, 46], styles: [4, 4, 4, 4, 4], rows: leave },
    { name: "날씨", title, note: `그 달의 여러 해 평균(평년값)이라 실제 날씨와 달라요. 출발 1주 전 일기예보를 꼭 보세요. 옷차림·수량은 흔히 쓰는 기준이에요. ${ref}`,
      head: ["지역", "낮 (°C)", "밤 (°C)", "비 온 날 (일)", "바닷물 (°C)", "자외선", "계절"], widths: [34, 9, 9, 12, 11, 11, 24], styles: [4, 5, 5, 5, 5, 5, 4], rows: wx },
    { name: "알아 둘 것", title, note: ref,
      head: ["구분", "제목", "내용", "날짜"], widths: [16, 30, 66, 40], styles: [4, 4, 4, 4], rows: know }
  ];
}
function xlsxName(t){ return `신혼여행짐_${D(t.d).name.replace(/\s*\(.*\)/, "").replace(/[^0-9A-Za-z가-힣]+/g, "")}_${t.y}-${pad(t.m)}_${t.n}박.xlsx`; }
async function saveXlsx(){
  const t = S.trip, msg = document.getElementById("msg");
  if(typeof window.xlsxBook !== "function"){ msg.textContent = "엑셀 파일을 만들지 못했어요. ‘글로 복사하기’를 써 주세요."; return; }
  let file;
  try { const blob = window.xlsxBook(xlsxSheets(t)); file = new File([blob], xlsxName(t), { type: blob.type }); }
  catch (e) { msg.textContent = "엑셀 파일을 만들지 못했어요. ‘글로 복사하기’를 써 주세요."; return; }
  // 휴대폰: 공유 창(파일에 저장 · 카톡 · 엑셀 앱)으로
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], title: `${NAME} — ${tripText(t)}` }); msg.textContent = ""; return; }
    catch (e) { if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
  }
  // 컴퓨터 등: 파일로 내려받기
  const url = URL.createObjectURL(file), a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  msg.textContent = "엑셀 파일을 저장했어요. ‘다운로드’ 폴더(아이폰은 파일 앱)에서 열 수 있어요.";
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>곧 공개</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>신혼여행 짐,<br>다 쌌어요?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom", "go", `<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

// ===== 시작 =====
// 주소에 여행 조건이 있으면(신랑·신부가 보낸 링크) 바로 목록을 보여 줘요
function fromUrl(){
  const p = new URLSearchParams(location.search), d = p.get("d");
  if(!d || !D(d)) return false;
  const dd = D(d), keys = dd.areas.map(a => a.key);
  const areas = (p.get("a") || "").split(",").filter(k => keys.includes(k));
  const o = Object.fromEntries(OPTS.map(x => [x.k, (p.get("o") || "").split(",").includes(x.k)]));
  const y = +p.get("y"), m = +p.get("m"), n = +p.get("n");
  S.trip = { d, areas: areas.length ? areas : dd.areas.filter(a => a.default).map(a => a.key), y: y >= 2026 && y <= 2030 ? y : nextMonth().y, m: m >= 1 && m <= 12 ? m : nextMonth().m, n: n >= 2 && n <= 14 ? n : 5, o };
  saveS();
  history.replaceState(null, "", location.pathname + (OPEN ? "" : "?preview"));
  return true;
}
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  if(fromUrl()){ result(); return; }
  home();
}
route();
