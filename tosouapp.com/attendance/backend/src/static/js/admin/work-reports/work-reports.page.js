import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';

const $ = (sel) => document.querySelector(sel);
const isYM = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
const monthJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtTime = (dt) => {
  if (!dt) return '—';
  const s = String(dt);
  return s.length >= 16 ? s.slice(11, 16) : s;
};
const statusMeta = (status) => {
  if (status === 'submitted') return { label: '提出済', style: 'background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;' };
  if (status === 'missing') return { label: '未提出', style: 'background:#fff1f1;color:#991b1b;border-color:#ffcccc;' };
  if (status === 'checkout_missing') return { label: '退勤漏れ', style: 'background:#fff1f1;color:#991b1b;border-color:#ffb4b4;' };
  if (status === 'checkout_missing_submitted') return { label: '退勤漏れ(入力済み)', style: 'background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;' };
  if (status === 'monthly_input_only') return { label: '月次入力済み（打刻なし）', style: 'background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;' };
  if (status === 'off') return { label: '休日', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'paid_leave') return { label: '有給休暇', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'unpaid_leave') return { label: '無給休暇', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
  if (status === 'absence') return { label: '欠勤', style: 'background:#fff1f1;color:#991b1b;border-color:#ffcccc;' };
  if (status === 'not_punched') return { label: '打刻なし', style: 'background:#fff1f1;color:#991b1b;border-color:#ffcccc;' };
  if (status === 'working') return { label: '勤務中', style: 'background:#f8fafc;color:#475569;border-color:#cbd5e1;' };
  return { label: '—', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
};
const workTypeLabel = (value) => {
  if (value === 'onsite') return '出社';
  if (value === 'remote') return '在宅';
  if (value === 'satellite') return '現場・出張';
  return '—';
};
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const effectiveStatus = (it) => {
  const st = String(it?.status || '');
  const hasContent = !!(String(it?.site || '').trim() || String(it?.work || '').trim());
  if (st === 'checkout_missing' && hasContent) return 'checkout_missing_submitted';
  if (st !== 'working') return st;
  const d = String(it?.date || '').slice(0, 10);
  const hasOut = !!it?.attendance?.checkOut;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < todayJST() && !hasOut) {
    return hasContent ? 'checkout_missing_submitted' : 'checkout_missing';
  }
  return st;
};
const dowClass = (w) => {
  const s = String(w || '').trim();
  if (s === '土') return 'wr-dow-sat';
  if (s === '日') return 'wr-dow-sun';
  if (s === '月' || s === '火' || s === '水' || s === '木' || s === '金') return 'wr-dow-weekday';
  return '';
};
const weekdayJa = (dateStr) => {
  const s = String(dateStr || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  const idx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return labels[idx] || '';
};

const showSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    if (el) { el.removeAttribute('hidden'); el.style.display = 'grid'; }
  } catch (e) { /* silently ignored */ }
};
const hideSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }
  } catch (e) { /* silently ignored */ }
};

