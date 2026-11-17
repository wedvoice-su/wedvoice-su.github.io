// 헤어 · 메이크업 요청서 — 화면 문구 (문구를 바꾸려면 여기만 고치면 돼요)
// {n} 같은 중괄호는 숫자 · 이름이 들어가는 자리예요. 검수용 글은 docs/헤어-메이크업/사이트-문구.txt (이 파일에서 뽑아요: node docs/헤어-메이크업/도구/문구.js)
// 줄 끝의 "// …"는 그 문구가 화면 어디에 나오는지예요. 검수 파일에 같이 실려요.
const T = {
  // ===== 첫 화면 =====
  name: "헤어 · 메이크업 요청서",                     // 위 줄 왼쪽 (사이트 이름)
  topRight: "무료",                                   // 위 줄 오른쪽
  kicker: "원하는 메이크업, 말로 설명하기 어렵죠?",   // 작은 분홍 글씨
  title: "고르기만 하면\n요청서 한 장",               // 큰 글씨
  lead: "원하는 분위기와 피하고 싶은 것을 고르고, 참고 사진에 표시하세요. 헤어 · 메이크업 선생님께 보낼 요청서와 카톡 글이 저절로 만들어져요.",   // 설명
  startBtn: "{who} 요청서 만들기",                    // 큰 버튼 (신부 = 분홍, 신랑 = 테두리)
  resumeBtn: "{who} 요청서 이어서 쓰기",              // 큰 버튼 (쓰던 것이 있을 때)
  startSubB: "피부 · 눈 · 립 · 헤어 · 베일까지",      // 신부 버튼 작은 글씨
  startSubG: "헤어 · 눈썹 · 피부 톤까지",             // 신랑 버튼 작은 글씨
  resumeMeta: "고른 것 {n}개",                        // 이어서 쓰기 버튼 작은 글씨
  resumeMetaPh: "고른 것 {n}개 · 사진 {p}장",         // 이어서 쓰기 버튼 작은 글씨 (사진이 있을 때)
  trySample: "예시 요청서 먼저 보기",                 // 버튼 아래 밑줄 글씨
  trust: "사진은 서버에 올라가지 않아요. 이 기기 안에서만 열어요.",   // 자물쇠 한 줄 (첫 화면 · 참고 사진 단계)
  exTitle: "이런 요청서가 나와요",                    // 예시 그림 위 제목
  exTag: "예시",                                      // 예시 그림 오른쪽 딱지
  coverNotes: [                                       // 첫 화면 맨 아래 점 목록
    "웨딩촬영 · 본식 모두 쓸 수 있어요. 본식 요청서에는 \"웨딩촬영 때와 비교\"도 적을 수 있어요.",
    "다 고르지 않아도 돼요. 고른 것만 요청서에 들어가요.",
    "폰 · 노트북 어디서나, 신부 · 신랑 요청서를 따로 만들 수 있어요."
  ],

  // ===== 공개 전 화면 (?preview 없이 들어오면) =====
  soonTop: "준비 중",                                 // 위 줄 오른쪽
  soonFor: "곧 공개돼요",                             // 작은 분홍 글씨 (큰 글씨는 첫 화면과 같아요)
  soonLead: "인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.",   // 설명
  soonInsta: "인스타 팔로우하기",                     // 분홍 버튼
  soonOther: "신랑 입장곡 테스트 먼저 하기",          // 둘째 버튼

  // ===== 공통 =====
  whoB: "신부",
  whoG: "신랑",
  docName: "{who} 요청서",                            // 위 줄 가운데
  home: "처음",                                       // 위 줄 왼쪽 (첫 단계 · 예시에서)
  prev: "이전",                                       // 위 줄 왼쪽 (둘째 단계부터)
  menuLabel: "메뉴",                                  // ⋯ 버튼 (화면 읽기 프로그램용)
  menuHome: "첫 화면으로",                            // ⋯ 메뉴 1
  menuNew: "{who} 요청서 새로 시작하기",              // ⋯ 메뉴 2
  newTitle: "{who} 요청서를 새로 시작할까요?",        // 새로 시작 확인 창 제목
  newBody: "지금까지 고른 것과 넣은 사진이 이 브라우저에서 지워져요. 원본 사진 파일은 그대로 있어요.",   // 확인 창 설명
  newYes: "지우고 새로 시작",                         // 확인 창 버튼
  cancel: "취소",                                     // 확인 창 · 메뉴 닫기
  noStore: "이 브라우저에는 저장이 안 돼요. 창을 닫으면 고른 것이 사라지니, 끝까지 한 번에 해 주세요.",   // 사생활 보호 창 등
  dateFmt: "{m}월 {d}일 ({w})",                       // 요청서에 적히는 날짜 모양
  staffFmt: "담당 {s}",                               // 요청서 맨 위 줄 (담당 선생님을 적었을 때)
  am: "오전",
  pm: "오후",

  // ===== 단계 화면 =====
  stepsLabel: "단계",                                 // 단계 줄 (화면 읽기 프로그램용)
  pickOne: "하나만",                                  // 하나만 고르는 줄 이름 옆 작은 글씨
  dockN: "고른 것 {n}개",                             // 아래 줄 왼쪽
  dockSkip: "안 골라도 넘어가요",                     // 아래 줄 왼쪽 (아직 아무것도 안 골랐을 때)
  dockNone: "요청을 하나 이상 골라 주세요",          // 아래 줄 왼쪽 (마지막 단계, 요청을 하나도 안 골랐을 때 · 버튼은 회색)
  nextBtn: "다음: {s}",                               // 아래 버튼 ({s} = 다음 단계 이름)
  makeBtn: "요청서 만들기",                           // 마지막 단계 아래 분홍 버튼
  makeNone: "알릴 것 · 메이크업 · 헤어 · 피할 것 · 사진 중 하나라도 고르면 요청서를 만들 수 있어요.",   // 요청을 하나도 안 고르고 누르면
  stepAdded: "위 단계 줄에 \"{s}\" 단계가 생겼어요.", // 고른 것 때문에 단계가 새로 생겼을 때 (예: 촬영 때 받아 봤어요 → 지난번과 바꿀 점)
  noteRow: "직접 적은 것",                            // 요청서에서 직접 쓴 글 줄 이름

  // ===== 참고 사진 단계 =====
  addFirst: "참고 사진 넣기",                         // 사진이 없을 때 큰 칸
  addFirstSub: "원하는 스타일 사진이나, 웨딩촬영 때 내 사진",   // 그 아래 작은 글씨
  addMore: "사진 더 넣기",                            // 목록 맨 끝 칸
  phName: "참고 사진 {i}",                            // 사진 이름 (목록 · 요청서)
  phMarks: "표시 {n}개",                              // 사진 아래 딱지
  phNone: "표시 없음",                                // 사진 아래 딱지 (아직 표시 안 함)
  photoHints: [                                       // 사진 아래 점 목록
    "사진을 누르면 마음에 드는 곳(또는 바꾸고 싶은 곳)에 번호를 찍을 수 있어요.",
    "표시하지 않은 사진은 \"사진 전체를 참고해 주세요\"로 들어가요.",
    "얼굴형 · 분위기가 나와 비슷한 사람 사진이면 더 잘 전해져요."
  ],
  loading: "사진 불러오는 중 {d} / {n}",              // 불러오는 동안
  loadBad: "열 수 없는 파일 {n}개는 건너뛰었어요. (JPG · PNG 사진만 돼요)",   // 못 여는 파일이 있을 때
  loadNone: "불러온 사진이 없어요. JPG · PNG 사진을 골라 주세요.",   // 하나도 못 열었을 때
  loadMany: "참고 사진은 {n}장까지 넣을 수 있어요.",  // 너무 많이 골랐을 때
  dropNow: "여기에 놓으면 불러와요",                  // 노트북: 사진을 끌어 오는 동안

  // ===== 사진 한 장 (번호 찍기) =====
  backPhotos: "사진 목록",                            // 왼쪽 위 · 아래 왼쪽 버튼
  edHint: "마음에 드는 곳을 콕 눌러 보세요",          // 아직 번호가 없을 때 큰 글씨
  edHintSub: "누른 자리에 번호가 찍혀요. 바꾸고 싶은 곳도 돼요.",   // 그 아래 작은 글씨 (폰)
  edHintSubPc: "누른 자리에 번호가 찍혀요. 마우스 휠을 굴리면 확대돼요.",   // 그 아래 작은 글씨 (노트북)
  edMore: "더 표시할 곳이 있으면 사진을 또 누르세요.", // 번호가 생긴 뒤 안내
  zoomIn: "확대",                                     // 위 줄 오른쪽 버튼
  zoomOut: "원래 크기",                               // 확대 중일 때
  whole: "사진 전체에 적기 (자리 없이)",              // 아래 버튼
  nextPhoto: "다음 사진",                             // 아래 오른쪽 (다음 사진이 있을 때)
  photoDone: "사진 다 했어요",                        // 아래 오른쪽 (마지막 사진)
  wholeTag: "전체",                                   // 자리가 없는 표시 앞 딱지
  rowEmpty: "(아직 안 골랐어요)",                     // 번호만 찍고 고르지 않았을 때
  removePhoto: "이 사진 빼기",                        // ⋯ 메뉴
  removed: "사진을 뺐어요.",                          // 뺀 뒤 알림
  undo: "되돌리기",                                   // 알림 옆 버튼
  pinDeleted: "{n}번 표시를 지웠어요.",               // 번호를 지운 뒤 알림
  pinDeletedW: "표시를 지웠어요.",                    // 사진 전체 표시를 지운 뒤 알림
  dragTip: "번호를 끌면 자리를 옮길 수 있어요.",      // 첫 번호를 찍은 뒤 한 번만
  pinTitle: "{n}번",                                  // 아래 칸 제목
  wholeTitle: "사진 전체",                            // 아래 칸 제목 (자리 없이)
  partQ: "어느 부분이에요?",                          // 첫 묶음 질문
  howQ: "어떻게",                                     // 아래 고정 줄 이름 (어떻게 해 달라고 할지)
  previewLabel: "요청서에 이렇게 적혀요",             // 문장 미리 보기 제목
  previewEmpty: "아래에서 부분을 고르세요.",          // 아직 안 골랐을 때
  noteLabel: "덧붙일 말",                             // 글 칸 (화면 읽기 프로그램용)
  notePh: "덧붙일 말 (예: 끝만 살짝 올려 주세요)",    // 글 칸 흐린 글씨
  pinDone: "완료",                                    // 분홍 버튼
  pinDel: "지우기",                                   // 글자 버튼

  // ===== 요청서 (결과) =====
  editBack: "고치기",                                 // 왼쪽 위 (마지막 단계로)
  outTitle: "요청서가 다 됐어요",                     // 제목
  outSub: "고른 것 {n}개",                            // 제목 아래
  outSubPh: "고른 것 {n}개 · 참고 사진 {p}장",        // 제목 아래 (사진이 있을 때)
  outBusy: "요청서를 만드는 중이에요 {d} / {n}",      // 만드는 동안
  imgSend: "이미지로 보내기",                         // 분홍 버튼 (폰 · 사진이 없을 때) — 누르면 카톡 등 보낼 곳을 고르는 창
  imgSendN: "이미지로 보내기 ({n}장)",                // 분홍 버튼 (폰 · 사진이 있을 때)
  imgBtn: "이미지로 저장",                            // 분홍 버튼 (노트북 · 사진이 없을 때)
  imgBtnN: "이미지로 저장 ({n}장)",                   // 분홍 버튼 (노트북 · 사진이 있을 때)
  pdfBtn: "PDF 한 파일로 보내기",                     // 둘째 버튼 (폰)
  pdfBtnPc: "PDF 한 파일로 저장",                     // 둘째 버튼 (노트북)
  txtBtn: "카톡에 붙일 글 복사",                      // 셋째 버튼
  txtTitle: "카톡에 붙일 글",                         // 글 미리 보기 제목
  outVendor: "샵에서 정해 준 양식(상담지 · 설문 링크)이 있으면 그 양식이 먼저예요. 그때는 이 요청서를 같이 보내거나 옮겨 적으세요.",   // 글 미리 보기 아래 안내
  copied: "글을 복사했어요. 카톡에 붙여 넣으세요.",   // 복사한 뒤
  copyFail: "복사가 안 됐어요. 아래 글을 길게 눌러 복사해 주세요.",   // 복사가 안 될 때
  saved: "저장했어요.",                               // 저장한 뒤
  saveFail: "요청서를 만들지 못했어요. 사진 수를 줄여서 다시 해 보세요.",   // 만들기가 안 될 때
  checkTitle: "보내기 전에 확인",                     // 확인 목록 제목
  tipsTitle: "잘 전해지는 요청 요령",                 // 요령 칸 제목
  again: "웨딩촬영이 끝나면 이 주소에서 \"언제\"를 본식으로 바꾸고, 촬영 때와 비교해 본식 요청서로 다시 만들 수 있어요.",   // 맨 아래 안내
  tapBig: "눌러서 크게 보기",                         // 요청서 그림 아래 작은 글씨
  saveOne: "이 장만 저장",                            // 크게 보기 위 버튼
  close: "닫기",                                      // 크게 보기 닫기

  // ===== 예시 =====
  exBusy: "예시를 여는 중이에요",                     // 예시를 여는 동안
  exBanner: "예시 요청서예요. 이름 · 날짜 · 고른 것은 지어낸 것이고, 사진은 그림이에요.",   // 예시 결과 맨 위 상자
  exWho: "{who} 예시",                                // 상자 안 고르기
  exTitleOut: "이런 요청서가 나와요",                 // 예시 결과 제목
  exPhotoName: "예시 그림",

  // ===== 요청서 그림 안에 들어가는 글 =====
  shHead: "헤어 · 메이크업 요청서",                   // 맨 위 작은 분홍 글씨
  shNoName: "{who} 요청서",                           // 큰 제목 (이름을 안 적었을 때. 적으면 "신부 김하늘")
  shPage: "{i} / {n}",                                // 오른쪽 위 쪽수
  shNothing: "고른 것이 없어요.",                     // 아무것도 안 골랐을 때 (예시용)
  shPhotosNext: "참고 사진 {n}장은 다음 장에 있어요.", // 첫 장 맨 아래
  shPhotoAll: "사진 전체를 참고해 주세요.",           // 표시 없는 사진 장
  shSide: "왼쪽 · 오른쪽은 사진에서 보이는 쪽 기준이에요.",

  // ===== 카톡에 붙일 글 =====
  txHead: "[헤어 · 메이크업 요청서] {title}",         // 첫 줄
  txHello: "안녕하세요, 선생님. 원하는 스타일을 정리해서 보내 드려요.",   // 인사
  txPhotos: "■ 참고 사진 {n}장 (번호 자리는 함께 보낸 요청서 그림에 있어요)",   // 사진 묶음 제목
  txTail: "잘 부탁드립니다.",                         // 마지막 줄

  // ===== 파일 이름 =====
  fileMain: "요청서",
  filePdf: "헤어메이크업요청서_{d}.pdf",
  fileImg: "헤어메이크업요청서_{i}_{name}.jpg",
  fileZip: "헤어메이크업요청서_{d}.zip"
};


