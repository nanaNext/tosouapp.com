const db = require('../../core/database/mysql');

const { scopedTid } = require('../../core/database/tenantContext');
// Không truyền tenantId trong request có công ty → xem core/database/tenantContext.js
function _tid(tenantId) {
  return scopedTid(tenantId);
}

//Lấy cấu hình lương theo năm (salary_config), chạy query với tham số year
async function getConfigByYear(year, tenantId = null) {
  const tid = _tid(tenantId) ?? 1;
  try {
    const sql = `SELECT * FROM salary_config WHERE tenant_id = ? AND year = ? LIMIT 1`;
    const [rows] = await db.query(sql, [tid, year]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function upsertConfig(tenantId, year, data) {
  const tid = _tid(tenantId) ?? 1;
  const y = parseInt(year, 10);
  const d = data || {};
  const sql = `
    INSERT INTO salary_config (
      tenant_id, year, health_insurance_rate, care_insurance_rate, pension_rate,
      employment_insurance_rate, tax_rate, overtime_rate, holiday_rate, late_night_rate,
      working_minutes_per_month, standard_days_per_month, base_hourly_rate, rounding_minutes, rounding_mode,
      commute_allowance_tax_free_limit, company_name, prefecture, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      health_insurance_rate = VALUES(health_insurance_rate),
      care_insurance_rate = VALUES(care_insurance_rate),
      pension_rate = VALUES(pension_rate),
      employment_insurance_rate = VALUES(employment_insurance_rate),
      tax_rate = VALUES(tax_rate),
      overtime_rate = VALUES(overtime_rate),
      holiday_rate = VALUES(holiday_rate),
      late_night_rate = VALUES(late_night_rate),
      working_minutes_per_month = VALUES(working_minutes_per_month),
      standard_days_per_month = VALUES(standard_days_per_month),
      base_hourly_rate = VALUES(base_hourly_rate),
      rounding_minutes = VALUES(rounding_minutes),
      rounding_mode = VALUES(rounding_mode),
      commute_allowance_tax_free_limit = VALUES(commute_allowance_tax_free_limit),
      company_name = VALUES(company_name),
      prefecture = VALUES(prefecture),
      updated_by = VALUES(updated_by)
  `;
  await db.query(sql, [
    tid, y,
    Number(d.healthInsuranceRate) || 0,
    Number(d.careInsuranceRate) || 0,
    Number(d.pensionRate) || 0,
    Number(d.employmentInsuranceRate) || 0,
    Number(d.taxRate) || 0,
    Number(d.overtimeRate) || 1.25,
    Number(d.holidayRate) || 1.35,
    Number(d.lateNightRate) || 1.25,
    parseInt(d.workingMinutesPerMonth, 10) || (160 * 60),
    Number(d.standardDaysPerMonth) || 21.75,
    d.baseHourlyRate != null && d.baseHourlyRate !== '' ? Number(d.baseHourlyRate) : null,
    parseInt(d.roundingMinutes, 10) || 5,
    String(d.roundingMode || 'half_up'),
    Number(d.commuteAllowanceTaxFreeLimit) || 150000,
    d.companyName != null ? String(d.companyName).trim() : null,
    d.prefecture != null ? String(d.prefecture).trim() : null,
    d.updatedBy || null
  ]);
  return getConfigByYear(y, tid);
}

async function getUserCompensation(userId, tenantId = null) {
  const tid = _tid(tenantId);
  try {
    let sql = `SELECT base_salary, allowance_transport, commute_method, commute_distance_km FROM users WHERE id = ?`;
    const params = [userId];
    if (tid !== null) {
      sql += ` AND tenant_id = ?`;
      params.push(tid);
    }
    sql += ` LIMIT 1`;
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function ensureHistoryTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS salary_history (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      month CHAR(7) NOT NULL,
      payload JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_month (userId, month),
      INDEX idx_user (userId),
      INDEX idx_month (month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await db.query(sql);
}

async function saveHistory(userId, month, payload, tenantId = null) {
  const tid = _tid(tenantId);
  await ensureHistoryTable();
  // If tenantId provided, verify user belongs to tenant before saving
  if (tid !== null) {
    const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!check || !check.length) return null;
  }
  const sql = `
    INSERT INTO salary_history (userId, month, payload)
    VALUES (?, ?, CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE payload = VALUES(payload)
  `;
  await db.query(sql, [userId, month, JSON.stringify(payload)]);
}

async function listHistory({ userId, month, page = 1, pageSize = 20, tenantId = null }) {
  const tid = _tid(tenantId);
  await ensureHistoryTable();
  const where = [];
  const params = [];
  let fromClause = 'salary_history sh';

  if (tid !== null) {
    fromClause = 'salary_history sh JOIN users u ON u.id = sh.userId';
    where.push('u.tenant_id = ?');
    params.push(tid);
  }

  if (userId) { where.push('sh.userId = ?'); params.push(userId); }
  if (month) { where.push('sh.month = ?'); params.push(month); }
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.max(1, parseInt(pageSize, 10) || 20);
  const offset = (p - 1) * ps;
  const sql = `
    SELECT sh.id, sh.userId, sh.month, JSON_EXTRACT(sh.payload, '$') AS payload, sh.created_at
    FROM ${fromClause}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY sh.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await db.query(sql, [...params, ps, offset]);
  const [[{ total } = { total: 0 }]] = await db.query(`
    SELECT COUNT(*) AS total FROM ${fromClause} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `, params);
  return { data: rows, page: p, pageSize: ps, total, pages: Math.ceil(total / ps) };
}

module.exports = { getConfigByYear, upsertConfig, getUserCompensation, saveHistory, listHistory };
