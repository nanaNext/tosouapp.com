import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';

const $ = (sel) => document.querySelector(sel);

const showSpinner = () => {
  try { const el = document.querySelector('#pageSpinner'); if (el) { el.removeAttribute('hidden'); el.style.display = 'grid'; } } catch {}
};
const hideSpinner = () => {
  try { const el = document.querySelector('#pageSpinner'); if (el) { el.setAttribute('hidden', ''); el.style.display = 'none'; } } catch {}
};

const todayISO = () => new Date().toLocaleDateString('sv-SE');
const todayMonth = () => todayISO().slice(0, 7);
const fmtDT = (v) => {
  if (!v) return '';
  try {
    const d = typeof v === 'string' ? new Date(v) : v;
    if (!d || isNaN(d.getTime())) return String(v).replace('T',' ').slice(0,16);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch { return String(v).replace('T',' ').slice(0,16); }
};

const fmtJPY = (n) => `¥${Number(n || 0).toLocaleString('ja-JP')}`;
const fmtMonthLabel = (ym) => {
  const s = String(ym || '');
  if (!/^\d{4}-\d{2}$/.test(s)) return '';
  return s.replace('-', '/');
};
const statusLabel = (st) => {
  const v = String(st || '').toLowerCase();
  if (v === 'applied') return '承認待ち';
  if (v === 'approved') return '承認済';
  if (v === 'rejected') return '差戻し';
  if (v === 'draft') return '下書き';
  if (v === 'pending') return '未申請';
  return String(st || '');
};
const statusPillClass = (st) => {
  const v = String(st || '').toLowerCase();
  if (v === 'approved') return 'st-approved';
  if (v === 'applied') return 'st-applied';
  if (v === 'rejected') return 'st-rejected';
  return 'st-other';
};

const isYM = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));
const addMonthsYM = (ym, delta) => {
  const s = String(ym || '');
  if (!isYM(s)) return '';
  let y = parseInt(s.slice(0, 4), 10);
  let m = parseInt(s.slice(5, 7), 10);
  const d = parseInt(String(delta || '0'), 10) || 0;
  m += d;
  while (m <= 0) { y -= 1; m += 12; }
  while (m > 12) { y += 1; m -= 12; }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
};
const listYMBack = (ym, n) => {
  const base = isYM(ym) ? String(ym) : todayMonth();
  const num = Math.max(1, Math.min(24, parseInt(String(n || '6'), 10) || 6));
  const out = [];
  for (let i = num - 1; i >= 0; i -= 1) out.push(addMonthsYM(base, -i));
  return out;
};

