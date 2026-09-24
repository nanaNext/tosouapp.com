const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const salaryService = require('./salary.service');
const payslipRepo = require('../payslip/payslip.repository');
const salaryInputRepo = require('./salaryInput.repository');
const payslipDeliveryRepo = require('./payslipDelivery.repository');
const { companyName } = require('../../config/env');
const db = require('../../core/database/mysql');
const s3Service = require('../../core/services/s3.service');

router.get('/my', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const month = req.query.month;
    if (!month) return res.status(400).json({ message: 'Missing month' });
    
    // Check if published
    const input = await salaryInputRepo.getByUserMonth(req.user.id, month);
    if (!input || !input.is_published) {
      // Return 200 with a specific format so the frontend can display a friendly message
      // without triggering global HTTP error handlers
      return res.status(200).json({ notPublished: true, message: '給与明細はまだ公開されていません' });
    }

    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const issueDate = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    const { employees } = await salaryService.computePayslips([req.user.id], month);
    res.status(200).json({ companyName, issueDate, month, employees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/published', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const deliveries = await payslipDeliveryRepo.list({ userId: req.user.id, month: null, limit: 500 });
    
    // Also fetch the published status from salary_inputs to ensure they are still published
    const publishedInputs = await salaryInputRepo.listPublishedByUser(req.user.id);

    const latestByMonth = new Map();
    for (const row of deliveries) {
      const m = String(row?.month || '');
      if (!m) continue;
      if (!latestByMonth.has(m)) latestByMonth.set(m, row);
    }
    
    // is_published=1 chỉ đánh dấu "đã公開", KHÔNG đảm bảo có file thật đi kèm
    // (VD dữ liệu cũ set thẳng vào DB, hoặc publish rồi sau đó payslip_deliveries
    // bị xóa) — nếu không có bản ghi payslipDeliveries thật (r) thì bỏ qua, tránh
    // hiện link "PDFが見つかりません" cho nhân viên.
    const items = publishedInputs
      .map(input => {
        const m = String(input.month);
        const r = latestByMonth.get(m);
        return {
          id: r?.id || null,
          month: m,
          publishedAt: r?.sent_at || input.updated_at || null,
          publishedBy: r?.sent_by || input.updated_by || null,
          hasPdf: !!r,
          fileName: r?.original_name || null,
          isRead: !!r?.is_read
        };
      })
      .filter(item => item.hasPdf);
    
    // Sort by month descending
    items.sort((a, b) => b.month.localeCompare(a.month));
    
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/my/read', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const month = req.body.month;
    if (!month) return res.status(400).json({ message: 'Missing month' });
    
    // Get all deliveries for this user and month
    const deliveries = await payslipDeliveryRepo.list({ userId: req.user.id, month, limit: 500 });
    for (const d of deliveries) {
      if (!d.is_read) {
        await payslipDeliveryRepo.markAsRead(d.id);
      }
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/:year/:month', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const y = req.params.year;
    const m = req.params.month;
    const month = `${y}-${String(m).padStart(2,'0')}`;

    // Check if published
    const input = await salaryInputRepo.getByUserMonth(req.user.id, month);
    if (!input || !input.is_published) {
      return res.status(200).json({ notPublished: true, message: '給与明細はまだ公開されていません' });
    }

    const { employees } = await salaryService.computePayslips([req.user.id], month);
    res.status(200).json(employees[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me/:year/:month/download', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const y = req.params.year;
    const m = req.params.month;
    const month = `${y}-${String(m).padStart(2,'0')}`;

    // Check if published
    const input = await salaryInputRepo.getByUserMonth(req.user.id, month);
    if (!input || !input.is_published) {
      return res.status(200).json({ notPublished: true, message: '給与明細はまだ公開されていません' });
    }

    const row = await payslipRepo.findLatestByUserMonth(req.user.id, month);
    if (!row) return res.status(404).json({ message: 'PDFが見つかりません' });
    res.status(200).json({ secureUrl: `/api/payslips/me/file/${row.id}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/salary/admin/export.xlsx?month=YYYY-MM ──────────────────────────
// Admin: xuất tổng hợp lương tháng ra Excel
router.get('/admin/export.xlsx', authenticate, resolveTenant, authorize('admin','payroll'), async (req, res) => {
  try {
    const month = String(req.query.month || '').slice(0, 7);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month は YYYY-MM 形式で指定してください' });
    }

    const tenantId = req.tenantId || null;
    const tenantClause = tenantId != null ? 'AND u.tenant_id = ?' : '';
    const tenantParams = tenantId != null ? [tenantId] : [];

    // Lấy danh sách nhân viên active có salary_input cho tháng này
    const [inputRows] = await db.query(`
      SELECT si.userId, si.month, si.is_published,
             u.username, u.employee_code, u.employment_type,
             d.name AS departmentName
      FROM salary_inputs si
      JOIN users u ON u.id = si.userId
      LEFT JOIN departments d ON d.id = u.departmentId
      WHERE si.month = ?
        AND u.employment_status = 'active'
        ${tenantClause}
      ORDER BY u.employee_code ASC, u.id ASC
    `, [month, ...tenantParams]);

    if (!inputRows || inputRows.length === 0) {
      return res.status(404).json({ message: `${month} の給与データがありません` });
    }

    const userIds = inputRows.map(r => r.userId);
    const { employees } = await salaryService.computePayslips(userIds, month);

    // Build index by userId for easy lookup
    const empMap = new Map(employees.map(e => [e.userId, e]));

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'スマートE勤怠';
    wb.created = new Date();
    const ws = wb.addWorksheet(`給与一覧_${month}`);

    ws.columns = [
      { header: 'No',         key: 'no',        width: 6  },
      { header: '社員番号',   key: 'emp_code',  width: 13 },
      { header: '氏名',       key: 'username',  width: 16 },
      { header: '部署',       key: 'dept',      width: 16 },
      { header: '出勤日数',   key: 'workDays',  width: 10 },
      { header: '時間外時間', key: 'overtime',  width: 12 },
      { header: '総支給額',   key: 'gross',     width: 14 },
      { header: '控除合計',   key: 'deductions',width: 14 },
      { header: '差引支給額', key: 'net',       width: 14 },
      { header: '振込支給額', key: 'bank',      width: 14 },
      { header: '公開状態',   key: 'published', width: 10 },
    ];

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e4d8c' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    ws.getRow(1).eachCell(cell => {
      cell.fill = headerFill; cell.font = headerFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
    });
    ws.getRow(1).height = 22;

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    inputRows.forEach((ir, idx) => {
      const e = empMap.get(ir.userId);
      const gross      = e ? (e.合計?.総支給額 || 0) : 0;
      const deductions = e ? (e.合計?.総控除額 || 0) : 0;
      const net        = e ? (e.合計?.差引支給額 || 0) : 0;
      const bank       = e ? (e.支払?.振込支給額 || 0) : 0;
      totalGross      += gross;
      totalDeductions += deductions;
      totalNet        += net;

      const row = ws.addRow({
        no:         idx + 1,
        emp_code:   ir.employee_code || '—',
        username:   ir.username || '—',
        dept:       ir.departmentName || '—',
        workDays:   e?.勤怠?.出勤日数 ?? '—',
        overtime:   e?.勤怠?.時間外時間 ?? '—',
        gross,
        deductions,
        net,
        bank,
        published: ir.is_published ? '公開済' : '未公開',
      });

      const bg = idx % 2 === 0 ? 'FFf8fafc' : 'FFFFFFFF';
      row.eachCell(cell => {
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: bg } };
        cell.alignment = { vertical:'middle' };
        cell.border = { top:{style:'hair'}, bottom:{style:'hair'}, left:{style:'thin'}, right:{style:'thin'} };
      });
      ['gross','deductions','net','bank'].forEach(k => {
        row.getCell(k).numFmt = '#,##0';
        row.getCell(k).alignment = { horizontal:'right', vertical:'middle' };
      });
      row.getCell('workDays').alignment = { horizontal:'center', vertical:'middle' };
      row.getCell('published').alignment = { horizontal:'center', vertical:'middle' };
      if (!ir.is_published) row.getCell('published').font = { color: { argb: 'FFdc2626' } };
      row.height = 18;
    });

    // 合計行
    const totalRow = ws.addRow({
      no:'', emp_code:'', username:'合計', dept:'', workDays:'', overtime:'',
      gross: totalGross, deductions: totalDeductions, net: totalNet, bank:'', published:'',
    });
    totalRow.getCell('username').font = { bold:true };
    ['gross','deductions','net'].forEach(k => {
      totalRow.getCell(k).numFmt = '#,##0';
      totalRow.getCell(k).font = { bold:true };
      totalRow.getCell(k).alignment = { horizontal:'right', vertical:'middle' };
    });
    totalRow.eachCell(cell => {
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFe2e8f0' } };
      cell.border = { top:{style:'medium'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
    });

    ws.views = [{ state:'frozen', xSplit:0, ySplit:1 }];
    ws.autoFilter = { from:'A1', to:'K1' };

    const filename = `salary_summary_${month}.xlsx`;
    const encoded  = encodeURIComponent(filename);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);

    const buf = await wb.xlsx.writeBuffer();
    if (s3Service.isR2Configured()) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      s3Service.uploadToR2(`exports/xlsx/salary/${ts}_${filename}`, Buffer.from(buf), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .catch(e => console.error('R2 upload failed:', e));
    }
    res.status(200).end(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
