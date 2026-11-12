// 입장 타이밍 큐시트: 순서 고르기 → 파일 열기 (→ 음원 편집) → 방식 고르기 → 듣고 찍기 → 리허설 → 큐시트
// 공통 기능은 shared/common.js. 음원 파일은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/right-on-cue/?preview)
const OPEN = true;
// 음원 편집(edit.js): 1단계 "파일 열기"에 "음원 편집하기" 버튼을 보여 줄지 정해요.
// false면 주소 뒤에 ?preview 를 붙였을 때만 보여요. (예: …/right-on-cue/?preview)
const EDIT_OPEN = false;
const EDIT_ON = EDIT_OPEN || new URLSearchParams(location.search).has("preview");
// =========================================================

// ===== 방식은 세 가지뿐이에요 (2026-11-02 사회자님 정리) =====
//   now   : "입장!" → 음원 재생 → 바로 입장 (파일의 0:00이 곧 입장)
//   after : "입장!" → 음원 재생 → 정한 지점(N초)에 입장. 멘트 없음
//   ment  : 음원 재생 → 사회자 멘트 → N−1초에 "입장!" → N초에 입장
// 찍는 지점은 "입장!"(N초) 하나뿐이에요. now는 찍을 게 없어서 리허설로 바로 가요.

// ===== 순서별 설정 (문구를 바꾸려면 여기만 고치면 돼요) =====
//   min      : 안전한 곡 길이(초). 이보다 짧으면 알려줘요
//   call     : 사회자가 외치는 말
//   moment   : "여기!"를 찍을 순간 (출발 위치 안내 포함)
//   row      : 큐시트에 적히는 입장 줄
//   why      : 길이가 왜 필요한지 (파일을 열면 보여요)
//   longer   : 곡이 짧을 때 권하는 방법
//   tip      : 큐시트 카드의 "사회자 한마디"
const ORDERS = {
  groom: {
    label: "신랑 입장", song: "신랑 입장곡", who: "신랑", verb: "입장", call: "신랑, 입장!",
    min: 120, minText: "2분",
    moment: "버진로드 위에서 발을 떼는 순간이에요. 문·커튼 뒤에서 입장하는 홀이면 문이 열리는 순간으로 찍고, 홀에 미리 확인하세요.",
    row: "입장",
    why: "신랑은 긴장해서 빨리 걷기 쉬워요. 슝 들어가지 말고 천천히 여유롭게 걷는 게 더 중요해요.",
    longer: "더 긴 버전이나 뒤를 이어 붙인 편집본을 준비하세요.",
    tip: "신랑은 긴장해서 슝 들어가기 쉬워요. 입장곡은 2분이면 충분하니, 곡에 맞춰 천천히 여유롭게 걷는 게 더 중요해요."
  },
  bride: {
    label: "신부 입장", song: "신부 입장곡", who: "신부", verb: "입장", call: "신부, 입장~",
    min: 240, minText: "4분",
    moment: "문이 열리고 신부가 혼자 나오는 순간이에요. 아버님은 버진로드 앞에서 만나 그때부터 함께 걸어요.",
    row: "문 열림 · 입장",
    why: "드레스 때문에 천천히 걷고, 아버님과 입장하면 신랑과 인사·악수·포옹 뒤 함께 단상까지 가요. 곡이 뚝 끊기지 않게 4분 이상이 안전해요.",
    longer: "더 긴 버전이나 뒤를 이어 붙인 편집본을 준비하세요.",
    tip: "드레스 때문에 걸음이 느리고, 아버님과 입장하면 신랑과 인사·악수·포옹 뒤 함께 단상까지 걸어요. 곡이 뚝 끊기는 느낌이 들지 않게 뒤를 4분 이상 여유 있게 잡는 게 안전해요."
  },
  march: {
    label: "행진", song: "행진곡", who: "신랑 신부", verb: "행진", call: "신랑 신부, 행진!",
    min: 480, minText: "8분",
    moment: "단상에서 돌아서서 발을 떼는 순간이에요.",
    row: "행진",
    why: "버진로드 끝에서 플라워샤워·키스타임·사진을 찍고, 원판 사진을 위해 다시 단상까지 걸어 들어와요. 8분 이상이면 분위기가 좋아요.",
    longer: "행진곡 뒤에 잔잔한 곡을 이어 붙이거나 더 긴 버전을 준비하세요. 행진곡을 다시 트는 건 어색해요.",
    tip: "행진이 끝나도 버진로드 끝에서 플라워샤워·키스타임·사진이 이어지고, 원판 사진을 위해 다시 단상까지 걸어 들어와요. 곡이 뚝 끊기면 어색하고 다시 트는 것도 어색하니, 행진곡 뒤에 잔잔한 곡을 붙여 8분 이상으로 잡으면 분위기가 좋아요."
  }
};

