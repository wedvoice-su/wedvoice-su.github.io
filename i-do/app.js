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
function fresh(){
  return { mode:"", tpl:0, groom:"", bride:"", date:"",
    year:"", season:"", meet:"", place:"", impB:"", impBText:"", impG:"", impGText:"",
    conf:"", love:"", promG:[], promB:[], traitB:[], traitG:[],
    open:0, close:0, flip:{}, off:{}, edit:{}, editing:false, memo:"" };
}
let S = fresh();
let step = 0;

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
        if(S.flip[id]) add("trait", id, owner, T[2], { cyc:"flip" });
        else add("trait", id, partner, T[1], { cyc:"flip" });
      });
    }
    OATH.forEach(([w,t],i)=>add("oath", "oath"+i, w, t));
    add("close", "close", "함께", CLOSES[S.close], { cyc:"close" });
  }
  return L.filter(l=>!S.off[l.id]).map(l=> S.edit[l.id]!==undefined ? { ...l, text:S.edit[l.id] } : l);
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

// ===== 화면 =====
function top(right){ return `<div class="top"><span>혼인서약서</span><span class="count">${right||""}</span></div>`; }

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    ${brandLogo()}
    <p class="for">혼인서약서를 써야 하는 신랑·신부님을 위한</p>
    <h1>혼인서약서,<br>고르기만 하면<br>써져요</h1>
    <div class="bar"></div>
    <p class="lead">처음 만난 날, 서로의 버릇 같은 걸 고르면 우리 이야기가 담긴 서약서가 나와요. 둘이 같이 골라도, 신부 혼자 골라도 돼요.</p>
    <div class="pick">
      <button id="story"><span>우리 이야기로 만들기</span><span class="q">질문 6개</span></button>
      <button id="basic"><span>기본 서약서로 빠르게</span><span class="q">이름만 넣으면 끝</span></button>
    </div>
    <p class="note">※ 적은 내용은 이 휴대폰 브라우저 안에만 있고, 어디에도 올라가지 않아요.</p>
    ${foot()}`;
  document.getElementById("story").onclick = ()=>{ S = fresh(); S.mode = "story"; names(); };
  document.getElementById("basic").onclick = ()=>{ S = fresh(); S.mode = "basic"; names(); };
}

function names(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  app.innerHTML = `
    ${top()}
    <h2 class="qt">두 분 이름을 알려 주세요</h2>
    <p class="qd">이름 맹세와 서명에 들어가요. 비워 두면 ○○○로 나와서 손으로 적을 수 있어요.</p>
    <div class="panel">
      <label class="field"><span>신랑 이름</span><input id="groom" value="${esc(S.groom)}" placeholder="예: 김민준" autocomplete="off"></label>
      <label class="field"><span>신부 이름</span><input id="bride" value="${esc(S.bride)}" placeholder="예: 이서연" autocomplete="off"></label>
      <label class="field"><span>예식 날짜 (선택)</span><input id="date" type="date" value="${esc(S.date)}"></label>
    </div>
    <div class="nav"><button class="text-btn" id="prev">이전</button><button class="btn main" id="next">다음</button></div>
    ${foot()}`;
  ["groom","bride","date"].forEach(k=>document.getElementById(k).oninput = e=>{ S[k] = e.target.value; });
  document.getElementById("prev").onclick = home;
  document.getElementById("next").onclick = ()=>{ if(S.mode==="basic") result(); else { step = 0; ask(); } };
  window.scrollTo(0,0);
}

// 칩 묶음. k: 상태 이름, max: 여러 개 고르기(최대 개수), 없으면 하나만
function chips(k, list, max){
  const cur = S[k];
  return `<div class="chips">${list.map((label,i)=>{
    const v = typeof label==="object" ? label[0] : String(i);
    const text = typeof label==="object" ? label[1] : label;
    const on = max ? cur.includes(v) : cur===v;
    return `<button class="chip${on?" on":""}" data-k="${k}" data-v="${esc(v)}" data-max="${max||0}">${esc(text)}</button>`;
  }).join("")}</div>`;
}
const QS = [
  { title:"처음 만난 건 언제, 어디였나요?", desc:"생각나는 것만 골라도 돼요.", sec:["meet"], body:()=>{
      const years = []; for(let y=2026; y>=2000; y--) years.push(y);
      return `
      <p class="gt">만난 해</p>
      <select id="year" class="sel"><option value="">기억 안 나요</option>${years.map(y=>`<option${String(y)===S.year?" selected":""}>${y}</option>`).join("")}</select>
      <p class="gt">계절</p>${chips("season", ["봄","여름","가을","겨울"].map(s=>[s,s]))}
      <p class="gt">만난 곳</p>${chips("meet", [...MEET.map((m,i)=>[String(i),m[0]]), ["direct","직접 적기"]])}
      ${S.meet==="direct" ? `<input id="place" class="inp" value="${esc(S.place)}" placeholder="예: 강남역 스터디카페" autocomplete="off">` : ""}`; } },
  { title:"그날, 서로 어떤 모습이었나요?", desc:"신랑이 기억하는 신부, 신부가 기억하는 신랑을 하나씩 골라요.", sec:["meet"], body:()=>`
      <p class="gt">그날의 신부</p>${chips("impB", [...IMP.map((t,i)=>[String(i),t]), ["direct","직접 적기"]])}
      ${S.impB==="direct" ? `<input id="impBText" class="inp" value="${esc(S.impBText)}" placeholder="예: 커피를 쏟던" autocomplete="off"><p class="warn" id="impBWarn"></p>` : ""}
      <p class="gt">그날의 신랑</p>${chips("impG", [...IMP.map((t,i)=>[String(i),t]), ["direct","직접 적기"]])}
      ${S.impG==="direct" ? `<input id="impGText" class="inp" value="${esc(S.impGText)}" placeholder="예: 커피를 쏟던" autocomplete="off"><p class="warn" id="impGWarn"></p>` : ""}` },
  { title:"누가 먼저 좋아한다고 했나요?", desc:"", sec:["conf"], body:()=>chips("conf", [["b","신랑이 먼저"],["g","신부가 먼저"],["diff","서로 다르게 기억해요"]]) },
  { title:"우리 연애를 한마디로 하면?", desc:"하나만 골라요.", sec:["love"], body:()=>chips("love", LOVE.map((l,i)=>[String(i),l[0]])) },
  { title:"서로에게 어떤 약속을 할까요?", desc:"신랑이 할 약속, 신부가 할 약속을 1~2개씩 골라요. 같은 걸 골라도 돼요.", sec:["prom"], body:()=>`
      <p class="gt">신랑의 약속</p>${chips("promG", PROM.map((p,i)=>[String(i),p[0]]), 2)}
      <p class="gt">신부의 약속</p>${chips("promB", PROM.map((p,i)=>[String(i),p[0]]), 2)}` },
  { title:"서로 어떤 사람인가요?", desc:"고르면 웃음 포인트 약속이 들어가요. 신부를 고르면 신랑이, 신랑을 고르면 신부가 말해요.", sec:["trait"], body:()=>`
      <p class="gt">신부는 이런 사람이에요 <small>2개까지</small></p>${chips("traitB", TRAITS.map((t,i)=>[String(i),t[0]]), 2)}
      <p class="gt">신랑은 이런 사람이에요 <small>2개까지</small></p>${chips("traitG", TRAITS.map((t,i)=>[String(i),t[0]]), 2)}` }
];

function previewHtml(){
  const sec = QS[step].sec;
  const lines = build().filter(l=>sec.includes(l.sec));
  if(!lines.length) return `<p class="pv-empty">고르면 여기에 문장이 보여요.</p>`;
  return lines.map(l=>`<p><b>(${l.who})</b> ${esc(l.text)}</p>`).join("");
}
function refreshPreview(){ const p = document.getElementById("pv"); if(p) p.innerHTML = previewHtml(); }

function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const q = QS[step];
  app.innerHTML = `
    ${top(`질문 ${step+1} / ${QS.length}`)}
    <h2 class="qt">${esc(q.title)}</h2>
    ${q.desc ? `<p class="qd">${esc(q.desc)}</p>` : ""}
    <div class="panel">${q.body()}</div>
    <div class="pv-box"><p class="pv-title">이렇게 들어가요</p><div id="pv">${previewHtml()}</div></div>
    <div class="nav">
      <button class="text-btn" id="prev">이전</button>
      <span class="nav-r"><button class="text-btn" id="skip">건너뛰기</button><button class="btn main" id="next">다음</button></span>
    </div>
    ${foot()}`;
  app.querySelectorAll(".chip").forEach(c=>c.onclick = ()=>{
    const k = c.dataset.k, v = c.dataset.v, max = +c.dataset.max;
    if(max){
      const arr = S[k], i = arr.indexOf(v);
      if(i>=0) arr.splice(i,1); else { if(arr.length>=max) arr.shift(); arr.push(v); }
    } else S[k] = S[k]===v ? "" : v;
    const y = window.scrollY; ask(); window.scrollTo(0,y);
    const inp = document.querySelector(`#${k==="meet"?"place":k+"Text"}`);
    if(inp && v==="direct" && S[k]==="direct") inp.focus();
  });
  const bind = (id, fn)=>{ const el = document.getElementById(id); if(el) el.oninput = e=>{ fn(e.target.value); refreshPreview(); }; };
  bind("year", v=>S.year=v);
  bind("place", v=>S.place=v);
  ["impB","impG"].forEach(k=>bind(k+"Text", v=>{
    S[k+"Text"] = v;
    const w = document.getElementById(k+"Warn");
    if(w) w.textContent = v.trim() && !/던$/.test(v.trim()) ? "끝을 '~던'으로 적어 주세요 (예: 커피를 쏟던)" : "";
  }));
  const go = d=>{ step += d; if(step<0){ names(); return; } if(step>=QS.length){ result(); return; } ask(); window.scrollTo(0,0); };
  document.getElementById("prev").onclick = ()=>go(-1);
  document.getElementById("next").onclick = ()=>go(1);
  document.getElementById("skip").onclick = ()=>{
    ({0:()=>{S.year="";S.season="";S.meet="";S.place="";}, 1:()=>{S.impB="";S.impG="";}, 2:()=>{S.conf="";}, 3:()=>{S.love="";},
      4:()=>{S.promG=[];S.promB=[];}, 5:()=>{S.traitB=[];S.traitG=[];}})[step]();
    go(1);
  };
}

