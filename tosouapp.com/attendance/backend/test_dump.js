const db = require('./src/core/database/mysql');

async function run() {
  const [rows] = await db.query(`
    SELECT * FROM attendance_daily 
    WHERE date = '2026-06-05'
    ORDER BY updated_at DESC
    LIMIT 10
  `);
  console.log(rows);
  process.exit(0);
}

run().catch(console.error);