/**
 * Chuẩn hóa role từ nhiều format (Tiếng Nhật, Tiếng Việt, English) về dạng chuẩn.
 * Dùng chung cho toàn hệ thống để đảm bảo nhất quán.
 * 
 * @param {string} input - Role string (có thể là 'admin', '管理者', 'quản lý', v.v.)
 * @returns {string} - Một trong: 'admin', 'manager', 'employee', 'payroll', hoặc giá trị gốc (lowercase)
 */
function normalizeRole(input) {
  const r = String(input || '').trim().toLowerCase();
  if (r === 'admin' || r === 'manager' || r === 'employee' || r === 'payroll') return r;
  if (r === '管理者' || r === 'administrator' || r === 'quanly' || r === 'quản lý') return 'admin';
  if (r === 'マネージャー' || r === 'supervisor' || r === 'lead') return 'manager';
  if (r === '従業員' || r === 'nhanvien' || r === 'nhân viên' || r === 'staff') return 'employee';
  return r || 'employee';
}

module.exports = { normalizeRole };
