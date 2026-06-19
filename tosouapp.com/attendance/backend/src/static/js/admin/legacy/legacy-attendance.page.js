import { escapeHtml as esc, delegate } from '../_shared/dom.js';
import { api, downloadWithAuth } from '../../shared/api/client.js';
import { createPage } from '../../shared/page/createPage.js';
import { createCleanup } from '../../shared/page/createCleanup.js';

export async function mountAttendance(options) {
  return await mountAttendanceImpl(options);
}

async function mountAttendanceImpl({
  content,
  listUsers,
  getTimesheet,
  getAttendanceDay,
  updateAttendanceSegment,
  buildTimesheetExportURL
}) {
  const cleanup = createCleanup();
  let isCurrent = true;
  const controller = new AbortController();
  const signal = controller.signal;
  cleanup.add(() => { isCurrent = false; });
  cleanup.add(() => controller.abort());

  let users = [];
  try {
    const isRecordsPage = window.location.pathname.includes('/ui/attendance-records');
    if (!isRecordsPage && typeof listUsers === 'function') {
      users = await listUsers({ signal });
    }
  } catch (e) {
    console.warn('Could not fetch users for dropdown:', e);
  }
  content.innerHTML = '';

  const fmtTime = (dt) => {
    if (!dt) return '';
    const s = String(dt);
    return s.length >= 16 ? s.slice(11, 16) : s;
  };
  const isWeekend = (dateStr) => {
    try {
      const s = String(dateStr || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
      const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
      const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      return wd === 0 || wd === 6;
    } catch {
      return false;
    }
  };
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // JST
  const month = today.slice(0, 7);

  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  
  if (isStandalone) {
    try {
      const topbar = document.querySelector('.topbar');
      const subbar = document.querySelector('.subbar');
      if (topbar) topbar.style.display = 'none';
      if (subbar) subbar.style.display = 'none';
      
      const adminChrome = document.querySelector('#adminChrome');
      if (adminChrome) adminChrome.style.display = 'none';

      document.body.style.paddingTop = '0';
      const rootHtml = document.documentElement;
      rootHtml.style.setProperty('--topbar-height', '0px');
      rootHtml.style.setProperty('--subbar-height', '0px');
    } catch(e) {}
  }

  const vhExpr = isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';

  const rosterWrap = document.createElement('div');
  rosterWrap.style.cssText = `margin: 0; padding: 0; width: 100%; height: ${vhExpr}; display: flex; flex-direction: column; overflow: visible;`;
  // Add mobile/desktop styles properly
  rosterWrap.innerHTML = `
    <style>
      .attrec-fiori-override .dash-card-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        letter-spacing: -0.01em;
        margin: 0 !important;
      }
      .attrec-fiori-override.dash-card {
        background: #fff !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 24px !important;
        box-sizing: border-box;
      }
      .attrec-fiori-override .attrec-head {
        padding: 0 0 8px 0 !important;
        border-bottom: none !important;
      }
      .attrec-fiori-override .attrec-controls {
        padding: 0 !important;
        gap: 8px !important;
        margin-top: 0 !important;
      }
      .attrec-fiori-override .attrec-control {
        gap: 8px !important;
      }
      .attrec-fiori-override .mobile-row {
        display: contents; /* On desktop, act as if it's not there */
      }
      .attrec-fiori-override .attrec-input,
      .attrec-fiori-override .attrec-btn {
        height: 30px !important;
        font-size: 13px !important;
        padding: 0 10px !important;
        border-radius: 4px !important;
      }
      .attrec-fiori-override .attrec-table {
        margin: 0 !important;
        padding: 0 0 24px 0 !important;
        border-top: none !important;
      }
      .attrec-fiori-override .attrec-dash-table th {
        padding: 6px 12px !important;
        font-size: 12px !important;
        background: #f8fafc !important;
        color: #475569 !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .attrec-fiori-override .attrec-dash-table td {
        padding: 6px 12px !important;
        font-size: 13px !important;
        vertical-align: middle !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .attrec-fiori-override .attrec-pill {
        font-size: 11px !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
      }
      .attrec-fiori-override .attrec-summary {
        gap: 6px !important;
      }
      .attrec-fiori-override .attrec-pill {
        display: inline-block !important;
        margin-bottom: 4px !important;
      }
      
      /* Excel Dropdown Styles */
      .excel-dropdown-container {
        position: relative;
        display: inline-block;
      }
      .excel-dropdown-btn {
        display: flex !important;
        align-items: center;
        gap: 6px;
        background: #ffffff !important;
        color: #475569 !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        height: 34px !important;
        padding: 0 12px !important;
        border-radius: 6px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
      }
      .excel-dropdown-btn:hover {
        background: #f8fafc !important;
      }
      .excel-dropdown-btn::after {
        content: "▼";
        font-size: 10px;
        margin-left: 4px;
      }
      .excel-dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background-color: white;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.1);
        z-index: 9999 !important; /* Ensure it is always on top */
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        overflow: visible !important; /* Fix cutoff issue */
        margin-top: 4px;
      }
      .excel-dropdown-menu.show {
        display: block;
      }
      .excel-dropdown-menu button {
        color: #334155;
        padding: 10px 16px;
        text-decoration: none;
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        font-size: 13px;
        cursor: pointer;
      }
      .excel-dropdown-menu button:last-child {
        border-bottom: none;
      }
      .excel-dropdown-menu button:hover {
        background-color: #f8fafc;
        color: #0f172a;
      }
      /* Responsive Hide/Show Classes */
      .mobile-only {
        display: none !important;
      }
      .attrec-emp-like-table td.desktop-only {
        display: table-cell !important;
      }
      
      /* Mobile responsive styles for legacy attendance page */
      @media (max-width: 768px) {
        .attrec-emp-like-table td.mobile-only {
          display: block !important;
        }
        .attrec-emp-like-table td.m-code-cell.mobile-only {
          display: flex !important;
        }
        .attrec-emp-like-table td.m-main-cell.mobile-only {
          display: flex !important;
        }
        .attrec-emp-like-table td.desktop-only {
          display: none !important;
        }

        .attrec-fiori-override .dash-card-title {
          display: none !important;
        }
        .attrec-fiori-override .attrec-head {
          padding: 8px 12px 4px 12px !important;
          border-bottom: none !important;
        }
        .attrec-fiori-override .attrec-summary {
          flex-wrap: wrap !important;
          gap: 4px !important;
        }
        .attrec-fiori-override .attrec-controls {
          flex-direction: column !important;
          gap: 12px !important;
          padding: 12px !important;
          background: transparent !important; /* Force transparent background */
          margin: 0 12px 12px 12px !important;
          border-radius: 8px !important;
          border: none !important; /* Remove border */
        }
        .attrec-fiori-override .attrec-control {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important; /* Increase gap between items on mobile */
          width: 100% !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
        }
        .attrec-fiori-override .mobile-row {
          display: flex !important;
          gap: 6px !important;
          width: 100% !important;
          align-items: center !important;
        }
        .attrec-fiori-override .attrec-label {
          display: none !important;
        }
        .attrec-fiori-override .attrec-control:nth-child(1) .mobile-row:nth-child(2)::before {
          content: "日";
          font-weight: 700 !important;
          color: #475569 !important;
          font-size: 13px !important;
          margin-right: 2px !important;
        }
        .attrec-fiori-override .attrec-control:nth-child(2) .mobile-row:nth-child(2)::before {
          content: "月";
          font-weight: 700 !important;
          color: #475569 !important;
          font-size: 13px !important;
          margin-right: 2px !important;
        }
        .attrec-fiori-override .attrec-input {
          flex: 1 !important;
          height: 34px !important;
          font-size: 14px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 0 8px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .attrec-fiori-override .attrec-btn {
          flex: 1 !important;
          height: 34px !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          background: #ffffff !important;
          color: #475569 !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 4px !important;
        }
        
        /* Dropdown specific mobile styles */
        .attrec-fiori-override .excel-dropdown-container {
          width: 100% !important;
        }
        .attrec-fiori-override .excel-dropdown-btn {
          width: 100% !important;
          justify-content: space-between !important;
          padding: 0 12px !important;
          border: 1px solid #cbd5e1 !important; /* Ensure border exists on mobile */
          height: 34px !important;
        }
        .attrec-fiori-override .excel-dropdown-menu {
          width: 100% !important;
          left: 0 !important;
        }
        /* Removed #rosterLoad styles as the button is no longer used */
        .attrec-fiori-override .attrec-table {
          padding: 0 12px 12px 12px !important;
        }
        /* Improve mobile cards for table to exactly match employees page */
        .attrec-emp-like-table {
          display: block !important;
          background: transparent !important;
        }
        .attrec-emp-like-table thead {
          display: none !important;
        }
        .attrec-emp-like-table tbody {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          background: transparent !important;
        }
        .attrec-emp-like-table tr {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important; 
          overflow: hidden !important;
          margin-bottom: 0 !important; 
        }
        .attrec-emp-like-table td {
          display: block !important;
          padding: 0 !important; 
          border-bottom: none !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important; 
          text-align: left !important;
          min-height: auto !important;
        }
        .attrec-emp-like-table td::before {
          display: none !important;
        }
        .attrec-emp-like-table .m-code-cell {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
          background: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          padding: 12px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          box-sizing: border-box !important;
        }
        .attrec-emp-like-table .m-code-label {
          font-size: 11px !important;
          color: #64748b !important;
          margin-bottom: 4px !important;
        }
        .attrec-emp-like-table .m-code-value {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          word-break: break-all !important;
        }
        .attrec-emp-like-table .m-main-cell {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 12px 16px !important;
          background: #ffffff !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          gap: 12px !important;
        }
        .attrec-emp-like-table .m-line {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          width: 100% !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-k {
          min-width: 70px !important;
          color: #64748b !important;
          flex-shrink: 0 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-v {
          color: #0f172a !important;
          word-break: break-word !important;
          flex: 1 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-v-name {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        /* Style pill tags inside mobile cards */
        .attrec-emp-like-table .m-v .attrec-pill {
          margin-bottom: 0 !important;
          font-size: 11px !important;
          font-weight: bold !important;
          padding: 2px 8px !important;
          border-radius: 4px !important;
        }
      }
    </style>
    <div class="dash-card attrec-fiori-override" style="height: 100%; display: flex; flex-direction: column; overflow: visible !important;">
      <div class="attrec-controls" style="margin-bottom: 12px; flex-shrink: 0; padding: 0 !important; background: transparent !important; border: none !important; overflow: visible !important; display: none !important;">
      </div>
      <div class="attrec-head" style="flex-shrink: 0; padding-top: 0px;">
        <div id="rosterSummary" class="attrec-summary" aria-live="polite" style="display: flex; gap: 12px; margin-bottom: 8px;"></div>
      </div>
      <div id="rosterTable" class="attrec-table" style="flex: 1; overflow-y: auto; overflow-x: auto;"></div>
    </div>
  `;
  content.appendChild(rosterWrap);
  
  // Inject mobile header controls
  const mobileActions = document.getElementById('attHubMobileActions');
  if (window.innerWidth <= 768 && mobileActions) {
    mobileActions.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <input id="rosterDateMobile" type="date" value="${esc(today)}" style="height: 32px; padding: 0 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 120px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;">
        <input id="rosterMonthMobile" type="month" value="${esc(month)}" style="height: 32px; padding: 0 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 110px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;">
        <button type="button" id="rosterExportMonthXlsxMobile" style="height: 32px; padding: 0 8px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; background: #fff; display: flex; align-items: center; justify-content: center; color: #0b2c66; cursor: pointer; margin: 0; font-size:12px; font-weight:600; white-space:nowrap;">
          Excel出力
        </button>
      </div>
    `;
    
    // Removed mobile dropdown logic
  }

  // Restore Desktop controls
  const desktopControlsHtml = `
        <div class="attrec-control hidden-on-mobile" style="flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; padding: 0 !important; gap: 12px; background: transparent !important; border: none !important; overflow: visible !important;">
          <input id="rosterDate" class="attrec-input" type="date" value="${esc(today)}" style="width: 140px; border: 1px solid #cbd5e1; height: 34px; box-sizing: border-box;">
          <input id="rosterMonth" class="attrec-input" type="month" value="${esc(month)}" style="width: 120px; border: 1px solid #cbd5e1; height: 34px; box-sizing: border-box;">
          <button type="button" id="rosterExportMonthXlsx" class="attrec-btn">Excel出力</button>
        </div>
  `;
  const controlsDiv = rosterWrap.querySelector('.attrec-controls');
  if (controlsDiv) {
    controlsDiv.innerHTML = desktopControlsHtml;
  }
  
  // Resize listener to manage mobile header vs desktop header visibility
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (controlsDiv) {
      controlsDiv.style.display = isMobile ? 'none' : 'block';
    }
  });
  if (controlsDiv) {
    controlsDiv.style.display = window.innerWidth <= 768 ? 'none' : 'block';
  }

  const renderSummary = (sum) => {
    const s = sum && typeof sum === 'object' ? sum : {};
    const required = Number(s.required == null ? 0 : s.required);
    const submitted = Number(s.submitted == null ? 0 : s.submitted);
    const missing = Number(s.missing == null ? 0 : s.missing);
    const host = rosterWrap.querySelector('#rosterSummary');
    if (!host) return;
    const missClass = missing > 0 ? 'attrec-pill danger' : 'attrec-pill ok';
    host.innerHTML = `
      <span class="attrec-pill neutral">必要(退勤済): ${esc(required)}</span>
      <span class="attrec-pill ok">提出: ${esc(submitted)}</span>
      <span class="${missClass}">未提出: ${esc(missing)}</span>
    `;
  };

  const loadRoster = async (date) => {
    const host = rosterWrap.querySelector('#rosterTable');
    if (host) {
      host.innerHTML = `
        <div class="empty-state">
          <div style="font-size:28px;">⏳</div>
          <div>読み込み中…</div>
        </div>
      `;
    }
    renderSummary(null);
    try {
      const r = await api.get(`/api/admin/work-reports?date=${encodeURIComponent(date)}`, { signal });
      if (!isCurrent) return;
      const items = (r && Array.isArray(r.items)) ? r.items : [];
      renderSummary((r && r.summary) ? r.summary : {});
      if (!host) return;
      if (!items.length) {
        host.innerHTML = `
          <div class="empty-state">
            <div style="font-size:28px;">🗂️</div>
            <div>データがありません</div>
          </div>
        `;
        return;
      }
      let currentPage = 1;
      const pageSize = 10;
      const renderTablePage = () => {
        if (!host) return;
        host.innerHTML = '';
        
        const table = document.createElement('table');
        table.id = 'attrecList';
        
        // Clean aesthetic table structure
        table.className = 'beautiful-table';
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        table.style.minWidth = '800px'; 
        table.style.borderCollapse = 'collapse';
        table.style.border = '1px solid #d1d5db';
        table.style.borderRadius = '8px';
        table.style.overflow = 'hidden';
        
        table.innerHTML = `
          <style>
            .beautiful-table {
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .beautiful-table thead {
              background-color: #e6f0fa;
            }
            .beautiful-table th {
              padding: 12px 8px;
              font-weight: 700;
              color: #1e293b;
              font-size: 13px;
              text-align: center;
              border: 1px solid #d1d5db;
              border-bottom: 2px solid #cbd5e1;
            }
            .beautiful-table td {
              padding: 12px 8px;
              font-size: 13px;
              color: #334155;
              border: 1px solid #d1d5db;
              vertical-align: middle;
            }
            .beautiful-table tbody tr:hover {
              background-color: #f8fafc;
            }
            .beautiful-table .attrec-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              background-color: #f1f5f9;
              color: #475569;
              border: 1px solid #e2e8f0;
            }
            .beautiful-table .attrec-pill.ok { background-color: #f0fdf4; color: #166534; border-color: #bbf7d0; }
            .beautiful-table .attrec-pill.warn { background-color: #fffbeb; color: #92400e; border-color: #fde68a; }
            .beautiful-table .attrec-pill.danger { background-color: #fef2f2; color: #991b1b; border-color: #fecaca; }
            
            /* Mobile Optimization (Card Layout) */
            @media (max-width: 768px) {
              .beautiful-table {
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
                min-width: 0 !important;
                display: block;
              }
              .beautiful-table thead {
                display: none;
              }
              .beautiful-table tbody {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }
              .beautiful-table tr {
                display: grid;
                grid-template-columns: 90px 1fr;
                grid-auto-rows: auto;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                position: relative;
              }
              
              /* Code (Left Column) */
              .beautiful-table td:nth-child(1) {
                grid-column: 1 / 2;
                grid-row: 1 / 10; /* Span across all rows */
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: flex-start;
                padding: 16px 12px;
                border: none;
                border-right: 1px solid #e2e8f0;
                background: #f8fafc;
                border-radius: 8px 0 0 8px;
                text-align: left !important;
              }
              .beautiful-table td:nth-child(1)::before {
                content: "社員番号";
                font-size: 11px;
                font-weight: 400;
                color: #64748b;
                margin-bottom: 4px;
                margin-right: 0;
              }
              .beautiful-table td:nth-child(1) span,
              .beautiful-table td:nth-child(1) {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
              }

              /* Other cells (Right Column) */
              .beautiful-table td:not(:nth-child(1)) {
                grid-column: 2 / 3;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding: 8px 16px;
                border: none;
                border-bottom: 1px dashed #f1f5f9;
                text-align: left !important;
              }
              .beautiful-table td:last-child {
                border-bottom: none;
              }
              
              /* Label positioning */
              .beautiful-table td:not(:nth-child(1))::before {
                content: attr(data-label);
                width: 70px;
                font-size: 13px;
                font-weight: 600;
                color: #64748b;
                margin-right: 8px;
                text-align: left;
                flex-shrink: 0;
              }
              
              /* Content styling */
              .beautiful-table td:not(:nth-child(1)) > div,
              .beautiful-table td:not(:nth-child(1)) > span {
                text-align: left !important;
                font-size: 14px;
                color: #1e293b;
                width: 100%;
              }
            }
            .pagination-btn {
              padding: 6px 12px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              cursor: pointer;
              color: #334155;
              font-size: 13px;
              font-weight: 500;
              transition: all 0.15s;
            }
            .pagination-btn:hover:not(:disabled) {
              background: #e2e8f0;
              color: #0f172a;
            }
            .pagination-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          </style>
          <colgroup>
            <col style="width:10%;">
            <col style="width:15%;">
            <col style="width:10%;">
            <col style="width:10%;">
            <col style="width:10%;">
            <col style="width:8%;">
            <col style="width:8%;">
            <col style="width:12%;">
            <col style="width:17%;">
          </colgroup>
          <thead><tr><th>社員番号</th><th>氏名</th><th>部署</th><th>勤務区分</th><th>状態</th><th>出勤</th><th>退勤</th><th>現場</th><th>作業内容</th></tr></thead>
        `;
        const tbody = document.createElement('tbody');
        const selectedDateIsOff = isWeekend(date);
        const isPastDate = date < today;
        
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, items.length);
        const pageItems = items.slice(startIndex, endIndex);
        
        for (const it of pageItems) {
          const code = it.employeeCode || `EMP${String(it.userId).padStart(3, '0')}`;
          const name = it.username || '';
          const dept = it.departmentName || '—';
          const st = it.status || '';
          const kubunRaw = String(it.dailyKubun || '').trim();
          const kubun = kubunRaw || ((selectedDateIsOff && (st === 'leave' || st === 'not_checked_in')) ? '休日' : '');
          const leaveSet = new Set(['欠勤', '有給休暇', '半休', '無給休暇']);
          const holidaySet = new Set(['休日', '代替休日']);
          const nonWorkingSet = new Set(['欠勤', '有給休暇', '半休', '無給休暇', '休日', '代替休日']);
          const isHolidayKubun = holidaySet.has(kubun);
          // Hàm trạng thái
          // chức năng dùng để hiển thị trạng thái của nhân viên
          // 1.checked_out
          // 2.working
        
          let stLabel = '';
          let stClass = '';
          
          if (st === 'checked_out') {
            stLabel = '退勤済';
            stClass = 'attrec-pill ok';
          } else if (st === 'working' || st === 'holiday_working') {
            if (isPastDate) {
              stLabel = '退勤忘れ';
              stClass = 'attrec-pill danger';
            } else {
              stLabel = st === 'working' ? '出勤中' : '休日出勤中';
              stClass = 'attrec-pill warn';
            }
          } else if (st === 'holiday_work') {
            stLabel = '休日出勤';
            stClass = 'attrec-pill warn';
          } else if ((st === 'leave' && leaveSet.has(kubun)) || isHolidayKubun) {
            stLabel = kubun || '休日';
            stClass = 'attrec-pill neutral';
          } else if (st === 'off') {
            stLabel = '休日';
            stClass = 'attrec-pill neutral';
          } else {
            // not_checked_in or empty
            if (isPastDate) {
              stLabel = '打刻なし';
              stClass = 'attrec-pill danger';
            } else {
              stLabel = '未出勤';
              stClass = 'attrec-pill neutral';
            }
          }

          const cin = fmtTime(it.attendance ? it.attendance.checkIn : undefined);
          const cout = fmtTime(it.attendance ? it.attendance.checkOut : undefined);
          const site = (it.report && it.report.site) ? it.report.site : '';
          const work = (it.report && it.report.work) ? it.report.work : '';
          const dashOr = (v) => {
            const s = String(v || '').trim();
            return s ? s : '—';
          };
          const cinView = dashOr(cin);
          const coutView = dashOr(cout);
          const siteView = dashOr(site);
          const workView = dashOr(work);
          const wt = String(it.workType || ((it.report && it.report.workType) ? it.report.workType : '') || '').trim();
          const wtLabel = nonWorkingSet.has(kubun) ? kubun : (wt === 'onsite' ? '出社' : wt === 'remote' ? '在宅' : wt === 'satellite' ? '現場/出張' : (st === 'off' ? '休日' : '—'));
          const tr = document.createElement('tr');
          tr.className = st === 'checked_out' ? 'attrec-row checkedout'
            : (st === 'working' ? 'attrec-row working'
              : (st === 'holiday_work' || st === 'holiday_working' ? 'attrec-row working'
                : (((st === 'leave' && leaveSet.has(kubun)) || isHolidayKubun) ? 'attrec-row absent' : (st === 'off' ? 'attrec-row absent' : 'attrec-row absent'))));
          
          // Use standard table cell creation instead of weird layout elements
          tr.innerHTML = `
            <td data-label="社員番号" style="text-align:center;">${esc(code)}</td>
            <td data-label="氏名" style="font-weight:600;">${esc(name)}</td>
            <td data-label="部署">${esc(dept)}</td>
            <td data-label="勤務区分">${esc(wtLabel)}</td>
            <td data-label="状態" style="text-align:center;"><span class="${stClass}">${esc(stLabel)}</span></td>
            <td data-label="出勤" style="text-align:center; font-family:monospace; font-size:14px;">${esc(cinView)}</td>
            <td data-label="退勤" style="text-align:center; font-family:monospace; font-size:14px;">${esc(coutView)}</td>
            <td data-label="現場"><div style="font-size:12px; color:#475569; word-break:break-word; max-width:200px;">${esc(siteView)}</div></td>
            <td data-label="作業内容"><div style="font-size:12px; color:#475569; word-break:break-word; white-space:pre-wrap; max-width:400px; max-height:80px; overflow-y:auto;">${esc(workView)}</div></td>
          `;
          
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        
        const tableWrap = document.createElement('div');
        tableWrap.className = 'emp-list-scroll-wrap attrec-list-scroll-wrap';
        tableWrap.style.overflowX = 'auto';
        tableWrap.appendChild(table);
        host.appendChild(tableWrap);

        // Pagination controls
        if (items.length > 0) {
          const totalPages = Math.ceil(items.length / pageSize);
          const paginationDiv = document.createElement('div');
          paginationDiv.className = 'pagination-controls';
          paginationDiv.style.display = 'flex';
          paginationDiv.style.alignItems = 'center';
          paginationDiv.style.justifyContent = 'flex-start';
          paginationDiv.style.gap = '15px';
          paginationDiv.style.marginTop = '15px';
          paginationDiv.style.padding = '10px 0';
          
          const prevBtn = document.createElement('button');
          prevBtn.type = 'button';
          prevBtn.textContent = '前へ';
          prevBtn.className = 'pagination-btn';
          prevBtn.disabled = currentPage === 1;
          prevBtn.onclick = () => {
            if (currentPage > 1) {
              currentPage--;
              renderTablePage();
            }
          };

          const nextBtn = document.createElement('button');
          nextBtn.type = 'button';
          nextBtn.textContent = '次へ';
          nextBtn.className = 'pagination-btn';
          nextBtn.disabled = currentPage === totalPages;
          nextBtn.onclick = () => {
            if (currentPage < totalPages) {
              currentPage++;
              renderTablePage();
            }
          };

          const infoSpan = document.createElement('span');
          infoSpan.textContent = `${startIndex + 1}-${endIndex} / ${items.length}`;
          infoSpan.style.fontSize = '14px';
          infoSpan.style.color = '#333';

          paginationDiv.appendChild(prevBtn);
          paginationDiv.appendChild(infoSpan);
          paginationDiv.appendChild(nextBtn);
          host.appendChild(paginationDiv);
        }
      };
      
      renderTablePage();
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (!isCurrent) return;
      if (host) {
        host.innerHTML = `
          <div class="empty-state" style="color:#b00020;">
            <div style="font-size:28px;">⚠️</div>
            <div>読み込みに失敗しました: ${esc((err && err.message) ? err.message : 'unknown')}</div>
          </div>
        `;
      }
    }
  };

  /* Dropdown Menu Logic Removed */

  const dateEl = rosterWrap.querySelector('#rosterDate');
  const dateElMobile = document.getElementById('rosterDateMobile');
  const handleDateChange = async (e) => {
    const d = e.target.value || today;
    if (dateEl) dateEl.value = d;
    if (dateElMobile) dateElMobile.value = d;
    await loadRoster(d);
  };
  if (dateEl) dateEl.addEventListener('change', handleDateChange);
  if (dateElMobile) dateElMobile.addEventListener('change', handleDateChange);
  let profile = null;
  try {
    profile = await fetchJSONAuth('/api/auth/me');
  } catch (e) {
    //
  }

  if (profile && profile.role === 'employee') {
    const excelBtns = content.querySelectorAll('.excel-dropdown-container, #rosterExportXlsx, #rosterExportXlsxMobile');
    excelBtns.forEach(btn => { if(btn) btn.style.display = 'none'; });
  }

  const checkExportPerm = () => {
    if (profile && profile.role !== 'admin' && profile.role !== 'manager') {
      alert('権限がありません。');
      return false;
    }
    return true;
  };

  const btnExpMonth = rosterWrap.querySelector('#rosterExportMonthXlsx');
  const btnExpMonthMobile = document.getElementById('rosterExportMonthXlsxMobile');
  const handleExportMonth = async () => {
    if (!checkExportPerm()) return;
    const mEl = rosterWrap.querySelector('#rosterMonth');
    const mElMobile = document.getElementById('rosterMonthMobile');
    const m = (mEl && mEl.value) ? mEl.value : (mElMobile && mElMobile.value ? mElMobile.value : month);
    const url = `/api/admin/work-reports/export.xlsx?period=month&month=${encodeURIComponent(m)}`;
    try {
      await downloadWithAuth(url, `attendance_month_${m}.xlsx`);
    } catch (e) {
      alert(String((e && e.message) ? e.message : 'エクスポートに失敗しました'));
    }
  };
  if (btnExpMonth) btnExpMonth.addEventListener('click', handleExportMonth);
  if (btnExpMonthMobile) btnExpMonthMobile.addEventListener('click', handleExportMonth);

  await loadRoster(today);

  const form = document.createElement('form');
  const yNow = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 4);
  form.innerHTML = `
    <select id="tsUser">${users.map(u => `<option value="${u.id}">${u.id} ${u.username || u.email}</option>`).join('')}</select>
    <input id="tsYear" placeholder="Year(YYYY)" value="${yNow}" style="width:110px">
    <button type="button" id="tsExportXlsx">Excel</button>
    <input id="tsFrom" placeholder="From(YYYY-MM-DD)" style="width:150px">
    <input id="tsTo" placeholder="To(YYYY-MM-DD)" style="width:150px">
    <button type="submit">表示</button>
    <button type="button" id="tsExport">CSV</button>
  `;
  const resultDiv = document.createElement('div');
  const detailDiv = document.createElement('div');

  let currentUserId = null;
  delegate(resultDiv, 'button[data-action="day-detail"]', 'click', async (_e, btn) => {
    const date = btn.dataset.date || '';
    if (!date) return;
    if (!currentUserId) return;
    const q = await getAttendanceDay(currentUserId, date, { signal });
    if (!isCurrent) return;
    detailDiv.innerHTML = `<h4>${date} 編集</h4>`;
    const t2 = document.createElement('table');
    t2.style.width = '100%';
    t2.innerHTML = '<thead><tr><th>ID</th><th>出勤</th><th>退勤</th><th>保存</th></tr></thead>';
    const b2 = document.createElement('tbody');
    for (const seg of (q.segments || [])) {
      const tr2 = document.createElement('tr');
      tr2.innerHTML = `
        <td>${seg.id}</td>
        <td><input data-in="${seg.id}" value="${seg.checkIn || ''}"></td>
        <td><input data-out="${seg.id}" value="${seg.checkOut || ''}"></td>
        <td><button type="button" data-action="save-att" data-id="${seg.id}">保存</button></td>
      `;
      b2.appendChild(tr2);
    }
    t2.appendChild(b2);
    detailDiv.appendChild(t2);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = parseInt(form.querySelector('#tsUser').value, 10);
    const from = form.querySelector('#tsFrom').value.trim();
    const to = form.querySelector('#tsTo').value.trim();
    currentUserId = userId;
    const r = await getTimesheet(userId, from, to, { signal });
    if (!isCurrent) return;
    resultDiv.innerHTML = '';
    detailDiv.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = '<thead><tr><th>日付</th><th>通常</th><th>残業</th><th>深夜</th><th>操作</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const d of (r.days || [])) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.date}</td><td>${d.regularMinutes}</td><td>${d.overtimeMinutes}</td><td>${d.nightMinutes}</td><td><button type="button" data-action="day-detail" data-date="${d.date}">詳細</button></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    resultDiv.appendChild(table);
  });

  form.querySelector('#tsExport').addEventListener('click', () => {
    if (!checkExportPerm()) return;
    const userId = parseInt(form.querySelector('#tsUser').value, 10);
    const from = form.querySelector('#tsFrom').value.trim();
    const to = form.querySelector('#tsTo').value.trim();
    const url = buildTimesheetExportURL(String(userId), from, to);
    downloadWithAuth(url, 'timesheet.csv');
  });
  form.querySelector('#tsExportXlsx').addEventListener('click', async () => {
    if (!checkExportPerm()) return;
    const userId = parseInt(form.querySelector('#tsUser').value, 10);
    const yEl = form.querySelector('#tsYear');
    const year = String((yEl && yEl.value) ? yEl.value : yNow).trim() || yNow;
    const url = `/api/admin/employees/${encodeURIComponent(String(userId))}/export.xlsx?year=${encodeURIComponent(year)}`;
    try {
      await downloadWithAuth(url, `employee_${userId}_${year}.xlsx`);
    } catch (e) {
      alert(String((e && e.message) ? e.message : 'エクスポートに失敗しました'));
    }
  });

  // Hide Personal Timesheet Detail if not in an admin context or if it's the records standalone page
  const isRecordsPage = window.location.pathname.includes('/ui/attendance-records');
  if (!isRecordsPage) {
    const adv = document.createElement('details');
    adv.open = false;
    adv.innerHTML = `<summary style="cursor:pointer;font-weight:900;padding:10px 0;">個人タイムシート（詳細）</summary>`;
    adv.appendChild(form);
    adv.appendChild(resultDiv);
    adv.appendChild(detailDiv);
    content.appendChild(adv);
    delegate(adv, 'button[data-action="save-att"]', 'click', async (_e, btn) => {
      const id = btn.dataset.id || '';
      if (!id) return;
      const inEl = adv.querySelector(`input[data-in="${id}"]`);
      const outEl = adv.querySelector(`input[data-out="${id}"]`);
      const inVal = inEl && inEl.value ? inEl.value : null;
      const outVal = outEl && outEl.value ? outEl.value : null;
      await updateAttendanceSegment(id, { checkIn: inVal, checkOut: outVal }, { signal });
      alert('保存しました');
    });
  }

  return () => {
    try { content.innerHTML = ''; } catch { }
    cleanup.run();
  };
}

export const attendancePage = createPage({ mount: mountAttendanceImpl });
