// 입장 타이밍 큐시트: 순서 고르기 → 파일 열기 → 방식 고르기 → 듣고 찍기 → 리허설 → 큐시트
// 공통 기능은 shared/common.js. 음원 파일은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/right-on-cue/?preview)
const OPEN = false;
// =========================================================

// ===== 순서별 설정 (문구를 바꾸려면 여기만 고치면 돼요) =====
//   min      : 안전한 곡 길이(초). 이보다 짧으면 알려줘요
//   call     : 사회자가 외치는 말. 입장 1초 전에 나가요
//   why      : 길이가 왜 필요한지 (파일을 열면 보여요)
//   longer   : 곡이 짧을 때 권하는 방법
//   tip      : 큐시트 카드의 "사회자 한마디"
const ORDERS = {
  groom: {
    label: "신랑 입장", song: "신랑 입장곡", who: "신랑", verb: "입장", call: "신랑, 입장!",
    min: 180, minText: "3분",
    why: "신랑은 긴장해서 빨리 걷기 쉬워요. 슝 들어가지 말고 천천히 여유롭게 걷는 게 더 중요해요.",
    longer: "더 긴 버전이나 뒤를 이어 붙인 편집본을 준비하세요.",
    tip: "신랑은 긴장해서 슝 들어가기 쉬워요. 입장곡은 3분이면 충분하니, 곡에 맞춰 천천히 여유롭게 걷는 게 더 중요해요."
  },
  bride: {
    label: "신부 입장", song: "신부 입장곡", who: "신부", verb: "입장", call: "신부, 입장~",
    min: 300, minText: "5분",
    why: "드레스 때문에 천천히 걷고, 아버님과 입장하면 신랑과 인사·악수·포옹 뒤 함께 단상까지 가요. 곡이 뚝 끊기지 않게 5분 이상이 안전해요.",
    longer: "더 긴 버전이나 뒤를 이어 붙인 편집본을 준비하세요.",
    tip: "드레스 때문에 걸음이 느리고, 아버님과 입장하면 신랑과 인사·악수·포옹 뒤 함께 단상까지 걸어요. 곡이 뚝 끊기는 느낌이 들지 않게 뒤를 5분 이상 여유 있게 잡는 게 안전해요."
  },
  march: {
    label: "행진", song: "행진곡", who: "신랑 신부", verb: "행진", call: "신랑 신부, 행진!",
    min: 480, minText: "8분",
    why: "버진로드 끝에서 플라워샤워·키스타임·사진을 찍고, 원판 사진을 위해 다시 단상까지 걸어 들어와요. 8분 이상이면 분위기가 좋아요.",
    longer: "행진곡 뒤에 잔잔한 곡을 이어 붙이거나 더 긴 버전을 준비하세요. 행진곡을 다시 트는 건 어색해요.",
    tip: "행진이 끝나도 버진로드 끝에서 플라워샤워·키스타임·사진이 이어지고, 원판 사진을 위해 다시 단상까지 걸어 들어와요. 곡이 뚝 끊기면 어색하고 다시 트는 것도 어색하니, 행진곡 뒤에 잔잔한 곡을 붙여 8분 이상으로 잡으면 분위기가 좋아요."
  }
};

// 찍는 지점 (verb는 순서에 따라 입장/행진으로 바뀌어요)
const MARKS = {
  lead:   { name: "앞소리 끝", hint: "종소리·효과음·가사가 끝나서 멘트를 시작할 수 있는 곳이에요. 앞소리가 없으면 0:00에 두세요." },
  appear: { name: "등장",     hint: "문이 열리고 신부가 혼자 나오는 순간이에요." },
  enter:  { name: "{verb}!",  hint: "발을 떼는 순간이에요. “{call}” 외침은 이 1초 전에 나가요." },
  door:   { name: "문 열림",  hint: "기본은 입장과 같은 때예요. 조금 먼저 열고 싶으면 바꾸세요." }
};

const SAFE = "음원 파일은 이 휴대폰 안에서만 쓰이고, 어디에도 올라가지 않아요.";
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

