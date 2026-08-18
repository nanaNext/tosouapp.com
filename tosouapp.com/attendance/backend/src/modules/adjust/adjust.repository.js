const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

module.exports = {
  async create({ userId, attendanceId, requestedCheckIn, requestedCheckOut, reason, tenantId }) {
    const tid = _tid(tenantId);
    const sql = `
      INSERT INTO time_adjust_requests (userId, attendanceId, requestedCheckIn, requestedCheckOut, reason, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [res] = await db.query(sql, [userId, attendanceId || null, requestedCheckIn || null, requestedCheckOut || null, reason || null, tid]);
    return res.insertId;
  },
  async listMine(userId, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['userId = ?'];
    const params = [userId];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const sql = `
      SELECT * FROM time_adjust_requests
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async listByUser(userId, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['userId = ?'];
    const params = [userId];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const sql = `
      SELECT * FROM time_adjust_requests
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async updateStatus(id, status, adminNote = null, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['id = ?'];
    const params = [status, status, adminNote || null, id];
    if (tid != null) {
      where.unshift('tenant_id = ?');
      params.splice(3, 0, tid);
    }
    const sql = `
      UPDATE time_adjust_requests
      SET status = ?, admin_note = CASE WHEN ? = 'rejected' THEN ? ELSE NULL END
      WHERE ${where.join(' AND ')}
    `;
    await db.query(sql, params);
  },
  async getById(id, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['id = ?'];
    const params = [id];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const sql = `SELECT * FROM time_adjust_requests WHERE ${where.join(' AND ')}`;
    const [rows] = await db.query(sql, params);
    return rows[0];
  },
  async deleteById(id, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['id = ?'];
    const params = [id];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const sql = `DELETE FROM time_adjust_requests WHERE ${where.join(' AND ')}`;
    const [res] = await db.query(sql, params);
    return Number(res?.affectedRows || 0);
  },
  async updateFields(id, { requestedCheckIn, requestedCheckOut, reason, tenantId }) {
    const tid = _tid(tenantId);
    const fields = [];
    const params = [];
    fields.push('requestedCheckIn = ?'); params.push(requestedCheckIn || null);
    fields.push('requestedCheckOut = ?'); params.push(requestedCheckOut || null);
    fields.push('reason = ?'); params.push(reason || null);
    params.push(id);
    const where = ['id = ?'];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const sql = `
      UPDATE time_adjust_requests
      SET ${fields.join(', ')}
      WHERE ${where.join(' AND ')}
    `;
    const [res] = await db.query(sql, params);
    return Number(res?.affectedRows || 0);
  },
  async addMessage({ requestId, userId, message, tenantId }) {
    const tid = _tid(tenantId);
    if (tid != null) {
      const [check] = await db.query(
        `SELECT id FROM time_adjust_requests WHERE id = ? AND tenant_id = ?`,
        [requestId, tid]
      );
      if (!check || !check.length) return 0;
    }
    const [res] = await db.query(
      `INSERT INTO time_adjust_messages (adjust_request_id, sender_user_id, message) VALUES (?, ?, ?)`,
      [requestId, userId, String(message)]
    );
    return res.insertId || 0;
  },
  async listMessages(requestId, tenantId = null) {
    const tid = _tid(tenantId);
    const where = ['tm.adjust_request_id = ?'];
    const params = [requestId];
    if (tid != null) {
      where.push('r.tenant_id = ?');
      params.push(tid);
    }
    const [rows] = await db.query(
      `SELECT tm.id, tm.adjust_request_id, tm.sender_user_id, tm.message, tm.created_at,
              (SELECT COALESCE(u.username, u.email) FROM users u WHERE u.id = tm.sender_user_id) AS sender_name
       FROM time_adjust_messages tm
       INNER JOIN time_adjust_requests r ON r.id = tm.adjust_request_id
       WHERE ${where.join(' AND ')}
       ORDER BY tm.created_at ASC, tm.id ASC`,
      params
    );
    return rows || [];
  }
};

module.exports.listAll = async function(tenantId = null) {
  const tid = _tid(tenantId);
  const where = [];
  const params = [];
  if (tid != null) {
    where.push('r.tenant_id = ?');
    params.push(tid);
  }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `
    SELECT r.*, u.username, u.email
    FROM time_adjust_requests r
    LEFT JOIN users u ON r.userId = u.id
    ${wsql}
    ORDER BY r.created_at DESC
  `;
  const [rows] = await db.query(sql, params);
  return rows;
};

module.exports.listForManager = async function(tenantId = null) {
  const tid = _tid(tenantId);
  const where = ['u.role = \'employee\''];
  const params = [];
  if (tid != null) {
    where.push('r.tenant_id = ?');
    params.push(tid);
  }
  const sql = `
    SELECT r.*, u.username, u.email
    FROM time_adjust_requests r
    INNER JOIN users u ON r.userId = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY r.created_at DESC
  `;
  const [rows] = await db.query(sql, params);
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
  try {
    await db.query(`ALTER TABLE time_adjust_requests ADD COLUMN tenant_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column may exist */ }
  try {
    await db.query(`ALTER TABLE time_adjust_requests ADD INDEX idx_tar_tid (tenant_id)`);
  } catch (e) { /* index may exist */ }
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

module.exports.deleteAdminRequests = async function() {
  const sql = `
    DELETE r FROM time_adjust_requests r
    INNER JOIN users u ON r.userId = u.id
    WHERE u.role = 'admin'
  `;
  const [result] = await db.query(sql);
  return result.affectedRows;
};
