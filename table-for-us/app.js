// 청모 장소 찾기: 어떤 친구들(남자·여자) → 몇 명 → 어느 역을 고르면, 그 역 가까이 청첩장 모임 식당 2곳을 보여 줘요.
// 공통 기능은 shared/common.js, 식당·역 데이터와 식당별 문구는 data.js. 고른 답은 어디에도 저장하지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/table-for-us/?preview)
const OPEN = false;
// =========================================================

// ===== 화면 문구 (문구를 바꾸려면 여기만 고치면 돼요. 식당 문구는 data.js) =====
const NAME = "청모 장소 찾기";
// 첫 질문: 어떤 친구들 모임인지 (data.js의 who와 같은 키)
const WHO = {
  "남": { a: "남자 친구들이 많아요", sub: "고기 · 술 한잔 곁들이는 자리", short: "남자 친구들" },
  "여": { a: "여자 친구들이 많아요", sub: "이야기 나누며 먹는 자리", short: "여자 친구들" }
};
// 두 번째 질문: 인원 (data.js의 size와 같은 값)
const SIZES = [
  { v: "4-6", a: "6명까지" },
  { v: "7-10", a: "7~10명" },
  { v: "11+", a: "11명 이상" }
];
// 역 고르기 화면의 묶음 — 식당을 모은 역만 적어요. 새 역을 모으면 여기에 이름을 넣으세요.
const REGIONS = [
  { name: "강남 · 서초 · 송파", st: ["강남", "고속터미널", "잠실"] },
  { name: "홍대 · 마포", st: ["홍대입구", "합정", "공덕"] },
  { name: "종로 · 을지로", st: ["종로3가", "을지로3가"] },
  { name: "성동 · 광진", st: ["왕십리", "건대입구"] }
];
// 결과 카드의 "사회자 한마디" (11명 이상이면 11+ 문구)
const TIP = {
  "남": "청첩장은 첫 잔을 들기 전에 건네세요. 그리고 식 끝나고 원판 사진까지 꼭 같이 찍자고 말해 두세요.",
  "여": "청첩장은 음식이 나오기 전에 건네세요. 그리고 식 끝나고 원판 사진까지 꼭 같이 찍자고 말해 두세요.",
  "11+": "11명이 넘으면 한 공간에 다 앉을 수 있는지가 먼저예요. 예약 전화에서 '한 방에 몇 명까지 되나요?'부터 물어보세요."
};
// 고른 인원이 앉을 수 있다고 확인되지 않은 곳에 붙는 안내
const FIT = {
  "7-10": "단체석 정보가 없는 곳이에요. 7명이 넘으면 전화로 자리부터 확인해 주세요.",
  "11+": "11명 이상 자리는 확인되지 않았어요. 전화로 한 공간에 몇 명까지 되는지 먼저 물어보세요."
};
const CHECK_NOTE = "최근 정보가 적은 곳이에요. 예약 전에 전화로 영업하는지 꼭 확인해 주세요.";
const PHONE_NOTE = "전화번호가 출처마다 달라요. 연결이 안 되면 카카오맵에서 번호를 다시 확인해 주세요.";
const SAFE = `${DATA_DATE} 기준이에요. 카카오맵·다이닝코드·후기를 맞춰 보고 골랐지만, 영업시간·가격은 바뀔 수 있으니 예약할 때 한 번 더 확인해 주세요.`;
// =========================================================

const S = { who: null, size: null, st: null };
const STN = new Map(STATIONS.map(s => [s[0], s]));
const COVERED = REGIONS.flatMap(r => r.st);
const RANK = { "1": 0, "2": 1, "big": 2 };
function sizeLabel(v){ const s = SIZES.find(x => x.v === v); return s ? s.a : ""; }
function num(n){ return Number(n).toLocaleString("ko-KR"); }

