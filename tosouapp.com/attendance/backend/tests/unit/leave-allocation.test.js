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
