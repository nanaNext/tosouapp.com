/**
 * @file tab-context.js
 * @description Quản lý context riêng cho mỗi tab (sessionStorage).
 *
 * Mỗi tab browser có sessionStorage riêng biệt → 2 tab có thể dùng 2 tenant khác nhau.
 * Cookie auth (session_token) vẫn chia sẻ giữa tabs → user vẫn authenticated.
 *
 * Cách dùng:
 *   import { getTabContext, setTabContext, clearTabContext, getTabTenantId } from './tab-context.js';
 *
 *   // Sau khi select-tenant:
 *   setTabContext({ tenantId: 5, tenantName: '山口工業', role: 'admin' });
 *
 *   // Khi gửi API request:
 *   headers['X-Tenant-Id'] = getTabTenantId();
 *
 *   // Khi logout:
 *   clearTabContext();
 */

const STORAGE_KEY = '_tabCtx';

/**
 * Lấy toàn bộ tab context hiện tại.
 * @returns {{ userId?: number, tenantId?: number, tenantName?: string, role?: string } | null}
 */
export function getTabContext() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Set/update tab context (merge với context hiện tại).
 * @param {Object} ctx - { userId?, tenantId?, tenantName?, role? }
 */
export function setTabContext(ctx) {
  try {
    const current = getTabContext() || {};
    const merged = { ...current, ...ctx };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* sessionStorage không khả dụng — bỏ qua */ }
}

/**
 * Xóa toàn bộ tab context (khi logout).
 */
export function clearTabContext() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* bỏ qua */ }
}

/**
 * Lấy tenantId của tab hiện tại (dùng để gửi header X-Tenant-Id).
 * @returns {string} tenantId hoặc '' nếu chưa chọn tenant
 */
export function getTabTenantId() {
  const ctx = getTabContext();
  return ctx?.tenantId ? String(ctx.tenantId) : '';
}

/**
 * Lấy userId của tab hiện tại.
 * @returns {number|null}
 */
export function getTabUserId() {
  const ctx = getTabContext();
  return ctx?.userId || null;
}
