// 덕담 만들기 (샘플): 하시는 분 고르기 → 정석 덕담 / 우리 이야기(질문 5개) → 덕담 카드
// 문장은 전부 docs/덕담/문구.txt 첫 버전 그대로. 번호(A-1, D-2 …)는 문구.txt 번호
// 화면 구조·줄 손보기·보관 방식은 성혼선언문(i-now-pronounce/app.js)과 같아요. 공통 기능은 shared/common.js

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/with-our-blessing/?preview)
const OPEN = false;
const SEC_PER_CHAR = 1/4;   // 1초에 4자 (추정, 혼인서약서·성혼선언문과 같은 계산)
const LIMIT = 180;          // 읽는 시간 기준 3분: 식순표에서 덕담을 3분으로 잡았어요

// ===== 하시는 분 =====
// side g: 자녀 = 아들(신랑), 새 식구 = 며느리(신부) / side b: 자녀 = 딸(신부), 새 식구 = 사위(신랑)
const READERS = {
  gf: { chip:"신랑 아버님", call:"아버님", side:"g", pa:"아버지", dad:"아빠" },
  bf: { chip:"신부 아버님", call:"아버님", side:"b", pa:"아버지", dad:"아빠" },
  gm: { chip:"신랑 어머님", call:"어머님", side:"g", pa:"어머니", dad:"엄마" },
  bm: { chip:"신부 어머님", call:"어머님", side:"b", pa:"어머니", dad:"엄마" }
};

// ===== 문장 =====
// 표시: {아들} 아들·딸 · {새식구} 며느리·사위 · {새가족} 새 식구가 될 딸·아들 · {남편} 자녀가 될 남편·아내 · {배우자} 자녀의 아내·남편
//       {역할} 신랑·신부(내 자녀) · {사돈자녀} 따님·아드님 · {아버지} 아버지·어머니 · {아빠} 아빠·엄마
//       {시부모} 시아버지·시어머니 · {장인} 장인·장모 · {듬직한} 아들은 듬직한, 딸은 든든한
//       {자기소개} "신랑 김민준의 아버지 김영호" · {자녀부름} "민준아" · {새식구부름} "서연아" / 사위는 "민준 군"
//       {아들이}처럼 뒤에 조사를 붙이면 받침에 맞춰요 (아들이 / 딸이, 며느리가 / 사위가)
//       {다시한번} 맨 앞에 하객 감사가 있으면 "다시 한번 "
// [g, b]처럼 나뉜 문장은 신랑 측·신부 측이 달라요 (며느리에게는 해라체, 사위에게는 하게체 — 샘플 4)
const STYLES = ["정석","따뜻하게","짧게"];
// 탭이 정하는 기본 문장 (배열 번호, -1은 안 넣음). 질문에서 고르거나 ↻로 바꾸면 그게 먼저
const TAB = [
  { A1:0, B:0,  C:0, D:0, E:0, F:2, K:-1, G:0, I:0 },   // 정석 (샘플 2·6처럼)
  { A1:1, B:1,  C:0, D:4, E:2, F:4, K:0,  G:1, I:1 },   // 따뜻하게 (샘플 4처럼)
  { A1:0, B:-1, C:1, D:3, E:0, F:1, K:-1, G:2, I:2 }    // 짧게 (샘플 1처럼)
];
// 인사 (질문 1에서 넣을 것만). 사돈·하객 부탁은 덕담 끝에 들어가요
const GREET = [["intro","내 소개"],["guests","하객께 감사"],["reason","덕담을 맡게 된 이야기"],["sadon","사돈께 감사"],["ask","하객께 응원 부탁"]];
const GREET_ID = { intro:"A1", guests:"A2", reason:"C", sadon:"G", ask:"H" };
const A_INTRO = [
  "안녕하십니까. {자기소개}입니다.",                         // A-1 (샘플 2)
  "오늘 이 자리의 주인공 중 한 사람, {자기소개}입니다." ];    // A-1b (샘플 4)
const A_GUESTS = "바쁘신 가운데에도 저희 아이들의 결혼식에 함께해 주신 친지분들과 하객 여러분께 진심으로 감사드립니다.";  // A-2 (샘플 2·6)
// B 오늘의 마음 (탭이 정함, ↻로 5개를 돌아요). 질문 2에서 기억을 고르면 그 줄(M)이 대신 들어가요
const B_LINES = [
  "사람은 태어나 인생의 3분의 1을 아들과 딸로 살고, 3분의 1을 부부로 살고, 나머지 3분의 1을 부모로 살아간다고 합니다. 오늘은 저희 {아들과}, {새가족} 같은 {새식구가} 아들과 딸로서의 시간을 마치고 부부라는 새 이름을 얻는, 참 뜻깊은 날입니다.",  // B-1 (샘플 2)
  "제가 혼례를 올린 것이 엊그제 같은데, 품에 안았던 작은 아이가 오늘 {역할이} 되어 제 앞에 서 있습니다. 감회가 새롭다는 말로는 다 담기지 않습니다.",  // B-2 (샘플 4)
  "오늘은 저희에게 새로운 {새가족이}, 사돈댁에는 새로운 {아들이} 생기는 참 뜻깊은 날입니다.",  // B-3 (샘플 5)
  "{아들이} 이렇게 든든하게 자라 새로운 가정을 꾸린다고 하니, {아버지}로서 감회가 새롭습니다.",  // B-4 (샘플 6)
  "혼주로서 이 자리에 서니, 고마운 얼굴들이 가장 먼저 눈에 들어옵니다." ];  // B-5 (샘플 1)
