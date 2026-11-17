// 본식 가방 체크리스트 ㊼: 우리 식 조건 → 신부 · 신랑 · 가방순이 · 양가 부모님 · 축의대 가방 목록 (사람마다 보내기)
// 기획 docs/사이트-아이디어.md ㊼ · 조사 docs/본식-가방/조사/ · 데이터 data.js (docs/본식-가방/도구/build.py로 만듦) · 공통 기능 shared/common.js
// 체크 표시는 이 폰(브라우저)에만 저장해요. 어디로도 보내지 않아요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/in-the-bag/?preview)
const OPEN = false;
// =========================================================

// ===== 화면 문구 (문구를 바꾸려면 여기만 고치면 돼요) =====
const NAME = "본식 가방 체크리스트";
const KEY = "in-the-bag.v1";          // 내 목록 (조건 · 체크 · 고친 것)
const KEY_GOT = "in-the-bag.got.v1";  // 받은 목록 체크 (링크로 받은 가방순이 · 부모님 폰)
const PRIVACY = "체크 표시는 이 폰에만 저장되고 어디로도 보내지 않아요.";
const NOTICE = [
  `${BAG.checked}에 먼저 결혼한 신부 · 신랑, 가방순이 · 축의대를 맡았던 분들의 후기 ${BAG.nSrc}곳(네이버 블로그를 중심으로 브런치 · 커뮤니티 글까지)을 읽고 모았어요.`,
  "물건마다 i를 누르면 그 물건을 챙기라고 쓴 후기를 볼 수 있어요. 광고 · 협찬 · 업체 글은 세지 않았어요.",
  "웨딩홀 · 메이크업샵 · 드레스샵마다 챙겨 주는 것이 달라요. 샵 · 홀에서 받은 안내가 있으면 그게 먼저예요.",
  "목록은 고쳐 쓸 수 있어요. ‘목록 고치기’로 빼고 더하세요."
];
// 꼬리표: 놓치기 쉬움(후기에 "빠뜨려서 아쉬웠다" 이야기가 있는 것) · 꿀팁(흔한 목록엔 잘 없는 것)
function badge(x){ return x.oops ? "oops" : x.kind === "tip" ? "tip" : ""; }
const BADGE = { oops: "놓치기 쉬움", tip: "꿀팁" };
const isHl = x => !!badge(x);

