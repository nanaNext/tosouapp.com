/**
 * platform-dashboard.page.js
 * Sysadmin-only platform management UI.
 * Communicates with /api/platform/* endpoints.
 */

const $ = (sel) => document.querySelector(sel);

// ── Auth helpers ──────────────────────────────────────────────────────────────

function getToken() { return sessionStorage.getItem('accessToken') || ''; }

function getCookie(name) {
  try {
    return document.cookie.split(';').map(c => c.trim())
      .find(c => c.startsWith(name + '='))?.split('=')[1] || '';
  } catch (e) { return ''; }
}

async function apiFetch(url, opts = {}) {
  const token = getToken();
  const csrf = getCookie('csrfToken');
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf || '',
      ...(opts.headers || {}),
    },
    credentials: 'include',
  });
  if (res.status === 401 || res.status === 403) {
    window.location.href = '/ui/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// ── Error display ─────────────────────────────────────────────────────────────

function showError(msg) {
  const el = $('#pd-error');
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

// ── Panel navigation ──────────────────────────────────────────────────────────

let currentPanel = 'tenants';

function switchPanel(name) {
  currentPanel = name;
  document.querySelectorAll('.pd-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pd-nav-item').forEach(b => b.classList.remove('active'));
  const panel = $(`#panel-${name}`);
  if (panel) panel.classList.add('active');
  document.querySelectorAll(`[data-panel="${name}"]`).forEach(b => b.classList.add('active'));

  if (name === 'tenants') loadTenants();
  if (name === 'users') {
    // Ensure tenants are loaded first (needed for filter dropdown + role lookup)
    if (tenantsCache.length === 0) {
      loadTenants().then(() => loadAllUsers());
    } else {
      loadAllUsers();
    }
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const data = await apiFetch('/api/platform/stats');
    const sv = (id, val) => { const el = $(id); if (el) el.textContent = val ?? '—'; };
    sv('#stat-tenants', data.total_tenants);
    sv('#stat-users', data.total_users);
    sv('#stat-checkins', data.total_checkins_today);
  } catch (e) { /* silently ignored */ }

  // 本日の打刻 card click → 一覧表示
  const cardCheckins = $('#card-checkins');
  if (cardCheckins && !cardCheckins.dataset.bound) {
    cardCheckins.dataset.bound = '1';
    cardCheckins.addEventListener('click', async () => {
      try {
        const data = await apiFetch('/api/platform/today-checkins');
        const items = data?.items || [];
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center;';
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.2);';
        const fmtTime = t => t ? String(t).slice(11, 16) : '—';
        modal.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:18px;color:#0f172a;">本日の打刻一覧（${data.date}）</h3>
            <button type="button" id="closeCheckinModal" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748b;">&times;</button>
          </div>
          <div style="font-size:13px;color:#64748b;margin-bottom:12px;">合計: ${items.length}名</div>
          ${items.length === 0 ? '<p style="text-align:center;color:#64748b;">本日の打刻はありません</p>' : `
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;">氏名</th>
              <th style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;">会社</th>
              <th style="padding:8px;text-align:left;border-bottom:1px solid #e2e8f0;">部署</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;">出勤</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;">退勤</th>
            </tr></thead>
            <tbody>${items.map(r => `<tr>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${r.username || r.email || '—'}</td>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${r.tenantName || '—'}</td>
              <td style="padding:8px;border-bottom:1px solid #f1f5f9;">${r.departmentName || '—'}</td>
              <td style="padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;color:#059669;font-weight:600;">${fmtTime(r.checkIn)}</td>
              <td style="padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;color:#dc2626;">${r.checkOut ? fmtTime(r.checkOut) : '勤務中'}</td>
            </tr>`).join('')}</tbody>
          </table>`}
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        modal.querySelector('#closeCheckinModal')?.addEventListener('click', () => overlay.remove());
      } catch (e) {
        alert('データの取得に失敗しました: ' + (e.message || ''));
      }
    });
  }
}

// ── Tenants ───────────────────────────────────────────────────────────────────

let tenantsCache = [];

function planBadge(plan) {
  const map = { trial: 'badge-trial', basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-pro' };
  return `<span class="badge ${map[plan] || 'badge-basic'}">${plan || 'basic'}</span>`;
}

function statusBadge(status) {
  const map = { active: 'badge-active', suspended: 'badge-suspended', cancelled: 'badge-suspended' };
  return `<span class="badge ${map[status] || 'badge-active'}">${status || 'active'}</span>`;
}

function renderTenants(tenants) {
  const tbody = $('#pd-tenants-tbody');
  const table = $('#pd-tenants-table');
  const loading = $('#pd-tenants-loading');
  if (!tbody) return;

  if (loading) loading.style.display = 'none';
  if (table) table.style.display = '';

  tbody.innerHTML = tenants.map(t => {
    const initial = (t.logo_name || t.name || '?').charAt(0).toUpperCase();
    const logoHtml = t.logo_url
      ? `<img src="${t.logo_url}?v=${Date.now()}" alt="${t.name}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          ><div class="td-logo-placeholder" style="display:none">${initial}</div>`
      : `<div class="td-logo-placeholder">${initial}</div>`;
    const owners = (t.owners || []).map(o => o.username || o.email).join(', ') || '—';
    const address = t.address ? `<div class="td-address">${t.address}</div>` : '';
    const phone = t.phone ? `<div class="td-phone">📞 ${t.phone}${t.fax ? `  FAX: ${t.fax}` : ''}</div>` : '';
    const license = t.license_number ? `<div class="td-license">🏛 ${t.license_number}</div>` : '';
    return `
      <tr>
        <td>
          <div class="td-logo">
            ${logoHtml}
            <div>
              <div class="td-name">${t.name}</div>
              <div class="td-slug">${t.slug} · ${owners}</div>
              ${address}${phone}${license}
            </div>
          </div>
        </td>
        <td>${planBadge(t.plan)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.user_count ?? 0} 人</td>
        <td style="white-space:nowrap">
          <button class="pd-btn pd-btn-sm pd-btn-enter" data-action="enter" data-id="${t.id}" title="${t.name}に入る">
            → 入る
          </button>
          <button class="pd-btn pd-btn-sm pd-btn-ghost" data-action="edit" data-id="${t.id}" style="margin-left:6px">
            編集
          </button>
        </td>
      </tr>`;
  }).join('');

  // Wire buttons
  tbody.querySelectorAll('[data-action="enter"]').forEach(btn => {
    btn.addEventListener('click', () => impersonateTenant(parseInt(btn.dataset.id, 10), btn.title));
  });
  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id, 10)));
  });
}