// ===== 고를 것 =====
// 근거: docs/헤어-메이크업/조사/조사.md · 요청-목록-초안.md (2026-11-17). 사람들이 실제로 쓰는 말을 그대로 칩으로 씁니다.
// 줄(row) 칸:  id = 저장 이름(바꾸지 않아요) · label = 화면 이름 · sheet = 요청서에 적히는 줄 이름(없으면 label) · help = 줄 아래 작은 글씨
//             multi = 여러 개 고르기(없으면 하나만) · need = 이 중 하나를 골랐을 때만 보이는 줄 · pre = 요청서 맨 위 줄에서 앞에 붙는 말
// 칩(item) 칸: id = 저장 이름 · chip = 버튼 글씨 · sub = 버튼 안 작은 글씨 · s = 요청서에 적히는 말(없으면 chip) · grp = 같은 grp끼리는 하나만
// guess: 1 = 조사에서 못 찾았고 Claude가 넣은 칩이에요(검수 파일에 "(추정)"으로 표시). 사회자님이 빼도 돼요. 화면에는 차이가 없어요.
// 단계(step) 칸: short = 위 단계 줄 이름 · box = 요청서 색 상자(care 노랑 · redo 파랑 · dont 분홍) · ord = 요청서에 들어가는 순서

// 촬영 때와 비교 · 참고 사진에서 쓰는 "부분" 이름
function partItems(pre, list){ return list.map(([id, chip]) => ({ id: pre + "." + id, chip })); }
const CMP_B = [["mood", "전체 분위기"], ["skin", "피부"], ["eye", "눈 화장"], ["lash", "속눈썹"], ["brow", "눈썹"], ["cheek", "볼"], ["lip", "립"], ["hair", "헤어"]];
const CMP_G = [["mood", "전체 분위기"], ["hair", "헤어"], ["skin", "피부"], ["brow", "눈썹"], ["lip", "입술"]];

