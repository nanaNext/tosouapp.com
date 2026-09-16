'use strict';
/**
 * leave.export.controller.js
 * Xuất danh sách xin nghỉ (休暇申請) ra Excel.
 * GET /api/leave/export.xlsx?month=YYYY-MM&status=pending|approved|rejected
 */
const db = require('../../core/database/mysql');
const s3Service = require('../../core/services/s3.service');

const TYPE_MAP = {
  paid: '有給休暇', sick: '病気休暇', special: '特別休暇',
  absence: '欠勤', unpaid: '無給休暇', other: 'その他',
};
const STATUS_MAP = { pending: '確認待ち', approved: '承認済み', rejected: '却下' };
const STATUS_COLORS = { approved: 'FFd1fae5', rejected: 'FFffe4e6', pending: 'FFfff7ed' };

function daysBetween(start, end) {
  try {
    const s = new Date(String(start).slice(0, 10));
    const e = new Date(String(end).slice(0, 10));
    return Math.max(1, Math.round((e - s) / 86400000) + 1);
  } catch { return 1; }
}

async function buildExcel(rows, month) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'スマートE勤怠';
  wb.created = new Date();
  const label = month || 'all';
  const ws = wb.addWorksheet(`休暇申請_${label}`);

  ws.columns = [
    { header: 'No',       key: 'no',         width: 6  },
    { header: '氏名',     key: 'username',   width: 16 },
    { header: '社員番号', key: 'emp_code',   width: 14 },
    { header: '種別',     key: 'type',       width: 14 },
    { header: '開始日',   key: 'startDate',  width: 13 },
    { header: '終了日',   key: 'endDate',    width: 13 },
    { header: '日数',     key: 'days',       width: 7  },
    { header: '理由',     key: 'reason',     width: 30 },
    { header: '状態',     key: 'status',     width: 12 },
    { header: '申請日時', key: 'created_at', width: 18 },
  ];

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

  (rows || []).forEach((r, idx) => {
    const start = String(r.startDate || '').slice(0, 10);
    const end   = String(r.endDate   || '').slice(0, 10);
    const row = ws.addRow({
      no:         idx + 1,
      username:   r.username || r.email || '—',
      emp_code:   r.employee_code || '—',
      type:       TYPE_MAP[String(r.type || '').toLowerCase()] || r.type || '—',
      startDate:  start,
      endDate:    end,
      days:       daysBetween(start, end),
      reason:     r.reason || '',
      status:     STATUS_MAP[String(r.status || '').toLowerCase()] || r.status || '—',
      created_at: String(r.created_at || '').slice(0, 16).replace('T', ' '),
    });

    const bgColor = STATUS_COLORS[String(r.status || '').toLowerCase()] || 'FFFFFFFF';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top:    { style: 'hair' }, bottom: { style: 'hair' },
        left:   { style: 'thin' }, right:  { style: 'thin' },
      };
    });
    row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('days').alignment   = { horizontal: 'center', vertical: 'middle' };
    row.height = 18;
  });

  if (!rows || rows.length === 0) {
    const row = ws.addRow({ no: '', username: 'データなし' });
    row.getCell('username').font = { italic: true, color: { argb: 'FF64748b' } };
  }

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'J1' };
  return wb;
}

async function exportLeaveXlsx(req, res) {
  try {
    const month    = String(req.query.month  || '').slice(0, 7);
    const status   = String(req.query.status || '').toLowerCase();
    const tenantId = req.tenantId || null;

    const conditions = [];
    const params = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      conditions.push(`DATE_FORMAT(lr.startDate, '%Y-%m') = ?`);
      params.push(month);
    }
    if (['pending', 'approved', 'rejected'].includes(status)) {
      conditions.push('lr.status = ?');
      params.push(status);
    }
    if (tenantId != null) {
      conditions.push('u.tenant_id = ?');
      params.push(parseInt(String(tenantId), 10));
    }
    // Không xuất phép của admin/manager để giữ nhất quán với admin list
    conditions.push(`u.role NOT IN ('admin', 'manager')`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(`
      SELECT lr.*, u.username, u.email, u.employee_code
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      ${where}
      ORDER BY lr.startDate DESC, lr.created_at DESC
      LIMIT 2000
    `, params);

    const wb = await buildExcel(rows || [], month);
    const label    = month || 'all';
    const filename = `leave_requests_${label}.xlsx`;
    const encoded  = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);

    const buf = await wb.xlsx.writeBuffer();

    // Auto-save to R2 (non-blocking)
    if (s3Service.isR2Configured()) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const r2Key = `exports/xlsx/leave/${ts}_${filename}`;
      s3Service.uploadToR2(r2Key, Buffer.from(buf), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .catch(e => console.error('R2 upload failed:', e));
    }

    res.status(200).end(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { exportLeaveXlsx };
