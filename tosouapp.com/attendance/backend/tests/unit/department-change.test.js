/**
 * department.change.service のテスト。
 * 社員編集で部署を変えたときに、異動履歴が自動で正しく記録されるかを確認する:
 * - 初めての部署変更では「元の部署（入社日〜前日）」も記録され、過去の月は元の部署のまま
 * - 2回目以降は今の異動を前日で終了して新しい異動を追加する
 * - 同じ日に選び直したら記録を書き換える（記録が増えない）
 * - 締め済みの月・未来の日付はエラーで、社員も保存しない
 * - 履歴の記録に失敗したら社員の部署を元に戻す
 */
'use strict';

const mockStore = { rows: [], nextId: 1, closed: new Set() };

jest.mock('../../src/modules/departments/department.repository', () => ({
  listAssignmentsForUser: jest.fn(async (userId) => mockStore.rows
    .filter(r => String(r.user_id) === String(userId))
    .map(r => ({ ...r }))
    .sort((a, b) => (b.start_date.localeCompare(a.start_date)) || (b.id - a.id))),
  createAssignment: jest.fn(async ({ userId, departmentId, assignmentType, startDate, endDate, reason }) => {
    const overlap = mockStore.rows.some(r => String(r.user_id) === String(userId) && r.assignment_type === assignmentType
      && r.start_date <= (endDate || '9999-12-31') && (!r.end_date || r.end_date >= startDate));
    if (overlap) { const e = new Error('指定期間に既存の異動と重複があります'); e.status = 409; throw e; }
    const id = mockStore.nextId++;
    mockStore.rows.push({ id, user_id: userId, department_id: Number(departmentId), assignment_type: assignmentType, start_date: startDate, end_date: endDate || null, reason });
    return id;
  }),
  updateAssignment: jest.fn(async (id, { departmentId, endDate }) => {
    const r = mockStore.rows.find(x => x.id === id);
    if (departmentId) r.department_id = Number(departmentId);
    r.end_date = endDate ?? null;
  }),
  deleteAssignment: jest.fn(async (id) => { mockStore.rows = mockStore.rows.filter(r => r.id !== id); }),
  isDateInClosedMonth: jest.fn(async (d) => mockStore.closed.has(String(d).slice(0, 7)))
}));

jest.mock('../../src/modules/audit/audit.repository', () => ({ writeLog: jest.fn(async () => {}) }));
jest.mock('../../src/modules/users/user.repository', () => ({
  setDepartment: jest.fn(async () => {}),
  getUserById: jest.fn(async () => null)
}));

const repo = require('../../src/modules/departments/department.repository');
const userRepo = require('../../src/modules/users/user.repository');
const svc = require('../../src/modules/departments/department.change.service');
const history = require('../../src/modules/departments/department.history.service');

const TODAY = '2026-10-05';

