// 결혼식 당일 준비 카테고리: 이 카테고리의 사이트를 고르는 화면. 공통 기능은 shared/common.js

// ===== 이 카테고리의 사이트 목록 ============================
//   key   : shared/common.js 사이트 목록의 키
//   label : 버튼 큰 글씨 · q : 버튼 오른쪽 작은 글씨
//   open  : 공개하면 true (그 사이트 app.js의 OPEN도 같이 true로)
const ITEMS = [
  { key: "parents", label: "양가 부모님 입장·화촉점화", q: "부모님께 보낼 순서 카드", open: false }
];
// =========================================================

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>결혼식 당일 준비</span><span>전부 무료</span></div>
    ${brandLogo()}
    <p class="for">예비 신랑·신부님을 위한</p>
    <h1>결혼식 당일<br>준비하기</h1>
    <div class="bar"></div>
    <p class="lead">식 당일에 누가 언제 무엇을 하는지, 한 장으로 정리해 드려요.</p>
    <div class="pick">
      ${ITEMS.map(it=>it.open
        ? siteLink(it.key,"go",`<span>${esc(it.label)}</span><span class="q">${esc(it.q)}</span>`)
        : `<button disabled><span>${esc(it.label)}</span><span class="q">곧 공개</span></button>`).join("")}
    </div>
    ${foot()}`;
}
home();
