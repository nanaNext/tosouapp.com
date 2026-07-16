import { me, refresh, logout } from '../api/auth.api.js';
import { fetchJSONAuth } from '../api/http.api.js';
import '/static/js/pages/employee-notify.sticky.js';

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

const showSpinner = (isSuccess = false) => {
  try { 
    const el = $('#pageSpinner');
    if (!el) return;
    if (isSuccess) {
      el.classList.add('is-success');
    } else {
      el.classList.remove('is-success');
    }
    el.removeAttribute('hidden');
  } catch (e) { /* silently ignored */ }
};
const hideSpinner = () => {
  try { 
    const el = $('#pageSpinner');
    if (!el) return;
    el.classList.remove('is-success');
    el.setAttribute('hidden', ''); 
  } catch (e) { /* silently ignored */ }
};

const showErr = (msg) => {
  const el = $('#error');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = msg;
};

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtTime = (dt) => {
  if (!dt) return '—';
  const s = String(dt);
  return s.length >= 16 ? s.slice(11, 16) : s;
};
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const isYukyuKubun = (v) => String(v || '').trim() === '有給休暇';

async function ensureAuthProfile() {
  let token = sessionStorage.getItem('accessToken');
  let profile = null;
  if (token) { try { profile = await me(token); } catch (e) { /* silently ignored */ } }
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
      profile = userStr ? JSON.parse(userStr) : null;
    } catch (e) { /* silently ignored */ }
  }
  return profile || null;
}

