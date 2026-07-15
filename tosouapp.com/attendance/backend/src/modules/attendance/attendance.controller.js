/**
 * @module attendance.controller
 * Re-export hub — delegates to sub-controllers for maintainability.
 *
 * Sub-controllers:
 *   attendance.checkin.controller.js  — checkIn, checkOut, recordGoOut, recordReturn, setWorkType
 *   attendance.roster.controller.js   — userProfileForMonthly, timesheet, gpsLog, syncOffline, statusToday, todaySummary, todayRoster
 *   attendance.month.controller.js    — getMonthStatus, getMonthStatusBulk, submitMonth, getMonthMissing, approveReadyMonth, approveMonth, unlockMonth, getMonthSummary, putMonthSummary
 *   attendance.daily.controller.js    — getGoOutHistory, admin go-out CRUD, getDay, getDaily, putDaily, putDay, addSegment, deleteSegment, submitDay, getMonth, getMonthDetail
 *   attendance.shifts.controller.js   — shift definitions/assignments/bulk/matrix/export/approval, work-details, putMonthBulk, syncSalary, putPlan, exportCsv, exportMonthXlsx
 */
'use strict';

const checkinCtrl = require('./attendance.checkin.controller');
const rosterCtrl = require('./attendance.roster.controller');
const monthCtrl = require('./attendance.month.controller');
const dailyCtrl = require('./attendance.daily.controller');
const shiftsCtrl = require('./attendance.shifts.controller');

// ─── Checkin group ────────────────────────────────────────────────────────────
exports.checkIn = checkinCtrl.checkIn;
exports.checkOut = checkinCtrl.checkOut;
exports.recordGoOut = checkinCtrl.recordGoOut;
exports.recordReturn = checkinCtrl.recordReturn;
exports.setWorkType = checkinCtrl.setWorkType;

// ─── Roster / Timesheet group ─────────────────────────────────────────────────
exports.userProfileForMonthly = rosterCtrl.userProfileForMonthly;
exports.timesheet = rosterCtrl.timesheet;
exports.gpsLog = rosterCtrl.gpsLog;
exports.syncOffline = rosterCtrl.syncOffline;
exports.statusToday = rosterCtrl.statusToday;
exports.todaySummary = rosterCtrl.todaySummary;
exports.todayRoster = rosterCtrl.todayRoster;

// ─── Month status group ───────────────────────────────────────────────────────
exports.getMonthStatus = monthCtrl.getMonthStatus;
exports.getMonthStatusBulk = monthCtrl.getMonthStatusBulk;
exports.submitMonth = monthCtrl.submitMonth;
exports.getMonthMissing = monthCtrl.getMonthMissing;
exports.approveReadyMonth = monthCtrl.approveReadyMonth;
exports.approveMonth = monthCtrl.approveMonth;
exports.unlockMonth = monthCtrl.unlockMonth;
exports.getMonthSummary = monthCtrl.getMonthSummary;
exports.putMonthSummary = monthCtrl.putMonthSummary;

// ─── Daily / Segments group ───────────────────────────────────────────────────
exports.getGoOutHistory = dailyCtrl.getGoOutHistory;
exports.adminListGoOutRecords = dailyCtrl.adminListGoOutRecords;
exports.adminForceEndGoOut = dailyCtrl.adminForceEndGoOut;
exports.adminUpdateGoOut = dailyCtrl.adminUpdateGoOut;
exports.adminDeleteGoOut = dailyCtrl.adminDeleteGoOut;
exports.getDay = dailyCtrl.getDay;
exports.getDaily = dailyCtrl.getDaily;
exports.putDaily = dailyCtrl.putDaily;
exports.putDay = dailyCtrl.putDay;
exports.addSegment = dailyCtrl.addSegment;
exports.deleteSegment = dailyCtrl.deleteSegment;
exports.submitDay = dailyCtrl.submitDay;
exports.getMonth = dailyCtrl.getMonth;
exports.getMonthDetail = dailyCtrl.getMonthDetail;

// ─── Shifts / Assignments / Export group ──────────────────────────────────────
exports.listShiftDefinitions = shiftsCtrl.listShiftDefinitions;
exports.postShiftDefinition = shiftsCtrl.postShiftDefinition;
exports.deleteShiftDefinition = shiftsCtrl.deleteShiftDefinition;
exports.getShiftAssignments = shiftsCtrl.getShiftAssignments;
exports.postShiftAssignment = shiftsCtrl.postShiftAssignment;
exports.postShiftsBulk = shiftsCtrl.postShiftsBulk;
exports.getShiftApprovals = shiftsCtrl.getShiftApprovals;
exports.getShiftMatrix = shiftsCtrl.getShiftMatrix;
exports.getAllEmployeeShifts = shiftsCtrl.getAllEmployeeShifts;
exports.exportAllEmployeeShiftsExcel = shiftsCtrl.exportAllEmployeeShiftsExcel;
exports.approveShiftMonth = shiftsCtrl.approveShiftMonth;
exports.getUserShiftsForMonth = shiftsCtrl.getUserShiftsForMonth;
exports.getMyMonthlyShifts = shiftsCtrl.getMyMonthlyShifts;
exports.deleteShiftAssignment = shiftsCtrl.deleteShiftAssignment;
exports.getWorkDetails = shiftsCtrl.getWorkDetails;
exports.postWorkDetail = shiftsCtrl.postWorkDetail;
exports.putWorkDetail = shiftsCtrl.putWorkDetail;
exports.deleteWorkDetail = shiftsCtrl.deleteWorkDetail;
exports.putMonthBulk = shiftsCtrl.putMonthBulk;
exports.syncSalary = shiftsCtrl.syncSalary;
exports.putPlan = shiftsCtrl.putPlan;
exports.exportCsv = shiftsCtrl.exportCsv;
exports.exportMonthXlsx = shiftsCtrl.exportMonthXlsx;
