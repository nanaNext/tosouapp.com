const db = require('./core/database/mysql');
const fs = require('fs');
async function check() {
  const [rows] = await db.query("SELECT userId, payload FROM salary_inputs WHERE month = '2026-04'");
  fs.writeFileSync('db3.out', JSON.stringify(rows, null, 2));
  process.exit(0);
}
check();
