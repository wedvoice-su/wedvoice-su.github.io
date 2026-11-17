// 본식 스냅 요청서 ㊴ — 화면 문구와 고르는 목록 (사회자님 검수: docs/스냅-요청서/사이트-문구.txt, 만들기 node docs/스냅-요청서/도구/문구.js)
// {중괄호}는 화면에서 숫자 · 이름으로 바뀌어요. 안내 한 줄마다 근거는 docs/스냅-요청서/조사/조사.md (2026-11-17)
const T = {
  name: "본식 스냅 요청서",

  // ===== 첫 화면 =====
  kicker: "작가님은 우리 가족 얼굴을 몰라요",
  title: "꼭 찍을 사람,\n한 번에 전달",
  lead: "꼭 찍을 사람과 원판 순서, 식순 속 이벤트를 고르고 적으면 작가님께 보낼 요청서(이미지 · PDF)와 카톡에 붙일 글이 만들어져요.",
  start: "요청서 쓰기",
  example: "예시 먼저 보기",
  resumeTitle: "이어서 쓰기",
  resumeMeta: "{n}칸 적음",
  newStart: "처음부터 새로 쓰기",
  trust: "적은 내용과 사진은 이 기기 안에만 있어요. 어디로도 올라가지 않아요.",
  exTitle: "이런 요청서가 나와요",
  exTag: "예시",
  notes: [
    "작가님 업체가 보내 준 양식이 따로 있으면 그 양식이 먼저예요. 이 요청서는 양식에 없는 것(사람 · 원판 순서 · 이벤트)을 채워 줘요.",
    "칸은 모두 골라서 적어요. 적은 칸만 요청서에 들어가요."
  ],
  topRight: "전부 무료",

  // ===== 칸 목록 =====
  boardTitle: "어떤 것부터\n적을까요?",
  boardLead: "작가님이 당일 쓰는 순서대로 놓았어요. 아는 칸부터 채우면 돼요.",
  empty: "아직 안 적었어요",
  write: "적기",
  edit: "고치기",
  seeOut: "요청서 보기",
  dockN: "{n} / 6칸 적음",
  dockNone: "적은 칸만 요청서에 들어가요",
  menuHome: "첫 화면으로",
  menuNew: "모두 지우고 새로 쓰기",
  newTitle: "모두 지울까요?",
  newBody: "적은 내용과 넣은 사진을 이 기기에서 모두 지워요. 되돌릴 수 없어요.",
  newYes: "모두 지우기",
  cancel: "취소",
  back: "칸 목록",
  done: "다 적었어요",
  doneNext: "다음 칸: {name}",

  // 칸 이름 · 한 줄 설명 (칸 목록 · 화면 제목)
  sec: {
    info:   { name: "예식 · 연락처",      sub: "날짜 · 홀 · 당일 대신 전화 받을 사람" },
    range:  { name: "촬영 범위",          sub: "어디서부터 어디까지 · 같이 찍는 사람" },
    people: { name: "꼭 찍을 사람",       sub: "얼굴 사진 · 알아보는 법" },
    flow:   { name: "식순 · 이벤트",      sub: "식순 순서 · 꼭 남길 순간" },
    wp:     { name: "원판 순서",          sub: "단체 사진 순서 · 이름" },
    shots:  { name: "장면 · 샘플 · 피할 것", sub: "대기실 · 소품 컷 · 연출 · 샘플 사진" }
  },

  // ===== ① 예식 · 연락처 =====
  infoDate: "예식 날짜",
  infoTime: "예식 시각",
  infoHall: "웨딩홀 · 홀 이름(층)",
  infoHallPh: "예: 라온웨딩홀 3층 그레이스홀",
  infoHallHint: "지역 말고 웨딩홀과 홀 이름까지 적어요. 홀을 알면 조명 · 동선을 미리 확인하는 작가님이 있어요.",
  infoG: "신랑 이름",
  infoB: "신부 이름",
  infoPhone: "휴대폰",
  infoContact: "당일 대신 전화 받을 사람",
  infoContactHint: "식 당일 작가님이 동선이나 시간을 물을 때 대신 받아 줄 사람이에요. 가방순이나 가족 한 분이면 돼요.",
  infoCn: "이름",
  infoCr: "누구인지",
  infoCrPh: "예: 가방순이 · 신부 친구",
  infoCp: "휴대폰",
  fromFlow: "식순표에 적은 날짜 · 홀 · 이름 불러오기",
  fromFlowDone: "식순표에서 불러왔어요.",

  // ===== ② 촬영 범위 =====
  rgStart: "촬영 시작",
  rgStartHint: "메이크업샵 촬영은 추가 상품인 곳이 있어요. 계약한 대로 골라 주세요.",
  rgShop: "메이크업샵 이름",
  rgShopPh: "예: 청담 ○○ 메이크업",
  rgShopAt: "샵 촬영 시작 시각",
  rgShopAtHint: "샵 일정과 맞아야 해요. 샵에 먼저 시간을 확인해 보세요.",
  rgArrive: "작가님 도착 시각",
  rgArriveHint: "작가님이 알려 준 시각을 적어요. 업체마다 달라서 비워 두면 \"확인 필요\"로 적혀요.",
  rgEnd: "원판 뒤에도 찍나요?",
  rgEndHint: "따로 고르지 않으면 원판에서 촬영이 끝나는 곳이 있어요. 계약한 것만 골라요.",
  rgParty: "2부에서 꼭 찍을 순서",
  rgPartyPh: "예: 2부 드레스 입고 테이블 인사",
  rgOthers: "같은 날 찍는 사람",
  rgOthersHint: "같은 날 다른 촬영이 있으면 미리 알려 달라는 업체가 많아요. 서로 화면에 걸리지 않게 자리를 나눠요.",
  rgOthersPh: "예: 본식 영상은 ○○필름, 신랑 친구가 카메라로 찍어요",
  rgWonpan: "원판은 누가 찍나요?",
  rgWonpanHint: "웨딩홀 상품에 원판이 들어 있으면 원판은 홀 작가가 찍기도 해요.",
  rgPre: "선원판",
  rgPreHint: "선원판은 식 전, 홀이 비어 있을 때 직계 가족 원판을 먼저 찍는 거예요. 앞 예식이 없을 때만 되는 곳이 있어 미리 말해야 해요.",

  // ===== ③ 꼭 찍을 사람 =====
  pplLead: "작가님은 하객 얼굴을 몰라요. 꼭 남길 분을 이름 · 얼굴 · 알아보는 법으로 알려 주세요.",
  pplFew: "많을수록 놓치기 쉬워요. 꼭 남길 분만 적어요.",
  pplAdd: "＋ 사람 넣기",
  pplEmpty: "아직 넣은 사람이 없어요.",
  pplFace: "얼굴 사진",
  pplFaceAdd: "얼굴 사진 넣기",
  pplFaceChange: "바꾸기",
  pplFaceDel: "빼기",
  pplFaceHint: "단체 사진에서 그분 얼굴만 골라 잘라요. 없어도 괜찮아요.",
  photoLock: "사진은 이 기기 안에서만 써요. 어디로도 올라가지 않아요.",
  pplName: "이름",
  pplNamePh: "예: 김순자",
  pplRel: "누구인지",
  pplRelPh: "예: 신부 외할머니",
  pplSide: "어느 쪽 손님",
  pplWhen: "어떻게 찍을까요?",
  pplLook: "알아보는 법",
  pplLookPh: "예: 앞줄 신부 쪽, 분홍 한복",
  pplLookHint: "자리나 옷을 적으면 얼굴을 몰라도 찾을 수 있어요.",
  pplNote: "메모",
  pplNotePh: "예: 식 끝나면 바로 가세요",
  pplDel: "이 사람 빼기",
  pplClose: "접기",
  pplNoName: "이름 없음",
  pplFaceN: "얼굴 사진 {n}",
  side: { g: "신랑 측", b: "신부 측" },

  // 얼굴 자르기 창
  cropTitle: "얼굴을 동그라미 안에",
  cropLead: "얼굴을 누르면 동그라미가 옮겨 가요. 끌어서 맞춰도 돼요.",
  cropSize: "크기",
  cropOk: "이 얼굴로",
  cropBusy: "사진을 여는 중…",
  cropFail: "이 사진은 열 수 없어요. 다른 사진을 골라 주세요.",

  // ===== ④ 식순 · 이벤트 =====
  flLead: "우리 식의 순서예요. 빠진 순서는 넣고, 없는 순서는 빼요. 꼭 남길 순간에는 ★를 눌러요.",
  flWhy: "식순에 없는 이벤트는 미리 알아야 작가님이 카메라 자리를 잡을 수 있어요.",
  flImport: "식순표에서 만든 식순 불러오기",
  flImportHint: "이 휴대폰에서 만든 식순표가 있어요.",
  flImportAsk: "지금 적은 식순 대신 식순표의 식순으로 바꿀까요? ★와 메모는 같은 순서에 남겨요.",
  flImportYes: "바꾸기",
  flImported: "식순표의 식순을 불러왔어요.",
  flStar: "★ 꼭 찍기",
  flMemo: "메모",
  flWhoPh: "누가 · 메모",
  flAddIn: "＋ 넣기",
  flOut: "빼기",
  flCustom: "식순에 없는 이벤트 넣기",
  flCustomPh: "예: 신랑이 춤추며 입장",
  flCustomAfter: "어디 다음에?",
  flCustomFirst: "맨 앞",
  flCustomAdd: "넣기",
  flCustomEx: ["신랑이 춤추며 입장", "깜짝 영상 편지", "부모님께 편지 낭독", "하객 이벤트"],
  flEmpty: "식순이 비었어요. 아래 순서를 눌러 넣어 주세요.",

  // ===== ⑤ 원판 순서 =====
  wpLead: "원판은 식이 끝나고 단상에서 찍는 단체 사진이에요. 작가님 · 사회자 · 가족 대표에게 같은 순서를 보내요.",
  wpPreset: "어떤 순서로 찍을까요?",
  wpPresetHint: "업체 · 홀마다 순서가 달라요. 작가님이 정해 준 순서가 있으면 그대로 바꿔 주세요.",
  wpPresetAsk: "순서를 바꿀까요? 적은 이름은 같은 묶음에 남아요.",
  wpPresetYes: "바꾸기",
  presets: {
    fam: { t: "가족 먼저", d: "부모님 → 가족 → 친척 → 친구" },
    kin: { t: "친척 전체 먼저", d: "부모님 → 친척 전체 → 가족 → 친구" }
  },
  wpNames: "이름",
  wpNamesPh: "예: 아버지 김철수, 어머니 박영희, 형 김민수",
  wpNamesHint: "관계보다 이름으로 적어 두면 당일 누가 들어갈지 헷갈리지 않아요.",
  wpUp: "위로",
  wpDown: "아래로",
  wpDel: "빼기",
  wpAdd: "＋ 묶음 넣기",
  wpAddCustom: "직접 적기",
  wpCustomPh: "예: 신부 회사 동료",
  wpTitle: "묶음 이름",
  wpElder: "어르신이나 어린아이가 있는 묶음은 먼저 찍는 편이 좋다는 안내도 있어요.",
  wpReps: "가족 대표 (사람 모아 주실 분)",
  wpRepsHint: "신랑 · 신부는 누가 빠졌는지 확인하기 어려워요. 양가에 한 분씩 명단을 들고 사람을 모아 줄 분을 정해요.",
  wpRepName: "{side} 이름",
  wpRepPhone: "휴대폰",
  wpNone: "묶음이 없어요. 위에서 순서를 골라 주세요.",
  wpNoNames: "이름 아직",

  // ===== ⑥ 장면 · 샘플 · 피할 것 =====
  shRoom: "신부대기실에서 같이 찍을 분",
  shRoomHint: "양가 아버님 사진은 따로 말해야 찍는 곳이 있어요.",
  shDetail: "소품 컷",
  shDetailHint: "여건이 되면 찍어 주는 컷으로 두는 업체가 있어요. 원하면 미리 말해요.",
  shSpecial: "따로 부탁할 연출",
  shSpecialHint: "부탁하지 않으면 안 찍는 업체가 있어요. 예약 때 말해야 하는 곳도 있어요.",
  shSpread: "골고루 남겨 주세요",
  shSpreadHint: "후기에서 \"이 사진이 없어서 아쉬웠다\"고 한 장면이에요.",
  shAvoid: "피해 주세요",
  shAvoidPh: "예: 왼쪽 옆얼굴은 피해 주세요",
  shAvoidHint: "원하지 않는 촬영은 설명과 사진을 같이 달라는 업체가 있어요.",
  shRefs: "원하는 느낌 샘플 사진",
  shRefsHint: "샘플은 몇 장만 보내요. 식 전체를 장면마다 정한 자료는 받지 않는 작가님도 있어요.",
  shRefsAdd: "＋ 샘플 사진 넣기",
  shRefsMax: "샘플은 {n}장까지 넣을 수 있어요.",
  shRefNotePh: "이 사진의 어떤 점이 좋은지 (예: 자연스러운 웃음)",
  shRefDel: "빼기",
  shNote: "그 밖에 부탁",
  shNotePh: "예: 신랑이 키가 커서 둘이 설 때 높이를 맞춰 주세요",

  // ===== 요청서 (결과) =====
  outTitle: "작가님께 보낼 요청서",
  outSub: "{p}장으로 만들었어요. 눌러서 크게 볼 수 있어요.",
  outBusy: "요청서를 그리는 중… {d} / {n}",
  outEmptyTitle: "아직 적은 칸이 없어요",
  outEmptyLead: "칸을 하나라도 적으면 요청서가 만들어져요.",
  outEmptyBtn: "칸 목록으로",
  missTitle: "보내기 전에 채우면 좋은 칸",
  miss: {
    date: "예식 날짜 · 시각",
    hall: "웨딩홀 · 홀 이름",
    contact: "당일 대신 전화 받을 사람",
    arrive: "작가님 도착 시각",
    people: "꼭 찍을 사람",
    wpNames: "원판 가족 묶음 {n}개에 이름이 없어요",
    reps: "원판 가족 대표"
  },
  missGo: "채우기",
  pdfBtn: "요청서 PDF 보내기",
  pdfBtnPc: "요청서 PDF 저장",
  imgBtn: "이미지 {n}장 저장",
  txtBtn: "카톡에 붙일 글 복사",
  txtTitle: "카톡에 붙는 글 보기",
  txtNote: "글에는 사진이 안 들어가요. 얼굴 · 샘플 사진은 요청서 이미지로 같이 보내요.",
  mcTitle: "사회자 · 가족 대표에게",
  mcLead: "원판 순서는 사회자가 순서대로 부르고, 가족 대표가 사람을 모아요. 같은 순서표를 보내 두세요.",
  mcImg: "원판 순서표 이미지 보내기",
  mcTxt: "원판 순서 글 복사",
  mcNone: "원판 순서를 적으면 여기서 따로 보낼 수 있어요.",
  checkTitle: "보내기 전에 확인",
  checks: [
    "선원판 · 베일샷 · 플래시 연출처럼 미리 말해야 하는 건 예약 때 말했는지 확인했어요.",
    "같은 날 찍는 영상 · 아이폰 스냅 업체에도 알렸어요.",
    "원판 순서표를 작가님 · 사회자 · 가족 대표에게 똑같이 보냈어요.",
    "꼭 찍을 사람에게 \"작가님이 찾아갈 수 있다\"고 미리 말해 두었어요."
  ],
  editMore: "칸 목록으로 돌아가 고치기",
  saved: "저장했어요.",
  copied: "복사했어요. 카톡 대화창에 붙여 넣으세요.",
  copyFail: "복사가 안 돼요. 아래 글을 길게 눌러 복사해 주세요.",
  saveFail: "요청서를 만들지 못했어요. 새로고침 뒤 다시 해 주세요.",
  saveOne: "이 장만 저장",
  close: "닫기",
  tapBig: "눌러서 크게 보기",

  // 예시
  exBanner: "예시예요. 이름 · 번호 · 사진은 지어낸 것이에요.",
  exMine: "내 요청서 쓰기",

  // ===== 요청서 그림 · 글 =====
  shHead: "본식 스냅 요청서",
  shWpHead: "원판 순서표",
  shPage: "{i} / {n}",
  pgInfo: "예식 정보",
  pgPeople: "꼭 찍어 주세요 — 사람",
  pgFlow: "식순 · 이벤트",
  pgWp: "원판 순서",
  pgRefs: "원하는 느낌 샘플",
  hWhen: "예식",
  hContact: "연락처",
  hRange: "촬영 범위",
  hShots: "장면",
  hAvoid: "피해 주세요",
  hNote: "그 밖에 부탁",
  hInside: "이 요청서에 든 것",
  kDate: "일시",
  kHall: "장소",
  kGroom: "신랑",
  kBride: "신부",
  kContact: "당일 연락",
  kStart: "시작",
  kArrive: "작가님 도착",
  kEnd: "끝",
  kParty: "2부",
  kOthers: "같은 날 촬영",
  kWonpan: "원판",
  kPre: "선원판",
  kRoom: "대기실에서 같이",
  kDetail: "소품 컷",
  kSpecial: "연출",
  kSpread: "골고루",
  vCheck: "확인 필요",
  vEndBase: "원판까지",
  vShopAt: "{t}부터",
  vInsidePeople: "꼭 찍을 사람 {n}명",
  vInsideFlow: "식순 {n}개 (★ {s}개)",
  vInsideWp: "원판 {n}묶음",
  vInsideRefs: "샘플 사진 {n}장",
  pWith: "어떻게",
  pLook: "알아보는 법",
  pNote: "메모",
  flStarLegend: "★ = 꼭 찍어 주세요",
  wpRepsLine: "가족 대표 (사람 모으는 분)",
  wpSendTo: "작가님 · 사회자 · 가족 대표가 같은 순서표를 봐요.",
  txHello: "안녕하세요, 작가님. 본식 촬영 때 봐 주실 내용을 정리했어요.",
  txTail: "얼굴 · 샘플 사진은 요청서 이미지로 같이 보내요. 감사합니다.",
  txTailNoImg: "감사합니다.",
  txWpHello: "원판 순서예요. 이 순서대로 불러 주시고 모아 주세요.",
  fileImg: "스냅요청서_{i}_{name}.jpg",
  fileWp: "원판순서표.jpg",
  filePdf: "본식스냅요청서_{d}.pdf",
  fileZip: "본식스냅요청서_{d}.zip",

  // ===== 공개 전 · 그 밖에 =====
  soonTop: "곧 열려요",
  soonFor: "예비 신랑 · 신부님을 위한",
  soonLead: "본식 스냅 요청서를 준비하고 있어요. 인스타그램에서 먼저 소식을 알려 드릴게요.",
  soonInsta: "인스타그램에서 보기",
  soonOther: "신랑 입장곡 찾기 먼저 해 보기",
  noStore: "이 브라우저는 저장을 막아 두었어요. 창을 닫으면 적은 내용이 사라져요.",
  photoFail: "사진을 열지 못했어요.",
  photoBusy: "사진을 넣는 중…"
};