async function loadTenants() {
  const loading = $('#pd-tenants-loading');
  const table = $('#pd-tenants-table');
  if (loading) loading.style.display = 'block';
  if (table) table.style.display = 'none';
  try {
    const data = await apiFetch('/api/platform/tenants');
    tenantsCache = data.tenants || [];
    renderTenants(tenantsCache);
  } catch (e) {
    showError('テナント読み込みエラー: ' + e.message);
  }
}

// ── All users ─────────────────────────────────────────────────────────────────

let allUsersCache = [];  // flat list of all platform users with their tenant assignments
let usersFilterState = { q: '', tenantId: '', role: '' };

function roleLabelJa(role) {
  const map = { admin: '管理者', manager: 'マネージャー', employee: '従業員', hr: '人事', payroll: '給与担当', owner: '取締役', sysadmin: 'システム管理者' };
  return map[String(role || '').toLowerCase()] || role || '—';
}

// Build tenant tag dropdown HTML inside a cell
function tenantTagsHtml(user) {
  if (!user.tenant_ids) return '<span style="color:#94a3b8;font-size:12px">未割り当て</span>';
  const ids = String(user.tenant_ids).split(',');
  const names = String(user.tenant_names || '').split('||');
  // Get roles from user.tenantAssignments map (populated by loadAllUsers)
  return ids.map((tid, i) => {
    const tname = names[i] || tid;
    const tshort = tname.length > 10 ? tname.slice(0, 10) + '…' : tname;
    const role = (user.tenantRoles || {})[tid] || '?';
    return `<span class="pd-tenant-tag" title="${tname}">
      ${tshort}
      <select class="pd-role-inline" data-user="${user.id}" data-tenant="${tid}" style="font-size:10px;border:none;background:transparent;color:#1e40af;cursor:pointer;padding:0 2px">
        <option value="employee" ${role==='employee'?'selected':''}>従業員</option>
        <option value="manager" ${role==='manager'?'selected':''}>マネージャー</option>
        <option value="admin" ${role==='admin'?'selected':''}>管理者</option>
        <option value="hr" ${role==='hr'?'selected':''}>人事</option>
        <option value="payroll" ${role==='payroll'?'selected':''}>給与</option>
      </select>
      <button class="pd-remove-tenant" data-user="${user.id}" data-tenant="${tid}" title="削除" type="button">×</button>
    </span>`;
  }).join('');
}

