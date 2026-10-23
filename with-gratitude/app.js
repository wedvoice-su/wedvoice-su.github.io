// 감사 문자 & 땡큐 카드: 받는 사람 고르기 → 감사 문자 → 땡큐 카드
// 공통 기능은 shared/common.js, 카드 디자인은 cards.js
// 사진과 문구는 이 휴대폰 안에서만 써요. 어디에도 보내거나 저장하지 않아요.

// ===== 문구 =====
// 문구 안의 표시: {to} 받는 분(적은 그대로) · {to님} 받는 분+님 · {to야} 받는 분+아/야 · {from} 보내는 사람
// 받는 분을 비워 두면 {to…}와 바로 뒤의 쉼표·느낌표가 같이 빠져요. 그래서 {to…}는 문장 맨 앞에만 써요.
// card는 카드에 들어가는 짧은 문구예요. 한 줄에 열서너 글자 정도가 예뻐요.
const TARGETS = [
  { label:"와 주신 하객", sub:"식에 와 주신 분께, 단체 문자로도 좋아요",
    toHint:"예: 김지수", fromHint:"예: 민준·서연",
    tip:"단체 문자는 식 당일 밤이나 다음 날 오전에 보내는 게 좋아요. 카드 이미지를 같이 보내면 더 오래 기억에 남아요.",
    versions:[
      { name:"정중하게",
        text:`{to님}, 안녕하세요.
바쁘신 중에도 저희 결혼식에 귀한 걸음 해 주셔서 진심으로 감사드립니다.
보내 주신 축하 덕분에 평생 잊지 못할 하루를 보냈습니다.
서로 아끼며 예쁘게 잘 살겠습니다.
늘 건강하시고 좋은 일만 가득하시길 바랍니다.

{from} 드림`,
        card:`귀한 걸음으로 함께해 주셔서
진심으로 감사합니다.
예쁘게 잘 살겠습니다.` },
      { name:"다정하게",
        text:`{to님}, 결혼식에 와 주셔서 정말 고마워요!
얼굴 보고 축하받으니 더 실감 나고 행복했어요.
덕분에 오래오래 기억에 남을 하루가 됐어요.
예쁘게 잘 살게요. 조만간 밥 한번 같이 먹어요!

{from} 드림`,
        card:`와 주셔서 정말 고마워요.
덕분에 오래 기억에 남을
행복한 하루였어요.` }
    ]},
  { label:"축의금 보내 주신 분", sub:"못 오셨지만 마음을 보내 주신 분께",
    toHint:"예: 김지수", fromHint:"예: 민준·서연",
    tip:"못 오신 분께는 감사 문자와 함께 커피 기프티콘을 보내는 경우가 많아요. 금액보다 빨리 연락드리는 게 더 중요해요.",
    versions:[
      { name:"정중하게",
        text:`{to님}, 안녕하세요.
직접 오시지 못한 중에도 마음을 보내 주셔서 진심으로 감사드립니다.
보내 주신 축하 덕분에 더 따뜻한 하루를 보냈습니다.
서로 아끼며 예쁘게 잘 살겠습니다.
다음에 꼭 얼굴 뵙고 인사드리겠습니다.

{from} 드림`,
        card:`멀리서도 마음을 보내 주셔서
진심으로 감사합니다.
받은 사랑 잊지 않겠습니다.` },
      { name:"다정하게",
        text:`{to님}, 축하 마음 보내 주셔서 정말 고마워요!
함께하지 못해도 챙겨 주신 마음 덕분에 정말 든든했어요.
예쁘게 잘 살게요.
다음에 만나면 맛있는 거 대접할게요!

{from} 드림`,
        card:`보내 주신 마음 덕분에
정말 든든했어요.
예쁘게 잘 살게요.` }
    ]},
  { label:"사회·축가·축사 해 준 사람", sub:"식순을 맡아 준 고마운 분께",
    toHint:"예: 지수", fromHint:"예: 민준·서연",
    tip:"사회나 축가를 해 준 분께는 식 당일이나 다음 날 바로 연락하는 게 가장 좋아요. 답례는 선물이나 식사 대접으로 많이 해요.",
    versions:[
      { name:"친구에게 (반말)",
        text:`{to야}, 우리 결혼식에서 큰 역할 맡아 줘서 정말 고마워!
많이 떨리고 신경 쓰였을 텐데 끝까지 멋지게 해 줘서 하객들도 다 좋아했어.
네 덕분에 우리 결혼식이 훨씬 따뜻해졌어.
이 고마움 잊지 않을게. 조만간 맛있는 거 사 줄게!

{from}`,
        card:`우리 결혼식을
더 빛나게 해 줘서 고마워.
이 마음 오래 기억할게.` },
      { name:"존댓말로",
        text:`{to님}, 저희 결혼식에서 귀한 역할을 맡아 주셔서 진심으로 감사드립니다.
준비하시느라 많이 신경 쓰셨을 텐데, 덕분에 식이 훨씬 따뜻하고 빛났습니다.
이 고마움 오래 기억하겠습니다. 조만간 꼭 식사 대접하겠습니다.

{from} 드림`,
        card:`저희 결혼식을
더 빛나게 해 주셔서
진심으로 감사합니다.` }
    ]},
  { label:"축의대·가방순이 해 준 사람", sub:"식 날 이것저것 챙겨 준 분께",
    toHint:"예: 지수", fromHint:"예: 민준·서연",
    tip:"축의대를 맡아 준 분께는 식 당일에 수고비 봉투를 따로 챙겨 드리는 경우가 많아요. 다음 날 문자로 한 번 더 인사하면 좋아요.",
    versions:[
      { name:"친구에게 (반말)",
        text:`{to야}, 결혼식 날 이것저것 챙겨 줘서 정말 고마워!
하루 종일 정신없었을 텐데 끝까지 꼼꼼하게 챙겨 줘서 정말 든든했어.
네 덕분에 우리는 마음 놓고 식에만 집중할 수 있었어.
조만간 맛있는 거 먹으러 가자!

{from}`,
        card:`결혼식 날 든든하게
챙겨 줘서 정말 고마워.
덕분에 마음 놓고 웃었어.` },
      { name:"존댓말로",
        text:`{to님}, 결혼식 날 궂은일을 맡아 주셔서 진심으로 감사드립니다.
하루 종일 신경 쓰셨을 텐데 꼼꼼하게 챙겨 주신 덕분에 저희는 마음 편히 식을 치를 수 있었습니다.
이 고마움 잊지 않겠습니다.

{from} 드림`,
        card:`결혼식 날 든든하게
챙겨 주셔서 감사합니다.
덕분에 마음 편히 웃었습니다.` }
    ]},
  { label:"직장 동료·상사", sub:"회사에서 축하해 주신 분께",
    toHint:"예: 김 팀장", fromHint:"예: 김서연",
    tip:"복귀 첫날 간단한 간식이나 답례품을 돌리며 직접 인사하는 경우가 많아요. 문자는 그 전에 미리 보내 두면 좋아요.",
    versions:[
      { name:"상사께",
        text:`{to님}, 안녕하세요.
저희 결혼을 축하해 주시고 마음까지 보내 주셔서 진심으로 감사드립니다.
덕분에 기쁜 날을 더 뜻깊게 보냈습니다.
복귀해서 더 열심히 하겠습니다.

{from} 드림`,
        card:`보내 주신 축하 덕분에
더 뜻깊은 하루였습니다.
진심으로 감사드립니다.` },
      { name:"동료에게",
        text:`{to님}, 결혼 축하해 주셔서 정말 고마워요!
덕분에 정말 행복한 하루를 보냈어요.
복귀하면 맛있는 간식으로 보답할게요!

{from} 드림`,
        card:`축하해 주셔서 고마워요.
덕분에 정말 행복한
하루였어요.` }
    ]},
  { label:"덕담·성혼선언 해 주신 어른", sub:"식에서 귀한 말씀을 해 주신 분께",
    toHint:"예: 큰아버님", fromHint:"예: 민준·서연",
    tip:"덕담이나 성혼선언을 해 주신 어른께는 문자보다 전화로 먼저 인사드리는 게 좋아요. 문자는 그 뒤에 카드와 함께 보내세요.",
    versions:[
      { name:"정중하게",
        text:`{to}, 안녕하세요.
저희 결혼식에서 귀한 말씀을 해 주셔서 진심으로 감사드립니다.
해 주신 말씀 가슴에 새기고, 서로 아끼며 바르게 살겠습니다.
늘 건강하시길 바랍니다.

{from} 올림`,
        card:`귀한 말씀 가슴에 새기고
서로 아끼며 살겠습니다.
진심으로 감사드립니다.` },
      { name:"따뜻하게",
        text:`{to}, 결혼식에서 해 주신 따뜻한 말씀 덕분에 마음이 정말 든든했어요.
그 말씀처럼 서로 아끼며 예쁘게 살게요.
곧 찾아뵙고 인사드릴게요. 늘 건강하세요!

{from} 올림`,
        card:`해 주신 따뜻한 말씀처럼
예쁘게 잘 살겠습니다.
늘 건강하세요.` }
    ]},
  { label:"부모님 지인", sub:"부모님이 보내실 감사 문자", parents:true,
    toHint:"예: 박영수", fromHint:"예: 신랑 아버지 김철수",
    tip:"부모님께 이 사이트 링크를 보내 드리면, 부모님 휴대폰에서 바로 문구를 복사해 쓰실 수 있어요.",
    versions:[
      { name:"정중하게",
        text:`{to님}, 안녕하십니까.
바쁘신 중에도 저희 아이들 결혼식에 귀한 걸음 해 주시고 축하해 주셔서 진심으로 감사드립니다.
덕분에 기쁜 날을 잘 마쳤습니다.
베풀어 주신 마음 잊지 않겠습니다.
늘 건강하시고 댁내 평안하시길 바랍니다.

{from} 드림`,
        card:`귀한 걸음으로
축복해 주셔서
진심으로 감사드립니다.` },
      { name:"따뜻하게",
        text:`{to님}, 저희 아이들 결혼을 축하해 주셔서 정말 감사합니다.
보내 주신 축하 덕분에 더 따뜻하고 기쁜 날이 되었습니다.
조만간 식사 한번 대접하겠습니다. 늘 건강하세요.

{from} 드림`,
        card:`저희 아이들의 새 출발을
축하해 주셔서
정말 감사합니다.` }
    ]}
];

