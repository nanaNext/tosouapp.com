import { fetchJSONAuth } from '../../api/http.api.js';

export async function requireAdmin() {
  let profile = null;
  try {
    profile = await fetchJSONAuth('/api/auth/me');
  } catch (e) { /* silently ignored */ }
  const role = String(profile && profile.role ? profile.role : '').toLowerCase();
  const path = window.location.pathname;
  const isAllowedEmployeePath = path === '/admin/attendance';
  if (!profile || (role !== 'admin' && role !== 'manager' && !(role === 'employee' && isAllowedEmployeePath))) {
    try {
      const err = document.querySelector('#error');
      if (err) {
        err.style.display = 'block';
        err.textContent = profile ? '管理者権限が必要です。従業員ポータルへ移動してください。' : 'ログインが必要です。もう一度ログインしてください。';
      }
    } catch (e) { /* silently ignored */ }
    try {
      const sp = document.querySelector('#pageSpinner');
      if (sp) { sp.setAttribute('hidden', ''); sp.style.display = 'none'; }
    } catch (e) { /* silently ignored */ }
    try { window.location.replace('/ui/login'); } catch (e) { /* silently ignored */ }
    return null;
  }
  return profile;
}
