// 식전영상 템플릿: 장면마다 어떻게 그릴지. 그리기 도구는 engine.js의 Movie.kit
// 고른 근거: docs/식전영상/조사-디자인.md (2026-11-04) — 많이 쓰이는 순서로 러브 스토리 · 시네마 · 미니멀 · 무빙포스터
//
// 템플릿 하나 = {
//   key, name, desc, photos: [추천 최소, 최대]장,
//   bg 바탕색, edge 처음·끝 페이드 색, xf 장면이 겹치는 초, trans 'fade'(겹쳐 넘기기)·'dip'(색으로 사라졌다 나타나기)·'slide',
//   loop: true면 처음·끝에 검은 화면 없이 반복 재생용, fill: true면 곡이 끝날 때까지 사진을 다시 돌림,
//   time { open, parents, thanks, close: 장면 초, min·max: 사진 한 장 초 },
//   openPhoto·thanksPhoto·closePhoto: 그 장면에 사진을 깔지 (closePhoto 'first'는 1번 사진),
//   fonts: 미리 받을 글꼴, open·photo·parents·thanks·close(ctx, M, s, u): 그리기
// }
// 그리기 함수에서 M.W·M.H 화면 크기, M.d 글 데이터, s 장면(s.caption 이야기 문구, s.ch 몇 번째 이야기, s.intro 신랑·신부 소개, s.text 인사 문장),
// u 장면 안에서 지난 초(겹쳐 들어올 땐 음수).
// 글자는 화면 가장자리에서 떨어진 안쪽(가로·세로 6% 안)에만 둬요 — 식장 스크린은 가장자리가 잘릴 수 있어요.

// ===== 날짜·이름 표기 =====
const DAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const two = n => String(n).padStart(2, "0");
function dparts(d){
  if (!d.date) return null;
  const [y, m, dd] = d.date.split("-").map(Number);
  return { y, m, d: dd, w: new Date(y, m - 1, dd).getDay() };
}
function dateDot(d){ const p = dparts(d); return p ? `${p.y}. ${two(p.m)}. ${two(p.d)}` : ""; }        // 2026. 11. 21 (실제 영상에서 쓰는 표기)
function dateKo(d){ const p = dparts(d); return p ? `${p.y}년 ${p.m}월 ${p.d}일 ${DAYS_KO[p.w]}요일` : ""; }
function dateEn(d){ const p = dparts(d); return p ? `${p.y}.${two(p.m)}.${two(p.d)} ${DAYS_EN[p.w]}` : ""; }
const nameKo = (d, join = " · ") => `${d.groom || "신랑"}${join}${d.bride || "신부"}`;
const nameEn = (d, join = "  .  ") => d.groomEn && d.brideEn ? `${d.groomEn}${join}${d.brideEn}` : "";
const latin = s => !!s && /^[\x20-\x7E…’‘“”]+$/.test(s.replace(/\n/g, " "));   // 영어로만 쓴 문장

const TEMPLATES = [];

