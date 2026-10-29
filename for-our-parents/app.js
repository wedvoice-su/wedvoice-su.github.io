// 양가 부모님 입장·화촉점화 안내: 진행 방식 고르기 → 부모님께 보내 드릴 안내 카드
// 공통 기능은 shared/common.js. 문구를 바꾸려면 아래 "문구"만 고치면 돼요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/for-our-parents/?preview 또는 …/for-our-parents/#preview)
const OPEN = false;
// =========================================================

// ===== 문구 =====
const SITE = {
  name: "양가 부모님 안내",
  kicker: "양가 부모님을 위한",
  title: "화촉점화,\n이렇게\n하시면 돼요",
  lead: "진행 방식만 고르면 양가 부모님 동선이 순서대로 정리돼요. 어른들께 보내 드릴 안내 카드가 나와요.",
  kind: "양가 부모님 입장·화촉점화 안내",   // 카드 맨 위 작은 글씨
  hint: "이 카드를 저장해서 양가 부모님께 보내 드리세요",
  // 카드 맨 위 한 줄
  line: "사회자가 한 순서씩 마이크로 안내해 드려요. 이 순서만 알고 계시면 돼요.",
  // 사회자 한마디
  tip: "순서를 외우실 필요는 없어요. 안내에 따라 천천히 움직이시면 됩니다. 처음이라 긴장되시는 게 당연해요. 자녀의 가장 좋은 날, 부모님도 편안하게 즐기셨으면 해요."
};

// 질문: a를 고르면 next.a, b를 고르면 next.b 질문으로. null이면 결과로.
const QUESTIONS = {
  enter: { q: "양가 부모님\n입장이 있나요?",   a: "네, 네 분이 입장해요",        b: "아니요, 어머님 두 분만\n화촉점화해요", next: { a: "who",   b: "bride" } },
  who:   { q: "화촉점화는\n누가 하시나요?",    a: "양가 부모님 네 분이 함께",    b: "어머님 두 분이",                    next: { a: "bride", b: "greet" } },
  greet: { q: "하객 인사는\n언제 하시나요?",   a: "맞절 뒤에 네 분이 함께",      b: "화촉점화 뒤에 어머님 두 분이",       next: { a: "bride", b: "bride" } },
  bride: { q: "신부는\n누구와 입장하나요?",   a: "아버님과 함께",              b: "혼자, 또는 신랑과 함께",             next: { a: null,    b: null } }
};
const FIRST = "enter";