const SAFE = "음원 파일은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.";
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

// ===== 상태 =====
//   mode  : now / after / ment
//   enter : "입장!" 지점(초). now일 때는 쓰지 않아요 (N()이 0을 돌려줘요)
//   ed    : 음원 편집 내용 (edit.js가 채워요). 편집 화면에 들어간 적이 없으면 null
//   edInfo: 편집한 음원의 요약 (자른 길이·하이라이트·이음새 자리·한 줄 설명). 편집본을 쓰는 동안에만 있어요
//   t0    : 지금 파일이 원본의 몇 초부터 시작하는지. 앞을 자르면 입장 시간을 그만큼 당겨요
const S = { order:null, file:null, url:"", name:"", dur:null, mode:null, enter:null, ed:null, edInfo:null, t0:0 };
let stack = [];
function go(fn){ stack.push(fn); fn(); }
function back(){ stack.pop(); const f = stack[stack.length-1]; f ? f() : home(); }
function timed(){ return S.mode !== "now"; }
function N(){ return timed() ? S.enter : 0; }

// ===== 시간 =====
function fmt(sec){ const s=Math.max(0,Math.floor(sec||0)); return Math.floor(s/60)+":"+pad(s%60); }
function parseT(v){
  v=String(v).trim(); if(!v) return null;
  const m=v.match(/^(\d+)[:：.](\d{1,2})$/); if(m) return +m[1]*60 + +m[2];
  if(/^\d+$/.test(v)) return +v;
  return null;
}

