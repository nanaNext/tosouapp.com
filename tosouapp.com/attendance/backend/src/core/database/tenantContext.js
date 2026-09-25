'use strict';
/**
 * @module tenantContext
 *
 * Lưu công ty (tenant) của request hiện tại trong AsyncLocalStorage, do
 * resolveTenant ghi vào. Repository dùng scopedTid() thay vì tự parse tenantId:
 *
 *   - tenantId truyền tường minh → luôn dùng giá trị đó.
 *   - Không truyền (null/undefined) mà request đang có công ty:
 *       TENANT_STRICT=true  → tự lọc theo công ty của request (fail-closed).
 *       mặc định            → giữ hành vi cũ (không lọc) nhưng ghi log
 *                             `tenant_scope_missing` kèm vị trí gọi, để tìm và
 *                             sửa các chỗ quên truyền tenantId trước khi bật strict.
 *   - Ngoài request (cron, script, trang platform của sysadmin) → không có context,
 *     hành vi giữ nguyên.
 */

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const isStrict = () => String(process.env.TENANT_STRICT || '').toLowerCase() === 'true';

function runWithTenant(tenantId, fn) {
  return als.run({ tenantId }, fn);
}

// Chạy fn không kèm tenant context (tra cứu cố ý không theo công ty của request).
function outsideTenantContext(fn) {
  return als.exit(fn);
}

function contextTenantId() {
  const store = als.getStore();
  return store && store.tenantId != null ? store.tenantId : null;
}

// Mỗi vị trí gọi chỉ log một lần / tiến trình để không ngập log.
const _warned = new Set();
function _warnMissing(ctxTid) {
  const stack = String(new Error().stack || '').split('\n');
  // [0] Error, [1] _warnMissing, [2] scopedTid, [3] _tid của repo, [4] hàm repo, [5] caller
  const site = (stack[5] || stack[4] || '').trim();
  if (_warned.has(site)) return;
  _warned.add(site);
  try {
    require('../logger').warn('tenant_scope_missing', { contextTenantId: ctxTid, site, repo: (stack[4] || '').trim() });
  } catch (e) { /* ignore */ }
}

/**
 * @param {number|string|null|undefined} tenantId  giá trị caller truyền vào
 * @returns {number|null}
 */
function scopedTid(tenantId) {
  if (tenantId != null && tenantId !== '') return parseInt(String(tenantId), 10);
  const ctx = contextTenantId();
  if (ctx == null) return null;
  if (isStrict()) return ctx;
  _warnMissing(ctx);
  return null;
}

module.exports = { runWithTenant, outsideTenantContext, contextTenantId, scopedTid, isStrict };
