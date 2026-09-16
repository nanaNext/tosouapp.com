'use strict';
/**
 * Tenant Offboarding Service
 *
 * Provides a safe, auditable process for decommissioning a tenant:
 *  1. Preview:  returns counts of all data that would be removed
 *  2. Offboard: revokes all sessions, deletes S3 files, archives or
 *               hard-deletes tenant data, then marks the tenant as
 *               'cancelled'.
 *
 * Usage:
 *   const svc = require('./tenant-offboarding.service');
 *   const preview = await svc.previewOffboarding(tenantId);
 *   await svc.offboardTenant(tenantId, { hardDelete: false, actorId });
 */

const db = require('../../core/database/mysql');
const s3Service = require('../../core/services/s3.service');
const auditRepo = require('../audit/audit.repository');
const { invalidateUserCache } = require('../../core/middleware/authMiddleware');

// Tables that carry a tenant_id column (ordered to respect FK constraints)
const TENANT_TABLES = [
  'attendance',
  'attendance_daily',
  'attendance_go_out',
  'attendance_plan',
  'leave_requests',
  'leave_balances',
  'expense_claims',
  'work_reports',
  'salary_inputs',
  'salary',
  'salary_history',
  'notices',
  'payslip_files',
  'shift_definitions',
  'user_work_details',
  'employee_documents',
  'requests',
  'adjustments',
  'go_out_requests',
  'user_passkeys',
  'settings',
  'password_policy',
  'twofa_policy',
  'departments',
  'branches',
];

/**
 * Returns counts of records per table for a given tenant.
 * Safe to call — read-only.
 * @param {number} tenantId
 * @returns {Promise<Object>}
 */
async function previewOffboarding(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  const tid = parseInt(String(tenantId), 10);

  const counts = {};
  for (const table of TENANT_TABLES) {
    try {
      const [[{ cnt }]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE tenant_id = ?`,
        [tid]
      );
      counts[table] = Number(cnt || 0);
    } catch (e) {
      counts[table] = null; // table may not exist yet
    }
  }

  // Users directly assigned to this tenant
  const [[{ userCount }]] = await db.query(
    `SELECT COUNT(*) AS userCount FROM users WHERE tenant_id = ?`,
    [tid]
  );
  counts.users = Number(userCount || 0);

  // tenant_users mappings
  const [[{ mappingCount }]] = await db.query(
    `SELECT COUNT(*) AS mappingCount FROM tenant_users WHERE tenant_id = ?`,
    [tid]
  );
  counts.tenant_users = Number(mappingCount || 0);

  // S3 payslip files
  let s3FileCount = 0;
  if (s3Service.isR2Configured()) {
    try {
      const files = await s3Service.listFromR2(`payslips/${tid}/`).catch(() => []);
      s3FileCount = (files || []).length;
    } catch (e) { /* silently ignored */ }
  }
  counts.s3_payslips = s3FileCount;

  const [tenantRow] = await db.query(`SELECT id, name, slug, status FROM tenants WHERE id = ? LIMIT 1`, [tid]);
  return {
    tenant: tenantRow[0] || null,
    counts,
  };
}

/**
 * Offboard (decommission) a tenant.
 *
 * Steps:
 *  1. Revoke all JWT sessions (bump token_version for all users)
 *  2. Delete refresh tokens
 *  3. Delete S3 payslip files for this tenant
 *  4. If hardDelete=true: DELETE all rows with tenant_id = tid + users
 *  5. Remove tenant_users mappings
 *  6. Mark tenant status = 'cancelled'
 *  7. Write audit log
 *
 * @param {number}  tenantId
 * @param {Object}  opts
 * @param {boolean} [opts.hardDelete=false]  When true, permanently deletes data.
 *                                           When false (default), only revokes sessions and cancels tenant.
 * @param {number}  [opts.actorId]           userId of the sysadmin performing the action
 * @returns {Promise<{ok: boolean, revokedSessions: number, deletedFiles: number}>}
 */
async function offboardTenant(tenantId, { hardDelete = false, actorId = null } = {}) {
  if (!tenantId) throw new Error('tenantId is required');
  const tid = parseInt(String(tenantId), 10);

  // Verify tenant exists
  const [[tenant]] = await db.query(`SELECT id, name, slug, status FROM tenants WHERE id = ? LIMIT 1`, [tid]);
  if (!tenant) throw new Error(`Tenant ${tid} not found`);
  if (tenant.status === 'cancelled') throw new Error(`Tenant ${tid} is already cancelled`);

  let revokedSessions = 0;
  let deletedFiles = 0;

  // ── Step 1 & 2: Revoke all active sessions ─────────────────────────────────
  // Bump token_version for all users in this tenant → all existing JWTs become invalid
  const [userRows] = await db.query(`SELECT id FROM users WHERE tenant_id = ?`, [tid]);
  for (const { id: uid } of userRows) {
    try {
      await db.query(`UPDATE users SET token_version = token_version + 1 WHERE id = ?`, [uid]);
      await invalidateUserCache(uid, tid);
      revokedSessions++;
    } catch (e) { /* continue */ }
  }
  // Delete all refresh tokens for this tenant's users
  if (userRows.length > 0) {
    try {
      await db.query(
        `DELETE rt FROM refresh_tokens rt INNER JOIN users u ON u.id = rt.userId WHERE u.tenant_id = ?`,
        [tid]
      );
    } catch (e) { /* silently ignored */ }
  }

  // ── Step 3: Delete S3 payslip files ────────────────────────────────────────
  if (s3Service.isR2Configured()) {
    try {
      const files = await s3Service.listFromR2(`payslips/${tid}/`).catch(() => []);
      for (const file of (files || [])) {
        try {
          await s3Service.deleteFromR2(file.key || file);
          deletedFiles++;
        } catch (e) { /* silently ignored */ }
      }
    } catch (e) { /* silently ignored */ }
  }

  // ── Step 4: Hard delete tenant data (optional) ─────────────────────────────
  if (hardDelete) {
    for (const table of TENANT_TABLES) {
      try {
        await db.query(`DELETE FROM \`${table}\` WHERE tenant_id = ?`, [tid]);
      } catch (e) { /* table may not exist */ }
    }
    // Delete users directly assigned to this tenant
    try {
      await db.query(`DELETE FROM users WHERE tenant_id = ?`, [tid]);
    } catch (e) { /* silently ignored */ }
  }

  // ── Step 5: Remove tenant_users mappings ───────────────────────────────────
  await db.query(`DELETE FROM tenant_users WHERE tenant_id = ?`, [tid]);

  // ── Step 6: Cancel the tenant ──────────────────────────────────────────────
  await db.query(`UPDATE tenants SET status = 'cancelled' WHERE id = ?`, [tid]);

  // ── Step 7: Audit log ──────────────────────────────────────────────────────
  try {
    await auditRepo.writeLog({
      userId: actorId,
      tenant_id: tid,
      action: 'platform_offboard_tenant',
      path: '/api/platform/tenants/' + tid,
      method: 'DELETE',
      ip: null,
      userAgent: null,
      beforeData: JSON.stringify({ tenantId: tid, tenantName: tenant.name, hardDelete }),
      afterData: JSON.stringify({ revokedSessions, deletedFiles, status: 'cancelled' }),
    });
  } catch (e) { /* silently ignored */ }

  return { ok: true, revokedSessions, deletedFiles };
}

module.exports = { previewOffboarding, offboardTenant };
