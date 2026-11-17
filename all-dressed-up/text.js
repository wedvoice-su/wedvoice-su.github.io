// 드레스 투어 기록 카드 — 화면 문구 · 드레스 특징 선택지 (문구를 바꾸려면 여기만 고치면 돼요)
// {n} 같은 중괄호는 숫자 · 이름이 들어가는 자리예요. 줄 끝의 "// …"는 그 문구가 화면 어디에 나오는지예요.
// 선택지는 조사(docs/드레스-투어/조사/조사.md, 2026-11-17)를 바탕으로 짰어요:
//   국내 드레스 브랜드 54곳 · 750벌 분석 논문(패션비즈니스 28-4, 2024)의 장식 분류 전부 + 실루엣 · 넥라인 · 소매 · 소재 · 트레인 용어 + 투어 후기에서 반응을 적는 말.
// 사회자님 11/17: 드레스투어 기록용 특화 메모장. 신랑 · 다른 사람이 눌러서 쉽게 정리, 선택지가 모든 드레스 특징을 덮을 것. 녹음하면서 동시에 쓰기.
// 선택지 id(앞 칸)는 저장 이름이라 바꾸지 않아요. 글자(뒤 칸)는 바꿔도 돼요.

// ===== 드레스 특징 =====
// id 저장 이름 · t 제목 · sub 제목 옆 작은 글 · one true = 하나만 고르기(아니면 여러 개) · pic 그림 단추(draw.js) · more true = "더 자세히" 안에 접혀 있음
// opts: [id, 이름, 작은 설명]
const F = [
  { id: "sil", t: "치마 모양", sub: "라인", one: true, pic: "sil", opts: [
    ["a", "A라인", "허리부터 살짝 퍼짐"],
    ["ball", "벨라인", "크게 부풀어 퍼짐"],
    ["mer", "머메이드", "무릎까지 붙다가 퍼짐"],
    ["tru", "트럼펫", "허벅지부터 퍼짐"],
    ["slim", "슬림 (H라인)", "퍼지지 않고 일자"],
    ["emp", "엠파이어", "가슴 아래부터 흘러내림"],
    ["short", "짧은 드레스", "무릎 · 종아리 길이"]
  ]},
  { id: "neck", t: "가슴 · 목 라인", sub: "넥라인", one: true, pic: "neck", opts: [
    ["str", "일자", "튜브톱"],
    ["heart", "하트", "스위트하트"],
    ["v", "V넥", ""],
    ["dv", "딥 V넥", "깊게 파임"],
    ["sq", "스퀘어", "네모"],
    ["round", "라운드", "둥글게"],
    ["boat", "보트넥", "쇄골 따라 가로로"],
    ["off", "오프숄더", "어깨 아래로 걸침"],
    ["halter", "홀터넥", "목에 거는 끈"],
    ["one", "원숄더", "한쪽 어깨만"],
    ["high", "하이넥", "목까지 덮음"],
    ["ill", "일루전", "비치는 천이 어깨를 덮음"]
  ]},
  { id: "slv", t: "어깨 · 소매", one: true, pic: "slv", opts: [
    ["none", "끈 없음", ""],
    ["strap", "얇은 끈", ""],
    ["tank", "넓은 끈", ""],
    ["cap", "캡소매", "어깨만 살짝"],
    ["short", "반팔", ""],
    ["three", "7부", "팔꿈치 아래"],
    ["long", "긴팔", ""],
    ["offs", "어깨 아래 소매", "팔에 걸친 소매"]
  ]},
  { id: "slvx", t: "소매 모양", more: true, opts: [
    ["puff", "퍼프", "봉긋하게 부푼"],
    ["bell", "나팔", "끝이 퍼짐"],
    ["sheer", "비치는 소매", ""],
    ["detach", "떼었다 붙였다", "볼레로 · 토시 · 장갑"]
  ]},
  { id: "fab", t: "천", sub: "소재 · 여러 개", pic: "fab", opts: [
    ["silk", "실크", "매끈한 광택 · 미카도 · 새틴"],
    ["bead", "비즈", "반짝이 장식이 가득"],
    ["lace", "레이스", "무늬 있는 천"],
    ["tulle", "튤", "얇은 망사 여러 겹"],
    ["glit", "글리터 튤", "반짝이 섞인 망사"],
    ["organza", "오간자", "빳빳하게 비침"],
    ["chiffon", "쉬폰", "하늘하늘 흐름"],
    ["crepe", "크레이프", "광택 없이 매끈"],
    ["taffeta", "타프타", "빳빳하고 바스락"]
  ]},
  { id: "shine", t: "반짝임", one: true, opts: [
    ["0", "없음", ""],
    ["1", "은은하게", ""],
    ["2", "반짝", ""],
    ["3", "아주 화려", ""]
  ], hint: "어두운 홀은 반짝이는 드레스가, 밝은 홀은 실크 · 레이스가 돋보인다는 말이 많아요. 정답은 아니에요." },
  // 장식: 논문(750벌)의 주름 장식 · 기타 장식 · 트리밍 항목을 모두 담고, 낯선 이름은 쉬운 말을 앞에 둠
  { id: "deco", t: "장식", sub: "여러 개", groups: [
    ["반짝이", [
      ["bead", "비즈 · 크리스털", ""],
      ["seq", "스팽글", "시퀸"],
      ["pearl", "진주", ""],
      ["stone", "큰 보석 · 스톤", ""]
    ]],
    ["붙인 장식", [
      ["appl", "레이스 꽃", "아플리케"],
      ["flower3d", "입체 꽃", ""],
      ["ribbon", "리본", ""],
      ["feather", "깃털", ""],
      ["embro", "자수", ""]
    ]],
    ["주름", [
      ["flounce", "층층 주름", "플라운스 · 티어드"],
      ["ruffle", "프릴 · 러플", ""],
      ["shirr", "잔주름", "셔링 · 스모킹"],
      ["pleat", "접은 주름", "플리츠"],
      ["drape", "감싼 주름", "드레이프"]
    ]],
    ["모양", [
      ["slit", "트임", "슬릿"],
      ["cut", "뚫린 곳", "컷아웃"],
      ["scallop", "물결 가장자리", "스캘럽"],
      ["cape", "케이프", ""],
      ["belt", "벨트", ""],
      ["over", "떼었다 붙였다", "오버스커트 · 트레인"]
    ]],
    ["", [["plain", "장식 없음", "심플"]]]
  ]},
  { id: "decoAt", t: "장식이 있는 곳", more: true, opts: [
    ["all", "전체", ""], ["chest", "가슴", ""], ["waist", "허리", ""], ["sleeve", "소매", ""], ["skirt", "치마", ""], ["back", "등", ""], ["hem", "밑단", ""]
  ]},
  { id: "pat", t: "무늬", more: true, opts: [
    ["flower", "꽃 · 잎", ""], ["geo", "도트 · 줄", ""], ["none", "무늬 없음", ""]
  ]},
  { id: "waist", t: "허리", more: true, opts: [
    ["nip", "잘록하게", ""], ["vdrop", "V자로 내려옴", "바스크"], ["low", "낮은 허리", "드롭"], ["straight", "허리선 없음", ""]
  ]},
  { id: "back", t: "등", sub: "뒷모습 · 여러 개", opts: [
    ["closed", "막혀 있음", ""],
    ["open", "깊게 파임", "오픈백"],
    ["sheer", "비치는 등", ""],
    ["cross", "끈이 교차", ""],
    ["ribbon", "큰 리본", ""],
    ["button", "단추 줄", ""],
    ["lace", "끈 묶기", "코르셋"]
  ]},
  { id: "train", t: "뒷자락", sub: "트레인", one: true, pic: "train", opts: [
    ["0", "없음", ""],
    ["1", "바닥에 살짝", ""],
    ["2", "한 걸음쯤", ""],
    ["3", "두세 걸음", ""],
    ["4", "아주 길게", ""]
  ]},
  { id: "color", t: "색", one: true, pic: "color", opts: [
    ["white", "새하얀", ""],
    ["off", "오프화이트", "살짝 크림"],
    ["ivory", "아이보리", ""],
    ["champ", "샴페인 · 누드", ""],
    ["color", "컬러", ""]
  ]},
  { id: "mood", t: "분위기", sub: "여러 개", opts: [
    ["elegant", "우아한", ""], ["lovely", "사랑스러운", ""], ["neat", "단정한", ""], ["simple", "심플한", ""],
    ["modern", "세련된", ""], ["glam", "화려한", ""], ["pure", "청순한", ""], ["lux", "고급스러운", ""],
    ["princess", "공주 같은", ""], ["chic", "시크한", ""], ["unique", "독특한", ""], ["bride", "신부다운", ""]
  ]},
  { id: "feel", t: "입어 본 느낌", sub: "신부에게 물어보기", opts: [
    ["comfy", "편해요", ""], ["light", "가벼워요", ""], ["heavy", "무거워요", ""], ["tight", "조여요", ""],
    ["walk", "걷기 불편", ""], ["gap", "가슴이 떠요", ""], ["arm", "팔 들기 불편", ""], ["sit", "앉기 불편", ""], ["hot", "더워요", ""]
  ]},
  { id: "good", t: "좋았던 점", opts: [
    ["face", "얼굴이 환해 보여", ""], ["waist", "허리가 가늘어 보여", ""], ["tall", "키가 커 보여", ""], ["shoulder", "어깨 · 쇄골이 예뻐", ""],
    ["arm", "팔뚝이 가려져", ""], ["back", "뒷모습이 예뻐", ""], ["walk", "걸을 때 예뻐", ""], ["photo", "사진 잘 나올 듯", ""],
    ["hall", "우리 홀이랑 어울려", ""], ["lux", "고급스러워", ""]
  ]},
  { id: "bad", t: "아쉬운 점", opts: [
    ["much", "너무 화려해", ""], ["plain", "너무 심플해", ""], ["stuffy", "답답해 보여", ""], ["arm", "팔뚝이 신경 쓰여", ""],
    ["short", "키가 작아 보여", ""], ["old", "나이 들어 보여", ""], ["body", "체형이 드러나", ""], ["worn", "드레스가 낡았어", ""],
    ["size", "사이즈가 안 맞아", ""], ["heavy", "너무 무거워", ""], ["cost", "추가금이 있어", ""]
  ]},
  { id: "use", t: "어디에 입을까", opts: [
    ["main", "본식", ""], ["shoot", "촬영", ""], ["second", "2부", ""]
  ]}
];
// 드레스 화면에서 묶음을 나누는 차례 (id → 묶음 제목)
const SECS = [
  { t: "모양", ids: ["sil", "neck", "slv", "slvx", "waist"] },
  { t: "천 · 장식", ids: ["fab", "shine", "deco", "decoAt", "pat"] },
  { t: "뒷모습 · 색", ids: ["back", "train", "color"] },
  { t: "느낌", ids: ["mood", "feel", "good", "bad"] },
  { t: "쓸 곳 · 돈", ids: ["use"] }
];

