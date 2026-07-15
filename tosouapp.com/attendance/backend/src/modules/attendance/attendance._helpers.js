/**
 * Shared helpers used across all attendance sub-controllers.
 * Extracted from attendance.controller.js for maintainability.
 * @module attendance._helpers
 */
'use strict';

const service = require('./attendance.service');
const auditRepo = require('../audit/audit.repository');
const rules = require('./attendance.rules');
const repo = require('./attendance.repository');
const { formatInputToMySQLJST } = require('../../utils/dateTime');
const userRepo = require('../users/user.repository');
const workReportRepo = require('../workReports/workReports.repository');
const salaryInputRepo = require('../salary/salaryInput.repository');
const { calculatePaidLeaveEntitlement } = require('../../utils/leaveRules');
const { resolveEmploymentStartDate } = require('../../utils/employmentDate');
const leaveRepo = require('../leave/leave.repository');
const noticesRepo = require('../notices/notices.repository');
const metrics = require('../../core/metrics');
const db = require('../../core/database/mysql');
const calendarRepo = require('../calendar/calendar.repository');
const shiftReminderService = require('../../services/shiftReminder.service');
const log = require('../../core/logger');

// ─── Performance tracking ─────────────────────────────────────────────────────

/**
 * Record endpoint performance metrics and warn on slow responses.
 * @param {string} endpoint - Endpoint identifier
 * @param {number} startedAt - Date.now() when request started
 * @param {Object} [meta] - Additional metadata
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

// ─── Leave / Kubun sync ───────────────────────────────────────────────────────

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
    await leaveRepo.cancelOwnPaidByDate(userId, ds);
  } catch (e) {
    log.warn('sync_paid_leave_error', { userId, date, kubun, error_message: e.message });
  }
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve the target userId for the current request, enforcing RBAC rules.
 * - Employee: always returns own ID
 * - Manager: only allowed to target employees (role='employee')
 * - Admin: can target anyone
 * @param {import('express').Request} req
 * @returns {Promise<number|string|null>} userId, '__forbidden__', or null
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
      if (!me?.departmentId || !target?.departmentId || String(me.departmentId) !== String(target.departmentId)) {
        return '__forbidden__';
      }
    }
  }
  return targetId;
}

// ─── Month helpers ────────────────────────────────────────────────────────────

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

// ─── Calendar / Kouji helpers ─────────────────────────────────────────────────

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

module.exports = {
  // Dependencies (re-exported for sub-controllers)
  service, auditRepo, rules, repo, formatInputToMySQLJST, userRepo,
  workReportRepo, salaryInputRepo, calculatePaidLeaveEntitlement,
  resolveEmploymentStartDate, leaveRepo, noticesRepo, metrics, db,
  calendarRepo, shiftReminderService, log,
  // Helpers
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
  buildOffSetFromCalendarDetail
};