// ===== 상태 =====
const S = { order:null, file:null, url:"", name:"", dur:null, noFile:false,
            timing:null, split:false, ment:null, spot:null,
            m:{ lead:0, appear:null, enter:null, door:null }, doorAuto:true };
let stack = [];
function go(fn){ stack.push(fn); fn(); }
function back(){ stack.pop(); const f = stack[stack.length-1]; f ? f() : home(); }

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
  S.file=null; S.url=""; S.name=""; S.dur=null; S.noFile=false;
  try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
}
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
  if(S.order !== k) clearFile();
  S.order=k; S.timing=null; S.split=false; S.ment=null; S.spot=null;
  S.m={ lead:0, appear:null, enter:null, door:null }; S.doorAuto=true;
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
function fileStep(){
  stopAudio(); plain();
  app.innerHTML = `
    ${topBar(1)}
    <h2 class="title">웨딩홀에 보낼<br>바로 그 파일을 열어 주세요</h2>
    <p class="lead2">시간은 이 파일을 기준으로 찍혀요. 편집본을 쓸 거면 편집본을, 원곡 그대로면 원곡을 여세요.</p>
    <label class="drop${S.file?" has":""}" id="drop">
      <input type="file" id="file" accept="audio/*" hidden>
      ${S.file
        ? `<span class="fn">${esc(S.name)}</span><span class="fd">${S.dur!=null?"길이 "+fmt(S.dur):"길이를 읽지 못했어요"} · <u>다른 파일 열기</u></span>`
        : `<span>파일 열기</span><span class="fd">mp3, m4a 등 음원 파일</span>`}
    </label>
    <div id="len">${lenBox()}</div>
    <div class="panel" id="nofile" ${S.noFile?"":"hidden"}>
      <label for="durIn">곡 길이</label>
      <input id="durIn" inputmode="numeric" placeholder="예: 4:50" value="${S.noFile&&S.dur!=null?fmt(S.dur):""}">
      <em>파일 없이 시간만 적어요. 길이를 모르면 비워 두세요.</em>
    </div>
    <p class="safe">${LOCK}<span>${SAFE} 구글 드라이브 음원은 휴대폰에 한 번 저장한 뒤 열 수 있어요.</span></p>
    <div class="btns gap">
      <button class="btn main" id="next" ${S.file||S.noFile?"":"disabled"}>다음</button>
      <p class="msg" id="msg" role="status"></p>
      ${S.noFile?"":'<button class="text-btn btn-link" id="nofileBtn">파일 없이 시간만 적을게요</button>'}
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  const next=document.getElementById("next"), msg=document.getElementById("msg");
  document.getElementById("file").onchange = async e => {
    const f=e.target.files && e.target.files[0]; if(!f) return;
    msg.textContent="파일을 읽는 중…";
    S.m={ lead:0, appear:null, enter:null, door:null }; S.doorAuto=true;   // 파일이 바뀌면 시간도 처음부터
    const d = await loadFile(f);
    if(d==null) msg.textContent="이 파일은 재생하지 못했어요. 다른 파일을 열어 주세요.";
    fileStep();
  };
  const nb=document.getElementById("nofileBtn");
  if(nb) nb.onclick = ()=>{ clearFile(); S.noFile=true; fileStep(); document.getElementById("durIn").focus(); };
  const di=document.getElementById("durIn");
  if(di) di.onchange = ()=>{ const t=parseT(di.value); S.dur = t; di.value = t!=null?fmt(t):""; document.getElementById("len").innerHTML=lenBox(); };
  next.onclick = ()=>{ if(di && document.activeElement===di) di.onchange(); go(qTiming); };
}

// ===== 2. 방식 고르기 =====
function askQ(q, a, b, note, onPick){
  stopAudio(); plain();
  const opt=(v,x)=>`<button data-v="${v}"><span class="box">${CHECK}</span><span>${esc(x[0])}${x[1]?`<small>${esc(x[1])}</small>`:""}</span></button>`;
  app.innerHTML = `
    ${topBar(2)}
    <h2 class="question">${esc(q)}</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      ${opt(1,a)}<div class="div"></div>${opt(0,b)}
    </div>
    ${note?`<p class="qnote">${esc(note)}</p>`:""}
    ${nav()}
    ${foot()}`;
  bindNav();
  app.querySelectorAll(".answers button").forEach(btn=>btn.onclick=()=>{
    if(app.dataset.lock) return; app.dataset.lock="1";
    btn.classList.add("on");
    setTimeout(()=>{ delete app.dataset.lock; onPick(+btn.dataset.v===1); }, reduce?60:260);
  });
}
function qTiming(){
  const O=ORDERS[S.order];
  askQ(`타이밍 ${O.verb}을\n할까요?`,
    [`음원을 먼저 틀고,\n정한 지점에 ${O.verb}!`, `전주나 멘트가 나가는 동안 기다렸다가, 곡이 터지는 곳에 맞춰요`],
    [`“${O.call}” 하고\n바로 틀어요`, `외침 직후 음원이 시작돼요. 파일의 0:00이 곧 ${O.verb}이에요`],
    `타이밍 ${O.verb}이 안 되는 웨딩홀도 있어요. 미리 확인하세요.`,
    yes=>{ S.timing=yes; go(S.order==="bride" ? qSplit : (yes ? qMent : afterQ)); });
}
function qSplit(){
  askQ("문이 열리면\n바로 입장하나요?",
    ["네, 문 열리면\n아버님과 입장", "문이 열리고 들어와서 아버님 손을 잡고 버진로드를 걸어요"],
    ["먼저 혼자 등장하고,\n그다음 아버님과 입장", "등장과 입장 타이밍을 따로 정해요. 버진로드 위에서 아버님과 걷는 게 입장이에요"],
    "",
    yes=>{ S.split=!yes; go(S.timing ? qMent : afterQ); });
}
function qMent(){
  const O=ORDERS[S.order];
  askQ(`${O.verb} 전에\n사회자 멘트를 넣을까요?`,
    [`네, 멘트 뒤에 ${O.verb}!`, "앞소리가 끝나는 곳부터 멘트하고, 곡이 터지기 직전에 외쳐요"],
    [`멘트 없이\n“${O.call}”만`, "음원을 틀고 정한 지점 1초 전에 바로 외쳐요"],
    "",
    yes=>{ S.ment=yes; go(qSpot); });
}
function qSpot(){
  const O=ORDERS[S.order];
  askQ(`${O.verb}은 곡의\n어디에 맞출까요?`,
    ["곡 앞부분", "전주가 끝나고 노래가 시작되는 곳"],
    ["곡 중간의 하이라이트", "후렴처럼 곡 중간에서 터지는 곳"],
    "",
    yes=>{ S.spot = yes ? "front" : "mid"; go(yes ? afterQ : notice); });
}
function notice(){
  const O=ORDERS[S.order];
  plain();
  app.innerHTML = `
    ${topBar(2)}
    <h2 class="title">이 경우엔<br>음원 편집이 필요해요</h2>
    <p class="lead2">타이밍 ${esc(O.verb)}을 하면서 곡 중간의 하이라이트에 맞추려면, 하이라이트 앞을 잘라 내고 멘트할 앞부분만 남긴 편집본이 필요해요.</p>
    <div class="tip"><b>그래서</b><p>편집본 파일로 다시 열어서 찍으면 시간이 정확해져요. 지금 파일로 계속하면 큐시트에 편집 메모가 함께 나가요.</p></div>
    <div class="btns gap">
      <button class="btn main" id="reopen">편집본 파일 열기</button>
      <button class="btn ghost" id="cont">일단 이 파일로 계속</button>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  document.getElementById("reopen").onclick = ()=>go(fileStep);
  document.getElementById("cont").onclick = ()=>go(afterQ);
}
// 방식이 정해지면 찍을 게 있는지 보고 다음 화면으로
function afterQ(){
  normalize();
  const f = needs().length ? mark : (S.file ? rehearse : result);
  stack[stack.length-1] = f;   // "이전"을 누르면 질문으로 돌아가게
  f();
}