beforeEach(() => {
  mockStore.rows = []; mockStore.nextId = 1; mockStore.closed = new Set();
  jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T03:00:00Z`)); // 12:00 JST
  jest.clearAllMocks();
});
afterEach(() => { jest.useRealTimers(); });

const user = (over = {}) => ({ id: 7, departmentId: 10, hire_date: '2024-04-01', ...over });

test('初めての部署変更: 元の部署の期間も記録され、過去の月は元の部署のまま', async () => {
  const save = jest.fn(async () => {});
  const r = await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-09-20', save });
  expect(r).toEqual({ changed: true, effectiveDate: '2026-09-20' });
  expect(save).toHaveBeenCalledTimes(1);
  expect(mockStore.rows).toEqual([
    expect.objectContaining({ department_id: 10, start_date: '2024-04-01', end_date: '2026-09-19' }),
    expect.objectContaining({ department_id: 20, start_date: '2026-09-20', end_date: null })
  ]);
  expect(await history.getDepartmentAsOf(7, '2026-08-31')).toBe(10);
  expect(await history.getDepartmentAsOf(7, '2026-09-19')).toBe(10);
  expect(await history.getDepartmentAsOf(7, '2026-09-20')).toBe(20);
});

test('2回目の部署変更: 今の異動を前日で終了し、新しい異動を追加する', async () => {
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-09-01', save: async () => {} });
  await svc.saveWithDepartmentChange({ before: user({ departmentId: 20 }), toDepartmentId: 30, effectiveDate: '2026-10-01', save: async () => {} });
  expect(mockStore.rows.map(r => [r.department_id, r.start_date, r.end_date])).toEqual([
    [10, '2024-04-01', '2026-08-31'],
    [20, '2026-09-01', '2026-09-30'],
    [30, '2026-10-01', null]
  ]);
  expect(await history.getDepartmentAsOf(7, '2026-09-15')).toBe(20);
  expect(await history.getDepartmentAsOf(7, TODAY)).toBe(30);
});

test('同じ日に選び直したら、その日の記録を書き換える（記録は増えない）', async () => {
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: TODAY, save: async () => {} });
  await svc.saveWithDepartmentChange({ before: user({ departmentId: 20 }), toDepartmentId: 30, effectiveDate: TODAY, save: async () => {} });
  expect(mockStore.rows.map(r => [r.department_id, r.start_date, r.end_date])).toEqual([
    [10, '2024-04-01', '2026-10-04'],
    [30, TODAY, null]
  ]);
});

test('異動日を省略したら今日（日本時間）', async () => {
  const r = await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, save: async () => {} });
  expect(r.effectiveDate).toBe(TODAY);
});

test('部署が変わらない・部署の指定がないときは何も記録しない', async () => {
  const save = jest.fn(async () => {});
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 10, save });
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: undefined, save });
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: null, save });
  expect(save).toHaveBeenCalledTimes(3);
  expect(mockStore.rows).toHaveLength(0);
});

test('締め済みの月の異動日はエラーで、社員も保存しない', async () => {
  mockStore.closed.add('2026-08');
  const save = jest.fn(async () => {});
  await expect(svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-08-15', save }))
    .rejects.toMatchObject({ status: 409 });
  expect(save).not.toHaveBeenCalled();
  expect(mockStore.rows).toHaveLength(0);
});

test('未来の異動日はエラーで、社員も保存しない', async () => {
  const save = jest.fn(async () => {});
  await expect(svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-10-06', save }))
    .rejects.toMatchObject({ status: 400 });
  expect(save).not.toHaveBeenCalled();
});

test('履歴の記録に失敗したら、作った記録を消して社員の部署を元に戻す', async () => {
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-09-01', save: async () => {} });
  const snapshot = JSON.parse(JSON.stringify(mockStore.rows));
  repo.createAssignment.mockImplementationOnce(async () => { throw new Error('DB down'); });
  await expect(svc.saveWithDepartmentChange({ before: user({ departmentId: 20 }), toDepartmentId: 30, effectiveDate: '2026-10-01', save: async () => {} }))
    .rejects.toThrow('部署は元のまま');
  expect(mockStore.rows).toEqual(snapshot);                      // 前の異動の終了日も元どおり
  expect(userRepo.setDepartment).toHaveBeenCalledWith(7, 20, null);
});

test('以前の応援の記録だけある社員でも、元の部署の期間が記録される', async () => {
  mockStore.rows.push({ id: 99, user_id: 7, department_id: 50, assignment_type: 'temporary_support', start_date: '2026-06-01', end_date: '2026-06-30' });
  await svc.saveWithDepartmentChange({ before: user(), toDepartmentId: 20, effectiveDate: '2026-09-01', save: async () => {} });
  expect(await history.getDepartmentAsOf(7, '2026-06-15')).toBe(50);   // 応援中は応援先
  expect(await history.getDepartmentAsOf(7, '2026-07-15')).toBe(10);   // 応援が終われば元の部署
  expect(await history.getDepartmentAsOf(7, '2026-09-15')).toBe(20);
});
