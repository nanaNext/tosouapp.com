import{escapeHtml as r,delegate as Et}from"../admin/_shared/dom.js";import{api as Mt,downloadWithAuth as at}from"../shared/api/client.js";import{createPage as Vt}from"../shared/page/createPage.js";import{createCleanup as Ft}from"../shared/page/createCleanup.js";async function oe($){try{document.body.classList.remove("drawer-open","mobile-drawer-open")}catch{}return await zt($)}async function zt({content:$,listUsers:X,getTimesheet:Tt,getAttendanceDay:Ct,updateAttendanceSegment:Dt,buildTimesheetExportURL:Lt}){const V=Ft();let D=!0;const it=new AbortController,L=it.signal;V.add(()=>{D=!1}),V.add(()=>it.abort());let rt=[];try{!window.location.pathname.includes("/ui/attendance-records")&&typeof X=="function"&&(rt=await X({signal:L}))}catch(t){console.warn("Could not fetch users for dropdown:",t)}$.innerHTML="";const lt=t=>{if(!t)return"";const e=String(t);return e.includes("/")?e:e.length>=16?e.slice(11,16):e},It=t=>{try{const e=String(t||"").slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return!1;const[o,a,n]=e.split("-").map(s=>parseInt(s,10)),c=new Date(Date.UTC(o,a-1,n)).getUTCDay();return c===0||c===6}catch{return!1}},v=new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10),Ht=v.slice(0,7),dt=new URLSearchParams(window.location.search).get("standalone")==="1";if(dt)try{const t=window.innerWidth<=768,e=document.querySelector(".topbar"),o=document.querySelector(".subbar");e&&!t&&(e.style.display="none"),o&&!t&&(o.style.display="none");const a=document.querySelector("#adminChrome");a&&!t&&(a.style.display="none"),t||e&&e.style.display}catch{}const Kt=dt?"100vh":"calc(100vh - var(--topbar-height) - var(--subbar-height) - 24px)",k=document.createElement("div");k.style.cssText="margin: 0; padding: 0; width: 100%;",k.innerHTML=`
    <style>
      /* B\u1ECF css can thi\u1EC7p v\xE0o html, body, * \u0111\u1EC3 kh\xF4ng l\xE0m h\u1ECFng thanh subnav */
      /* FULL WIDTH OVERRIDES */
      #attendanceRecordsHost { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
      
      @media (max-width: 768px) {
        .beautiful-table thead {
          display: none !important;
        }
        /* C\u01B0\u1EE1ng ch\u1EBF x\xF3a tri\u1EC7t \u0111\u1EC3 kho\u1EA3ng tr\u1EAFng b\u1EB1ng c\xE1ch ch\xE8n tag ID n\u1EBFu c\u1EA7n */
        #attendanceRecordsHost { background: transparent !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
        .attrec-fiori-override { background: transparent !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; height: auto !important; }
        
        /* B\u1ECF background c\u1EE7a th\u1EBB dash-card tr\xEAn mobile \u0111\u1EC3 n\xF3 kh\xF4ng \u0111\xE8 vi\u1EC1n */
        .attrec-fiori-override.dash-card {
          background: transparent !important; /* M\xE0u x\xE1m nh\u1EA1t \u0111\u1EC3 l\xE0m n\u1ED5i b\u1EADt c\xE1c th\u1EBB m\xE0u tr\u1EAFng */
          border-radius: 0 !important;
          width: 100% !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          min-height: 0 !important;
        }
        
        /* Keep controls visible */
        .attrec-controls, .attrec-head {
          display: flex !important;
          margin-bottom: 4px !important;
        }
        .attrec-card h2 { display: none !important; }
        .attrec-controls { }
        .attrec-fiori-override .attrec-head { border: none !important; }
        
        /* Desktop overrides using the same classes if they leaked */
        /* Removed empty media query block */
        
        .attrec-table {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important; /* Remove padding on mobile to maximize space */
            box-sizing: border-box !important;
        }
        
        .emp-list-scroll-wrap {
          width: 100% !important;
          max-width: 100% !important;
          border: none !important;
          box-shadow: none !important;
        }
      }
      
      .attrec-fiori-override .dash-card-title {
        font-size: 18px !important;
        font-weight: 700 !important;
        color: #0f172a !important;
        letter-spacing: -0.01em;
        margin: 0 !important;
      }
      .attrec-fiori-override.dash-card {
        background: #fff !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        box-sizing: border-box;
      }
      .attrec-fiori-override .attrec-head {
        border-bottom: none !important;
        min-height: 36px !important;
        display: flex !important;
        padding-bottom: 12px !important;
      }
      .attrec-fiori-override .attrec-controls {
          gap: 12px !important;
          display: flex !important;
          margin-bottom: 16px !important;
        }
      .attrec-fiori-override .attrec-control {
        gap: 8px !important;
      }
      .attrec-fiori-override .mobile-row {
        display: contents; /* On desktop, act as if it's not there */
      }
      .attrec-fiori-override .attrec-input,
      .attrec-fiori-override .attrec-btn {
        height: 34px !important;
        font-size: 14px !important;
        padding: 0 12px !important;
        border-radius: 4px !important;
      }
      .attrec-fiori-override .attrec-table {
          border-top: none !important;
        }
      .attrec-fiori-override .attrec-dash-table th {
        padding: 6px 12px !important;
        font-size: 15px !important;
        background: #f8fafc !important;
        color: #475569 !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .attrec-fiori-override .attrec-dash-table td {
        padding: 6px 12px !important;
        font-size: 16px !important;
        vertical-align: middle !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .attrec-fiori-override .attrec-pill {
        font-size: 11px !important;
        padding: 3px 8px !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.2px;
      }
      .attrec-pill.ok {
        background: #dcfce7 !important;
        color: #166534 !important;
        border: none !important;
      }
      .attrec-pill.warn {
        background: #fef3c7 !important;
        color: #92400e !important;
        border: none !important;
      }
      .attrec-pill.danger {
        background: #fee2e2 !important;
        color: #991b1b !important;
        border: none !important;
      }
      .attrec-pill.neutral {
        background: #f1f5f9 !important;
        color: #475569 !important;
        border: none !important;
      }
      .attrec-pill.halfpaid {
        background: #0d9488 !important;
        color: #ffffff !important;
        border: none !important;
        font-weight: 700 !important;
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
        border-radius: 6px !important;
        font-size: 14px !important;
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
        border-radius: 6px;
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
        font-size: 14px;
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
      @media (min-width: 769px) {
        table.beautiful-table.attrec-emp-like-table tbody tr td.mobile-only,
        .attrec-emp-like-table td.mobile-only,
        .mobile-only {
          display: none !important;
          opacity: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      }
      .attrec-emp-like-table td.desktop-only {
        display: table-cell !important;
      }
      
      /* Mobile responsive styles for legacy attendance page */
      @media (max-width: 768px) {
        table.beautiful-table.attrec-emp-like-table tbody tr td.desktop-only,
        .attrec-emp-like-table td.desktop-only {
          display: none !important;
          opacity: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
        }
        table.beautiful-table.attrec-emp-like-table tbody tr td.mobile-only,
        .attrec-emp-like-table td.mobile-only {
          display: block !important;
        }
        table.beautiful-table.attrec-emp-like-table tbody tr td.m-code-cell.mobile-only,
        .attrec-emp-like-table td.m-code-cell.mobile-only {
          display: flex !important;
          width: 100% !important;
        }
        table.beautiful-table.attrec-emp-like-table tbody tr td.m-main-cell.mobile-only,
        .attrec-emp-like-table td.m-main-cell.mobile-only {
          display: flex !important;
        }

        .attrec-fiori-override .dash-card-title {
          display: block !important;
        }
        .attrec-fiori-override .attrec-head {
          border-bottom: 1px solid #e2e8f0 !important;
          background: transparent !important; 
          display: flex !important;
          margin-bottom: 12px !important;
          padding-bottom: 8px !important;
          min-height: 40px !important;
        }
        .attrec-fiori-override .attrec-summary {
          flex-wrap: wrap !important;
          gap: 8px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
        }
        .attrec-fiori-override .attrec-controls {
          flex-direction: column !important;
          gap: 12px !important;
          padding: 12px !important; 
          margin-bottom: 16px !important;
          background: #f8fafc !important; 
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important; 
          display: flex !important; 
        }
        .attrec-fiori-override .attrec-control {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important; /* Increase gap between items on mobile */
          width: 100% !important;
          background: transparent !important;
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
          font-size: 14px !important;
          margin-right: 2px !important;
        }
        .attrec-fiori-override .attrec-control:nth-child(2) .mobile-row:nth-child(2)::before {
          content: "\u6708";
          font-weight: 700 !important;
          color: #475569 !important;
          font-size: 14px !important;
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
          flex-direction: column !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: hidden !important;
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
          width: 100% !important;
          max-width: 100% !important;
          /* background color is now set inline dynamically based on status */
          border-bottom: 1px solid #e2e8f0 !important;
          padding: 12px 16px !important;
          display: block !important;
          box-sizing: border-box !important;
        }
        .attrec-emp-like-table .m-code-label {
          font-size: 11px !important;
          color: #64748b !important;
          margin-bottom: 4px !important;
        }
        .attrec-emp-like-table .m-code-value {
          font-size: 16px !important;
          font-weight: 700 !important;
          /* text color is now set inline dynamically based on status */
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .attrec-emp-like-table .m-main-cell {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 12px 16px 12px 0 !important;
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
          font-size: 14px !important;
          line-height: 1.4 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-k {
          min-width: 80px !important;
          max-width: 80px !important;
          color: #64748b !important;
          flex-shrink: 0 !important;
          text-align: left !important;
        }
        .attrec-emp-like-table .m-v {
          color: #0f172a !important;
          word-break: break-word !important;
          flex: 1 !important;
          text-align: left !important;
          padding-left: 16px !important;
          padding-top: 0 !important;
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
    </style>
    <div class="dash-card attrec-fiori-override" style="background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important;">
      <div class="attrec-controls" style="display:none !important; margin:0; padding:0; height:0; overflow:hidden;">
      </div>
      <div class="attrec-head" style="display:none !important; margin:0; padding:0; height:0; overflow:hidden;">
        <div id="rosterSummary" class="attrec-summary" aria-live="polite" style="display: flex; gap: 12px; margin-bottom: 0px;"></div>
      </div>
      <div id="rosterTable" class="attrec-table" style="margin:0; padding:0;"></div>
    </div>
  `,$.appendChild(k);const F=document.getElementById("attHubMobileActions");if(window.innerWidth<=768&&F&&(F.innerHTML=`
    <div style="display:flex; align-items:center; justify-content:center; padding: 8px 12px; background: #fff; margin: 0; border-bottom: 1px solid #e5e7eb;">
      <input type="date" id="rosterDateMobile" value="${r(v)}" style="height:34px; padding:0 12px; font-size:14px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#0f172a; font-weight:600; text-align:center;">
    </div>
    `),window.innerWidth<=768&&!F){const t=document.createElement("div");t.id="rosterMobileDateBar",t.style.cssText="display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 12px; background:#fff; border-bottom:1px solid #e5e7eb;",t.innerHTML=`
      <button type="button" id="rosterPrevDayMobile" aria-label="\u524D\u65E5" style="height:34px; min-width:38px; padding:0 10px; font-size:16px; line-height:1; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#0f172a; font-weight:700; cursor:pointer;">\u2039</button>
      <input type="date" id="rosterDateMobile" value="${r(v)}" style="height:34px; padding:0 12px; font-size:14px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#0f172a; font-weight:600; text-align:center;">
      <button type="button" id="rosterNextDayMobile" aria-label="\u7FCC\u65E5" style="height:34px; min-width:38px; padding:0 10px; font-size:16px; line-height:1; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#0f172a; font-weight:700; cursor:pointer;">\u203A</button>
    `,k.insertBefore(t,k.firstChild)}const qt=`
    <div style="display:flex; gap:16px; align-items:center; justify-content:flex-end; width:100%;">
      <div id="rosterSummary" style="display:flex; gap:8px;"></div>
    </div>
  `,S=k.querySelector(".attrec-controls");S&&(S.innerHTML=qt,S.style.display="none");const K=document.getElementById("subbarDateSlot");K?(K.innerHTML=`<input type="date" id="rosterDate" value="${r(v)}" style="height:28px; padding:0 8px; font-size:13px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; color:#0f172a; font-weight:600;">`,K.style.display=""):S&&(S.innerHTML=`<div style="display:flex;align-items:center;justify-content:flex-end;width:100%;"><input type="date" id="rosterDate" value="${r(v)}" style="height:34px;padding:0 12px;font-size:14px;max-width:140px;min-width:140px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:6px;"></div>`,S.style.display="block"),window.addEventListener("resize",()=>{const t=window.innerWidth<=768;S&&(S.style.display=t?"none":"block")}),S&&(S.style.display=window.innerWidth<=768?"none":"block");const pt=t=>{const e=t&&typeof t=="object"?t:{},o=Number(e.required==null?0:e.required),a=Number(e.submitted==null?0:e.submitted),n=Number(e.missing==null?0:e.missing),c=k.querySelector("#rosterSummary");if(!c)return;const s="display:inline-flex; align-items:center; justify-content:center; min-width:24px; height:22px; padding:0 8px; border-radius:12px; font-size:12px; font-weight:700; line-height:1; box-sizing:border-box;",b=s+" background-color:#f1f5f9; color:#475569; border:1px solid #e2e8f0;",u=s+" background-color:#f0fdf4; color:#166534; border:1px solid #bbf7d0;",yt=s+" background-color:#fef2f2; color:#991b1b; border:1px solid #fecaca;",C=n>0?yt:u;c.innerHTML=`
      <div style="display: none; gap:16px; align-items:center; font-size:14px; color:#475569; font-weight:500;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span>\u5FC5\u8981(\u9000\u52E4\u6E08)</span>
          <span style="${b}">${r(o)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span>\u63D0\u51FA</span>
          <span style="${u}">${r(a)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span>\u672A\u63D0\u51FA</span>
          <span style="${C}">${r(n)}</span>
        </div>
      </div>
    `},st=async t=>{const e=k.querySelector("#rosterTable");e&&(e.innerHTML=`
        <div class="empty-state">
          <div style="font-size:28px;">\u23F3</div>
          <div>\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>
        </div>
      `),pt(null);try{const o=await Mt.get(`/api/admin/work-reports?date=${encodeURIComponent(t)}`,{signal:L});if(!D)return;let a=o&&Array.isArray(o.items)?o.items:[];a=a.filter(m=>{const I=String(m.role||"").toLowerCase();return I!=="admin"&&I!=="manager"});const n=a.filter(m=>m.status==="checked_out"),c=n.length,s=n.filter(m=>!!m.report).length,b=n.filter(m=>!m.report).length;if(pt({required:c,submitted:s,missing:b}),!e)return;if(!a.length){e.innerHTML=`
          <div class="empty-state">
            <div style="font-size:28px;">\u{1F5C2}\uFE0F</div>
            <div>\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>
          </div>
        `;return}let u=1;const C=window.innerWidth<=768?20:10,et=()=>{if(!e)return;e.innerHTML="";const m=document.createElement("table");m.id="attrecList",m.className="beautiful-table",m.style.tableLayout="fixed",m.style.width="100%",m.style.minWidth="1000px",m.style.borderCollapse="collapse",m.style.borderSpacing="0",m.innerHTML=`
          <style>
            /* Standard Professional Grid Table Style */
            .beautiful-table {
              background-color: #ffffff;
              border: 1px solid #e2e8f0 !important;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
              border-radius: 8px;
              overflow: hidden;
            }
            .beautiful-table thead {
              background-color: #1e293b;
            }
            .beautiful-table th {
              padding: 10px 14px;
              text-align: left;
              font-weight: 600;
              color: #ffffff;
              font-size: 12px;
              letter-spacing: 0.3px;
              border-bottom: none;
              border-right: 1px solid #334155;
              white-space: nowrap;
              position: sticky;
              top: 0;
              z-index: 10;
              background-color: #1e293b;
            }
            .beautiful-table th:last-child {
              border-right: none;
            }
            .beautiful-table td {
              padding: 8px 14px;
              border-bottom: 1px solid #f1f5f9;
              border-right: none;
              color: #334155;
              font-size: 13px;
              vertical-align: middle;
              word-break: break-word;
              white-space: normal;
              height: auto;
            }
            .beautiful-table tbody tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .beautiful-table tbody tr:hover {
              background-color: #eff6ff;
            }
            .beautiful-table td:last-child {
              border-right: none;
            }
            .beautiful-table th:nth-child(5), /* Status */
            .beautiful-table th:nth-child(6), /* In */
            .beautiful-table th:nth-child(7)  /* Out */ {
              text-align: center;
            }
            .beautiful-table td.empty-dash {
              text-align: center !important;
              color: #94a3b8;
            }
            .beautiful-table tbody tr {
              transition: background-color 0.2s;
            }
            .beautiful-table tbody tr:hover {
              background-color: #f1f5f9;
            }
            .beautiful-table tbody tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .beautiful-table tbody tr:last-child td {
              border-bottom: none;
            }
            
            /* Status Pills matching SAP Fiori Object Status */
            .attrec-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: bold;
              line-height: 1.2;
              white-space: nowrap;
            }
            .attrec-pill.ok { color: #107e3e; background: transparent; }
            .attrec-pill.danger { color: #bb0000; background: transparent; }
            .attrec-pill.warn { color: #e9730c; background: transparent; }
            .attrec-pill.neutral { color: #5e696e; background: transparent; }
            .attrec-pill.halfpaid { color: #0d9488; background: transparent; font-weight: bold; }

            /* Add Fiori-like icons to status */
            .attrec-pill.ok::before { content: "\u2713"; margin-right: 4px; font-weight: normal; }
            .attrec-pill.danger::before { content: "\u2715"; margin-right: 4px; font-weight: normal; }
            .attrec-pill.warn::before { content: "\uFF01"; margin-right: 4px; font-weight: normal; }

            /* Parent container full width */
              .attrec-table {
                padding: 0 16px !important; /* Add padding to give space from the edges */
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                max-width: 100% !important;
              border-radius: 0 !important;
              overflow: hidden !important;
            }
            
            .attrec-fiori-override.dash-card {
              border-radius: 4px !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              background-color: transparent !important;
            }
            
            /* Remove the 2 vertical bars (scrollbars) */
            .emp-list-scroll-wrap {
              overflow-x: auto !important;
              overflow-y: visible !important;
              width: 100%;
            }
            
        /* Desktop fixes so mobile flex doesn't break it */
        @media (min-width: 769px) {
          .beautiful-table tr::before {
            display: none !important;
          }
          .beautiful-table td:nth-child(1),
          .beautiful-table td:nth-child(2) {
            display: table-cell !important;
          }
          .beautiful-table tr {
             display: table-row !important;
             padding: 0 !important;
             box-shadow: none !important;
          }
          .beautiful-table tbody {
            display: table-row-group !important;
          }
          .beautiful-table td {
            display: table-cell !important;
          }
          
          /* RESET TABLE AND ROW BEHAVIOR TO DEFAULT */
          .beautiful-table {
            display: table !important;
            flex-direction: row !important;
            border: 1px solid #cbd5e1 !important;
            border-collapse: separate !important;
            border-radius: 6px !important;
          }
          .beautiful-table td {
            display: table-cell !important;
            width: auto !important;
            flex-grow: initial !important;
            justify-content: initial !important;
            align-items: initial !important;
            white-space: normal !important;
          }
          .beautiful-table td::before {
            content: none !important;
            display: none !important;
          }
        }
            
            /* Mobile Optimization (Card Layout) */
               @media (max-width: 768px) {
           body.admin .topbar { padding: 0 16px !important; background-color: #0b2c66 !important; }
           body.admin .topbar .brand img { width: 32px !important; height: 32px !important; border-radius: 50% !important; object-fit: cover !important; }
           
           /* S\u1EEDa l\u1ED7i z-index l\xE0m cho menu tr\u01B0\u1EE3t b\u1ECB thanh Topbar \u0111\xE8 l\xEAn */
              #mobileDrawer { z-index: 2147483647 !important; }
              #drawerBackdrop { z-index: 2147483646 !important; }
              
              /* \u0110\u1EA3m b\u1EA3o fallback offset n\u1EBFu --drawer-offset ch\u01B0a \u0111\u01B0\u1EE3c set */
                :root {
                  --drawer-offset: 280px;
                  --mobile-drawer-w: 280px;
                }
                
                /* 1. Kh\xF4ng can thi\u1EC7p v\xE0o transform c\u1EE7a .topbar v\xE0 .content tr\xEAn mobile n\u1EEFa
                   b\u1EDFi v\xEC css h\u1EC7 th\u1ED1ng (portal.css / attendance.css) \u0110\xC3 C\xD3 S\u1EB4N hi\u1EC7u \u1EE9ng \u0111\u1EA9y r\u1ED3i. 
                   Vi\u1EC7c ch\xFAng ta ghi \u0111\xE8 b\u1EB1ng !important v\xF4 t\xECnh l\xE0m h\u1ECFng logic g\u1ED1c. */
                
                /* 2. Ch\u1EC9 c\u1EA7n \u0111\u1ED3ng b\u1ED9 hi\u1EC7u \u1EE9ng cho kh\u1ED1i b\u1EA3ng d\u1EEF li\u1EC7u c\u1EE7a trang standalone n\xE0y th\xF4i */
                body.mobile-drawer-open .topbar,
                body.drawer-open .topbar,
                body.mobile-drawer-open .content,
                body.drawer-open .content,
                body.mobile-drawer-open .attrec-fiori-override,
                body.drawer-open .attrec-fiori-override {
                  transform: translateX(var(--mobile-drawer-w, 280px)) !important;
                  transition: transform 0.2s ease !important;
                }
                
                body:not(.mobile-drawer-open):not(.drawer-open) .topbar,
                body:not(.mobile-drawer-open):not(.drawer-open) .content,
                body:not(.mobile-drawer-open):not(.drawer-open) .attrec-fiori-override {
                  transform: translateX(0) !important;
                  transition: transform 0.2s ease !important;
                }
                
                /* Hi\u1EC3n th\u1ECB l\u1EDBp ph\u1EE7 t\u1ED1i m\xE0u (Backdrop) \u0111\xE8 l\xEAn b\u1EA3ng d\u1EEF li\u1EC7u */
                body.mobile-drawer-open #drawerBackdrop,
                body.drawer-open #drawerBackdrop {
                  display: block !important;
                  opacity: 1 !important;
                  z-index: 2147483646 !important; /* Ph\u1EA3i n\u1EB1m d\u01B0\u1EDBi menu tr\u01B0\u1EE3t nh\u01B0ng tr\xEAn b\u1EA3ng */
                }
             
           .attrec-fiori-override.dash-card {
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important; /* \u0110\u1ED5i l\u1EA1i n\u1EC1n tr\u1EAFng cho ph\xF9 h\u1EE3p vi\u1EC1n ph\u1EB3ng */
          box-shadow: none !important;
          border: none !important;
        }
        .attrec-table {
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 800px !important;
          max-width: 100% !important;
        }
        .emp-list-scroll-wrap {
          padding: 0 !important;
          margin: 0 auto !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important; /* Disable horizontal scroll on mobile */
        }
        .beautiful-table {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          min-width: 0 !important; /* This overrides the inline 1000px */
          width: 100% !important;
          display: block !important;
          margin: 0 auto !important; /* Center the table */
          padding: 0 !important;
        }
        .beautiful-table thead {
          display: table-header-group;
        }
        .beautiful-table tbody {
              display: flex !important;
              flex-direction: column !important;
              gap: 8px !important; /* Kho\u1EA3ng c\xE1ch d\u1ECDc gi\u1EEFa c\xE1c th\u1EBB */
              padding: 0 !important; /* X\xF3a padding hai b\xEAn \u0111\u1EC3 th\u1EBB s\xE1t m\xE9p m\xE0n h\xECnh */
              margin: 0 !important; 
              width: 100% !important; 
              box-sizing: border-box !important;
              background: transparent !important;
              border-radius: 0 !important;
              border: none !important;
              overflow: hidden !important;
            }
            .beautiful-table tr {
                display: flex !important;
                flex-direction: column !important;
                background: #ffffff !important; 
                border-top: 1px solid #e2e8f0 !important; 
                border-bottom: 1px solid #e2e8f0 !important;
                border-left: none !important; /* X\xF3a vi\u1EC1n tr\xE1i */
                border-right: none !important; /* X\xF3a vi\u1EC1n ph\u1EA3i */
                border-radius: 0 !important; /* B\u1ECF bo g\xF3c \u0111\u1EC3 vu\xF4ng v\u1EE9c s\xE1t m\xE9p */
                padding: 0 !important; /* X\xF3a padding g\u1ED1c \u0111\u1EC3 d\xF9ng cho cell */
                margin: 0 auto !important; /* Center the card */
                box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; 
                width: 100% !important; 
                max-width: 100% !important; /* \u0110\u1EA3m b\u1EA3o kh\xF4ng v\u01B0\u1EE3t qu\xE1 */
                box-sizing: border-box !important;
                position: relative !important;
              }
             
            /* \u0110\u1ECBnh d\u1EA1ng Ti\xEAu \u0111\u1EC1 g\u1EAFn tr\xEAn th\u1EBB */
              .beautiful-table .m-code-cell {
                display: block !important;
                background-color: #f8fafc !important;
                padding: 12px 16px !important;
                border-bottom: 1px solid #e2e8f0 !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }
              .beautiful-table .m-code-label {
                display: none !important;
              }
              .beautiful-table .m-code-value {
                font-size: 16px !important;
                font-weight: 700 !important;
                color: #0f172a !important;
              }
              
              .beautiful-table td.m-main-cell {
                padding: 12px 16px !important;
              }
                 
              /* \u0110\u1ECBnh d\u1EA1ng c\xE1c d\xF2ng th\xF4ng tin c\xF2n l\u1EA1i */
               .beautiful-table td:not(.m-code-cell) {
                  display: flex !important;
                  justify-content: flex-start !important; 
                  align-items: flex-start !important; /* Thay \u0111\u1ED5i t\u1EEB center sang flex-start \u0111\u1EC3 text nhi\u1EC1u d\xF2ng b\u1EAFt \u0111\u1EA7u t\u1EEB tr\xEAn c\xF9ng */
                  padding: 6px 0 !important; 
                  border-bottom: none !important;
                  font-size: 15px !important; 
                  white-space: normal !important;
                  word-break: break-word !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                }
                   
                /* \u0110\u1ECBnh d\u1EA1ng Nh\xE3n (Ti\xEAu \u0111\u1EC1) b\xEAn tr\xE1i cho Desktop HTML */
                .beautiful-table td:not(.mobile-only)::before {
                  content: attr(data-label);
                  font-weight: 500 !important;
                  color: #475569 !important; /* \u0110\u1ED5i m\xE0u x\xE1m \u0111\u1EADm h\u01A1n cho d\u1EC5 \u0111\u1ECDc */
                  width: 85px !important; /* Gi\u1EA3m nh\u1EB9 \u0111\u1ED9 r\u1ED9ng nh\xE3n \u0111\u1EC3 d\u1EEF li\u1EC7u sang tr\xE1i th\xEAm */
                  min-width: 85px !important;
                  text-align: left !important;
                  flex-shrink: 0 !important;
                }
                  
               /* \xC9p ph\u1EA7n n\u1ED9i dung b\xEAn ph\u1EA3i c\u0103n tr\xE1i s\xE1t l\u1EA1i g\u1EA7n nh\xE3n cho Desktop HTML */
               .beautiful-table td:not(.mobile-only) > *:not(.attrec-pill) {
                  flex-grow: 0 !important;
                  text-align: left !important;
                  padding-left: 0 !important; /* X\xF3a kho\u1EA3ng tr\u1ED1ng th\u1EEBa */
                  color: #0f172a !important; /* M\xE0u ch\u1EEF \u0111en \u0111\u1EADm nh\u1EA5t */
                  font-weight: 500 !important;
                  display: inline-block !important; /* B\u1EAFt bu\u1ED9c \u0111\u1EC3 nh\u1EADn text-align left */
                  white-space: normal !important; /* Cho ph\xE9p xu\u1ED1ng d\xF2ng */
                  word-break: break-word !important; /* T\u1EF1 \u0111\u1ED9ng b\u1EBB ch\u1EEF n\u1EBFu qu\xE1 d\xE0i */
                  max-width: 100% !important; /* Tr\xE1nh tr\xE0n kh\u1ED1i */
               }
               
               /* Ri\xEAng n\u1ED9i dung ch\u1EEF tr\u1ED1ng (d\u1EA5u -) */
               .beautiful-table td .empty-dash {
                  text-align: left !important;
                  flex-grow: 0 !important;
                  padding-left: 0 !important;
                  color: #475569 !important; /* M\xE0u d\u1EA5u g\u1EA1ch ngang \u0111\u1EADm l\xEAn theo m\xE0u nh\xE3n */
                  display: inline-block !important;
               }
               
               .beautiful-table td .attrec-pill {
                display: inline-flex !important;
                width: auto !important;
                padding: 4px 10px !important;
                margin: 0 !important;
                margin-left: 0 !important; 
              }
             /* \u0110\xE3 g\u1EE1 b\u1ECF rule x\xF3a padding/border th\u1EBB \u0111\u1EA7u v\xE0 th\u1EBB cu\u1ED1i \u0111\u1EC3 t\u1EA5t c\u1EA3 c\xE1c th\u1EBB \u0111\u1EC1u vu\xF4ng v\u1EAFn b\u1EB1ng nhau */
              
              /* \u1EA8n ph\u1EA7n Code c\u0169 l\xE0m h\u1ECFng layout */
              .beautiful-table td:not(:nth-child(1)) {
                /* \u0110\xE3 \u0111\u01B0\u1EE3c ghi \u0111\xE8 \u1EDF tr\xEAn b\u1EB1ng flex */
              }
            }
            .pagination-btn {
              padding: 6px 12px;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              cursor: pointer;
              color: #334155;
              font-size: 14px;
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
            
            @media (max-width: 768px) {
              .pagination-controls.desktop-only {
                display: none !important;
              }
              colgroup {
                display: none !important;
              }
            }
          </style>
          <colgroup>
            <col style="width:10%;">
            <col style="width:15%;">
            <col style="width:12%;">
            <col style="width:10%;">
            <col style="width:10%;">
            <col style="width:7%;">
            <col style="width:7%;">
            <col style="width:12%;">
            <col style="width:14%;">
            <col style="width:13%;">
          </colgroup>
          <thead><tr><th>\u793E\u54E1\u756A\u53F7</th><th>\u6C0F\u540D</th><th>\u90E8\u7F72</th><th>\u52E4\u52D9\u533A\u5206</th><th>\u72B6\u614B</th><th>\u51FA\u52E4</th><th>\u9000\u52E4</th><th>\u73FE\u5834</th><th>\u4F5C\u696D\u5185\u5BB9</th><th>\u5099\u8003</th></tr></thead>
        `;const I=document.createElement("tbody"),Rt=It(t),wt=t<v,vt=(u-1)*C,Bt=Math.min(vt+C,a.length),Nt=a.slice(vt,Bt);for(const d of Nt){const f=d.employeeCode||`EMP${String(d.userId).padStart(3,"0")}`,p=d.username||"",l=d.departmentName||"\u2014",i=d.status||"",E=String(d.dailyKubun||"").trim()||(Rt&&(i==="leave"||i==="off")?"\u4F11\u65E5":""),kt=new Set(["\u6B20\u52E4","\u6709\u7D66\u4F11\u6687","\u534A\u4F11","\u534A\u4F11(\u6709\u7D66)","\u7121\u7D66\u4F11\u6687"]),Pt=new Set(["\u4F11\u65E5","\u4EE3\u66FF\u4F11\u65E5"]),At=new Set(["\u6B20\u52E4","\u6709\u7D66\u4F11\u6687","\u534A\u4F11","\u534A\u4F11(\u6709\u7D66)","\u7121\u7D66\u4F11\u6687","\u4F11\u65E5","\u4EE3\u66FF\u4F11\u65E5"]),St=Pt.has(E);let g="",x="";i==="checked_out"?(g="\u9000\u52E4\u6E08",x="attrec-pill ok"):i==="checkout_missing"?(g="\u9000\u52E4\u5FD8\u308C",x="attrec-pill danger"):i==="working"||i==="holiday_working"?wt?(g="\u9000\u52E4\u5FD8\u308C",x="attrec-pill danger"):(g=i==="working"?"\u51FA\u52E4\u4E2D":"\u4F11\u65E5\u51FA\u52E4\u4E2D",x="attrec-pill warn"):i==="holiday_work"?(g="\u4F11\u65E5\u51FA\u52E4",x="attrec-pill warn"):i==="leave"&&kt.has(E)||St?(g=E||"\u4F11\u65E5",x=E==="\u534A\u4F11(\u6709\u7D66)"?"attrec-pill halfpaid":"attrec-pill neutral"):i==="off"?(g=E||"\u4F11\u65E5",x="attrec-pill neutral"):i==="unregistered"?(g="\u672A\u767B\u9332",x="attrec-pill neutral"):i==="not_punched"||wt?(g="\u672A\u6253\u523B",x="attrec-pill danger"):(g="\u672A\u51FA\u52E4",x="attrec-pill neutral");const _t=lt(d.attendance?d.attendance.checkIn:void 0),jt=lt(d.attendance?d.attendance.checkOut:void 0),Ot=d.report&&d.report.site?d.report.site:"",Ut=d.report&&d.report.work?d.report.work:"",H=nt=>{const $t=String(nt||"").trim();return $t||"\u2014"},Yt=String(d.notes||d.reason||"").trim(),P=H(_t),A=H(jt),_=H(Ot),j=H(Ut),O=H(Yt),ot=String(d.workType||(d.report&&d.report.workType?d.report.workType:"")||"").trim(),U=At.has(E)?E:ot==="onsite"?"\u51FA\u793E":ot==="remote"?"\u5728\u5B85":ot==="satellite"?"\u73FE\u5834":i==="off"?"\u4F11\u65E5":"\u2014",q=document.createElement("tr");q.className=i==="checked_out"?"attrec-row checkedout":i==="working"||i==="holiday_work"||i==="holiday_working"?"attrec-row working":(i==="leave"&&kt.has(E)||St,"attrec-row absent"),q.setAttribute("data-emp-code",f),q.setAttribute("data-emp-name",p);const R=nt=>`<td data-label="${nt}"><span class="empty-dash">\u2014</span></td>`;let Y="#f8fafc",W="#0f172a";i==="working"||i==="holiday_working"?(Y="#e0f2fe",W="#1e40af"):i==="checked_out"?(Y="#dcfce7",W="#166534"):i==="holiday_work"&&(Y="#fef3c7",W="#9a3412");const Wt=`
            <td class="m-code-cell mobile-only" style="box-sizing: border-box !important; padding: 12px 16px !important; background-color: ${Y} !important; transition: background-color 0.3s ease;">
              <div class="m-code-label" style="display: none !important;">\u793E\u54E1\u756A\u53F7</div>
              <div class="m-code-value" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; display: block; color: ${W} !important;">[${r(f)}] ${r(p)}</div>
            </td>
            <td class="m-main-cell mobile-only" style="flex-direction: column; width: 100%; box-sizing: border-box;">
              <div class="m-line" style="display: flex; width: 100%;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u90E8\u7F72</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1;">${l==="\u2014"?'<span class="empty-dash">\u2014</span>':r(l)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u52E4\u52D9\u533A\u5206</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1;">${U==="\u2014"?'<span class="empty-dash">\u2014</span>':r(U)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px; align-items: center;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u72B6\u614B</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1;"><span class="${x}">${r(g)}</span></div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u51FA\u52E4</div><div class="m-v" style="font-family:monospace; font-size:15px; padding-left: 16px; text-align: left; flex: 1;">${P==="\u2014"?'<span class="empty-dash">\u2014</span>':r(P)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u9000\u52E4</div><div class="m-v" style="font-family:monospace; font-size:15px; padding-left: 16px; text-align: left; flex: 1;">${A==="\u2014"?'<span class="empty-dash">\u2014</span>':r(A)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u73FE\u5834</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1; word-break: break-word;">${_==="\u2014"?'<span class="empty-dash">\u2014</span>':r(_)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u4F5C\u696D\u5185\u5BB9</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1; word-break: break-word;">${j==="\u2014"?'<span class="empty-dash">\u2014</span>':r(j)}</div></div>
              <div class="m-line" style="display: flex; width: 100%; margin-top: 4px;"><div class="m-k" style="width: 80px; min-width: 80px; text-align: left; padding-left: 12px; font-weight: 500; color: #475569;">\u5099\u8003</div><div class="m-v" style="padding-left: 16px; text-align: left; flex: 1; word-break: break-word;">${O==="\u2014"?'<span class="empty-dash">\u2014</span>':r(O)}</div></div>
            </td>
          `,Xt=`
              <td class="desktop-only" data-label="\u793E\u54E1\u756A\u53F7" style="text-align:left;"><span>${r(f)}</span></td>
              <td class="desktop-only" data-label="\u6C0F\u540D" style="font-weight: 600; color: #0f172a;"><span>${r(p)}</span></td>
            <td class="desktop-only" data-label="\u90E8\u7F72">${l==="\u2014"?'<span class="empty-dash">\u2014</span>':`<span>${r(l)}</span>`}</td>
            <td class="desktop-only" data-label="\u52E4\u52D9\u533A\u5206">${U==="\u2014"?'<span class="empty-dash">\u2014</span>':`<span>${r(U)}</span>`}</td>
            <td class="desktop-only" data-label="\u72B6\u614B" style="text-align:left;"><span class="${x}">${r(g)}</span></td>
            ${P==="\u2014"?R("\u51FA\u52E4").replace("<td",'<td class="desktop-only"'):`<td class="desktop-only" data-label="\u51FA\u52E4" style="text-align:left; font-family:monospace; font-size:15px;"><span>${r(P)}</span></td>`}
            ${A==="\u2014"?R("\u9000\u52E4").replace("<td",'<td class="desktop-only"'):`<td class="desktop-only" data-label="\u9000\u52E4" style="text-align:left; font-family:monospace; font-size:15px;"><span>${r(A)}</span></td>`}
            ${_==="\u2014"?R("\u73FE\u5834").replace("<td",'<td class="desktop-only"'):`<td class="desktop-only" data-label="\u73FE\u5834"><div style="font-size:14px; color:#475569; word-break:break-word; max-width:200px;">${r(_)}</div></td>`}
            ${j==="\u2014"?R("\u4F5C\u696D\u5185\u5BB9").replace("<td",'<td class="desktop-only"'):`<td class="desktop-only" data-label="\u4F5C\u696D\u5185\u5BB9"><div style="font-size:14px; color:#475569; word-break:break-word; white-space:pre-wrap; max-width:400px; max-height:none; overflow:visible;">${r(j)}</div></td>`}
            ${O==="\u2014"?R("\u5099\u8003").replace("<td",'<td class="desktop-only"'):`<td class="desktop-only" data-label="\u5099\u8003"><div style="font-size:14px; color:#475569; word-break:break-word; white-space:pre-wrap; max-width:300px;">${r(O)}</div></td>`}
          `;q.innerHTML=Wt+Xt,m.classList.add("attrec-emp-like-table"),I.appendChild(q)}m.appendChild(I);const M=document.createElement("div");if(M.className="emp-list-scroll-wrap attrec-list-scroll-wrap",M.style.overflowX="auto",M.style.overflowY="visible",M.style.width="100%",M.style.position="relative",M.appendChild(m),e.appendChild(M),a.length>C){const d=Math.ceil(a.length/C),f=document.createElement("div");f.className="pagination-controls",f.style.display="flex",f.style.alignItems="center",f.style.justifyContent="flex-end",f.style.gap="8px",f.style.padding="8px 16px",f.style.backgroundColor="#ffffff",f.style.borderTop="1px solid #d9d9d9";const p=document.createElement("button");p.type="button",p.innerHTML="&#9664;",p.className="pagination-btn",p.style.background="transparent",p.style.border="1px solid transparent",p.style.color="#0854a0",p.style.fontSize="14px",p.style.padding="4px 8px",p.style.cursor="pointer",p.style.borderRadius="4px",p.disabled=u===1,p.disabled&&(p.style.color="#94a3b8",p.style.cursor="not-allowed"),p.onmouseover=()=>{p.disabled||(p.style.backgroundColor="#f4f5f6")},p.onmouseout=()=>{p.disabled||(p.style.backgroundColor="transparent")},p.onclick=()=>{u>1&&(u--,et())};const l=document.createElement("button");l.type="button",l.innerHTML="&#9654;",l.className="pagination-btn",l.style.background="transparent",l.style.border="1px solid transparent",l.style.color="#0854a0",l.style.fontSize="14px",l.style.padding="4px 8px",l.style.cursor="pointer",l.style.borderRadius="4px",l.disabled=u===d,l.disabled&&(l.style.color="#94a3b8",l.style.cursor="not-allowed"),l.onmouseover=()=>{l.disabled||(l.style.backgroundColor="#f4f5f6")},l.onmouseout=()=>{l.disabled||(l.style.backgroundColor="transparent")},l.onclick=()=>{u<d&&(u++,et())};const i=document.createElement("span");i.textContent=`\u30DA\u30FC\u30B8 ${u} / ${d} (${a.length} \u4EF6)`,i.style.fontSize="13px",i.style.color="#6a6d70",i.style.marginRight="8px",f.appendChild(i),f.appendChild(p),f.appendChild(l),e.appendChild(f)}};et()}catch(o){if(o&&o.name==="AbortError"||!D)return;e&&(e.innerHTML=`
          <div class="empty-state" style="color:#b00020;">
            <div style="font-size:28px;">\u26A0\uFE0F</div>
            <div>\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${r(o&&o.message?o.message:"unknown")}</div>
          </div>
        `)}},y=document.getElementById("rosterDate"),w=document.getElementById("rosterDateMobile"),ct=(t,e)=>{const o=String(t||"").slice(0,10),a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(o);if(!a)return t;const n=new Date(Date.UTC(parseInt(a[1],10),parseInt(a[2],10)-1,parseInt(a[3],10)));return isNaN(n.getTime())?t:(n.setUTCDate(n.getUTCDate()+e),n.toISOString().slice(0,10))},G=t=>{y&&(y.value=t),w&&(w.value=t),J()},J=async t=>{const o=(t&&t.target&&t.target.value?t.target.value:"")||(w&&w.value?w.value:"")||(y&&y.value?y.value:"")||v;o&&(y&&(y.value=o),w&&(w.value=o),await st(o))};y&&y.addEventListener("change",J),w&&w.addEventListener("change",J);const z=(t,e)=>{const o=document.getElementById(t);o&&o.addEventListener("click",e)},mt=()=>w&&w.value||y&&y.value||v,bt=()=>{G(ct(mt(),-1))},ft=()=>{G(ct(mt(),1))},ht=()=>G(v);z("rosterPrevDay",bt),z("rosterNextDay",ft),z("rosterToday",ht),z("rosterPrevDayMobile",bt),z("rosterNextDayMobile",ft),z("rosterTodayMobile",ht);let T=null;try{T=await Mt.get("/api/auth/me")}catch{}T&&T.role==="employee"&&$.querySelectorAll(".excel-dropdown-container, #rosterExportXlsx, #rosterExportXlsxMobile").forEach(e=>{e&&(e.style.display="none")});const Q=()=>T&&T.role!=="admin"&&T.role!=="manager"?(alert("\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002"),!1):!0,ut=k.querySelector("#rosterExportMonthXlsx"),gt=document.getElementById("rosterExportMonthXlsxMobile"),xt=async()=>{if(!Q())return;const t=k.querySelector("#rosterMonth"),e=document.getElementById("rosterMonthMobile"),o=t&&t.value?t.value:e&&e.value?e.value:Ht,a=`/api/admin/work-reports/export.xlsx?period=month&month=${encodeURIComponent(o)}`;try{await at(a,`attendance_month_${o}.xlsx`)}catch(n){alert(String(n&&n.message?n.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}};ut&&ut.addEventListener("click",xt),gt&&gt.addEventListener("click",xt),await st(v);const h=document.createElement("form"),Z=new Date(Date.now()+9*3600*1e3).toISOString().slice(0,4);h.innerHTML=`
    <select id="tsUser">${rt.map(t=>`<option value="${t.id}">${t.id} ${t.username||t.email}</option>`).join("")}</select>
    <input id="tsYear" placeholder="Year(YYYY)" value="${Z}" style="width:110px">
    <button type="button" id="tsExportXlsx">Excel</button>
    <input id="tsFrom" placeholder="From(YYYY-MM-DD)" style="width:150px">
    <input id="tsTo" placeholder="To(YYYY-MM-DD)" style="width:150px">
    <button type="submit">\u8868\u793A</button>
    <button type="button" id="tsExport">CSV</button>
  `;const B=document.createElement("div"),N=document.createElement("div");let tt=null;if(Et(B,'button[data-action="day-detail"]',"click",async(t,e)=>{const o=e.dataset.date||"";if(!o||!tt)return;const a=await Ct(tt,o,{signal:L});if(!D)return;N.innerHTML=`<h4>${o} \u7DE8\u96C6</h4>`;const n=document.createElement("table");n.style.width="100%",n.innerHTML="<thead><tr><th>ID</th><th>\u51FA\u52E4</th><th>\u9000\u52E4</th><th>\u4FDD\u5B58</th></tr></thead>";const c=document.createElement("tbody");for(const s of a.segments||[]){const b=document.createElement("tr");b.innerHTML=`
        <td>${s.id}</td>
        <td><input data-in="${s.id}" value="${s.checkIn||""}"></td>
        <td><input data-out="${s.id}" value="${s.checkOut||""}"></td>
        <td><button type="button" data-action="save-att" data-id="${s.id}">\u4FDD\u5B58</button></td>
      `,c.appendChild(b)}n.appendChild(c),N.appendChild(n)}),h.addEventListener("submit",async t=>{t.preventDefault();const e=parseInt(h.querySelector("#tsUser").value,10),o=h.querySelector("#tsFrom").value.trim(),a=h.querySelector("#tsTo").value.trim();tt=e;const n=await Tt(e,o,a,{signal:L});if(!D)return;B.innerHTML="",N.innerHTML="";const c=document.createElement("table");c.style.width="100%",c.innerHTML="<thead><tr><th>\u65E5\u4ED8</th><th>\u901A\u5E38</th><th>\u6B8B\u696D</th><th>\u6DF1\u591C</th><th>\u64CD\u4F5C</th></tr></thead>";const s=document.createElement("tbody");for(const b of n.days||[]){const u=document.createElement("tr");u.innerHTML=`<td>${b.date}</td><td>${b.regularMinutes}</td><td>${b.overtimeMinutes}</td><td>${b.nightMinutes}</td><td><button type="button" data-action="day-detail" data-date="${b.date}">\u8A73\u7D30</button></td>`,s.appendChild(u)}c.appendChild(s),B.appendChild(c)}),h.querySelector("#tsExport").addEventListener("click",()=>{if(!Q())return;const t=parseInt(h.querySelector("#tsUser").value,10),e=h.querySelector("#tsFrom").value.trim(),o=h.querySelector("#tsTo").value.trim(),a=Lt(String(t),e,o);at(a,"timesheet.csv")}),h.querySelector("#tsExportXlsx").addEventListener("click",async()=>{if(!Q())return;const t=parseInt(h.querySelector("#tsUser").value,10),e=h.querySelector("#tsYear"),o=String(e&&e.value?e.value:Z).trim()||Z,a=`/api/admin/employees/${encodeURIComponent(String(t))}/export.xlsx?year=${encodeURIComponent(o)}`;try{const n=h.querySelector("#tsUser"),s=(n&&n.options&&n.options[n.selectedIndex]?n.options[n.selectedIndex].text:String(t)).split(" "),b=s.length>1?s.slice(1).join("_"):String(t);await at(a,`${b}_${o}.xlsx`)}catch(n){alert(String(n&&n.message?n.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}}),!window.location.pathname.includes("/ui/attendance-records")){const t=document.createElement("details");t.open=!1,t.innerHTML='<summary style="cursor:pointer;font-weight:900;padding:10px 0;">\u500B\u4EBA\u30BF\u30A4\u30E0\u30B7\u30FC\u30C8\uFF08\u8A73\u7D30\uFF09</summary>',t.appendChild(h),t.appendChild(B),t.appendChild(N),$.appendChild(t),Et(t,'button[data-action="save-att"]',"click",async(e,o)=>{const a=o.dataset.id||"";if(!a)return;const n=t.querySelector(`input[data-in="${a}"]`),c=t.querySelector(`input[data-out="${a}"]`),s=n&&n.value?n.value:null,b=c&&c.value?c.value:null;await Dt(a,{checkIn:s,checkOut:b},{signal:L}),alert("\u4FDD\u5B58\u3057\u307E\u3057\u305F")})}return()=>{try{$.innerHTML=""}catch{}V.run()}}const ne=Vt({mount:zt});export{ne as attendancePage,oe as mountAttendance};
