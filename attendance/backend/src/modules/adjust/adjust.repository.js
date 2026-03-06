const db = require('../../core/database/mysql');
// Repository yêu cầu sửa giờ
module.exports = {
  async create({ userId, attendanceId, requestedCheckIn, requestedCheckOut, reason }) {
    const sql = `
      INSERT INTO time_adjust_requests (userId, attendanceId, requestedCheckIn, requestedCheckOut, reason)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [res] = await db.query(sql, [userId, attendanceId || null, requestedCheckIn || null, requestedCheckOut || null, reason || null]);
    return res.insertId;
  },
  async listMine(userId) {
    const sql = `
      SELECT * FROM time_adjust_requests
      WHERE userId = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  },
  async listByUser(userId) {
    const sql = `
      SELECT * FROM time_adjust_requests
      WHERE userId = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
  },
  async updateStatus(id, status) {
    const sql = `UPDATE time_adjust_requests SET status = ? WHERE id = ?`;
    await db.query(sql, [status, id]);
  },
  async getById(id) {
    const sql = `SELECT * FROM time_adjust_requests WHERE id = ?`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  }
};