const wireUserMenu = () => {
    if (!window.__employeeUserMenuDelegated) {
      window.__employeeUserMenuDelegated = true;
      document.addEventListener('click', (e) => {
        const isBtn = e.target && e.target.closest && e.target.closest('.user .user-btn');
        const isMenu = e.target && e.target.closest && e.target.closest('.user-menu');
        const dropdown = document.querySelector('#userDropdown');
        const btn = document.querySelector('.user .user-btn');
        
        if (isBtn && dropdown && btn) {
          e.preventDefault();
          const expanded = btn.getAttribute('aria-expanded') === 'true';        
          btn.setAttribute('aria-expanded', String(!expanded));
          if (expanded) dropdown.setAttribute('hidden', '');
          else dropdown.removeAttribute('hidden');
        } else if (!isMenu && dropdown && !dropdown.hasAttribute('hidden')) {
          dropdown.setAttribute('hidden', '');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const logoutBtn = document.querySelector('#btnLogout');
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = '1';
    logoutBtn.addEventListener('click', async () => {
      try { await logout(); } catch (e) { /* silently ignored */ }
      try { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('refreshToken'); sessionStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      window.location.replace('/ui/login');
    });
  }
};

const wireTopNavDropdowns = () => {
  const drawerBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('mobileClose');

  const openDrawer = () => {
    if (!drawer) return;
    drawer.removeAttribute('hidden');
    if (backdrop) backdrop.removeAttribute('hidden');
    if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open', 'mobile-drawer-open');
  };
  const closeDrawer = () => {
    if (!drawer) return;
    drawer.setAttribute('hidden', '');
    if (backdrop) backdrop.setAttribute('hidden', '');
    if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open', 'mobile-drawer-open');
  };

  if (drawerBtn) drawerBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  const drawerLogout = document.getElementById('drawerLogout');
  if (drawerLogout && !drawerLogout.dataset.bound) {
    drawerLogout.dataset.bound = '1';
    drawerLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await logout(); } catch (e) { /* silently ignored */ }
      try { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('refreshToken'); sessionStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      window.location.replace('/ui/login');
    });
  }
};

const renderNotice = async (profile) => {
  const host = $('#noticeHost');
  if (!host) return;
  const date = todayJST();
  const month = date.slice(0, 7);
  const data = await fetchJSONAuth(`/api/notices?date=${encodeURIComponent(date)}&month=${encodeURIComponent(month)}&limit=10`).catch(() => null);
  const rows = Array.isArray(data?.notices) ? data.notices : [];
  const parseDbTsAsJst = (s) => {
    const x = String(s || '').trim();
    if (!x) return null;
    if (/[zZ]$/.test(x) || /[+-]\d{2}:\d{2}$/.test(x)) {
      const d0 = new Date(x);
      return Number.isFinite(d0.getTime()) ? d0 : null;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(x)) {
      const d0 = new Date(x.replace(' ', 'T') + '+09:00');
      return Number.isFinite(d0.getTime()) ? d0 : null;
    }
    const d0 = new Date(x);
    return Number.isFinite(d0.getTime()) ? d0 : null;
  };
  const fmtTarget = (r) => {
    if (r?.target_user_id != null && String(r.target_user_id) !== '') return '個人';
    const d = r?.target_date ? String(r.target_date).slice(0, 10) : '';
    const m = r?.target_month ? String(r.target_month).slice(0, 7) : '';
    return d || m || '全体';
  };
  const fmtCreated = (r) => {
    const s = String(r?.created_at || '');
    if (s.length >= 16) return s.slice(0, 16).replace('T', ' ');
    return s || '—';
  };
  const preview1 = (t) => {
    const s = String(t || '').replace(/\r/g, '');
    const line = (s.split('\n')[0] || '').trim();
    if (!line) return '（内容なし）';
    return line.length > 80 ? (line.slice(0, 80) + '…') : line;
  };
  const today = date;
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
  const NEW_HOURS = 72;
  const unreadIds = [];
  const listHtml = rows.length
    ? `<div class="kintai-notice-list">
        ${rows.map((r, i) => {
          const target = fmtTarget(r);
          const created = fmtCreated(r);
          const msg = String(r?.message || '');
          const cdt = parseDbTsAsJst(r?.created_at);
          const isNew = cdt ? ((nowJst.getTime() - cdt.getTime()) <= NEW_HOURS * 3600 * 1000) : (String(r?.created_at || '').slice(0, 10) === today);
          const isRead = !!r?.read_at;
          const nid = parseInt(String(r?.id || 0), 10) || 0;
          if (nid && !isRead) unreadIds.push(nid);
          return `
            <details class="kintai-notice-item ${isRead ? 'is-read' : 'is-unread'}" data-notice-id="${esc(nid)}">
              <summary class="kintai-notice-summary">
                <span class="kintai-notice-left">
                  <span class="kintai-notice-tag">${esc(target)}</span>
                  ${isNew ? `<span class="kintai-notice-new">NEW</span>` : ``}
                  <span class="kintai-notice-preview">${esc(preview1(msg))}</span>
                </span>
                <span class="kintai-notice-time">${esc(created)}</span>
              </summary>
              <div class="kintai-notice-body">${esc(msg)}</div>
            </details>
          `;
        }).join('')}
      </div>`
    : `<div class="kintai-notice-empty">お知らせはありません。</div>`;
  const prefKey = 'noticePanel.visible';
  const isVisible = (() => {
    try {
      const v = localStorage.getItem(prefKey);
      if (v === '0') return false;
      if (v === '1') return true;
    } catch (e) { /* silently ignored */ }
    return true;
  })();
  host.innerHTML = `
    <div class="kintai-notice-meta">
      <div class="kintai-notice-meta-row"><div class="kintai-notice-meta-label">対象日</div><div class="kintai-notice-meta-value">${esc(date)}</div></div>
      <div class="kintai-notice-meta-row"><div class="kintai-notice-meta-label">ユーザー</div><div class="kintai-notice-meta-value">${esc(profile?.username || profile?.email || '—')}</div></div>
    </div>
    <div class="kintai-notice-toolbar">
      <button type="button" class="kintai-notice-toggle" id="btnNoticeToggle">${isVisible ? '非表示' : '表示'}</button>
    </div>
    <div class="kintai-notice-section" id="noticeBody" ${isVisible ? '' : 'hidden'}>
      ${listHtml}
    </div>
  `;

  try {
    host.querySelector('#btnNoticeToggle')?.addEventListener('click', () => {
      const body = host.querySelector('#noticeBody');
      const curHidden = !!body?.hasAttribute?.('hidden');
      const nextHidden = !curHidden;
      if (nextHidden) body?.setAttribute?.('hidden', '');
      else body?.removeAttribute?.('hidden');
      try { localStorage.setItem(prefKey, nextHidden ? '0' : '1'); } catch (e) { /* silently ignored */ }
      try { host.querySelector('#btnNoticeToggle').textContent = nextHidden ? '表示' : '非表示'; } catch (e) { /* silently ignored */ }
    });
  } catch (e) { /* silently ignored */ }

  const markOne = async (id) => {
    if (!id) return;
    try { await fetchJSONAuth('/api/notices/read', { method: 'POST', body: JSON.stringify({ ids: [id] }) }); } catch (e) { /* silently ignored */ }
  };
  host.querySelectorAll('details[data-notice-id]').forEach((el) => {
    el.addEventListener('toggle', () => {
      try {
        if (!el.open) return;
        if (!el.classList.contains('is-unread')) return;
        const id = parseInt(String(el.getAttribute('data-notice-id') || 0), 10) || 0;
        el.classList.remove('is-unread');
        el.classList.add('is-read');
        markOne(id);
      } catch (e) { /* silently ignored */ }
    });
  });
};

const renderAttendance = async () => {
  const host = $('#attendanceHost');
  if (!host) return;
  host.innerHTML = '<div style="font-weight:700;color:#475569;">読み込み中…</div>';
  showSpinner();
  try {
    const date = todayJST();
    const cal = await fetchJSONAuth(`/api/attendance/calendar/day/${encodeURIComponent(date)}`).catch(() => null);
    let isOff;
    if (cal && Object.prototype.hasOwnProperty.call(cal, 'is_off')) {
      // API already applies department-specific rules (e.g. 工事部 Saturdays).
      isOff = Number(cal?.is_off || 0) === 1;
    } else {
      // Safe fallback when calendar API is temporarily unavailable.
      const weekend = (() => {
        try {
          const y = parseInt(date.slice(0, 4), 10);
          const m = parseInt(date.slice(5, 7), 10) - 1;
          const d = parseInt(date.slice(8, 10), 10);
          if (!y || m < 0 || d <= 0) return false;
          const dt = new Date(Date.UTC(y, m, d, 0, 0, 0));
          const dow = dt.getUTCDay();
          return dow === 0 || dow === 6;
        } catch {
          return false;
        }
      })();
      isOff = weekend;
    }
    const daily0 = await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`).catch(() => null);
    const daily = daily0?.daily || null;
    const defaultKubun = isOff ? '休日' : '出勤';
    const kubunSaved = String(daily?.kubun || '').trim();
    const kubunInit = kubunSaved || defaultKubun;
    const wtKey = 'attendance.workType.default';
    const loadWT = () => {
      try {
        const v = localStorage.getItem(wtKey) || '';
        return v === 'onsite' || v === 'remote' || v === 'satellite' ? v : 'onsite';
      } catch {
        return 'onsite';
      }
    };
    const day = await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}`);
    const segments = Array.isArray(day?.segments) ? day.segments : [];
    let last = null;
    for (const s of segments) {
      if (!last || String(s?.checkIn || '') > String(last?.checkIn || '')) last = s;
    }
    const st = last?.checkIn ? (last?.checkOut ? '退勤済' : '出勤中') : '未出勤';
    const canIn = !last?.checkIn;
    const canOut = !!last?.checkIn && !last?.checkOut;
    const wtLabel = (v) => v === 'onsite' ? '出社' : v === 'remote' ? '在宅' : v === 'satellite' ? '現場' : '出社';
    const kubunOptions = isOff
      ? ['休日', '休日出勤', '代替出勤']
      : ['出勤', '半休', '欠勤', '有給休暇', '無給休暇', '代替休日'];
    const kubunGroupLabel = isOff ? '[予定休日]' : '[予定出勤]';
    const kubunOptionsHtml = `
      <option value="" disabled>${esc(kubunGroupLabel)}</option>
      ${kubunOptions.map(k => `<option value="${esc(k)}" ${kubunInit === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}
    `;
    host.innerHTML = `
      <div class="kintai-actions kintai-actions-split">
        <div class="kintai-actions-left">
          <a class="kintai-monthly-link" href="/ui/attendance/monthly">
            月次勤怠入力へ
            <svg class="kintai-icon-pc" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path>
              <path d="M8 21h8"></path>
              <path d="M12 18v3"></path>
            </svg>
          </a>
          <button class="kintai-btn primary" id="btnCheckIn" type="button" ${canIn ? '' : 'disabled'}>出勤</button>
          <button class="kintai-btn" id="btnCheckOut" type="button" ${canOut ? '' : 'disabled'}>退勤</button>
          <a class="kintai-btn" href="/ui/work-report?date=${encodeURIComponent(date)}" style="text-decoration:none;display:inline-flex;align-items:center;">作業報告</a>
        </div>
        <div class="kintai-actions-right">
          <button class="kintai-btn" id="btnConfirm" type="button">確定</button>
        </div>
      </div>
    `;
    const syncPaidLeaveRequest = async (kubun) => {
      if (isYukyuKubun(kubun)) {
        await fetchJSONAuth('/api/leave/paid', {
          method: 'POST',
          body: JSON.stringify({ startDate: date, endDate: date, reason: '' })
        });
        return;
      }
      await fetchJSONAuth('/api/leave/my/cancel-paid', {
        method: 'POST',
        body: JSON.stringify({ date })
      });
    };
    try {
      const sel = $('#workType');
      if (sel) sel.value = loadWT();
      sel?.addEventListener('change', async () => {
        const v = String(sel.value || '');
        try { localStorage.setItem(wtKey, v); } catch (e) { /* silently ignored */ }
        try {
          await fetchJSONAuth('/api/attendance/worktype', { method: 'POST', body: JSON.stringify({ date, workType: v }) });
          const kubun = String($('#kubun')?.value || kubunInit);
          await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`, { method: 'PUT', body: JSON.stringify({ kubun, workType: v }) });
        } catch (e) { /* silently ignored */ }
      });
    } catch (e) { /* silently ignored */ }
    const hideKubunSet = new Set(['欠勤', '有給休暇', '半休', '無給休暇', '休日', '代替休日']);
    const toggleWorkTypeRow = () => {
      const kubun = String($('#kubun')?.value || defaultKubun);
      const tr = $('#workType')?.closest('tr');
      const hide = hideKubunSet.has(kubun);
      if (tr) tr.style.display = hide ? 'none' : '';
      const rIn = document.getElementById('rowCheckIn');
      const rOut = document.getElementById('rowCheckOut');
      if (rIn) rIn.style.display = hide ? 'none' : '';
      if (rOut) rOut.style.display = hide ? 'none' : '';
      const btnIn = $('#btnCheckIn');
      const btnOut = $('#btnCheckOut');
      if (btnIn) btnIn.disabled = hide ? true : btnIn.disabled;
      if (btnOut) btnOut.disabled = hide ? true : btnOut.disabled;
      if (hide) {
        const wtSel = $('#workType');
        if (wtSel) wtSel.value = '';
      } else {
        const wtSel = $('#workType');
        if (wtSel && !wtSel.value) wtSel.value = loadWT();
      }
    };
    toggleWorkTypeRow();
    try {
      const sel2 = $('#kubun');
      sel2?.addEventListener('change', async () => {
        const kubun = String(sel2.value || defaultKubun);
        const wt = hideKubunSet.has(kubun) ? null : (String($('#workType')?.value || loadWT()) || null);
        toggleWorkTypeRow();
        showErr('');
        showSpinner();
        try {
          await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`, { method: 'PUT', body: JSON.stringify({ kubun, workType: wt }) });
          await syncPaidLeaveRequest(kubun);
        } catch (e) {
          showErr(e?.message || '保存に失敗しました');
        } finally {
          hideSpinner();
        }
      });
    } catch (e) { /* silently ignored */ }
    $('#btnCheckIn')?.addEventListener('click', async () => {
      showErr('');
      showSpinner();
      try {
        const kubun = String($('#kubun')?.value || defaultKubun);
        const wt = hideKubunSet.has(kubun) ? null : (String($('#workType')?.value || loadWT()) || null);
        await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`, { method: 'PUT', body: JSON.stringify({ kubun, workType: wt }) });
        await syncPaidLeaveRequest(kubun);
        await fetchJSONAuth('/api/attendance/checkin', { method: 'POST', body: JSON.stringify({ workType: wt }) });
        await renderAttendance();
      } catch (e) {
        showErr(e?.message || '出勤に失敗しました');
      } finally {
        hideSpinner();
      }
    });
    $('#btnCheckOut')?.addEventListener('click', async () => {
      showErr('');
      showSpinner();
      try {
        const kubun = String($('#kubun')?.value || defaultKubun);
        const wt = hideKubunSet.has(kubun) ? null : (String($('#workType')?.value || loadWT()) || null);
        await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`, { method: 'PUT', body: JSON.stringify({ kubun, workType: wt }) });
        await syncPaidLeaveRequest(kubun);
        await fetchJSONAuth('/api/attendance/checkout', { method: 'POST', body: JSON.stringify({}) });
        
        // Cập nhật trạng thái đã lưu sau khi 퇴勤 thành công
        if (typeof window.markAsSaved === 'function') {
          window.markAsSaved();
        }
        
        await renderAttendance();
      } catch (e) {
        showErr(e?.message || '退勤に失敗しました');
      } finally {
        hideSpinner();
      }
    });
    $('#btnConfirm')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      if (btn.dataset.saving === '1') return;
      if (!confirm('保存しますか？')) return;
      btn.dataset.saving = '1';
      const originalText = btn.dataset.originalText || btn.innerHTML;
      btn.dataset.originalText = originalText;
      btn.disabled = true;
      btn.innerHTML = '確定中...';
      showErr('');
      showSpinner(false);
      try {
        const kubun = String($('#kubun')?.value || defaultKubun);
        const wt = hideKubunSet.has(kubun) ? null : (String($('#workType')?.value || loadWT()) || null);
        await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/daily`, { method: 'PUT', body: JSON.stringify({ kubun, workType: wt }) });
        await syncPaidLeaveRequest(kubun);
        await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(date)}/submit`, { method: 'POST', body: JSON.stringify({}) }).catch(() => null);
        
        btn.innerHTML = '確定成功';
        btn.style.background = '#10b981';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#fff';
        
        showSpinner(true);
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.disabled = false;
          btn.dataset.saving = '0';
          hideSpinner();
        }, 1500);
        
        await renderAttendance();
      } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.dataset.saving = '0';
        hideSpinner();
        showErr(err?.message || '確定に失敗しました');
      }
    });
  } catch (e) {
    host.innerHTML = '';
    showErr(e?.message || '読み込みに失敗しました');
  } finally {
    hideSpinner();
  }
};

export async function bootAttendanceRecordsPage() {
  try { document.body.classList.remove('drawer-open', 'mobile-drawer-open'); } catch(e) {}
  prefillUserName();
  try {
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    const params = (() => { try { return new URLSearchParams(String(window.location.search||'')); } catch { return new URLSearchParams(); } })();
    const isBack = params.get('back') === '1';
    const ref = String(document.referrer || '');
    const fromSimple = ref.includes('/ui/attendance/simple');
  } catch (e) { /* silently ignored */ }
  showErr('');
  wireUserMenu();
  wireTopNavDropdowns();
  showSpinner();
  const profile = await ensureAuthProfile();
  if (!profile) {
    window.location.replace('/ui/login');
    return;
  }
  const role = String(profile?.role || '').toLowerCase();
  if (role === 'admin') {
    try { document.body.dataset.roleAdmin = '1'; } catch (e) { /* silently ignored */ }
  }
  try { $('#userName').textContent = profile.username || profile.email || 'ユーザー'; } catch (e) { /* silently ignored */ }
  
  try {
    // Dynamic import to avoid loading issues in older browsers or during fast SPA navigation
    const [mod, usersApi, attendanceApi] = await Promise.all([
      import('./employee-attendance.page.js?v=' + Date.now()),
      import('../api/users.api.js'),
      import('../api/attendance.api.js')
    ]);
    
    if (mod && mod.mountAttendance) {
      const host = $('#attendanceRecordsHost');
      if (host) {
        host.innerHTML = '';
        
        const style = document.createElement('style');
        style.textContent = `
          /* Reset padding cho trang attendance records */
          main.content {
            padding-top: calc(var(--topbar-height) + var(--subbar-height) + 24px) !important;
          }
          @media (max-width: 768px) {
            main.content {
              padding-top: calc(var(--topbar-height) + var(--subbar-height) + 16px) !important;
            }
          }
        `;
        document.head.appendChild(style);
        
        await mod.mountAttendance({
          content: host,
          listUsers: usersApi.listUsers,
          getTimesheet: attendanceApi.getTimesheet,
          getAttendanceDay: attendanceApi.getAttendanceDay,
          updateAttendanceSegment: attendanceApi.updateAttendanceSegment,
          buildTimesheetExportURL: attendanceApi.buildTimesheetExportURL
        });

        // Implement table search functionality
        const searchInput = document.getElementById('globalSearchInputEmp');
        if (searchInput) {
          const applySearch = () => {
            const q = searchInput.value.trim().toLowerCase();
            const rows = document.querySelectorAll('#rosterTable table tbody tr');
            rows.forEach(tr => {
              const text = (tr.textContent || '').toLowerCase();
              tr.style.display = (q === '' || text.includes(q)) ? '' : 'none';
            });
          };
          searchInput.addEventListener('input', applySearch);
          searchInput.addEventListener('change', applySearch);
          
          // Search clear button
          const searchClose = document.querySelector('.search-close');
          if (searchClose) {
            searchClose.addEventListener('click', () => {
              searchInput.value = '';
              applySearch();
            });
          }
        }
      } else {
        throw new Error('Host element #attendanceRecordsHost not found');
      }
    } else {
      throw new Error('mountAttendance export not found in module');
    }
  } catch (err) {
    console.error('Failed to load attendance records:', err);
    showErr('データの読み込みに失敗しました。: ' + (err.message || 'Unknown error'));
  }

  hideSpinner();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('/ui/attendance-records')) {
    bootAttendanceRecordsPage();
  }
});
