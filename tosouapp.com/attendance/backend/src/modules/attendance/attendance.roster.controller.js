/**
 * @file attendance.roster.controller.js
 * @description Xử lý các API xem trạng thái chấm công, timesheet và thông tin nhân viên.
 *
 * Các API trong file này:
 *   - userProfileForMonthly → Lấy thông tin hợp đồng + ca làm của nhân viên (dùng cho màn hình tháng)
 *   - timesheet             → Lấy bảng chấm công theo khoảng thời gian
 *   - gpsLog                → Ghi lại vị trí GPS khi chấm công
 *   - syncOffline           → Đồng bộ dữ liệu chấm công khi mất mạng
 *   - statusToday           → Trạng thái chấm công hôm nay của nhân viên
 *   - todaySummary          → Thống kê tổng quan chấm công toàn công ty hôm nay
 *
 * Tách riêng:
 *   attendance.today-roster.controller.js → todayRoster (logic phức tạp riêng)
 *
 * Kết nối:
 *   attendance.service.js    → Gọi checkIn/checkOut/timesheet logic
 *   attendance.repository.js → Truy vấn DB chấm công
 *   audit.repository.js      → Ghi log hành động GPS
 *   users/user.repository.js → Lấy thông tin nhân viên
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const service   = require('./attendance.service');       // Logic checkin/checkout/timesheet
const auditRepo = require('../audit/audit.repository'); // Ghi audit log
const repo      = require('./attendance.repository');   // Truy vấn DB chấm công
const userRepo  = require('../users/user.repository');  // Lấy thông tin nhân viên
const log       = require('../../core/logger');
const { formatInputToMySQLJST } = require('../../utils/dateTime');
const { timesheetMaxDays }      = require('../../config/env');

// ─── API: Lấy thông tin nhân viên cho màn hình tháng ─────────────────────────
// GET /api/attendance/user-profile
// Trả về: loại hợp đồng, ca làm việc, work details
exports.userProfileForMonthly = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const requesterId = req.user?.id;
    let userId = req.query.userId ? parseInt(String(req.query.userId), 10) : requesterId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    // Nhân viên chỉ được xem thông tin của chính mình
    if (role === 'employee' && String(userId) !== String(requesterId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await userRepo.getUserById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const dept = user?.departmentId ? (await userRepo.getDepartmentById(user.departmentId)) : null;
    try { await repo.ensureWorkDetailsSchemaPublic(); } catch (e) { /* không quan trọng */ }
    const workRows = await repo.getUserWorkDetails(userId, 10);
    // Tìm ca làm việc đang áp dụng
    let shift = null;
    const ym = String(req.query.ym || '').slice(0, 7);
    const targetDate = /^\d{4}-\d{2}$/.test(ym) ? ym + '-15' : null;
    if (user?.shift_id) {
      const def = await repo.getShiftById(user.shift_id);
      if (def) shift = def;
    }
    if (!shift) {
      const refDate = targetDate || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const assign = await repo.getActiveAssignment(userId, refDate).catch(() => null);
      if (assign?.shiftId) {
        const def = await repo.getShiftById(assign.shiftId).catch(() => null);
        if (def) shift = def;
      } else if (Object.prototype.hasOwnProperty.call(assign || {}, 'shift') && assign?.shift) {
        const def2 = await repo.getShiftByName(assign.shift);
        if (def2) shift = def2;
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
        shift,
      },
      workDetails: workRows || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Lấy bảng chấm công theo khoảng thời gian ───────────────────────────
// GET /api/attendance/timesheet?userId=&from=&to=
exports.timesheet = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const userId = req.query.userId || requesterId;
    const fromDate = req.query.from;
    const toDate = req.query.to;
    if (!userId || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Missing userId/from/to' });
    }
    // Kiểm tra khoảng thời gian không quá giới hạn
    const from = new Date(fromDate + 'T00:00:00Z');
    const to   = new Date(toDate   + 'T23:59:59Z');
    const maxSpanDays = timesheetMaxDays > 0 ? timesheetMaxDays : 0;
    const spanDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (maxSpanDays > 0 && spanDays > maxSpanDays) {
      return res.status(400).json({ message: 'Range too large: limit 3 months' });
    }
    // Nhân viên chỉ xem được của chính mình
    if (req.user?.role === 'employee' && String(userId) !== String(requesterId)) {
      return res.status(403).json({ message: 'Forbidden: employees can only view their own timesheet' });
    }
    // Manager chỉ xem được timesheet của employee trong phòng ban
    if (req.user?.role === 'manager' && String(userId) !== String(requesterId)) {
      const targetUser = await userRepo.getUserById(userId);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      if (String(targetUser.role || '').toLowerCase() !== 'employee') {
        return res.status(403).json({ message: 'Forbidden: managers can only view employee timesheets' });
      }
      const strictDept = String(process.env.MANAGER_STRICT_DEPT || '').toLowerCase() === 'true';
      if (strictDept && req.user.departmentId && String(targetUser.departmentId) !== String(req.user.departmentId)) {
        return res.status(403).json({ message: 'Forbidden: can only view employees in your department' });
      }
    }
    const result = await service.timesheet(userId, fromDate, toDate);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Ghi log vị trí GPS ──────────────────────────────────────────────────
// POST /api/attendance/gps
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
      afterData: JSON.stringify({ lat, lng, accuracy, at: at || new Date().toISOString() }),
    });
    res.status(201).json({ message: 'GPS logged' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Đồng bộ chấm công offline ──────────────────────────────────────────
// POST /api/attendance/sync
// Nhận mảng events [{type:'checkin'|'checkout', time}] từ thiết bị mất mạng
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
        if (dup) { results.push({ type: 'checkin', ok: true, id: dup.id, duplicate: true }); continue; }
        const r = await service.checkIn(userId, t);
        try { await auditRepo.writeLog({ userId, action: 'offline_checkin', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ time: t }) }); } catch (e) { log.warn('audit_offline_checkin_failed', { userId, error_message: e.message }); }
        results.push({ type: 'checkin', ok: true, id: r.id });
      } else if (ev.type === 'checkout') {
        const ms = Math.floor(new Date(ev.time || Date.now()).getTime() / 60000) * 60000;
        const t = formatInputToMySQLJST(ms);
        const dup = await repo.findCheckOutByTime(userId, t);
        if (dup) { results.push({ type: 'checkout', ok: true, id: dup.id, duplicate: true }); continue; }
        const r = await service.checkOut(userId, t);
        try { await auditRepo.writeLog({ userId, action: 'offline_checkout', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ time: t }) }); } catch (e) { log.warn('audit_offline_checkout_failed', { userId, error_message: e.message }); }
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

