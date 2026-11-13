// 첫 화면(허브): 결혼 준비 도구를 주제별로 모아 보여 줘요. 버튼을 누르면 그 도구의 소개 릴스로 가요. 공통 기능은 shared/common.js
// 테스트·도구 사이트 자체는 각자 폴더에 있고, 이미 공유한 폴더 이름(주소)은 바꾸지 않아요.

// ===== 주제별 도구 목록 =====================================
// 적은 순서대로 보여요. 주제는 결혼 준비 순서(식 전 → 음악 → 식순 → 낭독 → 가족 → 식 후), 주제 안은 식순 순서.
//   name  : 주제 이름 (작은 분홍 글씨)
//   key   : shared/common.js 사이트 목록(SITES)의 키
//   label : 버튼 글씨 — 무엇을 준비하는 도구인지 바로 알 수 있는 이름 (후킹 문장은 쓰지 않아요)
// 버튼이 켜질지는 SITES의 reel 칸을 보고 저절로 정해져요:
//   reel 주소가 있으면 → 켜진 버튼, 누르면 그 릴스로
//   reel이 비어 있으면 → 흐린 버튼 "준비 중" (누를 수 없음)
// 그래서 릴스를 올리고 SITES에 주소만 넣으면 여기 버튼도 같이 켜져요.
// 새 사이트를 만들면 SITES에 한 줄 + 여기 알맞은 주제에 한 줄.
const GROUPS = [
  { name: "결혼 준비 전체", items: [
    { key: "ready", label: "결혼 준비 체크리스트" }
  ]},
  { name: "날짜 · 청첩장 모임", items: [
    { key: "date",  label: "결혼 날짜 후보 찾기" },
    { key: "table", label: "청첩장 모임 장소 찾기" }
  ]},
  { name: "결혼식 음악", items: [
    { key: "groom",    label: "신랑 입장곡 찾기" },
    { key: "bride",    label: "신부 입장곡 찾기" },
    { key: "serenade", label: "축가 찾기" },
    { key: "march",    label: "행진곡 찾기" },
    { key: "cue",      label: "입장 타이밍 큐시트" }
  ]},
  { name: "식순 · 영상", items: [
    { key: "flow", label: "식순표 만들기" },
    { key: "film", label: "식전영상 만들기" },
    { key: "filmPlus", label: "식전영상 만들기 (업그레이드)" },
    { key: "select", label: "웨딩사진 셀렉 도우미" },
    { key: "retouch", label: "웨딩사진 수정 요청서" }
  ]},
  { name: "식에서 읽는 글", items: [
    { key: "vows",     label: "혼인서약서 만들기" },
    { key: "declare",  label: "성혼선언문 만들기" },
    { key: "blessing", label: "부모님 덕담 만들기" }
  ]},
  { name: "부모님 · 신랑 역할", items: [
    { key: "parents",     label: "양가 부모님 입장·화촉점화 안내" },
    { key: "parentsQuiz", label: "부모님 본식 역할 퀴즈" },
    { key: "groomQuiz",   label: "신랑 본식 역할 퀴즈" }
  ]},
  { name: "결혼식 후", items: [
    { key: "thanks", label: "감사 문자·땡큐 카드 만들기" },
    { key: "pack",   label: "신혼여행 짐 체크리스트" }
  ]}
];
// =========================================================

function tool(it){
  const s = SITES[it.key];
  const name = `<span class="name">${esc(it.label)}</span>`;
  return s && s.reel
    ? siteLink(it.key, "go tool", `${name}<span class="arr" aria-hidden="true">→</span>`)
    : `<button class="tool" disabled>${name}<span class="q">준비 중</span></button>`;
}

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>결혼 준비 도구</span><span>전부 무료</span></div>
    ${brandLogo()}
    <p class="for">예비 신랑·신부님을 위한</p>
    <h1>우리 결혼식<br>준비하기</h1>
    <div class="bar"></div>
    <p class="lead">필요한 것을 골라 눌러 보세요.</p>
    ${GROUPS.map(g=>`
    <section class="group">
      <h2>${esc(g.name)}</h2>
      <div class="pick">${g.items.map(tool).join("")}</div>
    </section>`).join("")}
    ${foot()}`;
}

// 예전 주소(#groom)로 들어와도 신랑 입장곡 테스트(groom/)로 옮겨줘요
const hash = (location.hash||"").replace("#","");
if(hash==="groom"){ location.replace(siteUrl("groom")); }
else home();