// ===== 임시 주소 =====
// 이번 주 신부님께 먼저 드리는 임시 링크예요. 이 날짜가 지나면 첫 화면 대신 "인스타에서 새 링크 받기" 화면이 나와요.
// 정식으로 공개할 때는 폴더 이름을 바꾸고, 이 값을 ""로 비우고, index.html의 noindex 줄을 지우세요.
const EXPIRES = "2026-11-15";
// 친구 태그·팔로우 버튼이 가는 곳: 이 사이트 릴스(shared/common.js 사이트 목록)가 있으면 릴스, 없으면 인스타 프로필
const INVITE = SITES.thanks.reel || INSTA;

const SAFE = "사진과 문구는 이 휴대폰 안에서만 쓰이고, 어디에도 저장되지 않아요.";
const DRAG_HINT = "사진을 끌어서 옮기고, 두 손가락으로 벌려서 확대할 수 있어요";
const ZOOM_MAX = 4;
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

// ===== 상태 (새로고침하면 사라져요) =====
const S = { t:0, v:0, to:"", from:"", msg:"", edited:false, card:"", date:"", design:"film", gray:{}, color:0, mark:true, photo:null };

function fill(text){
  const to = S.to.trim(), from = S.from.trim() || "(이름)";
  if(!to) text = text.replace(/\{to[^}]*\}[,!]? ?/g, "");
  return text
    .replace(/\{to\}/g, to)
    .replace(/\{to님\}/g, /님$/.test(to) ? to : to + "님")
    .replace(/\{to야\}/g, /[아야]$/.test(to) ? to : to + callSuffix(to))
    .replace(/\{from\}/g, from);
}
// 받침이 있으면 "아", 없으면 "야" (지수야, 민준아)
function callSuffix(name){
  const c = name.charCodeAt(name.length - 1);
  if(c < 0xAC00 || c > 0xD7A3) return "야";
  return (c - 0xAC00) % 28 ? "아" : "야";
}
function topBar(n){ return `<div class="top"><span>감사 문자 &amp; 땡큐 카드</span><span class="count">${n} / 3</span></div>`; }
function pickTarget(i, v=0){
  S.t = i; S.v = v; S.edited = false;
  S.card = TARGETS[i].versions[v].card;
}

