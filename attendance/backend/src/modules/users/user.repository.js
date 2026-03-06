const db = require('../../core/database/mysql');

module.exports = {
  async listUsers() {
    try { await db.query(`ALTER TABLE users ADD COLUMN employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time'`); } catch {}
    const sql = `SELECT id, username, email, role, departmentId, employment_type FROM users ORDER BY id DESC`;
    const [rows] = await db.query(sql);
    return rows;
  },
  async getUserById(id) {
    try { await db.query(`ALTER TABLE users ADD COLUMN employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time'`); } catch {}
    const sql = `SELECT id, username, email, role, departmentId, employment_type FROM users WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },
  async createUser({ username, email, password, role = 'employee', departmentId = null }) {
    try { await db.query(`ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) NULL`); } catch {}
    try { await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_email_lower (email_lower)`); } catch {}
    try { await db.query(`ALTER TABLE users ADD COLUMN employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time'`); } catch {}
    const sql = `INSERT INTO users (username, email, email_lower, password, role, departmentId, employment_type) VALUES (?, ?, LOWER(?), ?, ?, ?, 'full_time')`;
    const [res] = await db.query(sql, [username, email, email, password, role, departmentId]);
    return res.insertId;
  },
  async updateUser(id, { username, email, role, departmentId, employmentType }) {
    try { await db.query(`ALTER TABLE users ADD COLUMN employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time'`); } catch {}
    const sql = `
      UPDATE users
      SET username = COALESCE(?, username),
          email = COALESCE(?, email),
          email_lower = COALESCE(LOWER(?), email_lower),
          role = COALESCE(?, role),
          departmentId = COALESCE(?, departmentId),
          employment_type = COALESCE(?, employment_type)
      WHERE id = ?
    `;
    await db.query(sql, [username || null, email || null, email || null, role || null, departmentId || null, employmentType || null, id]);
  },
  async deleteUser(id) {
    const sql = `DELETE FROM users WHERE id = ?`;
    await db.query(sql, [id]);
  },
  async setRole(id, role) {
    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    await db.query(sql, [role, id]);
  },
  async setDepartment(id, departmentId) {
    const sql = `UPDATE users SET departmentId = ? WHERE id = ?`;
    await db.query(sql, [departmentId, id]);
  },
  async setPassword(id, hashedPassword) {
    const sql = `UPDATE users SET password = ? WHERE id = ?`;
    await db.query(sql, [hashedPassword, id]);
  },
  async getAllDepartments() {
    const sql = `SELECT * FROM departments ORDER BY name ASC`;
    const [rows] = await db.query(sql);
    return rows;
  },

  async getDepartmentById(id) {
    const sql = `SELECT * FROM departments WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createDepartment(name) {
    const sql = `INSERT INTO departments (name) VALUES (?)`;
    const [result] = await db.query(sql, [name]);
    return result.insertId;
  },

  async updateDepartment(id, name) {
    const sql = `UPDATE departments SET name = ? WHERE id = ?`;
    await db.query(sql, [name, id]);
  },

  async deleteDepartment(id) {
    const sql = `DELETE FROM departments WHERE id = ?`;
    await db.query(sql, [id]);
  }
};
