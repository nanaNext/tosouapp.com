import { mount as mountDepartmentsHub } from './departments-hub.page.js?v=20261005-org1';
import { mount as mountChangeHistory } from './change-history.page.js?v=20261005-org1';

// 部署の変更（異動）は 社員編集 で行い、履歴は自動で記録される。ここは部署の一覧と履歴だけ。
// 法人・部署別集計は「部署」、異動の締めは「履歴」の中にまとめた
const TABS = [
  { key: 'departments', label: '部署', mount: mountDepartmentsHub },
  { key: 'history', label: '履歴', mount: mountChangeHistory }
];

// 以前のタブのURL（ブックマーク・マニュアルのリンク）も開けるように
const OLD_TAB = { corporations: 'departments', report: 'departments', assignments: 'history', 'month-locks': 'history' };

function getTabFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    let tab = params.get('tab');
    if (OLD_TAB[tab]) tab = OLD_TAB[tab];
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

const STYLE = `
  .org-page, .org-page select, .org-page input, .org-page button, .org-page textarea {
    font-family: 'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;
  }
  .org-page select, .org-page input { font-size: 13px; color: #0f172a; }
  .org-body { padding: 16px 20px 24px; max-width: 1100px; }
  .org-card { border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; margin-bottom: 16px; }
  .org-card-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px 8px 0 0; }
  .org-card-h h4 { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
  .org-card-h .org-sub { font-size: 12px; color: #64748b; }
  .org-card-h .org-right { margin-left: auto; display: flex; gap: 6px; align-items: center; }
  .org-btn { height: 30px; padding: 0 12px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 4px; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .org-btn:hover { background: #f1f5f9; }
  .org-btn.primary { background: #0b2c66; border-color: #0b2c66; color: #fff; font-weight: 600; }
  .org-btn.primary:hover { background: #0a285c; }
  .org-btn.danger { color: #b91c1c; }
  .org-btn.link { border: none; background: none; color: #1d4ed8; padding: 0 4px; }
  .org-btn:disabled { opacity: .5; cursor: default; }
  .org-in { height: 32px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; box-sizing: border-box; background: #fff; }
  .org-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .org-table th { text-align: left; font-weight: 600; color: #475569; font-size: 12px; padding: 8px 14px; border-bottom: 1px solid #e2e8f0; }
  .org-table td { padding: 8px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .org-table tr:last-child td { border-bottom: none; }
  .org-muted { color: #94a3b8; }
  .org-note { font-size: 12px; color: #64748b; margin: 0 0 12px; }
  .org-tag { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .org-tag.reg { background: #e0e7ff; color: #3730a3; }
  .org-tag.sup { background: #fef3c7; color: #92400e; }
  .org-tag.off { background: #f1f5f9; color: #64748b; }
  .org-tag.now { background: #dcfce7; color: #166534; }
  .org-more { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; background: #fff; }
  .org-more > summary { cursor: pointer; padding: 10px 14px; font-size: 13px; color: #334155; font-weight: 600; list-style: none; }
  .org-more > summary::-webkit-details-marker { display: none; }
  .org-more > summary::before { content: '▸'; display: inline-block; width: 14px; color: #94a3b8; }
  .org-more[open] > summary::before { content: '▾'; }
  .org-more > summary .org-sub { font-weight: 400; color: #94a3b8; font-size: 12px; margin-left: 6px; }
  .org-more-body > div { padding-top: 0 !important; }
  .org-toast { position: fixed; right: 24px; bottom: 24px; background: #0f172a; color: #fff; padding: 10px 16px; border-radius: 6px; font-size: 13px; z-index: 9999; opacity: 0; transition: opacity .2s; pointer-events: none; }
  .org-toast.show { opacity: 1; }
`;

export async function mount() {
  const root = document.querySelector('#adminContent');
  if (!root) return () => {};

  root.innerHTML = `
    <style>${STYLE}</style>
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
    <button type="button" data-tab="${t.key}" style="padding:10px 18px;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;font-size:14px;color:#64748b;">${t.label}</button>
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
