const ExcelJS = require('exceljs');

function safeSheetName(s, fallback = 'Sheet') {
  const name = String(s || '').replace(/[\[\]\*\/\\\:\?]/g, '').trim();
  return (name || fallback).slice(0, 31);
}

function applyStyle(cell, styleKey) {
  // Common styles
  const fontNormal = { name: 'Meiryo', size: 11, color: { argb: 'FF000000' } };
  const fontBoldWhite = { name: 'Meiryo', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const fontGreen = { name: 'Meiryo', size: 11, color: { argb: 'FF00B050' } };
  const fontRed = { name: 'Meiryo', size: 11, color: { argb: 'FFFF0000' } };
  const fontBlue = { name: 'Meiryo', size: 11, color: { argb: 'FF0070C0' } };

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFD4D4D4' } },
    left: { style: 'thin', color: { argb: 'FFD4D4D4' } },
    bottom: { style: 'thin', color: { argb: 'FFD4D4D4' } },
    right: { style: 'thin', color: { argb: 'FFD4D4D4' } }
  };

  const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };
  const alignRight = { vertical: 'middle', horizontal: 'right', wrapText: true };

  // Set defaults
  cell.font = fontNormal;
  cell.border = borderThin;
  cell.alignment = alignCenter;

  switch (styleKey) {
    case 'header': // 1
      cell.font = fontBoldWhite;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3553' } };
      break;
    case 'off': // 2
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      break;
    case 'stripe': // 3
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      break;
    case 'checkOn': // 4
      cell.font = fontBoldWhite;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      break;
    case 'headerGrey': // 5
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.alignment = alignRight;
      break;
    case 'absentText': // 6
      cell.font = fontBlue;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      break;
    case 'weekend': // 7
      cell.font = fontRed;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } };
      break;
    case 'late': // 8
      cell.font = fontRed;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } };
      break;
    case 'present': // 9
      cell.font = fontGreen;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3553' } }; // mapping is weird in original, using same fill as 2 (which was rgb FF1F3553 in font? wait, let's use a default)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      break;
    case 'center': // 10
      // default is center
      break;
    case 'legend': // 11
      cell.alignment = alignLeft;
      break;
    case 'paidLeave': // 12
      cell.border = {}; // no border
      break;
    case 'legendHeader': // 13
      cell.font = fontNormal;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      break;
    case 'empty': // 14
      cell.border = {};
      break;
    case 'cell': // 0
    default:
      // default cell
      break;
  }
}

async function buildXlsxBook({ sheets }) {
  const workbook = new ExcelJS.Workbook();
  const rawSheets = Array.isArray(sheets) ? sheets : [];
  
  if (rawSheets.length === 0) {
    workbook.addWorksheet('Sheet1');
  }

  rawSheets.forEach((s, i) => {
    const sheetName = safeSheetName(s?.name, `Sheet${i + 1}`);
    const ws = workbook.addWorksheet(sheetName);

    // Setup columns
    const columns = Array.isArray(s?.columns) ? s.columns : [];
    ws.columns = columns.map(c => ({
      header: c?.header || '',
      width: Number(c?.width || 12)
    }));

    // Header row styling
    const headerRow = ws.getRow(1);
    const headerStyleKey = String(s?.headerStyleKey || 'header').trim() || 'header';
    
    columns.forEach((c, ci) => {
      const cell = headerRow.getCell(ci + 1);
      let sk = headerStyleKey;
      if (c?.headerStyle) sk = c.headerStyle;
      if (c?.header === '' && ci === 7) sk = 'empty';
      applyStyle(cell, sk);
    });

    // Setup rows
    const rows = Array.isArray(s?.rows) ? s.rows : [];
    rows.forEach((r, ri) => {
      const rowNum = ri + 2;
      const wsRow = ws.getRow(rowNum);
      const isOff = !!r?.isOff;
      const defaultStyle = isOff ? 'off' : (ri % 2 === 1 ? 'stripe' : 'cell');
      
      const cells = Array.isArray(r?.cells) ? r.cells : [];
      cells.forEach((raw, ci) => {
        const cell = wsRow.getCell(ci + 1);
        let v = raw;
        let styleKey = '';
        let isFormula = false;
        
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          if (Object.prototype.hasOwnProperty.call(raw, 'v') || Object.prototype.hasOwnProperty.call(raw, 'value')) {
            v = Object.prototype.hasOwnProperty.call(raw, 'v') ? raw.v : raw.value;
            styleKey = String(raw.s || raw.style || '');
            isFormula = !!raw.f;
          }
        }
        
        if (isFormula) {
          cell.value = { formula: String(v) };
        } else {
          cell.value = v;
        }

        const sk = styleKey || defaultStyle;
        applyStyle(cell, sk);
      });
    });

    // Auto filter if sheet name includes 詳細
    if (sheetName.includes('詳細')) {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: rows.length + 1, column: columns.length || 1 }
      };
    }
  });

  return await workbook.xlsx.writeBuffer();
}

async function buildXlsx({ sheetName, columns, rows }) {
  return buildXlsxBook({ sheets: [{ name: sheetName, columns, rows }] });
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function zipStore(files) {
  const entries = [];
  let offset = 0;
  const chunks = [];
  for (const f of files) {
    const nameBuf = Buffer.from(String(f.name), 'utf8');
    const dataBuf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data ?? ''), 'utf8');
    const crc = crc32(dataBuf);
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBuf.length), u32(dataBuf.length), u16(nameBuf.length), u16(0), nameBuf
    ]);
    chunks.push(localHeader, dataBuf);
    const localOffset = offset;
    offset += localHeader.length + dataBuf.length;
    entries.push({ nameBuf, crc, size: dataBuf.length, offset: localOffset });
  }

  const centralStart = offset;
  const centralChunks = [];
  for (const e of entries) {
    const cdir = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(e.crc), u32(e.size), u32(e.size), u16(e.nameBuf.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(e.offset), e.nameBuf
    ]);
    centralChunks.push(cdir);
    offset += cdir.length;
  }

  const centralSize = offset - centralStart;
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralSize), u32(centralStart), u16(0)
  ]);
  return Buffer.concat([...chunks, ...centralChunks, eocd]);
}

function buildXlsxArchive(files) {
  return zipStore(Array.isArray(files) ? files : []);
}

module.exports = { buildXlsx, buildXlsxBook, buildXlsxArchive };
