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

  // Extract tenant_id from JWT payload (field: tid)
  const tidFromJWT = req.user?.tid ? parseInt(String(req.user.tid), 10) : null;

  // Tab-scoped context: ưu tiên X-Tenant-Id header từ frontend (mỗi tab gửi riêng)
  // Nếu header khớp với tenant trong JWT hoặc user có quyền sysadmin/owner → dùng header
  const headerTid = req.headers['x-tenant-id'] ? parseInt(String(req.headers['x-tenant-id']), 10) : null;
  const userRole = String(req.user?.role || '').toLowerCase();
  const canOverrideTenant = userRole === 'sysadmin' || userRole === 'owner' || userRole === 'admin';

  // Quyết định tenantId cuối cùng:
  // 1. Nếu header X-Tenant-Id hợp lệ VÀ (khớp JWT hoặc user có quyền override) → dùng header
  // 2. Nếu không → dùng từ JWT như cũ
  let effectiveTid = tidFromJWT;
  if (headerTid && headerTid > 0) {
    if (headerTid === tidFromJWT || canOverrideTenant) {
      effectiveTid = headerTid;
    }
    // Nếu user không có quyền override và header khác JWT → bỏ qua header, dùng JWT
  }

  if (!effectiveTid) {
    // User authenticated but has not selected a tenant yet
    // (e.g. they're on the select-company page flow)
    // Allow through with tenantId = null; individual routes that need a tenant
    // can enforce it themselves.
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
    next();
  } catch (err) {
    log.warn('tenant_resolve_error', { tenantId: effectiveTid, error_message: err.message });
    return res.status(500).json({ message: 'Failed to resolve tenant' });
  }
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
    const tid = decoded?.tid ? parseInt(String(decoded.tid), 10) : null;
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
      };
    }
  } catch (e) { /* silently ignored — fall through to default */ }

  next();
}

module.exports = { resolveTenant, requireTenant, injectTenantLocals };