// ===== 저장 =====
function load(k){ try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function saveGot(){ try { localStorage.setItem(KEY_GOT, JSON.stringify(G)); } catch (e) {} }
const S = Object.assign({ made: false, o: {}, season: "", checks: {}, removed: [], custom: [], ui: { tab: BAG.people[0].k, tip: false, hide: false } }, load(KEY));
S.ui = Object.assign({ tab: BAG.people[0].k, tip: false, hide: false }, S.ui || {});
const G = Object.assign({}, load(KEY_GOT));   // { "<받은 목록 열쇠>": { checks: {} } }
let draft = null;      // 고르는 중인 조건
let editing = false;
let got = null;        // 링크로 받은 목록 { p, o, season, rm, add, key }

// ===== 작은 도구 =====
const P = k => BAG.people.find(x => x.k === k);
const W = k => BAG.when.find(x => x[0] === k);
function plain(){ document.body.classList.remove("is-cover"); app.className = "wrap"; window.scrollTo(0, 0); }
function chk(on){ return `<span class="cb${on ? " on" : ""}" aria-hidden="true">${CHECK}</span>`; }
function toast(text){
  let el = document.getElementById("toast");
  if(!el){ el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = text; el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600);
}
// 조건 맞추기: c = ["pyebaek", "!trip", "mild|winter"] → 모두 맞아야 보여요 ("a|b"는 둘 중 하나)
function condOne(k, o, season){
  const neg = k[0] === "!", key = neg ? k.slice(1) : k;
  const on = key.split("|").some(x => BAG.seasons.some(s => s[0] === x) ? season === x : !!o[x]);
  return neg ? !on : on;
}
function condOk(c, o, season){ return !c || c.every(k => condOne(k, o, season)); }
// 조건 줄 — 남에게 보일 땐(p) 그 사람 몫이 아닌 개인 조건(생리 등)은 빼요
function condText(o, season, p){
  const a = BAG.conds.filter(c => o[c.k] && !(c.private && p && !c.private.includes(p))).map(c => c.short || c.t);
  const s = BAG.seasons.find(x => x[0] === season);
  if(s) a.push(s[1]);
  return a.join(" · ") || "기본";
}

// 지금 보여 줄 목록: 조건에 맞는 것 − 뺀 것 + 직접 더한 것
function listOf(p, o, season, removed, custom){
  const rm = new Set(removed || []);
  const base = BAG.items.filter(x => x.p === p && condOk(x.c, o, season));
  const mine = (custom || []).filter(c => c.p === p).map(c => ({ id: c.id, p, w: c.w, name: c.name, custom: true }));
  return { items: base.filter(x => !rm.has(x.id)).concat(mine), gone: base.filter(x => rm.has(x.id)) };
}
function skipOf(p, o, season){ return (BAG.skip || []).filter(x => x.p === p && condOk(x.c, o, season)); }
function mine(p){ return listOf(p, S.o, S.season, S.removed, S.custom); }

// ===== 화면 이동 (휴대폰 뒤로 가기 = 이전 단계) =====
if("scrollRestoration" in history) history.scrollRestoration = "manual";
const SCREENS = { home: () => home(), conds: () => stepConds(), result: () => result(), got: () => gotView() };
function show(sc){
  closeSheet();
  if(!SCREENS[sc]) sc = "home";
  if(sc === "conds" && !draft) draft = { o: Object.assign({}, S.o), season: S.season || "" };
  if(sc === "result" && !S.made) sc = "home";
  if(sc === "got" && !got) sc = "home";
  SCREENS[sc]();
}
function go(sc, how){
  const st = { sc, back: how !== "replace" };
  how === "replace" ? history.replaceState(st, "") : history.pushState(st, "");
  show(sc);
}
function goBack(prev){ if(history.state && history.state.back) history.back(); else go(prev, "replace"); }
let skipPop = false;
window.addEventListener("popstate", e => {
  const st = e.state;
  if(skipPop){ skipPop = false; return; }
  if(document.getElementById("sheet")){ closeSheet(); return; }
  if(st && st.sheet){ skipPop = true; history.back(); return; }
  if(st && st.sc) show(st.sc);
});

// ===== 설명 창 (아래에서 올라오는 시트) =====
function openSheet(html, label){
  const had = !!document.getElementById("sheet");
  closeSheet();
  const tt = document.getElementById("toast"); if(tt) tt.classList.remove("on");
  if(!had) history.pushState(Object.assign({}, history.state, { sheet: true }), "");
  const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.id = "sheetBg";
  const sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet";
  sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", label || "설명");
  sh.innerHTML = html + `<div class="sheet-x"><button class="btn ghost" id="sheetX">닫기</button></div>`;
  document.body.appendChild(bg); document.body.appendChild(sh);
  bg.onclick = dismissSheet; document.getElementById("sheetX").onclick = dismissSheet;
  sh.scrollTop = 0;
  document.getElementById("sheetX").focus({ preventScroll: true });
}
function closeSheet(){ ["sheet", "sheetBg"].forEach(id => { const e = document.getElementById(id); if(e) e.remove(); }); }
function dismissSheet(){ if(history.state && history.state.sheet) history.back(); else closeSheet(); }
document.addEventListener("keydown", e => { if(e.key === "Escape" && document.getElementById("sheet")) dismissSheet(); });
function srcHtml(keys){
  const list = (keys || []).map(k => BAG.src[k]).filter(Boolean);
  if(!list.length) return "";
  return `<p class="src-h">이렇게 쓴 후기 ${list.length}곳</p><ul class="src">${list.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.d ? ` <span class="sdate">${esc(s.d)}</span>` : ""}${s.where ? ` <span class="grade">${esc(s.where)}</span>` : ""}</li>`).join("")}</ul>`;
}
function itemSheet(x){
  const per = P(x.p), wn = W(x.w);
  openSheet(`<h3>${esc(x.name)}</h3>
    <p class="sh-meta">${esc(per ? per.t : "")}${wn ? ` · ${esc(wn[1])}` : ""}${x.qty ? ` · ${esc(x.qty)}` : ""}</p>
    ${x.why ? `<p>${esc(x.why)}</p>` : ""}
    ${x.mc ? `<div class="mc-box"><b>사회자 기준</b><p>${esc(x.mc)}</p></div>` : ""}
    ${x.oops ? `<div class="oops-box"><b>놓치기 쉬워요</b><p>${esc(x.oops)}</p></div>` : ""}
    ${x.kind === "tip" && !x.oops ? `<p class="stamp">흔한 준비물 목록엔 잘 없지만, 먼저 해 본 사람들이 “챙기길 · 해 두길 잘했다”고 한 거예요.</p>` : ""}
    ${srcHtml(x.s)}`, x.name);
}
function openNotice(){
  openSheet(`<h3>이 목록은 이렇게 만들었어요</h3>${NOTICE.map(p => `<p>${esc(p)}</p>`).join("")}
    <p class="src-h">읽은 후기 모두 보기</p>
    <details class="fold in-sheet"><summary>후기 ${Object.keys(BAG.src).length}곳 펼치기</summary>${srcHtml(Object.keys(BAG.src)).replace(/<p class="src-h">.*?<\/p>/, "")}</details>`, "이 목록은 이렇게 만들었어요");
}

// ===== 첫 화면 =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover"; window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>후기 ${BAG.nSrc}곳에서</span></div>
    ${brandLogo()}
    <p class="for">결혼식 전날 밤, 가방 싸는 두 분을 위한</p>
    <h1>본식 가방,<br>다 쌌어요?</h1>
    <div class="bar"></div>
    <p class="lead">우리 식 조건만 고르면 신부 · 신랑 · 가방순이 · 양가 부모님 가방을 나눠 드려요. 먼저 해 본 신부들이 “챙길 걸” 한 꿀팁까지 넣었어요.</p>
    <div class="pick">
      ${S.made ? `<button id="resume"><span>이어서 보기</span><span class="q">${esc(condText(S.o, S.season))}</span></button>` : ""}
      <button id="start"><span>${S.made ? "조건 다시 고르기" : "가방 목록 만들기"}</span><span class="q">30초</span></button>
    </div>
    <p class="note">${PRIVACY}</p>
    ${foot()}`;
  document.getElementById("start").onclick = () => { draft = { o: Object.assign({}, S.o), season: S.season || "" }; go("conds"); };
  const r = document.getElementById("resume"); if(r) r.onclick = () => go("result");
}

