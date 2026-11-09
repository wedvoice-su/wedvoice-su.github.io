// 결혼 좋은 날 찾기 · 택일 계산 (화면과 따로 둬서 node로도 시험할 수 있게)
// 규칙과 근거: docs/예식일-달력/택일-자료.md (조사 A·B + 교차 검증 반영, 2026-11-09 사회자님 결정)
//  - 거르기(후보에서 조용히 빠짐): 생기복덕 화해·절명 · 가취월 방부주·방여신 · 월파 · 해일 · 본명일 · 월염·염대 · 월살(오합이면 남김) · 천강·하괴(황도면 남김) · 홍사 · 동지·하지·단오·초파일
//  - 감점(순서만 뒤로): 천적(한국판) · 수사 · 피마 · 월기일(오합이면 남김) · 띠 상충
//  - 가점: 생기·천의·복덕(사람마다 2) · 대리월 2 · 황도 1 · 천덕·월덕(+합) 1 · 음양부장 1 · 오합 0.5
//  - 기준이 갈리면(띠·나이의 해 경계, 가취월 절기/음력 달, 절입 날) 모든 기준에서 통과한 날만, 좋은 말도 모든 기준에서 맞을 때만
// 데이터(DAYS, IPCHUN …)는 data.js

const HBR = "子丑寅卯辰巳午未申酉戌亥", HST = "甲乙丙丁戊己庚辛壬癸";
const KBR = "자축인묘진사오미신유술해", KST = "갑을병정무기경신임계";
const ZODIAC = ["쥐","소","범","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];
const mod = (a, n) => ((a % n) + n) % n;
const dayNoOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 864e5);   // 1970-01-01 = 0
const ymdOf = n => { const t = new Date(n * 864e5); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const isoOf = n => new Date(n * 864e5).toISOString().slice(0, 10);
const weekdayOf = n => mod(n + 4, 7);            // 0 일 … 6 토 (1970-01-01 = 목)
const gzOfDay = n => mod(n + 17, 60);            // 0 = 갑자 (조사 B 2절, KASI 1,187일 대조)
const yearGz = y => mod(y - 4, 60);              // 1984 = 갑자

// ===== 생기복덕 (조사 A R-03, 검증 ✅) =====
const GUA_M = ["兌","乾","坎","艮","震","巽","離","坤"];
const GUA_F7 = ["坎","乾","兌","坤","離","巽","震"], GUA_F = ["坎","乾","兌","坤","離","巽","震","艮"];
function gua(age, male){ return male ? (age === 1 ? "離" : GUA_M[(age - 2) % 8]) : (age <= 7 ? GUA_F7[age - 1] : GUA_F[(age - 8) % 8]); }
// 본명괘 → [생기, 천의, 절체, 유혼, 화해, 복덕, 절명, 귀혼]의 일진 지지
const SB_TABLE = {
  離:["卯","酉","子","未申","丑寅","辰巳","戌亥","午"], 坤:["丑寅","辰巳","戌亥","午","卯","酉","子","未申"],
  兌:["戌亥","午","丑寅","辰巳","子","未申","卯","酉"], 乾:["酉","卯","未申","子","辰巳","丑寅","午","戌亥"],
  坎:["辰巳","丑寅","午","戌亥","酉","卯","未申","子"], 艮:["未申","子","酉","卯","午","戌亥","辰巳","丑寅"],
  震:["午","戌亥","辰巳","丑寅","未申","子","酉","卯"], 巽:["子","未申","卯","酉","戌亥","午","丑寅","辰巳"]
};
const SB_NAME = ["생기","천의","절체","유혼","화해","복덕","절명","귀혼"];
function sbOf(age, male, b){ const row = SB_TABLE[gua(age, male)]; for(let i = 0; i < 8; i++) if(row[i].includes(HBR[b])) return SB_NAME[i]; }
const SB_GOOD = new Set(["생기","천의","복덕"]), SB_BAD = new Set(["화해","절명"]);

// ===== 가취월 (조사 A R-02, 72칸 검증 ✅) — 신부 띠 쌍 → 대리월·방매씨·방옹고·방여부모·방부주·방여신의 달 =====
const GCW = [[6,12,1,7,2,8,3,9,4,10,5,11],[5,11,4,10,3,9,2,8,1,7,6,12],[2,8,3,9,4,10,5,11,6,12,1,7],
             [1,7,6,12,5,11,4,10,3,9,2,8],[4,10,5,11,6,12,1,7,2,8,3,9],[3,9,2,8,1,7,6,12,5,11,4,10]];
const GCW_NAME = ["대리월","방매씨","방옹고","방여부모","방부주","방여신"];
function gachwi(brideBr, m){ const row = GCW[brideBr % 6]; for(let k = 0; k < 6; k++) if(row[2 * k] === m || row[2 * k + 1] === m) return GCW_NAME[k]; }

// ===== 날로 보는 길신·흉신 (m = 절기 달, 입춘 = 1월 · b = 일진 지지) =====
const isHwangdo = (m, b) => { const mb = (m + 1) % 12, q = mod(mb - 2, 6) * 2; return [0,1,4,5,7,10].includes(mod(b - q, 12)); };
const wolpa = (m, b) => b === (m + 7) % 12;
const wolyeom = m => mod(11 - m, 12);
const wolsal = (m, b) => b === [1,10,7,4][(m - 1) % 4];
const cheongang = m => (5 + 7 * (m - 1)) % 12;
const hongsa = (m, b) => b === [9,5,1][(m - 1) % 3];
const cheonjeok = (m, b) => b === (4 + 5 * (m - 1)) % 12;   // 한국판
const susa = (m, b) => b === [10,4,11,5,0,6,1,7,2,8,3,9][m - 1];
const pima = (m, b) => b === [0,9,6,3][(m - 1) % 4];
// 천덕·천덕합(2·5·8·11월은 판본 셋으로 갈려 안 씀) · 월덕·월덕합 — 그날 천간(또는 지지)이 이 글자면
const TD = "丁申壬辛亥甲癸寅丙乙巳庚", TDH = "壬巳丁丙寅己戊亥辛庚申乙", WD = "丙甲壬庚丙甲壬庚丙甲壬庚", WDH = "辛己丁乙辛己丁乙辛己丁乙";
const TD_SKIP = new Set([2,5,8,11]);
function deokOf(m, s, b){
  const hit = ch => HST[s] === ch || HBR[b] === ch;
  if(!TD_SKIP.has(m) && hit(TD[m - 1])) return "천덕";
  if(HST[s] === WD[m - 1]) return "월덕";
  if(!TD_SKIP.has(m) && hit(TDH[m - 1])) return "천덕합";
  if(HST[s] === WDH[m - 1]) return "월덕합";
  return "";
}
// 음양부장길일: 표 A(협기변방서 원본)와 표 B(한국 택일서)에 둘 다 있는 날만 (조사 A R-07, 검증 제안)
const BUJANG_A = ["丙子 丙寅 丁丑 丁卯 丁亥 己丑 己卯 己亥 庚子 庚寅 辛丑 辛卯 辛亥","乙丑 乙亥 丙子 丙寅 丙戌 丁丑 丁亥 己丑 己亥 庚子 庚寅 庚戌",
  "甲子 甲戌 乙丑 乙酉 乙亥 丙子 丙戌 丁丑 丁酉 丁亥 己丑 己酉 己亥","甲子 甲申 甲戌 乙酉 乙亥 丙子 丙申 丙戌 丁酉 丁亥 戊子 戊申 戊戌",
  "甲申 甲戌 乙未 乙酉 乙亥 丙申 丙戌 戊申 戊戌 癸未 癸酉 癸亥","甲午 甲申 甲戌 乙未 乙酉 戊午 戊申 戊戌 壬午 壬申 壬戌 癸未 癸酉",
  "甲午 甲申 乙巳 乙未 乙酉 戊午 戊申 壬午 壬申 癸巳 癸未 癸酉","甲辰 甲午 甲申 戊辰 戊午 戊申 辛巳 辛未 壬辰 壬午 壬申 癸巳 癸未",
  "戊辰 戊午 庚辰 庚午 辛卯 辛巳 辛未 壬辰 壬午 癸卯 癸巳 癸未","己卯 己巳 庚寅 庚辰 庚午 辛卯 辛巳 壬寅 壬辰 壬午 癸卯 癸巳",
  "丁丑 丁卯 丁巳 己丑 己卯 己巳 庚寅 庚辰 辛丑 辛卯 辛巳 壬寅 壬辰","丙子 丙寅 丙辰 丁丑 丁卯 己丑 己卯 庚子 庚寅 庚辰 辛丑 辛卯"];
const BUJANG_B = ["丙子 戊子 庚子 丁丑 己丑 辛丑 丙寅 戊寅 庚寅 丁卯 己卯 辛卯","丙子 戊子 庚子 丙寅 戊寅 庚寅 乙丑 丁丑 己丑 丙戌 戊戌 庚戌",
  "甲子 丙子 戊子 乙丑 丁丑 己丑 乙酉 丁酉 己酉 甲戌 丙戌 戊戌","甲子 丙子 戊子 甲申 丙申 戊申 乙酉 丁酉 己酉 甲戌 丙戌 戊戌",
  "乙未 癸未 甲申 丙申 戊申 乙酉 癸酉 甲戌 丙戌 戊戌","甲午 壬午 乙未 癸未 甲申 壬申 乙酉 癸酉 甲戌 壬戌",
  "乙巳 癸巳 甲午 壬午 乙未 癸未 甲申 壬申 乙酉 癸酉","甲辰 壬辰 辛巳 癸巳 甲午 壬午 辛未 癸未 甲申 壬申",
  "辛卯 癸卯 庚辰 壬辰 辛巳 癸巳 庚午 壬午 辛未 癸未","壬寅 庚寅 辛卯 癸卯 庚辰 壬辰 辛巳 癸巳 庚午 壬午",
  "辛丑 丁丑 己丑 辛卯 己卯 丁卯 庚寅 壬寅 壬辰 庚辰 辛巳 丁巳 己巳","辛丑 丁丑 己丑 辛卯 己卯 丁卯 戊子 庚子 丙子 庚辰 丙辰 戊辰 庚寅 丙寅 戊寅"];
const BUJANG = BUJANG_A.map((a, i) => { const b = new Set(BUJANG_B[i].split(" ")); return new Set(a.split(" ").filter(x => b.has(x))); });

// ===== 사람 =====
// 양력 생일 → { y, dn, years: 입춘 기준 해 후보 } — 입춘 날 태어나면(시간을 안 받아서) 두 해 모두로 봐요.
// 입춘이 자정 1시간 안이면 옆날도 두 해 모두로 (1954~1961년 표준시 차이 등)
function personOf(y, m, d, male){
  const dn = dayNoOf(y, m, d), ip = IPCHUN[y];
  const ipDn = dayNoOf(y, +ip.slice(0, 2), +ip.slice(3, 5)), ipH = +ip.slice(6, 8);
  let years = dn < ipDn ? [y - 1] : dn > ipDn ? [y] : [y - 1, y];
  if((ipH >= 23 && dn === ipDn + 1) || (ipH < 1 && dn === ipDn - 1)) years = [y - 1, y];
  return { male, y, m, d, dn, years };
}
const zodiacOf = p => p.years.map(y => ZODIAC[mod(y - 4, 12)]);
// 음력 생일 → 양력 [y, m, d] (없는 날이면 null)
function lunarToSolar(ly, lm, ld, leap){
  const mo = (LUNAR[ly] || []).find(x => x[0] === lm && x[1] === (leap ? 1 : 0));
  if(!mo || ld < 1 || ld > mo[3]) return null;
  return ymdOf(mo[2] + ld - 1);
}
const lunarMonthLen = (ly, lm, leap) => { const mo = (LUNAR[ly] || []).find(x => x[0] === lm && x[1] === (leap ? 1 : 0)); return mo ? mo[3] : 0; };
const hasLeap = (ly, lm) => (LUNAR[ly] || []).some(x => x[0] === lm && x[1] === 1);

// 예식 날의 입춘 기준 해 후보 (입춘 날이면 두 해 모두)
function wedYears(n){
  const [y] = ymdOf(n), ip = WED_IPCHUN[y], ipDn = dayNoOf(y, +ip.slice(5, 7), +ip.slice(8, 10));
  return n < ipDn ? [y - 1] : n > ipDn ? [y] : [y - 1, y];
}
// 세는 나이 후보: 입춘 기준(출생·예식 모두) + 양력 1월 1일 기준
function agesOf(p, n){
  const s = new Set(), [wy] = ymdOf(n);
  for(const by of p.years) for(const y of wedYears(n)) s.add(y - by + 1);
  s.add(wy - p.y + 1);
  return [...s];
}

// ===== 하루 보기 =====
// i = DAYS 번호 (0 = 2027-01-01). 돌려주는 값: { n, out(빠지는 날), pen(감점 수), good([{k, who?, name?}]), score, son }
function evaluate(i, bride, groom){
  const n = D0 + i, [lm, ld, leap, m0, m1, flag] = DAYS[i];
  const g = gzOfDay(n), s = g % 10, b = g % 12;
  const months = m0 === m1 ? [m0] : [m0, m1];          // 절입 날은 두 달 모두
  const ohap = b === 2 || b === 3;
  const people = [["신부", bride], ["신랑", groom]];
  let out = false, pen = 0, score = 0;
  const good = [];
  // 생기복덕 — 나이 후보 하나라도 화해·절명이면 빼고, 모든 후보가 생기·천의·복덕일 때만 좋은 날
  for(const [who, p] of people){
    const cats = agesOf(p, n).map(a => sbOf(a, p.male, b));
    if(cats.some(c => SB_BAD.has(c))) out = true;
    else if(cats.every(c => SB_GOOD.has(c))){ good.push({ k:"sb", who, name: cats.every(c => c === cats[0]) ? cats[0] : "생기복덕" }); score += 2; }
  }
  // 가취월 — 신부 띠 후보 × (절기 달 + 음력 달)
  const brs = bride.years.map(y => mod(y - 4, 12)), mset = [...new Set([...months, lm])];
  const gcs = brs.flatMap(br => mset.map(mm => gachwi(br, mm)));
  if(gcs.some(x => x === "방부주" || x === "방여신")) out = true;
  else if(gcs.every(x => x === "대리월")){ good.push({ k:"daeri" }); score += 2; }
  // 사람과 상관없는 날 (달 기준이 둘이면 둘 다 봄)
  const hw = months.every(m => isHwangdo(m, b));
  for(const m of months){
    const hwm = isHwangdo(m, b), ye = wolyeom(m), tg = cheongang(m);
    if(wolpa(m, b) || b === ye || b === (ye + 6) % 12 || hongsa(m, b)) out = true;
    if(wolsal(m, b) && !ohap) out = true;
    if((b === tg || b === (tg + 6) % 12) && !hwm) out = true;
  }
  if(b === 11) out = true;                                                   // 해일
  if(flag & 3) out = true;                                                   // 동지·하지
  if(!leap && ((lm === 5 && ld === 5) || (lm === 4 && ld === 8))) out = true; // 단오·초파일
  for(const [, p] of people) if(p.years.some(y => yearGz(y) === g)) out = true;   // 본명일
  // 감점
  if(months.some(m => cheonjeok(m, b))) pen++;
  if(months.some(m => susa(m, b))) pen++;
  if(months.some(m => pima(m, b))) pen++;
  if([5, 14, 23].includes(ld) && !ohap) pen++;
  for(const [, p] of people) if(p.years.some(y => b === (mod(y - 4, 12) + 6) % 12)) pen++;   // 띠 상충
  // 가점 (모든 달 기준에서 맞을 때만)
  if(hw){ good.push({ k:"hwangdo" }); score += 1; }
  const dk = months.map(m => deokOf(m, s, b));
  if(dk[0] && dk.every(x => x === dk[0])){ good.push({ k:"deok", name: dk[0] }); score += 1; }
  const gz = HST[s] + HBR[b];
  if(months.every(m => BUJANG[m - 1].has(gz))){ good.push({ k:"bujang" }); score += 1; }
  if(ohap){ good.push({ k:"ohap" }); score += 0.5; }
  score -= 2 * pen;
  return { n, out, pen, good, score, son: ld % 10 === 9 || ld % 10 === 0, lm, ld, leap };
}

if(typeof module !== "undefined") module.exports = { evaluate, personOf, lunarToSolar, lunarMonthLen, hasLeap, zodiacOf, agesOf, sbOf, gachwi, isHwangdo, deokOf, BUJANG, gzOfDay, yearGz, dayNoOf, isoOf, ymdOf, weekdayOf, KBR, KST, HBR, HST, mod, GCW };
