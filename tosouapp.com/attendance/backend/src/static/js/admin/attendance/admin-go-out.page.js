import { fetchJSONAuth } from '../../api/http.api.js';
// Cái chỗ này dùng để render table 外出管理
export async function mountGoOut({ content }) {
  content.innerHTML = `
    <style>
      .go-out-table { width: 100%; border-collapse: collapse; min-width: 900px; margin: 0; }
      @media (max-width: 768px) {
        .go-out-table-wrapper { border: none !important; box-shadow: none !important; background: transparent !important; max-height: none !important; overflow: visible !important; }
        .go-out-table { min-width: 100%; }
        .go-out-table thead { display: none; }
        .go-out-table tbody { display: block; background: transparent !important; }
        .go-out-table tr {
          display: block;
          background: white !important;
          margin-bottom: 12px;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          transition: none !important;
        }
        .go-out-table td {
          display: block;
          padding: 0 !important;
          border: none !important;
          text-align: left !important;
        }
        .td-date-status { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px; font-weight: bold; color: #334155; }
        .td-employee { font-weight: bold; font-size: 15px; margin-bottom: 12px; color: #1e293b; }
        .td-time { display: flex; gap: 8px; color: #475569; font-family: monospace; font-size: 14px; margin-bottom: 4px; }
        .td-time-label { width: 40px; display: inline-block; color: #64748b; font-family: sans-serif; font-size: 13px; }
        .td-type-reason { display: flex; gap: 8px; margin-bottom: 4px; align-items: flex-start; font-size: 13px; color: #475569; }
        .td-type-label { width: 40px; display: inline-block; color: #64748b; }
        .td-actions { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: right; }
        
        .desktop-cell { display: none !important; }
        .mobile-cell { display: block !important; }
        
        /* Hide all pagination controls on mobile */
        .pagination-container {
          display: none !important;
        }
        
        /* Mobile Header Adjustments */
        .page-header-title {
          display: none !important; /* Hide "外出管理" on mobile */
        }
        .page-header-container {
          margin-top: 16px !important; /* Add space from top nav */
          justify-content: flex-end !important; /* Push date picker to right */
        }
        #goOutAdminFilterMonth {
          width: 140px !important; /* Make date picker smaller */
          height: 32px !important; /* Make it slightly thinner */
          font-size: 13px !important;
        }
      }
      @media (min-width: 769px) {
        .mobile-cell { display: none !important; }
        .desktop-cell { display: table-cell; }
      }
      
      /* Hover effects replaced for CSP compliance */
      #goOutAdminFilterMonth:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
      .go-out-row:hover { background-color: #f1f5f9 !important; }
      .btn-force-end:hover { background-color: #fef2f2 !important; }
      .btn-edit:hover { background-color: #eff6ff !important; }
    </style>
    <div style="padding: 0; margin-top: -16px; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background: #e0f2fe; min-height: 100vh;">
      <div class="page-header-container" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 16px;">
        <h2 class="page-header-title" style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0;">外出管理</h2>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="month" id="goOutAdminFilterMonth" style="height: 38px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 160px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;">
        </div>
      </div>

      <!-- Table -->
      <div class="go-out-table-wrapper" style="overflow-x: auto; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee; max-height: 600px; overflow-y: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); background: white;">
        <table class="go-out-table">
          <thead style="position: sticky; top: 0; z-index: 10;">
            <tr style="background: #f8fafc; color: #334155; text-align: left; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; white-space: nowrap;">日付</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700;">氏名（社員名）</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: left;">外出時間</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: left;">戻り時間</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: left;">経過時間</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700;">区分</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; max-width: 150px;">理由</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700;">ステータス</th>
              <th style="padding: 10px 12px; font-size: 13px; font-weight: 700; text-align: center;">操作</th>
            </tr>
          </thead>
          <tbody id="goOutAdminTableBody" style="background: white;">
            <tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">読み込み中...</td></tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div class="pagination-container" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 13px; color: #475569; padding: 0 16px 16px 16px;">
        <div class="pagination-info">
          表示件数: 
          <select id="goOutAdminPageSize" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; margin-left: 4px; margin-right: 12px;">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="50">50</option>
          </select>
          <span id="goOutAdminItemCount">全 0 件</span>
        </div>
        <div class="pagination-actions" style="display: flex; gap: 8px; align-items: center;">
          <button id="goOutAdminPrevPage" style="padding: 4px 12px; border: 1px solid #cbd5e1; background: white; border-radius: 4px; cursor: pointer;" disabled>前へ</button>
          <span id="goOutAdminPageInfo">ページ 1 / 1</span>
          <button id="goOutAdminNextPage" style="padding: 4px 12px; border: 1px solid #cbd5e1; background: white; border-radius: 4px; cursor: pointer;" disabled>次へ</button>
        </div>
      </div>
    </div>
  `;
// Cấu trúc này là một bảng với các cột và hàng để hiển thị thông tin 
// ngày, giờ vào giờ ra
  const tbody = document.getElementById('goOutAdminTableBody');
  const monthInput = document.getElementById('goOutAdminFilterMonth');
  
  // Set default month to current month
  const today = new Date();
  monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  let allRecords = [];
  let currentPage = 1;
  
  const fmtTime = (dtStr) => {
    if (!dtStr) return '—';
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) return '—';
    return `${String(dt.getUTCHours() + 9).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
  };

  const diffMinutesAllowOvernight = (inHm, outHm) => {
    if (!inHm || !outHm || inHm === '—' || outHm === '—') return null;
    const parseHm = (hm) => {
      const [h, m] = hm.split(':').map(Number);
      return h * 60 + m;
    };
    const a = parseHm(inHm);
    const b = parseHm(outHm);
    if (a == null || b == null) return null;
    if (a === b) return 0;
    return b > a ? (b - a) : (b + 24 * 60 - a);
  };

  const fmtHm = (min) => {
    const m = Math.max(0, Number(min || 0));
    const h = Math.floor(m / 60);
    const mm = Math.floor(m % 60);
    return `${String(h)}:${String(mm).padStart(2, '0')}`;
  };

  const escapeHtml = (unsafe) => {
    return String(unsafe || '').replace(/[&<"'>]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  };

  const loadData = async () => {
    // Get month value (YYYY-MM)
    const monthVal = document.getElementById('goOutAdminFilterMonth').value;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">読み込み中...</td></tr>`;

    try {
      const qs = new URLSearchParams();
      // Only append if we have a valid YYYY-MM
      if (monthVal && /^\d{4}-\d{2}$/.test(monthVal)) {
        qs.append('month', monthVal);
      }

      const records = await fetchJSONAuth(`/api/attendance/go-out/admin-list?${qs.toString()}`);
      allRecords = records || [];
      currentPage = 1;
      renderTable();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #ef4444;">エラー: ${e.message}</td></tr>`;
    }
  };

  const renderTable = () => {
    // For mobile devices, show all records (ignore pagination)
    const isMobile = window.innerWidth <= 768;
    const pageSize = isMobile ? allRecords.length : parseInt(document.getElementById('goOutAdminPageSize').value, 10);
    const totalItems = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    if (currentPage > totalPages) currentPage = totalPages;
    
    document.getElementById('goOutAdminItemCount').textContent = `全 ${totalItems} 件`;
    document.getElementById('goOutAdminPageInfo').textContent = `ページ ${currentPage} / ${totalPages}`;
    
    document.getElementById('goOutAdminPrevPage').disabled = currentPage <= 1;
    document.getElementById('goOutAdminNextPage').disabled = currentPage >= totalPages;

    if (totalItems === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">データがありません</td></tr>`;
      return;
    }

    const startIdx = (currentPage - 1) * pageSize;
    const pageRecords = allRecords.slice(startIdx, startIdx + pageSize);

    let html = '';
    pageRecords.forEach((r, index) => {
      const goTime = fmtTime(r.go_out_time);
      const retTime = fmtTime(r.return_time);
      
      let duration = '—';
      if (goTime !== '—' && retTime !== '—') {
        const mins = diffMinutesAllowOvernight(goTime, retTime);
        if (mins != null) duration = fmtHm(mins);
      }

      const statusColor = r.status === '外出中' ? '#d97706' : (r.status === '修正済み' ? '#059669' : '#475569');
      const statusBg = r.status === '外出中' ? '#fef3c7' : (r.status === '修正済み' ? '#d1fae5' : '#f1f5f9');
      
      const typeColor = r.type === '業務' ? 'white' : 'white';
      const typeBg = r.type === '業務' ? '#3b82f6' : '#ef4444'; // Blue for 業務, Red for 私用
// hàm let actions để hiển thị các nút tác động cho mỗi dòng dữ liệu
      let actions = '';
      if (r.status === '外出中') {
        actions += `
          <button class="btn-force-end" data-id="${r.id}" data-date="${r.date}" data-gotime="${goTime}" style="background: white; color: #ef4444; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            強制終了
          </button>
        `;
      }
      // Hiển thị nút sửa khi trạng thái là 外出中
      actions += `
        <button class="btn-edit" data-id="${r.id}" data-json='${escapeHtml(JSON.stringify(r))}' style="background: white; color: #3b82f6; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.2s;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          編集
        </button>
      `;

      const rowBg = index % 2 === 0 ? 'white' : '#f8fafc';
      
      const fullReason = escapeHtml(r.reason || '');
      const shortReason = fullReason.length > 15 ? fullReason.substring(0, 15) + '...' : fullReason;
      
      const fullAdminNote = escapeHtml(r.admin_note || '');
      const shortAdminNote = fullAdminNote.length > 15 ? fullAdminNote.substring(0, 15) + '...' : fullAdminNote;

      html += `
        <tr class="go-out-row" style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;" data-bg="${rowBg}">
          <!-- Mobile View -->
          <td class="mobile-cell">
            <div class="td-date-status">
              <span>${escapeHtml(r.date)}</span>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${statusBg}; color: ${statusColor};">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></span>
                ${escapeHtml(r.status)}
              </span>
            </div>
            <div class="td-employee">${escapeHtml(r.employeeName)}</div>
            <div class="td-time" style="display: flex; align-items: stretch;">
              <span class="td-time-label" style="display: inline-flex; align-items: center; justify-content: center; width: 60px; min-height: 32px; background: #e0f2fe; color: #1e3a8a; font-weight: bold; font-size: 12px; border-radius: 4px; border: 1px solid #bae6fd; margin-right: 12px; flex-shrink: 0;">時間</span>
              <span style="display: inline-flex; align-items: center; min-height: 32px;">${goTime} 〜 ${retTime} (経過: ${duration})</span>
            </div>
            <div class="td-type-reason" style="margin-top: 8px; display: flex; align-items: stretch;">
              <span class="td-type-label" style="display: inline-flex; align-items: center; justify-content: center; width: 60px; min-height: 32px; background: #e0f2fe; color: #1e3a8a; font-weight: bold; font-size: 12px; border-radius: 4px; border: 1px solid #bae6fd; margin-right: 12px; flex-shrink: 0;">区分</span>
              <span style="display: inline-flex; align-items: center; min-height: 32px;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; background: ${typeBg}; color: ${typeColor};">${escapeHtml(r.type)}</span>
              </span>
            </div>
            <div class="td-type-reason" style="margin-top: 8px; display: flex; align-items: stretch;">
              <span class="td-type-label" style="display: inline-flex; align-items: center; justify-content: center; width: 60px; min-height: 48px; background: #e0f2fe; color: #1e3a8a; font-weight: bold; font-size: 12px; border-radius: 4px; border: 1px solid #bae6fd; margin-right: 12px; flex-shrink: 0;">理由</span>
              <span style="display: inline-flex; align-items: center; min-height: 48px; flex: 1;">
                <div>
                  <div style="line-height: 1.4;">${fullReason}</div>
                  ${r.admin_note ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.3;">(備考: ${fullAdminNote})</div>` : ''}
                </div>
              </span>
            </div>
            <div class="td-actions" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px;">
              ${actions}
            </div>
          </td>

          <!-- Desktop View -->
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 13px; color: #1e293b;">${escapeHtml(r.date)}</td>
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 13px; color: #1e293b; font-weight: 500;">${escapeHtml(r.employeeName)}</td>
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 13px; font-family: monospace; text-align: left;">${goTime}</td>
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 13px; font-family: monospace; text-align: left;">${retTime}</td>
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 13px; font-family: monospace; text-align: left; color: #64748b;">${duration}</td>
          <td class="desktop-cell" style="padding: 8px 12px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; background: ${typeBg}; color: ${typeColor};">${escapeHtml(r.type)}</span>
          </td>
          <td class="desktop-cell" style="padding: 8px 12px; font-size: 12px; color: #475569; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <div title="${fullReason}">${shortReason}</div>
            ${r.admin_note ? `<div title="${fullAdminNote}" style="font-size: 11px; color: #94a3b8; margin-top: 2px;">(備考: ${shortAdminNote})</div>` : ''}
          </td>
          <td class="desktop-cell" style="padding: 8px 12px;">
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: ${statusBg}; color: ${statusColor};">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></span>
              ${escapeHtml(r.status)}
            </span>
          </td>
          <td class="desktop-cell" style="padding: 8px 12px; white-space: nowrap; text-align: center;">${actions}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

    // Attach events
    document.querySelectorAll('.btn-force-end').forEach(btn => {
      btn.addEventListener('click', handleForceEnd);
    });
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', handleEdit);
    });
  };

  const handleForceEnd = async (e) => {
    const btn = e.target.closest('.btn-force-end');
    if (!btn) return;
    const id = btn.dataset.id;
    const date = btn.dataset.date;
    const goTime = btn.dataset.gotime;
    
    const choice = prompt(`外出中の記録を終了しますか？\n戻り時間を入力してください（HH:MM 形式）。\n\n※日またぎの場合は「23:59」などを指定してください。`, '23:59');
    if (choice === null) return;
    
    if (!/^\\d{2}:\\d{2}$/.test(choice)) {
      alert('無効な時間形式です。HH:MM で入力してください。');
      return;
    }

    const originalHtml = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = '処理中...';
      const fullTime = `${date}T${choice}:00`;
      
      await fetchJSONAuth(`/api/attendance/go-out/admin/${id}/force-end`, {
        method: 'PUT',
        body: JSON.stringify({ returnTime: fullTime, adminNote: '管理者により修正（強制終了）' })
      });
      
      await loadData();
    } catch (err) {
      alert(err.message || 'エラーが発生しました');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  };

  const handleEdit = (e) => {
    // Traverse up to find the button element if clicked on svg/path
    const btn = e.target.closest('.btn-edit');
    if (!btn) return;
    const json = JSON.parse(btn.dataset.json);
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const goTimeHm = fmtTime(json.go_out_time) === '—' ? '' : fmtTime(json.go_out_time);
    const retTimeHm = fmtTime(json.return_time) === '—' ? '' : fmtTime(json.return_time);

    modal.innerHTML = `
      <div style="background: white; border-radius: 8px; width: 400px; max-width: 90%; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #0f2c62; color: white; padding: 12px 16px; font-weight: bold; font-size: 16px;">外出記録の編集</div>
        <div style="padding: 20px;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">社員名</label>
            <div style="font-size: 14px; color: #1e293b;">${escapeHtml(json.employeeName)} (${escapeHtml(json.date)})</div>
          </div>
          
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <div style="flex: 1;">
              <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">外出時間</label>
              <input type="time" id="editGoTime" value="${goTimeHm}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="flex: 1;">
              <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">戻り時間</label>
              <input type="time" id="editRetTime" value="${retTimeHm}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">区分</label>
            <select id="editType" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
              <option value="業務" ${json.type === '業務' ? 'selected' : ''}>業務</option>
              <option value="私用" ${json.type === '私用' ? 'selected' : ''}>私用</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">理由</label>
            <input type="text" id="editReason" value="${escapeHtml(json.reason || '')}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 4px;">備考 (管理者の修正理由など)</label>
            <input type="text" id="editAdminNote" value="${escapeHtml(json.admin_note || '')}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;" placeholder="例：打刻忘れのため修正">
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="btnCancelEdit" style="background: white; border: 1px solid #cbd5e1; color: #475569; padding: 8px 16px; border-radius: 4px; cursor: pointer;">キャンセル</button>
            <button id="btnSaveEdit" style="background: #059669; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">保存して修正済みにする</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btnCancelEdit').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#btnSaveEdit').addEventListener('click', async (btnE) => {
      const goTime = modal.querySelector('#editGoTime').value;
      const retTime = modal.querySelector('#editRetTime').value;
      const type = modal.querySelector('#editType').value;
      const reason = modal.querySelector('#editReason').value;
      const adminNote = modal.querySelector('#editAdminNote').value;

      if (!goTime) {
        alert('外出時間を入力してください');
        return;
      }

      btnE.target.disabled = true;
      btnE.target.textContent = '保存中...';

      try {
        const fullGoTime = `${json.date}T${goTime}:00`;
        const fullRetTime = retTime ? `${json.date}T${retTime}:00` : null;

        await fetchJSONAuth(`/api/attendance/go-out/admin/${json.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            goOutTime: fullGoTime,
            returnTime: fullRetTime,
            type,
            reason,
            adminNote: adminNote || '管理者により修正'
          })
        });

        document.body.removeChild(modal);
        await loadData();
      } catch (err) {
        alert(err.message || 'エラーが発生しました');
        btnE.target.disabled = false;
        btnE.target.textContent = '保存して修正済みにする';
      }
    });
  };

  document.getElementById('goOutAdminPageSize').addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  document.getElementById('goOutAdminPrevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  document.getElementById('goOutAdminNextPage').addEventListener('click', () => {
    const pageSize = parseInt(document.getElementById('goOutAdminPageSize').value, 10);
    const totalPages = Math.ceil(allRecords.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  document.getElementById('goOutAdminFilterMonth').addEventListener('change', loadData);
  document.getElementById('goOutAdminFilterMonth').addEventListener('input', loadData);
  
  // Re-render table when resizing between mobile and desktop to adjust pagination logic
  window.addEventListener('resize', () => {
    if (allRecords.length > 0) {
      renderTable();
    }
  });

  loadData();
}