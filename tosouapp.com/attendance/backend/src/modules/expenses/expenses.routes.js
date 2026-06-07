const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { rateLimitNamed } = require('../../core/middleware/rateLimit');
const repo = require('./expenses.repository');
const auditRepo = require('../audit/audit.repository');
const noticesRepo = require('../notices/notices.repository');
const expenseTypesRepo = require('./expenseTypes.repository');
router.use(authenticate);
router.get('/types',
  rateLimitNamed('expenses_types', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const rows = await expenseTypesRepo.list();
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/',
  rateLimitNamed('expenses_create', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const b = req.body || {};
      const date = String(b.date || '').slice(0, 10);
      const type = String(b.type || '').trim().toLowerCase() || null;
      const origin = String(b.origin || '').trim();
      const via = String(b.via || '').trim() || null;
      const destination = String(b.destination || '').trim();
      const baseAmount = parseFloat(String(b.amount || '0'));
      const memo = String(b.memo || '').trim();
      const purpose = String(b.purpose || '').trim();
      const teiki = !!b.teiki;
      const km = b.km == null ? null : parseFloat(String(b.km));
      const unitPricePerKm = b.unitPricePerKm == null ? null : parseFloat(String(b.unitPricePerKm));
      const tripType = String(b.tripType || '').trim().toLowerCase() || null;
      const tripCount = b.tripCount == null ? 1 : parseInt(String(b.tripCount), 10);
      const commuterPass = !!b.commuterPass;
      const receiptUrl = String(b.receiptUrl || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Invalid date' });
      let amt = baseAmount;
      if (type === 'car') {
        const dist = km == null ? 0 : km;
        const unit = unitPricePerKm == null ? 0 : unitPricePerKm;
        if (dist > 0 && unit > 0) amt = dist * unit;
      }
      if (tripType === 'round_trip') amt = amt * 2;
      else if (tripType === 'multi') amt = amt * (tripCount > 0 ? tripCount : 1);
      if (!(amt >= 0)) return res.status(400).json({ message: 'Invalid amount' });
      const id = await repo.create({ userId: req.user.id, date, origin, via, destination, amount: amt, memo, type, purpose, teiki, receiptUrl, km, category: type, tripType, tripCount, unitPricePerKm, commuterPass, clientToken: b.clientToken });
      try { await auditRepo.writeLog({ userId: req.user.id, action: 'expense_create', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ id, date, amount: amt, origin, destination }) }); } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/my',
  rateLimitNamed('expenses_list', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const status = req.query.status ? String(req.query.status) : null;
      const type = req.query.type ? String(req.query.type).toLowerCase() : null;
      const rows = await repo.listMineAdvanced({ userId: req.user.id, month: (month && /^\d{4}-\d{2}$/.test(month)) ? month : null, status, type });
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/export.csv',
  rateLimitNamed('expenses_export_csv', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const status = req.query.status ? String(req.query.status) : null;
      const type = req.query.type ? String(req.query.type).toLowerCase() : null;
      const rows = await repo.listMineAdvanced({ userId: req.user.id, month: (month && /^\d{4}-\d{2}$/.test(month)) ? month : null, status, type });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="expenses_${month || 'all'}.csv"`);
      const header = ['date','route','type','amount','status','memo'];
      const csv = [header.join(',')].concat((rows || []).map(r => {
        const route = [r.origin || '', r.destination || ''].filter(Boolean).join(' → ');
        const t = String(r.category || '');
        const a = Number(r.amount || 0);
        const st = String(r.status || '');
        const memo = (r.memo || '').replace(/"/g,'""');
        // Prevent CSV Injection (starts with =, +, -, @)
        const safeRoute = /^[=\+\-\@]/.test(route) ? "'" + route : route;
        const safeMemo = /^[=\+\-\@]/.test(memo) ? "'" + memo : memo;
        return [r.date ? String(r.date).slice(0,10) : '', `"${safeRoute}"`, t, a, st, `"${safeMemo}"`].join(',');
      })).join('\n');
      res.status(200).send('\uFEFF' + csv);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/receipt',
  rateLimitNamed('expenses_receipt_upload', { windowMs: 60_000, max: 6 }),
  authorize('employee','manager','admin'),
  require('../../core/middleware/upload').single('file'),
  async (req, res) => {
    try {
      const f = req.file;
      if (!f) return res.status(400).json({ message: 'No file' });
      const url = `/uploads/${f.filename}`;
      res.status(201).json({ url });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/list',
  rateLimitNamed('expenses_admin_list', { windowMs: 60_000, max: 30 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const result = await repo.listAllPaged({
        month: (month && /^\d{4}-\d{2}$/.test(month)) ? month : null,
        page: req.query.page,
        limit: req.query.limit,
        departmentId: req.query.departmentId,
        userId: req.query.userId,
        employmentType: req.query.employmentType,
        name: req.query.name,
        status: req.query.status ? String(req.query.status) : null,
        minAmount: req.query.minAmount,
        maxAmount: req.query.maxAmount,
        approverId: req.query.approverId,
        sortBy: req.query.sortBy,
        sortDir: req.query.sortDir
      });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/dashboard',
  rateLimitNamed('expenses_admin_dashboard', { windowMs: 60_000, max: 30 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const months = req.query.months;
      const result = await repo.getAdminDashboard({ month: (month && /^\d{4}-\d{2}$/.test(month)) ? month : null, months });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/detail/:id',
  rateLimitNamed('expenses_admin_detail', { windowMs: 60_000, max: 60 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const row = await repo.getAdminDetailById(id);
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.status(200).json(row);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/export.csv',
  rateLimitNamed('expenses_admin_export_csv', { windowMs: 60_000, max: 12 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const result = await repo.listAllPaged({
        month: (month && /^\d{4}-\d{2}$/.test(month)) ? month : null,
        page: 1,
        limit: 1000,
        departmentId: req.query.departmentId,
        userId: req.query.userId,
        employmentType: req.query.employmentType,
        name: req.query.name,
        status: req.query.status,
        minAmount: req.query.minAmount,
        maxAmount: req.query.maxAmount,
        approverId: req.query.approverId,
        sortBy: req.query.sortBy,
        sortDir: req.query.sortDir
      });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      
      const statusMap = {
        'applied': '承認待ち',
        'approved': '承認済',
        'rejected': '差戻し',
        'draft': '下書き',
        'pending': '未申請'
      };
      
      const empMap = {
        'full_time': '正社員',
        'part_time': 'アルバイト',
        'contract': '契約社員',
        'outsourced': '業務委託'
      };

      const csvHead = ['日付','申請者','社員番号','部署','雇用形態','区間/経路','金額(円)','ステータス','承認者'].join(',');
      const csvBody = rows.map((r) => {
        const route = [r.origin || '', r.destination || ''].filter(Boolean).join(' → ');
        // Prevent CSV Injection
        const safeRoute = /^[=\+\-\@]/.test(route) ? "'" + route : route;
        const st = statusMap[String(r.status || '').toLowerCase()] || r.status || '';
        const emp = empMap[String(r.employment_type || '').toLowerCase()] || r.employment_type || '';
        const dept = r.department_name || r.departmentId || '未設定';
        
        return [
          esc(String(r.date || '').slice(0,10)),
          esc(r.user_name || r.user_email || ''),
          esc(r.employee_code || ''),
          esc(dept),
          esc(emp),
          esc(safeRoute),
          esc(Number(r.amount || 0)),
          esc(st),
          esc(r.approver_name || '')
        ].join(',');
      }).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="expenses_admin_${month || 'all'}.csv"`);
      res.status(200).send('\uFEFF' + csvHead + '\n' + csvBody);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/monthly-summary',
  rateLimitNamed('expenses_admin_monthly_summary', { windowMs: 60_000, max: 30 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const userIdRaw = String(req.query.userId || '').trim();
      const userId = userIdRaw || null;
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      const [totals, closures] = await Promise.all([
        repo.getMonthlyApprovedTotals(month, userId),
        repo.getMonthlyClosures(month, userId)
      ]);
      res.status(200).json({ month, totals: totals || [], closures: closures || [] });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/admin/monthly-close',
  rateLimitNamed('expenses_admin_monthly_close', { windowMs: 60_000, max: 10 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.body?.month || '').slice(0, 7);
      const forceRecalc = !!req.body?.forceRecalc;
      const userIdRaw = String(req.body?.userId || '').trim();
      const userId = userIdRaw || null;
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      const result = await repo.closeMonthlyApprovedTotals({
        month,
        closedBy: req.user.id,
        forceRecalc,
        userId
      });
      const closures = await repo.getMonthlyClosures(month);
      res.status(200).json({ ok: true, result, closures: closures || [] });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/admin/months/approve',
  rateLimitNamed('expenses_admin_months_approve', { windowMs: 60_000, max: 20 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const { userId, month } = req.body || {};
      if (!userId || !month) return res.status(400).json({ message: 'Missing userId or month' });
      const result = await repo.approveMonthByAdmin({ userId, month, approverId: req.user.id });
      try {
        await noticesRepo.createNotice({
          targetUserId: userId,
          targetMonth: month,
          message: `${month}の交通費申請が月次承認されました。`,
          createdBy: req.user.id
        });
      } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      res.status(200).json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get('/admin/monthly-history',
  rateLimitNamed('expenses_admin_monthly_history', { windowMs: 60_000, max: 30 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || '12'), 10);
      const userIdRaw = String(req.query.userId || '').trim();
      const userId = userIdRaw || null;
      const rows = await repo.listMonthlyClosureHistory({
        userId,
        limit: Number.isFinite(limit) ? limit : 12
      });
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/months/active',
  rateLimitNamed('expenses_active_month', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const r = await repo.getActiveMonth(req.user.id);
      res.status(200).json(r || null);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/months/start',
  rateLimitNamed('expenses_start_month', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.body?.month || '').slice(0,7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      const r = await repo.startMonth(req.user.id, month);
      res.status(201).json(r || null);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post('/months/delete',
  rateLimitNamed('expenses_delete_month', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.body?.month || '').slice(0,7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      // Call the repository function
      const ok = await repo.deleteMonth(req.user.id, month);
      if (!ok) return res.status(404).json({ message: 'Month not found or cannot be deleted' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get('/months/my',
  rateLimitNamed('expenses_my_months', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const rows = await repo.listMonths(req.user.id);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.get('/months/profile',
  rateLimitNamed('expenses_month_profile_get', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      const row = await repo.getMonthProfile(req.user.id, month);
      if (!row) return res.status(404).json({ message: 'Not found' });
      res.status(200).json(row);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post('/months/profile',
  rateLimitNamed('expenses_month_profile_post', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const b = req.body || {};
      const row = await repo.upsertMonthProfile({
        userId: req.user.id,
        month: b.month,
        employeeName: b.employeeName,
        employeeCode: b.employeeCode,
        birthDate: b.birthDate,
        startDate: b.startDate
      });
      res.status(200).json(row);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post('/months/apply',
  rateLimitNamed('expenses_apply_month', { windowMs: 60_000, max: 10 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.body?.month || '').slice(0,7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month' });
      const ok = await repo.applyMonth(req.user.id, month);
      if (!ok) return res.status(404).json({ message: 'Month not found or cannot be applied' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/months/applied',
  rateLimitNamed('expenses_latest_applied_month', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const r = await repo.getLatestAppliedMonthStats(req.user.id);
      res.status(200).json(r || null);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/my/messages',
  rateLimitNamed('expenses_user_messages', { windowMs: 60_000, max: 60 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const rows = await repo.listRecentMessagesForUser(req.user.id, (month && /^\d{4}-\d{2}$/.test(month)) ? month : null);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/admin/messages',
  rateLimitNamed('expenses_admin_messages', { windowMs: 60_000, max: 60 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const month = String(req.query.month || '').slice(0, 7);
      const rows = await repo.listRecentMessagesForAdmin((month && /^\d{4}-\d{2}$/.test(month)) ? month : null);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.delete('/:id',
  rateLimitNamed('expenses_delete_mine', { windowMs: 60_000, max: 20 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const r = await repo.getById(id);
      if (!r) return res.status(404).json({ message: 'Not Found' });
      const role = String(req.user.role || '').toLowerCase();
      if (String(r.userId) !== String(req.user.id) && !(role === 'manager' || role === 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const ok = await repo.deleteMine(id);
      if (!ok) return res.status(404).json({ message: 'Not Found' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/:id',
  rateLimitNamed('expenses_get_one', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const row = await repo.getById(id);
      if (!row) return res.status(404).json({ message: 'Not Found' });
      const role = String(req.user.role || '').toLowerCase();
      if (String(row.userId) !== String(req.user.id) && !(role === 'manager' || role === 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      res.status(200).json(row);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/:id/files',
  rateLimitNamed('expenses_receipts_multi', { windowMs: 60_000, max: 12 }),
  authorize('employee','manager','admin'),
  require('../../core/middleware/upload').array('files', 8),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id) return res.status(400).json({ message: 'Invalid id' });
      const files = (req.files || []).map(f => ({ path: `/uploads/${f.filename}`, originalName: f.originalname, mimeType: f.mimetype, size: f.size }));
      const rows = await repo.addFiles(id, files);
      res.status(201).json({ files: rows });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/:id/files',
  rateLimitNamed('expenses_receipts_list', { windowMs: 60_000, max: 60 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id) return res.status(400).json({ message: 'Invalid id' });
      const rows = await repo.listFiles(id);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.delete('/files/:fileId',
  rateLimitNamed('expenses_receipt_delete', { windowMs: 60_000, max: 12 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const fileId = parseInt(String(req.params.fileId || '0'), 10);
      if (!fileId) return res.status(400).json({ message: 'Invalid id' });
      const r = await repo.deleteFile(fileId, req.user.id);
      if (!r.ok) return res.status(404).json({ message: 'Not Found' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/admin/bulk-status',
  rateLimitNamed('expenses_admin_bulk_status', { windowMs: 60_000, max: 20 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const st = String(req.body?.status || '').toLowerCase();
      const note = String(req.body?.note || '').trim() || null;
      if (ids.length === 0 || !st) return res.status(400).json({ message: 'Invalid payload' });
      
      const userMonthMap = new Map(); // key: userId_month, value: { userId, month, totalAmount, count }

      for (const rawId of ids) {
        const id = parseInt(String(rawId), 10);
        if (id > 0) {
          const row = await repo.getById(id);
          const ok = await repo.updateStatus(id, st, note, req.user.id);
          if (ok && row && row.userId && st !== 'pending') {
            const ym = row.date ? String(row.date).slice(0, 7) : null;
            if (ym) {
              const k = `${row.userId}_${ym}`;
              if (!userMonthMap.has(k)) {
                userMonthMap.set(k, { userId: row.userId, month: ym, totalAmount: 0, count: 0 });
              }
              const m = userMonthMap.get(k);
              m.totalAmount += Number(row.amount || 0);
              m.count += 1;
            }
          }
        }
      }

      // Send ONE notification per user per month
      for (const m of userMonthMap.values()) {
        const statusLabel = st === 'approved' ? '承認' : (st === 'rejected' ? '差戻し' : (st === 'paid' ? '支給' : st));
        await noticesRepo.createNotice({
          targetUserId: m.userId,
          targetMonth: m.month,
          message: `${m.month}月度の交通費申請（計${m.count}件, ¥${m.totalAmount.toLocaleString()}）が${statusLabel}されました。`,
          createdBy: req.user?.id || null
        });
      }

      res.status(200).json({ ok: true, processed: ids.length });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.patch('/:id/status',
  rateLimitNamed('expenses_admin_status', { windowMs: 60_000, max: 30 }),
  authorize('manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const st = String(req.body?.status || '').toLowerCase();
      const note = String(req.body?.note || '').trim() || null;
      const ok = await repo.updateStatus(id, st, note, req.user.id);
      if (!ok) return res.status(404).json({ message: 'Not Found' });
      try {
        const row = await repo.getById(id);
        if (row && row.userId && st !== 'pending') {
          const statusLabel = st === 'approved' ? '承認' : (st === 'rejected' ? '差戻し' : (st === 'paid' ? '支給' : st));
          await noticesRepo.createNotice({
            targetUserId: row.userId,
            targetDate: row.date ? String(row.date).slice(0, 10) : null,
            targetMonth: row.date ? String(row.date).slice(0, 7) : null,
            message: `交通費申請（¥${Number(row.amount || 0).toLocaleString()}）が${statusLabel}されました。`,
            createdBy: req.user?.id || null
          });
        }
      } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/:id/apply',
  rateLimitNamed('expenses_apply', { windowMs: 60_000, max: 20 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const ok = await repo.updateStatus(id, 'applied', null, null);
      if (!ok) return res.status(404).json({ message: 'Not Found' });
      try {
        const row = await repo.getById(id);
        const userName = String(req.user?.username || req.user?.email || `user#${req.user?.id || ''}`);
        await noticesRepo.createAdminNotification({
          kind: 'expense_apply',
          title: '交通費申請',
          message: `${userName} さんが交通費を申請しました`,
          linkUrl: '/admin/expenses',
          payload: {
            source: 'expense',
            expenseId: id,
            userId: req.user?.id || null,
            date: row?.date ? String(row.date).slice(0, 10) : null,
            amount: Number(row?.amount || 0)
          },
          createdBy: req.user?.id || null,
          audience: 'admin_manager'
        });
      } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/:id/reply',
  rateLimitNamed('expenses_reply', { windowMs: 60_000, max: 20 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const note = String(req.body?.note || '').trim();
      if (!note) return res.status(400).json({ message: '理由を入力してください' });
      const ok = await repo.setEmployeeReplyAndApply(id, req.user.id, note);
      if (!ok) return res.status(404).json({ message: 'Not Found' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.patch('/:id',
  rateLimitNamed('expenses_update', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const role = String(req.user.role || '').toLowerCase();
      const ok = role === 'manager' || role === 'admin'
        ? await repo.updateByAdmin(id, req.body || {})
        : await repo.updateMine(id, req.user.id, req.body || {});
      if (!ok) return res.status(403).json({ message: 'Forbidden' });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.get('/:id/messages',
  rateLimitNamed('expenses_messages_list', { windowMs: 60_000, max: 60 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      try { await repo.ensureTable(); } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const r = await repo.getById(id);
      if (!r) return res.status(404).json({ message: 'Not Found' });
      const role = String(req.user.role || '').toLowerCase();
      if (String(r.userId) !== String(req.user.id) && !(role === 'manager' || role === 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const rows = await repo.listMessages(id);
      res.status(200).json(rows || []);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
router.post('/:id/messages',
  rateLimitNamed('expenses_messages_add', { windowMs: 60_000, max: 30 }),
  authorize('employee','manager','admin'),
  async (req, res) => {
    try {
      try { await repo.ensureTable(); } catch (e) { console.error('[expenses.routes.js] Swallowed error:', e); }
      const id = parseInt(String(req.params.id || '0'), 10);
      if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
      const r = await repo.getById(id);
      if (!r) return res.status(404).json({ message: 'Not Found' });
      const role = String(req.user.role || '').toLowerCase();
      if (String(r.userId) !== String(req.user.id) && !(role === 'manager' || role === 'admin')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const text = String(req.body?.message || '').trim();
      if (!text) return res.status(400).json({ message: 'メッセージを入力してください' });
      const newId = await repo.addMessage({ expenseId: id, userId: req.user.id, message: text });
      res.status(201).json({ id: newId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
module.exports = router;
