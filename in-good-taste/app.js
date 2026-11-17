// 혼주 취향 테스트 ㊵: 신랑 · 신부가 부모님께 링크 → 부모님이 그림 보고 고르기('아무거나' 없음) → 답 링크로 돌아옴 → 취향 카드 · 양가 나란히
// 계산 core.js · 그림 art.js · 문구 text.js · 공통 기능 shared/common.js · 조사 docs/혼주-취향/조사/ · 기획 docs/혼주-취향/기획.md
// 서버 없음: 부모님 답은 링크 주소(#a=…) 안에 담겨 오가고, 받은 답은 이 기기(브라우저)에만 보관해요.

// ===== 공개 설정 ==========================================
// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/in-good-taste/?preview)
const OPEN = false;
// =========================================================

const KEY = "inGoodTaste.v1";          // 신랑 · 신부 폰: 받은 답
const ASK_KEY = "inGoodTaste.ask.v1";  // 부모님 폰: 고르는 중인 답
const C = CORE;
const SIDES = ["g", "b"];
const SECS = ["wear", "place", "mhair", "mface", "dad"];

// ===== 도움 함수 =====
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const fm = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ""));
const br = s => esc(s).replace(/\n/g, "<br>");
const other = s => s === "g" ? "b" : "g";
function today(){ const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dFull(d){ const [y, m, dd] = String(d || "").split("-"); return y ? fm(T.dateFmt, { y, m: +m, d: +dd }) : ""; }
function dShort(d){ const [, m, dd] = String(d || "").split("-"); return m ? `${+m}월 ${+dd}일` : ""; }
function dStamp(d){ const [, m, dd] = String(d || "").split("-"); return m ? `${+m}.${+dd}` : ""; }

// 링크: 공개 전에는 ?preview 를 붙여요
function pageUrl(query){
  const q = []; if(!OPEN) q.push("preview"); if(query) q.push(query);
  return location.origin + location.pathname + (q.length ? "?" + q.join("&") : "");
}
const askUrl = side => pageUrl("ask=" + side);
const answerUrl = (side, a) => pageUrl("") + "#a=" + C.encode(side, a);

async function shareOrCopy(text, url, msgEl, copiedText){
  if(navigator.share){
    try { await navigator.share({ text, url }); msgEl.textContent = ""; return; }
    catch(e){ if(e && e.name === "AbortError"){ msgEl.textContent = ""; return; } }
  }
  await copyText(text + "\n" + url, msgEl, copiedText, url);
}
async function copyText(s, msgEl, done, fallback){
  try { await navigator.clipboard.writeText(s); msgEl.textContent = done; }
  catch(e){ msgEl.textContent = fallback || s; }
}

// ===== 보관 =====
function loadGot(){
  const got = {};
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    SIDES.forEach(s => { const a = C.shown(C.clean(x && x.got && x.got[s])); if(C.complete(a) && a.d) got[s] = a; });
  } catch(e){}
  return got;
}
function saveGot(){ try { localStorage.setItem(KEY, JSON.stringify({ v: 1, got: GOT })); } catch(e){} }
let GOT = loadGot();

function loadAsk(){
  try { const x = JSON.parse(localStorage.getItem(ASK_KEY)) || {}; return { g: C.clean(x.g), b: C.clean(x.b) }; }
  catch(e){ return { g: {}, b: {} }; }
}
function saveAsk(){ try { localStorage.setItem(ASK_KEY, JSON.stringify(AS)); } catch(e){} }
const ASKSIDE = (() => { const a = new URLSearchParams(location.search).get("ask"); return a === "g" || a === "b" ? a : ""; })();
let AS = null, A = null;   // 부모님 화면: AS = 두 쪽 저장본, A = 지금 고르는 쪽

// ===== 화면 흐름 (폰 뒤로 가기 = 앞 단계) =====
let screen = "", cur = "", EDIT = false;
function go(sc, k, extra){ const st = Object.assign({ sc, k }, extra || {}); history.pushState(st, ""); render(sc, k, st); }
function render(sc, k, st){
  screen = sc; cur = k || ""; EDIT = !!(st && st.ed);
  document.body.classList.remove("is-cover", "big");
  ({ home, send, card, compare, askHome, q, summary, done })[sc](k);
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  const st = e.state || { sc: ASKSIDE ? "askHome" : "home" };
  if(location.hash.startsWith("#a=")){ importScreen(location.hash.slice(3)); return; }
  render(st.sc, st.k, st);
});

