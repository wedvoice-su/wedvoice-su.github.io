// 축의금 장부 · 화면 없이 하는 계산: 금액 읽기 · 쓰기, 한 줄 입력 풀기, 붙여 넣은 글 풀기, 합계, 확인할 것 찾기
// 화면(app.js)과 시험(docs/축의금-장부/도구/core-test.js)이 같이 써요. 여기서는 화면도 저장도 건드리지 않아요.
(function(root){
  const MAN = 10000;
  const comma = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // 원 → 읽기 쉬운 글. 100000 → "10만 원" · 105000 → "10만 5,000원" · 123400000 → "1억 2,340만 원" · 5000 → "5,000원" · 0 → "0원"
  function won(n){
    n = Math.round(n || 0);
    const neg = n < 0; n = Math.abs(n);
    const eok = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / MAN), rest = n % MAN;
    const parts = [];
    if(eok) parts.push(comma(eok) + "억");
    if(man) parts.push(comma(man) + "만");
    let s;
    if(rest) s = (parts.length ? parts.join(" ") + " " : "") + comma(rest) + "원";
    else s = parts.length ? parts.join(" ") + " 원" : "0원";
    return (neg ? "-" : "") + s;
  }
  // 원 → 만 원 숫자 글. 100000 → "10" · 105000 → "10.5" · 5000 → "0.5"
  function manText(n){ return String(+(n / MAN).toFixed(4)); }

  // 금액 글 → 원. 못 읽으면 null.
  //   "10" → 100000 (1000 미만 숫자는 만 원) · "10.5" → 105000 · "100,000" · "100000원" → 100000 (1000 이상은 원)
  //   "10만" · "10만원" · "10만 5천" · "5천원" · "1억 2천만" 도 읽어요
  function parseAmt(str){
    if(str == null) return null;
    let s = String(str).replace(/[\s,]/g, "").replace(/원$/, "").replace(/^[₩￦]/, "");
    if(!s) return null;
    if(/^\d+(\.\d+)?$/.test(s)){
      const v = parseFloat(s);
      if(!isFinite(v)) return null;
      return Math.round(v >= 1000 ? v : v * MAN);
    }
    // 억 · 만 · 천 단위
    const m = /^(?:(\d+(?:\.\d+)?)억)?(?:(\d+(?:\.\d+)?)천만)?(?:(\d+(?:\.\d+)?)만)?(?:(\d+(?:\.\d+)?)천)?(\d+)?$/.exec(s);
    if(!m || !(m[1] || m[2] || m[3] || m[4])) return null;
    const v = (parseFloat(m[1] || 0) * 1e8) + (parseFloat(m[2] || 0) * 1e7) + (parseFloat(m[3] || 0) * MAN) + (parseFloat(m[4] || 0) * 1000) + parseFloat(m[5] || 0);
    return isFinite(v) ? Math.round(v) : null;
  }
  const AMT_TOKEN = /^[₩￦]?(?:\d[\d,]*(?:\.\d+)?(?:억|천만|만|천)?)+원?$/;

  // 한 줄 입력 풀기: "김철수 10" → { name: "김철수", amt: 100000 } · "김철수 10 2" → 식권 2장 · "김철수" → 금액 없음
  //   맨 끝의 숫자가 금액이에요. 숫자가 둘 이어지면 앞이 금액, 뒤가 식권 수.
  function parseLine(line){
    let s = String(line == null ? "" : line).replace(/[ \t]+/g, " ").trim();
    if(!s) return null;
    const tok = s.split(/\s+/);
    let amt = null, tk = null;
    const isNum = t => AMT_TOKEN.test(t) && parseAmt(t) != null;
    if(tok.length >= 3 && isNum(tok[tok.length - 2]) && /^\d{1,2}$/.test(tok[tok.length - 1])){
      tk = +tok.pop(); amt = parseAmt(tok.pop());
    } else if(tok.length >= 2 && isNum(tok[tok.length - 1])){
      amt = parseAmt(tok.pop());
      // "10 만원" · "10 만 원"처럼 단위를 띄어 쓴 경우는 아래 normalize에서 붙여요
    }
    const name = tok.join(" ").replace(/[,;:·]+$/, "").trim();
    if(!name && amt == null) return null;
    return { name, amt, tk };
  }
  // 줄 다듬기: "10 만원" → "10만원", "100,000 원" → "100,000원"
  function normLine(s){ return String(s).replace(/(\d)\s+(억|천만|만|천)(?=\s|원|$|\d)/g, "$1$2").replace(/(\d|억|만|천)\s+원(?=\s|$)/g, "$1원"); }

  // 붙여 넣은 글 풀기 → { rows: [{ name, amt, tk, raw }], bad: [줄 글], table: 표(칸이 3개 넘는 줄이 많을 때) }
  //   메모장("김철수 10") · 엑셀 두 칸(이름 [탭] 금액) · 은행 입금 내역(칸이 여러 개)을 모두 받아요
  function parsePaste(text){
    const lines = String(text || "").split(/\r?\n/).map(l => l.replace(/ /g, " ")).filter(l => l.trim());
    const tabbed = lines.filter(l => l.includes("\t"));
    if(tabbed.length >= Math.max(1, lines.length * 0.6)){
      const grid = lines.map(l => l.split("\t").map(c => c.trim()));
      const width = Math.max(...grid.map(r => r.length));
      if(width >= 3) return { rows: [], bad: [], table: { grid, width, guess: guessCols(grid, width) } };
    }
    const rows = [], bad = [];
    for(const l of lines){
      const p = parseLine(normLine(l.replace(/\t+/g, " ").replace(/\s*[,;]\s+/g, " ")));
      if(p && p.name && p.amt != null && p.amt > 0) rows.push({ name: p.name, amt: p.amt, tk: p.tk, raw: l });
      else bad.push(l.trim());
    }
    return { rows, bad, table: null };
  }
  const HANGUL_NAME = /^[가-힣]{2,5}$/;
  // 표에서 이름 칸 · 금액 칸 짐작하기: 이름 = 한글 2~5자가 가장 많은 칸, 금액 = 1만 원으로 나누어 떨어지는 숫자가 가장 많은 칸
  //   머리줄에 "보낸 분 · 입금액" 같은 말이 있으면 그 칸을 먼저 믿고, 은행 말(이체 · 카카오페이 …)만 있는 칸은 이름에서 빼요
  const BANK_WORD = /이체|입금|출금|송금|은행|뱅크|페이|토스|카카오|적요|타행|당행|인터넷|모바일|스마트|자동|결제|이자|현금|체크|카드|잔액|구분|메모|거래/;
  const NAME_HEAD = /보낸\s*분|보낸\s*사람|의뢰인|입금자|성명|이름|기재\s*내용|^내용$/, AMT_HEAD = /입금|맡기신|받은\s*금액|거래\s*금액|^금액/;
  function guessCols(grid, width){
    let name = -1, amt = -1, bestN = 0, bestA = 0;
    for(const r of grid.slice(0, 3)){
      for(let c = 0; c < width; c++){
        const v = (r[c] || "").replace(/\s+/g, " ").trim();
        if(name < 0 && NAME_HEAD.test(v)) name = c;
        if(amt < 0 && AMT_HEAD.test(v) && !/출금|찾으신/.test(v)) amt = c;
      }
      if(name >= 0 || amt >= 0) break;
    }
    const fixedN = name >= 0, fixedA = amt >= 0;
    for(let c = 0; c < width; c++){
      let n = 0, a = 0;
      for(const r of grid){
        const v = (r[c] || "").trim();
        if(!fixedN && HANGUL_NAME.test(v.replace(/\s+/g, "")) && !BANK_WORD.test(v)) n++;
        if(fixedA) continue;
        const num = /^[₩￦+]?[\d,]+원?$/.test(v) ? parseInt(v.replace(/[^\d]/g, ""), 10) : NaN;
        if(num >= MAN && num % MAN === 0) a++;
      }
      if(n > bestN){ bestN = n; name = c; }
      if(a > bestA){ bestA = a; amt = c; }
    }
    return { name, amt };
  }
  // 표에서 고른 칸으로 줄 만들기 (금액은 원 단위 숫자로 읽어요)
  function rowsFromTable(table, nameCol, amtCol){
    const rows = [], bad = [];
    for(const r of table.grid){
      const name = (r[nameCol] || "").trim(), raw = (r[amtCol] || "").trim();
      const digits = raw.replace(/[^\d.]/g, "");
      const amt = /\d/.test(raw) && !/[가-힣A-Za-z]/.test(raw.replace(/원$/, "")) ? Math.round(parseFloat(digits)) : NaN;
      if(name && amt > 0 && !/^(이름|성명|보낸\s*분|입금자|내용|적요|기재\s*내용|받는\s*분)/.test(name)) rows.push({ name, amt, tk: null, raw: r.join(" | ") });
      else bad.push(r.join(" | "));
    }
    return { rows, bad };
  }

  // ===== 합계 =====
  // rows: [{ side "g"|"b", how "c" 봉투 | "a" 계좌, amt 원, tk 식권 수, who 누구 손님, no 봉투 번호, name }]
  const BANDS = [[0, 30000, "3만 원 이하"], [30001, 50000, "5만 원"], [50001, 100000, "10만 원"], [100001, 200000, "20만 원"], [200001, 300000, "30만 원"], [300001, 500000, "50만 원"], [500001, 1000000, "100만 원"], [1000001, Infinity, "100만 원 넘음"]];
  function bandOf(amt){ return BANDS.findIndex(b => amt >= b[0] && amt <= b[1]); }
  function sum(list, f){ let s = 0; for(const r of list) s += f ? f(r) : (r.amt || 0); return s; }
  // 금액을 아직 안 적은 줄은 amt가 null이에요 (0은 "빈 봉투"로 확인한 것). 합계에는 0으로 더해요.
  function stats(rows){
    const pick = f => rows.filter(f);
    const part = list => ({ n: list.length, amt: sum(list), tk: sum(list, r => r.tk || 0), cash: sum(list.filter(r => r.how !== "a")), cashN: list.filter(r => r.how !== "a").length, acct: sum(list.filter(r => r.how === "a")), acctN: list.filter(r => r.how === "a").length,
      unk: list.filter(r => r.amt == null).length, noName: list.filter(r => !String(r.name || "").trim()).length });
    const out = { all: part(rows), g: part(pick(r => r.side === "g")), b: part(pick(r => r.side === "b")) };
    out.bands = BANDS.map((b, i) => { const l = rows.filter(r => r.amt > 0 && bandOf(r.amt) === i); return { label: b[2], n: l.length, amt: sum(l) }; });
    const known = rows.filter(r => r.amt != null);
    out.avg = known.length ? Math.round(sum(known) / known.length) : 0;
    // 누구 손님
    out.who = {};
    for(const r of rows){ const k = r.side + ":" + (r.who || ""); (out.who[k] = out.who[k] || { n: 0, amt: 0, tk: 0 }); out.who[k].n++; out.who[k].amt += r.amt || 0; out.who[k].tk += r.tk || 0; }
    // 관계별 (많이 받은 순)
    const rel = new Map();
    for(const r of rows){ const k = String(r.rel || "").trim(); if(!k) continue; if(!rel.has(k)) rel.set(k, { rel: k, n: 0, amt: 0 }); const x = rel.get(k); x.n++; x.amt += r.amt || 0; }
    out.rel = [...rel.values()].sort((a, b) => b.amt - a.amt || b.n - a.n);
    return out;
  }

  // 초성 찾기: "ㄱㅊㅅ"로 "김철수"를 찾아요
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  function cho(str){ let o = ""; for(const ch of String(str || "")){ const c = ch.charCodeAt(0); o += c >= 0xAC00 && c <= 0xD7A3 ? CHO[Math.floor((c - 0xAC00) / 588)] : ch; } return o; }
  // 찾는 말이 초성만으로 되어 있으면 초성끼리, 아니면 글자 그대로 견줘요 (띄어쓰기 · 대소문자 무시)
  function match(text, q){
    const t = String(text || "").replace(/\s+/g, "").toLowerCase(), k = String(q || "").replace(/\s+/g, "").toLowerCase();
    if(!k) return true;
    return /^[ㄱ-ㅎ]+$/.test(k) ? cho(t).includes(k) : t.includes(k);
  }

  // ===== 확인할 것 찾기 =====
  // 빠진 번호 · 겹친 번호 · 이름 없는 줄 · 금액 없는 줄 · 같은 이름 · 큰 금액
  //   opt.skip = { g: [없는 번호…], b: […] } 는 빠진 번호에서 빼고, "이대로 맞아요"를 누른 줄(r.ok)은 줄 확인에서 빼요
  function checks(rows, opt){
    opt = opt || {};
    const bigOver = opt.bigOver || 1000000, skip = opt.skip || {};
    const out = { gaps: { g: [], b: [] }, dupNo: { g: [], b: [] }, noName: [], noAmt: [], sameName: [], big: [] };
    for(const side of ["g", "b"]){
      const list = rows.filter(r => r.side === side && r.how !== "a" && r.no);
      if(!list.length) continue;
      const all = new Set(list.map(r => r.no)), open = new Map();
      for(const r of list) if(!r.ok) open.set(r.no, (open.get(r.no) || 0) + 1);
      const max = Math.max(...all), sk = new Set(skip[side] || []);
      for(let i = 1; i <= max; i++) if(!all.has(i) && !sk.has(i)) out.gaps[side].push(i);
      for(const [n, c] of open) if(c > 1) out.dupNo[side].push(n);
      out.dupNo[side].sort((a, b) => a - b);
    }
    const byName = new Map();
    for(const r of rows){
      if(r.ok) continue;
      const nm = String(r.name || "").trim();
      if(!nm) out.noName.push(r);
      if(r.amt == null) out.noAmt.push(r);
      if(r.amt > bigOver) out.big.push(r);
      if(nm){ const k = r.side + ":" + nm.replace(/\s+/g, ""); if(!byName.has(k)) byName.set(k, []); byName.get(k).push(r); }
    }
    for(const l of byName.values()) if(l.length > 1) out.sameName.push(l);
    // 화면에 보이는 줄 수와 같게 세요 (이름 없는 줄 · 금액 안 적은 줄 · 큰 금액은 한 줄로 묶어서)
    out.count = (out.gaps.g.length ? 1 : 0) + (out.gaps.b.length ? 1 : 0) + out.dupNo.g.length + out.dupNo.b.length + (out.noName.length ? 1 : 0) + (out.noAmt.length ? 1 : 0) + out.sameName.length + (out.big.length ? 1 : 0);
    return out;
  }
  // 번호 목록을 짧게: [3,4,5,9] → "3~5, 9"
  function ranges(list){
    const out = []; let a = null, b = null;
    for(const n of list){ if(a == null){ a = b = n; } else if(n === b + 1){ b = n; } else { out.push(a === b ? String(a) : `${a}~${b}`); a = b = n; } }
    if(a != null) out.push(a === b ? String(a) : `${a}~${b}`);
    return out.join(", ");
  }

  // 지폐 세기: { 50000: 장수, 10000: 장수, 5000: 장수, 1000: 장수, etc: 원 } → 합계 원
  const BILLS = [50000, 10000, 5000, 1000];
  function cashTotal(c){ c = c || {}; return BILLS.reduce((s, b) => s + b * (+c[b] || 0), 0) + (+c.etc || 0); }

  const api = { MAN, comma, won, manText, parseAmt, parseLine, normLine, parsePaste, guessCols, rowsFromTable, BANDS, bandOf, stats, cho, match, checks, ranges, BILLS, cashTotal };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  root.DN = api;
})(typeof window !== "undefined" ? window : globalThis);
