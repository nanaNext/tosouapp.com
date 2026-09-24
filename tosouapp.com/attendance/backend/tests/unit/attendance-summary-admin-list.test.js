/**
 * 月次集計(36協定) admin一覧用の listSummariesForMonth のテスト。
 * DBは core/database/mysql をモックし、SQL/パラメータの組み立てだけを検証する。
 */
'use strict';

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn()
}));

const db = require('../../src/core/database/mysql');
const summaryRepo = require('../../src/modules/attendance/attendance.summary.repository');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listSummariesForMonth', () => {
  it('tenantId/dept/userId が指定されたときそれぞれWHERE条件に反映される', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1, user_id: 10 }]]);

    const rows = await summaryRepo.listSummariesForMonth({
      tenantId: 7, year: 2026, month: 9, dept: '工事部', userId: 10
    });

    expect(rows).toEqual([{ id: 1, user_id: 10 }]);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/u\.tenant_id = \?/);
    expect(sql).toMatch(/d\.name = \?/);
    expect(sql).toMatch(/ms\.user_id = \?/);
    expect(params).toEqual([2026, 9, 7, '工事部', 10]);
  });

  it('dept/userIdを指定しなければWHEREに含まれない', async () => {
    db.query.mockResolvedValueOnce([[]]);
    await summaryRepo.listSummariesForMonth({ tenantId: null, year: 2026, month: 9 });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/d\.name = \?/);
    expect(sql).not.toMatch(/ms\.user_id = \?/);
    expect(params).toEqual([2026, 9]);
  });
});
