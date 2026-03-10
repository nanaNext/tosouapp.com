import { me, refresh } from '../api/auth.api.js';

const $ = (sel) => document.querySelector(sel);

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureAuthProfile() {
  let token = localStorage.getItem('accessToken');
  let profile = null;
  if (token) {
    try { profile = await me(token); } catch {}
  }
  if (!profile) {
    try {
      const csrf = getCookie('csrfToken');
      const r = await refresh(csrf);
      localStorage.setItem('accessToken', r.accessToken);
      token = r.accessToken;
      profile = await me(token);
    } catch {}
  }
  if (!profile) {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user && user.role) {
        return { username: user.username, email: user.email, role: user.role };
      }
    } catch {}
    const err = document.querySelector('#error');
    if (err) { err.style.display = 'block'; err.textContent = 'ログインが必要です。'; }
    return null;
  }
  return profile;
}

document.addEventListener('DOMContentLoaded', async () => {
  const status = $('#status');
  if (status) status.textContent = '認証を確認しています…';
  let profile = null;
  try {
    profile = await ensureAuthProfile();
  } catch (e) {
    const err = $('#error');
    if (err) { err.style.display = 'block'; err.textContent = '認証エラー: ' + (e?.message || 'unknown'); }
  }
  if (!profile) return;
  const role = String(profile.role || '').toLowerCase();
  if (role === 'admin') {
    window.location.href = '/ui/admin';
    return;
  }
  $('#userName').textContent = profile.username || profile.email || 'ユーザー';
  if (status) status.textContent = 'Ready';
});
