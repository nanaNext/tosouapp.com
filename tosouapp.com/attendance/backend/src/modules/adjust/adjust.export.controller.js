'use strict';
/**
 * adjust.export.controller.js
 * Xuất danh sách điều chỉnh giờ (調整申請) ra Excel hoặc PDF.
 * GET /api/adjust/admin/export?month=YYYY-MM&format=xlsx|pdf
 */
const repo = require('./adjust.repository');

/* ─── helpers ──────────────────────────────────────────────── */
function fmtDatetime(val) {
  if (!val) return '—';
  return String(val).slice(0, 16).replace('T', ' ');
}

function fmtStatus(status) {
  const map = { pending: '確認待ち', approved: '承認済み', rejected: '却下' };
  return map[status] || status || '—';
}

function safeStr(val) {
  return val != null ? String(val) : '';
}

/* ─── EXCEL ─────────────────────────────────────────────────── */
async function buildExcel(rows, month) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'スマートE勤怠';
  wb.created = new Date();
  const ws = wb.addWorksheet(`調整申請_${month}`);

  // --- 列定義 ---
  ws.columns = [
    { header: 'No',         key: 'no',         width: 6  },
    { header: 'ユーザー',  key: 'username',   width: 18 },
    { header: '作成日時',  key: 'created_at', width: 20 },
    { header: '修正(出勤)', key: 'checkIn',    width: 20 },
    { header: '修正(退勤)', key: 'checkOut',   width: 20 },
    { header: '理由 / 差戻し内容', key: 'reason', width: 40 },
    { header: '状態',       key: 'status',     width: 12 },
  ];

  // --- ヘッダースタイル ---
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e4d8c' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  ws.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  ws.getRow(1).height = 22;

  // --- データ行 ---
  const statusColors = {
    approved: 'FFd1fae5',
    rejected: 'FFffe4e6',
    pending:  'FFfff7ed',
  };

  rows.forEach((r, idx) => {
    const reason = [safeStr(r.reason), r.admin_note ? `【差戻し】${safeStr(r.admin_note)}` : '']
      .filter(Boolean).join('\n');

    const row = ws.addRow({
      no:         idx + 1,
      username:   safeStr(r.username || r.email || r.userId),
      created_at: fmtDatetime(r.created_at),
      checkIn:    fmtDatetime(r.requestedCheckIn),
      checkOut:   fmtDatetime(r.requestedCheckOut),
      reason,
      status:     fmtStatus(r.status),
    });

    const bgColor = statusColors[r.status] || 'FFFFFFFF';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top:    { style: 'hair' },
        bottom: { style: 'hair' },
        left:   { style: 'thin' },
        right:  { style: 'thin' },
      };
    });
    row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = reason.includes('\n') ? 32 : 18;
  });

  // --- 空の場合のメッセージ ---
  if (rows.length === 0) {
    const row = ws.addRow({ no: '', username: 'データなし', created_at: '', checkIn: '', checkOut: '', reason: '', status: '' });
    row.getCell('username').font = { italic: true, color: { argb: 'FF64748b' } };
  }

  // --- フリーズ・フィルタ ---
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'G1' };

  return wb;
}