// ===== 사용 기간이 끝난 링크 =====
function expired(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">감사 문자 &amp; 땡큐 카드</p>
    <h1>사용 기간이<br>끝난 링크예요</h1>
    <div class="bar"></div>
    <p class="lead">인스타그램 @wed_voice.su에서<br>새 링크를 받아 가세요.</p>
    <a class="soon-insta" href="${esc(INVITE)}" target="_blank" rel="noopener">인스타에서 새 링크 받기</a>
    ${foot()}`;
}
function isExpired(){
  if(!EXPIRES) return false;
  const d = new Date(), today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return today > EXPIRES;
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">식을 마친 신랑·신부님을 위한</p>
    <h1>감사 문자<br>&amp; 땡큐 카드</h1>
    <div class="bar"></div>
    <p class="lead">누구에게 보낼지 고르면<br>감사 문자와 카드가 바로 나와요.</p>
    <div class="pick"><button id="start"><span>시작하기</span></button></div>
    <p class="note safe-cover">${LOCK}<span>${SAFE}</span></p>
    ${foot()}`;
  document.getElementById("start").onclick = who;
}

// ===== 1. 누구에게 =====
function who(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  app.innerHTML = `
    ${topBar(1)}
    <h2 class="question">누구에게
보내나요?</h2>
    <div class="list">
      ${TARGETS.map((t, i) => `<button data-i="${i}"><b>${esc(t.label)}</b><span>${esc(t.sub)}</span></button>`).join("")}
    </div>
    <div class="under"><button class="text-btn" id="home">처음으로</button></div>
    ${foot()}`;
  window.scrollTo(0, 0);
  app.querySelectorAll(".list button").forEach(b => b.onclick = () => { pickTarget(+b.dataset.i); write(); });
  document.getElementById("home").onclick = home;
}

