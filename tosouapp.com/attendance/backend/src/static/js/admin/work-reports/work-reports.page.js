import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';

const $ = (sel) => document.querySelector(sel);
const isYM = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
const monthJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (dt) => {
  if (!dt) return '—';
  const s = String(dt);
  return s.length >= 16 ? s.slice(11, 16) : s;
};
const statusMeta = (status) => {
  if (status === 'submitted') return { label: '提出済', style: 'background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;' };
  if (status === 'checkout_missing') return { label: '退勤漏れ', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'checkout_missing_submitted') return { label: '退勤漏れ(入力済)', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'missing') return { label: '未提出', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'not_checked_in') return { label: '未出勤', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'not_punched') return { label: '打刻なし', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'absence') return { label: '欠勤', style: 'background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  if (status === 'monthly_input_only') return { label: '月次入力済み（打刻なし）', style: 'background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;' };
  if (status === 'off') return { label: '休日', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'paid_leave') return { label: '有給休暇', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'unpaid_leave') return { label: '無給休暇', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'working') return { label: '勤務中', style: 'background:#f0fdf4;color:#166534;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;' };
  return { label: '—', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
};
const workTypeLabel = (value) => {
  if (value === 'onsite') return '出社';
  if (value === 'remote') return '在宅';
  if (value === 'satellite') return '現場・出張';
  return '—';
};
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const effectiveStatus = (it) => {
  const st = String(it?.status || '');
  const hasContent = !!(String(it?.site || '').trim() || String(it?.work || '').trim());
  if (st === 'checkout_missing' && hasContent) return 'checkout_missing_submitted';
  if (st !== 'working') return st;
  const d = String(it?.date || '').slice(0, 10);
  const hasOut = !!it?.attendance?.checkOut;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < todayJST() && !hasOut) {
    return hasContent ? 'checkout_missing_submitted' : 'checkout_missing';
  }
  return st;
};
const dowClass = (w) => {
  const s = String(w || '').trim();
  if (s === '土') return 'wr-dow-sat';
  if (s === '日') return 'wr-dow-sun';
  if (s === '月' || s === '火' || s === '水' || s === '木' || s === '金') return 'wr-dow-weekday';
  return '';
};
const weekdayJa = (dateStr) => {
  const s = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  const idx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return labels[idx] || '';
};

const showSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    if (el) { el.removeAttribute('hidden'); el.style.display = 'grid'; }
  } catch (e) { /* silently ignored */ }
};
const hideSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }
  } catch (e) { /* silently ignored */ }
};

