'use strict';
/**
 * @module tenant.repository
 * Data access layer for multi-tenant support.
 * Handles tenants table and tenant_users mapping.
 */

const db = require('../../core/database/mysql');

module.exports = {
  /**
   * Get all tenants a user has access to (via tenant_users mapping).
   * Returns tenants sorted by name.
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async getTenantsForUser(userId) {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.slug, t.logo_url, t.logo_name,
              t.primary_color, t.status, t.plan,
              tu.role_in_tenant AS role
       FROM tenant_users tu
       JOIN tenants t ON t.id = tu.tenant_id
       WHERE tu.user_id = ?
         AND t.status = 'active'
       ORDER BY t.name ASC`,
      [userId]
    );
    return rows;
  },

  /**
   * Get a single tenant by ID.
   * @param {number} tenantId
   * @returns {Promise<Object|null>}
   */
  async getTenantById(tenantId) {
    const [rows] = await db.query(
      `SELECT * FROM tenants WHERE id = ? LIMIT 1`,
      [tenantId]
    );
    return rows[0] || null;
  },

  /**
   * Get a single tenant by slug.
   * @param {string} slug
   * @returns {Promise<Object|null>}
   */
  async getTenantBySlug(slug) {
    const [rows] = await db.query(
      `SELECT * FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  },

  /**
   * Check if a user has access to a specific tenant.
   * Used in select-tenant API to prevent unauthorized access.
   * @param {number} userId
   * @param {number} tenantId
   * @returns {Promise<Object|null>} tenant_users row or null
   */
  async getUserTenantAccess(userId, tenantId) {
    const [rows] = await db.query(
      `SELECT tu.*, t.name AS tenant_name, t.slug, t.logo_url, t.logo_name,
              t.primary_color, t.status
       FROM tenant_users tu
       JOIN tenants t ON t.id = tu.tenant_id
       WHERE tu.user_id = ? AND tu.tenant_id = ? AND t.status = 'active'
       LIMIT 1`,
      [userId, tenantId]
    );
    return rows[0] || null;
  },

  /**
   * Add a user to a tenant with a given role.
   * @param {number} userId
   * @param {number} tenantId
   * @param {string} roleInTenant
   */
  async addUserToTenant(userId, tenantId, roleInTenant = 'employee') {
    await db.query(
      `INSERT IGNORE INTO tenant_users (user_id, tenant_id, role_in_tenant)
       VALUES (?, ?, ?)`,
      [userId, tenantId, roleInTenant]
    );
  },

  /**
   * Remove a user from a tenant.
   * @param {number} userId
   * @param {number} tenantId
   */
  async removeUserFromTenant(userId, tenantId) {
    await db.query(
      `DELETE FROM tenant_users WHERE user_id = ? AND tenant_id = ?`,
      [userId, tenantId]
    );
  },

  /**
   * List all tenants (for sysadmin platform view).
   * @returns {Promise<Array>}
   */
  async listAllTenants() {
    const [rows] = await db.query(
      `SELECT t.*,
              COUNT(tu.user_id) AS user_count
       FROM tenants t
       LEFT JOIN tenant_users tu ON tu.tenant_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at ASC`
    );
    return rows;
  },

  /**
   * Update a tenant's fields.
   * @param {number} tenantId
   * @param {Object} fields
   */
  async updateTenant(tenantId, fields) {
    const allowed = ['name', 'slug', 'logo_url', 'logo_name', 'primary_color',
                     'plan', 'status', 'mail_from', 'app_url', 'max_users'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        updates[key] = fields[key];
      }
    }
    if (Object.keys(updates).length === 0) return;
    updates.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), tenantId];
    await db.query(`UPDATE tenants SET ${setClauses} WHERE id = ?`, values);
  },

  /**
   * Create a new tenant.
   * @param {Object} data
   * @returns {Promise<number>} new tenant id
   */
  async createTenant(data) {
    const [result] = await db.query(
      `INSERT INTO tenants (name, slug, logo_url, logo_name, primary_color, plan, status, mail_from, app_url, max_users)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.logo_url || null,
        data.logo_name || data.name,
        data.primary_color || '#0b5ed7',
        data.plan || 'basic',
        data.status || 'active',
        data.mail_from || null,
        data.app_url || null,
        data.max_users || 200,
      ]
    );
    return result.insertId;
  },
};
