import { listUsers } from '../api/users.api.js';
import { getTimesheet, getAttendanceDay, updateAttendanceSegment, buildTimesheetExportURL } from '../api/attendance.api.js';
import { wireAdminShell } from '../shell/admin-shell.js?v=navy-20260612-fixspa2';
import { normalizePath, markActiveNav, expandActiveSidebarSection, wireSidebarAccordion } from './admin-nav.utils.js';
import { wireExpandingSearch, setTopbarHeightVar } from './admin-ui.utils.js';
import { mapLegacyAdminToNewPath, isSameOrigin, isAdminPath } from './admin-path.utils.js';
import { createLoader } from './admin-loader.utils.js';

// Tạo loadModule gắn với import.meta.url của file này để resolve relative paths đúng
const loadModule = createLoader(import.meta.url);

let lastRenderErr = null;
let globalErrShown = false;
try {
  window.addEventListener('error', (ev) => {
    if (globalErrShown) return;
    if (!lastRenderErr) return;
    try {
      globalErrShown = true;
      const file = String((ev && ev.filename) ? ev.filename : '');
      const line = Number((ev && ev.lineno) ? ev.lineno : 0) || 0;
      const col = Number((ev && ev.colno) ? ev.colno : 0) || 0;
      const loc = file ? `${file}${line ? `:${line}` : ''}${col ? `:${col}` : ''}` : '';
      const baseMsg = String((ev && ev.message) ? ev.message : 'Unknown error');
      const err = (ev && ev.error) ? ev.error : new Error(baseMsg);
      if (loc && !String(err.message || '').includes(loc)) {
        err.message = String(err.message || baseMsg) + `\n@ ${loc}`;
      }
      lastRenderErr(err);
    } catch (e) { /* silently ignored */ }
  });
  window.addEventListener('unhandledrejection', (ev) => {
    if (globalErrShown) return;
    if (!lastRenderErr) return;
    try {
      globalErrShown = true;
      const r = ev ? ev.reason : null;
      const err = r instanceof Error ? r : new Error(String(r || 'Unhandled rejection'));
      lastRenderErr(err);
    } catch (e) { /* silently ignored */ }
  });
} catch (e) { /* silently ignored */ }













const resetTransientUiState = () => {
  try {
    const dd = document.querySelector('#userDropdown');
    const btn = document.querySelector('.user-btn');
    if (dd && !dd.hasAttribute('hidden')) dd.setAttribute('hidden', '');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  } catch (e) { /* silently ignored */ }
  try {
    const drawer = document.querySelector('#mobileDrawer');
    const backdrop = document.querySelector('#drawerBackdrop');
    const mobileBtn = document.querySelector('#mobileMenuBtn');
    if (drawer) {
      drawer.setAttribute('hidden', '');
      drawer.style.display = 'none';
      drawer.style.removeProperty('pointer-events');
    }
    if (backdrop) {
      backdrop.setAttribute('hidden', '');
      backdrop.style.display = 'none';
      backdrop.style.removeProperty('pointer-events');
    }
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  } catch (e) { /* silently ignored */ }
  try {
    document.querySelectorAll('#pageSpinner, .page-spinner').forEach((spinner) => {
      try { spinner.setAttribute('hidden', 'true'); } catch (e) { /* silently ignored */ }
      try { spinner.style.display = 'none'; } catch (e) { /* silently ignored */ }
      try { spinner.style.pointerEvents = 'none'; } catch (e) { /* silently ignored */ }
      try { spinner.style.visibility = 'hidden'; } catch (e) { /* silently ignored */ }
      try { spinner.style.opacity = '0'; } catch (e) { /* silently ignored */ }
    });
    const content = document.querySelector('#adminContent');
    if (content) content.style.visibility = '';
    sessionStorage.removeItem('navSpinner');
  } catch (e) { /* silently ignored */ }
  try {
    document.querySelectorAll('.modal-overlay').forEach((el) => {
      try { el.remove(); } catch (e) { /* silently ignored */ }
    });
  } catch (e) { /* silently ignored */ }
  
  // Ensure body scroll is unlocked when resetting UI state
  try {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('top');
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
  } catch (e) {}
  try {
    const adminEditModal = document.querySelector('#adminEditModal');
    if (adminEditModal) {
      adminEditModal.style.display = 'none';
      try { adminEditModal.remove(); } catch (e) { /* silently ignored */ }
    }
  } catch (e) { /* silently ignored */ }
  try {
    const leaveDynamicHeight = document.querySelector('#leave-dynamic-height');
    if (leaveDynamicHeight) leaveDynamicHeight.remove();
  } catch (e) { /* silently ignored */ }
  try {
    document.querySelectorAll('.subbar .menu.open').forEach((el) => {
      try { el.classList.remove('open'); } catch (e) { /* silently ignored */ }
    });
  } catch (e) { /* silently ignored */ }
  try {
    const search = document.querySelector('.topbar-inner .search');
    const inner = search ? search.closest('.topbar-inner') : null;
    if (search) search.classList.remove('active');
    if (inner && inner.dataset.searchLocked === '1') {
      inner.style.gridTemplateColumns = '';
      delete inner.dataset.searchLocked;
    }
  } catch (e) { /* silently ignored */ }
};