const STEPS = {
  // ===================== 신부 =====================
  b: [
    { id: "basic", kind: "info", short: "기본", title: "언제 받으세요?",
      sub: "요청서 맨 위에 들어가요. 모르는 칸은 비워 두세요.",
      rows: [
        { id: "when", label: "언제", items: [{ id: "w.shoot", chip: "웨딩촬영" }, { id: "w.day", chip: "본식" }] },
        { id: "before", label: "웨딩촬영 때도 받았나요?", need: ["w.day"], help: "받았다면 다음 단계에서 촬영 때와 비교해 적을 수 있어요. 아니면 건너뛰세요.",
          items: [{ id: "bf.same", chip: "네, 같은 샵에서", s: "웨딩촬영도 이 샵에서 받음" }, { id: "bf.other", chip: "네, 다른 샵에서", s: "웨딩촬영은 다른 샵에서 받음" }] },
        { id: "with", label: "같이 받는 사람", multi: true, pre: "함께 받음:",
          items: [{ id: "wt.g", chip: "신랑" }, { id: "wt.bm", chip: "신부 어머니" }, { id: "wt.bf", chip: "신부 아버지" }, { id: "wt.gm", chip: "신랑 어머니" }, { id: "wt.gf", chip: "신랑 아버지" }] }
      ],
      fields: [
        { id: "name", label: "이름", ph: "예: 이하늘", max: 20 },
        { id: "date", label: "날짜", type: "date", half: true },
        { id: "time", label: "예식(촬영) 시작 시간", type: "time", half: true },
        { id: "place", label: "예식장 · 스튜디오", ph: "예: 한결웨딩홀 3층", max: 40 },
        { id: "staff", label: "담당 선생님 (정해졌다면)", ph: "예: 정 원장님", max: 20 }
      ] },

    { id: "cmp", short: "촬영 비교", title: "웨딩촬영 때와 비교하면?", need: ["bf.same", "bf.other"], box: "redo", sheet: "웨딩촬영 때와 비교", ord: 2,
      sub: "촬영 때 받아 본 것이 본식의 가장 좋은 참고예요. 좋았던 것과 바꾸고 싶은 것을 골라 주세요.",
      rows: [
        { id: "cmp.keep", label: "좋았어요, 그대로 해 주세요", sheet: "촬영 때처럼", multi: true, items: partItems("ck", CMP_B) },
        { id: "cmp.less", label: "본식엔 더 자연스럽게", sheet: "더 자연스럽게", multi: true, items: partItems("cl", CMP_B) },
        { id: "cmp.more", label: "본식엔 더 또렷하게", sheet: "더 또렷하게", multi: true, items: partItems("cm", CMP_B) }
      ],
      note: "아쉬웠던 점 직접 쓰기", notePh: "예: 촬영 때 속눈썹이 무거워서 눈이 작아 보였어요." },

    { id: "care", short: "알릴 것", title: "먼저 알려 드릴 것", box: "care", sheet: "먼저 알아 주세요", ord: 1,
      sub: "선생님이 미리 알면 좋은 피부 · 눈 상태예요. 요청서 맨 위 노란 상자에 들어가요.",
      rows: [
        { id: "skin", label: "피부", multi: true,
          items: [{ id: "sk.dry", chip: "건조한 편", sub: "건성", s: "건조한 편(건성)", grp: "type" }, { id: "sk.oily", chip: "번들거리는 편", sub: "지성", s: "번들거리는 편(지성)", grp: "type" }, { id: "sk.combo", chip: "부위마다 달라요", sub: "복합성", s: "복합성", grp: "type" },
            { id: "sk.sens", chip: "예민해요" }, { id: "sk.trouble", chip: "트러블이 잘 나요" }, { id: "sk.proc", chip: "최근 피부 시술을 받았어요", guess: 1 }] },
        { id: "cover", label: "가려 주세요", sheet: "커버해 주세요", multi: true,
          items: [{ id: "cv.red", chip: "홍조 · 붉은 기" }, { id: "cv.dark", chip: "다크서클" }, { id: "cv.spot", chip: "잡티 · 기미" }, { id: "cv.acne", chip: "트러블 · 자국" }, { id: "cv.scar", chip: "흉터" }, { id: "cv.pore", chip: "모공" }] },
        { id: "eyes", label: "눈 · 눈썹", multi: true,
          items: [{ id: "ey.lens", chip: "렌즈를 껴요" }, { id: "ey.ext", chip: "속눈썹 연장을 했어요" }, { id: "ey.perm", chip: "속눈썹 펌을 했어요" }, { id: "ey.brow", chip: "눈썹 반영구를 했어요", guess: 1 }] }
      ],
      fields: [{ id: "allergy", label: "알레르기 · 트러블 나는 성분", sheet: "피해야 할 성분", ph: "예: 향이 강한 제품에 트러블이 나요", max: 80 }],
      note: "그 밖에 알려 드릴 것", notePh: "예: 오른쪽 눈이 조금 더 작아요." },

    { id: "mk", short: "메이크업", title: "메이크업", sheet: "메이크업", ord: 3,
      sub: "고른 것만 요청서에 들어가요. 잘 모르는 줄은 건너뛰세요.",
      rows: [
        { id: "mood", label: "전체 분위기", multi: true,
          items: [{ id: "md.nat", chip: "자연스럽게" }, { id: "md.clear", chip: "또렷하게" }, { id: "md.bright", chip: "화사하게" }, { id: "md.clean", chip: "깔끔하게" }, { id: "md.young", chip: "어려 보이게" }, { id: "md.grace", chip: "단아하게" }] },
        { id: "style", label: "좋아하는 스타일", help: "이름을 몰라도 괜찮아요. 참고 사진으로 보여 줘도 돼요.",
          items: [{ id: "st.shade", chip: "음영", sub: "눈매를 그윽하게", s: "음영 메이크업" }, { id: "st.nat", chip: "내추럴", s: "내추럴 메이크업" }, { id: "st.fruit", chip: "과즙", sub: "볼 · 입술에 생기", s: "과즙 메이크업" }, { id: "st.smoky", chip: "세미스모키", s: "세미스모키" }] },
        { id: "depth", label: "전체 진하기", items: [{ id: "dp.light", chip: "연하게" }, { id: "dp.mid", chip: "중간" }, { id: "dp.strong", chip: "또렷하게" }] },
        { id: "base", label: "피부 표현", multi: true,
          items: [{ id: "bs.thin", chip: "얇고 투명하게" }, { id: "bs.glow", chip: "은은한 윤기", sub: "속광", s: "은은한 윤기(속광)" }, { id: "bs.matte", chip: "보송하게", sub: "세미매트", s: "보송하게(세미매트)" }, { id: "bs.neck", chip: "목까지 톤 맞춰 주세요" }] },
        { id: "tone", label: "색", multi: true,
          items: [{ id: "tn.coral", chip: "코랄 계열" }, { id: "tn.pink", chip: "핑크 계열", guess: 1 }, { id: "tn.mine", chip: "내 피부 톤에 맞게" }, { id: "tn.noyellow", chip: "노랗게 뜨지 않게" }] },
        { id: "shadow", label: "음영 (눈두덩)", sheet: "음영", items: [{ id: "sh.yes", chip: "넣어 주세요" }, { id: "sh.little", chip: "조금만" }, { id: "sh.no", chip: "빼 주세요", guess: 1 }] },
        { id: "liner", label: "아이라인", items: [{ id: "ln.clear", chip: "또렷하게" }, { id: "ln.thin", chip: "얇고 연하게" }] },
        { id: "eye", label: "눈", multi: true, items: [{ id: "ey.puff", chip: "부어 보이지 않게" }, { id: "ey.aegyo", chip: "애교살 은은하게" }] },
        { id: "lash", label: "속눈썹", multi: true,
          items: [{ id: "ls.few", chip: "적게 · 가볍게", grp: "amt" }, { id: "ls.long", chip: "길고 또렷하게", grp: "amt" }, { id: "ls.strand", chip: "가닥으로", sub: "통으로 말고", s: "가닥으로(통으로 말고)" }, { id: "ls.curl", chip: "뷰러는 끝만" }] },
        { id: "brow", label: "눈썹", multi: true, items: [{ id: "br.mine", chip: "내 눈썹 모양대로" }, { id: "br.low", chip: "눈썹 산 낮게" }, { id: "br.soft", chip: "진하지 않게" }] },
        { id: "cheek", label: "볼 (블러셔)", sheet: "볼", items: [{ id: "bl.soft", chip: "혈색만 은은하게" }, { id: "bl.fresh", chip: "생기 있게" }] },
        { id: "lip", label: "립", multi: true,
          items: [{ id: "lp.soft", chip: "자연스러운 색", grp: "c" }, { id: "lp.clear", chip: "또렷한 색", grp: "c", guess: 1 }, { id: "lp.tell", chip: "수정용 립 색을 알려 주세요" }, { id: "lp.own", chip: "제 립스틱을 가져가요" }] }
      ],
      note: "메이크업 더 적을 것", notePh: "예: 눈 화장은 촬영 때보다 연하게 해 주세요." },

    { id: "hr", short: "헤어", title: "헤어", sheet: "헤어", ord: 4,
      sub: "본식 헤어는 드레스 · 베일과 같이 맞추는 경우가 많아요. 아는 것만 골라 주세요.",
      rows: [
        { id: "hstyle", label: "스타일",
          items: [{ id: "hs.low", chip: "로우번" }, { id: "hs.high", chip: "하이번" }, { id: "hs.gasi", chip: "가시번" }, { id: "hs.half", chip: "반묶음" }, { id: "hs.wave", chip: "푼 머리 · 웨이브" }, { id: "hs.straight", chip: "생머리" }, { id: "hs.pony", chip: "포니테일" }, { id: "hs.braid", chip: "땋은 머리" }] },
        { id: "vol", label: "볼륨", items: [{ id: "vl.calm", chip: "차분하게", guess: 1 }, { id: "vl.mid", chip: "적당히" }, { id: "vl.full", chip: "풍성하게" }] },
        { id: "fly", label: "잔머리", items: [{ id: "fl.soft", chip: "자연스럽게 빼 주세요" }, { id: "fl.none", chip: "없이 깔끔하게", guess: 1 }] },
        { id: "part", label: "가르마", help: "왼쪽 · 오른쪽은 내 머리 기준이에요.",
          items: [{ id: "pt.c", chip: "가운데" }, { id: "pt.l", chip: "왼쪽" }, { id: "pt.r", chip: "오른쪽" }, { id: "pt.same", chip: "촬영 때와 같게" }] },
        { id: "ear", label: "귀", items: [{ id: "er.hide", chip: "가려 주세요" }, { id: "er.show", chip: "보이게" }] },
        { id: "piece", label: "헤어피스", items: [{ id: "pc.yes", chip: "넣어 주세요" }, { id: "pc.no", chip: "빼 주세요" }] },
        { id: "neck", label: "드레스 넥라인",
          items: [{ id: "nk.v", chip: "브이넥" }, { id: "nk.off", chip: "오프숄더" }, { id: "nk.halter", chip: "홀터넥" }, { id: "nk.sq", chip: "스퀘어넥", guess: 1 }, { id: "nk.high", chip: "하이넥", guess: 1 }, { id: "nk.round", chip: "라운드넥", guess: 1 }] },
        { id: "acc", label: "베일 · 장식", multi: true,
          items: [{ id: "ac.veil", chip: "베일을 써요" }, { id: "ac.tiara", chip: "티아라 · 헤어 장식을 해요" }, { id: "ac.own", chip: "장식을 직접 가져가요", guess: 1 }, { id: "ac.match", chip: "베일 · 장식과 어울리게" }, { id: "ac.shoulder", chip: "어깨선을 가리지 않게" }] },
        { id: "now", label: "지금 내 머리", sheet: "지금 머리", multi: true,
          items: [{ id: "nw.short", chip: "짧은 머리", grp: "len" }, { id: "nw.bob", chip: "단발", grp: "len" }, { id: "nw.mid", chip: "어깨 길이", grp: "len" }, { id: "nw.long", chip: "긴 머리", grp: "len" }, { id: "nw.thin", chip: "숱이 적어요", grp: "amt" }, { id: "nw.thick", chip: "숱이 많아요", grp: "amt" }] },
        { id: "change", label: "머리 바꾸기", multi: true, items: [{ id: "cg.shoot", chip: "촬영 중 헤어변형을 해요" }, { id: "cg.second", chip: "2부 때 머리를 바꿔요" }] }
      ],
      note: "헤어 더 적을 것", notePh: "예: 앞머리는 옆으로 넘겨 주세요." },

    { id: "no", short: "피할 것", title: "이건 하지 말아 주세요", box: "dont", sheet: "이건 하지 말아 주세요", ord: 5,
      sub: "원하는 것만큼 피하고 싶은 것도 중요해요. 요청서에 분홍 상자로 따로 들어가요.",
      rows: [
        { id: "nomk", label: "메이크업", multi: true,
          items: [{ id: "nm.heavy", chip: "진하게 · 두껍게" }, { id: "nm.lash", chip: "통 속눈썹 · 무거운 속눈썹" }, { id: "nm.smoky", chip: "진한 아이라인 · 세미스모키" }, { id: "nm.yellow", chip: "노랗게 뜨는 피부" }, { id: "nm.pink", chip: "핑크가 강한 색" },
            { id: "nm.shine", chip: "번들거리는 물광" }, { id: "nm.stuffy", chip: "답답해 보이는 피부" }, { id: "nm.puff", chip: "부어 보이는 눈" }, { id: "nm.brow", chip: "진한 눈썹" }, { id: "nm.pencil", chip: "하얀 펜슬 애교살" }] },
        { id: "nohr", label: "헤어", multi: true, items: [{ id: "nh.vol", chip: "뒤통수 볼륨 과하게" }, { id: "nh.piece", chip: "헤어피스" }] }
      ],
      note: "그 밖에 피하고 싶은 것", notePh: "예: 눈썹 산을 높게 그리지 말아 주세요." },

    { id: "photos", kind: "photos", short: "사진", title: "참고 사진 (없어도 돼요)",
      sub: "원하는 스타일 사진, 피하고 싶은 느낌의 사진, 웨딩촬영 때 내 사진 모두 좋아요. 사진을 누르고 어느 부분인지 표시하세요." }
  ],

  // ===================== 신랑 =====================
  g: [
    { id: "basic", kind: "info", short: "기본", title: "언제 받으세요?",
      sub: "신랑 헤어 · 메이크업은 신부와 다른 선생님이 맡는 일이 많아요. 한 장으로 적어 두면 누가 맡아도 그대로 전해져요.",
      rows: [
        { id: "when", label: "언제", items: [{ id: "w.shoot", chip: "웨딩촬영" }, { id: "w.day", chip: "본식" }] },
        { id: "before", label: "웨딩촬영 때도 받았나요?", need: ["w.day"], help: "받았다면 다음 단계에서 촬영 때와 비교해 적을 수 있어요. 아니면 건너뛰세요.",
          items: [{ id: "bf.same", chip: "네, 같은 샵에서", s: "웨딩촬영도 이 샵에서 받음" }, { id: "bf.other", chip: "네, 다른 샵에서", s: "웨딩촬영은 다른 샵에서 받음" }] },
        { id: "with", label: "같이 받는 사람", multi: true, pre: "함께 받음:",
          items: [{ id: "wt.b", chip: "신부" }, { id: "wt.gm", chip: "신랑 어머니" }, { id: "wt.gf", chip: "신랑 아버지" }, { id: "wt.bm", chip: "신부 어머니" }, { id: "wt.bf", chip: "신부 아버지" }] }
      ],
      fields: [
        { id: "name", label: "이름", ph: "예: 김바다", max: 20 },
        { id: "date", label: "날짜", type: "date", half: true },
        { id: "time", label: "예식(촬영) 시작 시간", type: "time", half: true },
        { id: "place", label: "예식장 · 스튜디오", ph: "예: 한결웨딩홀 3층", max: 40 },
        { id: "staff", label: "담당 선생님 (정해졌다면)", ph: "예: 정 원장님", max: 20 }
      ] },

    { id: "cmp", short: "촬영 비교", title: "웨딩촬영 때와 비교하면?", need: ["bf.same", "bf.other"], box: "redo", sheet: "웨딩촬영 때와 비교", ord: 2,
      sub: "촬영 때 받아 본 것이 본식의 가장 좋은 참고예요. 좋았던 것과 바꾸고 싶은 것을 골라 주세요.",
      rows: [
        { id: "cmp.keep", label: "좋았어요, 그대로 해 주세요", sheet: "촬영 때처럼", multi: true, items: partItems("ck", CMP_G) },
        { id: "cmp.less", label: "본식엔 더 자연스럽게", sheet: "더 자연스럽게", multi: true, items: partItems("cl", CMP_G) },
        { id: "cmp.more", label: "본식엔 더 또렷하게", sheet: "더 또렷하게", multi: true, items: partItems("cm", CMP_G) }
      ],
      note: "아쉬웠던 점 직접 쓰기", notePh: "예: 촬영 때 피부가 하얗게 떠 보였어요." },

    { id: "care", short: "알릴 것", title: "먼저 알려 드릴 것", box: "care", sheet: "먼저 알아 주세요", ord: 1,
      sub: "선생님이 미리 알면 좋은 피부 상태예요. 요청서 맨 위 노란 상자에 들어가요.",
      rows: [
        { id: "skin", label: "피부", multi: true,
          items: [{ id: "sk.dry", chip: "건조한 편", sub: "건성", s: "건조한 편(건성)", grp: "type" }, { id: "sk.oily", chip: "번들거리는 편", sub: "지성", s: "번들거리는 편(지성)", grp: "type" }, { id: "sk.combo", chip: "부위마다 달라요", sub: "복합성", s: "복합성", grp: "type" },
            { id: "sk.sens", chip: "예민해요" }, { id: "sk.trouble", chip: "트러블이 잘 나요" }] },
        { id: "cover", label: "가려 주세요", sheet: "커버해 주세요", multi: true,
          items: [{ id: "cv.beard", chip: "수염 자국" }, { id: "cv.red", chip: "홍조 · 붉은 기" }, { id: "cv.spot", chip: "잡티" }, { id: "cv.dark", chip: "다크서클" }, { id: "cv.acne", chip: "트러블 · 자국" }, { id: "cv.scar", chip: "흉터" }] },
        { id: "etc", label: "그 밖에", multi: true,
          items: [{ id: "gt.beard", chip: "수염이 빨리 자라요" }, { id: "gt.lens", chip: "렌즈를 껴요" }, { id: "gt.brow", chip: "눈썹 반영구를 했어요", guess: 1 }] }
      ],
      fields: [{ id: "allergy", label: "알레르기 · 트러블 나는 성분", sheet: "피해야 할 성분", ph: "예: 향이 강한 제품에 트러블이 나요", max: 80 }],
      note: "그 밖에 알려 드릴 것", notePh: "예: 왼쪽 눈썹 끝에 흉터가 있어요." },

    { id: "hr", short: "헤어", title: "헤어", sheet: "헤어", ord: 3,
      sub: "신랑은 헤어가 인상을 가장 많이 바꿔요. 아는 것만 골라 주세요.",
      rows: [
        { id: "fore", label: "이마", items: [{ id: "fh.all", chip: "다 드러내기", sub: "올백", s: "다 드러내기(올백)" }, { id: "fh.half", chip: "한쪽만 드러내기" }, { id: "fh.cover", chip: "가리기", sub: "앞머리 내림", s: "가리기(앞머리 내림)" }] },
        { id: "part", label: "가르마", help: "왼쪽 · 오른쪽은 내 머리 기준이에요.",
          items: [{ id: "pt.l", chip: "왼쪽" }, { id: "pt.r", chip: "오른쪽" }, { id: "pt.c", chip: "가운데" }, { id: "pt.same", chip: "촬영 때와 같게" }] },
        { id: "gvol", label: "볼륨", sheet: "볼륨", items: [{ id: "gv.top", chip: "정수리 볼륨 있게" }, { id: "gv.calm", chip: "차분하게" }] },
        { id: "finish", label: "마무리", items: [{ id: "fn.neat", chip: "단정하게 넘겨서", sub: "포마드", s: "단정하게(포마드)" }, { id: "fn.nat", chip: "자연스럽게", sub: "평소 내 머리처럼", s: "자연스럽게(평소 내 머리처럼)" }] },
        { id: "gmore", label: "이것도 부탁해요", sheet: "그 밖에", multi: true,
          items: [{ id: "gm.side", chip: "옆머리 붙게" }, { id: "gm.matte", chip: "번들거리지 않게" }, { id: "gm.hold", chip: "흐트러지지 않게 고정" }] },
        { id: "gnow", label: "미리 하고 가는 것", sheet: "미리 한 것", multi: true,
          items: [{ id: "gn.cut", chip: "커트를 하고 가요" }, { id: "gn.down", chip: "다운펌을 하고 가요" }, { id: "gn.as", chip: "애즈펌을 했어요" }] }
      ],
      note: "헤어 더 적을 것", notePh: "예: 웨이브는 안쪽으로 넣어 주세요." },

    { id: "mk", short: "메이크업", title: "메이크업", sheet: "메이크업", ord: 4,
      sub: "신랑 메이크업은 \"티 나지 않게\"가 가장 많은 요청이에요. 아는 것만 골라 주세요.",
      rows: [
        { id: "gdepth", label: "얼마나", sheet: "정도", items: [{ id: "gd.tone", chip: "피부 톤만 정리" }, { id: "gd.nat", chip: "자연스럽게 화장" }] },
        { id: "gskin", label: "피부", multi: true,
          items: [{ id: "gs.thin", chip: "두껍지 않게" }, { id: "gs.white", chip: "하얗지 않게", sub: "내 피부색대로", s: "하얗지 않게(내 피부색대로)" }, { id: "gs.matte", chip: "번들거리지 않게" }] },
        { id: "gbrow", label: "눈썹", multi: true, items: [{ id: "gb.trim", chip: "잔털만 정리" }, { id: "gb.sym", chip: "좌우 대칭 맞춰 주세요" }, { id: "gb.subtle", chip: "티 나지 않게" }] },
        { id: "glip", label: "입술", items: [{ id: "gl.balm", chip: "보습만", sub: "립밤", s: "보습만(립밤)" }, { id: "gl.color", chip: "혈색만 살짝" }] }
      ],
      note: "메이크업 더 적을 것", notePh: "예: 수염 자국만 자연스럽게 가려 주세요." },

    { id: "no", short: "피할 것", title: "이건 하지 말아 주세요", box: "dont", sheet: "이건 하지 말아 주세요", ord: 5,
      sub: "원하는 것만큼 피하고 싶은 것도 중요해요. 요청서에 분홍 상자로 따로 들어가요.",
      rows: [
        { id: "nog", label: "피하고 싶은 것", sheet: "피해 주세요", multi: true,
          items: [{ id: "ng.white", chip: "하얗게 뜨는 피부" }, { id: "ng.thick", chip: "두꺼운 베이스" }, { id: "ng.shine", chip: "번들거리는 피부" }, { id: "ng.hair", chip: "번들거리는 머리", sub: "광택 포마드", s: "번들거리는 머리(광택 포마드)" }] }
      ],
      note: "그 밖에 피하고 싶은 것", notePh: "예: 눈썹을 진하게 그리지 말아 주세요." },

    { id: "photos", kind: "photos", short: "사진", title: "참고 사진 (없어도 돼요)",
      sub: "원하는 머리 사진, 피하고 싶은 느낌의 사진, 웨딩촬영 때 내 사진 모두 좋아요. 사진을 누르고 어느 부분인지 표시하세요." }
  ]
};

