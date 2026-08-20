'use strict';

const repo = require('./attendance.repository');
const db = require('../../core/database/mysql');
const noticesRepo = require('../notices/notices.repository');
const userRepo = require('../users/user.repository');
const log = require('../../core/logger');
const { nowJSTMySQL } = require('../../utils/dateTime');
const { timesheetMaxDays } = require('../../config/env');
const {
  resolveTargetUserId,
  getMonthStatusValue,
  assertMonthWritable,
} = require('./attendance.utils');

// ─── Shift definitions ────────────────────────────────────────────────────────

exports.listShiftDefinitions = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const tid = req.tenantId || null;
    const rows = await repo.listShiftDefinitions({ tenantId: tid });
    res.status(200).json(rows || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.postShiftDefinition = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const start_time = String(b.start_time || '').trim();
    const end_time = String(b.end_time || '').trim();
    const break_minutes = b.break_minutes == null ? 60 : parseInt(String(b.break_minutes), 10);
    const working_days = b.working_days == null ? null : String(b.working_days);
    if (!name || !/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ message: 'Invalid name/start_time/end_time' });
    }
    const tid = req.tenantId || null;
    const row = await repo.upsertShiftDefinition({ name, start_time, end_time, break_minutes, working_days, tenantId: tid });
    res.status(200).json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteShiftDefinition = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const id = parseInt(String(req.params?.id || ''), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const tid = req.tenantId || null;
    const r = await repo.deleteShiftDefinitionById(id, { tenantId: tid });
    if (r?.notFound) return res.status(404).json({ message: 'Not found' });
    if (r?.inUse) return res.status(409).json({ message: 'Shift is in use', assignedCount: r.assignedCount ?? null });
    if (!r || !r.deleted) return res.status(500).json({ message: 'Delete failed' });
    res.status(200).json({ ok: true, deleted: r.deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Shift assignments ────────────────────────────────────────────────────────

exports.getShiftAssignments = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const from = String(req.query?.from || '1900-01-01').slice(0, 10);
    const to = String(req.query?.to || '2999-12-31').slice(0, 10);
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const tid = req.tenantId || null;
    const assigns = await repo.listShiftAssignmentsBetween(userId, from, to, { tenantId: tid }).catch(() => []);
    const shiftDefs = await repo.listShiftDefinitions({ tenantId: tid }).catch(() => []);
    const shiftById = new Map((shiftDefs || []).map(s => [String(s.id), s]));
    const shiftByName = new Map((shiftDefs || []).map(s => [String(s.name), s]));
    const resolveDefForAssign = (a) => {
      let def = shiftById.get(a?.shiftId != null ? String(a.shiftId) : '') || null;
      if (!def) def = shiftByName.get(a?.shift != null ? String(a.shift) : '') || null;
      return def;
    };
    const items = (assigns || []).map(a => {
      const def = resolveDefForAssign(a);
      return { id: a?.id || null, start_date: String(a?.start_date || '').slice(0, 10) || null, end_date: a?.end_date ? String(a.end_date).slice(0, 10) : null, shift: def ? { id: def.id, name: def.name, start_time: def.start_time, end_time: def.end_time, break_minutes: def.break_minutes, standard_minutes: def.standard_minutes } : null };
    });
    res.status(200).json({ userId, from, to, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.postShiftAssignment = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const b = req.body || {};
    const shiftId = parseInt(String(b.shiftId || ''), 10);
    const startDate = String(b.startDate || '').slice(0, 10);
    const endDate = b.endDate == null || b.endDate === '' ? null : String(b.endDate).slice(0, 10);
    if (!userId || !shiftId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ message: 'Missing userId/shiftId/startDate' });
    }
    const tid = req.tenantId || null;
    await repo.assignShiftToUser(userId, shiftId, startDate, endDate, { tenantId: tid });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteShiftAssignment = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const id = parseInt(String(req.params.id), 10);
    if (!userId || !id) return res.status(400).json({ message: 'Missing userId/id' });
    const tid = req.tenantId || null;
    const r = await repo.deleteShiftAssignment(id, userId, { tenantId: tid });
    if (!r?.ok) return res.status(404).json({ message: 'Not found' });
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Shift bulk / approvals / matrix ─────────────────────────────────────────

exports.postShiftsBulk = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const tid = req.tenantId || null;
    const { month, shifts } = req.body || {};
    if (!month || !Array.isArray(shifts)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const shift of shifts) {
        if (!shift.date) continue;
        await conn.query(`
          INSERT INTO shift_requests (userId, date, status, leaveType, reason, detail, tenant_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status = VALUES(status), leaveType = VALUES(leaveType), reason = VALUES(reason), detail = VALUES(detail)
        `, [userId, shift.date, shift.status || 'OFF', shift.leaveType || null, shift.reason || null, shift.detail || null, tid]);
      }
      await conn.query(`
        INSERT INTO shift_month_status (userId, month, status, tenant_id) VALUES (?, ?, 'PENDING', ?)
        ON DUPLICATE KEY UPDATE status = 'PENDING'
      `, [userId, month, tid]);
      await conn.commit();
      res.status(200).json({ success: true, message: 'Shifts saved successfully', data: { submission_status: 'PENDING' } });
      try {
        const u = await userRepo.getUserById(userId).catch(() => null);
        const userName = u ? (u.username || u.email || '従業員') : '従業員';
        await noticesRepo.createAdminNotification({ kind: 'shift_submit', title: 'シフト提出', message: `${userName} さんが${month}のシフトを提出しました`, linkUrl: '/admin/attendance/shifts-approvals', payload: { source: 'shift', userId, month }, createdBy: userId, audience: 'admin_manager' });
      } catch (e) { /* silently ignored */ }
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[postShiftsBulk]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getShiftApprovals = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { month } = req.query || {};
    if (!month) return res.status(400).json({ message: 'Missing month' });
    const tid = req.tenantId || null;
    const where = ['s.month = ?', 'u.role NOT IN (?)', 'u.employment_status = ?'];
    const params = [month, ['admin', 'manager'], 'active'];
    if (tid != null) { where.push('u.tenant_id = ?'); params.push(tid); }
    const [rows] = await db.query(`
      SELECT s.id, s.userId, s.month, s.status, s.updated_at, u.username, u.email, u.employee_code, u.employment_type, d.name as departmentName
      FROM shift_month_status s
      JOIN users u ON s.userId = u.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE ${where.join(' AND ')}
      ORDER BY s.updated_at DESC
    `, params);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShiftMatrix = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { month, department, limit, offset } = req.query || {};
    if (!month) return res.status(400).json({ message: 'Missing month' });
    const tid = req.tenantId || null;
    const userBranchId = req.user?.branchId || null;
    const branchFilter = (role === 'manager' && userBranchId) ? userBranchId : null;

    let userQuery = `
      SELECT u.id, u.username, u.email, u.employee_code, u.employment_type, d.name as departmentName, s.status as submission_status
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      LEFT JOIN shift_month_status s ON u.id = s.userId AND s.month = ?
      WHERE u.role NOT IN ('admin', 'manager') AND u.employment_status = 'active'
    `;
    const userParams = [month];
    if (tid != null) { userQuery += ` AND u.tenant_id = ?`; userParams.push(tid); }
    if (branchFilter) { userQuery += ` AND u.branch_id = ?`; userParams.push(branchFilter); }
    if (department) { userQuery += ` AND d.name = ?`; userParams.push(String(department)); }
    userQuery += ` ORDER BY CASE WHEN d.name = '工事部' THEN 1 ELSE 2 END, d.name, u.employment_type, u.id`;
    if (limit) {
      const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
      const off = Math.max(parseInt(offset, 10) || 0, 0);
      userQuery += ` LIMIT ? OFFSET ?`;
      userParams.push(lim, off);
    }
    const [users] = await db.query(userQuery, userParams);

    let shifts = [];
    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      try {
        const placeholders = userIds.map(() => '?').join(',');
        const [rows1] = await db.query(`SELECT userId, date, status, leaveType, reason, detail FROM shift_requests WHERE userId IN (${placeholders}) AND date LIKE ?`, [...userIds, `${month}-%`]);
        shifts = rows1.map(r => ({ ...r, date: String(r.date).slice(0, 10) }));
      } catch (e1) {
        try {
          const placeholders = userIds.map(() => '?').join(',');
          const [rows2] = await db.query(`SELECT user_id as userId, start_date as date, 'WORKING' as status FROM user_shift_assignments WHERE user_id IN (${placeholders}) AND start_date LIKE ?`, [...userIds, `${month}-%`]);
          shifts = rows2.map(r => ({ ...r, date: String(r.date).slice(0, 10) }));
        } catch (e2) {
          console.warn('Fallback query failed too:', e2.message);
        }
      }
    }

    const matrix = users.map(u => {
      const schedule = {};
      shifts.filter(s => s.userId === u.id).forEach(s => { schedule[s.date] = s; });
      return { id: u.id, username: u.username || u.email, employee_code: u.employee_code, employment_type: u.employment_type, departmentName: u.departmentName, submission_status: u.submission_status, schedule };
    });
    res.status(200).json(matrix);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllEmployeeShifts = async (req, res) => {
  try {
    const { month } = req.query || {};
    if (!month) return res.status(400).json({ message: 'Missing month' });
    const tid = req.tenantId || null;

    let userSql = `
      SELECT u.id, u.username, u.email, u.employee_code, u.employment_type, d.name as departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE u.employment_status = 'active' AND u.role NOT IN ('admin', 'manager')
    `;
    const userParams = [];
    if (tid != null) { userSql += ` AND u.tenant_id = ?`; userParams.push(tid); }
    userSql += ` ORDER BY CASE WHEN d.name = '工事部' THEN 1 ELSE 2 END, u.employee_code ASC, u.id ASC`;
    const [users] = await db.query(userSql, userParams);
    if (!users || users.length === 0) return res.status(200).json([]);

    const userIds = users.map(u => u.id);
    const [shifts] = await db.query(`SELECT userId, date, status, leaveType FROM shift_requests WHERE userId IN (?) AND date LIKE ?`, [userIds, `${month}-%`]);

    const matrix = users.map(u => {
      const schedule = {};
      shifts.filter(s => s.userId === u.id).forEach(s => { schedule[s.date] = s; });
      return { id: u.id, username: u.username || u.email, employee_code: u.employee_code, employment_type: u.employment_type, departmentName: u.departmentName, schedule };
    });
    res.status(200).json(matrix);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveShiftMonth = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { userId, month, status } = req.body || {};
    if (!userId || !month || !status) return res.status(400).json({ message: 'Missing fields' });
    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING', 'draft'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const tid = req.tenantId || null;
    // Verify userId belongs to the same tenant
    if (tid != null) {
      const [userRows] = await db.query('SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1', [userId, tid]);
      if (!userRows || userRows.length === 0) return res.status(404).json({ message: 'User not found in tenant' });
    }
    await db.query(`UPDATE shift_month_status SET status = ? WHERE userId = ? AND month = ?`, [status, userId, month]);

    // Khi APPROVED: tự động lưu kubun '休日' cho ngày OFF và gửi thông báo cho nhân viên
    if (status === 'APPROVED') {
      try {
        const [shifts] = await db.query(
          `SELECT date, status, leaveType FROM shift_requests WHERE userId = ? AND date LIKE ?`,
          [userId, `${month}-%`]
        );
        const offDates = [];
        for (const s of (shifts || [])) {
          if (s.status === 'OFF') {
            const d = String(s.date).slice(0, 10);
            offDates.push(d);
            // Upsert kubun = '休日' cho ngày OFF
            await repo.upsertDaily(userId, d, { kubun: '休日' });
          }
        }
        // Gửi thông báo cho nhân viên nếu có ngày OFF
        if (offDates.length > 0) {
          const u = await userRepo.getUserById(userId).catch(() => null);
          const userName = u ? (u.username || u.email || '従業員') : '従業員';
          const datesStr = offDates.length <= 3
            ? offDates.map(d => d.slice(5).replace('-', '/')).join(', ')
            : offDates.slice(0, 3).map(d => d.slice(5).replace('-', '/')).join(', ') + ` 他${offDates.length - 3}日`;
          await noticesRepo.createNotice({
            targetUserId: userId,
            targetDate: null,
            targetMonth: month,
            message: `${month.replace('-', '年')}月のシフトが承認されました。休日: ${datesStr}`,
            createdBy: req.user?.id || null,
            kind: 'shift_approved',
            title: 'シフト承認',
            audience: 'all',
            tenantId: req.tenantId || null,
          });
        }
      } catch (e) {
        log.warn('shift_approve_auto_kubun_failed', { userId, month, error_message: e.message });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserShiftsForMonth = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { userId, month } = req.query || {};
    if (!userId || !month) return res.status(400).json({ message: 'Missing fields' });
    const tid = req.tenantId || null;
    if (tid != null) {
      const [userRows] = await db.query('SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1', [userId, tid]);
      if (!userRows || userRows.length === 0) return res.status(404).json({ message: 'User not found in tenant' });
    }
    const [rows] = await db.query(`SELECT date, status, leaveType, reason, detail FROM shift_requests WHERE userId = ? AND date LIKE ?`, [userId, `${month}-%`]);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyMonthlyShifts = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    const { month } = req.params || {};
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!month) return res.status(400).json({ message: 'Missing month' });
    // Verify userId belongs to the same tenant when viewing another user's data
    const tid = req.tenantId || null;
    if (tid != null && String(userId) !== String(req.user?.id)) {
      const [userRows] = await db.query('SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1', [userId, tid]);
      if (!userRows || userRows.length === 0) return res.status(404).json({ message: 'User not found in tenant' });
    }

    let submission_status = 'draft';
    try {
      const [statusRows] = await db.query(`SELECT status FROM shift_month_status WHERE userId = ? AND month = ?`, [userId, month]);
      if (statusRows && statusRows.length > 0) submission_status = statusRows[0].status;
    } catch (e) { /* table might not exist */ }

    let schedule = {};
    try {
      const [shiftRows] = await db.query(`SELECT date, status, leaveType, reason, detail FROM shift_requests WHERE userId = ? AND date LIKE ?`, [userId, `${month}-%`]);
      shiftRows.forEach(r => { schedule[String(r.date).slice(0, 10)] = r; });
    } catch (e) { /* table might not exist */ }

    res.status(200).json({ success: true, data: { submission_status, schedule } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