(() => {
  const K = Movie.kit;
  const F = {
    sans: '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    serif: '"Gowun Batang","AppleMyungjo","Nanum Myeongjo",serif',
    en: '"Cormorant Garamond","Times New Roman",serif',
    caps: '"Cinzel","Cormorant Garamond",serif'
  };
  const mm = M => Math.min(M.W, M.H);
  const tall = M => M.H > M.W;
  const fadeOut = (u, s, lead = 1.1) => 1 - K.rise(u, s.dur - lead, .8);   // 장면 끝나기 전에 글자 먼저 사라지기
  const ph = (M, s) => s.i != null ? M.bank.get(s.i) : null;

  // 큰 제목: 영어 문장이면 영문 글꼴, 한국어면 명조
  function title(ctx, M, str, x, y, a, o = {}){
    const m = mm(M), en = latin(str);
    K.block(ctx, str, x, y, { family: en ? (o.enFamily || F.en) : F.serif, weight: en ? (o.enWeight || 500) : 700,
      size: m * (en ? (o.enSize || .1) : (o.size || .074)), color: o.color || "#fff", alpha: a, maxW: M.W * .86, lh: 1.3,
      spacing: en && o.caps ? m * .012 : 0, shadow: o.shadow, rise: m * .02, reveal: o.reveal });
  }
  // 이름 줄: 영문 이름을 넣었으면 영문, 아니면 한글
  function names(ctx, M, x, y, a, o = {}){
    const m = mm(M), en = nameEn(M.d);
    K.text(ctx, en || nameKo(M.d), x, y, { family: en ? (o.enFamily || F.caps) : F.sans, weight: en ? 500 : (o.weight || 500),
      size: m * (o.size || .036), color: o.color || "rgba(255,255,255,.9)", spacing: m * (en ? .012 : .006), alpha: a, align: o.align });
  }
  // 사진 위 이야기 자막: 아래쪽을 어둡게 깔고 큰 글씨 (밝은 사진 위 흰 글자가 안 보이는 문제)
  function caption(ctx, M, s, u, o = {}){
    const m = mm(M), a = K.rise(u, .5, .9) * fadeOut(u, s);
    if (a <= 0) return;
    K.scrim(ctx, M, tall(M) ? .55 : .5, .66 * a);
    const opt = { family: F.serif, weight: 400, size: m * .05, color: "#fff", maxW: M.W * .84, lh: 1.45,
      rise: m * .014, shadow: "rgba(0,0,0,.45)", alpha: a, reveal: i => K.rise(u, .5 + i * .35, .9) };
    const half = K.wrap(ctx, s.caption, opt.maxW, opt).length * opt.size * opt.lh / 2;
    const y = Math.min(M.H * (tall(M) ? .8 : .82), (o.bottom != null ? o.bottom : M.H) - m * .06 - half);   // 줄이 많아도 아래 칸 안에
    if (o.chapter && s.ch) K.text(ctx, `CHAPTER ${["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][s.ch - 1] || s.ch}`, M.W / 2, y - half - m * .035, { family: F.caps, weight: 500, size: m * .028, spacing: m * .012, color: o.chapter, alpha: a });
    K.block(ctx, s.caption, M.W / 2, y, opt);
  }
  // 신랑·신부 소개: 왼쪽 아래 이름표 + 해시태그
  function intro(ctx, M, s, u, o = {}){
    const m = mm(M), it = s.intro, a = fadeOut(u, s), x = M.W * .08;
    if (a <= 0) return;
    K.scrim(ctx, M, .45, .7 * a);
    const y = o.y != null ? o.y : M.H * (tall(M) ? .78 : .74);
    K.text(ctx, it.en ? (it.who === "신랑" ? "GROOM" : "BRIDE") : it.who, x, y, { family: it.en ? F.caps : F.sans, weight: 500, size: m * .03, spacing: m * .012, color: o.accent || "#F2C9D2", align: "left", alpha: a * K.rise(u, .3, .7) });
    if (it.name) K.text(ctx, it.name, x, y + m * .085, { family: F.serif, weight: 700, size: m * .085, color: "#fff", align: "left", alpha: a * K.rise(u, .6, .8), shadow: "rgba(0,0,0,.35)" });
    if (it.tags) K.text(ctx, it.tags, x, y + m * (it.name ? .17 : .085), { family: F.sans, weight: 500, size: m * .038, color: "rgba(255,255,255,.92)", align: "left", alpha: a * K.rise(u, 1.1, .8) });
  }
  // 인사 장면: 흐린 사진 위에 문장이 한 줄씩
  function message(ctx, M, s, u, o = {}){
    const m = mm(M), p = ph(M, s);
    if (p) { K.cover(ctx, p.bg, 0, 0, M.W, M.H, 1.1); K.veil(ctx, M.W, M.H, o.dim || "#000", .5); }
    K.block(ctx, s.text, M.W / 2, M.H / 2, { family: F.serif, weight: 400, size: m * .056, color: o.color || "#fff", maxW: M.W * .8, lh: 1.65,
      rise: m * .012, alpha: fadeOut(u, s, .9), reveal: i => K.rise(u, .5 + i * .5, 1) });
  }

  // ===== 1. 러브 스토리: 곡 하나에 연애부터 웨딩까지 (가장 흔한 형식) =====
  TEMPLATES.push({
    key: "story", name: "러브 스토리", desc: "곡 하나에 연애부터 웨딩까지 이어지는 이야기", photos: [30, 50],
    box: M => [0, 0, M.W, M.H], autoFit: true,
    bg: "#000", xf: 1.2, trans: "fade",
    time: { open: 7, parents: 7, thanks: 7, close: 8, min: 3.5, max: 6 },
    openPhoto: true, thanksPhoto: true, closePhoto: true,
    fonts: [`700 40px ${F.serif}`, `400 40px ${F.serif}`, `500 40px ${F.en}`, `500 40px ${F.caps}`, `500 40px ${F.sans}`],
    open(ctx, M, s, u){
      const p = ph(M, s), m = mm(M);
      if (p) { K.photo(ctx, M, p, s, u, { zoom: .05 }); K.veil(ctx, M.W, M.H, "#000", .5); }
      const a = K.rise(u, .5, 1.3), b = K.rise(u, 1.6, 1.2), y = M.H * .45;
      title(ctx, M, M.d.open[0], M.W / 2, y, a, { shadow: "rgba(0,0,0,.35)" });
      ctx.save(); ctx.globalAlpha *= b; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(M.W / 2 - m * .04, y + m * .1, m * .08, Math.max(2, m * .003)); ctx.restore();
      names(ctx, M, M.W / 2, y + m * .17, b);
      K.text(ctx, dateDot(M.d), M.W / 2, y + m * .23, { family: F.en, weight: 500, size: m * .034, color: "rgba(255,255,255,.8)", spacing: m * .006, alpha: b });
    },
    photo(ctx, M, s, u){
      const p = ph(M, s);
      if (p) K.photo(ctx, M, p, s, u);
      if (s.intro) intro(ctx, M, s, u); else if (s.caption) caption(ctx, M, s, u);
    },
    parents(ctx, M, s, u){ message(ctx, M, s, u); },
    thanks(ctx, M, s, u){ message(ctx, M, s, u); },
    close(ctx, M, s, u){
      const p = ph(M, s), m = mm(M);
      if (p) { K.photo(ctx, M, p, s, u, { zoom: .05 }); K.veil(ctx, M.W, M.H, "#000", .52); }
      const a = K.rise(u, .5, 1.2), b = K.rise(u, 1.8, 1.2);
      title(ctx, M, M.d.close, M.W / 2, M.H * .46, a, { size: .066, enSize: .085, shadow: "rgba(0,0,0,.35)" });
      names(ctx, M, M.W / 2, M.H * .46 + m * .16, b);
      K.text(ctx, dateDot(M.d), M.W / 2, M.H * .46 + m * .22, { family: F.en, weight: 500, size: m * .032, color: "rgba(255,255,255,.78)", spacing: m * .006, alpha: b });
    }
  });

  // ===== 2. 시네마: 영화 예고편처럼 (위아래 검은 띠, 카운트다운, 챕터 자막) =====
  const area = M => {   // 영화 화면 비율 2.39:1 (세로 영상은 4:5)
    const h = tall(M) ? Math.min(M.H, M.W * 1.25) : Math.min(M.H, M.W / 2.39);
    return [0, (M.H - h) / 2, M.W, h];
  };
  TEMPLATES.push({
    key: "cinema", name: "시네마", desc: "영화 예고편처럼. 위아래 검은 띠와 챕터 자막", photos: [25, 45], thumbAt: 5.6,
    box: M => area(M), autoFit: true,
    bg: "#000", xf: .9, trans: "dip", dip: "#000",
    time: { open: 9, parents: 7, thanks: 7, close: 9, min: 3.5, max: 5.5 },
    openPhoto: false, thanksPhoto: true, closePhoto: true,
    fonts: [`500 40px ${F.caps}`, `700 40px ${F.caps}`, `700 40px ${F.serif}`, `400 40px ${F.serif}`, `500 40px ${F.en}`, `500 40px ${F.sans}`],
    open(ctx, M, s, u){
      const m = mm(M), cx = M.W / 2, cy = M.H / 2;
      if (u < 2.7) {   // 필름 카운트다운 3 · 2 · 1
        const n = 3 - Math.floor(Math.max(0, u) / .9), f = (Math.max(0, u) % .9) / .9, r = m * .3;
        ctx.save();
        ctx.fillStyle = "#1b1a18"; ctx.fillRect(0, 0, M.W, M.H);
        ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = Math.max(2, m * .004);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(M.W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, M.H); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * .82, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * .82, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        K.text(ctx, String(Math.max(1, n)), cx, cy + m * .01, { family: F.caps, weight: 700, size: m * .3, color: "rgba(255,255,255,.9)" });
        return;
      }
      const v = u - 2.7, a = K.rise(v, .2, 1.1), b = K.rise(v, 1.3, 1.1), y = M.H * .44;
      title(ctx, M, M.d.open[0], cx, y, a, { enFamily: F.caps, enWeight: 500, enSize: .085, caps: true });
      names(ctx, M, cx, y + m * .15, b, { size: .034 });
      K.text(ctx, dateDot(M.d), cx, y + m * .21, { family: F.caps, weight: 500, size: m * .028, color: "rgba(255,255,255,.7)", spacing: m * .01, alpha: b });
    },
    photo(ctx, M, s, u){
      const p = ph(M, s), box = area(M);
      if (p) K.photo(ctx, M, p, s, u, { box, zoom: .06 });
      if (s.intro) intro(ctx, M, s, u, { accent: "#D9C08C", y: box[1] + box[3] - mm(M) * .26 }); else if (s.caption) caption(ctx, M, s, u, { chapter: "#D9C08C", bottom: box[1] + box[3] });
    },
    parents(ctx, M, s, u){ message(ctx, M, s, u); },
    thanks(ctx, M, s, u){ message(ctx, M, s, u); },
    close(ctx, M, s, u){
      const p = ph(M, s), m = mm(M), cx = M.W / 2;
      if (p) { K.photo(ctx, M, p, s, u, { box: area(M), zoom: .04 }); K.veil(ctx, M.W, M.H, "#000", .6); }
      const a = K.rise(u, .5, 1.2), b = K.rise(u, 2, 1.2);
      title(ctx, M, M.d.close, cx, M.H * .42, a, { size: .062, enFamily: F.caps, enWeight: 500, enSize: .07, caps: true });
      // 엔딩 크레딧
      const rows = [[nameEn(M.d) ? "GROOM" : "신랑", M.d.groomEn || M.d.groom || ""], [nameEn(M.d) ? "BRIDE" : "신부", M.d.brideEn || M.d.bride || ""]].filter(([, v]) => v);   // 이름을 안 쓰면 크레딧 줄은 빼요
      rows.forEach(([k, v], i) => {
        const y = M.H * .42 + m * (.15 + i * .065);
        K.text(ctx, k, cx - m * .03, y, { family: nameEn(M.d) ? F.caps : F.sans, weight: 500, size: m * .026, spacing: m * .008, color: "#D9C08C", align: "right", alpha: b });
        K.text(ctx, v, cx + m * .03, y, { family: nameEn(M.d) ? F.caps : F.serif, weight: nameEn(M.d) ? 500 : 700, size: m * .036, spacing: nameEn(M.d) ? m * .008 : 0, color: "#fff", align: "left", alpha: b });
      });
      K.text(ctx, [dateDot(M.d), M.d.venue].filter(Boolean).join("   ·   "), cx, M.H * .42 + m * .32, { family: F.sans, weight: 400, size: m * .026, color: "rgba(255,255,255,.65)", alpha: b });
    },
    over(ctx, M, t){
      const [, y, , h] = area(M);
      K.grain(ctx, M, t, .05);
      K.vignette(ctx, M, .35);
      ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, M.W, Math.ceil(y)); ctx.fillRect(0, Math.floor(y + h), M.W, M.H - Math.floor(y + h)); ctx.restore();
    }
  });

  // ===== 3. 미니멀: 밝은 바탕에 사진과 글자만 =====
  const INK = "#2A2622", PAPER = "#F3EEE6";
  const mbox = (M, p) => {   // 사진 칸: 사진 비율에 맞춰 (가로 사진 3:2, 세로 사진 4:5)
    const ar = p ? Math.max(.8, Math.min(1.5, p.w / p.h)) : 1.5;
    if (tall(M)) { const w = M.W * .84, h = Math.min(M.H * .6, w / ar); return [(M.W - w) / 2, M.H * .4 - h / 2, w, h]; }
    const h = M.H * .66, w = Math.min(M.W * .8, h * ar); return [(M.W - w) / 2, M.H * .09, w, h];
  };
  TEMPLATES.push({
    key: "minimal", name: "미니멀", desc: "밝은 바탕에 사진과 글자만. 짧고 깔끔하게", photos: [10, 25],
    box: (M, p) => mbox(M, p),
    bg: PAPER, edge: PAPER, xf: 1, trans: "fade",
    time: { open: 6, parents: 6, thanks: 6, close: 7, min: 3.5, max: 8 },   // 슬라이드형 템플릿은 사진 11~27장, 장당 약 8초까지
    openPhoto: false, thanksPhoto: false, closePhoto: false,
    fonts: [`500 40px ${F.en}`, `italic 500 40px ${F.en}`, `700 40px ${F.serif}`, `400 40px ${F.serif}`, `400 40px ${F.sans}`, `500 40px ${F.caps}`],
    open(ctx, M, s, u){
      const m = mm(M), a = K.rise(u, .4, 1.2), b = K.rise(u, 1.4, 1.2), y = M.H * .44;
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, M.W, M.H);
      title(ctx, M, M.d.open[0], M.W / 2, y, a, { color: INK, enSize: .095 });
      ctx.save(); ctx.globalAlpha *= b; ctx.fillStyle = INK; ctx.fillRect(M.W / 2 - m * .035, y + m * .1, m * .07, Math.max(2, m * .0025)); ctx.restore();
      names(ctx, M, M.W / 2, y + m * .17, b, { color: INK, enFamily: F.caps, size: .034 });
      K.text(ctx, dateDot(M.d), M.W / 2, y + m * .23, { family: F.en, weight: 500, size: m * .032, color: "rgba(42,38,34,.7)", spacing: m * .006, alpha: b });
    },
    photo(ctx, M, s, u){
      const p = ph(M, s), m = mm(M);
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, M.W, M.H);
      if (p) {
        const box = mbox(M, p);
        ctx.save(); ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.fillRect(box[0] + m * .006, box[1] + m * .008, box[2], box[3]); ctx.restore();
        const meta = (M.bank.meta && M.bank.meta(s.i)) || {};
        K.photo(ctx, M, p, s, u, { box, fit: meta.fit === "whole" ? "contain" : "cover", zoom: .04 });
        const by = box[1] + box[3];
        const a = K.rise(u, .5, .9) * fadeOut(u, s);
        if (s.intro) {
          K.text(ctx, `${s.intro.who} ${s.intro.name || ""}`.trim(), M.W / 2, by + m * .07, { family: F.serif, weight: 700, size: m * .046, color: INK, alpha: a });
          if (s.intro.tags) K.text(ctx, s.intro.tags, M.W / 2, by + m * .135, { family: F.sans, weight: 400, size: m * .034, color: "rgba(42,38,34,.75)", alpha: K.rise(u, 1, .8) * fadeOut(u, s) });
        } else if (s.caption) {
          K.block(ctx, s.caption, M.W / 2, by + m * (s.caption.includes("\n") ? .1 : .075), { family: F.serif, weight: 400, size: m * .044, color: INK, maxW: M.W * .84, lh: 1.45, alpha: a,
            reveal: i => K.rise(u, .5 + i * .35, .9) });
        }
      }
    },
    parents(ctx, M, s, u){ ctx.fillStyle = PAPER; ctx.fillRect(0, 0, M.W, M.H); message(ctx, M, s, u, { color: INK }); },
    thanks(ctx, M, s, u){ ctx.fillStyle = PAPER; ctx.fillRect(0, 0, M.W, M.H); message(ctx, M, s, u, { color: INK }); },
    close(ctx, M, s, u){
      const m = mm(M), a = K.rise(u, .4, 1.2), b = K.rise(u, 1.6, 1.2);
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, M.W, M.H);
      title(ctx, M, M.d.close, M.W / 2, M.H * .45, a, { color: INK, size: .062, enSize: .085 });
      names(ctx, M, M.W / 2, M.H * .45 + m * .15, b, { color: INK, enFamily: F.caps, size: .032 });
      K.text(ctx, dateDot(M.d), M.W / 2, M.H * .45 + m * .21, { family: F.en, weight: 500, size: m * .03, color: "rgba(42,38,34,.7)", spacing: m * .006, alpha: b });
    }
  });

  // ===== 4. 무빙포스터: 포스터 한 장이 천천히 움직여요 (사진 1~10장, 하객 입장 동안 반복 재생) =====
  const POSTER = "#15120F", GOLD = "#D8C3A0";
  const pbox = M => tall(M) ? [M.W * .08, M.H * .07, M.W * .84, M.H * .6] : [M.W * .06, M.H * .08, M.W * .5, M.H * .84];
  function poster(ctx, M, s, u, line){
    const m = mm(M), box = pbox(M), p = ph(M, s);
    ctx.fillStyle = POSTER; ctx.fillRect(0, 0, M.W, M.H);
    if (p) {
      // 처음·끝 장면은 같은 크기(1배)에서 시작·끝나서 반복해도 이음새가 안 보여요
      const life = Math.max(0, Math.min(1, (u + M.tpl.xf) / (s.dur + M.tpl.xf)));
      const z = s.kind === "close" ? 1.05 - .05 * K.ease(life) : 1 + .05 * K.ease(life);
      const meta = (M.bank.meta && M.bank.meta(s.i)) || {};
      ctx.save(); ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip();
      if (meta.fit === "whole") { const k = Math.min(box[2] / p.w, box[3] / p.h) * z, dw = p.w * k, dh = p.h * k; ctx.drawImage(p.img, box[0] + (box[2] - dw) / 2, box[1] + (box[3] - dh) / 2, dw, dh); }
      else K.framed(ctx, p.img, box[0], box[1], box[2], box[3], (meta.z || 1) * z, meta.cx ?? .5, meta.cy ?? .5);
      ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = "rgba(216,195,160,.55)"; ctx.lineWidth = Math.max(1.5, m * .002);
    ctx.strokeRect(box[0] - m * .012, box[1] - m * .012, box[2] + m * .024, box[3] + m * .024); ctx.restore();
    const en = nameEn(M.d);
    const cx = tall(M) ? M.W / 2 : M.W * .78, ny = tall(M) ? M.H * .76 : M.H * .4;
    if (en) {
      K.text(ctx, M.d.groomEn, cx, ny, { family: F.caps, weight: 500, size: m * .07, spacing: m * .01, color: "#fff" });
      K.text(ctx, "&", cx, ny + m * .085, { family: F.en, weight: 500, size: m * .06, color: GOLD });
      K.text(ctx, M.d.brideEn, cx, ny + m * .17, { family: F.caps, weight: 500, size: m * .07, spacing: m * .01, color: "#fff" });
    } else {
      K.text(ctx, M.d.groom || "신랑", cx, ny, { family: F.serif, weight: 700, size: m * .08, color: "#fff" });
      K.text(ctx, "&", cx, ny + m * .085, { family: F.en, weight: 500, size: m * .06, color: GOLD });
      K.text(ctx, M.d.bride || "신부", cx, ny + m * .17, { family: F.serif, weight: 700, size: m * .08, color: "#fff" });
    }
    K.text(ctx, dateDot(M.d), cx, ny + m * .26, { family: F.caps, weight: 500, size: m * .03, spacing: m * .01, color: GOLD });
    if (M.d.venue) K.text(ctx, M.d.venue, cx, ny + m * .31, { family: F.sans, weight: 400, size: m * .026, color: "rgba(255,255,255,.6)" });
    if (line) {
      const a = K.rise(u, .8, 1) * fadeOut(u, s, 1.4);
      K.block(ctx, line, cx, tall(M) ? M.H * .7 : M.H * .2, { family: latin(line) ? F.en : F.serif, weight: 400, size: m * (latin(line) ? .046 : .038),
        color: "rgba(255,255,255,.85)", maxW: tall(M) ? M.W * .84 : M.W * .36, lh: 1.45, alpha: a });
    }
  }
  TEMPLATES.push({
    key: "poster", name: "무빙포스터", desc: "포스터 한 장이 천천히 움직여요. 사진 1~10장, 반복 재생용", photos: [1, 10],
    box: M => pbox(M),
    bg: POSTER, xf: 1.6, trans: "fade", loop: true, fill: true,
    time: { open: 6, parents: 6, thanks: 6, close: 6, min: 5, max: 9 },
    openPhoto: true, thanksPhoto: true, closePhoto: "first",
    fonts: [`500 40px ${F.caps}`, `700 40px ${F.serif}`, `400 40px ${F.serif}`, `500 40px ${F.en}`, `400 40px ${F.sans}`],
    open(ctx, M, s, u){ poster(ctx, M, s, u, M.d.open[0]); },
    photo(ctx, M, s, u){ poster(ctx, M, s, u, s.intro ? `${s.intro.who} ${s.intro.name || ""}  ${s.intro.tags || ""}`.trim() : s.caption); },
    parents(ctx, M, s, u){ poster(ctx, M, s, u, s.text); },
    thanks(ctx, M, s, u){ poster(ctx, M, s, u, s.text); },
    close(ctx, M, s, u){ poster(ctx, M, s, u, M.d.close); }
  });

  // 고르는 화면 순서: 첫 줄에 러브 스토리·미니멀 (필메이커 구매 표기: 스토리형 전체가 가장 많고, 1종당은 짧은 슬라이드형이 약 2배 — 조사-검증.md D1)
  const ORDER = ["story", "minimal", "cinema", "poster"];
  TEMPLATES.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
})();
