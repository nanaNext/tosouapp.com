'use strict';
/**
 * workReports.export.routes.js
 * Excel export handler for work reports (GET /export.xlsx).
 * Split from workReports.admin.routes.js for maintainability.
 */
const express = require('express');
const router = express.Router();
const { authorize } = require('../../core/middleware/authMiddleware');
const { rateLimitNamed } = require('../../core/middleware/rateLimit');
const repo = require('./workReports.repository');
const attendanceRepo = require('../attendance/attendance.repository');
const calendarRepo = require('../calendar/calendar.repository');
const db = require('../../core/database/mysql');
const s3Service = require('../../core/services/s3.service');

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const roleScopeSql = (req, alias = 'u') => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === 'manager') return ` AND ${alias}.role = 'employee'`;
  return '';
};

const weekdayJa = (dateStr) => {
  const s = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  const idx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return labels[idx] || '';
};

router.get('/export.xlsx',
  rateLimitNamed('workreports_export_xlsx', { windowMs: 60_000, max: 10 }),
  authorize('admin', 'manager'),
  async (req, res) => {
  try {
    const period = String(req.query?.period || 'day').toLowerCase();
    const qDate = String(req.query?.date || todayJST()).slice(0, 10);
    const qMonth = String(req.query?.month || qDate.slice(0, 7)).slice(0, 7);
    const qYear = parseInt(String(req.query?.year || qDate.slice(0, 4)), 10);

    const addDays = (dateStr, delta) => {
      const dt = new Date(String(dateStr).slice(0, 10) + 'T00:00:00Z');
      dt.setUTCDate(dt.getUTCDate() + delta);
      return dt.toISOString().slice(0, 10);
    };
    const lastDayOfMonth = (ym) => {
      const [y, m] = String(ym).split('-').map(n => parseInt(n, 10));
      return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    };
    const weekRange = (dateStr) => {
      const dt = new Date(String(dateStr).slice(0, 10) + 'T00:00:00Z');
      const dow = dt.getUTCDay();
      const diffToMon = (dow + 6) % 7;
      const start = addDays(dateStr, -diffToMon);
      const end = addDays(start, 6);
      return { start, end };
    };

    let start = qDate;
    let end = qDate;
    if (period === 'week') {
      const r = weekRange(qDate);
      start = r.start;
      end = r.end;
    } else if (period === 'month') {
      start = `${qMonth}-01`;
      end = lastDayOfMonth(qMonth);
    } else if (period === 'year') {
      const y = qYear || parseInt(qDate.slice(0, 4), 10);
      start = `${String(y).padStart(4, '0')}-01-01`;
      end = `${String(y).padStart(4, '0')}-12-31`;
    }

    const dates = (() => {
      const out = [];
      const d0 = new Date(start + 'T00:00:00Z');
      const d1 = new Date(end + 'T00:00:00Z');
      for (let t = d0.getTime(); t <= d1.getTime(); t += 24 * 60 * 60 * 1000) {
        out.push(new Date(t).toISOString().slice(0, 10));
      }
      return out;
    })();
    const yearsInRange = Array.from(new Set(dates.map(d => parseInt(String(d).slice(0, 4), 10)).filter(Boolean)));
    const calByYear = new Map();
    for (const y of yearsInRange) {
      const cal = await calendarRepo.computeYear(y).catch(() => null);
      calByYear.set(y, cal);
    }

    const HOLIDAY_TYPES = new Set(['jp_auto','jp_substitute','jp_bridge','fixed','custom']);
    const buildOffSet = (cal, isKouji) => {
      const detail = cal?.detail || [];
      const byDate = new Map();
      for (const it of detail) {
        const ds = String(it?.date || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
        if (!byDate.has(ds)) byDate.set(ds, []);
        byDate.get(ds).push({ type: String(it?.type || ''), is_off: Number(it?.is_off || 0) === 1 });
      }
      const off = new Set();
      for (const [ds, list] of byDate.entries()) {
        if (!isKouji) {
          if (list.some(x => x.is_off)) off.add(ds);
          continue;
        }
        const hasSunday = list.some(x => x.is_off && x.type === 'sunday');
        const has4thSaturday = list.some(x => x.is_off && x.type === 'saturday_4th');
        const hasHoliday = list.some(x => x.is_off && HOLIDAY_TYPES.has(x.type));
        if (hasSunday || has4thSaturday || hasHoliday) off.add(ds);
      }
      if (!off.size && Array.isArray(cal?.off_days) && !isKouji) {
        for (const ds of cal.off_days) off.add(String(ds).slice(0, 10));
      }
      return off;
    };

    const isOffDate = (dateStr, deptName) => {
      const isKouji = String(deptName || '').includes('工事部');
      const y = parseInt(String(dateStr).slice(0, 4), 10);
      const cal = calByYear.get(y);
      if (!cal) return false;
      // Note: we can cache the sets by (y, isKouji)
      const cacheKey = `${y}_${isKouji}`;
      if (!calByYear.has(cacheKey)) {
        calByYear.set(cacheKey, buildOffSet(cal, isKouji));
      }
      return calByYear.get(cacheKey).has(String(dateStr).slice(0, 10));
    };

    const [users] = await db.query(`
      SELECT u.id AS userId, u.employee_code AS employeeCode, u.username AS username,
             d.name AS departmentName, u.birth_date AS birthDate, u.employment_type AS employmentType
      FROM users u
      LEFT JOIN departments d ON d.id = u.departmentId
      WHERE u.employment_status = 'active'
        ${roleScopeSql(req, 'u')}
      ORDER BY COALESCE(u.employee_code, '') ASC, u.id ASC
    `);

    const [attRows] = await db.query(`
      SELECT a.userId, DATE(COALESCE(a.checkIn, a.checkOut)) AS date, a.checkIn, a.checkOut, a.work_type AS work_type
      FROM attendance a
      INNER JOIN (
        SELECT userId, DATE(COALESCE(checkIn, checkOut)) AS date, MAX(COALESCE(checkIn, checkOut)) AS maxTime
        FROM attendance
        WHERE DATE(COALESCE(checkIn, checkOut)) >= ? AND DATE(COALESCE(checkIn, checkOut)) <= ?
        GROUP BY userId, DATE(COALESCE(checkIn, checkOut))
      ) t
        ON t.userId = a.userId AND t.maxTime = COALESCE(a.checkIn, a.checkOut)
    `, [start, end]);

    const [attFullRows] = await db.query(`
      SELECT userId, DATE(COALESCE(checkIn, checkOut)) AS date, location, memo
      FROM attendance
      WHERE DATE(COALESCE(checkIn, checkOut)) >= ? AND DATE(COALESCE(checkIn, checkOut)) <= ?
    `, [start, end]);

    const [repRows] = await db.query(`
      SELECT userId, date, site, work, work_type
      FROM work_reports
      WHERE date >= ? AND date <= ?
    `, [start, end]);

    const [dailyRows] = await db.query(`
      SELECT userId, date, kubun, location, memo, late_minutes, early_minutes, reason
      FROM attendance_daily
      WHERE date >= ? AND date <= ?
    `, [start, end]);

    const [leaveRows] = await db.query(`
      SELECT userId, startDate, endDate, type
      FROM leave_requests
      WHERE status = 'approved'
        AND endDate >= ? AND startDate <= ?
    `, [start, end]);

    const [shiftRows] = await db.query(`
      SELECT userId, date, status
      FROM shift_requests
      WHERE date >= ? AND date <= ?
    `, [start, end]);
    
    const [userAssignRows] = await db.query(`
      SELECT userId, start_date
      FROM user_shift_assignments
      WHERE start_date >= ? AND start_date <= ?
    `, [start, end]);

    const attMap = new Map();
    for (const a of (attRows || [])) {
      const d = String(a.date || a.checkIn || a.checkOut || '').slice(0, 10);
      attMap.set(`${a.userId}|${d}`, a);
    }
    const attConcatMap = new Map();
    for (const a of (attFullRows || [])) {
      const d = String(a.date || '').slice(0, 10);
      const key = `${a.userId}|${d}`;
      if (!attConcatMap.has(key)) {
        attConcatMap.set(key, { location: [], memo: [] });
      }
      const mapObj = attConcatMap.get(key);
      const loc = String(a.location || '').trim();
      const mem = String(a.memo || '').trim();
      if (loc) mapObj.location.push(loc);
      if (mem) mapObj.memo.push(mem);
    }
    const repMap = new Map();
    for (const r of (repRows || [])) {
      repMap.set(`${r.userId}|${String(r.date).slice(0, 10)}`, r);
    }
    const dailyMap = new Map();
    for (const d of (dailyRows || [])) {
      dailyMap.set(`${d.userId}|${String(d.date).slice(0, 10)}`, d);
    }
    const leaveByUser = new Map();
    for (const lr of (leaveRows || [])) {
      const uid = Number(lr.userId);
      if (!leaveByUser.has(uid)) leaveByUser.set(uid, []);
      leaveByUser.get(uid).push({ start: String(lr.startDate).slice(0, 10), end: String(lr.endDate).slice(0, 10), type: String(lr.type || '') });
    }
    const shiftMap = new Map();
    for (const sr of (shiftRows || [])) {
      shiftMap.set(`${sr.userId}|${String(sr.date).slice(0, 10)}`, sr.status);
    }
    for (const ua of (userAssignRows || [])) {
      // Treat user assignments as 'WORKING' for Baito
      shiftMap.set(`${ua.userId}|${String(ua.start_date).slice(0, 10)}`, 'WORKING');
    }
    const isOnLeave = (uid, dateStr) => {
      const arr = leaveByUser.get(Number(uid));
      if (!arr || !arr.length) return null;
      for (const it of arr) {
        if (dateStr >= it.start && dateStr <= it.end) return it;
      }
      return null;
    };

    const fmtHm = (dt) => {
      if (!dt) return '';
      const s = String(dt);
      return s.length >= 16 ? s.slice(11, 16) : s;
    };
    const dowJa = (dateStr) => {
      try {
        const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(x => parseInt(x, 10));
        const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
        return ['日','月','火','水','木','金','土'][dt.getUTCDay()];
      } catch {
        return '';
      }
    };
    const wtLabel = (wt) => wt === 'onsite' ? '出社' : wt === 'remote' ? '在宅' : wt === 'satellite' ? '現場' : '';
    const leaveLabel = (t) => {
      const s = String(t || '').toLowerCase();
      if (s === 'paid') return '有給';
      if (s === 'sick') return '病欠';
      if (s === 'overtime') return '残業';
      return '休暇';
    };

    const buildRow = (u, d) => {
      const uid = Number(u.userId);
      const code = u.employeeCode || `EMP${String(uid).padStart(3, '0')}`;
      const name = u.username || '';
      const dept = u.departmentName || '';
      const leave = isOnLeave(uid, d);
      const att = attMap.get(`${uid}|${d}`) || null;
      const attConcat = attConcatMap.get(`${uid}|${d}`) || null;
      const rep = repMap.get(`${uid}|${d}`) || null;
      const daily = dailyMap.get(`${uid}|${d}`) || null;
      const wt = String(rep?.work_type || att?.work_type || '').trim();
      let status = '';
      let cin = '';
      let cout = '';
      
      let isOff = isOffDate(d, dept);
      
      const isPartTime = u.employmentType === 'part_time' || u.employment_type === 'part_time';
      if (isPartTime) {
        const shiftStatus = shiftMap.get(`${uid}|${d}`);
        if (shiftStatus === 'WORKING' || shiftStatus === 'approved') {
          isOff = false;
        } else if (shiftStatus === 'OFF') {
          isOff = true;
        } else {
          isOff = false; // default to working so they get 未 if no punch and no explicitly 休日 applied
        }
      }

      if (daily?.kubun === '休日' || daily?.kubun === '所定休日' || daily?.kubun === '休み') {
        isOff = true;
      } else if (isPartTime && !daily?.kubun && isOffDate(d, dept)) {
        isOff = false; // Part-time doesn't inherit company off-days unless explicitly set
      }

      const today = todayJST();
      if (leave) {
        status = leaveLabel(leave.type);
      } else if (daily?.kubun === '欠勤') {
        status = '欠勤';
        isOff = true; // Mark as "off" in row structure so it gets red text color
      } else if (daily?.kubun === '半休' || daily?.kubun === '半休(有給)') {
        status = daily.kubun;
        cin = fmtHm(att?.checkIn);
        cout = fmtHm(att?.checkOut);
      } else if (daily?.kubun === '有給休暇') {
        status = '有給';
      } else if (daily?.kubun === '無給休暇') {
        status = '無給休暇';
      } else if (daily?.kubun === '代替休日') {
        status = '代替休日';
        isOff = true;
      } else if (daily?.kubun === '振替出勤' || daily?.kubun === '代替出勤') {
        status = daily.kubun;
        cin = fmtHm(att?.checkIn);
        cout = fmtHm(att?.checkOut);
      } else if (!att?.checkIn && isOff && (!isPartTime || (daily?.kubun === '休日' || daily?.kubun === '所定休日' || daily?.kubun === '休み'))) {
        status = '休日';
      } else if (!att?.checkIn && isPartTime && d > today && !daily?.kubun) {
        status = ''; // Don't show anything for pure future days in export
      } else if (!att?.checkIn && isPartTime) {
        status = '未';
      } else if (!att?.checkIn && !isOff && d <= today) {
        status = '未';
      } else if (!att?.checkIn && !isOff && d > today) {
        status = '';
      } else if (att?.checkIn) {
        status = att?.checkOut ? (isOff ? '休日出勤' : '出勤') : (isOff ? '休日出勤' : '出勤');
        cin = fmtHm(att.checkIn);
        cout = fmtHm(att.checkOut);
      } else if (!isOff) {
        status = '出勤';
      }
      return {
        uid,
        code,
        name,
        dept,
        wt,
        wtText: wtLabel(wt),
        status,
        cin,
        cout,
        site: isOff && !att?.checkIn && !daily?.location && !rep?.site && (!attConcat || !attConcat.location.length) ? '' : (attConcat && attConcat.location.length > 0 ? attConcat.location.join(' / ') : String(daily?.location || att?.location || rep?.site || '')),
        work: isOff && !att?.checkIn && !daily?.memo && !rep?.work && (!attConcat || !attConcat.memo.length) ? '' : (attConcat && attConcat.memo.length > 0 ? attConcat.memo.join(' / ') : String(daily?.memo || att?.memo || rep?.work || '')),
        lateMinutes: daily?.late_minutes || 0,
        earlyMinutes: daily?.early_minutes || 0,
        reason: daily?.reason || '',
        isOff: isOff
      };
    };

    const safeFile = (s) => String(s || '').replace(/[\\\/:*?"<>|]/g, '_');
    const fileName = safeFile(`attendance_${period}_${start}_${end}.xlsx`);

    const { buildXlsx, buildXlsxBook } = require('../../utils/xlsx');

    if (period === 'week') {
      const mmdd = (d) => String(d).slice(5, 10).replace('-', '/');
      const weekCol = (d) => `${dowJa(d)}(${mmdd(d)})`;
      const summaryColumns = [
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 14 },
        { header: '部署', width: 22 },
        ...dates.map(d => ({ header: weekCol(d), width: 22 }))
      ];
      const summaryRows = (users || []).map(u => {
        const uid = Number(u.userId);
        const code = u.employeeCode || `EMP${String(uid).padStart(3, '0')}`;
        const name = u.username || '';
        const dept = u.departmentName || '';
        const dayCells = dates.map(d => {
          const r = buildRow(u, d);
      if (r.status === '欠勤') {
        return '欠勤';
      }
      if (r.status === '休日') return '休日';
      const t1 = r.status ? r.status : '';
      const t2 = r.wtText ? r.wtText : '';
      const t3 = r.cin || r.cout ? `${r.cin || ''}${r.cout ? '-' + r.cout : ''}` : '';
      const t4 = r.site ? r.site : '';
      return [t1, t2, t4].filter(Boolean).join('\n');
        });
        return { isOff: false, cells: [code, name, dept, ...dayCells] };
      });

      const dayColumns = [
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 14 },
        { header: '部署', width: 22 },
        { header: '勤務区分', width: 12 },
        { header: '出社', width: 8 },
        { header: '在宅', width: 8 },
        { header: '現場', width: 10 },
        { header: '現場（任意）', width: 18 },
        { header: '作業内容', width: 52 }
      ];
      const sheets = [
        { name: `週次サマリー ${start}`, columns: summaryColumns, rows: summaryRows }
      ];
      for (const d of dates) {
        const dayRows = (users || []).map(u => {
          const r = buildRow(u, d);
          return {
            isOff: r.isOff,
            cells: [
              r.code,
              r.name,
              r.dept,
              r.status || '',
              r.wt === 'onsite' ? '✓' : '',
              r.wt === 'remote' ? '✓' : '',
              r.wt === 'satellite' ? '✓' : '',
              r.site || '',
              r.work || ''
            ]
          };
        });
        sheets.push({ name: `${mmdd(d)} ${dowJa(d)}`, columns: dayColumns, rows: dayRows });
      }

      const buf = await buildXlsxBook({ sheets });
      
      // Auto save to Cloudflare R2
      try {
        if (s3Service.isR2Configured()) {
          const timestamp = Date.now();
          const r2Key = `exports/work_reports/${fileName.replace('.xlsx', '')}_${timestamp}.xlsx`;
          await s3Service.uploadToR2(r2Key, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          console.log(`[Admin] Auto-saved weekly work report export to R2: ${r2Key}`);
        }
      } catch (e) {
        console.error('Failed to auto-save weekly work report export to R2:', e);
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.status(200).send(buf);
      return;
    }

    let buf;

    // Disable redirect to single-sheet export, always use full multi-sheet export for month period
    // if (period === 'month' && (req.query.sort || req.query.dept || req.query.q || req.query.group)) {
    //   return res.redirect(`/api/admin/work-reports/month/export-table?${new URLSearchParams(req.query).toString()}`);
    // }

    if (period === 'month') {
      const dayNumbers = dates.map(d => parseInt(String(d).slice(8, 10), 10));
      const s1Cols_all = [
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 16 },
        { header: '生年月日', width: 14 },
        { header: '部署', width: 18 },
        { header: '雇用形態', width: 12 },
        { header: '所定労働日数', width: 14 },
        { header: '所定労働時間', width: 14 },
        { header: '', width: 2, headerStyle: 'empty' },
        { header: '【色分けの凡例】', width: 12, headerStyle: 'legendHeader' },
        { header: '', width: 24, headerStyle: 'legendHeader' }
      ];

      const s1Cols_type = [
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 16 },
        { header: '生年月日', width: 14 },
        { header: '部署', width: 18 },
        { header: '雇用形態', width: 12 },
        ...dayNumbers.map(n => ({ header: `${n}日`, width: 6 })),
        { header: '出勤日数', width: 10 },
        { header: '遅刻回数', width: 10 },
        { header: '合計時間', width: 12 }
      ];

      const s2Cols = [
        { header: '日付', width: 12 },
        { header: '曜日', width: 6 },
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 16 },
        { header: '勤務区分', width: 12 },
        { header: '出社時間', width: 12 },
        { header: '退社時間', width: 12 },
        { header: '現場', width: 20 },
        { header: '作業内容', width: 60 },
        { header: '遅刻', width: 8 },
        { header: '稼働時間', width: 10 }
      ];

      const s1Rows_all = [];
      const s1Rows_full = [];
      const s1Rows_part = [];

      const s2Rows_full = [];
      const s2Rows_part = [];

      const dailyPresentCount_all = new Array(dates.length).fill(0);
      const dailyPresentCount_full = new Array(dates.length).fill(0);
      const dailyPresentCount_part = new Array(dates.length).fill(0);

      const getColName = (n) => {
        let s = '';
        while (n > 0) {
          const r = (n - 1) % 26;
          s = String.fromCharCode(65 + r) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };

      const userRows_all = [];

      for (const u of (users || [])) {
        const uid = Number(u.userId);
        const code = u.employeeCode || `EMP${String(uid).padStart(3, '0')}`;
        const name = u.username || '';
        const dob = u.birthDate ? String(u.birthDate).slice(0, 10).replace(/-/g, '/') : '';
        const dept = u.departmentName || '';
        const isPartTime = u.employmentType === 'part_time';
        const empType = isPartTime ? 'アルバイト' : '正社員';

        const s1Cells_all = [code, name, dob, dept, empType];
        const s1Cells_type = [code, name, dob, dept, empType];
        let workedDays = 0;
        let lateCount = 0;
        let totalHours = 0;
        let expectedWorkDays = 0;

        for (let di = 0; di < dates.length; di++) {
          const d = dates[di];
          const r = buildRow(u, d);
          if (!r.isOff) expectedWorkDays++;
          
          let cellValue = '';
          let cellStyle = 'cell';
          let isLate = 0;
          let h = 0;

          if (r.status === '出勤' || r.status === '休日出勤' || r.status === '欠勤') {
            const cin = r.cin || '';
            const cout = r.cout || '';
            
            if (r.status === '欠勤') {
              cellValue = '欠勤';
              cellStyle = 'absentText'; // Usually red or blue
            } else if (!cin && !cout && r.status === '出勤') {
              cellValue = '未';
              cellStyle = 'absentText'; // Blue text
            } else {
              cellValue = '出勤';
              cellStyle = 'present'; // Green text, white bg
              
              if (cin && cout) {
                const [h1, m1] = cin.split(':').map(Number);
                const [h2, m2] = cout.split(':').map(Number);
                h = (h2 + m2/60) - (h1 + m1/60);
                if (h >= 6) h -= 1; // Auto subtract 1h break if >= 6 hours
                if (h > 0) totalHours += h;
              }

              if (!isPartTime) {
                const lateThreshold = dept.includes('工事') ? '08:00' : '09:00';
                if (cin && cin > lateThreshold) {
                  isLate = 1;
                  lateCount++;
                  cellStyle = 'late'; // Green text, yellow bg
                }
              }
              workedDays++;
              dailyPresentCount_all[di]++;
              if (isPartTime) dailyPresentCount_part[di]++;
              else dailyPresentCount_full[di]++;
            }
          } else if (r.status === '有給' || r.status === '休暇' || r.status === '病欠') {
            cellValue = r.status;
            cellStyle = 'paidLeave'; // Green text, White background
          } else if (r.status === '休日') {
            cellValue = '休日';
            cellStyle = 'weekend'; // Red text
          } else {
            if (!r.isOff) {
               cellValue = '未';
               cellStyle = 'absentText'; // Blue text
            } else {
               cellValue = '';
               cellStyle = 'weekend'; // Actually empty, weekend style is fine
            }
          }

          s1Cells_type.push({ v: cellValue, s: cellStyle });

          if (r.status === '出勤' || r.status === '休日出勤' || r.work || r.site || r.cin || r.cout) {
             const rowData = {
               cells: [ d, dowJa(d), code, name, r.status || '', r.cin || '', r.cout || '', r.site || '', r.work || '', { v: isLate, t: 'n' }, { v: Math.round(Math.max(0, h) * 10) / 10, t: 'n' } ]
             };
             if (isPartTime) s2Rows_part.push(rowData);
             else s2Rows_full.push(rowData);
          }
        }

        if (isPartTime) {
          s1Cells_all.push('-', '-'); // No expected hours for part-time
        } else {
          s1Cells_all.push(expectedWorkDays, expectedWorkDays * 8); // 8 hours per day for full-time
        }

        const lastDayColLetter = getColName(5 + dates.length);
        const rowIdx = (isPartTime ? s1Rows_part.length : s1Rows_full.length) + 2;
        s1Cells_type.push({ v: '', s: 'empty' }); // Spacer column
        s1Cells_type.push({ v: `COUNTIF(F${rowIdx}:${lastDayColLetter}${rowIdx}, "出勤")`, f: true, s: 'cell' });
        
        const sheetName = isPartTime ? `アルバイト詳細_${qMonth}` : `正社員詳細_${qMonth}`;
        s1Cells_type.push({ v: `SUMIF('${sheetName}'!C:C, A${rowIdx}, '${sheetName}'!J:J)`, f: true, s: 'cell' });
        s1Cells_type.push({ v: `SUMIF('${sheetName}'!C:C, A${rowIdx}, '${sheetName}'!K:K)`, f: true, s: 'cell' });
        
        userRows_all.push(s1Cells_all);
        if (isPartTime) s1Rows_part.push({ cells: [...s1Cells_type] });
        else s1Rows_full.push({ cells: [...s1Cells_type] });
      }

      userRows_all.push([ { v: '合計', s: 'headerGrey' }, { v: `社員数: ${users.length}名`, s: 'headerGrey' }, { v: '', s: 'headerGrey' }, { v: '', s: 'headerGrey' }, { v: '', s: 'headerGrey' }, { v: '', s: 'headerGrey' }, { v: '', s: 'headerGrey' } ]);

      const legendData = [
        [{ v: '未', s: 'absentText' }, { v: '未打刻（出勤予定日）', s: 'legend' }],
        [{ v: '休日', s: 'weekend' }, { v: '所定休日', s: 'legend' }],
        [{ v: '出勤', s: 'present' }, { v: '定時出勤', s: 'legend' }],
        [{ v: '有給', s: 'paidLeave' }, { v: '休暇取得', s: 'legend' }],
        [{ v: '出勤', s: 'late' }, { v: '遅刻', s: 'legend' }],
        [{ v: '半休', s: 'present' }, { v: '半日出勤', s: 'legend' }],
        [{ v: '半休(有給)', s: 'paidLeave' }, { v: '半日有給', s: 'legend' }],
        [{ v: '休日出勤', s: 'present' }, { v: '休日に出勤', s: 'legend' }],
        [{ v: '欠勤', s: 'absentText' }, { v: '無断欠勤', s: 'legend' }],
        [{ v: '代替休日', s: 'weekend' }, { v: '振替休日', s: 'legend' }],
        [{ v: '無給休暇', s: 'weekend' }, { v: '無給の休暇', s: 'legend' }]
      ];

      const maxRows = Math.max(userRows_all.length, legendData.length);
      for (let i = 0; i < maxRows; i++) {
        const rowCells = userRows_all[i] ? [...userRows_all[i]] : ['', '', '', '', '', '', ''];
        while (rowCells.length < 7) rowCells.push('');
        
        rowCells.push(''); // Spacer H
        if (i < legendData.length) {
          rowCells.push(legendData[i][0], legendData[i][1]);
        }
        s1Rows_all.push({ cells: rowCells });
      }

      const buildBottomRow = (countArr, countStr, rowsCount) => {
        const bottomRowCells = [
          { v: '合計', s: 'headerGrey' },
          { v: countStr, s: 'headerGrey' },
          { v: '', s: 'headerGrey' },
          { v: '', s: 'headerGrey' },
          { v: '', s: 'headerGrey' }
        ];
        for (let di = 0; di < dates.length; di++) {
          const colLetter = getColName(6 + di); // F is 6
          const formula = `COUNTIF(${colLetter}2:${colLetter}${rowsCount + 1}, "出勤") & "名"`;
          bottomRowCells.push({ v: formula, f: true, s: 'headerGrey' });
        }
        return { cells: bottomRowCells };
      };

      s1Rows_full.push(buildBottomRow(dailyPresentCount_full, `社員数: ${s1Rows_full.length}名`, s1Rows_full.length));
      s1Rows_part.push(buildBottomRow(dailyPresentCount_part, `社員数: ${s1Rows_part.length}名`, s1Rows_part.length));

      buf = await buildXlsxBook({
        sheets: [
          { name: `全社員サマリー_${qMonth}`, columns: s1Cols_all, rows: s1Rows_all, headerStyleKey: 'header' },
          { name: `正社員サマリー_${qMonth}`, columns: s1Cols_type, rows: s1Rows_full, headerStyleKey: 'header' },
          { name: `アルバイトサマリー_${qMonth}`, columns: s1Cols_type, rows: s1Rows_part, headerStyleKey: 'header' },
          { name: `正社員詳細_${qMonth}`, columns: s2Cols, rows: s2Rows_full, headerStyleKey: 'header' },
          { name: `アルバイト詳細_${qMonth}`, columns: s2Cols, rows: s2Rows_part, headerStyleKey: 'header' }
        ]
      });
    } else {
      const rows = [];
      for (const d of dates) {
        for (const u of (users || [])) {
          const r = buildRow(u, d);
          rows.push({
            isOff: r.isOff,
            cells: [
              d,
              dowJa(d),
              r.code,
              r.name,
              r.dept,
              r.status,
              r.wt === 'onsite' ? '✓' : '',
              r.wt === 'remote' ? '✓' : '',
              r.wt === 'satellite' ? '✓' : '',
              r.site,
              r.work,
              r.lateMinutes > 0 ? r.lateMinutes : '',
              r.earlyMinutes > 0 ? r.earlyMinutes : '',
              r.reason
            ]
          });
        }
      }

      const columns = [
        { header: '日付', width: 12 },
        { header: '曜日', width: 6 },
        { header: '社員番号', width: 12 },
        { header: '氏名', width: 14 },
        { header: '部署', width: 22 },
        { header: '勤務区分', width: 12 },
        { header: '出社', width: 8 },
        { header: '在宅', width: 8 },
        { header: '現場', width: 10 },
        { header: '現場（任意）', width: 18 },
        { header: '作業内容', width: 52 },
        { header: '遅刻', width: 8 },
        { header: '早退', width: 8 },
        { header: '理由', width: 15 }
      ];

      const baseName = period === 'year' ? `年次_${qYear}` : `日次_${start}`;
      buf = await buildXlsx({ sheetName: baseName, columns, rows });
    }
    
    // Auto save to Cloudflare R2
    try {
      if (s3Service.isR2Configured()) {
        const timestamp = Date.now();
        const r2Key = `exports/work_reports/${fileName.replace('.xlsx', '')}_${timestamp}.xlsx`;
        await s3Service.uploadToR2(r2Key, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        console.log(`[Admin] Auto-saved work report export to R2: ${r2Key}`);
      }
    } catch (e) {
      console.error('Failed to auto-save work report export to R2:', e);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
