const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

// cái này là để tạo bảng payslip files nếu chưa có 
async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS payslip_files (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      month CHAR(7) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      uploaded_by BIGINT UNSIGNED NOT NULL,
      iv VARBINARY(16) NULL,
      auth_tag VARBINARY(16) NULL,
      key_version VARCHAR(32) NULL,
      hash VARCHAR(64) NULL,
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_month (userId, month),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  await db.query(sql);
  try {
    const [cols] = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'payslip_files'
    `);
    const set = new Set((cols || []).map(c => String(c.column_name)));
    if (!set.has('iv')) {
      await db.query(`ALTER TABLE payslip_files ADD COLUMN iv VARBINARY(16) NULL`);
    }
    if (!set.has('auth_tag')) {
      await db.query(`ALTER TABLE payslip_files ADD COLUMN auth_tag VARBINARY(16) NULL`);
    }
    if (!set.has('key_version')) {
      await db.query(`ALTER TABLE payslip_files ADD COLUMN key_version VARCHAR(32) NULL`);
    }
    if (!set.has('hash')) {
      await db.query(`ALTER TABLE payslip_files ADD COLUMN hash VARCHAR(64) NULL`);
    }
    if (!set.has('version')) {
      try {
        await db.query(`ALTER TABLE payslip_files ADD COLUMN version INT NOT NULL DEFAULT 1`);
      } catch (e) { /* silently ignored */ }
    }
    const [idx] = await db.query(`
      SELECT index_name, non_unique
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'payslip_files'
    `);
    const idxSet = new Set((idx || []).map(i => String(i.index_name)));
    if (!idxSet.has('uniq_user_month')) {
      try {
        await db.query(`ALTER TABLE payslip_files ADD CONSTRAINT uniq_user_month UNIQUE (userId, month)`);
      } catch (e) { /* silently ignored */ }
    }
    if (idxSet.has('idx_user_month')) {
      try {
        await db.query(`ALTER TABLE payslip_files DROP INDEX idx_user_month`);
      } catch (e) { /* silently ignored */ }
    }
    try {
      const [fk1] = await db.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payslip_files' AND COLUMN_NAME = 'userId' AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      if (!fk1 || !fk1.length) {
        try { await db.query(`ALTER TABLE payslip_files ADD CONSTRAINT fk_payslip_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE`); } catch (e) { /* silently ignored */ }
      }
      const [fk2] = await db.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payslip_files' AND COLUMN_NAME = 'uploaded_by' AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      if (!fk2 || !fk2.length) {
        try { await db.query(`ALTER TABLE payslip_files ADD CONSTRAINT fk_payslip_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL`); } catch (e) { /* silently ignored */ }
      }
    } catch (e) { /* silently ignored */ }
  } catch (e) { /* silently ignored */ }
}

async function create({ userId, month, filename, originalName, uploadedBy, iv, authTag, keyVersion, hash, version = 1, tenantId = null }) {
  const tid = _tid(tenantId);
  // If tenantId provided, verify user belongs to tenant
  if (tid !== null) {
    const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`, [userId, tid]);
    if (!check || !check.length) return null;
  }
  const sql = `
    INSERT INTO payslip_files (userId, month, filename, original_name, uploaded_by, iv, auth_tag, key_version, hash, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [res] = await db.query(sql, [userId, month, filename, originalName, uploadedBy, iv || null, authTag || null, keyVersion || null, hash || null, version || 1]);
  return res.insertId;
}

async function listByUserMonth(userId, month, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  let params;
  if (tid !== null) {
    sql = `
      SELECT pf.id, pf.userId, pf.month, pf.filename, pf.original_name, pf.uploaded_by, pf.created_at
      FROM payslip_files pf
      JOIN users u ON u.id = pf.userId
      WHERE pf.userId = ? AND ( ? IS NULL OR pf.month = ? ) AND u.tenant_id = ?
      ORDER BY pf.created_at DESC
    `;
    params = [userId, month || null, month || null, tid];
  } else {
    sql = `
      SELECT id, userId, month, filename, original_name, uploaded_by, created_at
      FROM payslip_files
      WHERE userId = ? AND ( ? IS NULL OR month = ? )
      ORDER BY created_at DESC
    `;
    params = [userId, month || null, month || null];
  }
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getById(id, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  let params;
  if (tid !== null) {
    sql = `
      SELECT pf.*
      FROM payslip_files pf
      JOIN users u ON u.id = pf.userId
      WHERE pf.id = ? AND u.tenant_id = ?
      LIMIT 1
    `;
    params = [id, tid];
  } else {
    sql = `SELECT * FROM payslip_files WHERE id = ? LIMIT 1`;
    params = [id];
  }
  const [rows] = await db.query(sql, params);
  return rows[0];
}

async function deleteById(id, tenantId = null) {
  const before = await getById(id, tenantId);
  if (!before) return null;
  const sql = `DELETE FROM payslip_files WHERE id = ?`;
  await db.query(sql, [id]);
  return before;
}

async function updateFile(id, filename, originalName, uploadedBy, iv, authTag, keyVersion, hash, version = null, tenantId = null) {
  const tid = _tid(tenantId);
  // If tenantId provided, verify the payslip belongs to a user in the tenant
  if (tid !== null) {
    const existing = await getById(id, tenantId);
    if (!existing) return null;
  }
  const sql = `
    UPDATE payslip_files
    SET filename = ?, original_name = ?, uploaded_by = ?, iv = ?, auth_tag = ?, key_version = ?, hash = ?, version = COALESCE(?, version)
    WHERE id = ?
  `;
  await db.query(sql, [filename, originalName, uploadedBy, iv || null, authTag || null, keyVersion || null, hash || null, version, id]);
  return getById(id, tenantId);
}

async function listByUserBetween(userId, fromMonth, toMonth, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  const params = [];

  if (tid !== null) {
    sql = `
      SELECT pf.id, pf.userId, pf.month, pf.filename, pf.original_name, pf.uploaded_by, pf.created_at
      FROM payslip_files pf
      JOIN users u ON u.id = pf.userId
      WHERE pf.userId = ? AND u.tenant_id = ?
    `;
    params.push(userId, tid);
  } else {
    sql = `
      SELECT id, userId, month, filename, original_name, uploaded_by, created_at
      FROM payslip_files
      WHERE userId = ?
    `;
    params.push(userId);
  }

  if (fromMonth && toMonth) {
    sql += tid !== null ? ` AND pf.month >= ? AND pf.month <= ?` : ` AND month >= ? AND month <= ?`;
    params.push(fromMonth, toMonth);
  } else if (fromMonth) {
    sql += tid !== null ? ` AND pf.month >= ?` : ` AND month >= ?`;
    params.push(fromMonth);
  } else if (toMonth) {
    sql += tid !== null ? ` AND pf.month <= ?` : ` AND month <= ?`;
    params.push(toMonth);
  }
  sql += tid !== null ? ` ORDER BY pf.month DESC, pf.created_at DESC` : ` ORDER BY month DESC, created_at DESC`;
  const [rows] = await db.query(sql, params);
  return rows;
}

async function findLatestByUserMonth(userId, month, tenantId = null) {
  const tid = _tid(tenantId);
  let sql;
  let params;
  if (tid !== null) {
    sql = `
      SELECT pf.id, pf.userId, pf.month, pf.filename, pf.original_name, pf.uploaded_by, pf.created_at
      FROM payslip_files pf
      JOIN users u ON u.id = pf.userId
      WHERE pf.userId = ? AND pf.month = ? AND u.tenant_id = ?
      ORDER BY pf.created_at DESC
      LIMIT 1
    `;
    params = [userId, month, tid];
  } else {
    sql = `
      SELECT id, userId, month, filename, original_name, uploaded_by, created_at
      FROM payslip_files
      WHERE userId = ? AND month = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    params = [userId, month];
  }
  const [rows] = await db.query(sql, params);
  return rows[0];
}

module.exports = { ensureTable, create, listByUserMonth, getById, deleteById, updateFile, listByUserBetween, findLatestByUserMonth };