const hardHidePageSpinner = () => {
  try {
    document.querySelectorAll('#pageSpinner, .page-spinner').forEach((spinner) => {
      try { spinner.setAttribute('hidden', 'true'); } catch (e) { /* silently ignored */ }
      try { spinner.style.display = 'none'; } catch (e) { /* silently ignored */ }
      try { spinner.style.pointerEvents = 'none'; } catch (e) { /* silently ignored */ }
      try { spinner.style.visibility = 'hidden'; } catch (e) { /* silently ignored */ }
      try { spinner.style.opacity = '0'; } catch (e) { /* silently ignored */ }
    });
  } catch (e) { /* silently ignored */ }
  try { sessionStorage.removeItem('navSpinner'); } catch (e) { /* silently ignored */ }
};

let currentViewCleanup = null;
let routeSeq = 0;
const route = async () => {
  const seq = ++routeSeq;
  try {
    const cleanup = currentViewCleanup;
    currentViewCleanup = null;
    if (typeof cleanup === 'function') await cleanup();
  } catch (e) { /* silently ignored */ }
  
  // Make sure body doesn't have overflow hidden from other pages
  try {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-y');
    document.body.style.setProperty('overflow-y', 'auto', 'important');
    
    document.documentElement.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow-y');
    document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
    // Special fix for standalone SPA router
    if (document.body.classList.contains('has-sidebar')) {
      document.body.style.setProperty('overflow-y', 'auto', 'important');
    }
  } catch (e) {}
  
  try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { try { window.scrollTo(0, 0); } catch(err) {} }

  resetTransientUiState();
  hardHidePageSpinner();
  try {
    const prevHost = document.querySelector('#adminContent');
    if (prevHost) {
      const host = document.createElement('section');
      host.id = 'adminContent';
      
      // Remove default card styling if it's an attendance hub page or full-bleed page
      if (window.location.pathname.includes('/admin/attendance') || 
          window.location.pathname.includes('/admin/work-reports') ||
          window.location.pathname.includes('/admin/payroll/salary') ||
          window.location.pathname.includes('/admin/payroll/payslips') ||
          window.location.pathname.includes('/admin/leave') ||
          window.location.pathname.includes('/admin/employees') ||
          window.location.pathname.includes('/admin/expenses') ||
          window.location.pathname.includes('/admin/departments') ||
          window.location.pathname.includes('/admin/notices') ||
          window.location.pathname.includes('/admin/faq') ||
          window.location.pathname.includes('/admin/system')) {
        host.className = '';
        host.style.padding = '0';
        host.style.margin = '0';
        host.style.border = 'none';
        host.style.boxShadow = 'none';
        host.style.background = 'transparent';
      } else {
        host.className = '';
        host.style.background = 'transparent';
      }
      
      host.style.visibility = 'hidden';
      prevHost.replaceWith(host);

      // Make sure the parent container (main.content) has no leftover inline styles from legacy pages
      const parent = host.parentElement;
      if (parent && parent.classList.contains('content')) {
        parent.style.removeProperty('padding');
        parent.style.removeProperty('margin');
        parent.style.removeProperty('height');
        parent.style.removeProperty('max-width');
        parent.style.removeProperty('overflow');
        parent.style.removeProperty('border');
        parent.style.removeProperty('box-shadow');
        parent.style.removeProperty('background');
        
        // Restore siblings like #status or #error if they were hidden
        const statusEl = parent.querySelector('#status');
        if (statusEl) statusEl.style.removeProperty('display');
        const errorEl = parent.querySelector('#error');
        if (errorEl) errorEl.style.removeProperty('display');
      }
    }
  } catch (e) { /* silently ignored */ }
  const mountModule = async (mod) => {
    if (!mod || typeof mod.mount !== 'function') {
      currentViewCleanup = null;
      return;
    }
    const cleanup = await mod.mount({ content: document.querySelector('#adminContent') });
    if (seq !== routeSeq) {
      if (typeof cleanup === 'function') {
        try { await cleanup(); } catch (e) { /* silently ignored */ }
      }
      return;
    }
    currentViewCleanup = typeof cleanup === 'function' ? cleanup : null;
    hardHidePageSpinner();
    try { const h = document.querySelector('#adminContent'); if (h) h.style.visibility = ''; } catch (e) {}
  };
  const renderErr = (err) => {
    try {
      const host = document.querySelector('#adminContent');
      if (!host) return;
      const msg = String((err && err.message) ? err.message : (err || 'unknown'));
      const stack = String((err && err.stack) ? err.stack : '').trim();
      let hint = '';
      try {
        const m = msg.match(/Module load failed:\s*(\S+)/);
        if (m && m[1]) hint = `読み込み失敗モジュール: ${m[1]}`;
      } catch (e) { /* silently ignored */ }
      host.innerHTML = `
        <div style="max-width:1100px;margin:18px auto;padding:0 12px;">
          <div style="border:1px solid #fecaca;background:#fff1f2;color:#7f1d1d;border-radius:12px;padding:14px 14px;">
            <div style="font-weight:900;font-size:16px;margin-bottom:6px;">画面の読み込みに失敗しました</div>
            <div style="font-weight:700;font-size:13px;white-space:pre-wrap;word-break:break-word;">${msg.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))}</div>
            ${hint ? `<div style="margin-top:6px;font-weight:800;color:#7f1d1d;">${hint.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))}</div>` : ``}
              ${stack ? `<details style="margin-top:10px;"><summary style="cursor:pointer;font-weight:900;">詳細</summary><div style="margin-top:8px;font-weight:650;font-size:12px;white-space:pre-wrap;word-break:break-word;color:#7f1d1d;">${stack.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))}</div></details>` : ``}
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" id="btnAdminReload" style="height:34px;padding:0 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0b2c66;font-weight:900;cursor:pointer;">再読込</button>
              <button type="button" id="btnAdminHardReload" style="height:34px;padding:0 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0b2c66;font-weight:900;cursor:pointer;">キャッシュ破棄</button>
            </div>
          </div>
        </div>
      `;
      const btnReload = host.querySelector('#btnAdminReload');
      if (btnReload) btnReload.addEventListener('click', () => { try { window.location.reload(); } catch (e) { /* silently ignored */ } });
      const btnHardReload = host.querySelector('#btnAdminHardReload');
      if (btnHardReload) btnHardReload.addEventListener('click', () => {
        try {
          if ('caches' in window) {
            caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => window.location.reload());
            return;
          }
        } catch (e) { /* silently ignored */ }
        try { window.location.reload(); } catch (e) { /* silently ignored */ }
      });
    } catch (e) { /* silently ignored */ }
  };
  lastRenderErr = renderErr;

  try {
    const p = normalizePath(window.location.pathname);
    if (p === '/ui/admin') {
      const mapped = mapLegacyAdminToNewPath(window.location.href) || '/admin/dashboard';
      await navigate(mapped, true);
      return;
    }
    try { document.body.classList.remove('employees-wide'); } catch (e) { /* silently ignored */ }
    try {
      const opens = document.querySelectorAll('.subbar .menu.open');
      for (const el of opens) el.classList.remove('open');
    } catch (e) { /* silently ignored */ }
    markActiveNav();
    try {
      const home = document.querySelector('.sidebar .sidebar-nav a[data-admin-link="dashboard"]');
      if (home) home.classList.add('pinned');
    } catch (e) { /* silently ignored */ }
    expandActiveSidebarSection();
    if (seq !== routeSeq) return;

    try {
      if (p === '/admin') {
        try { history.replaceState(null, '', '/admin/dashboard'); } catch (e) { /* silently ignored */ }
      }
    } catch (e) { /* silently ignored */ }

    let profile = { role: 'employee' };
    try {
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (userStr) profile = JSON.parse(userStr);
    } catch (e) { /* silently ignored */ }
    const role = profile.role || 'employee';

    const p2 = normalizePath(window.location.pathname);
    if (role === 'employee') {
      if (p2 === '/admin/attendance') {
        window.location.replace('/ui/attendance-records');
      } else {
        window.location.replace('/ui/portal');
      }
      return;
    }
    const host = document.querySelector('#adminContent');

    if (p2 === '/admin' || p2 === '/admin/dashboard') {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./legacy/legacy-attendance.page.js?v=navy-20260704-attrecsync6');
      if (seq !== routeSeq) return;
      await mountModule(mod.mountAttendance ? { mount: () => mod.mountAttendance({ content: hubContent, listUsers, getTimesheet, getAttendanceDay, updateAttendanceSegment, buildTimesheetExportURL }) } : mod);
      return;
    }
    if (p2 === '/admin/employees/monthly-summary' || p2 === '/admin/employees/monthly-summary/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/employees/monthly-summary', profile: profile });
      const mod = await loadModule('../pages/admin-employees-monthly-summary.page.js?v=navy-20260704-ms5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : { mount: async () => { hubContent.innerHTML = ''; if (mod.default) await mod.default(hubContent); else Object.assign(hubContent, await mod); } });
      return;
    }
    if (p2 === '/admin/employees' || p2.startsWith('/admin/employees/')) {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
        const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
        const mod = await loadModule('./employees/employees.page.js?v=navy-20260704-empcenter7');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : { mount: async () => { hubContent.innerHTML = ''; if (mod.default) await mod.default(hubContent); else Object.assign(hubContent, await mod); } });
      return;
    }
    if (p2 === '/admin/attendance/monthly' || p2 === '/admin/attendance/monthly/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/monthly' });
      const mod = await loadModule('../pages/admin-attendance-monthly.page.js?v=1');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance/shifts-approvals' || p2 === '/admin/attendance/shifts-approvals/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/shifts-approvals' });
      const mod = await loadModule('./attendance/admin-shifts-approvals.page.js?v=5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance/adjust-requests' || p2 === '/admin/attendance/adjust-requests/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/adjust-requests' });
      const mod = await loadModule('./attendance/admin-attendance-adjust-requests.page.js?v=5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance/go-out' || p2 === '/admin/attendance/go-out/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/go-out' });
      const mod = await loadModule('./attendance/admin-go-out.page.js?v=5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mountGoOut ? { mount: () => mod.mountGoOut({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance/shifts' || p2 === '/admin/attendance/shifts/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/shifts' });
      const mod = await loadModule('./legacy/legacy-shifts.page.js?v=6');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance/holidays' || p2 === '/admin/attendance/holidays/') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/attendance/holidays' });
      const mod = await loadModule('./legacy/legacy-calendar.page.js?v=5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/attendance' || p2.startsWith('/admin/attendance/')) {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./legacy/legacy-attendance.page.js?v=navy-20260423-attrecsync4');
      if (seq !== routeSeq) return;
      await mountModule(mod.mountAttendance ? { mount: () => mod.mountAttendance({ content: hubContent, listUsers, getTimesheet, getAttendanceDay, updateAttendanceSegment, buildTimesheetExportURL }) } : mod);
      return;
    }
    if (p2 === '/admin/leave' || p2.startsWith('/admin/leave/')) {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./leave/leave.page.js?v=8');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/work-reports') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/work-reports' });
      const mod = await loadModule('./work-reports/work-reports.page.js?v=10');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/payroll' || p2.startsWith('/admin/payroll/')) {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./payroll/payroll.page.js?v=2');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/expenses/monthly-detail') {
      const mod = await loadModule('./expenses/monthly-detail.page.js');
      if (seq !== routeSeq) return;
      await mountModule(mod);
      return;
    }
    if (p2 === '/admin/expenses') {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
        const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/expenses' });
        const mod = await loadModule('./expenses/expenses.page.js');
        if (seq !== routeSeq) return;
        await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
        return;
      }
      if (p2 === '/admin/departments' || p2 === '/admin/organization/departments' || p2 === '/admin/organization') {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
        const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/departments' });
        const mod = await loadModule('./organization/organization.page.js');
        if (seq !== routeSeq) return;
        await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
        return;
      }
      if (p2 === '/admin/branches') {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
        const hubContent = await hubMod.mount({ content: host, initialPath: '/admin/branches' });
        const mod = await loadModule('./organization/branches.page.js');
        if (seq !== routeSeq) return;
        await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
        return;
      }
      if (p2 === '/admin/system/settings' || p2 === '/admin/system/audit-logs' || p2 === '/admin/system') {
        const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
        const hubContent = await hubMod.mount({ content: host, initialPath: p2 });
        let modulePath = './system/system.page.js?v=navy-20260421-systemplaceholder1';
        if (p2 === '/admin/system/settings') modulePath = './system/settings.page.js';
        if (p2 === '/admin/system/audit-logs') modulePath = './system/audit-logs.page.js';
        const mod = await loadModule(modulePath);
        if (seq !== routeSeq) return;
        await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
        return;
      }
    if (p2 === '/admin/notices') {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./notices/notices.page.js?v=navy-20260423-noticemobile5');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    if (p2 === '/admin/faq' || p2.indexOf('/admin/chatbot/faq') === 0) {
      const hubMod = await loadModule('./attendance/attendance-hub.page.js?v=1783307547856');
      const hubContent = await hubMod.mount({ content: host, initialPath: p2, profile: profile });
      const mod = await loadModule('./faq/faq.page.js');
      if (seq !== routeSeq) return;
      await mountModule(mod.mount ? { mount: () => mod.mount({ content: hubContent }) } : mod);
      return;
    }
    // Do not fallback to legacy admin bootstrap; it causes mixed old/new
    // headers and visible flicker on first load.
    if (normalizePath(p2) === '/admin') {
      await navigate('/admin/dashboard', true);
      return;
    }
    
    if (host) {
      if (p2.includes('/admin/attendance') || p2.includes('/admin/work-reports')) {
        host.className = '';
        host.style.padding = '0';
        host.style.margin = '0';
      } else {
        host.className = 'card';
      }
      host.innerHTML = '<div style="padding:16px;color:#0f172a;">ページが見つかりません。</div>';
    }
  } catch (err) {
    renderErr(err);
  } finally {
    hardHidePageSpinner();
    try { const h = document.querySelector('#adminContent'); if (h) h.style.visibility = ''; } catch (e) {}
  }
};