// ===== 2. 감사 문자 =====
function write(){
  const T = TARGETS[S.t], V = T.versions[S.v];
  if(!S.edited) S.msg = fill(V.text);
  app.innerHTML = `
    ${topBar(2)}
    <h2 class="title">${esc(T.label)}</h2>
    <div class="panel">
      <div class="row2">
        <label class="field"><span>받는 분 <em>(비워도 돼요)</em></span><input id="to" value="${esc(S.to)}" placeholder="${esc(T.toHint)}" autocomplete="off"></label>
        <label class="field"><span>보내는 사람</span><input id="from" value="${esc(S.from)}" placeholder="${esc(T.fromHint)}" autocomplete="off"></label>
      </div>
      <div class="seg" role="group" aria-label="말투 고르기">
        ${T.versions.map((v, i) => `<button data-v="${i}" class="${i === S.v ? "on" : ""}" aria-pressed="${i === S.v}">${esc(v.name)}</button>`).join("")}
      </div>
      <label class="field"><span>문자 문구 <em>(눌러서 고칠 수 있어요)</em></span><textarea id="text" rows="10">${esc(S.msg)}</textarea></label>
      <p class="edited" id="edited"${S.edited ? "" : " hidden"}>직접 고친 문구예요. <button class="text-btn" id="reset">처음 문구로 되돌리기</button></p>
    </div>
    <div class="btns gap">
      <button class="btn main" id="copy">문구 복사하기</button>
      <p class="msg" id="msg" role="status"></p>
    </div>
    <div class="tip"><b>사회자 한마디</b><p>${esc(T.tip)}</p></div>
    <div class="btns gap">
      <button class="btn insta" id="tocard">이 마음, 카드로도 만들기</button>
      ${T.parents ? `<button class="btn ghost" id="plink">부모님께 보낼 링크 복사하기</button>` : ""}
      <button class="btn ghost" id="other">다른 분께 보내기</button>
    </div>
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    ${foot()}`;
  const text = document.getElementById("text"), edited = document.getElementById("edited");
  const refill = () => { if(!S.edited){ S.msg = fill(V.text); text.value = S.msg; } };
  document.getElementById("to").oninput = e => { S.to = e.target.value; refill(); };
  document.getElementById("from").oninput = e => { S.from = e.target.value; refill(); };
  text.oninput = () => { S.msg = text.value; S.edited = true; edited.hidden = false; };
  app.querySelectorAll(".seg button").forEach(b => b.onclick = () => { pickTarget(S.t, +b.dataset.v); write(); });
  document.getElementById("reset").onclick = () => { S.edited = false; write(); };
  document.getElementById("copy").onclick = () => copyText(S.msg, text);
  document.getElementById("tocard").onclick = card;
  document.getElementById("other").onclick = who;
  if(T.parents) document.getElementById("plink").onclick = () => copyLink("링크를 복사했어요. 부모님께 보내 드리세요.");
}

