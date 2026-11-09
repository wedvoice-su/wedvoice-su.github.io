// 결혼 좋은 날 찾기 (예식일 달력 ㉗): 신부·신랑 생년월일 → 2027~2028년 토·일·공휴일 중 전통 택일법으로 본 후보 날짜 + 현실 조건(공휴일·연휴·비용·날씨)
// 기획 docs/예식일-달력/기획.md · 규칙 docs/예식일-달력/택일-자료.md · 계산 rules.js · 데이터 data.js · 공통 기능 shared/common.js
// 생년월일은 이 화면 안에서만 쓰고, 어디에도 저장하거나 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/good-day-to-wed/?preview)
const OPEN = false;
// =========================================================

// ===== 화면 문구 (문구를 바꾸려면 여기만 고치면 돼요) =====
const NAME = "결혼 좋은 날 찾기";
const BASIS = "조선 시대 택일서 『천기대요』의 혼인 택일 기본 규칙 기준의 참고용 날짜예요.";   // 사회자님 11/9 결정
const STANCE = "과학적 근거는 없고, 택일하는 곳마다 결과가 다를 수 있으니 참고만 하세요.";
const PRIVACY = "생년월일은 이 화면 안에서만 쓰고, 어디에도 저장하거나 보내지 않아요.";
const NONE_GOOD = "전통 택일에서 따로 좋은 날로 꼽는 표시가 겹치지는 않는 날이에요. 이 사이트는 나쁜 날을 따로 표시하지 않아요.";
const TOP_N = 10;
// 사회자 한마디는 넣지 않아요 — 날짜 택일은 사회자 전문 영역이 아니라서 (사회자님 기준, 2026-11-03)

