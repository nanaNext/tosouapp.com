import{requireAdmin as Tt}from"../_shared/require-admin.js";import{fetchJSONAuth as $}from"../../api/http.api.js";import{$ as w,showSpinner as Ve,hideSpinner as _e,todayMonth as je,fmtDT as re,fmtJPY as we,fmtMonthLabel as Ke,statusLabel as ft,statusPillClass as bt,listYMBack as Ht}from"./expenses.helpers.js?v=navy-20260831-workflow1";const Rt=async ie=>{if(!ie)return;let Ae=0;const Ie=document.getElementById("status");Ie&&(Ie.textContent="",Ie.style.display="none"),ie.className="",ie.style.maxWidth="none",ie.style.width="100%",ie.style.marginLeft="0",ie.style.marginRight="0",ie.style.background="transparent",ie.style.border="0",ie.style.boxShadow="none",ie.style.padding="0",ie.innerHTML=`
    <div class="exp-admin-page">
      <style>
        .exp-admin-page [hidden] { display: none !important; }
        body.expenses-standalone { background: #f5f7fb; margin: 0 !important; padding: 0 !important; height: 100vh; overflow: hidden !important; }
        body.expenses-standalone #adminChrome { display: none !important; }
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
        .exp-admin-page .pill.st-soumu { border-color:#fde68a; background:#fffbeb; color:#92400e; }
        .exp-admin-page .pill.st-rejected { border-color:#fecaca; background:#fef2f2; color:#991b1b; }
        .exp-admin-page .pill.st-paid { border-color:#d8b4fe; background:#faf5ff; color:#9333ea; }
        .exp-admin-page .pill.st-other { border-color:#e2e8f0; background:#f8fafc; color:#334155; }
        .exp-admin-page .exp-dash-flow { display:grid; gap:6px; margin-top:4px; }
        .exp-admin-page .exp-dash-flow-step { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; }
        .exp-admin-page .exp-dash-flow-label { font-weight:700; color:#334155; white-space:nowrap; }
        .exp-admin-page .exp-dash-flow-val { color:#0f172a; text-align:right; }
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
          .exp-admin-page .exp-admin-table-wrap {
            overflow: visible !important;
            -webkit-overflow-scrolling: touch;
          }
          .exp-admin-page .exp-admin-table {
            width: 100% !important;
            min-width: 0 !important;
          }
          .exp-admin-page .exp-admin-table thead {
            display: none !important;
          }
          .exp-admin-page .exp-admin-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .exp-admin-page .exp-admin-table tbody tr {
            display: block !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            margin-bottom: 10px !important;
            padding: 10px 12px !important;
            background: #fff !important;
          }
          .exp-admin-page .exp-admin-table tbody td {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 6px 0 !important;
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            font-size: 13px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          .exp-admin-page .exp-admin-table tbody td:last-child {
            border-bottom: none !important;
          }
          .exp-admin-page .exp-admin-table tbody td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #475569;
            font-size: 12px;
            min-width: 70px;
            flex-shrink: 0;
          }
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
            <div class="mark" style="margin-left: 12px; margin-top: 4px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2" ry="2"></rect><path d="M4 11h16"></path><path d="M12 3v8"></path><path d="M8 19l-2 3"></path><path d="M18 22l-2-3"></path><path d="M8 15h.01"></path><path d="M16 15h.01"></path></svg>
            </div>
            <div class="name">
              <div style="font-size: 16px; font-weight: 700;">\u4EA4\u901A\u8CBB</div>
            </div>
          </div>
          <div class="exp-dash-side-nav-wrapper">
            <div style="font-size: 11px; color: #64748b; font-weight: 800; padding: 12px 20px 4px;">\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9</div>
            <button type="button" class="exp-dash-nav is-active" data-nav="dashboard">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </span>
                <span>Home</span>
              </span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </span>
                <span>\u5168\u4EF6\u4E00\u89A7</span>
              </span>
            </button>

            <div style="font-size: 11px; color: #64748b; font-weight: 800; padding: 16px 20px 4px;">\u8981\u5BFE\u5FDC\uFF08ToDo\uFF09</div>
            <button type="button" class="exp-dash-nav" data-status="applied">
              <span class="left">
                <span class="ico" style="color: #4ade80;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </span>
                <span>\u672A\u627F\u8A8D\uFF08\u7533\u8ACB\u4E2D\uFF09</span>
              </span>
              <span id="expBadgeApplied" class="exp-dash-badge" hidden>0</span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="soumu_checked">
              <span class="left">
                <span class="ico" style="color: #fbbf24;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                </span>
                <span>\u7DCF\u52D9\u78BA\u8A8D\u6E08\uFF08\u627F\u8A8D\u5F85\u3061\uFF09</span>
              </span>
              <span id="expBadgeSoumu" class="exp-dash-badge" hidden>0</span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="approved">
              <span class="left">
                <span class="ico" style="color: #38bdf8;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
                <span>\u672A\u652F\u7D66\uFF08\u627F\u8A8D\u6E08\uFF09</span>
              </span>
              <span id="expBadgeApproved" class="exp-dash-badge" hidden>0</span>
            </button>

            <div style="font-size: 11px; color: #64748b; font-weight: 800; padding: 16px 20px 4px;">\u51E6\u7406\u5B8C\u4E86\u30FB\u5C65\u6B74</div>
            <button type="button" class="exp-dash-nav" data-status="paid">
              <span class="left">
                <span class="ico" style="color: #c084fc;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </span>
                <span>\u652F\u7D66\u6E08\u307F</span>
              </span>
              <span id="expBadgePaid" class="exp-dash-badge" hidden>0</span>
            </button>
            <button type="button" class="exp-dash-nav" data-status="rejected">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                </span>
                <span>\u5DEE\u623B\u3057</span>
              </span>
              <span id="expBadgeRejected" class="exp-dash-badge" hidden>0</span>
            </button>
            <button id="expDashArchive" type="button" class="exp-dash-nav" data-status="archived">
              <span class="left">
                <span class="ico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><polyline points="1 3 23 3 23 8 1 8 1 3"></polyline><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                </span>
                <span>\u6708\u6B21\u7DE0\u3081\u5C65\u6B74</span>
              </span>
            </button>

            <button id="expDashCsv" type="button" class="exp-dash-nav" style="display: flex; justify-content: flex-start; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
              <span class="left" style="padding-left: 30px;">
                <span>CSV\u51FA\u529B</span>
              </span>
            </button>
          </div>
        </aside>
        <main class="exp-dash-main">
          <header class="exp-dash-appbar">
            <div class="exp-dash-appbar-left">
              <button id="expDashBurger" class="exp-dash-burger" type="button">\u2630</button>
              <div class="exp-dash-appbar-vsep"></div>
              <div id="expDashTitle" class="exp-dash-appbar-title">Home</div>
            </div>
            <div class="exp-dash-appbar-right">
              <div style="position: relative;">
                <button id="expDashBell" class="exp-dash-iconbtn" type="button" aria-label="\u901A\u77E5" style="background: transparent; border: none; font-size: 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span id="expDashBellBadge" class="badge" hidden>0</span>
                </button>
                <div id="expDashBellPopup" class="exp-dash-bell-popup" hidden>
                  <div class="exp-dash-bell-popup-head">\u304A\u77E5\u3089\u305B</div>
                  <div id="expDashBellPopupBody" class="exp-dash-bell-popup-body">
                    <div class="exp-dash-bell-empty">\u65B0\u3057\u3044\u901A\u77E5\u306F\u3042\u308A\u307E\u305B\u3093</div>
                  </div>
                </div>
              </div>
              <button id="expDashHelp" class="exp-dash-iconbtn" type="button" aria-label="\u30D8\u30EB\u30D7" onclick="alert('\u64CD\u4F5C\u30AC\u30A4\u30C9\u306F\u5F8C\u65E5\u8A2D\u5B9A\u3055\u308C\u307E\u3059\u3002');" style="background: transparent; border: none; color: #0f172a; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </button>
              <div class="exp-dash-userchip" title="" id="expDashUserMenuToggle" style="cursor: pointer; border: none; background: transparent;">
                <div class="exp-dash-avatar" style="background-image: url('/static/images/use.png'); background-size: cover; background-position: center; width: 32px; height: 32px;"></div>
                <div class="exp-dash-user-info" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.2;">
                  <div id="expDashUserName" class="exp-dash-username" style="font-size: 13px;"></div>
                  <div style="font-size: 11px; color: #64748b; font-weight: normal;">\u7BA1\u7406\u8005</div>
                </div>
                <div class="exp-dash-user-arrow" style="color: #64748b; margin-left: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
              
              <!-- Menu Dropdown -->
              <div id="expDashUserMenu" hidden style="position: absolute; top: 56px; right: 16px; background: #fff; border: 1px solid #e5eaf2; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); z-index: 1000; min-width: 160px; overflow: hidden;">
                <button id="expDashLogout" type="button" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: transparent; border: none; font-size: 13px; color: #ef4444; cursor: pointer; text-align: left;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>\u30ED\u30B0\u30A2\u30A6\u30C8</span>
                </button>
              </div>
            </div>
          </header>
          <div class="exp-dash-body">
            <div class="exp-dash-content">
            <div class="exp-dash-top">
            <div class="exp-dash-filters">
              <label class="exp-dash-field">\u5BFE\u8C61\u6708
                <input id="expDashMonth" type="month">
              </label>
              <div id="expDashTopTotal" class="exp-dash-field" style="margin-left: auto; font-size: 13px; font-weight: normal; color: #64748b;" hidden></div>
            </div>
          </div>
          <div id="expDashKpi" class="exp-dash-kpi exp-dash-dashboard-only"></div>
          <div class="exp-dash-charts exp-dash-dashboard-only">
            <div class="exp-dash-card">
              <div class="exp-dash-card-title">\u6708\u5225\u4EA4\u901A\u8CBB\u63A8\u79FB\uFF08\u76F4\u8FD16\u30F6\u6708\uFF09</div>
              <div id="expDashTrend" class="exp-dash-trend"></div>
            </div>
            <div class="exp-dash-card">
              <div class="exp-dash-card-title">\u90E8\u7F72\u5225\u306E\u4EA4\u901A\u8CBB\u5272\u5408\uFF08\u4ECA\u6708\uFF09</div>
              <div id="expDashDeptShare" class="exp-dash-deptshare"></div>
            </div>
          </div>
          <div class="exp-dash-card exp-dash-list-only">
            <div class="exp-dash-card-head">
              <div class="exp-dash-card-title">\u6700\u8FD1\u306E\u7533\u8ACB\u4E00\u89A7</div>
              <div id="expDashListMeta" class="exp-dash-muted"></div>
            </div>
            <div id="expDashList"></div>
          </div>
            <div id="expDashStatus" class="exp-dash-muted"></div>
            </div>
            <aside id="expDashDrawer" class="exp-dash-drawer" hidden>
              <div class="exp-dash-drawer-head">
                <div class="exp-dash-drawer-title">\u7533\u8ACB\u8A73\u7D30</div>
                <button id="expDashDrawerClose" class="exp-dash-drawer-close" type="button" aria-label="\u9589\u3058\u308B">\u2715</button>
              </div>
              <div id="expDashDrawerBody" class="exp-dash-drawer-body"></div>
              <div class="exp-dash-drawer-foot">
                <div class="exp-dash-drawer-foot-title">\u627F\u8A8D\u30A2\u30AF\u30B7\u30E7\u30F3</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">\u30B3\u30E1\u30F3\u30C8</div>
                <textarea id="expDashNote" class="exp-dash-note" placeholder="\u30B3\u30E1\u30F3\u30C8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044"></textarea>
                <div class="exp-dash-drawer-actions" style="margin-top: 4px;">
                  <button id="expDashApprove" class="btn exp-dash-btn-approve" type="button" data-next="">\u627F\u8A8D\u3059\u308B</button>
                  <button id="expDashReject" class="btn exp-dash-btn-reject" type="button">\u5DEE\u3057\u623B\u3059</button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </section>
      <div id="expDashBackdrop" class="exp-dash-backdrop" hidden></div>
      <div class="exp-admin-header-row">
        <h3 class="exp-admin-title">\u4EA4\u901A\u8CBB\u8A08\u7B97\u7BA1\u7406</h3>
      </div>
      <div class="exp-admin-guide" aria-label="\u64CD\u4F5C\u30AC\u30A4\u30C9">
        <div class="exp-admin-step"><span class="exp-admin-step-no">1</span><span>\u5BFE\u8C61\u6708\u30FB\u96C6\u8A08\u5BFE\u8C61\u3092\u9078\u3076</span></div>
        <div class="exp-admin-step"><span class="exp-admin-step-no">2</span><span>\u793E\u54E1\u5225\u96C6\u8A08\u3092\u78BA\u8A8D</span></div>
        <div class="exp-admin-step"><span class="exp-admin-step-no">3</span><span>\u5FC5\u8981\u306A\u884C\u3060\u3051\u660E\u7D30\u3067\u627F\u8A8D/\u5DEE\u623B\u3057</span></div>
      </div>
      <div class="exp-admin-toolbar-row">
        <div class="exp-admin-filters">
          <label for="expMonth" class="exp-admin-label">\u5BFE\u8C61\u6708</label>
          <input id="expMonth" type="month" class="exp-admin-input">
          <label for="expAggregateMode" class="exp-admin-label">\u96C6\u8A08\u5BFE\u8C61</label>
          <select id="expAggregateMode" class="exp-admin-input exp-admin-select" aria-label="\u96C6\u8A08\u5BFE\u8C61">
            <option value="approved">\u627F\u8A8D\u6E08\u307F</option>
            <option value="applied_approved">\u7533\u8ACB\u4E2D+\u627F\u8A8D\u6E08\u307F</option>
            <option value="all">\u5168\u3066</option>
          </select>
          <select id="expUserFilter" class="exp-admin-input exp-admin-select" aria-label="\u793E\u54E1">
            <option value="">\u5168\u54E1</option>
          </select>
        </div>
        <div class="exp-admin-actions">
          <div class="exp-admin-actions-basic">
          <button id="expReload" class="btn exp-admin-reload exp-admin-btn-primary" type="button">\u691C\u7D22</button>
          <details class="exp-admin-actions-more">
            <summary>\u305D\u306E\u4ED6</summary>
            <div class="exp-admin-more-pop">
              <button id="expExportCsv" class="btn exp-admin-btn-secondary" type="button">CSV\u51FA\u529B</button>
              <button id="expToggleHistory" class="btn exp-admin-btn-secondary" type="button">\u5C65\u6B74\u3092\u8868\u793A</button>
              <button id="expToggleDetails" class="btn exp-admin-btn-secondary" type="button">\u660E\u7D30\u8868\u793A</button>
            </div>
          </details>
          </div>
          <details class="exp-admin-actions-monthly">
            <summary>\u6708\u6B21\u51E6\u7406</summary>
            <div class="exp-admin-monthly-pop">
              <button id="expMonthlyClose" class="btn exp-admin-btn-primary" type="button">\u6708\u6B21\u7DE0\u3081</button>
              <button id="expMonthlyRecalc" class="btn exp-admin-btn-danger" type="button">\u518D\u8A08\u7B97</button>
            </div>
          </details>
        </div>
      </div>
      <div id="expMonthlyStatus" class="exp-admin-status"></div>
      <section id="expMonthApplySection" class="exp-admin-section">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <h4 class="exp-admin-section-title" style="margin:0;">\u6708\u6B21\u7533\u8ACB\uFF08\u5F93\u696D\u54E1\u2192\u7BA1\u7406\uFF09</h4>
          <div class="exp-mini-help">\u5BFE\u8C61\u6708\u306B\u7533\u8ACB\u304C\u3042\u308B\u793E\u54E1\u304C\u8868\u793A\u3055\u308C\u307E\u3059\uFF08\u627F\u8A8D\u306F\u6708\u5358\u4F4D\uFF09</div>
        </div>
        <div id="expMonthApplyHost" class="exp-admin-table-host"></div>
      </section>
      <section id="expMonthlyHistorySection" class="exp-admin-section">
        <h4 class="exp-admin-section-title">\u6708\u6B21\u5C65\u6B74</h4>
        <div id="expMonthlyHistoryHost" class="exp-admin-table-host"></div>
      </section>
      <section class="exp-admin-section exp-op-workspace">
        <div class="exp-op-grid">
          <aside class="exp-op-panel">
            <h5>\u793E\u54E1\u4E00\u89A7</h5>
            <div id="expEmployeeListHost" class="exp-employee-list"></div>
          </aside>
          <main class="exp-op-panel">
            <div id="expEmployeeMonthsHost" class="exp-month-chip-row"></div>
            <div id="expSelectedMonthSummary" class="exp-month-summary"></div>
            <div id="expEmployeeMonthOverview" class="exp-month-overview"></div>
            <div id="expBulkBar" class="exp-bulk-bar">
              <div id="expBulkState">0\u4EF6\u9078\u629E\u4E2D</div>
              <div class="exp-bulk-actions">
                <button id="expBulkApprove" class="btn exp-admin-btn-primary" type="button">\u4E00\u62EC\u627F\u8A8D</button>
                <button id="expBulkClear" class="btn exp-admin-btn-secondary" type="button">\u9078\u629E\u89E3\u9664</button>
              </div>
            </div>
            <div id="expTableHost" class="exp-admin-table-host"></div>
          </main>
        </div>
      </section>
      <div id="chatNotice" class="exp-admin-chat">
        <div class="exp-admin-chat-title">\u30C1\u30E3\u30C3\u30C8\u901A\u77E5</div>
        <div id="chatList" class="exp-admin-chat-list"></div>
      </div>
      <div id="expStatus" class="exp-admin-status"></div>
    </div>
  `;const ze=new URLSearchParams(window.location.search||""),Ne=ze.get("month")||"",Oe=ze.get("userId")||"",Pt=["1","true","yes"].includes(String(ze.get("openDetails")||"").toLowerCase());let We=!1;const Ge=w("#expMonth");Ge&&(Ge.value=Ne||je());const y=i=>String(i??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s]),o={month:Ne&&/^\d{4}-\d{2}$/.test(Ne)?Ne:je(),departmentId:"",q:"",status:"",page:1,limit:10,departments:[],deptMap:new Map,selectedId:"",view:"dashboard"},Me=["#3b82f6","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#64748b","#f97316","#22c55e","#e11d48"],Ee=()=>{try{const i=document.getElementById("expDashRoot");if(!i)return;const s=o.view==="list"?"list":"dashboard";i.classList.toggle("mode-dashboard",s==="dashboard"),i.classList.toggle("mode-list",s==="list");const e=String(o.status||""),t=e==="monthly_approval"||e==="applied_approved",n=document.getElementById("expMonthApplySection");n&&(n.style.display="none");const a=document.getElementById("expMonthlyHistorySection");a&&(a.style.display="none");const c=document.getElementById("expDashList");c&&(c.style.display="block")}catch{}},ue=(i,s)=>{const e=document.getElementById("expDashStatus");e&&(e.textContent=String(i||""),e.style.color=s?"#b00020":"")},Te=(i,s)=>{const e=document.getElementById(i);if(!e)return;const t=Math.max(0,Number(s||0));e.textContent=String(t),t>0?e.removeAttribute("hidden"):e.setAttribute("hidden","")},ke=i=>{const s=document.getElementById("expDashTitle");s&&(s.textContent=String(i||""))},yt=async()=>{const i=String(o.month||"").slice(0,7);return await $(`/api/expenses/admin/dashboard?month=${encodeURIComponent(i)}&months=6`)},vt=async()=>{const i=Ht(String(o.month||"").slice(0,7),6),s=async r=>{const d=new URLSearchParams;d.set("month",String(r||"").slice(0,7)),d.set("page","1"),d.set("limit","1000"),d.set("sortBy","date"),d.set("sortDir","desc");const l=await $(`/api/expenses/admin/list?${d.toString()}`);return Array.isArray(l?.rows)?l.rows:[]},e=(r,d)=>{let l=0,m=0,u=0,x=0,f=0,h=0;const E=new Set,G=new Map;for(const P of Array.isArray(d)?d:[]){const U=String(P?.status||"").toLowerCase(),Y=Math.max(0,Number(P?.amount||0)),p=P?.userId!=null?String(P.userId):"";if(U==="applied"?(x+=1,l+=Y):U==="approved"?(f+=1,m+=Y):U==="rejected"&&(h+=1,u+=Y),(U==="applied"||U==="approved")&&p&&E.add(p),U==="applied"||U==="approved"){const g=P?.departmentId==null?"":String(P.departmentId),b=G.get(g)||{departmentId:g||null,totalAmount:0,itemCount:0,userSet:new Set};b.totalAmount+=Y,b.itemCount+=1,p&&b.userSet.add(p),G.set(g,b)}}const fe=l+m,le=E.size,oe=Array.from(G.values()).map(P=>({departmentId:P.departmentId,totalAmount:P.totalAmount,itemCount:P.itemCount,userCount:P.userSet.size})).sort((P,U)=>U.totalAmount-P.totalAmount);return{month:r,totalAmount:fe,appliedAmount:l,approvedAmount:m,rejectedAmount:u,appliedCount:x,approvedCount:f,rejectedCount:h,applicantUsers:le,departmentShares:oe}},n=(await Promise.allSettled(i.map(r=>s(r)))).map((r,d)=>e(i[d],r.status==="fulfilled"?r.value:[])),a=n[n.length-1]||e(String(o.month||""),[]),c=a.applicantUsers>0?Math.round(a.totalAmount/a.applicantUsers):0;return{month:a,avgPerUser:c,trend:n.map(r=>({month:r.month,totalAmount:r.totalAmount,appliedAmount:r.appliedAmount,approvedAmount:r.approvedAmount,appliedCount:r.appliedCount,approvedCount:r.approvedCount,applicantUsers:r.applicantUsers})),departmentShares:a.departmentShares||[]}},Ye=async()=>{const s=o.status==="monthly_approval"||o.status==="archived"?o.status==="archived"?"approved":"applied":o.status,e=2e3,t=new URLSearchParams;return t.set("month",String(o.month||"").slice(0,7)),t.set("page",String(o.page||1)),t.set("limit",String(e)),t.set("sortBy","date"),t.set("sortDir","desc"),s&&t.set("status",s),o.departmentId&&t.set("departmentId",o.departmentId),o.q&&t.set("name",o.q),await $(`/api/expenses/admin/list?${t.toString()}`)},wt=i=>{const s=document.getElementById("expDashKpi");if(!s)return;const e=i?.month||{},t=Array.isArray(i?.trend)?i.trend:[],n=t.length>=2?t[t.length-2]:null,a=n?Number(e.totalAmount||0)-Number(n.totalAmount||0):null,c=a==null?"":`${a>=0?"+":"-"}${we(Math.abs(a))}`,r=Number(i?.avgPerUser||0),d=[{title:"\u4ECA\u6708\u306E\u4EA4\u901A\u8CBB\u7DCF\u984D\uFF08\u7533\u8ACB\u4E2D+\u627F\u8A8D\u6E08\uFF09",value:we(e.totalAmount||0),sub:c?`\u524D\u6708\u6BD4 ${c}`:" ",cls:"c1",ico:"\xA5",nav:"all"},{title:"\u627F\u8A8D\u5F85\u3061\u4EF6\u6570",value:`${Number(e.appliedCount||0).toLocaleString("ja-JP")}\u4EF6`,sub:we(e.appliedAmount||0),cls:"c2",ico:"\u23F3",nav:"pending"},{title:"\u5DEE\u623B\u3057\u4EF6\u6570",value:`${Number(e.rejectedCount||0).toLocaleString("ja-JP")}\u4EF6`,sub:we(e.rejectedAmount||0),cls:"c3",ico:"\u21A9",nav:"rejected"},{title:"\u4ECA\u6708\u7533\u8ACB\u4EBA\u6570",value:`${Number(e.applicantUsers||0).toLocaleString("ja-JP")}\u4EBA`,sub:" ",cls:"c4",ico:"\u{1F465}",nav:"all"},{title:"\u5E73\u5747\u4EA4\u901A\u8CBB\uFF081\u4EBA\u3042\u305F\u308A\uFF09",value:we(r),sub:" ",cls:"c5",ico:"\u2205",nav:"all"}];s.innerHTML=d.map(l=>`
      <div class="exp-dash-kpi-card ${l.cls}" data-nav="${l.nav}" style="cursor:pointer;">
        <div class="head">
          <div class="icon">${y(l.ico)}</div>
          <div class="t" style="font-size:14px; font-weight:normal;">${y(l.title)}</div>
        </div>
        <div class="v">${y(l.value)}</div>
        <div class="s">${y(l.sub)}</div>
      </div>
    `).join(""),s.querySelectorAll("[data-nav]").forEach(l=>{l.addEventListener("click",()=>{const m=l.dataset.nav,u=m==="pending"?"applied":m==="rejected"?"rejected":"",x=document.querySelector(`.exp-dash-nav[data-status="${u}"]`);if(x){x.click();return}})})},kt=i=>{const s=document.getElementById("expDashTrend");if(!s)return;const e=Array.isArray(i?.trend)?i.trend:[];if(!e.length){s.innerHTML='<div class="exp-dash-empty">\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</div>';return}const t=e.map(a=>Math.max(0,Number(a?.totalAmount||0))),n=Math.max(1,...t);s.innerHTML=`
      <div class="exp-dash-bars">
        ${e.map((a,c)=>{const r=Math.max(0,Number(a?.totalAmount||0)),d=Math.max(6,Math.round(r/n*100)),l=Ke(a?.month||"")||String(a?.month||"");return`<div class="exp-dash-bar">
            <div class="b" style="height:${d}%; background:${Me[c%Me.length]};"></div>
            <div class="l">${y(l.slice(2))}</div>
          </div>`}).join("")}
      </div>
    `},St=i=>{const s=document.getElementById("expDashDeptShare");if(!s)return;const e=Array.isArray(i?.departmentShares)?i.departmentShares:[];if(!e.length){s.innerHTML='<div class="exp-dash-empty">\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</div>';return}const t=e.reduce((d,l)=>d+Math.max(0,Number(l?.totalAmount||0)),0);if(t<=0){s.innerHTML='<div class="exp-dash-empty">\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</div>';return}let n=0;const c=`background: conic-gradient(${e.map((d,l)=>{const m=Math.max(0,Number(d?.totalAmount||0)),u=n/t*360;n+=m;const x=n/t*360;return`${Me[l%Me.length]} ${u}deg ${x}deg`}).join(", ")});`,r=e.map((d,l)=>{const m=Math.max(0,Number(d?.totalAmount||0)),u=t>0?Math.round(m/t*1e3)/10:0,x=d?.departmentId==null?"":String(d.departmentId),f=x?o.deptMap.get(x)||`#${x}`:"\u672A\u8A2D\u5B9A";return`<div class="exp-dash-legend-row">
        <span class="dot" style="background:${Me[l%Me.length]};"></span>
        <span class="name">${y(f)}</span>
        <span class="pct">${y(String(u))}%</span>
        <span class="amt">${y(we(m))}</span>
      </div>`}).join("");s.innerHTML=`
      <div class="exp-dash-deptwrap">
        <div class="exp-dash-donut" style="${c}"><div class="hole"></div></div>
        <div class="exp-dash-legend">${r}</div>
      </div>
    `},Qe=()=>{try{return!!(window.matchMedia&&window.matchMedia("(min-width: 1101px)").matches)}catch{return!1}},Be=async i=>{const s=document.getElementById("expDashDrawer"),e=document.getElementById("expDashBackdrop"),t=document.getElementById("expDashDrawerBody");if(!s||!t)return;try{const a=document.getElementById("expDashRoot");a&&Qe()&&a.classList.add("with-drawer")}catch{}o.selectedId=String(i||""),s.removeAttribute("hidden");const n=Qe();try{n?(e?.setAttribute("hidden",""),document.body.style.overflow=""):(e?.removeAttribute("hidden"),document.body.style.overflow="hidden")}catch{}t.innerHTML='<div class="exp-dash-muted">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>';try{const[a,c]=await Promise.all([$(`/api/expenses/admin/detail/${encodeURIComponent(o.selectedId)}`),$(`/api/expenses/${encodeURIComponent(o.selectedId)}/files`).catch(()=>[])]),r=[a?.origin||"",a?.destination||""].filter(Boolean).join(" \u2192 ")||"-",d=a?.departmentId?String(a.departmentId):"",l=d?o.deptMap.get(d)||`#${d}`:"",m=Array.isArray(c)?c:[],u=m.length?m.map(Q=>{const X=String(Q?.path||""),be=X.startsWith("/")?X:"/"+X,se=Q?.name||be.split("/").pop();return`
          <a class="exp-dash-file-card" href="${y(be)}" target="_blank" rel="noopener">
            <div class="exp-dash-file-card-left">
              <span class="exp-dash-file-ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </span>
              <div class="exp-dash-file-info">
                <span class="exp-dash-file-name">${y(se)}</span>
              </div>
            </div>
            <span class="exp-dash-file-dl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
          </a>
        `}).join(""):'<div class="exp-dash-muted" style="font-size:12px;">\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB\u306A\u3057</div>',x=String(a?.status||""),f=ft(x),h=bt(x),E=String(a?.type||a?.category||"")==="goods",G=String(a?.site_name||"").trim(),fe=String(a?.payment_method||""),le=[["","\u672A\u8A2D\u5B9A"],["cash","\u73FE\u91D1"],["advance","\u7ACB\u66FF"],["corporate_card","\u6CD5\u4EBA\u30AB\u30FC\u30C9"]].map(([Q,X])=>`<option value="${Q}" ${fe===Q?"selected":""}>${X}</option>`).join(""),oe=E?`
          <div class="row"><div class="k">\u8CFC\u5165\u7269\u54C1\u540D</div><div class="v">${y(a?.item_name||"\u30FC")}</div></div>
          <div class="row"><div class="k">\u8CFC\u5165\u5148</div><div class="v">${y(a?.vendor||"\u30FC")}</div></div>
        `:`
          <div class="row"><div class="k">\u901A\u52E4\u533A\u9593</div><div class="v">${y(r)}</div></div>
          <div class="row"><div class="k">\u5229\u7528\u4EA4\u901A\u6A5F\u95A2</div><div class="v">${y(a?.transport_type||"\u96FB\u8ECA")}</div></div>
        `;t.innerHTML=`
        <div class="exp-dash-detail">
          <div class="row"><div class="k">\u7533\u8ACBID</div><div class="v">${y(String(a?.id||""))} <span class="pill ${h}" style="margin-left:4px;">${y(f)}</span></div></div>
          <div class="row"><div class="k">\u7533\u8ACB\u8005</div><div class="v">${y(a?.user_name||a?.user_email||"")}</div></div>
          <div class="row"><div class="k">\u90E8\u7F72</div><div class="v">${y(l)}</div></div>
          <div class="row"><div class="k">\u5BFE\u8C61\u6708</div><div class="v">${y(Ke(String(a?.date||"").slice(0,7))||"")}</div></div>
          <div class="row"><div class="k">\u7533\u8ACB\u65E5</div><div class="v">${y(String(a?.date||"").slice(0,10))}</div></div>
          ${oe}
          <div class="row"><div class="k">\u73FE\u5834\u540D</div><div class="v">${y(G||"\u30FC")}</div></div>
          <div class="row"><div class="k">\u91D1\u984D</div><div class="v">${y(we(a?.amount||0))}</div></div>
          <div class="row"><div class="k">\u5099\u8003</div><div class="v">${y(a?.note||"\u30FC")}</div></div>
        </div>

        <div class="exp-dash-history">
          <div class="exp-dash-history-title">\u652F\u6255\u65B9\u6CD5\uFF08\u7D4C\u7406\uFF09</div>
          <div class="v" style="display:flex; gap:8px; align-items:center;">
            <select id="expDashPayMethod" class="exp-dash-note" style="min-height:34px; height:34px; padding:0 8px; flex:1;">${le}</select>
            <button id="expDashPayMethodSave" class="btn" type="button" style="min-height:34px; padding:0 12px; font-weight:800; border:1px solid #0b2c66; background:#0b2c66; color:#fff; border-radius:4px;">\u4FDD\u5B58</button>
          </div>
          <div id="expDashPayMethodMsg" style="font-size:11px; color:#16a34a; margin-top:4px;"></div>
        </div>

        <div class="exp-dash-history">
          <div class="exp-dash-history-title">\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB</div>
          <div class="v files">${u}</div>
        </div>

        <div class="exp-dash-history">
          <div class="exp-dash-history-title">\u627F\u8A8D\u30D5\u30ED\u30FC\u5C65\u6B74</div>
          <div class="exp-dash-flow">
            <div class="exp-dash-flow-step">
              <span class="exp-dash-flow-label">\u2460 \u7533\u8ACB</span>
              <span class="exp-dash-flow-val">${a?.applied_at?y(re(a.applied_at)):String(x).toLowerCase()!=="draft"&&String(x).toLowerCase()!=="pending"?"\u7533\u8ACB\u6E08":"\u672A\u7533\u8ACB"}</span>
            </div>
            <div class="exp-dash-flow-step">
              <span class="exp-dash-flow-label">\u2461 \u7DCF\u52D9\u78BA\u8A8D</span>
              <span class="exp-dash-flow-val">${a?.soumu_checked_at?`${y(re(a.soumu_checked_at))}${a?.soumu_checked_name?" / "+y(a.soumu_checked_name):""}`:"\u672A\u78BA\u8A8D"}</span>
            </div>
            <div class="exp-dash-flow-step">
              <span class="exp-dash-flow-label">\u2462 \u793E\u9577\u627F\u8A8D</span>
              <span class="exp-dash-flow-val">${(String(x).toLowerCase()==="approved"||String(x).toLowerCase()==="paid")&&a?.approved_at?`${y(re(a.approved_at))}${a?.approver_name?" / "+y(a.approver_name):""}`:"\u672A\u627F\u8A8D"}</span>
            </div>
            <div class="exp-dash-flow-step">
              <span class="exp-dash-flow-label">\u2463 \u652F\u7D66</span>
              <span class="exp-dash-flow-val">${String(x).toLowerCase()==="paid"&&a?.approved_at?y(re(a.approved_at)):"\u672A\u652F\u7D66"}</span>
            </div>
          </div>
          <div class="v" style="font-size:12px; color:#64748b; margin-top:6px;">\u30B3\u30E1\u30F3\u30C8: ${y(a?.manager_note||"\u30FC")}</div>
        </div>
      `;const P=document.getElementById("expDashPayMethodSave");P&&!P.dataset.bound&&(P.dataset.bound="1",P.addEventListener("click",async()=>{const Q=document.getElementById("expDashPayMethod"),X=document.getElementById("expDashPayMethodMsg"),be=String(Q?.value||"");P.disabled=!0;try{await $(`/api/expenses/${encodeURIComponent(o.selectedId)}`,{method:"PATCH",body:JSON.stringify({payment_method:be})}),X&&(X.style.color="#16a34a",X.textContent="\u652F\u6255\u65B9\u6CD5\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002")}catch(se){X&&(X.style.color="#b00020",X.textContent=String(se?.message||"\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}finally{P.disabled=!1}}));const U=String(window.ADMIN_PROFILE&&window.ADMIN_PROFILE.role||"").toLowerCase(),Y=U==="admin"||U==="owner"||U==="sysadmin",p=U==="manager"||Y,g=String(x).toLowerCase();let b="",A="";g==="applied"&&p?(b="soumu_checked",A="\u7DCF\u52D9\u78BA\u8A8D\u3059\u308B"):g==="soumu_checked"&&Y?(b="approved",A="\u793E\u9577\u627F\u8A8D\u3059\u308B"):g==="approved"&&Y&&(b="paid",A="\u652F\u7D66\u3059\u308B");const M=["applied","soumu_checked","approved"].includes(g)&&p,L=!!b||M,B=document.querySelector(".exp-dash-drawer-foot");B&&(B.style.display=L?"grid":"none");const V=document.getElementById("expDashApprove");V&&(b?(V.style.display="",V.textContent=A,V.setAttribute("data-next",b)):(V.style.display="none",V.setAttribute("data-next","")));const ae=document.getElementById("expDashReject");ae&&(ae.style.display=M?"":"none");const _=document.getElementById("expDashNote");_&&(_.value="")}catch(a){t.innerHTML=`<div class="exp-dash-muted" style="color:#b00020;">${y(String(a?.message||"\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}</div>`}},He=()=>{const i=document.getElementById("expDashDrawer"),s=document.getElementById("expDashBackdrop");i&&i.setAttribute("hidden",""),s&&s.setAttribute("hidden",""),o.selectedId="";try{document.getElementById("expDashRoot")?.classList.remove("with-drawer")}catch{}try{document.body.style.overflow=""}catch{}},Xe=i=>{const s=document.getElementById("expDashList"),e=document.getElementById("expDashListMeta"),t=document.getElementById("expDashTopTotal");if(!s)return;const n=Array.isArray(i?.rows)?i.rows:[],a=new Map;n.forEach(p=>{const g=String(p.userId||"");if(!g)return;const b=String(p.date||"").slice(0,7),A=String(p.status||"pending").toLowerCase(),M=`${g}_${b}`,L=a.get(M)||{userId:g,userName:p.user_name||p.user_email||"\u793E\u54E1",userCode:p.employee_code,dept:p.departmentId,count:0,amount:0,month:b,items:[]};L.count+=1,L.amount+=Number(p.amount||0),L.items.push(p),a.set(M,L)});const c=p=>{const g=p==null?"":String(p);return g?o.deptMap.get(g)||`#${g}`:"\u672A\u8A2D\u5B9A"},r=Array.from(a.values()),d=r.reduce((p,g)=>p+Number(g.amount||0),0),l=r.reduce((p,g)=>p+Number(g.count||0),0),m=o.status==="archived",u=r.map(p=>{const g=c(p.dept),b=new URLSearchParams(window.location.search).get("standalone");let A=`/admin/expenses/monthly-detail?userId=${encodeURIComponent(p.userId)}&month=${encodeURIComponent(p.month)}`;b&&(A+=`&standalone=${encodeURIComponent(b)}&tab=${encodeURIComponent(o.status)}`);const M=o.status==="monthly_approval"||o.status==="archived",L=o.status==="applied";let B="";if(L)B=`<button type="button" class="btn exp-dash-btn-ghost" data-action="toggle-dash-group" data-target="grp_${p.userId}_${p.month}" style="min-height:28px;padding:0 8px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;display:inline-flex;align-items:center;color:#0f172a;">\u660E\u7D30</button>`;else{if(B=`<div style="display:flex;gap:4px;align-items:center;">
            <a href="${A}" class="btn exp-dash-btn-ghost" style="min-height:28px;padding:0 8px;font-size:12px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;display:inline-flex;align-items:center;text-decoration:none;color:#0f172a;">\u660E\u7D30</a>`,o.status==="approved"){const ae=p.items.map(_=>_.id).join(",");B+=`<button type="button" class="btn" data-action="pay-user-month" data-ids="${ae}" data-name="${y(p.userName)}" style="min-height:28px;padding:0 8px;font-size:12px;border:none;background:#9333ea;color:#fff;border-radius:4px;cursor:pointer;white-space:nowrap;">\u652F\u7D66</button>`}B+="</div>"}let V="";if(L){const ae=`
          <div style="background:#fff; border-radius: 6px; border: 1px solid #e2e8f0; overflow: hidden; margin-top: 8px;">
            <table style="width:100%; border-collapse: collapse; font-size:13px;">
              <thead style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                <tr>
                  <th style="padding:10px 12px; text-align:left; width: 40px;"></th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u65E5\u4ED8</th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u7528\u9014</th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u7D4C\u8DEF</th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u4EA4\u901A\u6A5F\u95A2</th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u7A2E\u5225</th>
                  <th style="padding:10px 12px; text-align:left; color:#475569; font-weight:600;">\u5099\u8003</th>
                  <th style="padding:10px 12px; text-align:right; color:#475569; font-weight:600;">\u91D1\u984D</th>
                  <th style="padding:10px 12px; text-align:center; color:#475569; font-weight:600;">\u72B6\u614B</th>
                  <th style="padding:10px 12px; text-align:center; color:#475569; font-weight:600;">\u64CD\u4F5C</th>
                </tr>
              </thead>
              <tbody>
        `+p.items.map(_=>{const Q=String(_.id||""),X=String(_.date||"").slice(0,10),be=we(_.amount||0),se=String(_.status||""),Ue=ft(se),C=bt(se),N=String(_.purpose||""),Z=String(_.transport_type||"\u96FB\u8ECA"),Le=String(_.trip_type||"one_way")==="round_trip"?"\u5F80\u5FA9":"\u7247\u9053",ce=String(_.note||""),Ce=[_.origin,_.destination].filter(Boolean).join(" \u2192 ")||"-",ot=se==="paid"?"":`<button type="button" class="btn" data-action="delete-expense" data-id="${y(Q)}" style="background:transparent;border:none;color:#ef4444;padding:4px;cursor:pointer;" title="\u524A\u9664"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;return`
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding:10px 12px; text-align:center;">${se==="applied"||se==="pending"||se==="soumu_checked"||se==="approved"?`<input type="checkbox" class="exp-dash-bulk-cb child-cb-${p.userId}-${p.month}" data-id="${y(Q)}" style="cursor:pointer;" />`:""}</td>
              <td style="padding:10px 12px;">${X}</td>
              <td style="padding:10px 12px;">${y(N)}</td>
              <td style="padding:10px 12px; font-weight:600;">${y(Ce)}</td>
              <td style="padding:10px 12px;">${y(Z)}</td>
              <td style="padding:10px 12px;">${y(Le)}</td>
              <td style="padding:10px 12px; color:#64748b; font-size:12px; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${y(ce)}">${y(ce)}</td>
              <td style="padding:10px 12px; text-align:right; font-weight:700;">${be}</td>
              <td style="padding:10px 12px; text-align:center;"><span class="pill ${C}" style="font-size:11px;">${Ue}</span></td>
              <td style="padding:10px 12px; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px;">
                  <a href="#" data-action="open-drawer" data-id="${Q}" style="font-size:12px; color:#3b82f6; text-decoration:none; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff;">\u8A73\u7D30</a>
                  ${ot}
                </td>
            </tr>
          `}).join("")+`
              </tbody>
            </table>
          </div>
        `;V=`
          <tr id="grp_${p.userId}_${p.month}" style="display:none; background:#f8fafc;">
            <td colspan="7" style="padding:0;">
              <div style="padding: 12px 24px; border-left: 4px solid #3b82f6;">
                ${ae}
              </div>
            </td>
          </tr>
        `}return`<tr class="exp-dash-row">
        ${o.status==="approved"?"":`<td data-label="" class="center" style="width:40px;">
          <input type="checkbox" class="${o.status==="monthly_approval"?"exp-dash-bulk-cb-monthly":"exp-dash-bulk-group"}" data-uid="${y(p.userId)}" data-month="${y(p.month)}" style="cursor:pointer;" />
        </td>`}
        <td data-label="\u793E\u54E1\u540D">
          <div style="font-weight: 800; color: #0f172a;">${y(p.userName)}</div>
          ${p.userCode?`<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${y(p.userCode)}</div>`:""}
        </td>
        <td data-label="\u90E8\u7F72">${y(g)}</td>
        <td data-label="\u5BFE\u8C61\u6708" class="center">${y(Ke(p.month))}</td>
        <td data-label="\u5408\u8A08" class="money">\xA5${Number(p.amount).toLocaleString("ja-JP")}</td>
        <td data-label="\u4EF6\u6570" class="center">${y(p.count)}\u4EF6</td>
        <td data-label="\u64CD\u4F5C" style="padding-left:12px;">
          <div style="display:flex;gap:8px;align-items:center;justify-content:flex-start;">
            ${B}
          </div>
        </td>
      </tr>`+V}).join("");e&&(e.textContent=`${r.length} \u540D\u306E${m?"\u30C7\u30FC\u30BF":"\u7533\u8ACB"}`),t&&(t.innerHTML=`\u5BFE\u8C61\u793E\u54E1: ${r.length}\u540D <span style="margin-left:16px; color:#0f172a; font-weight:800;">\u5408\u8A08\u91D1\u984D: \xA5${d.toLocaleString("ja-JP")}</span>`,m&&(t.innerHTML+=' <span style="margin-left:16px; color:#10b981; font-weight:800; border: 1px solid #10b981; padding: 2px 8px; border-radius: 4px; font-size: 11px;">\u6708\u6B21\u7DE0\u3081\u5B8C\u4E86</span>'),t.removeAttribute("hidden"));const x='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',f='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',h='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';let E="";if(o.status==="monthly_approval")E=`
      <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; justify-content: space-between; flex-wrap: wrap;">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 13px; color: #64748b;">\u9078\u629E\u3057\u305F\u793E\u54E1\u3092:</span>
          <button type="button" class="btn" id="expDashBulkApproveMonthly" style="display:flex; align-items:center; background:#10b981; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">
            ${x} \u4E00\u62EC\u627F\u8A8D (Approve)
          </button>
          <button type="button" class="btn" id="expDashBulkCancelMonthly" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">
            ${f} \u4E00\u62EC\u53D6\u6D88
          </button>
        </div>
        <button type="button" class="btn" id="expDashMonthClose" style="display:flex; align-items:center; background:#0b2c66; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold; margin-top: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          \u5F53\u6708\u3092\u7DE0\u3081\u51E6\u7406 (Close Month)
        </button>
      </div>
      `;else if(o.status==="applied"||o.status==="soumu_checked"){const p=o.status==="applied"?"\u4E00\u62EC\u7DCF\u52D9\u78BA\u8A8D":"\u4E00\u62EC\u793E\u9577\u627F\u8A8D";E=`
      <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; flex-wrap: wrap;">
        <span style="font-size: 13px; color: #64748b;">\u9078\u629E\u3057\u305F\u9805\u76EE\u3092:</span>
        <button type="button" class="btn" id="expDashBulkApprove" style="display:flex; align-items:center; background:#10b981; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${x}${p}</button>
        <button type="button" class="btn" id="expDashBulkCancel" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${f}\u4E00\u62EC\u53D6\u6D88</button>
        <button type="button" class="btn" id="expDashBulkDelete" style="display:flex; align-items:center; background:#ef4444; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${h}\u4E00\u62EC\u524A\u9664</button>
      </div>
      `}else o.status==="approved"||o.status==="paid"?E="":m||(E=`
      <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; padding: 0 12px; flex-wrap: wrap;">
        <span style="font-size: 13px; color: #64748b;">\u9078\u629E\u3057\u305F\u9805\u76EE\u3092:</span>
        <button type="button" class="btn" id="expDashBulkCancel" style="display:flex; align-items:center; background:#f59e0b; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${f}\u4E00\u62EC\u53D6\u6D88</button>
        <button type="button" class="btn" id="expDashBulkDelete" style="display:flex; align-items:center; background:#ef4444; color:#fff; border:none; padding:4px 12px; font-size:12px; border-radius:4px; font-weight:bold;">${h}\u4E00\u62EC\u524A\u9664</button>
      </div>
      `);if(s.innerHTML=`
      ${E}
      <div class="exp-dash-tablewrap">
        <table class="exp-dash-table">
          <thead><tr>
            ${o.status==="approved"?"":`<th class="center" style="width:40px;"><input type="checkbox" id="${o.status==="monthly_approval"?"expDashBulkCheckAllMonthly":"expDashBulkCheckAll"}" style="cursor:pointer;" /></th>`}
            <th>\u793E\u54E1\u540D</th><th>\u90E8\u7F72</th><th class="center">\u5BFE\u8C61\u6708</th><th class="money">\u5408\u8A08\u91D1\u984D</th><th class="center">${m?"\u4EF6\u6570":"\u7533\u8ACB\u4EF6\u6570"}</th><th>\u64CD\u4F5C</th>
          </tr></thead>
          <tbody>${u||`<tr><td colspan="${o.status==="approved"?"6":"7"}" class="center" style="padding: 24px; color: #64748b;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>`}</tbody>
          ${r.length>0?`
          <tfoot>
            <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1;">
              <td colspan="${o.status==="approved"?"3":"4"}" style="text-align: right; font-weight: 800; color: #0f172a; padding: 12px 16px;">\u7DCF\u5408\u8A08 (Grand Total)</td>
              <td class="money" style="font-weight: 800; color: #0f172a; font-size: 14px;">\xA5${d.toLocaleString("ja-JP")}</td>
              <td class="center" style="font-weight: 800; color: #0f172a;">${l}\u4EF6</td>
              <td></td>
            </tr>
          </tfoot>
          `:""}
        </table>
      </div>
    `,o.status!=="monthly_approval"&&o.status!=="archived"&&document.querySelectorAll(".exp-dash-bulk-group").forEach(g=>{g.addEventListener("change",b=>{const A=g.getAttribute("data-uid"),M=g.getAttribute("data-month");document.querySelectorAll(`.child-cb-${A}-${M}`).forEach(B=>B.checked=b.target.checked)})}),document.querySelectorAll('a[data-action="open-drawer"]').forEach(p=>{p.addEventListener("click",async g=>{g.preventDefault(),g.stopPropagation();const b=p.getAttribute("data-id");b&&await Be(b)})}),o.status==="monthly_approval"){const p=document.getElementById("expDashBulkCheckAllMonthly"),g=document.querySelectorAll(".exp-dash-bulk-cb-monthly");document.querySelectorAll(".exp-dash-row").forEach(M=>{M.addEventListener("click",L=>{if(L.target.closest("a")||L.target.closest("button"))return;L.stopPropagation();const B=M.querySelector(".exp-dash-bulk-cb-monthly");B&&L.target!==B&&(B.checked=!B.checked,B.dispatchEvent(new Event("change")))})}),p&&p.addEventListener("change",M=>{const L=M.target.checked;g.forEach(B=>B.checked=L)});const b=document.getElementById("expDashBulkCancelMonthly");b&&b.addEventListener("click",()=>{g.forEach(M=>M.checked=!1),p&&(p.checked=!1)});const A=document.getElementById("expDashBulkApproveMonthly");A&&A.addEventListener("click",async()=>{const M=[];if(document.querySelectorAll(".exp-dash-bulk-cb-monthly:checked").forEach(L=>{M.push({uid:L.getAttribute("data-uid"),month:L.getAttribute("data-month")})}),M.length===0)return alert("\u627F\u8A8D\u3059\u308B\u793E\u54E1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");if(confirm(`\u9078\u629E\u3057\u305F ${M.length} \u540D\u306E\u5F53\u6708\u5206\u3092\u4E00\u62EC\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`)){A.disabled=!0,A.innerHTML="\u51E6\u7406\u4E2D...";try{for(const L of M)await $("/api/expenses/admin/months/approve",{method:"POST",body:JSON.stringify({userId:L.uid,month:L.month})});await Se()}catch{alert("\u4E00\u90E8\u306E\u627F\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),A.disabled=!1,A.innerHTML=`${x} \u4E00\u62EC\u627F\u8A8D (Approve)`}}})}const G=document.getElementById("expDashBulkCheckAll"),fe=document.querySelectorAll(".exp-dash-bulk-cb");o.status!=="monthly_approval"&&document.querySelectorAll(".exp-dash-row").forEach(p=>{p.addEventListener("click",g=>{if(g.target.closest("a")||g.target.closest("button"))return;g.stopPropagation();const b=p.querySelector(".exp-dash-bulk-group");b&&g.target!==b&&(b.checked=!b.checked,b.dispatchEvent(new Event("change")))})}),document.querySelectorAll('button[data-action="open-drawer"]').forEach(p=>{p.addEventListener("click",async g=>{g.stopPropagation();const b=p.getAttribute("data-id");b&&await Be(b)})}),document.querySelectorAll('button[data-action="pay-user-month"]').forEach(p=>{p.addEventListener("click",async g=>{g.stopPropagation();const b=p.getAttribute("data-ids"),A=p.getAttribute("data-name");if(!b)return;const M=b.split(",").filter(Boolean);if(M.length!==0&&confirm(`\u3010${A}\u3011\u306E\u4EA4\u901A\u8CBB\uFF08${M.length}\u4EF6\uFF09\u3092\u652F\u7D66\u6E08\u307F\u306B\u3057\u307E\u3059\u304B\uFF1F`)){p.disabled=!0,p.textContent="\u51E6\u7406\u4E2D...";try{await $("/api/expenses/admin/bulk-status",{method:"POST",body:JSON.stringify({ids:M,status:"paid",note:"\u652F\u7D66"})}),await Se()}catch{alert("\u652F\u7D66\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),p.disabled=!1,p.textContent="\u652F\u7D66"}}})}),G&&G.addEventListener("change",p=>{const g=p.target.checked;fe.forEach(b=>b.checked=g),document.querySelectorAll(".exp-dash-bulk-group").forEach(b=>b.checked=g)});const le=()=>{const p=[],g=document.querySelectorAll(".exp-dash-bulk-cb:checked");return g.length>0?g.forEach(b=>{const A=b.getAttribute("data-id");A&&p.push(A)}):document.querySelectorAll(".exp-dash-bulk-group:checked").forEach(b=>{const A=b.getAttribute("data-uid"),M=b.getAttribute("data-month");document.querySelectorAll(`.child-cb-${A}-${M}`).forEach(B=>{const V=B.getAttribute("data-id");V&&p.push(V)})}),p},oe=document.getElementById("expDashBulkDelete");oe&&oe.addEventListener("click",async()=>{const p=le();if(p.length===0)return alert("\u524A\u9664\u3059\u308B\u9805\u76EE\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");if(confirm(`\u9078\u629E\u3057\u305F ${p.length} \u4EF6\u3092\u672C\u5F53\u306B\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002`)){oe.disabled=!0,oe.innerHTML="\u51E6\u7406\u4E2D...";try{for(const g of p)await $(`/api/expenses/${encodeURIComponent(g)}`,{method:"DELETE"});await Se()}catch{alert("\u4E00\u90E8\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),oe.disabled=!1,oe.innerHTML=`${deleteIcon}\u4E00\u62EC\u524A\u9664`}}});const P=document.getElementById("expDashBulkCancel");P&&P.addEventListener("click",()=>{const p=document.querySelectorAll(".exp-dash-bulk-cb, .exp-dash-bulk-group"),g=document.getElementById("expDashBulkCheckAll");p.forEach(b=>b.checked=!1),g&&(g.checked=!1)});const U=document.getElementById("expDashBulkApprove");U&&U.addEventListener("click",async()=>{const p=le();if(p.length===0)return alert("\u51E6\u7406\u3059\u308B\u9805\u76EE\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");const g=String(o.status||""),b=g==="applied"?"soumu_checked":"approved",A=b==="soumu_checked"?"\u7DCF\u52D9\u78BA\u8A8D":"\u793E\u9577\u627F\u8A8D",M=b==="soumu_checked"?"soumu_checked":"approved",L=b==="soumu_checked"?"\u7DCF\u52D9\u78BA\u8A8D\u6E08\u307F":"\u627F\u8A8D\u6E08\u307F";if(confirm(`\u9078\u629E\u3057\u305F ${p.length} \u4EF6\u3092\u4E00\u62EC${A}\u3057\u307E\u3059\u304B\uFF1F`)){U.disabled=!0,U.innerHTML="\u51E6\u7406\u4E2D...";try{const B=await $("/api/expenses/admin/bulk-status",{method:"POST",body:JSON.stringify({ids:p,status:b,note:`\u4E00\u62EC${A}`})});B&&Number(B.skipped)>0&&alert(`${Number(B.processed||0)} \u4EF6\u3092\u51E6\u7406\u3057\u307E\u3057\u305F\uFF08${Number(B.skipped)} \u4EF6\u306F\u6A29\u9650\u307E\u305F\u306F\u72B6\u614B\u304C\u5BFE\u8C61\u5916\u306E\u305F\u3081\u30B9\u30AD\u30C3\u30D7\uFF09\u3002`),o.status=M,o.page=1,Ee(),(_=>{const Q=document.getElementById("expDashTitle");Q&&(Q.textContent=_)})(L),document.querySelectorAll(".exp-dash-side .exp-dash-nav").forEach(_=>_.classList.remove("is-active"));const ae=document.querySelector(`.exp-dash-side .exp-dash-nav[data-status="${M}"]`);ae&&ae.classList.add("is-active");try{const _=new URL(window.location);_.searchParams.set("tab",M),window.history.replaceState({},"",_)}catch{}await ge()}catch{alert("\u4E00\u90E8\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),U.disabled=!1,U.innerHTML=`${x}\u4E00\u62EC\u627F\u8A8D`}}});const Y=document.getElementById("expDashBulkPay");Y&&Y.addEventListener("click",async()=>{const p=le();if(p.length===0)return alert("\u652F\u7D66\u3059\u308B\u9805\u76EE\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");if(confirm(`\u9078\u629E\u3057\u305F ${p.length} \u4EF6\u3092\u4E00\u62EC\u652F\u7D66\u6E08\u307F\u306B\u3057\u307E\u3059\u304B\uFF1F`)){Y.disabled=!0,Y.innerHTML="\u51E6\u7406\u4E2D...";try{await $("/api/expenses/admin/bulk-status",{method:"POST",body:JSON.stringify({ids:p,status:"paid",note:"\u4E00\u62EC\u652F\u7D66"})}),o.status="paid",o.page=1,Ee(),(A=>{const M=document.getElementById("expDashTitle");M&&(M.textContent=A)})("\u652F\u7D66\u6E08\u307F"),document.querySelectorAll(".exp-dash-side .exp-dash-nav").forEach(A=>A.classList.remove("is-active"));const b=document.querySelector('.exp-dash-side .exp-dash-nav[data-status="paid"]');b&&b.classList.add("is-active");try{const A=new URL(window.location);A.searchParams.set("tab","paid"),window.history.replaceState({},"",A)}catch{}await ge()}catch{alert("\u4E00\u90E8\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),Y.disabled=!1,Y.innerHTML=`${x}\u4E00\u62EC\u652F\u7D66`}}})},ge=async()=>{ue("\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",!1),Ve();try{const i=String(o.month||"").slice(0,7),[s,e,t]=await Promise.allSettled([yt(),Ye(),$("/api/expenses/admin/list?status=applied&limit=5&sortBy=date&sortDir=desc")]),n=s.status==="fulfilled"?s.value:await vt().catch(()=>({month:{month:o.month,totalAmount:0,appliedCount:0,rejectedCount:0},trend:[],departmentShares:[]})),a=e.status==="fulfilled"?e.value:{rows:[],total:0,page:o.page,limit:o.limit};wt(n),kt(n),St(n),Te("expBadgeApplied",n?.month?.appliedCount||0),Te("expBadgeSoumu",n?.month?.soumuCheckedCount||0),Te("expBadgeApproved",n?.month?.approvedCount||0),Te("expBadgeRejected",n?.month?.rejectedCount||0),Te("expDashBellBadge",n?.month?.appliedCount||0),Xe(a);const c=document.getElementById("expDashBellPopupBody");if(c){const r=t.status==="fulfilled"&&Array.isArray(t.value?.rows)?t.value.rows:[];r.length>0?c.innerHTML=r.map(d=>{const l=d?.user_name||d?.user_email||"\u793E\u54E1",m=we(d?.amount||0),u=d?.applied_at?re(d.applied_at).slice(5,16):"";return`<a href="#" class="exp-dash-bell-item" data-action="open-bell" data-id="${y(d.id)}">
              <div class="ico">\u23F3</div>
              <div class="desc">
                <strong>${y(l)}</strong>\u3055\u3093\u304B\u3089\u4EA4\u901A\u8CBB\u7533\u8ACB\uFF08${y(m)}\uFF09\u304C\u3042\u308A\u307E\u3059\u3002<br>
                <span style="color:#94a3b8;font-size:11px;">${y(u)}</span>
              </div>
            </a>`}).join(""):c.innerHTML='<div class="exp-dash-bell-empty">\u65B0\u3057\u3044\u901A\u77E5\u306F\u3042\u308A\u307E\u305B\u3093</div>'}if(e.status==="rejected"){const r=String(e.reason?.message||"\u30C7\u30FC\u30BF\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");ue(r,!0)}else s.status==="rejected"?ue("\u96C6\u8A08\u3092\u7C21\u6613\u8A08\u7B97\u3067\u8868\u793A\u4E2D\uFF08\u30B5\u30FC\u30D0\u30FC\u66F4\u65B0\u5F8C\u306B\u81EA\u52D5\u3067\u6B63\u5E38\u5316\u3057\u307E\u3059\uFF09",!1):ue("",!1)}catch(i){ue(String(i?.message||"\u53D6\u5F97\u5931\u6557"),!0)}finally{_e()}},Se=async()=>{ue("\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",!1),Ve();try{const i=await Ye();Xe(i),ue("",!1),Ee()}catch(i){ue(String(i?.message||"\u53D6\u5F97\u5931\u6557"),!0)}finally{_e()}};await(async()=>{try{const e=window.ADMIN_PROFILE||{},t=e.username||e.email||"",n=document.getElementById("expDashUserName");n&&(n.textContent=String(t||"").trim());const a=n?.closest?.(".exp-dash-userchip");a&&a.setAttribute("title",String(t||"").trim())}catch{}try{const e=await $("/api/admin/departments").catch(()=>$("/api/departments").catch(()=>[]));o.departments=Array.isArray(e)?e:[],o.deptMap=new Map(o.departments.map(n=>[String(n.id),n.name||n.code||`#${String(n.id)}`]));const t=document.getElementById("expDashDept");t&&(t.innerHTML='<option value="">\u5168\u90E8\u7F72</option>'+o.departments.map(n=>`<option value="${y(String(n.id))}">${y(n.name||n.code||`#${String(n.id)}`)}</option>`).join(""))}catch{}const i=document.getElementById("expDashMonth");i&&(i.value=o.month),document.getElementById("expDashReload")?.addEventListener("click",async()=>{o.page=1,o.q=String(document.getElementById("expDashSearch")?.value||"").trim(),o.departmentId=String(document.getElementById("expDashDept")?.value||"").trim(),o.month=String(document.getElementById("expDashMonth")?.value||o.month).slice(0,7),await ge()}),document.getElementById("expDashMonth")?.addEventListener("change",async()=>{o.page=1,o.month=String(document.getElementById("expDashMonth")?.value||o.month).slice(0,7),await ge()}),document.getElementById("expDashDept")?.addEventListener("change",async()=>{o.page=1,o.departmentId=String(document.getElementById("expDashDept")?.value||"").trim(),await Se()}),document.getElementById("expDashSearch")?.addEventListener("keydown",async e=>{e.key==="Enter"&&(e.preventDefault(),o.page=1,o.q=String(document.getElementById("expDashSearch")?.value||"").trim(),await Se())}),document.querySelectorAll(".exp-dash-side .exp-dash-nav[data-status]").forEach(e=>{e.addEventListener("click",async()=>{He();const t=document.getElementById("expDashRoot");t&&window.innerWidth<=760&&(t.classList.remove("mobile-open"),document.getElementById("expDashBackdrop")?.setAttribute("hidden",""),document.body.style.overflow="",s()),document.querySelectorAll(".exp-dash-side .exp-dash-nav").forEach(n=>n.classList.remove("is-active")),e.classList.add("is-active"),o.page=1,o.status=String(e.getAttribute("data-status")||""),o.view="list",Ee(),o.status==="applied"?ke("\u627F\u8A8D\u7BA1\u7406"):o.status==="soumu_checked"?ke("\u7DCF\u52D9\u78BA\u8A8D\u6E08\u307F\uFF08\u793E\u9577\u627F\u8A8D\u5F85\u3061\uFF09"):o.status==="monthly_approval"?ke("\u6708\u6B21\u627F\u8A8D"):o.status==="archived"?ke("\u6708\u6B21\u7DE0\u3081\u5C65\u6B74"):o.status==="approved"?ke("\u627F\u8A8D\u6E08\u307F"):o.status==="rejected"?ke("\u5DEE\u623B\u3057\u4E00\u89A7"):ke("\u7533\u8ACB\u4E00\u89A7");try{const n=new URL(window.location);n.searchParams.set("tab",o.status||"list"),window.history.replaceState({},"",n)}catch{}await Se()})}),document.querySelectorAll(".exp-dash-side .exp-dash-nav[data-nav]").forEach(e=>{e.addEventListener("click",async()=>{He();const t=document.getElementById("expDashRoot");t&&window.innerWidth<=760&&(t.classList.remove("mobile-open"),document.getElementById("expDashBackdrop")?.setAttribute("hidden",""),document.body.style.overflow="",s()),document.querySelectorAll(".exp-dash-side .exp-dash-nav").forEach(n=>n.classList.remove("is-active")),e.classList.add("is-active"),o.page=1,o.status="",o.view="dashboard",Ee(),ke("Home");try{const n=new URL(window.location);n.searchParams.delete("tab"),window.history.replaceState({},"",n)}catch{}await ge()})}),document.addEventListener("click",async e=>{const t=e.target.closest("#expDashMonthClose");if(t){const n=String(o.month||"").slice(0,7);if(!window.confirm(`\u3010${n}\u3011\u306E\u3059\u3079\u3066\u306E\u627F\u8A8D\u6E08\u307F\u7533\u8ACB\u3092\u300C\u6708\u6B21\u7DE0\u3081\u300D\u3068\u3057\u3066\u78BA\u5B9A\u3057\u307E\u3059\u304B\uFF1F

\u203B\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002
\u203B\u78BA\u5B9A\u5F8C\u306F\u5F93\u696D\u54E1\u304C\u30C7\u30FC\u30BF\u3092\u7DE8\u96C6\u30FB\u8FFD\u52A0\u3067\u304D\u306A\u304F\u306A\u308A\u307E\u3059\u3002`))return;t.disabled=!0,t.innerHTML="\u51E6\u7406\u4E2D...";try{await $("/api/expenses/admin/monthly-close",{method:"POST",body:JSON.stringify({month:n})}),alert(`${n} \u306E\u6708\u6B21\u7DE0\u3081\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002`),o.status="archived",o.page=1,Ee(),(r=>{const d=document.getElementById("expDashTitle");d&&(d.textContent=r)})("\u6708\u6B21\u7DE0\u3081\u5C65\u6B74"),document.querySelectorAll(".exp-dash-side .exp-dash-nav").forEach(r=>r.classList.remove("is-active"));const c=document.querySelector('.exp-dash-side .exp-dash-nav[data-status="archived"]');c&&c.classList.add("is-active");try{const r=new URL(window.location);r.searchParams.set("tab","archived"),window.history.replaceState({},"",r)}catch{}await ge()}catch(a){alert(`\u6708\u6B21\u7DE0\u3081\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${a.message||"unknown"}`),t.disabled=!1,t.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> \u5F53\u6708\u3092\u7DE0\u3081\u51E6\u7406 (Close Month)'}}});const s=()=>{try{const e=document.getElementById("expDashRoot"),t=document.getElementById("expDashBurger");if(!e||!t)return;if(window.innerWidth<=760){const n=e.classList.contains("mobile-open");t.textContent=n?"\u2715":"\u2630";try{t.setAttribute("aria-label",n?"\u9589\u3058\u308B":"\u30E1\u30CB\u30E5\u30FC")}catch{}}else{const n=e.classList.contains("collapsed");t.textContent=n?"\u2630":"\u2715";try{t.setAttribute("aria-label",n?"\u30E1\u30CB\u30E5\u30FC":"\u9589\u3058\u308B")}catch{}}}catch{}};document.getElementById("expDashLogout")?.addEventListener("click",async()=>{try{if(!confirm("\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3059\u304B\uFF1F"))return;const e=await import("../../api/auth.api.js").catch(()=>null);e&&e.logout&&await e.logout(),window.location.href="/ui/login"}catch{window.location.href="/ui/login"}}),document.getElementById("expDashHelp")?.addEventListener("click",e=>{e.preventDefault(),alert("\u64CD\u4F5C\u30AC\u30A4\u30C9\u306F\u5F8C\u65E5\u8A2D\u5B9A\u3055\u308C\u307E\u3059\u3002")}),document.getElementById("expDashUserMenuToggle")?.addEventListener("click",e=>{e.stopPropagation();const t=document.getElementById("expDashUserMenu");t&&t.toggleAttribute("hidden")}),document.getElementById("expDashBurger")?.addEventListener("click",()=>{try{const e=document.getElementById("expDashRoot");if(!e)return;if(window.innerWidth<=760){const t=e.classList.toggle("mobile-open"),n=document.getElementById("expDashBackdrop");n&&(t?(n.removeAttribute("hidden"),document.body.style.overflow="hidden"):(n.setAttribute("hidden",""),document.body.style.overflow=""))}else e.classList.toggle("collapsed");s()}catch{}}),s(),document.getElementById("expDashBell")?.addEventListener("click",e=>{e.stopPropagation();const t=document.getElementById("expDashBellPopup");t&&t.toggleAttribute("hidden")}),document.getElementById("expDashBellPopupBody")?.addEventListener("click",async e=>{const t=e.target.closest('a[data-action="open-bell"][data-id]');if(!t)return;e.preventDefault();const n=t.getAttribute("data-id"),a=document.getElementById("expDashBellPopup");a&&a.setAttribute("hidden",""),await Be(n)}),document.addEventListener("click",e=>{const t=document.getElementById("expDashBellPopup");t&&!t.hasAttribute("hidden")&&!e.target.closest("#expDashBell")&&!e.target.closest("#expDashBellPopup")&&t.setAttribute("hidden","");const n=document.getElementById("expDashUserMenu");n&&!n.hasAttribute("hidden")&&!e.target.closest("#expDashUserMenuToggle")&&!e.target.closest("#expDashUserMenu")&&n.setAttribute("hidden","")}),document.getElementById("expDashCsv")?.addEventListener("click",()=>{const e=new URLSearchParams;e.set("month",String(o.month||"").slice(0,7));const n=o.status==="monthly_approval"||o.status==="archived"?o.status==="archived"?"approved":"applied":o.status;n&&e.set("status",n),o.departmentId&&e.set("departmentId",o.departmentId),o.q&&e.set("name",o.q);const a=`/api/expenses/admin/export.csv?${e.toString()}`,c=document.createElement("a");c.href=a,c.target="_blank",c.rel="noopener",document.body.appendChild(c),c.click(),c.remove()}),document.getElementById("expDashList")?.addEventListener("click",async e=>{const t=e.target,n=t?.closest?t.closest('button[data-action="toggle-dash-group"]'):null;if(n){e.preventDefault(),e.stopPropagation();const x=n.getAttribute("data-target"),f=document.getElementById(x);if(f){const h=f.style.display==="none";f.style.display=h?"table-row":"none",n.textContent=h?"\u9589\u3058\u308B":"\u660E\u7D30"}return}const a=t?.closest?t.closest('button[data-action="delete-expense"]'):null;if(a){e.preventDefault();const x=a.getAttribute("data-id");if(!x||!window.confirm(`\u672C\u5F53\u306B\u7533\u8ACBID: ${x} \u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002`))return;try{a.disabled=!0;const f=a.innerHTML;a.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',await $(`/api/expenses/${encodeURIComponent(x)}`,{method:"DELETE"}),alert("\u524A\u9664\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002"),await Se()}catch(f){alert(`\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${f.message||"unknown"}`),a.disabled=!1,a.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>'}return}const c=t?.closest?t.closest('button[data-action="open-monthly-detail"]'):null;if(c){e.preventDefault();const x=c.getAttribute("data-uid"),f=c.getAttribute("data-month");if(x&&f){const h=new URLSearchParams(window.location.search).get("standalone");let E=`/admin/expenses/monthly-detail?userId=${encodeURIComponent(x)}&month=${encodeURIComponent(f)}`;h&&(E+=`&standalone=${encodeURIComponent(h)}`),window.location.href=E}return}const r=t?.closest?t.closest('button[data-action="approve-monthly"]'):null;if(r){e.preventDefault();const x=r.getAttribute("data-uid"),f=r.getAttribute("data-month");if(!x||!f||!window.confirm(`${f} \u306E\u7533\u8ACB\u3092\u4E00\u62EC\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`))return;r.disabled=!0;try{await $("/api/expenses/admin/months/approve",{method:"POST",body:JSON.stringify({userId:x,month:f})}),await ge()}catch(h){window.alert(String(h?.message||"\u4E00\u62EC\u627F\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}finally{r.disabled=!1}return}const d=t?.closest?t.closest("button[data-action]"):null;if(d){const x=String(d.getAttribute("data-action")||"");x==="prev"&&(o.page=Math.max(1,o.page-1)),x==="next"&&(o.page=o.page+1),await Se();return}const l=t?.closest?t.closest('a[data-action="open"][data-id]'):null,m=t?.closest?t.closest("tr[data-id]"):null,u=l?l.getAttribute("data-id"):m?m.getAttribute("data-id"):"";u&&(e.preventDefault(),await Be(u))}),document.getElementById("expDashBackdrop")?.addEventListener("click",()=>{He();const e=document.getElementById("expDashRoot");e&&(e.classList.remove("mobile-open"),s())}),document.getElementById("expDashDrawerClose")?.addEventListener("click",He),document.getElementById("expDashApprove")?.addEventListener("click",async e=>{if(!o.selectedId)return;const t=String(e.currentTarget?.getAttribute("data-next")||"").trim();if(!t)return;const n=String(document.getElementById("expDashNote")?.value||"").trim();try{await $(`/api/expenses/${encodeURIComponent(o.selectedId)}/status`,{method:"PATCH",body:JSON.stringify({status:t,note:n})}),await ge(),await Be(o.selectedId)}catch(a){ue(String(a?.message||"\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F"),!0)}}),document.getElementById("expDashReject")?.addEventListener("click",async()=>{if(!o.selectedId)return;const e=String(document.getElementById("expDashNote")?.value||"").trim();if(!e){ue("\u5DEE\u623B\u3057\u30B3\u30E1\u30F3\u30C8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",!0);return}try{await $(`/api/expenses/${encodeURIComponent(o.selectedId)}/status`,{method:"PATCH",body:JSON.stringify({status:"rejected",note:e})}),await ge(),await Be(o.selectedId)}catch(t){ue(String(t?.message||"\u5DEE\u623B\u3057\u306B\u5931\u6557\u3057\u307E\u3057\u305F"),!0)}})})();const Ze=new URLSearchParams(window.location.search).get("tab");if(Ze){const i=document.querySelector(`.exp-dash-nav[data-status="${Ze}"]`);if(i){document.querySelectorAll(".exp-dash-nav").forEach(n=>n.classList.remove("is-active")),i.classList.add("is-active");const s=String(i.getAttribute("data-status")||"");String(i.getAttribute("data-nav")||"")==="dashboard"?(o.view="dashboard",o.status=""):(o.view="list",o.status=s);const t=n=>{const a=document.getElementById("expDashTitle");a&&(a.textContent=n)};o.status==="applied"?t("\u627F\u8A8D\u7BA1\u7406"):o.status==="soumu_checked"?t("\u7DCF\u52D9\u78BA\u8A8D\u6E08\u307F\uFF08\u793E\u9577\u627F\u8A8D\u5F85\u3061\uFF09"):o.status==="monthly_approval"||o.status==="applied_approved"?t("\u6708\u6B21\u627F\u8A8D"):o.status==="approved"?t("\u627F\u8A8D\u6E08\u307F"):o.status==="rejected"?t("\u5DEE\u623B\u3057\u4E00\u89A7"):t("\u7533\u8ACB\u4E00\u89A7")}}return Ee(),await ge(),()=>{try{Ae&&window.clearInterval(Ae)}catch{}try{_e()}catch{}try{He()}catch{}};const $t=(i,s)=>{const e=String(i||"").toLowerCase();return s==="approved"?e==="approved":s==="applied_approved"?e==="approved"||e==="applied":["approved","applied","rejected","pending","draft"].includes(e)},Je=i=>i==="approved"?"\u627F\u8A8D":i==="applied_approved"?"\u7533\u8ACB+\u627F\u8A8D":"\u5168\u72B6\u614B",At=i=>{const s=w("#expMonthlyKpiHost");if(!s)return;const e=Array.isArray(i)?i:[],t={approved:{count:0,amount:0},applied:{count:0,amount:0},rejected:{count:0,amount:0}};for(const a of e){const c=String(a.status||"").toLowerCase();t[c]&&(t[c].count+=1,t[c].amount+=Number(a.amount||0))}const n=(a,c,r,d)=>`
      <div class="exp-kpi-card ${r}">
        <div class="exp-kpi-head"><span class="exp-kpi-icon">${d}</span><span>${a}</span></div>
        <div class="exp-kpi-value">${Number(c.count||0).toLocaleString("ja-JP")} \u4EF6</div>
        <div class="exp-kpi-sub">\xA5 ${Number(c.amount||0).toLocaleString("ja-JP")}</div>
      </div>`;s.innerHTML=`
      <div class="exp-kpi-grid">
        ${n("\u7533\u8ACB\u4E2D",t.applied,"exp-kpi-applied","\u23F3")}
        ${n("\u627F\u8A8D\u6E08\u307F",t.approved,"exp-kpi-approved","\u2714")}
        ${n("\u5DEE\u623B\u3057",t.rejected,"exp-kpi-rejected","\u21A9")}
      </div>
    `},It=(i,s)=>{const e=document.getElementById("expMonthApplyHost");if(!e)return;const t=Array.isArray(i)?i:[];if(!t.length){e.innerHTML='<div class="empty-state"><div style="font-size:24px;">\u{1F4ED}</div><div>\u6708\u6B21\u7533\u8ACB\u306F\u3042\u308A\u307E\u305B\u3093</div></div>';return}const n=t.map(a=>{const c=String(a.user_id||""),r=String(a.month||""),d=String(a.employee_name||a.user_name||c||"-"),l=String(a.employee_code||"-"),m=a.birth_date?String(a.birth_date).slice(0,10):"-",u=a.applied_at?re(a.applied_at):"-",x=Number(a.item_count||0),f=Number(a.total_amount||0).toLocaleString("ja-JP"),h=new URLSearchParams(window.location.search).get("standalone");let E=`/admin/expenses/monthly-detail?month=${encodeURIComponent(r)}&userId=${encodeURIComponent(c)}`;return h&&(E+=`&standalone=${encodeURIComponent(h)}`),`<tr data-user-id="${c}" data-month="${r}">
        <td>${d}</td>
        <td>${l}</td>
        <td>${m}</td>
        <td><span class="pill applied">${r}</span></td>
        <td>${u}</td>
        <td style="text-align:left;">${x}</td>
        <td style="text-align:left;">\xA5${f}</td>
        <td>
          <div class="month-apply-actions">
            <a class="btn exp-admin-btn-secondary" href="${E}" style="min-height:30px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;">\u78BA\u8A8D</a>
            <button class="btn exp-admin-btn-primary" data-action="approve-month" type="button" style="min-height:30px;">\u6708\u6B21\u627F\u8A8D</button>
          </div>
        </td>
      </tr>`}).join("");e.innerHTML=`
      <div class="exp-admin-table-wrap">
        <table class="exp-admin-table clean-view">
          <thead><tr>
            <th>\u793E\u54E1</th><th>\u793E\u54E1\u30B3\u30FC\u30C9</th><th>\u751F\u5E74\u6708\u65E5</th><th>\u5BFE\u8C61\u6708</th><th>\u9001\u4FE1\u65E5\u6642</th><th style="text-align:left;">\u4EF6\u6570</th><th style="text-align:left;">\u5408\u8A08</th><th>\u64CD\u4F5C</th>
          </tr></thead>
          <tbody>${n}</tbody>
        </table>
      </div>
    `,e.dataset.bound!=="1"&&(e.dataset.bound="1",e.addEventListener("click",async a=>{const c=a.target.closest('button[data-action="approve-month"]');if(!c)return;const r=c.closest("tr[data-user-id][data-month]");if(!r)return;const d=String(r.getAttribute("data-user-id")||""),l=String(r.getAttribute("data-month")||"");if(!(!d||!l||!window.confirm(`${l} \u3092\u6708\u6B21\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`))){c.disabled=!0;try{await $("/api/expenses/admin/months/approve",{method:"POST",body:JSON.stringify({userId:d,month:l})}),await R()}catch(u){const x=document.getElementById("expMonthlyStatus");x&&(x.textContent=String(u?.message||"\u6708\u6B21\u627F\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}finally{c.disabled=!1}}}))},Et=(i,s,e)=>{const t=w("#expMonthlySummaryHost");if(!t)return;const n=Array.isArray(i?.totals)?i.totals:[],a=Array.isArray(i?.closures)?i.closures:[],c=new Map(a.map(l=>[String(l.user_id),l])),r=new Map;if((Array.isArray(e)?e:[]).forEach(l=>{const m=String(l?.userId||"");if(!m)return;const u=String(l?.status||"").toLowerCase();(u==="applied"||u==="pending"||u==="draft")&&r.set(m,(r.get(m)||0)+1)}),!n.length){t.innerHTML=`<div class="empty-state"><div style="font-size:22px;">\u{1F4CA}</div><div>${Je(s)}\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>`;return}const d=n.map(l=>{const m=String(l.user_id||""),u=c.get(m)||null,x=Number(l.total_amount||0).toLocaleString("ja-JP"),f=Number(l.item_count||l.approved_count||0),h=Number(r.get(m)||0),E=u?.closed_at?re(u.closed_at):"";return`<tr>
        <td>${l.user_name||""}</td>
        <td style="text-align:left;">${f}</td>
        <td style="text-align:left;">${x}</td>
        <td style="text-align:left;">${Number(h||0).toLocaleString("ja-JP")}</td>
        <td>${E?'<span class="status-main approved"><span class="s-ico">\u2714</span><span>\u7DE0\u3081\u6E08\u307F</span></span>':'<span class="status-sub">\u672A\u7DE0\u3081</span>'}</td>
      </tr>`}).join("");t.innerHTML=`
      <div style="font-size:12px;color:#64748b;margin:0 0 8px 2px;">\u203B \u6708\u6B21\u7DE0\u3081\u524D\u306E\u6570\u5024\u306F\u66AB\u5B9A\u3067\u3059\uFF08\u672A\u51E6\u7406\u4EF6\u6570\u3092\u78BA\u8A8D\u3057\u3066\u304B\u3089\u7DE0\u3081\u3066\u304F\u3060\u3055\u3044\uFF09</div>
      <div class="exp-admin-table-wrap">
        <table class="exp-admin-table clean-view">
          <thead><tr><th>\u793E\u54E1</th><th>${Je(s)}\u4EF6\u6570</th><th>${Je(s)}\u91D1\u984D(\u5186)</th><th>\u672A\u51E6\u7406</th><th>\u6708\u6B21\u7DE0\u3081</th></tr></thead>
          <tbody>${d}</tbody>
        </table>
      </div>
    `},Mt=i=>{const s=w("#expMonthlyHistoryHost"),e=document.getElementById("expMonthlyHistorySection");if(!s)return;if(!viewState.showHistory){e&&(e.style.display="none"),s.innerHTML="";return}e&&(e.style.display="");const t=Array.isArray(i)?i:[];if(!t.length){s.innerHTML=`
        <div style="margin-top:6px;padding:4px 2px;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">\u6708\u6B21\u5C65\u6B74\uFF08\u76F4\u8FD1\uFF09</div>
          <div style="color:#64748b;font-size:13px;">\u5C65\u6B74\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</div>
        </div>
      `;return}const n=t.map(a=>{const c=String(a.month||""),r=Number(a.closed_users||0).toLocaleString("ja-JP"),d=Number(a.approved_count||0).toLocaleString("ja-JP"),l=Number(a.total_amount||0).toLocaleString("ja-JP"),m=a.last_closed_at?re(a.last_closed_at):"-";return`<tr>
        <td>${c}</td>
        <td style="text-align:left;">${r}</td>
        <td style="text-align:left;">${d}</td>
        <td style="text-align:left;">${l}</td>
        <td>${m}</td>
      </tr>`}).join("");s.innerHTML=`
      <div style="margin-top:4px;">
        <div style="font-weight:700;color:#0f172a;margin:0 0 6px 2px;">\u6708\u6B21\u5C65\u6B74\uFF08\u76F4\u8FD112\u30F6\u6708\uFF09</div>
        <div class="exp-admin-table-wrap">
          <table class="exp-admin-table">
            <thead><tr><th>\u6708</th><th>\u793E\u54E1\u6570</th><th>\u627F\u8A8D\u4EF6\u6570</th><th>\u6708\u6B21\u5408\u8A08(\u5186)</th><th>\u6700\u7D42\u7DE0\u3081</th></tr></thead>
            <tbody>${n}</tbody>
          </table>
        </div>
      </div>
    `},et=(i,s)=>{const e=w("#chatNotice"),t=w("#chatList");if(!e||!t)return;const n=Array.isArray(i)?i:[];if(!n.length){e.style.display="none",t.innerHTML="";return}e.style.display="",t.innerHTML=n.slice(0,10).map(a=>{const c=a.sender_name||"",r=a.employee_name||"",d=re(a.created_at),l=[a.origin||"",a.via||"",a.destination||""].filter(Boolean).join("\u2192"),m=a.purpose||"";return`<div data-exp-id="${String(a.expense_id)}" style="display:flex;gap:8px;align-items:center;">
        <span style="color:#334155;font-size:12px;">${d}</span>
        <span style="color:#1f2937;font-weight:700;">${c}</span>
        <span style="color:#64748b;">\u2192</span>
        <span style="color:#1f2937;">${r}</span>
        <span style="color:#334155;flex:1;">${l} ${m?"\uFF0F\u76EE\u7684: "+m:""}</span>
        <button class="btn" data-action="open-chat" style="height:28px;">\u8868\u793A</button>
      </div>`}).join(""),t.addEventListener("click",a=>{const c=a.target.closest('button[data-action="open-chat"]');if(!c)return;const r=c.closest("div[data-exp-id]"),d=r?r.getAttribute("data-exp-id"):"";if(!d)return;const l=s?s.querySelector(`[data-id="${CSS.escape(String(d))}"]`):null;l&&l.querySelector('button[data-action="chat"]')?.click()},{once:!0})},Bt=(i,s)=>{const e=w("#expEmployeeListHost");if(!e)return;const t=Array.isArray(i)?i:[],n=new Map((Array.isArray(s)?s:[]).map(d=>[String(d.id),d])),a=new Map;for(const d of t){const l=String(d.userId||"");if(!l)continue;const m=l,u=a.get(m)||{userId:l,count:0,pending:0,amount:0,updatedAt:""};u.count+=1,String(d.status||"").toLowerCase()==="applied"&&(u.pending+=1),u.amount+=Number(d.amount||0);const f=String(d.updated_at||d.applied_at||d.approved_at||d.date||"");(!u.updatedAt||f>u.updatedAt)&&(u.updatedAt=f),a.set(m,u)}const c=Array.from(a.values()).sort((d,l)=>l.pending-d.pending||l.amount-d.amount).slice(0,500);if(!viewState.selectedUserId&&c.length&&(viewState.selectedUserId=String(c[0].userId||"")),!c.length){e.innerHTML='<div class="empty-state"><div style="font-size:22px;">\u{1F9FE}</div><div>\u8868\u793A\u5BFE\u8C61\u306E\u793E\u54E1\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>';return}const r=c.map(d=>{const l=n.get(String(d.userId))||null,m=l?.username||l?.email||String(d.userId),u=Number(d.amount||0).toLocaleString("ja-JP"),x=Number(d.pending||0).toLocaleString("ja-JP");return`<button type="button" class="exp-employee-card ${String(viewState.selectedUserId)===String(d.userId)?"is-active":""}" data-action="pick-employee" data-uid="${String(d.userId)}">
        <div class="exp-employee-name">${m}</div>
        <div class="exp-employee-sub">\u627F\u8A8D\u5F85\u3061: ${x}\u4EF6</div>
        <div class="exp-employee-sub">\u4ECA\u6708: \xA5 ${u}</div>
        <div class="exp-employee-sub">\u2713 \u6700\u7D42\u66F4\u65B0 ${re(d.updatedAt||"")||"-"}</div>
      </button>`}).join("");e.innerHTML=r,e.dataset.boundOpen||(e.dataset.boundOpen="1",e.addEventListener("click",async d=>{const l=d.target.closest('button[data-action="pick-employee"]');if(!l)return;const m=String(l.getAttribute("data-uid")||"");viewState.selectedUserId=m;try{const u=(Array.isArray(i)?i:[]).filter(E=>String(E?.userId||"")===m),x=new Set;u.forEach(E=>{const G=String(E?.date||"").slice(0,7);/^\d{4}-\d{2}$/.test(G)&&x.add(G)});const f=Array.from(x).sort((E,G)=>String(G).localeCompare(String(E)))[0]||"",h=document.getElementById("expMonth");h&&f&&(h.value=f)}catch{}viewState.selectedRowIds.clear(),viewState.page=1,await R()}))},Lt=i=>{const s=document.getElementById("expEmployeeMonthsHost"),e=document.getElementById("expSelectedMonthSummary"),t=document.getElementById("expEmployeeMonthOverview");if(!s)return;const n=Array.isArray(i)?i:[],a=String(viewState.selectedUserId||""),c=a?n.filter(u=>String(u?.userId||"")===a):n,r=new Map;c.forEach(u=>{const f=String(u?.date||"").slice(0,10).slice(0,7);if(!/^\d{4}-\d{2}$/.test(f))return;const h=r.get(f)||{count:0,applied:0,approved:0,rejected:0,amount:0,amountApproved:0};h.count+=1;const E=Number(u?.amount||0);h.amount+=E;const G=String(u?.status||"").toLowerCase();G==="applied"?h.applied+=1:G==="approved"?(h.approved+=1,h.amountApproved+=E):G==="rejected"&&(h.rejected+=1),r.set(f,h)});const d=Array.from(r.entries()).sort((u,x)=>String(x[0]).localeCompare(String(u[0])));if(!d.length){s.innerHTML='<span class="exp-claim-meta">\u7533\u8ACB\u6708\u30C7\u30FC\u30BF\u306A\u3057</span>',e&&(e.innerHTML="<span>\u3053\u306E\u793E\u54E1\u306E\u7533\u8ACB\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</span>"),t&&(t.innerHTML="");return}const l=String(document.getElementById("expMonth")?.value||"");s.innerHTML=d.map(([u,x])=>{const f=u===l?"is-active":"",h=x||{count:0,applied:0,approved:0,rejected:0,amount:0,amountApproved:0},E=`${u.replace("-","\u5E74")}\u6708 (${Number(h.count||0).toLocaleString("ja-JP")})`;return`<button type="button" class="exp-month-chip ${f}" data-action="pick-month" data-month="${u}">${E}</button>`}).join("");const m=r.get(l)||null;e&&(m?e.innerHTML=`
          <span><strong>${l.replace("-","\u5E74")}\u6708</strong></span>
          <span>\u7533\u8ACB: <strong>${Number(m.applied||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u627F\u8A8D: <strong>${Number(m.approved||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u5DEE\u623B\u3057: <strong>${Number(m.rejected||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u6708\u5408\u8A08(\u5168\u4EF6): <strong>\xA5${Number(m.amount||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u6708\u6B21\u7DE0\u3081\u5BFE\u8C61(\u627F\u8A8D\u306E\u307F): <strong>\xA5${Number(m.amountApproved||0).toLocaleString("ja-JP")}</strong></span>
        `:e.innerHTML="<span>\u6708\u3092\u9078\u629E\u3059\u308B\u3068\u96C6\u8A08\u304C\u8868\u793A\u3055\u308C\u307E\u3059</span>"),t&&(t.innerHTML=d.map(([u,x])=>{const f=x||{applied:0,approved:0,rejected:0,amount:0,amountApproved:0};return`<div class="exp-month-overview-row">
          <b>${u.replace("-","\u5E74")}\u6708</b>
          <span>\u7533\u8ACB: <strong>${Number(f.applied||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u627F\u8A8D: <strong>${Number(f.approved||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u5DEE\u623B\u3057: <strong>${Number(f.rejected||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u5168\u4EF6\u5408\u8A08: <strong>\xA5${Number(f.amount||0).toLocaleString("ja-JP")}</strong></span>
          <span>\u7DE0\u3081\u5BFE\u8C61: <strong>\xA5${Number(f.amountApproved||0).toLocaleString("ja-JP")}</strong></span>
        </div>`}).join("")),s.dataset.bound||(s.dataset.bound="1",s.addEventListener("click",async u=>{const x=u.target.closest('button[data-action="pick-month"][data-month]');if(!x)return;const f=String(x.getAttribute("data-month")||"");if(!f)return;const h=document.getElementById("expMonth");h&&(h.value=f),viewState.page=1,viewState.selectedRowIds.clear(),await R()}))},tt=()=>{const i=w("#expMonth")?w("#expMonth").value:je(),s=w("#expUserFilter")&&w("#expUserFilter").value||"",e=w("#expDeptFilter")&&w("#expDeptFilter").value||"",t=w("#expEmploymentFilter")&&w("#expEmploymentFilter").value||"",n=w("#expMinAmount")&&w("#expMinAmount").value||"",a=w("#expMaxAmount")&&w("#expMaxAmount").value||"",c=w("#expApproverFilter")&&w("#expApproverFilter").value||"",r=w("#expSortKey")&&w("#expSortKey").value||"date_desc",[d,l]=String(r).split("_"),m=String(l||"desc").toLowerCase()==="asc"?"asc":"desc",u=String(o.status||""),f=u==="monthly_approval"||u==="applied_approved"?"applied":u,h=new URLSearchParams;return h.set("month",i),h.set("page",String(viewState.page||1)),h.set("limit",String(viewState.pageSize||20)),h.set("sortBy",String(d||"date")),h.set("sortDir",m),f&&h.set("status",f),s&&h.set("userId",s),e&&h.set("departmentId",e),t&&h.set("employmentType",t),n!==""&&h.set("minAmount",n),a!==""&&h.set("maxAmount",a),c&&h.set("approverId",c),{month:i,currentUserFilter:s,q:h}},R=async()=>{const{month:i,currentUserFilter:s,q:e}=tt(),t=w("#expStatus"),n=w("#expTableHost");n&&(n.innerHTML=""),t&&(t.textContent="\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026"),Ve();try{const a=new URLSearchParams(e);a.delete("month"),a.set("page","1"),a.set("limit","1000");const[c,r,d,l,m,u,x,f]=await Promise.allSettled([$(`/api/expenses/admin/list?${e.toString()}`),$("/api/admin/users"),$(`/api/expenses/admin/messages?month=${encodeURIComponent(i)}`),$(`/api/expenses/admin/monthly-summary?month=${encodeURIComponent(i)}${s?`&userId=${encodeURIComponent(s)}`:""}`),$(`/api/expenses/admin/monthly-history?limit=12${s?`&userId=${encodeURIComponent(s)}`:""}`),$("/api/admin/departments"),$(`/api/expenses/admin/list?${a.toString()}`),Promise.resolve([])]),h=c.status==="fulfilled"?c.value:{rows:[],total:0,page:1,limit:viewState.pageSize},E=Array.isArray(h)?h:Array.isArray(h?.rows)?h.rows:[],G=Array.isArray(h)?E.length:Number(h?.total||E.length);viewState.page=Math.max(1,Number(h?.page||viewState.page||1)),viewState.pageSize=Math.max(1,Number(h?.limit||viewState.pageSize||20));const fe=r.status==="fulfilled"?Array.isArray(r.value)?r.value:Array.isArray(r.value?.rows)?r.value.rows:[]:[],le=x.status==="fulfilled"?x.value:{rows:[]},oe=Array.isArray(le)?le:Array.isArray(le?.rows)?le.rows:[],P=u.status==="fulfilled"&&Array.isArray(u.value)?u.value:[],U=d.status==="fulfilled"&&Array.isArray(d.value)?d.value:[],Y=l.status==="fulfilled"?l.value:{totals:[],closures:[]},p=(()=>{const C=Array.isArray(Y?.closures)?Y.closures:[],N=ce=>String(ce?.month||"").slice(0,7)===i,Z=C.filter(N);if(!s)return{totals:[],closures:Z};const Le=ce=>String(ce?.user_id??ce?.userId??"")===String(s);return{totals:[],closures:Z.filter(Le)}})(),g=m.status==="fulfilled"&&Array.isArray(m.value)?m.value:[],b=f.status==="fulfilled"&&Array.isArray(f.value)?f.value:[],A=String(o.status||"");if(A==="monthly_approval"||A==="applied_approved"){const C=document.getElementById("expMonthApplySection");C&&(C.style.display="block");const N=document.getElementById("expMonthlyHistorySection");N&&(N.style.display="block");const Z=document.getElementById("expDashList");Z&&(Z.style.display="none")}const L=new Map(fe.map(C=>[String(C.id),C.username||C.email||""])),B=w("#expUserFilter");if(B&&!B.dataset.bound){if(B.dataset.bound="1",B.innerHTML='<option value="">\u5168\u54E1</option>'+fe.map(C=>`<option value="${String(C.id)}">${C.username||C.email||String(C.id)}</option>`).join(""),Oe&&!We&&(B.value=Oe,viewState.selectedUserId=String(Oe),We=!0,!s)){viewState.page=1,await R();return}B.addEventListener("change",async()=>{viewState.selectedUserId=String(B.value||""),viewState.selectedRowIds.clear(),viewState.page=1,await R()})}const V=w("#expDeptFilter");V&&!V.dataset.bound&&(V.dataset.bound="1",V.innerHTML='<option value="">\u5168\u3066</option>'+P.map(C=>`<option value="${String(C.id)}">${C.name||C.code||"#"+String(C.id)}</option>`).join(""),V.addEventListener("change",async()=>{viewState.page=1,await R()}));const ae=w("#expApproverFilter");if(ae&&!ae.dataset.bound){ae.dataset.bound="1";const C=fe.filter(N=>["admin","manager"].includes(String(N.role||"").toLowerCase()));ae.innerHTML='<option value="">\u627F\u8A8D\u8005: \u5168\u3066</option>'+C.map(N=>`<option value="${String(N.id)}">${N.username||N.email||String(N.id)}</option>`).join(""),ae.addEventListener("change",async()=>{viewState.page=1,await R()})}const _=Array.isArray(E)?E:[],Q=w("#expAggregateMode")&&w("#expAggregateMode").value||"approved";At(_),It(b,i),Bt(oe,fe),Lt(oe);const X=_.filter(C=>$t(C.status,Q)),be=new Map;X.forEach(C=>{const N=String(C.userId||"");if(!N)return;const Z=be.get(N)||{user_id:N,user_name:L.get(N)||N,month:i,item_count:0,total_amount:0};Z.item_count+=1,Z.total_amount+=Number(C.amount||0),be.set(N,Z)});const se=Array.from(be.values()).sort((C,N)=>String(C.user_name||"").localeCompare(String(N.user_name||"")));Et({month:i,totals:se,closures:p.closures},Q,_),Mt(g);const Ue=w("#expToggleDetails");if(Ue&&(Ue.textContent=viewState.showDetails?"\u660E\u7D30\u975E\u8868\u793A":"\u660E\u7D30\u8868\u793A"),et(U,n),!_.length)n&&(n.innerHTML='<div class="empty-state"><div style="font-size:28px;">\u{1F5C2}\uFE0F</div><div>\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093</div></div>');else{if(!viewState.showDetails){n&&(n.innerHTML='<div class="empty-state"><div style="font-size:24px;">\u{1F4C1}</div><div>\u660E\u7D30\u306F\u975E\u8868\u793A\u3067\u3059\u3002\u300C\u660E\u7D30\u8868\u793A\u300D\u3092\u62BC\u3059\u3068\u4E00\u89A7\u3092\u8868\u793A\u3057\u307E\u3059\u3002</div></div>'),t&&(t.textContent=""),_e();return}const C=String(viewState.selectedUserId||""),N=C?_.filter(k=>String(k.userId||"")===C):_,Z=new Map;N.forEach(k=>{const H=String(k.userId||""),j=String(k.date||"").slice(0,7),ne=String(k.status||"pending").toLowerCase(),K=`${H}_${j}_${ne}`;Z.has(K)||Z.set(K,{userId:H,userName:L.get(H)||H,month:j,status:ne,totalAmount:0,count:0,items:[]});const ye=Z.get(K);ye.totalAmount+=Number(k.amount||0),ye.count+=1,ye.items.push(k)});const Le=Array.from(Z.values()).sort((k,H)=>{const j=String(k.userName).localeCompare(String(H.userName));return j!==0?j:String(H.month).localeCompare(String(k.month))}),ce=Le.length,Ce=Math.max(1,Math.ceil(ce/viewState.pageSize));viewState.page=Math.min(Math.max(1,viewState.page),Ce);const Re=(viewState.page-1)*viewState.pageSize,st=Le.slice(Re,Re+viewState.pageSize).map((k,H)=>{const j=k.status,ne=j==="approved"?"\u627F\u8A8D\u6E08\u307F":j==="paid"?"\u652F\u7D66\u6E08\u307F":j==="applied"?"\u7533\u8ACB\u4E2D":j==="rejected"?"\u5DEE\u623B\u3057":j,K=`grp_${k.userId}_${k.month}_${j}_${H}`,ye=k.items.every(T=>viewState.selectedRowIds.has(String(T.id))),ee=`
            <article class="exp-claim-card" style="background-color: #f8fafc; border-left: 4px solid #3b82f6;">
              <div class="exp-claim-head">
                <div>
                  <div class="exp-claim-route" style="font-size: 14px;">${y(k.userName)} <span style="color:#64748b; font-weight:normal; margin-left:8px;">${y(k.month.replace("-","\u5E74"))}\u6708</span></div>
                  <div class="exp-claim-meta">\u5408\u8A08 ${k.count} \u4EF6</div>
                </div>
                <div style="text-align:left;">
                  <div style="font-size:20px;font-weight:800;">\xA5${Number(k.totalAmount).toLocaleString("ja-JP")}</div>
                  <div class="status-main ${j}"><span class="s-ico">${j==="approved"?"\u2714":j==="applied"?"\u23F3":j==="rejected"?"\u21A9":"\u2022"}</span><span>${ne}</span></div>
                </div>
              </div>
              <div class="exp-claim-actions" style="margin-top: 12px;">
                <label class="exp-claim-meta"><input class="exp-claim-check group-check" type="checkbox" data-group-id="${K}" ${ye?"checked":""}>\u5168\u4EF6\u9078\u629E</label>
                <button class="btn exp-admin-btn-secondary" data-action="toggle-group" data-target="${K}" type="button" style="height:30px;">\u8A73\u7D30 (${k.count})</button>
                ${j==="applied"?`<button class="btn exp-admin-btn-primary" data-action="approve-group" data-group-id="${K}" type="button" style="height:30px;">\u4E00\u62EC\u627F\u8A8D</button>`:""}
                ${j==="approved"?`<button class="btn exp-admin-btn-primary" data-action="pay-group" data-group-id="${K}" type="button" style="height:30px;background-color:#8b5cf6;border-color:#8b5cf6;color:white;">\u4E00\u62EC\u652F\u7D66\u6E08\u307F\u306B\u3059\u308B</button>`:""}
              </div>
            </article>
          `,me=k.items.map(T=>{const xe=String(T.date||"").slice(0,10),Fe=Number(T.amount||0).toLocaleString("ja-JP"),z=String(T.id||""),q=T.applied_at?re(T.applied_at):"",J=T.approved_at?re(T.approved_at):"",D=j==="applied"?q?`\u7533\u8ACB: ${q}`:"":j==="approved"?J?`\u627F\u8A8D: ${J}`:"":j==="rejected"&&J?`\u5374\u4E0B: ${J}`:"",v=T.approver_id&&L.get(String(T.approver_id))||"",de=[D,v?`\u62C5\u5F53: ${v}`:""].filter(Boolean).join(" / "),W=T.receipt_url?String(T.receipt_url):T.first_file_path?String(T.first_file_path):"",ve=W?` data-url="${W}"`:"",O=Number(T.file_count||0),pe=[T.origin||"",T.destination||""].filter(Boolean).join(" \u2192 "),$e=W||O>0?`<button class="btn" data-action="files"${ve} type="button" style="height:28px;">\u9818\u53CE\u66F8${O>1?`(${O})`:""}</button>`:'<button class="btn" data-action="files" type="button" style="height:28px;" disabled>\u9818\u53CE\u66F8\u306A\u3057</button>',De=viewState.selectedRowIds.has(String(z))?"checked":"";return`<article class="exp-claim-card" data-id="${z}" data-group-parent="${K}" style="margin-left: 20px; border-left: 2px solid #cbd5e1; border-top: none; box-shadow: none; border-radius: 0; padding-top: 8px; padding-bottom: 8px; display: none;">
              <div class="exp-claim-head" style="margin-bottom: 4px;">
                <div>
                  <div class="exp-claim-route" style="font-size: 13px;">${pe||"-"}</div>
                  <div class="exp-claim-meta">${xe}</div>
                </div>
                <div style="text-align:left;">
                  <div style="font-size:16px;font-weight:800;">\xA5${Fe}</div>
                </div>
              </div>
              ${de?`<div class="exp-claim-meta">${de}</div>`:""}
              <div class="exp-claim-actions" style="margin-top: 8px;">
                <label class="exp-claim-meta"><input class="exp-claim-check child-check" type="checkbox" data-role="pick-row" data-id="${z}" data-parent-group="${K}" ${De}>\u9078\u629E</label>
                <button class="btn exp-admin-btn-secondary" data-action="edit" type="button" style="height:26px; font-size:11px;">\u7DE8\u96C6</button>
                ${$e}
                <button class="btn exp-admin-btn-secondary" data-action="chat" type="button" style="height:26px; font-size:11px;">\u30C1\u30E3\u30C3\u30C8</button>
                <button class="btn exp-admin-btn-danger" data-action="delete" type="button" style="height:26px; font-size:11px;">\u524A\u9664</button>
              </div>
            </article>`}).join("");return ee+me}).join(""),_t=`
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0 10px;">
            <div style="color:#64748b;font-size:12px;">${ce?Re+1:0}-${Math.min(Re+viewState.pageSize,ce)} / ${ce} \u30B0\u30EB\u30FC\u30D7</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="font-size:12px;color:#334155;">\u8868\u793A\u4EF6\u6570
                <select id="expPageSize" style="margin-left:4px;height:28px;">
                  <option value="20" ${viewState.pageSize===20?"selected":""}>20</option>
                  <option value="50" ${viewState.pageSize===50?"selected":""}>50</option>
                  <option value="100" ${viewState.pageSize===100?"selected":""}>100</option>
                </select>
              </label>
              <button class="btn exp-page-btn" data-page="${Math.max(1,viewState.page-1)}" ${viewState.page<=1?"disabled":""} style="height:28px;">\u524D</button>
              <span style="font-size:12px;color:#334155;">${viewState.page} / ${Ce}</span>
              <button class="btn exp-page-btn" data-page="${Math.min(Ce,viewState.page+1)}" ${viewState.page>=Ce?"disabled":""} style="height:28px;">\u6B21</button>
            </div>
          </div>
        `;n.innerHTML=`
          ${_t}
          <div class="exp-claims-list">${st||'<div class="empty-state"><div style="font-size:24px;">\u{1F4ED}</div><div>\u9078\u629E\u4E2D\u306E\u793E\u54E1\u306B\u8868\u793A\u3067\u304D\u308B\u660E\u7D30\u306F\u3042\u308A\u307E\u305B\u3093</div></div>'}</div>
        `;const dt=document.getElementById("expBulkState");dt&&(dt.textContent=`${viewState.selectedRowIds.size}\u4EF6\u9078\u629E\u4E2D`);const pt=document.getElementById("expBulkApprove");pt&&(pt.onclick=async()=>{const k=Array.from(viewState.selectedRowIds||[]);if(!(!k.length||!window.confirm(`${k.length}\u4EF6\u3092\u4E00\u62EC\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`))){for(const j of k)try{await $(`/api/expenses/${encodeURIComponent(j)}/status`,{method:"PATCH",body:JSON.stringify({status:"approved",note:""})})}catch{}viewState.selectedRowIds.clear(),await R()}});const rt=document.getElementById("expBulkClear");rt&&(rt.onclick=()=>{viewState.selectedRowIds.clear();const k=document.getElementById("expBulkState");k&&(k.textContent="0\u4EF6\u9078\u629E\u4E2D"),n.querySelectorAll('input[data-role="pick-row"]').forEach(H=>{H.checked=!1})}),n.querySelectorAll(".exp-page-btn").forEach(k=>{k.addEventListener("click",async()=>{const H=parseInt(String(k.getAttribute("data-page")||"1"),10);viewState.page=Number.isFinite(H)&&H>0?H:1,await R()})});const lt=n.querySelector("#expPageSize");lt?.addEventListener("change",async()=>{const k=parseInt(String(lt.value||"10"),10);viewState.pageSize=[10,20,50].includes(k)?k:10,viewState.page=1,await R()}),n&&!n.dataset.bound&&(n.dataset.bound="1",n.addEventListener("change",k=>{const H=k.target.closest('input[data-role="pick-row"][data-id]');if(H){const ne=String(H.getAttribute("data-id")||"");if(!ne)return;H.checked?viewState.selectedRowIds.add(ne):viewState.selectedRowIds.delete(ne);const K=document.getElementById("expBulkState");K&&(K.textContent=`${viewState.selectedRowIds.size}\u4EF6\u9078\u629E\u4E2D`);return}const j=k.target.closest("input.group-check");if(j){const ne=j.getAttribute("data-group-id"),K=j.checked;n.querySelectorAll(`input.child-check[data-parent-group="${ne}"]`).forEach(me=>{me.checked=K;const T=me.getAttribute("data-id");K?viewState.selectedRowIds.add(T):viewState.selectedRowIds.delete(T)});const ee=document.getElementById("expBulkState");ee&&(ee.textContent=`${viewState.selectedRowIds.size}\u4EF6\u9078\u629E\u4E2D`)}}),n.addEventListener("click",async k=>{const H=k.target.closest('button[data-action="toggle-group"]');if(H){const z=H.getAttribute("data-target"),q=n.querySelectorAll(`article[data-group-parent="${z}"]`);let J=!0;q.forEach(D=>{D.style.display==="none"?(D.style.display="block",J=!1):(D.style.display="none",J=!0)}),H.textContent=J?H.textContent.replace("\u9589\u3058\u308B","\u8A73\u7D30"):H.textContent.replace("\u8A73\u7D30","\u9589\u3058\u308B");return}const j=k.target.closest('button[data-action="approve-group"]');if(j){const z=j.getAttribute("data-group-id"),q=n.querySelectorAll(`input.child-check[data-parent-group="${z}"]`),J=Array.from(q).map(v=>v.getAttribute("data-id")).filter(Boolean);if(!J.length||!window.confirm(`\u3053\u306E\u30B0\u30EB\u30FC\u30D7\u306E ${J.length} \u4EF6\u3092\u4E00\u62EC\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`))return;j.disabled=!0;for(const v of J)try{await $(`/api/expenses/${encodeURIComponent(v)}/status`,{method:"PATCH",body:JSON.stringify({status:"approved",note:""})})}catch{}viewState.selectedRowIds.clear(),await R();return}const ne=k.target.closest('button[data-action="pay-group"]');if(ne){const z=ne.getAttribute("data-group-id"),q=n.querySelectorAll(`input.child-check[data-parent-group="${z}"]`),J=Array.from(q).map(v=>v.getAttribute("data-id")).filter(Boolean);if(!J.length||!window.confirm(`\u3053\u306E\u30B0\u30EB\u30FC\u30D7\u306E ${J.length} \u4EF6\u3092\u4E00\u62EC\u652F\u7D66\u6E08\u307F\u306B\u3057\u307E\u3059\u304B\uFF1F`))return;ne.disabled=!0;for(const v of J)try{await $(`/api/expenses/${encodeURIComponent(v)}/status`,{method:"PATCH",body:JSON.stringify({status:"paid",note:""})})}catch{}viewState.selectedRowIds.clear(),await R();return}const K=k.target.closest("a.receipt-link"),ye=k.target.closest("[data-id]");if(K&&ye&&parseInt(String(K.getAttribute("data-count")||"0"),10)>1){k.preventDefault(),ye.querySelector('button[data-action="files"]')?.click();return}const ee=k.target.closest("button[data-action]");if(!ee)return;const me=ee.closest("[data-id]"),T=me?me.getAttribute("data-id"):"";if(!T)return;const xe=ee.getAttribute("data-action"),Fe=xe==="approve"?"approved":xe==="pay"?"paid":"rejected";ee.disabled=!0;try{if(xe==="approve"||xe==="reject"||xe==="pay"){let z="";xe==="reject"&&(z=window.prompt("\u5374\u4E0B\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u5FC5\u9808\uFF09","")||""),await $(`/api/expenses/${encodeURIComponent(T)}/status`,{method:"PATCH",body:JSON.stringify({status:Fe,note:z})}),await R()}else if(xe==="edit"){const z=()=>{let D=document.getElementById("adminEditModalOverlay");return D||(D=document.createElement("div"),D.id="adminEditModalOverlay",D.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:20px;z-index:1600;",D.innerHTML=`
                    <div id="adminEditModal" role="dialog" aria-modal="true" aria-label="\u4EA4\u901A\u8CBB\u7DE8\u96C6"
                      style="width:720px;max-width:90vw;max-height:90vh;background:#fff;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.2);display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb;">
                        <div style="font-weight:800;color:#0b2c66;">\u7DE8\u96C6\uFF08\u7BA1\u7406\uFF09</div>
                        <button id="adCloseTop" type="button" class="btn" aria-label="\u9589\u3058\u308B" style="width:34px;height:34px;padding:0;border-radius:999px;">\xD7</button>
                      </div>
                      <div id="adScrollBody" style="overflow-y:auto;padding:14px 16px;">
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">\u57FA\u672C\u60C5\u5831</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;margin-bottom:12px;">
                          <div class="adjust-label">\u65E5\u4ED8</div><div><input id="adDate" type="date" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u8CBB\u76EE</div><div><select id="adType" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"><option value="train">\u96FB\u8ECA</option><option value="bus">\u30D0\u30B9</option><option value="taxi">\u30BF\u30AF\u30B7\u30FC</option><option value="private_car">\u81EA\u5BB6\u7528\u8ECA</option><option value="parking">\u99D0\u8ECA\u5834</option><option value="highway">\u9AD8\u901F\u9053\u8DEF</option></select></div>
                          <div class="adjust-label">\u76EE\u7684</div><div><input id="adPurpose" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u30E1\u30E2</div><div><input id="adMemo" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">\u7D4C\u8DEF\u60C5\u5831</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;margin-bottom:12px;">
                          <div class="adjust-label">\u51FA\u767A</div><div><input id="adOrigin" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u7D4C\u7531</div><div><input id="adVia" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u5230\u7740</div><div><input id="adDestination" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u7247\u9053/\u5F80\u5FA9</div><div><select id="adTripType" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"><option value="one_way">\u7247\u9053</option><option value="round_trip">\u5F80\u5FA9</option></select></div>
                          <div class="adjust-label">\u56DE\u6570</div><div><input id="adTripCount" type="number" min="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u5B9A\u671F</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="adTeiki" type="checkbox"><span>\u5B9A\u671F\u533A\u9593\u5185</span></label></div>
                          <div class="adjust-label">\u901A\u52E4</div><div><label style="display:flex;align-items:center;gap:8px;"><input id="adCommuter" type="checkbox"><span>\u901A\u52E4\u30D1\u30B9</span></label></div>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">\u91D1\u984D\u60C5\u5831</div>
                        <div class="adjust-grid" style="grid-template-columns: 120px 1fr;">
                          <div class="adjust-label">\u8DDD\u96E2(km)</div><div><input id="adKm" type="number" step="0.1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u5358\u4FA1</div><div><input id="adUnitPrice" type="number" step="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                          <div class="adjust-label">\u91D1\u984D</div><div><input id="adAmount" type="number" step="1" class="adjust-input" style="background:#fff;border:1px solid #cbd5e1;"></div>
                        </div>
                      </div>
                      <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #e5e7eb;background:#fff;">
                        <button id="adCancel" class="btn" type="button" style="height:34px;">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
                        <button id="adSave" class="btn btn-primary" type="button" style="height:34px;">\u4FDD\u5B58</button>
                        <button id="adApply" class="btn" type="button" style="height:34px;">\u7533\u8ACB</button>
                      </div>
                    </div>
                  `,document.body.appendChild(D),D)},q=()=>{try{(n||document).querySelectorAll("details[open]").forEach(v=>v.removeAttribute("open"))}catch{}};await(async D=>{q();const v=z(),de=document.getElementById("adminEditModal");try{const S=_.find(F=>String(F.id)===String(D))||await $(`/api/expenses/${encodeURIComponent(D)}`),I=(F,te)=>{const qe=document.getElementById(F);qe&&(qe.value=te)};I("adDate",S.date?String(S.date).slice(0,10):je()+"-01"),I("adType",S.type||S.category||"train"),I("adOrigin",S.origin||""),I("adVia",S.via||""),I("adDestination",S.destination||""),I("adTripType",S.trip_type||"one_way"),I("adTripCount",S.trip_count!=null?String(S.trip_count):"1"),I("adKm",S.distance_km!=null?String(S.distance_km):""),I("adUnitPrice",S.unit_price_per_km!=null?String(S.unit_price_per_km):""),I("adPurpose",S.purpose||"");try{const F=document.getElementById("adTeiki");F&&(F.checked=!!S.teiki_flag)}catch{}try{const F=document.getElementById("adCommuter");F&&(F.checked=!!S.commuter_pass)}catch{}I("adAmount",S.amount!=null?String(S.amount):""),I("adMemo",S.memo||"")}catch{}v.style.display="flex";try{document.body.style.overflow="hidden"}catch{}const W=()=>{v.style.display="none";try{document.body.style.overflow=""}catch{}jt()},ve=async()=>{const S={date:document.getElementById("adDate")?.value,type:document.getElementById("adType")?.value,origin:document.getElementById("adOrigin")?.value,via:document.getElementById("adVia")?.value,destination:document.getElementById("adDestination")?.value,trip_type:document.getElementById("adTripType")?.value,trip_count:parseInt(String(document.getElementById("adTripCount")?.value||"1"),10),distance_km:parseFloat(String(document.getElementById("adKm")?.value||"")),unit_price_per_km:parseFloat(String(document.getElementById("adUnitPrice")?.value||"")),purpose:document.getElementById("adPurpose")?.value,teiki_flag:!!document.getElementById("adTeiki")?.checked,commuter_pass:!!document.getElementById("adCommuter")?.checked,amount:parseFloat(String(document.getElementById("adAmount")?.value||"")),memo:document.getElementById("adMemo")?.value};try{const I=await $(`/api/expenses/${encodeURIComponent(D)}`),F=[],te=(zt,ut,mt)=>{const gt=ut==null?"":String(ut),ht=mt==null?"":String(mt);gt!==ht&&F.push(`${zt}: ${ht} \u2192 ${gt}`)};te("\u65E5\u4ED8",S.date,I.date?String(I.date).slice(0,10):""),te("\u8CBB\u76EE",S.type,I.type||I.category),te("\u51FA\u767A",S.origin,I.origin),te("\u7D4C\u7531",S.via,I.via),te("\u5230\u7740",S.destination,I.destination),te("\u7247\u9053/\u5F80\u5FA9",S.trip_type,I.trip_type),te("\u56DE\u6570",S.trip_count,I.trip_count),te("\u8DDD\u96E2(km)",S.distance_km,I.distance_km),te("\u5358\u4FA1",S.unit_price_per_km,I.unit_price_per_km),te("\u76EE\u7684",S.purpose,I.purpose),te("\u5B9A\u671F",S.teiki_flag,I.teiki_flag),te("\u901A\u52E4",S.commuter_pass,I.commuter_pass),te("\u91D1\u984D",S.amount,I.amount),te("\u30E1\u30E2",S.memo,I.memo);const qe=F.length?`\u5909\u66F4\u5185\u5BB9:
`+F.join(`
`)+`
\u4FDD\u5B58\u3057\u307E\u3059\u304B\uFF1F`:"\u5909\u66F4\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u4FDD\u5B58\u3057\u307E\u3059\u304B\uFF1F";if(!window.confirm(qe))return}catch{}try{await $(`/api/expenses/${encodeURIComponent(D)}`,{method:"PATCH",body:JSON.stringify(S)}),await R(),W()}catch(I){const F=document.getElementById("expStatus");F&&(F.textContent=`\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${String(I?.message||"unknown")}`,F.style.display="block",F.style.color="#b00020")}},O=async()=>{try{await $(`/api/expenses/${encodeURIComponent(D)}/apply`,{method:"POST"}),await R(),W()}catch(S){const I=document.getElementById("expStatus");I&&(I.textContent=`\u7533\u8ACB\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${String(S?.message||"unknown")}`,I.style.display="block",I.style.color="#b00020")}},pe=document.getElementById("adCancel"),$e=document.getElementById("adCloseTop"),De=document.getElementById("adSave"),Pe=document.getElementById("adApply"),ct=S=>{S.target===v&&W()},xt=S=>{S.key==="Escape"&&W()};pe?.addEventListener("click",W),$e?.addEventListener("click",W),De?.addEventListener("click",ve),Pe?.addEventListener("click",O),v.addEventListener("click",ct),window.addEventListener("keydown",xt);const jt=()=>{pe?.removeEventListener("click",W),$e?.removeEventListener("click",W),De?.removeEventListener("click",ve),Pe?.removeEventListener("click",O),v.removeEventListener("click",ct),window.removeEventListener("keydown",xt)}})(T)}else if(xe==="files"){let z=[];try{z=await $(`/api/expenses/${encodeURIComponent(T)}/files`)}catch{}const q=me.nextElementSibling;if(q&&q.classList.contains("files-row")){q.remove(),ee.disabled=!1;return}if(Array.isArray(z)&&z.length===1){const v=z[0],de=String(v.path||v.url||v.file_path||"").startsWith("/")?String(v.path||v.url||v.file_path):"/"+String(v.path||v.url||v.file_path||"");try{window.open(de,"_blank")}catch{window.location.href=de}}if((!z||z.length===0)&&ee.hasAttribute("data-url")){const v=ee.getAttribute("data-url")||"";if(v)try{window.open(v.startsWith("/")?v:"/"+v,"_blank")}catch{window.location.href=v.startsWith("/")?v:"/"+v}}const J=Array.isArray(z)&&z.length?z.map(v=>{const de=String(v.mime||"").startsWith("image/"),W=String(v.path||v.url||v.file_path||"").startsWith("/")?String(v.path||v.url||v.file_path):"/"+String(v.path||v.url||v.file_path||""),ve=de?`<img src="${W}" alt="${v.name||""}" style="width:80px;height:auto;border:1px solid #e5e7eb;border-radius:8px;" />`:'<span style="font-weight:700;color:#1e40af;">PDF</span>',O=v.name||v.original_name||W.split("/").pop();return`<li style="display:flex;align-items:center;gap:8px;"><a href="${W}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;text-decoration:none;">${ve}<span>${O}</span></a></li>`}).join(""):"<li>\u30D5\u30A1\u30A4\u30EB\u306A\u3057</li>",D=document.createElement("div");D.className="files-row",D.innerHTML=`<div style="border-top:1px dashed #dbe6f5;padding-top:8px;"><ul style="list-style:none;padding:0;margin:6px 0;display:flex;gap:8px;flex-wrap:wrap;">${J}</ul></div>`,me.after(D)}else if(xe==="delete"){if(!window.confirm("\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")){ee.disabled=!1;return}await $(`/api/expenses/${encodeURIComponent(T)}`,{method:"DELETE"}),await R()}}catch{}if(xe==="chat"){const z=me.nextElementSibling;if(z&&z.classList.contains("chat-row")){z.remove(),ee.disabled=!1;return}const q=document.createElement("div");q.className="chat-row",q.innerHTML=`
                <div class="chat-box" style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff;">
                  <div class="chat-header" style="font-weight:700;color:#1f2937;margin-bottom:8px;">\u3084\u308A\u53D6\u308A</div>
                  <div class="chat-reason" style="margin-bottom:8px;color:#7f1d1d;font-weight:700;"></div>
                  <div class="chat-messages" style="max-height:220px;overflow:auto;padding:6px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;"></div>
                  <div class="chat-input" style="display:flex;gap:8px;margin-top:8px;">
                    <input type="text" class="chat-text" placeholder="\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u5165\u529B\u2026" style="flex:1;height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;">
                    <button class="btn chat-send" type="button" style="height:36px;">\u9001\u4FE1</button>
                  </div>
                </div>
              `,me.after(q);const J=q.querySelector(".chat-messages"),D=q.querySelector(".chat-text"),v=q.querySelector(".chat-send"),de=q.querySelector(".chat-reason");try{const O=E.find($e=>String($e.id)===String(T)),pe=O&&O.manager_note?String(O.manager_note):"";de&&(de.textContent=pe?"\u5DEE\u623B\u3057\u7406\u7531: "+pe:"")}catch{}const W=async()=>{try{const O=await $(`/api/expenses/${encodeURIComponent(T)}/messages`);J.innerHTML=Array.isArray(O)&&O.length?O.map(pe=>{const $e=pe.sender_name||"",De=re(pe.created_at),Pe=String(pe.sender_user_id)===String(window.ADMIN_ID||"");return`<div style="display:flex;margin:6px 0;${Pe?"justify-content:flex-end":""}">
                          <div style="max-width:70%;padding:8px 10px;border-radius:12px;${Pe?"background:#dbeafe;color:#1e3a8a;":"background:#e2e8f0;color:#111827;"}">
                            <div style="font-size:12px;color:#334155;font-weight:700;display:flex;justify-content:space-between;gap:8px;"><span>${$e}</span><span style="color:#64748b;">${De}</span></div>
                            <div>${pe.message}</div>
                          </div>
                        </div>`}).join(""):'<div style="color:#64748b;">\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093</div>'}catch{J.innerHTML='<div style="color:#b00020;">\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F</div>'}};await W();const ve=async()=>{const O=String(D.value||"").trim();if(O){v.disabled=!0;try{await $(`/api/expenses/${encodeURIComponent(T)}/messages`,{method:"POST",body:JSON.stringify({message:O})}),D.value="",await W()}catch{}v.disabled=!1}};v.addEventListener("click",ve),D.addEventListener("keydown",async O=>{O.key==="Enter"&&(O.preventDefault(),await ve())}),ee.disabled=!1;return}ee.disabled=!1}))}t&&(t.textContent="")}catch(a){t&&(t.textContent=`\u53D6\u5F97\u5931\u6557: ${String(a?.message||"unknown")}`)}finally{_e()}},at=w("#expReload");at&&at.addEventListener("click",R),w("#expMonth")?.addEventListener("change",async()=>{viewState.page=1,await R()}),w("#expAggregateMode")?.addEventListener("change",async()=>{viewState.page=1,await R()}),["#expDeptFilter","#expEmploymentFilter","#expApproverFilter","#expSortKey"].forEach(i=>{w(i)?.addEventListener("change",async()=>{viewState.page=1,await R()})}),["#expMinAmount","#expMaxAmount"].forEach(i=>{w(i)?.addEventListener("keydown",async e=>{e.key==="Enter"&&(e.preventDefault(),viewState.page=1,await R())})}),w("#expExportCsv")?.addEventListener("click",async()=>{try{const{q:i}=tt();i.set("page","1"),i.set("limit","1000");const s=`/api/expenses/admin/export.csv?${i.toString()}`,e=document.createElement("a");e.href=s,e.target="_blank",e.rel="noopener",document.body.appendChild(e),e.click(),e.remove()}catch{}}),w("#expToggleDetails")?.addEventListener("click",async()=>{viewState.showDetails=!viewState.showDetails,viewState.page=1,await R()});const nt=w("#expToggleHistory");nt?.addEventListener("click",async()=>{viewState.showHistory=!viewState.showHistory,nt.textContent=viewState.showHistory?"\u5C65\u6B74\u3092\u96A0\u3059":"\u5C65\u6B74\u3092\u8868\u793A",await R()});const Ct=w("#expMonthlyClose"),Dt=w("#expMonthlyRecalc"),he=w("#expMonthlyStatus"),it=async i=>{const s=w("#expMonth")?w("#expMonth").value:je(),e=w("#expUserFilter")&&w("#expUserFilter").value||"",t=i?"\u518D\u8A08\u7B97":"\u6708\u6B21\u7DE0\u3081",n=e?"\u9078\u629E\u4E2D\u306E\u793E\u54E1":"\u5168\u793E\u54E1";if(window.confirm(`${s} \u306E\u4EA4\u901A\u8CBB\u3092${n}\u5BFE\u8C61\u3067${t}\u3057\u307E\u3059\u304B\uFF1F`)){he&&(he.style.display="block",he.style.color="#334155",he.textContent=`${t} \u5B9F\u884C\u4E2D...`);try{const c=await $("/api/expenses/admin/monthly-close",{method:"POST",body:JSON.stringify({month:s,forceRecalc:!!i,userId:e||null})}),r=Number(c?.result?.affectedUsers||0);he&&(he.style.color="#166534",he.textContent=`${t} \u5B8C\u4E86: ${r}\u540D`),await R()}catch(c){he&&(he.style.color="#b00020",he.textContent=`${t} \u5931\u6557: ${String(c?.message||"unknown")}`)}}};Ct?.addEventListener("click",async()=>{await it(!1)}),Dt?.addEventListener("click",async()=>{await it(!0)}),await R();try{Ae=window.setInterval(async()=>{try{const i=w("#expMonth")?w("#expMonth").value:je(),s=await $(`/api/expenses/admin/messages?month=${encodeURIComponent(i)}`);et(s,w("#expTableHost"))}catch{}},3e4)}catch{}return()=>{try{Ae&&window.clearInterval(Ae)}catch{}try{_e()}catch{}try{const i=document.getElementById("drawerBackdrop");i&&(i.setAttribute("hidden",""),i.style.display="none")}catch{}try{const i=document.getElementById("adminEditModalOverlay");i&&(i.style.display="none",i.remove())}catch{}try{document.body.style.overflow=""}catch{}}};async function Xt(ie={}){const Ae=ie.content||document.querySelector("#adminContent"),Ie=await Tt();if(Ie){try{window.ADMIN_ID=Ie.id}catch{}try{window.ADMIN_PROFILE=Ie}catch{}return await Rt(Ae)}}export{Xt as mount};