async function copyText(value, box){
  const msg = document.getElementById("msg"), done = "복사했어요. 카톡이나 문자에 붙여 넣으세요.";
  try{ await navigator.clipboard.writeText(value); msg.textContent = done; }
  catch(e){
    // 카톡·인스타 안에서 열면 클립보드가 막힐 때가 있어요
    box.focus(); box.select();
    let ok = false;
    try{ ok = document.execCommand("copy"); }catch(_){}
    msg.textContent = ok ? done : "문구를 길게 눌러 복사해 주세요.";
  }
}

// ===== 3. 땡큐 카드 =====
function card(){
  const T = TARGETS[S.t];
  app.innerHTML = `
    ${topBar(3)}
    <h2 class="title">땡큐 카드 만들기</h2>
    <div class="stage" id="stage"><canvas id="cv" width="${CW}" height="${CH}" role="img" aria-label="카드 미리보기"></canvas></div>
    <p class="drag" id="drag" hidden>${DRAG_HINT}</p>
    <div class="photo-row">
      <button class="btn ghost" id="pick">${S.photo ? "사진 바꾸기" : "사진 넣기"}</button>
      <input type="file" id="file" accept="image/*" hidden>
    </div>
    <div class="opts">
      <label class="range" id="zoomrow"><span>사진 크기</span><input type="range" id="zoom" min="1" max="${ZOOM_MAX}" step="0.01"></label>
      <label class="check" id="grayrow"><input type="checkbox" id="gray"><span>흑백 사진</span></label>
      <div class="chips" id="colors"><span>리본 색</span>
        ${RIBBON.map((c, i) => `<button data-c="${i}" style="--c:${c.c}" aria-label="${c.name}" title="${c.name}"></button>`).join("")}
      </div>
    </div>
    <p class="safe">${LOCK}<span>${SAFE}</span></p>

    <h3 class="sec">디자인 고르기</h3>
    <div class="designs" id="designs">
      ${DESIGNS.map(D => `<button data-k="${D.key}"><canvas width="216" height="270"></canvas><span>${D.label}</span></button>`).join("")}
    </div>

    <h3 class="sec">카드에 들어갈 글</h3>
    <div class="panel">
      <label class="field"><span>카드 문구</span><textarea id="ctext" rows="4">${esc(S.card)}</textarea></label>
      <p class="fit" id="fit" hidden>글이 길어서 카드에 다 들어가지 않아요. 조금 줄이거나 '편지' 디자인을 골라 보세요.</p>
      <div class="row2">
        <label class="field"><span>이름</span><input id="names" value="${esc(S.from)}" placeholder="${esc(T.fromHint)}" autocomplete="off"></label>
        <label class="field"><span>예식 날짜 <em>(선택)</em></span><input type="date" id="date" value="${S.date}"></label>
      </div>
      <label class="check"><input type="checkbox" id="mark"${S.mark ? " checked" : ""}><span>카드 아래에 @wed_voice.su 작게 넣기</span></label>
    </div>

    <div class="savebar"><button class="btn main" id="save">카드 저장하기</button></div>
    <p class="msg" id="msg" role="status"></p>
    <div class="btns">
      <button class="btn ghost" id="back">감사 문자로 돌아가기</button>
      <button class="btn ghost" id="other">다른 분께도 보내기</button>
    </div>
    <div class="tip invite">
      <b>결혼 앞둔 친구가 있나요?</b>
      <p>인스타 게시물에 친구를 태그해 주세요. 댓글 남긴 분께 이 사이트 링크를 보내 드려요.</p>
      <a class="btn insta" href="${esc(INVITE)}" target="_blank" rel="noopener">인스타에서 친구 태그하기</a>
      <a class="follow" href="${INSTA}" target="_blank" rel="noopener">@wed_voice.su 팔로우하고 결혼 꿀팁 받기</a>
    </div>
    ${foot()}`;
  window.scrollTo(0, 0);

  const $ = id => document.getElementById(id);
  const cv = $("cv"), file = $("file");
  const cur = () => DESIGNS.find(D => D.key === S.design);

  file.onchange = async () => {
    const f = file.files[0]; file.value = "";
    if(!f) return;
    $("msg").textContent = "사진을 불러오는 중이에요…";
    try{ S.photo = await loadPhoto(f); }
    catch(e){ $("msg").textContent = "이 사진은 열 수 없어요. 다른 사진을 골라 주세요."; return; }
    $("msg").textContent = "";
    $("pick").textContent = "사진 바꾸기";
    if(!cur().photo) S.design = "film";
    sync(); paint(true);
  };
  $("pick").onclick = () => file.click();

  // 사진 옮기기: 한 손가락은 끌기, 두 손가락은 벌려서 확대
  const touches = new Map();
  let edgeTimer = 0;
  const toCard = p => { const r = cv.getBoundingClientRect(), k = CW / r.width; return { x:(p.x - r.left) * k, y:(p.y - r.top) * k }; };
  // 사진 끝이 칸 끝에 닿으면 더 못 가요. 그럴 때 확대하면 더 옮길 수 있다고 알려 줘요.
  const clampPhoto = () => {
    const P = S.photo, [, , w, h] = cur().rect, q = placePhoto(P, w, h);
    const hit = Math.abs(q.cx - P.cx) > 1e-4 || Math.abs(q.cy - P.cy) > 1e-4;
    P.cx = q.cx; P.cy = q.cy;
    return hit;
  };
  const edgeHint = () => {
    $("drag").textContent = S.photo.zoom < ZOOM_MAX - .01 ? "사진 끝에 닿았어요. 확대하면 더 옮길 수 있어요." : "사진 끝에 닿았어요.";
    clearTimeout(edgeTimer);
    edgeTimer = setTimeout(() => { $("drag").textContent = DRAG_HINT; }, 2200);
  };
  cv.onpointerdown = e => {
    const D = cur();
    if(!S.photo){ if(D.photo === true) file.click(); return; }
    if(!D.photo) return;
    cv.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, { x:e.clientX, y:e.clientY });
    clampPhoto();  // 다른 디자인에서 옮긴 위치를 이 디자인 칸에 맞춰 둬요
  };
  cv.onpointermove = e => {
    if(!touches.has(e.pointerId)) return;
    const P = S.photo, [rx, ry, w, h] = cur().rect;
    const prev = toCard(touches.get(e.pointerId)), now = toCard({ x:e.clientX, y:e.clientY });
    touches.set(e.pointerId, { x:e.clientX, y:e.clientY });
    let hit;
    if(touches.size === 1){
      const { dw, dh } = placePhoto(P, w, h);
      P.cx -= (now.x - prev.x) / dw; P.cy -= (now.y - prev.y) / dh;
      hit = clampPhoto();
    }else{
      // 두 손가락: 다른 손가락은 그대로라고 보고, 손가락 사이 거리만큼 확대해요. 손가락 가운데 있는 부분이 그 자리에 남아요.
      const other = toCard([...touches].find(([id]) => id !== e.pointerId)[1]);
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(now.x - other.x, now.y - other.y);
      if(d0 < 1) return;
      const m0 = { x:(prev.x + other.x) / 2, y:(prev.y + other.y) / 2 }, m1 = { x:(now.x + other.x) / 2, y:(now.y + other.y) / 2 };
      const a = placePhoto(P, w, h), u = a.cx + (m0.x - rx - w / 2) / a.dw, v = a.cy + (m0.y - ry - h / 2) / a.dh;
      P.zoom = Math.max(1, Math.min(ZOOM_MAX, P.zoom * d1 / d0));
      const b = placePhoto(P, w, h);
      P.cx = u - (m1.x - rx - w / 2) / b.dw; P.cy = v - (m1.y - ry - h / 2) / b.dh;
      hit = clampPhoto();
      $("zoom").value = P.zoom;
    }
    if(hit && touches.size === 1) edgeHint();
    paint(false);
  };
  cv.onpointerup = cv.onpointercancel = e => {
    if(!touches.delete(e.pointerId)) return;
    if(!touches.size) paint(true);
  };

  // 확대 막대: 지금 가운데 있는 부분을 그대로 두고 확대해요
  $("zoom").oninput = e => { if(S.photo){ S.photo.zoom = +e.target.value; clampPhoto(); paint(false); } };
  $("zoom").onchange = () => paint(true);
  $("gray").onchange = e => { S.gray[S.design] = e.target.checked; paint(true); };
  app.querySelectorAll("#colors button").forEach(b => b.onclick = () => { S.color = +b.dataset.c; sync(); paint(true); });
  app.querySelectorAll("#designs button").forEach(b => b.onclick = () => { S.design = b.dataset.k; sync(); paint(false); });

  let typing = 0;
  const typed = () => { paint(false); clearTimeout(typing); typing = setTimeout(() => paint(true), 400); };
  $("ctext").oninput = e => { S.card = e.target.value; typed(); };
  $("names").oninput = e => {
    S.from = e.target.value;
    if(!S.edited) S.msg = fill(TARGETS[S.t].versions[S.v].text);
    typed();
  };
  $("date").onchange = e => { S.date = e.target.value; paint(true); };
  $("mark").onchange = e => { S.mark = e.target.checked; paint(true); };

  $("save").onclick = save;
  $("back").onclick = write;
  $("other").onclick = who;

  sync(); paint(true);
}

