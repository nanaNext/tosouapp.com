/**
 * dark-mode-enforcer.js
 * Scans DOM and forces all light backgrounds/colors to dark when [data-theme="dark"].
 * Runs on DOMContentLoaded + MutationObserver for dynamic content.
 */
(function () {
  const DARK_BG = '#16161e';
  const DARK_SURFACE = '#1e1e2e';
  const DARK_RAISED = '#262636';
  const DARK_BORDER = '#2e2e44';
  const DARK_TEXT = '#c8ccd4';

  // Light colors to detect
  const LIGHT_BGS = ['#fff', '#ffffff', '#f8fafc', '#f1f5f9', '#f3f4f6', '#e6f2ff', '#eef2ff', '#e0f2fe', '#f0fdf4', '#fff7ed', '#fef2f2', '#eff6ff', '#f9fafb', '#fafafa', '#f5f7fb', '#fafbfc', '#fbfcfd', 'white', 'rgb(255, 255, 255)', 'rgb(248, 250, 252)', 'rgb(241, 245, 249)', 'rgb(243, 244, 246)', 'rgb(249, 250, 251)', 'rgb(250, 250, 250)', 'rgb(245, 247, 251)', 'rgb(250, 251, 252)', 'rgb(251, 252, 253)'];
  const DARK_TEXTS = ['#0f172a', '#1e293b', '#334155', '#475569', '#1f2937', '#374151', '#111827', 'rgb(15, 23, 42)', 'rgb(30, 41, 59)', 'rgb(51, 65, 85)'];

  function isLightBg(val) {
    if (!val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)') return false;
    const v = val.toLowerCase().trim();
    return LIGHT_BGS.some(l => v === l || v.startsWith(l));
  }

  function isDarkText(val) {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return DARK_TEXTS.some(d => v === d || v.startsWith(d));
  }

  function isLightBorder(val) {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return v.includes('#e2e8f0') || v.includes('#cbd5e1') || v.includes('#d1d5db') || v.includes('#e5e7eb') || v.includes('#d9d9d9') || v.includes('rgb(226, 232, 240)') || v.includes('rgb(203, 213, 225)') || v.includes('rgb(209, 213, 219)') || v.includes('rgb(229, 231, 235)') || v === 'rgb(226, 232, 240)' || v === 'rgb(203, 213, 225)' || v === 'rgb(209, 213, 219)' || v === 'rgb(229, 231, 235)';
  }

  function enforce() {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
    const admin = document.querySelector('.admin') || document.body;
    if (!admin) return;

    // Force body and main content backgrounds
    document.body.style.setProperty('background-color', DARK_BG, 'important');
    const mainContent = document.querySelector('main.content');
    if (mainContent) mainContent.style.setProperty('background-color', DARK_BG, 'important');
    const adminContent = document.querySelector('#adminContent');
    if (adminContent) adminContent.style.setProperty('background-color', DARK_BG, 'important');

    const els = admin.querySelectorAll('*');
    for (const el of els) {
      if (el.tagName === 'SVG' || el.tagName === 'PATH' || el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS') continue;

      const cs = window.getComputedStyle(el);

      // Fix background
      const bg = cs.backgroundColor;
      if (isLightBg(bg)) {
        el.style.setProperty('background-color', DARK_SURFACE, 'important');
      }

      // Fix text color
      const color = cs.color;
      if (isDarkText(color)) {
        el.style.setProperty('color', DARK_TEXT, 'important');
      }

      // Fix borders
      const bc = cs.borderTopColor || cs.borderColor;
      if (isLightBorder(bc)) {
        el.style.setProperty('border-color', DARK_BORDER, 'important');
      }
    }
  }

  function init() {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') return;

    // Run after page renders
    enforce();
    setTimeout(enforce, 500);
    setTimeout(enforce, 1500);
    setTimeout(enforce, 3000);

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      clearTimeout(observer._timer);
      observer._timer = setTimeout(enforce, 200);
    });

    const target = document.querySelector('#adminContent') || document.body;
    observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  // Also watch theme changes
  const themeObserver = new MutationObserver(() => {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      setTimeout(enforce, 100);
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
