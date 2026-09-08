import{delegate as T}from"../_shared/dom.js";import{api as $,downloadWithAuth as k}from"../../shared/api/client.js";function N(t){return Array.isArray(t)?t:t&&Array.isArray(t.rows)?t.rows:[]}function I(){try{if(document.getElementById("payrollNavStyle"))return;const t=document.createElement("style");t.id="payrollNavStyle",t.textContent=`
      .pe-nav{display:flex;gap:24px;margin:-16px 0 12px 0;border-bottom:1px solid #e5e7eb;padding:0 16px}
      .pe-nav a{display:inline-flex;align-items:center;padding:8px 0;border-bottom:2px solid transparent;background:none;color:#6b7280;font-weight:600;font-size:14px;text-decoration:none;transition:all 0.2s;margin-bottom:-1px}
      .pe-nav a:hover{color:#374151}
      .pe-nav a.active{color:#2563eb;border-bottom-color:#2563eb}
    `,document.head.appendChild(t)}catch{}}function S(t){const g=String(window.location.pathname||"");return`${g.startsWith("/admin/payroll")?g:"/ui/admin"}?tab=${encodeURIComponent(String(t||""))}`}function U(t){return String(t&&(t.employee_code||t.employeeCode||"EMP"+String(t.id).padStart(3,"0"))||"").trim()}function A(t){const g=document.createElement("div");return g.className="pe-nav",g.innerHTML=`
    <a class="${t==="salary_list"?"active":""}" href="${S("salary_list")}">\u7D66\u4E0E\u4E00\u89A7</a>
    <a class="${t==="salary_calc"?"active":""}" href="${S("salary_calc")}">\u7D66\u4E0E\u8A08\u7B97</a>
    <a class="${t==="payroll_editor"?"active":""}" href="${S("payroll_editor")}">\u7D66\u4E0E\u5165\u529B</a>
    <a class="${t==="salary_send"?"active":""}" href="${S("salary_send")}">\u9001\u4FE1\u30FB\u5C65\u6B74</a>
  `,g}async function _({content:t}){if(!t)return;t.innerHTML="<h3>\u7D66\u4E0E\u4E00\u89A7</h3>",I(),t.appendChild(A("salary_list"));const g=document.createElement("form");g.innerHTML=`
    <input id="salUserId" type="number" placeholder="userId(\u4EFB\u610F)">
    <input id="salMonth" placeholder="YYYY-MM(\u4EFB\u610F)">
    <button type="submit">\u8868\u793A</button>
  `;const x=document.createElement("div");g.addEventListener("submit",async b=>{b.preventDefault();const m=document.querySelector("#salUserId").value.trim(),u=document.querySelector("#salMonth").value.trim(),y=[];m&&y.push(`userId=${encodeURIComponent(m)}`),u&&y.push(`month=${encodeURIComponent(u)}`);const d=await $.get(`/api/admin/salary/history${y.length?"?"+y.join("&"):""}`);x.innerHTML="";const c=document.createElement("table");c.style.width="100%",c.innerHTML="<thead><tr><th>ID</th><th>User</th><th>Month</th><th>Created</th></tr></thead>";const p=document.createElement("tbody");for(const s of d&&Array.isArray(d.data)?d.data:[]){const h=document.createElement("tr");h.innerHTML=`<td>${s.id}</td><td>${s.userId}</td><td>${s.month}</td><td>${s.created_at}</td>`,p.appendChild(h)}c.appendChild(p),x.appendChild(c)}),t.appendChild(g),t.appendChild(x)}async function R({content:t,listUsers:g}){if(!t)return;t.innerHTML="<h3>\u7D66\u4E0E\u8A08\u7B97</h3>",I(),t.appendChild(A("salary_calc"));const x=N(await g()),b=document.createElement("select");b.id="salaryUserIds",b.multiple=!0,b.style.minWidth="280px";for(const d of x){const c=String(d.role||"").toLowerCase();if(c==="admin"||c==="manager")continue;const p=document.createElement("option");p.value=String(d.id);const s=U(d);p.textContent=`${s} ${d.username||d.email}`.trim(),b.appendChild(p)}const m=document.createElement("form");m.innerHTML=`
    <input id="salaryMonth" placeholder="YYYY-MM">
    <button type="submit">\u30D7\u30EC\u30D3\u30E5\u30FC</button>
    <button type="button" data-action="close-month">\u6708\u7DE0\u3081</button>
    <button type="button" data-action="export-csv">CSV</button>
  `,t.appendChild(b),t.appendChild(m);const u=document.createElement("div");t.appendChild(u);function y(){return Array.from(b.selectedOptions).map(d=>d.value)}m.addEventListener("submit",async d=>{d.preventDefault();const c=y(),p=document.querySelector("#salaryMonth").value.trim();if(!c.length||!p)return alert("\u30E6\u30FC\u30B6\u30FC\u3068\u6708\u3092\u9078\u629E");const s=await $.get(`/api/admin/salary?userIds=${encodeURIComponent(c.join(","))}&month=${encodeURIComponent(p)}`);u.innerHTML="";const h=document.createElement("table");h.style.width="100%",h.innerHTML="<thead><tr><th>User</th><th>\u6C0F\u540D</th><th>\u6708</th><th>\u7DCF\u652F\u7D66\u984D</th><th>\u5DEE\u5F15\u652F\u7D66\u984D</th></tr></thead>";const o=document.createElement("tbody");for(const a of s&&Array.isArray(s.employees)?s.employees:[]){const l=document.createElement("tr"),r=a&&a.\u5408\u8A08&&typeof a.\u5408\u8A08=="object"?a.\u5408\u8A08:{};l.innerHTML=`<td>${a.userId}</td><td>${a.\u6C0F\u540D||""}</td><td>${a.\u5BFE\u8C61\u5E74\u6708}</td><td>${r.\u7DCF\u652F\u7D66\u984D||0}</td><td>${r.\u5DEE\u5F15\u652F\u7D66\u984D||0}</td>`,o.appendChild(l)}h.appendChild(o),u.appendChild(h),u.dataset.csv=JSON.stringify(s&&Array.isArray(s.employees)?s.employees:[])}),T(m,"button[data-action]","click",async(d,c)=>{const p=c.dataset.action||"";if(p==="close-month"){const s=y(),h=document.querySelector("#salaryMonth").value.trim();if(!s.length||!h)return alert("\u30E6\u30FC\u30B6\u30FC\u3068\u6708\u3092\u9078\u629E");const o=await $.post("/api/admin/salary/close-month",{userIds:s.join(","),month:h});alert(`\u7DE0\u3081\u51E6\u7406: ${o.closed} \u4EF6`);return}if(p==="export-csv")try{const s=JSON.parse(u.dataset.csv||"[]");let h=`userId,name,month,total_gross,total_net
`;for(const r of s){const w=r&&r.\u5408\u8A08&&typeof r.\u5408\u8A08=="object"?r.\u5408\u8A08:{};h+=`${r.userId},${r.\u6C0F\u540D||""},${r.\u5BFE\u8C61\u5E74\u6708},${w.\u7DCF\u652F\u7D66\u984D||0},${w.\u5DEE\u5F15\u652F\u7D66\u984D||0}
`}const o=new Blob([h],{type:"text/csv;charset=utf-8"}),a=URL.createObjectURL(o),l=document.createElement("a");l.href=a,l.download="salary.csv",l.click(),setTimeout(()=>URL.revokeObjectURL(a),1e3)}catch{}})}async function j({content:t,listUsers:g}){if(!t)return;I(),t.innerHTML="",(function(){if(document.getElementById("payslipHistoryStyle"))return;const a=document.createElement("style");a.id="payslipHistoryStyle",a.textContent=`
      .ps-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px}
      .ps-table th,.ps-table td{padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle;color:#111827}
      .ps-table thead th{background:#ffffff;color:#6b7280;font-weight:600;font-size:12px;border-bottom:2px solid #e5e7eb}
      .ps-table tbody tr:hover td{background:#f9fafb}
      .ps-table tbody tr:last-child td{border-bottom:none}
      .ps-col-user{width:25%}
      .ps-col-month{width:12%}
      .ps-col-file{width:30%}
      .ps-col-sender{width:15%}
      .ps-col-time{width:18%}
      .ps-col-count{width:20%}
      .btn-neutral{display:inline-flex;align-items:center;justify-content:center;padding:4px 12px;border:1px solid #d1d5db;background:#ffffff;color:#374151;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;min-height:28px}
      .btn-neutral:hover{background:#f3f4f6;border-color:#9ca3af}
      .btn-danger{color:#dc2626;background:#fef2f2;border-color:#fecaca}
      .btn-danger:hover{background:#fee2e2;border-color:#fca5a5}
      .ps-card{background:transparent;border:none;border-radius:0;box-shadow:none;padding:0;margin-bottom:12px}
      .ps-header{display:none}
      .ps-filter{display:flex;gap:12px;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6}
      .ps-input{height:32px;padding:4px 12px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;color:#111827}
      .ps-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 1px rgba(37,99,235,0.2)}
      details > summary { list-style: none; display: flex; align-items: center; gap: 8px; }
      details > summary::-webkit-details-marker { display: none; }
      details > summary::before { content: '\u25B8'; display: inline-block; transition: transform 0.2s; font-size: 12px; color: #6b7280; }
      details[open] > summary::before { transform: rotate(90deg); }
      .ps-tabs { display: flex; gap: 24px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; }
      .ps-tab { padding: 8px 0; font-size: 14px; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; background: transparent; border-top: none; border-left: none; border-right: none; margin-bottom: -1px; }
      .ps-tab:hover { color: #374151; }
      .ps-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
    `,document.head.appendChild(a)})();const x=document.createElement("div");x.className="ps-card",x.style.display="flex",x.style.justifyContent="flex-end",x.innerHTML=`
    <div class="ps-filter" style="margin-top: 0px; margin-bottom: 0px; padding-bottom: 0px; border-bottom: none;">
      <label style="font-size:14px;font-weight:500;color:#374151">\u5BFE\u8C61\u5E74\u9593</label>
      <input id="psMonth" type="month" class="ps-input">
      <button id="psClear" type="button" class="btn-neutral" title="\u30AF\u30EA\u30A2" style="padding: 4px 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `,t.appendChild(x);const b=document.createElement("div");b.className="ps-tabs",b.innerHTML=`
    <button type="button" class="ps-tab active" data-subtab="summary">\u6708\u5225\u30B5\u30DE\u30EA\u30FC</button>
    <button type="button" class="ps-tab" data-subtab="deliveries">\u914D\u4FE1\u5C65\u6B74</button>
    <button type="button" class="ps-tab" data-subtab="files">PDF\u4F5C\u6210\u5C65\u6B74</button>
  `,t.appendChild(b);const m=document.createElement("div");m.className="ps-card",m.style.padding="0",m.style.display="block",m.innerHTML=`
    <div id="monthsHost" style="overflow-x:auto">
      <table class="ps-table">
        <thead>
          <tr>
            <th class="ps-col-month">\u6708</th>
            <th class="ps-col-count">\u914D\u4FE1\u4EBA\u6570</th>
            <th class="ps-col-count">PDF\u4F5C\u6210\u4EBA\u6570</th>
          </tr>
        </thead>
        <tbody id="monthsBody"></tbody>
      </table>
    </div>
  `,t.appendChild(m);const u=document.createElement("div");u.className="ps-card",u.style.padding="0",u.style.display="none",u.innerHTML=`
    <div id="delivBox" style="overflow-x:auto"></div>
  `,t.appendChild(u);const y=document.createElement("div");y.className="ps-card",y.style.padding="0",y.style.display="none",y.innerHTML=`
    <div id="fileBox" style="overflow-x:auto"></div>
  `,t.appendChild(y),b.querySelectorAll("button").forEach(o=>{o.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),b.querySelectorAll("button").forEach(r=>r.classList.remove("active")),o.classList.add("active");const l=o.dataset.subtab;m.style.display=l==="summary"?"block":"none",u.style.display=l==="deliveries"?"block":"none",y.style.display=l==="files"?"block":"none"})});let d="";async function c(){const o=u.querySelector("#delivBox"),a=y.querySelector("#fileBox");o&&(o.textContent="\u8AAD\u307F\u8FBC\u307F\u4E2D..."),a&&(a.textContent="\u8AAD\u307F\u8FBC\u307F\u4E2D...");try{const l=d?`?month=${encodeURIComponent(d)}`:"",r=await $.get(`/api/admin/salary/deliveries${l}`),w=await $.get(`/api/admin/salary/files${l}`);if(o){const L=Array.isArray(r?.items)?r.items:[],n=document.createElement("table");n.className="ps-table",n.innerHTML='<thead><tr><th class="ps-col-user">User</th><th class="ps-col-month">\u6708</th><th class="ps-col-file">\u30D5\u30A1\u30A4\u30EB</th><th class="ps-col-sender">\u9001\u4FE1\u8005</th><th class="ps-col-time">\u9001\u4FE1\u65E5\u6642</th><th style="width:12%">\u30A2\u30AF\u30B7\u30E7\u30F3</th></tr></thead>';const f=document.createElement("tbody");L.forEach(e=>{const i=document.createElement("tr");i.innerHTML=`
            <td>${e.userId} ${e.userName||""}</td>
            <td>${e.month}</td>
            <td>${e.fileId?`<a href="#" data-dl-file-id="${e.fileId}" data-file-name="${(e.fileName||"").replace(/"/g,"")}">${e.fileName||""}</a>`:e.fileName||""}</td>
            <td>${e.senderName||e.sentBy||""}</td>
            <td>${e.sentAt||""}</td>
            <td style="white-space:nowrap;display:flex;gap:8px;">
            <button class="btn-neutral" data-act="unpublish" data-user="${e.userId}" data-month="${e.month}">\u53D6\u6D88\u516C\u958B</button>
            <button class="btn-neutral btn-danger" data-act="del-delivery" data-id="${e.id}">\u524A\u9664</button>
          </td>`,f.appendChild(i)}),n.appendChild(f),o.innerHTML="",o.appendChild(n),o.querySelectorAll("a[data-dl-file-id]").forEach(e=>{e.addEventListener("click",async i=>{i.preventDefault(),i.stopPropagation();const v=i.currentTarget.dataset.dlFileId,C=i.currentTarget.dataset.fileName||"payslip.pdf";try{await k(`/api/payslips/admin/file/${encodeURIComponent(v)}`,C)}catch(E){alert("\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(E?.message||"unknown"))}})}),o.querySelectorAll("button.btn-neutral").forEach(e=>{e.addEventListener("click",async i=>{const v=i.currentTarget,C=v.dataset.act;if(C==="unpublish"){const E=v.dataset.user,M=v.dataset.month;if(!confirm(`\u300C${M}\u300D\u306E\u516C\u958B\u3092\u53D6\u308A\u6D88\u3057\u307E\u3059\u304B\uFF1F`))return;try{await $.post("/api/admin/salary/publish",{userId:E,month:M,is_published:!1}),await c(),await p()}catch(H){alert("\u53D6\u6D88\u516C\u958B\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(H?.message||"unknown"))}}else if(C==="del-delivery"){const E=v.dataset.id;if(!confirm("\u914D\u4FE1\u5C65\u6B74\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F"))return;try{await $.del(`/api/admin/salary/deliveries/${encodeURIComponent(E)}`),await c(),await p()}catch(M){alert("\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(M?.message||"unknown"))}}})})}if(a){const L=Array.isArray(w?.items)?w.items:[],n=document.createElement("table");n.className="ps-table",n.innerHTML='<thead><tr><th class="ps-col-user">User</th><th class="ps-col-month">\u6708</th><th class="ps-col-file">\u30D5\u30A1\u30A4\u30EB</th><th class="ps-col-sender">\u4F5C\u6210\u8005</th><th class="ps-col-time">\u4F5C\u6210\u65E5\u6642</th><th style="width:12%">\u30A2\u30AF\u30B7\u30E7\u30F3</th></tr></thead>';const f=document.createElement("tbody");L.forEach(e=>{const i=document.createElement("tr");i.innerHTML=`
            <td>${e.userId} ${e.userName||""}</td>
            <td>${e.month}</td>
            <td>${e.fileId?`<a href="#" data-dl-file-id="${e.fileId}" data-file-name="${(e.fileName||"").replace(/"/g,"")}">${e.fileName||""}</a>`:e.fileName||""}</td>
            <td>${e.creatorName||e.createdBy||""}</td>
            <td>${e.createdAt||""}</td>
            <td style="white-space:nowrap;display:flex;gap:8px;">
              <button class="btn-neutral btn-danger" data-act="del-file" data-id="${e.id}">\u524A\u9664</button>
            </td>`,f.appendChild(i)}),n.appendChild(f),a.innerHTML="",a.appendChild(n),a.querySelectorAll("a[data-dl-file-id]").forEach(e=>{e.addEventListener("click",async i=>{i.preventDefault(),i.stopPropagation();const v=i.currentTarget.dataset.dlFileId,C=i.currentTarget.dataset.fileName||"payslip.pdf";try{await k(`/api/payslips/admin/file/${encodeURIComponent(v)}`,C)}catch(E){alert("\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(E?.message||"unknown"))}})}),a.querySelectorAll("button.btn-neutral").forEach(e=>{e.addEventListener("click",async i=>{const v=i.currentTarget.dataset.id,C=prompt("\u524A\u9664\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");if(C!=null)try{await $.del(`/api/payslips/admin/${encodeURIComponent(v)}`,{body:JSON.stringify({reason:C})}),await c(),await p()}catch(E){alert("\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(E?.message||"unknown"))}})})}}catch(l){const r=String(l?.message||"\u8AAD\u307F\u8FBC\u307F\u5931\u6557");try{console.error("payslip history load error:",l)}catch{}o&&(o.textContent=`\u8AAD\u307F\u8FBC\u307F\u5931\u6557: ${r}`),a&&(a.textContent=`\u8AAD\u307F\u8FBC\u307F\u5931\u6557: ${r}`)}}setTimeout(c,0);async function p(){const o=m.querySelector("#monthsBody");if(o){o.innerHTML='<tr><td style="padding:10px 12px" colspan="3">\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</td></tr>';try{const a=await $.get("/api/admin/salary/deliveries"),l=await $.get("/api/admin/salary/files"),r=new Map,w=(n,f)=>{n&&(r.has(n)||r.set(n,{deliv:new Set,files:new Set}),r.get(n)[f].add(!0))};(Array.isArray(a?.items)?a.items:[]).forEach(n=>w(String(n.month||""),"deliv")),(Array.isArray(l?.items)?l.items:[]).forEach(n=>w(String(n.month||""),"files"));const L=Array.from(r.keys()).sort((n,f)=>n.localeCompare(f));o.innerHTML=L.map(n=>{const f=r.get(n),e=f.deliv.size,i=f.files.size;return`
          <tr data-month="${n}" style="cursor:pointer;${d===n?"background:#eef2ff":""}">
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9;font-weight:900;color:#0f172a">${n}</td>
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9">${e}</td>
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9">${i}</td>
          </tr>
        `}).join("")||'<tr><td style="padding:10px 12px" colspan="3">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>',m.querySelectorAll("tr[data-month]").forEach(n=>{n.addEventListener("click",()=>{d=String(n.getAttribute("data-month")||"");const f=document.getElementById("psMonth");f&&(f.value=d.replace("-","-")),p(),c()})})}catch(a){const l=String(a?.message||"\u8AAD\u307F\u8FBC\u307F\u5931\u6557");try{console.error("payslip months summary error:",a)}catch{}o.innerHTML=`<tr><td style="padding:10px 12px" colspan="3">\u8AAD\u307F\u8FBC\u307F\u5931\u6557: ${l}</td></tr>`}}}p();const s=document.getElementById("psMonth");s&&s.addEventListener("change",()=>{d=String(s.value||""),c(),p()});const h=document.getElementById("psClear");h&&h.addEventListener("click",()=>{d="";try{document.getElementById("psMonth").value=""}catch{}c(),p()})}export{j as mountPayslipSend,R as mountSalaryCalc,_ as mountSalaryList};
