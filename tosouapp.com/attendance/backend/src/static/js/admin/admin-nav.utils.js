/**
 * admin-nav.utils.js
 * Sidebar và navigation utilities cho admin SPA.
 * Tách ra từ admin.page.js để dễ bảo trì.
 */

export const normalizePath = (p) => {
  const s = String(p || '');
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
};

export const markActiveNav = () => {
  try {
    const p = normalizePath(window.location.pathname);
    const links = [
      ...Array.from(document.querySelectorAll('.sidebar .sidebar-nav a[href]')),
      ...Array.from(document.querySelectorAll('.subbar .subnav a[href]')),
    ];
    let best = null;
    let bestLen = -1;
    for (const a of links) {
      const href = normalizePath(a.getAttribute('href'));
      if (!href || href === '/') continue;
      if (p === href) {
        const len = href.length + 10000;
        if (len > bestLen) { best = a; bestLen = len; }
        continue;
      } else if (href !== '/admin/dashboard' && p.startsWith(href + '/')) {
        const len = href.length;
        if (len > bestLen) { best = a; bestLen = len; }
      }
    }
    for (const a of links) {
      a.classList.toggle('active', a === best);
      try {
        if (a === best) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      } catch (e) { /* silently ignored */ }
    }

    // Highlight top-level menu buttons khi submenu link khớp path hiện tại
    try {
      const menus = Array.from(document.querySelectorAll('.subbar .menu'));
      let bestMenu = null;
      let bestMenuLen = -1;
      for (const m of menus) {
        const btn = m.querySelector('.menu-btn');
        const as = Array.from(m.querySelectorAll('.submenu a[href]'));
        for (const a of as) {
          const href = normalizePath(a.getAttribute('href') || '');
          if (!href || href === '/') continue;
          if (p === href || p.startsWith(href + '/')) {
            const len = href.length + (p === href ? 10000 : 0);
            if (len > bestMenuLen) { bestMenu = btn; bestMenuLen = len; }
          }
        }
      }
      for (const m of menus) {
        const btn = m.querySelector('.menu-btn');
        if (!btn) continue;
        btn.classList.toggle('active', btn === bestMenu);
        try {
          if (btn === bestMenu) btn.setAttribute('aria-current', 'page');
          else btn.removeAttribute('aria-current');
        } catch (e) { /* silently ignored */ }
      }
    } catch (e) { /* silently ignored */ }

    try {
      const nav = document.querySelector('.sidebar .sidebar-nav');
      if (nav && !nav.querySelector('.selected')) {
        if (best) best.classList.add('selected');
      }
    } catch (e) { /* silently ignored */ }
  } catch (e) { /* silently ignored */ }
};

export const expandActiveSidebarSection = () => {
  try {
    const nav = document.querySelector('.sidebar .sidebar-nav');
    if (!nav) return;
    const details = Array.from(nav.querySelectorAll('details'));
    for (const d of details) {
      d.classList.remove('active-section');
      d.open = false;
    }
    const active = nav.querySelector('a.active');
    const parent = (active && active.closest) ? active.closest('details') : null;
    if (parent) {
      parent.open = true;
      parent.classList.add('active-section');
    }
  } catch (e) { /* silently ignored */ }
};

export const wireSidebarAccordion = () => {
  try {
    const nav = document.querySelector('.sidebar .sidebar-nav');
    if (!nav || nav.dataset.bound === '1') return;
    nav.dataset.bound = '1';
    nav.addEventListener('click', (e) => {
      const t = e && e.target;
      const summary = (t && t.closest) ? t.closest('summary') : null;
      if (!summary) return;
      const details = summary.closest('details');
      if (!details) return;
      e.preventDefault();

      const isOpening = !details.open;
      if (isOpening) {
        const allDetails = nav.querySelectorAll('details');
        for (const d of allDetails) {
          if (d !== details) d.open = false;
        }
      }
      details.open = isOpening;
    });
  } catch (e) { /* silently ignored */ }
};
