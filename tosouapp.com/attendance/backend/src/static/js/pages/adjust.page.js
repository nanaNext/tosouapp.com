import { logout } from '../api/auth.api.js';
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

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const showErr = (msg) => {
  const el = $('#error');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = msg;
};

let spinnerCount = 0;
let spinnerTimer = null;
const showSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    spinnerCount++;
    if (!el) return;
    if (spinnerCount === 1) {
      try { clearTimeout(spinnerTimer); } catch (e) { /* silently ignored */ }
      spinnerTimer = setTimeout(() => {
        try {
          if (spinnerCount > 0) {
            el.removeAttribute('hidden');
            el.style.display = 'grid';
          }
        } catch (e) { /* silently ignored */ }
      }, 180);
    }
  } catch (e) { /* silently ignored */ }
};
const hideSpinner = () => {
  try {
    const el = document.querySelector('#pageSpinner');
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount !== 0) return;
    try { clearTimeout(spinnerTimer); } catch (e) { /* silently ignored */ }
    spinnerTimer = null;
    if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }
  } catch (e) { /* silently ignored */ }
};

const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const todayISO = () => new Date().toLocaleDateString('sv-SE');

const toMySQLDateTime = (dtLocal) => {
  const s = String(dtLocal || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s.replace('T', ' ') + ':00';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return s.replace('T', ' ');
  return null;
};

const wireUserMenu = () => {
  const btn = document.querySelector('.user-btn');
  const dd = $('#userDropdown');
  if (!btn || !dd) return;
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const open = !dd.hasAttribute('hidden');
    if (open) dd.setAttribute('hidden', '');
    else dd.removeAttribute('hidden');
    try { btn.setAttribute('aria-expanded', open ? 'false' : 'true'); } catch (e) { /* silently ignored */ }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.user-menu')) return;
    try { dd.setAttribute('hidden', ''); } catch (e) { /* silently ignored */ }
    try { btn.setAttribute('aria-expanded', 'false'); } catch (e) { /* silently ignored */ }
  });
  const logoutBtn = $('#btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await logout(); } catch (e) { /* silently ignored */ }
      try { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('refreshToken'); sessionStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch (e) { /* silently ignored */ }
      window.location.replace('/ui/login');
    });
  }
};

