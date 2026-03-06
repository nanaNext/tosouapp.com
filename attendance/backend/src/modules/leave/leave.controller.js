const repo = require('./leave.repository');
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
// Controller yêu cầu nghỉ
exports.create = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, type, reason } = req.body || {};
    if (!userId || !startDate || !endDate || !type) {
      return res.status(400).json({ message: 'Missing userId/startDate/endDate/type' });
    }
    const id = await repo.create({ userId, startDate, endDate, type, reason });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listMine = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rows = await repo.listMine(userId);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listUser = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const rows = await repo.listByUser(userId);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listPending = async (req, res) => {
  try {
    const rows = await repo.listAllPending();
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!id || !status || !['approved','rejected','pending'].includes(status)) {
      return res.status(400).json({ message: 'Missing id/status' });
    }
    await repo.updateStatus(id, status);
    res.status(200).json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.myBalance = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const rows = await repo.listMine(userId);
    const approved = rows.filter(r => r.status === 'approved');
    const days = approved.reduce((s, r) => {
      const sd = new Date(r.startDate);
      const ed = new Date(r.endDate);
      const diff = Math.ceil((ed - sd) / (24*60*60*1000)) + 1;
      return s + Math.max(0, diff);
    }, 0);
    res.status(200).json({ remainingDays: Math.max(0, 12 - days), usedDays: days, policyDays: 12 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
