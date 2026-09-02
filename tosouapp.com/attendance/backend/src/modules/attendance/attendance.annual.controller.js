/**
 * @file attendance.annual.controller.js
 * @description Xử lý các API tổng hợp năm: báo cáo tuân thủ 36協定 và ma trận thực tế làm việc.
 *
 * Các API trong file này:
 *   - getAnnualSummary  → Tổng hợp giờ tăng ca năm, kiểm tra 36協定, số dư phép năm (有給休暇)
 *   - getReportMatrix   → Ma trận chấm công thực tế (tất cả nhân viên × ngày trong tháng)
 *
 * Kết nối:
 *   core/database/mysql      → Query trực tiếp bảng attendance, attendance_daily
 *   leave.controller.js      → Lấy thông tin số dư phép năm (ensureUserGrants)
 *   leave.repository.js      → Đọc dữ liệu nghỉ phép đã duyệt
 *   users/user.repository.js → Lấy ngày vào làm (hire_date) để tính quyền phép
 *   utils/leaveRules.js      → Tính số ngày phép được cấp (calculatePaidLeaveEntitlement)
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const db       = require('../../core/database/mysql');  // Query DB trực tiếp
const userRepo = require('../users/user.repository');   // Lấy thông tin nhân viên

// Hằng số 36協定 (Luật lao động Nhật Bản)
const STANDARD_DAY_MIN   = 480; // Giờ làm chuẩn: 8h = 480 phút/ngày
const ANNUAL_OT_LIMIT    = 720 * 60; // Giới hạn tăng ca năm: 720 giờ
const MONTHLY_OT_45H     = 45 * 60;  // Ngưỡng cảnh báo: 45h/tháng
const MAX_MONTHS_OVER_45 = 6;        // Tối đa 6 tháng/năm được vượt 45h
const MONTHLY_OT_100H    = 100 * 60; // Giới hạn tháng: 100h
const ROLLING_OT_80H     = 80 * 60;  // Giới hạn trung bình trượt: 80h

// ─── Helper: Tính phút tăng ca từ bản ghi attendance ─────────────────────────
function calcOTMinutes(rows) {
  const monthlyOT = {};
  for (const row of (rows || [])) {
    const monthKey = String(row.work_date || '').slice(0, 7);
    if (!monthKey) continue;
    if (!monthlyOT[monthKey]) monthlyOT[monthKey] = 0;
    const cin  = new Date(row.checkIn);
    const cout = new Date(row.checkOut);
    if (isNaN(cin.getTime()) || isNaN(cout.getTime())) continue;
    const workedMin = Math.max(0, (cout - cin) / 60000);
    const breakMin  = Number(row.break_minutes || 60);
    const netWorked = Math.max(0, workedMin - breakMin);
    monthlyOT[monthKey] += Math.max(0, netWorked - STANDARD_DAY_MIN);
  }
  return monthlyOT;
}

// ─── Helper: Format phút → "H:MM" ────────────────────────────────────────────
function fmtHm(min) {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ─── API: Tổng hợp giờ tăng ca năm + kiểm tra 36協定 ─────────────────────────
// GET /api/attendance/annual-summary?year=2026
// Trả về: tổng OT năm, số tháng vượt 45h, trung bình trượt 2-6 tháng, số dư phép năm
exports.getAnnualSummary = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    let userId = req.user?.id;
    // Admin/manager có thể xem của người khác
    if (req.query.userId && (role === 'admin' || role === 'manager')) {
      userId = parseInt(req.query.userId, 10) || userId;
    }
    const year = parseInt(req.query.year || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 4), 10);
    if (!userId || !year) return res.status(400).json({ message: 'Missing userId or year' });
    // 1. Lấy dữ liệu chấm công cả năm
    const [rows] = await db.query(`
      SELECT DATE(a.checkIn) as work_date, a.checkIn, a.checkOut,
             COALESCE(d.break_minutes, 60) as break_minutes
      FROM attendance a
      LEFT JOIN attendance_daily d ON d.userId = a.userId AND d.date = DATE(a.checkIn)
      WHERE a.userId = ? AND DATE(a.checkIn) BETWEEN ? AND ? AND a.checkOut IS NOT NULL
      ORDER BY a.checkIn ASC
    `, [userId, `${year}-01-01`, `${year}-12-31`]);
    // Khởi tạo tất cả 12 tháng = 0 để tránh undefined
    const monthlyOT = {};
    for (let m = 1; m <= 12; m++) monthlyOT[`${year}-${String(m).padStart(2, '0')}`] = 0;
    Object.assign(monthlyOT, calcOTMinutes(rows));
    // 2. Tính các chỉ số 36協定
    const annualOTMinutes  = Object.values(monthlyOT).reduce((s, v) => s + v, 0);
    const monthsOver45     = Object.values(monthlyOT).filter(v => v > MONTHLY_OT_45H).length;
    const maxSingleMonthOT = Math.max(...Object.values(monthlyOT), 0);
    // 3. Trung bình trượt 2-6 tháng gần nhất (cần cả data năm trước nếu cần)
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const recentMonths = [];
    let d = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 6; i++) {
      recentMonths.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      d.setMonth(d.getMonth() - 1);
    }
    // Lấy thêm data năm trước nếu 6 tháng gần nhất trải qua 2 năm
    let prevYearOT = {};
    const prevYear = year - 1;
    if (recentMonths.some(m => m.startsWith(String(prevYear)))) {
      const [prevRows] = await db.query(`
        SELECT DATE(a.checkIn) as work_date, a.checkIn, a.checkOut,
               COALESCE(d.break_minutes, 60) as break_minutes
        FROM attendance a
        LEFT JOIN attendance_daily d ON d.userId = a.userId AND d.date = DATE(a.checkIn)
        WHERE a.userId = ? AND DATE(a.checkIn) BETWEEN ? AND ? AND a.checkOut IS NOT NULL
      `, [userId, `${prevYear}-01-01`, `${prevYear}-12-31`]);
      prevYearOT = calcOTMinutes(prevRows);
    }
    const getOT = mk => monthlyOT[mk] ?? prevYearOT[mk] ?? 0;
    const rollingAverages = {};
    for (let n = 2; n <= 6; n++) {
      const slice = recentMonths.slice(recentMonths.length - n);
      const total = slice.reduce((s, mk) => s + getOT(mk), 0);
      const avg   = Math.round(total / n);
      rollingAverages[`${n}months`] = { totalMinutes: total, averageMinutes: avg, exceeds80h: avg > ROLLING_OT_80H };
    }
    // 4. Số dư phép năm (有給休暇)
    let paidLeaveInfo = { grantDate: null, usedSinceGrant: 0, remaining: 0, totalGranted: 0 };
    try {
      const leaveController = require('../leave/leave.controller');
      const balance = await leaveController.ensureUserGrants(userId);
      if (balance?.length > 0) {
        const latest     = balance[balance.length - 1];
        const grantDate  = latest.grantDate ? String(latest.grantDate).slice(0, 10) : null;
        const totalGranted = Number(latest.daysGranted || 0);
        let usedDays = 0;
        if (grantDate) {
          const [kubunRows] = await db.query(
            `SELECT COUNT(*) as cnt FROM attendance_daily WHERE userId = ? AND kubun = '有給休暇' AND date >= ?`,
            [userId, grantDate]
          );
          usedDays = Number(kubunRows?.[0]?.cnt || 0);
          const [approvedRows] = await db.query(
            `SELECT startDate, endDate FROM leave_requests WHERE userId = ? AND type = 'paid' AND status = 'approved' AND startDate >= ?`,
            [userId, grantDate]
          );
          let approvedDays = 0;
          for (const r of (approvedRows || [])) {
            const s = new Date(String(r.startDate).slice(0, 10));
            const e = new Date(String(r.endDate).slice(0, 10));
            if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
              approvedDays += Math.max(1, Math.round((e - s) / 86400000) + 1);
            }
          }
          usedDays = Math.max(usedDays, approvedDays);
        }
        paidLeaveInfo = { grantDate, totalGranted, usedSinceGrant: usedDays, remaining: Math.max(0, totalGranted - usedDays) };
      } else {
        // Chưa có grant → kiểm tra đủ 6 tháng thâm niên chưa
        const u = await userRepo.getUserById(userId);
        const hireDate = u?.hire_date ? String(u.hire_date).slice(0, 10) : null;
        if (hireDate) {
          const monthsSince = (Date.now() - new Date(hireDate + 'T00:00:00Z').getTime()) / (30.44 * 24 * 60 * 60 * 1000);
          if (monthsSince >= 6) {
            const [kubunRows] = await db.query(
              `SELECT COUNT(*) as cnt FROM attendance_daily WHERE userId = ? AND kubun = '有給休暇' AND date >= ?`,
              [userId, hireDate]
            );
            const usedDays = Number(kubunRows?.[0]?.cnt || 0);
            const { calculatePaidLeaveEntitlement } = require('../../utils/leaveRules');
            let entitled = 10;
            try { entitled = calculatePaidLeaveEntitlement(hireDate) || 10; } catch (e) { /* dùng giá trị mặc định */ }
            paidLeaveInfo = { grantDate: hireDate, totalGranted: entitled, usedSinceGrant: usedDays, remaining: Math.max(0, entitled - usedDays) };
          }
        }
      }
    } catch (e) {
      console.error('[annual-summary] leave error:', e.message);
    }
    res.json({
      year, userId,
      annualOvertime: { totalMinutes: annualOTMinutes, totalFormatted: fmtHm(annualOTMinutes), limitMinutes: ANNUAL_OT_LIMIT, limitFormatted: '720:00', exceeds: annualOTMinutes > ANNUAL_OT_LIMIT },
      monthsOver45h:  { count: monthsOver45, limit: MAX_MONTHS_OVER_45, exceeds: monthsOver45 > MAX_MONTHS_OVER_45 },
      singleMonthMax: { maxMinutes: maxSingleMonthOT, maxFormatted: fmtHm(maxSingleMonthOT), exceeds100h: maxSingleMonthOT > MONTHLY_OT_100H },
      recentMonths: recentMonths.map(mk => ({ month: mk, minutes: getOT(mk), formatted: fmtHm(getOT(mk)) })),
      rollingAverages,
      paidLeave: paidLeaveInfo,
    });
  } catch (err) {
    console.error('[annual-summary]', err.message);
    res.status(500).json({ message: err.message });
  }
};

// getReportMatrix đã được tách sang file riêng để giữ file này dưới 200 dòng.
// Re-export để attendance.controller.js không cần thay đổi.
exports.getReportMatrix = require('./attendance.report-matrix.controller').getReportMatrix;
