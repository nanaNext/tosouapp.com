const db = require('./src/core/database/mysql');

async function run() {
  try {
    const today = '2026-06-24';
    const [rows] = await db.query(`
      SELECT * FROM work_reports WHERE userId = 27;
    `);
    console.log("work_reports:");
    console.log(rows);
    
    const [rows2] = await db.query(`
      SELECT * FROM attendance_daily WHERE userId = 27 AND date = '2026-06-24';
    `);
    console.log("attendance_daily:");
    console.log(rows2);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
