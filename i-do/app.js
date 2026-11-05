// 혼인서약서 만들기 (샘플): 기본 서약서 / 우리 이야기(질문 6개) → 서약서 카드
// 문장은 전부 docs/혼인서약서/문구.txt 첫 버전 그대로. 번호는 문구.txt 줄 번호
// 공통 기능은 shared/common.js

// 공개 전에는 false. 미리 보려면 주소 뒤에 ?preview 를 붙여요. (예: …/i-do/?preview)
const OPEN = false;
const SEC_PER_CHAR = 1/4;   // 1초에 4자 (추정, 01-b)
const LIMIT_SEC = 120;      // 2분 (식순표 혼인서약 2분)

// ===== 문장 =====
// 표시: {신랑} {신부} 이름 · {신랑은} {신부를} 처럼 조사 자동 · {역할이} 읽는 사람에 따라 남편이/아내가
const BASIC = [  // 03
  { name:"정석", lines:[
    ["신랑","나 {신랑은} 어떤 순간에도 신부 {신부를} 깊이 사랑하고 아끼겠습니다."],
    ["신랑","당신이 나의 마지막 사랑임을 잊지 않고, 어떤 어려움이 와도 언제나 당신 곁으로 돌아오겠습니다."],
    ["신부","나 {신부는} 삶의 동반자로서, 사랑으로 품고 사랑으로 기다리겠습니다."],
    ["신부","대화가 필요할 땐 먼저 말을 건네고, 침묵이 필요할 땐 조용히 곁을 지키겠습니다."],
    ["신랑","서로 다른 곳에서, 서로 다른 모습으로 자라 왔지만"],
    ["신부","오늘부터는 부부로서, 같은 곳을 바라보며 걸어가겠습니다."],
    ["함께","지금 이 마음 그대로, 평생 서로만을 사랑하겠습니다."] ]},
  { name:"다정", lines:[
    ["신랑","오늘 이 시간, 세상에서 가장 소중한 당신을 아내로 맞이합니다."],
    ["신부","오늘 이 시간, 세상에서 가장 든든한 당신을 남편으로 맞이합니다."],
    ["신랑","당신의 마음을 누구보다 먼저 헤아리고, 우리 가정을 첫자리에 두는 남편이 되겠습니다."],
    ["신부","아낌없이 사랑을 표현하고, 서로의 꿈을 함께 가꾸는 아내가 되겠습니다."],
    ["신랑","작은 거짓말도 하지 않고, 말과 행동으로 믿음을 주겠습니다."],
    ["신부","어렵고 힘든 순간에도, 언제나 당신의 쉼터가 되겠습니다."],
    ["함께","처음 만났던 날의 설렘 그대로, 평생을 함께하겠습니다."] ]},
  { name:"유쾌", lines:[
    ["함께","저희 두 사람이 부부가 되는 오늘, 함께해 주신 귀한 분들 앞에서 다음을 서약합니다."],
    ["신랑","아내를 배려하는 남편이 되겠습니다."],
    ["신부","남편을 이해하는 아내가 되겠습니다."],
    ["신랑","화장하지 않은 모습도 세상에서 제일 예쁘다고 말하겠습니다."],
    ["신부","뱃살이 늘고 머리숱이 줄어도 변함없이 사랑하겠습니다."],
    ["신랑","사랑한다는 말을 아끼지 않는, 표현하는 남편이 되겠습니다."],
    ["신부","서로에게 혼자만의 시간도 선물할 줄 아는 아내가 되겠습니다."],
    ["신랑","여윳돈이 생기면 숨기지 않고, 보증은 절대 서지 않겠습니다."],
    ["신부","알뜰하게 살림을 꾸려 우리의 내일을 든든하게 만들겠습니다."],
    ["함께","같은 방향으로 꿈을 꾸고, 그 꿈을 향해 서로의 손을 꼭 잡고 걸어가겠습니다."] ]}
];
const OPENS = [  // 04-1~3
  "귀한 시간 내어 발걸음 해 주신 모든 분들께, 진심으로 감사드립니다.",
  "저희 두 사람이 부부가 되는 오늘, 함께해 주신 귀한 분들 앞에서 서약합니다.",
  "부모님과 소중한 분들 앞에서, 저희 두 사람이 평생의 약속을 드립니다."
];
const BRIDGE = "소중한 분들을 모신 이 자리에서, 모두에게 약속합니다.";  // 04-11
const OATH = [  // 04-21·22
  ["신랑","나 {신랑은} 신부 {신부를} 아내로 맞아, 평생을 함께하겠습니다."],
  ["신부","나 {신부는} 신랑 {신랑을} 남편으로 맞아, 평생을 함께하겠습니다."]
];
const CLOSES = [  // 04-31~33
  "축복해 주신 여러분의 마음을 잊지 않고, 오늘처럼 서로만 바라보며 행복하게 살겠습니다.",
  "지금 이 마음 그대로, 평생 서로만을 사랑하겠습니다.",
  "같은 방향으로 꿈을 꾸고, 서로의 손을 꼭 잡고 걸어가겠습니다."
];
const MEET = [  // 05-1~8 [칩, 들어가는 말]
  ["소개팅","소개팅 자리에서"],["같은 회사","같은 회사에서"],["같은 학교","같은 학교에서"],
  ["동호회·모임","같은 모임에서"],["친구 소개","친구의 소개로"],["오랜 친구","친구로"],
  ["앱·온라인","휴대폰 화면 너머로"],["여행지","낯선 여행지에서"]
];
const IMP = ["환하게 웃던","수줍게 인사하던","긴장해서 말이 빨라지던","조용히 이야기를 들어 주던","맛있게 밥을 먹던",
  "열심히 일하던","멀리서도 눈에 띄던","늦을까 봐 뛰어오던","처음 보는데도 편안하던","무뚝뚝해 보이던"];  // 06-1~10