// ===== 조건 고르기 (한 화면) =====
function stepConds(){
  plain();
  const draw = () => {
    app.innerHTML = `<div class="top"><button class="text-btn back" id="back" aria-label="첫 화면으로">← 이전</button><span class="count">조건 고르기</span></div>
      <h2 class="q-title">우리 결혼식에 해당하는 걸<br>모두 골라 주세요</h2>
      <p class="q-sub">고른 것에 맞는 물건만 넣어요. 없으면 그냥 넘어가도 돼요.</p>
      <div class="list">${BAG.conds.map(c => { const on = !!draft.o[c.k]; return `<button class="row-btn${on ? " on" : ""}" data-o="${c.k}" role="checkbox" aria-checked="${on}">${chk(on)}<span class="rb-t"><b>${esc(c.t)}</b><span>${esc(c.d)}</span></span></button>`; }).join("")}</div>
      <div class="panel season">
        <p class="lbl">결혼식 계절</p>
        <div class="seg">${BAG.seasons.map(([k, t]) => `<button class="sg${draft.season === k ? " on" : ""}" data-s="${k}" aria-pressed="${draft.season === k}">${esc(t)}</button>`).join("")}</div>
        <p class="lbl-sub">${esc(BAG.seasonNote || "")}</p>
      </div>
      <div class="btns sticky-go"><button class="btn main" id="make">가방 목록 만들기</button></div>`;
    document.getElementById("back").onclick = () => goBack("home");
    app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { draft.o[b.dataset.o] = !draft.o[b.dataset.o]; draw(); });
    app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { draft.season = draft.season === b.dataset.s ? "" : b.dataset.s; draw(); });
    document.getElementById("make").onclick = () => {
      const first = !S.made;
      S.o = draft.o; S.season = draft.season; S.made = true; save(); draft = null;
      history.pushState({ sc: "result", back: true }, "");
      if(first) reveal("가방 목록\n완성!", () => result()); else result();
    };
  };
  draw();
}

