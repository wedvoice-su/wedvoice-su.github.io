// 성혼선언문 만들기 (샘플): 읽는 분 고르기 → 정석 선언문 / 우리 이야기(질문 3~4개) → 선언문 카드
// 문장은 docs/성혼선언문/문구.txt (11/5 검수 반영). 번호(A-1, E-2 …)는 문구.txt 번호
// 화면 구조·줄 손보기·보관 방식은 혼인서약서(promise-to-wed/app.js)와 같아요. 공통 기능은 shared/common.js

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/declared-wed/?preview) — 2026-11-09 공개(true)
// 주소는 11/5 i-now-pronounce/ → declared-wed/ (사회자님: 결혼이 성립되었음을 선언 → declare + wed). 보관 키 i-now-pronounce.v1은 그대로 (덕담이 이름을 가져가요)
const OPEN = true;
const SEC_PER_CHAR = 1/4;   // 1초에 4자 (참고용, 혼인서약서와 같은 계산. 11/5 사회자님: 그대로)
const LIMIT_SEC = 180;      // 3분 (11/5 사회자님: 혼인서약서·덕담과 같게 넉넉하게. 처음엔 식순표처럼 사회자 1분 · 어른 2분)

// ===== 읽는 분 =====
const READERS = {
  mc: { chip:"사회자",      call:"사회자님", self:"",              sign:"사회자",      parent:false, side:"" },
  gf: { chip:"신랑 아버님", call:"아버님",   self:"신랑의 아버지", sign:"신랑 아버지", parent:true,  side:"g" },
  bf: { chip:"신부 아버님", call:"아버님",   self:"신부의 아버지", sign:"신부 아버지", parent:true,  side:"b" },
  gm: { chip:"신랑 어머님", call:"어머님",   self:"신랑의 어머니", sign:"신랑 어머니", parent:true,  side:"g" },
  bm: { chip:"신부 어머님", call:"어머님",   self:"신부의 어머니", sign:"신부 어머니", parent:true,  side:"b" }
};

// ===== 문장 =====
// 표시: {신랑} {신부} 이름 · {신랑군과} {신부양이}처럼 군·양과 조사 자동 ("이름만"을 고르면 군·양 없이 이름 + 조사)
//       {두사람은} 처음 나올 때만 "신랑 ○○○ 군과 신부 ○○○ 양은", 그다음부터 "두 사람은" ({이제두사람은}은 "이제 두 사람은")
//       {자기소개} "신랑의 아버지 ○○○" · {이에} 바람 줄이 있으면 "그 바람을 담아", 없으면 "이에"
const STYLES = ["정석","따뜻하게","짧게"];
// A 인사 (어른이 읽을 때만)
const GREET = [["intro","내 소개"],["sadon","사돈께 감사"],["guests","하객께 감사"]];
const A_INTRO = "안녕하세요. {자기소개}입니다.";  // A-1
const A_SADON = {  // A-2 (샘플 1)
  g:"먼저, 신부를 훌륭하게 키워 우리 아들과 귀한 인연을 맺어 주신 사돈 내외분께 깊이 감사드립니다.",
  b:"먼저, 신랑을 훌륭하게 키워 우리 딸과 귀한 인연을 맺어 주신 사돈 내외분께 깊이 감사드립니다." };
const A_GUESTS = [  // A-3 사돈 인사 뒤 / A-3b 사돈 인사 없이 (샘플 1)
  "그리고 바쁘신 중에도 두 사람의 결혼을 축하하기 위해 함께해 주신 양가 친지와 하객 여러분께도 감사의 인사를 올립니다.",
  "바쁘신 중에도 두 사람의 결혼을 축하하기 위해 함께해 주신 양가 친지와 하객 여러분께 감사의 인사를 올립니다." ];
// B 소개 [정석, 따뜻하게] (짧게는 없음)
const B_LINES = {
  mc:["오늘 {두사람은} 양가 부모님의 정성과 사랑 속에 훌륭하게 자라, 이 자리에 서게 되었습니다.",  // B-1 (샘플 2)
      "서로 다른 곳에서 자란 {두사람은}, 서로를 알아보고 오늘 이 자리에 함께 섰습니다."],         // B-3 (새로 씀)
  p: ["오늘 {두사람은} 양가 부모의 정성과 가르침 속에 반듯하게 자라, 이 자리에 섰습니다."]          // B-2 (샘플 1, 어른은 "부모님" 대신 "부모")
};
const B_WARM = {  // B-4 (샘플 4) 어른·따뜻하게 첫 줄
  g:"지금 제 앞에는, 제가 세상에서 가장 사랑하는 아들 {신랑}, 그리고 아들이 세상에서 가장 사랑하는 사람 {신부양이} 서 있습니다.",
  b:"지금 제 앞에는, 제가 세상에서 가장 사랑하는 딸 {신부}, 그리고 딸이 세상에서 가장 사랑하는 사람 {신랑군이} 서 있습니다." };
const B_WARM2 = "두 사람이 양가 부모의 정성 속에 바르게 자라 오늘의 인연에 이른 것을, 한없이 기쁘게 생각합니다.";  // B-5 (샘플 4)
// C 우리 이야기 (질문) — "{때}, {곳} 처음 만난 {두사람은} {연애}."
const MEET = [  // M-1~8 [칩, 들어가는 말] (혼인서약서와 같은 칩)
  ["소개팅","소개팅 자리에서"],["같은 회사","같은 회사에서"],["같은 학교","같은 학교에서"],
  ["동호회·모임","같은 모임에서"],["친구 소개","친구의 소개로"],["오랜 친구","친구로"],
  ["앱·온라인","휴대폰 화면 너머로"],["여행지","낯선 여행지에서"] ];
