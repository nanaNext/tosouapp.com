require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
async function run() {
  const [tables] = await db.query('SHOW TABLES');
  console.log('Tables:', tables.map(r => Object.values(r)[0]).join(', '));
  const hasRefresh = tables.some(r => Object.values(r)[0] === 'refresh_tokens');
  console.log('refresh_tokens exists:', hasRefresh);
  if (!hasRefresh) {
    console.log('Creating refresh_tokens...');
    await db.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expiresAt DATETIME NOT NULL,
      userAgent VARCHAR(512),
      ip VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_userId (userId),
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('Created!');
  }
  await db.end();
  process.exit(0);
}
run().catch(e => { console.log('ERR:', e.message); process.exit(1); });