const navigate = async (href, replace = false) => {
  try {
    const u = new URL(href, window.location.origin);
    if (!isAdminPath(u.pathname)) {
      window.location.href = u.href;
      return;
    }

    // If there is no SPA container on the current page, do a full page navigation
    if (!document.querySelector('#adminContent')) {
      if (replace) {
        window.location.replace(u.href);
      } else {
        window.location.href = u.href;
      }
      return;
    }

    const cur = new URL(window.location.href);
    const same = normalizePath(cur.pathname) === normalizePath(u.pathname) && cur.search === u.search && cur.hash === u.hash;
    if (!same) {
      try {
        if (replace) history.replaceState(null, '', u.pathname + u.search + u.hash);
        else history.pushState(null, '', u.pathname + u.search + u.hash);
      } catch (e) { /* silently ignored */ }
    }
  } catch {
    try { window.location.href = href; } catch (e) { /* silently ignored */ }
    return;
  }
  await route();
};

const wireLegacyLinkRewrite = () => {
  try {
    if (document.body.dataset.legacyRewrite === '1') return;
    document.body.dataset.legacyRewrite = '1';
    document.addEventListener('click', (e) => {
      const t = e && e.target;
      const a = (t && t.closest) ? t.closest('a[href]') : null;
      if (!a) return;
      if (a.target === '_blank') return;
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('/ui/admin')) return;
      const mapped = mapLegacyAdminToNewPath(href);
      if (!mapped) return;
      e.preventDefault();
      navigate(mapped);
    });
  } catch (e) { /* silently ignored */ }
};

