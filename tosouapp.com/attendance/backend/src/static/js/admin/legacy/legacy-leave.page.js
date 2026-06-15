import { delegate } from '../_shared/dom.js';
import { api } from '../../shared/api/client.js';

function ensureLeaveUiStyles() {
  if (document.getElementById('leave-unified-style')) return;
  const s = document.createElement('style');
  s.id = 'leave-unified-style';
  s.textContent = `
    .leave-page { 
      font-family: Inter, "Noto Sans JP", sans-serif;
      color: #111827; 
      background: transparent !important; 
      border: none !important; 
      box-shadow: none !important; 
      padding: 0 !important; 
      margin-top: -16px !important;
      max-width: 1440px;
      margin-left: auto;
      margin-right: auto;
    }
    .leave-page-header {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-bottom: 12px;
    }
    .leave-page-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }
    .leave-tabs {
      display: flex;
      gap: 24px;
      border-bottom: 1px solid #E5E7EB;
    }
    .leave-tab {
      padding: 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #6B7280;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      margin-bottom: -1px;
    }
    .leave-tab:hover {
      color: #374151;
    }
    .leave-tab.active {
      color: #2563EB;
      border-bottom-color: #2563EB;
    }
    .leave-tab-content {
      display: none;
    }
    .leave-tab-content.active {
      display: block;
    }
      
    .leave-page #tab-balances .leave-toolbar {
      display: none !important;
    }
    .leave-page #tab-balances .leave-pager {
      display: none !important;
    }
      margin: 0 0 16px; 
      font-size: 20px; 
      font-weight: 700; 
      letter-spacing: -0.01em; 
      color: #111827;
      padding-left: 0; 
      border-left: 0;
    }
    .leave-section {
      background: transparent; 
      border: none; 
      padding: 0;
      box-shadow: none; 
      min-width: 0; 
      margin-bottom: 12px;
      margin-top: 0;
      display: flex;
      flex-direction: column;
    }
    .leave-section h3, .leave-section h4 {
      margin: 0 0 8px; 
      font-size: 14px; 
      font-weight: 600; 
      color: #111827;
      padding-bottom: 8px; 
      border-bottom: 1px solid #E5E7EB;
    }
    .leave-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 8px; }
    .leave-label { font-size: 11px; color: #4B5563; font-weight: 500; margin-bottom: 4px; display: block; }
    .leave-select, .leave-input {
      min-height: 28px !important; 
      height: 28px !important;
      border: 1px solid #D1D5DB !important; 
      border-radius: 2px !important; 
      padding: 2px 8px !important; 
      background: #FFFFFF !important;
      line-height: 1.5 !important; 
      font-size: 13px !important; 
      font-family: inherit !important; 
      box-sizing: border-box !important; 
      color: #111827 !important; 
      transition: border-color 0.2s ease;
    }
    .leave-select:focus, .leave-input:focus { border-color: #2563EB !important; outline: none !important; }
    .leave-btn {
      min-height: 28px !important; 
      height: 28px !important;
      border: 1px solid transparent !important; 
      border-radius: 2px !important; 
      background: #FFFFFF; 
      padding: 0 12px !important; 
      cursor: pointer; 
      font-size: 12px !important; 
      font-weight: 500; 
      transition: background 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .leave-btn:hover { background: #F9FAFB; border-color: #E5E7EB; }
    .leave-btn-primary { background: #2563EB; border-color: #2563EB; color: #FFFFFF; }
    .leave-btn-primary:hover { background: #1D4ED8; border-color: #1D4ED8; color: #FFFFFF; }
    .leave-btn-danger { background: #FEF2F2; color: #DC2626; }
    .leave-btn-danger:hover { background: #FEE2E2; }
    .leave-btn-subtle { background: #F9FAFB; color: #4B5563; border-color: #E5E7EB; }
    .leave-btn-subtle:hover { background: #F3F4F6; }
    .leave-table-wrap {
      overflow: auto; 
      background: #FFFFFF;
      box-shadow: none; 
      max-width: 100%;
      border-radius: 2px !important;
      flex-grow: 1;
    }
    .leave-table-wrap.sticky { max-height: 450px; }
    .leave-page .leave-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .leave-page .leave-table th, .leave-page .leave-table td { border-left: none; border-right: none; }
    .leave-page .leave-table thead th {
      background: #FFFFFF !important;
      color: #6B7280 !important;
      -webkit-text-fill-color: #6B7280 !important;
      text-align: left; 
      font-weight: 600; 
      font-size: 12px;
      padding: 6px 8px; 
      border-bottom: 1px solid #E5E7EB; 
      border-left: none;
      border-right: none;
      white-space: nowrap;
    }
    .leave-page .leave-table thead th * {
      color: #6B7280 !important;
      -webkit-text-fill-color: #6B7280 !important;
    }
    .leave-table-wrap.sticky .leave-table thead th { position: sticky; top: 0; z-index: 1; }
    .leave-page .leave-table tbody td { 
      padding: 6px 8px; 
      border-bottom: 1px solid #F3F4F6; 
      vertical-align: middle; 
      color: #111827;
      border-left: none;
      border-right: none;
    }
    .leave-page .leave-table tbody td:last-child {
      position: sticky;
      right: 0;
      background: #FFFFFF;
      z-index: 1;
      border-left: 1px solid #F3F4F6;
    }
    .leave-page .leave-table thead th:last-child {
      position: sticky;
      right: 0;
      background: #FFFFFF !important;
      z-index: 2;
      border-left: 1px solid #F3F4F6;
    }
    .leave-page .leave-table tbody tr:hover td:last-child {
      background: #F9FAFB;
    }
    .leave-page .leave-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .leave-badge { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center;
      border-radius: 2px !important; 
      padding: 2px 8px !important; 
      font-size: 11px !important; 
      font-weight: 600; 
      border: none; 
    }
    .leave-badge.pending { color: #92400E; background: #FEF3C7; }
    .leave-badge.approved { color: #166534; background: #DCFCE7; }
    .leave-badge.rejected { color: #4B5563; background: #F3F4F6; }
    .leave-grid-main { display: grid; grid-template-columns: minmax(0,1fr); gap: 24px; align-items: start; }
    .leave-grid-full { margin-top: 0; }
    .leave-form-grid {
      display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 16px;
    }
    .leave-form-grid > div { display: flex; flex-direction: column; gap: 6px; }
    .leave-form-card {
      margin-top: 0; border-top: none; border-radius: 0; padding: 0; background: transparent;
    }
    .leave-form-card h4 { margin: 0 0 8px; font-size: 16px; color: #111827; font-weight: 700; }
    .leave-form-card p.sub-desc { margin: 0 0 24px; font-size: 14px; color: #6B7280; }
    .leave-mini-note { color: #6B7280; font-size: 13px; margin-top: 12px; }
    .leave-pager { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 16px; }
    .leave-muted { color: #6B7280; font-size: 13px; }
    
    .leave-balance-card {
      background: #FFFFFF;
      border-radius: 4px;
      box-shadow: 0 0 0 1px #E5E5E5, 0 2px 4px 0 rgba(0,0,0,0.05);
      padding: 16px;
      font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .leave-balance-card:hover {
      box-shadow: 0 0 0 1px #0854A0, 0 4px 8px 0 rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .leave-balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    
    @media (min-width: 1024px) {
      .leave-grid-main { grid-template-columns: minmax(0,1fr) 280px; align-items: stretch; gap: 24px; }
    }

    /* Modal styles */
    .pto-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .pto-modal { background: #FFFFFF; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .pto-modal-header { padding: 16px 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; }
    .pto-modal-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
    .pto-modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #6B7280; padding: 0; display: flex; align-items: center; justify-content: center; }
    .pto-modal-body { padding: 24px; overflow-y: auto; }
    .pto-modal-footer { padding: 16px 24px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 12px; }
    
    .pto-grant-row { display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid #E5E7EB; border-radius: 4px; margin-bottom: 12px; background: #F9FAFB; }
    .pto-grant-row input { padding: 4px 8px; border: 1px solid #D1D5DB; border-radius: 2px; font-size: 13px; width: 100%; box-sizing: border-box; min-height: 28px; }
    .pto-grant-label { font-size: 11px; font-weight: 500; color: #4B5563; margin-bottom: 4px; display: block; }
  `;
  document.head.appendChild(s);
}

