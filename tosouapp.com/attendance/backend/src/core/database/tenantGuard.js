'use strict';
/**
 * @module tenantGuard
 *
 * Production safeguard: when ENABLE_MULTI_TENANT=true, ensures that
 * repository/service functions always receive a valid tenantId.
 *
 * Usage in repositories or services:
 *   const { requireTenantId } = require('../../core/database/tenantGuard');
 *
 *   async function listItems(tenantId = null) {
 *     requireTenantId(tenantId, 'listItems');
 *     // ... rest of the function
 *   }
 *
 * Behavior:
 *   - When ENABLE_MULTI_TENANT=true AND tenantId is null/undefined → throws Error
 *   - When ENABLE_MULTI_TENANT=false → no-op (backward compatible)
 *   - When tenantId is provided → no-op (valid call)
 *
 * This provides a "fail-closed" safety net: if any code path accidentally
 * omits tenantId in production multi-tenant mode, it will throw rather than
 * silently returning cross-tenant data.
 */

const _isMultiTenant = () =>
  String(process.env.ENABLE_MULTI_TENANT || '').toLowerCase() === 'true';

/**
 * Throws if tenantId is null/undefined while multi-tenant mode is active.
 *
 * @param {number|string|null|undefined} tenantId
 * @param {string} [context] — function/module name for error message
 * @throws {Error} with status 403 when tenantId is missing in multi-tenant mode
 */
function requireTenantId(tenantId, context = '') {
  if (!_isMultiTenant()) return; // Single-tenant mode: no enforcement
  if (tenantId != null && tenantId !== '' && tenantId !== 0) return; // Valid tenantId provided

  const msg = context
    ? `[tenantGuard] tenantId is required in multi-tenant mode (context: ${context})`
    : `[tenantGuard] tenantId is required in multi-tenant mode`;

  const err = new Error(msg);
  err.status = 403;
  err.code = 'MISSING_TENANT_ID';
  throw err;
}

/**
 * Soft version: logs a warning instead of throwing.
 * Use during migration period when not all callers have been updated yet.
 *
 * @param {number|string|null|undefined} tenantId
 * @param {string} [context]
 * @returns {boolean} true if tenantId is missing (caller should handle gracefully)
 */
function warnMissingTenantId(tenantId, context = '') {
  if (!_isMultiTenant()) return false;
  if (tenantId != null && tenantId !== '' && tenantId !== 0) return false;

  const msg = context
    ? `[tenantGuard] WARNING: tenantId not provided in multi-tenant mode (context: ${context})`
    : `[tenantGuard] WARNING: tenantId not provided in multi-tenant mode`;

  try {
    const log = require('../logger');
    log.warn('tenant_guard_missing_tid', { context, tenantId });
  } catch {
    console.warn(msg);
  }
  return true;
}

/**
 * Middleware version: use as Express middleware to reject requests without tenant context.
 * Place after authenticate + resolveTenant middleware.
 *
 * Usage in routes:
 *   const { requireTenantMiddleware } = require('../../core/database/tenantGuard');
 *   router.get('/sensitive-data', authenticate, resolveTenant, requireTenantMiddleware, handler);
 */
function requireTenantMiddleware(req, res, next) {
  if (!_isMultiTenant()) return next();

  // sysadmin is exempt (platform-level access)
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'sysadmin') return next();

  if (!req.tenantId) {
    return res.status(403).json({
      message: 'No tenant selected. Please select a company first.',
      code: 'NO_TENANT',
    });
  }
  next();
}

module.exports = {
  requireTenantId,
  warnMissingTenantId,
  requireTenantMiddleware,
};
