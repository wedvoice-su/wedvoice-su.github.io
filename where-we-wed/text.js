// 웨딩홀 투어 기록표 — 화면 문구 · 질문 목록 (문구를 바꾸려면 여기만 고치면 돼요)
// {n} 같은 중괄호는 숫자 · 이름이 들어가는 자리예요. 검수용 글은 docs/웨딩홀-투어/사이트-문구.txt (docs/웨딩홀-투어/도구/문구.js로 뽑아요)
// 줄 끝의 "// …"는 그 문구가 화면 어디에 나오는지예요.
// 질문 목록은 조사(docs/웨딩홀-투어/조사/, 2026-11-16)를 바탕으로 짰어요: 양식 16개의 통합 항목표 · 후기에서 "놓쳤다"고 한 것 · 공식 자료.
// 사회자님 11/16: 쓰는 사람은 신랑신부 — ① 투어 다니며 "아 맞다, 그거 체크 안 했다"가 안 나오게 ② 입력은 편하게 ③ 적은 걸로 여러 홀을 비교해 고르기 쉽게.

// ===== 질문 묶음 = 투어 동선 순서 (바깥 → 로비 → 홀 → 대기실 → 식당 → 상담) =====
// 조사 1-5: 홀마다 도는 순서는 다르지만, 둘러보기는 "하객이 걷는 길" 순서로 적은 자료가 가장 많았어요. 위쪽 바로 가기로 어느 묶음이든 갈 수 있어요.
// id · name 묶음 이름 · jump 바로 가기 단추 이름 · lead 묶음 아래 설명 · tip 사회자 한마디(사회자 영역인 묶음에만) · cmp 비교표에서 몇 번째로 보일지(고르는 데 중요한 순)
const SECS = [
  { id: "out", name: "도착 · 주차", jump: "주차", cmp: 6, lead: "역에서 걸어 보고, 주차장을 직접 보세요. 하객 불편 1위가 주차였어요." },
  { id: "lobby", name: "로비 · 동선", jump: "로비", cmp: 7, lead: "하객이 걷는 길을 따라가 보세요." },
  { id: "hall", name: "예식홀", jump: "홀", cmp: 3, lead: "하객석 뒤쪽 · 옆쪽 자리에 직접 앉아 보세요." },
  { id: "room", name: "신부대기실 · 폐백실", jump: "대기실", cmp: 8, lead: "" },
  { id: "food", name: "식당(연회장)", jump: "식당", cmp: 4, lead: "홀에서 식당까지 걸어 보세요." },
  { id: "cost", name: "상담: 견적", jump: "견적", cmp: 1, lead: "견적서를 보면서 적어요. 할인을 받았으면 할인된 금액으로 적어요. 큰 돈은 만 원, 1인 식대는 원 단위예요." },
  { id: "deal", name: "상담: 날짜 · 계약", jump: "계약", cmp: 2, lead: "들은 말은 문자나 계약서로 받아 두세요." },
  { id: "run", name: "상담: 진행 · 반입", jump: "진행", cmp: 5, lead: "", tip: "예식 간격은 꼭 물어보세요. 간격이 짧으면 원판 사진과 부모님 인사가 서둘러져요. 외부 사회자나 축가팀을 부를 생각이면 들어올 수 있는지, 음원과 영상을 언제 어떻게 내는지도 같이 확인해 두세요." }
];

// 눈으로 보는 항목에 자주 쓰는 답
const LOOK = [["good", "좋음"], ["ok", "보통"], ["bad", "아쉬움", "bad"]];
const YN = [["yes", "있음"], ["no", "없음"]];