// ===== 결과 =====
function counts(p){ const { items } = mine(p); return { done: items.filter(x => S.checks[x.id]).length, all: items.length }; }
function tops(){
  // 맨 위 "놓치기 쉬운 것" — 목록.py의 hot 순서, 조건에 맞고 빼지 않은 것만 5개
  const rm = new Set(S.removed);
  return BAG.items.filter(x => x.hot && condOk(x.c, S.o, S.season) && !rm.has(x.id)).sort((a, b) => a.hot - b.hot).slice(0, 5);
}
function result(){
  if(!S.made){ home(); return; }
  plain();
  app.className = "wrap res";
  const t = tops();
  app.innerHTML = `
    <div class="rhead">
      <div class="rh-t"><p class="rh-kind">${NAME}</p><h2>우리 본식 가방</h2><p class="rh-sub">${esc(condText(S.o, S.season))}</p></div>
      <div class="rh-act"><button class="chip-btn" id="edit">조건 바꾸기</button></div>
    </div>
    <button class="notice" id="notice"><b>후기 ${BAG.nSrc}곳</b><span>먼저 해 본 신부 · 신랑 · 가방순이 후기로 만들었어요</span><span class="ar" aria-hidden="true">›</span></button>
    ${t.length ? `<section class="hot" aria-label="놓치기 쉬운 것">
      <p class="hot-h">먼저 해 본 사람들이 놓쳐서 아쉬워한 것</p>
      <ol class="hot-l">${t.map(x => `<li><button data-jump="${esc(x.id)}"><span class="hot-n">${esc(x.name)}</span><span class="hot-p">${esc(P(x.p).t)}</span></button></li>`).join("")}</ol>
    </section>` : ""}
    <p class="ptabs-h">누구 가방인지 고르세요 · 탭마다 그 사람에게 따로 보낼 수 있어요</p>
    <nav class="ptabs" id="ptabs" aria-label="누구 가방"></nav>
    <section class="sec" id="s-list"></section>
    <section class="sec end">
      <div class="btns">
        <button class="btn main" id="xlsx">엑셀로 저장하기</button>
        <button class="btn ghost" id="copyAll">전체 목록 글로 복사하기</button>
      </div>
      <p class="msg" id="msg" role="status"></p>
      ${BAG.mcEnd ? `<div class="tip"><b>사회자 한마디</b><p>${esc(BAG.mcEnd)}</p></div>` : ""}
      <p class="note small">${PRIVACY} 링크를 받은 사람도 같은 목록을 보고, 체크는 각자 폰에 따로 해요.</p>
      <p class="note small">※ 후기를 모은 참고용이에요. 웨딩홀 · 샵마다 챙겨 주는 것이 다르니, 받은 안내가 있으면 그걸 먼저 따르세요.</p>
      <button class="text-btn btn-link" id="restart">조건 다시 고르기</button>
      ${sign()}
    </section>
    ${foot()}`;
  document.getElementById("edit").onclick = () => { draft = { o: Object.assign({}, S.o), season: S.season }; go("conds"); };
  document.getElementById("restart").onclick = () => { draft = { o: Object.assign({}, S.o), season: S.season }; go("conds"); };
  document.getElementById("notice").onclick = openNotice;
  document.getElementById("xlsx").onclick = saveXlsx;
  document.getElementById("copyAll").onclick = () => copyText(allText(), "전체 목록을 복사했어요. 메모장이나 카톡에 붙여 넣으세요.");
  app.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => jumpTo(b.dataset.jump));
  if(!P(S.ui.tab)) S.ui.tab = BAG.people[0].k;
  drawTabs(); drawList();
}
function drawTabs(){
  const el = document.getElementById("ptabs"); if(!el) return;
  el.innerHTML = BAG.people.map(p => { const c = counts(p.k), on = S.ui.tab === p.k; return `<button class="pt${on ? " on" : ""}" data-p="${p.k}" aria-pressed="${on}"><b>${esc(p.t)}</b><span>${c.done}/${c.all}</span></button>`; }).join("");
  el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
    if(S.ui.tab === b.dataset.p) return;
    S.ui.tab = b.dataset.p; editing = false; save(); drawTabs(); drawList();
    const top = document.getElementById("ptabs").getBoundingClientRect().top + window.scrollY - 4;
    if(window.scrollY > top) window.scrollTo(0, top);
  });
  const on = el.querySelector(".pt.on"); if(on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function itemHtml(x, on){
  const b = badge(x);
  const tags = [x.need === "must" ? `<span class="need">꼭</span>` : "", b ? `<span class="kd k-${b}">${BADGE[b]}</span>` : "", x.mc ? `<span class="kd k-mc">사회자 기준</span>` : ""].join("");
  const sub = x.note ? `<span class="subs"><span class="wxn">${esc(x.note)}</span></span>` : "";
  return `<li class="it${on ? " on" : ""}${isHl(x) ? " hl" : ""}" data-id="${esc(x.id)}">
    <button class="it-main" role="checkbox" aria-checked="${on}">${chk(on)}
      <span class="it-t"><b>${esc(x.name)}</b>${x.qty ? `<span class="qty">${esc(x.qty)}</span>` : ""}${tags ? `<span class="tags">${tags}</span>` : ""}${sub}</span>
    </button>
    ${editing ? `<button class="it-x" data-rm aria-label="${esc(x.name)} 빼기">빼기</button>` : x.custom ? "" : `<button class="it-i" data-info aria-label="${esc(x.name)} 이유와 후기">i</button>`}
  </li>`;
}
function groupsHtml(items, checks, opt){
  const tip = opt.tip, hide = opt.hide, per = P(opt.p) || {};
  return BAG.when.map(([wk, wl, wd0]) => {
    const wd = (per.wd && per.wd[wk]) || wd0;
    const list = items.filter(x => x.w === wk && (!tip || isHl(x) || x.custom));
    if(!list.length && !(opt.edit && !tip)) return "";
    const shown = list.filter(x => !(hide && checks[x.id]));
    const done = list.filter(x => checks[x.id]).length;
    return `<div class="grp" data-w="${wk}">
      <div class="grp-h"><b>${esc(wl)}</b><span class="grp-n">${done} / ${list.length}</span></div>
      ${wd ? `<p class="grp-d">${esc(wd)}</p>` : ""}
      <ul class="items">${shown.map(x => itemHtml(x, !!checks[x.id])).join("")}
      ${!shown.length && list.length ? `<li class="all-done">다 챙겼어요 ✓</li>` : ""}</ul>
      ${opt.edit ? `<form class="add" data-add="${wk}"><input class="in" name="n" maxlength="40" placeholder="${esc(wl)}에 더하기" aria-label="${esc(wl)}에 더할 물건"><button class="btn small">더하기</button></form>` : ""}
    </div>`;
  }).join("");
}
function drawList(){
  const p = P(S.ui.tab), { items, gone } = mine(p.k), skip = skipOf(p.k, S.o, S.season);
  const el = document.getElementById("s-list"); if(!el) return;
  const mc = (BAG.mc || []).filter(m => m.p === p.k && condOk(m.c, S.o, S.season));
  el.innerHTML = `
    <div class="sec-h"><h3>${esc(p.title || p.t + " 가방")}</h3><button class="text-btn small" id="editList">${editing ? "다 고쳤어요" : "목록 고치기"}</button></div>
    ${p.lead ? `<p class="sec-lead">${esc(p.lead)}</p>` : ""}
    <div class="sendbar${p.self ? " self" : ""}">
      <button class="btn ${p.self ? "ghost" : "main"} send" id="send">${esc(p.send)}</button>
      <button class="btn ghost send2" id="copyOne">글로 복사</button>
    </div>
    <div class="filters">
      <div class="seg"><button class="sg${!S.ui.tip ? " on" : ""}" data-tip="0" aria-pressed="${!S.ui.tip}">전체 ${items.length}</button><button class="sg${S.ui.tip ? " on" : ""}" data-tip="1" aria-pressed="${!!S.ui.tip}">꿀팁 · 놓치기 쉬운 것 ${items.filter(isHl).length}</button></div>
      <label class="hide"><input type="checkbox" id="hideDone" ${S.ui.hide ? "checked" : ""}> 챙긴 것 숨기기</label>
    </div>
    <div id="groups">${groupsHtml(items, S.checks, { p: p.k, tip: S.ui.tip, hide: S.ui.hide, edit: editing })}</div>
    ${mc.map(m => `<div class="tip mc"><b>사회자 한마디</b><p>${esc(m.t)}</p></div>`).join("")}
    ${gone.length ? `<details class="fold removed"><summary>뺀 물건 ${gone.length}개</summary>
      <ul class="items">${gone.map(x => `<li class="it gone"><span class="it-t"><b>${esc(x.name)}</b></span><button class="text-btn small" data-back="${esc(x.id)}">되돌리기</button></li>`).join("")}</ul></details>` : ""}
    ${skip.length ? `<details class="fold skip"><summary>챙겼다가 “안 썼다”는 것 ${skip.length}개</summary>
      <p class="fold-lead">짐을 줄이고 싶으면 참고하세요. 사람마다 달라서 목록에서 빼지는 않았어요.</p>
      <ul class="skips">${skip.map((x, i) => `<li><button data-skip="${i}"><b>${esc(x.name)}</b><span>${esc(x.why || "")}</span></button></li>`).join("")}</ul></details>` : ""}`;
  // 이벤트
  document.getElementById("editList").onclick = () => { editing = !editing; drawList(); };
  const send = document.getElementById("send"); if(send) send.onclick = () => sendOne(p.k);
  document.getElementById("copyOne").onclick = () => copyText(oneText(p.k), `${p.t} 목록을 복사했어요. 카톡에 붙여 넣어 보내세요.`);
  el.querySelectorAll("[data-tip]").forEach(b => b.onclick = () => { S.ui.tip = b.dataset.tip === "1"; save(); drawList(); });
  document.getElementById("hideDone").onchange = e => { S.ui.hide = e.target.checked; save(); drawList(); };
  wireItems(el, items, S.checks, () => { save(); drawTabs(); }, S.ui.hide);
  el.querySelectorAll("[data-back]").forEach(b => b.onclick = () => { S.removed = S.removed.filter(x => x !== b.dataset.back); save(); drawList(); drawTabs(); });
  el.querySelectorAll("[data-skip]").forEach(b => b.onclick = () => {
    const x = skip[+b.dataset.skip];
    openSheet(`<h3>${esc(x.name)}</h3><p class="sh-meta">${esc(p.t)} · 챙겼다가 안 썼다는 후기</p>${x.why ? `<p>${esc(x.why)}</p>` : ""}<p class="stamp">사람마다 달라요. 필요하면 그대로 챙기세요.</p>${srcHtml(x.s)}`, x.name);
  });
  el.querySelectorAll("[data-add]").forEach(fm => fm.onsubmit = e => {
    e.preventDefault();
    const name = fm.n.value.trim(); if(!name) return;
    S.custom.push({ id: "u" + Date.now().toString(36), p: p.k, w: fm.dataset.add, name });
    save(); drawList(); drawTabs();
    const again = document.querySelector(`[data-add="${fm.dataset.add}"] input`); if(again) again.focus();
  });
}
// 체크 · i · 빼기 (내 목록과 받은 목록이 같이 써요)
function wireItems(root, items, checks, after, hide){
  root.querySelectorAll(".it[data-id]").forEach(li => {
    const id = li.dataset.id, x = items.find(i => i.id === id); if(!x) return;
    li.querySelector(".it-main").onclick = () => {
      checks[id] = !checks[id]; if(!checks[id]) delete checks[id];
      after();
      if(hide && checks[id]){ root.id === "s-got" ? drawGot() : drawList(); return; }
      li.classList.toggle("on", !!checks[id]); li.querySelector(".it-main").setAttribute("aria-checked", !!checks[id]); li.querySelector(".cb").classList.toggle("on", !!checks[id]);
      const g = li.closest(".grp"), n = g && g.querySelector(".grp-n");
      if(n){ const lis = [...g.querySelectorAll(".it[data-id]")]; n.textContent = `${lis.filter(l => l.classList.contains("on")).length} / ${lis.length}`; }
      if(root.id === "s-got") paintGotProg();
    };
    const info = li.querySelector("[data-info]"); if(info) info.onclick = () => itemSheet(x);
    const rm = li.querySelector("[data-rm]"); if(rm) rm.onclick = () => {
      const ci = S.custom.findIndex(c => c.id === id);
      if(ci >= 0) S.custom.splice(ci, 1); else if(!S.removed.includes(id)) S.removed.push(id);
      save(); drawList(); drawTabs();
    };
  });
}
function jumpTo(id){
  const x = BAG.items.find(i => i.id === id); if(!x) return;
  S.ui.tab = x.p; S.ui.tip = false; S.ui.hide = false; editing = false; save(); drawTabs(); drawList();
  const li = document.querySelector(`.it[data-id="${CSS.escape(id)}"]`); if(!li) return;
  li.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  li.classList.remove("flash"); void li.offsetWidth; li.classList.add("flash");
}

// ===== 보내기 · 복사 =====
function baseUrl(){ const u = new URL(location.origin + location.pathname); return u; }
function oneUrl(p){
  const u = baseUrl();
  if(!OPEN) u.searchParams.set("preview", "");
  u.searchParams.set("for", p);
  const o = BAG.conds.filter(c => S.o[c.k] && !(c.private && !c.private.includes(p))).map(c => c.k).join(",");
  if(o) u.searchParams.set("o", o);
  if(S.season) u.searchParams.set("s", S.season);
  const rm = S.removed.filter(id => { const x = BAG.items.find(i => i.id === id); return x && x.p === p; });
  if(rm.length) u.searchParams.set("rm", rm.join(","));
  const add = S.custom.filter(c => c.p === p).slice(0, 20).map(c => `${c.w}~${c.name.replace(/[|~]/g, " ")}`);
  if(add.length) u.searchParams.set("add", add.join("|"));
  return u.toString().replace("preview=&", "preview&").replace(/preview=$/, "preview");
}
async function sendOne(p){
  const per = P(p), url = oneUrl(p), msg = document.getElementById("msg");
  const text = per.sendText || `${per.t} 가방 목록이에요. 열어서 하나씩 체크해 주세요.`;
  if(navigator.share){ try { await navigator.share({ title: `${per.t} 가방 목록`, text, url }); return; } catch (e) { if(e && e.name === "AbortError") return; } }
  const done = "링크를 복사했어요. 카톡에 붙여 넣어 보내세요.";
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast(done); }
  catch (e) { if(msg){ msg.textContent = url; msg.scrollIntoView({ block: "center" }); } }
}
function linesOf(p, items, checks){
  const lines = [];
  for(const [wk, wl] of BAG.when){
    const list = items.filter(x => x.w === wk); if(!list.length) continue;
    lines.push("", `■ ${wl}`);
    for(const x of list) lines.push(`${checks[x.id] ? "☑" : "☐"} ${x.name}${x.qty ? ` — ${x.qty}` : ""}`);
  }
  return lines;
}
function oneText(p){
  const per = P(p), { items } = mine(p);
  return [`[${per.title || per.t + " 가방"}] ${condText(S.o, S.season, p)}`, ...linesOf(p, items, S.checks), "", per.send ? oneUrl(p) : ""].join("\n").trim();
}
function allText(){
  const out = [`[본식 가방 체크리스트] ${condText(S.o, S.season)}`, "※ 후기를 모은 참고용이에요. 웨딩홀 · 샵 안내가 먼저예요."];
  for(const p of BAG.people){ const { items } = mine(p.k); if(!items.length) continue; out.push("", `━━ ${p.t} ━━`, ...linesOf(p.k, items, S.checks).slice(1)); }
  return out.join("\n");
}
async function copyText(text, done){
  const msg = document.getElementById("msg");
  try { await navigator.clipboard.writeText(text); toast(done); if(msg) msg.textContent = ""; }
  catch (e) { if(msg) msg.textContent = "복사하지 못했어요. 화면을 캡처해 주세요."; }
}