// 반응: 신부 마음 · 내 눈엔 (4단계)
const REACT = [["4", "😍", "최고"], ["3", "🙂", "좋아"], ["2", "😐", "애매"], ["1", "🙁", "별로"]];

// 신부에게 물어볼 말 (드레스 화면 "물어보기" 한 줄씩 넘기기 + 안내 창)
const ASK = [
  "거울 처음 봤을 때 어땠어?",
  "지금까지 입은 것 중에 몇 등이야?",
  "제일 마음에 드는 곳 한 군데만 고르면?",
  "아쉬운 곳 한 군데만 고르면?",
  "이거 입고 입장하는 모습, 상상돼?",
  "걷고, 앉고, 팔 들어 봐도 괜찮아?",
  "무겁지 않아? 식 날엔 오래 입어야 해.",
  "추가금이 있대도 이거 할 거야?"
];
// 신랑 · 동행이 볼 것 (안내 창)
const LOOK = [
  ["커튼이 열릴 때 신부 표정", "처음 3초 표정이 제일 솔직해요."],
  ["두세 걸음 떨어져서 전체 모양", "하객은 멀리서 봐요."],
  ["뒷모습과 뒷자락", "입장할 때 하객이 오래 보는 쪽이에요."],
  ["걸을 때 치마가 움직이는 모습", "걸어 달라고 부탁해 보세요."],
  ["조명을 바꿔 줄 때 반짝임", "우리 홀이 어두운지 밝은지 떠올려 보세요."],
  ["신부가 신경 쓰는 곳", "팔뚝 · 어깨 · 허리가 어떻게 보이는지요."]
];
const LOOK_TIP = [
  "고르는 건 신부, 나는 기록 담당이에요. 신부 말을 먼저 듣고 내 생각을 말해요.",
  "\"예쁘다\"보다 \"어디가\" 예쁜지 말해 주세요. 예: \"허리 라인이 예뻐\"",
  "지금은 메이크업 · 헤어 전이에요. 식 날엔 훨씬 달라 보여요.",
  "♡ 후보는 우리끼리 표시, 홀딩은 샵에 그 드레스를 잡아 달라고 한 것이에요."
];