// ─── API: Trạng thái chấm công hôm nay của nhân viên ─────────────────────────
// GET /api/attendance/status
exports.statusToday = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const qDate = String(req.query?.date || '').slice(0, 10);
    const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : today;
    const range = await service.timesheet(userId, date, date);
    const open = date === today ? await repo.getOpenAttendanceForUser(userId) : null;
    let currentGoOut = null;
    if (open) {
      const goOuts = await repo.getGoOutRecords(userId, date);
      currentGoOut = goOuts.find(g => !g.return_time) || null;
    }
    res.status(200).json({
      date,
      open: !!open,
      attendance: open ? { id: open.id, checkIn: open.checkIn || null, checkOut: open.checkOut || null } : null,
      currentGoOut,
      timesheet: range,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Thống kê tổng quan chấm công hôm nay ───────────────────────────────
// GET /api/attendance/today-summary  (admin/manager)
exports.todaySummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const stats = await repo.getTodaySummaryStats(today, req.tenantId || null);
    const target       = Math.max(0, Number(stats.c_active || 0) - Number(stats.c_leave_users || 0));
    const notCheckedIn = Math.max(0, target - Number(stats.c_checkin || 0));
    const open         = await repo.getOpenAttendanceForUser(userId);
    const myRows       = await repo.getTodayAttendanceRecords(userId, today);
    const my           = myRows?.[0] || null;
    res.status(200).json({
      date: today,
      counts: {
        targetEmployees: target,
        checkIn: Number(stats.c_checkin || 0),
        notCheckedIn,
        notCheckedOut: Number(stats.c_open || 0),
        activeEmployees: Number(stats.c_active || 0),
        leaveUsers: Number(stats.c_leave_users || 0),
      },
      me: { open: !!open, attendanceId: my?.id || null, checkIn: my?.checkIn || null, checkOut: my?.checkOut || null },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// todayRoster đã tách sang file riêng để giữ file này dưới 200 dòng.
// Export lại để attendance.controller.js không cần đổi.
exports.todayRoster = require('./attendance.today-roster.controller').todayRoster;