// ===== 고르는 목록 =====
// 촬영 시작 (조사 3절 5행: 메이크업샵은 추가 상품 · 시작 시각은 샵과 확인)
const START = [
  { id: "shop", t: "메이크업샵부터" },
  { id: "room", t: "신부대기실부터" }
];
// 원판 뒤 촬영 (조사 2절 A1~A3 추가 옵션: 연회장 인사 · 폐백 · 2부)
const ENDS = [
  { id: "greet", t: "연회장 인사" },
  { id: "pyebaek", t: "폐백" },
  { id: "party", t: "2부" }
];
// 2부에서 찍을 순서 (조사 B6 시네마스토리: 재입장 · 케이크 커팅 · 건배)
const PARTY = [
  { id: "re", t: "재입장" },
  { id: "cake", t: "케이크 커팅" },
  { id: "toast", t: "건배" }
];
// 같은 날 찍는 사람 (조사 3절 6행: 르사브 · 그로브케이 · 요한필름)
const OTHERS = [
  { id: "dvd", t: "본식 영상(DVD)" },
  { id: "iphone", t: "아이폰 스냅" },
  { id: "sub", t: "다른 업체 서브 작가" },
  { id: "friend", t: "지인 카메라" }
];
// 원판 누가 (조사 3절 20행)
const WONPAN = [
  { id: "snap", t: "이 스냅 작가님" },
  { id: "hall", t: "웨딩홀 원판 작가" },
  { id: "unk", t: "아직 몰라요" }
];
// 선원판 (조사 4절 선원판)
const PRE = [
  { id: "want", t: "하고 싶어요" },
  { id: "ask", t: "작가님과 상의할게요" },
  { id: "no", t: "안 해요" }
];

