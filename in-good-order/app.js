// 결혼식 식순표: 기본 식순(11개 · 29분)이 미리 들어 있고, 넣고 빼고 순서를 바꾸면 웨딩홀·사회자·부모님께 보낼 식순표가 나와요.
// 공통 기능은 shared/common.js. 식순은 이 휴대폰 브라우저 안에만 보관되고(STORE), 어디에도 올라가지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/in-good-order/?preview)
const OPEN = false;
// =========================================================

// ===== 기준 =====
// 대관 시간과 상관없이 대부분의 웨딩홀이 본식을 30분 안에 마쳐요 (사회자님, 2026-11-03)
const LIMIT = 30;
// 식순을 어디에 보관할지: localStorage = 탭을 닫아도 이 휴대폰에 남아요 / sessionStorage = 탭을 닫으면 사라져요
const STORE = window.localStorage;
const KEY = "in-good-order.v2";   // 2차 검토(11/3)로 방식·순서가 바뀌어 v1 보관분은 버려요

// ===== 순서 목록 (문구를 바꾸려면 여기만 고치면 돼요) =====
// 적은 순서가 곧 식의 순서예요. 순서를 넣을 때 이 순서에 맞는 자리에 끼워져요.
//   title    : 식순 이름
//   min      : 기본 분
//   base     : 기본 식순에 들어 있는 순서면 true (11개 · 총 29분, 사회자님 확정 2026-11-03, 2차 검토 반영)
//   c        : 진행 내용 (방식이 없는 순서)
//   desc     : 무엇을 하는 순서인지 한 줄 (순서를 펼치거나 넣을 때 보여요)
//   ways     : 방식 고르기. 고르면 내용(c)과 분(min)이 채워져요. todo가 있으면 그 방식의 챙길 것으로 바뀌어요 (null이면 안 적혀요)
//   way      : 처음에 골라져 있는 방식(v). null이면 "정해 주세요"로 보이고 챙길 것에 올라가요
//   undecided: way가 null일 때 보여 줄 말
//   todo     : 식순표 "챙길 것"에 적히는 한 줄
//   tip      : 사회자 팁. 순서를 펼쳤을 때만 보이고 식순표 카드·문자에는 안 들어가요 (방식에 tip이 있으면 그 방식의 팁)
//   music    : 입장곡·행진곡이 필요한 순서면 true → 챙길 것에 "입장곡·행진곡과 음원 타이밍" 한 줄로 합쳐져요 (MUSIC_TODO)
const CATALOG = {
  open:     { title:"개식사", min:1, base:true, c:"사회자",
              desc:"사회자가 식의 시작을 알리고 하객께 인사해요." },
  parents:  { title:"양가 부모님 입장", min:2, c:"신랑 부모님 → 신부 부모님",
              desc:"양가 부모님이 먼저 입장하는 식이면 화촉점화 앞에 넣어요. 넣으면 화촉점화가 2분으로 줄어요.",
              todo:"양가 부모님께 입장 순서와 동선 알려드리기" },
  candle:   { title:"화촉점화", min:4, base:true,
              desc:"촛불을 켜고, 맞절과 하객 인사를 해요. 양가 부모님이 입장하는 식이면 아버님도 같이 하실지 정해요.",
              ways:[
                { v:"mothers", t:"양가 어머님", c:"양가 어머님", todo:"양가 어머님께 화촉점화 순서 알려드리기" },
                { v:"both",    t:"양가 부모님 모두", c:"양가 부모님", todo:"양가 부모님께 화촉점화 순서 알려드리기" }
              ], way:"mothers", undecided:"아버님도 같이 하실지 정해 주세요" },
  groom:    { title:"신랑 입장", min:2, base:true, c:"", music:true,
              desc:"신랑이 입장곡에 맞춰 버진로드를 걸어 단상까지 가요.",
              tip:"입장곡에 맞춰 천천히 입장해요." },
  bride:    { title:"신부 입장", min:3, base:true, music:true,
              desc:"누구와 입장할지 고르면 내용이 채워져요.",
              ways:[
                { v:"father", t:"아버님과 입장", c:"아버님과 입장",
                  todo:"아버님께 동선(버진로드 앞에서 만나 신랑과 인사·악수·포옹 뒤 자리로) 알려드리고, 같이 한 번 걸어 보기",
                  tip:"아버님은 보통 버진로드 앞에서 만나요. 문(커튼) 뒤에서는 신부 혼자 나와요. 걷다가 신랑과 만나면 신랑과 아버님이 인사·악수·포옹을 하고 아버님은 자리로 가세요. 드레스 때문에 아버님 걸음이 빠르면 신부가 못 따라가요. 인사할 때는 아버님과 같은 곳을 보면 좋아요." },
                { v:"alone",  t:"혼자 입장", c:"혼자 입장", todo:"신랑이 부케 프로포즈를 할지 정하기" },
                { v:"groom",  t:"신랑과 함께 입장", c:"신랑과 함께 입장", todo:null }
              ], way:"father" },
  bow:      { title:"맞절", min:2, base:true, c:"",
              desc:"신랑 신부가 마주 보고 인사해요." },
  vows:     { title:"혼인서약", min:2, base:true,
              desc:"신랑 신부가 서약문을 읽어요. 어느 쪽을 보고 읽을지 고르면 내용이 채워져요.",
              ways:[
                { v:"front", t:"하객을 바라보고", c:"신랑 신부 낭독 (하객을 바라보고)", todo:"서약문 준비하기" },
                { v:"face",  t:"마주 보고", c:"신랑 신부 낭독 (마주 보고)", todo:"마주 보고 한다고 웨딩홀·사회자에게 알리고, 서약서 2장 준비하기. 마이크 2개는 웨딩홀에 부탁하기" }
              ], way:"front" },
  kids:     { title:"화동 입장", min:2, c:"",
              desc:"화동이 혼인서약서나 예물을 들고 들어와 전해요. 예물 교환 앞에, 예물 교환이 없으면 혼인서약 앞에 들어가요.",
              todo:"화동이 준비되면 사회자에게 신호를 보내 달라고 보호자께 부탁하기" },
  rings:    { title:"예물 교환", min:2, c:"",
              desc:"반지를 주고받아요. 신랑이 신부에게, 그다음 신부가 신랑에게. 혼인서약 뒤·성혼선언 앞에 들어가요." },
  declare:  { title:"성혼선언", min:1, base:true,
              desc:"두 사람이 부부가 되었음을 선언해요.",
              ways:[
                { v:"mc",     t:"사회자 낭독", c:"사회자 낭독", todo:null },
                { v:"father", t:"양가 아버님 중 한 분 낭독", c:"아버님 낭독", min:2, todo:"성혼선언문 낭독하실 아버님께 미리 드리기" }
              ], way:"mc" },
  blessing: { title:"덕담", min:3, base:true,
              desc:"양가 어른이 두 사람에게 당부의 말을 해요.",
              ways:[
                { v:"gfather", t:"신랑 측 아버님", c:"신랑 측 아버님" },
                { v:"bfather", t:"신부 측 아버님", c:"신부 측 아버님" }
              ], way:null, undecided:"누가 하실지 정해 주세요",
              todo:"덕담하실 분께 3분 안으로 부탁드리기" },
  speech:   { title:"축사", min:3, c:"",
              desc:"친구나 지인, 가족이 축하의 말을 해요. 덕담 뒤·축가 앞에 들어가요.",
              tip:"“기억나?” 한마디에 눈물이 쏟아질 수 있어요. 사회자가 미리 알면 자연스럽게 이어 가요.",
              todo:"축사하실 분께 3분 안으로 부탁드리기. 신부 자매·친구가 하면 눈물이 많은지 사회자에게 미리 알려 주기" },
  song:     { title:"축가", min:4, base:true,
              desc:"누가 부를지 고르면 시간이 채워져요. 2곡을 넘기지 않는 게 좋아요.",
              ways:[
                { v:"one",   t:"친구 1곡", c:"친구 1곡", min:4 },
                { v:"two",   t:"친구 2곡", c:"친구 2곡", min:6 },
                { v:"groom", t:"신랑이 직접", c:"신랑 축가", min:4 }
              ], way:null, undecided:"누가 부를지 정해 주세요",
              todo:"축가 부를 분께 곡 정해 MR 보내고, 리허설을 위해 식 30분 전 도착 부탁하기" },
  event:    { title:"영상 상영", min:3, c:"부모님 감사 영상",
              desc:"홀에서 영상이 나오는지 먼저 확인해요. 부모님 인사 앞에 들어가요.",
              todo:"영상 파일과 재생 방법 웨딩홀에 확인하기" },
  greet:    { title:"부모님 인사 · 하객 인사", min:4, base:true, c:"신부 부모님 → 신랑 부모님 → 하객",
              desc:"신부 부모님, 신랑 부모님 순서로 인사하고, 하객을 향해 인사해요.",
              tip:"신랑이 부모님께 절을 할지는 선택이에요. 보통은 절해요. 하객 인사 때는 절하지 않아요.",
              todo:"인사 받으신 뒤 나오셔서 신랑 신부와 포옹한다고 부모님께 알려드리기 (눈물이 걱정되면 손을 모아 ‘화이팅’으로 바꿔도 돼요)" },
  march:    { title:"행진", min:3, base:true, c:"", music:true,
              desc:"신랑 신부가 행진곡에 맞춰 함께 걸어 나가요." }
};
const ORDER = Object.keys(CATALOG);
const BASE  = ORDER.filter(k=>CATALOG[k].base);
// 신랑 입장·신부 입장·행진의 곡·타이밍은 챙길 것에 한 줄로 (사회자님 2026-11-03)
const MUSIC_TODO = "입장 · 행진: 입장곡·행진곡과 음원 타이밍 정하기 (입장 타이밍 큐시트에서)";

