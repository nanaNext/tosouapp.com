/**
 * select-company.page.js
 * Handles the company selection screen shown after login when multi-tenant is enabled.
 *
 * Flow:
 * 1. Read tenants + accessToken from sessionStorage (set by login.page.js)
 * 2. Render company cards with logos
 * 3. On click → POST /api/auth/select-tenant → get new tenant-scoped JWT
 * 4. Save new token → redirect to app
 */

const $ = (sel) => document.querySelector(sel);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Try sessionStorage first, fallback to localStorage
// so token survives Chrome password popup focus changes
function getToken() {
  return sessionStorage.getItem('accessToken')
    || localStorage.getItem('accessToken')
    || '';
}

function getCookie(name) {
  try {
    return document.cookie.split(';').map(c => c.trim())
      .find(c => c.startsWith(name + '='))
      ?.split('=')[1] || '';
  } catch (e) { return ''; }
}

function setError(msg) {
  const el = $('#sc-error');
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

function showPageSpinner() {
  const el = $('#sc-page-spinner');
  if (el) el.removeAttribute('hidden');
}

function hidePageSpinner() {
  const el = $('#sc-page-spinner');
  if (el) el.setAttribute('hidden', '');
}

function roleLabel(role) {
  const map = {
    admin: '管理者',
    manager: 'マネージャー',
    employee: '従業員',
    hr: '人事担当',
    payroll: '給与担当',
    sysadmin: 'システム管理者',
    owner: '取締役',
  };
  return map[String(role || '').toLowerCase()] || role || '';
}

// ── Render companies ──────────────────────────────────────────────────────────

function renderGrid(tenants, username) {
  const grid = $('#sc-grid');
  if (!grid) return;

  if (!tenants || tenants.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;color:#94a3b8;padding:32px 0;font-size:14px;">
        アクセス可能な会社が見つかりませんでした。<br>
        管理者にお問い合わせください。
      </div>`;
    return;
  }

  const greeting = $('#sc-greeting');
  if (greeting && username) {
    greeting.textContent = `ようこそ、${username} さん`;
  }

  grid.innerHTML = tenants.map((t) => {
    const bust = Date.now();
    const logoHtml = t.logo_url
      ? `<img src="${t.logo_url}?v=${bust}" alt="${t.name}" class="sc-logo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="sc-logo-placeholder" style="display:none">${(t.logo_name || t.name || '').charAt(0)}</div>`
      : `<div class="sc-logo-placeholder">${(t.logo_name || t.name || '').charAt(0)}</div>`;

    return `
      <button
        class="sc-company-btn"
        data-tenant-id="${t.id}"
        data-role="${t.role || 'employee'}"
        type="button"
        aria-label="${t.name}を選択"
      >
        <div class="sc-logo-wrap">${logoHtml}</div>
        <span class="sc-company-name">${t.name}</span>
        <span class="sc-company-role">${roleLabel(t.role)}</span>
        <div class="sc-btn-spinner" aria-hidden="true"></div>
      </button>`;
  }).join('');

  // Wire click handlers
  grid.querySelectorAll('.sc-company-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSelectTenant(btn));
  });
}

// ── Select tenant ─────────────────────────────────────────────────────────────

