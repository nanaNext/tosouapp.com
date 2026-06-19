import { fetchJSONAuth } from '../../api/http.api.js';
// Cái chỗ này dùng để render table 外出管理
export async function mountGoOut({ content }) {
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';

  content.className = (content.className || '') + ' go-out-page-content';
  content.style.cssText = `margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; background: #FFFFFF; flex: 1; min-width: 0;`;
  content.innerHTML = `
    <style>
      .go-out-page-content { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .go-out-table-wrapper { flex: 1 1 0%; min-height: 0; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      @media (max-width: 768px) {
        .go-out-page-content { flex: 1 1 0% !important; min-height: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }
        .go-out-table-wrapper { flex: 1 1 0% !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; }
        #adminContent.card { padding: 0 !important; }
      }
      .go-out-table { width: 100%; border-collapse: collapse; min-width: 900px; margin: 0; font-size: 13px; table-layout: auto; }
      .go-out-table th { padding: 6px 12px; font-size: 12px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
      .go-out-table td { border: 1px solid #e2e8f0; padding: 6px 12px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
      .go-out-table tbody tr:hover td { background-color: #f1f5f9; }
      
      @media (max-width: 768px) {
        .go-out-table th, .go-out-table td { font-size: 11px; padding: 4px; }
        .go-out-table-wrapper {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          max-height: none !important;
        }
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
        
        /* Remove outer card styling on mobile to avoid card-in-card */
        #adminContent.card {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .go-out-root-container {
          background: transparent !important;
        }
        .page-header-container {
          padding: 16px 0 8px 0 !important;
        }
        .go-out-table-wrapper {
          padding: 0 !important;
        }
        
        /* Mobile Header Adjustments */
        .page-header-title {
          display: none !important; /* Hide "外出管理" on mobile */
        }
        .page-header-container {
          display: none !important; /* Hide completely on mobile since we move date picker to top header */
        }
        #goOutAdminFilterMonth {
          width: 130px !important; /* Make date picker smaller */
          height: 32px !important; /* Make it slightly thinner */
          font-size: 13px !important;
          margin: 0 !important;
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
    <div class="go-out-root-container" style="padding: 0; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background: #FFFFFF; display: flex; flex-direction: column; flex: 1 1 0%; min-height: 0;">
      <div class="page-header-container" style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 0px; padding: 16px 24px 8px 24px; flex-shrink: 0;">
        <h2 class="page-header-title" style="display: none;">外出管理</h2>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="month" id="goOutAdminFilterMonth" style="height: 30px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 140px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;">
        </div>
      </div>

      <!-- Table -->
      <div class="go-out-table-wrapper" style="border-top: none; border-bottom: none; box-shadow: none; background: white; padding: 16px 24px 24px 24px;">
          <table class="go-out-table" style="width: 100%; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr style="background: #e6f2ff; color: #0f172a; text-align: center; height: 30px;">
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">日付</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">社員名</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">外出</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">戻り</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">時間</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">区分</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">理由</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">状態</th>
                <th style="padding: 4px 8px; font-size: 13px; font-weight: 600; text-align: center; border: 1px solid #cbd5e1;">アクション</th>
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
  
  // Move date picker to top header on mobile if available
  const mobileActions = document.getElementById('attHubMobileActions');
  if (mobileActions && window.innerWidth <= 768) {
    const monthClone = monthInput.cloneNode(true);
    monthClone.id = 'goOutAdminFilterMonthMobile';
    mobileActions.innerHTML = '';
    mobileActions.appendChild(monthClone);
    
    monthClone.addEventListener('change', (e) => {
      monthInput.value = e.target.value;
      loadData();
    });
    monthClone.addEventListener('input', (e) => {
      monthInput.value = e.target.value;
      loadData();
    });
  }
  
  // Set default month to current month
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  monthInput.value = defaultMonth;
  if (document.getElementById('goOutAdminFilterMonthMobile')) {
    document.getElementById('goOutAdminFilterMonthMobile').value = defaultMonth;
  }
  
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
    const filterMonth = document.getElementById('goOutAdminFilterMonth');
    if (!filterMonth) return;
    
    // Get month value (YYYY-MM)
    const monthVal = filterMonth.value;
    const tbodyEl = document.getElementById('goOutAdminTableBody');
    if (tbodyEl) {
      tbodyEl.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">読み込み中...</td></tr>`;
    }

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
      if (document.getElementById('goOutAdminTableBody')) {
        document.getElementById('goOutAdminTableBody').innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #ef4444;">エラー: ${e.message}</td></tr>`;
      }
    }
  };

  const renderTable = () => {
    // For mobile devices, show all records (ignore pagination)
    const isMobile = window.innerWidth <= 768;
    const pageSizeEl = document.getElementById('goOutAdminPageSize');
    if (!pageSizeEl) return;
    const pageSize = isMobile ? allRecords.length : parseInt(pageSizeEl.value, 10);
    const totalItems = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    if (currentPage > totalPages) currentPage = totalPages;
    
    const countEl = document.getElementById('goOutAdminItemCount');
    if (countEl) countEl.textContent = `全 ${totalItems} 件`;
    
    const infoEl = document.getElementById('goOutAdminPageInfo');
    if (infoEl) infoEl.textContent = `ページ ${currentPage} / ${totalPages}`;
    
    const prevBtn = document.getElementById('goOutAdminPrevPage');
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    
    const nextBtn = document.getElementById('goOutAdminNextPage');
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    const tbodyEl = document.getElementById('goOutAdminTableBody');
    if (totalItems === 0) {
      if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">データがありません</td></tr>`;
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
          <button class="btn-force-end" data-id="${r.id}" data-date="${r.date}" data-gotime="${goTime}" style="background: transparent; color: #ef4444; border: none; padding: 0 4px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: underline;">
            強制終了
          </button>
        `;
      }
      // Hiển thị nút sửa khi trạng thái là 外出中
      actions += `
        <button class="btn-edit" data-id="${r.id}" data-json='${escapeHtml(JSON.stringify(r))}' style="background: transparent; color: #3b82f6; border: none; padding: 0 4px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: underline;">
          編集
        </button>
      `;

      const rowBg = index % 2 === 0 ? 'white' : '#f8fafc';
      
      const fullReason = escapeHtml(r.reason || '');
      const shortReason = fullReason.length > 15 ? fullReason.substring(0, 15) + '...' : fullReason;
      
      const fullAdminNote = escapeHtml(r.admin_note || '');
      const shortAdminNote = fullAdminNote.length > 15 ? fullAdminNote.substring(0, 15) + '...' : fullAdminNote;

      html += `
        <tr class="go-out-row" data-bg="${rowBg}">
          <!-- Mobile View -->
          <td class="mobile-cell">
            <div class="td-date-status">
              <span>${escapeHtml(r.date)}</span>
              <span style="font-size: 12px; color: #1e293b;">${escapeHtml(r.status)}</span>
            </div>
            <div class="td-employee">${escapeHtml(r.employeeName)}</div>
            <div class="td-time" style="display: flex; align-items: stretch;">
              <span class="td-time-label" style="display: inline-flex; align-items: center; justify-content: center; width: 60px; min-height: 32px; background: #e0f2fe; color: #1e3a8a; font-weight: bold; font-size: 12px; border-radius: 4px; border: 1px solid #bae6fd; margin-right: 12px; flex-shrink: 0;">時間</span>
              <span style="display: inline-flex; align-items: center; min-height: 32px;">${goTime} 〜 ${retTime} (経過: ${duration})</span>
            </div>
            <div class="td-type-reason" style="margin-top: 8px; display: flex; align-items: stretch;">
              <span class="td-type-label" style="display: inline-flex; align-items: center; justify-content: center; width: 60px; min-height: 32px; background: #e0f2fe; color: #1e3a8a; font-weight: bold; font-size: 12px; border-radius: 4px; border: 1px solid #bae6fd; margin-right: 12px; flex-shrink: 0;">区分</span>
              <span style="display: inline-flex; align-items: center; min-height: 32px; font-size: 12px;">${escapeHtml(r.type)}</span>
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
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; color: #1e293b; text-align: center;">${escapeHtml(r.date)}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; color: #1e293b; font-weight: 500; text-align: center;">${escapeHtml(r.employeeName)}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; font-family: monospace; text-align: center;">${goTime}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; font-family: monospace; text-align: center;">${retTime}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; font-family: monospace; text-align: center; color: #64748b;">${duration}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; text-align: center;">${escapeHtml(r.type)}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; color: #475569; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">
            <div title="${fullReason}" style="line-height: 1.2;">${shortReason}</div>
            ${r.admin_note ? `<div title="${fullAdminNote}" style="font-size: 11px; color: #94a3b8; margin-top: 2px; line-height: 1.1;">(備考: ${shortAdminNote})</div>` : ''}
          </td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; text-align: center;">${escapeHtml(r.status)}</td>
          <td class="desktop-cell" style="padding: 2px 8px !important; font-size: 13px; white-space: nowrap; text-align: center;">${actions}</td>
        </tr>
      `;
    });
    if (tbodyEl) tbodyEl.innerHTML = html;

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
  const handleResize = () => {
    if (allRecords.length > 0 && document.getElementById('goOutAdminItemCount')) {
      renderTable();
    }
    
    // Manage date picker position based on screen size
    const mobileActions = document.getElementById('attHubMobileActions');
    const mobileMonth = document.getElementById('goOutAdminFilterMonthMobile');
    if (window.innerWidth <= 768) {
      if (mobileActions && !mobileMonth) {
        const monthClone = monthInput.cloneNode(true);
        monthClone.id = 'goOutAdminFilterMonthMobile';
        monthClone.value = monthInput.value;
        mobileActions.innerHTML = '';
        mobileActions.appendChild(monthClone);
        monthClone.addEventListener('change', (e) => { monthInput.value = e.target.value; loadData(); });
        monthClone.addEventListener('input', (e) => { monthInput.value = e.target.value; loadData(); });
      }
    } else {
      if (mobileActions) mobileActions.innerHTML = '';
    }
  };
  window.addEventListener('resize', handleResize);

  loadData();

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}