const render = async () => {
  const host = $('#adminContent');
  if (!host) return;
  let pollTimer = 0;
  const globalStatus = document.getElementById('status');
  if (globalStatus) { globalStatus.textContent = ''; globalStatus.style.display = 'none'; }
  host.className = '';
  host.style.maxWidth = 'none';
  host.style.width = '100%';
  host.style.marginLeft = '0';
  host.style.marginRight = '0';
  host.style.background = 'transparent';
  host.style.border = '0';
  host.style.boxShadow = 'none';
  host.style.padding = '0';
  host.innerHTML = `
    <div class="exp-admin-page">
      <style>
        .exp-admin-page [hidden] { display: none !important; }
        body.expenses-standalone { background: #f5f7fb; margin: 0 !important; padding: 0 !important; height: 100vh; overflow: hidden !important; }
        body.expenses-standalone main.content { padding: 0 !important; background: transparent; height: 100vh; overflow: hidden !important; }
        body.expenses-standalone #adminContent { padding: 0 !important; height: 100vh; overflow: hidden !important; }
        body.expenses-standalone .exp-admin-page { height: 100vh; overflow: hidden; }
        .admin .exp-admin-page { max-width: none !important; width: 100% !important; margin: 0 !important; }
        .admin .exp-admin-table-host { width: 100% !important; }
        .admin .exp-admin-table-wrap { width: 100% !important; }
        .exp-admin-page { display: grid; gap: 12px; background: transparent; padding: 0; border-radius: 0; color:#0f172a; }
        .exp-admin-page .exp-admin-title { margin: 0; font-size: 20px; letter-spacing: 0; font-weight: 700; }
        .exp-admin-page .exp-admin-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom: 0; }
        .exp-admin-page .exp-admin-toolbar-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-top: -2px; padding: 10px 12px; border: 1px solid #dbe6f5; border-radius: 0; background: #ffffff; }
        .exp-admin-page .exp-admin-filters { margin-bottom: 2px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; flex:1 1 auto; }
        .exp-admin-page .exp-admin-label { font-size: 14px; font-weight: 700; color:#334155; }
        .exp-admin-page .exp-admin-input,
        .exp-admin-page .exp-admin-select { min-height: 34px; font-size: 13px; border:1px solid #cbd5e1; border-radius:0; padding: 0 10px; }
        .exp-admin-page .btn { min-height: 34px; font-size: 13px; font-weight: 700; border-radius: 0; }
        .exp-admin-page .exp-inline-kpi { flex:0 0 auto; margin-left:auto; }
        .exp-admin-page .exp-admin-section {
          background: #ffffff;
          border: 1px solid #dbe6f5;
          border-radius: 12px;
          padding: 12px;
          box-shadow: none;
        }
        .exp-admin-page .exp-admin-section-title { margin: 0 0 8px; font-size: 13px; font-weight: 800; color: #0b2c66; letter-spacing: 0; text-transform: none; }
        .exp-admin-page .exp-kpi-row-right { display: flex; justify-content: flex-end; width: 100%; }
        .exp-admin-page .exp-kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(200px, 250px)); gap: 10px; }
        .exp-admin-page .exp-kpi-card {
          border-radius: 10px;
          border: 1px solid #dbe3ee;
          border-top: 4px solid #d1d5db;
          padding: 8px 10px;
          display: grid;
          gap: 3px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
          background: #ffffff;
        }
        .exp-admin-page .exp-kpi-head { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color:#475569; }
        .exp-admin-page .exp-kpi-icon {
          width: 18px; height: 18px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; background:#ffffffcc; color:#475569;
        }
        .exp-admin-page .exp-kpi-value { font-size: 21px; font-weight: 800; color: #0f172a; line-height: 1.2; }
        .exp-admin-page .exp-kpi-sub { font-size: 12px; color: #64748b; line-height: 1.25; }
        .exp-admin-page #expMonthlySummaryHost .exp-admin-table-wrap {
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
        }
        .exp-admin-page .exp-admin-table-wrap {
          border: 1px solid #dbe3ee !important;
          border-radius: 10px !important;
          background: #ffffff !important;
          padding: 0 !important;
          box-shadow: none !important;
          overflow: hidden;
        }
        .exp-admin-page .exp-admin-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
        }
        .exp-admin-page .exp-admin-table th,
        .exp-admin-page .exp-admin-table td {
          border: 1px solid #e5eaf2;
        }
        .exp-admin-page #expMonthlySummaryHost .exp-admin-table th {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .exp-admin-page #expMonthlySummaryHost .exp-admin-table td {
          font-size: 13px;
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .exp-admin-page .exp-kpi-applied { border-left-color: #f59e0b; background: transparent; }
        .exp-admin-page .exp-kpi-approved { border-left-color: #10b981; background: transparent; }
        .exp-admin-page .exp-kpi-rejected { border-left-color: #ef4444; background: transparent; }
        .exp-admin-page .exp-admin-table.clean-view th,
        .exp-admin-page .exp-admin-table.clean-view td { padding: 12px 12px; font-size: 14px; vertical-align: top; }
        .exp-admin-page .exp-admin-table.clean-view thead th { background: #f8fafc; border-bottom: 1px solid #dbe3ee; color: #334155; font-size: 13px; font-weight: 700; }
        .exp-admin-page .exp-admin-table.clean-view tbody tr:nth-child(even) { background: #fbfdff; }
        .exp-admin-page .exp-admin-table.clean-view tbody tr:hover { background: #f8fafc; }
        .exp-admin-page .exp-admin-table.clean-view thead th { position: sticky; top: 0; z-index: 1; }
        .exp-admin-page .route-col { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-admin-page .month-apply-actions { display:flex; gap:8px; justify-content:flex-end; align-items:center; flex-wrap:wrap; }
        .exp-admin-page .pill { display:inline-flex; align-items:center; height:22px; padding:0 8px; border-radius:4px; font-size:12px; font-weight:800; border:1px solid #cbd5e1; background:#fff; color:#334155; }
        .exp-admin-page .pill.applied { border-color:#fed7aa; background:#fff7ed; color:#9a3412; }
        .exp-admin-page .status-sub { color: #64748b; font-size: 12px; margin-top: 4px; }
        .exp-admin-page .status-main { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; }
        .exp-admin-page .status-main .s-ico { font-size: 12px; }
        .exp-admin-page .status-main.approved { color: #166534; }
        .exp-admin-page .status-main.applied { color: #9a3412; }
        .exp-admin-page .status-main.rejected { color: #991b1b; }
        .exp-admin-page .exp-admin-guide { display: none; }
        .exp-admin-page .exp-admin-step {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid #dbeafe;
          border-radius: 999px;
          background: #f8fbff;
          color: #1e3a8a;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .exp-admin-page .exp-admin-step-no {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #1d4ed8;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }
        .exp-admin-page .exp-admin-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }
        .exp-admin-page .exp-admin-actions-basic {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        .exp-admin-page .exp-admin-actions-more {
          position: relative;
        }
        .exp-admin-page .exp-admin-actions-more > summary {
          list-style: none;
          cursor: pointer;
          min-height: 34px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
        }
        .exp-admin-page .exp-admin-actions-more > summary::-webkit-details-marker { display: none; }
        .exp-admin-page .exp-admin-more-pop {
          position: absolute;
          right: 0;
          top: 38px;
          z-index: 20;
          min-width: 160px;
          background: #fff;
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          box-shadow: 0 10px 22px rgba(2, 6, 23, .12);
          padding: 8px;
          display: grid;
          gap: 6px;
        }
        .exp-admin-page .exp-admin-btn-primary {
          background: #0b5ed7;
          border: 1px solid #0b5ed7;
          color: #fff;
        }
        .exp-admin-page .exp-admin-btn-secondary {
          background: #fff;
          border: 1px solid #cbd5e1;
          color: #1f2937;
        }
        .exp-admin-page .exp-admin-btn-danger {
          background: #fff5f5;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }
        .exp-admin-page .exp-admin-actions-monthly {
          position: relative;
        }
        .exp-admin-page .exp-admin-actions-monthly > summary {
          list-style: none;
          cursor: pointer;
          min-height: 34px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
        }
        .exp-admin-page .exp-admin-actions-monthly > summary::-webkit-details-marker { display: none; }
        .exp-admin-page .exp-admin-monthly-pop {
          position: absolute;
          right: 0;
          top: 38px;
          z-index: 20;
          min-width: 148px;
          background: #fff;
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          box-shadow: 0 10px 22px rgba(2, 6, 23, .12);
          padding: 8px;
          display: grid;
          gap: 6px;
        }
        .exp-admin-page .exp-mini-help {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }
        .exp-admin-page .exp-op-workspace { padding: 0; border: 0; background: transparent; }
        .exp-admin-page .exp-op-grid {
          display: grid;
          grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }
        .exp-admin-page .exp-op-panel {
          border: 1px solid #dbe6f5;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          min-height: 420px;
        }
        .exp-admin-page .exp-op-panel h5 { margin: 0 0 10px; font-size: 14px; color: #0b2c66; }
        .exp-admin-page .exp-employee-list { display: grid; gap: 8px; max-height: 68vh; overflow: auto; padding-right: 2px; }
        .exp-admin-page .exp-employee-card {
          border: 1px solid #dbe6f5;
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          background: #fff;
          display: grid;
          gap: 4px;
        }
        .exp-admin-page .exp-employee-card.is-active { border-color: #1d4ed8; box-shadow: 0 0 0 2px #dbeafe; background: #f8fbff; }
        .exp-admin-page .exp-employee-name { font-weight: 800; color: #0f172a; }
        .exp-admin-page .exp-employee-sub { font-size: 12px; color: #475569; }
        .exp-admin-page .exp-bulk-bar {
          position: sticky;
          top: 8px;
          z-index: 5;
          background: #f8fbff;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .exp-admin-page .exp-bulk-actions { display: flex; align-items: center; gap: 8px; }
        .exp-admin-page .exp-month-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .exp-admin-page .exp-month-chip {
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #fff;
          color: #1f2937;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .exp-admin-page .exp-month-chip.is-active {
          border-color: #1d4ed8;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .exp-admin-page .exp-month-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
          padding: 8px 10px;
          border: 1px solid #dbe6f5;
          border-radius: 10px;
          background: #f8fbff;
          font-size: 12px;
          color: #334155;
        }
        .exp-admin-page .exp-month-summary strong { color: #0f172a; }
        .exp-admin-page .exp-month-overview {
          display: grid;
          gap: 6px;
          margin-bottom: 10px;
        }
        .exp-admin-page .exp-month-overview-row {
          display: grid;
          grid-template-columns: 110px repeat(4, minmax(0, 1fr));
          gap: 8px;
          align-items: center;
          border: 1px solid #dbe6f5;
          border-radius: 10px;
          padding: 7px 10px;
          background: #fff;
          font-size: 12px;
          color: #334155;
        }
        .exp-admin-page .exp-month-overview-row b { color: #0f172a; font-size: 13px; }
        .exp-admin-page .exp-claims-list { display: grid; gap: 10px; }
        .exp-admin-page .exp-claim-card {
          border: 1px solid #dbe6f5;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 8px;
        }
        .exp-admin-page .exp-claim-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
        .exp-admin-page .exp-claim-route { font-size: 17px; font-weight: 800; color: #0f172a; }
        .exp-admin-page .exp-claim-meta { font-size: 12px; color: #64748b; }
        .exp-admin-page .exp-claim-actions { display:flex; flex-wrap:wrap; gap:8px; }
        .exp-admin-page .exp-claim-check { margin-right: 4px; transform: translateY(1px); }
        .exp-admin-page .exp-filter-spacer { width: 4px; }
        @media (max-width: 1100px) {
          .exp-admin-page .exp-admin-toolbar-row { flex-direction: column; align-items: stretch; }
          .exp-admin-page .exp-admin-actions { justify-content: flex-start; }
          .exp-admin-page .exp-op-grid { grid-template-columns: 1fr; }
          .exp-admin-page .exp-op-panel { min-height: 0; }
        }
        .exp-admin-page .exp-admin-header-row,
        .exp-admin-page .exp-admin-guide,
        .exp-admin-page .exp-admin-toolbar-row,
        .exp-admin-page #expMonthlyStatus,
        .exp-admin-page #expMonthApplySection,
        .exp-admin-page #expMonthlyHistorySection,
        .exp-admin-page .exp-op-workspace,
        .exp-admin-page #chatNotice {
          display: none !important;
        }
        .exp-admin-page .exp-dash-root {
          display: grid;
          grid-template-columns: 180px minmax(0, 1fr);
          gap: 0;
          align-items: stretch;
          height: 100vh;
          overflow: hidden;
          background: #f1f5f9;
        }
        .exp-admin-page .exp-dash-root.mode-dashboard .exp-dash-list-only { display: none !important; }
        .exp-admin-page .exp-dash-root.mode-list .exp-dash-dashboard-only { display: none !important; }
        .exp-admin-page .exp-dash-root.collapsed {
          grid-template-columns: 84px minmax(0, 1fr);
        }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-brand { justify-content: center; padding: 0; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-brand .name { display: none; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-brand .mark { display: flex !important; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-nav { justify-content: center; padding: 12px 0; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-nav .left { justify-content: center; width: 100%; margin: 0; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-nav .left span:last-child { display: none; }
        .exp-admin-page .exp-dash-root.collapsed .exp-dash-badge { display: none !important; }
        .exp-admin-page .exp-dash-root.collapsed #expDashCsv { justify-content: center; padding: 12px 0 !important; }
        .exp-admin-page .exp-dash-root.collapsed #expDashCsv .left { padding: 0; }
        .exp-admin-page .exp-dash-side {
          background: #0f172a;
          color: #fff;
          border-radius: 0;
          padding: 0 0 16px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          height: 100vh;
          overflow: hidden;
        }
        .exp-admin-page .exp-dash-side-nav-wrapper {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,.28) transparent;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .exp-admin-page .exp-dash-side-nav-wrapper::-webkit-scrollbar { width: 8px; }
        .exp-admin-page .exp-dash-side-nav-wrapper::-webkit-scrollbar-track { background: transparent; }
        .exp-admin-page .exp-dash-side-nav-wrapper::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.22);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .exp-admin-page .exp-dash-side-nav-wrapper::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.34); }
        .exp-admin-page .exp-dash-brand {
          font-weight: 900;
          letter-spacing: .02em;
          padding: 0 12px;
          height: 60px;
          display:flex;
          gap:8px;
          align-items:center;
          border-bottom: 1px solid rgba(255,255,255,.1);
          background: #0f172a;
          flex: 0 0 auto;
        }
        .exp-admin-page .exp-dash-brand .mark { width: 24px; height: 24px; border-radius: 0; background: rgba(255,255,255,.12); align-items:center; justify-content:center; font-weight:900; font-size: 12px; display: none; }
        .exp-admin-page .exp-dash-brand .name { line-height: 1.1; letter-spacing: 0; }
        .exp-admin-page .exp-dash-brand .name > div:first-child { font-size: 14px; }
        .exp-admin-page .exp-dash-brand .sub { display: none; }
        .exp-admin-page .exp-dash-nav {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          color: #b0c4de;
          border-radius: 0;
          padding: 8px 10px 8px 20px;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          position: relative;
        }
        .exp-admin-page .exp-dash-nav::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: transparent;
        }
        .exp-admin-page .exp-dash-nav:hover { background: rgba(255,255,255,.04); color: #fff; }
        .exp-admin-page .exp-dash-nav.is-active { background: rgba(255,255,255,.06); color: #fff; font-weight: 800; }
        .exp-admin-page .exp-dash-nav.is-active::before { background: #4ade80; }
        .exp-admin-page .exp-dash-nav .left { display:flex; align-items:center; gap:12px; min-width: 0; }
        .exp-admin-page .exp-dash-nav .left span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: .02em; }
        .exp-admin-page .exp-dash-nav .ico {
          width: auto;
          height: auto;
          border-radius: 0;
          background: transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size: 15px;
          flex: 0 0 auto;
          box-shadow: none;
        }
        .exp-admin-page .exp-dash-badge {
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          background: #ef4444;
          color: #fff;
        }
        .exp-admin-page .exp-dash-sep { height: 1px; background: rgba(255,255,255,.16); margin: 8px 4px; }
        .exp-admin-page .exp-dash-link {
          color: #fff;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(255,255,255,.06);
          border-radius: 0;
          padding: 10px 10px;
          font-weight: 800;
          font-size: 13px;
        }
        .exp-admin-page .exp-dash-main { 
          display: flex; 
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          min-width: 0; 
        }
        .exp-admin-page .exp-dash-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .exp-admin-page .exp-dash-content { flex: 1; display: grid; gap: 8px; padding: 10px 12px; min-width: 0; overflow-y: auto; align-content: start; }
        .exp-admin-page .exp-dash-appbar {
          background: #fff;
          border: 0;
          border-bottom: 1px solid #e5eaf2;
          border-radius: 0;
          padding: 0 16px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 30;
          flex: 0 0 auto;
        }
        .exp-admin-page .exp-dash-appbar-left { display:flex; align-items:center; gap:10px; min-width: 0; }
        .exp-admin-page .exp-dash-appbar-vsep { width: 1px; height: 24px; background: #e2e8f0; margin: 0 8px; }
        .exp-admin-page .exp-dash-burger {
          width: 32px;
          height: 32px;
          border-radius: 0;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          font-weight: 900;
          cursor: pointer;
        }
        .exp-admin-page .exp-dash-appbar-title { font-weight: 800; font-size: 15px; color:#0f172a; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
        .exp-admin-page .exp-dash-appbar-right { display:flex; align-items:center; gap:10px; }
        .exp-admin-page .exp-dash-iconbtn {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 0;
          border: 1px solid #e5eaf2;
          background: #f8fafc;
          color: #0f172a;
          font-weight: 900;
          cursor: pointer;
        }
        .exp-admin-page .exp-dash-iconbtn .badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
        }
        .exp-admin-page .exp-dash-bell-popup {
            position: absolute; top: 44px; right: 0; width: 320px; background: #fff;
            border: 1px solid #dbe3f0; border-radius: 10px; box-shadow: 0 12px 36px rgba(15,23,42,.18);
            z-index: 2000; overflow: hidden;
            max-width: 90vw;
          }
        .exp-admin-page .exp-dash-bell-popup-head {
          padding: 10px 12px; font-weight: 700; font-size: 13px; color: #0f172a;
          border-bottom: 1px solid #eef2f7; background: #fff;
        }
        .exp-admin-page .exp-dash-bell-popup-body {
          max-height: 360px; overflow-y: auto; padding: 6px; display: grid; gap: 4px; background: #f8fafc;
        }
        .exp-admin-page .exp-dash-bell-empty {
          padding: 16px; text-align: center; font-size: 12px; color: #64748b; background: #fff; border-radius: 8px; border: 1px dashed #e2e8f0;
        }
        .exp-admin-page .exp-dash-bell-item {
          display: flex; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer;
          background: #fff; border: 1px solid transparent; transition: all 0.2s;
          text-decoration: none; color: inherit; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .exp-admin-page .exp-dash-bell-item:hover { background: #f8fbff; border-color: #e5edf8; }
        .exp-admin-page .exp-dash-bell-item .ico { font-size: 20px; }
        .exp-admin-page .exp-dash-bell-item .desc { flex: 1; font-size: 12px; color: #334155; line-height: 1.4; }
        .exp-admin-page .exp-dash-bell-item .desc strong { color: #0f172a; font-weight: normal; }

        .exp-admin-page .exp-dash-userchip {
          display:flex;
          align-items:center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 0;
          border: 1px solid #e5eaf2;
          background: #fff;
          max-width: 220px;
        }
        .exp-admin-page .exp-dash-avatar { width: 22px; height: 22px; border-radius: 999px; background:#e2e8f0; }
        .exp-admin-page .exp-dash-username { font-size: 12px; font-weight: 900; color:#0f172a; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
        .exp-admin-page .exp-dash-top { background: #fff; border: 1px solid #dbe6f5; border-radius: 0; padding: 8px 10px; }
        .exp-admin-page .exp-dash-filters { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:flex-start; }
        .exp-admin-page .exp-dash-field { display:flex; gap:8px; align-items:center; font-size: 12px; font-weight: 900; color:#334155; }
        .exp-admin-page .exp-dash-field input,
        .exp-admin-page .exp-dash-field select,
        .exp-admin-page .exp-dash-search {
          height: 34px;
          border: 1px solid #cbd5e1;
          border-radius: 0;
          padding: 0 10px;
          font-size: 13px;
          background: #fff;
          color: #0f172a;
        }
        .exp-admin-page .exp-dash-search { min-width: 260px; flex: 1 1 260px; }
        .exp-admin-page .btn.exp-dash-btn-primary { background:#0b5ed7; border:1px solid #0b5ed7; color:#fff; min-height:34px; font-weight:900; }
        .exp-admin-page .btn.exp-dash-btn-ghost { background:#fff; border:1px solid #cbd5e1; color:#0f172a; min-height:34px; font-weight:900; }
        .exp-admin-page .btn.exp-dash-btn-success { background:#10b981; border:1px solid #10b981; color:#fff; min-height:34px; font-weight:900; }
        .exp-admin-page .btn.exp-dash-btn-warn { background:#f97316; border:1px solid #f97316; color:#fff; min-height:34px; font-weight:900; }
        .exp-admin-page .exp-dash-muted { font-size: 12px; color:#64748b; }
        .exp-admin-page .exp-dash-kpi { display:grid; grid-template-columns: repeat(5, minmax(132px, 1fr)); gap: 6px; }
        .exp-admin-page .exp-dash-kpi-card {
          background:#fff;
          border: 1px solid #dbe6f5;
          border-radius: 0;
          padding: 8px;
          display: grid;
          gap: 3px;
          box-shadow: 0 4px 10px rgba(15,23,42,.05);
        }
        .exp-admin-page .exp-dash-kpi-card .head { display:flex; align-items:center; gap:10px; }
        .exp-admin-page .exp-dash-kpi-card .icon { width: 30px; height: 30px; border-radius: 0; display:flex; align-items:center; justify-content:center; font-weight:900; color:#0f172a; background:#f1f5f9; font-size: 12px; }
        .exp-admin-page .exp-dash-kpi-card.c1 .icon { background:#e0f2fe; color:#075985; }
        .exp-admin-page .exp-dash-kpi-card.c2 .icon { background:#fff7ed; color:#9a3412; }
        .exp-admin-page .exp-dash-kpi-card.c3 .icon { background:#fef2f2; color:#991b1b; }
        .exp-admin-page .exp-dash-kpi-card.c4 .icon { background:#ecfdf5; color:#166534; }
        .exp-admin-page .exp-dash-kpi-card.c5 .icon { background:#eef2ff; color:#3730a3; }
        .exp-admin-page .exp-dash-kpi-card .t { font-size: 11px; font-weight: 900; color:#64748b; }
        .exp-admin-page .exp-dash-kpi-card .v { font-size: 17px; font-weight: 900; color:#0f172a; }
        .exp-admin-page .exp-dash-kpi-card .s { font-size: 11px; color:#64748b; min-height: 12px; }
        .exp-admin-page .exp-dash-charts { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .exp-admin-page .exp-dash-card {
          background:#fff;
          border: 1px solid #dbe6f5;
          border-radius: 0;
          padding: 10px;
          box-shadow: 0 4px 10px rgba(15,23,42,.05);
        }
        .exp-admin-page .exp-dash-card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom: 8px; }
        .exp-admin-page .exp-dash-card-title { font-size: 13px; font-weight: 900; color:#0f172a; }
        .exp-admin-page .exp-dash-empty { padding: 16px; color:#64748b; font-size: 13px; text-align:center; }
        .exp-admin-page .exp-dash-bars { height: 160px; display:flex; align-items:flex-end; gap: 10px; padding: 8px 4px 4px; }
        .exp-admin-page .exp-dash-bar { flex:1 1 0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap: 6px; }
        .exp-admin-page .exp-dash-bar .b { width: 100%; border-radius: 10px 10px 4px 4px; min-height: 6px; }
        .exp-admin-page .exp-dash-bar .l { font-size: 11px; color:#64748b; }
        .exp-admin-page .exp-dash-deptwrap { display:grid; grid-template-columns: 150px minmax(0, 1fr); gap: 12px; align-items:center; }
        .exp-admin-page .exp-dash-donut { width: 150px; height: 150px; border-radius: 999px; position: relative; }
        .exp-admin-page .exp-dash-donut .hole { position:absolute; inset: 32px; background:#fff; border-radius: 999px; border: 1px solid #e5eaf2; }
        .exp-admin-page .exp-dash-legend { display:grid; gap: 6px; }
        .exp-admin-page .exp-dash-legend-row { display:grid; grid-template-columns: 12px minmax(0,1fr) 60px 110px; gap: 8px; align-items:center; font-size: 12px; color:#334155; }
        .exp-admin-page .exp-dash-legend-row .dot { width: 10px; height: 10px; border-radius: 999px; }
        .exp-admin-page .exp-dash-legend-row .pct { text-align:right; color:#64748b; }
        .exp-admin-page .exp-dash-legend-row .amt { text-align:right; font-weight: 900; color:#0f172a; }
        .exp-admin-page .exp-dash-tablewrap { border: 1px solid #e5eaf2; border-radius: 0; overflow:hidden; }
        .exp-admin-page .exp-dash-table { width: 100%; border-collapse: collapse; border-spacing: 0; }
        .exp-admin-page .exp-dash-table th { background:#f8fafc; color:#334155; font-size: 11px; font-weight: 700; text-align:left; border-bottom:1px solid #e5eaf2; padding: 8px 10px; }
        .exp-admin-page .exp-dash-table td { border-bottom:1px solid #eef2f7; padding: 8px 10px; font-size: 12px; color:#0f172a; vertical-align:middle; text-align:left; }
        .exp-admin-page .exp-dash-table td.money { text-align:left; white-space:nowrap; font-weight:normal; }
        .exp-admin-page .exp-dash-table td.center { text-align:left; white-space:nowrap; }
        .exp-admin-page .exp-dash-table td.id a { color:#2563eb; text-decoration:none; font-weight:900; }
        .exp-admin-page .exp-dash-table tr:hover td { background:#f8fafc; }
        .exp-admin-page .exp-dash-pager { display:flex; align-items:center; justify-content:center; gap: 10px; margin-top: 10px; }
        .exp-admin-page .pill.st-approved { border-color:#bbf7d0; background:#f0fdf4; color:#166534; }
        .exp-admin-page .pill.st-applied { border-color:#fed7aa; background:#fff7ed; color:#9a3412; }
        .exp-admin-page .pill.st-rejected { border-color:#fecaca; background:#fef2f2; color:#991b1b; }
        .exp-admin-page .pill.st-other { border-color:#e2e8f0; background:#f8fafc; color:#334155; }
        .exp-admin-page .exp-dash-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, .45); z-index: 1600; }
        .exp-admin-page .exp-dash-backdrop[hidden] { display: none !important; }
        .exp-admin-page .exp-dash-root.with-drawer .exp-dash-drawer { display: flex; }
        .exp-admin-page .exp-dash-drawer {
          position: relative;
          height: 100%;
          width: 300px;
          background: #f8fafc;
          border: 0;
          border-left: 1px solid #e2e8f0;
          border-radius: 0;
          box-shadow: -4px 0 16px rgba(15,23,42,.04);
          z-index: 10;
          display: none;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }
        .exp-admin-page .exp-dash-drawer-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding: 0 12px; height: 44px; border-bottom:1px solid #e2e8f0; background: #ffffff; flex: 0 0 auto; }
        .exp-admin-page .exp-dash-drawer-title { font-weight: 800; font-size: 13px; color:#0f172a; }
        .exp-admin-page .exp-dash-drawer-body { padding: 12px; overflow:auto; display:flex; flex-direction:column; gap: 12px; background: #f8fafc; flex: 1; }
        .exp-admin-page .exp-dash-detail { display:grid; gap: 12px; padding: 12px 4px; }
        .exp-admin-page .exp-dash-detail .row { display:grid; grid-template-columns: 70px minmax(0, 1fr); gap: 8px; align-items: start; }
        .exp-admin-page .exp-dash-detail .k { font-size: 11px; color:#64748b; font-weight: 800; padding-top: 1px; }
        .exp-admin-page .exp-dash-detail .v { font-size: 12px; color:#0f172a; line-height: 1.4; }
        .exp-admin-page .exp-dash-detail .v.files { display:grid; gap: 4px; }
        .exp-admin-page .exp-dash-file-card { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #ffffff; text-decoration: none; }
        .exp-admin-page .exp-dash-file-card-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .exp-admin-page .exp-dash-file-ico { font-size: 16px; color: #3b82f6; }
        .exp-admin-page .exp-dash-file-info { display: grid; gap: 2px; }
        .exp-admin-page .exp-dash-file-name { font-size: 11px; color: #2563eb; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-admin-page .exp-dash-file-size { font-size: 10px; color: #64748b; }
        .exp-admin-page .exp-dash-file-dl { color: #64748b; font-size: 14px; }
        .exp-admin-page .exp-dash-history { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px; }
        .exp-admin-page .exp-dash-history-title { font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .exp-admin-page .exp-dash-drawer-foot { border-top: 1px solid #e2e8f0; padding: 12px; display:grid; gap: 8px; background: #ffffff; }
        .exp-admin-page .exp-dash-drawer-foot-title { font-size: 11px; font-weight: 800; color: #0f172a; }
        .exp-admin-page .exp-dash-note { width:100%; min-height: 60px; border:1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 12px; background: #ffffff; }
        .exp-admin-page .exp-dash-drawer-actions { display:flex; gap: 8px; }
        .exp-admin-page .exp-dash-drawer-actions .btn { flex: 1; min-height: 32px; font-size: 12px; font-weight: 800; border-radius: 4px; }
        .exp-admin-page .exp-dash-btn-approve { background: #22c55e; border: 1px solid #22c55e; color: #ffffff; }
        .exp-admin-page .exp-dash-btn-reject { background: #f97316; border: 1px solid #f97316; color: #ffffff; }
        .exp-admin-page .exp-dash-btn-deny { background: #ef4444; border: 1px solid #ef4444; color: #ffffff; }
        .exp-admin-page .exp-dash-drawer-close {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 4px;
        }
        .exp-admin-page .exp-dash-drawer-close:hover { background: #f1f5f9; color: #0f172a; }
        @keyframes exp-spin { to { transform: rotate(360deg); } }
        .exp-admin-page .spin { animation: exp-spin 1s linear infinite; }
        @media (max-width: 760px) {
          .exp-admin-page .exp-dash-root { 
            display: block; 
            overflow-x: hidden; 
            position: relative; 
          }
          .exp-admin-page .exp-dash-side {
            position: fixed;
            top: 0;
            left: -260px;
            width: 260px;
            height: 100vh;
            z-index: 2000;
            transition: transform 0.3s ease;
          }
          .exp-admin-page .exp-dash-root.mobile-open .exp-dash-side {
            transform: translateX(260px);
          }
          .exp-admin-page .exp-dash-main {
            width: 100%;
            transition: transform 0.3s ease;
          }
          .exp-admin-page .exp-dash-root.mobile-open .exp-dash-main {
            transform: translateX(260px);
          }
          .exp-admin-page .exp-dash-tablewrap {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .exp-admin-page .exp-dash-table {
            min-width: 800px;
          }
          .exp-admin-page .exp-dash-kpi { grid-template-columns: 1fr 1fr; }
          .exp-admin-page .exp-dash-charts { grid-template-columns: 1fr; }
          .exp-admin-page .exp-dash-deptwrap { grid-template-columns: 1fr; justify-items:center; }
          .exp-admin-page .exp-dash-legend { width: 100%; }
          .exp-admin-page .exp-dash-content { padding: 12px; }
          .exp-admin-page .exp-dash-drawer {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            width: 300px;
            max-width: 92vw;
            border-radius: 0;
            border: 0;
            border-left: 1px solid #e2e8f0;
            box-shadow: none;
            z-index: 1601;
            display: flex;
          }
          .exp-admin-page .exp-dash-drawer[hidden] {
            display: none !important;
          }
          .exp-admin-page .exp-dash-appbar { padding: 0 10px; }
          .exp-admin-page .exp-dash-appbar-title { font-size: 14px; }
          .exp-admin-page .exp-dash-userchip .exp-dash-user-info,
          .exp-admin-page .exp-dash-userchip .exp-dash-user-arrow { display: none !important; }
          .exp-admin-page .exp-dash-userchip { padding: 4px; }
          .exp-admin-page .exp-dash-bell-popup { right: -60px; max-width: calc(100vw - 20px); }
        }
      </style>
      <section id="expDashRoot" class="exp-dash-root">
        <aside class="exp-dash-side">
          <div class="exp-dash-brand">
            <div class="mark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2" ry="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="M8 19l-2 3"></path><path d="M18 22l-2-3"></path><path d="M8 15h.01"></path><path d="M16 15h.01"></path></svg>
            </div>
            <div class="name">
              <div>交通費管理システム</div>
            </div>
          </div>
          <div class="exp-dash-side-nav-wrapper">
            <button type="button" class="exp-dash-nav is-active" data-nav="dashboard">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </span>
                <span>ダッシュボード</span>
              </span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </span>
                <span>申請一覧</span>
              </span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="applied">
              <span class="left">
                <span class="ico" style="color: #4ade80;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </span>
                <span>承認管理</span>
              </span>
              <span id="expBadgeApplied" class="exp-dash-badge" hidden>0</span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="monthly_approval">
              <span class="left">
                <span class="ico" style="color: #38bdf8;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                <span>月次承認</span>
              </span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="approved">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
                <span>承認済み</span>
              </span>
              <span id="expBadgeApproved" class="exp-dash-badge" hidden>0</span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="rejected">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                </span>
                <span>差戻し一覧</span>
              </span>
              <span id="expBadgeRejected" class="exp-dash-badge" hidden>0</span>
            </button>
            <div class="exp-dash-sep" hidden></div>
            <button id="expDashArchive" type="button" class="exp-dash-nav" data-status="archived">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><polyline points="1 3 23 3 23 8 1 8 1 3"></polyline><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                </span>
                <span>月次締め履歴</span>
              </span>
            </button>
            <button id="expDashCsv" type="button" class="exp-dash-nav" style="display: flex; justify-content: flex-start; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
              <span class="left" style="padding-left: 30px;">
                <span>CSV出力</span>
              </span>
            </button>
          </div>
        </aside>
        <main class="exp-dash-main">
          <header class="exp-dash-appbar">
            <div class="exp-dash-appbar-left">
              <button id="expDashBurger" class="exp-dash-burger" type="button">☰</button>
              <div class="exp-dash-appbar-vsep"></div>
              <div id="expDashTitle" class="exp-dash-appbar-title">ダッシュボード</div>
            </div>
            <div class="exp-dash-appbar-right">
              <div style="position: relative;">
                <button id="expDashBell" class="exp-dash-iconbtn" type="button" aria-label="通知" style="background: transparent; border: none; font-size: 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span id="expDashBellBadge" class="badge" hidden>0</span>
                </button>
                <div id="expDashBellPopup" class="exp-dash-bell-popup" hidden>
                  <div class="exp-dash-bell-popup-head">お知らせ</div>
                  <div id="expDashBellPopupBody" class="exp-dash-bell-popup-body">
                    <div class="exp-dash-bell-empty">新しい通知はありません</div>
                  </div>
                </div>
              </div>
              <button id="expDashHelp" class="exp-dash-iconbtn" type="button" aria-label="ヘルプ" onclick="alert('操作ガイドは後日設定されます。');" style="background: transparent; border: none; color: #0f172a; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </button>
              <div class="exp-dash-userchip" title="" id="expDashUserMenuToggle" style="cursor: pointer; border: none; background: transparent;">
                <div class="exp-dash-avatar" style="background-image: url('/static/images/use.png'); background-size: cover; background-position: center; width: 32px; height: 32px;"></div>
                <div class="exp-dash-user-info" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.2;">
                  <div id="expDashUserName" class="exp-dash-username" style="font-size: 13px;"></div>
                  <div style="font-size: 11px; color: #64748b; font-weight: normal;">管理者</div>
                </div>
                <div class="exp-dash-user-arrow" style="color: #64748b; margin-left: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
              
              <!-- Menu Dropdown -->
              <div id="expDashUserMenu" hidden style="position: absolute; top: 56px; right: 16px; background: #fff; border: 1px solid #e5eaf2; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); z-index: 1000; min-width: 160px; overflow: hidden;">
                <button id="expDashLogout" type="button" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: transparent; border: none; font-size: 13px; color: #ef4444; cursor: pointer; text-align: left;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>ログアウト</span>
                </button>
              </div>
            </div>
          </header>
          <div class="exp-dash-body">
            <div class="exp-dash-content">
            <div class="exp-dash-top">
            <div class="exp-dash-filters">
              <label class="exp-dash-field">対象月
                <input id="expDashMonth" type="month">
              </label>
              <div id="expDashTopTotal" class="exp-dash-field" style="margin-left: auto; font-size: 13px; font-weight: normal; color: #64748b;" hidden></div>
            </div>
          </div>
          <div id="expDashKpi" class="exp-dash-kpi exp-dash-dashboard-only"></div>
          <div class="exp-dash-charts exp-dash-dashboard-only">
            <div class="exp-dash-card">
              <div class="exp-dash-card-title">月別交通費推移（直近6ヶ月）</div>
              <div id="expDashTrend" class="exp-dash-trend"></div>
            </div>
            <div class="exp-dash-card">
              <div class="exp-dash-card-title">部署別の交通費割合（今月）</div>
              <div id="expDashDeptShare" class="exp-dash-deptshare"></div>
            </div>
          </div>
          <div class="exp-dash-card exp-dash-list-only">
            <div class="exp-dash-card-head">
              <div class="exp-dash-card-title">最近の申請一覧</div>
              <div id="expDashListMeta" class="exp-dash-muted"></div>
            </div>
            <div id="expDashList"></div>
          </div>
            <div id="expDashStatus" class="exp-dash-muted"></div>
            </div>
            <aside id="expDashDrawer" class="exp-dash-drawer" hidden>
              <div class="exp-dash-drawer-head">
                <div class="exp-dash-drawer-title">申請詳細</div>
                <button id="expDashDrawerClose" class="exp-dash-drawer-close" type="button" aria-label="閉じる">✕</button>
              </div>
              <div id="expDashDrawerBody" class="exp-dash-drawer-body"></div>
              <div class="exp-dash-drawer-foot">
                <div class="exp-dash-drawer-foot-title">承認アクション</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">コメント</div>
                <textarea id="expDashNote" class="exp-dash-note" placeholder="コメントを入力してください"></textarea>
                <div class="exp-dash-drawer-actions" style="margin-top: 4px;">
                  <button id="expDashApprove" class="btn exp-dash-btn-approve" type="button">承認する</button>
                  <button id="expDashReject" class="btn exp-dash-btn-reject" type="button">差し戻す</button>
                  <button id="expDashDeny" class="btn exp-dash-btn-deny" type="button">却下する</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </section>
      <div id="expDashBackdrop" class="exp-dash-backdrop" hidden></div>
      <div class="exp-admin-header-row">
        <h3 class="exp-admin-title">交通費計算管理</h3>
      </div>
      <div class="exp-admin-guide" aria-label="操作ガイド">
        <div class="exp-admin-step"><span class="exp-admin-step-no">1</span><span>対象月・集計対象を選ぶ</span></div>
        <div class="exp-admin-step"><span class="exp-admin-step-no">2</span><span>社員別集計を確認</span></div>
        <div class="exp-admin-step"><span class="exp-admin-step-no">3</span><span>必要な行だけ明細で承認/差戻し</span></div>
      </div>
      <div class="exp-admin-toolbar-row">
        <div class="exp-admin-filters">
          <label for="expMonth" class="exp-admin-label">対象月</label>
          <input id="expMonth" type="month" class="exp-admin-input">
          <label for="expAggregateMode" class="exp-admin-label">集計対象</label>
          <select id="expAggregateMode" class="exp-admin-input exp-admin-select" aria-label="集計対象">
            <option value="approved">承認済み</option>
            <option value="applied_approved">申請中+承認済み</option>
            <option value="all">全て</option>
          </select>
          <select id="expUserFilter" class="exp-admin-input exp-admin-select" aria-label="社員">
            <option value="">全員</option>
          </select>
        </div>
        <div class="exp-admin-actions">
          <div class="exp-admin-actions-basic">
          <button id="expReload" class="btn exp-admin-reload exp-admin-btn-primary" type="button">検索</button>
          <details class="exp-admin-actions-more">
            <summary>その他</summary>
            <div class="exp-admin-more-pop">
              <button id="expExportCsv" class="btn exp-admin-btn-secondary" type="button">CSV出力</button>
              <button id="expToggleHistory" class="btn exp-admin-btn-secondary" type="button">履歴を表示</button>
              <button id="expToggleDetails" class="btn exp-admin-btn-secondary" type="button">明細表示</button>
            </div>
          </details>
          </div>
          <details class="exp-admin-actions-monthly">
            <summary>月次処理</summary>
            <div class="exp-admin-monthly-pop">
              <button id="expMonthlyClose" class="btn exp-admin-btn-primary" type="button">月次締め</button>
              <button id="expMonthlyRecalc" class="btn exp-admin-btn-danger" type="button">再計算</button>
            </div>
          </details>
        </div>
      </div>
      <div id="expMonthlyStatus" class="exp-admin-status"></div>
      <section id="expMonthApplySection" class="exp-admin-section">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <h4 class="exp-admin-section-title" style="margin:0;">月次申請（従業員→管理）</h4>
          <div class="exp-mini-help">対象月に申請がある社員が表示されます（承認は月単位）</div>
        </div>
        <div id="expMonthApplyHost" class="exp-admin-table-host"></div>
      </section>
      <section id="expMonthlyHistorySection" class="exp-admin-section">
        <h4 class="exp-admin-section-title">月次履歴</h4>
        <div id="expMonthlyHistoryHost" class="exp-admin-table-host"></div>
      </section>
      <section class="exp-admin-section exp-op-workspace">
        <div class="exp-op-grid">
          <aside class="exp-op-panel">
            <h5>社員一覧</h5>
            <div id="expEmployeeListHost" class="exp-employee-list"></div>
          </aside>
          <main class="exp-op-panel">
            <div id="expEmployeeMonthsHost" class="exp-month-chip-row"></div>
            <div id="expSelectedMonthSummary" class="exp-month-summary"></div>
            <div id="expEmployeeMonthOverview" class="exp-month-overview"></div>
            <div id="expBulkBar" class="exp-bulk-bar">
              <div id="expBulkState">0件選択中</div>
              <div class="exp-bulk-actions">
                <button id="expBulkApprove" class="btn exp-admin-btn-primary" type="button">一括承認</button>
                <button id="expBulkClear" class="btn exp-admin-btn-secondary" type="button">選択解除</button>
              </div>
            </div>
            <div id="expTableHost" class="exp-admin-table-host"></div>
          </main>
        </div>
      </section>
      <div id="chatNotice" class="exp-admin-chat">
        <div class="exp-admin-chat-title">チャット通知</div>
        <div id="chatList" class="exp-admin-chat-list"></div>
      </div>
      <div id="expStatus" class="exp-admin-status"></div>
    </div>
  `;
  const params = new URLSearchParams(window.location.search || '');
  const initialMonth = params.get('month') || '';
  const initialUserId = params.get('userId') || '';
  const initialOpenDetails = ['1', 'true', 'yes'].includes(String(params.get('openDetails') || '').toLowerCase());
  let initialUserApplied = false;
  const m = $('#expMonth');
  if (m) m.value = initialMonth || todayMonth();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const state = {
    month: (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) ? initialMonth : todayMonth(),
    departmentId: '',
    q: '',
    status: '',
    page: 1,
    limit: 10,
    departments: [],
    deptMap: new Map(),
    selectedId: '',
    view: 'dashboard'
  };
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b', '#f97316', '#22c55e', '#e11d48'];

  const applyViewMode = () => {
    try {
      const root = document.getElementById('expDashRoot');
      if (!root) return;
      const v = (state.view === 'list') ? 'list' : 'dashboard';
      root.classList.toggle('mode-dashboard', v === 'dashboard');
      root.classList.toggle('mode-list', v === 'list');
      
      const st = String(state.status || '');
      const isMonthly = (st === 'monthly_approval' || st === 'applied_approved');
      
      const ms = document.getElementById('expMonthApplySection');
      if (ms) ms.style.display = 'none';
      
      const hist = document.getElementById('expMonthlyHistorySection');
      if (hist) hist.style.display = 'none';
      
      const tableHost = document.getElementById('expDashList');
      if (tableHost) tableHost.style.display = 'block';
    } catch {}
  };

  const setStatusText = (t, isErr) => {
    const el = document.getElementById('expDashStatus');
    if (!el) return;
    el.textContent = String(t || '');
    el.style.color = isErr ? '#b00020' : '';
  };

  const setBadge = (id, n) => {
    const el = document.getElementById(id);
    if (!el) return;
    const v = Math.max(0, Number(n || 0));
    el.textContent = String(v);
    if (v > 0) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  };

  const setTitle = (text) => {
    const el = document.getElementById('expDashTitle');
    if (el) el.textContent = String(text || '');
  };

  const fetchDashboard = async () => {
    const ym = String(state.month || '').slice(0, 7);
    return await fetchJSONAuth(`/api/expenses/admin/dashboard?month=${encodeURIComponent(ym)}&months=6`);
  };

  const computeDashboardFallback = async () => {
    const months = listYMBack(String(state.month || '').slice(0, 7), 6);
    const fetchRowsForMonth = async (ym) => {
      const q = new URLSearchParams();
      q.set('month', String(ym || '').slice(0, 7));
      q.set('page', '1');
      q.set('limit', '1000');
      q.set('sortBy', 'date');
      q.set('sortDir', 'desc');
      const r = await fetchJSONAuth(`/api/expenses/admin/list?${q.toString()}`);
      return Array.isArray(r?.rows) ? r.rows : [];
    };
    const monthStatsFromRows = (ym, rows) => {
      let appliedAmount = 0;
      let approvedAmount = 0;
      let rejectedAmount = 0;
      let appliedCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      const userSet = new Set();
      const deptMap = new Map();
      for (const r of (Array.isArray(rows) ? rows : [])) {
        const st = String(r?.status || '').toLowerCase();
        const amt = Math.max(0, Number(r?.amount || 0));
        const uid = r?.userId != null ? String(r.userId) : '';
        if (st === 'applied') { appliedCount += 1; appliedAmount += amt; }
        else if (st === 'approved') { approvedCount += 1; approvedAmount += amt; }
        else if (st === 'rejected') { rejectedCount += 1; rejectedAmount += amt; }
        if ((st === 'applied' || st === 'approved') && uid) userSet.add(uid);
        if (st === 'applied' || st === 'approved') {
          const did = r?.departmentId == null ? '' : String(r.departmentId);
          const prev = deptMap.get(did) || { departmentId: did || null, totalAmount: 0, itemCount: 0, userSet: new Set() };
          prev.totalAmount += amt;
          prev.itemCount += 1;
          if (uid) prev.userSet.add(uid);
          deptMap.set(did, prev);
        }
      }
      const totalAmount = appliedAmount + approvedAmount;
      const applicantUsers = userSet.size;
      const departmentShares = Array.from(deptMap.values())
        .map((x) => ({ departmentId: x.departmentId, totalAmount: x.totalAmount, itemCount: x.itemCount, userCount: x.userSet.size }))
        .sort((a, b) => (b.totalAmount - a.totalAmount));
      return {
        month: ym,
        totalAmount,
        appliedAmount,
        approvedAmount,
        rejectedAmount,
        appliedCount,
        approvedCount,
        rejectedCount,
        applicantUsers,
        departmentShares
      };
    };
    const settled = await Promise.allSettled(months.map((m) => fetchRowsForMonth(m)));
    const statsArr = settled.map((r, idx) => monthStatsFromRows(months[idx], r.status === 'fulfilled' ? r.value : []));
    const current = statsArr[statsArr.length - 1] || monthStatsFromRows(String(state.month || ''), []);
    const avgPerUser = current.applicantUsers > 0 ? Math.round(current.totalAmount / current.applicantUsers) : 0;
    return {
      month: current,
      avgPerUser,
      trend: statsArr.map((s) => ({
        month: s.month,
        totalAmount: s.totalAmount,
        appliedAmount: s.appliedAmount,
        approvedAmount: s.approvedAmount,
        appliedCount: s.appliedCount,
        approvedCount: s.approvedCount,
        applicantUsers: s.applicantUsers
      })),
      departmentShares: current.departmentShares || []
    };
  };

  const fetchList = async () => {
      const isMonthly = state.status === 'monthly_approval' || state.status === 'archived';
      const statusParam = isMonthly ? (state.status === 'archived' ? 'approved' : 'applied') : state.status;
    const limitParam = isMonthly ? 2000 : (state.limit || 10);
    const q = new URLSearchParams();
    q.set('month', String(state.month || '').slice(0, 7));
    q.set('page', String(state.page || 1));
    q.set('limit', String(limitParam));
    q.set('sortBy', 'date');
    q.set('sortDir', 'desc');
    if (statusParam) q.set('status', statusParam);
    if (state.departmentId) q.set('departmentId', state.departmentId);
    if (state.q) q.set('name', state.q);
    return await fetchJSONAuth(`/api/expenses/admin/list?${q.toString()}`);
  };

  const renderKpi = (dash) => {
    const hostKpi = document.getElementById('expDashKpi');
    if (!hostKpi) return;
    const m = dash?.month || {};
    const trend = Array.isArray(dash?.trend) ? dash.trend : [];
    const prev = trend.length >= 2 ? trend[trend.length - 2] : null;
    const delta = prev ? (Number(m.totalAmount || 0) - Number(prev.totalAmount || 0)) : null;
    const deltaText = delta == null ? '' : `${delta >= 0 ? '+' : '-'}${fmtJPY(Math.abs(delta))}`;
    const avg = Number(dash?.avgPerUser || 0);
    const cards = [
      { title: '今月の交通費総額（申請中+承認済）', value: fmtJPY(m.totalAmount || 0), sub: deltaText ? `前月比 ${deltaText}` : ' ' , cls:'c1', ico: '¥' },
      { title: '承認待ち件数', value: `${Number(m.appliedCount || 0).toLocaleString('ja-JP')}件`, sub: fmtJPY(m.appliedAmount || 0), cls:'c2', ico: '⏳' },
      { title: '差戻し件数', value: `${Number(m.rejectedCount || 0).toLocaleString('ja-JP')}件`, sub: fmtJPY(m.rejectedAmount || 0), cls:'c3', ico: '↩' },
      { title: '今月申請人数', value: `${Number(m.applicantUsers || 0).toLocaleString('ja-JP')}人`, sub: ' ', cls:'c4', ico: '👥' },
      { title: '平均交通費（1人あたり）', value: fmtJPY(avg), sub: ' ', cls:'c5', ico: '∅' }
    ];
    hostKpi.innerHTML = cards.map((c) => `
      <div class="exp-dash-kpi-card ${c.cls}">
        <div class="head">
          <div class="icon">${esc(c.ico)}</div>
          <div class="t">${esc(c.title)}</div>
        </div>
        <div class="v">${esc(c.value)}</div>
        <div class="s">${esc(c.sub)}</div>
      </div>
    `).join('');
  };

  const renderTrend = (dash) => {
    const host = document.getElementById('expDashTrend');
    if (!host) return;
    const rows = Array.isArray(dash?.trend) ? dash.trend : [];
    if (!rows.length) {
      host.innerHTML = `<div class="exp-dash-empty">データはありません</div>`;
      return;
    }
    const vals = rows.map((r) => Math.max(0, Number(r?.totalAmount || 0)));
    const max = Math.max(1, ...vals);
    host.innerHTML = `
      <div class="exp-dash-bars">
        ${rows.map((r, idx) => {
          const v = Math.max(0, Number(r?.totalAmount || 0));
          const h = Math.max(6, Math.round((v / max) * 100));
          const label = fmtMonthLabel(r?.month || '') || String(r?.month || '');
          return `<div class="exp-dash-bar">
            <div class="b" style="height:${h}%; background:${colors[idx % colors.length]};"></div>
            <div class="l">${esc(label.slice(2))}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  };

  const renderDeptShare = (dash) => {
    const host = document.getElementById('expDashDeptShare');
    if (!host) return;
    const rows = Array.isArray(dash?.departmentShares) ? dash.departmentShares : [];
    if (!rows.length) {
      host.innerHTML = `<div class="exp-dash-empty">データはありません</div>`;
      return;
    }
    const total = rows.reduce((s, r) => s + Math.max(0, Number(r?.totalAmount || 0)), 0);
    if (total <= 0) {
      host.innerHTML = `<div class="exp-dash-empty">データはありません</div>`;
      return;
    }
    let acc = 0;
    const stops = rows.map((r, idx) => {
      const v = Math.max(0, Number(r?.totalAmount || 0));
      const from = (acc / total) * 360;
      acc += v;
      const to = (acc / total) * 360;
      const color = colors[idx % colors.length];
      return `${color} ${from}deg ${to}deg`;
    }).join(', ');
    const donutStyle = `background: conic-gradient(${stops});`;
    const legend = rows.map((r, idx) => {
      const v = Math.max(0, Number(r?.totalAmount || 0));
      const p = total > 0 ? Math.round((v / total) * 1000) / 10 : 0;
      const deptId = r?.departmentId == null ? '' : String(r.departmentId);
      const dept = deptId ? (state.deptMap.get(deptId) || `#${deptId}`) : '未設定';
      return `<div class="exp-dash-legend-row">
        <span class="dot" style="background:${colors[idx % colors.length]};"></span>
        <span class="name">${esc(dept)}</span>
        <span class="pct">${esc(String(p))}%</span>
        <span class="amt">${esc(fmtJPY(v))}</span>
      </div>`;
    }).join('');
    host.innerHTML = `
      <div class="exp-dash-deptwrap">
        <div class="exp-dash-donut" style="${donutStyle}"><div class="hole"></div></div>
        <div class="exp-dash-legend">${legend}</div>
      </div>
    `;
  };

  const isDesktop = () => {
    try { return !!(window.matchMedia && window.matchMedia('(min-width: 1101px)').matches); } catch { return false; }
  };

  const openDrawer = async (id) => {
    const drawer = document.getElementById('expDashDrawer');
    const backdrop = document.getElementById('expDashBackdrop');
    const body = document.getElementById('expDashDrawerBody');
    if (!drawer || !body) return;
    try {
      const root = document.getElementById('expDashRoot');
      if (root && isDesktop()) root.classList.add('with-drawer');
    } catch {}
    state.selectedId = String(id || '');
    drawer.removeAttribute('hidden');
    const desktop = isDesktop();
    try {
      if (desktop) {
        backdrop?.setAttribute('hidden', '');
        document.body.style.overflow = '';
      } else {
        backdrop?.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';
      }
    } catch {}
    body.innerHTML = `<div class="exp-dash-muted">読み込み中…</div>`;
    try {
      const [rec, files] = await Promise.all([
        fetchJSONAuth(`/api/expenses/admin/detail/${encodeURIComponent(state.selectedId)}`),
        fetchJSONAuth(`/api/expenses/${encodeURIComponent(state.selectedId)}/files`).catch(() => [])
      ]);
      const route = [rec?.origin || '', rec?.destination || ''].filter(Boolean).join(' → ') || '-';
      const deptId = rec?.departmentId ? String(rec.departmentId) : '';
      const deptName = deptId ? (state.deptMap.get(deptId) || `#${deptId}`) : '';
      const fileRows = Array.isArray(files) ? files : [];
      const filesHtml = fileRows.length ? fileRows.map((f) => {
        const urlRaw = String(f?.path || '');
        const url = urlRaw.startsWith('/') ? urlRaw : ('/' + urlRaw);
        const name = f?.name || url.split('/').pop();
        return `
          <a class="exp-dash-file-card" href="${esc(url)}" target="_blank" rel="noopener">
            <div class="exp-dash-file-card-left">
              <span class="exp-dash-file-ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </span>
              <div class="exp-dash-file-info">
                <span class="exp-dash-file-name">${esc(name)}</span>
              </div>
            </div>
            <span class="exp-dash-file-dl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
          </a>
        `;
      }).join('') : `<div class="exp-dash-muted" style="font-size:12px;">添付ファイルなし</div>`;
      const st = String(rec?.status || '');
      const stLabel = statusLabel(st);
      const stCls = statusPillClass(st);
      body.innerHTML = `
        <div class="exp-dash-detail">
          <div class="row"><div class="k">申請ID</div><div class="v">${esc(String(rec?.id || ''))} <span class="pill ${stCls}" style="margin-left:4px;">${esc(stLabel)}</span></div></div>
          <div class="row"><div class="k">申請者</div><div class="v">${esc(rec?.user_name || rec?.user_email || '')}</div></div>
          <div class="row"><div class="k">部署</div><div class="v">${esc(deptName)}</div></div>
          <div class="row"><div class="k">対象月</div><div class="v">${esc(fmtMonthLabel(String(rec?.date || '').slice(0,7)) || '')}</div></div>
          <div class="row"><div class="k">申請日</div><div class="v">${esc(String(rec?.date || '').slice(0,10))}</div></div>
          <div class="row"><div class="k">通勤区間</div><div class="v">${esc(route)}</div></div>
          <div class="row"><div class="k">利用交通機関</div><div class="v">${esc(rec?.transport_type || '電車')}</div></div>
          <div class="row"><div class="k">金額</div><div class="v">${esc(fmtJPY(rec?.amount || 0))}</div></div>
          <div class="row"><div class="k">備考</div><div class="v">${esc(rec?.note || 'ー')}</div></div>
        </div>

        <div class="exp-dash-history">
          <div class="exp-dash-history-title">添付ファイル</div>
          <div class="v files">${filesHtml}</div>
        </div>

        <div class="exp-dash-history">
          <div class="exp-dash-history-title">承認履歴</div>
          <div class="v" style="font-size:12px; color:#64748b;">${esc(rec?.manager_note || 'ー')}</div>
        </div>
      `;
      const canAct = String(st).toLowerCase() === 'applied';
      const foot = document.querySelector('.exp-dash-drawer-foot');
      if (foot) {
        foot.style.display = canAct ? 'grid' : 'none';
      }
      const note = document.getElementById('expDashNote');
      if (note) {
        note.value = '';
      }
    } catch (e) {
      body.innerHTML = `<div class="exp-dash-muted" style="color:#b00020;">${esc(String(e?.message || '読み込みに失敗しました'))}</div>`;
    }
  };

  const closeDrawer = () => {
    const drawer = document.getElementById('expDashDrawer');
    const backdrop = document.getElementById('expDashBackdrop');
    if (drawer) drawer.setAttribute('hidden', '');
    if (backdrop) backdrop.setAttribute('hidden', '');
    state.selectedId = '';
    try {
      const root = document.getElementById('expDashRoot');
      root?.classList.remove('with-drawer');
    } catch {}
    try { document.body.style.overflow = ''; } catch {}
  };

  const renderList = (result) => {
    const host = document.getElementById('expDashList');
    const meta = document.getElementById('expDashListMeta');
    const topTotal = document.getElementById('expDashTopTotal');
    if (!host) return;

    if (state.status === 'monthly_approval' || state.status === 'archived') {
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      const userMap = new Map();
      rows.forEach(r => {
        const uid = String(r.userId || '');
        if (!uid) return;
        const prev = userMap.get(uid) || { userId: uid, userName: r.user_name || r.user_email || '社員', dept: r.departmentId, count: 0, amount: 0, month: String(r.date || '').slice(0, 7) };
        prev.count += 1;
        prev.amount += Number(r.amount || 0);
        userMap.set(uid, prev);
      });
      const deptName = (deptId) => {
        const id = deptId == null ? '' : String(deptId);
        if (!id) return '未設定';
        return state.deptMap.get(id) || `#${id}`;
      };
      const userRows = Array.from(userMap.values());
      const grandTotal = userRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const totalCount = userRows.reduce((sum, r) => sum + Number(r.count || 0), 0);
      
      const isArchived = state.status === 'archived';
      
      const bodyRows = userRows.map((r) => {
        const d = deptName(r.dept);
        const isStandalone = new URLSearchParams(window.location.search).get('standalone');
        let detailUrl = `/admin/expenses/monthly-detail?userId=${encodeURIComponent(r.userId)}&month=${encodeURIComponent(r.month)}`;
        if (isStandalone) {
          detailUrl += `&standalone=${encodeURIComponent(isStandalone)}&tab=${isArchived ? 'archived' : 'monthly_approval'}`;
        }
        
        let actionHtml = '';
        if (isArchived) {
          actionHtml = `<a class="btn exp-dash-btn-ghost" href="${detailUrl}" style="min-height:28px;padding:0 8px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;display:inline-flex;align-items:center;text-decoration:none;">明細を確認</a>`;
        } else {
          actionHtml = `
            <a class="btn exp-dash-btn-ghost" href="${detailUrl}" style="min-height:28px;padding:0 8px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;display:inline-flex;align-items:center;text-decoration:none;">明細を確認</a>
          `;
        }

        return `<tr class="exp-dash-row">
          ${state.status === 'monthly_approval' ? `<td class="center" style="width:40px;"><input type="checkbox" class="exp-dash-bulk-cb-monthly" data-uid="${esc(r.userId)}" data-month="${esc(r.month)}" style="cursor:pointer;" /></td>` : ''}
          <td>${esc(r.userName)}</td>
          <td>${esc(d)}</td>
          <td class="center">${esc(fmtMonthLabel(r.month))}</td>
          <td class="money">¥${Number(r.amount).toLocaleString('ja-JP')}</td>
          <td class="center">${esc(r.count)}件</td>
          <td class="center">
            <div style="display:flex;gap:8px;align-items:center;">
              ${actionHtml}
            </div>
          </td>
        </tr>`;
      }).join('');
      
      if (meta) meta.textContent = `${userRows.length} 名の${isArchived ? 'データ' : '申請'}`;
      if (topTotal) {
        topTotal.innerHTML = `対象社員: ${userRows.length}名 <span style="margin-left:16px; color:#0f172a; font-weight:800;">合計金額: ¥${grandTotal.toLocaleString('ja-JP')}</span>`;
        if (isArchived) {
          topTotal.innerHTML += ` <span style="margin-left:16px; color:#10b981; font-weight:800; border: 1px solid #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px;">月次締め完了</span>`;
        }
        topTotal.removeAttribute('hidden');
      }
      
      const checkIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      const xIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      
      host.innerHTML = `
        ${state.status === 'monthly_approval' ? `
        <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 13px; color: #64748b;">選択した社員を:</span>
            <button type="button" class="btn" id="expDashBulkApproveMonthly" style="display:flex; align-items:center; background:#10b981; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">
              ${checkIcon} 一括承認 (Approve)
            </button>
            <button type="button" class="btn" id="expDashBulkCancelMonthly" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">
              ${xIcon} 一括取消
            </button>
          </div>
          <button type="button" class="btn" id="expDashMonthClose" style="display:flex; align-items:center; background:#0b2c66; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold; margin-top: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            当月を締め処理 (Close Month)
          </button>
        </div>
        ` : ''}
        <div class="exp-dash-tablewrap">
          <table class="exp-dash-table">
            <thead><tr>
              ${state.status === 'monthly_approval' ? `<th class="center" style="width:40px;"><input type="checkbox" id="expDashBulkCheckAllMonthly" style="cursor:pointer;" /></th>` : ''}
              <th>社員名</th><th>部署</th><th class="center">対象月</th><th class="money">合計金額</th><th class="center">${isArchived ? '件数' : '申請件数'}</th><th class="center">操作</th>
            </tr></thead>
            <tbody>${bodyRows || `<tr><td colspan="${state.status === 'monthly_approval' ? 7 : 6}" class="center" style="padding: 24px; color: #64748b;">データがありません</td></tr>`}</tbody>
            ${userRows.length > 0 ? `
            <tfoot>
              <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1;">
                <td colspan="${state.status === 'monthly_approval' ? 4 : 3}" style="text-align: right; font-weight: 800; color: #0f172a; padding: 12px 16px;">総合計 (Grand Total)</td>
                <td class="money" style="font-weight: 800; color: #0f172a; font-size: 14px;">¥${grandTotal.toLocaleString('ja-JP')}</td>
                <td class="center" style="font-weight: 800; color: #0f172a;">${totalCount}件</td>
                <td></td>
              </tr>
            </tfoot>
            ` : ''}
          </table>
        </div>
      `;
      
      // Monthly bulk actions event binding
      if (state.status === 'monthly_approval') {
        const checkAllMonthly = document.getElementById('expDashBulkCheckAllMonthly');
        const cbListMonthly = document.querySelectorAll('.exp-dash-bulk-cb-monthly');
        
        // Row click toggle
        document.querySelectorAll('.exp-dash-row').forEach(row => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('a') || e.target.closest('button')) return;
            e.stopPropagation();
            const cb = row.querySelector('.exp-dash-bulk-cb-monthly');
            if (cb && e.target !== cb) {
              cb.checked = !cb.checked;
              cb.dispatchEvent(new Event('change'));
            }
          });
        });

        if (checkAllMonthly) {
          checkAllMonthly.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            cbListMonthly.forEach(cb => cb.checked = isChecked);
          });
        }
        
        const btnCancelMonthly = document.getElementById('expDashBulkCancelMonthly');
        if (btnCancelMonthly) {
          btnCancelMonthly.addEventListener('click', () => {
            cbListMonthly.forEach(cb => cb.checked = false);
            if (checkAllMonthly) checkAllMonthly.checked = false;
          });
        }
        
        const btnApproveMonthly = document.getElementById('expDashBulkApproveMonthly');
        if (btnApproveMonthly) {
          btnApproveMonthly.addEventListener('click', async () => {
            const items = [];
            document.querySelectorAll('.exp-dash-bulk-cb-monthly:checked').forEach(cb => {
              items.push({ uid: cb.getAttribute('data-uid'), month: cb.getAttribute('data-month') });
            });
            if (items.length === 0) return alert('承認する社員を選択してください。');
            if (!confirm(`選択した ${items.length} 名の当月分を一括承認しますか？`)) return;
            
            btnApproveMonthly.disabled = true;
            btnApproveMonthly.innerHTML = '処理中...';
            try {
              for (const it of items) {
                await fetchJSONAuth('/api/expenses/admin/months/approve', {
                  method: 'POST',
                  body: JSON.stringify({ userId: it.uid, month: it.month })
                });
              }
              await reloadListOnly();
            } catch (err) {
              alert('一部の承認に失敗しました。');
              btnApproveMonthly.disabled = false;
              btnApproveMonthly.innerHTML = `${checkIcon} 一括承認 (Approve)`;
            }
          });
        }
      }
      
      return;
    }

    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const total = Number(result?.total || 0);
    const page = Number(result?.page || state.page || 1);
    const limit = Number(result?.limit || state.limit || 10);
    const start = total ? ((page - 1) * limit + 1) : 0;
    const end = Math.min(total, page * limit);
    if (meta) meta.textContent = `${start}-${end} / ${total}`;
    if (topTotal) {
      topTotal.textContent = `合計: ${total}件`;
      topTotal.removeAttribute('hidden');
    }
    const deptName = (deptId) => {
      const id = deptId == null ? '' : String(deptId);
      if (!id) return '未設定';
      return state.deptMap.get(id) || `#${id}`;
    };
    const bodyRows = rows.map((r) => {
      const id = String(r?.id || '');
      const name = r?.user_name || r?.user_email || '';
      const dept = deptName(r?.departmentId);
      const ym = String(r?.date || '').slice(0, 7);
      const monthText = fmtMonthLabel(ym) || ym;
      const amt = fmtJPY(r?.amount || 0);
      const st = String(r?.status || '');
      const stLabel = statusLabel(st);
      const stCls = statusPillClass(st);
      const appliedAt = r?.applied_at ? fmtDT(r.applied_at) : '';
      const deleteIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
      const deleteBtnHtml = `<button type="button" class="btn exp-dash-btn-danger" data-action="delete-expense" data-id="${esc(id)}" style="width:28px;height:28px;padding:0;border:none;background:transparent;color:#ef4444;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;" title="削除">${deleteIcon}</button>`;
      return `<tr data-id="${esc(id)}" class="exp-dash-row">
        <td class="center" style="width:40px;"><input type="checkbox" class="exp-dash-bulk-cb" data-id="${esc(id)}" style="cursor:pointer;" /></td>
        <td class="id"><a href="#" data-action="open-drawer" data-id="${esc(id)}">${esc(id)}</a></td>
        <td>${esc(name)}</td>
        <td>${esc(dept)}</td>
        <td class="center">${esc(monthText)}</td>
        <td class="money">${esc(amt)}</td>
        <td class="center"><span class="pill ${stCls}">${esc(stLabel)}</span></td>
        <td class="center">${esc(appliedAt || '')}</td>
        <td class="center">
          <div style="display:flex;gap:4px;align-items:center;justify-content:center;">
            <button type="button" class="btn exp-dash-btn-ghost" data-action="open-drawer" data-id="${esc(id)}" style="min-height:28px;padding:0 8px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;display:inline-flex;align-items:center;">明細</button>
            ${deleteBtnHtml}
          </div>
        </td>
      </tr>`;
    }).join('');
    const totalPages = Math.max(1, Math.ceil(total / limit));
    
    let bulkToolbar = '';
    const deleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const approveIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    const cancelIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    
    if (state.status === 'applied') {
      bulkToolbar = `
        <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; color: #64748b;">選択した項目を:</span>
          <button type="button" class="btn" id="expDashBulkApprove" style="display:flex; align-items:center; background:#10b981; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${approveIcon}一括承認</button>
          <button type="button" class="btn" id="expDashBulkCancel" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${cancelIcon}一括取消</button>
          <button type="button" class="btn" id="expDashBulkDelete" style="display:flex; align-items:center; background:#ef4444; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${deleteIcon}一括削除</button>
        </div>
      `;
    } else {
      bulkToolbar = `
        <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; color: #64748b;">選択した項目を:</span>
          <button type="button" class="btn" id="expDashBulkCancel" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${cancelIcon}一括取消</button>
          <button type="button" class="btn" id="expDashBulkDelete" style="display:flex; align-items:center; background:#ef4444; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${deleteIcon}一括削除</button>
        </div>
      `;
    }

    host.innerHTML = `
      ${bulkToolbar}
      <div class="exp-dash-tablewrap">
        <table class="exp-dash-table">
          <thead><tr>
            <th class="center" style="width:40px;"><input type="checkbox" id="expDashBulkCheckAll" style="cursor:pointer;" /></th>
            <th>申請ID</th><th>申請者</th><th>部署</th><th class="center">対象月</th><th class="money">金額</th><th class="center">ステータス</th><th class="center">申請日時</th><th class="center">操作</th>
          </tr></thead>
          <tbody>${bodyRows || `<tr><td colspan="9" class="center" style="padding:16px;color:#64748b;">データはありません</td></tr>`}</tbody>
        </table>
      </div>
      <div class="exp-dash-pager">
        <button type="button" class="btn exp-dash-btn-ghost" data-action="prev" ${page <= 1 ? 'disabled' : ''}>前</button>
        <div class="exp-dash-muted">${page} / ${totalPages}</div>
        <button type="button" class="btn exp-dash-btn-ghost" data-action="next" ${page >= totalPages ? 'disabled' : ''}>次</button>
      </div>
    `;

    // Bulk action event listeners
    const checkAll = document.getElementById('expDashBulkCheckAll');
    const cbList = document.querySelectorAll('.exp-dash-bulk-cb');
    
    // Make entire row click toggle checkbox (but NOT open drawer)
    document.querySelectorAll('.exp-dash-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Prevent toggle if clicking on links or action buttons
        if (e.target.closest('a') || e.target.closest('button')) return;
        
        // Prevent event from bubbling up to the table body click handler which opens the drawer
        e.stopPropagation();
        
        const cb = row.querySelector('.exp-dash-bulk-cb');
        if (cb && e.target !== cb) {
          cb.checked = !cb.checked;
          // Trigger change event for 'checkAll' logic if needed
          cb.dispatchEvent(new Event('change'));
        }
      });
    });

    document.querySelectorAll('button[data-action="open-drawer"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) await openDrawer(id);
      });
    });

    if (checkAll) {
      checkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        cbList.forEach(cb => cb.checked = isChecked);
      });
    }

    const getSelectedIds = () => {
      const ids = [];
      document.querySelectorAll('.exp-dash-bulk-cb:checked').forEach(cb => {
        ids.push(cb.getAttribute('data-id'));
      });
      return ids;
    };

    const btnBulkDelete = document.getElementById('expDashBulkDelete');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) return alert('削除する項目を選択してください。');
        if (!confirm(`選択した ${ids.length} 件を本当に削除しますか？この操作は元に戻せません。`)) return;
        
        btnBulkDelete.disabled = true;
        btnBulkDelete.innerHTML = '処理中...';
        try {
          for (const id of ids) {
            await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
          }
          await reloadListOnly();
        } catch (e) {
          alert('一部の削除に失敗しました。');
          btnBulkDelete.disabled = false;
          btnBulkDelete.innerHTML = `${deleteIcon}一括削除`;
        }
      });
    }

    const btnBulkCancel = document.getElementById('expDashBulkCancel');
    if (btnBulkCancel) {
      btnBulkCancel.addEventListener('click', () => {
        const cbList = document.querySelectorAll('.exp-dash-bulk-cb');
        const checkAll = document.getElementById('expDashBulkCheckAll');
        cbList.forEach(cb => cb.checked = false);
        if (checkAll) checkAll.checked = false;
      });
    }

    const btnBulkApprove = document.getElementById('expDashBulkApprove');
    if (btnBulkApprove) {
      btnBulkApprove.addEventListener('click', async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) return alert('承認する項目を選択してください。');
        if (!confirm(`選択した ${ids.length} 件を一括承認しますか？`)) return;
        
        btnBulkApprove.disabled = true;
        btnBulkApprove.innerHTML = '処理中...';
        try {
          for (const id of ids) {
            await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/status`, { 
              method: 'PATCH', 
              body: JSON.stringify({ status: 'approved', note: '一括承認' }) 
            });
          }
          await reloadListOnly();
        } catch (e) {
          alert('一部の承認に失敗しました。');
          btnBulkApprove.disabled = false;
          btnBulkApprove.innerHTML = `${approveIcon}一括承認`;
        }
      });
    }
  };

  const reloadAll = async () => {
    setStatusText('読み込み中…', false);
    showSpinner();
    try {
      const ym = String(state.month || '').slice(0, 7);
      const [dashRes, listRes, bellRes] = await Promise.allSettled([
        fetchDashboard(), 
        fetchList(),
        fetchJSONAuth(`/api/expenses/admin/list?status=applied&limit=5&sortBy=date&sortDir=desc`)
      ]);
      const dash = dashRes.status === 'fulfilled'
        ? dashRes.value
        : await computeDashboardFallback().catch(() => ({ month: { month: state.month, totalAmount: 0, appliedCount: 0, rejectedCount: 0 }, trend: [], departmentShares: [] }));
      const list = listRes.status === 'fulfilled' ? listRes.value : { rows: [], total: 0, page: state.page, limit: state.limit };
      renderKpi(dash);
      renderTrend(dash);
      renderDeptShare(dash);
      setBadge('expBadgeApplied', dash?.month?.appliedCount || 0);
      setBadge('expBadgeApproved', dash?.month?.approvedCount || 0);
      setBadge('expBadgeRejected', dash?.month?.rejectedCount || 0);
      setBadge('expDashBellBadge', dash?.month?.appliedCount || 0);
      renderList(list);

      // Update Bell Popup
      const bellBody = document.getElementById('expDashBellPopupBody');
      if (bellBody) {
        const bellRows = bellRes.status === 'fulfilled' && Array.isArray(bellRes.value?.rows) ? bellRes.value.rows : [];
        if (bellRows.length > 0) {
          bellBody.innerHTML = bellRows.map(r => {
            const name = r?.user_name || r?.user_email || '社員';
            const amt = fmtJPY(r?.amount || 0);
            const dt = r?.applied_at ? fmtDT(r.applied_at).slice(5,16) : '';
            return `<a href="#" class="exp-dash-bell-item" data-action="open-bell" data-id="${esc(r.id)}">
              <div class="ico">⏳</div>
              <div class="desc">
                <strong>${esc(name)}</strong>さんから交通費申請（${esc(amt)}）があります。<br>
                <span style="color:#94a3b8;font-size:11px;">${esc(dt)}</span>
              </div>
            </a>`;
          }).join('');
        } else {
          bellBody.innerHTML = `<div class="exp-dash-bell-empty">新しい通知はありません</div>`;
        }
      }

      if (listRes.status === 'rejected') {
        const msg = String(listRes.reason?.message || 'データ取得に失敗しました');
        setStatusText(msg, true);
      } else if (dashRes.status === 'rejected') {
        setStatusText('集計を簡易計算で表示中（サーバー更新後に自動で正常化します）', false);
      } else {
        setStatusText('', false);
      }
    } catch (e) {
      setStatusText(String(e?.message || '取得失敗'), true);
    } finally {
      hideSpinner();
    }
  };

  const reloadListOnly = async () => {
    setStatusText('読み込み中…', false);
    showSpinner();
    try {
      const list = await fetchList();
      renderList(list);
      setStatusText('', false);
      
      // Ensure visibility is correct after fetching
      applyViewMode();
    } catch (e) {
      setStatusText(String(e?.message || '取得失敗'), true);
    } finally {
      hideSpinner();
    }
  };

  const wire = async () => {
    try {
      const p = window.ADMIN_PROFILE || {};
      const name = p.username || p.email || '';
      const el = document.getElementById('expDashUserName');
      if (el) el.textContent = String(name || '').trim();
      const chip = el?.closest?.('.exp-dash-userchip');
      if (chip) chip.setAttribute('title', String(name || '').trim());
    } catch {}
    try {
      const depts = await fetchJSONAuth('/api/admin/departments').catch(() => fetchJSONAuth('/api/departments').catch(() => []));
      state.departments = Array.isArray(depts) ? depts : [];
      state.deptMap = new Map(state.departments.map((d) => [String(d.id), d.name || d.code || `#${String(d.id)}`]));
      const sel = document.getElementById('expDashDept');
      if (sel) {
        sel.innerHTML = `<option value="">全部署</option>` + state.departments.map((d) => `<option value="${esc(String(d.id))}">${esc(d.name || d.code || `#${String(d.id)}`)}</option>`).join('');
      }
    } catch {}
    const monthInput = document.getElementById('expDashMonth');
    if (monthInput) monthInput.value = state.month;
    document.getElementById('expDashReload')?.addEventListener('click', async () => {
      state.page = 1;
      state.q = String(document.getElementById('expDashSearch')?.value || '').trim();
      state.departmentId = String(document.getElementById('expDashDept')?.value || '').trim();
      state.month = String(document.getElementById('expDashMonth')?.value || state.month).slice(0, 7);
      await reloadAll();
    });
    document.getElementById('expDashMonth')?.addEventListener('change', async () => {
      state.page = 1;
      state.month = String(document.getElementById('expDashMonth')?.value || state.month).slice(0, 7);
      await reloadAll();
    });
    document.getElementById('expDashDept')?.addEventListener('change', async () => {
      state.page = 1;
      state.departmentId = String(document.getElementById('expDashDept')?.value || '').trim();
      await reloadListOnly();
    });
    document.getElementById('expDashSearch')?.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      state.page = 1;
      state.q = String(document.getElementById('expDashSearch')?.value || '').trim();
      await reloadListOnly();
    });
    document.querySelectorAll('.exp-dash-side .exp-dash-nav[data-status]').forEach((b) => {
      b.addEventListener('click', async () => {
        closeDrawer();
        const root = document.getElementById('expDashRoot');
        if (root && window.innerWidth <= 760) {
          root.classList.remove('mobile-open');
          document.getElementById('expDashBackdrop')?.setAttribute('hidden', '');
          document.body.style.overflow = '';
          syncBurger();
        }
        document.querySelectorAll('.exp-dash-side .exp-dash-nav').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        state.page = 1;
        state.status = String(b.getAttribute('data-status') || '');
        state.view = 'list';
        applyViewMode();
        if (state.status === 'applied') setTitle('承認管理');
        else if (state.status === 'monthly_approval') setTitle('月次承認');
        else if (state.status === 'archived') setTitle('月次締め履歴');
        else if (state.status === 'approved') setTitle('承認済み');
        else if (state.status === 'rejected') setTitle('差戻し一覧');
        else setTitle('申請一覧');
        
        try {
          const url = new URL(window.location);
          url.searchParams.set('tab', state.status || 'list');
          window.history.replaceState({}, '', url);
        } catch {}

        await reloadListOnly();
      });
    });
    document.querySelectorAll('.exp-dash-side .exp-dash-nav[data-nav]').forEach((b) => {
      b.addEventListener('click', async () => {
        closeDrawer();
        const root = document.getElementById('expDashRoot');
        if (root && window.innerWidth <= 760) {
          root.classList.remove('mobile-open');
          document.getElementById('expDashBackdrop')?.setAttribute('hidden', '');
          document.body.style.overflow = '';
          syncBurger();
        }
        document.querySelectorAll('.exp-dash-side .exp-dash-nav').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        state.page = 1;
        state.status = '';
        state.view = 'dashboard';
        applyViewMode();
        setTitle('ダッシュボード');
        
        try {
          const url = new URL(window.location);
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url);
        } catch {}

        await reloadAll();
      });
    });
    
    // Bind Month Close event dynamically after rendering
    document.addEventListener('click', async (e) => {
      const btnMonthClose = e.target.closest('#expDashMonthClose');
      if (btnMonthClose) {
        const ym = String(state.month || '').slice(0, 7);
        if (!window.confirm(`【${ym}】のすべての承認済み申請を「月次締め」として確定しますか？\n\n※この操作は元に戻せません。\n※確定後は従業員がデータを編集・追加できなくなります。`)) return;
        
        btnMonthClose.disabled = true;
        btnMonthClose.innerHTML = '処理中...';
        try {
          // Send request to month close API endpoint
          await fetchJSONAuth(`/api/expenses/admin/monthly-close`, {
            method: 'POST',
            body: JSON.stringify({ month: ym })
          });
          alert(`${ym} の月次締めが完了しました。`);
          
          // Switch to archive tab to show result
          const btnArchive = document.querySelector('.exp-dash-side .exp-dash-nav[data-status="archived"]');
          if (btnArchive) btnArchive.click();
          else await reloadAll();
        } catch (err) {
          alert(`月次締めに失敗しました: ${err.message || 'unknown'}`);
          btnMonthClose.disabled = false;
          btnMonthClose.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 当月を締め処理 (Close Month)`;
        }
      }
    });

    const syncBurger = () => {
      try {
        const root = document.getElementById('expDashRoot');
        const btn = document.getElementById('expDashBurger');
        if (!root || !btn) return;
        
        if (window.innerWidth <= 760) {
          const isOpen = root.classList.contains('mobile-open');
          btn.textContent = isOpen ? '✕' : '☰';
          try { btn.setAttribute('aria-label', isOpen ? '閉じる' : 'メニュー'); } catch {}
        } else {
          const collapsed = root.classList.contains('collapsed');
          btn.textContent = collapsed ? '☰' : '✕';
          try { btn.setAttribute('aria-label', collapsed ? 'メニュー' : '閉じる'); } catch {}
        }
      } catch {}
    };
    document.getElementById('expDashLogout')?.addEventListener('click', async () => {
      try {
        if (!confirm('ログアウトしますか？')) return;
        const mod = await import('../../api/auth.api.js').catch(() => null);
        if (mod && mod.logout) await mod.logout();
        window.location.href = '/ui/login';
      } catch (err) {
        window.location.href = '/ui/login';
      }
    });

    document.getElementById('expDashHelp')?.addEventListener('click', (e) => {
      e.preventDefault();
      alert('操作ガイドは後日設定されます。');
    });

    document.getElementById('expDashUserMenuToggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('expDashUserMenu');
      if (menu) menu.toggleAttribute('hidden');
    });

    document.getElementById('expDashBurger')?.addEventListener('click', () => {
      try {
        const root = document.getElementById('expDashRoot');
        if (!root) return;
        if (window.innerWidth <= 760) {
          const isOpen = root.classList.toggle('mobile-open');
          const backdrop = document.getElementById('expDashBackdrop');
          if (backdrop) {
            if (isOpen) {
              backdrop.removeAttribute('hidden');
              document.body.style.overflow = 'hidden';
            } else {
              backdrop.setAttribute('hidden', '');
              document.body.style.overflow = '';
            }
          }
        } else {
          root.classList.toggle('collapsed');
        }
        syncBurger();
      } catch {}
    });
    syncBurger();
    document.getElementById('expDashBell')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const popup = document.getElementById('expDashBellPopup');
      if (popup) popup.toggleAttribute('hidden');
    });

    document.getElementById('expDashBellPopupBody')?.addEventListener('click', async (e) => {
      const a = e.target.closest('a[data-action="open-bell"][data-id]');
      if (!a) return;
      e.preventDefault();
      const id = a.getAttribute('data-id');
      const popup = document.getElementById('expDashBellPopup');
      if (popup) popup.setAttribute('hidden', '');
      
      await openDrawer(id);
    });

    document.addEventListener('click', (e) => {
      const popup = document.getElementById('expDashBellPopup');
      if (popup && !popup.hasAttribute('hidden') && !e.target.closest('#expDashBell') && !e.target.closest('#expDashBellPopup')) {
        popup.setAttribute('hidden', '');
      }
      
      const menu = document.getElementById('expDashUserMenu');
      if (menu && !menu.hasAttribute('hidden') && !e.target.closest('#expDashUserMenuToggle') && !e.target.closest('#expDashUserMenu')) {
        menu.setAttribute('hidden', '');
      }
    });

    document.getElementById('expDashCsv')?.addEventListener('click', () => {
      const q = new URLSearchParams();
      q.set('month', String(state.month || '').slice(0, 7));
      const isMonthly = state.status === 'monthly_approval' || state.status === 'archived';
      const statusParam = isMonthly ? (state.status === 'archived' ? 'approved' : 'applied') : state.status;
      if (statusParam) q.set('status', statusParam);
      if (state.departmentId) q.set('departmentId', state.departmentId);
      if (state.q) q.set('name', state.q);
      const url = `/api/expenses/admin/export.csv?${q.toString()}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    document.getElementById('expDashList')?.addEventListener('click', async (e) => {
      const t = e.target;
      
      const btnDelete = t?.closest ? t.closest('button[data-action="delete-expense"]') : null;
      if (btnDelete) {
        e.preventDefault();
        const id = btnDelete.getAttribute('data-id');
        if (!id) return;
        if (!window.confirm(`本当に申請ID: ${id} を削除しますか？この操作は元に戻せません。`)) return;
        try {
          btnDelete.disabled = true;
          const originalHtml = btnDelete.innerHTML;
          btnDelete.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
          await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
          alert('削除が完了しました。');
          await reloadListOnly();
        } catch (err) {
          alert(`削除に失敗しました: ${err.message || 'unknown'}`);
          btnDelete.disabled = false;
          btnDelete.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        }
        return;
      }
      
      const btnDetail = t?.closest ? t.closest('button[data-action="open-monthly-detail"]') : null;
      if (btnDetail) {
        e.preventDefault();
        const uid = btnDetail.getAttribute('data-uid');
        const month = btnDetail.getAttribute('data-month');
        if (uid && month) {
          const isStandalone = new URLSearchParams(window.location.search).get('standalone');
          let url = `/admin/expenses/monthly-detail?userId=${encodeURIComponent(uid)}&month=${encodeURIComponent(month)}`;
          if (isStandalone) url += `&standalone=${encodeURIComponent(isStandalone)}`;
          window.location.href = url;
        }
        return;
      }
      
      const btnApprove = t?.closest ? t.closest('button[data-action="approve-monthly"]') : null;
      if (btnApprove) {
        e.preventDefault();
        const uid = btnApprove.getAttribute('data-uid');
        const month = btnApprove.getAttribute('data-month');
        if (!uid || !month) return;
        if (!window.confirm(`${month} の申請を一括承認しますか？`)) return;
        btnApprove.disabled = true;
        try {
          await fetchJSONAuth('/api/expenses/admin/months/approve', {
            method: 'POST',
            body: JSON.stringify({ userId: uid, month: month })
          });
          await reloadAll();
        } catch (err) {
          window.alert(String(err?.message || '一括承認に失敗しました'));
        } finally {
          btnApprove.disabled = false;
        }
        return;
      }

      const pagerBtn = t?.closest ? t.closest('button[data-action]') : null;
      if (pagerBtn) {
        const act = String(pagerBtn.getAttribute('data-action') || '');
        if (act === 'prev') state.page = Math.max(1, state.page - 1);
        if (act === 'next') state.page = state.page + 1;
        await reloadListOnly();
        return;
      }
      const a = t?.closest ? t.closest('a[data-action="open"][data-id]') : null;
      const tr = t?.closest ? t.closest('tr[data-id]') : null;
      const id = a ? a.getAttribute('data-id') : (tr ? tr.getAttribute('data-id') : '');
      if (!id) return;
      e.preventDefault();
      await openDrawer(id);
    });
    document.getElementById('expDashBackdrop')?.addEventListener('click', () => {
      closeDrawer();
      const root = document.getElementById('expDashRoot');
      if (root) {
        root.classList.remove('mobile-open');
        syncBurger();
      }
    });
    document.getElementById('expDashDrawerClose')?.addEventListener('click', closeDrawer);
    document.getElementById('expDashApprove')?.addEventListener('click', async () => {
      if (!state.selectedId) return;
      const note = String(document.getElementById('expDashNote')?.value || '').trim();
      try {
        await fetchJSONAuth(`/api/expenses/${encodeURIComponent(state.selectedId)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', note }) });
        await reloadAll();
        await openDrawer(state.selectedId);
      } catch (e) {
        setStatusText(String(e?.message || '承認に失敗しました'), true);
      }
    });
    document.getElementById('expDashReject')?.addEventListener('click', async () => {
      if (!state.selectedId) return;
      const note = String(document.getElementById('expDashNote')?.value || '').trim();
      if (!note) {
        setStatusText('差戻しコメントを入力してください', true);
        return;
      }
      try {
        await fetchJSONAuth(`/api/expenses/${encodeURIComponent(state.selectedId)}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', note }) });
        await reloadAll();
        await openDrawer(state.selectedId);
      } catch (e) {
        setStatusText(String(e?.message || '差戻しに失敗しました'), true);
      }
    });
  };

  await wire();
  
  // Check if we need to load a specific tab from URL params
  const tabParam = new URLSearchParams(window.location.search).get('tab');
  if (tabParam) {
    const btn = document.querySelector(`.exp-dash-nav[data-status="${tabParam}"]`);
    if (btn) {
      document.querySelectorAll('.exp-dash-nav').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const st = String(btn.getAttribute('data-status') || '');
      const nav = String(btn.getAttribute('data-nav') || '');
      if (nav === 'dashboard') {
        state.view = 'dashboard';
        state.status = '';
      } else {
        state.view = 'list';
        state.status = st;
      }
      
      const setTitle = (t) => { const el = document.getElementById('expDashTitle'); if (el) el.textContent = t; };
      if (state.status === 'applied') setTitle('承認管理');
      else if (state.status === 'monthly_approval' || state.status === 'applied_approved') setTitle('月次承認');
      else if (state.status === 'approved') setTitle('承認済み');
      else if (state.status === 'rejected') setTitle('差戻し一覧');
      else setTitle('申請一覧');
    }
  }

  applyViewMode();
  await reloadAll();
  return () => {
    try { if (pollTimer) window.clearInterval(pollTimer); } catch {}
    try { hideSpinner(); } catch {}
    try { closeDrawer(); } catch {}
  };
  const includeByMode = (status, mode) => {
    const st = String(status || '').toLowerCase();
    if (mode === 'approved') return st === 'approved';
    if (mode === 'applied_approved') return st === 'approved' || st === 'applied';
    return ['approved', 'applied', 'rejected', 'pending', 'draft'].includes(st);
  };
  const modeLabel = (mode) => {
    if (mode === 'approved') return '承認';
    if (mode === 'applied_approved') return '申請+承認';
    return '全状態';
  };
  const renderMonthlyKpi = (rows) => {
    const host2 = $('#expMonthlyKpiHost');
    if (!host2) return;
    const arr = Array.isArray(rows) ? rows : [];
    const stats = {
      approved: { count: 0, amount: 0 },
      applied: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 }
    };
    for (const r of arr) {
      const st = String(r.status || '').toLowerCase();
      if (!stats[st]) continue;
      stats[st].count += 1;
      stats[st].amount += Number(r.amount || 0);
    }
    const card = (title, x, cls, icon) => `
      <div class="exp-kpi-card ${cls}">
        <div class="exp-kpi-head"><span class="exp-kpi-icon">${icon}</span><span>${title}</span></div>
        <div class="exp-kpi-value">${Number(x.count || 0).toLocaleString('ja-JP')} 件</div>
        <div class="exp-kpi-sub">¥ ${Number(x.amount || 0).toLocaleString('ja-JP')}</div>
      </div>`;
    host2.innerHTML = `
      <div class="exp-kpi-grid">
        ${card('申請中', stats.applied, 'exp-kpi-applied', '⏳')}
        ${card('承認済み', stats.approved, 'exp-kpi-approved', '✔')}
        ${card('差戻し', stats.rejected, 'exp-kpi-rejected', '↩')}
      </div>
    `;
  };

  const renderMonthApplyQueue = (rows, month) => {
    const host2 = document.getElementById('expMonthApplyHost');
    if (!host2) return;
    const arr = Array.isArray(rows) ? rows : [];
    if (!arr.length) {
      host2.innerHTML = '<div class="empty-state"><div style="font-size:24px;">📭</div><div>月次申請はありません</div></div>';
      return;
    }
    const body = arr.map((r) => {
      const uid = String(r.user_id || '');
      const ym = String(r.month || '');
      const name = String(r.employee_name || r.user_name || uid || '-');
      const code = String(r.employee_code || '-');
      const dob = r.birth_date ? String(r.birth_date).slice(0, 10) : '-';
      const appliedAt = r.applied_at ? fmtDT(r.applied_at) : '-';
      const cnt = Number(r.item_count || 0);
      const amt = Number(r.total_amount || 0).toLocaleString('ja-JP');
      const isStandalone = new URLSearchParams(window.location.search).get('standalone');
      let detailUrl = `/admin/expenses/monthly-detail?month=${encodeURIComponent(ym)}&userId=${encodeURIComponent(uid)}`;
      if (isStandalone) {
        detailUrl += `&standalone=${encodeURIComponent(isStandalone)}`;
      }
      return `<tr data-user-id="${uid}" data-month="${ym}">
        <td>${name}</td>
        <td>${code}</td>
        <td>${dob}</td>
        <td><span class="pill applied">${ym}</span></td>
        <td>${appliedAt}</td>
        <td style="text-align:left;">${cnt}</td>
        <td style="text-align:left;">¥${amt}</td>
        <td>
          <div class="month-apply-actions">
            <a class="btn exp-admin-btn-secondary" href="${detailUrl}" style="min-height:30px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;">確認</a>
            <button class="btn exp-admin-btn-primary" data-action="approve-month" type="button" style="min-height:30px;">月次承認</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    host2.innerHTML = `
      <div class="exp-admin-table-wrap">
        <table class="exp-admin-table clean-view">
          <thead><tr>
            <th>社員</th><th>社員コード</th><th>生年月日</th><th>対象月</th><th>送信日時</th><th style="text-align:left;">件数</th><th style="text-align:left;">合計</th><th>操作</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
    if (host2.dataset.bound !== '1') {
      host2.dataset.bound = '1';
      host2.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action="approve-month"]');
        if (!btn) return;
        const tr = btn.closest('tr[data-user-id][data-month]');
        if (!tr) return;
        const uid = String(tr.getAttribute('data-user-id') || '');
        const ym = String(tr.getAttribute('data-month') || '');
        if (!uid || !ym) return;
        const ok = window.confirm(`${ym} を月次承認しますか？`);
        if (!ok) return;
        btn.disabled = true;
        try {
          await fetchJSONAuth('/api/expenses/admin/months/approve', {
            method: 'POST',
            body: JSON.stringify({ userId: uid, month: ym })
          });
          await reload();
        } catch (err) {
          const st = document.getElementById('expMonthlyStatus');
          if (st) st.textContent = String(err?.message || '月次承認に失敗しました');
        } finally {
          btn.disabled = false;
        }
      });
    }
  };
  const renderMonthlySummary = (summary, mode, allRows) => {
    const host2 = $('#expMonthlySummaryHost');
    if (!host2) return;
    const totals = Array.isArray(summary?.totals) ? summary.totals : [];
    const closures = Array.isArray(summary?.closures) ? summary.closures : [];
    const closureMap = new Map(closures.map((c) => [String(c.user_id), c]));
    const pendingMap = new Map();
    (Array.isArray(allRows) ? allRows : []).forEach((r) => {
      const uid = String(r?.userId || '');
      if (!uid) return;
      const st = String(r?.status || '').toLowerCase();
      if (st === 'applied' || st === 'pending' || st === 'draft') {
        pendingMap.set(uid, (pendingMap.get(uid) || 0) + 1);
      }
    });
    if (!totals.length) {
      host2.innerHTML = `<div class="empty-state"><div style="font-size:22px;">📊</div><div>${modeLabel(mode)}データがありません</div></div>`;
      return;
    }
    const rowsHtml = totals.map((r) => {
      const key = String(r.user_id || '');
      const c = closureMap.get(key) || null;
      const total = Number(r.total_amount || 0).toLocaleString('ja-JP');
      const count = Number(r.item_count || r.approved_count || 0);
      const pendingCount = Number(pendingMap.get(key) || 0);
      const closedAt = c?.closed_at ? fmtDT(c.closed_at) : '';
      return `<tr>
        <td>${r.user_name || ''}</td>
        <td style="text-align:left;">${count}</td>
        <td style="text-align:left;">${total}</td>
        <td style="text-align:left;">${Number(pendingCount || 0).toLocaleString('ja-JP')}</td>
        <td>${closedAt ? '<span class="status-main approved"><span class="s-ico">✔</span><span>締め済み</span></span>' : '<span class="status-sub">未締め</span>'}</td>
      </tr>`;
    }).join('');
    host2.innerHTML = `
      <div style="font-size:12px;color:#64748b;margin:0 0 8px 2px;">※ 月次締め前の数値は暫定です（未処理件数を確認してから締めてください）</div>
      <div class="exp-admin-table-wrap">
        <table class="exp-admin-table clean-view">
          <thead><tr><th>社員</th><th>${modeLabel(mode)}件数</th><th>${modeLabel(mode)}金額(円)</th><th>未処理</th><th>月次締め</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  };
  const renderMonthlyHistory = (rows) => {
    const host2 = $('#expMonthlyHistoryHost');
    const section = document.getElementById('expMonthlyHistorySection');
    if (!host2) return;
    if (!viewState.showHistory) {
      if (section) section.style.display = 'none';
      host2.innerHTML = '';
      return;
    }
    if (section) section.style.display = '';
    const historyRows = Array.isArray(rows) ? rows : [];
    if (!historyRows.length) {
      host2.innerHTML = `
        <div style="margin-top:6px;padding:4px 2px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">月次履歴（直近）</div>
          <div style="color:#64748b;font-size:13px;">履歴データはありません</div>
        </div>
      `;
      return;
    }
    const rowsHtml = historyRows.map((r) => {
      const month = String(r.month || '');
      const users = Number(r.closed_users || 0).toLocaleString('ja-JP');
      const count = Number(r.approved_count || 0).toLocaleString('ja-JP');
      const total = Number(r.total_amount || 0).toLocaleString('ja-JP');
      const closed = r.last_closed_at ? fmtDT(r.last_closed_at) : '-';
      return `<tr>
        <td>${month}</td>
        <td style="text-align:left;">${users}</td>
        <td style="text-align:left;">${count}</td>
        <td style="text-align:left;">${total}</td>
        <td>${closed}</td>
      </tr>`;
    }).join('');
    host2.innerHTML = `
      <div style="margin-top:4px;">
        <div style="font-weight:700;color:#0f172a;margin:0 0 6px 2px;">月次履歴（直近12ヶ月）</div>
        <div class="exp-admin-table-wrap">
          <table class="exp-admin-table">
            <thead><tr><th>月</th><th>社員数</th><th>承認件数</th><th>月次合計(円)</th><th>最終締め</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  };
  const renderChatNotice = (chats, tableHost) => {
    const chatWrap = $('#chatNotice');
    const chatList = $('#chatList');
    if (!chatWrap || !chatList) return;
    const items = Array.isArray(chats) ? chats : [];
    if (!items.length) {
      chatWrap.style.display = 'none';
      chatList.innerHTML = '';
      return;
    }
    chatWrap.style.display = '';
    chatList.innerHTML = items.slice(0, 10).map((c) => {
      const sender = c.sender_name || '';
      const emp = c.employee_name || '';
      const dt = fmtDT(c.created_at);
      const route = [c.origin || '', c.via || '', c.destination || ''].filter(Boolean).join('→');
      const purpose = c.purpose || '';
      return `<div data-exp-id="${String(c.expense_id)}" style="display:flex;gap:8px;align-items:center;">
        <span style="color:#334155;font-size:12px;">${dt}</span>
        <span style="color:#1f2937;font-weight:700;">${sender}</span>
        <span style="color:#64748b;">→</span>
        <span style="color:#1f2937;">${emp}</span>
        <span style="color:#334155;flex:1;">${route} ${purpose ? ('／目的: ' + purpose) : ''}</span>
        <button class="btn" data-action="open-chat" style="height:28px;">表示</button>
      </div>`;
    }).join('');
    chatList.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-action="open-chat"]');
      if (!b) return;
      const wrap = b.closest('div[data-exp-id]');
      const expId = wrap ? wrap.getAttribute('data-exp-id') : '';
      if (!expId) return;
      const rowEl = tableHost ? tableHost.querySelector(`[data-id="${CSS.escape(String(expId))}"]`) : null;
      if (!rowEl) return;
      rowEl.querySelector('button[data-action="chat"]')?.click();
    }, { once: true });
  };
  const renderEmployeeMonthlyBoard = (rows, users) => {
    const host2 = $('#expEmployeeListHost');
    if (!host2) return;
    const items = Array.isArray(rows) ? rows : [];
    const userMap = new Map((Array.isArray(users) ? users : []).map((u) => [String(u.id), u]));
    const keyMap = new Map();
    for (const r of items) {
      const uid = String(r.userId || '');
      if (!uid) continue;
      const k = uid;
      const prev = keyMap.get(k) || {
        userId: uid,
        count: 0,
        pending: 0,
        amount: 0,
        updatedAt: ''
      };
      prev.count += 1;
      const st = String(r.status || '').toLowerCase();
      if (st === 'applied') prev.pending += 1;
      prev.amount += Number(r.amount || 0);
      const upd = String(r.updated_at || r.applied_at || r.approved_at || r.date || '');
      if (!prev.updatedAt || upd > prev.updatedAt) prev.updatedAt = upd;
      keyMap.set(k, prev);
    }
    const rows2 = Array.from(keyMap.values()).sort((a, b) => (b.pending - a.pending) || (b.amount - a.amount)).slice(0, 500);
    if (!viewState.selectedUserId && rows2.length) viewState.selectedUserId = String(rows2[0].userId || '');
    if (!rows2.length) {
      host2.innerHTML = '<div class="empty-state"><div style="font-size:22px;">🧾</div><div>表示対象の社員データがありません</div></div>';
      return;
    }
    const html = rows2.map((r) => {
      const u = userMap.get(String(r.userId)) || null;
      const uname = u?.username || u?.email || String(r.userId);
      const total = Number(r.amount || 0).toLocaleString('ja-JP');
      const pending = Number(r.pending || 0).toLocaleString('ja-JP');
      const activeCls = String(viewState.selectedUserId) === String(r.userId) ? 'is-active' : '';
      return `<button type="button" class="exp-employee-card ${activeCls}" data-action="pick-employee" data-uid="${String(r.userId)}">
        <div class="exp-employee-name">${uname}</div>
        <div class="exp-employee-sub">承認待ち: ${pending}件</div>
        <div class="exp-employee-sub">今月: ¥ ${total}</div>
        <div class="exp-employee-sub">✓ 最終更新 ${fmtDT(r.updatedAt || '') || '-'}</div>
      </button>`;
    }).join('');
    host2.innerHTML = html;
    if (!host2.dataset.boundOpen) {
      host2.dataset.boundOpen = '1';
      host2.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action="pick-employee"]');
        if (!btn) return;
        const pickedUid = String(btn.getAttribute('data-uid') || '');
        viewState.selectedUserId = pickedUid;
        try {
          const userRows = (Array.isArray(rows) ? rows : []).filter((r) => String(r?.userId || '') === pickedUid);
          const monthSet = new Set();
          userRows.forEach((r) => {
            const ym = String(r?.date || '').slice(0, 7);
            if (/^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
          });
          const latest = Array.from(monthSet).sort((a, b) => String(b).localeCompare(String(a)))[0] || '';
          const m = document.getElementById('expMonth');
          if (m && latest) m.value = latest;
        } catch {}
        viewState.selectedRowIds.clear();
        viewState.page = 1;
        await reload();
      });
    }
  };
  const renderEmployeeMonths = (rows) => {
    const host = document.getElementById('expEmployeeMonthsHost');
    const summaryHost = document.getElementById('expSelectedMonthSummary');
    const overviewHost = document.getElementById('expEmployeeMonthOverview');
    if (!host) return;
    const list = Array.isArray(rows) ? rows : [];
    const selectedUid = String(viewState.selectedUserId || '');
    const targetRows = selectedUid ? list.filter((r) => String(r?.userId || '') === selectedUid) : list;
    const byMonth = new Map();
    targetRows.forEach((r) => {
      const d = String(r?.date || '').slice(0, 10);
      const ym = d.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(ym)) return;
      const prev = byMonth.get(ym) || { count: 0, applied: 0, approved: 0, rejected: 0, amount: 0, amountApproved: 0 };
      prev.count += 1;
      const amt = Number(r?.amount || 0);
      prev.amount += amt;
      const st = String(r?.status || '').toLowerCase();
      if (st === 'applied') prev.applied += 1;
      else if (st === 'approved') { prev.approved += 1; prev.amountApproved += amt; }
      else if (st === 'rejected') prev.rejected += 1;
      byMonth.set(ym, prev);
    });
    const months = Array.from(byMonth.entries()).sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    if (!months.length) {
      host.innerHTML = '<span class="exp-claim-meta">申請月データなし</span>';
      if (summaryHost) summaryHost.innerHTML = '<span>この社員の申請データはありません</span>';
      if (overviewHost) overviewHost.innerHTML = '';
      return;
    }
    const currentMonth = String(document.getElementById('expMonth')?.value || '');
    host.innerHTML = months.map(([ym, cnt]) => {
      const active = ym === currentMonth ? 'is-active' : '';
      const stat = cnt || { count: 0, applied: 0, approved: 0, rejected: 0, amount: 0, amountApproved: 0 };
      const label = `${ym.replace('-', '年')}月 (${Number(stat.count || 0).toLocaleString('ja-JP')})`;
      return `<button type="button" class="exp-month-chip ${active}" data-action="pick-month" data-month="${ym}">${label}</button>`;
    }).join('');
    const selectedStat = byMonth.get(currentMonth) || null;
    if (summaryHost) {
      if (!selectedStat) {
        summaryHost.innerHTML = '<span>月を選択すると集計が表示されます</span>';
      } else {
        summaryHost.innerHTML = `
          <span><strong>${currentMonth.replace('-', '年')}月</strong></span>
          <span>申請: <strong>${Number(selectedStat.applied || 0).toLocaleString('ja-JP')}</strong></span>
          <span>承認: <strong>${Number(selectedStat.approved || 0).toLocaleString('ja-JP')}</strong></span>
          <span>差戻し: <strong>${Number(selectedStat.rejected || 0).toLocaleString('ja-JP')}</strong></span>
          <span>月合計(全件): <strong>¥${Number(selectedStat.amount || 0).toLocaleString('ja-JP')}</strong></span>
          <span>月次締め対象(承認のみ): <strong>¥${Number(selectedStat.amountApproved || 0).toLocaleString('ja-JP')}</strong></span>
        `;
      }
    }
    if (overviewHost) {
      overviewHost.innerHTML = months.map(([ym, stat]) => {
        const s = stat || { applied: 0, approved: 0, rejected: 0, amount: 0, amountApproved: 0 };
        return `<div class="exp-month-overview-row">
          <b>${ym.replace('-', '年')}月</b>
          <span>申請: <strong>${Number(s.applied || 0).toLocaleString('ja-JP')}</strong></span>
          <span>承認: <strong>${Number(s.approved || 0).toLocaleString('ja-JP')}</strong></span>
          <span>差戻し: <strong>${Number(s.rejected || 0).toLocaleString('ja-JP')}</strong></span>
          <span>全件合計: <strong>¥${Number(s.amount || 0).toLocaleString('ja-JP')}</strong></span>
          <span>締め対象: <strong>¥${Number(s.amountApproved || 0).toLocaleString('ja-JP')}</strong></span>
        </div>`;
      }).join('');
    }
    if (!host.dataset.bound) {
      host.dataset.bound = '1';
      host.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action="pick-month"][data-month]');
        if (!btn) return;
        const ym = String(btn.getAttribute('data-month') || '');
        if (!ym) return;
        const m = document.getElementById('expMonth');
        if (m) m.value = ym;
        viewState.page = 1;
        viewState.selectedRowIds.clear();
        await reload();
      });
    }
  };
  const buildListQuery = () => {
    const month = $('#expMonth') ? $('#expMonth').value : todayMonth();
    const currentUserFilter = $('#expUserFilter') ? ($('#expUserFilter').value || '') : '';
    const deptFilter = $('#expDeptFilter') ? ($('#expDeptFilter').value || '') : '';
    const empTypeFilter = $('#expEmploymentFilter') ? ($('#expEmploymentFilter').value || '') : '';
    const minAmount = $('#expMinAmount') ? ($('#expMinAmount').value || '') : '';
    const maxAmount = $('#expMaxAmount') ? ($('#expMaxAmount').value || '') : '';
    const approverFilter = $('#expApproverFilter') ? ($('#expApproverFilter').value || '') : '';
    const sortKey = $('#expSortKey') ? ($('#expSortKey').value || 'date_desc') : 'date_desc';
    const [sortBy, sortDirRaw] = String(sortKey).split('_');
    const sortDir = String(sortDirRaw || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    // Add current view status if present
    const st = String(state.status || '');
    const isMonthly = (st === 'monthly_approval' || st === 'applied_approved');
    const listStatus = isMonthly ? 'applied' : st;
    
    const q = new URLSearchParams();
    q.set('month', month);
    q.set('page', String(viewState.page || 1));
    q.set('limit', String(viewState.pageSize || 20));
    q.set('sortBy', String(sortBy || 'date'));
    q.set('sortDir', sortDir);
    if (listStatus) q.set('status', listStatus);
    if (currentUserFilter) q.set('userId', currentUserFilter);
    if (deptFilter) q.set('departmentId', deptFilter);
    if (empTypeFilter) q.set('employmentType', empTypeFilter);
    if (minAmount !== '') q.set('minAmount', minAmount);
    if (maxAmount !== '') q.set('maxAmount', maxAmount);
    if (approverFilter) q.set('approverId', approverFilter);
    return { month, currentUserFilter, q };
  };
  const reload = async () => {
    const { month, currentUserFilter, q } = buildListQuery();
    const status = $('#expStatus');
    const tableHost = $('#expTableHost');
    if (tableHost) tableHost.innerHTML = '';
    if (status) status.textContent = '読み込み中…';
    showSpinner();
    try {
      const qBoard = new URLSearchParams(q);
      qBoard.delete('month');
      qBoard.set('page', '1');
      qBoard.set('limit', '1000');
      const [rowsRes, usersRes, chatsRes, monthlyRes, historyRes, deptRes, boardRes, monthApplyRes] = await Promise.allSettled([
        fetchJSONAuth(`/api/expenses/admin/list?${q.toString()}`),
        fetchJSONAuth('/api/admin/users'),
        fetchJSONAuth(`/api/expenses/admin/messages?month=${encodeURIComponent(month)}`),
        fetchJSONAuth(`/api/expenses/admin/monthly-summary?month=${encodeURIComponent(month)}${currentUserFilter ? `&userId=${encodeURIComponent(currentUserFilter)}` : ''}`),
        fetchJSONAuth(`/api/expenses/admin/monthly-history?limit=12${currentUserFilter ? `&userId=${encodeURIComponent(currentUserFilter)}` : ''}`),
        fetchJSONAuth('/api/admin/departments'),
        fetchJSONAuth(`/api/expenses/admin/list?${qBoard.toString()}`),
        Promise.resolve([])
      ]);
      const rowsPayload = rowsRes.status === 'fulfilled' ? rowsRes.value : { rows: [], total: 0, page: 1, limit: viewState.pageSize };
      const rows = Array.isArray(rowsPayload) ? rowsPayload : (Array.isArray(rowsPayload?.rows) ? rowsPayload.rows : []);
      const totalRows = Array.isArray(rowsPayload) ? rows.length : Number(rowsPayload?.total || rows.length);
      viewState.page = Math.max(1, Number(rowsPayload?.page || viewState.page || 1));
      viewState.pageSize = Math.max(1, Number(rowsPayload?.limit || viewState.pageSize || 20));

      const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : [];
      const boardPayload = boardRes.status === 'fulfilled' ? boardRes.value : { rows: [] };
      const boardRows = Array.isArray(boardPayload) ? boardPayload : (Array.isArray(boardPayload?.rows) ? boardPayload.rows : []);
      const departments = deptRes.status === 'fulfilled' && Array.isArray(deptRes.value) ? deptRes.value : [];
      const chats = chatsRes.status === 'fulfilled' && Array.isArray(chatsRes.value) ? chatsRes.value : [];
      const monthlyRaw = monthlyRes.status === 'fulfilled' ? monthlyRes.value : { totals: [], closures: [] };
      const monthly = (() => {
        const closures0 = Array.isArray(monthlyRaw?.closures) ? monthlyRaw.closures : [];
        const isMonthMatch = (x) => String(x?.month || '').slice(0, 7) === month;
        const closures = closures0.filter(isMonthMatch);
        if (!currentUserFilter) return { totals: [], closures };
        const byUser = (x) => String(x?.user_id ?? x?.userId ?? '') === String(currentUserFilter);
        return { totals: [], closures: closures.filter(byUser) };
      })();
      const history = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value) ? historyRes.value : [];
      const monthApplyRows = monthApplyRes.status === 'fulfilled' && Array.isArray(monthApplyRes.value) ? monthApplyRes.value : [];
      
      const st = String(state.status || '');
      const isMonthlyMode = (st === 'monthly_approval' || st === 'applied_approved');
      
      if (isMonthlyMode) {
        const ms = document.getElementById('expMonthApplySection');
        if (ms) ms.style.display = 'block';
        const hist = document.getElementById('expMonthlyHistorySection');
        if (hist) hist.style.display = 'block';
        const tableHost = document.getElementById('expDashList');
        if (tableHost) tableHost.style.display = 'none';
      }
      const nameMap = new Map(users.map(u => [String(u.id), u.username || u.email || '']));
      const uf = $('#expUserFilter');
      if (uf && !uf.dataset.bound) {
        uf.dataset.bound = '1';
        uf.innerHTML = '<option value="">全員</option>' + users.map(u => `<option value="${String(u.id)}">${u.username || u.email || String(u.id)}</option>`).join('');
        if (initialUserId && !initialUserApplied) {
          uf.value = initialUserId;
          viewState.selectedUserId = String(initialUserId);
          initialUserApplied = true;
          if (!currentUserFilter) {
            viewState.page = 1;
            await reload();
            return;
          }
        }
        uf.addEventListener('change', async () => {
          viewState.selectedUserId = String(uf.value || '');
          viewState.selectedRowIds.clear();
          viewState.page = 1;
          await reload();
        });
      }
      const df = $('#expDeptFilter');
      if (df && !df.dataset.bound) {
        df.dataset.bound = '1';
        df.innerHTML = '<option value="">全て</option>' + departments.map(d => `<option value="${String(d.id)}">${d.name || d.code || ('#'+String(d.id))}</option>`).join('');
        df.addEventListener('change', async () => { viewState.page = 1; await reload(); });
      }
      const af = $('#expApproverFilter');
      if (af && !af.dataset.bound) {
        af.dataset.bound = '1';
        const approvers = users.filter((u) => ['admin', 'manager'].includes(String(u.role || '').toLowerCase()));
        af.innerHTML = '<option value="">承認者: 全て</option>' + approvers.map(u => `<option value="${String(u.id)}">${u.username || u.email || String(u.id)}</option>`).join('');
        af.addEventListener('change', async () => { viewState.page = 1; await reload(); });
      }
      const filteredRows = Array.isArray(rows) ? rows : [];
      const aggregateMode = $('#expAggregateMode') ? ($('#expAggregateMode').value || 'approved') : 'approved';
      renderMonthlyKpi(filteredRows);
      renderMonthApplyQueue(monthApplyRows, month);
      renderEmployeeMonthlyBoard(boardRows, users);
      renderEmployeeMonths(boardRows);
      const aggregateRows = filteredRows.filter((r) => includeByMode(r.status, aggregateMode));
      const totalsMap = new Map();
      aggregateRows.forEach((r) => {
        const uid = String(r.userId || '');
        if (!uid) return;
        const prev = totalsMap.get(uid) || { user_id: uid, user_name: nameMap.get(uid) || uid, month, item_count: 0, total_amount: 0 };
        prev.item_count += 1;
        prev.total_amount += Number(r.amount || 0);
        totalsMap.set(uid, prev);
      });
      const computedTotals = Array.from(totalsMap.values()).sort((a, b) => String(a.user_name || '').localeCompare(String(b.user_name || '')));
      renderMonthlySummary({ month, totals: computedTotals, closures: monthly.closures }, aggregateMode, filteredRows);
      renderMonthlyHistory(history);
      const toggleDetailsBtn = $('#expToggleDetails');
      if (toggleDetailsBtn) {
        toggleDetailsBtn.textContent = viewState.showDetails ? '明細非表示' : '明細表示';
      }
      renderChatNotice(chats, tableHost);
      if (!filteredRows.length) {
        if (tableHost) tableHost.innerHTML = '<div class="empty-state"><div style="font-size:28px;">🗂️</div><div>データはありません</div></div>';
      } else {
        if (!viewState.showDetails) {
          if (tableHost) {
            tableHost.innerHTML = `<div class="empty-state"><div style="font-size:24px;">📁</div><div>明細は非表示です。「明細表示」を押すと一覧を表示します。</div></div>`;
          }
          if (status) status.textContent = '';
          hideSpinner();
          return;
        }
        const selectedUid = String(viewState.selectedUserId || '');
        const detailRows = selectedUid
          ? filteredRows.filter((r) => String(r.userId || '') === selectedUid)
          : filteredRows;
        const totalRows2 = detailRows.length;
        const totalPages = Math.max(1, Math.ceil(totalRows2 / viewState.pageSize));
        viewState.page = Math.min(Math.max(1, viewState.page), totalPages);
        const startIdx = (viewState.page - 1) * viewState.pageSize;
        const pageRows = detailRows.slice(startIdx, startIdx + viewState.pageSize);
        const rowsHtml = pageRows.map((r) => {
          const d = String(r.date || '').slice(0, 10);
          const a = Number(r.amount || 0).toLocaleString('ja-JP');
          const user = nameMap.get(String(r.userId)) || String(r.userId || '');
          const st = String(r.status || 'pending');
          const stLower = st.toLowerCase();
          const stLabel = stLower === 'approved' ? '承認済み' : stLower === 'applied' ? '申請中' : stLower === 'rejected' ? '差戻し' : st;
          const id = String(r.id || '');
          const applied = r.applied_at ? fmtDT(r.applied_at) : '';
          const approved = r.approved_at ? fmtDT(r.approved_at) : '';
          const timeText =
            st === 'applied' ? (applied ? `申請: ${applied}` : '') :
            st === 'approved' ? (approved ? `承認: ${approved}` : '') :
            st === 'rejected' ? (approved ? `却下: ${approved}` : '') : '';
          const approver = r.approver_id ? (nameMap.get(String(r.approver_id)) || '') : '';
          const statusMeta = [timeText, approver ? `担当: ${approver}` : ''].filter(Boolean).join(' / ');
          const ru = r.receipt_url ? String(r.receipt_url) : (r.first_file_path ? String(r.first_file_path) : '');
          const ruAttr = ru ? ` data-url="${ru}"` : '';
          const count = Number(r.file_count || 0);
          const routeText = [r.origin || '', r.destination || ''].filter(Boolean).join(' → ');
          const receiptAction = (ru || count > 0)
            ? `<button class="btn" data-action="files"${ruAttr} type="button" style="height:28px;">領収書${count > 1 ? `(${count})` : ''}</button>`
            : `<button class="btn" data-action="files" type="button" style="height:28px;" disabled>領収書なし</button>`;
          const checked = viewState.selectedRowIds.has(String(id)) ? 'checked' : '';
          return `<article class="exp-claim-card" data-id="${id}">
            <div class="exp-claim-head">
              <div>
                <div class="exp-claim-route">${routeText || '-'}</div>
                <div class="exp-claim-meta">${d} / ${user}</div>
              </div>
              <div style="text-align:left;">
                <div style="font-size:22px;font-weight:800;">¥${a}</div>
                <div class="status-main ${stLower}"><span class="s-ico">${stLower === 'approved' ? '✔' : stLower === 'applied' ? '⏳' : stLower === 'rejected' ? '↩' : '•'}</span><span>${stLabel}</span></div>
              </div>
            </div>
            ${statusMeta ? `<div class="exp-claim-meta">${statusMeta}</div>` : ''}
            <div class="exp-claim-actions">
              <label class="exp-claim-meta"><input class="exp-claim-check" type="checkbox" data-role="pick-row" data-id="${id}" ${checked}>選択</label>
              <button class="btn exp-admin-btn-primary" data-action="approve" type="button" style="height:30px;">承認</button>
              <button class="btn exp-admin-btn-secondary" data-action="reject" type="button" style="height:30px;">差戻し</button>
              <button class="btn exp-admin-btn-secondary" data-action="edit" type="button" style="height:30px;">編集</button>
              ${receiptAction}
              <button class="btn exp-admin-btn-secondary" data-action="chat" type="button" style="height:30px;">チャット</button>
              <button class="btn exp-admin-btn-danger" data-action="delete" type="button" style="height:30px;">削除</button>
            </div>
          </article>`;
        }).join('');
        const pager = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 10px;">
            <div style="color:#64748b;font-size:12px;">${totalRows2 ? (startIdx + 1) : 0}-${Math.min(startIdx + viewState.pageSize, totalRows2)} / ${totalRows2} 件</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="font-size:12px;color:#334155;">表示件数
                <select id="expPageSize" style="margin-left:4px;height:28px;">
                  <option value="20" ${viewState.pageSize === 20 ? 'selected' : ''}>20</option>
                  <option value="50" ${viewState.pageSize === 50 ? 'selected' : ''}>50</option>
                  <option value="100" ${viewState.pageSize === 100 ? 'selected' : ''}>100</option>
                </select>
              </label>
              <button class="btn exp-page-btn" data-page="${Math.max(1, viewState.page - 1)}" ${viewState.page <= 1 ? 'disabled' : ''} style="height:28px;">前</button>
              <span style="font-size:12px;color:#334155;">${viewState.page} / ${totalPages}</span>
              <button class="btn exp-page-btn" data-page="${Math.min(totalPages, viewState.page + 1)}" ${viewState.page >= totalPages ? 'disabled' : ''} style="height:28px;">次</button>
            </div>
          </div>
        `;
        tableHost.innerHTML = `
          ${pager}
          <div class="exp-claims-list">${rowsHtml || '<div class="empty-state"><div style="font-size:24px;">📭</div><div>選択中の社員に表示できる明細はありません</div></div>'}</div>
        `;
        const bulkState = document.getElementById('expBulkState');
        if (bulkState) bulkState.textContent = `${viewState.selectedRowIds.size}件選択中`;
        const bulkApproveBtn = document.getElementById('expBulkApprove');
        if (bulkApproveBtn) bulkApproveBtn.onclick = async () => {
          const ids = Array.from(viewState.selectedRowIds || []);
          if (!ids.length) return;
          const ok = window.confirm(`${ids.length}件を一括承認しますか？`);
          if (!ok) return;
          for (const rid of ids) {
            try { await fetchJSONAuth(`/api/expenses/${encodeURIComponent(rid)}/status`, { method:'PATCH', body: JSON.stringify({ status: 'approved', note: '' }) }); } catch {}
          }
          viewState.selectedRowIds.clear();
          await reload();
        };
        const bulkClearBtn = document.getElementById('expBulkClear');
        if (bulkClearBtn) bulkClearBtn.onclick = () => {
          viewState.selectedRowIds.clear();
          const bs = document.getElementById('expBulkState');
          if (bs) bs.textContent = '0件選択中';
          tableHost.querySelectorAll('input[data-role="pick-row"]').forEach((el) => { el.checked = false; });
        };
        tableHost.querySelectorAll('.exp-page-btn').forEach((b) => {
          b.addEventListener('click', async () => {
            const next = parseInt(String(b.getAttribute('data-page') || '1'), 10);
            viewState.page = Number.isFinite(next) && next > 0 ? next : 1;
            await reload();
          });
        });
        const pageSizeSel = tableHost.querySelector('#expPageSize');
        pageSizeSel?.addEventListener('change', async () => {
          const n = parseInt(String(pageSizeSel.value || '10'), 10);
          viewState.pageSize = [10, 20, 50].includes(n) ? n : 10;
          viewState.page = 1;
          await reload();
        });
        if (tableHost && !tableHost.dataset.bound) {
          tableHost.dataset.bound = '1';
          tableHost.addEventListener('change', (e) => {
            const pick = e.target.closest('input[data-role="pick-row"][data-id]');
            if (!pick) return;
            const rid = String(pick.getAttribute('data-id') || '');
            if (!rid) return;
            if (pick.checked) viewState.selectedRowIds.add(rid);
            else viewState.selectedRowIds.delete(rid);
            const bs = document.getElementById('expBulkState');
            if (bs) bs.textContent = `${viewState.selectedRowIds.size}件選択中`;
          });
          tableHost.addEventListener('click', async (e) => {
            const link = e.target.closest('a.receipt-link');
            const rowEl2 = e.target.closest('[data-id]');
            if (link && rowEl2) {
              const c = parseInt(String(link.getAttribute('data-count')||'0'),10);
              if (c>1) {
                e.preventDefault();
                const filesBtn = rowEl2.querySelector('button[data-action="files"]');
                filesBtn?.click();
                return;
              }
            }
            const btn = e.target.closest('button[data-action]');
            if (!btn) {
              return;
            }
            const rowEl3 = btn.closest('[data-id]');
            const id = rowEl3 ? rowEl3.getAttribute('data-id') : '';
            if (!id) return;
            const action = btn.getAttribute('data-action');
            const status = action === 'approve' ? 'approved' : 'rejected';
            btn.disabled = true;
            try {
              if (action === 'approve' || action === 'reject') {
                let note = '';
                if (action === 'reject') {
                  note = window.prompt('却下理由を入力してください（必須）', '') || '';
                }
                await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/status`, { method:'PATCH', body: JSON.stringify({ status, note }) });
                await reload();
              } else if (action === 'edit') {
                const ensureEditModal = () => {
                  let overlay = document.getElementById('adminEditModalOverlay');
                  if (overlay) return overlay;
                  overlay = document.createElement('div');
                  overlay.id = 'adminEditModalOverlay';
                  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:20px;z-index:1600;';
                  overlay.innerHTML = `
                    <div id="adminEditModal" role="dialog" aria-modal="true" aria-label="交通費編集"
                      style="width:720px;max-width:90vw;max-height:90vh;background:#fff;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.2);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb;">
                        <div style="font-weight:800;color:#0b2c66;">編集（管理）</div>
                        <button id="adCloseTop" type="button" class="btn" aria-label="閉じる" style="width:34px;height:34px;padding:0;border-radius:999px;">×</button>
                      </div>
                      <div id="adScrollBody" style="overflow-y:auto;padding:14px 16px;">
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">基本情報</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;margin-bottom:12px;">
                          <div class="adjust-label">日付</div><div><input id="adDate" type="date" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">費目</div><div><select id="adType" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"><option value="train">電車</option><option value="bus">バス</option><option value="taxi">タクシー</option><option value="private_car">自家用車</option><option value="parking">駐車場</option><option value="highway">高速道路</option></select></div>
                          <div class="adjust-label">目的</div><div><input id="adPurpose" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">メモ</div><div><input id="adMemo" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">経路情報</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;margin-bottom:12px;">
                          <div class="adjust-label">出発</div><div><input id="adOrigin" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">経由</div><div><input id="adVia" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">到着</div><div><input id="adDestination" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">片道/往復</div><div><select id="adTripType" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"><option value="one_way">片道</option><option value="round_trip">往復</option></select></div>
                          <div class="adjust-label">回数</div><div><input id="adTripCount" type="number" min="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">定期</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="adTeiki" type="checkbox"><span>定期区間内</span></label></div>
                          <div class="adjust-label">通勤</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="adCommuter" type="checkbox"><span>通勤パス</span></label></div>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">金額情報</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;">
                          <div class="adjust-label">距離(km)</div><div><input id="adKm" type="number" step="0.1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">単価</div><div><input id="adUnitPrice" type="number" step="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">金額</div><div><input id="adAmount" type="number" step="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                        </div>
                      </div>
                      <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb;background:#fff;">
                        <button id="adCancel" class="btn" type="button" style="height:34px;">キャンセル</button>
                        <button id="adSave" class="btn btn-primary" type="button" style="height:34px;">保存</button>
                        <button id="adApply" class="btn" type="button" style="height:34px;">申請</button>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(overlay);
                  return overlay;
                };
                const closeOpenActionMenus = () => {
                  try {
                    const root = tableHost || document;
                    root.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
                  } catch {}
                };
                const openEdit = async (recId) => {
                  closeOpenActionMenus();
                  const overlay = ensureEditModal();
                  const modal = document.getElementById('adminEditModal');
                  try {
                    const r = filteredRows.find(x => String(x.id) === String(recId)) || await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`);
                    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
                    set('adDate', r.date ? String(r.date).slice(0,10) : todayMonth()+'-01');
                    set('adType', r.type || (r.category || 'train'));
                    set('adOrigin', r.origin || '');
                    set('adVia', r.via || '');
                    set('adDestination', r.destination || '');
                    set('adTripType', r.trip_type || 'one_way');
                    set('adTripCount', r.trip_count != null ? String(r.trip_count) : '1');
                    set('adKm', r.distance_km != null ? String(r.distance_km) : '');
                    set('adUnitPrice', r.unit_price_per_km != null ? String(r.unit_price_per_km) : '');
                    set('adPurpose', r.purpose || '');
                    try { const c1 = document.getElementById('adTeiki'); if (c1) c1.checked = !!r.teiki_flag; } catch {}
                    try { const c2 = document.getElementById('adCommuter'); if (c2) c2.checked = !!r.commuter_pass; } catch {}
                    set('adAmount', r.amount != null ? String(r.amount) : '');
                    set('adMemo', r.memo || '');
                  } catch {}
                  overlay.style.display = 'flex';
                  try { document.body.style.overflow = 'hidden'; } catch {}
                  const onCancel = () => {
                    overlay.style.display = 'none';
                    try { document.body.style.overflow = ''; } catch {}
                    cleanup();
                  };
                  const onSave = async () => {
                    const payload = {
                      date: document.getElementById('adDate')?.value,
                      type: document.getElementById('adType')?.value,
                      origin: document.getElementById('adOrigin')?.value,
                      via: document.getElementById('adVia')?.value,
                      destination: document.getElementById('adDestination')?.value,
                      trip_type: document.getElementById('adTripType')?.value,
                      trip_count: parseInt(String(document.getElementById('adTripCount')?.value||'1'),10),
                      distance_km: parseFloat(String(document.getElementById('adKm')?.value||'')),
                      unit_price_per_km: parseFloat(String(document.getElementById('adUnitPrice')?.value||'')),
                      purpose: document.getElementById('adPurpose')?.value,
                      teiki_flag: !!document.getElementById('adTeiki')?.checked,
                      commuter_pass: !!document.getElementById('adCommuter')?.checked,
                      amount: parseFloat(String(document.getElementById('adAmount')?.value||'')),
                      memo: document.getElementById('adMemo')?.value
                    };
                    try {
                      const current = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`);
                      const changed = [];
                      const cmp = (k, nv, ov) => { const n = nv==null?'':String(nv); const o = ov==null?'':String(ov); if (n!==o) changed.push(`${k}: ${o} → ${n}`); };
                      cmp('日付', payload.date, current.date ? String(current.date).slice(0,10) : '');
                      cmp('費目', payload.type, current.type || current.category);
                      cmp('出発', payload.origin, current.origin);
                      cmp('経由', payload.via, current.via);
                      cmp('到着', payload.destination, current.destination);
                      cmp('片道/往復', payload.trip_type, current.trip_type);
                      cmp('回数', payload.trip_count, current.trip_count);
                      cmp('距離(km)', payload.distance_km, current.distance_km);
                      cmp('単価', payload.unit_price_per_km, current.unit_price_per_km);
                      cmp('目的', payload.purpose, current.purpose);
                      cmp('定期', payload.teiki_flag, current.teiki_flag);
                      cmp('通勤', payload.commuter_pass, current.commuter_pass);
                      cmp('金額', payload.amount, current.amount);
                      cmp('メモ', payload.memo, current.memo);
                      const msg = changed.length ? ('変更内容:\n' + changed.join('\n') + '\n保存しますか？') : '変更はありません。保存しますか？';
                      const ok = window.confirm(msg);
                      if (!ok) return;
                    } catch {}
                    try { await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}`, { method:'PATCH', body: JSON.stringify(payload) }); await reload(); onCancel(); } catch (errU) {
                      const status = document.getElementById('expStatus');
                      if (status) {
                        status.textContent = `更新に失敗しました: ${String(errU?.message || 'unknown')}`;
                        status.style.display = 'block';
                        status.style.color = '#b00020';
                      }
                    }
                  };
                  const onApply = async () => {
                    try { await fetchJSONAuth(`/api/expenses/${encodeURIComponent(recId)}/apply`, { method:'POST' }); await reload(); onCancel(); } catch (errA) {
                      const status = document.getElementById('expStatus');
                      if (status) {
                        status.textContent = `申請に失敗しました: ${String(errA?.message || 'unknown')}`;
                        status.style.display = 'block';
                        status.style.color = '#b00020';
                      }
                    }
                  };
                  const cancelBtn = document.getElementById('adCancel');
                  const closeTopBtn = document.getElementById('adCloseTop');
                  const saveBtn = document.getElementById('adSave');
                  const applyBtn = document.getElementById('adApply');
                  const onOverlayClick = (ev) => {
                    if (ev.target === overlay) onCancel();
                  };
                  const onEsc = (ev) => {
                    if (ev.key === 'Escape') onCancel();
                  };
                  cancelBtn?.addEventListener('click', onCancel);
                  closeTopBtn?.addEventListener('click', onCancel);
                  saveBtn?.addEventListener('click', onSave);
                  applyBtn?.addEventListener('click', onApply);
                  overlay.addEventListener('click', onOverlayClick);
                  window.addEventListener('keydown', onEsc);
                  const cleanup = () => {
                    cancelBtn?.removeEventListener('click', onCancel);
                    closeTopBtn?.removeEventListener('click', onCancel);
                    saveBtn?.removeEventListener('click', onSave);
                    applyBtn?.removeEventListener('click', onApply);
                    overlay.removeEventListener('click', onOverlayClick);
                    window.removeEventListener('keydown', onEsc);
                  };
                };
                await openEdit(id);
              } else if (action === 'files') {
                let rows = [];
                try { rows = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/files`); } catch {}
                const next = rowEl3.nextElementSibling;
                if (next && next.classList.contains('files-row')) {
                  next.remove();
                  btn.disabled = false;
                  return;
                }
                if (Array.isArray(rows) && rows.length === 1) {
                  const f = rows[0];
                  const url = String(f.path || f.url || f.file_path || '').startsWith('/') ? String(f.path || f.url || f.file_path) : '/' + String(f.path || f.url || f.file_path || '');
                  try { window.open(url, '_blank'); } catch { window.location.href = url; }
                }
                if ((!rows || rows.length === 0) && btn.hasAttribute('data-url')) {
                  const url2 = btn.getAttribute('data-url') || '';
                  if (url2) { try { window.open(url2.startsWith('/')?url2:'/'+url2, '_blank'); } catch { window.location.href = (url2.startsWith('/')?url2:'/'+url2); } }
                }
                const filesHtml = Array.isArray(rows) && rows.length
                  ? rows.map(f => {
                      const isImg = String(f.mime || '').startsWith('image/');
                      const url = String(f.path || f.url || f.file_path || '').startsWith('/') ? String(f.path || f.url || f.file_path) : '/' + String(f.path || f.url || f.file_path || '');
                      const thumb = isImg ? `<img src="${url}" alt="${f.name || ''}" style="width:80px;height:auto;border:1px solid #e5e7eb;border-radius:8px;" />` : `<span style="font-weight:700;color:#1e40af;">PDF</span>`;
                      const name = f.name || f.original_name || url.split('/').pop();
                      return `<li style="display:flex;align-items:center;gap:8px;"><a href="${url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;text-decoration:none;">${thumb}<span>${name}</span></a></li>`;
                    }).join('')
                  : '<li>ファイルなし</li>';
                const expand = document.createElement('div');
                expand.className = 'files-row';
                expand.innerHTML = `<div style="border-top:1px dashed #dbe6f5;padding-top:8px;"><ul style="list-style:none;padding:0;margin:6px 0;display:flex;gap:8px;flex-wrap:wrap;">${filesHtml}</ul></div>`;
                rowEl3.after(expand);
              } else if (action === 'delete') {
                const ok = window.confirm('削除しますか？');
                if (!ok) { btn.disabled = false; return; }
                await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}`, { method:'DELETE' });
                await reload();
              }
            } catch {}
            if (action === 'chat') {
              const next = rowEl3.nextElementSibling;
              if (next && next.classList.contains('chat-row')) {
                next.remove();
                btn.disabled = false;
                return;
              }
              const chat = document.createElement('div');
              chat.className = 'chat-row';
              chat.innerHTML = `
                <div class="chat-box" style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff;">
                  <div class="chat-header" style="font-weight:700;color:#1f2937;margin-bottom:8px;">やり取り</div>
                  <div class="chat-reason" style="margin-bottom:8px;color:#7f1d1d;font-weight:700;"></div>
                  <div class="chat-messages" style="max-height:220px;overflow:auto;padding:6px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;"></div>
                  <div class="chat-input" style="display:flex;gap:8px;margin-top:8px;">
                    <input type="text" class="chat-text" placeholder="メッセージを入力…" style="flex:1;height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;">
                    <button class="btn chat-send" type="button" style="height:36px;">送信</button>
                  </div>
                </div>
              `;
              rowEl3.after(chat);
              const box = chat.querySelector('.chat-messages');
              const text = chat.querySelector('.chat-text');
              const send = chat.querySelector('.chat-send');
              const reasonEl = chat.querySelector('.chat-reason');
              try {
                const rec = rows.find(x => String(x.id) === String(id));
                const reason = rec && rec.manager_note ? String(rec.manager_note) : '';
                if (reasonEl) reasonEl.textContent = reason ? ('差戻し理由: ' + reason) : '';
              } catch {}
              const load = async () => {
                try {
                  const msgs = await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/messages`);
                  box.innerHTML = Array.isArray(msgs) && msgs.length
                    ? msgs.map(m => {
                        const who = m.sender_name || '';
                        const when = fmtDT(m.created_at);
                        const me = String(m.sender_user_id) === String(window.ADMIN_ID || '');
                        return `<div style="display:flex;margin:6px 0;${me?'justify-content:flex-end':''}">
                          <div style="max-width:70%;padding:8px 10px;border-radius:12px;${me?'background:#dbeafe;color:#1e3a8a;':'background:#e2e8f0;color:#111827;'}">
                            <div style="font-size:12px;color:#334155;font-weight:700;display:flex;justify-content:space-between;gap:8px;"><span>${who}</span><span style="color:#64748b;">${when}</span></div>
                            <div>${m.message}</div>
                          </div>
                        </div>`;
                      }).join('')
                    : '<div style="color:#64748b;">メッセージはありません</div>';
                } catch {
                  box.innerHTML = '<div style="color:#b00020;">読み込みに失敗しました</div>';
                }
              };
              await load();
              const doSend = async () => {
                const val = String(text.value || '').trim();
                if (!val) return;
                send.disabled = true;
                try {
                  await fetchJSONAuth(`/api/expenses/${encodeURIComponent(id)}/messages`, { method:'POST', body: JSON.stringify({ message: val }) });
                  text.value = '';
                  await load();
                } catch (errSend) {}
                send.disabled = false;
              };
              send.addEventListener('click', doSend);
              text.addEventListener('keydown', async (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); await doSend(); } });
              btn.disabled = false;
              return;
            }
            btn.disabled = false;
          });
        }
      }
      if (status) status.textContent = '';
    } catch (e) {
      if (status) status.textContent = `取得失敗: ${String(e?.message || 'unknown')}`;
    } finally { hideSpinner(); }
  };
  const btn = $('#expReload');
  if (btn) btn.addEventListener('click', reload);
  const monthInput = $('#expMonth');
  monthInput?.addEventListener('change', async () => {
    viewState.page = 1;
    await reload();
  });
  const aggregateMode = $('#expAggregateMode');
  aggregateMode?.addEventListener('change', async () => {
    viewState.page = 1;
    await reload();
  });
  ['#expDeptFilter','#expEmploymentFilter','#expApproverFilter','#expSortKey'].forEach((sel) => {
    const el = $(sel);
    el?.addEventListener('change', async () => { viewState.page = 1; await reload(); });
  });
  ['#expMinAmount','#expMaxAmount'].forEach((sel) => {
    const el = $(sel);
    el?.addEventListener('keydown', async (ev) => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      viewState.page = 1;
      await reload();
    });
  });
  const exportBtn = $('#expExportCsv');
  exportBtn?.addEventListener('click', async () => {
    try {
      const { q } = buildListQuery();
      q.set('page', '1');
      q.set('limit', '1000');
      const url = `/api/expenses/admin/export.csv?${q.toString()}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  });
  const toggleDetailsBtn = $('#expToggleDetails');
  toggleDetailsBtn?.addEventListener('click', async () => {
    viewState.showDetails = !viewState.showDetails;
    viewState.page = 1;
    await reload();
  });



  const toggleHistoryBtn = $('#expToggleHistory');
  toggleHistoryBtn?.addEventListener('click', async () => {
    viewState.showHistory = !viewState.showHistory;
    toggleHistoryBtn.textContent = viewState.showHistory ? '履歴を隠す' : '履歴を表示';
    await reload();
  });
  const closeBtn = $('#expMonthlyClose');
  const recalcBtn = $('#expMonthlyRecalc');
  const monthlyStatus = $('#expMonthlyStatus');
  const runMonthlyClose = async (forceRecalc) => {
    const month = $('#expMonth') ? $('#expMonth').value : todayMonth();
    const selectedUser = $('#expUserFilter') ? ($('#expUserFilter').value || '') : '';
    const actionLabel = forceRecalc ? '再計算' : '月次締め';
    const scopeLabel = selectedUser ? '選択中の社員' : '全社員';
    const ok = window.confirm(`${month} の交通費を${scopeLabel}対象で${actionLabel}しますか？`);
    if (!ok) return;
    if (monthlyStatus) {
      monthlyStatus.style.display = 'block';
      monthlyStatus.style.color = '#334155';
      monthlyStatus.textContent = `${actionLabel} 実行中...`;
    }
    try {
      const r = await fetchJSONAuth('/api/expenses/admin/monthly-close', {
        method: 'POST',
        body: JSON.stringify({ month, forceRecalc: !!forceRecalc, userId: selectedUser || null })
      });
      const n = Number(r?.result?.affectedUsers || 0);
      if (monthlyStatus) {
        monthlyStatus.style.color = '#166534';
        monthlyStatus.textContent = `${actionLabel} 完了: ${n}名`;
      }
      await reload();
    } catch (e) {
      if (monthlyStatus) {
        monthlyStatus.style.color = '#b00020';
        monthlyStatus.textContent = `${actionLabel} 失敗: ${String(e?.message || 'unknown')}`;
      }
    }
  };
  closeBtn?.addEventListener('click', async () => { await runMonthlyClose(false); });
  recalcBtn?.addEventListener('click', async () => { await runMonthlyClose(true); });
  await reload();
  try {
    pollTimer = window.setInterval(async () => {
      try {
        const month = $('#expMonth') ? $('#expMonth').value : todayMonth();
        const chats = await fetchJSONAuth(`/api/expenses/admin/messages?month=${encodeURIComponent(month)}`);
        renderChatNotice(chats, $('#expTableHost'));
      } catch {}
    }, 30000);
  } catch {}
  return () => {
    try { if (pollTimer) window.clearInterval(pollTimer); } catch {}
    try { hideSpinner(); } catch {}
    try {
      const backdrop = document.getElementById('drawerBackdrop');
      if (backdrop) {
        backdrop.setAttribute('hidden', '');
        backdrop.style.display = 'none';
      }
    } catch {}
    try {
      const overlay = document.getElementById('adminEditModalOverlay');
      if (overlay) {
        overlay.style.display = 'none';
        overlay.remove();
      }
    } catch {}
    try { document.body.style.overflow = ''; } catch {}
  };
};

export async function mount() {
  const profile = await requireAdmin();
  if (!profile) return;
  try { window.ADMIN_ID = profile.id; } catch {}
  try { window.ADMIN_PROFILE = profile; } catch {}
  return await render();
}
