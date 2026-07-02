import { me, refresh, logout } from '../api/auth.api.js';
import { fetchJSONAuth } from '../api/http.api.js';

const $ = (sel) => document.querySelector(sel);

const prefillUserName = () => {
  try {
    const el = $('#userName');
    if (!el) return;
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const u = raw ? JSON.parse(raw) : null;
    const name = (u && (u.username || u.email)) ? String(u.username || u.email) : '';
    if (name) el.textContent = name;
  } catch (e) { /* silently ignored */ }
};

async function ensureAuthProfile() {
  let token = sessionStorage.getItem('accessToken');
  let profile = null;
  if (token) {
    try { profile = await me(token); } catch (e) { /* silently ignored */ }
  }
  if (!profile) {
    try {
      const r = await refresh();
      sessionStorage.setItem('accessToken', r.accessToken);
      profile = await me(r.accessToken);
    } catch (e) { /* silently ignored */ }
  }
  if (!profile) {
    try {
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
      const user = userStr ? JSON.parse(userStr) : null;
      if (user && (user.role === 'admin' || user.role === 'manager' || user.role === 'employee')) {
        profile = user;
      }
    } catch (e) { /* silently ignored */ }
  }
  return profile || null;
}

const showErr = (msg) => {
  const err = $('#error');
  if (!err) return;
  err.style.display = msg ? 'block' : 'none';
  err.textContent = msg || '';
};

const fmtTime = (t) => {
    if (!t) return '';
    const s = String(t).trim();
    if (!s) return '';
    if (s.length >= 16) return s.slice(11, 16);
    return s;
  };

const statusLabel = (k) => {
  if (k === 'working') return '出勤中';
  if (k === 'checked_out') return '退勤済';
  return '未出勤';
};