function result(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const lines = build();
  const sec = seconds(lines);
  let prev = "";
  const rows = lines.map(l=>{
    const lab = l.who===prev ? "" : `(${l.who})`; prev = l.who;
    const tools = S.editing ? "" : `<span class="tools" data-html2canvas-ignore>${l.cyc ? `<button class="tool" data-cyc="${l.cyc}" data-id="${l.id}" aria-label="다른 문장">↻</button>` : ""}<button class="tool" data-off="${l.id}" aria-label="빼기">✕</button></span>`;
    return `<div class="row"><span class="who">${lab}</span><span class="txt"${S.editing?` contenteditable="true" data-id="${l.id}"`:""}>${esc(l.text)}</span>${tools}</div>`;
  }).join("");
  const offCount = Object.keys(S.off).length;
  app.innerHTML = `
    ${top(S.mode==="basic" ? "기본 서약서" : "우리 이야기")}
    ${S.mode==="basic" ? `<div class="tabs">${BASIC.map((b,i)=>`<button class="chip${i===S.tpl?" on":""}" data-tpl="${i}">${b.name}</button>`).join("")}</div>` : ""}
    <article class="card vow" id="card">
      <div class="head"><span class="kind">MARRIAGE VOWS</span><span class="handle">@wed_voice.su</span></div>
      <h2>혼인서약서</h2>
      <div class="rows">${rows}</div>
      <p class="date">${dateText()}</p>
      <p class="names">신랑 ${esc(S.groom.trim()||"○○○")} · 신부 ${esc(S.bride.trim()||"○○○")}</p>
      ${sign()}
    </article>
    <p class="time${sec>LIMIT_SEC?" over":""}">읽는 데 약 ${timeText(sec)} 걸려요${sec>LIMIT_SEC?" · 2분이 넘어요. 약속을 하나 빼 보세요.":""}</p>
    <div class="row-btns">
      <button class="btn ghost" id="edit">${S.editing ? "고치기 끝" : "직접 고치기"}</button>
      ${offCount ? `<button class="text-btn" id="restore">뺀 줄 ${offCount}개 되돌리기</button>` : ""}
    </div>
    <div class="tip"><b>사회자 팁</b>${TIPS.map(t=>`<p>· ${esc(t)}</p>`).join("")}</div>
    <div class="after">
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <button class="btn ghost" id="copyText">글로 복사하기 · 웨딩홀·플래너에게 보낼 때</button>
        <p class="msg" id="msg" role="status"></p>
        ${S.mode==="basic" ? `<button class="btn ghost" id="toStory">우리 이야기 넣기 · 질문 6개</button>` : `<button class="btn ghost" id="back">질문 다시 고르기</button>`}
        <details class="ai">
          <summary class="btn ghost">AI로 더 다듬기</summary>
          <p class="gt">우리 이야기 메모</p>
          <p class="qd">기억나는 일을 편하게 적어요. AI에게 보낼 글에만 들어가고, 서약서에는 들어가지 않아요.</p>
          <textarea id="memo" class="inp" rows="4" placeholder="예: 첫 데이트 때 비가 와서 우산 하나를 같이 썼어요">${esc(S.memo)}</textarea>
          <button class="btn main" id="copyAi">AI에게 보낼 글 복사하기</button>
          <p class="qd">챗GPT 같은 AI 앱에 붙여 넣으면 다듬어 줘요.</p>
        </details>
        ${siteLink("flow","btn ghost","식순표 만들기")}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        <button class="text-btn btn-link" id="home">처음으로</button>
      </div>
    </div>`;
  if(!S.editing) prepareImage(`혼인서약서-${S.groom.trim()||"신랑"}-${S.bride.trim()||"신부"}`);
  const rerender = ()=>{ const y = window.scrollY; result(); window.scrollTo(0,y); };
  app.querySelectorAll("[data-tpl]").forEach(b=>b.onclick = ()=>{ S.tpl = +b.dataset.tpl; S.off = {}; S.edit = {}; rerender(); });
  app.querySelectorAll("[data-cyc]").forEach(b=>b.onclick = ()=>{
    const c = b.dataset.cyc, id = b.dataset.id;
    delete S.edit[id];
    if(c==="open"){ S.open = (S.open+1) % OPENS.length; delete S.edit.open; }
    if(c==="close"){ S.close = (S.close+1) % CLOSES.length; }
    if(c==="flip"){ S.flip[id] = !S.flip[id]; }
    rerender();
  });
  app.querySelectorAll("[data-off]").forEach(b=>b.onclick = ()=>{ S.off[b.dataset.off] = true; rerender(); });
  app.querySelectorAll(".txt[contenteditable]").forEach(el=>el.oninput = ()=>{ S.edit[el.dataset.id] = el.textContent; });
  document.getElementById("edit").onclick = ()=>{ S.editing = !S.editing; rerender(); };
  const rs = document.getElementById("restore"); if(rs) rs.onclick = ()=>{ S.off = {}; rerender(); };
  document.getElementById("save").onclick = saveCard;
  if(S.editing) document.getElementById("save").disabled = true;
  document.getElementById("copyText").onclick = ()=>copy(plain(build()), "서약서 글을 복사했어요.");
  document.getElementById("memo").oninput = e=>{ S.memo = e.target.value; };
  document.getElementById("copyAi").onclick = ()=>copy(aiPrompt(), "AI에게 보낼 글을 복사했어요.");
  const ts = document.getElementById("toStory"); if(ts) ts.onclick = ()=>{ S.mode = "story"; S.off = {}; S.edit = {}; step = 0; ask(); window.scrollTo(0,0); };
  const bk = document.getElementById("back"); if(bk) bk.onclick = ()=>{ step = 0; ask(); window.scrollTo(0,0); };
  document.getElementById("home").onclick = home;
  if(!S.editing) window.scrollTo(0, window.scrollY);
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
async function copy(text, done){
  const msg = document.getElementById("msg");
  try{ await navigator.clipboard.writeText(text); msg.textContent = done; }
  catch(e){ msg.textContent = "복사하지 못했어요. 길게 눌러 직접 복사해 주세요."; }
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

const preview = new URLSearchParams(location.search).has("preview");
if(!OPEN && !preview) soon(); else home();
