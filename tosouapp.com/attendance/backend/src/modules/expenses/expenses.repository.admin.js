'use strict';
/**
 * expenses.repository.admin.js
 * Admin dashboard, paged list, and monthly closure operations.
 * Split from expenses.repository.js for maintainability.
 */
const db = require('../../core/database/mysql');

function mapExpenseStatus(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return '';
  const m = {
    '申請中': 'applied',
    '承認済み': 'approved',
    '差戻し': 'rejected',
    '下書き': 'draft',
    '保留': 'pending'
  };
  return m[s] || s;
}

function buildAdminListWhere(filters = {}) {
  const where = ['1=1'];
  const args = [];
  const month = String(filters.month || '').slice(0, 7);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    where.push(`DATE_FORMAT(ec.date,'%Y-%m') = ?`);
    args.push(month);
  }
  const departmentId = String(filters.departmentId || '').trim();
  if (departmentId) {
    where.push(`u.departmentId = ?`);
    args.push(departmentId);
  }
  const employmentType = String(filters.employmentType || '').trim().toLowerCase();
  if (employmentType) {
    where.push(`LOWER(COALESCE(u.employment_type,'')) = ?`);
    args.push(employmentType);
  }
  const userId = String(filters.userId || '').trim();
  if (userId) {
    where.push(`ec.userId = ?`);
    args.push(userId);
  }
  const name = String(filters.name || '').trim();
  if (name) {
    where.push(`(COALESCE(u.username,'') LIKE ? OR COALESCE(u.email,'') LIKE ? OR COALESCE(u.employee_code,'') LIKE ?)`);
    const q = `%${name}%`;
    args.push(q, q, q);
  }
  const status = mapExpenseStatus(filters.status);
  if (status) {
    where.push(`ec.status = ?`);
    args.push(status);
  } else {
    where.push(`ec.status NOT IN ('draft', 'pending')`);
  }
  const minAmount = Number(filters.minAmount);
  if (Number.isFinite(minAmount)) {
    where.push(`ec.amount >= ?`);
    args.push(minAmount);
  }
  const maxAmount = Number(filters.maxAmount);
  if (Number.isFinite(maxAmount)) {
    where.push(`ec.amount <= ?`);
    args.push(maxAmount);
  }
  const approverId = String(filters.approverId || '').trim();
  if (approverId) {
    where.push(`COALESCE(ec.approver_id, ec.approved_by) = ?`);
    args.push(approverId);
  }
  return { where, args };
}