// ===== 참고 사진: 어느 부분 · 어떻게 =====  (id는 저장 이름이라 바꾸지 않아요)
const PARTS = {
  b: [{ id: "mood", chip: "전체 분위기" }, { id: "skin", chip: "피부" }, { id: "eye", chip: "눈 화장" }, { id: "lash", chip: "속눈썹" }, { id: "brow", chip: "눈썹" }, { id: "cheek", chip: "볼" }, { id: "lip", chip: "립" },
    { id: "hair", chip: "헤어 전체" }, { id: "bang", chip: "앞머리" }, { id: "fly", chip: "잔머리" }, { id: "vol", chip: "볼륨" }, { id: "part", chip: "가르마" }, { id: "deco", chip: "헤어 장식" }, { id: "veil", chip: "베일" }],
  g: [{ id: "mood", chip: "전체 분위기" }, { id: "hair", chip: "헤어 전체" }, { id: "bang", chip: "앞머리" }, { id: "fore", chip: "이마" }, { id: "part", chip: "가르마" }, { id: "side", chip: "옆머리" }, { id: "vol", chip: "볼륨" },
    { id: "brow", chip: "눈썹" }, { id: "skin", chip: "피부 톤" }, { id: "lip", chip: "입술" }]
};
// s의 {part} 자리에 위 부분 이름이 들어가요
const HOW = [
  { id: "like", chip: "이렇게 해 주세요", s: "{part}: 이 사진처럼 해 주세요." },
  { id: "not", chip: "이건 피해 주세요", s: "{part}: 이렇게는 하지 말아 주세요." },
  { id: "less", chip: "이보다 연하게", s: "{part}: 이 사진보다 연하게 해 주세요." },
  { id: "more", chip: "이보다 또렷하게", s: "{part}: 이 사진보다 또렷하게 해 주세요." },
  { id: "keep", chip: "이대로 좋아요", s: "{part}: 이대로 좋아요." }
];