async function loadAllUsers() {
  const loading = $('#pd-users-loading');
  const table = $('#pd-users-table');
  const empty = $('#pd-users-empty');
  if (loading) loading.style.display = 'block';
  if (table) table.style.display = 'none';
  if (empty) empty.style.display = 'none';

  try {
    // Load all users platform-wide
    const data = await apiFetch('/api/platform/users');
    const users = data.users || [];

    // Also load per-tenant assignments to get role_in_tenant
    const tenantUserMap = {};  // { userId: { tenantId: role } }
    if (tenantsCache.length > 0) {
      const results = await Promise.all(
        tenantsCache.map(t => apiFetch(`/api/platform/tenants/${t.id}/users`)
          .then(d => ({ tenantId: t.id, users: d.users || [] }))
          .catch(() => ({ tenantId: t.id, users: [] }))
        )
      );
      for (const { tenantId, users: tUsers } of results) {
        for (const u of tUsers) {
          if (!tenantUserMap[u.id]) tenantUserMap[u.id] = {};
          tenantUserMap[u.id][tenantId] = u.role_in_tenant || 'employee';
        }
      }
    }

    // Attach tenantRoles map to each user
    allUsersCache = users.map(u => ({
      ...u,
      tenantRoles: tenantUserMap[u.id] || {},
    }));

    if (loading) loading.style.display = 'none';

    // Populate tenant filter dropdown
    const tenantFilter = $('#pd-users-tenant-filter');
    if (tenantFilter && tenantsCache.length > 0) {
      const current = tenantFilter.value;
      tenantFilter.innerHTML = '<option value="">全テナント</option>' +
        tenantsCache.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      tenantFilter.value = current;
    }

    renderUsersTable();
  } catch (e) {
    if (loading) loading.style.display = 'none';
    showError('ユーザー読み込みエラー: ' + e.message);
  }
}