exports.listAllPaged = async function(filters = {}) {
  const { where, args } = buildAdminListWhere(filters);
  const sortByRaw = String(filters.sortBy || '').trim().toLowerCase();
  const sortDir = String(filters.sortDir || 'desc').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const sortMap = {
    date: 'ec.date',
    amount: 'ec.amount',
    user: 'u.username',
    status: 'ec.status',
    approver: 'approver_name'
  };
  const sortCol = sortMap[sortByRaw] || 'ec.date';
  const page = Math.max(1, parseInt(String(filters.page || '1'), 10) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(String(filters.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const baseSelect = `
      SELECT ec.*, u.username AS user_name, u.email AS user_email, u.employee_code, u.departmentId, u.employment_type,
        (SELECT name FROM departments d WHERE d.id = u.departmentId) AS department_name,
        (SELECT COALESCE(u2.username, u2.email) FROM users u2 WHERE u2.id = COALESCE(ec.approver_id, ec.approved_by)) AS approver_name,
        (SELECT ef.file_path FROM expense_files ef WHERE ef.expense_id = ec.id ORDER BY ef.id ASC LIMIT 1) AS first_file_path,
        (SELECT COUNT(*) FROM expense_files ef WHERE ef.expense_id = ec.id) AS file_count
      FROM expense_claims ec
      JOIN users u ON u.id = ec.userId
      WHERE ${where.join(' AND ')}
  `;
  const [rows] = await db.query(
    `${baseSelect} ORDER BY ${sortCol} ${sortDir}, ec.id DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM expense_claims ec
     JOIN users u ON u.id = ec.userId
     WHERE ${where.join(' AND ')}`,
    args
  );
  return {
    rows: rows || [],
    total: Number(countRow?.total || 0),
    page,
    limit
  };
};

function isYM(s) {
  return /^\d{4}-\d{2}$/.test(String(s || ''));
}

function addMonthsYM(ym, delta) {
  const s = String(ym || '');
  if (!isYM(s)) return '';
  let y = parseInt(s.slice(0, 4), 10);
  let m = parseInt(s.slice(5, 7), 10);
  const d = parseInt(String(delta || '0'), 10) || 0;
  m += d;
  while (m <= 0) { y -= 1; m += 12; }
  while (m > 12) { y += 1; m -= 12; }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

function listYMBack(ym, n) {
  const base = isYM(ym) ? String(ym) : null;
  const num = Math.max(1, Math.min(24, parseInt(String(n || '6'), 10) || 6));
  const end = base || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const months = [];
  for (let i = num - 1; i >= 0; i -= 1) {
    months.push(addMonthsYM(end, -i));
  }
  return months;
}

exports.getAdminDashboard = async function({ month, months = 6 } = {}) {
  const ym = isYM(month) ? String(month) : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const ymList = listYMBack(ym, months);
  const startYM = ymList[0];
  const endYM = ymList[ymList.length - 1];

  const [[kpiRow]] = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN ec.status IN ('applied','approved','paid') THEN ec.amount ELSE 0 END), 0) AS total_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'applied' THEN ec.amount ELSE 0 END), 0) AS applied_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'approved' THEN ec.amount ELSE 0 END), 0) AS approved_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'paid' THEN ec.amount ELSE 0 END), 0) AS paid_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'rejected' THEN ec.amount ELSE 0 END), 0) AS rejected_amount,
      COALESCE(SUM(ec.status = 'applied'), 0) AS applied_count,
      COALESCE(SUM(ec.status = 'approved'), 0) AS approved_count,
      COALESCE(SUM(ec.status = 'paid'), 0) AS paid_count,
      COALESCE(SUM(ec.status = 'rejected'), 0) AS rejected_count,
      COUNT(DISTINCT CASE WHEN ec.status IN ('applied','approved','paid') THEN ec.userId END) AS applicant_users
    FROM expense_claims ec
    WHERE DATE_FORMAT(ec.date, '%Y-%m') = ?
  `, [ym]);

  const [trendRows] = await db.query(`
    SELECT
      DATE_FORMAT(ec.date, '%Y-%m') AS month,
      COALESCE(SUM(CASE WHEN ec.status = 'applied' THEN ec.amount ELSE 0 END), 0) AS applied_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'approved' THEN ec.amount ELSE 0 END), 0) AS approved_amount,
      COALESCE(SUM(CASE WHEN ec.status IN ('applied','approved') THEN ec.amount ELSE 0 END), 0) AS total_amount,
      COALESCE(SUM(ec.status = 'applied'), 0) AS applied_count,
      COALESCE(SUM(ec.status = 'approved'), 0) AS approved_count,
      COUNT(DISTINCT CASE WHEN ec.status IN ('applied','approved') THEN ec.userId END) AS applicant_users
    FROM expense_claims ec
    WHERE DATE_FORMAT(ec.date, '%Y-%m') BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(ec.date, '%Y-%m')
    ORDER BY DATE_FORMAT(ec.date, '%Y-%m') ASC
  `, [startYM, endYM]);

  const trendMap = new Map((trendRows || []).map((r) => [String(r.month || ''), r]));
  const trend = ymList.map((m) => {
    const r = trendMap.get(m) || {};
    return {
      month: m,
      totalAmount: Number(r.total_amount || 0),
      appliedAmount: Number(r.applied_amount || 0),
      approvedAmount: Number(r.approved_amount || 0),
      appliedCount: Number(r.applied_count || 0),
      approvedCount: Number(r.approved_count || 0),
      applicantUsers: Number(r.applicant_users || 0)
    };
  });

  const [deptRows] = await db.query(`
    SELECT
      u.departmentId AS department_id,
      COUNT(*) AS item_count,
      COUNT(DISTINCT ec.userId) AS user_count,
      COALESCE(SUM(ec.amount), 0) AS total_amount
    FROM expense_claims ec
    JOIN users u ON u.id = ec.userId
    WHERE DATE_FORMAT(ec.date, '%Y-%m') = ?
      AND ec.status IN ('applied','approved')
    GROUP BY u.departmentId
    ORDER BY total_amount DESC
    LIMIT 30
  `, [ym]);

  const monthStats = {
    month: ym,
    totalAmount: Number(kpiRow?.total_amount || 0),
    appliedAmount: Number(kpiRow?.applied_amount || 0),
    approvedAmount: Number(kpiRow?.approved_amount || 0),
    rejectedAmount: Number(kpiRow?.rejected_amount || 0),
    appliedCount: Number(kpiRow?.applied_count || 0),
    approvedCount: Number(kpiRow?.approved_count || 0),
    rejectedCount: Number(kpiRow?.rejected_count || 0),
    applicantUsers: Number(kpiRow?.applicant_users || 0)
  };
  const avg = monthStats.applicantUsers > 0 ? Math.round(monthStats.totalAmount / monthStats.applicantUsers) : 0;
  return {
    month: monthStats,
    avgPerUser: avg,
    trend,
    departmentShares: (deptRows || []).map((r) => ({
      departmentId: r.department_id == null ? null : String(r.department_id),
      totalAmount: Number(r.total_amount || 0),
      userCount: Number(r.user_count || 0),
      itemCount: Number(r.item_count || 0)
    }))
  };
};

exports.closeMonthlyApprovedTotals = async function({ month, closedBy, forceRecalc, userId = null }) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('Invalid month');
  const mainRepo = require('./expenses.repository');
  const rows = await mainRepo.getMonthlyApprovedTotals(month, userId);
  if (!rows.length) return { month: String(month), affectedUsers: 0 };
  const doForce = !!forceRecalc;
  for (const r of rows) {
    const uid = Number(r.user_id);
    const total = Number(r.total_amount || 0);
    const count = Number(r.approved_count || 0);
    if (doForce) {
      await db.query(
        `INSERT INTO expense_monthly_closures (userId, month, total_amount, approved_count, closed_by, closed_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           total_amount = VALUES(total_amount),
           approved_count = VALUES(approved_count),
           closed_by = VALUES(closed_by),
           closed_at = CURRENT_TIMESTAMP`,
        [uid, String(month), total, count, closedBy || null]
      );
    } else {
      await db.query(
        `INSERT IGNORE INTO expense_monthly_closures (userId, month, total_amount, approved_count, closed_by, closed_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uid, String(month), total, count, closedBy || null]
      );
    }
  }
  return { month: String(month), affectedUsers: rows.length };
};