const CONF_LINE = "먼저 용기 내어 다가와 준 당신 덕분에, 오늘 우리가 여기 서 있습니다.";  // 07-1·2
const CONF_DIFF = [["신랑","누가 먼저 좋아했는지는 아직도 의견이 갈리지만,"],["신부","서로를 고른 것만큼은, 둘 다 참 잘한 일입니다."]];  // 07-3
const LOVE0 = "그렇게 우리는 서로에게 스며들어, 오늘 이 자리에 섰습니다.";  // 07-10
const LOVE = [  // 07-11~19
  ["오래 만났어요","오랜 시간 서로의 곁을 지켜 온 우리가, 오늘 이 자리에 섰습니다."],
  ["장거리 연애","먼 길을 오가며 만나던 우리가, 이제는 같은 집으로 돌아갑니다."],
  ["힘든 시기를 함께 견뎠어요","힘든 날에도 서로의 손을 놓지 않았기에, 오늘 이 자리에 섰습니다."],
  ["짧게 만나고 확신했어요","길지 않은 시간이었지만, 서로가 평생의 짝임을 단번에 알아보았습니다."],
  ["친구에서 연인으로","가장 편한 친구에서 가장 소중한 사람이 되어, 오늘 이 자리에 섰습니다."],
  ["여행을 많이 다녔어요","함께 걸은 수많은 여행길 끝에서, 평생 같이 걸을 사람을 알아보았습니다."],
  ["반려동물과 함께","우리 집 막내와 함께한 시간을 지나, 오늘 정식으로 한 가족이 됩니다."],
  ["늦게 찾아온 인연","조금 늦게 찾아온 인연이기에, 더 소중히 지켜 가겠습니다."],
  ["많이 싸우고 많이 화해했어요","많이 다투고 그보다 더 많이 화해하며, 오늘 이 자리에 섰습니다."]
];
const PROM = [  // 08-1~13
  ["먼저 사과하기","서운한 날엔 하루를 넘기지 않고, 먼저 손을 내미는 {역할이} 되겠습니다."],
  ["표현 아끼지 않기","사랑한다는 말, 고맙다는 말을 아끼지 않는 {역할이} 되겠습니다."],
  ["대화로 풀기","화가 나는 날에도, 비난보다 대화를 먼저 꺼내겠습니다."],
  ["쉼터 되기","지친 하루 끝에 가장 먼저 기대고 싶은, 편안한 쉼터가 되겠습니다."],
  ["꿈 응원하기","당신의 꿈을 내 꿈처럼 응원하는, 든든한 {역할이} 되겠습니다."],
  ["양가 부모님 공경","양가 부모님을 내 부모님처럼 아끼고 공경하겠습니다."],
  ["혼자만의 시간","서로에게 혼자만의 시간도 선물할 줄 아는 {역할이} 되겠습니다."],
  ["건강 챙기기","당신 곁에 오래 있을 수 있도록, 내 건강부터 잘 챙기겠습니다."],
  ["믿음 주기","작은 거짓말도 하지 않고, 말과 행동으로 믿음을 주겠습니다."],
  ["집안일 함께","집안일은 돕는 것이 아니라 함께하는 것임을 잊지 않겠습니다."],
  ["다름 존중","나와 다른 생각도, 있는 그대로 존중하겠습니다."],
  ["처음 마음 지키기","처음 만난 날의 설렘을 잊지 않고, 오늘의 마음을 평생 지키겠습니다."],
  ["가정을 첫자리에","무슨 일이 있어도, 우리 가정을 첫자리에 두는 {역할이} 되겠습니다."]
];
const TRAITS = [  // T01~T25 [칩, A 상대가 말함, B 본인이 말함]
  ["잘 먹어요","무엇이든 맛있게 먹어 주는 당신을 위해, 평생 맛집을 찾아 두겠습니다.","맛있는 걸 먹을 때마다, 당신 몫부터 먼저 덜어 두겠습니다."],
  ["요리를 잘해요","맛있는 밥을 차려 주는 당신을 위해, 설거지는 평생 내가 맡겠습니다.","평생 당신 입맛에 꼭 맞는 밥을 차리겠습니다."],
  ["요리는 자신 없어요","요리는 내가 맡을 테니, 당신은 맛있다는 말만 해 주세요.","밥솥 물 양은 못 맞춰도, 당신 마음만은 늘 정확하게 맞추겠습니다."],
  ["아침잠이 많아요","아침잠 많은 당신을, 알람보다 다정하게 깨우겠습니다.","아침잠은 많아도, 당신에게 건네는 아침 인사만은 거르지 않겠습니다."],
  ["깔끔해요","깔끔한 당신을 위해, 벗은 양말은 바로 빨래통에 넣겠습니다.","잔소리는 줄이고, 정리는 내가 먼저 하겠습니다."],
  ["정리는 서툴러요","어디 뒀는지 모르는 당신의 물건, 평생 내가 찾아 주겠습니다.","양말은 뒤집어 벗더라도, 마음만은 늘 바르게 두겠습니다."],
  ["길치예요","길을 잘 잃는 당신을 위해, 평생 당신의 내비게이션이 되겠습니다.","길은 자주 잃어도, 당신에게 돌아오는 길만은 잃지 않겠습니다."],
  ["게임을 좋아해요","게임하는 당신의 \"한 판만 더\"를, 웃으며 기다려 주겠습니다.","게임은 딱 한 판만 하고, 당신이 부르면 바로 달려가겠습니다."],
  ["운동을 좋아해요","운동을 좋아하는 당신을 따라, 함께 건강하게 나이 들겠습니다.","운동으로 다진 체력, 평생 우리 가족을 위해 쓰겠습니다."],
  ["술을 좋아해요","술 한잔이 좋은 당신에게, 평생 가장 편한 술친구가 되겠습니다.","술은 조금 줄이고, 집에는 조금 더 일찍 들어오겠습니다."],
  ["쇼핑을 좋아해요","현관 앞에 택배 상자가 쌓여도, 웃으며 같이 뜯겠습니다.","택배 상자는 조금 줄이고, 당신에게 주는 선물은 늘리겠습니다."],
  ["무뚝뚝해요","말보다 행동이 앞서는 당신의 마음을, 누구보다 먼저 알아채겠습니다.","무뚝뚝해도, \"지금 출발해\" 연락만은 꼭 하겠습니다."],
  ["애교가 많아요","애교 많은 당신에게, 서툴러도 나도 애교로 대답하겠습니다.","지금처럼 매일, 사랑한다는 말을 먼저 하겠습니다."],
  ["눈물이 많아요","눈물 많은 당신 곁에서, 늘 손수건이 되어 주겠습니다.","오늘은 울지도 모르지만, 앞으로는 웃는 날을 훨씬 많이 만들겠습니다."],
  ["걱정이 많아요","걱정 많은 당신에게, \"괜찮아, 같이 하자\"고 먼저 말하겠습니다.","걱정은 반으로 줄이고, 웃음은 두 배로 늘리겠습니다."],
  ["일이 바빠요","바쁜 하루에 지친 당신에게, 아무것도 묻지 않고 따뜻한 밥부터 차려 주겠습니다.","아무리 바빠도, 저녁 한 끼는 당신과 함께하겠습니다."],
  ["집을 좋아해요","집을 좋아하는 당신에게, 세상에서 가장 편한 집이 되어 주겠습니다.","주말엔 소파 위에서, 당신과 가장 편한 하루를 보내겠습니다."],
  ["여행을 좋아해요","여행을 좋아하는 당신과, 해마다 한 번은 새로운 곳에 가겠습니다.","다음 여행 계획은, 언제나 당신과 함께 세우겠습니다."],
  ["재밌어요","나를 늘 웃게 해 주는 당신에게, 세상에서 가장 재미있는 친구가 되겠습니다.","앞으로도 하루에 한 번은, 당신을 꼭 웃게 만들겠습니다."],
  ["꼼꼼해요","꼼꼼한 당신의 계획을, 끝까지 믿고 따르겠습니다.","우리 집 살림과 일정은, 앞으로도 내가 꼼꼼하게 챙기겠습니다."],
  ["깜빡깜빡해요","자주 깜빡하는 당신을 위해, 우산과 지갑은 내가 챙기겠습니다.","자주 깜빡하더라도, 우리 기념일만은 절대 잊지 않겠습니다."],
  ["추위를 많이 타요","추위 많이 타는 당신에게, 겨울마다 가장 따뜻한 손이 되겠습니다.","추위를 많이 타도, 이불은 독차지하지 않고 당신과 나눠 덮겠습니다."],
  ["알뜰해요","알뜰한 당신을 믿고, 여윳돈이 생기면 숨기지 않겠습니다.","알뜰하게 살림을 꾸려, 우리의 내일을 든든하게 만들겠습니다."],
  ["반려동물을 아껴요","당신이 아끼는 우리 집 막내까지, 내 가족처럼 아끼겠습니다.","우리 집 막내 산책은, 앞으로 둘이 같이 나가겠습니다."],
  ["커피를 좋아해요","커피를 좋아하는 당신을 위해, 아침 커피는 평생 내가 내리겠습니다.","아침마다 커피를 내릴 때, 당신 잔도 꼭 같이 내리겠습니다."]
];
const TIPS = [  // 10-1~5 (초안)
  "한 줄 읽고 한 박자 쉬어요. 긴장하면 빨라져서 하객이 잘 못 알아들어요.",
  "(함께) 줄은 서로 눈을 맞추고 같이 시작해요.",
  "웃음 약속 뒤에는 하객이 웃을 시간을 1~2초 주세요.",
  "서약서는 큰 글씨로 뽑아 오세요.",
  "마주 보고 읽으면 서약서 2장, 마이크 2개가 필요해요. 웨딩홀·사회자에게 미리 알려 주세요."
];

