const db = require('../../core/database/mysql');

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS work_reports (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      date DATE NOT NULL,
      attendanceId BIGINT UNSIGNED NULL,
      work_type VARCHAR(24) NULL,
      site VARCHAR(120) NOT NULL,
      work TEXT NOT NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
      rejected_reason TEXT NULL,
      approved_by BIGINT UNSIGNED NULL,
      approved_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (date),
      INDEX idx_user (userId),
      INDEX idx_user_date (userId, date),
      INDEX idx_status (status),
      CONSTRAINT fk_work_report_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN work_type VARCHAR(24) NULL`);
  } catch (e) { /* silently ignored */ }
  try {
    await db.query(`ALTER TABLE work_reports DROP INDEX uniq_user_date`);
  } catch (e) { /* already dropped or never existed */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD INDEX idx_user_date (userId, date)`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN start_time TIME NULL`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN end_time TIME NULL`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN rejected_reason TEXT NULL`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN approved_by BIGINT UNSIGNED NULL`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD COLUMN approved_at DATETIME NULL`);
  } catch (e) { /* already exists */ }
  try {
    await db.query(`ALTER TABLE work_reports ADD INDEX idx_status (status)`);
  } catch (e) { /* already exists */ }
  try {
    const [fk] = await db.query(`
      SELECT CONSTRAINT_NAME AS name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'work_reports'
        AND COLUMN_NAME = 'attendanceId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      LIMIT 1
    `);
    if (!fk || !fk.length) {
      try {
        await db.query(`
          ALTER TABLE work_reports
          ADD CONSTRAINT fk_work_report_attendance
          FOREIGN KEY (attendanceId) REFERENCES attendance(id)
          ON DELETE SET NULL
        `);
      } catch (e) { /* silently ignored */ }
    }
  } catch (e) { /* silently ignored */ }
}

async function ensureMonthClosureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS work_report_month_closures (
      month CHAR(7) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
      closed_by BIGINT UNSIGNED NULL,
      closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, month),
      INDEX idx_closed_by (closed_by),
      CONSTRAINT fk_wr_close_user FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    await db.query(`ALTER TABLE work_report_month_closures ADD COLUMN tenant_id BIGINT UNSIGNED NOT NULL DEFAULT 0`);
  } catch (e) { /* already has tenant_id */ }
  try {
    const [[pk]] = await db.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'work_report_month_closures'
        AND CONSTRAINT_NAME = 'PRIMARY'
        AND COLUMN_NAME = 'tenant_id'
    `);
    if (!pk || !pk.cnt) {
      await db.query(`ALTER TABLE work_report_month_closures DROP PRIMARY KEY, ADD PRIMARY KEY (tenant_id, month)`);
    }
  } catch (e) { /* already migrated or column not ready yet */ }
}

