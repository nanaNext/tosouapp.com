/**
 * One-time script: auto-generate employee_code for all users that don't have one.
 * Format: EMP001, EMP002, ...
 * Starts from the highest existing EMP### number + 1.
 */
const db = require('../src/core/database/mysql');

async function run() {
  // Find highest existing EMP### code
  const [maxRows] = await db.query(
    "SELECT employee_code FROM users WHERE employee_code REGEXP '^EMP[0-9]+$' ORDER BY CAST(SUBSTRING(employee_code, 4) AS UNSIGNED) DESC LIMIT 1"
  );
  let nextNum = 1;
  if (maxRows && maxRows.length > 0) {
    const code = maxRows[0].employee_code; // e.g. "EMP023"
    nextNum = parseInt(code.replace('EMP', ''), 10) + 1;
  }
  console.log('Starting from EMP' + String(nextNum).padStart(3, '0'));

  // Get all users without employee_code
  const [users] = await db.query(
    "SELECT id, username FROM users WHERE (employee_code IS NULL OR employee_code = '') ORDER BY id ASC"
  );
  console.log(`Found ${users.length} users without employee_code`);

  if (users.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  for (const u of users) {
    const code = 'EMP' + String(nextNum).padStart(3, '0');
    await db.query('UPDATE users SET employee_code = ? WHERE id = ? AND (employee_code IS NULL OR employee_code = ?)', [code, u.id, '']);
    console.log(`  ${u.id} ${u.username || '(no name)'} → ${code}`);
    nextNum++;
  }

  console.log(`\nDone! Assigned ${users.length} codes.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
