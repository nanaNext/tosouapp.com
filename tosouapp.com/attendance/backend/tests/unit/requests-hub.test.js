/**
 * 申請・承認 統合ビュー: leave_requests + time_adjust_requests を
 * 1本のリストに正規化・ソートするロジックのテスト。
 * DBは core/database/mysql をモックし、実DBは使わない。
 */
'use strict';

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn()
}));

jest.mock('../../src/core/middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next()
}));

jest.mock('../../src/core/middleware/tenantMiddleware', () => ({
  resolveTenant: (req, res, next) => next()
}));

const db = require('../../src/core/database/mysql');
const { fetchMerged } = require('../../src/modules/requestsHub/requestsHub.admin.routes');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchMerged', () => {
  it('有給申請と打刻修正を1本のリストにまとめ、日付の新しい順に並べる', async () => {
    db.query
      .mockResolvedValueOnce([[
        {
          id: 1, userId: 10, startDate: '2026-09-05', endDate: '2026-09-05', type: 'paid',
          reason: '私用', status: 'pending', processed_by: null, processed_at: null,
          employeeCode: 'EMP010', username: '山田太郎', departmentId: 1, departmentName: '工事部',
          processedByName: null
        }
      ]])
      .mockResolvedValueOnce([[
        {
          id: 2, userId: 11, requestedCheckIn: '2026-09-09 07:00:00', requestedCheckOut: '2026-09-09 17:00:00',
          reason: '出勤時刻の修正', status: 'rejected', created_at: '2026-09-09 18:00:00',
          processed_by: 5, processed_at: '2026-09-11 15:20:00',
          employeeCode: 'EMP011', username: '佐藤花子', departmentId: 1, departmentName: '工事部',
          processedByName: '鈴木一郎'
        }
      ]]);

    const rows = await fetchMerged({ tenantId: 1, month: '2026-09', dept: '', userId: null, status: '', q: '' });

    expect(rows).toHaveLength(2);
    // sortDate 降順 (09/09 が 09/05 より前に来る)
    expect(rows[0].type).toBe('adjust');
    expect(rows[0].typeLabel).toBe('打刻修正');
    expect(rows[0].content).toBe('出勤 07:00 / 退勤 17:00');
    expect(rows[0].processedByName).toBe('鈴木一郎');
    expect(rows[1].type).toBe('leave');
    expect(rows[1].typeLabel).toBe('有給申請');
    expect(rows[1].content).toBe('有給休暇（全日）');
    expect(rows[1].targetDate).toBe('2026-09-05');
  });

  it('有給申請が複数日にまたがる場合は範囲表示になり（全日）は付かない', async () => {
    db.query
      .mockResolvedValueOnce([[
        {
          id: 3, userId: 12, startDate: '2026-09-20', endDate: '2026-09-22', type: 'paid',
          reason: '旅行', status: 'approved', processed_by: 5, processed_at: '2026-09-15 10:00:00',
          employeeCode: 'EMP012', username: '田中健', departmentId: null, departmentName: null,
          processedByName: '鈴木一郎'
        }
      ]])
      .mockResolvedValueOnce([[]]);

    const rows = await fetchMerged({ tenantId: 1, month: '2026-09', dept: '', userId: null, status: '', q: '' });

    expect(rows).toHaveLength(1);
    expect(rows[0].targetDate).toBe('2026-09-20〜2026-09-22');
    expect(rows[0].content).toBe('有給休暇');
  });

  it('勤怠画面のkubun変更で自動生成された有給行(from_attendance/[AUTO_CANCEL]等)は除外するSQLになっている', async () => {
    db.query.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);
    await fetchMerged({ tenantId: 1, month: '2026-09', dept: '', userId: null, status: '', q: '' });
    const [leaveSql] = db.query.mock.calls[0];
    expect(leaveSql).toMatch(/from_attendance/);
    expect(leaveSql).toMatch(/AUTO_CANCEL/);
    expect(leaveSql).toMatch(/AUTO_RECONCILE/);
  });
});