// M 어릴 적 기억 (질문 2) [칩, 들어가는 말, 신랑 측만이면 "g"]
const MEM = [
  ["걸음마 떼던 날","처음 걸음마를 떼던 날"],
  ["{아빠}라고 처음 부르던 날","처음 {아빠}라고 부르던 날"],
  ["초등학교 입학식","초등학교 입학식 날"],
  ["자전거 배우던 날","처음 자전거를 배우던 날"],
  ["대학 합격 소식","대학 합격 소식을 듣던 날"],
  ["군대 가던 날","군대에 가던 날","g"],
  ["첫 월급 받던 날","첫 월급을 받아 오던 날"] ];
const M_LINE = "{기억} 엊그제 같은데, 오늘 이렇게 {역할이} 되어 제 앞에 서 있습니다. 감회가 새롭다는 말로는 다 담기지 않습니다.";  // M-0 (샘플 4를 고침)
// C 덕담을 맡게 된 이야기
const C_LINES = [
  "아이들이 주례 없이 식을 올리며 저에게 덕담을 청했습니다. 말주변은 없지만, 진심을 담아 전하겠습니다.",  // C-1 (샘플 2·6)
  "새로운 가정의 첫발을 내딛는 두 사람에게, 양가를 대표하여 마음을 전하려 합니다." ];  // C-2 (샘플 3)
// D 내 자녀에게 (질문 3) — 부르는 말 + 한마디 [칩, 문장]
const D_CALL = "사랑하는 나의 {아들} {자녀부름}.";  // D-0 (샘플 3·6)
const D_LINES = [
  ["곁을 지키는 {남편}","오늘부터 너는 혼자가 아니라, 한 가정을 함께 이끄는 사람이다. 기쁜 날에도 힘든 날에도 {배우자의} 곁을 지키는 {듬직한} {남편이} 되어라."],  // D-1 (샘플 2, 딸은 고쳐 씀)
  ["보듬어 주는 {남편}","늘 {배우자를} 보듬어 주고, 아껴 주고, 위로해 주는 {남편이} 되어라."],  // D-2 (샘플 6, 딸은 고쳐 씀)
  ["만감이 교차해","네가 어느새 자라 이 많은 분들의 축복 속에 새 가정을 꾸린다니, 머릿속에 지난날들이 스치며 만감이 교차하는구나. 지금처럼 서로를 위하고 아끼며, 어떤 일이든 슬기롭게 헤쳐 나가리라 믿는다."],  // D-3 (샘플 6)
  ["태어나 줘서 고마워","우리 집에 태어나 함께해 줘서 고맙다. 인생, 재미있고 멋지게 살아라."],  // D-4 (샘플 4)
  ["더 바랄 게 없어","누군가 그러더구나. 자식은 태어나 자라는 모습을 보여 준 것만으로 부모에게 할 효도를 다한 것이라고. 오늘 너는 이렇게 멋진 사람을 만나 새 출발까지 보여 주니, {아빠}는 더 바랄 것이 없다."] ];  // D-5 (샘플 4)
// E 새 식구에게 (질문 3) — 부르는 말 + 한마디 [칩, 문장]
const E_CALL = "그리고 우리 {새식구} {새식구부름}.";  // E-0 (샘플 2·4)
const E_LINES = [
  ["와 줘서 고마워", { g:"우리 아들의 아내로, 우리 가족의 새 식구로 와 줘서 고맙다.",                 // E-1 (샘플 2)
                      b:"어느 날 갑자기 이렇게 든든한 사위로 와 줘서 고맙네." }],                   // E-1 (샘플 4)
  ["{새가족이} 하나 생겼어", { g:"아들이 좋은 반려자를 만난 것도 기쁘지만, 나로서는 예쁜 딸이 하나 생겼다는 것이 더 기쁘구나.",  // E-2 (샘플 6)
                              b:"딸이 좋은 반려자를 만난 것도 기쁘지만, 나로서는 든든한 아들이 하나 생겼다는 것이 더 기쁘네." }],  // E-2 (샘플 6을 사위에게 맞게)
  ["{새가족}처럼 지내자", { g:"앞으로는 {시부모}와 며느리가 아니라, {아버지}와 딸처럼 지내자꾸나.",      // E-3 (샘플 4를 며느리에게 맞게)
                           b:"앞으로는 {장인과} 사위가 아니라, {아버지}와 아들처럼 지내 보세." }] ];   // E-3 (샘플 4)
// F 두 사람에게 당부 (질문 4) [칩, 문장]
const F_LINES = [
  ["귀 기울이고 지지하기","두 사람은 서로의 말에 귀 기울여 주고, 아낌없이 지지해 주어라. 늘 함께라는 마음으로 손을 잡고 걸어간다면, 때때로 찾아오는 어려운 순간도 반드시 이겨낼 수 있단다."],  // F-1 (샘플 3)
  ["웃는 날이 더 많게","두 사람 모두 서로를 아껴 주고 사랑하며, 얼굴 붉히는 일보다 마주 보고 웃는 일이 더 많은 부부로 오래오래 다정하게 살아가기를 바란다."],  // F-2 (샘플 1)
  ["칭찬하고 존중하기","함께 있을 때나 떨어져 있을 때나, 서로를 칭찬하고 존중하는 두 사람이 되기를 바란다."],  // F-3 (샘플 2·6)
  ["서로의 바람막이","살다 보면 힘들고 어려운 일이 찾아올 수도 있겠지. 하지만 두 사람이 서로에게 든든한 바람막이가 되어 준다면, 이겨내지 못할 일은 없단다."],  // F-4 (샘플 5)
  ["두 사람의 행복 먼저","두 사람에게 당부하자면, 인생의 주인공은 너희 둘이니 먼저 서로의 행복을 챙기고, 그 행복 위에 양가의 화목을 더해 가는 삶을 살기를 바란다."],  // F-5 (샘플 4)
  ["오늘의 축하 간직하기","두 사람은 오늘 이 귀한 분들의 축하를 마음속에 깊이 간직했다가, 어려운 일이 있을 때마다 서로의 힘이 되어 주기를 부탁한다."],  // F-6 (샘플 6)
  ["서로를 먼저 생각하기","두 사람 모두 항상 서로를 먼저 생각하고, 아끼고, 사랑하면서 즐거운 인생을 살아가기를 바란다."] ];  // F-7 (샘플 5)
