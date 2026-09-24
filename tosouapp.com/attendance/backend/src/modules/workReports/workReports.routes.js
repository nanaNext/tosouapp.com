const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const repo = require('./workReports.repository');
const attendanceRepo = require('../attendance/attendance.repository');

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

router.use(authenticate);

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
    const insertId = await repo.create({ userId, date, workType, site, work, status: 'pending' });
    const saved = await repo.getById(insertId);
    const daily = await attendanceRepo.getDaily(userId, date).catch(() => null);
    res.status(201).json({ date, report: saved, daily });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 自分の作業報告を編集する（出勤打刻時に自動生成された空の行に、後から現場・作業内容を
// 入力する場合など）。承認/差戻しのステータスはここでは一切変更しない — 内容を入力しても
// 自動承認にはならず、管理者/マネージャーが別途 承認 を押すまで 承認待ち のまま。
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
    // 差戻し(rejected)だった報告を編集した場合は、修正して出し直した扱いにする —
    // 承認待ちに戻して再度レビュー対象にする（内容を直しても差戻しのままだと
    // 管理者の一覧に二度と出てこない = 見落としの原因になるため）。
    if (existing.status === 'rejected') {
      await repo.setStatus(id, 'pending', { approvedBy: null, rejectedReason: null });
    }
    const saved = await repo.getById(id);
    res.status(200).json({ report: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