// 고른 디자인에 맞게 옵션 보이기
function sync(){
  const D = DESIGNS.find(x => x.key === S.design), $ = id => document.getElementById(id);
  const usesPhoto = !!(S.photo && D.photo);
  $("msg").textContent = "";
  $("zoomrow").hidden = $("grayrow").hidden = $("drag").hidden = !usesPhoto;
  $("stage").classList.toggle("can-drag", usesPhoto);
  if(S.photo) $("zoom").value = S.photo.zoom;
  $("gray").checked = grayFor(D);
  $("colors").hidden = !D.colors;
  app.querySelectorAll("#colors button").forEach(b => b.classList.toggle("on", +b.dataset.c === S.color));
  app.querySelectorAll("#designs button").forEach(b => {
    const on = b.dataset.k === S.design;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
  });
}
function grayFor(D){ return D.key in S.gray ? S.gray[D.key] : !!D.gray; }
function cardData(D){
  const ymd = S.date ? S.date.split("-") : null;
  return {
    photo:S.photo, gray:!!S.photo && grayFor(D), msg:S.card, names:S.from.trim(),
    date: ymd ? `${ymd[0]}. ${+ymd[1]}. ${+ymd[2]}` : "", ymd,
    mark:S.mark, color:RIBBON[S.color].c
  };
}

