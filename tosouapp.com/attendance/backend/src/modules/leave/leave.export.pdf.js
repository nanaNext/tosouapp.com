'use strict';
/**
 * leave.export.pdf.js
 * 休暇申請一覧の月次PDFエクスポート (Playwright HTML→PDF)
 * GET /api/leave/export.pdf?month=YYYY-MM&status=pending|approved|rejected
 */
const { fetchLeaveExportRows, daysBetween, TYPE_MAP, STATUS_MAP } = require('./leave.export.controller');

const escH = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const statusStyle = s => {
  if (s === 'approved') return 'color:#16a34a;font-weight:600;';
  if (s === 'rejected') return 'color:#dc2626;font-weight:600;';
  return 'color:#d97706;font-weight:600;';
};

async function exportLeavePdf(req, res) {
  try {
    const { rows, month, status } = await fetchLeaveExportRows(req);
    const nowStr = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const statusLabel = STATUS_MAP[status] || 'すべて';

    const rowsHtml = rows.map((r, i) => {
      const start = String(r.startDate || '').slice(0, 10);
      const end   = String(r.endDate   || '').slice(0, 10);
      const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      const reason = escH(r.reason || '');
      const company = [r.tenant_name, r.branch_name].filter(Boolean).map(escH).join(' / ');
      return `<tr style="background:${bg};">
        <td class="center mono">${escH(start)}</td>
        <td class="center mono">${escH(end)}</td>
        <td class="center">${daysBetween(start, end)}</td>
        <td>${escH(r.username || r.email || '')}${r.employee_code ? `<div style="font-size:6.5pt;color:#94a3b8;">${escH(r.employee_code)}</div>` : ''}</td>
        <td style="font-size:6.5pt;color:#64748b;">${company}</td>
        <td class="center">${escH(TYPE_MAP[String(r.type || '').toLowerCase()] || r.type || '')}</td>
        <td>${reason}</td>
        <td class="center" style="${statusStyle(String(r.status || '').toLowerCase())}">${escH(STATUS_MAP[String(r.status || '').toLowerCase()] || r.status || '')}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  @font-face { font-family:'JP'; src:local('Meiryo'),local('Yu Gothic'),url('file:///C:/Windows/Fonts/NotoSansJP-VF.ttf') format('truetype'); }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'JP','Meiryo','Yu Gothic','MS Gothic',sans-serif;font-size:8pt;color:#1e293b;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page-wrap{padding:10mm 8mm 8mm 8mm;}
  .report-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:5px;padding-bottom:4px;border-bottom:2px solid #1e4d8c;}
  .report-title{font-size:12pt;font-weight:700;color:#1e293b;}
  .report-meta{font-size:7.5pt;color:#64748b;text-align:right;}
  table{width:100%;border-collapse:collapse;font-size:7.5pt;table-layout:fixed;}
  col.c-start{width:52px;}col.c-end{width:52px;}col.c-days{width:32px;}col.c-name{width:80px;}
  col.c-company{width:80px;}col.c-type{width:56px;}col.c-reason{width:auto;}col.c-status{width:56px;}
  thead th{background:#1e4d8c;color:#fff;font-weight:600;font-size:7pt;padding:5px 3px;text-align:center;border:1px solid #2563ab;white-space:nowrap;}
  tbody td{padding:4px 3px;border-bottom:1px solid #e2e8f0;border-left:1px solid #f1f5f9;vertical-align:top;line-height:1.4;word-break:break-word;}
  .center{text-align:center;vertical-align:middle;}
  .mono{font-family:monospace;}
  .empty-msg{text-align:center;padding:20px;color:#94a3b8;font-size:10pt;}
  @page{size:A4 landscape;margin:0;}
  @media print{.page-wrap{padding:8mm 7mm 6mm 7mm;}thead{display:table-header-group;}tbody tr{page-break-inside:avoid;}}
</style>
</head>
<body>
<div class="page-wrap">
  <div class="report-header">
    <div class="report-title">休暇申請一覧 ${escH(month || '全期間')}（${escH(statusLabel)}）</div>
    <div class="report-meta">${rows.length}件　出力日時: ${escH(nowStr)}</div>
  </div>
  <table>
    <colgroup><col class="c-start"><col class="c-end"><col class="c-days"><col class="c-name"><col class="c-company"><col class="c-type"><col class="c-reason"><col class="c-status"></colgroup>
    <thead><tr><th>開始日</th><th>終了日</th><th>日数</th><th>氏名</th><th>会社/支店</th><th>種別</th><th>理由</th><th>状態</th></tr></thead>
    <tbody>${rows.length ? rowsHtml : '<tr><td colspan="8" class="empty-msg">データなし</td></tr>'}</tbody>
  </table>
</div>
</body>
</html>`;

    const { chromium } = require('playwright');
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(300);
    const pdfBuf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    await browser.close();

    const label = month || 'all';
    const fname = encodeURIComponent(`休暇申請一覧_${label}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"; filename*=UTF-8''${fname}`);
    res.send(pdfBuf);
  } catch (err) {
    console.error('[leave export.pdf] error:', err);
    if (!res.headersSent) res.status(500).json({ message: err.message || 'export failed' });
  }
}

module.exports = { exportLeavePdf };