// (?) 근거 — 조사 A·B의 "(?) 요약·대표 출처" (docs/예식일-달력/조사-A·B, 교차 검증 반영)
const SRC = {
  encyChungi: ["한국민족문화대백과사전 「천기대요」", "https://encykorea.aks.ac.kr/Article/E0055802"],
  encyIljin: ["한국민족문화대백과사전 「일진」", "https://encykorea.aks.ac.kr/Article/E0047325"],
  encySaju: ["한국민족문화대백과사전 「사주」", "https://encykorea.aks.ac.kr/Article/E0025957"],
  encySon: ["한국민족문화대백과사전 「손」", "https://encykorea.aks.ac.kr/Article/E0030463"],
  encyLeap: ["한국민족문화대백과사전 「윤달」", "https://encykorea.aks.ac.kr/Article/E0042264"],
  lee2016: ["이수동(2016) 「조선후기 선택서의 혼례택일 방법론 고찰」", "https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE07101765"],
  kim2009: ["김만태(2009) 「한국 택일풍속의 전승양상과 특징」", "https://www.accesson.kr/ksq/assets/pdf/40681/journal-32-1-373.pdf"],
  sb2022: ["이청하·김기찬(2022) 「생기복덕법에 관한 연구」", "https://kiss.kstudy.com/Detail/Ar?key=3965654"],
  xj4: ["『흠정협기변방서』 권4 (위키문헌)", "https://zh.wikisource.org/wiki/欽定協紀辨方書_(四庫全書本)/卷04"],
  xj5: ["『흠정협기변방서』 권5 (위키문헌)", "https://zh.wikisource.org/wiki/欽定協紀辨方書_(四庫全書本)/卷05"],
  xj36: ["『흠정협기변방서』 권36 (위키문헌)", "https://zh.wikisource.org/wiki/欽定協紀辨方書_(四庫全書本)/卷36"],
  gunghap: ["궁합닷컴 「결혼 택일 일반」", "https://www.gunghap.com/taekil/taekil_ilban.php3"],
  kasiConv: ["한국천문연구원 음양력변환계산", "https://astro.kasi.re.kr/life/pageView/8"],
  kasiCal: ["한국천문연구원 달력자료(월력요항)", "https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2027"],
  law: ["법제처 관공서의 공휴일에 관한 규정", "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=285779"],
  mpm: ["인사혁신처 「올해부터 노동절, 제헌절 공휴일로」", "https://www.mpm.go.kr/mpm/comm/newsPress/newsPressRelease/?cntId=4250&mode=view"],
  kca: ["한국소비자원 「결혼 비용, 예식 시기 따라 최대 325만 원 차이」(2026-08-05)", "https://www.kca.go.kr/home/sub.do?menukey=4002&mode=view&no=1004540488"],
  kma: ["기상청 기후평년값(1991~2020) 기후표", "https://data.kma.go.kr/normals/table.do"]
};
const HELP = {
  how: { t: "이렇게 골랐어요", p: [
    "신부 띠로 결혼하기 좋은 달을 보고(가취월), 신랑·신부 나이로 좋은 날을 봐요(생기복덕).",
    "전통 혼인 택일에서 꺼린다고 전해지는 날(월파·해일·본명일·월염·염대·월살·천강·하괴·홍사·동지·하지·단오·사월초파일)은 후보에서 빼요.",
    "요즘 택일 안내에서 흔히 피하는 다섯 가지(천적·수사·피마·월기일·띠 상충)는 빼지 않고 순서만 뒤로 보내요.",
    "생기·천의·복덕, 대리월, 황도일·천덕·월덕·음양부장 길일·오합일이 많이 겹칠수록 앞에 보여 드려요.",
    "책과 학파마다 기준이 갈리는 곳(달을 절기로 셀지 음력으로 셀지, 띠와 나이를 언제 바꿀지)은 모든 기준에서 통과한 날만 골랐어요.",
    "‘나쁜 날’은 따로 표시하지 않아요. 손없는 날은 택일 규칙이 아니라 민간 풍속이라 따로 표시했어요."
  ], s: ["lee2016", "encyChungi"] },
  why: { t: "택일 결과가 곳마다 다른 이유", p: [
    "택일은 하나의 공식이 아니라 여러 책과 학파의 규칙 묶음이에요. 어떤 규칙을 쓰고 무엇을 더 무겁게 보는지, 달을 절기로 나누는지 음력으로 나누는지, 띠·나이를 언제 바꾸는지에 따라 같은 생년월일로도 다른 날이 나와요.",
    "한국 음력 대신 중국 음력을 쓰면 설날 무렵 날짜가 하루씩 밀리기도 해요.",
    "그래서 이 결과는 참고용이고, 과학적 근거가 있는 예측이 아니에요."
  ], s: ["lee2016", "kim2009"] },
  sb: { t: "생기복덕", p: [
    "나이와 성별에 따라 날마다 좋고 나쁨이 달라진다고 보는 전통 택일법이에요. 조선 시대 택일서 『천기대요』에 실려 있고, 생기·천의·복덕은 가장 좋은 날로 봅니다.",
    "이 사이트는 신랑·신부 두 사람의 세는 나이(태어난 해를 1살로 치는 나이)로 각각 봐요."
  ], s: ["encyIljin", "sb2022"] },
  daeri: { t: "대리월 (가취월)", p: [
    "조선 시대 택일서 『천기대요』 혼인편에 나오는, 신부의 띠로 결혼하기 좋은 달을 고르는 법이에요. 띠마다 ‘크게 좋은 달(대리월)’이 정해져 있다고 봅니다.",
    "청나라 공식 택일서 『협기변방서』는 이 법을 근거 없다며 공식 달력에서 뺐지만, ‘세상은 다 쓴다’고 적어 둘 만큼 널리 쓰였어요.",
    "달을 절기로 세는 곳과 음력으로 세는 곳이 있어서, 이 사이트는 두 기준 모두 대리월일 때만 표시해요."
  ], s: ["encyChungi", "xj36"] },
  hwangdo: { t: "황도일", p: [
    "열두 신이 날마다 돌아가며 맡는데, 그중 청룡·명당·금궤·천덕·옥당·사명 여섯 신이 맡는 날을 ‘황도일’이라 하여 좋은 날로 봅니다.",
    "한국 택일서와 혼인 택일 안내에서 다른 좋은 날과 겹치면 좋다고 꼽혀 왔어요."
  ], s: ["lee2016"] },
  deok: { t: "천덕·월덕", p: [
    "하늘과 달의 덕이 머문다고 보는 날(천덕·월덕)과 그와 짝을 이루는 날(천덕합·월덕합)이에요. 전통 택일에서 혼인을 포함한 거의 모든 일에 좋은 날로 꼽혀 왔어요.",
    "청나라 공식 택일서 『협기변방서』도 혼인에 좋은 날의 첫머리에 이 날들을 둡니다. 판본마다 날이 갈리는 2·5·8·11월의 천덕·천덕합은 표시하지 않아요."
  ], s: ["xj5", "encyIljin"] },
  bujang: { t: "음양부장 길일", p: [
    "음(여자)과 양(남자)의 기운이 서로 다치지 않는 날이라 하여 혼인에 좋다고 전해 온 날이에요.",
    "중국 청나라 택일서 『협기변방서』와 한국 택일서에 달마다 날이 정해져 있는데 판본마다 조금씩 달라서, 이 사이트는 두 판본에 모두 있는 날만 표시해요."
  ], s: ["xj4", "lee2016"] },
  ohap: { t: "오합일", p: [
    "해와 달, 음과 양, 사람, 쇠와 돌, 강과 바다 다섯 가지가 합한다고 보는 날(호랑이날·토끼날)이에요.",
    "한국 택일서에서 혼인에 좋고 작은 흉한 기운을 눌러 준다고 봐요. 엿새에 하루꼴로 자주 와서 작게만 반영했어요."
  ], s: ["gunghap"] },
  son: { t: "손없는 날", p: [
    "‘손’은 날짜에 따라 방향을 옮겨 다닌다고 믿어 온 민간의 귀신이에요. 음력 날짜 끝자리가 9·0인 날(9·10·19·20·29·30일)은 손이 없다고 보아 이사·혼인 같은 큰일에 써 왔어요.",
    "원래 이사·집수리에서 많이 따지던 풍속이고, 결혼 날로 넓혀 쓴 것은 근래의 일로 봐요. 그래서 택일 규칙과 따로 표시하고 순서에는 넣지 않았어요."
  ], s: ["encySon", "kim2009"] },
  leap: { t: "윤달", p: [
    "윤달은 달력을 맞추려고 끼워 넣은 ‘덤 달’이라 탈이 없다고 보아, 조선 후기 기록에는 결혼하기 좋은 달로 나와요.",
    "요즘은 윤달 결혼을 꺼리는 집안도 있어서, 좋다·나쁘다 표시 없이 윤달이라는 것만 알려 드려요. 어른들 의견을 함께 살피면 좋아요."
  ], s: ["encyLeap", "kim2009"] },
  zodiac: { t: "띠는 입춘 기준", p: [
    "택일에서는 한 해가 설날이 아니라 ‘입춘’(보통 2월 4일 무렵)에 바뀐다고 봐요. 그래서 1월~2월 초에 태어나면 흔히 아는 띠와 다르게 계산될 수 있어요.",
    "입춘 날 태어났다면, 태어난 시간을 받지 않으니 두 띠 모두로 보고 둘 다 통과한 날만 골라요."
  ], s: ["encySaju"] },
  lunar: { t: "음력 날짜", p: [
    "음력 날짜는 한국천문연구원 음양력 자료 그대로예요. 한국은 한국 시간으로 음력을 정해서, 중국 달력과 하루 다른 날(예: 2027년 설날 한국 2월 7일, 중국 2월 6일)이 있어요."
  ], s: ["kasiConv", "kasiCal"] },
  holiday: { t: "공휴일", p: [
    "「관공서의 공휴일에 관한 규정」(2026년 4월 개정, 노동절·제헌절 추가)대로 넣었고, 2027년은 정부가 발표한 월력요항과 같아요.",
    "2028년은 공식 발표(2027년 6월 예정) 전이라 ‘예정’으로 표시했어요. 임시공휴일은 미리 알 수 없어서 넣지 않았어요."
  ], s: ["law", "mpm"] },
  long: { t: "연휴", p: [
    "토·일요일과 공휴일이 사흘 이상 이어지는 때를 연휴로 표시했어요.",
    "연휴 중 예식은 하객이 여행 계획 때문에 참석을 망설일 수 있다는 의견도 있어요(공식 통계는 아니에요)."
  ], s: ["law"] },
  cost: { t: "달마다 결혼 비용", p: [
    "한국소비자원이 2025년 4월~2026년 6월 계약 11만 건을 분석해 2026년 8월에 발표한 전국 평균이에요(결혼식장 + 스드메, 토요일 점심 예식 기준).",
    "가장 비싼 달은 4월 2,238만 원, 가장 싼 달은 1월 1,913만 원이에요. 지역·예식장마다 실제 가격은 달라요. 성수기·비수기도 한국소비자원 구분이에요."
  ], s: ["kca"] },
  weather: { t: "날씨 (서울 평년값)", p: [
    "기상청이 1991~2020년 30년 관측을 평균한 서울의 ‘평년값’이에요. 특정 날짜의 예보가 아니라 그 달의 보통 날씨예요.",
    "‘비’는 그 달에 하루 0.1mm 이상 비나 눈이 온 날 수예요. 봄·가을 예식철(3~6월·9~11월) 가운데 10월이 비 오는 날이 가장 적어요."
  ], s: ["kma"] }
};
const SEASONS = [["all","전체"],["spring","봄"],["summer","여름"],["fall","가을"],["winter","겨울"]];
const SEASON_OF = m => m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "fall" : "winter";
const YEARS = [["all","2년 모두"],["2027","2027년"],["2028","2028년"]];
const WKS = [["all","토·일·공휴일"],["sat","토요일만"],["sun","일요일만"]];
const WEEK = "일월화수목금토";
// =========================================================

