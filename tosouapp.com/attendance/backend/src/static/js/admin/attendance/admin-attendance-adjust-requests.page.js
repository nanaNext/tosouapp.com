// admin-attendance-adjust-requests.page.js
import { fetchJSONAuth } from '../../api/http.api.js';

let localHost = null;

// Tháng hiện tại dạng "2026-04"
const nowDate = new Date();
let currentMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

// Cache toàn bộ dữ liệu để lọc phía client không cần gọi API lại
let allRows = [];

export async function mount({ content }) {
  localHost = content;
  localHost.style.visibility = '';
  
  // Set padding 0 to parent wrapper if we can to make sure it fills
  if (localHost.parentElement) {
      localHost.parentElement.style.padding = '0';
  }
  
  const params = new URLSearchParams(window.location.search);
  const isStandalone = params.get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100dvh - var(--topbar-height) - var(--subbar-height))';

  localHost.style.display = 'flex';
  localHost.style.flexDirection = 'column';
  localHost.style.height = vhExpr;
  localHost.style.background = '#FFFFFF';
  localHost.style.overflow = 'hidden';
  localHost.style.flex = '1';
  localHost.style.minWidth = '0';

  const isAdmin = await checkAdminAuth();
  if (isAdmin) await renderList();
}


function wireSubbarMenus() {
  try {
    const menus = Array.from(document.querySelectorAll('.subbar .menu'));
    if (!menus.length) return;
    const closeAll = () => menus.forEach((m) => m.classList.remove('open'));
    menus.forEach((m) => {
      const btn = m.querySelector('.menu-btn');
      if (!btn || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = m.classList.contains('open');
        closeAll();
        if (!isOpen) m.classList.add('open');
      });
    });
    document.addEventListener('click', () => closeAll());
  } catch (e) { /* silently ignored */ }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDateTime(val) {
  if (!val) return '—';
  const s = String(val).slice(0, 16).replace('T', ' ');
  const [date, time] = s.split(' ');
  if (!date) return '—';
  return `<span class="dt-date">${date}</span><span class="dt-time">${time || ''}</span>`;
}

// Lấy tháng trước / tháng sau
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Format "2026-04" → "2026年4月"
function fmtMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${y}年${m}月`;
}

async function checkAdminAuth() {
  try {
    const profile = await fetchJSONAuth('/api/auth/me');
    const role = String(profile?.role || '').toLowerCase();
    if (!profile || (role !== 'admin' && role !== 'manager')) { window.location.replace('/ui/login'); return false; }
    const nameEl = document.querySelector('#userName');
    if (nameEl) nameEl.textContent = profile.username || profile.email || 'User';
    return true;
  } catch { window.location.replace('/ui/login'); return false; }
}

async function updateRequestStatus(id, status) {
  try {
    await fetchJSONAuth(`/api/adjust/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    // Cập nhật cache local thay vì gọi API lại
    const row = allRows.find(r => String(r.id) === String(id));
    if (row) row.status = status;
    renderTable();
  } catch (e) {
    alert('ステータス更新に失敗しました: ' + (e?.message || 'unknown'));
  }
}

function attachButtonListeners() {
  localHost.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('この申請を承認しますか？')) updateRequestStatus(id, 'approved');
    });
  });
  localHost.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('この申請を却下しますか？')) updateRequestStatus(id, 'rejected');
    });
  });
  localHost.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (!confirm('この申請を削除しますか？この操作は取り消せません。')) return;
      try {
        await fetchJSONAuth(`/api/adjust/${id}`, { method: 'DELETE' });
        allRows = allRows.filter(r => String(r.id) !== String(id));
        renderTable();
      } catch (err) {
        alert('削除に失敗しました: ' + (err?.message || 'unknown'));
      }
    });
  });

  // Nút điều hướng tháng
  const btnPrev = localHost.querySelector('#btnMonthPrev');
  const btnNext = localHost.querySelector('#btnMonthNext');
  const btnNow  = localHost.querySelector('#btnMonthNow');
  if (btnPrev) btnPrev.onclick = () => { currentMonth = shiftMonth(currentMonth, -1); renderTable(); };
  if (btnNext) btnNext.onclick = () => { currentMonth = shiftMonth(currentMonth,  1); renderTable(); };
  if (btnNow)  btnNow.onclick  = () => {
    const n = new Date();
    currentMonth = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
    renderTable();
  };
}

