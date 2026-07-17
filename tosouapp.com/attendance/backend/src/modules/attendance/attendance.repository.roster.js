'use strict';
const db = require('../../core/database/mysql');

module.exports = {
  async getUserWorkDetails(userId, limit = 10) {
    const [rows] = await db.query(`
      SELECT id, start_date, end_date, company_name, work_place_address, work_content, role_title, responsibility_level
      FROM user_work_details
      WHERE userId = ?
      ORDER BY start_date DESC, id DESC
      LIMIT ?
    `, [userId, limit]);
    return rows || [];
  },
  async getTodaySummaryStats(dateStr) {
    const [[{ c_checkin } = { c_checkin: 0 }]] = await db.query(`
      SELECT COUNT(DISTINCT userId) AS c_checkin
      FROM attendance
      WHERE DATE(checkIn) = ?
    `, [dateStr]);
    const [[{ c_open } = { c_open: 0 }]] = await db.query(`
      SELECT COUNT(DISTINCT userId) AS c_open
      FROM attendance
      WHERE DATE(checkIn) = ? AND checkOut IS NULL
    `, [dateStr]);
    const [[{ c_active } = { c_active: 0 }]] = await db.query(`
      SELECT COUNT(*) AS c_active
      FROM users
      WHERE employment_status = 'active'
        AND role IN ('employee','manager')
    `);
    const [[{ c_leave_users } = { c_leave_users: 0 }]] = await db.query(`
      SELECT COUNT(DISTINCT userId) AS c_leave_users
      FROM leave_requests
      WHERE status = 'approved'
        AND ? BETWEEN startDate AND endDate
    `, [dateStr]);
    return { c_checkin, c_open, c_active, c_leave_users };
  },
  async getTodayAttendanceRecords(userId, dateStr) {
    const [rows] = await db.query(`
      SELECT id, checkIn, checkOut
      FROM attendance
      WHERE userId = ?
        AND (
          DATE(checkIn) = ?
          OR (checkIn IS NULL AND DATE(checkOut) = ?)
        )
      ORDER BY COALESCE(checkIn, checkOut) DESC
    `, [userId, dateStr, dateStr]);
    return rows || [];
  },
  async getTodayRosterItems(date) {
    const [rows] = await db.query(`
      SELECT
        u.id AS userId,
        u.employee_code AS employeeCode,
        u.username AS username,
        u.role AS role,
        u.employment_type AS employmentType,
        u.departmentId AS departmentId,
        d.name AS departmentName,
        a.id AS attendanceId,
        a.shiftId AS shiftId,
        a.checkIn AS checkIn,
        a.checkOut AS checkOut,
        a.location AS site,
        a.memo AS work,
        ad.kubun AS dailyKubun,
        sr.status AS shiftStatus,
        sr.leaveType AS shiftLeaveType
      FROM users u
      LEFT JOIN departments d
        ON d.id = u.departmentId
      LEFT JOIN leave_requests lr
        ON lr.userId = u.id
       AND lr.status = 'approved'
       AND ? BETWEEN lr.startDate AND lr.endDate
      LEFT JOIN attendance_daily ad
        ON ad.userId = u.id AND ad.date = ?
      LEFT JOIN shift_requests sr
        ON sr.userId = u.id AND sr.date = ?
      LEFT JOIN attendance a
        ON a.userId = u.id AND (DATE(a.checkIn) = ? OR (a.checkIn IS NULL AND DATE(a.checkOut) = ?))
      WHERE u.employment_status = 'active'
        AND u.role IN ('employee','manager')
        AND lr.id IS NULL
      ORDER BY
        COALESCE(u.employee_code, '') ASC,
        u.id ASC,
        a.checkIn ASC
    `, [date, date, date, date, date]);
    return rows || [];
  },
  async getTodayPlannedItems(date) {
    const [rows] = await db.query(`
      SELECT
        u.id AS userId,
        u.employee_code AS employeeCode,
        u.username AS username,
        u.role AS role,
        u.departmentId AS departmentId,
        d.name AS departmentName,
        CASE WHEN lr.id IS NULL THEN 0 ELSE 1 END AS isLeave,
        lr.type AS leaveType
      FROM users u
      LEFT JOIN departments d
        ON d.id = u.departmentId
      LEFT JOIN leave_requests lr
        ON lr.userId = u.id
       AND lr.status = 'approved'
       AND ? BETWEEN lr.startDate AND lr.endDate
      WHERE u.employment_status = 'active'
        AND u.role IN ('employee','manager')
      ORDER BY COALESCE(u.employee_code, '') ASC, u.id ASC
    `, [date]);
    return rows || [];
  },
  async getActiveUserIds(departmentId = null) {
    const params = [];
    let sql = `
      SELECT u.id AS userId
      FROM users u
      WHERE u.employment_status = 'active'
        AND u.role IN ('employee','manager')
    `;
    if (departmentId != null) {
      sql += ` AND u.departmentId = ?`;
      params.push(parseInt(String(departmentId), 10));
    }
    const [rows] = await db.query(sql, params);
    return rows || [];
  },
  async recordGoOut(userId, dateStr, time, type, reason) {
    const sql = `
      INSERT INTO attendance_go_out (userId, date, go_out_time, type, reason)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [userId, dateStr, time, type, reason || null]);
    return result.insertId;
  },
  async recordReturn(userId, dateStr, time) {
    const sql = `
      UPDATE attendance_go_out
      SET return_time = ?, status = '完了'
      WHERE userId = ? AND date = ? AND return_time IS NULL
      ORDER BY go_out_time DESC LIMIT 1
    `;
    const [result] = await db.query(sql, [time, userId, dateStr]);
    return result.affectedRows;
  },
  async getGoOutRecords(userId, dateStr) {
    const sql = `
      SELECT id, go_out_time, return_time, type, reason, status, admin_note
      FROM attendance_go_out
      WHERE userId = ? AND date = ?
      ORDER BY go_out_time ASC
    `;
    const [rows] = await db.query(sql, [userId, dateStr]);
    return rows || [];
  },
  async getGoOutRecordsByMonth(userId, year, month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const mStr = String(m).padStart(2, '0');
    const prefix = `${y}-${mStr}-`;
    const sql = `
      SELECT id, date, go_out_time, return_time, type, reason, status, admin_note
      FROM attendance_go_out
      WHERE userId = ? AND date LIKE ?
      ORDER BY date ASC, go_out_time ASC
    `;
    const [rows] = await db.query(sql, [userId, `${prefix}%`]);
    return rows || [];
  },
  async adminListGoOutRecords(filters) {
    let sql = `
      SELECT g.id, g.userId, u.username as employeeName, u.employee_code as employeeCode,
             g.date, g.go_out_time, g.return_time, g.type, g.reason, g.status, g.admin_note
      FROM attendance_go_out g
      LEFT JOIN users u ON g.userId = u.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.userId) {
      sql += ' AND g.userId = ?';
      params.push(filters.userId);
    }
    if (filters.date) {
      sql += ' AND g.date = ?';
      params.push(filters.date);
    }
    if (filters.month) {
      sql += ' AND g.date LIKE ?';
      params.push(`${filters.month}-%`);
    }
    if (filters.status) {
      sql += ' AND g.status = ?';
      params.push(filters.status);
    }
    if (filters.type) {
      sql += ' AND g.type = ?';
      params.push(filters.type);
    }
    sql += ' ORDER BY g.date DESC, g.go_out_time DESC';
    const [rows] = await db.query(sql, params);
    return rows || [];
  },
  async adminForceEndGoOut(id, returnTime, status, adminNote) {
    const sql = `
      UPDATE attendance_go_out
      SET return_time = ?, status = ?, admin_note = ?
      WHERE id = ?
    `;
    const [result] = await db.query(sql, [returnTime, status, adminNote, id]);
    return result.affectedRows;
  },
  async adminUpdateGoOut(id, goOutTime, returnTime, type, reason, adminNote) {
    const sql = `
      UPDATE attendance_go_out
      SET go_out_time = ?, return_time = ?, type = ?, reason = ?, status = '修正済み', admin_note = ?
      WHERE id = ?
    `;
    const [result] = await db.query(sql, [goOutTime, returnTime, type, reason, adminNote, id]);
    return result.affectedRows;
  },
  async adminDeleteGoOut(id) {
    const sql = `DELETE FROM attendance_go_out WHERE id = ?`;
    const [result] = await db.query(sql, [id]);
    return result.affectedRows;
  },
  async listWorkDetailsBetween(userId, fromDate, toDate) {
    const uid = parseInt(String(userId), 10);
    const from = String(fromDate || '').slice(0, 10);
    const to = String(toDate || '').slice(0, 10);
    if (!uid) return [];
    const whereFromTo = (from && to) ? `AND d.start_date <= ? AND (d.end_date IS NULL OR d.end_date >= ?)` : '';
    const params = [uid];
    if (from && to) { params.push(to, from); }
    const [rows] = await db.query(`
      SELECT *
      FROM user_work_details d
      WHERE d.userId = ?
      ${whereFromTo}
      ORDER BY d.start_date ASC, d.id ASC
    `, params);
    return rows || [];
  },
  async getWorkDetailById(id) {
    const xid = parseInt(String(id), 10);
    if (!xid) return null;
    const [rows] = await db.query(`SELECT * FROM user_work_details WHERE id = ? LIMIT 1`, [xid]);
    return rows && rows[0] ? rows[0] : null;
  },
  async createWorkDetail(userId, data) {
    const uid = parseInt(String(userId), 10);
    if (!uid) return null;
    const d = data && typeof data === 'object' ? data : {};
    const startDate = String(d.startDate || d.start_date || '').slice(0, 10);
    const endDate = d.endDate == null || d.endDate === '' ? null : String(d.endDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
    const company = d.companyName != null ? String(d.companyName).slice(0, 120) : null;
    const addr = d.workPlaceAddress != null ? String(d.workPlaceAddress).slice(0, 255) : null;
    const content = d.workContent != null ? String(d.workContent).slice(0, 255) : null;
    const roleTitle = d.roleTitle != null ? String(d.roleTitle).slice(0, 80) : null;
    const resp = d.responsibilityLevel != null ? String(d.responsibilityLevel).slice(0, 80) : null;
    const [res] = await db.query(`
      INSERT INTO user_work_details (userId, start_date, end_date, company_name, work_place_address, work_content, role_title, responsibility_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uid, startDate, endDate, company, addr, content, roleTitle, resp]);
    return res?.insertId || null;
  },
  async updateWorkDetail(id, userId, data) {
    const xid = parseInt(String(id), 10);
    const uid = parseInt(String(userId), 10);
    if (!xid || !uid) return { ok: false, updated: 0 };
    const d = data && typeof data === 'object' ? data : {};
    const fields = [];
    const vals = [];
    if (Object.prototype.hasOwnProperty.call(d, 'startDate') || Object.prototype.hasOwnProperty.call(d, 'start_date')) {
      fields.push(`start_date = ?`);
      vals.push(String(d.startDate || d.start_date).slice(0, 10));
    }
    if (Object.prototype.hasOwnProperty.call(d, 'endDate') || Object.prototype.hasOwnProperty.call(d, 'end_date')) {
      fields.push(`end_date = ?`);
      vals.push(d.endDate == null || d.endDate === '' ? null : String(d.endDate).slice(0, 10));
    }
    if (Object.prototype.hasOwnProperty.call(d, 'companyName')) { fields.push(`company_name = ?`); vals.push(d.companyName); }
    if (Object.prototype.hasOwnProperty.call(d, 'workPlaceAddress')) { fields.push(`work_place_address = ?`); vals.push(d.workPlaceAddress); }
    if (Object.prototype.hasOwnProperty.call(d, 'workContent')) { fields.push(`work_content = ?`); vals.push(d.workContent); }
    if (Object.prototype.hasOwnProperty.call(d, 'roleTitle')) { fields.push(`role_title = ?`); vals.push(d.roleTitle); }
    if (Object.prototype.hasOwnProperty.call(d, 'responsibilityLevel')) { fields.push(`responsibility_level = ?`); vals.push(d.responsibilityLevel); }
    if (!fields.length) return { ok: true, updated: 0 };
    vals.push(xid, uid);
    const [res] = await db.query(`UPDATE user_work_details SET ${fields.join(', ')} WHERE id = ? AND userId = ?`, vals);
    return { ok: true, updated: res?.affectedRows || 0 };
  },
  async deleteWorkDetail(id, userId) {
    const xid = parseInt(String(id), 10);
    const uid = parseInt(String(userId), 10);
    if (!xid || !uid) return { ok: false, deleted: 0 };
    const [res] = await db.query(`DELETE FROM user_work_details WHERE id = ? AND userId = ?`, [xid, uid]);
    return { ok: true, deleted: Number(res?.affectedRows || 0) };
  }
};
