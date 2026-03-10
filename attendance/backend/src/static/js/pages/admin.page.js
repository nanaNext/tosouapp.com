import { me, refresh } from '../api/auth.api.js';

const $ = (sel) => document.querySelector(sel);

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

async function ensureAdmin() {
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
        profile = { id: user.id, username: user.username, email: user.email, role: user.role };
      }
    } catch {}
    if (!profile) {
      const err = document.querySelector('#error');
      if (err) { err.style.display = 'block'; err.textContent = 'ログインが必要です。もう一度お試しください。'; }
      return null;
    }
  }
  const role = String(profile.role || '').toLowerCase();
  if (role !== 'admin') {
    const err = document.querySelector('#error');
    if (err) { err.style.display = 'block'; err.textContent = '管理者権限が必要です。従業員ポータルへ移動してください。'; }
    return null;
  }
  return profile;
}

document.addEventListener('DOMContentLoaded', async () => {
  const status = $('#status');
  if (status) status.textContent = '認証を確認しています…';
  let profile = null;
  try {
    profile = await ensureAdmin();
  } catch (e) {
    const err = $('#error');
    if (err) { err.style.display = 'block'; err.textContent = '認証エラー: ' + (e?.message || 'unknown'); }
  }
  if (!profile) return;
  $('#userName').textContent = profile.username || profile.email || '管理者';
  const token = localStorage.getItem('accessToken');
  const content = $('#adminContent');
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'users';
  const markActive = (t) => {
    ['users','departments','settings','audit','refresh'].forEach(id => {
      const el = $('#tab-' + id);
      if (el) el.style.background = id === t ? '#1151ac' : '#666';
    });
  };
  markActive(tab);
  async function fetchJSONAuth(url, options) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, credentials: 'include', ...options });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
  async function renderUsers() {
    const rows = await fetchJSONAuth('/api/admin/users');
    content.innerHTML = '<h3>ユーザー一覧</h3>';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = '<thead><tr><th>ID</th><th>名前</th><th>Email</th><th>Role</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.id}</td><td>${r.username || ''}</td><td>${r.email || ''}</td><td>${r.role || ''}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    content.appendChild(table);
  }
  async function renderDepartments() {
    const rows = await fetchJSONAuth('/api/admin/departments');
    content.innerHTML = '<h3>部門一覧</h3>';
    const ul = document.createElement('ul');
    for (const d of rows) {
      const li = document.createElement('li');
      li.textContent = `${d.id}: ${d.name}`;
      ul.appendChild(li);
    }
    content.appendChild(ul);
  }
  async function renderSettings() {
    const flags = await fetchJSONAuth('/api/admin/system/flags');
    content.innerHTML = '<h3>システム設定</h3>';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(flags, null, 2);
    content.appendChild(pre);
  }
  async function renderAudit() {
    const r = await fetchJSONAuth('/api/admin/audit');
    content.innerHTML = '<h3>監査ログ</h3>';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(r, null, 2);
    content.appendChild(pre);
  }
  async function renderRefresh() {
    content.innerHTML = '<h3>トークン管理</h3>';
    const q = await fetchJSONAuth(`/api/admin/auth/refresh/list?userId=${encodeURIComponent(profile.id)}&page=1&pageSize=20`);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(q, null, 2);
    content.appendChild(pre);
  }
  try {
    if (tab === 'users') await renderUsers();
    else if (tab === 'departments') await renderDepartments();
    else if (tab === 'settings') await renderSettings();
    else if (tab === 'audit') await renderAudit();
    else if (tab === 'refresh') await renderRefresh();
    else await renderUsers();
  } catch (e) {
    const err = $('#error');
    if (err) { err.style.display = 'block'; err.textContent = '読み込みエラー: ' + (e?.message || 'unknown'); }
  }
  if (status) status.textContent = 'Ready';
});
