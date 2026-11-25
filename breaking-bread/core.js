// 상견례 대화 카드 ㉕ · 셈과 글 만들기 (화면 없이 돌아가요 → node 시험에서도 그대로 써요)
// 글은 text.js의 T를 써요. 저장 모양: blank() · 고치기: clean()
const CORE = (() => {
  const SIDES = ["g", "b"], ROLES = ["fa", "mo"];
  const other = s => s === "g" ? "b" : "g";

  // ===== 고를 항목 =====
  // grp A = 결혼 준비 결론 (양가 부모님이 아시는지 ✓) · B = 상견례 날 맞출 것 (부모님 판에 바로 들어감)
  // note = 이 답을 고르면 한 줄 적는 칸이 열려요 · undecided = 아직 못 정했어요
  const ITEMS = [
    { k: "date",    grp: "A", picks: ["set", "cand", "later"], note: ["set"] },
    { k: "size",    grp: "A", picks: ["usual", "small", "none", "undecided"] },
    { k: "yemul",   grp: "A", picks: ["do", "simple", "skip", "undecided"], stat: true },
    { k: "yedan",   grp: "A", picks: ["do", "simple", "skip", "undecided"] },
    { k: "ham",     grp: "A", picks: ["do", "simple", "skip", "undecided"] },
    { k: "ibaji",   grp: "A", picks: ["do", "simple", "skip", "undecided"] },
    { k: "pyebaek", grp: "A", picks: ["do", "simple", "skip", "undecided"] },
    { k: "home",    grp: "A", picks: ["two", "with", "undecided"], note: ["two", "with"] },
    { k: "hanbok",  grp: "A", picks: ["hanbok", "suit", "ask"] },
    { k: "pay",     grp: "B", picks: ["us", "split", "undecided"] },
    { k: "gift",    grp: "B", picks: ["us", "none", "undecided"] },
    { k: "dress",   grp: "B", picks: ["suit", "neat"] },
    { k: "talk",    grp: "B", picks: ["skip", "confirm"] },
    { k: "first",   grp: "B", picks: ["g", "b"] }
  ];
  const IT = {}; ITEMS.forEach((it, i) => { IT[it.k] = Object.assign({ i }, it); });

  // 좋아하시는 것: [이름, 묶음] (묶음이 같으면 "두 분 다 …" 질문)
  const LIKES = [
    ["등산", "out"], ["걷기 · 산책", "out"], ["골프", "out"], ["낚시", "out"], ["여행", "out"], ["캠핑", "out"], ["운동", "out"],
    ["요리", "make"], ["텃밭 · 화초", "make"],
    ["노래 · 음악", "fun"], ["영화 · 드라마", "fun"], ["책", "fun"], ["바둑 · 장기", "fun"],
    ["반려동물", "pet"]
  ];
  const MAX = { name: 12, place: 40, note: 40, home: 20, like2: 30, job: 20, sib: 30, avoid: 40, story: 80, menu: 80 };
  const PRAISE_MAX = 3;

  // ===== 저장 모양 =====
  function person(){ return { on: true, home: "", likes: [], like2: "", job: "" }; }
  function family(){ return { fa: person(), mo: person(), sib: "", avoid: "" }; }
  function blank(){
    const items = {};
    ITEMS.forEach(it => { items[it.k] = { pick: "", note: "", know: { g: false, b: false } }; });
    return { v: 1, names: { g: "", b: "" }, meet: { date: "", place: "" }, items, fam: { g: family(), b: family() }, kid: { g: [], b: [] }, story: "", menu: "", last: "" };
  }
  const str = (x, n) => typeof x === "string" ? x.slice(0, n) : "";
  function clean(x){
    if(!x || typeof x !== "object" || x.v !== 1) return null;
    const b = blank();
    SIDES.forEach(s => { b.names[s] = str(x.names && x.names[s], MAX.name); });
    const m = x.meet || {};
    b.meet.date = /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : "";
    b.meet.place = str(m.place, MAX.place);
    ITEMS.forEach(it => {
      const y = x.items && x.items[it.k]; if(!y || typeof y !== "object") return;
      const o = b.items[it.k];
      o.pick = it.picks.includes(y.pick) ? y.pick : "";
      o.note = it.note ? str(y.note, MAX.note) : "";
      if(it.grp === "A" && y.know) SIDES.forEach(s => { o.know[s] = y.know[s] === true; });
    });
    SIDES.forEach(s => {
      const f = x.fam && x.fam[s]; if(!f || typeof f !== "object") return;
      ROLES.forEach(r => {
        const p = f[r]; if(!p || typeof p !== "object") return;
        const q = b.fam[s][r];
        q.on = p.on !== false;
        q.home = str(p.home, MAX.home);
        q.likes = Array.isArray(p.likes) ? p.likes.filter((l, i, a) => LIKES.some(L => L[0] === l) && a.indexOf(l) === i) : [];
        q.like2 = str(p.like2, MAX.like2);
        q.job = str(p.job, MAX.job);
      });
      b.fam[s].sib = str(f.sib, MAX.sib);
      b.fam[s].avoid = str(f.avoid, MAX.avoid);
    });
    SIDES.forEach(s => {
      const k = x.kid && x.kid[s];
      b.kid[s] = Array.isArray(k) ? k.filter((n, i, a) => Number.isInteger(n) && n >= 0 && n < T.praise.length && a.indexOf(n) === i).slice(0, PRAISE_MAX) : [];
    });
    b.story = str(x.story, MAX.story);
    b.menu = str(x.menu, MAX.menu);
    b.last = typeof x.last === "string" ? x.last.slice(0, 12) : "";
    return b;
  }

  // ===== 한국어 조사 (은/는 · 이/가 · 을/를) =====
  function lastChar(s){
    const m = String(s).match(/[가-힣A-Za-z0-9](?=[^가-힣A-Za-z0-9]*$)/);
    return m ? m[0] : "";
  }
  function hasBatchim(s){
    const c = lastChar(s); if(!c) return false;
    const n = c.charCodeAt(0);
    if(n >= 0xAC00 && n <= 0xD7A3) return (n - 0xAC00) % 28 !== 0;
    if(/[0-9]/.test(c)) return "013678".includes(c);
    return false;
  }
  const JOSA = { "은는": ["은", "는"], "이가": ["이", "가"], "을를": ["을", "를"], "과와": ["과", "와"] };
  // "{own}{은는}"처럼 쓰면 바로 앞 글자를 보고 조사를 골라요
  function fill(s, o){
    s = String(s); let out = "", last = 0;
    s.replace(/\{([^{}\s]+)\}/g, (m, k, idx) => {
      out += s.slice(last, idx); last = idx + m.length;
      if(JOSA[k]) out += hasBatchim(out) ? JOSA[k][0] : JOSA[k][1];
      else out += (o && o[k] != null) ? o[k] : "";
      return m;
    });
    return out + s.slice(last);
  }
  const tidy = s => String(s).replace(/\s+/g, " ").trim();

  // ===== 이름 · 부르는 말 =====
  const nm = (S, s) => S.names[s] || T.sideName[s];
  const kidRef = (S, s) => S.names[s] ? S.names[s] + T.nameSuffix : T.kidOf[s];     // 상대 부모님께 말할 때
  const label = x => T.sideName[x.side] + " " + T.honor[x.role];                       // "신랑 아버님"
  const toOne = x => fill(T.to.one, { side: T.sideName[x.side], honor: T.honor[x.role] });
  const toParents = s => fill(T.to.parents, { side: T.sideName[s] });

  // ===== 가족 정보 =====
  function people(S, side){
    const L = [];
    SIDES.forEach(s => { if(side && s !== side) return; ROLES.forEach(r => { const p = S.fam[s][r]; if(p.on) L.push({ side: s, role: r, p }); }); });
    return L;
  }
  const norm = s => String(s).replace(/[\s·]/g, "");
  function likesOf(p){
    const a = p.likes.slice();
    String(p.like2 || "").split(/[,/、]+/).map(x => tidy(x)).filter(Boolean).forEach(x => { if(!a.some(y => norm(y) === norm(x))) a.push(x); });
    return a;
  }
  const grpOf = like => { const f = LIKES.find(l => norm(l[0]) === norm(like)); return f ? f[1] : ""; };
  const likeQ = like => { const f = LIKES.find(l => norm(l[0]) === norm(like)); return f ? T.likeQ[f[0]] : T.likeQOther; };
  const PROV = { "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산",
    "세종특별자치시": "세종", "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북",
    "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주도": "제주", "제주특별자치도": "제주" };
  function placeTokens(s){
    return String(s || "").split(/[\s,·/]+/).map(t => t.trim()).filter(Boolean).map(t => {
      if(PROV[t]) return PROV[t];
      t = t.replace(/(특별자치시|특별자치도|특별시|광역시)$/, "");
      return t.length > 2 ? t.replace(/(시|군|구|도)$/, "") : t;
    }).filter(t => t.length >= 2);
  }
  // 보여 줄 고향 한 단어: 시 · 군 > 광역시 > 도 > 구 ("대구광역시 수성구" → 대구, "경상북도 안동시" → 안동)
  const DO = ["경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  function placeMain(s){
    const raw = String(s || "").split(/[\s,·/]+/).map(t => t.trim()).filter(Boolean);
    const toks = placeTokens(s);
    if(!toks.length) return "";
    if(toks.length !== raw.length) return toks[0];
    const lvl = (t, i) => /구$/.test(raw[i]) && raw.length > 1 ? 3 : DO.includes(t) ? 2 : 0;
    return toks.map((t, i) => [t, lvl(t, i), i]).sort((x, y) => x[1] - y[1] || x[2] - y[2])[0][0];
  }
  const hasInfo = p => !!(likesOf(p).length || p.home.trim() || p.job.trim());

  // 두 집 잇기: 신랑 쪽 한 분 × 신부 쪽 한 분 (아버지끼리 · 어머니끼리 먼저)
  function bridges(S){
    const out = [];
    const pairs = [];
    people(S, "g").forEach(a => people(S, "b").forEach(b => pairs.push([a, b])));
    pairs.sort((x, y) => (x[0].role === x[1].role ? 0 : 1) - (y[0].role === y[1].role ? 0 : 1));
    const used = new Set(), key = x => x.side + x.role;
    pairs.forEach(([a, b]) => {
      const la = likesOf(a.p), lb = likesOf(b.p);
      const common = la.filter(x => lb.some(y => norm(y) === norm(x)));
      if(common.length){ out.push({ kind: "sameLike", a, b, like: common[0] }); used.add(key(a)); used.add(key(b)); }
    });
    pairs.forEach(([a, b]) => {     // 묶음만 같은 것 (같은 분이 두 번 나오지 않게)
      if(used.has(key(a)) || used.has(key(b))) return;
      const la = likesOf(a.p), lb = likesOf(b.p);
      const ga = la.map(grpOf), gb = lb.map(grpOf);
      const g = ga.find(x => x && x !== "pet" && gb.includes(x));
      if(g){ out.push({ kind: "grpLike", a, b, grp: g, likeA: la[ga.indexOf(g)], likeB: lb[gb.indexOf(g)] }); used.add(key(a)); used.add(key(b)); }
    });
    pairs.forEach(([a, b]) => {
      const tb = placeTokens(b.p.home);
      const t = placeTokens(a.p.home).find(x => tb.includes(x));
      if(t) out.push({ kind: "sameHome", a, b, place: t });
    });
    const rank = { sameLike: 0, sameHome: 1, grpLike: 2 };
    return out.map((x, i) => [x, i]).sort((x, y) => rank[x[0].kind] - rank[y[0].kind] || x[1] - y[1]).map(x => x[0]);
  }

  // ===== 카드 =====
  // 카드 = { id, m(순간), from: g|b|both, to(누구에게), line, why, custom }
  function bridgeCard(br, sp, n){
    const own = br.a.side === sp ? br.a : br.b, oth = own === br.a ? br.b : br.a;
    const o = { own: T.role[own.role], other: T.honor[oth.role], a: label(br.a), b: label(br.b) };
    let line, why;
    if(br.kind === "sameLike"){
      line = fill(T.say.sameLike, Object.assign(o, { like: br.like, q: likeQ(br.like) }));
      why = fill(T.say.sameLikeWhy, Object.assign(o, { like: br.like }));
    } else if(br.kind === "grpLike"){
      const ownLike = own === br.a ? br.likeA : br.likeB, othLike = own === br.a ? br.likeB : br.likeA;
      line = fill(T.say.grpLike, Object.assign(o, { likeA: ownLike, likeB: othLike, grp: T.grp[br.grp] }));
      why = fill(T.say.grpLikeWhy, Object.assign(o, { likeA: br.likeA, likeB: br.likeB }));
    } else {
      line = fill(T.say.sameHome, Object.assign(o, { place: br.place }));
      why = fill(T.say.sameHomeWhy, Object.assign(o, { place: br.place }));
    }
    return { id: "br" + n, kind: br.kind, m: "m3", from: sp, to: toOne(oth), line, why, custom: true };
  }

  function customCards(S){
    const B = bridges(S), cards = [];
    const usedLike = new Set(), usedHome = new Set();
    B.forEach((br, i) => {
      cards.push(bridgeCard(br, i % 2 === 0 ? "g" : "b", i));
      const key = x => x.side + x.role;
      if(br.kind !== "sameHome"){ usedLike.add(key(br.a)); usedLike.add(key(br.b)); }
      if(br.kind === "sameHome"){ usedHome.add(key(br.a)); usedHome.add(key(br.b)); }
    });
    // 꼬리 질문: 상대 쪽 자녀가 그 부모님께
    people(S).forEach(x => {
      const sp = other(x.side), k = x.side + x.role, who = { other: T.honor[x.role], a: label(x) };
      const likes = likesOf(x.p);
      if(likes.length && !usedLike.has(k)){
        const like = likes[0];
        cards.push({ id: "tl" + k, kind: "tailLike", m: "m3", from: sp, to: toOne(x), line: fill(T.say.tailLike, Object.assign({ like, q: likeQ(like) }, who)), why: fill(T.say.tailLikeWhy, Object.assign({ like }, who)), custom: true });
      }
      const home = placeMain(x.p.home);
      if(home && !usedHome.has(k)){
        cards.push({ id: "th" + k, kind: "tailHome", m: "m3", from: sp, to: toOne(x), line: fill(T.say.tailHome, Object.assign({ place: home }, who)), why: fill(T.say.tailHomeWhy, Object.assign({ place: home }, who)), custom: true });
      }
      const job = tidy(x.p.job);
      if(job){
        cards.push({ id: "tj" + k, kind: "tailJob", m: "m3", from: sp, to: toOne(x), line: fill(T.say.tailJob, Object.assign({ job }, who)), why: fill(T.say.tailJobWhy, Object.assign({ job }, who)), custom: true });
      }
    });
    // 같은 사람에게 묻는 꼬리 질문이 몰리지 않게: 다리(두 집 잇기) 먼저, 그다음 꼬리 질문을 신랑 쪽 · 신부 쪽 번갈아
    const br = cards.filter(c => c.id.startsWith("br")), tl = cards.filter(c => !c.id.startsWith("br"));
    const tg = tl.filter(c => c.from === "b"), tb = tl.filter(c => c.from === "g"), mix = [];
    for(let i = 0; i < Math.max(tg.length, tb.length); i++){ if(tg[i]) mix.push(tg[i]); if(tb[i]) mix.push(tb[i]); }
    return br.concat(mix);
  }

  // 형제자매 · 칭찬 · 만난 이야기 · 메뉴 (적은 것으로 만든 카드)
  function typedCards(S){
    const L = [];
    SIDES.forEach(s => {
      const o = other(s), picks = S.kid[o];
      if(picks.length){
        const say = picks.map(i => T.praise[i][0]);
        L.push({ id: "pr" + s, kind: "praise", m: "m3", from: s, to: toParents(o), line: fill(T.say.praise, { kid: kidRef(S, o), say: say[0] }), why: say.join(" · "), custom: true });
      }
    });
    SIDES.forEach(s => {
      const sib = tidy(S.fam[s].sib);
      if(sib) L.push({ id: "sb" + s, kind: "sib", m: "m3", from: other(s), to: fill(T.say.sibTo, { side: T.sideOf[s], sib }), line: T.say.sib, why: "", custom: true });
    });
    if(tidy(S.story)) L.push({ id: "st", kind: "story", m: "m3", from: "both", to: T.say.storyHint, line: fill(T.say.story, { story: tidy(S.story) }), why: "", custom: true, hint: true });
    return L;
  }

  function introCard(S, s, first){
    const f = S.fam[s], k = f.fa.on && f.mo.on ? "both" : f.fa.on ? "fa" : f.mo.on ? "mo" : "none";
    const sib = tidy(f.sib), name = tidy(S.names[s]);
    const line = tidy(fill(first ? T.say.introFirst : T.say.introSecond, {
      fam: T.say.introFam[k], sib: sib ? fill(T.say.introSib, { sib }) : "", me: name ? fill(T.say.introMe, { name }) : ""
    }));
    return { id: "in" + s, kind: "intro", m: "m1", from: s, to: T.to.all, line, why: "", custom: false };
  }

  function askCards(S){
    const L = [];
    if(S.items.hanbok.pick === "ask") L.push({ id: "akh", kind: "ask", m: "m3", from: "both", to: T.to.both, line: T.say.askHanbok, why: T.say.askWhy, custom: false });
    if(S.items.date.pick === "later") L.push({ id: "akd", kind: "ask", m: "m3", from: "both", to: T.to.both, line: T.say.askDate, why: T.say.askWhy, custom: false });
    L.push({ id: "aka", kind: "ask", m: "m3", from: "both", to: T.to.both, line: T.say.askAny, why: T.say.askWhy, custom: false });
    return L;
  }

  function basicCards(S){
    const first = S.items.first.pick || "g";
    const kids = [
      { id: "chb", kind: "childhood", m: "m3", from: "b", to: toParents("g"), line: fill(T.say.childhood, { kid: kidRef(S, "g") }), why: T.say.childhoodWhy, custom: false },
      { id: "chg", kind: "childhood", m: "m3", from: "g", to: toParents("b"), line: fill(T.say.childhood, { kid: kidRef(S, "b") }), why: "", custom: false }
    ];
    const L = [
      introCard(S, first, true), introCard(S, other(first), false),
      { id: "op", kind: "opener", m: "m1", from: "both", to: T.to.both, line: T.say.opener, why: "", custom: false },
      { id: "mn", kind: "menu", m: "m2", from: "both", to: T.to.both, line: tidy(S.menu) || T.say.menu, why: "", custom: !!tidy(S.menu) }
    ].concat(kids, askCards(S));
    if(S.items.hanbok.pick === "hanbok") L.push({ id: "phb", kind: "prep", m: "m3", from: "both", to: T.to.both, line: T.say.prepHanbok, why: "", custom: false });
    if(S.items.gift.pick === "us") L.push({ id: "gf", kind: "gift", m: "m4", from: "both", to: T.to.both, line: T.say.gift, why: "", custom: false });
    L.push({ id: "bl", kind: "blessing", m: "m4", from: "both", to: T.to.both, line: T.say.blessing, why: "", custom: false });
    L.push({ id: "rs", kind: "resolve", m: "m4", from: "both", to: T.to.both, line: T.say.resolve, why: "", custom: false });
    return L;
  }

  // 화제 카드 화면: 맞춤(적은 것으로) + 누구에게나
  function topics(S){
    const custom = customCards(S).concat(typedCards(S));
    if(tidy(S.menu)) custom.push(basicCards(S).find(c => c.kind === "menu"));
    const basic = basicCards(S).filter(c => c.kind !== "intro" && !(c.kind === "menu" && c.custom));
    return { custom, basic };
  }

  // ===== 1. 우리 결론 · 양가가 아시는지 =====
  const pickOf = (S, k) => S.items[k].pick;
  function shortOf(S, k){
    const x = S.items[k], p = x.pick; if(!p) return "";
    if(p === "undecided") return T.undecided;
    const d = T.items[k].picks[p], note = tidy(x.note);
    if(k === "date" && p === "set" && note) return note;
    return (d.short || d.l) + (note ? " · " + note : "");
  }
  function knowInfo(S){
    const rows = ITEMS.filter(it => it.grp === "A" && S.items[it.k].pick).map(it => ({ k: it.k, x: S.items[it.k] }));
    const decided = rows.filter(r => r.x.pick !== "undecided");
    return {
      rows, decided,
      undecided: rows.filter(r => r.x.pick === "undecided").map(r => r.k),
      total: decided.length,
      all: decided.filter(r => r.x.know.g && r.x.know.b).length,
      missing: { g: decided.filter(r => !r.x.know.g).map(r => r.k), b: decided.filter(r => !r.x.know.b).map(r => r.k) }
    };
  }
  function tellLine(S, k){
    const x = S.items[k], d = T.items[k].picks[x.pick];
    let t = d && d.tell || "";
    const note = tidy(x.note);
    if(note && k === "date") t = t.replace(/\.$/, "") + ": " + note + ".";
    if(note && k === "home" && x.pick === "two") t = t.replace(/\.$/, "") + " (" + note + ").";
    return t;
  }
  const askLine = k => fill(T.askLine, { item: T.items[k].name });
  const answered = S => ITEMS.filter(it => S.items[it.k].pick).length;

  // ===== 3. 부모님께 보낼 판 =====
  function fmtDate(d){
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if(!m) return "";
    const w = new Date(+m[1], +m[2] - 1, +m[3]).getDay();
    return fill(T.dateFmt, { m: +m[2], d: +m[3], w: T.week[w] });
  }
  const whenOf = S => [fmtDate(S.meet.date), tidy(S.meet.place)].filter(Boolean).join(" · ");
  const callOf = f => f.fa.on && f.mo.on ? "both" : f.fa.on ? "fa" : f.mo.on ? "mo" : "none";
  const listJoin = a => a.join(" · ");

  function board(S, s){
    const o = other(s), me = S.fam[s], them = S.fam[o];
    const K = knowInfo(S);
    const missing = K.missing[s];
    const first = pickOf(S, "first");
    const sideW = T.sideName[o];
    const secs = [];
    // 상견례 날: 인사 · 언제 · 흐름
    const a = [];
    const call = T.pb.call[callOf(me)];
    a.push({ type: "lead", text: call ? fill(T.pb.hi, { call }) : fill(T.pb.hi, { call: "" }).replace(/^,\s*/, "") });
    const when = whenOf(S);
    a.push({ type: "when", t: when ? T.pb.when : "", text: when, sub: T.pb.early });
    const flow = T.pb.flow.map((x, i) => i ? x : first ? fill(x, { first: T.sideOf[first] }) : x.replace(/\s*\(\{first\}부터\)/, ""));
    if(pickOf(S, "gift") === "us") flow.splice(2, 0, T.pb.flowGift);
    a.push({ type: "list", t: T.pb.flowT, items: flow, num: true });
    secs.push({ t: T.pb.p1, blocks: a });
    // 알아 두실 것
    const know = ["pay", "gift", "dress", "talk"].map(k => { const p = pickOf(S, k), d = p && T.items[k].picks[p]; return d && d.board; }).filter(Boolean);
    if(know.length) secs.push({ t: T.pb.knowT, blocks: [{ type: "list", t: "", items: know }] });
    // 이렇게 말씀해 주세요
    const b = [];
    const tc = callOf(them);
    if(tc !== "none") b.push({ type: "p", t: T.pb.callT, text: fill(tc === "both" ? T.pb.callBoth : tc === "fa" ? T.pb.callFa : T.pb.callMo, { other: sideW }) });
    b.push({ type: "quote", t: T.pb.openT, text: T.pb.open });
    const pk = S.kid[o];
    b.push({ type: "quote", t: fill(T.pb.praiseT, { kid: T.kidOf[o] }),
      text: pk.length ? fill(T.pb.praise, { kid: T.kidOf[o], dr: T.praise[pk[0]][1] }) : fill(T.pb.praiseAny, { kid: T.kidOf[o] }),
      sub: pk.length > 1 ? fill(T.pb.praiseMore, { list: pk.slice(1).map(i => T.praise[i][0]).join(" · ") }) : "" });
    b.push({ type: "quote", t: T.pb.kidT, text: fill(T.pb.kid, { kid: T.kidOf[o] }), sub: T.pb.kidMine });
    const askItems = [];
    if(pickOf(S, "hanbok") === "ask") askItems.push(T.items.hanbok.name);
    if(pickOf(S, "date") === "later") askItems.push(T.items.date.name);
    b.push({ type: "p", t: T.pb.askT, text: T.pb.ask, sub: askItems.length ? fill(T.pb.askItem, { list: listJoin(askItems) }) : "" });
    secs.push({ t: T.pb.p2, blocks: b });
    // 사돈댁 이야기거리 (적은 게 있을 때만)
    const c = [];
    const mine = bridges(S).filter(x => x.a.side === s || x.b.side === s).slice(0, 2).map(x => {
      const m = x.a.side === s ? x.a : x.b, t = m === x.a ? x.b : x.a;
      const v = { me: T.role[m.role], them: T.sadon[t.role] };
      if(x.kind === "sameLike") return fill(T.pb.bridgeLike, Object.assign(v, { like: x.like, q: likeQ(x.like) }));
      if(x.kind === "sameHome") return fill(T.pb.bridgeHome, Object.assign(v, { place: x.place }));
      const like = m === x.a ? x.likeB : x.likeA;
      return fill(T.pb.bridgeGrp, Object.assign(v, { like, q: likeQ(like) }));
    });
    if(mine.length) c.push({ type: "list", t: T.pb.bridgeT, items: mine });
    const info = people(S, o).filter(x => hasInfo(x.p)).map(x => {
      const bits = [];
      const h = placeMain(x.p.home); if(h) bits.push(fill(T.pb.infoHome, { place: h }));
      likesOf(x.p).forEach(l => bits.push(l));
      if(tidy(x.p.job)) bits.push(tidy(x.p.job));
      return fill(T.pb.info, { them: T.sadon[x.role], list: bits.join(", ") });
    });
    if(tidy(them.sib)) info.push(fill(T.pb.info, { them: T.sibL, list: tidy(them.sib) }));
    if(info.length) c.push({ type: "list", t: mine.length ? T.pb.infoSub : "", items: info });
    if(c.length) secs.push({ t: fill(T.pb.infoT, { other: sideW }), blocks: c });
    // 이 얘기는 빼 주세요
    const av = T.pb.avoid.slice();
    if(tidy(them.avoid)) av.push(fill(T.pb.avoidFam, { other: sideW, x: tidy(them.avoid) }));
    secs.push({ t: T.pb.p3, blocks: [{ type: "list", t: "", items: av, no: true }, { type: "p", t: T.pb.passT, text: T.pb.pass }] });
    // 이미 정한 것
    const done = K.decided.filter(r => r.x.know[s]).map(r => ({ name: T.items[r.k].name, val: shortOf(S, r.k), both: !!r.x.know[o] }));
    const d = [{ type: "done", t: "", items: done, empty: T.pb.doneNone,
      sub: K.undecided.length ? fill(T.pb.undec, { list: listJoin(K.undecided.map(k => T.items[k].name)) }) : "" }];
    const name = tidy(S.names[s]);
    if(name) d.push({ type: "from", text: fill(T.pb.from, { name }) });
    secs.push({ t: T.pb.doneT, blocks: d });
    return { sections: secs, missing, undecided: K.undecided };
  }

  // 판을 카톡 글로
  function boardText(S, s){
    const B = board(S, s), L = [fill(T.textHead, { side: T.sideName[s] }), ""];
    B.sections.forEach((pg, i) => {
      L.push("■ " + pg.t);
      pg.blocks.forEach(b => {
        if(b.t) L.push("[" + b.t + "]");
        if(b.type === "list") b.items.forEach((x, j) => L.push((b.num ? (j + 1) + ". " : "- ") + x));
        else if(b.type === "done"){ if(b.items.length) b.items.forEach(x => L.push((x.both ? "✓ " : "- ") + x.name + ": " + x.val)); else L.push(b.empty); if(b.items.some(x => x.both)) L.push(T.pb.doneLegend); }
        else if(b.type === "quote") L.push("\"" + b.text + "\"");
        else if(b.text) L.push(b.text);
        if(b.sub) L.push(b.sub);
      });
      if(i < B.sections.length - 1) L.push("");
    });
    return L.join("\n");
  }

  // ===== 4. 당일 한 장 =====
  function day(S){
    const first = pickOf(S, "first") || "g";
    const B = basicCards(S), C = customCards(S), Y = typedCards(S);
    const byKind = k => B.filter(c => c.kind === k);
    const m3 = [];
    const cust = C.slice(0, 2);
    cust.forEach(c => m3.push(c));
    m3.push(askCards(S)[0]);
    byKind("childhood").forEach(c => m3.push(c));
    Y.filter(c => c.kind === "praise").forEach(c => m3.push(c));
    byKind("prep").forEach(c => m3.push(c));
    const sib = Y.find(c => c.kind === "sib"); if(sib) m3.push(sib);
    const moments = T.moments.map(([k, t, sub]) => ({ k, t, sub,
      cards: k === "m1" ? B.filter(c => c.m === "m1") : k === "m2" ? byKind("menu") : k === "m3" ? m3.slice(0, 8) : B.filter(c => c.m === "m4") }));
    const steps = T.steps.map(([a, b]) => [a, tidy(fill(b, { pay: pickOf(S, "pay") === "us" ? T.stepPay : "", gift: pickOf(S, "gift") === "us" ? T.stepGift : "", first: T.sideOf[first] }))]);
    const fix = T.fix.slice();
    if(pickOf(S, "talk") === "confirm") fix.splice(3, 0, { when: T.fixConfirmWhen, line: T.say.confirm, how: "" });
    const avoid = T.avoid.slice();
    SIDES.forEach(s => { const a = tidy(S.fam[s].avoid); if(a) avoid.push(fill(T.avoidFam, { side: T.sideOf[s], x: a })); });
    const match = [];
    const dn = tidy(S.items.date.note); if(dn && pickOf(S, "date") === "set") match.push([T.matchDate, dn]);
    const hp = pickOf(S, "home"); if(hp && hp !== "undecided") match.push([T.matchHome, shortOf(S, "home")]);
    if(tidy(S.story)) match.push([T.matchStory, tidy(S.story)]);
    const head = SIDES.filter(s => tidy(S.names[s])).map(s => fill(T.dayHead[s], { name: tidy(S.names[s]) })).join(" · ");
    return { head, when: whenOf(S), steps, moments, fix, avoid, match, quiet: T.quiet, after: T.say.thanks };
  }

  // 화장실에서 볼 한 화면
  function glance(S){
    const D = day(S), first = pickOf(S, "first") || "g";
    const m3 = D.moments[2].cards.find(c => c.custom && c.kind !== "story" && c.kind !== "sib") || D.moments[2].cards[0];
    const rows = T.glanceRows.map(([a, b], i) => {
      let v = tidy(fill(b, { first: T.sideOf[first], gift: pickOf(S, "gift") === "us" ? T.stepGift : "" }));
      if(i === 0) v = v + " · “" + T.say.opener + "”";
      if(i === 1) v = "“" + D.moments[1].cards[0].line + "”";
      if(i === 2) v = "“" + m3.line + "”";
      if(i === 3) v = v + " · “" + T.say.blessing + "”";
      return [a, v];
    });
    rows.push([T.glanceFix, T.glanceFixV]);
    rows.push([T.glanceMoney, "“" + T.fix[2].line + "”"]);
    return { rows, when: D.when };
  }

  function dayText(S){
    const D = day(S), who = c => c.from === "both" ? T.fromBoth : T.sideName[c.from];
    const L = ["[" + [T.dayKind, D.head, D.when].filter(Boolean).join(" · ") + "]", ""];
    L.push("■ " + T.stepsT); D.steps.forEach(([a, b]) => L.push("- " + a + ": " + b));
    D.moments.forEach(m => { L.push(""); L.push("■ " + m.t); m.cards.forEach(c => L.push("- (" + who(c) + " → " + c.to + ") " + c.line)); });
    L.push(""); L.push("■ " + T.fixTitle); D.fix.forEach(f => L.push("- " + f.when + ": " + f.line));
    L.push(""); L.push("■ " + T.avoidTitle); D.avoid.forEach(a => L.push("- " + a));
    if(D.match.length){ L.push(""); L.push("■ " + T.matchT); D.match.forEach(([a, b]) => L.push("- " + a + ": " + b)); }
    L.push(""); L.push("■ " + T.afterT); L.push("- " + D.after);
    return L.join("\n");
  }

  return { SIDES, ROLES, ITEMS, IT, LIKES, MAX, PRAISE_MAX, other, blank, clean, fill, hasBatchim, placeTokens, likesOf, bridges,
    placeMain, customCards, typedCards, basicCards, topics, shortOf, knowInfo, tellLine, askLine, answered, fmtDate, whenOf, board, boardText, day, dayText, glance, nm, kidRef };
})();
if(typeof module !== "undefined") module.exports = CORE;