/* ─── PDF ────────────────────────────────────────────────────── */
async function buildPdf(rows, month, res) {
  const PDFDocument = require('pdfkit');
  const path = require('path');
  const fs   = require('fs');

  // ── フォント ──────────────────────────────────────────────────
  const fontCandidates = [
    path.join(__dirname, '../../static/fonts/NotoSansJP-Regular.ttf'),
    path.join(__dirname, '../../static/fonts/ipaexg.ttf'),
    'C:\\Windows\\Fonts\\NotoSansJP-VF.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  ];
  let fontPath = null;
  for (const fp of fontCandidates) {
    if (fs.existsSync(fp)) { fontPath = fp; break; }
  }

  // ── レイアウト定数 ────────────────────────────────────────────
  const PAGE_W  = 841.89; // A4 横
  const PAGE_H  = 595.28;
  const ML      = 36;     // margin left/right
  const MT      = 36;     // margin top
  const MB      = 32;     // margin bottom
  const USABLE  = PAGE_W - ML * 2; // 769.89

  // 列定義: 合計が USABLE にぴったり合うよう比率で配分
  // 基準比率: No=24, User=100, CheckIn=108, CheckOut=108, Created=108, Reason=*, Status=76
  // Reason = USABLE - (24+100+108+108+108+76) = 769.89 - 524 = 245.89
  const REASON_W = Math.floor(USABLE - (24 + 100 + 108 + 108 + 108 + 76));
  const COLS = [
    { label: 'No',        w: 24,       align: 'center' },
    { label: 'ユーザー',  w: 100,      align: 'left'   },
    { label: '修正(出勤)',w: 108,      align: 'center' },
    { label: '修正(退勤)',w: 108,      align: 'center' },
    { label: '作成日時',  w: 108,      align: 'center' },
    { label: '理由',      w: REASON_W, align: 'left'   },
    { label: '状態',      w: 76,       align: 'center' },
  ];

  const ROW_H    = 24;
  const HDR_H    = 26;

  // ── カラーパレット ────────────────────────────────────────────
  const C = {
    headerBg:   '#1e3a5f',
    headerText: '#ffffff',
    accentLine: '#3b82f6',
    colHdrBg:   '#1e4d8c',
    colHdrText: '#ffffff',
    rowOdd:     '#f8fafc',
    rowEven:    '#ffffff',
    rowBorder:  '#e2e8f0',
    cellText:   '#1e293b',
    cellMuted:  '#64748b',
    footerText: '#94a3b8',
    // status
    pendingBg:  '#fff7ed', pendingText:  '#c2410c',
    approvedBg: '#f0fdf4', approvedText: '#15803d',
    rejectedBg: '#fef2f2', rejectedText: '#dc2626',
  };

  // ── status スタイル ───────────────────────────────────────────
  function statusStyle(status) {
    if (status === 'approved') return { bg: C.approvedBg, text: C.approvedText };
    if (status === 'rejected') return { bg: C.rejectedBg, text: C.rejectedText };
    return { bg: C.pendingBg, text: C.pendingText };
  }

  // ── ドキュメント生成 ──────────────────────────────────────────
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: MT, bottom: MB, left: ML, right: ML },
    bufferPages: true,
    autoFirstPage: false,
    info: { Title: `調整申請一覧 ${month}`, Author: 'スマートE勤怠' },
  });

  if (fontPath) {
    doc.registerFont('JP',     fontPath);
    doc.registerFont('JP-Bold', fontPath); // same font, used as "bold"
    doc.font('JP');
  }

  doc.pipe(res);

  let curY = MT;
  const tableLeft = ML;
  const totalW    = COLS.reduce((s, c) => s + c.w, 0);

  // ── ページヘッダー描画 ────────────────────────────────────────
  function drawPageHeader(isFirst) {
    if (isFirst) {
      // タイトル行: 左にタイトル、右に月
      doc.fillColor('#1e293b').fontSize(11).font('JP-Bold')
         .text('調整申請一覧', ML, curY, { lineBreak: false });
      doc.fillColor('#64748b').fontSize(9).font('JP')
         .text(month, ML, curY + 1, { width: USABLE, align: 'right', lineBreak: false });
      // アクセントライン
      doc.fillColor(C.accentLine).rect(ML, curY + 16, USABLE, 2).fill();
      curY += 26;
    } else {
      // 続きページ: さらにコンパクト
      doc.fillColor('#64748b').fontSize(8).font('JP')
         .text(`調整申請一覧 ${month}`, ML, curY, { lineBreak: false });
      doc.strokeColor('#e2e8f0').lineWidth(0.5)
         .moveTo(ML, curY + 12).lineTo(ML + USABLE, curY + 12).stroke();
      curY += 18;
    }
  }

  // ── 列ヘッダー描画 ────────────────────────────────────────────
  function drawColHeader() {
    doc.fillColor(C.colHdrBg).rect(tableLeft, curY, totalW, HDR_H).fill();
    doc.fillColor(C.colHdrText).fontSize(8.5).font('JP-Bold');
    let x = tableLeft;
    COLS.forEach((col, i) => {
      // 列テキスト
      doc.text(col.label, x + 4, curY + (HDR_H - 8.5) / 2, {
        width: col.w - 8, align: col.align, lineBreak: false,
      });
      // 列区切り線 (白、最初と最後を除く)
      if (i > 0) {
        doc.save();
        doc.strokeColor('#ffffff').lineWidth(0.5).opacity(0.35)
           .moveTo(x, curY + 4).lineTo(x, curY + HDR_H - 4).stroke();
        doc.restore();
      }
      x += col.w;
    });
    curY += HDR_H;
  }

  // ── データ行描画 ──────────────────────────────────────────────
  function drawDataRow(r, idx) {
    const reason = [
      safeStr(r.reason),
      r.admin_note ? `[差戻し] ${safeStr(r.admin_note)}` : '',
    ].filter(Boolean).join(' / ');

    const cells = [
      String(idx + 1),
      safeStr(r.username || r.email || r.userId),
      fmtDatetime(r.requestedCheckIn),
      fmtDatetime(r.requestedCheckOut),
      fmtDatetime(r.created_at),
      reason,
      fmtStatus(r.status),
    ];

    // 行背景
    const rowBg = idx % 2 === 0 ? C.rowOdd : C.rowEven;
    doc.fillColor(rowBg).rect(tableLeft, curY, totalW, ROW_H).fill();

    // 行の下線
    doc.strokeColor(C.rowBorder).lineWidth(0.5)
       .moveTo(tableLeft, curY + ROW_H)
       .lineTo(tableLeft + totalW, curY + ROW_H)
       .stroke();

    // セルテキスト
    doc.font('JP').fontSize(8);
    let x = tableLeft;
    cells.forEach((cell, i) => {
      const col = COLS[i];
      const padX = i === 0 ? 0 : 5;

      if (i === 6) {
        // 状態: バッジ風
        const st  = statusStyle(r.status);
        const bw  = 48; const bh = 14;
        const bx  = x + (col.w - bw) / 2;
        const by  = curY + (ROW_H - bh) / 2;
        doc.fillColor(st.bg).roundedRect(bx, by, bw, bh, 4).fill();
        doc.fillColor(st.text).fontSize(7.5)
           .text(cell, bx, by + 3, { width: bw, align: 'center', lineBreak: false });
      } else if (i === 2 || i === 3 || i === 4) {
        // 日時: 日付と時刻を2行で
        const parts = cell === '—' ? ['—', ''] : cell.split(' ');
        const dateStr = parts[0] || '';
        const timeStr = parts[1] || '';
        doc.fillColor(C.cellMuted).fontSize(7)
           .text(dateStr, x + padX, curY + 4, { width: col.w - padX * 2, align: 'center', lineBreak: false });
        if (timeStr) {
          doc.fillColor('#0369a1').fontSize(8.5).font('JP-Bold')
             .text(timeStr, x + padX, curY + 13, { width: col.w - padX * 2, align: 'center', lineBreak: false });
          doc.font('JP');
        }
      } else {
        // 通常セル
        const textColor = i === 0 ? C.cellMuted : C.cellText;
        doc.fillColor(textColor).fontSize(i === 0 ? 7.5 : 8)
           .text(cell, x + padX, curY + (ROW_H - 8) / 2, {
             width: col.w - padX * 2,
             align: col.align,
             lineBreak: false,
             ellipsis: true,
           });
      }
      x += col.w;
    });

    // 列縦線 (左端と右端のみ外枠)
    doc.strokeColor(C.rowBorder).lineWidth(0.3);
    let lx = tableLeft;
    COLS.forEach(col => {
      doc.moveTo(lx, curY).lineTo(lx, curY + ROW_H).stroke();
      lx += col.w;
    });
    doc.moveTo(lx, curY).lineTo(lx, curY + ROW_H).stroke();

    curY += ROW_H;
  }

  // ── フッター描画 ──────────────────────────────────────────────
  function drawFooters(totalPages) {
    const range = doc.bufferedPageRange();
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const fy = PAGE_H - MB + 6;

      // 区切り線
      doc.save();
      doc.strokeColor('#e2e8f0').lineWidth(0.5)
         .moveTo(ML, fy - 2).lineTo(ML + totalW, fy - 2).stroke();

      // pdfkit の自動改ページを回避するため、底辺を一時的に伸ばす
      const origBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      // 左: 出力日時
      doc.fillColor(C.footerText).fontSize(7).font('JP')
         .text(`出力日時: ${now}`, ML, fy, {
           width: Math.floor(totalW * 0.6),
           align: 'left',
           lineBreak: false,
         });

      // 右: ページ番号
      doc.fillColor(C.footerText).fontSize(7).font('JP')
         .text(`${i + 1} / ${totalPages}ページ`, ML, fy, {
           width: totalW,
           align: 'right',
           lineBreak: false,
         });

      doc.page.margins.bottom = origBottom;
      doc.restore();
    }
  }

  // ── レンダリング開始 ──────────────────────────────────────────
  const bottomLimit = PAGE_H - MB - 20;

  // autoFirstPage: false のため最初のページを手動で追加
  doc.addPage();
  curY = MT;
  drawPageHeader(true);
  drawColHeader();

  rows.forEach((r, idx) => {
    if (curY + ROW_H > bottomLimit) {
      doc.addPage();
      curY = MT;
      drawPageHeader(false);
      drawColHeader();
    }
    drawDataRow(r, idx);
  });

  if (rows.length === 0) {
    doc.fillColor(C.cellMuted).fontSize(10).font('JP')
       .text('該当するデータがありません。', tableLeft, curY + 16, {
         width: totalW, align: 'center', lineBreak: false,
       });
  }

  // サマリー行
  if (rows.length > 0) {
    const summaryY = curY + 10;
    if (summaryY + 16 < bottomLimit) {
      const pending  = rows.filter(r => r.status === 'pending').length;
      const approved = rows.filter(r => r.status === 'approved').length;
      const rejected = rows.filter(r => r.status === 'rejected').length;
      doc.fillColor(C.cellMuted).fontSize(7.5).font('JP')
         .text(
           `合計 ${rows.length} 件　|　確認待ち: ${pending}　承認済み: ${approved}　却下: ${rejected}`,
           ML, summaryY, { width: totalW, align: 'right', lineBreak: false },
         );
    }
  }

  drawFooters(doc.bufferedPageRange().count);
  doc.end();
}

/* ─── CONTROLLER ─────────────────────────────────────────────── */
exports.exportAdjust = async (req, res) => {
  try {
    const month  = String(req.query.month || '').trim();   // YYYY-MM
    const format = String(req.query.format || 'xlsx').toLowerCase();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month パラメータが必要です (YYYY-MM)' });
    }
    if (!['xlsx', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'format は xlsx または pdf を指定してください' });
    }

    const tid  = req.tenantId ?? null;
    const role = String(req.user?.role || '').toLowerCase();

    // 全件取得してからフィルタ（既存ロジックと整合）
    let allRows;
    if (role === 'manager') {
      allRows = await repo.listForManager(tid);
    } else {
      allRows = await repo.listAll(tid);
    }

    const rows = allRows.filter(r => {
      const m = r.created_at ? String(r.created_at).slice(0, 7) : '';
      return m === month;
    });

    const filename = `調整申請_${month}.${format}`;
    const encoded  = encodeURIComponent(filename);

    if (format === 'xlsx') {
      const wb = await buildExcel(rows, month);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`);
      await wb.xlsx.write(res);
      res.end();
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`);
      await buildPdf(rows, month, res);
    }
  } catch (err) {
    console.error('[adjust.export] error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message || 'export failed' });
    }
  }
};