// ===== 값 → 글 =====
function famText(a){
  return (a.color || []).map((f, i) => fm(T.famLine, { fam: T.fam[f] }) + (a.color.length > 1 ? ` (${T.rank[i]})` : "")).join(", ");
}
function val(id, a, forShop){
  const v = a[id];
  if(v == null) return "";
  if(id === "color") return famText(a);
  if(id === "care") return v.map(k => T.v.care[k]).join(", ");
  if(id === "skinM" || id === "skinF"){ const m = id === "skinM" ? a.memoM : a.memoF; return T.v[id][v] + (v === "yes" && m ? ` — ${m}` : ""); }
  if(forShop && (id === "grayM" || id === "grayF") && v === "dye") return T.grayShop;
  return (T.v[id] && T.v[id][v]) || "";
}
const momSide = a => a.who === "both" || a.who === "m";
function headline(a){
  if(!momSide(a)) return T.headDad;
  const fams = (a.color || []).map(f => T.fam[f]).join(" · ");
  return fm(T.headWear, { tone: T.toneAdj[a.tone], fam: fams, wear: T.v.wear[a.wear] });
}
function idsOf(sec, a){ return C.list(a).filter(id => id !== "who" && C.Q[id].sec === sec && C.answered(id, a)); }
function outfitOf(a){ return ART.outfit(a.wear, a.color[0], a.tone, a.point, headline(a).replace(/\n/g, " ")); }

// ===== 취향 카드 (부모님 · 신랑신부 같이 씀) =====
function cardHTML(side, a, opt){
  opt = opt || {};
  const hasMom = momSide(a);
  const secs = SECS.map(sec => {
    const ids = idsOf(sec, a); if(!ids.length) return "";
    let art = "";
    if(sec === "mhair") art = `<div class="cs-art">${ART.mom({ len: a.len, hair: a.hair, bang: a.bang, vol: a.vol }, T.cs.mhair)}</div>`;
    if(sec === "dad" && a.part) art = `<div class="cs-art">${ART.dad(a.part, T.cs.dad)}</div>`;
    return `<div class="cs${art ? " has-art" : ""}"><h3>${esc(T.cs[sec])}</h3>${art}
      <dl>${ids.map(id => `<div><dt>${esc(T.k[id])}</dt><dd>${esc(val(id, a))}</dd></div>`).join("")}</dl></div>`;
  }).join("");
  return `
    <div class="card tcard" id="card">
      <div class="head"><span class="kind">${esc(fm(T.cardKind, { side: T.side[side] }))}${opt.ex ? ` <em class="ex-tag">${esc(T.exTag)}</em>` : ""}</span><span class="handle">@wed_voice.su</span></div>
      <div class="hero${hasMom ? "" : " no-art"}">
        <div class="hero-txt">
          <h2>${br(headline(a))}</h2>
          ${a.d ? `<p class="date">${esc(fm(T.dateLine, { date: dFull(a.d) }))}</p>` : ""}
          ${hasMom ? `<div class="fams">${a.color.map(f => `<span class="fam">${ART.swatch(f)}${esc(T.fam[f])}</span>`).join("")}</div>` : ""}
        </div>
        ${hasMom ? `<div class="hero-art">${outfitOf(a)}</div>` : ""}
        ${a.d && opt.stamp !== false ? `<div class="stamp" aria-label="${esc(T.stamp.replace(/\n/g, " "))} ${esc(dStamp(a.d))}"><span>${br(T.stamp)}</span><b>${esc(dStamp(a.d))}</b></div>` : ""}
      </div>
      ${secs}
      ${sign()}
    </div>`;
}

// 한복집 · 샵에 보낼 카톡 글
function hanbokText(side, a){
  const L = [fm(T.txHanbok, { side: T.side[side], wear: T.v.wear[a.wear], date: dFull(a.d) })];
  idsOf("wear", a).forEach(id => L.push(fm(T.txRow, { k: T.k[id], v: val(id, a, true) })));
  return L.join("\n");
}
function shopText(side, a){
  const L = [fm(T.txShop, { side: T.side[side], date: dFull(a.d) })];
  const rows = ids => ids.forEach(id => L.push(fm(T.txRow, { k: T.k[id], v: val(id, a, true) })));
  rows(idsOf("place", a));
  const mom = idsOf("mhair", a).concat(idsOf("mface", a));
  if(mom.length){ L.push("", T.txMom); rows(mom); }
  const dad = idsOf("dad", a);
  if(dad.length){ L.push("", T.txDad); rows(dad); }
  return L.join("\n");
}
const hasShop = a => ["place", "mhair", "mface", "dad"].some(s => idsOf(s, a).length);

