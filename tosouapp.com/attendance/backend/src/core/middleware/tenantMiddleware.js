'use strict';
/**
 * @module tenantMiddleware
 *
 * Extracts tenant context from the JWT (field `tid`) and attaches
 * req.tenant and req.tenantId to every authenticated request.
 *
 * IMPORTANT: This middleware is intentionally opt-in (ENABLE_MULTI_TENANT=true).
 * When disabled, req.tenantId defaults to 1 so all existing code continues
 * to work without any changes — zero risk to prod during rollout.
 *
 * Usage (in routes):
 *   const { resolveTenant } = require('../core/middleware/tenantMiddleware');
 *   router.get('/foo', authenticate, resolveTenant, myHandler);
 *
 * Or as global middleware for all /api routes (after authenticate):
 *   app.use('/api', authenticate, resolveTenant, routes);
 */

const tenantRepo = require('../../modules/tenants/tenant.repository');
const log = require('../logger');
const { runWithTenant, isStrict } = require('../database/tenantContext');

// Vai trò làm việc trong đúng một công ty. sysadmin/owner là vai trò liên công ty.
const isCrossTenantRole = (role) => role === 'sysadmin' || role === 'owner';

// In-memory cache to avoid DB hit on every request (TTL: 5 min)
const _tenantCache = new Map();
const TENANT_CACHE_TTL = 5 * 60 * 1000;

async function getTenantCached(tenantId) {
  const now = Date.now();
  const cached = _tenantCache.get(tenantId);
  if (cached && now - cached.ts < TENANT_CACHE_TTL) return cached.tenant;
  const tenant = await tenantRepo.getTenantById(tenantId);
  if (tenant) _tenantCache.set(tenantId, { tenant, ts: now });
  return tenant || null;
}

/**
 * resolveTenant middleware.
 * Reads `tid` from the decoded JWT (req.user.tid) and attaches:
 *   req.tenantId  — number
 *   req.tenant    — full tenant object from DB
 *
 * When ENABLE_MULTI_TENANT is false, sets req.tenantId = 1 (backward compat).
 */
async function resolveTenant(req, res, next) {
  const multiTenantEnabled = String(process.env.ENABLE_MULTI_TENANT || '').toLowerCase() === 'true';

  if (!multiTenantEnabled) {
    // Legacy mode: everything is tenant 1 (飯塚塗研)
    req.tenantId = 1;
    req.tenant = null; // Lazy loaded only if needed
    return next();
  }

  // Extract tenant_id from JWT payload (field: tid or tenant_id)
  const tidFromJWT = (req.user?.tid || req.user?.tenant_id) ? parseInt(String(req.user.tid || req.user.tenant_id), 10) : null;

  // Tab-scoped context: ưu tiên X-Tenant-Id header từ frontend (mỗi tab gửi riêng)
  // Chỉ sysadmin mới được dùng header để override tenant context.
  // Admin/owner chỉ được dùng tenant từ JWT (tid) để tránh cross-tenant hopping.
  const headerTid = req.headers['x-tenant-id'] ? parseInt(String(req.headers['x-tenant-id']), 10) : null;
  const userRole = String(req.user?.role || '').toLowerCase();
  // Security: chỉ sysadmin được phép override tenant qua header.
  // Admin/owner phải dùng platform impersonate (có audit log) để làm việc trên tenant khác.
  const canOverrideTenant = userRole === 'sysadmin';

  // Quyết định tenantId cuối cùng:
  // 1. Nếu header X-Tenant-Id hợp lệ VÀ (khớp JWT hoặc user là sysadmin) → dùng header
  // 2. Nếu không → dùng từ JWT như cũ
  let effectiveTid = tidFromJWT;
  if (headerTid && headerTid > 0) {
    if (headerTid === tidFromJWT || canOverrideTenant) {
      effectiveTid = headerTid;
    }
    // Nếu user không phải sysadmin và header khác JWT → bỏ qua header, dùng JWT
  }

  // Token không có tid (vd. đăng nhập WebAuthn, token cũ): với user thường, dùng
  // công ty gốc của chính họ thay vì để tenantId = null — null khiến các truy vấn
  // không lọc theo công ty (thấy dữ liệu của mọi công ty).
  if (!effectiveTid && !isCrossTenantRole(userRole) && req.user?.homeTenantId) {
    effectiveTid = req.user.homeTenantId;
  }

  if (!effectiveTid) {
    if (isStrict() && !isCrossTenantRole(userRole)) {
      return res.status(403).json({
        message: 'No tenant selected. Please select a company first.',
        code: 'NO_TENANT',
      });
    }
    // sysadmin/owner chưa chọn công ty (hoặc chưa bật TENANT_STRICT):
    // cho qua với tenantId = null như trước.
    req.tenantId = null;
    req.tenant = null;
    return next();
  }

  try {
    const tenant = await getTenantCached(effectiveTid);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ message: 'Tenant not found or suspended' });
    }
    req.tenantId = tenant.id;
    req.tenant = tenant;
    // Also expose tenant info as res.locals for EJS templates
    res.locals.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logo_url || '/static/images/logo1.png',
      logoName: tenant.logo_name || 'IIZUKA',
      primaryColor: tenant.primary_color || '#0b5ed7',
    };
  } catch (err) {
    log.warn('tenant_resolve_error', { tenantId: effectiveTid, error_message: err.message });
    return res.status(500).json({ message: 'Failed to resolve tenant' });
  }

  // Ghi công ty vào tenant context để repository tự lọc khi caller quên truyền
  // tenantId (xem core/database/tenantContext.js). Chỉ áp cho user đang làm việc
  // ở chính công ty gốc của mình — owner/sysadmin/impersonate hoặc admin đang
  // chọn công ty khác công ty gốc thì không, vì các tra cứu "chính mình" của họ
  // sẽ không nằm trong công ty đang chọn.
  const homeTid = req.user?.homeTenantId;
  if (!isCrossTenantRole(userRole) && !req.user?._impersonate && homeTid != null && homeTid === req.tenantId) {
    return runWithTenant(req.tenantId, next);
  }
  next();
}

