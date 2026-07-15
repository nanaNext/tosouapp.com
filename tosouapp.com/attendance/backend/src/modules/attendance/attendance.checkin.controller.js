/**
 * @module attendance.checkin.controller
 * Handlers: checkIn, checkOut, recordGoOut, recordReturn, setWorkType
 */
'use strict';

const {
  service, auditRepo, repo, formatInputToMySQLJST, userRepo,
  noticesRepo, shiftReminderService, log, getMonthStatusValue
} = require('./attendance._helpers');

// API: Nhân viên ấn nút Check-in (Đi làm)
exports.checkIn = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }
    const b = req.body || {};

    const wt = String(b?.workType || b?.work_type || '').trim();
    const workType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : null;
    const loc = {
      latitude: b?.latitude,
      longitude: b?.longitude,
      accuracy: b?.accuracy,
      locationSource: b?.locationSource,
      countryCode: b?.countryCode,
      note: b?.note,
      deviceId: b?.deviceId,
      tzOffset: b?.tzOffset
    };
    const result = await service.checkIn(userId, b?.time, loc, workType);
    if (!result) {
      return res.status(409).json({ message: 'Already checked in' });
    }

    // Auto-update attendance_daily kubun to '出勤' upon check-in
    try {
      const dtStr = String(result?.checkIn || b?.time || '').slice(0, 10) || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const dailyRec = await repo.getDaily(userId, dtStr);
      const dailies = dailyRec ? [dailyRec] : [];
      if (!dailies.length || !dailies[0].kubun || dailies[0].kubun !== '出勤') {
        await repo.upsertDaily(userId, dtStr, { kubun: '出勤' });
      }
    } catch (err) {
      log.warn('auto_set_kubun_failed', { userId, error_message: err.message });
    }

    try {
      await auditRepo.writeLog({
        userId,
        action: 'checkin',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null,
        afterData: JSON.stringify({ ...loc, workType, result })
      });
    } catch (e) { log.warn('audit_write_failed', { action: 'checkin', userId, error_message: e.message }); }
    try {
      const dtStr = String(result?.checkIn || b?.time || '').slice(0, 10) || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const y = parseInt(dtStr.slice(0, 4), 10);
      const m = parseInt(dtStr.slice(5, 7), 10);
      const st = await getMonthStatusValue(userId, y, m);
      if (st !== 'approved') await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
    } catch (e) { log.warn('month_status_update_failed', { userId, error_message: e.message }); }
    try {
      const u = await userRepo.getUserById(userId);
      const name = u ? (u.username || u.email || '従業員') : '従業員';
      const timeStr = String(result?.checkIn || '').slice(11, 16);
      await noticesRepo.createAdminNotification({
        kind: 'attendance_punch',
        title: '打刻通知',
        message: `${name}さんが出勤打刻をしました（${timeStr}）`,
        linkUrl: '/admin/attendance',
        createdBy: userId,
        audience: 'admin_manager'
      });
    } catch (e) {
      log.warn('notify_admin_checkin_failed', { userId, error_message: e.message });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Nhân viên ấn nút Check-out (Tan làm)
exports.checkOut = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }
    const b = req.body || {};
    const loc = {
      latitude: b?.latitude,
      longitude: b?.longitude,
      accuracy: b?.accuracy,
      locationSource: b?.locationSource,
      countryCode: b?.countryCode,
      note: b?.note,
      deviceId: b?.deviceId,
      tzOffset: b?.tzOffset
    };
    const result = await service.checkOut(userId, b?.time, loc);
    if (!result) {
      return res.status(404).json({ message: 'No open attendance' });
    }
    try {
      await auditRepo.writeLog({
        userId,
        action: 'checkout',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null,
        afterData: JSON.stringify({ ...loc, result })
      });
    } catch (e) { log.warn('audit_write_failed', { action: 'checkout', userId, error_message: e.message }); }
    try {
      const dtStr = String(result?.checkOut || result?.checkIn || b?.time || '').slice(0, 10) || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const y = parseInt(dtStr.slice(0, 4), 10);
      const m = parseInt(dtStr.slice(5, 7), 10);
      const st = await getMonthStatusValue(userId, y, m);
      if (st !== 'approved') await repo.setMonthStatus(userId, y, m, 'submitted', req.user?.id);
    } catch (e) { log.warn('month_status_update_failed', { userId, error_message: e.message }); }
    try {
      const u = await userRepo.getUserById(userId);
      const name = u ? (u.username || u.email || '従業員') : '従業員';
      const timeStr = String(result?.checkOut || '').slice(11, 16);
      await noticesRepo.createAdminNotification({
        kind: 'attendance_punch',
        title: '打刻通知',
        message: `${name}さんが退勤打刻をしました（${timeStr}）`,
        linkUrl: '/admin/attendance',
        createdBy: userId,
        audience: 'admin_manager'
      });

      // Calculate total hours and send daily summary email
      if (u && u.email && result?.checkIn && result?.checkOut) {
        const inDate = new Date(result.checkIn);
        const outDate = new Date(result.checkOut);
        const dtStr2 = String(result.checkOut).slice(0, 10);
        let breakMin = 60;
        try {
          const dailyRec = await repo.getDaily(userId, dtStr2);
          const dailies = dailyRec ? [dailyRec] : [];
          if (dailies.length > 0) {
            breakMin = Number(dailies[0].break_minutes || 0) + Number(dailies[0].night_break_minutes || 0);
          }
        } catch (e) { /* break lookup non-critical */ }

        const diffMs = outDate - inDate;
        let totalMinutes = Math.floor(diffMs / 60000) - breakMin;
        if (totalMinutes < 0) totalMinutes = 0;
        const totalHoursStr = `${Math.floor(totalMinutes / 60)}時間${String(totalMinutes % 60).padStart(2, '0')}分`;

        shiftReminderService.sendDailySummaryEmail(u, dtStr2, result.checkIn, result.checkOut, totalHoursStr).catch(e => log.warn('daily_summary_email_failed', { userId, error_message: e.message }));
      }
    } catch (e) {
      log.warn('notify_admin_checkout_failed', { userId, error_message: e.message });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Nhân viên ấn nút Ra ngoài (外出)
exports.recordGoOut = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const { time, type, reason } = req.body || {};
    if (!type) return res.status(400).json({ message: 'Missing type (業務 or 私用)' });

    const ts = time ? formatInputToMySQLJST(time) : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = ts.slice(0, 10);

    const insertId = await repo.recordGoOut(userId, dateStr, ts, type, reason);
    res.status(201).json({ id: insertId, userId, date: dateStr, go_out_time: ts, type, reason });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Nhân viên ấn nút Quay lại (戻り)
exports.recordReturn = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const { time } = req.body || {};

    const ts = time ? formatInputToMySQLJST(time) : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = ts.slice(0, 10);

    const affected = await repo.recordReturn(userId, dateStr, ts);
    if (affected === 0) {
      return res.status(404).json({ message: 'No open go-out record found' });
    }
    res.status(200).json({ ok: true, return_time: ts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Đổi loại hình công việc (onsite, remote, satellite)
exports.setWorkType = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const b = req.body || {};
    const date = String(b.date || '').slice(0, 10) || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const wt = String(b?.workType || b?.work_type || '').trim();
    const workType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : null;
    const r = await repo.setWorkTypeForUserDate(userId, date, workType);
    res.status(200).json({ date, workType, updated: Number(r?.updated || 0) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
