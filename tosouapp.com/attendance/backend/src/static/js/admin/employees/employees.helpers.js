const c=e=>document.querySelector(e);function s(){try{if(!document.querySelector("#empPillStyle")){const e=document.createElement("style");e.id="empPillStyle",e.textContent=`
        /* Employee list container */
        .admin .emp-list-scroll-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 0;
          background: #fff;
        }
        
        /* Employee table base */
        .admin .card table#list {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          min-width: 900px;
        }
        
        /* Table header */
        .admin .card table#list thead th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          font-size: 13px;
          padding: 12px 16px;
          text-align: left;
          white-space: nowrap;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        /* Table body rows */
        .admin .card table#list tbody td {
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          padding: 12px 16px;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          white-space: nowrap;
          vertical-align: middle;
        }
        
        .admin .card table#list tbody tr:hover td {
          background: #f8fafc;
        }
        
        /* Action buttons styling */
        .admin .card table#list .emp-action-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .card table#list .emp-action-group .emp-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 32px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .card table#list .emp-action-group .emp-action:hover {
          background: #f1f5f9;
          border-color: #9ca3af;
        }
        
        .admin .card table#list .emp-action-group .emp-action.danger {
          color: #dc2626;
          border-color: #fecaca;
        }
        
        .admin .card table#list .emp-action-group .emp-action.danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        
        /* Status pill styling */
        .admin .card table#list .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .status-pill.active {
          background: #dcfce7;
          color: #166534;
        }
        
        .admin .card table#list .status-pill.inactive {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .status-pill.retired {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        /* Role pill styling */
        .admin .card table#list .role-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .role-pill.admin {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .admin .card table#list .role-pill.manager {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .role-pill.employee {
          background: #dbeafe;
          color: #1e40af;
        }
        
        /* Type pill styling */
        .admin .card table#list .type-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .admin .card table#list .type-pill.full {
          background: #dcfce7;
          color: #166534;
        }
        
        .admin .card table#list .type-pill.part {
          background: #fef3c7;
          color: #92400e;
        }
        
        .admin .card table#list .type-pill.contract {
          background: #dbeafe;
          color: #1e40af;
        }
        
        /* Text pill styling */
        .admin .card table#list .text-pill {
          display: inline-flex;
          align-items: center;
          font-size: 14px;
          color: #1e293b;
        }
        
        .admin .card table#list .text-pill.neutral {
          background: transparent;
          color: #1e293b;
        }
        
        /* Inactive/Retired row styling */
        .admin .card table#list tbody tr.emp-row.inactive td {
          background: #fffbeb;
        }
        
        .admin .card table#list tbody tr.emp-row.retired td {
          background: #f9fafb;
          color: #6b7280;
        }
        
        /* Name link styling */
        .admin .card table#list .col-name a {
          color: #1e40af;
          text-decoration: none;
          font-weight: 600;
        }
        
        .admin .card table#list .col-name a:hover {
          text-decoration: underline;
        }
        
        /* Filter bar styling */
        .admin .emp-filters.filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
          flex-wrap: wrap;
        }
        
        .admin .emp-filters.filter-bar .fi {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .emp-filters.filter-bar .fi-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
        }
        
        .admin .emp-filters.filter-bar .fi-code,
        .admin .emp-filters.filter-bar .fi-name,
        .admin .emp-filters.filter-bar .fi-select {
          height: 36px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        
        .admin .emp-filters.filter-bar .fi-code:focus,
        .admin .emp-filters.filter-bar .fi-name:focus,
        .admin .emp-filters.filter-bar .fi-select:focus {
          border-color: #3b82f6;
        }
        
        .admin .emp-filters.filter-bar .btn {
          height: 36px;
          padding: 0 20px;
          border: 1px solid #0f172a;
          border-radius: 0;
          background: #0f172a;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .emp-filters.filter-bar .btn:hover {
          background: #1e293b;
        }
        
        /* Pagination styling */
        .admin .card > div:has(#empPrev) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          gap: 16px;
        }
        
        .admin .pager-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .admin .pager-left button {
          height: 36px;
          padding: 0 16px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .admin .pager-left button:hover:not(:disabled) {
          background: #f1f5f9;
        }
        
        .admin .pager-left button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .admin #empPageInfo {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }
        
        /* Page size selector */
        .admin .pager-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin .pager-right label {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }
        
        .admin .pager-right select {
          height: 36px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 0;
          background: #fff;
          color: #1e293b;
          font-size: 14px;
        }
        
        @media (max-width: 640px) {
          .admin .card table#list {
            min-width: 100%;
          }
          
          .admin .emp-filters.filter-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .admin .emp-filters.filter-bar .fi {
            width: 100%;
          }
          
          .admin .emp-filters.filter-bar .fi-code,
          .admin .emp-filters.filter-bar .fi-name,
          .admin .emp-filters.filter-bar .fi-select {
            flex: 1;
            width: 100%;
          }
        }
      `,document.head.appendChild(e)}}catch{}}const p=()=>{try{sessionStorage.removeItem("navSpinner")}catch{}},f=()=>{try{const e=document.querySelector("#adminContent");e&&(e.style.visibility="")}catch{}},o=()=>{try{const e=document.querySelector(".topbar .search");if(!e)return null;const t=e.querySelector('input[type="search"]'),r=e.querySelector(".search-hint"),i=e.querySelector(".search-meta"),a=e.querySelector(".search-close");return{searchBox:e,input:t,hint:r,meta:i,closeBtn:a}}catch{return null}},l=()=>{try{const e=o(),t=e&&e.closeBtn;if(!t||t.dataset.empClearBound==="1")return;t.dataset.empClearBound="1";const r=i=>{try{i.preventDefault()}catch{}try{i.stopPropagation()}catch{}try{window.location.assign("/admin/employees#list")}catch{window.location.href="/admin/employees#list"}};t.addEventListener("pointerdown",r,!0),t.addEventListener("click",r,!0)}catch{}},m=e=>{try{l();const t=o();if(!t)return;const{searchBox:r,input:i,meta:a}=t,n=String(e||"").trim();if(i&&(i.value=n),n){r.classList.add("emp-query-active"),a&&a.removeAttribute("aria-hidden");return}r.classList.remove("emp-query-active")}catch{}},d=()=>{try{const e=o(),t=e&&e.searchBox;if(!t)return;t.classList.remove("emp-no-result");const r=e.hint;if(!r)return;const i=String(r.dataset.defaultText||"").trim();r.textContent=i||"Ctrl+K",r.removeAttribute("title"),r.style.display=""}catch{}},b=e=>{try{const t=document.querySelector(".topbar .search");if(!t)return;const r=t.querySelector(".search-hint");if(!r)return;r.dataset.defaultText||(r.dataset.defaultText=String(r.textContent||"Ctrl+K"));const i=String(e||"").trim();if(!i){d();return}const a=`\u300C${i}\u300D\u306B\u4E00\u81F4\u3059\u308B\u793E\u54E1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093`;t.classList.add("emp-no-result"),r.textContent=a,r.title=a,r.style.display="inline-flex"}catch{}};function u(e,t,r,i,a,n){return i?"edit":r?"detail":n||e==="/admin/employees/add"?"add":e==="/admin/employees/delete"?"delete":t==="#add"?"add":t==="#delete"?"delete":t==="#edit"?"edit":"list"}const g=e=>{const t=String(e||"");return t==="/admin/employees"||t==="/admin/employees/"||t.startsWith("/admin/employees/")};export{c as $,l as bindTopbarSearchClear,d as clearTopbarNoResultState,s as ensureEmployeePillStyle,u as getEmployeesMode,o as getTopbarSearchParts,f as hideNavSpinner,g as isEmployeesPath,b as setTopbarNoResultState,p as showNavSpinner,m as syncTopbarSearchKeyword};
