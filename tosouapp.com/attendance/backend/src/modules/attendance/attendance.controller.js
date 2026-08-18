/**
 * @file attendance.controller.js
 * @description Hub re-export — tập trung tất cả handlers từ các sub-controller.
 *
 * File này KHÔNG chứa logic, chỉ re-export để routes.js có 1 điểm import duy nhất.
 *
 * Sơ đồ kết nối:
 *   attendance.checkin.controller.js    → checkIn, checkOut, recordGoOut, recordReturn, setWorkType
 *   attendance.roster.controller.js     → userProfileForMonthly, timesheet, gpsLog, syncOffline,
 *                                         statusToday, todaySummary, todayRoster
 *   attendance.calendar.controller.js   → getCalendar, getCalendarDay, getCalendarWorkingDays
 *   attendance.annual.controller.js     → getAnnualSummary, getReportMatrix
 *   attendance.month.controller.js      → getMonthStatus, getMonthStatusBulk, submitMonth,
 *                                         getMonthMissing, approveReadyMonth, approveMonth,
 *                                         unlockMonth, getMonthSummary, putMonthSummary
 *   attendance.goout.controller.js      → getGoOutHistory, adminListGoOutRecords,
 *                                         adminForceEndGoOut, adminUpdateGoOut, adminDeleteGoOut
 *   attendance.day.controller.js        → getDay, getDaily, putDay, putDaily,
 *                                         addSegment, deleteSegment, submitDay
 *   attendance.monthview.controller.js  → getMonth, getMonthDetail
 *   attendance.shifts.controller.js     → shift definitions, assignments, bulk, matrix, approvals
 *   attendance.bulk.controller.js       → work-details CRUD, putMonthBulk, syncSalary, putPlan
 *   attendance.export.controller.js     → exportCsv, exportMonthXlsx, exportAllEmployeeShiftsExcel
 */
'use strict';

const checkinCtrl       = require('./attendance.checkin.controller');
const rosterCtrl        = require('./attendance.roster.controller');
const todayRosterCtrl   = require('./attendance.today-roster.controller');   // todayRoster (tách riêng)
const calendarCtrl      = require('./attendance.calendar.controller');
const annualCtrl        = require('./attendance.annual.controller');
const reportMatrixCtrl  = require('./attendance.report-matrix.controller');  // getReportMatrix (tách riêng)
const monthCtrl         = require('./attendance.month.controller');
const gooutCtrl         = require('./attendance.goout.controller');
const dayCtrl           = require('./attendance.day.controller');
const monthviewCtrl     = require('./attendance.monthview.controller');
const monthdetailCtrl   = require('./attendance.monthdetail.controller');     // getMonthDetail (tách riêng)
const shiftsCtrl        = require('./attendance.shifts.controller');
const bulkCtrl          = require('./attendance.bulk.controller');
const exportCtrl        = require('./attendance.export.controller');

// ─── Checkin ──────────────────────────────────────────────────────────────────
exports.checkIn       = checkinCtrl.checkIn;
exports.checkOut      = checkinCtrl.checkOut;
exports.recordGoOut   = checkinCtrl.recordGoOut;
exports.recordReturn  = checkinCtrl.recordReturn;
exports.setWorkType   = checkinCtrl.setWorkType;

// ─── Roster / Timesheet ───────────────────────────────────────────────────────
exports.userProfileForMonthly = rosterCtrl.userProfileForMonthly;
exports.timesheet              = rosterCtrl.timesheet;
exports.gpsLog                 = rosterCtrl.gpsLog;
exports.syncOffline            = rosterCtrl.syncOffline;
exports.statusToday            = rosterCtrl.statusToday;
exports.todaySummary           = rosterCtrl.todaySummary;
exports.todayRoster            = todayRosterCtrl.todayRoster;  // file riêng

// ─── Calendar ─────────────────────────────────────────────────────────────────
exports.getCalendar             = calendarCtrl.getCalendar;
exports.getCalendarDay          = calendarCtrl.getCalendarDay;
exports.getCalendarWorkingDays  = calendarCtrl.getCalendarWorkingDays;

