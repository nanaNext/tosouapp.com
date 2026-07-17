'use strict';
const {
  service, auditRepo, rules, repo, formatInputToMySQLJST, userRepo,
  workReportRepo, salaryInputRepo, calculatePaidLeaveEntitlement,
  resolveEmploymentStartDate, leaveRepo, noticesRepo, metrics, db,
  calendarRepo, shiftReminderService, log,
  recordEndpointPerf, ensurePaidLeaveRequestForDate, syncPaidLeaveByKubun,
  resolveTargetUserId, parseMonth, isEditableMonth, getMonthStatusValue,
  assertMonthWritable, HOLIDAY_TYPES, isKoujiUser, buildOffSetFromCalendarDetail
} = require('./attendance._helpers');
const { timesheetMaxDays } = require('../../config/env');
const { nowJSTMySQL } = require('../../utils/dateTime');

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.listShiftDefinitions = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const rows = await repo.listShiftDefinitions();
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
    const row = await repo.upsertShiftDefinition({ name, start_time, end_time, break_minutes, working_days });
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
    const r = await repo.deleteShiftDefinitionById(id);
    if (r?.notFound) return res.status(404).json({ message: 'Not found' });
    if (r?.inUse) return res.status(409).json({ message: 'Shift is in use', assignedCount: r.assignedCount ?? null });
    if (!r || !r.deleted) return res.status(500).json({ message: 'Delete failed' });
    res.status(200).json({ ok: true, deleted: r.deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShiftAssignments = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const from = String(req.query?.from || '1900-01-01').slice(0, 10);
    const to = String(req.query?.to || '2999-12-31').slice(0, 10);
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const assigns = await repo.listShiftAssignmentsBetween(userId, from, to).catch(() => []);
    const shiftDefs = await repo.listShiftDefinitions().catch(() => []);
    const shiftById = new Map((shiftDefs || []).map(s => [String(s.id), s]));
    const shiftByName = new Map((shiftDefs || []).map(s => [String(s.name), s]));
    const resolveDefForAssign = (a) => {
      let def = null;
      const sid = a?.shiftId != null ? String(a.shiftId) : '';
      if (sid) def = shiftById.get(sid) || null;
      if (!def) {
        const nm = a?.shift != null ? String(a.shift) : '';
        if (nm) def = shiftByName.get(nm) || null;
      }
      return def;
    };
    const items = (assigns || []).map(a => {
      const def = resolveDefForAssign(a);
      return {
        id: a?.id || null,
        start_date: String(a?.start_date || '').slice(0, 10) || null,
        end_date: a?.end_date ? String(a.end_date).slice(0, 10) : null,
        shift: def ? {
          id: def.id,
          name: def.name,
          start_time: def.start_time,
          end_time: def.end_time,
          break_minutes: def.break_minutes,
          standard_minutes: def.standard_minutes
        } : null
      };
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
    await repo.assignShiftToUser(userId, shiftId, startDate, endDate);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.postShiftsBulk = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Tables shift_requests and shift_month_status are created by bootstrap migrations

    const { month, shifts } = req.body || {};
    if (!month || !Array.isArray(shifts)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    // Insert or update each shift
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      for (const shift of shifts) {
        if (!shift.date) continue;
        
        await conn.query(`
          INSERT INTO shift_requests (userId, date, status, leaveType, reason, detail)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            status = VALUES(status), 
            leaveType = VALUES(leaveType), 
            reason = VALUES(reason), 
            detail = VALUES(detail)
        `, [
          userId, 
          shift.date, 
          shift.status || 'OFF', 
          shift.leaveType || null, 
          shift.reason || null, 
          shift.detail || null
        ]);
      }
      
      // Update submission status to PENDING
      await conn.query(`
        INSERT INTO shift_month_status (userId, month, status)
        VALUES (?, ?, 'PENDING')
        ON DUPLICATE KEY UPDATE status = 'PENDING'
      `, [userId, month]);
      
      await conn.commit();
      
      // Also fetch and return the newly saved data so UI can update immediately if needed
      res.status(200).json({ success: true, message: 'Shifts saved successfully', data: { submission_status: 'PENDING' } });
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
    
    // Tables created by bootstrap migrations

    const [rows] = await db.query(`
      SELECT s.id, s.userId, s.month, s.status, s.updated_at,
             u.username, u.email, u.employee_code, u.employment_type,
             d.name as departmentName
      FROM shift_month_status s
      JOIN users u ON s.userId = u.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE s.month = ? AND u.role NOT IN ('admin', 'manager') AND u.employment_status = 'active'
      ORDER BY s.updated_at DESC
    `, [month]);
    
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getShiftMatrix = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { month } = req.query || {};
    if (!month) return res.status(400).json({ message: 'Missing month' });
    
    // Branch-scoped access: manager sees own branch only, admin sees all
    const userBranchId = req.user?.branchId || null;
    const branchFilter = (role === 'manager' && userBranchId) ? userBranchId : null;

    // Get users (branch-filtered for managers)
    let userQuery = `
      SELECT u.id, u.username, u.email, u.employee_code, u.employment_type,
             d.name as departmentName, s.status as submission_status
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      LEFT JOIN shift_month_status s ON u.id = s.userId AND s.month = ?
      WHERE u.role NOT IN ('admin', 'manager') AND u.employment_status = 'active'
    `;
    const userParams = [month];
    if (branchFilter) {
      userQuery += ` AND u.branch_id = ?`;
      userParams.push(branchFilter);
    }
    userQuery += ` ORDER BY CASE WHEN d.name = '工事部' THEN 1 ELSE 2 END, d.name, u.employment_type, u.id`;
    const [users] = await db.query(userQuery, userParams);

    // Get shifts for the month (only for filtered users)
    let shifts = [];
    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      try {
        const [rows1] = await db.query(`
          SELECT userId, date, status, leaveType, reason, detail
          FROM shift_requests
          WHERE userId IN (?) AND date LIKE ?
        `, [userIds, `${month}-%`]);
        shifts = rows1.map(r => ({ ...r, date: String(r.date).slice(0, 10) }));
      } catch (e1) {
        try {
          const [rows2] = await db.query(`
            SELECT user_id as userId, start_date as date, 'WORKING' as status
            FROM user_shift_assignments 
            WHERE user_id IN (?) AND start_date LIKE ?
          `, [userIds, `${month}-%`]);
          shifts = rows2.map(r => ({ ...r, date: String(r.date).slice(0, 10) }));
        } catch (e2) {
          console.warn('Fallback query failed too:', e2.message);
        }
      }
    }

    const matrix = users.map(u => {
      const userShifts = shifts.filter(s => s.userId === u.id);
      const schedule = {};
      userShifts.forEach(s => {
        schedule[s.date] = s;
      });
      return {
        id: u.id,
        username: u.username || u.email,
        employee_code: u.employee_code,
        employment_type: u.employment_type,
        departmentName: u.departmentName,
        submission_status: u.submission_status,
        schedule
      };
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

    // Fetch all active users who are NOT admin or manager
    const [users] = await db.query(`
      SELECT u.id, u.username, u.email, u.employee_code, u.employment_type, d.name as departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE u.employment_status = 'active' AND u.role NOT IN ('admin', 'manager')
      ORDER BY 
        CASE WHEN d.name = '工事部' THEN 1 ELSE 2 END,
        u.employee_code ASC, u.id ASC
    `);

    if (!users || users.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch shift requests for these users for the given month
    const [shifts] = await db.query(`
      SELECT userId, date, status, leaveType
      FROM shift_requests
      WHERE date LIKE ?
    `, [`${month}-%`]);

    const matrix = users.map(u => {
      const userShifts = shifts.filter(s => s.userId === u.id);
      const schedule = {};
      userShifts.forEach(s => {
        schedule[s.date] = s;
      });
      return {
        id: u.id,
        username: u.username || u.email,
        employee_code: u.employee_code,
        employment_type: u.employment_type,
        departmentName: u.departmentName,
        schedule
      };
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
    
    await db.query(`
      UPDATE shift_month_status 
      SET status = ? 
      WHERE userId = ? AND month = ?
    `, [status, userId, month]);
    
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
    
    const [rows] = await db.query(`
      SELECT date, status, leaveType, reason, detail 
      FROM shift_requests 
      WHERE userId = ? AND date LIKE ?
    `, [userId, `${month}-%`]);
    
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

    // Get status
    let submission_status = 'draft';
    try {
      const [statusRows] = await db.query(`
        SELECT status FROM shift_month_status 
        WHERE userId = ? AND month = ?
      `, [userId, month]);
      if (statusRows && statusRows.length > 0) {
        submission_status = statusRows[0].status;
      }
    } catch (e) {
      // table might not exist
    }

    // Get shifts
    let schedule = {};
    try {
      const [shiftRows] = await db.query(`
        SELECT date, status, leaveType, reason, detail 
        FROM shift_requests 
        WHERE userId = ? AND date LIKE ?
      `, [userId, `${month}-%`]);
      
      shiftRows.forEach(r => {
        schedule[String(r.date).slice(0, 10)] = r;
      });
    } catch (e) {
      // table might not exist
    }

    res.status(200).json({
      success: true,
      data: {
        submission_status,
        schedule
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    const r = await repo.deleteShiftAssignment(id, userId);
    if (!r?.ok) return res.status(404).json({ message: 'Not found' });
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
