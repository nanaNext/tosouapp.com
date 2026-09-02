import { fetchJSONAuth } from '../api/http.api.js';

// Thêm hàm hỗ trợ esc ở đầu file
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let currentUser = null;
let targetUserId = null;
let currentMonth = new Date();

let shiftData = {}; // key: YYYY-MM-DD, value: object
let serverStatus = null; // Theo dõi xem tháng đã được nộp hoặc duyệt chưa
let calendarDataMap = {}; // Map dữ liệu lịch dùng chung

const SEISHAIN_LEAVE_TYPES = [
  { value: 'paid', label: '有給休暇' },
  { value: 'paid_half', label: '半休(有給)' },
  { value: 'half', label: '半休' },
  { value: 'unpaid', label: '欠勤 / 無給休暇' },
  { value: 'substitute', label: '代替休日' },
  { value: 'special', label: '特別休暇' }
];

const SEISHAIN_REASONS = [
  { value: '私用のため', label: '私用のため' },
  { value: '体調不良', label: '体調不良' },
  { value: '定期健診', label: '定期健診' },
  { value: 'other', label: 'その他' }
];

const BAITO_SHIFTS = [
  { value: 'OFF', label: '休み' },
  { value: 'WORKING', label: '出勤' }
];

async function init() {
  const spinner = $('#pageSpinner');
  if (spinner) spinner.removeAttribute('hidden');
  
  const params = new URLSearchParams(window.location.search);
  targetUserId = params.get('userId');
  
  try {
    const el = $('#userName');
    if (el) {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
      const u = raw ? JSON.parse(raw) : null;
      const name = (u && (u.username || u.email)) ? String(u.username || u.email) : '';
      if (name) el.textContent = name;
    }
  } catch (e) { /* bỏ qua lỗi */ }

  try {
    currentUser = await fetchJSONAuth('/api/auth/me');
    if (!currentUser) {
      window.location.replace('/ui/login?next=/ui/shifts');
      return;
    }
    
    // Nếu có chỉ định targetUserId thì ghi đè currentUser bằng dữ liệu user đích
    if (targetUserId && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      const targetUser = await fetchJSONAuth(`/api/admin/employees/${targetUserId}`);
      if (targetUser && !targetUser.error) {
        currentUser = targetUser;
      } else {
        alert('指定されたユーザーが見つかりません。');
        targetUserId = null;
      }
    }
    
    // Cập nhật luôn userName trên header phòng khi nó chưa có trong storage
    const el = $('#userName');
    if (el && currentUser) {
      const name = currentUser.username || currentUser.email;
      if (name) el.textContent = name;
    }
    
    // Chỉ lưu user đã cập nhật vào storage nếu không phải đang ghi đè
    if (!targetUserId) {
      try {
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (e) { /* bỏ qua lỗi */ }
    }
    
    // Hiển thị thông tin profile user trong khung shifts-header (giờ do renderApp xử lý hoàn toàn)
    const uiName = currentUser.username || currentUser.email || '未設定';
    const uiDept = currentUser.departmentName || '未設定';
    const isSeishain = currentUser.employment_type === 'full_time' || currentUser.employment_type === '正社員';
    const uiType = isSeishain ? '正社員' : 'アルバイト / パート';
    
    if (targetUserId) {
      const headerBox = document.querySelector('.page-header');
      if (headerBox) {
        const banner = document.createElement('div');
        banner.style.background = '#fef3c7';
        banner.style.color = '#92400e';
        banner.style.padding = '10px';
        banner.style.textAlign = 'center';
        banner.style.fontWeight = 'bold';
        banner.style.marginBottom = '15px';
        banner.style.borderRadius = '4px';
        banner.textContent = `【代理編集モード】現在、「${uiName}」のシフトを編集しています。`;
        headerBox.parentNode.insertBefore(banner, headerBox.nextSibling);
      }
    }
    
    await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
    renderApp();
  } catch (err) {
    console.error(err);
    if (err.message && (err.message.includes('Invalid or expired token') || err.message.includes('No token provided'))) {
      window.location.replace('/ui/login?next=/ui/shifts');
      return;
    }
    alert('ユーザー情報の読み込みに失敗しました。\n' + err.message + '\n' + err.stack);
  } finally {
    if (spinner) spinner.setAttribute('hidden', '');
    document.documentElement.classList.remove('portal-preboot');
  }
}

function wireUserMenu() {
  if (window.__employeeUserMenuDelegated) return;
  window.__employeeUserMenuDelegated = true;
  const btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace('/ui/login');
    });
  }

  document.addEventListener('click', (e) => {
    const isBtn = e.target && e.target.closest && e.target.closest('.user .user-btn');
    const isMenu = e.target && e.target.closest && e.target.closest('.user-menu');
    const d = document.querySelector('#userDropdown');
    const b = document.querySelector('.user .user-btn');
    
    if (isBtn) {
      e.preventDefault();
      if (d && b) {
        const isHidden = d.hasAttribute('hidden');
        if (isHidden) {
          d.removeAttribute('hidden');
          b.setAttribute('aria-expanded', 'true');
        } else {
          d.setAttribute('hidden', '');
          b.setAttribute('aria-expanded', 'false');
        }
      }
      return;
    }

    if (!isMenu && d && !d.hasAttribute('hidden')) {
      d.setAttribute('hidden', '');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  });
}

