// 部門管理の各タブで使う小さな共通部品

export function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

// alert() の代わりの小さな通知（保存しました 等）
export function toast(msg) {
  let el = document.querySelector('.org-toast');
  if (!el) { el = document.createElement('div'); el.className = 'org-toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

export function userLabel(u) {
  if (!u) return '';
  return `${u.employee_code ? `${u.employee_code} ` : ''}${u.username || u.email || u.id}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDate(s) {
  return s ? String(s).slice(0, 10).replace(/-/g, '/') : '';
}