const S = {
  bride: { cal: "solar", y: "", m: "", d: "", leap: false },
  groom: { cal: "solar", y: "", m: "", d: "", leap: false },
  year: "all", season: "all", wk: "all", sort: "rank", check: ""
};
let EV = null, PB = null, PG = null;   // 계산 결과(날마다), 신부·신랑

function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function qbtn(key, label){ return `<button class="qm" data-help="${key}" aria-label="${esc(label || HELP[key].t)} 설명 보기">?</button>`; }
function num(n){ return Number(n).toLocaleString("ko-KR"); }
function dateText(n, short){ const [y, m, d] = ymdOf(n); return short ? `${y}. ${m}. ${d} (${WEEK[weekdayOf(n)]})` : `${y}년 ${m}월 ${d}일 (${WEEK[weekdayOf(n)]})`; }

// ===== (?) 설명 창 =====
function openHelp(key){
  const h = HELP[key]; if(!h) return;
  closeHelp();
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-labelledby", "sheetT");
  sh.innerHTML = `
    <h3 id="sheetT">${esc(h.t)}</h3>
    ${h.p.map(x => `<p>${esc(x)}</p>`).join("")}
    <p class="src-h">대표 출처</p>
    <ul class="src">${h.s.map(k => `<li><a href="${esc(SRC[k][1])}" target="_blank" rel="noopener">${esc(SRC[k][0])}</a></li>`).join("")}</ul>
    <button class="btn ghost" id="sheetX">닫기</button>`;
  document.body.appendChild(bg); document.body.appendChild(sh);
  bg.onclick = closeHelp; document.getElementById("sheetX").onclick = closeHelp;
  document.getElementById("sheetX").focus();
}
function closeHelp(){ ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); }); }
document.addEventListener("keydown", e => { if(e.key === "Escape") closeHelp(); });
// (?) 버튼은 화면을 다시 그려도 되게 한 번만 걸어 둬요
app.addEventListener("click", e => { const b = e.target.closest("[data-help]"); if(b){ e.preventDefault(); openHelp(b.dataset.help); } });

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>2027~2028</span></div>
    ${brandLogo()}
    <p class="for">결혼 날짜 고르는 예비부부를 위한</p>
    <h1>결혼 날짜,<br>날 받아 오래요?</h1>
    <div class="bar"></div>
    <p class="lead">신랑·신부 생년월일만 넣으면, 전통 택일법으로 본 좋은 날 후보를 공휴일·연휴·비용과 함께 보여 드려요.</p>
    <div class="pick">
      <button id="start"><span>좋은 날 찾기</span><span class="q">생년월일 2개</span></button>
    </div>
    <p class="note">※ ${esc(BASIS)} ${esc(STANCE)} <button class="text-btn inline" data-help="why">왜 곳마다 다를까요?</button></p>
    <p class="note">${esc(PRIVACY)}</p>
    ${foot()}`;
  document.getElementById("start").onclick = () => ask("bride");
}

// ===== 생년월일 =====
function personFrom(x, male){
  if(!x.y || !x.m || !x.d) return null;
  let ymd = [+x.y, +x.m, +x.d];
  if(x.cal === "lunar"){ ymd = lunarToSolar(+x.y, +x.m, +x.d, x.leap && hasLeap(+x.y, +x.m)); if(!ymd) return null; }
  else { const t = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2])); if(t.getUTCMonth() !== ymd[1] - 1) return null; }
  if(ymd[0] < 1949 || ymd[0] > 2010) return null;
  return personOf(ymd[0], ymd[1], ymd[2], male);
}
function dayMax(x){
  if(!x.y || !x.m) return 31;
  if(x.cal === "lunar") return lunarMonthLen(+x.y, +x.m, x.leap && hasLeap(+x.y, +x.m)) || 30;
  return new Date(Date.UTC(+x.y, +x.m, 0)).getUTCDate();
}
function opts(from, to, sel, unit){ let h = `<option value="">${unit}</option>`; for(let v = from; v <= to; v++) h += `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${v}${unit}</option>`; return h; }
function ask(who){
  plain();
  const x = S[who], male = who === "groom", step = male ? 2 : 1, role = male ? "신랑" : "신부";
  const ys = x.cal === "lunar" ? [1949, 2010] : [1950, 2010];
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span class="count">${pad(step)} / ${pad(2)}</span></div>
    <h2 class="question">${role}의 생년월일을\n알려 주세요</h2>
    <div class="birth">
      <div class="seg" role="group" aria-label="양력 음력">
        <button class="sg${x.cal === "solar" ? " on" : ""}" data-cal="solar" aria-pressed="${x.cal === "solar"}">양력</button>
        <button class="sg${x.cal === "lunar" ? " on" : ""}" data-cal="lunar" aria-pressed="${x.cal === "lunar"}">음력</button>
      </div>
      <div class="ymd">
        <select class="in" id="by" aria-label="태어난 해">${opts(ys[0], ys[1], x.y, "년")}</select>
        <select class="in" id="bm" aria-label="태어난 달">${opts(1, 12, x.m, "월")}</select>
        <select class="in" id="bd" aria-label="태어난 날">${opts(1, dayMax(x), x.d, "일")}</select>
      </div>
      <label class="leap" id="leapRow" hidden><input type="checkbox" id="leap"${x.leap ? " checked" : ""}> 윤달이에요</label>
      <p class="zline" id="zline" aria-live="polite"></p>
    </div>
    <div class="btns">
      <button class="btn main" id="next" disabled>${male ? "좋은 날 보기" : "다음"}</button>
    </div>
    <div class="under">${male ? '<button class="text-btn" id="back">이전</button>' : "<span></span>"}<button class="text-btn" id="home">처음으로</button></div>
    <p class="note small">${esc(PRIVACY)}</p>
    ${foot()}`;
  const by = document.getElementById("by"), bm = document.getElementById("bm"), bd = document.getElementById("bd");
  const leapRow = document.getElementById("leapRow"), leap = document.getElementById("leap"), z = document.getElementById("zline"), next = document.getElementById("next");
  const paint = () => {
    const showLeap = x.cal === "lunar" && x.y && x.m && hasLeap(+x.y, +x.m);
    leapRow.hidden = !showLeap; if(!showLeap) x.leap = false;
    const max = dayMax(x);
    if(+x.d > max) x.d = "";
    bd.innerHTML = opts(1, max, x.d, "일");
    const p = personFrom(x, male);
    next.disabled = !p;
    if(p){
      const zs = zodiacOf(p), solar = x.cal === "lunar" ? ` · 양력 ${p.y}년 ${p.m}월 ${p.d}일` : "";
      z.innerHTML = (zs.length > 1 ? `입춘 무렵에 태어나 ${esc(zs.join("띠·"))}띠 둘 다로 봐요` : `입춘 기준 ${esc(zs[0])}띠`) + esc(solar) + " " + qbtn("zodiac");
    } else z.innerHTML = x.y && x.m && x.d ? "없는 날짜예요. 다시 확인해 주세요." : "";
  };
  app.querySelectorAll("[data-cal]").forEach(b => b.onclick = () => {
    if(x.cal === b.dataset.cal) return;
    x.cal = b.dataset.cal; x.leap = false; if(x.cal === "solar" && +x.y < 1950) x.y = "";
    ask(who);
  });
  by.onchange = () => { x.y = by.value; paint(); };
  bm.onchange = () => { x.m = bm.value; paint(); };
  bd.onchange = () => { x.d = bd.value; paint(); };
  leap.onchange = () => { x.leap = leap.checked; paint(); };
  next.onclick = () => { if(!personFrom(x, male)) return; if(male) go(); else ask("groom"); };
  const back = document.getElementById("back"); if(back) back.onclick = () => ask("bride");
  document.getElementById("home").onclick = home;
  paint();
}

