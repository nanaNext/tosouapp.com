/**
 * department.history.service のテスト。
 * 「ある日、ある人がどの部署に属していたか」を正しく解決できるかを確認する:
 * - 通常の異動 (regular) の期間解決
 * - 応援 (temporary_support) が regular の上に一時的に重なり、期間後は自動的に戻る
 * - 異動履歴が1件も無い場合は現在の部署にフォールバックする
 * - 給与用の月内按分 (mid-month transfer split)
 */
'use strict';

jest.mock('../../src/modules/departments/department.repository', () => ({
  listAssignmentsForUser: jest.fn(),
  listAssignmentsAll: jest.fn(),
  getDepartmentNameAsOf: jest.fn()
}));

jest.mock('../../src/modules/users/user.repository', () => ({
  getUserById: jest.fn(),
  listUsersPaged: jest.fn()
}));

const repo = require('../../src/modules/departments/department.repository');
const userRepo = require('../../src/modules/users/user.repository');
const historyService = require('../../src/modules/departments/department.history.service');

afterEach(() => {
  jest.clearAllMocks();
});

describe('getDepartmentAsOf', () => {
  it('resolves to the regular assignment covering the given date', async () => {
    repo.listAssignmentsForUser.mockResolvedValue([
      { assignment_type: 'regular', department_id: 2, start_date: '2026-09-01', end_date: null },
      { assignment_type: 'regular', department_id: 1, start_date: '2026-01-01', end_date: '2026-08-31' }
    ]);
    // Ito: phòng 1 đến hết tháng 8, phòng 2 từ 1/9 — báo cáo tháng 8 phải vẫn ra phòng 1
    expect(await historyService.getDepartmentAsOf(10, '2026-08-15', {})).toBe(1);
    expect(await historyService.getDepartmentAsOf(10, '2026-09-15', {})).toBe(2);
  });

  it('prefers a temporary_support overlay during its window, then reverts to regular after it ends', async () => {
    repo.listAssignmentsForUser.mockResolvedValue([
      { assignment_type: 'regular', department_id: 1, start_date: '2026-01-01', end_date: null },
      { assignment_type: 'temporary_support', department_id: 9, start_date: '2026-06-10', end_date: '2026-06-20' }
    ]);
    expect(await historyService.getDepartmentAsOf(10, '2026-06-05', {})).toBe(1);
    expect(await historyService.getDepartmentAsOf(10, '2026-06-15', {})).toBe(9);
    expect(await historyService.getDepartmentAsOf(10, '2026-06-25', {})).toBe(1);
  });

  it('falls back to the current department when the user has no assignment history yet', async () => {
    repo.listAssignmentsForUser.mockResolvedValue([]);
    userRepo.getUserById.mockResolvedValue({ id: 10, departmentId: 5 });
    expect(await historyService.getDepartmentAsOf(10, '2026-01-01', {})).toBe(5);
  });
});

describe('getDepartmentSplitsForMonth', () => {
  it('splits the month proportionally by day count across a mid-month transfer', async () => {
    // 2026-09 có 30 ngày; chuyển phòng đúng ngày 16 -> 15 ngày phòng 1, 15 ngày phòng 2
    repo.listAssignmentsForUser.mockResolvedValue([
      { assignment_type: 'regular', department_id: 2, start_date: '2026-09-16', end_date: null },
      { assignment_type: 'regular', department_id: 1, start_date: '2026-01-01', end_date: '2026-09-15' }
    ]);
    const splits = await historyService.getDepartmentSplitsForMonth(10, 2026, 9, {});
    const byDept = Object.fromEntries(splits.map(s => [s.departmentId, s]));
    expect(byDept[1].days).toBe(15);
    expect(byDept[2].days).toBe(15);
    expect(byDept[1].ratio).toBeCloseTo(0.5);
    expect(byDept[2].ratio).toBeCloseTo(0.5);
  });

  it('attributes the whole month to a single department when there is no transfer', async () => {
    repo.listAssignmentsForUser.mockResolvedValue([
      { assignment_type: 'regular', department_id: 3, start_date: '2026-01-01', end_date: null }
    ]);
    const splits = await historyService.getDepartmentSplitsForMonth(10, 2026, 9, {});
    expect(splits).toEqual([{ departmentId: 3, days: 30, ratio: 1 }]);
  });
});
