import { fetchJSONAuth } from '../../api/http.api.js';

let currentMonth = '';
let allRows = [];
let localHost = null;

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
    case 'PENDING': return '<span style="color:#ea580c;font-weight:bold;font-size:10px;">未承認</span>';
    case 'APPROVED': return '<span style="color:#16a34a;font-weight:bold;font-size:10px;">承認済</span>';
    case 'REJECTED': return '<span style="color:#dc2626;font-weight:bold;font-size:10px;">差戻し</span>';
    case 'UNSUBMITTED': return '<span style="color:#94a3b8;font-size:10px;">未提出</span>';
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

  const styles = `
    /* Force absolute full width for the parent elements */
    #adminContent {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
    
    .admin-main {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      overflow-x: hidden !important;
    }
    
    body, html {
      margin: 0 !important;
      padding: 0 !important;
      overflow: auto !important; /* Restore normal scrolling */
      width: 100% !important;
      height: 100% !important;
    }

    /* Reset portal/admin layout overrides */
    .portal-main, .portal-layout, .admin-layout {
      padding: 0 !important;
      margin: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }

    .shift-container {
      padding: 0 !important;
      margin: 0 !important;
      font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
      background: #FFFFFF;
      min-height: ${vhExpr};
      height: ${vhExpr};
      display: flex;
      flex-direction: column;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box;
    }
    
    .page-header-container {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 0px;
      padding: 16px 24px 8px 24px;
      flex-shrink: 0;
    }
    
    .page-header-title {
      display: none;
    }

    .shift-table-wrapper {
      flex: 1;
      overflow-y: auto; /* Enable vertical scrolling */
      overflow-x: auto; /* Enable horizontal scrolling if needed */
      border-top: none;
      border-bottom: none;
      box-shadow: none;
      background: white;
      margin: 0 !important;
      padding: 0 24px 24px 24px !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box;
      max-height: ${tableVhExpr}; /* Fallback */
    }
    
    .shift-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1200px;
      font-size: 13px;
    }
    .shift-table th, .shift-table td {
      border: 1px solid #cbd5e1;
      text-align: center;
      padding: 0;
      height: 30px;
      position: relative;
    }
    .shift-table th {
      background: #e6f2ff;
      color: #0f172a;
      font-weight: 600;
      padding: 4px;
    }
    .shift-table .sticky-col-1 {
      position: sticky;
      left: 0;
      background: #e6f2ff;
      z-index: 10;
      text-align: left;
      padding: 0 8px;
    }
    .shift-table .sticky-col-2 {
      position: sticky;
      left: 120px;
      background: #e6f2ff;
      z-index: 10;
    }
    .shift-table .sticky-col-3 {
      position: sticky;
      left: 170px;
      background: #e6f2ff;
      z-index: 10;
    }
    .shift-table tbody .sticky-col-1,
    .shift-table tbody .sticky-col-2,
    .shift-table tbody .sticky-col-3 {
      background: #fff;
    }
    .shift-table tbody tr:hover td.sticky-col-1,
    .shift-table tbody tr:hover td.sticky-col-2,
    .shift-table tbody tr:hover td.sticky-col-3 {
      background: #f8fafc;
    }

    /* Style the table scrollbar to look neat and clean */
    .shift-table-wrapper::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .shift-table-wrapper::-webkit-scrollbar-track {
      background: #f1f5f9; 
    }
    .shift-table-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1; 
      border-radius: 4px;
    }
    .shift-table-wrapper::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; 
    }
    .sap-dense-table {
      border-collapse: collapse;
      table-layout: auto;
      font-family: 'Segoe UI', 'Meiryo', sans-serif;
      font-size: 12px;
      width: 100% !important;
      margin: 0 !important;
    }
    .sap-dense-table th, .sap-dense-table td {
      border: 1px solid #cbd5e1;
      padding: 0;
      text-align: center;
      vertical-align: middle;
      height: 32px;
      box-sizing: border-box;
      color: #1e293b;
    }
    .sap-dense-table th {
      background: #e6f2ff; /* Consistent blue header */
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
      color: #0f172a;
    }
    .col-fixed-1 { position: sticky; left: 0; z-index: 11; background: #e6f2ff; min-width: 120px; max-width: 150px; text-align: left !important; padding-left: 4px !important; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .col-fixed-2 { position: sticky; left: 120px; z-index: 11; background: #e6f2ff; min-width: 52px; max-width: 52px; white-space: nowrap; }
    .col-fixed-3 { position: sticky; left: 172px; z-index: 11; background: #e6f2ff; min-width: 44px; max-width: 44px; font-weight: bold; color: #0284c7; border-right: 2px solid #cbd5e1 !important; white-space: nowrap; }
    
    .sap-dense-table th.col-fixed-1, .sap-dense-table th.col-fixed-2, .sap-dense-table th.col-fixed-3 {
      z-index: 12;
      background: #e6f2ff; 
    }
    .sap-dense-table tbody .col-fixed-1, .sap-dense-table tbody .col-fixed-2, .sap-dense-table tbody .col-fixed-3 {
      background: #fff;
    }
    .sap-dense-table tbody tr:hover .col-fixed-1, .sap-dense-table tbody tr:hover .col-fixed-2, .sap-dense-table tbody tr:hover .col-fixed-3 {
      background: #f8fafc;
    }
    
    .col-action {
      position: sticky;
      right: 0;
      z-index: 11;
      background: #f1f5f9;
      min-width: 60px;
      max-width: 60px;
      border-left: 2px solid #94a3b8 !important;
      white-space: normal; /* Allow wrapping */
      line-height: 1.1;
      font-size: 10px;
    }
    .sap-dense-table th.col-action {
      z-index: 20;
      background: #e2e8f0;
    }

    .sap-dense-table tbody tr:hover td {
      background: #f1f5f9;
    }
    
    .day-col {
      min-width: 19px;
      font-size: 10px;
    }
    
    /* Cell styles */
    .cell-work { background: #eff6ff; color: #1e40af; font-weight: bold; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-day { background: #eff6ff; color: #1e40af; font-weight: bold; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-afternoon { background: #eff6ff; color: #1e40af; font-weight: bold; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-night { background: #eff6ff; color: #1e40af; font-weight: bold; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-leave { background: #fff1f1; color: #dc2626; font-weight: bold; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-off { background: #fff1f1; color: #dc2626; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .cell-empty { color: #cbd5e1; }

    .badge-sei { background: #eff6ff; color: #1e40af; padding: 2px 4px; border-radius: 2px; font-size: 10px; border: 1px solid #bfdbfe; }
    .badge-bai { background: #dcfce7; color: #166534; padding: 2px 4px; border-radius: 2px; font-size: 10px; border: 1px solid #bbf7d0; }
    
    .btn-xs {
      padding: 4px 6px;
      font-size: 11px;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      color: white;
      font-weight: bold;
      white-space: nowrap;
    }
    .btn-ok { background: #16a34a; }
    .btn-ok:hover { background: #15803d; }
    .btn-ng { background: #dc2626; }
    .btn-ng:hover { background: #b91c1c; }
    
    /* Custom Modal Styles */
    .reason-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s;
    }
    .reason-modal-overlay.show {
      opacity: 1;
      visibility: visible;
    }
    .reason-modal-content {
      background: white;
      padding: 24px;
      border-radius: 8px;
      width: 320px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      transform: translateY(-20px);
      transition: transform 0.2s;
    }
    .reason-modal-overlay.show .reason-modal-content {
      transform: translateY(0);
    }
    .reason-modal-header {
      font-weight: bold;
      font-size: 16px;
      color: #1e293b;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .reason-modal-body {
      font-size: 14px;
      color: #475569;
      margin-bottom: 20px;
      line-height: 1.5;
      min-height: 40px;
    }
    .reason-modal-footer {
      display: flex;
      justify-content: flex-end;
    }
    .reason-modal-btn {
      background: #0ea5e9;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s;
    }
    .reason-modal-btn:hover {
      background: #0284c7;
    }
  `;

  const getDayColor = (d) => {
    const date = new Date(year, monthNum - 1, d);
    const day = date.getDay();
    if (day === 0) return 'color: #dc2626;'; // Sunday
    if (day === 6) return 'color: #2563eb;'; // Saturday
    return '';
  };

  let html = `
    <style>${styles}</style>
    <div class="shift-container" style="width:100% !important; margin:0 !important; padding:0 !important;">
      <div class="page-header-container" style="padding-right: 8px;">
        <h2 class="page-header-title">\u30b7\u30d5\u30c8\u627f\u8a8d</h2>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="month" id="monthFilter" value="${currentMonth}" 
            style="height: 38px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 160px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;" />
        </div>
      </div>
      <div class="shift-table-wrapper" style="width:100% !important; margin:0 !important; padding:0 !important;">
        <table class="sap-dense-table" style="width:100% !important; margin:0 !important;">
          <thead>
            <tr>
              <th class="col-fixed-1">氏名</th>
              <th class="col-fixed-2">形態</th>
              <th class="col-fixed-3">月計</th>
  `;

  for (let d = 1; d <= daysInMonth; d++) {
    html += `<th class="day-col" style="${getDayColor(d)}">${d}</th>`;
  }

  html += `
              <th class="col-action">状態/<br>ｱｸｼｮﾝ</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (allRows.length === 0) {
    html += `<tr><td colspan="${daysInMonth + 5}" style="padding: 20px; color: #94a3b8;">データがありません</td></tr>`;
  } else {
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

      html += `
        <tr>
          <td class="col-fixed-1">${esc(emp.username)}</td>
          <td class="col-fixed-2"><span class="${isSeishain ? 'badge-sei' : 'badge-bai'}">${isSeishain ? '正' : 'パート'}</span></td>
          <td class="col-fixed-3">${workCount}</td>
      `;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = schedule[dateKey];
        let cellContent = '<div class="cell-empty">-</div>';
        
        if (dayData) {
          const title = (dayData.reason || dayData.detail) ? ` title="理由: ${esc(dayData.reason)}"` : '';
          switch(dayData.status) {
            case 'WORKING': cellContent = `<div class="cell-work">出</div>`; break;
            case 'CA_NGAY': cellContent = `<div class="cell-day">日</div>`; break;
            case 'CA_CHIEU': cellContent = `<div class="cell-afternoon">午</div>`; break;
            case 'CA_DEM': cellContent = `<div class="cell-night">夜</div>`; break;
            case '09:00-14:00': cellContent = `<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><span>-14:00</span></div>`; break;
            case 'LEAVE': 
              const lTxt = dayData.leaveType === 'unpaid' ? '欠' : '休';
              // Check if leaveType is missing (system default holiday) or if it's a valid requested leave
              const isSystemHoliday = !dayData.leaveType;
              const reasonText = dayData.reason || dayData.detail || '理由なし';
              
              if (isSystemHoliday) {
                cellContent = `<div class="cell-leave" style="background: #fef2f2; color: #dc2626;" title="休日">${lTxt}</div>`; 
              } else {
                cellContent = `<div class="cell-leave clickable-leave" style="cursor:pointer;" data-reason="${esc(reasonText)}" title="${esc(reasonText)}">${lTxt}</div>`; 
              }
              break;
            case 'OFF': cellContent = `<div class="cell-off">休</div>`; break;
          }
        } else if (!isSeishain) {
          cellContent = `<div class="cell-off">休</div>`;
        }

        html += `<td class="day-col">${cellContent}</td>`;
      }

      let actionHtml = '-';
      if (emp.submission_status === 'PENDING') {
        actionHtml = `
          <div style="display:flex; justify-content:center; align-items:center;">
            <button class="btn-xs btn-ok btn-approve" data-id="${emp.id}" style="width:100%; padding:4px 0; font-size:10px;">承認</button>
          </div>
        `;
      } else {
        actionHtml = getStatusLabel(emp.submission_status || 'UNSUBMITTED');
      }

      html += `<td class="col-action" style="white-space:nowrap;">${actionHtml}</td></tr>`;
    });
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Custom Modal HTML -->
     <div id="reasonModal" class="reason-modal-overlay">
       <div class="reason-modal-content">
         <div class="reason-modal-header">休みの理由</div>
         <div id="reasonModalText" class="reason-modal-body"></div>
         <div class="reason-modal-footer">
           <button id="closeReasonModalBtn" class="reason-modal-btn">閉じる</button>
         </div>
       </div>
     </div>
  `;

  localHost.innerHTML = html;

  // Add event listeners
  const monthFilter = localHost.querySelector('#monthFilter');
  if (monthFilter) {
    monthFilter.addEventListener('change', () => {
      currentMonth = monthFilter.value;
      renderList();
    });
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
      if (modalText && modal) {
        modalText.textContent = e.target.getAttribute('data-reason') || '理由なし';
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