// ===== 엑셀로 저장 (xlsx.js) — 사람마다 시트 하나 =====
function xlsxSheets(){
  const note = `※ 후기 ${BAG.nSrc}곳을 모은 참고용이에요(${BAG.checked}). 웨딩홀 · 샵 안내가 먼저예요. 챙긴 물건은 '챙김' 칸에서 ✔를 고르면 회색 줄로 바뀌어요.`;
  const sheets = [];
  for(const p of BAG.people){
    const { items } = mine(p.k); if(!items.length) continue;
    const rows = [];
    for(const [wk, wl] of BAG.when) for(const x of items.filter(i => i.w === wk))
      rows.push([S.checks[x.id] ? "✔" : "", wl, x.name, x.qty || "", BADGE[badge(x)] || (x.custom ? "직접 더함" : ""), [x.note, x.oops, x.why, x.mc ? `사회자 기준: ${x.mc}` : ""].filter(Boolean).join(" / ")]);
    sheets.push({ name: p.t.replace("·", " "), title: `${p.title || p.t + " 가방"} — ${condText(S.o, S.season)}`, note, check: true,
      head: ["챙김", "언제", "물건", "수량", "구분", "왜 챙기나"], widths: [7, 18, 30, 16, 12, 64], styles: [5, 4, 4, 4, 5, 4], rows });
  }
  return sheets;
}
async function saveXlsx(){
  const msg = document.getElementById("msg");
  if(typeof window.xlsxBook !== "function"){ msg.textContent = "엑셀 파일을 만들지 못했어요. ‘글로 복사하기’를 써 주세요."; return; }
  let file;
  try { const blob = window.xlsxBook(xlsxSheets()); file = new File([blob], "본식가방_체크리스트.xlsx", { type: blob.type }); }
  catch (e) { msg.textContent = "엑셀 파일을 만들지 못했어요. ‘글로 복사하기’를 써 주세요."; return; }
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try { await navigator.share({ files: [file], title: NAME }); msg.textContent = ""; return; }
    catch (e) { if(e && e.name === "AbortError"){ msg.textContent = ""; return; } }
  }
  const url = URL.createObjectURL(file), a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  msg.textContent = "엑셀 파일을 저장했어요. ‘다운로드’ 폴더(아이폰은 파일 앱)에서 열 수 있어요.";
}

