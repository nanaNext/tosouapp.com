const attendanceService = require('../attendance/attendance.service');
// Controller quản lý: báo cáo nhóm, quản lý ca làm
exports.groupReport = async (req, res) => {
  try {
    const { userIds, from, to } = req.query;
    if (!userIds || !from || !to) {
      return res.status(400).json({ message: 'Missing userIds/from/to' });
    }
    const ids = String(userIds).split(',').map(s => s.trim()).filter(Boolean);
    const reports = [];
    for (const id of ids) {
      const r = await attendanceService.timesheet(id, from, to);
      reports.push({ userId: id, ...r });
    }
    const total = reports.reduce((acc, r) => {
      acc.regularMinutes += r.total.regularMinutes;
      acc.overtimeMinutes += r.total.overtimeMinutes;
      acc.nightMinutes += r.total.nightMinutes;
      return acc;
    }, { regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0 });
    res.status(200).json({ reports, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.assignShift = async (req, res) => {
  try {
    // Placeholder: yêu cầu tạo bảng user_shift_assignments trước khi dùng
    res.status(501).json({ message: 'Not Implemented: create table user_shift_assignments first' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