// ===== 1. 첫 화면 (신랑 · 신부) =====
function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const sideBtn = s => GOT[s]
    ? `<button data-card="${s}"><span>${esc(fm(T.cardTitle, { side: T.side[s] }))}</span><span class="q got">${esc(fm(T.gotQ, { date: dShort(GOT[s].d) }))}</span></button>`
    : `<button data-send="${s}"><span>${esc(s === "b" ? T.sendB : T.sendG)}</span><span class="q">${esc(T.sendQ)}</span></button>`;
  const both = GOT.g && GOT.b;
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.topRight)}</span></div>
    ${brandLogo()}
    <p class="for">${esc(T.kicker)}</p>
    <h1>${br(T.title)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.lead)}</p>
    <div class="pick">
      ${both ? `<button id="cmp" class="hot"><span>${esc(T.compareBtn)}</span><span class="q">${esc(T.compareQ)}</span></button>` : ""}
      ${sideBtn("b")}
      ${sideBtn("g")}
      <button id="ex"><span>${esc(T.example)}</span><span class="q">${esc(T.exampleQ)}</span></button>
    </div>
    <p class="note">${esc(T.homeNote)}</p>
    <p class="note">${esc(T.trust)}</p>
    ${foot()}`;
  $$("[data-send]").forEach(b => b.onclick = () => go("send", b.dataset.send));
  $$("[data-card]").forEach(b => b.onclick = () => go("card", b.dataset.card));
  const cb = $("#cmp"); if(cb) cb.onclick = () => go("compare");
  $("#ex").onclick = () => go("compare", "ex");
}

// ===== 2. 링크 보내기 =====
function send(side){
  app.className = "wrap send";
  const url = askUrl(side);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.back)}</button><span>${esc(T.name)}</span></div>
    <h2 class="question">${br(fm(T.sendTitle, { side: T.side[side] }))}</h2>
    <p class="lead2">${esc(T.sendLead)}</p>
    <div class="sec">
      <h3>${esc(T.sendWhatTitle)}</h3>
      <ul class="what">${T.sendWhat.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="hint2 after">${esc(T.sendTime)}</p>
    </div>
    <div class="tipbox"><p>${esc(T.sendTip)}</p></div>
    <div class="btns">
      <button class="btn main" id="share">${esc(T.sendBtn)}</button>
      <p class="msg" id="msg" role="status"></p>
      <button class="btn ghost" id="copy">${esc(T.sendCopy)}</button>
      <a class="text-btn btn-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(T.sendPreview)}</a>
    </div>
    <p class="hint2 center after">${esc(T.sendAfter)}</p>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $("#share").onclick = () => shareOrCopy(T.sendText, url, $("#msg"), T.sendCopied);
  $("#copy").onclick = () => copyText(url, $("#msg"), T.sendCopied);
}

// ===== 3. 카드 보기 (신랑 · 신부) =====
function card(k){
  const ex = k === "exg" || k === "exb";
  const side = ex ? k.slice(2) : k;
  const a = ex ? C.shown(C.clean(EXAMPLE[side])) : GOT[side];
  if(!a){ render("home"); return; }
  app.className = "wrap cardv";
  const oth = other(side);
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(ex ? T.cmpTitle : T.back)}</button><span>${esc(T.name)}</span></div>
    ${cardHTML(side, a, { ex })}
    <div class="after btns">
      <button class="btn main" id="save">${esc(T.cardSave)}</button>
      <p class="msg" id="msg" role="status"></p>
      ${momSide(a) ? `<button class="btn ghost" id="cpH">${esc(a.wear === "dress" ? T.cardDress : T.cardHanbok)}</button>` : ""}
      ${hasShop(a) ? `<button class="btn ghost" id="cpS">${esc(T.cardShop)}</button>` : ""}
      ${!ex && GOT[oth] ? `<button class="btn ghost" id="cmp">${esc(T.cardCompare)}</button>` : ""}
      ${!ex && !GOT[oth] ? `<button class="btn ghost" id="oth">${esc(fm(T.cardOther, { side: T.side[oth] }))}</button>` : ""}
      ${!ex ? `<button class="btn line" id="again">${esc(T.cardAsk)}</button><p class="hint2 center">${esc(T.cardAskHint)}</p>` : ""}
    </div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  prepareImage(fm(T.fileCard, { side: T.side[side] }));
  $("#save").onclick = saveCard;
  const msg = $("#msg");
  const h = $("#cpH"); if(h) h.onclick = () => copyText(hanbokText(side, a), msg, T.cardCopied);
  const s = $("#cpS"); if(s) s.onclick = () => copyText(shopText(side, a), msg, T.cardCopied);
  const c = $("#cmp"); if(c) c.onclick = () => go("compare");
  const o = $("#oth"); if(o) o.onclick = () => go("send", oth);
  const g = $("#again"); if(g) g.onclick = () => go("send", side);
}

// ===== 4. 양가 나란히 =====
function checkHTML(ck, P){
  const t = T.ck, sd = s => s === "gb" ? T.bothSides : T.side[s];
  let main = "", why = "", srcK = "";
  switch(ck.k){
    case "wearSame": main = fm(t.wearSame, { v: T.v.wear[ck.v] }); break;
    case "wearDiff": main = t.wearDiff; why = t.wearDiffWhy; srcK = "wear"; break;
    case "colorSame": main = fm(t.colorSame, { fam: T.fam[ck.fam] }); why = t.colorSameWhy; srcK = "color"; break;
    case "colorDiff": main = fm(t.colorDiff, { g: famText(P.g), b: famText(P.b) }); break;
    case "colorTrad": main = t.colorTrad + (ck.off ? " " + t.colorTradOff : ""); srcK = "trad"; break;
    case "toneSame": main = fm(t.toneSame, { v: T.v.tone[ck.v] }); break;
    case "toneDiff": main = fm(t.toneDiff, { g: T.v.tone[ck.g], b: T.v.tone[ck.b] }); why = t.toneDiffWhy; srcK = "tone"; break;
    case "pointSame": main = fm(t.pointSame, { v: T.v.point[ck.v] }); why = t.pointWhy; srcK = "point"; break;
    case "pointDiff": main = fm(t.pointDiff, { g: T.v.point[ck.g], b: T.v.point[ck.b] }); why = t.pointWhy; srcK = "point"; break;
    case "shopSame": main = t.shopSame; srcK = "shop"; break;
    case "shopRoom": main = t.shopRoom; why = fm(t.shopRoomWhy, { side: sd(ck.side) }); srcK = "shop"; break;
    case "shopApart": main = t.shopApart; why = fm(t.shopApartWhy, { side: sd(ck.side) }); srcK = "shop"; break;
    case "shopOwn": main = t.shopOwn; why = fm(t.shopOwnWhy, { side: T.side[ck.side], v: T.v.place[ck.v] }); break;
    case "hairBoth": main = fm(t.hairBoth, { g: T.v.hair[ck.g], b: T.v.hair[ck.b] }); why = t.hairWhy; srcK = "hair"; break;
  }
  const icon = { ok: "✓", warn: "!", info: "i" }[ck.lv];
  return `<li class="ck ${ck.lv}"><span class="ck-i" aria-label="${esc(T.lv[ck.lv])}">${icon}</span>
    <div><p class="ck-m">${esc(main)}</p>${why ? `<p class="ck-w">${esc(why)}</p>` : ""}</div></li>`;
}
function compare(k){
  const ex = k === "ex";
  const P = ex ? { g: C.shown(C.clean(EXAMPLE.g)), b: C.shown(C.clean(EXAMPLE.b)) } : { g: GOT.g, b: GOT.b };
  if(!P.g || !P.b){ render("home"); return; }
  app.className = "wrap cmpv";
  const checks = C.compare(P.g, P.b);
  const order = { warn: 0, ok: 1, info: 2 };
  checks.sort((x, y) => order[x.lv] - order[y.lv]);
  const fig = s => {
    const a = P[s];
    const art = momSide(a) ? outfitOf(a) : ART.dad(a.part || "open", T.side[s]);
    return `<figure><div class="fig-art">${art}</div><figcaption><b>${esc(T.cmpSide[s])}</b>${momSide(a) ? `<span>${esc(T.toneAdj[a.tone])} ${esc(a.color.map(f => T.fam[f]).join(" · "))}</span>` : ""}</figcaption></figure>`;
  };
  const rows = C.ALL.filter(id => id !== "who" && (C.answered(id, P.g) || C.answered(id, P.b)));
  const used = [...new Set(checks.map(c => ({ wearDiff: "wear", colorSame: "color", colorTrad: "trad", toneDiff: "tone", pointSame: "point", pointDiff: "point", shopSame: "shop", shopRoom: "shop", shopApart: "shop", hairBoth: "hair" })[c.k]).filter(Boolean).flatMap(x => SRC_OF[x]))];
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.back)}</button><span>${ex ? `<em class="ex-tag">${esc(T.exTag)}</em>` : esc(T.name)}</span></div>
    <h2 class="question">${esc(T.cmpTitle)}</h2>
    <p class="lead2">${esc(T.cmpLead)}</p>
    <div class="card cmp" id="card">
      <div class="head"><span class="kind">${esc(T.cmpKind)}${ex ? ` <em class="ex-tag">${esc(T.exTag)}</em>` : ""}</span><span class="handle">@wed_voice.su</span></div>
      <div class="pair">${fig("g")}${fig("b")}</div>
      <ul class="checks">${checks.map(c => checkHTML(c, P)).join("")}</ul>
      <h3 class="cmp-h">${esc(T.cmpTable)}</h3>
      <table class="cmp-t">
        <thead><tr><th></th><th>${esc(T.cmpSide.g)}</th><th>${esc(T.cmpSide.b)}</th></tr></thead>
        ${SECS.map(sec => {
          const ids = rows.filter(id => C.Q[id].sec === sec); if(!ids.length) return "";
          return `<tbody><tr class="grp"><th colspan="3">${esc(T.cs[sec])}</th></tr>${ids.map(id => {
            const g = val(id, P.g) || T.cmpNone, b = val(id, P.b) || T.cmpNone;
            return `<tr${g !== b ? ' class="dif"' : ""}><th>${esc(T.k[id])}</th><td>${esc(g)}</td><td>${esc(b)}</td></tr>`;
          }).join("")}</tbody>`;
        }).join("")}
      </table>
      ${sign()}
    </div>
    <div class="after btns">
      <button class="btn main" id="save">${esc(T.cmpSave)}</button>
      <p class="msg" id="msg" role="status"></p>
      <button class="btn ghost" data-c="g">${esc(fm(T.cmpCard, { side: T.side.g }))}</button>
      <button class="btn ghost" data-c="b">${esc(fm(T.cmpCard, { side: T.side.b }))}</button>
    </div>
    <details class="help src"><summary>${esc(T.cmpSrc)}</summary>
      <ul>${used.map(s => `<li><a href="${esc(SRC[s][1])}" target="_blank" rel="noopener">${esc(SRC[s][0])}</a></li>`).join("")}</ul>
      <p>${esc(T.cmpSrcNote)}</p></details>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  prepareImage(T.fileCmp);
  $("#save").onclick = saveCard;
  $$("[data-c]").forEach(b => b.onclick = () => go("card", (ex ? "ex" : "") + b.dataset.c));
}

// ===== 5. 부모님 첫 화면 (?ask=b · ?ask=g) =====
function askHome(){
  document.body.classList.add("is-cover", "big");
  app.className = "wrap cover ask-cover";
  const doneA = C.complete(A) && A.d, st = C.started(A);
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">${esc(T.askFor[ASKSIDE])}</p>
    <h1 class="ask-h1">${br(T.askTitle)}</h1>
    <div class="bar"></div>
    <p class="lead">${esc(T.askLead)}</p>
    <div class="pick">
      ${doneA ? `<button id="see"><span>${esc(T.askSeeDone)}</span></button>`
        : `<button id="startQ"><span>${esc(st ? T.askResume : T.askStart)}</span></button>`}
    </div>
    <p class="note">${esc(T.askNote)}</p>
    ${st ? `<div class="reset"><button class="text-btn cover-link" id="reset">${esc(T.askRestart)}</button>
      <div class="reset-ask" id="resetAsk" hidden><p>${esc(T.askRestartAsk)}</p>
      <div class="reset-btns"><button class="chip-btn" id="resetYes">${esc(T.askRestartYes)}</button><button class="chip-btn" id="resetNo">${esc(T.askRestartNo)}</button></div></div></div>` : ""}
    ${foot()}`;
  const see = $("#see"); if(see) see.onclick = () => go("done");
  const sq = $("#startQ"); if(sq) sq.onclick = () => { const nx = C.nextOpen(A); nx ? go("q", nx) : go("summary"); };
  if(st){
    $("#reset").onclick = () => { $("#resetAsk").hidden = false; $("#reset").hidden = true; $("#resetYes").focus(); };
    $("#resetNo").onclick = () => { $("#resetAsk").hidden = true; $("#reset").hidden = false; };
    $("#resetYes").onclick = () => { A = AS[ASKSIDE] = {}; saveAsk(); render("askHome"); };
  }
}