// 사회자 한마디 (식순표 카드 맨 아래)
const TIP_OK = `대부분의 웨딩홀이 본식을 ${LIMIT}분 안에 마쳐요. ${LIMIT}분 안에 들어오면 사진 촬영까지 쫓기지 않아요. 정해진 식순은 웨딩홀과 사회자에게 미리 보내 주세요.`;
function tipOver(over){
  return `대부분의 웨딩홀이 본식을 ${LIMIT}분 안에 마쳐요. ${over}분을 줄여야 해요. 축가는 2곡 안으로, 1절 뒤 바로 마지막 후렴으로 이어지게 음원을 편집하면 곡마다 1~2분이 줄어요. 혼인서약·덕담·축사는 각 3분 안으로 부탁드리세요. 원판 촬영을 식 전에 나눠 찍는 것도 방법인데, 웨딩홀과 미리 협의해야 해요.`;
}
const SAFE = "식순은 이 휴대폰 브라우저 안에만 보관되고, 어디에도 올라가지 않아요.";
const LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

// ===== 상태 =====
//   info  : 예식 정보 (전부 선택)
//   items : 식순. { k: CATALOG 키 또는 "custom", title: 직접 적은 이름, min: 분, way: 고른 방식, note: 직접 고친 진행 내용 (null이면 방식 문구) }
//   open  : 펼쳐진 순서의 번호 (보관하지 않아요)
const S = { info:blankInfo(), items:[], open:-1 };
function blankInfo(){ return { groom:"", bride:"", date:"", time:"", venue:"" }; }
function clampMin(v, d){ v = parseInt(v,10); return isNaN(v) ? d : Math.max(0, Math.min(60, v)); }
function makeItem(k){
  const c=CATALOG[k], w = c.ways && c.way ? c.ways.find(x=>x.v===c.way) : null;
  return { k, title:"", min:(w && w.min) || c.min, way:c.way || null, note:null };
}
function defaults(){ return BASE.map(makeItem); }
function baseTotal(){ return defaults().reduce((a,it)=>a+it.min,0); }

