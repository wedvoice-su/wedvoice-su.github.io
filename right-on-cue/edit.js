// 음원 편집: 큐시트 1단계 "음원 편집하기"에서 들어와요. app.js 다음에 불러요.
// 자르는 도구가 아니라, 고민을 고르면 알아서 고쳐 주는 편집기예요.
//   intro : 전주가 너무 길어요        → 하이라이트를 찍고 "몇 초 전부터 틀지" 고르면 앞을 잘라요. 입장 시간도 같이 맞춰져요
//                                     하이라이트 전에는 음량을 줄였다가(기본 50%) 하이라이트에서 원래 음량으로 (사회자님 11/12)
//                                     하이라이트 앞에 가사 없는 반주 구간을 가져와 붙일 수도 있어요 (사회자님 11/12)
//   long  : 곡이 짧아요              → 뒤에 같은 곡이나 다른 곡을 이어 붙여요 (겹쳐서 넘어가요)
//   fade  : 끝이 뚝 끊겨요           → 끝을 서서히 줄여요
//   sil   : 틀어도 바로 소리가 안 나요 → 앞 무음을 지워요
// 음원은 이 휴대폰 안에서만 풀고 고쳐요. 어디에도 올라가지 않아요.
// 들을 때는 wav(바로 만들어져요), 저장할 때만 mp3로 바꿔요 (lamejs, 그때만 불러와요).

// ===== 설정 (숫자를 바꾸려면 여기만) =====
const ED_SR = 44100;              // 편집은 이 샘플레이트로 통일해요
const ED_MAXLEN = 15 * 60;        // 이보다 긴 파일은 편집하지 않아요 (휴대폰 메모리)
const ED_MAXOUT = 20 * 60;        // 이어 붙인 결과는 여기까지
const ED_CROSS = 4;               // 곡과 곡이 겹치는 길이(초)
const ED_LEADS = [0, 5, 10, 15, 20, 30];   // "하이라이트 몇 초 전부터" 빠른 선택
const ED_FADES = [3, 5, 8];       // "끝을 몇 초 동안 줄일지"
const ED_DUCKS = [100, 70, 50, 30];   // "하이라이트 전 음량" 빠른 선택 (%, 100 = 그대로)
const ED_DUCK = 50;               // 그 기본값. 하이라이트 전에는 사회자 멘트가 들리게 음량을 줄여요
const ED_SWELL = 0.5;             // 줄인 음량이 하이라이트 직전 몇 초 동안 원래대로 커지는지
const ED_QUIET = 131;             // 이보다 작은 소리는 무음으로 봐요 (약 −48dB)
const ED_SILMIN = 0.3;            // 앞 무음이 이보다 길 때만 알려요(초)
const ED_KBPS = 192;              // 저장하는 mp3 음질
const ED_LAME = "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js";
const ED_LAME_SRI = "sha512-xT0S/xXvkrfkRXGBPlzZPCAncnMK5c1N7slRkToUbv8Z901aUEuKO84tLy8dWU+3ew4InFEN7TebPaVMy2npZw==";

// ===== 상태 =====
//   S.ed (app.js) = { src, hl, lead, sil, more, fade }
//     src  : 처음 연 원본 파일
//     hl   : 하이라이트 자리(원본 기준 초). 안 정했으면 null
//     lead : 하이라이트 몇 초 전부터 틀지
//     duck : 하이라이트 전 음량(%). 100 = 그대로. lead가 0이면(바로 틀기) 쓰이지 않아요
//     pre  : 하이라이트 앞에 가져와 붙일 구간(반주)의 시작(원본 기준 초). null = 하이라이트 바로 앞부분을 그대로
//     sil  : 앞 무음을 지울지
//     more : 뒤에 붙인 곡들. { same:true } = 같은 곡 한 번 더, { file } = 다른 곡
//     fade : 끝을 몇 초 동안 줄일지 (0 = 안 줄여요)
let ED = null;       // 풀어 둔 소리 { src, main, extra(Map 파일→소리), url0(원본을 그대로 듣는 주소) }. 편집 화면을 나가면 비워요
let DR = null;       // 고민 화면에서 고치는 중인 값. "적용"을 누르면 S.ed가 돼요
let ED_MP3 = null;   // 편집본을 mp3로 바꿔 둔 것 { src(wav 파일), blob }
let edLameJob = null;

function edNew(file){ return { src:file, hl:null, lead:15, duck:ED_DUCK, pre:null, sil:false, more:[], fade:0 }; }
function edCopy(E){ return { src:E.src, hl:E.hl, lead:E.lead, duck:E.duck, pre:E.pre, sil:E.sil, more:E.more.slice(), fade:E.fade }; }
function edOn(E){ return !!E && (E.hl!=null || E.sil || E.more.length>0 || E.fade>0); }
function edFree(){ edPrevStop(); if(ED && ED.url0){ try{ URL.revokeObjectURL(ED.url0); }catch(e){} } ED=null; DR=null; }
function edTopOf(fn){ return stack[stack.length-1]===fn; }

// ===== 시간·글자 =====
// 0.1초까지 보여 주는 시간 (0:40.5). 딱 떨어지면 0:40
function edT(t){ const T=Math.max(0,Math.round(t*10)), m=Math.floor(T/600), r=T-m*600; return m+":"+pad(Math.floor(r/10))+(r%10?"."+(r%10):""); }
function edSec(x){ return String(Math.round(x*10)/10)+"초"; }
// 모자란 길이 ("40초", "1분 24초")
function edGap(sec){ const s=Math.max(1,Math.ceil(sec)); return s<60 ? s+"초" : Math.floor(s/60)+"분"+(s%60?" "+(s%60)+"초":""); }
function edParse(v){
  v=String(v).trim(); if(!v) return null;
  const m=v.match(/^(\d+)[:：](\d{1,2}(?:\.\d)?)$/); if(m) return +m[1]*60 + +m[2];
  if(/^\d+(\.\d)?$/.test(v)) return +v;
  return null;
}
// 받침에 따라 이/가를 붙여요 (신랑이 · 신부가)
function edIGa(w){ const c=w.charCodeAt(w.length-1); return w + (c>=0xAC00 && c<=0xD7A3 && (c-0xAC00)%28 ? "이" : "가"); }
function edShortName(n){ n=String(n).replace(/\.[^.]+$/,""); return n.length>16 ? n.slice(0,15)+"…" : n; }
// 인스타·카톡 같은 앱 안 브라우저 (만든 파일을 저장하지 못할 때가 많아요)
function edInApp(){
  const u=navigator.userAgent;
  if(/Instagram/i.test(u)) return "인스타그램";
  if(/KAKAOTALK/i.test(u)) return "카카오톡";
  if(/NAVER\(inapp/i.test(u)) return "네이버";
  if(/FBAN|FBAV/i.test(u)) return "페이스북";
  if(/ Line\//i.test(u)) return "라인";
  if(/; wv\)/.test(u)) return "앱";
  return "";
}
function edMobile(){ const u=navigator.userAgent; return /iPhone|iPad|iPod|Android/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints>1); }