async function handleSelectTenant(btn) {
  setError('');
  const tenantId = parseInt(btn.dataset.tenantId, 10);
  if (!tenantId) { setError('tenant ID missing'); return; }

  // Show spinner on clicked button
  btn.classList.add('loading');
  btn.setAttribute('aria-busy', 'true');

  // Disable all buttons while processing
  $('#sc-grid').querySelectorAll('.sc-company-btn').forEach(b => {
    if (b !== btn) b.disabled = true;
  });

  try {
    const accessToken = getToken();
    const csrf = getCookie('csrfToken');

    console.log('[select-tenant] tenantId=', tenantId, 'hasToken=', !!accessToken, 'hasCsrf=', !!csrf);

    const res = await fetch('/api/auth/select-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'X-CSRF-Token': csrf || '',
      },
      credentials: 'include',
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    const data = await res.json();
    console.log('[select-tenant] status=', res.status, 'data=', JSON.stringify(data));

    if (!res.ok) {
      throw new Error(data?.message || `HTTP ${res.status}`);
    }

    // Save tenant-scoped token and tenant info
    sessionStorage.setItem('accessToken', data.accessToken);
    try { localStorage.setItem('accessToken', data.accessToken); } catch (e) { /* silently ignored */ }
    // Tab-scoped context: lưu tenantId riêng cho tab này
    try {
      const { setTabContext } = await import('/static/js/api/tab-context.js');
      setTabContext({ tenantId: data.tenantId, tenantName: data.tenantName, role: data.role, userId: data.userId || null });
    } catch (e) { /* tab-context không khả dụng — bỏ qua */ }
    try {
      const existingUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const newUser = JSON.stringify({
        ...existingUser,
        role: data.role,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        tenantLogo: data.tenantLogo,
        tenantLogoName: data.tenantLogoName,
        tenantColor: data.tenantColor,
      });
      sessionStorage.setItem('user', newUser);
      localStorage.setItem('user', newUser);
    } catch (e) { /* silently ignored */ }

    // Clear ALL cached admin data to prevent cross-tenant data bleed
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('monthly.cache.') || k.startsWith('admin.') || k === 'navSpinner')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) { /* silently ignored */ }
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('monthly.cache.') || k.startsWith('monthly.') || k.startsWith('admin.'))) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) { /* silently ignored */ }
    // Navigate to app
    showPageSpinner();
    const next = data.nextPath || '/ui/portal';
    window.location.href = next;

  } catch (err) {
    btn.classList.remove('loading');
    btn.removeAttribute('aria-busy');
    $('#sc-grid').querySelectorAll('.sc-company-btn').forEach(b => { b.disabled = false; });

    const msg = String(err.message || '');
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      setError('セッションが切れました。再度ログインしてください。');
      setTimeout(() => { window.location.href = '/ui/login'; }, 2000);
    } else if (msg.includes('403') || msg.includes('Forbidden')) {
      setError('この会社へのアクセス権がありません。');
    } else {
      setError('エラーが発生しました: ' + msg);
    }
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
  try { localStorage.removeItem('user'); localStorage.removeItem('refreshToken'); } catch (e) { /* silently ignored */ }
  window.location.href = '/ui/login';
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Read tenants from sessionStorage (saved by login.page.js on successful login)
  // Fallback to localStorage in case Chrome popup caused sessionStorage to be cleared
  let tenants = [];
  let username = '';
  let userRole = 'employee';
  try {
    const raw = sessionStorage.getItem('sc_tenants')
      || localStorage.getItem('sc_tenants');
    if (raw) tenants = JSON.parse(raw);
    // Restore to sessionStorage if it was cleared
    if (!sessionStorage.getItem('sc_tenants') && raw) {
      try { sessionStorage.setItem('sc_tenants', raw); } catch (e) { /* silently ignored */ }
    }
    // Restore accessToken if cleared
    const lsToken = localStorage.getItem('accessToken');
    if (!sessionStorage.getItem('accessToken') && lsToken) {
      try { sessionStorage.setItem('accessToken', lsToken); } catch (e) { /* silently ignored */ }
    }
    const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      username = u.username || u.email || '';
      userRole = u.role || 'employee';
    }
  } catch (e) { /* silently ignored */ }

  // If no tenants in session → user came here directly without login
  if (!tenants || tenants.length === 0) {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      window.location.href = '/ui/login';
      return;
    }
    // Try to fetch tenants from API using current token
    fetchTenantsFromAPI();
    return;
  }

  // Auto-select if user is an employee or has only 1 tenant
  if (tenants.length === 1 || userRole === 'employee') {
    showPageSpinner();
    renderGrid(tenants, username);
    const firstBtn = document.querySelector('.sc-company-btn');
    if (firstBtn) {
      firstBtn.click();
      return;
    }
  }

  hidePageSpinner();
  renderGrid(tenants, username);

  // Wire logout button
  const logoutBtn = $('#sc-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

async function fetchTenantsFromAPI() {
  try {
    const accessToken = sessionStorage.getItem('accessToken') || '';
    const csrf = getCookie('csrfToken');
    const res = await fetch('/api/auth/my-tenants', {
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'X-CSRF-Token': csrf || '',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      window.location.href = '/ui/login';
      return;
    }
    const data = await res.json();
    const tenants = data.tenants || [];
    const username = data.username || '';
    
    let userRole = 'employee';
    try {
      const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        userRole = u.role || 'employee';
      }
    } catch(e) {}

    try { sessionStorage.setItem('sc_tenants', JSON.stringify(tenants)); } catch (e) { /* silently ignored */ }
    
    if (tenants.length === 1 || userRole === 'employee') {
      showPageSpinner();
      renderGrid(tenants, username);
      const firstBtn = document.querySelector('.sc-company-btn');
      if (firstBtn) {
        firstBtn.click();
        return;
      }
    }

    hidePageSpinner();
    renderGrid(tenants, username);
    const logoutBtn = $('#sc-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } catch (e) {
    window.location.href = '/ui/login';
  }
}

