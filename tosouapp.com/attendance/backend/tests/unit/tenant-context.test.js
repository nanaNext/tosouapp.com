/**
 * tenantContext / resolveTenant: repository tự lọc theo công ty của request khi
 * caller quên truyền tenantId (TENANT_STRICT=true), và token không có tid
 * (vd. đăng nhập WebAuthn) dùng công ty gốc thay vì tenantId = null.
 */
'use strict';

jest.mock('../../src/core/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../../src/modules/tenants/tenant.repository', () => ({
  getTenantById: jest.fn(async (id) => ({ id, name: `Tenant ${id}`, status: 'active' })),
}));

const log = require('../../src/core/logger');
const { runWithTenant, outsideTenantContext, scopedTid, contextTenantId } = require('../../src/core/database/tenantContext');
const { resolveTenant } = require('../../src/core/middleware/tenantMiddleware');

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  jest.clearAllMocks();
});

describe('scopedTid', () => {
  test('explicit tenantId always wins', () => {
    process.env.TENANT_STRICT = 'true';
    expect(runWithTenant(2, () => scopedTid(5))).toBe(5);
    expect(runWithTenant(2, () => scopedTid('0'))).toBe(0);
  });

  test('no request context → null (crons/scripts unchanged)', () => {
    process.env.TENANT_STRICT = 'true';
    expect(scopedTid(null)).toBeNull();
  });

  test('strict: missing tenantId falls back to the request tenant', () => {
    process.env.TENANT_STRICT = 'true';
    expect(runWithTenant(2, () => scopedTid(undefined))).toBe(2);
  });

  test('non-strict: keeps old behaviour (null) but logs where it happened', () => {
    delete process.env.TENANT_STRICT;
    expect(runWithTenant(2, () => scopedTid(null))).toBeNull();
    expect(log.warn).toHaveBeenCalledWith('tenant_scope_missing', expect.objectContaining({ contextTenantId: 2 }));
  });

  test('context survives awaits, outsideTenantContext clears it', async () => {
    process.env.TENANT_STRICT = 'true';
    await runWithTenant(3, async () => {
      await Promise.resolve();
      expect(scopedTid(null)).toBe(3);
      expect(outsideTenantContext(() => scopedTid(null))).toBeNull();
    });
  });
});

describe('resolveTenant', () => {
  const run = (user, headers = {}) => new Promise((resolve) => {
    const req = { user, headers };
    const res = { locals: {}, status: jest.fn(function (c) { this.code = c; return this; }), json: jest.fn(function () { resolve({ req, res: this, ctx: undefined }); return this; }) };
    resolveTenant(req, res, () => resolve({ req, res, ctx: contextTenantId() }));
  });

  beforeEach(() => { process.env.ENABLE_MULTI_TENANT = 'true'; delete process.env.TENANT_STRICT; });

  test('token without tid (WebAuthn) → uses the user\'s home tenant', async () => {
    const { req, ctx } = await run({ id: 1, role: 'employee', tid: null, homeTenantId: 11 });
    expect(req.tenantId).toBe(11);
    expect(ctx).toBe(11);
  });

  test('user working in their home tenant gets the tenant context', async () => {
    const { req, ctx } = await run({ id: 1, role: 'admin', tid: 12, homeTenantId: 12 });
    expect(req.tenantId).toBe(12);
    expect(ctx).toBe(12);
  });

  test('admin working in a tenant other than their home tenant → no context', async () => {
    const { req, ctx } = await run({ id: 1, role: 'admin', tid: 13, homeTenantId: 12 });
    expect(req.tenantId).toBe(13);
    expect(ctx).toBeNull();
  });

  test('owner / sysadmin never get a context', async () => {
    expect((await run({ id: 1, role: 'owner', tid: 12, homeTenantId: 12 })).ctx).toBeNull();
    const sys = await run({ id: 1, role: 'sysadmin', tid: null, homeTenantId: null });
    expect(sys.req.tenantId).toBeNull();
  });

  test('strict: normal user with no tenant at all → 403', async () => {
    process.env.TENANT_STRICT = 'true';
    const { res } = await run({ id: 1, role: 'employee', tid: null, homeTenantId: null });
    expect(res.code).toBe(403);
  });

  test('non-strict: normal user with no tenant still passes (old behaviour)', async () => {
    delete process.env.TENANT_STRICT;
    const { req } = await run({ id: 1, role: 'employee', tid: null, homeTenantId: null });
    expect(req.tenantId).toBeNull();
  });
});
