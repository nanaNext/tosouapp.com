const { parseMySQLJSTToDate } = require('../../utils/dateTime');
// Chuyển chuỗi DATETIME (JST) sang Date (UTC-based) để tính toán

function minutesBetween(a, b) {
  // Tính chênh lệch phút giữa hai thời điểm, không âm
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

const getJSTDateStr = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const p = val.split(' ')[0].split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  }
  const dateObj = val instanceof Date ? val : new Date(val);
  if (isNaN(dateObj.getTime())) return '';
  const jst = new Date(dateObj.getTime() + 9 * 3600 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth()+1).padStart(2,'0')}-${String(jst.getUTCDate()).padStart(2,'0')}`;
};

/**
 * PURE FUNCTIONS FOR TESTING (Ưu tiên 2)
 * Tách logic tính toán ra khỏi DB để có thể viết Unit Test chí mạng.
 */
const CoreRules = {
  /**
   * Tính toán thời gian làm việc cơ bản và các flag bất thường
   */
  calculateWorkMetrics(checkIn, checkOut, shift, isOff = false) {
    if (!checkIn || !checkOut) {
      return { 
        regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, 
        isAnomaly: true, anomalyType: !checkOut ? 'MISSING_CHECKOUT' : 'MISSING_CHECKIN' 
      };
    }

    const inJ = parseMySQLJSTToDate(checkIn);
    const outJ = parseMySQLJSTToDate(checkOut);

    if (outJ < inJ) {
      throw new Error('Invalid time order: Checkout before Checkin');
    }

    const worked = minutesBetween(inJ, outJ);
    const breakMin = shift?.breakMinutes ?? 60;
    
    // 1. Tính toán baseline (theo ca làm việc)
    // Shift times are also parsed correctly
    const shiftStart = shift?.start ? parseMySQLJSTToDate(shift.start) : new Date();
    const shiftEnd = shift?.end ? parseMySQLJSTToDate(shift.end) : new Date();

    // Tính scheduled minutes dựa trên start/end của shift (không trừ break tự động ở đây)
    const scheduled = isOff ? 0 : minutesBetween(shiftStart, shiftEnd);
    
    // Regular minutes = tối đa là (scheduled - breakMin), nhưng không vượt quá (worked - breakMin)
    const regular = isOff ? 0 : Math.min(worked - breakMin, scheduled - breakMin);
    const overtime = Math.max(0, worked - scheduled);

    // 2. Tính toán giờ làm đêm (22:00 - 05:00)
    let night = 0;
    const y = inJ.getUTCFullYear();
    const m = inJ.getUTCMonth();
    const d = inJ.getUTCDate();
    const nightWindows = [];
    // JST is UTC+9, so 22:00 JST is 13:00 UTC, 05:00 JST is 20:00 UTC (previous day or same day)
    // To simplify and match existing logic:
    for (let k = -1; k < 2; k++) { 
      const start = new Date(Date.UTC(y, m, d + k, 22 - 9, 0, 0));
      const end = new Date(Date.UTC(y, m, d + k + 1, 5 - 9, 0, 0));
      nightWindows.push({ start, end });
    }
    for (const w of nightWindows) {
      const s = inJ > w.start ? inJ : w.start;
      const e = outJ < w.end ? outJ : w.end;
      const mins = Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
      night += mins;
    }

    // 3. Xử lý ANOMALY FLAGS (Chặn rủi ro Business)
    let isAnomaly = false;
    let anomalyType = null;

    // JST date check (UTC+9)
    const inJST = new Date(inJ.getTime() + 9 * 3600 * 1000);
    const outJST = new Date(outJ.getTime() + 9 * 3600 * 1000);
    const inJSTDate = inJST.getUTCDate();
    const outJSTDate = outJST.getUTCDate();

    if (worked > 12 * 60) {
      isAnomaly = true;
      anomalyType = 'OVERWORK_GT_12H';
    } else if (inJSTDate !== outJSTDate) {
      isAnomaly = true;
      anomalyType = 'OVERNIGHT_SHIFT';
    } else if (inJST.getUTCHours() < 7) { // Trước 7:00 sáng JST
      isAnomaly = true;
      anomalyType = 'EARLY_CHECKIN';
    }

    return {
      regularMinutes: regular,
      overtimeMinutes: overtime,
      nightMinutes: night,
      isAnomaly,
      anomalyType
    };
  }
};

async function computeRecord(rec, ctx = null) {
  const settingsRepo = require('../settings/settings.repository');
  const userRepo = require('../users/user.repository');
  const attendanceRepo = require('./attendance.repository');
  const calendarRepo = require('../calendar/calendar.repository');
  // Tính phút công chuẩn và phút tăng ca cho một bản ghi attendance
  const cfg = ctx?.cfg !== undefined ? ctx.cfg : await settingsRepo.getSettings().catch(() => null);
  const baseBreak = cfg?.breakMinutes || 60;
  
  const dateStr = getJSTDateStr(rec.checkIn || rec.checkOut);
  
  const inDate = rec.checkIn ? parseMySQLJSTToDate(rec.checkIn) : null;
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const d = parseInt(dStr, 10);
  const jst = (hh, mm) => new Date(Date.UTC(y, m, d, hh - 9, mm, 0));
  let shift;
  let template = false;
  if (rec.shiftId) {
    const def = ctx?.shiftCache ? ctx.shiftCache[rec.shiftId] : await attendanceRepo.getShiftById(rec.shiftId);
    if (def) {
      const [sH, sM] = String(def.start_time).split(':').map(n => parseInt(n, 10));
      const [eH, eM] = String(def.end_time).split(':').map(n => parseInt(n, 10));
      shift = { name: def.name, start: jst(sH, sM || 0), end: jst(eH, eM || 0), breakMinutes: def.break_minutes ?? baseBreak };
      try {
        const wt = String(rec.work_type || rec.workType || '').trim();
        const labels = String(rec.labels || '').trim();
        const fmtHm = d => d ? String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0') : '';
        const inHm = fmtHm(inDate);
        const outDateObj = parseMySQLJSTToDate(rec.checkOut);
        const outHm = fmtHm(outDateObj);
        if (!wt && !labels && inHm === String(def.start_time || '').trim() && outHm === String(def.end_time || '').trim()) {
          template = true;
        }
      } catch (e) { /* silently ignored */ }
    }
  }
  if (!shift) {
    const u = ctx?.userCache ? ctx.userCache[rec.userId] : await userRepo.getUserById(rec.userId).catch(() => null);
    const empType = String(u?.employment_type || 'full_time').toLowerCase();
    if (empType === 'full_time') {
      let deptNameRaw = '';
      if (u?.departmentId) {
        const dept = ctx?.deptCache ? ctx.deptCache[u.departmentId] : await userRepo.getDepartmentById(u.departmentId).catch(() => null);
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
      let worked2 = 0;
      let inJ2 = null;
      let outJ2 = null;
      if (rec.checkIn && rec.checkOut) {
        inJ2 = parseMySQLJSTToDate(rec.checkIn);
        outJ2 = parseMySQLJSTToDate(rec.checkOut);
        worked2 = minutesBetween(inJ2, outJ2);
      }
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
  let breakMin = shift.breakMinutes ?? baseBreak;
  
  let dailyRec = null;
  if (ctx?.dailyCache && ctx.dailyCache[rec.userId] && ctx.dailyCache[rec.userId][dateStr]) {
    dailyRec = ctx.dailyCache[rec.userId][dateStr];
  } else if (!ctx?.dailyCache) {
    dailyRec = await attendanceRepo.getDaily(rec.userId, dateStr).catch(() => null);
  }
  
  if (dailyRec && dailyRec.break_minutes != null) {
    breakMin = Number(dailyRec.break_minutes);
    shift = { ...shift, breakMinutes: breakMin };
  }

  let worked = 0;
  let inJ = null;
  let outJ = null;
  if (rec.checkIn && rec.checkOut) {
    inJ = parseMySQLJSTToDate(rec.checkIn);
    outJ = parseMySQLJSTToDate(rec.checkOut);
    worked = minutesBetween(inJ, outJ);
  }
  
  // Trừ thời gian ra ngoài việc cá nhân (私用)
  let privateGoOutMinutes = 0;
  let workGoOutMinutes = 0;
  let goOuts = [];
  if (ctx?.goOutCache && ctx.goOutCache[rec.userId] && ctx.goOutCache[rec.userId][dateStr]) {
    goOuts = ctx.goOutCache[rec.userId][dateStr];
  } else if (!ctx?.goOutCache) {
    goOuts = await attendanceRepo.getGoOutRecords(rec.userId, dateStr).catch(() => []);
  }
  for (const g of goOuts) {
    if (g.go_out_time) {
      const gIn = parseMySQLJSTToDate(g.go_out_time);
      let gOut = null;
      if (g.return_time) {
        gOut = parseMySQLJSTToDate(g.return_time);
      } else if (rec.checkOut) {
        gOut = parseMySQLJSTToDate(rec.checkOut);
      }
      
      if (gOut) {
        const mins = Math.max(0, minutesBetween(gIn, gOut));
        if (g.type === '私用') {
          privateGoOutMinutes += mins;
        } else if (g.type === '業務') {
          workGoOutMinutes += mins;
        }
      }
    }
  }
  
  // Trừ đi thời gian đi việc riêng và thời gian nghỉ
  worked = Math.max(0, worked - privateGoOutMinutes - breakMin);

  let isOff = ctx?.offDayCache ? (ctx.offDayCache[dateStr] || false) : await calendarRepo.isOff(dateStr).catch(() => false);
  
  // Override isOff based on daily record's work_type (kubun)
  if (dailyRec && dailyRec.work_type) {
    if (['出勤', '代替出勤', '半休'].includes(dailyRec.work_type)) {
      isOff = false;
    } else if (['休日', '代替休日', '休日出勤'].includes(dailyRec.work_type)) {
      isOff = true;
    }
  } else if (rec.shiftId) {
    // If an explicit shift is assigned for this record, it's considered a working day for this user
    isOff = false;
  }

  const scheduled = isOff ? 0 : Math.max(0, minutesBetween(shift.start, shift.end) - breakMin);
  const regular = Math.min(worked, scheduled);
  const overtime = Math.max(0, worked - scheduled);

  // Dùng CoreRules để lấy thêm thông tin Anomaly
  const metrics = CoreRules.calculateWorkMetrics(rec.checkIn, rec.checkOut, shift, isOff);

  return {
    id: rec.id,
    userId: rec.userId,
    date: dateStr,
    checkIn: rec.checkIn,
    checkOut: rec.checkOut,
    shift: shift.name,
    template,
    regularMinutes: regular,
    overtimeMinutes: overtime,
    nightMinutes: metrics.nightMinutes,
    isAnomaly: metrics.isAnomaly,
    anomalyType: metrics.anomalyType,
    privateGoOutMinutes,
    workGoOutMinutes
  };
}

async function computeRange(rows) {
  // Tổng hợp theo ngày và tổng cộng trong khoảng từ danh sách bản ghi đã chốt
  const items = [];
  if (!rows || rows.length === 0) return { days: [], total: { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0 } };

  const settingsRepo = require('../settings/settings.repository');
  const userRepo = require('../users/user.repository');
  const attendanceRepo = require('./attendance.repository');
  const calendarRepo = require('../calendar/calendar.repository');

  const cfg = await settingsRepo.getSettings().catch(() => null);
  const userCache = {};
  const deptCache = {};
  const shiftCache = {};
  const offDayCache = {};

  const years = new Set();
  for (const r of rows) {
    if (r.checkIn) {
      const dStr = typeof r.checkIn === 'string' ? r.checkIn : (r.checkIn instanceof Date ? r.checkIn.toISOString() : String(r.checkIn));
      years.add(parseInt(dStr.slice(0, 4), 10));
    }
  }
  
  for (const y of years) {
    if (!y || isNaN(y)) continue;
    const cal = await calendarRepo.computeYear(y).catch(() => null);
    if (cal && cal.off_days) {
      for (const d of cal.off_days) {
        offDayCache[d] = true;
      }
    }
  }

  const userIds = Array.from(new Set(rows.map(r => r.userId)));
  await Promise.all(userIds.map(async uid => {
    const u = await userRepo.getUserById(uid).catch(() => null);
    userCache[uid] = u;
    if (u?.departmentId && !deptCache[u.departmentId]) {
      deptCache[u.departmentId] = await userRepo.getDepartmentById(u.departmentId).catch(() => null);
    }
  }));

  const shiftIds = Array.from(new Set(rows.map(r => r.shiftId).filter(Boolean)));
  await Promise.all(shiftIds.map(async sid => {
    shiftCache[sid] = await attendanceRepo.getShiftById(sid).catch(() => null);
  }));

  const goOutCache = {};
  const dailyCache = {};
  if (rows.length > 0) {
    const uniqueDates = Array.from(new Set(rows.map(r => getJSTDateStr(r.checkIn))));
    const minDate = uniqueDates.reduce((a, b) => a < b ? a : b);
    const maxDate = uniqueDates.reduce((a, b) => a > b ? a : b);
    const ymMaps = new Set(uniqueDates.map(d => d.slice(0, 7)));
    for (const uid of userIds) {
      goOutCache[uid] = {};
      dailyCache[uid] = {};
      for (const ym of ymMaps) {
        const [yy, mm] = ym.split('-');
        const goOuts = await attendanceRepo.getGoOutRecordsByMonth(uid, yy, mm).catch(() => []);
        for (const g of goOuts) {
          if (!goOutCache[uid][g.date]) goOutCache[uid][g.date] = [];
          goOutCache[uid][g.date].push(g);
        }
      }
      
      const dailies = await attendanceRepo.listDailyBetween(uid, minDate, maxDate).catch(() => []);
      for (const d of dailies) {
        if (d.date) {
           const dStr = getJSTDateStr(d.date);
           dailyCache[uid][dStr] = d;
        }
      }
    }
  }

  const ctx = { cfg, userCache, deptCache, shiftCache, offDayCache, goOutCache, dailyCache };

  for (const r of rows) {
    if (!r.checkOut) continue;
    const x = await computeRecord(r, ctx);
    if (x?.template) continue;
    items.push(x);
  }
  const byDay = {};
  for (const it of items) {
    if (!byDay[it.date]) byDay[it.date] = { date: it.date, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, privateGoOutMinutes: 0, workGoOutMinutes: 0, items: [] };
    byDay[it.date].regularMinutes += it.regularMinutes;
    byDay[it.date].overtimeMinutes += it.overtimeMinutes;
    byDay[it.date].nightMinutes += it.nightMinutes;
    byDay[it.date].privateGoOutMinutes += it.privateGoOutMinutes || 0;
    byDay[it.date].workGoOutMinutes += it.workGoOutMinutes || 0;
    byDay[it.date].items.push(it);
  }
  const days = Object.values(byDay);
  const total = days.reduce((acc, d) => {
    acc.regularMinutes += d.regularMinutes;
    acc.overtimeMinutes += d.overtimeMinutes;
    acc.nightMinutes += d.nightMinutes;
    acc.privateGoOutMinutes += d.privateGoOutMinutes;
    acc.workGoOutMinutes += d.workGoOutMinutes;
    return acc;
  }, { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, privateGoOutMinutes: 0, workGoOutMinutes: 0 });
  return { days, total };
}

module.exports = { computeRecord, computeRange, CoreRules };
