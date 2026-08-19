'use strict';
/**
 * Platform API — only accessible by sysadmin (level 100).
 * All routes require authenticate + authorize('sysadmin').
 *
 * Mounted at: /api/platform
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const tenantRepo = require('../tenants/tenant.repository');
const userRepo = require('../users/user.repository');
const db = require('../../core/database/mysql');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwtSecretCurrent, accessTokenExpires } = require('../../config/env');
const refreshRepo = require('../auth/refresh.repository');
const auditRepo = require('../audit/audit.repository');

// All platform routes require sysadmin
router.use(authenticate, authorize('sysadmin'));

// ── GET /api/platform/tenants ─────────────────────────────────────────────────
// List all tenants with user counts and owner info
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await tenantRepo.listAllTenants();

    // Enrich with owner info
    const enriched = await Promise.all(tenants.map(async (t) => {
      const [owners] = await db.query(
        `SELECT u.id, u.username, u.email
         FROM tenant_users tu
         JOIN users u ON u.id = tu.user_id
         WHERE tu.tenant_id = ? AND u.role IN ('owner','admin')
         ORDER BY u.role = 'owner' DESC, u.id ASC
         LIMIT 5`,
        [t.id]
      );
      // Load full tenant detail including new columns
      const [detail] = await db.query(
        `SELECT address, phone, fax, license_number, representative, business_type, description FROM tenants WHERE id = ? LIMIT 1`,
        [t.id]
      );
      return { ...t, ...(detail[0] || {}), owners };
    }));

    res.json({ tenants: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/platform/tenants ────────────────────────────────────────────────
// Create a new tenant
router.post('/tenants', async (req, res) => {
  try {
    const { name, slug, logo_url, logo_name, primary_color, plan, mail_from, app_url, max_users } = req.body || {};
    if (!name || !slug) return res.status(400).json({ message: 'name and slug are required' });

    // Check slug uniqueness
    const existing = await tenantRepo.getTenantBySlug(slug);
    if (existing) return res.status(409).json({ message: 'Slug already exists' });

    const id = await tenantRepo.createTenant({
      name, slug, logo_url, logo_name, primary_color, plan, mail_from, app_url, max_users
    });

    try {
      await auditRepo.writeLog({
        userId: req.user.id, action: 'platform_create_tenant',
        path: req.path, method: req.method, ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null, afterData: JSON.stringify({ id, name, slug }),
      });
    } catch (e) { /* silently ignored */ }

    res.status(201).json({ id, name, slug });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/platform/tenants/:id ──────────────────────────────────────────
// Update a tenant (name, logo, status, plan, etc.)
router.patch('/tenants/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Invalid tenant id' });
    await tenantRepo.updateTenant(id, req.body || {});
    try {
      await auditRepo.writeLog({
        userId: req.user.id, action: 'platform_update_tenant',
        path: req.path, method: req.method, ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null, afterData: JSON.stringify({ id, ...req.body }),
      });
    } catch (e) { /* silently ignored */ }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/platform/tenants/:id/users ──────────────────────────────────────
