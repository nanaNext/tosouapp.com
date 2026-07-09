// Quick script to verify auth test can work with local DB
require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
const bcrypt = require('bcrypt');

async function run() {
  try {
    const h = bcrypt.hashSync('TestPass123', 10);
    await db.query(
      `INSERT INTO users (username, email, email_lower, password, role, employment_type, employment_status)
       VALUES (?, ?, LOWER(?), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password=VALUES(password), employment_status='active', locked_until=NULL, login_fail_count=0`,
      ['AuthTestUser', 'test_auth_user@test.local', 'test_auth_user@test.local', h, 'employee', 'full_time', 'active']
    );
    const [[u]] = await db.query('SELECT id, email, employment_status FROM users WHERE email_lower = LOWER(?)', ['test_auth_user@test.local']);
    console.log('✅ Test user ready:', u);
    await db.end();
    process.exit(0);
  } catch (e) {
    console.log('❌ Error:', e.message);
    process.exit(1);
  }
}
run();
