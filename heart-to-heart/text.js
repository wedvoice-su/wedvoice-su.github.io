// 결혼 전 대화 카드 ㉔ · 화면 문구 (카드 질문은 cards.js)
// {a} {b} = 두 사람 이름 · {a:이에요} 처럼 쓰면 이름 받침에 맞춰 "이에요/예요"가 붙어요
// 문구 검수 파일: docs/결혼전-대화카드/사이트-문구.txt (node docs/결혼전-대화카드/시험/문구.js 로 다시 만들어요)
const T = {
  name: "결혼 전 대화 카드",
  topFree: "무료",

  // ===== 1. 첫 화면 =====
  kicker: "카페에서 둘이, 폰 하나로",
  title: "결혼 전\n대화 카드",
  lead: "같은 질문에 각자 몰래 답하고, 같이 열어 봐요. 같은 건 ✓, 다른 건 '이야기해 볼 것'으로 남겨요.",
  start: "시작하기",
  startQ: "둘이 마주 앉아서",
  resume: "이어서 하기",
  resumeQ: "{topic} {n} / {total}",
  otherTopic: "다른 주제 고르기",
  pastLink: "지난 대화 다시 보기",
  coverNote: "한 주제에 10분쯤 · 답은 이 폰에만 저장되고, 어디로도 보내지 않아요.",

  // ===== 2. 약속 =====
  promTitle: "시작 전에,\n셋만 약속해요",
  prom: [
    ["정답은 없어요", "이기는 대화가 아니에요. 서로 어떻게 생각하는지 알아 가는 시간이에요."],
    ["넘겨도 돼요", "말하기 어려운 카드는 넘기고, 힘들면 잠깐 쉬어요."],
    ["답이 달라도 싸우지 않기", "다른 답은 '이야기해 볼 것'으로 남겨 두면 돼요. 오늘 다 정하지 않아도 괜찮아요."]
  ],
  namesTitle: "폰을 넘길 때 불러 드릴 이름",
  nameA: "신부",
  nameB: "신랑",
  namePh: "이름이나 별명 (안 적어도 돼요)",
  promGo: "약속하고 시작하기",
  promNote: "답은 이 폰에만 저장되고, 어디로도 보내지 않아요.",

  // ===== 3. 주제 고르기 =====
  back: "처음",
  topTitle: "오늘 이야기할\n주제를 골라요",
  topLead: "위에서부터 가벼운 순서예요. 오늘은 1~2개만 해도 충분해요.",
  topMeta: "{n}장 · {min}분쯤",
  topFirst: "처음이면 여기부터",
  topNext: "다음 추천",
  topDoing: "하는 중 · {n} / {total}",
  topDone: "✓ {date} · 기록 보기",
  topAll: "우리 약속 모아 보기",
  topPast: "지난 대화 다시 보기",
  topPromise: "약속 다시 보기",

  // ===== 4. 카드 (답하기) =====
  toTopics: "주제",
  rest: "잠깐 쉬기",
  turn: "{who} 차례",
  turnSub: "{other}, 잠깐 화면을 보지 말아 주세요",
  pickOne: "하나만 골라요",
  unknown: "아직 모르겠어",
  linePh: "한 줄로 적어요",
  lineSay: "적지 않고 말로 할게요",
  goPass: "다 골랐어요 · 폰 넘기기",
  goPassLine: "다 적었어요 · 폰 넘기기",
  goOpen: "같이 열어 보기",
  needPick: "먼저 하나를 골라 주세요.",
  needLine: "한 줄 적거나, 아래 '적지 않고 말로 할게요'를 눌러 주세요.",
  skip: "이 카드 넘기기",
  saidAloud: "(말로 할게요)",
  saidAloudPast: "(말로 했어요)",
  lineNote: "적은 답은 이 폰에만 저장되고, 같이 열 때까지 가려져요.",

  // ===== 5. 폰 넘기기 =====
  passTitle: "폰을\n{b}에게\n넘겨 주세요",
  passLead: "{a}의 답은 가려 뒀어요. {b}도 답하면 같이 열어요.",
  passGo: "{b:이에요}, 답할게요",
  passRedo: "{a} 답 다시 고르기",

  // ===== 6. 같이 열기 =====
  sameBadge: "같은 답이에요",
  diffBadge: "서로 다른 답이에요",
  unkBadge: "둘 다 아직 모르겠대요",
  talkUnk: "아직 몰라도 괜찮아요. 무엇을 알면 정할 수 있을지 이야기해 봐요.",
  talkDefault: [
    "왜 그걸 골랐는지 한 사람씩 말해 봐요.",
    "상대 답을 내 말로 한 번 따라 말해 봐요. \"네 말은 ~라는 거지?\"",
    "지금 정하지 않아도 돼요. 왜 그렇게 생각하는지만 들어 봐요."
  ],
  talkSame: "같은 답이어도 이유는 다를 수 있어요. 한 마디씩 말해 봐요.",
  lastTime: "지난번 {date}",
  markQ: "이 카드는 어땠어요?",
  markSame: "같아요 ✓",
  markTalk: "이야기해 볼 것",
  pactAdd: "＋ 우리 약속으로 한 줄 적기",
  pactLabel: "우리 약속 (안 적어도 돼요)",
  pactPh: "둘이 정한 것을 한 줄로",
  next: "다음 카드",
  toSum: "정리 보기",

  // ===== 7. 잠깐 쉬기 =====
  restTitle: "잠깐\n쉬어 가요",
  restLead: "물 한 잔 마시고 와도 돼요. 여기까지 한 건 이 폰에 저장돼 있어요.",
  restTip: "이야기가 뜨거워졌다면, 마음이 가라앉은 뒤에 다시 열어요. 오늘 못 하면 다음에 이어서 하면 돼요.",
  restBack: "다시 이어서 하기",
  restSum: "오늘은 여기까지 · 정리 보기",
  restHome: "처음 화면으로",

  // ===== 8. 정리 (우리 약속) =====
  sumDone: "{topic} 이야기,\n끝!",
  sumSoFar: "{topic}\n지금까지 정리",
  sumPast: "{topic}\n{date}",
  sumLead: "같은 건 ✓, 다른 건 '이야기해 볼 것'으로 남겼어요. 저장해 두고, 1년 뒤에 다시 꺼내 봐요.",
  cardKind: "우리 약속",
  cardDate: "{date} · {topic}",
  secPact: "우리 약속",
  secSame: "같아요 ✓",
  secTalk: "이야기해 볼 것",
  secShare: "나눈 이야기",
  sameTalked: "이야기하고 맞췄어요",
  cardFoot: "정답은 없어요. 생각이 바뀌면, 다시 이야기하면 돼요.",
  emptySum: "아직 같이 연 카드가 없어요.",
  save: "이미지로 저장하기",
  copyTxt: "카톡에 붙일 글 복사하기",
  copied: "글을 복사했어요. 카톡에 붙여 넣어 보세요.",
  copyFail: "복사가 안 돼요. 아래 글을 길게 눌러 복사해 주세요.",
  saveNote: "이 폰에만 저장돼 있어요. 폰을 바꾸거나 기록을 지우면 사라지니, 이미지로도 남겨 두세요.",
  skipped: "넘긴 카드 {n}장",
  skippedLead: "마음 편할 때 다시 해 봐도 돼요.",
  skippedGo: "넘긴 카드 지금 해 보기",
  continueGo: "남은 카드 이어서 하기",
  nextTopic: "다음 주제 · {topic}",
  allTopicsDone: "모든 주제를 다 했어요. 1년 뒤에 같은 카드로 다시 해 보면, 무엇이 달라졌는지 볼 수 있어요.",
  toTopicList: "주제 목록으로",
  detail: "카드별 답 전부 보기",
  changed: "지난번({date})과 달라진 답 {n}개",
  changedSee: "보기",
  changedTag: "달라짐",
  skippedTag: "넘김",
  vowsLead: "정한 약속, 혼인서약서에 한 줄 넣어 보는 건 어때요?",
  vowsBtn: "혼인서약서 만들기",
  redo: "이 주제 다시 해 보기",
  redoSub: "오늘 날짜로 새로 남겨요. 지금 기록은 '지난 대화'에 그대로 있어요.",
  del: "이 기록 지우기",
  delAsk: "이 기록을 지울까요? 되돌릴 수 없어요.",
  delYes: "지우기",
  delNo: "그대로 두기",
  fileName: "우리약속-{topic}-{date}",
  txHead: "[우리 약속] {a} ♥ {b} · {date}",
  txFoot: "— 결혼 전 대화 카드 · 결혼식사회자 이상운",

  // ===== 9. 우리 약속 모아 보기 =====
  allTitle: "우리 약속\n모아 보기",
  allLead: "지금까지 이야기한 주제를 한 장에 모았어요. 주제마다 가장 최근 기록이에요.",
  allDate: "{date}까지",
  allEmpty: "아직 같이 연 카드가 없어요. 주제를 하나 골라 시작해 보세요.",
  allFile: "우리약속-모음-{date}",

  // ===== 10. 지난 대화 다시 보기 =====
  pastTitle: "지난 대화\n다시 보기",
  pastLead: "날짜별로 남아 있어요. 같은 주제를 다시 하면, 지난번과 달라진 답을 보여 드려요.",
  pastEmpty: "아직 기록이 없어요.",
  pastDone: "끝 · {n}장",
  pastDoing: "하는 중 · {n} / {total}",
  pastClear: "이 폰에서 기록 모두 지우기",
  pastClearAsk: "모든 기록과 이름을 지울까요? 되돌릴 수 없어요.",
  pastCleared: "모두 지웠어요.",

  // ===== 날짜 =====
  dateFmt: "{y}년 {m}월 {d}일",

  // ===== 아직 공개 전 =====
  soonTop: "준비 중",
  soonFor: "곧 열려요",
  soonLead: "결혼 전 대화 카드를 준비하고 있어요. 열리면 인스타에서 알려 드릴게요.",
  soonInsta: "인스타에서 소식 받기",
  soonOther: "신랑 입장곡 찾기 테스트"
};