const wireSpaNav = () => {
  try {
    if (document.body.dataset.spaNav === '1') return;
    document.body.dataset.spaNav = '1';
    document.addEventListener('click', (e) => {
      const t = e && e.target;
      const a = (t && t.closest) ? t.closest('a[href]') : null;
      if (!a) return;
      if (a.target === '_blank') return;
      if (a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href') || '';
      if (!href) return;
      if (!isSameOrigin(href)) return;
      
      // If there is no SPA container on the current page, let the browser handle it
      if (!document.querySelector('#adminContent')) return;

      const u = new URL(href, window.location.origin);
      if (!isAdminPath(u.pathname)) return;
      if (u.pathname === '/admin/attendance/monthly' || u.pathname === '/admin/attendance/monthly/') {
        e.preventDefault();
        window.location.href = u.href;
        return;
      }
      e.preventDefault();
      navigate(u.pathname + u.search + u.hash);
    });
    window.addEventListener('popstate', () => {
      try {
        if (window.__legacyTabPopstate === '1') {
          window.__legacyTabPopstate = '';
          return;
        }
      } catch (e) { /* silently ignored */ }
      route();
    });
    window.addEventListener('hashchange', () => { route(); });
  } catch (e) { /* silently ignored */ }
};

const wireTopbarMenus = () => {
  try {
    if (document.body.dataset.topbarMenus === '1') return;
    document.body.dataset.topbarMenus = '1';
    const menus = Array.from(document.querySelectorAll('.subbar .menu'));
    const openClass = 'open';
    const closeAll = () => {
      for (const m of menus) m.classList.remove(openClass);
    };
    const onDocClick = (e) => {
      const t = e && e.target;
      const inside = !!(t && t.closest && t.closest('.subbar .menu'));
      if (!inside) closeAll();
    };
    for (const m of menus) {
      const btn = m.querySelector('.menu-btn');
      if (!btn) continue;
      if (btn.dataset.bound === '1') continue;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = m.classList.contains(openClass);
        closeAll();
        if (!isOpen) m.classList.add(openClass);
      });
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  } catch (e) { /* silently ignored */ }
};

