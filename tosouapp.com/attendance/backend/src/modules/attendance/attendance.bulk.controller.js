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

exports.getWorkDetails = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const from = String(req.query?.from || '').slice(0, 10);
    const to = String(req.query?.to || '').slice(0, 10);
    const rows = await repo.listWorkDetailsBetween(userId, from || '1900-01-01', to || '2999-12-31');
    const items = (rows || []).map(r => ({
      id: r.id,
      startDate: String(r.start_date || '').slice(0, 10) || null,
      endDate: r.end_date ? String(r.end_date).slice(0, 10) : null,
      companyName: r.company_name || null,
      workPlaceAddress: r.work_place_address || null,
      workContent: r.work_content || null,
      roleTitle: r.role_title || null,
      responsibilityLevel: r.responsibility_level || null
    }));
    res.status(200).json({ userId, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.postWorkDetail = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const id = await repo.createWorkDetail(userId, req.body || {});
    if (!id) return res.status(400).json({ message: 'Invalid payload' });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.putWorkDetail = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const id = parseInt(String(req.params.id), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const r = await repo.updateWorkDetail(id, userId, req.body || {});
    if (!r?.ok) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ id, updated: r.updated || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteWorkDetail = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const id = parseInt(String(req.params.id), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const r = await repo.deleteWorkDetail(id, userId);
    res.status(200).json({ id, deleted: r.deleted || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.putMonthBulk = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month, updates, dailyUpdates } = req.body || {}; console.log('dailyUpdates:', dailyUpdates);
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month || !Array.isArray(updates)) return res.status(400).json({ message: 'Missing fields' });
    const y = parseInt(year,10), m = parseInt(month,10);
    await assertMonthWritable(req, userId, y, m);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }

    // Role-based classification validation:
    // If employee, prevent setting kubun back to Planned ('') if they have actual data or non-empty kubun.
    if (req.user.role === 'employee' && Array.isArray(dailyUpdates)) {
      for (const d of dailyUpdates) {
        if (d.kubun === '' || d.kubun === null) {
          // If trying to set to Planned, check if they are providing actual times in this request
          const date = String(d.date || '').slice(0, 10);
          const hasActualInBody = Array.isArray(updates) && updates.some(u => {
            const uDate = String(u.checkIn || u.checkOut || '').slice(0, 10);
            return uDate === date && (u.checkIn || u.checkOut) && u.delete !== true;
          });
          if (hasActualInBody) {
            return res.status(400).json({ message: 'Cannot set classification to Planned when attendance times are provided' });
          }
        }
      }
    }

    // 1. Validation: Cho phép mọi khung giờ (00:00 - 23:59) để hỗ trợ ca đêm và tăng ca muộn
    // (Đã gỡ bỏ logic chặn 06:00 - 23:59 theo yêu cầu của người dùng)

    const normalizedUpdates = Array.isArray(updates) ? updates.map(u => ({ ...(u || {}) })) : [];
    const normalizedDailyUpdates = Array.isArray(dailyUpdates) ? dailyUpdates : dailyUpdates;

    // De-dup within the same request by (userId, checkIn): keep the last one
    try {
      const seen = new Map();
      for (let i = 0; i < normalizedUpdates.length; i++) {
        const u = normalizedUpdates[i];
        const key = (!u?.id && u?.checkIn) ? String(u.checkIn) : null;
        if (!key) continue;
        if (seen.has(key)) {
          normalizedUpdates[seen.get(key)] = null;
        }
        seen.set(key, i);
      }
    } catch (e) { /* silently ignored */ }

    // Normalize: if segment already exists (same checkIn), convert "create" into "update" to avoid unique error.
    try {
      for (const u of normalizedUpdates) {
        if (!u || u.delete === true) continue;
        if (u.id) continue;
        const inV = String(u.checkIn || '').trim();
        if (!inV) continue;
        const existing = await repo.findCheckInByTime(userId, inV).catch(() => null);
        if (existing?.id) {
          u.id = Number(existing.id);
          delete u.clientId;
        }
      }
    } catch (e) { /* silently ignored */ }

    const cleanedUpdates = normalizedUpdates.filter(Boolean);

    let result = null;
    try {
      result = await repo.bulkUpsertAttendance(userId, { updates: cleanedUpdates, dailyUpdates: normalizedDailyUpdates });
    } catch (err) {
      if (String(err?.code || '') === 'ER_DUP_ENTRY') {
        try {
          for (const u of cleanedUpdates) {
            if (u?.id || u?.delete === true) continue;
            const inV = String(u.checkIn || '').trim();
            if (!inV) continue;
            const existing = await repo.findCheckInByTime(userId, inV).catch(() => null);
            if (existing?.id) {
              u.id = Number(existing.id);
              delete u.clientId;
            }
          }
        } catch (e) { /* silently ignored */ }
        result = await repo.bulkUpsertAttendance(userId, { updates: cleanedUpdates, dailyUpdates: normalizedDailyUpdates });
      } else {
        throw err;
      }
    }

    try {
      await auditRepo.writeLog({
        userId: req.user?.id,
        action: 'attendance_month_bulk',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null,
        afterData: JSON.stringify({ targetUserId: userId, year: y, month: m, saved: result.saved })
      });
    } catch (e) { /* silently ignored */ }

    // Safety net: sync leave request by latest daily kubun for each touched date
    try {
      const dailyList = Array.isArray(normalizedDailyUpdates) ? normalizedDailyUpdates : [];
      const latestByDate = new Map();
      for (const d of dailyList) {
        const ds = String(d?.date || '').slice(0, 10);
        const kubun = String(d?.kubun || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
        latestByDate.set(ds, kubun);
      }
      for (const [ds, kubun] of latestByDate.entries()) {
        await syncPaidLeaveByKubun(userId, ds, kubun);
      }
    } catch (e) { /* silently ignored */ }

    res.status(200).json(result);
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};

// API: Đồng bộ dữ liệu chấm công sang hệ thống tính lương
exports.syncSalary = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.body || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Calculate work days and paid leave from attendance
    const dailyRows = await repo.listDailyBetween(userId, from, to).catch(() => []);
    const attendanceRows = await repo.listByUserBetween(userId, from, to).catch(() => []);
    
    const workKubunSet = new Set(['出勤', '半休', '休日出勤', '代替出勤']);
    const workDaysSet = new Set();
    let paidLeaveDays = 0;

    for (const r of dailyRows) {
      const date = String(r.date || '').slice(0, 10);
      const kubun = String(r.kubun || '').trim();
      if (workKubunSet.has(kubun)) {
        workDaysSet.add(date);
      }
      if (kubun === '有給休暇') {
        paidLeaveDays++;
      }
    }
    for (const r of attendanceRows) {
      const date = String(r.checkIn || r.checkOut || '').slice(0, 10);
      if (date) workDaysSet.add(date);
    }

    const workDays = workDaysSet.size;

    // 2. Get user info for paid leave entitlement
    const user = await userRepo.getUserById(userId);
    const paidLeaveEntitlement = calculatePaidLeaveEntitlement(resolveEmploymentStartDate(user));

    // 3. Update salary_inputs
    const existingInput = await salaryInputRepo.getByUserMonth(userId, ym);
    const payload = existingInput?.payload || {};
    
    // Update payload with new attendance data
    payload.kintai = payload.kintai || {};
    payload.kintai['出勤日数'] = workDays;
    payload.kintai['有給休暇'] = paidLeaveDays;
    payload.kintai['有給休暇付与'] = paidLeaveEntitlement;

    await salaryInputRepo.upsert({
      userId,
      month: ym,
      payload,
      updatedBy: req.user?.id
    });

    res.status(200).json({
      ok: true,
      workDays,
      paidLeaveDays,
      paidLeaveEntitlement
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.putPlan = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { date, plan } = req.body || {};
    if (!userId || !date) return res.status(400).json({ message: 'Missing userId/date' });
    const result = await repo.upsertPlan(userId, date, plan);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
