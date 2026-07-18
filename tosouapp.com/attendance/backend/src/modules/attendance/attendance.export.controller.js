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
// ─── Monthly export (extracted to attendance.export.monthly.js) ─────────────
const monthlyExport = require('./attendance.export.monthly');
exports.exportMonthXlsx = monthlyExport.exportMonthXlsx;
