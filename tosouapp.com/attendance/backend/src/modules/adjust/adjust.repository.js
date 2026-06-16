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
  async updateStatus(id, status, adminNote = null) {
    const sql = `
      UPDATE time_adjust_requests
      SET status = ?, admin_note = CASE WHEN ? = 'rejected' THEN ? ELSE NULL END
      WHERE id = ?
    `;
    await db.query(sql, [status, status, adminNote || null, id]);
  },
  // Lấy detail adjust request
  async getById(id) {
    const sql = `SELECT * FROM time_adjust_requests WHERE id = ?`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  }
  // Xóa adjust request theo id
  ,
  async deleteById(id) {
    const sql = `DELETE FROM time_adjust_requests WHERE id = ?`;
    const [res] = await db.query(sql, [id]);
    return Number(res?.affectedRows || 0);
  }
  ,
  async updateFields(id, { requestedCheckIn, requestedCheckOut, reason }) {
    const sql = `
      UPDATE time_adjust_requests
      SET requestedCheckIn = ?, requestedCheckOut = ?, reason = ?
      WHERE id = ?
    `;
    const [res] = await db.query(sql, [
      requestedCheckIn || null,
      requestedCheckOut || null,
      reason || null,
      id
    ]);
    return Number(res?.affectedRows || 0);
  },
  async addMessage({ requestId, userId, message }) {
    const [res] = await db.query(
      `INSERT INTO time_adjust_messages (adjust_request_id, sender_user_id, message) VALUES (?, ?, ?)`,
      [requestId, userId, String(message)]
    );
    return res.insertId || 0;
  },
  async listMessages(requestId) {
    const [rows] = await db.query(
      `SELECT tm.id, tm.adjust_request_id, tm.sender_user_id, tm.message, tm.created_at,
              (SELECT COALESCE(u.username, u.email) FROM users u WHERE u.id = tm.sender_user_id) AS sender_name
       FROM time_adjust_messages tm
       WHERE tm.adjust_request_id = ?
       ORDER BY tm.created_at ASC, tm.id ASC`,
      [requestId]
    );
    return rows || [];
  }
};
// Lấy tất cả adjust requests cho admin
module.exports.listAll = async function() {
  const sql = `
    SELECT r.*, u.username, u.email
    FROM time_adjust_requests r
    LEFT JOIN users u ON r.userId = u.id
    ORDER BY r.created_at DESC
  `;
  const [rows] = await db.query(sql);
  return rows;
};

module.exports.listForManager = async function() {
  const sql = `
    SELECT r.*, u.username, u.email
    FROM time_adjust_requests r
    INNER JOIN users u ON r.userId = u.id
    WHERE u.role = 'employee'
    ORDER BY r.created_at DESC
  `;
  const [rows] = await db.query(sql);
  return rows;
};

module.exports.ensureSchema = async function() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS time_adjust_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      attendanceId BIGINT UNSIGNED NULL,
      requestedCheckIn DATETIME NULL,
      requestedCheckOut DATETIME NULL,
      reason TEXT NULL,
      admin_note TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    await db.query(`ALTER TABLE time_adjust_requests ADD COLUMN admin_note TEXT NULL AFTER reason`);
  } catch (e) {
    const msg = String(e?.message || '').toLowerCase();
    if (!msg.includes('duplicate column')) throw e;
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS time_adjust_messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      adjust_request_id BIGINT NOT NULL,
      sender_user_id BIGINT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_adjust_request_id (adjust_request_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

// Xóa tất cả requests của admin (cleanup test data)
module.exports.deleteAdminRequests = async function() {
  const sql = `
    DELETE r FROM time_adjust_requests r
    INNER JOIN users u ON r.userId = u.id
    WHERE u.role = 'admin'
  `;
  const [result] = await db.query(sql);
  return result.affectedRows;
};
