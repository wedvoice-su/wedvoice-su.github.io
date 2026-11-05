// 덕담 만들기 (샘플): 하시는 분 고르기 → 정석 덕담 / 우리 이야기(질문 5개) → 덕담 카드
// 문장은 docs/덕담/문구.txt 2판 (2026-11-05: 샘플은 참고만 하고 요즘 덕담 흐름에 맞춰 전부 새로 씀). 번호(A-1, D-2 …)는 문구.txt 번호
// 화면 구조·줄 손보기·보관 방식은 성혼선언문(declared-wed/app.js)과 같아요. 공통 기능은 shared/common.js

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/with-our-blessing/?preview)
const OPEN = false;
const SEC_PER_CHAR = 1/4;   // 1초에 4자 (참고용, 혼인서약서·성혼선언문과 같은 계산. 11/5 사회자님: 그대로)
const LIMIT = 180;          // 읽는 시간 기준 3분: 식순표에서 덕담을 3분으로 잡았어요 (11/5 사회자님: 혼인서약서·성혼선언문도 3분)

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
// 2026-11-05 2판: 샘플은 참고만 하고 전부 새로 씀. 요즘 덕담 흐름(조사: docs/덕담/기획.md "2판")
//   1~2분 안으로 짧게 · 잔소리·지시 대신 응원과 고마움 · 2세·돈·비교 이야기 빼기 · 웃음 한 줄과 진심
// 탭이 정하는 기본 문장 (배열 번호, -1은 안 넣음). 질문에서 고르거나 ↻로 바꾸면 그게 먼저
const TAB = [
  { A1:0, B:0,  C:0, D:1, E:0, F:2, K:-1, G:0, I:0 },   // 정석
  { A1:1, B:1,  C:0, D:0, E:1, F:1, K:0,  G:1, I:1 },   // 따뜻하게
  { A1:0, B:-1, C:1, D:2, E:0, F:0, K:-1, G:2, I:2 }    // 짧게
];
// 인사 (질문 1에서 넣을 것만). 사돈·하객 부탁은 덕담 끝에 들어가요
const GREET = [["intro","내 소개"],["guests","하객께 감사"],["reason","덕담을 맡게 된 이야기"],["sadon","사돈께 감사"],["ask","하객께 응원 부탁"]];
const GREET_ID = { intro:"A1", guests:"A2", reason:"C", sadon:"G", ask:"H" };
const A_INTRO = [
  "안녕하십니까. {자기소개}입니다.",                    // A-1
  "오늘 {아들}만큼 떨리는 사람, {자기소개}입니다." ];   // A-1b
const A_GUESTS = "바쁘신 중에도 저희 아이들의 결혼을 축하하러 와 주신 모든 분들께 진심으로 감사드립니다.";  // A-2
// B 오늘의 마음 (탭이 정함, ↻로 5개를 돌아요). 질문 2에서 기억을 고르면 그 줄(M)이 대신 들어가요
const B_LINES = [
  "자식이 짝을 만나 새 가정을 꾸리는 날, 부모에게 이보다 기쁜 날은 없다고들 하지요. 오늘 제가 그 말을 실감합니다.",  // B-1 기쁜 날
  "제 품에 쏙 들어오던 아이가, 오늘은 {역할이} 되어 이렇게 제 앞에 서 있네요. 세월이 참 빠릅니다.",  // B-2 세월
  "오늘 저희 집에도, 사돈댁에도 새 가족이 생깁니다. 두 집안이 한 가족이 되는, 참 고마운 날입니다.",  // B-3 새 가족
  "단상에 서서 보니, 저희 아이들을 아끼고 응원해 주신 얼굴들이 한눈에 보입니다. 아이들이 참 많은 사랑을 받고 자랐구나 싶습니다.",  // B-4 고마운 얼굴
  "오늘 아침까지도 실감이 안 났는데, 이렇게 단상에 서니 이제야 떨리네요." ];  // B-5 떨림 (웃음)