// ===== 질문 =====
// id 저장 이름(바꾸지 않아요) · sec 묶음 · q 질문 · short 비교표 줄 이름 · kind 답 꼴 · core true면 "꼭 확인할 것"(처음부터 보임), 아니면 "더 물어볼 것" 안에 접혀 있어요
// kind: man 만 원 · won 원 · num 숫자(unit 단위, dec 소수) · pick 하나 고르기(opts) · multi 여러 개 고르기(opts) · text 글
// see true = 눈으로 볼 것("직접 보기" 딱지) · phone true = 투어 전 전화로 먼저 물어봐도 되는 것(질문 목록 이미지 맨 위)
// why 질문 아래 작은 글 · ph 빈칸 안 흐린 글 · memoPh 메모 칸 흐린 글 · info 접힌 설명(title · body · url · urlText)
// sub 다른 답에 따라 보임: { of, when }(when은 하나 또는 목록) · 여러 조건이면 { and: [ {of, when}, … ] }
// better 비교표에서 "low"(작을수록) · "high"(클수록) 나은 칸에 ✓ · rank 고르기에서 앞쪽 답일수록 나음
// opt true = 모르면 비워 둬도 되는 딸린 질문(꼭 확인할 것에 안 셈)
// opts 3번째 칸: "bad" = 아쉬운 답(비교표 주황) · "skip" = 순위에서 뺌(못 봄 같은 답) · quick 숫자 칸 아래 자주 나오는 값 버튼
const QS = [
  // ── 도착 · 주차 (조사: 양식 16개 모두 주차를 물음, 후기 "놓친 것" 1위 11명)
  { id: "walk", sec: "out", q: "역에서 걸어서 몇 분인가요?", short: "역에서 걸어서", kind: "num", unit: "분", core: true, see: true, better: "low", quick: [3, 5, 10], ph: "예: 5", why: "지도 앱 말고 직접 걸어서 재 보세요." },
  { id: "parkN", sec: "out", q: "주차 몇 대까지 되나요?", short: "주차 대수", kind: "num", unit: "대", core: true, phone: true, better: "high", ph: "예: 300" },
  { id: "parkFree", sec: "out", q: "하객 주차는 몇 시간 무료인가요?", short: "하객 무료 주차", kind: "num", unit: "시간", dec: true, core: true, better: "high", quick: [1, 1.5, 2, 3], ph: "예: 2" },
  { id: "parkBusy", sec: "out", q: "예식 시간대 주차장, 붐비나요?", short: "주차장 붐빔", kind: "pick", core: true, see: true, rank: true, opts: [["ok", "여유"], ["busy", "붐빔", "bad"], ["unseen", "못 봄", "skip"]], why: "주말 같은 시간대에 가 보면 가장 정확해요." },
  { id: "parkStaff", sec: "out", q: "주차요원 · 주차 안내가 있나요?", short: "주차 안내", kind: "pick", core: true, rank: true, opts: [["yes", "있음"], ["no", "없음", "bad"]] },
  { id: "shuttle", sec: "out", q: "역에서 오는 셔틀버스가 있나요?", short: "셔틀", kind: "pick", rank: true, opts: YN, memoPh: "예: 10분 간격" },
  { id: "bus", sec: "out", q: "대절버스(대형버스)를 세울 곳이 있나요?", short: "대절버스", kind: "pick", rank: true, opts: YN },
  // ── 로비 · 동선
  { id: "lobby", sec: "lobby", q: "로비가 하객을 다 받을 만한가요?", short: "로비", kind: "pick", core: true, see: true, rank: true, opts: LOOK, why: "앞뒤 예식 하객이 한꺼번에 몰린다고 생각하고 보세요." },
  { id: "elev", sec: "lobby", q: "엘리베이터 · 계단 이동", short: "엘리베이터", kind: "pick", see: true, rank: true, opts: LOOK, memoPh: "예: 2대, 줄이 길다" },
  { id: "desk", sec: "lobby", q: "축의대는 우리 예식만 쓰나요?", short: "축의대", kind: "pick", rank: true, opts: [["own", "우리만"], ["shared", "앞뒤 예식과 같이", "bad"]] },
  { id: "wc", sec: "lobby", q: "화장실 · 수유실", short: "화장실", kind: "pick", see: true, rank: true, opts: LOOK },
  // ── 예식홀
  { id: "view", sec: "hall", q: "하객석에 앉아 보면 무대가 잘 보이나요?", short: "하객석 시야", kind: "pick", core: true, see: true, rank: true, opts: [["good", "잘 보임"], ["some", "가리는 자리 있음"], ["bad", "잘 안 보임", "bad"]], memoPh: "예: 왼쪽 기둥 뒤 2줄", why: "뒤쪽 · 옆쪽 자리에도 앉아 보세요. 기둥이 가리는 홀이 있어요." },
  { id: "seats", sec: "hall", q: "예식홀 좌석 수", short: "좌석 수", kind: "num", unit: "석", core: true, better: "high", ph: "예: 250", why: "보증 인원보다 적으면 서 있는 하객이 생겨요." },
  { id: "solo", sec: "hall", q: "같은 시간에 다른 홀 예식이 있나요?", short: "단독 · 동시예식", kind: "pick", core: true, rank: true, opts: [["solo", "없음 (단독)"], ["shared", "있음"]], memoPh: "예: 같은 층 2개 홀" },
  { id: "mood", sec: "hall", q: "홀 분위기", short: "분위기", kind: "pick", core: true, see: true, opts: [["dark", "어두운 홀"], ["bright", "밝은 홀"], ["mid", "중간"]] },
  { id: "flowerType", sec: "hall", q: "꽃장식은 견적에 들어 있나요?", short: "꽃장식", kind: "pick", core: true, rank: true, opts: [["base", "기본 포함"], ["up", "생화는 추가"], ["sep", "꽃 전부 따로"]], why: "기본 꽃 실물을 꼭 보세요." },
  { id: "flower", sec: "hall", q: "꽃장식 추가 비용", short: "꽃 추가 비용", kind: "man", better: "low", ph: "예: 250", sub: { of: "flowerType", when: ["up", "sep"] } },
  { id: "road", sec: "hall", q: "버진로드 길이", short: "버진로드", kind: "pick", see: true, opts: [["short", "짧음"], ["mid", "보통"], ["long", "김"]] },
  { id: "av", sec: "hall", q: "음향 · 조명 · 스크린", short: "음향 · 조명", kind: "pick", rank: true, opts: [["in", "기본 포함"], ["extra", "추가 비용"]] },
  // ── 신부대기실 · 폐백실
  { id: "room", sec: "room", q: "신부대기실 크기", short: "신부대기실", kind: "pick", core: true, see: true, rank: true, opts: [["big", "넓음"], ["mid", "보통"], ["small", "좁음", "bad"]], why: "거울 · 조명이 사진에 어떻게 나올지도 보세요." },
  { id: "roomNear", sec: "room", q: "신부대기실에서 홀까지 가까운가요?", short: "대기실 → 홀", kind: "pick", core: true, see: true, rank: true, opts: [["near", "붙어 있음"], ["far", "떨어져 있음", "bad"]] },
  { id: "roomWc", sec: "room", q: "신부대기실 전용 화장실", short: "대기실 화장실", kind: "pick", see: true, rank: true, opts: YN },
  { id: "parentRoom", sec: "room", q: "혼주 대기 · 메이크업 공간", short: "혼주 공간", kind: "pick", see: true, rank: true, opts: YN },
  { id: "paebaek", sec: "room", q: "폐백실이 있나요?", short: "폐백실", kind: "pick", opts: [["in", "있음 (포함)"], ["extra", "있음 (따로 비용)"], ["no", "없음"]] },
  // ── 식당(연회장) (후기 "놓친 것" 2위: 음식이 떨어짐 · 식사 눈치 · 주류 없음 10명)
  { id: "foodType", sec: "food", q: "식사 형태", short: "식사", kind: "pick", core: true, opts: [["buffet", "뷔페"], ["course", "코스"], ["table", "한상"]] },
  { id: "foodSeats", sec: "food", q: "식당 좌석이 보증 인원을 다 앉히나요?", short: "식당 좌석", kind: "pick", core: true, rank: true, opts: [["yes", "다 앉힘"], ["no", "모자람", "bad"]], memoPh: "예: 400석" },
  { id: "foodSame", sec: "food", q: "식당이 홀과 같은 층인가요?", short: "홀 → 식당", kind: "pick", core: true, see: true, rank: true, opts: [["same", "같은 층"], ["other", "다른 층"]] },
  { id: "drinkInc", sec: "food", q: "식대에 음료 · 주류가 들어 있나요?", short: "음료 · 주류", kind: "pick", core: true, rank: true, opts: [["all", "음료 · 주류 포함"], ["free", "주류 무제한"], ["soft", "음료만"], ["sep", "따로"]] },
  { id: "drink", sec: "food", opt: true, q: "음료 · 주류 따로 드는 돈", short: "음료 · 주류 비용", kind: "man", better: "low", ph: "예: 80", sub: { of: "drinkInc", when: ["soft", "sep"] }, why: "모르면 비워 두세요. 예상 총액에서 빠져요." },
  { id: "tasting", sec: "food", q: "시식할 수 있나요?", short: "시식", kind: "pick", rank: true, opts: [["free", "무료"], ["paid", "유료"], ["no", "안 됨", "bad"]], memoPh: "예: 계약 뒤 2명까지" },
  { id: "foodLook", sec: "food", q: "음식 가짓수 · 테이블 간격", short: "음식 · 테이블", kind: "pick", see: true, rank: true, opts: LOOK, why: "다른 예식이 있는 날이면 실제 식사를 볼 수 있어요." },
  // ── 상담: 견적 — 예상 총액 셈에 쓰는 칸 (core.js calc)
  { id: "rent", sec: "cost", q: "대관료(홀 사용료)", short: "대관료", kind: "man", core: true, phone: true, better: "low", quick: [0], ph: "예: 300", why: "무료거나 식대에 들어 있으면 0을 적고, 조건은 메모에." },
  { id: "meal", sec: "cost", q: "1인 식대", short: "1인 식대", kind: "won", core: true, phone: true, better: "low", ph: "예: 65000", why: "어른 1명 기준이에요." },
  { id: "guar", sec: "cost", q: "보증 인원", short: "보증 인원", kind: "num", unit: "명", core: true, phone: true, better: "low", ph: "예: 200", why: "하객이 덜 와도 이만큼은 식대를 내기로 약속하는 인원이에요." },
  { id: "guarCut", sec: "cost", q: "보증 인원, 나중에 줄일 수 있나요?", short: "보증 인원 줄이기", kind: "pick", core: true, rank: true, opts: [["yes", "줄일 수 있음"], ["until", "정한 날까지 일부만"], ["no", "못 줄임", "bad"]], memoPh: "예: 예식 30일 전 확정, 10%까지" },
  { id: "must", sec: "cost", q: "꼭 같이 계약해야 하는 것(필수 옵션) 비용", short: "필수 옵션", kind: "man", core: true, better: "low", quick: [0], ph: "없으면 0", memoPh: "무엇인지 (예: 본식 영상)" },
  { id: "svc", sec: "cost", q: "봉사료가 따로 붙나요?", short: "봉사료", kind: "pick", core: true, opts: [["none", "없음"], ["in", "포함"], ["add", "따로 붙음"]], why: "호텔 · 일부 뷔페 홀에 있는 줄이에요." },
  { id: "svcPct", sec: "cost", q: "봉사료는 몇 %인가요?", short: "봉사료 %", kind: "num", unit: "%", dec: true, better: "low", quick: [3, 5, 10], ph: "예: 10", sub: { of: "svc", when: "add" } },
  { id: "svcScope", sec: "cost", q: "봉사료는 어디에 붙나요?", short: "봉사료 붙는 곳", kind: "pick", opts: [["meal", "식대에만"], ["all", "전체 금액에"]], sub: { of: "svc", when: "add" } },
  { id: "vat", sec: "cost", q: "부가세(10%)는 견적에 들어 있나요?", short: "부가세", kind: "pick", core: true, opts: [["in", "포함"], ["add", "따로"]] },
  { id: "vatOnSvc", sec: "cost", opt: true, q: "부가세가 봉사료에도 붙나요?", short: "봉사료에 부가세", kind: "pick", opts: [["yes", "붙음"], ["no", "안 붙음"]], sub: { and: [{ of: "svc", when: "add" }, { of: "vat", when: "add" }] }, why: "견적서마다 달라요. 모르면 비워 두세요. 붙는 쪽으로 셈해요." },
  { id: "quoteTotal", sec: "cost", q: "견적서에 적힌 총액", short: "견적서 총액", kind: "man", core: true, ph: "예: 2105", why: "위 숫자로 셈한 값과 맞춰 볼게요. 다르면 어느 줄이 다른지 물어보세요." },
  { id: "incl", sec: "cost", q: "견적에 들어 있는 것", short: "견적에 포함", kind: "multi", opts: [["room", "신부대기실"], ["paebaek", "폐백실"], ["av", "음향 · 조명"], ["screen", "스크린"], ["flower", "꽃 기본"], ["mc", "사회자"], ["music", "연주"], ["props", "혼구용품"], ["park", "주차 지원"]], why: "들어 있는 것을 모두 눌러요." },
  { id: "guarSplit", sec: "cost", q: "보증 인원은 양가 합친 숫자인가요?", short: "양가 보증 인원", kind: "pick", opts: [["sum", "양가 합쳐서"], ["each", "양가 따로"]] },
  { id: "over", sec: "cost", q: "보증 인원보다 더 오면 1인 식대가 같나요?", short: "초과 인원 식대", kind: "won", better: "low", ph: "같으면 비워 두세요" },
  { id: "kidMeal", sec: "cost", q: "어린이 식대", short: "어린이 식대", kind: "won", better: "low", ph: "예: 30000", memoPh: "몇 살까지인지" },
  // ── 상담: 날짜 · 계약
  { id: "slot", sec: "deal", q: "원하는 날짜 · 시간이 남아 있나요?", short: "남은 날짜 · 시간", kind: "text", core: true, phone: true, ph: "예: 5월 둘째 토 12시 가능" },
  { id: "cancel", sec: "deal", q: "취소 · 환불 기준을 받았나요?", short: "취소 · 환불 기준", kind: "pick", core: true, rank: true, opts: [["photo", "기준표 받음 (사진)"], ["oral", "말로만 들음"], ["none", "못 받음", "bad"]], memoPh: "예: 150일 전까지 계약금 환불",
    why: "2025년 11월부터 예식장은 위약금 · 환급 기준을 계약서 표지에 적어야 해요. 그 장을 사진으로 찍어 두세요.",
    info: { title: "계약서에 따로 정한 게 없으면?", body: "공정거래위원회 「소비자분쟁해결기준」을 써요. 예식 150일 전까지 해제하면 계약금을 돌려받고, 그 뒤로는 예식일이 가까울수록 총비용의 10~70%를 위약금으로 내요. 계약서 내용이 먼저예요.", url: "https://www.easylaw.go.kr/CSP/OnhunqueansInfoRetrieve.laf?onhunqnaAstSeq=25&onhunqueSeq=6311", urlText: "법제처 찾기 쉬운 생활법령 (2026.11.16 확인)" } },
  { id: "special", sec: "deal", q: "들은 약속 · 혜택을 계약서(특약)에 적어 주나요?", short: "약속을 계약서에", kind: "pick", core: true, rank: true, opts: [["yes", "적어 줌"], ["notyet", "아직"], ["oral", "말로만", "bad"]], why: "할인 조건에 환불이 안 된다는 특약이 붙기도 해요. 특약 칸까지 읽어 보세요." },
  { id: "deposit", sec: "deal", q: "계약금", short: "계약금", kind: "man", better: "low", ph: "예: 100" },
  { id: "balance", sec: "deal", q: "잔금은 언제 내나요?", short: "잔금", kind: "pick", opts: [["day", "예식 당일"], ["before", "예식 전"]], memoPh: "결제 수단 (카드 · 현금)" },
  { id: "change", sec: "deal", q: "날짜를 바꿀 수 있나요?", short: "날짜 변경", kind: "pick", rank: true, opts: [["free", "가능 (수수료 없음)"], ["fee", "가능 (수수료 · 횟수 제한)"], ["no", "불가", "bad"]] },
  { id: "hold", sec: "deal", q: "계약 전에 날짜를 잡아 둘 수 있나요(가계약)?", short: "가계약", kind: "pick", rank: true, opts: [["refund", "가능 · 환불됨"], ["norefund", "가능 · 환불 안 됨"], ["no", "불가"]] },
  { id: "disc", sec: "deal", q: "할인 · 혜택과 그 조건", short: "할인 · 혜택", kind: "text", ph: "예: 50만 원, 오늘 계약하면 · 이달 말까지", why: "조건과 마감일을 문자로 받아 두세요." },
  { id: "useTime", sec: "deal", q: "홀 사용 시간 · 늦어지면 추가 요금", short: "홀 사용 시간", kind: "text", ph: "예: 70분, 넘으면 추가 요금" },
  // ── 상담: 진행 · 반입
  { id: "gap", sec: "run", q: "예식 간격(앞뒤 예식 사이 시간)", short: "예식 간격", kind: "num", unit: "분", core: true, phone: true, better: "high", quick: [30, 60, 90], ph: "예: 60", why: "간격이 짧으면 사진 · 인사 시간이 빠듯해요." },
  { id: "extSnap", sec: "run", q: "외부 스냅 · 영상 업체가 들어올 수 있나요?", short: "외부 스냅 · 영상", kind: "pick", core: true, rank: true, opts: [["ok", "가능"], ["fee", "반입료 있음"], ["no", "불가 (전속만)", "bad"]] },
  { id: "extMc", sec: "run", q: "외부 사회자 · 축가 · 연주가 들어올 수 있나요?", short: "외부 사회자 · 축가", kind: "pick", core: true, rank: true, opts: [["ok", "가능"], ["fee", "반입료 있음"], ["no", "불가 (전속만)", "bad"]] },
  { id: "ticket", sec: "run", q: "식권 정산은 어떻게 하나요?", short: "식권 정산", kind: "pick", core: true, rank: true, opts: [["used", "걷은 식권 장수로"], ["given", "나눠 준 식권 장수로"]], memoPh: "남은 식권 답례품 교환 되는지", why: "남은 식권을 돌려받는지에 따라 내는 돈이 달라져요." },
  { id: "rehearsal", sec: "run", q: "리허설을 할 수 있나요?", short: "리허설", kind: "pick", rank: true, opts: [["free", "가능 (무료)"], ["paid", "가능 (따로 비용)"], ["no", "불가", "bad"]] },
  { id: "media", sec: "run", q: "음원 · 식전영상은 언제 어떻게 내나요?", short: "음원 · 영상", kind: "text", ph: "예: USB, 일주일 전까지" }
];

