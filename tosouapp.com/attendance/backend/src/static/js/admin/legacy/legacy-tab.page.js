export async function bootLegacyTab({ tab, hash, host }) {
  try {
    const url = new URL(window.location.href);
    if (tab) url.searchParams.set('tab', tab);
    else url.searchParams.delete('tab');
    url.hash = hash || '';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch (e) { /* bỏ qua lỗi */ }

  if (tab === 'payroll_editor') {
    let v = '';
    try {
      const meta = document.querySelector('meta[name="asset-v"]');
      v = meta ? (meta.getAttribute('content') || '') : '';
      if (!v) v = window.__assetV ? String(window.__assetV) : '';
    } catch (e) { /* bỏ qua lỗi */ }
    const spec = v ? `../payroll/editor.page.js?v=${encodeURIComponent(v)}` : '../payroll/editor.page.js';
    const mod = await import(spec);
    if (mod.mount && host) {
       return await mod.mount({ content: host });
    }
    return await mod.mount();
  }
// cái này dùng để render legacy tab

  let p = '../../pages/admin.page.js?v=navy-20260421-authfix1';
  try {
    let v = '';
    try {
      const meta = document.querySelector('meta[name="asset-v"]');
      v = meta ? (meta.getAttribute('content') || '') : '';
    } catch (e) { /* bỏ qua lỗi */ }
    if (!v) {
      try { v = window.__assetV ? String(window.__assetV) : ''; } catch (e) { /* bỏ qua lỗi */ }
    }
    if (v && p.indexOf('v=') < 0) p = p + '?v=' + encodeURIComponent(String(v));
  } catch (e) { /* bỏ qua lỗi */ }
  await import(p);
  try {
    // Báo cho legacy page refresh lại tab mà không kích hoạt vòng lặp router admin mới
    window.__legacyTabPopstate = '1';
    window.dispatchEvent(new Event('popstate'));
  } catch (e) { /* bỏ qua lỗi */ }
}
