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

let openAdjustChatId = null;
const adjustChatCache = Object.create(null);
const adjustChatLoading = Object.create(null);
const adjustChatErrors = Object.create(null);

const fmtAdjustChatDate = (val) => {
  if (!val) return '';
  return String(val).slice(0, 16).replace('T', ' ');
};

const loadAdjustMessages = async (id) => {
  adjustChatLoading[id] = true;
  delete adjustChatErrors[id];
  try {
    const rows = await fetchJSONAuth(`/api/adjust/${encodeURIComponent(id)}/messages`);
    adjustChatCache[id] = Array.isArray(rows) ? rows : [];
  } catch (e) {
    adjustChatErrors[id] = e?.message || 'unknown';
    adjustChatCache[id] = [];
    throw e;
  } finally {
    delete adjustChatLoading[id];
  }
};

const sendAdjustMessage = async (id, message) => {
  await fetchJSONAuth(`/api/adjust/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  await loadAdjustMessages(id);
};

const openAdjustChatModal = (id) => {
  const r = requestsCache.find((it) => String(it.id) === String(id));
  if (!r) return;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.48);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

  const renderBody = () => {
    const loading = !!adjustChatLoading[id];
    const messages = Array.isArray(adjustChatCache[id]) ? adjustChatCache[id] : [];
    const error = String(adjustChatErrors[id] || '').trim();
    const intro = r.admin_note
      ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;"><strong>差戻し理由:</strong> ${esc(r.admin_note)}</div>`
      : '';
    const errorHtml = error
      ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;">やり取りの読み込みに失敗しました: ${esc(error)}</div>`
      : '';
    const listHtml = loading
      ? '<div style="font-size:12px;color:#64748b;">読み込み中...</div>'
      : (messages.length
          ? messages.map((msg) => {
              const isMine = String(msg.sender_user_id) === String(r.userId);
              const align = isMine ? 'flex-end' : 'flex-start';
              const bg = isMine ? '#dbeafe' : '#f8fafc';
              return `
                <div style="display:flex;justify-content:${align};margin-bottom:8px;">
                  <div style="max-width:85%;background:${bg};border:1px solid #dbeafe;border-radius:12px;padding:8px 10px;">
                    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:4px;">${esc(msg.sender_name || (isMine ? '自分' : '管理者'))}</div>
                    <div style="font-size:12px;color:#0f172a;white-space:pre-wrap;word-break:break-word;">${esc(msg.message || '')}</div>
                    <div style="font-size:10px;color:#64748b;margin-top:4px;">${esc(fmtAdjustChatDate(msg.created_at))}</div>
                  </div>
                </div>
              `;
            }).join('')
          : '<div style="font-size:12px;color:#64748b;">まだやり取りはありません。</div>');

    return `
      <div style="width:100%;max-width:560px;background:#fff;border-radius:12px;box-shadow:0 20px 45px rgba(15,23,42,0.25);overflow:hidden;display:flex;flex-direction:column;max-height:85vh;">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;color:#0f172a;font-size:15px;">やり取り</div>
          <button type="button" id="btnAdjustChatClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;padding:0;line-height:1;">&times;</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1;background:#f8fafc;">
          ${intro}
          ${errorHtml}
          ${listHtml}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:8px;align-items:flex-end;">
          <textarea id="adjustChatInputText" placeholder="メッセージを入力..." style="flex:1;min-height:72px;resize:vertical;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;box-sizing:border-box;font:inherit;"></textarea>
          <button id="btnAdjustChatSend" type="button" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid #005eb8;background:#005eb8;color:#fff;cursor:pointer;font-weight:600;">送信</button>
        </div>
      </div>
    `;
  };

  const updateModalBody = () => {
    modal.innerHTML = renderBody();
    bindEvents();
    const chatContainer = modal.children[0].children[1];
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  const close = () => {
    try { document.body.removeChild(modal); } catch (e) { /* silently ignored */ }
    openAdjustChatId = null;
  };

  const bindEvents = () => {
    modal.querySelector('#btnAdjustChatClose')?.addEventListener('click', close);
    modal.querySelector('#btnAdjustChatSend')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const input = modal.querySelector('#adjustChatInputText');
      const text = String(input?.value || '').trim();
      if (!text) {
        input?.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = '送信中...';
      try {
        await sendAdjustMessage(id, text);
        updateModalBody();
      } catch (err) {
        adjustChatErrors[id] = err?.message || 'unknown';
        updateModalBody();
      }
    });
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.body.appendChild(modal);
  updateModalBody();

  if (!adjustChatCache[id]) {
    loadAdjustMessages(id).then(updateModalBody).catch(updateModalBody);
  }
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
      .sap-compact-card { background: #fff; border: 1px solid #cbd5e1; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border-radius: 4px; padding: 12px 16px; max-width: 500px; margin: 0 0 16px 0; }
      .sap-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
      .sap-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 6px; }
      .sap-toolbar { display: flex; gap: 6px; }
      .sap-icon-btn { background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; width: 22px; height: 22px; }
      .sap-icon-btn:hover { opacity: 0.7; }
      .sap-icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .sap-grid { display: grid; grid-template-columns: 85px 1fr; gap: 8px 12px; align-items: center; }
      .sap-label { font-size: 12px; font-weight: 600; color: #334155; text-align: left; }
      .sap-input { padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 2px; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s; display: block; height: 28px; }
      .sap-input.full { max-width: 100%; }
      .sap-textarea { padding: 6px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 2px; width: 100%; box-sizing: border-box; outline: none; resize: vertical; min-height: 50px; font-family: inherit; transition: border-color 0.2s; display: block; }
      .sap-textarea:focus { border-color: #005eb8; box-shadow: 0 0 0 1px rgba(0,94,184,0.1); }
      .sap-input:focus { border-color: #005eb8; box-shadow: 0 0 0 1px rgba(0,94,184,0.1); }
      .sap-current { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; font-size: 12px; color: #334155; border-radius: 2px; line-height: 1.4; width: 100%; box-sizing: border-box; display: block; min-height: 28px; display: flex; flex-direction: column; justify-content: center; }
      
      .action-required-card { background: #fff7ed; border-left: 4px solid #ea580c; border-radius: 6px; padding: 16px; max-width: 600px; margin: 0 0 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .action-required-title { font-size: 14px; font-weight: 700; color: #9a3412; margin: 0 0 12px 0; display: flex; align-items: center; gap: 6px; }
      .action-required-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
      .action-required-item { background: #fff; border: 1px solid #fed7aa; padding: 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 8px; }
      .action-required-header { display: flex; justify-content: space-between; align-items: center; }
      .action-required-date { font-weight: 700; color: #1e293b; font-size: 13px; }
      .action-required-reason { font-size: 12px; color: #9a3412; display: block; line-height: 1.4; }
      .action-required-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; border-top: 1px dashed #fed7aa; padding-top: 10px; }
      .action-required-btn { background: #fff; border: 1px solid #cbd5e1; color: #334155; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
      .action-required-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
      .action-required-btn.primary { background: #ea580c; border-color: #ea580c; color: #fff; }
      .action-required-btn.primary:hover { background: #c2410c; border-color: #c2410c; }
      
      .sap-tabs-container {
        border-bottom: 1px solid #cbd5e1;
        margin-bottom: 16px;
        margin-top: 10px;
        display: flex !important;
        gap: 24px;
        overflow-x: auto;
        width: 100%;
        position: relative;
        z-index: 10;
        background: #ffffff;
        min-height: 48px;
        align-items: center;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .sap-tabs-wrapper {
        display: flex !important;
        gap: 24px;
        width: 100%;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .sap-tab {
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
        display: flex !important;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .sap-tab:hover { color: #0f172a; }
      .sap-tab.active {
        color: #005eb8;
        border-bottom-color: #005eb8;
      }
      .sap-tab svg { width: 18px; height: 18px; color: currentColor; }
      .tab-badge {
        background: #ea580c;
        color: #fff;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 999px;
        line-height: 1;
      }

      /* Mobile optimizations for the Adjust form */
      @media (max-width: 768px) {
        .sap-tabs-container {
          margin-top: 4px; /* Fix overlapping with topbar */
          margin-bottom: 12px;
          gap: 8px;
          padding: 0;
          border-bottom: none;
        }
        .sap-tabs-wrapper {
          gap: 12px !important;
          padding-bottom: 4px;
        }
        .sap-tab {
          padding: 8px 4px;
          font-size: 13px;
        }
        .sap-compact-card {
          max-width: 100%;
          width: 100%;
          margin: 0 auto 16px auto;
          box-sizing: border-box;
          padding: 12px;
        }
        .sap-grid {
          grid-template-columns: 1fr;
          gap: 4px 0;
        }
        .sap-label {
          margin-top: 8px;
        }
        #adjDate, #adjIn, #adjOut {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }
      }
      /* Desktop optimizations */
      @media (min-width: 769px) {
        .sap-tabs-container {
          margin-top: 10px !important;
          margin-bottom: 20px;
          border-bottom: 1px solid #cbd5e1;
          background: transparent;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .sap-tabs-wrapper {
          display: flex !important;
          gap: 24px;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .sap-tab {
          padding: 12px 16px;
          font-size: 14px;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      }
    </style>

    <div class="sap-tabs-container" style="justify-content: flex-start; align-items: center; display: flex !important; position: relative; z-index: 50; margin-top: 0 !important; visibility: visible !important; opacity: 1 !important;">
        <div class="sap-tabs-wrapper" style="display: flex !important; gap: 24px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; width: 100%; opacity: 1 !important; visibility: visible !important;">
          <div class="sap-tab active" id="tabNew" style="display: flex !important; opacity: 1 !important; visibility: visible !important;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          <span>新規作成</span>
        </div>
        <div class="sap-tab" id="tabRejected" style="display: flex !important; opacity: 1 !important; visibility: visible !important;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <span>差戻し確認</span>
          <span id="rejectBadge" class="tab-badge" style="display:none;">0</span>
        </div>
        <div class="sap-tab" id="tabHistory" style="display: flex !important; opacity: 1 !important; visibility: visible !important;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          <span>申請履歴</span>
        </div>
      </div>
      <div id="adjustMonthFilterContainer" style="display: none; padding-bottom: 8px;">
        <input type="month" id="adjustMonthFilter" class="sap-table-input" value="${new Date().toISOString().slice(0, 7)}">
      </div>
      <div id="actionRequiredHost" style="display: none;"></div>
    </div>

    <div id="newAdjustFormCard" class="sap-compact-card" style="margin-top: 0; display: block;">
      <div class="sap-header">
        <h3 class="sap-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          修正申請
        </h3>
        <div class="sap-toolbar" style="display: flex; align-items: center; gap: 8px;">
            <button id="adjSubmit" title="申請" style="height:32px; padding:0 16px; border:none; background:#005eb8; color:#fff; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition: background 0.2s;">
              申請
            </button>
          </div>
      </div>
      
      <div id="adjRejectReasonContainer" style="display:none; margin: 12px 16px 0; padding: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; color: #9a3412;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">差戻し理由:</div>
        <div id="adjRejectReasonText" style="font-size: 13px; white-space: pre-wrap; word-break: break-word;"></div>
      </div>

      <div class="sap-grid">
        <div class="sap-label">対象日 <span style="color:#ef4444">*</span></div>
        <div><input id="adjDate" class="sap-input" type="date" value="${todayISO()}" style="width: 130px;"></div>

        <div class="sap-label">現在の打刻</div>
        <div><div id="adjCurrent" class="sap-current" style="width: 100%; max-width: none;">—</div></div>

        <div class="sap-label">修正(出勤)</div>
        <div><input id="adjIn" class="sap-input" type="datetime-local" style="width: 180px;"></div>

        <div class="sap-label">修正(退勤)</div>
        <div><input id="adjOut" class="sap-input" type="datetime-local" style="width: 180px;"></div>

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
  let urlParams = new URLSearchParams(window.location.search);
  let initialAttendanceId = urlParams.get('attendanceId');

  const loadDay = async () => {
    showErr('');
    const d = els.date?.value;
    if (!isISODate(d)) return;
    showSpinner();
    try {
      const r = await fetchJSONAuth(`/api/attendance/date/${encodeURIComponent(d)}`);
      let seg = null;
      if (initialAttendanceId) {
        seg = (r?.segments || []).find(s => String(s.id) === String(initialAttendanceId));
        initialAttendanceId = null; // Only use it once
      }
      if (!seg) seg = pickLatestSegment(r?.segments);
      
      attendanceId = seg?.id || null;
      setCurrent(seg);
      try { if (els.in) els.in.value = seg?.checkIn ? String(seg.checkIn).slice(0, 16) : ''; } catch (e) { /* silently ignored */ }
      try { if (els.out) els.out.value = seg?.checkOut ? String(seg.checkOut).slice(0, 16) : ''; } catch (e) { /* silently ignored */ }
    } catch (e) {
      attendanceId = null;
      setCurrent(null);
      showErr(e?.message || '読み込みに失敗しました');
    } finally {
      hideSpinner();
    }
  };

  // Xử lý sự kiện chuyển Tab
  const switchTab = (tabId) => {
    // Cập nhật UI Tab
    document.querySelectorAll('.sap-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add('active');

    // Ẩn tất cả nội dung
    const formCard = document.getElementById('newAdjustFormCard');
    const actionCard = document.getElementById('actionRequiredCard');
    const actionHost = document.getElementById('actionRequiredHost');
    const historyBlock = document.getElementById('sapHistoryBlock');
    
    if (formCard) formCard.style.display = 'none';
    if (actionCard) actionCard.style.display = 'none';
    if (actionHost) actionHost.style.display = 'none';
    if (historyBlock) historyBlock.style.display = 'none';

    // Hiển thị nội dung tương ứng
    if (tabId === 'tabNew' && formCard) {
      formCard.style.display = 'block';
    } else if (tabId === 'tabRejected') {
      if (actionHost) actionHost.style.display = 'block';
      if (actionCard) actionCard.style.display = 'block';
    } else if (tabId === 'tabHistory') {
      if (historyBlock) historyBlock.style.display = 'block';
    }
    
    // Toggle month filter display
    const monthFilterContainer = document.getElementById('adjustMonthFilterContainer');
    if (monthFilterContainer) {
      monthFilterContainer.style.display = tabId === 'tabHistory' ? 'block' : 'none';
    }
  };

  $('#tabNew')?.addEventListener('click', () => switchTab('tabNew'));
  $('#tabRejected')?.addEventListener('click', () => switchTab('tabRejected'));
  $('#tabHistory')?.addEventListener('click', () => switchTab('tabHistory'));

  // Xóa các event listener cũ của 3 nút Quick Actions do đã chuyển sang dùng Tab
  // Xử lý sự kiện click cho các nút động (close, overlay) bằng Event Delegation
  document.addEventListener('click', (e) => {
    // Không cần xử lý đóng drawer nữa
  });

  const pDate = urlParams.get('date');
  const pType = urlParams.get('type');

  if (pType === 'time_adjust' && pDate && isISODate(pDate) && els.date) {
    els.date.value = pDate;
    if (els.reason) els.reason.value = '打刻し忘れ';
  }

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
      els.submit.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:18px;height:18px;animation:spin 1s linear infinite;"><circle cx="25" cy="25" r="20" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-dasharray="80 200"></circle></svg><style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;

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

let currentPage = 1;
const itemsPerPage = 15;

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

    window.requestsCache = rows;

    // Hiển thị danh sách các yêu cầu bị trả về ở ngay màn hình chính
    const actionHost = document.getElementById('actionRequiredHost');
    const rejectBadge = document.getElementById('rejectBadge');
    
    if (actionHost) {
      const rejectedRows = rows.filter(row => row.status === 'rejected');
      
      // Cập nhật số lượng trên Badge của Tile
      if (rejectBadge) {
        if (rejectedRows.length > 0) {
          rejectBadge.textContent = rejectedRows.length;
          rejectBadge.style.display = 'block';
        } else {
          rejectBadge.style.display = 'none';
        }
      }

      if (rejectedRows.length > 0) {
        actionHost.innerHTML = `
          <div class="action-required-card" style="display: none;" id="actionRequiredCard">
            <h4 class="action-required-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              差戻しされた申請があります（${rejectedRows.length}件）
            </h4>
            <ul class="action-required-list">
              ${rejectedRows.map(row => {
                const dateLabel = String(row.requestedCheckIn || row.created_at || '').slice(0, 10).replace(/-/g, '/');
                return `
                  <li class="action-required-item">
                    <div class="action-required-header">
                      <span class="action-required-date">対象日: ${dateLabel}</span>
                    </div>
                    <div class="action-required-reason">
                      <strong>差戻し理由:</strong> ${esc(row.admin_note || row.reason || '—')}
                    </div>
                    <div class="action-required-actions">
                      <button type="button" class="action-required-btn btn-chat-action" data-id="${row.id}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
                        やり取り
                      </button>
                      <button type="button" class="action-required-btn primary btn-fix-action" data-id="${row.id}" data-in="${row.requestedCheckIn || ''}" data-out="${row.requestedCheckOut || ''}" data-reason="${esc(row.reason || '')}" data-adminnote="${esc(row.admin_note || '')}">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        修正する
                      </button>
                    </div>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        `;

        // Gắn sự kiện cho các nút trong Alert Box
        actionHost.querySelectorAll('.btn-chat-action').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = e.currentTarget.dataset.id;
            openAdjustChatId = id;
            openAdjustChatModal(id);
          });
        });

        actionHost.querySelectorAll('.btn-fix-action').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const dataset = e.currentTarget.dataset;
            const id = dataset.id;
            const cin = (dataset.in || '').slice(0, 16).replace(' ', 'T');
            const cout = (dataset.out || '').slice(0, 16).replace(' ', 'T');
            const reason = dataset.reason || '';
            const adminNote = dataset.adminnote || '';
            const targetDate = (dataset.in || dataset.out || '').slice(0, 10).replace(/-/g, '/');

            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.48);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

            modal.innerHTML = `
              <div style="width:100%;max-width:500px;background:#fff;border-radius:12px;box-shadow:0 20px 45px rgba(15,23,42,0.25);overflow:hidden;display:flex;flex-direction:column;">
                <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                  <div style="font-weight:700;color:#0f172a;font-size:15px;display:flex;align-items:center;gap:6px;">
                    <svg width="18" height="18" fill="none" stroke="#ea580c" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    差戻し申請の再提出
                  </div>
                  <button type="button" class="btn-close-modal" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;padding:0;line-height:1;">&times;</button>
                </div>
                <div style="padding:20px;overflow-y:auto;flex:1;">
                  <div style="margin-bottom:16px;font-size:13px;color:#334155;">
                    <strong>対象日:</strong> ${targetDate}
                  </div>
                  ${adminNote ? `<div style="margin-bottom:16px;padding:10px 12px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;"><strong>差戻し理由:</strong><br>${esc(adminNote)}</div>` : ''}
                  
                  <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">修正(出勤)</div>
                    <input type="datetime-local" id="fixIn" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;" value="${cin}">
                  </div>
                  <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">修正(退勤)</div>
                    <input type="datetime-local" id="fixOut" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;" value="${cout}">
                  </div>
                  <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">理由 <span style="color:#ef4444">*</span></div>
                    <input type="text" id="fixReason" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;" value="${esc(reason)}" placeholder="理由を入力してください">
                  </div>
                  <div id="fixError" style="color:#dc2626;font-size:13px;font-weight:600;margin-top:8px;display:none;"></div>
                </div>
                <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:12px;justify-content:flex-end;">
                  <button type="button" class="btn-cancel-modal" style="padding:8px 16px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:600;cursor:pointer;">キャンセル</button>
                  <button type="button" id="btnFixSubmit" style="padding:8px 16px;border-radius:6px;border:none;background:#005eb8;color:#fff;font-weight:600;cursor:pointer;">再提出する</button>
                </div>
              </div>
            `;

            const close = () => {
              try { document.body.removeChild(modal); } catch(e){}
            };

            modal.querySelector('.btn-close-modal').addEventListener('click', close);
            modal.querySelector('.btn-cancel-modal').addEventListener('click', close);
            modal.addEventListener('click', (e) => { if(e.target === modal) close(); });

            const btnSubmit = modal.querySelector('#btnFixSubmit');
            btnSubmit.addEventListener('click', async () => {
              const errEl = modal.querySelector('#fixError');
              errEl.style.display = 'none';

              const newIn = toMySQLDateTime(modal.querySelector('#fixIn').value);
              const newOut = toMySQLDateTime(modal.querySelector('#fixOut').value);
              const newReason = modal.querySelector('#fixReason').value.trim();

              if (!newReason) {
                errEl.textContent = '理由を入力してください';
                errEl.style.display = 'block';
                return;
              }

              btnSubmit.disabled = true;
              btnSubmit.textContent = '送信中...';

              try {
                await fetchJSONAuth('/api/adjust/' + id, {
                  method: 'PATCH',
                  body: JSON.stringify({ requestedCheckIn: newIn, requestedCheckOut: newOut, reason: newReason })
                });
                delete adjustChatCache[id];
                close();
                await renderList();
              } catch (err) {
                errEl.textContent = err?.message || '更新に失敗しました';
                errEl.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.textContent = '再提出する';
              }
            });

            document.body.appendChild(modal);
          });
        });
      } else {
        actionHost.innerHTML = '';
      }
    }

    const monthInput = document.getElementById('adjustMonthFilter');
    if (monthInput && monthInput.value && monthInput.value !== selectedMonth) {
      selectedMonth = monthInput.value;
      currentPage = 1;
    }

    // Lọc dữ liệu theo tháng được chọn
    const filteredRows = rows.filter(r => {
      const created = r.created_at ? String(r.created_at).slice(0, 7) : '';
      return created === selectedMonth;
    });

    const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pagedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (!Array.isArray(pagedRows) || pagedRows.length === 0) {
      host.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>申請はありません</div></div>';
      return;
    }

    const tr = pagedRows.map((r) => {
      const cin  = String(r.requestedCheckIn  || '').slice(0, 16).replace('T', ' ');
      const cout = String(r.requestedCheckOut || '').slice(0, 16).replace('T', ' ');
      const st = String(r.status || 'pending');
      let stLabel, stClass;
      if (st === 'approved') { stLabel = '承認済み'; stClass = 'adj-status-approved'; }
      else if (st === 'rejected') { stLabel = '却下'; stClass = 'adj-status-rejected'; }
      else { stLabel = '承認待ち'; stClass = 'adj-status-pending'; }
      const created = r.created_at ? String(r.created_at).slice(0, 16).replace('T', ' ') : '—';
      const appNo = `R-${String(r.id).padStart(7, '0')}`;
      const detail = `
        <div style="white-space:pre-wrap;word-break:break-word;">${esc(r.reason || '')}</div>
        ${r.admin_note ? `<div style="margin-top:6px;padding:6px 8px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;"><strong>差戻し理由:</strong> ${esc(r.admin_note)}</div>` : ''}
      `;
      const type = '打刻修正（申請）';
      const editBtn = (st === 'pending' || st === 'rejected')
        ? `<button class="btn-edit sap-action-btn" data-id="${r.id}" data-in="${cin}" data-out="${cout}" data-reason="${esc(r.reason || '')}" data-adminnote="${esc(r.admin_note || '')}" title="${st === 'rejected' ? '再申請' : '編集'}"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>`
        : '';
      const deleteBtn = st === 'pending'
        ? ` <button class="btn-delete sap-action-btn delete" data-id="${r.id}" title="削除"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`
        : '';
      const chatBtn = ` <button class="btn-chat sap-action-btn" data-id="${r.id}" title="やり取り"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg></button>`;
      const actions = `${editBtn}${chatBtn}${deleteBtn}`.trim();
      const rowHtml = `<tr data-record-row="1" data-record-id="${r.id}">
        <td data-label="申請番号"><div class="mobile-td-content"><a href="#" data-jump="${r.id}" style="color:#005eb8; text-decoration:none; font-weight:600;">${appNo}</a></div></td>
        <td data-label="ステータス"><div class="mobile-td-content"><span class="sap-badge ${stClass}">${esc(stLabel)}</span></div></td>
        <td data-label="レコードタイプ"><div class="mobile-td-content">${type}</div></td>
        <td data-label="申請詳細"><div class="mobile-td-content">${detail}</div></td>
        <td data-label="作成日時"><div class="mobile-td-content">${created}</div></td>
        <td data-label="アクション"><div class="mobile-td-content">${actions}</div></td>
      </tr>`;
      return rowHtml;
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
          .sap-table-wrap { border: 1px solid #cbd5e1; overflow-x: auto; -webkit-overflow-scrolling: touch; background: #fff; }
          .sap-compact-table { width: 100%; border-collapse: collapse; min-width: 600px; font-family: sans-serif; table-layout: fixed; }
          .sap-compact-table th, .sap-compact-table td { border: 1px solid #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sap-compact-table th { background: #e0f2fe; padding: 6px 8px; font-size: 11px; font-weight: 700; color: #1e293b; text-align: center; white-space: nowrap; }
          .sap-compact-table td { padding: 6px 8px; font-size: 12px; color: #1e293b; vertical-align: middle; text-align: center; }
          .sap-compact-table td:nth-child(4) { text-align: left; } /* 申請詳細 align left */
          
          /* Điều chỉnh độ rộng các cột cố định */
          .sap-compact-table th:nth-child(1) { width: 100px; } /* 申請番号 */
          .sap-compact-table th:nth-child(2) { width: 90px; }  /* ステータス */
          .sap-compact-table th:nth-child(3) { width: 130px; } /* レコードタイプ */
          .sap-compact-table th:nth-child(4) { width: 150px; } /* 申請詳細 */
          .sap-compact-table th:nth-child(5) { width: 130px; } /* 作成日時 */
          .sap-compact-table th:nth-child(6) { width: 100px; } /* アクション */

          .sap-compact-table tr:hover { background: #f1f5f9; }
          .sap-badge { display: inline-block; padding: 2px 6px; border-radius: 2px; font-size: 11px; font-weight: 600; white-space: nowrap; }
          .sap-badge.approved { background: #dcfce7; color: #166534; }
          .sap-badge.rejected { background: #fee2e2; color: #991b1b; }
          .sap-badge.pending { background: #f1f5f9; color: #475569; }
          .sap-action-btn { background: transparent; border: 1px solid transparent; color: #005eb8; padding: 4px; font-size: 12px; cursor: pointer; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; }
          .sap-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
          .sap-action-btn.delete { color: #ef4444; }
          .sap-action-btn.btn-chat { color: #6366f1; }

          /* Mobile Inline Edit Form Styles */
          .inline-edit-container {
            padding: 12px; 
            background: #f8fafc; 
            border: 2px solid #005eb8; 
            position: relative; 
            width: 100%; 
            box-sizing: border-box;
            box-shadow: inset 0 0 0 1px #fff;
          }
          /* Sticky Left Behavior for small screens (khi bảng bị cuộn) */
          @media (max-width: 768px) {
            .inline-edit-container {
              position: sticky;
              left: 0;
              width: calc(100vw - 24px); /* Độ rộng bằng màn hình trừ đi padding của drawer */
            }
          }
          /* Media query cho tab trên mobile */
          @media (max-width: 768px) {
            .sap-table-wrap {
              border: none;
              background: transparent;
            }
            .sap-compact-table {
              display: block;
              width: 100%;
              min-width: 0; /* Ghi đè min-width 600px của desktop */
              table-layout: auto;
            }
            .sap-compact-table tbody {
              display: block;
              width: 100%;
            }
            .sap-compact-table tr {
              display: block;
              width: 100%;
              margin-bottom: 16px;
              background: #fff;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
              box-sizing: border-box;
            }
            .sap-compact-table td {
              display: flex;
              flex-direction: row; /* Thay đổi từ column sang row để chia hai bên */
              justify-content: space-between; /* Đẩy 2 bên xa nhau */
              align-items: center; /* Căn giữa theo chiều dọc */
              text-align: right; /* Mặc định nội dung sẽ dồn sang phải */
              border: none;
              border-bottom: 1px solid #f1f5f9;
              padding: 10px 12px;
              white-space: normal;
              min-height: auto;
              width: 100%; /* Ép chiếm 100% width của thẻ cha */
              box-sizing: border-box; /* Tính cả padding vào width */
            }
            .sap-compact-table thead {
              display: none; /* Ẩn phần header của bảng */
            }
            .sap-compact-table tr:hover { background: #fff; }
            .sap-compact-table td:last-child {
              border-bottom: none;
            }
            .sap-compact-table td::before {
              content: attr(data-label);
              font-weight: 600;
              color: #64748b;
              text-align: left; /* Nhãn căn trái */
              font-size: 11px;
              flex-shrink: 0;
              margin-bottom: 0; 
              margin-right: 12px; /* Tạo khoảng cách với nội dung bên phải */
              width: auto; /* Nhãn tự co giãn */
              display: block; 
            }
            .mobile-td-content {
              flex: 1;
              text-align: right; 
              display: flex;
              justify-content: flex-end; /* Nội dung căn phải */
              align-items: center;
              word-break: break-word;
              font-size: 13px;
              font-weight: 500;
              width: auto; 
            }
            
            /* Sửa lại form inline edit cho mobile (nếu có) để không bị lỗi layout */
            .sap-compact-table tr.inline-edit-row {
               padding: 0;
            }
            .sap-compact-table tr.inline-edit-row td {
               display: block;
               padding: 0;
               border: none;
            }
            .sap-compact-table tr.inline-edit-row td::before {
               content: none;
            }

            .sap-tabs-container {
              gap: 8px; /* Thu hẹp khoảng cách giữa các tab */
              justify-content: flex-start; /* Căn trái để không bị đè */
              overflow-x: auto; /* Cho phép cuộn ngang nếu thiếu chỗ */
              -webkit-overflow-scrolling: touch;
              padding-bottom: 4px;
              flex-wrap: wrap; /* Cho phép rớt dòng trên mobile */
            }
            .sap-tab {
              padding: 8px 4px;
              font-size: 11px; /* Chữ nhỏ lại một chút */
              white-space: nowrap; /* Không cho rớt dòng trong từng tab */
            }
            .sap-tab svg {
              width: 14px; /* Icon nhỏ lại */
              height: 14px;
            }
            .sap-badge.notification {
              padding: 0 4px;
              font-size: 9px;
            }
            .adjust-search-bar {
              margin-left: 0;
              margin-top: 8px;
              width: 100%;
            }
            .sap-table-input[type="month"] {
              width: 120px; /* Thu gọn tối đa kích thước */
              padding: 4px 6px; /* Giảm padding để nhỏ gọn hơn */
              font-size: 11px; /* Thu nhỏ chữ */
              height: 28px; /* Giảm chiều cao */
              margin-top: 4px; /* Thêm khoảng cách phía trên khi rớt dòng */
            }
          }
        </style>

        <div id="sapHistoryBlock" class="sap-history-block" style="display: none;">
            <div class="sap-history-body">
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
              ${totalPages > 1 ? `
                <div style="display:flex;justify-content:center;align-items:center;padding:16px 0;gap:12px;">
                  <button id="btnAdjustPagePrev" class="sap-btn" ${currentPage === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>前へ</button>
                  <span style="font-size:13px;color:#475569;">${currentPage} / ${totalPages} ページ</span>
                  <button id="btnAdjustPageNext" class="sap-btn" ${currentPage === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>次へ</button>
                </div>
              ` : ''}
              </div>
            </div>
        </div>
      `;
    // Logic xử lý khi click vào nút chỉnh sửa trên hàng (inline edit)
    const handleInlineEdit = (e) => {
      const btn = e.target.closest('.btn-edit');
      if (!btn) return;
      const tr = btn.closest('tr');
      if (!tr) return;
      const recId = btn.getAttribute('data-id');
      if (!recId) return;

      // Đóng các form sửa inline khác đang mở
      document.querySelectorAll('.inline-edit-row').forEach(el => el.remove());
      document.querySelectorAll('tr[data-hidden="1"]').forEach(el => {
        el.style.display = '';
        delete el.dataset.hidden;
      });

      const cin = btn.getAttribute('data-in') || '';
      const cout = btn.getAttribute('data-out') || '';
      const reason = btn.getAttribute('data-reason') || '';
      const adminNote = btn.getAttribute('data-adminnote') || '';

      // Ẩn dòng hiện tại
      tr.style.display = 'none';
      tr.dataset.hidden = '1';

      // Tạo một hàng mới ngay dưới hàng được click
      const editTr = document.createElement('tr');
      editTr.className = 'inline-edit-row';
      editTr.innerHTML = `
        <td colspan="6" style="padding: 0; border: none; background: #fff;">
          <div class="inline-edit-container">
            <button type="button" class="btn-close-inline-edit" style="position:absolute; top:8px; right:8px; background:none; border:none; font-size:16px; color:#64748b; cursor:pointer; padding:4px; line-height:1;" title="閉じる">&times;</button>
            <div style="font-weight: 700; color: #005eb8; margin-bottom: 12px; font-size: 13px; text-align: center;">${String(btn.title || '') === '再申請' ? '差戻しされた申請を修正して再申請' : '申請の編集'}</div>
            ${adminNote ? `<div style="margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 12px;"><strong>差戻し理由:</strong> ${esc(adminNote)}</div>` : ''}
            <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; justify-content:center;">
              <div style="flex:1; min-width:180px; max-width:200px;">
                <div style="font-size:11px; font-weight:600; color:#475569; margin-bottom:4px; text-align: center;">修正(出勤)</div>
                <input type="datetime-local" class="sap-input full edit-in" value="${cin.replace(' ', 'T')}" style="height: 32px; font-size: 13px;">
              </div>
              <div style="flex:1; min-width:180px; max-width:200px;">
                <div style="font-size:11px; font-weight:600; color:#475569; margin-bottom:4px; text-align: center;">修正(退勤)</div>
                <input type="datetime-local" class="sap-input full edit-out" value="${cout.replace(' ', 'T')}" style="height: 32px; font-size: 13px;">
              </div>
              <div style="flex:2; min-width:250px;">
                <div style="font-size:11px; font-weight:600; color:#475569; margin-bottom:4px; text-align: center;">理由 <span style="color:#ef4444">*</span></div>
                <input type="text" class="sap-input full edit-reason" value="${esc(reason)}" placeholder="理由を入力してください" style="height: 32px; font-size: 13px;">
              </div>
              <div style="display:flex; gap:8px;">
                <button type="button" class="btn-cancel-inline-edit" style="height:32px; padding:0 12px; border:1px solid #cbd5e1; background:#fff; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; color:#475569;">キャンセル</button>
                <button type="button" class="btn-save-inline-edit" data-id="${recId}" style="height:32px; padding:0 16px; border:none; background:#005eb8; color:#fff; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer;">保存</button>
              </div>
            </div>
            <div class="edit-error" style="color:#ef4444; font-size:12px; font-weight:600; margin-top:8px; display:none; text-align: center;"></div>
          </div>
        </td>
      `;

      tr.after(editTr);

      // Gắn sự kiện cho form
      const closeBtn = editTr.querySelector('.btn-close-inline-edit');
      const cancelBtn = editTr.querySelector('.btn-cancel-inline-edit');
      const saveBtn = editTr.querySelector('.btn-save-inline-edit');

      const closeForm = (ev) => {
        if(ev) ev.preventDefault();
        editTr.remove();
        tr.style.display = '';
        delete tr.dataset.hidden;
      };

      closeBtn.addEventListener('click', closeForm);
      cancelBtn.addEventListener('click', closeForm);

      saveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const errEl = editTr.querySelector('.edit-error');
        errEl.style.display = 'none';

        const newIn = toMySQLDateTime(editTr.querySelector('.edit-in').value);
        const newOut = toMySQLDateTime(editTr.querySelector('.edit-out').value);
        const newReason = editTr.querySelector('.edit-reason').value.trim();

        if (!newReason) {
          errEl.textContent = '理由を入力してください';
          errEl.style.display = 'block';
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';

        try {
          await fetchJSONAuth(`/api/adjust/${recId}`, {
            method: 'PATCH',
            body: JSON.stringify({ requestedCheckIn: newIn, requestedCheckOut: newOut, reason: newReason })
          });
          delete adjustChatCache[recId];
          await renderList(); // Reload danh sách
        } catch (err) {
          errEl.textContent = err?.message || '保存に失敗しました';
          errEl.style.display = 'block';
          saveBtn.disabled = false;
          saveBtn.textContent = '保存';
        }
      });
    };

    // Xóa sự kiện lắng nghe trực tiếp trên `host` để tránh trùng lặp khi đã gắn vào từng nút
    // host.addEventListener('click', handleInlineEdit);

    const deleteHandler = async (e) => {
      const btn = e.target.closest('.btn-delete');
      if (!btn) return;
      const recId = btn.getAttribute('data-id');
      if (!recId) return;
      if (!confirm('この申請を削除しますか？')) return;
      btn.disabled = true;
      try {
        await fetchJSONAuth(`/api/adjust/${recId}`, { method: 'DELETE' });
        await renderList();
      } catch (err) {
        showErr(err?.message || '削除に失敗しました');
        btn.disabled = false;
      }
    };
    // host.addEventListener('click', deleteHandler);

    const chatHandler = async (e) => {
      const btn = e.target.closest('.btn-chat');
      if (!btn) return;
      const recId = btn.getAttribute('data-id');
      if (!recId) return;
      openAdjustChatId = recId;
      openAdjustChatModal(recId);
    };
    // host.addEventListener('click', chatHandler);
      
    // Fix: Remove document.querySelectorAll re-bindings to prevent duplicate events
    // and just use event delegation on the host container which is much safer and cleaner.
    host.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit')) {
        handleInlineEdit(e);
      } else if (e.target.closest('.btn-delete')) {
        deleteHandler(e);
      } else if (e.target.closest('.btn-chat')) {
        chatHandler(e);
      }
    });

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
