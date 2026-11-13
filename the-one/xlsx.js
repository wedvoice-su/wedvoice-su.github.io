// 엑셀(.xlsx) 파일 만들기 — 외부 라이브러리 없이 (압축하지 않은 zip + 엑셀 XML)
// 쓰는 법: xlsxBook([{ name, title, note, head, widths, styles, rows, check }]) → Blob
//   name 시트 이름 · title 1행 큰 글씨 · note 2행 안내(참고용 문구) · head 4행 머리줄 · widths 열 너비
//   styles 열마다 칸 모양(4 = 줄바꿈, 5 = 가운데) · rows 5행부터 · check true면 A열에 ✔ 고르기 + ✔인 줄은 회색 취소선
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
      h.setUint16(10, 0, true); h.setUint16(12, 0x5D6C, true);   // 날짜 2026-11-12 (DOS 형식, 아무 날이어도 돼요)
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x5D6C, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
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
  const MARK = "✔";

  function cell(r, c, v, s){
    const ref = col(c) + r;
    if(v === "" || v == null) return s ? `<c r="${ref}" s="${s}"/>` : "";
    if(typeof v === "number" && isFinite(v)) return `<c r="${ref}" s="${s || 0}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${s || 0}"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  }
  function lastRow(sh){ return Math.max(5, sh.rows.length + 4); }
  function sheetXml(sh){
    const n = sh.head.length, L = col(n - 1), last = lastRow(sh), R = [];
    R.push(`<row r="1" ht="26" customHeight="1">${cell(1, 0, sh.title, 2)}</row>`);
    R.push(`<row r="2" ht="${sh.note.length > 90 ? 48 : 34}" customHeight="1">${cell(2, 0, sh.note, 3)}</row>`);
    R.push(`<row r="4" ht="22" customHeight="1">${sh.head.map((h, c) => cell(4, c, h, 1)).join("")}</row>`);
    sh.rows.forEach((row, i) => R.push(`<row r="${i + 5}">${row.map((v, c) => cell(i + 5, c, v, (sh.styles && sh.styles[c]) || 4)).join("")}</row>`));
    const extraRows = sh.check ? 30 : 0;   // ✔ 고르기는 직접 더할 줄까지 넉넉히
    return HEAD + `<worksheet ${NS}>`
      + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
      + `<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="18"/>`
      + `<cols>${sh.widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
      + `<sheetData>${R.join("")}</sheetData>`
      + `<autoFilter ref="A4:${L}${last}"/>`
      + `<mergeCells count="2"><mergeCell ref="A1:${L}1"/><mergeCell ref="A2:${L}2"/></mergeCells>`
      + (sh.check ? `<conditionalFormatting sqref="A5:${L}${last + extraRows}"><cfRule type="expression" dxfId="0" priority="1"><formula>$A5="${MARK}"</formula></cfRule></conditionalFormatting>`
        + `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showInputMessage="1" promptTitle="챙겼으면" prompt="${MARK}를 고르세요" sqref="A5:A${last + extraRows}"><formula1>"${MARK}"</formula1></dataValidation></dataValidations>` : "")
      + `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>`
      + `<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>`
      + `</worksheet>`;
  }
  const FONT = '<name val="맑은 고딕"/><family val="2"/>';
  const STYLES = HEAD + `<styleSheet ${NS}>`
    + `<fonts count="4"><font><sz val="11"/>${FONT}</font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/>${FONT}</font><font><b/><sz val="15"/>${FONT}</font><font><sz val="10"/><color rgb="FF5C5C5C"/>${FONT}</font></fonts>`
    + `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF161616"/><bgColor indexed="64"/></patternFill></fill></fills>`
    + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
    + `<cellXfs count="6">`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
    + `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>`
    + `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>`
    + `</cellXfs>`
    + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`
    + `<dxfs count="1"><dxf><font><strike/><color rgb="FF9E9E9E"/></font></dxf></dxfs>`
    + `</styleSheet>`;

  window.xlsxBook = function(sheets){
    const q = n => `'${String(n).replace(/'/g, "''")}'`;
    const names = sheets.map(sh => sh.name.replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31));
    const defined = sheets.map((sh, i) => {
      const L = col(sh.head.length - 1), last = lastRow(sh);
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${X(q(names[i]))}!$A$4:$${L}$${last}</definedName>`
        + `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${X(q(names[i]))}!$4:$4</definedName>`;
    }).join("");
    const files = [
      ["[Content_Types].xml", HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels", HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", HEAD + `<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${X(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${defined}</definedNames></workbook>`],
      ["xl/_rels/workbook.xml.rels", HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", STYLES],
      ...sheets.map((sh, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(sh)])
    ];
    return zip(files);
  };
})();