async function loadMonthData(year, month) {
  try {
    const isSeishain = currentUser.employment_type === 'full_time';
    const isKoujibu = String(currentUser.departmentName || currentUser.departmentId || '').includes('工事部') || String(currentUser.departmentName || '').includes('Kouji');
    
    // Lấy dữ liệu lịch cho tháng
    // API trả về 'is_off' cho mỗi ngày nếu đó là ngày nghỉ của công ty
    calendarDataMap = {};
    const calendarData = calendarDataMap;
    const daysInMonth = getDaysInMonth(year, month);
    
    // Đặt lại dữ liệu
    shiftData = {};
    serverStatus = null;

    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    // 1. Fetch server shift data first to check if there's already submitted/approved data
    try {
      const q = targetUserId ? `&userId=${targetUserId}` : '';
      const serverRes = await fetchJSONAuth(`/api/attendance/shifts/monthly/${monthStr}?_t=${Date.now()}${q}`); // Thêm timestamp để bỏ qua cache
      if (serverRes && serverRes.success !== false) { // Giả định response là mảng hoặc object chứa status
        // Xử lý response dạng mảng (nếu trả về ca của user trực tiếp) hoặc dạng object
        const data = serverRes.data || serverRes;
        
        // Tìm trạng thái của mình
        if (Array.isArray(data)) {
          const myData = data.find(u => u.id === currentUser.id);
          if (myData) {
            serverStatus = myData.submission_status;
            if (myData.schedule) shiftData = { ...myData.schedule };
          }
        } else if (data.submission_status) {
          serverStatus = data.submission_status;
          if (data.schedule) shiftData = { ...data.schedule };
        }
      }
    } catch (e) {
      /* bỏ qua lỗi */
    }
    
    // 2. We fetch day by day or use working-days for calendar off-days. 
    await Promise.all(daysInMonth.map(async (d) => {
      const dateStr = formatDate(d);
      const dow = d.getDay();
      try {
        const cal = await fetchJSONAuth(`/api/attendance/calendar/day/${encodeURIComponent(dateStr)}`);
        calendarData[dateStr] = Number(cal?.is_off || 0) === 1;
      } catch (e) {
        calendarData[dateStr] = dow === 0 || dow === 6;
      }
    }));
    
    // Thêm từ điển dự phòng cho Koujibu (工事部) chỉ để render
    daysInMonth.forEach(d => {
      const dateStr = formatDate(d);
      const dow = d.getDay();
      const isSunday = dow === 0;
      const is4thSaturday = dow === 6 && d.getDate() >= 22 && d.getDate() <= 28;
      calendarData[`${dateStr}_koujibu`] = isSunday || is4thSaturday;
    });
    
    daysInMonth.forEach(d => {
      const dateStr = formatDate(d);
      const dow = d.getDay();
      
      // Khởi tạo mặc định nếu chưa được đặt
      if (!shiftData[dateStr]) {
        const isRedDay = calendarData[dateStr] === true;
        const isHolidayForUser = isKoujibu ? calendarData[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
        
        if (isSeishain) {
          // API backend đã tính sẵn chính sách của Koujibu (工事部) và trả về `is_off` tương ứng
          shiftData[dateStr] = { status: !isHolidayForUser ? 'WORKING' : 'LEAVE', leaveType: !isHolidayForUser ? undefined : undefined };
        } else {
          // Baito (nhân viên thời vụ): mặc định WORKING ngày thường, OFF cuối tuần, giống Seishain nhưng đơn giản hơn
          shiftData[dateStr] = { status: !isHolidayForUser ? 'WORKING' : 'OFF' };
        }
      }
    });
  } catch (err) {
    console.error('Failed to load calendar data', err);
  }
}

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayOfWeek(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

function renderApp() {
  const isSeishain = currentUser.employment_type === 'full_time';
  const app = $('#shiftsApp');
  
  if (!app) {
    console.error('Element #shiftsApp not found.');
    return;
  }
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getDaysInMonth(year, month);
  
  // Tạo cấu trúc header một cách an toàn vì bản gốc có thể bị mất hoặc bị sửa
  const uiName = currentUser.username || currentUser.email || '未設定';
  const uiDept = currentUser.departmentName || '未設定';
  const uiType = isSeishain ? '正社員' : 'アルバイト / パート';
  const uiInstruction = isSeishain ? '※ 休暇を取得したい日を選択してください。' : '※ 出勤できるシフト（時間帯）を選択してください。';

  let statusBadgeHtml = '';
  if (serverStatus === 'PENDING') {
    statusBadgeHtml = '<span class="status-badge" style="background:#f97316;">承認待ち</span>';
  } else if (serverStatus === 'APPROVED') {
    statusBadgeHtml = '<span class="status-badge" style="background:#22c55e;">承認済</span>';
  } else if (serverStatus === 'RETURNED') {
    statusBadgeHtml = '<span class="status-badge" style="background:#ef4444;">差戻し</span>';
  } else {
    statusBadgeHtml = '<span class="status-badge" style="background:#94a3b8;">未提出</span>';
  }

  const headerHtml = `
    <div class="shifts-header" style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-weight: bold; margin-bottom: 4px; display:flex; align-items:center; gap:8px;">
        従業員: <span id="profileName">${uiName}</span> (<span id="profileDept">${uiDept}</span>)
        ${statusBadgeHtml}
      </div>
      <div style="margin-bottom: 8px;">雇用形態: <span id="profileType">${uiType}</span></div>
      <div style="color: #ea580c; font-size: 0.9rem;" id="profileInstruction">${uiInstruction}</div>
    </div>
  `;

  // Tạo các ô trống cho tháng trước
  const firstDay = new Date(year, month, 1).getDay();
  const emptyCellsHtml = Array.from({ length: firstDay }).map(() => `<div class="shift-cell empty-cell"></div>`).join('');
  
  // Hàng header cho các thứ trong tuần
  const daysOfWeek = [
    { label: '日', sub: 'SUN', class: 'sunday' },
    { label: '月', sub: 'MON', class: '' },
    { label: '火', sub: 'TUE', class: '' },
    { label: '水', sub: 'WED', class: '' },
    { label: '木', sub: 'THU', class: '' },
    { label: '金', sub: 'FRI', class: '' },
    { label: '土', sub: 'SAT', class: 'saturday' }
  ];
  const daysHeaderHtml = daysOfWeek.map(d => `<div class="shifts-grid-header-cell ${d.class}">${d.label}<br><span style="font-size: 10px; font-weight: normal;">${d.sub}</span></div>`).join('');

  // Tính các ô trống ở cuối
  const totalCells = firstDay + days.length;
  const remainder = totalCells % 7;
  const trailingEmptyCellsHtml = remainder !== 0 ? Array.from({ length: 7 - remainder }).map(() => `<div class="shift-cell empty-cell"></div>`).join('') : '';

  let statusBadge = '';
  if (serverStatus === 'PENDING') {
    statusBadge = '<span style="background: #f97316; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">申請中 (承認待ち)</span>';
  } else if (serverStatus === 'APPROVED') {
    statusBadge = '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">承認済</span>';
  } else if (serverStatus === 'RETURNED') {
    statusBadge = '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">差戻し (再提出)</span>';
  } else {
    statusBadge = '<span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">未提出</span>';
  }

  const html = `
    <div class="shifts-container">
      <div class="shifts-header" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #1e3a8a;">
        
        <!-- Row 1: Navigation and Actions -->
        <div class="shifts-top-nav" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; width: 100%;">
          <div class="shifts-top-nav-left">
            <a href="/ui/shifts-all" id="btnAllShifts" style="padding: 8px 16px; border: 1px solid #d1d5db; background: #f8fafc; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #334155; display: flex; align-items: center; gap: 6px; text-decoration: none; transition: all 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              全員のシフト
            </a>
          </div>
          
          <div class="shifts-top-nav-right" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
            <div class="modern-month-picker" style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); height: 38px;">
              <button id="prevMonth" class="modern-btn-nav" title="先月" style="padding: 0 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; height: 100%;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div class="modern-month-display" style="padding: 0 16px; font-weight: bold; font-size: 15px; color: #0f172a; min-width: 120px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; height: 100%;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${year}年 ${String(month + 1).padStart(2, '0')}月
              </div>
              <button id="nextMonth" class="modern-btn-nav" title="来月" style="padding: 0 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; height: 100%;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            
            <button id="btnSubmitTop" class="btn-submit" ${serverStatus === 'APPROVED' || serverStatus === 'PENDING' ? 'disabled' : ''} style="padding: 0 20px; font-size: 14px; border-radius: 6px; height: 38px; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              シフト提出
            </button>
          </div>
        </div>
      
        <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 2px 0; width: 100%;">

        <!-- Row 2: User Profile and Status -->
        <div class="shifts-header-info" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; width: 100%;">
          <div class="shifts-header-info-left" style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 14px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #64748b;">従業員:</span>
              <span id="profileName" style="font-weight: bold; color: #0f172a; font-size: 15px;">${currentUser.username || currentUser.email || '未設定'}</span>
              <span id="profileDept" style="color: #64748b; font-size: 13px;">(${currentUser.departmentName || '未設定'})</span>
            </div>
            ${statusBadge}
          </div>
          
          <div class="shifts-header-info-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div style="font-size: 13px; color: #64748b;">
              雇用形態: <span id="profileType" style="color: #0f172a; font-weight: bold;">${isSeishain ? '正社員' : 'アルバイト / パート'}</span>
            </div>
            <div style="color: #ea580c; font-size: 13px; font-weight: bold;" id="profileInstruction">
              ${serverStatus === 'APPROVED' ? '※ この月のシフトは承認済みのため変更できません。' : (isSeishain ? '※ 休暇を取得したい日を選択してください。' : '※ 出勤できるシフト（時間帯）を選択してください。')}
            </div>
          </div>
        </div>
      </div>

      <div class="shifts-grid ${serverStatus === 'APPROVED' ? 'is-approved' : (serverStatus === 'PENDING' ? 'is-pending' : 'is-draft')}">
        <div class="shifts-grid-header">
          ${daysHeaderHtml}
        </div>
        ${emptyCellsHtml}
        ${days.map(d => renderDayCell(d, isSeishain)).join('')}
        ${trailingEmptyCellsHtml}
      </div>

      <div class="shifts-footer" style="display: none;">
        <!-- Bottom submit button removed as requested -->
      </div>
    </div>
    
    <!-- Modal for Seishain Leave -->
    <div id="leaveModal" class="modal-overlay" hidden>
      <div class="modal-content">
        <h3 id="modalDateTitle"></h3>
        <input type="hidden" id="modalDateVal">
        <div class="form-group">
          <label for="modalLeaveType">休暇種類:</label>
          <select id="modalLeaveType" class="form-control">
            ${SEISHAIN_LEAVE_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="modalReason">理由:</label>
          <select id="modalReason" class="form-control">
            ${SEISHAIN_REASONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="modalDetailGroup" style="display: none;">
          <label for="modalDetail">詳細 (必須):</label>
          <textarea id="modalDetail" class="form-control" rows="3" placeholder="例: 歯医者、帰省..."></textarea>
        </div>
        <!-- 振替出勤 swap section -->
        <div id="modalSwapSection" style="display:none; margin-top:12px; padding:12px; border:1px solid #e2e8f0; background:#f8fafc;">
          <label for="modalSwapDate" style="font-weight:600; font-size:13px; color:#0b2c66; margin-bottom:6px; display:block;">振替休日（代替休日）の日付を選択:</label>
          <select id="modalSwapDate" class="form-control" style="width:100%; height:36px; font-size:14px;"></select>
          <p style="font-size:11px; color:#64748b; margin:6px 0 0;">※ 選択した日が代替休日になります</p>
        </div>
        <div class="modal-actions">
          <button id="btnModalCancel" class="btn-cancel">キャンセル</button>
          <button id="btnModalSave" class="btn-save">保存</button>
          <button id="btnModalClear" class="btn-clear">出勤に変更 (休暇取消)</button>
          <button id="btnModalFurikae" class="btn-furikae" style="display:none; width:100%; margin-top:8px; padding:10px; border:1px solid #2563eb; background:#eff6ff; color:#1d4ed8; font-weight:600; cursor:pointer;">振替出勤（代替休日を指定）</button>
          <button id="btnModalSaveSwap" class="btn-save" style="display:none; width:100%; margin-top:8px; padding:10px;">振替を確定</button>
          <button id="btnModalRevert" class="btn-revert" style="display:none; width:100%; margin-top:8px; padding:10px; border:1px solid #cbd5e1; background:#f8fafc; color:#0b2c66; font-weight:600; cursor:pointer;">休日に戻す</button>
          <button id="btnModalCancelSwap" class="btn-cancel" style="display:none; width:100%; margin-top:6px; padding:8px; border:1px solid #fca5a5; background:#fef2f2; color:#991b1b; font-weight:600; cursor:pointer;">振替を取消</button>
        </div>
      </div>
    </div>
  `;
  
  app.innerHTML = html;
  attachEvents(isSeishain);
}

function renderDayCell(date, isSeishain) {
  const dateStr = formatDate(date);
  const data = shiftData[dateStr] || { status: 'OFF' };
  const dow = date.getDay();
  let dayClass = 'shift-cell';
  
  if (data.status !== 'WORKING' && isSeishain) {
     dayClass += ' is-leave';
  }
  
  // Tô màu chữ ngày dựa trên ngày nghỉ thực tế
  let isHoliday = false;
  const isRedDay = calendarDataMap[dateStr] === true;
  
  const isKoujibu = String(currentUser.departmentName || '').includes('工事部');
  
  if (isSeishain) {
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    if (isHolidayForUser || (data.status !== 'WORKING' && !data.leaveType)) {
      isHoliday = true;
    }
  } else {
    // Với baito, tô đỏ Chủ nhật và ngày lễ. Với Koujibu (工事部), thứ Bảy tuần thứ 4 cũng là ngày đỏ.
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    if (isHolidayForUser) isHoliday = true;
  }
  
  if (isHoliday) {
    dayClass += ' sunday';
  } else if (dow === 6) {
    dayClass += ' saturday';
  }
  
  // Tính ngày âm lịch
  let lunarText = '';
  try {
    if (typeof window.Lunar !== 'undefined') {
      const lunarDate = window.Lunar.fromDate(date);
      const lDay = lunarDate.getDay();
      const lMonth = lunarDate.getMonth();
      if (lDay === 1) {
        lunarText = `${lMonth}/${lDay}`;
      } else {
        lunarText = `${lDay}`;
      }
    } else {
      // Dự phòng hoặc debug
      // Nếu không có window.Lunar thì không hiển thị được ngày âm lịch
    }
  } catch (e) {
    console.error('Lunar error', e);
  }
  const lunarHtml = lunarText ? `<div style="font-size: 11px; font-weight: normal; color: #94a3b8; line-height: 1; margin-top: 1px;">${esc(lunarText)}</div>` : '';
  
  let contentHtml = '';
  
  if (isSeishain) {
    if (data.status === 'WORKING') {
      contentHtml = `<div class="status-working" style="${serverStatus === null || serverStatus === 'RETURNED' ? 'color:#64748b;' : ''}">出勤</div>`;
    } else if (data.status === 'FURIKAE_WORK') {
      // 振替出勤: working on a holiday with a linked comp-off day
      contentHtml = `<div class="status-working" style="color:#1d4ed8; font-weight:700;">振出</div>`;
    } else if (data.status === 'FURIKAE_OFF') {
      // 代替休日: comp-off day linked to a swap-work day
      contentHtml = `<div class="status-leave" style="color:#7c3aed; font-weight:700;">代休</div>`;
      dayClass += ' is-leave';
    } else {
      if (!data.leaveType) {
        // Ngày nghỉ mặc định của hệ thống
        contentHtml = `<div class="status-leave" style="color:#dc2626;">休</div>`;
      } else {
        // Ngày nghỉ do người dùng đăng ký
        const typeLabel = SEISHAIN_LEAVE_TYPES.find(t => t.value === data.leaveType)?.label || data.leaveType;
        const shortTypeLabel = typeLabel.includes('有給') ? '有休' : (typeLabel.includes('欠勤') ? '欠勤' : typeLabel);
        
        contentHtml = `<div class="status-leave" style="color:#dc2626; font-weight:normal;">${shortTypeLabel}</div>`;
      }
      dayClass += ' is-leave';
    }
    
    // Thêm logic vô hiệu hóa click nếu đã duyệt hoặc đang chờ, trừ ô nghỉ phép vì cần xem lý do
    const isLocked = serverStatus === 'APPROVED' || serverStatus === 'PENDING';
    const isLeave = data.status !== 'WORKING';
    // Nếu là ngày nghỉ mặc định của hệ thống (không có leaveType) thì không cần hiển thị lý do
    const isSystemHoliday = isLeave && !data.leaveType;
    
    // Nếu bị khóa VÀ (là ngày làm việc HOẶC ngày nghỉ hệ thống) thì tắt pointer events.
    // Nếu là ngày nghỉ phép do đăng ký thì cho phép click để xem lý do.
    const lockStyle = (isLocked && (!isLeave || isSystemHoliday)) ? 'style="pointer-events:none;"' : '';
    
    return `
      <div class="${dayClass} seishain-cell ${isLocked ? 'is-locked' : ''}" data-date="${dateStr}" ${lockStyle}>
        <div class="cell-date">
          <div>${date.getDate()}</div>
          ${lunarHtml}
        </div>
        <div class="cell-content">${contentHtml}</div>
      </div>
    `;
  } else {
    // Logic hiển thị cho baito
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    const isWeekendOrHoliday = isHolidayForUser;
    const offLabel = '休日';
    const shifts = [
      { value: 'OFF', label: offLabel },
      { value: 'WORKING', label: '出勤' }
    ];

    // Thêm logic vô hiệu hóa click nếu đã duyệt
    const isLocked = serverStatus === 'APPROVED';
    
    const isWorking = data.status === 'WORKING';
    const cellClass = isWorking ? 'is-working' : 'is-off';
    
    return `
      <div class="${dayClass} baito-cell ${cellClass}" data-date="${dateStr}">
        <div class="cell-date">
          <div>${date.getDate()}</div>
          ${lunarHtml}
        </div>
        <div class="cell-content baito-cell-content">
          <select id="shift-select-${dateStr}" name="shift-select-${dateStr}" class="baito-shift-select" data-date="${dateStr}" ${isLocked ? 'disabled' : ''} aria-label="${dateStr}のシフト">
            ${shifts.map(s => `<option value="${s.value}" ${data.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }
}

function attachEvents(isSeishain) {
  $('#prevMonth').addEventListener('click', async () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
    renderApp();
  });
  $('#nextMonth').addEventListener('click', async () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
    renderApp();
  });
  
  if (isSeishain) {
    $$('.seishain-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        openLeaveModal(dateStr);
      });
    });
    
    $('#modalReason').addEventListener('change', (e) => {
      const val = e.target.value;
      const type = $('#modalLeaveType').value;
      if (val === 'other' || type === 'special') {
        $('#modalDetailGroup').style.display = 'block';
      } else {
        $('#modalDetailGroup').style.display = 'none';
      }
    });
    
    $('#modalLeaveType').addEventListener('change', (e) => {
      const type = e.target.value;
      const val = $('#modalReason').value;
      if (val === 'other' || type === 'special') {
        $('#modalDetailGroup').style.display = 'block';
      } else {
        $('#modalDetailGroup').style.display = 'none';
      }
    });
    
    $('#btnModalCancel').addEventListener('click', closeLeaveModal);
    $('#btnModalSave').addEventListener('click', saveLeaveModal);
    $('#btnModalClear').addEventListener('click', () => {
      const dateStr = $('#modalDateVal').value;
      shiftData[dateStr] = { status: 'WORKING' };
      closeLeaveModal();
      renderApp();
    });
    $('#btnModalRevert').addEventListener('click', () => {
      const dateStr = $('#modalDateVal').value;
      // Quay về ngày nghỉ mặc định (không có leaveType = ngày nghỉ hệ thống)
      shiftData[dateStr] = { status: 'LEAVE' };
      closeLeaveModal();
      renderApp();
    });
    // 振替出勤 button: show swap date picker
    $('#btnModalFurikae').addEventListener('click', () => {
      const swapSection = $('#modalSwapSection');
      const swapSelect = $('#modalSwapDate');
      const saveSwapBtn = $('#btnModalSaveSwap');
      // Đổ vào dropdown các ngày làm việc trong tháng chưa bị nghỉ/hoán đổi
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const currentDateStr = $('#modalDateVal').value;
      let options = '<option value="">-- 日付を選択 --</option>';
      daysInMonth.forEach(d => {
        const ds = formatDate(d);
        if (ds === currentDateStr) return; // bỏ qua chính ngày đó
        const dayData = shiftData[ds];
        const dow = d.getDay();
        const isOff = calendarDataMap[ds] === true || dow === 0 || dow === 6;
        // Chỉ hiện các ngày đang là WORKING (chưa bị hoán đổi/nghỉ)
        if (dayData && dayData.status === 'WORKING' && !isOff) {
          const dowLabel = ['日','月','火','水','木','金','土'][dow];
          options += `<option value="${esc(ds)}">${esc(ds)} (${dowLabel})</option>`;
        }
      });
      swapSelect.innerHTML = options;
      swapSection.style.display = 'block';
      saveSwapBtn.style.display = 'block';
      // Ẩn các nút thao tác khác trong lúc đang chọn
      $('#btnModalFurikae').style.display = 'none';
      $('#btnModalClear').style.display = 'none';
      $('#btnModalSave').style.display = 'none';
    });
    // Lưu cặp hoán đổi
    $('#btnModalSaveSwap').addEventListener('click', () => {
      const holidayDate = $('#modalDateVal').value;
      const compOffDate = $('#modalSwapDate').value;
      if (!compOffDate) {
        alert('代替休日の日付を選択してください。');
        return;
      }
      // Đặt ngày nghỉ thành 振替出勤 (đi làm bù)
      shiftData[holidayDate] = { status: 'FURIKAE_WORK', swapDate: compOffDate };
      // Đặt ngày làm việc thành 代替休日 (nghỉ bù)
      shiftData[compOffDate] = { status: 'FURIKAE_OFF', swapDate: holidayDate };
      closeLeaveModal();
      renderApp();
    });
    // Hủy hoán đổi (khi xem một ngày đã có furikae)
    $('#btnModalCancelSwap').addEventListener('click', () => {
      const dateStr = $('#modalDateVal').value;
      const data = shiftData[dateStr];
      const pairDate = data?.swapDate;
      if (data.status === 'FURIKAE_WORK') {
        // Đây là ngày nghỉ đã được đánh dấu là đi làm bù → quay lại LEAVE
        if (pairDate && shiftData[pairDate]) {
          shiftData[pairDate] = { status: 'WORKING' }; // Trả ngày nghỉ bù về lại đi làm
        }
        shiftData[dateStr] = { status: 'LEAVE' }; // Quay lại ngày nghỉ
      } else if (data.status === 'FURIKAE_OFF') {
        // Đây là ngày làm việc đã trở thành nghỉ bù → quay lại WORKING
        if (pairDate && shiftData[pairDate]) {
          shiftData[pairDate] = { status: 'LEAVE' }; // Trả ngày đi làm bù về lại ngày nghỉ
        }
        shiftData[dateStr] = { status: 'WORKING' }; // Quay lại đi làm
      }
      closeLeaveModal();
      renderApp();
    });
  } else {
    $$('.baito-shift-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const dateStr = e.target.getAttribute('data-date');
        const newStatus = e.target.value;
        shiftData[dateStr] = { status: newStatus };
        
        // Cập nhật màu nền ô ngay lập tức
        const cell = e.target.closest('.baito-cell');
        if (cell) {
          if (newStatus === 'WORKING') {
            cell.classList.remove('is-off');
            cell.classList.add('is-working');
          } else {
            cell.classList.remove('is-working');
            cell.classList.add('is-off');
          }
        }
      });
    });
  }
  
  const btnSubmit = $('#btnSubmit');
  const btnSubmitTop = $('#btnSubmitTop');
  
  if (btnSubmit) {
    btnSubmit.addEventListener('click', submitShifts);
    if (serverStatus === 'APPROVED' || serverStatus === 'PENDING') {
      btnSubmit.disabled = true;
    } else {
      btnSubmit.disabled = false;
    }
  }

  if (btnSubmitTop) {
    btnSubmitTop.addEventListener('click', submitShifts);
    if (serverStatus === 'APPROVED' || serverStatus === 'PENDING') {
      btnSubmitTop.disabled = true;
    } else {
      btnSubmitTop.disabled = false;
    }
  }
}