const LOVE0 = "서로에게 스며들어 사랑을 키워 왔습니다";  // C-0 연애 한마디를 안 골랐을 때
const LOVE = [  // C-1~9 (혼인서약서와 같은 칩, 문장은 3인칭으로)
  ["오래 만났어요","오랜 시간 서로의 곁을 지키며 사랑을 키워 왔습니다"],
  ["장거리 연애","먼 길을 오가며 만나던 시간을 지나, 마침내 같은 집으로 돌아가게 되었습니다"],
  ["힘든 시기를 함께 견뎠어요","힘든 날에도 서로의 손을 놓지 않고, 함께 오늘에 이르렀습니다"],
  ["짧게 만나고 확신했어요","길지 않은 시간에도, 서로가 평생의 짝임을 단번에 알아보았습니다"],
  ["친구에서 연인으로","가장 편한 친구에서 서로에게 가장 소중한 사람이 되었습니다"],
  ["여행을 많이 다녔어요","함께 떠난 수많은 여행길 끝에서, 평생 같이 걸을 사람을 알아보았습니다"],
  ["반려동물과 함께","함께 아껴 온 반려동물과 더불어, 정식으로 한 가족이 됩니다"],
  ["늦게 찾아온 인연","조금 늦게 찾아온 인연이기에, 서로를 더 소중히 여겨 왔습니다"],
  ["많이 싸우고 많이 화해했어요","많이 다투고 그보다 더 많이 화해하며, 서로를 깊이 알아 왔습니다"] ];
// D 혼인서약 다시 짚기 (질문). 넣으면 E 약속 줄은 빠져요 (샘플 3·4처럼 서약 → 선언)
const D1_LINE = "조금 전, {두사람은} 여러분 앞에서 혼인서약을 나누었습니다.";  // D-1 (샘플 3)
const D0_LINE = "어떤 어려움 앞에서도 서로를 사랑하고 아끼며, 존중하고 지켜 주겠다는 약속이었습니다.";  // D-2 약속을 안 골랐을 때 (샘플 4)
// D-3 "신랑은 {약속} 약속했고, 신부는 {약속} 약속하였습니다." / D-4 한 사람만: "신랑은 {약속} 약속하였습니다."
// D-5 같은 약속을 고르면: "두 사람 모두 {약속} 약속하였습니다." ({상대}는 서로)
const PROM = [  // V-01~15 [칩, "~것을"]  {상대} 신랑의 약속이면 신부, 신부의 약속이면 신랑
  ["곁을 지키기","어떤 어려움이 다가와도 언제나 {상대를} 사랑하고 아끼며 곁을 지킬 것을"],
  ["든든한 편 되기","언제나 {상대를} 믿고 존중하며 가장 든든한 편이 되어 줄 것을"],
  ["먼저 사과하기","서운한 날엔 하루를 넘기지 않고 먼저 손을 내밀 것을"],
  ["표현 아끼지 않기","사랑한다는 말, 고맙다는 말을 아끼지 않을 것을"],
  ["대화로 풀기","화가 나는 날에도 비난보다 대화를 먼저 꺼낼 것을"],
  ["쉼터 되기","지친 하루 끝에 가장 편안한 쉼터가 되어 줄 것을"],
  ["꿈 응원하기","{상대의} 꿈을 자기 꿈처럼 응원할 것을"],
  ["양가 부모님 공경","{상대의} 부모님을 친부모님처럼 아끼고 공경할 것을"],
  ["믿음 주기","작은 거짓말도 하지 않고 말과 행동으로 믿음을 줄 것을"],
  ["집안일 함께","집안일은 돕는 것이 아니라 함께하는 것임을 잊지 않을 것을"],
  ["다름 존중","서로 다른 생각도 있는 그대로 존중할 것을"],
  ["처음 마음 지키기","처음 만난 날의 설렘을 평생 지킬 것을"],
  ["가정을 첫자리에","무슨 일이 있어도 가정을 첫자리에 둘 것을"],
  ["건강 챙기기","{상대} 곁에 오래 있을 수 있도록 건강을 잘 챙길 것을"],
  ["혼자만의 시간","{상대에게} 혼자만의 시간도 선물할 것을"] ];
// E 약속 [정석, 따뜻하게, 짧게]
const E_LINES = [
  "{이제두사람은} 가족과 친지, 친구와 동료들이 지켜보는 이 자리에서 기쁠 때나 힘들 때나 평생을 함께할 부부가 되기를 굳게 약속하였습니다.",  // E-1 (샘플 1)
  "{이제두사람은} 가족과 친지, 소중한 분들을 모신 이 자리에서 기쁨도 슬픔도 평생 함께 나누는 부부가 되기를 굳게 약속하였습니다.",           // E-2 (샘플 2)
  "{이제두사람은} 오늘 이 자리에 모인 가족과 친지, 모든 분들 앞에서 평생을 함께할 부부가 되기를 굳게 약속하였습니다." ];                       // E-3 (샘플 6) 사회자·짧게
const E_SHORT_P = {  // E-4 (샘플 8) 어른·짧게
  g:"여러분의 축복 속에서, 든든한 아들 {신랑군과} 보석 같은 며느리 {신부양이} 일생의 동반자로 함께할 부부가 되기를 약속하였습니다.",
  b:"여러분의 축복 속에서, 든든한 사위 {신랑군과} 보석 같은 딸 {신부양이} 일생의 동반자로 함께할 부부가 되기를 약속하였습니다." };
// F 바람 (질문) — 넣으면 선언 줄이 "이에" 대신 "그 바람을 담아"로 시작
const WISH = [  // F-1~5
  ["화목한 가정","두 사람이 오늘의 다짐을 늘 마음에 간직하며, 행복하고 화목한 가정을 이루어 가기를 바랍니다."],
  ["서로의 편","어떤 날에도 서로의 가장 든든한 편이 되어, 웃는 날이 더 많은 부부가 되기를 바랍니다."],
  ["처음 마음 그대로","오늘 이 자리에 선 마음 그대로, 오래도록 서로를 아끼며 살아가기를 바랍니다."],
  ["받은 사랑 나누기","오늘 받은 사랑과 축복을 잊지 않고, 받은 만큼 나누며 살아가는 부부가 되기를 바랍니다."],
  ["같은 곳 바라보기","서로를 닮아 가며, 오래도록 같은 곳을 바라보는 부부가 되기를 바랍니다."] ];
