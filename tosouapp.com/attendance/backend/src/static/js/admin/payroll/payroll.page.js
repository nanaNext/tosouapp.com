const withAssetV = (path) => {
  try {
    const p = String(path || '');
    if (!p) return p;
    let v = '';
    try {
      const meta = document.querySelector('meta[name="asset-v"]');
      v = meta ? (meta.getAttribute('content') || '') : '';
      if (!v) v = window.__assetV ? String(window.__assetV) : '';
    } catch (e) { /* silently ignored */ }
    if (!v) return p;
    return p + (p.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(v);
  } catch {
    return path;
  }
};

async function bootLegacyTab(opts) {
  const mod = await import(withAssetV('../legacy/legacy-tab.page.js'));
  return mod.bootLegacyTab(opts);
}

const normalizePath = (p) => {
  const s = String(p || '');
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
};

export async function mount(options = {}) {
  const content = options.content || document.querySelector('#adminContent');
  if (!content) return;
  content.className = 'card';
  
  const p = normalizePath(window.location.pathname);
  if (p === '/admin/payroll/payslips') {
    return await bootLegacyTab({ tab: 'salary_send', hash: '', host: content });
  }
  if (p === '/admin/payroll/salary') {
    return await bootLegacyTab({ tab: 'payroll_editor', hash: '', host: content });
  }
  return await bootLegacyTab({ tab: 'payroll_editor', hash: '', host: content });
}
