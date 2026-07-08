// admin-attendance-adjust-requests.page.js
import { fetchJSONAuth } from '../../api/http.api.js';

let localHost = null;
const nowDate = new Date();
let currentMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
let allRows = [];
let currentPage = 1;
const itemsPerPage = 15;
let openChatRequestId = null;
const chatCache = Object.create(null);
const chatLoading = Object.create(null);
const chatErrors = Object.create(null);

export async function mount({ content }) {
  localHost = content;
  localHost.style.visibility = '';

  if (localHost.parentElement) {
    localHost.parentElement.style.padding = '0';
  }

  const params = new URLSearchParams(window.location.search);
  const isStandalone = params.get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100dvh - var(--topbar-height) - var(--subbar-height))';

  localHost.className = (localHost.className || '') + ' adjust-page-content';
  localHost.style.cssText = `margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; background: #FFFFFF; flex: 1; min-width: 0;`;

  // Handle resize to show/hide mobile date picker dynamically
  window.addEventListener('resize', () => {
    if (localHost && document.getElementById('btnMonthPrev')) {
      handleMobileHeader();
    }
  });

  const isAdmin = await checkAdminAuth();
  if (isAdmin) await renderList();
}

function handleMobileHeader() {
  const mobileActions = document.getElementById('attHubMobileActions');
  if (window.innerWidth <= 768 && mobileActions) {
    let mobileNav = document.getElementById('adjustMonthNavMobile');
    if (!mobileNav) {
      mobileNav = document.createElement('div');
      mobileNav.id = 'adjustMonthNavMobile';
      mobileNav.style.cssText = 'display:flex; align-items:center; gap:4px;';
      
      const prevBtn = document.createElement('button');
      prevBtn.innerHTML = '&#8249;';
      prevBtn.style.cssText = 'background:transparent; border:none; padding:4px 8px; font-size:18px; color:#0a6ed1; cursor:pointer;';
      prevBtn.onclick = () => { currentMonth = shiftMonth(currentMonth, -1); currentPage = 1; renderTable(); };
      
      const nextBtn = document.createElement('button');
      nextBtn.innerHTML = '&#8250;';
      nextBtn.style.cssText = 'background:transparent; border:none; padding:4px 8px; font-size:18px; color:#0a6ed1; cursor:pointer;';
      nextBtn.onclick = () => { currentMonth = shiftMonth(currentMonth, 1); currentPage = 1; renderTable(); };
      
      const label = document.createElement('span');
      label.id = 'adjustMonthLabelMobile';
      label.style.cssText = 'font-weight:600; font-size:14px; color:#1e293b; min-width:60px; text-align:center;';
      
      mobileNav.appendChild(prevBtn);
      mobileNav.appendChild(label);
      mobileNav.appendChild(nextBtn);
      
      mobileActions.innerHTML = '';
      mobileActions.appendChild(mobileNav);
    }
    document.getElementById('adjustMonthLabelMobile').textContent = fmtMonthLabel(currentMonth);
  } else if (mobileActions) {
    mobileActions.innerHTML = '';
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDateTime(val) {
  if (!val) return '—';
  const s = String(val).slice(0, 16).replace('T', ' ');
  const [date, time] = s.split(' ');
  if (!date) return '—';
  return `<span class="dt-date" style="display:inline-block; margin-right:8px; color:#475569;">${date}</span><span class="dt-time" style="color:#0f172a; font-weight:bold; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${time || ''}</span>`;
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${y}年${m}月`;
}

function fmtChatDate(val) {
  if (!val) return '';
  return String(val).slice(0, 16).replace('T', ' ');
}

function actionButtonHtml(kind, id, title) {
  const icons = {
    approve: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    reject: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    chat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 1 1 18-4Z"/></svg>',
    delete: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
  };
  return `<button class="adj-action-btn ${kind === 'delete' ? 'danger' : kind}" data-id="${id}" title="${esc(title)}" aria-label="${esc(title)}" type="button">${icons[kind] || ''}</button>`;
}

async function checkAdminAuth() {
  try {
    const profile = await fetchJSONAuth('/api/auth/me');
    const role = String(profile?.role || '').toLowerCase();
    if (!profile || (role !== 'admin' && role !== 'manager')) {
      window.location.replace('/ui/login');
      return false;
    }
    const nameEl = document.querySelector('#userName');
    if (nameEl) nameEl.textContent = profile.username || profile.email || 'User';
    return true;
  } catch {
    window.location.replace('/ui/login');
    return false;
  }
}

async function loadMessages(id, cb) {
  chatLoading[id] = true;
  delete chatErrors[id];
  if (cb) cb(); else renderTable();
  try {
    const rows = await fetchJSONAuth(`/api/adjust/${id}/messages`);
    chatCache[id] = Array.isArray(rows) ? rows : [];
  } catch (e) {
    chatErrors[id] = e?.message || 'unknown';
    chatCache[id] = [];
    throw e;
  } finally {
    delete chatLoading[id];
    if (cb) cb(); else if (String(openChatRequestId) === String(id)) renderTable();
  }
}

async function postMessage(id, message) {
  await fetchJSONAuth(`/api/adjust/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  await loadMessages(id);
}

async function updateRequestStatus(id, status, adminNote = '') {
  try {
    await fetchJSONAuth(`/api/adjust/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote })
    });
    const row = allRows.find((r) => String(r.id) === String(id));
    if (row) {
      row.status = status;
      row.admin_note = status === 'rejected' ? adminNote : null;
    }
    delete chatCache[id];
    if (String(openChatRequestId) === String(id)) await loadMessages(id);
    renderTable();
    return true;
  } catch (e) {
    alert('ステータス更新に失敗しました: ' + (e?.message || 'unknown'));
    return false;
  }
}

function openRejectModal(id) {
  const row = allRows.find((it) => String(it.id) === String(id));
  const userLabel = row ? esc(row.username || row.email || row.userId || '—') : '—';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.48);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="width:100%;max-width:560px;background:#fff;border-radius:12px;box-shadow:0 20px 45px rgba(15,23,42,0.25);overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;">差戻し理由を入力</div>
      <div style="padding:16px 20px;">
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">対象ユーザー: ${userLabel}</div>
        <textarea id="rejectReasonInput" style="width:100%;min-height:140px;resize:vertical;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;box-sizing:border-box;font:inherit;" placeholder="例: 出勤時刻の根拠が不足しています。正しい時刻と補足を追記して再申請してください。">${esc(row?.admin_note || '')}</textarea>
        <div id="rejectReasonError" style="display:none;color:#b91c1c;font-size:12px;margin-top:8px;"></div>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;background:#f8fafc;">
        <button type="button" id="btnRejectCancel" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#334155;cursor:pointer;">キャンセル</button>
        <button type="button" id="btnRejectSave" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid #f59e0b;background:#f59e0b;color:#fff;cursor:pointer;font-weight:600;">差戻しする</button>
      </div>
    </div>
  `;

  const close = () => {
    try { document.body.removeChild(modal); } catch (e) { /* silently ignored */ }
  };

  document.body.appendChild(modal);
  modal.querySelector('#btnRejectCancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  modal.querySelector('#rejectReasonInput')?.focus();

  modal.querySelector('#btnRejectSave')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const input = modal.querySelector('#rejectReasonInput');
    const err = modal.querySelector('#rejectReasonError');
    const reason = String(input?.value || '').trim();
    if (!reason) {
      if (err) {
        err.textContent = '差戻し理由を入力してください。';
        err.style.display = 'block';
      }
      input?.focus();
      return;
    }
    btn.disabled = true;
    btn.textContent = '送信中...';
    const ok = await updateRequestStatus(id, 'rejected', reason);
    if (ok) close();
    else {
      btn.disabled = false;
      btn.textContent = '差戻しする';
    }
  });
}

function openChatModal(id) {
  const row = allRows.find((it) => String(it.id) === String(id));
  if (!row) return;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.48);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  
  const renderBody = () => {
    const messages = Array.isArray(chatCache[id]) ? chatCache[id] : [];
    const loading = !!chatLoading[id];
    const error = String(chatErrors[id] || '').trim();
    const intro = row.admin_note
      ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;"><strong>差戻し理由:</strong> ${esc(row.admin_note)}</div>`
      : '';
    const errorHtml = error
      ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;">やり取りの読み込みに失敗しました: ${esc(error)}</div>`
      : '';
    const bodyHtml = loading
      ? '<div style="color:#64748b;font-size:12px;">読み込み中...</div>'
      : (messages.length
          ? messages.map((msg) => {
              const mine = String(msg.sender_user_id) !== String(row.userId);
              const bubbleBg = mine ? '#dbeafe' : '#f8fafc';
              const align = mine ? 'flex-end' : 'flex-start';
              const sender = esc(msg.sender_name || (mine ? '管理者' : '社員'));
              return `
                <div style="display:flex;justify-content:${align};margin-bottom:8px;">
                  <div style="max-width:85%;background:${bubbleBg};border:1px solid #dbeafe;border-radius:12px;padding:8px 10px;">
                    <div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:4px;">${sender}</div>
                    <div style="font-size:12px;color:#0f172a;white-space:pre-wrap;word-break:break-word;">${esc(msg.message || '')}</div>
                    <div style="font-size:10px;color:#64748b;margin-top:4px;">${esc(fmtChatDate(msg.created_at))}</div>
                  </div>
                </div>
              `;
            }).join('')
          : '<div style="color:#64748b;font-size:12px;">まだやり取りはありません。</div>');

    return `
      <div style="width:100%;max-width:560px;background:#fff;border-radius:12px;box-shadow:0 20px 45px rgba(15,23,42,0.25);overflow:hidden;display:flex;flex-direction:column;max-height:85vh;">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:700;color:#0f172a;font-size:15px;">やり取り - ${esc(row.username || row.email || row.userId || '—')}</div>
          <button type="button" id="btnChatClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;padding:0;line-height:1;">&times;</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1;background:#f8fafc;">
          ${intro}
          ${errorHtml}
          ${bodyHtml}
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:8px;align-items:flex-end;">
          <textarea id="chatInputText" placeholder="メッセージを入力..." style="flex:1;min-height:72px;resize:vertical;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;box-sizing:border-box;font:inherit;"></textarea>
          <button id="btnChatSend" type="button" style="height:36px;padding:0 14px;border-radius:8px;border:1px solid #005eb8;background:#005eb8;color:#fff;cursor:pointer;font-weight:600;">送信</button>
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
    openChatRequestId = null;
  };

  const bindEvents = () => {
    modal.querySelector('#btnChatClose')?.addEventListener('click', close);
    modal.querySelector('#btnChatSend')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const input = modal.querySelector('#chatInputText');
      const text = String(input?.value || '').trim();
      if (!text) {
        input?.focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = '送信中...';
      try {
        await fetchJSONAuth(`/api/adjust/${id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        await loadMessages(id, updateModalBody);
      } catch (err) {
        chatErrors[id] = err?.message || 'unknown';
        updateModalBody();
      }
    });
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.body.appendChild(modal);
  updateModalBody();

  if (!chatCache[id]) {
    loadMessages(id, updateModalBody);
  }
}

function attachButtonListeners() {
  localHost.querySelectorAll('.adj-action-btn.approve').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('この申請を承認しますか？')) updateRequestStatus(id, 'approved');
    });
  });

  localHost.querySelectorAll('.adj-action-btn.reject').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      openRejectModal(e.currentTarget.dataset.id);
    });
  });

  localHost.querySelectorAll('.adj-action-btn.chat').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      openChatRequestId = id;
      openChatModal(id);
    });
  });

  localHost.querySelectorAll('.adj-action-btn.danger').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('この申請を削除しますか？この操作は取り消せません。')) return;
      try {
        await fetchJSONAuth(`/api/adjust/${id}`, { method: 'DELETE' });
        allRows = allRows.filter((r) => String(r.id) !== String(id));
        if (String(openChatRequestId) === String(id)) openChatRequestId = null;
        delete chatCache[id];
        renderTable();
      } catch (err) {
        alert('削除に失敗しました: ' + (err?.message || 'unknown'));
      }
    });
  });

  const btnPrev = localHost.querySelector('#btnMonthPrev');
  const btnNext = localHost.querySelector('#btnMonthNext');
  const btnNow = localHost.querySelector('#btnMonthNow');
  const btnPagePrev = localHost.querySelector('#btnPagePrev');
  const btnPageNext = localHost.querySelector('#btnPageNext');

  if (btnPrev) btnPrev.onclick = () => { currentMonth = shiftMonth(currentMonth, -1); currentPage = 1; renderTable(); };
  if (btnNext) btnNext.onclick = () => { currentMonth = shiftMonth(currentMonth, 1); currentPage = 1; renderTable(); };
  if (btnNow) btnNow.onclick = () => {
    const n = new Date();
    currentMonth = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    currentPage = 1;
    renderTable();
  };

  if (btnPagePrev) btnPagePrev.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
  if (btnPageNext) btnPageNext.onclick = () => { currentPage++; renderTable(); };
}

