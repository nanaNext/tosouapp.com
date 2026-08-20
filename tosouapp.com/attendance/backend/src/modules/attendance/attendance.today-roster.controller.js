/**
 * @file attendance.today-roster.controller.js
 * @description Xử lý API danh sách điểm danh toàn bộ nhân viên hôm nay (今日の出勤一覧).
 *
 * API trong file này:
 *   - todayRoster → Trả về trạng thái từng nhân viên trong ngày:
 *                   checked_out / working / checkout_missing / not_checked_in /
 *                   not_punched / off / leave / unregistered
 *
 * Logic ưu tiên (theo thứ tự):
 *   1. Dữ liệu punch thực tế (check-in/out)
 *   2. Kubun nghỉ đã set (有給休暇, 休日...)
 *   3. Lịch shift đăng ký (WORKING / OFF / LEAVE)
 *   4. Lịch nghỉ công ty theo bộ phận (工事部 có rule riêng)
 *
 * Kết nối:
 *   attendance.repository.js    → getTodayRosterItems, getTodayPlannedItems, batchGetActive...
 *   calendar.repository.js      → isOff (kiểm tra ngày nghỉ công ty)
 *   attendance.utils.js         → recordEndpointPerf (đo tốc độ)
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const repo         = require('./attendance.repository');            // Truy vấn DB chấm công
const calendarRepo = require('../calendar/calendar.repository');    // Kiểm tra ngày nghỉ
const { recordEndpointPerf } = require('./attendance.utils');       // Đo performance

// ─── API: Danh sách điểm danh toàn bộ nhân viên hôm nay ──────────────────────
// GET /api/attendance/today-roster?date=YYYY-MM-DD  (admin/manager)
// Trả về 2 mảng: items (trạng thái thực) + planned (kế hoạch shift)
exports.todayRoster = async (req, res) => {
  const startedAt = Date.now();
  let itemsCount = 0, plannedCount = 0;
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Xác định ngày cần xem (mặc định: hôm nay theo giờ JST)
    const qDate = String(req.query?.date || '').slice(0, 10);
    const date  = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)
      ? qDate
      : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

    // Lấy danh sách nhân viên + trạng thái chấm công từ DB
    const rows = await repo.getTodayRosterItems(date, req.tenantId || null);

    // Tính thứ trong tuần để xác định ngày nghỉ (thứ 7 tuần 4 = nghỉ đối với 工事部)
    const [dY, dM, dD] = date.split('-').map(n => parseInt(n, 10));
    const dow          = new Date(Date.UTC(dY, dM - 1, dD)).getUTCDay();
    const is4thSaturday = dow === 6 && Math.ceil(dD / 7) === 4;
    let isCompanyHoliday = false;
    try { isCompanyHoliday = await calendarRepo.isOff(date); } catch { /* bỏ qua nếu lỗi */ }

    const todayJST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const isPastDay = date < todayJST; // Ngày đã qua → hiển thị trạng thái "quên" thay vì "chưa đến"

    // ─── Xác định trạng thái từng nhân viên ───────────────────────────────────
    const holidayKubuns = new Set(['休日', '代替休日', '休み']);
    const leaveKubuns   = new Set(['有給休暇', '無給休暇', '欠勤']);
    const workKubuns    = new Set(['出勤', '半休', '半休(有給)', '休日出勤', '代替出勤', '振替出勤']);

    let items = (rows || []).map(r => {
      const hasIn        = !!r.checkIn;
      const hasOut       = !!r.checkOut;
      const kubun        = String(r.dailyKubun    || '').trim();
      const isPartTime   = String(r.employmentType || '').toLowerCase() === 'part_time';
      const shiftStatus  = String(r.shiftStatus   || '').trim();
      const shiftLeaveType = String(r.shiftLeaveType || '').trim();
      let status, displayKubun = kubun;

      // Ưu tiên 1: dữ liệu punch thực tế
      if (hasIn && hasOut)       { status = 'checked_out'; }
      else if (hasIn && !hasOut) { status = isPastDay ? 'checkout_missing' : 'working'; }
      // Ưu tiên 2: kubun nghỉ đã được set thủ công
      else if (holidayKubuns.has(kubun)) { status = 'off';   displayKubun = kubun; }
      else if (leaveKubuns.has(kubun))   { status = 'leave'; displayKubun = kubun; }
      // Ưu tiên 3: lịch shift đăng ký
      else if (shiftStatus === 'OFF') {
        status = 'off'; displayKubun = displayKubun || '休日';
      } else if (shiftStatus === 'LEAVE') {
        status = 'leave';
        if (shiftLeaveType === 'paid')   displayKubun = displayKubun || '有給休暇';
        else if (shiftLeaveType === 'unpaid') displayKubun = displayKubun || '欠勤';
        else displayKubun = displayKubun || '休暇';
      } else if (shiftStatus === 'WORKING' || workKubuns.has(kubun)) {
        status = isPastDay ? 'not_punched' : 'not_checked_in';
      // Ưu tiên 4: không có dữ liệu → xét lịch nghỉ theo loại nhân viên + bộ phận
      } else {
        const isKoujibu = String(r.departmentName || '').includes('工事');
        // 工事部: chỉ nghỉ CN + thứ 7 tuần 4 + ngày lễ công ty
        // Các bộ phận khác: nghỉ T7, CN + ngày lễ công ty
        const isOff = isPartTime ? true
          : isKoujibu ? (dow === 0 || is4thSaturday || isCompanyHoliday)
          : (dow === 0 || dow === 6 || isCompanyHoliday);
        if (isPartTime || isOff) {
          status = 'off';
          displayKubun = displayKubun || (isPastDay ? '休日' : '休日予定');
        } else {
          status = isPastDay ? 'not_punched' : 'not_checked_in';
        }
      }

      const hideTime = status === 'off' || status === 'leave' || status === 'unregistered';
      return {
        userId:         r.userId,
        employeeCode:   r.employeeCode   || null,
        username:       r.username       || null,
        employmentType: r.employmentType || null,
        departmentId:   r.departmentId   || null,
        departmentName: r.departmentName || null,
        role:           r.role           || null,
        dailyKubun:     displayKubun     || null,
        shiftStatus:    shiftStatus      || null,
        attendance: {
          id:       r.attendanceId || null,
          shiftId:  r.shiftId      || null,
          checkIn:  hideTime ? null : (r.checkIn  || null),
          checkOut: hideTime ? null : (r.checkOut || null),
          site:     r.site         || null,
          work:     r.work         || null,
        },
        status,
      };
    });

    // Manager chỉ thấy employee, không thấy manager khác
    if (role === 'manager') {
      items = items.filter(i => String(i.role || '').toLowerCase() === 'employee');
    }
    // Employee không được thấy admin/manager
    if (role === 'employee' || role === 'staff') {
      items = items.filter(i => {
        const r = String(i.role || '').toLowerCase();
        return r !== 'admin' && r !== 'manager' && r !== 'owner' && r !== 'sysadmin';
      });
    }
    itemsCount = items.length;

    // ─── Lấy kế hoạch shift (planned) ────────────────────────────────────────
    const plannedBase = await repo.getTodayPlannedItems(date, req.tenantId || null);
    let dayIsOff = false;
    try { dayIsOff = await calendarRepo.isOff(date); } catch { /* bỏ qua */ }

    // Batch-load shift assignments + definitions để tránh N+1 query
    const plannedUserIds = (plannedBase || []).map(r => r.userId).filter(Boolean);
    let assignmentMap = new Map(), shiftDefMap = new Map();
    try {
      [assignmentMap, shiftDefMap] = await Promise.all([
        repo.batchGetActiveAssignments(plannedUserIds, date, { tenantId: req.tenantId || null }),
        repo.batchGetAllShiftDefinitions({ tenantId: req.tenantId || null }),
      ]);
    } catch (e) { /* fallback về empty map, non-critical */ }

    const planned = [];
    for (const r of plannedBase || []) {
      let shift = null;
      try {
        const assign = assignmentMap.get(r.userId) || null;
        // Tìm shift definition theo ID → tên → shiftId trong row (theo thứ tự ưu tiên)
        const defFromId   = assign?.shiftId ? (shiftDefMap.get(assign.shiftId) || await repo.getShiftById(assign.shiftId)) : null;
        const defFromName = (!defFromId && assign?.shift) ? await repo.getShiftByName(assign.shift) : null;
        const defFromRow  = (!defFromId && !defFromName && r.shiftId)
          ? (shiftDefMap.get(r.shiftId) || await repo.getShiftById(r.shiftId).catch(() => null))
          : null;
        const def = defFromId || defFromName || defFromRow;
        if (def) shift = { id: def.id, name: def.name, start_time: def.start_time, end_time: def.end_time, break_minutes: def.break_minutes };
      } catch (e) { /* non-critical, bỏ qua lỗi shift lookup */ }
      planned.push({
        userId:        r.userId,
        employeeCode:  r.employeeCode  || null,
        username:      r.username      || null,
        role:          r.role          || null,
        departmentId:  r.departmentId  || null,
        departmentName: r.departmentName || null,
        planned: {
          status:    Number(r.isLeave || 0) ? 'leave' : (dayIsOff ? 'off' : 'work'),
          leaveType: r.leaveType || null,
          shift,
        },
      });
    }

    let filteredPlanned = planned;
    if (role === 'manager') {
      filteredPlanned = planned.filter(p => String(p.role || '').toLowerCase() === 'employee');
    }
    plannedCount = filteredPlanned.length;

    res.status(200).json({ date, items, planned: filteredPlanned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    // Đo và log performance (warn nếu > 100ms)
    recordEndpointPerf('attendance_today_roster', startedAt, {
      userId: req.user?.id || null,
      items:  itemsCount,
      planned: plannedCount,
    });
  }
};
