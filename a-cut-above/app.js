// 신랑 헤어 미용실 찾기 ㉚: 결혼식 날짜(+ 웨딩촬영) → 미용실 가는 간격 → 역 → 언제 가야 하는지 + 웨딩 후기 있는 미용실
// 문구 text.js · 미용실 · 역 데이터 data.js · 공통 기능 shared/common.js · 기록 docs/신랑-헤어/이어서-할-일.md
// 날짜 셈 (사회자님 11/16): 새 미용실 첫 방문 = 평소 간격 × 2 전 (6주 이상 → 12주, 잘 모름 → 8주) · 마지막 커트 · 다운펌 = 7일 전
// 고른 답은 어디에도 저장하지 않아요. "신랑한테 보내기" 링크 주소(#w=…) 안에만 담겨요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/a-cut-above/?preview)
const OPEN = false;
// =========================================================

const S = { w: "", sh: false, s: "", c: null, st: null };
let GOT = false;   // 받은 링크로 열었는지 (결과 위에 한 줄 안내)
let EDIT = false;  // 결과에서 "바꾸기"로 들어왔는지 (그러면 역은 다시 안 물어요)
const STN = new Map(STATIONS.map(s => [s[0], s]));
const COVERED = REGIONS.flatMap(r => r.st);
const CYCLES = ["2", "3", "4", "5", "6", "0"];
const WD = ["일", "월", "화", "수", "목", "금", "토"];

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");

