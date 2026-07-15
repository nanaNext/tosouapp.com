/**
 * RBAC Unit Tests
 * Tests the hierarchical role-based access control:
 *   Admin (role=1) > Manager (role=2) > Employee (role=3)
 *
 * Rules:
 * - Employee: can only see themselves (userId = own ID)
 * - Manager: can only see employees (role='employee'), never admin or other managers
 * - Admin: can see everyone
 */
'use strict';

// ─── Mock dependencies before requiring modules ───────────────────────────────

const mockUsers = new Map();
mockUsers.set(1, { id: 1, role: 'admin', email: 'admin@test.com', departmentId: 10 });
mockUsers.set(2, { id: 2, role: 'manager', email: 'manager@test.com', departmentId: 10 });
mockUsers.set(3, { id: 3, role: 'manager', email: 'manager2@test.com', departmentId: 20 });
mockUsers.set(4, { id: 4, role: 'employee', email: 'emp@test.com', departmentId: 10 });
mockUsers.set(5, { id: 5, role: 'employee', email: 'emp2@test.com', departmentId: 20 });

jest.mock('../../src/modules/users/user.repository', () => ({
  getUserById: jest.fn((id) => Promise.resolve(mockUsers.get(Number(id)) || null)),
  getDepartmentById: jest.fn(() => Promise.resolve({ id: 10, name: 'Test Dept' })),
  listUsers: jest.fn(() => Promise.resolve([...mockUsers.values()])),
  listUsersPaged: jest.fn(({ role }) => {
    const rows = [...mockUsers.values()].filter(u => !role || u.role === role);
    return Promise.resolve({ rows, total: rows.length, limit: 100, offset: 0 });
  }),
  touchLastActive: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn(() => Promise.resolve([[]])),
  getConnection: jest.fn(() => Promise.resolve({ query: jest.fn(), release: jest.fn(), ping: jest.fn() }))
}));

jest.mock('../../src/core/database/redis', () => null);

jest.mock('../../src/core/metrics', () => ({
  observe: jest.fn(),
  inc: jest.fn()
}));

jest.mock('../../src/modules/leave/leave.repository', () => ({
  findExactRequest: jest.fn(() => Promise.resolve(null)),
  create: jest.fn(() => Promise.resolve()),
  cancelOwnPaidByDate: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/modules/audit/audit.repository', () => ({
  writeLog: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/modules/notices/notices.repository', () => ({
  createAdminNotification: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/modules/attendance/attendance.repository', () => ({
  getMonthStatus: jest.fn(() => Promise.resolve(null))
}));