// ===== 소리 풀기 =====
function edAB(b){ return b.arrayBuffer ? b.arrayBuffer() : new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsArrayBuffer(b); }); }
function edI16(f){ const n=f.length, o=new Int16Array(n); for(let i=0;i<n;i++){ const v=f[i]*32767; o[i] = v>32767 ? 32767 : v<-32768 ? -32768 : v; } return o; }
// 물결 그림용: from~to(샘플)를 N칸으로 나눠 칸마다 가장 큰 소리 (0~1). stride 2 = 왼쪽·오른쪽이 번갈아 든 배열
function edPeaks(a, stride, from, to, N){
  const out=new Float32Array(N), step=(to-from)/N, hop=Math.max(1,Math.floor(step/48));
  let top=0;
  for(let i=0;i<N;i++){
    let m=0; const e=Math.min(to, Math.floor(from+(i+1)*step));
    for(let j=Math.floor(from+i*step); j<e; j+=hop){ const v=a[j*stride], w=v<0?-v:v; if(w>m) m=w; }
    out[i]=m; if(m>top) top=m;
  }
  if(top>0) for(let i=0;i<N;i++) out[i]/=top;
  return out;
}
// 파일 → { L, R, len, s0(소리가 시작되는 샘플), s1(소리가 끝나는 샘플), s2(다음 곡으로 넘어갈 때의 끝), dur, peaks }
//   s2 : 서서히 작아지며 끝나는 곡은 꼬리가 거의 안 들려서, 거기서 다음 곡과 겹치면 소리가 꺼졌다 켜지는 것처럼 들려요.
//        그래서 곡 전체 크기의 1/10(−20dB)보다 작아지는 곳을 넘어갈 때의 끝으로 봐요. 뚝 끝나는 곡은 s1과 같아요
async function edDecode(file){
  const ab = await edAB(file);
  const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const buf = await new Promise((res,rej)=>{
    try{ const p=new OC(2,ED_SR,ED_SR).decodeAudioData(ab,res,rej); if(p && p.catch) p.catch(rej); }catch(e){ rej(e); }
  });
  const n=buf.length, L=edI16(buf.getChannelData(0)), R=buf.numberOfChannels>1 ? edI16(buf.getChannelData(1)) : L;
  const loud = i => L[i]>ED_QUIET || L[i]<-ED_QUIET || R[i]>ED_QUIET || R[i]<-ED_QUIET;
  let first=-1, last=-1;
  for(let i=0;i<n;i++) if(loud(i)){ first=i; break; }
  if(first>=0) for(let i=n-1;i>=first;i--) if(loud(i)){ last=i; break; }
  const s0 = first<0 ? 0 : Math.max(0, first-Math.round(.02*ED_SR));          // 소리 0.02초 앞에서 자르면 첫 소리가 안 잘려요
  const s1 = last<0 ? n : Math.min(n, last+Math.round(.1*ED_SR));
  let s2=s1;
  if(last>=0){
    let sum=0, cnt=0;
    for(let i=s0;i<s1;i+=16){ sum+=L[i]*L[i]; cnt++; }
    const thr=(cnt ? sum/cnt : 0)*.01, W=Math.round(.25*ED_SR);      // 크기의 1/10 = 제곱으로는 1/100
    for(let e=s1; e-W>s0; e-=W){
      let q=0, c=0;
      for(let i=e-W;i<e;i+=8){ q+=L[i]*L[i]; c++; }
      if(q/c>=thr){ s2=e; break; }
    }
    if(s2-s0<10*ED_SR) s2=s1;                                        // 너무 많이 잘리면 그대로 둬요
  }
  return { L, R, len:n, s0, s1, s2, dur:n/ED_SR, peaks:edPeaks(L,1,0,n,240), name:file.name };
}
// 파일 길이만 먼저 재요 (너무 긴 파일을 풀다가 멈추지 않게)
function edDur(file){
  return new Promise(res=>{
    const a=new Audio(), u=URL.createObjectURL(file);
    const done=d=>{ try{ URL.revokeObjectURL(u); }catch(e){} res(d); };
    a.preload="metadata";
    a.onloadedmetadata=()=>done(isFinite(a.duration) ? a.duration : null);
    a.onerror=()=>done(null);
    a.src=u;
  });
}
async function edLoad(){
  const E={ src:S.ed.src, main:null, extra:new Map(), url0:"" };
  E.main = await edDecode(S.ed.src);
  for(const m of S.ed.more) if(!m.same) E.extra.set(m.file, await edDecode(m.file));
  return E;
}