// 샵을 나가기 전에 (조사: 투어 때 1~2벌 홀딩 · 당일 계약 혜택 · 라벨 추가금 · 촬영 벌 수 · 헬퍼비 별도)
const LEAVE = [
  ["hold", "홀딩할 드레스를 정했나요?"],
  ["perk", "당일 계약 혜택을 받아 적었나요?"],
  ["extra", "추가금이 붙는 드레스가 어느 건지 물어봤나요?"],
  ["count", "촬영 · 본식 때 몇 벌 입을 수 있는지 물어봤나요?"],
  ["helper", "헬퍼(이모님) 비용이 따로인지 물어봤나요?"]
];
// 샵 느낌 (샵 화면)
const SHOPFEEL = [
  ["rec", "추천이 나랑 잘 맞았나요?", [["good", "잘 맞음"], ["ok", "보통"], ["bad", "안 맞음"]]],
  ["cond", "드레스 상태", [["good", "깨끗"], ["ok", "보통"], ["bad", "낡음"]]],
  ["care", "응대 · 분위기", [["good", "좋음"], ["ok", "보통"], ["bad", "별로"]]]
];
const SHOPSTYLE = [["silk", "실크"], ["bead", "비즈"], ["lace", "레이스"], ["mix", "골고루"]];

// ===== 화면 문구 =====
const T = {
  name: "드레스 투어 기록 카드",
  title: "드레스 투어\n기록 카드",
  topRight: "눌러서 적기",
  kicker: "사진 못 찍는 드레스 투어",
  lead: "신랑 · 동행이 눌러서 적고, 반응은 녹음으로 남겨요. 드레스마다 그림 카드가 생겨요.",
  start: "투어 시작하기",
  startSub: "첫 샵 이름부터 적어요",
  resume: "이어서 적기",
  resumeSub: "샵 {s}곳 · 드레스 {d}벌",
  seeAll: "드레스 모아 보기",
  demo: "예시로 먼저 보기",
  guideBtn: "신랑 · 동행이 볼 것",
  lockT: "이 폰에만 저장돼요",
  lockB: "적은 내용과 녹음은 어디로도 보내지 않아요.",
  exTag: "예시",

  // 공통
  back: "‹",
  toHome: "처음",
  toTour: "샵 목록",
  toShop: "샵",
  toBack: "뒤로",
  close: "닫기",
  done: "다 했어요",
  undo: "되돌리기",
  cancel: "취소",
  save: "저장",
  del: "지우기",
  storeFail: "이 폰에 저장하지 못했어요. 저장 공간을 확인해 주세요.",
  copyFail: "복사하지 못했어요.",
  demoBand: "예시 기록이에요. 바꿔도 저장되지 않아요.",
  demoExit: "내 기록으로",

  // 샵 목록
  tourTitle: "드레스 투어",
  shopsH: "다녀온 샵",
  addShop: "＋ 샵 추가",
  addFirstShop: "＋ 첫 샵 기록하기",
  shopCount: "드레스 {n}벌",
  shopNoDress: "아직 드레스 없음",
  toAll: "드레스 모아 보기 · 고르기",
  toAllSub: "{n}벌을 한눈에, 후보는 이미지로",
  guideCard: "신랑 · 동행이 볼 것 · 물어볼 말",

  // 샵 추가 · 수정 창
  shopNewT: "{n}번째 샵",
  shopEditT: "샵 이름 · 날짜",
  shopName: "샵 이름",
  shopNamePh: "예: ○○웨딩",
  shopNameDef: "{n}번째 샵",
  shopNameNote: "비워 두면 '{n}번째 샵'으로 적어요.",
  shopDate: "투어 날짜",
  shopGo: "이 샵 기록하기",
  shopDel: "이 샵 지우기",
  shopDelT: "{name}을 지울까요?",
  shopDelB: "이 샵의 드레스 {n}벌과 녹음도 같이 지워져요.",
  shopDeleted: "{name}을 지웠어요",

  // 샵 화면
  dressesH: "입어 본 드레스",
  addDress: "＋ 드레스 추가",
  addFirstDress: "＋ 첫 드레스 기록하기",
  addFirstDressSub: "커튼이 열리면 눌러요",
  dressN: "드레스 {n}",
  infoH: "샵 정보",
  infoLead: "나중에 적어도 돼요.",
  staff: "담당 실장님",
  staffPh: "이름",
  fee: "피팅비",
  feePh: "예: 55000",
  won: "원",
  perk: "당일 계약 혜택",
  perkPh: "예: 촬영 드레스 1벌 추가",
  shopMemo: "메모",
  shopMemoPh: "샵에 대해 기억할 것",
  styleH: "이 샵이 잘하는 드레스",
  feelH: "샵 느낌",
  leaveH: "이 샵을 나가기 전에",
  leaveLeft: "{n}개 남음",
  leaveDone: "다 확인했어요",
  recsH: "이 샵 녹음",
  recShop: "상담 · 기타",
  editShop: "이름 · 날짜",

  // 드레스 화면
  bride: "신부 마음",
  me: "내 눈엔",
  pick: "후보",
  pickOn: "후보 ♥",
  hold: "홀딩",
  holdOn: "홀딩함",
  askBtn: "물어보기",
  askNext: "다음 질문",
  moreOpen: "더 자세히",
  extraCost: "이 드레스 추가금",
  extraPh: "없으면 비워 두세요",
  man: "만 원",
  dname: "샵에서 부른 이름 · 번호",
  dnamePh: "예: 로즈, 23-105",
  memo: "메모",
  memoPh: "기억할 것, 신부가 한 말",
  nextDress: "＋ 다음 드레스",
  toShopBtn: "샵으로",
  dressDel: "이 드레스 지우기",
  dressDeleted: "드레스 {n}을 지웠어요",
  picked: "후보에 넣었어요",
  unpicked: "후보에서 뺐어요",
  emptyTags: "아직 고른 특징이 없어요",
  emptyHelp: "눈에 띄는 것만 눌러도 돼요. 누르는 대로 그림이 바뀌어요.",   // 드레스 화면: 아무것도 안 골랐을 때 그림 옆 안내

  // 녹음
  recStart: "녹음",
  recStartLong: "● 녹음 시작",
  recStop: "멈추기",
  recOn: "녹음 중",
  recTo: "드레스 {n}에 저장 중",
  recToShop: "상담 녹음 저장 중",
  recIntroT: "반응을 녹음해요",
  recIntro: [
    "사진은 못 찍어도 그 순간 반응은 남겨요.",
    "드레스를 추가할 때마다 녹음이 그 드레스로 나뉘어 저장돼요.",
    "화면은 켜 둔 채로 두세요. 화면이 꺼지거나 다른 앱을 열면 녹음이 멈출 수 있어요.",
    "직원분께 \"반응만 녹음할게요\" 한마디 해 두면 마음 편해요.",
    "녹음은 이 폰에만 저장되고, 어디에도 올라가지 않아요."
  ],
  recGo: "녹음 시작하기",
  recNoT: "이 화면에선 녹음이 안 돼요",
  recNoApp: "{from} 안에서는 녹음이 안 될 수 있어요. {app}에서 열면 돼요. 다만 적은 기록은 연 곳에만 남으니, 투어 전에 {app}에서 열고 시작해 주세요.",
  recNoPerm: "마이크를 쓸 수 없어요. 설정에서 이 브라우저의 마이크를 허용한 뒤 다시 눌러 주세요.",
  recNoSupport: "이 브라우저는 녹음을 지원하지 않아요. 최신 사파리나 크롬에서 열어 주세요.",
  recCut: "녹음이 멈췄어요. 그때까지는 저장됐어요.",
  recAgain: "다시 녹음",
  recSaved: "녹음을 저장했어요",
  recPlay: "▶ 듣기",
  recPause: "❚❚ 멈춤",
  recFile: "파일로 저장",
  recDel: "녹음 지우기",
  recLen: "{m}분 {s}초",
  recLenS: "{s}초",
  recCutTag: "중간에 끊김",
  recNone: "녹음 없음",
  recHere: "녹음 {n}개",
  recDressH: "이 드레스 녹음",
  recOtherShop: "{name}에서 녹음 중이에요. 멈추고 여기서 새로 할까요?",
  recSwitch: "멈추고 여기서 녹음",
  recLeaving: "녹음 중이에요. 화면을 끄지 마세요.",

  // 모아 보기
  allTitle: "모아 보기",
  fAll: "전체",
  fPick: "후보 ♥",
  fHold: "홀딩",
  sortTour: "입은 순",
  sortBride: "신부 마음 순",
  allEmpty: "아직 기록한 드레스가 없어요.",
  pickEmpty: "후보가 없어요. 드레스 카드의 ♡를 눌러 후보에 넣어요.",
  outH: "보내기",
  outImg: "후보 카드 이미지로 저장",
  outImgSub: "예랑 · 엄마에게 보내기 좋아요",
  outImgAll: "드레스 카드 이미지로 저장",
  outImgAllSub: "후보가 없어서 신부 마음 순으로 6벌까지",
  outText: "글로 복사하기",
  outTextSub: "카톡에 붙여 넣기",
  imgMaking: "이미지를 만드는 중이에요…",
  imgSaved: "이미지를 저장했어요",
  textCopied: "복사했어요. 카톡에 붙여 넣어 주세요.",
  imgTitle: "드레스 투어 후보",
  imgTitleAll: "드레스 투어 기록",
  fileName: "드레스투어",

  // 안내 창
  guideT: "신랑 · 동행 가이드",
  guideLookH: "이것만 보세요",
  guideAskH: "신부에게 물어볼 말",
  guideTipH: "기억할 것",

  // 인스타 · 카톡 안에서 열었을 때
  iaTitle: "{app}에서 열어 주세요",
  iaBody: "{from} 안에서는 녹음이 안 될 수 있고, 적은 기록이 {app}로 넘어가지 않아요. {app}에서 열고 시작해 주세요.",
  iaOpenChrome: "크롬에서 열기",
  iaOpenSafari: "사파리에서 열기",
  iaCopy: "링크 복사하기",
  iaStay: "여기서 그냥 할게요",
  iaHow: "화면 위 ⋯ 를 누르고 '외부 브라우저에서 열기'를 누르거나, 링크를 복사해서 사파리에 붙여 넣어 주세요.",
  iaCopied: "링크를 복사했어요. 주소창에 붙여 넣어 주세요.",

  // 공개 전
  soonTop: "준비 중",
  soonFor: "곧 공개돼요",
  soonLead: "인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.",
  soonInsta: "인스타 팔로우하기",
  soonOther: "신랑 입장곡 테스트 먼저 하기"
};

