/**
 * work_reports の複数エントリー/日 対応（作成・承認/差戻し・admin一覧集計）のテスト。
 * DBは core/database/mysql をモックし、リポジトリが組み立てるSQL/パラメータと
 * 返り値の整形だけを検証する（実DBは使わない）。
 */
'use strict';

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn()
}));

const db = require('../../src/core/database/mysql');
const repo = require('../../src/modules/workReports/workReports.repository');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('create', () => {
  it('status未指定なら pending で作成される（承認待ちがデフォルト）', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 42 }]);
    const id = await repo.create({
      userId: 1, date: '2026-09-01', startTime: '08:00', endTime: '12:00',
      workType: 'satellite', site: 'Bマンション', work: '下地処理'
    });
    expect(id).toBe(42);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO work_reports/);
    expect(params).toEqual([1, '2026-09-01', '08:00', '12:00', 'satellite', 'Bマンション', '下地処理', 'pending', null]);
  });

  it('同じ user+date で2回 create しても両方成功する（UNIQUE制約を前提にしない）', async () => {
    db.query.mockResolvedValueOnce([{ insertId: 1 }]);
    db.query.mockResolvedValueOnce([{ insertId: 2 }]);
    const id1 = await repo.create({ userId: 1, date: '2026-09-01', site: 'A', work: '作業A' });
    const id2 = await repo.create({ userId: 1, date: '2026-09-01', site: 'B', work: '作業B' });
    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});

describe('setStatus', () => {
  it('approved にすると approved_by/approved_at が入り rejected_reason は null になる', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await repo.setStatus(10, 'approved', { approvedBy: 99 });
    expect(ok).toBe(true);
    const [, params] = db.query.mock.calls[0];
    expect(params[0]).toBe('approved');
    expect(params[1]).toBe(99);
    expect(params[2]).toBeInstanceOf(Date);
    expect(params[3]).toBeNull();
  });

  it('rejected にすると rejected_reason が保存され approved_at は null になる', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await repo.setStatus(10, 'rejected', { approvedBy: 99, rejectedReason: '写真が不足しています' });
    expect(ok).toBe(true);
    const [, params] = db.query.mock.calls[0];
    expect(params[0]).toBe('rejected');
    expect(params[2]).toBeNull();
    expect(params[3]).toBe('写真が不足しています');
  });
});

describe('listForAdmin', () => {
  it('summary集計はステータス絞り込みを含めず、一覧(items)だけステータスで絞り込む', async () => {
    // db.query は mysql2 の [rows, fields] 形式を返す想定。
    // `[[summaryRow]] = await db.query(...)` で受けるため rows 部分を配列でラップする。
    db.query
      .mockResolvedValueOnce([[{ count: 5, totalMinutes: 480, pending: 2, rejected: 1 }]])
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);

    const result = await repo.listForAdmin({
      tenantId: 7, month: '2026-09', dept: '工事部', status: 'approved', page: 1, pageSize: 20
    });

    expect(result.summary).toEqual({ count: 5, totalMinutes: 480, pending: 2, rejected: 1 });
    expect(result.total).toBe(2);
    expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);

    const [summarySql, summaryParams] = db.query.mock.calls[0];
    const [countSql, countParams] = db.query.mock.calls[1];
    const [itemsSql, itemsParams] = db.query.mock.calls[2];

    expect(summarySql).not.toMatch(/wr\.status = \?/);
    expect(countSql).toMatch(/wr\.status = \?/);
    expect(itemsSql).toMatch(/wr\.status = \?/);
    expect(countParams).toContain('approved');
    expect(itemsParams).toContain('approved');
    expect(summaryParams).not.toContain('approved');
  });
});