// ===== 6. 질문 =====
function setAnswer(id, v){
  A[id] = v; delete A.d;   // 고치면 "이대로 정했어요"를 다시 눌러야 날짜가 찍혀요
  AS[ASKSIDE] = A; saveAsk();
}
function advance(id){
  const nx = C.nextOpen(A, id);
  if(!nx){ if(EDIT) history.back(); else go("summary"); return; }
  go("q", nx, EDIT ? { ed: 1 } : null);
}
function picOf(id, v){
  const P = { wear: "purple", fam: A.color && A.color[0] || "pink" };
  switch(id){
    case "wear": return ART.outfit(v, "purple", "pastel", "chima", T.q.wear.o[v][0]);
    case "tone": return ART.outfit(A.wear || "hanbok", P.fam, v, "chima", T.q.tone.o[v][0]);
    case "point": return ART.outfit("hanbok", P.fam, A.tone || "pastel", v, T.q.point.o[v][0]);
    case "len": return ART.mom({ len: v, hair: "dry", bang: "side" }, T.q.len.o[v][0]);
    case "hair": return ART.mom({ len: A.len, hair: v, bang: v === "up" ? "open" : "side" }, T.q.hair.o[v][0]);
    case "bang": return ART.mom({ len: A.len, hair: A.hair, bang: v }, T.q.bang.o[v][0]);
    case "vol": return ART.mom({ len: A.len, hair: A.hair, bang: A.bang, vol: v }, T.q.vol.o[v][0]);
    case "part": return ART.dad(v, T.q.part.o[v][0]);
  }
  return "";
}
const PIC = ["wear", "tone", "point", "len", "hair", "bang", "vol", "part"];
function q(id){
  document.body.classList.add("big");
  app.className = "wrap qv";
  const Qd = C.Q[id], Tq = T.q[id];
  const L = C.most(A), n = L.indexOf(id) + 1;
  const pic = PIC.includes(id), multi = !!Qd.multi;
  const sel = v => multi ? (A[id] || []).includes(v) : A[id] === v;
  let opts;
  if(id === "color"){
    opts = `<div class="opts colors">${Qd.o.map(v => {
      const r = (A.color || []).indexOf(v);
      return `<button class="opt col${r >= 0 ? " on" : ""}" data-v="${v}" aria-pressed="${r >= 0}">
        ${ART.swatch(v)}<span class="ot"><b>${esc(Tq.o[v][0])}</b><small>${esc(Tq.o[v][1])}</small></span>
        <span class="rank">${r >= 0 ? r + 1 : ""}</span></button>`;
    }).join("")}</div>`;
  } else if(pic){
    opts = `<div class="opts pics n${Qd.o.length}">${Qd.o.map(v => `
      <button class="opt pic${sel(v) ? " on" : ""}" data-v="${v}" aria-pressed="${sel(v)}">
        <span class="pic-art">${picOf(id, v)}</span>
        <span class="ot"><b>${esc(Tq.o[v][0])}</b>${Tq.o[v][1] ? `<small>${esc(Tq.o[v][1])}</small>` : ""}</span>
      </button>`).join("")}</div>`;
  } else {
    opts = `<div class="opts rows">${Qd.o.map(v => `
      <button class="opt row${sel(v) ? " on" : ""}${Qd.none === v ? " none" : ""}" data-v="${v}" aria-pressed="${sel(v)}">
        <span class="box">${CHECK}</span>
        <span class="ot"><b>${esc(Tq.o[v][0])}</b>${Tq.o[v][1] ? `<small>${esc(Tq.o[v][1])}</small>` : ""}</span>
      </button>`).join("")}</div>`;
  }
  const memoKey = Qd.memo;
  const sub = id === "tone" && A.color && A.color.length ? fm(T.toneShown, { fam: fm(T.famLine, { fam: T.fam[A.color[0]] }) })
    : id === "color" ? T.colorHint : multi ? T.multiHint : Tq.s;
  app.innerHTML = `
    <div class="top qtop"><button class="top-btn" id="back">‹ ${esc(T.prev)}</button><span class="sec-name">${esc(T.sec[Qd.sec])}</span><span class="count">${esc(fm(T.count, { n, all: L.length }))}</span></div>
    <div class="prog" aria-hidden="true"><i style="width:${Math.round(n / L.length * 100)}%"></i></div>
    ${id === "fget" && A.who === "both" ? `<p class="turn">${esc(T.dadTurn)}</p>` : ""}
    <h2 class="question">${br(Tq.t)}</h2>
    ${sub ? `<p class="qsub">${esc(sub)}</p>` : ""}
    ${opts}
    ${memoKey ? `<div class="memo" id="memo"${A[id] === "yes" ? "" : " hidden"}><input id="memoIn" maxlength="60" placeholder="${esc(T.memoPh)}" value="${esc(A[memoKey] || "")}"></div>` : ""}
    <div class="qdock"${multi || (memoKey && A[id] === "yes") ? "" : " hidden"} id="dock">
      <p class="msg" id="msg" role="status"></p>
      <button class="btn main" id="next"${multi && !(A[id] || []).length ? " disabled" : ""}>${esc(T.next)}</button>
    </div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  const msg = $("#msg"), nextB = $("#next");
  $$(".opt").forEach(b => b.onclick = () => {
    const v = b.dataset.v;
    if(id === "color"){
      let arr = (A.color || []).slice();
      if(arr.includes(v)) arr = arr.filter(x => x !== v);
      else if(arr.length >= Qd.multi){ msg.textContent = T.pickMax; return; }
      else arr.push(v);
      msg.textContent = "";
      if(arr.length) setAnswer(id, arr); else { delete A.color; delete A.d; saveAsk(); }
      $$(".opt").forEach(x => { const r = arr.indexOf(x.dataset.v); x.classList.toggle("on", r >= 0); x.setAttribute("aria-pressed", r >= 0); $(".rank", x).textContent = r >= 0 ? r + 1 : ""; });
      nextB.disabled = !arr.length;
      return;
    }
    if(multi){
      let arr = (A[id] || []).slice();
      if(arr.includes(v)) arr = arr.filter(x => x !== v);
      else if(v === Qd.none) arr = [v];
      else { arr = arr.filter(x => x !== Qd.none); arr.push(v); }
      if(arr.length) setAnswer(id, arr); else { delete A[id]; delete A.d; saveAsk(); }
      $$(".opt").forEach(x => { const on = arr.includes(x.dataset.v); x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      nextB.disabled = !arr.length;
      return;
    }
    setAnswer(id, v);
    $$(".opt").forEach(x => { const on = x.dataset.v === v; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    if(memoKey && v === "yes"){
      $("#memo").hidden = false; $("#dock").hidden = false;
      const inp = $("#memoIn"); setTimeout(() => inp.focus(), 50);
      return;
    }
    if(memoKey){ $("#memo").hidden = true; $("#dock").hidden = true; }
    setTimeout(() => advance(id), reduce ? 0 : 220);
  });
  if(memoKey){
    const inp = $("#memoIn");
    inp.oninput = () => { A[memoKey] = C.cleanMemo(inp.value); delete A.d; saveAsk(); };
    inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); inp.blur(); advance(id); } };
  }
  nextB.onclick = () => advance(id);
}

// ===== 7. 고르신 것 (부모님) =====
function summary(){
  document.body.classList.add("big");
  app.className = "wrap sumv";
  const secHTML = sec => {
    const ids = C.list(A).filter(id => id !== "who" && C.Q[id].sec === sec);
    if(!ids.length) return "";
    return `<div class="sec"><h3>${esc(T.cs[sec])}</h3>${ids.map(id => `
      <button class="sum-row" data-id="${id}"><span class="sk">${esc(T.k[id])}</span><span class="sv">${esc(val(id, A) || "—")}</span><span class="se">${esc(T.sumEdit)}</span></button>`).join("")}</div>`;
  };
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.prev)}</button><span>${esc(T.askFor[ASKSIDE])}</span></div>
    <h2 class="question">${esc(T.sumTitle)}</h2>
    <p class="lead2">${esc(T.sumLead)}</p>
    <div class="sec"><button class="sum-row" data-id="who"><span class="sk">${esc(T.k.who)}</span><span class="sv">${esc(T.v.who[A.who])}</span><span class="se">${esc(T.sumEdit)}</span></button></div>
    ${SECS.map(secHTML).join("")}
    <div class="qdock stay">
      <button class="btn accent big-btn" id="ok">${esc(T.sumOk)}</button>
      <p class="hint2 center">${esc(T.sumOkSub)}</p>
    </div>
    ${foot()}`;
  $("#back").onclick = () => history.back();
  $$(".sum-row").forEach(b => b.onclick = () => go("q", b.dataset.id, { ed: 1 }));
  $("#ok").onclick = () => {
    const nx = C.nextOpen(A); if(nx){ go("q", nx, { ed: 1 }); return; }
    A.d = today(); AS[ASKSIDE] = A; saveAsk();
    reveal(T.reveal, () => go("done"));
  };
}