const wireDrawer = () => {
  const btn = $('#mobileMenuBtn');
  const drawer = $('#mobileDrawer');
  const backdrop = $('#drawerBackdrop');
  const closeBtn = $('#mobileClose');
  if (!btn || !drawer || !backdrop) return;
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  const close = () => {
    try { drawer.setAttribute('hidden', ''); backdrop.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); } catch (e) { /* silently ignored */ }
    try { document.body.classList.remove('drawer-open'); } catch (e) { /* silently ignored */ }
  };
  const open = () => {
    try { drawer.removeAttribute('hidden'); backdrop.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); } catch (e) { /* silently ignored */ }
    try { document.body.classList.add('drawer-open'); } catch (e) { /* silently ignored */ }
  };
  btn.addEventListener('click', (e) => { e.preventDefault(); if (drawer.hasAttribute('hidden')) open(); else close(); });
  closeBtn?.addEventListener('click', (e) => { e.preventDefault(); close(); });
  backdrop.addEventListener('click', (e) => { e.preventDefault(); close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  try { drawer.querySelectorAll('.drawer-item, a').forEach(el => el.addEventListener('click', close)); } catch (e) { /* silently ignored */ }
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

const renderForm = async () => {
  const host = $('#adjustFormHost');
  if (!host) return;
  host.innerHTML = `
    <style>
      .sap-compact-card { background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border-radius: 4px; padding: 12px 16px; max-width: 600px; margin: 20px 0 16px 0; }
      .sap-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; }
      .sap-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 6px; }
      .sap-toolbar { display: flex; gap: 8px; }
      .sap-icon-btn { background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; width: 24px; height: 24px; }
      .sap-icon-btn:hover { opacity: 0.7; }
      .sap-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .sap-grid { display: grid; grid-template-columns: 100px 1fr; gap: 12px 16px; align-items: center; }
      .sap-label { font-size: 13px; font-weight: 600; color: #334155; text-align: left; }
      .sap-input { padding: 6px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; max-width: 260px; box-sizing: border-box; outline: none; transition: border-color 0.2s; display: block; }
      .sap-input.full { max-width: 100%; }
      .sap-textarea { padding: 8px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box; outline: none; resize: vertical; min-height: 80px; font-family: inherit; transition: border-color 0.2s; display: block; }
      .sap-textarea:focus { border-color: #005eb8; box-shadow: 0 0 0 2px rgba(0,94,184,0.1); }
      .sap-input:focus { border-color: #005eb8; box-shadow: 0 0 0 2px rgba(0,94,184,0.1); }
      .sap-current { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 13px; color: #334155; border-radius: 4px; line-height: 1.5; width: 100%; max-width: 260px; box-sizing: border-box; display: block; }
    </style>
    <div class="sap-compact-card">
      <div class="sap-header">
        <h3 class="sap-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          修正申請
        </h3>
        <div class="sap-toolbar" style="display: flex; align-items: center; gap: 8px;">
          <button id="btnToggleHistory" title="履歴" class="sap-icon-btn">
            <img src="/static/images/rireki-1.png" alt="履歴" style="width: 24px; height: 24px; object-fit: contain; pointer-events: none;">
          </button>
          <button id="adjSubmit" title="送信" class="sap-icon-btn">
            <img src="/static/images/shinsei.webp" alt="送信" style="width: 24px; height: 24px; object-fit: contain; pointer-events: none;">
          </button>
        </div>
      </div>
      
      <div class="sap-grid">
        <div class="sap-label">対象日 <span style="color:#ef4444">*</span></div>
        <div><input id="adjDate" class="sap-input" type="date" value="${todayISO()}"></div>

        <div class="sap-label">現在の打刻</div>
        <div><div id="adjCurrent" class="sap-current">—</div></div>

        <div class="sap-label">修正(出勤)</div>
        <div><input id="adjIn" class="sap-input" type="datetime-local"></div>

        <div class="sap-label">修正(退勤)</div>
        <div><input id="adjOut" class="sap-input" type="datetime-local"></div>

        <div class="sap-label" style="align-self: flex-start; margin-top: 6px;">理由 <span style="color:#ef4444">*</span></div>
        <div><textarea id="adjReason" class="sap-textarea" placeholder="例: 打刻し忘れ（必須）"></textarea></div>
      </div>
      <div id="adjStatus" style="font-size: 12px; font-weight: 600; color: #059669; text-align: right; margin-top: 8px; min-height: 18px;"></div>
    </div>
  `;

  const els = {
    date: $('#adjDate'),
    current: $('#adjCurrent'),
    in: $('#adjIn'),
    out: $('#adjOut'),
    reason: $('#adjReason'),
    submit: $('#adjSubmit'),
    status: $('#adjStatus')
  };

  const setCurrent = (seg) => {
    const el = els.current;
    if (!el) return;
    if (!seg) { el.textContent = '対象日の勤怠が見つかりません'; return; }
    const cin = String(seg.checkIn || '').slice(0, 16).replace('T', ' ');
    const cout = String(seg.checkOut || '').slice(0, 16).replace('T', ' ');
    el.innerHTML = `出勤: ${cin || '—'}<br>退勤: ${cout || '—'}`;
  };

  let attendanceId = null;
  const loadDay = async () => {
    showErr('');
    const d = els.date?.value;
    if (!isISODate(d)) return;
    showSpinner();
    try {
      const r = await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(d)}`);
      const seg = pickLatestSegment(r?.segments);
      attendanceId = seg?.id || null;
      setCurrent(seg);
      try { if (els.in && seg?.checkIn) els.in.value = String(seg.checkIn).slice(0, 16); } catch (e) { /* silently ignored */ }
      try { if (els.out && seg?.checkOut) els.out.value = String(seg.checkOut).slice(0, 16); } catch (e) { /* silently ignored */ }
    } catch (e) {
      attendanceId = null;
      setCurrent(null);
      showErr(e?.message || '読み込みに失敗しました');
    } finally {
      hideSpinner();
    }
  };

  const toggleDrawer = () => {
    const drawer = $('#sapDrawer');
    const overlay = $('#sapDrawerOverlay');
    if (!drawer || !overlay) return;
    
    const isActive = drawer.classList.contains('active');
    if (isActive) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = ''; // Restore scroll
    } else {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  };

  $('#btnToggleHistory')?.addEventListener('click', toggleDrawer);
  
  // Xử lý sự kiện click cho các nút động (close, overlay) bằng Event Delegation
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btnDrawerClose') || e.target.id === 'sapDrawerOverlay') {
      toggleDrawer();
    }
  });

  els.date?.addEventListener('change', loadDay);
  await loadDay();

  const handleApply = async () => {
    if (!els.submit || els.submit.disabled) return;

    // Yêu cầu xác nhận trước khi gửi
    const isEdit = !!els.submit.dataset.editId;
    const confirmMsg = isEdit ? 'この内容で申請を更新しますか？' : 'この内容で申請を送信しますか？';
    if (!confirm(confirmMsg)) return;

    showErr('');
    els.submit.disabled = true;

    // Thêm vòng quay xoay tròn trong lúc đang gửi
    const originalIcon = els.submit.innerHTML;
    els.submit.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:24px;height:24px;animation:spin 1s linear infinite;"><circle cx="25" cy="25" r="20" fill="none" stroke="#005eb8" stroke-width="5" stroke-linecap="round" stroke-dasharray="80 200"></circle></svg><style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;

    if (els.status) els.status.textContent = (isEdit ? '更新中…' : '申請中…');
    const inV = toMySQLDateTime(els.in?.value);
    const outV = toMySQLDateTime(els.out?.value);
    const reason = String(els.reason?.value || '').trim();
    const editId = parseInt(String(els.submit?.dataset?.editId || 0), 10) || null;

    if (!attendanceId && !editId) {
      if (els.status) els.status.textContent = '';
      els.submit.disabled = false;
      els.submit.innerHTML = originalIcon;
      showErr('対象日の勤怠が見つかりません');
      return;
    }
    if (!inV && !outV) {
      if (els.status) els.status.textContent = '';
      els.submit.disabled = false;
      els.submit.innerHTML = originalIcon;
      showErr('修正(出勤)または修正(退勤)を入力してください');
      return;
    }
    if (!reason) {
      if (els.status) els.status.textContent = '';
      els.submit.disabled = false;
      els.submit.innerHTML = originalIcon;
      showErr('理由を入力してください');
      return;
    }
    showSpinner();
    try {
      if (editId) {
        await fetchJSONAuth(`/api/adjust/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({ requestedCheckIn: inV, requestedCheckOut: outV, reason })
        });
        if (els.status) els.status.textContent = '更新しました';
      } else {
        await fetchJSONAuth('/api/adjust', { method: 'POST', body: JSON.stringify({ attendanceId, requestedCheckIn: inV, requestedCheckOut: outV, reason }) });
        if (els.status) els.status.textContent = '申請しました';
      }
      try { delete els.submit.dataset.editId; } catch (e) { /* silently ignored */ }
      if (els.in) els.in.value = '';
      if (els.out) els.out.value = '';
      if (els.reason) els.reason.value = '';
      await renderList();
    } catch (e) {
      if (els.status) els.status.textContent = '';
      showErr(e?.message || '申請に失敗しました');
    } finally {
      hideSpinner();
      try { 
        if (els.submit) {
          els.submit.disabled = false;
          els.submit.innerHTML = originalIcon;
        }
      } catch (e) { /* silently ignored */ }
    }
  };

  els.submit?.addEventListener('click', handleApply);
};

