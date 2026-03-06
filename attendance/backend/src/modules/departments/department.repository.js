const db = require('../../core/database/mysql');

module.exports = {
  async getAllDepartments() {
    // DEBUG: Đảm bảo bảng departments tồn tại
    // - Chạy CREATE TABLE IF NOT EXISTS trước mọi truy vấn để tránh lỗi "Table doesn't exist"
    // - Nếu vẫn lỗi, kiểm tra quyền DB/user MySQL hoặc DATABASE() đúng schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const sql = `SELECT * FROM departments ORDER BY name ASC`;
    const [rows] = await db.query(sql);
    return rows;
  },

  async getDepartmentById(id) {
    // DEBUG: Tạo bảng nếu chưa có trước khi truy vấn theo id
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const sql = `SELECT * FROM departments WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createDepartment(name) {
    // DEBUG: Tạo bảng nếu chưa có trước khi INSERT
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const sql = `INSERT INTO departments (name) VALUES (?)`;
    const [result] = await db.query(sql, [name]);
    return result.insertId;
  },

  async updateDepartment(id, name) {
    // DEBUG: Tạo bảng nếu chưa có trước khi UPDATE
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const sql = `UPDATE departments SET name = ? WHERE id = ?`;
    await db.query(sql, [name, id]);
  },

  async deleteDepartment(id) {
    // DEBUG: Tạo bảng nếu chưa có trước khi DELETE
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const sql = `DELETE FROM departments WHERE id = ?`;
    await db.query(sql, [id]);
  },

  async createMany(names) {
    // DEBUG: Bulk tạo phòng ban
    // - Bỏ qua tên rỗng/space
    // - Không tạo trùng: nếu name tồn tại trả về id cũ
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const createdIds = [];
    for (const n of (names || [])) {
      if (!n || !String(n).trim()) continue;
      const [rows] = await db.query(`SELECT id FROM departments WHERE name = ? LIMIT 1`, [n]);
      if (Array.isArray(rows) && rows.length) {
        createdIds.push(rows[0].id);
        continue;
      }
      const [result] = await db.query(`INSERT INTO departments (name) VALUES (?)`, [n]);
      createdIds.push(result.insertId);
    }
    return createdIds;
  }
};
