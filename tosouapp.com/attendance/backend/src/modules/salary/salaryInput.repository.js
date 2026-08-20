const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS salary_inputs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      month CHAR(7) NOT NULL,
      payload JSON NOT NULL,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_month (userId, month),
      INDEX idx_user (userId),
      INDEX idx_month (month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await db.query(sql);
  try {
    const [cols] = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'salary_inputs'
    `);
    const set = new Set((cols || []).map(c => String(c.column_name)));
    if (!set.has('is_published')) {
      await db.query(`ALTER TABLE salary_inputs ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE`);
    }

    const [fk1] = await db.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_inputs' AND COLUMN_NAME = 'userId' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    if (!fk1 || !fk1.length) {
      try { await db.query(`ALTER TABLE salary_inputs ADD CONSTRAINT fk_salary_inputs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE`); } catch (e) { /* silently ignored */ }
    }
    const [fk2] = await db.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_inputs' AND COLUMN_NAME = 'updated_by' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    if (!fk2 || !fk2.length) {
      try { await db.query(`ALTER TABLE salary_inputs ADD CONSTRAINT fk_salary_inputs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL`); } catch (e) { /* silently ignored */ }
    }
  } catch (e) { /* silently ignored */ }
}

async function getByUserMonth(userId, month, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  let params;
  if (tid !== null) {
    sql = `
      SELECT si.id, si.userId, si.month, si.payload, si.is_published, si.updated_by, si.updated_at
      FROM salary_inputs si
      JOIN users u ON u.id = si.userId
      WHERE si.userId = ? AND si.month = ? AND u.tenant_id = ?
      LIMIT 1
    `;
    params = [userId, month, tid];
  } else {
    sql = `SELECT id, userId, month, payload, is_published, updated_by, updated_at FROM salary_inputs WHERE userId = ? AND month = ? LIMIT 1`;
    params = [userId, month];
  }
  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function upsert({ userId, month, payload, updatedBy, tenantId = null }) {
  const tid = _tid(tenantId);
  // If tenantId provided, verify user belongs to tenant before upserting
  if (tid !== null) {
    const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!check || !check.length) return null;
  }
  const sql = `
    INSERT INTO salary_inputs (userId, month, payload, updated_by)
    VALUES (?, ?, CAST(? AS JSON), ?)
    ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_by = VALUES(updated_by)
  `;
  await db.query(sql, [userId, month, JSON.stringify(payload || {}), updatedBy || null]);
  return getByUserMonth(userId, month, tenantId);
}

async function setPublished(userId, month, isPublished, updatedBy, tenantId = null) {
  const tid = _tid(tenantId);
  // If tenantId provided, verify user belongs to tenant
  if (tid !== null) {
    const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!check || !check.length) return null;
  }
  const sql = `
    UPDATE salary_inputs
    SET is_published = ?, updated_by = ?
    WHERE userId = ? AND month = ?
  `;
  await db.query(sql, [isPublished ? 1 : 0, updatedBy || null, userId, month]);
  return getByUserMonth(userId, month, tenantId);
}

async function listPublishedByUser(userId, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  let params;
  if (tid !== null) {
    sql = `
      SELECT si.userId, si.month, si.is_published, si.updated_by, si.updated_at
      FROM salary_inputs si
      JOIN users u ON u.id = si.userId
      WHERE si.userId = ? AND si.is_published = 1 AND u.tenant_id = ?
      ORDER BY si.month DESC, si.updated_at DESC
    `;
    params = [userId, tid];
  } else {
    sql = `
      SELECT userId, month, is_published, updated_by, updated_at
      FROM salary_inputs
      WHERE userId = ? AND is_published = 1
      ORDER BY month DESC, updated_at DESC
    `;
    params = [userId];
  }
  const [rows] = await db.query(sql, params);
  return rows || [];
}

module.exports = { ensureTable, getByUserMonth, upsert, setPublished, listPublishedByUser };
