const { applySaturdayRule, getDepartmentOffDaySet } = require('../../src/modules/attendance/attendance.utils');

describe('applySaturdayRule（工事部: 第4土曜のみ休み）', () => {
  const baseOff = () => new Set(['2026-09-05', '2026-09-06', '2026-09-12', '2026-09-13', '2026-09-19', '2026-09-20', '2026-09-26', '2026-09-27']);

  it('第1・2・3・5土曜は出勤日、第4土曜と日曜は休み', () => {
    const off = baseOff();
    applySaturdayRule(off, 2026, new Set([4]), {});
    expect(off.has('2026-09-05')).toBe(false);
    expect(off.has('2026-09-12')).toBe(false);
    expect(off.has('2026-09-19')).toBe(false);
    expect(off.has('2026-09-26')).toBe(true);
    expect(off.has('2026-09-06')).toBe(true);
    // 2026/05/30 は第5土曜 → 出勤
    const may = new Set(['2026-05-30']);
    applySaturdayRule(may, 2026, new Set([4]), {});
    expect(may.has('2026-05-30')).toBe(false);
  });

  it('祝日・会社休日に当たる土曜は休みのまま', () => {
    const off = baseOff();
    applySaturdayRule(off, 2026, new Set([4]), {
      jp_auto: [{ date: '2026-09-12' }],
      fixed: [{ date: '2026-09-19', is_off: 1 }]
    });
    expect(off.has('2026-09-12')).toBe(true);
    expect(off.has('2026-09-19')).toBe(true);
    expect(off.has('2026-09-05')).toBe(false);
  });
});

describe('getDepartmentOffDaySet', () => {
  const calendarRepo = require('../../src/modules/calendar/calendar.repository');
  const deptRepo = require('../../src/modules/departments/department.repository');
  const holidayRepo = require('../../src/modules/holidays/holidays.repository');

  afterEach(() => jest.restoreAllMocks());

  it('部署の土曜ルールを毎年適用し、個別の休日設定で上書きできる', async () => {
    jest.spyOn(calendarRepo, 'computeYear').mockResolvedValue({ off_days: ['2027-09-04', '2027-09-05', '2027-09-11', '2027-09-25'], jp_auto: [], fixed: [] });
    jest.spyOn(deptRepo, 'getSaturdayOffWeeks').mockResolvedValue(new Set([4]));
    jest.spyOn(holidayRepo, 'listByDepartmentAndYear').mockResolvedValue([{ date: '2027-09-11', is_off: 1 }]);
    const off = await getDepartmentOffDaySet(2027, { departmentId: 5, tenantId: 1 });
    expect(off.has('2027-09-04')).toBe(false); // 第1土曜 → 出勤
    expect(off.has('2027-09-25')).toBe(true);  // 第4土曜 → 休み
    expect(off.has('2027-09-05')).toBe(true);  // 日曜
    expect(off.has('2027-09-11')).toBe(true);  // 個別設定で休み
  });

  it('ルール未設定の部署は会社カレンダーどおり（土曜休み）', async () => {
    jest.spyOn(calendarRepo, 'computeYear').mockResolvedValue({ off_days: ['2027-09-04'], jp_auto: [], fixed: [] });
    jest.spyOn(deptRepo, 'getSaturdayOffWeeks').mockResolvedValue(null);
    jest.spyOn(holidayRepo, 'listByDepartmentAndYear').mockResolvedValue([]);
    const off = await getDepartmentOffDaySet(2027, { departmentId: 6, tenantId: 1 });
    expect(off.has('2027-09-04')).toBe(true);
  });
});
