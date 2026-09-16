'use strict';
/**
 * GET /api/attendance/go-out/export.pdf?month=YYYY-MM
 * 外出管理の月次PDFエクスポート (Playwright HTML→PDF)
 */
const { authorize } = require('../../core/middleware/authMiddleware');
const { rateLimitNamed } = require('../../core/middleware/rateLimit');
const repo = require('./attendance.goout.controller');

const db = require('../../core/database/mysql');

const escH = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtHm = dt => {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getUTCHours() + 9).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

const calcDuration = (go, ret) => {
  if (!go || !ret || go === '—' || ret === '—') return '—';
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const a = toMin(go), b = toMin(ret);
  if (a == null || b == null) return '—';
  const diff = b >= a ? b - a : b + 1440 - a;
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}`;
};

const statusStyle = s => {
  if (s === '外出中') return 'color:#d97706;font-weight:600;';
  if (s === '完了') return 'color:#16a34a;font-weight:600;';
  if (s === '修正済み') return 'color:#0b2c66;font-weight:600;';
  return 'color:#475569;';
};
const typeStyle = t => t === '業務' ? 'color:#2563eb;font-weight:600;' : 'color:#dc2626;font-weight:600;';

async function exportGoOutPdf(req, res) {
  try {
    const qMonth = String(req.query.month || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
    const _tid = req.tenantId ? parseInt(String(req.tenantId), 10) : null;

    // データ取得
    const records = await (async () => {
      const tenantClause = _tid ? ' AND (g.tenant_id = ? OR g.tenant_id IS NULL)' : '';
      const params = [`${qMonth}-01`, `${qMonth}-31`, ...(_tid ? [_tid] : [])];
      const [rows] = await db.query(`
        SELECT g.id, g.userId, u.username AS employeeName, u.employee_code AS employeeCode,
               g.date, g.go_out_time, g.return_time, g.type, g.reason, g.status, g.admin_note
        FROM attendance_go_out g
        LEFT JOIN users u ON g.userId = u.id
        WHERE g.date >= ? AND g.date <= ?${tenantClause}
        ORDER BY g.date ASC, g.go_out_time ASC
      `, params);
      return rows;
    })();

    const nowStr = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    const rowsHtml = records.map((r, i) => {
      const go = fmtHm(r.go_out_time);
      const ret = fmtHm(r.return_time);
      const dur = calcDuration(go, ret);
      const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      const reason = escH(r.reason || '');
      const note = r.admin_note ? `<div style="font-size:6.5pt;color:#94a3b8;margin-top:2px;">(備考: ${escH(r.admin_note)})</div>` : '';
      return `<tr style="background:${bg};">
        <td class="center">${escH(String(r.date || '').slice(0, 10))}</td>
        <td>${escH(r.employeeName || '')}${r.employeeCode ? `<div style="font-size:6.5pt;color:#94a3b8;">${escH(r.employeeCode)}</div>` : ''}</td>
        <td class="center mono">${go}</td>
        <td class="center mono">${ret}</td>
        <td class="center mono">${dur}</td>
        <td class="center" style="${typeStyle(r.type)}">${escH(r.type || '')}</td>
        <td>${reason}${note}</td>
        <td class="center" style="${statusStyle(r.status)}">${escH(r.status || '')}</td>
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
  col.c-date{width:60px;}col.c-name{width:70px;}col.c-go{width:38px;}col.c-ret{width:38px;}
  col.c-dur{width:38px;}col.c-type{width:34px;}col.c-reason{width:auto;}col.c-status{width:44px;}
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
    <div class="report-title">外出管理 ${escH(qMonth)}</div>
    <div class="report-meta">${records.length}件　出力日時: ${escH(nowStr)}</div>
  </div>
  <table>
    <colgroup><col class="c-date"><col class="c-name"><col class="c-go"><col class="c-ret"><col class="c-dur"><col class="c-type"><col class="c-reason"><col class="c-status"></colgroup>
    <thead><tr><th>日付</th><th>社員名</th><th>外出</th><th>帰り</th><th>時間</th><th>区分</th><th>理由</th><th>状態</th></tr></thead>
    <tbody>${records.length ? rowsHtml : '<tr><td colspan="8" class="empty-msg">データなし</td></tr>'}</tbody>
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

    const fname = encodeURIComponent(`外出管理_${qMonth}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"; filename*=UTF-8''${fname}`);
    res.send(pdfBuf);
  } catch (err) {
    console.error('[goout export.pdf] error:', err);
    if (!res.headersSent) res.status(500).json({ message: err.message || 'export failed' });
  }
}

module.exports = { exportGoOutPdf };