function load(){
  try{
    const d = JSON.parse(STORE.getItem(KEY) || "null");
    if(!d || !Array.isArray(d.items)) return false;
    const items = d.items.filter(it=>it && (it.k==="custom" || CATALOG[it.k])).map(it=>{
      const c = CATALOG[it.k];
      const way = c && c.ways && c.ways.some(w=>w.v===it.way) ? it.way : null;
      return { k:it.k, title:String(it.title||""), min:clampMin(it.min, c ? c.min : 3), way, note: typeof it.note==="string" ? it.note : null };
    });
    if(!items.length) return false;
    S.items = items;
    S.info = Object.assign(blankInfo(), d.info || {});
    return true;
  }catch(e){ return false; }
}
function save(){ try{ STORE.setItem(KEY, JSON.stringify({ v:1, info:S.info, items:S.items })); }catch(e){} }
function hasSaved(){ try{ return !!STORE.getItem(KEY); }catch(e){ return false; } }
function fresh(){ S.info = blankInfo(); S.items = defaults(); S.open = -1; try{ STORE.removeItem(KEY); }catch(e){} }

// ===== 순서 하나 읽기 =====
function cat(it){ return CATALOG[it.k] || null; }
function wayOf(it){ const c=cat(it); return c && c.ways ? (c.ways.find(w=>w.v===it.way) || null) : null; }
function titleOf(it){ return it.k==="custom" ? (it.title.trim() || "직접 적은 순서") : cat(it).title; }
function contentOf(it){
  if(it.note!=null) return it.note;
  const w=wayOf(it); if(w) return w.c;
  const c=cat(it); return c ? (c.c || "") : "";
}
function undecided(it){ const c=cat(it); return !!(c && c.ways && !it.way); }
function todoOf(it){
  const c=cat(it); if(!c) return [];
  if(undecided(it)) return [`${c.title}: ${c.undecided}`];
  const w=wayOf(it);
  const t = (w && "todo" in w) ? w.todo : c.todo;
  return t ? [`${c.title}: ${t}`] : [];
}
function tipOf(it){ const c=cat(it); if(!c) return null; const w=wayOf(it); return (w && "tip" in w) ? w.tip : (c.tip || null); }
function total(){ return S.items.reduce((a,it)=>a+(it.min||0),0); }
function over(){ return total()-LIMIT; }
// 순서 k를 끼울 자리: 목록 순서(ORDER)에서 뒤에 오는 첫 순서 앞. 직접 적는 순서는 행진 앞
function insertAt(k){
  if(k==="kids"){   // 화동 입장: 예물 교환이 있으면 그 앞, 없으면 혼인서약 앞 (사회자님 2026-11-03)
    const r=S.items.findIndex(it=>it.k==="rings"); if(r>=0) return r;
    const v=S.items.findIndex(it=>it.k==="vows"); if(v>=0) return v;
  }
  const ci = ORDER.indexOf(k);
  if(ci<0){ const m=S.items.findIndex(it=>it.k==="march"); return m<0 ? S.items.length : m; }
  for(let i=0;i<S.items.length;i++){ const oi=ORDER.indexOf(S.items[i].k); if(oi>ci) return i; }
  return S.items.length;
}
// 화동 입장을 규칙대로 다시 끼워요 (예물 교환을 넣거나 뺄 때, 화동이 그 자리에 붙어 있었으면)
function placeKids(){
  const ki=S.items.findIndex(it=>it.k==="kids"); if(ki<0) return;
  const [kid]=S.items.splice(ki,1);
  S.items.splice(insertAt("kids"),0,kid);
}
// 양가 부모님 입장을 넣으면 화촉점화는 2분·"아버님도 같이 하실지" 비움, 빼면 4분·양가 어머님으로 (사회자님 2026-11-03)
function coupleCandle(withParents){
  const cd=S.items.find(it=>it.k==="candle"); if(!cd) return;
  if(withParents){ cd.way=null; cd.min=2; } else { cd.way=CATALOG.candle.way; cd.min=CATALOG.candle.min; }
}

