/**
 * Nhắc nộp ca (gửi tay): trước đây lấy nhân viên của MỌI công ty (dry_run trả về
 * tên + email của cả 4 công ty) và ký tên "飯塚" cố định.
 */
'use strict';

const mockQuery = jest.fn();
jest.mock('../../src/core/database/mysql', () => ({ query: (...a) => mockQuery(...a), getConnection: jest.fn() }));
jest.mock('../../src/core/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  middleware: () => (req, res, next) => next(),
}));
jest.mock('../../src/core/middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); },
  authenticateFromCookie: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
  invalidateUserCache: jest.fn(),
}));
jest.mock('../../src/core/middleware/tenantMiddleware', () => ({
  resolveTenant: (req, res, next) => { req.tenantId = 2; req.tenant = { id: 2, name: '山田塗装株式会社' }; next(); },
  requireTenant: (req, res, next) => next(),
  injectTenantLocals: (req, res, next) => next(),
  invalidateTenantCache: jest.fn(),
}));
const mockSend = jest.fn().mockResolvedValue();
jest.mock('../../src/core/notifications/email.service', () => ({
  canSendMail: () => true,
  sendViaResend: (...a) => mockSend(...a),
  senderWithName: (n) => `"${n}" <noreply@example.com>`,
}));

const express = require('express');
const request = require('supertest');

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  // routes/index.js registers routes on the app it is given
  const register = require('../../src/routes/index');
  (typeof register === 'function' ? register : register.default)(app);
});

beforeEach(() => {
  mockQuery.mockReset();
  mockSend.mockClear();
  mockQuery.mockResolvedValue([[{ id: 5, email: 'a@example.com', username: 'A', employment_type: 'full_time' }]]);
});

test('test/shift-reminder only lists employees of the caller\'s company', async () => {
  const r = await request(app).post('/api/admin/test/shift-reminder?dry_run=true&month=2026-10');
  expect(r.status).toBe(200);
  const [sql, params] = mockQuery.mock.calls[0];
  expect(sql).toContain('u.tenant_id = ?');
  expect(params).toEqual([2]);
});

test('shift-reminder/send filters userIds by tenant and signs with the tenant name', async () => {
  const r = await request(app).post('/api/admin/shift-reminder/send').send({ month: '2026-10', userIds: [5, 99] });
  expect(r.status).toBe(200);
  const [sql, params] = mockQuery.mock.calls[0];
  expect(sql).toContain('u.tenant_id = ?');
  expect(params).toEqual([5, 99, 2]);
  const mail = mockSend.mock.calls[0][0];
  expect(mail.subject).toContain('[山田塗装株式会社]');
  expect(mail.subject).not.toContain('飯塚');
  expect(mail.from).toBe('"山田塗装株式会社" <noreply@example.com>');
});
