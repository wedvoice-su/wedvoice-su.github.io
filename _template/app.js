// 새 사이트 기본 틀: 첫 화면 → 질문 → 결과 카드. 공통 기능은 shared/common.js
// TODO 표시된 곳을 이 사이트 내용으로 바꾸세요. 질문이 필요 없으면 start()에서 바로 result()를 부르면 돼요.

// ===== 데이터 (TODO) =====
const SITE = {
  "kicker": "예비 신랑·신부님을 위한",
  "title": "사이트\n이름",
  "lead": "한 줄 설명",
  "call": "결과 공개!",       // 결과 직전에 크게 나오는 문구
  "questions": [
    { "q": "질문 1", "a": "답 A", "b": "답 B" }
  ]
};

let answers = [];

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(SITE.kicker)}</p>
    <h1>${esc(SITE.title).replace(/\n/g,"<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(SITE.lead)}</p>
    <div class="pick"><button id="start"><span>시작하기</span></button></div>
    ${foot()}`;
  document.getElementById("start").onclick = start;
}

function start(){
  answers = [];
  ask();
}

function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const i = answers.length, q = SITE.questions[i];
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.title.replace(/\n/g," "))}</span><span class="count">${pad(i+1)} / ${pad(SITE.questions.length)}</span></div>
    <h2 class="question">${esc(q.q)}</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      <button data-v="1"><span class="box">${CHECK}</span><span>${esc(q.a)}</span></button>
      <div class="div"></div>
      <button data-v="0"><span class="box">${CHECK}</span><span>${esc(q.b)}</span></button>
    </div>
    ${foot()}`;
  app.querySelectorAll(".answers button").forEach(b=>b.onclick=()=>{
    if(app.dataset.lock) return; app.dataset.lock="1";
    b.classList.add("on");
    setTimeout(()=>{
      delete app.dataset.lock;
      answers.push(+b.dataset.v);
      answers.length < SITE.questions.length ? ask() : reveal(SITE.call, result);
    }, reduce?60:260);
  });
}

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  // TODO: answers로 결과 정하기
  app.innerHTML = `
    <article class="card" id="card">
      <div class="head"><span class="kind">나의 결과</span><span class="handle">@wed_voice.su</span></div>
      <h2>결과 이름</h2>
      <p class="line">한 줄 요약</p>
      <p class="desc">설명</p>
      <div class="tip"><b>사회자 한마디</b><p>사회자 꿀팁</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">이 카드를 캡처하거나 저장해서 스토리에 올려보세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <p class="msg" id="msg" role="status"></p>
        ${siteLink("groom","btn ghost","신랑 입장곡 찾기 테스트")}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="copy">링크 복사하기</button>
        <button class="text-btn btn-link" id="again">다시 하기</button>
      </div>
    </div>`;
  window.scrollTo(0,0);
  prepareImage("결과");  // 저장될 이미지 파일 이름
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copy").onclick = ()=>copyLink();
  document.getElementById("again").onclick = start;
}

home();
