/**
 * company_holidays のテナント分離テスト。
 * tenant_id=0 (全社共通、祝日など) は誰でも見える一方、type='fixed' の会社独自の
 * 休日は自社(tenantId)のものだけが見えることを確認する。
 * DBは core/database/mysql をモックし、実DBは使わない。
 */
'use strict';

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn()
}));

const db = require('../../src/core/database/mysql');
const calendarRepo = require('../../src/modules/calendar/calendar.repository');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listFixed', () => {
  it('tenant_id IN (0, 自社ID) でしか絞り込まない -- 他社の休日は見えない', async () => {
    db.query.mockResolvedValueOnce([[
      { date: '2026-08-14', name: 'お盆休み', type: 'fixed', is_off: 1 }
    ]]);
    const rows = await calendarRepo.listFixed(2026, 5);
    expect(rows).toHaveLength(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/tenant_id IN \(0, \?\)/);
    expect(params).toEqual([2026, 5]);
  });

  it('tenantId省略時は0扱い（全社共通のみ）になる', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await calendarRepo.listFixed(2026);
    const [, params] = db.query.mock.calls[0];
    expect(params).toEqual([2026, 0]);
  });
});

describe('upsertFixed', () => {
  it('会社独自の休日を作成するとき、指定したtenantIdで書き込まれる（グローバル漏れ防止）', async () => {
    db.query.mockResolvedValueOnce([{}]);
    await calendarRepo.upsertFixed([{ date: '2026-08-14', name: 'お盆休み' }], 7);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO company_holidays \(tenant_id, date, name, type, is_off\)/);
    expect(params[0]).toBe(7);
  });

  it('tenantId省略時は0（全社共通）で書き込まれる — 国民の祝日materialize用のデフォルト', async () => {
    db.query.mockResolvedValueOnce([{}]);
    await calendarRepo.upsertFixed([{ date: '2026-01-01', name: '元日', type: 'jp_auto' }]);
    const [, params] = db.query.mock.calls[0];
    expect(params[0]).toBe(0);
  });
});

describe('isOff', () => {
  it('tenantIdを computeYear に伝播する', async () => {
    // ensureMaterializedJapan -> listByTypes（カウント用の直接query）
    db.query.mockResolvedValueOnce([[{ c: 20 }]]);
    // listFixed
    db.query.mockResolvedValueOnce([[]]);
    // listByTypes (jp_auto/substitute/bridge)
    db.query.mockResolvedValueOnce([[]]);

    await calendarRepo.isOff('2026-08-14', 7);

    const listFixedCall = db.query.mock.calls[1];
    expect(listFixedCall[1]).toEqual([2026, 7]);
  });
});