// ===== 날짜 =====
function today(){ const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function iso(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parse(v){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  if(!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
}
function addDays(d, n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function days(a, b){ return Math.round((b - a) / 86400000); }
// "12월 1일 (화)" — 올해가 아니면 앞에 연도, withYear면 늘 연도
function fmtD(d, withYear){
  const y = withYear || d.getFullYear() !== today().getFullYear();
  return (y ? d.getFullYear() + "년 " : "") + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + WD[d.getDay()] + ")";
}
function fmtShort(d){
  return (d.getFullYear() !== today().getFullYear() ? d.getFullYear() + "년 " : "") + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
}

// ===== 일정 셈 =====
function weeksBefore(c){ return c === "6" ? 12 : c === "0" ? 8 : 2 * Number(c); }
function plan(){
  const t = today(), wed = parse(S.w), shoot = S.sh ? parse(S.s) : null;
  const ev = [];
  if(S.sh) ev.push({ k: "shoot", d: shoot, name: T.evShoot, cut: T.cutShoot });
  ev.push({ k: "wed", d: wed, name: T.evWed, cut: T.cutWed });
  // 둘 다 날짜가 있으면 이른 순서로 (날짜 모르는 촬영은 본식보다 앞이라고 봐요)
  if(ev.length === 2 && ev[0].d && ev[1].d && ev[0].d > ev[1].d) ev.reverse();
  const w = weeksBefore(S.c);
  const first = { w, ev: ev[0], d: null, now: false };
  if(ev[0].d){ first.d = addDays(ev[0].d, -7 * w); first.now = first.d <= t; }
  const cuts = ev.map(e => {
    const o = { t: e.cut, ev: e, d: null, now: false };
    if(e.d){ o.d = addDays(e.d, -7); o.now = o.d < t; }
    return o;
  });
  return { wed, shoot, first, cuts, dday: wed ? days(t, wed) : null };
}
function firstBig(P){
  const f = P.first;
  if(!f.d) return fm(T.firstBigRel, { ev: f.ev.name, w: f.w });
  return f.now ? T.firstBigNow : fm(T.firstBig, { d: fmtD(f.d) });
}
// 큰 날짜는 "까지"만 따로 줄이 바뀌지 않게: 연도 뒤 · 요일 앞에서만 줄이 바뀌어요
function bigHtml(P){
  const s = esc(firstBig(P));
  return P.first.d && !P.first.now ? s.replace(/ (?!\d{1,2}월|\()/g, "&nbsp;") : s;
}
function firstWhy(P){
  if(P.first.now) return fm(T.firstWhyNow, { w: P.first.w });
  if(S.c === "6") return T.firstWhy6;
  if(S.c === "0") return T.firstWhy0;
  return fm(T.firstWhy, { c: T.cycle[S.c], w: P.first.w });
}
function cutWhen(o){
  if(!o.d) return fm(T.cutRel, { ev: o.ev.name });
  return o.now ? T.cutNow : fm(T.cutWhen, { d: fmtD(o.d) });
}

// ===== 역 =====
function lineLabel(raw){
  const parts = String(raw || "").split("·").filter(Boolean);
  const nums = parts.filter(p => /^\d+$/.test(p)), others = parts.filter(p => !/^\d+$/.test(p));
  return [nums.length ? nums.join("·") + "호선" : "", ...others].filter(Boolean).join(" · ");
}
function lineOf(name){ const s = STN.get(name); return s ? lineLabel(s[1]) : ""; }
function countAt(name){ return SALONS.filter(x => x.st === name).length; }
function km(a, b){
  const r = x => x * Math.PI / 180, dLat = r(b[2] - a[2]), dLng = r(b[3] - a[3]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[2])) * Math.cos(r(b[2])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function norm(s){ return String(s).replace(/\s+/g, "").replace(/역$/, ""); }

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
function go(sc, arg){ history.pushState({ sc, arg }, ""); render(sc, arg); }
function render(sc, arg){ ({ home, dates, cycle, station, near, result })[sc](arg); }
window.addEventListener("popstate", e => { const st = e.state || { sc: "home" }; render(st.sc, st.arg); });

function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function topCount(i){ return `<div class="top"><span>${esc(T.name)}</span><span class="count">${pad(i)} / ${pad(3)}</span></div>`; }
function under(back){ return `<div class="under"><button class="text-btn" id="back">${esc(back || T.back)}</button><button class="text-btn" id="home">${esc(T.home)}</button></div>`; }
function bindUnder(){ $("#back").onclick = () => history.back(); $("#home").onclick = () => go("home"); }

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>서울 ${COVERED.length}개 역</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      <button id="start"><span>${esc(T.start)}</span><span class="q">${esc(T.startQ)}</span></button>
    </div>
    <p class="note strong">${esc(T.forBride)}</p>
    <p class="note">※ ${esc(fm(T.safe, { date: DATA_DATE }))}</p>
    ${foot()}`;
  $("#start").onclick = () => { EDIT = false; GOT = false; go("dates"); };
}

// ===== 질문 1 · 날짜 =====
function dates(){
  plain();
  const min = iso(addDays(today(), 1));
  app.innerHTML = `
    ${topCount(1)}
    <h2 class="question">${esc(T.q1)}</h2>
    <p class="lead2">${esc(T.q1Lead)}</p>
    <div class="form">
      <label class="fl" for="w">${esc(T.wedLabel)}</label>
      <input class="in date" id="w" type="date" min="${min}" value="${esc(S.w)}">
      <p class="help">${esc(T.wedHelp)}</p>
      <label class="tog"><input type="checkbox" id="sh"${S.sh ? " checked" : ""}><span>${esc(T.shootToggle)}</span></label>
      <div class="shoot" id="shootBox"${S.sh ? "" : " hidden"}>
        <label class="fl" for="s">${esc(T.shootLabel)}</label>
        <input class="in date" id="s" type="date" min="${min}" value="${esc(S.s)}">
        <p class="help">${esc(T.shootHelp)}</p>
      </div>
      <p class="err" id="err" role="alert"></p>
    </div>
    <button class="btn main next" id="next">${esc(T.next)}</button>
    ${under()}
    ${foot()}`;
  const err = (text, sel) => { $("#err").textContent = text; $$(".in").forEach(x => x.classList.remove("bad")); if(sel){ $(sel).classList.add("bad"); $(sel).focus(); } };
  $("#sh").onchange = e => { $("#shootBox").hidden = !e.target.checked; err(""); };
  $$(".in").forEach(x => x.addEventListener("input", () => err("")));
  $("#next").onclick = () => {
    const w = $("#w").value, sh = $("#sh").checked, s = sh ? $("#s").value : "";
    const t = today(), wd = parse(w), sd = parse(s);
    if(w && (!wd || wd <= t)) return err(T.errWedPast, "#w");
    if(sh && s && (!sd || sd <= t)) return err(T.errShootPast, "#s");
    S.w = wd ? w : ""; S.sh = sh; S.s = sd ? s : "";
    go("cycle");
  };
  bindUnder();
}

// ===== 질문 2 · 미용실 가는 간격 =====
function cycle(){
  plain();
  app.innerHTML = `
    ${topCount(2)}
    <h2 class="question">${esc(T.q2)}</h2>
    <p class="lead2">${esc(T.q2Lead)}</p>
    <div class="cycles" role="group" aria-label="미용실 가는 간격">
      ${CYCLES.map(c => `<button class="cy${S.c === c ? " on" : ""}" data-c="${c}" aria-pressed="${S.c === c}"><b>${esc(T.cycle[c])}</b>${T.cycleSub[c] ? `<small>${esc(T.cycleSub[c])}</small>` : ""}</button>`).join("")}
    </div>
    ${under()}
    ${foot()}`;
  $$(".cy").forEach(b => b.onclick = () => {
    if(app.dataset.lock) return; app.dataset.lock = "1";
    $$(".cy").forEach(x => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
    b.classList.add("on"); b.setAttribute("aria-pressed", "true");
    S.c = b.dataset.c;
    setTimeout(() => { delete app.dataset.lock; go(EDIT && S.st ? "result" : "station"); }, reduce ? 60 : 240);
  });
  bindUnder();
}

// ===== 질문 3 · 역 =====
function station(){
  plain();
  app.innerHTML = `
    ${topCount(3)}
    <h2 class="question">${esc(T.q3)}</h2>
    <p class="lead2">${esc(fm(T.q3Lead, { n: COVERED.length }))}</p>
    <div class="regions">
      ${REGIONS.map(r => `<div class="reg"><p class="reg-n">${esc(r.name)}</p><div class="stations">${r.st.map(n => `<button class="stn${S.st === n ? " on" : ""}" data-st="${esc(n)}" aria-label="${esc(n)}역 · ${esc(lineOf(n))} · 미용실 ${countAt(n)}곳"><b>${esc(n)}</b><small>${esc(fm(T.salonCount, { n: countAt(n) }))}</small></button>`).join("")}</div></div>`).join("")}
    </div>
    <div class="find">
      <label class="lbl" for="q">${esc(T.findLabel)}</label>
      <input class="in" id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="${esc(T.findPh)}" autocomplete="off">
      <div class="hits" id="hits"></div>
    </div>
    ${under()}
    ${foot()}`;
  $$(".stn").forEach(b => b.onclick = () => { b.classList.add("on"); pick(b.dataset.st); });
  const q = $("#q");
  q.oninput = () => paintHits(q.value);
  q.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); const first = $("#hits .hit"); if(first) first.click(); } };
  bindUnder();
}
function paintHits(v){
  const box = $("#hits"), q = norm(v);
  if(!q){ box.innerHTML = ""; return; }
  const hits = STATIONS.filter(s => s[0].includes(q))
    .sort((a, b) => (b[0].startsWith(q) - a[0].startsWith(q)) || (a[0].length - b[0].length) || a[0].localeCompare(b[0], "ko"))
    .slice(0, 6);
  box.innerHTML = hits.length
    ? hits.map(s => `<button class="hit" data-st="${esc(s[0])}"><span class="hn"><b>${esc(s[0])}</b><small>${esc(lineLabel(s[1]))}</small></span><span class="go2">${esc(COVERED.includes(s[0]) ? T.hitGo : T.hitNear)}</span></button>`).join("")
    : `<p class="none">${esc(T.hitNone)}</p>`;
  $$(".hit", box).forEach(b => b.onclick = () => pick(b.dataset.st));
}
function pick(name){
  if(COVERED.includes(name)){ S.st = name; reveal(T.reveal, () => go("result")); }
  else go("near", name);
}

// ===== 미용실이 없는 역 → 가까운 역 =====
function near(name){
  plain();
  const from = STN.get(name);
  if(!from){ station(); return; }
  const list = COVERED.map(n => ({ n, d: km(from, STN.get(n)) })).sort((a, b) => a.d - b.d).slice(0, 3);
  app.innerHTML = `
    ${topCount(3)}
    <h2 class="title">${br(fm(T.nearTitle, { st: name }))}</h2>
    <p class="lead2">${esc(fm(T.nearLead, { n: COVERED.length }))}</p>
    <div class="near">
      ${list.map(x => `<button class="nearbtn" data-st="${esc(x.n)}"><span class="hn"><b>${esc(x.n)}역</b><small>${esc(lineOf(x.n))} · 미용실 ${countAt(x.n)}곳</small></span><span class="km">${esc(fm(T.nearKm, { km: x.d < 10 ? x.d.toFixed(1) : Math.round(x.d) }))}</span></button>`).join("")}
    </div>
    ${under(T.otherSt)}
    ${foot()}`;
  $$(".nearbtn").forEach(b => b.onclick = () => pick(b.dataset.st));
  bindUnder();
}

// ===== 결과 =====
function mapUrl(p){ return "https://place.map.kakao.com/" + encodeURIComponent(p.kakao); }
function naverUrl(p){ const a = p.addr.split(/\s+/); return "https://map.naver.com/p/search/" + encodeURIComponent(p.name + " " + a.slice(1, 3).join(" ")); }
function telUrl(p){ return "tel:" + p.phone.replace(/[^\d+]/g, ""); }
function condText(P){
  const L = [S.w ? fm(T.condWed, { d: fmtShort(P.wed) }) : T.condWedNone];
  if(S.sh) L.push(S.s ? fm(T.condShoot, { d: fmtShort(P.shoot) }) : T.condShootNone);
  L.push(S.c === "0" ? T.condCycleNone : fm(T.condCycle, { c: T.cycle[S.c] }));
  return L.join(" · ");
}
function cutHtml(o){
  return `
        <div class="step">
          <b class="st-t">${esc(o.t)}</b>
          <span class="st-d">${esc(cutWhen(o))}</span>
          ${o.now ? `<p>${esc(fm(T.cutWhyNow, { ev: o.ev.name }))}</p>` : ""}
        </div>`;
}
function salonHtml(p, i){
  const hours = p.hours + (p.off ? " · " + fm(T.offDay, { d: p.off }) : "");
  const notes = [];
  if(!p.phone && !/전화/.test(p.warn.join(" "))) notes.push(T.noPhone);
  notes.push(...p.warn);
  const src = p.src.map(s => s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>` : `<span>${esc(s.t)}</span>`).join("");
  return `
        <section class="place">
          <div class="p-head"><span class="p-n">${i + 1}</span><span class="p-t"><span class="p-cat">${esc(p.kind)}</span><b class="p-name">${esc(p.name)}</b></span></div>
          <p class="p-why">${esc(p.why)}</p>
          <dl class="facts">
            <div><dt>${esc(T.fWhere)}</dt><dd>${esc(p.exit)}<span class="sm">${esc(p.addr)}</span></dd></div>
            <div><dt>${esc(T.fHours)}</dt><dd>${esc(hours)}</dd></div>
            ${p.phone ? `<div><dt>${esc(T.fPhone)}</dt><dd>${esc(p.phone)}</dd></div>` : ""}
            <div><dt>${esc(T.fSrc)}</dt><dd class="src">${src}</dd></div>
          </dl>
          ${notes.length ? `<ul class="p-notes">${notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          <div class="p-act${p.phone && p.insta ? " four" : ""}" data-html2canvas-ignore>
            ${p.phone ? `<a class="pa call" href="${esc(telUrl(p))}">${esc(T.aCall)}</a>` : ""}
            <a class="pa" href="${esc(mapUrl(p))}" target="_blank" rel="noopener">${esc(T.aKakao)}</a>
            <a class="pa" href="${esc(naverUrl(p))}" target="_blank" rel="noopener">${esc(T.aNaver)}</a>
            ${p.insta ? `<a class="pa" href="${esc(p.insta)}" target="_blank" rel="noopener">${esc(T.aInsta)}</a>` : ""}
          </div>
        </section>`;
}
function vendorsHtml(){
  return `
    <section class="vend" aria-labelledby="vt">
      <h3 id="vt">${esc(T.vTitle)}</h3>
      <p class="v-lead">${esc(T.vLead)}</p>
      ${VENDORS.map(v => `
      <div class="v">
        <div class="v-t"><b>${esc(v.name)}</b><small>${esc(v.en)}</small></div>
        <p>${esc(v.line)}</p>
        <div class="p-act">
          <a class="pa call" href="${esc(v.insta)}" target="_blank" rel="noopener">${esc(T.aInsta)}</a>
          ${v.review ? `<a class="pa" href="${esc(v.review)}" target="_blank" rel="noopener">${esc(T.vReview)}</a>` : ""}
        </div>
      </div>`).join("")}
      <ul class="p-notes"><li>${esc(T.vNoteBride)}</li><li>${esc(T.vNotePrice)}</li></ul>
    </section>`;
}
function result(){
  if(!S.st || !COVERED.includes(S.st) || !CYCLES.includes(S.c)){ home(); return; }
  plain();
  const P = plan(), list = SALONS.filter(x => x.st === S.st);
  const showV = S.sh || !S.w;   // 웨딩촬영이 남았거나, 날짜를 몰라서 촬영 여부도 모를 때
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(S.st)}역</span></div>
    ${GOT ? `<p class="got">${esc(T.got)}</p>` : ""}
    <div class="conds"><span>${esc(condText(P))}</span><button class="text-btn" id="chg">${esc(T.change)}</button></div>
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(T.resKind)}</span><span class="handle">@wed_voice.su</span></div>
      ${P.dday != null ? `<p class="dday">${esc(fm(T.dday, { d: fmtD(P.wed), n: P.dday }))}</p>` : ""}
      <p class="first-k">${esc(T.firstKicker)}</p>
      <h2 class="first-big${P.first.now ? " now" : ""}">${bigHtml(P)}</h2>
      <p class="first-why">${esc(firstWhy(P))}</p>
      <section class="steps">
        <h3 class="sec-t">${esc(T.nextTitle)}</h3>
        ${P.cuts.map(cutHtml).join("")}
        <p class="step-note">${esc(T.cutWhy)}</p>
      </section>
      <section class="tips">
        <h3 class="sec-t">${esc(T.tipsTitle)}</h3>
        <div class="tip-row"><b>${esc(T.lenT)}</b><p>${esc(T.lenWhy)}</p></div>
        <div class="tip-row"><b>${esc(T.permT)}</b><p>${esc(T.permWhy)}</p></div>
      </section>
      <section class="salons">
        <h3 class="sec-big">${esc(fm(T.salonsTitle, { st: S.st }))}</h3>
        <p class="sec-sub">${esc(T.salonsSub)}</p>
        ${list.map(salonHtml).join("")}
      </section>
      <p class="card-foot">${esc(fm(T.cardFoot, { date: DATA_DATE }))}</p>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">${esc(T.hint)}</p>
      <div class="btns">
        <button class="btn main" id="send">${esc(T.send)}</button>
        <button class="btn ghost" id="save">${esc(T.save)}</button>
        <button class="btn ghost" id="copy">${esc(T.copy)}</button>
        <p class="msg" id="msg" role="status"></p>
        <textarea class="in manual" id="manual" readonly hidden></textarea>
      </div>
    </div>
    ${showV ? vendorsHtml() : ""}
    <div class="btns more">
      <button class="btn ghost" id="other">${esc(T.otherSt)}</button>
      <button class="btn ghost" id="chg2">${esc(T.changeAll)}</button>
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.insta)}</a>
      <button class="text-btn btn-link" id="home">${esc(T.home)}</button>
    </div>
    ${foot()}`;
  prepareImage("신랑헤어-" + S.st);
  $("#save").onclick = saveCard;
  $("#send").onclick = () => sendToGroom(P);
  $("#copy").onclick = () => copyText(allText(P, list), T.copied);
  const change = () => { EDIT = true; GOT = false; go("dates"); };
  $("#chg").onclick = change;
  $("#chg2").onclick = change;
  $("#other").onclick = () => { GOT = false; go("station"); };
  $("#home").onclick = () => go("home");
}

// ===== 보내기 · 복사 =====
// 받은 사람이 열면 같은 일정이 바로 보이는 링크 (공개 전에는 ?preview 를 붙여요)
function shareUrl(){
  const h = new URLSearchParams();
  if(S.w) h.set("w", S.w);
  if(S.sh) h.set("sh", "1");
  if(S.sh && S.s) h.set("s", S.s);
  h.set("c", S.c); h.set("st", S.st);
  return location.origin + location.pathname + (OPEN ? "" : "?preview") + "#" + h.toString();
}
function readHash(){
  const h = new URLSearchParams(location.hash.slice(1));
  const st = h.get("st"), c = h.get("c");
  if(!st || !COVERED.includes(st) || !CYCLES.includes(c)) return false;
  const t = today(), w = parse(h.get("w")), s = parse(h.get("s"));
  S.w = w && w > t ? h.get("w") : "";
  S.sh = h.get("sh") === "1";
  S.s = S.sh && s && s > t ? h.get("s") : "";
  S.c = c; S.st = st;
  return true;
}
async function sendToGroom(P){
  const url = shareUrl();
  const text = P.first.d && !P.first.now ? fm(T.sendText, { first: fmtD(P.first.d) + "까지" }) : T.sendTextRel;
  if(navigator.share){
    try { await navigator.share({ text, url }); $("#msg").textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ $("#msg").textContent = ""; return; } }
  }
  copyText(text + "\n" + url, T.sendCopied);
}
function allText(P, list){
  const L = [T.textHead];
  const when = [S.w ? T.evWed + " " + fmtD(P.wed, true) : T.condWedNone];
  if(S.sh) when.push(S.s ? "웨딩촬영 " + fmtD(P.shoot, true) : T.condShootNone);
  L.push(when.join(" / "), "");
  L.push(fm(T.textFirst, { v: firstBig(P) }));
  P.cuts.forEach(o => L.push(fm(T.textCut, { t: o.t, v: cutWhen(o) })));
  L.push(T.textPerm, "", fm(T.textSalons, { st: S.st }));
  list.forEach((p, i) => L.push(`${i + 1}. ${p.name} (${p.kind})`, `   ${p.exit}${p.phone ? " · " + p.phone : ""}`, `   ${mapUrl(p)}`));
  L.push("", `${T.textLink}: ${shareUrl()}`, T.textSign);
  return L.join("\n");
}
// 카톡 · 인스타 안에서는 클립보드가 막힐 때가 있어요 → 예전 방식 → 그래도 안 되면 글을 보여 주고 길게 눌러 복사
async function copyText(value, done){
  const msg = $("#msg"), manual = $("#manual");
  let ok = false;
  try { await navigator.clipboard.writeText(value); ok = true; }
  catch(e){
    const t = document.createElement("textarea");
    t.value = value; t.setAttribute("readonly", ""); t.className = "hiddenbox";
    document.body.appendChild(t); t.select();
    try { ok = document.execCommand("copy"); } catch(_){}
    t.remove();
  }
  if(ok){ manual.hidden = true; msg.textContent = done; return; }
  manual.value = value; manual.hidden = false;
  manual.rows = Math.min(14, value.split("\n").length + 1);
  msg.textContent = T.manual;
  manual.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>서울 ${COVERED.length}개 역</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.soonFor)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.soonLead)}</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">${esc(T.soonInsta)}</a>
      ${siteLink("groom", "go", `<span>${esc(T.soonOther)}</span>`)}
    </div>
    ${foot()}`;
}

function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  const got = readHash();
  history.replaceState({ sc: "home" }, "", location.pathname + location.search);
  if(got){ GOT = true; history.pushState({ sc: "result" }, ""); render("result"); return; }
  render("home");
}
route();
