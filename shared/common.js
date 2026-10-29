// 모든 사이트가 같이 쓰는 기능: 사이트 목록, 로고·서명, 결과 발표, 카드 이미지 저장, 링크 복사
// 각 사이트의 index.html에서 이 파일을 그 사이트 js보다 먼저 불러와요.

// ===== 사이트 목록 ========================================
// 다른 사이트로 가는 버튼이 이 목록을 보고 주소를 정해요. 새 사이트를 만들면 한 줄 추가하세요.
//   path   : 폴더 이름 (다른 사이트 주소에서 짐작하지 못하게 지어요)
//   reel   : 있으면 버튼이 이 릴스로 가요 (댓글 받고 링크 보내기)
//   direct : true면 주소가 공개된 사이트예요. 결과 화면에 "테스트 링크 복사하기"가 보이고, reel이 없으면 버튼이 사이트로 바로 가요
//   둘 다 없으면 버튼이 인스타 프로필로 가요.
const SITES = {
  "groom": { path: "groom",        direct: true, reel: "https://www.instagram.com/reel/DezOuL0z6Iu/" },  // 신랑 입장곡 테스트 (주소 공개, 버튼은 릴스로)
  "bride": { path: "lovely-bride", reel: "https://www.instagram.com/reel/De5paX6zt2S/" },  // 신부 입장곡 테스트 (버튼은 릴스로)
  "march": { path: "hand-in-hand", reel: "https://www.instagram.com/reel/DfEE6LQT6O4/" },  // 행진곡 테스트 (버튼은 릴스로)
  "serenade": { path: "sing-for-you", reel: "" },   // 축가 테스트        TODO: 릴스 올리면 주소 넣기
  "thanks": { path: "with-gratitude", reel: "" },   // 감사 문자 & 땡큐 카드 (이번 주 신부님용 임시 주소)  TODO: 릴스 올리면 주소 넣기
  "cue": { path: "right-on-cue", reel: "" },        // 입장 타이밍 큐시트 (미공개: 행진곡·축가 공개 뒤에. 공개하면 right-on-cue/app.js의 OPEN을 true로)
  "parents": { path: "for-our-parents", reel: "" }, // 양가 부모님 입장·화촉점화 안내 (미공개. 공개하면 for-our-parents/app.js의 OPEN을 true로)  TODO: 릴스 올리면 주소 넣기
  "parentsQuiz": { path: "full-marks", reel: "" }, // 우리 부모님 본식 점수 퀴즈 (미공개. 공개하면 full-marks/app.js의 OPEN을 true로)  TODO: 릴스 올리면 주소 넣기
  "groomQuiz": { path: "well-suited", reel: "" }   // 우리 신랑 본식 점수 퀴즈 (미공개. 공개하면 well-suited/app.js의 OPEN을 true로)  TODO: 릴스 올리면 주소 넣기
};
// =========================================================

const INSTA = "https://www.instagram.com/wed_voice.su/";
// 사이트 맨 위 주소 (이 파일이 shared/ 안에 있어서 한 칸 위)
const ROOT = new URL("../", document.currentScript.src).href;
const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const app = document.getElementById("app");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function pad(n){return String(n).padStart(2,"0")}
function foot(){return '<div class="foot"><span>결혼식사회자 이상운</span><span>@wed_voice.su</span></div>'}
// 첫 화면 위쪽 금색 로고
function brandLogo(){return `<img class="brand" src="${ROOT}shared/img/logo-gold.png" alt="WED VOICE SU">`}
// 결과 카드 맨 아래 서명
function sign(){return `<div class="sign"><img class="badge" src="${ROOT}shared/img/logo-badge.png" alt="WED VOICE SU"><span class="who"><span class="motto">두 분은 즐기기만, 챙기는 건 저만</span><span>결혼식사회자 이상운</span></span></div>`}

// 다른 사이트로 가는 버튼 (SITES 참고)
function siteUrl(key){ return ROOT + SITES[key].path + "/"; }
function siteLink(key, cls, inner){
  const s = SITES[key];
  return (!s.reel && s.direct)
    ? `<a class="${cls}" href="${siteUrl(key)}">${inner}</a>`
    : `<a class="${cls}" href="${esc(s.reel||INSTA)}" target="_blank" rel="noopener">${inner}</a>`;
}

// 결과 직전에 큰 글씨로 한 번 외치기 (예: "신랑, 입장!"). 긴 문구는 \n으로 줄을 나누면 글씨가 조금 작아지고 조금 더 오래 보여요.
function reveal(text, done){
  if(reduce){ done(); return; }
  const long = text.replace(/\n/g,"").length > 8;
  const r=document.createElement("div");
  r.className="reveal"+(long?" long":"");
  r.innerHTML=`<div><p>${esc(text).replace(/\n/g,"<br>")}</p><div class="bar"></div></div>`;
  document.body.appendChild(r);
  setTimeout(()=>{ done(); r.remove(); }, long?1700:1300);
}

// ===== 결과 카드 이미지 만들기 (결과가 뜨면 미리 만들어 둬요) =====
// 화면에 id="card"(카드), id="save"(저장 버튼), id="msg"(안내 문구)가 있어야 해요.
let cardFile=null, cardJob=null;
function prepareImage(name){
  cardFile=null;
  if(typeof window.html2canvas!=="function"){ document.getElementById("save").hidden=true; return; }
  const job = cardJob = (document.fonts ? document.fonts.ready : Promise.resolve())
    .then(()=>window.html2canvas(document.getElementById("card"),{scale:3,backgroundColor:getComputedStyle(document.body).backgroundColor,logging:false}))
    .then(canvas=>new Promise(res=>canvas.toBlob(res,"image/png")))
    .then(blob=>{ if(job===cardJob) cardFile=new File([blob],name+".png",{type:"image/png"}); return cardFile; })
    .catch(()=>null);
}

async function saveCard(){
  const msg=document.getElementById("msg");
  const file = cardFile || await cardJob;
  if(!file){ msg.textContent="이미지를 만들지 못했어요. 화면을 캡처해 주세요."; return; }
  // 휴대폰: 공유 창(인스타 스토리, 사진 저장)으로 바로 보내기
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file]}); msg.textContent=""; return; }
    catch(e){ if(e && e.name==="AbortError"){ msg.textContent=""; return; } }
  }
  // 컴퓨터 등: 파일로 내려받기
  const url=URL.createObjectURL(file);
  const a=document.createElement("a"); a.href=url; a.download=file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  msg.textContent="저장했어요. 스토리에 올려보세요!";
}

// 지금 페이지 주소 복사 (id="msg"에 결과를 보여줘요)
async function copyLink(doneText="링크를 복사했어요."){
  const msg=document.getElementById("msg");
  const link=location.origin+location.pathname;
  try{ await navigator.clipboard.writeText(link); msg.textContent=doneText; }
  catch(e){ msg.textContent=link; }
}
