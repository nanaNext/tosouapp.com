import { mount as mountCorporations } from './corporations.page.js';
import { mount as mountDepartmentsList } from './departments-list.page.js';
import { mount as mountAssignments } from './assignments.page.js';
import { mount as mountMonthLocks } from './month-locks.page.js';
import { mount as mountDepartmentReport } from './department-report.page.js';
import { mount as mountChangeHistory } from './change-history.page.js';

const TABS = [
  { key: 'corporations', label: '法人', mount: mountCorporations },
  { key: 'departments', label: '部署', mount: mountDepartmentsList },
  { key: 'assignments', label: '異動', mount: mountAssignments },
  { key: 'month-locks', label: '月次締め', mount: mountMonthLocks },
  { key: 'report', label: '部署別集計', mount: mountDepartmentReport },
  { key: 'history', label: '変更履歴', mount: mountChangeHistory }
];

function getTabFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return TABS.some(t => t.key === tab) ? tab : TABS[0].key;
  } catch {
    return TABS[0].key;
  }
}

function setTabInUrl(tab) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
  } catch { /* ignore */ }
}

export async function mount() {
  const root = document.querySelector('#adminContent');
  if (!root) return () => {};

  root.innerHTML = `
    <style>
      .org-page, .org-page select, .org-page input, .org-page button, .org-page textarea {
        font-family: 'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;
      }
      .org-page select, .org-page input {
        font-size: 13px;
        color: #0f172a;
      }
    </style>
    <div class="org-page">
      <div style="padding:16px 20px 0;">
        <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;">部門管理</h2>
        <div id="orgTabBar" style="display:flex;gap:4px;border-bottom:2px solid #e2e8f0;"></div>
      </div>
      <div id="orgTabContent"></div>
    </div>
  `;

  const tabBar = root.querySelector('#orgTabBar');
  const tabContent = root.querySelector('#orgTabContent');
  let disposeCurrent = null;

  tabBar.innerHTML = TABS.map(t => `
    <button type="button" data-tab="${t.key}" style="padding:10px 16px;border:none;background:none;border-bottom:2px solid transparent;cursor:pointer;font-size:14px;color:#64748b;">${t.label}</button>
  `).join('');

  async function renderTab(key) {
    setTabInUrl(key);
    for (const btn of tabBar.querySelectorAll('button')) {
      const isActive = btn.dataset.tab === key;
      btn.style.color = isActive ? '#0b2c66' : '#64748b';
      btn.style.borderBottomColor = isActive ? '#0b2c66' : 'transparent';
      btn.style.fontWeight = isActive ? '700' : '500';
    }
    if (typeof disposeCurrent === 'function') {
      try { disposeCurrent(); } catch { /* ignore */ }
    }
    tabContent.innerHTML = '';
    const tabDef = TABS.find(t => t.key === key) || TABS[0];
    disposeCurrent = (await tabDef.mount({ content: tabContent })) || null;
  }

  tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (btn) renderTab(btn.dataset.tab);
  });

  await renderTab(getTabFromUrl());

  return () => {
    if (typeof disposeCurrent === 'function') disposeCurrent();
  };
}
