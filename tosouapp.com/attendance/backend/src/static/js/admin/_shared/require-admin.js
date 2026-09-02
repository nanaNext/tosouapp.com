import { fetchJSONAuth } from '../../api/http.api.js';

export async function requireAdmin() {
  let profile = null;
  try {
    profile = await fetchJSONAuth('/api/auth/me');
  } catch (e) { /* bỏ qua lỗi */ }
  const role = String(profile && profile.role ? profile.role : '').toLowerCase();
  const path = window.location.pathname;
  const isAllowedEmployeePath = path === '/admin/attendance';
  // Cho phép: admin, manager, owner, sysadmin (và employee ở path cụ thể)
  const isAllowed = role === 'admin' || role === 'manager' || role === 'owner' || role === 'sysadmin'
    || (role === 'employee' && isAllowedEmployeePath);
  if (!profile || !isAllowed) {
    try {
      const err = document.querySelector('#error');
      if (err) {
        err.style.display = 'block';
        err.textContent = profile ? '管理者権限が必要です。従業員ポータルへ移動してください。' : 'ログインが必要です。もう一度ログインしてください。';
      }
    } catch (e) { /* bỏ qua lỗi */ }
    try {
      const sp = document.querySelector('#pageSpinner');
      if (sp) { sp.setAttribute('hidden', ''); sp.style.display = 'none'; }
    } catch (e) { /* bỏ qua lỗi */ }
    try { window.location.replace('/ui/login'); } catch (e) { /* bỏ qua lỗi */ }
    return null;
  }
  return profile;
}
