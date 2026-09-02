/**
 * @file attendance.monthview.controller.js
 * @description Xử lý API lấy timesheet tháng dạng gọn.
 *
 * API trong file này:
 *   - getMonth → Lấy timesheet tháng (tổng hợp giờ làm, dùng cho widget/summary)
 *
 * Tách riêng:
 *   attendance.monthdetail.controller.js → getMonthDetail (chi tiết đầy đủ từng ngày)
 *
 * Kết nối:
 *   attendance.service.js    → service.timesheet() tính toán giờ làm
 *   attendance.utils.js      → resolveTargetUserId, getMonthStatusValue
 */
'use strict';

// Import phụ thuộc
const service = require('./attendance.service'); // Tính toán timesheet
const {
  resolveTargetUserId, // Kiểm tra RBAC: ai được xem của ai
  getMonthStatusValue, // Lấy trạng thái tháng (draft/submitted/approved)
} = require('./attendance.utils');

// ─── API: Lấy timesheet tháng dạng gọn ──────────────────────────────────────
// GET /api/attendance/month?year=&month=
// Dùng cho widget tổng hợp, không trả về từng ngày đầy đủ
exports.getMonth = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.query || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const pad = n => String(n).padStart(2, '0');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    let to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const role   = String(req.user?.role || '').toLowerCase();
    const status = await getMonthStatusValue(userId, y, m);
    // Payroll chỉ xem được tháng đã approved
    if (role === 'payroll' && status !== 'approved') {
      return res.status(403).json({ message: 'Forbidden: month is not closed' });
    }
    // Giới hạn "to" không vượt quá hôm nay nếu chưa approved
    try {
      const todayStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      if (role !== 'payroll' && status !== 'approved') {
        if (todayStr < from) to = from;
        else if (to > todayStr) to = todayStr;
      }
    } catch (e) { /* bỏ qua */ }
    const result = await service.timesheet(userId, from, to);
    res.status(200).json({ ...result, monthStatus: { status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// getMonthDetail đã được tách sang file riêng để giữ file này dưới 200 dòng.
// Re-export để attendance.controller.js không cần thay đổi.
exports.getMonthDetail = require('./attendance.monthdetail.controller').getMonthDetail;