function renderTable() {
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100dvh - var(--topbar-height) - var(--subbar-height))';

  const filtered = allRows.filter((r) => {
    const ym = r.created_at ? String(r.created_at).slice(0, 7) : '';
    return ym === currentMonth;
  });

  const pendingCount = filtered.filter((r) => r.status === 'pending').length;
  const isCurrentMonth = currentMonth === `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const pagedRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tbody = pagedRows.map((r) => {
        const user = esc(r.username || r.email || r.userId || '—');
        const created = fmtDateTime(r.created_at);
        const cin = fmtDateTime(r.requestedCheckIn);
        const cout = fmtDateTime(r.requestedCheckOut);
        const st = String(r.status || 'pending');
        const reasonHtml = `
          <div style="white-space:pre-wrap;word-break:break-word;">${esc(r.reason || '')}</div>
          ${r.admin_note ? `<div style="margin-top:6px;font-size:12px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 8px;"><strong>差戻し理由:</strong> ${esc(r.admin_note)}</div>` : ''}
        `;
        let stLabel = '却下';
        let stClass = 'adj-status-rejected';
        let actionCell = `
          ${actionButtonHtml('chat', r.id, 'やり取り')}
          ${actionButtonHtml('delete', r.id, '削除')}
        `;
        if (st === 'pending') {
          stLabel = '確認待ち';
          stClass = 'adj-status-pending';
          actionCell = `
            ${actionButtonHtml('approve', r.id, '承認')}
            ${actionButtonHtml('reject', r.id, '却下')}
            ${actionButtonHtml('chat', r.id, 'やり取り')}
            ${actionButtonHtml('delete', r.id, '削除')}
          `;
        } else if (st === 'approved') {
          stLabel = '承認済み';
          stClass = 'adj-status-approved';
        }

        const rowHtml = `
          <tr class="adj-desktop-row">
            <td style="font-weight:500;">${user}</td>
            <td style="font-family:monospace;">${created}</td>
            <td style="font-family:monospace;">${cin}</td>
            <td style="font-family:monospace;">${cout}</td>
            <td>${reasonHtml}</td>
            <td><span class="${stClass}">${stLabel}</span></td>
            <td style="white-space:nowrap;text-align:right;">${actionCell}</td>
          </tr>
          <tr class="adj-mobile-row">
            <td colspan="7" class="adj-mobile-cell">
              <div class="adj-card">
                <div class="adj-card-header">
                  <div class="adj-card-user">${user}</div>
                  <span class="${stClass}">${stLabel}</span>
                </div>
                <div class="adj-card-body">
                  <div class="adj-card-row">
                    <span class="adj-card-label">作成</span>
                    <span class="adj-card-value">${created}</span>
                  </div>
                  <div class="adj-card-row">
                    <span class="adj-card-label">修正(出勤)</span>
                    <span class="adj-card-value">${cin}</span>
                  </div>
                  <div class="adj-card-row">
                    <span class="adj-card-label">修正(退勤)</span>
                    <span class="adj-card-value">${cout}</span>
                  </div>
                  <div class="adj-card-reason">
                    <div class="adj-card-label" style="margin-bottom:4px;">理由 / 差戻し内容</div>
                    <div class="adj-card-reason-content">${reasonHtml}</div>
                  </div>
                </div>
                <div class="adj-card-actions">
                  ${actionCell}
                </div>
              </div>
            </td>
          </tr>
        `;
        return rowHtml;
      }).join('');

  localHost.innerHTML = `
    <style>
      .adjust-page-content { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .adj-table-card { flex: 1 1 0%; min-height: 0; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      
      .sap-card { background:#ffffff; border:none; box-shadow:none; margin:0; display:flex; flex-direction:column; overflow:hidden; flex: 1; min-height: 0; }
      .adj-table { width:100%; border-collapse:collapse; font-size:13px; table-layout:auto; font-family:"72","72full",Arial,Helvetica,sans-serif; }
      .adj-table th { background-color:#f8fafc; color:#475569; padding:8px 16px; font-size:12px; font-weight:600; text-align:left; border-bottom:1px solid #e2e8f0; border: 1px solid #e2e8f0; }
      .adj-table td { padding:8px 16px; vertical-align:middle; border-bottom:1px solid #f1f5f9; color:#0f172a; border: 1px solid #e2e8f0; }
      .adj-table tbody tr:hover td { background-color:#f8fafc; }
      
      .adj-table th { background-color: #e6f2ff !important; color: #0f172a !important; font-weight: 600 !important; border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; text-align: center !important; white-space: nowrap; }
      .adj-table td { border: 1px solid #cbd5e1 !important; padding: 6px 8px !important; }
      
      .adj-month-nav { display:flex; align-items:center; padding:16px 24px; justify-content:space-between; flex-shrink:0; background:#ffffff; border-bottom:1px solid #e5e5e5; }
      .adj-month-nav-right { display:flex; align-items:center; gap:8px; }
      .adj-month-btn { background:transparent; border:1px solid #cbd5e1; border-radius:4px; padding:4px 12px; cursor:pointer; color:#475569; font-weight:500; height:32px; transition:background 0.2s; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
      .adj-month-btn:hover:not([disabled]) { background:#f1f5f9; }
      .adj-month-btn[disabled] { color:#94a3b8; cursor:not-allowed; background:#f8fafc; border-color:#e2e8f0; }
      .adj-month-label { font-weight:600; margin:0 8px; font-size:15px; color:#1e293b; }
      .adj-pending-badge { background:#ef4444; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:12px; font-weight:bold; }
      .adj-table-card { margin:0; padding: 16px 24px; }
      .adj-status-pending, .adj-status-approved, .adj-status-rejected { display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; border-width:1px; border-style:solid; }
      .adj-status-pending { background:#fff7ed; color:#ea580c; border-color:#fdba74; }
      .adj-status-approved { background:#f0fdf4; color:#16a34a; border-color:#bbf7d0; }
      .adj-status-rejected { background:#fef2f2; color:#dc2626; border-color:#fecaca; }
      .adj-action-btn { width:32px; height:32px; border-radius:4px; border:1px solid #cbd5e1; background:#fff; color:#475569; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; margin:0 2px; transition:background 0.2s; }
      .adj-action-btn:hover { background:#f1f5f9; }
      .adj-action-btn.danger { color:#dc2626; border-color:#fecaca; background:#fef2f2; }
      .adj-action-btn.danger:hover { background:#fee2e2; }
      .adj-action-btn.approve { color:#16a34a; border-color:#bbf7d0; background:#f0fdf4; }
      .adj-action-btn.approve:hover { background:#dcfce7; }
      .adj-action-btn.reject { color:#ea580c; border-color:#fdba74; background:#fff7ed; }
      .adj-action-btn.reject:hover { background:#ffedd5; }
      
      .adj-mobile-row { display: none; }
      
      @media (max-width: 768px) {
        .adjust-page-content { flex: 1 1 0% !important; min-height: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }
        .adj-table-card { flex: 1 1 0% !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; padding: 12px !important; }
        #adminContent.card { padding: 0 !important; border: none !important; box-shadow: none !important; background: transparent !important; }
        
        .adj-month-nav { display: none !important; }
        
        .adj-table { border: none !important; }
        .adj-table thead { display: none; }
        .adj-desktop-row { display: none; }
        .adj-mobile-row { display: table-row; }
        
        .adj-mobile-cell { padding: 0 !important; border: none !important; background: transparent !important; }
        .adj-mobile-cell:hover { background: transparent !important; }
        
        .adj-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden; }
        .adj-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
        .adj-card-user { font-weight: 700; font-size: 15px; color: #0f172a; }
        
        .adj-card-body { padding: 12px 16px; }
        .adj-card-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; }
        .adj-card-label { color: #64748b; width: 80px; flex-shrink: 0; font-weight: 500; }
        .adj-card-value { color: #1e293b; font-family: monospace; font-size: 14px; }
        
        .adj-card-reason { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
        .adj-card-reason-content { font-size: 13px; color: #334155; line-height: 1.5; }
        
        .adj-card-actions { display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid #f1f5f9; background: #f8fafc; gap: 8px; }
      }
    </style>
    <div class="sap-card">
      <div class="adj-month-nav">
        <h2 style="margin:0; font-size:16px; font-weight:700; color:#1e293b; display:none;">調整申請一覧</h2>
        <div class="adj-month-nav-right">
          <button id="btnMonthPrev" class="adj-month-btn" title="前月">&#8249;</button>
          <span class="adj-month-label">
            ${fmtMonthLabel(currentMonth)}
            ${pendingCount > 0 ? `<span class="adj-pending-badge">${pendingCount}件 確認待ち</span>` : ''}
          </span>
          <button id="btnMonthNext" class="adj-month-btn" title="翌月">&#8250;</button>
        </div>
      </div>
      <div class="adj-table-card">
        ${pagedRows.length === 0 ? `
          <div style="padding:48px 24px;text-align:center;color:#6a6d70;font-size:14px;background:#ffffff;">該当する申請データがありません。</div>
        ` : `
          <table class="adj-table">
            <thead style="position:sticky;top:0;z-index:10;">
              <tr>
                <th style="width:120px;">ユーザー</th>
                <th style="width:140px;">作成</th>
                <th style="width:140px;">修正(出勤)</th>
                <th style="width:140px;">修正(退勤)</th>
                <th style="width:280px;">理由 / 差戻し内容</th>
                <th style="width:100px;">状態</th>
                <th style="width:140px;text-align:right;">アクション</th>
              </tr>
            </thead>
            <tbody style="background:white;">${tbody}</tbody>
          </table>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 24px;border-top:1px solid #e5e5e5;${totalPages <= 1 ? 'display:none;' : ''}">
            <span style="font-size:13px;color:#6a6d70;">${filtered.length} 件中 ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filtered.length)} 件を表示</span>
            <div style="display:flex;gap:8px;align-items:center;">
              <button id="btnPagePrev" class="adj-month-btn" ${currentPage === 1 ? 'disabled' : ''}>前へ</button>
              <span style="font-size:13px;color:#32363a;">${currentPage} / ${totalPages}</span>
              <button id="btnPageNext" class="adj-month-btn" ${currentPage === totalPages ? 'disabled' : ''}>次へ</button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  attachButtonListeners();
}

async function renderList() {
  if (!localHost) return;
  localHost.innerHTML = '<div style="color:#475569;padding:16px;">読み込み中…</div>';
  try {
    allRows = await fetchJSONAuth('/api/adjust/admin');
    if (!Array.isArray(allRows)) allRows = [];
    renderTable();
  } catch (e) {
    localHost.innerHTML = `<div style="color:#b00020;padding:16px;">取得失敗: ${esc(e?.message || 'unknown')}</div>`;
  }
}