export async function mount() {
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';
  const tableVhExpr = isStandalone ? 'calc(100vh - 120px)' : 'calc(100vh - var(--topbar-height) - var(--subbar-height) - 120px)';

  const content = document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (content && content.id === 'attendanceHubContent') {
    content.style.padding = window.innerWidth <= 768 ? '0' : '16px 24px';
    content.style.boxSizing = 'border-box';
    content.style.background = '#FFFFFF';
  }

  if (content) {
    content.innerHTML = '<div style="color:#475569;font-weight:650;">読み込み中…</div>';
  }

  const profile = await requireAdmin();
  if (!profile || !content) return;

  const params = new URLSearchParams(window.location.search);
  const initMonth = isYM(params.get('month')) ? String(params.get('month')) : monthJST();
  const initSort = String(params.get('sort') || 'dateDesc');
  const initDept = String(params.get('dept') || '');
  const initQ = String(params.get('q') || '');
  const initGroup = String(params.get('group') || '') === '1';
  const state = { month: initMonth, sort: initSort, dept: initDept, q: initQ, group: initGroup, items: [] };

  content.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'wr-layout';
  layout.style.cssText = `display: flex; flex-direction: column; background: #FFFFFF; font-family: Inter, 'Noto Sans JP', sans-serif; width: 100%;`;

  const PAGE_CSS = `
      .wr-input { height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 10px; font-size: 13px; color: #0f172a; outline: none; background: #fff; box-sizing: border-box; }
      :root[data-theme='dark'] .wr-input { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      :root[data-theme='dark'] .wr-select { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      :root[data-theme='dark'] .attrec-btn { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      .wr-select { padding-right: 30px; min-width: 120px; cursor: pointer; text-overflow: ellipsis; }
      .wr-input:focus { border-color: #3b82f6; }
      .wr-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; flex-shrink: 0; }
      .wr-mobile-row { display: contents; }
      .wr-btn { height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; outline: none; transition: all .15s; }
      .wr-btn-dl { background: #10b981; color: #fff; gap: 6px; }
      .wr-btn-dl:hover { background: #059669; }
      .wr-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
      .wr-table th { padding: 6px 12px; font-size: 12px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; font-weight: 500; text-align: left; white-space: nowrap; }
      .wr-table td { padding: 6px 12px; vertical-align: middle; border: none; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
      .wr-table tbody tr:hover td { background: #f8fafc; }
      .wr-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid transparent; white-space: nowrap; }
      .wr-dow-sat { color: #2563eb; }
      .wr-dow-sun { color: #dc2626; }
      .wr-off-row td { background: #fff5f5 !important; }
      .wr-off-row:hover td { background: #fee2e2 !important; }
      .attrec-btn { height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #cbd5e1; outline: none; transition: all .15s; background: #fff; color: #475569; }
      .attrec-btn:hover { background: #f8fafc; border-color: #94a3b8; }

      .wr-layout { min-height: calc(${vhExpr} - 32px); display: flex; flex-direction: column; }
      .wr-table-wrap { flex: 1 1 auto; position: relative; z-index: 1; min-width: 0; }
      .wr-table-container { width: 100%; overflow: auto; max-height: calc(100vh - 160px); }

      @media (max-width: 768px) {
        .wr-layout { flex: 1 1 0% !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; }
        .wr-table-wrap { flex: 1 1 auto !important; min-height: 0 !important; }
        .wr-table-container { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        
        .wr-table tbody td.group-hide, .wr-table th.group-hide, .wr-table col.group-hide { display: none !important; }
        .wr-toolbar { display: flex !important; flex-direction: column !important; gap: 12px !important; padding: 16px !important; background: #f8fafc !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; margin: 0 0 16px 0 !important; }
        
        .wr-mobile-row { display: flex !important; gap: 8px !important; width: 100% !important; align-items: center !important; }
        
        .hidden-on-mobile { display: none !important; }
        
        /* Main Row: Month, Search, Toggle */
        .wr-mobile-row.main-row { display: none !important; } /* Hidden, moved to header */
        .wr-mobile-row.main-row .wr-month { display: none !important; }
        .wr-mobile-row.main-row .wr-query { display: none !important; }
        .wr-mobile-row.main-row .wr-filter-toggle { display: none !important; }
        
        .wr-toolbar-wrapper { padding-bottom: 0 !important; }
        .wr-toolbar { padding: 0 !important; margin: 0 !important; background: transparent !important; border: none !important; border-radius: 0 !important; }
        
        /* Advanced Filters */
        .wr-mobile-row.advanced-filters { order: 2; display: none !important; flex-direction: column !important; gap: 12px !important; width: 100% !important; padding: 12px !important; background: #f1f5f9 !important; border-radius: 6px !important; margin-top: 8px !important; margin-bottom: 12px !important; border: 1px solid #e2e8f0 !important; box-sizing: border-box !important; }
        .wr-mobile-row.advanced-filters.show { display: flex !important; }
        
        .wr-mobile-row.selects-row { display: flex !important; gap: 8px !important; width: 100% !important; }
        .wr-mobile-row.selects-row select { flex: 1 !important; height: 40px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; padding: 0 12px !important; font-size: 14px !important; background-color: #fff !important; width: 50% !important; box-sizing: border-box !important; margin: 0 !important; }
        
        .wr-mobile-row.bottom-advanced-row { display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; gap: 12px !important; }
        .wr-mobile-row.checkbox-row { padding: 0 !important; border: none !important; width: auto !important; }
        
        .wr-mobile-row.excel-row { display: block !important; width: auto !important; }
        .wr-mobile-row.excel-row .excel-dropdown-container { position: relative !important; }
        .wr-mobile-row.excel-row .excel-dropdown-btn { height: 40px !important; border-radius: 6px !important; background: #fff !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; justify-content: center !important; font-size: 14px !important; display: flex !important; align-items: center !important; padding: 0 16px !important; font-weight: 500 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; box-sizing: border-box !important; margin: 0 !important; }
        .wr-mobile-row.excel-row .excel-dropdown-btn::after { display: none !important; }
        
        /* Summary */
        .wr-mobile-row.summary-row { order: 3; margin-top: 4px !important; padding-top: 4px !important; border-top: 1px solid #e2e8f0 !important; width: 100% !important; }
        .wr-summary-container { padding: 0 !important; font-size: 14px !important; display: flex !important; gap: 12px !important; flex-wrap: wrap !important; width: 100% !important; color: #475569 !important; font-weight: 500 !important; }
        
        /* Hide Excel button on mobile toolbar area, maybe move it elsewhere or keep hidden if requested, but user didn't specify. Assuming we hide it or put it at the very bottom/top. Let's put it top right if needed, but per design left side is preferred. Let's hide the old month picker and excel button row and re-layout. */
        
        .wr-table { display: block !important; width: 100% !important; min-width: 0 !important; border: none !important; border-collapse: separate !important; overflow-x: visible !important; }
        .wr-table thead, .wr-table colgroup { display: none !important; }
        .wr-table tbody { display: flex !important; flex-direction: column !important; gap: 12px !important; padding: 12px 0 !important; width: 100% !important; background: transparent !important; }
        
        .wr-table tbody tr { display: grid !important; grid-template-columns: 105px 1fr !important; grid-auto-rows: auto !important; margin: 0 0 16px 0 !important; border: 1px solid #cbd5e1 !important; border-radius: 0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; background: #fff !important; padding: 0 !important; position: relative !important; }
        .wr-table tbody td { border: none !important; box-shadow: none !important; outline: none !important; background: transparent !important; }
        
        /* First cell (Left Column) */
        .wr-table tbody td:nth-child(1) {
          grid-column: 1 / 2 !important;
          grid-row: 1 / 20 !important; /* Span across all rows */
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          padding: 16px 8px !important;
          border: none !important;
          border-right: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          border-radius: 0 !important;
          text-align: left !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .wr-table tbody td:nth-child(1)::before {
          content: attr(data-label) !important;
          font-size: 11px !important;
          font-weight: 400 !important;
          color: #64748b !important;
          margin-bottom: 4px !important;
          margin-right: 0 !important;
          width: auto !important;
          min-width: 0 !important;
          display: block !important;
        }
        .wr-table tbody td:nth-child(1) span,
        .wr-table tbody td:nth-child(1) {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
        }

        /* Other cells (Right Column) */
        .wr-table tbody td:not(:nth-child(1)) {
          grid-column: 2 / 3 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 8px 16px !important;
          border: none !important;
          border-bottom: 1px dashed #f1f5f9 !important;
          text-align: left !important;
          width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }
        .wr-table tbody td:last-child {
          border-bottom: none !important;
        }
        
        /* Label positioning for right column */
        .wr-table tbody td:not(:nth-child(1))::before {
          content: attr(data-label) !important;
          width: 70px !important;
          min-width: 70px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #64748b !important;
          margin-right: 8px !important;
          text-align: left !important;
          flex-shrink: 0 !important;
          display: inline-block !important;
        }
        
        /* Content styling */
        .wr-table tbody td:not(:nth-child(1)) > div,
        .wr-table tbody td:not(:nth-child(1)) > span {
          text-align: left !important;
          font-size: 14px !important;
          color: #1e293b !important;
          width: 100% !important;
          word-break: break-word !important;
        }

        /* Hide Day column since we can combine it, but let's just show it normally for now to match Attendance structure */
        /* Grouped view specific fixes */
        .wr-table tbody td.group-hide { display: none !important; }
        
        /* Fix status pill in mobile */
        .wr-table tbody td[data-label="状態"] .dash-pill {
          display: inline-flex !important;
          padding: 4px 10px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        
        /* Fix row backgrounds for left cell */
        .wr-table tbody tr.wr-off-row td:nth-child(1) { background: #fff5f5 !important; border-right-color: #fecaca !important; color: #dc2626 !important; }
        .wr-table tbody tr.wr-sat-row td:nth-child(1) { background: #eff6ff !important; border-right-color: #bfdbfe !important; color: #2563eb !important; }
        
        /* Mobile List Table Fixes */
        .wr-table-container { border: none !important; box-shadow: none !important; background: transparent !important; padding-bottom: 60px !important; overflow-x: auto !important; padding: 0 !important; }
        .wr-summary-container { padding: 0 12px !important; }
        
        /* Sticky Pagination for Mobile */
        .wr-mobile-pagination {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: #ffffff !important;
          padding: 12px 16px !important;
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          z-index: 100 !important;
          border-top: 1px solid #e2e8f0 !important;
          margin-top: 0 !important;
        }
        
        #adminContent.card { border: none !important; box-shadow: none !important; background: transparent !important; }
        
        /* Specific adjustments for grouped view to prevent double borders */
        .wr-table-wrap > div > .wr-table-container { padding: 0 !important; }
        .wr-table-wrap > div > .wr-table-container .wr-table tbody tr { margin-bottom: 12px !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; border: 1px solid #e2e8f0 !important; }
      }
      @media (min-width: 769px) {
        .group-hide { display: none !important; }
        .hidden-on-mobile { display: flex !important; }
        .hidden-on-desktop { display: none !important; }
        .wr-toolbar { display: flex !important; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; flex-shrink: 0; }
        .wr-mobile-row { display: contents !important; }
        .search-row .wr-input { background-image: none !important; padding-left: 10px !important; }
      }
`;

  const getPageHtml = (state, esc) => `
    <style>
      ${PAGE_CSS}
    </style>
    <div class="wr-toolbar-wrapper" style="flex-shrink: 0; padding-bottom: 12px; position: relative; z-index: 50;">
      <div class="wr-toolbar" style="position: relative; z-index: 50;">
        <div class="wr-mobile-row main-row">
          <input id="wrMonthMobile" type="month" class="wr-input wr-month hidden-on-desktop" value="${state.month}">
          <input id="wrMonth" type="month" class="wr-input wr-month hidden-on-mobile" value="${state.month}">
          <input id="wrQuery" type="text" class="wr-input wr-text wr-query" placeholder="社員番号/氏名で検索" value="${esc(state.q)}">
        </div>
        
        <div class="wr-mobile-row advanced-filters" id="wrAdvancedFilters">
          <div class="wr-mobile-row selects-row">
            <select id="wrDept" class="wr-input wr-select wr-dept">
              <option value="">全部署</option>
            </select>
            <select id="wrSort" class="wr-input wr-select wr-sort">
              <option value="dateDesc" ${state.sort === 'dateDesc' ? 'selected' : ''}>並び順</option>
              <option value="employee" ${state.sort === 'employee' ? 'selected' : ''}>社員↑ / 日付↓</option>
              <option value="name" ${state.sort === 'name' ? 'selected' : ''}>氏名↑ / 日付↓</option>
              <option value="department" ${state.sort === 'department' ? 'selected' : ''}>部署↑ / 社員↑ / 日付↓</option>
              <option value="missingFirst" ${state.sort === 'missingFirst' ? 'selected' : ''}>未提出を上に</option>
            </select>
          </div>
          <div class="wr-mobile-row bottom-advanced-row">
            <div class="wr-mobile-row checkbox-row">
              <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#334155;cursor:pointer;font-weight:500;">
                <input type="checkbox" id="wrGroup" ${state.group ? 'checked' : ''} style="width:16px;height:16px;"> 社員ごとにまとめる
              </label>
            </div>
            <div class="wr-mobile-row excel-row">
              <button type="button" id="wrExport" class="attrec-btn excel-dropdown-btn">Excel出力</button>
            </div>
          </div>
          <div class="wr-mobile-row summary-row">
            <div id="wrSummary" class="wr-summary-container"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="wr-table-wrap" id="wrTable">
      <table class="wr-table" style="width:100%; min-width:1000px; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="width:110px;">日付</th>
            <th style="width:60px;">曜</th>
            <th style="width:100px;">社員番号</th>
            <th style="width:120px;">氏名</th>
            <th style="width:100px;">部署</th>
            <th style="width:100px;">勤務区分</th>
            <th style="width:80px;">出勤</th>
            <th style="width:80px;">退勤</th>
            <th style="width:100px;">勤務形態</th>
            <th style="width:120px;">現場</th>
            <th style="width:200px;">作業内容</th>
            <th style="width:100px;">遅刻・早退等</th>
            <th style="width:200px;">備考</th>
            <th style="width:180px;">状態</th>
          </tr>
        </thead>
        <tbody id="wrTableBody">
        </tbody>
      </table>
    </div>
  `;

  layout.innerHTML = getPageHtml(state, esc);
  content.appendChild(layout);

  const setUrl = () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('month', state.month);
      u.searchParams.set('sort', state.sort);
      if (state.dept) u.searchParams.set('dept', state.dept);
      else u.searchParams.delete('dept');
      if (state.q) u.searchParams.set('q', state.q);
      else u.searchParams.delete('q');
      if (state.group) u.searchParams.set('group', '1');
      else u.searchParams.delete('group');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* silently ignored */ }
  };

  let currentPage = 1;
  const isMobile = window.innerWidth <= 768;
  const pageSize = isMobile ? 30 : 10;

  const formatDelay = (mins) => {
    if (!mins || isNaN(mins)) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}時間${m}分`;
    if (h > 0) return `${h}時間`;
    return `${m}分`;
  };

  const renderRows = (items, resetPage = false) => {
    if (resetPage) currentPage = 1;
    const tableHost = $('#wrTable');
    if (!tableHost) return;
    if (!items.length) {
      tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>出勤データがありません</div></div>';
      return;
    }

    const tableBody = tableHost.querySelector('#wrTableBody') || tableHost;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    const rows = pageItems.map((it) => {
      const dash = `<span style="color:#cbd5e1;">—</span>`;
      const code = it.employeeCode || `EMP${String(it.userId).padStart(3, '0')}`;
      const stx = effectiveStatus(it);
      const meta = statusMeta(stx);

      // Define specific icon based on status
      let statusIcon = '';
      if (stx === 'checkout_missing' || stx === 'missing' || stx === 'not_punched' || stx === 'absence') {
        statusIcon = '⚠ ';
      } else if (stx === 'submitted' || stx === 'checkout_missing_submitted') {
        statusIcon = '✅ ';
      }
      meta.label = statusIcon + meta.label;

      let kubunStr = String(it.kubun || '').trim();
      if (kubunStr === '休日出勤' && !it.attendance?.checkIn && !it.attendance?.checkOut && (!it.site && !it.work)) {
        kubunStr = '休日';
      }
      const kubun = kubunStr ? esc(kubunStr) : dash;
      const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
      const rawWork = String(it.work || '').trim();
      const work = rawWork ? esc(rawWork) : dash;
      const dept = String(it.departmentName || '').trim() ? esc(String(it.departmentName).trim()) : dash;
      const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
      const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
      const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;

      // Auto-detect late/early based on time if not manually set in DB
      let autoLateStr = '';
      if (it.attendance?.checkIn) {
        const cin = fmtTime(it.attendance.checkIn);
        const isPartTime = String(it.role || '').toLowerCase() === 'part_time' || String(it.employment_type || '').toLowerCase() === 'part_time' || String(it.employment_type || '') === 'アルバイト';
        // Koujibu standard start is 08:00, but Part-time can have flexible shifts like 09:00.
        // For simplicity, we use 09:00 as the threshold for Part-time in Koujibu unless a specific shift dictates otherwise.
        const threshold = (it.departmentName || '').includes('工事') && !isPartTime ? '08:00' : '09:00';
        if (cin > threshold && it.status !== '休日出勤') {
          const [h1, m1] = cin.split(':').map(Number);
          const [h2, m2] = threshold.split(':').map(Number);
          const diff = (h1 * 60 + m1) - (h2 * 60 + m2);
          if (diff > 0 && !it.lateMinutes) it.lateMinutes = diff; // override for display
        }
      }

      const lateStr = Number(it.lateMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">⚠ 遅刻 ${formatDelay(it.lateMinutes)}</span>` : '';
      const earlyStr = Number(it.earlyMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">⚠ 早退 ${formatDelay(it.earlyMinutes)}</span>` : '';
      let lateEarlyCombo = [lateStr, earlyStr].filter(Boolean).join('<br>');

      // Đọc dữ liệu từ cột 備考 (notes) của attendance_daily
      const combinedReasonMemo = [it.notes].filter(Boolean).join(' - ');
      const tooltip = combinedReasonMemo ? `title="${esc(combinedReasonMemo)}"` : '';
      const displayReason = combinedReasonMemo.length > 20 ? combinedReasonMemo.substring(0, 20) + '...' : combinedReasonMemo;

      const reasonHtml = ''; // Remove reason from lateEarlyHtml since it has its own column now

      const lateEarlyHtml = lateEarlyCombo || '';

      const dc = dowClass(it.weekday);
      const displayDate = it.date ? it.date.replace(/-/g, '/') : '';
      // Calculate holiday from backend flag
      const isPublicHoliday = !!it.holiday && it.weekday !== '土' && it.weekday !== '日';

      const isOffRow = (dc === 'wr-dow-sun' || isPublicHoliday);
      const isSatRow = (dc === 'wr-dow-sat' && !isPublicHoliday);

      const rowClass = isOffRow ? 'wr-off-row' : (isSatRow ? 'wr-sat-row' : '');
      const textColorClass = isOffRow ? 'wr-sun-row' : (isSatRow ? 'wr-sat-row' : '');
      
      const displayLateEarly = !it.isSecondary ? lateEarlyHtml : dash;
      const displayNotes = !it.isSecondary ? (combinedReasonMemo ? esc(combinedReasonMemo) : dash) : dash;

      return `
        <tr class="${rowClass}">
          <td data-label="日付" class="${dc} ${textColorClass}" style="text-align:center; font-weight:600;">${esc(displayDate)}</td>
          <td data-label="曜" class="${dc} ${textColorClass}" style="text-align:center; font-weight:600;">${esc(isPublicHoliday ? '祝' : (it.weekday || ''))}</td>
          <td data-label="社員番号" style="white-space:nowrap;">${esc(code)}</td>
          <td data-label="氏名" style="font-weight:500; white-space:nowrap;">${esc(it.username || '')}</td>
          <td data-label="部署" style="white-space:nowrap;">${dept}</td>
          <td data-label="勤務区分" style="white-space:nowrap;">${kubun}</td>
          <td data-label="出勤" style="font-family:monospace; font-size:14px; white-space:nowrap; text-align:center;">${checkIn}</td>
          <td data-label="退勤" style="font-family:monospace; font-size:14px; white-space:nowrap; text-align:center;">${checkOut}</td>
          <td data-label="勤務形態" style="white-space:nowrap;">${wType}</td>
          <td data-label="現場" style="white-space:pre-wrap; word-break:break-word; min-width:120px; max-width:200px;">${site}</td>
          <td data-label="作業内容" style="white-space:pre-wrap; word-break:break-word; min-width:200px; max-width:400px; color:#475569;">${work}</td>
          <td data-label="遅刻・早退等" style="white-space:nowrap;">${displayLateEarly}</td>
          <td data-label="備考" style="white-space:pre-wrap; word-break:break-word; min-width:150px; max-width:300px; color:#475569;">${displayNotes}</td>
          <td data-label="状態"><span class="dash-pill" style="${meta.style}; white-space:nowrap;">${esc(meta.label)}</span></td>
        </tr>
      `;
    }).join('');

    let paginationHtml = '';
    if (items.length > 0) {
      const totalPages = Math.ceil(items.length / pageSize);
      const prevDisabled = currentPage === 1 ? 'disabled' : '';
      const nextDisabled = currentPage === totalPages ? 'disabled' : '';
      const prevBg = currentPage === 1 ? '#f1f5f9' : '#fff';
      const nextBg = currentPage === totalPages ? '#f1f5f9' : '#fff';
      const prevCursor = currentPage === 1 ? 'not-allowed' : 'pointer';
      const nextCursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
      const paginationClass = isMobile ? 'wr-mobile-pagination' : '';

      paginationHtml = `
        <div class="${paginationClass}" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:8px 4px 0; clear:both;">
          <div style="color:#64748b; font-size:14px;">
            全 <span style="font-weight:700; color:#0f172a;">${items.length}</span> 件中 <span style="font-weight:700; color:#0f172a;">${startIndex + 1}</span> - <span style="font-weight:700; color:#0f172a;">${endIndex}</span> 件を表示
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btnWrPrev" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${prevBg}; color:#475569; cursor:${prevCursor}; font-size:14px;" ${prevDisabled}>前へ</button>
            <button id="btnWrNext" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${nextBg}; color:#475569; cursor:${nextCursor}; font-size:14px;" ${nextDisabled}>次へ</button>
          </div>
        </div>
      `;
    }

    tableHost.innerHTML = `
      <div class="wr-table-container" id="wrTableContainer" style="overflow:auto;max-height:calc(100vh - 160px);border-top:none;border-bottom:none;background:transparent;padding-bottom:0;width:100%;">
        <table class="wr-table" style="width:100%; table-layout:auto; border-collapse: collapse;">
              <thead style="position:sticky; top:0; z-index:10;">
                <tr style="background:#e6f2ff; color:#0f172a; height:30px;">
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">日付</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">曜</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">社員番号</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">氏名</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">部署</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務区分</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">出勤</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">退勤</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務形態</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">現場</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">作業内容</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">遅刻・早退等</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">備考</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">状態</th>
                </tr>
              </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    `;

    // Scroll container handled by CSS (width:0; min-width:100% trick)

    if (items.length > 0) {
      const btnPrev = document.getElementById('btnWrPrev');
      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          if (currentPage > 1) {
            currentPage--;
            renderRows(items);
            if (isMobile) {
              setTimeout(() => {
                const tableHost = $('#wrTable');
                if (tableHost) tableHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }
          }
        });
      }
      const btnNext = document.getElementById('btnWrNext');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          const totalPages = Math.ceil(items.length / pageSize);
          if (currentPage < totalPages) {
            currentPage++;
            renderRows(items);
            if (isMobile) {
              setTimeout(() => {
                const tableHost = $('#wrTable');
                if (tableHost) tableHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }
          }
        });
      }
    }
  };

  const normalize = (s) => String(s || '').trim().toLowerCase();
  const cmpStr = (a, b) => {
    const aa = normalize(a);
    const bb = normalize(b);
    if (aa === bb) return 0;
    return aa < bb ? -1 : 1;
  };
  const statusRank = (st) => {
    if (st === 'checkout_missing') return 0;
    if (st === 'missing') return 0;
    if (st === 'checkout_missing_submitted') return 1;
    if (st === 'monthly_input_only') return 1;
    if (st === 'working') return 1;
    if (st === 'submitted') return 2;
    return 3;
  };

  const employeeCodeOf = (x) => String(x?.employeeCode || `EMP${String(x?.userId || '').padStart(3, '0')}`);
  const employeeNameOf = (x) => String(x?.username || '').trim();
  const departmentNameOf = (x) => String(x?.departmentName || '').trim();

  const filterAndSort = (items) => {
    const dept = normalize(state.dept);
    const q = normalize(state.q);
    let out = Array.isArray(items) ? items.slice() : [];
    if (dept) {
      out = out.filter(x => normalize(x?.departmentName) === dept);
    }
    if (q) {
      out = out.filter(x => {
        const code = normalize(x?.employeeCode);
        const name = normalize(x?.username);
        return (code && code.includes(q)) || (name && name.includes(q));
      });
    }
    out.sort((a, b) => {
      if (state.sort === 'employee') {
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'name') {
        const n1 = cmpStr(employeeNameOf(a), employeeNameOf(b));
        if (n1) return n1;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'department') {
        const dep = cmpStr(departmentNameOf(a), departmentNameOf(b));
        if (dep) return dep;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'missingFirst') {
        const r1 = statusRank(effectiveStatus(a)) - statusRank(effectiveStatus(b));
        if (r1) return r1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      const d1 = cmpStr(b?.date, a?.date);
      if (d1) return d1;
      const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
      if (c1) return c1;
      return Number(a?.userId || 0) - Number(b?.userId || 0);
    });
    return out;
  };

  const renderGrouped = (items) => {
    const tableHost = $('#wrTable');
    if (!tableHost) return;
    if (!items.length) {
      tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>出勤データがありません</div></div>';
      return;
    }
    const groups = new Map();
    for (const it of items) {
      const uid = Number(it?.userId || 0);
      const key = uid ? String(uid) : `${employeeCodeOf(it)}|${employeeNameOf(it)}|${departmentNameOf(it)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          userId: uid || null,
          employeeCode: employeeCodeOf(it),
          username: employeeNameOf(it),
          departmentName: departmentNameOf(it) || '—',
          items: []
        });
      }
      groups.get(key).items.push(it);
    }
    const arr = Array.from(groups.values());
    for (const g of arr) {
      g.items.sort((a, b) => cmpStr(b?.date, a?.date));
      g.missing = g.items.filter(x => {
        const st = effectiveStatus(x);
        return st === 'missing' || st === 'checkout_missing';
      }).length;
      g.submitted = g.items.filter(x => {
        const st = effectiveStatus(x);
        return st === 'submitted' || st === 'checkout_missing_submitted';
      }).length;
      g.total = g.items.length;
    }
    arr.sort((a, b) => {
      if (state.sort === 'missingFirst') {
        const d = Number(b.missing || 0) - Number(a.missing || 0);
        if (d) return d;
      }
      if (state.sort === 'department') {
        const dep = cmpStr(a.departmentName, b.departmentName);
        if (dep) return dep;
      }
      if (state.sort === 'name') {
        const n = cmpStr(a.username, b.username);
        if (n) return n;
      }
      const c = cmpStr(a.employeeCode, b.employeeCode);
      if (c) return c;
      return Number(a.userId || 0) - Number(b.userId || 0);
    });
    const html = arr.map(g => {
      const headerRight = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="dash-pill" style="background:#f8fafc;color:#475569;border-color:#e2e8f0;">合計 ${g.total}</span>
          <span class="dash-pill" style="background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;">提出 ${g.submitted}</span>
          <span class="dash-pill" style="background:#fff1f1;color:#991b1b;border-color:#ffcccc;">未提出 ${g.missing}</span>
        </div>
      `;
      const rows = g.items.map((it, idx) => {
        const dash = `<span style="color:#cbd5e1;">—</span>`;
        const stx = effectiveStatus(it);
        const meta = statusMeta(stx);

        // Define specific icon based on status
        let statusIcon = '';
        if (stx === 'checkout_missing' || stx === 'missing' || stx === 'not_punched' || stx === 'absence') {
          statusIcon = '⚠ ';
        } else if (stx === 'submitted' || stx === 'checkout_missing_submitted') {
          statusIcon = '✅ ';
        }
        meta.label = statusIcon + meta.label;

        let kubunStr = String(it.kubun || '').trim();
        if (kubunStr === '休日出勤' && !it.attendance?.checkIn && !it.attendance?.checkOut && (!it.site && !it.work)) {
          kubunStr = '休日';
        }
        const kubun = kubunStr ? esc(kubunStr) : dash;
        const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
        const work = String(it.work || '').trim() ? esc(String(it.work).trim()) : dash;
        const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
        const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
        const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;
        const code = it.employeeCode || `EMP${String(it.userId).padStart(3, '0')}`;
        const dept = String(it.departmentName || '').trim() ? esc(String(it.departmentName).trim()) : dash;

        const dc = dowClass(it.weekday);
        const displayDate = it.date ? it.date.replace(/-/g, '/') : '';
        // Calculate holiday from backend flag
        const isHoliday = !!it.holiday && it.weekday !== '土' && it.weekday !== '日';
        const dowColor = dc === 'wr-dow-sun' ? 'color:#ef4444; background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'color:#d97706; background:#fffbeb;' : (isHoliday ? 'color:#ef4444; background:#fef2f2;' : 'color:#64748b;'));
        const lateStr = Number(it.lateMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">⚠ 遅刻 ${formatDelay(it.lateMinutes)}</span>` : '';
        const earlyStr = Number(it.earlyMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">⚠ 早退 ${formatDelay(it.earlyMinutes)}</span>` : '';
        let lateEarlyCombo = [lateStr, earlyStr].filter(Boolean).join('<br>');

        // Đọc dữ liệu từ cột 備考 (notes) của attendance_daily
        const combinedReasonMemo = [it.notes].filter(Boolean).join(' - ');

        const lateEarlyHtml = lateEarlyCombo || '';

        const rowBg = '';
        const textColor = (dc === 'wr-dow-sun' || isHoliday) ? 'color:#ef4444;' : (dc === 'wr-dow-sat' ? 'color:#d97706;' : '');
        const trClass = (dc === 'wr-dow-sun' || isHoliday) ? 'wr-off-row' : (dc === 'wr-dow-sat' ? 'wr-sat-row' : '');

        // Row merging logic for multiple shifts on same day
        const prev = idx > 0 ? g.items[idx - 1] : null;
        // Sửa lỗi: Cần kiểm tra kĩ userId và date của các record trước đó để gộp đúng người, đúng ngày
        const isSameUserDate = prev && prev.date === it.date && prev.userId === it.userId;

        let rsHtml = '';
        if (!isSameUserDate) {
          let rs = 1;
          for (let j = idx + 1; j < g.items.length; j++) {
            if (g.items[j].date === it.date && g.items[j].userId === it.userId) rs++;
            else break;
          }
          rsHtml = rs > 1 ? ` rowspan="${rs}"` : '';
        }

        // Căn giữa ngang và dọc cho các ô đã merge
        const cellStyle = 'vertical-align: middle;';

        // If it's the same day, hide the borders of the repetitive info
        const displayDateHtml = !isSameUserDate ? `<td data-label="日付" class="${dc}" style="text-align:center; font-weight:600; ${cellStyle} ${dowColor}"${rsHtml}>${esc(displayDate)}</td>` : ``;
        const dowHtml = !isSameUserDate ? `<td data-label="曜" class="${dc}" style="text-align:center; font-weight:600; ${cellStyle} ${dowColor}"${rsHtml}>${esc(isHoliday ? '祝' : (it.weekday || ''))}</td>` : ``;
        const codeHtml = !isSameUserDate ? `<td data-label="社員番号" class="group-hide" style="white-space:nowrap; ${cellStyle} ${textColor}"${rsHtml}>${esc(code)}</td>` : ``;
        const nameHtml = !isSameUserDate ? `<td data-label="氏名" class="group-hide" style="font-weight:500; white-space:nowrap; ${cellStyle} ${textColor}"${rsHtml}>${esc(it.username || '')}</td>` : ``;
        const deptHtml = !isSameUserDate ? `<td data-label="部署" class="group-hide" style="white-space:nowrap; ${cellStyle} ${textColor}"${rsHtml}>${dept}</td>` : ``;
        const kubunHtml = !isSameUserDate ? `<td data-label="勤務区分" style="${cellStyle} ${textColor}"${rsHtml}>${kubun}</td>` : ``;
        const wTypeHtml = !isSameUserDate ? `<td data-label="勤務形態" style="${cellStyle} ${textColor}"${rsHtml}>${wType}</td>` : ``;
        const lateEarlyHtmlCell = !isSameUserDate ? `<td data-label="遅刻・早退等" style="white-space:nowrap; ${cellStyle} ${textColor}"${rsHtml}>${lateEarlyHtml}</td>` : ``;
        const memoHtml = !isSameUserDate ? `<td data-label="備考" style="white-space:pre-wrap; word-break:break-word; min-width:150px; max-width:300px; ${cellStyle} ${textColor ? textColor : 'color:#475569;'}"${rsHtml}>${combinedReasonMemo ? esc(combinedReasonMemo) : dash}</td>` : ``;
        const statusHtml = !isSameUserDate ? `<td data-label="状態" style="${cellStyle}"${rsHtml}><span class="dash-pill" style="${meta.style}; white-space:nowrap;">${esc(meta.label)}</span></td>` : ``;

        return `
        <tr class="${trClass}" style="${rowBg} ${textColor}">
          ${displayDateHtml}
          ${dowHtml}
          ${codeHtml}
          ${nameHtml}
          ${deptHtml}
          ${kubunHtml}
          <td data-label="出勤" style="font-family:monospace; font-size:14px; ${textColor}">${checkIn}</td>
          <td data-label="退勤" style="font-family:monospace; font-size:14px; ${textColor}">${checkOut}</td>
          ${wTypeHtml}
          <td data-label="現場" style="white-space:pre-wrap; word-break:break-word; min-width:120px; max-width:200px; ${textColor}">${site}</td>
          <td data-label="作業内容" style="white-space:pre-wrap; word-break:break-word; min-width:300px; max-width:600px; ${textColor ? textColor : 'color:#475569;'}">${work}</td>
          ${lateEarlyHtmlCell}
          ${memoHtml}
          ${statusHtml}
        </tr>
      `;
      }).join('');
      return `
        <div style="margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding-bottom:12px;border-bottom:2px solid #e2e8f0;margin-bottom:12px;">
            <div style="font-weight:800;color:#0f172a;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span style="background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:13px;color:#475569;">${esc(g.employeeCode)}</span>
              ${esc(g.username)} 
              <span style="color:#64748b;font-weight:600;font-size:14px;margin-left:4px;">${esc(g.departmentName)}</span>
            </div>
            ${headerRight}
          </div>
          <div class="wr-table-container" style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);background:#fff;padding-bottom:12px;">
            <table class="wr-table" style="min-width:1400px; width:100%; table-layout:fixed;">
              <colgroup>
                <col style="width:110px;">
                <col style="width:50px;">
                <col class="group-hide" style="width:110px;">
                <col class="group-hide" style="width:120px;">
                <col class="group-hide" style="width:140px;">
                <col style="width:100px;">
                <col style="width:70px;">
                <col style="width:70px;">
                <col style="width:110px;">
                <col style="width:200px;">
                <col style="width:300px;">
                <col style="width:180px;">
                <col style="width:200px;">
                <col style="width:180px;">
              </colgroup>
              <thead>
                <tr style="background:#e6f2ff; color:#0f172a; height:30px;">
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">日付</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">曜</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">社員番号</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">氏名</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">部署</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務区分</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">出勤</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">退勤</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務形態</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">現場</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">作業内容</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">遅刻・早退等</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">備考</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">状態</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;

    }).join('');
    tableHost.innerHTML = html;
  };

  const syncDeptOptions = (items) => {
    const sel = $('#wrDept');
    if (!sel) return;
    const names = Array.from(new Set((items || []).map(x => String(x?.departmentName || '').trim()).filter(Boolean))).sort((a, b) => cmpStr(a, b));
    const optHtml = ['<option value="">全部署</option>']
      .concat(names.map(n => `<option value="${esc(n)}" ${normalize(n) === normalize(state.dept) ? 'selected' : ''}>${esc(n)}</option>`))
      .join('');
    sel.innerHTML = optHtml;
  };

  const normalizeMonthListResponse = (r) => {
    const items = Array.isArray(r?.items) ? r.items : [];
    const sum = r?.summary || {};
    return {
      summary: {
        employees: sum.employees == null ? 0 : sum.employees,
        workedDays: sum.workedDays == null ? items.length : sum.workedDays,
        submitted: sum.submitted == null ? 0 : sum.submitted,
        missing: sum.missing == null ? 0 : sum.missing
      },
      items
    };
  };

  const toListFromLegacyMonthMatrix = (r) => {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const days = Array.isArray(r?.days) ? r.days : [];
    const users = Array.isArray(r?.items) ? r.items : [];
    const out = [];
    const workingUsers = new Set();
    let submitted = 0;
    let missing = 0;
    for (const u of users) {
      const uid = u?.userId;
      const dmap = u?.days || {};
      for (const d of days) {
        const entry = dmap?.[d] || null;
        const st = String(entry?.status || '');
        if (st !== 'checked_out' && st !== 'working' && st !== 'holiday_work' && st !== 'holiday_working' && st !== 'not_checked_in') continue;
        const rep = entry?.report || null;
        const site = String(rep?.site || '').trim() || null;
        const work = String(rep?.work || '').trim() || null;
        
        let status = st;
        if (st === 'not_checked_in') {
          status = 'not_checked_in';
        } else if (st === 'checked_out' || st === 'holiday_work') {
           status = (site || work) ? 'submitted' : 'missing';
        } else if (st === 'working' || st === 'holiday_working') {
           status = (String(d).slice(0, 10) < today) ? ((site || work) ? 'checkout_missing_submitted' : 'checkout_missing') : 'working';
        }
        
        if (status === 'submitted' || status === 'checkout_missing_submitted') submitted++;
        else if (status === 'missing' || status === 'checkout_missing' || status === 'not_checked_in') missing++;
        workingUsers.add(uid);
        out.push({
          userId: uid,
          employeeCode: u?.employeeCode || null,
          username: u?.username || null,
          departmentId: u?.departmentId || null,
          departmentName: u?.departmentName || null,
          date: String(d).slice(0, 10),
          weekday: weekdayJa(d),
          attendance: { checkIn: null, checkOut: null },
          kubun: entry?.kubun || null,
          workType: null,
          holiday: entry?.holiday || false,
          site,
          work,
          status
        });
      }
    }
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const ac = String(a.employeeCode || '').toUpperCase();
      const bc = String(b.employeeCode || '').toUpperCase();
      if (ac !== bc) return ac < bc ? -1 : 1;
      return Number(a.userId || 0) - Number(b.userId || 0);
    });
    return {
      summary: { employees: workingUsers.size, workedDays: out.length, submitted, missing },
      items: out
    };
  };

  const load = async () => {
    const monthEl = $('#wrMonth');
    state.month = isYM(monthEl?.value) ? monthEl.value : initMonth;
    setUrl();
    showSpinner();
    try {
      let r = null;
      try {
        r = await fetchJSONAuth(`/api/admin/work-reports/month/list?month=${encodeURIComponent(state.month)}`);
        r = normalizeMonthListResponse(r);
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('Invalid userId') || msg.includes('404') || msg.includes('Not Found')) {
          const legacy = await fetchJSONAuth(`/api/admin/work-reports/month?month=${encodeURIComponent(state.month)}`);
          r = toListFromLegacyMonthMatrix(legacy);
        } else {
          throw e;
        }
      }
      const summaryEl = $('#wrSummary');
      state.items = Array.isArray(r?.items) ? r.items : [];
      syncDeptOptions(state.items);
      const sum = r?.summary || {};
      const shown = filterAndSort(state.items).length;
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px; font-size:14px; background:#f8fafc; padding:4px 12px; border-radius:6px; border:1px solid #e2e8f0; height:32px; box-sizing:border-box;">
            <span style="color:#0f172a; font-weight:600;"><span style="color:#64748b; font-weight:500; margin-right:4px;">出勤</span>${sum.workedDays == null ? 0 : sum.workedDays}</span>
            <span style="color:#0f172a; font-weight:600;"><span style="color:#64748b; font-weight:500; margin-right:4px;">提出</span>${sum.submitted == null ? 0 : sum.submitted}</span>
            <span style="color:#e11d48; font-weight:600;"><span style="color:#f43f5e; font-weight:500; margin-right:4px;">未提出</span>${sum.missing == null ? 0 : sum.missing}</span>
          </div>
        `;
      }
      const view = filterAndSort(state.items);
      if (state.group) renderGrouped(view);
      else renderRows(view, true);
    } catch (e) {
      const tableHost = $('#wrTable');
      if (tableHost) {
        tableHost.innerHTML = `<div class="empty-state"><div style="font-size:28px;">⚠️</div><div>読み込み失敗: ${esc((e && e.message) ? e.message : 'unknown')}</div></div>`;
      }
    } finally {
      hideSpinner();
    }
  };

  // Sync date picker values if resized
  window.addEventListener('resize', () => {
    const mobileActions = document.getElementById('attHubMobileActions');
    if (window.innerWidth <= 768 && mobileActions) {
      if (!document.getElementById('wrMonthMobileHeader')) {
        // Re-inject if missing
        mobileActions.style.flex = '1';
        mobileActions.style.marginLeft = '8px';
        mobileActions.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content: space-between;">
            <input id="wrQueryMobileHeader" type="text" placeholder="検索..." value="${esc(state.q)}" style="flex: 1; min-width: 60px; height: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; padding: 0 6px 0 24px; font-size: 13px; background: #fff url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%2364748b\\'%3E%3Cpath stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\\'%3E%3C/path%3E%3C/svg%3E') no-repeat 6px center / 14px; color: #1f2937; outline: none; margin: 0;">
            <div style="display:flex; align-items:center; gap:6px; flex-shrink: 0;">
              <input type="month" id="wrMonthMobileHeader" value="${state.month}" style="height: 32px; padding: 0 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 120px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;">
              <button type="button" id="wrFilterToggleHeader" style="height: 32px; width: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; background: #fff; display: flex; align-items: center; justify-content: center; padding: 0; color: #475569; cursor: pointer; margin: 0; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>
            </div>
          </div>
        `;
        const queryHeader = document.getElementById('wrQueryMobileHeader');
        queryHeader.addEventListener('change', async (e) => {
          state.q = e.target.value;
          const dQuery = $('#wrQuery');
          if (dQuery) dQuery.value = state.q;
          await load();
        });
        const monthHeader = document.getElementById('wrMonthMobileHeader');
        monthHeader.addEventListener('change', async (e) => {
          state.month = e.target.value;
          const dMonth = $('#wrMonth');
          if (dMonth) dMonth.value = state.month;
          if (!isYM(state.month)) return;
          await load();
        });
        const filterToggleHeader = document.getElementById('wrFilterToggleHeader');
        const advancedFilters = $('#wrAdvancedFilters');
        filterToggleHeader.addEventListener('click', () => {
          if (advancedFilters) advancedFilters.classList.toggle('show');
          filterToggleHeader.classList.toggle('active');
          if (filterToggleHeader.classList.contains('active')) {
            filterToggleHeader.style.background = '#f1f5f9';
            filterToggleHeader.style.borderColor = '#94a3b8';
            filterToggleHeader.style.color = '#0f172a';
          } else {
            filterToggleHeader.style.background = '#fff';
            filterToggleHeader.style.borderColor = '#cbd5e1';
            filterToggleHeader.style.color = '#475569';
          }
        });
      } else {
        document.getElementById('wrMonthMobileHeader').value = state.month;
        document.getElementById('wrQueryMobileHeader').value = state.q;
      }
    } else if (mobileActions) {
      mobileActions.innerHTML = '';
    }
  });

  $('#wrMonth')?.addEventListener('change', async () => {
    const monthEl = $('#wrMonth');
    if (!isYM(monthEl?.value)) return;
    await load();
  });
  $('#wrMonthMobile')?.addEventListener('change', async () => {
    const monthEl = $('#wrMonthMobile');
    state.month = monthEl.value;
    const dMonth = $('#wrMonth');
    if (dMonth) dMonth.value = state.month;
    if (!isYM(state.month)) return;
    await load();
  });

  $('#wrExport')?.addEventListener('click', async () => {
    try {
      // Pass filtering & sorting parameters to the backend
      const qParams = new URLSearchParams({
        period: 'month',
        month: state.month,
        sort: state.sort,
        dept: state.dept,
        q: state.q,
        group: state.group ? '1' : '0'
      });
      const url = `/api/admin/work-reports/export.xlsx?${qParams.toString()}`;
      await downloadWithAuth(url, `work_reports_${state.month}.xlsx`);
    } catch (e) {
      alert(String(e?.message || 'エクスポートに失敗しました'));
    }
  });

  // Mobile Filter Toggle Logic handled by header button now if moved, but we still need the logic
  const advancedFilters = $('#wrAdvancedFilters');
  
  // Handle Mobile Header Date Picker and Filter Toggle
  const mobileActions = document.getElementById('attHubMobileActions');
  if (window.innerWidth <= 768 && mobileActions) {
    mobileActions.style.flex = '1';
    mobileActions.style.marginLeft = '8px';
    mobileActions.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content: space-between;">
        <input id="wrQueryMobileHeader" type="text" placeholder="検索..." value="${esc(state.q)}" style="flex: 1; min-width: 60px; height: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; padding: 0 6px 0 24px; font-size: 13px; background: #fff url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%2364748b\\'%3E%3Cpath stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\\'%3E%3C/path%3E%3C/svg%3E') no-repeat 6px center / 14px; color: #1f2937; outline: none; margin: 0;">
        <div style="display:flex; align-items:center; gap:6px; flex-shrink: 0;">
          <input type="month" id="wrMonthMobileHeader" value="${state.month}" style="height: 32px; padding: 0 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 120px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;">
          <button type="button" id="wrFilterToggleHeader" style="height: 32px; width: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; background: #fff; display: flex; align-items: center; justify-content: center; padding: 0; color: #475569; cursor: pointer; margin: 0; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
        </div>
      </div>
    `;
    
    const queryHeader = document.getElementById('wrQueryMobileHeader');
    queryHeader.addEventListener('change', async (e) => {
      state.q = e.target.value;
      const dQuery = $('#wrQuery');
      if (dQuery) dQuery.value = state.q;
      await load();
    });

    const monthHeader = document.getElementById('wrMonthMobileHeader');
    monthHeader.addEventListener('change', async (e) => {
      state.month = e.target.value;
      const dMonth = $('#wrMonth');
      if (dMonth) dMonth.value = state.month;
      if (!isYM(state.month)) return;
      await load();
    });

    const filterToggleHeader = document.getElementById('wrFilterToggleHeader');
    filterToggleHeader.addEventListener('click', () => {
      if (advancedFilters) advancedFilters.classList.toggle('show');
      filterToggleHeader.classList.toggle('active');
      if (filterToggleHeader.classList.contains('active')) {
        filterToggleHeader.style.background = '#f1f5f9';
        filterToggleHeader.style.borderColor = '#94a3b8';
        filterToggleHeader.style.color = '#0f172a';
      } else {
        filterToggleHeader.style.background = '#fff';
        filterToggleHeader.style.borderColor = '#cbd5e1';
        filterToggleHeader.style.color = '#475569';
      }
    });
  } else if (mobileActions) {
    mobileActions.innerHTML = '';
  }

  $('#wrSort')?.addEventListener('change', async () => {
    const sel = $('#wrSort');
    state.sort = String(sel?.value || 'dateDesc');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        // Summary is now just "出勤X 提出Y 未提出Z", no need to update "表示: N"
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrDept')?.addEventListener('change', async () => {
    const sel = $('#wrDept');
    state.dept = String(sel?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        // Summary is now just "出勤X 提出Y 未提出Z", no need to update "表示: N"
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrQuery')?.addEventListener('input', async () => {
    const inp = $('#wrQuery');
    state.q = String(inp?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        // Summary is now just "出勤X 提出Y 未提出Z", no need to update "表示: N"
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrGroup')?.addEventListener('change', async () => {
    const ck = $('#wrGroup');
    state.group = !!ck?.checked;
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
  });

  await load();
}