// ===== 편집 계획 =====
// 어느 소리의 어디부터 어디까지(a~b)를 결과의 어디(at)에 놓을지. 단위는 샘플
//   fi : 서서히 커지는 길이, fo : 서서히 작아지는 길이 (조각과 조각이 겹치는 부분)
// 조각 순서: (반주 구간을 가져오면 그 구간) → 원곡(하이라이트부터 또는 자른 곳부터) → 뒤에 붙인 곡들
function edPlan(E){
  const M=ED.main, hasHl=E.hl!=null, hlS = hasHl ? Math.round(E.hl*ED_SR) : 0, leadS = hasHl ? Math.round(E.lead*ED_SR) : 0;
  const paste = hasHl && E.pre!=null && E.lead>0;      // 하이라이트 앞에 다른 구간(반주)을 가져와 붙이는지
  const soft = a => a > M.s0 + Math.round(.05*ED_SR);  // 소리가 나는 중간에서 시작하는지 (그러면 서서히 커지게)
  const parts=[];
  let cut;
  if(paste){
    // 가져온 구간(lead초) 다음에 원곡의 하이라이트를 이어요. 하이라이트 직전 0.5초 동안 겹쳐서 넘어가요
    const X=Math.round(Math.min(ED_SWELL*ED_SR, leadS/2, hlS));
    const a=Math.max(0, Math.min(Math.max(M.s0, Math.round(E.pre*ED_SR)), M.len-leadS));
    parts.push({ p:M, a, b:a+leadS, soft:soft(a) });
    parts.push({ p:M, a:hlS-X, x:X });
    cut = hlS-leadS;                                    // 큐시트 계산용: 원본의 이 자리부터 튼 셈
  } else {
    cut = E.sil ? M.s0 : 0;
    if(hasHl) cut=Math.max(cut, hlS-leadS);
    cut=Math.max(0, Math.min(cut, M.len-ED_SR));
    parts.push({ p:M, a:cut, soft:soft(cut) });
  }
  E.more.forEach(m=>{ const p = m.same ? M : ED.extra.get(m.file); parts.push({ p, a:p.s0 }); });
  const last=parts.length-1, segs=[];
  parts.forEach((q,k)=>{
    const p=q.p, a=q.a;
    let b = q.b!=null ? q.b : k<last ? p.s2 : E.fade>0 ? p.s1 : p.len;   // 뒤에 곡이 오면 거의 안 들리는 꼬리까지, 끝을 줄일 때는 끝의 무음을 빼요
    if(b<=a) b=p.len;
    let fi=0, at=0;
    if(k===0){
      // 서서히 커지게 (하이라이트 전까지의 절반, 길어도 1.5초)
      if(q.soft){
        const room = hasHl ? (paste ? leadS : Math.max(0, hlS-a)) : 3*ED_SR;
        fi = Math.max(Math.round(.02*ED_SR), Math.round(Math.min(1.5*ED_SR, room*.5)));
      }
    } else {
      const pv=segs[k-1], X = q.x!=null ? q.x : Math.round(Math.min(ED_CROSS*ED_SR, (pv.b-pv.a)/4, (b-a)/4));
      pv.fo=X; fi=X; at=pv.at+(pv.b-pv.a)-X;
    }
    segs.push({ p, a, b, at, fi, fo:0 });
  });
  const end=segs[last], total=end.at+(end.b-end.a);
  const hlOut = !hasHl ? 0 : paste ? leadS : Math.max(0, hlS-cut);      // 결과에서 하이라이트가 나오는 자리
  // 하이라이트 전 음량: 줄였다가(duck%), 하이라이트 직전 0.5초 동안 원래대로 커져요
  const dk = hasHl && hlOut>0 && E.duck<100 ? { to:hlOut, lv:E.duck/100, up:Math.round(Math.min(ED_SWELL*ED_SR, hlOut/2)) } : null;
  return {
    segs, total, cut, dk,
    fade: E.fade>0 ? Math.round(Math.min(E.fade*ED_SR, total/2)) : 0,
    hl: hasHl ? hlOut/ED_SR : null,                          // 결과에서 하이라이트가 나오는 초
    duck: dk ? E.duck : 100,                                 // 하이라이트 전 음량(%). 줄이지 않았으면 100
    paste: paste ? { a:segs[0].a/ED_SR, b:segs[0].b/ED_SR } : null,   // 가져온 구간 (원본 기준 초)
    joints: segs.map((sg,k)=>k>0 && !(paste && k===1) ? sg.at/ED_SR : -1).filter(t=>t>=0),   // 결과에서 다음 곡이 나오기 시작하는 초
    dur: total/ED_SR
  };
}
// 계획대로 섞어요 → 왼쪽·오른쪽이 번갈아 든 16비트 소리
//   upto : 있으면 앞에서 그만큼(샘플)만 만들어요 (미리 듣기)
function edMix(P, upto){
  const n = upto ? Math.min(P.total, upto) : P.total, out=new Int16Array(n*2), H=Math.PI/2;
  for(const s of P.segs){
    const L=s.p.L, R=s.p.R, m=Math.min(s.b-s.a, n-s.at), fo0=(s.b-s.a)-s.fo;
    for(let i=0;i<m;i++){
      let g=1;
      if(i<s.fi) g=Math.sin(i/s.fi*H);
      if(i>=fo0) g*=Math.cos((i-fo0)/s.fo*H);
      const j=(s.at+i)*2, l=out[j]+L[s.a+i]*g, r=out[j+1]+R[s.a+i]*g;
      out[j]   = l>32767 ? 32767 : l<-32768 ? -32768 : l;
      out[j+1] = r>32767 ? 32767 : r<-32768 ? -32768 : r;
    }
  }
  // 하이라이트 전 음량 (직전에는 부드럽게 원래대로)
  if(P.dk){
    const d=P.dk, e=Math.min(d.to,n);
    for(let i=0;i<e;i++){
      const r=d.to-i; let g=d.lv;
      if(r<d.up){ const x=1-r/d.up; g=d.lv+(1-d.lv)*x*x*(3-2*x); }
      out[i*2]*=g; out[i*2+1]*=g;
    }
  }
  // 끝을 서서히 (처음엔 빨리, 끝으로 갈수록 천천히 줄어야 자연스러워요)
  if(!upto) for(let i=0, f=P.fade, st=n-f; i<f; i++){ const x=1-i/f, g=x*x, j=(st+i)*2; out[j]*=g; out[j+1]*=g; }
  return out;
}
function edInter(p){ const n=p.len, o=new Int16Array(n*2), L=p.L, R=p.R; for(let i=0;i<n;i++){ o[i*2]=L[i]; o[i*2+1]=R[i]; } return o; }
function edWav(pcm, name){
  const n=pcm.length*2, h=new DataView(new ArrayBuffer(44));
  const W=(o,s)=>{ for(let i=0;i<s.length;i++) h.setUint8(o+i,s.charCodeAt(i)); };
  W(0,"RIFF"); h.setUint32(4,36+n,true); W(8,"WAVE"); W(12,"fmt "); h.setUint32(16,16,true); h.setUint16(20,1,true); h.setUint16(22,2,true);
  h.setUint32(24,ED_SR,true); h.setUint32(28,ED_SR*4,true); h.setUint16(32,4,true); h.setUint16(34,16,true); W(36,"data"); h.setUint32(40,n,true);
  return new File([h,pcm], name, { type:"audio/wav" });
}
// 편집 내용을 한 줄씩 (큐시트·파일 열기 화면에 보여요)
function edSum(E, P){
  const L=[], cut=P.cut/ED_SR;
  if(E.hl!=null) L.push((P.paste ? `앞에 ${edT(P.paste.a)}~${edT(P.paste.b)} 구간 붙임 · ` : cut>.05 ? `앞 ${edT(cut)} 자름 · ` : "")
    + (P.hl<.5 ? "틀자마자 하이라이트" : `하이라이트 ${fmt(Math.round(P.hl))}`) + (P.duck<100 ? ` · 하이라이트 전 음량 ${P.duck}%` : ""));
  else if(E.sil && cut>.05) L.push(`앞 무음 ${edSec(cut)} 지움`);
  if(E.more.length) L.push("뒤에 " + E.more.map(m=>m.same ? "같은 곡 한 번 더" : `‘${edShortName(m.file.name)}’`).join(", ") + " 이어 붙임");
  if(E.fade>0) L.push(`끝 ${E.fade}초 서서히 줄임`);
  return L;
}
// 편집할 때 맞춘 하이라이트로 입장 시간을 넣어요 (0초면 "바로 틀어요" 방식)
function edCue(){
  if(!S.ed || S.ed.hl==null) return;
  const n=Math.round(S.ed.hl-S.t0);
  if(n<=0){ S.mode="now"; S.enter=null; }
  else { S.enter=n; if(S.mode==="now") S.mode=null; }
}
// 편집 내용을 적용해요: 결과 파일을 만들어 큐시트가 쓰는 파일로 바꾸고, 입장 시간도 따라 바꿔요
async function edCommit(E){
  const was=S.t0||0;
  for(const f of Array.from(ED.extra.keys())) if(!E.more.some(m=>m.file===f)) ED.extra.delete(f);
  S.ed=E; ED_MP3=null;
  let d;
  if(edOn(E)){
    const P=edPlan(E), out=edMix(P);
    S.edInfo={ peaks:edPeaks(out,2,0,P.total,240), dur:P.dur, cut:P.cut/ED_SR, hl:P.hl, paste:!!P.paste, joints:P.joints, fade:P.fade/ED_SR, sum:edSum(E,P) };
    d = await loadFile(edWav(out, songBase()+"_편집.wav"));
    S.t0=S.edInfo.cut;
  } else {
    S.edInfo=null;
    d = await loadFile(E.src);
    S.t0=0;
  }
  if(E.hl!=null) edCue();
  else if(S.enter!=null){ const n=Math.round(S.enter+was-S.t0); S.enter = n>=1 ? n : null; }   // 앞을 자른 만큼 찍어 둔 시간을 당겨요
  return d;
}

