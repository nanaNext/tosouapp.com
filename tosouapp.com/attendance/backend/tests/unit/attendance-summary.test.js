/**
 * monthly_summaries の再計算ロジックのテスト。
 * computeRange (attendance.rules.js) は既存の勤怠計算エンジンなのでモックし、
 * このサービス自身が行う集計・36協定判定だけを検証する。
 */
'use strict';

jest.mock('../../src/modules/attendance/attendance.repository', () => ({
  listByUserBetween: jest.fn(),
  listDailyBetween: jest.fn()
}));

jest.mock('../../src/modules/attendance/attendance.rules', () => ({
  computeRange: jest.fn()
}));

jest.mock('../../src/modules/departments/department.history.service', () => ({
  getDepartmentAsOf: jest.fn()
}));

jest.mock('../../src/modules/users/user.repository', () => ({
  getUserById: jest.fn(),
  listUsersPaged: jest.fn()
}));

jest.mock('../../src/modules/notices/notices.repository', () => ({
  createNotice: jest.fn()
}));

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn().mockResolvedValue([[]])
}));

const attendanceRepo = require('../../src/modules/attendance/attendance.repository');
const { computeRange } = require('../../src/modules/attendance/attendance.rules');
const historyService = require('../../src/modules/departments/department.history.service');
const summaryRepo = require('../../src/modules/attendance/attendance.summary.repository');
const { recomputeMonthlySummary } = require('../../src/modules/attendance/attendance.summary.service');

function itemsToComputeRangeResult(items) {
  const byDay = {};
  for (const it of items) {
    if (!byDay[it.date]) byDay[it.date] = { date: it.date, items: [] };
    byDay[it.date].items.push(it);
  }
  return { days: Object.values(byDay) };
}

beforeEach(() => {
  jest.clearAllMocks();
  attendanceRepo.listByUserBetween.mockResolvedValue([]);
  attendanceRepo.listDailyBetween.mockResolvedValue([]);
  historyService.getDepartmentAsOf.mockResolvedValue(3);
  jest.spyOn(summaryRepo, 'getLaborAgreementConfig').mockResolvedValue({ ...summaryRepo.DEFAULT_CONFIG });
  jest.spyOn(summaryRepo, 'listSummariesForYear').mockResolvedValue([]);
  jest.spyOn(summaryRepo, 'listRecentSummaries').mockResolvedValue([]);
  jest.spyOn(summaryRepo, 'upsertSummary').mockResolvedValue(1);
});

describe('recomputeMonthlySummary', () => {
  it('全日定時(8h)なら normal 判定になる (2026-09, 平日22日出勤の想定を簡略化して5日で検証)', async () => {
    const items = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']
      .map(date => ({ date, regularMinutes: 480, overtimeMinutes: 0, nightMinutes: 0 }));
    computeRange.mockResolvedValue(itemsToComputeRangeResult(items));
    attendanceRepo.listDailyBetween.mockResolvedValue([]);

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.attendDays).toBe(5);
    expect(r.overtimeMinutes).toBe(0);
    expect(r.judgement).toBe('normal');
    expect(r.departmentId).toBe(3);
    expect(summaryRepo.upsertSummary).toHaveBeenCalledTimes(1);
  });

  it('月間法定外残業が45h超なら exceeded 判定になる', async () => {
    // 20日間、毎日10時間勤務 -> 1日2h x 20日 = 40h の日次超過だけでも危ういが、
    // ここでは 3h/日 x 20日 = 60h の法定外残業を作る (45hを大きく超える)
    const items = [];
    for (let d = 1; d <= 20; d++) {
      items.push({ date: `2026-09-${String(d).padStart(2, '0')}`, regularMinutes: 480, overtimeMinutes: 180, nightMinutes: 0 });
    }
    computeRange.mockResolvedValue(itemsToComputeRangeResult(items));

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.overtimeMinutes).toBeGreaterThan(45 * 60);
    expect(r.judgement).toBe('exceeded');
  });

  it('45hの80%(36h)以上なら caution 判定になる', async () => {
    // 2026年9月の月〜金の完全な3週間 (9/7-11, 9/14-18, 9/21-25) を使う。
    // 毎日 480+160=640分勤務 (2h40mの残業) にすると、週合計と日次超過が
    // ちょうど打ち消し合って週残業は0になり、法定外残業=日次超過の合計=160分x15日=2400分=40h
    // (36h以上45h未満で caution になるはず)。
    const weekdays = [7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25];
    const items = weekdays.map(d => ({
      date: `2026-09-${String(d).padStart(2, '0')}`,
      regularMinutes: 480,
      overtimeMinutes: 160,
      nightMinutes: 0
    }));
    computeRange.mockResolvedValue(itemsToComputeRangeResult(items));

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.overtimeMinutes).toBe(2400);
    expect(r.overtimeMinutes).toBeGreaterThanOrEqual(45 * 60 * 0.8);
    expect(r.overtimeMinutes).toBeLessThan(45 * 60);
    expect(r.judgement).toBe('caution');
  });

  it('休日出勤の区分がある日は holidayWorkMinutes に加算される', async () => {
    const items = [{ date: '2026-09-06', regularMinutes: 480, overtimeMinutes: 0, nightMinutes: 0 }];
    computeRange.mockResolvedValue(itemsToComputeRangeResult(items));
    attendanceRepo.listDailyBetween.mockResolvedValue([{ date: '2026-09-06', kubun: '休日出勤' }]);

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.holidayWorkMinutes).toBe(480);
    expect(r.singleMonthBasisMinutes).toBe(r.overtimeMinutes + 480);
  });

  it('休日出勤の時間は週40h残業の計算に混ぜない（二重計上バグの回帰テスト）', async () => {
    // 月〜金(9/7-9/11)はちょうど40h(8h x 5日、日次超過なし)。
    // 土(9/12)は休日出勤の区分で4h勤務 — 同じ週に含めて計算すると、修正前は
    // 週合計44hのうち4hが「週40h超の法定外残業」として二重計上されてしまっていた。
    const weekdayItems = ['07', '08', '09', '10', '11'].map(d => ({
      date: `2026-09-${d}`, regularMinutes: 480, overtimeMinutes: 0, nightMinutes: 0
    }));
    const holidayItem = { date: '2026-09-12', regularMinutes: 240, overtimeMinutes: 0, nightMinutes: 0 };
    computeRange.mockResolvedValue(itemsToComputeRangeResult([...weekdayItems, holidayItem]));
    attendanceRepo.listDailyBetween.mockResolvedValue([{ date: '2026-09-12', kubun: '休日出勤' }]);

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.overtimeMinutes).toBe(0); // 平日分だけで週40h残業は発生しない
    expect(r.holidayWorkMinutes).toBe(240);
    expect(r.singleMonthBasisMinutes).toBe(240); // 0 + 240、二重計上なら 240+240=480 になってしまう
  });

  it('年間の法定外残業は過去の確定済みサマリーの積み上げ + 当月で計算する', async () => {
    computeRange.mockResolvedValue(itemsToComputeRangeResult([
      { date: '2026-09-01', regularMinutes: 480, overtimeMinutes: 60, nightMinutes: 0 }
    ]));
    summaryRepo.listSummariesForYear.mockResolvedValue([
      { month: 3, overtime_minutes: 1000, single_month_basis_minutes: 1000 },
      { month: 6, overtime_minutes: 2000, single_month_basis_minutes: 2000 }
    ]);

    const r = await recomputeMonthlySummary(10, 2026, 9, 5);
    expect(r.annualOvertimeMinutes).toBe(1000 + 2000 + r.overtimeMinutes);
  });
});