// ===== 음원 (파일은 휴대폰 안에서만 재생돼요) =====
const audio = new Audio();
audio.preload = "metadata";
let raf = 0, onTick = null;
function tick(){ if(onTick) onTick(audio.currentTime); if(!audio.paused && !audio.ended) raf = requestAnimationFrame(tick); }
audio.addEventListener("play", ()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
audio.addEventListener("pause", ()=>{ if(onTick) onTick(audio.currentTime); });
audio.addEventListener("ended", ()=>{ if(onTick) onTick(audio.currentTime); });
function stopAudio(){ try{ audio.pause(); }catch(e){} onTick = null; cancelAnimationFrame(raf); }
function clearFile(){
  stopAudio();
  if(S.url){ try{ URL.revokeObjectURL(S.url); }catch(e){} }
  S.file=null; S.url=""; S.name=""; S.dur=null;
  try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
}
// 편집한 내용을 버려요 (다른 파일을 열거나 순서를 바꿀 때)
function clearEdit(){ S.ed=null; S.edInfo=null; S.t0=0; if(typeof edFree==="function") edFree(); }
function edited(){ return !!(S.ed && S.edInfo); }
// 곡 이름: 처음 연 파일 이름에서 확장자와 파일 이름에 못 쓰는 글자를 뺀 것
function songBase(){
  const n = (S.ed ? S.ed.src.name : S.name) || "";
  return n.replace(/\.[^.]+$/,"").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim().slice(0,30) || ORDERS[S.order].song;
}
// 편집한 음원을 저장할 때 이름: 순서_입장 시간 편집본_곡 이름 (사회자님 11/12 — 예: 신부입장_15초 입장 편집본_곡이름.mp3)
// 음향팀이 파일 이름만 보고 순서와 입장 시간을 알아요. "바로 틀어요" 방식은 "바로 입장 편집본", 타이밍을 정하기 전에는 "편집본"만
function secKo(s){ return s<60 ? s+"초" : Math.floor(s/60)+"분"+(s%60 ? " "+(s%60)+"초" : ""); }
function outName(ext){
  const O=ORDERS[S.order];
  const cue = !S.mode ? "" : !timed() ? "바로 "+O.verb+" " : (S.enter!=null && !enterErr()) ? secKo(S.enter)+" "+O.verb+" " : "";
  return [O.label.replace(/\s/g,""), cue+"편집본", songBase()].join("_") + "." + (ext||"mp3");
}
// 큐시트에 적는 파일 이름 (편집했으면 저장될 이름)
function fileLabel(){ return edited() ? outName() : (S.name || ORDERS[S.order].song); }
function loadFile(file){
  return new Promise(res=>{
    clearFile();
    S.file=file; S.name=file.name; S.url=URL.createObjectURL(file);
    const finish = d => { S.dur = Math.floor(d); try{ audio.currentTime = 0; }catch(e){} res(S.dur); };
    audio.onloadedmetadata = () => {
      if(isFinite(audio.duration)) { finish(audio.duration); return; }
      // 길이를 바로 못 읽는 파일(가변 비트레이트 mp3 등)은 끝으로 보냈다가 길이를 읽어요
      audio.ondurationchange = () => { if(isFinite(audio.duration)){ audio.ondurationchange=null; finish(audio.duration); } };
      try{ audio.currentTime = 1e101; }catch(e){ res(null); }
    };
    audio.onerror = () => res(null);
    audio.src = S.url;
  });
}

// ===== 화면 조각 =====
function topBar(n){ return `<div class="top"><span>${esc(ORDERS[S.order].label)} 타이밍</span><span class="count">${pad(n)} / 05</span></div>`; }
function nav(){ return `<div class="under"><button class="text-btn" id="back">이전</button><button class="text-btn" id="home">처음으로</button></div>`; }
function bindNav(){
  const b=document.getElementById("back"), h=document.getElementById("home");
  if(b) b.onclick = back;
  if(h) h.onclick = home;
}
function plain(){ document.body.classList.remove("is-cover"); app.className="wrap"; window.scrollTo(0,0); }

// ===== 첫 화면 =====
function home(){
  stopAudio(); stack=[];
  if(typeof edFree==="function") edFree();
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0,0);
  app.innerHTML = `
    <div class="top"><span>입장 타이밍 큐시트</span><span>5단계</span></div>
    ${brandLogo()}
    <p class="for">입장곡을 정한 신랑·신부님을 위한</p>
    <h1>이 곡,<br>몇 초에<br>입장할까요?</h1>
    <div class="bar"></div>
    <p class="lead">고른 음원을 들으면서 “여기!”만 누르세요. 사회자·음향팀에 보낼 큐시트가 나와요.</p>
    <div class="pick">
      ${["groom","bride","march"].map(k=>`<button data-k="${k}"><span>${ORDERS[k].label}</span><span class="q">${ORDERS[k].song}</span></button>`).join("")}
    </div>
    <p class="note">※ ${SAFE}</p>
    ${foot()}`;
  app.querySelectorAll(".pick button").forEach(b=>b.onclick=()=>start(b.dataset.k));
}

function start(k){
  if(S.order !== k){ clearFile(); clearEdit(); }
  S.order=k; S.mode=null; S.enter=null;
  if(edited() && typeof edCue==="function") edCue();   // 편집할 때 맞춘 하이라이트가 있으면 입장 시간을 다시 넣어요
  stack=[]; go(fileStep);
}