function renderUsersTable() {
  const tbody = $('#pd-users-tbody');
  const table = $('#pd-users-table');
  const empty = $('#pd-users-empty');
  if (!tbody) return;

  const q = usersFilterState.q.toLowerCase();
  const filterTenant = usersFilterState.tenantId ? parseInt(usersFilterState.tenantId, 10) : null;
  const filterRole = usersFilterState.role;

  let filtered = allUsersCache.filter(u => {
    if (q && !String(u.username || '').toLowerCase().includes(q) && !String(u.email || '').toLowerCase().includes(q)) return false;
    if (filterTenant) {
      const hasInTenant = !!(u.tenantRoles || {})[filterTenant];
      if (!hasInTenant) return false;
    }
    if (filterRole) {
      const roles = Object.values(u.tenantRoles || {});
      if (!roles.includes(filterRole)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if (table) table.style.display = 'none';
    if (empty) empty.style.display = 'block';
    // Remove pagination
    const existingPager = document.querySelector('#pd-users-pager');
    if (existingPager) existingPager.remove();
    return;
  }

  if (table) table.style.display = '';
  if (empty) empty.style.display = 'none';

  // Phân loại theo role group
  const roleOrder = ['sysadmin', 'owner', 'admin', 'manager', 'employee'];
  const roleLabel = { sysadmin: 'システム管理者', owner: 'オーナー', admin: '管理者', manager: 'マネージャー', employee: '従業員' };
  const grouped = {};
  for (const r of roleOrder) grouped[r] = [];
  for (const u of filtered) {
    const r = String(u.role || 'employee').toLowerCase();
    if (grouped[r]) grouped[r].push(u);
    else grouped['employee'].push(u);
  }

  // Pagination: 20 users per page (flat across all groups)
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (!usersFilterState.page || usersFilterState.page > totalPages) usersFilterState.page = 1;
  const page = usersFilterState.page;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // Re-group page items
  const pageGrouped = {};
  for (const r of roleOrder) pageGrouped[r] = [];
  for (const u of pageItems) {
    const r = String(u.role || 'employee').toLowerCase();
    if (pageGrouped[r]) pageGrouped[r].push(u);
    else pageGrouped['employee'].push(u);
  }

  let html = '';
  for (const r of roleOrder) {
    const list = pageGrouped[r];
    if (!list.length) continue;
    const sectionId = `pd-role-section-${r}`;
    html += `<tr class="pd-role-header" data-section="${sectionId}" style="cursor:pointer;user-select:none;">
      <td colspan="6" style="background:#f1f5f9;padding:10px 12px;font-weight:700;font-size:12px;color:#334155;letter-spacing:.5px;border-top:2px solid #e2e8f0;">
        <span class="pd-role-chevron" style="display:inline-block;transition:transform .15s;margin-right:6px;">▶</span>${roleLabel[r] || r}（${grouped[r].length}名）
      </td>
    </tr>`;
    for (const u of list) {
      html += `<tr class="pd-role-row ${sectionId}">
      <td><div style="font-weight:600;font-size:13px">${u.username || '—'}</div></td>
      <td style="color:#64748b;font-size:12px">${u.email || '—'}</td>
      <td><span class="badge badge-basic">${roleLabelJa(u.role)}</span></td>
      <td style="max-width:280px">${tenantTagsHtml(u)}</td>
      <td>${u.employment_status === 'active'
        ? '<span class="badge badge-active">active</span>'
        : `<span class="badge badge-suspended">${u.employment_status || '—'}</span>`}</td>
      <td>
        <button class="pd-btn pd-btn-sm pd-btn-primary pd-assign-quick"
          data-user-id="${u.id}" data-username="${u.username || u.email}"
          type="button" title="テナントに追加">+ 割り当て</button>
      </td>
    </tr>`;
    }
  }
  tbody.innerHTML = html;

  // Accordion: click header → toggle rows
  tbody.querySelectorAll('.pd-role-header').forEach(header => {
    header.addEventListener('click', () => {
      const sectionId = header.dataset.section;
      const rows = tbody.querySelectorAll(`.${sectionId}`);
      const chevron = header.querySelector('.pd-role-chevron');
      const isHidden = rows[0]?.style.display === 'none';
      rows.forEach(row => { row.style.display = isHidden ? '' : 'none'; });
      if (chevron) chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    });
    // Default: expand all
    const chevron = header.querySelector('.pd-role-chevron');
    if (chevron) chevron.style.transform = 'rotate(90deg)';
  });
  // Pagination UI
  let pager = document.querySelector('#pd-users-pager');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'pd-users-pager';
    pager.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:12px;padding:16px 0;font-size:13px;';
    table.parentElement.appendChild(pager);
  }
  pager.innerHTML = totalPages > 1 ? `
    <button type="button" class="pd-btn pd-btn-sm" id="pd-pager-prev" ${page <= 1 ? 'disabled style="opacity:.4;cursor:not-allowed;"' : ''}>前へ</button>
    <span style="color:#475569;">${page} / ${totalPages} ページ（全${filtered.length}件）</span>
    <button type="button" class="pd-btn pd-btn-sm" id="pd-pager-next" ${page >= totalPages ? 'disabled style="opacity:.4;cursor:not-allowed;"' : ''}>次へ</button>
  ` : `<span style="color:#64748b;">全${filtered.length}件</span>`;
  pager.querySelector('#pd-pager-prev')?.addEventListener('click', () => { usersFilterState.page = Math.max(1, page - 1); renderUsersTable(); });
  pager.querySelector('#pd-pager-next')?.addEventListener('click', () => { usersFilterState.page = Math.min(totalPages, page + 1); renderUsersTable(); });

  // Wire: role change inline
  tbody.querySelectorAll('.pd-role-inline').forEach(sel => {
    sel.addEventListener('change', async () => {
      const userId = parseInt(sel.dataset.user, 10);
      const tenantId = parseInt(sel.dataset.tenant, 10);
      const role = sel.value;
      try {
        await apiFetch(`/api/platform/tenants/${tenantId}/users/${userId}`, {
          method: 'PATCH', body: JSON.stringify({ role_in_tenant: role })
        });
        // Update cache silently
        const u = allUsersCache.find(x => x.id === userId);
        if (u && u.tenantRoles) u.tenantRoles[tenantId] = role;
      } catch (e) {
        showError('ロール更新エラー: ' + e.message);
        await loadAllUsers();
      }
    });
  });

  // Wire: remove from tenant
  tbody.querySelectorAll('.pd-remove-tenant').forEach(btn => {
    btn.addEventListener('click', () => removeUserFromTenant(
      parseInt(btn.dataset.user, 10),
      parseInt(btn.dataset.tenant, 10)
    ));
  });

  // Wire: quick assign button
  tbody.querySelectorAll('.pd-assign-quick').forEach(btn => {
    btn.addEventListener('click', () => openAssignModal(
      parseInt(btn.dataset.userId, 10),
      btn.dataset.username
    ));
  });
}

async function removeUserFromTenant(userId, tenantId) {
  const u = allUsersCache.find(x => x.id === userId);
  const t = tenantsCache.find(x => x.id === tenantId);
  const uname = u?.username || u?.email || `User ${userId}`;
  const tname = t?.name || `Tenant ${tenantId}`;
  if (!confirm(`「${uname}」を「${tname}」から削除しますか？`)) return;
  try {
    await apiFetch(`/api/platform/tenants/${tenantId}/users/${userId}`, { method: 'DELETE' });
    await loadAllUsers();
    await loadStats();
  } catch (e) {
    showError('削除エラー: ' + e.message);
  }
}

// ── Assign modal ──────────────────────────────────────────────────────────────

let assignSearchTimer = null;
let assignSelectedUser = null;

function openAssignModal(prefillUserId = null, prefillUsername = '') {
  const modal = $('#pd-assign-modal');
  if (!modal) return;

  // Reset form
  assignSelectedUser = null;
  $('#pd-assign-user-search').value = '';
  $('#pd-assign-user-results').style.display = 'none';
  $('#pd-assign-user-results').innerHTML = '';
  $('#pd-assign-selected-user').style.display = 'none';
  $('#pd-assign-selected-user').innerHTML = '';
  $('#pd-assign-user-id-hidden').value = '';
  $('#pd-assign-role-select').value = 'employee';
  $('#pd-assign-error').style.display = 'none';

  // Populate tenant dropdown
  const tenantSel = $('#pd-assign-tenant-select');
  tenantSel.innerHTML = '<option value="">選択してください</option>' +
    tenantsCache.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  // Prefill user if called from quick-assign button
  if (prefillUserId) {
    const u = allUsersCache.find(x => x.id === prefillUserId);
    if (u) {
      assignSelectedUser = u;
      $('#pd-assign-user-id-hidden').value = u.id;
      showSelectedUser(u);
    }
  }

  modal.removeAttribute('hidden');
  if (!prefillUserId) setTimeout(() => $('#pd-assign-user-search')?.focus(), 80);
}

function showSelectedUser(u) {
  const el = $('#pd-assign-selected-user');
  const search = $('#pd-assign-user-search');
  const results = $('#pd-assign-user-results');
  if (el) {
    el.innerHTML = `<span>✓ <strong>${u.username || u.email}</strong> <span style="color:#64748b">${u.email}</span></span>
      <button type="button" id="pd-clear-user" title="クリア">×</button>`;
    el.style.display = 'flex';
    const clear = el.querySelector('#pd-clear-user');
    if (clear) clear.addEventListener('click', () => {
      assignSelectedUser = null;
      $('#pd-assign-user-id-hidden').value = '';
      el.style.display = 'none';
      if (search) { search.value = ''; search.focus(); }
    });
  }
  if (search) search.style.display = 'none';
  if (results) results.style.display = 'none';
}

function closeAssignModal() {
  const modal = $('#pd-assign-modal');
  if (modal) modal.setAttribute('hidden', '');
  assignSelectedUser = null;
  const search = $('#pd-assign-user-search');
  if (search) search.style.display = '';
}

async function handleAssignSubmit(e) {
  e.preventDefault();
  const errEl = $('#pd-assign-error');
  if (errEl) errEl.style.display = 'none';

  const userId = parseInt($('#pd-assign-user-id-hidden').value || '0', 10);
  const tenantId = parseInt($('#pd-assign-tenant-select').value || '0', 10);
  const role = $('#pd-assign-role-select').value;

  if (!userId) {
    if (errEl) { errEl.textContent = 'ユーザーを選択してください'; errEl.style.display = 'block'; }
    return;
  }
  if (!tenantId) {
    if (errEl) { errEl.textContent = 'テナントを選択してください'; errEl.style.display = 'block'; }
    return;
  }

  const submitBtn = $('#pd-assign-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '処理中...'; }

  try {
    await apiFetch(`/api/platform/tenants/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_in_tenant: role }),
    });
    closeAssignModal();
    await loadAllUsers();
    await loadStats();
    await loadTenants(); // refresh user_count in tenant list
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '割り当て'; }
  }
}

// ── Impersonate (enter tenant as admin) ───────────────────────────────────────

async function impersonateTenant(tenantId, tenantName) {
  if (!confirm(`「${tenantName}」の管理者として入りますか？`)) return;
  try {
    const data = await apiFetch('/api/platform/impersonate', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    // Save new scoped token to BOTH sessionStorage and localStorage
    // so all admin page auth guards can find it
    sessionStorage.setItem('accessToken', data.accessToken);
    try { localStorage.setItem('accessToken', data.accessToken); } catch (e) { /* silently ignored */ }

    // Update user object with tenant context + impersonate flag
    const newUser = {
      role: 'admin',
      tenantId: data.tenantId,
      tenantName: data.tenantName,
      tenantLogo: data.tenantLogo,
      tenantLogoName: data.tenantLogoName,
      _impersonate: true,
      _sysadmin: true,
      _platformReturn: '/platform/dashboard',
    };
    try {
      const existing = JSON.parse(sessionStorage.getItem('user') || '{}');
      const merged = JSON.stringify({ ...existing, ...newUser });
      sessionStorage.setItem('user', merged);
      localStorage.setItem('user', merged);
    } catch (e) { /* silently ignored */ }
    // Tab-scoped context: lưu tenantId riêng cho tab này (impersonate)
    try {
      const { setTabContext } = await import('/static/js/api/tab-context.js');
      setTabContext({ tenantId: data.tenantId, tenantName: data.tenantName, role: 'admin', userId: null });
    } catch (e) { /* bỏ qua */ }

    // Small delay to ensure storage is written before navigation
    await new Promise(r => setTimeout(r, 80));
    window.location.href = data.nextPath || '/admin/dashboard';
  } catch (e) {
    showError('エラー: ' + e.message);
  }
}

// ── Tenant modal ──────────────────────────────────────────────────────────────

function openCreateModal() {
  const modal = $('#pd-tenant-modal');
  if (!modal) return;
  $('#pd-modal-title').textContent = '新規テナント';
  $('#pd-tenant-id').value = '';
  $('#pd-f-name').value = '';
  $('#pd-f-slug').value = '';
  $('#pd-f-logo-name').value = '';
  $('#pd-f-logo-url').value = '';
  $('#pd-f-plan').value = 'basic';
  $('#pd-f-status').value = 'active';
  const ferr = $('#pd-form-error');
  if (ferr) ferr.style.display = 'none';
  modal.removeAttribute('hidden');
  $('#pd-f-name').focus();
}

function openEditModal(tenantId) {
  const t = tenantsCache.find(x => x.id === tenantId);
  if (!t) return;
  const modal = $('#pd-tenant-modal');
  if (!modal) return;
  $('#pd-modal-title').textContent = 'テナント編集';
  $('#pd-tenant-id').value = t.id;
  $('#pd-f-name').value = t.name || '';
  $('#pd-f-slug').value = t.slug || '';
  $('#pd-f-logo-name').value = t.logo_name || '';
  $('#pd-f-logo-url').value = t.logo_url || '';
  $('#pd-f-plan').value = t.plan || 'basic';
  $('#pd-f-status').value = t.status || 'active';
  const ferr = $('#pd-form-error');
  if (ferr) ferr.style.display = 'none';
  modal.removeAttribute('hidden');
  $('#pd-f-name').focus();
}

function closeModal() {
  const modal = $('#pd-tenant-modal');
  if (modal) modal.setAttribute('hidden', '');
}

async function handleTenantFormSubmit(e) {
  e.preventDefault();
  const ferr = $('#pd-form-error');
  if (ferr) ferr.style.display = 'none';

  const id = $('#pd-tenant-id').value;
  const body = {
    name: $('#pd-f-name').value.trim(),
    slug: $('#pd-f-slug').value.trim().toLowerCase(),
    logo_name: $('#pd-f-logo-name').value.trim(),
    logo_url: $('#pd-f-logo-url').value.trim(),
    plan: $('#pd-f-plan').value,
    status: $('#pd-f-status').value,
  };

  if (!body.name || !body.slug) {
    if (ferr) { ferr.textContent = '会社名とスラッグは必須です'; ferr.style.display = 'block'; }
    return;
  }

  const submitBtn = $('#pd-modal-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '保存中...'; }

  try {
    if (id) {
      await apiFetch(`/api/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await apiFetch('/api/platform/tenants', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    await loadTenants();
    await loadStats();
  } catch (err) {
    if (ferr) { ferr.textContent = err.message; ferr.style.display = 'block'; }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '保存'; }
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function handleLogout() {
  try {
    const csrf = getCookie('csrfToken');
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' },
      credentials: 'include',
    });
  } catch (e) { /* silently ignored */ }
  try { sessionStorage.clear(); } catch (e) { /* silently ignored */ }
  window.location.href = '/ui/login';
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Verify sysadmin
  const token = getToken();
  if (!token) { window.location.href = '/ui/login'; return; }
  try {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.role !== 'sysadmin' && !user._sysadmin) { window.location.href = '/ui/login'; return; }
    const nameEl = $('#pd-user-name');
    if (nameEl) nameEl.textContent = user.username || user.email || 'Sysadmin';
  } catch (e) { /* silently ignored */ }

  // Wire sidebar nav
  document.querySelectorAll('.pd-nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
  });

  // Wire tenant modal
  $('#pd-add-tenant-btn')?.addEventListener('click', openCreateModal);
  $('#pd-modal-cancel')?.addEventListener('click', closeModal);
  $('#pd-tenant-form')?.addEventListener('submit', handleTenantFormSubmit);
  $('#pd-tenant-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#pd-tenant-modal')) closeModal();
  });

  // Wire assign modal
  $('#pd-assign-user-btn')?.addEventListener('click', () => openAssignModal());
  $('#pd-assign-cancel')?.addEventListener('click', closeAssignModal);
  $('#pd-assign-form')?.addEventListener('submit', handleAssignSubmit);
  $('#pd-assign-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#pd-assign-modal')) closeAssignModal();
  });

  // Wire user search in assign modal
  $('#pd-assign-user-search')?.addEventListener('input', (e) => {
    clearTimeout(assignSearchTimer);
    const q = e.target.value.trim().toLowerCase();
    if (!q) { $('#pd-assign-user-results').style.display = 'none'; return; }
    assignSearchTimer = setTimeout(() => {
      const matches = allUsersCache.filter(u =>
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      ).slice(0, 8);
      const results = $('#pd-assign-user-results');
      if (!results) return;
      if (matches.length === 0) {
        results.innerHTML = '<div class="pd-assign-result-item" style="color:#94a3b8">該当なし</div>';
      } else {
        results.innerHTML = matches.map(u => `
          <div class="pd-assign-result-item" data-id="${u.id}">
            <span class="pd-assign-result-name">${u.username || '—'}</span>
            <span class="pd-assign-result-email">${u.email}</span>
          </div>`).join('');
        results.querySelectorAll('[data-id]').forEach(item => {
          item.addEventListener('click', () => {
            const u = allUsersCache.find(x => x.id === parseInt(item.dataset.id, 10));
            if (!u) return;
            assignSelectedUser = u;
            $('#pd-assign-user-id-hidden').value = u.id;
            showSelectedUser(u);
          });
        });
      }
      results.style.display = 'block';
    }, 200);
  });

  // Wire search/filter in users panel
  $('#pd-users-search')?.addEventListener('input', (e) => {
    usersFilterState.q = e.target.value.trim();
    usersFilterState.page = 1;
    renderUsersTable();
  });
  $('#pd-users-tenant-filter')?.addEventListener('change', (e) => {
    usersFilterState.tenantId = e.target.value;
    usersFilterState.page = 1;
    renderUsersTable();
  });
  $('#pd-users-role-filter')?.addEventListener('change', (e) => {
    usersFilterState.role = e.target.value;
    usersFilterState.page = 1;
    renderUsersTable();
  });

  // Wire logout
  $('#pd-logout-btn')?.addEventListener('click', handleLogout);

  // Initial load
  await loadStats();
  await loadTenants();
  await loadAllUsers();
});
