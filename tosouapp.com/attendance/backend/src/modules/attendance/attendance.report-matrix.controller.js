/**
 * @file attendance.report-matrix.controller.js
 * @description Xử lý API ma trận chấm công thực tế (実績表).
 *
 * API trong file này:
 *   - getReportMatrix → Ma trận tất cả nhân viên × từng ngày trong tháng.
 *                       Mỗi ô là: giờ check-in/out thực, giờ làm thực, giờ làm đã làm tròn.
 *
 * Quy tắc làm tròn giờ:
 *   - Giờ vào: nếu đến trước ca (08:00) → tính từ 08:00
 *   - Giờ OT:  làm tròn xuống theo bước 30 phút
 *
 * Kết nối:
 *   core/database/mysql → Query trực tiếp bảng users, attendance, attendance_daily
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const db = require('../../core/database/mysql'); // Query DB trực tiếp

// ─── Hằng số ca chuẩn ────────────────────────────────────────────────────────
const SHIFT_START = '08:00'; // Giờ bắt đầu ca chuẩn
const SHIFT_END   = '17:00'; // Giờ kết thúc ca chuẩn
const ROUND_STEP  = 30;      // Làm tròn OT theo bước 30 phút

// ─── Helper: chuyển "HH:MM" → số phút ────────────────────────────────────────
function toMin(hm) {
  if (!hm) return -1;
  const [h, m] = String(hm).split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

// ─── Helper: chuyển số phút → "HH:MM" ────────────────────────────────────────
function fromMin(mn) {
  return `${String(Math.floor(mn / 60)).padStart(2, '0')}:${String(mn % 60).padStart(2, '0')}`;
}

const shiftStartMin = toMin(SHIFT_START);
const shiftEndMin   = toMin(SHIFT_END);

// ─── API: Ma trận chấm công thực tế tất cả nhân viên trong tháng ─────────────
// GET /api/attendance/month/report-matrix?month=2026-03  (admin/manager)
// Trả về: mảng employees, mỗi phần tử có days[1..31] với giờ làm thực + đã làm tròn
exports.getReportMatrix = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Missing month (YYYY-MM)' });
    }
    const [y, m]  = month.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from    = `${month}-01`;
    const to      = `${month}-${String(lastDay).padStart(2, '0')}`;
    const tid = req.tenantId || null;

    // Lấy danh sách nhân viên đang hoạt động (không gồm admin/manager)
    // 工事部 hiển thị trước, sau đó sắp xếp theo employee_code
    let userSql = `
      SELECT u.id, u.username, u.employee_code, u.employment_type, d.name AS departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE u.employment_status = 'active' AND u.role NOT IN ('admin','manager')
    `;
    const userParams = [];
    if (tid != null) { userSql += ` AND u.tenant_id = ?`; userParams.push(tid); }
    userSql += ` ORDER BY CASE WHEN d.name LIKE '%工事%' THEN 1 ELSE 2 END, u.employee_code ASC, u.id ASC`;
    const [users] = await db.query(userSql, userParams);

    // Lấy tất cả bản ghi chấm công trong tháng
    let attSql = `
      SELECT userId, checkIn, checkOut FROM attendance
      WHERE (DATE(checkIn) BETWEEN ? AND ?)
         OR (checkIn IS NULL AND DATE(checkOut) BETWEEN ? AND ?)
    `;
    const attParams = [from, to, from, to];
    if (tid != null) { attSql += ` AND tenant_id = ?`; attParams.push(tid); }
    const [records] = await db.query(attSql, attParams);

    // Lấy break_minutes từ attendance_daily để tính giờ làm net
    let dailySql = `SELECT userId, date, break_minutes FROM attendance_daily WHERE date BETWEEN ? AND ?`;
    const dailyParams = [from, to];
    if (tid != null) { dailySql += ` AND tenant_id = ?`; dailyParams.push(tid); }
    const [dailyRows] = await db.query(dailySql, dailyParams);

    // Build lookup map: "userId_date" → [{checkIn, checkOut}]
    const attendanceMap = {};
    for (const r of records) {
      const key = `${r.userId}_${String(r.checkIn || r.checkOut || '').slice(0, 10)}`;
      if (!attendanceMap[key]) attendanceMap[key] = [];
      attendanceMap[key].push({ checkIn: r.checkIn, checkOut: r.checkOut });
    }

    // Build lookup map: "userId_date" → {break_minutes}
    const dailyMap = {};
    for (const r of dailyRows) {
      dailyMap[`${r.userId}_${String(r.date).slice(0, 10)}`] = r;
    }

    const days = Array.from({ length: lastDay }, (_, i) => i + 1);

    // Xây dựng ma trận: mỗi nhân viên × từng ngày trong tháng
    const matrix = users.map(u => {
      const row = {
        userId: u.id, username: u.username, employeeCode: u.employee_code,
        employmentType: u.employment_type, departmentName: u.departmentName,
        days: {}, totalHours: 0,
      };
      for (const d of days) {
        const dateStr = `${month}-${String(d).padStart(2, '0')}`;
        const atts    = attendanceMap[`${u.id}_${dateStr}`] || [];
        const daily   = dailyMap[`${u.id}_${dateStr}`]     || null;

        if (!atts.length) { row.days[d] = null; continue; }

        // Dùng segment đầu tiên (primary segment)
        const { checkIn, checkOut } = atts[0];
        const inHm  = checkIn  ? String(checkIn).slice(11, 16)  : null;
        const outHm = checkOut ? String(checkOut).slice(11, 16) : null;

        // Thiếu giờ vào hoặc ra → trả về null cho các giá trị tính toán
        if (!inHm || !outHm) {
          row.days[d] = { checkIn: inHm, checkOut: outHm, worked: null, roundedIn: null, roundedOut: null, roundedWorked: null };
          continue;
        }

        const inMin    = toMin(inHm);
        const outMin   = toMin(outHm);
        const breakMin = daily?.break_minutes != null ? Number(daily.break_minutes) : 60;
        const worked   = Math.max(0, outMin - inMin - breakMin); // Giờ làm thực (phút)

        // Tính giờ làm đã làm tròn:
        // - Vào trước ca → tính từ giờ ca bắt đầu
        // - OT sau ca → làm tròn xuống bước ROUND_STEP phút
        const rIn  = inMin < shiftStartMin ? shiftStartMin : inMin;
        const rOut = outMin > shiftEndMin
          ? shiftEndMin + Math.floor((outMin - shiftEndMin) / ROUND_STEP) * ROUND_STEP
          : outMin;
        const roundedWorked = Math.max(0, rOut - rIn - breakMin);

        row.days[d] = {
          checkIn:         inHm,
          checkOut:        outHm,
          worked:          worked / 60,          // giờ thực (số thập phân)
          workedMin:       worked,               // phút thực
          roundedIn:       fromMin(rIn),         // giờ vào đã làm tròn (HH:MM)
          roundedOut:      fromMin(rOut),        // giờ ra đã làm tròn (HH:MM)
          roundedWorked:   roundedWorked / 60,   // giờ làm đã làm tròn (số thập phân)
          roundedWorkedMin: roundedWorked,       // phút làm đã làm tròn
        };
        row.totalHours += worked / 60;
      }
      return row;
    });

    // Tổng hợp số người đi làm + tổng giờ theo từng ngày
    const dailySummary = {};
    for (const d of days) {
      let attendCount = 0, totalWorkedMin = 0;
      for (const row of matrix) {
        if (row.days[d]?.workedMin > 0) {
          attendCount++;
          totalWorkedMin += row.days[d].workedMin;
        }
      }
      dailySummary[d] = { attendCount, totalWorkedHours: totalWorkedMin / 60 };
    }

    res.status(200).json({
      month, year: y, lastDay, days,
      shiftStart:   SHIFT_START,
      shiftEnd:     SHIFT_END,
      roundingStep: ROUND_STEP,
      employees:    matrix,
      dailySummary,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