const render = (profile, summary, roster) => {
  const root = $('#todayWork');
  if (!root) return;
  const me0 = summary?.me || {};
  const date = summary?.date || '';
  const role = String(profile?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'manager';
  const statusKey = me0.checkIn ? (me0.checkOut ? 'checked_out' : 'working') : 'not_checked_in';
  const tIn = fmtTime(me0.checkIn);
  const tOut = fmtTime(me0.checkOut);

  const rosterItems = Array.isArray(roster?.items) ? roster.items : [];
  const plannedItems = Array.isArray(roster?.planned) ? roster.planned : [];
  const plannedMap = new Map(plannedItems.map(p => [String(p.userId), p]));
  
  // Create a list of all rows.
  // First, all attendance records
  const allRows = rosterItems.map(it => {
    const id = String(it.userId);
    return { id, it, plan: plannedMap.get(id) || null };
  });

  // Then add planned users who have NO attendance records
  const rosterIds = new Set(rosterItems.map(it => String(it.userId)));
  for (const p of plannedItems) {
    const id = String(p.userId);
    if (!rosterIds.has(id)) {
      allRows.push({ id, it: null, plan: p });
    }
  }

  const combinedRows = allRows.map(({ id, it, plan }, idx, arr) => {
    const code = (it?.employeeCode || plan?.employeeCode) || `EMP${id.padStart(3, '0')}`;
    const name = (it?.username || plan?.username) || '';
    const dept = (it?.departmentName || plan?.departmentName) || '—';
    const shiftName = plan?.planned?.shift?.name || '—';
    const pStart = plan?.planned?.shift?.start_time || '—';
    const pEnd = plan?.planned?.shift?.end_time || '—';
    const cin = fmtTime(it?.attendance?.checkIn) || '—';
    const cout = fmtTime(it?.attendance?.checkOut) || '—';
    const site = it?.attendance?.site || '—';
    const work = it?.attendance?.work || '—';
    const isLeave = String(plan?.planned?.status || '') === 'leave';
    const st = isLeave ? 'leave' : (it?.status || 'not_checked_in');
    const stLabel = isLeave ? '休' : statusLabel(st);

    // Row merging logic for multiple shifts on same day
    const prev = idx > 0 ? arr[idx - 1] : null;
    const isSameUser = prev && prev.id === id;

    // If it's the same user, hide the borders of the repetitive info
    const codeHtml = !isSameUser ? `<td rowspan="1">${code}</td>` : `<td style="border-top:none; color:transparent;">${code}</td>`;
    const nameHtml = !isSameUser ? `<td rowspan="1">${name}</td>` : `<td style="border-top:none; color:transparent;">${name}</td>`;
    const deptHtml = !isSameUser ? `<td rowspan="1">${dept}</td>` : `<td style="border-top:none; color:transparent;">${dept}</td>`;
    const shiftHtml = !isSameUser ? `<td>${shiftName}</td>` : `<td style="border-top:none; color:transparent;">${shiftName}</td>`;
    const pStartHtml = !isSameUser ? `<td class="text-center">${pStart}</td>` : `<td class="text-center" style="border-top:none; color:transparent;">${pStart}</td>`;
    const pEndHtml = !isSameUser ? `<td class="text-center">${pEnd}</td>` : `<td class="text-center" style="border-top:none; color:transparent;">${pEnd}</td>`;
    const statusHtml = !isSameUser ? `<td><span class="tw-pill ${st}">${stLabel}</span></td>` : `<td style="border-top:none;"></td>`;

    return `
      <tr>
        ${codeHtml}
        ${nameHtml}
        ${deptHtml}
        ${shiftHtml}
        ${pStartHtml}
        ${pEndHtml}
        <td class="text-center">${cin}</td>
        <td class="text-center">${cout}</td>
        <td>${site}</td>
        <td>${work}</td>
        ${statusHtml}
      </tr>
    `;
  }).join('');

  const unifiedBlock = isAdmin ? `
    <div class="tw-card">
      <div class="tw-section-title">本日の予定・実績</div>
      ${combinedRows ? `
        <div class="tw-table-wrap">
          <table class="tw-table">
            <thead>
              <tr><th>社員番号</th><th>氏名</th><th>部署</th><th>シフト</th><th>予定開始</th><th>予定終了</th><th>出勤</th><th>退勤</th><th>現場</th><th>作業内容</th><th>状態</th></tr>
            </thead>
            <tbody>${combinedRows}</tbody>
          </table>
        </div>
      ` : `
        <div class="tw-empty"><div style="font-size:28px;">🗂️</div><div>データがありません</div></div>
      `}
    </div>
  ` : '';

  const kpiBlock = isAdmin ? (() => {
    const c = summary?.counts || {};
    return `
      <div class="tw-kpi-grid">
        <div class="tw-card"><div class="tw-kpi-title">対象人数</div><div class="tw-kpi-value">${c.targetEmployees == null ? 0 : c.targetEmployees}</div><div class="tw-kpi-sub">Expected employees</div></div>
        <div class="tw-card"><div class="tw-kpi-title">出勤人数</div><div class="tw-kpi-value">${c.checkIn == null ? 0 : c.checkIn}</div><div class="tw-kpi-sub">Checked in</div></div>
        <div class="tw-card"><div class="tw-kpi-title">未出勤</div><div class="tw-kpi-value">${c.notCheckedIn == null ? 0 : c.notCheckedIn}</div><div class="tw-kpi-sub">Not checked in</div></div>
        <div class="tw-card"><div class="tw-kpi-title">未退勤</div><div class="tw-kpi-value">${c.notCheckedOut == null ? 0 : c.notCheckedOut}</div><div class="tw-kpi-sub">Not checked out</div></div>
      </div>
    `;
  })() : '';

  const statusBlock = isAdmin ? '' : `
    <div class="tw-card">
      <div class="tw-section-title">あなたの状況</div>
      <div class="tw-row">
        <div class="tw-label">状態</div><div class="tw-strong">${statusLabel(statusKey)}</div>
        <div class="tw-label">出勤</div><div>${tIn}</div>
        <div class="tw-label">退勤</div><div>${tOut}</div>
      </div>
      <div class="tw-actions">
        <a class="btn" href="/ui/attendance">勤怠入力へ</a>
        <a class="btn" href="/ui/portal">ホームへ</a>
      </div>
    </div>
  `;

  const gridClass = statusBlock ? 'tw-grid' : 'tw-grid tw-grid-1col';

  root.innerHTML = `
    <div class="today-wrap">
      <div class="today-title">本日の出勤</div>
      <div class="today-date">${date}</div>
      ${kpiBlock}
      <div class="${gridClass}">
        ${unifiedBlock}
        ${statusBlock}
      </div>
    </div>
  `;
};

const pickLatestSegment = (segments) => {
  const arr = Array.isArray(segments) ? segments : [];
  if (!arr.length) return null;
  let best = arr[0];
  for (const s of arr) {
    const a = String(s?.checkIn || '');
    const b = String(best?.checkIn || '');
    if (a && a > b) best = s;
  }
  return best;
};

const loadEmployeeSummary = async () => {
  const date = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const r = await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}`);
  const seg = pickLatestSegment(r?.segments);
  return {
    date,
    me: {
      attendanceId: seg?.id || null,
      checkIn: seg?.checkIn || null,
      checkOut: seg?.checkOut || null
    }
  };
};

document.addEventListener('DOMContentLoaded', async () => {
  prefillUserName();
  const pageSpinner = $('#pageSpinner');

  // Keep header height stable to avoid first-paint layout jump between pages.
  const setTopbarHeightVar = () => {};

  const profile = await ensureAuthProfile();
  if (!profile) {
    try { window.location.replace('/ui/login'); } catch (e) { window.location.href = '/ui/login'; }
    return;
  }

  const goLogin = async () => {
    try { await logout(); } catch (e) { /* silently ignored */ }
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
    } catch (e) { /* silently ignored */ }
    try {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (e) { /* silently ignored */ }
    try { window.location.replace('/ui/login'); } catch (e) { window.location.href = '/ui/login'; }
  };

  try {
    const p = String(window.location.pathname || '');
    if ((p === '/ui/today-work' || p === '/ui/portal' || p === '/ui/dashboard') && document.body.dataset.backLoginBound !== '1') {
      document.body.dataset.backLoginBound = '1';
      try { history.pushState({ back_to_login_guard: true }, '', window.location.href); } catch (e) { /* silently ignored */ }
      window.addEventListener('popstate', async () => {
        await goLogin();
      });
    }
  } catch (e) { /* silently ignored */ }

  // Do not force nav spinner on every link click. It causes visible flash.

  try {
    const userName = $('#userName');
    if (userName) userName.textContent = profile.username || profile.email || 'ユーザー';
  } catch (e) { /* silently ignored */ }

  try {
    const btn = document.querySelector('.user-btn');
    const dd = $('#userDropdown');
    if (btn && dd && btn.dataset.bound !== '1') {
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const hidden = dd.hasAttribute('hidden');
        if (hidden) dd.removeAttribute('hidden');
        else dd.setAttribute('hidden', '');
      });
      document.addEventListener('click', (e) => {
        if (e.target?.closest?.('.user-menu')) return;
        dd.setAttribute('hidden', '');
      });
    }
  } catch (e) { /* silently ignored */ }

  const doLogout = async () => {
    await goLogin();
  };
  try { $('#btnLogout')?.addEventListener('click', doLogout); } catch (e) { /* silently ignored */ }
  try { $('#drawerLogout')?.addEventListener('click', doLogout); } catch (e) { /* silently ignored */ }

  try {
    const mobileBtn = $('#mobileMenuBtn');
    const mobileDrawer = $('#mobileDrawer');
    const mobileClose = $('#mobileClose');
    const mobileBackdrop = $('#drawerBackdrop');
    if (mobileBtn && mobileDrawer) {
      if (mobileBtn.dataset.bound === '1') return;
      mobileBtn.dataset.bound = '1';
      const toggleDrawer = (open) => {
        const isHidden = mobileDrawer.hasAttribute('hidden');
        const shouldOpen = typeof open === 'boolean' ? open : isHidden;
        if (shouldOpen) {
          mobileDrawer.removeAttribute('hidden');
          mobileBtn.setAttribute('aria-expanded', 'true');
          document.body.classList.add('drawer-open');
          if (mobileBackdrop) mobileBackdrop.removeAttribute('hidden');
        } else {
          mobileDrawer.setAttribute('hidden', '');
          mobileBtn.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('drawer-open');
          if (mobileBackdrop) mobileBackdrop.setAttribute('hidden', '');
        }
      };
      mobileBtn.addEventListener('click', () => toggleDrawer());
      if (mobileClose) mobileClose.addEventListener('click', () => toggleDrawer(false));
    }
  } catch (e) { /* silently ignored */ }

  try {
    const role = String(profile?.role || '').toLowerCase();
    let summary = null;
    let roster = null;
    if (role === 'admin' || role === 'manager') {
      summary = await fetchJSONAuth('/api/attendance/today-summary');
      try { roster = await fetchJSONAuth('/api/attendance/today-roster'); } catch (e) { /* silently ignored */ }
    } else {
      summary = await loadEmployeeSummary();
    }
    render(profile, summary, roster);
    try {
      const me0 = summary?.me || {};
      const canReport = role === 'employee' || role === 'manager';
      if (canReport && me0?.checkOut) {
        const date = summary?.date || '';
        const r = await fetchJSONAuth(`/api/work-reports/my?date=${encodeURIComponent(date)}`);
        if (!r?.report) {
          try { window.location.replace(`/ui/work-report?date=${encodeURIComponent(date)}`); } catch (e) { window.location.href = `/ui/work-report?date=${encodeURIComponent(date)}`; }
          return;
        }
      }
    } catch (e) { /* silently ignored */ }
  } catch (e) {
    showErr('データ取得に失敗しました: ' + (e?.message || 'unknown'));
  } finally {
    try { if (pageSpinner) pageSpinner.setAttribute('hidden', ''); } catch (e) { /* silently ignored */ }
  }
});
