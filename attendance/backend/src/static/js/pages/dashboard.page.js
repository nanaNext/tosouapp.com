import { me, refresh } from '../api/auth.api.js';

const $ = (sel) => document.querySelector(sel);

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureProfile() {
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
    window.location.href = '/static/html/login.html';
    return null;
  }
  return profile;
}

function renderTiles(role) {
  const tiles = $('#tiles');
  if (!tiles) return;
  tiles.innerHTML = '';
  const add = (href, title, icon = '›', wide = false) => {
    const a = document.createElement('a');
    a.className = 'tile' + (wide ? ' wide' : '');
    a.href = href;
    if (icon && !wide) {
      const i = document.createElement('div'); i.className = 'icon'; i.textContent = icon; a.appendChild(i);
    }
    const t = document.createElement('div'); t.className = 'title'; t.textContent = title; a.appendChild(t);
    if (wide) { const ar = document.createElement('div'); ar.className = 'arrow'; ar.textContent = '›'; a.appendChild(ar); }
    tiles.appendChild(a);
  };
  const common = () => {
    add('/ui/attendance', '勤怠入力', '⟳');
    add('/ui/adjust', '経費精算', '🧾');
    add('/ui/chatbot', 'エンジニアサポートセンター', '', true);
    add('/ui/salary', '給与明細など', '', true);
  };
  const r = String(role || '').toLowerCase();
  if (r === 'admin') {
    add('/ui/admin', '管理ポータル', '⚙️');
    add('/ui/overtime', '残業申請', '⏰');
    add('/ui/portal', '従業員ポータルへ', '', true);
    add('/ui/admin?tab=users', 'ユーザー管理', '👥');
    add('/ui/admin?tab=departments', '部門管理', '🏢');
    add('/ui/admin?tab=settings', 'システム設定', '🛠');
    add('/ui/admin?tab=audit', '監査ログ', '📜');
    add('/ui/admin?tab=refresh', 'トークン管理', '♻️');
    common();
  } else if (r === 'manager') {
    add('/ui/overtime', '残業申請', '⏰');
    common();
  } else {
    add('/ui/overtime', '残業申請', '⏰');
    common();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const status = $('#status');
  if (status) status.textContent = '認証を確認しています…';
  let profile = null;
  try {
    profile = await ensureProfile();
  } catch (e) {
    const err = $('#error');
    if (err) { err.style.display = 'block'; err.textContent = '認証エラー: ' + (e?.message || 'unknown'); }
  }
  if (!profile) return;
  $('#userName').textContent = profile.username || profile.email || 'ユーザー';
  renderTiles(profile.role);
  if (status) status.textContent = 'Ready';
});