// ===== 그리기 =====
// 카드 글꼴을 다 받은 뒤에 그려요 (글꼴 없이 그리면 다른 글씨체로 저장돼요)
const fontCss = new Promise(r => {
  const l = document.getElementById("cardfonts");
  if(!l || l.sheet) return r();
  l.addEventListener("load", r); l.addEventListener("error", r);
});
async function fontsReady(){
  await fontCss;
  const sample = S.card + S.from + "Thank you THANK YOU WITH LOVE OUR WEDDING DAY 0123456789.·@wed_voice.su 눌러서 사진 넣기 love";
  await Promise.all([fnt(40, FONTS.script), fnt(40, FONTS.ko), fnt(40, FONTS.en, 600), fnt(40, FONTS.big)]
    .map(f => document.fonts.load(f, sample).catch(() => {})));
}

let paintTok = 0, imgTimer = 0, imgFile = null, imgJob = null;
async function paint(withThumbs){
  const tok = ++paintTok;
  await fontsReady();
  const cv = document.getElementById("cv");
  if(tok !== paintTok || !cv) return;
  const D = DESIGNS.find(x => x.key === S.design);
  document.getElementById("fit").hidden = !drawCard(cv.getContext("2d"), D, cardData(D));
  if(withThumbs) app.querySelectorAll("#designs button").forEach(b => {
    const T = DESIGNS.find(x => x.key === b.dataset.k);
    drawCard(b.querySelector("canvas").getContext("2d"), T, cardData(T), .2);
  });
  // 저장 버튼을 누르자마자 공유 창이 뜨도록 이미지 파일을 미리 만들어 둬요
  imgFile = null;
  clearTimeout(imgTimer);
  imgTimer = setTimeout(() => {
    const job = imgJob = new Promise(r => cv.toBlob(r, "image/jpeg", .92))
      .then(b => { if(job === imgJob && b) imgFile = new File([b], "땡큐카드.jpg", { type:"image/jpeg" }); return imgFile; });
  }, 300);
}
// 글꼴이 늦게 도착하면 다시 그려요
if(document.fonts) document.fonts.addEventListener("loadingdone", () => { if(document.getElementById("cv")) paint(true); });