// ===== 계산 =====
function go(){
  PB = personFrom(S.bride, false); PG = personFrom(S.groom, true);
  if(!PB || !PG){ ask(PB ? "groom" : "bride"); return; }
  EV = DAYS.map((_, i) => evaluate(i, PB, PG));
  S.check = "";
  reveal("좋은 날 후보,\n찾았어요!", result);
}
function longOf(iso){ const l = LONG.find(x => x[0] <= iso && iso <= x[1]); return l ? l[2] : 0; }
function isPool(e){
  const iso = isoOf(e.n), wd = weekdayOf(e.n), [y, m] = ymdOf(e.n);
  const day = S.wk === "sat" ? wd === 6 : S.wk === "sun" ? wd === 0 : (wd === 0 || wd === 6 || !!HOLI[iso]);
  return day && (S.year === "all" || String(y) === S.year) && (S.season === "all" || SEASON_OF(m) === S.season);
}
function pickList(){
  const pool = EV.filter(e => !e.out && isPool(e));
  const top = pool.slice().sort((a, b) => b.score - a.score || a.n - b.n).slice(0, TOP_N);
  if(S.sort === "date") top.sort((a, b) => a.n - b.n);
  return { top, poolSize: pool.length };
}

// ===== 칩 =====
function goodChips(e){
  const L = e.good.map(g =>
    g.k === "sb" ? [`${g.who} ${g.name}`, "sb"] :
    g.k === "daeri" ? ["신부 대리월", "daeri"] :
    g.k === "hwangdo" ? ["황도일", "hwangdo"] :
    g.k === "deok" ? [`${g.name}일`, "deok"] :
    g.k === "bujang" ? ["음양부장 길일", "bujang"] :
    ["오합일", "ohap"]);
  return L;
}
function realChips(e){
  const iso = isoOf(e.n), [y, m] = ymdOf(e.n), L = [];
  if(HOLI[iso]) L.push([HOLI[iso] + (iso >= HOLI_TENTATIVE_FROM ? " (예정)" : ""), "holiday"]);
  const lg = longOf(iso); if(lg) L.push([`${lg}일 연휴`, "long"]);
  const c = COST[m - 1]; L.push([`${c[1] ? "성수기" : "비수기"} · 평균 ${num(c[0])}만 원`, "cost"]);
  const w = WEATHER[m - 1]; L.push([`서울 평년 ${Math.round(w[0])}℃ · 비 ${Math.round(w[1])}일`, "weather"]);
  return L;
}
function chip([label, key], cls){ return `<button class="chip ${cls}" data-help="${key}">${esc(label)}<span class="qi" data-html2canvas-ignore aria-hidden="true">?</span></button>`; }
function dayHtml(e, i){
  const good = goodChips(e);
  return `
    <section class="day">
      <div class="d-head">${i === null ? "" : `<span class="d-n">${i + 1}</span>`}<span class="d-t"><b class="d-date">${esc(dateText(e.n))}</b><button class="d-lunar" data-help="lunar">음력 ${e.leap ? "윤" : ""}${e.lm}월 ${e.ld}일</button></span></div>
      <div class="row"><span class="rl">현실</span><span class="chips">${realChips(e).map(c => chip(c, "real")).join("")}</span></div>
      <div class="row"><span class="rl">전통</span><span class="chips">${good.map(c => chip(c, "good")).join("")}${e.son ? chip(["손없는 날 (민간)", "son"], "son") : ""}${e.leap ? chip(["윤달", "leap"], "son") : ""}${!good.length && !e.son ? `<span class="none">${esc(NONE_GOOD)}</span>` : ""}</span></div>
    </section>`;
}