// ===== 물결 + 플레이어 =====
// o = { head(지금 자리), from·to(색칠할 구간, 초), marks(하이라이트 자리들 = 깃발), joints(곡이 넘어가는 자리들 = 점선), duck({from,to,lv} 음량을 줄인 구간 = 낮게), band([a,b] 따로 색칠할 구간) }
function edWave(cv, peaks, D, o){
  const dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth||300, h=cv.clientHeight||56;
  if(cv.width!==Math.round(w*dpr) || cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  if(!cv._c){ const css=getComputedStyle(cv); cv._c=[css.getPropertyValue("--accent").trim()||"#C2185B", css.getPropertyValue("--line").trim()||"#ccc", css.getPropertyValue("--ink").trim()||"#111"]; }
  const [on,off,ink]=cv._c, x=cv.getContext("2d"), n=peaks.length, bw=w/n, a=o.from||0, b=o.to==null ? D : o.to;
  x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,w,h);
  for(let i=0;i<n;i++){
    const t=(i+.5)/n*D, bh=Math.max(2,peaks[i]*(h-12)*(o.duck && t>=o.duck.from && t<o.duck.to ? o.duck.lv : 1));
    x.fillStyle = (t>=a && t<=b) || (o.band && t>=o.band[0] && t<o.band[1]) ? on : off;
    x.fillRect(i*bw+bw*.15,(h-bh)/2,bw*.7,bh);
  }
  x.fillStyle=ink;
  (o.marks||[]).forEach(t=>{
    const px=Math.max(0,Math.min(w-3,t/D*w-1.5));
    x.fillRect(px,0,3,h);
    x.beginPath(); x.moveTo(px+3,0); x.lineTo(px+12,5); x.lineTo(px+3,10); x.closePath(); x.fill();
  });
  (o.joints||[]).forEach(t=>{
    const px=Math.max(0,Math.min(w-2,t/D*w-1));
    for(let y=0;y<h;y+=7) x.fillRect(px,y,2,4);
  });
  if(o.head!=null){ x.globalAlpha=.5; x.fillRect(Math.max(0,Math.min(w-2,o.head/D*w-1)),0,2,h); x.globalAlpha=1; }
}
function edPlayerHtml(D){
  return `
    <div class="player">
      <div class="now"><span class="t" id="now">0:00</span><span class="d">/ ${fmt(D)}</span></div>
      <canvas class="wave" id="wave" aria-hidden="true"></canvas>
      <input type="range" id="seek" min="0" max="${D}" step="0.1" value="0" aria-label="재생 위치">
      <div class="ctl">
        <button id="b5">−5초</button>
        <button id="play" class="playbtn">재생</button>
        <button id="f5">+5초</button>
      </div>
    </div>`;
}
// wave(head) : 물결을 다시 그리는 함수. 물결을 누르거나 끌어도 자리가 옮겨져요
function edBindPlayer(D, wave){
  const now=document.getElementById("now"), seek=document.getElementById("seek"), play=document.getElementById("play"), cv=document.getElementById("wave");
  const paint = t => { now.textContent=fmt(t); seek.value=t; play.textContent=(audio.paused||audio.ended) ? "재생" : "멈춤"; wave(t); };
  const to = t => { audio.currentTime=Math.max(0,Math.min(D,t)); paint(audio.currentTime); };
  onTick = paint;
  play.onclick = ()=>{ if(audio.paused||audio.ended){ if(audio.ended) audio.currentTime=0; audio.play().catch(()=>{}); } else audio.pause(); paint(audio.currentTime); };
  document.getElementById("b5").onclick = ()=>to(audio.currentTime-5);
  document.getElementById("f5").onclick = ()=>to(audio.currentTime+5);
  seek.oninput = ()=>{ audio.currentTime=+seek.value; now.textContent=fmt(seek.value); wave(+seek.value); };
  const at = e => { const r=cv.getBoundingClientRect(); return (e.clientX-r.left)/r.width*D; };
  cv.onpointerdown = e => { try{ cv.setPointerCapture(e.pointerId); }catch(_){} to(at(e)); cv.onpointermove = ev => to(at(ev)); };
  cv.onpointerup = cv.onpointercancel = ()=>{ cv.onpointermove=null; };
  paint(audio.currentTime||0);
  return paint;
}
// 플레이어가 틀 파일을 바꿔요 (원본 ↔ 편집본)
function edUse(url){
  return new Promise(res=>{
    stopAudio();
    if(audio.src===url){ try{ audio.currentTime=0; }catch(e){} res(); return; }
    audio.onloadedmetadata = ()=>res();
    audio.onerror = ()=>res();
    audio.src=url;
  });
}
function edPlayFrom(t){ audio.currentTime=Math.max(0,t); audio.play().catch(()=>{}); }
// 미리 듣기: 지금 고른 대로(자른 곳 · 줄인 음량) 처음부터 하이라이트 5초 뒤까지 만들어서 들려줘요. 끝나거나 멈추면 done()
let edPrevA = null;
function edPrevStop(){
  const a=edPrevA; if(!a) return;
  edPrevA=null;
  try{ a.pause(); }catch(e){}
  try{ URL.revokeObjectURL(a.src); }catch(e){}
  if(a._done) a._done();
}
function edPrevPlay(E, done){
  edPrevStop();
  try{ audio.pause(); }catch(e){}
  const P=edPlan({ src:E.src, hl:E.hl, lead:E.lead, duck:E.duck, pre:E.pre, sil:E.sil, more:[], fade:0 });
  const a=new Audio(URL.createObjectURL(edWav(edMix(P, Math.round((P.hl+5)*ED_SR)), "미리듣기.wav")));
  a._done=done; edPrevA=a;
  a.onended = ()=>{ if(edPrevA===a) edPrevStop(); };
  a.play().catch(()=>{ if(edPrevA===a) edPrevStop(); });
}
audio.addEventListener("play", edPrevStop);    // 플레이어를 틀면 미리 듣기는 멈춰요

// ===== 화면 조각 =====
function edTop(){ return `<div class="top"><span>${esc(ORDERS[S.order].label)} 음원 편집</span><span class="count">편집</span></div>`; }
function edBusy(text){ const m=document.getElementById("msg"); if(m) m.textContent=text; }