// G 선언 [정석, 따뜻하게, 짧게]
const G_LINES = {
  mc:["{이에} 사회자인 저는, {두사람이} 부부가 되었음을 여러분 앞에 엄숙히 선언합니다.",                        // G-1 (샘플 1·6)
      "{이에} 사회자인 저는, 귀한 인연으로 맺어진 {두사람이} 한 쌍의 부부가 되었음을 여러분 앞에 선언합니다.",     // G-2 (샘플 3)
      "{이에} 사회자인 저는, 이 혼인이 아름답게 이루어졌음을 여러분 앞에 엄숙히 선언합니다."],                     // G-3 (샘플 6)
  p: ["{이에} 저는 양가를 대표하여, {두사람이} 부부가 되었음을 엄숙히 선언합니다.",                                 // G-4 (샘플 1)
      "{이에} 저는, {두사람이} 하늘이 맺어 준 인연으로 한 쌍의 부부가 되었음을 여러분 앞에 엄숙히 선언합니다.",    // G-5 (샘플 4)
      "{이에} 저는, 두 사람의 혼인이 아름답게 이루어졌음을 여러분 앞에 엄숙히 선언합니다."]                          // G-6 (샘플 8)
};
const H_LINE = "감사합니다.";  // H-1 (샘플 8) 어른이 읽으면 처음부터 넣음
const TIPS = {  // 사회자 팁 (문구.txt T-1~4. 11/5 사회자님: T-5 식순표 2분 설명은 뺌)
  mc:["사회자가 읽을 때 신랑·신부는 하객 쪽을 바라봐요.",
      "웨딩홀에서 쓰는 성혼선언문이 따로 있을 수 있어요. 이 글로 바꾸고 싶으면 사회자와 웨딩홀에 미리 보내 주세요."],
  p: ["어른이 단상에서 읽으시면 신랑·신부는 그분을 바라봐요.",
      "큰 글씨로 뽑아 드리고, 식 전에 소리 내어 두세 번 읽어 보시게 해 주세요."]
};

