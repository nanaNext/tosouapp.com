import { fetchJSONAuth } from '../../api/http.api.js';

let currentMonth = '';
let allRows = [];
let localHost = null;
let searchQuery = '';
let statusFilter = 'ALL';

// Handle resize to show/hide mobile date picker dynamically
window.addEventListener('resize', () => {
  if (localHost && document.getElementById('monthFilter')) {
    const mobileActions = document.getElementById('attHubMobileActions');
    if (window.innerWidth <= 768 && mobileActions) {
      let mobileMonth = document.getElementById('monthFilterMobile');
      if (!mobileMonth) {
        mobileMonth = document.createElement('input');
        mobileMonth.type = 'month';
        mobileMonth.id = 'monthFilterMobile';
        mobileMonth.style.cssText = 'height: 32px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 130px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;';
        mobileActions.innerHTML = '';
        mobileActions.appendChild(mobileMonth);
        mobileMonth.addEventListener('change', (e) => {
          currentMonth = e.target.value;
          renderList();
        });
      }
      mobileMonth.value = currentMonth;
    } else if (mobileActions) {
      mobileActions.innerHTML = '';
    }
  }
});

export async function mount({ content }) {
  localHost = content;
  localHost.style.visibility = '';
  
  const nowDate = new Date();
  nowDate.setMonth(nowDate.getMonth() + 1);
  currentMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  
  await renderList();
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getStatusLabel(status) {
  switch(status) {
    case 'PENDING': return '<span style="color:#ea580c;font-weight:normal;font-size:12px;">未承認</span>';
    case 'APPROVED': return '<span style="color:#16a34a;font-weight:normal;font-size:12px;">承認済</span>';
    case 'REJECTED': return '<span style="color:#dc2626;font-weight:normal;font-size:12px;">差戻し</span>';
    case 'UNSUBMITTED': return '<span style="color:#94a3b8;font-size:12px;">未提出</span>';
    default: return esc(status);
  }
}

function wireSubbarMenus() {
  try {
    const menus = Array.from(document.querySelectorAll('.subbar .menu'));
    if (!menus.length) return;
    const closeAll = () => menus.forEach((m) => m.classList.remove('open'));
    menus.forEach((m) => {
      const btn = m.querySelector('.menu-btn');
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = m.classList.contains('open');
        closeAll();
        if (!isOpen) m.classList.add('open');
      });
    });
    document.addEventListener('click', () => closeAll());
  } catch (e) { /* silently ignored */ }
}

async function renderList() {
  if (localHost) localHost.innerHTML = '<div style="padding: 20px; color: #64748b;">読み込み中...</div>';
  
  try {
    const [year, monthStr] = currentMonth.split('-');
    const monthNum = parseInt(monthStr, 10);
    const res = await fetchJSONAuth(`/api/attendance/shifts/matrix?month=${currentMonth}`);
    allRows = Array.isArray(res) ? res : [];
    renderTable();
  } catch (e) {
    if (localHost) localHost.innerHTML = `<div style="padding: 20px; color: #dc2626;">取得失敗: ${esc(e.message)}</div>`;
  }
}