// ===== 편집 첫 화면: 고민 고르기 =====
async function editStep(){
  stopAudio(); edPrevStop(); plain();
  if(!S.ed) S.ed=edNew(S.file);
  if(!ED || ED.src!==S.ed.src){
    app.innerHTML = `
      ${edTop()}
      <h2 class="title">음원을<br>읽는 중이에요</h2>
      <p class="lead2">몇 초 걸려요. ${SAFE}</p>
      ${nav()}
      ${foot()}`;
    bindNav();
    let E=null, why="";
    try{
      if(!edited() && S.dur!=null && S.dur>ED_MAXLEN) why="long";
      else E=await edLoad();
    }catch(e){ why="decode"; }
    if(!edTopOf(editStep)) return;     // 읽는 동안 다른 화면으로 갔어요
    if(!E){
      app.innerHTML = `
        ${edTop()}
        <h2 class="title">이 파일은<br>편집할 수 없어요</h2>
        <p class="lead2">${why==="long" ? "15분보다 긴 파일은 휴대폰에서 편집하기 어려워요." : "파일을 풀지 못했어요. mp3나 m4a 파일로 다시 해 보세요."} 편집하지 않고 타이밍만 정하는 건 그대로 할 수 있어요.</p>
        ${nav()}
        ${foot()}`;
      bindNav();
      return;
    }
    ED=E;
  }
  await edUse(S.url);
  if(!edTopOf(editStep)) return;
  edMain();
}
function edMain(){
  plain();
  const O=ORDERS[S.order], E=S.ed, M=ED.main, on=edited(), I=S.edInfo;
  const sil=M.s0/ED_SR, hasSil=sil>=ED_SILMIN, cutOver=on && E.hl!=null && (I.paste || I.cut>=sil);   // 앞을 자르면서 무음도 같이 없어진 경우
  const D = on ? I.dur : (isFinite(audio.duration) ? audio.duration : M.dur), peaks = on ? I.peaks : M.peaks;
  const short = S.dur!=null && S.dur<O.min;
  const rows = [
    { k:"intro", t:"전주가 너무 길어요", s:`하이라이트에 ${O.verb}하도록 앞을 잘라요`, on:E.hl!=null,
      done: on && E.hl!=null ? I.sum[0] : "" },
    { k:"long", t:"곡이 짧아요", s:"뒤에 곡을 이어 붙여요", on:E.more.length>0,
      chip: short ? `${O.minText}보다 ${edGap(O.min-S.dur)} 짧아요` : "",
      done: E.more.length ? `${E.more.length}곡 이어 붙임 · 모두 ${fmt(S.dur)}` : "" },
    { k:"fade", t:"끝이 뚝 끊겨요", s:"끝을 서서히 줄여요", on:E.fade>0, done: E.fade>0 ? `끝 ${E.fade}초 서서히 줄임` : "" },
    { k:"sil", t:"틀어도 바로 소리가 안 나요", on:E.sil && !cutOver,
      s: cutOver && hasSil ? "앞을 자르면서 무음도 같이 없어졌어요" : hasSil ? "앞의 소리 없는 부분을 지워요" : "확인해 보니 앞에 소리 없는 부분이 없어요",
      chip: hasSil && !E.sil && !cutOver ? `앞 ${edSec(sil)} 동안 소리가 없어요` : "",
      done: E.sil && !cutOver ? `앞 무음 ${edSec(sil)} 지움` : "", off: !hasSil || cutOver }
  ];
  const ia=edInApp();
  const jumps = !on ? [] : [
    ["0", "처음부터"],
    I.hl!=null && I.hl>=1 ? [String(Math.max(0,I.hl-5)), "하이라이트 5초 전"] : null,
    ...I.joints.map((t,i)=>[String(Math.max(0,t-3)), I.joints.length>1 ? `이어지는 곳 ${i+1}` : "이어지는 곳"]),
    I.fade>0 ? [String(Math.max(0,I.dur-I.fade-3)), "끝부분"] : null
  ].filter(Boolean);
  app.innerHTML = `
    ${edTop()}
    <h2 class="title">어떤 점이<br>고민인가요?</h2>
    <p class="lead2">고르면 알아서 고쳐 드려요. 원래 파일은 바뀌지 않아요.</p>
    ${ia ? `<p class="ednote warn">지금 ${esc(ia)} 안에서 열려 있어요. 여기서는 편집한 음원을 저장하지 못할 수 있어요. 사파리나 크롬에서 열어 주세요.</p>` : ""}
    <div class="answers edrows" role="group" aria-label="고민 고르기">
      ${rows.map(r=>`<button data-k="${r.k}" class="${r.on?"on":""}" ${r.off?"disabled":""}><span class="box">${CHECK}</span><span>${esc(r.t)}<small${r.done?' class="done"':""}>${esc(r.done||r.s)}</small>${r.chip?`<em class="edchip">${esc(r.chip)}</em>`:""}</span></button>`).join('<div class="div"></div>')}
    </div>
    <h3 class="edh">${on ? "편집한 음원 듣기" : "지금 음원 듣기"}</h3>
    ${edPlayerHtml(D)}
    ${jumps.length>1 ? `<div class="chips edjump">${jumps.map(j=>`<button data-t="${j[0]}">${esc(j[1])}</button>`).join("")}</div>` : ""}
    <p class="facts">길이 <b>${fmt(S.dur)}</b> · ${short ? `${O.minText}보다 ${edGap(O.min-S.dur)} 짧아요` : `${O.minText} 이상이에요`}${on && I.hl!=null && I.hl>=.5 ? `<br>하이라이트 <b>${fmt(Math.round(I.hl))}</b> · ${esc(O.verb)} 시간도 여기에 맞춰 뒀어요` : ""}</p>
    <div class="btns gap">
      <button class="btn main" id="next">이 음원으로 타이밍 정하기</button>
      ${on ? `<div class="edsave" id="edsave"></div>` : ""}
      <p class="msg" id="msg" role="status"></p>
      ${on ? `<button class="text-btn btn-link" id="reset">편집 전으로 되돌리기</button>` : ""}
    </div>
    ${on ? `<p class="qnote">타이밍까지 정하면 저장하는 파일 이름에 ${esc(O.verb)} 시간이 들어가요. (예: ${esc(O.label.replace(/\s/g,"")+"_15초 "+O.verb+" 편집본")}_곡 이름)</p>` : ""}
    ${nav()}
    ${foot()}`;
  bindNav();
  const marks = on && I.hl!=null && I.hl>=.5 ? [I.hl] : [], joints = on ? I.joints : [];
  edBindPlayer(D, t=>edWave(document.getElementById("wave"), peaks, D, { head:t, marks, joints }));
  app.querySelectorAll(".edrows button").forEach(b=>b.onclick=()=>{
    DR=edCopy(S.ed);
    go({ intro:edIntro, long:edLong, fade:edFade, sil:edSil }[b.dataset.k]);
  });
  app.querySelectorAll(".edjump button").forEach(b=>b.onclick=()=>edPlayFrom(+b.dataset.t));
  document.getElementById("next").onclick = ()=>{ stack.pop(); edFree(); go(qMode); };   // 풀어 둔 소리를 비우고 넘어가요. "이전"을 누르면 파일 열기 화면으로 돌아가요
  const rs=document.getElementById("reset");
  if(rs) rs.onclick = async ()=>{ edBusy("되돌리는 중…"); await edCommit(edNew(S.ed.src)); if(edTopOf(editStep)) edMain(); };
  edSaveBox(document.getElementById("edsave"), true);
}

// 고민 화면에서 "적용": 결과를 만들고 편집 첫 화면으로 돌아가요
async function edApply(fn){
  const b=document.getElementById("apply"); if(b) b.disabled=true;
  edPrevStop();
  edBusy("음원을 고치는 중…");
  await new Promise(r=>setTimeout(r,30));    // "고치는 중" 글자가 먼저 보이게
  const d=await edCommit(DR);
  if(!edTopOf(fn)) return;
  if(d==null){ edBusy("음원을 고치지 못했어요. 다시 해 주세요."); if(b) b.disabled=false; return; }
  back();
}

