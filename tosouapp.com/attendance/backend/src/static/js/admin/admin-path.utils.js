/**
 * admin-path.utils.js
 * Path/URL helpers cho admin SPA.
 * Tách ra từ admin.page.js để dễ bảo trì.
 */

import { normalizePath } from './admin-nav.utils.js';

/**
 * Map legacy /ui/admin?tab=xxx sang path mới /admin/xxx
 */
export const mapLegacyAdminToNewPath = (href) => {
  try {
    const u = new URL(href, window.location.origin);
    if (normalizePath(u.pathname) !== '/ui/admin') return null;
    const tab = (u.searchParams.get('tab') || '').trim();
    if (!tab) return '/admin/dashboard';
    if (tab === 'employees') return '/admin/employees';
    if (tab === 'attendance') return '/admin/attendance';
    if (tab === 'shifts') return '/admin/attendance/shifts';
    if (tab === 'calendar') return '/admin/attendance/holidays';
    if (tab === 'leave_grant') return '/admin/leave/grants';
    if (tab === 'leave_balance') return '/admin/leave/balance';
    if (tab === 'approvals') return '/admin/leave/requests';
    if (tab === 'salary_list') return '/admin/payroll/salary';
    if (tab === 'salary_send') return '/admin/payroll/payslips';
    if (tab === 'departments') return '/admin/departments';
    if (tab === 'audit') return '/admin/system/audit-logs';
    if (tab === 'settings') return '/admin/system/settings';
    return '/admin/dashboard';
  } catch (e) { /* silently ignored */ }
  return null;
};

export const isSameOrigin = (href) => {
  try {
    const u = new URL(href, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
};

export const isAdminPath = (pathname) => {
  const p = normalizePath(pathname);
  return p === '/admin' || p.startsWith('/admin/');
};

export const toLegacyState = (path) => {
  const p = normalizePath(path);
  if (p === '/admin' || p === '/admin/dashboard') return { tab: null, hash: '' };
  if (p === '/admin/employees') return { tab: 'employees', hash: '#list' };
  if (p === '/admin/employees/add') return { tab: 'employees', hash: '#add' };
  if (p === '/admin/employees/change-requests') return { tab: 'approvals', hash: '' };
  if (p === '/admin/attendance/monthly') return { redirect: '/ui/attendance/monthly' };
  if (p === '/admin/leave/requests') return { tab: 'approvals', hash: '' };
  if (p === '/admin/leave/grants') return { tab: 'leave_grant', hash: '' };
  if (p === '/admin/leave/balance') return { tab: 'leave_balance', hash: '' };
  if (p === '/admin/payroll/salary') return { tab: 'salary_list', hash: '' };
  if (p === '/admin/payroll/payslips') return { tab: 'salary_send', hash: '' };
  if (p === '/admin/departments' || p === '/admin/organization/departments') return { tab: 'departments', hash: '' };
  if (p === '/admin/chatbot/categories') return { redirect: '/ui/chatbot' };
  if (p === '/admin/chatbot/user-questions') return { redirect: '/ui/chatbot' };
  if (p === '/admin/faq') return { redirect: '/admin/chatbot/faq' };
  if (p === '/admin/system/settings') return { tab: 'settings', hash: '' };
  if (p === '/admin/system/audit-logs') return { tab: 'audit', hash: '' };
  return null;
};

export const syncUrlState = () => {
  const state = toLegacyState(window.location.pathname);
  if (!state) return;
  if (state.redirect) {
    try { window.location.assign(state.redirect); } catch { window.location.href = state.redirect; }
    return;
  }
  const url = new URL(window.location.href);
  if (state.tab) url.searchParams.set('tab', state.tab);
  else url.searchParams.delete('tab');
  url.hash = state.hash || '';
  try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (e) { /* silently ignored */ }
};