function renderTable() {
  if (!localHost) return;

  const [year, monthStr] = currentMonth.split('-');
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';
  const tableVhExpr = isStandalone ? 'calc(100vh - 62px)' : 'calc(100vh - var(--topbar-height) - var(--subbar-height) - 62px)';

  // Calculate workCount for each employee
  allRows.forEach(emp => {
    const isSeishain = emp.employment_type === 'full_time';
    const schedule = emp.schedule || {};
    let workCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = schedule[dateKey];
      if (dayData && ['WORKING', 'CA_NGAY', 'CA_CHIEU', 'CA_DEM', '09:00-14:00'].includes(dayData.status)) {
        workCount++;
      }
    }
    emp._workCount = workCount;
  });

  const filteredRows = allRows.filter(emp => {
    if (statusFilter !== 'ALL') {
      const st = emp.submission_status || 'UNSUBMITTED';
      if (st !== statusFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (emp.username || '').toLowerCase();
      const code = (emp.employee_code || '').toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  const styles = `
    /* Force absolute full width for the parent elements */
    #adminContent { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .admin-main { padding: 0 !important; margin: 0 !important; width: 100% !important; overflow-x: hidden !important; }
    body, html { margin: 0 !important; padding: 0 !important; overflow: auto !important; width: 100% !important; height: 100% !important; }
    .portal-main, .portal-layout, .admin-layout { padding: 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; }

    .shift-container { padding: 0 !important; margin: 0 !important; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background: #FFFFFF; min-height: ${vhExpr}; height: ${vhExpr}; display: flex; flex-direction: column; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
    .page-header-container { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 0px; padding: 16px 24px 8px 24px; flex-shrink: 0; }
    .page-header-title { display: none; }
    @media (max-width: 768px) { .page-header-container { display: none !important; } .page-header-title { display: none !important; } }

    .shift-table-wrapper { flex: 1; overflow-y: auto; overflow-x: auto; border-top: 1px solid #e2e8f0; border-bottom: none; box-shadow: none; background: white; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; max-height: ${tableVhExpr}; }
    .shift-table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    .shift-table-wrapper::-webkit-scrollbar-track { background: #f1f5f9; }
    .shift-table-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .shift-table-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .sap-dense-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-family: 'Segoe UI', 'Meiryo', sans-serif; font-size: 11px; margin: 0 !important; background: #fff; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
    .sap-dense-table th, .sap-dense-table td { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; padding: 0; text-align: center; vertical-align: middle; height: 22px; width: 50px; box-sizing: border-box; color: #334155; background: #fff; }
    /* Fix top/left borders because of border-collapse: separate */
    .sap-dense-table th { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .sap-dense-table tr th:first-child, .sap-dense-table tr td:first-child { border-left: 1px solid #e2e8f0; }
    .sap-dense-table thead th:last-child { border-right: 1px solid #e2e8f0; }
    .sap-dense-table tbody tr td:last-child { border-right: 1px solid #e2e8f0; }

    /* Fix scrolling bleed using top: -1px and box-shadow */
    .sap-dense-table thead th { position: sticky; top: -1px; z-index: 20; background: #f8fafc; vertical-align: top; border-top: none; border-bottom: 1px solid #e2e8f0; box-shadow: 0 -1px 0 0 #e2e8f0; }
    
    .col-fixed-1 { position: sticky; left: 0; z-index: 15; background: #f8fafc; width: 44px; min-width: 44px; max-width: 44px; font-weight: bold; color: #475569; }
    .col-fixed-2 { position: sticky; left: 44px; z-index: 15; background: #f8fafc; width: 28px; min-width: 28px; max-width: 28px; border-right: 1px solid #e2e8f0 !important; font-weight: bold; color: #475569; }
    .sap-dense-table thead th.col-fixed-1, .sap-dense-table thead th.col-fixed-2 { z-index: 30; vertical-align: middle; background: #f8fafc; border-bottom: 1px solid #e2e8f0; box-shadow: 0 -1px 0 0 #e2e8f0; }
    
    .sap-dense-table tbody .col-fixed-1, .sap-dense-table tbody .col-fixed-2 { background: #f8fafc; font-weight: 600; z-index: 10; border-bottom: 1px solid #e2e8f0; }
    .sap-dense-table tbody tr:hover td { background: #f8fafc; }
    .sap-dense-table tbody tr:hover .col-fixed-1, .sap-dense-table tbody tr:hover .col-fixed-2 { background: #f1f5f9; }

    .emp-col { min-width: 50px; max-width: 60px; padding: 2px !important; z-index: 20 !important; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .emp-col-inner { display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; }
    .emp-name-row { display: flex; justify-content: center; align-items: baseline; gap: 4px; width: 100%; flex-wrap: wrap; margin-bottom: 2px; }
    .emp-name { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; color: #1e293b; max-width: 100%; }
    .emp-code { font-size: 11px; color: #64748b; white-space: nowrap; }
    .emp-info-row { display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; flex-wrap: wrap; }
    .emp-type { }
    .emp-total { font-size: 13px; color: #64748b; font-weight: normal; }
    .emp-status { text-align: center; }
    .emp-action { margin-top: 0; width: auto; }

    /* Cell styles - SAP UI style small squares */
    .cell-work { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-day { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-afternoon { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-night { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave-paid { background: #fef9c3; color: #92400e; border: 1px solid #fde68a; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave-special { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-off { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-empty { color: #94a3b8; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin: 0 auto; font-size: 11px; border: 1px dashed transparent; }

    .badge-sei { background: #eff6ff; color: #1e40af; padding: 2px 4px; border-radius: 2px; font-size: 11px; border: 1px solid #bfdbfe; }
    .badge-bai { background: #dcfce7; color: #166534; padding: 2px 4px; border-radius: 2px; font-size: 11px; border: 1px solid #bbf7d0; }
    
    .btn-xs { padding: 4px 6px; font-size: 11px; border: none; border-radius: 3px; cursor: pointer; color: white; font-weight: bold; white-space: nowrap; }
    .btn-ok { background: #16a34a; }
    .btn-ok:hover { background: #15803d; }
    .btn-ng { background: #dc2626; }
    .btn-ng:hover { background: #b91c1c; }
    
    /* Custom Modal Styles */
    .reason-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
    .reason-modal-overlay.show { display: flex; opacity: 1; }
    .reason-modal-content { background: white; border-radius: 8px; width: 90%; max-width: 320px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; transform: translateY(20px); transition: transform 0.2s; }
    .reason-modal-overlay.show .reason-modal-content { transform: translateY(0); }
    .reason-modal-header { padding: 12px 16px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a; }
    .reason-modal-body { padding: 16px; font-size: 14px; color: #334155; line-height: 1.5; min-height: 60px; word-break: break-word; }
    .reason-modal-footer { padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; }
    .reason-modal-btn { padding: 6px 16px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .reason-modal-btn:hover { background: #475569; }
    
    /* Mobile specific styles */
    .shift-mobile-list { display: none; flex-direction: column; gap: 12px; padding: 16px; padding-bottom: 32px; background: #f1f5f9; overflow-y: auto; max-height: ${tableVhExpr}; }
    .sac-card { background: white; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px; }
    .sac-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .sac-name-wrap { display: flex; flex-direction: column; gap: 4px; }
    .sac-name { font-weight: bold; font-size: 15px; color: #0f172a; }
    .sac-status { text-align: right; }
    .sac-summary { display: flex; justify-content: space-between; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; color: #475569; }
    .sac-days-scroll { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding-bottom: 8px; margin-bottom: 8px; }
    .sac-day-item { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; align-items: center; background: #fff; }
    .sac-day-header { width: 100%; text-align: center; font-size: 10px; background: #f8fafc; padding: 2px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
    .sac-day-val { width: 100%; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    @media (max-width: 768px) { .shift-table-wrapper { display: none !important; } .shift-mobile-list { display: flex !important; } }
  `;

  const getDayColor = (d) => {
    const date = new Date(year, monthNum - 1, d);
    const day = date.getDay();
    if (day === 0) return 'color: #dc2626;'; // Sunday
    if (day === 6) return 'color: #2563eb;'; // Saturday
    return '';
  };
  const getDayStr = (d) => {
    const date = new Date(year, monthNum - 1, d);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  let html = `
    <style>${styles}</style>
    <div class="shift-container">
      <div class="page-header-container" style="padding-right: 8px;">
        <h2 class="page-header-title">\u30b7\u30d5\u30c8\u627f\u8a8d</h2>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <input type="text" id="empSearch" value="${esc(searchQuery)}" placeholder="名前・番号で検索..." style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 160px; outline: none; box-sizing: border-box;" />
          <select id="statusFilter" style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; background: white; cursor: pointer;">
            <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>全て (Tất cả)</option>
            <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>未承認 (Chờ duyệt)</option>
            <option value="APPROVED" ${statusFilter === 'APPROVED' ? 'selected' : ''}>承認済 (Đã duyệt)</option>
            <option value="UNSUBMITTED" ${statusFilter === 'UNSUBMITTED' ? 'selected' : ''}>未提出 (Chưa nộp)</option>
          </select>
          <input type="month" id="monthFilter" value="${currentMonth}" style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 140px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;" />
        </div>
      </div>
      <div class="shift-table-wrapper" style="padding: 0 !important; margin: 0 !important;">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th class="col-fixed-1">日付</th>
              <th class="col-fixed-2">曜日</th>
  `;

  if (filteredRows.length === 0) {
    html += `</tr></thead><tbody><tr><td colspan="2" style="padding: 20px; color: #94a3b8;">データがありません</td></tr></tbody></table></div>`;
    let mobileHtml = `<div class="shift-mobile-list"><div style="padding: 20px; text-align: center; color: #94a3b8;">データがありません</div></div>`;
    html += mobileHtml;
  } else {
    // Generate headers for each employee
    filteredRows.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time';
      let statusHtml = getStatusLabel(emp.submission_status || 'UNSUBMITTED');
      let actionHtml = '';
      if (emp.submission_status === 'PENDING') {
        actionHtml = `<button class="btn-xs btn-ok btn-approve" data-id="${emp.id}">承認</button>`;
      }
      
      html += `
        <th class="emp-col">
          <div class="emp-col-inner">
            <div class="emp-name-row" title="${esc(emp.username)} ${emp.employee_code ? `(${esc(emp.employee_code)})` : ''}">
              <div class="emp-name">${esc(emp.username)}</div>
              ${emp.employee_code ? `<div class="emp-code">${esc(emp.employee_code)}</div>` : ''}
              <div class="emp-type"><span class="${isSeishain ? 'badge-sei' : 'badge-bai'}">${isSeishain ? '正' : 'パート'}</span></div>
            </div>
            <div class="emp-info-row">
              <div class="emp-total">計: <span style="font-weight:normal; color:#0284c7;">${emp._workCount}</span></div>
              <div class="emp-status">${statusHtml}</div>
              ${actionHtml ? `<div class="emp-action">${actionHtml}</div>` : ''}
            </div>
          </div>
        </th>
      `;
    });
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;

    // Generate rows for each day
    for (let d = 1; d <= daysInMonth; d++) {
      html += `<tr>`;
      html += `<td class="col-fixed-1" style="${getDayColor(d)} font-size: 10px; letter-spacing: -0.5px;">${monthNum}月${d}日</td>`;
      html += `<td class="col-fixed-2" style="${getDayColor(d)}">${getDayStr(d)}</td>`;
      
      filteredRows.forEach(emp => {
        const isSeishain = emp.employment_type === 'full_time';
        const schedule = emp.schedule || {};
        const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = schedule[dateKey];
        let cellContent = '<div class="cell-empty">-</div>';
        
        if (dayData) {
          switch(dayData.status) {
            case 'WORKING': cellContent = `<div class="cell-work">出</div>`; break;
            case 'CA_NGAY': cellContent = `<div class="cell-day">日</div>`; break;
            case 'CA_CHIEU': cellContent = `<div class="cell-afternoon">午</div>`; break;
            case 'CA_DEM': cellContent = `<div class="cell-night">夜</div>`; break;
            case '09:00-14:00': cellContent = `<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><br><span>-14:00</span></div>`; break;
            case 'LEAVE': {
              const leaveTypeMap = { paid: '有休', unpaid: '欠', special: '特休' };
              const lTxt = leaveTypeMap[dayData.leaveType] || '休';
              const leaveTypeLabel = { paid: '有給休暇', unpaid: '欠勤 / 無給休暇', special: '特別休暇' }[dayData.leaveType] || '';
              const isSystemHoliday = !dayData.leaveType;
              const reasonText = dayData.reason || dayData.detail || '';
              const modalContent = [leaveTypeLabel, reasonText].filter(Boolean).join('\n') || '理由なし';
              const cellClass = dayData.leaveType === 'paid' ? 'cell-leave-paid'
                : dayData.leaveType === 'special' ? 'cell-leave-special'
                : 'cell-leave';
              if (isSystemHoliday) {
                cellContent = `<div class="${cellClass}" title="休日">${lTxt}</div>`;
              } else {
                cellContent = `<div class="${cellClass} clickable-leave" style="cursor:pointer;" data-leave-label="${esc(leaveTypeLabel)}" data-reason="${esc(reasonText)}" title="${esc(modalContent)}">${lTxt}</div>`;
              }
              break;
            }
            case 'OFF': cellContent = `<div class="cell-off">休</div>`; break;
          }
        } else if (!isSeishain) {
          cellContent = `<div class="cell-off">休</div>`;
        }
        
        html += `<td>${cellContent}</td>`;
      });
      html += `</tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
    
    // Build Mobile HTML
    let mobileHtml = `<div class="shift-mobile-list">`;
    filteredRows.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time';
      const schedule = emp.schedule || {};
      
      let mobileDaysHtml = '';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = schedule[dateKey];
        let cellContent = '<div class="cell-empty">-</div>';
        if (dayData) {
          switch(dayData.status) {
            case 'WORKING': cellContent = `<div class="cell-work">出</div>`; break;
            case 'CA_NGAY': cellContent = `<div class="cell-day">日</div>`; break;
            case 'CA_CHIEU': cellContent = `<div class="cell-afternoon">午</div>`; break;
            case 'CA_DEM': cellContent = `<div class="cell-night">夜</div>`; break;
            case '09:00-14:00': cellContent = `<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><br><span>-14:00</span></div>`; break;
            case 'LEAVE': {
              const leaveTypeMap = { paid: '有休', unpaid: '欠', special: '特休' };
              const lTxt = leaveTypeMap[dayData.leaveType] || '休';
              const leaveTypeLabel = { paid: '有給休暇', unpaid: '欠勤 / 無給休暇', special: '特別休暇' }[dayData.leaveType] || '';
              const reasonText = dayData.reason || dayData.detail || '';
              const cellClass = dayData.leaveType === 'paid' ? 'cell-leave-paid'
                : dayData.leaveType === 'special' ? 'cell-leave-special'
                : 'cell-leave';
              if (!dayData.leaveType) cellContent = `<div class="${cellClass}">${lTxt}</div>`;
              else cellContent = `<div class="${cellClass} clickable-leave" style="cursor:pointer;" data-leave-label="${esc(leaveTypeLabel)}" data-reason="${esc(reasonText)}">${lTxt}</div>`;
              break;
            }
            case 'OFF': cellContent = `<div class="cell-off">休</div>`; break;
          }
        } else if (!isSeishain) {
          cellContent = `<div class="cell-off">休</div>`;
        }
        
        const mobileDayColor = getDayColor(d);
        mobileDaysHtml += `
          <div class="sac-day-item">
            <div class="sac-day-header" style="${mobileDayColor}">${d}</div>
            <div class="sac-day-val">${cellContent}</div>
          </div>
        `;
      }
      
      let mobileActionHtml = '';
      if (emp.submission_status === 'PENDING') {
        mobileActionHtml = `<button class="btn-xs btn-ok btn-approve" data-id="${emp.id}" style="width:100%; padding:8px 0; font-size:13px; border-radius: 6px;">承認する</button>`;
      } else {
        mobileActionHtml = getStatusLabel(emp.submission_status || 'UNSUBMITTED');
      }
      
      mobileHtml += `
        <div class="sac-card">
          <div class="sac-header">
            <div class="sac-name-wrap">
              <span class="sac-name">${esc(emp.username)}</span>
              <span class="${isSeishain ? 'badge-sei' : 'badge-bai'}">${isSeishain ? '正' : 'パート'}</span>
            </div>
            <div class="sac-status">${mobileActionHtml}</div>
          </div>
          <div class="sac-summary">
            <span class="sac-total-label">月計 (出勤日数):</span>
            <span class="sac-total-val" style="font-weight:700; color:#0f172a;">${emp._workCount}日</span>
          </div>
          <div class="sac-days-scroll">
            ${mobileDaysHtml}
          </div>
        </div>
      `;
    });
    mobileHtml += `</div>`;
    html += mobileHtml;
  }
  
  html += `
    </div>
    <!-- Custom Modal HTML -->
     <div id="reasonModal" class="reason-modal-overlay">
       <div class="reason-modal-content">
         <div id="reasonModalHeader" class="reason-modal-header">休みの理由</div>
         <div id="reasonModalText" class="reason-modal-body"></div>
         <div class="reason-modal-footer">
           <button id="closeReasonModalBtn" class="reason-modal-btn">閉じる</button>
         </div>
       </div>
     </div>
  `;

  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  let selStart = 0, selEnd = 0;
  if (activeId === 'empSearch') {
    selStart = activeEl.selectionStart;
    selEnd = activeEl.selectionEnd;
  }

  localHost.innerHTML = html;

  if (activeId === 'empSearch') {
    const newEl = localHost.querySelector('#empSearch');
    if (newEl) {
      newEl.focus();
      try { newEl.setSelectionRange(selStart, selEnd); } catch(e){}
    }
  }

  // Add event listeners
  const empSearch = localHost.querySelector('#empSearch');
  if (empSearch) {
    empSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTable();
    });
  }

  const statusFilterEl = localHost.querySelector('#statusFilter');
  if (statusFilterEl) {
    statusFilterEl.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      renderTable();
    });
  }

  const monthFilter = localHost.querySelector('#monthFilter');
  if (monthFilter) {
    monthFilter.addEventListener('change', () => {
      currentMonth = monthFilter.value;
      renderList();
    });
  }

  // Handle Mobile Header Date Picker
  const mobileActions = document.getElementById('attHubMobileActions');
  if (window.innerWidth <= 768 && mobileActions) {
    let mobileMonth = document.getElementById('monthFilterMobile');
    if (!mobileMonth) {
      mobileMonth = document.createElement('input');
      mobileMonth.type = 'month';
      mobileMonth.id = 'monthFilterMobile';
      mobileMonth.style.cssText = 'height: 32px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 130px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;';
      mobileActions.innerHTML = '';
      mobileActions.appendChild(mobileMonth);
      mobileMonth.addEventListener('change', (e) => {
        currentMonth = e.target.value;
        renderList();
      });
    }
    mobileMonth.value = currentMonth;
  } else if (mobileActions) {
    mobileActions.innerHTML = '';
  }

  // Modal logic
  const modal = localHost.querySelector('#reasonModal');
  const modalText = localHost.querySelector('#reasonModalText');
  const closeBtn = localHost.querySelector('#closeReasonModalBtn');
  
  const closeModal = () => {
    if (modal) modal.classList.remove('show');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  localHost.querySelectorAll('.clickable-leave').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const leaveLabel = target.getAttribute('data-leave-label') || '';
      const reason = target.getAttribute('data-reason') || '';
      const modalHeader = localHost.querySelector('#reasonModalHeader');
      if (modalHeader) {
        modalHeader.textContent = leaveLabel || '休みの理由';
      }
      if (modalText && modal) {
        if (reason) {
          modalText.textContent = reason;
        } else {
          modalText.innerHTML = '<span style="color:#94a3b8;">理由の記載なし</span>';
        }
        modal.classList.add('show');
      }
    });
  });

  localHost.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.target.getAttribute('data-id');
      if (confirm('このシフトを承認しますか？')) updateStatus(userId, 'APPROVED');
    });
  });

  localHost.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.target.getAttribute('data-id');
      if (confirm('このシフトを差戻しますか？')) updateStatus(userId, 'REJECTED');
    });
  });
}

async function updateStatus(userId, status) {
  try {
    const res = await fetchJSONAuth('/api/attendance/shifts/submissions/approve', {
      method: 'POST',
      body: JSON.stringify({ userId, month: currentMonth, status })
    });
    if (res.success) {
      renderList();
    } else {
      alert('エラー: ' + (res.message || 'Unknown error'));
    }
  } catch (e) {
    alert('エラー: ' + e.message);
  }
}

