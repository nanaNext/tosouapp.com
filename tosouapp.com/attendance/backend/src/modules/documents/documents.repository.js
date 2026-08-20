const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      type VARCHAR(64) NOT NULL,
      title VARCHAR(256),
      description TEXT,
      filename VARCHAR(256) NOT NULL,
      mime VARCHAR(128),
      size BIGINT,
      uploaded_by BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_type (type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function listFiltered({ userId, types, from, to, owner, page, pageSize, tenantId = null }) {
  const tid = _tid(tenantId);
  const where = [];
  const params = [];
  if (userId) {
    where.push('d.user_id = ?');
    params.push(parseInt(userId, 10));
  }
  if (Array.isArray(types) && types.length > 0) {
    where.push(`d.type IN (${types.map(() => '?').join(',')})`);
    params.push(...types.map(String));
  }
  if (from) {
    where.push('DATE(d.created_at) >= DATE(?)');
    params.push(from);
  }
  if (to) {
    where.push('DATE(d.created_at) <= DATE(?)');
    params.push(to);
  }
  if (owner) {
    where.push('d.uploaded_by = ?');
    params.push(parseInt(owner, 10));
  }
  if (tid != null) {
    where.push('u.tenant_id = ?');
    params.push(tid);
  }
  const p = Math.max(1, parseInt(page || 1, 10));
  const ps = Math.max(1, parseInt(pageSize || 20, 10));
  const offset = (p - 1) * ps;
  const joinSql = tid != null ? 'INNER JOIN users u ON u.id = d.user_id' : '';
  const sqlBase = `
    SELECT d.id, d.user_id as userId, d.type, d.title, d.description, d.filename, d.mime, d.size, d.uploaded_by as uploadedBy, d.created_at as createdAt
    FROM employee_documents d
    ${joinSql}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY d.created_at DESC, d.id DESC
  `;
  const [countRows] = await db.query(`SELECT COUNT(*) as c FROM (${sqlBase}) t`, params);
  const total = (countRows && countRows[0] && countRows[0].c) ? parseInt(countRows[0].c, 10) : 0;
  const [rows] = await db.query(sqlBase + ` LIMIT ? OFFSET ?`, [...params, ps, offset]);
  return { rows, page: p, pageSize: ps, total, pages: Math.ceil(total / ps) };
}

async function getById(id, tenantId = null) {
  const tid = _tid(tenantId);
  if (tid != null) {
    const [rows] = await db.query(
      `SELECT d.id, d.user_id as userId, d.type, d.title, d.description, d.filename, d.mime, d.size, d.uploaded_by as uploadedBy, d.created_at as createdAt
       FROM employee_documents d
       INNER JOIN users u ON u.id = d.user_id
       WHERE d.id = ? AND u.tenant_id = ? LIMIT 1`,
      [parseInt(id, 10), tid]
    );
    return rows && rows[0] ? rows[0] : null;
  }
  const [rows] = await db.query(
    `SELECT id, user_id as userId, type, title, description, filename, mime, size, uploaded_by as uploadedBy, created_at as createdAt
     FROM employee_documents WHERE id = ? LIMIT 1`,
    [parseInt(id, 10)]
  );
  return rows && rows[0] ? rows[0] : null;
}

module.exports = { ensureTable, listFiltered, getById };