// 노선 표시: "2·6" → "2·6호선", "2·신분당" → "2호선 · 신분당" (tight면 "2호선·신분당"처럼 붙여서 — 좁은 역 버튼용)
function lineLabel(raw, tight){
  const parts = String(raw || "").split("·").filter(Boolean);
  const nums = parts.filter(p => /^\d+$/.test(p)), others = parts.filter(p => !/^\d+$/.test(p));
  return [nums.length ? nums.join("·") + "호선" : "", ...others].filter(Boolean).join(tight ? "·" : " · ");
}
function lineOf(name, tight){ const s = STN.get(name); return s ? lineLabel(s[1], tight) : ""; }

// ===== 화면 조각 =====
function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function topCount(i){ return `<div class="top"><span>${NAME}</span><span class="count">${pad(i)} / ${pad(3)}</span></div>`; }
function under(back){ return `<div class="under">${back ? `<button class="text-btn" id="back">${back}</button>` : "<span></span>"}<button class="text-btn" id="home">처음으로</button></div>`; }
function bindUnder(backFn){
  const b = document.getElementById("back"); if(b) b.onclick = backFn;
  document.getElementById("home").onclick = home;
}
// A/B 답을 누르면 잠깐 체크가 보인 뒤 다음으로
function onAnswer(fn){
  app.querySelectorAll(".answers button").forEach(b => b.onclick = () => {
    if(app.dataset.lock) return; app.dataset.lock = "1";
    app.querySelectorAll(".answers button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    setTimeout(() => { delete app.dataset.lock; fn(b.dataset.v); }, reduce ? 60 : 260);
  });
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>서울 ${COVERED.length}개 역</span></div>
    ${brandLogo()}
    <p class="for">청첩장 돌리는 신랑·신부님을 위한</p>
    <h1>청모 장소,<br>또 찾아요?</h1>
    <div class="bar"></div>
    <p class="lead">누구랑, 몇 명이, 어느 역에서 만나는지만 고르면 식당 2곳을 바로 알려 드려요.</p>
    <div class="pick">
      <button id="start"><span>청모 장소 찾기</span><span class="q">질문 3개</span></button>
    </div>
    <p class="note">※ ${esc(SAFE)}</p>
    ${foot()}`;
  document.getElementById("start").onclick = askWho;
}

// ===== 질문 1 · 어떤 친구들 =====
function askWho(){
  plain();
  app.innerHTML = `
    ${topCount(1)}
    <h2 class="question">어떤 친구들을\n만나요?</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      ${Object.keys(WHO).map((k, i) => `${i ? '<div class="div"></div>' : ""}<button data-v="${k}"${S.who === k ? ' class="on"' : ""}><span class="box">${CHECK}</span><span><span class="a">${esc(WHO[k].a)}</span><span class="sub">${esc(WHO[k].sub)}</span></span></button>`).join("")}
    </div>
    ${under("")}
    ${foot()}`;
  onAnswer(v => { S.who = v; askSize(); });
  bindUnder(null);
}

// ===== 질문 2 · 인원 =====
function askSize(){
  plain();
  app.innerHTML = `
    ${topCount(2)}
    <h2 class="question">신랑·신부까지 합쳐\n몇 명이 모여요?</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      ${SIZES.map((s, i) => `${i ? '<div class="div"></div>' : ""}<button data-v="${s.v}"${S.size === s.v ? ' class="on"' : ""}><span class="box">${CHECK}</span><span>${esc(s.a)}</span></button>`).join("")}
    </div>
    ${under("이전")}
    ${foot()}`;
  onAnswer(v => { S.size = v; askStation(); });
  bindUnder(askWho);
}

// ===== 질문 3 · 역 =====
function askStation(){
  plain();
  app.innerHTML = `
    ${topCount(3)}
    <h2 class="question">어느 역에서\n만나요?</h2>
    <p class="lead2">환승역 ${COVERED.length}곳부터 모았어요.</p>
    <div class="regions">
      ${REGIONS.map(r => `<div class="reg"><p class="reg-n">${esc(r.name)}</p><div class="stations">${r.st.map(n => `<button class="stn${S.st === n ? " on" : ""}" data-st="${esc(n)}" aria-label="${esc(n)}역 · ${esc(lineOf(n))}"><b>${esc(n)}</b></button>`).join("")}</div></div>`).join("")}
    </div>
    <div class="find">
      <label class="lbl" for="q">다른 역에서 만나요</label>
      <input class="in" id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="역 이름 (예: 신촌)" autocomplete="off">
      <div class="hits" id="hits"></div>
    </div>
    ${under("이전")}
    ${foot()}`;
  app.querySelectorAll(".stn").forEach(b => b.onclick = () => { b.classList.add("on"); go(b.dataset.st); });
  const q = document.getElementById("q");
  q.oninput = () => paintHits(q.value);
  q.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); const first = document.querySelector("#hits .hit"); if(first) first.click(); } };
  bindUnder(askSize);
}
function norm(s){ return String(s).replace(/\s+/g, "").replace(/역$/, ""); }
function paintHits(v){
  const box = document.getElementById("hits"), q = norm(v);
  if(!q){ box.innerHTML = ""; return; }
  const hits = STATIONS.filter(s => s[0].includes(q))
    .sort((a, b) => (b[0].startsWith(q) - a[0].startsWith(q)) || (a[0].length - b[0].length) || a[0].localeCompare(b[0], "ko"))
    .slice(0, 6);
  box.innerHTML = hits.length
    ? hits.map(s => `<button class="hit" data-st="${esc(s[0])}"><span class="hn"><b>${esc(s[0])}</b><small>${esc(lineLabel(s[1]))}</small></span><span class="go2">${COVERED.includes(s[0]) ? "식당 보기" : "가까운 역 찾기"}</span></button>`).join("")
    : `<p class="none">서울 지하철역만 찾을 수 있어요. 역 이름을 다시 확인해 주세요.</p>`;
  box.querySelectorAll(".hit").forEach(b => b.onclick = () => go(b.dataset.st));
}
function go(name){
  if(COVERED.includes(name)){ S.st = name; reveal("청모 장소,\n찾았어요!", result); }
  else near(name);
}

// ===== 아직 식당을 모으지 않은 역 → 가까운 역 =====
function km(a, b){
  const r = x => x * Math.PI / 180, dLat = r(b[2] - a[2]), dLng = r(b[3] - a[3]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[2])) * Math.cos(r(b[2])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function near(name){
  plain();
  const from = STN.get(name);
  const list = COVERED.map(n => ({ n, d: km(from, STN.get(n)) })).sort((a, b) => a.d - b.d).slice(0, 3);
  app.innerHTML = `
    ${topCount(3)}
    <h2 class="title">${esc(name)}역 근처는<br>아직 모으는 중이에요</h2>
    <p class="lead2 tight">지금은 환승역 ${COVERED.length}곳부터 모았어요. 가까운 역에서 찾아볼까요?</p>
    <div class="near">
      ${list.map(x => `<button class="nearbtn" data-st="${esc(x.n)}"><span class="hn"><b>${esc(x.n)}역</b><small>${esc(lineOf(x.n))}</small></span><span class="km">직선 ${x.d < 10 ? x.d.toFixed(1) : Math.round(x.d)}km</span></button>`).join("")}
    </div>
    ${under("다른 역 고르기")}
    ${foot()}`;
  app.querySelectorAll(".nearbtn").forEach(b => b.onclick = () => go(b.dataset.st));
  bindUnder(askStation);
}

// ===== 결과 =====
// 고른 인원이 앉을 수 있다고 확인된 곳 먼저 (같으면 기본 1·2번 → 큰 모임용 순서), 두 곳까지
function pickPlaces(){
  const pool = PLACES.filter(p => p.st === S.st && p.who === S.who).sort((a, b) => RANK[a.role] - RANK[b.role]);
  const fit = pool.filter(p => p.size.includes(S.size)), rest = pool.filter(p => !p.size.includes(S.size));
  return { list: fit.concat(rest).slice(0, 2), fit: fit.length };
}
function mapUrl(p){ return "https://place.map.kakao.com/" + encodeURIComponent(p.kakao); }
function naverUrl(p){ const a = p.addr.split(/\s+/); return "https://map.naver.com/p/search/" + encodeURIComponent(p.name + " " + a.slice(1, 3).join(" ")); }
function telUrl(p){ return "tel:" + p.phone.replace(/[^\d+]/g, ""); }
function rateText(p){
  const r = p.rate, out = [];
  if(r.kakao) out.push(`카카오맵 ${r.kakao[0]} (후기 ${num(r.kakao[1])})`);
  if(r.dc) out.push(`다이닝코드 ${r.dc[0]}`);
  return out.join(" · ");
}
function notesOf(p){
  const n = [];
  if(!p.size.includes(S.size) && FIT[S.size]) n.push(FIT[S.size]);
  if(p.check) n.push(CHECK_NOTE);
  if(p.phoneWarn) n.push(PHONE_NOTE);
  return n.concat(p.warn || []);
}
function placeHtml(p, i){
  const notes = notesOf(p), rate = rateText(p);
  return `
    <section class="place">
      <div class="p-head"><span class="p-n">${i + 1}</span><span class="p-t"><span class="p-cat">${esc(p.cat)}</span><b class="p-name">${esc(p.name)}</b></span></div>
      <p class="p-why">${esc(p.why)}</p>
      <dl class="facts">
        <div><dt>위치</dt><dd>${esc(p.exit)}<span class="sm">${esc(p.addr)}</span></dd></div>
        <div><dt>메뉴</dt><dd>${p.menu.map(esc).join("<br>")}</dd></div>
        <div><dt>영업</dt><dd>${esc(p.hours)}</dd></div>
        <div><dt>자리</dt><dd>${esc(p.seat)}</dd></div>
        <div><dt>예약</dt><dd>${esc(p.book)}</dd></div>
        ${rate ? `<div><dt>평점</dt><dd>${esc(rate)}</dd></div>` : ""}
        <div><dt>전화</dt><dd>${esc(p.phone)}</dd></div>
      </dl>
      ${notes.length ? `<ul class="p-notes">${notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="p-act" data-html2canvas-ignore>
        <a class="pa call" href="${esc(telUrl(p))}">전화하기</a>
        <a class="pa" href="${esc(mapUrl(p))}" target="_blank" rel="noopener">카카오맵</a>
        <a class="pa" href="${esc(naverUrl(p))}" target="_blank" rel="noopener">네이버 지도</a>
        <button class="pa" data-copy="${i}">문구 복사</button>
      </div>
    </section>`;
}
function shortNote(fit){
  if(S.size === "4-6" || fit >= 2) return "";
  const head = `${S.st}역 ${WHO[S.who].short} 모임에서 ${sizeLabel(S.size)}이 앉을 수 있다고 확인된 곳은 `;
  return `<p class="status2">${esc(head + (fit ? `${fit}곳뿐이에요.` : "아직 없어요.") + " 안내가 붙은 곳은 전화로 자리부터 물어보세요.")}</p>`;
}
function result(){
  plain();
  const { list, fit } = pickPlaces();
  const who = WHO[S.who], size = sizeLabel(S.size);
  const tip = S.size === "11+" ? TIP["11+"] : TIP[S.who];
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>${esc(S.st)}역</span></div>
    <div class="conds" role="group" aria-label="조건 바꾸기">
      <div class="seg">${Object.keys(WHO).map(k => `<button class="sg${S.who === k ? " on" : ""}" data-who="${k}" aria-pressed="${S.who === k}">${esc(WHO[k].short)}</button>`).join("")}</div>
      <div class="seg">${SIZES.map(s => `<button class="sg${S.size === s.v ? " on" : ""}" data-size="${s.v}" aria-pressed="${S.size === s.v}">${esc(s.a)}</button>`).join("")}</div>
    </div>
    ${shortNote(fit)}
    <article class="card" id="card">
      <div class="head"><span class="kind">청모 장소 추천</span><span class="handle">@wed_voice.su</span></div>
      <h2 class="res-h">${esc(S.st)}역<br>청모 장소 ${list.length}곳</h2>
      <p class="line">${esc(who.short)} · ${esc(size)}</p>
      <p class="desc">${esc(DATA_DATE)} 기준 · 예약할 때 한 번 더 확인해 주세요</p>
      ${list.map(placeHtml).join("")}
      <div class="tip"><b>사회자 한마디</b><p>${esc(tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">마음에 드는 곳에 예약하고, 단톡방에 장소를 보내 주세요</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copyAll">두 곳 문구 복사하기</button>
        <p class="msg" id="msg" role="status"></p>
        <textarea class="in manual" id="manual" readonly hidden></textarea>
        <button class="btn ghost" id="other">다른 역 보기</button>
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="home">처음으로</button>
      </div>
    </div>`;
  prepareImage(`청모장소-${S.st}`);
  document.getElementById("save").onclick = saveCard;
  document.getElementById("copyAll").onclick = () => copyText(allText(list));
  app.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copyText(placeText(list[+b.dataset.copy]), b));
  app.querySelectorAll("[data-who]").forEach(b => b.onclick = () => { S.who = b.dataset.who; result(); });
  app.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { S.size = b.dataset.size; result(); });
  document.getElementById("other").onclick = askStation;
  document.getElementById("home").onclick = home;
}

// ===== 문구 복사 =====
function placeText(p){
  return [`[청모 장소] ${p.name} (${p.cat})`, p.addr, p.exit, `전화 ${p.phone}`, `지도 ${mapUrl(p)}`].join("\n");
}
function allText(list){
  const L = [`[청모 장소 후보] ${S.st}역 · ${WHO[S.who].short} · ${sizeLabel(S.size)}`];
  list.forEach((p, i) => L.push("", `${i + 1}. ${p.name} (${p.cat})`, `${p.exit} · ${p.phone}`, mapUrl(p)));
  L.push("", `${DATA_DATE} 기준 정보예요. 예약할 때 한 번 더 확인해 주세요.`, "결혼식사회자 이상운 @wed_voice.su");
  return L.join("\n");
}
// btn이 있으면 그 버튼 글씨로 알려 주고, 없으면 아래 안내 줄(#msg)에 알려 줘요
async function copyText(value, btn){
  const msg = document.getElementById("msg"), manual = document.getElementById("manual");
  const done = "복사했어요. 카톡이나 문자에 붙여 넣으세요.";
  let ok = false;
  try{ await navigator.clipboard.writeText(value); ok = true; }
  catch(e){
    // 카톡·인스타 안에서 열면 클립보드가 막힐 때가 있어요 → 예전 방식으로 한 번 더
    const t = document.createElement("textarea");
    t.value = value; t.setAttribute("readonly", ""); t.className = "hiddenbox";
    document.body.appendChild(t); t.select();
    try{ ok = document.execCommand("copy"); }catch(_){}
    t.remove();
  }
  if(ok){
    manual.hidden = true;
    if(btn){ const old = btn.textContent; btn.textContent = "복사했어요"; btn.disabled = true; setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 1600); msg.textContent = ""; }
    else msg.textContent = done;
  }else{
    // 그래도 안 되면 문구를 보여 주고 길게 눌러 복사하게
    manual.value = value; manual.hidden = false;
    manual.rows = Math.min(14, value.split("\n").length + 1);
    msg.textContent = "아래 문구를 길게 눌러 복사해 주세요.";
    manual.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>서울 ${COVERED.length}개 역</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>청모 장소,<br>또 찾아요?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom", "go", `<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  home();
}
route();
