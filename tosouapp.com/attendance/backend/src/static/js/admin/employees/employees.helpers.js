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
        /* Employee list container */
        .admin .emp-list-scroll-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 0;
          background: #fff;
        }
        
        /* Employee table base */
        .admin .card table#list {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          min-width: 900px;
        }
        
        /* Table header */
        .admin .card table#list thead th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          font-size: 13px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        /* Table body rows */
        .admin .card table#list tbody td {
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          padding: 12px 16px;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
          vertical-align: middle;
        }
        
        .admin .card table#list tbody tr:hover td {
          background: #f8fafc;
        }
        
        /* Action buttons styling */
        .admin .card table#list .emp-action-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .card table#list .emp-action-group .emp-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 32px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .card table#list .emp-action-group .emp-action:hover {
          background: #f1f5f9;
          border-color: #9ca3af;
        }
        
        .admin .card table#list .emp-action-group .emp-action.danger {
          color: #dc2626;
          border-color: #fecaca;
        }
        
        .admin .card table#list .emp-action-group .emp-action.danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        
        /* Status pill styling */
        .admin .card table#list .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .status-pill.active {
          background: #dcfce7;
          color: #166534;
        }
        
        .admin .card table#list .status-pill.inactive {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .status-pill.retired {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        /* Role pill styling */
        .admin .card table#list .role-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .role-pill.admin {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .admin .card table#list .role-pill.manager {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .role-pill.employee {
          background: #dbeafe;
          color: #1e40af;
        }
        
        /* Type pill styling */
        .admin .card table#list .type-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .type-pill.full {
          background: #dcfce7;
          color: #166534;
        }
        
        .admin .card table#list .type-pill.part {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .type-pill.contract {
          background: #dbeafe;
          color: #1e40af;
        }
        
        /* Text pill styling */
        .admin .card table#list .text-pill {
          display: inline-flex;
          align-items: center;
          font-size: 14px;
          color: #1e293b;
        }
        
        .admin .card table#list .text-pill.neutral {
          background: transparent;
          color: #1e293b;
        }
        
        /* Inactive/Retired row styling */
        .admin .card table#list tbody tr.emp-row.inactive td {
          background: #fffbeb;
        }
        
        .admin .card table#list tbody tr.emp-row.retired td {
          background: #f9fafb;
          color: #6b7280;
        }
        
        /* Name link styling */
        .admin .card table#list .col-name a {
          color: #1e40af;
          text-decoration: none;
          font-weight: 600;
        }
        
        .admin .card table#list .col-name a:hover {
          text-decoration: underline;
        }
        
        /* Filter bar styling */
        .admin .emp-filters.filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          flex-wrap: wrap;
        }
        
        .admin .emp-filters.filter-bar .fi {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .emp-filters.filter-bar .fi-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
        }
        
        .admin .emp-filters.filter-bar .fi-code,
        .admin .emp-filters.filter-bar .fi-name,
        .admin .emp-filters.filter-bar .fi-select {
          height: 36px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        
        .admin .emp-filters.filter-bar .fi-code:focus,
        .admin .emp-filters.filter-bar .fi-name:focus,
        .admin .emp-filters.filter-bar .fi-select:focus {
          border-color: #3b82f6;
        }
        
        .admin .emp-filters.filter-bar .btn {
          height: 36px;
          padding: 0 20px;
          border: 1px solid #0f172a;
          border-radius: 0;
          background: #0f172a;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .emp-filters.filter-bar .btn:hover {
          background: #1e293b;
        }
        
        /* Pagination styling */
        .admin .card > div:has(#empPrev) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          gap: 16px;
        }
        
        .admin .pager-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .admin .pager-left button {
          height: 36px;
          padding: 0 16px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .pager-left button:hover:not(:disabled) {
          background: #f1f5f9;
        }
        
        .admin .pager-left button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .admin #empPageInfo {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }
        
        /* Page size selector */
        .admin .pager-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .pager-right label {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }
        
        .admin .pager-right select {
          height: 36px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
        }
        
        @media (max-width: 640px) {
          .admin .card table#list {
            min-width: 100%;
          }
          
          .admin .emp-filters.filter-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .admin .emp-filters.filter-bar .fi {
            width: 100%;
          }
          
          .admin .emp-filters.filter-bar .fi-code,
          .admin .emp-filters.filter-bar .fi-name,
          .admin .emp-filters.filter-bar .fi-select {
            flex: 1;
            width: 100%;
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
