const userRepo = require('../users/user.repository');
const attendanceRules = require('../attendance/attendance.rules');
const attendanceRepo = require('../attendance/attendance.repository');
const leaveRepo = require('../leave/leave.repository');
const env = require('../../config/env');
const salaryRepo = require('./salary.repository');
const { calculatePaidLeaveEntitlement } = require('../../utils/leaveRules');
const { resolveEmploymentStartDate } = require('../../utils/employmentDate');

function roundToStep(value, step, mode) {
  if (!step || step <= 0) return value;
  const v = Number(value) || 0;
  const q = v / step;
  if (mode === 'down') return Math.floor(q) * step;
  if (mode === 'up') return Math.ceil(q) * step;
  return Math.round(q) * step;
}

function yen(n) {
  return Math.round(Number(n) || 0);
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  const out = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const label = String(it.label || '').trim();
    if (!label) continue;
    const amount = yen(it.amount);
    if (!amount) continue;
    out.push({ label, amount });
  }
  return out;
}

function normalizeBankAccountParts(v) {
  if (!v || typeof v !== 'object') return null;
  const bankName = String(v.bankName || '').trim();
  const branchName = String(v.branchName || '').trim();
  const accountType = String(v.accountType || '').trim();
  const accountNumber = String(v.accountNumber || '').replace(/[^\d]/g, '').trim();
  const accountHolder = String(v.accountHolder || '').trim();
  return { bankName, branchName, accountType, accountNumber, accountHolder };
}

function formatBankAccount(parts) {
  const p = normalizeBankAccountParts(parts);
  if (!p) return '';
  const segs = [];
  if (p.bankName) segs.push(p.bankName);
  if (p.branchName) segs.push(p.branchName);
  if (p.accountType) segs.push(p.accountType);
  if (p.accountNumber) segs.push(p.accountNumber);
  if (p.accountHolder) segs.push(p.accountHolder);
  return segs.join(' ');
}

function parseDateUTC(s) {
  const t = String(s || '').slice(0, 10);
  const d = new Date(t + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) ? d : null;
}

function daysBetweenInclusiveUTC(from, to) {
  const a = parseDateUTC(from);
  const b = parseDateUTC(to);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / 86400000);
  return Math.max(0, days + 1);
}

