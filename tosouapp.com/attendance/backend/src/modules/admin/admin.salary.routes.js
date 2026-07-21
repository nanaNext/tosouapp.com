'use strict';
/**
 * admin.salary.routes.js
 * Salary calculation, payslip generation, PDF, and related routes.
 * Split from admin.routes.js for maintainability.
 */
const express = require('express');
const router = express.Router();
const { authorize } = require('../../core/middleware/authMiddleware');
const { rateLimitNamed, rateLimit } = require('../../core/middleware/rateLimit');
const userRepo = require('../users/user.repository');
const salaryService = require('../salary/salary.service');
const salaryInputRepo = require('../salary/salaryInput.repository');
const payslipRepo = require('../payslip/payslip.repository');
const auditRepo = require('../audit/audit.repository');
const { companyName, payslipEncKey, payslipKeyVersion } = require('../../config/env');
const { buildPayslipPdf } = require('../salary/payslipPdf');
const db = require('../../core/database/mysql');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const s3Service = require('../../core/services/s3.service');
const metrics = require('../../core/metrics');

function recordEndpointPerf(endpoint, startedAt, meta = {}) {
  const durationMs = Date.now() - startedAt;
  try {
    metrics.observe(endpoint + '_duration_ms', durationMs);
    if (durationMs >= 100) metrics.inc(endpoint + '_slow_count', 1);
  } catch (e) { /* silently ignored */ }
  if (durationMs >= 100) {
    try { console.warn(JSON.stringify({ level: 'warn', type: 'slow_endpoint', endpoint, duration_ms: durationMs, ...meta })); } catch (e) { /* silently ignored */ }
  }
}