// M 어릴 적 기억 (질문 2) [칩, 들어가는 말, 신랑 측만이면 "g"]
const MEM = [
  ["걸음마 떼던 날","처음 걸음마를 떼던 날"],
  ["{아빠}라고 처음 부르던 날","처음 {아빠}라고 부르던 날"],
  ["초등학교 입학식","초등학교 입학식 날"],
  ["자전거 배우던 날","처음 자전거를 배우던 날"],
  ["대학 합격 소식","대학 합격 소식을 듣던 날"],
  ["군대 가던 날","군대에 가던 날","g"],
  ["첫 월급 받던 날","첫 월급을 받아 오던 날"] ];
const M_LINE = "{기억} 엊그제 같은데, 그 아이가 오늘 {역할이} 되어 제 앞에 서 있네요. 세월이 참 빠릅니다.";  // M-0
// C 덕담을 맡게 된 이야기 (인사 질문에서 켰을 때. 탭: 정석·따뜻하게 C-1, 짧게 C-2, ↻로 C-3)
const C_LINES = [
  "아이들이 덕담을 부탁해서 이 자리에 섰습니다. 잔소리 대신, 응원만 짧게 하겠습니다.",  // C-1
  "양가를 대표해, 새 출발 하는 두 사람에게 몇 마디 전하겠습니다.",  // C-2
  "말주변이 없어서 몇 번을 고쳐 썼는데, 결국 하고 싶은 말은 하나였습니다. 축하하고, 고맙다는 말입니다." ];  // C-3
// D 내 자녀에게 (질문 3) — 부르는 말 + 한마디 [칩, 문장]
const D_CALL = "사랑하는 우리 {아들} {자녀부름}.";  // D-0
const D_LINES = [
  ["자라 줘서 고마워","건강하게 자라 줘서, 그리고 이렇게 좋은 사람을 만나 줘서 고맙다."],  // D-1
  ["네 선택을 믿어","네가 고른 사람이라 우리는 아무 걱정이 없다. 둘이 함께라면 뭐든 잘 해낼 거다."],  // D-2
  ["행복이 제일 큰 효도","앞으로 효도는 따로 안 해도 된다. 둘이 행복하게 사는 것, 그게 제일 큰 효도다."],  // D-3
  ["가끔 밥 먹으러 와","이제 현관에서 다녀왔습니다 소리가 안 들리겠구나. 허전하겠지만 그만큼 기쁘다. 가끔 밥 먹으러 와라."],  // D-4 (웃음)
  ["{배우자} 곁을 지켜 줘","기쁜 날에도 힘든 날에도, {배우자} 곁을 가장 먼저 지키는 사람이 되어 주렴."] ];  // D-5
// E 새 식구에게 (질문 3) — 부르는 말 + 한마디 [칩, 문장]
//   g: 며느리에게 (해라체) · b: 아버님이 사위에게 (하게체) · bm: 어머님이 사위에게 (해요체)
const E_CALL = "그리고 우리 {새식구} {새식구부름}.";  // E-0
const E_LINES = [
  ["가족이 되어 줘서 고마워", { g:"우리 가족이 되어 줘서 고맙다. 시댁 문턱은 낮춰 둘 테니, 언제든 편하게 들러라.",
                               b:"우리 가족이 되어 줘서 고맙네. 처가 문턱은 낮춰 둘 테니, 언제든 편하게 들르게.",
                               bm:"우리 가족이 되어 줘서 고마워요. 처가 문턱은 낮춰 둘 테니까, 언제든 편하게 들러요." }],  // E-1
  ["우리가 먼저 잘할게", { g:"시댁이라고 어렵게 생각하지 마라. 우리가 먼저 잘할게.",
                          b:"처가라고 어렵게 생각하지 말게. 우리가 먼저 잘하겠네.",
                          bm:"처가라고 어렵게 생각하지 말아요. 우리가 먼저 잘할게요." }],  // E-2
  ["{새가족이} 하나 생겼어", { g:"오늘 나에게 딸이 하나 생겼다. 이렇게 좋은 사람이 우리 가족이 되다니, 고맙고 또 고맙다.",
                              b:"오늘 나에게 아들이 하나 생겼네. 이렇게 듬직한 사람이 우리 가족이 되다니, 고맙고 또 고맙네.",
                              bm:"오늘 나에게 아들이 하나 생겼네요. 이렇게 듬직한 사람이 우리 가족이 되어서, 고맙고 또 고마워요." }],  // E-3
  ["속상하면 언제든 말해", { g:"우리 아들이랑 많이 웃으며 살아라. 혹시 아들이 속상하게 하면 언제든 말해라. 그땐 내가 네 편이다.",
                           b:"우리 딸이랑 많이 웃으며 살아 주게. 혹시 딸이 속상하게 하면 언제든 말하게. 그땐 내가 자네 편이네.",
                           bm:"우리 딸이랑 많이 웃으며 살아 줘요. 혹시 딸이 속상하게 하면 언제든 말해요. 그땐 내가 사위 편 들어 줄게요." }] ];  // E-4 (웃음)
