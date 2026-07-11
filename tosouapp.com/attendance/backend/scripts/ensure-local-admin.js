require('../src/config/loadEnv');

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const email = String(process.env.LOCAL_ADMIN_EMAIL || 'smoke-admin@local.test').trim().toLowerCase();
const password = String(process.env.LOCAL_ADMIN_PASSWORD || 'SmokeTest123').trim();
const username = String(process.env.LOCAL_ADMIN_NAME || 'Smoke Admin').trim();
const bcryptRounds = Math.max(4, Number(process.env.BCRYPT_ROUNDS || 10));

async function main() {
  if (!email || !password) {
    throw new Error('LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD are required');
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    charset: 'utf8mb4'
  });

  try {
    const hashed = bcrypt.hashSync(password, bcryptRounds);
    const [rows] = await conn.query(
      'SELECT id FROM users WHERE email_lower = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [email, email]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      await conn.query(
        `UPDATE users
            SET username = ?,
                email = ?,
                email_lower = LOWER(?),
                password = ?,
                role = 'admin',
                employment_status = 'active'
          WHERE id = ?`,
        [username, email, email, hashed, rows[0].id]
      );
      console.log(JSON.stringify({ action: 'updated', id: rows[0].id, email }, null, 2));
      return;
    }

    const [result] = await conn.query(
      `INSERT INTO users (
        employee_code, username, email, email_lower, password,
        role, employment_type, employment_status, hire_date, join_date
      ) VALUES (
        NULL, ?, ?, LOWER(?), ?,
        'admin', 'full_time', 'active', CURRENT_DATE, CURRENT_DATE
      )`,
      [username, email, email, hashed]
    );

    console.log(JSON.stringify({ action: 'created', id: result.insertId, email }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(`[ensure-local-admin] ${error.message}`);
  process.exitCode = 1;
});