// ===== 예시 (이름 · 날짜 · 고른 것은 지어낸 것) =====
const EXAMPLE = {
  b: {
    info: { name: "이하늘", date: "2026-12-12", time: "11:30", place: "한결웨딩홀 3층", allergy: "향이 강한 제품에 트러블이 나요" },
    pick: { when: ["w.day"], before: ["bf.same"], with: ["wt.g", "wt.bm"], "cmp.keep": ["ck.skin", "ck.hair"], "cmp.less": ["cl.eye", "cl.lash"],
      skin: ["sk.sens"], cover: ["cv.red"], eyes: ["ey.lens"], mood: ["md.nat", "md.bright"], base: ["bs.thin", "bs.glow"], shadow: ["sh.little"], lash: ["ls.few", "ls.strand"], lip: ["lp.tell"],
      hstyle: ["hs.low"], vol: ["vl.mid"], fly: ["fl.soft"], neck: ["nk.off"], acc: ["ac.veil", "ac.shoulder"], nomk: ["nm.lash", "nm.yellow"], nohr: ["nh.vol"] },
    notes: { cmp: "촬영 때 속눈썹이 무거워서 눈이 작아 보였어요." },
    pins: [{ id: 901, x: 0.668, y: 0.355, part: "hair", how: "like", note: "" }, { id: 902, x: 0.618, y: 0.44, part: "deco", how: "like", note: "" }, { id: 903, x: 0.695, y: 0.54, part: "cheek", how: "less", note: "" }]
  },
  g: {
    info: { name: "김바다", date: "2026-12-12", time: "11:30", place: "한결웨딩홀 3층" },
    pick: { when: ["w.day"], before: ["bf.same"], with: ["wt.b", "wt.gm"], "cmp.keep": ["ck.hair"], "cmp.less": ["cl.skin"],
      skin: ["sk.oily"], cover: ["cv.beard"], etc: ["gt.beard"], fore: ["fh.half"], part: ["pt.r"], gvol: ["gv.top"], finish: ["fn.nat"], gmore: ["gm.side", "gm.matte"], gnow: ["gn.down"],
      gdepth: ["gd.tone"], gskin: ["gs.white", "gs.thin"], gbrow: ["gb.trim", "gb.sym"], glip: ["gl.balm"], nog: ["ng.white", "ng.thick"] },
    notes: { cmp: "촬영 때 피부가 하얗게 떠 보였어요." },
    pins: [{ id: 901, x: 0.355, y: 0.4, part: "hair", how: "not", note: "이마를 한쪽만 드러내 주세요." }, { id: 902, x: 0.325, y: 0.447, part: "brow", how: "like", note: "" }]
  }
};