// ===== 느낌 · 별점 (투어 바로 뒤에 — 느낌은 금방 흐려져요) =====
const STARS = [["mood", "분위기"], ["clean", "청결"], ["food", "식사"], ["way", "교통 · 주차"], ["staff", "담당자 응대"]];

// ===== 첫 화면 예시 표에 넣을 줄 =====
const EX_ROWS = ["meal", "guar", "parkN"];

// ===== 투어 전에 볼 곳 =====
const LINKS = [
  { name: "참가격 › 결혼서비스", desc: "지역별 예식장 대관료 · 식대 · 보증 인원 중간가격 (한국소비자원)", url: "https://www.price.go.kr" },
  { name: "서울시 공공 예식장", desc: "공공기관 공간을 예식장으로 빌려요 (지역마다 제도가 달라요)", url: "https://wedding.seoulwomen.or.kr/" }
];

// ===== 예시 기록 (홀 이름 · 숫자 모두 지어낸 것) =====
const SAMPLE = {
  guests: 200,
  halls: [
    { name: "A웨딩홀 그랜드홀", date: "2026-11-14",
      a: { walk: 5, parkN: 300, parkFree: 2, parkBusy: "ok", parkStaff: "yes", lobby: "good", view: "good", seats: 280, solo: "solo", mood: "dark", flowerType: "base", room: "big", roomNear: "near", foodType: "buffet", foodSeats: "yes", foodSame: "same", drinkInc: "all",
           rent: 200, meal: 62000, guar: 200, guarCut: "until", must: 0, svc: "none", vat: "in", quoteTotal: 1440, slot: "5월 둘째 토 12:30", cancel: "photo", special: "yes", gap: 60, extSnap: "ok", extMc: "ok", ticket: "used" },
      m: { guarCut: "한 달 전까지 10%" }, star: { mood: 5, clean: 4, food: 4, way: 5, staff: 4 }, good: "천장이 높고 버진로드가 길다", bad: "주말엔 주차장이 붐빈다고 함" },
    { name: "B컨벤션 3층", date: "2026-11-14",
      a: { walk: 2, parkN: 150, parkFree: 1.5, parkBusy: "busy", parkStaff: "yes", lobby: "ok", view: "some", seats: 220, solo: "shared", mood: "bright", flowerType: "up", flower: 330, room: "mid", roomNear: "far", foodType: "buffet", foodSeats: "yes", foodSame: "other", drinkInc: "all",
           rent: 0, meal: 68000, guar: 180, guarCut: "no", must: 50, svc: "add", svcPct: 10, svcScope: "all", vat: "add", vatOnSvc: "yes", slot: "5월 둘째 토 11시만", cancel: "oral", special: "notyet", gap: 90, extSnap: "fee", extMc: "ok", ticket: "given" },
      m: { must: "본식 영상", view: "왼쪽 기둥 뒤 2줄" }, star: { mood: 4, clean: 5, food: 5, way: 4, staff: 4 }, good: "역에서 가깝고 밝다", bad: "봉사료 · 부가세가 따로" },
    { name: "C호텔 볼룸", date: "2026-11-15",
      a: { walk: 8, parkN: 500, parkFree: 3, parkBusy: "ok", parkStaff: "yes", lobby: "good", view: "good", seats: 180, solo: "solo", mood: "dark", flowerType: "sep", flower: 600, room: "big", roomNear: "near", foodType: "course", foodSeats: "yes", foodSame: "same", drinkInc: "sep", drink: 80,
           rent: 500, meal: 120000, guar: 150, guarCut: "yes", must: 0, svc: "add", svcPct: 10, svcScope: "all", vat: "add", vatOnSvc: "yes", slot: "5월 셋째 일 13시", cancel: "photo", special: "yes", gap: 180, extSnap: "ok", extMc: "ok", ticket: "used" },
      star: { mood: 5, clean: 5, food: 5, way: 3, staff: 5 }, good: "예식 간격이 넉넉하다", bad: "좌석이 하객 수보다 적다" }
  ]
};

