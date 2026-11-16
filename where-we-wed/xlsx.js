// 엑셀(.xlsx) 파일 만들기 — 외부 라이브러리 없이 (압축하지 않은 zip + 엑셀 XML)
// ready-to-wed/xlsx.js를 바탕으로 장부용으로 넓혔어요 (2026-11-16): 금액 서식(1,000 단위 쉼표) · 합계 수식 · 시트마다 자유로운 줄 구성
// 쓰는 법: xlsxBook([{ name, widths, rows, freeze, filter, merges, landscape, titleRow }]) → Blob
//   name      시트 이름
//   widths    열 너비 목록
//   rows      줄 목록. 한 줄 = 칸 목록(또는 { ht, cells }). 한 칸 = 값(글 · 숫자) 또는 { v 값, s 모양, f 수식 }
//             수식은 "SUM(F5:F20)"처럼 = 없이 적고, v에 미리 계산한 값을 같이 넣어요 (수식을 계산하지 않는 미리 보기에서도 숫자가 보이게)
//   freeze    위에서 몇 줄을 고정할지 (머리줄까지)
//   filter    "A4:H120"처럼 ▼ 거르기를 붙일 범위
//   merges    ["A1:H1", …] 합칠 칸
//   landscape true면 가로로 인쇄
//   titleRow  인쇄할 때 쪽마다 되풀이할 머리줄 번호
// 칸 모양(s): 0 기본 · 1 머리줄 · 2 큰 제목 · 3 회색 안내 · 4 글(밑줄, 줄바꿈) · 5 가운데 · 6 금액 · 7 굵은 글 · 8 굵은 금액(합계)
//             9 작은 제목 · 10 금액(밑줄 없음) · 11 굵은 가운데 · 12 개수(가운데, 쉼표) · 13 합계 줄 글 · 14 합계 줄 개수
(function(){
  const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8){ let c = 0xFFFFFFFF; for(let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  // 압축하지 않은(STORE) zip
  function zip(files){
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    for(const [name, text] of files){
      const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x5D70, true);   // 날짜 2026-11-16 (DOS 형식, 아무 날이어도 돼요)
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x5D70, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + data.length;
    }
    const size = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  const X = s => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const col = i => { let s = ""; i++; while(i){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';

  function cell(r, c, raw){
    const ref = col(c) + r;
    const o = raw !== null && typeof raw === "object" ? raw : { v: raw };
    const s = o.s || 0, v = o.v;
    if(o.f) return `<c r="${ref}" s="${s}"><f>${X(o.f)}</f>${typeof v === "number" && isFinite(v) ? `<v>${v}</v>` : ""}</c>`;
    if(v === "" || v == null) return s ? `<c r="${ref}" s="${s}"/>` : "";
    if(typeof v === "number" && isFinite(v)) return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  }
  function sheetXml(sh){
    const R = sh.rows.map((row, i) => {
      const cells = Array.isArray(row) ? row : row.cells, ht = Array.isArray(row) ? 0 : row.ht;
      return `<row r="${i + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cells.map((v, c) => cell(i + 1, c, v)).join("")}</row>`;
    });
    const fr = sh.freeze || 0;
    return HEAD + `<worksheet ${NS}>`
      + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
      + `<sheetViews><sheetView workbookViewId="0">${fr ? `<pane ySplit="${fr}" topLeftCell="A${fr + 1}" activePane="bottomLeft" state="frozen"/>` : ""}</sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="18"/>`
      + `<cols>${sh.widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
      + `<sheetData>${R.join("")}</sheetData>`
      + (sh.filter ? `<autoFilter ref="${sh.filter}"/>` : "")
      + (sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "")
      + `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>`
      + `<pageSetup paperSize="9" orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`
      + `</worksheet>`;
  }
  const FONT = '<name val="맑은 고딕"/><family val="2"/>';
  const AL = (h, v, wrap) => `<alignment${h ? ` horizontal="${h}"` : ""} vertical="${v || "center"}"${wrap ? ' wrapText="1"' : ""}/>`;
  const xf = (num, font, fill, border, align) => `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${num ? ' applyNumberFormat="1"' : ""}${font ? ' applyFont="1"' : ""}${fill ? ' applyFill="1"' : ""}${border ? ' applyBorder="1"' : ""} applyAlignment="1">${align}</xf>`;
  const STYLES = HEAD + `<styleSheet ${NS}>`
    // 글꼴: 0 기본 · 1 흰 굵은 글(머리줄) · 2 큰 제목 · 3 회색 작은 글 · 4 굵은 글 · 5 굵은 12
    + `<fonts count="6"><font><sz val="11"/>${FONT}</font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/>${FONT}</font><font><b/><sz val="15"/>${FONT}</font><font><sz val="10"/><color rgb="FF5C5C5C"/>${FONT}</font><font><b/><sz val="11"/>${FONT}</font><font><b/><sz val="12"/>${FONT}</font></fonts>`
    // 채우기: 2 검정(머리줄) · 3 옅은 회색(합계 줄)
    + `<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF161616"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F1F1"/><bgColor indexed="64"/></patternFill></fill></fills>`
    // 테두리: 1 아래 가는 줄 · 2 위 굵은 줄(합계)
    + `<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border><border><left/><right/><top style="medium"><color rgb="FF161616"/></top><bottom/><diagonal/></border></borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
    + `<cellXfs count="15">`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`      // 0
    + xf(0, 1, 2, 0, AL("center", "center", true))                         // 1 머리줄
    + xf(0, 2, 0, 0, AL("", "center"))                                     // 2 큰 제목
    + xf(0, 3, 0, 0, AL("", "top", true))                                  // 3 회색 안내
    + xf(0, 0, 0, 1, AL("", "center", true))                               // 4 글
    + xf(0, 0, 0, 1, AL("center", "center"))                               // 5 가운데
    + xf(3, 0, 0, 1, AL("right", "center"))                                // 6 금액
    + xf(0, 4, 0, 0, AL("", "center"))                                     // 7 굵은 글
    + xf(3, 4, 3, 2, AL("right", "center"))                                // 8 굵은 금액 (합계 줄)
    + xf(0, 5, 0, 0, AL("", "center"))                                     // 9 작은 제목
    + xf(3, 0, 0, 0, AL("right", "center"))                                // 10 금액 (밑줄 없음)
    + xf(0, 4, 0, 1, AL("center", "center"))                               // 11 굵은 가운데
    + xf(3, 0, 0, 1, AL("center", "center"))                               // 12 개수
    + xf(0, 4, 3, 2, AL("", "center"))                                     // 13 합계 줄 글
    + xf(3, 4, 3, 2, AL("center", "center"))                               // 14 합계 줄 개수
    + `</cellXfs>`
    + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`
    + `</styleSheet>`;

  window.xlsxBook = function(sheets){
    const q = n => `'${String(n).replace(/'/g, "''")}'`;
    const names = sheets.map(sh => sh.name.replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31));
    const defined = sheets.map((sh, i) =>
      (sh.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${X(q(names[i]))}!${sh.filter.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2")}</definedName>` : "")
      + (sh.titleRow ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${X(q(names[i]))}!$${sh.titleRow}:$${sh.titleRow}</definedName>` : "")).join("");
    const files = [
      ["[Content_Types].xml", HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels", HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", HEAD + `<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${X(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ["xl/_rels/workbook.xml.rels", HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", STYLES],
      ...sheets.map((sh, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sh)])
    ];
    return zip(files);
  };
  window.xlsxCol = col;
})();
