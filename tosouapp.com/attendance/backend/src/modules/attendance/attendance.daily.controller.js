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

// ─── Local helpers (used only in this module) ─────────────────────────────────

async function getUserOffDaySet(year, userId) {
  const cal = await calendarRepo.computeYear(year).catch(() => null);
  const useKoujiPolicy = await isKoujiUser(userId);
  const { off } = buildOffSetFromCalendarDetail(cal?.detail || [], useKoujiPolicy);
  if (!off.size && Array.isArray(cal?.off_days) && !useKoujiPolicy) {
    for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
  }
  return off;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.getGoOutHistory = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { date } = req.params;
    if (!userId || !date) return res.status(400).json({ message: 'Missing userId/date' });
    const result = await repo.getGoOutRecords(userId, date);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminListGoOutRecords = async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId || null,
      date: req.query.date || null,
      month: req.query.month || null,
      status: req.query.status || null,
      type: req.query.type || null
    };
    const records = await repo.adminListGoOutRecords(filters);
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminForceEndGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnTime, adminNote } = req.body;
    if (!id || !returnTime) return res.status(400).json({ message: 'Missing parameters' });
    const updated = await repo.adminForceEndGoOut(id, returnTime, '完了', adminNote || '管理者により修正');
    res.status(200).json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminUpdateGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { goOutTime, returnTime, type, reason, adminNote } = req.body;
    if (!id || !goOutTime || !type) return res.status(400).json({ message: 'Missing parameters' });
    const updated = await repo.adminUpdateGoOut(id, goOutTime, returnTime, type, reason, adminNote);
    res.status(200).json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminDeleteGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const deleted = await repo.adminDeleteGoOut(id);
    res.status(200).json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDay = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const rows = await repo.listByUserBetween(userId, date, date);
    const goOuts = await repo.getGoOutRecords(userId, date);
    const currentGoOut = goOuts.find(g => !g.return_time) || null;
    res.status(200).json({ date, segments: rows, goOuts, currentGoOut });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getDaily = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const date = String(req.params.date || '').slice(0, 10);
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const daily = await repo.getDaily(userId, date);
    res.status(200).json({ date, daily });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Chỉnh sửa thủ công dữ liệu chấm công của một ngày