// F 두 사람에게 (질문 4) — 지시 대신 바람으로 [칩, 문장]
const F_LINES = [
  ["잠들기 전에 화해","두 사람, 다투는 날도 있겠지만 잠들기 전에는 꼭 손잡고 화해하면 좋겠다."],  // F-1
  ["제일 먼저 생각나는 사람","두 사람, 하루를 마치면 제일 먼저 생각나는 사람이 언제나 서로이기를 바란다."],  // F-2
  ["기쁨은 두 배, 힘듦은 반","두 사람, 기쁜 일은 나눠서 두 배로, 힘든 일은 나눠서 반으로 만들며 살아가기를 바란다."],  // F-3
  ["둘만의 속도로","두 사람, 남들과 비교하지 말고 둘만의 속도로 행복하면 좋겠다."],  // F-4
  ["고맙다, 사랑한다 자주","두 사람, 고맙다 사랑한다는 말은 아끼지 않았으면 좋겠다. 그 말은 아낄수록 손해더라."],  // F-5 (웃음)
  ["눈치 보지 말고 둘이 정한 대로","두 사람, 양가 눈치 보지 말고 둘이 함께 정한 길로 가면 된다. 우리는 그 길을 응원한다."] ];  // F-6
// K 마지막 한마디 (질문 4) [칩, 문장]
const K_LINES = [
  ["사랑한다, 얘들아","사랑한다, 얘들아."],  // K-1
  ["늘 너희 편이야","어디에 있든, 우리는 늘 너희 편이다."],  // K-2
  ["오늘 정말 멋지다","결혼 축하한다. 오늘 둘 다 정말 멋지다."] ];  // K-3
// S 성혼선언까지 이어서 (질문 5) — 하객 부탁 뒤, 마무리 인사 바로 앞
const S_LINES = [
  "이어서 성혼선언을 하겠습니다.",  // S-1
  "저는 양가를 대표하여, 신랑 {신랑} 군과 신부 {신부} 양이 이제 부부가 되었음을 여러분 앞에 엄숙히 선언합니다." ];  // S-2
// G 사돈께 감사 (탭이 정함) — "보내 주신"은 쓰지 않음
const G_LINES = [
  "귀한 {사돈자녀를} 이렇게 훌륭하게 키워 주신 사돈 내외분께 진심으로 감사드립니다.",  // G-1
  "좋은 인연으로 한 가족이 된 사돈 내외분께도 감사드립니다. 앞으로 두 집안이 서로 기대며 오래오래 잘 지내면 좋겠습니다.",  // G-2
  "우리 {아들을} 아껴 줄 사람을 이렇게 반듯하게 키워 주신 사돈 내외분께 고개 숙여 감사드립니다." ];  // G-3
