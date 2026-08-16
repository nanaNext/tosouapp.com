const db = require('../../core/database/mysql');

async function ensureDepartmentsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try { await db.query(`ALTER TABLE departments ADD COLUMN code VARCHAR(32) NULL`); } catch (e) { /* silently ignored */ }
  try { await db.query(`ALTER TABLE departments ADD UNIQUE KEY uniq_departments_code (code)`); } catch (e) { /* silently ignored */ }
}

module.exports = {
  async getAllDepartments(tenantId = null) {
    await ensureDepartmentsTable();
    const tid = tenantId ? parseInt(String(tenantId), 10) : null;
    const sql = tid
      ? `SELECT id, name, code FROM departments WHERE tenant_id = ? ORDER BY name ASC`
      : `SELECT id, name, code FROM departments ORDER BY name ASC`;
    const params = tid ? [tid] : [];
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async getDepartmentById(id) {
    await ensureDepartmentsTable();
    const sql = `SELECT id, name, code FROM departments WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createDepartment(name, code = null, tenantId = null) {
    await ensureDepartmentsTable();
    const tid = tenantId ? parseInt(String(tenantId), 10) : null;
    const sql = `INSERT INTO departments (name, code, tenant_id) VALUES (?, ?, ?)`;
    const [result] = await db.query(sql, [name, code, tid]);
    return result.insertId;
  },

  async updateDepartment(id, name, code = null) {
    await ensureDepartmentsTable();
    const sql = `UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ?`;
    await db.query(sql, [name || null, code || null, id]);
  },

  async deleteDepartment(id) {
    await ensureDepartmentsTable();
    const sql = `DELETE FROM departments WHERE id = ?`;
    await db.query(sql, [id]);
  },

  async createMany(names, tenantId = null) {
    await ensureDepartmentsTable();
    const tid = tenantId ? parseInt(String(tenantId), 10) : null;
    const createdIds = [];
    for (const n of (names || [])) {
      if (!n || !String(n).trim()) continue;
      const tidClause = tid ? 'AND tenant_id = ?' : '';
      const tidParam = tid ? [tid] : [];
      const [rows] = await db.query(
        `SELECT id FROM departments WHERE name = ? ${tidClause} LIMIT 1`,
        [n, ...tidParam]
      );
      if (Array.isArray(rows) && rows.length) {
        createdIds.push(rows[0].id);
        continue;
      }
      const [result] = await db.query(
        `INSERT INTO departments (name, tenant_id) VALUES (?, ?)`,
        [n, tid]
      );
      createdIds.push(result.insertId);
    }
    return createdIds;
  }
};
