/**
 * month-picker.js — Custom month picker component
 *
 * Usage:
 *   import { createMonthPicker } from '/static/js/shared/ui/month-picker.js';
 *
 *   const picker = createMonthPicker({
 *     value: '2026-09',          // initial YYYY-MM
 *     onChange: (ym) => { ... }, // callback when month changes
 *     className: '',             // extra class on root element
 *   });
 *   document.getElementById('slot').replaceWith(picker.el);
 *
 *   // Programmatically set value (does NOT fire onChange):
 *   picker.setValue('2026-10');
 *
 *   // Get current value:
 *   picker.getValue(); // => 'YYYY-MM'
 */

export function createMonthPicker({ value, onChange, className = '' } = {}) {
  // ── state ──────────────────────────────────────────────────────
  const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  let current = value || todayJST();    // YYYY-MM
  let viewYear = parseInt(current.slice(0, 4), 10);
  let open = false;

  const MONTHS_JA = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  // ── DOM ───────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = `mp-root${className ? ' ' + className : ''}`;
  root.style.cssText = 'position:relative; display:inline-block; user-select:none;';

  // Trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'mp-trigger';
  trigger.style.cssText = [
    'display:inline-flex', 'align-items:center', 'gap:6px',
    'height:34px', 'padding:0 12px',
    'border:1px solid #cbd5e1', 'border-radius:4px',
    'background:#ffffff', 'color:#0f172a',
    'font-size:14px', 'font-weight:600',
    'cursor:pointer', 'white-space:nowrap',
    'transition:border-color .15s, box-shadow .15s',
  ].join(';');

  const triggerLabel = document.createElement('span');
  const triggerCaret = document.createElement('span');
  triggerCaret.style.cssText = 'font-size:10px; color:#94a3b8; transition:transform .2s;';
  triggerCaret.textContent = '▾';
  trigger.appendChild(triggerLabel);
  trigger.appendChild(triggerCaret);

  // Dropdown panel
  const panel = document.createElement('div');
  panel.className = 'mp-panel';
  panel.style.cssText = [
    'position:absolute', 'top:calc(100% + 4px)', 'left:0',
    'min-width:220px', 'background:#fff',
    'border:1px solid #e2e8f0', 'border-radius:8px',
    'box-shadow:0 8px 24px rgba(15,23,42,.12)',
    'z-index:9999', 'overflow:hidden',
    'display:none', 'flex-direction:column',
  ].join(';');

  // Year nav row
  const yearRow = document.createElement('div');
  yearRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:10px 12px 8px; border-bottom:1px solid #f1f5f9;';

  const btnPrevYear = document.createElement('button');
  btnPrevYear.type = 'button';
  btnPrevYear.innerHTML = '&#8249;';
  btnPrevYear.style.cssText = navBtnStyle();

  const yearLabel = document.createElement('span');
  yearLabel.style.cssText = 'font-size:14px; font-weight:700; color:#1e293b; min-width:50px; text-align:center;';

  const btnNextYear = document.createElement('button');
  btnNextYear.type = 'button';
  btnNextYear.innerHTML = '&#8250;';
  btnNextYear.style.cssText = navBtnStyle();

  const btnThisMonth = document.createElement('button');
  btnThisMonth.type = 'button';
  btnThisMonth.textContent = '今月';
  btnThisMonth.style.cssText = [
    'font-size:11px', 'padding:2px 8px', 'border-radius:4px',
    'border:1px solid #e2e8f0', 'background:#f8fafc',
    'color:#64748b', 'cursor:pointer',
    'transition:background .15s',
  ].join(';');

  yearRow.appendChild(btnPrevYear);
  yearRow.appendChild(yearLabel);
  yearRow.appendChild(btnNextYear);
  yearRow.appendChild(btnThisMonth);

  // Month grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(4,1fr); gap:4px; padding:10px 10px 12px;';

  panel.appendChild(yearRow);
  panel.appendChild(grid);
  root.appendChild(trigger);
  root.appendChild(panel);

  // ── helpers ───────────────────────────────────────────────────
  function navBtnStyle() {
    return [
      'background:none', 'border:none', 'cursor:pointer',
      'font-size:18px', 'line-height:1', 'color:#475569',
      'padding:2px 6px', 'border-radius:4px',
      'transition:background .15s',
    ].join(';');
  }

  function fmtLabel(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return `${y}年${m}月`;
  }

  function renderGrid() {
    yearLabel.textContent = `${viewYear}年`;
    grid.innerHTML = '';
    const [selY, selM] = current.split('-').map(Number);
    const todayYM = todayJST();
    const [todayY, todayM] = todayYM.split('-').map(Number);

    MONTHS_JA.forEach((label, idx) => {
      const m   = idx + 1;
      const ym  = `${viewYear}-${String(m).padStart(2, '0')}`;
      const isSelected = viewYear === selY && m === selM;
      const isToday    = viewYear === todayY && m === todayM;

      const cell = document.createElement('button');
      cell.type  = 'button';
      cell.textContent = label;
      cell.dataset.ym  = ym;
      cell.style.cssText = [
        'padding:7px 4px', 'border-radius:6px', 'border:none',
        'font-size:12px', 'font-weight:500', 'cursor:pointer',
        'transition:background .12s, color .12s',
        isSelected
          ? 'background:#1e4d8c; color:#fff; font-weight:700;'
          : isToday
            ? 'background:#eff6ff; color:#1e4d8c; font-weight:700;'
            : 'background:none; color:#334155;',
      ].join(';');

      cell.addEventListener('mouseenter', () => {
        if (!isSelected) cell.style.background = '#f1f5f9';
      });
      cell.addEventListener('mouseleave', () => {
        if (!isSelected) cell.style.background = isToday ? '#eff6ff' : 'none';
      });

      cell.addEventListener('click', () => {
        current = ym;
        closePanel();
        syncTrigger();
        if (typeof onChange === 'function') onChange(current);
      });

      grid.appendChild(cell);
    });
  }

  function syncTrigger() {
    triggerLabel.textContent = fmtLabel(current);
  }

  function openPanel() {
    open = true;
    viewYear = parseInt(current.slice(0, 4), 10);
    renderGrid();
    panel.style.display = 'flex';
    triggerCaret.style.transform = 'rotate(180deg)';
    trigger.style.borderColor = '#93c5fd';
    trigger.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
  }

  function closePanel() {
    open = false;
    panel.style.display = 'none';
    triggerCaret.style.transform = '';
    trigger.style.borderColor = '#cbd5e1';
    trigger.style.boxShadow = '';
  }

  // ── events ────────────────────────────────────────────────────
  trigger.addEventListener('click', () => { open ? closePanel() : openPanel(); });

  btnPrevYear.addEventListener('click', () => { viewYear--; renderGrid(); });
  btnNextYear.addEventListener('click', () => { viewYear++; renderGrid(); });
  btnThisMonth.addEventListener('click', () => {
    current = todayJST();
    closePanel();
    syncTrigger();
    if (typeof onChange === 'function') onChange(current);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (open && !root.contains(e.target)) closePanel();
  });

  // ── init ──────────────────────────────────────────────────────
  syncTrigger();

  // ── public API ────────────────────────────────────────────────
  return {
    el: root,
    getValue() { return current; },
    setValue(ym) {
      if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return;
      current = ym;
      syncTrigger();
      if (open) { viewYear = parseInt(ym.slice(0,4),10); renderGrid(); }
    },
  };
}