// ─── Annual summary / Report matrix ──────────────────────────────────────────
exports.getAnnualSummary = annualCtrl.getAnnualSummary;
exports.getReportMatrix  = reportMatrixCtrl.getReportMatrix;  // file riêng

// ─── Month status ─────────────────────────────────────────────────────────────
exports.getMonthStatus     = monthCtrl.getMonthStatus;
exports.getMonthStatusBulk = monthCtrl.getMonthStatusBulk;
exports.submitMonth        = monthCtrl.submitMonth;
exports.getMonthMissing    = monthCtrl.getMonthMissing;
exports.approveReadyMonth  = monthCtrl.approveReadyMonth;
exports.approveMonth       = monthCtrl.approveMonth;
exports.unlockMonth        = monthCtrl.unlockMonth;
exports.getMonthSummary    = monthCtrl.getMonthSummary;
exports.putMonthSummary    = monthCtrl.putMonthSummary;

// ─── Go-out ───────────────────────────────────────────────────────────────────
exports.getGoOutHistory       = gooutCtrl.getGoOutHistory;
exports.adminListGoOutRecords = gooutCtrl.adminListGoOutRecords;
exports.adminForceEndGoOut    = gooutCtrl.adminForceEndGoOut;
exports.adminUpdateGoOut      = gooutCtrl.adminUpdateGoOut;
exports.adminDeleteGoOut      = gooutCtrl.adminDeleteGoOut;

// ─── Day / Daily / Segments ───────────────────────────────────────────────────
exports.getDay        = dayCtrl.getDay;
exports.getDaily      = dayCtrl.getDaily;
exports.putDaily      = dayCtrl.putDaily;
exports.putDay        = dayCtrl.putDay;
exports.addSegment    = dayCtrl.addSegment;
exports.deleteSegment = dayCtrl.deleteSegment;
exports.submitDay     = dayCtrl.submitDay;

// ─── Month view ───────────────────────────────────────────────────────────────
exports.getMonth       = monthviewCtrl.getMonth;
exports.getMonthDetail = monthdetailCtrl.getMonthDetail;  // file riêng

// ─── Shifts ───────────────────────────────────────────────────────────────────
exports.listShiftDefinitions    = shiftsCtrl.listShiftDefinitions;
exports.postShiftDefinition     = shiftsCtrl.postShiftDefinition;
exports.deleteShiftDefinition   = shiftsCtrl.deleteShiftDefinition;
exports.getShiftAssignments     = shiftsCtrl.getShiftAssignments;
exports.postShiftAssignment     = shiftsCtrl.postShiftAssignment;
exports.deleteShiftAssignment   = shiftsCtrl.deleteShiftAssignment;
exports.postShiftsBulk          = shiftsCtrl.postShiftsBulk;
exports.getShiftApprovals       = shiftsCtrl.getShiftApprovals;
exports.getShiftMatrix          = shiftsCtrl.getShiftMatrix;
exports.getAllEmployeeShifts     = shiftsCtrl.getAllEmployeeShifts;
exports.approveShiftMonth        = shiftsCtrl.approveShiftMonth;
exports.getUserShiftsForMonth   = shiftsCtrl.getUserShiftsForMonth;
exports.getMyMonthlyShifts      = shiftsCtrl.getMyMonthlyShifts;

// ─── Bulk / Work-details / Salary ─────────────────────────────────────────────
exports.getWorkDetails  = bulkCtrl.getWorkDetails;
exports.postWorkDetail  = bulkCtrl.postWorkDetail;
exports.putWorkDetail   = bulkCtrl.putWorkDetail;
exports.deleteWorkDetail = bulkCtrl.deleteWorkDetail;
exports.putMonthBulk    = bulkCtrl.putMonthBulk;
exports.syncSalary      = bulkCtrl.syncSalary;
exports.putPlan         = bulkCtrl.putPlan;

// ─── Export ───────────────────────────────────────────────────────────────────
exports.exportCsv                    = exportCtrl.exportCsv;
exports.exportMonthXlsx              = exportCtrl.exportMonthXlsx;
exports.exportAllEmployeeShiftsExcel = exportCtrl.exportAllEmployeeShiftsExcel;
