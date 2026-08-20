const db = require('../../core/database/mysql');

/**
 * Repository quản lý ngày nghỉ theo bộ phận (department_holidays)
 * Tách biệt với company_holidays (lịch nghỉ chung toàn công ty).
 */

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

let _tableEnsured = false;

async function ensureTable() {
  if (_tableEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS department_holidays (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      department_id BIGINT UNSIGNED NOT NULL,
      date DATE NOT NULL,
      name VARCHAR(255) NULL,
      type VARCHAR(32) NOT NULL DEFAULT 'custom',
      is_off TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_dept_date (department_id, date),
      INDEX idx_dept_id (department_id),
      INDEX idx_date (date),
      INDEX idx_year_dept (department_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  _tableEnsured = true;
}

module.exports = {
  ensureTable,

  /**
   * Lấy danh sách ngày nghỉ theo bộ phận và năm
   */
  async listByDepartmentAndYear(departmentId, year, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      const [rows] = await db.query(
        `SELECT dh.id, dh.department_id, dh.date, dh.name, dh.type, dh.is_off, dh.created_at, dh.updated_at
         FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.department_id = ? AND YEAR(dh.date) = ?
         ORDER BY dh.date ASC`,
        [tid, departmentId, year]
      );
      return rows;
    }
    const [rows] = await db.query(
      `SELECT id, department_id, date, name, type, is_off, created_at, updated_at
       FROM department_holidays
       WHERE department_id = ? AND YEAR(date) = ?
       ORDER BY date ASC`,
      [departmentId, year]
    );
    return rows;
  },

  /**
   * Lấy danh sách ngày nghỉ theo bộ phận, năm và tháng
   */
  async listByDepartmentAndMonth(departmentId, yearMonth, tenantId = null) {
    await ensureTable();
    const [y, m] = String(yearMonth).split('-').map(Number);
    const tid = _tid(tenantId);
    if (tid) {
      const [rows] = await db.query(
        `SELECT dh.id, dh.department_id, dh.date, dh.name, dh.type, dh.is_off, dh.created_at, dh.updated_at
         FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.department_id = ? AND YEAR(dh.date) = ? AND MONTH(dh.date) = ?
         ORDER BY dh.date ASC`,
        [tid, departmentId, y, m]
      );
      return rows;
    }
    const [rows] = await db.query(
      `SELECT id, department_id, date, name, type, is_off, created_at, updated_at
       FROM department_holidays
       WHERE department_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
       ORDER BY date ASC`,
      [departmentId, y, m]
    );
    return rows;
  },

  /**
   * Lấy tất cả ngày nghỉ của tất cả bộ phận trong 1 năm
   */
  async listAllByYear(year, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      const [rows] = await db.query(
        `SELECT dh.id, dh.department_id, dh.date, dh.name, dh.type, dh.is_off,
                dh.created_at, dh.updated_at, d.name AS department_name
         FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE YEAR(dh.date) = ?
         ORDER BY dh.department_id ASC, dh.date ASC`,
        [tid, year]
      );
      return rows;
    }
    const [rows] = await db.query(
      `SELECT dh.id, dh.department_id, dh.date, dh.name, dh.type, dh.is_off,
              dh.created_at, dh.updated_at, d.name AS department_name
       FROM department_holidays dh
       LEFT JOIN departments d ON d.id = dh.department_id
       WHERE YEAR(dh.date) = ?
       ORDER BY dh.department_id ASC, dh.date ASC`,
      [year]
    );
    return rows;
  },

  /**
   * Lấy 1 bản ghi theo ID
   */
  async getById(id, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      const [rows] = await db.query(
        `SELECT dh.id, dh.department_id, dh.date, dh.name, dh.type, dh.is_off, dh.created_at, dh.updated_at
         FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.id = ? LIMIT 1`,
        [tid, id]
      );
      return rows[0] || null;
    }
    const [rows] = await db.query(
      `SELECT id, department_id, date, name, type, is_off, created_at, updated_at
       FROM department_holidays WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Thêm mới ngày nghỉ cho bộ phận
   */
  async create({ departmentId, date, name, type, isOff, tenantId = null }) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      // Verify department belongs to tenant
      const [deptRows] = await db.query(
        `SELECT id FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [departmentId, tid]
      );
      if (!deptRows || !deptRows.length) {
        throw Object.assign(new Error('Department not found or access denied'), { status: 403 });
      }
    }
    const [result] = await db.query(
      `INSERT INTO department_holidays (department_id, date, name, type, is_off)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_off = VALUES(is_off)`,
      [departmentId, String(date).slice(0, 10), name || null, type || 'custom', isOff !== undefined ? (isOff ? 1 : 0) : 1]
    );
    return result.insertId || result.affectedRows;
  },

  /**
   * Thêm nhiều ngày nghỉ cùng lúc (bulk)
   */
  async createMany(departmentId, items, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      // Verify department belongs to tenant
      const [deptRows] = await db.query(
        `SELECT id FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [departmentId, tid]
      );
      if (!deptRows || !deptRows.length) {
        throw Object.assign(new Error('Department not found or access denied'), { status: 403 });
      }
    }
    const results = [];
    for (const item of (items || [])) {
      const date = String(item.date || '').slice(0, 10);
      if (!date) continue;
      const [result] = await db.query(
        `INSERT INTO department_holidays (department_id, date, name, type, is_off)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_off = VALUES(is_off)`,
        [departmentId, date, item.name || null, item.type || 'custom', item.is_off !== undefined ? (item.is_off ? 1 : 0) : 1]
      );
      results.push({ date, id: result.insertId || null });
    }
    return results;
  },

  /**
   * Cập nhật ngày nghỉ
   */
  async update(id, { date, name, type, isOff, tenantId = null }) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      // Verify the holiday record belongs to a department of this tenant
      const [check] = await db.query(
        `SELECT dh.id FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.id = ? LIMIT 1`,
        [tid, id]
      );
      if (!check || !check.length) {
        throw Object.assign(new Error('Holiday not found or access denied'), { status: 403 });
      }
    }
    const fields = [];
    const params = [];
    if (date !== undefined) { fields.push('date = ?'); params.push(String(date).slice(0, 10)); }
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (type !== undefined) { fields.push('type = ?'); params.push(type); }
    if (isOff !== undefined) { fields.push('is_off = ?'); params.push(isOff ? 1 : 0); }
    if (!fields.length) return { affected: 0 };
    params.push(id);
    const [result] = await db.query(
      `UPDATE department_holidays SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return { affected: result.affectedRows };
  },

  /**
   * Xóa ngày nghỉ theo ID
   */
  async deleteById(id, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      // Only delete if the holiday belongs to a department of this tenant
      const [result] = await db.query(
        `DELETE dh FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.id = ?`,
        [tid, id]
      );
      return { affected: result.affectedRows };
    }
    const [result] = await db.query(
      `DELETE FROM department_holidays WHERE id = ?`,
      [id]
    );
    return { affected: result.affectedRows };
  },

  /**
   * Xóa tất cả ngày nghỉ của bộ phận trong 1 năm
   */
  async deleteByDepartmentAndYear(departmentId, year, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      const [result] = await db.query(
        `DELETE dh FROM department_holidays dh
         INNER JOIN departments d ON d.id = dh.department_id AND d.tenant_id = ?
         WHERE dh.department_id = ? AND YEAR(dh.date) = ?`,
        [tid, departmentId, year]
      );
      return { affected: result.affectedRows };
    }
    const [result] = await db.query(
      `DELETE FROM department_holidays WHERE department_id = ? AND YEAR(date) = ?`,
      [departmentId, year]
    );
    return { affected: result.affectedRows };
  },

  /**
   * Copy ngày nghỉ từ bộ phận này sang bộ phận khác
   */
  async copyFromDepartment(sourceDeptId, targetDeptId, year, tenantId = null) {
    await ensureTable();
    const tid = _tid(tenantId);
    if (tid) {
      // Verify both source and target departments belong to tenant
      const [srcRows] = await db.query(
        `SELECT id FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [sourceDeptId, tid]
      );
      const [tgtRows] = await db.query(
        `SELECT id FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1`,
        [targetDeptId, tid]
      );
      if (!srcRows || !srcRows.length || !tgtRows || !tgtRows.length) {
        throw Object.assign(new Error('Department not found or access denied'), { status: 403 });
      }
    }
    const sourceRows = await this.listByDepartmentAndYear(sourceDeptId, year, tenantId);
    const items = sourceRows.map(r => ({
      date: r.date,
      name: r.name,
      type: r.type,
      is_off: r.is_off
    }));
    return this.createMany(targetDeptId, items, tenantId);
  }
};
