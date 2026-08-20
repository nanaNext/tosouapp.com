const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

//Lấy cấu hình lương theo năm (salary_config), chạy query với tham số year
async function getConfigByYear(year, tenantId = null) {
  const tid = _tid(tenantId);
  try {
    // salary_config is global/shared; tenantId accepted for future use
    const sql = `SELECT * FROM salary_config WHERE year = ? LIMIT 1`;
    const [rows] = await db.query(sql, [year]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function getUserCompensation(userId, tenantId = null) {
  const tid = _tid(tenantId);
  try {
    let sql = `SELECT base_salary, allowance_transport FROM users WHERE id = ?`;
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

module.exports = { getConfigByYear, getUserCompensation, saveHistory, listHistory };
