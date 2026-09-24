const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

// 法人 (法的に独立した会社)。テナント (SaaS契約単位) の下に複数の法人がぶら下がる場合がある
// (例: 持株会社が複数の子会社を1つの契約で運用) — テナントと法人を混同しないこと。
async function ensureCorporationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS corporations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(32) NULL,
      tenant_id BIGINT UNSIGNED NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_corp_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try { await db.query(`ALTER TABLE corporations ADD UNIQUE KEY uniq_corp_code (code)`); } catch (e) { /* silently ignored */ }
}

module.exports = {
  ensureCorporationsTable,

  async getAllCorporations(tenantId = null, { includeInactive = false } = {}) {
    await ensureCorporationsTable();
    const tid = _tid(tenantId);
    const where = [];
    const params = [];
    if (!includeInactive) where.push('is_active = 1');
    if (tid) { where.push('tenant_id = ?'); params.push(tid); }
    const wsql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(`SELECT id, name, code, is_active FROM corporations ${wsql} ORDER BY name ASC`, params);
    return rows;
  },

  async getCorporationById(id, tenantId = null) {
    await ensureCorporationsTable();
    const tid = _tid(tenantId);
    const sql = tid
      ? `SELECT id, name, code, is_active FROM corporations WHERE id = ? AND tenant_id = ? LIMIT 1`
      : `SELECT id, name, code, is_active FROM corporations WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, tid ? [id, tid] : [id]);
    return rows[0] || null;
  },

  async createCorporation(name, code = null, tenantId = null) {
    await ensureCorporationsTable();
    const tid = _tid(tenantId);
    const [result] = await db.query(`INSERT INTO corporations (name, code, tenant_id) VALUES (?, ?, ?)`, [name, code, tid]);
    return result.insertId;
  },

  async updateCorporation(id, name, code = null, tenantId = null) {
    await ensureCorporationsTable();
    const tid = _tid(tenantId);
    const sql = tid
      ? `UPDATE corporations SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ? AND tenant_id = ?`
      : `UPDATE corporations SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ?`;
    await db.query(sql, tid ? [name || null, code || null, id, tid] : [name || null, code || null, id]);
  },

  async deactivateCorporation(id, tenantId = null) {
    await ensureCorporationsTable();
    const tid = _tid(tenantId);
    const sql = tid ? `UPDATE corporations SET is_active = 0 WHERE id = ? AND tenant_id = ?` : `UPDATE corporations SET is_active = 0 WHERE id = ?`;
    await db.query(sql, tid ? [id, tid] : [id]);
  }
};
