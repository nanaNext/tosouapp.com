const repo = require('./adjust.repository');
const attendanceRepo = require('../attendance/attendance.repository');
const noticesRepo = require('../notices/notices.repository');
// Controller yêu cầu sửa giờ
exports.create = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = String(req.user?.role || '').toLowerCase();
    
    if (userRole === 'admin') {
      return res.status(403).json({ message: 'Admin cannot create adjust requests' });
    }
    
    const { attendanceId, requestedCheckIn, requestedCheckOut, reason } = req.body || {};
    if (!userId || (!requestedCheckIn && !requestedCheckOut)) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const id = await repo.create({ userId, attendanceId, requestedCheckIn, requestedCheckOut, reason, tenantId: req.tenantId || null });
    try {
      const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
      await noticesRepo.createAdminNotification({
        kind: 'time_adjust',
        title: '時間修正申請',
        message: `${userName} さんが時間修正を申請しました`,
        linkUrl: '/admin/attendance/adjust-requests',
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
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listMine = async (req, res) => {
  try {
    const rows = await repo.listMine(req.user?.id, req.tenantId || null);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listUser = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const rows = await repo.listByUser(userId, req.tenantId || null);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, adminNote } = req.body || {};
    if (!id || !status || !['approved','rejected','pending'].includes(status)) {
      return res.status(400).json({ message: 'Missing id/status' });
    }
    const cleanAdminNote = String(adminNote || '').trim();
    if (status === 'rejected' && !cleanAdminNote) {
      return res.status(400).json({ message: '差戻し理由を入力してください' });
    }
    const tid = req.tenantId || null;
    await repo.updateStatus(id, status, adminNote, tid);
    if (status === 'approved') {
      const reqRow = await repo.getById(id, tid);
      if (reqRow) {
        // Ghi giờ đã duyệt vào bảng chấm công của nhân viên để admin KHÔNG phải
        // sang màn 月次勤怠入力 nhập lại.
        // - Nếu đơn gắn với record chấm công có sẵn (attendanceId) → update record đó.
        // - Nếu ngày đó CHƯA có record (attendanceId null) và có giờ 出勤 →
        //   dùng bulkUpsertAttendance (chính là hàm màn 月次 dùng) để TẠO MỚI record
        //   cho đúng ngày, đồng thời đồng bộ attendance_daily.
        try {
          if (reqRow.attendanceId) {
            await attendanceRepo.updateTimes(
              reqRow.attendanceId,
              reqRow.requestedCheckIn,
              reqRow.requestedCheckOut,
              { tenantId: tid }
            );
          } else if (reqRow.requestedCheckIn) {
            await attendanceRepo.bulkUpsertAttendance(
              reqRow.userId,
              {
                updates: [{
                  checkIn: reqRow.requestedCheckIn,
                  checkOut: reqRow.requestedCheckOut || null
                }],
                dailyUpdates: []
              },
              { tenantId: tid }
            );
          } else {
            // Đơn chỉ có giờ 退勤, không có record gốc → giữ hành vi cũ.
            await attendanceRepo.updateTimes(
              reqRow.attendanceId,
              reqRow.requestedCheckIn,
              reqRow.requestedCheckOut,
              { tenantId: tid }
            );
          }
        } catch (e) {
          // Không chặn việc duyệt nếu ghi giờ lỗi; log để theo dõi.
          console.error('[adjust.approve] write attendance failed:', e && e.message);
        }
      }
    }
    try {
      const reqRow2 = await repo.getById(id, tid);
      if (reqRow2 && reqRow2.userId && status !== 'pending') {
        const statusLabel = status === 'approved' ? '承認' : (status === 'rejected' ? '差戻し' : status);
        if (status === 'rejected' && cleanAdminNote) {
          try {
            await repo.addMessage({
              requestId: reqRow2.id,
              userId: req.user?.id,
              message: cleanAdminNote
            });
          } catch (e) { /* silently ignored */ }
        }
        await noticesRepo.createNotice({
          targetUserId: reqRow2.userId,
          targetDate: reqRow2.requestedCheckIn ? String(reqRow2.requestedCheckIn).slice(0, 10) : null,
          targetMonth: reqRow2.requestedCheckIn ? String(reqRow2.requestedCheckIn).slice(0, 7) : null,
          message: `時間修正申請が${statusLabel}されました。${status === 'rejected' && cleanAdminNote ? ` 理由: ${cleanAdminNote}` : ''}`,
          createdBy: req.user?.id || null,
          kind: 'approval',
          title: '時間修正申請'
        });
      }
    } catch (e) { /* silently ignored */ }
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
    const tid = req.tenantId || null;
    const rows = role === 'manager'
      ? await repo.listForManager(tid)
      : await repo.listAll(tid);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const id = parseInt(String(req.params.id || ''), 10);
    const tid = req.tenantId || null;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id, tid);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const own = String(row.userId) === String(req.user?.id);
    if (role !== 'admin' && !own) return res.status(403).json({ message: 'Forbidden' });
    if (role !== 'admin' && String(row.status || 'pending') !== 'pending') {
      return res.status(409).json({ message: 'Only pending requests can be deleted' });
    }
    const del = await repo.deleteById(id, tid);
    res.status(200).json({ ok: del > 0, id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listMessages = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id || '0'), 10);
    const tid = req.tenantId || null;
    if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
    const row = await repo.getById(id, tid);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const role = String(req.user?.role || '').toLowerCase();
    const own = String(row.userId) === String(req.user?.id);
    if (!own && role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const rows = await repo.listMessages(id, tid);
    return res.status(200).json(rows || []);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.addMessage = async (req, res) => {
  try {
    const id = parseInt(String(req.params.id || '0'), 10);
    const tid = req.tenantId || null;
    if (!id || !(id > 0)) return res.status(400).json({ message: 'Invalid id' });
    const row = await repo.getById(id, tid);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const role = String(req.user?.role || '').toLowerCase();
    const own = String(row.userId) === String(req.user?.id);
    if (!own && role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const text = String(req.body?.message || '').trim();
    if (!text) return res.status(400).json({ message: 'メッセージを入力してください' });
    const newId = await repo.addMessage({ requestId: id, userId: req.user?.id, message: text, tenantId: tid });
    return res.status(201).json({ id: newId });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateByActor = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const id = parseInt(String(req.params.id || ''), 10);
    const tid = req.tenantId || null;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id, tid);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const own = String(row.userId) === String(req.user?.id);
    const currentStatus = String(row.status || 'pending');
    if (role === 'admin' || (own && (currentStatus === 'pending' || currentStatus === 'rejected'))) {
      const { requestedCheckIn, requestedCheckOut, reason } = req.body || {};
      await repo.updateFields(id, { requestedCheckIn, requestedCheckOut, reason, tenantId: tid });
      if (own && role !== 'admin' && currentStatus === 'rejected') {
        await repo.updateStatus(id, 'pending', null, tid);
        try {
          const userName = String(req.user?.username || req.user?.email || `user#${req.user?.id}`);
          await noticesRepo.createAdminNotification({
            kind: 'time_adjust',
            title: '時間修正再申請',
            message: `${userName} さんが時間修正を再申請しました`,
            linkUrl: '/admin/attendance/adjust-requests',
            payload: {
              source: 'adjust',
              requestId: id,
              userId: req.user?.id || null
            },
            createdBy: req.user?.id || null,
            audience: 'admin_manager'
          });
        } catch (e) { /* silently ignored */ }
      }
      return res.status(200).json({ ok: true, id });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
