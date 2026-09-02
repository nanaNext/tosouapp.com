/**
 * @module attendance.utils
 * Các hàm dùng chung cho các controller con của attendance.
 * Không có logic request/response HTTP ở đây — chỉ là tiện ích nghiệp vụ tái sử dụng.
 */
'use strict';

const metrics = require('../../core/metrics');
const log = require('../../core/logger');
const repo = require('./attendance.repository');
const leaveRepo = require('../leave/leave.repository');
const userRepo = require('../users/user.repository');
const calendarRepo = require('../calendar/calendar.repository');

// ─── Theo dõi hiệu năng ───────────────────────────────────────────────────────

/**
 * Ghi số liệu hiệu năng của endpoint và cảnh báo khi phản hồi chậm.
 * @param {string} endpoint - Định danh endpoint
 * @param {number} startedAt - Date.now() lúc bắt đầu request
 * @param {Object} [meta] - Dữ liệu bổ sung
 */
function recordEndpointPerf(endpoint, startedAt, meta = {}) {
  const durationMs = Date.now() - startedAt;
  try {
    metrics.observe(`${endpoint}_duration_ms`, durationMs);
    if (durationMs >= 100) metrics.inc(`${endpoint}_slow_count`, 1);
  } catch (e) {
    log.warn('metrics_error', { endpoint, error_message: e.message });
  }
  if (durationMs >= 100) {
    log.warn('slow_endpoint', { endpoint, duration_ms: durationMs, ...meta });
  }
}

// ─── Đồng bộ nghỉ phép / kubun ───────────────────────────────────────────────

async function ensurePaidLeaveRequestForDate(userId, date, reason = 'from_attendance') {
  try {
    const ds = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
    const existed = await leaveRepo.findExactRequest({
      userId, startDate: ds, endDate: ds, type: 'paid', statuses: ['pending', 'approved']
    });
    if (existed) return;
    await leaveRepo.create({ userId, startDate: ds, endDate: ds, type: 'paid', reason });
  } catch (e) {
    log.warn('ensure_paid_leave_error', { userId, date, error_message: e.message });
  }
}

async function syncPaidLeaveByKubun(userId, date, kubun, reason = 'from_attendance') {
  try {
    const ds = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
    const k = String(kubun || '').trim();
    if (k === '有給休暇') {
      await ensurePaidLeaveRequestForDate(userId, ds, reason);
      return;
    }
    if (k === '半休(有給)') {
      const existed = await leaveRepo.findExactRequest({
        userId, startDate: ds, endDate: ds, type: 'paid_half', statuses: ['pending', 'approved']
      });
      if (!existed) {
        await leaveRepo.create({ userId, startDate: ds, endDate: ds, type: 'paid_half', reason: reason || 'half_day_paid' });
      }
      return;
    }
    await leaveRepo.cancelOwnPaidByDate(userId, ds);
  } catch (e) {
    log.warn('sync_paid_leave_error', { userId, date, kubun, error_message: e.message });
  }
}

// ─── Hàm hỗ trợ phân quyền ───────────────────────────────────────────────────

/**
 * Xác định userId đích cho request hiện tại, áp dụng quy tắc phân quyền.
 * - Employee: luôn trả về ID của chính mình
 * - Manager: chỉ được thao tác với employee (role='employee')
 * - Admin: được thao tác với bất kỳ ai
 * @param {import('express').Request} req
 * @returns {Promise<number|string|null>} userId, '__forbidden__', hoặc null
 */
async function resolveTargetUserId(req) {
  const role = String(req.user?.role || '').toLowerCase();
  const meId = req.user?.id;
  const raw = (req.query?.userId ?? req.body?.userId ?? null);
  const targetId = raw == null || raw === '' ? meId : parseInt(String(raw), 10);
  if (!meId || !targetId) return null;
  if (role === 'employee') return meId;
  if (role === 'manager' && String(targetId) !== String(meId)) {
    const target = await userRepo.getUserById(targetId);
    if (!target) return null;
    if (String(target.role || '').toLowerCase() !== 'employee') {
      return '__forbidden__';
    }
    const strictDept = String(process.env.MANAGER_STRICT_DEPT || '').toLowerCase() === 'true';
    if (strictDept) {
      const me = await userRepo.getUserById(meId);
      if (me?.departmentId && target?.departmentId && String(me.departmentId) !== String(target.departmentId)) {
        return '__forbidden__';
      }
    }
  }
  return targetId;
}

// ─── Hàm hỗ trợ theo tháng ───────────────────────────────────────────────────

function parseMonth(s) {
  const [y, m] = String(s).split('-');
  const yy = parseInt(y, 10), mm = parseInt(m, 10);
  if (!yy || !mm || mm < 1 || mm > 12) return null;
  return { y: yy, m: mm };
}

