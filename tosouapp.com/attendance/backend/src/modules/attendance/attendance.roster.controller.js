/**
 * @module attendance.roster.controller
 * Handlers: userProfileForMonthly, timesheet, gpsLog, syncOffline, statusToday, todaySummary, todayRoster
 */
'use strict';

const {
  service, auditRepo, repo, formatInputToMySQLJST, userRepo,
  calendarRepo, log, recordEndpointPerf, resolveTargetUserId
} = require('./attendance._helpers');
const { timesheetMaxDays } = require('../../config/env');

// API: Lấy thông tin cá nhân của người dùng để hiển thị trong tháng
exports.userProfileForMonthly = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const requesterId = req.user?.id;
    let userId = req.query.userId ? parseInt(String(req.query.userId), 10) : requesterId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    if (role === 'employee' && String(userId) !== String(requesterId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await userRepo.getUserById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const dept = user?.departmentId ? (await userRepo.getDepartmentById(user.departmentId)) : null;
    try {
      await require('./attendance.repository').ensureWorkDetailsSchemaPublic();
    } catch (e) { /* schema ensure — non-critical */ }
    const workRows = await repo.getUserWorkDetails(userId, 10);
    let shift = null;
    const ym = String(req.query.ym || '').slice(0, 7);
    let targetDate = null;
    if (/^\d{4}-\d{2}$/.test(ym)) targetDate = ym + '-15';
    if (user?.shift_id) {
      const shiftDef = await repo.getShiftById(user.shift_id);
      const srows = shiftDef ? [shiftDef] : [];
      if (srows && srows[0]) shift = srows[0];
    }
    if (!shift) {
      const refDate = targetDate || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const assign = await repo.getActiveAssignment(userId, refDate).catch(() => null);
      if (assign?.shiftId) {
        const def = await repo.getShiftById(assign.shiftId).catch(() => null);
        if (def) shift = def;
      } else if (Object.prototype.hasOwnProperty.call(assign || {}, 'shift') && assign?.shift) {
        const shiftDef2 = await repo.getShiftByName(assign.shift);
        const defs = shiftDef2 ? [shiftDef2] : [];
        if (defs && defs[0]) shift = defs[0];
      }
    }
    res.status(200).json({
      userId,
      contract: {
        employment_type: user?.employment_type || null,
        contract_type: user?.contract_type || null,
        base_salary: user?.base_salary || null,
        contract_end: user?.contract_end || null,
        departmentId: user?.departmentId || null,
        departmentName: dept?.name || null,
        shift: shift
      },
      workDetails: workRows || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Lấy bảng chấm công (Timesheet) trong khoảng thời gian nhất định
exports.timesheet = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const userId = req.query.userId || requesterId;
    const fromDate = req.query.from;
    const toDate = req.query.to;
    if (!userId || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Missing userId/from/to' });
    }
    const from = new Date(fromDate + 'T00:00:00Z');
    const to = new Date(toDate + 'T23:59:59Z');
    const maxSpanDays = timesheetMaxDays > 0 ? timesheetMaxDays : 0;
    const spanDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (maxSpanDays > 0 && spanDays > maxSpanDays) {
      return res.status(400).json({ message: 'Range too large: limit 3 months' });
    }
    if (req.user?.role === 'employee' && String(userId) !== String(requesterId)) {
      return res.status(403).json({ message: 'Forbidden: employees can only view their own timesheet' });
    }
    // RBAC: Manager chỉ xem được timesheet của employee (role=3)
    if (req.user?.role === 'manager' && String(userId) !== String(requesterId)) {
      const targetUser = await userRepo.getUserById(userId);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      if (String(targetUser.role || '').toLowerCase() !== 'employee') {
        return res.status(403).json({ message: 'Forbidden: managers can only view employee timesheets' });
      }
      if (req.user.departmentId && String(targetUser.departmentId) !== String(req.user.departmentId)) {
        const strictDept = String(process.env.MANAGER_STRICT_DEPT || '').toLowerCase() === 'true';
        if (strictDept) {
          return res.status(403).json({ message: 'Forbidden: can only view employees in your department' });
        }
      }
    }
    const result = await service.timesheet(userId, fromDate, toDate);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Lấy lịch sử vị trí (GPS Log) của người dùng
exports.gpsLog = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lat, lng, accuracy, at } = req.body || {};
    if (!userId || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Missing userId/lat/lng' });
    }
    await auditRepo.writeLog({
      userId,
      action: 'gps',
      path: '/api/attendance/gps',
      method: 'POST',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      beforeData: null,
      afterData: JSON.stringify({ lat, lng, accuracy, at: at || new Date().toISOString() })
    });
    res.status(201).json({ message: 'GPS logged' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Đồng bộ dữ liệu chấm công khi thiết bị bị mất mạng (Offline sync)
exports.syncOffline = async (req, res) => {
  try {
    const userId = req.user?.id;
    const events = req.body?.events;
    if (!userId || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Missing userId/events' });
    }
    const results = [];
    for (const ev of events) {
      if (ev.type === 'checkin') {
        const ms = Math.floor(new Date(ev.time || Date.now()).getTime() / 60000) * 60000;
        const t = formatInputToMySQLJST(ms);
        const dup = await repo.findCheckInByTime(userId, t);
        if (dup) {
          results.push({ type: 'checkin', ok: true, id: dup.id, duplicate: true });
          continue;
        }
        const r = await service.checkIn(userId, t);
        try {
          await auditRepo.writeLog({ userId, action: 'offline_checkin', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ time: t }) });
        } catch (e) { log.warn('audit_offline_checkin_failed', { userId, error_message: e.message }); }
        results.push({ type: 'checkin', ok: true, id: r.id });
      } else if (ev.type === 'checkout') {
        const ms = Math.floor(new Date(ev.time || Date.now()).getTime() / 60000) * 60000;
        const t = formatInputToMySQLJST(ms);
        const dup = await repo.findCheckOutByTime(userId, t);
        if (dup) {
          results.push({ type: 'checkout', ok: true, id: dup.id, duplicate: true });
          continue;
        }
        const r = await service.checkOut(userId, t);
        try {
          await auditRepo.writeLog({ userId, action: 'offline_checkout', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ time: t }) });
        } catch (e) { log.warn('audit_offline_checkout_failed', { userId, error_message: e.message }); }
        results.push({ type: 'checkout', ok: !!r, id: r?.id || null });
      } else {
        results.push({ type: ev.type, ok: false, error: 'unknown type' });
      }
    }
    res.status(200).json({ synced: results.length, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Lấy trạng thái chấm công của ngày hôm nay
exports.statusToday = async (req, res) => {
  try {
    const userId = req.user?.id;
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const qDate = String(req.query?.date || '').slice(0, 10);
    const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : today;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }
    const range = await service.timesheet(userId, date, date);
    const attendanceRepo = require('./attendance.repository');
    const open = date === today ? await attendanceRepo.getOpenAttendanceForUser(userId) : null;

    let currentGoOut = null;
    if (open) {
      const goOuts = await attendanceRepo.getGoOutRecords(userId, date);
      const activeGoOut = goOuts.find(g => !g.return_time);
      if (activeGoOut) currentGoOut = activeGoOut;
    }

    res.status(200).json({
      date,
      open: !!open,
      attendance: open ? { id: open.id, checkIn: open.checkIn || null, checkOut: open.checkOut || null } : null,
      currentGoOut,
      timesheet: range
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Lấy thống kê chấm công ngày hôm nay
exports.todaySummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const attendanceRepo = require('./attendance.repository');

    const stats = await attendanceRepo.getTodaySummaryStats(today);
    const c_checkin = stats.c_checkin;
    const c_open = stats.c_open;
    const c_active = stats.c_active;
    const c_leave_users = stats.c_leave_users;
    const target = Math.max(0, Number(c_active || 0) - Number(c_leave_users || 0));
    const notCheckedIn = Math.max(0, target - Number(c_checkin || 0));
    const notCheckedOut = Number(c_open || 0);

    const open = await attendanceRepo.getOpenAttendanceForUser(userId);
    const myRows = await attendanceRepo.getTodayAttendanceRecords(userId, today);
    const my = myRows && myRows[0] ? myRows[0] : null;

    res.status(200).json({
      date: today,
      counts: {
        targetEmployees: target,
        checkIn: Number(c_checkin || 0),
        notCheckedIn,
        notCheckedOut,
        activeEmployees: Number(c_active || 0),
        leaveUsers: Number(c_leave_users || 0)
      },
      me: {
        open: !!open,
        attendanceId: my?.id || null,
        checkIn: my?.checkIn || null,
        checkOut: my?.checkOut || null
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Lấy danh sách điểm danh (roster) của tất cả nhân viên trong ngày
exports.todayRoster = async (req, res) => {
  const startedAt = Date.now();
  let itemsCount = 0;
  let plannedCount = 0;
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const attendanceRepo = require('./attendance.repository');
    const qDate = String(req.query?.date || '').slice(0, 10);
    const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const rows = await attendanceRepo.getTodayRosterItems(date);

    // Today's date in JST for detecting past days (退勤忘れ, 欠勤)
    const todayJST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const isPastDay = date < todayJST;

    let items = (rows || []).map(r => {
      const hasIn = !!r.checkIn;
      const hasOut = !!r.checkOut;
      const kubun = String(r.dailyKubun || '').trim();
      const isPartTime = String(r.employmentType || '').toLowerCase() === 'part_time';
      const shiftStatus = String(r.shiftStatus || '').trim();
      const shiftLeaveType = String(r.shiftLeaveType || '').trim();
      
      const holidayKubuns = new Set(['休日', '代替休日', '休み']);
      const leaveKubuns = new Set(['有給休暇', '無給休暇', '欠勤']);
      const workKubuns = new Set(['出勤', '半休', '半休(有給)', '休日出勤', '代替出勤', '振替出勤']);
      
      let status;
      let displayKubun = kubun;
      
      // ═══════════════════════════════════════════════════════════════
      // Priority 1: 実際の打刻データ (Actual punch data overrides all)
      // ═══════════════════════════════════════════════════════════════
      if (hasIn && hasOut) {
        status = 'checked_out'; // 退勤済
      } else if (hasIn && !hasOut) {
        // Có checkIn nhưng chưa checkOut
        if (isPastDay) {
          status = 'checkout_missing'; // 退勤忘れ (past day, forgot to clock out)
        } else {
          status = 'working'; // 出勤中 (still working today)
        }
      }
      // ═══════════════════════════════════════════════════════════════
      // Priority 2: Kubun nghỉ được set (approved leave/holiday)
      // ═══════════════════════════════════════════════════════════════
      else if (holidayKubuns.has(kubun)) {
        status = 'off';
        displayKubun = kubun; // Hiện chính xác: 休日, 代替休日
      } else if (leaveKubuns.has(kubun)) {
        status = 'leave';
        displayKubun = kubun; // Hiện chính xác: 有給休暇, 欠勤, 無給休暇
      }
      // ═══════════════════════════════════════════════════════════════
      // Priority 3: Lịch đăng ký (Shift registration)
      // ═══════════════════════════════════════════════════════════════
      else if (shiftStatus === 'OFF') {
        status = 'off';
        displayKubun = displayKubun || '休日';
      } else if (shiftStatus === 'LEAVE') {
        status = 'leave';
        if (shiftLeaveType === 'paid') displayKubun = displayKubun || '有給休暇';
        else if (shiftLeaveType === 'unpaid') displayKubun = displayKubun || '欠勤';
        else displayKubun = displayKubun || '休暇';
      } else if (shiftStatus === 'WORKING' || workKubuns.has(kubun)) {
        // Có lịch đi làm nhưng chưa checkIn
        if (isPastDay) {
          status = 'not_punched'; // Cuối ngày rồi mà không checkIn → 未打刻
        } else {
          status = 'not_checked_in'; // 未出勤 (chưa đến, còn trong ngày)
        }
      }
      // ═══════════════════════════════════════════════════════════════
      // Priority 4: Không có dữ liệu gì
      // ═══════════════════════════════════════════════════════════════
      else {
        if (isPartTime) {
          status = 'unregistered'; // Part-time chưa đăng ký lịch → 未登録
        } else {
          // Full-time ngày thường
          if (isPastDay) {
            status = 'not_punched'; // 未打刻 (đã qua ngày, không có gì)
          } else {
            status = 'not_checked_in'; // 未出勤 (hôm nay, chờ checkIn)
          }
        }
      }
      
      // Quyết định hiển thị checkIn/checkOut: ẩn nếu status là nghỉ
      const hideTime = (status === 'off' || status === 'leave' || status === 'unregistered');
      
      return {
        userId: r.userId,
        employeeCode: r.employeeCode || null,
        username: r.username || null,
        employmentType: r.employmentType || null,
        departmentId: r.departmentId || null,
        departmentName: r.departmentName || null,
        role: r.role || null,
        dailyKubun: displayKubun || null,
        shiftStatus: shiftStatus || null,
        attendance: {
          id: r.attendanceId || null,
          shiftId: r.shiftId || null,
          checkIn: hideTime ? null : (r.checkIn || null),
          checkOut: hideTime ? null : (r.checkOut || null),
          site: r.site || null,
          work: r.work || null
        },
        status
      };
    });

    // RBAC: Manager chỉ thấy employee, Admin thấy tất cả
    if (role === 'manager') {
      items = items.filter(i => String(i.role || '').toLowerCase() === 'employee');
    }
    itemsCount = items.length;

    const plannedBase = await attendanceRepo.getTodayPlannedItems(date);
    const planned = [];
    let dayIsOff = false;
    try { dayIsOff = await calendarRepo.isOff(date); } catch { dayIsOff = false; }

    // Batch-load shift assignments and definitions to avoid N+1 queries
    const plannedUserIds = (plannedBase || []).map(r => r.userId).filter(Boolean);
    let assignmentMap = new Map();
    let shiftDefMap = new Map();
    try {
      [assignmentMap, shiftDefMap] = await Promise.all([
        attendanceRepo.batchGetActiveAssignments(plannedUserIds, date),
        attendanceRepo.batchGetAllShiftDefinitions()
      ]);
    } catch (e) { /* fallback to empty maps */ }

    for (const r of plannedBase || []) {
      let shift = null;
      try {
        const assign = assignmentMap.get(r.userId) || null;
        if (assign?.shiftId && shiftDefMap.has(assign.shiftId)) {
          const def = shiftDefMap.get(assign.shiftId);
          shift = { id: def.id, name: def.name, start_time: def.start_time, end_time: def.end_time, break_minutes: def.break_minutes };
        } else if (assign?.shiftId) {
          const def = await attendanceRepo.getShiftById(assign.shiftId);
          shift = def ? { id: def.id, name: def.name, start_time: def.start_time, end_time: def.end_time, break_minutes: def.break_minutes } : null;
        } else if (Object.prototype.hasOwnProperty.call(assign || {}, 'shift') && assign.shift) {
          const shiftDef3 = await attendanceRepo.getShiftByName(assign.shift);
          shift = shiftDef3 ? { id: shiftDef3.id, name: shiftDef3.name, start_time: shiftDef3.start_time, end_time: shiftDef3.end_time, break_minutes: shiftDef3.break_minutes } : null;
        } else if (r.shiftId && shiftDefMap.has(r.shiftId)) {
          const def = shiftDefMap.get(r.shiftId);
          shift = { id: def.id, name: def.name, start_time: def.start_time, end_time: def.end_time, break_minutes: def.break_minutes };
        } else if (r.shiftId) {
          const def2 = await attendanceRepo.getShiftById(r.shiftId).catch(() => null);
          shift = def2 ? { id: def2.id, name: def2.name, start_time: def2.start_time, end_time: def2.end_time, break_minutes: def2.break_minutes } : null;
        }
      } catch (e) { /* shift lookup fallback — non-critical */ }
      const status = Number(r.isLeave || 0) ? 'leave' : (dayIsOff ? 'off' : 'work');
      planned.push({
        userId: r.userId,
        employeeCode: r.employeeCode || null,
        username: r.username || null,
        role: r.role || null,
        departmentId: r.departmentId || null,
        departmentName: r.departmentName || null,
        planned: { status, leaveType: r.leaveType || null, shift }
      });
    }
    plannedCount = planned.length;
    // RBAC: Manager chỉ thấy planned của employee
    let filteredPlanned = planned;
    if (role === 'manager') {
      filteredPlanned = planned.filter(p => String(p.role || '').toLowerCase() === 'employee');
      plannedCount = filteredPlanned.length;
    }
    res.status(200).json({ date, items, planned: filteredPlanned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    recordEndpointPerf('attendance_today_roster', startedAt, {
      userId: req.user?.id || null,
      items: itemsCount,
      planned: plannedCount
    });
  }
};
