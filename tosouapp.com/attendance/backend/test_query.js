const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'1234567',database:'attendance_db'});
  const [rows] = await conn.query("SELECT * FROM attendance WHERE DATE(COALESCE(checkIn, checkOut)) = '2026-07-01'");
  console.log("Raw attendance rows:", rows);
  
  const [roster] = await conn.query(`
    SELECT
        u.id AS userId,
        u.employee_code AS employeeCode,
        u.username AS username,
        a.checkIn AS checkIn,
        a.checkOut AS checkOut,
        (SELECT GROUP_CONCAT(COALESCE(DATE_FORMAT(checkIn, '%H:%i'), '—') ORDER BY checkIn ASC SEPARATOR ' / ') FROM attendance WHERE userId = u.id AND DATE(COALESCE(checkIn, checkOut)) = '2026-07-01') AS allCheckIns,
        (SELECT GROUP_CONCAT(COALESCE(DATE_FORMAT(checkOut, '%H:%i'), '—') ORDER BY checkIn ASC SEPARATOR ' / ') FROM attendance WHERE userId = u.id AND DATE(COALESCE(checkIn, checkOut)) = '2026-07-01') AS allCheckOuts
      FROM users u
      LEFT JOIN (
        SELECT t1.*
        FROM attendance t1
        INNER JOIN (
          SELECT userId, MAX(COALESCE(checkIn, checkOut)) AS maxTime
          FROM attendance
          WHERE DATE(checkIn) = '2026-07-01' OR (checkIn IS NULL AND DATE(checkOut) = '2026-07-01')
          GROUP BY userId
        ) t2
          ON t2.userId = t1.userId AND t2.maxTime = COALESCE(t1.checkIn, t1.checkOut)
      ) a
        ON a.userId = u.id
      WHERE u.username = 'employee'
  `);
  console.log("Roster query:", roster);
  process.exit(0);
}
run();