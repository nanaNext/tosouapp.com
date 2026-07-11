const db = require('../../core/database/mysql');

module.exports = {
  async ensureUserSecurityColumns() {
    const sql = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS login_fail_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL,
      ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS email_lower VARCHAR(255) NULL
    `;
    try {
      await db.query(sql);
    } catch (e) {
      try {
        const [cols] = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = DATABASE() AND table_name = 'users'
        `);
        const set = new Set((cols || []).map(c => String(c.column_name)));
        if (!set.has('login_fail_count')) {
          await db.query(`ALTER TABLE users ADD COLUMN login_fail_count INT DEFAULT 0`);
        }
        if (!set.has('locked_until')) {
          await db.query(`ALTER TABLE users ADD COLUMN locked_until DATETIME NULL`);
        }
        if (!set.has('token_version')) {
          await db.query(`ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1`);
        }
        if (!set.has('email_lower')) {
          await db.query(`ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) NULL`);
        }
      } catch (e) { /* silently ignored */ }
    }
    try { await db.query(`UPDATE users SET email = TRIM(email) WHERE email IS NOT NULL AND (email REGEXP '^[[:space:]]|[[:space:]]$')`); } catch (e) { /* silently ignored */ }
    try { await db.query(`UPDATE users SET email_lower = LOWER(TRIM(email)) WHERE email IS NOT NULL AND (email_lower IS NULL OR email_lower = '' OR email_lower != LOWER(TRIM(email)))`); } catch (e) { /* silently ignored */ }
    try { await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_email_lower (email_lower)`); } catch (e) { /* silently ignored */ }
  },
  async findUserByEmail(email) {
    const e = String(email || '').trim();
    let [rows] = await db.query(`SELECT * FROM users WHERE email_lower = LOWER(?) LIMIT 1`, [e]);
    if (!rows || !rows.length) {
      [rows] = await db.query(`SELECT * FROM users WHERE TRIM(email) = ? LIMIT 1`, [e]);
    }
    return rows[0];
  },
  async findUserById(id) {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createUser({ username, email, password }) {
    const sql = `INSERT INTO users (username, email, email_lower, password) VALUES (?, ?, LOWER(?), ?)`;
    const [result] = await db.query(sql, [username, email, email, password]);
    return result.insertId;
  },
  async incrementFail(email) {
    const e = String(email || '').trim();
    await db.query(`UPDATE users SET login_fail_count = COALESCE(login_fail_count, 0) + 1 WHERE email_lower = LOWER(?) OR TRIM(email) = ?`, [e, e]);
    const [rows] = await db.query(`SELECT login_fail_count FROM users WHERE email_lower = LOWER(?) OR TRIM(email) = ? LIMIT 1`, [e, e]);
    return rows[0]?.login_fail_count || 0;
  },
  async lockUser(email, minutes = 15) {
    const e = String(email || '').trim();
    await db.query(`UPDATE users SET locked_until = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE) WHERE email_lower = LOWER(?) OR TRIM(email) = ?`, [minutes, e, e]);
  },
  async resetLock(email) {
    const e = String(email || '').trim();
    await db.query(`UPDATE users SET login_fail_count = 0, locked_until = NULL WHERE email_lower = LOWER(?) OR TRIM(email) = ?`, [e, e]);
  },
  async isLocked(userId) {
    const [[row] = []] = await db.query(
      `SELECT locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP() AS is_locked FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    return !!row?.is_locked;
  }
};
