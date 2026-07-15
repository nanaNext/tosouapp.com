jest.mock('../../src/modules/users/user.repository', () => ({
  listUsers: jest.fn(),
  listUsersPaged: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn()
}));

jest.mock('../../src/modules/attendance/attendance.service', () => ({
  timesheet: jest.fn()
}));

jest.mock('../../src/modules/salary/salary.service', () => ({
  computePayslips: jest.fn()
}));

jest.mock('../../src/modules/auth/refresh.repository', () => ({
  deleteUserTokens: jest.fn()
}));

jest.mock('../../src/core/database/mysql', () => ({
  query: jest.fn()
}));

const userRepo = require('../../src/modules/users/user.repository');
const userController = require('../../src/modules/users/user.controller');
const managerController = require('../../src/modules/manager/manager.controller');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('user list response shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SUPER_ADMIN_EMAIL;
  });

  it('returns paged shape for /api/admin/users without filters', async () => {
    const rows = [{ id: 1, username: 'Alice' }, { id: 2, username: 'Bob' }];
    userRepo.listUsers.mockResolvedValue(rows);
    const req = {
      query: {},
      user: { role: 'admin', email: 'admin@test.local' }
    };
    const res = createRes();

    await userController.list(req, res);

    expect(userRepo.listUsers).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      rows,
      total: 2,
      limit: 2,
      offset: 0
    });
  });

  it('keeps paged shape for /api/admin/users with filters', async () => {
    const payload = {
      rows: [{ id: 3, username: 'Carol' }],
      total: 1,
      limit: 50,
      offset: 10
    };
    userRepo.listUsersPaged.mockResolvedValue(payload);
    const req = {
      query: { q: 'carol', limit: '50', offset: '10' },
      user: { role: 'admin', email: 'admin@test.local' }
    };
    const res = createRes();

    await userController.list(req, res);

    expect(userRepo.listUsersPaged).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('returns paged shape for /api/manager/users without filters (forced role=employee)', async () => {
    const payload = {
      rows: [{ id: 11, username: 'Manager View', role: 'employee' }],
      total: 1,
      limit: 100,
      offset: 0
    };
    userRepo.listUsersPaged.mockResolvedValue(payload);
    const req = {
      query: {},
      user: { role: 'manager', email: 'manager@test.local' }
    };
    const res = createRes();

    await managerController.listMyDepartment(req, res);

    // RBAC: Manager always filters by role='employee', so listUsersPaged is used
    expect(userRepo.listUsersPaged).toHaveBeenCalledTimes(1);
    expect(userRepo.listUsersPaged).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'employee' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('keeps paged shape for /api/manager/users with filters', async () => {
    const payload = {
      rows: [{ id: 21, username: 'Filtered User' }],
      total: 1,
      limit: 100,
      offset: 0
    };
    userRepo.listUsersPaged.mockResolvedValue(payload);
    const req = {
      query: { role: 'employee', limit: '100' },
      user: { role: 'manager', email: 'manager@test.local' }
    };
    const res = createRes();

    await managerController.listMyDepartment(req, res);

    expect(userRepo.listUsersPaged).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });
});
