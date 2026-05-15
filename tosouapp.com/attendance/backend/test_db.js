const mysql = require('mysql2/promise');
const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: '1234567', database: 'attendance_db' });
async function run() {
  const [rows] = await pool.query('SELECT checkIn, checkOut, shiftId, work_type FROM attendance WHERE userId = 23 AND checkIn LIKE "2026-04-%"');
  console.log(rows.map(r => ({
    in: r.checkIn.toISOString(),
    out: r.checkOut.toISOString(),
    diffMin: (r.checkOut - r.checkIn) / 60000
  })));
  process.exit(0);
}
run();