/**
 * @module attendance.service
 * Core attendance business logic — checkIn, checkOut, timesheet.
 * This layer is role-agnostic; RBAC is enforced at the controller level.
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
 * @property {number|null} accuracy - GPS accuracy in meters
 * @property {string|null} locationSource - 'gps' | 'ip' | 'manual'
 * @property {string|null} countryCode - ISO 3166-1 alpha-2
 * @property {string|null} note
 * @property {string|null} deviceId
 * @property {number|null} tzOffset - Timezone offset in minutes
 */

/**
 * @typedef {Object} CheckInResult
 * @property {number} id - Attendance record ID
 * @property {number} userId
 * @property {string} checkIn - JST timestamp (YYYY-MM-DD HH:mm:ss)
 * @property {string[]} labels - Anomaly labels (e.g. 'low_accuracy', 'out_of_jp')
 * @property {string|null} workType - 'onsite' | 'remote' | 'satellite' | null
 */

/**
 * @typedef {Object} CheckOutResult
 * @property {number} id - Attendance record ID
 * @property {number} userId
 * @property {string|null} checkIn - JST timestamp or null (if missing_checkin)
 * @property {string} checkOut - JST timestamp
 * @property {string[]} labels - Anomaly labels
 * @property {string} [anomaly_type] - 'missing_checkin' if auto-created
 */

/**
 * @typedef {Object} TimesheetResult
 * @property {Object[]} days - Array of daily attendance records with computed metrics
 * @property {Object} total - Aggregated totals (regularMinutes, overtimeMinutes, nightMinutes)
 */

/**
 * Calculate the great-circle distance between two coordinates using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
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
 * Compute anomaly labels for a check-in event based on location flags.
 * @param {Object} flags - System settings (minAccuracyMeters, countryWhitelist)
 * @param {GeoLocation} loc
 * @returns {string[]} Array of anomaly labels
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
 * Compute anomaly labels for a check-out event (travel speed checks).
 * @param {Object} open - The open attendance record (with checkIn, in_latitude, in_longitude)
 * @param {string} tsJST - Check-out timestamp in JST
 * @param {GeoLocation} loc
 * @returns {string[]} Array of anomaly labels
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
 * Record employee check-in.
 * @param {number} userId
 * @param {string|number|null} time - ISO timestamp or epoch ms (null = now)
 * @param {GeoLocation} loc - Geolocation data
 * @param {string} [workType] - 'onsite' | 'remote' | 'satellite'
 * @returns {Promise<CheckInResult|null>} null if already checked in (duplicate)
 */
async function checkIn(userId, time, loc, workType) {
  const flags = await settingsService.getFlags();
  const ts = time ? formatInputToMySQLJST(time) : nowJSTMySQL();
  const labels = computeLabelsForCheckIn(flags, loc);
  const wt = String(workType || '').trim();
  const resolvedWorkType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : null;
  const id = await repo.createCheckInTx(userId, ts, loc, labels.join(','), resolvedWorkType);
  if (!id) {
    return null;
  }
  return { id, userId, checkIn: ts, labels, workType: resolvedWorkType };
}

/**
 * Record employee check-out. If no open check-in exists, creates a missing_checkin record.
 * @param {number} userId
 * @param {string|number|null} time - ISO timestamp or epoch ms (null = now)
 * @param {GeoLocation} loc - Geolocation data
 * @returns {Promise<CheckOutResult>}
 */
async function checkOut(userId, time, loc) {
  const open = await repo.getOpenAttendanceForUser(userId);
  const ts = time ? formatInputToMySQLJST(time) : nowJSTMySQL();
  if (!open) {
    const labels = [];
    if (loc?.accuracy != null && Number(loc.accuracy) > 100) labels.push('low_accuracy');
    const id = await repo.createMissingCheckIn(userId, ts, loc, labels.join(','), 'missing_checkin');
    return { id, userId, checkIn: null, checkOut: ts, labels, anomaly_type: 'missing_checkin' };
  }
  const labels = computeLabelsForCheckOut(open, ts, loc);
  await repo.setCheckOut(open.id, ts, loc, labels.join(','));
  return { id: open.id, userId, checkIn: open.checkIn, checkOut: ts, labels };
}

/**
 * Get attendance timesheet for a user within a date range.
 * @param {number} userId
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<TimesheetResult>}
 */
async function timesheet(userId, fromDate, toDate) {
  const rows = await repo.listByUserBetween(userId, fromDate, toDate);
  const res = await rules.computeRange(rows);
  return res;
}

module.exports = { checkIn, checkOut, timesheet };
