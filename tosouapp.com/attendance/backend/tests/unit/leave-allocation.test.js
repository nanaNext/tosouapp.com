const { allocateUsageByDays } = require('../../src/modules/leave/leave.controller');

describe('allocateUsageByDays', () => {
  it('付与日より前の取得は按分せず、残日数から差し引かない', () => {
    const grants = [{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 40 }];
    const used = [
      { date: '2026-06-10', kubun: '有給休暇', days: 1 },
      { date: '2026-07-07', kubun: '有給休暇', days: 1 }
    ];
    const { grants: out, days } = allocateUsageByDays(grants, used);
    expect(out[0].daysRemaining).toBe(39);
    expect(days.map(d => d.counted)).toEqual([0, 1]);
  });

  it('期間の重なる複数付与では古い付与枠から先に消化する', () => {
    const grants = [
      { grantDate: '2025-07-01', expiryDate: '2027-06-30', daysGranted: 1 },
      { grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 10 }
    ];
    const used = [
      { date: '2025-08-01', days: 0.5 },
      { date: '2026-07-10', days: 1 }
    ];
    const { grants: out, days } = allocateUsageByDays(grants, used);
    expect(out[0].daysRemaining).toBe(0);
    expect(out[1].daysRemaining).toBe(9.5);
    expect(days.map(d => d.counted)).toEqual([0.5, 1]);
  });

  it('有効期限切れ後の取得は差し引かない', () => {
    const grants = [{ grantDate: '2024-07-01', expiryDate: '2026-06-30', daysGranted: 10 }];
    const { grants: out, days } = allocateUsageByDays(grants, [{ date: '2026-07-01', days: 1 }]);
    expect(out[0].daysRemaining).toBe(10);
    expect(days[0].counted).toBe(0);
  });
});

describe('buildEffectiveGrants（労基法39条）', () => {
  const { buildEffectiveGrants, allocateUsageByDays: alloc } = require('../../src/modules/leave/leave.controller');
  const today = '2026-09-26';
  const used = [
    { date: '2026-06-10', days: 1 },
    { date: '2026-07-07', days: 1 }
  ];
  const available = (grants) => alloc(grants, used).grants
    .filter(g => g.expiryDate >= today)
    .reduce((s, g) => s + g.daysRemaining, 0);

  it('入社日から法定付与を自動計算し、古い付与から消化・2年で時効（吉田さんケース: 残39日）', () => {
    const { grants, slots } = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'full_time', registered: [], attendanceRows: [], today });
    expect(slots.map(s => [s.grantDate, s.legalDays])).toEqual([
      ['2017-07-01', 10], ['2018-07-01', 11], ['2019-07-01', 12], ['2020-07-01', 14], ['2021-07-01', 16],
      ['2022-07-01', 18], ['2023-07-01', 20], ['2024-07-01', 20], ['2025-07-01', 20], ['2026-07-01', 20]
    ]);
    expect(grants.every(g => g.source === 'legal')).toBe(true);
    // 6/10 は 2024/07/01 付与（~2026/06/30）から、7/7 は 2025/07/01 付与から消化 → 19 + 20
    expect(available(grants)).toBe(39);
  });

  it('繰越込みで登録された付与（法定超）より前の法定付与は二重計上しない', () => {
    const registered = [{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 40 }];
    const { grants, slots, cutoff } = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'full_time', registered, attendanceRows: [], today });
    expect(cutoff).toBe('2026-07-01');
    expect(grants).toEqual([{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 40, source: 'registered' }]);
    expect(slots.find(s => s.grantDate === '2025-07-01').status).toBe('carried');
    expect(available(grants)).toBe(39);
  });

  it('法定どおりの登録は登録値を使い、前年の法定付与（繰越）は自動計上する', () => {
    const registered = [{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 20 }];
    const { grants } = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'full_time', registered, attendanceRows: [], today });
    expect(grants.filter(g => g.grantDate === '2026-07-01')).toHaveLength(1);
    expect(grants.find(g => g.grantDate === '2025-07-01').source).toBe('legal');
    expect(available(grants)).toBe(39);
  });

  it('出勤率8割未満の期間の法定付与は計上しない（勤怠データ無しの期間は付与）', () => {
    const rows = [];
    for (let d = 1; d <= 10; d++) rows.push({ date: `2025-0${d <= 9 ? 3 : 4}-${String(d).padStart(2, '0')}`, kubun: d <= 3 ? '出勤' : '欠勤' });
    const { slots } = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'full_time', registered: [], attendanceRows: rows, today });
    expect(slots.find(s => s.grantDate === '2025-07-01').status).toBe('ineligible');
    expect(slots.find(s => s.grantDate === '2026-07-01').status).toBe('legal');
  });

  it('パート・アルバイトと MANUAL モードは自動計上しない', () => {
    const pt = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'part_time', registered: [], attendanceRows: [], today });
    expect(pt.grants).toEqual([]);
    const manual = buildEffectiveGrants({ hireDate: '2017-01-01', employmentType: 'full_time', registered: [], attendanceRows: [], today, autoLegal: false });
    expect(manual.grants).toEqual([]);
  });

  it('入社6か月未満は付与なし', () => {
    const { grants } = buildEffectiveGrants({ hireDate: '2026-04-01', employmentType: 'full_time', registered: [], attendanceRows: [], today });
    expect(grants).toEqual([]);
  });
});

