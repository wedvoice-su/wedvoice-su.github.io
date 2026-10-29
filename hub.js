// 첫 화면(허브): 카테고리를 고르면 그 카테고리 페이지로 가요. 공통 기능은 shared/common.js
// 테스트·도구 사이트 자체는 각자 폴더에 있고, 이미 공유한 폴더 이름(주소)은 바꾸지 않아요.

// ===== 카테고리 목록 ======================================
// 새 카테고리 페이지를 만들면 여기에 한 줄 추가하세요. 적은 순서대로 버튼이 보여요.
//   path : 카테고리 폴더 이름 (song → wedvoice-su.github.io/song/)
//   name : 버튼 큰 글씨
//   desc : 버튼 아래 작은 글씨 (무엇이 들어 있는지)
const CATEGORIES = [
  { path: "song", name: "결혼식 음악 찾기", desc: "신랑 입장곡 · 신부 입장곡 · 행진곡 · 축가" }
  // 공개할 때 아래 줄 앞의 // 를 지우세요 (big-day/day.js의 open과 for-our-parents/app.js의 OPEN도 같이 true로)
  // ,{ path: "big-day", name: "결혼식 당일 준비", desc: "양가 부모님 안내 · 부모님 본식 점수 퀴즈" }
];
// =========================================================

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>결혼식 준비 도구</span><span>전부 무료</span></div>
    ${brandLogo()}
    <p class="for">예비 신랑·신부님을 위한</p>
    <h1>우리 결혼식<br>준비하기</h1>
    <div class="bar"></div>
    <p class="lead">필요한 것을 골라 눌러 보세요.</p>
    <div class="pick">
      ${CATEGORIES.map(c=>`<a class="go cat" href="${ROOT}${esc(c.path)}/"><span class="name">${esc(c.name)}<span class="arr" aria-hidden="true">→</span></span><span class="q">${esc(c.desc)}</span></a>`).join("")}
    </div>
    ${foot()}`;
}

// 예전 주소(#groom)로 들어와도 신랑 입장곡 테스트(groom/)로 옮겨줘요
const hash = (location.hash||"").replace("#","");
if(hash==="groom"){ location.replace(siteUrl("groom")); }
else home();
