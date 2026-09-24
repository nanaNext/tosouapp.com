const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const db = require('../../core/database/mysql');

const isYM = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
const monthJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
const monthRange = (month) => {
  const [y, m] = String(month).split('-').map(n => parseInt(n, 10));
  const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end };
};
const fmtHm = (dt) => dt ? String(dt).slice(11, 16) : '--:--';

const LEAVE_TYPE_LABEL = { paid: '有給休暇', unpaid: '無給休暇', sick: '欠勤', absence: '欠勤' };

// 種別/部署/社員/ステータス/検索 でフィルタしつつ leave_requests + time_adjust_requests を
// 1本のリストに正規化してまとめる。承認/却下は各元APIにそのまま流す(このモジュールでは変更しない)。
async function fetchMerged({ tenantId, month, dept, userId, status, q }) {
  const { start, end } = monthRange(month);

  // attendance.utils.js の syncPaidLeaveByKubun / leave.repository.js の
  // reconcileApprovedPaidWithAttendance が「勤怠画面で有給休暇のkubunを付けた/外した」
  // 副作用として自動生成する行 (reason に from_attendance / [AUTO_CANCEL] / [AUTO_RECONCILE]
  // が入る) は、本人が事前に申請したものではないため、申請・承認一覧には出さない。
  const leaveWhere = [
    'lr.startDate <= ? AND lr.endDate >= ?',
    "COALESCE(lr.reason, '') NOT LIKE '%from_attendance%'",
    "COALESCE(lr.reason, '') NOT LIKE '%[AUTO_CANCEL]%'",
    "COALESCE(lr.reason, '') NOT LIKE '%[AUTO_RECONCILE]%'"
  ];
  const leaveParams = [end, start];
  if (tenantId) { leaveWhere.push('u.tenant_id = ?'); leaveParams.push(tenantId); }
  if (dept) { leaveWhere.push('d.name = ?'); leaveParams.push(dept); }
  if (userId) { leaveWhere.push('lr.userId = ?'); leaveParams.push(userId); }
  if (status) { leaveWhere.push('lr.status = ?'); leaveParams.push(status); }
  if (q) { leaveWhere.push('(u.employee_code LIKE ? OR u.username LIKE ?)'); leaveParams.push(`%${q}%`, `%${q}%`); }
  const [leaveRows] = await db.query(`
    SELECT lr.id, lr.userId, lr.startDate, lr.endDate, lr.type, lr.reason, lr.status,
           lr.processed_by, lr.processed_at,
           u.employee_code AS employeeCode, u.username AS username, u.departmentId, d.name AS departmentName,
           pu.username AS processedByName
    FROM leave_requests lr
    JOIN users u ON u.id = lr.userId
    LEFT JOIN departments d ON d.id = u.departmentId
    LEFT JOIN users pu ON pu.id = lr.processed_by
    WHERE ${leaveWhere.join(' AND ')}
  `, leaveParams);

  const adjWhere = ['DATE(COALESCE(tar.requestedCheckIn, tar.requestedCheckOut, tar.created_at)) BETWEEN ? AND ?'];
  const adjParams = [start, end];
  if (tenantId) { adjWhere.push('u.tenant_id = ?'); adjParams.push(tenantId); }
  if (dept) { adjWhere.push('d.name = ?'); adjParams.push(dept); }
  if (userId) { adjWhere.push('tar.userId = ?'); adjParams.push(userId); }
  if (status) { adjWhere.push('tar.status = ?'); adjParams.push(status); }
  if (q) { adjWhere.push('(u.employee_code LIKE ? OR u.username LIKE ?)'); adjParams.push(`%${q}%`, `%${q}%`); }
  const [adjRows] = await db.query(`
    SELECT tar.id, tar.userId, tar.requestedCheckIn, tar.requestedCheckOut, tar.reason, tar.status, tar.created_at,
           tar.processed_by, tar.processed_at,
           u.employee_code AS employeeCode, u.username AS username, u.departmentId, d.name AS departmentName,
           pu.username AS processedByName
    FROM time_adjust_requests tar
    JOIN users u ON u.id = tar.userId
    LEFT JOIN departments d ON d.id = u.departmentId
    LEFT JOIN users pu ON pu.id = tar.processed_by
    WHERE ${adjWhere.join(' AND ')}
  `, adjParams);

  const normLeave = (leaveRows || []).map(r => {
    const sameDay = String(r.startDate).slice(0, 10) === String(r.endDate).slice(0, 10);
    return {
      type: 'leave',
      typeLabel: '有給申請',
      requestId: r.id,
      userId: r.userId,
      applicantName: r.username || '',
      employeeCode: r.employeeCode || null,
      departmentName: r.departmentName || null,
      targetDate: sameDay ? String(r.startDate).slice(0, 10) : `${String(r.startDate).slice(0, 10)}〜${String(r.endDate).slice(0, 10)}`,
      content: `${LEAVE_TYPE_LABEL[r.type] || '休暇'}${sameDay ? '（全日）' : ''}`,
      reason: r.reason || '',
      status: r.status,
      processedByName: r.processedByName || null,
      processedAt: r.processed_at || null,
      sortDate: String(r.startDate).slice(0, 10)
    };
  });

  const normAdj = (adjRows || []).map(r => {
    const d = String(r.requestedCheckIn || r.requestedCheckOut || r.created_at || '').slice(0, 10);
    return {
      type: 'adjust',
      typeLabel: '打刻修正',
      requestId: r.id,
      userId: r.userId,
      applicantName: r.username || '',
      employeeCode: r.employeeCode || null,
      departmentName: r.departmentName || null,
      targetDate: d,
      content: `出勤 ${fmtHm(r.requestedCheckIn)} / 退勤 ${fmtHm(r.requestedCheckOut)}`,
      reason: r.reason || '',
      status: r.status,
      processedByName: r.processedByName || null,
      processedAt: r.processed_at || null,
      sortDate: d
    };
  });

  return [...normLeave, ...normAdj].sort((a, b) => {
    if (a.sortDate !== b.sortDate) return a.sortDate < b.sortDate ? 1 : -1;
    return b.requestId - a.requestId;
  });
}