// ===== 시간 =====
function parseHM(t){ const m=/^(\d{1,2}):(\d{2})$/.exec(t||""); return m ? (+m[1])*60 + (+m[2]) : null; }
function clock(m){ m=((m%1440)+1440)%1440; return pad(Math.floor(m/60))+":"+pad(m%60); }
function korTime(t){
  const m=parseHM(t); if(m==null) return "";
  const h=Math.floor(m/60), mm=m%60;
  return `${h<12?"오전":"오후"} ${h%12||12}시${mm?` ${mm}분`:""}`;
}
function korDate(d, withYear){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||""); if(!m) return "";
  const dt=new Date(+m[1],+m[2]-1,+m[3]), w="일월화수목금토"[dt.getDay()];
  return `${withYear?m[1]+"년 ":""}${+m[2]}월 ${+m[3]}일 (${w})`;
}
function startMin(){ return parseHM(S.info.time); }
function rowClock(i){ const s=startMin(); if(s==null) return ""; let m=s; for(let j=0;j<i;j++) m+=S.items[j].min||0; return clock(m); }
function infoLine(){
  const d=korDate(S.info.date), t=korTime(S.info.time), v=S.info.venue.trim();
  return [ [d,t].filter(Boolean).join(" "), v ].filter(Boolean).join(" · ");
}
function namesLine(){
  const g=S.info.groom.trim(), b=S.info.bride.trim();
  return [g,b].filter(Boolean).join(" · ");
}