// ===== 상태 =====
// 이 휴대폰 브라우저 안에만 보관해요(탭을 닫아도 남음). 새로 만들기를 누르면 덮어써요.
const STORE = window.localStorage;
const KEY = "i-now-pronounce.v1";
function fresh(){
  return { mode:"", reader:"mc", groom:"", bride:"", rname:"", date:"", honor:"y", imported:false,
    style:0, pick:{},
    greet:["intro","sadon","guests"], year:"", season:"", meet:"", place:"", love:"",
    vow:"", promG:"", promB:"", wish:"", thanks:"",
    off:{}, edit:{}, memo:"",
    sc:"home", step:0, resume:null, ret:false };   // sc: 지금 화면(home/names/q/result), resume: 이어서 만들기로 갈 화면
}
let S = fresh();
// 화면에서만 쓰는 상태 (보관 안 함): 누른 줄, AI 상자 열림, 새로 시작 확인 중인 버튼
let sel = null, aiOpen = false, armed = null;
const WIPE = "만들던 선언문이 지워져요 · 한 번 더 누르면 새로 시작";
function save(){ try{ STORE.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{ const d = JSON.parse(STORE.getItem(KEY) || "null"); if(d && d.mode) return Object.assign(fresh(), d); }catch(e){}
  return null;
}
// 혼인서약서에 적은 이름·날짜가 있으면 가져와요 (같은 사이트 주소라 이 브라우저에서 읽을 수 있음)
function importNames(){
  let got = false;
  try{
    const d = JSON.parse(STORE.getItem("i-do.v1") || "null");
    if(d) ["groom","bride","date"].forEach(k=>{ if(typeof d[k]==="string" && d[k].trim() && !S[k]){ S[k] = d[k]; got = true; } });
  }catch(e){}
  return got;
}
function rd(){ return READERS[S.reader] || READERS.mc; }
function thanksOn(){ return S.thanks==="y" || (S.thanks==="" && rd().parent); }

// ===== 문장 만들기 =====
function hasBatchim(word){
  const c = word.charCodeAt(word.length - 1);
  if(c < 0xAC00 || c > 0xD7A3) return null;
  return (c - 0xAC00) % 28 !== 0;
}
const JOSA = { "은":["은","는"], "는":["은","는"], "을":["을","를"], "를":["을","를"], "이":["이","가"], "가":["이","가"], "과":["과","와"], "와":["과","와"] };
function josa(word, j){
  const b = hasBatchim(word), pair = JOSA[j];
  return b===null ? `${pair[0]}(${pair[1]})` : b ? pair[0] : pair[1];
}
// 이름 + (군·양) + 조사. 비우면 샘플처럼 ○○○
function nameJ(p, title, j){
  const nm = (p==="신랑" ? S.groom : S.bride).trim(), base = nm || "○○○";
  if(title && S.honor!=="n") return `${base} ${title}${j ? josa(title, j) : ""}`;
  return base + (j ? (nm ? josa(nm, j) : JOSA[j][0]) : "");
}
function fillNames(t){ return t.replace(/\{(신랑|신부)(군|양)?(은|는|을|를|이|가|과|와)?\}/g, (_, p, title, j)=>nameJ(p, title, j)); }
// 정석·따뜻하게·짧게 탭이 정하는 줄(B 소개·E 약속·G 선언). ↻로 그 줄만 바꾸면 pick에 남아요
function variant(slot){
  if(S.pick[slot]!==undefined) return S.pick[slot];
  if(slot==="B") return S.style===2 ? -1 : S.style;
  return S.style;
}
function placeText(){ const p = S.place.trim().replace(/\s*에서$/, ""); return p ? p+"에서" : ""; }
function storyLine(){
  const when = S.year && S.season ? `${S.year}년 ${S.season}` : S.year ? `${S.year}년` : S.season ? `어느 ${S.season}` : "";
  const where = S.meet==="direct" ? placeText() : S.meet!=="" ? MEET[+S.meet][1] : "";
  const x = S.love!=="" ? LOVE[+S.love][1] : "";
  if(when || where) return `${when}${when && where ? ", " : ""}${where} 처음 만난 {두사람은} ${x || LOVE0}.`;
  return x ? `{두사람은} ${x}.` : "";
}
function promText(v, who){   // who: 신랑 · 신부 · 둘(같은 약속을 골랐을 때 → 상대 = 서로)
  const other = who==="둘" ? "서로" : who==="신랑" ? "신부" : "신랑";
  return PROM[+v][1].replace(/\{상대(를|의|에게)?\}/g, (_, j)=> other + (j==="를" ? josa(other, "을") : j || ""));
}
function vowLine(){
  if(S.promG!=="" && S.promG===S.promB) return `두 사람 모두 ${promText(S.promG, "둘")} 약속하였습니다.`;  // D-5 (11/5 수5)
  const g = S.promG!=="" ? promText(S.promG, "신랑") : "", b = S.promB!=="" ? promText(S.promB, "신부") : "";
  if(g && b) return `신랑은 ${g} 약속했고, 신부는 ${b} 약속하였습니다.`;
  if(g) return `신랑은 ${g} 약속하였습니다.`;
  if(b) return `신부는 ${b} 약속하였습니다.`;
  return D0_LINE;
}
// 줄 목록 (표시는 아직 안 바꾼 것): {id, text, cyc?}
function raw(){
  const r = rd(), P = r.parent, L = [];
  const add = (id, text, cyc)=>L.push({ id, text, cyc });
  if(P){
    if(S.greet.includes("intro")) add("A1", A_INTRO);
    if(S.greet.includes("sadon")) add("A2", A_SADON[r.side]);
    if(S.greet.includes("guests")) add("A3", A_GUESTS[0]);
  }
  const b = variant("B");
  if(b===0) add("B", P ? B_LINES.p[0] : B_LINES.mc[0], "B");
  if(b===1){ if(P){ add("B", B_WARM[r.side], "B"); add("B2", B_WARM2, "B"); } else add("B", B_LINES.mc[1], "B"); }
  const c = storyLine(); if(c) add("C", c);
  if(S.vow==="y"){ add("D1", D1_LINE); add("D2", vowLine()); }
  else { const e = variant("E"); add("E", e===2 && P ? E_SHORT_P[r.side] : E_LINES[e], "E"); }
  if(S.wish!=="") add("F", WISH[+S.wish][1], "F");
  add("G", G_LINES[P ? "p" : "mc"][variant("G")], "G");
  if(thanksOn()) add("H", H_LINE);
  return L;
}
// 뺀 줄을 거르고 표시를 바꿔요. 두 사람 이름은 남은 줄 중 처음 나오는 곳에만
function build(){
  const L = raw().filter(l=>!S.off[l.id]);
  const hasSadon = L.some(l=>l.id==="A2"), hasWish = L.some(l=>l.id==="F");
  let named = false;
  return L.map(l=>{
    if(S.edit[l.id]!==undefined) return { ...l, text:S.edit[l.id] };
    let t = l.id==="A3" && !hasSadon ? A_GUESTS[1] : l.text;
    t = t.replace(/\{이에\}/g, hasWish ? "그 바람을 담아" : "이에")
         .replace(/\{자기소개\}/g, `${rd().self} ${S.rname.trim() || "○○○"}`)
         .replace(/\{(이제)?두사람(은|이)\}/g, (_, now, j)=>{
           if(!named){ named = true; return `신랑 ${nameJ("신랑","군","과")} 신부 ${nameJ("신부","양",j)}`; }
           return (now ? "이제 " : "") + "두 사람" + j;
         });
    if(/\{신[랑부]/.test(t)) named = true;
    return { ...l, text:fillNames(t) };
  }).filter(l=>l.text.trim() || l.id===sel);   // 글을 다 지운 줄은 빠짐 (고치는 중인 줄은 남김)
}
function seconds(lines){
  const n = lines.map(l=>l.text).join("").replace(/\s/g,"").length;
  return Math.round(n * SEC_PER_CHAR);
}
function timeText(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return m ? `${m}분${s ? " "+s+"초" : ""}` : `${s}초`;
}
function dateText(){
  if(!S.date) return "20      년         월         일";
  const [y,m,d] = S.date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
function signText(){ return `${rd().sign} ${S.rname.trim() || "○○○"}`; }
function plain(lines){ return `성혼선언문\n\n${lines.map(l=>l.text).join("\n\n")}\n\n${dateText()}\n${signText()}`; }

// ===== 화면 이동 =====
// 휴대폰 "뒤로 가기"가 사이트를 나가지 않고 한 화면 전으로 가도록 화면마다 기록을 남겨요.
// back: 바로 앞 기록이 한 화면 전 화면인지 (그럴 때만 "이전"이 history.back()을 씀)
if("scrollRestoration" in history) history.scrollRestoration = "manual";
function render(){
  if(S.sc==="names") names();
  else if(S.sc==="q") ask();
  else if(S.sc==="result") result();
  else home();
}
function nav(sc, step, how){   // how: "push" 앞으로 / "jump" 건너뛰어 이동 / "replace" 지금 기록을 바꿈
  S.sc = sc; if(step!==undefined) S.step = step;
  if(sc!=="home") S.resume = { sc, step:S.step };
  if(sc==="result" || sc==="home" || sc==="names") S.ret = false;   // ret: 결과에서 질문으로 왔음 → "선언문으로 돌아가기"
  sel = null; aiOpen = false; armed = null;
  const st = { sc, step:S.step, back: how==="push" };
  if(how==="replace") history.replaceState(st, ""); else history.pushState(st, "");
  save(); render(); window.scrollTo(0,0);
}
function prevOf(){
  if(S.sc==="names") return ["home"];
  if(S.sc==="q") return S.step>0 ? ["q", S.step-1] : ["names"];
  if(S.sc==="result") return S.mode==="basic" ? ["names"] : ["q", qs().length-1];
  return ["home"];
}
function goBack(){
  if(history.state && history.state.back) history.back();
  else { const [sc, st] = prevOf(); nav(sc, st, "replace"); }
}
window.addEventListener("popstate", e=>{
  const st = e.state || { sc:"home" };
  S.sc = S.mode ? st.sc : "home";
  if(st.step!==undefined) S.step = st.step;
  if(S.sc!=="home") S.resume = { sc:S.sc, step:S.step };
  if(S.sc!=="q") S.ret = false;
  sel = null; aiOpen = false; armed = null;
  save(); render(); window.scrollTo(0,0);
});
// 같은 화면을 다시 그릴 때 (칩·줄 누르기): 스크롤 위치 유지
function redraw(){ const y = window.scrollY; render(); window.scrollTo(0, y); }

// ===== 화면 =====
function topBar(right){ return `<div class="top"><span>성혼선언문</span><span class="count">${right||""}</span></div>`; }
function modeLabel(){ return S.mode==="basic" ? "정석 선언문" : "우리 이야기"; }

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const saved = S.mode && S.resume;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">성혼선언문을 준비하는 <span class="nw">신랑·신부님을 위한</span></p>
    <h1>성혼선언문,<br>고르기만 하면<br>써져요</h1>
    <div class="bar"></div>
    <p class="lead">읽는 분을 고르고 몇 가지만 누르면 성혼선언문이 나와요. 아버님이 읽으시면 아버님 말투로, 사회자가 읽으면 사회자 말투로 써져요.</p>
    <div class="pick">
      ${saved ? `<button id="resume"><span>이어서 만들기</span><span class="q">만들던 선언문</span></button>` : ""}
      <button id="story"${armed==="story"?' class="armed"':""}><span>우리 이야기 넣어 만들기</span><span class="q">${armed==="story" ? WIPE : "질문 3~4개"}</span></button>
      <button id="basic"${armed==="basic"?' class="armed"':""}><span>정석 선언문으로 빠르게</span><span class="q">${armed==="basic" ? WIPE : "이름만 넣으면 끝"}</span></button>
    </div>
    <p class="note">※ 적은 내용은 이 휴대폰 브라우저 안에만 보관되고, 어디에도 올라가지 않아요.</p>
    ${foot()}`;
  // 만들던 선언문이 있으면 한 번 더 눌러야 새로 시작 (실수로 지우지 않게)
  const start = mode=>{
    if(saved && armed!==mode){ armed = mode; home(); return; }
    S = fresh(); S.mode = mode; S.imported = importNames(); nav("names", 0, "push");
  };
  document.getElementById("story").onclick = ()=>start("story");
  document.getElementById("basic").onclick = ()=>start("basic");
  const r = document.getElementById("resume");
  if(r) r.onclick = ()=>nav(S.resume.sc, Math.min(S.resume.step, qs().length-1), "jump");
}

// 칩 묶음. k: 상태 이름 · opt.max: 여러 개 고르기 · opt.fixed: 다시 눌러도 안 빠짐(늘 하나) · opt.cur: 화면에 보일 값(기본값이 있을 때)
function chips(k, list, opt={}){
  const cur = opt.cur!==undefined ? opt.cur : S[k];
  return `<div class="chips">${list.map(([v, text])=>{
    const on = opt.max ? cur.includes(v) : cur===v;
    return `<button class="chip${on?" on":""}" data-k="${k}" data-v="${esc(v)}" data-max="${opt.max||0}" data-fixed="${opt.fixed?1:0}" aria-pressed="${on}">${esc(text)}</button>`;
  }).join("")}</div>`;
}
function bindChips(){
  app.querySelectorAll(".chip[data-k]").forEach(c=>c.onclick = ()=>{
    const k = c.dataset.k, v = c.dataset.v, max = +c.dataset.max;
    if(max){ const arr = S[k], i = arr.indexOf(v); if(i>=0) arr.splice(i,1); else if(arr.length<max) arr.push(v); }
    else if(c.dataset.fixed==="1") S[k] = v;
    else S[k] = S[k]===v ? "" : v;
    if(k==="reader"){ S.edit = {}; S.off = {}; }   // 읽는 분이 바뀌면 문장이 통째로 바뀌어서, 고친 줄·뺀 줄은 처음으로
    save(); redraw();
    if(k==="meet" && v==="direct" && S.meet==="direct"){ const p = document.getElementById("place"); if(p) p.focus(); }
  });
}

function honorEx(){ return `선언문에는 이렇게 들어가요: 신랑 ${nameJ("신랑","군","과")} 신부 ${nameJ("신부","양","은")}`; }
function names(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const r = rd();
  app.innerHTML = `
    ${topBar(modeLabel())}
    <h2 class="qt">누가 읽나요?</h2>
    <p class="qd">읽는 분에 따라 말투와 인사가 바뀌어요. 정하지 않았다면 사회자로 두세요.</p>
    <div class="panel">${chips("reader", Object.entries(READERS).map(([k,x])=>[k, x.chip]), { fixed:true })}</div>
    <h2 class="qt sub">이름과 날짜</h2>
    <div class="panel">
      <label class="field"><span>신랑 이름</span><input id="groom" value="${esc(S.groom)}" placeholder="예: 김민준" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>신부 이름</span><input id="bride" value="${esc(S.bride)}" placeholder="예: 이서연" autocomplete="off" enterkeyhint="next"></label>
      ${S.imported ? `<p class="qd small">혼인서약서에 적은 이름을 가져왔어요.</p>` : ""}
      <p class="gt">이름 뒤에</p>
      ${chips("honor", [["y","군·양 붙이기"],["n","이름만"]], { fixed:true })}
      <p class="qd small" id="honorEx">${esc(honorEx())}</p>
      <label class="field gap"><span>${r.parent ? r.chip : "사회자"} 성함 (선택)</span><input id="rname" value="${esc(S.rname)}" placeholder="예: 김영호" autocomplete="off" enterkeyhint="done"></label>
      <label class="field"><span>예식 날짜 (선택)</span><input id="date" type="date" value="${esc(S.date)}"></label>
    </div>
    <p class="qd small">비워 두면 ○○○로 나와서 손으로 적을 수 있어요. 성함은 ${r.parent ? "인사와 " : ""}맨 아래 서명에 들어가요.</p>
    <div class="nav"><button class="text-btn" id="prev">이전</button><button class="btn main" id="next">다음</button></div>
    ${foot()}`;
  bindChips();
  ["groom","bride","rname","date"].forEach(k=>{
    const el = document.getElementById(k);
    el.oninput = el.onchange = e=>{ S[k] = e.target.value; save(); document.getElementById("honorEx").textContent = honorEx(); };
  });
  // 키보드의 "다음"(엔터): 신랑 → 신부 → 성함
  const enter = (id, to)=>{ document.getElementById(id).onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); to ? document.getElementById(to).focus() : e.target.blur(); } }; };
  enter("groom","bride"); enter("bride","rname"); enter("rname");
  document.getElementById("prev").onclick = goBack;
  document.getElementById("next").onclick = ()=> S.mode==="basic" ? nav("result", undefined, "push") : nav("q", 0, "push");
}

// 칩 바로 아래 미리보기: 고르면 그 자리에서 문장이 보여요
const PV = {};
function pv(id, filter, title){
  PV[id] = { filter, title };
  return `<div class="pv-inline" id="pv-${id}">${pvInner(id)}</div>`;
}
function pvInner(id){
  const { filter, title } = PV[id];
  const lines = build().filter(filter);
  if(!lines.length) return `<p class="pv-empty">${title && title() || "고르면 여기에 문장이 보여요."}</p>`;
  return `<p class="pv-title">${title && title() || "이렇게 들어가요"}</p>` + lines.map(l=>`<p>${esc(l.text)}</p>`).join("");
}
const idx = list=>list.map((t,i)=>[String(i), t]);
const QS_ALL = [
  { key:"greet", parent:true, title:"어떤 인사로 시작할까요?", desc:"어른이 읽으실 때 넣을 인사예요. 넣을 것만 남겨요.", has:()=>true, body:()=>`
      ${chips("greet", GREET, { max:3 })}
      ${pv("greet", l=>l.id[0]==="A", ()=> S.greet.length ? "" : "다 빼면 인사 없이 바로 시작해요.")}` },
  { key:"story", title:"두 사람 이야기를 한 줄 넣을까요?", desc:"생각나는 것만 골라요. 하나도 안 고르면 이 줄은 빠져요.", has:()=>S.year||S.season||S.meet||S.love, body:()=>{
      const years = []; for(let y=2026; y>=1990; y--) years.push(y);
      return `
      <p class="gt">처음 만난 해</p>
      <select id="year" class="sel" aria-label="처음 만난 해"><option value="">기억 안 나요</option>${years.map(y=>`<option${String(y)===S.year?" selected":""}>${y}</option>`).join("")}</select>
      <p class="gt">계절</p>${chips("season", ["봄","여름","가을","겨울"].map(s=>[s,s]))}
      <p class="gt">만난 곳</p>${chips("meet", [...idx(MEET.map(m=>m[0])), ["direct","직접 적기"]])}
      ${S.meet==="direct" ? `<input id="place" class="inp" value="${esc(S.place)}" placeholder="예: 강남역 스터디카페" autocomplete="off" enterkeyhint="done" aria-label="만난 곳">` : ""}
      ${pv("c1", l=>l.id==="C")}
      <p class="gt">두 사람의 연애를 한마디로 하면?</p>${chips("love", idx(LOVE.map(l=>l[0])))}
      ${pv("c2", l=>l.id==="C")}`; } },
  { key:"vow", title:"조금 전 혼인서약을 다시 짚을까요?", desc:"식순에서 성혼선언은 혼인서약 뒤에 와요. 넣으면 두 사람이 한 약속을 한 번 더 말해 줘요.", has:()=>S.vow!=="", body:()=>`
      ${chips("vow", [["y","넣어요"],["n","안 넣어요"]], { fixed:true, cur: S.vow==="y" ? "y" : "n" })}
      ${S.vow!=="y" ? `<p class="qd small">혼인서약을 하지 않거나 짧게 가고 싶으면 안 넣어요.</p>` : `
      <p class="qd small">넣으면 "부부가 되기를 굳게 약속하였습니다" 줄 대신 들어가요.</p>
      <p class="gt">신랑이 한 약속 <small>하나만</small></p>${chips("promG", idx(PROM.map(p=>p[0])))}
      ${pv("vg", l=>l.id==="D1"||l.id==="D2")}
      <p class="gt">신부가 한 약속 <small>하나만</small></p>${chips("promB", idx(PROM.map(p=>p[0])))}
      ${pv("vb", l=>l.id==="D1"||l.id==="D2")}`}` },
  { key:"wish", title:"선언 앞에 바람 한 줄 넣을까요?", desc:"두 사람에게 바라는 말이에요. 하나만 골라요.", has:()=>S.wish!=="" || S.thanks!=="", body:()=>`
      <p class="gt">바람 한 줄</p>${chips("wish", idx(WISH.map(w=>w[0])))}
      ${pv("wish", l=>l.id==="F"||l.id==="G", ()=> S.wish==="" ? "안 고르면 이렇게 끝나요" : "")}
      <p class="gt">맨 끝에 "감사합니다."</p>${chips("thanks", [["y","넣어요"],["n","안 넣어요"]], { fixed:true, cur: thanksOn() ? "y" : "n" })}` }
];
// 사회자가 읽으면 인사 질문은 빠져요
function qs(){ return QS_ALL.filter(q=>!q.parent || rd().parent); }

// 아래에 붙는 막대: 이전 · 읽는 시간 · 다음(안 골랐으면 건너뛰기). 결과에서 왔으면 선언문으로 돌아가기
function nextLabel(){ const Q = qs(); return S.step===Q.length-1 ? "선언문 보기" : Q[S.step].has() ? "다음" : "건너뛰기"; }
function barTime(){
  const sec = seconds(build());
  return `<span class="${sec>LIMIT_SEC?"over":""}">읽는 시간 약 ${timeText(sec)}</span>`;
}
function refreshPreview(){
  Object.keys(PV).forEach(id=>{ const el = document.getElementById("pv-"+id); if(el) el.innerHTML = pvInner(id); });
  const t = document.getElementById("qtime"); if(t) t.innerHTML = barTime();
  const n = document.getElementById("next"); if(n && !S.ret) n.textContent = nextLabel();
}

function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const Q = qs();
  S.step = Math.max(0, Math.min(S.step, Q.length-1));
  const q = Q[S.step], last = Q.length-1;
  Object.keys(PV).forEach(k=>delete PV[k]);
  app.innerHTML = `
    ${topBar(`질문 ${S.step+1} / ${Q.length}`)}
    <h2 class="qt">${esc(q.title)}</h2>
    ${q.desc ? `<p class="qd">${esc(q.desc)}</p>` : ""}
    <div class="panel">${q.body()}</div>
    <div class="qbar">
      <button class="text-btn" id="prev">이전</button>
      ${S.ret
        ? `<span class="nav-r">${S.step<last ? `<button class="text-btn" id="next">다음 질문</button>` : ""}<button class="btn main" id="toResult">선언문으로 돌아가기</button></span>`
        : `<span class="qtime" id="qtime">${barTime()}</span><button class="btn main" id="next">${nextLabel()}</button>`}
    </div>
    ${foot()}`;
  bindChips();
  const bind = (id, fn)=>{ const el = document.getElementById(id); if(el) el.oninput = el.onchange = e=>{ fn(e.target.value); save(); refreshPreview(); }; };
  bind("year", v=>S.year=v);
  bind("place", v=>S.place=v);
  const pl = document.getElementById("place"); if(pl) pl.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); pl.blur(); } };
  const next = ()=> S.step < last ? nav("q", S.step+1, "push") : nav("result", undefined, "push");
  document.getElementById("prev").onclick = goBack;
  const n = document.getElementById("next"); if(n) n.onclick = next;
  const tr = document.getElementById("toResult"); if(tr) tr.onclick = ()=>nav("result", undefined, "push");
}

// ===== 결과 =====
function timeHtml(lines){
  const sec = seconds(lines), lim = LIMIT_SEC;
  return `읽는 데 약 ${timeText(sec)} 걸려요${sec>lim ? `<span class="over">${timeText(lim)}이 넘어요. 문장을 눌러 하나 빼 보세요.</span>` : ""}<span class="ref">사람마다 읽는 속도가 달라서, 참고용 시간이에요.</span>`;
}
let imgTimer = null;
function fileName(){ return `성혼선언문-${S.groom.trim()||"신랑"}-${S.bride.trim()||"신부"}`; }

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const r = rd(), lines = build();
  const rows = lines.map(l=>{
    const on = sel===l.id;
    // 누른 줄 아래 상자는 저장 이미지에서 빠져요 (data-html2canvas-ignore)
    const box = !on ? "" : `
      <div class="edit-box" data-html2canvas-ignore>
        <textarea class="inp" id="editTxt" rows="3" aria-label="문장 고치기">${esc(l.text)}</textarea>
        <div class="edit-btns">
          ${l.cyc ? `<button class="eb" id="cyc" data-cyc="${l.cyc}">↻ 다른 문장</button>` : ""}
          ${qOf(l)!==undefined ? `<button class="eb" id="toQ" data-q="${qOf(l)}">질문에서 다시 고르기</button>` : ""}
          <button class="eb" id="offLine">✕ 빼기</button>
          <button class="eb main" id="doneLine">완료</button>
        </div>
      </div>`;
    return `<div class="row${on?" on":""}" data-row="${l.id}" role="button" tabindex="0" aria-expanded="${on}"><span class="txt">${esc(l.text)}</span></div>${box}`;
  }).join("");
  const offCount = Object.keys(S.off).filter(id=>raw().some(l=>l.id===id)).length;
  // 다른 사이트 버튼: 릴스가 생기면 보여요 (혼인서약서·식순표)
  const link = (k, label)=> (SITES[k].reel || SITES[k].direct) ? siteLink(k, "btn ghost", label) : "";
  app.innerHTML = `
    ${topBar(modeLabel())}
    <div class="tabs" role="group" aria-label="문장 스타일 고르기">${STYLES.map((s,i)=>`<button class="chip${i===S.style?" on":""}" data-style="${i}" aria-pressed="${i===S.style}">${s}</button>`).join("")}</div>
    <p class="edit-hint">문장을 누르면 바꾸거나, 고치거나, 뺄 수 있어요.</p>
    <article class="card decl" id="card">
      <div class="head"><span class="kind">MARRIAGE DECLARATION</span><span class="handle">@wed_voice.su</span></div>
      <h2>성혼선언문</h2>
      <div class="rule"></div>
      <div class="rows">${rows}</div>
      <p class="date">${dateText()}</p>
      <p class="names">${esc(signText())}</p>
      ${sign()}
    </article>
    <p class="time" id="time">${timeHtml(lines)}</p>
    ${offCount ? `<button class="text-btn btn-link" id="restore">뺀 줄 ${offCount}개 되돌리기</button>` : ""}
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copySend">${r.call}께 보낼 글 복사하기<span class="sub">인사말과 읽는 시간이 함께 들어가요</span></button>
        <button class="btn ghost" id="copyText">선언문 글만 복사하기<span class="sub">웨딩홀·플래너에게 보낼 때</span></button>
        <p class="msg" id="msg" role="status"></p>
      </div>
    </div>
    <div class="tip"><b>사회자 팁</b>${TIPS[r.parent ? "p" : "mc"].map(t=>`<p>· ${esc(t)}</p>`).join("")}</div>
    <div class="btns more">
      <button class="btn ghost" id="aiBtn" aria-expanded="${aiOpen}">AI로 더 다듬기 ${aiOpen ? "▴" : "▾"}</button>
      ${!aiOpen ? "" : `
      <div class="panel ai-panel">
        <p class="gt">넣고 싶은 이야기 메모</p>
        <p class="qd">${r.parent ? `${r.call}이 꼭 하고 싶으신 말이나 ` : ""}두 사람 이야기를 편하게 적어요. AI에게 보낼 글에만 들어가고, 선언문에는 들어가지 않아요.</p>
        <textarea id="memo" class="inp" rows="4" placeholder="${r.parent ? "예: 어릴 때부터 동생을 잘 챙기던 아들이었어요" : "예: 대학 동아리에서 만나 10년을 함께했어요"}">${esc(S.memo)}</textarea>
        <button class="btn main" id="copyAi">AI에게 보낼 글 복사하기</button>
        <p class="msg" id="msgAi" role="status"></p>
        <p class="qd small">챗GPT 같은 AI 앱에 붙여 넣으면 다듬어 줘요.</p>
      </div>`}
      ${S.mode==="basic" ? `<button class="btn ghost" id="toStory">우리 이야기 넣기 · 질문 ${qs().length}개</button>` : `<button class="btn ghost" id="again">질문 다시 고르기</button>`}
      <button class="btn ghost" id="toNames">읽는 분·이름 바꾸기</button>
      ${link("vows","혼인서약서 만들기")}
      ${link("flow","식순표 만들기")}
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
      <button class="text-btn btn-link" id="home">처음으로</button>
    </div>
    ${foot()}`;
  prepareImage(fileName());
  const $ = id=>document.getElementById(id);
  // 탭: 소개·약속·선언 줄을 그 스타일로 (그 줄에서 고친 글·↻·빼기는 처음으로)
  app.querySelectorAll("[data-style]").forEach(b=>b.onclick = ()=>{
    S.style = +b.dataset.style; S.pick = {};
    ["B","B2","E","G"].forEach(id=>{ delete S.edit[id]; delete S.off[id]; });
    sel = null; save(); redraw();
  });
  app.querySelectorAll("[data-row]").forEach(row=>{
    const open = ()=>{ const id = row.dataset.row; if(sel===id) closeLine(); else { closeLine(true); sel = id; redraw(); } };
    row.onclick = open;
    row.onkeydown = e=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); open(); } };
  });
  if(sel){
    const ta = $("editTxt");
    ta.oninput = ()=>{
      S.edit[sel] = ta.value; save();
      const t = app.querySelector(`[data-row="${sel}"] .txt`); if(t) t.textContent = ta.value;
      $("time").innerHTML = timeHtml(build());
      clearTimeout(imgTimer); imgTimer = setTimeout(()=>prepareImage(fileName()), 600);
    };
    const cyc = $("cyc");
    if(cyc) cyc.onclick = ()=>{
      const c = cyc.dataset.cyc;
      if(c==="B"){ delete S.edit.B; delete S.edit.B2; } else delete S.edit[sel];
      if(c==="B") S.pick.B = (variant("B")+1) % 2;
      if(c==="E" || c==="G") S.pick[c] = (variant(c)+1) % 3;
      if(c==="F") S.wish = String((+S.wish+1) % WISH.length);
      if(c==="B" && sel==="B2") sel = "B";   // 따뜻하게 둘째 줄에서 바꾸면 첫 줄이 열려 있게
      save(); redraw();
    };
    $("offLine").onclick = ()=>{ S.off[sel] = true; delete S.edit[sel]; sel = null; save(); redraw(); };
    $("doneLine").onclick = ()=>closeLine();
  }
  const rs = $("restore"); if(rs) rs.onclick = ()=>{ S.off = {}; save(); redraw(); };
  $("save").onclick = saveCard;
  $("copySend").onclick = ()=>copy(sendText(), `${r.call}께 보낼 글을 복사했어요. 카톡에 붙여 넣어 보내 보세요.`, "msg");
  $("copyText").onclick = ()=>copy(plain(build()), "선언문 글을 복사했어요.", "msg");
  $("aiBtn").onclick = ()=>{ aiOpen = !aiOpen; redraw(); };
  if(aiOpen){
    $("memo").oninput = e=>{ S.memo = e.target.value; save(); };
    $("copyAi").onclick = ()=>copy(aiPrompt(), "AI에게 보낼 글을 복사했어요. AI 앱에 붙여 넣어 보세요.", "msgAi");
  }
  const ts = $("toStory"); if(ts) ts.onclick = ()=>{ S.mode = "story"; nav("q", 0, "push"); };
  const ag = $("again"); if(ag) ag.onclick = ()=>{ S.ret = true; nav("q", 0, "jump"); };
  const tq = $("toQ"); if(tq) tq.onclick = ()=>{ S.ret = true; nav("q", +tq.dataset.q, "jump"); };
  $("toNames").onclick = ()=>nav("names", undefined, "push");
  $("home").onclick = ()=>nav("home", undefined, "jump");
}
// 이 줄을 만든 질문 (결과에서 "질문에서 다시 고르기"로 바로 가요). 소개·약속·선언(탭이 정하는 줄)은 없음
function qOf(l){
  if(S.mode!=="story") return undefined;
  const key = { A:"greet", C:"story", D:"vow", F:"wish", H:"wish" }[l.id[0]];
  const i = qs().findIndex(q=>q.key===key);
  return i<0 ? undefined : i;
}
// 누른 줄 닫기. 글을 다 지웠으면 그 줄은 빼요. keep=true면 다시 그리지 않음
function closeLine(keep){
  if(sel && S.edit[sel]!==undefined && !S.edit[sel].trim()){ delete S.edit[sel]; S.off[sel] = true; }
  if(!keep){ sel = null; save(); redraw(); }
}

// 읽는 분께 보내는 글: 인사 + 읽는 시간 + 선언문
function sendText(){
  const r = rd(), lines = build(), t = timeText(seconds(lines));
  const hello = r.parent
    ? `식에서 읽어 주실 성혼선언문이에요.\n소리 내어 두세 번 읽어 보시면 당일에 한결 편하실 거예요. (읽는 데 약 ${t})`
    : `사회자님, 저희 성혼선언문이에요. 식에서 이대로 읽어 주세요. (읽는 데 약 ${t})`;
  return `${hello}\n\n${plain(lines)}`;
}
function aiPrompt(){
  const r = rd(), lim = LIMIT_SEC;
  return `아래는 결혼식에서 ${r.parent ? r.self : "사회자"}가 읽을 성혼선언문 초안이에요.
'메모'를 참고해서, 더 자연스럽고 두 사람 이야기 같게 다듬어 주세요.

지킬 것
- 읽는 사람(${r.parent ? r.self : "사회자"})의 말투 그대로
- 소리 내어 읽어서 ${timeText(lim)} 안 (공백 빼고 ${lim*4}자 안)
- 마지막 문장은 "두 사람이 부부가 되었음을 선언합니다"처럼 선언으로 끝내기
- 메모에 없는 일은 지어내지 않기
- 하객이 한 번 듣고 바로 알아듣게, 어려운 말 없이

[초안]
${plain(build())}

[메모]
${S.memo.trim() || "(없음)"}`;
}
async function copy(text, done, msgId){
  const msg = document.getElementById(msgId);
  try{ await navigator.clipboard.writeText(text); msg.textContent = done; }
  catch(e){
    // 클립보드를 못 쓰는 브라우저: 숨긴 칸에 넣고 복사
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly",""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false; try{ ok = document.execCommand("copy"); }catch(_){}
    ta.remove();
    msg.textContent = ok ? done : "복사하지 못했어요. 화면을 길게 눌러 직접 복사해 주세요.";
  }
}

function soon(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>성혼선언문,<br>고르기만 하면<br>써져요</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick"><a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a></div>
    ${foot()}`;
}

// ===== 시작 =====
// 새로 불러왔을 때(다른 앱에 다녀오는 사이 새로고침 등) 보던 화면이 기록에 있으면 그 화면으로
(function start(){
  const preview = new URLSearchParams(location.search).has("preview");
  if(!OPEN && !preview){ soon(); return; }
  const saved = load(); if(saved) S = saved;
  const st = history.state;
  if(st && st.sc && st.sc!=="home" && S.mode){ S.sc = st.sc; S.step = st.step || 0; }
  else { S.sc = "home"; history.replaceState({ sc:"home", step:0, back:false }, ""); }
  render();
})();
