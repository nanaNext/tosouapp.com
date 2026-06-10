(function () {
  const root = globalThis.AttendanceMonthly || {};
  const events = root.Events || null;
  const $ = (s) => document.querySelector(s);
// Hàm này dùng để prefill tên người dùng vào ô userName
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
// Còn cái hàm này là dùng để set height cho các phần tử top và toolbar
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      prefillUserName();
      try {
        const top = document.querySelector('.kintai-top');
        const h = top ? Math.max(0, top.offsetHeight) : 48;
        document.body.style.setProperty('--kintai-top-height', `${h}px`);
        const tb = document.querySelector('.se-toolbar');
        const th = tb ? Math.max(0, tb.offsetHeight) : 56;
        document.body.style.setProperty('--se-toolbar-height', `${th}px`);
        window.addEventListener('resize', () => {
          const t = document.querySelector('.kintai-top');
          const hh = t ? Math.max(0, t.offsetHeight) : 48;
          document.body.style.setProperty('--kintai-top-height', `${hh}px`);
          const tb2 = document.querySelector('.se-toolbar');
          const th2 = tb2 ? Math.max(0, tb2.offsetHeight) : 56;
          document.body.style.setProperty('--se-toolbar-height', `${th2}px`);
        }, { passive: true });
      } catch (e) { /* silently ignored */ }
      if (events && typeof events.boot === 'function') await events.boot();
    } catch (e) {
      try { root.Core?.showErr?.(String(e?.message || '')); } catch (e) { /* silently ignored */ }
    }
  });
})();
