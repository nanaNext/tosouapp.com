/**
 * admin-ui.utils.js
 * UI wiring utilities cho admin: user menu, search, mobile drawer, topbar.
 * Tách ra từ admin.page.js để dễ bảo trì.
 */

/**
 * @param {Function} logoutFn - hàm logout từ auth.api.js
 */
export const wireUserMenu = (logoutFn) => {
  try {
    const btn = document.querySelector('.user-btn');
    const dd = document.querySelector('#userDropdown');
    if (!btn || !dd) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const hidden = dd.hasAttribute('hidden');
      if (hidden) dd.removeAttribute('hidden');
      else dd.setAttribute('hidden', '');
      try { btn.setAttribute('aria-expanded', hidden ? 'true' : 'false'); } catch (e) { /* bỏ qua lỗi */ }
    });
    document.addEventListener('click', (e) => {
      const t = e && e.target;
      if (t && t.closest && t.closest('.user-menu')) return;
      dd.setAttribute('hidden', '');
      try { btn.setAttribute('aria-expanded', 'false'); } catch (e) { /* bỏ qua lỗi */ }
    });
  } catch (e) { /* bỏ qua lỗi */ }
  try {
    const btnLogout = document.querySelector('#btnLogout');
    if (!btnLogout || btnLogout.dataset.bound === '1') return;
    btnLogout.dataset.bound = '1';
    btnLogout.addEventListener('click', async () => {
      try { await logoutFn(); } catch (e) { /* bỏ qua lỗi */ }
      try {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
      } catch (e) { /* bỏ qua lỗi */ }
      try {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } catch (e) { /* bỏ qua lỗi */ }
      try { window.location.replace('/ui/login'); } catch { window.location.href = '/ui/login'; }
    });
  } catch (e) { /* bỏ qua lỗi */ }
};

export const wireExpandingSearch = () => {
  try {
    const box = document.querySelector('.topbar-inner .search');
    if (!box) return;
    if (box.dataset.bound === '1') return;
    box.dataset.bound = '1';
    const input = box.querySelector('input[type="search"]');
    const closeBtn = box.querySelector('.search-close');
    const hint = box.querySelector('.search-hint');
    const prefixTxt = box.querySelector('.search-prefix .txt');
    const originalPlaceholder = input ? String(input.getAttribute('placeholder') || '') : '';
    const open = () => {
      try {
        const inner = box.closest('.topbar-inner');
        const brand = inner ? inner.querySelector('.brand, a.brand') : null;
        const actions = inner ? inner.querySelector('.topbar-actions') : null;
        const user = inner ? inner.querySelector('.user') : null;
        if (inner && !inner.dataset.searchLocked) {
          const bw = brand ? Math.round(brand.getBoundingClientRect().width) : 0;
          const aw = actions ? Math.round(actions.getBoundingClientRect().width) : 0;
          const uw = user ? Math.round(user.getBoundingClientRect().width) : 0;
          inner.style.gridTemplateColumns = `${bw || 'auto'} 1fr ${aw || 'auto'} ${uw || 'auto'}`;
          inner.dataset.searchLocked = '1';
        }
      } catch (e) { /* bỏ qua lỗi */ }
      box.classList.add('active');
      try {
        if (input) {
          input.setAttribute('placeholder', 'Search your workspace for a project, resource, environment...');
          input.focus(); input.select();
        }
        if (prefixTxt) prefixTxt.textContent = 'Search';
      } catch (e) { /* bỏ qua lỗi */ }
    };
    const close = () => {
      box.classList.remove('active');
      try {
        const inner = box.closest('.topbar-inner');
        if (inner && inner.dataset.searchLocked === '1') {
          inner.style.gridTemplateColumns = '';
          delete inner.dataset.searchLocked;
        }
      } catch (e) { /* bỏ qua lỗi */ }
      try {
        if (input) {
          if (originalPlaceholder) input.setAttribute('placeholder', originalPlaceholder);
          input.blur();
        }
        if (prefixTxt) prefixTxt.textContent = 'Projects';
      } catch (e) { /* bỏ qua lỗi */ }
    };
    input.addEventListener('focus', open);
    if (hint) hint.addEventListener('click', (e) => { e.preventDefault(); open(); });
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
      closeBtn.addEventListener('mousedown', (e) => { e.preventDefault(); close(); }, true);
    }
    document.addEventListener('click', (e) => {
      const t = e && e.target;
      if (t && t.closest && t.closest('.search-close')) { e.preventDefault(); close(); return; }
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      const isCtrlK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
      const isPlainK = (e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
      if (isCtrlK || isPlainK) {
        const t = e.target;
        const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
        const editable = (t && (t.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));
        if (editable && !isCtrlK) return;
        e.preventDefault();
        open();
      }
    });
    document.addEventListener('click', (e) => {
      if (!box.classList.contains('active')) return;
      const t = e && e.target;
      if (t && t.closest && t.closest('.topbar-inner .search')) return;
      close();
    });
  } catch (e) { /* bỏ qua lỗi */ }
};

export const wireMobileDrawer = () => {
  try {
    const btn = document.querySelector('#mobileMenuBtn');
    const drawer = document.querySelector('#mobileDrawer');
    const backdrop = document.querySelector('#drawerBackdrop');
    const closeBtn = document.querySelector('#mobileClose');
    if (!btn || !drawer || !backdrop) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    let closeTimer;

    const open = () => {
      if (closeTimer) clearTimeout(closeTimer);
      try { drawer.removeAttribute('hidden'); } catch (e) { /* bỏ qua lỗi */ }
      try { backdrop.removeAttribute('hidden'); } catch (e) { /* bỏ qua lỗi */ }
      try { drawer.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
      try { drawer.style.removeProperty('display'); } catch (e) { /* bỏ qua lỗi */ }
      try { drawer.style.removeProperty('pointer-events'); } catch (e) { /* bỏ qua lỗi */ }
      try { backdrop.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
      try { backdrop.style.removeProperty('display'); } catch (e) { /* bỏ qua lỗi */ }
      try { backdrop.style.removeProperty('pointer-events'); } catch (e) { /* bỏ qua lỗi */ }
      try { document.body.classList.add('drawer-open'); } catch (e) { /* bỏ qua lỗi */ }
      try { btn.setAttribute('aria-expanded', 'true'); } catch (e) { /* bỏ qua lỗi */ }
    };
    const close = () => {
      try { document.body.classList.remove('drawer-open'); } catch (e) { /* bỏ qua lỗi */ }
      try { btn.setAttribute('aria-expanded', 'false'); } catch (e) { /* bỏ qua lỗi */ }
      closeTimer = setTimeout(() => {
        try { drawer.setAttribute('hidden', ''); } catch (e) { /* bỏ qua lỗi */ }
        try { drawer.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        try { drawer.style.pointerEvents = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        try { backdrop.setAttribute('hidden', ''); } catch (e) { /* bỏ qua lỗi */ }
        try { backdrop.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        try { backdrop.style.pointerEvents = 'none'; } catch (e) { /* bỏ qua lỗi */ }
      }, 200);
    };
    const toggle = () => {
      const isOpen = document.body.classList.contains('drawer-open');
      if (isOpen) close();
      else open();
    };

    btn.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });
    backdrop.addEventListener('click', (e) => { e.preventDefault(); close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  } catch (e) { /* bỏ qua lỗi */ }
};

export const setTopbarHeightVar = () => {
  try {
    if (document.body.classList.contains('drawer-open')) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 480px)').matches) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const h = Math.round(topbar.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--topbar-height', `${h}px`);
  } catch (e) { /* bỏ qua lỗi */ }
};
