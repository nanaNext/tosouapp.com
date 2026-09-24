/**
 * users.allowance_transport (給与の固定月額通勤手当) の非課税判定テスト。
 * expense_claims 側の computeTaxableForUserMonth と同じ基準
 * （電車・バスは月額上限、マイカー等は距離別テーブル）を、
 * 月額1本の値に対しても正しく適用できているかを確認する。
 */
'use strict';

jest.mock('../../src/modules/salary/salary.repository', () => ({
  getConfigByYear: jest.fn()
}));

jest.mock('../../src/modules/expenses/expenseSettings.repository', () => ({
  getMileageTiers: jest.fn()
}));

const salaryRepo = require('../../src/modules/salary/salary.repository');
const settingsRepo = require('../../src/modules/expenses/expenseSettings.repository');
const { computeTransportAllowanceTaxable } = require('../../src/modules/expenses/expenses.tax');

afterEach(() => {
  jest.clearAllMocks();
});

describe('computeTransportAllowanceTaxable', () => {
  it('電車・バス: 上限(150,000円)以下なら全額非課税', async () => {
    salaryRepo.getConfigByYear.mockResolvedValue(null); // フォールバック 150000 を使う
    const r = await computeTransportAllowanceTaxable(120000, 'transit', null, '2026-09', null);
    expect(r).toEqual({ taxableAmount: 0, nonTaxableAmount: 120000, limit: 150000 });
  });

  it('電車・バス: 上限を超えた分だけ課税対象になる', async () => {
    salaryRepo.getConfigByYear.mockResolvedValue(null);
    const r = await computeTransportAllowanceTaxable(180000, 'transit', null, '2026-09', null);
    expect(r.limit).toBe(150000);
    expect(r.taxableAmount).toBe(30000);
    expect(r.nonTaxableAmount).toBe(150000);
  });

  it('テナント別の上限設定があればそちらを優先する', async () => {
    salaryRepo.getConfigByYear.mockResolvedValue({ commute_allowance_tax_free_limit: 100000 });
    const r = await computeTransportAllowanceTaxable(120000, 'transit', null, '2026-09', 5);
    expect(r.limit).toBe(100000);
    expect(r.taxableAmount).toBe(20000);
  });

  it('マイカー等: 距離に応じた非課税額テーブルを使う（12km→7,100円まで非課税）', async () => {
    settingsRepo.getMileageTiers.mockResolvedValue([
      { minKm: 0, maxKm: 2, taxFreeAmount: 0 },
      { minKm: 2, maxKm: 10, taxFreeAmount: 4200 },
      { minKm: 10, maxKm: 15, taxFreeAmount: 7100 },
      { minKm: 15, maxKm: 25, taxFreeAmount: 12900 }
    ]);
    const r = await computeTransportAllowanceTaxable(10000, 'vehicle', 12, '2026-09', null);
    expect(r.limit).toBe(7100);
    expect(r.taxableAmount).toBe(2900);
    expect(r.nonTaxableAmount).toBe(7100);
  });

  it('金額が0以下なら常に非課税0円扱い', async () => {
    const r = await computeTransportAllowanceTaxable(0, 'transit', null, '2026-09', null);
    expect(r).toEqual({ taxableAmount: 0, nonTaxableAmount: 0, limit: 0 });
    expect(salaryRepo.getConfigByYear).not.toHaveBeenCalled();
  });
});
