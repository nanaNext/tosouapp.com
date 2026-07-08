/**
 * expenses.helpers.js
 * Utility/helper functions cho expenses admin page.
 * Tách ra từ expenses.page.js để dễ bảo trì.
 */

export const $ = (sel) => document.querySelector(sel);

export const showSpinner = () => {
  try { const el = document.querySelector('#pageSpinner'); if (el) { el.removeAttribute('hidden'); el.style.display = 'grid'; } } catch (e) { /* silently ignored */ }
};
export const hideSpinner = () => {
  try { const el = document.querySelector('#pageSpinner'); if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; } } catch (e) { /* silently ignored */ }
};

export const todayISO = () => new Date().toLocaleDateString('sv-SE');
export const todayMonth = () => todayISO().slice(0, 7);

export const fmtDT = (v) => {
  if (!v) return '';
  try {
    const d = typeof v === 'string' ? new Date(v) : v;
    if (!d || isNaN(d.getTime())) return String(v).replace('T', ' ').slice(0, 16);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch { return String(v).replace('T', ' ').slice(0, 16); }
};

export const fmtJPY = (n) => `¥${Number(n || 0).toLocaleString('ja-JP')}`;

export const fmtMonthLabel = (ym) => {
  const s = String(ym || '');
  if (!/^\d{4}-\d{2}$/.test(s)) return '';
  return s.replace('-', '/');
};

export const statusLabel = (st) => {
  const v = String(st || '').toLowerCase();
  if (v === 'applied') return '承認待ち';
  if (v === 'approved') return '承認済';
  if (v === 'paid') return '支給済';
  if (v === 'rejected') return '差戻し';
  if (v === 'draft') return '下書き';
  if (v === 'pending') return '未申請';
  return String(st || '');
};

export const statusPillClass = (st) => {
  const v = String(st || '').toLowerCase();
  if (v === 'approved') return 'st-approved';
  if (v === 'paid') return 'st-paid';
  if (v === 'applied') return 'st-applied';
  if (v === 'rejected') return 'st-rejected';
  return 'st-other';
};

export const isYM = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));

export const addMonthsYM = (ym, delta) => {
  const s = String(ym || '');
  if (!isYM(s)) return '';
  let y = parseInt(s.slice(0, 4), 10);
  let m = parseInt(s.slice(5, 7), 10);
  const d = parseInt(String(delta || '0'), 10) || 0;
  m += d;
  while (m <= 0) { y -= 1; m += 12; }
  while (m > 12) { y += 1; m -= 12; }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
};

export const listYMBack = (ym, n) => {
  const base = isYM(ym) ? String(ym) : todayMonth();
  const num = Math.max(1, Math.min(24, parseInt(String(n || '6'), 10) || 6));
  const out = [];
  for (let i = num - 1; i >= 0; i -= 1) out.push(addMonthsYM(base, -i));
  return out;
};
