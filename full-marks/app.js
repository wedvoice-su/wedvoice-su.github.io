// 우리 부모님 본식 점수 퀴즈: O/X 10문제 → 문제마다 바로 해설 → 점수 카드
// 공통 기능은 shared/common.js. 문구를 바꾸려면 아래 "문구"·QUIZ·TIERS만 고치면 돼요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/full-marks/?preview)
const OPEN = false;
// =========================================================

// ===== 문구 =====
const SITE = {
  name: "부모님 본식 점수 퀴즈",
  kicker: "양가 부모님을 위한",
  title: "본식 점수\n퀴즈",
  lead: "결혼식 당일 부모님이 하실 순서, O/X 10문제예요. 틀려도 괜찮아요. 틀린 것만 알려 드려요.",
  kind: "우리 부모님 본식 점수 퀴즈",   // 카드 맨 위 작은 글씨
  hint: "이 카드를 저장해서 자녀에게 보내 주세요",
  yes: "맞아요", no: "아니에요",
  right: "정답이에요!", wrong: "아쉬워요.",
  next: "다음 문제", last: "점수 보기",
  missHead: "이것만 기억하세요",
  perfect: "전부 맞히셨어요",
  perfectLine: "열 문제 모두 정답이에요. 당일에도 이대로만 하시면 돼요.",
  remember: "당일에는 사회자가 한 순서씩 안내해 드려요. 신호를 듣고 천천히 움직이시면 돼요.",
  tip: "처음이라 긴장되시는 게 당연해요. 순서는 제가 챙길게요. 부모님은 자녀의 가장 좋은 날을 편안하게 즐기셨으면 해요.",
  copyBtn: "부모님께 보낼 링크 복사하기",
  copyDone: "링크를 복사했어요. 카톡으로 부모님께 보내 드리세요."
};

// 문제: q 문장 · ok 정답(true = 맞아요, false = 아니에요) · why 해설(틀리면 카드에 남아요)
// 어느 진행 방식(어머님만 화촉점화 / 네 분 입장)에서도 정답이 같도록 썼어요.
const QUIZ = [
  { q: "화촉점화 불을 붙인 뒤에는, 사회자 안내를 기다리지 않고 바로 자리로 가도 된다.",
    ok: false, why: "다음 순서(맞절·인사·자리로)는 사회자가 마이크로 신호를 드려요. 신호를 듣고 움직이세요." },
  { q: "화촉점화는 신부 쪽이 먼저 불을 붙인다.",
    ok: false, why: "신랑 쪽이 먼저, 신부 쪽이 다음이에요. 예식장에 따라 두 분이 동시에 하기도 해요." },
  { q: "맞절은 하객석을 향해 한다.",
    ok: false, why: "맞절은 양가가 서로 마주 보고 해요. 하객석을 바라보는 건 그다음 \"인사\"예요." },
  { q: "혼주석에서 버진로드와 가까운 안쪽 자리에는 아버님이 앉는다.",
    ok: false, why: "안쪽(버진로드 쪽)은 어머님, 바깥쪽은 아버님이에요." },
  { q: "신부가 아버님과 입장하는 결혼식이라면, 신부 아버님은 화촉점화를 마치고 혼주석에 앉아 신부 입장을 기다린다.",
    ok: false, why: "신랑이 입장하는 동안 다시 입구로 가서 신부와 함께 기다리세요." },
  { q: "단상으로 나가실 때는 평소보다 조금 천천히 걷는 게 좋다.",
    ok: true,  why: "긴장하면 걸음이 빨라져요. 사진·영상에 예쁘게 담기는 속도는 평소보다 한 박자 느린 걸음이에요." },
  { q: "하객 인사는 양가가 같은 각도로 맞추는 게 좋다.",
    ok: true,  why: "각도가 다르면 사진에서 바로 보여요. 리허설 때 한 번만 맞춰 보세요." },
  { q: "불이 잘 안 붙으면 잠시 표정을 풀어도 괜찮다.",
    ok: false, why: "직원이 바로 도와드려요. 그동안도 카메라는 돌아가니 미소를 유지하세요." },
  { q: "아버님 양말은 발목 양말이어도 괜찮다.",
    ok: false, why: "혼주석에 앉으면 바지가 올라가요. 무늬 없는 검은색 긴 양말을 신으세요." },
  { q: "순서를 다 외우지 못하면 당일에 큰일 난다.",
    ok: false, why: "사회자가 한 순서씩 안내해 드려요. 신호만 따라오시면 돼요." }
];

// 점수 구간: 위에서부터 보고, 점수가 min 이상이면 그 구간
const TIERS = [
  { min: 8, title: "혼주 만점이에요",            line: "이제 긴장만 안 하시면 돼요. 자녀의 가장 좋은 날, 편안하게 즐기세요." },
  { min: 5, title: "거의 다 아셨어요",           line: "틀린 것 두세 가지만 기억하시면 당일에 당황할 일이 없어요." },
  { min: 0, title: "사회자 신호만\n따라오시면 돼요", line: "당일에는 제가 한 순서씩 마이크로 안내해 드려요. 틀린 것만 한 번 읽어 두세요." }
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

// 예비부부가 부모님께 보낼 주소. 공개 전에는 ?preview 를 붙여서 복사해요.
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
  const parentsUrl = siteUrl("parents") + (isPreview() ? "?preview" : "");
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
      <div class="note-box"><b>꼭 기억하세요</b><p>${esc(SITE.remember)}</p></div>
      <div class="tip"><b>사회자 한마디</b><p>${esc(SITE.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">${esc(SITE.hint)}</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <p class="msg" id="msg" role="status"></p>
        <a class="btn ghost" href="${parentsUrl}">양가 부모님 순서 카드 보기</a>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="again">다시 풀기</button>
      </div>
    </div>`;
  window.scrollTo(0,0);
  prepareImage("부모님-퀴즈-점수");
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