// ===== 결과 =====
function seg(list, cur, key){ return `<div class="seg">${list.map(([v, l]) => `<button class="sg${cur === v ? " on" : ""}" data-${key}="${v}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`; }
function who(){
  const zb = zodiacOf(PB), zg = zodiacOf(PG);
  return `신부 ${zb.join("·")}띠 · 신랑 ${zg.join("·")}띠`;
}
function result(){
  plain();
  const { top, poolSize } = pickList();
  const filt = [YEARS.find(x => x[0] === S.year)[1], SEASONS.find(x => x[0] === S.season)[1] === "전체" ? "" : SEASONS.find(x => x[0] === S.season)[1], WKS.find(x => x[0] === S.wk)[1]].filter(Boolean).join(" · ");
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>${esc(who())}</span></div>
    <div class="stance">
      <p>${esc(BASIS)} ${esc(STANCE)}</p>
      <div class="stance-b"><button class="text-btn inline" data-help="how">이렇게 골랐어요</button><button class="text-btn inline" data-help="why">왜 곳마다 다를까요?</button></div>
    </div>
    <div class="conds" role="group" aria-label="조건 바꾸기">
      ${seg(YEARS, S.year, "year")}
      ${seg(SEASONS, S.season, "season")}
      ${seg(WKS, S.wk, "wk")}
    </div>
    <article class="card" id="card">
      <div class="head"><span class="kind">결혼 좋은 날 후보</span><span class="handle">@wed_voice.su</span></div>
      <h2 class="res-h">${top.length ? `좋은 날 후보<br>${top.length}개` : "이 조건엔<br>후보가 없어요"}</h2>
      <p class="line">${esc(who())}</p>
      <p class="desc">${esc(filt)} · ${S.sort === "date" ? "날짜순" : "좋은 기운이 많이 겹치는 순"}${poolSize > top.length ? ` · 후보 ${poolSize}일 중 ${top.length}개` : ""}</p>
      ${top.length ? "" : `<p class="empty">연도나 계절, 요일을 넓혀 보세요.</p>`}
      ${top.map((e, i) => dayHtml(e, i)).join("")}
      <p class="card-note">※ ${esc(BASIS)} ${esc(STANCE)}</p>
      ${sign()}
    </article>
    <div class="after">
      ${top.length > 1 ? `<div class="sortrow">${seg([["rank","추천순"],["date","날짜순"]], S.sort, "sort")}</div>` : ""}
      <p class="hint">후보 날짜를 들고 예식장 빈 날과 맞춰 보세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copyAll"${top.length ? "" : " disabled"}>후보 날짜 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
        <textarea class="in manual" id="manual" readonly hidden></textarea>
      </div>
      <div class="check" id="checkBox">
        <label class="lbl" for="checkIn">이미 생각해 둔 날이 있어요</label>
        <input class="in" id="checkIn" type="date" min="2027-01-01" max="2028-12-31" value="${esc(S.check)}">
        <div id="checkOut"></div>
      </div>
      <div class="btns">
        <button class="btn ghost" id="again">생년월일 다시 넣기</button>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="home">처음으로</button>
      </div>
    </div>`;
  prepareImage("결혼좋은날-후보");
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copyAll").onclick = () => copyText(allText(top));
  app.querySelectorAll("[data-year]").forEach(b => b.onclick = () => { S.year = b.dataset.year; result(); });
  app.querySelectorAll("[data-season]").forEach(b => b.onclick = () => { S.season = b.dataset.season; result(); });
  app.querySelectorAll("[data-wk]").forEach(b => b.onclick = () => { S.wk = b.dataset.wk; result(); });
  app.querySelectorAll("[data-sort]").forEach(b => b.onclick = () => { S.sort = b.dataset.sort; result(); });
  const ci = document.getElementById("checkIn");
  ci.onchange = () => { S.check = ci.value; paintCheck(); };
  paintCheck();
  document.getElementById("again").onclick = () => ask("bride");
  document.getElementById("home").onclick = home;
}
// 이미 생각해 둔 날: 그날의 좋은 점만 (빠지는 날이어도 "나쁜 날"이라고 쓰지 않아요 — 기획 5가지 중 4번)
function paintCheck(){
  const out = document.getElementById("checkOut"); if(!out) return;
  if(!S.check){ out.innerHTML = ""; return; }
  const n = dayNoOf(+S.check.slice(0, 4), +S.check.slice(5, 7), +S.check.slice(8, 10)), i = n - D0;
  if(i < 0 || i >= EV.length){ out.innerHTML = `<p class="none">2027년 1월 ~ 2028년 12월 날짜만 볼 수 있어요.</p>`; return; }
  out.innerHTML = dayHtml(EV[i], null);
}

// ===== 문구 복사 =====
function allText(top){
  const L = [`[결혼 좋은 날 후보] ${who()}`];
  top.forEach((e, i) => {
    const iso = isoOf(e.n), parts = goodChips(e).map(c => c[0]);
    if(e.son) parts.push("손없는 날");
    if(HOLI[iso]) parts.push(HOLI[iso] + (iso >= HOLI_TENTATIVE_FROM ? "(예정)" : ""));
    const lg = longOf(iso); if(lg) parts.push(`${lg}일 연휴`);
    L.push(`${i + 1}. ${dateText(e.n)} 음력 ${e.leap ? "윤" : ""}${e.lm}월 ${e.ld}일${parts.length ? " — " + parts.join(" · ") : ""}`);
  });
  L.push("", "※ " + BASIS + " " + STANCE, "결혼식사회자 이상운 @wed_voice.su");
  return L.join("\n");
}
async function copyText(value){
  const msg = document.getElementById("msg"), manual = document.getElementById("manual");
  let ok = false;
  try{ await navigator.clipboard.writeText(value); ok = true; }
  catch(e){
    // 카톡·인스타 안에서 열면 클립보드가 막힐 때가 있어요 → 예전 방식으로 한 번 더
    const t = document.createElement("textarea");
    t.value = value; t.setAttribute("readonly", ""); t.className = "hiddenbox";
    document.body.appendChild(t); t.select();
    try{ ok = document.execCommand("copy"); }catch(_){}
    t.remove();
  }
  if(ok){ manual.hidden = true; msg.textContent = "복사했어요. 카톡이나 문자에 붙여 넣으세요."; }
  else {
    manual.value = value; manual.hidden = false;
    manual.rows = Math.min(14, value.split("\n").length + 1);
    msg.textContent = "아래 문구를 길게 눌러 복사해 주세요.";
    manual.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>2027~2028</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>결혼 날짜,<br>날 받아 오래요?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom", "go", `<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  home();
}
route();
