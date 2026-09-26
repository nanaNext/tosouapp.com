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

describe('grantHistory', () => {
  const repo = require('../../src/modules/leave/leave.repository');
  const userRepo = require('../../src/modules/users/user.repository');
  const { grantHistory } = require('../../src/modules/leave/leave.controller');

  afterEach(() => jest.restoreAllMocks());

  it('入社日から法定付与を並べ、登録済み付与の使用日・残日数と未按分の取得日を返す', async () => {
    jest.spyOn(userRepo, 'getUserById').mockResolvedValue({ id: 3, hire_date: '2017-01-01', employment_type: 'full_time' });
    jest.spyOn(repo, 'listGrants').mockResolvedValue([{ grantDate: '2026-07-01', expiryDate: '2028-06-30', daysGranted: 40 }]);
    jest.spyOn(repo, 'listPaidLeaveUsedDays').mockResolvedValue([
      { date: '2026-06-10', kubun: '有給休暇', days: 1 },
      { date: '2026-07-07', kubun: '有給休暇', days: 1 }
    ]);
    let body;
    const res = { status() { return this; }, json(o) { body = o; } };
    await grantHistory({ query: { userId: '3' }, tenantId: 1 }, res);

    expect(body.hireDate).toBe('2017-01-01');
    expect(body.rows[0]).toMatchObject({ grantDate: '2017-07-01', legalDays: 10, registered: false, expired: true });
    const y2025 = body.rows.find(r => r.grantDate === '2025-07-01');
    expect(y2025).toMatchObject({ legalDays: 20, registered: false, expiryDate: '2027-06-30', expired: false });
    const y2026 = body.rows.find(r => r.grantDate === '2026-07-01');
    expect(y2026).toMatchObject({ legalDays: 20, registered: true, daysGranted: 40, used: 1, remaining: 39 });
    expect(body.unallocated).toEqual([{ date: '2026-06-10', days: 1 }]);
  });
});