const renderList = async () => {
  const host = $('#adjustListHost');
  if (!host) return;
  host.innerHTML = '<div style="color:#475569;font-weight:650;">履歴を読み込み中…</div>';
  showSpinner();
  try {
    const [rows, profile] = await Promise.all([
      fetchJSONAuth('/api/adjust/my'),
      fetchJSONAuth('/api/auth/me').catch(() => null)
    ]);
    if (!Array.isArray(rows) || rows.length === 0) {
      host.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>申請はありません</div></div>';
      return;
    }
    // Thêm input chọn tháng nếu chưa có
    let selectedMonth = '';
    const now = new Date();
    selectedMonth = now.toISOString().slice(0, 7); // yyyy-MM

    const monthInput = document.getElementById('adjustMonthFilter');
    if (monthInput && monthInput.value) {
      selectedMonth = monthInput.value;
    }

    // Lọc dữ liệu theo tháng được chọn
    const filteredRows = rows.filter(r => {
      const created = r.created_at ? String(r.created_at).slice(0, 7) : '';
      return created === selectedMonth;
    });

    if (!Array.isArray(filteredRows) || filteredRows.length === 0) {
      host.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>申請はありません</div></div>';
      return;
    }

    const tr = filteredRows.map((r, idx) => {
      const cin  = String(r.requestedCheckIn  || '').slice(0, 16).replace('T', ' ');
      const cout = String(r.requestedCheckOut || '').slice(0, 16).replace('T', ' ');
      const st = String(r.status || 'pending');
      let stLabel, stClass;
      if (st === 'approved') { stLabel = '承認済み'; stClass = 'adj-status-approved'; }
      else if (st === 'rejected') { stLabel = '却下'; stClass = 'adj-status-rejected'; }
      else { stLabel = '承認待ち'; stClass = 'adj-status-pending'; }
      const created = r.created_at ? String(r.created_at).slice(0, 16).replace('T', ' ') : '—';
      const staff = profile?.username || profile?.email || '';
      const appNo = `R-${String(r.id).padStart(7, '0')}`;
      const detail = r.reason ? `${r.reason}` : '';
      const type = '打刻修正（申請）';
      const actions = st === 'pending'
        ? `<button class="btn-edit sap-action-btn" data-id="${r.id}" data-in="${cin}" data-out="${cout}" data-reason="${esc(r.reason || '')}" title="編集"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button> <button class="btn-delete sap-action-btn delete" data-id="${r.id}" title="削除"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`
        : '';
      return `<tr>
        <td><a href="#" data-jump="${r.id}" style="color:#005eb8; text-decoration:none; font-weight:600;">${appNo}</a></td>
        <td><span class="sap-badge ${stClass}">${esc(stLabel)}</span></td>
        <td>${type}</td>
        <td>${esc(detail)}</td>
        <td>${created}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
    host.innerHTML = `
        <style>
          /* SAP Fiori Drawer (Side Panel) Styles */
          .sap-drawer-overlay {
            position: fixed;
            top: var(--topbar-height, 60px); /* Bám sát dưới thanh tiêu đề */
            left: 0;
            width: 100vw;
            height: calc(100vh - var(--topbar-height, 60px));
            background: rgba(15, 23, 42, 0.4);
            z-index: 900;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          @media (min-width: 1025px) {
            .sap-drawer-overlay {
              top: calc(var(--topbar-height, 60px) + 44px);
              height: calc(100vh - var(--topbar-height, 60px) - 44px);
            }
          }
          .sap-drawer-overlay.active {
            opacity: 1;
            pointer-events: auto;
          }
          .sap-drawer {
            position: fixed;
            top: var(--topbar-height, 60px); /* Bám sát dưới thanh tiêu đề */
            right: -800px;
            width: 100%;
            max-width: 800px;
            height: calc(100vh - var(--topbar-height, 60px));
            background: #fff;
            box-shadow: -4px 0 15px rgba(0,0,0,0.1);
            z-index: 901;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
          }
          @media (min-width: 1025px) {
            .sap-drawer {
              top: calc(var(--topbar-height, 60px) + 44px); /* Trên PC: Bám sát dưới thanh tiêu đề + thanh menu phụ (44px) */
              height: calc(100vh - var(--topbar-height, 60px) - 44px);
            }
          }
          .sap-drawer.active {
            right: 0;
          }
          .sap-drawer-header {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            min-height: 40px;
            box-sizing: border-box;
          }
          .sap-drawer-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .sap-drawer-close {
            background: transparent;
            border: none;
            font-size: 20px;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
            line-height: 1;
          }
          .sap-drawer-close:hover { background: #e2e8f0; color: #0f172a; }
          .sap-drawer-body {
            flex: 1;
            overflow-y: auto;
            padding: 12px; /* Giảm padding trên mobile */
          }
          @media (min-width: 768px) {
            .sap-drawer-body {
              padding: 20px;
            }
          }
          
          .sap-table-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
          .sap-table-input { padding: 6px 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; width: 100%; max-width: 140px; box-sizing: border-box; }
          @media (max-width: 400px) {
            .sap-table-input { max-width: 100%; }
          }
          .sap-table-input:focus { border-color: #005eb8; }
          .sap-table-wrap { border: 1px solid #cbd5e1; border-radius: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .sap-compact-table { width: 100%; border-collapse: collapse; min-width: 600px; }
          .sap-compact-table th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #475569; text-align: left; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
          .sap-compact-table td { padding: 8px 12px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          .sap-compact-table tr:hover { background: #f8fafc; }
          .sap-badge { display: inline-block; padding: 2px 6px; border-radius: 2px; font-size: 11px; font-weight: 600; white-space: nowrap; }
          .sap-badge.approved { background: #dcfce7; color: #166534; }
          .sap-badge.rejected { background: #fee2e2; color: #991b1b; }
          .sap-badge.pending { background: #f1f5f9; color: #475569; }
          .sap-action-btn { background: transparent; border: 1px solid transparent; color: #005eb8; padding: 4px; font-size: 12px; cursor: pointer; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; }
          .sap-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
          .sap-action-btn.delete { color: #ef4444; }

          /* Mobile Inline Edit Form Styles */
          .inline-edit-container {
            padding: 12px; 
            background: #eef4ff; 
            border-top: 2px solid #005eb8; 
            border-bottom: 2px solid #005eb8; 
            position: relative; 
            width: 100%; 
            box-sizing: border-box;
          }
          /* Sticky Left Behavior for small screens (khi bảng bị cuộn) */
          @media (max-width: 640px) {
            .inline-edit-container {
              position: sticky;
              left: 0;
              width: calc(100vw - 24px); /* Độ rộng bằng màn hình trừ đi padding của drawer */
            }
          }
        </style>

        <div id="sapDrawerOverlay" class="sap-drawer-overlay"></div>
        <div id="sapDrawer" class="sap-drawer">
          <div class="sap-drawer-header">
            <h3 class="sap-drawer-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              申請履歴
            </h3>
            <button id="btnDrawerClose" class="sap-drawer-close" title="閉じる">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="sap-drawer-body">
            <div class="sap-table-toolbar">
              <input id="adjustSearch" placeholder="検索..." class="sap-table-input">
              <input type="month" id="adjustMonthFilter" class="sap-table-input" value="${selectedMonth}">
            </div>
            <div class="sap-table-wrap">
              <table class="sap-compact-table">
                <thead>
                  <tr>
                    <th>申請番号</th>
                    <th>ステータス</th>
                    <th>レコードタイプ</th>
                    <th>申請詳細</th>
                    <th>作成日時</th>
                    <th>アクション</th>
                  </tr>
                </thead>
                <tbody>${tr}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    // Gắn lại sự kiện onchange cho input tháng
    setTimeout(() => {
      const monthFilter = document.getElementById('adjustMonthFilter');
      if (monthFilter) {
        monthFilter.addEventListener('change', renderList);
      }
      const searchInput = document.getElementById('adjustSearch');
      if (searchInput) {
        let t = 0;
        searchInput.addEventListener('input', () => {
          try { clearTimeout(t); } catch (e) { /* silently ignored */ }
          t = setTimeout(() => {
            const q = String(searchInput.value || '').trim().toLowerCase();
            const rows = host.querySelectorAll('.adj-table tbody tr');
            rows.forEach(tr => {
              const text = tr.textContent.toLowerCase();
              tr.style.display = text.includes(q) ? '' : 'none';
            });
          }, 180);
        });
      }
      const newBtn = document.getElementById('adjustNewBtn');
      if (newBtn) {
        newBtn.addEventListener('click', () => {
          try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* silently ignored */ }
          try { document.getElementById('adjReason')?.focus(); } catch (e) { /* silently ignored */ }
        });
      }
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const id = e.currentTarget.dataset.id;
          if (!confirm('この申請を削除しますか？')) return;
          try {
            await fetchJSONAuth(`/api/adjust/${id}`, { method: 'DELETE' });
            await renderList(); // Chỉ render lại danh sách, không redirect
          } catch (err) {
            showErr(err?.message || '削除に失敗しました');
          }
        });
      });
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const tr = e.currentTarget.closest('tr');
          if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('inline-edit-row')) return;

          // Đóng các form sửa inline khác đang mở
          document.querySelectorAll('.inline-edit-row').forEach(el => el.remove());
          document.querySelectorAll('tr[data-hidden="1"]').forEach(el => {
            el.style.display = '';
            delete el.dataset.hidden;
          });

          const id = e.currentTarget.dataset.id;
          const cin = e.currentTarget.dataset.in || '';
          const cout = e.currentTarget.dataset.out || '';
          const reason = e.currentTarget.dataset.reason || '';

          // Ẩn dòng hiện tại
          tr.style.display = 'none';
          tr.dataset.hidden = '1';

          // Tạo dòng form sửa inline mới
          const editTr = document.createElement('tr');
          editTr.className = 'inline-edit-row';
          editTr.innerHTML = `
            <td colspan="6" style="padding: 0; border: none;">
              <div class="inline-edit-container">
                <button class="inline-close" style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; cursor: pointer; color: #64748b; font-size: 14px; padding: 4px; line-height: 1;" title="閉じる">✕</button>
                <div style="font-weight: 600; color: #005eb8; margin-bottom: 12px; font-size: 13px;">申請の編集</div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;">
                  <div style="flex: 1 1 130px; min-width: 130px;">
                    <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">修正(出勤)</div>
                    <input type="datetime-local" class="sap-table-input inline-in" style="width: 100%; max-width: 100%; box-sizing: border-box;" value="${cin.replace(' ', 'T')}">
                  </div>
                  <div style="flex: 1 1 130px; min-width: 130px;">
                    <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">修正(退勤)</div>
                    <input type="datetime-local" class="sap-table-input inline-out" style="width: 100%; max-width: 100%; box-sizing: border-box;" value="${cout.replace(' ', 'T')}">
                  </div>
                  <div style="flex: 1 1 200px; min-width: 200px;">
                    <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">理由 <span style="color:#ef4444">*</span></div>
                    <input type="text" class="sap-table-input inline-reason" style="width: 100%; max-width: 100%; box-sizing: border-box;" value="${esc(reason)}" placeholder="理由を入力してください">
                  </div>
                  <div style="display: flex; gap: 8px; flex: 1 1 auto; justify-content: flex-end;">
                    <button class="sap-icon-btn inline-cancel" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 16px; width: auto; height: 36px; font-size: 13px;">キャンセル</button>
                    <button class="sap-icon-btn inline-save" style="background: #005eb8; color: #fff; border-radius: 4px; padding: 0 16px; width: auto; height: 36px; font-size: 13px; font-weight: 600;">保存</button>
                  </div>
                </div>
              </div>
            </td>
          `;
          tr.parentNode.insertBefore(editTr, tr.nextSibling);

          // Hủy sửa
          const cancelEdit = (ev) => {
            ev.preventDefault();
            editTr.remove();
            tr.style.display = '';
            delete tr.dataset.hidden;
          };
          editTr.querySelector('.inline-cancel').addEventListener('click', cancelEdit);
          editTr.querySelector('.inline-close').addEventListener('click', cancelEdit);

          // Lưu sửa
          editTr.querySelector('.inline-save').addEventListener('click', async (ev) => {
            ev.preventDefault();
            const btnSave = ev.currentTarget;
            const newIn = toMySQLDateTime(editTr.querySelector('.inline-in').value);
            const newOut = toMySQLDateTime(editTr.querySelector('.inline-out').value);
            const newReason = editTr.querySelector('.inline-reason').value.trim();

            if (!newReason) {
              showErr('理由を入力してください');
              return;
            }

            btnSave.disabled = true;
            btnSave.textContent = '保存中...';
            showErr('');

            try {
              await fetchJSONAuth('/api/adjust/' + id, {
                method: 'PATCH',
                body: JSON.stringify({ requestedCheckIn: newIn, requestedCheckOut: newOut, reason: newReason })
              });
              // Cập nhật lại toàn bộ bảng (bảng sẽ vẫn mở)
              await renderList();
            } catch (err) {
              btnSave.disabled = false;
              btnSave.textContent = '保存';
              showErr(err?.message || '更新に失敗しました');
            }
          });
        });
      });
    }, 0);
  } catch (e) {
    host.innerHTML = `<div style="color:#b00020;font-weight:650;">取得失敗: ${esc(e?.message || 'unknown')}</div>`;
  } finally {
    hideSpinner();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  wireUserMenu();
  wireDrawer();
  prefillUserName();
  try {
    const profile = await fetchJSONAuth('/api/auth/me');
    const role = String(profile?.role || '').toLowerCase();
    // Admin không được tạo request, chỉ được xét duyệt
    if (!profile || !(role === 'employee' || role === 'manager')) {
      window.location.replace('/ui/login');
      return;
    }
    const name = profile.username || profile.email || 'ユーザー';
    const el = $('#userName');
    if (el) el.textContent = name;
  } catch {
    window.location.replace('/ui/login');
    return;
  }
  await renderForm();
  await renderList();
});
