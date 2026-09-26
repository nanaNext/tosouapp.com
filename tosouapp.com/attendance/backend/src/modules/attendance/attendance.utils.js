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

async function ensurePaidLeaveRequestForDate(userId, date, reason = 'from_attendance', tenantId = null) {
  try {
    const ds = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
    const existed = await leaveRepo.findExactRequest({
      userId, startDate: ds, endDate: ds, type: 'paid', statuses: ['pending', 'approved'], tenantId
    });
    if (existed) return;
    await leaveRepo.create({ userId, startDate: ds, endDate: ds, type: 'paid', reason, tenantId });
  } catch (e) {
    log.warn('ensure_paid_leave_error', { userId, date, error_message: e.message });
  }
}

async function syncPaidLeaveByKubun(userId, date, kubun, reason = 'from_attendance', tenantId = null) {
  try {
    const ds = String(date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
    const k = String(kubun || '').trim();
    if (k === '有給休暇') {
      await ensurePaidLeaveRequestForDate(userId, ds, reason, tenantId);
      return;
    }
    if (k === '半休(有給)') {
      const existed = await leaveRepo.findExactRequest({
        userId, startDate: ds, endDate: ds, type: 'paid_half', statuses: ['pending', 'approved'], tenantId
      });
      if (!existed) {
        await leaveRepo.create({ userId, startDate: ds, endDate: ds, type: 'paid_half', reason: reason || 'half_day_paid', tenantId });
      }
      return;
    }
    await leaveRepo.cancelOwnPaidByDate(userId, ds, tenantId);
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
  const tid = req.tenantId || null;
  const raw = (req.query?.userId ?? req.body?.userId ?? null);
  const targetId = raw == null || raw === '' ? meId : parseInt(String(raw), 10);
  if (!meId || !targetId) return null;
  if (role === 'employee') return meId;
  if (String(targetId) !== String(meId)) {
    // Xác minh target thực sự tồn tại và thuộc đúng tenant — trước đây chỉ
    // manager mới gọi getUserById (và còn thiếu tenantId), nên admin có
    // thể target một userId thuộc tenant khác mà không bị chặn.
    const target = await userRepo.getUserById(targetId, tid);
    if (!target) return null;
    if (role === 'manager') {
      if (String(target.role || '').toLowerCase() !== 'employee') {
        return '__forbidden__';
      }
      const strictDept = String(process.env.MANAGER_STRICT_DEPT || '').toLowerCase() === 'true';
      if (strictDept) {
        const me = await userRepo.getUserById(meId, tid);
        if (me?.departmentId && target?.departmentId && String(me.departmentId) !== String(target.departmentId)) {
          return '__forbidden__';
        }
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

// 土曜ルールを休日Setに反映する。offWeeks: 休みにする週番号（第N土曜, 1〜5）。
// 祝日(jp_*)・会社休日(fixed, is_off)の土曜は休みのまま残す。
function applySaturdayRule(off, year, offWeeks, cal) {
  const holidays = new Set();
  for (const key of ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge']) {
    for (const h of (Array.isArray(cal?.[key]) ? cal[key] : [])) {
      if (key === 'jp_auto' || Number(h?.is_off) === 1 || h?.is_off === true) holidays.add(String(h.date).slice(0, 10));
    }
  }
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  for (; d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 7)) {
    const ds = d.toISOString().slice(0, 10);
    const week = Math.ceil(d.getUTCDate() / 7);
    if (offWeeks.has(week) || holidays.has(ds)) off.add(ds);
    else off.delete(ds);
  }
}

// 部署ID または 部署名 から、その部署の休日Setを組み立てる共通ヘルパー。
// 以前は「部署名に"工事部"を含むか」をあちこちでハードコードして特別扱いしていたが、
// 会社ごとに勤務パターンが異なりうるため、department_holidays (休日設定画面で会社ごとに
// 設定する) を唯一の情報源にする。ベース(祝日・全曜日の土日)に対して is_off=1 の行は追加、
// is_off=0 の行は除外（例:「工事部は第4土曜だけ休み」→他の土曜すべてに is_off=0 の行を作る）。
async function getDepartmentOffDaySet(year, { departmentId = null, departmentName = null, tenantId = 0 } = {}) {
  const cal = await calendarRepo.computeYear(year, tenantId || 0).catch(() => null);
  const off = new Set();
  if (Array.isArray(cal?.off_days)) {
    for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
  }
  try {
    let deptId = departmentId;
    if (!deptId && departmentName) {
      const db = require('../../core/database/mysql');
      const params = [departmentName];
      let tenantClause = '';
      if (tenantId) { tenantClause = 'AND tenant_id = ?'; params.push(tenantId); }
      const [[row]] = await db.query(`SELECT id FROM departments WHERE name = ? ${tenantClause} LIMIT 1`, params);
      deptId = row?.id || null;
    }
    if (deptId) {
      // 毎年自動の土曜ルール（例: 工事部は第4土曜のみ休み、他の土曜は出勤）。
      // 祝日・会社休日（お盆等）に当たる土曜は休みのまま。個別の休日設定(department_holidays)は下で上書きする。
      const deptRepo = require('../departments/department.repository');
      const offWeeks = await deptRepo.getSaturdayOffWeeks(deptId).catch(() => null);
      if (offWeeks) applySaturdayRule(off, year, offWeeks, cal);
      const deptHolidayRepo = require('../holidays/holidays.repository');
      const deptHolidays = await deptHolidayRepo.listByDepartmentAndYear(deptId, year, tenantId || null);
      for (const h of (deptHolidays || [])) {
        const ds = String(h.date).slice(0, 10);
        if (h.is_off) off.add(ds); else off.delete(ds);
      }
    }
  } catch (e) { /* không có ngày nghỉ theo bộ phận, bỏ qua */ }
  return off;
}

/**
 * Dựng tập ngày nghỉ cho một năm + userId,
 * theo chính sách bộ phận công trình và ngày nghỉ riêng của từng bộ phận.
 * Nguồn duy nhất — thay cho 3 bản trùng lặp ở các controller daily/month/export.
 * @param {number} year
 * @param {number} userId
 * @returns {Promise<Set<string>>}
 */
async function getUserOffDaySet(year, userId, tenantId = 0) {
  let departmentId = null;
  try {
    const user = await userRepo.getUserById(userId).catch(() => null);
    departmentId = user?.departmentId || user?.department_id || null;
  } catch (e) { /* không lấy được user, dùng lịch chung */ }
  return getDepartmentOffDaySet(year, { departmentId, tenantId });
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
  applySaturdayRule,
  getDepartmentOffDaySet,
  getUserOffDaySet,
};