// ===== 고민 1. 전주가 너무 길어요 → 하이라이트에 맞춰 앞 자르기 =====
// 정하는 것: ① 하이라이트 자리 ② 몇 초 전부터 틀지 ③ 그 앞에 틀 부분 (바로 앞부분 그대로 / 가사 없는 반주 구간 가져오기) ④ 그때의 음량
async function edIntro(){
  stopAudio(); edPrevStop(); plain();
  const O=ORDERS[S.order], M=ED.main, D=DR, had=S.ed.hl!=null, PREV="이렇게 들려요 (미리 듣기)";
  const top0=Math.ceil(M.s0/ED_SR*10)/10;      // 곡 맨 앞 (앞 무음이 끝나는 곳)
  // 원본을 푼 소리 그대로 들려줘요 (찍는 자리와 자르는 자리가 정확히 같게)
  if(!ED.url0) ED.url0=URL.createObjectURL(edWav(edInter(M),"원본.wav"));
  app.innerHTML = `
    ${edTop()}
    <h2 class="title">하이라이트가 시작될 때<br>“여기!”를 눌러 주세요</h2>
    <p class="lead2">그 순간에 ${esc(O.verb)}하도록 앞부분을 잘라 드려요. 물결이 커지는 곳이 하이라이트일 때가 많아요.</p>
    <div class="stick">${edPlayerHtml(M.dur)}</div>
    <div class="marks">
      <div class="mark" id="hlBox"></div>
      <div class="mark" id="leadBox"></div>
      <div class="mark" id="preBox" hidden></div>
      <div class="mark" id="duckBox" hidden></div>
    </div>
    <div class="facts" id="facts"></div>
    <div class="btns gap">
      <button class="btn ghost" id="prev">${PREV}</button>
      <button class="btn main" id="apply">이렇게 자르기</button>
      ${had ? `<button class="btn ghost" id="undo">자르기 전으로 되돌리기</button>` : ""}
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  await edUse(ED.url0);
  if(!edTopOf(edIntro)) return;
  let P=null;
  const wave = t => {
    const o={ head:t, marks:D.hl!=null ? [D.hl] : [] };
    if(P && P.paste){ o.from=D.hl; o.band=[P.paste.a,P.paste.b]; o.joints=[P.paste.a]; }       // 가져온 구간 + 하이라이트부터
    else if(P){ o.from=P.cut/ED_SR; if(P.duck<100) o.duck={ from:P.cut/ED_SR, to:D.hl, lv:P.duck/100 }; }
    edWave(document.getElementById("wave"), M.peaks, M.dur, o);
  };
  const tick = edBindPlayer(M.dur, wave);
  const r10 = v => Math.round(v*10)/10;
  const paint = ()=>{
    const hl=D.hl;
    if(hl!=null && D.lead>hl) D.lead=Math.floor(hl);          // 하이라이트보다 앞에서 시작할 수는 없어요
    P = hl!=null ? edPlan(D) : null;
    edPrevStop();                                             // 값을 바꾸면 듣던 미리 듣기는 멈춰요
    document.getElementById("hlBox").innerHTML = `
      <div class="mk-head"><b>하이라이트</b><input class="mk-t" id="hlT" inputmode="decimal" placeholder="0:00" value="${hl!=null ? edT(hl) : ""}" aria-label="하이라이트 시간"></div>
      <p class="mk-hint">노래가 터지는 순간, ${esc(edIGa(O.who))} ${esc(O.verb)}했으면 하는 순간이에요.</p>
      <div class="mk-btns">
        <button class="stamp" id="stamp">여기!</button>
        <button class="adj" data-d="-0.5" ${hl==null||hl<=0?"disabled":""}>−0.5초</button>
        <button class="adj" data-d="0.5" ${hl==null?"disabled":""}>+0.5초</button>
        <button id="from" ${hl==null?"disabled":""}>여기부터 듣기</button>
      </div>`;
    document.getElementById("leadBox").innerHTML = `
      <div class="mk-head"><b>하이라이트 몇 초 전부터<br>틀까요?</b><span class="unit"><input class="mk-t" id="leadT" inputmode="numeric" value="${hl!=null ? D.lead : ""}" placeholder="0" ${hl==null?"disabled":""} aria-label="하이라이트 몇 초 전부터 틀지">초</span></div>
      <div class="chips" id="leads">${ED_LEADS.map(v=>`<button data-v="${v}" class="${hl!=null && D.lead===v?"on":""}" ${hl==null||v>hl?"disabled":""}>${v ? v+"초 전" : "바로"}</button>`).join("")}</div>
      <p class="mk-hint">${hl==null ? "하이라이트를 먼저 찍어 주세요."
        : D.lead===0 ? `“${esc(O.call)}” 하고 틀면 하이라이트가 바로 나와요.`
        : `음원을 틀고 ${D.lead}초 동안 전주가 흐른 뒤 하이라이트가 나와요. 그동안 사회자가 멘트를 할 수 있어요.`}</p>`;
    // 하이라이트 전에 틀 부분 · 그때의 음량 (바로 틀기면 전주가 없어서 안 보여요)
    const before = hl!=null && D.lead>0, pbox=document.getElementById("preBox"), dbox=document.getElementById("duckBox");
    pbox.hidden = dbox.hidden = !before;
    pbox.innerHTML = !before ? "" : `
      <div class="mk-head"><b>하이라이트 전에 틀 부분</b></div>
      <div class="chips" id="pres"><button data-v="0" class="${D.pre==null?"on":""}">바로 앞부분</button><button data-v="1" class="${D.pre!=null?"on":""}">반주 구간 가져오기</button></div>
      ${D.pre==null
        ? `<p class="mk-hint">하이라이트 바로 앞 ${D.lead}초를 그대로 틀어요. 거기에 가사가 나오면 ‘반주 구간 가져오기’로 가사 없는 부분을 대신 넣을 수 있어요.</p>`
        : `<div class="mk-head sub"><b>반주 시작</b><input class="mk-t" id="preT" inputmode="decimal" value="${edT(P.paste.a)}" aria-label="반주 시작 시간"></div>
           <p class="mk-hint">가사가 없는 부분(전주·간주)이 시작될 때 “여기!”를 눌러 주세요. 거기서부터 ${D.lead}초를 가져와 하이라이트 앞에 붙여요.</p>
           <div class="mk-btns">
             <button class="stamp" id="preStamp">여기!</button>
             <button id="preTop">곡 맨 앞</button>
             <button class="adj" data-d="-0.5">−0.5초</button>
             <button class="adj" data-d="0.5">+0.5초</button>
             <button id="preFrom">여기부터 듣기</button>
           </div>`}`;
    dbox.innerHTML = !before ? "" : `
      <div class="mk-head"><b>하이라이트 전 음량</b><span class="unit"><input class="mk-t" id="duckT" inputmode="numeric" value="${D.duck}" aria-label="하이라이트 전 음량">%</span></div>
      <div class="chips" id="ducks">${ED_DUCKS.map(v=>`<button data-v="${v}" class="${D.duck===v?"on":""}">${v===100 ? "그대로" : v+"%"}</button>`).join("")}</div>
      <p class="mk-hint">${D.duck<100
        ? `하이라이트 전 ${D.lead}초 동안은 음량을 ${D.duck}%로 줄였다가, 하이라이트에서 원래 음량으로 커져요. 사회자 멘트가 잘 들리고 하이라이트가 더 살아나요.`
        : "하이라이트 전에도 음량이 그대로예요."}</p>`;
    // 숫자로 보여 주는 것
    const f=[];
    if(P){
      const cut=P.cut/ED_SR, n=Math.round(P.hl);
      if(P.paste){
        f.push(`앞에 붙이는 구간 <b>${edT(P.paste.a)}~${edT(P.paste.b)}</b>`);
        f.push(`그 뒤로 하이라이트(원래 <b>${edT(hl)}</b>)부터 이어져요`);
      } else f.push(cut>.05 ? `앞에서 <b>${edT(cut)}</b>만큼 잘라요` : "앞을 자르지 않아요 (하이라이트가 이미 그 자리에 있어요)");
      f.push(n>0 ? `음원을 틀고 <b>${n}초</b> 뒤에 하이라이트 → ${esc(O.verb)} 시간 <b>${fmt(n)}</b>` : `틀자마자 하이라이트 → 0:00이 곧 ${esc(O.verb)}`);
      if(P.duck<100) f.push(`하이라이트 전 음량 <b>${P.duck}%</b> → 하이라이트부터 원래 음량`);
      f.push(`자른 뒤 길이 <b>${fmt(P.dur)}</b>` + (P.dur<O.min ? ` · ${O.minText}보다 짧아져요. ‘곡이 짧아요’에서 뒤를 이어 붙일 수 있어요.` : ""));
    }
    document.getElementById("facts").innerHTML = f.join("<br>");
    const ap=document.getElementById("apply");
    ap.disabled = hl==null;
    ap.textContent = P && P.paste ? "이렇게 만들기" : "이렇게 자르기";      // 반주 구간을 가져올 때는 자르기만이 아니라서
    document.getElementById("prev").disabled = hl==null;
    // 하이라이트
    const set = v => { D.hl = v==null ? null : Math.max(0, Math.min(M.dur-1, r10(v))); paint(); };
    const inp=document.getElementById("hlT");
    inp.onchange = ()=>{ const v=edParse(inp.value); if(v==null){ inp.value = hl!=null ? edT(hl) : ""; return; } set(v); };
    inp.onkeydown = ev=>{ if(ev.key==="Enter") inp.blur(); };
    document.getElementById("stamp").onclick = ()=>set(audio.currentTime);
    document.querySelectorAll("#hlBox .adj").forEach(b=>b.onclick=()=>set((D.hl||0)+ +b.dataset.d));
    document.getElementById("from").onclick = ()=>edPlayFrom(D.hl-3);
    // 몇 초 전부터
    const lead = v => { D.lead=Math.max(0, Math.min(Math.floor(D.hl), Math.round(v))); paint(); };
    document.querySelectorAll("#leads button").forEach(b=>b.onclick=()=>lead(+b.dataset.v));
    const li=document.getElementById("leadT");
    li.onchange = ()=>{ const v=parseInt(li.value,10); if(isNaN(v)){ li.value=D.lead; return; } lead(v); };
    li.onkeydown = ev=>{ if(ev.key==="Enter") li.blur(); };
    // 하이라이트 전에 틀 부분
    const pre = v => { D.pre = v==null ? null : Math.max(0, Math.min(M.dur-D.lead, r10(v))); paint(); };
    document.querySelectorAll("#pres button").forEach(b=>b.onclick=()=>pre(b.dataset.v==="1" ? (D.pre!=null ? D.pre : top0) : null));
    const pi=document.getElementById("preT");
    if(pi){
      pi.onchange = ()=>{ const v=edParse(pi.value); if(v==null){ pi.value=edT(D.pre); return; } pre(v); };
      pi.onkeydown = ev=>{ if(ev.key==="Enter") pi.blur(); };
      document.getElementById("preStamp").onclick = ()=>pre(audio.currentTime);
      document.getElementById("preTop").onclick = ()=>pre(top0);
      document.querySelectorAll("#preBox .adj").forEach(b=>b.onclick=()=>pre(D.pre+ +b.dataset.d));
      document.getElementById("preFrom").onclick = ()=>edPlayFrom(P.paste.a);
    }
    // 음량
    const duck = v => { D.duck=Math.max(10, Math.min(100, Math.round(v))); paint(); };
    document.querySelectorAll("#ducks button").forEach(b=>b.onclick=()=>duck(+b.dataset.v));
    const di=document.getElementById("duckT");
    if(di){
      di.onchange = ()=>{ const v=parseInt(di.value,10); if(isNaN(v)){ di.value=D.duck; return; } duck(v); };
      di.onkeydown = ev=>{ if(ev.key==="Enter") di.blur(); };
    }
    tick(audio.currentTime||0);
  };
  paint();
  // 미리 듣기: 누르면 지금 고른 대로 들려주고, 다시 누르면 멈춰요
  const pv=document.getElementById("prev");
  pv.onclick = ()=>{
    if(edPrevA){ edPrevStop(); return; }
    if(D.hl==null) return;
    edPrevPlay(D, ()=>{ if(pv.isConnected) pv.textContent=PREV; });
    pv.textContent="멈춤";
  };
  document.getElementById("apply").onclick = ()=>{ if(D.hl!=null) edApply(edIntro); };
  const un=document.getElementById("undo");
  if(un) un.onclick = ()=>{ D.hl=null; edApply(edIntro); };
}

// ===== 고민 2. 곡이 짧아요 → 뒤에 이어 붙이기 =====
function edLong(){
  stopAudio(); plain();
  const O=ORDERS[S.order], D=DR, again=S.order!=="march", had=S.ed.more.length>0;
  app.innerHTML = `
    ${edTop()}
    <h2 class="title">뒤에 곡을<br>이어 붙여요</h2>
    <p class="lead2">앞 곡이 끝나기 ${ED_CROSS}초 전부터 다음 곡이 겹쳐 나와서 자연스럽게 넘어가요.${again ? "" : " 행진곡을 한 번 더 트는 건 어색하니, 잔잔한 다른 곡을 붙여 주세요."}</p>
    <ol class="parts" id="parts"></ol>
    <div id="len"></div>
    <div class="btns gap">
      ${again ? `<button class="btn ghost" id="same">이 곡을 한 번 더 붙이기</button>` : ""}
      <label class="btn ghost"><input type="file" id="add" class="vh" accept="${ACCEPT}">다른 곡 붙이기 (파일 열기)</label>
      <button class="btn main" id="apply">이렇게 붙이기</button>
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  const paint = ()=>{
    const P=edPlan(D);
    // 첫 줄 = 원래 곡 (하이라이트 앞에 반주 구간을 가져왔으면 그 구간까지 합친 길이), 그다음 줄부터 붙인 곡
    const off = P.paste ? 1 : 0, ms=P.segs[off];
    const list = [{ name:songBase(), len:(ms.at+ms.b-ms.a)/ED_SR }].concat(D.more.map((m,i)=>{
      const sg=P.segs[off+1+i];
      return { name: m.same ? "같은 곡 한 번 더" : m.file.name.replace(/\.[^.]+$/,""), len:(sg.b-sg.a)/ED_SR, at:sg.at/ED_SR };
    }));
    document.getElementById("parts").innerHTML = list.map((r,i)=>
      `<li><span class="pn">${i+1}</span><span class="pt">${esc(r.name)}<small>${fmt(r.len)}${i ? ` · ${fmt(r.at)}에 넘어가요` : ""}</small></span>${i ? `<button class="px" data-i="${i-1}">빼기</button>` : ""}</li>`
    ).join("");
    document.getElementById("len").innerHTML = P.dur>=O.min
      ? `<div class="len ok"><b>모두 ${fmt(P.dur)} · ${O.minText} 이상이에요</b>${esc(O.why)}</div>`
      : `<div class="len warn"><b>모두 ${fmt(P.dur)} · ${O.minText}보다 ${edGap(O.min-P.dur)} 짧아요</b>${D.more.length ? "한 곡 더 붙여 주세요." : "아래에서 곡을 붙여 주세요."}</div>`;
    const ap=document.getElementById("apply");
    ap.disabled = !D.more.length && !had;
    ap.textContent = !D.more.length && had ? "붙인 곡 빼기" : "이렇게 붙이기";
    document.querySelectorAll("#parts .px").forEach(b=>b.onclick=()=>{ D.more.splice(+b.dataset.i,1); edBusy(""); paint(); });
  };
  // 붙였을 때 너무 길어지면 받지 않아요
  const tryAdd = item => {
    D.more.push(item);
    if(edPlan(D).dur>ED_MAXOUT){ D.more.pop(); edBusy("모두 20분까지만 붙일 수 있어요."); return; }
    edBusy(""); paint();
  };
  const same=document.getElementById("same");
  if(same) same.onclick = ()=>tryAdd({ same:true });
  document.getElementById("add").onchange = async e => {
    const f=e.target.files && e.target.files[0]; e.target.value=""; if(!f) return;
    edBusy("음원을 읽는 중…");
    let pcm=null;
    const d=await edDur(f);
    if((d!=null && d>ED_MAXLEN) || (d==null && f.size>60*1048576)){ if(edTopOf(edLong)) edBusy("15분보다 긴 파일은 붙일 수 없어요."); return; }
    try{ pcm=await edDecode(f); }catch(err){}
    if(!edTopOf(edLong) || !ED) return;
    if(!pcm){ edBusy("이 파일은 풀지 못했어요. mp3나 m4a 파일로 다시 해 보세요."); return; }
    ED.extra.set(f,pcm);
    tryAdd({ file:f });
  };
  paint();
  document.getElementById("apply").onclick = ()=>edApply(edLong);
}

