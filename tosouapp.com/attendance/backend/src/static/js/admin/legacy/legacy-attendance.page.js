import{escapeHtml as b,delegate as Ut}from"../_shared/dom.js";import{api as ut,downloadWithAuth as Q}from"../../shared/api/client.js";import{createPage as Yt}from"../../shared/page/createPage.js";import{createCleanup as jt}from"../../shared/page/createCleanup.js";async function Gt(v){return await gt(v)}async function gt({content:v,listUsers:Z,getTimesheet:ht,getAttendanceDay:yt,updateAttendanceSegment:_t,buildTimesheetExportURL:tt}){const _=jt();let M=!0;const et=new AbortController,P=et.signal;_.add(()=>{M=!1}),_.add(()=>et.abort());let ot=[];try{if(!window.location.pathname.includes("/ui/attendance-records")&&typeof Z=="function"){const t=await Z({signal:P});ot=Array.isArray(t)?t:t&&Array.isArray(t.rows)?t.rows:[]}}catch(o){console.warn("Could not fetch users for dropdown:",o)}v.innerHTML="";const rt=o=>{if(!o)return"";const t=String(o);return t.length>=16?t.slice(11,16):t},wt=o=>{try{const t=String(o||"").slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return!1;const[n,i,e]=t.split("-").map(l=>parseInt(l,10)),a=new Date(Date.UTC(n,i-1,e)).getUTCDay();return a===0||a===6}catch{return!1}},T=new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10),vt=T.slice(0,7),nt=new URLSearchParams(window.location.search).get("standalone")==="1"||window.location.pathname.includes("/ui/attendance-records");if(nt)try{const o=document.querySelector(".topbar"),t=document.querySelector(".subbar");o&&(o.style.display="none"),t&&(t.style.display="none");const n=document.querySelector("#adminChrome");n&&(n.style.display="none"),document.body.style.paddingTop="0";const i=document.documentElement;i.style.setProperty("--topbar-height","0px"),i.style.setProperty("--subbar-height","0px")}catch{}const Ot=nt?"100vh":"calc(100vh - var(--topbar-height) - var(--subbar-height))",y=document.createElement("div");y.style.cssText="margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column;",y.innerHTML=`
    <style>
      
        
      .attrec-fiori-override {
        height: auto !important;
        overflow: visible !important;
      }
      .attrec-fiori-override .dash-card-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        letter-spacing: -0.01em;
        margin: 0 !important;
      }
      .attrec-fiori-override.dash-card {
        background: #ffffff !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 16px 24px !important;
        margin: 0 !important;
        box-sizing: border-box;
      }
      .attrec-fiori-override .attrec-head {
        padding: 0 0 8px 0 !important;
        border-bottom: none !important;
      }
      .attrec-fiori-override .attrec-controls {
        padding: 0 !important;
        gap: 8px !important;
        margin-top: 0 !important;
      }
      .attrec-fiori-override .attrec-control {
        gap: 8px !important;
      }
      .attrec-fiori-override .mobile-row {
        display: contents; /* On desktop, act as if it's not there */
      }
      .attrec-fiori-override .attrec-input,
      .attrec-fiori-override .attrec-btn {
        height: 30px !important;
        font-size: 13px !important;
        padding: 0 10px !important;
        border-radius: 0 !important;
      }
      .attrec-fiori-override .attrec-table {
        margin: 0 !important;
        padding: 0 0 24px 0 !important;
        border-top: none !important;
        max-height: none !important;
        border: none !important;
      }
      .attrec-fiori-override .attrec-dash-table th {
        padding: 6px 12px !important;
        font-size: 12px !important;
        background: #f8fafc !important;
        color: #475569 !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .attrec-fiori-override .attrec-dash-table td {
        padding: 6px 12px !important;
        font-size: 13px !important;
        vertical-align: middle !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .attrec-fiori-override .attrec-pill {
        font-size: 14px !important;
        padding: 4px 10px !important;
        border-radius: 0 !important;
      }
      .attrec-fiori-override .attrec-summary {
        gap: 6px !important;
      }
      .attrec-fiori-override .attrec-pill {
        display: inline-block !important;
        margin-bottom: 4px !important;
      }
      
      /* Excel Dropdown Styles */
      .excel-dropdown-container {
        position: relative;
        display: inline-block;
      }
      .excel-dropdown-btn {
        display: flex !important;
        align-items: center;
        gap: 6px;
        background: #ffffff !important;
        color: #475569 !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        height: 34px !important;
        padding: 0 12px !important;
        border-radius: 0 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
      }
      .excel-dropdown-btn:hover {
        background: #f8fafc !important;
      }
      .excel-dropdown-btn::after {
        content: "\u25BC";
        font-size: 10px;
        margin-left: 4px;
      }
      .excel-dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background-color: white;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.1);
        z-index: 9999 !important; /* Ensure it is always on top */
        border-radius: 0;
        border: 1px solid #e2e8f0;
        overflow: visible !important; /* Fix cutoff issue */
        margin-top: 4px;
      }
      .excel-dropdown-menu.show {
        display: block;
      }
      .excel-dropdown-menu button {
        color: #334155;
        padding: 10px 16px;
        text-decoration: none;
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        font-size: 13px;
        cursor: pointer;
      }
      .excel-dropdown-menu button:last-child {
        border-bottom: none;
      }
      .excel-dropdown-menu button:hover {
        background-color: #f8fafc;
        color: #0f172a;
      }
      /* Responsive Hide/Show Classes */
      .mobile-only {
        display: none !important;
      }
      .attrec-emp-like-table td.desktop-only {
        display: table-cell !important;
      }
      
      /* Mobile responsive styles for legacy attendance page */
      @media (max-width: 768px) {
        .attrec-fiori-override.dash-card {
          padding: 8px 4px !important;
        }
        .desktop-only {
          display: none !important;
        }
        .attrec-emp-like-table td.mobile-only {
          display: block !important;
        }
        .attrec-emp-like-table td.m-code-cell.mobile-only {
          display: flex !important;
        }
        .attrec-emp-like-table td.m-main-cell.mobile-only {
          display: flex !important;
        }
        .attrec-emp-like-table td.desktop-only {
          display: none !important;
        }
        
        /* Sticky Pagination for Mobile */
        .attrec-mobile-pagination {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          background: #ffffff !important;
          padding: 12px 16px !important;
          box-shadow: none !important;
          z-index: 100 !important;
          border-top: 1px solid #e2e8f0 !important;
          margin-top: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        
        /* Add padding to the bottom of the table to prevent overlap with sticky pagination */
        .emp-list-scroll-wrap.attrec-list-scroll-wrap {
          padding-bottom: 60px !important;
        }

        .attrec-fiori-override .dash-card-title {
          display: none !important;
        }
        .attrec-fiori-override .attrec-head {
          padding: 8px 12px 4px 12px !important;
          border-bottom: none !important;
        }
        .attrec-fiori-override .attrec-summary {
          flex-wrap: wrap !important;
          gap: 4px !important;
        }
        .attrec-fiori-override .attrec-controls {
          flex-direction: column !important;
          gap: 12px !important;
          padding: 12px !important;
          background: transparent !important; /* Force transparent background */
          margin: 0 12px 12px 12px !important;
          border-radius: 8px !important;
          border: none !important; /* Remove border */
        }
        .attrec-fiori-override .attrec-control {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important; /* Increase gap between items on mobile */
          width: 100% !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
        }
        .attrec-fiori-override .mobile-row {
          display: flex !important;
          gap: 6px !important;
          width: 100% !important;
          align-items: center !important;
        }
        .attrec-fiori-override .attrec-label {
          display: none !important;
        }
        .attrec-fiori-override .attrec-control:nth-child(1) .mobile-row:nth-child(2)::before {
          content: "\u65E5";
          font-weight: 700 !important;
          color: #475569 !important;
          font-size: 13px !important;
          margin-right: 2px !important;
        }
        .attrec-fiori-override .attrec-control:nth-child(2) .mobile-row:nth-child(2)::before {
          content: "\u6708";
          font-weight: 700 !important;
          color: #475569 !important;
          font-size: 13px !important;
          margin-right: 2px !important;
        }
        .attrec-fiori-override .attrec-input {
          flex: 1 !important;
          height: 34px !important;
          font-size: 14px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 0 8px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .attrec-fiori-override .attrec-btn {
          flex: 1 !important;
          height: 34px !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          background: #ffffff !important;
          color: #475569 !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 4px !important;
        }
        
        /* Dropdown specific mobile styles */
        .attrec-fiori-override .excel-dropdown-container {
          width: 100% !important;
        }
        .attrec-fiori-override .excel-dropdown-btn {
          width: 100% !important;
          justify-content: space-between !important;
          padding: 0 12px !important;
          border: 1px solid #cbd5e1 !important; /* Ensure border exists on mobile */
          height: 34px !important;
        }
        .attrec-fiori-override .excel-dropdown-menu {
          width: 100% !important;
          left: 0 !important;
        }
        /* Removed #rosterLoad styles as the button is no longer used */
        .attrec-fiori-override .attrec-table {
          padding: 0 12px 12px 12px !important;
        }
        /* Improve mobile cards for table to exactly match employees page */
        .attrec-emp-like-table {
          display: block !important;
          background: transparent !important;
        }
        .attrec-emp-like-table thead {
          display: none !important;
        }
        .attrec-emp-like-table tbody {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          background: transparent !important;
        }
        .attrec-emp-like-table tr {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important; 
          overflow: hidden !important;
          margin-bottom: 0 !important; 
        }
        .attrec-emp-like-table td {
          display: block !important;
          padding: 0 !important; 
          border-bottom: none !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important; 
          text-align: left !important;
          min-height: auto !important;
        }
        .attrec-emp-like-table td::before {
          display: none !important;
        }
        .attrec-emp-like-table .m-code-cell {
          width: 90px !important;
          min-width: 90px !important;
          max-width: 90px !important;
          background: #f8fafc !important;
          border-right: 1px solid #e2e8f0 !important;
          padding: 12px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          box-sizing: border-box !important;
        }
        .attrec-emp-like-table .m-code-label {
          font-size: 11px !important;
          color: #64748b !important;
          margin-bottom: 4px !important;
        }
        .attrec-emp-like-table .m-code-value {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          word-break: break-all !important;
        }
        .attrec-emp-like-table .m-main-cell {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 12px 16px !important;
          background: #ffffff !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          gap: 12px !important;
        }
        .attrec-emp-like-table .m-line {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          width: 100% !important;
          font-size: 13px !important;
          line-height: 1.4 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-k {
          min-width: 70px !important;
          color: #64748b !important;
          flex-shrink: 0 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-v {
          color: #0f172a !important;
          word-break: break-word !important;
          flex: 1 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-v-name {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        /* Style pill tags inside mobile cards */
        .attrec-emp-like-table .m-v .attrec-pill {
          margin-bottom: 0 !important;
          font-size: 14px !important;
          font-weight: bold !important;
          padding: 4px 10px !important;
          border-radius: 4px !important;
        }
      }
     
      /* Overrided by AI for professional look */
      .attrec-fiori-override .attrec-dash-table th {
        padding: 12px 16px !important;
        font-size: 13px !important;
        background: #f8fafc !important;
        color: #334155 !important;
        border-bottom: 1px solid #e2e8f0 !important;
        font-weight: 700 !important;
      }
      .attrec-fiori-override .attrec-dash-table td {
        padding: 10px 16px !important;
        font-size: 13px !important;
        vertical-align: middle !important;
        border-bottom: 1px solid #e2e8f0 !important;
        color: #0f172a !important;
      }
    </style>
    <div class="dash-card attrec-fiori-override" style="height: auto; display: flex; flex-direction: column; overflow: visible !important;">
      <div class="attrec-controls" style="margin-bottom: 8px; flex-shrink: 0; padding: 0 !important; background: transparent !important; border: none !important; overflow: visible !important; display: none !important;">
      </div>
      <div class="attrec-head" style="display: none !important;">
        <div id="rosterSummary" class="attrec-summary" aria-live="polite" style="display: flex; gap: 8px; margin-bottom: 0; align-items: center; flex-wrap: wrap;"></div>
      </div>
      <div id="rosterTable" class="attrec-table" style="height: auto; overflow: visible; max-height: none !important; max-width: 100%;"></div>
    </div>
  `,v.appendChild(y);const it=document.getElementById("attHubMobileActions");window.innerWidth<=768&&it&&(it.innerHTML=`
      <div style="display:flex; align-items:center; gap:8px;">
        <input id="rosterDateMobile" type="date" value="${b(T)}" style="height: 32px; padding: 0 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 120px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;">
      </div>
    `);const kt=`
        <div class="attrec-control hidden-on-mobile" style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100%; padding: 0 !important; gap: 12px; background: transparent !important; border: none !important; overflow: visible !important;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <input id="rosterDate" class="attrec-input" type="date" value="${b(T)}" style="width: 140px; border: 1px solid #cbd5e1; height: 34px; box-sizing: border-box; border-radius: 0;" />
            <div id="rosterSummaryInline" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"></div>
          </div>
          <div id="topRightFormContainer" style="display: flex; align-items: center; gap: 8px;"></div>
        </div>
  `,I=y.querySelector(".attrec-controls");I&&(I.innerHTML=kt),window.addEventListener("resize",()=>{const o=window.innerWidth<=768;I&&(I.style.display=o?"none":"block")}),I&&(I.style.display=window.innerWidth<=768?"none":"block");const at=o=>{},lt=async o=>{const t=y.querySelector("#rosterTable");t&&(t.innerHTML=`
        <div class="empty-state">
          <div style="font-size:28px;">\u23F3</div>
          <div>\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>
        </div>
      `),at(null);try{const n=await ut.get(`/api/admin/work-reports?date=${encodeURIComponent(o)}`,{signal:P});if(!M)return;const i=n&&Array.isArray(n.items)?n.items:[];if(at(n&&n.summary?n.summary:{}),!t)return;if(!i.length){t.innerHTML=`
          <div class="empty-state">
            <div style="font-size:28px;">\u{1F5C2}\uFE0F</div>
            <div>\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>
          </div>
        `;return}let e=1;const a=window.innerWidth<=768,l=a?30:10,c=()=>{if(!t)return;t.innerHTML="";const f=document.createElement("table");f.id="attrecList",f.className="beautiful-table",f.style.tableLayout="auto",f.style.width="100%",f.style.minWidth="1200px",f.style.borderCollapse="collapse",f.style.border="none",f.style.borderRadius="0",f.style.overflow="visible",f.innerHTML=`
          <style>
            .beautiful-table {
              box-shadow: none;
            }
            .beautiful-table thead {
              background-color: #e6f0fa;
            }
            .beautiful-table th {
              padding: 6px 8px;
              font-weight: 700;
              color: #1e293b;
              font-size: 13px;
              text-align: center;
              border: 1px solid #d1d5db;
              border-bottom: 2px solid #cbd5e1;
            }
            .beautiful-table td {
              padding: 4px 8px;
              font-size: 13px;
              color: #334155;
              border: 1px solid #d1d5db;
              vertical-align: middle;
            }
            .beautiful-table tbody tr:hover {
              background-color: #f8fafc;
            }
            .beautiful-table .attrec-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 2px 8px;
              border-radius: 0;
              font-size: 12px;
              font-weight: 500;
              background-color: #f1f5f9;
              color: #475569;
              border: 1px solid #e2e8f0;
            }
            .beautiful-table .attrec-pill.ok { background-color: #f0fdf4; color: #166534; border-color: #bbf7d0; }
            .beautiful-table .attrec-pill.warn { background-color: #fffbeb; color: #92400e; border-color: #fde68a; }
            .beautiful-table .attrec-pill.danger { background-color: #fef2f2; color: #991b1b; border-color: #fecaca; }
            
            /* Mobile Optimization (Card Layout) */
            @media (max-width: 768px) {
              .beautiful-table {
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
                min-width: 0 !important;
                display: block;
              }
              .beautiful-table thead {
                display: none;
              }
              .beautiful-table tbody {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }
              .beautiful-table tr {
                display: grid;
                grid-template-columns: 90px 1fr;
                grid-auto-rows: auto;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 0;
                padding: 0;
                box-shadow: none;
                position: relative;
              }
              
              /* Code (Left Column) */
              .beautiful-table td:nth-child(1) {
                grid-column: 1 / 2;
                grid-row: 1 / 10; /* Span across all rows */
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: flex-start;
                padding: 16px 12px;
                border: none;
                border-right: 1px solid #e2e8f0;
                background: #f8fafc;
                border-radius: 0;
                text-align: left !important;
              }
              .beautiful-table td:nth-child(1)::before {
                content: "\u793E\u54E1\u756A\u53F7";
                font-size: 11px;
                font-weight: 400;
                color: #64748b;
                margin-bottom: 4px;
                margin-right: 0;
              }
              .beautiful-table td:nth-child(1) span,
              .beautiful-table td:nth-child(1) {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
              }

              /* Other cells (Right Column) */
              .beautiful-table td:not(:nth-child(1)) {
                grid-column: 2 / 3;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding: 8px 16px;
                border: none;
                border-bottom: 1px dashed #f1f5f9;
                text-align: left !important;
              }
              .beautiful-table td:last-child {
                border-bottom: none;
              }
              
              /* Label positioning */
              .beautiful-table td:not(:nth-child(1))::before {
                content: attr(data-label);
                width: 70px;
                font-size: 13px;
                font-weight: 600;
                color: #64748b;
                margin-right: 8px;
                text-align: left;
                flex-shrink: 0;
              }
              
              /* Content styling */
              .beautiful-table td:not(:nth-child(1)) > div,
              .beautiful-table td:not(:nth-child(1)) > span {
                text-align: left !important;
                font-size: 14px;
                color: #1e293b;
                width: 100%;
              }
            }
            .pagination-btn {
              padding: 6px 12px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 0;
              cursor: pointer;
              color: #334155;
              font-size: 13px;
              font-weight: 500;
              transition: all 0.15s;
            }
            .pagination-btn:hover:not(:disabled) {
              background: #e2e8f0;
              color: #0f172a;
            }
            .pagination-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          </style>
          <thead><tr><th>\u793E\u54E1\u756A\u53F7</th><th>\u6C0F\u540D</th><th>\u90E8\u7F72</th><th>\u652F\u5E97</th><th>\u52E4\u52D9\u533A\u5206</th><th>\u72B6\u614B</th><th>\u51FA\u52E4</th><th>\u9000\u52E4</th><th>\u73FE\u5834</th><th>\u4F5C\u696D\u5185\u5BB9</th></tr></thead>
        `;const H=document.createElement("tbody"),h=wt(o),S=o<T,D=(e-1)*l,V=Math.min(D+l,i.length),B=i.slice(D,V);for(let g=0;g<B.length;g++){const r=B[g],x=g>0?B[g-1]:null,p=x&&x.userId===r.userId;let u="";if(!p){let A=1;for(let R=g+1;R<B.length&&B[R].userId===r.userId;R++)A++;u=A>1?` rowspan="${A}"`:""}const X=r.employeeCode||`EMP${String(r.userId).padStart(3,"0")}`,E=r.username||"",K=r.departmentName||"\u2014",m=r.status||"",q=String(r.dailyKubun||"").trim()||(h&&(m==="leave"||m==="not_checked_in")?"\u4F11\u65E5":""),mt=new Set(["\u6B20\u52E4","\u6709\u7D66\u4F11\u6687","\u534A\u4F11","\u7121\u7D66\u4F11\u6687"]),Ct=new Set(["\u4F11\u65E5","\u4EE3\u66FF\u4F11\u65E5"]),St=new Set(["\u6B20\u52E4","\u6709\u7D66\u4F11\u6687","\u534A\u4F11","\u7121\u7D66\u4F11\u6687","\u4F11\u65E5","\u4EE3\u66FF\u4F11\u65E5"]),bt=Ct.has(q);let k="",$="",C="";m==="checked_out"?(k="\u9000\u52E4\u6E08",$="attrec-pill ok",C="background:#dcfce7;color:#166534;border:1px solid #86efac;"):m==="working"||m==="holiday_working"?S?(k="\u9000\u52E4\u5FD8\u308C",$="attrec-pill danger",C="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;"):(k=m==="working"?"\u51FA\u52E4\u4E2D":"\u4F11\u65E5\u51FA\u52E4\u4E2D",$="attrec-pill warn",C="background:#fef9c3;color:#854d0e;border:1px solid #fde047;"):m==="holiday_work"?(k="\u4F11\u65E5\u51FA\u52E4",$="attrec-pill warn",C="background:#fef9c3;color:#854d0e;border:1px solid #fde047;"):m==="leave"&&mt.has(q)||bt?(k=q||"\u4F11\u65E5",$="attrec-pill neutral",C="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;"):m==="off"?(k="\u4F11\u65E5",$="attrec-pill neutral",C="background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;"):S?(k="\u6253\u523B\u306A\u3057",$="attrec-pill danger",C="background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;"):(k="\u672A\u51FA\u52E4",$="attrec-pill neutral",C="background:#f0f9ff;color:#0369a1;border:1px solid #7dd3fc;");const Et=rt(r.attendance?r.attendance.checkIn:void 0),zt=rt(r.attendance?r.attendance.checkOut:void 0),Mt=r.report&&r.report.site?r.report.site:"",Tt=r.report&&r.report.work?r.report.work:"",j=A=>{const R=String(A||"").trim();return R||"-"},ft=j(Et),xt=j(zt),It=j(Mt),Lt=j(Tt),G=String(r.workType||(r.report&&r.report.workType?r.report.workType:"")||"").trim(),Ht=St.has(q)?q:G==="onsite"?"\u51FA\u793E":G==="remote"?"\u5728\u5B85":G==="satellite"?"\u73FE\u5834/\u51FA\u5F35":m==="off"?"\u4F11\u65E5":"",J=document.createElement("tr");J.className=m==="checked_out"?"attrec-row checkedout":m==="working"||m==="holiday_work"||m==="holiday_working"?"attrec-row working":(m==="leave"&&mt.has(q)||bt,"attrec-row absent");const Dt=p?"":`<td data-label="\u793E\u54E1\u756A\u53F7" style="text-align:center; vertical-align:middle;"${u}>${b(X)}</td>`,qt=p?"":`<td data-label="\u6C0F\u540D" style="font-weight:600; white-space:nowrap; vertical-align:middle;"${u}>${b(E)}</td>`,Rt=p?"":`<td data-label="\u90E8\u7F72" style="white-space:nowrap; vertical-align:middle;"${u}>${b(K)}</td>`,Bt=r.branchName||"\u2014",Nt=p?"":`<td data-label="\u652F\u5E97" style="white-space:nowrap; vertical-align:middle;"${u}>${b(Bt)}</td>`,At=p?"":`<td data-label="\u52E4\u52D9\u533A\u5206" style="white-space:nowrap; vertical-align:middle;"${u}>${b(Ht)}</td>`,Pt=p?"":`<td data-label="\u72B6\u614B" style="text-align:center; white-space:nowrap; vertical-align:middle;"${u}><span class="${$}" style="display:inline-block;padding:2px 8px;font-size:12px;font-weight:700;${C}">${b(k)}</span></td>`;J.innerHTML=`
            ${Dt}
            ${qt}
            ${Rt}
            ${Nt}
            ${At}
            ${Pt}
            <td data-label="\u51FA\u52E4" style="text-align:center; font-family:monospace; font-size:14px; white-space:nowrap;${ft!=="-"?" color:#166534; font-weight:600;":""}">${b(ft)}</td>
            <td data-label="\u9000\u52E4" style="text-align:center; font-family:monospace; font-size:14px; white-space:nowrap;${xt!=="-"?" color:#0b2c66; font-weight:600;":""}">${b(xt)}</td>
            <td data-label="\u73FE\u5834"><div style="font-size:13px; color:#475569;">${b(It)}</div></td>
            <td data-label="\u4F5C\u696D\u5185\u5BB9"><div style="font-size:13px; color:#475569; word-break:break-all; white-space:pre-wrap;">${b(Lt)}</div></td>
          `,H.appendChild(J)}f.appendChild(H);const N=document.createElement("div");if(N.id="attrecTableWrap",N.className="emp-list-scroll-wrap attrec-list-scroll-wrap",N.style.cssText="overflow-x:scroll !important; width:0; min-width:100%; margin-bottom:20px; position:relative;",N.appendChild(f),t.appendChild(N),i.length>0){const g=Math.ceil(i.length/l),r=document.createElement("div");if(a){r.className="attrec-mobile-pagination";const x=document.createElement("div");x.innerHTML=`\u5168 <span style="font-weight:700; color:#0f172a;">${i.length}</span> \u4EF6\u4E2D <span style="font-weight:700; color:#0f172a;">${D+1}</span> - <span style="font-weight:700; color:#0f172a;">${V}</span> \u4EF6\u3092\u8868\u793A`,x.style.color="#64748b",x.style.fontSize="14px";const p=document.createElement("div");p.style.display="flex",p.style.gap="8px";const u=e===1?"#f1f5f9":"#fff",X=e===1?"not-allowed":"pointer",E=document.createElement("button");E.type="button",E.textContent="\u524D\u3078",E.style.cssText=`padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${u}; color:#475569; cursor:${X}; font-size:14px;`,E.disabled=e===1,E.onclick=()=>{e>1&&(e--,c(),setTimeout(()=>{t&&t.scrollIntoView({behavior:"smooth",block:"start"})},50))};const K=e===g?"#f1f5f9":"#fff",m=e===g?"not-allowed":"pointer",z=document.createElement("button");z.type="button",z.textContent="\u6B21\u3078",z.style.cssText=`padding:6px 12px; border:1px solid #cbd5e1; border-radius:4px; background:${K}; color:#475569; cursor:${m}; font-size:14px;`,z.disabled=e===g,z.onclick=()=>{e<g&&(e++,c(),setTimeout(()=>{t&&t.scrollIntoView({behavior:"smooth",block:"start"})},50))},p.appendChild(E),p.appendChild(z),r.appendChild(x),r.appendChild(p),t.appendChild(r)}else{r.className="attrec-paging desktop-only",r.style.display="flex",r.style.alignItems="center",r.style.justifyContent="flex-start",r.style.gap="15px",r.style.padding="10px 0 20px 0";const x=document.createElement("button");x.type="button",x.textContent="\u524D\u3078",x.className="pagination-btn",x.disabled=e===1,x.onclick=()=>{e>1&&(e--,c())};const p=document.createElement("button");p.type="button",p.textContent="\u6B21\u3078",p.className="pagination-btn",p.disabled=e===g,p.onclick=()=>{e<g&&(e++,c())};const u=document.createElement("span");u.textContent=`${D+1}-${V} / ${i.length}`,u.style.fontSize="14px",u.style.color="#333",r.appendChild(x),r.appendChild(u),r.appendChild(p),t.appendChild(r)}}};c()}catch(n){if(n&&n.name==="AbortError"||!M)return;t&&(t.innerHTML=`
          <div class="empty-state" style="color:#b00020;">
            <div style="font-size:28px;">\u26A0\uFE0F</div>
            <div>\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${b(n&&n.message?n.message:"unknown")}</div>
          </div>
        `)}},U=y.querySelector("#rosterDate"),Y=document.getElementById("rosterDateMobile"),dt=async o=>{const t=o.target.value||T;U&&(U.value=t),Y&&(Y.value=t),await lt(t)};U&&U.addEventListener("change",dt),Y&&Y.addEventListener("change",dt);let L=null;try{L=await ut.get("/api/auth/me")}catch{}L&&L.role==="employee"&&v.querySelectorAll(".excel-dropdown-container, #rosterExportXlsx, #rosterExportXlsxMobile").forEach(t=>{t&&(t.style.display="none")});const O=()=>L&&L.role!=="admin"&&L.role!=="manager"?(alert("\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002"),!1):!0,pt=y.querySelector("#rosterExportMonthXlsx"),st=document.getElementById("rosterExportMonthXlsxMobile"),ct=async()=>{if(!O())return;const o=y.querySelector("#rosterMonth"),t=document.getElementById("rosterMonthMobile"),n=o&&o.value?o.value:t&&t.value?t.value:vt,i=`/api/admin/work-reports/export.xlsx?period=month&month=${encodeURIComponent(n)}`;try{await Q(i,`attendance_month_${n}.xlsx`)}catch(e){alert(String(e&&e.message?e.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}};pt&&pt.addEventListener("click",ct),st&&st.addEventListener("click",ct),await lt(T);const s=document.createElement("form"),W=new Date(Date.now()+9*3600*1e3).toISOString().slice(0,4);s.style.display="flex",s.style.alignItems="center",s.style.gap="8px";const $t=ot.filter(o=>o.role!=="admin"&&o.role!=="manager");s.innerHTML=`
    <select id="tsUser" style="height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size:13px; max-width: 150px;">${$t.map(o=>`<option value="${o.id}">${o.id} ${o.username||o.email}</option>`).join("")}</select>
    <input id="tsYear" placeholder="Year(YYYY)" value="${W}" style="width:90px; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size:13px;">
    <button type="button" id="tsExportXlsx" class="attrec-btn" style="height:34px; padding:0 12px; background:#fff; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">Excel</button>
    <input id="tsFrom" placeholder="From(YYYY-MM-DD)" style="width:140px; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size:13px;">
    <input id="tsTo" placeholder="To(YYYY-MM-DD)" style="width:140px; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size:13px;">
    <button type="submit" class="attrec-btn" style="height:34px; padding:0 12px; background:#fff; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">\u8868\u793A</button>
    <button type="button" id="tsExport" class="attrec-btn" style="height:34px; padding:0 12px; background:#fff; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; font-weight:600; cursor:pointer;">CSV</button>
  `;const d=document.createElement("div"),w=document.createElement("div");let F=null;if(Ut(d,'button[data-action="day-detail"]',"click",async(o,t)=>{const n=t.dataset.date||"";if(!n||!F)return;const i=await yt(F,n,{signal:P});if(!M)return;w.innerHTML=`<h4 style="margin-top:0;">${n} \u8A73\u7D30</h4>`;const e=document.createElement("table");e.className="beautiful-table",e.style.width="100%",e.style.borderCollapse="collapse",e.innerHTML=`
      <thead>
        <tr>
          <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:left;">ID</th>
          <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:left;">\u51FA\u52E4</th>
          <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:left;">\u9000\u52E4</th>
        </tr>
      </thead>`;const a=document.createElement("tbody");for(const l of i.segments||[]){const c=document.createElement("tr");c.style.borderBottom="1px solid #e2e8f0",c.innerHTML=`
        <td style="padding:10px;">${l.id}</td>
        <td style="padding:10px;">${l.checkIn?l.checkIn.substring(11,16):""}</td>
        <td style="padding:10px;">${l.checkOut?l.checkOut.substring(11,16):""}</td>
      `,a.appendChild(c)}e.appendChild(a),w.appendChild(e)}),s.addEventListener("submit",async o=>{o.preventDefault();const t=parseInt(s.querySelector("#tsUser").value,10),n=s.querySelector("#tsFrom").value.trim(),i=s.querySelector("#tsTo").value.trim();if(!t){alert("\u793E\u54E1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}if(!n||!i){alert("\u300CFrom\u300D\u3068\u300CTo\u300D\u306E\u65E5\u4ED8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}F=t;try{const e=await ht(t,n,i,{signal:P});if(!M)return;d.innerHTML="",w.innerHTML="",d.style.position="fixed",d.style.top="50%",d.style.left="50%",d.style.transform="translate(-50%, -50%)",d.style.backgroundColor="#fff",d.style.padding="20px",d.style.boxShadow="0 4px 20px rgba(0,0,0,0.15)",d.style.borderRadius="8px",d.style.zIndex="1000",d.style.maxHeight="80vh",d.style.overflowY="auto",d.style.width="90%",d.style.maxWidth="800px";const a=document.createElement("div");a.id="tsOverlay",a.style.position="fixed",a.style.top="0",a.style.left="0",a.style.width="100vw",a.style.height="100vh",a.style.backgroundColor="rgba(0,0,0,0.4)",a.style.zIndex="999",a.addEventListener("click",()=>{d.style.display="none",a.remove(),w.innerHTML=""}),document.body.appendChild(a);const l=document.createElement("div");l.style.display="flex",l.style.justifyContent="space-between",l.style.alignItems="center",l.style.marginBottom="15px",l.innerHTML=`
          <h3 style="margin:0; font-size:18px; color:#1e293b;">\u30BF\u30A4\u30E0\u30B7\u30FC\u30C8\u8A73\u7D30 (${n} ~ ${i})</h3>
          <button type="button" id="tsCloseBtn" style="background:none; border:none; font-size:24px; cursor:pointer; color:#64748b;">&times;</button>
        `,d.appendChild(l),l.querySelector("#tsCloseBtn").addEventListener("click",()=>{d.style.display="none",a.remove(),w.innerHTML=""});const c=document.createElement("table");c.className="beautiful-table",c.style.width="100%",c.style.borderCollapse="collapse",c.innerHTML=`
          <thead>
            <tr>
              <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:left;">\u65E5\u4ED8</th>
              <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:right;">\u901A\u5E38(\u6642\u9593)</th>
              <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:right;">\u6B8B\u696D(\u6642\u9593)</th>
              <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:right;">\u6DF1\u591C(\u6642\u9593)</th>
              <th style="padding:10px; border-bottom:2px solid #cbd5e1; background:#f8fafc; text-align:center;">\u64CD\u4F5C</th>
            </tr>
          </thead>`;const f=document.createElement("tbody"),H=h=>{if(h==null||isNaN(h))return"0:00";const S=Math.floor(h/60),D=h%60;return`${S}:${D.toString().padStart(2,"0")}`};for(const h of e.days||[]){const S=document.createElement("tr");S.style.borderBottom="1px solid #e2e8f0",S.innerHTML=`
            <td style="padding:10px;">${h.date}</td>
            <td style="padding:10px; text-align:right;">${H(h.regularMinutes)}</td>
            <td style="padding:10px; text-align:right;">${H(h.overtimeMinutes)}</td>
            <td style="padding:10px; text-align:right;">${H(h.nightMinutes)}</td>
            <td style="padding:10px; text-align:center;"><button type="button" class="attrec-btn" style="padding:4px 10px; font-size:12px;" data-action="day-detail" data-date="${h.date}">\u8A73\u7D30</button></td>
          `,f.appendChild(S)}c.appendChild(f),d.appendChild(c),d.style.display="block",w.style.marginTop="20px",w.style.borderTop="1px solid #e2e8f0",w.style.paddingTop="15px",d.appendChild(w)}catch(e){if(e&&e.name==="AbortError"||!M)return;alert(String(e&&e.message?e.message:"\u30C7\u30FC\u30BF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}}),s.querySelector("#tsExport").addEventListener("click",async()=>{if(!O())return;const o=parseInt(s.querySelector("#tsUser").value,10),t=s.querySelector("#tsFrom").value.trim(),n=s.querySelector("#tsTo").value.trim();if(!o){alert("\u793E\u54E1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}if(!t||!n){alert("\u300CFrom\u300D\u3068\u300CTo\u300D\u306E\u65E5\u4ED8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const i=typeof tt=="function"?tt(String(o),t,n):`/api/admin/export/timesheet.csv?userIds=${encodeURIComponent(String(o))}&from=${encodeURIComponent(t)}&to=${encodeURIComponent(n)}`;try{await Q(i,`timesheet_${o}.csv`)}catch(e){alert(String(e&&e.message?e.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}}),s.querySelector("#tsExportXlsx").addEventListener("click",async()=>{if(!O())return;const o=parseInt(s.querySelector("#tsUser").value,10),t=s.querySelector("#tsYear"),n=String(t&&t.value?t.value:W).trim()||W,i=`/api/admin/employees/${encodeURIComponent(String(o))}/export.xlsx?year=${encodeURIComponent(n)}`;try{const e=s.querySelector("#tsUser"),l=(e&&e.options&&e.options[e.selectedIndex]?e.options[e.selectedIndex].text:String(o)).split(" "),c=l.length>1?l.slice(1).join("_"):String(o);await Q(i,`${c}_${n}.xlsx`)}catch(e){alert(String(e&&e.message?e.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}}),!window.location.pathname.includes("/ui/attendance-records")){const o=y.querySelector("#topRightFormContainer");if(o)o.appendChild(s);else{const t=document.createElement("details");t.open=!0,t.style.marginBottom="12px",t.innerHTML='<summary style="cursor:pointer;font-weight:900;padding:10px 0;">\u500B\u4EBA\u30BF\u30A4\u30E0\u30B7\u30FC\u30C8\uFF08\u8A73\u7D30\uFF09</summary>',t.appendChild(s),v.insertBefore(t,y)}v.appendChild(d),v.appendChild(w)}return()=>{try{v.innerHTML=""}catch{}_.run()}}const Jt=Yt({mount:gt});export{Jt as attendancePage,Gt as mountAttendance};
