import{requireAdmin as Qt}from"../_shared/require-admin.js";import{fetchJSONAuth as Nt}from"../../api/http.api.js";import{downloadWithAuth as Wt}from"../../shared/api/client.js";import{createMonthPicker as _createMonthPicker}from"../../shared/ui/month-picker.js";const c=d=>document.querySelector(d),j=d=>/^\d{4}-\d{2}$/.test(String(d||"")),Gt=()=>new Date(Date.now()+9*3600*1e3).toISOString().slice(0,7),m=d=>String(d||"").replace(/[&<>"']/g,g=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[g]),W=d=>{if(!d)return"\u2014";const g=String(d);return g.length>=16?g.slice(11,16):g},Ft=d=>d==="submitted"?{label:"\u63D0\u51FA\u6E08",style:"background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;"}:d==="checkout_missing"?{label:"\u9000\u52E4\u6F0F\u308C",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="checkout_missing_submitted"?{label:"\u9000\u52E4\u6F0F\u308C(\u5165\u529B\u6E08)",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="missing"?{label:"\u672A\u63D0\u51FA",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="not_checked_in"?{label:"\u672A\u51FA\u52E4",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="not_punched"?{label:"\u672A\u6253\u523B",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="absence"?{label:"\u6B20\u52E4",style:"background:#fef2f2;color:#991b1b;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:d==="monthly_input_only"?{label:"\u6708\u6B21\u5165\u529B\u6E08\u307F\uFF08\u6253\u523B\u306A\u3057\uFF09",style:"background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;"}:d==="off"?{label:"\u4F11\u65E5",style:"background:#f8fafc;color:#475569;border-color:#e2e8f0;"}:d==="unregistered"?{label:"\u672A\u767B\u9332",style:"background:#f8fafc;color:#94a3b8;border-color:#e2e8f0;"}:d==="paid_leave"?{label:"\u6709\u7D66\u4F11\u6687",style:"background:#f8fafc;color:#475569;border-color:#e2e8f0;"}:d==="unpaid_leave"?{label:"\u7121\u7D66\u4F11\u6687",style:"background:#f8fafc;color:#475569;border-color:#e2e8f0;"}:d==="working"?{label:"\u52E4\u52D9\u4E2D",style:"background:#f0fdf4;color:#166534;font-weight:600;font-size:13px;border:none;padding:4px 8px;border-radius:6px;"}:{label:"\u2014",style:"background:#f8fafc;color:#475569;border-color:#e2e8f0;"},dt=d=>d==="onsite"?"\u51FA\u793E":d==="remote"?"\u5728\u5B85":d==="satellite"?"\u73FE\u5834":"\u2014",Jt=()=>new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10),O=d=>{const g=String(d?.status||""),R=!!(String(d?.site||"").trim()||String(d?.work||"").trim());if(g==="checkout_missing"&&R)return"checkout_missing_submitted";if(g!=="working")return g;const k=String(d?.date||"").slice(0,10),G=!!d?.attendance?.checkOut;return/^\d{4}-\d{2}-\d{2}$/.test(k)&&k<Jt()&&!G?R?"checkout_missing_submitted":"checkout_missing":g},Dt=d=>{const g=String(d||"").trim();return g==="\u571F"?"wr-dow-sat":g==="\u65E5"?"wr-dow-sun":g==="\u6708"||g==="\u706B"||g==="\u6C34"||g==="\u6728"||g==="\u91D1"?"wr-dow-weekday":""},Vt=d=>{const g=String(d||"").slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(g))return"";const[R,k,G]=g.split("-").map(lt=>parseInt(lt,10)),T=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"],J=new Date(Date.UTC(R,k-1,G)).getUTCDay();return T[J]||""},Yt=()=>{try{const d=document.querySelector("#pageSpinner");d&&(d.removeAttribute("hidden"),d.style.display="grid")}catch{}},Kt=()=>{try{const d=document.querySelector("#pageSpinner");d&&(d.setAttribute("hidden",""),d.style.display="none")}catch{}};async function ee(){const d=new URLSearchParams(window.location.search).get("standalone")==="1",g=d?"100vh":"calc(100vh - var(--topbar-height) - var(--subbar-height))",R=d?"calc(100vh - 120px)":"calc(100vh - var(--topbar-height) - var(--subbar-height) - 120px)",k=document.getElementById("attendanceHubContent")||document.getElementById("adminContent");if(k&&k.id==="attendanceHubContent"&&(k.style.padding=window.innerWidth<=768?"0":"16px 24px",k.style.boxSizing="border-box",k.style.background="#FFFFFF"),k&&(k.innerHTML='<div style="color:#475569;font-weight:650;">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>'),!await Qt()||!k)return;const T=new URLSearchParams(window.location.search),J=j(T.get("month"))?String(T.get("month")):Gt(),lt=String(T.get("sort")||"dateDesc"),qt=String(T.get("dept")||""),jt=String(T.get("q")||""),At=String(T.get("group")||"")==="1",i={month:J,sort:lt,dept:qt,q:jt,group:At,items:[]};k.innerHTML="";const V=document.createElement("div");V.className="wr-layout",V.style.cssText="display: flex; flex-direction: column; background: #FFFFFF; font-family: Inter, 'Noto Sans JP', sans-serif; width: 100%;";const Bt=`
      .wr-input { height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 10px; font-size: 13px; color: #0f172a; outline: none; background: #fff; box-sizing: border-box; }
      :root[data-theme='dark'] .wr-input { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      :root[data-theme='dark'] .wr-select { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      :root[data-theme='dark'] .attrec-btn { color: #e8eaed !important; background: #303134 !important; border-color: #3c4043 !important; }
      .wr-select { padding-right: 30px; min-width: 120px; cursor: pointer; text-overflow: ellipsis; }
      .wr-input:focus { border-color: #3b82f6; }
      .wr-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; flex-shrink: 0; }
      .wr-mobile-row { display: contents; }
      .wr-btn { height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; outline: none; transition: all .15s; }
      .wr-btn-dl { background: #10b981; color: #fff; gap: 6px; }
      .wr-btn-dl:hover { background: #059669; }
      .wr-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
      .wr-table th { padding: 6px 12px; font-size: 12px; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; font-weight: 500; text-align: left; white-space: nowrap; }
      .wr-table td { padding: 6px 12px; vertical-align: middle; border: none; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
      .wr-table tbody tr:hover td { background: #f8fafc; }
      .wr-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid transparent; white-space: nowrap; }
      .wr-dow-sat { color: #2563eb; }
      .wr-dow-sun { color: #dc2626; }
      .wr-off-row td { background: #fff5f5 !important; }
      .wr-off-row:hover td { background: #fee2e2 !important; }
      .attrec-btn { height: 30px; display: inline-flex; align-items: center; justify-content: center; padding: 0 12px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #cbd5e1; outline: none; transition: all .15s; background: #fff; color: #475569; }
      .attrec-btn:hover { background: #f8fafc; border-color: #94a3b8; }

      .wr-layout { min-height: calc(${g} - 32px); display: flex; flex-direction: column; }
      .wr-table-wrap { flex: 1 1 auto; position: relative; z-index: 1; min-width: 0; }
      .wr-table-container { width: 100%; overflow: auto; max-height: calc(100vh - 160px); }

      @media (max-width: 768px) {
        .wr-layout { flex: 1 1 0% !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; }
        .wr-table-wrap { flex: 1 1 auto !important; min-height: 0 !important; }
        .wr-table-container { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        
        .wr-table tbody td.group-hide, .wr-table th.group-hide, .wr-table col.group-hide { display: none !important; }
        .wr-toolbar { display: flex !important; flex-direction: column !important; gap: 12px !important; padding: 16px !important; background: #f8fafc !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; margin: 0 0 16px 0 !important; }
        
        .wr-mobile-row { display: flex !important; gap: 8px !important; width: 100% !important; align-items: center !important; }
        
        .hidden-on-mobile { display: none !important; }
        
        /* Main Row: Month picker (prev/next), Search, Toggle \u2014 hi\u1EC3n th\u1ECB ngay trong
           n\u1ED9i dung trang v\xEC slot header #attHubMobileActions kh\xF4ng t\u1ED3n t\u1EA1i \u1EDF admin.ejs. */
        .wr-mobile-row.main-row { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; width: 100% !important; align-items: center !important; padding: 10px 12px !important; background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; margin: 0 0 12px 0 !important; box-sizing: border-box !important; }
        .wr-mobile-row.main-row .wr-month.hidden-on-mobile { display: none !important; }
        .wr-mobile-row.main-row .wr-month-nav { display: flex !important; align-items: center !important; gap: 6px !important; flex: 1 1 100% !important; }
        .wr-mobile-row.main-row .wr-month-nav .wr-month { flex: 1 !important; height: 38px !important; font-size: 15px !important; text-align: center !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; background: #fff !important; }
        .wr-mobile-row.main-row .wr-month-btn { height: 38px !important; min-width: 42px !important; padding: 0 10px !important; font-size: 18px !important; line-height: 1 !important; border: 1px solid #cbd5e1 !important; border-radius: 6px !important; background: #fff !important; color: #0f172a !important; font-weight: 700 !important; cursor: pointer !important; flex-shrink: 0 !important; }
        .wr-mobile-row.main-row .wr-query { flex: 1 1 auto !important; height: 38px !important; font-size: 14px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; background: #fff !important; }
        .wr-mobile-row.main-row .wr-filter-toggle { display: inline-flex !important; align-items: center !important; justify-content: center !important; height: 38px !important; width: 42px !important; flex-shrink: 0 !important; border: 1px solid #cbd5e1 !important; border-radius: 6px !important; background: #fff !important; color: #475569 !important; cursor: pointer !important; padding: 0 !important; }
        .wr-mobile-row.main-row .wr-filter-toggle.active { background: #eef2ff !important; border-color: #94a3b8 !important; color: #0f172a !important; }
        
        .wr-toolbar-wrapper { padding-bottom: 0 !important; }
        .wr-toolbar { padding: 0 !important; margin: 0 !important; background: transparent !important; border: none !important; border-radius: 0 !important; }
        
        /* Advanced Filters */
        .wr-mobile-row.advanced-filters { order: 2; display: none !important; flex-direction: column !important; gap: 12px !important; width: 100% !important; padding: 12px !important; background: #f1f5f9 !important; border-radius: 6px !important; margin-top: 8px !important; margin-bottom: 12px !important; border: 1px solid #e2e8f0 !important; box-sizing: border-box !important; }
        .wr-mobile-row.advanced-filters.show { display: flex !important; }
        
        .wr-mobile-row.selects-row { display: flex !important; gap: 8px !important; width: 100% !important; }
        .wr-mobile-row.selects-row select { flex: 1 !important; height: 40px !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; padding: 0 12px !important; font-size: 14px !important; background-color: #fff !important; width: 50% !important; box-sizing: border-box !important; margin: 0 !important; }
        
        .wr-mobile-row.bottom-advanced-row { display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; gap: 12px !important; }
        .wr-mobile-row.checkbox-row { padding: 0 !important; border: none !important; width: auto !important; }
        
        .wr-mobile-row.excel-row { display: block !important; width: auto !important; }
        .wr-mobile-row.excel-row .excel-dropdown-container { position: relative !important; }
        .wr-mobile-row.excel-row .excel-dropdown-btn { height: 40px !important; border-radius: 6px !important; background: #fff !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; justify-content: center !important; font-size: 14px !important; display: flex !important; align-items: center !important; padding: 0 16px !important; font-weight: 500 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; box-sizing: border-box !important; margin: 0 !important; }
        .wr-mobile-row.excel-row .excel-dropdown-btn::after { display: none !important; }
        
        /* Summary */
        .wr-mobile-row.summary-row { order: 3; margin-top: 4px !important; padding-top: 4px !important; border-top: 1px solid #e2e8f0 !important; width: 100% !important; }
        .wr-summary-container { padding: 0 !important; font-size: 14px !important; display: flex !important; gap: 12px !important; flex-wrap: wrap !important; width: 100% !important; color: #475569 !important; font-weight: 500 !important; }
        
        /* Hide Excel button on mobile toolbar area, maybe move it elsewhere or keep hidden if requested, but user didn't specify. Assuming we hide it or put it at the very bottom/top. Let's put it top right if needed, but per design left side is preferred. Let's hide the old month picker and excel button row and re-layout. */
        
        .wr-table { display: block !important; width: 100% !important; min-width: 0 !important; border: none !important; border-collapse: separate !important; overflow-x: visible !important; }
        .wr-table thead, .wr-table colgroup { display: none !important; }
        .wr-table tbody { display: flex !important; flex-direction: column !important; gap: 12px !important; padding: 12px 0 !important; width: 100% !important; background: transparent !important; }
        
        .wr-table tbody tr { display: grid !important; grid-template-columns: 105px 1fr !important; grid-auto-rows: auto !important; margin: 0 0 16px 0 !important; border: 1px solid #cbd5e1 !important; border-radius: 0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; background: #fff !important; padding: 0 !important; position: relative !important; }
        .wr-table tbody td { border: none !important; box-shadow: none !important; outline: none !important; background: transparent !important; }
        
        /* First cell (Left Column) */
        .wr-table tbody td:nth-child(1) {
          grid-column: 1 / 2 !important;
          grid-row: 1 / 20 !important; /* Span across all rows */
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          padding: 16px 8px !important;
          border: none !important;
          border-right: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          border-radius: 0 !important;
          text-align: left !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .wr-table tbody td:nth-child(1)::before {
          content: attr(data-label) !important;
          font-size: 11px !important;
          font-weight: 400 !important;
          color: #64748b !important;
          margin-bottom: 4px !important;
          margin-right: 0 !important;
          width: auto !important;
          min-width: 0 !important;
          display: block !important;
        }
        .wr-table tbody td:nth-child(1) span,
        .wr-table tbody td:nth-child(1) {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
        }

        /* Other cells (Right Column) */
        .wr-table tbody td:not(:nth-child(1)) {
          grid-column: 2 / 3 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 8px 16px !important;
          border: none !important;
          border-bottom: 1px dashed #f1f5f9 !important;
          text-align: left !important;
          width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }
        .wr-table tbody td:last-child {
          border-bottom: none !important;
        }
        
        /* Label positioning for right column */
        .wr-table tbody td:not(:nth-child(1))::before {
          content: attr(data-label) !important;
          width: 70px !important;
          min-width: 70px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #64748b !important;
          margin-right: 8px !important;
          text-align: left !important;
          flex-shrink: 0 !important;
          display: inline-block !important;
        }
        
        /* Content styling */
        .wr-table tbody td:not(:nth-child(1)) > div,
        .wr-table tbody td:not(:nth-child(1)) > span {
          text-align: left !important;
          font-size: 14px !important;
          color: #1e293b !important;
          width: 100% !important;
          word-break: break-word !important;
        }

        /* Hide Day column since we can combine it, but let's just show it normally for now to match Attendance structure */
        /* Grouped view specific fixes */
        .wr-table tbody td.group-hide { display: none !important; }
        
        /* Fix status pill in mobile */
        .wr-table tbody td[data-label="\u72B6\u614B"] .dash-pill {
          display: inline-flex !important;
          padding: 4px 10px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        
        /* Fix row backgrounds for left cell */
        .wr-table tbody tr.wr-off-row td:nth-child(1) { background: #fff5f5 !important; border-right-color: #fecaca !important; color: #dc2626 !important; }
        .wr-table tbody tr.wr-sat-row td:nth-child(1) { background: #eff6ff !important; border-right-color: #bfdbfe !important; color: #2563eb !important; }
        
        /* Mobile List Table Fixes */
        .wr-table-container { border: none !important; box-shadow: none !important; background: transparent !important; padding-bottom: 60px !important; overflow-x: auto !important; padding: 0 !important; }
        .wr-summary-container { padding: 0 12px !important; }
        
        /* Sticky Pagination for Mobile */
        .wr-mobile-pagination {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: #ffffff !important;
          padding: 12px 16px !important;
          box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          z-index: 100 !important;
          border-top: 1px solid #e2e8f0 !important;
          margin-top: 0 !important;
        }
        
        #adminContent.card { border: none !important; box-shadow: none !important; background: transparent !important; }
        
        /* Specific adjustments for grouped view to prevent double borders */
        .wr-table-wrap > div > .wr-table-container { padding: 0 !important; }
        .wr-table-wrap > div > .wr-table-container .wr-table tbody tr { margin-bottom: 12px !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; border: 1px solid #e2e8f0 !important; }
      }
      @media (min-width: 769px) {
        .group-hide { display: none !important; }
        .hidden-on-mobile { display: flex !important; }
        .hidden-on-desktop { display: none !important; }
        .wr-mobile-only { display: none !important; }
        .wr-month-nav { display: contents !important; }
        .wr-toolbar { display: flex !important; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; flex-shrink: 0; }
        .wr-mobile-row { display: contents !important; }
        .search-row .wr-input { background-image: none !important; padding-left: 10px !important; }
      }
      .wr-work-td { position:relative; min-width:240px; cursor:pointer; vertical-align:top !important; padding:6px 10px 20px !important; }
      .wr-work-td .wr-work-preview { max-height:3.6em; overflow:hidden; color:#475569; line-height:1.5; white-space:pre-wrap; word-break:break-word; }
      .wr-work-td.wr-expanded .wr-work-preview { max-height:none; overflow:visible; }
      .wr-work-td:after { content:"\u25bc \u8A73\u7D30"; position:absolute; bottom:3px; right:6px; font-size:9px; color:#94a3b8; line-height:1; }
      .wr-work-td.wr-expanded:after { content:"\u25b2 \u9589\u3058\u308B"; color:#3b82f6; }
      .wr-site-td { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px; }
`,Pt=(t,a)=>`
    <style>
      ${Bt}
    </style>
    <div class="wr-toolbar-wrapper" style="flex-shrink: 0; padding-bottom: 12px; position: relative; z-index: 50;">
      <div class="wr-toolbar" style="position: relative; z-index: 50;">
        <div class="wr-mobile-row main-row">
          <div class="wr-month-nav">
            <button type="button" id="wrPrevMonthMobile" class="wr-month-btn wr-mobile-only" aria-label="\u524D\u6708">\u2039</button>
            <span id="wrMonthMobileSlot" class="hidden-on-desktop"></span>
            <button type="button" id="wrNextMonthMobile" class="wr-month-btn wr-mobile-only" aria-label="\u7FCC\u6708">\u203A</button>
          </div>
          <span id="wrMonthSlot" class="hidden-on-mobile"></span>
          <input id="wrQuery" type="text" class="wr-input wr-text wr-query" placeholder="\u793E\u54E1\u756A\u53F7/\u6C0F\u540D\u3067\u691C\u7D22" value="${a(t.q)}">
          <button type="button" id="wrFilterToggleMobile" class="wr-filter-toggle wr-mobile-only" aria-label="\u7D5E\u308A\u8FBC\u307F">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
          <button type="button" id="wrExportPdfSelect" class="attrec-btn hidden-on-mobile" style="display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;font-size:13px;font-weight:600;cursor:pointer;border-radius:0;margin-left:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> PDF\u51FA\u529B</button>

        </div>
        
        <div class="wr-mobile-row summary-row">
          <div id="wrSummary" class="wr-summary-container"></div>
        </div>
      </div>
    </div>
    <div class="wr-table-wrap" id="wrTable">
      <table class="wr-table" style="width:100%; min-width:1000px; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="width:110px;">\u65E5\u4ED8</th>
            <th style="width:60px;">\u66DC</th>
            <th style="width:100px;">\u793E\u54E1\u756A\u53F7</th>
            <th style="width:120px;">\u6C0F\u540D</th>
            <th style="width:100px;">\u90E8\u7F72</th>
            <th style="width:100px;">\u652F\u5E97</th>
            <th style="width:100px;">\u52E4\u52D9\u533A\u5206</th>
            <th style="width:80px;">\u51FA\u52E4</th>
            <th style="width:80px;">\u9000\u52E4</th>
            <th style="width:100px;">\u52E4\u52D9\u5F62\u614B</th>
            <th style="width:140px;">\u73FE\u5834</th>
            <th style="width:300px;">\u4F5C\u696D\u5185\u5BB9</th>
            <th style="width:100px;">\u9045\u523B\u30FB\u65E9\u9000\u7B49</th>
            <th style="width:200px;">\u5099\u8003</th>
            <th style="width:180px;">\u72B6\u614B</th>
          </tr>
        </thead>
        <tbody id="wrTableBody">
        </tbody>
      </table>
    </div>
    <div id="wrPdfSelectModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,0.55);align-items:center;justify-content:center;">
      <div style="width:min(720px,92vw);max-height:88vh;background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <div id="wrPdfSelTitle" style="font-size:16px;font-weight:700;color:#0f172a;">\u793E\u54E1\u3092\u9078\u629E\u3057\u3066PDF\u3092\u51FA\u529B</div>
            <div id="wrPdfSelSubtitle" style="font-size:12px;color:#64748b;">\u6708\u3092\u9078\u3073\u3001\u51FA\u529B\u3059\u308B\u793E\u54E1\u306B\u30C1\u30A7\u30C3\u30AF\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044</div>
          </div>
          <button type="button" id="wrPdfSelectClose" style="width:32px;height:32px;border:none;background:transparent;cursor:pointer;font-size:20px;color:#64748b;border-radius:6px;display:flex;align-items:center;justify-content:center;" title="\u9589\u3058\u308B">&times;</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#fff;">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:6px;min-width:180px;">
              <label style="font-size:13px;color:#334155;font-weight:600;white-space:nowrap;">\u5BFE\u8C61\u6708:</label>
              <span id="wrPdfSelectMonthSlot"></span>
            </div>
            <div style="flex:1;min-width:180px;">
              <input id="wrPdfSelectSearch" type="text" placeholder="\u793E\u54E1\u756A\u53F7 / \u6C0F\u540D / \u90E8\u7F72\u3067\u691C\u7D22" style="width:100%;height:34px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px 0 32px;font-size:13px;outline:none;box-sizing:border-box;background:#fff url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%2364748b\\'%3E%3Cpath stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\\'%3E%3C/p%3E%3C/svg%3E') no-repeat 10px center / 14px;">
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;gap:8px;align-items:center;">
              <button type="button" id="wrPdfSelectAll" style="height:30px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#334155;font-weight:500;">\u4E00\u89A7\u30C1\u30A7\u30C3\u30AF</button>
              <button type="button" id="wrPdfClearAll" style="height:30px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#334155;font-weight:500;">\u30AF\u30EA\u30A2</button>
            </div>
            <div id="wrPdfSelectCount" style="font-size:13px;color:#475569;font-weight:500;">0 \u540D\u9078\u629E\u4E2D</div>
          </div>
        </div>
        <div id="wrPdfSelectList" style="flex:1 1 auto;overflow:auto;padding:4px 10px 12px;"></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <button type="button" id="wrPdfSelectCancel" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#334155;font-weight:600;">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
          <button type="button" id="wrPdfSelectRun" disabled style="height:36px;padding:0 18px;border:none;border-radius:6px;background:#991b1b;color:#fff;cursor:not-allowed;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;opacity:0.6;transition:all .15s;"><svg id="wrPdfSelRunIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h1a2 2 0 0 1 0 4H9v-4z"/></svg><span id="wrPdfSelRunText">PDF\u51FA\u529B\u5B9F\u884C</span></button>
        </div>
      </div>
    </div>
  `;V.innerHTML=Pt(i,m),k.appendChild(V);const U=()=>{try{const t=new URL(window.location.href);t.searchParams.set("month",i.month),t.searchParams.set("sort",i.sort),i.dept?t.searchParams.set("dept",i.dept):t.searchParams.delete("dept"),i.q?t.searchParams.set("q",i.q):t.searchParams.delete("q"),i.group?t.searchParams.set("group","1"):t.searchParams.delete("group"),history.replaceState(null,"",t.pathname+t.search+t.hash)}catch{}};let H=1;const Y=window.innerWidth<=768,K=Y?15:10,X=t=>{if(!t||isNaN(t))return"";const a=Math.floor(t/60),n=t%60;return a>0&&n>0?`${a}\u6642\u9593${n}\u5206`:a>0?`${a}\u6642\u9593`:`${n}\u5206`},D=(t,a=!1)=>{a&&(H=1);const n=c("#wrTable");if(!n)return;if(!t.length){n.innerHTML='<div class="empty-state"><div style="font-size:28px;">\u{1F5C2}\uFE0F</div><div>\u51FA\u52E4\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>';return}const l=n.querySelector("#wrTableBody")||n,s=(H-1)*K,r=Math.min(s+K,t.length),f=t.slice(s,r).map(o=>{const p='<span style="color:#cbd5e1;">\u2014</span>',h=o.employeeCode||`EMP${String(o.userId).padStart(3,"0")}`,w=O(o),u=Ft(w);let S="";w==="checkout_missing"||w==="missing"||w==="not_punched"||w==="absence"?S="\u26A0 ":(w==="submitted"||w==="checkout_missing_submitted")&&(S="\u2705 "),u.label=S+u.label;let E=String(o.kubun||"").trim();E==="\u4F11\u65E5\u51FA\u52E4"&&!o.attendance?.checkIn&&!o.attendance?.checkOut&&!o.site&&!o.work&&(E="\u4F11\u65E5");const F=E?m(E):p,M=String(o.site||"").trim()?m(String(o.site).trim()):p,et=String(o.work||"").trim(),pt=et?m(et).replace(/\n/g,"<br>"):p,ct=String(o.departmentName||"").trim()?m(String(o.departmentName).trim()):p,mt=String(o.branchName||"").trim()?m(String(o.branchName).trim()):p,bt=o.attendance?.checkIn?m(W(o.attendance.checkIn)):p,ft=o.attendance?.checkOut?m(W(o.attendance.checkOut)):p,L=dt(o.workType)!=="\u2014"?m(dt(o.workType)):p;let Ct="";if(o.attendance?.checkIn){const nt=W(o.attendance.checkIn),kt=String(o.role||"").toLowerCase()==="part_time"||String(o.employment_type||"").toLowerCase()==="part_time"||String(o.employment_type||"")==="\u30A2\u30EB\u30D0\u30A4\u30C8",it=(o.departmentName||"").includes("\u5DE5\u4E8B")&&!kt?"08:00":"09:00";if(nt>it&&o.status!=="\u4F11\u65E5\u51FA\u52E4"){const[vt,$t]=nt.split(":").map(Number),[St,Mt]=it.split(":").map(Number),at=vt*60+$t-(St*60+Mt);at>0&&!o.lateMinutes&&(o.lateMinutes=at)}}const P=Number(o.lateMinutes)>0?`<span style="color:#ef4444;font-weight:bold;">\u26A0 \u9045\u523B ${X(o.lateMinutes)}</span>`:"",ot=Number(o.earlyMinutes)>0?`<span style="color:#ef4444;font-weight:bold;">\u26A0 \u65E9\u9000 ${X(o.earlyMinutes)}</span>`:"";let ht=[P,ot].filter(Boolean).join("<br>");const _=[o.notes].filter(Boolean).join(" - "),_t=_?`title="${m(_)}"`:"",gt=_.length>20?_.substring(0,20)+"...":_,Tt="",wt=ht||"",x=Dt(o.weekday),ut=o.date?o.date.replace(/-/g,"/"):"",q=!!o.holiday&&o.weekday!=="\u571F"&&o.weekday!=="\u65E5",v=x==="wr-dow-sun"||q,$=x==="wr-dow-sat"&&!q,z=v?"wr-off-row":$?"wr-sat-row":"",rt=v?"wr-sun-row":$?"wr-sat-row":"",xt=o.isSecondary?p:wt,yt=o.isSecondary?p:_?m(_):p;return`
        <tr class="${z}">
          <td data-label="\u65E5\u4ED8" class="${x} ${rt}" style="text-align:center; font-weight:600;">${m(ut)}</td>
          <td data-label="\u66DC" class="${x} ${rt}" style="text-align:center; font-weight:600;">${m(q?"\u795D":o.weekday||"")}</td>
          <td data-label="\u793E\u54E1\u756A\u53F7" style="white-space:nowrap;">${m(h)}</td>
          <td data-label="\u6C0F\u540D" style="font-weight:500; white-space:nowrap;">${m(o.username||"")}</td>
          <td data-label="\u90E8\u7F72" style="white-space:nowrap;">${ct}</td>
          <td data-label="\u652F\u5E97" style="white-space:nowrap;">${mt}</td>
          <td data-label="\u52E4\u52D9\u533A\u5206" style="white-space:nowrap;">${F}</td>
          <td data-label="\u51FA\u52E4" style="font-family:monospace; font-size:14px; white-space:nowrap; text-align:center;">${bt}</td>
          <td data-label="\u9000\u52E4" style="font-family:monospace; font-size:14px; white-space:nowrap; text-align:center;">${ft}</td>
          <td data-label="\u52E4\u52D9\u5F62\u614B" style="white-space:nowrap;">${L}</td>
          <td data-label="\u73FE\u5834" class="wr-site-td">${M}</td>
          <td data-label="\u4F5C\u696D\u5185\u5BB9" class="wr-work-td" onclick="this.classList.toggle('wr-expanded')"><div class="wr-work-preview">${pt}</div></td>
          <td data-label="\u9045\u523B\u30FB\u65E9\u9000\u7B49" style="white-space:nowrap;">${xt}</td>
          <td data-label="\u5099\u8003" style="white-space:pre-wrap; word-break:break-word; min-width:150px; max-width:300px; color:#475569;">${yt}</td>
          <td data-label="\u72B6\u614B"><span class="dash-pill" style="${u.style}; white-space:nowrap;">${m(u.label)}</span></td>
        </tr>
      `}).join("");let e="";if(t.length>0){const o=Math.ceil(t.length/K),p=H===1?"disabled":"",h=H===o?"disabled":"",w=H===1?"#f1f5f9":"#fff",u=H===o?"#f1f5f9":"#fff",S=H===1?"not-allowed":"pointer",E=H===o?"not-allowed":"pointer";e=`
        <div class="${Y?"wr-mobile-pagination":""}" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:8px 4px 0; clear:both;">
          <div style="color:#64748b; font-size:14px;">
            \u5168 <span style="font-weight:700; color:#0f172a;">${t.length}</span> \u4EF6\u4E2D <span style="font-weight:700; color:#0f172a;">${s+1}</span> - <span style="font-weight:700; color:#0f172a;">${r}</span> \u4EF6\u3092\u8868\u793A
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btnWrPrev" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${w}; color:#475569; cursor:${S}; font-size:14px;" ${p}>\u524D\u3078</button>
            <button id="btnWrNext" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${u}; color:#475569; cursor:${E}; font-size:14px;" ${h}>\u6B21\u3078</button>
          </div>
        </div>
      `}if(n.innerHTML=`
      <div class="wr-table-container" id="wrTableContainer" style="overflow:auto;max-height:calc(100vh - 160px);border-top:none;border-bottom:none;background:transparent;padding-bottom:0;width:100%;">
        <table class="wr-table" style="width:100%; table-layout:auto; border-collapse: collapse;">
              <thead style="position:sticky; top:0; z-index:10;">
                <tr style="background:#e6f2ff; color:#0f172a; height:30px;">
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u65E5\u4ED8</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u66DC</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u793E\u54E1\u756A\u53F7</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u6C0F\u540D</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u90E8\u7F72</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u652F\u5E97</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u52E4\u52D9\u533A\u5206</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u51FA\u52E4</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u9000\u52E4</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u52E4\u52D9\u5F62\u614B</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1; width:140px;">\u73FE\u5834</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1; width:360px;">\u4F5C\u696D\u5185\u5BB9</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u9045\u523B\u30FB\u65E9\u9000\u7B49</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u5099\u8003</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u72B6\u614B</th>
                </tr>
              </thead>
          <tbody>
            ${f}
          </tbody>
        </table>
      </div>
      ${e}
    `,t.length>0){const o=document.getElementById("btnWrPrev");o&&o.addEventListener("click",()=>{H>1&&(H--,D(t),Y&&setTimeout(()=>{const h=c("#wrTable");h&&h.scrollIntoView({behavior:"smooth",block:"start"})},50))});const p=document.getElementById("btnWrNext");p&&p.addEventListener("click",()=>{const h=Math.ceil(t.length/K);H<h&&(H++,D(t),Y&&setTimeout(()=>{const w=c("#wrTable");w&&w.scrollIntoView({behavior:"smooth",block:"start"})},50))})}},C=t=>String(t||"").trim().toLowerCase(),y=(t,a)=>{const n=C(t),l=C(a);return n===l?0:n<l?-1:1},Ht=t=>t==="checkout_missing"||t==="missing"?0:t==="checkout_missing_submitted"||t==="monthly_input_only"||t==="working"?1:t==="submitted"?2:3,I=t=>String(t?.employeeCode||`EMP${String(t?.userId||"").padStart(3,"0")}`),Z=t=>String(t?.username||"").trim(),tt=t=>String(t?.departmentName||"").trim(),A=t=>{const a=C(i.dept),n=C(i.q);let l=Array.isArray(t)?t.slice():[];return a&&(l=l.filter(s=>C(s?.departmentName)===a)),n&&(l=l.filter(s=>{const r=C(s?.employeeCode),b=C(s?.username);return r&&r.includes(n)||b&&b.includes(n)})),l.sort((s,r)=>{if(i.sort==="employee"){const e=y(I(s),I(r));if(e)return e;const o=y(r?.date,s?.date);return o||Number(s?.userId||0)-Number(r?.userId||0)}if(i.sort==="name"){const e=y(Z(s),Z(r));if(e)return e;const o=y(I(s),I(r));if(o)return o;const p=y(r?.date,s?.date);return p||Number(s?.userId||0)-Number(r?.userId||0)}if(i.sort==="department"){const e=y(tt(s),tt(r));if(e)return e;const o=y(I(s),I(r));if(o)return o;const p=y(r?.date,s?.date);return p||Number(s?.userId||0)-Number(r?.userId||0)}if(i.sort==="missingFirst"){const e=Ht(O(s))-Ht(O(r));if(e)return e;const o=y(r?.date,s?.date);if(o)return o;const p=y(I(s),I(r));return p||Number(s?.userId||0)-Number(r?.userId||0)}const b=y(r?.date,s?.date);if(b)return b;const f=y(I(s),I(r));return f||Number(s?.userId||0)-Number(r?.userId||0)}),l},Q=t=>{const a=c("#wrTable");if(!a)return;if(!t.length){a.innerHTML='<div class="empty-state"><div style="font-size:28px;">\u{1F5C2}\uFE0F</div><div>\u51FA\u52E4\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>';return}const n=new Map;for(const r of t){const b=Number(r?.userId||0),f=b?String(b):`${I(r)}|${Z(r)}|${tt(r)}`;n.has(f)||n.set(f,{userId:b||null,employeeCode:I(r),username:Z(r),departmentName:tt(r)||"\u2014",items:[]}),n.get(f).items.push(r)}const l=Array.from(n.values());for(const r of l)r.items.sort((b,f)=>y(f?.date,b?.date)),r.missing=r.items.filter(b=>{const f=O(b);return f==="missing"||f==="checkout_missing"}).length,r.submitted=r.items.filter(b=>{const f=O(b);return f==="submitted"||f==="checkout_missing_submitted"}).length,r.total=r.items.length;l.sort((r,b)=>{if(i.sort==="missingFirst"){const e=Number(b.missing||0)-Number(r.missing||0);if(e)return e}if(i.sort==="department"){const e=y(r.departmentName,b.departmentName);if(e)return e}if(i.sort==="name"){const e=y(r.username,b.username);if(e)return e}const f=y(r.employeeCode,b.employeeCode);return f||Number(r.userId||0)-Number(b.userId||0)});const s=l.map(r=>{const b=`
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span class="dash-pill" style="background:#f8fafc;color:#475569;border-color:#e2e8f0;">\u5408\u8A08 ${r.total}</span>
          <span class="dash-pill" style="background:#eef5ff;color:#0b2c66;border-color:#bfd7ff;">\u63D0\u51FA ${r.submitted}</span>
          <span class="dash-pill" style="background:#fff1f1;color:#991b1b;border-color:#ffcccc;">\u672A\u63D0\u51FA ${r.missing}</span>
        </div>
      `,f=r.items.map((e,o)=>{const p='<span style="color:#cbd5e1;">\u2014</span>',h=O(e),w=Ft(h);let u="";h==="checkout_missing"||h==="missing"||h==="not_punched"||h==="absence"?u="\u26A0 ":(h==="submitted"||h==="checkout_missing_submitted")&&(u="\u2705 "),w.label=u+w.label;let S=String(e.kubun||"").trim();S==="\u4F11\u65E5\u51FA\u52E4"&&!e.attendance?.checkIn&&!e.attendance?.checkOut&&!e.site&&!e.work&&(S="\u4F11\u65E5");const E=S?m(S):p,F=String(e.site||"").trim()?m(String(e.site).trim()):p,M=String(e.work||"").trim()?m(String(e.work).trim()).replace(/\n/g,"<br>"):p,et=e.attendance?.checkIn?m(W(e.attendance.checkIn)):p,pt=e.attendance?.checkOut?m(W(e.attendance.checkOut)):p,ct=dt(e.workType)!=="\u2014"?m(dt(e.workType)):p,mt=e.employeeCode||`EMP${String(e.userId).padStart(3,"0")}`,bt=String(e.departmentName||"").trim()?m(String(e.departmentName).trim()):p,ft=String(e.branchName||"").trim()?m(String(e.branchName).trim()):p,L=Dt(e.weekday),Ct=e.date?e.date.replace(/-/g,"/"):"",P=!!e.holiday&&e.weekday!=="\u571F"&&e.weekday!=="\u65E5",ot=L==="wr-dow-sun"?"color:#ef4444; background:#fef2f2;":L==="wr-dow-sat"?"color:#d97706; background:#fffbeb;":P?"color:#ef4444; background:#fef2f2;":"color:#64748b;",ht=Number(e.lateMinutes)>0?`<span style="color:#ef4444;font-weight:bold;">\u26A0 \u9045\u523B ${X(e.lateMinutes)}</span>`:"",_=Number(e.earlyMinutes)>0?`<span style="color:#ef4444;font-weight:bold;">\u26A0 \u65E9\u9000 ${X(e.earlyMinutes)}</span>`:"";let _t=[ht,_].filter(Boolean).join("<br>");const gt=[e.notes].filter(Boolean).join(" - "),Tt=_t||"",wt="",x=L==="wr-dow-sun"||P?"color:#ef4444;":L==="wr-dow-sat"?"color:#d97706;":"",ut=L==="wr-dow-sun"||P?"wr-off-row":L==="wr-dow-sat"?"wr-sat-row":"",q=o>0?r.items[o-1]:null,v=q&&q.date===e.date&&q.userId===e.userId;let $="";if(!v){let zt=1;for(let st=o+1;st<r.items.length&&(r.items[st].date===e.date&&r.items[st].userId===e.userId);st++)zt++;$=zt>1?` rowspan="${zt}"`:""}const z="vertical-align: middle;",rt=v?"":`<td data-label="\u65E5\u4ED8" class="${L}" style="text-align:center; font-weight:600; ${z} ${ot}"${$}>${m(Ct)}</td>`,xt=v?"":`<td data-label="\u66DC" class="${L}" style="text-align:center; font-weight:600; ${z} ${ot}"${$}>${m(P?"\u795D":e.weekday||"")}</td>`,yt=v?"":`<td data-label="\u793E\u54E1\u756A\u53F7" class="group-hide" style="white-space:nowrap; ${z} ${x}"${$}>${m(mt)}</td>`,nt=v?"":`<td data-label="\u6C0F\u540D" class="group-hide" style="font-weight:500; white-space:nowrap; ${z} ${x}"${$}>${m(e.username||"")}</td>`,kt=v?"":`<td data-label="\u90E8\u7F72" class="group-hide" style="white-space:nowrap; ${z} ${x}"${$}>${bt}</td>`,it=v?"":`<td data-label="\u652F\u5E97" class="group-hide" style="white-space:nowrap; ${z} ${x}"${$}>${ft}</td>`,vt=v?"":`<td data-label="\u52E4\u52D9\u533A\u5206" style="${z} ${x}"${$}>${E}</td>`,$t=v?"":`<td data-label="\u52E4\u52D9\u5F62\u614B" style="${z} ${x}"${$}>${ct}</td>`,St=v?"":`<td data-label="\u9045\u523B\u30FB\u65E9\u9000\u7B49" style="white-space:nowrap; ${z} ${x}"${$}>${Tt}</td>`,Mt=v?"":`<td data-label="\u5099\u8003" style="white-space:pre-wrap; word-break:break-word; min-width:150px; max-width:300px; ${z} ${x||"color:#475569;"}"${$}>${gt?m(gt):p}</td>`,at=v?"":`<td data-label="\u72B6\u614B" style="${z}"${$}><span class="dash-pill" style="${w.style}; white-space:nowrap;">${m(w.label)}</span></td>`;return`
        <tr class="${ut}" style="${wt} ${x}">
          ${rt}
          ${xt}
          ${yt}
          ${nt}
          ${kt}
          ${it}
          ${vt}
          <td data-label="\u51FA\u52E4" style="font-family:monospace; font-size:14px; ${x}">${et}</td>
          <td data-label="\u9000\u52E4" style="font-family:monospace; font-size:14px; ${x}">${pt}</td>
          ${$t}
          <td data-label="\u73FE\u5834" class="wr-site-td" style="${x}">${F}</td>
          <td data-label="\u4F5C\u696D\u5185\u5BB9" class="wr-work-td" onclick="this.classList.toggle('wr-expanded')" style="${x}"><div class="wr-work-preview">${M}</div></td>
          ${St}
          ${Mt}
          ${at}
        </tr>
      `}).join("");return`
        <div style="margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding-bottom:12px;border-bottom:2px solid #e2e8f0;margin-bottom:12px;">
            <div style="font-weight:800;color:#0f172a;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span style="background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:13px;color:#475569;">${m(r.employeeCode)}</span>
              ${m(r.username)} 
              <span style="color:#64748b;font-weight:600;font-size:14px;margin-left:4px;">${m(r.departmentName)}</span>
            </div>
            ${b}
          </div>
          <div class="wr-table-container" style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);background:#fff;padding-bottom:12px;">
            <table class="wr-table" style="min-width:1400px; width:100%; table-layout:fixed;">
              <colgroup>
                <col style="width:110px;">
                <col style="width:50px;">
                <col class="group-hide" style="width:110px;">
                <col class="group-hide" style="width:120px;">
                <col class="group-hide" style="width:140px;">
                <col class="group-hide" style="width:100px;">
                <col style="width:100px;">
                <col style="width:70px;">
                <col style="width:70px;">
                <col style="width:110px;">
                <col style="width:140px;">
                <col style="width:360px;">
                <col style="width:180px;">
                <col style="width:200px;">
                <col style="width:180px;">
              </colgroup>
              <thead>
                <tr style="background:#e6f2ff; color:#0f172a; height:30px;">
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u65E5\u4ED8</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u66DC</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u793E\u54E1\u756A\u53F7</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u6C0F\u540D</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u90E8\u7F72</th>
                  <th class="group-hide" style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u652F\u5E97</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u52E4\u52D9\u533A\u5206</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u51FA\u52E4</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u9000\u52E4</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u52E4\u52D9\u5F62\u614B</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1; width:140px;">\u73FE\u5834</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1; width:360px;">\u4F5C\u696D\u5185\u5BB9</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u9045\u523B\u30FB\u65E9\u9000\u7B49</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u5099\u8003</th>
                  <th style="padding:4px 8px; font-size:13px; font-weight:600; text-align:center; border:1px solid #cbd5e1;">\u72B6\u614B</th>
                </tr>
              </thead>
              <tbody>${f}</tbody>
            </table>
          </div>
        </div>
      `}).join("");a.innerHTML=s},Ot=t=>{const a=c("#wrDept");if(!a)return;const n=Array.from(new Set((t||[]).map(s=>String(s?.departmentName||"").trim()).filter(Boolean))).sort((s,r)=>y(s,r)),l=['<option value="">\u5168\u90E8\u7F72</option>'].concat(n.map(s=>`<option value="${m(s)}" ${C(s)===C(i.dept)?"selected":""}>${m(s)}</option>`)).join("");a.innerHTML=l},Rt=t=>{const a=Array.isArray(t?.items)?t.items:[],n=t?.summary||{};return{summary:{employees:n.employees==null?0:n.employees,workedDays:n.workedDays==null?a.length:n.workedDays,submitted:n.submitted==null?0:n.submitted,missing:n.missing==null?0:n.missing},items:a}},Ut=t=>{const a=new Date(Date.now()+324e5).toISOString().slice(0,10),n=Array.isArray(t?.days)?t.days:[],l=Array.isArray(t?.items)?t.items:[],s=[],r=new Set;let b=0,f=0;for(const e of l){const o=e?.userId,p=e?.days||{};for(const h of n){const w=p?.[h]||null,u=String(w?.status||"");if(u!=="checked_out"&&u!=="working"&&u!=="holiday_work"&&u!=="holiday_working"&&u!=="not_checked_in")continue;const S=w?.report||null,E=String(S?.site||"").trim()||null,F=String(S?.work||"").trim()||null;let M=u;u==="not_checked_in"?M="not_checked_in":u==="checked_out"||u==="holiday_work"?M=E||F?"submitted":"missing":(u==="working"||u==="holiday_working")&&(M=String(h).slice(0,10)<a?E||F?"checkout_missing_submitted":"checkout_missing":"working"),M==="submitted"||M==="checkout_missing_submitted"?b++:(M==="missing"||M==="checkout_missing"||M==="not_checked_in")&&f++,r.add(o),s.push({userId:o,employeeCode:e?.employeeCode||null,username:e?.username||null,departmentId:e?.departmentId||null,departmentName:e?.departmentName||null,date:String(h).slice(0,10),weekday:Vt(h),attendance:{checkIn:null,checkOut:null},kubun:w?.kubun||null,workType:null,holiday:w?.holiday||!1,site:E,work:F,status:M})}}return s.sort((e,o)=>{if(e.date!==o.date)return e.date<o.date?1:-1;const p=String(e.employeeCode||"").toUpperCase(),h=String(o.employeeCode||"").toUpperCase();return p!==h?p<h?-1:1:Number(e.userId||0)-Number(o.userId||0)}),{summary:{employees:r.size,workedDays:s.length,submitted:b,missing:f},items:s}},N=async()=>{const _mpv=_wrPickerDesktop?.getValue()||_wrPickerMobile?.getValue();i.month=j(_mpv)?_mpv:i.month||J,U(),Yt();try{let a=null;try{a=await Nt(`/api/admin/work-reports/month/list?month=${encodeURIComponent(i.month)}`),a=Rt(a)}catch(b){const f=String(b?.message||"");if(f.includes("Invalid userId")||f.includes("404")||f.includes("Not Found")){const e=await Nt(`/api/admin/work-reports/month?month=${encodeURIComponent(i.month)}`);a=Ut(e)}else throw b}const n=c("#wrSummary");i.items=Array.isArray(a?.items)?a.items:[],Ot(i.items);const l=a?.summary||{},s=A(i.items).length;n&&(n.innerHTML=`
          <div style="display:flex; align-items:center; gap:12px; font-size:14px; background:#f8fafc; padding:4px 12px; border-radius:6px; border:1px solid #e2e8f0; height:32px; box-sizing:border-box;">
            <span style="color:#0f172a; font-weight:600;"><span style="color:#64748b; font-weight:500; margin-right:4px;">\u51FA\u52E4</span>${l.workedDays==null?0:l.workedDays}</span>
            <span style="color:#0f172a; font-weight:600;"><span style="color:#64748b; font-weight:500; margin-right:4px;">\u63D0\u51FA</span>${l.submitted==null?0:l.submitted}</span>
            <span style="color:#e11d48; font-weight:600;"><span style="color:#f43f5e; font-weight:500; margin-right:4px;">\u672A\u63D0\u51FA</span>${l.missing==null?0:l.missing}</span>
          </div>
        `);
        const r = A(i.items);
        if (i.group) Q(r); else D(r, true);
      } catch (a) {
        const n = c("#wrTable");
        if (n) {
          n.innerHTML = `<div class="empty-state"><div style="font-size:28px;">\u26A0\uFE0F</div><div>\u8AAD\u307F\u8FBC\u307F\u5931\u6557: ${m(a && a.message ? a.message : "unknown")}</div></div>`;
        }
      } finally {
        Kt();
      }
    };

    window.addEventListener("resize", () => {
      const t = document.getElementById("attHubMobileActions");
      if (window.innerWidth <= 768 && t) {
        if (document.getElementById("wrMonthMobileHeaderSlot") || document.getElementById("wrMonthMobileHeaderSlot2")) {
          if (_wrPickerMobHdr) _wrPickerMobHdr.setValue(i.month);
          if (_wrPickerMobHdr2) _wrPickerMobHdr2.setValue(i.month);
          const qm = document.getElementById("wrQueryMobileHeader");
          if (qm) qm.value = i.q;
        } else {
          t.style.flex = "1";
          t.style.marginLeft = "8px";
          t.innerHTML = `
          <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content: space-between;">
            <input id="wrQueryMobileHeader" type="text" placeholder="\u691C\u7D22..." value="${m(i.q)}" style="flex: 1; min-width: 60px; height: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; padding: 0 6px 0 24px; font-size: 13px; background: #fff url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%2364748b\\'%3E%3Cpath stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\\'%3E%3C/path%3E%3C/svg%3E') no-repeat 6px center / 14px; color: #1f2937; outline: none; margin: 0;">
            <div style="display:flex; align-items:center; gap:6px; flex-shrink: 0;">
              <span id="wrMonthMobileHeaderSlot"></span>
              <button type="button" id="wrFilterToggleHeader" style="height: 32px; width: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; background: #fff; display: flex; align-items: center; justify-content: center; padding: 0; color: #475569; cursor: pointer; margin: 0; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              </button>
            </div>
          </div>
        `;
          document.getElementById("wrQueryMobileHeader").addEventListener("change", async r => {
            i.q = r.target.value;
            const b = c("#wrQuery");
            if (b) b.value = i.q;
            await N();
          });
          const l = document.getElementById("wrFilterToggleHeader");
          const s = c("#wrAdvancedFilters");
          l.addEventListener("click", () => {
            if (s) s.classList.toggle("show");
            l.classList.toggle("active");
            if (l.classList.contains("active")) {
              l.style.background = "#f1f5f9";
              l.style.borderColor = "#94a3b8";
              l.style.color = "#0f172a";
            } else {
              l.style.background = "#fff";
              l.style.borderColor = "#cbd5e1";
              l.style.color = "#475569";
            }
          });
        }
      } else {
        if (t) {
          t.innerHTML = "";
        }
      }
    });

    const It = (t, a) => {
      const n = /^(\d{4})-(\d{2})$/.exec(String(t || ""));
      return n ? new Date(Date.UTC(parseInt(n[1], 10), parseInt(n[2], 10) - 1 + a, 1)).toISOString().slice(0, 7) : t;
    };

    const Et = async t => {
      if (!j(t)) return;
      i.month = t;
      if (_wrPickerDesktop) _wrPickerDesktop.setValue(t);
      if (_wrPickerMobile) _wrPickerMobile.setValue(t);
      if (_wrPickerMobHdr) _wrPickerMobHdr.setValue(t);
      if (_wrPickerMobHdr2) _wrPickerMobHdr2.setValue(t);
      await N();
    };

    let _wrPickerDesktop = null,
        _wrPickerMobile = null,
        _wrPickerMobHdr = null,
        _wrPickerMobHdr2 = null;
    const _wrDesktopSlot = document.getElementById("wrMonthSlot");
    const _wrMobileSlot = document.getElementById("wrMonthMobileSlot");
    const _wrMobHdrSlot = document.getElementById("wrMonthMobileHeaderSlot");
    const _wrMobHdrSlot2 = document.getElementById("wrMonthMobileHeaderSlot2");
    const _mpOnChange = async t => { await Et(t); };

    if (_wrDesktopSlot) {
      _wrPickerDesktop = _createMonthPicker({ value: i.month, onChange: _mpOnChange });
      if (_wrPickerDesktop.el?.classList && _wrPickerDesktop.el?.className) {
        _wrPickerDesktop.el.className += " hidden-on-mobile";
      }
      _wrDesktopSlot.replaceWith(_wrPickerDesktop.el);
    }
    if (_wrMobileSlot) {
      _wrPickerMobile = _createMonthPicker({ value: i.month, onChange: _mpOnChange });
      _wrPickerMobile.el.className += " hidden-on-desktop";
      _wrMobileSlot.replaceWith(_wrPickerMobile.el);
    }
    if (_wrMobHdrSlot) {
      _wrPickerMobHdr = _createMonthPicker({ value: i.month, onChange: _mpOnChange });
      _wrMobHdrSlot.replaceWith(_wrPickerMobHdr.el);
    }
    if (_wrMobHdrSlot2) {
      _wrPickerMobHdr2 = _createMonthPicker({ value: i.month, onChange: _mpOnChange });
      _wrMobHdrSlot2.replaceWith(_wrPickerMobHdr2.el);
    }

    c("#wrPrevMonthMobile")?.addEventListener("click", () => Et(It(i.month, -1)));
    c("#wrNextMonthMobile")?.addEventListener("click", () => Et(It(i.month, 1)));
    c("#wrFilterToggleMobile")?.addEventListener("click", () => {
      const t = c("#wrAdvancedFilters");
      const a = c("#wrFilterToggleMobile");
      if (t) t.classList.toggle("show");
      if (a) a.classList.toggle("active");
    });

    c("#wrExport")?.addEventListener("click", async () => {
      try {
        const a = `/api/admin/work-reports/export.xlsx?${new URLSearchParams({
          period: "month",
          month: i.month,
          sort: i.sort,
          dept: i.dept,
          q: i.q,
          group: i.group ? "1" : "0"
        }).toString()}`;
        await Wt(a, `work_reports_${i.month}.xlsx`);
      } catch (t) {
        alert(String(t?.message || "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
      }
    });

    c("#wrExportPdf")?.addEventListener("click", async () => {
      const btn = document.getElementById("wrExportPdf");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "\u51FA\u529B\u4E2D...";
      }
      try {
        const a = `/api/admin/work-reports/export.pdf?${new URLSearchParams({
          period: "month",
          month: i.month,
          sort: i.sort,
          dept: i.dept,
          q: i.q,
          group: i.group ? "1" : "0"
        }).toString()}`;
        const resp = await fetch(a, { credentials: "include" });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.message || `HTTP ${resp.status}`);
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const lnk = document.createElement("a");
        lnk.href = url;
        lnk.download = `work_reports_${i.month}.pdf`;
        document.body.appendChild(lnk);
        lnk.click();
        document.body.removeChild(lnk);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (t) {
        alert(String(t?.message || "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h1a2 2 0 0 1 0 4H9v-4z"/></svg> PDF\u51FA\u529B';
        }
      }
    });

    // ── 社員を選択してPDF/Excel出力モーダル ──────────────────────────────
    let _wrPdfSelPicker = null;
    let _wrPdfSelUsers = [];
    let _wrPdfSelChecked = new Set();
    let _wrPdfSelSearch = '';
    let _wrPdfSelFormat = 'pdf';

    function _wrBuildPdfSelList() {
      const listEl = document.getElementById('wrPdfSelectList');
      const cntEl = document.getElementById('wrPdfSelectCount');
      const runBtn = document.getElementById('wrPdfSelectRun');
      if (!listEl) return;
      const q = _wrPdfSelSearch.trim().toLowerCase();
      const filtered = _wrPdfSelUsers.filter(u => {
        if (!q) return true;
        return (
          (u.employeeCode || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.departmentName || '').toLowerCase().includes(q)
        );
      });
      if (!filtered.length) {
        listEl.innerHTML = `<div style="padding:40px 16px;text-align:center;color:#94a3b8;font-size:13px;">該当する社員がいません</div>`;
      } else {
        listEl.innerHTML = filtered.map(u => {
          const cid = `wrpsel_${u.userId}`;
          const chk = _wrPdfSelChecked.has(u.userId) ? 'checked' : '';
          return `
            <label for="${cid}" style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;cursor:pointer;transition:background .12s;margin:1px 0;">
              <input type="checkbox" id="${cid}" class="wr-psel-cb" data-uid="${u.userId}" ${chk} style="width:16px;height:16px;flex-shrink:0;">
              <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:#475569;">${m(u.employeeCode || `EMP${String(u.userId).padStart(3,'0')}`)}</span>
                  <span style="font-size:13px;font-weight:600;color:#0f172a;">${m(u.username || '')}</span>
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${m(u.departmentName || '')}${u.branchName ? ` / ${m(u.branchName)}` : ''}</div>
              </div>
            </label>`;
        }).join('');
        listEl.querySelectorAll('.wr-psel-cb').forEach(cb => {
          cb.addEventListener('change', ev => {
            const uid = parseInt(ev.target.dataset.uid, 10);
            if (ev.target.checked) _wrPdfSelChecked.add(uid); else _wrPdfSelChecked.delete(uid);
            _wrUpdatePdfSelCount();
          });
        });
        listEl.querySelectorAll('label').forEach(lab => {
          lab.addEventListener('mouseenter', () => { lab.style.background = '#f8fafc'; });
          lab.addEventListener('mouseleave', () => { lab.style.background = ''; });
        });
      }
      _wrUpdatePdfSelCount();
    }

    function _wrUpdatePdfSelCount() {
      const cntEl = document.getElementById('wrPdfSelectCount');
      const runBtn = document.getElementById('wrPdfSelectRun');
      const n = _wrPdfSelChecked.size;
      if (cntEl) cntEl.textContent = `${n} 名選択中`;
      if (runBtn) {
        if (n > 0) {
          runBtn.disabled = false;
          runBtn.style.opacity = '1';
          runBtn.style.cursor = 'pointer';
          runBtn.style.background = '#991b1b';
        } else {
          runBtn.disabled = true;
          runBtn.style.opacity = '0.6';
          runBtn.style.cursor = 'not-allowed';
        }
      }
    }

    async function _wrOpenPdfSelModal() {
      const md = document.getElementById('wrPdfSelectModal');
      if (!md) return;
      md.style.display = 'flex';
      if (!_wrPdfSelPicker) {
        const slot = document.getElementById('wrPdfSelectMonthSlot');
        if (slot) {
          _wrPdfSelPicker = _createMonthPicker({ value: i.month, onChange: async v => { if (_wrPdfSelPicker) _wrPdfSelPicker.setValue(v); } });
          slot.replaceWith(_wrPdfSelPicker.el);
        }
      } else {
        _wrPdfSelPicker.setValue(i.month);
      }
      _wrPdfSelChecked = new Set();
      _wrPdfSelSearch = '';
      const sch = document.getElementById('wrPdfSelectSearch');
      if (sch) sch.value = '';
      const listEl = document.getElementById('wrPdfSelectList');
      if (listEl) listEl.innerHTML = `<div style="padding:40px 16px;text-align:center;color:#64748b;font-size:13px;">読み込み中...</div>`;
      try {
        const r = await Nt(`/api/admin/users?employmentStatus=active&role=employee&limit=5000`);
        const rows = Array.isArray(r?.rows) ? r.rows : (Array.isArray(r) ? r : []);
        const _isEmployeeRole = u => {
          const rl = String(u?.role || u?.roleName || '').trim().toLowerCase();
          if (!rl) return true;
          if (rl === 'employee' || rl === '3') return true;
          if (['admin','manager','sysadmin','super_admin','super','owner','payroll'].includes(rl)) return false;
          return true;
        };
        _wrPdfSelUsers = rows.filter(u => _isEmployeeRole(u)).map(u => {
          const uid = Number(u.id ?? u.userId ?? 0);
          return {
            userId: uid,
            employeeCode: String(u.employeeCode || u.employee_code || `EMP${String(uid).padStart(3,'0')}`),
            username: String(u.username || u.name || ''),
            departmentName: String(u.departmentName || u.department_name || u.department || ''),
            branchName: String(u.branchName || u.branch_name || u.branch || '')
          };
        }).filter(u => u.userId > 0).sort((a,b) => (a.employeeCode||'').localeCompare(b.employeeCode||'') || a.userId - b.userId);
        if (!_wrPdfSelUsers.length) {
          if (listEl) listEl.innerHTML = `<div style="padding:40px 16px;text-align:center;color:#94a3b8;font-size:13px;">有効な社員がいません</div>`;
          return;
        }
      } catch (err) {
        const _isEmployeeRole = u => {
          const rl = String(u?.role || '').trim().toLowerCase();
          if (!rl) return true;
          return !['admin','manager','sysadmin','super_admin','super','owner','payroll'].includes(rl);
        };
        _wrPdfSelUsers = Array.from(new Map((i.items || []).filter(r => _isEmployeeRole(r)).map(r => {
          const uid = Number(r.userId);
          return [uid, {
            userId: uid,
            employeeCode: r.employeeCode || `EMP${String(uid).padStart(3,'0')}`,
            username: r.username || '',
            departmentName: r.departmentName || '',
            branchName: r.branchName || ''
          }];
        })).values()).sort((a,b) => (a.employeeCode||'').localeCompare(b.employeeCode||'') || a.userId - b.userId);
      }
      _wrBuildPdfSelList();
    }
    function _wrClosePdfSelModal() { const md = document.getElementById('wrPdfSelectModal'); if (md) md.style.display = 'none'; }

    c("#wrExportPdfSelect")?.addEventListener("click", () => { _wrSetSelFormat('pdf'); _wrOpenPdfSelModal(); });
    c("#wrExportPdfSelectMobile")?.addEventListener("click", () => { _wrSetSelFormat('pdf'); _wrOpenPdfSelModal(); });
    c("#wrExport")?.addEventListener("click", async () => {
      const withSel = !!(window.event && window.event.detail === 999);
      if (withSel) { _wrSetSelFormat('xlsx'); _wrOpenPdfSelModal(); return; }
      _wrSetSelFormat('xlsx'); _wrOpenPdfSelModal(); return;
    });
    c("#wrExportMobile")?.addEventListener("click", () => { _wrSetSelFormat('xlsx'); _wrOpenPdfSelModal(); });
    c("#wrPdfSelectClose")?.addEventListener("click", () => _wrClosePdfSelModal());
    c("#wrPdfSelectCancel")?.addEventListener("click", () => _wrClosePdfSelModal());
    document.getElementById("wrPdfSelectModal")?.addEventListener("click", ev => { if (ev.target.id === "wrPdfSelectModal") _wrClosePdfSelModal(); });
    c("#wrPdfSelectSearch")?.addEventListener("input", ev => { _wrPdfSelSearch = ev.target.value; _wrBuildPdfSelList(); });
    c("#wrPdfSelectAll")?.addEventListener("click", () => {
      const q = _wrPdfSelSearch.trim().toLowerCase();
      _wrPdfSelUsers.forEach(u => {
        if (q && !( (u.employeeCode||'').toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q) || (u.departmentName||'').toLowerCase().includes(q) )) return;
        _wrPdfSelChecked.add(u.userId);
      });
      _wrBuildPdfSelList();
    });
    c("#wrPdfClearAll")?.addEventListener("click", () => { _wrPdfSelChecked.clear(); _wrBuildPdfSelList(); });

    function _wrSetSelFormat(fmt) {
      _wrPdfSelFormat = String(fmt || 'pdf').toLowerCase() === 'xlsx' ? 'xlsx' : 'pdf';
      const titleEl = document.getElementById('wrPdfSelTitle');
      const subEl = document.getElementById('wrPdfSelSubtitle');
      const runBtn = document.getElementById('wrPdfSelectRun');
      const runText = document.getElementById('wrPdfSelRunText');
      const runIcon = document.getElementById('wrPdfSelRunIcon');
      if (titleEl) titleEl.textContent = _wrPdfSelFormat === 'xlsx' ? '社員を選択してExcelを出力' : '社員を選択してPDFを出力';
      if (subEl) subEl.textContent = _wrPdfSelFormat === 'xlsx' ? '月を選び、出力する社員にチェックを入れてください' : '月を選び、出力する社員にチェックを入れてください';
      if (runText) runText.textContent = _wrPdfSelFormat === 'xlsx' ? 'Excel出力実行' : 'PDF出力実行';
      if (runBtn) {
        if (_wrPdfSelFormat === 'xlsx') {
          runBtn.style.background = '#1d4ed8';
        } else {
          runBtn.style.background = '#991b1b';
        }
      }
      if (runIcon) {
        if (_wrPdfSelFormat === 'xlsx') {
          runIcon.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M14 13l-4 4-4-4"/><polyline points="10 9 10 17 10 9"/>';
        } else {
          runIcon.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h1a2 2 0 0 1 0 4H9v-4z"/>';
        }
      }
    }

    c("#wrPdfSelectRun")?.addEventListener("click", async () => {
      const runBtn = document.getElementById("wrPdfSelectRun");
      const uids = Array.from(_wrPdfSelChecked).sort((a,b) => a-b);
      if (!uids.length) return;
      const pm = _wrPdfSelPicker ? _wrPdfSelPicker.getValue() : i.month;
      const orig = runBtn.innerHTML;
      try {
        runBtn.disabled = true; runBtn.style.opacity = '0.7';
        const runText = document.getElementById('wrPdfSelRunText');
        if (runText) runText.textContent = '出力中...';
        const isXlsx = _wrPdfSelFormat === 'xlsx';
        const endpoint = isXlsx ? '/api/admin/work-reports/export.xlsx' : '/api/admin/work-reports/export.pdf';
        const qp = new URLSearchParams({
          period: 'month', month: pm, sort: 'employee', dept: '', q: '', group: '1', userIds: uids.join(',')
        }).toString();
        const a = `${endpoint}?${qp}`;
        // ファイル名: 月_社員コード_氏名 (1名) または 月_N名 (複数)
        const selUsers = _wrPdfSelUsers.filter(u => _wrPdfSelChecked.has(u.userId));
        const fileSuffix = selUsers.length === 1
          ? `${selUsers[0].employeeCode || selUsers[0].userId}_${(selUsers[0].username||'').replace(/[\\/:*?"<>|]/g,'_')}`
          : `${selUsers.length}名`;
        const ext = isXlsx ? 'xlsx' : 'pdf';
        const dlName = `work_reports_${pm}_${fileSuffix}.${ext}`;
        if (isXlsx) {
          const lnk = document.createElement('a');
          lnk.href = a;
          lnk.download = dlName;
          document.body.appendChild(lnk); lnk.click(); document.body.removeChild(lnk);
          setTimeout(() => _wrClosePdfSelModal(), 600);
        } else {
          const resp = await fetch(a, { credentials: 'include' });
          if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.message || `HTTP ${resp.status}`); }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const lnk = document.createElement('a');
          lnk.href = url;
          lnk.download = dlName;
          document.body.appendChild(lnk); lnk.click(); document.body.removeChild(lnk);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          _wrClosePdfSelModal();
        }
      } catch (t) {
        alert(String(t?.message || 'エクスポートに失敗しました'));
      } finally {
        runBtn.disabled = false; runBtn.style.opacity = ''; runBtn.innerHTML = orig;
        _wrUpdatePdfSelCount();
      }
    });

    const Lt = c("#wrAdvancedFilters");
    const B = document.getElementById("attHubMobileActions");

    if (window.innerWidth <= 768 && B) {
      B.style.flex = "1";
      B.style.marginLeft = "8px";
      B.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; width:100%; justify-content: space-between;">
        <input id="wrQueryMobileHeader" type="text" placeholder="\u691C\u7D22..." value="${m(i.q)}" style="flex: 1; min-width: 60px; height: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; padding: 0 6px 0 24px; font-size: 13px; background: #fff url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%2364748b\\'%3E%3Cpath stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\\'%3E%3C/path%3E%3C/svg%3E') no-repeat 6px center / 14px; color: #1f2937; outline: none; margin: 0;">
        <div style="display:flex; align-items:center; gap:6px; flex-shrink: 0;">
          <span id="wrMonthMobileHeaderSlot2"></span>
          <button type="button" id="wrFilterToggleHeader" style="height: 32px; width: 32px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; background: #fff; display: flex; align-items: center; justify-content: center; padding: 0; color: #475569; cursor: pointer; margin: 0; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
        </div>
      </div>
    `;
        document.getElementById("wrQueryMobileHeader").addEventListener("change", async l => {
          i.q = l.target.value;
          const s = c("#wrQuery");
          if (s) s.value = i.q;
          await N();
        });
        const n = document.getElementById("wrFilterToggleHeader");
        n.addEventListener("click", () => {
          if (Lt) Lt.classList.toggle("show");
          n.classList.toggle("active");
          if (n.classList.contains("active")) {
            n.style.background = "#f1f5f9";
            n.style.borderColor = "#94a3b8";
            n.style.color = "#0f172a";
          } else {
            n.style.background = "#fff";
            n.style.borderColor = "#cbd5e1";
            n.style.color = "#475569";
          }
        });
      } else if (B) {
        B.innerHTML = "";
      }

      c("#wrSort")?.addEventListener("change", async () => {
        const t = c("#wrSort");
        i.sort = String(t?.value || "dateDesc");
        U();
        const a = A(i.items);
        if (i.group) Q(a); else D(a, true);
      });

      c("#wrDept")?.addEventListener("change", async () => {
        const t = c("#wrDept");
        i.dept = String(t?.value || "");
        U();
        const a = A(i.items);
        if (i.group) Q(a); else D(a, true);
      });

      c("#wrQuery")?.addEventListener("input", async () => {
        const t = c("#wrQuery");
        i.q = String(t?.value || "");
        U();
        const a = A(i.items);
        if (i.group) Q(a); else D(a, true);
      });

      c("#wrGroup")?.addEventListener("change", async () => {
        const t = c("#wrGroup");
        i.group = !!(t?.checked);
        U();
        const a = A(i.items);
        if (i.group) Q(a); else D(a, true);
      });

      await N();
    }

    export { ee as mount };