// ===== 화면 조각 =====
function plain(){ document.body.classList.remove("is-cover"); app.className="wrap"; window.scrollTo(0,0); }
function topBar(right){ return `<div class="top"><span>결혼식 식순표</span><span class="count" id="count">${esc(right)}</span></div>`; }
function statusBox(){
  const t=total(), o=over(), pct=Math.min(100, Math.round(t/LIMIT*100));
  const inner = o<=0
    ? `<b>총 ${t}분 · ${LIMIT}분 안에 들어와요</b>여유 ${-o}분. 대부분의 웨딩홀이 본식을 ${LIMIT}분 안에 마쳐요. 이후 30분은 원판 사진 촬영(가족 → 친지 → 지인·친구 순)이에요.`
    : `<b>총 ${t}분 · ${LIMIT}분을 ${o}분 넘어요</b>축가는 2곡 안, 혼인서약·덕담·축사는 각 3분 안으로 줄여 보세요.`;
  return `<div class="status ${o<=0?"ok":"warn"}" id="status">${inner}<div class="bar2"><div style="width:${pct}%"></div></div></div>`;
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0,0);
  const saved = hasSaved();
  app.innerHTML = `
    <div class="top"><span>결혼식 식순표</span><span>${LIMIT}분 안</span></div>
    ${brandLogo()}
    <p class="for">식순을 짜는 신랑·신부님을 위한</p>
    <h1>우리 결혼식<br>식순, 몇 분<br>걸릴까요?</h1>
    <div class="bar"></div>
    <p class="lead">기본 식순이 미리 들어 있어요. 넣고 빼고 순서만 바꾸면 웨딩홀·사회자·부모님께 보낼 식순표가 나와요.</p>
    <div class="pick">
      <button id="start"><span>${saved?"이어서 만들기":"식순표 만들기"}</span><span class="q">${saved?"만들던 식순":`기본 식순 ${BASE.length}개 · ${baseTotal()}분`}</span></button>
      ${saved?`<button id="new"><span>새로 만들기</span><span class="q">기본 식순부터</span></button>`:""}
    </div>
    <p class="note">※ ${SAFE}</p>
    ${foot()}`;
  document.getElementById("start").onclick = ()=>{ if(!(saved && load())) fresh(); edit(); };
  const n=document.getElementById("new"); if(n) n.onclick = ()=>{ fresh(); edit(); };
}

