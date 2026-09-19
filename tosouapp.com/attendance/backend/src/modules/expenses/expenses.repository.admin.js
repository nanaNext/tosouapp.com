'use strict';
/**
 * expenses.repository.admin.js
 * Admin dashboard, paged list, and monthly closure operations.
 * Split from expenses.repository.js for maintainability.
 */
const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

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
  const tid = _tid(filters.tenantId);
  if (tid != null) {
    where.push(`u.tenant_id = ?`);
    args.push(tid);
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
        (SELECT ef.id FROM expense_files ef WHERE ef.expense_id = ec.id ORDER BY ef.id ASC LIMIT 1) AS first_file_id,
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
  // 生の /uploads パスを直接返さない — 認証済みダウンロードエンドポイント経由でのみアクセスさせる。
  const mappedRows = (rows || []).map(r => ({
    ...r,
    first_file_path: r.first_file_id ? `/api/expenses/files/${r.first_file_id}/download` : null
  }));
  return {
    rows: mappedRows,
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

exports.getAdminDashboard = async function({ month, months = 6, tenantId = null } = {}) {
  const tid = _tid(tenantId);
  const ym = isYM(month) ? String(month) : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const ymList = listYMBack(ym, months);
  const startYM = ymList[0];
  const endYM = ymList[ymList.length - 1];

  const tenantJoin = tid != null ? ' JOIN users u ON u.id = ec.userId' : '';
  const tenantWhere = tid != null ? ' AND u.tenant_id = ?' : '';

  const kpiParams = [ym];
  if (tid != null) kpiParams.push(tid);
  const [[kpiRow]] = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN ec.status IN ('applied','approved','paid') THEN ec.amount ELSE 0 END), 0) AS total_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'applied' THEN ec.amount ELSE 0 END), 0) AS applied_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'approved' THEN ec.amount ELSE 0 END), 0) AS approved_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'paid' THEN ec.amount ELSE 0 END), 0) AS paid_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'rejected' THEN ec.amount ELSE 0 END), 0) AS rejected_amount,
      COALESCE(SUM(ec.status = 'applied'), 0) AS applied_count,
      COALESCE(SUM(ec.status = 'soumu_checked'), 0) AS soumu_checked_count,
      COALESCE(SUM(ec.status = 'approved'), 0) AS approved_count,
      COALESCE(SUM(ec.status = 'paid'), 0) AS paid_count,
      COALESCE(SUM(ec.status = 'rejected'), 0) AS rejected_count,
      COUNT(DISTINCT CASE WHEN ec.status IN ('applied','soumu_checked','approved','paid') THEN ec.userId END) AS applicant_users
    FROM expense_claims ec${tenantJoin}
    WHERE DATE_FORMAT(ec.date, '%Y-%m') = ?${tenantWhere}
  `, kpiParams);

  const trendParams = [startYM, endYM];
  if (tid != null) trendParams.push(tid);
  const [trendRows] = await db.query(`
    SELECT
      DATE_FORMAT(ec.date, '%Y-%m') AS month,
      COALESCE(SUM(CASE WHEN ec.status = 'applied' THEN ec.amount ELSE 0 END), 0) AS applied_amount,
      COALESCE(SUM(CASE WHEN ec.status = 'approved' THEN ec.amount ELSE 0 END), 0) AS approved_amount,
      COALESCE(SUM(CASE WHEN ec.status IN ('applied','approved','paid') THEN ec.amount ELSE 0 END), 0) AS total_amount,
      COALESCE(SUM(ec.status = 'applied'), 0) AS applied_count,
      COALESCE(SUM(ec.status = 'approved'), 0) AS approved_count,
      COUNT(DISTINCT CASE WHEN ec.status IN ('applied','approved','paid') THEN ec.userId END) AS applicant_users
    FROM expense_claims ec${tenantJoin}
    WHERE DATE_FORMAT(ec.date, '%Y-%m') BETWEEN ? AND ?${tenantWhere}
    GROUP BY DATE_FORMAT(ec.date, '%Y-%m')
    ORDER BY DATE_FORMAT(ec.date, '%Y-%m') ASC
  `, trendParams);

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

  const deptParams = [ym];
  if (tid != null) deptParams.push(tid);
  const tenantDeptWhere = tid != null ? ' AND u.tenant_id = ?' : '';
  const [deptRows] = await db.query(`
    SELECT
      u.departmentId AS department_id,
      COUNT(*) AS item_count,
      COUNT(DISTINCT ec.userId) AS user_count,
      COALESCE(SUM(ec.amount), 0) AS total_amount
    FROM expense_claims ec
    JOIN users u ON u.id = ec.userId
    WHERE DATE_FORMAT(ec.date, '%Y-%m') = ?
      AND ec.status IN ('applied','approved','paid')${tenantDeptWhere}
    GROUP BY u.departmentId
    ORDER BY total_amount DESC
    LIMIT 30
  `, deptParams);

  const monthStats = {
    month: ym,
    totalAmount: Number(kpiRow?.total_amount || 0),
    appliedAmount: Number(kpiRow?.applied_amount || 0),
    approvedAmount: Number(kpiRow?.approved_amount || 0),
    rejectedAmount: Number(kpiRow?.rejected_amount || 0),
    appliedCount: Number(kpiRow?.applied_count || 0),
    soumuCheckedCount: Number(kpiRow?.soumu_checked_count || 0),
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

exports.closeMonthlyApprovedTotals = async function({ month, closedBy, forceRecalc, userId = null, tenantId = null }) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('Invalid month');
  const mainRepo = require('./expenses.repository');
  const taxRepo = require('./expenses.tax');
  const rows = await mainRepo.getMonthlyApprovedTotals(month, userId, tenantId);
  if (!rows.length) return { month: String(month), affectedUsers: 0 };
  const doForce = !!forceRecalc;
  for (const r of rows) {
    const uid = Number(r.user_id);
    const total = Number(r.total_amount || 0);
    const count = Number(r.approved_count || 0);
    // 非課税限度額（電車・バスの月額上限 + マイカー等の距離別非課税額）を超えた分を課税対象として記録する。
    let taxableAmount = 0;
    try {
      const tax = await taxRepo.computeTaxableForUserMonth(uid, month, tenantId);
      taxableAmount = Number(tax.taxableAmount || 0);
    } catch (e) { /* 設定未整備などで計算に失敗しても月次締め自体は続行する */ }
    if (doForce) {
      await db.query(
        `INSERT INTO expense_monthly_closures (userId, month, total_amount, approved_count, taxable_amount, closed_by, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           total_amount = VALUES(total_amount),
           approved_count = VALUES(approved_count),
           taxable_amount = VALUES(taxable_amount),
           closed_by = VALUES(closed_by),
           closed_at = CURRENT_TIMESTAMP`,
        [uid, String(month), total, count, taxableAmount, closedBy || null]
      );
    } else {
      await db.query(
        `INSERT IGNORE INTO expense_monthly_closures (userId, month, total_amount, approved_count, taxable_amount, closed_by, closed_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uid, String(month), total, count, taxableAmount, closedBy || null]
      );
    }
  }
  return { month: String(month), affectedUsers: rows.length };
};