// ===== 보내기 전에 확인 =====
const CHECKS = [
  "이름 · 날짜 · 시작 시간이 맞게 적혔어요.",
  "피해야 할 성분 · 알레르기가 있으면 적었어요.",
  "원하는 것과 피하고 싶은 것을 둘 다 골랐어요.",
  "드레스 · 베일 사진도 같이 보여 드릴 수 있게 챙겼어요.",
  "신부 · 신랑 요청서를 따로 만들었어요."
];

// ===== 잘 전해지는 요청 요령 ===== (조사 6-2 · 1-8, 미용 조언이 아니라 전하는 방법만)
const TIPS = [
  "\"자연스럽게\"는 사람마다 기준이 달라요. 피부 · 눈 · 립처럼 부분마다 적으면 잘 전해져요.",
  "원하는 것과 피하고 싶은 것을 나눠서 말해 주세요. 피하고 싶은 느낌의 사진 한 장도 도움이 돼요.",
  "담당 선생님이 바뀌거나, 신랑 · 헤어는 다른 분이 맡기도 해요. 시작하기 전에 요청서를 보여 드리고, 미리 받는 샵이면 미리 보내세요.",
  "웨딩촬영 때 좋았던 점 · 아쉬웠던 점을 적어 두면 본식 요청이 쉬워져요.",
  "마음에 안 드는 곳은 그 자리에서 바로 말해 주세요. 헤어는 스프레이로 고정하기 전에 말하는 게 좋아요."
];
