const db = require('../../core/database/mysql');

module.exports = {
  async ensureUserSecurityColumns() {
    const sql = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS login_fail_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL,
      ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1
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
      } catch {}
    }
  },
  async findUserByEmail(email) {
    try { await db.query(`ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) NULL`); } catch {}
    try { await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_email_lower (email_lower)`); } catch {}
    try { await db.query(`UPDATE users SET email_lower = LOWER(email) WHERE email IS NOT NULL AND (email_lower IS NULL OR email_lower = '')`); } catch {}
    let [rows] = await db.query(`SELECT * FROM users WHERE email_lower = LOWER(?) LIMIT 1`, [email]);
    if (!rows || !rows.length) {
      [rows] = await db.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    }
    return rows[0];
  },
  async findUserById(id) {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createUser({ username, email, password }) {
    try { await db.query(`ALTER TABLE users ADD COLUMN email_lower VARCHAR(255) NULL`); } catch {}
    try { await db.query(`ALTER TABLE users ADD UNIQUE KEY uniq_email_lower (email_lower)`); } catch {}
    const sql = `INSERT INTO users (username, email, email_lower, password) VALUES (?, ?, LOWER(?), ?)`;
    const [result] = await db.query(sql, [username, email, email, password]);
    return result.insertId;
  },
  async incrementFail(email) {
    await db.query(`UPDATE users SET login_fail_count = COALESCE(login_fail_count, 0) + 1 WHERE email = ?`, [email]);
    const [rows] = await db.query(`SELECT login_fail_count FROM users WHERE email = ?`, [email]);
    return rows[0]?.login_fail_count || 0;
  },
  async lockUser(email, minutes = 15) {
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString().slice(0,19).replace('T',' ');
    await db.query(`UPDATE users SET locked_until = ? WHERE email = ?`, [until, email]);
  },
  async resetLock(email) {
    await db.query(`UPDATE users SET login_fail_count = 0, locked_until = NULL WHERE email = ?`, [email]);
  }
};