/**
 * requireTenant middleware.
 * Use on routes that MUST have a tenant (call after resolveTenant).
 * Rejects with 403 if no tenant is set.
 */
function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({
      message: 'No tenant selected. Please select a company first.',
      code: 'NO_TENANT',
    });
  }
  next();
}

/**
 * injectTenantLocals middleware.
 * For EJS page rendering — injects tenant info into res.locals
 * so HTML partials can use tenant.logoUrl, tenant.name etc.
 * Falls back to 飯塚塗研 defaults when not in multi-tenant mode.
 */
async function injectTenantLocals(req, res, next) {
  const multiTenantEnabled = String(process.env.ENABLE_MULTI_TENANT || '').toLowerCase() === 'true';

  // Default (fallback) — existing 飯塚塗研 behavior
  res.locals.tenant = res.locals.tenant || {
    id: 1,
    name: process.env.COMPANY_NAME || '飯塚塗研株式会社',
    slug: 'iizuka',
    logoUrl: '/static/images/logo1.png',
    logoName: 'IIZUKA',
    primaryColor: '#0b2c66',
  };

  if (!multiTenantEnabled) return next();

  // Try to get tenant from JWT cookie (for page renders)
  try {
    const jwt = require('jsonwebtoken');
    const token = req.cookies?.session_token || '';
    if (!token) return next();
    const secrets = [
      process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET,
      process.env.JWT_SECRET_PREVIOUS || '',
    ].filter(Boolean);
    let decoded = null;
    for (const s of secrets) {
      try { decoded = jwt.verify(token, s); break; } catch (e) { /* silently ignored */ }
    }
    if (!decoded) return next();
    const tid = (decoded?.tid || decoded?.tenant_id) ? parseInt(String(decoded.tid || decoded.tenant_id), 10) : null;
    if (!tid) return next();
    const tenant = await getTenantCached(tid);
    if (tenant && tenant.status === 'active') {
      res.locals.tenant = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logo_url || '/static/images/logo1.png',
        logoName: tenant.logo_name || 'IIZUKA',
        primaryColor: tenant.primary_color || '#0b5ed7',
        address: tenant.address || '',
        phone: tenant.phone || '',
        fax: tenant.fax || '',
        licenseNumber: tenant.license_number || '',
        representative: tenant.representative || '',
        contactSystemDept: tenant.contact_system_dept || '',
        contactSystemEmail: tenant.contact_system_email || '',
        contactSystemTel: tenant.contact_system_tel || '',
        contactSystemHours: tenant.contact_system_hours || '',
        contactGeneralDept: tenant.contact_general_dept || '',
        contactGeneralEmail: tenant.contact_general_email || '',
        contactGeneralTel: tenant.contact_general_tel || '',
        contactGeneralHours: tenant.contact_general_hours || '',
      };
    }
  } catch (e) { /* silently ignored — fall through to default */ }

  next();
}

/**
 * Xóa tenant cache tức thì (dùng khi suspend / update tenant).
 * Gọi từ platform routes sau khi thay đổi trạng thái tenant.
 * @param {number} tenantId
 */
function invalidateTenantCache(tenantId) {
  if (tenantId) _tenantCache.delete(tenantId);
}

module.exports = { resolveTenant, requireTenant, injectTenantLocals, invalidateTenantCache };