// ===== 1. 파일 열기 =====
function lenBox(){
  if(S.dur==null) return "";
  const O=ORDERS[S.order];
  return S.dur >= O.min
    ? `<div class="len ok"><b>${O.minText} 이상이에요 (${fmt(S.dur)})</b>${esc(O.why)}</div>`
    : `<div class="len warn"><b>${O.minText}보다 짧아요 (${fmt(S.dur)})</b>${esc(O.longer)} ${esc(O.why)}</div>`;
}
// 음원이 아직 없는 사람: 그 순서의 곡 찾기 테스트 릴스로 보내요 (사이트가 아니라 릴스. 주소는 shared/common.js SITES의 reel)
// 파일을 열면 안 보여요.
function noFile(){
  const O=ORDERS[S.order];
  return `
    <div class="nofile">
      <b>아직 음원이 없나요?</b>
      <p>${esc(O.song)} 테스트로 어울리는 곡을 찾고, 추천곡 음원도 받아 보세요.</p>
      ${siteLink(S.order, "btn ghost", `${esc(O.song)} 받기`)}
    </div>`;
}
// 음원 편집으로 가는 상자 (파일을 연 뒤에만 보여요. 편집 화면은 edit.js)
function editBox(){
  if(edited()) return `
    <div class="edbox on">
      <b>편집한 음원이에요</b>
      <p>${esc(S.edInfo.sum.join(" · "))}</p>
      <button class="btn ghost" id="edit">다시 편집하기</button>
    </div>`;
  return `
    <div class="edbox">
      <b>음원을 고치고 싶나요?</b>
      <p>전주가 길 때, 곡이 짧을 때, 끝이 뚝 끊길 때 여기서 바로 고칠 수 있어요.</p>
      <button class="btn ghost" id="edit">음원 편집하기</button>
    </div>`;
}
// ※ accept는 확장자로 적어요. 아이폰 사파리는 accept="audio/*"를 영상처럼 취급해서 mp3·m4a가 회색으로 막혀요 (WebKit 버그 242110, 34442)
const ACCEPT = ".mp3,.m4a,.wav,.aac,.flac,.ogg,.aiff,.aif";
function fileStep(){
  stopAudio(); plain();
  if(typeof edFree==="function") edFree();   // 편집 화면에서 돌아오면 풀어 둔 소리를 비워요
  const ed = edited();
  app.innerHTML = `
    ${topBar(1)}
    <h2 class="title">웨딩홀에 보낼<br>바로 그 파일을 열어 주세요</h2>
    <p class="lead2">시간은 이 파일을 기준으로 찍혀요. 편집본을 쓸 거면 편집본을, 원곡 그대로면 원곡을 여세요.</p>
    <label class="drop${S.file?" has":""}" id="drop">
      <input type="file" id="file" class="vh" accept="${ACCEPT}">
      ${S.file
        ? `<span class="fn">${esc(ed ? S.ed.src.name : S.name)}</span><span class="fd">${ed?"편집본 · ":""}${S.dur!=null?"길이 "+fmt(S.dur):"길이를 읽지 못했어요"} · <u>다른 파일 열기</u></span>`
        : `<span>파일 열기</span><span class="fd">mp3, m4a 등 음원 파일</span>`}
    </label>
    <div id="len">${lenBox()}</div>
    ${S.file && EDIT_ON ? editBox() : ""}
    <p class="safe">${LOCK}<span>${SAFE} 아이폰은 “파일 선택”을 누르고 파일 앱에서 고르세요. 구글 드라이브·카카오톡 음원은 “파일에 저장”을 먼저 해 주세요. 음악 앱의 노래는 열 수 없어요.</span></p>
    ${S.file ? "" : noFile()}
    <div class="btns gap">
      <button class="btn main" id="next" ${S.file?"":"disabled"}>다음</button>
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  const next=document.getElementById("next"), msg=document.getElementById("msg");
  document.getElementById("file").onchange = async e => {
    const f=e.target.files && e.target.files[0]; if(!f) return;
    msg.textContent="파일을 읽는 중…";
    S.enter=null;   // 파일이 바뀌면 시간도 처음부터
    clearEdit();    // 편집한 내용도 처음부터
    const d = await loadFile(f);
    if(d==null) clearFile();   // 재생하지 못하는 파일로는 못 가요 (음원이 있어야 찍을 수 있어요)
    fileStep();
    if(d==null) document.getElementById("msg").textContent="이 파일은 재생하지 못했어요. 다른 파일을 열어 주세요.";
  };
  next.onclick = ()=>{ if(S.file) go(qMode); };
  const eb=document.getElementById("edit");
  if(eb) eb.onclick = ()=>{ if(typeof editStep==="function") go(editStep); };
}

// ===== 2. 방식 고르기 (질문 하나, 답 셋) =====
function qMode(){
  stopAudio(); plain();
  const O=ORDERS[S.order], v=O.verb;
  const opts = [
    { v:"now",   t:`“${O.call}” 하고 바로 틀어요`,            s:`외침 직후 음원이 시작되고, 0:00에 바로 ${v}해요` },
    { v:"after", t:`“${O.call}” 하고 틀고, 정한 지점에 ${v}`, s:`외침 직후 음원이 시작되고, 멘트 없이 정한 지점에 ${v}해요` },
    { v:"ment",  t:`음원을 먼저 틀고, 멘트 뒤에 ${v}`,        s:`음원이 시작되면 사회자 멘트, 정한 지점 1초 전에 “${O.call}” 하고 ${v}해요` }
  ];
  app.innerHTML = `
    ${topBar(2)}
    <h2 class="question">${esc(v)}은\n어떻게 할까요?</h2>
    ${edHint()}
    <div class="answers" role="group" aria-label="답 고르기">
      ${opts.map(o=>`<button data-v="${o.v}"${S.mode===o.v?' class="on"':""}><span class="box">${CHECK}</span><span>${esc(o.t)}<small>${esc(o.s)}</small></span></button>`).join('<div class="div"></div>')}
    </div>
    <p class="qnote">정한 지점에 ${esc(v)}하는 건 안 되는 웨딩홀도 있어요. 미리 확인하세요.</p>
    ${nav()}
    ${foot()}`;
  bindNav();
  app.querySelectorAll(".answers button").forEach(btn=>btn.onclick=()=>{
    if(app.dataset.lock) return; app.dataset.lock="1";
    app.querySelectorAll(".answers button").forEach(b=>b.classList.remove("on"));
    btn.classList.add("on");
    setTimeout(()=>{
      delete app.dataset.lock;
      S.mode = btn.dataset.v;
      go(timed() ? mark : rehearse);   // 바로 입장(now)은 찍을 게 없어요
    }, reduce?60:260);
  });
}

// 편집할 때 하이라이트를 맞췄으면, 그게 몇 초인지와 어울리는 방식을 알려줘요 (방식 고르기 · 듣고 찍기 화면)
function edHL(){ return edited() && S.ed.hl!=null ? Math.max(0, Math.round(S.ed.hl - S.t0)) : null; }
function edHint(){
  const h=edHL(); if(h==null) return "";
  return `<p class="ednote">${h===0
    ? "편집한 음원은 틀자마자 하이라이트가 나와요. 첫 번째 방식이 잘 맞아요."
    : `편집한 음원은 ${fmt(h)}에 하이라이트가 나와요. 두 번째나 세 번째 방식을 고르면 ${fmt(h)}에 ${esc(ORDERS[S.order].verb)}해요.`}</p>`;
}

// "입장!" 지점이 맞는지 (틀리면 이유를 돌려줘요)
function enterErr(){
  const O=ORDERS[S.order], t=S.enter;
  if(!timed() || t==null) return "";
  if(t<1) return S.mode==="after"
    ? `정한 지점에 ${O.verb}하려면 0:01 이후여야 해요. 0:00이면 “바로 틀어요” 방식이에요.`
    : `외침이 1초 전에 나가니까 0:01 이후여야 해요.`;
  if(S.dur!=null && t>S.dur) return `곡 길이(${fmt(S.dur)})보다 뒤예요.`;
  return "";
}
function ready(){ return !timed() || (S.enter!=null && !enterErr()); }

// ===== 3. 듣고 찍기 =====
function player(){
  return `
    <div class="player">
      <div class="now"><span class="t" id="now">0:00</span><span class="d">/ ${fmt(S.dur)}</span></div>
      <input type="range" id="seek" min="0" max="${S.dur||0}" step="0.1" value="0" aria-label="재생 위치">
      <div class="ctl">
        <button id="b5">−5초</button>
        <button id="play" class="playbtn">재생</button>
        <button id="f5">+5초</button>
      </div>
    </div>`;
}
function bindPlayer(){
  const now=document.getElementById("now"), seek=document.getElementById("seek"), play=document.getElementById("play");
  const paint = t => { now.textContent=fmt(t); seek.value=t; play.textContent = (audio.paused||audio.ended) ? "재생" : "멈춤"; };
  onTick = paint;
  play.onclick = ()=>{ if(audio.paused||audio.ended){ if(audio.ended) audio.currentTime=0; audio.play().catch(()=>{}); } else audio.pause(); paint(audio.currentTime); };
  document.getElementById("b5").onclick = ()=>{ audio.currentTime=Math.max(0,audio.currentTime-5); paint(audio.currentTime); };
  document.getElementById("f5").onclick = ()=>{ audio.currentTime=Math.min(S.dur||0,audio.currentTime+5); paint(audio.currentTime); };
  seek.oninput = ()=>{ audio.currentTime=+seek.value; now.textContent=fmt(seek.value); };
  paint(audio.currentTime||0);
}
function mark(){
  stopAudio(); plain();
  const O=ORDERS[S.order];
  app.innerHTML = `
    ${topBar(3)}
    <h2 class="title">곡을 들으면서<br>“여기!”를 눌러 주세요</h2>
    <p class="lead2">${esc(O.verb)}하는 순간에 “여기!”를 누르세요. 찍은 뒤에 1초씩 옮기거나 숫자를 바로 고칠 수 있어요.</p>
    ${edHL() ? `<p class="ednote">편집한 음원은 ${fmt(edHL())}에 하이라이트가 나와요. 그 시간을 넣어 뒀어요. 바꿔도 돼요.</p>` : ""}
    ${player()}
    <div class="marks" id="marks"></div>
    <div class="facts" id="facts"></div>
    <div class="btns gap"><button class="btn main" id="next">다음</button></div>
    ${nav()}
    ${foot()}`;
  bindNav();
  bindPlayer();
  paintMark();
  document.getElementById("next").onclick = ()=>{ if(ready()) go(rehearse); };
}
function paintMark(){
  const O=ORDERS[S.order], t=S.enter, err=enterErr();
  const hint = O.moment + (S.mode==="after"
    ? ` “${O.call}”은 음원을 틀기 전에 이미 외쳤어요.`
    : ` “${O.call}” 외침은 이 1초 전에 나가요.`);
  document.getElementById("marks").innerHTML = `
    <div class="mark">
      <div class="mk-head"><b>${esc(O.verb)}!</b><input class="mk-t" id="mkT" inputmode="numeric" placeholder="0:00" value="${t!=null?fmt(t):""}" aria-label="${esc(O.verb)} 시간"></div>
      <p class="mk-hint">${esc(hint)}</p>
      <div class="mk-btns">
        <button class="stamp" id="stamp">여기!</button>
        <button class="adj" data-d="-1" ${t==null||t<=0?"disabled":""}>−1초</button>
        <button class="adj" data-d="1" ${t==null?"disabled":""}>+1초</button>
        <button id="from" ${t==null?"disabled":""}>여기부터 듣기</button>
      </div>
      <p class="err">${esc(err)}</p>
    </div>`;
  // 숫자로 보여 주는 것만 (판단은 사회자님이)
  const f=[];
  if(t!=null){
    f.push(`곡 시작 → ${O.verb}: <b>${t}초</b>`);
    if(S.mode==="ment" && t>=1) f.push(`멘트 구간: <b>0:00~${fmt(t-1)}</b> (${t-1}초)`);
  }
  document.getElementById("facts").innerHTML = f.join("<br>");
  document.getElementById("next").disabled = !ready();

  const set=v=>{
    if(v!=null){ v=Math.max(0,Math.floor(v)); if(S.dur!=null) v=Math.min(v,S.dur); }
    S.enter=v; paintMark();
  };
  const inp=document.getElementById("mkT");
  inp.onchange = ()=>{ const v=parseT(inp.value); if(v==null){ inp.value = t!=null?fmt(t):""; return; } set(v); };
  inp.onkeydown = ev=>{ if(ev.key==="Enter") inp.blur(); };
  document.querySelectorAll(".adj").forEach(b=>b.onclick=()=>set((S.enter||0)+ +b.dataset.d));
  document.getElementById("stamp").onclick = ()=>set(audio.currentTime);
  document.getElementById("from").onclick = ()=>{ audio.currentTime=Math.max(0,S.enter-3); audio.play().catch(()=>{}); };
}

// ===== 큐 (카드·문자·리허설이 같이 써요) =====
function cues(){
  const O=ORDERS[S.order], n=N(), R=[];
  const add=(t,who,text)=>R.push({t,who,text});
  if(S.mode==="ment"){
    add(0,"음향","사회자 신호에 재생 시작");
    add(0,"사회자",`멘트 0:00~${fmt(n-1)}`);
    add(n-1,"사회자",`“${O.call}”`);
  } else {
    add(0,"사회자",`“${O.call}”`);
    add(0,"음향","외침 직후 재생 시작");
  }
  add(n,O.who,O.row);
  return R;
}
// 리허설 화면에 크게 보여 줄 단계 (pre = 음원을 틀기 전에 외쳐요)
function phases(){
  const O=ORDERS[S.order], n=N(), P=[], walk=O.row+"\n천천히 걷기";
  if(S.mode==="ment"){
    P.push({t:0,label:"사회자 멘트"});
    P.push({t:n-1,label:O.call,call:true});
  } else {
    P.push({t:0,label:O.call,call:true,pre:true});
    if(S.mode==="after") P.push({t:0,label:"음원 시작"});
  }
  P.push({t:n,label:walk});
  if(S.dur!=null) P.push({t:S.dur,label:"곡 끝 · 여기서 끊겨요",end:true});
  return P;
}

// ===== 4. 리허설 =====
function rehearse(){
  stopAudio(); plain();
  const O=ORDERS[S.order], P=phases();
  app.innerHTML = `
    ${topBar(4)}
    <h2 class="title">처음부터 틀고<br>화면을 따라가 보세요</h2>
    <p class="lead2">“${esc(O.call)}”이 나가는 순간 화면이 크게 알려줘요. 둘이 실제로 걸어 보면 곡 길이가 어떤 느낌인지 알 수 있어요.</p>
    <div class="stage2">
      <p class="ph-now" id="phNow">재생을 누르면 시작해요</p>
      <p class="ph-next" id="phNext"></p>
      <div class="ph-bar"><div id="phFill"></div></div>
      <div class="ph-time"><span id="now">0:00</span><span>${fmt(S.dur)}</span></div>
    </div>
    <div class="btns gap"><button class="btn main" id="play">처음부터 재생</button></div>
    <ol class="cuelist" id="cuelist">${P.map(p=>`<li><span class="ct">${fmt(p.t)}</span><span class="cw">${p.call?"사회자":p.end?"음원":""}</span><span>${esc(p.label).replace(/\n/g," · ")}</span></li>`).join("")}</ol>
    <div class="btns gap"><button class="btn main" id="next">큐시트 보기</button></div>
    ${nav()}
    ${foot()}`;
  bindNav();
  const phNow=document.getElementById("phNow"), phNext=document.getElementById("phNext"), fill=document.getElementById("phFill"),
        now=document.getElementById("now"), play=document.getElementById("play"), items=[...document.querySelectorAll("#cuelist li")];
  let last=-1;
  onTick = t => {
    let cur=-1; for(let i=0;i<P.length;i++) if(!P[i].pre && t>=P[i].t) cur=i;
    const c=P[cur], nx=P[cur+1];
    if(cur!==last){
      last=cur;
      phNow.textContent = c ? c.label : "…";
      items.forEach((li,i)=>li.classList.toggle("on",i===cur));
      if(c && c.call) reveal(O.call, ()=>{});
    }
    phNext.textContent = nx ? `다음 ${fmt(nx.t)} ${nx.label.replace(/\n/g," ")} · ${Math.max(0,Math.ceil(nx.t-t))}초 뒤` : "";
    fill.style.width = (S.dur ? Math.min(100,t/S.dur*100) : 0)+"%";
    now.textContent = fmt(t);
    play.textContent = (audio.paused||audio.ended) ? "처음부터 재생" : "멈춤";
    if(audio.ended){ phNow.textContent = `곡이 끝났어요 (${fmt(S.dur)})`; phNext.textContent=""; }
  };
  play.onclick = ()=>{
    if(!(audio.paused||audio.ended)){ audio.pause(); return; }
    last=-1; audio.currentTime=0;
    const pre = P.findIndex(p=>p.pre);
    if(pre<0){ audio.play().catch(()=>{}); return; }
    // 음원 전에 외치는 방식: 외침을 먼저 크게 보여 주고 나서 음원을 틀어요
    phNow.textContent = P[pre].label; phNext.textContent = `다음 0:00 ${P[pre+1].label.replace(/\n/g," ")}`;
    items.forEach((li,i)=>li.classList.toggle("on",i===pre));
    reveal(O.call, ()=>audio.play().catch(()=>{}));
  };
  document.getElementById("next").onclick = ()=>go(result);
}

// ===== 5. 큐시트 =====
function modeLine(){
  const O=ORDERS[S.order], v=O.verb, n=N();
  if(S.mode==="now")   return `“${O.call}” 직후 파일을 처음부터 틀어요. 파일의 0:00이 곧 ${v}이에요.`;
  if(S.mode==="after") return `“${O.call}” 직후 파일을 처음부터 틀고, 멘트 없이 ${fmt(n)}에 ${v}해요.`;
  return `음원을 먼저 틀고 사회자 멘트, ${fmt(n-1)}에 “${O.call}” 하고 ${fmt(n)}에 ${v}해요.`;
}
function memos(){
  const O=ORDERS[S.order], L=[];
  if(S.dur!=null && S.dur < O.min){
    L.push(`곡이 ${fmt(S.dur)}로 ${O.minText}보다 짧아요. ${O.longer}`);
    if(!edited()) L.push("편집하면 시간이 바뀌어요. 편집본 파일로 다시 찍어 주세요.");   // 여기서 편집한 음원은 시간이 이미 따라 바뀌어 있어요
  }
  return L;
}
function lenLine(){
  const O=ORDERS[S.order];
  if(S.dur==null) return ` 곡 길이는 ${O.minText} 이상이 안전해요.`;
  return S.dur>=O.min ? ` 곡 길이 ${fmt(S.dur)}, ${O.minText} 이상이에요.` : ` 곡 길이 ${fmt(S.dur)}, ${O.minText}보다 짧아요.`;
}
function sheetText(){
  const O=ORDERS[S.order], L=[];
  L.push(`[${O.song} 큐시트] ${fileLabel()}${S.dur!=null?` · ${fmt(S.dur)}`:""}`);
  L.push(modeLine());
  cues().forEach(r=>L.push(`${fmt(r.t)} ${r.who} · ${r.text}`));
  L.push(`끝까지 재생해 주세요. 중간에 끊지 않아요.${lenLine()}`);
  memos().forEach(x=>L.push("※ "+x));
  if(edited()) L.push(`※ 편집한 음원이에요 (${S.edInfo.sum.join(" · ")}). 시간은 편집한 파일 기준이에요.`);
  L.push("", "결혼식사회자 이상운 @wed_voice.su");
  return L.join("\n");
}
function result(){
  stopAudio(); plain();
  const O=ORDERS[S.order], rows=cues(), ms=memos();
  const head = timed() ? `${fmt(N())}에<br>${esc(O.verb)}` : `“${esc(O.call)}”<br>하고 바로 재생`;
  app.innerHTML = `
    ${topBar(5)}
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(O.label)} 큐시트</span><span class="handle">@wed_voice.su</span></div>
      <h2>${head}</h2>
      <p class="line${edited()?" long":""}">${esc(fileLabel())}${S.dur!=null?` · ${fmt(S.dur)}`:""}</p>
      <p class="desc">${esc(modeLine())}</p>
      <ol class="cues" aria-label="큐시트">
        ${rows.map(r=>`<li><span class="ct">${fmt(r.t)}</span><span class="cw">${esc(r.who)}</span><span>${esc(r.text)}</span></li>`).join("")}
      </ol>
      <p class="ending">끝까지 재생해요. 중간에 끊지 않아요.${esc(lenLine())}</p>
      ${ms.length?`<div class="memo"><b>편집 메모</b>${ms.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`:""}
      ${edited()?`<div class="memo"><b>편집한 음원</b><p>${esc(S.edInfo.sum.join(" · "))}</p><p>시간은 편집한 파일 기준이에요.</p></div>`:""}
      <div class="tip"><b>사회자 한마디</b><p>${esc(O.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">저장해서 사회자·음향팀에 보내 주세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copy">문자로 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
        ${edited()?`<div class="edsave" id="edsave"></div>`:""}
        <button class="btn ghost" id="other">다른 순서도 정하기</button>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="again">처음부터 다시</button>
      </div>
    </div>
    <textarea class="hiddenbox" id="box" readonly aria-hidden="true">${esc(sheetText())}</textarea>`;
  prepareImage("큐시트-"+O.label.replace(/\s/g,""));
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copy").onclick = ()=>copyText(sheetText(), document.getElementById("box"));
  document.getElementById("other").onclick = home;
  document.getElementById("again").onclick = ()=>start(S.order);
  // 편집한 음원: 큐시트가 뜨면 mp3로 바꾸기 시작해요 (다 되면 저장 버튼이 나와요)
  const sv=document.getElementById("edsave");
  if(sv && typeof edSaveBox==="function"){
    const run = edSaveBox(sv);
    if(run) setTimeout(()=>{ if(sv.isConnected) run(); }, 700);
  }
}
async function copyText(value, box){
  const msg=document.getElementById("msg"), done="복사했어요. 카톡이나 문자에 붙여 넣으세요.";
  try{ await navigator.clipboard.writeText(value); msg.textContent=done; }
  catch(e){
    // 카톡·인스타 안에서 열면 클립보드가 막힐 때가 있어요
    box.focus(); box.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch(_){}
    msg.textContent = ok ? done : "문구를 길게 눌러 복사해 주세요.";
  }
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>입장 타이밍 큐시트</span><span>5단계</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>이 곡,<br>몇 초에<br>입장할까요?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom","go",`<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

function route(){
  const preview = new URLSearchParams(location.search).has("preview");
  if(!OPEN && !preview){ soon(); return; }
  const h=(location.hash||"").replace("#","");
  if(ORDERS[h]){ start(h); return; }   // 테스트 결과에서 #groom / #bride / #march 로 들어오면 바로 시작
  home();
}
route();