function overlapDaysUTC(aFrom, aTo, bFrom, bTo) {
  const a1 = parseDateUTC(aFrom);
  const a2 = parseDateUTC(aTo);
  const b1 = parseDateUTC(bFrom);
  const b2 = parseDateUTC(bTo);
  if (!a1 || !a2 || !b1 || !b2) return 0;
  const start = new Date(Math.max(a1.getTime(), b1.getTime()));
  const end = new Date(Math.min(a2.getTime(), b2.getTime()));
  if (end.getTime() < start.getTime()) return 0;
  return daysBetweenInclusiveUTC(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
}

function summarizeApprovedLeaveDays(list, fromDate, toDate) {
  let paidDays = 0;
  let unpaidDays = 0;
  for (const r of (list || [])) {
    const overlapDays = overlapDaysUTC(r.startDate, r.endDate, fromDate, toDate);
    if (!overlapDays) continue;
    const t = String(r?.type || '').toLowerCase();
    if (t === 'paid') {
      paidDays += overlapDays;
      continue;
    }
    if (t.includes('unpaid') || t.includes('nopay') || t.includes('no_pay')) {
      unpaidDays += overlapDays;
    }
  }
  return { paidDays, unpaidDays };
}
// Hàm này là dùng để tính số ngày không có lương trong khoảng thời gian từ 
// fromDate đến toDate  
 
// Hàm này là dùng để tính lương cho người dùng trong tháng month
async function computePayslipForUser(userId, month, options = null) {
  const pad = n => String(n).padStart(2, '0');
  const y = parseInt(String(month).split('-')[0], 10);
  const m = parseInt(String(month).split('-')[1], 10);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${y}-${pad(m)}-01`;
  const to = `${y}-${pad(m)}-${pad(lastDay)}`;

  const year = y;
  const [user, dailyRows, attendanceRows, approvedLeaveRows, conf, userComp] = await Promise.all([
    userRepo.getUserById(userId),
    attendanceRepo.listDailyBetween(userId, from, to).catch(() => []),
    attendanceRepo.listByUserBetween(userId, from, to).catch(() => []),
    leaveRepo.listApprovedByUserOverlap(userId, from, to).catch(() => []),
    salaryRepo.getConfigByYear(year),
    salaryRepo.getUserCompensation(userId)
  ]);
  const dept = user?.departmentId ? await userRepo.getDepartmentById(user.departmentId).catch(() => null) : null;
  
  const workKubunSet = new Set(['出勤', '半休', '半休(有給)', '振替出勤', '休日出勤', '代替出勤']);
  const workDaysSet = new Set();
  let paidLeaveDaysFromDaily = 0;
  let absentDaysFromDaily = 0;
  let unpaidLeaveDaysFromDaily = 0;

  for (const r of dailyRows) {
    const date = String(r.date || '').slice(0, 10);
    const kubun = String(r.kubun || '').trim();
    if (workKubunSet.has(kubun)) {
      workDaysSet.add(date);
    }
    if (kubun === '有給休暇') {
      paidLeaveDaysFromDaily++;
    }
    if (kubun === '半休(有給)') {
      paidLeaveDaysFromDaily += 0.5;
    }
    if (kubun === '欠勤') {
      absentDaysFromDaily++;
    }
    if (kubun === '無給休暇') {
      unpaidLeaveDaysFromDaily++;
    }
  }
  for (const r of attendanceRows) {
    const date = String(r.checkIn || r.checkOut || '').slice(0, 10);
    if (date) workDaysSet.add(date);
  }

  const ts = await attendanceRules.computeRange(attendanceRows);
  const workDays = workDaysSet.size;
  
  // Use either leave requests or manual daily entry for paid leave
  const leaveSummary = summarizeApprovedLeaveDays(approvedLeaveRows, from, to);
  const paidLeaveDaysFromRequests = leaveSummary.paidDays;
  const paidLeaveDays = Math.max(paidLeaveDaysFromDaily, paidLeaveDaysFromRequests);
  const unpaidLeaveDaysFromRequests = leaveSummary.unpaidDays;
  const unpaidLeaveDays = Math.max(unpaidLeaveDaysFromDaily, unpaidLeaveDaysFromRequests);
  
  const paidLeaveEntitlement = calculatePaidLeaveEntitlement(resolveEmploymentStartDate(user));

  const rStep = conf?.rounding_minutes ?? env.salaryRoundingMinutes;
  const rMode = conf?.rounding_mode ?? env.salaryRoundingMode;
  const regularMin = roundToStep(ts.total.regularMinutes || 0, rStep, rMode);
  let nightMin = roundToStep(ts.total.nightMinutes || 0, rStep, rMode);
  const holidayMin = 0;
  function isoWeekStartStr(s) {
    const d = new Date(s + 'T00:00:00Z');
    const dow = d.getUTCDay();
    const delta = (dow + 6) % 7;
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - delta));
    const y = start.getUTCFullYear();
    const m2 = String(start.getUTCMonth() + 1).padStart(2, '0');
    const d2 = String(start.getUTCDate()).padStart(2, '0');
    return `${y}-${m2}-${d2}`;
  }
  const empType = String(user?.employment_type || 'full_time').toLowerCase();
  let weeklyOver40Min = 0;
  let dailyOverTotal = 0;
  let weeklyAdditional = 0;
  if (Array.isArray(ts.days)) {
    const weeks = {};
    for (const day of ts.days) {
      const worked = (day.regularMinutes || 0) + (day.overtimeMinutes || 0);
      const dOver = Math.max(0, worked - (8 * 60));
      dailyOverTotal += dOver;
      const w = isoWeekStartStr(day.date);
      if (!weeks[w]) weeks[w] = { total: 0, dailyOver: 0 };
      weeks[w].total += worked;
      weeks[w].dailyOver += dOver;
    }
    for (const k in weeks) {
      const over = Math.max(0, (weeks[k].total || 0) - (40 * 60));
      weeklyOver40Min += over;
      const add = Math.max(0, over - (weeks[k].dailyOver || 0));
      weeklyAdditional += add;
    }
  }
  let legalOverTotal = dailyOverTotal + weeklyAdditional;
  let monthlyOver60Min = empType === 'full_time' ? Math.max(0, legalOverTotal - (60 * 60)) : 0;
  let overtimeMin = roundToStep(legalOverTotal, rStep, rMode);

  const opts = options && typeof options === 'object' ? options : {};
  let baseMonthly = Object.prototype.hasOwnProperty.call(opts, 'baseMonthly')
    ? yen(opts.baseMonthly)
    : (userComp?.base_salary ?? env.salaryBaseMonthly ?? 0);
  const empAllowance = Object.prototype.hasOwnProperty.call(opts, 'transportAllowance')
    ? yen(opts.transportAllowance)
    : (userComp?.allowance_transport ?? env.salaryEmploymentAllowance ?? 0);
  let holidayWorkMin = 0; // 所定休出勤 (Holiday Work)
  let legalHolidayWorkMin = 0; // 法定休出勤 (Legal Holiday Work)

  if (ts && ts.days && Array.isArray(ts.days)) {
    for (const d of ts.days) {
      const k = String(d?.daily?.kubun || '').trim();
      const wt = Number(d?.daily?.working_minutes || 0);
      if (k === '休日出勤') holidayWorkMin += wt;
      if (k === '法定休日出勤') legalHolidayWorkMin += wt;
    }
  }

  const kOverride = opts.kintai && typeof opts.kintai === 'object' ? opts.kintai : {};
  
  // Parse overridden hours to minutes for allowance calculation
  const parseHmToMin = (str) => {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
  };

  if (Object.prototype.hasOwnProperty.call(kOverride, '法外時間外') && kOverride['法外時間外'] !== '') {
    const overrideMin = parseHmToMin(kOverride['法外時間外']);
    if (overrideMin != null) overtimeMin = overrideMin;
  } else if (Object.prototype.hasOwnProperty.call(kOverride, '時間外時間') && kOverride['時間外時間'] !== '') {
    const overrideMin = parseHmToMin(kOverride['時間外時間']);
    if (overrideMin != null) overtimeMin = overrideMin;
  }
  if (Object.prototype.hasOwnProperty.call(kOverride, '深夜勤時間') && kOverride['深夜勤時間'] !== '') {
    const overrideMin = parseHmToMin(kOverride['深夜勤時間']);
    if (overrideMin != null) nightMin = overrideMin;
  }
  if (Object.prototype.hasOwnProperty.call(kOverride, '週40超時間') && kOverride['週40超時間'] !== '') {
    const overrideMin = parseHmToMin(kOverride['週40超時間']);
    if (overrideMin != null) weeklyOver40Min = overrideMin;
  }
  if (Object.prototype.hasOwnProperty.call(kOverride, '月60超時間') && kOverride['月60超時間'] !== '') {
    const overrideMin = parseHmToMin(kOverride['月60超時間']);
    if (overrideMin != null) monthlyOver60Min = overrideMin;
  }
  // Holiday overrides are in days or hours? The UI uses inputs for days, but for hours?
  // UI has: 所定休出勤 (not in UI), 法定休出勤 (not in UI)

  // Check if this is an hourly wage part-timer (if baseMonthly is < 10000, it's an hourly wage)
  const isHourlyWage = (empType === 'part_time' || empType.includes('baito')) && baseMonthly > 0 && baseMonthly < 10000;
  let hourlyWage = 0;

  const minutesPerMonth = conf?.working_minutes_per_month ?? env.salaryWorkingMinutesPerMonth ?? (160 * 60);
  let baseRate = Number(conf?.base_hourly_rate ?? env.salaryBaseHourlyRate) || 0;
  let minuteRate = baseRate > 0 ? baseRate / 60 : (minutesPerMonth > 0 ? baseMonthly / minutesPerMonth : 0);

  if (isHourlyWage) {
    hourlyWage = baseMonthly;
    minuteRate = hourlyWage / 60;
    // Base monthly is calculated by regular hours * hourly wage
    baseMonthly = Math.round((regularMin / 60) * hourlyWage);
  }

  const otAllowance = yen(overtimeMin * minuteRate * ((conf?.overtime_rate ?? env.salaryOvertimeRate) - 1));
  const nightAllowance = yen(nightMin * minuteRate * ((conf?.late_night_rate ?? env.salaryLateNightRate) - 1));
  const holidayAllowance = yen(holidayWorkMin * minuteRate * ((conf?.holiday_rate ?? env.salaryHolidayRate) - 1));
  const legalHolidayAllowance = yen(legalHolidayWorkMin * minuteRate * ((conf?.holiday_rate ?? env.salaryHolidayRate) - 1));
  const weekly40Allowance = yen(weeklyOver40Min * minuteRate * ((conf?.overtime_rate ?? env.salaryOvertimeRate) - 1));
  const monthly60Allowance = yen(monthlyOver60Min * minuteRate * ((conf?.overtime_rate ?? env.salaryOvertimeRate) - 1));

  const kAbsentDays = Object.prototype.hasOwnProperty.call(kOverride, '欠勤日数') ? yen(kOverride['欠勤日数']) : absentDaysFromDaily;
  const kUnpaidLeaveDays = Object.prototype.hasOwnProperty.call(kOverride, '無給休暇') ? yen(kOverride['無給休暇']) : unpaidLeaveDays;
  const kPaidLeaveDays = Object.prototype.hasOwnProperty.call(kOverride, '有給休暇') ? yen(kOverride['有給休暇']) : paidLeaveDays;
  const kScheduledDaysOverride =
    Object.prototype.hasOwnProperty.call(kOverride, '所定労働日数') ? yen(kOverride['所定労働日数'])
    : (Object.prototype.hasOwnProperty.call(kOverride, '所定日数') ? yen(kOverride['所定日数']) : 0);
  
  const defaultScheduledWorkDays = Math.round(minutesPerMonth / (8 * 60)) || 21;
  let computedScheduledWorkDays = defaultScheduledWorkDays;
  const kWorkDaysOverride = Object.prototype.hasOwnProperty.call(kOverride, '出勤日数') ? yen(kOverride['出勤日数']) : workDays;
  
  // Fallback to default (e.g. 21 days) only if we have absolutely no data to go on.
  // If the user explicitly inputted work days or we inferred them, trust that number even if it's < 15,
  // because some part-time employees might legitimately only work a few days a month.
  const inferredDays = kWorkDaysOverride + kAbsentDays + kUnpaidLeaveDays + kPaidLeaveDays;
  if (inferredDays > 0) {
    computedScheduledWorkDays = inferredDays;
  }
  
  // Ensure scheduledWorkDays is never dangerously low to prevent massive deductions per day
  const rawScheduledDays = kScheduledDaysOverride > 0 ? kScheduledDaysOverride : computedScheduledWorkDays;
  const scheduledWorkDays = rawScheduledDays > 0 ? rawScheduledDays : defaultScheduledWorkDays;
  const formatHm = (min) => Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');

  const 支給 = {
    基礎給: yen(baseMonthly),
    就業手当: yen(empAllowance),
    時間外手当: yen(otAllowance),
    所休出手当: yen(holidayAllowance),
    週40超手当: yen(weekly40Allowance),
    月60超手当: yen(monthly60Allowance),
    法休出手当: yen(legalHolidayAllowance),
    深夜勤手当: yen(nightAllowance)
  };
  const overrideEarnings = Array.isArray(opts.overrideEarnings)
    ? normalizeItems(opts.overrideEarnings)
    : (opts.overrideEarnings && typeof opts.overrideEarnings === 'object'
        ? Object.entries(opts.overrideEarnings).map(([label, amount]) => ({ label, amount: yen(amount) }))
        : []);
  const hasAbsentDeductionOverride = overrideEarnings.some(it => String(it?.label || '') === '欠勤控除');
  for (const it of overrideEarnings) {
    支給[it.label] = yen(it.amount);
  }
  const extraEarnings = normalizeItems(opts.extraEarnings);
  for (const it of extraEarnings) {
    支給[it.label] = (支給[it.label] || 0) + it.amount;
  }

  if (
    (kAbsentDays + kUnpaidLeaveDays) > 0
    && scheduledWorkDays > 0
    && !hasAbsentDeductionOverride
  ) {
    const perDay = baseMonthly / scheduledWorkDays;
    const absentDeduction = yen(perDay * (kAbsentDays + kUnpaidLeaveDays));
    if (absentDeduction) {
      支給['欠勤控除'] = -Math.abs(absentDeduction);
    }
  }

  const otherItems = normalizeItems(opts.otherItems);
  const その他 = {};
  let additionalMedicalFee = 0;
  let yecFee = 0;  // 年末調整徴収
  let yerFee = 0;  // 年末調整還付

  for (const it of otherItems) {
    if (it.label === '差額計算') {
      支給['差額計算'] = (支給['差額計算'] || 0) + yen(it.amount);
    } else if (it.label === '追加検診費' || it.label === '追加診療費') {
      additionalMedicalFee += yen(it.amount);
    } else if (it.label === '年末調整徴収') {
      yecFee += yen(it.amount);
    } else if (it.label === '年末調整還付') {
      yerFee += yen(it.amount);
    } else {
      その他[it.label] = (その他[it.label] || 0) + yen(it.amount);
    }
  }

  if (yerFee !== 0) {
    支給['年末調整還付'] = (支給['年末調整還付'] || 0) + Math.abs(yerFee);
  }

  const 支給合計 = Object.values(支給).reduce((s, v) => s + (v || 0), 0);

  const autoCalc = Boolean(opts?.autoCalcDeductions);
  const health = autoCalc ? yen(baseMonthly * (conf?.health_insurance_rate ?? env.salaryHealthRate ?? 0)) : 0;
  const care = autoCalc ? yen(baseMonthly * (conf?.care_insurance_rate ?? env.salaryCareRate ?? 0)) : 0;
  const pension = autoCalc ? yen(baseMonthly * (conf?.pension_rate ?? env.salaryPensionRate ?? 0)) : 0;
  const employmentIns = autoCalc ? yen(baseMonthly * (conf?.employment_insurance_rate ?? env.salaryEmploymentInsuranceRate ?? 0)) : 0;
  const rent = Object.prototype.hasOwnProperty.call(opts, 'rentDeduction')
    ? yen(opts.rentDeduction)
    : yen(env.salaryRentDeduction || 0);

  const normalizeDeductionLabel = (label) => {
    const s = String(label || '').trim();
    if (!s) return s;
    if (s === '健康保険') return '健康保険料';
    if (s === '介護保険') return '介護保険料';
    if (s === '厚生年金') return '厚生年金保険';
    if (s === '雇用保険') return '雇用保険料';
    if (s === '住民票') return '住民税';
    return s;
  };

  const 控除 = {
    健康保険料: health,
    介護保険料: care,
    厚生年金保険: pension,
    雇用保険料: employmentIns,
    社保合計額: 0,
    課税対象額: 0,
    所得税: 0,
    住民税: 0,
    立替家賃: rent
  };
  const overrideDeductions = Array.isArray(opts.overrideDeductions)
    ? normalizeItems(opts.overrideDeductions)
    : (opts.overrideDeductions && typeof opts.overrideDeductions === 'object'
        ? Object.entries(opts.overrideDeductions).map(([label, amount]) => ({ label, amount: yen(amount) }))
        : []);
  let hasIncomeTaxOverride = false;
  for (const it of overrideDeductions) {
    const k = normalizeDeductionLabel(it.label);
    if (k) 控除[k] = yen(it.amount);
    if (k === '所得税') hasIncomeTaxOverride = true;
  }
  const extraDeductions = normalizeItems(opts.extraDeductions);
  for (const it of extraDeductions) {
    const k = normalizeDeductionLabel(it.label);
    if (!k) continue;
    控除[k] = (控除[k] || 0) + it.amount;
    if (k === '所得税') hasIncomeTaxOverride = true;
  }

  if (additionalMedicalFee !== 0) {
    控除['追加診療費'] = (控除['追加診療費'] || 0) + Math.abs(additionalMedicalFee);
  }
  if (yecFee !== 0) {
    控除['年末調整徴収'] = (控除['年末調整徴収'] || 0) + Math.abs(yecFee);
  }

  const 社保合計額 = yen(
    yen(控除['健康保険料'] || 0)
    + yen(控除['介護保険料'] || 0)
    + yen(控除['厚生年金保険'] || 0)
    + yen(控除['雇用保険料'] || 0)
  );
  // 年末調整還付 (Tax refund) is non-taxable, so we exclude it from the taxable income base
  const 課税対象額 = Math.max(0, yen(支給合計 - (支給['年末調整還付'] || 0) - 社保合計額));
  if (autoCalc && !hasIncomeTaxOverride) {
    const calcIncomeTax = yen(課税対象額 * (conf?.tax_rate ?? env.salaryTaxRate ?? 0));
    控除['所得税'] = calcIncomeTax;
  }
  控除['社保合計額'] = 社保合計額;
  控除['課税対象額'] = 課税対象額;

  const 控除合計 = Object.entries(控除)
    .filter(([k]) => k !== '社保合計額' && k !== '課税対象額')
    .reduce((s, [, v]) => s + (v || 0), 0);

  const その他合計 = Object.values(その他).reduce((s, v) => s + (v || 0), 0);

  const 合計 = {
    総支給額: 支給合計,
    総控除額: 控除合計,
    その他合計: その他合計,
    差引支給額: yen(支給合計 - 控除合計)
  };

  // Apply frontend kintai override correctly mapped for preview UI output.
  const 勤怠 = {
    所定日数: scheduledWorkDays,
    出勤日数: Object.prototype.hasOwnProperty.call(kOverride, '出勤日数') ? yen(kOverride['出勤日数']) : workDays,
    休日出勤日数: Object.prototype.hasOwnProperty.call(kOverride, '休日出勤日数') ? yen(kOverride['休日出勤日数']) : 0,
    半日出勤日数: Object.prototype.hasOwnProperty.call(kOverride, '半日出勤日数') ? yen(kOverride['半日出勤日数']) : 0,
    欠勤日数: kAbsentDays,
    無給休暇: kUnpaidLeaveDays,
    有給休暇: kPaidLeaveDays,
    有給休暇付与: Object.prototype.hasOwnProperty.call(kOverride, '有給休暇付与') ? yen(kOverride['有給休暇付与']) : paidLeaveEntitlement,
    所定労働日数: scheduledWorkDays,
    就業時間: Object.prototype.hasOwnProperty.call(kOverride, '就業時間') && kOverride['就業時間'] !== '' ? String(kOverride['就業時間']) : formatHm(regularMin),
    時間外時間: Object.prototype.hasOwnProperty.call(kOverride, '時間外時間') && kOverride['時間外時間'] !== '' ? String(kOverride['時間外時間']) : formatHm(overtimeMin),
    法外時間外: Object.prototype.hasOwnProperty.call(kOverride, '法外時間外') && kOverride['法外時間外'] !== '' ? String(kOverride['法外時間外']) : formatHm(overtimeMin),
    所定休出勤: Object.prototype.hasOwnProperty.call(kOverride, '所定休出勤') && kOverride['所定休出勤'] !== '' ? kOverride['所定休出勤'] : 0,
    週40超時間: Object.prototype.hasOwnProperty.call(kOverride, '週40超時間') && kOverride['週40超時間'] !== '' ? String(kOverride['週40超時間']) : formatHm(roundToStep(weeklyOver40Min, rStep, rMode)),
    月60超時間: Object.prototype.hasOwnProperty.call(kOverride, '月60超時間') && kOverride['月60超時間'] !== '' ? String(kOverride['月60超時間']) : formatHm(roundToStep(monthlyOver60Min, rStep, rMode)),
    法定休出勤: Object.prototype.hasOwnProperty.call(kOverride, '法定休出勤') && kOverride['法定休出勤'] !== '' ? kOverride['法定休出勤'] : 0,
    深夜勤時間: Object.prototype.hasOwnProperty.call(kOverride, '深夜勤時間') && kOverride['深夜勤時間'] !== '' ? String(kOverride['深夜勤時間']) : formatHm(nightMin),
    前月有休残: 0
  };

  const payment = (opts.payment && typeof opts.payment === 'object') ? opts.payment : {};
  const cashPay = Object.prototype.hasOwnProperty.call(payment, '現金支給額') ? yen(payment['現金支給額']) : 0;
  const inKindPay = Object.prototype.hasOwnProperty.call(payment, '現物支給額') ? yen(payment['現物支給額']) : 0;
  const bankExplicit = Object.prototype.hasOwnProperty.call(payment, '振込支給額') ? yen(payment['振込支給額']) : null;
  const net = yen(合計.差引支給額);
  let bankPay = bankExplicit != null ? bankExplicit : Math.max(0, net - cashPay - inKindPay);
  if (bankExplicit != null) {
    const sum = yen(bankExplicit + cashPay + inKindPay);
    if (sum !== yen(net)) {
      bankPay = Math.max(0, net - cashPay - inKindPay);
    }
  }
  const 支払 = {
    振込支給額: bankPay,
    現金支給額: cashPay,
    現物支給額: inKindPay
  };

  const bankAccountFromParts = formatBankAccount(opts.bankAccountParts);
  const bankAccount = bankAccountFromParts
    || String(opts.bankAccount || '').trim()
    || String(user?.bank_info || '').trim()
    || null;

  return {
    userId: user?.id || Number(userId),
    従業員コード: String(user?.employee_code || '').trim() || (user?.id || Number(userId)),
    氏名: user?.username || '',
    所属: dept?.name || '',
    対象年月: month,
    勤怠,
    支給,
    控除,
    その他,
    合計,
    支払,
    振込口座: bankAccount,
    振込銀行: bankAccount
  };
}

async function computePayslips(userIds, month) {
  const employees = [];
  const chunkSize = 10;
  
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(id => computePayslipForUser(id, month))
    );
    employees.push(...chunkResults);
  }
  
  return { employees };
}

// Dịch vụ tính toán Lương & Phiếu lương (Payslip)
module.exports = { computePayslips, computePayslipForUser };