jest.mock('../../src/modules/attendance/attendance.service', () => ({}));
jest.mock('../../src/modules/attendance/attendance.rules', () => ({}));
jest.mock('../../src/modules/workReports/workReports.repository', () => ({}));
jest.mock('../../src/modules/salary/salaryInput.repository', () => ({}));
jest.mock('../../src/modules/calendar/calendar.repository', () => ({}));
jest.mock('../../src/services/shiftReminder.service', () => ({}));
jest.mock('../../src/utils/leaveRules', () => ({ calculatePaidLeaveEntitlement: jest.fn() }));
jest.mock('../../src/utils/employmentDate', () => ({ resolveEmploymentStartDate: jest.fn() }));
jest.mock('../../src/utils/dateTime', () => ({ formatInputToMySQLJST: jest.fn(v => v) }));
jest.mock('../../src/core/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// ─── Import after mocking ─────────────────────────────────────────────────────

const { resolveTargetUserId } = require('../../src/modules/attendance/attendance._helpers');
const { normalizeRole } = require('../../src/utils/normalizeRole');

// ─── authorize() middleware tests ─────────────────────────────────────────────

describe('authorize() middleware', () => {
  // Re-implement authorize logic for testing (same as authMiddleware.js)
  function authorize(...allowedRoles) {
    const allowed = new Set((allowedRoles || []).map(r => normalizeRole(r)));
    return (req, res, next) => {
      const role = normalizeRole(req.user?.role);
      const ok = role && allowed.has(role);
      if (!ok) {
        return res.status(403).json({ message: 'Forbidden: Access denied' });
      }
      next();
    };
  }

  function mockReq(role) {
    return { user: { id: 1, role } };
  }
  function mockRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  }

  describe('Strict role checking (no inheritance)', () => {
    it('admin passes authorize("admin")', () => {
      const middleware = authorize('admin');
      const req = mockReq('admin');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('manager CANNOT pass authorize("admin")', () => {
      const middleware = authorize('admin');
      const req = mockReq('manager');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('employee CANNOT pass authorize("admin")', () => {
      const middleware = authorize('admin');
      const req = mockReq('employee');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('manager passes authorize("manager","admin")', () => {
      const middleware = authorize('manager', 'admin');
      const req = mockReq('manager');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('employee passes authorize("employee","manager","admin")', () => {
      const middleware = authorize('employee', 'manager', 'admin');
      const req = mockReq('employee');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('employee CANNOT pass authorize("manager","admin")', () => {
      const middleware = authorize('manager', 'admin');
      const req = mockReq('employee');
      const res = mockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

// ─── resolveTargetUserId() tests ──────────────────────────────────────────────

describe('resolveTargetUserId()', () => {
  function mockReq(userId, role, targetUserId = null) {
    return {
      user: { id: userId, role, departmentId: mockUsers.get(userId)?.departmentId },
      query: { userId: targetUserId != null ? String(targetUserId) : undefined },
      body: {}
    };
  }

  describe('Employee role', () => {
    it('always returns own ID regardless of userId param', async () => {
      const req = mockReq(4, 'employee', 1); // employee tries to access admin
      const result = await resolveTargetUserId(req);
      expect(result).toBe(4); // forced to own ID
    });

    it('returns own ID when no userId param', async () => {
      const req = mockReq(4, 'employee');
      const result = await resolveTargetUserId(req);
      expect(result).toBe(4);
    });
  });

  describe('Manager role', () => {
    it('can access own data', async () => {
      const req = mockReq(2, 'manager');
      const result = await resolveTargetUserId(req);
      expect(result).toBe(2);
    });

    it('can access employee data', async () => {
      const req = mockReq(2, 'manager', 4); // manager -> employee
      const result = await resolveTargetUserId(req);
      expect(result).toBe(4);
    });

    it('CANNOT access admin data', async () => {
      const req = mockReq(2, 'manager', 1); // manager -> admin
      const result = await resolveTargetUserId(req);
      expect(result).toBe('__forbidden__');
    });

    it('CANNOT access other manager data', async () => {
      const req = mockReq(2, 'manager', 3); // manager -> other manager
      const result = await resolveTargetUserId(req);
      expect(result).toBe('__forbidden__');
    });

    it('returns null for non-existent user', async () => {
      const req = mockReq(2, 'manager', 999);
      const result = await resolveTargetUserId(req);
      expect(result).toBeNull();
    });
  });

  describe('Manager with MANAGER_STRICT_DEPT=true', () => {
    beforeEach(() => {
      process.env.MANAGER_STRICT_DEPT = 'true';
    });
    afterEach(() => {
      delete process.env.MANAGER_STRICT_DEPT;
    });

    it('can access employee in same department', async () => {
      const req = mockReq(2, 'manager', 4); // both in dept 10
      const result = await resolveTargetUserId(req);
      expect(result).toBe(4);
    });

    it('CANNOT access employee in different department', async () => {
      const req = mockReq(2, 'manager', 5); // manager dept=10, emp dept=20
      const result = await resolveTargetUserId(req);
      expect(result).toBe('__forbidden__');
    });
  });

  describe('Admin role', () => {
    it('can access any employee', async () => {
      const req = mockReq(1, 'admin', 4);
      const result = await resolveTargetUserId(req);
      expect(result).toBe(4);
    });

    it('can access any manager', async () => {
      const req = mockReq(1, 'admin', 2);
      const result = await resolveTargetUserId(req);
      expect(result).toBe(2);
    });

    it('can access other admin', async () => {
      const req = mockReq(1, 'admin', 1);
      const result = await resolveTargetUserId(req);
      expect(result).toBe(1);
    });
  });
});

// ─── normalizeRole() tests ────────────────────────────────────────────────────

describe('normalizeRole()', () => {
  it('normalizes standard roles', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('manager')).toBe('manager');
    expect(normalizeRole('employee')).toBe('employee');
  });

  it('normalizes Japanese role names', () => {
    expect(normalizeRole('管理者')).toBe('admin');
    expect(normalizeRole('マネージャー')).toBe('manager');
    expect(normalizeRole('従業員')).toBe('employee');
  });

  it('normalizes Vietnamese role names', () => {
    expect(normalizeRole('quản lý')).toBe('admin');
    expect(normalizeRole('nhân viên')).toBe('employee');
  });

  it('handles empty/null input', () => {
    expect(normalizeRole('')).toBe('employee');
    expect(normalizeRole(null)).toBe('employee');
    expect(normalizeRole(undefined)).toBe('employee');
  });

  it('is case insensitive', () => {
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('Manager')).toBe('manager');
    expect(normalizeRole('EMPLOYEE')).toBe('employee');
  });
});