// List users in a tenant
router.get('/tenants/:id/users', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.employment_status,
              tu.role_in_tenant, tu.granted_at
       FROM tenant_users tu
       JOIN users u ON u.id = tu.user_id
       WHERE tu.tenant_id = ?
       ORDER BY tu.role_in_tenant ASC, u.username ASC`,
      [tenantId]
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/platform/tenants/:id/users ─────────────────────────────────────
// Add a user to a tenant (by userId + roleInTenant)
router.post('/tenants/:id/users', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const { user_id, role_in_tenant } = req.body || {};
    if (!user_id) return res.status(400).json({ message: 'user_id required' });
    await tenantRepo.addUserToTenant(user_id, tenantId, role_in_tenant || 'employee');
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/platform/tenants/:id/users/:userId ───────────────────────────
// Remove a user from a tenant
router.delete('/tenants/:id/users/:userId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    await tenantRepo.removeUserFromTenant(userId, tenantId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/platform/impersonate ───────────────────────────────────────────
// Sysadmin switches into any tenant as admin.
// Issues a tenant-scoped JWT without needing to know passwords.
router.post('/impersonate', async (req, res) => {
  try {
    const { tenant_id } = req.body || {};
    const tenantId = parseInt(String(tenant_id || ''), 10);
    if (!tenantId) return res.status(400).json({ message: 'tenant_id required' });

    const tenant = await tenantRepo.getTenantById(tenantId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(404).json({ message: 'Tenant not found or inactive' });
    }

    // Issue a token for sysadmin scoped to the target tenant, role=admin
    const sysUser = req.user;
    const tokenVersion = sysUser.v || 1;
    const impersonateToken = jwt.sign(
      {
        id: sysUser.id,
        role: 'admin',          // acts as admin in that tenant
        v: tokenVersion,
        tid: tenantId,
        _impersonate: true,     // flag for audit
      },
      jwtSecretCurrent,
      { expiresIn: accessTokenExpires }
    );

    // Create refresh token for the impersonation session
    const rt = crypto.randomBytes(48).toString('base64url');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshRepo.createToken({
      userId: sysUser.id, token: rt,
      expiresAt: expires.toISOString().slice(0, 19).replace('T', ' '),
      userAgent: req.headers['user-agent'], ip: req.ip,
    });

    const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https') || req.protocol === 'https';
    res.cookie('refreshToken', rt, {
      httpOnly: true, secure: isHttps, sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth',
    });
    const csrf = crypto.randomBytes(24).toString('hex');
    res.cookie('csrfToken', csrf, {
      httpOnly: false, secure: isHttps, sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
    });
    res.cookie('session_token', impersonateToken, {
      httpOnly: true, secure: isHttps, sameSite: 'lax',
      maxAge: accessTokenExpires * 1000, path: '/',
    });

    try {
      await auditRepo.writeLog({
        userId: sysUser.id, action: 'platform_impersonate',
        path: req.path, method: req.method, ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null, afterData: JSON.stringify({ tenantId, tenantName: tenant.name }),
      });
    } catch (e) { /* silently ignored */ }

    res.json({
      accessToken: impersonateToken,
      tenantId,
      tenantName: tenant.name,
      tenantLogo: tenant.logo_url || '',
      tenantLogoName: tenant.logo_name || '',
      nextPath: '/admin/dashboard',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/platform/users ──────────────────────────────────────────────────
// List ALL users across the platform (for assign dropdown + search)
router.get('/users', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.employment_status,
              u.tenant_id,
              GROUP_CONCAT(DISTINCT tu.tenant_id ORDER BY tu.tenant_id SEPARATOR ',') AS tenant_ids,
              GROUP_CONCAT(DISTINCT t.name ORDER BY tu.tenant_id SEPARATOR '||') AS tenant_names
       FROM users u
       LEFT JOIN tenant_users tu ON tu.user_id = u.id
       LEFT JOIN tenants t ON t.id = tu.tenant_id
       WHERE u.role NOT IN ('sysadmin')
       GROUP BY u.id
       ORDER BY u.username ASC`
    );
    const filtered = q
      ? rows.filter(r =>
          String(r.username || '').toLowerCase().includes(q) ||
          String(r.email || '').toLowerCase().includes(q)
        )
      : rows;
    res.json({ users: filtered });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/platform/tenants/:id/users/:userId ─────────────────────────────
// Update role_in_tenant for a user already in a tenant
router.patch('/tenants/:id/users/:userId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    const { role_in_tenant } = req.body || {};
    if (!role_in_tenant) return res.status(400).json({ message: 'role_in_tenant required' });
    await db.query(
      'UPDATE tenant_users SET role_in_tenant = ? WHERE user_id = ? AND tenant_id = ?',
      [role_in_tenant, userId, tenantId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/platform/stats ───────────────────────────────────────────────────
// Overall platform stats for sysadmin dashboard
router.get('/stats', async (req, res) => {
  try {
    const [[{ total_tenants }]] = await db.query('SELECT COUNT(*) AS total_tenants FROM tenants WHERE status = "active"');
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE employment_status = "active"');
    const [[{ total_checkins_today }]] = await db.query(
      'SELECT COUNT(*) AS total_checkins_today FROM attendance WHERE DATE(checkIn) = CURDATE()'
    );
    const tenants = await tenantRepo.listAllTenants();

    res.json({
      total_tenants,
      total_users,
      total_checkins_today,
      tenants,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/platform/today-checkins ──────────────────────────────────────────
// 本日の打刻一覧: 今日チェックインした全ユーザーの名前・時刻を返す
router.get('/today-checkins', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id AS userId,
        u.username AS username,
        u.email AS email,
        u.employee_code AS employeeCode,
        d.name AS departmentName,
        t.name AS tenantName,
        a.checkIn AS checkIn,
        a.checkOut AS checkOut
      FROM attendance a
      INNER JOIN users u ON u.id = a.userId
      LEFT JOIN departments d ON d.id = u.departmentId
      LEFT JOIN tenant_users tu ON tu.user_id = u.id
      LEFT JOIN tenants t ON t.id = tu.tenant_id
      WHERE DATE(a.checkIn) = CURDATE()
      ORDER BY a.checkIn DESC
    `);
    res.status(200).json({ date: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10), count: (rows || []).length, items: rows || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
