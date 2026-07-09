/**
 * Export Service — Excel & PDF generation
 * 
 * Usage:
 *   const { generateAttendanceExcel, generateAttendancePDF } = require('./export.service');
 *   const buffer = await generateAttendanceExcel({ month: '2026-07', users, records });
 *   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 *   res.send(buffer);
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');

/**
 * Generate monthly attendance report as Excel
 * @param {Object} params
 * @param {string} params.month - "2026-07"
 * @param {Array} params.users - [{id, username, employee_code, departmentName}]
 * @param {Array} params.records - [{userId, date, check_in, check_out, status}]
 * @returns {Buffer} Excel file buffer
 */
async function generateAttendanceExcel({ month, users, records, companyName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName || '飯塚塗研株式会社';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`勤怠 ${month}`);

  // Header row
  sheet.columns = [
    { header: '社員番号', key: 'code', width: 12 },
    { header: '氏名', key: 'name', width: 18 },
    { header: '部署', key: 'dept', width: 15 },
    { header: '日付', key: 'date', width: 12 },
    { header: '出勤', key: 'checkIn', width: 10 },
    { header: '退勤', key: 'checkOut', width: 10 },
    { header: '状態', key: 'status', width: 10 },
    { header: '勤務時間', key: 'hours', width: 10 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, size: 11 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };

  // Data rows
  for (const user of users) {
    const userRecords = records.filter(r => r.userId === user.id);
    for (const rec of userRecords) {
      const checkIn = rec.check_in ? String(rec.check_in).slice(11, 16) : '-';
      const checkOut = rec.check_out ? String(rec.check_out).slice(11, 16) : '-';
      let hours = '-';
      if (rec.check_in && rec.check_out) {
        const diff = (new Date(rec.check_out) - new Date(rec.check_in)) / 3600000;
        hours = diff > 0 ? diff.toFixed(1) + 'h' : '-';
      }
      sheet.addRow({
        code: user.employee_code || user.id,
        name: user.username,
        dept: user.departmentName || '-',
        date: rec.date,
        checkIn,
        checkOut,
        status: rec.status || '-',
        hours
      });
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Generate summary Excel (monthly totals per user)
 */
async function generateMonthlySummaryExcel({ month, summaries, companyName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName || '飯塚塗研株式会社';

  const sheet = workbook.addWorksheet(`月次集計 ${month}`);
  sheet.columns = [
    { header: '社員番号', key: 'code', width: 12 },
    { header: '氏名', key: 'name', width: 18 },
    { header: '部署', key: 'dept', width: 15 },
    { header: '出勤日数', key: 'workDays', width: 10 },
    { header: '欠勤日数', key: 'absentDays', width: 10 },
    { header: '有給日数', key: 'paidLeaveDays', width: 10 },
    { header: '総労働時間', key: 'totalHours', width: 12 },
    { header: '残業時間', key: 'overtimeHours', width: 10 },
    { header: '深夜時間', key: 'nightHours', width: 10 },
  ];

  sheet.getRow(1).font = { bold: true, size: 11 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };

  for (const s of summaries) {
    sheet.addRow({
      code: s.employee_code || s.userId,
      name: s.username,
      dept: s.departmentName || '-',
      workDays: s.workDays || 0,
      absentDays: s.absentDays || 0,
      paidLeaveDays: s.paidLeaveDays || 0,
      totalHours: s.totalHours || '0:00',
      overtimeHours: s.overtimeHours || '0:00',
      nightHours: s.nightHours || '0:00'
    });
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Generate attendance PDF report
 */
async function generateAttendancePDF({ month, users, records, companyName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const company = companyName || '飯塚塗研株式会社';

    // Title
    doc.fontSize(16).text(`${company}`, { align: 'center' });
    doc.fontSize(12).text(`勤怠報告書 ${month}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    const startX = 40;
    let y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('社員番号', startX, y, { width: 60 });
    doc.text('氏名', startX + 60, y, { width: 80 });
    doc.text('日付', startX + 140, y, { width: 70 });
    doc.text('出勤', startX + 210, y, { width: 50 });
    doc.text('退勤', startX + 260, y, { width: 50 });
    doc.text('状態', startX + 310, y, { width: 50 });
    doc.moveDown(0.5);
    doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    // Data
    doc.font('Helvetica').fontSize(8);
    for (const user of users) {
      const userRecords = records.filter(r => r.userId === user.id);
      for (const rec of userRecords) {
        y = doc.y;
        if (y > 750) { doc.addPage(); y = doc.y; }
        const checkIn = rec.check_in ? String(rec.check_in).slice(11, 16) : '-';
        const checkOut = rec.check_out ? String(rec.check_out).slice(11, 16) : '-';
        doc.text(String(user.employee_code || user.id), startX, y, { width: 60 });
        doc.text(String(user.username || ''), startX + 60, y, { width: 80 });
        doc.text(String(rec.date || ''), startX + 140, y, { width: 70 });
        doc.text(checkIn, startX + 210, y, { width: 50 });
        doc.text(checkOut, startX + 260, y, { width: 50 });
        doc.text(String(rec.status || '-'), startX + 310, y, { width: 50 });
        doc.moveDown(0.4);
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text(`生成日: ${new Date().toISOString().slice(0, 10)}`, { align: 'right' });

    doc.end();
  });
}

module.exports = { generateAttendanceExcel, generateMonthlySummaryExcel, generateAttendancePDF };
