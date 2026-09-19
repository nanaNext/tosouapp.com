'use strict';

// Điểm tra cứu duy nhất cho câu hỏi "nhân viên X thuộc phòng ban nào vào ngày Y" —
// 勤怠・交通費・給与 đều phải gọi vào đây thay vì tự đọc users.departmentId, để không lệch nhau.

const repo = require('./department.repository');
const userRepo = require('../users/user.repository');

function _pad(n) { return String(n).padStart(2, '0'); }

function _lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function _resolveFromRows(rows, dateStr) {
  const temp = rows.find(r => r.assignment_type === 'temporary_support' && r.start_date <= dateStr && (!r.end_date || r.end_date >= dateStr));
  if (temp) return temp.department_id;
  const regular = rows.find(r => r.assignment_type === 'regular' && r.start_date <= dateStr && (!r.end_date || r.end_date >= dateStr));
  return regular ? regular.department_id : null;
}

// Nhân viên chưa từng có bản ghi 異動 (dữ liệu cũ trước khi có tính năng này) ->
// coi như luôn thuộc phòng ban hiện tại của họ, giữ đúng hành vi cũ, không trả về null tràn lan.
async function _fallbackToCurrentDepartment(userId, tenantId) {
  const user = await userRepo.getUserById(userId, tenantId).catch(() => null);
  return user?.departmentId ?? null;
}

async function getDepartmentAsOf(userId, dateStr, { tenantId = null } = {}) {
  const rows = await repo.listAssignmentsForUser(userId, tenantId);
  const resolved = _resolveFromRows(rows, dateStr);
  if (resolved != null) return resolved;
  return _fallbackToCurrentDepartment(userId, tenantId);
}

// Resolve nhiều (userId, dateStr) cùng lúc, chỉ query assignments 1 lần / user (tránh N+1 khi
// dùng cho báo cáo hàng loạt như 交通費 theo tháng).
async function getDepartmentAsOfBatch(pairs, { tenantId = null } = {}) {
  const byUser = new Map();
  for (const p of pairs) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, new Set());
    byUser.get(p.userId).add(p.dateStr);
  }
  const result = new Map(); // key `${userId}|${dateStr}` -> departmentId
  for (const [userId, dateSet] of byUser) {
    const rows = await repo.listAssignmentsForUser(userId, tenantId);
    let fallback;
    for (const dateStr of dateSet) {
      let deptId = _resolveFromRows(rows, dateStr);
      if (deptId == null) {
        if (fallback === undefined) fallback = await _fallbackToCurrentDepartment(userId, tenantId);
        deptId = fallback;
      }
      result.set(`${userId}|${dateStr}`, deptId);
    }
  }
  return result;
}

// Chia tỷ lệ theo số ngày trong tháng cho nhân viên có chuyển phòng giữa tháng (dùng cho lương,
// vốn tính gộp theo tháng thay vì theo ngày như chấm công/chi phí).
async function getDepartmentSplitsForMonth(userId, year, month, { tenantId = null } = {}) {
  const lastDay = _lastDayOfMonth(year, month);
  const rows = await repo.listAssignmentsForUser(userId, tenantId);
  const hasAnyAssignment = rows.length > 0;
  const totalsByDept = new Map();
  for (let day = 1; day <= lastDay; day++) {
    const ds = `${year}-${_pad(month)}-${_pad(day)}`;
    let deptId = hasAnyAssignment ? _resolveFromRows(rows, ds) : null;
    if (deptId == null && !hasAnyAssignment) {
      deptId = await _fallbackToCurrentDepartment(userId, tenantId);
    }
    if (deptId == null) continue;
    totalsByDept.set(deptId, (totalsByDept.get(deptId) || 0) + 1);
  }
  const totalDays = [...totalsByDept.values()].reduce((a, b) => a + b, 0);
  return [...totalsByDept.entries()].map(([departmentId, days]) => ({
    departmentId,
    days,
    ratio: totalDays ? days / totalDays : 0
  }));
}

async function getDepartmentNameAsOf(departmentId, dateStr, { tenantId = null } = {}) {
  if (departmentId == null) return { name: null, code: null };
  return repo.getDepartmentNameAsOf(departmentId, dateStr, tenantId);
}

// Danh sách userId thuộc phòng ban `departmentId` tại đúng ngày `dateStr` — dùng cho tab
// 部署別集計 (cột 当時) và để duyệt chấm công/chi phí hàng loạt theo phòng ban cho một tháng đã qua.
async function getUsersInDepartmentAsOf(departmentId, dateStr, { tenantId = null } = {}) {
  const rows = await repo.listAssignmentsAll({ tenantId });
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push(r);
  }
  const targetId = Number(departmentId);
  const userIds = [];
  for (const [userId, userRows] of byUser) {
    if (_resolveFromRows(userRows, dateStr) === targetId) userIds.push(userId);
  }
  // Nhân viên chưa từng có bản ghi 異動 nào -> vẫn tính theo phòng ban hiện tại (fallback nhất quán
  // với getDepartmentAsOf), nếu chưa nằm trong danh sách trên.
  const usersWithHistory = new Set(userIds);
  const allActive = await userRepo.listUsersPaged({ departmentId: targetId, limit: 5000, tenantId }).catch(() => ({ rows: [] }));
  for (const u of (allActive.rows || [])) {
    if (!byUser.has(u.id) && !usersWithHistory.has(u.id)) userIds.push(u.id);
  }
  return userIds;
}

module.exports = {
  getDepartmentAsOf,
  getDepartmentAsOfBatch,
  getDepartmentSplitsForMonth,
  getDepartmentNameAsOf,
  getUsersInDepartmentAsOf
};