module.exports = {
  ensureSchema,
  ensureMonthClosureSchema,
  async isMonthClosed(month, tenantId = 0) {
    const [[row]] = await db.query(`
      SELECT month
      FROM work_report_month_closures
      WHERE month = ? AND tenant_id = ?
      LIMIT 1
    `, [month, tenantId || 0]);
    return !!row;
  },
  async closeMonth(month, closedBy, tenantId = 0) {
    await db.query(`
      INSERT INTO work_report_month_closures (month, tenant_id, closed_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE closed_by = closed_by
    `, [month, tenantId || 0, closedBy || null]);
    return { month, closed: true };
  },
  async create({ userId, date, startTime, endTime, workType, site, work, status = 'pending', attendanceId = null }) {
    const [res] = await db.query(`
      INSERT INTO work_reports (userId, date, start_time, end_time, work_type, site, work, status, attendanceId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, date, startTime || null, endTime || null, workType || null, site, work, status, attendanceId || null]);
    return res.insertId || null;
  },
  // check-in時に自動生成した空の作業報告行に、check-out時刻を反映する。
  // 従業員が既に内容を編集していても end_time だけを更新するので上書きの心配はない。
  async setEndTimeByAttendanceId(attendanceId, endTime) {
    if (!attendanceId) return false;
    const [res] = await db.query(
      `UPDATE work_reports SET end_time = ? WHERE attendanceId = ? AND end_time IS NULL`,
      [endTime || null, attendanceId]
    );
    return res.affectedRows > 0;
  },
  async update(id, { startTime, endTime, workType, site, work } = {}, { ownerUserId } = {}) {
    const fields = [];
    const params = [];
    if (startTime !== undefined) { fields.push('start_time = ?'); params.push(startTime || null); }
    if (endTime !== undefined) { fields.push('end_time = ?'); params.push(endTime || null); }
    if (workType !== undefined) { fields.push('work_type = ?'); params.push(workType || null); }
    if (site !== undefined) { fields.push('site = ?'); params.push(site); }
    if (work !== undefined) { fields.push('work = ?'); params.push(work); }
    if (!fields.length) return false;
    let sql = `UPDATE work_reports SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    if (ownerUserId) { sql += ' AND userId = ?'; params.push(ownerUserId); }
    const [res] = await db.query(sql, params);
    return res.affectedRows > 0;
  },
  async remove(id, { ownerUserId } = {}) {
    let sql = `DELETE FROM work_reports WHERE id = ?`;
    const params = [id];
    if (ownerUserId) { sql += ' AND userId = ?'; params.push(ownerUserId); }
    const [res] = await db.query(sql, params);
    return res.affectedRows > 0;
  },
  async setStatus(id, status, { approvedBy, rejectedReason } = {}) {
    const [res] = await db.query(`
      UPDATE work_reports
      SET status = ?,
          approved_by = ?,
          approved_at = ?,
          rejected_reason = ?
      WHERE id = ?
    `, [
      status,
      approvedBy || null,
      status === 'approved' ? new Date() : null,
      status === 'rejected' ? (rejectedReason || null) : null,
      id
    ]);
    return res.affectedRows > 0;
  },
  async getById(id) {
    const [[row]] = await db.query(`SELECT * FROM work_reports WHERE id = ? LIMIT 1`, [id]);
    return row || null;
  },
  async listByUserDate(userId, date) {
    const [rows] = await db.query(`
      SELECT *
      FROM work_reports
      WHERE userId = ? AND date = ?
      ORDER BY start_time IS NULL, start_time ASC, id ASC
    `, [userId, date]);
    return rows || [];
  },
  async listForAdmin({ tenantId, month, dept, userId, status, q, page = 1, pageSize = 20 } = {}) {
    const baseWhere = ['1=1'];
    const baseParams = [];
    if (month) {
      const [y, m] = String(month).split('-').map(n => parseInt(n, 10));
      const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      baseWhere.push('wr.date >= ? AND wr.date <= ?');
      baseParams.push(start, end);
    }
    if (tenantId) { baseWhere.push('u.tenant_id = ?'); baseParams.push(tenantId); }
    if (dept) { baseWhere.push('d.name = ?'); baseParams.push(dept); }
    if (userId) { baseWhere.push('wr.userId = ?'); baseParams.push(userId); }
    if (q) {
      baseWhere.push('(u.employee_code LIKE ? OR u.username LIKE ?)');
      baseParams.push(`%${q}%`, `%${q}%`);
    }
    const baseWhereSql = baseWhere.join(' AND ');

    const [[summaryRow]] = await db.query(`
      SELECT
        COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN wr.start_time IS NOT NULL AND wr.end_time IS NOT NULL
          THEN TIME_TO_SEC(TIMEDIFF(wr.end_time, wr.start_time)) / 60 ELSE 0 END), 0) AS totalMinutes,
        SUM(CASE WHEN wr.status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN wr.status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM work_reports wr
      JOIN users u ON u.id = wr.userId
      LEFT JOIN departments d ON d.id = u.departmentId
      WHERE ${baseWhereSql}
    `, baseParams);

    const itemsWhere = baseWhere.slice();
    const itemsParams = baseParams.slice();
    if (status) { itemsWhere.push('wr.status = ?'); itemsParams.push(status); }
    const itemsWhereSql = itemsWhere.join(' AND ');

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM work_reports wr
      JOIN users u ON u.id = wr.userId
      LEFT JOIN departments d ON d.id = u.departmentId
      WHERE ${itemsWhereSql}
    `, itemsParams);

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (safePage - 1) * safePageSize;
    const [rows] = await db.query(`
      SELECT wr.id, wr.userId, wr.date, wr.site, wr.work, wr.work_type AS workType,
             COALESCE(wr.start_time, att.firstIn) AS startTime,
             COALESCE(wr.end_time, att.lastOut) AS endTime,
             wr.status,
             wr.rejected_reason AS rejectedReason, wr.approved_by AS approvedBy, wr.approved_at AS approvedAt,
             u.employee_code AS employeeCode, u.username AS username,
             u.departmentId AS departmentId, d.name AS departmentName
      FROM work_reports wr
      JOIN users u ON u.id = wr.userId
      LEFT JOIN departments d ON d.id = u.departmentId
      LEFT JOIN (
        SELECT userId, DATE(checkIn) AS d, MIN(TIME(checkIn)) AS firstIn, MAX(TIME(checkOut)) AS lastOut
        FROM attendance
        WHERE checkIn IS NOT NULL
        GROUP BY userId, DATE(checkIn)
      ) att ON att.userId = wr.userId AND att.d = wr.date
      WHERE ${itemsWhereSql}
      ORDER BY wr.date ASC, wr.start_time IS NULL, wr.start_time ASC, wr.id ASC
      LIMIT ? OFFSET ?
    `, [...itemsParams, safePageSize, offset]);

    return {
      items: rows || [],
      total: Number(total) || 0,
      page: safePage,
      pageSize: safePageSize,
      summary: {
        count: Number(summaryRow?.count) || 0,
        totalMinutes: Math.round(Number(summaryRow?.totalMinutes) || 0),
        pending: Number(summaryRow?.pending) || 0,
        rejected: Number(summaryRow?.rejected) || 0
      }
    };
  },
  async listByUserMonth(userId, month) {
    const [y, m] = String(month || '').split('-').map(n => parseInt(n, 10));
    const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [rows] = await db.query(`
      SELECT *
      FROM work_reports
      WHERE userId = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `, [userId, start, end]);
    return rows || [];
  },
  async listByMonth(month) {
    const [y, m] = String(month || '').split('-').map(n => parseInt(n, 10));
    const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [rows] = await db.query(`
      SELECT *
      FROM work_reports
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC, updated_at DESC
    `, [start, end]);
    return rows || [];
  },
  async listByDate(date) {
    const [rows] = await db.query(`
      SELECT *
      FROM work_reports
      WHERE date = ?
      ORDER BY updated_at DESC
    `, [date]);
    return rows || [];
  }
};