// 꼭 찍을 사람: 누구인지 빠르게 고르기 (조사 7절 데일리웨딩 "조부모님, 멀리서 온 친구, 축가자, 사회자, 부케를 받을 친구, 양가 형제자매")
const RELS = ["할머니", "할아버지", "형제자매", "멀리서 온 친구", "축가 부르는 친구", "축사하는 분", "부케 받는 친구", "은사님"];
// 어떻게 찍을까요
const WHEN = [
  { id: "with", t: "신랑 · 신부와 같이 한 장", s: "신랑 · 신부와 같이" },
  { id: "room", t: "대기실에서", s: "대기실에서" },
  { id: "seat", t: "식 중 자리에 앉은 모습", s: "식 중 자리에서" },
  { id: "act", t: "축가 · 축사 하는 모습", s: "축가 · 축사 하는 모습" }
];

// 식순: 식순표(in-good-order/app.js CATALOG)와 같은 키 · 이름 · 순서. base = 식순표 기본 식순 11개
// ph = "누가 · 메모" 칸의 예시
const FLOW = [
  { k: "open", t: "개식사", base: true, ph: "", memo: true },
  { k: "parents", t: "양가 부모님 입장", ph: "예: 신랑 부모님 → 신부 부모님" },
  { k: "candle", t: "화촉점화", base: true, ph: "예: 양가 어머님" },
  { k: "groom", t: "신랑 입장", base: true, ph: "예: 신나는 곡에 맞춰 입장" },
  { k: "bride", t: "신부 입장", base: true, ph: "예: 아버님과 입장" },
  { k: "bow", t: "맞절", base: true, ph: "", memo: true },
  { k: "vows", t: "혼인서약", base: true, ph: "예: 마주 보고 낭독" },
  { k: "kids", t: "화동 입장", ph: "예: 조카 김하윤 (6살)" },
  { k: "rings", t: "예물 교환", ph: "", memo: true },
  { k: "declare", t: "성혼선언", base: true, ph: "예: 신부 아버님 낭독" },
  { k: "blessing", t: "덕담", base: true, ph: "예: 신랑 아버님" },
  { k: "speech", t: "축사", ph: "예: 신부 친구 박지은" },
  { k: "song", t: "축가", base: true, ph: "예: 신랑 친구 2명 · 1곡" },
  { k: "event", t: "영상 상영", ph: "예: 부모님 감사 영상" },
  { k: "greet", t: "부모님 인사 · 하객 인사", base: true, ph: "", memo: true },
  { k: "march", t: "행진", base: true, ph: "", memo: true }
];
// 식순표에서 고른 방식 → 이 요청서의 "누가 · 메모" (식순표 CATALOG ways의 c)
const WAYS = {
  candle: { mothers: "양가 어머님", both: "양가 부모님" },
  bride: { father: "아버님과 입장", alone: "혼자 입장", groom: "신랑과 함께 입장" },
  vows: { front: "하객을 바라보고 낭독", face: "마주 보고 낭독" },
  declare: { mc: "사회자 낭독", father: "아버님 낭독" },
  blessing: { gfather: "신랑 측 아버님", bfather: "신부 측 아버님" },
  song: { one: "친구 1곡", two: "친구 2곡", groom: "신랑 축가" }
};