// ===== 링크로 받은 목록 (가방순이 · 부모님 · 신랑 폰) =====
function gotChecks(){ return (G[got.key] || (G[got.key] = { checks: {} })).checks; }
function gotItems(){
  const { items } = listOf(got.p, got.o, got.season, got.rm, got.add);
  return items;
}
function gotView(){
  plain();
  const per = P(got.p);
  app.className = "wrap res";
  app.innerHTML = `
    <div class="rhead">
      <div class="rh-t"><p class="rh-kind">${NAME}</p><h2>${esc(per.title || per.t + " 가방")}</h2><p class="rh-sub">${esc(condText(got.o, got.season, got.p))}</p></div>
    </div>
    <div class="got-from"><b>${esc(per.gotFrom || "신부 · 신랑이 보낸 목록이에요")}</b><span>하나씩 눌러 체크하세요. 체크는 이 폰에만 저장돼요.</span></div>
    <div class="prog" id="prog"></div>
    <section class="sec" id="s-got"></section>
    <section class="sec end">
      <p class="note small">※ 먼저 해 본 신부 · 신랑 · 가방순이 후기 ${BAG.nSrc}곳을 모은 참고용이에요. <button class="text-btn inline" id="notice">어떻게 만들었나요?</button></p>
      <div class="btns"><a class="btn ghost" href="${esc(baseUrl().toString() + (OPEN ? "" : "?preview"))}" id="mineLink">내 결혼식 가방 목록 만들기</a></div>
      ${sign()}
    </section>
    ${foot()}`;
  document.getElementById("notice").onclick = openNotice;
  drawGot();
}
function drawGot(){
  const el = document.getElementById("s-got"); if(!el) return;
  const items = gotItems(), checks = gotChecks(), per = P(got.p);
  const mc = (BAG.mc || []).filter(m => m.p === got.p && condOk(m.c, got.o, got.season));
  el.innerHTML = `<div class="filters"><label class="hide"><input type="checkbox" id="hideDone" ${G.hide ? "checked" : ""}> 챙긴 것 숨기기</label></div>
    ${groupsHtml(items, checks, { p: got.p, tip: false, hide: !!G.hide, edit: false })}
    ${mc.map(m => `<div class="tip mc"><b>사회자 한마디</b><p>${esc(m.t)}</p></div>`).join("")}`;
  document.getElementById("hideDone").onchange = e => { G.hide = e.target.checked; saveGot(); drawGot(); };
  wireItems(el, items, checks, saveGot, !!G.hide);
  paintGotProg();
}
function paintGotProg(){
  const el = document.getElementById("prog"); if(!el || !got) return;
  const items = gotItems(), c = gotChecks(), done = items.filter(x => c[x.id]).length, pct = items.length ? Math.round(done / items.length * 100) : 0;
  el.innerHTML = `<div class="pg-row"><b>${done} / ${items.length}</b><span>챙긴 것</span></div>
    <div class="pg-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="챙긴 비율"><span style="width:${pct}%"></span></div>
    ${pct === 100 ? `<p class="pg-done">다 챙겼어요! 고마워요 💐</p>` : ""}`;
}
function fromUrl(){
  const q = new URLSearchParams(location.search), p = q.get("for");
  if(!p || !P(p)) return false;
  const ok = new Set(BAG.conds.map(c => c.k));
  const o = Object.fromEntries((q.get("o") || "").split(",").filter(k => ok.has(k)).map(k => [k, true]));
  const s = BAG.seasons.some(x => x[0] === q.get("s")) ? q.get("s") : "";
  const ids = new Set(BAG.items.map(x => x.id));
  const rm = (q.get("rm") || "").split(",").filter(id => ids.has(id));
  const add = (q.get("add") || "").split("|").filter(Boolean).slice(0, 20).map((v, i) => {
    const j = v.indexOf("~"), w = v.slice(0, j), name = v.slice(j + 1).trim().slice(0, 40);
    return W(w) && name ? { id: "a" + i, p, w, name } : null;
  }).filter(Boolean);
  got = { p, o, season: s, rm, add, key: [p, Object.keys(o).sort().join(","), s, rm.join(","), add.map(a => a.name).join("|")].join("/") };
  return true;
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${NAME}</span><span>곧 공개</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>본식 가방,<br>다 쌌어요?</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${siteLink("groom", "go", `<span>신랑 입장곡 테스트 먼저 하기</span>`)}
    </div>
    ${foot()}`;
}

// ===== 시작 =====
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  if(fromUrl()){ go("got", "replace"); return; }
  go("home", "replace");
}
route();