describe('grantHistory', () => {
  const repo = require('../../src/modules/leave/leave.repository');
  const userRepo = require('../../src/modules/users/user.repository');
  const { grantHistory } = require('../../src/modules/leave/leave.controller');

  afterEach(() => jest.restoreAllMocks());

  it('入社日(hire_date)を参加日(join_date)より優先して起算する', async () => {
    jest.spyOn(userRepo, 'getUserById').mockResolvedValue({ id: 30, hire_date: '2017-01-01', join_date: '2026-06-23', employment_type: 'full_time' });
    jest.spyOn(repo, 'listGrants').mockResolvedValue([]);
    jest.spyOn(repo, 'listAttendanceKubun').mockResolvedValue([]);
    jest.spyOn(repo, 'listPaidLeaveUsedDays').mockResolvedValue([]);
    let body;
    const res = { status() { return this; }, json(o) { body = o; } };
    await grantHistory({ query: { userId: '30' }, tenantId: 1 }, res);
    expect(body.hireDate).toBe('2017-01-01');
    expect(body.rows[0].grantDate).toBe('2017-07-01');
  });

  it('法定付与と登録済み付与を突き合わせ、状態・使用日・残日数を返す（吉田さんケース）', async () => {
    jest.spyOn(userRepo, 'getUserById').mockResolvedValue({ id: 3, hire_date: '2017-01-01', employment_type: 'full_time' });
    jest.spyOn(repo, 'listGrants').mockResolvedValue([{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 40 }]);
    jest.spyOn(repo, 'listAttendanceKubun').mockResolvedValue([]);
    jest.spyOn(repo, 'listPaidLeaveUsedDays').mockResolvedValue([
      { date: '2026-06-10', kubun: '有給休暇', days: 1 },
      { date: '2026-07-07', kubun: '有給休暇', days: 1 }
    ]);
    let body;
    const res = { status() { return this; }, json(o) { body = o; } };
    await grantHistory({ query: { userId: '3' }, tenantId: 1 }, res);

    expect(body.hireDate).toBe('2017-01-01');
    expect(body.rows[0]).toMatchObject({ grantDate: '2017-07-01', legalDays: 10, status: 'carried', expired: true });
    expect(body.rows.find(r => r.grantDate === '2025-07-01')).toMatchObject({ legalDays: 20, status: 'carried', expiryDate: '2027-06-30' });
    expect(body.rows.find(r => r.grantDate === '2026-07-01')).toMatchObject({ legalDays: 20, status: 'registered', daysGranted: 40, used: 1, remaining: 39 });
    expect(body.unallocated).toEqual([{ date: '2026-06-10', days: 1, note: 'carried' }]);
  });
});