// ===== 8. 다 고른 뒤 (부모님) =====
function done(){
  if(!(C.complete(A) && A.d)){ render("summary"); return; }
  document.body.classList.add("big");
  app.className = "wrap donev";
  app.innerHTML = `
    <div class="top"><button class="top-btn" id="back">‹ ${esc(T.doneEdit)}</button><span></span></div>
    <h2 class="question">${esc(T.doneTitle)}</h2>
    <p class="lead2">${esc(T.doneLead)}</p>
    <div class="btns top-btns">
      <button class="btn accent big-btn" id="send">${esc(T.doneSend)}</button>
      <p class="hint2 center">${esc(T.doneSendHint)}</p>
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${cardHTML(ASKSIDE, C.shown(A))}
    <div class="after btns">
      <button class="btn ghost" id="save">${esc(T.doneSave)}</button>
      <button class="btn ghost" id="copy">${esc(T.doneCopy)}</button>
      <button class="btn line" id="edit">${esc(T.doneEdit)}</button>
    </div>
    ${foot()}`;
  const url = answerUrl(ASKSIDE, A), msg = $("#msg");
  $("#back").onclick = () => go("summary");
  $("#edit").onclick = () => go("summary");
  $("#send").onclick = () => shareOrCopy(T.doneShareText, url, msg, T.doneCopied);
  $("#copy").onclick = () => copyText(url, msg, T.doneCopied);
  prepareImage(fm(T.fileCard, { side: T.side[ASKSIDE] }));
  $("#save").onclick = saveCard;
}