export async function mountApprovals({ host, content, opts, mountApprovalsFn }) {
  const c = host || content;
  const seq = Number(c.dataset.approvalsRenderSeq || 0) + 1;
  c.dataset.approvalsRenderSeq = String(seq);
  const stale = () => String(c.dataset.approvalsRenderSeq || '') !== String(seq);
  ensureLeaveUiStyles();
  c.innerHTML = '<h3>承認フロー</h3>';

  const selectedStatus = String(
    Object.prototype.hasOwnProperty.call(opts || {}, 'status')
      ? (opts?.status || '')
      : 'pending'
  ).trim().toLowerCase();
  const filter = document.createElement('div');
  filter.className = 'leave-toolbar';
  filter.innerHTML = `
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">休暇申請フィルター</span>
      <select id="leaveReqStatusFilter" class="leave-select">
        <option value="">すべて</option>
        <option value="pending">承認待ち</option>
        <option value="approved">承認済み</option>
        <option value="rejected">却下</option>
      </select>
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">月</span>
      <input id="leaveReqMonthFilter" class="leave-input" type="month">
    </label>
  `;
  c.appendChild(filter);
  const statusEl = filter.querySelector('#leaveReqStatusFilter');
  if (statusEl) statusEl.value = selectedStatus;
  const monthEl = filter.querySelector('#leaveReqMonthFilter');

  const q = statusEl && statusEl.value ? `?status=${encodeURIComponent(statusEl.value)}` : '';
  let rows = [];
  let usingLegacyPending = false;
  if (selectedStatus === 'pending') {
    usingLegacyPending = true;
    rows = await api.get('/api/leave/pending').catch(() => []);
    if (stale()) return;
  } else {
    try {
      rows = await api.get(`/api/leave/admin-requests${q}`);
      if (stale()) return;
    } catch {
      rows = [];
      if (stale()) return;
    }
  }
  const tableWrap = document.createElement('div');
  tableWrap.className = 'leave-table-wrap';
  const table = document.createElement('table');
  table.className = 'leave-table leave-table-approvals';
  const hasActions = selectedStatus === 'pending';
  table.innerHTML = `<thead><tr><th>ID</th><th>社員番号・氏名</th><th>期間</th><th>種類</th><th>状態</th><th>残数</th>${hasActions ? '<th>操作</th>' : ''}</tr></thead>`;
  const tbody = document.createElement('tbody');
  const pager = document.createElement('div');
  pager.className = 'leave-pager';
  let page = 1;
  const pageSize = 10;
  const allRows = Array.isArray(rows) ? rows : [];
  const renderTableRows = () => {
    const m = String(monthEl?.value || '').trim(); // YYYY-MM
    const matched = allRows.filter((r) => {
      const byM = !m || String(r.startDate || '').startsWith(m) || String(r.endDate || '').startsWith(m);
      return byM;
    });
    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const pageRows = matched.slice(start, start + pageSize);

    tbody.innerHTML = '';
    for (const r of pageRows) {
      const canReview = String(r?.status || '') === 'pending';
      const empCode = r.employee_code || ('EMP' + String(r.userId).padStart(3, '0'));
      const userLabel = `${empCode} ${r?.username || ''}`.trim();
      const tr = document.createElement('tr');
      const status = String(r.status || '').toLowerCase();
      const statusClass = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
      
      let statusJa = '承認待ち';
      if (status === 'approved') statusJa = '承認済み';
      if (status === 'rejected') statusJa = '却下';
      
      let typeJa = r.type;
      if (typeJa === 'paid') typeJa = '有給';
      else if (typeJa === 'unpaid') typeJa = '欠勤';
      
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${userLabel}</td>
        <td>${r.startDate}〜${r.endDate}</td>
        <td>${typeJa}</td>
        <td><span class="leave-badge ${statusClass}">${statusJa}</span></td>
        <td><button type="button" class="leave-btn leave-btn-subtle" data-action="balance" data-user="${r.userId}">照会</button></td>
        ${hasActions ? `<td>
          <button type="button" class="leave-btn leave-btn-primary" data-action="approve" data-app="${r.id}">承認</button>
          <button type="button" class="leave-btn leave-btn-danger" data-action="reject" data-app="${r.id}">却下</button>
        </td>` : ''}`;
      tbody.appendChild(tr);
    }
    if (!pageRows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" style="text-align:center;color:#64748b;padding:20px 8px;">${usingLegacyPending ? '承認待ちの休暇申請はありません' : (selectedStatus ? 'この状態の休暇申請はありません' : '休暇申請はありません')}</td>`;
      tbody.appendChild(tr);
    }
    pager.innerHTML = `
      <button type="button" class="leave-btn" data-pg="prev">前へ</button>
      <span class="leave-muted">${total} 件 / ${page} / ${totalPages} ページ</span>
      <button type="button" class="leave-btn" data-pg="next">次へ</button>
    `;
    pager.querySelectorAll('[data-pg]').forEach((b) => {
      b.addEventListener('click', () => {
        const dir = b.getAttribute('data-pg');
        if (dir === 'prev' && page > 1) page -= 1;
        if (dir === 'next' && page < totalPages) page += 1;
        renderTableRows();
        bindActionButtons();
      });
    });
  };

  if (statusEl) {
    statusEl.addEventListener('change', async () => {
      await mountApprovalsFn(host || content, { ...(opts || {}), status: String(statusEl.value || '') });
    });
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  c.appendChild(tableWrap);

  const handleAction = async (el) => {
    const action = el.dataset.action;
    const setBusy = (flag) => {
      try {
        if (el && typeof el.disabled !== 'undefined') el.disabled = !!flag;
      } catch (e) { /* silently ignored */ }
    };

    if (action === 'balance') {
      const u = el.dataset.user;
      try {
        setBusy(true);
        const r = await api.get(`/api/leave/user-balance?userId=${encodeURIComponent(u)}`);
        alert(`User ${u} 残数: ${r.totalAvailable}日`);
      } catch (err) {
        alert('残数取得失敗: ' + ((err && err.message) ? err.message : 'error'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (action === 'approve' || action === 'reject') {
      const id = el.dataset.app;
      const s = action === 'approve' ? 'approved' : 'rejected';
      try {
        setBusy(true);
        await api.patch(`/api/leave/${id}/status`, { status: s });
        if (typeof opts?.onDataChanged === 'function') await opts.onDataChanged();
        // 再描画: 正しい引数形式で呼び直す
        await mountApprovalsFn(host || content, { ...(opts || {}), status: selectedStatus });
      } catch (err) {
        alert('状態更新失敗: ' + ((err && err.message) ? err.message : 'error'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (action === 'pc-approve' || action === 'pc-reject') {
      const pcId = el.dataset.pc;
      const s = action === 'pc-approve' ? 'approved' : 'rejected';
      try {
        setBusy(true);
        await api.patch(`/api/manager/profile-change/${pcId}/status`, { status: s });
        if (typeof opts?.onDataChanged === 'function') await opts.onDataChanged();
        // 再描画
        await mountApprovalsFn(host || content, opts || {});
      } catch (err) {
        alert('プロフィール申請更新失敗: ' + ((err && err.message) ? err.message : 'error'));
      } finally {
        setBusy(false);
      }
      return;
    }
  };

  const bindActionButtons = () => {
    c.querySelectorAll('[data-action]').forEach((btn) => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleAction(btn);
      };
    });
  };
  renderTableRows();
  bindActionButtons();
  c.appendChild(pager);
  if (monthEl) monthEl.addEventListener('change', () => { page = 1; renderTableRows(); bindActionButtons(); });

  // プロフィール更新申請
  if (opts?.hideProfileSection) return;
  const pcWrap = document.createElement('div');
  pcWrap.innerHTML = '<h4>プロフィール更新申請</h4>';

  const pcr = await api.get('/api/manager/profile-change/pending');
  if (stale()) return;
  const pcWrapTable = document.createElement('div');
  pcWrapTable.className = 'leave-table-wrap';
  const pcTable = document.createElement('table');
  pcTable.className = 'leave-table';
  pcTable.innerHTML =
    '<thead><tr><th>ID</th><th>User</th><th>内容</th><th>送信日時</th><th>操作</th></tr></thead>';
  const pcBody = document.createElement('tbody');

  for (const r of pcr) {
    const fields = r.fields || {};
    const summary = Object.keys(fields)
      .slice(0, 6)
      .map(k => `${k}: ${String(fields[k]).slice(0, 20)}`)
      .join(', ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.userId} ${r.username || ''}</td>
      <td>${summary}</td>
      <td>${r.createdAt || ''}</td>
      <td>
        <button type="button" class="leave-btn leave-btn-primary" data-action="pc-approve" data-pc="${r.id}">承認</button>
        <button type="button" class="leave-btn leave-btn-danger" data-action="pc-reject" data-pc="${r.id}">却下</button>
      </td>`;
    pcBody.appendChild(tr);
  }
  if (!(Array.isArray(pcr) && pcr.length)) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center;color:#64748b;padding:14px 8px;">承認待ちのプロフィール更新申請はありません</td>';
    pcBody.appendChild(tr);
  }

  pcTable.appendChild(pcBody);
  pcWrapTable.appendChild(pcTable);
  pcWrap.appendChild(pcWrapTable);
  c.appendChild(pcWrap);
  bindActionButtons();
}

export async function mountLeaveAdmin({ content }) {
  content.innerHTML = '<h3>有給休暇管理</h3>';
  const data = await api.get('/api/leave/summary');

  const table = document.createElement('table');
  table.style.width = '100%';
  table.innerHTML =
    '<thead><tr><th>User</th><th>部門</th><th>付与合計</th><th>使用</th><th>残</th></tr></thead>';
  const tbody = document.createElement('tbody');

  for (const r of data) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.userId} ${r.name || ''}</td>
      <td>${r.departmentId == null ? '' : r.departmentId}</td>
      <td>${r.totalGranted}</td>
      <td>${r.usedDays}</td>
      <td>${r.remainingDays}</td>`;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  content.appendChild(table);
}

export async function mountLeaveGrant({
  host,
  content,
  opts,
  listUsers,
  mountApprovalsFn,
  mountLeaveBalanceFn,
}) {
  const c = host || content;
  ensureLeaveUiStyles();
  c.innerHTML = '<h3>有給付与</h3>';

  if (!(opts && opts.unified)) {
    const nav = document.createElement('div');
    if (opts && opts.hub) {
      nav.innerHTML = `
        <span class="btn">有給付与</span>
        <button class="btn" data-action="go-approvals">有給申請承認</button>
        <button class="btn" data-action="go-balance">有給残日数一覧</button>
        <button class="btn" data-action="auto-grant">自動付与 実行</button>
      `;
    } else {
      nav.innerHTML = `
        <a class="btn" href="/ui/admin?tab=leave_grant">有給付与</a>
        <a class="btn" href="/ui/admin?tab=approvals">有給申請承認</a>
        <a class="btn" href="/ui/admin?tab=leave_balance">有給残日数一覧</a>
        <button class="btn" data-action="auto-grant">自動付与 実行</button>
      `;
    }
    c.appendChild(nav);
  }

  const eligibleWrap = document.createElement('div');
  eligibleWrap.style.cssText = 'margin:8px 0 12px;padding:0;border:0;border-radius:0;background:transparent;';
  eligibleWrap.innerHTML = `
    <div class="leave-toolbar" style="margin:0 0 8px;">
      <strong>付与対象候補</strong>
      <button class="leave-btn" data-action="load-eligible">候補を読込</button>
      <button class="leave-btn leave-btn-primary" data-action="grant-eligible">候補を一括付与</button>
      <span id="eligibleInfo" style="color:#475569;font-size:12px;"></span>
    </div>
    <div id="eligibleTableHost"></div>
  `;
  eligibleWrap.querySelector('.leave-toolbar')?.style.setProperty('padding', '0');
  c.appendChild(eligibleWrap);

  const eligibleInfo = eligibleWrap.querySelector('#eligibleInfo');
  const eligibleHost = eligibleWrap.querySelector('#eligibleTableHost');
  let eligibleRowsCache = [];
  const getEligibleKey = (r) => `${r.userId}|${r.grantDate}|${r.days}`;
  const selectedEligible = new Set();
  const renderEligible = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    eligibleRowsCache = list;
    if (!list.length) {
      eligibleHost.innerHTML = '<div class="leave-mini-note">付与候補はありません</div>';
      return;
    }
    const w = document.createElement('div');
    w.className = 'leave-table-wrap sticky';
    const t = document.createElement('table');
    t.className = 'leave-table';
    t.innerHTML = '<thead><tr><th><input type="checkbox" id="eligibleCheckAll"></th><th>User</th><th>入社日</th><th>付与日</th><th>日数</th><th>出勤率</th><th>判定期間</th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const r of list) {
      const k = getEligibleKey(r);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" data-eligible-key="${k}" ${selectedEligible.has(k) ? 'checked' : ''}></td>
        <td>${r.userId}${r.employeeCode ? ` (${r.employeeCode})` : ''} ${r.username || ''}</td>
        <td>${r.hireDate || ''}</td>
        <td>${r.grantDate || ''}</td>
      <td class="num">${r.days || 0}</td>
      <td class="num">${r.attendanceRate || 0}%</td>
        <td>${r.periodStart || ''}〜${r.periodEnd || ''}</td>
      `;
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    eligibleHost.innerHTML = '';
    w.appendChild(t);
    eligibleHost.appendChild(w);
    const allEl = eligibleHost.querySelector('#eligibleCheckAll');
    if (allEl) {
      allEl.addEventListener('change', () => {
        const checked = !!allEl.checked;
        eligibleHost.querySelectorAll('input[data-eligible-key]').forEach((ck) => {
          ck.checked = checked;
          const k = ck.getAttribute('data-eligible-key');
          if (!k) return;
          if (checked) selectedEligible.add(k);
          else selectedEligible.delete(k);
        });
      });
    }
    eligibleHost.querySelectorAll('input[data-eligible-key]').forEach((ck) => {
      ck.addEventListener('change', () => {
        const k = ck.getAttribute('data-eligible-key');
        if (!k) return;
        if (ck.checked) selectedEligible.add(k);
        else selectedEligible.delete(k);
      });
    });
  };

  delegate(c, '[data-action]', 'click', async (e, el) => {
    const action = el.dataset.action;

    if (action === 'auto-grant') {
      try {
        const r = await api.post('/api/leave/auto-grant/run');
        alert(`自動付与 実行: ${r.ok || 0}/${r.processed || 0}`);
        if (typeof opts?.onDataChanged === 'function') await opts.onDataChanged();
      } catch (err) {
        alert('自動付与失敗: ' + ((err && err.message) ? err.message : 'error'));
      }
    } else if (action === 'load-eligible') {
      try {
        const r = await api.get('/api/leave/eligible-list');
        const rows = Array.isArray(r?.rows) ? r.rows : [];
        if (eligibleInfo) eligibleInfo.textContent = `mode=${r?.mode || '-'} / 件数=${rows.length}`;
        renderEligible(rows);
      } catch (err) {
        if (eligibleInfo) eligibleInfo.textContent = '候補読込に失敗しました';
      }
    } else if (action === 'grant-eligible') {
      try {
        const selected = eligibleRowsCache.filter((r) => selectedEligible.has(getEligibleKey(r)));
        const targets = selected.length ? selected : eligibleRowsCache;
        let ok = 0;
        for (const r of targets) {
          const gDate = String(r.grantDate || '').slice(0, 10);
          if (!gDate) continue;
          const dt = new Date(gDate + 'T00:00:00Z');
          dt.setUTCFullYear(dt.getUTCFullYear() + 2);
          dt.setUTCDate(dt.getUTCDate() - 1);
          const expiry = dt.toISOString().slice(0, 10);
          await api.post('/api/leave/grant', { userId: Number(r.userId), days: Number(r.days || 0), grantDate: gDate, expiryDate: expiry });
          ok += 1;
        }
        if (eligibleInfo) eligibleInfo.textContent = `選択=${targets.length} / 付与=${ok}`;
        const re = await api.get('/api/leave/eligible-list');
        selectedEligible.clear();
        renderEligible(re?.rows || []);
        if (typeof opts?.onDataChanged === 'function') await opts.onDataChanged();
      } catch (err) {
        alert('一括付与失敗: ' + ((err && err.message) ? err.message : 'error'));
      }
    } else if (action === 'go-approvals' && opts && opts.hub) {
      mountApprovalsFn(c, { hub: true });
    } else if (action === 'go-balance' && opts && opts.hub) {
      mountLeaveBalanceFn(c, { hub: true });
    }
  });

  const users = await listUsers();
  const form = document.createElement('form');
  const today = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const exp = new Date(
    Date.UTC(today.getUTCFullYear() + 2, today.getUTCMonth(), today.getUTCDate() - 1),
  );

  form.className = 'leave-form-grid';
  form.innerHTML = `
    <div>
      <label class="leave-label">ユーザー</label>
      <select id="grantUser" class="leave-select"></select>
    </div>
    <div>
      <label class="leave-label">日数</label>
      <input id="grantDays" class="leave-input" type="number" min="1" value="10">
    </div>
    <div>
      <label class="leave-label">付与日</label>
      <input id="grantDate" class="leave-input" type="date" value="${fmt(today)}">
    </div>
    <div>
      <label class="leave-label">有効期限</label>
      <input id="expireDate" class="leave-input" type="date" value="${fmt(exp)}">
    </div>
    <div style="margin-top:8px;">
      <button type="submit" class="leave-btn leave-btn-primary" style="min-width:120px; align-self: flex-start;">付与</button>
    </div>
  `;

  const sel = form.querySelector('#grantUser');
  for (const u of users) {
    const role = String(u?.role || '').toLowerCase();
    if (role === 'admin' || role === 'manager') continue;
    const opt = document.createElement('option');
    opt.value = String(u.id);
    const empCode = u.employee_code || ('EMP' + String(u.id).padStart(3, '0'));
    opt.textContent = `${empCode} ${u.username || u.email}`;
    sel.appendChild(opt);
  }

  form.querySelector('#grantDate').addEventListener('change', e => {
    try {
      const d = new Date(e.target.value + 'T00:00:00Z');
      const tmp = new Date(
        Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate() - 1),
      );
      form.querySelector('#expireDate').value = fmt(tmp);
    } catch {
      // ignore
    }
  });

  const result = document.createElement('div');
  result.className = 'leave-mini-note';

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const userId = parseInt(sel.value, 10);
    const days = parseInt(form.querySelector('#grantDays').value, 10);
    const grantDate = form.querySelector('#grantDate').value;
    const expiryDate = form.querySelector('#expireDate').value;

    try {
      await api.post('/api/leave/grant', { userId, days, grantDate, expiryDate });
      result.textContent = '付与しました';
      if (typeof opts?.onDataChanged === 'function') await opts.onDataChanged();
    } catch (err) {
      result.textContent = '付与失敗: ' + ((err && err.message) ? err.message : 'error');
    }
  });

  const formCard = document.createElement('div');
  formCard.className = 'leave-form-card';
  formCard.innerHTML = `
    <h4 style="margin-top:16px;">Manual PTO Grant</h4>
  `;
  formCard.appendChild(form);
  formCard.appendChild(result);
  c.appendChild(formCard);
}

async function showEditPtoModal(userId, userName, onSaved) {
  const overlay = document.createElement('div');
  overlay.className = 'pto-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'pto-modal';
  
  modal.innerHTML = `
    <div class="pto-modal-header">
      <h3 class="pto-modal-title">${userName} - 有給休暇の編集</h3>
      <button class="pto-modal-close">&times;</button>
    </div>
    <div class="pto-modal-body">
      <div id="ptoModalLoading" style="text-align:center; padding: 20px; color:#6B7280;">読み込み中...</div>
      <div id="ptoGrantsList" style="display:none;"></div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #E5E7EB;">
        <h4 style="font-size: 14px; margin-bottom: 12px; font-weight: 600;">手動付与（追加）</h4>
        <div class="pto-grant-row" style="background: #FFFFFF;">
          <div>
            <label class="pto-grant-label">付与日 (Grant Date)</label>
            <input type="date" id="newGrantDate" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div>
            <label class="pto-grant-label">日数 (Days)</label>
            <input type="number" id="newGrantDays" min="1" step="1" placeholder="日数">
          </div>
          <div>
            <label class="pto-grant-label">有効期限 (Expiry)</label>
            <input type="date" id="newGrantExpiry">
          </div>
          <div style="align-self: flex-end;">
              <button class="leave-btn" id="btnAddGrant">追加</button>
            </div>
        </div>
      </div>
    </div>
    <div class="pto-modal-footer">
      <button class="leave-btn secondary pto-modal-close-btn">閉じる</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  const closeBtns = modal.querySelectorAll('.pto-modal-close, .pto-modal-close-btn');
  closeBtns.forEach(b => b.addEventListener('click', () => overlay.remove()));
  
  const loadingEl = modal.querySelector('#ptoModalLoading');
  const listEl = modal.querySelector('#ptoGrantsList');
  
  // Set default expiry (2 years - 1 day)
  const today = new Date();
  const defExpiry = new Date(today.getUTCFullYear() + 2, today.getUTCMonth(), today.getUTCDate() - 1);
  modal.querySelector('#newGrantExpiry').value = defExpiry.toISOString().slice(0,10);
  
  async function loadGrants() {
    loadingEl.style.display = 'block';
    listEl.style.display = 'none';
    try {
      const res = await api.get('/api/leave/user-balance?userId=' + userId);
      const grants = res.grants || [];
      
      if (grants.length === 0) {
        listEl.innerHTML = '<div style="color:#6B7280; font-size:13px; text-align:center;">付与履歴がありません。</div>';
      } else {
        listEl.innerHTML = grants.map((g, idx) => `
          <div class="pto-grant-row">
            <div>
              <label class="pto-grant-label">付与日</label>
              <input type="date" value="${String(g.grantDate).slice(0,10)}" readonly style="background:#F3F4F6; cursor:not-allowed;">
            </div>
            <div>
              <label class="pto-grant-label">日数</label>
              <input type="number" class="edit-grant-days" data-idx="${idx}" data-date="${String(g.grantDate).slice(0,10)}" data-expiry="${String(g.expiryDate).slice(0,10)}" value="${g.daysGranted}" min="0" step="1">
            </div>
            <div>
              <label class="pto-grant-label">有効期限</label>
              <input type="date" class="edit-grant-expiry" data-idx="${idx}" value="${String(g.expiryDate).slice(0,10)}">
            </div>
            <div style="align-self: flex-end;">
              <button class="leave-btn secondary btn-save-grant" data-idx="${idx}">保存</button>
            </div>
          </div>
        `).join('');
      }
      
      // Attach save events
      listEl.querySelectorAll('.btn-save-grant').forEach(btn => {
        btn.addEventListener('click', async () => {
          const idx = btn.dataset.idx;
          const daysInput = listEl.querySelector(`.edit-grant-days[data-idx="${idx}"]`);
          const expiryInput = listEl.querySelector(`.edit-grant-expiry[data-idx="${idx}"]`);
          
          const grantDate = daysInput.dataset.date;
          const days = Number(daysInput.value);
          const expiryDate = expiryInput.value;
          
          if (!days && days !== 0) return alert('日数を入力してください');
          
          btn.textContent = '...';
          btn.disabled = true;
          try {
            await api.post('/api/leave/grant', { userId: Number(userId), days, grantDate, expiryDate });
            btn.textContent = '保存済';
            setTimeout(() => { btn.textContent = '保存'; btn.disabled = false; }, 2000);
            if (onSaved) onSaved();
          } catch (err) {
            alert('保存に失敗しました: ' + err.message);
            btn.textContent = '保存';
            btn.disabled = false;
          }
        });
      });
      
    } catch (err) {
      listEl.innerHTML = '<div style="color:#DC2626;">エラー: ' + err.message + '</div>';
    } finally {
      loadingEl.style.display = 'none';
      listEl.style.display = 'block';
    }
  }
  
  modal.querySelector('#btnAddGrant').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const gDate = modal.querySelector('#newGrantDate').value;
    const gDays = Number(modal.querySelector('#newGrantDays').value);
    const gExp = modal.querySelector('#newGrantExpiry').value;
    
    if (!gDate || !gDays || !gExp) {
      return alert('全ての項目を入力してください');
    }
    
    btn.disabled = true;
    btn.textContent = '...';
    try {
      await api.post('/api/leave/grant', { userId: Number(userId), days: gDays, grantDate: gDate, expiryDate: gExp });
      modal.querySelector('#newGrantDays').value = '';
      await loadGrants();
      if (onSaved) onSaved();
    } catch (err) {
      alert('追加に失敗しました: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '追加';
    }
  });
  
  await loadGrants();
}

export async function mountLeaveBalance({
  host,
  content,
  opts,
  mountLeaveGrantFn,
  mountApprovalsFn,
}) {
  const c = host || content;
  ensureLeaveUiStyles();
  c.innerHTML = '<h3 style="display:flex; align-items:center; gap:8px;"><span style="font-size:20px;">📊</span> 有給残日数一覧</h3>';

  const toolbar = document.createElement('div');
  toolbar.className = 'leave-toolbar';
  toolbar.innerHTML = `
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">検索</span>
      <input id="leaveBalSearch" class="leave-input" type="text" placeholder="user/id">
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">並び替え</span>
      <select id="leaveBalSort" class="leave-select">
        <option value="remainingDays:desc">残（日数）↓</option>
        <option value="remainingDays:asc">残（日数）↑</option>
        <option value="nearestExpiry:asc">有効期限 近い順</option>
        <option value="obligationRemaining:desc">義務残 ↓</option>
        <option value="userId:asc">User ID ↑</option>
      </select>
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">件数</span>
      <select id="leaveBalPageSize" class="leave-select">
        <option value="20">20</option>
        <option value="50" selected>50</option>
        <option value="100">100</option>
      </select>
    </label>
  `;
  c.appendChild(toolbar);

  let data = [];
  try {
    data = await api.get('/api/leave/summary');
  } catch {
    data = [];
    const note = document.createElement('div');
    note.style.cssText = 'margin:2px 0 10px;color:#b45309;font-size:12px;';
    note.textContent = '残日数データの取得に失敗しました。空データで表示します。';
    c.appendChild(note);
  }
  const gridWrap = document.createElement('div');
  gridWrap.className = 'leave-balance-grid';
  
  const pager = document.createElement('div');
  pager.className = 'leave-pager';
  const today = new Date();
  const searchEl = toolbar.querySelector('#leaveBalSearch');
  const sortEl = toolbar.querySelector('#leaveBalSort');
  const sizeEl = toolbar.querySelector('#leaveBalPageSize');
  let page = 1;
  const render = () => {
    const q = String(searchEl?.value || '').trim().toLowerCase();
    const [sortBy, sortDir] = String(sortEl?.value || 'remainingDays:desc').split(':');
    const pageSize = Number(sizeEl?.value || 20) || 20;
    const list = (Array.isArray(data) ? data : []).filter((r) => {
      const txt = `${r.employeeCode || r.userId} ${r.name || ''}`.toLowerCase();
      return !q || txt.includes(q);
    }).sort((a, b) => {
      const av = a?.[sortBy];
      const bv = b?.[sortBy];
      if (sortBy === 'nearestExpiry') {
        const aa = av ? new Date(av).getTime() : Number.MAX_SAFE_INTEGER;
        const bb = bv ? new Date(bv).getTime() : Number.MAX_SAFE_INTEGER;
        return sortDir === 'desc' ? (bb - aa) : (aa - bb);
      }
      const an = Number(av || 0);
      const bn = Number(bv || 0);
      return sortDir === 'desc' ? (bn - an) : (an - bn);
    });
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    const rows = list.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    
    gridWrap.innerHTML = '';
    
    for (const r of rows) {
      const card = document.createElement('div');
      card.className = 'leave-balance-card';
      
      let isExpiringSoon = false;
      if (r.nearestExpiry && new Date(r.nearestExpiry) - today < 1000 * 60 * 60 * 24 * 30) {
        isExpiringSoon = true;
        card.style.borderColor = '#FCD34D';
        card.style.background = '#FFFBEB';
      }
      
      const totalG = Number(r.totalGranted || 0);
      const usedD = Number(r.usedDays || 0);
      const remainD = Number(r.remainingDays || 0);
      
      // Progress bar calculations
      const pTotal = totalG > 0 ? totalG : 1;
      const pctUsed = Math.min(100, Math.max(0, (usedD / pTotal) * 100));
      
      card.className = 'leave-balance-card pto-card-clickable';
      card.dataset.userid = r.userId;
      card.dataset.username = r.name || `User ${r.userId}`;
      card.style.cursor = 'pointer';
      
      const initial = (r.name || 'U').charAt(0).toUpperCase();
      
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; border-bottom:1px solid #F2F2F2; padding-bottom:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#0854A0; color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">${initial}</div>
          <div>
            <h3 style="font-size:16px; font-weight:normal; color:#32363A; margin:0;">${r.name || `User ${r.userId}`}</h3>
            <p style="font-size:12px; color:#6A6D70; margin:2px 0 0 0;">社員番号: ${r.employeeCode || r.userId}</p>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; margin-top:4px;">
          <span style="font-size:28px; font-weight:300; color:#111827;">${remainD} <span style="font-size:14px;">days</span></span>
          <span style="font-size:12px; color:#6A6D70;">PTO Remaining</span>
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-top:4px; margin-bottom:0px;">
          <span style="color:#6A6D70; font-size:12px;">Used: <span style="font-weight:600; color:#32363A;">${usedD} / ${totalG}</span></span>
        </div>
        
        <div style="height:4px; background:#E5E5E5; border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${pctUsed}%; background:#0854A0; border-radius:2px;"></div>
        </div>
        
        <div style="font-size:12px; color:#6A6D70; display:flex; flex-direction:column; gap:4px; margin-top:auto; border-top:1px solid #F2F2F2; padding-top:12px;">
          <div style="display:flex; justify-content:space-between;">
            <span>Nearest Expiry</span>
            <span style="${isExpiringSoon ? 'color:#BB0000;font-weight:bold;' : 'color:#32363A;'}">${r.nearestExpiry || 'N/A'}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Obligation</span>
            <span style="color:#32363A;">${r.obligationRemaining || 0} days</span>
          </div>
        </div>
      `;
      gridWrap.appendChild(card);
    }
    
    if (!rows.length) {
      gridWrap.innerHTML = '<div style="text-align:center; color:#6B7280; padding:40px; grid-column:1/-1;">データがありません (No data)</div>';
    }
    
    pager.innerHTML = `
      <button type="button" class="leave-btn" data-pg="prev">前へ</button>
      <span class="leave-muted">${total} 件 / ${page} / ${totalPages} ページ</span>
      <button type="button" class="leave-btn" data-pg="next">次へ</button>
    `;
    pager.querySelectorAll('[data-pg]').forEach((b) => {
      b.addEventListener('click', () => {
        const dir = b.getAttribute('data-pg');
        if (dir === 'prev' && page > 1) page -= 1;
        if (dir === 'next' && page < totalPages) page += 1;
        render();
      });
    });

    // Add event listeners for edit buttons AFTER adding the gridWrap to the DOM
    setTimeout(() => {
      gridWrap.querySelectorAll('.pto-card-clickable').forEach(cardEl => {
        cardEl.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const userId = cardEl.dataset.userid;
          const userName = cardEl.dataset.username;
          await showEditPtoModal(userId, userName, async () => {
            // reload data
            try {
              data = await api.get('/api/leave/summary');
              render();
            } catch (e) {
              console.error('Failed to reload data', e);
            }
          });
        });
      });
      
      // Keep button working too, just stop propagation so it doesn't trigger card twice
      gridWrap.querySelectorAll('.leave-btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
      });
    }, 0);
  };

  c.appendChild(gridWrap);
  render();
  if (searchEl) searchEl.addEventListener('input', () => { page = 1; render(); });
  if (sortEl) sortEl.addEventListener('change', () => { page = 1; render(); });
  if (sizeEl) sizeEl.addEventListener('change', () => { page = 1; render(); });
}

export async function mountLeaveHub({
  content,
  mountLeaveGrantFn,
  mountApprovalsFn,
  mountLeaveBalanceFn,
}) {
  const c = content;
  c.innerHTML = '<h3>有給休暇</h3>';

  const nav = document.createElement('div');
  nav.innerHTML = `
    <a class="btn" href="/ui/admin">戻る</a>
    <button class="btn" data-action="nav-approve">有給申請承認</button>
    <button class="btn" data-action="nav-balance">有給残日数一覧</button>
  `;
  c.appendChild(nav);

  const body = document.createElement('div');
  c.appendChild(body);

  const showGrant = () => {
    mountLeaveGrantFn(body, { hub: true });
  };
  const showApprove = () => {
    mountApprovalsFn(body, { hub: true });
  };
  const showBalance = () => {
    mountLeaveBalanceFn(body, { hub: true });
  };

  function setHashAndRender(hash) {
    if (location.hash !== hash) location.hash = hash;
    if (hash.includes('grant')) showGrant();
    else if (hash.includes('approve')) showApprove();
    else showBalance();
  }

  delegate(nav, '[data-action]', 'click', (e, el) => {
    const action = el.dataset.action;
    if (action === 'nav-grant') setHashAndRender('#leave=grant');
    else if (action === 'nav-approve') setHashAndRender('#leave=approve');
    else if (action === 'nav-balance') setHashAndRender('#leave=balance');
  });

  const initial = (location.hash || '').toLowerCase();
  if (initial.includes('grant')) showGrant();
  else if (initial.includes('approve')) showApprove();
  else showBalance();

  window.addEventListener(
    'hashchange',
    () => {
      const h = (location.hash || '').toLowerCase();
      if (h.includes('grant')) showGrant();
      else if (h.includes('approve')) showApprove();
      else showBalance();
    },
    { once: false },
  );
}

export async function mountLeaveUnified({
  content,
  mountApprovalsFn,
  mountLeaveGrantFn,
  mountLeaveBalanceFn,
}) {
  ensureLeaveUiStyles();
  content.classList.add('leave-page');
  
  content.innerHTML = `
      <div class="leave-page-header">
        <div class="leave-tabs">
          <button class="leave-tab active" data-target="tab-approvals">休暇申請承認</button>
          <button class="leave-tab" data-target="tab-grant">有給付与</button>
          <button class="leave-tab" data-target="tab-balances">有給残日数一覧</button>
        </div>
      </div>
    `;

  // Tab containers
  const tabApprovals = document.createElement('div');
  tabApprovals.className = 'leave-tab-content active';
  tabApprovals.id = 'tab-approvals';

  const tabGrant = document.createElement('div');
  tabGrant.className = 'leave-tab-content';
  tabGrant.id = 'tab-grant';
  
  const tabBalances = document.createElement('div');
  tabBalances.className = 'leave-tab-content';
  tabBalances.id = 'tab-balances';

  content.appendChild(tabApprovals);
  content.appendChild(tabGrant);
  content.appendChild(tabBalances);

  const secA = document.createElement('section');
  secA.className = 'leave-section';
  tabApprovals.appendChild(secA);

  const secG = document.createElement('section');
  secG.className = 'leave-section';
  secG.style.maxWidth = '400px';
  secG.style.margin = '20px 0 0 0';
  tabGrant.appendChild(secG);
  
  const secB = document.createElement('div');
  secB.style.boxShadow = 'none';
  secB.style.border = 'none';
  secB.style.padding = '0';
  secB.style.background = 'transparent';
  tabBalances.appendChild(secB);
  
  const refreshBalance = async () => {
    // Show all items by setting limit to a very high number (e.g. 1000)
    await mountLeaveBalanceFn(secB, { unified: true, limit: 1000, onDataChanged: refreshBalance });
    const h3 = secB.querySelector('h3');
    if (h3) h3.remove();
  };
  
  await mountApprovalsFn(secA, { status: 'pending', hideProfileSection: true, onDataChanged: refreshBalance });
  const aTitle = secA.querySelector('h3');
  if (aTitle) aTitle.remove();

  await mountLeaveGrantFn(secG, { unified: true, onDataChanged: refreshBalance });

  // Clean up grant section
  if (secG) {
    // Remove the batch grant buttons toolbar
    const batchToolbar = secG.querySelector('.leave-toolbar');
    if (batchToolbar) batchToolbar.remove();
    
    // Remove the "Manual PTO Grant" heading
    const manualHeading = secG.querySelector('h4');
    if (manualHeading) manualHeading.remove();

    // Remove the extra description text under the title
    const gTitle = secG.querySelector('h3');
    if (gTitle) {
      gTitle.innerHTML = '有給付与';
    }
  }
  
  await refreshBalance();

  // Tab Switching Logic
  content.querySelectorAll('.leave-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      content.querySelectorAll('.leave-tab').forEach(t => t.classList.remove('active'));
      content.querySelectorAll('.leave-tab-content').forEach(c => c.classList.remove('active'));
      
      const targetId = e.currentTarget.getAttribute('data-target');
      e.currentTarget.classList.add('active');
      content.querySelector(`#${targetId}`).classList.add('active');
    });
  });
}
