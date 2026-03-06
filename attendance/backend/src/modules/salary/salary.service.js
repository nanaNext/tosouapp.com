const userRepo = require('../users/user.repository');
const attendanceService = require('../attendance/attendance.service');
const env = require('../../config/env');
const salaryRepo = require('./salary.repository');

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

async function computePayslipForUser(userId, month) {
  const pad = n => String(n).padStart(2, '0');
  const y = parseInt(String(month).split('-')[0], 10);
  const m = parseInt(String(month).split('-')[1], 10);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${y}-${pad(m)}-01`;
  const to = `${y}-${pad(m)}-${pad(lastDay)}`;

  const user = await userRepo.getUserById(userId);
  const ts = await attendanceService.timesheet(userId, from, to);
  const workDays = Array.isArray(ts.days) ? ts.days.length : 0;

  const year = y;
  const conf = await salaryRepo.getConfigByYear(year);
  const rStep = conf?.rounding_minutes ?? env.salaryRoundingMinutes;
  const rMode = conf?.rounding_mode ?? env.salaryRoundingMode;
  const regularMin = roundToStep(ts.total.regularMinutes || 0, rStep, rMode);
  const nightMin = roundToStep(ts.total.nightMinutes || 0, rStep, rMode);
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
  const overtimeMin = roundToStep(legalOverTotal, rStep, rMode);

  const userComp = await salaryRepo.getUserCompensation(userId);
  const baseMonthly = userComp?.base_salary ?? env.salaryBaseMonthly ?? 0;
  const empAllowance = userComp?.allowance_transport ?? env.salaryEmploymentAllowance ?? 0;
  const minutesPerMonth = conf?.working_minutes_per_month ?? env.salaryWorkingMinutesPerMonth ?? (160 * 60);
  const minuteRate = minutesPerMonth > 0 ? baseMonthly / minutesPerMonth : 0;

  const otAllowance = yen(overtimeMin * minuteRate * ((conf?.overtime_rate ?? env.salaryOvertimeRate) - 1));
  const nightAllowance = yen(nightMin * minuteRate * ((conf?.late_night_rate ?? env.salaryLateNightRate) - 1));
  const holidayAllowance = yen(holidayMin * minuteRate * ((conf?.holiday_rate ?? env.salaryHolidayRate) - 1));

  const 支給 = {
    基礎給: yen(baseMonthly),
    就業手当: yen(empAllowance),
    時間外手当: yen(otAllowance),
    所休出手当: yen(holidayAllowance),
    週40超手当: 0,
    月60超手当: 0,
    法休出手当: 0,
    深夜勤手当: yen(nightAllowance)
  };
  const 支給合計 = Object.values(支給).reduce((s, v) => s + (v || 0), 0);

  const health = yen(baseMonthly * (conf?.health_insurance_rate ?? env.salaryHealthRate ?? 0));
  const care = yen(baseMonthly * (conf?.care_insurance_rate ?? env.salaryCareRate ?? 0));
  const pension = yen(baseMonthly * (conf?.pension_rate ?? env.salaryPensionRate ?? 0));
  const employmentIns = yen(baseMonthly * (conf?.employment_insurance_rate ?? env.salaryEmploymentInsuranceRate ?? 0));
  const 社保合計額 = health + care + pension + employmentIns;
  const 課税対象額 = yen(支給合計 - 社保合計額);
  const incomeTax = yen(課税対象額 * (conf?.tax_rate ?? env.salaryTaxRate ?? 0));
  const rent = yen(env.salaryRentDeduction || 0);

  const 控除 = {
    健康保険: health,
    介護保険: care,
    厚生年金: pension,
    雇用保険: employmentIns,
    社保合計額,
    課税対象額,
    所得税: incomeTax,
    立替家賃: rent
  };
  const 控除合計 = Object.values(控除).reduce((s, v) => s + (v || 0), 0);

  const 合計 = {
    総支給額: 支給合計,
    総控除額: 控除合計,
    差引支給額: yen(支給合計 - 控除合計)
  };

  const 勤怠 = {
    出勤日数: workDays,
    有給休暇: 0,
    就業時間: regularMin,
    法外時間外: overtimeMin,
    所定休出勤: 0,
    週40超時間: roundToStep(weeklyOver40Min, rStep, rMode),
    月60超時間: roundToStep(monthlyOver60Min, rStep, rMode),
    法定休出勤: 0,
    深夜勤時間: nightMin,
    前月有休残: 0
  };

  return {
    userId: user?.id || Number(userId),
    従業員コード: user?.id || Number(userId),
    氏名: user?.username || '',
    対象年月: month,
    勤怠,
    支給,
    控除,
    合計,
    振込銀行: user?.bank_info || null
  };
}

async function computePayslips(userIds, month) {
  const employees = [];
  for (const id of userIds) {
    const e = await computePayslipForUser(id, month);
    employees.push(e);
  }
  return { employees };
}

module.exports = { computePayslips, computePayslipForUser };
