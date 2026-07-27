import { fetchJSONAuth } from '../api/http.api.js';

// Add esc helper function at the top
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let currentUser = null;
let targetUserId = null;
let currentMonth = new Date();

let shiftData = {}; // key: YYYY-MM-DD, value: object
let serverStatus = null; // Track if the month is already submitted or approved
let calendarDataMap = {}; // Global calendar data map

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
  } catch (e) { /* silently ignored */ }

  try {
    currentUser = await fetchJSONAuth('/api/auth/me');
    if (!currentUser) {
      window.location.replace('/ui/login?next=/ui/shifts');
      return;
    }
    
    // If targetUserId is specified, override currentUser with target user data
    if (targetUserId && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      const targetUser = await fetchJSONAuth(`/api/admin/employees/${targetUserId}`);
      if (targetUser && !targetUser.error) {
        currentUser = targetUser;
      } else {
        alert('指定されたユーザーが見つかりません。');
        targetUserId = null;
      }
    }
    
    // Also update header userName just in case it wasn't in storage
    const el = $('#userName');
    if (el && currentUser) {
      const name = currentUser.username || currentUser.email;
      if (name) el.textContent = name;
    }
    
    // Save updated user to storage only if not overriding
    if (!targetUserId) {
      try {
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (e) { /* silently ignored */ }
    }
    
    // Render user profile info inside the shifts-header box (Now fully handled by renderApp)
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
    
    // Fetch calendar data for the month
    // API provides 'is_off' for each day if it's a company holiday
    calendarDataMap = {};
    const calendarData = calendarDataMap;
    const daysInMonth = getDaysInMonth(year, month);
    
    // Reset data
    shiftData = {};
    serverStatus = null;

    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    // 1. Fetch server shift data first to check if there's already submitted/approved data
    try {
      const q = targetUserId ? `&userId=${targetUserId}` : '';
      const serverRes = await fetchJSONAuth(`/api/attendance/shifts/monthly/${monthStr}?_t=${Date.now()}${q}`); // Add timestamp to bypass cache
      if (serverRes && serverRes.success !== false) { // Assuming response is an array or object containing status
        // Handle array response (if it returns user shifts directly) or object response
        const data = serverRes.data || serverRes;
        
        // Find my status
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
      console.log('No existing shift data found for this month or error fetching', e);
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
    
    // Add Koujibu fallback dict just for rendering
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
      
      // Default initialization if not already set
      if (!shiftData[dateStr]) {
        const isRedDay = calendarData[dateStr] === true;
        const isHolidayForUser = isKoujibu ? calendarData[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
        
        if (isSeishain) {
          // Backend API already accounts for Koujibu policy and returns `is_off` accordingly
          shiftData[dateStr] = { status: !isHolidayForUser ? 'WORKING' : 'LEAVE', leaveType: !isHolidayForUser ? undefined : undefined };
        } else {
          // Baito: Default to WORKING on weekdays, OFF on weekends, similar to Seishain but simpler
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
  
  // Create header structure safely since original might be lost or modified
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

  // Generate empty cells for previous month
  const firstDay = new Date(year, month, 1).getDay();
  const emptyCellsHtml = Array.from({ length: firstDay }).map(() => `<div class="shift-cell empty-cell"></div>`).join('');
  
  // Header row for days of week
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

  // Calculate trailing empty cells
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
  
  // Color the date text based on actual off days
  let isHoliday = false;
  const isRedDay = calendarDataMap[dateStr] === true;
  
  const isKoujibu = String(currentUser.departmentName || '').includes('工事部');
  
  if (isSeishain) {
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    if (isHolidayForUser || (data.status !== 'WORKING' && !data.leaveType)) {
      isHoliday = true;
    }
  } else {
    // For baito, color sundays and red days red. For Koujibu, 4th saturday is red day too.
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    if (isHolidayForUser) isHoliday = true;
  }
  
  if (isHoliday) {
    dayClass += ' sunday';
  } else if (dow === 6) {
    dayClass += ' saturday';
  }
  
  // Calculate Lunar Date
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
      // Fallback or debug
      // If window.Lunar is not available, we can't show lunar date
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
        // System default holiday
        contentHtml = `<div class="status-leave" style="color:#dc2626;">休</div>`;
      } else {
        // User requested leave
        const typeLabel = SEISHAIN_LEAVE_TYPES.find(t => t.value === data.leaveType)?.label || data.leaveType;
        const shortTypeLabel = typeLabel.includes('有給') ? '有休' : (typeLabel.includes('欠勤') ? '欠勤' : typeLabel);
        
        contentHtml = `<div class="status-leave" style="color:#dc2626; font-weight:normal;">${shortTypeLabel}</div>`;
      }
      dayClass += ' is-leave';
    }
    
    // Add logic to disable clicks if approved or pending, except for leave cells where we want to view reason
    const isLocked = serverStatus === 'APPROVED' || serverStatus === 'PENDING';
    const isLeave = data.status !== 'WORKING';
    // If it is a system default holiday (no leaveType specified), we don't need to show reason
    const isSystemHoliday = isLeave && !data.leaveType;
    
    // If it's locked AND (it's a working day OR it's a system holiday), disable pointer events. 
    // If it's a requested leave day, allow clicking to view the reason.
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
    // Baito display logic
    const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
    const isWeekendOrHoliday = isHolidayForUser;
    const offLabel = '休日';
    const shifts = [
      { value: 'OFF', label: offLabel },
      { value: 'WORKING', label: '出勤' }
    ];

    // Add logic to disable clicks if approved
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
      // Revert to default holiday (no leaveType = system holiday)
      shiftData[dateStr] = { status: 'LEAVE' };
      closeLeaveModal();
      renderApp();
    });
    // 振替出勤 button: show swap date picker
    $('#btnModalFurikae').addEventListener('click', () => {
      const swapSection = $('#modalSwapSection');
      const swapSelect = $('#modalSwapDate');
      const saveSwapBtn = $('#btnModalSaveSwap');
      // Populate dropdown with workdays in the month that are not already off/swapped
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const currentDateStr = $('#modalDateVal').value;
      let options = '<option value="">-- 日付を選択 --</option>';
      daysInMonth.forEach(d => {
        const ds = formatDate(d);
        if (ds === currentDateStr) return; // skip self
        const dayData = shiftData[ds];
        const dow = d.getDay();
        const isOff = calendarDataMap[ds] === true || dow === 0 || dow === 6;
        // Only show workdays that are currently WORKING (not already swapped/leave)
        if (dayData && dayData.status === 'WORKING' && !isOff) {
          const dowLabel = ['日','月','火','水','木','金','土'][dow];
          options += `<option value="${esc(ds)}">${esc(ds)} (${dowLabel})</option>`;
        }
      });
      swapSelect.innerHTML = options;
      swapSection.style.display = 'block';
      saveSwapBtn.style.display = 'block';
      // Hide other action buttons while selecting
      $('#btnModalFurikae').style.display = 'none';
      $('#btnModalClear').style.display = 'none';
      $('#btnModalSave').style.display = 'none';
    });
    // Save swap pair
    $('#btnModalSaveSwap').addEventListener('click', () => {
      const holidayDate = $('#modalDateVal').value;
      const compOffDate = $('#modalSwapDate').value;
      if (!compOffDate) {
        alert('代替休日の日付を選択してください。');
        return;
      }
      // Set the holiday as 振替出勤
      shiftData[holidayDate] = { status: 'FURIKAE_WORK', swapDate: compOffDate };
      // Set the workday as 代替休日
      shiftData[compOffDate] = { status: 'FURIKAE_OFF', swapDate: holidayDate };
      closeLeaveModal();
      renderApp();
    });
    // Cancel swap (when viewing a day that already has furikae)
    $('#btnModalCancelSwap').addEventListener('click', () => {
      const dateStr = $('#modalDateVal').value;
      const data = shiftData[dateStr];
      const pairDate = data?.swapDate;
      if (data.status === 'FURIKAE_WORK') {
        // This is a holiday that was marked as swap-work → revert to LEAVE
        if (pairDate && shiftData[pairDate]) {
          shiftData[pairDate] = { status: 'WORKING' }; // Revert comp-off back to working
        }
        shiftData[dateStr] = { status: 'LEAVE' }; // Revert to holiday
      } else if (data.status === 'FURIKAE_OFF') {
        // This is a workday that became comp-off → revert to WORKING
        if (pairDate && shiftData[pairDate]) {
          shiftData[pairDate] = { status: 'LEAVE' }; // Revert swap-work back to holiday
        }
        shiftData[dateStr] = { status: 'WORKING' }; // Revert to working
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
        
        // Update cell background color immediately
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

  // Determine if this day is a system holiday (calendar off-day with no user-requested leave)
  const isCalendarHoliday = calendarDataMap[dateStr] === true;
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const isWeekend = dow === 0 || dow === 6;
  const isSystemHoliday = (isCalendarHoliday || isWeekend) && !data.leaveType && data.status !== 'FURIKAE_OFF';
  // isSystemHoliday = true for:
  //   1. Day is still showing as 休 (status = LEAVE, no leaveType)
  //   2. Day was changed to 出勤 (WORKING) but is still a calendar holiday
  //   3. Day is 振替出勤 (FURIKAE_WORK) — still a calendar holiday being worked

  // Get form elements
  const formLeaveType = $('#modalLeaveType').closest('.form-group');
  const formReason = $('#modalReason').closest('.form-group');
  const formDetail = $('#modalDetailGroup');
  const btnSave = $('#btnModalSave');

  if (isSystemHoliday) {
    // System holiday: hide leave form, only show「出勤に変更」and「振替出勤」
    if (formLeaveType) formLeaveType.style.display = 'none';
    if (formReason) formReason.style.display = 'none';
    if (formDetail) formDetail.style.display = 'none';
    btnSave.style.display = 'none';
    // Show furikae button for holidays not yet changed
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

  // Hide swap section by default
  $('#modalSwapSection').style.display = 'none';
  $('#btnModalSaveSwap').style.display = 'none';

  // If this day is FURIKAE_OFF (代替休日), hide form, only show cancel
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
  // If this day is FURIKAE_WORK (振替出勤), hide form, only show cancel
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

  // Show cancel-swap button if this day is part of a furikae pair
  const cancelSwapBtn = $('#btnModalCancelSwap');
  if (cancelSwapBtn) {
    if (data.status === 'FURIKAE_WORK' || data.status === 'FURIKAE_OFF') {
      cancelSwapBtn.style.display = 'block';
      // Show info about the pair
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
  
  // Trigger change event to show/hide detail
  $('#modalReason').dispatchEvent(new Event('change'));
  
  // If approved, make everything readonly and hide save buttons
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
    
    // Update the clear button text depending on current status
    if (!data.leaveType && data.status !== 'WORKING' && data.status !== 'FURIKAE_WORK' && data.status !== 'FURIKAE_OFF') {
      $('#btnModalClear').textContent = '出勤に変更'; // Default holiday -> Change to Work
    } else if (data.leaveType && data.status !== 'WORKING') {
      $('#btnModalClear').textContent = '出勤に変更 (休暇取消)'; // Leave -> Change to Work (Cancel leave)
    } else {
      $('#btnModalClear').textContent = '出勤'; // Already working
      $('#btnModalClear').style.display = 'none'; // Hide if already working or furikae
    }
    if (data.status !== 'WORKING' && data.status !== 'FURIKAE_WORK' && data.status !== 'FURIKAE_OFF') {
      $('#btnModalClear').style.display = 'inline-block';
    }

    // Show「休日に戻す」button if this is a calendar holiday and user changed it to WORKING (not furikae)
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
      // Update status immediately so UI refreshes to PENDING
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