// K 마지막 한마디 (질문 4) [칩, 문장]
const K_LINES = [
  ["사랑한다, 얘들아","사랑한다, 얘들아."],  // K-1 (샘플 3)
  ["언제까지나 응원할게","나는 언제까지나 너희 부부의 건강과 행복을 응원하고 또 응원할 것이다."],  // K-2 (샘플 6)
  ["좋은 엄마 아빠 되길","두 사람 모두 멋진 가정을 이루고, 훌륭한 엄마 아빠가 되기를 바란다."] ];  // K-3 (샘플 2·6)
// S 성혼선언까지 이어서 (질문 5) — 샘플 3 "덕담과 성혼선언을 함께 진행하는 경우"
const S_LINES = [
  "이어서 성혼선언을 하겠습니다.",  // S-1 (새로 씀, 샘플 3의 "— 이어서 성혼선언 —"을 말로)
  "이 순간부터 신랑 {신랑} 군과 신부 {신부} 양은 사랑으로 이 자리에 함께 서 있습니다. 이에 저는 이 자리에 함께하신 모든 분들 앞에서, 두 사람이 부부가 되었음을 선언합니다." ];  // S-2 (샘플 3)
// G 사돈께 감사 (탭이 정함)
const G_LINES = [
  "이렇게 귀한 {사돈자녀를} 훌륭하게 키워 보내 주신 사돈 내외분께도 감사의 인사를 올립니다.",  // G-1 (샘플 2)
  "자상하고 화목한 가정에서 좋은 {사돈자녀를} 보내 주신 사돈 내외분께도 감사드립니다. 이 좋은 인연, 저희의 큰 복으로 알고 오래오래 소중히 하겠습니다.",  // G-2 (샘플 4)
  "우리 {아들을} 아껴 줄 귀한 사람을 건강하고 훌륭하게 키워 주신 사돈 내외분께도 진심으로 감사드립니다." ];  // G-3 (샘플 5)
const H_LINE = "하객 여러분께도 한 가지 부탁을 드립니다. 두 사람이 잘하는 일에는 아낌없는 응원을, 서툰 일에는 따뜻한 조언을 보태 주시면 고맙겠습니다. 여러분의 그 마음이 두 사람에게는 가장 든든한 울타리가 될 것입니다.";  // H-1 (샘플 1)
// I 마무리 인사 (질문 5) [칩, 문장]
const I_LINES = [
  ["행운과 행복 기원","끝으로, 바쁘신 가운데에도 귀한 걸음 해 주신 하객 여러분께 {다시한번}진심으로 감사드리며, 여러분의 가정에도 행운과 행복이 늘 가득하시길 기원합니다."],  // I-1 (샘플 1)
  ["가장 큰 숙제를 마쳐요","이것으로 {아버지}의 가장 큰 숙제를 기쁘게 마칩니다."],  // I-2 (샘플 4)
  ["행복과 평화 기원","끝으로 참석해 주신 하객 여러분께 {다시한번}감사드리며, 여러분의 가정에 행복과 평화가 가득하시길 기원합니다."] ];  // I-3 (샘플 3)
const J_LINE = "감사합니다.";  // J-1 (샘플 모두)
const TIPS = [  // 사회자 팁 (초안, 문구.txt T-1~3)
  "큰 글씨로 뽑아 드리고, 식 전에 소리 내어 두세 번 읽어 보시게 해 주세요.",
  "식순표에는 덕담을 3분으로 잡아요. 길어지면 뒤 순서가 밀려요.",
  "울컥하실 것 같으면 사회자에게 미리 알려 주세요. 사회자가 미리 알면 자연스럽게 이어 가요." ];

// 질문에서 고르는 줄: 상태 이름 ↔ 줄. 개수는 ↻로 돌 때 씀
const QKEY = { D:"child", E:"newb", F:"both", K:"last", I:"close" };
const QSLOT = { child:"D", newb:"E", both:"F", last:"K", close:"I" };
const COUNT = { A1:A_INTRO.length, B:B_LINES.length, C:C_LINES.length, D:D_LINES.length, E:E_LINES.length,
                F:F_LINES.length, K:K_LINES.length, G:G_LINES.length, I:I_LINES.length };

