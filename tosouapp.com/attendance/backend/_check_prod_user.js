/**
 * Check user 19 and current logged-in manager on PRODUCTION DB
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const envContent = fs.readFileSync(__dirname + '/.env', 'utf8');

const getCommentedEnv = (key) => {
  const match = envContent.match(new RegExp(`^#${key}=(.+)`, 'm'));
  return match ? match[1].trim() : null;
};

const config = {
  host: getCommentedEnv('DB_HOST') || 'monorail.proxy.rlwy.net',
  port: parseInt(getCommentedEnv('DB_PORT') || '18601', 10),
  user: getCommentedEnv('DB_USER') || 'root',
  password: getCommentedEnv('DB_PASSWORD') || getCommentedEnv('DB_PASS'),
  database: getCommentedEnv('DB_NAME') || 'railway',
  ssl: { rejectUnauthorized: false }
};

(async () => {
  console.log('Connecting to production DB...');
  const conn = await mysql.createConnection(config);

  // Check user 19
  const [u19] = await conn.query('SELECT id, username, role, departmentId FROM users WHERE id = 19');
  console.log('User 19:', JSON.stringify(u19[0]));

  // Check all managers
  const [managers] = await conn.query("SELECT id, username, role, departmentId FROM users WHERE role = 'manager'");
  console.log('Managers:', JSON.stringify(managers, null, 2));

  await conn.end();
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
