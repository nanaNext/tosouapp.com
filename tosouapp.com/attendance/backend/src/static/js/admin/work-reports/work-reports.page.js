import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';

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
  if (status === 'not_punched') return { label: '未打刻', style: 'background:#fff1f1;color:#991b1b;border-color:#ffcccc;' };
  if (status === 'working') return { label: '勤務中', style: 'background:#f8fafc;color:#475569;border-color:#cbd5e1;' };
  return { label: '—', style: 'background:#f8fafc;color:#475569;border-color:#e2e8f0;' };
};
const workTypeLabel = (value) => {
  if (value === 'onsite') return '出社';
  if (value === 'remote') return '在宅';
  if (value === 'satellite') return '現場/出張';
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
  } catch {}
};
const hideSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }
  } catch {}
};

export async function mount() {
  const content = $('#adminContent');
  if (content) {
    content.className = 'card';
    content.innerHTML = '<div style="color:#475569;font-weight:650;">読み込み中…</div>';
  }
  
  if (!document.querySelector('#wrToolbarStyle')) {
    const style = document.createElement('style');
    style.id = 'wrToolbarStyle';
    style.textContent = `
      .wr-toolbar {
        background: transparent;
        padding: 0;
        margin-top: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .wr-input {
        padding: 0 12px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        height: 40px;
        font-size: 14px;
        color: #0f172a;
        background: #fff;
        box-sizing: border-box;
        outline: none;
        transition: all 0.2s;
      }
      .wr-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }
      .wr-select {
        appearance: none;
        padding-right: 32px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 16px;
      }
      .wr-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #334155;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
        margin-left: 8px;
      }
      .wr-checkbox {
        width: 18px;
        height: 18px;
        accent-color: #2b6cb0;
        cursor: pointer;
        border-radius: 4px;
      }
      .wr-btn-home {
        text-decoration: none;
        background: #fff;
        border: 1px solid #cbd5e1;
        color: #475569;
        border-radius: 4px;
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.2s;
        margin-left: auto;
      }
      .wr-btn-home:hover { background: #f1f5f9; }
      
      .wr-search-container {
        display: flex;
        width: 100%;
      }
      .wr-search-container input {
        width: 100%;
      }
      .wr-group-container {
        display: flex;
        align-items: center;
      }

      @media (min-width: 1025px) {
        .wr-toolbar {
          display: grid;
          grid-template-columns: repeat(4, 1fr) auto;
        }
        .wr-month, .wr-sort, .wr-dept, .wr-search-container {
          width: 100%;
        }
      }

      @media (max-width: 1024px) {
        .wr-toolbar {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }
        .wr-month, .wr-sort, .wr-dept, .wr-search-container {
          width: 100%;
        }
        .wr-group-container {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 640px) {
        .wr-toolbar { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 10px; 
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 0; 
        }
        .wr-month, .wr-sort, .wr-dept, .wr-search-container { 
          grid-column: auto;
          width: 100%; 
          min-width: 0 !important; 
          max-width: none !important; 
        }
        .wr-search-container input { width: 100%; min-width: 0; }
        .wr-group-container {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }
        .wr-checkbox-label { margin-left: 0; }
        .wr-btn-home { margin-left: 0; }
      }
      .wr-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .wr-table th {
        background: #f8fafc;
        color: #64748b;
        font-weight: 600;
        font-size: 12px;
        padding: 4px 6px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        white-space: nowrap;
      }
      .wr-table td {
        padding: 8px 6px;
        font-size: 13px;
        color: #334155;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      .wr-table tbody tr:hover td {
        background: #f8fafc;
      }
      .wr-table tbody tr:last-child td {
        border-bottom: none;
      }
    `;
    document.head.appendChild(style);
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

  content.className = 'card';
  content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-head" style="margin-bottom:0; padding-bottom:0; border-bottom:none;">
        <h3 style="margin:0; font-size:20px; color:#0f172a;">作業報告</h3>
      </div>
      
      <style>
        .mobile-only-btn { display: none !important; }
        @media (max-width: 768px) {
          .mobile-only-btn { display: flex !important; }
        }
      </style>
      <div class="wr-toolbar">
        <input id="wrMonth" type="month" class="wr-input wr-month" value="${initMonth}">
        <select id="wrSort" class="wr-input wr-select wr-sort">
          <option value="dateDesc" ${initSort === 'dateDesc' ? 'selected' : ''}>日付↓ / 社員↑</option>
          <option value="employee" ${initSort === 'employee' ? 'selected' : ''}>社員↑ / 日付↓</option>
          <option value="name" ${initSort === 'name' ? 'selected' : ''}>氏名↑ / 日付↓</option>
          <option value="department" ${initSort === 'department' ? 'selected' : ''}>部署↑ / 社員↑ / 日付↓</option>
          <option value="missingFirst" ${initSort === 'missingFirst' ? 'selected' : ''}>未提出を上に</option>
        </select>
        <select id="wrDept" class="wr-input wr-select wr-dept" style="min-width:160px;">
          <option value="">全部署</option>
        </select>
        <div class="wr-search-container">
          <input id="wrSearch" class="wr-input" placeholder="社員番号/氏名で検索" value="${esc(initQ)}">
        </div>
        <div class="wr-group-container">
          <label class="wr-checkbox-label">
            <input id="wrGroup" type="checkbox" class="wr-checkbox" ${initGroup ? 'checked' : ''}>
            社員ごとにまとめる
          </label>
          <a class="wr-btn-home mobile-only-btn" href="/admin/dashboard">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right:6px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            ホームへ
          </a>
        </div>
      </div>

      <div id="wrSummary" style="margin-bottom:12px;color:#475569;font-weight:650;font-size:14px;line-height:1.6;"></div>
      <div id="wrTable"></div>
    </div>
  `;

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
    } catch {}
  };

  const renderRows = (items) => {
    const tableHost = $('#wrTable');
    if (!tableHost) return;
    if (!items.length) {
      tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>出勤データがありません</div></div>';
      return;
    }

    const rows = items.map((it) => {
      const dash = `<span style="color:#cbd5e1;">—</span>`;
      const code = it.employeeCode || `EMP${String(it.userId).padStart(3, '0')}`;
      const stx = effectiveStatus(it);
      const meta = statusMeta(stx);
      const kubun = String(it.kubun || '').trim() ? esc(String(it.kubun).trim()) : dash;
      const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
      const rawWork = String(it.work || '').trim();
      const work = rawWork ? esc(rawWork) : dash;
      const dept = String(it.departmentName || '').trim() ? esc(String(it.departmentName).trim()) : dash;
      const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
      const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
      const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;

      const dc = dowClass(it.weekday);
      const displayDate = it.date ? it.date.split('-').pop() : '';
      const isHoliday = it.holiday || (it.date && (
        it.date.endsWith('05-03') || 
        it.date.endsWith('05-04') || 
        it.date.endsWith('05-05') || 
        it.date.endsWith('05-06')
      ));
      const dowColor = dc === 'wr-dow-sun' ? 'color:#ef4444; background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'color:#d97706; background:#fffbeb;' : (isHoliday ? 'color:#ef4444; background:#fef2f2;' : 'color:#64748b;'));
      
      return `
        <tr>
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(displayDate)}</td>
          <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(isHoliday ? '祝' : (it.weekday || ''))}</td>
          <td style="color:#64748b; white-space:nowrap;">${esc(code)}</td>
          <td style="font-weight:500; white-space:nowrap;">${esc(it.username || '')}</td>
          <td style="white-space:nowrap;">${dept}</td>
          <td style="white-space:nowrap;">${kubun}</td>
          <td style="font-family:monospace; font-size:14px; white-space:nowrap;">${checkIn}</td>
          <td style="font-family:monospace; font-size:14px; white-space:nowrap;">${checkOut}</td>
          <td style="white-space:nowrap;">${wType}</td>
          <td style="white-space:nowrap;">${site}</td>
          <td style="white-space:pre-wrap; word-break:break-word; color:#475569; min-width:200px;">${work}</td>
          <td><span class="dash-pill" style="${meta.style}; white-space:nowrap;">${esc(meta.label)}</span></td>
        </tr>
      `;
    }).join('');

    tableHost.innerHTML = `
      <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);background:#fff;padding-bottom:12px;">
        <table class="wr-table">
          <colgroup>
            <col style="width:40px;">
            <col style="width:40px;">
            <col style="width:100px;">
            <col style="width:120px;">
            <col style="width:120px;">
            <col style="width:100px;">
            <col style="width:70px;">
            <col style="width:70px;">
            <col style="width:110px;">
            <col style="width:140px;">
            <col style="width:300px;">
            <col style="width:120px;">
          </colgroup>
          <thead>
            <tr>
              <th>日付</th>
              <th>曜</th>
              <th>社員番号</th>
              <th>氏名</th>
              <th>部署</th>
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
    `;
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
        const kubun = String(it.kubun || '').trim() ? esc(String(it.kubun).trim()) : dash;
        const site = String(it.site || '').trim() ? esc(String(it.site).trim()) : dash;
        const work = String(it.work || '').trim() ? esc(String(it.work).trim()) : dash;
        const checkIn = it.attendance?.checkIn ? esc(fmtTime(it.attendance.checkIn)) : dash;
        const checkOut = it.attendance?.checkOut ? esc(fmtTime(it.attendance.checkOut)) : dash;
        const wType = workTypeLabel(it.workType) !== '—' ? esc(workTypeLabel(it.workType)) : dash;

        const dc = dowClass(it.weekday);
        const displayDate = it.date ? it.date.split('-').pop() : '';
        const isHoliday = it.holiday || (it.date && (
          it.date.endsWith('05-03') || 
          it.date.endsWith('05-04') || 
          it.date.endsWith('05-05') || 
          it.date.endsWith('05-06')
        ));
        const dowColor = dc === 'wr-dow-sun' ? 'color:#ef4444; background:#fef2f2;' : (dc === 'wr-dow-sat' ? 'color:#d97706; background:#fffbeb;' : (isHoliday ? 'color:#ef4444; background:#fef2f2;' : 'color:#64748b;'));
        
        return `
          <tr>
            <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(displayDate)}</td>
            <td class="${dc}" style="text-align:center; font-weight:600; ${dowColor}">${esc(isHoliday ? '祝' : (it.weekday || ''))}</td>
            <td>${kubun}</td>
            <td style="font-family:monospace; font-size:14px;">${checkIn}</td>
            <td style="font-family:monospace; font-size:14px;">${checkOut}</td>
            <td>${wType}</td>
            <td>${site}</td>
            <td style="white-space:pre-wrap; word-break:break-word; color:#475569;">${work}</td>
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
            <table class="wr-table">
              <colgroup>
                <col style="width:40px;">
                <col style="width:40px;">
                <col style="width:100px;">
                <col style="width:70px;">
                <col style="width:70px;">
                <col style="width:110px;">
                <col style="width:140px;">
                <col style="width:300px;">
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
        summaryEl.textContent = `対象月: ${state.month} / 出勤社員: ${sum.employees == null ? 0 : sum.employees} / 出勤日レコード: ${sum.workedDays == null ? 0 : sum.workedDays} / 表示: ${shown} / 提出済: ${sum.submitted == null ? 0 : sum.submitted} / 未提出: ${sum.missing == null ? 0 : sum.missing}`;
      }
      const view = filterAndSort(state.items);
      if (state.group) renderGrouped(view);
      else renderRows(view);
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
    else renderRows(view);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.textContent) {
        const shown = filterAndSort(state.items).length;
        summaryEl.textContent = String(summaryEl.textContent).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch {}
  });
  $('#wrDept')?.addEventListener('change', async () => {
    const sel = $('#wrDept');
    state.dept = String(sel?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.textContent) {
        const shown = filterAndSort(state.items).length;
        summaryEl.textContent = String(summaryEl.textContent).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch {}
  });
  $('#wrSearch')?.addEventListener('input', async () => {
    const inp = $('#wrSearch');
    state.q = String(inp?.value || '');
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view);
    try {
      const summaryEl = $('#wrSummary');
      if (summaryEl && summaryEl.textContent) {
        const shown = filterAndSort(state.items).length;
        summaryEl.textContent = String(summaryEl.textContent).replace(/\/ 表示: \d+ /, `/ 表示: ${shown} `);
      }
    } catch {}
  });
  $('#wrGroup')?.addEventListener('change', async () => {
    const ck = $('#wrGroup');
    state.group = !!ck?.checked;
    setUrl();
    const view = filterAndSort(state.items);
    if (state.group) renderGrouped(view);
    else renderRows(view);
  });

  await load();
}