const T = {
  // ===== 첫 화면 =====
  name: "웨딩홀 투어 기록표",                          // 위 줄 왼쪽 (사이트 이름)
  topRight: "전부 무료",                               // 위 줄 오른쪽
  kicker: "웨딩홀 투어, 뭘 물어봐야 하죠?",            // 작은 분홍 글씨
  title: "묻고 적으면\n비교표 완성",                   // 큰 글씨
  lead: "홀마다 꼭 물어볼 질문을 보면서 답을 적으면, 같은 하객 수로 맞춘 예상 총액과 홀 비교표가 만들어져요.",   // 설명
  start: "투어 기록 시작",                             // 분홍 버튼
  startQ: "가입 없이 바로",                            // 분홍 버튼 오른쪽 작은 글씨
  resume: "쓰던 기록 이어서",                          // 쓰던 기록이 있으면 분홍 버튼
  resumeQ: "홀 {n}곳",                                 // 그 오른쪽 작은 글씨
  demo: "예시 비교표 먼저 보기",                       // 둘째 버튼
  demoQ: "홀 3곳",                                     // 둘째 버튼 오른쪽 작은 글씨
  lockTitle: "이 기기 안에만 저장돼요",                // 자물쇠 칸 굵은 글씨
  lockBody: "적은 견적과 메모는 어디에도 보내지 않아요. 한 번 열어 두면 인터넷이 약한 홀 안에서도 계속 적을 수 있어요.",   // 자물쇠 칸 설명
  exTitle: "이런 비교표가 나와요",                     // 예시 표 위 제목
  exTag: "예시",                                       // 예시 표 오른쪽 딱지
  exNote: "하객 {n}명으로 맞춘 예시예요. 숫자는 지어낸 것이에요.",   // 예시 표 아래
  otherAsk: "다른 폰에서 쓰던 기록이 있나요?",         // 쓰던 기록이 없을 때 맨 아래 글자 버튼
  otherTitle: "백업 파일로 옮길 수 있어요",            // 위 버튼을 누르면 뜨는 창 제목
  otherBody: "쓰던 기기에서 '더보기 → 백업 파일 저장'을 누르고, 그 파일을 이 기기로 보낸 다음 아래 버튼으로 불러오세요.",   // 창 설명
  noteWho: "투어 전에 질문 목록을 저장해 가도 되고, 상담 자리에서 바로 적어도 돼요. 폰 · 노트북 어디서나 돼요.",   // 맨 아래 안내
  noStore: "여기서는 창을 닫으면 적은 내용이 사라져요. 사파리 · 크롬에서 열어 주세요.",   // 저장이 안 되는 브라우저에서만

  // ===== 공개 전 화면 (?preview 없이 들어오면) =====
  soonTop: "준비 중",
  soonFor: "곧 공개돼요",
  soonLead: "인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.",
  soonInsta: "인스타 팔로우하기",
  soonOther: "신랑 입장곡 테스트 먼저 하기",

  // ===== 인스타 · 카톡 안에서 열었을 때 =====
  iaTitle: "{app}에서 열어 주세요",                    // 창 제목 ({app} = 사파리 / 크롬)
  iaBody: "{from} 안에서 적으면 기록이 {app}로 넘어가지 않아요. 투어는 여러 날에 걸쳐 적으니 {app}에서 열고 시작해 주세요.",   // 창 설명
  iaOpenChrome: "크롬에서 열기",
  iaOpenSafari: "사파리에서 열기",
  iaCopy: "링크 복사하기",
  iaStay: "여기서 그냥 할게요",
  iaHow: "화면 위 ⋯ 를 누르고 '외부 브라우저에서 열기'를 누르거나, 링크를 복사해서 사파리에 붙여 넣어 주세요.",
  iaCopied: "링크를 복사했어요. 주소창에 붙여 넣어 주세요.",

  // ===== 공통 =====
  toHome: "처음",                                      // 위 줄 왼쪽 버튼 (어디서 왔는지에 따라)
  toList: "목록",
  toCmp: "비교표",
  toHall: "홀",
  close: "닫기",
  cancel: "취소",
  undo: "되돌리기",
  change: "바꾸기",
  enter: "적기",
  demoBand: "예시 기록이에요. 숫자는 지어낸 것이고, 고쳐도 저장되지 않아요.",   // 예시를 볼 때 맨 위 띠
  demoExit: "내 기록 시작",                            // 그 띠 버튼
  offBand: "인터넷이 끊겼어요. 그래도 계속 적을 수 있어요. 적은 내용은 이 기기에 저장돼요.",   // 인터넷이 끊기면 맨 위 띠
  storeFail: "이 기기에 저장하지 못했어요. 더보기에서 백업 파일로 저장해 두세요.",
  copyFail: "복사하지 못했어요.",
  calcNote: "예상 총액은 적은 숫자로만 셈한 참고 값이에요. 실제 금액은 견적서와 계약서로 확인하세요.",   // 홀 화면 · 비교표 맨 아래

  // ===== 목록 화면 =====
  moreBtn: "더보기",                                   // 위 줄 오른쪽 버튼
  step1: "같이 맞춰 볼 하객 수",                       // 1번 제목
  guestsAsk: "예상 하객 수 적기",                      // 하객 수가 없을 때 버튼 굵은 글씨
  guestsOffSub: "적으면 모든 홀을 같은 하객 수로 셈해서 비교해요",   // 그 아래
  guestsN: "하객 {n}명",                               // 하객 수가 있을 때 굵은 글씨
  guestsOnSub: "모든 홀을 이 숫자로 셈해요",           // 그 아래
  step2: "홀마다 묻고 적기",                           // 2번 제목
  hallsN: "{n}곳",                                     // 2번 제목 오른쪽
  emptyTitle: "아직 적은 홀이 없어요",
  emptyBody: "투어 갈 홀 이름만 먼저 넣어 두면, 상담 자리에서 질문을 보면서 바로 적을 수 있어요.",
  addFirst: "+ 첫 홀 추가하기",
  addHall: "+ 홀 추가",
  step3: "비교표 보기",                                // 3번 제목
  cmpGo: "비교표 보기",                                // 버튼 (목록 · 홀 화면)
  cmpHint0: "홀을 하나 이상 적으면 볼 수 있어요.",
  cmpHint1: "홀이 2곳 이상이면 나란히 비교돼요.",
  cmpHint2: "홀끼리 같은 줄에 나란히 놓고, 이미지 · 엑셀로 저장해요.",
  tourOn: "{d} 투어",                                  // 홀 카드 · 비교표 머리 (예: 11.14 투어)
  totalNeed: "식대 · 보증 인원을 적으면 나와요",       // 예상 총액을 아직 못 낼 때
  cardLeft: "남은 것 {n}개",                           // 홀 카드 아래: 아직 안 적은 꼭 확인할 것
  cardDone: "✓ 다 확인",                               // 홀 카드 아래: 꼭 확인할 것을 다 적었을 때
  beforeTitle: "투어 가기 전에",                       // 아래 칸 제목
  beforeBody: "질문 목록을 이미지로 저장해 가면, 사이트를 열지 않고도 상담 자리에서 볼 수 있어요.",
  askShot: "질문 목록 이미지 저장",
  askShotSub: "꼭 물어볼 것만 한 장에",
  linksNote: "가격 자료는 이 사이트에 없어요. 받은 견적을 직접 적어 주세요.",

  // ===== 홀 화면 =====
  hallMenu: "편집",                                    // 위 줄 오른쪽 버튼
  tourOnLong: "{d} 투어",                              // 홀 이름 아래 (예: 2026.11.14 투어)
  tourNoDate: "투어 날짜 없음",
  detail: "자세히",                                    // 예상 총액 막대 오른쪽
  leftN: "남은 것 {n}개",                              // 홀 화면 체크 막대 굵은 글씨
  leftNone: "꼭 확인할 것을 다 했어요 ✓",              // 다 적었을 때
  leftOf: "꼭 확인할 것 {all}개 중 {done}개 했어요",   // 체크 막대 작은 글씨
  onlyLeft: "남은 것만 보기",                          // 체크 막대 오른쪽 스위치
  secLeft: "{n}개 남음",                               // 질문 묶음 제목 오른쪽
  secAllDone: "✓ 다 확인",                             // 질문 묶음 제목 오른쪽 (다 적었을 때)
  allDoneTitle: "꼭 확인할 것을 다 했어요",            // 남은 것만 보기인데 남은 게 없을 때
  allDoneBody: "적은 답과 '더 물어볼 것'은 전체 보기에서 볼 수 있어요.",
  allDoneBtn: "전체 보기",
  leaveTitle: "이 홀을 나가기 전에",                   // 홀 화면 맨 아래 칸 제목
  leaveBody: "아직 안 적은 꼭 확인할 것이 {n}개 있어요. 누르면 그 질문으로 가요.",
  leaveOk: "✓ 꼭 확인할 것을 다 했어요. 다음 홀로 가도 돼요.",
  quickAria: "자주 나오는 값",
  tagSee: "직접 보기",                                  // 질문 앞 딱지: 물어보지 않고 직접 보는 것
  qcNeed: "1인 식대와 보증 인원을 적으면 견적서 총액과 맞춰 볼 수 있어요.",   // 견적서 총액 아래
  qcSame: "위 숫자로 셈한 값과 같아요 ✓ (보증 인원 {n}명 기준)",
  qcDiff: "위 숫자로 셈하면 {calc} (보증 인원 {n}명 기준). 견적서와 {d} 차이 나요. 어느 줄이 다른지 물어보세요.",
  unkN: "안 적은 것 {n}",                              // 예상 총액 막대 오른쪽 (자세히 앞)
  unkTitle: "아직 안 적은 것 {n}개 — 총액이 달라질 수 있어요",   // 자세히 창 주황 상자 제목
  unk_rent: "대관료를 아직 안 적어서 0으로 셈했어요.",
  unk_flowerType: "꽃장식이 견적에 들어 있는지 아직 안 적었어요. 따로면 총액이 늘어요.",
  unk_must: "필수 옵션을 아직 안 적어서 0으로 셈했어요.",
  unk_drinkInc: "음료 · 주류가 식대에 들어 있는지 아직 안 적었어요. 따로면 총액이 늘어요.",
  unk_vat: "부가세가 포함인지 아직 안 적었어요. 따로면 총액이 10% 늘어요.",   // 예상 총액 자세히: 안 적은 것 안내
  unk_svc: "봉사료가 있는지 아직 안 적었어요. 따로 붙으면 총액이 늘어요.",
  unk_svcPct: "봉사료 %를 안 적어서 10%로 셈했어요.",
  unk_svcScope: "봉사료가 어디에 붙는지 안 적어서 전체 금액에 붙여 셈했어요.",
  unk_vatOnSvc: "부가세가 봉사료에도 붙는지 안 적어서 붙는 쪽으로 셈했어요.",
  splitNote: "보증 인원이 양가 따로면, 한쪽 하객이 적게 와도 그쪽 보증 인원만큼 내요. 총액이 더 늘 수 있어요.",
  askPhone: "투어 전에 전화로 먼저",                   // 질문 목록 이미지 맨 위 묶음
  askPhoneSub: "이것만 알아도 갈지 말지 정할 수 있어요",
  cellNotAsked: "안 물어봄",                           // 비교표: 꼭 확인할 것인데 비어 있는 칸
  lgBest: "그 줄에서 가장 나은 홀",                    // 비교표 아래 알림: ✓ 표시
  lgBad: "주황 글씨 = 아쉬운 답",                      // 비교표 아래 알림
  lgNa: "= 아직 모르는 칸이에요. 전화나 카톡으로 물어보고 채우세요.",   // 비교표 아래 알림 ('안 물어봄' 뒤에 붙어요)
  jumpAria: "질문 묶음으로 가기",
  moreQ: "더 물어볼 것 {n}개",                         // 묶음 아래 접힌 칸
  memoAdd: "+ 메모",                                   // 질문 아래 작은 버튼
  memoPh: "메모 (조건 · 들은 말)",
  tipTitle: "사회자 한마디",
  mineTitle: "내가 더한 질문",
  mineLead: "우리에게만 중요한 것을 질문으로 더하면, 모든 홀에 같은 칸이 생겨요.",
  mineAdd: "+ 질문 더하기",
  mineAnsPh: "답",
  mineDel: "이 질문 지우기",
  mineDeleted: "질문을 지웠어요.",
  mineAddTitle: "질문 더하기",
  mineAddBody: "모든 홀에 같은 질문 칸이 생겨요.",
  mineQPh: "예: 반려견이 같이 들어올 수 있나요?",
  mineAddOk: "더하기",
  mineNeed: "질문을 적어 주세요.",
  feelTitle: "느낌 · 별점",
  feelShort: "느낌",
  feelLead: "숫자로 안 남는 것을 적어 두세요. 하루에 여러 곳을 보면 금방 섞여요.",
  starAria: "{n}점",
  goodLbl: "좋았던 점",
  goodPh: "예: 천장이 높고 밝다",
  badLbl: "걸리는 점",
  badPh: "예: 주차장이 좁다",
  toListBtn: "홀 목록으로",
  uMan: "만 원",
  uWon: "원",
  uHeads: "명",

  // ===== 예상 총액 =====
  rowTotal: "예상 총액",
  rowPer: "1인당",
  rowHeads: "셈한 인원",
  rowStar: "별점 평균",
  baseOn: "하객 {n}명 기준",
  baseOff: "각 홀 보증 인원 기준",
  headsGuar: "보증 인원 {n}명 기준",
  headsGuests: "하객 {n}명 기준",
  headsUnder: "보증 인원 {n}명 기준 (하객 {g}명보다 많아요)",
  headsCell: "{n}명",
  headsCellUnder: "보증 인원 {n}명",
  detailTitle: "{name} 예상 총액",
  detailNeed: "예상 총액을 내려면 아래를 적어 주세요.",
  underNote: "하객 {g}명은 보증 인원 {n}명보다 적어서, 식대를 보증 인원만큼 셈했어요.",
  detailGuestsChange: "하객 수 바꾸기",
  detailGuestsSet: "하객 수를 적고 모든 홀을 같은 기준으로 셈하기",
  lnRent: "대관료",
  lnFlower: "꽃장식 · 연출",
  lnMust: "그 밖에 꼭 드는 비용",
  lnDrink: "주류 · 음료",
  lnMeal: "식대",
  lnSvc: "봉사료",
  lnOnMeal: "(식대에만)",                              // 자세히: 봉사료 줄 뒤
  lnOnSvc: "(봉사료 포함)",                            // 자세히: 부가세 줄 뒤
  lnVat: "부가세",
  lnMealX: "식대 {unit} × {n}명",
  lnMealOver: "식대 {unit} × {base}명 + {over} × {extra}명",

  // ===== 하객 수 창 =====
  gTitle: "예상 하객 수",
  gBody: "모든 홀을 같은 하객 수로 셈해야 나란히 비교돼요. 아직 모르면 비워 두세요. 그러면 각 홀의 보증 인원으로 셈해요.",
  gPh: "예: 200",
  gNote: "하객이 보증 인원보다 적으면, 식대는 보증 인원만큼 셈해요.",
  gClear: "비우기",
  gOk: "저장",
  gSaved: "하객 {n}명으로 셈해요.",
  gCleared: "각 홀의 보증 인원으로 셈해요.",

  // ===== 홀 추가 · 고치기 =====
  addTitle: "홀 추가",
  editTitle: "이름 · 투어 날짜 고치기",
  nameLbl: "홀 이름",
  namePh: "예: ○○웨딩홀 그랜드홀",
  dateLbl: "투어 날짜",
  addOk: "추가하고 적기",
  editOk: "저장",
  nameNeed: "홀 이름을 적어 주세요.",
  menuEdit: "이름 · 투어 날짜 고치기",
  menuEditSub: "",
  menuCopy: "이 홀 복사하기",
  menuCopySub: "같은 웨딩홀의 다른 홀 · 다른 시간을 적을 때",
  menuDel: "이 홀 지우기",
  menuDelSub: "지운 뒤 잠깐 되돌릴 수 있어요",
  copyTail: "(복사)",
  copied: "복사했어요. 이름을 바꿔 주세요.",
  deleted: "{name} 기록을 지웠어요.",

  // ===== 더보기 · 백업 =====
  moreTitle: "더보기",
  moreBody: "기록은 이 기기에만 있어요. 폰을 바꾸거나 다른 기기에서 이어 쓰려면 백업 파일을 저장해 두세요.",
  bkSave: "백업 파일 저장",
  bkSaveSub: "다른 기기로 옮기거나 보관할 때",
  bkLoad: "백업 파일 불러오기",
  bkLoadSub: "다른 기기에서 저장한 파일",
  bkInApp: "{from} 안에서는 파일 저장 · 불러오기가 안 될 수 있어요. 안 되면 {app}에서 열어 주세요.",
  bkSaved: "백업 파일을 저장했어요.",
  bkBad: "이 사이트의 백업 파일이 아니거나, 홀이 없는 파일이에요.",
  wipe: "기록 모두 지우기",
  wipeSub: "이 기기에서 지워요",
  wipeTitle: "기록을 모두 지울까요?",
  wipeBody: "홀 {n}곳의 기록이 이 기기에서 지워져요.",
  wipeOk: "모두 지우기",
  wiped: "모두 지웠어요.",
  demoNoSave: "예시 기록은 저장하지 않아요.",
  loadTitle: "백업 파일 불러오기",
  loadBody: "홀 {n}곳: {names}",
  loadAdd: "지금 기록(홀 {n}곳)에 더하기",
  loadSwap: "지금 기록을 지우고 바꾸기",
  loadGo: "불러오기",
  loaded: "불러왔어요.",

  // ===== 비교표 =====
  cmpTitle: "웨딩홀 비교표",
  colItem: "항목",
  grpTotal: "한눈에 보기",                             // 비교표 맨 위 묶음 이름 (예상 총액 · 1인당 · 셈한 인원)
  cellNeed: "식대 · 보증 인원 필요",
  sortAria: "홀 순서",
  sort_tour: "투어 순",
  sort_total: "총액 낮은 순",
  sort_star: "별점 높은 순",
  diffOnly: "다른 것만",
  cmpOne: "홀을 하나 더 적으면 나란히 비교돼요.",
  swipe: "표를 옆으로 밀면 다른 홀이 보여요.",
  outTitle: "저장 · 보내기",
  outImg: "비교표 이미지 저장",
  outImgSub: "부모님께 카톡으로 보내기 좋아요",
  outXlsx: "엑셀로 저장",
  outXlsxSub: "하객 수 · 견적을 고치면 총액이 다시 셈해져요",
  outTxt: "글로 복사",
  outTxtSub: "카톡 · 메모장에 붙여 넣기",
  imgMaking: "이미지를 만드는 중이에요…",
  imgSaved: "이미지를 저장했어요.",
  imgFail: "이미지를 만들지 못했어요. 화면을 캡처해 주세요.",
  txtCopied: "글을 복사했어요.",
  txtTail: "— 웨딩홀 투어 기록표 (결혼식사회자 이상운)",
  shotKicker: "웨딩홀 투어 기록표",
  askTitle: "웨딩홀 투어 질문 목록",
  askSub: "홀을 도는 순서대로 하나씩 체크하세요",
  askNote: "답을 '웨딩홀 투어 기록표'에 적으면 홀끼리 비교표로 나와요.",
  askFile: "웨딩홀투어_질문목록",
  fileName: "웨딩홀비교",

  // ===== 엑셀 =====
  xSheet1: "비교표",
  xSheet2: "전체 기록",
  xNote: "하객 수(B3)나 견적 숫자를 고치면 예상 총액이 다시 셈해져요. 참고 값이에요. 실제 금액은 견적서 · 계약서로 확인하세요.",
  xGuests: "하객 수",
  xGuestsNote: "비우면 각 홀의 보증 인원으로 셈해요",
  xMeal: "1인 식대",
  xOver: "초과 인원 식대 (비우면 같음)",
  xGuar: "보증 인원 (명)",
  xSvc: "봉사료 (%)",
  xScope: "봉사료를 전체에 붙임 (1) · 식대에만 (0)",
  xVat: "부가세 (%)",
  xVatOnSvc: "부가세를 봉사료에도 붙임 (1 · 0)",
  xHeads: "식대를 내는 인원 (명)",
  xMealSum: "식대 합계",
  xSub: "봉사료 · 부가세 전",
  xSvcWon: "봉사료",
  xVatWon: "부가세",
  xSheet2Title: "웨딩홀 투어 전체 기록",
  xSheet2Note: "질문마다 홀별로 적은 답과 메모예요.",
  xSec: "묶음",
  xQ: "질문",
  xlsxSaved: "엑셀 파일을 저장했어요.",
  xlsxFail: "엑셀 파일을 만들지 못했어요."
};