export async function mount() {
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';
  const tableVhExpr = isStandalone ? 'calc(100vh - 120px)' : 'calc(100vh - var(--topbar-height) - var(--subbar-height) - 120px)';

  const content = document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (content && content.id === 'attendanceHubContent') {
    content.style.padding = '16px 24px';
    content.style.background = '#FFFFFF';
  }

  if (content) {
    content.innerHTML = '<div style="color:#475569;font-weight:650;">読み込み中…</div>';
  }

  const profile = await requireAdmin();
  if (!profile || !content) return;

  const params = new URLSearchParams(window.location.search);
  const initMonth = isYM(params.get('month')) ? String(params.get('month')) : monthJST();
  const initSort = String(params.get('sort') || 'dateDesc');
  const initDept = String(params.get('dept') || '');
  const initQ = String(params.get('q') || '');
  const initGroup = String(params.get('group') || '') === '1';
  const state = { month: initMonth, sort: initSort, dept: initDept, q: initQ, group: initGroup, items: [] };

  content.innerHTML = '';
  
  const layout = document.createElement('div');
  layout.style.cssText = `display: flex; flex-direction: column; height: ${vhExpr}; background: #FFFFFF; font-family: Inter, 'Noto Sans JP', sans-serif; overflow: hidden;`;
  
  layout.innerHTML = `
    <style>
      .wr-input { height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 10px; font-size: 13px; color: #0f172a; outline: none; background: #fff; box-sizing: border-box; }
      .wr-input:focus { border-color: #3b82f6; }
      .wr-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; flex-shrink: 0; }
      .wr-btn { height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; outline: none; transition: all .15s; }
      .wr-btn-dl { background: #10b981; color: #fff; gap: 6px; }
      .wr-btn-dl:hover { background: #059669; }
      .wr-table { width: 100%; border-collapse: collapse; min-width: 1000px; font-size: 13px; table-layout: auto; }
      .wr-table th { padding: 6px 12px; font-size: 12px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; font-weight: 500; text-align: left; white-space: nowrap; }
      .wr-table td { padding: 6px 12px; vertical-align: middle; border: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
      .wr-table tbody tr:hover td { background: #f8fafc; }
      .wr-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid transparent; white-space: nowrap; }
      .wr-dow-sat { color: #d97706; }
      .wr-dow-sun { color: #dc2626; }
      .wr-off-row td { background: #fff5f5 !important; }
      .wr-off-row:hover td { background: #fee2e2 !important; }
    </style>
    <div style="flex-shrink: 0; padding-bottom: 12px;">
      <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; letter-spacing: -0.01em; margin-bottom: 12px;">作業報告</h2>
      <div class="wr-toolbar">
        <input id="wrMonth" type="month" class="wr-input wr-month" value="${state.month}">
        <select id="wrSort" class="wr-input wr-select wr-sort">
          <option value="dateDesc" ${state.sort === 'dateDesc' ? 'selected' : ''}>日付↓ / 社員↑</option>
          <option value="employee" ${state.sort === 'employee' ? 'selected' : ''}>社員↑ / 日付↓</option>
          <option value="name" ${state.sort === 'name' ? 'selected' : ''}>氏名↑ / 日付↓</option>
          <option value="department" ${state.sort === 'department' ? 'selected' : ''}>部署↑ / 社員↑ / 日付↓</option>
          <option value="missingFirst" ${state.sort === 'missingFirst' ? 'selected' : ''}>未提出を上に</option>
        </select>
        <select id="wrDept" class="wr-input wr-select wr-dept">
          <option value="">全部署</option>
        </select>
        <input id="wrSearch" type="text" class="wr-input wr-text wr-query" placeholder="社員番号/氏名で検索" value="${esc(state.q)}">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155;cursor:pointer;">
          <input type="checkbox" id="wrGroup" ${state.group ? 'checked' : ''}> 社員ごとにまとめる
        </label>
        <button id="wrExport" class="wr-btn wr-btn-dl" type="button">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Excel
        </button>
      </div>
      <div id="wrSummary" style="font-size: 13px; color: #475569; font-weight: 600;"></div>
    </div>
    <div class="wr-table-wrap" id="wrTable">
      </div>
  `;
  content.appendChild(layout);

  const setUrl = () => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('month', state.month);
      u.searchParams.set('sort', state.sort);
      if (state.dept) u.searchParams.set('dept', state.dept);
      else u.searchParams.delete('dept');
      if (state.q) u.searchParams.set('q', state.q);
      else u.searchParams.delete('q');
      if (state.group) u.searchParams.set('group', '1');
      else u.searchParams.delete('group');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* silently ignored */ }
  };

  let currentPage = 1;
  const pageSize = 10;

  const renderRows = (items, resetPage = false) => {
    if (resetPage) currentPage = 1;
    const tableHost = $('#wrTable');
    if (!tableHost) return;
    if (!items.length) {
      tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>出勤データがありません</div></div>';
      return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    const rows = pageItems.map((it) => {
      const dash = `<span style="color:#cbd5e1;">—</span>`;
      const code = it.employeeCode || `EMP${String(it.userId).padStart(3, '0')}`;
      const stx = effectiveStatus(it);
      const meta = statusMeta(stx);
      let kubunStr = String(it.kubun || '').trim();
      if (kubunStr === '休日出勤' && !it.attendance?.checkIn && !it.attendance?.checkOut && (!it.site && !it.work)) {
        kubunStr = '休日';
      }
      const kubun = kubunStr ? esc(kubunStr) : dash;
      const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
      const rawWork = String(it.work || '').trim();
      const work = rawWork ? esc(rawWork) : dash;
      const dept = String(it.departmentName || '').trim() ? esc(String(it.departmentName).trim()) : dash;
      const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
      const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
      const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;

      // Auto-detect late/early based on time if not manually set in DB
      let autoLateStr = '';
      if (it.attendance?.checkIn) {
        const cin = fmtTime(it.attendance.checkIn);
        const isPartTime = String(it.role || '').toLowerCase() === 'part_time' || String(it.employment_type || '').toLowerCase() === 'part_time' || String(it.employment_type || '') === 'アルバイト';
        // Koujibu standard start is 08:00, but Part-time can have flexible shifts like 09:00.
        // For simplicity, we use 09:00 as the threshold for Part-time in Koujibu unless a specific shift dictates otherwise.
        const threshold = (it.departmentName || '').includes('工事') && !isPartTime ? '08:00' : '09:00';
        if (cin > threshold && it.status !== '休日出勤') {
          const [h1, m1] = cin.split(':').map(Number);
          const [h2, m2] = threshold.split(':').map(Number);
          const diff = (h1 * 60 + m1) - (h2 * 60 + m2);
          if (diff > 0 && !it.lateMinutes) it.lateMinutes = diff; // override for display
        }
      }

      const formatDelay = (mins) => {
        if (!mins || isNaN(mins)) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}時間${m}分`;
        if (h > 0) return `${h}時間`;
        return `${m}分`;
      };

      const lateStr = Number(it.lateMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">[遅刻]</span> (${formatDelay(it.lateMinutes)})` : '';
      const earlyStr = Number(it.earlyMinutes) > 0 ? `<span style="color:#ef4444;font-weight:bold;">[早退]</span> (${formatDelay(it.earlyMinutes)})` : '';
      let lateEarlyCombo = [lateStr, earlyStr].filter(Boolean).join(' / ');
      
      // Đọc dữ liệu từ cột 備考 (notes) của attendance_daily
      const combinedReasonMemo = [it.notes].filter(Boolean).join(' - ');
      const tooltip = combinedReasonMemo ? `title="${esc(combinedReasonMemo)}"` : '';
      const displayReason = combinedReasonMemo.length > 20 ? combinedReasonMemo.substring(0, 20) + '...' : combinedReasonMemo;

      const reasonHtml = ''; // Remove reason from lateEarlyHtml since it has its own column now
      
      const lateEarlyHtml = (lateEarlyCombo || dash) + reasonHtml;

      const dc = dowClass(it.weekday);
      const displayDate = it.date ? it.date.replace(/-/g, '/') : '';
      // Calculate holiday from backend flag
      const isHoliday = !!it.holiday;
      const isPublicHoliday = isHoliday && it.weekday !== '土' && it.weekday !== '日';
      const dowColor = dc === 'wr-dow-sun' ? 'color:#ef4444; background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'color:#d97706; background:#fffbeb;' : (isPublicHoliday ? 'color:#ef4444; background:#fef2f2;' : 'color:#64748b;'));
      
      const rowBg = (dc === 'wr-dow-sun' || isPublicHoliday) ? 'background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'background:#fffbeb;' : '');
      const textColor = (dc === 'wr-dow-sun' || isPublicHoliday) ? 'color:#ef4444;' : (dc === 'wr-dow-sat' ? 'color:#d97706;' : '');

      return `
        <tr style="${rowBg}">
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(displayDate)}</td>
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(isPublicHoliday ? '祝' : (it.weekday || ''))}</td>
          <td style="white-space:nowrap; ${textColor}">${esc(code)}</td>
          <td style="font-weight:500; white-space:nowrap; ${textColor}">${esc(it.username || '')}</td>
          <td style="white-space:nowrap; ${textColor}">${dept}</td>
          <td style="white-space:nowrap; ${textColor}">${kubun}</td>
          <td style="font-family:monospace; font-size:14px; white-space:nowrap; ${textColor}">${checkIn}</td>
          <td style="font-family:monospace; font-size:14px; white-space:nowrap; ${textColor}">${checkOut}</td>
          <td style="white-space:nowrap; ${textColor}">${wType}</td>
          <td style="white-space:nowrap; ${textColor}">${site}</td>
          <td style="white-space:pre-wrap; word-break:break-word; min-width:200px; max-width:400px; ${textColor ? textColor : 'color:#475569;'}">${work}</td>
          <td style="white-space:nowrap; ${textColor}">${lateEarlyHtml}</td>
          <td style="white-space:pre-wrap; word-break:break-word; min-width:150px; max-width:300px; ${textColor ? textColor : 'color:#475569;'}">${combinedReasonMemo ? esc(combinedReasonMemo) : dash}</td>
          <td><span class="dash-pill" style="${meta.style}; white-space:nowrap;">${esc(meta.label)}</span></td>
        </tr>
      `;
    }).join('');

    let paginationHtml = '';
    if (items.length > 0) {
      const totalPages = Math.ceil(items.length / pageSize);
      const prevDisabled = currentPage === 1 ? 'disabled' : '';
      const nextDisabled = currentPage === totalPages ? 'disabled' : '';
      const prevBg = currentPage === 1 ? '#f1f5f9' : '#fff';
      const nextBg = currentPage === totalPages ? '#f1f5f9' : '#fff';
      const prevCursor = currentPage === 1 ? 'not-allowed' : 'pointer';
      const nextCursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
      
      paginationHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <div style="color:#64748b; font-size:14px;">
            全 <span style="font-weight:700; color:#0f172a;">${items.length}</span> 件中 <span style="font-weight:700; color:#0f172a;">${startIndex + 1}</span> - <span style="font-weight:700; color:#0f172a;">${endIndex}</span> 件を表示
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btnWrPrev" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${prevBg}; color:#475569; cursor:${prevCursor}; font-size:14px;" ${prevDisabled}>前へ</button>
            <button id="btnWrNext" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${nextBg}; color:#475569; cursor:${nextCursor}; font-size:14px;" ${nextDisabled}>次へ</button>
          </div>
        </div>
      `;
    }

    tableHost.innerHTML = `
      <div style="overflow-x:auto;border-top:none;border-bottom:none;background:#fff;padding-bottom:12px;">
        <table class="wr-table" style="min-width:1400px; width:100%; table-layout:auto; border-collapse: collapse;">
            <colgroup>
              <col style="width:110px;">
              <col style="width:50px;">
              <col style="width:110px;">
              <col style="width:120px;">
              <col style="width:140px;">
              <col style="width:100px;">
              <col style="width:70px;">
              <col style="width:70px;">
              <col style="width:110px;">
              <col style="width:200px;">
              <col style="width:300px;">
              <col style="width:180px;">
              <col style="width:200px;">
              <col style="width:120px;">
            </colgroup>
            <thead style="position:sticky; top:0; z-index:10;">
              <tr style="background:#e6f2ff; color:#0f172a; height:30px;">
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">日付</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">曜</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">社員番号</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">氏名</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">部署</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務区分</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">出勤</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">退勤</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">勤務形態</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">現場</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">作業内容</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">遅刻・早退等</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">備考</th>
                <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">状態</th>
              </tr>
            </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    `;

    if (items.length > 0) {
      const btnPrev = document.getElementById('btnWrPrev');
      if (btnPrev) {
        btnPrev.addEventListener('click', () => {
          if (currentPage > 1) {
            currentPage--;
            renderRows(items);
          }
        });
      }
      const btnNext = document.getElementById('btnWrNext');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          const totalPages = Math.ceil(items.length / pageSize);
          if (currentPage < totalPages) {
            currentPage++;
            renderRows(items);
          }
        });
      }
    }
  };

  const normalize = (s) => String(s || '').trim().toLowerCase();
  const cmpStr = (a, b) => {
    const aa = normalize(a);
    const bb = normalize(b);
    if (aa === bb) return 0;
    return aa < bb ? -1 : 1;
  };
  const statusRank = (st) => {
    if (st === 'checkout_missing') return 0;
    if (st === 'missing') return 0;
    if (st === 'checkout_missing_submitted') return 1;
    if (st === 'monthly_input_only') return 1;
    if (st === 'working') return 1;
    if (st === 'submitted') return 2;
    return 3;
  };

  const employeeCodeOf = (x) => String(x?.employeeCode || `EMP${String(x?.userId || '').padStart(3, '0')}`);
  const employeeNameOf = (x) => String(x?.username || '').trim();
  const departmentNameOf = (x) => String(x?.departmentName || '').trim();

  const filterAndSort = (items) => {
    const dept = normalize(state.dept);
    const q = normalize(state.q);
    let out = Array.isArray(items) ? items.slice() : [];
    if (dept) {
      out = out.filter(x => normalize(x?.departmentName) === dept);
    }
    if (q) {
      out = out.filter(x => {
        const code = normalize(x?.employeeCode);
        const name = normalize(x?.username);
        return (code && code.includes(q)) || (name && name.includes(q));
      });
    }
    out.sort((a, b) => {
      if (state.sort === 'employee') {
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'name') {
        const n1 = cmpStr(employeeNameOf(a), employeeNameOf(b));
        if (n1) return n1;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'department') {
        const dep = cmpStr(departmentNameOf(a), departmentNameOf(b));
        if (dep) return dep;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      if (state.sort === 'missingFirst') {
        const r1 = statusRank(effectiveStatus(a)) - statusRank(effectiveStatus(b));
        if (r1) return r1;
        const d1 = cmpStr(b?.date, a?.date);
        if (d1) return d1;
        const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
        if (c1) return c1;
        return Number(a?.userId || 0) - Number(b?.userId || 0);
      }
      const d1 = cmpStr(b?.date, a?.date);
      if (d1) return d1;
      const c1 = cmpStr(employeeCodeOf(a), employeeCodeOf(b));
      if (c1) return c1;
      return Number(a?.userId || 0) - Number(b?.userId || 0);
    });
    return out;
  };

  const renderGrouped = (items) => {
    const tableHost = $('#wrTable');
    if (!tableHost) return;
    if (!items.length) {
      tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>出勤データがありません</div></div>';
      return;
    }
    const groups = new Map();
    for (const it of items) {
      const uid = Number(it?.userId || 0);
      const key = uid ? String(uid) : `${employeeCodeOf(it)}|${employeeNameOf(it)}|${departmentNameOf(it)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          userId: uid || null,
          employeeCode: employeeCodeOf(it),
          username: employeeNameOf(it),
          departmentName: departmentNameOf(it) || '—',
          items: []
        });
      }
      groups.get(key).items.push(it);
    }
    const arr = Array.from(groups.values());
    for (const g of arr) {
      g.items.sort((a, b) => cmpStr(b?.date, a?.date));
      g.missing = g.items.filter(x => {
        const st = effectiveStatus(x);
        return st === 'missing' || st === 'checkout_missing';
      }).length;
      g.submitted = g.items.filter(x => {
        const st = effectiveStatus(x);
        return st === 'submitted' || st === 'checkout_missing_submitted';
      }).length;
      g.total = g.items.length;
    }
    arr.sort((a, b) => {
      if (state.sort === 'missingFirst') {
        const d = Number(b.missing || 0) - Number(a.missing || 0);
        if (d) return d;
      }
      if (state.sort === 'department') {
        const dep = cmpStr(a.departmentName, b.departmentName);
        if (dep) return dep;
      }
      if (state.sort === 'name') {
        const n = cmpStr(a.username, b.username);
        if (n) return n;
      }
      const c = cmpStr(a.employeeCode, b.employeeCode);
      if (c) return c;
      return Number(a.userId || 0) - Number(b.userId || 0);
    });
    const html = arr.map(g => {
      const headerRight = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="dash-pill" style="background:#f8fafc;color:#475569;border-color:#e2e8f0;">合計 ${g.total}</span>
          <span class="dash-pill" style="background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;">提出 ${g.submitted}</span>
          <span class="dash-pill" style="background:#fff1f1;color:#991b1b;border-color:#ffcccc;">未提出 ${g.missing}</span>
        </div>
      `;
      const rows = g.items.map(it => {
        const dash = `<span style="color:#cbd5e1;">—</span>`;
        const stx = effectiveStatus(it);
        const meta = statusMeta(stx);
        let kubunStr = String(it.kubun || '').trim();
        if (kubunStr === '休日出勤' && !it.attendance?.checkIn && !it.attendance?.checkOut && (!it.site && !it.work)) {
          kubunStr = '休日';
        }
        const kubun = kubunStr ? esc(kubunStr) : dash;
        const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
        const work = String(it.work || '').trim() ? esc(String(it.work).trim()) : dash;
        const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
        const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
        const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;

        const dc = dowClass(it.weekday);
        const displayDate = it.date ? it.date.replace(/-/g, '/') : '';
        // Calculate holiday from backend flag
        const isHoliday = !!it.holiday;
        const dowColor = dc === 'wr-dow-sun' ? 'color:#ef4444; background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'color:#d97706; background:#fffbeb;' : (isHoliday ? 'color:#ef4444; background:#fef2f2;' : 'color:#64748b;'));
      
      const rowBg = (dc === 'wr-dow-sun' || isHoliday) ? 'background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'background:#fffbeb;' : '');
      const textColor = (dc === 'wr-dow-sun' || isHoliday) ? 'color:#ef4444;' : (dc === 'wr-dow-sat' ? 'color:#d97706;' : '');

      return `
        <tr style="${rowBg}">
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(displayDate)}</td>
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(isHoliday ? '祝' : (it.weekday || ''))}</td>
          <td style="${textColor}">${kubun}</td>
          <td style="font-family:monospace; font-size:14px; ${textColor}">${checkIn}</td>
          <td style="font-family:monospace; font-size:14px; ${textColor}">${checkOut}</td>
          <td style="${textColor}">${wType}</td>
          <td style="${textColor}">${site}</td>
          <td style="white-space:pre-wrap; word-break:break-word; min-width:300px; max-width:600px; ${textColor ? textColor : 'color:#475569;'}">${work}</td>
          <td><span class="dash-pill" style="${meta.style}; white-space:nowrap;">${esc(meta.label)}</span></td>
        </tr>
      `;
      }).join('');
      return `
        <div style="margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding-bottom:12px;border-bottom:2px solid #e2e8f0;margin-bottom:12px;">
            <div style="font-weight:800;color:#0f172a;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span style="background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:13px;color:#475569;">${esc(g.employeeCode)}</span>
              ${esc(g.username)} 
              <span style="color:#64748b;font-weight:600;font-size:14px;margin-left:4px;">${esc(g.departmentName)}</span>
            </div>
            ${headerRight}
          </div>
          <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);background:#fff;padding-bottom:12px;">
            <table class="wr-table" style="min-width:1200px; width:100%; table-layout:auto;">
              <colgroup>
                <col style="width:40px;">
                <col style="width:40px;">
                <col style="width:100px;">
                <col style="width:70px;">
                <col style="width:70px;">
                <col style="width:110px;">
                <col style="width:200px;">
                <col style="width:400px;">
                <col style="width:120px;">
              </colgroup>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>曜</th>
                  <th>勤務区分</th>
                  <th>出勤</th>
                  <th>退勤</th>
                  <th>勤務形態</th>
                  <th>現場</th>
                  <th>作業内容</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
      
    }).join('');
    tableHost.innerHTML = html;
  };

  const syncDeptOptions = (items) => {
    const sel = $('#wrDept');
    if (!sel) return;
    const names = Array.from(new Set((items || []).map(x => String(x?.departmentName || '').trim()).filter(Boolean))).sort((a, b) => cmpStr(a, b));
    const optHtml = ['<option value="">全部署</option>']
      .concat(names.map(n => `<option value="${esc(n)}" ${normalize(n) === normalize(state.dept) ? 'selected' : ''}>${esc(n)}</option>`))
      .join('');
    sel.innerHTML = optHtml;
  };

  const normalizeMonthListResponse = (r) => {
    const items = Array.isArray(r?.items) ? r.items : [];
    const sum = r?.summary || {};
    return {
      summary: {
        employees: sum.employees == null ? 0 : sum.employees,
        workedDays: sum.workedDays == null ? items.length : sum.workedDays,
        submitted: sum.submitted == null ? 0 : sum.submitted,
        missing: sum.missing == null ? 0 : sum.missing
      },
      items
    };
  };

  const toListFromLegacyMonthMatrix = (r) => {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const days = Array.isArray(r?.days) ? r.days : [];
    const users = Array.isArray(r?.items) ? r.items : [];
    const out = [];
    const workingUsers = new Set();
    let submitted = 0;
    let missing = 0;
    for (const u of users) {
      const uid = u?.userId;
      const dmap = u?.days || {};
      for (const d of days) {
        const entry = dmap?.[d] || null;
        const st = String(entry?.status || '');
        if (st !== 'checked_out' && st !== 'working' && st !== 'holiday_work' && st !== 'holiday_working') continue;
        const rep = entry?.report || null;
        const site = String(rep?.site || '').trim() || null;
        const work = String(rep?.work || '').trim() || null;
        const status = st === 'checked_out'
          ? ((site || work) ? 'submitted' : 'missing')
          : (String(d).slice(0, 10) < today ? ((site || work) ? 'checkout_missing_submitted' : 'checkout_missing') : 'working');
        if (status === 'submitted' || status === 'checkout_missing_submitted') submitted++;
        else if (status === 'missing' || status === 'checkout_missing') missing++;
        workingUsers.add(uid);
        out.push({
          userId: uid,
          employeeCode: u?.employeeCode || null,
          username: u?.username || null,
          departmentId: u?.departmentId || null,
          departmentName: u?.departmentName || null,
          date: String(d).slice(0, 10),
          weekday: weekdayJa(d),
          attendance: { checkIn: null, checkOut: null },
          kubun: entry?.kubun || null,
          workType: null,
          holiday: entry?.holiday || false,
          site,
          work,
          status
        });
      }
    }
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const ac = String(a.employeeCode || '').toUpperCase();
      const bc = String(b.employeeCode || '').toUpperCase();
      if (ac !== bc) return ac < bc ? -1 : 1;
      return Number(a.userId || 0) - Number(b.userId || 0);
    });
    return {
      summary: { employees: workingUsers.size, workedDays: out.length, submitted, missing },
      items: out
    };
  };

  const load = async () => {
    const monthEl = $('#wrMonth');
    state.month = isYM(monthEl?.value) ? monthEl.value : initMonth;
    setUrl();
    showSpinner();
    try {
      let r = null;
      try {
        r = await fetchJSONAuth(`/api/admin/work-reports/month/list?month=${encodeURIComponent(state.month)}`);
        r = normalizeMonthListResponse(r);
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('Invalid userId') || msg.includes('404') || msg.includes('Not Found')) {
          const legacy = await fetchJSONAuth(`/api/admin/work-reports/month?month=${encodeURIComponent(state.month)}`);
          r = toListFromLegacyMonthMatrix(legacy);
        } else {
          throw e;
        }
      }
      const summaryEl = $('#wrSummary');
      state.items = Array.isArray(r?.items) ? r.items : [];
      syncDeptOptions(state.items);
      const sum = r?.summary || {};
      const shown = filterAndSort(state.items).length;
      if (summaryEl) {
        summaryEl.innerHTML = `対象月: ${esc(state.month)} / 出勤社員: ${sum.employees == null ? 0 : sum.employees} / 出勤日レコード: ${sum.workedDays == null ? 0 : sum.workedDays} / 表示: ${shown} / 提出済: ${sum.submitted == null ? 0 : sum.submitted} / <span style="color:#dc2626;">未提出: ${sum.missing == null ? 0 : sum.missing}</span>`;
      }
      const view = filterAndSort(state.items);
      if (state.group) renderGrouped(view);
      else renderRows(view, true);
    } catch (e) {
      const tableHost = $('#wrTable');
      if (tableHost) {
        tableHost.innerHTML = `<div class="empty-state"><div style="font-size:28px;">⚠️</div><div>読み込み失敗: ${esc((e && e.message) ? e.message : 'unknown')}</div></div>`;
      }
    } finally {
      hideSpinner();
    }
  };

  $('#wrMonth')?.addEventListener('change', async () => {
    const monthEl = $('#wrMonth');
    if (!isYM(monthEl?.value)) return;
    await load();
  });
  $('#wrSort')?.addEventListener('change', async () => {
    const sel = $('#wrSort');
    state.sort = String(sel?.value || 'dateDesc');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        const shown = filterAndSort(state.items).length;
        summaryEl.innerHTML = String(summaryEl.innerHTML).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrDept')?.addEventListener('change', async () => {
    const sel = $('#wrDept');
    state.dept = String(sel?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        const shown = filterAndSort(state.items).length;
        summaryEl.innerHTML = String(summaryEl.innerHTML).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrQuery')?.addEventListener('input', async () => {
    const inp = $('#wrQuery');
    state.q = String(inp?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.innerHTML) {
        const shown = filterAndSort(state.items).length;
        summaryEl.innerHTML = String(summaryEl.innerHTML).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch (e) { /* silently ignored */ }
  });
  $('#wrGroup')?.addEventListener('change', async () => {
    const ck = $('#wrGroup');
    state.group = !!ck?.checked;
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view, true);
  });

  $('#wrExport')?.addEventListener('click', async () => {
    try {
      // Pass filtering & sorting parameters to the backend
      const qParams = new URLSearchParams({
        period: 'month',
        month: state.month,
        sort: state.sort,
        dept: state.dept,
        q: state.q,
        group: state.group ? '1' : '0'
      });
      const url = `/api/admin/work-reports/export.xlsx?${qParams.toString()}`;
      await downloadWithAuth(url, `work_reports_${state.month}.xlsx`);
    } catch (e) {
      alert(String(e?.message || 'エクスポートに失敗しました'));
    }
  });

  await load();
}