// ===== 예시 기록 ("예시로 먼저 보기" · 첫 화면 미리보기) =====
const SAMPLE = {
  shops: [
    { name: "샵 A", staff: "", fee: "", perk: "촬영 드레스 1벌 추가", style: ["silk"], feel: { rec: "good", cond: "good", care: "good" }, leave: { hold: 1, perk: 1 } },
    { name: "샵 B", staff: "", fee: "", perk: "", style: ["bead", "lace"], feel: { rec: "ok", cond: "good", care: "ok" }, leave: {} }
  ],
  dresses: [
    { shop: 0, a: { sil: "mer", neck: "heart", slv: "none", fab: ["silk"], shine: "1", deco: ["plain"], back: ["open"], train: "2", color: "ivory", mood: ["elegant", "modern"], good: ["waist", "back"], bad: [], feel: ["comfy"], use: ["main"] }, bride: "4", me: "4", pick: true, hold: true, memo: "옆라인이 예쁘게 떨어짐" },
    { shop: 0, a: { sil: "ball", neck: "off", slv: "offs", fab: ["tulle", "lace"], shine: "1", deco: ["appl", "flounce"], back: ["closed"], train: "3", color: "off", mood: ["lovely", "princess"], good: ["face", "photo"], bad: ["stuffy"], use: ["shoot"] }, bride: "3", me: "4" },
    { shop: 0, a: { sil: "a", neck: "sq", slv: "cap", fab: ["crepe"], shine: "0", deco: ["belt"], back: ["button"], train: "1", color: "white", mood: ["neat", "simple"], good: [], bad: ["plain"], use: [] }, bride: "2", me: "2" },
    { shop: 1, a: { sil: "a", neck: "v", slv: "long", slvx: ["sheer"], fab: ["bead", "tulle"], shine: "3", deco: ["bead", "seq"], decoAt: ["all"], back: ["sheer"], train: "3", color: "white", mood: ["glam", "lux"], good: ["arm", "hall"], bad: ["heavy"], feel: ["heavy"], use: ["main"] }, bride: "4", me: "3", pick: true, extra: "50", memo: "어두운 홀이면 이거" },
    { shop: 1, a: { sil: "slim", neck: "halter", slv: "none", fab: ["chiffon"], shine: "0", deco: ["slit"], back: ["open"], train: "1", color: "champ", mood: ["chic"], good: ["tall"], bad: ["body"], use: ["second"] }, bride: "3", me: "2" }
  ]
};