// 진행 방식별 순서. [누가, 무엇을, (작은 설명)]
const FLOWS = {
  mothers: {
    name: "어머님 화촉점화", title: "어머님\n화촉점화", call: "양가 어머님,\n화촉점화!",
    steps: [
      ["신랑 어머님", "화촉점화"],
      ["신부 어머님", "화촉점화"],
      ["양가 어머님", "마주 보고 맞절"],
      ["양가 어머님", "하객을 바라보고 인사"],
      ["양가 어머님", "자리로 돌아가기"]
    ],
    remember: "불을 붙이신 뒤 바로 자리로 가지 마세요. 사회자가 “양가 어머님, 맞절!”, “양가 어머님, 인사!” 하고 신호를 드리면 그때 맞절과 하객 인사를 하고 자리로 돌아가세요."
  },
  all4: {
    name: "양가 부모님 입장, 네 분 화촉점화", title: "양가 부모님 입장,\n네 분 화촉점화", call: "양가 부모님,\n입장!",
    steps: [
      ["신랑 부모님", "입장"],
      ["신랑 부모님", "단상 앞에서 잠시 기다리기", "신부 부모님이 오실 때까지"],
      ["신부 부모님", "입장"],
      ["양가 부모님", "함께 단상으로"],
      ["신랑 부모님", "화촉점화"],
      ["신부 부모님", "화촉점화"],
      ["양가 부모님", "마주 보고 맞절"],
      ["양가 부모님", "하객을 바라보고 인사"],
      ["양가 부모님", "자리로 돌아가기"]
    ],
    remember: "불을 붙이신 뒤 바로 자리로 가지 마세요. 사회자가 “양가 부모님, 맞절!”, “양가 부모님, 인사!” 하고 신호를 드리면 그때 맞절과 하객 인사를 하고 자리로 돌아가세요."
  },
  greetFirst: {
    name: "양가 부모님 입장, 인사 먼저 어머님 화촉점화", title: "양가 부모님 입장,\n인사 먼저\n어머님 화촉점화", call: "양가 부모님,\n입장!",
    steps: [
      ["신랑 부모님", "입장"],
      ["신부 부모님", "입장"],
      ["양가 부모님", "마주 보고 맞절"],
      ["양가 부모님", "하객을 바라보고 인사"],
      ["양가 아버님", "자리로 돌아가기"],
      ["양가 어머님", "화촉점화", "신랑 어머님 → 신부 어머님 (예식장에 따라 두 분이 동시에 하기도 해요)"],
      ["양가 어머님", "자리로 돌아가기"]
    ],
    remember: "아버님은 하객 인사 뒤에 먼저 자리로 가세요. 어머님은 화촉점화까지 하고 자리로 돌아가세요."
  },
  lightFirst: {
    name: "양가 부모님 입장, 어머님 화촉점화 뒤 인사", title: "양가 부모님 입장,\n어머님 화촉점화\n뒤 인사", call: "양가 부모님,\n입장!",
    steps: [
      ["신랑 부모님", "입장"],
      ["신부 부모님", "입장"],
      ["양가 부모님", "마주 보고 맞절"],
      ["양가 아버님", "자리로 돌아가기"],
      ["양가 어머님", "화촉점화", "신랑 어머님 → 신부 어머님 (예식장에 따라 두 분이 동시에 하기도 해요)"],
      ["양가 어머님", "하객을 바라보고 인사"],
      ["양가 어머님", "자리로 돌아가기"]
    ],
    remember: "아버님은 맞절 뒤에 먼저 자리로 가세요. 어머님은 화촉점화와 하객 인사까지 하고 자리로 돌아가세요."
  }
};

// 함께 알아 두실 것
const NOTES = {
  seat:     { b: "혼주석 자리",   p: "버진로드와 가까운 쪽에 어머님, 바깥쪽에 아버님이 앉으세요." },
  brideDad: { b: "신부 아버님",   p: "양가 부모님 입장과 화촉점화가 끝나면, 신랑이 입장하는 동안 다시 입구로 가서 신부와 함께 기다리세요." },
  brideDadMothers: { b: "신부 아버님", p: "어머님 화촉점화가 끝나면, 신랑이 입장하는 동안 입구로 가서 신부와 함께 기다리세요." },
  remember: { b: "꼭 기억하세요" }
};

// ===== 상태 =====
let order = [];   // 지나온 질문 id
let A = {};       // 답 (1 = A, 0 = B)

function flowKey(){
  if(A.enter === 0) return "mothers";
  if(A.who === 1) return "all4";
  return A.greet === 1 ? "greetFirst" : "lightFirst";
}
// 지금 질문부터 결과까지 가장 긴 길이 (번호 표시용)
function depth(id){
  if(!id) return 0;
  const n = QUESTIONS[id].next;
  return 1 + Math.max(depth(n.a), depth(n.b));
}

