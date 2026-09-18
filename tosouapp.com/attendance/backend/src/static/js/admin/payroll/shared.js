import { fetchResponseAuth } from '../../api/http.api.js';

export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

export const employeeCode = (u) => String(
  (u && (u.employee_code || u.employeeCode)) || ('EMP' + String(u?.id || '').padStart(3, '0'))
).trim();

// Bare formatted number, no symbol/unit — caller prepends its own '¥'. Returns '0' for missing values.
export const yenPlain = (n) => {
  const v = Math.round(Number(n) || 0);
  try { return new Intl.NumberFormat('ja-JP').format(v); }
  catch { return String(v); }
};

// Formatted amount with a '円' unit suffix. Returns '—' for missing values (null/undefined/NaN).
export const yenWithUnit = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const rounded = Math.round(Number(n));
  try { return `${new Intl.NumberFormat('ja-JP').format(rounded)} 円`; }
  catch { return `${rounded} 円`; }
};

export function ensureStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export async function openPdf(url) {
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) { window.alert('ポップアップがブロックされました。許可してください。'); return; }
  try {
    const res = await fetchResponseAuth(url);
    if (!String(res.headers.get('content-type') || '').toLowerCase().includes('application/pdf')) {
      let text = '';
      try { text = await res.clone().text(); } catch { /* ignore */ }
      newTab.close();
      window.alert(text || 'PDFの取得に失敗しました。');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    newTab.location.href = objectUrl;
    setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ } }, 30000);
  } catch (err) {
    try { newTab.close(); } catch { /* ignore */ }
    window.alert(String(err?.message || 'エラーが発生しました'));
  }
}