exports.putDaily = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const date = String(req.params.date || '').slice(0, 10);
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const y = parseInt(date.slice(0, 4), 10);
    const m = parseInt(date.slice(5, 7), 10);
    await assertMonthWritable(req, userId, y, m);
    if (req.user.role === 'employee' && !isEditableMonth(y, m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }
    
    console.log(`[putDaily] Received payload for user ${userId} date ${date}:`, req.body);
    
    await repo.upsertDaily(userId, date, req.body || {});
    const daily = await repo.getDaily(userId, date);
    try {
      const kubun = String(daily?.kubun || req.body?.kubun || '').trim();
      await syncPaidLeaveByKubun(userId, date, kubun);
    } catch (e) { /* silently ignored */ }
  try {
    const y = parseInt(date.slice(0, 4), 10);
    const m = parseInt(date.slice(5, 7), 10);
    const st = await getMonthStatusValue(userId, y, m);
    if (st !== 'approved') await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
  } catch (e) { /* silently ignored */ }
    res.status(200).json({ date, daily });
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};
exports.putDay = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const y = parseInt(date.slice(0,4),10), m = parseInt(date.slice(5,7),10);
    await assertMonthWritable(req, userId, y, m);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }

    const { attendanceId, checkIn, checkOut, location, memo, notes } = req.body || {};
    if (!attendanceId) return res.status(400).json({ message: 'Missing attendanceId' });
    const row = await repo.getById(attendanceId);
    if (!row || String(row.userId) !== String(userId)) {
      return res.status(404).json({ message: 'Attendance not found' });
    }
    const nextIn = (typeof checkIn === 'undefined') ? row.checkIn : (checkIn || null);
    const nextOut = (typeof checkOut === 'undefined') ? row.checkOut : (checkOut || null);
    
    const inChanged = nextIn && (!row.checkIn || new Date(nextIn).getTime() !== new Date(row.checkIn).getTime());
    const outChanged = nextOut && (!row.checkOut || new Date(nextOut).getTime() !== new Date(row.checkOut).getTime());

    // Bypass strict future check to allow setting end of day time before the end of day.
    const todayStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    if (date > todayStr) {
      // return res.status(400).json({ message: 'Cannot set future attendance times' });
    }

    await repo.updateTimes(attendanceId, nextIn, nextOut);
    
    // Update location, memo, notes if provided
    if (typeof location !== 'undefined' || typeof memo !== 'undefined' || typeof notes !== 'undefined') {
       const updates = [];
       const params = [];
       if (typeof location !== 'undefined') { updates.push('location = ?'); params.push(location || null); }
       if (typeof memo !== 'undefined') { updates.push('memo = ?'); params.push(memo || null); }
       if (typeof notes !== 'undefined') { updates.push('notes = ?'); params.push(notes || null); }
       if (updates.length > 0) {
         params.push(attendanceId);
         await db.query(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`, params);
       }
    }

    try {
      const u = await userRepo.getUserById(userId);
      const name = u ? (u.username || u.email || '従業員') : '従業員';
      
      if (inChanged) {
        const timeStr = String(nextIn).slice(11, 16);
        await noticesRepo.createAdminNotification({
          kind: 'attendance_punch',
          title: '打刻通知',
          message: `${name}さんが出勤打刻をしました（${timeStr}）`,
          linkUrl: '/admin/attendance',
          createdBy: userId,
          audience: 'admin_manager'
        });
      } else if (outChanged) {
        const timeStr = String(nextOut).slice(11, 16);
        await noticesRepo.createAdminNotification({
          kind: 'attendance_punch',
          title: '打刻通知',
          message: `${name}さんが退勤打刻をしました（${timeStr}）`,
          linkUrl: '/admin/attendance',
          createdBy: userId,
          audience: 'admin_manager'
        });
      }
    } catch (e) { /* silently ignored */ }

  try {
    const st = await getMonthStatusValue(userId, y, m);
    if (st !== 'approved') await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
  } catch (e) { /* silently ignored */ }
    res.status(200).json({ id: attendanceId });
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};
exports.addSegment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    const { checkIn, checkOut } = req.body || {};
    console.log(`[addSegment] called for userId=${userId}, date=${date}, checkIn=${checkIn}, checkOut=${checkOut}`);
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    if (!checkIn && !checkOut) return res.status(400).json({ message: 'Missing checkIn and checkOut' });
    const y = parseInt(date.slice(0,4),10), m = parseInt(date.slice(5,7),10);
    await assertMonthWritable(req, userId, y, m);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }
    
    let id;
    if (!checkIn && checkOut) {
       id = await repo.createMissingCheckIn(userId, checkOut, null, null, 'missing_checkin');
    } else {
       id = await repo.createCheckIn(userId, checkIn, null, null);
       if (checkOut) {
         await repo.setCheckOut(id, checkOut, null, null);
       }
    }

    try {
      const u = await userRepo.getUserById(userId);
      const name = u ? (u.username || u.email || '従業員') : '従業員';
      
      if (checkIn) {
        const inTimeStr = String(checkIn).slice(11, 16);
        await noticesRepo.createAdminNotification({
          kind: 'attendance_punch',
          title: '打刻通知',
          message: `${name}さんが出勤打刻をしました（${inTimeStr}）`,
          linkUrl: '/admin/attendance',
          createdBy: userId,
          audience: 'admin_manager'
        });
      }

      if (checkOut) {
        const outTimeStr = String(checkOut).slice(11, 16);
        await noticesRepo.createAdminNotification({
          kind: 'attendance_punch',
          title: '打刻通知',
          message: `${name}さんが退勤打刻をしました（${outTimeStr}）`,
          linkUrl: '/admin/attendance',
          createdBy: userId,
          audience: 'admin_manager'
        });
      }
    } catch (e) { /* silently ignored */ }

  try {
    const y = parseInt(date.slice(0,4),10), m = parseInt(date.slice(5,7),10);
    const st = await getMonthStatusValue(userId, y, m);
    if (st !== 'approved') await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
  } catch (e) { /* silently ignored */ }
    res.status(201).json({ id });
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};
exports.deleteSegment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = parseInt(req.params.id, 10);
    if (!userId || !id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id);
    if (!row || String(row.userId) !== String(userId)) {
      return res.status(404).json({ message: 'Attendance not found' });
    }
    try {
      const ds = String(row.checkIn || row.checkOut || '').slice(0, 10);
      const y = parseInt(ds.slice(0, 4), 10);
      const m = parseInt(ds.slice(5, 7), 10);
      if (y && m) await assertMonthWritable(req, userId, y, m);
    } catch (e) {
      return res.status(Number(e?.status || 500)).json({ message: e.message });
    }
    await require('../../core/database/mysql').query(`DELETE FROM attendance WHERE id = ?`, [id]);
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.submitDay = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const rows = await repo.listByUserBetween(userId, date, date);
    for (const r of rows) {
      await require('../../core/database/mysql').query(`UPDATE attendance SET labels = CONCAT_WS(',', labels, 'submitted') WHERE id = ?`, [r.id]);
    }
    res.status(200).json({ submitted: rows.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getMonth = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.query || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const pad = n => String(n).padStart(2,'0');
    const y = parseInt(year,10), m = parseInt(month,10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    let to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const role = String(req.user?.role || '').toLowerCase();
    const status = await getMonthStatusValue(userId, y, m);
    if (role === 'payroll' && status !== 'approved') {
      return res.status(403).json({ message: 'Forbidden: month is not closed' });
    }
    try {
      const todayStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      if (role !== 'payroll' && status !== 'approved') {
        if (todayStr < from) {
          to = from;
        } else if (to > todayStr) {
          to = todayStr;
        }
      }
    } catch (e) { /* silently ignored */ }
    const result = await service.timesheet(userId, from, to);
    res.status(200).json({ ...result, monthStatus: { status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Lấy bảng chấm công của một tháng cụ thể
exports.getMonthDetail = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') { console.log('403 in getMonthDetail because userId is __forbidden__'); return res.status(403).json({ message: 'Forbidden' }); }
    const { year, month } = req.query || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const pad = n => String(n).padStart(2,'0');
    const y = parseInt(year,10), m = parseInt(month,10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    const to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const role = String(req.user?.role || '').toLowerCase();
    const monthStatusObj = await repo.getMonthStatus(userId, y, m);
    const monthStatus = monthStatusObj?.status || 'draft';
    const approverName = monthStatusObj?.approved_by_name || null;
    let todayStr = null;
    try { todayStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); } catch (e) { /* silently ignored */ }
    const skipRows = role !== 'payroll' && monthStatus !== 'approved' && todayStr && todayStr < from;

    // Run all independent queries in PARALLEL for speed
    const [
      rows,
      dailyRows,
      planRows,
      shiftReqRows,
      workReportRows,
      off,
      shiftDefs,
      assigns,
      workDetailsRows,
      monthSummaryRow,
      goOutRecordsRows
    ] = await Promise.all([
      skipRows ? [] : repo.listByUserBetween(userId, from, to),
      repo.listDailyBetween(userId, from, to).catch(() => []),
      repo.listPlanBetween(userId, from, to).catch(() => []),
      db.query('SELECT date, status, leaveType, reason FROM shift_requests WHERE userId = ? AND date BETWEEN ? AND ?', [userId, from, to]).then(r => r[0]).catch(() => []),
      workReportRepo.listByUserMonth(userId, `${y}-${pad(m)}`).catch(() => []),
      getUserOffDaySet(y, userId),
      repo.listShiftDefinitions().catch(() => []),
      repo.listShiftAssignmentsBetween(userId, from, to).catch(() => []),
      repo.listWorkDetailsBetween(userId, from, to).catch(() => []),
      repo.getMonthSummary(userId, y, m).catch(() => null),
      repo.getGoOutRecordsByMonth(userId, y, m).catch(() => [])
    ]);
    
    const shiftReqMap = new Map();
    for (const r of shiftReqRows || []) {
      const dStr = String(r.date || '');
      const d = dStr.includes('T') ? dStr.slice(0, 10) : (r.date instanceof Date ? r.date.toISOString().slice(0, 10) : dStr.slice(0, 10));
      if (d && (r.status === 'WORKING' || r.status === 'OFF')) {
        shiftReqMap.set(d, { status: r.status, leaveType: r.leaveType, reason: r.reason });
      }
    }

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
    const days = [];
    const map = new Map();
    const toMySQLDateTime = (v) => {
      if (!v) return '';
      if (typeof v === 'string') {
        const s = String(v);
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 19);
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) return s.replace('T', ' ').slice(0, 19);
        return s;
      }
      try {
        return formatInputToMySQLJST(v);
      } catch {
        return String(v || '');
      }
    };
    for (const r of (rows || [])) {
      const inStr = toMySQLDateTime(r.checkIn);
      const outStr = toMySQLDateTime(r.checkOut);
      const d = String(inStr || '').slice(0, 10) || String(outStr || '').slice(0, 10);
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push({
        id: r.id,
        checkIn: inStr || null,
        checkOut: outStr || null,
        shiftId: r.shiftId || null,
        workType: r.work_type || r.workType || null,
        labels: r.labels || null,
        location: r.location || null,
        memo: r.memo || null,
        notes: r.notes || null
      });
    }
    const reportMap = new Map();
    for (const r of workReportRows || []) {
      const d = String(r?.date || '').slice(0, 10);
      if (!d) continue;
      reportMap.set(d, {
        workType: r?.work_type || null,
        location: r?.site || null,
        memo: r?.work || null
      });
    }
    const dailyMap = new Map();
    for (const r of dailyRows || []) {
      const d = String(r?.date || '').slice(0, 10);
      if (!d) continue;
      const report = reportMap.get(d) || null;
      const kc = (() => {
        try {
          const raw = Number(r.kubun_confirmed || 0);
          if (raw) return 1;
          const k = String(r.kubun || '').trim();
          return k ? 1 : 0;
        } catch {
          return 0;
        }
      })();
      dailyMap.set(d, {
        kubun: r.kubun || null,
        kubunConfirmed: kc,
        workType: (r.work_type != null && r.work_type !== '') ? r.work_type : (report?.workType || null),
        location: (r.location != null && r.location !== '') ? r.location : (report?.location || null),
        reason: r.reason || null,
        memo: (r.memo != null && r.memo !== '') ? r.memo : (report?.memo || null),
        notes: r.notes || null,
        late_minutes: r.late_minutes == null ? null : Number(r.late_minutes),
        early_minutes: r.early_minutes == null ? null : Number(r.early_minutes),
        lateMinutes: r.late_minutes == null ? null : Number(r.late_minutes),
        earlyMinutes: r.early_minutes == null ? null : Number(r.early_minutes),
        breakMinutes: r.break_minutes == null ? null : Number(r.break_minutes),
        nightBreakMinutes: r.night_break_minutes == null ? null : Number(r.night_break_minutes),
        status: r.status || null
      });
    }
    for (const [d, report] of reportMap.entries()) {
      if (dailyMap.has(d)) continue;
      dailyMap.set(d, {
        kubun: null,
        kubunConfirmed: 0,
        workType: report?.workType || null,
        location: report?.location || null,
        reason: null,
        memo: report?.memo || null,
        breakMinutes: null,
        nightBreakMinutes: null
      });
    }
    const shiftForDate = (ds) => {
      let best = null;
      for (const a of assigns || []) {
        const sd = String(a?.start_date || '').slice(0, 10);
        if (!sd || sd > ds) continue;
        const ed = a?.end_date ? String(a.end_date).slice(0, 10) : '';
        if (ed && ed < ds) continue;
        best = a;
      }
      if (!best) return null;
      const def = resolveDefForAssign(best);
      if (!def) return null;
      return {
        id: def.id,
        name: def.name,
        start_time: def.start_time,
        end_time: def.end_time,
        break_minutes: def.break_minutes,
        standard_minutes: def.standard_minutes
      };
    };
    const shiftAssignments = (assigns || []).map(a => {
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
    const workDetails = (workDetailsRows || []).map(r => ({
      id: r.id,
      startDate: String(r.start_date || '').slice(0, 10) || null,
      endDate: r.end_date ? String(r.end_date).slice(0, 10) : null,
      companyName: r.company_name || null,
      workPlaceAddress: r.work_place_address || null,
      workContent: r.work_content || null,
      roleTitle: r.role_title || null,
      responsibilityLevel: r.responsibility_level || null
    }));
    const monthSummary = (() => {
      if (!monthSummaryRow) return null;
      const safeParse = (s) => {
        try { return s ? JSON.parse(String(s)) : null; } catch { return null; }
      };
      return {
        all: safeParse(monthSummaryRow.summary_all),
        inhouse: safeParse(monthSummaryRow.summary_inhouse),
        updatedBy: monthSummaryRow.updated_by || null,
        updatedAt: monthSummaryRow.updated_at || null
      };
    })();
    const leaveSummary = await (async () => {
      const daysBetweenInclusive = (a, b) => {
        const ms = 24 * 60 * 60 * 1000;
        const d1 = new Date(String(a).slice(0, 10) + 'T00:00:00Z');
        const d2 = new Date(String(b).slice(0, 10) + 'T00:00:00Z');
        return Math.max(0, Math.ceil((d2 - d1) / ms) + 1);
      };
      const overlapDays = (aStart, aEnd, bStart, bEnd) => {
        const s = aStart > bStart ? aStart : bStart;
        const e = aEnd < bEnd ? aEnd : bEnd;
        if (s > e) return 0;
        return daysBetweenInclusive(s, e);
      };
      try {
        const leaveRepo = require('../leave/leave.repository');
        const [all, grants] = await Promise.all([
          leaveRepo.listApprovedByUserOverlap(userId, from, to).catch(() => []),
          leaveRepo.listGrants(userId, 'paid').catch(() => [])
        ]);
        let paidDays = 0;
        let substituteDays = 0;
        let unpaidDays = 0;
        let standbyDays = 0;
        let grantedDaysTotal = 0;
        let grantedDays = 0;
        for (const r of (all || [])) {
          const s = String(r?.startDate || '').slice(0, 10);
          const e = String(r?.endDate || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) continue;
          const ov = overlapDays(s, e, from, to);
          if (ov <= 0) continue;
          const t = String(r?.type || '').toLowerCase();
          if (t === 'paid') paidDays += ov;
          else if (t.includes('sub') || t.includes('daikyu') || t.includes('comp')) substituteDays += ov;
          else if (t.includes('unpaid') || t.includes('nopay') || t.includes('no_pay')) unpaidDays += ov;
          else if (t.includes('standby') || t.includes('wait') || t.includes('taiki')) standbyDays += ov;
        }
        // Also count from attendance_daily kubun (may not have approved leave_request)
        try {
          const [kubunRows] = await db.query(`
            SELECT COUNT(*) as cnt FROM attendance_daily
            WHERE userId = ? AND date BETWEEN ? AND ? AND kubun = '有給休暇'
          `, [userId, from, to]);
          const kubunPaid = Number(kubunRows?.[0]?.cnt || 0);
          if (kubunPaid > paidDays) paidDays = kubunPaid;
        } catch (e) { /* silently ignored */ }
        for (const g of (grants || [])) {
          grantedDaysTotal += Number(g?.daysGranted || 0);
          const gd = String(g?.grantDate || '').slice(0, 10);
          const ge = String(g?.expiryDate || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(gd) || !/^\d{4}-\d{2}-\d{2}$/.test(ge)) continue;
          if (ge < from || gd > to) continue;
          grantedDays += Number(g?.daysGranted || 0);
        }
        return { paidDays, substituteDays, unpaidDays, standbyDays, grantedDays, grantedDaysTotal };
      } catch {
        return { paidDays: 0, substituteDays: 0, unpaidDays: 0, standbyDays: 0, grantedDays: 0, grantedDaysTotal: 0 };
      }
    })();
    const goOutMap = new Map();
    for (const r of goOutRecordsRows) {
      const d = String(r.date).slice(0, 10);
      if (!goOutMap.has(d)) goOutMap.set(d, []);
      goOutMap.get(d).push({
        id: r.id,
        go_out_time: r.go_out_time,
        return_time: r.return_time,
        type: r.type,
        reason: r.reason
      });
    }
    
    for (let day = 1; day <= lastDay; day++) {
      const ds = `${y}-${pad(m)}-${pad(day)}`;
      const plan = planRows.find(p => String(p.date).slice(0, 10) === ds) || null;
      days.push({ 
        date: ds, 
        is_off: off.has(ds) ? 1 : 0, 
        shift: shiftForDate(ds), 
        daily: dailyMap.get(ds) || null, 
        plan: plan ? {
          shiftId: plan.shiftId,
          workType: plan.work_type,
          location: plan.location,
          memo: plan.memo
        } : null,
        shiftRequest: shiftReqMap.get(ds) || null,
        segments: map.get(ds) || [],
        goOutRecords: goOutMap.get(ds) || []
      });
    }
    const u = await userRepo.getUserById(userId).catch(() => null);
    const paidLeaveEntitlement = calculatePaidLeaveEntitlement(resolveEmploymentStartDate(u));
    const user = u ? {
      id: u.id,
      employee_code: u.employee_code || null,
      employeeCode: u.employee_code || null,
      username: u.username || null,
      email: u.email || null,
      departmentId: u.departmentId || null,
      departmentName: u.departmentName || null,
      office_code: u.office_code || null,
      officeCode: u.office_code || null,
      employment_type: u.employment_type || null,
      paidLeaveEntitlement: paidLeaveEntitlement,
      paidLeaveGrantedDays: Number(leaveSummary?.grantedDays || 0),
      paidLeaveGrantedTotalDays: Number(leaveSummary?.grantedDaysTotal || 0)
    } : null;
    res.status(200).json({
      year: y,
      month: m,
      from,
      to,
      user,
      monthStatus: {
        status: monthStatus,
        approved_by: monthStatusObj?.approved_by || null,
        approved_at: monthStatusObj?.approved_at || null,
        approverName: approverName
      },
      shiftAssignments,
      workDetails,
      monthSummary,
      leaveSummary,
      days
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
