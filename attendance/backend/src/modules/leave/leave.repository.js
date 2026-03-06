const db = require('../../core/database/mysql');
// Repository yêu cầu nghỉ
module.exports = {
  async create({ userId, startDate, endDate, type, reason }) {
    const sql = `
      INSERT INTO leave_requests (userId, startDate, endDate, type, reason)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [res] = await db.query(sql, [userId, startDate, endDate, type, reason || null]);
    return res.insertId;
  },
  async listMine(userId) {
    const sql = `
      SELECT * FROM leave_requests
      WHERE userId = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  },
  async listByUser(userId) {
    const sql = `
      SELECT * FROM leave_requests
      WHERE userId = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  },
  async listAllPending() {
    const sql = `
      SELECT * FROM leave_requests
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  },
  async updateStatus(id, status) {
    const sql = `
      UPDATE leave_requests
      SET status = ?
      WHERE id = ?
    `;
    await db.query(sql, [status, id]);
  }
};