// ===== 상태 =====
// 이 휴대폰 브라우저 안에만 보관해요(탭을 닫아도 남음). 새로 만들기를 누르면 덮어써요.
const STORE = window.localStorage;
const KEY = "with-our-blessing.v1";
function fresh(){
  return { mode:"", reader:"gf", groom:"", bride:"", callG:"", callB:"", rname:"", date:"", imported:"",
    style:0, pick:{},
    greet:["intro","guests","reason","sadon"], mem:"", memText:"",
    child:"", newb:"", both:"", last:"", close:"", decl:"",
    off:{}, edit:{}, memo:"",
    sc:"home", step:0, resume:null, ret:false };   // sc: 지금 화면(home/names/q/result), resume: 이어서 만들기로 갈 화면
}
let S = fresh();
// 화면에서만 쓰는 상태 (보관 안 함): 누른 줄, AI 상자 열림, 새로 시작 확인 중인 버튼
let sel = null, aiOpen = false, armed = null;
const WIPE = "만들던 덕담이 지워져요 · 한 번 더 누르면 새로 시작";
function save(){ try{ STORE.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{ const d = JSON.parse(STORE.getItem(KEY) || "null"); if(d && d.mode) return Object.assign(fresh(), d); }catch(e){}
  return null;
}
// 성혼선언문·혼인서약서에 적은 이름·날짜가 있으면 가져와요 (같은 사이트 주소라 이 브라우저에서 읽을 수 있음)
function importNames(){
  let from = "";
  [["i-now-pronounce.v1","성혼선언문"],["i-do.v1","혼인서약서"]].forEach(([key, label])=>{
    try{
      const d = JSON.parse(STORE.getItem(key) || "null");
      if(d) ["groom","bride","date"].forEach(k=>{ if(typeof d[k]==="string" && d[k].trim() && !S[k]){ S[k] = d[k]; from = from || label; } });
    }catch(e){}
  });
  return from;
}
function rd(){ return READERS[S.reader] || READERS.gf; }
function sideG(){ return rd().side==="g"; }

// ===== 문장 만들기 =====
function hasBatchim(word){
  const c = word.charCodeAt(word.length - 1);
  if(c < 0xAC00 || c > 0xD7A3) return null;
  return (c - 0xAC00) % 28 !== 0;
}
const JOSA = { "은":["은","는"], "는":["은","는"], "을":["을","를"], "를":["을","를"], "이":["이","가"], "가":["이","가"], "과":["과","와"], "와":["과","와"], "의":["의","의"] };
function josa(word, j){
  const b = hasBatchim(word), pair = JOSA[j];
  return b===null ? (pair[0]===pair[1] ? pair[0] : `${pair[0]}(${pair[1]})`) : b ? pair[0] : pair[1];
}
// 부르는 말: 이름에서 성을 빼고 아/야 (사위는 "○○ 군"). 칸에 적으면 그대로
const DOUBLE = ["남궁","황보","제갈","사공","선우","서문","독고","동방"];
function given(full){
  const n = full.replace(/\s/g,"");
  if(!/^[가-힣]+$/.test(n)) return n;
  if(n.length===4 && DOUBLE.includes(n.slice(0,2))) return n.slice(2);
  return n.length>=2 ? n.slice(1) : n;
}
function autoCall(p){   // p: "신랑" / "신부"
  const full = (p==="신랑" ? S.groom : S.bride).trim();
  const sawi = p==="신랑" && !sideG();
  if(!full) return sawi ? "○○ 군" : "○○아";
  const g = given(full);
  if(sawi) return `${g} 군`;
  const b = hasBatchim(g);
  return b===null ? g : g + (b ? "아" : "야");
}
function callOf(p){ const c = (p==="신랑" ? S.callG : S.callB).trim(); return c || autoCall(p); }
function kidP(){ return sideG() ? "신랑" : "신부"; }
function newP(){ return sideG() ? "신부" : "신랑"; }
// {표시} 값. {아들이}처럼 끝에 조사가 붙으면 받침에 맞춰요
function vals(){
  const r = rd(), g = sideG(), mom = r.pa==="어머니";
  const kn = (g ? S.groom : S.bride).trim();
  return {
    "아들": g?"아들":"딸", "새식구": g?"며느리":"사위", "새가족": g?"딸":"아들",
    "남편": g?"남편":"아내", "배우자": g?"아내":"남편", "듬직한": g?"듬직한":"든든한",
    "역할": kidP(), "사돈자녀": g?"따님":"아드님",
    "아버지": r.pa, "아빠": r.dad, "시부모": mom?"시어머니":"시아버지", "장인": mom?"장모":"장인",
    "자기소개": `${kidP()}${kn ? " "+kn : ""}의 ${r.pa} ${S.rname.trim() || "○○○"}`,
    "자녀부름": callOf(kidP()), "새식구부름": callOf(newP()),
    "신랑": S.groom.trim() || "○○○", "신부": S.bride.trim() || "○○○"
  };
}
function fill(t){
  const V = vals();
  return t.replace(/\{([^{}]+)\}/g, (m, k)=>{
    if(V[k]!==undefined) return V[k];
    const j = k.slice(-1), base = k.slice(0, -1);
    return V[base]!==undefined && JOSA[j] ? V[base] + josa(V[base], j) : m;
  });
}
function sd(x){ return typeof x==="string" ? x : x[rd().side]; }
// 그 줄에 들어갈 문장 번호: ↻로 바꾼 것 → 질문에서 고른 것 → 탭 기본
function pickOf(slot){
  if(S.pick[slot]!==undefined) return S.pick[slot];
  const q = QKEY[slot];
  if(q && S[q]!=="") return S[q]==="n" ? -1 : +S[q];
  return TAB[S.style][slot];
}
// 질문 화면에서 켜져 보일 칩 (지금 덕담에 들어 있는 문장)
function qcur(slot){ const p = pickOf(slot); return p<0 ? "n" : String(p); }
function memList(){ return MEM.map((m,i)=>[String(i), fill(m[0]), m[2]]).filter(m=>!m[2] || m[2]===rd().side).map(m=>[m[0], m[1]]); }
function memLine(){
  const x = S.mem==="direct" ? S.memText.trim().replace(/[\s.,!]+$/,"") : S.mem!=="" ? fill(MEM[+S.mem][1]) : "";
  return x ? M_LINE.replace("{기억}", x + josa(x, "이")) : "";
}
// 줄 목록 (표시는 아직 안 바꾼 것): {id, text, cyc?}  cyc가 있는 줄은 ↻로 다른 문장
function raw(){
  const L = [], add = (id, text, cyc)=>L.push({ id, text, cyc }), on = k=>S.greet.includes(k);
  if(on("intro")) add("A1", A_INTRO[pickOf("A1")], "A1");
  if(on("guests")) add("A2", A_GUESTS);
  const m = memLine();
  if(m) add("M", m, "M");
  else { const b = pickOf("B"); if(b>=0) add("B", B_LINES[b], "B"); }
  if(on("reason")) add("C", C_LINES[pickOf("C")], "C");
  add("D", `${D_CALL} ${D_LINES[pickOf("D")][1]}`, "D");
  add("E", `${E_CALL} ${sd(E_LINES[pickOf("E")][1])}`, "E");
  add("F", F_LINES[pickOf("F")][1], "F");
  const k = pickOf("K"); if(k>=0) add("K", K_LINES[k][1], "K");
  if(S.decl==="y"){ add("S1", S_LINES[0]); add("S2", S_LINES[1]); }
  if(on("sadon")) add("G", G_LINES[pickOf("G")], "G");
  if(on("ask")) add("H", H_LINE);
  add("I", I_LINES[pickOf("I")][1], "I");
  add("J", J_LINE);
  return L;
}
// 뺀 줄을 거르고 표시를 바꿔요
function build(){
  const L = raw().filter(l=>!S.off[l.id]);
  const again = L.some(l=>l.id==="A2");
  return L.map(l=>{
    if(S.edit[l.id]!==undefined) return { ...l, text:S.edit[l.id] };
    return { ...l, text:fill(l.text.replace(/\{다시한번\}/g, again ? "다시 한번 " : "")) };
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
function signText(){ return `${kidP()} ${rd().pa} ${S.rname.trim() || "○○○"}`; }
function plain(lines){ return `덕담\n\n${lines.map(l=>l.text).join("\n\n")}\n\n${dateText()}\n${signText()}`; }

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
  if(sc==="result" || sc==="home" || sc==="names") S.ret = false;   // ret: 결과에서 질문으로 왔음 → "덕담으로 돌아가기"
  sel = null; aiOpen = false; armed = null;
  const st = { sc, step:S.step, back: how==="push" };
  if(how==="replace") history.replaceState(st, ""); else history.pushState(st, "");
  save(); render(); window.scrollTo(0,0);
}
function prevOf(){
  if(S.sc==="names") return ["home"];
  if(S.sc==="q") return S.step>0 ? ["q", S.step-1] : ["names"];
  if(S.sc==="result") return S.mode==="basic" ? ["names"] : ["q", QS.length-1];
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
function topBar(right){ return `<div class="top"><span>덕담</span><span class="count">${right||""}</span></div>`; }
function modeLabel(){ return S.mode==="basic" ? "정석 덕담" : "우리 이야기"; }

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const saved = S.mode && S.resume;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">덕담을 준비하는 <span class="nw">부모님과 신랑·신부님을 위한</span></p>
    <h1>덕담,<br>고르기만 하면<br>써져요</h1>
    <div class="bar"></div>
    <p class="lead">하시는 분을 고르고 몇 가지만 누르면 덕담이 나와요. 아들·딸, 며느리·사위를 부르는 말과 말투가 저절로 맞춰져요.</p>
    <div class="pick">
      ${saved ? `<button id="resume"><span>이어서 만들기</span><span class="q">만들던 덕담</span></button>` : ""}
      <button id="story"${armed==="story"?' class="armed"':""}><span>우리 이야기 넣어 만들기</span><span class="q">${armed==="story" ? WIPE : `질문 ${QS.length}개`}</span></button>
      <button id="basic"${armed==="basic"?' class="armed"':""}><span>정석 덕담으로 빠르게</span><span class="q">${armed==="basic" ? WIPE : "이름만 넣으면 끝"}</span></button>
    </div>
    <p class="note">※ 적은 내용은 이 휴대폰 브라우저 안에만 보관되고, 어디에도 올라가지 않아요.</p>
    ${foot()}`;
  // 만들던 덕담이 있으면 한 번 더 눌러야 새로 시작 (실수로 지우지 않게)
  const start = mode=>{
    if(saved && armed!==mode){ armed = mode; home(); return; }
    S = fresh(); S.mode = mode; S.imported = importNames(); nav("names", 0, "push");
  };
  document.getElementById("story").onclick = ()=>start("story");
  document.getElementById("basic").onclick = ()=>start("basic");
  const r = document.getElementById("resume");
  if(r) r.onclick = ()=>nav(S.resume.sc, Math.min(S.resume.step, QS.length-1), "jump");
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
    const clear = id=>{ delete S.edit[id]; delete S.off[id]; }, side0 = rd().side;
    if(max){ const arr = S[k], i = arr.indexOf(v); if(i>=0) arr.splice(i,1); else if(arr.length<max) arr.push(v); }
    else if(c.dataset.fixed==="1") S[k] = v;
    else S[k] = S[k]===v ? "" : v;
    if(k==="reader"){ S.edit = {}; S.off = {}; }   // 하시는 분이 바뀌면 문장이 통째로 바뀌어서, 고친 줄·뺀 줄은 처음으로
    if(k==="reader" && rd().side!==side0){ S.callG = ""; S.callB = ""; }   // 신랑 측 ↔ 신부 측이면 부르는 말도 처음으로 (아들 "민준아" → 사위 "민준 군")
    if(QSLOT[k]){ delete S.pick[QSLOT[k]]; clear(QSLOT[k]); }   // 질문에서 고르면 ↻·고친 글보다 먼저
    if(k==="greet" && S.greet.includes(v)) clear(GREET_ID[v]);
    if(k==="mem"){ clear("M"); clear("B"); }
    if(k==="decl"){ clear("S1"); clear("S2"); }
    save(); redraw();
    if(k==="mem" && v==="direct" && S.mem==="direct"){ const p = document.getElementById("memText"); if(p) p.focus(); }
  });
}

function callEx(){ return `덕담에는 이렇게 들어가요: 사랑하는 나의 ${vals()["아들"]} ${callOf(kidP())} · 그리고 우리 ${vals()["새식구"]} ${callOf(newP())}`; }
function names(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const r = rd(), V = vals();
  const kidK = sideG() ? "callG" : "callB", newK = sideG() ? "callB" : "callG";
  app.innerHTML = `
    ${topBar(modeLabel())}
    <h2 class="qt">누가 하시나요?</h2>
    <p class="qd">하시는 분에 따라 아들·딸, 며느리·사위를 부르는 말과 말투가 바뀌어요.</p>
    <div class="panel">${chips("reader", Object.entries(READERS).map(([k,x])=>[k, x.chip]), { fixed:true })}</div>
    <h2 class="qt sub">이름과 날짜</h2>
    <div class="panel">
      <label class="field"><span>신랑 이름</span><input id="groom" value="${esc(S.groom)}" placeholder="예: 김민준" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>신부 이름</span><input id="bride" value="${esc(S.bride)}" placeholder="예: 이서연" autocomplete="off" enterkeyhint="next"></label>
      ${S.imported ? `<p class="qd small">${esc(S.imported)}에 적은 이름을 가져왔어요.</p>` : ""}
      <p class="gt">덕담에서 부르는 말 <small>비워 두면 성을 빼고 불러요</small></p>
      <label class="field"><span>${V["아들"]}(${kidP()})</span><input id="callKid" value="${esc(S[kidK])}" placeholder="${esc(autoCall(kidP()))}" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>${V["새식구"]}(${newP()})</span><input id="callNew" value="${esc(S[newK])}" placeholder="${esc(autoCall(newP()))}" autocomplete="off" enterkeyhint="next"></label>
      <p class="qd small" id="callEx">${esc(callEx())}</p>
      <label class="field gap"><span>${r.chip} 성함 (선택)</span><input id="rname" value="${esc(S.rname)}" placeholder="예: 김영호" autocomplete="off" enterkeyhint="done"></label>
      <label class="field"><span>예식 날짜 (선택)</span><input id="date" type="date" value="${esc(S.date)}"></label>
    </div>
    <p class="qd small">비워 두면 ○○○로 나와서 손으로 적을 수 있어요. 성함은 첫인사와 맨 아래 서명에 들어가요.</p>
    <div class="nav"><button class="text-btn" id="prev">이전</button><button class="btn main" id="next">다음</button></div>
    ${foot()}`;
  bindChips();
  const $ = id=>document.getElementById(id);
  const sync = ()=>{
    $("callKid").placeholder = autoCall(kidP()); $("callNew").placeholder = autoCall(newP());
    $("callEx").textContent = callEx();
  };
  [["groom","groom"],["bride","bride"],["callKid",kidK],["callNew",newK],["rname","rname"],["date","date"]].forEach(([id, k])=>{
    const el = $(id);
    el.oninput = el.onchange = e=>{ S[k] = e.target.value; save(); sync(); };
  });
  // 키보드의 "다음"(엔터): 신랑 → 신부 → 부르는 말 → 성함
  const enter = (id, to)=>{ $(id).onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); to ? $(to).focus() : e.target.blur(); } }; };
  enter("groom","bride"); enter("bride","callKid"); enter("callKid","callNew"); enter("callNew","rname"); enter("rname");
  $("prev").onclick = goBack;
  $("next").onclick = ()=> S.mode==="basic" ? nav("result", undefined, "push") : nav("q", 0, "push");
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
function memTitle(){
  if(memLine()) return "";
  const b = pickOf("B")>=0;
  if(S.mem==="direct") return b ? "적기 전에는 이렇게 들어가요" : "적으면 여기에 문장이 보여요.";
  return b ? "안 고르면 이렇게 들어가요" : "안 고르면 이 줄은 빠져요.";
}
const NOW = "미리 켜져 있는 건 지금 덕담에 들어 있는 문장이에요.";
const QS = [
  { key:"greet", title:()=>"어떤 인사를 넣을까요?", desc:"넣을 것만 남겨요. 사돈·하객께 드리는 말은 덕담 끝에 들어가요.", has:()=>true, body:()=>`
      ${chips("greet", GREET, { max:GREET.length })}
      ${pv("greet", l=>Object.values(GREET_ID).includes(l.id), ()=> S.greet.length ? "" : "다 빼면 인사 없이 바로 덕담으로 시작해요.")}` },
  { key:"mem", title:()=>`${vals()["아들"]} 어릴 적 기억을 하나 넣을까요?`, desc:"고르면 덕담 첫머리에 들어가요. 안 골라도 돼요.", has:()=>S.mem!=="", body:()=>`
      ${chips("mem", [...memList(), ["direct","직접 적기"]])}
      ${S.mem==="direct" ? `<input id="memText" class="inp" value="${esc(S.memText)}" placeholder="예: 유치원 재롱잔치에서 울던 날" autocomplete="off" enterkeyhint="done" aria-label="기억 직접 적기">
      <p class="qd small">"~던 날"처럼 적으면 자연스러워요.</p>` : ""}
      ${pv("mem", l=>l.id==="M"||l.id==="B", memTitle)}` },
  { key:"kids", title:()=>`${vals()["아들"]}에게, ${vals()["새식구"]}에게 한마디`, desc:`하나씩 골라요. ${NOW}`, has:()=>S.child!=="" || S.newb!=="", body:()=>`
      <p class="gt">${vals()["아들"]}에게</p>${chips("child", idx(D_LINES.map(d=>fill(d[0]))), { fixed:true, cur:qcur("D") })}
      ${pv("d", l=>l.id==="D")}
      <p class="gt">${vals()["새식구"]}에게</p>${chips("newb", idx(E_LINES.map(e=>fill(e[0]))), { fixed:true, cur:qcur("E") })}
      ${pv("e", l=>l.id==="E")}` },
  { key:"both", title:()=>"두 사람에게 당부 한마디", desc:`하나만 골라요. ${NOW}`, has:()=>S.both!=="" || S.last!=="", body:()=>`
      ${chips("both", idx(F_LINES.map(f=>f[0])), { fixed:true, cur:qcur("F") })}
      ${pv("f", l=>l.id==="F")}
      <p class="gt">마지막으로 한마디 더</p>${chips("last", [...idx(K_LINES.map(k=>k[0])), ["n","안 넣어요"]], { fixed:true, cur:qcur("K") })}
      ${pv("k", l=>l.id==="K", ()=> pickOf("K")<0 ? "안 넣으면 이 줄은 빠져요." : "")}` },
  { key:"end", title:()=>"끝맺음을 골라요", desc:"", has:()=>S.decl!=="" || S.close!=="", body:()=>`
      <p class="gt">성혼선언도 이어서 하시나요?</p>
      ${chips("decl", [["y","네, 이어서 해요"],["n","아니요"]], { fixed:true, cur: S.decl==="y" ? "y" : "n" })}
      ${S.decl==="y" ? pv("s", l=>l.id[0]==="S") : `<p class="qd small">주례 없는 예식에서는 덕담하시는 분이 성혼선언까지 맡으시기도 해요. 그러면 덕담 끝에 짧은 성혼선언을 붙여요.</p>`}
      <p class="gt">마무리 인사</p>${chips("close", idx(I_LINES.map(i=>i[0])), { fixed:true, cur:qcur("I") })}
      ${pv("i", l=>l.id==="I"||l.id==="J")}` }
];

// 아래에 붙는 막대: 이전 · 읽는 시간 · 다음(안 골랐으면 건너뛰기). 결과에서 왔으면 덕담으로 돌아가기
function nextLabel(){ return S.step===QS.length-1 ? "덕담 보기" : QS[S.step].has() ? "다음" : "건너뛰기"; }
function barTime(){
  const sec = seconds(build());
  return `<span class="${sec>LIMIT?"over":""}">읽는 시간 약 ${timeText(sec)}</span>`;
}
function refreshPreview(){
  Object.keys(PV).forEach(id=>{ const el = document.getElementById("pv-"+id); if(el) el.innerHTML = pvInner(id); });
  const t = document.getElementById("qtime"); if(t) t.innerHTML = barTime();
  const n = document.getElementById("next"); if(n && !S.ret) n.textContent = nextLabel();
}

function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  S.step = Math.max(0, Math.min(S.step, QS.length-1));
  const q = QS[S.step], last = QS.length-1;
  Object.keys(PV).forEach(k=>delete PV[k]);
  app.innerHTML = `
    ${topBar(`질문 ${S.step+1} / ${QS.length}`)}
    <h2 class="qt">${esc(q.title())}</h2>
    ${q.desc ? `<p class="qd">${esc(q.desc)}</p>` : ""}
    <div class="panel">${q.body()}</div>
    <div class="qbar">
      <button class="text-btn" id="prev">이전</button>
      ${S.ret
        ? `<span class="nav-r">${S.step<last ? `<button class="text-btn" id="next">다음 질문</button>` : ""}<button class="btn main" id="toResult">덕담으로 돌아가기</button></span>`
        : `<span class="qtime" id="qtime">${barTime()}</span><button class="btn main" id="next">${nextLabel()}</button>`}
    </div>
    ${foot()}`;
  bindChips();
  const mt = document.getElementById("memText");
  if(mt){
    mt.oninput = e=>{ S.memText = e.target.value; delete S.edit.M; save(); refreshPreview(); };
    mt.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); mt.blur(); } };
  }
  const next = ()=> S.step < last ? nav("q", S.step+1, "push") : nav("result", undefined, "push");
  document.getElementById("prev").onclick = goBack;
  const n = document.getElementById("next"); if(n) n.onclick = next;
  const tr = document.getElementById("toResult"); if(tr) tr.onclick = ()=>nav("result", undefined, "push");
}

// ===== 결과 =====
function timeHtml(lines){
  const sec = seconds(lines);
  return `읽는 데 약 ${timeText(sec)} 걸려요${sec>LIMIT ? `<span class="over">${timeText(LIMIT)}이 넘어요. 문장을 눌러 하나 빼 보세요.</span>` : ""}`;
}
let imgTimer = null;
function fileName(){ return `덕담-${S.groom.trim()||"신랑"}-${S.bride.trim()||"신부"}`; }

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const r = rd(), lines = build();
  const rows = lines.map(l=>{
    const on = sel===l.id;
    // 누른 줄 아래 상자는 저장 이미지에서 빠져요 (data-html2canvas-ignore)
    const box = !on ? "" : `
      <div class="edit-box" data-html2canvas-ignore>
        <textarea class="inp" id="editTxt" rows="4" aria-label="문장 고치기">${esc(l.text)}</textarea>
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
  // 다른 사이트 버튼: 릴스가 생기면 보여요 (성혼선언문·식순표)
  const link = (k, label)=> (SITES[k].reel || SITES[k].direct) ? siteLink(k, "btn ghost", label) : "";
  app.innerHTML = `
    ${topBar(modeLabel())}
    <div class="tabs" role="group" aria-label="문장 스타일 고르기">${STYLES.map((s,i)=>`<button class="chip${i===S.style?" on":""}" data-style="${i}" aria-pressed="${i===S.style}">${s}</button>`).join("")}</div>
    <p class="edit-hint">문장을 누르면 바꾸거나, 고치거나, 뺄 수 있어요.</p>
    <article class="card decl" id="card">
      <div class="head"><span class="kind">WORDS OF BLESSING</span><span class="handle">@wed_voice.su</span></div>
      <h2>덕담</h2>
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
        <button class="btn ghost" id="copyText">덕담 글만 복사하기<span class="sub">인쇄하거나 직접 고칠 때</span></button>
        <p class="msg" id="msg" role="status"></p>
      </div>
    </div>
    <div class="tip"><b>사회자 팁</b>${TIPS.map(t=>`<p>· ${esc(t)}</p>`).join("")}</div>
    <div class="btns more">
      <button class="btn ghost" id="aiBtn" aria-expanded="${aiOpen}">AI로 더 다듬기 ${aiOpen ? "▴" : "▾"}</button>
      ${!aiOpen ? "" : `
      <div class="panel ai-panel">
        <p class="gt">넣고 싶은 이야기 메모</p>
        <p class="qd">${r.call}이 꼭 하고 싶으신 말이나 가족 이야기를 편하게 적어요. AI에게 보낼 글에만 들어가고, 덕담에는 들어가지 않아요.</p>
        <textarea id="memo" class="inp" rows="4" placeholder="예: 어릴 때부터 동생을 잘 챙기던 ${vals()["아들"]}이었어요">${esc(S.memo)}</textarea>
        <button class="btn main" id="copyAi">AI에게 보낼 글 복사하기</button>
        <p class="msg" id="msgAi" role="status"></p>
        <p class="qd small">챗GPT 같은 AI 앱에 붙여 넣으면 다듬어 줘요.</p>
      </div>`}
      ${S.mode==="basic" ? `<button class="btn ghost" id="toStory">우리 이야기 넣기 · 질문 ${QS.length}개</button>` : `<button class="btn ghost" id="again">질문 다시 고르기</button>`}
      <button class="btn ghost" id="toNames">하시는 분·이름 바꾸기</button>
      ${link("declare","성혼선언문 만들기")}
      ${link("flow","식순표 만들기")}
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
      <button class="text-btn btn-link" id="home">처음으로</button>
    </div>
    ${foot()}`;
  prepareImage(fileName());
  const $ = id=>document.getElementById(id);
  // 탭: 탭이 정하는 줄을 그 스타일로. ↻로 바꾼 것·그 줄에서 고친 글·빼기는 처음으로 (질문에서 고른 문장은 그대로)
  app.querySelectorAll("[data-style]").forEach(b=>b.onclick = ()=>{
    S.style = +b.dataset.style; S.pick = {};
    ["A1","B","C","G", ...Object.keys(QKEY).filter(s=>S[QKEY[s]]==="")].forEach(id=>{ delete S.edit[id]; delete S.off[id]; });
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
      delete S.edit[sel];
      if(c==="M"){   // 기억: 칩 목록에서 다음 기억으로
        const list = memList().map(m=>m[0]), i = list.indexOf(S.mem);
        S.mem = list[(i+1) % list.length];
      }
      else S.pick[c] = (Math.max(pickOf(c), 0) + 1) % COUNT[c];
      save(); redraw();
    };
    $("offLine").onclick = ()=>{ S.off[sel] = true; delete S.edit[sel]; sel = null; save(); redraw(); };
    $("doneLine").onclick = ()=>closeLine();
  }
  const rs = $("restore"); if(rs) rs.onclick = ()=>{ S.off = {}; save(); redraw(); };
  $("save").onclick = saveCard;
  $("copySend").onclick = ()=>copy(sendText(), `${r.call}께 보낼 글을 복사했어요. 카톡에 붙여 넣어 보내 보세요.`, "msg");
  $("copyText").onclick = ()=>copy(plain(build()), "덕담 글을 복사했어요.", "msg");
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
// 이 줄을 만든 질문 (결과에서 "질문에서 다시 고르기"로 바로 가요). 우리 이야기로 만들 때만
function qOf(l){
  if(S.mode!=="story") return undefined;
  const key = { A1:"greet", A2:"greet", C:"greet", G:"greet", H:"greet", M:"mem", B:"mem", D:"kids", E:"kids",
                F:"both", K:"both", S1:"end", S2:"end", I:"end", J:"end" }[l.id];
  const i = QS.findIndex(q=>q.key===key);
  return i<0 ? undefined : i;
}
// 누른 줄 닫기. 글을 다 지웠으면 그 줄은 빼요. keep=true면 다시 그리지 않음
function closeLine(keep){
  if(sel && S.edit[sel]!==undefined && !S.edit[sel].trim()){ delete S.edit[sel]; S.off[sel] = true; }
  if(!keep){ sel = null; save(); redraw(); }
}

// 하시는 분께 보내는 글: 인사 + 읽는 시간 + 덕담
function sendText(){
  const r = rd(), lines = build(), t = timeText(seconds(lines));
  return `${r.call}, 식에서 해 주실 덕담이에요.\n소리 내어 두세 번 읽어 보시면 당일에 한결 편하실 거예요. 말씀하시기 편하게 고치셔도 괜찮아요. (읽는 데 약 ${t})\n\n${plain(lines)}`;
}
function aiPrompt(){
  const r = rd(), V = vals();
  return `아래는 결혼식에서 ${kidP()}의 ${r.pa}가 할 덕담 초안이에요.
'메모'를 참고해서, 더 자연스럽고 우리 가족 이야기 같게 다듬어 주세요.

지킬 것
- 하객께는 존댓말, ${V["아들"]}${josa(V["아들"],"와")} ${V["새식구"]}에게는 초안의 말투 그대로
- 소리 내어 읽어서 ${timeText(LIMIT)} 안 (공백 빼고 ${LIMIT*4}자 안)
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
    <h1>덕담,<br>고르기만 하면<br>써져요</h1>
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
