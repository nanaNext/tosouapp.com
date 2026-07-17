'use strict';
const {
  service, auditRepo, rules, repo, formatInputToMySQLJST, userRepo,
  workReportRepo, salaryInputRepo, calculatePaidLeaveEntitlement,
  resolveEmploymentStartDate, leaveRepo, noticesRepo, metrics, db,
  calendarRepo, shiftReminderService, log,
  recordEndpointPerf, ensurePaidLeaveRequestForDate, syncPaidLeaveByKubun,
  resolveTargetUserId, parseMonth, isEditableMonth, getMonthStatusValue,
  assertMonthWritable, HOLIDAY_TYPES, isKoujiUser, buildOffSetFromCalendarDetail
} = require('./attendance._helpers');
const { timesheetMaxDays } = require('../../config/env');
const { nowJSTMySQL } = require('../../utils/dateTime');

// ─── Local helpers (used only in this module) ─────────────────────────────────

async function getUserOffDaySet(year, userId) {
  const cal = await calendarRepo.computeYear(year).catch(() => null);
  const useKoujiPolicy = await isKoujiUser(userId);
  const { off } = buildOffSetFromCalendarDetail(cal?.detail || [], useKoujiPolicy);
  if (!off.size && Array.isArray(cal?.off_days) && !useKoujiPolicy) {
    for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
  }
  return off;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.exportAllEmployeeShiftsExcel = async (req, res) => {
  try {
    const { year, month } = req.query || {};
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;

    // Branch-scoped access: manager sees own branch only, admin sees all
    const role = String(req.user?.role || '').toLowerCase();
    const userBranchId = req.user?.branchId || null;
    const branchFilter = (role === 'manager' && userBranchId) ? userBranchId : null;

    // Fetch active users (branch-filtered for managers)
    let userQuery = `
      SELECT u.id, u.username, u.email, u.employee_code, u.employment_type, d.name as departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE u.employment_status = 'active' AND u.role NOT IN ('admin', 'manager')
    `;
    const userParams = [];
    if (branchFilter) {
      userQuery += ` AND u.branch_id = ?`;
      userParams.push(branchFilter);
    }
    userQuery += ` ORDER BY CASE WHEN d.name = '工事部' THEN 1 ELSE 2 END, u.employee_code ASC, u.id ASC`;
    const [users] = await db.query(userQuery, userParams);

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Fetch shift requests for these users for the given month
    const userIds = users.map(u => u.id);
    const [shifts] = await db.query(`
      SELECT userId, date, status, leaveType
      FROM shift_requests
      WHERE userId IN (?) AND date LIKE ?
    `, [userIds, `${targetMonth}-%`]);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${year}年${month}月シフト`);
    
    // Calculate days in month
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    
    // Group users by department for summary
    const deptCounts = {};
    users.forEach(u => {
      const dept = u.departmentName || '未配属';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const deptSummary = Object.entries(deptCounts).map(([k, v]) => `${k}: ${v}名`).join('　');
    
    // Row 1: Company Name
    sheet.addRow([`飯塚塗研株式会社`]);
    // Row 2: Title + Month
    sheet.addRow([`全員のシフト状況 - ${year}年${month}月`]);
    // Row 3: Branch + Employee Count
    sheet.addRow([`総人数: ${users.length}名　　${deptSummary}`]);
    // Row 4: Empty spacer
    sheet.addRow([]);
    
    // Create header rows (Row 5 & 6)
    const headerRow1 = ['従業員名', '部署', '雇用形態'];
    const headerRow2 = ['', '', ''];
    
    for (let i = 1; i <= daysInMonth; i++) {
      headerRow1.push(`${i}`);
      const dateObj = new Date(y, m - 1, i);
      const dow = daysOfWeek[dateObj.getDay()];
      headerRow2.push(dow);
    }
    
    sheet.addRow(headerRow1);
    sheet.addRow(headerRow2);
    
    // Merge header rows across all columns
    const lastColLetter = sheet.getColumn(daysInMonth + 3).letter;
    sheet.mergeCells(`A1:${lastColLetter}1`);
    sheet.mergeCells(`A2:${lastColLetter}2`);
    sheet.mergeCells(`A3:${lastColLetter}3`);
    
    // Style Row 1: Company Name
    const companyRow = sheet.getRow(1);
    companyRow.height = 28;
    companyRow.font = { size: 14, bold: true, color: { argb: 'FF1E3A5F' } };
    companyRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Style Row 2: Title
    const titleRowObj = sheet.getRow(2);
    titleRowObj.height = 26;
    titleRowObj.font = { size: 13, bold: true, color: { argb: 'FF0F172A' } };
    titleRowObj.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Style Row 3: Summary
    const summaryRow = sheet.getRow(3);
    summaryRow.height = 20;
    summaryRow.font = { size: 11, color: { argb: 'FF475569' } };
    summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Merge the first 3 columns headers (rows 5-6)
    sheet.mergeCells('A5:A6');
    sheet.mergeCells('B5:B6');
    sheet.mergeCells('C5:C6');
    
    // Freeze panes for easy scrolling
    sheet.views = [
      { state: 'frozen', xSplit: 3, ySplit: 6 }
    ];
    
    // Style headers (rows 5 & 6)
    const titleRows = [sheet.getRow(5), sheet.getRow(6)];
    titleRows.forEach(row => {
      row.height = 20;
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: {style:'thin', color: {argb:'FFD1D5DB'}},
          left: {style:'thin', color: {argb:'FFD1D5DB'}},
          bottom: {style:'thin', color: {argb:'FFD1D5DB'}},
          right: {style:'thin', color: {argb:'FFD1D5DB'}}
        };
        
        // Color weekends in the day-of-week row (row 6)
        if (row.number === 6 && colNumber > 3) {
          const text = cell.value;
          if (text === '日') cell.font = { bold: true, color: { argb: 'FFFCA5A5' } };
          else if (text === '土') cell.font = { bold: true, color: { argb: 'FF93C5FD' } };
        }
      });
    });
    
    // Set column widths to match web table compact layout
    sheet.getColumn(1).width = 20; // 従業員名
    sheet.getColumn(2).width = 12; // 部署
    sheet.getColumn(3).width = 12; // 雇用形態
    for (let i = 4; i <= daysInMonth + 3; i++) {
      sheet.getColumn(i).width = 4.5; // Narrow width for days
    }
    
    // Page setup for printing
    sheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    };
    
    // Populate data
    users.forEach(u => {
      const isSeishain = u.employment_type === 'full_time' || u.employment_type === '正社員' || u.employment_type === '正';
      const typeStr = isSeishain ? '正' : 'パート';
      
      const rowData = [
        u.username || u.email,
        u.departmentName || '',
        typeStr
      ];
      
      const userShifts = shifts.filter(s => s.userId === u.id);
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${targetMonth}-${String(i).padStart(2, '0')}`;
        const shift = userShifts.find(s => s.date === dateStr);
        
        const dateObj = new Date(y, m - 1, i);
         const dow = dateObj.getDay();
         const isKoujibu = String(u.departmentName || '').includes('工事部');
         
         const isSeishain = u.employment_type === 'full_time' || u.employment_type === '正社員' || u.employment_type === '正';
         const is4thSaturday = dow === 6 && Math.ceil(dateObj.getDate() / 7) === 4;
         
         let cellText = '';
         let statusClass = '';
         
         // Đồng bộ logic ngày nghỉ như frontend (Không gọi được calendar API ở đây nên dùng logic chuẩn)
         let isWeekendOrHoliday = false;
         if (isKoujibu && isSeishain) {
           // 工事部 chính thức: Chỉ nghỉ CN + Thứ 7 tuần 4. Thứ 7 tuần 1,2,3,5 đi làm bình thường
           isWeekendOrHoliday = dow === 0 || is4thSaturday;
         } else if (isSeishain) {
           // 総務 chính thức: Nghỉ T7 + CN
           isWeekendOrHoliday = dow === 0 || dow === 6;
         } else {
           // Part-time: Không có ngày nghỉ cố định (dựa vào shift đăng ký)
           isWeekendOrHoliday = false;
         }
         
         if (shift && shift.status === 'LEAVE') {
          if (shift.leaveType === 'paid') {
            cellText = '有休';
            statusClass = 'paid';
          } else if (shift.leaveType === 'unpaid') {
            cellText = '欠';
            statusClass = 'unpaid';
          } else {
            cellText = '休';
            statusClass = 'holiday';
          }
        } else if (isWeekendOrHoliday && (!shift || shift.status !== 'WORKING')) {
          cellText = '休';
          statusClass = 'holiday';
        } else if (shift && shift.status === 'WORKING') {
          if (isWeekendOrHoliday) {
            cellText = '出';
            statusClass = 'holiday-work';
          } else {
            cellText = '出';
            statusClass = 'working';
          }
        } else if (shift && shift.status === 'OFF') {
          // Đăng ký nghỉ rõ ràng → hiển thị đỏ (休日)
          cellText = '休';
          statusClass = 'holiday';
        } else {
          // Không có shift đăng ký
          if (!isSeishain) {
            // Part-time chưa đăng ký → xám (未登録)
            cellText = '-';
            statusClass = 'empty';
          } else {
            // Chính thức: ngày thường mặc định đi làm
            cellText = '出';
            statusClass = 'working';
          }
        }
        
        rowData.push({ text: cellText, type: statusClass });
      }
      
      // Add row but only with text values
      const row = sheet.addRow(rowData.map(item => typeof item === 'object' ? item.text : item));
      row.height = 18; 
      
      // Style data cells with the exact same colors
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: {style:'thin', color: {argb:'FFE2E8F0'}},
          left: {style:'thin', color: {argb:'FFE2E8F0'}},
          bottom: {style:'thin', color: {argb:'FFE2E8F0'}},
          right: {style:'thin', color: {argb:'FFE2E8F0'}}
        };
        
        if (colNumber > 3) {
          const statusObj = rowData[colNumber - 1]; // -1 because colNumber is 1-based
          if (statusObj && typeof statusObj === 'object') {
            const type = statusObj.type;
            
            // Phục hồi lại chữ thật thay vì gạch ngang
            cell.value = statusObj.text; 
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            // Phối màu cho chữ và nền nhạt
            if (type === 'working') {
              cell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
              cell.fill = { type: 'pattern', pattern: 'none' };
            } else if (type === 'holiday') {
              cell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }; // Light red bg
            } else if (type === 'paid') {
              cell.font = { color: { argb: 'FFD97706' }, bold: true }; // Amber
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; // Light yellow bg
            } else if (type === 'unpaid') {
              cell.font = { color: { argb: 'FF9333EA' }, bold: true }; // Purple
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Light purple bg
            } else if (type === 'holiday-work') {
              cell.font = { color: { argb: 'FF0284C7' }, bold: true }; // Cyan/Blue
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }; // Light blue bg
            } else {
              cell.font = { color: { argb: 'FF94A3B8' } }; // Gray
              cell.fill = { type: 'pattern', pattern: 'none' };
            }
          }
        }
      });
    });
    
    // ─── Color Legend Section ─────────────────────────────────────────────
    // Add 2 empty rows as spacer
    sheet.addRow([]);
    sheet.addRow([]);
    
    // Legend title
    const legendTitleRow = sheet.addRow(['【凡例】色の説明']);
    legendTitleRow.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
    
    // Legend entries
    const legends = [
      { text: '出　（出勤日・通常勤務）', fontColor: 'FF16A34A', bgColor: null, desc: '緑文字' },
      { text: '休　（休日・会社カレンダー休日）', fontColor: 'FFDC2626', bgColor: 'FFFEF2F2', desc: '赤文字・薄赤背景' },
      { text: '有休（有給休暇）', fontColor: 'FFD97706', bgColor: 'FFFFFBEB', desc: '橙文字・薄黄背景' },
      { text: '欠　（欠勤・無給）', fontColor: 'FF9333EA', bgColor: 'FFF3E8FF', desc: '紫文字・薄紫背景' },
      { text: '出　（休日出勤）', fontColor: 'FF0284C7', bgColor: 'FFF0F9FF', desc: '青文字・薄青背景' },
    ];
    
    legends.forEach(legend => {
      const row = sheet.addRow(['', legend.text, '', legend.desc]);
      // Style the sample cell (column A) with the actual color
      const sampleCell = row.getCell(1);
      sampleCell.value = '■';
      sampleCell.font = { bold: true, color: { argb: legend.fontColor } };
      if (legend.bgColor) {
        sampleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: legend.bgColor } };
      }
      sampleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Style explanation text
      const textCell = row.getCell(2);
      textCell.font = { size: 10, color: { argb: 'FF334155' } };
      
      const descCell = row.getCell(4);
      descCell.font = { size: 10, color: { argb: 'FF64748B' }, italic: true };
    });
    
    // Add note about part-time
    sheet.addRow([]);
    const noteRow = sheet.addRow(['※ パート社員は固定休日なし。登録した日のみ「出勤」扱い。']);
    noteRow.font = { size: 10, color: { argb: 'FF64748B' } };
    
    // Set response headers
    const fileName = encodeURIComponent(`シフト_${year}年${month}月.xlsx`);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
    
    // Stream directly to response — avoids holding entire file in RAM
    await workbook.xlsx.write(res);
    res.end();
    
    // Auto-save export to R2 (background, non-blocking)
    try {
      const s3Service = require('../../core/services/s3.service');
      if (s3Service.isR2Configured()) {
        const buf = await workbook.xlsx.writeBuffer();
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const r2Key = `exports/excel/shifts/${ts}_${fileName}`;
        s3Service.uploadToR2(r2Key, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(e => {
          console.error('Failed to auto-save export to R2:', e);
        });
      }
    } catch (e) { /* R2 upload failure should not affect user */ }
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.exportCsv = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { from, to } = req.query || {};
    if (!userId || !from || !to) return res.status(400).json({ message: 'Missing from/to' });
    const r = await service.timesheet(userId, from, to);
    let csv = 'date,regularMinutes,overtimeMinutes,nightMinutes\n';
    for (const d of r.days) {
      csv += `${d.date},${d.regularMinutes},${d.overtimeMinutes},${d.nightMinutes}\n`;
    }
    
    const buf = Buffer.from('\uFEFF' + csv, 'utf8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"timesheet.csv\"');
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Xuất dữ liệu chấm công ra file Excel
exports.exportMonthXlsx = async (req, res) => {
  try {
    const userId = await resolveTargetUserId(req);
    if (userId === '__forbidden__') return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.query || {};
    if (!userId) return res.status(404).json({ message: 'User not found' });
    if (!year || !month) return res.status(400).json({ message: 'Missing year/month' });
    const pad = (n) => String(n).padStart(2, '0');
    const y = parseInt(year, 10), m = parseInt(month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Invalid year/month' });
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${y}-${pad(m)}-01`;
    const to = `${y}-${pad(m)}-${pad(lastDay)}`;
    const monthStatusObj = await repo.getMonthStatus(userId, y, m).catch(() => null);
    const monthStatus = String(monthStatusObj?.status || '').trim() || 'draft';
    const monthApproverName = monthStatus === 'approved' ? String(monthStatusObj?.approved_by_name || '') : '';
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'payroll' && monthStatus !== 'approved') {
      return res.status(403).json({ message: 'Forbidden: month is not closed' });
    }

    const user = await userRepo.getUserById(userId).catch(() => null);
    const employeeCode = String(user?.employee_code || user?.employeeCode || '').trim();
    const employeeName = String(
      user?.full_name ||
      user?.fullName ||
      user?.display_name ||
      user?.displayName ||
      user?.name ||
      user?.username ||
      user?.email ||
      employeeCode ||
      (userId ? `社員${userId}` : '') ||
      ''
    ).trim();

    const rows = await repo.listByUserBetween(userId, from, to);
    const dailyRows = await repo.listDailyBetween(userId, from, to).catch(() => []);
    const planRows = await repo.listPlanBetween(userId, from, to).catch(() => []);
    const shiftDefs = await repo.listShiftDefinitions().catch(() => []);
    const shiftById = new Map((shiftDefs || []).map(s => [String(s.id), s]));
    const off = await getUserOffDaySet(y, userId);

    const dailyMap = new Map();
    for (const r of dailyRows || []) {
      const d = String(r?.date || '').slice(0, 10);
      if (!d) continue;
      dailyMap.set(d, {
        kubun: r.kubun || null,
        workType: r.work_type || null,
        location: r.location || null,
        reason: r.reason || null,
        memo: r.memo || null,
        notes: r.notes || null,
        lateMinutes: r.late_minutes == null ? null : Number(r.late_minutes),
        earlyMinutes: r.early_minutes == null ? null : Number(r.early_minutes),
        breakMinutes: r.break_minutes == null ? null : Number(r.break_minutes),
        nightBreakMinutes: r.night_break_minutes == null ? null : Number(r.night_break_minutes)
      });
    }

    const segMap = new Map();
    for (const r of (rows || [])) {
      const d = String(r.checkIn || '').slice(0, 10) || String(r.checkOut || '').slice(0, 10);
      if (!d) continue;
      if (!segMap.has(d)) segMap.set(d, []);
      segMap.get(d).push({
        id: r.id,
        checkIn: r.checkIn || null,
        checkOut: r.checkOut || null,
        shiftId: r.shiftId || null,
        workType: r.work_type || r.workType || null,
        labels: r.labels || null,
        location: r.location || null,
        memo: r.memo || null,
        notes: r.notes || null
      });
    }

    const dowJa = (dateStr) => {
      try {
        const [yy, mm, dd] = String(dateStr).slice(0, 10).split('-').map(x => parseInt(x, 10));
        const dt = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 0, 0, 0));
        return ['日', '月', '火', '水', '木', '金', '土'][dt.getUTCDay()];
      } catch {
        return '';
      }
    };
    const hm = (dtStr) => {
      const s = String(dtStr || '');
      if (!s) return '';
      if (s.includes('T')) return s.slice(11, 16);
      return s.slice(11, 16);
    };
    const fmtHm = (mins) => {
      const m0 = Math.max(0, Number(mins || 0));
      const h = Math.floor(m0 / 60);
      const mm = Math.floor(m0 % 60);
      return `${h}:${String(mm).padStart(2, '0')}`;
    };
    const hmToMinutes = (s) => {
      const t = String(s || '').trim();
      const m = t.match(/^(\d+):(\d{2})$/);
      if (!m) return 0;
      return (parseInt(m[1], 10) * 60) + parseInt(m[2], 10);
    };
    const minutesBetween = (aStr, bStr) => {
      const a = String(aStr || '');
      const b = String(bStr || '');
      if (!a || !b) return 0;
      const aD = a.slice(0, 10);
      const bD = b.slice(0, 10);
      const aT = a.slice(11, 16);
      const bT = b.slice(11, 16);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(aD) || !/^\d{4}-\d{2}-\d{2}$/.test(bD)) return 0;
      if (!/^\d{2}:\d{2}$/.test(aT) || !/^\d{2}:\d{2}$/.test(bT)) return 0;
      const [ay, am, ad] = aD.split('-').map(n => parseInt(n, 10));
      const [by, bm, bd] = bD.split('-').map(n => parseInt(n, 10));
      const [ah, amn] = aT.split(':').map(n => parseInt(n, 10));
      const [bh, bmn] = bT.split(':').map(n => parseInt(n, 10));
      const aUtc = Date.UTC(ay, (am || 1) - 1, ad || 1, (ah || 0) - 9, amn || 0, 0);
      const bUtc = Date.UTC(by, (bm || 1) - 1, bd || 1, (bh || 0) - 9, bmn || 0, 0);
      return Math.max(0, Math.round((bUtc - aUtc) / 60000));
    };
    const brLabel = (min) => {
      if (min === '') return '';
      if (min === 0) return '0:00';
      return fmtHm(min);
    };
    const nbLabel = (min) => {
      if (min === '') return '';
      if (min === 0) return '0:00';
      return fmtHm(min);
    };
    const reasonLabel = (r) => {
      const s = String(r || '').trim();
      if (s === 'private') return '私用';
      if (s === 'late') return '遅刻';
      if (s === 'early') return '早退';
      if (s === 'other') return 'その他';
      return s;
    };

    const workDetailsRows = await repo.listWorkDetailsBetween(userId, from, to).catch(() => []);
    const workDetails = (workDetailsRows || []).map(r => ({
      startDate: String(r.start_date || '').slice(0, 10) || null,
      endDate: r.end_date ? String(r.end_date).slice(0, 10) : null,
      companyName: r.company_name || null,
      workContent: r.work_content || null
    }));
    const resolveWorkDetail = (ds) => {
      let best = null;
      for (const w of workDetails) {
        const sd = String(w?.startDate || '').slice(0, 10);
        if (!sd || sd > ds) continue;
        const ed = w?.endDate ? String(w.endDate).slice(0, 10) : '';
        if (ed && ed < ds) continue;
        best = w;
      }
      return best;
    };

    const assigns = await repo.listShiftAssignmentsBetween(userId, from, to).catch(() => []);
    const shiftForDate = (ds) => {
      let best = null;
      for (const a of assigns || []) {
        const sd = String(a?.start_date || '').slice(0, 10);
        if (!sd || sd > ds) continue;
        const ed = a?.end_date ? String(a.end_date).slice(0, 10) : '';
        if (ed && ed < ds) continue;
        best = a;
      }
      if (!best) return null;
      const sid = best?.shiftId != null ? String(best.shiftId) : '';
      const def = sid ? (shiftById.get(sid) || null) : null;
      if (!def) return null;
      const st = String(def.start_time || '').trim();
      const et = String(def.end_time || '').trim();
      if (!/^\d{2}:\d{2}$/.test(st) || !/^\d{2}:\d{2}$/.test(et)) return null;
      const [sh, sm] = st.split(':').map(n => parseInt(n, 10));
      const [eh, em] = et.split(':').map(n => parseInt(n, 10));
      return { 
        id: def.id,
        start_time: def.start_time,
        end_time: def.end_time,
        break_minutes: def.break_minutes,
        startMin: (sh || 0) * 60 + (sm || 0), 
        endMin: (eh || 0) * 60 + (em || 0) 
      };
    };

    const columns = [
      { header: '社員番号', width: 14 },
      { header: '氏名', width: 18 },
      { header: '日付', width: 12 },
      { header: '曜日', width: 6 },
      { header: '勤務区分', width: 10 },
      { header: '現場（任意）', width: 28 },
      { header: '出社', width: 6 },
      { header: '在宅', width: 6 },
      { header: '現場', width: 14 },
      { header: '開始時刻', width: 10 },
      { header: '終了時刻', width: 10 },
      { header: '休憩時間', width: 10 },
      { header: '深夜休憩', width: 10 },
      { header: '勤務時間', width: 10 },
      { header: '超過時間', width: 10 },
      { header: '遅刻/早退', width: 10 },
      { header: '理由', width: 12 },
      { header: '社内業務', width: 14 },
      { header: '備考', width: 26 },
      { header: '承認ステータス', width: 12 },
      { header: '承認者', width: 12 }
    ];

    const sheetRows = [];
    const planSheetRows = [];
    const planColumns = [
      { header: '日付', width: 12 },
      { header: '勤務区分', width: 10 },
      { header: '変換勤務区分', width: 14 },
      { header: '現場（任意）', width: 20 },
      { header: '開始時刻', width: 10 },
      { header: '終了時刻', width: 10 },
      { header: '休憩時間', width: 10 },
      { header: '深夜休憩', width: 10 },
      { header: '勤務時間', width: 10 },
      { header: '勤務形態', width: 14 }
    ];

    for (let day = 1; day <= lastDay; day++) {
      const ds = `${y}-${pad(m)}-${pad(day)}`;
      const dow = dowJa(ds);
      
      // Determine isOff logically the same way the frontend does (from calendar rule)
      const isOff = off.has(ds);
      
      // Sheet 1: 入力用勤怠表
      const segs0 = (segMap.get(ds) || []).slice().sort((a, b) => String(a?.checkIn || '').localeCompare(String(b?.checkIn || '')));
      const segs = segs0.filter(s => {
        try {
          const sid = s?.shiftId != null ? String(s.shiftId) : '';
          const def = sid ? (shiftById.get(sid) || null) : null;
          const wt = String(s?.workType || '').trim();
          const labels = String(s?.labels || '').trim();
          const inHm = hm(s?.checkIn);
          const outHm = hm(s?.checkOut);
          if (def && !wt && !labels && inHm === String(def.start_time || '').trim() && outHm === String(def.end_time || '').trim()) {
            return false;
          }
        } catch (e) { /* silently ignored */ }
        return true;
      });
      const seg = segs[0] || null;
      const daily = dailyMap.get(ds) || null;
      const wd = resolveWorkDetail(ds);
      
      const isPartTime = String(user?.employment_type || '').toLowerCase() === 'part_time';
      const shiftDef = shiftForDate(ds);
      const shiftStart = shiftDef ? shiftDef.start_time : '09:00';
      const shiftEnd = shiftDef ? shiftDef.end_time : '18:00';
      
      let defaultBr = 60;
      if (shiftDef && shiftDef.break_minutes != null) {
        defaultBr = Number(shiftDef.break_minutes);
      } else if (isPartTime) {
        const sM = hmToMinutes(shiftStart);
        const eM = hmToMinutes(shiftEnd);
        if (sM && eM && (eM - sM <= 5 * 60)) {
          defaultBr = 0;
        }
      }

      let inHm = hm(seg?.checkIn);
      let outHm = hm(seg?.checkOut);
      const hasTime = !!inHm || !!outHm;
      const workKubunSet = new Set(['出勤', '半休', '半休(有給)', '振替出勤', '休日出勤', '代替出勤']);
      const dailyKubun = String(daily?.kubun || '').trim();
      const plannedLabel = isOff ? '【予定休日】' : '【予定出勤】';
      const kubunInfo = (() => {
        if (isOff) {
          if (dailyKubun === '出勤') return { display: '出勤', effective: '出勤' };
          if (dailyKubun === '休日' || dailyKubun === '休日出勤' || dailyKubun === '代替出勤') {
            return { display: dailyKubun, effective: dailyKubun };
          }
          if (hasTime) return { display: '休日出勤', effective: '休日出勤' };
          return { display: plannedLabel, effective: '休日' };
        }
        const allowed = new Set(['', '出勤', '半休', '半休(有給)', '欠勤', '有給休暇', '無給休暇', '代替休日', '振替出勤', '休日']);
        if (allowed.has(dailyKubun) && dailyKubun) return { display: dailyKubun, effective: dailyKubun };
        return { display: plannedLabel, effective: '出勤' };
      })();
      const kubun = kubunInfo.display;
      const isWorkKubun = workKubunSet.has(kubunInfo.effective);
      
      // We only export ACTUAL data, not the faded placeholder data from the UI.
      const shouldShowDefaultShift = !isOff && (kubun === '' || kubun === '出勤' || kubun === '【予定出勤】' || kubun === '休日出勤' || kubun === '代替出勤');
      
      let wt = isWorkKubun ? String(seg?.workType || daily?.workType || '').trim() : '';
      if (isWorkKubun && !wt && hasTime) wt = 'onsite';
      const wtOn = (wt === 'onsite' && hasTime) ? { v: '✓', s: 'checkOn' } : '';
      const wtRe = (wt === 'remote' && hasTime) ? { v: '✓', s: 'checkOn' } : '';
      const wtSa = (wt === 'satellite' && hasTime) ? { v: '✓', s: 'checkOn' } : '';
      
      const holidayLock = !isWorkKubun;
      
      let exportInHm = '';
      let exportOutHm = '';
      let exportBrMin = '';
      let exportNbMin = '';
      let exportWorkedMin = '';
      let exportOtMin = '';

      if (hasTime) {
        exportInHm = inHm;
        exportOutHm = outHm;
        exportBrMin = holidayLock ? 0 : (daily?.break_minutes == null ? defaultBr : Number(daily.break_minutes));
        exportNbMin = holidayLock ? 0 : (daily?.night_break_minutes == null ? 0 : Number(daily.night_break_minutes));
        exportWorkedMin = holidayLock ? 0 : Math.max(0, hmToMinutes(outHm) - hmToMinutes(inHm) - exportBrMin - exportNbMin);
        exportOtMin = holidayLock ? 0 : Math.max(0, exportWorkedMin - (8 * 60));
      }
      const lateEarly = (() => {
        if (holidayLock) return '';
        if (!exportInHm && !exportOutHm) return '';
        const parse = (t) => {
          const s = String(t || '');
          if (!/^\d{2}:\d{2}$/.test(s)) return null;
          const [h, mi] = s.split(':').map(n => parseInt(n, 10));
          return (h || 0) * 60 + (mi || 0);
        };
        const a = parse(exportInHm);
        const b = parse(exportOutHm);
        if (a == null || b == null) return '';
        const se = shiftForDate(ds);
        const startBase = se?.startMin ?? (8 * 60);
        const endBase = se?.endMin ?? (17 * 60);
        // Match monthly table rule exactly: late if in > shift start, early if out < shift end.
        const late = a > startBase;
        const early = b < endBase;
        if (late && early) return '遅刻/早退';
        if (late) return '遅刻';
        if (early) return '早退';
        return '';
      })();

      const workLocation = (() => {
        const segLoc = seg ? String(seg?.location || '').trim() : '';
        const dLoc = String(daily?.location || '').trim();
        return segLoc || dLoc || '';
      })();
      
      const workContent = (() => {
        const segMemo = seg ? String(seg?.memo || '').trim() : '';
        const dMemo = String(daily?.memo || '').trim();
        return segMemo || dMemo || '';
      })();
      
      const notesText = (() => {
        const segNotes = seg ? String(seg?.notes || '').trim() : '';
        const dNotes = String(daily?.notes || '').trim();
        return segNotes || dNotes || '';
      })();

      const inhouseWork = String(wd?.workContent || '').trim();
      const goOuts = await repo.getGoOutRecords(userId, ds).catch(() => []);
      
      let goOutDetail = '';
      if (Array.isArray(goOuts) && goOuts.length > 0) {
        const parts = goOuts.map(g => {
          const t1 = hm(g.go_out_time);
          const t2 = hm(g.return_time) || '未戻';
          const r = g.reason || '';
          return `${t1}-${t2}(${r})`;
        });
        goOutDetail = parts.join(', ');
      }
      
      const approveStatus = monthStatus === 'approved' ? '承認済' : (() => {
        const labels = String(seg?.labels || '').split(',').map(s => s.trim()).filter(Boolean);
        if (labels.includes('submitted')) return '承認待ち';
        return '';
      })();
      sheetRows.push({
        isOff,
        cells: [
          employeeCode || '',
          employeeName || '',
          ds,
          dow,
          kubun,
          workLocation,
          wtOn,
          wtRe,
          wtSa,
          exportInHm,
          exportOutHm,
          brLabel(exportBrMin),
          nbLabel(exportNbMin),
          exportWorkedMin !== '' ? fmtHm(exportWorkedMin) : '',
          exportOtMin !== '' ? fmtHm(exportOtMin) : '',
          lateEarly,
          reasonLabel(daily?.reason || ''),
          workContent,
          notesText,
          approveStatus,
          inhouseWork,
          goOutDetail
        ]
      });

      // Export thêm rows cho segments 2+ trong cùng ngày
      for (let si = 1; si < segs.length; si++) {
        const extraSeg = segs[si];
        const extraIn = hm(extraSeg?.checkIn);
        const extraOut = hm(extraSeg?.checkOut);
        if (!extraIn && !extraOut) continue;
        const extraWt = String(extraSeg?.workType || '').trim();
        const extraWtOn = extraWt === 'onsite' ? { v: '✓', s: 'checkOn' } : '';
        const extraWtRe = extraWt === 'remote' ? { v: '✓', s: 'checkOn' } : '';
        const extraWtSa = extraWt === 'satellite' ? { v: '✓', s: 'checkOn' } : '';
        const extraLoc = String(extraSeg?.location || '').trim();
        const extraMemo = String(extraSeg?.memo || '').trim();
        const extraNotes = String(extraSeg?.notes || '').trim();
        const extraBr = holidayLock ? 0 : defaultBr;
        const extraWorked = holidayLock ? 0 : Math.max(0, hmToMinutes(extraOut) - hmToMinutes(extraIn) - extraBr);
        const extraOt = holidayLock ? 0 : Math.max(0, extraWorked - (8 * 60));
        sheetRows.push({
          isOff,
          cells: [
            '', '', ds, dow, '',
            extraLoc,
            extraWtOn, extraWtRe, extraWtSa,
            extraIn,
            extraOut,
            brLabel(extraBr),
            '0:00',
            fmtHm(extraWorked),
            fmtHm(extraOt),
            '', '',
            extraMemo,
            extraNotes,
            '', '', ''
          ]
        });
      }

      // Sheet 2: 予定
      const plan = planRows.find(p => String(p.date).slice(0, 10) === ds) || null;
      const planShiftDef = plan?.shiftId ? shiftById.get(String(plan.shiftId)) : shiftDef;
      const planKubun = isOff ? '休日' : '出勤';
      const planStartTime = plan?.startTime || planShiftDef?.start_time || '';
      const planEndTime = plan?.endTime || planShiftDef?.end_time || '';
      
      let planBreak = 60;
      if (plan?.breakMinutes != null) {
        planBreak = plan.breakMinutes;
      } else if (planShiftDef && planShiftDef.break_minutes != null) {
        planBreak = Number(planShiftDef.break_minutes);
      } else if (isPartTime) {
        const sM = hmToMinutes(planStartTime);
        const eM = hmToMinutes(planEndTime);
        if (sM && eM && (eM - sM <= 5 * 60)) {
          planBreak = 0;
        }
      }
      
      const planWorkType = plan?.work_type || (isOff ? '' : '契約なし');
      
      planSheetRows.push({
        isOff,
        cells: [
          `${m}月${day}日(${dow})`,
          planKubun,
          planKubun,
          plan?.location || '',
          planStartTime ? planStartTime.split(':')[0] : '',
          planStartTime ? planStartTime.split(':')[1] : '',
          planEndTime ? planEndTime.split(':')[0] : '',
          planEndTime ? planEndTime.split(':')[1] : '',
          Math.floor(planBreak / 60),
          planBreak % 60,
          0, 0, // 深夜休憩
          { f: `MAX(0, (G${day+1}*60+H${day+1})-(E${day+1}*60+F${day+1})-(I${day+1}*60+J${day+1}))` }, // Công thức tính phút
          planWorkType
        ]
      });
    }

    const safeFile = (s) => String(s || '').replace(/[\\\/:*?"<>|]/g, '_');
    const fileNameRaw = safeFile(`${employeeName}_${employeeCode}_${y}年${String(m).padStart(2,'0')}月.xlsx`);
    const fileNameAscii = `attendance_${employeeCode || userId}_${y}-${String(m).padStart(2,'0')}.xlsx`;
    const fileNameEncoded = encodeURIComponent(fileNameRaw);
    const { buildXlsxArchive } = require('../../utils/xlsx');
    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    const colRef = (n) => {
      let x = Number(n || 1);
      let out = '';
      while (x > 0) {
        const r = (x - 1) % 26;
        out = String.fromCharCode(65 + r) + out;
        x = Math.floor((x - 1) / 26);
      }
      return out || 'A';
    };
    const cell = (ref, value, style = 0) => {
      const v = String(value == null ? '' : value);
      if (!v) return `<c r="${ref}" s="${style}"/>`;
      return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };
    const numberCell = (ref, value, style = 0) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return `<c r="${ref}" s="${style}"/>`;
      return `<c r="${ref}" s="${style}"><v>${String(n)}</v></c>`;
    };
    const formulaCell = (ref, formula, value = '', style = 0) => {
      const v = String(value == null ? '' : value);
      return `<c r="${ref}" t="str" s="${style}"><f>${esc(formula)}</f><v>${esc(v)}</v></c>`;
    };
    const splitHmDisplay = (s, showColonOnly = true) => {
      const t = String(s || '').trim();
      const m = t.match(/^(\d+):(\d{2})$/);
      if (m) return [m[1], ':', m[2]];
      return ['', showColonOnly ? ':' : '', ''];
    };
    const rowXml = (r, cells, ht = null) => `<row r="${r}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells.join('')}</row>`;
    const sheet1Rows = [];
    const push1 = (r, list, ht = null) => { sheet1Rows.push(rowXml(r, list, ht)); };
    push1(1, [cell('A1', '月次勤怠インポートテンプレート', 1)], 22);
    push1(2, [cell('A2', '編集可能セルのみ入力してください（行/列の追加・削除・移動は不可）。', 2)], 20);
    push1(3, [cell('A3', '承認済み・承認依頼中の行は取り込み対象外です。', 2)], 18);
    push1(4, [cell('A4', `社員番号: ${employeeCode || ''}　　氏名: ${employeeName || ''}`, 1)], 22);
    push1(5, [cell('A5', '日次実績', 1)], 22);
    push1(6, [
      cell('A6', '日付', 3),
      cell('B6', '勤務区分', 3),
      cell('C6', '出社', 3),
      cell('D6', '在宅', 3),
      cell('E6', '現場', 3),
      cell('F6', '開始時刻', 3),
      cell('G6', '終了時刻', 3),
      cell('H6', '休憩時間', 3),
      cell('I6', '深夜休憩', 3),
      cell('J6', '勤務時間', 3),
      cell('K6', '超過時間', 3),
      cell('L6', '遅刻/早退', 3),
      cell('M6', '理由', 3),
      cell('N6', '備考', 3),
      cell('O6', '承認ステータス', 14),
      cell('P6', '承認者', 14)
    ], 22);
    for (let i = 0; i < sheetRows.length; i++) {
      const r = sheetRows[i];
      const src = Array.isArray(r?.cells) ? r.cells : [];
      const rowDow = String(src[3] || '').trim();
      const isSunday = rowDow === '日';
      // Determine row color style based on kubun and attendance status
      const rowKubun = String(src[4] || '').trim();
      const rowHasTime = !!(src[9] || src[10]); // has 開始 or 終了
      const rowIsOff = r?.isOff;
      // Style IDs: 21=blue(worked), 22=gray(not worked), 23=yellow(paid leave), 24=red(absent), 25=green(half), 26=pink(holiday)
      const rowStyle = (() => {
        if (rowKubun === '有給休暇') return 23; // yellow
        if (rowKubun === '欠勤') return 24; // red
        if (rowKubun === '半休' || rowKubun === '半休(有給)') return 25; // light green
        if (rowKubun === '休日' || rowKubun === '【予定休日】' || rowIsOff) return 26; // pink (holiday/off)
        if (rowHasTime) return 21; // blue (has actual attendance)
        if (rowKubun.includes('予定')) return 12; // white (planned, no data yet)
        if (rowKubun === '出勤' || rowKubun === '休日出勤' || rowKubun === '代替出勤') return 22; // gray (work day but no time yet)
        return 12; // default
      })();
      const dayText = (() => {
        const ds = String(src[2] || '');
        const dow = String(src[3] || '');
        const d = /^\d{4}-(\d{2})-(\d{2})$/.exec(ds);
        return d ? `${parseInt(d[1], 10)}月${parseInt(d[2], 10)}日(${dow})` : ds;
      })();
      const vals = [
        dayText,
        src[4] || '',
        (src[6] && typeof src[6] === 'object' ? src[6].v : '') || '',
        (src[7] && typeof src[7] === 'object' ? src[7].v : '') || '',
        (src[8] && typeof src[8] === 'object' ? src[8].v : '') || '',
        src[9] || '',
        src[10] || '',
        src[11] || '0:00',
        src[12] || '0:00',
        src[13] || '0:00',
        src[14] || '0:00',
        src[15] || '',
        src[16] || '',
        src[18] || '',
        src[19] || '',
        monthApproverName
      ];
      const rowNum = 7 + i;
      const xmlCells = vals.map((v, ci) => {
        const ref = `${colRef(ci + 1)}${rowNum}`;
        const isTimeCell = (ci >= 5 && ci <= 10);
        const isTextWide = ci === 12 || ci === 13;
        const baseStyle = rowStyle;
        // Highlight only the date cell (日付) for Sundays.
        let styleWithDay = (isSunday && ci === 0) ? 16 : baseStyle;
        
        let cellValue = String(v || '');
        if ((ci === 2 || ci === 3 || ci === 4) && cellValue === '✓') {
          styleWithDay = 20; // apply blue background style
        }

        if (ci === 1) {
          if (cellValue === '休日出勤' && !vals[5] && !vals[6] && !vals[8] && !vals[9]) {
            const ds = String(vals[2] || '');
            const daily = ds ? dailyMap.get(ds) : null;
            if (daily?.kubun !== '休日出勤') cellValue = '休日';
          }
        }
        if (ci === 2) {
          if (cellValue === '休日出勤' && !vals[5] && !vals[6] && !vals[8] && !vals[9]) {
            const ds = String(vals[2] || '');
            const daily = ds ? dailyMap.get(ds) : null;
            if (daily?.kubun !== '休日出勤') cellValue = '休日';
          }
        }

        if (ci === 9) {
          const f = `ROUNDDOWN(Q${rowNum}/60,0)&":"&TEXT(MOD(Q${rowNum},60),"00")`;
          return formulaCell(ref, f, cellValue || '0:00', styleWithDay);
        }
        if (ci === 10) {
          const f = `IF(Q${rowNum}>480,ROUNDDOWN((Q${rowNum}-480)/60,0)&":"&TEXT(MOD((Q${rowNum}-480),60),"00"),"0:00")`;
          return formulaCell(ref, f, cellValue || '0:00', styleWithDay);
        }
        return cell(ref, cellValue, styleWithDay);
      });
      xmlCells.push(numberCell(`Q${rowNum}`, hmToMinutes(src[13] || '0:00'), 0));
      push1(rowNum, xmlCells);
    }
    const sheet1VisibleCols = [12, 14, 5, 5, 5, 10, 10, 10, 10, 10, 10, 10, 12, 30, 14, 12];
    const sheet1Cols = [
      ...sheet1VisibleCols.map((w, i) => {
        return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`;
      }),
      `<col min="17" max="17" width="2" hidden="1" customWidth="1"/>`
    ].join('');
    const sheet1Merges = [
      'A1:J1', 'A2:J2', 'A3:J3',
      'A4:J4',
      'A5:P5'
    ].map(r => `<mergeCell ref="${r}"/>`).join('');
    const lastSheet1Row = 6 + Math.max(1, sheetRows.length);
    const sheet1Validations = [
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="C7:C${lastSheet1Row}"><formula1>",✓"</formula1></dataValidation>`,
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="D7:D${lastSheet1Row}"><formula1>",✓"</formula1></dataValidation>`,
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="E7:E${lastSheet1Row}"><formula1>",✓"</formula1></dataValidation>`
    ].join('');
    const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${sheet1Cols}</cols>
  <sheetData>${sheet1Rows.join('')}</sheetData>
  <sheetProtection sheet="1" objects="1" scenarios="1" />
  <mergeCells count="${(sheet1Merges.match(/<mergeCell /g) || []).length}">${sheet1Merges}</mergeCells>
  <dataValidations count="3">${sheet1Validations}</dataValidations>
</worksheet>`;
    const sheet2Header = planColumns.map((c, i) => cell(`${colRef(i + 1)}1`, c.header, 3));
    const sheet2Rows = [rowXml(1, sheet2Header, 22)];
    for (let i = 0; i < planSheetRows.length; i++) {
      const vals = Array.isArray(planSheetRows[i]?.cells) ? planSheetRows[i].cells.map(v => (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'v') ? v.v : (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'f') ? String(v.v || '') : v))) : [];
      const rowNum = i + 2;
      const planStartH = Number(vals[4] || 0);
      const planStartM = Number(vals[5] || 0);
      const planEndH = Number(vals[6] || 0);
      const planEndM = Number(vals[7] || 0);
      const breakH = Number(vals[8] || 0);
      const breakM = Number(vals[9] || 0);
      const nightBreakH = Number(vals[10] || 0);
      const nightBreakM = Number(vals[11] || 0);
      const plannedMinutes = Math.max(0, ((planEndH * 60 + planEndM) - (planStartH * 60 + planStartM)) - (breakH * 60 + breakM) - (nightBreakH * 60 + nightBreakM));
      const planWorkStyle = String(vals[13] || '');
      const rowCells = vals.map((v, ci) => cell(`${colRef(ci + 1)}${rowNum}`, v == null ? '' : v, ci === 0 ? 10 : 11));
      rowCells.push(numberCell(`U${rowNum}`, plannedMinutes, 0));
      rowCells.push(cell(`V${rowNum}`, planWorkStyle, 0));
      sheet2Rows.push(rowXml(rowNum, rowCells));
    }
    const sheet2VisibleCols = [12, 10, 14, 20, 8, 8, 8, 8, 8, 8, 10, 12, 12, 12];
    const sheet2Cols = [
      ...sheet2VisibleCols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`),
      ...Array.from({ length: 6 }, (_, idx) => `<col min="${15 + idx}" max="${15 + idx}" width="2" hidden="1" customWidth="1"/>`),
      `<col min="21" max="21" width="2" hidden="1" customWidth="1"/>`,
      `<col min="22" max="22" width="2" hidden="1" customWidth="1"/>`
    ].join('');
    const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${sheet2Cols}</cols>
  <sheetData>${sheet2Rows.join('')}</sheetData>
  <sheetProtection sheet="1" objects="1" scenarios="1" />
</worksheet>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF000000"/><name val="Meiryo"/></font>
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Meiryo"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Meiryo"/></font>
    <font><sz val="11"/><color rgb="FFC62828"/><name val="Meiryo"/></font>
  </fonts>
  <fills count="18">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4CCCC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF9CB9C"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFDE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD0D7DE"/></left><right style="thin"><color rgb="FFD0D7DE"/></right><top style="thin"><color rgb="FFD0D7DE"/></top><bottom style="thin"><color rgb="FFD0D7DE"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="26">
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="9" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="13" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="14" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="15" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="16" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="17" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    // Sheet 3: 現場・作業内容
    const sheet3Rows = [];
    const push3 = (r, list, ht = null) => { sheet3Rows.push(rowXml(r, list, ht)); };
    push3(1, [cell('A1', '日付', 3), cell('B1', '現場（任意）', 3), cell('C1', '作業内容', 3)], 22);
    let sheet3Row = 2;
    for (const sr of sheetRows) {
      const cells = sr?.cells || [];
      const dateVal = cells[2] || '';
      const locVal = cells[5] || '';
      const memoVal = cells[17] || '';
      if (!locVal && !memoVal) { sheet3Row++; continue; }
      push3(sheet3Row, [cell(`A${sheet3Row}`, dateVal, 10), cell(`B${sheet3Row}`, locVal, 11), cell(`C${sheet3Row}`, memoVal, 11)]);
      sheet3Row++;
    }
    const sheet3Cols = `<col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/><col min="3" max="3" width="50" customWidth="1"/>`;
    const sheet3Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${sheet3Cols}</cols>
  <sheetData>${sheet3Rows.join('')}</sheetData>
</worksheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="入力用勤怠表" sheetId="1" r:id="rId1"/><sheet name="予定" sheetId="2" r:id="rId2"/><sheet name="現場・作業内容" sheetId="3" r:id="rId4"/></sheets><calcPr calcId="171027" fullCalcOnLoad="1"/></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const buf = buildXlsxArchive([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', data: sheet1Xml },
      { name: 'xl/worksheets/sheet2.xml', data: sheet2Xml },
      { name: 'xl/worksheets/sheet3.xml', data: sheet3Xml }
    ]);

    // Auto-save export to R2
    const s3Service = require('../../core/services/s3.service');
    if (s3Service.isR2Configured()) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const r2Key = `exports/excel/attendance_month/${ts}_${fileNameAscii}`;
      s3Service.uploadToR2(r2Key, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(e => {
        console.error('Failed to auto-save export to R2:', e);
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameEncoded}`);
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
