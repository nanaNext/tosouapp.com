const repo = require('./adjust.repository');
const attendanceRepo = require('../attendance/attendance.repository');
const noticesRepo = require('../notices/notices.repository');
// Controller yêu cầu sửa giờ
exports.create = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = String(req.user?.role || '').toLowerCase();
    
    // Admin không được tạo request, chỉ được xét duyệt
    if (userRole === 'admin') {
      return res.status(403).json({ message: 'Admin cannot create adjust requests' });
    }
    
    const { attendanceId, requestedCheckIn, requestedCheckOut, reason } = req.body || {};
    if (!userId || (!requestedCheckIn && !requestedCheckOut)) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const id = await repo.create({ userId, attendanceId, requestedCheckIn, requestedCheckOut, reason });
    try {
      const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
      await noticesRepo.createAdminNotification({
        kind: 'time_adjust',
        title: '時間修正申請',
        message: `${userName} さんが時間修正を申請しました`,
        linkUrl: '/admin-attendance-adjust-requests.html',
        payload: {
          source: 'adjust',
          requestId: id,
          userId,
          attendanceId: attendanceId || null,
          requestedCheckIn: requestedCheckIn || null,
          requestedCheckOut: requestedCheckOut || null
        },
        createdBy: userId,
        audience: 'admin_manager'
      });
    } catch {}
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
    try {
      const reqRow2 = await repo.getById(id);
      if (reqRow2 && reqRow2.userId && status !== 'pending') {
        const statusLabel = status === 'approved' ? '承認' : (status === 'rejected' ? '差戻し' : status);
        await noticesRepo.createNotice({
          targetUserId: reqRow2.userId,
          targetDate: reqRow2.requestedCheckIn ? String(reqRow2.requestedCheckIn).slice(0, 10) : null,
          targetMonth: reqRow2.requestedCheckIn ? String(reqRow2.requestedCheckIn).slice(0, 7) : null,
          message: `時間修正申請が${statusLabel}されました。`,
          createdBy: req.user?.id || null,
          kind: 'approval',
          title: '時間修正申請'
        });
      }
    } catch {}
    res.status(200).json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listAll = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const rows = role === 'manager'
      ? await repo.listForManager()
      : await repo.listAll();
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const id = parseInt(String(req.params.id || ''), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const own = String(row.userId) === String(req.user?.id);
    if (role !== 'admin' && !own) return res.status(403).json({ message: 'Forbidden' });
    if (role !== 'admin' && String(row.status || 'pending') !== 'pending') {
      return res.status(409).json({ message: 'Only pending requests can be deleted' });
    }
    const del = await repo.deleteById(id);
    res.status(200).json({ ok: del > 0, id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateByActor = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const id = parseInt(String(req.params.id || ''), 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const own = String(row.userId) === String(req.user?.id);
    if (role === 'admin' || (own && String(row.status || 'pending') === 'pending')) {
      const { requestedCheckIn, requestedCheckOut, reason } = req.body || {};
      await repo.updateFields(id, { requestedCheckIn, requestedCheckOut, reason });
      return res.status(200).json({ ok: true, id });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
