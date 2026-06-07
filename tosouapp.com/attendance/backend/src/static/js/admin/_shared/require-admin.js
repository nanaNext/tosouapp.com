import { fetchJSONAuth } from '../../api/http.api.js';

export async function requireAdmin() {
  let profile = null;
  try {
    profile = await fetchJSONAuth('/api/auth/me');
  } catch (e) { console.error('[require-admin.js] Swallowed error:', e); }
  const role = String(profile && profile.role ? profile.role : '').toLowerCase();
  if (!profile || (role !== 'admin' && role !== 'manager')) {
    try {
      const err = document.querySelector('#error');
      if (err) {
        err.style.display = 'block';
        err.textContent = profile ? '管理者権限が必要です。従業員ポータルへ移動してください。' : 'ログインが必要です。もう一度ログインしてください。';
      }
    } catch (e) { console.error('[require-admin.js] Swallowed error:', e); }
    try {
      const sp = document.querySelector('#pageSpinner');
      if (sp) { sp.setAttribute('hidden', ''); sp.style.display = 'none'; }
    } catch (e) { console.error('[require-admin.js] Swallowed error:', e); }
    try { window.location.replace('/ui/login'); } catch (e) { console.error('[require-admin.js] Swallowed error:', e); }
    return null;
  }
  return profile;
}