function isEditableMonth(y, m) {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const cy = now.getUTCFullYear();
  const cm = now.getUTCMonth() + 1;
  const idx = Number(y) * 12 + Number(m);
  const cidx = cy * 12 + cm;
  return idx === cidx || idx === cidx + 1;
}

async function getMonthStatusValue(userId, year, month) {
  try {
    const r = await repo.getMonthStatus(userId, year, month);
    const st = String(r?.status || '').trim();
    return st || 'draft';
  } catch {
    return 'draft';
  }
}

async function assertMonthWritable(req, targetUserId, year, month) {
  const role = String(req.user?.role || '').toLowerCase();
  const y = parseInt(String(year), 10);
  const m = parseInt(String(month), 10);
  if (role === 'employee' && !isEditableMonth(y, m)) {
    const e = new Error('Forbidden: employees can only edit current month');
    e.status = 403;
    throw e;
  }
  const st = await getMonthStatusValue(targetUserId, y, m);
  if (st === 'approved') {
    const e = new Error('Locked: month is closed');
    e.status = 423;
    throw e;
  }
  if (st === 'submitted' && role === 'payroll') {
    const e = new Error('Locked: month is submitted');
    e.status = 423;
    throw e;
  }
}

// ─── Hàm hỗ trợ lịch / bộ phận công trình ────────────────────────────────────

const HOLIDAY_TYPES = new Set(['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge']);

async function isKoujiUser(userId) {
  try {
    const u = await userRepo.getUserById(userId);
    if (!u) return false;
    if (String(u?.employment_type || '').toLowerCase() === 'part_time') return false;
    const dept = u?.departmentId ? (await userRepo.getDepartmentById(u.departmentId)) : null;
    const deptName = String(dept?.name || '').trim();
    return deptName.includes('工事部');
  } catch {
    return false;
  }
}

function buildOffSetFromCalendarDetail(detail, useKoujiPolicy) {
  const byDate = new Map();
  for (const it of (Array.isArray(detail) ? detail : [])) {
    const ds = String(it?.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
    if (!byDate.has(ds)) byDate.set(ds, []);
    byDate.get(ds).push({ type: String(it?.type || ''), is_off: Number(it?.is_off || 0) === 1 });
  }
  const off = new Set();
  for (const [ds, list] of byDate.entries()) {
    if (!useKoujiPolicy) {
      if (list.some(x => x.is_off)) off.add(ds);
      continue;
    }
    const hasSunday = list.some(x => x.is_off && x.type === 'sunday');
    const has4thSaturday = list.some(x => x.is_off && x.type === 'saturday_4th');
    const hasHoliday = list.some(x => x.is_off && HOLIDAY_TYPES.has(x.type));
    if (hasSunday || has4thSaturday || hasHoliday) off.add(ds);
  }
  return { byDate, off };
}

/**
 * Dựng tập ngày nghỉ cho một năm + userId,
 * theo chính sách bộ phận công trình và ngày nghỉ riêng của từng bộ phận.
 * Nguồn duy nhất — thay cho 3 bản trùng lặp ở các controller daily/month/export.
 * @param {number} year
 * @param {number} userId
 * @returns {Promise<Set<string>>}
 */
async function getUserOffDaySet(year, userId) {
  const cal = await calendarRepo.computeYear(year).catch(() => null);
  const useKoujiPolicy = await isKoujiUser(userId);
  const { off } = buildOffSetFromCalendarDetail(cal?.detail || [], useKoujiPolicy);
  if (!off.size && Array.isArray(cal?.off_days) && !useKoujiPolicy) {
    for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
  }
  try {
    const user = await userRepo.getUserById(userId).catch(() => null);
    const deptId = user?.departmentId || user?.department_id;
    if (deptId) {
      const deptHolidayRepo = require('../holidays/holidays.repository');
      const deptHolidays = await deptHolidayRepo.listByDepartmentAndYear(deptId, year);
      for (const h of (deptHolidays || [])) {
        if (h.is_off) off.add(String(h.date).slice(0, 10));
      }
    }
  } catch (e) { /* không có ngày nghỉ theo bộ phận, bỏ qua */ }
  return off;
}

module.exports = {
  recordEndpointPerf,
  ensurePaidLeaveRequestForDate,
  syncPaidLeaveByKubun,
  resolveTargetUserId,
  parseMonth,
  isEditableMonth,
  getMonthStatusValue,
  assertMonthWritable,
  HOLIDAY_TYPES,
  isKoujiUser,
  buildOffSetFromCalendarDetail,
  getUserOffDaySet,
};