// ===== 상태 =====
// 이 휴대폰 브라우저 안에만 보관해요(탭을 닫아도 남음). 새로 만들기를 누르면 덮어써요.
// 다른 앱(카톡·챗GPT)에 다녀오는 사이 아이폰이 페이지를 새로 불러와도 이어서 할 수 있게.
const STORE = window.localStorage;
const KEY = "i-do.v1";
function fresh(){
  return { mode:"", tpl:0, groom:"", bride:"", date:"",
    year:"", season:"", meet:"", place:"", impB:"", impBText:"", impG:"", impGText:"",
    conf:"", love:"", promG:[], promB:[], traitB:[], traitG:[],
    open:0, close:0, flip:{}, off:{}, edit:{}, memo:"",
    sc:"home", step:0, resume:null, ret:false };   // sc: 지금 화면(home/names/q/result), resume: 이어서 만들기로 갈 화면
}
let S = fresh();
// 화면에서만 쓰는 상태 (보관 안 함): 누른 줄, AI 상자 열림, 새로 시작 확인 중인 버튼, 2개 넘게 고르려던 칩 묶음
let sel = null, aiOpen = false, armed = null, limitKey = null;
const WIPE = "만들던 서약서가 지워져요 · 한 번 더 누르면 새로 시작";
function save(){ try{ STORE.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{ const d = JSON.parse(STORE.getItem(KEY) || "null"); if(d && d.mode) return Object.assign(fresh(), d); }catch(e){}
  return null;
}

// ===== 문장 만들기 =====
function hasBatchim(word){
  const c = word.charCodeAt(word.length - 1);
  if(c < 0xAC00 || c > 0xD7A3) return null;
  return (c - 0xAC00) % 28 !== 0;
}
const JOSA = { "은":["은","는"], "는":["은","는"], "을":["을","를"], "를":["을","를"], "이":["이","가"], "가":["이","가"] };
function fill(text, who){
  return text
    .replace(/\{(신랑|신부)(은|는|을|를|이|가)?\}/g, (_, p, j)=>{
      const name = (p==="신랑" ? S.groom : S.bride).trim();
      if(!name) return "○○○" + (j ? JOSA[j][0] : "");   // 비우면 샘플처럼 ○○○은 / ○○○을
      if(!j) return name;
      const b = hasBatchim(name), pair = JOSA[j];
      return name + (b===null ? `${pair[0]}(${pair[1]})` : b ? pair[0] : pair[1]);
    })
    .replace(/\{역할이\}/g, who==="신부" ? "아내가" : "남편이");
}
function impText(k){
  const v = S[k], t = S[k+"Text"].trim();
  return v==="direct" ? t : v!=="" ? IMP[+v] : "";
}
// 줄 목록: {id, who, text, sec, cyc?}
function build(){
  const L = [];
  const add = (sec, id, who, text, extra={}) => L.push({ sec, id, who, text: fill(text, who), ...extra });
  if(S.mode==="basic"){
    BASIC[S.tpl].lines.forEach(([w,t],i)=>add("basic", `b${S.tpl}-${i}`, w, t));
  } else {
    add("open", "open", "함께", OPENS[S.open], { cyc:"open" });
    const when = S.year && S.season ? `${S.year}년 ${S.season}, ` : S.year ? `${S.year}년, ` : S.season ? `어느 ${S.season}, ` : "";
    const where = S.meet==="direct" ? (S.place.trim() ? S.place.trim()+"에서 " : "") : S.meet!=="" ? MEET[+S.meet][1]+" " : "";
    const ib = impText("impB"), ig = impText("impG");
    if(when || where || ib || ig){
      add("meet", "meet1", "신랑", ib ? `${when}${where}처음 만난 그날 — ${ib} 당신의 모습이 아직도 생생합니다.` : `${when}${where}처음 만난 그날을 아직도 기억합니다.`);
      add("meet", "meet2", "신부", ig ? `저도 기억합니다. ${ig} 그 사람이, 이렇게 평생의 짝이 될 줄은 몰랐습니다.` : "그날의 만남이 평생의 약속이 될 줄은, 그때는 몰랐습니다.");
    }
    if(S.conf==="g") add("conf", "conf", "신부", CONF_LINE);
    if(S.conf==="b") add("conf", "conf", "신랑", CONF_LINE);
    if(S.conf==="diff") CONF_DIFF.forEach(([w,t],i)=>add("conf", "conf"+i, w, t));
    add("love", "love", "함께", S.love!=="" ? LOVE[+S.love][1] : LOVE0);
    if(S.open===0) add("love", "bridge", "함께", BRIDGE);
    // 진지한 약속: 신랑·신부 번갈아, 같은 걸 고르고 {역할이}가 없으면 (함께) 한 줄
    const pg = S.promG.length || S.promB.length ? S.promG : ["0"];
    const pb = S.promG.length || S.promB.length ? S.promB : ["1"];
    const used = new Set();
    for(let i=0; i<Math.max(pg.length, pb.length); i++){
      [["신랑",pg[i]],["신부",pb[i]]].forEach(([w,v])=>{
        if(v===undefined) return;
        const t = PROM[+v][1];
        const both = pg.includes(v) && pb.includes(v) && !t.includes("{역할이}");
        if(both){ if(used.has(v)) return; used.add(v); add("prom", "p"+v, "함께", t); }
        else add("prom", `p${v}-${w}`, w, t);
      });
    }
    // 웃음 약속: 신부의 특징 → 신랑이 말함(A), 신랑의 특징 → 신부가 말함(A). ↻ 누르면 B(본인이 말함)
    for(let i=0; i<Math.max(S.traitB.length, S.traitG.length); i++){
      [["신부",S.traitB[i]],["신랑",S.traitG[i]]].forEach(([owner,v])=>{
        if(v===undefined) return;
        const id = `t${v}-${owner}`, partner = owner==="신부" ? "신랑" : "신부";
        const T = TRAITS[+v];
        // 둘이 같은 특징을 고르면 같은 문장이 두 번 나오지 않게, 신랑의 특징은 처음부터 B(본인이 말함)
        const same = owner==="신랑" && S.traitB.includes(v);
        if(same ? !S.flip[id] : S.flip[id]) add("trait", id, owner, T[2], { cyc:"flip" });
        else add("trait", id, partner, T[1], { cyc:"flip" });
      });
    }
    OATH.forEach(([w,t],i)=>add("oath", "oath"+i, w, t));
    add("close", "close", "함께", CLOSES[S.close], { cyc:"close" });
  }
  return L.filter(l=>!S.off[l.id])
    .map(l=> S.edit[l.id]!==undefined ? { ...l, text:S.edit[l.id] } : l)
    .filter(l=>l.text.trim() || l.id===sel);   // 글을 다 지운 줄은 빠짐 (고치는 중인 줄은 남김)
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
function plain(lines){
  let prev = "";
  const body = lines.map(l=>{ const lab = l.who===prev ? "        " : `(${l.who})  `; prev = l.who; return lab + l.text; }).join("\n");
  return `혼인서약서\n\n${body}\n\n${dateText()}\n신랑 ${S.groom.trim()||"○○○"} · 신부 ${S.bride.trim()||"○○○"}`;
}

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
  if(sc==="result" || sc==="home" || sc==="names") S.ret = false;   // ret: 결과에서 질문으로 왔음 → "서약서로 돌아가기"
  sel = null; aiOpen = false; armed = null; limitKey = null;
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
  sel = null; aiOpen = false; armed = null; limitKey = null;
  save(); render(); window.scrollTo(0,0);
});
// 같은 화면을 다시 그릴 때 (칩·줄 누르기): 스크롤 위치 유지
function redraw(){ const y = window.scrollY; render(); window.scrollTo(0, y); }