// ===== 첫 화면 =====
function home(){
  order = []; A = {};
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0,0);
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.name)}</span><span>1분</span></div>
    ${brandLogo()}
    <p class="for">${esc(SITE.kicker)}</p>
    <h1>${esc(SITE.title).replace(/\n/g,"<br>")}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(SITE.lead)}</p>
    <div class="pick"><button id="start"><span>시작하기</span><span class="q">질문 2~4개</span></button></div>
    ${foot()}`;
  document.getElementById("start").onclick = start;
}

function start(){
  order = []; A = {};
  ask(FIRST);
}

// ===== 질문 =====
function ask(id){
  document.body.classList.remove("is-cover");
  app.className = "wrap"; window.scrollTo(0,0);
  const q = QUESTIONS[id], i = order.length, total = i + depth(id);
  app.innerHTML = `
    <div class="top"><span>${esc(SITE.name)}</span><span class="count">${pad(i+1)} / ${pad(total)}</span></div>
    <h2 class="question">${esc(q.q)}</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      <button data-v="1"><span class="box">${CHECK}</span><span>${esc(q.a).replace(/\n/g,"<br>")}</span></button>
      <div class="div"></div>
      <button data-v="0"><span class="box">${CHECK}</span><span>${esc(q.b).replace(/\n/g,"<br>")}</span></button>
    </div>
    <div class="under">${i ? '<button class="text-btn" id="back">이전</button>' : '<span></span>'}<button class="text-btn" id="home">처음으로</button></div>
    ${foot()}`;
  app.querySelectorAll(".answers button").forEach(b=>b.onclick=()=>{
    if(app.dataset.lock) return; app.dataset.lock="1";
    b.classList.add("on");
    setTimeout(()=>{
      delete app.dataset.lock;
      const v = +b.dataset.v;
      A[id] = v; order.push(id);
      const next = q.next[v ? "a" : "b"];
      next ? ask(next) : reveal(FLOWS[flowKey()].call, result);
    }, reduce?60:260);
  });
  const back = document.getElementById("back");
  if(back) back.onclick = ()=>{ const prev = order.pop(); delete A[prev]; ask(prev); };
  document.getElementById("home").onclick = home;
}

// ===== 결과 카드 =====
function notesFor(key){
  const f = FLOWS[key], list = [];
  list.push(NOTES.seat);
  if(A.bride === 1) list.push(key === "mothers" ? NOTES.brideDadMothers : NOTES.brideDad);
  list.push({ ...NOTES.remember, p: f.remember, key: true });
  return list;
}

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const key = flowKey(), f = FLOWS[key], notes = notesFor(key);
  app.innerHTML = `
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(SITE.kind)}</span><span class="handle">@wed_voice.su</span></div>
      <h2>${esc(f.title).replace(/\n/g,"<br>")}</h2>
      <p class="line">${esc(SITE.line)}</p>
      <ol class="steps">
        ${f.steps.map((s,i)=>`<li><span class="n">${i+1}</span><span class="t"><span class="who">${esc(s[0])}</span><span class="do">${esc(s[1])}</span>${s[2]?`<span class="sub">${esc(s[2])}</span>`:""}</span></li>`).join("")}
      </ol>
      <div class="notes">
        ${notes.map(n=>`<div class="note-box${n.key?" key":""}"><b>${esc(n.b)}</b><p>${esc(n.p)}</p></div>`).join("")}
      </div>
      <div class="tip"><b>사회자 한마디</b><p>${esc(SITE.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">${esc(SITE.hint)}</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copy">안내 문자 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
        <a class="btn ghost" href="${ROOT}song/">결혼식 음악 찾기 테스트</a>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="again">다시 고르기</button>
      </div>
    </div>`;
  window.scrollTo(0,0);
  prepareImage("부모님-안내");
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copy").onclick = ()=>copyText(messageText(key, notes), "안내 문자를 복사했어요. 카톡에 붙여 넣으세요.");
  document.getElementById("again").onclick = start;
}

// 카톡으로 보낼 글 버전
function messageText(key, notes){
  const f = FLOWS[key];
  return [
    `[양가 부모님 입장·화촉점화 안내]`,
    f.name,
    ``,
    ...f.steps.map((s,i)=>`${i+1}. ${s[0]} - ${s[1]}${s[2]?` (${s[2]})`:""}`),
    ``,
    ...notes.map(n=>`· ${n.b}: ${n.p}`),
    ``,
    SITE.line,
    `- 결혼식사회자 이상운 @wed_voice.su`
  ].join("\n");
}

async function copyText(text, done){
  const msg = document.getElementById("msg");
  try{ await navigator.clipboard.writeText(text); msg.textContent = done; }
  catch(e){
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly",""); ta.style.position="fixed"; ta.style.top="-1000px";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok=false; try{ ok=document.execCommand("copy"); }catch(_){}
    ta.remove();
    msg.textContent = ok ? done : "문구를 길게 눌러 복사해 주세요.";
  }
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
