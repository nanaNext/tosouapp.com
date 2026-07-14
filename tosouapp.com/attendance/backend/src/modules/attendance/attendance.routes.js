const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { rateLimit, rateLimitNamed } = require('../../core/middleware/rateLimit');
const controller = require('./attendance.controller');
const attendanceRepo = require('./attendance.repository');
const calendarRepo = require('../calendar/calendar.repository');
const userRepo = require('../users/user.repository');
const allowDebugRoutes = process.env.NODE_ENV !== 'production' || String(process.env.ENABLE_DEBUG_ROUTES || '').toLowerCase() === 'true';

const HOLIDAY_TYPES = new Set(['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge']);

async function isKoujiUser(userId) {
  try {
    const u = await userRepo.getUserById(userId);
    if (!u) return false;
    
    // Part-timers follow the general company calendar (Saturdays are off)
    // Only Regular employees (正社員) of Koujibu follow the "work on Saturdays except 4th" policy.
    if (String(u?.employment_type || '').toLowerCase() === 'part_time') return false;

    const dept = u?.departmentId ? (await userRepo.getDepartmentById(u.departmentId)) : null;
    const deptName = String(dept?.name || '').trim();
    return deptName.includes('工事部');
  } catch {
    return false;
  }
}

function buildOffSetFromCalendarDetail(detail, useKoujiPolicy) {
  const byDate = new Map();
  for (const it of (Array.isArray(detail) ? detail : [])) {
    const ds = String(it?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
    if (!byDate.has(ds)) byDate.set(ds, []);
    byDate.get(ds).push({
      type: String(it?.type || ''),
      is_off: Number(it?.is_off || 0) === 1
    });
  }
  const off = new Set();
  for (const [ds, list] of byDate.entries()) {
    if (!useKoujiPolicy) {
      if (list.some(x => x.is_off)) off.add(ds);
      continue;
    }
    const hasSunday = list.some(x => x.is_off && x.type === 'sunday');
    const has4thSaturday = list.some(x => x.is_off && x.type === 'saturday_4th');
    const hasHoliday = list.some(x => x.is_off && HOLIDAY_TYPES.has(x.type));
    if (hasSunday || has4thSaturday || hasHoliday) off.add(ds);
  }
  return { byDate, off };
}

router.post('/checkin',
  authenticate,
  authorize('employee','manager','admin'),
  rateLimitNamed('attendance_checkin', { windowMs: 60_000, max: 30, keyBy: 'user_or_ip' }),
  controller.checkIn);
router.post('/checkout',
  authenticate,
  authorize('employee','manager','admin'),
  rateLimitNamed('attendance_checkout', { windowMs: 60_000, max: 30, keyBy: 'user_or_ip' }),
  controller.checkOut);
router.post('/go-out',
  authenticate,
  authorize('employee','manager','admin'),
  rateLimitNamed('attendance_go_out', { windowMs: 60_000, max: 30, keyBy: 'user_or_ip' }),
  controller.recordGoOut);
router.post('/return',
  authenticate,
  authorize('employee','manager','admin'),
  rateLimitNamed('attendance_return', { windowMs: 60_000, max: 30, keyBy: 'user_or_ip' }),
  controller.recordReturn);

// Admin Go-Out Management
router.get('/go-out/admin-list', authenticate, authorize('manager','admin'), controller.adminListGoOutRecords);
router.put('/go-out/admin/:id/force-end', authenticate, authorize('manager','admin'), controller.adminForceEndGoOut);
router.put('/go-out/admin/:id', authenticate, authorize('manager','admin'), controller.adminUpdateGoOut);
router.delete('/go-out/admin/:id', authenticate, authorize('manager','admin'), controller.adminDeleteGoOut);

router.post('/worktype', authenticate, authorize('employee','manager','admin'), controller.setWorkType);
router.get('/timesheet', authenticate, authorize('employee','manager','admin'), controller.timesheet);
router.post('/gps',
  rateLimitNamed('attendance_gps', { windowMs: 60_000, max: 200 }),
  authenticate, authorize('employee','manager'), controller.gpsLog);
router.post('/sync',
  rateLimitNamed('attendance_sync', { windowMs: 60_000, max: 200 }),
  authenticate, authorize('employee','manager'), controller.syncOffline);
router.get('/status', authenticate, authorize('employee','manager','admin'), controller.statusToday);
router.get('/today-summary', authenticate, authorize('manager','admin'), controller.todaySummary);
router.get('/today-roster', authenticate, authorize('admin','manager'), controller.todayRoster);
router.get('/date/:date', authenticate, authorize('employee','manager','admin'), controller.getDay);
router.get('/date/:date/daily', authenticate, authorize('employee','manager','admin'), controller.getDaily);
router.get('/date/:date/go-out', authenticate, authorize('employee','manager','admin'), controller.getGoOutHistory);
router.put('/date/:date', authenticate, authorize('employee','manager','admin'), controller.putDay);
router.put('/date/:date/daily', authenticate, authorize('employee','manager','admin'), controller.putDaily);
router.post('/date/:date/segments', authenticate, authorize('employee','manager'), controller.addSegment);
router.delete('/segment/:id', authenticate, authorize('employee','manager'), controller.deleteSegment);
router.post('/date/:date/submit', authenticate, authorize('employee','manager'), controller.submitDay);
router.get('/month', authenticate, authorize('employee','manager','admin','payroll'), controller.getMonth);
router.get('/month/detail', authenticate, authorize('employee','manager','admin','payroll'), controller.getMonthDetail);
router.get('/month/status', authenticate, authorize('employee','manager','admin','payroll'), controller.getMonthStatus);
router.get('/month/status-bulk', authenticate, authorize('manager','admin'), controller.getMonthStatusBulk);
router.post('/month/submit', authenticate, authorize('employee','manager','admin'), controller.submitMonth);
router.post('/month/approve',
  rateLimitNamed('attendance_month_approve', { windowMs: 60_000, max: 100 }),
  authenticate, authorize('manager','admin'), controller.approveMonth);
router.post('/month/unlock',
  rateLimitNamed('attendance_month_unlock', { windowMs: 60_000, max: 50 }),
  authenticate, authorize('admin'), controller.unlockMonth);
router.get('/month/missing', authenticate, authorize('manager','admin'), controller.getMonthMissing);
router.post('/month/approve-ready', authenticate, authorize('manager','admin'), controller.approveReadyMonth);
router.get('/month/summary', authenticate, authorize('employee','manager','admin'), controller.getMonthSummary);
router.put('/month/summary', authenticate, authorize('manager','admin'), controller.putMonthSummary);
router.get('/shifts/assignments', authenticate, authorize('employee','manager','admin','payroll'), controller.getShiftAssignments);
router.post('/shifts/assignments',
  rateLimitNamed('attendance_shift_assign', { windowMs: 60_000, max: 200 }),
  authenticate, authorize('manager','admin'), controller.postShiftAssignment);
router.delete('/shifts/assignments/:id',
  rateLimitNamed('attendance_shift_assign_delete', { windowMs: 60_000, max: 200 }),
  authenticate, authorize('manager','admin'), controller.deleteShiftAssignment);
router.put('/month/bulk', authenticate, authorize('employee','manager','admin'), controller.putMonthBulk);
router.post('/month/sync-salary',
  rateLimitNamed('attendance_sync_salary', { windowMs: 60_000, max: 5 }),
  authenticate, authorize('manager','admin'), controller.syncSalary);
router.put('/plan', authenticate, authorize('employee','manager','admin'), controller.putPlan);
router.get('/month/export.xlsx', authenticate, authorize('employee','manager','admin','payroll'), controller.exportMonthXlsx);
router.get('/user-profile', authenticate, authorize('employee','manager','admin'), controller.userProfileForMonthly);
router.get('/work-details', authenticate, authorize('employee','manager','admin','payroll'), controller.getWorkDetails);
router.post('/work-details',
  rateLimitNamed('attendance_work_details_post', { windowMs: 60_000, max: 30 }),
  authenticate, authorize('manager','admin'), controller.postWorkDetail);
router.put('/work-details/:id',
  rateLimitNamed('attendance_work_details_put', { windowMs: 60_000, max: 30 }),
  authenticate, authorize('manager','admin'), controller.putWorkDetail);
router.delete('/work-details/:id',
  rateLimitNamed('attendance_work_details_delete', { windowMs: 60_000, max: 20 }),
  authenticate, authorize('manager','admin'), controller.deleteWorkDetail);
router.get('/shifts/definitions', authenticate, authorize('manager','admin','payroll'), controller.listShiftDefinitions);
router.post('/shifts/definitions',
  rateLimitNamed('attendance_shift_def_post', { windowMs: 60_000, max: 10 }),
  authenticate, authorize('manager','admin'), controller.postShiftDefinition);
router.delete('/shifts/definitions/:id',
  rateLimitNamed('attendance_shift_def_delete', { windowMs: 60_000, max: 10 }),
  authenticate, authorize('manager','admin'), controller.deleteShiftDefinition);
router.get('/export', authenticate, authorize('employee','manager','admin'), controller.exportCsv);
router.get('/calendar', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const r = await calendarRepo.computeYear(year);
    const useKoujiPolicy = await isKoujiUser(req.user?.id);
    const detailBase = Array.isArray(r?.detail) ? r.detail : [];
    const { off } = buildOffSetFromCalendarDetail(detailBase, useKoujiPolicy);
    const detailPolicy = useKoujiPolicy
      ? detailBase.map(it => {
          const t = String(it?.type || '');
          if (t === 'saturday') return { ...it, is_off: 0 };
          return it;
        })
      : detailBase;
    const lang = (req.query.lang || req.headers['accept-language'] || '').toLowerCase();
    const isJa = lang.startsWith('ja');
    const bilingual = String(req.query.bilingual || '').toLowerCase() === 'true';
    const labelOf = (ja, en) => {
      const j = ja || null;
      const e = en || null;
      if (bilingual) return [j, e || j].filter(Boolean).join(' / ');
      return isJa ? (j || e || null) : (e || j || null);
    };
    const mapLabel = list => (Array.isArray(list) ? list.map(x => ({ ...x, label: labelOf(x.name_ja || x.name, x.name_en || null) })) : list);
    const detail2 = Array.isArray(detailPolicy) ? detailPolicy.map(x => ({ ...x, label: labelOf(x.name, x.name_en || null) })) : detailPolicy;
    const r2 = {
      ...r,
      off_days: Array.from(off).sort(),
      jp_auto: mapLabel(r.jp_auto),
      jp_substitute: mapLabel(r.jp_substitute),
      jp_bridge: mapLabel(r.jp_bridge),
      detail: detail2
    };
    res.status(200).json(r2);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/calendar/day/:date', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const date = String(req.params.date || '').slice(0, 10);
    if (!date) return res.status(400).json({ message: 'Missing date' });
    const year = parseInt(String(date).slice(0, 4), 10);
    const cal = await calendarRepo.computeYear(year);
    const useKoujiPolicy = await isKoujiUser(req.user?.id);
    const detail = Array.isArray(cal?.detail) ? cal.detail : [];
    const { off } = buildOffSetFromCalendarDetail(detail, useKoujiPolicy);
    const matched = detail.filter(it => String(it?.date || '').slice(0, 10) === date);
    const reasons = matched.map(it => {
      const t = String(it?.type || '');
      const specialOff = useKoujiPolicy
        ? (t === 'sunday' || t === 'saturday_4th' || HOLIDAY_TYPES.has(t))
        : Number(it?.is_off || 0) === 1;
      return {
        type: t,
        name: it?.name || null,
        is_off: specialOff ? 1 : 0
      };
    });
    res.status(200).json({ date, is_off: off.has(date) ? 1 : 0, reasons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/calendar/working-days', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;
    const includeSunday = String(req.query.include_sunday || '').toLowerCase() === 'true';
    const includeSaturday = String(req.query.include_saturday || 'true').toLowerCase() === 'true';
    const includeLastSaturday = String(req.query.include_last_saturday || '').toLowerCase() === 'true';
    const excludeHolidays = String(req.query.exclude_holidays || '').toLowerCase() === 'true';
    const includeHolidayTypes = String(req.query.include_holiday_types || '').split(',').map(s => s.trim()).filter(Boolean);
    const onlyWeekdays = String(req.query.only_weekdays || '').toLowerCase() === 'true';
    const pad = n => String(n).padStart(2, '0');
    const r = await calendarRepo.computeYear(year);
    const off = new Set((r.off_days || []).map(d => String(d)));
    if (includeSunday) {
      for (const ds of (r.sundays || [])) {
        off.delete(String(ds));
      }
    }
    if (includeLastSaturday) {
      for (const ds of (r.saturday_4th || [])) {
        off.delete(String(ds));
      }
    }
    if (includeHolidayTypes.length > 0) {
      const allow = new Set(includeHolidayTypes.map(t => String(t)));
      for (const it of (r.detail || [])) {
        if (allow.has(String(it.type))) {
          off.delete(String(it.date));
        }
      }
    } else if (excludeHolidays) {
      const holidayTypes = new Set(['fixed','jp_auto','jp_substitute','jp_bridge']);
      for (const it of (r.detail || [])) {
        if (holidayTypes.has(String(it.type))) {
          off.delete(String(it.date));
        }
      }
    }
    const from = new Date(Date.UTC(year, month ? (month - 1) : 0, 1, 0, 0, 0));
    const to = month ? new Date(Date.UTC(year, month, 0, 0, 0, 0)) : new Date(Date.UTC(year, 11, 31, 0, 0, 0));
    const list = [];
    let d = new Date(from);
    while (d.getTime() <= to.getTime()) {
      const ds = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const dow = d.getUTCDay();
      if (onlyWeekdays && (dow === 0 || dow === 6)) {
        d.setUTCDate(d.getUTCDate() + 1);
        continue;
      }
      if (!includeSaturday && dow === 6) {
        off.add(ds);
      }
      if (!off.has(ds)) list.push(ds);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    res.status(200).json({ year, month: month || null, count: list.length, days: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
if (allowDebugRoutes) {
  router.get('/calendar/debug', authenticate, authorize('employee','manager','admin'), async (req, res) => {
    try {
      const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
      const r = await calendarRepo.computeYear(year);
      const summary = {
        year: r.year,
        keys: Object.keys(r),
        counts: {
          fixed: Array.isArray(r.fixed) ? r.fixed.length : 0,
          jp_auto: Array.isArray(r.jp_auto) ? r.jp_auto.length : 0,
          jp_substitute: Array.isArray(r.jp_substitute) ? r.jp_substitute.length : 0,
          jp_bridge: Array.isArray(r.jp_bridge) ? r.jp_bridge.length : 0,
          sundays: Array.isArray(r.sundays) ? r.sundays.length : 0,
          saturday_4th: Array.isArray(r.saturday_4th) ? r.saturday_4th.length : 0,
          off_days: Array.isArray(r.off_days) ? r.off_days.length : 0,
          detail: Array.isArray(r.detail) ? r.detail.length : 0
        }
      };
      res.status(200).json({ summary, sample: { jp_auto_first: r.jp_auto?.[0] || null, jp_substitute_first: r.jp_substitute?.[0] || null, jp_bridge_first: r.jp_bridge?.[0] || null } });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  router.get('/debug/routes', authenticate, authorize('admin'), async (req, res) => {
    try {
      const list = (router.stack || [])
        .map(l => l.route ? { path: l.route.path, methods: Object.keys(l.route.methods || {}) } : null)
        .filter(Boolean);
      res.status(200).json({ routes: list });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  router.post('/debug/routes', authenticate, authorize('admin'), async (req, res) => {
    try {
      const list = (router.stack || [])
        .map(l => l.route ? { path: l.route.path, methods: Object.keys(l.route.methods || {}) } : null)
        .filter(Boolean);
      res.status(200).json({ routes: list });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  router.get('/debug/classify', authenticate, authorize('admin'), async (req, res) => {
    try {
      const userId = parseInt(req.query.userId, 10);
      const date = String(req.query.date || '').slice(0,10);
      if (!userId || !date) {
        return res.status(400).json({ message: 'Missing userId/date' });
      }
      const userRepo = require('../users/user.repository');
      const rules = require('./attendance.rules');
      const user = await userRepo.getUserById(userId);
      const dept = user?.departmentId ? (await userRepo.getDepartmentById(user.departmentId)) : null;
      const rows = await attendanceRepo.listByUserBetween(userId, date, date);
      const rec = rows.find(r => String(r.checkOut || '').startsWith(date) || String(r.checkIn || '').startsWith(date)) || null;
      if (!rec) {
        return res.status(404).json({ message: 'No attendance for date' });
      }
      const computed = await rules.computeRecord(rec);
      res.status(200).json({
        user: {
          id: user?.id || userId,
          employment_type: user?.employment_type || null,
          departmentId: user?.departmentId || null,
          departmentName: dept?.name || null
        },
        attendance: {
          id: rec.id,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          shiftId: rec.shiftId || null
        },
        computed
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  router.post('/debug/classify', authenticate, authorize('admin'), async (req, res) => {
    try {
      const userId = parseInt((req.body?.userId ?? req.query.userId), 10);
      const date = String((req.body?.date ?? req.query.date) || '').slice(0,10);
      if (!userId || !date) {
        return res.status(400).json({ message: 'Missing userId/date' });
      }
      const userRepo = require('../users/user.repository');
      const rules = require('./attendance.rules');
      const user = await userRepo.getUserById(userId);
      const dept = user?.departmentId ? (await userRepo.getDepartmentById(user.departmentId)) : null;
      const rows = await attendanceRepo.listByUserBetween(userId, date, date);
      const rec = rows.find(r => String(r.checkOut || '').startsWith(date) || String(r.checkIn || '').startsWith(date)) || null;
      if (!rec) {
        return res.status(404).json({ message: 'No attendance for date' });
      }
      const computed = await rules.computeRecord(rec);
      res.status(200).json({
        user: {
          id: user?.id || userId,
          employment_type: user?.employment_type || null,
          departmentId: user?.departmentId || null,
          departmentName: dept?.name || null
        },
        attendance: {
          id: rec.id,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          shiftId: rec.shiftId || null
        },
        computed
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  router.get('/shifts/ping', authenticate, authorize('admin'), (req, res) => {
    res.status(200).json({ ok: true });
  });
}
router.get('/shifts/definitions', authenticate, authorize('admin','manager'), async (req, res) => {
  try {
    const rows = await attendanceRepo.listShiftDefinitions();
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/shifts/definitions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, start_time, end_time, break_minutes, working_days } = req.body || {};
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing name/start_time/end_time' });
    }
    const row = await attendanceRepo.upsertShiftDefinition({ name, start_time, end_time, break_minutes: break_minutes || 0, working_days });
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/shifts/assign', authenticate, authorize('admin','manager'), async (req, res) => {
  try {
    const { userId, shiftId, startDate, endDate } = req.body || {};
    if (!userId || !shiftId || !startDate) {
      return res.status(400).json({ message: 'Missing userId/shiftId/startDate' });
    }
    await attendanceRepo.assignShiftToUser(userId, shiftId, startDate, endDate);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/shifts/backfill', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.body || {};
    if (!userId || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Missing userId/fromDate/toDate' });
    }
    const r = await attendanceRepo.backfillShiftIdForUserRange(userId, fromDate, toDate);
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/shifts/bulk', authenticate, authorize('employee','manager','admin'), controller.postShiftsBulk);
// Removed insecure /shifts/bulk-test route (was public, no auth)
router.get('/shifts/submissions', authenticate, authorize('manager','admin'), controller.getShiftApprovals);
router.get('/shifts/matrix', authenticate, authorize('manager','admin'), controller.getShiftMatrix);
router.get('/shifts/all-employees', authenticate, authorize('employee','manager','admin'), controller.getAllEmployeeShifts);
router.get('/shifts/all-employees/export', authenticate, authorize('employee','manager','admin'), controller.exportAllEmployeeShiftsExcel);
router.post('/shifts/submissions/approve', authenticate, authorize('manager','admin'), controller.approveShiftMonth);
router.get('/shifts/user-month', authenticate, authorize('manager','admin'), controller.getUserShiftsForMonth);
router.get('/shifts/monthly/:month', authenticate, authorize('employee','manager','admin'), controller.getMyMonthlyShifts);

// ============================================================
// 年間サマリ API — 36協定 compliance tracking
// Returns: annual OT hours, months exceeding 45h, rolling averages,
//          paid leave balance (有給休暇情報)
// ============================================================
router.get('/annual-summary', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let userId = req.user?.id;
    if (req.query.userId && (role === 'admin' || role === 'manager')) {
      userId = parseInt(req.query.userId, 10) || userId;
    }
    const year = parseInt(req.query.year || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 4), 10);
    if (!userId || !year) return res.status(400).json({ message: 'Missing userId or year' });

    const db = require('../../core/database/mysql');
    const leaveRepo = require('../leave/leave.repository');

    // 1. Get all attendance records for the year and calculate OT
    //    attendance table: userId, checkIn, checkOut
    //    attendance_daily table: userId, date, break_minutes, night_break_minutes
    //    Standard work day = 8 hours (480 minutes). OT = actual work - 480 (if > 0)
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [rows] = await db.query(`
      SELECT 
        DATE(a.checkIn) as work_date,
        a.checkIn, a.checkOut,
        COALESCE(d.break_minutes, 60) as break_minutes
      FROM attendance a
      LEFT JOIN attendance_daily d ON d.userId = a.userId AND d.date = DATE(a.checkIn)
      WHERE a.userId = ? 
        AND DATE(a.checkIn) BETWEEN ? AND ?
        AND a.checkOut IS NOT NULL
      ORDER BY a.checkIn ASC
    `, [userId, startDate, endDate]);

    // 2. Calculate monthly overtime
    //    Standard: 8h/day (480min). OT per day = max(0, worked - 480)
    const STANDARD_DAY_MIN = 480;
    const monthlyOT = {}; // { '2026-01': totalOTMinutes, ... }
    for (let m = 1; m <= 12; m++) {
      monthlyOT[`${year}-${String(m).padStart(2, '0')}`] = 0;
    }

    for (const row of (rows || [])) {
      const monthKey = String(row.work_date || '').slice(0, 7);
      if (!monthKey || !monthlyOT.hasOwnProperty(monthKey)) continue;
      
      const cin = new Date(row.checkIn);
      const cout = new Date(row.checkOut);
      if (isNaN(cin.getTime()) || isNaN(cout.getTime())) continue;
      
      const workedMin = Math.max(0, (cout - cin) / 60000);
      const breakMin = Number(row.break_minutes || 60);
      const netWorked = Math.max(0, workedMin - breakMin);
      const otMin = Math.max(0, netWorked - STANDARD_DAY_MIN);
      monthlyOT[monthKey] += otMin;
    }

    // 3. Annual totals
    const annualOTMinutes = Object.values(monthlyOT).reduce((s, v) => s + v, 0);
    const annualLimitMinutes = 720 * 60; // 720時間 = 43200分

    // 4. Count months exceeding 45h (2700 minutes)
    const threshold45h = 45 * 60;
    const monthsOver45 = Object.values(monthlyOT).filter(v => v > threshold45h).length;
    const maxMonthsOver45 = 6; // 36協定 allows max 6 months/year over 45h

    // 5. Rolling averages for recent months (直近複数月平均)
    //    Calculate 2-month, 3-month, 4-month, 5-month, 6-month rolling averages
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get last 6 months of OT data (may span previous year)
    const recentMonths = [];
    let d = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 6; i++) {
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      recentMonths.unshift(mk);
      d.setMonth(d.getMonth() - 1);
    }

    // Fetch previous year data if needed
    const prevYear = year - 1;
    let prevYearOT = {};
    const needsPrevYear = recentMonths.some(m => m.startsWith(String(prevYear)));
    if (needsPrevYear) {
      const [prevRows] = await db.query(`
        SELECT 
          DATE(a.checkIn) as work_date,
          a.checkIn, a.checkOut,
          COALESCE(d.break_minutes, 60) as break_minutes
        FROM attendance a
        LEFT JOIN attendance_daily d ON d.userId = a.userId AND d.date = DATE(a.checkIn)
        WHERE a.userId = ? 
          AND DATE(a.checkIn) BETWEEN ? AND ?
          AND a.checkOut IS NOT NULL
      `, [userId, `${prevYear}-01-01`, `${prevYear}-12-31`]);
      for (const row of (prevRows || [])) {
        const mk = String(row.work_date || '').slice(0, 7);
        if (!mk) continue;
        const cin = new Date(row.checkIn);
        const cout = new Date(row.checkOut);
        if (isNaN(cin.getTime()) || isNaN(cout.getTime())) continue;
        const workedMin = Math.max(0, (cout - cin) / 60000);
        const breakMin = Number(row.break_minutes || 60);
        const netWorked = Math.max(0, workedMin - breakMin);
        const otMin = Math.max(0, netWorked - STANDARD_DAY_MIN);
        prevYearOT[mk] = (prevYearOT[mk] || 0) + otMin;
      }
    }

    const getOTForMonth = (mk) => {
      if (monthlyOT.hasOwnProperty(mk)) return monthlyOT[mk];
      if (prevYearOT.hasOwnProperty(mk)) return prevYearOT[mk];
      return 0;
    };

    // Individual month OT for display
    const recentMonthlyOT = recentMonths.map(mk => ({
      month: mk,
      minutes: getOTForMonth(mk)
    }));

    // Rolling averages (2~6 months)
    const rollingAverages = {};
    for (let n = 2; n <= 6; n++) {
      const slice = recentMonths.slice(recentMonths.length - n);
      const total = slice.reduce((s, mk) => s + getOTForMonth(mk), 0);
      const avg = Math.round(total / n);
      rollingAverages[`${n}months`] = {
        totalMinutes: total,
        averageMinutes: avg,
        exceeds80h: avg > (80 * 60) // 80h limit for rolling average
      };
    }

    // 6. Single month max check (100h limit)
    const maxSingleMonthOT = Math.max(...Object.values(monthlyOT), 0);
    const exceeds100h = maxSingleMonthOT > (100 * 60);

    // 7. 有給休暇 (Paid Leave) info
    //    In HYBRID/MANUAL mode, leave_grants may be empty.
    //    Use computeUserBalance from leave controller which handles all modes correctly.
    let paidLeaveInfo = { grantDate: null, usedSinceGrant: 0, remaining: 0, totalGranted: 0 };
    try {
      const leaveController = require('../leave/leave.controller');
      const balance = await leaveController.ensureUserGrants(userId);
      
      // If grants exist after ensure, use them
      if (balance && balance.length > 0) {
        const latest = balance[balance.length - 1];
        const grantDate = latest.grantDate ? String(latest.grantDate).slice(0, 10) : null;
        const totalGranted = Number(latest.daysGranted || 0);

        // Count used days from attendance_daily kubun
        let usedDays = 0;
        if (grantDate) {
          const [kubunRows] = await db.query(`
            SELECT COUNT(*) as cnt
            FROM attendance_daily
            WHERE userId = ? AND kubun = '有給休暇' AND date >= ?
          `, [userId, grantDate]);
          usedDays = Number(kubunRows?.[0]?.cnt || 0);
        }

        // Also check approved leave_requests
        if (grantDate) {
          const [approvedRows] = await db.query(`
            SELECT startDate, endDate
            FROM leave_requests
            WHERE userId = ? AND type = 'paid' AND status = 'approved' AND startDate >= ?
          `, [userId, grantDate]);
          let approvedDays = 0;
          for (const r of (approvedRows || [])) {
            const s = new Date(String(r.startDate).slice(0, 10));
            const e = new Date(String(r.endDate).slice(0, 10));
            if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
              approvedDays += Math.max(1, Math.round((e - s) / 86400000) + 1);
            }
          }
          usedDays = Math.max(usedDays, approvedDays);
        }

        paidLeaveInfo = {
          grantDate,
          totalGranted,
          usedSinceGrant: usedDays,
          remaining: Math.max(0, totalGranted - usedDays)
        };
      } else {
        // No grants — try counting from attendance_daily kubun with hire_date as reference
        const userRepo = require('../users/user.repository');
        const u = await userRepo.getUserById(userId);
        const hireDate = u?.hire_date ? String(u.hire_date).slice(0, 10) : null;
        if (hireDate) {
          const [kubunRows] = await db.query(`
            SELECT COUNT(*) as cnt
            FROM attendance_daily
            WHERE userId = ? AND kubun = '有給休暇' AND date >= ?
          `, [userId, hireDate]);
          const usedDays = Number(kubunRows?.[0]?.cnt || 0);
          // Default 10 days for first year (6 months after hire per Japanese labor law)
          const { calculatePaidLeaveEntitlement } = require('../../utils/leaveRules');
          let entitled = 10;
          try { entitled = calculatePaidLeaveEntitlement(hireDate) || 10; } catch (e) { /* fallback */ }
          paidLeaveInfo = {
            grantDate: hireDate,
            totalGranted: entitled,
            usedSinceGrant: usedDays,
            remaining: Math.max(0, entitled - usedDays)
          };
        }
      }
    } catch (e) {
      // leave system error — show what we can
      console.error('[annual-summary] leave error:', e.message);
    }

    // 8. Build response
    const fmtHm = (min) => {
      const h = Math.floor(Math.abs(min) / 60);
      const m = Math.abs(min) % 60;
      return `${h}:${String(m).padStart(2, '0')}`;
    };

    res.json({
      year,
      userId,
      // 年間超過時間
      annualOvertime: {
        totalMinutes: annualOTMinutes,
        totalFormatted: fmtHm(annualOTMinutes),
        limitMinutes: annualLimitMinutes,
        limitFormatted: '720:00',
        exceeds: annualOTMinutes > annualLimitMinutes
      },
      // 45時間超過回数
      monthsOver45h: {
        count: monthsOver45,
        limit: maxMonthsOver45,
        exceeds: monthsOver45 > maxMonthsOver45
      },
      // 単月100時間チェック
      singleMonthMax: {
        maxMinutes: maxSingleMonthOT,
        maxFormatted: fmtHm(maxSingleMonthOT),
        exceeds100h
      },
      // 直近複数月平均法定外労働時間
      recentMonths: recentMonthlyOT.map(r => ({
        month: r.month,
        minutes: r.minutes,
        formatted: fmtHm(r.minutes)
      })),
      rollingAverages,
      // 有給休暇
      paidLeave: paidLeaveInfo
    });
  } catch (err) {
    console.error('[annual-summary]', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
