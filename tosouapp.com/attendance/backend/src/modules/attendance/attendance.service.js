/**
 * @module attendance.service
 * Logic nghiệp vụ chấm công — checkIn, checkOut, timesheet.
 * Lớp này không phụ thuộc vai trò; phân quyền (RBAC) được xử lý ở lớp controller.
 */
'use strict';

const repo = require('./attendance.repository');
const settingsService = require('../settings/settings.service');
const { nowUTCMySQL, formatInputToMySQLUTC, nowJSTMySQL, formatInputToMySQLJST, parseMySQLUTCToDate, parseMySQLJSTToDate } = require('../../utils/dateTime');
const rules = require('./attendance.rules');

/**
 * @typedef {Object} GeoLocation
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} accuracy - Độ chính xác GPS (mét)
 * @property {string|null} locationSource - 'gps' | 'ip' | 'manual'
 * @property {string|null} countryCode - ISO 3166-1 alpha-2
 * @property {string|null} note
 * @property {string|null} deviceId
 * @property {number|null} tzOffset - Chênh lệch múi giờ (phút)
 */

/**
 * @typedef {Object} CheckInResult
 * @property {number} id - ID bản ghi chấm công
 * @property {number} userId
 * @property {string} checkIn - Thời điểm theo JST (YYYY-MM-DD HH:mm:ss)
 * @property {string[]} labels - Nhãn bất thường (vd: 'low_accuracy', 'out_of_jp')
 * @property {string|null} workType - 'onsite' | 'remote' | 'satellite' | null
 */

/**
 * @typedef {Object} CheckOutResult
 * @property {number} id - ID bản ghi chấm công
 * @property {number} userId
 * @property {string|null} checkIn - Thời điểm JST hoặc null (nếu thiếu check-in)
 * @property {string} checkOut - Thời điểm theo JST
 * @property {string[]} labels - Nhãn bất thường
 * @property {string} [anomaly_type] - 'missing_checkin' nếu bản ghi tự tạo
 */

/**
 * @typedef {Object} TimesheetResult
 * @property {Object[]} days - Mảng bản ghi chấm công từng ngày kèm số liệu đã tính
 * @property {Object} total - Tổng cộng (regularMinutes, overtimeMinutes, nightMinutes)
 */

/**
 * Tính khoảng cách đường tròn lớn giữa hai tọa độ bằng công thức Haversine.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Khoảng cách (km)
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad((lat2 ?? 0) - (lat1 ?? 0));
  const dLon = toRad((lon2 ?? 0) - (lon1 ?? 0));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1 ?? 0)) * Math.cos(toRad(lat2 ?? 0)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Tính nhãn bất thường cho sự kiện check-in dựa trên cờ vị trí.
 * @param {Object} flags - Cấu hình hệ thống (minAccuracyMeters, countryWhitelist)
 * @param {GeoLocation} loc
 * @returns {string[]} Mảng nhãn bất thường
 */
function computeLabelsForCheckIn(flags, loc) {
  const labels = [];
  if (loc?.accuracy != null && Number(loc.accuracy) > Number(flags.minAccuracyMeters || 100)) labels.push('low_accuracy');
  const cw = String(flags.countryWhitelist || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const cc = String(loc?.countryCode || '').toUpperCase();
  if (cc && cc !== 'JP' && !cw.includes(cc)) labels.push('out_of_jp');
  if (String(loc?.locationSource || '') === 'ip') labels.push('ip_fallback');
  return labels;
}

/**
 * Tính nhãn bất thường cho sự kiện check-out (kiểm tra tốc độ di chuyển).
 * @param {Object} open - Bản ghi chấm công đang mở (có checkIn, in_latitude, in_longitude)
 * @param {string} tsJST - Thời điểm check-out theo JST
 * @param {GeoLocation} loc
 * @returns {string[]} Mảng nhãn bất thường
 */
function computeLabelsForCheckOut(open, tsJST, loc) {
  const labels = [];
  const inDate = parseMySQLJSTToDate(open.checkIn);
  const outDate = parseMySQLJSTToDate(tsJST);
  const minutes = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 60000));
  const km = haversineKm(open.in_latitude, open.in_longitude, loc?.latitude, loc?.longitude);
  if (km > 300 && minutes < 120) labels.push('fast_travel');
  if (km > 900 && minutes < 180) labels.push('impossible_travel');
  return labels;
}

/**
 * Ghi nhận check-in của nhân viên.
 * @param {number} userId
 * @param {string|number|null} time - Thời điểm ISO hoặc epoch ms (null = bây giờ)
 * @param {GeoLocation} loc - Dữ liệu vị trí
 * @param {string} [workType] - 'onsite' | 'remote' | 'satellite'
 * @returns {Promise<CheckInResult|null>} null nếu đã check-in rồi (trùng)
 */
async function checkIn(userId, time, loc, workType, tenantId = null) {
  const flags = await settingsService.getFlags();
  const ts = time ? formatInputToMySQLJST(time) : nowJSTMySQL();
  const labels = computeLabelsForCheckIn(flags, loc);
  const wt = String(workType || '').trim();
  const resolvedWorkType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : null;
  const id = await repo.createCheckInTx(userId, ts, loc, labels.join(','), resolvedWorkType, { tenantId });
  if (!id) {
    return null;
  }
  return { id, userId, checkIn: ts, labels, workType: resolvedWorkType };
}

/**
 * Ghi nhận check-out của nhân viên. Nếu không có check-in đang mở thì tạo bản ghi missing_checkin.
 * @param {number} userId
 * @param {string|number|null} time - Thời điểm ISO hoặc epoch ms (null = bây giờ)
 * @param {GeoLocation} loc - Dữ liệu vị trí
 * @returns {Promise<CheckOutResult>}
 */
async function checkOut(userId, time, loc, tenantId = null) {
  const open = await repo.getOpenAttendanceForUser(userId, { tenantId });
  const ts = time ? formatInputToMySQLJST(time) : nowJSTMySQL();
  if (!open) {
    const labels = [];
    if (loc?.accuracy != null && Number(loc.accuracy) > 100) labels.push('low_accuracy');
    const id = await repo.createMissingCheckIn(userId, ts, loc, labels.join(','), 'missing_checkin', { tenantId });
    return { id, userId, checkIn: null, checkOut: ts, labels, anomaly_type: 'missing_checkin' };
  }
  const labels = computeLabelsForCheckOut(open, ts, loc);
  await repo.setCheckOut(open.id, ts, loc, labels.join(','), { tenantId });
  return { id: open.id, userId, checkIn: open.checkIn, checkOut: ts, labels };
}

/**
 * Lấy bảng chấm công của nhân viên trong khoảng thời gian.
 * @param {number} userId
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<TimesheetResult>}
 */
async function timesheet(userId, fromDate, toDate, tenantId = null) {
  const rows = await repo.listByUserBetween(userId, fromDate, toDate, { tenantId });
  const res = await rules.computeRange(rows);
  return res;
}

module.exports = { checkIn, checkOut, timesheet };
