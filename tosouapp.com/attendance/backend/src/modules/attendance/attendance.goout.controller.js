/**
 * @file attendance.goout.controller.js
 * @description Xử lý các API liên quan đến ra ngoài (外出) trong giờ làm việc.
 *
 * Các API trong file này:
 *   - getGoOutHistory     → Lấy lịch sử ra ngoài của nhân viên theo ngày
 *   - adminListGoOutRecords  → Admin/manager xem danh sách ra ngoài (có filter)
 *   - adminForceEndGoOut  → Admin kết thúc ép 1 bản ghi đang mở
 *   - adminUpdateGoOut    → Admin chỉnh sửa thông tin ra ngoài
 *   - adminDeleteGoOut    → Admin xóa bản ghi ra ngoài
 *
 * Kết nối:
 *   attendance.repository.js → Các hàm getGoOutRecords, adminListGoOutRecords, adminForceEndGoOut...
 *   attendance.utils.js      → resolveTargetUserId (kiểm tra RBAC)
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const repo = require('./attendance.repository'); // Truy vấn DB bản ghi ra ngoài
const { resolveTargetUserId } = require('./attendance.utils'); // Kiểm tra quyền truy cập

// ─── API: Lịch sử ra ngoài của nhân viên theo ngày ───────────────────────────
// GET /api/attendance/date/:date/go-out
exports.getGoOutHistory = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { date } = req.params;
    if (!userId || !date) return res.status(400).json({ message: 'Missing userId/date' });
    const result = await repo.getGoOutRecords(userId, date, { tenantId: req.tenantId || null });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Admin xem danh sách tất cả bản ghi ra ngoài (có filter) ────────────
// GET /api/attendance/go-out/admin-list
exports.adminListGoOutRecords = async (req, res) => {
  try {
    const records = await repo.adminListGoOutRecords({
      userId:   req.query.userId || null,
      date:     req.query.date   || null,
      month:    req.query.month  || null,
      status:   req.query.status || null,
      type:     req.query.type   || null,
      tenantId: req.tenantId     || null,
    });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Admin ép kết thúc 1 bản ghi ra ngoài đang mở ──────────────────────
// PUT /api/attendance/go-out/admin/:id/force-end
exports.adminForceEndGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnTime, adminNote } = req.body;
    if (!id || !returnTime) return res.status(400).json({ message: 'Missing parameters' });
    const updated = await repo.adminForceEndGoOut(
      id, returnTime, '完了', adminNote || '管理者により修正',
      { tenantId: req.tenantId || null }
    );
    res.status(200).json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Admin chỉnh sửa thông tin bản ghi ra ngoài ─────────────────────────
// PUT /api/attendance/go-out/admin/:id
exports.adminUpdateGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { goOutTime, returnTime, type, reason, adminNote } = req.body;
    if (!id || !goOutTime || !type) return res.status(400).json({ message: 'Missing parameters' });
    const updated = await repo.adminUpdateGoOut(
      id, goOutTime, returnTime, type, reason, adminNote,
      { tenantId: req.tenantId || null }
    );
    res.status(200).json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Admin xóa bản ghi ra ngoài ─────────────────────────────────────────
// DELETE /api/attendance/go-out/admin/:id
exports.adminDeleteGoOut = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const deleted = await repo.adminDeleteGoOut(id, { tenantId: req.tenantId || null });
    res.status(200).json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