router.use(authenticate);
router.use(resolveTenant);

router.get('/list', authorize('admin', 'manager'), async (req, res) => {
  try {
    const month = isYM(req.query?.month) ? String(req.query.month) : monthJST();
    const dept = req.query?.dept ? String(req.query.dept) : '';
    const status = ['pending', 'approved', 'rejected'].includes(String(req.query?.status || '')) ? String(req.query.status) : '';
    const q = req.query?.q ? String(req.query.q) : '';
    const userId = req.query?.userId ? parseInt(String(req.query.userId), 10) : null;
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query?.pageSize, 10) || 50));

    const allRows = await fetchMerged({ tenantId: req.tenantId, month, dept, userId, q, status: '' });
    const summary = {
      pending: allRows.filter(r => r.status === 'pending').length,
      approved: allRows.filter(r => r.status === 'approved').length,
      rejected: allRows.filter(r => r.status === 'rejected').length
    };
    const filtered = status ? allRows.filter(r => r.status === status) : allRows;
    const total = filtered.length;
    const offset = (page - 1) * pageSize;
    const items = filtered.slice(offset, offset + pageSize);

    res.status(200).json({ month, items, total, page, pageSize, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/export.csv', authorize('admin', 'manager'), async (req, res) => {
  try {
    const month = isYM(req.query?.month) ? String(req.query.month) : monthJST();
    const dept = req.query?.dept ? String(req.query.dept) : '';
    const status = ['pending', 'approved', 'rejected'].includes(String(req.query?.status || '')) ? String(req.query.status) : '';
    const q = req.query?.q ? String(req.query.q) : '';
    const rows = await fetchMerged({ tenantId: req.tenantId, month, dept, q, status });

    const csvEsc = (v) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const statusLabel = (s) => s === 'approved' ? '承認' : s === 'rejected' ? '却下' : '申請中';
    const header = '種別,申請者,社員番号,対象日,内容,理由,ステータス,処理者,処理日時\n';
    let csv = header;
    for (const r of rows) {
      csv += [
        csvEsc(r.typeLabel),
        csvEsc(r.applicantName),
        csvEsc(r.employeeCode || ''),
        csvEsc(r.targetDate),
        csvEsc(r.content),
        csvEsc(r.reason),
        csvEsc(statusLabel(r.status)),
        csvEsc(r.processedByName || ''),
        csvEsc(r.processedAt ? String(r.processedAt).slice(0, 16) : '')
      ].join(',') + '\n';
    }
    const filename = `requests_${month}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.fetchMerged = fetchMerged;