const H_LINE = "하객 여러분께도 부탁드립니다. 앞으로 두 사람을 만나시면 지금처럼 따뜻하게 응원해 주세요. 그 응원이 두 사람에게 큰 힘이 될 겁니다.";  // H-1
// I 마무리 인사 (질문 5) [칩, 문장]
const I_LINES = [
  ["하객께 다시 감사","끝으로, 오늘 함께해 주신 하객 여러분께 {다시한번}감사드리며, 여러분의 가정에도 늘 행복이 가득하시길 바랍니다."],  // I-1
  ["숙제 절반 마쳤어요","자식 키우는 숙제, 오늘로 절반은 마친 것 같습니다. 나머지 절반은 두 사람이 행복하게 채워 주리라 믿습니다."],  // I-2 (웃음)
  ["식사 맛있게 하세요","오늘 함께해 주신 모든 분들, 식사 맛있게 하시고 즐겁게 머물다 가십시오."] ];  // I-3
const J_LINE = "감사합니다.";  // J-1
const TIPS = [  // 사회자 팁 (초안, 검수.txt 정1)
  "큰 글씨로 뽑아 드리고, 식 전에 소리 내어 두세 번 읽어 보시게 해 주세요.",
  "덕담은 2분 안팎이 가장 좋아요. 3분을 넘으면 뒤 순서가 밀려요.",
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
// 신랑 측·신부 측 문장. 어머님이 사위에게 하는 말(bm)이 따로 있으면 그것 (아버님은 하게체, 어머님은 해요체)
function sd(x){ if(typeof x==="string") return x; const r = rd(); return (r.side==="b" && r.pa==="어머니" && x.bm) || x[r.side]; }
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
  if(on("sadon")) add("G", G_LINES[pickOf("G")], "G");
  if(on("ask")) add("H", H_LINE);
  // 성혼선언은 마무리 인사 바로 앞 (선언 뒤 박수가 사돈 인사로 끊기지 않게)
  if(S.decl==="y"){ add("S1", S_LINES[0]); add("S2", S_LINES[1]); }
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
    <p class="lead">하시는 분을 고르고 몇 가지만 누르면, 잔소리 대신 응원을 담은 덕담이 나와요. 아들·딸, 며느리·사위를 부르는 말과 말투도 저절로 맞춰져요.</p>
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
  { key:"both", title:()=>"두 사람에게 바라는 한마디", desc:`하나만 골라요. ${NOW}`, has:()=>S.both!=="" || S.last!=="", body:()=>`
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
  return `읽는 데 약 ${timeText(sec)} 걸려요${sec>LIMIT ? `<span class="over">${timeText(LIMIT)}이 넘어요. 문장을 눌러 하나 빼 보세요.</span>` : ""}<span class="ref">사람마다 읽는 속도가 달라서, 참고용 시간이에요.</span>`;
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
  const lines = build(), t = timeText(seconds(lines));
  return `식에서 해 주실 덕담이에요.\n소리 내어 두세 번 읽어 보시면 당일에 한결 편하실 거예요. 말씀하시기 편하게 고치셔도 괜찮아요. (읽는 데 약 ${t})\n\n${plain(lines)}`;
}
function aiPrompt(){
  const r = rd(), V = vals();
  return `아래는 결혼식에서 ${kidP()}의 ${r.pa}가 할 덕담 초안이에요.
'메모'를 참고해서, 더 자연스럽고 우리 가족 이야기 같게 다듬어 주세요.

지킬 것
- 하객께는 존댓말, ${V["아들"]}${josa(V["아들"],"와")} ${V["새식구"]}에게는 초안의 말투 그대로
- 소리 내어 읽어서 ${timeText(LIMIT)} 안 (공백 빼고 ${LIMIT*4}자 안)
- 메모에 없는 일은 지어내지 않기
- 잔소리나 지시보다 응원과 고마움 위주로
- 2세 계획, 돈, 다른 집과 비교하는 이야기는 넣지 않기
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
