'use strict';

const summaryService = require('./attendance.summary.service');
const summaryRepo = require('./attendance.summary.repository');

// POST /api/attendance/summary/recompute { year, month, sendAlerts? }
// 手動実行用。深夜バッチが無効/未配線の間はこれで代用できる (admin のみ、重い処理のため)。
exports.recompute = async (req, res) => {
  try {
    const { year, month, sendAlerts } = req.body || {};
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Missing year/month' });
    const result = await summaryService.runRecomputeForTenant({
      tenantId: req.tenantId || null, year: y, month: m, sendAlerts: sendAlerts !== false
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary?year=&month=
exports.list = async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Missing year/month' });
    const userRepo = require('../users/user.repository');
    const tenantId = req.tenantId || null;
    const { rows: users } = await userRepo.listUsersPaged({ role: 'employee', employmentStatus: 'active', tenantId, limit: 5000 });
    const results = [];
    for (const u of users) {
      const s = await summaryRepo.getSummary(u.id, y, m, tenantId);
      results.push({
        userId: u.id, employeeCode: u.employee_code, username: u.username,
        summary: s ? {
          departmentId: s.department_id, attendDays: s.attend_days, regularMinutes: s.regular_minutes,
          overtimeMinutes: s.overtime_minutes, nightMinutes: s.night_minutes, holidayWorkMinutes: s.holiday_work_minutes,
          annualOvertimeMinutes: s.annual_overtime_minutes, rollingAvgMaxMinutes: s.rolling_avg_max_minutes,
          monthsOver45hThisYear: s.months_over_45h_this_year, judgement: s.judgement, dirty: !!s.dirty
        } : null
      });
    }
    res.status(200).json({ year: y, month: m, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary/admin-list?year=&month=&dept=&userId=&recompute=1
// 月次集計(36協定) admin 画面用: 会社全体の一覧 + サマリーカード + 作業報告との突合をまとめて返す。
// recompute!=0 の場合、表示前に対象月をテナント全員分再計算する（アラートは送らない — 送るのは深夜バッチだけ）。
exports.adminList = async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Missing year/month' });
    const tenantId = req.tenantId || null;
    const dept = req.query.dept ? String(req.query.dept) : '';
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;

    if (String(req.query.recompute || '1') !== '0') {
      await summaryService.runRecomputeForTenant({ tenantId, year: y, month: m, sendAlerts: false });
    }

    const rows = await summaryRepo.listSummariesForMonth({ tenantId, year: y, month: m, dept, userId });

    const db = require('../../core/database/mysql');
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const reportParams = [start, end];
    let reportTenantClause = '';
    if (tenantId) { reportTenantClause = 'AND u.tenant_id = ?'; reportParams.push(tenantId); }
    const [reportRows] = await db.query(`
      SELECT wr.userId,
             COALESCE(SUM(CASE WHEN wr.start_time IS NOT NULL AND wr.end_time IS NOT NULL
               THEN TIME_TO_SEC(TIMEDIFF(wr.end_time, wr.start_time)) / 60 ELSE 0 END), 0) AS reportedMinutes
      FROM work_reports wr
      JOIN users u ON u.id = wr.userId
      WHERE wr.date >= ? AND wr.date <= ?
        ${reportTenantClause}
      GROUP BY wr.userId
    `, reportParams);
    const reportedByUser = new Map((reportRows || []).map(r => [Number(r.userId), Math.round(Number(r.reportedMinutes) || 0)]));

    const items = rows.map(s => {
      const workedMinutes = (s.regular_minutes || 0) + (s.overtime_minutes || 0);
      const reportedMinutes = reportedByUser.get(Number(s.user_id)) || 0;
      return {
        userId: s.user_id, employeeCode: s.employeeCode, username: s.username, departmentName: s.departmentName,
        attendDays: s.attend_days, regularMinutes: s.regular_minutes, overtimeMinutes: s.overtime_minutes,
        nightMinutes: s.night_minutes, holidayWorkMinutes: s.holiday_work_minutes,
        annualOvertimeMinutes: s.annual_overtime_minutes, rollingAvgMaxMinutes: s.rolling_avg_max_minutes,
        monthsOver45hThisYear: s.months_over_45h_this_year, judgement: s.judgement,
        workedMinutes, reportedMinutes, diffMinutes: reportedMinutes - workedMinutes
      };
    });

    const config = await summaryRepo.getLaborAgreementConfig(tenantId);
    const summary = {
      employeeCount: items.length,
      totalWorkedMinutes: items.reduce((s, r) => s + r.workedMinutes, 0),
      totalOvertimeMinutes: items.reduce((s, r) => s + r.overtimeMinutes, 0),
      alertCount: items.filter(r => r.judgement && r.judgement !== 'normal').length
    };

    res.status(200).json({ year: y, month: m, items, summary, config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary/export.csv?year=&month=&dept=&userId=
exports.exportCsv = async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Missing year/month' });
    const tenantId = req.tenantId || null;
    const dept = req.query.dept ? String(req.query.dept) : '';
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const rows = await summaryRepo.listSummariesForMonth({ tenantId, year: y, month: m, dept, userId });

    const hm = (min) => {
      const n = Math.round(Number(min) || 0);
      const h = Math.floor(n / 60);
      const mm = n % 60;
      return `${h}:${String(mm).padStart(2, '0')}`;
    };
    const judgementLabel = (j) => j === 'exceeded' ? '超過' : j === 'caution' ? '注意' : '正常';
    const csvEsc = (v) => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = '社員番号,氏名,部署,出勤日数,実働,法定外残業,深夜,休日,年間時間外,判定\n';
    let csv = header;
    for (const s of rows) {
      csv += [
        csvEsc(s.employeeCode || ''),
        csvEsc(s.username || ''),
        csvEsc(s.departmentName || ''),
        csvEsc(s.attend_days || 0),
        csvEsc(hm((s.regular_minutes || 0) + (s.overtime_minutes || 0))),
        csvEsc(hm(s.overtime_minutes)),
        csvEsc(hm(s.night_minutes)),
        csvEsc(hm(s.holiday_work_minutes)),
        csvEsc(hm(s.annual_overtime_minutes)),
        csvEsc(judgementLabel(s.judgement))
      ].join(',') + '\n';
    }
    const filename = `legal_summary_${y}-${String(m).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary/export.xlsx?year=&month=&dept=&userId=
exports.exportXlsx = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m) return res.status(400).json({ message: 'Missing year/month' });
    const tenantId = req.tenantId || null;
    const dept = req.query.dept ? String(req.query.dept) : '';
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const month = `${y}-${String(m).padStart(2, '0')}`;

    const rows = await summaryRepo.listSummariesForMonth({ tenantId, year: y, month: m, dept, userId });

    const db = require('../../core/database/mysql');
    const tenantClause = tenantId ? 'AND u.tenant_id = ?' : '';
    const tenantParams = tenantId ? [tenantId] : [];

    const [reportRows] = await db.query(`
      SELECT wr.userId,
             COALESCE(SUM(CASE WHEN wr.start_time IS NOT NULL AND wr.end_time IS NOT NULL
               THEN TIME_TO_SEC(TIMEDIFF(wr.end_time, wr.start_time)) / 60 ELSE 0 END), 0) AS reportedMinutes
      FROM work_reports wr
      JOIN users u ON u.id = wr.userId
      WHERE DATE_FORMAT(wr.date, '%Y-%m') = ? ${tenantClause}
      GROUP BY wr.userId
    `, [month, ...tenantParams]);
    const reportedByUser = new Map((reportRows || []).map(r => [Number(r.userId), Math.round(Number(r.reportedMinutes) || 0)]));

    const normKubun = `REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '')`;
    const [paidRows] = await db.query(`
      SELECT ad.userId,
             SUM(CASE WHEN ${normKubun} = '有給休暇' THEN 1 WHEN ${normKubun} = '半休(有給)' THEN 0.5 ELSE 0 END) AS paidDays
      FROM attendance_daily ad
      JOIN users u ON u.id = ad.userId
      WHERE DATE_FORMAT(ad.date, '%Y-%m') = ? ${tenantClause}
      GROUP BY ad.userId
    `, [month, ...tenantParams]);
    const paidByUser = new Map((paidRows || []).map(r => [Number(r.userId), Number(r.paidDays) || 0]));

    const [absenceRows] = await db.query(`
      SELECT ad.userId, COUNT(*) AS absenceCount
      FROM attendance_daily ad
      JOIN users u ON u.id = ad.userId
      WHERE DATE_FORMAT(ad.date, '%Y-%m') = ? AND ${normKubun} = '欠勤' ${tenantClause}
      GROUP BY ad.userId
    `, [month, ...tenantParams]);
    const absenceByUser = new Map((absenceRows || []).map(r => [Number(r.userId), Number(r.absenceCount) || 0]));

    const [lateEarlyRows] = await db.query(`
      SELECT ad.userId, COUNT(*) AS lateEarlyCount
      FROM attendance_daily ad
      JOIN users u ON u.id = ad.userId
      WHERE DATE_FORMAT(ad.date, '%Y-%m') = ?
        AND (COALESCE(ad.late_minutes, 0) > 0 OR COALESCE(ad.early_minutes, 0) > 0)
        ${tenantClause}
      GROUP BY ad.userId
    `, [month, ...tenantParams]);
    const lateEarlyByUser = new Map((lateEarlyRows || []).map(r => [Number(r.userId), Number(r.lateEarlyCount) || 0]));

    const hm = (min) => {
      const n = Math.round(Number(min) || 0);
      const h = Math.floor(n / 60);
      const mm = n % 60;
      return `${h}:${String(mm).padStart(2, '0')}`;
    };
    const judgementLabel = (j) => j === 'exceeded' ? '超過' : j === 'caution' ? '注意' : '正常';

    const columns = [
      { header: '社員', width: 15 },
      { header: '部署', width: 13 },
      { header: '出勤日数', width: 10 },
      { header: '実働', width: 9 },
      { header: '法定外残業', width: 12 },
      { header: '深夜', width: 9 },
      { header: '休日', width: 9 },
      { header: '年間時間外累計', width: 14 },
      { header: '36協定判定', width: 11 },
      { header: '有給(日)', width: 10 },
      { header: '欠勤', width: 8 },
      { header: '遅刻・早退', width: 11 },
      { header: '報告時間', width: 10 },
      { header: '実働との差(分)', width: 13 }
    ];
    const xlsxRows = rows.map(s => {
      const workedMinutes = (s.regular_minutes || 0) + (s.overtime_minutes || 0);
      const reportedMinutes = reportedByUser.get(Number(s.user_id)) || 0;
      return [
        s.username || '',
        s.departmentName || '',
        s.attend_days || 0,
        hm(workedMinutes),
        hm(s.overtime_minutes),
        hm(s.night_minutes),
        hm(s.holiday_work_minutes),
        hm(s.annual_overtime_minutes),
        judgementLabel(s.judgement),
        paidByUser.get(Number(s.user_id)) || 0,
        absenceByUser.get(Number(s.user_id)) || 0,
        lateEarlyByUser.get(Number(s.user_id)) || 0,
        hm(reportedMinutes),
        reportedMinutes - workedMinutes
      ];
    });

    const HEADER_FILL = 'FFE74C3C';
    const ROW_FILL = 'FFFBE1E1';
    const BORDER_COLOR = 'FFE8B4B4';
    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`月次集計_${month}`.slice(0, 31));
    ws.columns = columns.map(c => ({ header: c.header, width: c.width }));
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const headerRow = ws.getRow(1);
    columns.forEach((c, ci) => {
      const cell = headerRow.getCell(ci + 1);
      cell.font = { name: 'MS Pゴシック', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });
    headerRow.height = 20;

    xlsxRows.forEach((cells, ri) => {
      const wsRow = ws.getRow(ri + 2);
      cells.forEach((v, ci) => {
        const cell = wsRow.getCell(ci + 1);
        cell.value = v;
        cell.font = { name: 'MS Pゴシック', size: 11, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_FILL } };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'left' : 'center' };
      });
    });

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    const buf = await workbook.xlsx.writeBuffer();
    const filename = `legal_summary_${month}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary/config
exports.getConfig = async (req, res) => {
  try {
    const config = await summaryRepo.getLaborAgreementConfig(req.tenantId || null);
    res.status(200).json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/attendance/summary/config (admin only)
exports.setConfig = async (req, res) => {
  try {
    await summaryRepo.setLaborAgreementConfig(req.tenantId || null, req.body || {});
    const config = await summaryRepo.getLaborAgreementConfig(req.tenantId || null);
    res.status(200).json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
