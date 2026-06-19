const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin-shifts-approvals.page.js');
let code = fs.readFileSync(filePath, 'utf8');

const startMarker = 'function renderTable() {';
const endMarker = 'localHost.innerHTML = html;';

const newCode = `function renderTable() {
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
      const dateKey = \`\${year}-\${String(monthNum).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
      const dayData = schedule[dateKey];
      if (dayData && ['WORKING', 'CA_NGAY', 'CA_CHIEU', 'CA_DEM', '09:00-14:00'].includes(dayData.status)) {
        workCount++;
      }
    }
    emp._workCount = workCount;
  });

  const styles = \`
    /* Force absolute full width for the parent elements */
    #adminContent { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .admin-main { padding: 0 !important; margin: 0 !important; width: 100% !important; overflow-x: hidden !important; }
    body, html { margin: 0 !important; padding: 0 !important; overflow: auto !important; width: 100% !important; height: 100% !important; }
    .portal-main, .portal-layout, .admin-layout { padding: 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; }

    .shift-container { padding: 0 !important; margin: 0 !important; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background: #FFFFFF; min-height: \${vhExpr}; height: \${vhExpr}; display: flex; flex-direction: column; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
    .page-header-container { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 0px; padding: 16px 24px 8px 24px; flex-shrink: 0; }
    .page-header-title { display: none; }
    @media (max-width: 768px) { .page-header-container { display: none !important; } .page-header-title { display: none !important; } }

    .shift-table-wrapper { flex: 1; overflow-y: auto; overflow-x: auto; border-top: none; border-bottom: none; box-shadow: none; background: white; margin: 0 !important; padding: 0 24px 24px 24px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; max-height: \${tableVhExpr}; }
    .shift-table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    .shift-table-wrapper::-webkit-scrollbar-track { background: #f1f5f9; }
    .shift-table-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .shift-table-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .sap-dense-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-family: 'Segoe UI', 'Meiryo', sans-serif; font-size: 12px; margin: 0 !important; }
    .sap-dense-table th, .sap-dense-table td { border: 1px solid #cbd5e1; border-top: none; border-left: none; padding: 0; text-align: center; vertical-align: middle; height: 32px; box-sizing: border-box; color: #1e293b; }
    /* Fix top/left borders because of border-collapse: separate */
    .sap-dense-table th { border-top: 1px solid #cbd5e1; }
    .sap-dense-table tr th:first-child, .sap-dense-table tr td:first-child { border-left: 1px solid #cbd5e1; }

    .sap-dense-table thead th { position: sticky; top: 0; z-index: 10; background: #e6f2ff; vertical-align: top; }
    
    .col-fixed-1 { position: sticky; left: 0; z-index: 11; background: #e6f2ff; min-width: 40px; max-width: 40px; }
    .col-fixed-2 { position: sticky; left: 40px; z-index: 11; background: #e6f2ff; min-width: 40px; max-width: 40px; border-right: 2px solid #94a3b8 !important; }
    .sap-dense-table thead th.col-fixed-1, .sap-dense-table thead th.col-fixed-2 { z-index: 12; vertical-align: middle; }
    
    .sap-dense-table tbody .col-fixed-1, .sap-dense-table tbody .col-fixed-2 { background: #f8fafc; font-weight: 600; }
    .sap-dense-table tbody tr:hover td { background: #f1f5f9; }
    .sap-dense-table tbody tr:hover .col-fixed-1, .sap-dense-table tbody tr:hover .col-fixed-2 { background: #e2e8f0; }

    .emp-col { min-width: 86px; max-width: 90px; padding: 8px 4px !important; }
    .emp-col-inner { display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; }
    .emp-name { font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .emp-type { }
    .emp-total { font-size: 11px; }
    .emp-status { }
    .emp-action { margin-top: 2px; }

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
    
    .btn-xs { padding: 4px 6px; font-size: 11px; border: none; border-radius: 2px; cursor: pointer; color: white; font-weight: bold; white-space: nowrap; }
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
    .shift-mobile-list { display: none; flex-direction: column; gap: 12px; padding: 16px; padding-bottom: 32px; background: #f1f5f9; overflow-y: auto; max-height: \${tableVhExpr}; }
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
  \`;

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

  let html = \`
    <style>\${styles}</style>
    <div class="shift-container">
      <div class="page-header-container" style="padding-right: 8px;">
        <h2 class="page-header-title">\\u30b7\\u30d5\\u30c8\\u627f\\u8a8d</h2>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="month" id="monthFilter" value="\${currentMonth}" style="height: 38px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 160px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;" />
        </div>
      </div>
      <div class="shift-table-wrapper">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th class="col-fixed-1">日付</th>
              <th class="col-fixed-2">曜日</th>
  \`;

  if (allRows.length === 0) {
    html += \`</tr></thead><tbody><tr><td colspan="2" style="padding: 20px; color: #94a3b8;">データがありません</td></tr></tbody></table></div>\`;
    let mobileHtml = \`<div class="shift-mobile-list"><div style="padding: 20px; text-align: center; color: #94a3b8;">データがありません</div></div>\`;
    html += mobileHtml;
  } else {
    // Generate headers for each employee
    allRows.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time';
      let actionHtml = '-';
      if (emp.submission_status === 'PENDING') {
        actionHtml = \`<button class="btn-xs btn-ok btn-approve" data-id="\${emp.id}" style="width:100%;">承認</button>\`;
      } else {
        actionHtml = getStatusLabel(emp.submission_status || 'UNSUBMITTED');
      }
      
      html += \`
        <th class="emp-col">
          <div class="emp-col-inner">
            <div class="emp-name" title="\${esc(emp.username)}">\${esc(emp.username)}</div>
            <div class="emp-type"><span class="\${isSeishain ? 'badge-sei' : 'badge-bai'}">\${isSeishain ? '正' : 'パート'}</span></div>
            <div class="emp-total">月計: <span style="font-weight:bold; color:#0284c7;">\${emp._workCount}</span></div>
            <div class="emp-status">\${getStatusLabel(emp.submission_status || 'UNSUBMITTED')}</div>
            <div class="emp-action">\${actionHtml}</div>
          </div>
        </th>
      \`;
    });
    
    html += \`
            </tr>
          </thead>
          <tbody>
    \`;

    // Generate rows for each day
    for (let d = 1; d <= daysInMonth; d++) {
      html += \`<tr>\`;
      html += \`<td class="col-fixed-1" style="\${getDayColor(d)}">\${d}</td>\`;
      html += \`<td class="col-fixed-2" style="\${getDayColor(d)}">\${getDayStr(d)}</td>\`;
      
      allRows.forEach(emp => {
        const isSeishain = emp.employment_type === 'full_time';
        const schedule = emp.schedule || {};
        const dateKey = \`\${year}-\${String(monthNum).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
        const dayData = schedule[dateKey];
        let cellContent = '<div class="cell-empty">-</div>';
        
        if (dayData) {
          switch(dayData.status) {
            case 'WORKING': cellContent = \`<div class="cell-work">出</div>\`; break;
            case 'CA_NGAY': cellContent = \`<div class="cell-day">日</div>\`; break;
            case 'CA_CHIEU': cellContent = \`<div class="cell-afternoon">午</div>\`; break;
            case 'CA_DEM': cellContent = \`<div class="cell-night">夜</div>\`; break;
            case '09:00-14:00': cellContent = \`<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><span>-14:00</span></div>\`; break;
            case 'LEAVE': 
              const lTxt = dayData.leaveType === 'unpaid' ? '欠' : '休';
              const isSystemHoliday = !dayData.leaveType;
              const reasonText = dayData.reason || dayData.detail || '理由なし';
              if (isSystemHoliday) {
                cellContent = \`<div class="cell-leave" style="background: #fef2f2; color: #dc2626;" title="休日">\${lTxt}</div>\`; 
              } else {
                cellContent = \`<div class="cell-leave clickable-leave" style="cursor:pointer;" data-reason="\${esc(reasonText)}" title="\${esc(reasonText)}">\${lTxt}</div>\`; 
              }
              break;
            case 'OFF': cellContent = \`<div class="cell-off">休</div>\`; break;
          }
        } else if (!isSeishain) {
          cellContent = \`<div class="cell-off">休</div>\`;
        }
        
        html += \`<td>\${cellContent}</td>\`;
      });
      html += \`</tr>\`;
    }

    html += \`
          </tbody>
        </table>
      </div>
    \`;
    
    // Build Mobile HTML
    let mobileHtml = \`<div class="shift-mobile-list">\`;
    allRows.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time';
      const schedule = emp.schedule || {};
      
      let mobileDaysHtml = '';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = \`\${year}-\${String(monthNum).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
        const dayData = schedule[dateKey];
        let cellContent = '<div class="cell-empty">-</div>';
        if (dayData) {
          switch(dayData.status) {
            case 'WORKING': cellContent = \`<div class="cell-work">出</div>\`; break;
            case 'CA_NGAY': cellContent = \`<div class="cell-day">日</div>\`; break;
            case 'CA_CHIEU': cellContent = \`<div class="cell-afternoon">午</div>\`; break;
            case 'CA_DEM': cellContent = \`<div class="cell-night">夜</div>\`; break;
            case '09:00-14:00': cellContent = \`<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><span>-14:00</span></div>\`; break;
            case 'LEAVE': 
              const lTxt = dayData.leaveType === 'unpaid' ? '欠' : '休';
              if (!dayData.leaveType) cellContent = \`<div class="cell-leave" style="background: #fef2f2; color: #dc2626;">\${lTxt}</div>\`; 
              else cellContent = \`<div class="cell-leave clickable-leave" style="cursor:pointer;" data-reason="\${esc(dayData.reason || dayData.detail || '理由なし')}">\${lTxt}</div>\`; 
              break;
            case 'OFF': cellContent = \`<div class="cell-off">休</div>\`; break;
          }
        } else if (!isSeishain) {
          cellContent = \`<div class="cell-off">休</div>\`;
        }
        
        const mobileDayColor = getDayColor(d);
        mobileDaysHtml += \`
          <div class="sac-day-item">
            <div class="sac-day-header" style="\${mobileDayColor}">\${d}</div>
            <div class="sac-day-val">\${cellContent}</div>
          </div>
        \`;
      }
      
      let mobileActionHtml = '';
      if (emp.submission_status === 'PENDING') {
        mobileActionHtml = \`<button class="btn-xs btn-ok btn-approve" data-id="\${emp.id}" style="width:100%; padding:8px 0; font-size:13px; border-radius: 6px;">承認する</button>\`;
      } else {
        mobileActionHtml = getStatusLabel(emp.submission_status || 'UNSUBMITTED');
      }
      
      mobileHtml += \`
        <div class="sac-card">
          <div class="sac-header">
            <div class="sac-name-wrap">
              <span class="sac-name">\${esc(emp.username)}</span>
              <span class="\${isSeishain ? 'badge-sei' : 'badge-bai'}">\${isSeishain ? '正' : 'パート'}</span>
            </div>
            <div class="sac-status">\${mobileActionHtml}</div>
          </div>
          <div class="sac-summary">
            <span class="sac-total-label">月計 (出勤日数):</span>
            <span class="sac-total-val" style="font-weight:700; color:#0f172a;">\${emp._workCount}日</span>
          </div>
          <div class="sac-days-scroll">
            \${mobileDaysHtml}
          </div>
        </div>
      \`;
    });
    mobileHtml += \`</div>\`;
    html += mobileHtml;
  }
  
  html += \`
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
  \`;

  localHost.innerHTML = html;
`;

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const finalCode = code.substring(0, startIndex) + newCode + '\n  ' + code.substring(endIndex);
  fs.writeFileSync(filePath, finalCode, 'utf8');
  console.log('Successfully updated the file.');
} else {
  console.log('Could not find markers', startIndex, endIndex);
}