// 찍어야 하는 지점 (방식에 따라 달라요)
function needs(){
  const n=[], bride=S.order==="bride";
  if(S.timing && S.ment) n.push("lead");
  if(bride && S.split && S.timing) n.push("appear");
  if(S.timing || (bride && S.split)) n.push("enter");
  if(bride && !S.split && S.timing) n.push("door");
  return n;
}
// 안 찍는 지점의 기본값 채우기. 문은 따로 바꾸기 전까지 입장을 따라가요
function normalize(){
  const m=S.m, bride=S.order==="bride";
  if(S.timing){ if(m.lead==null) m.lead=0; }
  else { m.lead=0; if(bride && S.split) m.appear=0; else m.enter=0; }
  if(bride && !S.split && (S.doorAuto || m.door==null)) m.door = m.enter;
}
function check(){
  const m=S.m, e={}, need=needs(), has=k=>m[k]!=null;
  if(need.includes("enter") && has("enter")){
    if(m.enter<1) e.enter = `외침이 1초 전에 나가니까 0:01 이후여야 해요.`;
    else if(S.dur!=null && m.enter>S.dur) e.enter = `곡 길이(${fmt(S.dur)})보다 뒤예요.`;
  }
  if(need.includes("lead") && has("lead") && has("enter") && m.lead > m.enter-1) e.lead = "앞소리 끝은 외침(1초 전)보다 앞이어야 해요.";
  if(need.includes("appear") && has("appear") && has("enter") && m.appear >= m.enter) e.appear = "등장은 입장보다 앞이어야 해요.";
  if(need.includes("door") && has("door") && has("enter") && m.door > m.enter) e.door = "문은 입장 전이나 입장과 같은 때 열려요.";
  return { e, ok: need.every(has) && !Object.keys(e).length };
}

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
    <h2 class="title">${S.file?"곡을 들으면서<br>“여기!”를 눌러 주세요":"시간을 적어 주세요"}</h2>
    <p class="lead2">${S.file?"찍은 뒤에 1초씩 옮기거나 숫자를 바로 고칠 수 있어요.":"0:16처럼 적으면 돼요. 파일을 열면 들으면서 찍을 수도 있어요."}</p>
    ${S.file?player():""}
    <div class="marks" id="marks"></div>
    <div class="facts" id="facts"></div>
    <div class="btns gap"><button class="btn main" id="next">다음</button></div>
    ${nav()}
    ${foot()}`;
  bindNav();
  if(S.file) bindPlayer();
  paintMarks();
  document.getElementById("next").onclick = ()=>{ if(check().ok) go(S.file ? rehearse : result); };
}
function paintMarks(){
  const O=ORDERS[S.order], need=needs(), {e,ok}=check(), m=S.m;
  const name = k => MARKS[k].name.replace("{verb}",O.verb);
  const hint = k => MARKS[k].hint.replace("{verb}",O.verb).replace("{call}",O.call);
  document.getElementById("marks").innerHTML = need.map(k=>`
    <div class="mark" data-k="${k}">
      <div class="mk-head"><b>${esc(name(k))}</b><input class="mk-t" inputmode="numeric" placeholder="0:00" value="${m[k]!=null?fmt(m[k]):""}" aria-label="${esc(name(k))} 시간"></div>
      <p class="mk-hint">${esc(hint(k))}</p>
      <div class="mk-btns">
        ${S.file?'<button class="stamp">여기!</button>':""}
        <button class="adj" data-d="-1" ${m[k]==null||m[k]<=0?"disabled":""}>−1초</button>
        <button class="adj" data-d="1" ${m[k]==null?"disabled":""}>+1초</button>
        ${S.file?`<button class="from" ${m[k]==null?"disabled":""}>여기부터 듣기</button>`:""}
      </div>
      <p class="err">${esc(e[k]||"")}</p>
    </div>`).join("");
  // 숫자로 보여 주는 것만 (판단은 사회자님이)
  const f=[];
  if(S.timing && m.enter!=null) f.push(`곡 시작 → ${O.verb}: <b>${m.enter}초</b>`);
  if(S.timing && S.ment && m.enter!=null && m.enter-1-m.lead>=0) f.push(`멘트 구간: <b>${fmt(m.lead)}~${fmt(m.enter-1)}</b> (${m.enter-1-m.lead}초)`);
  if(S.order==="bride" && S.split && m.appear!=null && m.enter!=null && m.enter>m.appear) f.push(`등장 → 입장: <b>${m.enter-m.appear}초</b>`);
  document.getElementById("facts").innerHTML = f.join("<br>");
  document.getElementById("next").disabled = !ok;

  const set=(k,v)=>{
    if(v!=null){ v=Math.max(0,Math.floor(v)); if(S.dur!=null) v=Math.min(v,S.dur); }
    S.m[k]=v;
    if(k==="door") S.doorAuto=false;
    normalize(); paintMarks();
  };
  document.querySelectorAll(".mark").forEach(el=>{
    const k=el.dataset.k, inp=el.querySelector(".mk-t");
    inp.onchange = ()=>{ const t=parseT(inp.value); if(t==null){ inp.value = m[k]!=null?fmt(m[k]):""; return; } set(k,t); };
    inp.onkeydown = ev=>{ if(ev.key==="Enter") inp.blur(); };
    el.querySelectorAll(".adj").forEach(b=>b.onclick=()=>set(k,(m[k]||0)+ +b.dataset.d));
    const st=el.querySelector(".stamp"); if(st) st.onclick=()=>set(k,audio.currentTime);
    const fr=el.querySelector(".from"); if(fr) fr.onclick=()=>{ audio.currentTime=Math.max(0,m[k]-3); audio.play().catch(()=>{}); };
  });
}

// ===== 큐 (카드·문자·리허설이 같이 써요) =====
function cues(){
  const O=ORDERS[S.order], m=S.m, R=[], bride=S.order==="bride";
  const add=(t,who,text)=>R.push({t,who,text});
  if(S.timing){
    add(0,"음향","사회자 신호에 재생 시작");
    if(S.ment){
      if(m.lead>0) add(0,"음원",`앞소리 (종소리·가사) ${fmt(0)}~${fmt(m.lead)}`);
      add(m.lead,"사회자",`멘트 ${fmt(m.lead)}~${fmt(m.enter-1)}`);
    }
    if(bride && S.split) add(m.appear,"문","문 열림 · 신부 등장");
    if(bride && !S.split && m.door<m.enter) add(m.door,"문","문 열림");
    add(m.enter-1,"사회자",`“${O.call}”`);
    add(m.enter,O.who, bride ? (S.split ? "아버님과 입장" : (m.door===m.enter ? "입장 · 문 열림" : "입장")) : O.verb);
  } else if(bride && S.split){
    add(0,"사회자","등장 멘트");
    add(0,"음향","멘트 직후 재생 시작");
    add(0,"문","문 열림 · 신부 등장");
    add(m.enter-1,"사회자",`“${O.call}”`);
    add(m.enter,"신부","아버님과 입장");
  } else {
    add(0,"사회자",`“${O.call}”`);
    add(0,"음향","외침 직후 재생 시작");
    add(0,O.who, bride ? "입장 · 문 열림" : O.verb);
  }
  return R;
}
// 리허설 화면에 크게 보여 줄 단계
function phases(){
  const O=ORDERS[S.order], m=S.m, P=[], bride=S.order==="bride";
  const walk = (bride ? (S.split ? "아버님과 입장" : "입장") : O.verb) + "\n천천히 걷기";
  if(S.timing){
    if(S.ment){ if(m.lead>0) P.push({t:0,label:"앞소리"}); P.push({t:m.lead,label:"사회자 멘트"}); }
    else P.push({t:0,label:"음원 시작"});
    if(bride && S.split) P.push({t:m.appear,label:"문 열림 · 신부 등장"});
    if(bride && !S.split && m.door<m.enter) P.push({t:m.door,label:"문 열림"});
    P.push({t:m.enter-1,label:O.call,call:true});
    P.push({t:m.enter,label:walk});
  } else if(bride && S.split){
    P.push({t:0,label:"문 열림 · 신부 등장"});
    P.push({t:m.enter-1,label:O.call,call:true});
    P.push({t:m.enter,label:walk});
  } else {
    P.push({t:0,label:walk});
  }
  if(S.dur!=null) P.push({t:S.dur,label:"곡 끝 · 여기서 끊겨요",end:true});
  return P;
}

// ===== 4. 리허설 =====
function rehearse(){
  stopAudio(); plain(); normalize();
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
    let cur=-1; for(let i=0;i<P.length;i++) if(t>=P[i].t) cur=i;
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
    if(audio.paused||audio.ended){ last=-1; audio.currentTime=0; audio.play().catch(()=>{}); }
    else { audio.pause(); }
  };
  document.getElementById("next").onclick = ()=>go(result);
}

// ===== 5. 큐시트 =====
function modeLine(){
  const O=ORDERS[S.order], v=O.verb;
  const sp = S.order==="bride" && S.split ? " 등장과 입장을 따로 해요." : "";
  if(!S.timing) return `“${O.call}” 직후 파일을 처음부터 틀어요. 파일의 0:00이 곧 ${v}이에요.${sp}`;
  if(S.ment) return `타이밍 ${v}. 앞소리가 끝나면 사회자 멘트, 그다음 “${O.call}” 하고 1초 뒤 ${v}해요.${sp}`;
  return `타이밍 ${v}. 음원을 먼저 틀고, 정한 지점 1초 전에 “${O.call}”을 외쳐요.${sp}`;
}
function memos(){
  const O=ORDERS[S.order], L=[];
  if(S.dur!=null && S.dur < O.min) L.push(`곡이 ${fmt(S.dur)}로 ${O.minText}보다 짧아요. ${O.longer}`);
  if(S.timing && S.spot==="mid") L.push(`타이밍 ${O.verb}으로 곡 중간 하이라이트에 맞추려면 편집이 필요해요. 하이라이트 앞을 잘라 내고 멘트할 앞부분만 남긴 편집본을 만들어 주세요.`);
  if(L.length) L.push("편집하면 시간이 바뀌어요. 편집본 파일로 다시 찍어 주세요.");
  return L;
}
function lenLine(){
  const O=ORDERS[S.order];
  if(S.dur==null) return ` 곡 길이는 ${O.minText} 이상이 안전해요.`;
  return S.dur>=O.min ? ` 곡 길이 ${fmt(S.dur)}, ${O.minText} 이상이에요.` : ` 곡 길이 ${fmt(S.dur)}, ${O.minText}보다 짧아요.`;
}
function sheetText(){
  const O=ORDERS[S.order], L=[];
  L.push(`[${O.song} 큐시트] ${S.name||O.song}${S.dur!=null?` · ${fmt(S.dur)}`:""}`);
  L.push(modeLine());
  cues().forEach(r=>L.push(`${fmt(r.t)} ${r.who} · ${r.text}`));
  L.push(`끝까지 재생해 주세요. 중간에 끊지 않아요.${lenLine()}`);
  memos().forEach(x=>L.push("※ "+x));
  L.push("", "결혼식사회자 이상운 @wed_voice.su");
  return L.join("\n");
}
function result(){
  stopAudio(); plain(); normalize();
  const O=ORDERS[S.order], rows=cues(), ms=memos(), m=S.m;
  const head = S.timing ? `${fmt(m.enter)}에<br>${esc(O.verb)}` : `“${esc(O.call)}”<br>하고 바로 재생`;
  app.innerHTML = `
    ${topBar(5)}
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(O.label)} 큐시트</span><span class="handle">@wed_voice.su</span></div>
      <h2>${head}</h2>
      <p class="line">${esc(S.name||O.song)}${S.dur!=null?` · ${fmt(S.dur)}`:""}</p>
      <p class="desc">${esc(modeLine())}</p>
      <ol class="cues" aria-label="큐시트">
        ${rows.map(r=>`<li><span class="ct">${fmt(r.t)}</span><span class="cw">${esc(r.who)}</span><span>${esc(r.text)}</span></li>`).join("")}
      </ol>
      <p class="ending">끝까지 재생해요. 중간에 끊지 않아요.${esc(lenLine())}</p>
      ${ms.length?`<div class="memo"><b>편집 메모</b>${ms.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`:""}
      <div class="tip"><b>사회자 한마디</b><p>${esc(O.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">저장해서 사회자·음향팀에 보내 주세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copy">문자로 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
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
