const db = require('./src/core/database/mysql');

async function run() {
  try {
    const today = '2026-06-24';
    const [rows] = await db.query(`
      SELECT
        u.id AS userId,
        a.id AS attendanceId,
        a.checkIn AS checkIn,
        a.checkOut AS checkOut,
        ad.kubun AS daily_kubun,
        ad.location AS daily_location,
        ad.memo AS daily_memo,
        wr.site AS wr_site,
        wr.work AS wr_work
      FROM users u
      LEFT JOIN attendance_daily ad
        ON ad.userId = u.id AND ad.date = ?
      LEFT JOIN (
        SELECT t1.*
        FROM attendance t1
        INNER JOIN (
          SELECT userId, MAX(COALESCE(checkIn, checkOut)) AS maxTime
          FROM attendance
          WHERE DATE(COALESCE(checkIn, checkOut)) = ?
          GROUP BY userId
        ) t2 ON t2.userId = t1.userId AND t2.maxTime = COALESCE(t1.checkIn, t1.checkOut)
      ) a ON a.userId = u.id
      LEFT JOIN work_reports wr
        ON wr.userId = u.id AND wr.date = ?
      WHERE u.id = 27
    `, [today, today, today]);

    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
