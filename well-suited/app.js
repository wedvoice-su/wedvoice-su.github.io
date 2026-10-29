// 우리 신랑 본식 점수 퀴즈: O/X 10문제 → 문제마다 바로 해설 → 점수 카드 (부모님 퀴즈 full-marks/와 같은 구조)
// 공통 기능은 shared/common.js. 문구를 바꾸려면 아래 "문구"·QUIZ·TIERS만 고치면 돼요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/well-suited/?preview)
const OPEN = false;
// =========================================================

// ===== 문구 =====
const SITE = {
  name: "신랑 본식 점수 퀴즈",
  kicker: "예비 신랑님을 위한",
  title: "신랑 본식\n점수 퀴즈",
  lead: "결혼식 당일 신랑이 알아야 할 것, O/X 10문제예요. 신부님이 보내 주셨다면 지금 바로 풀어 보세요.",
  kind: "우리 신랑 본식 점수 퀴즈",   // 카드 맨 위 작은 글씨
  hint: "이 카드를 저장해서 신부님께 보내 주세요",
  yes: "맞아요", no: "아니에요",
  right: "정답이에요!", wrong: "아쉬워요.",
  next: "다음 문제", last: "점수 보기",
  missHead: "이것만 기억하세요",
  perfect: "전부 맞혔어요",
  perfectLine: "열 문제 모두 정답이에요. 당일에도 이대로만 하면 돼요.",
  formulaHead: "서 있을 때 공식",
  formula: "어깨 펴고 · 배에 힘 · 턱은 내리고 · 손은 주머니 밖 · 시선은 신부에게",
  tip: "신랑이 든든하면 신부가 편해요. 순서는 제가 챙길 테니, 신랑님은 어깨 펴고 신부만 바라보세요.",
  copyBtn: "신랑에게 보낼 링크 복사하기",
  copyDone: "링크를 복사했어요. 카톡으로 신랑에게 보내 주세요."
};

// 문제: q 문장 · ok 정답(true = 맞아요, false = 아니에요) · why 해설(틀리면 카드에 남아요)
const QUIZ = [
  { q: "입장할 때는 긴장되니까 빨리 걸어서 빨리 끝내는 게 낫다.",
    ok: false, why: "평소보다 한 박자 천천히, 보폭은 시원하게. 너무 느린 거북이걸음도 어색해요." },
  { q: "행진할 때 신랑은 신부보다 반 보 앞에서 걷는다.",
    ok: true,  why: "드레스와 베일을 밟지 않는 자리예요. 속도는 신부에게 맞추세요." },
  { q: "양가 부모님께 인사할 때, 신랑이 먼저 숙이고 먼저 일어나도 괜찮다.",
    ok: false, why: "신부와 타이밍·각도를 맞춰요. 전날 \"하나, 둘, 셋\" 구호로 한 번 맞춰 보세요." },
  { q: "서 있을 때 손은 주머니에 넣거나 주먹을 쥐면 안정적으로 보인다.",
    ok: false, why: "손은 주머니 밖, 자연스럽게 내리거나 가볍게 모아요. 주먹은 긴장해 보여요." },
  { q: "본식 전 리허설은 신부가 하고, 신랑은 안 해도 된다.",
    ok: false, why: "신부는 대기실에 있어서 보통 신랑이 직원·사회자와 리허설해요. 입장 동선과 이벤트 순서를 여기서 확인하세요." },
  { q: "웃는 게 어색하면 하객석 대신 신부를 자주 바라보면 된다.",
    ok: true,  why: "신부를 바라보는 얼굴이 가장 자연스럽게 찍혀요. 무표정만 피하면 돼요." },
  { q: "신랑 양말은 바지에 가려지니 발목 양말이어도 괜찮다.",
    ok: false, why: "앉거나 절할 때 바로 보여요. 무늬 없는 검은색 긴 양말을 신으세요." },
  { q: "예복을 입고 미리 절을 해 보는 건 유난이다.",
    ok: false, why: "예복은 핏이 있어서 팔이 안 올라가거나 바지가 당겨요. 전날 한 번만 해 보세요." },
  { q: "성혼선언문은 누가 읽든 신랑·신부는 하객을 바라보고 듣는다.",
    ok: false, why: "사회자가 읽으면 하객 쪽을, 어른이 단상에서 읽으면 그분을 바라봐요." },
  { q: "순서를 다 외우지 못하면 당일에 큰일 난다.",
    ok: false, why: "사회자가 한 순서씩 안내해요. 신호만 따라오면 돼요." }
];

// 점수 구간: 위에서부터 보고, 점수가 min 이상이면 그 구간
const TIERS = [
  { min: 8, title: "신랑 만점이에요",            line: "이제 긴장만 안 하면 돼요. 신부 옆에서 든든하게 서 있기만 하면 됩니다." },
  { min: 5, title: "거의 다 알고 있어요",         line: "틀린 것 두세 가지만 기억하면 당일에 당황할 일이 없어요." },
  { min: 0, title: "사회자 신호만\n따라오면 돼요", line: "당일에는 제가 한 순서씩 안내해요. 틀린 것만 한 번 읽어 두세요." }
];

// ===== 상태 =====
let step = 0;     // 지금 문제 번호 (0부터)
let wrong = [];   // 틀린 문제 번호

function score(){ return QUIZ.length - wrong.length; }

