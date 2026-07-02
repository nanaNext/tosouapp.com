const mysql = require('mysql2/promise');
async function run() {
  const date = '2026-07-01';
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'1234567',database:'attendance_db'});
  const [rows] = await conn.query(`
      SELECT
        u.id AS userId,
        u.employee_code AS employeeCode,
        u.username AS username,
        u.departmentId AS departmentId,
        d.name AS departmentName,
        u.role AS role,
        u.employment_type AS employment_type,
        a.id AS attendanceId,
        a.checkIn AS checkIn,
        a.checkOut AS checkOut,
        COALESCE(ad.work_type, wr.work_type, a.work_type) AS work_type,
        ad.kubun AS daily_kubun,
        COALESCE(NULLIF(TRIM(a.location), ''), NULLIF(TRIM(ad.location), ''), NULLIF(TRIM(wr.site), '')) AS site,
        COALESCE(NULLIF(TRIM(a.memo), ''), NULLIF(TRIM(ad.memo), ''), NULLIF(TRIM(wr.work), '')) AS work,
        ad.late_minutes,
        ad.early_minutes,
        ad.reason,
        wr.updated_at AS updated_at
      FROM users u
      LEFT JOIN departments d
        ON d.id = u.departmentId
      LEFT JOIN attendance_daily ad
        ON ad.userId = u.id
       AND ad.date = ?
      LEFT JOIN attendance a
        ON a.userId = u.id AND DATE(COALESCE(a.checkIn, a.checkOut)) = ?
      LEFT JOIN work_reports wr
        ON wr.userId = u.id AND wr.date = ?
      WHERE u.employment_status = 'active'
        AND u.username = 'employee'
      ORDER BY
        CASE WHEN a.checkIn IS NULL THEN 1 ELSE 0 END ASC,
        COALESCE(u.employee_code, '') ASC,
        u.id ASC,
        a.checkIn ASC
    `, [date, date, date]);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();