const db = require('./attendance/backend/src/core/database/mysql');
async function run() {
  try {
    await db.query('ALTER TABLE time_adjust_requests ADD COLUMN admin_note TEXT NULL;');
    console.log('Added admin_note column');
  } catch (e) {
    console.log(e.message);
  }
  process.exit();
}
run();