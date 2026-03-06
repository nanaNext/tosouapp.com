const { parseMySQLJSTToDate } = require('../../utils/dateTime');
const settingsRepo = require('../settings/settings.repository');
const userRepo = require('../users/user.repository');
const attendanceRepo = require('./attendance.repository');
const calendarRepo = require('../calendar/calendar.repository');
// Chuyển chuỗi DATETIME (JST) sang Date (UTC-based) để tính toán

function minutesBetween(a, b) {
  // Tính chênh lệch phút giữa hai thời điểm, không âm
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function pickShift(checkInStr, checkOutStr) {
  // Xác định ca làm việc dựa vào giờ check‑in (và một chút ngưỡng)
  const inDate = parseMySQLJSTToDate(checkInStr);
  const outDate = parseMySQLJSTToDate(checkOutStr);
  const y = inDate.getUTCFullYear();
  const m = inDate.getUTCMonth();
  const d = inDate.getUTCDate();
  const jst = (hh, mm) => new Date(Date.UTC(y, m, d, hh - 9, mm, 0));
  const s1 = { name: 'day_8_17', start: jst(8, 0), end: jst(17, 0), breakMinutes: 60 };
  const s2 = { name: 'day_9_17', start: jst(9, 0), end: jst(17, 0), breakMinutes: 60 };
  const s3 = { name: 'part_9_14', start: jst(9, 0), end: jst(14, 0), breakMinutes: 0 };
  const inJ = inDate;
  const outJ = outDate;
  if (inJ <= jst(8, 30)) return { shift: s1, inJ, outJ };
  if (inJ <= jst(9, 30) && outJ >= jst(16, 0)) return { shift: s2, inJ, outJ };
  return { shift: s3, inJ, outJ };
}

async function computeRecord(rec) {
  // Tính phút công chuẩn và phút tăng ca cho một bản ghi attendance
  const cfg = await settingsRepo.getSettings().catch(() => null);
  const baseBreak = cfg?.breakMinutes || 60;
  const inDate = parseMySQLJSTToDate(rec.checkIn);
  const y = inDate.getUTCFullYear();
  const m = inDate.getUTCMonth();
  const d = inDate.getUTCDate();
  const jst = (hh, mm) => new Date(Date.UTC(y, m, d, hh - 9, mm, 0));
  let shift;
  if (rec.shiftId) {
    const def = await attendanceRepo.getShiftById(rec.shiftId);
    if (def) {
      const [sH, sM] = String(def.start_time).split(':').map(n => parseInt(n, 10));
      const [eH, eM] = String(def.end_time).split(':').map(n => parseInt(n, 10));
      shift = { name: def.name, start: jst(sH, sM || 0), end: jst(eH, eM || 0), breakMinutes: def.break_minutes ?? baseBreak };
    }
  }
  if (!shift) {
    const u = await userRepo.getUserById(rec.userId).catch(() => null);
    const empType = String(u?.employment_type || 'full_time').toLowerCase();
    if (empType === 'full_time') {
      let deptNameRaw = '';
      if (u?.departmentId) {
        const dept = await userRepo.getDepartmentById(u.departmentId).catch(() => null);
        deptNameRaw = String(dept?.name || '').trim().toLowerCase();
      }
      const isConstruction = ['工事', 'kouji', 'koji', 'construction', 'engineering'].some(k => deptNameRaw.includes(k));
      const isAccounting = ['経理', 'keiri', 'accounting', 'finance'].some(k => deptNameRaw.includes(k));
      if (isConstruction) {
        shift = { name: 'day_8_17', start: jst(8, 0), end: jst(17, 0), breakMinutes: 60 };
      } else if (isAccounting) {
        shift = { name: 'day_9_17', start: jst(9, 0), end: jst(17, 0), breakMinutes: 60 };
      } else if (cfg?.workStart && cfg?.workEnd) {
        const [sH, sM] = String(cfg.workStart).split(':').map(n => parseInt(n, 10));
        const [eH, eM] = String(cfg.workEnd).split(':').map(n => parseInt(n, 10));
        shift = { name: `settings_${cfg.workStart}_${cfg.workEnd}`, start: jst(sH, sM || 0), end: jst(eH, eM || 0), breakMinutes: baseBreak };
      } else {
        shift = { name: 'day_8_17', start: jst(8, 0), end: jst(17, 0), breakMinutes: 60 };
      }
    } else {
      const inJ2 = parseMySQLJSTToDate(rec.checkIn);
      const outJ2 = parseMySQLJSTToDate(rec.checkOut);
      const worked2 = minutesBetween(inJ2, outJ2);
      const s1 = { name: 'day_8_17', start: jst(8, 0), end: jst(17, 0), breakMinutes: 60 };
      const s2 = { name: 'day_9_17', start: jst(9, 0), end: jst(17, 0), breakMinutes: 60 };
      const s3 = { name: 'part_9_14', start: jst(9, 0), end: jst(14, 0), breakMinutes: 0 };
      if (worked2 >= 7 * 60) {
        if (inJ2 <= jst(8, 30) && outJ2 >= jst(17, 0)) {
          shift = s1;
        } else if (inJ2 <= jst(9, 30) && outJ2 >= jst(16, 0)) {
          shift = s2;
        } else {
          shift = s3;
        }
      } else {
        shift = s3;
      }
    }
  }
  const breakMin = shift.breakMinutes ?? baseBreak;
  const inJ = parseMySQLJSTToDate(rec.checkIn);
  const outJ = parseMySQLJSTToDate(rec.checkOut);
  const worked = minutesBetween(inJ, outJ);
  const dateStr = rec.checkIn.split(' ')[0];
  const isOff = await calendarRepo.isOff(dateStr).catch(() => false);
  const scheduled = isOff ? 0 : Math.max(0, minutesBetween(shift.start, shift.end) - breakMin);
  const regular = Math.min(worked, scheduled);
  const overtime = Math.max(0, worked - scheduled);
  const nightWindows = [];
  for (let k = 0; k < 3; k++) {
    const start = new Date(Date.UTC(y, m, d + k, 22 - 9, 0, 0));
    const end = new Date(Date.UTC(y, m, d + k + 1, 5 - 9, 0, 0));
    nightWindows.push({ start, end });
  }
  let night = 0;
  for (const w of nightWindows) {
    const s = inJ > w.start ? inJ : w.start;
    const e = outJ < w.end ? outJ : w.end;
    const mins = Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
    night += mins;
  }
  return {
    id: rec.id,
    userId: rec.userId,
    date: rec.checkIn.split(' ')[0],
    checkIn: rec.checkIn,
    checkOut: rec.checkOut,
    shift: shift.name,
    regularMinutes: regular,
    overtimeMinutes: overtime,
    nightMinutes: night
  };
}

async function computeRange(rows) {
  // Tổng hợp theo ngày và tổng cộng trong khoảng từ danh sách bản ghi đã chốt
  const items = [];
  for (const r of rows) {
    if (!r.checkOut) continue;
    const x = await computeRecord(r);
    items.push(x);
  }
  const byDay = {};
  for (const it of items) {
    if (!byDay[it.date]) byDay[it.date] = { date: it.date, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, items: [] };
    byDay[it.date].regularMinutes += it.regularMinutes;
    byDay[it.date].overtimeMinutes += it.overtimeMinutes;
    byDay[it.date].nightMinutes += it.nightMinutes;
    byDay[it.date].items.push(it);
  }
  const days = Object.values(byDay);
  const total = days.reduce((acc, d) => {
    acc.regularMinutes += d.regularMinutes;
    acc.overtimeMinutes += d.overtimeMinutes;
    acc.nightMinutes += d.nightMinutes;
    return acc;
  }, { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0 });
  return { days, total };
}

module.exports = { computeRecord, computeRange };
