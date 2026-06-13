import { me } from '../api/auth.api.js';
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
    currentUser = await me();
    if (!currentUser) {
      window.location.replace('/ui/login');
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
    alert('ユーザー情報の読み込みに失敗しました。\n' + err.message + '\n' + err.stack);
  } finally {
    if (spinner) spinner.setAttribute('hidden', '');
    document.documentElement.classList.remove('portal-preboot');
  }
}

function wireUserMenu() {
  const btn = document.querySelector('.user .user-btn');
  const dd = document.querySelector('#userDropdown');
  if (!btn || !dd) return;
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const isHidden = dd.hasAttribute('hidden');
    if (isHidden) {
      dd.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      dd.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target?.closest('.user-menu') || e.target?.closest('.user')) return;
    dd.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
  });

  const btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace('/ui/login');
    });
  }
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
  
  if (allEmployeesShifts.length === 0) {
    tbodyHtml = `<tr><td colspan="${3 + days.length}" style="text-align: center; padding: 20px;">データがありません</td></tr>`;
  } else {
    allEmployeesShifts.forEach(emp => {
      const isSeishain = emp.employment_type === 'full_time' || emp.employment_type === '正社員';
      const typeStr = isSeishain ? '正社員' : 'アルバイト';
      
      let rowHtml = `
        <tr>
          <td style="position: sticky; left: 0; background: #fff; z-index: 5; font-weight: bold;">${esc(emp.username)}</td>
          <td>${esc(emp.departmentName || '')}</td>
          <td>${typeStr}</td>
      `;
      
      days.forEach(d => {
        const dowStr = getDayOfWeek(d);
        const dateStr = formatDate(d);
        const shift = emp.schedule && emp.schedule[dateStr];
        let cellHtml = '';
        
        const dow = d.getDay();
        const isKoujibu = String(emp.departmentName || '').includes('工事部');
        const isRedDay = calendarDataMap[dateStr] === true;
        // Check if the user has specific calendar based on department
        const isHolidayForUser = isKoujibu ? calendarDataMap[`${dateStr}_koujibu`] === true || isRedDay : (dow === 0 || dow === 6 || isRedDay);
        const isWeekendOrHoliday = isHolidayForUser;
        
        if (isSeishain) {
          if (shift && shift.status === 'LEAVE') {
            let label = '休';
            if (shift.leaveType === 'paid') label = '有休';
            else if (shift.leaveType === 'unpaid') label = '欠勤';
            cellHtml = `<div style="color: #dc2626; font-weight: bold; font-size: 12px;">${label}</div>`;
          } else {
             if (isWeekendOrHoliday && (!shift || shift.status !== 'WORKING')) {
                 cellHtml = `<div style="color: #dc2626; font-size: 12px;">休</div>`;
             } else {
                 cellHtml = `<div style="color: #16a34a; font-size: 12px;">出勤</div>`;
             }
          }
        } else {
          if (shift && shift.status === 'WORKING') {
            cellHtml = `<div style="color: #16a34a; font-size: 12px;">出勤</div>`;
          } else {
            if (isWeekendOrHoliday) {
              cellHtml = `<div style="color: #dc2626; font-size: 12px;">休</div>`;
            } else {
              cellHtml = `<div style="color: #94a3b8; font-size: 12px;">休み</div>`;
            }
          }
        }
        
        rowHtml += `<td style="text-align: center; vertical-align: middle;">${cellHtml}</td>`;
      });
      
      rowHtml += `</tr>`;
      tbodyHtml += rowHtml;
    });
  }

  const html = `
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
        
        <div style="font-weight: bold; font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          全員のシフト状況
        </div>
      </div>

      <div style="overflow-x: auto; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
        <table style="width: 100%; border-collapse: collapse; min-width: 800px; font-size: 13px;">
          <thead style="background: #334155; color: white;">
            ${theadHtml}
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  app.innerHTML = html;
  
  // Attach styling for table cells dynamically
  $$('td, th', app).forEach(cell => {
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