async function save(){
  const msg = document.getElementById("msg");
  const D = DESIGNS.find(x => x.key === S.design);
  if(D.photo === true && !S.photo){ msg.textContent = "이 디자인은 사진이 필요해요. 사진을 먼저 넣어 주세요."; return; }
  let file = imgFile;
  if(!file){
    clearTimeout(imgTimer);
    const b = await new Promise(r => document.getElementById("cv").toBlob(r, "image/jpeg", .92));
    file = b && new File([b], "땡큐카드.jpg", { type:"image/jpeg" });
  }
  if(!file){ msg.textContent = "이미지를 만들지 못했어요. 화면을 캡처해 주세요."; return; }
  if(navigator.canShare && navigator.canShare({ files:[file] })){
    try{ await navigator.share({ files:[file] }); msg.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
  }
  showImage(file);
}
// 공유 창이 없는 곳(카톡·인스타 안 브라우저, 컴퓨터): 이미지를 크게 띄워 길게 눌러 저장하게 해요
function showImage(file){
  const url = URL.createObjectURL(file);
  const box = document.createElement("div");
  box.className = "sheet";
  box.innerHTML = `
    <img src="${url}" alt="완성된 땡큐 카드">
    <p>이미지를 길게 눌러 저장하세요</p>
    <a class="btn ghost" href="${url}" download="${file.name}">파일로 받기</a>
    <button class="text-btn" id="close">닫기</button>`;
  document.body.appendChild(box);
  box.querySelector("#close").onclick = () => { box.remove(); URL.revokeObjectURL(url); };
}

isExpired() ? expired() : home();