// 「総務確認済み」等のキュー画面は既に申請した人しか出ないため、管理者が「誰がまだ出していないか」を
// 把握できない。ここでは在籍中の全社員(employee/manager)を起点に対象月の expense_claims を
// LEFT JOIN し、1件も無ければ「未申請」として返す(expenses.repository.js#listAppliedMonthsForAdmin は
// expense_months 駆動のため未申請者が漏れる — この関数は users 駆動にすることで解決する)。
const STATUS_PRIORITY = ['rejected', 'applied', 'soumu_checked', 'approved', 'paid'];
function pickOverallStatus(statusesCsv) {
  const set = new Set(String(statusesCsv || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  for (const s of STATUS_PRIORITY) {
    if (set.has(s)) return s;
  }
  return 'not_submitted';
}

exports.getEmployeeMonthlyOverview = async function(month, tenantId = null) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('Invalid month');
  const tid = _tid(tenantId);
  const tenantClause = tid != null ? ' AND u.tenant_id = ?' : '';
  const params = [String(month)];
  if (tid != null) params.push(tid);
  const [rows] = await db.query(
    `SELECT
       u.id AS user_id,
       COALESCE(u.username, u.email) AS user_name,
       u.employee_code,
       u.departmentId AS department_id,
       d.name AS department_name,
       COUNT(ec.id) AS item_count,
       COALESCE(SUM(ec.amount), 0) AS total_amount,
       GROUP_CONCAT(DISTINCT ec.status) AS statuses
     FROM users u
     LEFT JOIN departments d ON d.id = u.departmentId
     LEFT JOIN expense_claims ec ON ec.userId = u.id AND DATE_FORMAT(ec.date, '%Y-%m') = ?
     WHERE u.employment_status = 'active' AND u.role IN ('employee','manager')${tenantClause}
     GROUP BY u.id, u.username, u.email, u.employee_code, u.departmentId, d.name
     ORDER BY COALESCE(u.username, u.email) ASC`,
    params
  );
  return (rows || []).map(r => ({
    userId: r.user_id,
    userName: r.user_name,
    employeeCode: r.employee_code,
    departmentId: r.department_id,
    departmentName: r.department_name,
    itemCount: Number(r.item_count || 0),
    totalAmount: Number(r.total_amount || 0),
    status: pickOverallStatus(r.statuses)
  }));
};