// ===== 9. 답 받기 (#a=…) =====
function importScreen(code){
  document.body.classList.remove("is-cover", "big");
  app.className = "wrap imp";
  const got = C.decode(code);
  const toHome = () => history.replaceState({ sc: "home" }, "", pageUrl(""));
  if(!got){
    app.innerHTML = `<div class="top"><span>${esc(T.name)}</span><span></span></div>
      <h2 class="question">${esc(T.impBad)}</h2><p class="lead2">${esc(T.impBadLead)}</p>
      <button class="btn main" id="home">${esc(T.impHome)}</button>${foot()}`;
    $("#home").onclick = () => { toHome(); render("home"); };
    return;
  }
  const { side, a } = got, old = GOT[side];
  // 답 화면은 "처음" 위에 쌓아요 → 폰 뒤로 가기가 사이트 밖이 아니라 첫 화면으로
  const show = () => { toHome(); go("card", side); };
  const keep = () => { GOT[side] = a; saveGot(); show(); };
  if(!old){ keep(); return; }
  const changed = C.diff(old, a);
  if(!changed.length){ show(); $("#msg").textContent = T.impSame; return; }
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span></span></div>
    <h2 class="question">${br(fm(T.impTitle, { side: T.side[side] }))}</h2>
    <p class="lead2">${esc(fm(T.impLead, { date: dFull(a.d) }))}</p>
    <div class="sec chg"><h3>${esc(fm(T.impChanged, { date: dFull(old.d) }))}</h3>
      ${changed.map(id => `<div class="chg-row"><b>${esc(T.k[id])}</b>
        <p class="old">${esc(fm(T.impOld, { v: val(id, old) || T.cmpNone }))}</p>
        <p class="new">${esc(fm(T.impNew, { v: val(id, a) || T.cmpNone }))}</p></div>`).join("")}
    </div>
    <div class="btns">
      <button class="btn main" id="rep">${esc(T.impReplace)}</button>
      <button class="btn ghost" id="old">${esc(T.impKeepOld)}</button>
    </div>
    ${foot()}`;
  $("#rep").onclick = keep;
  $("#old").onclick = show;
}

// ===== 아직 공개 전 =====
function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>${esc(T.name)}</span><span>${esc(T.soonTop)}</span></div>
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

// ===== 시작 =====
function route(){
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if(!OPEN && !preview){ soon(); return; }
  if(location.hash.startsWith("#a=")){ importScreen(location.hash.slice(3)); return; }
  if(ASKSIDE){ AS = loadAsk(); A = AS[ASKSIDE]; history.replaceState({ sc: "askHome" }, ""); render("askHome"); return; }
  history.replaceState({ sc: "home" }, "");
  render("home");
}
route();
// 이미 열린 창에 답 링크를 붙여 넣으면 주소의 # 뒤만 바뀌어요 → 그때도 답 받기 화면으로
window.addEventListener("hashchange", () => {
  const preview = (location.search + location.hash).toLowerCase().includes("preview");
  if((OPEN || preview) && location.hash.startsWith("#a=")){ importScreen(location.hash.slice(3)); window.scrollTo(0, 0); }
});
window.__taste = { get GOT(){ return GOT; }, get A(){ return A; }, get screen(){ return screen; }, get cur(){ return cur; } };   // 화면 흐름 시험용