// ===== 식순 손보기 =====
function edit(){
  plain(); S.open=-1;
  app.innerHTML = `
    ${topBar(`총 ${total()}분`)}
    <h2 class="title">식순을<br>손봐 주세요</h2>
    <p class="lead2">순서를 누르면 방식·시간을 바꾸거나 뺄 수 있어요. 없는 순서는 아래 “순서 넣기”로 더해요. 예식 정보는 적어도 되고 안 적어도 돼요.</p>
    <section class="info" aria-label="예식 정보">
      <p class="lbl">예식 정보 (선택)</p>
      <div class="g2">
        <input class="in" id="groom" placeholder="신랑 이름" value="${esc(S.info.groom)}" autocomplete="off">
        <input class="in" id="bride" placeholder="신부 이름" value="${esc(S.info.bride)}" autocomplete="off">
      </div>
      <div class="g2">
        <input class="in" id="date" type="date" value="${esc(S.info.date)}" aria-label="예식 날짜">
        <input class="in" id="time" type="time" value="${esc(S.info.time)}" aria-label="예식 시각">
      </div>
      <input class="in" id="venue" placeholder="웨딩홀 (예: 상록아트홀 그랜드볼룸)" value="${esc(S.info.venue)}" autocomplete="off">
      <p class="lbl2">예식 시각을 적으면 순서마다 몇 시에 시작하는지 보여요.</p>
    </section>
    <div id="statusWrap">${statusBox()}</div>
    <ol class="rows" id="rows" aria-label="식순"></ol>
    <div class="btns gap">
      <button class="btn ghost" id="add">+ 순서 넣기</button>
      <div id="lib" hidden></div>
      <button class="btn main" id="done">식순표 보기</button>
    </div>
    <p class="safe">${LOCK}<span>${SAFE}</span></p>
    <div class="under"><button class="text-btn" id="home">처음으로</button><button class="text-btn" id="reset">기본 식순으로 되돌리기</button></div>
    ${foot()}`;
  ["groom","bride","date","time","venue"].forEach(id=>{
    const el=document.getElementById(id);
    el.oninput = ()=>{ S.info[id]=el.value; save(); if(id==="time") paintRows(); };
  });
  document.getElementById("add").onclick = toggleLib;
  document.getElementById("done").onclick = result;
  document.getElementById("home").onclick = home;
  const rs=document.getElementById("reset");
  rs.onclick = ()=>{
    if(rs.dataset.sure){ S.items=defaults(); S.open=-1; save(); delete rs.dataset.sure; rs.textContent="기본 식순으로 되돌리기"; paintRows(); return; }
    rs.dataset.sure="1"; rs.textContent="한 번 더 누르면 되돌려요";
    setTimeout(()=>{ delete rs.dataset.sure; rs.textContent="기본 식순으로 되돌리기"; }, 3000);
  };
  paintRows();
}
function paintStatus(){
  document.getElementById("statusWrap").innerHTML = statusBox();
  document.getElementById("count").textContent = `총 ${total()}분`;
}
function rowHtml(it, i){
  const c=cat(it), w=wayOf(it), content=contentOf(it), need=undecided(it), tm=rowClock(i), open=S.open===i, tip=tipOf(it);
  const sub = content || (need ? c.undecided : "");
  let editPanel="";
  if(open){
    editPanel = `
      <div class="edit">
        ${c && c.desc ? `<p class="desc2">${esc(c.desc)}</p>` : ""}
        ${c && c.ways ? `<div class="chips" role="group" aria-label="방식 고르기">${c.ways.map(x=>`<button type="button" class="chip${it.way===x.v?" on":""}" data-w="${x.v}">${esc(x.t)}${x.min && x.min!==c.min?` · ${x.min}분`:""}</button>`).join("")}</div>` : ""}
        ${tip ? `<div class="tip2"><b>사회자 팁</b>${esc(tip)}</div>` : ""}
        ${it.k==="custom" ? `<input class="in" data-title placeholder="순서 이름" value="${esc(it.title)}" autocomplete="off">` : ""}
        <input class="in" data-note placeholder="진행 내용 · 메모 (선택)" value="${esc(content)}" autocomplete="off">
        <div class="ctrl">
          <div class="step" aria-label="소요 시간"><button type="button" data-d="-1" ${it.min<=0?"disabled":""}>−</button><b>${it.min}분</b><button type="button" data-d="1" ${it.min>=60?"disabled":""}>+</button></div>
          <button type="button" class="del" data-del>빼기</button>
        </div>
        <div class="mvs">
          <button type="button" class="mv" data-mv="-1" ${i===0?"disabled":""}>▲ 위로</button>
          <button type="button" class="mv" data-mv="1" ${i===S.items.length-1?"disabled":""}>▼ 아래로</button>
        </div>
      </div>`;
  }
  return `
    <li class="row${open?" open":""}${need?" need":""}" data-i="${i}">
      <button type="button" class="rowbtn" aria-expanded="${open}">
        <span class="num">${i+1}</span>
        <span class="main"><span class="t">${esc(titleOf(it))}</span><span class="c">${esc(sub)}</span></span>
        <span class="side"><b>${it.min}분</b>${tm?`<small>${tm}</small>`:""}</span>
      </button>
      ${editPanel}
    </li>`;
}
function paintRows(){
  const ol=document.getElementById("rows"); if(!ol) return;
  ol.innerHTML = S.items.map(rowHtml).join("");
  paintStatus();
  ol.querySelectorAll(".row").forEach(li=>{
    const i=+li.dataset.i, it=S.items[i];
    li.querySelector(".rowbtn").onclick = ()=>{ S.open = S.open===i ? -1 : i; paintRows(); };
    li.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
      const c=cat(it), prev=wayOf(it), w=c.ways.find(x=>x.v===b.dataset.w);
      it.way=w.v; it.note=null;
      // 방식에 분이 있으면 그 분으로, 분 있는 방식에서 돌아오면 기본 분으로, 아니면 손본 분 그대로 (화촉점화 2분 등)
      if(w.min) it.min=w.min; else if(prev && prev.min) it.min=c.min;
      save(); paintRows();
    });
    const note=li.querySelector("[data-note]");
    if(note) note.oninput = ()=>{ it.note=note.value; save(); li.querySelector(".c").textContent = note.value || (undecided(it)?cat(it).undecided:""); };
    const title=li.querySelector("[data-title]");
    if(title) title.oninput = ()=>{ it.title=title.value; save(); li.querySelector(".t").textContent = titleOf(it); };
    li.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{ it.min=clampMin(it.min + +b.dataset.d, it.min); save(); paintRows(); });
    li.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{
      const j=i + +b.dataset.mv; if(j<0||j>=S.items.length) return;
      S.items[i]=S.items[j]; S.items[j]=it; S.open=j; save(); paintRows();
      const el=document.querySelector(`.row[data-i="${j}"]`); if(el) el.scrollIntoView({block:"nearest"});
    });
    const del=li.querySelector("[data-del]");
    if(del) del.onclick = ()=>{
      const kidBefore = it.k==="rings" && i>0 && S.items[i-1].k==="kids";
      S.items.splice(i,1); S.open=-1;
      if(it.k==="parents") coupleCandle(false);
      if(kidBefore) placeKids();
      save(); paintRows();
    };
  });
  const lib=document.getElementById("lib"); if(lib && !lib.hidden) paintLib();
}