// ===== 고민 3. 끝이 뚝 끊겨요 → 끝을 서서히 =====
function edFade(){
  stopAudio(); plain();
  const D=DR, had=S.ed.fade>0;
  if(!D.fade) D.fade=5;
  app.innerHTML = `
    ${edTop()}
    <h2 class="title">끝을 서서히<br>줄여요</h2>
    <p class="lead2">곡이 갑자기 끝나면 식장이 순간 조용해져요. 끝부분 소리를 서서히 줄여서 자연스럽게 끝나게 해요.</p>
    <div class="marks"><div class="mark" id="fadeBox"></div></div>
    <div class="btns gap">
      <button class="btn main" id="apply">이렇게 줄이기</button>
      ${had ? `<button class="btn ghost" id="undo">줄이기 전으로 되돌리기</button>` : ""}
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  const paint = ()=>{
    document.getElementById("fadeBox").innerHTML = `
      <div class="mk-head"><b>몇 초 동안 줄일까요?</b></div>
      <div class="chips" id="fades">${ED_FADES.map(v=>`<button data-v="${v}" class="${D.fade===v?"on":""}">${v}초</button>`).join("")}</div>
      <p class="mk-hint">마지막 ${D.fade}초 동안 소리가 서서히 작아져요.</p>
      <div class="mk-btns"><button id="tail">지금 끝부분 듣기</button></div>`;
    document.querySelectorAll("#fades button").forEach(b=>b.onclick=()=>{ D.fade=+b.dataset.v; paint(); });
    const tail=document.getElementById("tail");
    onTick = ()=>{ tail.textContent = (audio.paused||audio.ended) ? "지금 끝부분 듣기" : "멈춤"; };
    tail.onclick = ()=>{ if(audio.paused||audio.ended) edPlayFrom((S.dur||0)-8); else audio.pause(); };
  };
  paint();
  document.getElementById("apply").onclick = ()=>edApply(edFade);
  const un=document.getElementById("undo");
  if(un) un.onclick = ()=>{ D.fade=0; edApply(edFade); };
}

// ===== 고민 4. 틀어도 바로 소리가 안 나요 → 앞 무음 지우기 =====
function edSil(){
  stopAudio(); plain();
  const O=ORDERS[S.order], M=ED.main, D=DR, had=S.ed.sil, sil=M.s0/ED_SR;
  const Z=Math.min(M.dur, Math.max(8, Math.ceil(sil)+4));     // 물결에 보여 줄 앞부분 길이(초)
  app.innerHTML = `
    ${edTop()}
    <h2 class="title">앞의 소리 없는 부분을<br>지워요</h2>
    <p class="lead2">“${esc(O.call)}” 하고 틀어도 ${edSec(sil)} 동안 소리가 안 나요. 지우면 틀자마자 소리가 나요.</p>
    <div class="player"><canvas class="wave tall" id="wave" aria-hidden="true"></canvas><p class="mk-hint">곡의 앞 ${Math.round(Z)}초예요. 회색이 소리가 없는 부분이에요.</p></div>
    <div class="btns gap">
      ${had ? `<button class="btn main" id="undo">지우기 전으로 되돌리기</button>` : `<button class="btn main" id="apply">앞 ${edSec(sil)} 지우기</button>`}
      <p class="msg" id="msg" role="status"></p>
    </div>
    ${nav()}
    ${foot()}`;
  bindNav();
  edWave(document.getElementById("wave"), edPeaks(M.L,1,0,Math.round(Z*ED_SR),120), Z, { from:sil });
  const ap=document.getElementById("apply"), un=document.getElementById("undo");
  if(ap) ap.onclick = ()=>{ D.sil=true; edApply(edSil); };
  if(un) un.onclick = ()=>{ D.sil=false; edApply(edSil); };
}

// ===== 편집한 음원 저장 =====
function edLame(){
  return edLameJob || (edLameJob = new Promise((res,rej)=>{
    if(window.lamejs){ res(); return; }
    const s=document.createElement("script");
    s.src=ED_LAME; s.integrity=ED_LAME_SRI; s.crossOrigin="anonymous";
    s.onload = ()=>window.lamejs ? res() : rej(new Error("lamejs"));
    s.onerror = ()=>rej(new Error("lamejs"));
    document.head.appendChild(s);
  }).catch(e=>{ edLameJob=null; throw e; }));
}
// wav 파일 → mp3. 조금씩 나눠서 바꾸고, 사이사이 화면이 멈추지 않게 쉬어요. alive()가 false가 되면 그만둬요
async function edMp3(wav, onProg, alive){
  await edLame();
  const enc=new window.lamejs.Mp3Encoder(2, ED_SR, ED_KBPS), out=[], total=(wav.size-44)/4, STEP=1152*48;
  let rest=performance.now();
  for(let pos=0; pos<total; pos+=STEP){
    if(!alive()) return null;
    const n=Math.min(STEP,total-pos), iv=new Int16Array(await edAB(wav.slice(44+pos*4, 44+(pos+n)*4)));
    const L=new Int16Array(n), R=new Int16Array(n);
    for(let i=0;i<n;i++){ L[i]=iv[i*2]; R[i]=iv[i*2+1]; }
    const b=enc.encodeBuffer(L,R); if(b.length) out.push(b);
    onProg(Math.min(1,(pos+n)/total));
    if(performance.now()-rest>40){ await new Promise(r=>setTimeout(r)); rest=performance.now(); }
  }
  const e=enc.flush(); if(e.length) out.push(e);
  return new Blob(out, { type:"audio/mpeg" });
}
// 저장 상자: "편집한 음원 저장하기" → mp3로 바꾸는 중(막대) → 보내기·저장 버튼
// 돌려주는 run()을 부르면 바로 바꾸기 시작해요 (큐시트 화면은 뜨자마자 시작)
// sub = true : 저장 버튼을 한 단계 낮은 모양으로 (편집 화면. 거기서는 "타이밍 정하기"가 가장 큰 버튼)
function edSaveBox(el, sub){
  if(!el) return null;
  const top = sub ? "ghost" : "main";
  const show = (blob, ext, note) => {
    const name=outName(ext), file=new File([blob], name, { type:blob.type });
    if(el._url){ try{ URL.revokeObjectURL(el._url); }catch(e){} }
    const url=el._url=URL.createObjectURL(file);
    let share=false; try{ share = edMobile() && !!navigator.canShare && navigator.canShare({ files:[file] }); }catch(e){}
    const stuck = !share && !!edInApp();     // 앱 안이고 공유 창도 없으면 저장할 길이 없어요
    el.innerHTML = `
      <p class="edfile"><b>${esc(name)}</b><span>${(blob.size/1048576).toFixed(1)}MB</span></p>
      ${note ? `<p class="ednote">${esc(note)}</p>` : ""}
      ${share ? `<button class="btn ${top}" id="edsh">편집한 음원 보내기 · 저장하기</button>` : ""}
      ${stuck ? `<p class="ednote warn">${esc(edInApp())} 안에서는 음원을 저장할 수 없어요. 사파리나 크롬에서 열어 주세요.</p>`
              : `<a class="btn ${share?"ghost":top}" id="eddl" href="${url}" download="${esc(name)}">${share ? "파일로 받기" : "편집한 음원 저장하기"}</a>`}
      <p class="msg" id="edmsg" role="status"></p>`;
    const sh=el.querySelector("#edsh"), msg=el.querySelector("#edmsg");
    if(sh) sh.onclick = async ()=>{
      try{ await navigator.share({ files:[file] }); msg.textContent=""; }
      catch(e){ if(!e || e.name!=="AbortError") msg.textContent="공유 창을 열지 못했어요. ‘파일로 받기’를 눌러 주세요."; }
    };
    const dl=el.querySelector("#eddl");
    if(dl) dl.onclick = ()=>{ msg.textContent="저장했어요. 큐시트와 같이 보내 주세요."; };
  };
  const run = async ()=>{
    const wav=S.file, my=el._job={};
    if(ED_MP3 && ED_MP3.src===wav){ show(ED_MP3.blob,"mp3"); return; }
    el.innerHTML = `<div class="edprog"><div></div></div><p class="msg" id="edmsg" role="status">mp3로 바꾸는 중… 0%</p>`;
    const bar=el.querySelector(".edprog div"), msg=el.querySelector("#edmsg");
    const alive = ()=>el.isConnected && el._job===my && S.file===wav;
    try{
      const blob=await edMp3(wav, p=>{ bar.style.width=(p*100).toFixed(1)+"%"; msg.textContent=`mp3로 바꾸는 중… ${Math.round(p*100)}%`; }, alive);
      if(!blob || !alive()) return;
      ED_MP3={ src:wav, blob };
      show(blob,"mp3");
    }catch(e){
      if(alive()) show(wav,"wav","mp3로 바꾸지 못해서 wav 파일로 드려요. 용량이 커요.");
    }
  };
  if(ED_MP3 && ED_MP3.src===S.file) show(ED_MP3.blob,"mp3");
  else {
    el.innerHTML = `<button class="btn ghost" id="edmk">편집한 음원 저장하기</button>`;
    el.querySelector("#edmk").onclick = run;
  }
  return run;
}
