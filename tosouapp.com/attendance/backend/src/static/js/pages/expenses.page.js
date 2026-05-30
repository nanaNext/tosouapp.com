import { logout } from '/static/js/api/auth.api.js?v=20260416-1';
import { fetchJSONAuth } from '/static/js/api/http.api.js?v=20260416-1';
import '/static/js/pages/employee-notify.sticky.js';
const $ = (sel) => document.querySelector(sel);
const prefillUserName = () => {
  try {
    // Lấy thông tin người dùng từ sessionStorage
    // Nếu không có thông tin người dùng thì sẽ lấy từ localStorage
    // tiếp theo sẽ là lấy từ server

    const el = $('#userName');
    const standaloneNameEl = $('#expHeaderName');
    const standaloneInitEl = $('#expHeaderInitial');
    const toggleBtn = $('#expUserToggleBtn');
    const dropdown = $('#expUserDropdown');
    const logoutBtn = $('#expLogoutBtn');
    const toggleSidebarBtn = $('#expToggleSidebarBtn');
    const mobileCloseDrawerBtn = $('#expMobileCloseDrawer');
    const mobileBackdrop = $('#expMobileBackdrop');
    const layoutEl = $('.expense-layout');

    if (toggleSidebarBtn && layoutEl) {
      toggleSidebarBtn.addEventListener('click', () => {
        layoutEl.classList.toggle('sidebar-collapsed');
        if (window.innerWidth <= 768) {
          document.body.classList.toggle('exp-drawer-open', layoutEl.classList.contains('sidebar-collapsed'));
        }
      });
    }

    if (mobileBackdrop && layoutEl) {
      mobileBackdrop.addEventListener('click', () => {
        layoutEl.classList.remove('sidebar-collapsed');
        document.body.classList.remove('exp-drawer-open');
      });
    }

    if (mobileCloseDrawerBtn && layoutEl) {
      mobileCloseDrawerBtn.addEventListener('click', () => {
        layoutEl.classList.remove('sidebar-collapsed');
        document.body.classList.remove('exp-drawer-open');
      });
    }

    if (toggleBtn && dropdown) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
          dropdown.classList.remove('show');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try { await logout(); } catch { }
        try { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('refreshToken'); sessionStorage.removeItem('user'); } catch { }
        try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch { }
        try { localStorage.setItem('auth-logout-event', Date.now()); } catch { }
        window.location.replace('/ui/login');
      });
    }

    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const u = raw ? JSON.parse(raw) : null;
    const name = (u && (u.username || u.email)) ? String(u.username || u.email) : '';
    if (name) {
      if (el) el.textContent = name;
      if (standaloneNameEl) standaloneNameEl.textContent = name;
      if (standaloneInitEl) standaloneInitEl.textContent = name.charAt(0).toUpperCase();
    }
  } catch { }
};
let _errTimer = null;
const showErr = (m) => {
  const el = $('#error');
  if (!el) return;
  if (_errTimer) { clearTimeout(_errTimer); _errTimer = null; }
  if (!m) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = String(m);
  _errTimer = setTimeout(() => {
    try { el.style.display = 'none'; el.textContent = ''; } catch { }
  }, 10_000);
};
let sc = 0;
let spinnerTimer = null;
const showSpinner = () => {
  try {
    const el = $('#pageSpinner');
    sc++;
    if (!el) return;
    if (sc === 1) {
      try { clearTimeout(spinnerTimer); } catch { }
      spinnerTimer = setTimeout(() => {
        try {
          if (sc > 0) {
            el.removeAttribute('hidden');
            el.style.display = 'grid';
          }
        } catch { }
      }, 180);
    }
  } catch { }
};
const hideSpinner = () => {
  try {
    const el = $('#pageSpinner');
    sc = Math.max(0, sc - 1);
    if (sc !== 0) return;
    try { clearTimeout(spinnerTimer); } catch { }
    spinnerTimer = null;
    if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; }
  } catch { }
};
const todayISO = () => new Date().toLocaleDateString('sv-SE');
const currentYM = () => todayISO().slice(0, 7);
const recentMonths = (count = 6, baseYM = currentYM()) => {
  const out = [];
  const y = Number(String(baseYM).slice(0, 4));
  const m = Number(String(baseYM).slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return out;
  const d = new Date(y, m - 1, 1);
  for (let i = 0; i < count; i++) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    out.push(`${yy}-${mm}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};
const fmtDT = (v) => {
  if (!v) return '';
  try {
    const d = typeof v === 'string' ? new Date(v) : v;
    if (!d || isNaN(d.getTime())) return String(v).replace('T', ' ').slice(0, 16);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch { return String(v).replace('T', ' ').slice(0, 16); }
};
const fmtDateOnly = (v) => {
  const s = String(v || '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
};
const normalizeVia = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  // Ignore obvious test noise like "pppp", "aaaaa".
  if (/^[a-z]+$/i.test(s) && /(.)\1{2,}/i.test(s)) return '';
  return s;
};
const parseAmount = (v) => {
  const s = String(v == null ? '' : v).replace(/[^\d.-]/g, '').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const formatAmount = (v) => {
  const n = parseAmount(v);
  return n ? n.toLocaleString('ja-JP') : '';
};
const bindAmountFormatter = (input) => {
  if (!input || input.dataset.amountFmt === '1') return;
  input.dataset.amountFmt = '1';
  input.addEventListener('focus', () => {
    const n = parseAmount(input.value);
    input.value = n ? String(n) : '';
  });
  input.addEventListener('blur', () => {
    input.value = formatAmount(input.value);
  });
};
const renderFilePreview = (input, hostId) => {
  const host = document.getElementById(hostId);
  if (!host) return;
  const f = input?.files?.[0];
  if (!f) {
    host.innerHTML = '';
    return;
  }
  if ((f.type || '').startsWith('image/')) {
    const url = URL.createObjectURL(f);
    host.innerHTML = `<img src="${url}" alt="" class="upload-thumb"><div style="margin-top:4px;">${String(f.name || '')}</div>`;
    return;
  }
  host.innerHTML = `<div class="upload-file-chip">📄 <span>${String(f.name || '')}</span></div>`;
};
const renderMultiFilePreview = (input, hostId) => {
  const host = document.getElementById(hostId);
  if (!host) return;
  const files = Array.from(input?.files || []);
  if (!files.length) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = files.slice(0, 4).map((f) => {
    if ((f.type || '').startsWith('image/')) {
      const url = URL.createObjectURL(f);
      return `<img src="${url}" alt="" class="upload-thumb" style="margin-right:6px;">`;
    }
    return `<span class="upload-file-chip" style="margin-right:6px;">📄 <span>${String(f.name || '')}</span></span>`;
  }).join('') + (files.length > 4 ? `<div style="margin-top:4px;">+${files.length - 4} files</div>` : '');
};
const clearFieldErrors = () => {
  try {
    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));
    document.querySelectorAll('.field-msg').forEach((el) => el.remove());
  } catch { }
};
const setFieldError = (fieldId, message) => {
  try {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.classList.add('field-error');
    const old = document.getElementById(`${fieldId}Err`);
    if (old) old.remove();
    const msg = document.createElement('div');
    msg.className = 'field-msg';
    msg.id = `${fieldId}Err`;
    msg.textContent = String(message || '');
    const host = el.closest('div') || el.parentElement;
    host?.appendChild(msg);
  } catch { }
};
let formActive = false;
let navBusy = false;
let renderListBusy = false;
let renderListPending = false;
let listRateLimitedUntilMs = 0;
let listRetryTimer = null;
let noticeUnreadCount = 0;
let noticeLatestIncomingAtMs = 0;
let noticeSeenAtMs = 0;
let noticeSeenKey = '';
let noticePollTimer = null;
let expensesPageMounted = false;
let createTargetMonth = currentYM();
let meProfile = null;
let activeHistoryTab = 'new';
let selectedHistoryMonth = '';
let monthDeletePick = '';
let continueCreateForMonth = null;
let showMonthProgressInNewMode = false;
let monthMetaByYm = new Map();
let activeSummaryCard = ''; // Set default to empty so it doesn't show 'all' by default
let currentDraftsForConfirm = [];
let currentTotalForConfirm = 0;
const EXPENSES_ACTIVE_TAB_KEY = 'expenses.activeTab';
const fmtYmJa = (ym) => {
  const s = String(ym || '');
  if (!/^\d{4}-\d{2}$/.test(s)) return '';
  return `${s.slice(0, 4)}年${s.slice(5, 7)}月`;
};
const firstDayOfYm = (ym) => (/^\d{4}-\d{2}$/.test(String(ym || '')) ? `${String(ym)}-01` : '-');
const isSubmittedStatus = (v) => {
  const s = String(v || '').toLowerCase();
  return s === 'applied' || s === 'approved' || s === 'paid' || s === 'rejected';
};
const isNoticeFeedbackStatus = (v) => {
  const s = String(v || '').toLowerCase();
  return s === 'approved' || s === 'rejected';
};
const toMs = (v) => {
  try {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
  } catch { return 0; }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
const isTooManyReqErr = (e) => {
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('too many requests') || msg.includes('操作が多すぎます') || msg.includes('http 429') || msg.includes('429');
};
const isNotFoundErr = (e) => {
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('http 404') || msg.includes('404');
};
const fetchJSONAuthSafe = async (url, options, retry = 1) => {
  try {
    return await fetchJSONAuth(url, options);
  } catch (e) {
    if (retry > 0 && isTooManyReqErr(e)) {
      await sleep(1200);
      return fetchJSONAuthSafe(url, options, retry - 1);
    }
    throw e;
  }
};
const _getCache = new Map();
const fetchJSONAuthSafeCached = async (url, ttlMs = 8000) => {
  const u = String(url || '');
  const now = Date.now();
  const hit = _getCache.get(u);
  if (hit && hit.value !== undefined && hit.exp > now) return hit.value;
  if (hit && hit.promise) return hit.promise;
  const p = fetchJSONAuthSafe(u).then((v) => {
    _getCache.set(u, { value: v, exp: Date.now() + Math.max(0, Number(ttlMs || 0)) });
    return v;
  }).catch((e) => {
    _getCache.delete(u);
    throw e;
  });
  _getCache.set(u, { promise: p, exp: now + 500 });
  return p;
};
const setNoticeBadge = (n) => {
  const badge = document.getElementById('noticeBadge');
  if (!badge) return;
  const c = Math.max(0, Number(n || 0));
  if (!c) {
    badge.setAttribute('hidden', '');
    badge.textContent = '0';
    return;
  }
  badge.textContent = c > 99 ? '99+' : String(c);
  badge.removeAttribute('hidden');
};
const markNoticeSeen = () => {
  noticeSeenAtMs = Math.max(noticeSeenAtMs || 0, noticeLatestIncomingAtMs || Date.now());
  if (noticeSeenKey) {
    try { localStorage.setItem(noticeSeenKey, String(noticeSeenAtMs)); } catch { }
  }
  noticeUnreadCount = 0;
  setNoticeBadge(0);
};
const refreshNoticeMessages = async () => {
  try {
    const rows = await fetchJSONAuthSafeCached('/api/expenses/my/messages', 8000);
    const list = Array.isArray(rows) ? rows : [];
    const myId = String(window.MY_ID || '');
    const incoming = list.filter((m) => String(m?.sender_user_id || '') !== myId);
    let latest = 0;
    for (const m of incoming) latest = Math.max(latest, toMs(m?.created_at));
    noticeLatestIncomingAtMs = latest;
    noticeUnreadCount = incoming.filter((m) => toMs(m?.created_at) > (noticeSeenAtMs || 0)).length;
    setNoticeBadge(noticeUnreadCount);
  } catch { }
};
const renderSummary = async () => {
    try {
      const m = currentYM();
      const rows = await fetchJSONAuthSafeCached(`/api/expenses/my?month=${encodeURIComponent(m)}`, 8000);
      const a = Array.isArray(rows) ? rows.filter(r => String(r.status) === 'applied').length : 0;
      const sA = document.getElementById('empSumApplied');
      if (sA) sA.textContent = String(a);
      try {
        const latest = await fetchJSONAuthSafe('/api/expenses/months/applied');
        const label = latest && latest.month ? String(latest.month) : '';
        const cnt = latest && latest.count != null ? Number(latest.count || 0) : null;
        const elM = document.getElementById('empAppliedMonth');
        if (elM) elM.textContent = label ? (label.slice(0, 4) + '年' + label.slice(5, 7) + '月') : '-';
        if (cnt != null && sA) sA.textContent = String(cnt);
      } catch { }
    } catch { }
  };

  // Add event listener for global year filter
  const globalYearFilter = document.getElementById('exFilterYearGlobal');
  if (globalYearFilter) {
    if (!globalYearFilter.value) {
      globalYearFilter.value = currentYM().slice(0, 4);
    }
    globalYearFilter.addEventListener('change', async (e) => {
      const yy = e.target.value;
      if (yy) {
        // window.createTargetMonth = ym; // We don't set createTargetMonth on year change
        activeSummaryCard = ''; // Ẩn bảng khi đổi năm
        
        // Cập nhật lại UI của các thẻ trạng thái (Summary Cards) - bỏ chọn tất cả
        document.querySelectorAll('.summary-card').forEach(card => {
          card.style.border = '1px solid var(--border)';
          card.style.boxShadow = 'none';
          card.style.background = '#fff';
        });
        
        await renderList();
      }
    });
  }
const renderNotices = async () => {
  try {
    // Avoid unnecessary /api/expenses/my calls while user is not on notice tab.
    if (activeHistoryTab !== 'notice') return;
    const m = currentYM();
    const rows = await fetchJSONAuthSafeCached(`/api/expenses/my?month=${encodeURIComponent(m)}&status=rejected`, 8000);
    const n = Array.isArray(rows) ? rows.length : 0;
    const c = document.getElementById('empNoticeCount');
    if (c) c.textContent = String(n);
  } catch { }
};
const wireUserMenu = () => {
  const btn = $('.user-btn'); const dd = $('#userDropdown'); if (!btn || !dd || btn.dataset.bound === '1') return; btn.dataset.bound = '1';
  btn.addEventListener('click', (e) => { e.preventDefault(); const open = !dd.hasAttribute('hidden'); if (open) dd.setAttribute('hidden', ''); else dd.removeAttribute('hidden'); btn.setAttribute('aria-expanded', open ? 'false' : 'true'); });
  document.addEventListener('click', (e) => { if (e.target.closest('.user-menu')) return; dd.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); });
  const logoutBtn = $('#btnLogout'); if (logoutBtn) logoutBtn.addEventListener('click', async () => { try { await logout(); } catch { } try { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('refreshToken'); sessionStorage.removeItem('user'); } catch { } try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch { } window.location.replace('/ui/login'); });

};
const wireDrawer = () => {
  const btn = $('#mobileMenuBtn'); const drawer = $('#mobileDrawer'); const backdrop = $('#drawerBackdrop'); const closeBtn = $('#mobileClose');
  if (!btn || !drawer || !backdrop || btn.dataset.bound === '1') return; btn.dataset.bound = '1';
  const close = () => { drawer.setAttribute('hidden', ''); backdrop.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('drawer-open'); };
  const open = () => { drawer.removeAttribute('hidden'); backdrop.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); document.body.classList.add('drawer-open'); };
  btn.addEventListener('click', (e) => { e.preventDefault(); if (drawer.hasAttribute('hidden')) open(); else close(); });
  closeBtn?.addEventListener('click', (e) => { e.preventDefault(); close(); });
  backdrop.addEventListener('click', (e) => { e.preventDefault(); close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
};
const openQuickEditExpense = async (recId) => {
  const id = String(recId || '');
  if (!id) return false;
  let rec = null;
  try {
    rec = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`);
  } catch (e) {
    showErr(e?.message || 'データ取得に失敗しました');
    return false;
  }
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1200;';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);width:min(860px,95vw);max-height:82vh;overflow:auto;background:#fff;border:1px solid #dbe3ef;border-radius:14px;box-shadow:0 24px 48px rgba(0,0,0,.18);padding:14px;z-index:1210;';
  modal.innerHTML = `
    <div style="font-weight:800;color:#0b2c66;margin-bottom:8px;">申請内容を編集</div>
    <div class="adjust-grid" style="grid-template-columns:110px minmax(0,1fr) 110px minmax(0,1fr);gap:8px;">
      <div class="adjust-label">日付</div><div><input id="qeDate" type="date" class="adjust-input"></div>
      <div class="adjust-label">種別</div><div><select id="qeType" class="adjust-input"><option value="train">電車</option><option value="bus">バス</option><option value="taxi">タクシー</option><option value="car">自家用車</option><option value="parking">駐車場代</option><option value="highway">高速料金</option></select></div>
      <div class="adjust-label">出発地</div><div><input id="qeOrigin" class="adjust-input"></div>
      <div class="adjust-label">経由</div><div><input id="qeVia" class="adjust-input"></div>
      <div class="adjust-label">到着地</div><div><input id="qeDestination" class="adjust-input"></div>
      <div class="adjust-label">片道/往復</div><div><select id="qeTripType" class="adjust-input"><option value="one_way">片道</option><option value="round_trip">往復</option><option value="multi">複数</option></select></div>
      <div class="adjust-label">回数</div><div><input id="qeTripCount" type="number" min="1" step="1" class="adjust-input"></div>
      <div class="adjust-label">距離(km)</div><div><input id="qeKm" type="number" step="0.1" min="0" class="adjust-input"></div>
      <div class="adjust-label">単価(円/km)</div><div><input id="qeUnitPrice" type="number" step="1" min="0" class="adjust-input"></div>
      <div class="adjust-label">用途</div><div><input id="qePurpose" class="adjust-input"></div>
      <div class="adjust-label">金額</div><div><input id="qeAmount" type="number" step="1" min="0" class="adjust-input"></div>
      <div class="adjust-label">定期</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="qeTeiki" type="checkbox"><span>定期区間を除外</span></label></div>
      <div class="adjust-label full-row">メモ</div><div class="full-row"><input id="qeMemo" class="adjust-input"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button id="qeCancel" class="btn" type="button" style="height:34px;">キャンセル</button>
      <button id="qeSave" class="btn btn-primary" type="button" style="height:34px;">保存</button>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  const setVal = (id2, v) => { const el = document.getElementById(id2); if (el) el.value = v == null ? '' : String(v); };
  setVal('qeDate', rec?.date ? String(rec.date).slice(0, 10) : todayISO());
  setVal('qeType', rec?.type || rec?.category || 'train');
  setVal('qeOrigin', rec?.origin || '');
  setVal('qeVia', rec?.via || '');
  setVal('qeDestination', rec?.destination || '');
  setVal('qeTripType', rec?.trip_type || 'one_way');
  setVal('qeTripCount', rec?.trip_count != null ? rec.trip_count : 1);
  setVal('qeKm', rec?.distance_km != null ? rec.distance_km : '');
  setVal('qeUnitPrice', rec?.unit_price_per_km != null ? rec.unit_price_per_km : '');
  setVal('qePurpose', rec?.purpose || '');
  setVal('qeAmount', rec?.amount != null ? rec.amount : '');
  setVal('qeMemo', rec?.memo || '');
  try { const c = document.getElementById('qeTeiki'); if (c) c.checked = !!rec?.teiki_flag; } catch { }
  const close = () => { try { modal.remove(); } catch { } try { backdrop.remove(); } catch { } };
  return await new Promise((resolve) => {
    const cancelBtn = document.getElementById('qeCancel');
    const saveBtn = document.getElementById('qeSave');
    const onCancel = () => { close(); resolve(false); };
    const onSave = async () => {
      saveBtn.disabled = true;
      const payload = {
        date: document.getElementById('qeDate')?.value || '',
        type: document.getElementById('qeType')?.value || 'train',
        origin: document.getElementById('qeOrigin')?.value || '',
        via: document.getElementById('qeVia')?.value || '',
        destination: document.getElementById('qeDestination')?.value || '',
        trip_type: document.getElementById('qeTripType')?.value || 'one_way',
        trip_count: Number(document.getElementById('qeTripCount')?.value || 1) || 1,
        distance_km: (() => { const n = Number(document.getElementById('qeKm')?.value || ''); return Number.isFinite(n) ? n : null; })(),
        unit_price_per_km: (() => { const n = Number(document.getElementById('qeUnitPrice')?.value || ''); return Number.isFinite(n) ? n : null; })(),
        purpose: document.getElementById('qePurpose')?.value || '',
        amount: Number(document.getElementById('qeAmount')?.value || 0) || 0,
        teiki_flag: !!document.getElementById('qeTeiki')?.checked,
        memo: document.getElementById('qeMemo')?.value || ''
      };
      try {
        await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        close();
        resolve(true);
      } catch (e) {
        showErr(e?.message || '保存に失敗しました');
        saveBtn.disabled = false;
      }
    };
    cancelBtn?.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onCancel);
    saveBtn?.addEventListener('click', onSave);
  });
};
const renderList = async () => {
  if (renderListBusy) { renderListPending = true; return; }
  const host = $('#exListHost');
  if (!host) return;
  const now = Date.now();
  if (now < listRateLimitedUntilMs) {
    const waitSec = Math.max(1, Math.ceil((listRateLimitedUntilMs - now) / 1000));
    host.innerHTML = `<div style="color:#b45309;font-weight:700;">アクセスが集中しています。${waitSec}秒後に再試行してください。</div>`;
    return;
  }
  renderListBusy = true;
  host.innerHTML = '<div style="color:#475569;font-weight:650;">読み込み中…</div>';
  const boardHost = $('#exMonthlyBoardHost');

  const renderDashboardCards = (months) => {
    const list = Array.isArray(months) ? months : [];
    let all = 0, allAmt = 0;
    let pending = 0, pendingAmt = 0;
    let approved = 0, approvedAmt = 0;
    let paid = 0, paidAmt = 0;
    let rejected = 0, rejectedAmt = 0;

    for (const r of list) {
      const st = String(r.status || '').toLowerCase();
      if (st === 'draft') continue;
      const amt = Number(r.amount) || 0;
      
      // "すべて" (All) tab ignores "paid" (支給済み) items to keep the view clean
      if (st !== 'paid') {
        all++;
        allAmt += amt;
      }
      
      if (st === 'applied') { pending++; pendingAmt += amt; }
      else if (st === 'approved') { approved++; approvedAmt += amt; }
      else if (st === 'paid') { paid++; paidAmt += amt; }
      else if (st === 'rejected') { rejected++; rejectedAmt += amt; }
    }

    const fmtMoney = (v) => '¥' + Number(v).toLocaleString('ja-JP');
    const setCard = (idPfx, count, amount) => {
      const c = document.getElementById(`${idPfx}Count`);
      if (c) c.textContent = count;
      const a = document.getElementById(`${idPfx}Amount`);
      if (a) a.textContent = fmtMoney(amount);
    };

    setCard('sumAll', all, allAmt);
    setCard('sumPending', pending, pendingAmt);
    setCard('sumApproved', approved, approvedAmt);
    setCard('sumPaid', paid, paidAmt);
    setCard('sumRejected', rejected, rejectedAmt);

    document.querySelectorAll('.summary-card').forEach(card => {
      if (card.dataset.type === activeSummaryCard) {
        card.style.border = '2px solid var(--brand)';
        card.style.boxShadow = '0 4px 12px rgba(37,99,235,0.15)';
        card.style.background = '#f8fafc';
      } else {
        card.style.border = '1px solid var(--border)';
        card.style.boxShadow = 'none';
        card.style.background = '#fff';
      }
      card.style.cursor = 'pointer';
    });
  };

  const renderMonthlyBoard = (monthRows, rows) => {
    if (!boardHost) return;
    const list = Array.isArray(rows) ? rows : [];
    const monthList = Array.isArray(monthRows) ? monthRows : [];
    const g = new Map();
    for (const m of monthList) {
      const ym = String(m?.month || '');
      if (!/^\d{4}-\d{2}$/.test(ym)) continue;
      
      // Filter by global year if selected
      const globalYear = document.getElementById('exFilterYearGlobal')?.value;
      if (globalYear && !ym.startsWith(globalYear)) continue;

      const prev = g.get(ym) || { ym, count: 0, amount: 0, status: m.status || 'draft', updated: m.updated_at || m.created_at || '' };
      g.set(ym, prev);
    }
    for (const r of list) {
      const st = String(r.status || '').toLowerCase();
      if (activeHistoryTab === 'applied' && !isSubmittedStatus(st)) continue;
      const ym = String(r.date || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ym)) continue;
      
      // Filter by global year if selected
      const globalYear = document.getElementById('exFilterYearGlobal')?.value;
      if (globalYear && !ym.startsWith(globalYear)) continue;

      const prev = g.get(ym) || { ym, count: 0, amount: 0, status: st, updated: '' };
      prev.count += 1;
      prev.amount += Number(r.amount) || 0;

      if (!prev._claims) prev._claims = [];
      prev._claims.push(st);

      g.set(ym, prev);
    }

    for (const prev of g.values()) {
      if (prev._claims && prev._claims.length > 0) {
        if (prev._claims.includes('rejected')) prev.status = 'rejected';
        else if (prev._claims.includes('applied')) prev.status = 'applied';
        else if (prev._claims.includes('approved')) prev.status = 'approved';
        else if (prev._claims.includes('paid')) prev.status = 'paid';
      }
    }

    const allMonths = Array.from(g.values()).sort((a, b) => String(b.ym).localeCompare(String(a.ym)));
    
    const filteredMonths = activeSummaryCard === 'all' 
      ? allMonths.filter(m => m.status !== 'paid') 
      : allMonths.filter(m => {
          if (activeSummaryCard === 'pending') return m.status === 'applied';
          return m.status === activeSummaryCard;
        });

    if (activeSummaryCard === '') {
      boardHost.style.display = 'none';
      return allMonths;
    }

    if (filteredMonths.length === 0) {
      boardHost.style.display = 'block';
      const selectedGlobalYear = document.getElementById('exFilterYearGlobal')?.value;
      let msg = '該当する申請履歴がありません。';
      if (selectedGlobalYear) {
        msg = `${selectedGlobalYear}年の交通費申請履歴はありません。`;
      }
      boardHost.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748b; background: #fff; border-radius: 12px; border: 1px solid var(--border); font-weight: 700;">${msg}</div>`;
      return allMonths;
    }

    // Default to hide the table, only show if activeSummaryCard is 'all'
    if (activeSummaryCard !== 'all' && activeSummaryCard !== 'pending' && activeSummaryCard !== 'approved' && activeSummaryCard !== 'paid' && activeSummaryCard !== 'rejected') {
      boardHost.style.display = 'none';
      return allMonths;
    }