const wireNavSelection = () => {
  try {
    if (document.body.dataset.navSelection === '1') return;
    document.body.dataset.navSelection = '1';
    const nav = document.querySelector('.sidebar .sidebar-nav');
    if (!nav) return;

    const clear = () => {
      nav.querySelectorAll('a.selected, summary.selected').forEach((el) => el.classList.remove('selected'));
    };
    const selectEl = (el) => {
      if (!el) return;
      clear();
      el.classList.add('selected');
      try {
        const a = el.tagName === 'A' ? el : null;
        const key = a ? `a:${a.getAttribute('href') || ''}` : 'summary';
        sessionStorage.setItem('admin.nav.selected', key);
      } catch (e) { /* silently ignored */ }
    };

    try {
      const saved = sessionStorage.getItem('admin.nav.selected') || '';
      if (saved.startsWith('a:')) {
        const href = saved.slice(2);
        const a = nav.querySelector(`a[href="${CSS.escape(href)}"]`);
        if (a) a.classList.add('selected');
      }
    } catch (e) { /* silently ignored */ }

    nav.addEventListener('click', (e) => {
      const t = e && e.target;
      const a = (t && t.closest) ? t.closest('a[href]') : null;
      if (a && nav.contains(a)) {
        selectEl(a);
        return;
      }
      const summary = (t && t.closest) ? t.closest('summary') : null;
      if (summary && nav.contains(summary)) {
        selectEl(summary);
      }
    }, true);
  } catch (e) { /* silently ignored */ }
};

