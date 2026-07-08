/**
 * employees.helpers.js
 * Utility functions cho employees admin page.
 * Tách ra từ employees.page.js để dễ bảo trì.
 */

export const $ = (sel) => document.querySelector(sel);

export function ensureEmployeePillStyle() {
  try {
    if (!document.querySelector('#empPillStyle')) {
      const style = document.createElement('style');
      style.id = 'empPillStyle';
      style.textContent = `
        .admin .card { --emp-pill-width: max-content; }
        .admin .card table#list { width: 100%; }
        .admin.employees-wide .card table#list:not(.emp-del-list) thead { position: static; }
        .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead { position: static; }
        .admin.employees-wide .card table#list:not(.emp-del-list) thead th { position: static; background: #f3f4f6; box-shadow: 0 1px 0 rgba(16,24,40,.06); }
        .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead th { position: static; background: #f3f4f6; box-shadow: 0 1px 0 rgba(16,24,40,.06); }
        .admin .card table#list.emp-del-list thead th { position: static; background: #f3f4f6; box-shadow: 0 1px 0 rgba(16,24,40,.06); }
        .admin .card table#list tbody td .text-pill,
        .admin .card table#list tbody td .status-pill,
        .admin .card table#list tbody td .role-pill,
        .admin .card table#list tbody td .type-pill { width: var(--emp-pill-width); box-sizing: border-box; }
        .admin .card table#list tbody td.col-code .text-pill { width: max-content; }
        .admin .card table#list tbody td .status-pill { min-height: 32px; padding: 4px 14px; line-height: 1.2; }
        .admin .card table#list tbody td .role-pill { min-height: 32px; padding: 4px 14px; line-height: 1.2; }
        .admin .card table#list tbody td .type-pill { min-height: 32px; padding: 4px 14px; line-height: 1.2; }
        .admin .card table#list tbody tr.emp-row.inactive td { background: #fff7ed; }
        .admin .card table#list tbody tr.emp-row.inactive td { color: #7c2d12; }
        .admin .card table#list tbody tr.emp-row.inactive td { border-top-color: #fdba74; border-bottom-color: #fdba74; }
        .admin .card table#list tbody tr.emp-row.inactive td:first-child { border-left-color: #fb923c; }
        .admin .card table#list tbody tr.emp-row.inactive td:last-child { border-right-color: #fb923c; }
        .admin .card table#list tbody tr.emp-row.inactive td .text-pill { background: transparent; border-color: transparent; color: #7c2d12; }
        .admin .card table#list tbody tr.emp-row.inactive td .text-pill a { color: inherit; }
        .admin .card table#list tbody tr.emp-row.retired td { background: #f8fafc; color: #475569; }
        @media (max-width: 640px) {
          .admin.employees-wide .card table#list:not(.emp-del-list) thead,
          .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead,
          .admin.employees-wide .card table#list:not(.emp-del-list) thead th,
          .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead th {
            top: auto !important;
            position: static !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  } catch (e) { /* silently ignored */ }
}

export const showNavSpinner = () => {
  try { sessionStorage.removeItem('navSpinner'); } catch (e) { /* silently ignored */ }
};

export const hideNavSpinner = () => {
  try {
    const c = document.querySelector('#adminContent');
    if (c) c.style.visibility = '';
  } catch (e) { /* silently ignored */ }
};

export const getTopbarSearchParts = () => {
  try {
    const searchBox = document.querySelector('.topbar .search');
    if (!searchBox) return null;
    const input = searchBox.querySelector('input[type="search"]');
    const hint = searchBox.querySelector('.search-hint');
    const meta = searchBox.querySelector('.search-meta');
    const closeBtn = searchBox.querySelector('.search-close');
    return { searchBox, input, hint, meta, closeBtn };
  } catch {
    return null;
  }
};

export const bindTopbarSearchClear = () => {
  try {
    const parts = getTopbarSearchParts();
    const closeBtn = parts && parts.closeBtn;
    if (!closeBtn) return;
    if (closeBtn.dataset.empClearBound === '1') return;
    closeBtn.dataset.empClearBound = '1';
    const clearAndBack = (e) => {
      try { e.preventDefault(); } catch (e) { /* silently ignored */ }
      try { e.stopPropagation(); } catch (e) { /* silently ignored */ }
      try { window.location.assign('/admin/employees#list'); } catch { window.location.href = '/admin/employees#list'; }
    };
    closeBtn.addEventListener('pointerdown', clearAndBack, true);
    closeBtn.addEventListener('click', clearAndBack, true);
  } catch (e) { /* silently ignored */ }
};

export const syncTopbarSearchKeyword = (keyword) => {
  try {
    bindTopbarSearchClear();
    const parts = getTopbarSearchParts();
    if (!parts) return;
    const { searchBox, input, meta } = parts;
    const q = String(keyword || '').trim();
    if (input) input.value = q;
    if (q) {
      searchBox.classList.add('emp-query-active');
      if (meta) meta.removeAttribute('aria-hidden');
      return;
    }
    searchBox.classList.remove('emp-query-active');
  } catch (e) { /* silently ignored */ }
};

export const clearTopbarNoResultState = () => {
  try {
    const parts = getTopbarSearchParts();
    const searchBox = parts && parts.searchBox;
    if (!searchBox) return;
    searchBox.classList.remove('emp-no-result');
    const hint = parts.hint;
    if (!hint) return;
    const def = String(hint.dataset.defaultText || '').trim();
    hint.textContent = def || 'Ctrl+K';
    hint.removeAttribute('title');
    hint.style.display = '';
  } catch (e) { /* silently ignored */ }
};

export const setTopbarNoResultState = (searchedText) => {
  try {
    const searchBox = document.querySelector('.topbar .search');
    if (!searchBox) return;
    const hint = searchBox.querySelector('.search-hint');
    if (!hint) return;
    if (!hint.dataset.defaultText) {
      hint.dataset.defaultText = String(hint.textContent || 'Ctrl+K');
    }
    const q = String(searchedText || '').trim();
    if (!q) {
      clearTopbarNoResultState();
      return;
    }
    const msg = `「${q}」に一致する社員が見つかりません`;
    searchBox.classList.add('emp-no-result');
    hint.textContent = msg;
    hint.title = msg;
    hint.style.display = 'inline-flex';
  } catch (e) { /* silently ignored */ }
};

export function getEmployeesMode(pathname, hash, detailId, editId, summaryId, createFlag) {
  if (editId) return 'edit';
  if (summaryId) return 'summary';
  if (detailId) return 'detail';
  if (createFlag) return 'add';
  if (pathname === '/admin/employees/add') return 'add';
  if (pathname === '/admin/employees/delete') return 'delete';
  if (hash === '#add') return 'add';
  if (hash === '#delete') return 'delete';
  if (hash === '#edit') return 'edit';
  if (hash === '#summary') return 'summary';
  return 'list';
}

export const isEmployeesPath = (pathname) => {
  const p = String(pathname || '');
  return p === '/admin/employees' || p === '/admin/employees/' || p.startsWith('/admin/employees/');
};