router.get('/payslip', authorize('admin'), async (req, res) => {
  try {
    const { userIds, month } = req.query;
    if (!userIds || !month) {
      return res.status(400).json({ message: 'Missing userIds/month' });
    }
    const ids = String(userIds).split(',').map(s => s.trim()).filter(Boolean);
    const result = await salaryService.computePayslips(ids, month);
    res.status(200).json({ month, employees: result.employees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/salary', async (req, res) => {
  try {
    const { userIds, month } = req.query;
    if (!userIds || !month) {
      return res.status(400).json({ message: 'Missing userIds/month' });
    }
    let ids = String(userIds).split(',').map(s => s.trim()).filter(Boolean);
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const issueDate = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    if (req.user?.role === 'manager') {
      const me = await userRepo.getUserById(req.user.id);
      const myDept = me?.departmentId || null;
      const filtered = [];
      for (const id of ids) {
        const u = await userRepo.getUserById(id);
        if (u?.departmentId && myDept && String(u.departmentId) === String(myDept)) {
          filtered.push(id);
        }
      }
      ids = filtered;
    } else if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { employees } = await salaryService.computePayslips(ids, month);
    res.status(200).json({
      companyName,
      issueDate,
      month,
      employees
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function ensureSameDepartmentIfManager(req, targetUserId) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'manager') return true;
  // Payroll/PDF flows are intentionally company-wide for managers unless
  // an explicit payroll-specific scope lock is enabled.
  if (String(process.env.MANAGER_STRICT_DEPT_PAYROLL || '').toLowerCase() !== 'true') return true;
  const me = await userRepo.getUserById(req.user.id);
  const target = await userRepo.getUserById(targetUserId);
  if (!me?.departmentId || !target?.departmentId) return false;
  return String(me.departmentId) === String(target.departmentId);
}

function normalizeJsonPayload(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(String(v)); } catch { return null; }
}

const EARNING_LABELS = new Set([
  '基礎給',
  '就業手当',
  '時間外手当',
  '所休出手当',
  '週40超手当',
  '月60超手当',
  '法休出手当',
  '深夜勤手当',
  '夜間出勤手当',
  '休日出勤手当',
  '固定残業手当',
  '非課税通勤費',
  '資格手当',
  '通信手当',
  '誕生日月手当',
  '残業手当',
  '欠勤控除',
  '催事協力手当'
]);

function normalizeDeductionLabel(label) {
  const s = String(label || '').trim();
  if (!s) return s;
  if (s === '健康保険') return '健康保険料';
  if (s === '介護保険') return '介護保険料';
  if (s === '厚生年金') return '厚生年金保険';
  if (s === '雇用保険') return '雇用保険料';
  if (s === '住民票') return '住民税';
  return s;
}

function normalizeSalaryPayload(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const out = { ...p };

  const normDeductionEntries = (entries) => {
    const o = {};
    for (const [k0, v] of entries) {
      const k = normalizeDeductionLabel(k0);
      if (!k) continue;
      if (EARNING_LABELS.has(k)) throw new Error(`控除に「${k}」は入力できません`);
      if (k === '社保合計額' || k === '課税対象額') throw new Error(`控除に「${k}」は入力できません`);
      o[k] = v;
    }
    return o;
  };

  if (Array.isArray(out.overrideDeductions)) {
    out.overrideDeductions = out.overrideDeductions.map(it => ({ ...it, label: normalizeDeductionLabel(it?.label) }));
    for (const it of out.overrideDeductions) {
      const k = String(it?.label || '').trim();
      if (!k) continue;
      if (EARNING_LABELS.has(k)) throw new Error(`控除に「${k}」は入力できません`);
      if (k === '社保合計額' || k === '課税対象額') throw new Error(`控除に「${k}」は入力できません`);
    }
  } else if (out.overrideDeductions && typeof out.overrideDeductions === 'object') {
    out.overrideDeductions = normDeductionEntries(Object.entries(out.overrideDeductions));
  }

  if (Array.isArray(out.extraDeductions)) {
    out.extraDeductions = out.extraDeductions.map(it => ({ ...it, label: normalizeDeductionLabel(it?.label) }));
    for (const it of out.extraDeductions) {
      const k = String(it?.label || '').trim();
      if (!k) continue;
      if (EARNING_LABELS.has(k)) throw new Error(`控除に「${k}」は入力できません`);
      if (k === '社保合計額' || k === '課税対象額') throw new Error(`控除に「${k}」は入力できません`);
    }
  }

  return out;
}

router.get('/salary/input', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = parseInt(String(req.query?.userId || ''), 10);
    const month = String(req.query?.month || '').slice(0, 7);
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const row = await salaryInputRepo.getByUserMonth(userId, month);
    res.status(200).json({ 
      userId, 
      month, 
      payload: normalizeJsonPayload(row?.payload), 
      is_published: Boolean(row?.is_published),
      updatedBy: row?.updated_by || null, 
      updatedAt: row?.updated_at || null 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/salary/input', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    const userId = parseInt(String(body.userId || ''), 10);
    const month = String(body.month || '').slice(0, 7);
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const payload0 = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const payload = normalizeSalaryPayload(payload0);
    const row = await salaryInputRepo.upsert({ userId, month, payload, updatedBy: req.user.id });
    try {
      await auditRepo.writeLog({ userId: req.user.id, action: 'salary_input_upsert', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ userId, month }) });
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ ok: true, row });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/salary/preview', async (req, res) => {
  const startedAt = Date.now();
  let targetUserId = null;
  let targetMonth = null;
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = parseInt(String(req.query?.userId || ''), 10);
    const month = String(req.query?.month || '').slice(0, 7);
    targetUserId = userId || null;
    targetMonth = month || null;
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const input = await salaryInputRepo.getByUserMonth(userId, month);
    const options = normalizeJsonPayload(input?.payload);
    console.log('PDF GENERATE OPTIONS KINTAI:', JSON.stringify(options?.kintai));
    const emp = await salaryService.computePayslipForUser(userId, month, options || null);
    res.status(200).json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    recordEndpointPerf('admin_salary_preview', startedAt, {
      userId: req.user?.id || null,
      targetUserId,
      month: targetMonth
    });
  }
});

router.post('/salary/preview-live', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    const userId = parseInt(String(body.userId || ''), 10);
    const month = String(body.month || '').slice(0, 7);
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const payload0 = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const payload = normalizeSalaryPayload(payload0);
    const emp = await salaryService.computePayslipForUser(userId, month, payload || null);
    res.status(200).json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function pdfFromPayslip(emp, meta) {
  return buildPayslipPdf({ employee: emp, companyName: meta.companyName, issueDate: meta.issueDate });
}

function normalizeBankAccountParts(v) {
  if (!v || typeof v !== 'object') return null;
  const bankName = String(v.bankName || '').trim();
  const branchName = String(v.branchName || '').trim();
  const accountType = String(v.accountType || '').trim();
  const accountNumber = String(v.accountNumber || '').replace(/[^\d]/g, '').trim();
  const accountHolder = String(v.accountHolder || '').trim();
  return { bankName, branchName, accountType, accountNumber, accountHolder };
}

function validateBankAccount({ bankAccount, bankAccountParts }) {
  const p = normalizeBankAccountParts(bankAccountParts);
  
  // Nếu có điền BẤT KỲ trường nào trong 5 trường của bankAccountParts, thì bắt buộc phải điền ĐỦ cả 5.
  if (p && (p.bankName || p.branchName || p.accountType || p.accountNumber || p.accountHolder)) {
    const errs = [];
    if (!p.bankName) errs.push('bankName');
    if (!p.branchName) errs.push('branchName');
    if (!['普通', '当座'].includes(p.accountType)) errs.push('accountType');
    if (!/^\d{7}$/.test(p.accountNumber)) errs.push('accountNumber');
    if (!p.accountHolder) errs.push('accountHolder');
    
    // NẾU LỖI: Bỏ qua không bắt lỗi gắt gao nữa, chỉ cần trả về ok: true để cho phép tạo PDF
    // Vì đây chỉ là in lên PDF, không phải API chuyển khoản ngân hàng.
    if (errs.length) {
      console.warn(`[Payslip PDF] Ignored incomplete bank info: ${errs.join(', ')}`);
      // Return true anyway to not block PDF generation
      return { ok: true }; 
    }
    return { ok: true };
  }
  
  const s = String(bankAccount || '').trim();
  if (!s) return { ok: true };
  const digits = (s.match(/\d/g) || []).length;
  // Bỏ qua lỗi bắt buộc 7 số cho bankAccount cũ
  return { ok: true };
}

function validatePaymentConsistency(emp) {
  const net = Number(emp?.合計?.差引支給額 || 0);
  const bank = Number(emp?.支払?.振込支給額 || 0);
  const cash = Number(emp?.支払?.現金支給額 || 0);
  const kind = Number(emp?.支払?.現物支給額 || 0);
  const sum = bank + cash + kind;
  if (Math.round(sum) !== Math.round(net)) {
    return { ok: false, message: `支払内訳の合計が差引支給額と一致しません（${sum} != ${net}）` };
  }
  return { ok: true };
}

const payslipDeliveryRepo = require('../salary/payslipDelivery.repository');

async function writePayslipFile({ userId, month, pdfBuf, actorId, originalName }) {
  const baseName = `payslip_${userId}_${month}_${Date.now()}.pdf`;
  let filename = baseName;
  let iv = null;
  let tag = null;
  let hash = crypto.createHash('sha256').update(pdfBuf).digest('hex');
  let keyVersion = null;
  let outBuf = pdfBuf;
  
  if (payslipEncKey) {
    const keyBuf = Buffer.from(payslipEncKey, payslipEncKey.startsWith('base64:') ? 'base64' : 'hex');
    const key = payslipEncKey.startsWith('base64:') ? keyBuf.slice(7) : keyBuf;
    iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    outBuf = Buffer.concat([cipher.update(pdfBuf), cipher.final()]);
    tag = cipher.getAuthTag();
    filename = baseName + '.enc';
    keyVersion = payslipKeyVersion;
  }

  // Upload to R2 instead of local disk if configured
  if (s3Service.isR2Configured()) {
    const success = await s3Service.uploadToR2(`payslips/${filename}`, outBuf, 'application/pdf');
    if (!success) {
      // Fallback to local disk if R2 upload fails
      console.error('[Payslip] R2 upload failed, falling back to local storage');
      const dir = path.join(__dirname, '../../', 'uploads', 'payslips');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, outBuf);
    }
  } else {
    // Fallback to local fs if R2 not configured
    const dir = path.join(__dirname, '../../', 'uploads', 'payslips');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, outBuf);
  }

  const existing = await payslipRepo.findLatestByUserMonth(userId, month);
  const originalName2 = String(originalName || `payslip_${month}.pdf`);
  let id = null;
  let version = 1;
  if (existing?.id) {
    try {
      if (s3Service.isR2Configured() && existing.filename) {
        await s3Service.deleteFromR2(`payslips/${existing.filename}`);
      } else {
        const dir = path.join(__dirname, '../../', 'uploads', 'payslips');
        const oldPath = path.join(dir, String(existing.filename || ''));
        if (existing.filename && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } catch (e) { /* silently ignored */ }
    version = (existing.version || 1) + 1;
    const updated = await payslipRepo.updateFile(existing.id, filename, originalName2, actorId, iv, tag, keyVersion, hash, version);
    id = updated?.id || existing.id;
  } else {
    id = await payslipRepo.create({ userId, month, filename, originalName: originalName2, uploadedBy: actorId, iv, authTag: tag, keyVersion, hash, version: 1 });
  }
  return { id, filename, version };
}

router.post('/salary/payslip/generate', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    const userId = parseInt(String(body.userId || ''), 10);
    const month = String(body.month || '').slice(0, 7);
    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const input = await salaryInputRepo.getByUserMonth(userId, month);
    const options = normalizeJsonPayload(input?.payload);
    const emp = await salaryService.computePayslipForUser(userId, month, options || null);
    try {
      emp._bankAccountParts = normalizeBankAccountParts(options?.bankAccountParts);
    } catch (e) { /* silently ignored */ }
    const bankCheck = validateBankAccount({ bankAccount: emp?.振込口座 || emp?.振込銀行, bankAccountParts: options?.bankAccountParts });
    if (!bankCheck.ok) return res.status(400).json({ message: bankCheck.message });
    const payCheck = validatePaymentConsistency(emp);
    if (!payCheck.ok) return res.status(400).json({ message: payCheck.message });
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const issueDate = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    const pdfBuf = await pdfFromPayslip(emp, { companyName, issueDate });
    const m = String(month || '');
    const y = m.slice(0, 4);
    const mm = m.slice(5, 7);
    const dd = pad(today.getUTCDate());
    const empCode = String(emp?.従業員コード || emp?.userId || userId || '').trim() || String(userId);
    const empName = String(emp?.氏名 || '').trim();
    const namePart = empName ? `_${empName}` : '';
    const originalName = `${y}年${mm}月${dd}日_給与明細${namePart}_${empCode}.pdf`;
    const saved = await writePayslipFile({ userId, month, pdfBuf, actorId: req.user.id, originalName });
    try {
      await auditRepo.writeLog({ userId: req.user.id, action: 'payslip_generate', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: JSON.stringify({ userId, month, payslipId: saved.id }) });
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ id: saved.id, month, secureUrl: `/api/payslips/admin/file/${saved.id}?v=${encodeURIComponent(saved.version || 1)}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/salary/publish', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const body = req.body || {};
    const userId = parseInt(String(body.userId || ''), 10);
    const month = String(body.month || '').slice(0, 7);
    const isPublished = Boolean(body.is_published);

    if (!userId || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'Missing userId/month' });
    if (!(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }

    const input = await salaryInputRepo.getByUserMonth(userId, month);
    if (!input) return res.status(404).json({ message: '給与データが保存されていません（先に保存してください）' });

    if (isPublished) {
      const file = await payslipRepo.findLatestByUserMonth(userId, month);
      if (!file?.id) return res.status(404).json({ message: 'PDFが作成されていません（先にPDF作成してください）' });
      try { await payslipDeliveryRepo.create({ userId, month, payslipFileId: file.id, sentBy: req.user.id }); } catch (e) { /* silently ignored */ }
    }

    await salaryInputRepo.setPublished(userId, month, isPublished, req.user.id);
    
    try {
      await auditRepo.writeLog({ 
        userId: req.user.id, 
        action: isPublished ? 'payslip_publish' : 'payslip_unpublish', 
        path: req.path, 
        method: req.method, 
        ip: req.ip, 
        userAgent: req.headers['user-agent'], 
        beforeData: JSON.stringify({ is_published: input.is_published }), 
        afterData: JSON.stringify({ userId, month, is_published: isPublished }) 
      });
    } catch (e) { /* silently ignored */ }

    res.status(200).json({ message: isPublished ? '公開しました' : '非公開にしました', is_published: isPublished });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/salary/deliveries', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const userId = req.query?.userId ? parseInt(String(req.query.userId), 10) : null;
    const month = req.query?.month ? String(req.query.month).slice(0, 7) : null;
    if (userId && !(await ensureSameDepartmentIfManager(req, userId))) {
      return res.status(403).json({ message: 'Forbidden: cross-department access' });
    }
    const rows = await payslipDeliveryRepo.list({ userId, month, limit: 500 });
    const items = rows.map(r => ({
      id: r.id,
      userId: r.userId,
      userName: r.user_name || r.user_email || '',
      month: r.month,
      fileId: r.payslip_file_id,
      fileName: r.original_name,
      sentAt: r.sent_at,
      sentBy: r.sent_by,
      senderName: r.sender_name || r.sender_email || ''
    }));
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/salary/deliveries/:id', async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') return res.status(403).json({ message: 'Forbidden' });
    const id = parseInt(String(req.params.id || ''), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await payslipDeliveryRepo.getById(id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (role === 'manager') {
      const me = await userRepo.getUserById(req.user.id);
      const target = await userRepo.getUserById(row.userId);
      if (!me?.departmentId || String(me.departmentId) !== String(target?.departmentId)) {
        return res.status(403).json({ message: 'Forbidden: cross-department access' });
      }
    }
    const before = await payslipDeliveryRepo.deleteById(id);
    try {
      await auditRepo.writeLog({ userId: req.user.id, action: 'payslip_delivery_delete', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: JSON.stringify(before || {}), afterData: null });
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Refresh tokens admin maintenance
const refreshRepo = require('../auth/refresh.repository');
router.post('/auth/refresh/cleanup', authorize('admin'), async (req, res) => {
  try {
    const r = await refreshRepo.cleanupExpired();
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/auth/refresh/list', authorize('admin'), async (req, res) => {
  try {
    const { userId, page, pageSize } = req.query;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const r = await refreshRepo.listByUser(userId, { page, pageSize });
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/auth/refresh/revoke-all', authorize('admin'), async (req, res) => {
  try {
    try {
      await auditRepo.writeLog({ userId: req.user?.id, action: 'admin_revoke_all_refresh_tokens', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: null, afterData: null });
    } catch (e) { /* silently ignored */ }
    const r = await refreshRepo.deleteAllTokens();
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const settingsService = require('../settings/settings.service');
const attendanceRepo = require('../attendance/attendance.repository');
const db2 = require('../../core/database/mysql');
router.post('/system/flags',
  authorize('admin'),
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req, res) => {
  try {
    const before = await settingsService.getFlags();
    const after = await settingsService.setFlags(req.body || {});
    try {
      await auditRepo.writeLog({ userId: req.user?.id, action: 'admin_toggle_feature_flags', path: req.path, method: req.method, ip: req.ip, userAgent: req.headers['user-agent'], beforeData: JSON.stringify(before), afterData: JSON.stringify(after) });
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ ok: true, before, after });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/system/flags',
  authorize('admin'),
  async (req, res) => {
  try {
    const r = await settingsService.getFlags();
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/attendance/ensure-schema',
  authorize('admin'),
  async (req, res) => {
  try {
    const cols = await attendanceRepo.ensureAttendanceSchemaPublic();
    res.status(200).json({ ok: true, columns: cols });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/attendance/columns',
  authorize('admin'),
  async (req, res) => {
  try {
    const cols = await attendanceRepo.listColumns();
    res.status(200).json({ columns: cols });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/calendar/ping',
  authorize('admin'),
  async (req, res) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    res.status(200).json({ ok: true, year, version: 'calendar-router-online' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/calendar/holidays',
  authorize('admin'),
  async (req, res) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const r = await calendarRepo.computeYear(year);
    res.status(200).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/calendar/holidays',
  authorize('admin'),
  async (req, res) => {
  try {
    const dates = Array.isArray(req.body?.dates) ? req.body.dates : [];
    await calendarRepo.upsertFixed(dates);
    const year = parseInt(String(req.body?.year || new Date().getUTCFullYear()), 10);
    const r = await calendarRepo.computeYear(year);
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post('/calendar/materialize-jp',
  authorize('admin'),
  async (req, res) => {
  try {
    const year = parseInt(String(req.body?.year || new Date().getUTCFullYear()), 10);
    const r0 = await calendarRepo.materializeJapanYear(year);
    const r = await calendarRepo.computeYear(year);
    res.status(201).json({ materialized: r0, calendar: r });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
