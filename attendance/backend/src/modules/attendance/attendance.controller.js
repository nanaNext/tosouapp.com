const service = require('./attendance.service');
const auditRepo = require('../audit/audit.repository');
const rules = require('./attendance.rules');
const repo = require('./attendance.repository');
const { formatInputToMySQLJST } = require('../../utils/dateTime');
// Controller xử lý request/response cho module chấm công

exports.checkIn = async (req, res) => {
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
    const result = await service.checkIn(userId, b?.time, loc);
    if (!result) {
      return res.status(409).json({ message: 'Already checked in' });
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
        afterData: JSON.stringify({ ...loc, result })
      });
    } catch {}
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    } catch {}
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const { timesheetMaxDays } = require('../../config/env');
const { nowJSTMySQL } = require('../../utils/dateTime');
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
    const result = await service.timesheet(userId, fromDate, toDate);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
        } catch {}
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
        } catch {}
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

exports.statusToday = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = (req.query?.date || new Date().toISOString().slice(0,10));
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }
    const range = await service.timesheet(userId, date, date);
    const open = await require('./attendance.repository').getOpenAttendanceForUser(userId);
    res.status(200).json({
      date,
      open: !!open,
      timesheet: range
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function parseMonth(s) {
  const [y, m] = String(s).split('-');
  const yy = parseInt(y, 10), mm = parseInt(m, 10);
  if (!yy || !mm || mm < 1 || mm > 12) return null;
  return { y: yy, m: mm };
}
function isEditableMonth(y, m) {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  return (y === cy && m === cm) || (y === cy && m === cm + 1) || (y === cy + (cm === 12 ? 1 : 0) && m === (cm === 12 ? 1 : cm + 1));
}
exports.getDay = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const rows = await repo.listByUserBetween(userId, date, date);
    res.status(200).json({ date, segments: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.putDay = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    if (!userId || !date) return res.status(400).json({ message: 'Missing date' });
    const y = parseInt(date.slice(0,4),10), m = parseInt(date.slice(5,7),10);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }
    const { attendanceId, checkIn, checkOut } = req.body || {};
    if (!attendanceId) return res.status(400).json({ message: 'Missing attendanceId' });
    await repo.updateTimes(attendanceId, checkIn || null, checkOut || null);
    res.status(200).json({ id: attendanceId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.addSegment = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = req.params.date;
    const { checkIn, checkOut } = req.body || {};
    if (!userId || !date || !checkIn || !checkOut) return res.status(400).json({ message: 'Missing fields' });
    const y = parseInt(date.slice(0,4),10), m = parseInt(date.slice(5,7),10);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }
    const id = await repo.createCheckIn(userId, checkIn, null, null);
    await repo.setCheckOut(id, checkOut, null, null);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deleteSegment = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
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
      await repo.updateTimes(r.id, null, null);
      await require('../../core/database/mysql').query(`UPDATE attendance SET labels = CONCAT_WS(',', labels, 'submitted') WHERE id = ?`, [r.id]);
    }
    res.status(200).json({ submitted: rows.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getMonth = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { year, month } = req.query || {};
    if (!userId || !year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const pad = n => String(n).padStart(2,'0');
    const y = parseInt(year,10), m = parseInt(month,10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    const to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const result = await service.timesheet(userId, from, to);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.putMonthBulk = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { year, month, updates } = req.body || {};
    if (!userId || !year || !month || !Array.isArray(updates)) return res.status(400).json({ message: 'Missing fields' });
    const y = parseInt(year,10), m = parseInt(month,10);
    if (req.user.role === 'employee' && !isEditableMonth(y,m)) {
      return res.status(403).json({ message: 'Forbidden: cannot edit past months' });
    }
    for (const u of updates) {
      if (u.id) {
        await repo.updateTimes(u.id, u.checkIn || null, u.checkOut || null);
      } else if (u.checkIn && u.checkOut) {
        const id = await repo.createCheckIn(userId, u.checkIn, null, null);
        await repo.setCheckOut(id, u.checkOut, null, null);
      }
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.exportCsv = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { from, to } = req.query || {};
    if (!userId || !from || !to) return res.status(400).json({ message: 'Missing from/to' });
    const r = await service.timesheet(userId, from, to);
    let csv = 'date,regularMinutes,overtimeMinutes,nightMinutes\n';
    for (const d of r.days) {
      csv += `${d.date},${d.regularMinutes},${d.overtimeMinutes},${d.nightMinutes}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=\"timesheet.csv\"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