// 원판 묶음 (조사 4절: 맨 앞 부모님 · 맨 뒤 친구 · 부케는 모든 출처가 같고, 가운데 순서는 두 갈래)
const WP = {
  parents: "신랑 · 신부 + 양가 부모님",
  gfam: "신랑 측 가족",
  bfam: "신부 측 가족",
  gkin: "신랑 측 친척",
  bkin: "신부 측 친척",
  allkin: "양가 친척 전체",
  gfr: "신랑 친구 · 직장 동료",
  bfr: "신부 친구 · 직장 동료",
  friends: "양쪽 친구 · 직장 동료",
  bouquet: "부케 받는 친구"
};
const WP_PH = {
  parents: "예: 아버지 김철수, 어머니 박영희 / 아버지 이정호, 어머니 최미경",
  gfam: "예: 형 김민수, 형수 정다은, 할머니 김순자",
  bfam: "예: 언니 이수진, 외할머니 김순자",
  gkin: "예: 큰아버지 댁, 고모 댁 (이름 없이 적어도 돼요)",
  bkin: "예: 이모 댁, 외삼촌 댁 (이름 없이 적어도 돼요)",
  allkin: "예: 큰아버지 댁, 이모 댁 (이름 없이 적어도 돼요)",
  gfr: "예: 대학 동기, 회사 팀",
  bfr: "예: 고등학교 친구, 회사 동료",
  friends: "예: 대학 동기, 회사 팀",
  bouquet: "예: 박지은"
};
// fam = 정보 사이트 다수 + 업체 1곳, kin = 사진 업체 2곳 (조사 4절)
const PRESET = {
  fam: ["parents", "gfam", "bfam", "gkin", "bkin", "gfr", "bfr", "bouquet"],
  kin: ["parents", "allkin", "gfam", "bfam", "friends", "bouquet"]
};

