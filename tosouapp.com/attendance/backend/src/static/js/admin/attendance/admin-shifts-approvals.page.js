import{fetchJSONAuth as G}from"../../api/http.api.js";let g="",O=[],l=null,q="",M="ALL",H="";window.addEventListener("resize",()=>{if(l&&document.getElementById("monthFilter")){const o=document.getElementById("attHubMobileActions");if(window.innerWidth<=768&&o){let d=document.getElementById("monthFilterMobile");d||(d=document.createElement("input"),d.type="month",d.id="monthFilterMobile",d.style.cssText="height: 32px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 130px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;",o.innerHTML="",o.appendChild(d),d.addEventListener("change",r=>{g=r.target.value,I()})),d.value=g}else o&&(o.innerHTML="")}});async function te({content:o}){l=o,l.style.visibility="";const d=new Date;d.setMonth(d.getMonth()+1),g=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,await I()}function h(o){return o==null?"":String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Q(o){switch(o){case"PENDING":return'<span style="color:#ea580c;font-weight:normal;font-size:12px;">\u672A\u627F\u8A8D</span>';case"APPROVED":return'<span style="color:#16a34a;font-weight:normal;font-size:12px;">\u627F\u8A8D\u6E08</span>';case"REJECTED":return'<span style="color:#dc2626;font-weight:normal;font-size:12px;">\u5DEE\u623B\u3057</span>';case"UNSUBMITTED":return'<span style="color:#94a3b8;font-size:12px;">\u672A\u63D0\u51FA</span>';default:return h(o)}}function ae(){try{const o=Array.from(document.querySelectorAll(".subbar .menu"));if(!o.length)return;const d=()=>o.forEach(r=>r.classList.remove("open"));o.forEach(r=>{const m=r.querySelector(".menu-btn");!m||m.dataset.bound==="1"||(m.dataset.bound="1",m.addEventListener("click",k=>{k.preventDefault(),k.stopPropagation();const z=r.classList.contains("open");d(),z||r.classList.add("open")}))}),document.addEventListener("click",()=>d())}catch{}}async function I(){l&&(l.innerHTML='<div style="padding: 20px; color: #64748b;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>');try{const[o,d]=g.split("-"),r=parseInt(d,10),m=await G(`/api/attendance/shifts/matrix?month=${g}${H?"&department="+encodeURIComponent(H):""}`);O=Array.isArray(m)?m:[],V()}catch(o){l&&(l.innerHTML=`<div style="padding: 20px; color: #dc2626;">\u53D6\u5F97\u5931\u6557: ${h(o.message)}</div>`)}}function V(){if(!l)return;const[o,d]=g.split("-"),r=parseInt(d,10),m=new Date(o,r,0).getDate(),k=new URLSearchParams(window.location.search).get("standalone")==="1",z=k?"100vh":"calc(100vh - var(--topbar-height) - var(--subbar-height))",P=k?"calc(100vh - 62px)":"calc(100vh - var(--topbar-height) - var(--subbar-height) - 62px)";O.forEach(t=>{const e=t.employment_type==="full_time",a=t.schedule||{};let f=0;for(let u=1;u<=m;u++){const w=`${o}-${String(r).padStart(2,"0")}-${String(u).padStart(2,"0")}`,c=a[w];c&&["WORKING","CA_NGAY","CA_CHIEU","CA_DEM","09:00-14:00"].includes(c.status)&&f++}t._workCount=f});const A=O.filter(t=>{if(M!=="ALL"&&(t.submission_status||"UNSUBMITTED")!==M)return!1;if(q){const e=q.toLowerCase(),a=(t.username||"").toLowerCase(),f=(t.employee_code||"").toLowerCase();if(!a.includes(e)&&!f.includes(e))return!1}return!0}),D=`
    /* Force absolute full width for the parent elements */
    #adminContent { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .admin-main { padding: 0 !important; margin: 0 !important; width: 100% !important; overflow-x: hidden !important; }
    body, html { margin: 0 !important; padding: 0 !important; overflow: auto !important; width: 100% !important; height: 100% !important; }
    .portal-main, .portal-layout, .admin-layout { padding: 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; }

    .shift-container { padding: 0 !important; margin: 0 !important; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; background: #FFFFFF; min-height: ${z}; height: ${z}; display: flex; flex-direction: column; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
    .page-header-container { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 0px; padding: 16px 24px 8px 24px; flex-shrink: 0; }
    .page-header-title { display: none; }
    @media (max-width: 768px) { .page-header-container { display: none !important; } .page-header-title { display: none !important; } }

    .shift-table-wrapper { flex: 1; overflow-y: auto; overflow-x: auto; border-top: 1px solid #e2e8f0; border-bottom: none; box-shadow: none; background: white; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; max-height: ${P}; }
    .shift-table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
    .shift-table-wrapper::-webkit-scrollbar-track { background: #f1f5f9; }
    .shift-table-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .shift-table-wrapper::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    .sap-dense-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-family: 'Segoe UI', 'Meiryo', sans-serif; font-size: 11px; margin: 0 !important; background: #fff; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
    .sap-dense-table th, .sap-dense-table td { border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-top: none; border-left: none; padding: 0; text-align: center; vertical-align: middle; height: 22px; width: 50px; box-sizing: border-box; color: #334155; background: #fff; }
    /* Fix top/left borders because of border-collapse: separate */
    .sap-dense-table th { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .sap-dense-table tr th:first-child, .sap-dense-table tr td:first-child { border-left: 1px solid #e2e8f0; }
    .sap-dense-table thead th:last-child { border-right: 1px solid #e2e8f0; }
    .sap-dense-table tbody tr td:last-child { border-right: 1px solid #e2e8f0; }

    /* Fix scrolling bleed using top: -1px and box-shadow */
    .sap-dense-table thead th { position: sticky; top: -1px; z-index: 20; background: #f8fafc; vertical-align: top; border-top: none; border-bottom: 1px solid #e2e8f0; box-shadow: 0 -1px 0 0 #e2e8f0; }
    
    .col-fixed-1 { position: sticky; left: 0; z-index: 15; background: #f8fafc; width: 44px; min-width: 44px; max-width: 44px; font-weight: bold; color: #475569; }
    .col-fixed-2 { position: sticky; left: 44px; z-index: 15; background: #f8fafc; width: 28px; min-width: 28px; max-width: 28px; border-right: 1px solid #e2e8f0 !important; font-weight: bold; color: #475569; }
    .sap-dense-table thead th.col-fixed-1, .sap-dense-table thead th.col-fixed-2 { z-index: 30; vertical-align: middle; background: #f8fafc; border-bottom: 1px solid #e2e8f0; box-shadow: 0 -1px 0 0 #e2e8f0; }
    
    .sap-dense-table tbody .col-fixed-1, .sap-dense-table tbody .col-fixed-2 { background: #f8fafc; font-weight: 600; z-index: 10; border-bottom: 1px solid #e2e8f0; }
    .sap-dense-table tbody tr:hover td { background: #f8fafc; }
    .sap-dense-table tbody tr:hover .col-fixed-1, .sap-dense-table tbody tr:hover .col-fixed-2 { background: #f1f5f9; }

    .emp-col { min-width: 50px; max-width: 60px; padding: 2px !important; z-index: 20 !important; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .emp-col-inner { display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; }
    .emp-name-row { display: flex; justify-content: center; align-items: baseline; gap: 4px; width: 100%; flex-wrap: wrap; margin-bottom: 2px; }
    .emp-name { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; color: #1e293b; max-width: 100%; }
    .emp-code { font-size: 11px; color: #64748b; white-space: nowrap; }
    .emp-info-row { display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; flex-wrap: wrap; }
    .emp-type { }
    .emp-total { font-size: 13px; color: #64748b; font-weight: normal; }
    .emp-status { text-align: center; }
    .emp-action { margin-top: 0; width: auto; }

    /* Cell styles - SAP UI style small squares */
    .cell-work { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-day { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-afternoon { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-night { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave-paid { background: #fef9c3; color: #92400e; border: 1px solid #fde68a; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-leave-special { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; font-weight: bold; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-off { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 3px; font-size: 11px; }
    .cell-empty { color: #94a3b8; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin: 0 auto; font-size: 11px; border: 1px dashed transparent; }

    .badge-sei { background: #eff6ff; color: #1e40af; padding: 2px 4px; border-radius: 2px; font-size: 11px; border: 1px solid #bfdbfe; }
    .badge-bai { background: #dcfce7; color: #166534; padding: 2px 4px; border-radius: 2px; font-size: 11px; border: 1px solid #bbf7d0; }
    
    .btn-xs { padding: 4px 6px; font-size: 11px; border: none; border-radius: 3px; cursor: pointer; color: white; font-weight: bold; white-space: nowrap; }
    .btn-ok { background: #16a34a; }
    .btn-ok:hover { background: #15803d; }
    .btn-ng { background: #dc2626; }
    .btn-ng:hover { background: #b91c1c; }
    
    /* Custom Modal Styles */
    .reason-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: none; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
    .reason-modal-overlay.show { display: flex; opacity: 1; }
    .reason-modal-content { background: white; border-radius: 8px; width: 90%; max-width: 320px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; transform: translateY(20px); transition: transform 0.2s; }
    .reason-modal-overlay.show .reason-modal-content { transform: translateY(0); }
    .reason-modal-header { padding: 12px 16px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a; }
    .reason-modal-body { padding: 16px; font-size: 14px; color: #334155; line-height: 1.5; min-height: 60px; word-break: break-word; }
    .reason-modal-footer { padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; }
    .reason-modal-btn { padding: 6px 16px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .reason-modal-btn:hover { background: #475569; }
    
    /* Mobile specific styles */
    .shift-mobile-list { display: none; flex-direction: column; gap: 12px; padding: 16px; padding-bottom: 32px; background: #f1f5f9; overflow-y: auto; max-height: ${P}; }
    .sac-card { background: white; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px; }
    .sac-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .sac-name-wrap { display: flex; flex-direction: column; gap: 4px; }
    .sac-name { font-weight: bold; font-size: 15px; color: #0f172a; }
    .sac-status { text-align: right; }
    .sac-summary { display: flex; justify-content: space-between; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; color: #475569; }
    .sac-days-scroll { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding-bottom: 8px; margin-bottom: 8px; }
    .sac-day-item { border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; align-items: center; background: #fff; }
    .sac-day-header { width: 100%; text-align: center; font-size: 10px; background: #f8fafc; padding: 2px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
    .sac-day-val { width: 100%; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    @media (max-width: 768px) { .shift-table-wrapper { display: none !important; } .shift-mobile-list { display: flex !important; } }
  `,_=t=>{const a=new Date(o,r-1,t).getDay();return a===0?"color: #dc2626;":a===6?"color: #2563eb;":""},R=t=>{const e=new Date(o,r-1,t);return["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"][e.getDay()]};let b=`
    <style>${D}</style>
    <div class="shift-container">
      <div class="page-header-container" style="padding-right: 8px;">
        <h2 class="page-header-title">\u30B7\u30D5\u30C8\u627F\u8A8D</h2>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <input type="text" id="empSearch" value="${h(q)}" placeholder="\u540D\u524D\u30FB\u756A\u53F7\u3067\u691C\u7D22..." style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 160px; outline: none; box-sizing: border-box;" />
          <select id="statusFilter" style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; background: white; cursor: pointer;">
            <option value="ALL" ${M==="ALL"?"selected":""}>\u5168\u3066 (T\u1EA5t c\u1EA3)</option>
            <option value="PENDING" ${M==="PENDING"?"selected":""}>\u672A\u627F\u8A8D (Ch\u1EDD duy\u1EC7t)</option>
            <option value="APPROVED" ${M==="APPROVED"?"selected":""}>\u627F\u8A8D\u6E08 (\u0110\xE3 duy\u1EC7t)</option>
            <option value="UNSUBMITTED" ${M==="UNSUBMITTED"?"selected":""}>\u672A\u63D0\u51FA (Ch\u01B0a n\u1ED9p)</option>
          </select>
          <select id="deptFilter" style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; background: white; cursor: pointer;">
            <option value="" ${H?"":"selected"}>\u5168\u90E8\u7F72</option>
          </select>
          <input type="month" id="monthFilter" value="${g}" style="height: 34px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 140px; color: #1f2937; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;" />
        </div>
      </div>
      <div class="shift-table-wrapper" style="padding: 0 !important; margin: 0 !important;">
        <table class="sap-dense-table">
          <thead>
            <tr>
              <th class="col-fixed-1">\u65E5\u4ED8</th>
              <th class="col-fixed-2">\u66DC\u65E5</th>
  `;if(A.length===0)b+='</tr></thead><tbody><tr><td colspan="2" style="padding: 20px; color: #94a3b8;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr></tbody></table></div>',b+='<div class="shift-mobile-list"><div style="padding: 20px; text-align: center; color: #94a3b8;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>';else{A.forEach(e=>{const a=e.employment_type==="full_time";let f=Q(e.submission_status||"UNSUBMITTED"),u=`<button class="btn-xs btn-proxy" data-id="${e.id}" data-name="${h(e.username)}" style="background:#2563eb;color:#fff;border:none;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer;">\u4EE3\u7406\u5165\u529B</button>`;e.submission_status==="PENDING"&&(u+=` <button class="btn-xs btn-ok btn-approve" data-id="${e.id}">\u627F\u8A8D</button>`),b+=`
        <th class="emp-col">
          <div class="emp-col-inner">
            <div class="emp-name-row" title="${h(e.username)} ${e.employee_code?`(${h(e.employee_code)})`:""}">
              <div class="emp-name">${h(e.username)}</div>
              ${e.employee_code?`<div class="emp-code">${h(e.employee_code)}</div>`:""}
              <div class="emp-type"><span class="${a?"badge-sei":"badge-bai"}">${a?"\u6B63":"\u30D1\u30FC\u30C8"}</span></div>
            </div>
            <div class="emp-info-row">
              <div class="emp-total">\u8A08: <span style="font-weight:normal; color:#0284c7;">${e._workCount}</span></div>
              <div class="emp-status">${f}</div>
              <div class="emp-action">${u}</div>
            </div>
          </div>
        </th>
      `}),b+=`
            </tr>
          </thead>
          <tbody>
    `;for(let e=1;e<=m;e++)b+="<tr>",b+=`<td class="col-fixed-1" style="${_(e)} font-size: 10px; letter-spacing: -0.5px;">${r}\u6708${e}\u65E5</td>`,b+=`<td class="col-fixed-2" style="${_(e)}">${R(e)}</td>`,A.forEach(a=>{const f=a.employment_type==="full_time",u=a.schedule||{},w=`${o}-${String(r).padStart(2,"0")}-${String(e).padStart(2,"0")}`,c=u[w];let s='<div class="cell-empty">-</div>';if(c)switch(c.status){case"WORKING":s='<div class="cell-work">\u51FA</div>';break;case"CA_NGAY":s='<div class="cell-day">\u65E5</div>';break;case"CA_CHIEU":s='<div class="cell-afternoon">\u5348</div>';break;case"CA_DEM":s='<div class="cell-night">\u591C</div>';break;case"09:00-14:00":s='<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><br><span>-14:00</span></div>';break;case"LEAVE":{const v={paid:"\u6709\u4F11",unpaid:"\u6B20",special:"\u7279\u4F11"}[c.leaveType]||"\u4F11",K={paid:"\u6709\u7D66\u4F11\u6687",unpaid:"\u6B20\u52E4 / \u7121\u7D66\u4F11\u6687",special:"\u7279\u5225\u4F11\u6687"}[c.leaveType]||"",Y=!c.leaveType,C=c.reason||c.detail||"",W=[K,C].filter(Boolean).join(`
`)||"\u7406\u7531\u306A\u3057",U=c.leaveType==="paid"?"cell-leave-paid":c.leaveType==="special"?"cell-leave-special":"cell-leave";Y?s=`<div class="${U}" title="\u4F11\u65E5">${v}</div>`:s=`<div class="${U} clickable-leave" style="cursor:pointer;" data-leave-label="${h(K)}" data-reason="${h(C)}" title="${h(W)}">${v}</div>`;break}case"OFF":s='<div class="cell-off">\u4F11</div>';break}else f||(s='<div class="cell-off">\u4F11</div>');b+=`<td>${s}</td>`}),b+="</tr>";b+=`
          </tbody>
        </table>
      </div>
    `;let t='<div class="shift-mobile-list">';A.forEach(e=>{const a=e.employment_type==="full_time",f=e.schedule||{};let u="";for(let c=1;c<=m;c++){const s=`${o}-${String(r).padStart(2,"0")}-${String(c).padStart(2,"0")}`,x=f[s];let v='<div class="cell-empty">-</div>';if(x)switch(x.status){case"WORKING":v='<div class="cell-work">\u51FA</div>';break;case"CA_NGAY":v='<div class="cell-day">\u65E5</div>';break;case"CA_CHIEU":v='<div class="cell-afternoon">\u5348</div>';break;case"CA_DEM":v='<div class="cell-night">\u591C</div>';break;case"09:00-14:00":v='<div class="cell-work" style="font-size:8px; line-height:1; flex-direction:column;"><span>09:00</span><br><span>-14:00</span></div>';break;case"LEAVE":{const C={paid:"\u6709\u4F11",unpaid:"\u6B20",special:"\u7279\u4F11"}[x.leaveType]||"\u4F11",W={paid:"\u6709\u7D66\u4F11\u6687",unpaid:"\u6B20\u52E4 / \u7121\u7D66\u4F11\u6687",special:"\u7279\u5225\u4F11\u6687"}[x.leaveType]||"",U=x.reason||x.detail||"",J=x.leaveType==="paid"?"cell-leave-paid":x.leaveType==="special"?"cell-leave-special":"cell-leave";x.leaveType?v=`<div class="${J} clickable-leave" style="cursor:pointer;" data-leave-label="${h(W)}" data-reason="${h(U)}">${C}</div>`:v=`<div class="${J}">${C}</div>`;break}case"OFF":v='<div class="cell-off">\u4F11</div>';break}else a||(v='<div class="cell-off">\u4F11</div>');const K=_(c);u+=`
          <div class="sac-day-item">
            <div class="sac-day-header" style="${K}">${c}</div>
            <div class="sac-day-val">${v}</div>
          </div>
        `}let w="";e.submission_status==="PENDING"?w=`<button class="btn-xs btn-ok btn-approve" data-id="${e.id}" style="width:100%; padding:8px 0; font-size:13px; border-radius: 6px;">\u627F\u8A8D\u3059\u308B</button>`:w=Q(e.submission_status||"UNSUBMITTED"),t+=`
        <div class="sac-card">
          <div class="sac-header">
            <div class="sac-name-wrap">
              <span class="sac-name">${h(e.username)}</span>
              <span class="${a?"badge-sei":"badge-bai"}">${a?"\u6B63":"\u30D1\u30FC\u30C8"}</span>
            </div>
            <div class="sac-status">${w}</div>
          </div>
          <div class="sac-summary">
            <span class="sac-total-label">\u6708\u8A08 (\u51FA\u52E4\u65E5\u6570):</span>
            <span class="sac-total-val" style="font-weight:700; color:#0f172a;">${e._workCount}\u65E5</span>
          </div>
          <div class="sac-days-scroll">
            ${u}
          </div>
        </div>
      `}),t+="</div>",b+=t}b+=`
    </div>
    <!-- Custom Modal HTML -->
     <div id="reasonModal" class="reason-modal-overlay">
       <div class="reason-modal-content">
         <div id="reasonModalHeader" class="reason-modal-header">\u4F11\u307F\u306E\u7406\u7531</div>
         <div id="reasonModalText" class="reason-modal-body"></div>
         <div class="reason-modal-footer">
           <button id="closeReasonModalBtn" class="reason-modal-btn">\u9589\u3058\u308B</button>
         </div>
       </div>
     </div>
  `;const F=document.activeElement,N=F?F.id:null;let T=0,B=0;if(N==="empSearch"&&(T=F.selectionStart,B=F.selectionEnd),l.innerHTML=b,N==="empSearch"){const t=l.querySelector("#empSearch");if(t){t.focus();try{t.setSelectionRange(T,B)}catch{}}}const j=l.querySelector("#empSearch");j&&j.addEventListener("input",t=>{q=t.target.value,V()});const $=l.querySelector("#statusFilter");$&&$.addEventListener("change",t=>{M=t.target.value,V()});const S=l.querySelector("#deptFilter");S&&([...new Set(O.map(e=>e.departmentName).filter(Boolean))].sort().forEach(e=>{const a=document.createElement("option");a.value=e,a.textContent=e,e===H&&(a.selected=!0),S.appendChild(a)}),S.addEventListener("change",e=>{H=e.target.value,I()}));const n=l.querySelector("#monthFilter");n&&n.addEventListener("change",()=>{g=n.value,I()});const i=document.getElementById("attHubMobileActions");if(window.innerWidth<=768&&i){let t=document.getElementById("monthFilterMobile");t||(t=document.createElement("input"),t.type="month",t.id="monthFilterMobile",t.style.cssText="height: 32px; padding: 0 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px; width: 130px; color: #1f2937; outline: none; margin: 0; box-sizing: border-box; background: white;",i.innerHTML="",i.appendChild(t),t.addEventListener("change",e=>{g=e.target.value,I()})),t.value=g}else i&&(i.innerHTML="");const p=l.querySelector("#reasonModal"),L=l.querySelector("#reasonModalText"),y=l.querySelector("#closeReasonModalBtn"),E=()=>{p&&p.classList.remove("show")};y&&y.addEventListener("click",E),p&&p.addEventListener("click",t=>{t.target===p&&E()}),l.querySelectorAll(".clickable-leave").forEach(t=>{t.addEventListener("click",e=>{const a=e.currentTarget,f=a.getAttribute("data-leave-label")||"",u=a.getAttribute("data-reason")||"",w=l.querySelector("#reasonModalHeader");w&&(w.textContent=f||"\u4F11\u307F\u306E\u7406\u7531"),L&&p&&(u?L.textContent=u:L.innerHTML='<span style="color:#94a3b8;">\u7406\u7531\u306E\u8A18\u8F09\u306A\u3057</span>',p.classList.add("show"))})}),l.querySelectorAll(".btn-approve").forEach(t=>{t.addEventListener("click",e=>{const a=e.target.getAttribute("data-id");confirm("\u3053\u306E\u30B7\u30D5\u30C8\u3092\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F")&&X(a,"APPROVED")})}),l.querySelectorAll(".btn-reject").forEach(t=>{t.addEventListener("click",e=>{const a=e.target.getAttribute("data-id");confirm("\u3053\u306E\u30B7\u30D5\u30C8\u3092\u5DEE\u623B\u3057\u307E\u3059\u304B\uFF1F")&&X(a,"REJECTED")})}),l.querySelectorAll(".btn-proxy").forEach(t=>{t.addEventListener("click",async e=>{const a=e.target.getAttribute("data-id"),f=e.target.getAttribute("data-name")||"";await Z(a,f)})})}async function X(o,d){try{const r=await G("/api/attendance/shifts/submissions/approve",{method:"POST",body:JSON.stringify({userId:o,month:g,status:d})});r.success?I():alert("\u30A8\u30E9\u30FC: "+(r.message||"Unknown error"))}catch(r){alert("\u30A8\u30E9\u30FC: "+r.message)}}async function Z(o,d){const[r,m]=g.split("-"),k=parseInt(m,10),z=new Date(r,k,0).getDate(),P=["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"];let A=[];try{const n=await G(`/api/attendance/shifts/user-month?userId=${o}&month=${g}`);A=Array.isArray(n)?n:[]}catch{}const D=O.find(n=>String(n.id)===String(o)),_=D&&D.employment_type!=="full_time",R={};A.forEach(n=>{const i=String(n.date).slice(0,10);R[i]={status:n.status||"OFF",leaveType:n.leaveType||null}});let b="";for(let n=1;n<=z;n++){const i=`${r}-${String(k).padStart(2,"0")}-${String(n).padStart(2,"0")}`,p=new Date(r,k-1,n),L=P[p.getDay()],y=p.getDay()===0,E=p.getDay()===6,t=y?"color:#dc2626;":E?"color:#2563eb;":"",e=R[i]||{},a=e.status||"",f=e.leaveType||"",u=D&&String(D.departmentName||"").includes("\u5DE5\u4E8B\u90E8"),w=E&&Math.ceil(n/7)===4,c=y||(u?w:E);let s="";a==="WORKING"?s="WORKING":a==="LEAVE"&&f==="paid"?s="PAID":a==="LEAVE"&&f==="unpaid"?s="ABSENT":a==="OFF"&&(s="OFF");let x="";_?x=`
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="WORKING" ${s==="WORKING"?"checked":""}> \u51FA\u52E4</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="OFF" ${s==="OFF"?"checked":""}> \u4F11\u65E5</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="" ${s?"":"checked"}> \u672A\u8A2D\u5B9A</label>
      `:c?x=`
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="FURIKAE" ${a==="WORKING"?"checked":""}> \u632F\u66FF\u51FA\u52E4</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="HOLIDAY_WORK" ${s==="HOLIDAY_WORK"?"checked":""}> \u4F11\u65E5\u51FA\u52E4</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="OFF" ${s==="OFF"||!s?"checked":""}> \u4F11\u65E5</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="" > \u672A\u8A2D\u5B9A</label>
      `:x=`
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="WORKING" ${s==="WORKING"?"checked":""}> \u51FA\u52E4</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="OFF" ${s==="OFF"?"checked":""}> \u4F11\u65E5</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="PAID" ${s==="PAID"?"checked":""}> \u6709\u4F11</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="ABSENT" ${s==="ABSENT"?"checked":""}> \u6B20\u52E4</label>
        <label style="font-size:11px;cursor:pointer;"><input type="radio" name="day_${i}" value="" ${s?"":"checked"}> \u672A\u8A2D\u5B9A</label>
      `,b+=`
      <div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;${c?"background:#fef2f2;":""}">
        <span style="width:65px;font-size:11px;font-weight:600;${t}">${k}/${n}(${L})</span>
        ${x}
      </div>
    `}const F=`
    <div id="proxyModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:8px;width:420px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:15px;font-weight:700;">\u4EE3\u7406\u5165\u529B: ${h(d)}</h3>
          <button id="closeProxyModal" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b;">\u2715</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1;">
          <div style="margin-bottom:8px;font-size:11px;color:#64748b;">\u5BFE\u8C61\u6708: ${r}\u5E74${m}\u6708 \u30FB \u5404\u65E5\u306E\u51FA\u52E4/\u4F11\u307F\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044</div>
          <div id="proxyDaysList">${b}</div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;">
          <button id="cancelProxy" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
          <button id="saveProxy" style="padding:8px 16px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">\u4FDD\u5B58</button>
        </div>
      </div>
    </div>
  `,N=document.getElementById("proxyModal");N&&N.remove(),document.body.insertAdjacentHTML("beforeend",F);const T=document.getElementById("proxyModal"),B=document.getElementById("closeProxyModal"),j=document.getElementById("cancelProxy"),$=document.getElementById("saveProxy"),S=()=>{T&&T.remove()};B.addEventListener("click",S),j.addEventListener("click",S),T.addEventListener("click",n=>{n.target===T&&S()}),$.addEventListener("click",async()=>{$.disabled=!0,$.textContent="\u4FDD\u5B58\u4E2D...";const n=[];for(let i=1;i<=z;i++){const p=`${r}-${String(k).padStart(2,"0")}-${String(i).padStart(2,"0")}`,L=document.querySelectorAll(`input[name="day_${p}"]`);let y="";L.forEach(E=>{E.checked&&(y=E.value)}),y&&(y==="PAID"?n.push({date:p,status:"LEAVE",leaveType:"paid"}):y==="ABSENT"?n.push({date:p,status:"LEAVE",leaveType:"unpaid"}):y==="FURIKAE"?n.push({date:p,status:"WORKING",detail:"\u632F\u66FF\u51FA\u52E4"}):y==="HOLIDAY_WORK"?n.push({date:p,status:"WORKING",detail:"\u4F11\u65E5\u51FA\u52E4"}):n.push({date:p,status:y}))}try{const i=await G("/api/attendance/shifts/bulk",{method:"POST",body:JSON.stringify({userId:o,month:g,shifts:n})});i.success?(S(),await I()):(alert("\u4FDD\u5B58\u5931\u6557: "+(i.message||"")),$.disabled=!1,$.textContent="\u4FDD\u5B58")}catch(i){alert("\u30A8\u30E9\u30FC: "+i.message),$.disabled=!1,$.textContent="\u4FDD\u5B58"}})}export{te as mount};
