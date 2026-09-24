/**
 * holidays.controller.js: 全社休日追加(POST /api/holidays/company)が
 * 実際にログイン中のテナントIDで書き込むことを確認する回帰テスト
 * （見つかった漏洩バグ: 以前は常に全テナント共通として書き込まれていた）。
 */
'use strict';

jest.mock('../../src/modules/calendar/calendar.repository', () => ({
  ensureTable: jest.fn().mockResolvedValue(),
  upsertFixed: jest.fn().mockResolvedValue({ ok: true }),
  computeYear: jest.fn(),
  computeJapanHolidays: jest.fn(),
  listFixed: jest.fn()
}));

jest.mock('../../src/modules/departments/department.repository', () => ({
  getAllDepartments: jest.fn().mockResolvedValue([]),
  getDepartmentById: jest.fn()
}));

const calendarRepo = require('../../src/modules/calendar/calendar.repository');
const controller = require('../../src/modules/holidays/holidays.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createCompanyHoliday', () => {
  it('req.tenantId をそのままupsertFixedへ渡す（他社への漏洩防止）', async () => {
    const req = { body: { date: '2026-08-14', name: 'お盆休み' }, tenantId: 7 };
    const res = mockRes();
    await controller.createCompanyHoliday(req, res);
    expect(calendarRepo.upsertFixed).toHaveBeenCalledWith(
      [expect.objectContaining({ date: '2026-08-14', name: 'お盆休み' })],
      7
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tenantIdが無い場合は0（全社共通）にフォールバックする', async () => {
    const req = { body: { date: '2026-08-14' }, tenantId: null };
    const res = mockRes();
    await controller.createCompanyHoliday(req, res);
    expect(calendarRepo.upsertFixed).toHaveBeenCalledWith(expect.any(Array), 0);
  });
});

describe('jpHolidays', () => {
  it('computeYear に req.tenantId を渡す', async () => {
    calendarRepo.computeYear.mockResolvedValue({ detail: [] });
    const req = { query: {}, tenantId: 9 };
    const res = mockRes();
    await controller.jpHolidays(req, res);
    expect(calendarRepo.computeYear).toHaveBeenCalledWith(expect.any(Number), 9);
  });
});
