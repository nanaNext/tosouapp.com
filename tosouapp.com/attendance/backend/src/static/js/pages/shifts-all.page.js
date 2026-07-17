import { fetchJSONAuth } from '../api/http.api.js';

// Add esc helper function at the top
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let currentUser = null;
let currentMonth = new Date();

let shiftData = {}; // key: YYYY-MM-DD, value: object
let serverStatus = null; // Track if the month is already submitted or approved

const SEISHAIN_LEAVE_TYPES = [
  { value: 'paid', label: '有給休暇' },
  { value: 'unpaid', label: '欠勤 / 無給休暇' },
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
    if (!currentUser || currentUser.error) {
      window.location.replace('/ui/login?next=/ui/shifts-all');
      return;
    }
    
    // Also update header userName just in case it wasn't in storage
    const el = $('#userName');
    if (el && currentUser) {
      const name = currentUser.username || currentUser.email;
      if (name) el.textContent = name;
    }
    
    // Save updated user to storage
    try {
      sessionStorage.setItem('user', JSON.stringify(currentUser));
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (e) { /* silently ignored */ }
    
    // Render user profile info inside the shifts-header box
    const isSeishain = currentUser.employment_type === 'full_time' || currentUser.employment_type === '正社員';
    
    await loadMonthData(currentMonth.getFullYear(), currentMonth.getMonth());
    renderApp();
  } catch (err) {
    console.error(err);
    if (err.message && (err.message.includes('Invalid or expired token') || err.message.includes('No token provided'))) {
      window.location.replace('/ui/login?next=/ui/shifts-all');
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

let allEmployeesShifts = [];
let calendarDataMap = {};

async function loadMonthData(year, month) {
  try {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const res = await fetchJSONAuth(`/api/attendance/shifts/all-employees?month=${monthStr}`);
    allEmployeesShifts = Array.isArray(res) ? res : [];
    
    // Fetch calendar data
    calendarDataMap = {};
    const daysInMonth = getDaysInMonth(year, month);
    await Promise.all(daysInMonth.map(async (d) => {
      const dateStr = formatDate(d);
      const dow = d.getDay();
      try {
        const cal = await fetchJSONAuth(`/api/attendance/calendar/day/${encodeURIComponent(dateStr)}`);
        calendarDataMap[dateStr] = Number(cal?.is_off || 0) === 1;
      } catch (e) {
        calendarDataMap[dateStr] = dow === 0 || dow === 6;
      }
    }));
    
    // Fallback dictionary for Koujibu (for 4th Saturday)
    daysInMonth.forEach(d => {
      const dateStr = formatDate(d);
      const dow = d.getDay();
      const isSunday = dow === 0;
      const is4thSaturday = dow === 6 && d.getDate() >= 22 && d.getDate() <= 28;
      calendarDataMap[`${dateStr}_koujibu`] = isSunday || is4thSaturday;
    });
  } catch (err) {
    console.error('Failed to load all employees shifts', err);
    allEmployeesShifts = [];
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
  const app = $('#shiftsApp');
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getDaysInMonth(year, month);
  
  let theadHtml = `
    <tr>
      <th style="min-width: 150px; position: sticky; left: 0; background: #334155; z-index: 10;">従業員名</th>
      <th style="min-width: 100px;">部署</th>
      <th style="min-width: 100px;">雇用形態</th>
      ${days.map(d => {
        const dow = d.getDay();
        const dowStr = getDayOfWeek(d);
        let color = '#fff';
        if (dow === 0) color = '#fca5a5';
        else if (dow === 6) color = '#93c5fd';
        
        let lunarText = '';
        try {
          if (typeof window.Lunar !== 'undefined') {
            const lunarDate = window.Lunar.fromDate(d);
            const lDay = lunarDate.getDay();
            const lMonth = lunarDate.getMonth();
            if (lDay === 1) {
              lunarText = `${lMonth}/${lDay}`;
            } else {
              lunarText = `${lDay}`;
            }
          }
        } catch (e) {}
        
        const lunarHtml = lunarText ? `<br><span style="font-size: 10px; color: #94a3b8; font-weight: normal;">${esc(lunarText)}</span>` : '';
        
        return `<th style="min-width: 40px; color: ${color};">${d.getDate()}<br><span style="font-size: 10px;">${dowStr}</span>${lunarHtml}</th>`;
      }).join('')}
    </tr>
  `;

  let tbodyHtml = '';
  let mobileHtml = '<div class="shift-mobile-list">';
  
  if (allEmployeesShifts.length === 0) {
    tbodyHtml = `<tr><td colspan="${3 + days.length}" style="text-align: center; padding: 20px;">データがありません</td></tr>`;
    mobileHtml += `<div style="padding: 20px; text-align: center; color: #94a3b8;">データがありません</div>`;
  } else {
    allEmployeesShifts.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time' || emp.employment_type === '正社員' || emp.employment_type === '正';
      const typeStr = isSeishain ? '正' : 'パート';
      
      let rowHtml = `
        <tr>
          <td style="position: sticky; left: 0; background: #fff; z-index: 5; font-weight: bold;">
            <a href="/ui/shifts?userId=${emp.id}" style="color: #2563eb; text-decoration: none;" title="この従業員のシフトを編集する">${esc(emp.username)}</a>
          </td>
          <td>${esc(emp.departmentName || '')}</td>
          <td>${typeStr}</td>
      `;
      
      let workCount = 0;
      
      // Find the day of week for the 1st of the month to add empty padding cells
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      let mobileDaysHtml = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 0;">';
      
      // Add empty cells for days before the 1st
      for (let i = 0; i < firstDayOfMonth; i++) {
        mobileDaysHtml += `<div class="sac-day-item empty" style="border: none; background: transparent;"></div>`;
      }

      days.forEach(d => {
        const dowStr = getDayOfWeek(d);
        const dateStr = formatDate(d);
        const shift = emp.schedule && emp.schedule[dateStr];
        let cellHtml = '';
        let cellMobileHtml = '-';
        
        const dow = d.getDay();
        const isKoujibu = String(emp.departmentName || '').includes('工事部');
        const isRedDay = calendarDataMap[dateStr] === true;
        
        // Xác định thứ 7 tuần thứ 4
        const is4thSaturday = dow === 6 && Math.ceil(d.getDate() / 7) === 4;

        // Check if the user has specific calendar based on department
        let isHolidayForUser = false;
        if (isKoujibu) {
          isHolidayForUser = calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay;
        } else {
          if (isSeishain) {
            // Nhân viên chính thức: Chủ nhật, Lễ, và Thứ 7 tuần thứ 4 là ngày nghỉ
            // Các thứ 7 khác được tính là ngày đi làm bình thường
            isHolidayForUser = dow === 0 || isRedDay || is4thSaturday;
          } else {
            // Part-time: Nghỉ Thứ 7, Chủ nhật, Lễ
            isHolidayForUser = dow === 0 || dow === 6 || isRedDay;
          }
        }
        const isWeekendOrHoliday = isHolidayForUser;
        
        let cellText = '';
        let cellClass = '';
        let cellTextColor = '';
        
        if (shift && shift.status === 'LEAVE') {
          if (shift.leaveType === 'paid') {
            cellText = '有休';
            cellClass = 'status-paid';
            cellTextColor = '#d97706'; // Amber
          } else if (shift.leaveType === 'unpaid') {
            cellText = '欠';
            cellClass = 'status-unpaid';
            cellTextColor = '#9333ea'; // Purple
          } else {
            cellText = '休';
            cellClass = 'status-holiday';
            cellTextColor = '#dc2626'; // Red
          }
        } else if (isWeekendOrHoliday && (!shift || shift.status !== 'WORKING')) {
          cellText = '休';
          cellClass = 'status-holiday';
          cellTextColor = '#dc2626'; // Red
        } else if (shift && shift.status === 'WORKING') {
          if (isWeekendOrHoliday) {
            cellText = '出'; // 休日出勤
            cellClass = 'status-holiday-work';
            cellTextColor = '#0284c7'; // Blue/Teal
          } else {
            cellText = '出勤';
            cellClass = 'status-working';
            cellTextColor = '#16a34a'; // Green
          }
          workCount++;
        } else {
          cellText = '休'; // Đồng bộ part-time và seishain đều dùng '休' nếu không có lịch
          cellClass = 'status-empty';
          cellTextColor = '#94a3b8'; // Gray
        }

        // Add visual indicator if there's a reason or detail
        let indicator = '';
        if (shift && shift.status === 'LEAVE') {
          const hasReason = shift.reason && shift.reason !== '' && shift.reason !== 'other';
          const hasDetail = shift.detail && shift.detail.trim() !== '';
          if (hasReason || hasDetail) {
            indicator = '<div style="width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; position: absolute; top: 2px; right: 2px;" title="理由あり"></div>';
          }
        }
        
        const tooltipTitle = (shift && shift.status === 'LEAVE') ? `理由: ${shift.reason || 'なし'}${shift.detail ? ` - ${shift.detail}` : ''}` : '';
        const titleAttr = tooltipTitle ? `title="${tooltipTitle}"` : '';
        const cursorStyle = tooltipTitle ? 'cursor: help;' : '';
        
        cellHtml = `<div class="shift-cell ${cellClass}" style="color: ${cellTextColor}; font-weight: bold; font-size: 12px; position: relative; width: 100%; height: 100%; min-height: 20px; display: flex; align-items: center; justify-content: center;" ${titleAttr}><span class="shift-text">${cellText}</span><div class="shift-line"></div>${indicator}</div>`;
        cellMobileHtml = cellText;
        
        rowHtml += `<td class="print-cell ${cellClass}" style="text-align: center; vertical-align: middle; padding: 4px;">${cellHtml}</td>`;
        
        let headerColor = '#0f172a';
        if (dow === 0) headerColor = '#dc2626';
        else if (dow === 6) headerColor = '#2563eb';
        
        const st = shift || {};
        let statusLabel = '';
        let statusColor = '#0f172a'; // Default dark text
        
        if (st.status === 'WORKING') {
          statusLabel = '出';
          statusColor = '#1e40af'; // Blue for working
        } else if (st.status === 'OFF') {
          statusLabel = '休';
          statusColor = '#ef4444'; // Red for holiday
        } else if (st.status === 'LEAVE') {
          if (st.leaveType && st.leaveType !== 'paid' && st.leaveType !== 'special' && st.leaveType !== 'absence') {
            statusLabel = '休'; // Handle legacy string types
          } else if (st.leaveType === 'paid') {
            statusLabel = '有休';
          } else if (st.leaveType === 'special') {
            statusLabel = '特休';
          } else if (st.leaveType === 'absence') {
            statusLabel = '欠勤';
          } else {
            statusLabel = '休';
          }
          statusColor = '#ef4444'; // Red for leave
        } else {
          statusLabel = '未';
          statusColor = '#94a3b8'; // Gray for unassigned
        }
        
        mobileDaysHtml += `
          <div class="sac-day-item" style="border: 1px solid #e2e8f0; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 42px; background: ${statusColor === '#ef4444' ? '#fef2f2' : '#fff'}; box-sizing: border-box;">
            <div style="font-size: 11px; color: ${headerColor}; font-weight: bold; line-height: 1.2;">${d.getDate()}</div>
            <div style="font-size: 12px; font-weight: bold; color: ${statusColor}; margin-top: 2px;">${statusLabel}</div>
          </div>
        `;
      });
      mobileDaysHtml += `</div>`; // Close grid container
      
      rowHtml += `</tr>`;
      tbodyHtml += rowHtml;
      
      mobileHtml += `
        <div class="sac-card">
          <div class="sac-header">
            <div class="sac-name-wrap">
              <a href="/ui/shifts?userId=${emp.id}" style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 14px;">${esc(emp.username)}</a>
              <span class="${isSeishain ? 'badge-sei' : 'badge-bai'}">${typeStr}</span>
            </div>
          </div>
          <div class="sac-summary">
            <span class="sac-total-label">月計 (出勤日数):</span>
            <span class="sac-total-val" style="font-weight:700; color:#0f172a;">${workCount}日</span>
          </div>
          <div class="sac-days-scroll" style="overflow-x: hidden; display: flex; justify-content: center; padding-bottom: 8px;">
            <div style="width: 100%; max-width: 350px;">
              <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 4px 0 2px 0;">
                ${['日', '月', '火', '水', '木', '金', '土'].map((d, i) => `<div style="text-align: center; font-size: 11px; font-weight: bold; color: ${i===0?'#ef4444':i===6?'#3b82f6':'#64748b'};">${d}</div>`).join('')}
              </div>
              ${mobileDaysHtml}
            </div>
          </div>
        </div>
      `;
    });
  }
  mobileHtml += `</div>`;

  const html = `
    <style>
      .shift-line { display: none; }
      .badge-sei { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #bfdbfe; }
      .badge-bai { background: #f8fafc; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #cbd5e1; }
      
      .shift-mobile-list {
        display: none;
        padding: 0;
        flex-direction: column;
        gap: 12px;
      }
      .sac-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
      }
      .sac-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
      }
      .sac-name-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sac-name {
        font-weight: 700;
        font-size: 15px;
        color: #0f172a;
      }
      .sac-summary {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 13px;
        color: #475569;
      }
      .sac-days-scroll {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        padding-bottom: 8px;
        margin-bottom: 8px;
      }
      .sac-day-item {
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #fff;
      }
      .sac-day-header {
        width: 100%;
        text-align: center;
        font-size: 10px;
        background: #f8fafc;
        padding: 2px 0;
        border-bottom: 1px solid #e2e8f0;
        font-weight: 600;
      }
      .sac-day-val {
        width: 100%;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      
      @media (max-width: 768px) {
        .shifts-desktop-table { display: none !important; }
        .shift-mobile-list { display: flex !important; }
      }
    </style>
    <div class="shifts-container" style="max-width: 100%; overflow-x: auto;">
      <div class="shifts-header" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #1e3a8a;">
        <div class="shifts-top-nav" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; width: 100%;">
          <div class="shifts-top-nav-left">
            <a href="/ui/shifts" style="padding: 8px 16px; border: 1px solid #d1d5db; background: #f8fafc; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #334155; display: flex; align-items: center; gap: 6px; text-decoration: none; transition: all 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              戻る
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
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 2px 0; width: 100%;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="font-weight: bold; font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            全員のシフト状況
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btnPrint" class="modern-btn" style="background: #64748b; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              印刷
            </button>
            <button id="btnExportExcel" class="modern-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Excel出力
            </button>
          </div>
        </div>
      </div>

      <div class="shifts-desktop-table" style="overflow-x: auto; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
        <table style="width: 100%; border-collapse: collapse; min-width: 800px; font-size: 13px;">
          <thead style="background: #334155; color: white;">
            ${theadHtml}
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
        </table>
      </div>
      ${mobileHtml}
    </div>
  `;
  
  app.innerHTML = html;
  
  // Attach styling for table cells dynamically
  $$('.shifts-desktop-table td, .shifts-desktop-table th', app).forEach(cell => {
    cell.style.border = '1px solid #e2e8f0';
    cell.style.padding = '8px 4px';
  });

  attachEvents();
}

function attachEvents() {
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

  const btnExportExcel = $('#btnExportExcel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      // Chuyển hướng trình duyệt để tải file
      window.location.href = `/api/attendance/shifts/all-employees/export?year=${year}&month=${month}`;
    });
  }

  const btnPrint = $('#btnPrint');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      const tableDiv = document.querySelector('.shifts-desktop-table');
      if (!tableDiv) return;
      
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');

      // Calculate department summary for print header
      const deptCounts = {};
      allEmployeesShifts.forEach(emp => {
        const dept = emp.departmentName || '未配属';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const deptSummaryStr = Object.entries(deptCounts).map(([k, v]) => `${k}: ${v}名`).join('　');
      const allEmployees = allEmployeesShifts;

      // Mở một cửa sổ mới để in, tránh bị xung đột CSS với trang hiện tại
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('ポップアップがブロックされました。ブラウザの設定で許可してください。');
        return;
      }
      
      const tableHtml = tableDiv.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ja">
          <head>
            <meta charset="utf-8">
            <title>シフト印刷</title>
            <style>
              @page { 
                size: landscape; /* Cho phép người dùng tự do chọn A3, A4... trên hộp thoại in */
                margin: 15mm 10mm; /* Tăng lề trên để không bị mất tiêu đề */
              }
              body { 
                font-family: "Noto Sans JP", sans-serif; 
                margin: 0; 
                padding: 0; 
                background: #fff; 
                color: #000; 
              }
              h2 { 
                text-align: center; 
                margin: 0 0 20px 0; 
                font-size: 20px; 
                color: #0f172a;
                padding-top: 10px; /* Thêm padding để chắc chắn tiêu đề không dính mép giấy */
              }
              .print-container {
                width: 100%;
              }
              table { 
                width: 100% !important; 
                border-collapse: collapse; 
                table-layout: fixed !important; /* Đổi thành fixed để ép nhỏ các cột ngày */
              }
              th, td { 
                border: 1px solid #94a3b8 !important; 
                padding: 1px !important; /* Thu nhỏ padding để tiết kiệm diện tích tối đa */
                text-align: center !important; 
                font-size: 10px !important; 
                word-break: keep-all !important; 
                white-space: nowrap !important; 
                position: static !important; 
                min-width: 0 !important; 
              }
              th { 
                background-color: #334155 !important; 
                color: white !important; 
              }
              th span, th div, td div {
                font-size: 10px !important;
              }
              /* Ẩn toàn bộ chữ khi in, chỉ hiển thị màu nền */
              .shift-text { 
                display: none !important; 
              }
              /* Vẽ một vạch ngang ở giữa ô thay vì tô full nền */
              .shift-line {
                display: block !important;
                width: 70% !important;
                height: 6px !important;
                border-radius: 2px !important;
                margin: 0 auto !important;
              }
              .shift-cell { 
                display: flex !important; 
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important; 
                height: 18px !important; 
                min-height: 18px !important; 
              }
              
              /* Định nghĩa màu sắc cho các vạch ngang khi in */
              td.status-working .shift-line { background-color: #22c55e !important; } /* Xanh lá: 出勤 */
              td.status-holiday .shift-line { background-color: #f97316 !important; } /* Cam nhạt: 休 (thay cho đỏ tươi) */
              td.status-paid .shift-line { background-color: #eab308 !important; } /* Vàng: 有休 */
              td.status-unpaid .shift-line { background-color: #a855f7 !important; } /* Tím: 欠 */
              td.status-holiday-work .shift-line { background-color: #06b6d4 !important; } /* Xanh lơ: 休日出勤 */
              td.status-empty .shift-line { background-color: #cbd5e1 !important; } /* Xám nhạt: Không có lịch */

              /* Thu hẹp tối đa các cột ngày tháng */
              th:nth-child(n+4), td:nth-child(n+4) {
                width: 15px !important;
              }
              th:nth-child(1) { width: 80px !important; } /* Tên NV */
              th:nth-child(2) { width: 40px !important; } /* Bộ phận */
              th:nth-child(3) { width: 30px !important; } /* Chức vụ */

              /* Bắt buộc in màu nền */
              * { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <h2 style="margin-bottom:4px;">飯塚塗研株式会社</h2>
              <h3 style="text-align:center;margin:0 0 4px 0;font-size:16px;color:#334155;">全員のシフト状況 - ${year}年${month}月</h3>
              <p style="text-align:center;margin:0 0 12px 0;font-size:11px;color:#64748b;">総人数: ${allEmployees.length}名　　${deptSummaryStr}</p>
              ${tableHtml}
              <div style="margin-top:16px;padding:8px 0;border-top:1px solid #e2e8f0;">
                <p style="font-weight:bold;font-size:11px;margin:0 0 6px 0;">【凡例】色の説明</p>
                <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:10px;">
                  <span><span style="display:inline-block;width:20px;height:6px;background:#22c55e;border-radius:2px;vertical-align:middle;"></span> 出勤（通常勤務）</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#f97316;border-radius:2px;vertical-align:middle;"></span> 休日（会社カレンダー休日）</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#eab308;border-radius:2px;vertical-align:middle;"></span> 有休（有給休暇）</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#a855f7;border-radius:2px;vertical-align:middle;"></span> 欠勤（無給）</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#06b6d4;border-radius:2px;vertical-align:middle;"></span> 休日出勤</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#cbd5e1;border-radius:2px;vertical-align:middle;"></span> 未登録</span>
                </div>
                <p style="font-size:9px;color:#64748b;margin:6px 0 0 0;">※ パート社員は固定休日なし。登録した日のみ「出勤」扱い。</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    });
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

document.addEventListener('DOMContentLoaded', () => {
  init();
  wireUserMenu();
  wireDrawer();
});