function openLeaveModal(dateStr) {
  const modalDateTitle = $('#modalDateTitle');
  if (modalDateTitle) {
    modalDateTitle.textContent = dateStr;
  }
  $('#modalDateVal').value = dateStr;
  const data = shiftData[dateStr];

  // Xác định xem ngày này có phải ngày nghỉ hệ thống không (ngày nghỉ theo lịch, không có đơn nghỉ của user)
  const isCalendarHoliday = calendarDataMap[dateStr] === true;
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const isWeekend = dow === 0 || dow === 6;
  const isSystemHoliday = (isCalendarHoliday || isWeekend) && !data.leaveType && data.status !== 'FURIKAE_OFF';
  // isSystemHoliday = true trong các trường hợp:
  //   1. Ngày vẫn hiển thị là 休 (status = LEAVE, không có leaveType)
  //   2. Ngày đã đổi sang 出勤 (WORKING) nhưng vẫn là ngày nghỉ theo lịch
  //   3. Ngày là 振替出勤 (FURIKAE_WORK) — vẫn là ngày nghỉ theo lịch nhưng đi làm

  // Lấy các phần tử form
  const formLeaveType = $('#modalLeaveType').closest('.form-group');
  const formReason = $('#modalReason').closest('.form-group');
  const formDetail = $('#modalDetailGroup');
  const btnSave = $('#btnModalSave');

  if (isSystemHoliday) {
    // Ngày nghỉ hệ thống: ẩn form nghỉ phép, chỉ hiện「出勤に変更」và「振替出勤」
    if (formLeaveType) formLeaveType.style.display = 'none';
    if (formReason) formReason.style.display = 'none';
    if (formDetail) formDetail.style.display = 'none';
    btnSave.style.display = 'none';
    // Hiện nút furikae cho các ngày nghỉ chưa được thay đổi
    const furikaeBtn = $('#btnModalFurikae');
    if (furikaeBtn) {
      if (data.status !== 'WORKING' && data.status !== 'FURIKAE_WORK') {
        furikaeBtn.style.display = 'block';
      } else {
        furikaeBtn.style.display = 'none';
      }
    }
  } else {
    // Normal day or user-requested leave: show form
    if (formLeaveType) formLeaveType.style.display = '';
    if (formReason) formReason.style.display = '';
    // formDetail visibility handled by reason change event
    btnSave.style.display = 'inline-block';
    const furikaeBtn = $('#btnModalFurikae');
    if (furikaeBtn) furikaeBtn.style.display = 'none';
  }

  // Ẩn phần hoán đổi theo mặc định
  $('#modalSwapSection').style.display = 'none';
  $('#btnModalSaveSwap').style.display = 'none';

  // Nếu ngày này là FURIKAE_OFF (代替休日), ẩn form, chỉ hiện nút hủy
  if (data.status === 'FURIKAE_OFF') {
    if (formLeaveType) formLeaveType.style.display = 'none';
    if (formReason) formReason.style.display = 'none';
    if (formDetail) formDetail.style.display = 'none';
    btnSave.style.display = 'none';
    $('#btnModalClear').style.display = 'none';
    const furikaeBtn = $('#btnModalFurikae');
    if (furikaeBtn) furikaeBtn.style.display = 'none';
    const revertBtn2 = $('#btnModalRevert');
    if (revertBtn2) revertBtn2.style.display = 'none';
  }
  // Nếu ngày này là FURIKAE_WORK (振替出勤), ẩn form, chỉ hiện nút hủy
  if (data.status === 'FURIKAE_WORK') {
    if (formLeaveType) formLeaveType.style.display = 'none';
    if (formReason) formReason.style.display = 'none';
    if (formDetail) formDetail.style.display = 'none';
    btnSave.style.display = 'none';
    $('#btnModalClear').style.display = 'none';
    const furikaeBtn = $('#btnModalFurikae');
    if (furikaeBtn) furikaeBtn.style.display = 'none';
    const revertBtn2 = $('#btnModalRevert');
    if (revertBtn2) revertBtn2.style.display = 'none';
  }

  // Hiện nút hủy hoán đổi nếu ngày này thuộc một cặp furikae
  const cancelSwapBtn = $('#btnModalCancelSwap');
  if (cancelSwapBtn) {
    if (data.status === 'FURIKAE_WORK' || data.status === 'FURIKAE_OFF') {
      cancelSwapBtn.style.display = 'block';
      // Hiện thông tin về cặp hoán đổi
      const pairLabel = data.status === 'FURIKAE_WORK'
        ? `振替出勤 → 代替休日: ${data.swapDate || ''}`
        : `代替休日 ← 振替出勤: ${data.swapDate || ''}`;
      modalDateTitle.textContent = `${dateStr}\n${pairLabel}`;
    } else {
      cancelSwapBtn.style.display = 'none';
    }
  }

  if (data.status !== 'WORKING') {
    $('#modalLeaveType').value = data.leaveType || 'paid';
    $('#modalReason').value = data.reason || '私用のため';
    $('#modalDetail').value = data.detail || '';
    if (!data.leaveType) {
      $('#modalLeaveType').value = 'paid';
    }
  } else {
    $('#modalLeaveType').value = 'paid';
    $('#modalReason').value = '私用のため';
    $('#modalDetail').value = '';
  }
  
  // Kích hoạt sự kiện change để hiện/ẩn phần chi tiết
  $('#modalReason').dispatchEvent(new Event('change'));
  
  // Nếu đã duyệt thì cho tất cả readonly và ẩn các nút lưu
  const isLocked = serverStatus === 'APPROVED';
  if (isLocked) {
    $('#modalLeaveType').disabled = true;
    $('#modalReason').disabled = true;
    $('#modalDetail').disabled = true;
    btnSave.style.display = 'none';
    $('#btnModalClear').style.display = 'none';
    $('#btnModalCancel').textContent = '閉じる';
  } else {
    $('#modalLeaveType').disabled = false;
    $('#modalReason').disabled = false;
    $('#modalDetail').disabled = false;
    $('#btnModalCancel').textContent = 'キャンセル';
    
    // Cập nhật chữ trên nút clear tùy theo trạng thái hiện tại
    if (!data.leaveType && data.status !== 'WORKING' && data.status !== 'FURIKAE_WORK' && data.status !== 'FURIKAE_OFF') {
      $('#btnModalClear').textContent = '出勤に変更'; // Ngày nghỉ mặc định -> đổi sang đi làm
    } else if (data.leaveType && data.status !== 'WORKING') {
      $('#btnModalClear').textContent = '出勤に変更 (休暇取消)'; // Nghỉ phép -> đổi sang đi làm (hủy nghỉ)
    } else {
      $('#btnModalClear').textContent = '出勤'; // Đã đi làm
      $('#btnModalClear').style.display = 'none'; // Ẩn nếu đã đi làm hoặc furikae
    }
    if (data.status !== 'WORKING' && data.status !== 'FURIKAE_WORK' && data.status !== 'FURIKAE_OFF') {
      $('#btnModalClear').style.display = 'inline-block';
    }

    // Hiện nút「休日に戻す」nếu đây là ngày nghỉ theo lịch mà user đã đổi sang WORKING (không phải furikae)
    const isCalendarHoliday = calendarDataMap[dateStr] === true;
    const revertBtn = $('#btnModalRevert');
    if (revertBtn) {
      if (isCalendarHoliday && data.status === 'WORKING') {
        revertBtn.style.display = 'block';
      } else {
        revertBtn.style.display = 'none';
      }
    }
  }
  
  $('#leaveModal').removeAttribute('hidden');
}