// Hiển thị bảng tháng chi phí theo tháng
    boardHost.style.display = 'block';
// hiển thị trạng thái chi phí
    const getStatusHtml = (st) => {
      // hiển thị trạng thái chi phí theo tháng
      const s = String(st).toLowerCase();
      
      if (s === 'applied') return '<span style="background: #fff7ed; color: #ea580c; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">申請中</span>';
      if (s === 'approved') return '<span style="background: #f0fdf4; color: #16a34a; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">承認済み</span>';
      if (s === 'paid') return '<span style="background: #faf5ff; color: #9333ea; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">支給済み</span>';
      if (s === 'rejected') return '<span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">差戻し</span>';
      return '<span style="background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">未申請</span>';
    };
// hiển thị số tiền chi phí theo tháng
    const fmtMoney = (v) => '¥' + Number(v).toLocaleString('ja-JP');
    // hiển thị ngày cuối cùng cập nhật theo tháng
    const fmtDate = (v) => v ? String(v).slice(0, 10).replace(/-/g, '/') : '-';
// hàm này hiển thị bảng tháng chi phí theo tháng
    const tableHtml = `
  
      <div style="background: #fff; border-radius: 12px; border: 1px solid var(--border); overflow: hidden; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid var(--border);">
          <div style="font-weight: 700; color: #475569; font-size: 14px;">月別一覧</div>
          <button type="button" class="btn" data-action="close-monthly-board" style="background: transparent; border: none; color: #64748b; padding: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span style="font-size: 13px; font-weight: 700; margin-left: 4px;">閉じる</span>
          </button>
        </div>
        <table class="adj-table" style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--border);">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 14px 12px; text-align: left; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px;">申請月</th>
              <th style="padding: 14px 12px; text-align: left; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px; display: none;">申請番号</th>
              <th style="padding: 14px 12px; text-align: right; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px;">合計金額</th>
              <th style="padding: 14px 12px; text-align: center; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px;">ステータス</th>
              <th style="padding: 14px 12px; text-align: left; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px; display: none;">最終更新日</th>
              <th style="padding: 14px 12px; text-align: center; color: #475569; font-weight: 800; border-bottom: 1px solid var(--border); font-size: 13px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMonths.map(m => `
              <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
                <td style="padding: 14px 12px; color: var(--brand); font-weight: 800; font-size: 14px;">${m.ym.replace('-', '年')}月</td>
                <td style="padding: 14px 12px; color: #475569; font-size: 13px; display: none;">TRF-${m.ym.replace('-', '')}-001</td>
                <td style="padding: 14px 12px; text-align: right; font-weight: 800; color: #0f172a; font-size: 14px;">${fmtMoney(m.amount)}</td>
                <td style="padding: 14px 12px; text-align: center;">${getStatusHtml(m.status)}</td>
                <td style="padding: 14px 12px; color: #475569; font-size: 13px; display: none;">${fmtDate(m.updated)}</td>
                <td style="padding: 14px 12px; text-align: center;">
                  <div style="display: flex; gap: 6px; justify-content: center;">
                    <button type="button" class="btn" data-action="open-month" data-month="${m.ym}" data-status="${m.status}" style="background: #fff; border: 1px solid var(--border); color: var(--brand); font-weight: 700; border-radius: 6px; padding: 0 12px; height: 32px; font-size: 12px;">詳細</button>
                    ${(m.status === 'applied' || m.status === 'approved' || m.status === 'rejected') ? `<button type="button" class="btn" data-action="add-more" data-month="${m.ym}" style="background: var(--brand); border: none; color: #fff; font-weight: 700; border-radius: 6px; padding: 0 12px; height: 32px; font-size: 12px;">追加</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    boardHost.innerHTML = tableHtml;

    if (boardHost.dataset.boundOpenMonth !== '1') {
      boardHost.dataset.boundOpenMonth = '1';
      boardHost.addEventListener('click', async (e) => {
        const closeBtn = e.target.closest('button[data-action="close-monthly-board"]');
        if (closeBtn) {
          boardHost.style.display = 'none';
          activeSummaryCard = '';
          document.querySelectorAll('.summary-card').forEach(card => {
            card.style.border = '1px solid var(--border)';
            card.style.boxShadow = 'none';
            card.style.background = '#fff';
          });
          return;
        }

        const addBtn = e.target.closest('button[data-action="add-more"]');
        if (addBtn) {
          const m = String(addBtn.getAttribute('data-month') || '');
          if (!/^\d{4}-\d{2}$/.test(m)) return;
          window.createTargetMonth = m;
          if (typeof window.startNewForMonth === 'function') {
            window.startNewForMonth(m, { showProgress: false });
          }
          return;
        }

        const b = e.target.closest('button[data-action="open-month"]');
        if (!b) return;
        const m = String(b.getAttribute('data-month') || '');
        if (!/^\d{4}-\d{2}$/.test(m)) return;

        // Nếu status là draft/pending (chưa nộp) thì mở form tạo mới
        const st = b.getAttribute('data-status') || '';
        if (st === 'draft' || st === 'pending') {
          window.createTargetMonth = m;
          if (typeof window.startNewForMonth === 'function') {
            window.startNewForMonth(m, { showProgress: false });
          }
          return;
        }

        selectedHistoryMonth = m;
        const mf = document.getElementById('exFilterMonth');
        if (mf) mf.value = selectedHistoryMonth;

        // Ẩn bảng danh sách các tháng
        if (boardHost) {
          boardHost.style.display = 'none';
        }

        const summaryCards = document.getElementById('exSummaryCards');
        if (summaryCards) summaryCards.style.display = 'none';

        const listHost = document.getElementById('exListHost');
        const listWrapper = document.getElementById('exListWrapper');
        if (listHost) listHost.style.display = 'block';
        if (listWrapper) listWrapper.style.display = 'block';
        await renderList();
      });
    }
    return allMonths;
  };

  const exAppMonth = document.getElementById('exAppMonth');
  const exAppMemo = document.getElementById('exAppMemo');
  const exAppItemsEmpty = document.getElementById('exAppItemsEmpty');
  const exAppItemsList = document.getElementById('exAppItemsList');
  const exAppTotalAmount = document.getElementById('exAppTotalAmount');
  const exAppAddItemBtn = document.getElementById('exAppAddItemBtn');
  const exAppCancelBtn = document.getElementById('exAppCancelBtn');
  const exAppToConfirmBtn = document.getElementById('exAppToConfirmBtn');
  const exAppBackToInputBtn = document.getElementById('exAppBackToInputBtn');
  const exAppConfirmBtn = document.getElementById('exAppConfirmBtn');

  const step1Input = document.getElementById('step1Input');
  const step2Confirm = document.getElementById('step2Confirm');
  const step3Complete = document.getElementById('step3Complete');

  const progStep1 = document.getElementById('progStep1');
  const progStep2 = document.getElementById('progStep2');
  const progStep3 = document.getElementById('progStep3');
  const progNum2 = document.getElementById('progNum2');
  const progNum3 = document.getElementById('progNum3');

  const confAppMonth = document.getElementById('confAppMonth');
  const confAppItemsList = document.getElementById('confAppItemsList');
  const confTotalAmount = document.getElementById('confTotalAmount');

  const compAppNumber = document.getElementById('compAppNumber');
  const compAppMonth = document.getElementById('compAppMonth');
  const compTotalAmount = document.getElementById('compTotalAmount');

  const exAppGoListBtn = document.getElementById('exAppGoListBtn');
  const exAppContinueBtn = document.getElementById('exAppContinueBtn');
  const exItemModal = document.getElementById('exItemModal');
  const exItemModalClose = document.getElementById('exItemModalClose');
  const exItemModalCancel = document.getElementById('exItemModalCancel');

  const setProgressState = (step) => {
    const progStep1 = document.getElementById('progStep1');
    const progStep2 = document.getElementById('progStep2');
    const progStep3 = document.getElementById('progStep3');
    const progNum2 = document.getElementById('progNum2');
    const progNum3 = document.getElementById('progNum3');
    if (progStep1) {
      progStep1.style.color = step >= 1 ? '#2563eb' : '#94a3b8';
      progStep1.querySelector('div').style.background = step >= 1 ? '#2563eb' : '#f1f5f9';
      progStep1.querySelector('div').style.color = step >= 1 ? '#fff' : '#94a3b8';
    }
    if (progStep2 && progNum2) {
      progStep2.style.color = step >= 2 ? '#2563eb' : '#94a3b8';
      progNum2.style.background = step >= 2 ? '#2563eb' : '#f1f5f9';
      progNum2.style.color = step >= 2 ? '#fff' : '#94a3b8';
    }
    if (progStep3 && progNum3) {
      progStep3.style.color = step >= 3 ? '#2563eb' : '#94a3b8';
      progNum3.style.background = step >= 3 ? '#2563eb' : '#f1f5f9';
      progNum3.style.color = step >= 3 ? '#fff' : '#94a3b8';
    }
  };

  window.renderAppItemsList = async () => {
    // Luôn lấy target month từ bộ nhớ tạm thay vì từ DOM vì form nhập không có thẻ exFilterMonth
    const ym = window.createTargetMonth || document.getElementById('exFilterMonth')?.value || currentYM();
    if (!ym) return;
    try {
      const q = `/api/expenses/my?month=${encodeURIComponent(ym)}&status=pending`;
      // Use timestamp query param to completely bust browser cache
      const cacheBuster = `&_t=${Date.now()}`;
      const rawRows = await fetchJSONAuthSafe(q + cacheBuster);
      const rows = Array.isArray(rawRows) ? rawRows.filter(r => {
        const st = String(r?.status || '').toLowerCase();
        return st === 'draft' || st === 'pending';
      }) : [];

      currentDraftsForConfirm = rows;
      let total = 0;

      const exAppItemsEmpty = document.getElementById('exAppItemsEmpty');
      const exAppToConfirmBtn = document.getElementById('exAppToConfirmBtn');
      const exAppTotalAmount = document.getElementById('exAppTotalAmount');

      if (rows.length === 0) {
        if (exAppItemsEmpty) exAppItemsEmpty.style.display = 'block';
        if (exAppItemsList) exAppItemsList.style.display = 'none';
        if (exAppToConfirmBtn) exAppToConfirmBtn.disabled = true;
      } else {
        if (exAppItemsEmpty) exAppItemsEmpty.style.display = 'none';
        if (exAppItemsList) {
          exAppItemsList.style.display = 'table-row-group';
          if (exAppToConfirmBtn) exAppToConfirmBtn.disabled = false;

          const typeMap = {
            train: '電車', bus: 'バス', taxi: 'タクシー', car: '自家用車', parking: '駐車場', highway: '高速道路'
          };

          const html = rows.map(r => {
            const a = Number(r.amount || 0);
            total += a;
            const d = String(r.date || '').slice(0, 10).replace(/-/g, '/');
            const route = [r.origin, r.destination].filter(Boolean).join(' → ') || '-';
            const purpose = r.purpose ? ` (${r.purpose})` : '';
            const typeLabel = typeMap[r.type || r.category] || '電車';
            const memo = r.memo || (r.teiki_flag ? '定期区間内' : '定期区間外');

            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 16px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff; width: 130px;">
                    <span>${d}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                </td>
                <td style="padding: 12px 16px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${route}${purpose}
                  </div>
                </td>
                <td style="padding: 12px 16px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff; width: 100px;">
                    <span>${typeLabel}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff; display: inline-block; width: 80px; text-align: right;">
                    ${a.toLocaleString('ja-JP')}
                  </div>
                </td>
                <td style="padding: 12px 16px;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #fff; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${memo}
                  </div>
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                  <button type="button" class="icon-btn" data-del-draft="${r.id}" style="width:32px;height:32px;border:none;background:transparent;display:inline-flex;align-items:center;justify-content:center;color:#ef4444;cursor:pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </td>
              </tr>
            `;
          }).join('');
          exAppItemsList.innerHTML = html;
        }
      }
      currentTotalForConfirm = total;
      if (exAppTotalAmount) exAppTotalAmount.textContent = `${total.toLocaleString('ja-JP')}`;
    } catch (e) {
      console.error(e);
    }
  };

  if (!window._expensesNewFlowBound) {
    window._expensesNewFlowBound = true;
    exAppItemsList?.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-del-draft]');
      if (!btn) return;
      const id = btn.getAttribute('data-del-draft');
      if (!id || !window.confirm('この明細を削除しますか？')) return;
      btn.disabled = true;
      try {
        await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await renderAppItemsList();
      } catch (err) {
        showErr(err?.message || '削除に失敗しました');
      }
    });

    exAppMonth?.addEventListener('change', renderAppItemsList);

    const closeItemModal = () => {
      if (exItemModal) exItemModal.style.display = 'none';
    };

    exAppAddItemBtn?.addEventListener('click', () => {
      const m = document.getElementById('exFilterMonth')?.value || window.createTargetMonth || currentYM();
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('exDate', m + '-01');
      setVal('exType', 'train');
      setVal('exOrigin', '');
      setVal('exVia', '');
      setVal('exDestination', '');
      setVal('exTripType', 'one_way');
      setVal('exTripCount', '1');
      setVal('exKm', '');
      setVal('exUnitPrice', '');
      setVal('exPurpose', '');
      const teikiEl = document.getElementById('exTeiki'); if (teikiEl) teikiEl.checked = false;
      setVal('exAmount', '');
      setVal('exMemo', '');
      if (exItemModal) exItemModal.style.display = 'flex';
    });

    exItemModalClose?.addEventListener('click', closeItemModal);
    exItemModalCancel?.addEventListener('click', closeItemModal);

    exAppCancelBtn?.addEventListener('click', async () => {
    // go back to applied list
    const m = document.getElementById('exFilterMonth');
    const s = document.getElementById('exFilterStatus');
    if (s) s.value = '';
    formActive = false;
    if (m) m.value = '';
    
    const navBtn = document.getElementById('expNavApplied') || document.getElementById('topNavApplied');
    if (navBtn) {
      navBtn.click();
    } else {
      window.location.reload();
    }
  });

    const renderConfirmList = () => {
      if (!confAppItemsList) return;
      if (currentDraftsForConfirm.length === 0) {
        confAppItemsList.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748b;">明細がありません</td></tr>';
        return;
      }
      const typeMap = {
        train: '電車', bus: 'バス', taxi: 'タクシー', car: '自家用車', parking: '駐車場', highway: '高速道路'
      };
      confAppItemsList.innerHTML = currentDraftsForConfirm.map(r => {
        const a = Number(r.amount || 0);
        const d = String(r.date || '').slice(0, 10).replace(/-/g, '/');
        const route = [r.origin, r.destination].filter(Boolean).join(' → ') || '-';
        const purpose = r.purpose ? ` (${r.purpose})` : '';
        const typeLabel = typeMap[r.type || r.category] || '電車';
        const memo = r.memo || (r.teiki_flag ? '定期区間内' : '定期区間外');

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px;">${d}</td>
          <td style="padding: 12px 16px;">${route}${purpose}</td>
          <td style="padding: 12px 16px;">${typeLabel}</td>
          <td style="padding: 12px 16px; text-align: right;">${a.toLocaleString('ja-JP')}</td>
          <td style="padding: 12px 16px;">${memo}</td>
        </tr>
      `;
      }).join('');
    };

    const exAppToConfirmBtn = document.getElementById('exAppToConfirmBtn');
    exAppToConfirmBtn?.addEventListener('click', () => {
      if (currentDraftsForConfirm.length === 0) {
        alert('申請する明細がありません。明細を追加してください。');
        return;
      }
      const ym = window.createTargetMonth || document.getElementById('exFilterMonth')?.value || currentYM();
      const confAppMonth = document.getElementById('confAppMonth');
      const confTotalAmount = document.getElementById('confTotalAmount');
      if (confAppMonth) confAppMonth.textContent = ym ? `${ym.slice(0, 4)}年${ym.slice(5, 7)}月` : '';
      if (confTotalAmount) confTotalAmount.textContent = currentTotalForConfirm.toLocaleString('ja-JP');

      renderConfirmList();

      const step1Input = document.getElementById('step1Input');
      const step2Confirm = document.getElementById('step2Confirm');
      const step3Complete = document.getElementById('step3Complete');

      if (step1Input) step1Input.style.display = 'none';
      if (step2Confirm) step2Confirm.style.display = 'block';
      if (step3Complete) step3Complete.style.display = 'none';
      setProgressState(2);
    });

    const exAppBackToInputBtn = document.getElementById('exAppBackToInputBtn');
    exAppBackToInputBtn?.addEventListener('click', () => {
      const step1Input = document.getElementById('step1Input');
      const step2Confirm = document.getElementById('step2Confirm');
      const step3Complete = document.getElementById('step3Complete');
      if (step1Input) step1Input.style.display = 'block';
      if (step2Confirm) step2Confirm.style.display = 'none';
      if (step3Complete) step3Complete.style.display = 'none';
      setProgressState(1);
    });

    // Handle global files selection
    const globalFilesInput = document.getElementById('exAppGlobalFiles');
    const confFilesList = document.getElementById('confFilesList');
    let selectedGlobalFiles = [];

    globalFilesInput?.addEventListener('change', () => {
      const files = Array.from(globalFilesInput.files || []);
      selectedGlobalFiles = [...selectedGlobalFiles, ...files];

      if (selectedGlobalFiles.length === 0) {
        if (confFilesList) confFilesList.innerHTML = '添付ファイルはありません';
        return;
      }

      if (confFilesList) {
        confFilesList.innerHTML = selectedGlobalFiles.map((f, i) => {
          const size = (f.size / 1024 / 1024).toFixed(1);
          return `
          <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;padding:6px 12px;border-radius:4px;border:1px solid #e2e8f0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span style="color:#0f172a;">${f.name}</span>
            <span style="color:#64748b;font-size:12px;">(${size}MB)</span>
            <button type="button" data-rm-file="${i}" style="background:transparent;border:none;color:#ef4444;cursor:pointer;padding:0;display:flex;align-items:center;margin-left:4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `;
        }).join('');
      }

      // Reset input so same file can be selected again if needed
      globalFilesInput.value = '';
    });

    confFilesList?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-rm-file]');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-rm-file'), 10);
      if (!isNaN(idx)) {
        selectedGlobalFiles.splice(idx, 1);
        if (selectedGlobalFiles.length === 0) {
          confFilesList.innerHTML = '添付ファイルはありません';
        } else {
          // re-render by triggering a fake change event
          const evt = new Event('change');
          globalFilesInput.dispatchEvent(evt);
        }
      }
    });

    const exAppConfirmBtn = document.getElementById('exAppConfirmBtn');
    exAppConfirmBtn?.addEventListener('click', async () => {
      // Apply all drafts for this month
      const ym = document.getElementById('exFilterMonth')?.value || window.createTargetMonth || currentYM();
      if (!ym) return;

      // Check if there are any drafts
      try {
        const ym = window.createTargetMonth || document.getElementById('exFilterMonth')?.value || currentYM();
        const q = `/api/expenses/my?month=${encodeURIComponent(ym)}&status=pending`;
        const cacheBuster = `&_t=${Date.now()}`;
        const rawRows = await fetchJSONAuthSafe(q + cacheBuster);
        const rows = Array.isArray(rawRows) ? rawRows.filter(r => {
          const st = String(r?.status || '').toLowerCase();
          return st === 'draft' || st === 'pending';
        }) : [];
        if (rows.length === 0) {
          showErr('申請する明細がありません。');
          return;
        }

        exAppConfirmBtn.disabled = true;
        exAppConfirmBtn.textContent = '申請中...';

        // Use bulk apply endpoint
        await fetchJSONAuth('/api/expenses/months/apply', {
          method: 'POST',
          body: JSON.stringify({ month: ym })
        });

        // Success! Move to Step 3.
        const step1Input = document.getElementById('step1Input');
        const step2Confirm = document.getElementById('step2Confirm');
        const step3Complete = document.getElementById('step3Complete');

        if (step1Input) step1Input.style.display = 'none';
        if (step2Confirm) step2Confirm.style.display = 'none';
        if (step3Complete) step3Complete.style.display = 'block';
        setProgressState(3);

        // Populate step 3 info
        const compAppNumber = document.getElementById('compAppNumber');
        const compAppMonth = document.getElementById('compAppMonth');
        const compTotalAmount = document.getElementById('compTotalAmount');
        if (compAppNumber) compAppNumber.textContent = `TRF-${ym.replace('-', '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        if (compAppMonth) compAppMonth.textContent = `${ym.slice(0, 4)}年${ym.slice(5, 7)}月`;
        if (compTotalAmount) compTotalAmount.textContent = currentTotalForConfirm.toLocaleString('ja-JP');

      } catch (e) {
        showErr(e?.message || '申請に失敗しました');
      } finally {
        exAppConfirmBtn.disabled = false;
        exAppConfirmBtn.textContent = '申請する';
      }
    });

    const exAppGoListBtn = document.getElementById('exAppGoListBtn');
    exAppGoListBtn?.addEventListener('click', async () => {
    const ym = document.getElementById('exFilterMonth')?.value || window.createTargetMonth || currentYM();
    const m = document.getElementById('exFilterMonth');
    const s = document.getElementById('exFilterStatus');
    if (s) s.value = '';
    formActive = false;
    if (m && ym) m.value = ym;
    
    // Instead of calling showTab which is local to bootExpensesPage, simulate a click on the navigation tab
    const navBtn = document.getElementById('expNavApplied') || document.getElementById('topNavApplied');
    if (navBtn) {
      navBtn.click();
    } else {
      window.location.reload();
    }
  });

    const exAppContinueBtn = document.getElementById('exAppContinueBtn');
    exAppContinueBtn?.addEventListener('click', () => {
      document.getElementById('exHistoryNewBtn')?.click();
    });
  }

  try {
    const statusRaw = document.getElementById('exFilterStatus')?.value || '';
    const status = activeHistoryTab === 'applied' ? '' : statusRaw;
    const sf = document.getElementById('exFilterStatus');
    if (activeHistoryTab === 'applied' && sf) sf.value = '';
    if (activeHistoryTab === 'applied' || activeHistoryTab === 'notice') {
      let months = [];
      let monthlyRows = [];
      try {
        const r = await fetchJSONAuthSafe('/api/expenses/months/my');
        months = Array.isArray(r) ? r : [];
      } catch (e) {
        // Backward compatibility: if backend route is not deployed yet, keep old flow.
        if (!isNotFoundErr(e)) throw e;
      }
      try {
        const active = await fetchJSONAuthSafe('/api/expenses/months/active');
        const ym = String(active?.month || '');
        if (/^\d{4}-\d{2}$/.test(ym) && !months.some((m) => String(m?.month || '') === ym)) {
          months.push({ month: ym, is_active: 1, status: String(active?.status || 'draft') });
        }
      } catch { }
      monthMetaByYm = new Map();
      for (const m of (Array.isArray(months) ? months : [])) {
        const ym = String(m?.month || '');
        if (/^\d{4}-\d{2}$/.test(ym)) monthMetaByYm.set(ym, m);
      }
      monthlyRows = await fetchJSONAuthSafeCached('/api/expenses/my', 8000);
      const generatedMonths = renderMonthlyBoard(months, monthlyRows);
      renderDashboardCards(generatedMonths || []);
    } else {
      monthMetaByYm = new Map();
      renderMonthlyBoard([], []);
      renderDashboardCards([]);
    }

    const month = selectedHistoryMonth || document.getElementById('exFilterMonth')?.value || currentYM();
    const monthJa = fmtYmJa(month);
    
    window.goBackToAppliedList = async () => {
      showMonthProgressInNewMode = false;
      formActive = false;
      selectedHistoryMonth = '';
      activeSummaryCard = ''; // Đổi thành chuỗi rỗng để không hiển thị bảng theo mặc định
      const m = document.getElementById('exFilterMonth');
      if (m) m.value = '';
      const s = document.getElementById('exFilterStatus');
      if (s) s.value = '';
      
      // Bỏ chọn tất cả các thẻ thống kê khi quay lại tab
      document.querySelectorAll('.summary-card').forEach(card => {
        card.style.border = '1px solid var(--border)';
        card.style.boxShadow = 'none';
        card.style.background = '#fff';
      });

      try {
        await showTab('applied');
        await renderList();
      } catch (e) {
        window.location.reload();
      }
    };

    if (activeHistoryTab === 'applied' && !selectedHistoryMonth) {
      host.innerHTML = '';
      return;
    }

    const mf = document.getElementById('exFilterMonth');
    if (mf && month && activeHistoryTab !== 'notice') mf.value = month;
    let monthProfile = null;
    if ((activeHistoryTab === 'applied' || showMonthProgressInNewMode) && /^\d{4}-\d{2}$/.test(String(month || ''))) {
      try {
        monthProfile = await fetchJSONAuthSafe(`/api/expenses/months/profile?month=${encodeURIComponent(String(month))}`);
      } catch (e) {
        if (!isNotFoundErr(e)) throw e;
      }
    }
    const monthMeta = monthMetaByYm.get(String(month || '')) || null;
    const creatorName = String(
      monthProfile?.employee_name ||
      meProfile?.full_name ||
      meProfile?.name ||
      meProfile?.username ||
      meProfile?.email ||
      '-'
    );
    const employeeCode = String(
      monthProfile?.employee_code ||
      meProfile?.employee_code ||
      meProfile?.emp_code ||
      meProfile?.code ||
      '-'
    );
    const birthDate = fmtDateOnly(
      monthProfile?.birth_date ||
      meProfile?.birth_date ||
      meProfile?.birthday ||
      meProfile?.date_of_birth ||
      meProfile?.dob ||
      '-'
    );
    const createdDate = fmtDateOnly(
      monthProfile?.start_date ||
      monthMeta?.created_at ||
      firstDayOfYm(month)
    );
    const shouldShowProfile = (activeHistoryTab === 'applied' || showMonthProgressInNewMode);
    const profileTableInner = shouldShowProfile
      ? `<div style="display:flex;flex-wrap:wrap;gap:8px 12px;font-size:12px;line-height:1.2;">
           <span style="display:inline-flex;gap:4px;align-items:center;"><span style="color:#64748b;">作成者:</span><strong style="color:#0f172a;">${creatorName}</strong></span>
           <span style="display:inline-flex;gap:4px;align-items:center;"><span style="color:#64748b;">社員コード:</span><strong style="color:#0f172a;">${employeeCode}</strong></span>
           <span style="display:inline-flex;gap:4px;align-items:center;"><span style="color:#64748b;">生年月日:</span><strong style="color:#0f172a;">${birthDate}</strong></span>
           <span style="display:inline-flex;gap:4px;align-items:center;"><span style="color:#64748b;">作成日:</span><strong style="color:#0f172a;">${createdDate}</strong></span>
         </div>`
      : '';
    const profileBlock = shouldShowProfile
      ? `<div class="history-profile-bar"><div class="history-profile-title" style="margin-bottom:2px;">情報</div>${profileTableInner}</div>`
      : '';
    try {
      const profileHost = document.getElementById('exMonthlyProfileHost');
      if (profileHost) profileHost.innerHTML = profileBlock || '';
    } catch { }
    let rows = [];
    if (activeHistoryTab === 'notice') {
      const allRows = await fetchJSONAuthSafeCached('/api/expenses/my', 8000);
      rows = (Array.isArray(allRows) ? allRows : []).filter((r) => isNoticeFeedbackStatus(r?.status));
      if (/^\d{4}-\d{2}$/.test(String(selectedHistoryMonth || ''))) {
        rows = rows.filter((r) => String(r?.date || '').slice(0, 7) === String(selectedHistoryMonth));
      }
    } else {
      // Khi xem chi tiết (selectedHistoryMonth có giá trị), gọi API lấy dữ liệu của THÁNG ĐÓ
      // Khi chưa xem chi tiết, lấy theo bộ lọc NĂM (exFilterYearGlobal) để tính tổng các tháng
      let queryMonth = '';
      if (selectedHistoryMonth) {
        queryMonth = selectedHistoryMonth; // Xem chi tiết: Lọc đúng tháng đó
      } else {
        const globalYear = document.getElementById('exFilterYearGlobal')?.value;
        if (globalYear) {
          queryMonth = globalYear; // Xem danh sách: Lọc theo năm
        } else {
          queryMonth = currentYM().slice(0,4); // Default năm nay
        }
      }
      
      const q = `/api/expenses/my?month=${encodeURIComponent(queryMonth)}&status=${encodeURIComponent(status)}`;
      const cacheBuster = `&_t=${Date.now()}`;
      const rawRows = await fetchJSONAuthSafe(q + cacheBuster);
      rows = activeHistoryTab === 'applied'
        ? (Array.isArray(rawRows) ? rawRows.filter((r) => isSubmittedStatus(r?.status)) : [])
        : (Array.isArray(rawRows) ? rawRows : []);
        
      // Lọc lại một lần nữa ở client side để đảm bảo chỉ có dữ liệu của tháng được chọn
      if (selectedHistoryMonth) {
         rows = rows.filter((r) => String(r?.date || '').slice(0, 7) === String(selectedHistoryMonth));
      }
      
      if (activeHistoryTab === 'new' && showMonthProgressInNewMode) {
        rows = rows.filter((r) => isSubmittedStatus(r?.status));
      }
    }
    try { await renderSummary(); } catch { }
    if (!Array.isArray(rows) || rows.length === 0) {
      const emptyText = activeHistoryTab === 'notice'
        ? '通知・確認事項はありません'
        : (monthJa ? `${monthJa}の交通費提出履歴はありません` : '当月の交通費提出履歴はありません');
      host.innerHTML = `<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>${emptyText}</div></div>`;
      return;
    }
    const isCompactSplit = showMonthProgressInNewMode && (activeHistoryTab === 'new' || activeHistoryTab === 'applied');
    const colSpan = isCompactSplit ? 6 : 7;
    const detailHeadRow = isCompactSplit
      ? '<tr><th>日</th><th>種別</th><th>経路</th><th>用途</th><th>金額</th><th>ステータス</th><th>領収書</th><th>操作</th></tr>'
      : '<tr><th>日付</th><th>種別</th><th>経路</th><th>用途</th><th>金額</th><th>ステータス</th><th>メモ</th><th>領収書</th><th>操作</th></tr>';
    if (!Array.isArray(rows) || rows.length === 0) {
      const emptyText = activeHistoryTab === 'notice'
        ? '通知・確認事項はありません'
        : (monthJa ? `${monthJa}の交通費提出履歴はありません` : '当月の交通費提出履歴はありません');
      host.innerHTML = `
        <div class="adj-table-card">
          <table class="adj-table">
            <tbody>
              ${detailHeadRow}
              <tr><td colspan="${colSpan}" style="text-align:center;color:#334155;padding:18px 10px;">${emptyText}</td></tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }
    const totalAmount = rows.reduce((sum, r) => sum + Number(r?.amount || 0), 0);
    let noticeSummary = '';
    if (activeHistoryTab === 'notice') {
      const monthly = new Map();
      for (const r of rows) {
        const ym = String(r?.date || '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(ym)) continue;
        const prev = monthly.get(ym) || { ym, count: 0, amount: 0 };
        prev.count += 1;
        prev.amount += Number(r?.amount || 0);
        monthly.set(ym, prev);
      }
      const role = String(meProfile?.role || '').toLowerCase();
      const canCloseMonth = (role === 'manager' || role === 'admin');
      const uid = String(meProfile?.id || window.MY_ID || '').trim();
      const chips = Array.from(monthly.values())
        .sort((a, b) => String(b.ym).localeCompare(String(a.ym)))
        .map((m) => {
          const closeBtn = canCloseMonth
            ? `<button class="btn" type="button" data-action="close-month" data-month="${m.ym}" data-user-id="${uid}" style="height:24px;padding:0 8px;font-size:11px;">月次確認</button>`
            : '';
          return `<div class="notice-month-summary-item"><strong>${m.ym}</strong><span>${m.count}件</span><span>¥${Number(m.amount || 0).toLocaleString('ja-JP')}</span>${closeBtn}</div>`;
        }).join('');
      noticeSummary = chips ? `<div class="notice-month-summary">${chips}</div>` : '';
    }
    const tr = rows.map(r => {
      const dFull = String(r.date || '').slice(0, 10);
      const d = (() => {
        if (!isCompactSplit) return dFull;
        const m = dFull.match(/^\d{4}-\d{2}-(\d{2})$/);
        return m ? m[1] : dFull;
      })();
      const a = '¥' + Number(r.amount || 0).toLocaleString('ja-JP');
      const origin = String(r.origin || '').trim();
      const destination = String(r.destination || '').trim();
      const via = normalizeVia(r.via);
      const shortStation = (v) => String(v || '').trim().replace(/駅$/u, '');
      const routeDisplay = [shortStation(origin), shortStation(destination)].filter(Boolean).join('→') || '-';
      const routeMain = [origin, destination].filter(Boolean).join('→') || '-';
      const routeFull = via ? `${routeMain}（経由: ${via}）` : routeMain;
      const st = String(r.status || 'pending');
      const stClass = (st === 'applied' || st === 'approved' || st === 'paid' || st === 'rejected' || st === 'draft') ? st : 'draft';
      const stLabelMap = {
        draft: '未申請',
        pending: '未申請',
        applied: '申請中',
        approved: '承認済み',
        paid: '支給済み',
        rejected: '差戻し'
      };
      const stLabel = stLabelMap[st] || st;
      const applied = fmtDT(r.applied_at || r.updated_at || r.created_at);
      const approved = fmtDT(r.approved_at);
      const approver = r.approver_name ? String(r.approver_name) : '';
      const timeHtml =
        st === 'applied' ? (applied ? `<div style="color:#6b7280;font-size:12px;">申請: ${applied}</div>` : '') :
          st === 'approved' ? (approved ? `<div style="color:#6b7280;font-size:12px;">承認: ${approved}</div>` : '') :
            st === 'rejected' ? (approved ? `<div style="color:#6b7280;font-size:12px;">却下: ${approved}</div>` : '') : '';
      const whoHtml = (st === 'approved' || st === 'rejected') && approver ? `<div style="color:#6b7280;font-size:12px;">担当: ${approver}</div>` : '';
      const noteHtml = st === 'rejected' && r.manager_note ? `<div style="color:#ef4444;font-size:12px;">理由: ${r.manager_note}</div>` : '';
      const isNoticeOnly = activeHistoryTab === 'notice';
      const replyBtn = (!isNoticeOnly && st === 'rejected') ? `<button class="btn" data-action="reply" style="height:28px;margin-right:6px;">取り戻し理由</button>` : '';
      const editBtn = (!isNoticeOnly && st !== 'paid') ? `<button class="btn" data-action="edit" style="height:28px;margin-right:6px;">編集</button>` : '';
      const delBtn = (!isNoticeOnly && st !== 'paid') ? `<button class="icon-btn" data-action="delete" aria-label="削除"><img src="/static/images/xoa.png" alt=""></button>` : '';
      const ru = r.receipt_url ? String(r.receipt_url) : (r.first_file_path ? String(r.first_file_path) : '');
      const ruAttr = ru ? ` data-url="${ru}"` : '';
      const count = Number(r.file_count || 0);
      const ruInline = ru ? `<a href="${ru.startsWith('/') ? ru : '/' + ru}" class="receipt-link" data-count="${String(count)}" target="_blank" rel="noopener" style="font-size:12px;color:#1e40af;text-decoration:none;">表示${count > 1 ? `(${count}件)` : ''}</a>` : (count > 0 ? `<button class="btn" data-action="files" type="button" style="height:24px;">表示(${count}件)</button>` : '<span style="color:#64748b;font-size:12px;">なし</span>');
      const typeMap = {
        train: '電車',
        bus: 'バス',
        taxi: 'タクシー',
        car: '社用車',
        private_car: '自家用車',
        parking: '駐車場',
        highway: '高速道路',
        hotel: '宿泊',
        other: 'その他'
      };
      const typeDisplay = typeMap[String(r.category || r.type || '')] || (r.category || r.type || '-');
      
      const purposeDisplay = String(r.purpose || '').trim() || '-';
      
      const tripType = String(r.trip_type || '');
      const tripTypeDisplay = tripType === 'round_trip' ? '往復' : (tripType === 'one_way' ? '片道' : '');
      const tripBadge = tripTypeDisplay ? `<span style="font-size:10px; background:#e2e8f0; padding:2px 4px; border-radius:4px; margin-left:4px;">${tripTypeDisplay}</span>` : '';
      
      if (isCompactSplit) {
        const routeCell = routeDisplay + tripBadge;
        const statusCell = `<span class="status-pill status-${stClass}">${stLabel}</span>`;
        const receiptCell = ru
          ? (count > 1
            ? `<button class="btn" data-action="files" data-url="${ru}" type="button" style="height:22px;font-size:11px;padding:0 8px;">表示(${count})</button>`
            : `<a href="${ru.startsWith('/') ? ru : '/' + ru}" class="receipt-link" data-count="${String(count)}" target="_blank" rel="noopener" style="font-size:11px;color:#1e40af;text-decoration:none;">表示</a>`)
          : (count > 0 ? `<button class="btn" data-action="files" type="button" style="height:22px;font-size:11px;padding:0 8px;">表示(${count})</button>` : '<span style="color:#64748b;font-size:11px;">-</span>');
        return `<tr data-id="${String(r.id || '')}"><td>${d}</td><td>${typeDisplay}</td><td title="${routeFull.replace(/"/g, '&quot;')}"><span class="history-route-chip">${routeCell}</span></td><td>${purposeDisplay}</td><td>${a}</td><td>${statusCell}</td><td>${receiptCell}</td><td><div class="row-actions">${editBtn}</div></td></tr>`;
      }
      return `<tr data-id="${String(r.id || '')}"><td>${d}</td><td>${typeDisplay}</td><td title="${routeFull.replace(/"/g, '&quot;')}"><span class="history-route-chip">${routeDisplay}${tripBadge}</span></td><td>${purposeDisplay}</td><td>${a}</td><td><span class="status-pill status-${stClass}">${stLabel}</span>${timeHtml}${whoHtml}</td><td>${r.memo || ''}${noteHtml}</td><td><button class="icon-btn" data-action="files"${ruAttr} aria-label="領収書"><span aria-hidden="true">📎</span></button>${ruInline}</td><td><div class="row-actions">${replyBtn}${editBtn}${delBtn}</div></td></tr>`;
    }).join('');
    const totalRow = `<tr class="total-row"><td colspan="${colSpan}" style="font-weight:800;text-align:left;">合計: ${Number(totalAmount || 0).toLocaleString('ja-JP')}</td></tr>`;
    window.goBackToMonthlyList = async () => {
      selectedHistoryMonth = '';
      const listHost = document.getElementById('exListHost');
      const listWrapper = document.getElementById('exListWrapper');
      if (listHost) listHost.style.display = 'none';
      if (listWrapper) listWrapper.style.display = 'none';
      
      const boardHost = document.getElementById('exMonthlyBoardHost');
      if (boardHost && activeSummaryCard !== '') {
        boardHost.style.display = 'block';
      }
      
      const summaryCards = document.getElementById('exSummaryCards');
      if (summaryCards) summaryCards.style.display = 'grid';
    };

    // Attach event listener directly to host to handle back button click
    if (!host.dataset.boundBackBtn) {
      host.dataset.boundBackBtn = '1';
      host.addEventListener('click', (e) => {
        const backBtn = e.target.closest('button[data-action="go-back-monthly"]');
        if (backBtn && typeof window.goBackToMonthlyList === 'function') {
          window.goBackToMonthlyList();
        }
      });
    }

    if (selectedHistoryMonth) {
      // Ẩn bảng monthly board nếu đang ở mode xem chi tiết
      if (boardHost) boardHost.style.display = 'none';

      const isCompactSplit = showMonthProgressInNewMode && (activeHistoryTab === 'new' || activeHistoryTab === 'applied');
      const colSpan = isCompactSplit ? 6 : 7;
      
      host.innerHTML = `
        <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
          <button type="button" class="btn" data-action="go-back-monthly" style="background: transparent; border: 1px solid var(--border); color: #475569; padding: 6px 16px; height: 32px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            戻る
          </button>
          <div style="font-weight: 800; color: #0f172a; font-size: 16px;">${monthJa}の詳細</div>
        </div>
        ${noticeSummary}
        <div class="adj-table-card">
          <table class="adj-table">
            <tbody>${detailHeadRow}${tr}${totalRow}</tbody>
          </table>
        </div>
      `;
    } else {
      host.innerHTML = `
        ${noticeSummary}
        <div class="adj-table-card">
          <table class="adj-table">
            <tbody>${detailHeadRow}${tr}${totalRow}</tbody>
          </table>
        </div>
      `;
    }
    if (activeHistoryTab === 'notice') {
      host.querySelectorAll('button[data-action="close-month"]').forEach((btn) => {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', async () => {
          const m = String(btn.getAttribute('data-month') || '');
          const uid = String(btn.getAttribute('data-user-id') || '').trim();
          if (!/^\d{4}-\d{2}$/.test(m)) return;
          const ok = window.confirm(`${m} の月次を manager として確認しますか？`);
          if (!ok) return;
          btn.disabled = true;
          try {
            await fetchJSONAuth('/api/expenses/admin/monthly-close', {
              method: 'POST',
              body: JSON.stringify({ month: m, userId: uid || null })
            });
            await renderList();
          } catch (eClose) {
            showErr(eClose?.message || '月次確認に失敗しました');
          } finally {
            btn.disabled = false;
          }
        });
      });
    }
    const tbody = host.querySelector('tbody');
    if (tbody && !tbody.dataset.bindDel) {
      tbody.dataset.bindDel = '1';
      tbody.addEventListener('click', async (e) => {
        const link = e.target.closest('a.receipt-link');
        const tr = e.target.closest('tr[data-id]');
        if (link && tr) {
          const c = parseInt(String(link.getAttribute('data-count') || '0'), 10);
          if (c > 1) {
            e.preventDefault();
            const filesBtn = tr.querySelector('button[data-action="files"]');
            filesBtn?.click();
            return;
          }
        }
        // 
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const tr2 = btn.closest('tr[data-id]');
        const id = tr2 ? tr2.getAttribute('data-id') : '';
        if (!id) return;
        const action = btn.getAttribute('data-action');
        btn.disabled = true;
        try {
          if (action === 'edit') {
            const changed = await openQuickEditExpense(id);
            if (changed) await renderList();
          } else if (action === 'delete') {
            const ok = window.confirm('削除しますか？');
            if (!ok) { btn.disabled = false; return; }
            try {
              await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
            } catch (errDel) {
              showErr(errDel?.message || '削除に失敗しました'); btn.disabled = false; return;
            }
            await renderList();
          } else if (action === 'files') {
            let rows = [];
            try { rows = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/files`); } catch (errGet) {
              const warn = document.createElement('tr'); warn.className = 'files-row';
              warn.innerHTML = `<td colspan="${colSpan}"><div style="color:#b00020;">領収書の読み込みに失敗しました：${String(errGet?.message || 'unknown')}</div></td>`;
              tr2.after(warn);
              btn.disabled = false; return;
            }
            const next = tr2.nextElementSibling;
            if (next && next.classList.contains('files-row')) {
              next.remove();
              btn.disabled = false;
              return;
            }
            if (Array.isArray(rows) && rows.length === 1) {
              const f = rows[0];
              const url = String(f.path || f.url || f.file_path || '').startsWith('/') ? String(f.path || f.url || f.file_path) : '/' + String(f.path || f.url || f.file_path || '');
              try { window.open(url, '_blank'); } catch { window.location.href = url; }
            }
            if ((!rows || rows.length === 0) && btn.hasAttribute('data-url')) {
              const url = btn.getAttribute('data-url') || '';
              if (url) { try { window.open(url.startsWith('/') ? url : '/' + url, '_blank'); } catch { window.location.href = (url.startsWith('/') ? url : '/' + url); } }
            }
            const filesHtml = Array.isArray(rows) && rows.length
              ? rows.map((f, idx) => {
                const isImg = String(f.mime || '').startsWith('image/');
                const url = String(f.path || f.url || f.file_path || '').startsWith('/') ? String(f.path || f.url || f.file_path) : '/' + String(f.path || f.url || f.file_path || '');
                const thumb = isImg
                  ? `<img src="${url}" alt="${f.name || ''}" style="width:40px;height:28px;object-fit:cover;border:1px solid #e5e7eb;border-radius:6px;" />`
                  : `<span style="font-weight:700;color:#1e40af;font-size:11px;">PDF</span>`;
                const ext = (String(url).match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [, 'file'])[1];
                const name = `ファイル ${idx + 1}.${ext}`;
                const deco = isImg ? 'none' : 'underline';
                return `<li data-file-id="${String(f.id)}" style="display:flex;align-items:center;gap:6px;min-width:0;">
                    <a href="${url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:6px;text-decoration:${deco};min-width:0;max-width:260px;">
                      ${thumb}
                      <span style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
                    </a>
                    <button class="icon-btn" data-action="file-delete" aria-label="ファイル削除" style="width:24px;height:24px;"><img src="/static/images/xoa.png" alt="" style="width:14px;height:14px;"></button>
                  </li>`;
              }).join('')
              : '<li style="font-size:11px;color:#64748b;">ファイルなし</li>';
            const expand = document.createElement('tr');
            expand.className = 'files-row';
            expand.innerHTML = `<td colspan="${colSpan}"><ul style="list-style:none;padding:0;margin:4px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">${filesHtml}</ul></td>`;
            tr2.after(expand);
            const ul = expand.querySelector('ul');
            ul?.addEventListener('click', async (ev) => {
              const b2 = ev.target.closest('button[data-action="file-delete"]');
              if (!b2) return;
              const li = b2.closest('li[data-file-id]');
              const fid = li ? li.getAttribute('data-file-id') : '';
              if (!fid) return;
              b2.disabled = true;
              try {
                const ok2 = window.confirm('ファイルを削除しますか？');
                if (!ok2) { b2.disabled = false; return; }
                try {
                  await fetchJSONAuth(`/api/expenses/files/${encodeURIComponent(fid)}`, { method: 'DELETE' });
                } catch (errFd) {
                  showErr(errFd?.message || 'ファイル削除に失敗しました'); b2.disabled = false; return;
                }
                let newRows = [];
                try { newRows = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/files`); } catch { }
                const newHtml = Array.isArray(newRows) && newRows.length
                  ? newRows.map((f, idx) => {
                    const url = String(f.path || f.url || f.file_path || '').startsWith('/') ? String(f.path || f.url || f.file_path) : '/' + String(f.path || f.url || f.file_path || '');
                    const ext = (String(url).match(/\.([a-zA-Z0-9]+)(?:\?|$)/) || [, 'file'])[1];
                    const name = `ファイル ${idx + 1}.${ext}`;
                    const isPdf = /\.pdf($|\?)/i.test(url) || /\.pdf$/i.test(String(name || ''));
                    const deco = isPdf ? 'underline' : 'none';
                    return `<li data-file-id="${String(f.id)}"><a href="${url}" target="_blank" rel="noopener" style="text-decoration:${deco};">${name}</a> <button class="icon-btn" data-action="file-delete" aria-label="ファイル削除"><img src="/static/images/xoa.png" alt=""></button></li>`;
                  }).join('')
                  : '<li>ファイルなし</li>';
                ul.innerHTML = newHtml;
              } catch { }
              b2.disabled = false;
            });
          } else if (action === 'reply') {
            const next = tr.nextElementSibling;
            if (next && next.classList.contains('chat-row')) {
              next.remove();
              btn.disabled = false;
              return;
            }
            const chat = document.createElement('tr');
            chat.className = 'chat-row';
            chat.innerHTML = `<td colspan="${colSpan}">
              <div class="chat-box" style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff;">
                <div class="chat-header" style="font-weight:700;color:#1f2937;margin-bottom:8px;">やり取り</div>
                <div class="chat-reason" style="margin-bottom:8px;color:#7f1d1d;font-weight:700;"></div>
                <div class="chat-messages" style="max-height:220px;overflow:auto;padding:6px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;"></div>
                <div class="chat-input" style="display:flex;gap:8px;margin-top:8px;">
                  <input type="text" class="chat-text" placeholder="メッセージを入力…" style="flex:1;height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;">
                  <button class="btn chat-send" type="button" style="height:36px;">送信</button>
                </div>
                <div class="chat-actions" style="display:flex;gap:8px;margin-top:8px;">
                  <button class="btn chat-edit" type="button" style="height:32px;">編集</button>
                  <button class="btn chat-new" type="button" style="height:32px;">新規作成</button>
                </div>
              </div>
            </td>`;
            tr.after(chat);
            const box = chat.querySelector('.chat-messages');
            const text = chat.querySelector('.chat-text');
            const send = chat.querySelector('.chat-send');
            const reasonEl = chat.querySelector('.chat-reason');
            try {
              const rec = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`);
              const reason = rec && rec.manager_note ? String(rec.manager_note) : '';
              if (reasonEl) reasonEl.textContent = reason ? ('差戻し理由: ' + reason) : '';
            } catch { }
            const load = async () => {
              try {
                const rows = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/messages`);
                box.innerHTML = Array.isArray(rows) && rows.length
                  ? rows.map(m => {
                    const me = String(m.sender_user_id) === String(window.MY_ID || '');
                    const who = m.sender_name || '';
                    const when = fmtDT(m.created_at);
                    return `<div style="display:flex;margin:6px 0;${me ? 'justify-content:flex-end' : ''}">
                        <div style="max-width:70%;padding:8px 10px;border-radius:12px;${me ? 'background:#dbeafe;color:#1e3a8a;' : 'background:#e2e8f0;color:#111827;'}">
                          <div style="font-size:12px;color:#334155;font-weight:700;display:flex;justify-content:space-between;gap:8px;"><span>${who}</span><span style="color:#64748b;">${when}</span></div>
                          <div>${m.message}</div>
                        </div>
                      </div>`;
                  }).join('')
                  : '<div style="color:#64748b;">メッセージはありません</div>';
              } catch {
                box.innerHTML = '<div style="color:#b00020;">読み込みに失敗しました</div>';
              }
            };
            await load();
            const doSend = async () => {
              const val = String(text.value || '').trim();
              if (!val) return;
              send.disabled = true;
              try {
                await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ message: val }) });
                text.value = '';
                await load();
              } catch (errSend) {
                showErr(errSend?.message || '送信に失敗しました');
              }
              send.disabled = false;
            };
            send.addEventListener('click', doSend);
            text.addEventListener('keydown', async (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); await doSend(); } });
            const btnEdit = chat.querySelector('.chat-edit');
            const btnNew = chat.querySelector('.chat-new');
            const ensureEditModal = () => {
              let modal = document.getElementById('editModal');
              if (modal) return modal;
              modal = document.createElement('div');
              modal.id = 'editModal';
              modal.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);width:720px;max-width:95%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,.16);padding:16px;display:none;z-index:1000;';
              modal.innerHTML = `
                <div style="font-weight:800;color:#0b2c66;margin-bottom:8px;">編集</div>
                <div class="adjust-grid" style="grid-template-columns: 120px 1fr;">
                  <div class="adjust-label">日付</div><div><input id="edDate" type="date"></div>
                  <div class="adjust-label">費目</div><div><select id="edType" class="adjust-input"><option value="train">電車</option><option value="bus">バス</option><option value="taxi">タクシー</option><option value="private_car">自家用車</option><option value="parking">駐車場</option><option value="highway">高速道路</option></select></div>
                  <div class="adjust-label">出発</div><div><input id="edOrigin" class="adjust-input"></div>
                  <div class="adjust-label">経由</div><div><input id="edVia" class="adjust-input"></div>
                  <div class="adjust-label">到着</div><div><input id="edDestination" class="adjust-input"></div>
                  <div class="adjust-label">片道/往復</div><div><select id="edTripType" class="adjust-input"><option value="one_way">片道</option><option value="round_trip">往復</option></select></div>
                  <div class="adjust-label">回数</div><div><input id="edTripCount" type="number" min="1" class="adjust-input"></div>
                  <div class="adjust-label">距離(km)</div><div><input id="edKm" type="number" step="0.1" class="adjust-input"></div>
                  <div class="adjust-label">単価</div><div><input id="edUnitPrice" type="number" step="1" class="adjust-input"></div>
                  <div class="adjust-label">目的</div><div><input id="edPurpose" class="adjust-input"></div>
                  <div class="adjust-label">定期</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="edTeiki" type="checkbox"><span>定期区間内</span></label></div>
                  <div class="adjust-label">通勤</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="edCommuter" type="checkbox"><span>通勤パス</span></label></div>
                  <div class="adjust-label">金額</div><div><input id="edAmount" type="number" step="1" class="adjust-input"></div>
                  <div class="adjust-label">メモ</div><div><input id="edMemo" class="adjust-input"></div>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                  <button id="edCancel" class="btn" type="button" style="height:32px;">キャンセル</button>
                  <button id="edSave" class="btn btn-primary" type="button" style="height:32px;">保存</button>
                  <button id="edApply" class="btn" type="button" style="height:32px;">申請</button>
                </div>
              `;
              document.body.appendChild(modal);
              return modal;
            };
            const openEdit = async (recId) => {
              const modal = ensureEditModal();
              const backdrop = document.getElementById('drawerBackdrop');
              try {
                const r = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`);
                const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
                set('edDate', r.date ? String(r.date).slice(0, 10) : todayISO());
                set('edType', r.type || (r.category || 'train'));
                set('edOrigin', r.origin || '');
                set('edVia', r.via || '');
                set('edDestination', r.destination || '');
                set('edTripType', r.trip_type || 'one_way');
                set('edTripCount', r.trip_count != null ? String(r.trip_count) : '1');
                set('edKm', r.distance_km != null ? String(r.distance_km) : '');
                set('edUnitPrice', r.unit_price_per_km != null ? String(r.unit_price_per_km) : '');
                set('edPurpose', r.purpose || '');
                try { const c1 = document.getElementById('edTeiki'); if (c1) c1.checked = !!r.teiki_flag; } catch { }
                try { const c2 = document.getElementById('edCommuter'); if (c2) c2.checked = !!r.commuter_pass; } catch { }
                set('edAmount', r.amount != null ? String(r.amount) : '');
                set('edMemo', r.memo || '');
              } catch (errR) { }
              if (backdrop) { backdrop.removeAttribute('hidden'); backdrop.style.display = 'block'; }
              modal.style.display = 'block';
              try { document.getElementById('edOrigin')?.focus(); } catch { }
              const onCancel = () => { modal.style.display = 'none'; if (backdrop) { backdrop.setAttribute('hidden', ''); backdrop.style.display = 'none'; } cleanup(); };
              const onSave = async () => {
                const payload = {
                  date: document.getElementById('edDate')?.value,
                  type: document.getElementById('edType')?.value,
                  origin: document.getElementById('edOrigin')?.value,
                  via: document.getElementById('edVia')?.value,
                  destination: document.getElementById('edDestination')?.value,
                  trip_type: document.getElementById('edTripType')?.value,
                  trip_count: parseInt(String(document.getElementById('edTripCount')?.value || '1'), 10),
                  distance_km: parseFloat(String(document.getElementById('edKm')?.value || '')),
                  unit_price_per_km: parseFloat(String(document.getElementById('edUnitPrice')?.value || '')),
                  purpose: document.getElementById('edPurpose')?.value,
                  teiki_flag: !!document.getElementById('edTeiki')?.checked,
                  commuter_pass: !!document.getElementById('edCommuter')?.checked,
                  amount: parseFloat(String(document.getElementById('edAmount')?.value || '')),
                  memo: document.getElementById('edMemo')?.value
                };
                try {
                  const current = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`);
                  const changed = [];
                  const cmp = (k, nv, ov) => { const n = nv == null ? '' : String(nv); const o = ov == null ? '' : String(ov); if (n !== o) changed.push(`${k}: ${o} → ${n}`); };
                  cmp('日付', payload.date, current.date ? String(current.date).slice(0, 10) : '');
                  cmp('費目', payload.type, current.type || current.category);
                  cmp('出発', payload.origin, current.origin);
                  cmp('経由', payload.via, current.via);
                  cmp('到着', payload.destination, current.destination);
                  cmp('片道/往復', payload.trip_type, current.trip_type);
                  cmp('回数', payload.trip_count, current.trip_count);
                  cmp('距離(km)', payload.distance_km, current.distance_km);
                  cmp('単価', payload.unit_price_per_km, current.unit_price_per_km);
                  cmp('目的', payload.purpose, current.purpose);
                  cmp('定期', payload.teiki_flag, current.teiki_flag);
                  cmp('通勤', payload.commuter_pass, current.commuter_pass);
                  cmp('金額', payload.amount, current.amount);
                  cmp('メモ', payload.memo, current.memo);
                  const msg = changed.length ? ('変更内容:\n' + changed.join('\n') + '\n保存しますか？') : '変更はありません。保存しますか？';
                  const ok = window.confirm(msg);
                  if (!ok) return;
                } catch { }
                try { await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`, { method: 'PATCH', body: JSON.stringify(payload) }); await renderList(); onCancel(); } catch (errU) { showErr(errU?.message || '保存に失敗しました'); }
              };
              const onApply = async () => {
                try { await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}/apply`, { method: 'POST' }); await renderList(); onCancel(); } catch (errA) { showErr(errA?.message || '申請に失敗しました'); }
              };
              const cancelBtn = document.getElementById('edCancel');
              const saveBtn = document.getElementById('edSave');
              const applyBtn = document.getElementById('edApply');
              cancelBtn?.addEventListener('click', onCancel);
              saveBtn?.addEventListener('click', onSave);
              applyBtn?.addEventListener('click', onApply);
              const cleanup = () => {
                cancelBtn?.removeEventListener('click', onCancel);
                saveBtn?.removeEventListener('click', onSave);
                applyBtn?.removeEventListener('click', onApply);
              };
            };
            btnEdit?.addEventListener('click', async () => { try { await openEdit(id); } catch { } });
            btnNew?.addEventListener('click', async () => {
              try {
                const m = currentYM();
                try { await fetchJSONAuth('/api/expenses/months/start', { method: 'POST', body: JSON.stringify({ month: m }) }); } catch { }
                const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
                setVal('exDate', m + '-01');
                setVal('exType', 'train');
                setVal('exOrigin', '');
                setVal('exVia', '');
                setVal('exDestination', '');
                setVal('exTripType', 'one_way');
                setVal('exTripCount', '1');
                setVal('exKm', '');
                setVal('exUnitPrice', '');
                setVal('exPurpose', '');
                const teikiEl = document.getElementById('exTeiki'); if (teikiEl) teikiEl.checked = false;
                setVal('exAmount', '');
                setVal('exMemo', '');
                formActive = true;
                const navBtn = document.getElementById('expNavNew') || document.getElementById('topNavNew');
                if (navBtn) {
                  navBtn.click();
                } else {
                  window.location.reload();
                }
              } catch { }
            });
          }
        } finally {
          btn.disabled = false;
        }
      });
    }
  } catch (e) {
    const msg = String(e?.message || 'unknown');
    if (isTooManyReqErr(e)) {
      listRateLimitedUntilMs = Date.now() + 65000;
      host.innerHTML = '<div style="color:#b45309;font-weight:700;">アクセスが集中しています（Too many requests）。1分ほど待ってから自動再試行します。</div>';
      try { if (listRetryTimer) clearTimeout(listRetryTimer); } catch { }
      listRetryTimer = setTimeout(() => { renderList().catch(() => { }); }, 65000);
    } else {
      host.innerHTML = `<div style="color:#b00020;font-weight:650;">取得失敗: ${msg}</div>`;
    }
  } finally {
    renderListBusy = false;
    if (renderListPending) {
      renderListPending = false;
      setTimeout(() => { renderList().catch(() => { }); }, 0);
    }
  }
};// Cái này dùng để render list - 
const renderHistoryTitle = () => {
  // no-op: history controls are now on the toolbar row
};
export async function bootExpensesPage() {
  const pageMarker = document.getElementById('historySection') || document.getElementById('homeSection') || document.getElementById('exDate');
  if (!pageMarker) return;
  if (pageMarker.dataset.booted === '1') return;
  pageMarker.dataset.booted = '1';
  expensesPageMounted = true;
  wireUserMenu(); wireDrawer();
  // Register per-page cleanup so router can stop background polling when leaving this page.
  try {
    window.__employeePageCleanup = () => {
      expensesPageMounted = false;
      try { if (noticePollTimer) clearInterval(noticePollTimer); } catch { }
      noticePollTimer = null;
    };
  } catch { }
  prefillUserName();
  try {
    const p = await fetchJSONAuthSafe('/api/auth/me', undefined, 1);
    meProfile = p || null;
    const role = String(p.role || '').toLowerCase();
    if (!p || (role !== 'employee' && role !== 'manager')) {
      if (role === 'admin') {
        showErr('このページへのアクセス権限がありません（管理者は管理画面をご利用ください）');
        window.location.href = '/admin/expenses';
        return;
      }
      window.location.href = '/ui/login'; return;
    }
    const name = p.username || p.email || 'ユーザー'; const el = $('#userName'); if (el) el.textContent = name;
    try { window.MY_ID = p.id; } catch { }
    try {
      noticeSeenKey = `expenses_notice_seen_at:${String(p.id || '')}`;
      noticeSeenAtMs = Number(localStorage.getItem(noticeSeenKey) || '0') || 0;
    } catch { }
    try {
      const params = new URLSearchParams(String(window.location.search || ''));
      const m = params.get('month');
      if (m && /^\d{4}-\d{2}$/.test(String(m))) {
        createTargetMonth = String(m);
        const d = document.getElementById('exDate'); if (d) d.value = String(m) + '-01';
        const mf = document.getElementById('exFilterMonth'); if (mf) mf.value = String(m);
        try { await fetchJSONAuth('/api/expenses/months/start', { method: 'POST', body: JSON.stringify({ month: String(m) }) }); } catch { }
        formActive = true;
      } else {
        try {
          const active = await fetchJSONAuthSafe('/api/expenses/months/active', undefined, 1);
          const ym = String(active?.month || '').slice(0, 7);
          if (/^\d{4}-\d{2}$/.test(ym)) {
            createTargetMonth = ym;
            const mf = document.getElementById('exFilterMonth'); if (mf) mf.value = ym;
            const d = document.getElementById('exDate');
            if (d && (!d.value || String(d.value).slice(0, 7) !== ym)) {
              const t = todayISO();
              d.value = (String(t).slice(0, 7) === ym) ? t : `${ym}-01`;
            }
            formActive = true;
          }
        } catch (e) {
          if (!isNotFoundErr(e)) throw e;
        }
      }
    } catch { }
  } catch (e) {
    const msg = String(e?.message || '');
    if (/401|403|invalid token|expired token/i.test(msg)) {
      window.location.href = '/ui/login';
      return;
    }
    showErr('通信エラーが発生しました。少し待ってから再度お試しください。');
    return;
  }
  const back = document.getElementById('expBackBtn');
  if (back && !back.dataset.bound) {
    back.dataset.bound = '1';
    back.addEventListener('click', (e) => {
      e.preventDefault();
      const goSoft = window.__employeeSoftNavigate;
      if (typeof goSoft === 'function') {
        goSoft('/ui/portal', true).then((ok) => {
          if (!ok) window.location.href = '/ui/portal';
        }).catch(() => { window.location.href = '/ui/portal'; });
        return;
      }
      try { window.location.href = '/ui/portal'; } catch { }
    });
  }
  const d = $('#exDate'); if (d && !d.value) d.value = todayISO();
  const typeSel = document.getElementById('exType');
  const kmEl = document.getElementById('exKm');
  const unitEl = document.getElementById('exUnitPrice');
  const amtEl = document.getElementById('exAmount');
  const tripSel = document.getElementById('exTripType');
  const tripCountEl = document.getElementById('exTripCount');
  const toggleCarFields = () => {
    const isCar = (typeSel?.value || '') === 'car';
    const kmRow = kmEl?.parentElement?.previousElementSibling ? kmEl.parentElement.previousElementSibling : null;
    const unitRow = unitEl?.parentElement?.previousElementSibling ? unitEl.parentElement.previousElementSibling : null;
    if (kmEl && unitEl) {
      kmEl.parentElement.style.display = isCar ? '' : 'none';
      unitEl.parentElement.style.display = isCar ? '' : 'none';
      if (kmRow) kmRow.style.display = isCar ? '' : 'none';
      if (unitRow) unitRow.style.display = isCar ? '' : 'none';
    }
  };
  const toggleTripCount = () => {
    const isMulti = (tripSel?.value || '') === 'multi';
    const cntRowLabel = tripCountEl?.parentElement?.previousElementSibling ? tripCountEl.parentElement.previousElementSibling : null;
    if (tripCountEl) {
      tripCountEl.parentElement.style.display = isMulti ? '' : 'none';
      if (cntRowLabel) cntRowLabel.style.display = isMulti ? '' : 'none';
    }
  };
  const recomputeAmountPreview = () => {
    const type = typeSel?.value || '';
    let base = parseAmount(amtEl?.value || '0');
    const t = tripSel?.value || 'one_way';
    const cnt = Math.max(1, Number(tripCountEl?.value || '1') || 1);
    if (type === 'car') {
      const dist = Number(kmEl?.value || '0') || 0;
      const unit = Number(unitEl?.value || '0') || 0;
      if (dist > 0 && unit > 0) base = Math.round(dist * unit);
    }
    if (t === 'round_trip') base = base * 2;
    else if (t === 'multi') base = base * cnt;
    if (amtEl) amtEl.value = base ? base.toLocaleString('ja-JP') : '';
  };
  typeSel?.addEventListener('change', () => { toggleCarFields(); recomputeAmountPreview(); });
  kmEl?.addEventListener('input', recomputeAmountPreview);
  unitEl?.addEventListener('input', recomputeAmountPreview);
  tripSel?.addEventListener('change', () => { toggleTripCount(); recomputeAmountPreview(); });
  tripCountEl?.addEventListener('input', recomputeAmountPreview);
  toggleCarFields();
  toggleTripCount();
  bindAmountFormatter(amtEl);
  try { if (amtEl && amtEl.value) amtEl.value = formatAmount(amtEl.value); } catch { }
  const frontInput = document.getElementById('exReceiptFront');
  const backInput = document.getElementById('exReceiptBack');
  const imagesInput = document.getElementById('exImages');
  frontInput?.addEventListener('change', () => renderFilePreview(frontInput, 'exReceiptFrontPreview'));
  backInput?.addEventListener('change', () => renderFilePreview(backInput, 'exReceiptBackPreview'));
  imagesInput?.addEventListener('change', () => renderMultiFilePreview(imagesInput, 'exImagesPreview'));
  const validateExpenseForm = () => {
    clearFieldErrors();
    showErr('');
    const exErrMsg = document.getElementById('exErrMsg');
    if (exErrMsg) exErrMsg.style.display = 'none';

    let ok = true;
    let date = String($('#exDate')?.value || '');
    date = date.replace(/\//g, '-');
    const origin = String($('#exOrigin')?.value || '').trim();
    const destination = String($('#exDestination')?.value || '').trim();
    const purpose = String($('#exPurpose')?.value || '').trim();
    const type = $('#exType')?.value || 'train';
    const teiki = !!$('#exTeiki')?.checked;
    const rawAmount = String($('#exAmount')?.value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setFieldError('exDate', '日付を正しく入力してください。'); ok = false; }
    if (!origin) { setFieldError('exOrigin', '出発地は必須です。'); ok = false; }
    if (!destination) { setFieldError('exDestination', '到着地は必須です。'); ok = false; }
    if (!purpose) { setFieldError('exPurpose', '用途は必須です。'); ok = false; }
    if (!rawAmount && !(type === 'train' && teiki)) { setFieldError('exAmount', '金額は必須です。'); ok = false; }
    if (!ok) {
      if (exErrMsg) {
        exErrMsg.textContent = '入力内容をご確認ください。';
        exErrMsg.style.display = 'block';
      } else {
        showErr('入力内容をご確認ください。');
      }
    }
    return ok;
  };
  const applyBtn = $('#exApply');

  const handleSaveItem = async (isDraftOnly) => {
    if (!validateExpenseForm()) return;
    showErr('');
    const exErrMsg = document.getElementById('exErrMsg');
    if (exErrMsg) exErrMsg.style.display = 'none';

    const btn = applyBtn;
    if (!btn || btn.disabled) return;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '保存中…';

    const clientToken = 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    let date = $('#exDate')?.value || '';
    date = date.replace(/\//g, '-');
    const type = $('#exType')?.value || 'train';
    const origin = $('#exOrigin')?.value || '';
    const via = $('#exVia')?.value || '';
    const destination = $('#exDestination')?.value || '';
    const tripType = $('#exTripType')?.value || 'one_way';
    const tripCount = Number($('#exTripCount')?.value || '1');
    const purpose = $('#exPurpose')?.value || '';
    const teiki = !!$('#exTeiki')?.checked;
    const km = $('#exKm')?.value || '';
    const unitPricePerKm = $('#exUnitPrice')?.value || '';
    const memo = $('#exMemo')?.value || '';
    const rawAmount = String($('#exAmount')?.value || '').trim();
    let amount = parseAmount(rawAmount);
    if (type === 'train' && teiki) amount = 0;

    showSpinner();
    try {
      const create = await fetchJSONAuth('/api/expenses', {
        method: 'POST', body: JSON.stringify({
          date, type, origin, via, destination, tripType, tripCount, purpose, teiki,
          km: km ? Number(km) : null, unitPricePerKm: unitPricePerKm ? Number(unitPricePerKm) : null,
          amount: Number(amount), memo, clientToken
        })
      });
      const newId = create?.id;
      const fFront = document.getElementById('exReceiptFront')?.files?.[0] || null;
      const fBack = document.getElementById('exReceiptBack')?.files?.[0] || null;
      const imgs = document.getElementById('exImages')?.files || [];
      if (newId && (fFront || fBack || (imgs && imgs.length))) {
        const fd = new FormData();
        if (fFront) fd.append('files', fFront, (fFront.name || 'front'));
        if (fBack) fd.append('files', fBack, (fBack.name || 'back'));
        for (const f of imgs) fd.append('files', f, f.name || 'image');
        await fetch(`/api/expenses/${encodeURIComponent(newId)}/files`, { method: 'POST', body: fd, credentials: 'include' });
      }

      // Reload month filter if we're in new flow
      const exFilterMonth = document.getElementById('exFilterMonth');
      const createTargetMonth = window.createTargetMonth || currentYM();
      if (exFilterMonth && (!exFilterMonth.value || exFilterMonth.value !== createTargetMonth)) {
        exFilterMonth.value = createTargetMonth;
      }

      // Successfully saved
      const modal = document.getElementById('exItemModal');
      if (modal) modal.style.display = 'none';
      if (typeof window.renderAppItemsList === 'function') {
        await window.renderAppItemsList();
      }
      showErr('');
    } catch (e) {
      if (exErrMsg) {
        exErrMsg.textContent = e?.message || '保存に失敗しました';
        exErrMsg.style.display = 'block';
      } else {
        showErr(e?.message || '保存に失敗しました');
      }
    } finally {
      hideSpinner();
      btn.disabled = false;
      btn.textContent = origText;
    }
  };

  applyBtn?.addEventListener('click', async () => handleSaveItem(true));
  // do not auto-render history list; wait for user to press "検索"

  const typesSel = document.getElementById('exFilterType');
  try {
    const types = await fetchJSONAuth('/api/expenses/types');
    if (Array.isArray(types) && types.length) {
      // optional enhancement: populate type filter dynamically if needed
    }
  } catch { }

  const monthFilter = document.getElementById('exFilterMonth');
  const statusFilter = document.getElementById('exFilterStatus');
  const btnSearch = document.getElementById('exSearch');
  const btnClear = document.getElementById('exClear');
  const btnCsv = document.getElementById('exCsv');
  const btnShowHistory = document.getElementById('exShowHistory');
  const createMonthGrid = document.getElementById('exCreateMonthGrid');
  const createMonthInput = document.getElementById('exCreateMonthInput');
  const createMonthStartBtn = document.getElementById('exCreateMonthStart');
  const profileNameEl = document.getElementById('exCreateProfileName');
  const profileCodeEl = document.getElementById('exCreateProfileCode');
  const profileDobEl = document.getElementById('exCreateProfileDob');
  const profileStartEl = document.getElementById('exCreateProfileStart');
  const profileStatusEl = document.getElementById('exCreateProfileStatus');
  const setProfileStatus = (text, isError = false) => {
    if (!profileStatusEl) return;
    profileStatusEl.textContent = String(text || '');
    profileStatusEl.style.color = isError ? '#b91c1c' : '#334155';
  };
  const profileDefaults = (ym) => ({
    employeeName: String(
      meProfile?.full_name ||
      meProfile?.name ||
      meProfile?.username ||
      meProfile?.email ||
      document.getElementById('userName')?.textContent ||
      ''
    ).trim(),
    employeeCode: String(
      meProfile?.employee_code ||
      meProfile?.emp_code ||
      meProfile?.code ||
      ''
    ).trim(),
    birthDate: fmtDateOnly(
      meProfile?.birth_date ||
      meProfile?.birthday ||
      meProfile?.date_of_birth ||
      meProfile?.dob ||
      ''
    ),
    startDate: firstDayOfYm(ym)
  });
  const fillCreateProfile = (row, ym) => {
    const d = profileDefaults(ym);
    if (profileNameEl) profileNameEl.value = String(row?.employee_name || d.employeeName || '');
    if (profileCodeEl) profileCodeEl.value = String(row?.employee_code || d.employeeCode || '');
    if (profileDobEl) profileDobEl.value = String(row?.birth_date || d.birthDate || '').slice(0, 10);
    if (profileStartEl) profileStartEl.value = String(row?.start_date || d.startDate || '').slice(0, 10);
  };
  const loadMonthProfile = async (ym) => {
    if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) return;
    // Profile inputs were removed from the New flow; keep default data preparation only.
    fillCreateProfile(null, ym);
  };
  const validateCreateProfile = (ym) => {
    const employeeName = String(profileNameEl?.value || '').trim();
    const employeeCode = String(profileCodeEl?.value || '').trim();
    const birthDate = String(profileDobEl?.value || '').trim();
    const startDate = String(profileStartEl?.value || '').trim();
    if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) return { ok: false, message: '対象年月を選択してください。' };
    if (!employeeName) return { ok: false, message: '社員情報を取得できませんでした（社員名）。' };
    if (!employeeCode) return { ok: false, message: '社員情報を取得できませんでした（社員コード）。' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, message: '社員情報を取得できませんでした（生年月日）。' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, message: '作成開始日を入力してください。' };
    return { ok: true, payload: { month: String(ym), employeeName, employeeCode, birthDate, startDate } };
  };
  const saveMonthProfile = async (ym) => {
    const vr = validateCreateProfile(ym);
    if (!vr.ok) throw new Error(vr.message || '入力内容をご確認ください。');
    setProfileStatus('入力情報を保存中…');
    const row = await fetchJSONAuth('/api/expenses/months/profile', { method: 'POST', body: JSON.stringify(vr.payload) });
    setProfileStatus('入力情報を保存しました。');
    return row;
  };
  if (monthFilter && !monthFilter.value) {
    monthFilter.value = currentYM();
  }
  if (createMonthInput && !createMonthInput.value) {
    createMonthInput.value = createTargetMonth;
  }
  btnSearch?.addEventListener('click', async () => {
    const ym = String(monthFilter?.value || '');
    selectedHistoryMonth = /^\d{4}-\d{2}$/.test(ym) ? ym : '';
    await renderList();
  });
  btnShowHistory?.addEventListener('click', async () => {
    const ym = String(monthFilter?.value || '');
    selectedHistoryMonth = /^\d{4}-\d{2}$/.test(ym) ? ym : '';
    await renderList();
  });
  btnClear?.addEventListener('click', async () => {
    if (monthFilter) monthFilter.value = '';
    if (statusFilter) statusFilter.value = (activeHistoryTab === 'applied') ? 'applied' : '';
    selectedHistoryMonth = '';
    await renderList();
  });
  monthFilter?.addEventListener('change', () => {
    const ym = String(monthFilter.value || '');
    selectedHistoryMonth = /^\d{4}-\d{2}$/.test(ym) ? ym : '';
    renderHistoryTitle();
  });
  monthFilter?.addEventListener('input', () => {
    const ym = String(monthFilter.value || '');
    selectedHistoryMonth = /^\d{4}-\d{2}$/.test(ym) ? ym : '';
    renderHistoryTitle();
  });
  btnCsv?.addEventListener('click', async () => {
    const m = monthFilter?.value || '';
    const s = statusFilter?.value || '';
    const u = `/api/expenses/export.csv?month=${encodeURIComponent(m)}&status=${encodeURIComponent(s)}`;
    window.location.href = u;
  });
  const navNewBtns = [document.getElementById('topNavNew'), document.getElementById('expNavNew')].filter(Boolean);
  const navAppliedBtns = [document.getElementById('topNavApplied'), document.getElementById('expNavApplied')].filter(Boolean);
  const navNoticeBtns = [document.getElementById('topNavNotice'), document.getElementById('expNavNotice')].filter(Boolean);

  const expNavHelp = document.getElementById('expNavHelp');
  const navHelpBtns = [expNavHelp].filter(Boolean);
  const homeSection = document.getElementById('homeSection');
  const historySection = document.getElementById('historySection');
  const helpSection = document.getElementById('helpSection');
  const historyModeLabel = document.getElementById('historyModeLabel');
  const setNavActive = (name) => {
    navNewBtns.forEach((el) => el.classList.toggle('active', name === 'new'));
    navAppliedBtns.forEach((el) => el.classList.toggle('active', name === 'applied'));
    navNoticeBtns.forEach((el) => el.classList.toggle('active', name === 'notice'));
    navHelpBtns.forEach((el) => el.classList.toggle('active', name === 'help'));
  };
  const showTab = async (name) => {
    let tab = (name === 'new' || name === 'applied' || name === 'notice' || name === 'help') ? name : 'new';
    if (tab === 'new' && !formActive) {
      tab = 'applied';
    }
    const mainHost = document.querySelector('.expense-main');
    activeHistoryTab = tab;
    try { sessionStorage.setItem(EXPENSES_ACTIVE_TAB_KEY, activeHistoryTab); } catch { }

    if (tab === 'applied') {
      selectedHistoryMonth = '';
      const listHost = document.getElementById('exListHost');
      const listWrapper = document.getElementById('exListWrapper');
      if (listHost) listHost.style.display = 'none';
      if (listWrapper) listWrapper.style.display = 'none';
      const boardHost = document.getElementById('exMonthlyBoardHost');
      if (boardHost) boardHost.style.display = (activeSummaryCard === '') ? 'none' : 'block';
      const summaryCards = document.getElementById('exSummaryCards');
      if (summaryCards) summaryCards.style.display = 'grid';
    }

    const pageTitle = $('#expPageTitle');
    if (pageTitle) {
      if (tab === 'new') {
        pageTitle.textContent = formActive ? '新規作成' : '交通費申請';
      } else if (tab === 'applied') {
        pageTitle.textContent = '申請履歴';
      } else if (tab === 'notice') {
        pageTitle.textContent = 'お知らせ';
      } else if (tab === 'help') {
        pageTitle.textContent = 'ヘルプ';
      }
    }

    if (tab === 'new') {
      if (homeSection) homeSection.style.display = formActive ? '' : 'none';
      if (historySection) historySection.style.display = showMonthProgressInNewMode ? '' : 'none';
      if (helpSection) helpSection.style.display = 'none';
      if (historySection) historySection.classList.remove('notice-mode');
      if (historyModeLabel) historyModeLabel.textContent = showMonthProgressInNewMode ? '申請済み日付（当月）' : '交通費提出履歴（月次）';
      if (mainHost) mainHost.classList.toggle('new-progress-split', !!showMonthProgressInNewMode);

      if (formActive) {
        if (step1Input) step1Input.style.display = 'block';
        if (step2Confirm) step2Confirm.style.display = 'none';
        if (step3Complete) step3Complete.style.display = 'none';
        if (typeof setProgressState === 'function') setProgressState(1);
      }
    } else if (tab === 'help') {
      if (homeSection) homeSection.style.display = 'none';
      if (historySection) historySection.style.display = 'none';
      if (helpSection) helpSection.style.display = '';
      if (mainHost) mainHost.classList.remove('new-progress-split');
    } else {
      if (homeSection) homeSection.style.display = 'none';
      if (helpSection) helpSection.style.display = 'none';
      if (historySection) historySection.style.display = '';
      if (historySection) historySection.classList.toggle('applied-month-mode', tab === 'applied');
      if (historySection) historySection.classList.toggle('notice-mode', tab === 'notice');
      if (historyModeLabel) historyModeLabel.textContent = (tab === 'notice')
        ? 'お知らせ（差戻し）'
        : ((tab === 'applied' && showMonthProgressInNewMode) ? '申請済み日付（当月）' : '交通費提出履歴（月次）');
      if (mainHost) mainHost.classList.toggle('new-progress-split', tab === 'applied' && showMonthProgressInNewMode);
      renderHistoryTitle();
    }
    setNavActive(tab);
  };
  const renderCreateMonthGrid = () => {
    if (!createMonthGrid) return;
    const target = createTargetMonth || currentYM();
    const months = recentMonths(6, currentYM());
    if (!months.includes(target)) {
      months.unshift(target);
    }
    createMonthGrid.innerHTML = months.map((ym) => {
      const active = ym === target ? ' active' : '';
      return `<button class="month-chip${active}" type="button" data-month="${ym}">${ym.slice(0, 4)}年${ym.slice(5, 7)}月</button>`;
    }).join('');
  };
  const startNewForMonth = async (ym, opts = {}) => {
    const showProgress = !!opts.showProgress || !!opts.switchToAppliedAfterCreate;
    const stayOnApplied = !!opts.stayOnApplied;
    const switchToAppliedAfterCreate = !!opts.switchToAppliedAfterCreate;
    const openAppliedListAfterCreate = !!opts.openAppliedListAfterCreate;
    if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) {
      showErr('対象年月を選択してください。');
      return;
    }
    createTargetMonth = String(ym);
    window.createTargetMonth = createTargetMonth; // Đảm bảo gán vào window để renderAppItemsList lấy được
    if (createMonthInput) createMonthInput.value = createTargetMonth;
    try {
      await fetchJSONAuth('/api/expenses/months/start', { method: 'POST', body: JSON.stringify({ month: createTargetMonth }) });
    } catch (e) {
      const msg = String(e?.message || '月の開始に失敗しました');
      showErr(msg);
      setProfileStatus(msg, true);
      return;
    }
    const d = document.getElementById('exDate');
    if (d) d.value = `${createTargetMonth}-01`;
    const exAppMonth = document.getElementById('exAppMonth');
    if (exAppMonth) {
      exAppMonth.value = createTargetMonth;
    }
    if (typeof window.renderAppItemsList === 'function') {
      window.renderAppItemsList();
    }
    if (monthFilter) monthFilter.value = createTargetMonth;
    if (statusFilter) statusFilter.value = '';
    selectedHistoryMonth = createTargetMonth;
    showMonthProgressInNewMode = showProgress;
    formActive = true;
    showErr('');
    if (openAppliedListAfterCreate) {
      showMonthProgressInNewMode = false;
      formActive = false;
      selectedHistoryMonth = '';
      if (monthFilter) monthFilter.value = '';
      await showTab('applied');
      await renderList();
      return;
    }
    await showTab((stayOnApplied || switchToAppliedAfterCreate) ? 'applied' : 'new');
    if (showProgress) {
      await renderList();
    } else if (switchToAppliedAfterCreate) {
      await renderList();
    }
  };
  window.startNewForMonth = startNewForMonth;
  continueCreateForMonth = async (ym, opts = {}) => startNewForMonth(ym, { showProgress: true, stayOnApplied: !!opts.stayOnApplied, skipProfile: true });
  if (createMonthGrid && !createMonthGrid.dataset.bound) {
    createMonthGrid.dataset.bound = '1';
    createMonthGrid.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-month]');
      if (!btn) return;
      const ym = String(btn.getAttribute('data-month') || '');
      createTargetMonth = ym;
      window.createTargetMonth = ym;
      if (createMonthInput) createMonthInput.value = ym;
      renderCreateMonthGrid();
    });
  }
  createMonthInput?.addEventListener('change', () => {
    const ym = String(createMonthInput.value || '');
    if (/^\d{4}-\d{2}$/.test(ym)) {
      createTargetMonth = ym;
      window.createTargetMonth = ym;
      renderCreateMonthGrid();
    }
  });
  createMonthStartBtn?.addEventListener('click', async () => {
    document.getElementById('monthSelectModal').style.display = 'none';
    const ym = String(createMonthInput?.value || createTargetMonth || '');
    await startNewForMonth(ym, { showProgress: false });
  });
  document.getElementById('exCreateMonthCancel')?.addEventListener('click', () => {
    document.getElementById('monthSelectModal').style.display = 'none';
  });
  renderCreateMonthGrid();
  const exHistoryNewBtn = document.getElementById('exHistoryNewBtn');
  exHistoryNewBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const modal = document.getElementById('monthSelectModal');
    if (modal) {
      modal.style.display = 'flex';
      const createMonthInput = document.getElementById('exCreateMonthInput');
      if (createMonthInput) {
        createMonthInput.value = currentYM();
      }
    }
  });

  const exSummaryCards = document.getElementById('exSummaryCards');
  if (exSummaryCards) {
    exSummaryCards.addEventListener('click', async (e) => {
      const card = e.target.closest('.summary-card');
      if (!card) return;
      activeSummaryCard = card.dataset.type || 'all';
      await renderList();
    });
  }

  const bindTabClick = (els, handler) => {
    els.forEach((el) => {
      if (!el) return;
      el.addEventListener('click', handler);
    });
  };
  bindTabClick(navNewBtns, async (e) => {
    e.preventDefault();
    const modal = document.getElementById('monthSelectModal');
    if (modal) {
      modal.style.display = 'flex';
      const createMonthInput = document.getElementById('exCreateMonthInput');
      if (createMonthInput) {
        createMonthInput.value = currentYM();
      }
    }
  });
  bindTabClick(navAppliedBtns, async (e) => {
    e.preventDefault();
    if (navBusy) return;
    navBusy = true;
    
    // Luôn luôn reset mọi trạng thái khi click vào tab 申請一覧
    activeSummaryCard = '';
    const m = document.getElementById('exFilterMonth');
    const s = document.getElementById('exFilterStatus');
    if (s) s.value = ''; 
    showMonthProgressInNewMode = false;
    formActive = false;
    selectedHistoryMonth = '';
    if (m) m.value = '';
    
    // Bỏ chọn thẻ thống kê
    document.querySelectorAll('.summary-card').forEach(card => {
      card.style.border = '1px solid var(--border)';
      card.style.boxShadow = 'none';
      card.style.background = '#fff';
    });

    try {
      await showTab('applied');
      await renderList();
    } finally {
      navBusy = false;
    }
  });
  bindTabClick(navNoticeBtns, async (e) => {
    e.preventDefault();
    if (activeHistoryTab === 'notice') return;
    if (navBusy) return;
    navBusy = true;
    const s = document.getElementById('exFilterStatus');
    if (s) s.value = '';
    selectedHistoryMonth = '';
    const m = document.getElementById('exFilterMonth');
    if (m) m.value = '';
    try {
      markNoticeSeen();
      await showTab('notice');
      await renderList();
    } finally {
      navBusy = false;
    }
  });
  bindTabClick(navHelpBtns, async (e) => {
    e.preventDefault();
    if (activeHistoryTab === 'help') return;
    if (navBusy) return;
    navBusy = true;
    try {
      await showTab('help');
    } finally {
      navBusy = false;
    }
  });
  const initialTab = (() => {
    try {
      const qs = new URLSearchParams(String(window.location.search || ''));
      const qTab = String(qs.get('tab') || '').toLowerCase();
      if (qTab === 'new' || qTab === 'applied' || qTab === 'notice' || qTab === 'help') return qTab;
      const saved = String(sessionStorage.getItem(EXPENSES_ACTIVE_TAB_KEY) || '').toLowerCase();
      if (saved === 'new' || saved === 'applied' || saved === 'notice' || saved === 'help') return saved;
    } catch { }
    return 'applied';
  })();
  await showTab(initialTab);

  if (initialTab === 'new' && !formActive) {
    const modal = document.getElementById('monthSelectModal');
    if (modal) {
      modal.style.display = 'flex';
      const createMonthInput = document.getElementById('exCreateMonthInput');
      if (createMonthInput) {
        createMonthInput.value = currentYM();
      }
    }
  }

  await renderList();

  try { await renderSummary(); } catch { }
  try {
    await renderNotices();
  } catch { }
  try {
    await refreshNoticeMessages();
  } catch { }
  try {
    if (noticePollTimer) clearInterval(noticePollTimer);
    noticePollTimer = setInterval(async () => {
      if (!expensesPageMounted) return;
      // Keep polling lightweight to avoid 429 bursts from /api/expenses/my.
      try { await refreshNoticeMessages(); } catch { }
    }, 30000);
  } catch { }
}

