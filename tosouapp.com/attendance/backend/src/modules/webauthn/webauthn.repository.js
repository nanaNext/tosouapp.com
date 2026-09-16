const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_passkeys (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      tenant_id BIGINT UNSIGNED NULL,
      credential_id VARCHAR(255) NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter BIGINT UNSIGNED NOT NULL DEFAULT 0,
      transports VARCHAR(128) NULL,
      aaguid VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_tenant (tenant_id),
      CONSTRAINT fk_user_passkeys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Add tenant_id column if missing (idempotent migration for existing deployments)
  try {
    const [cols] = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'user_passkeys'
    `);
    const set = new Set((cols || []).map(c => String(c.column_name)));
    if (!set.has('tenant_id')) {
      await db.query(`ALTER TABLE user_passkeys ADD COLUMN tenant_id BIGINT UNSIGNED NULL`);
      await db.query(`ALTER TABLE user_passkeys ADD INDEX idx_upk_tenant (tenant_id)`);
      // Backfill tenant_id from users table for existing passkeys
      await db.query(`
        UPDATE user_passkeys upk
        INNER JOIN users u ON u.id = upk.user_id
        SET upk.tenant_id = u.tenant_id
        WHERE upk.tenant_id IS NULL AND u.tenant_id IS NOT NULL
      `);
    }
  } catch (e) { /* silently ignored */ }
}

async function listUserPasskeys(userId, tenantId = null) {
  const tid = _tid(tenantId);
  if (tid != null) {
    // Verify user belongs to tenant
    const [userRows] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!userRows || !userRows.length) {
      throw new Error('User does not belong to the specified tenant');
    }
  }
  const [rows] = await db.query(`SELECT id, credential_id, public_key, counter, transports, aaguid, created_at FROM user_passkeys WHERE user_id = ?`, [userId]);
  return rows || [];
}

async function findByCredentialId(credentialId, tenantId = null) {
  const tid = _tid(tenantId);
  // Scope by tenant when provided: a passkey registered for tenant A cannot be used in tenant B
  const tenantClause = tid != null ? ' AND (tenant_id = ? OR tenant_id IS NULL)' : '';
  const params = tid != null ? [credentialId, tid] : [credentialId];
  const [rows] = await db.query(
    `SELECT id, user_id, tenant_id, credential_id, public_key, counter, transports, aaguid FROM user_passkeys WHERE credential_id = ?${tenantClause} LIMIT 1`,
    params
  );
  return rows && rows[0] ? rows[0] : null;
}

async function createPasskey({ userId, credentialId, publicKey, counter, transports, aaguid, tenantId = null }) {
  const tid = _tid(tenantId);
  if (tid != null) {
    // Verify user belongs to tenant before creating passkey
    const [userRows] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!userRows || !userRows.length) {
      throw new Error('User does not belong to the specified tenant');
    }
  }
  await db.query(
    `INSERT INTO user_passkeys (user_id, tenant_id, credential_id, public_key, counter, transports, aaguid) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, tid, credentialId, publicKey, counter || 0, transports || null, aaguid || null]
  );
}

async function updateCounter(credentialId, counter) {
  await db.query(`UPDATE user_passkeys SET counter = ? WHERE credential_id = ?`, [counter, credentialId]);
}

module.exports = {
  ensureTable,
  listUserPasskeys,
  findByCredentialId,
  createPasskey,
  updateCounter
};
