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
      .sap-form-container {
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .sap-form-row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        border-bottom: 1px dashed #f1f5f9;
        padding-bottom: 16px;
      }
      .sap-form-row:last-child {
        margin-bottom: 0;
        border-bottom: none;
        padding-bottom: 0;
      }
      .sap-form-label {
        width: 200px;
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        flex-shrink: 0;
      }
      .sap-form-value {
        flex: 1;
        font-size: 14px;
        color: #0f172a;
      }
      .sap-input {
        width: 100%;
        max-width: 400px;
        padding: 8px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 14px;
        color: #0f172a;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #fff;
      }
      .sap-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
      }
      .sap-btn-submit {
        background: #005eb8;
        color: #fff;
        border: none;
        padding: 10px 28px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      .sap-btn-submit:hover {
        background: #004b93;
      }
      .sap-btn-submit:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
      }
      .sap-current-time {
        background: #f8fafc;
        padding: 10px 16px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        display: inline-block;
        color: #334155;
        font-weight: 600;
        line-height: 1.5;
      }
      @media (max-width: 600px) {
        .sap-form-row { flex-direction: column; align-items: flex-start; gap: 8px; }
        .sap-form-label { width: 100%; }
        .sap-input { max-width: 100%; }
      }
    </style>
    <div class="sap-form-container">
      <div class="sap-form-row">
        <div class="sap-form-label">対象日 <span style="color:#ef4444; margin-left:4px;">*</span></div>
        <div class="sap-form-value">
          <input id="adjDate" class="sap-input" type="date" value="${todayISO()}">
        </div>
      </div>

      <div class="sap-form-row">
        <div class="sap-form-label">現在の打刻</div>
        <div class="sap-form-value">
          <div id="adjCurrent" class="sap-current-time">—</div>
        </div>
      </div>

      <div class="sap-form-row">
        <div class="sap-form-label">修正 (出勤)</div>
        <div class="sap-form-value">
          <input id="adjIn" class="sap-input" type="datetime-local">
        </div>
      </div>

      <div class="sap-form-row">
        <div class="sap-form-label">修正 (退勤)</div>
        <div class="sap-form-value">
          <input id="adjOut" class="sap-input" type="datetime-local">
        </div>
      </div>

      <div class="sap-form-row">
        <div class="sap-form-label">理由 (任意)</div>
        <div class="sap-form-value">
          <input id="adjReason" class="sap-input" style="max-width:100%;" placeholder="例: 打刻し忘れ、電車の遅延など">
        </div>
      </div>
      
      <div style="margin-top: 24px; display: flex; align-items: center; gap: 16px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <button id="adjSubmit" class="sap-btn-submit" type="button">申請を送信</button>
        <div id="adjStatus" style="font-size: 14px; font-weight: 600; color: #059669;"></div>
      </div>
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

  els.date?.addEventListener('change', loadDay);
  await loadDay();

  els.submit?.addEventListener('click', async () => {
    if (!els.submit || els.submit.disabled) return;
    showErr('');
    els.submit.disabled = true;
    if (els.status) els.status.textContent = (els.submit.dataset.editId ? '更新中…' : '申請中…');
    const inV = toMySQLDateTime(els.in?.value);
    const outV = toMySQLDateTime(els.out?.value);
    const reason = String(els.reason?.value || '').trim();
    const editId = parseInt(String(els.submit?.dataset?.editId || 0), 10) || null;
    if (!attendanceId && !editId) {
      if (els.status) els.status.textContent = '';
      els.submit.disabled = false;
      showErr('対象日の勤怠が見つかりません');
      return;
    }
    if (!inV && !outV) {
      if (els.status) els.status.textContent = '';
      els.submit.disabled = false;
      showErr('修正(出勤)または修正(退勤)を入力してください');
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
      try { delete els.submit.dataset.editId; els.submit.textContent = '申請'; } catch (e) { /* silently ignored */ }
      await renderList();
    } catch (e) {
      if (els.status) els.status.textContent = '';
      showErr(e?.message || '申請に失敗しました');
    } finally {
      hideSpinner();
      try { if (els.submit) els.submit.disabled = false; } catch (e) { /* silently ignored */ }
    }
  });
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
        ? `<button class="btn-edit" data-id="${r.id}" data-in="${cin}" data-out="${cout}" data-reason="${esc(r.reason || '')}" style="background:#fff; border:1px solid #005eb8; color:#005eb8; border-radius:4px; padding:4px 12px; font-size:12px; font-weight:600; cursor:pointer; margin-right:8px;">編集</button><button class="btn-delete" data-id="${r.id}" style="background:#fff; border:1px solid #ef4444; color:#ef4444; border-radius:4px; padding:4px 12px; font-size:12px; font-weight:600; cursor:pointer;">削除</button>`
        : '';
      return `<tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;">
        <td class="adj-col-id" style="padding: 12px; font-size: 13px;"><a href="#" data-jump="${r.id}" style="color:#005eb8; text-decoration:none; font-weight:600;">${appNo}</a></td>
        <td class="adj-col-status" style="padding: 12px; font-size: 13px;"><span class="${stClass}" style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600; ${st==='approved'?'background:#dcfce7;color:#166534;':(st==='rejected'?'background:#fee2e2;color:#991b1b;':'background:#f1f5f9;color:#475569;')}">${esc(stLabel)}</span></td>
        <td class="adj-col-type" style="padding: 12px; font-size: 13px; color:#334155;">${type}</td>
        <td class="adj-col-detail" style="padding: 12px; font-size: 13px; color:#334155;">${esc(detail)}</td>
        <td class="adj-col-staff" style="padding: 12px; font-size: 13px; color:#334155;">${esc(staff)}</td>
        <td class="adj-col-office" style="padding: 12px; font-size: 13px; color:#334155;">—</td>
        <td class="adj-col-created" style="padding: 12px; font-size: 13px; color:#64748b;">${created}</td>
        <td class="adj-col-actions" style="padding: 12px;">${actions}</td>
      </tr>`;
    }).join('');
    host.innerHTML = `
      <style>
        .sap-list-container {
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .sap-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .sap-list-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .sap-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .sap-search-input, .sap-month-input {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
        }
        .sap-search-input:focus, .sap-month-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .sap-btn-new {
          background: #fff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sap-btn-new:hover {
          background: #f1f5f9;
        }
        .sap-table-wrapper {
          overflow-x: auto;
        }
        .sap-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .sap-table th {
          background: #f8fafc;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .sap-table tbody tr:hover {
          background: #f8fafc;
        }
      </style>
      <div class="sap-list-container">
        <div class="sap-list-header">
          <h3 class="sap-list-title">申請履歴</h3>
          <div class="sap-toolbar">
            <input id="adjustSearch" placeholder="検索..." class="sap-search-input">
            <input type="month" id="adjustMonthFilter" class="sap-month-input" value="${selectedMonth}">
            <button id="adjustNewBtn" class="sap-btn-new">新規作成</button>
          </div>
        </div>
        <div class="sap-table-wrapper">
          <table class="sap-table">
            <thead>
              <tr>
                <th>申請番号</th>
                <th>ステータス</th>
                <th>レコードタイプ</th>
                <th>申請詳細</th>
                <th>スタッフ名</th>
                <th>所属オフィス</th>
                <th>作成日時</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>${tr}</tbody>
          </table>
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
          const id = e.currentTarget.dataset.id;
          if (!confirm('この申請を削除しますか？')) return;
          try {
            await fetchJSONAuth(`/api/adjust/${id}`, { method: 'DELETE' });
            await renderList();
          } catch (err) {
            alert(String(err?.message || '削除に失敗しました'));
          }
        });
      });
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          const cin = e.currentTarget.dataset.in || '';
          const cout = e.currentTarget.dataset.out || '';
          const reason = e.currentTarget.dataset.reason || '';
          const inEl = document.getElementById('adjIn');
          const outEl = document.getElementById('adjOut');
          const rsEl = document.getElementById('adjReason');
          if (inEl) inEl.value = cin.replace(' ', 'T');
          if (outEl) outEl.value = cout.replace(' ', 'T');
          if (rsEl) rsEl.value = reason;
          try { document.getElementById('adjSubmit').textContent = '更新'; } catch (e) { /* silently ignored */ }
          try { document.getElementById('adjSubmit').dataset.editId = id; } catch (e) { /* silently ignored */ }
          const statusEl = document.getElementById('adjStatus');
          if (statusEl) statusEl.textContent = '編集モード';
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