document.addEventListener('DOMContentLoaded', async () => {
  await bootExpensesPage();
});

function setupAutocomplete(inputId) {
  const el = document.getElementById(inputId);
  if (!el || el.dataset.autocomplete === '1') return;
  el.dataset.autocomplete = '1';
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const parent = el.parentElement;
  if (parent) {
    parent.style.position = 'relative';
  }
  const list = document.createElement('div');
  list.style.position = 'absolute';
  list.style.left = '0';
  list.style.right = '0';
  list.style.top = '100%';
  list.style.zIndex = '1000';
  list.style.background = '#fff';
  list.style.border = '1px solid #cbd5e1';
  list.style.borderRadius = '8px';
  list.style.boxShadow = '0 6px 16px rgba(0,0,0,.08)';
  list.style.padding = '4px';
  list.style.display = 'none';
  list.style.maxHeight = '180px';
  list.style.overflowY = 'auto';
  (parent || el).appendChild(list);
  let lastQ = ''; let tid = 0;
  const render = (rows) => {
    list.innerHTML = '';
    if (!rows || !rows.length) { list.style.display = 'none'; return; }
    for (const r of rows.slice(0, 20)) {
      const item = document.createElement('div');
      item.textContent = r.name + (r.line_name ? ` (${r.line_name})` : '');
      item.style.padding = '6px 8px';
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => { el.value = r.name; list.style.display = 'none'; });
      item.addEventListener('mouseover', () => { item.style.background = '#eef5ff'; });
      item.addEventListener('mouseout', () => { item.style.background = 'transparent'; });
      list.appendChild(item);
    }
    list.style.display = 'block';
  };
  el.addEventListener('input', () => {
    const q = String(el.value || '').trim();
    if (q.length < 2) { list.style.display = 'none'; lastQ = ''; return; }
    if (q === lastQ) return;
    lastQ = q;
    clearTimeout(tid);
    tid = setTimeout(async () => {
      try {
        const rows = await fetchJSONAuth('/api/stations?search=' + encodeURIComponent(q));
        render(Array.isArray(rows) ? rows : []);
      } catch {
        list.style.display = 'none';
      }
    }, 200);
  });
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest || !t.closest('#' + inputId)) {
      if (list) list.style.display = 'none';
    }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('exOrigin');
  setupAutocomplete('exDestination');
});