function closeLeaveModal() {
  $('#leaveModal').setAttribute('hidden', '');
}

function saveLeaveModal() {
  const dateStr = $('#modalDateVal').value;
  const leaveType = $('#modalLeaveType').value;
  const reason = $('#modalReason').value;
  const detail = $('#modalDetail').value.trim();
  
  if ((reason === 'other' || leaveType === 'special') && !detail) {
    alert('詳細な理由を入力してください！');
    return;
  }
  
  shiftData[dateStr] = {
    status: 'LEAVE',
    leaveType,
    reason,
    detail
  };
  
  closeLeaveModal();
  renderApp();
}

async function submitShifts() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  const payload = {
    month: monthStr,
    shifts: Object.keys(shiftData).filter(k => k.startsWith(monthStr)).map(k => {
      return {
        date: k,
        ...shiftData[k]
      };
    })
  };
  if (targetUserId) {
    payload.userId = targetUserId;
  }
  
  if (!confirm(`${year}年${month}月のシフトを提出しますか？`)) {
    return;
  }
  
  const spinner = $('#pageSpinner');
  if (spinner) spinner.removeAttribute('hidden');
  
  try {
    const res = await fetchJSONAuth('/api/attendance/shifts/bulk', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    if (res && res.success) {
      alert('シフトを提出しました！');
      // Cập nhật trạng thái ngay để UI chuyển sang PENDING
      serverStatus = 'PENDING';
      renderApp();
    } else {
      alert('エラーが発生しました: ' + (res?.message || 'Unknown'));
    }
  } catch (err) {
    console.error(err);
    alert('サーバーへの接続エラー。');
  } finally {
    if (spinner) spinner.setAttribute('hidden', '');
  }
}

function wireDrawer() {
  const btn = document.querySelector('#mobileMenuBtn');
  const drawer = document.querySelector('#mobileDrawer');
  const close = document.querySelector('#mobileClose');
  const backdrop = document.querySelector('#drawerBackdrop');
  if (!btn || !drawer) return;
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  const open = () => {
    drawer.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.removeAttribute('hidden');
    document.body.classList.add('drawer-open');
  };
  const shut = () => {
    drawer.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    if (backdrop) backdrop.setAttribute('hidden', '');
    document.body.classList.remove('drawer-open');
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (drawer.hasAttribute('hidden')) open();
    else shut();
  });
  if (close) close.addEventListener('click', shut);
  if (backdrop) backdrop.addEventListener('click', shut);
}

export async function bootShiftsPage() {
  init();
  wireUserMenu();
  wireDrawer();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/ui/shifts')) {
    bootShiftsPage();
  }
});
