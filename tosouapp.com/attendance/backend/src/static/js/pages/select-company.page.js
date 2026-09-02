/**
 * select-company.page.js
 * Xử lý màn hình chọn công ty hiển thị sau khi đăng nhập khi bật chế độ nhiều công ty (multi-tenant).
 *
 * Luồng:
 * 1. Đọc danh sách tenant + accessToken từ sessionStorage (được login.page.js lưu)
 * 2. Render các thẻ công ty kèm logo
 * 3. Khi click → POST /api/auth/select-tenant → lấy JWT mới theo tenant
 * 4. Lưu token mới → chuyển hướng vào app
 */

const $ = (sel) => document.querySelector(sel);

// ── Hàm hỗ trợ ──────────────────────────────────────────────────────────────

// Ưu tiên sessionStorage, fallback sang localStorage
// để token còn giữ được khi popup lưu mật khẩu của Chrome làm mất focus
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

// ── Render danh sách công ty ────────────────────────────────────────────────

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

  // Gắn sự kiện click
  grid.querySelectorAll('.sc-company-btn').forEach(btn => {
    btn.addEventListener('click', () => handleSelectTenant(btn));
  });
}

// ── Chọn tenant ─────────────────────────────────────────────────────────────

async function handleSelectTenant(btn) {
  setError('');
  const tenantId = parseInt(btn.dataset.tenantId, 10);
  if (!tenantId) { setError('tenant ID missing'); return; }

  // Hiện spinner trên nút vừa bấm
  btn.classList.add('loading');
  btn.setAttribute('aria-busy', 'true');

  // Khóa tất cả các nút trong lúc xử lý
  $('#sc-grid').querySelectorAll('.sc-company-btn').forEach(b => {
    if (b !== btn) b.disabled = true;
  });

  try {
    const accessToken = getToken();
    const csrf = getCookie('csrfToken');

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

    if (!res.ok) {
      throw new Error(data?.message || `HTTP ${res.status}`);
    }

    // Lưu token theo tenant và thông tin tenant
    sessionStorage.setItem('accessToken', data.accessToken);
    try { localStorage.setItem('accessToken', data.accessToken); } catch (e) { /* bỏ qua lỗi */ }
    // Context riêng theo tab: lưu tenantId riêng cho tab này
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
    } catch (e) { /* bỏ qua lỗi */ }

    // Xóa TẤT CẢ dữ liệu admin đã cache để tránh lẫn dữ liệu giữa các tenant
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('monthly.cache.') || k.startsWith('admin.') || k === 'navSpinner')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) { /* bỏ qua lỗi */ }
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('monthly.cache.') || k.startsWith('monthly.') || k.startsWith('admin.'))) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) { /* bỏ qua lỗi */ }
    // Chuyển hướng vào app
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

// ── Đăng xuất ───────────────────────────────────────────────────────────────

async function handleLogout() {
  try {
    const csrf = getCookie('csrfToken');
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' },
      credentials: 'include',
    });
  } catch (e) { /* bỏ qua lỗi */ }
  try { sessionStorage.clear(); } catch (e) { /* bỏ qua lỗi */ }
  try { localStorage.removeItem('user'); localStorage.removeItem('refreshToken'); } catch (e) { /* bỏ qua lỗi */ }
  window.location.href = '/ui/login';
}

// ── Chọn trực tiếp (không render UI) ─────────────────────────────────────────

async function handleSelectTenant_direct(tenant) {
  if (!tenant || !tenant.id) {
    window.location.href = '/ui/portal';
    return;
  }
  try {
    const accessToken = getToken();
    const csrf = getCookie('csrfToken');
    const res = await fetch('/api/auth/select-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'X-CSRF-Token': csrf || '',
      },
      credentials: 'include',
      body: JSON.stringify({ tenant_id: tenant.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

    sessionStorage.setItem('accessToken', data.accessToken);
    try { localStorage.setItem('accessToken', data.accessToken); } catch (e) {}
    try {
      const { setTabContext } = await import('/static/js/api/tab-context.js');
      setTabContext({ tenantId: data.tenantId, tenantName: data.tenantName, role: data.role, userId: data.userId || null });
    } catch (e) {}
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
    } catch (e) {}

    const next = data.nextPath || '/ui/portal';
    window.location.href = next;
  } catch (e) {
    // Fallback: vẫn vào portal
    window.location.href = '/ui/portal';
  }
}

// ── Khởi động ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Đọc danh sách tenant từ sessionStorage (được login.page.js lưu khi đăng nhập thành công)
  // Fallback sang localStorage phòng khi popup Chrome làm sessionStorage bị xóa
  let tenants = [];
  let username = '';
  let userRole = 'employee';
  try {
    const raw = sessionStorage.getItem('sc_tenants')
      || localStorage.getItem('sc_tenants');
    if (raw) tenants = JSON.parse(raw);
    // Khôi phục lại vào sessionStorage nếu đã bị xóa
    if (!sessionStorage.getItem('sc_tenants') && raw) {
      try { sessionStorage.setItem('sc_tenants', raw); } catch (e) { /* bỏ qua lỗi */ }
    }
    // Khôi phục accessToken nếu bị xóa
    const lsToken = localStorage.getItem('accessToken');
    if (!sessionStorage.getItem('accessToken') && lsToken) {
      try { sessionStorage.setItem('accessToken', lsToken); } catch (e) { /* bỏ qua lỗi */ }
    }
    const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      username = u.username || u.email || '';
      userRole = u.role || 'employee';
    }
  } catch (e) { /* bỏ qua lỗi */ }

  // Nếu không có tenant trong session → người dùng vào thẳng đây mà chưa đăng nhập
  if (!tenants || tenants.length === 0) {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      window.location.href = '/ui/login';
      return;
    }
    // Thử lấy danh sách tenant từ API bằng token hiện tại
    fetchTenantsFromAPI();
    return;
  }

  // Tự động chọn nếu người dùng là nhân viên hoặc chỉ có 1 tenant
  // Bỏ qua render hoàn toàn — đi thẳng luôn
  if (tenants.length === 1 || userRole === 'employee') {
    showPageSpinner();
    // Ẩn toàn bộ nội dung trang để tránh nhấp nháy logo
    const container = $('#sc-container') || document.querySelector('.sc-container');
    if (container) container.style.display = 'none';
    document.body.style.background = '#f8fafc';
    // Gọi thẳng API select-tenant mà không render các thẻ
    handleSelectTenant_direct(tenants[0]);
    return;
  }

  hidePageSpinner();
  // Chỉ hiện wrapper khi người dùng cần chọn công ty
  const scWrapper = document.querySelector('.sc-wrapper');
  if (scWrapper) scWrapper.style.visibility = 'visible';
  renderGrid(tenants, username);

  // Gắn sự kiện cho nút đăng xuất
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

    try { sessionStorage.setItem('sc_tenants', JSON.stringify(tenants)); } catch (e) { /* bỏ qua lỗi */ }
    
    if (tenants.length === 1 || userRole === 'employee') {
      showPageSpinner();
      const container = $('#sc-container') || document.querySelector('.sc-container');
      if (container) container.style.display = 'none';
      handleSelectTenant_direct(tenants[0]);
      return;
    }

    hidePageSpinner();
    const scWrapper2 = document.querySelector('.sc-wrapper');
    if (scWrapper2) scWrapper2.style.visibility = 'visible';
    renderGrid(tenants, username);
    const logoutBtn = $('#sc-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  } catch (e) {
    window.location.href = '/ui/login';
  }
}