// ===== 화면 =====
function topBar(right){ return `<div class="top"><span>혼인서약서</span><span class="count">${right||""}</span></div>`; }

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const saved = S.mode && S.resume;
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">혼인서약서를 써야 하는 <span class="nw">신랑·신부님을 위한</span></p>
    <h1>혼인서약서,<br>고르기만 하면<br>써져요</h1>
    <div class="bar"></div>
    <p class="lead">처음 만난 날, 서로의 버릇 같은 걸 고르면 우리 이야기가 담긴 서약서가 나와요. 둘이 같이 골라도, 신부 혼자 골라도 돼요.</p>
    <div class="pick">
      ${saved ? `<button id="resume"><span>이어서 만들기</span><span class="q">만들던 서약서</span></button>` : ""}
      <button id="story"${armed==="story"?' class="armed"':""}><span>우리 이야기로 만들기</span><span class="q">${armed==="story" ? WIPE : "질문 6개"}</span></button>
      <button id="basic"${armed==="basic"?' class="armed"':""}><span>기본 서약서로 빠르게</span><span class="q">${armed==="basic" ? WIPE : "이름만 넣으면 끝"}</span></button>
    </div>
    <p class="note">※ 적은 내용은 이 휴대폰 브라우저 안에만 보관되고, 어디에도 올라가지 않아요.</p>
    ${foot()}`;
  // 만들던 서약서가 있으면 한 번 더 눌러야 새로 시작 (실수로 지우지 않게)
  const start = mode=>{
    if(saved && armed!==mode){ armed = mode; home(); return; }
    S = fresh(); S.mode = mode; nav("names", 0, "push");
  };
  document.getElementById("story").onclick = ()=>start("story");
  document.getElementById("basic").onclick = ()=>start("basic");
  const r = document.getElementById("resume");
  if(r) r.onclick = ()=>nav(S.resume.sc, S.resume.step, "jump");
}

function names(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  app.innerHTML = `
    ${topBar(S.mode==="basic" ? "기본 서약서" : "우리 이야기")}
    <h2 class="qt">두 분 이름을 알려 주세요</h2>
    <p class="qd">이름 맹세와 서명에 들어가요. 비워 두면 ○○○로 나와서 손으로 적을 수 있어요.</p>
    <div class="panel">
      <label class="field"><span>신랑 이름</span><input id="groom" value="${esc(S.groom)}" placeholder="예: 김민준" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>신부 이름</span><input id="bride" value="${esc(S.bride)}" placeholder="예: 이서연" autocomplete="off" enterkeyhint="next"></label>
      <label class="field"><span>예식 날짜 (선택)</span><input id="date" type="date" value="${esc(S.date)}"></label>
    </div>
    <div class="nav"><button class="text-btn" id="prev">이전</button><button class="btn main" id="next">다음</button></div>
    ${foot()}`;
  ["groom","bride","date"].forEach(k=>{ const el = document.getElementById(k); el.oninput = el.onchange = e=>{ S[k] = e.target.value; save(); }; });
  // 키보드의 "다음"(엔터): 신랑 → 신부 → 다음 화면
  document.getElementById("groom").onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); document.getElementById("bride").focus(); } };
  document.getElementById("bride").onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); e.target.blur(); } };
  document.getElementById("prev").onclick = goBack;
  document.getElementById("next").onclick = ()=> S.mode==="basic" ? nav("result", undefined, "push") : nav("q", 0, "push");
}

// 칩 묶음. k: 상태 이름, max: 여러 개 고르기(최대 개수), 없으면 하나만
function chips(k, list, max){
  const cur = S[k];
  return `<div class="chips">${list.map(([v, text])=>{
    const on = max ? cur.includes(v) : cur===v;
    return `<button class="chip${on?" on":""}" data-k="${k}" data-v="${esc(v)}" data-max="${max||0}" aria-pressed="${on}">${esc(text)}</button>`;
  }).join("")}</div>`;
}
// 여러 개 고르는 묶음 제목: 고른 수 / 최대, 다 차면 안내
function groupTitle(text, k, max){
  const full = S[k].length >= max;
  return `<p class="gt">${text} <small class="${full?"full":""}">${S[k].length} / ${max}</small></p>
    ${limitKey===k ? `<p class="warn">${max}개까지 골라요. 하나를 빼고 다시 눌러 주세요.</p>` : ""}`;
}
// 칩 바로 아래 미리보기: 고르면 그 자리에서 문장이 보여요
const PV = {};
function pv(id, filter, emptyTitle){
  PV[id] = { filter, emptyTitle };
  return `<div class="pv-inline" id="pv-${id}">${pvInner(id)}</div>`;
}
function pvInner(id){
  const { filter, emptyTitle } = PV[id];
  const lines = build().filter(filter);
  const title = emptyTitle && emptyTitle() ? emptyTitle() : "이렇게 들어가요";
  if(!lines.length) return `<p class="pv-empty">고르면 여기에 문장이 보여요.</p>`;
  return `<p class="pv-title">${title}</p>` + lines.map(l=>`<p><b>(${l.who})</b> ${esc(l.text)}</p>`).join("");
}
const idx = list=>list.map((t,i)=>[String(i), t]);
const noProm = ()=> !S.promG.length && !S.promB.length ? "안 고르면 이렇게 들어가요" : "";
const QS = [
  { title:"처음 만난 건 언제, 어디였나요?", desc:"생각나는 것만 골라도 돼요.", has:()=>S.year||S.season||S.meet, body:()=>{
      const years = []; for(let y=2026; y>=2000; y--) years.push(y);
      return `
      <p class="gt">만난 해</p>
      <select id="year" class="sel" aria-label="만난 해"><option value="">기억 안 나요</option>${years.map(y=>`<option${String(y)===S.year?" selected":""}>${y}</option>`).join("")}</select>
      <p class="gt">계절</p>${chips("season", ["봄","여름","가을","겨울"].map(s=>[s,s]))}
      <p class="gt">만난 곳</p>${chips("meet", [...idx(MEET.map(m=>m[0])), ["direct","직접 적기"]])}
      ${S.meet==="direct" ? `<input id="place" class="inp" value="${esc(S.place)}" placeholder="예: 강남역 스터디카페" autocomplete="off" enterkeyhint="done" aria-label="만난 곳">` : ""}
      ${pv("meet", l=>l.id==="meet1")}`; } },
  { title:"그날, 서로 어떤 모습이었나요?", desc:"신랑이 기억하는 신부, 신부가 기억하는 신랑을 하나씩 골라요.", has:()=>S.impB||S.impG, body:()=>`
      <p class="gt">그날의 신부</p>${chips("impB", [...idx(IMP), ["direct","직접 적기"]])}
      ${S.impB==="direct" ? `<input id="impBText" class="inp" value="${esc(S.impBText)}" placeholder="예: 커피를 쏟던" autocomplete="off" enterkeyhint="done" aria-label="그날의 신부 직접 적기"><p class="warn" id="impBWarn"></p>` : ""}
      ${pv("impB", l=>l.id==="meet1")}
      <p class="gt">그날의 신랑</p>${chips("impG", [...idx(IMP), ["direct","직접 적기"]])}
      ${S.impG==="direct" ? `<input id="impGText" class="inp" value="${esc(S.impGText)}" placeholder="예: 커피를 쏟던" autocomplete="off" enterkeyhint="done" aria-label="그날의 신랑 직접 적기"><p class="warn" id="impGWarn"></p>` : ""}
      ${pv("impG", l=>l.id==="meet2")}` },
  { title:"누가 먼저 좋아한다고 했나요?", desc:"", has:()=>S.conf, body:()=>`
      ${chips("conf", [["b","신랑이 먼저"],["g","신부가 먼저"],["diff","서로 다르게 기억해요"]])}
      ${pv("conf", l=>l.sec==="conf")}` },
  { title:"우리 연애를 한마디로 하면?", desc:"하나만 골라요.", has:()=>S.love, body:()=>`
      ${chips("love", idx(LOVE.map(l=>l[0])))}
      ${pv("love", l=>l.id==="love", ()=> S.love==="" ? "안 고르면 이렇게 들어가요" : "")}` },
  { title:"서로에게 어떤 약속을 할까요?", desc:"신랑이 할 약속, 신부가 할 약속을 1~2개씩 골라요. 같은 걸 골라도 돼요.", has:()=>S.promG.length||S.promB.length, body:()=>`
      ${groupTitle("신랑의 약속", "promG", 2)}${chips("promG", idx(PROM.map(p=>p[0])), 2)}
      ${pv("promG", l=>l.sec==="prom" && l.who!=="신부", noProm)}
      ${groupTitle("신부의 약속", "promB", 2)}${chips("promB", idx(PROM.map(p=>p[0])), 2)}
      ${pv("promB", l=>l.sec==="prom" && l.who!=="신랑", noProm)}` },
  { title:"서로 어떤 사람인가요?", desc:"고르면 웃음 포인트 약속이 들어가요. 신부를 고르면 신랑이, 신랑을 고르면 신부가 말해요.", has:()=>S.traitB.length||S.traitG.length, body:()=>`
      ${groupTitle("신부는 이런 사람이에요", "traitB", 2)}${chips("traitB", idx(TRAITS.map(t=>t[0])), 2)}
      ${pv("traitB", l=>l.sec==="trait" && l.id.endsWith("-신부"))}
      ${groupTitle("신랑은 이런 사람이에요", "traitG", 2)}${chips("traitG", idx(TRAITS.map(t=>t[0])), 2)}
      ${pv("traitG", l=>l.sec==="trait" && l.id.endsWith("-신랑"))}` }
];
const LAST = QS.length - 1;

// 아래에 붙는 막대: 이전 · 읽는 시간 · 다음(안 골랐으면 건너뛰기). 결과에서 왔으면 서약서로 돌아가기
function nextLabel(){ return S.step===LAST ? "서약서 보기" : QS[S.step].has() ? "다음" : "건너뛰기"; }
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
  const q = QS[S.step];
  Object.keys(PV).forEach(k=>delete PV[k]);
  app.innerHTML = `
    ${topBar(`질문 ${S.step+1} / ${QS.length}`)}
    <h2 class="qt">${esc(q.title)}</h2>
    ${q.desc ? `<p class="qd">${esc(q.desc)}</p>` : ""}
    <div class="panel">${q.body()}</div>
    <div class="qbar">
      <button class="text-btn" id="prev">이전</button>
      ${S.ret
        ? `<span class="nav-r">${S.step<LAST ? `<button class="text-btn" id="next">다음 질문</button>` : ""}<button class="btn main" id="toResult">서약서로 돌아가기</button></span>`
        : `<span class="qtime" id="qtime">${barTime()}</span><button class="btn main" id="next">${nextLabel()}</button>`}
    </div>
    ${foot()}`;
  app.querySelectorAll(".chip").forEach(c=>c.onclick = ()=>{
    const k = c.dataset.k, v = c.dataset.v, max = +c.dataset.max;
    limitKey = null;
    if(max){
      const arr = S[k], i = arr.indexOf(v);
      if(i>=0) arr.splice(i,1);
      else if(arr.length>=max) limitKey = k;   // 다 찼으면 바꾸지 않고 안내만
      else arr.push(v);
    } else S[k] = S[k]===v ? "" : v;
    save(); redraw();
    const inp = document.getElementById(k==="meet" ? "place" : k+"Text");
    if(inp && v==="direct" && S[k]==="direct") inp.focus();
  });
  const bind = (id, fn)=>{ const el = document.getElementById(id); if(el) el.oninput = el.onchange = e=>{ fn(e.target.value); save(); refreshPreview(); }; };
  bind("year", v=>S.year=v);
  bind("place", v=>S.place=v);
  ["impB","impG"].forEach(k=>bind(k+"Text", v=>{
    S[k+"Text"] = v;
    const w = document.getElementById(k+"Warn");
    if(w) w.textContent = v.trim() && !/던$/.test(v.trim()) ? "끝을 '~던'으로 적어 주세요 (예: 커피를 쏟던)" : "";
  }));
  ["place","impBText","impGText"].forEach(id=>{ const el = document.getElementById(id); if(el) el.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); el.blur(); } }; });
  ["impB","impG"].forEach(k=>{ const el = document.getElementById(k+"Text"); if(el) el.oninput({ target:el }); });
  const next = ()=> S.step < LAST ? nav("q", S.step+1, "push") : nav("result", undefined, "push");
  document.getElementById("prev").onclick = goBack;
  const n = document.getElementById("next"); if(n) n.onclick = next;
  const tr = document.getElementById("toResult"); if(tr) tr.onclick = ()=>nav("result", undefined, "push");
}

// ===== 결과 =====
function timeHtml(lines){
  const sec = seconds(lines);
  return `읽는 데 약 ${timeText(sec)} 걸려요${sec>LIMIT_SEC ? `<span class="over">2분이 넘어요. 약속 문장을 눌러 하나 빼 보세요.</span>` : ""}`;
}
let imgTimer = null;
function fileName(){ return `혼인서약서-${S.groom.trim()||"신랑"}-${S.bride.trim()||"신부"}`; }

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const lines = build();
  let prev = "";
  const rows = lines.map(l=>{
    const lab = l.who===prev ? "" : `(${l.who})`; prev = l.who;
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
    return `<div class="row${on?" on":""}" data-row="${l.id}" role="button" tabindex="0" aria-expanded="${on}"><span class="who">${lab}</span><span class="txt">${esc(l.text)}</span></div>${box}`;
  }).join("");
  const offCount = Object.keys(S.off).length;
  const flow = (SITES.flow.reel || SITES.flow.direct) ? siteLink("flow","btn ghost","식순표 만들기") : "";  // 식순표 릴스가 생기면 버튼이 나와요
  app.innerHTML = `
    ${topBar(S.mode==="basic" ? "기본 서약서" : "우리 이야기")}
    ${S.mode==="basic" ? `<div class="tabs" role="group" aria-label="기본 서약서 고르기">${BASIC.map((b,i)=>`<button class="chip${i===S.tpl?" on":""}" data-tpl="${i}" aria-pressed="${i===S.tpl}">${b.name}</button>`).join("")}</div>` : ""}
    <p class="edit-hint">문장을 누르면 바꾸거나, 고치거나, 뺄 수 있어요.</p>
    <article class="card vow" id="card">
      <div class="head"><span class="kind">MARRIAGE VOWS</span><span class="handle">@wed_voice.su</span></div>
      <h2>혼인서약서</h2>
      <div class="rows">${rows}</div>
      <p class="date">${dateText()}</p>
      <p class="names">신랑 ${esc(S.groom.trim()||"○○○")} · 신부 ${esc(S.bride.trim()||"○○○")}</p>
      ${sign()}
    </article>
    <p class="time" id="time">${timeHtml(lines)}</p>
    ${offCount ? `<button class="text-btn btn-link" id="restore">뺀 줄 ${offCount}개 되돌리기</button>` : ""}
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copyText">글로 복사하기<span class="sub">웨딩홀·플래너에게 보낼 때</span></button>
        <p class="msg" id="msg" role="status"></p>
      </div>
    </div>
    <div class="tip"><b>사회자 팁</b>${TIPS.map(t=>`<p>· ${esc(t)}</p>`).join("")}</div>
    <div class="btns more">
      <button class="btn ghost" id="aiBtn" aria-expanded="${aiOpen}">AI로 더 다듬기 ${aiOpen ? "▴" : "▾"}</button>
      ${!aiOpen ? "" : `
      <div class="panel ai-panel">
        <p class="gt">우리 이야기 메모</p>
        <p class="qd">기억나는 일을 편하게 적어요. AI에게 보낼 글에만 들어가고, 서약서에는 들어가지 않아요.</p>
        <textarea id="memo" class="inp" rows="4" placeholder="예: 첫 데이트 때 비가 와서 우산 하나를 같이 썼어요">${esc(S.memo)}</textarea>
        <button class="btn main" id="copyAi">AI에게 보낼 글 복사하기</button>
        <p class="msg" id="msgAi" role="status"></p>
        <p class="qd small">챗GPT 같은 AI 앱에 붙여 넣으면 다듬어 줘요.</p>
      </div>`}
      ${S.mode==="basic" ? `<button class="btn ghost" id="toStory">우리 이야기 넣기 · 질문 6개</button>` : `<button class="btn ghost" id="again">질문 다시 고르기</button>`}
      ${flow}
      <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
      <button class="text-btn btn-link" id="home">처음으로</button>
    </div>
    ${foot()}`;
  prepareImage(fileName());
  const $ = id=>document.getElementById(id);
  app.querySelectorAll("[data-tpl]").forEach(b=>b.onclick = ()=>{ S.tpl = +b.dataset.tpl; S.off = {}; S.edit = {}; sel = null; save(); redraw(); });
  app.querySelectorAll("[data-row]").forEach(r=>{
    const open = ()=>{ const id = r.dataset.row; if(sel===id) closeLine(); else { closeLine(true); sel = id; redraw(); } };
    r.onclick = open;
    r.onkeydown = e=>{ if(e.key==="Enter" || e.key===" "){ e.preventDefault(); open(); } };
  });
  if(sel){
    const ta = $("editTxt");
    ta.oninput = ()=>{
      S.edit[sel] = ta.value; save();
      const row = app.querySelector(`[data-row="${sel}"] .txt`); if(row) row.textContent = ta.value;
      $("time").innerHTML = timeHtml(build());
      clearTimeout(imgTimer); imgTimer = setTimeout(()=>prepareImage(fileName()), 600);
    };
    const cyc = $("cyc");
    if(cyc) cyc.onclick = ()=>{
      const c = cyc.dataset.cyc;
      delete S.edit[sel];
      if(c==="open") S.open = (S.open+1) % OPENS.length;
      if(c==="close") S.close = (S.close+1) % CLOSES.length;
      if(c==="flip") S.flip[sel] = !S.flip[sel];
      save(); redraw();
    };
    $("offLine").onclick = ()=>{ S.off[sel] = true; delete S.edit[sel]; sel = null; save(); redraw(); };
    $("doneLine").onclick = ()=>closeLine();
  }
  const rs = $("restore"); if(rs) rs.onclick = ()=>{ S.off = {}; save(); redraw(); };
  $("save").onclick = saveCard;
  $("copyText").onclick = ()=>copy(plain(build()), "서약서 글을 복사했어요.", "msg");
  $("aiBtn").onclick = ()=>{ aiOpen = !aiOpen; redraw(); };
  if(aiOpen){
    $("memo").oninput = e=>{ S.memo = e.target.value; save(); };
    $("copyAi").onclick = ()=>copy(aiPrompt(), "AI에게 보낼 글을 복사했어요. AI 앱에 붙여 넣어 보세요.", "msgAi");
  }
  const ts = $("toStory"); if(ts) ts.onclick = ()=>{ S.mode = "story"; S.off = {}; S.edit = {}; nav("q", 0, "push"); };
  const ag = $("again"); if(ag) ag.onclick = ()=>{ S.ret = true; nav("q", 0, "jump"); };
  const tq = $("toQ"); if(tq) tq.onclick = ()=>{ S.ret = true; nav("q", +tq.dataset.q, "jump"); };
  $("home").onclick = ()=>nav("home", undefined, "jump");
}
// 이 줄을 만든 질문 (결과에서 "질문에서 다시 고르기"로 바로 가요). 여는 말·맺음·이름 맹세·기본 서약서는 없음
function qOf(l){
  if(S.mode!=="story") return undefined;
  if(l.id==="meet2") return 1;
  if(l.id==="bridge") return undefined;
  return { meet:0, conf:2, love:3, prom:4, trait:5 }[l.sec];
}
// 누른 줄 닫기. 글을 다 지웠으면 그 줄은 빼요. keep=true면 다시 그리지 않음
function closeLine(keep){
  if(sel && S.edit[sel]!==undefined && !S.edit[sel].trim()){ delete S.edit[sel]; S.off[sel] = true; }
  if(!keep){ sel = null; save(); redraw(); }
}

function aiPrompt(){
  return `아래는 결혼식에서 신랑·신부가 번갈아 읽을 혼인서약서 초안이에요.
'우리 이야기 메모'를 참고해서, 더 우리 이야기 같게 다듬어 주세요.

지킬 것
- (신랑) (신부) (함께) 표시와 큰 순서는 그대로 두기
- 소리 내어 읽어서 2분 안 (공백 빼고 480자 안)
- 문장 끝은 "~하겠습니다"처럼 존댓말
- 메모에 없는 일은 지어내지 않기
- 하객이 한 번 듣고 바로 알아듣게, 어려운 말·줄임말 없이

[초안]
${plain(build())}

[우리 이야기 메모]
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
    <h1>혼인서약서,<br>고르기만 하면<br>써져요</h1>
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