// ===== 순서 넣기 =====
function toggleLib(){
  const lib=document.getElementById("lib"), btn=document.getElementById("add");
  lib.hidden = !lib.hidden;
  btn.textContent = lib.hidden ? "+ 순서 넣기" : "닫기";
  if(!lib.hidden) paintLib();
}
function paintLib(){
  const lib=document.getElementById("lib");
  const have = new Set(S.items.map(it=>it.k));
  const keys = ORDER.filter(k=>!have.has(k));
  lib.innerHTML = `<div class="lib">
    ${keys.map(k=>{ const c=CATALOG[k]; return `<button type="button" class="libitem" data-k="${k}"><span class="t">${esc(c.title)}<small>${c.min}분</small></span><span class="d">${esc(c.desc||"")}</span></button>`; }).join("")}
    <button type="button" class="libitem" data-k="custom"><span class="t">직접 적기<small>3분</small></span><span class="d">목록에 없는 순서를 이름부터 적어요.</span></button>
  </div>`;
  lib.querySelectorAll(".libitem").forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;
    const it = k==="custom" ? { k:"custom", title:"", min:3, way:null, note:"" } : makeItem(k);
    if(k==="candle" && S.items.some(x=>x.k==="parents")){ it.way=null; it.min=2; }
    const at=insertAt(k);
    S.items.splice(at,0,it);
    if(k==="parents") coupleCandle(true);
    if(k==="rings"){ const ki=S.items.findIndex(x=>x.k==="kids"), vi=S.items.findIndex(x=>x.k==="vows"); if(ki>=0 && ki===vi-1) placeKids(); }
    S.open=at; save();
    toggleLib(); paintRows();
    const el=document.querySelector(`.row[data-i="${at}"]`);
    if(el){ el.scrollIntoView({block:"center", behavior: reduce?"auto":"smooth"}); const t=el.querySelector("[data-title]"); if(t) t.focus(); }
  });
}