function renderTable() {
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100dvh - var(--topbar-height) - var(--subbar-height))';

  // Lọc theo tháng đã chọn (dựa vào created_at)
  const filtered = allRows.filter(r => {
    const ym = r.created_at ? String(r.created_at).slice(0, 7) : '';
    return ym === currentMonth;
  });

  const pendingCount = filtered.filter(r => r.status === 'pending').length;
  const isCurrentMonth = currentMonth === `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

  const tbody = filtered.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:28px;">この月の申請はありません</td></tr>`
    : filtered.map(r => {
        const user      = esc(r.username || r.email || r.userId || '—');
        const created   = fmtDateTime(r.created_at);
        const cin       = fmtDateTime(r.requestedCheckIn);
        const cout      = fmtDateTime(r.requestedCheckOut);
        const st        = String(r.status || 'pending');
        let stLabel, stClass, actionCell;        if (st === 'pending') {
          stLabel    = '確認待ち';
          stClass    = 'adj-status-pending';
          actionCell = `<button class="btn-approve" data-id="${r.id}" style="height:24px;padding:0 8px;font-size:12px;border-radius:4px;border:1px solid #10b981;background:#10b981;color:white;cursor:pointer;margin-right:4px;">承認</button><button class="btn-reject" data-id="${r.id}" style="height:24px;padding:0 8px;font-size:12px;border-radius:4px;border:1px solid #f59e0b;background:#f59e0b;color:white;cursor:pointer;margin-right:4px;">却下</button><button class="btn-delete" data-id="${r.id}" style="height:24px;padding:0 8px;font-size:12px;border-radius:4px;border:1px solid #ef4444;background:#ef4444;color:white;cursor:pointer;">削除</button>`;
        } else if (st === 'approved') {
          stLabel = '承認済み'; stClass = 'adj-status-approved'; actionCell = `<button class="btn-delete" data-id="${r.id}" style="height:24px;padding:0 8px;font-size:12px;border-radius:4px;border:1px solid #ef4444;background:#ef4444;color:white;cursor:pointer;">削除</button>`;
        } else {
          stLabel = '却下'; stClass = 'adj-status-rejected'; actionCell = `<button class="btn-delete" data-id="${r.id}" style="height:24px;padding:0 8px;font-size:12px;border-radius:4px;border:1px solid #ef4444;background:#ef4444;color:white;cursor:pointer;">削除</button>`;
        }

        // Use standard td formatting from the hub CSS
        return `<tr>
          <td style="font-weight: 500;">${user}</td>
          <td style="text-align:center;">${created}</td>
          <td style="font-family:monospace; text-align:center;">${cin}</td>
          <td style="font-family:monospace; text-align:center;">${cout}</td>
          <td>${esc(r.reason || '')}</td>
          <td style="text-align:center;"><span class="${stClass}">${stLabel}</span></td>
          <td style="white-space:nowrap; text-align:center;">${actionCell}</td>
        </tr>`;
      }).join('');  localHost.innerHTML = `
    <style>
      .adj-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
      .adj-table th { padding: 6px 8px; font-size: 13px; font-weight: 600; text-align: center; }
      .adj-table td { padding: 6px 8px; vertical-align: middle; }
      .adj-table tbody tr:hover td { background-color: #f8fafc; }
      .adj-month-nav {
        display: flex;
        align-items: center;
        padding: 16px 24px; justify-content: space-between; flex-shrink: 0;
      }
      .adj-month-nav-right {
        display: flex; align-items: center;
      }
      .adj-month-btn {
        background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 10px; cursor: pointer; color: #475569; height: 28px;
      }
      .adj-month-btn:hover { background: #e2e8f0; }
      .adj-month-label { font-weight: bold; margin: 0 12px; font-size: 15px; color: #1e293b; }
      .adj-month-today { margin-left: 12px; font-size: 12px; cursor: pointer; background: #fff; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; height: 28px; }
      .adj-month-today:hover { background: #f8fafc; }
      .adj-pending-badge { background: #ef4444; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 8px; }
      .adj-table-card { margin: 0; flex: 1; overflow-y: auto; max-height: calc(${vhExpr} - 62px); padding: 16px 24px 24px 24px; }
    </style>
    <div class="adj-month-nav">
      <h2 style="margin:0; font-size:16px; font-weight:700; color:#111827;">調整申請一覧</h2>
      <div class="adj-month-nav-right">
        <button id="btnMonthPrev" class="adj-month-btn" title="前月">&#8249;</button>
        <span class="adj-month-label">
          ${fmtMonthLabel(currentMonth)}
          ${pendingCount > 0 ? `<span class="adj-pending-badge">${pendingCount}件 確認待ち</span>` : ''}
        </span>
        <button id="btnMonthNext" class="adj-month-btn" title="翌月">&#8250;</button>
        ${!isCurrentMonth ? `<button id="btnMonthNow" class="adj-month-today">今月</button>` : ''}
      </div>
    </div>
    <div class="adj-table-card">
      <table class="adj-table" style="margin: 0; width: 100%;">
        <thead style="position:sticky; top:0; z-index:10;">
          <tr>
            <th style="width:120px;">ユーザー</th>
            <th style="width:100px;">作成</th>
            <th style="width:90px;">修正(出勤)</th>
            <th style="width:90px;">修正(退勤)</th>
            <th style="width:200px;">理由</th>
            <th style="width:100px;">状態</th>
            <th style="width:160px;">アクション</th>
          </tr>
        </thead>
        <tbody style="background: white;">${tbody}</tbody>
      </table>
    </div>`;

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