const boot = async () => {
  // Cleanup stale sidebar state
  try { localStorage.removeItem('sidebar.collapsed'); document.body.classList.remove('sidebar-collapsed'); } catch (e) {}
  try {
    const globalTableStyle = document.createElement('style');
    globalTableStyle.textContent = `
      /* Global Fiori Compact Table Styles for ALL admin tables (Desktop) */
      @media (min-width: 769px) {
        .admin table { border-collapse: collapse !important; width: 100% !important; }
        .admin table th {
          background-color: #e6f2ff !important;
          color: #0f172a !important; 
          font-weight: 600 !important;
          border: 1px solid #cbd5e1 !important; 
          padding: 6px 8px !important;
          font-size: 13px !important; 
          text-align: center !important; 
          white-space: nowrap !important;
        }
        .admin table td { 
          border: 1px solid #cbd5e1 !important; 
          padding: 6px 8px !important; 
          font-size: 13px !important; 
        }
        .admin table tbody tr:hover td { 
          background-color: #f8fafc !important; 
        }
        
        /* Dark mode support */
        :root[data-theme='dark'] .admin table th {
          background-color: #1e293b !important;
          color: #e0d4fc !important;
          border-color: #334155 !important;
        }
        :root[data-theme='dark'] .admin table td {
          border-color: #334155 !important;
          color: #e0d4fc !important;
        }
        :root[data-theme='dark'] .admin table tbody tr:hover td {
          background-color: #1e293b !important;
        }
      }
    `;
    document.head.appendChild(globalTableStyle);
  } catch (e) { /* silently ignored */ }

  try { document.documentElement.classList.add('admin-preboot'); } catch (e) { /* silently ignored */ }
  try { document.body.classList.add('booting'); } catch (e) { /* silently ignored */ }
  const isStandaloneApp = (() => {
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const v = String(sp.get('standalone') || '').toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    } catch {
      return false;
    }
  })();
  const applyStandaloneApp = () => {
    if (!isStandaloneApp) return;
    try {
      const p = normalizePath(window.location.pathname);
      if (p.includes('/admin/expenses')) {
        document.title = '交通費管理';
      } else if (p.includes('/admin/attendance')) {
        document.title = '勤怠管理';
      }
    } catch (e) { /* silently ignored */ }
    try { document.getElementById('adminChrome')?.setAttribute('hidden', ''); } catch (e) { /* silently ignored */ }
    try { const el = document.getElementById('adminChrome'); if (el) el.style.display = 'none'; } catch (e) { /* silently ignored */ }
    try { document.body.classList.remove('has-sidebar'); } catch (e) { /* silently ignored */ }
    try { document.body.classList.add('expenses-standalone'); } catch (e) { /* silently ignored */ }
    try {
      try { document.documentElement.style.setProperty('height', '100%', 'important'); } catch (e) { /* silently ignored */ }
      try { document.documentElement.style.setProperty('overflow', 'hidden', 'important'); } catch (e) { /* silently ignored */ }
    } catch (e) { /* silently ignored */ }
    try {
      try { document.body.style.setProperty('height', '100%', 'important'); } catch (e) { /* silently ignored */ }
      try { document.body.style.setProperty('overflow', 'hidden', 'important'); } catch (e) { /* silently ignored */ }
    } catch (e) { /* silently ignored */ }
    try {
      const main = document.querySelector('main.content');
      if (main) {
        try { main.style.setProperty('margin', '0', 'important'); } catch (e) { /* silently ignored */ }
        try { main.style.setProperty('padding', '0', 'important'); } catch (e) { /* silently ignored */ }
        try { main.style.setProperty('margin-top', '0', 'important'); } catch (e) { /* silently ignored */ }
        try { main.style.setProperty('padding-top', '0', 'important'); } catch (e) { /* silently ignored */ }
      }
    } catch (e) { /* silently ignored */ }
    try {
      try { document.documentElement.style.setProperty('margin', '0', 'important'); } catch (e) { /* silently ignored */ }
      try { document.documentElement.style.setProperty('padding', '0', 'important'); } catch (e) { /* silently ignored */ }
    } catch (e) { /* silently ignored */ }
    try {
      try { document.body.style.setProperty('margin', '0', 'important'); } catch (e) { /* silently ignored */ }
      try { document.body.style.setProperty('padding', '0', 'important'); } catch (e) { /* silently ignored */ }
    } catch (e) { /* silently ignored */ }
  };
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    try { document.body.classList.remove('booting'); } catch (e) { /* silently ignored */ }
    try { document.documentElement.classList.remove('admin-preboot'); } catch (e) { /* silently ignored */ }
    try {
      if (isStandaloneApp) applyStandaloneApp();
      else document.getElementById('adminChrome')?.removeAttribute('hidden');
    } catch (e) { /* silently ignored */ }
    try { document.body.style.visibility = ''; } catch (e) { /* silently ignored */ }
    try { document.getElementById('adminBootMask')?.remove(); } catch (e) { /* silently ignored */ }
  };
  let forceRevealTimer = null;
  try { forceRevealTimer = setTimeout(reveal, 1200); } catch (e) { /* silently ignored */ }
  setTopbarHeightVar();
  try { window.addEventListener('resize', setTopbarHeightVar); } catch (e) { /* silently ignored */ }
  wireSidebarAccordion();
  wireNavSelection();
  wireLegacyLinkRewrite();
  wireSpaNav();
  wireExpandingSearch();
  wireTopbarMenus();
  wireAdminShell({ logoutRedirect: '/ui/login' });
  try { window.addEventListener('pageshow', hardHidePageSpinner); } catch (e) { /* silently ignored */ }
  try {
    applyStandaloneApp();
    await route();
  } finally {
    hardHidePageSpinner();
    try { if (forceRevealTimer) clearTimeout(forceRevealTimer); } catch (e) { /* silently ignored */ }
    try {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(reveal, 40)));
    } catch {
      reveal();
    }
  }
};

boot();
