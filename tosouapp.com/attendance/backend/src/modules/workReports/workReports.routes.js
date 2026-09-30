const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const repo = require('./workReports.repository');
const attendanceRepo = require('../attendance/attendance.repository');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// resolveTenant: isMonthClosed() cần đúng tenantId, thiếu nó thì chốt tháng không có tác dụng.
router.use(authenticate, resolveTenant);

router.get('/my', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const date = isISODate(req.query?.date) ? String(req.query.date) : todayJST();
    const month = date.slice(0, 7);
    const rows = await repo.listByUserDate(userId, date);
    const closed = await repo.isMonthClosed(month, req.tenantId).catch(() => false);
    res.status(200).json({ date, month, closed, report: rows[0] || null, reports: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const body = req.body || {};
    const date = isISODate(body.date) ? String(body.date) : todayJST();
    const wt = String(body.workType || body.work_type || '').trim();
    const workType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : null;
    const siteRaw = String(body.site || '').trim();
    const work = String(body.work || '').trim();
    if (!work) {
      return res.status(400).json({ message: 'Missing work' });
    }
    const site = siteRaw || '';
    const month = date.slice(0, 7);
    const closed = await repo.isMonthClosed(month, req.tenantId).catch(() => false);
    if (closed) return res.status(409).json({ message: 'Month is closed' });
    // 同じ日・同じ現場・同じ作業内容の報告が既にあれば新規作成しない (保存ボタンの
    // 二度押し・再保存で同じ報告が重複登録されていたため)。既存の行をそのまま返す。
    const sameDay = await repo.listByUserDate(userId, date).catch(() => []);
    const dup = sameDay.find(r => String(r.site || '').trim() === site && String(r.work || '').trim() === work);
    if (dup) {
      if (workType && dup.work_type !== workType) await repo.update(dup.id, { workType }, { ownerUserId: userId });
      const saved = await repo.getById(dup.id);
      const daily = await attendanceRepo.getDaily(userId, date).catch(() => null);
      return res.status(200).json({ date, report: saved, daily, duplicate: true });
    }
    // 作業報告の承認フローは廃止: 提出した時点で確定（approved）。問題があれば管理者が 差戻し する。
    const insertId = await repo.create({ userId, date, workType, site, work, status: 'approved' });
    const saved = await repo.getById(insertId);
    const daily = await attendanceRepo.getDaily(userId, date).catch(() => null);
    res.status(201).json({ date, report: saved, daily });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 自分の作業報告を編集する（出勤打刻時に自動生成された空の行に、後から現場・作業内容を
// 入力する場合など）。承認フローは廃止したので、作業内容が入っていれば 提出済み（approved）になる。
router.patch('/:id', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const existing = await repo.getById(id);
    if (!existing || String(existing.userId) !== String(userId)) {
      return res.status(404).json({ message: 'Not found' });
    }
    const month = String(existing.date).slice(0, 7);
    const closed = await repo.isMonthClosed(month, req.tenantId).catch(() => false);
    if (closed) return res.status(409).json({ message: 'Month is closed' });

    const body = req.body || {};
    const wt = String(body.workType || body.work_type || '').trim();
    const workType = wt === 'onsite' || wt === 'remote' || wt === 'satellite' ? wt : undefined;
    const site = body.site !== undefined ? String(body.site || '').trim() : undefined;
    const work = body.work !== undefined ? String(body.work || '').trim() : undefined;
    if (work !== undefined && !work) {
      return res.status(400).json({ message: 'Missing work' });
    }
    await repo.update(id, { workType, site, work }, { ownerUserId: userId });
    // 作業内容が入っていれば 提出済み（approved）にする:
    //  - 自動生成された空の行（pending）に内容を入れた → 提出
    //  - 差戻し(rejected)の報告を直した → 再提出（差戻し理由は消す）
    // 既に approved の報告は内容を書き換えても approved のまま（承認待ちには戻さない）。
    const finalWork = work !== undefined ? work : String(existing.work || '').trim();
    if (finalWork && existing.status !== 'approved') {
      await repo.setStatus(id, 'approved', { approvedBy: null, rejectedReason: null });
    }
    const saved = await repo.getById(id);
    res.status(200).json({ report: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
