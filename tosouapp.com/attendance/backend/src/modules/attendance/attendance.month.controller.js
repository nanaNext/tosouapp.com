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
  const off = buildOffSetFromCalendarDetail(cal?.detail || [], useKoujiPolicy);
  if (!off.size && Array.isArray(cal?.off_days) && !useKoujiPolicy) {
    for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
  }
  return off;
}

async function computeMonthMissing(userId, y, m) {
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${y}-${pad(m)}-01`;
  const to = `${y}-${pad(m)}-${pad(lastDay)}`;
  
  const userRepo = require('../users/user.repository');
  const user = await userRepo.getUserById(userId).catch(() => null);
  const isPartTime = user?.employment_type === 'part_time';

  const off = await getUserOffDaySet(y, userId);
  const dailyRows = await repo.listDailyBetween(userId, from, to).catch(() => []);
  const dailyKubun = new Map((dailyRows || []).map(r => [String(r?.date || '').slice(0, 10), String(r?.kubun || '').trim()]));
  const segRows = await repo.listByUserBetween(userId, from, to).catch(() => []);
  const segByDate = new Map();
  for (const r of segRows || []) {
    const ds = String(r?.checkIn || r?.checkOut || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
    if (!segByDate.has(ds)) segByDate.set(ds, []);
    segByDate.get(ds).push(r);
  }
  const workKubunSet = new Set(['出勤', '半休', '休日出勤', '代替出勤']);
  const missing = [];
  for (let day = 1; day <= lastDay; day++) {
    const ds = `${y}-${pad(m)}-${pad(day)}`;
    const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(Date.UTC(y, m - 1, day, 0, 0, 0)).getUTCDay()];
    const isOff = off.has(ds);
    const k0 = dailyKubun.get(ds) || '';
    const allowedNormal = new Set(['', '出勤', '半休', '欠勤', '有給休暇', '無給休暇', '代替休日', '休み', '休日']);
    const allowedOff = new Set(['休日', '休日出勤', '代替出勤', '休み']);
    const kubun = (isOff ? (allowedOff.has(k0) ? k0 : '') : (allowedNormal.has(k0) ? k0 : ''));
    const segs = segByDate.get(ds) || [];
    const hasComplete = segs.some(s => !!s?.checkIn && !!s?.checkOut);
    const isWork = workKubunSet.has(kubun);
    
    // Đối với part-time, chỉ báo lỗi nếu họ đã tự chọn là đi làm (isWork) nhưng lại quên check-in/out
    // Không báo lỗi ngày trống (vì họ có thể nghỉ ngày đó)
    if (isPartTime) {
      if (isWork && !hasComplete) {
        missing.push(ds);
      }
      continue;
    }

    if (!isOff && !kubun) {
      // Treat complete attendance times as valid even when kubun is still empty.
      // This avoids false "missing day" errors during approval when rows were saved by times first.
      if (!hasComplete) {
        missing.push(ds);
      }
      continue;
    }
    if (isWork && !hasComplete) {
      missing.push(ds);
    }
  }
  return missing;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

// API: Lấy trạng thái nộp bảng chấm công của một tháng (Đã nộp, Chờ duyệt, v.v.)
exports.getMonthStatus = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') { console.log('403 because userId is __forbidden__'); return res.status(403).json({ message: 'Forbidden' }); }
    const { year, month } = req.query || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const r = await repo.getMonthStatus(userId, year, month);
    const status = String(r?.status || '').trim() || 'draft';
    res.status(200).json({
      userId,
      year: parseInt(String(year), 10),
      month: parseInt(String(month), 10),
      status,
      submitted_at: r?.submitted_at || null,
      submitted_by: r?.submitted_by || null,
      approved_at: r?.approved_at || null,
      approved_by: r?.approved_by || null,
      approved_by_name: r?.approved_by_name || null,
      unlocked_at: r?.unlocked_at || null,
      unlocked_by: r?.unlocked_by || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthStatusBulk = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const { userIds, year, month } = req.query || {};
    if (!userIds || !year || !month) return res.status(400).json({ message: 'Missing userIds/year/month' });
    const ids = String(userIds).split(',').map(s => parseInt(s, 10)).filter(Boolean);
    if (!ids.length) return res.status(200).json([]);
    const rows = await repo.getMonthStatusBulk(ids, year, month);
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10);
    const pad = (n) => String(n).padStart(2, '0');
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    const to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const workKubunSet = new Set(['出勤', '半休', '休日出勤', '代替出勤']);
    const enrich = async (uid) => {
      try {
        const off = await getUserOffDaySet(y, uid);
        const dailyRows = await repo.listDailyBetween(uid, from, to).catch(() => []);
        const dailyKubun = new Map((dailyRows || []).map(r => [String(r?.date || '').slice(0, 10), String(r?.kubun || '').trim()]));
        const segRows = await repo.listByUserBetween(uid, from, to).catch(() => []);
        const segByDate = new Map();
        for (const r of segRows || []) {
          const ds = String(r?.checkIn || r?.checkOut || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
          if (!segByDate.has(ds)) segByDate.set(ds, []);
          segByDate.get(ds).push(r);
        }
        let missing = 0;
        for (let day = 1; day <= lastDay; day++) {
          const ds = `${y}-${pad(m)}-${pad(day)}`;
          const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(Date.UTC(y, m - 1, day, 0, 0, 0)).getUTCDay()];
          const isOff = off.has(ds);
          const k0 = dailyKubun.get(ds) || '';
          const allowedNormal = new Set(['', '出勤', '半休', '欠勤', '有給休暇', '無給休暇', '代替休日', '休み', '休日']);
          const allowedOff = new Set(['休日', '休日出勤', '代替出勤', '休み']);
          const kubun = (isOff ? (allowedOff.has(k0) ? k0 : '') : (allowedNormal.has(k0) ? k0 : ''));
          const segs = segByDate.get(ds) || [];
          const hasComplete = segs.some(s => !!s?.checkIn && !!s?.checkOut);
          const isWork = workKubunSet.has(kubun);
          if (!isOff && !kubun) {
            // Keep status as "ready" when complete in/out exists, even if kubun is blank.
            if (!hasComplete) missing++;
            continue;
          }
          if (isWork && !hasComplete) missing++;
        }
        return { ready: missing === 0, missingCount: missing };
      } catch {
        return { ready: false, missingCount: null };
      }
    };
    const readyMap = new Map();
    for (const id of ids) {
      readyMap.set(String(id), await enrich(id));
    }
    res.status(200).json(rows.map(r => {
      const extra = readyMap.get(String(r.userId)) || { ready: false, missingCount: null };
      return {
        userId: r.userId,
        year: r.year,
        month: r.month,
        status: r.status,
        ready: !!extra.ready,
        missing_count: extra.missingCount,
        submitted_at: r.submitted_at || null,
        submitted_by: r.submitted_by || null,
        approved_at: r.approved_at || null,
        approved_by: r.approved_by || null,
        approved_by_name: r.approved_by_name || null
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Gửi/Nộp (Submit) bảng chấm công của tháng lên cho quản lý
exports.submitMonth = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.body || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10);
    if (String(req.user?.role || '').toLowerCase() === 'employee' && !isEditableMonth(y, m)) {
      return res.status(403).json({ message: 'Forbidden: cannot submit past months' });
    }
    const status = await getMonthStatusValue(userId, y, m);
    if (status === 'approved') return res.status(409).json({ message: 'Locked: month is closed' });

    try {
      const missing = await computeMonthMissing(userId, y, m);
      if (missing.length) {
        return res.status(400).json({ message: `入力が未完了です`, missing });
      }
    } catch (e) { /* silently ignored */ }

    await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
    res.status(200).json({ ok: true, userId, year: y, month: m, status: 'submitted' });
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};

exports.getMonthMissing = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const allow = role === 'admin' || role === 'manager';
    if (!allow) return res.status(403).json({ message: 'Forbidden' });
    const { userId, year, month } = req.query || {};
    const uid = parseInt(String(userId), 10);
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10);
    if (!uid || !y || !m) return res.status(400).json({ message: 'Missing userId/year/month' });
    const missing = await computeMonthMissing(uid, y, m);
    res.status(200).json({ userId: uid, year: y, month: m, missing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveReadyMonth = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const allow = role === 'admin' || role === 'manager';
    if (!allow) return res.status(403).json({ message: 'Forbidden' });
    const { month, departmentId } = req.body || {};
    const ym = String(month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ message: 'Missing month (YYYY-MM)' });
    const y = parseInt(ym.slice(0, 4), 10);
    const m = parseInt(ym.slice(5, 7), 10);
    const rows = await repo.getActiveUserIds(departmentId);
    let approved = 0, submitted = 0, skipped = 0;
    const results = [];
    for (const r of (rows || [])) {
      const uid = Number(r.userId);
      const st = await repo.getMonthStatus(uid, y, m).catch(() => null);
      const status = String(st?.status || '').trim() || 'draft';
      const missing = await computeMonthMissing(uid, y, m).catch(() => ['error']);
      if (missing && missing.length) {
        results.push({ userId: uid, status, ok: false, reason: 'missing_days', missing });
        skipped++;
        continue;
      }
      if (status !== 'submitted') {
        await repo.setMonthStatus(uid, y, m, 'submitted', req.user?.id).catch(() => {});
        submitted++;
      }
      await repo.setMonthStatus(uid, y, m, 'approved', req.user?.id).catch(() => {});
      approved++;
      results.push({ userId: uid, status: 'approved', ok: true });
    }
    res.status(200).json({ month: ym, approved, submitted, skipped, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Duyệt (Approve) bảng chấm công của cả tháng
exports.approveMonth = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.body || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10);
    const status = await getMonthStatusValue(userId, y, m);
    if (status !== 'submitted') {
      await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
    }
    try {
      const missing = await computeMonthMissing(userId, y, m);
      if (missing.length) {
        return res.status(400).json({ message: `未承認: 勤務未入力の日があります`, missing });
      }
    } catch (e) { /* silently ignored */ }
    await repo.setMonthStatus(userId, y, m, 'approved', req.user?.id);
    res.status(200).json({ ok: true, userId, year: y, month: m, status: 'approved' });
  } catch (err) {
    res.status(Number(err?.status || 500)).json({ message: err.message });
  }
};

// API: Mở khóa (Unlock) bảng chấm công của tháng để nhân viên có thể sửa lại
exports.unlockMonth = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    const { year, month } = req.body || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10);
    await repo.setMonthStatus(userId, y, m, 'unlocked', req.user?.id);
    res.status(200).json({ ok: true, userId, year: y, month: m, status: 'unlocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthSummary = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const y = parseInt(String(req.query?.year || ''), 10);
    const m = parseInt(String(req.query?.month || ''), 10);
    if (!userId || !y || !m) return res.status(400).json({ message: 'Missing userId/year/month' });
    const row = await repo.getMonthSummary(userId, y, m);
    const safeParse = (s) => { try { return s ? JSON.parse(String(s)) : null; } catch { return null; } };
    res.status(200).json({
      userId,
      year: y,
      month: m,
      all: row ? safeParse(row.summary_all) : null,
      inhouse: row ? safeParse(row.summary_inhouse) : null,
      updatedBy: row ? (row.updated_by || null) : null,
      updatedAt: row ? (row.updated_at || null) : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Tính toán/Cập nhật dữ liệu tổng hợp của tháng
exports.putMonthSummary = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const b = req.body || {};
    const y = parseInt(String(b.year || req.query?.year || ''), 10);
    const m = parseInt(String(b.month || req.query?.month || ''), 10);
    if (!userId || !y || !m) return res.status(400).json({ message: 'Missing userId/year/month' });
    const all = b.all ?? b.summaryAll ?? null;
    const inhouse = b.inhouse ?? b.summaryInhouse ?? null;
    try {
      const s1 = all == null ? '' : JSON.stringify(all);
      const s2 = inhouse == null ? '' : JSON.stringify(inhouse);
      if (s1.length > 50000 || s2.length > 50000) return res.status(400).json({ message: 'Payload too large' });
    } catch {
      return res.status(400).json({ message: 'Invalid summary payload' });
    }
    const r = await repo.upsertMonthSummary(userId, y, m, all, inhouse, req.user?.id || null);
    res.status(200).json({ ok: true, ...r });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