// ===== 식순표 =====
function todos(){
  const L=[]; let music=false;
  S.items.forEach(it=>{
    const c=cat(it);
    if(c && c.music && !music){ music=true; L.push(MUSIC_TODO); }
    L.push(...todoOf(it));
  });
  return L;
}
function sheetText(){
  const L=[], names=namesLine(), info=infoLine(), t=total(), o=over(), s=startMin();
  L.push(`[결혼식 식순표]${names?" "+names:""}`);
  if(info) L.push(info);
  L.push(`총 ${t}분${o>0?` (${LIMIT}분을 ${o}분 넘어요)`:` (${LIMIT}분 안)`}`, "");
  S.items.forEach((it,i)=>{
    const c=contentOf(it) || (undecided(it)?cat(it).undecided:"");
    L.push(`${i+1}. ${s!=null?rowClock(i)+" ":""}${titleOf(it)} · ${it.min}분${c?` · ${c}`:""}`);
  });
  const td=todos();
  if(td.length){ L.push("", "챙길 것"); td.forEach(x=>L.push("- "+x)); }
  L.push("", "결혼식사회자 이상운 @wed_voice.su");
  return L.join("\n");
}
function result(){
  plain();
  const names=namesLine(), info=infoLine(), t=total(), o=over(), s=startMin(), td=todos();
  app.innerHTML = `
    ${topBar(`총 ${t}분`)}
    <article class="card" id="card">
      <div class="head"><span class="kind">결혼식 식순표</span><span class="handle">@wed_voice.su</span></div>
      <h2 class="sheet-h">${names?esc(names)+"<br>결혼식 식순":"우리 결혼식<br>식순"}</h2>
      <p class="line">${esc(info || `${S.items.length}개 순서`)}</p>
      <p class="desc">${o<=0?`총 ${t}분 · ${LIMIT}분 안에 들어와요`:`총 ${t}분 · ${LIMIT}분을 ${o}분 넘어요`}</p>
      <ol class="sheet${s==null?" notime":""}" aria-label="식순">
        ${S.items.map((it,i)=>{ const c=contentOf(it), need=undecided(it); return `<li><span class="n">${i+1}</span>${s!=null?`<span class="tm">${rowClock(i)}</span>`:""}<span class="body"><b>${esc(titleOf(it))}</b>${c||need?`<span${need&&!c?' class="need"':""}>${esc(c||cat(it).undecided)}</span>`:""}</span><span class="m">${it.min}분</span></li>`; }).join("")}
      </ol>
      <p class="total"><span>총 소요 시간</span><span>${t}분</span></p>
      ${td.length?`<div class="todo"><b>챙길 것</b><ul>${td.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
      <div class="tip"><b>사회자 한마디</b><p>${esc(o>0?tipOver(o):TIP_OK)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">저장해서 웨딩홀·사회자·부모님께 보내 주세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copy">문자로 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
        <button class="btn ghost" id="edit">식순 다시 손보기</button>
        ${siteLink("cue","btn ghost","입장 타이밍 큐시트 만들기")}
        <a class="btn ghost" href="${ROOT}song/">입장곡 · 축가 찾기</a>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="home">처음으로</button>
      </div>
    </div>
    <textarea class="hiddenbox" id="box" readonly aria-hidden="true">${esc(sheetText())}</textarea>`;
  prepareImage("식순표"+(names?"-"+names.replace(/\s*·\s*/g,"-"):""));
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copy").onclick = ()=>copyText(sheetText(), document.getElementById("box"));
  document.getElementById("edit").onclick = edit;
  document.getElementById("home").onclick = home;
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
    <div class="top"><span>결혼식 식순표</span><span>${LIMIT}분 안</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>우리 결혼식<br>식순, 몇 분<br>걸릴까요?</h1>
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
  home();
}
route();
