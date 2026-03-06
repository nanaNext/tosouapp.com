const repo = require('./adjust.repository');
const attendanceRepo = require('../attendance/attendance.repository');
// Controller yêu cầu sửa giờ
exports.create = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { attendanceId, requestedCheckIn, requestedCheckOut, reason } = req.body || {};
    if (!userId || (!requestedCheckIn && !requestedCheckOut)) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const id = await repo.create({ userId, attendanceId, requestedCheckIn, requestedCheckOut, reason });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listMine = async (req, res) => {
  try {
    const rows = await repo.listMine(req.user?.id);
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
exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!id || !status || !['approved','rejected','pending'].includes(status)) {
      return res.status(400).json({ message: 'Missing id/status' });
    }
    await repo.updateStatus(id, status);
    if (status === 'approved') {
      const reqRow = await repo.getById(id);
      if (reqRow) {
        await attendanceRepo.updateTimes(reqRow.attendanceId, reqRow.requestedCheckIn, reqRow.requestedCheckOut);
      }
    }
    res.status(200).json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