// 장면 (조사 B1 앤틱로즈 · B6 시네마스토리 · 5절 후기)
const ROOM = [
  { id: "mom", t: "양가 어머님" },
  { id: "dad", t: "양가 아버님" },
  { id: "sib", t: "형제자매" },
  { id: "fr", t: "친구들" }
];
const DETAIL = [
  { id: "table", t: "포토테이블" },
  { id: "card", t: "청첩장" },
  { id: "ring", t: "반지 · 예물" },
  { id: "bouquet", t: "부케" }
];
const SPECIAL = [
  { id: "veil", t: "베일샷" },
  { id: "flash", t: "플래시 연출" }
];
const SPREAD = [
  { id: "greet", t: "부모님이 손님 맞으시는 모습" },
  { id: "hello", t: "신랑 · 신부가 하객과 인사하는 모습" },
  { id: "friends", t: "친구들 단체 사진" },
  { id: "parents", t: "부모님 얼굴이 잘 보이는 사진" }
];
const AVOID = [
  { id: "helper", t: "헬퍼 · 도우미가 크게 나온 컷" }
];

// ===== 예시 (이름 · 번호는 지어낸 것) =====
const EXAMPLE = {
  info: { date: "2027-03-13", time: "13:30", hall: "라온웨딩홀 3층 그레이스홀", g: "김도윤", gp: "010-0000-1111", b: "이하은", bp: "010-0000-2222", cn: "박서연", cr: "가방순이 · 신부 친구", cp: "010-0000-3333" },
  range: { start: "shop", shop: "청담 ○○ 메이크업", shopAt: "09:30", arrive: "12:30", ends: ["greet"], party: [], partyNote: "", others: ["dvd", "friend"], othersNote: "신랑 친구가 카메라로 찍어요", wonpan: "snap", pre: "ask" },
  people: [
    { name: "김순자", rel: "신부 외할머니", side: "b", when: ["with", "seat"], look: "앞줄 신부 쪽, 분홍 한복", note: "휠체어를 타세요", face: 0 },
    { name: "최유진", rel: "멀리서 온 친구", side: "b", when: ["with"], look: "하늘색 원피스", note: "식 끝나면 바로 공항에 가요", face: 1 },
    { name: "정민호", rel: "축가 부르는 친구", side: "g", when: ["act", "with"], look: "", note: "", face: 2 }
  ],
  flow: [
    ["open", "사회자"], ["candle", "양가 어머님"], ["groom", "신랑이 춤추며 입장 (깜짝)", 1], ["bride", "아버님과 입장", 1],
    ["bow", ""], ["vows", "마주 보고 낭독"], ["declare", "사회자 낭독"], ["song", "신랑 친구 정민호 · 1곡", 1],
    ["x", "신부가 부모님께 편지 낭독", "", 1], ["event", "부모님 감사 영상"], ["greet", ""], ["march", ""]
  ],
  wp: {
    preset: "fam",
    names: {
      parents: "신랑 아버지 김철수, 어머니 박영희 / 신부 아버지 이정호, 어머니 최미경",
      gfam: "형 김민수, 형수 정다은, 조카 김하윤",
      bfam: "언니 이수진, 외할머니 김순자",
      gkin: "", bkin: "",
      gfr: "대학 동기 · 회사 팀", bfr: "고등학교 친구 · 회사 동료",
      bouquet: "최유진"
    },
    reps: { g: { n: "김민수", p: "010-0000-4444" }, b: { n: "이수진", p: "010-0000-5555" } }
  },
  shots: { room: ["mom", "dad"], detail: ["table", "ring"], special: ["veil"], spread: ["greet", "parents"], avoid: ["helper"], avoidNote: "", note: "신랑이 키가 커서 둘이 설 때 높이를 맞춰 주세요" },
  refs: [{ note: "자연스럽게 웃는 모습" }, { note: "둘이 마주 보는 장면" }]
};
