'use strict';
/**
 * leave.access.js
 * Dùng chung giữa leave.controller.js và các export (xlsx/csv/pdf):
 * Manager chỉ được xem/xuất dữ liệu của nhân viên cùng chi nhánh (branch_id) với mình.
 * Nếu manager chưa được gán chi nhánh (branch_id NULL), giữ hành vi cũ (xem toàn tenant).
 */
const userRepo = require('../users/user.repository');

async function resolveManagerBranchScope(req) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'manager') return null;
  try {
    const me = await userRepo.getUserById(req.user.id, req.tenantId || null);
    const bId = me?.branch_id != null ? Number(me.branch_id) : null;
    return Number.isFinite(bId) ? bId : null;
  } catch (e) {
    return null;
  }
}

module.exports = { resolveManagerBranchScope };
