import{delegate as V}from"../_shared/dom.js";import{api as M}from"../../shared/api/client.js";function oe(e){return Array.isArray(e)?e:e&&Array.isArray(e.rows)?e.rows:[]}function _(){if(document.getElementById("leave-unified-style"))return;const e=document.createElement("style");e.id="leave-unified-style",e.textContent=`
    .leave-page { 
      font-family: Inter, "Noto Sans JP", sans-serif;
      color: #111827; 
      background: transparent !important; 
      border: none !important; 
      box-shadow: none !important; 
      padding: 16px !important; 
      margin: 0 !important;
      width: auto;
      max-width: 100%;
      overflow-x: auto;
      box-sizing: border-box;
    }
    .leave-page-layout {
      display: block;
      margin-top: 0;
      padding: 0;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    
    /* Custom Scrollbar to match Render style */
    .leave-page-layout *::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .leave-page-layout *::-webkit-scrollbar-track {
      background: transparent;
    }
    .leave-page-layout *::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    .leave-page-layout *::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    .leave-sidebar {
      display: none;
    }
    .leave-tabs-vertical {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .leave-tab {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #4B5563;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      text-align: left;
      transition: all 0.2s ease;
      background: transparent;
      font-family: Inter, "Noto Sans JP", sans-serif;
    }
    .leave-tab svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.7;
    }
    .leave-tab:hover {
      background: #F3F4F6;
      color: #111827;
    }
    .leave-tab:hover svg {
      opacity: 1;
    }
    .leave-tab.active {
      color: #7928CA;
      font-weight: 600;
      background: #F4EEFF;
    }
    .leave-tab.active svg {
      opacity: 1;
      color: #7928CA;
    }
    .leave-content-area {
      flex: 1;
      min-width: 0;
      background: #FFFFFF;
      padding: 16px 24px 32px 24px;
      overflow-x: auto;
      overflow-y: auto;
      box-sizing: border-box;
    }
    .leave-tab-content {
      display: none;
    }
    .leave-tab-content.active {
      display: block;
    }
      
    .leave-page #tab-balances .leave-toolbar {
      display: none !important;
    }
    .leave-page #tab-balances .leave-pager {
      display: none !important;
    }
    .leave-page h3 {
      margin: 0 0 16px; 
      font-size: 20px; 
      font-weight: 700; 
      letter-spacing: -0.01em; 
      color: #111827;
      padding-left: 0; 
      border-left: 0;
    }
    .leave-section {
      background: transparent; 
      border: none; 
      padding: 0;
      box-shadow: none; 
      min-width: 0; 
      margin-bottom: 12px;
      margin-top: 0;
      display: flex;
      flex-direction: column;
    }
    .leave-section h3, .leave-section h4 {
      margin: 0 0 8px; 
      font-size: 14px; 
      font-weight: 600; 
      color: #111827;
      padding-bottom: 8px; 
      border-bottom: 1px solid #E5E7EB;
    }
    .leave-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 8px; }
    .leave-label { font-size: 11px; color: #4B5563; font-weight: 500; margin-bottom: 4px; display: block; }
    .leave-select, .leave-input {
      min-height: 28px !important; 
      height: 28px !important;
      border: 1px solid #D1D5DB !important; 
      border-radius: 2px !important; 
      padding: 2px 8px !important; 
      background: #FFFFFF !important;
      line-height: 1.5 !important; 
      font-size: 13px !important; 
      font-family: inherit !important; 
      box-sizing: border-box !important; 
      color: #111827 !important; 
      transition: border-color 0.2s ease;
    }
    .leave-select:focus, .leave-input:focus { border-color: #2563EB !important; outline: none !important; }
    .leave-btn {
      min-height: 36px !important; 
      height: 36px !important;
      border: 1px solid #0854A0 !important; 
      border-radius: 4px !important; 
      background: transparent; 
      color: #0854A0 !important;
      padding: 0 16px !important; 
      cursor: pointer; 
      font-size: 14px !important; 
      font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
      font-weight: normal; 
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .leave-btn:hover { background: #E5F0FA; border-color: #0854A0; }
    .leave-btn-primary { background: #0854A0 !important; border-color: #0854A0 !important; color: #FFFFFF !important; }
    .leave-btn-primary:hover { background: #0A6ED1 !important; border-color: #0A6ED1 !important; color: #FFFFFF !important; }
    .leave-btn-danger { background: transparent !important; color: #BB0000 !important; border-color: #BB0000 !important; }
    .leave-btn-danger:hover { background: #FFEEEE !important; }
    .leave-btn-subtle { background: transparent !important; color: #32363A !important; border-color: transparent !important; }
    .leave-btn-subtle:hover { background: #E5E5E5 !important; border-color: transparent !important; }
    .leave-table-wrap {
      overflow: auto; 
      background: #FFFFFF;
      box-shadow: none; 
      max-width: 100%;
      border-radius: 2px !important;
      flex-grow: 1;
    }
    .leave-table-wrap.sticky { max-height: 450px; }
    .leave-page .leave-table { width: 100%; border-collapse: collapse; font-size: 14px; font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif; background: #FFFFFF; }
    .leave-page .leave-table th, .leave-page .leave-table td { border-left: none; border-right: none; }
    .leave-page .leave-table thead th {
      background: #F2F2F2 !important;
      color: #32363A !important;
      -webkit-text-fill-color: #32363A !important;
      text-align: left; 
      font-weight: normal; 
      font-size: 12px;
      padding: 12px 16px; 
      border-bottom: 1px solid #E5E5E5; 
      border-left: none;
      border-right: none;
      white-space: nowrap;
    }
    .leave-page .leave-table thead th * {
      color: #32363A !important;
      -webkit-text-fill-color: #32363A !important;
    }
    .leave-table-wrap.sticky .leave-table thead th { position: sticky; top: 0; z-index: 1; }
    .leave-page .leave-table tbody td { 
      padding: 12px 16px; 
      border-bottom: 1px solid #E5E5E5; 
      vertical-align: middle; 
      color: #111827;
      border-left: none;
      border-right: none;
    }
    .leave-page .leave-table tbody td:last-child {
      position: sticky;
      right: 0;
      background: #FFFFFF;
      z-index: 1;
      border-left: none;
    }
    .leave-page .leave-table thead th:last-child {
      position: sticky;
      right: 0;
      background: #F2F2F2 !important;
      z-index: 2;
      border-left: none;
    }
    .leave-page .leave-table tbody tr:hover td {
      background: #F4F4F4 !important;
    }
    .leave-page .leave-table tbody tr:hover td:last-child {
      background: #F4F4F4 !important;
    }
    .leave-page .leave-table .leave-group-header td {
      background: #1F3A68 !important;
      color: #FFFFFF !important;
      font-weight: 700 !important;
      padding: 10px 16px;
      border-bottom: 1px solid #1F3A68 !important;
      font-size: 13px;
    }
    .leave-page .leave-table .leave-group-header:hover td {
      background: #1F3A68 !important;
    }
    .leave-page .leave-table .leave-group-company {
      font-size: 14px;
    }
    .leave-page .leave-table .leave-group-branch {
      font-weight: 600 !important;
      opacity: 0.85;
      margin-left: 8px;
      padding-left: 8px;
      border-left: 2px solid rgba(255,255,255,0.4);
    }
    .leave-page .leave-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .leave-badge { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center;
      border-radius: 4px !important; 
      padding: 2px 8px !important; 
      font-size: 12px !important; 
      font-weight: normal; 
      font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
      border: 1px solid transparent; 
    }
    .leave-badge.pending { color: #E9730C; background: #FFF8D6; border-color: #E9730C; }
    .leave-badge.approved { color: #107E3E; background: #F5FAFF; border-color: #107E3E; }
    .leave-badge.rejected { color: #BB0000; background: #FFEBEB; border-color: #BB0000; }
    .leave-grid-main { display: grid; grid-template-columns: minmax(0,1fr); gap: 24px; align-items: start; }
    .leave-grid-full { margin-top: 0; }
    .leave-form-grid {
      display: grid; 
      grid-template-columns: 120px 1fr; 
      gap: 12px 16px; 
      margin-top: 16px; 
      align-items: center; 
      max-width: 480px;
      font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: #FFFFFF;
      padding: 16px 24px;
      border-radius: 4px;
      box-shadow: 0 0 0 1px #E5E5E5, 0 2px 4px 0 rgba(0,0,0,0.05);
    }
    .leave-form-grid > div { display: contents; }
    .leave-form-grid > div > label { 
      text-align: right; 
      margin-bottom: 0; 
      color: #32363A; 
      font-size: 14px; 
      font-weight: normal; 
    }
    .leave-form-grid > div > input, .leave-form-grid > div > select { 
      width: 100%; 
      max-width: 320px; 
      min-height: 32px !important;
      height: 32px !important;
      border: 1px solid #89919A !important;
      border-radius: 2px !important;
      font-size: 14px !important;
      padding: 4px 8px !important;
    }
    .leave-form-grid > div > input:focus, .leave-form-grid > div > select:focus {
      border-color: #0854A0 !important;
      box-shadow: inset 0 0 0 1px #0854A0;
      outline: none;
    }
    .leave-form-grid > div:last-child {
      grid-column: 2; 
      justify-self: start; 
      margin-top: 8px;
    }
    .leave-form-card {
      margin-top: 0; border-top: none; border-radius: 0; padding: 0; background: transparent;
    }
    .leave-form-modern {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .leave-form-modern label {
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      margin-bottom: 6px !important;
      display: block !important;
      text-align: left !important;
    }
    .leave-form-modern input,
    .leave-form-modern select {
      width: 100% !important;
      padding: 10px 12px !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      background: #f9fafb !important;
      box-sizing: border-box !important;
      max-width: none !important;
    }
    .leave-form-modern input:focus,
    .leave-form-modern select:focus {
      border-color: #2563eb !important;
      box-shadow: 0 0 0 3px rgba(37,99,235,.1) !important;
      outline: none !important;
    }
    .leave-form-modern button[type="submit"] {
      padding: 10px 32px !important;
      background: #1e40af !important;
      color: #fff !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      box-shadow: 0 1px 3px rgba(0,0,0,.1) !important;
    }
    .leave-form-modern button[type="submit"]:hover {
      background: #1d4ed8 !important;
    }
    .leave-form-card h4 { margin: 0 0 12px; font-size: 16px; color: #32363A; font-weight: normal; font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif; }
    .leave-form-card p.sub-desc { margin: 0 0 24px; font-size: 14px; color: #6B7280; }
    .leave-mini-note { color: #6B7280; font-size: 13px; margin-top: 12px; }
    .leave-pager { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 16px; }
    .leave-muted { color: #6B7280; font-size: 13px; }
    
    .leave-balance-card {
      background: #FFFFFF;
      border-radius: 4px;
      box-shadow: 0 0 0 1px #E5E5E5, 0 2px 4px 0 rgba(0,0,0,0.05);
      padding: 12px; /* Reduce padding for compactness */
      font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 8px; /* Reduce gap */
    }
    .leave-balance-card:hover {
      box-shadow: 0 0 0 1px #0854A0, 0 4px 8px 0 rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .leave-balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* Reduce min-width for more cards per row */
      gap: 12px; /* Reduce gap between cards */
      margin-top: 12px;
    }
    
    @media (min-width: 1024px) {
      .leave-grid-main { grid-template-columns: minmax(0,1fr) 280px; align-items: stretch; gap: 24px; }
    }

    /* Modal styles */
    .pto-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2147483647 !important; padding: 20px; box-sizing: border-box; }
    .pto-modal { background: #FFFFFF; border-radius: 8px; width: 90%; max-width: 600px; max-height: 100%; display: flex; flex-direction: column; box-shadow: 0 4px 24px rgba(0,0,0,0.2); font-family: Inter, "Noto Sans JP", sans-serif; overflow: hidden; position: relative; }
    .pto-modal-header { padding: 16px 24px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; z-index: 10; flex-shrink: 0; position: sticky; top: 0; width: 100%; box-sizing: border-box; }
    .pto-modal-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
    .pto-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6B7280; padding: 0; display: flex; align-items: center; justify-content: center; transition: color 0.2s; line-height: 1; }
    .pto-modal-close:hover { color: #111827; }
    .pto-modal-body { padding: 24px; overflow-y: auto; flex: 1; min-height: 0; background: #F9FAFB; position: relative; }
    .pto-modal-footer { padding: 16px 24px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 8px; background: #FFFFFF; flex-shrink: 0; position: sticky; bottom: 0; width: 100%; box-sizing: border-box; z-index: 10; }
    
    .pto-grant-row { display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 12px; align-items: center; padding: 16px; border: 1px solid #E5E7EB; border-radius: 6px; margin-bottom: 12px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .pto-grant-row input { padding: 4px 8px; border: 1px solid #89919A; border-radius: 2px; font-size: 14px; width: 100%; box-sizing: border-box; min-height: 32px; }
    .pto-grant-row input:focus { border-color: #0854A0; box-shadow: inset 0 0 0 1px #0854A0; outline: none; }
    .pto-grant-label { font-size: 12px; font-weight: normal; color: #6A6D70; margin-bottom: 4px; display: block; }

    /* Mobile responsive for leave tables */
    @media (max-width: 768px) {
      .leave-table { font-size: 13px !important; width: 100% !important; }
      .leave-table thead { display: none !important; }
      .leave-table tbody { display: block !important; width: 100% !important; }
      .leave-table tbody tr {
        display: block !important;
        border: none !important;
        border-top: 1px solid #e5e7eb !important;
        border-bottom: 1px solid #e5e7eb !important;
        border-radius: 0 !important;
        margin: 0 0 10px 0 !important;
        padding: 10px 12px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .leave-table tbody td {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0 !important;
        border: none !important;
        border-bottom: 1px solid #f1f5f9 !important;
        width: 100% !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        word-break: break-word !important;
      }
      .leave-table tbody td:last-child {
        border-bottom: none !important;
      }
      .leave-table tbody td::before {
        content: attr(data-label);
        font-weight: 600;
        color: #475569;
        font-size: 12px;
        min-width: 80px;
        flex-shrink: 0;
      }
      .leave-toolbar {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
        width: 100% !important;
      }
      .leave-table-wrap {
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
      }
      /* B\u1ECF l\u1EC1 ngang ho\xE0n to\xE0n \u0111\u1EC3 th\u1EBB gi\xE3n S\xC1T hai m\xE9p m\xE0n h\xECnh */
      .leave-page {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .leave-pager {
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 12px !important;
      }
    }
  `,document.head.appendChild(e)}async function pe({host:e,content:N,opts:s,mountApprovalsFn:z}){const l=e||N,D=Number(l.dataset.approvalsRenderSeq||0)+1;l.dataset.approvalsRenderSeq=String(D);const g=()=>String(l.dataset.approvalsRenderSeq||"")!==String(D);_(),l.innerHTML="<h3>\u627F\u8A8D\u30D5\u30ED\u30FC</h3>";const p=String(Object.prototype.hasOwnProperty.call(s||{},"status")?s?.status||"":"pending").trim().toLowerCase(),m=document.createElement("div");m.className="leave-toolbar",m.innerHTML=`
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">\u4F11\u6687\u7533\u8ACB\u30D5\u30A3\u30EB\u30BF\u30FC</span>
      <select id="leaveReqStatusFilter" class="leave-select">
        <option value="">\u3059\u3079\u3066</option>
        <option value="pending">\u627F\u8A8D\u5F85\u3061</option>
        <option value="approved">\u627F\u8A8D\u6E08\u307F</option>
        <option value="rejected">\u5374\u4E0B</option>
      </select>
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">\u6708</span>
      <input id="leaveReqMonthFilter" class="leave-input" type="month">
    </label>
  `,l.appendChild(m);const y=m.querySelector("#leaveReqStatusFilter");y&&(y.value=p);const w=m.querySelector("#leaveReqMonthFilter"),A=document.createElement("div");A.innerHTML='<div style="padding:16px;color:#64748b;text-align:center;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>',l.appendChild(A);const d=y&&y.value?`?status=${encodeURIComponent(y.value)}`:"";let u=[],n=!1;if(p==="pending"){if(n=!0,u=await M.get("/api/leave/pending").catch(()=>[]),g())return}else try{if(u=await M.get(`/api/leave/admin-requests${d}`),g())return}catch{if(u=[],g())return}A.remove();const c=document.createElement("div");c.className="leave-table-wrap";const t=document.createElement("table");t.className="leave-table leave-table-approvals";const i=p==="pending";t.innerHTML=`<thead><tr><th>\u793E\u54E1\u756A\u53F7\u30FB\u6C0F\u540D</th><th>\u671F\u9593</th><th>\u7A2E\u985E</th><th>\u72B6\u614B</th><th>\u6B8B\u6570</th>${i?"<th>\u64CD\u4F5C</th>":""}</tr></thead>`;const h=document.createElement("tbody"),f=document.createElement("div");f.className="leave-pager";let x=1;const C=10,r=Array.isArray(u)?u:[],F=()=>{const b=String(w?.value||"").trim(),L=r.filter(k=>!b||String(k.startDate||"").startsWith(b)||String(k.endDate||"").startsWith(b)),B=L.length,H=Math.max(1,Math.ceil(B/C));x>H&&(x=H);const T=(x-1)*C,I=L.slice(T,T+C),W=i?6:5;h.innerHTML="";let K="",O="";for(const k of I){const j=String(k?.tenant_id??"0"),ee=String(k?.branch_id??"0"),X=String(k?.tenant_name||"\u672A\u8A2D\u5B9A").trim()||"\u672A\u8A2D\u5B9A",G=String(k?.branch_name||"").trim(),Z=j,Y=`${j}__${ee}`;if(Z!==K){const U=document.createElement("tr");U.className="leave-group-header";const ne=G?`<span class="leave-group-branch">${G}</span>`:"";U.innerHTML=`<td colspan="${W}"><span class="leave-group-company">\u{1F3E2} ${X}</span>${ne}</td>`,h.appendChild(U),K=Z,O=Y}else if(G&&Y!==O){const U=document.createElement("tr");U.className="leave-group-header",U.innerHTML=`<td colspan="${W}"><span class="leave-group-company">\u{1F3E2} ${X}</span><span class="leave-group-branch">${G}</span></td>`,h.appendChild(U),O=Y}const ie=String(k?.status||"")==="pending",te=`${k.employee_code||"EMP"+String(k.userId).padStart(3,"0")} ${k?.username||""}`.trim(),Q=document.createElement("tr"),P=String(k.status||"").toLowerCase(),ae=P==="approved"?"approved":P==="rejected"?"rejected":"pending";let J="\u627F\u8A8D\u5F85\u3061";P==="approved"&&(J="\u627F\u8A8D\u6E08\u307F"),P==="rejected"&&(J="\u5374\u4E0B");let R=k.type;R==="paid"?R="\u6709\u7D66":R==="unpaid"&&(R="\u6B20\u52E4"),Q.innerHTML=`
        <td data-label="\u793E\u54E1\u756A\u53F7\u30FB\u6C0F\u540D">${te}</td>
        <td data-label="\u671F\u9593">${k.startDate}\u301C${k.endDate}</td>
        <td data-label="\u7A2E\u985E">${R}</td>
        <td data-label="\u72B6\u614B"><span class="leave-badge ${ae}">${J}</span></td>
        <td data-label="\u6B8B\u6570"><button type="button" class="leave-btn leave-btn-subtle" data-action="balance" data-user="${k.userId}">\u7167\u4F1A</button></td>
        ${i?`<td data-label="\u64CD\u4F5C">
          <button type="button" class="leave-btn leave-btn-primary" data-action="approve" data-app="${k.id}">\u627F\u8A8D</button>
          <button type="button" class="leave-btn leave-btn-danger" data-action="reject" data-app="${k.id}">\u5374\u4E0B</button>
        </td>`:""}`,h.appendChild(Q)}if(!I.length){const k=document.createElement("tr");k.innerHTML=`<td colspan="${W}" style="text-align:center;color:#64748b;padding:20px 8px;">${n?"\u627F\u8A8D\u5F85\u3061\u306E\u4F11\u6687\u7533\u8ACB\u306F\u3042\u308A\u307E\u305B\u3093":p?"\u3053\u306E\u72B6\u614B\u306E\u4F11\u6687\u7533\u8ACB\u306F\u3042\u308A\u307E\u305B\u3093":"\u4F11\u6687\u7533\u8ACB\u306F\u3042\u308A\u307E\u305B\u3093"}</td>`,h.appendChild(k)}f.innerHTML=`
      <button type="button" class="leave-btn" data-pg="prev">\u524D\u3078</button>
      <span class="leave-muted">${B} \u4EF6 / ${x} / ${H} \u30DA\u30FC\u30B8</span>
      <button type="button" class="leave-btn" data-pg="next">\u6B21\u3078</button>
    `,f.querySelectorAll("[data-pg]").forEach(k=>{k.addEventListener("click",()=>{const j=k.getAttribute("data-pg");j==="prev"&&x>1&&(x-=1),j==="next"&&x<H&&(x+=1),F(),a()})})};y&&y.addEventListener("change",async()=>{await z(e||N,{...s||{},status:String(y.value||"")})}),t.appendChild(h),c.appendChild(t),l.appendChild(c);const o=async b=>{const L=b.dataset.action,B=H=>{try{b&&typeof b.disabled<"u"&&(b.disabled=!!H)}catch{}};if(L==="balance"){const H=b.dataset.user;try{B(!0);const T=await M.get(`/api/leave/user-balance?userId=${encodeURIComponent(H)}`);alert(`User ${H} \u6B8B\u6570: ${T.totalAvailable}\u65E5`)}catch(T){alert("\u6B8B\u6570\u53D6\u5F97\u5931\u6557: "+(T&&T.message?T.message:"error"))}finally{B(!1)}return}if(L==="approve"||L==="reject"){const H=b.dataset.app,T=L==="approve"?"approved":"rejected";try{B(!0),await M.patch(`/api/leave/${H}/status`,{status:T}),typeof s?.onDataChanged=="function"&&await s.onDataChanged(),await z(e||N,{...s||{},status:p})}catch(I){alert("\u72B6\u614B\u66F4\u65B0\u5931\u6557: "+(I&&I.message?I.message:"error"))}finally{B(!1)}return}if(L==="pc-approve"||L==="pc-reject"){const H=b.dataset.pc,T=L==="pc-approve"?"approved":"rejected";try{B(!0),await M.patch(`/api/manager/profile-change/${H}/status`,{status:T}),typeof s?.onDataChanged=="function"&&await s.onDataChanged(),await z(e||N,s||{})}catch(I){alert("\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u7533\u8ACB\u66F4\u65B0\u5931\u6557: "+(I&&I.message?I.message:"error"))}finally{B(!1)}return}},a=()=>{l.querySelectorAll("[data-action]").forEach(b=>{b.onclick=async L=>{L.preventDefault(),L.stopPropagation(),await o(b)}})};if(F(),a(),l.appendChild(f),w&&w.addEventListener("change",()=>{x=1,F(),a()}),s?.hideProfileSection)return;const $=document.createElement("div");$.innerHTML="<h4>\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u66F4\u65B0\u7533\u8ACB</h4>";const S=await M.get("/api/manager/profile-change/pending");if(g())return;const v=document.createElement("div");v.className="leave-table-wrap";const E=document.createElement("table");E.className="leave-table",E.innerHTML="<thead><tr><th>ID</th><th>User</th><th>\u5185\u5BB9</th><th>\u9001\u4FE1\u65E5\u6642</th><th>\u64CD\u4F5C</th></tr></thead>";const q=document.createElement("tbody");for(const b of S){const L=b.fields||{},B=Object.keys(L).slice(0,6).map(T=>`${T}: ${String(L[T]).slice(0,20)}`).join(", "),H=document.createElement("tr");H.innerHTML=`
      <td>${b.id}</td>
      <td>${b.userId} ${b.username||""}</td>
      <td>${B}</td>
      <td>${b.createdAt||""}</td>
      <td>
        <button type="button" class="leave-btn leave-btn-primary" data-action="pc-approve" data-pc="${b.id}">\u627F\u8A8D</button>
        <button type="button" class="leave-btn leave-btn-danger" data-action="pc-reject" data-pc="${b.id}">\u5374\u4E0B</button>
      </td>`,q.appendChild(H)}if(!(Array.isArray(S)&&S.length)){const b=document.createElement("tr");b.innerHTML='<td colspan="5" style="text-align:center;color:#64748b;padding:14px 8px;">\u627F\u8A8D\u5F85\u3061\u306E\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u66F4\u65B0\u7533\u8ACB\u306F\u3042\u308A\u307E\u305B\u3093</td>',q.appendChild(b)}E.appendChild(q),v.appendChild(E),$.appendChild(v),l.appendChild($),a()}async function ce({content:e}){e.innerHTML="<h3>\u6709\u7D66\u4F11\u6687\u7BA1\u7406</h3>";const N=await M.get("/api/leave/summary"),s=document.createElement("table");s.style.width="100%",s.innerHTML="<thead><tr><th>User</th><th>\u90E8\u9580</th><th>\u4ED8\u4E0E\u5408\u8A08</th><th>\u4F7F\u7528</th><th>\u6B8B</th></tr></thead>";const z=document.createElement("tbody");for(const l of N){const D=p=>{const m=Math.round(Number(p||0)*10)/10;return Number.isInteger(m)?String(m):m.toFixed(1)},g=document.createElement("tr");g.innerHTML=`
      <td>${l.userId} ${l.name||""}</td>
      <td>${l.departmentId==null?"":l.departmentId}</td>
      <td>${D(l.totalGranted)}</td>
      <td>${D(l.usedDays)}</td>
      <td>${D(l.remainingDays)}</td>`,z.appendChild(g)}s.appendChild(z),e.appendChild(s)}async function me({host:e,content:N,opts:s,listUsers:z,mountApprovalsFn:l,mountLeaveBalanceFn:D}){const g=e||N;if(_(),!(s&&s.unified)){const r=document.createElement("div");s&&s.hub?r.innerHTML=`
        <span class="btn">\u6709\u7D66\u4ED8\u4E0E</span>
        <button class="btn" data-action="go-approvals">\u6709\u7D66\u7533\u8ACB\u627F\u8A8D</button>
        <button class="btn" data-action="go-balance">\u6709\u7D66\u6B8B\u65E5\u6570\u4E00\u89A7</button>
        <button class="btn" data-action="auto-grant">\u81EA\u52D5\u4ED8\u4E0E \u5B9F\u884C</button>
      `:r.innerHTML=`
        <a class="btn" href="/ui/admin?tab=leave_grant">\u6709\u7D66\u4ED8\u4E0E</a>
        <a class="btn" href="/ui/admin?tab=approvals">\u6709\u7D66\u7533\u8ACB\u627F\u8A8D</a>
        <a class="btn" href="/ui/admin?tab=leave_balance">\u6709\u7D66\u6B8B\u65E5\u6570\u4E00\u89A7</a>
        <button class="btn" data-action="auto-grant">\u81EA\u52D5\u4ED8\u4E0E \u5B9F\u884C</button>
      `,g.appendChild(r)}const p=document.createElement("div");p.style.cssText="display:none;",p.innerHTML=`
    <div class="leave-toolbar" style="margin:0 0 12px;display:flex;align-items:center;gap:12px;">
      <strong style="color:#32363A;font-weight:normal;font-size:16px;margin-right:auto;">\u4ED8\u4E0E\u5BFE\u8C61\u5019\u88DC</strong>
      <button class="leave-btn" data-action="load-eligible">\u5019\u88DC\u3092\u8AAD\u8FBC</button>
      <button class="leave-btn leave-btn-primary" data-action="grant-eligible">\u5019\u88DC\u3092\u4E00\u62EC\u4ED8\u4E0E</button>
    </div>
    <div style="margin-bottom:8px;"><span id="eligibleInfo" style="color:#6A6D70;font-size:13px;"></span></div>
    <div id="eligibleTableHost"></div>
  `,g.appendChild(p);const m=p.querySelector("#eligibleInfo"),y=p.querySelector("#eligibleTableHost");let w=[];const A=r=>`${r.userId}|${r.grantDate}|${r.days}`,d=new Set,u=r=>{const F=Array.isArray(r)?r:[];if(w=F,!F.length){y.innerHTML='<div class="leave-mini-note">\u4ED8\u4E0E\u5019\u88DC\u306F\u3042\u308A\u307E\u305B\u3093</div>';return}const o=document.createElement("div");o.className="leave-table-wrap sticky";const a=document.createElement("table");a.className="leave-table",a.innerHTML='<thead><tr><th><input type="checkbox" id="eligibleCheckAll"></th><th>User</th><th>\u5165\u793E\u65E5</th><th>\u4ED8\u4E0E\u65E5</th><th>\u65E5\u6570</th><th>\u51FA\u52E4\u7387</th><th>\u5224\u5B9A\u671F\u9593</th></tr></thead>';const $=document.createElement("tbody");for(const v of F){const E=A(v),q=document.createElement("tr");q.innerHTML=`
        <td><input type="checkbox" data-eligible-key="${E}" ${d.has(E)?"checked":""}></td>
        <td>${v.userId}${v.employeeCode?` (${v.employeeCode})`:""} ${v.username||""}</td>
        <td>${v.hireDate||""}</td>
        <td>${v.grantDate||""}</td>
      <td class="num">${v.days||0}</td>
      <td class="num">${v.attendanceRate||0}%</td>
        <td>${v.periodStart||""}\u301C${v.periodEnd||""}</td>
      `,$.appendChild(q)}a.appendChild($),y.innerHTML="",o.appendChild(a),y.appendChild(o);const S=y.querySelector("#eligibleCheckAll");S&&S.addEventListener("change",()=>{const v=!!S.checked;y.querySelectorAll("input[data-eligible-key]").forEach(E=>{E.checked=v;const q=E.getAttribute("data-eligible-key");q&&(v?d.add(q):d.delete(q))})}),y.querySelectorAll("input[data-eligible-key]").forEach(v=>{v.addEventListener("change",()=>{const E=v.getAttribute("data-eligible-key");E&&(v.checked?d.add(E):d.delete(E))})})};V(g,"[data-action]","click",async(r,F)=>{const o=F.dataset.action;if(o==="auto-grant")try{const a=await M.post("/api/leave/auto-grant/run");alert(`\u81EA\u52D5\u4ED8\u4E0E \u5B9F\u884C: ${a.ok||0}/${a.processed||0}`),typeof s?.onDataChanged=="function"&&await s.onDataChanged()}catch(a){alert("\u81EA\u52D5\u4ED8\u4E0E\u5931\u6557: "+(a&&a.message?a.message:"error"))}else if(o==="load-eligible")try{const a=await M.get("/api/leave/eligible-list"),$=Array.isArray(a?.rows)?a.rows:[];m&&(m.textContent=`mode=${a?.mode||"-"} / \u4EF6\u6570=${$.length}`),u($)}catch{m&&(m.textContent="\u5019\u88DC\u8AAD\u8FBC\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}else if(o==="grant-eligible")try{const a=w.filter(E=>d.has(A(E))),$=a.length?a:w;let S=0;for(const E of $){const q=String(E.grantDate||"").slice(0,10);if(!q)continue;const b=new Date(q+"T00:00:00Z");b.setUTCFullYear(b.getUTCFullYear()+2),b.setUTCDate(b.getUTCDate()-1);const L=b.toISOString().slice(0,10);await M.post("/api/leave/grant",{userId:Number(E.userId),days:Number(E.days||0),grantDate:q,expiryDate:L}),S+=1}m&&(m.textContent=`\u9078\u629E=${$.length} / \u4ED8\u4E0E=${S}`);const v=await M.get("/api/leave/eligible-list");d.clear(),u(v?.rows||[]),typeof s?.onDataChanged=="function"&&await s.onDataChanged()}catch(a){alert("\u4E00\u62EC\u4ED8\u4E0E\u5931\u6557: "+(a&&a.message?a.message:"error"))}else o==="go-approvals"&&s&&s.hub?l(g,{hub:!0}):o==="go-balance"&&s&&s.hub&&D(g,{hub:!0})});const n=oe(await z()),c=document.createElement("form"),t=new Date,i=r=>r.toISOString().slice(0,10),h=new Date(Date.UTC(t.getUTCFullYear()+2,t.getUTCMonth(),t.getUTCDate()-1));c.className="leave-form-modern",c.innerHTML=`
    <div style="margin-bottom:16px;">
      <label class="leave-label">\u30E6\u30FC\u30B6\u30FC</label>
      <select id="grantUser"></select>
    </div>
    <div style="margin-bottom:16px;">
      <label class="leave-label">\u65E5\u6570</label>
      <input id="grantDays" type="number" min="1" value="10">
    </div>
    <div style="margin-bottom:16px;">
      <label class="leave-label">\u4ED8\u4E0E\u65E5</label>
      <input id="grantDate" type="date" value="${i(t)}">
    </div>
    <div style="margin-bottom:16px;">
      <label class="leave-label">\u6709\u52B9\u671F\u9650</label>
      <input id="expireDate" type="date" value="${i(h)}">
    </div>
    <div style="margin-top:20px;">
      <button type="submit">\u4ED8\u4E0E</button>
    </div>
  `;const f=c.querySelector("#grantUser");for(const r of n){const F=String(r?.role||"").toLowerCase();if(F==="admin"||F==="manager")continue;const o=document.createElement("option");o.value=String(r.id);const a=r.employee_code||"EMP"+String(r.id).padStart(3,"0");o.textContent=`${a} ${r.username||r.email}`,f.appendChild(o)}c.querySelector("#grantDate").addEventListener("change",r=>{try{const F=new Date(r.target.value+"T00:00:00Z"),o=new Date(Date.UTC(F.getUTCFullYear()+2,F.getUTCMonth(),F.getUTCDate()-1));c.querySelector("#expireDate").value=i(o)}catch{}});const x=document.createElement("div");x.className="leave-mini-note",c.addEventListener("submit",async r=>{r.preventDefault();const F=parseInt(f.value,10),o=parseInt(c.querySelector("#grantDays").value,10),a=c.querySelector("#grantDate").value,$=c.querySelector("#expireDate").value;try{await M.post("/api/leave/grant",{userId:F,days:o,grantDate:a,expiryDate:$}),x.textContent="\u4ED8\u4E0E\u3057\u307E\u3057\u305F",typeof s?.onDataChanged=="function"&&await s.onDataChanged()}catch(S){x.textContent="\u4ED8\u4E0E\u5931\u6557: "+(S&&S.message?S.message:"error")}});const C=document.createElement("div");C.className="leave-form-card",C.innerHTML=`
    <h4 style="margin-top:16px;">Manual PTO Grant</h4>
  `,C.appendChild(c),C.appendChild(x),g.appendChild(C)}async function re(e,N,s){const z=document.createElement("div");z.className="pto-modal-overlay";const l=document.createElement("div");l.className="pto-modal",l.innerHTML=`
    <div class="pto-modal-header">
      <h3 class="pto-modal-title">${N} - \u6709\u7D66\u4F11\u6687\u306E\u7DE8\u96C6</h3>
      <button class="pto-modal-close">&times;</button>
    </div>
    <div class="pto-modal-body">
      <div id="ptoModalLoading" style="text-align:center; padding: 20px; color:#6B7280;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
      <div id="ptoGrantsList" style="display:none;"></div>
      <div id="ptoUsedSection" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E5E5;">
        <h4 style="font-size: 14px; margin-bottom: 12px; font-weight: normal; color: #32363A;">\u53D6\u5F97\u6E08\u307F\u6709\u7D66\u4F11\u6687</h4>
        <div id="ptoUsedList" style="font-size:13px; color:#32363A;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E5E5;">
        <h4 style="font-size: 14px; margin-bottom: 12px; font-weight: normal; color: #32363A;">\u624B\u52D5\u4ED8\u4E0E\uFF08\u8FFD\u52A0\uFF09</h4>
        <div class="pto-grant-row" style="background: #F4F4F4; box-shadow: none;">
          <div>
            <label class="pto-grant-label">\u4ED8\u4E0E\u65E5 (Grant Date)</label>
            <input type="date" id="newGrantDate" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div>
            <label class="pto-grant-label">\u65E5\u6570 (Days)</label>
            <input type="number" id="newGrantDays" min="1" step="1" placeholder="\u65E5\u6570">
          </div>
          <div>
            <label class="pto-grant-label">\u6709\u52B9\u671F\u9650 (Expiry)</label>
            <input type="date" id="newGrantExpiry">
          </div>
          <div style="align-self: flex-end;">
              <button class="leave-btn" id="btnAddGrant">\u8FFD\u52A0</button>
            </div>
        </div>
      </div>
    </div>
    <div class="pto-modal-footer">
      <button class="leave-btn secondary pto-modal-close-btn">\u9589\u3058\u308B</button>
    </div>
  `,z.appendChild(l),document.body.appendChild(z),l.querySelectorAll(".pto-modal-close, .pto-modal-close-btn").forEach(d=>d.addEventListener("click",()=>z.remove()));const g=l.querySelector("#ptoModalLoading"),p=l.querySelector("#ptoGrantsList"),m=new Date,y=new Date(m.getUTCFullYear()+2,m.getUTCMonth(),m.getUTCDate()-1);l.querySelector("#newGrantExpiry").value=y.toISOString().slice(0,10);async function w(){g.style.display="block",p.style.display="none";try{const u=(await M.get("/api/leave/user-balance?userId="+e)).grants||[];u.length===0?p.innerHTML='<div style="color:#6B7280; font-size:13px; text-align:center;">\u4ED8\u4E0E\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093\u3002</div>':p.innerHTML=u.map((n,c)=>`
          <div class="pto-grant-row" data-grant-id="${n.id||""}">
            <div>
              <label class="pto-grant-label">\u4ED8\u4E0E\u65E5</label>
              <input type="date" value="${String(n.grantDate).slice(0,10)}" readonly style="background:#F3F4F6; cursor:not-allowed;">
            </div>
            <div>
              <label class="pto-grant-label">\u65E5\u6570</label>
              <input type="number" class="edit-grant-days" data-idx="${c}" data-date="${String(n.grantDate).slice(0,10)}" data-expiry="${String(n.expiryDate).slice(0,10)}" value="${n.daysGranted}" step="1">
            </div>
            <div>
              <label class="pto-grant-label">\u6709\u52B9\u671F\u9650</label>
              <input type="date" class="edit-grant-expiry" data-idx="${c}" value="${String(n.expiryDate).slice(0,10)}">
            </div>
            <div style="align-self: flex-end; display: flex; gap: 4px;">
              <button class="leave-btn secondary btn-save-grant" data-idx="${c}">\u4FDD\u5B58</button>
              <button class="leave-btn btn-delete-grant" style="background: #FEF2F2; color: #DC2626; border-color: #FCA5A5;" data-idx="${c}">\u524A\u9664</button>
            </div>
          </div>
        `).join(""),p.querySelectorAll(".btn-save-grant").forEach(n=>{n.addEventListener("click",async()=>{const c=n.dataset.idx,t=p.querySelector(`.edit-grant-days[data-idx="${c}"]`),i=p.querySelector(`.edit-grant-expiry[data-idx="${c}"]`),h=t.dataset.date;if(t.value==="")return alert("\u65E5\u6570\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");const f=Number(t.value),x=i.value;n.textContent="...",n.disabled=!0;try{if(await M.post("/api/leave/grant",{userId:Number(e),days:f,grantDate:h,expiryDate:x}),s&&s(),f<=0){await w();return}n.textContent="\u4FDD\u5B58\u6E08",setTimeout(()=>{n.textContent="\u4FDD\u5B58",n.disabled=!1},2e3)}catch(C){alert("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+C.message),n.textContent="\u4FDD\u5B58",n.disabled=!1}})}),p.querySelectorAll(".btn-delete-grant").forEach(n=>{n.addEventListener("click",async()=>{const c=n.dataset.idx,t=p.querySelector(`.edit-grant-days[data-idx="${c}"]`),i=t.dataset.date;if(confirm("\u3053\u306E\u4ED8\u4E0E\u5C65\u6B74\u3092\u524A\u9664\u3057\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")){n.textContent="...",n.disabled=!0;try{await M.post("/api/leave/grant",{userId:Number(e),days:0,grantDate:i,expiryDate:t.dataset.expiry}),s&&s(),await w()}catch(h){alert("\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+h.message),n.textContent="\u524A\u9664",n.disabled=!1}}})})}catch(d){p.innerHTML='<div style="color:#DC2626;">\u30A8\u30E9\u30FC: '+d.message+"</div>"}finally{g.style.display="none",p.style.display="block"}}l.querySelector("#btnAddGrant").addEventListener("click",async d=>{const u=d.currentTarget,n=l.querySelector("#newGrantDate").value,c=Number(l.querySelector("#newGrantDays").value),t=l.querySelector("#newGrantExpiry").value;if(!n||!c||!t)return alert("\u5168\u3066\u306E\u9805\u76EE\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");u.disabled=!0,u.textContent="...";try{await M.post("/api/leave/grant",{userId:Number(e),days:c,grantDate:n,expiryDate:t}),l.querySelector("#newGrantDays").value="",await w(),s&&s()}catch(i){alert("\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+i.message)}finally{u.disabled=!1,u.textContent="\u8FFD\u52A0"}});async function A(){const d=l.querySelector("#ptoUsedList");if(d){d.innerHTML="\u8AAD\u307F\u8FBC\u307F\u4E2D...";try{const u=await M.get("/api/leave/used-days?userId="+e),n=Array.isArray(u.days)?u.days:[],c=Number(u.total||0);if(!n.length){d.innerHTML='<div style="color:#6B7280;">\u53D6\u5F97\u6E08\u307F\u306E\u6709\u7D66\u4F11\u6687\u306F\u3042\u308A\u307E\u305B\u3093\u3002</div>';return}const t=n.map(i=>{const h=Number(i.days)===.5,f=h?"\u534A\u4F11\uFF08\u6709\u7D66\uFF09":"\u6709\u7D66\u4F11\u6687",x=h?"#0E7490":"#107E3E",C=h?"#ECFEFF":"#F5FAFF";return`<div style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #F0F0F0;">
          <span style="font-family:monospace; color:#32363A;">${String(i.date)}</span>
          <span style="display:inline-flex; align-items:center; gap:8px;">
            <span style="font-size:12px; font-weight:600; color:${x}; background:${C}; padding:2px 8px; border-radius:4px;">${f}</span>
            <span style="min-width:36px; text-align:right; font-weight:700; color:#32363A;">${Number(i.days).toFixed(1)}\u65E5</span>
          </span>
        </div>`}).join("");d.innerHTML=`
        <div style="border:1px solid #EAECEE; border-radius:6px; overflow:hidden;">
          ${t}
        </div>
        <div style="text-align:right; margin-top:8px; font-weight:700; color:#32363A;">\u5408\u8A08\u53D6\u5F97: ${c.toFixed(1)}\u65E5</div>
      `}catch(u){d.innerHTML='<div style="color:#DC2626;">\u30A8\u30E9\u30FC: '+(u&&u.message?u.message:"error")+"</div>"}}}await w(),await A()}async function be({host:e,content:N,opts:s,mountLeaveGrantFn:z,mountApprovalsFn:l}){const D=e||N;_(),D.innerHTML='<h3 style="display:flex; align-items:center; gap:8px;"><span style="font-size:20px;">\u{1F4CA}</span> \u6709\u7D66\u6B8B\u65E5\u6570\u4E00\u89A7</h3>';const g=document.createElement("div");g.className="leave-toolbar",g.innerHTML=`
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">\u691C\u7D22</span>
      <input id="leaveBalSearch" class="leave-input" type="text" placeholder="user/id">
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">\u4E26\u3073\u66FF\u3048</span>
      <select id="leaveBalSort" class="leave-select">
        <option value="remainingDays:desc">\u6B8B\uFF08\u65E5\u6570\uFF09\u2193</option>
        <option value="remainingDays:asc">\u6B8B\uFF08\u65E5\u6570\uFF09\u2191</option>
        <option value="nearestExpiry:asc">\u6709\u52B9\u671F\u9650 \u8FD1\u3044\u9806</option>
        <option value="obligationRemaining:desc">\u7FA9\u52D9\u6B8B \u2193</option>
        <option value="userId:asc">User ID \u2191</option>
      </select>
    </label>
    <label style="display:inline-flex;align-items:center;gap:8px;">
      <span class="leave-label">\u4EF6\u6570</span>
      <select id="leaveBalPageSize" class="leave-select">
        <option value="20">20</option>
        <option value="50" selected>50</option>
        <option value="100">100</option>
      </select>
    </label>
  `,D.appendChild(g);let p=[];try{p=await M.get("/api/leave/summary")}catch{p=[];const t=document.createElement("div");t.style.cssText="margin:2px 0 10px;color:#b45309;font-size:12px;",t.textContent="\u6B8B\u65E5\u6570\u30C7\u30FC\u30BF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u7A7A\u30C7\u30FC\u30BF\u3067\u8868\u793A\u3057\u307E\u3059\u3002",D.appendChild(t)}const m=document.createElement("div");m.className="leave-balance-grid";const y=document.createElement("div");y.className="leave-pager";const w=new Date,A=g.querySelector("#leaveBalSearch"),d=g.querySelector("#leaveBalSort"),u=g.querySelector("#leaveBalPageSize");let n=1;const c=()=>{const t=String(A?.value||"").trim().toLowerCase(),[i,h]=String(d?.value||"remainingDays:desc").split(":"),f=Number(u?.value||20)||20,x=(Array.isArray(p)?p:[]).filter(o=>{const a=`${o.employeeCode||o.userId} ${o.name||""}`.toLowerCase();return!t||a.includes(t)}).sort((o,a)=>{const $=o?.[i],S=a?.[i];if(i==="nearestExpiry"){const q=$?new Date($).getTime():Number.MAX_SAFE_INTEGER,b=S?new Date(S).getTime():Number.MAX_SAFE_INTEGER;return h==="desc"?b-q:q-b}const v=Number($||0),E=Number(S||0);return h==="desc"?E-v:v-E}),C=x.length,r=Math.max(1,Math.ceil(C/f));n>r&&(n=r);const F=x.slice((n-1)*f,(n-1)*f+f);m.innerHTML="";for(const o of F){const a=document.createElement("div");a.className="leave-balance-card";let $=!1;o.nearestExpiry&&new Date(o.nearestExpiry)-w<1e3*60*60*24*30&&($=!0,a.style.borderColor="#FCD34D",a.style.background="#FFFBEB");const S=H=>{const T=Math.round(Number(H||0)*10)/10;return Number.isInteger(T)?String(T):T.toFixed(1)},v=S(o.totalGranted||0),E=S(o.usedDays||0),q=S(o.remainingDays||0),b=v>0?v:1,L=Math.min(100,Math.max(0,E/b*100));a.className="leave-balance-card pto-card-clickable",a.dataset.userid=o.userId,a.dataset.username=o.name||`User ${o.userId}`,a.style.cursor="pointer";const B=(o.name||"U").charAt(0).toUpperCase();a.innerHTML=`
        <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid #F2F2F2; padding-bottom:8px;">
          <div style="width:32px; height:32px; border-radius:50%; background:#0854A0; color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${B}</div>
          <div>
            <h3 style="font-size:14px; font-weight:bold; color:#32363A; margin:0; line-height:1.2;">${o.name||`User ${o.userId}`}</h3>
            <p style="font-size:11px; color:#6A6D70; margin:2px 0 0 0;">${o.employeeCode||o.userId}</p>
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:4px;">
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:24px; font-weight:300; color:#111827; line-height:1;">${q} <span style="font-size:12px; font-weight:normal;">days</span></span>
            <span style="font-size:11px; color:#6A6D70; margin-top:2px;">Remaining</span>
          </div>
          <div style="text-align:right;">
            <span style="color:#6A6D70; font-size:11px;">Used: <span style="font-weight:600; color:#32363A;">${E}/${v}</span></span>
          </div>
        </div>
        
        <div style="height:4px; background:#E5E5E5; border-radius:2px; overflow:hidden; margin-top:2px;">
          <div style="height:100%; width:${L}%; background:#0854A0; border-radius:2px;"></div>
        </div>
        
        <div style="font-size:11px; color:#6A6D70; display:flex; justify-content:space-between; margin-top:auto; border-top:1px solid #F2F2F2; padding-top:8px;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span>Expiry</span>
            <span style="${$?"color:#BB0000;font-weight:bold;":"color:#32363A;"}">${o.nearestExpiry||"N/A"}</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:2px; text-align:right;">
            <span>Obligation</span>
            <span style="color:#32363A;">${o.obligationRemaining||0}d</span>
          </div>
        </div>
      `,m.appendChild(a)}F.length||(m.innerHTML='<div style="text-align:center; color:#6B7280; padding:40px; grid-column:1/-1;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093 (No data)</div>'),y.innerHTML=`
      <button type="button" class="leave-btn" data-pg="prev">\u524D\u3078</button>
      <span class="leave-muted">${C} \u4EF6 / ${n} / ${r} \u30DA\u30FC\u30B8</span>
      <button type="button" class="leave-btn" data-pg="next">\u6B21\u3078</button>
    `,y.querySelectorAll("[data-pg]").forEach(o=>{o.addEventListener("click",()=>{const a=o.getAttribute("data-pg");a==="prev"&&n>1&&(n-=1),a==="next"&&n<r&&(n+=1),c()})}),setTimeout(()=>{m.querySelectorAll(".pto-card-clickable").forEach(o=>{o.addEventListener("click",async a=>{a.preventDefault(),a.stopPropagation();const $=o.dataset.userid,S=o.dataset.username;await re($,S,async()=>{try{p=await M.get("/api/leave/summary"),c()}catch(v){console.error("Failed to reload data",v)}})})}),m.querySelectorAll(".leave-btn-edit").forEach(o=>{o.addEventListener("click",a=>{a.stopPropagation(),a.preventDefault()})})},0)};D.appendChild(m),c(),A&&A.addEventListener("input",()=>{n=1,c()}),d&&d.addEventListener("change",()=>{n=1,c()}),u&&u.addEventListener("change",()=>{n=1,c()})}async function ge({content:e,mountLeaveGrantFn:N,mountApprovalsFn:s,mountLeaveBalanceFn:z}){const l=e;l.innerHTML="<h3>\u6709\u7D66\u4F11\u6687</h3>";const D=document.createElement("div");D.innerHTML=`
    <a class="btn" href="/ui/admin">\u623B\u308B</a>
    <button class="btn" data-action="nav-approve">\u6709\u7D66\u7533\u8ACB\u627F\u8A8D</button>
    <button class="btn" data-action="nav-balance">\u6709\u7D66\u6B8B\u65E5\u6570\u4E00\u89A7</button>
  `,l.appendChild(D);const g=document.createElement("div");l.appendChild(g);const p=()=>{N(g,{hub:!0})},m=()=>{s(g,{hub:!0})},y=()=>{z(g,{hub:!0})};function w(d){location.hash!==d&&(location.hash=d),d.includes("grant")?p():d.includes("approve")?m():y()}V(D,"[data-action]","click",(d,u)=>{const n=u.dataset.action;n==="nav-grant"?w("#leave=grant"):n==="nav-approve"?w("#leave=approve"):n==="nav-balance"&&w("#leave=balance")});const A=(location.hash||"").toLowerCase();A.includes("grant")?p():A.includes("approve")?m():y(),window.addEventListener("hashchange",()=>{const d=(location.hash||"").toLowerCase();d.includes("grant")?p():d.includes("approve")?m():y()},{once:!1})}async function ue({content:e,mountApprovalsFn:N,mountLeaveGrantFn:s,mountLeaveBalanceFn:z}){_(),e.classList.add("leave-page");try{document.body.classList.add("leave-active")}catch{}const l=document.createElement("style");if(l.id="leave-dynamic-height",l.textContent=`
    .leave-page-layout {
      width: 100%;
      max-width: 100%;
    }
    .leave-sidebar {
      display: none !important;
    }
    .leave-content-area {
      overflow-x: auto !important;
      max-width: 100%;
    }
    body.admin.has-sidebar .content {
      padding-top: var(--topbar-height, 48px) !important;
      padding-left: 16px !important;
      padding-right: 16px !important;
      padding-bottom: 0 !important;
      margin: 0 !important;
      margin-left: 180px !important;
      width: calc(100% - 180px) !important;
      max-width: calc(100% - 180px) !important;
      overflow-y: auto !important;
      background: #FFFFFF !important;
      border: none !important;
      box-shadow: none !important;
      box-sizing: border-box !important;
    }
    body.admin.has-sidebar #adminContent {
      padding: 16px !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      background: #FFFFFF !important;
      border: none !important;
      box-shadow: none !important;
      margin-top: -1px !important; /* Force pull up to close any 1px gap */
    }
    @media (max-width: 768px) {
      body.admin.has-sidebar .content {
        margin-left: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
      body.admin.has-sidebar #adminContent {
        padding: 8px !important;
      }
    }
    /* Hide the status and error bars if they are empty so they don't take up space */
    body.admin.has-sidebar .status:empty, 
    body.admin.has-sidebar .error:empty {
      display: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `,document.head.appendChild(l),e.id==="adminContent"||e.classList.contains("card")){e.classList.remove("card"),e.style.padding="0",e.style.margin="0",e.style.maxWidth="none",e.style.border="none",e.style.boxShadow="none",e.style.background="#FFFFFF",e.style.height="calc(100vh - var(--topbar-height, 48px))",e.style.overflow="hidden";const t=document.body;t.style.overflow="hidden";const i=e.parentElement;if(i){i.style.padding="0",i.style.margin="0";const h=i.querySelector("#status");h&&(h.style.display="none");const f=i.querySelector("#error");f&&(f.style.display="none")}}e.innerHTML=`
      <div class="leave-page-layout">
        <div class="leave-sidebar">
          <div class="leave-tabs-vertical">
            <button class="leave-tab active" data-target="tab-approvals">
              <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              \u4F11\u6687\u7533\u8ACB\u627F\u8A8D
            </button>
            <button class="leave-tab" data-target="tab-grant">
              <svg viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              \u6709\u7D66\u4ED8\u4E0E
            </button>
            <button class="leave-tab" data-target="tab-balances">
              <svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
              \u6709\u7D66\u6B8B\u65E5\u6570\u4E00\u89A7
            </button>
          </div>
        </div>
        <div class="leave-content-area" id="leave-content-area"></div>
      </div>
    `;const D=e.querySelector("#leave-content-area"),g=document.createElement("div");g.className="leave-tab-content active",g.id="tab-approvals";const p=document.createElement("div");p.className="leave-tab-content",p.id="tab-grant";const m=document.createElement("div");m.className="leave-tab-content",m.id="tab-balances",D.appendChild(g),D.appendChild(p),D.appendChild(m);const y=document.createElement("section");y.className="leave-section",g.appendChild(y);const w=document.createElement("section");w.className="leave-section",w.style.maxWidth="400px",w.style.margin="20px 0 0 0",p.appendChild(w);const A=document.createElement("div");A.style.boxShadow="none",A.style.border="none",A.style.padding="0",A.style.background="transparent",m.appendChild(A);const d=async()=>{await z(A,{unified:!0,limit:1e3,onDataChanged:d});const t=A.querySelector("h3");t&&t.remove()},u=()=>{const t=e.querySelector(".leave-page-layout");if(t){const i=t.getBoundingClientRect().top,f=`calc(100vh - ${i>0?i:56}px)`;t.style.setProperty("height",f,"important");const x=e.querySelector(".leave-sidebar");x&&x.style.setProperty("height",f,"important");const C=e.querySelector(".leave-content-area");C&&C.style.setProperty("height",f,"important"),e.style.setProperty("height",f,"important")}};u(),setTimeout(u,150),window.addEventListener("resize",u),await N(y,{status:"pending",hideProfileSection:!0,onDataChanged:d});const n=y.querySelector("h3");if(n&&n.remove(),await s(w,{unified:!0,onDataChanged:d}),w){const t=w.querySelector(".leave-toolbar");t&&t.remove();const i=w.querySelector("h4");i&&i.remove();const h=w.querySelector("h3");h&&(h.innerHTML="\u6709\u7D66\u4ED8\u4E0E")}await d(),e.querySelectorAll(".leave-tab").forEach(t=>{t.addEventListener("click",i=>{e.querySelectorAll(".leave-tab").forEach(x=>x.classList.remove("active")),e.querySelectorAll(".leave-tab-content").forEach(x=>x.classList.remove("active"));const h=i.currentTarget.getAttribute("data-target");i.currentTarget.classList.add("active"),e.querySelector(`#${h}`).classList.add("active"),h==="tab-approvals"?history.replaceState(null,"","/admin/leave/requests"):h==="tab-grant"?history.replaceState(null,"","/admin/leave/grants"):h==="tab-balances"&&history.replaceState(null,"","/admin/leave/balance");const f=document.querySelector(".att-hub-sidebar");if(f){f.querySelectorAll(".att-sidebar-item").forEach(r=>{r.classList.remove("active"),r.style.borderLeftColor="transparent",r.style.color="#b0c4de",r.style.background="transparent",r.style.fontWeight="400";const F=r.querySelector("svg");F&&(F.style.opacity="0.7")});const x=window.location.pathname,C=f.querySelector(`a[href="${x}"]`);if(C){C.classList.add("active"),C.style.color="#ffffff",C.style.fontWeight="600";const r=f.querySelector('a[href^="/admin/leave"]');if(r){r.classList.add("active"),r.style.borderLeftColor="#4ade80",r.style.color="#ffffff",r.style.background="rgba(255,255,255,.06)",r.style.fontWeight="600";const F=r.querySelector("svg");F&&(F.style.opacity="1")}}}})});const c=window.location.pathname;if(e.querySelectorAll(".leave-tab").forEach(t=>t.classList.remove("active")),e.querySelectorAll(".leave-tab-content").forEach(t=>t.classList.remove("active")),c==="/admin/leave/grants"){const t=e.querySelector('.leave-tab[data-target="tab-grant"]');t&&t.classList.add("active");const i=e.querySelector("#tab-grant");i&&i.classList.add("active")}else if(c==="/admin/leave/balance"){const t=e.querySelector('.leave-tab[data-target="tab-balances"]');t&&t.classList.add("active");const i=e.querySelector("#tab-balances");i&&i.classList.add("active")}else{const t=e.querySelector('.leave-tab[data-target="tab-approvals"]');t&&t.classList.add("active");const i=e.querySelector("#tab-approvals");i&&i.classList.add("active")}}export{pe as mountApprovals,ce as mountLeaveAdmin,be as mountLeaveBalance,me as mountLeaveGrant,ge as mountLeaveHub,ue as mountLeaveUnified};