// ===== 첫 화면 =====
function home(){
  step = 0; wrong = [];
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0,0);
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.name)}</span><span>1분</span></div>
    ${brandLogo()}
    <p class="for">${esc(SITE.kicker)}</p>
    <h1>${esc(SITE.title).replace(/\n/g,"<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(SITE.lead)}</p>
    <div class="pick"><button id="start"><span>시작하기</span><span class="q">10문제, 1분</span></button></div>
    <button class="text-btn" id="copy">${esc(SITE.copyBtn)}</button>
    <p class="msg" id="msg" role="status"></p>
    ${foot()}`;
  document.getElementById("start").onclick = start;
  document.getElementById("copy").onclick = copyQuizLink;
}

function start(){
  step = 0; wrong = [];
  ask();
}

// 신부가 신랑에게 보낼 주소. 공개 전에는 ?preview 를 붙여서 복사해요.
async function copyQuizLink(){
  const msg = document.getElementById("msg");
  const link = location.origin + location.pathname + (OPEN ? "" : "?preview");
  try{ await navigator.clipboard.writeText(link); msg.textContent = SITE.copyDone; }
  catch(e){ msg.textContent = link; }
}

// ===== 문제 =====
function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap"; window.scrollTo(0,0);
  const q = QUIZ[step], last = step + 1 === QUIZ.length;
  let locked = false;
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.name)}</span><span class="count">${pad(step+1)} / ${pad(QUIZ.length)}</span></div>
    <h2 class="question">${esc(q.q)}</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      <button data-v="1"><span class="box">${CHECK}</span><span>${esc(SITE.yes)}</span></button>
      <div class="div"></div>
      <button data-v="0"><span class="box">${CHECK}</span><span>${esc(SITE.no)}</span></button>
    </div>
    <div class="check" id="check" hidden></div>
    <div class="under"><span></span><button class="text-btn" id="home">처음으로</button></div>
    ${foot()}`;
  const buttons = app.querySelectorAll(".answers button");
  buttons.forEach(b=>b.onclick=()=>{
    if(locked) return; locked = true;
    b.classList.add("on");
    buttons.forEach(x=>x.disabled = true);
    const hit = (b.dataset.v === "1") === q.ok;
    if(!hit) wrong.push(step);
    const box = document.getElementById("check");
    box.className = "check " + (hit ? "hit" : "miss");
    box.innerHTML = `<b>${esc(hit ? SITE.right : SITE.wrong)}</b><p>${esc(q.why)}</p><button class="btn main" id="next">${esc(last ? SITE.last : SITE.next)}</button>`;
    box.hidden = false;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    document.getElementById("next").onclick = ()=>{
      step++;
      step < QUIZ.length ? ask() : reveal(`${score()} / ${QUIZ.length}점`, result);
    };
  });
  document.getElementById("home").onclick = home;
}

// ===== 점수 카드 =====
function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const n = score(), tier = TIERS.find(t=>n >= t.min);
  app.innerHTML = `
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(SITE.kind)}</span><span class="handle">@wed_voice.su</span></div>
      <p class="score"><span class="n">${n}</span><span class="of">/ ${QUIZ.length}점</span></p>
      <h2>${esc(tier.title).replace(/\n/g,"<br>")}</h2>
      <p class="line">${esc(tier.line)}</p>
      <div class="miss">
        <b>${esc(wrong.length ? SITE.missHead : SITE.perfect)}</b>
        ${wrong.length
          ? `<ol>${wrong.map(i=>`<li><span class="n">${i+1}</span><span class="t"><span class="q">${esc(QUIZ[i].q)}</span><span class="a">${esc(QUIZ[i].ok ? SITE.yes : SITE.no)} · ${esc(QUIZ[i].why)}</span></span></li>`).join("")}</ol>`
          : `<p>${esc(SITE.perfectLine)}</p>`}
      </div>
      <div class="note-box"><b>${esc(SITE.formulaHead)}</b><p>${esc(SITE.formula)}</p></div>
      <div class="tip"><b>사회자 한마디</b><p>${esc(SITE.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">${esc(SITE.hint)}</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <p class="msg" id="msg" role="status"></p>
        ${siteLink("groom","btn ghost","신랑 입장곡 찾기 테스트")}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="again">다시 풀기</button>
      </div>
    </div>`;
  window.scrollTo(0,0);
  prepareImage("신랑-퀴즈-점수");
  document.getElementById("save").onclick = saveCard;
  document.getElementById("again").onclick = start;
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.name)}</span><span>1분</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>${esc(SITE.title).replace(/\n/g,"<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      <a class="go" href="${ROOT}song/"><span>결혼식 음악 찾기 테스트 먼저 하기</span></a>
    </div>
    ${foot()}`;
}

// 미리 보기: 주소 뒤에 ?preview 또는 #preview (대소문자 상관없음). 한 번 열면 이 브라우저에서는 계속 미리 보기로 열려요.
function isPreview(){
  const u = (location.search + location.hash).toLowerCase();
  if(u.includes("preview")){ try{ sessionStorage.setItem("preview","1"); }catch(e){} return true; }
  try{ return sessionStorage.getItem("preview")==="1"; }catch(e){ return false; }
}
function route(){
  if(!OPEN && !isPreview()){ soon(); return; }
  home();
}
route();
