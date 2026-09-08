import{me as C,logout as R,refresh as O}from"../api/auth.api.js";import{fetchJSONAuth as w}from"../api/http.api.js";import"/static/js/pages/employee-notify.sticky.js";const l=e=>document.querySelector(e),B=()=>{try{const e=l("#userName");if(!e)return;const t=sessionStorage.getItem("user")||localStorage.getItem("user")||"",a=t?JSON.parse(t):null,n=a&&(a.username||a.email)?String(a.username||a.email):"";n&&(e.textContent=n)}catch{}},h=e=>{const t=l("#error");if(t){if(!e){t.style.display="none",t.textContent="";return}t.style.display="block",t.textContent=e}},T=()=>{try{const e=document.querySelector("#pageSpinner");e&&(e.removeAttribute("hidden"),e.style.display="grid")}catch{}},z=()=>{try{const e=document.querySelector("#pageSpinner");e&&(e.setAttribute("hidden",""),e.style.display="none")}catch{}},m=e=>String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),D=e=>{if(!e)return"";const t=new Date(e);if(isNaN(t.getTime()))return String(e);const a=t.getFullYear(),n=String(t.getMonth()+1).padStart(2,"0"),c=String(t.getDate()).padStart(2,"0"),y=String(t.getHours()).padStart(2,"0"),r=String(t.getMinutes()).padStart(2,"0");return`${a}/${n}/${c} ${y}:${r}`},H=()=>{try{const e=sessionStorage.getItem("user")||localStorage.getItem("user")||"",t=e?JSON.parse(e):null;return String(t?.username||t?.email||"anonymous")}catch{return"anonymous"}},M=()=>`salaryViewedMonths:${H()}`,N=()=>{try{const e=localStorage.getItem(M())||"[]",t=JSON.parse(e);return new Set(Array.isArray(t)?t.map(a=>String(a)):[])}catch{return new Set}},q=e=>{const t=String(e||"");if(/^\d{4}-\d{2}$/.test(t)){try{const a=N();a.add(t),localStorage.setItem(M(),JSON.stringify(Array.from(a)))}catch{}try{w("/api/salary/my/read",{method:"POST",body:JSON.stringify({month:t})}).catch(()=>{})}catch{}}},U=async()=>{let e="";try{e=sessionStorage.getItem("accessToken")||""}catch{}if(!e){e=(await O())?.accessToken||"";try{e&&sessionStorage.setItem("accessToken",e)}catch{}}if(!e)throw new Error("Missing access token");const t=await C(e);try{const a=JSON.stringify(t||{});sessionStorage.setItem("user",a),localStorage.setItem("user",a)}catch{}return t},F=()=>{const e=document.querySelector(".user-btn"),t=l("#userDropdown");if(!e||!t)return;e.addEventListener("click",()=>{!t.hasAttribute("hidden")?t.setAttribute("hidden",""):t.removeAttribute("hidden")}),document.addEventListener("click",n=>{if(!n.target.closest(".user-menu"))try{t.setAttribute("hidden","")}catch{}});const a=l("#btnLogout");a&&a.addEventListener("click",async()=>{try{await R()}catch{}try{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("user")}catch{}try{localStorage.removeItem("refreshToken"),localStorage.removeItem("user")}catch{}window.location.replace("/ui/login")})},J=()=>{const e=l("#mobileMenuBtn"),t=l("#mobileDrawer"),a=l("#drawerBackdrop"),n=l("#mobileClose");if(!e||!t||!a||e.dataset.bound==="1")return;e.dataset.bound="1";const c=()=>{try{t.setAttribute("hidden",""),a.setAttribute("hidden",""),e.setAttribute("aria-expanded","false")}catch{}try{t?.querySelectorAll?.(".drawer-group-btn[data-drawer-group]").forEach(r=>{r.setAttribute("aria-expanded","false"),r.classList.remove("open")}),t?.querySelectorAll?.(".drawer-group-list[data-drawer-panel]").forEach(r=>r.setAttribute("hidden",""))}catch{}},y=()=>{try{t.removeAttribute("hidden"),a.removeAttribute("hidden"),e.setAttribute("aria-expanded","true")}catch{}};e&&e.addEventListener("click",()=>{t?.hasAttribute("hidden")?y():c()}),n&&n.addEventListener("click",c),a&&a.addEventListener("click",c);try{t?.querySelectorAll?.(".drawer-item, a").forEach(r=>r.addEventListener("click",c)),t?.querySelectorAll?.(".drawer-group-btn[data-drawer-group]").forEach(r=>{r.addEventListener("click",()=>{const i=String(r.getAttribute("data-drawer-group")||""),o=t.querySelector(`.drawer-group-list[data-drawer-panel="${i}"]`);if(!o)return;const d=o.hasAttribute("hidden");t.querySelectorAll(".drawer-group-btn[data-drawer-group]").forEach(s=>{s.setAttribute("aria-expanded","false"),s.classList.remove("open")}),t.querySelectorAll(".drawer-group-list[data-drawer-panel]").forEach(s=>s.setAttribute("hidden","")),d&&(o.removeAttribute("hidden"),r.setAttribute("aria-expanded","true"),r.classList.add("open"))})}),t?.querySelectorAll?.("a.drawer-item[href]").forEach(r=>{r.addEventListener("click",()=>c())}),t?.querySelectorAll?.(".drawer-item, a").forEach(r=>r.addEventListener("click",c))}catch{}},j=async()=>{const e=l("#salaryHost");if(!e)return;const t=new URLSearchParams(String(window.location.search||"")),a=String(t.get("month")||"").trim(),n=document.createElement("style");n.textContent=`
    .sal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .sal-title{font-size:16px;font-weight:600;color:#0f172a}
    .sal-subtle{font-size:13px;color:#64748b}
    .sal-row{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
    .sal-card{width:100%;box-sizing:border-box;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0}
    .sal-btn {
      padding: 8px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      color: #334155;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .sal-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .sal-btn-primary {
      background: #3b82f6;
      color: white;
      border-color: #2563eb;
    }
    .sal-btn-primary:hover {
      background: #2563eb;
      border-color: #1d4ed8;
    }
    .sal-chip{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:500;border:1px solid #e0e7ff}
    .sal-kv{display:grid;grid-template-columns:160px 1fr;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
    .sal-kv .k{background:#f8fafc;font-weight:500;font-size:14px;color:#475569;padding:10px 12px;border-right:1px solid #e2e8f0}
    .sal-kv .v{padding:10px 12px;font-size:14px;font-weight:400;color:#334155}
    
    .sal-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .sal-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 500;
      font-size: 14px;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .sal-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      font-size: 14px;
      font-weight: 400;
    }
    .sal-table tr:last-child td {
      border-bottom: none;
    }
    .sal-table tr:hover td {
      background: #f8fafc;
    }
    .sal-empty {
      padding: 40px;
      text-align: center;
      color: #64748b;
      background: #fff;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }
    .sal-list a{color:#1d4ed8;text-decoration:none;font-weight:500}
    .sal-list a:hover{color:#1e40af}
    .mobile-drawer .drawer-group-btn{
      width: 100%;
      text-align: left;
      border: 0;
      border-top: 1px solid #cfe0f5;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font: inherit;
      color: #124;
    }
    .mobile-drawer .drawer-group-btn .drawer-group-caret{
      transition: transform .15s ease;
    }
    .mobile-drawer .drawer-group-btn.open .drawer-group-caret{
      transform: rotate(180deg);
    }
    .mobile-drawer .drawer-group-list[hidden]{
      display: none !important;
    }
    .mobile-drawer .drawer-sub-item{
      padding-left: 28px;
      background: #f4f9ff;
      border-top-color: #e2eefc;
      font-size: 14px;
    }
    .sal-sub{font-size:12px;color:#64748b;margin-top:2px}
    .sal-list table{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
    .sal-list td{padding:10px 12px}
    .sal-list tr:hover td{background:#f8fafc}
    .sal-list a{display:inline-flex;align-items:center;gap:8px}
    .sal-list .dot{width:6px;height:6px;border-radius:50%;background:#22c55e;flex:0 0 auto}
    .sal-list .dot.is-hidden{display:none}
    .sal-list tr.is-active td{background:#eef4ff}
    .sal-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;color:#1d4ed8;text-decoration:none;font-weight:500;font-size:14px}
    .sal-back:hover{color:#1e40af}
    .sal-detail-title{font-size:16px;font-weight:600;color:#0f172a}
    .sal-tabs{display:flex;gap:18px;border-bottom:1px solid #e2e8f0;margin-bottom:12px}
    .sal-tab{padding:8px 4px;color:#475569;cursor:pointer;font-size:14px;font-weight:500;position:relative}
    .sal-tab.active{color:#0f172a}
    .sal-tab.active::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#3b82f6}
    .sal-pane{display:none}
    .sal-pane.active{display:block}
    .sal-related-group{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
    .sal-related-head{padding:10px 12px;color:#475569;font-size:14px;font-weight:500;border-bottom:1px solid #e2e8f0}
    .sal-related-item{padding:12px}
    .sal-related-item a{color:#1d4ed8;text-decoration:none;font-weight:500}
    .sal-related-item a:hover{color:#1e40af}
    @media (max-width: 700px){
      .sal-card{padding:10px !important;border-radius:10px}
      .sal-header{margin-bottom:10px}
      .sal-title{font-size:14px}
      .sal-subtle{font-size:11px}
      .sal-row{gap:10px}
      .sal-list table{border-radius:8px}
      .sal-table th,.sal-table td{padding:8px}
      .sal-table th{font-size:12px}
      .sal-table td{font-size:13px}
      .sal-list th:nth-child(2), .sal-list td:nth-child(2){
        width: 130px;
        white-space: nowrap;
      }
      .sal-list a{
        gap:6px;
        align-items:flex-start;
        line-height:1.25;
      }
      .sal-list .dot{margin-top:6px}
      .sal-back{font-size:13px;margin-bottom:8px}
      .sal-tabs{gap:12px}
      .sal-tab{font-size:12px;padding:7px 2px}
      .sal-detail-title{font-size:14px}
      .sal-kv{grid-template-columns:110px 1fr}
      .sal-kv .k,.sal-kv .v{padding:9px}
      #salOpenPdf{padding:6px 10px;font-size:12px}
    }
    @media (max-width: 480px){
      :root { --topbar-height: 52px; }
      body.drawer-open .topbar,
      body.drawer-open .subbar,
      body.drawer-open .content{
        transform: translateX(var(--drawer-offset, 280px)) !important;
      }
      body.drawer-open{
        overflow: hidden;
        touch-action: none;
        overscroll-behavior: none;
      }
      body:not(.admin) .topbar{
        padding: 6px 10px !important;
        min-height: var(--topbar-height) !important;
      }
      body:not(.admin) .topbar-inner{
        gap: 8px !important;
        padding-right: 0 !important;
      }
      body:not(.admin) .mobile-btn{
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
      }
      body:not(.admin) .topbar .search{
        flex: 1 1 auto !important;
        max-width: none !important;
        margin: 0 4px !important;
      }
      body:not(.admin) .topbar .search input{
        height: 30px !important;
        line-height: 30px !important;
        font-size: 13px !important;
      }
      body:not(.admin) .topbar .user{
        min-width: 30px !important;
        width: 30px !important;
      }
      body:not(.admin) .topbar .user .user-btn{
        width: 30px !important;
        height: 30px !important;
        min-width: 30px !important;
        padding: 0 !important;
      }
      body:not(.admin) .topbar .user .user-icon{
        width: 24px !important;
        height: 24px !important;
      }
      body:not(.admin) .topbar #userName,
      body:not(.admin) .topbar .caret{
        display: none !important;
      }
      body:not(.admin) .subbar{ display: none !important; }
      body:not(.admin) .subbar + .content{
        padding-top: calc(var(--topbar-height) + 8px) !important;
      }
      body:not(.admin) .content{
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
    }
  `,document.head.appendChild(n);const c=async i=>{if(h(""),!!/^\d{4}-\d{2}$/.test(i)){T();try{const o=i.slice(0,4),d=i.slice(5,7),s=await w(`/api/salary/me/${encodeURIComponent(o)}/${encodeURIComponent(d)}/download`),p=String(s?.secureUrl||"").trim();if(!p){h("PDF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");return}window.location.href=p}catch(o){h(o?.message||"PDF\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}finally{z()}}},y=async i=>{q(i),e.innerHTML=`
      <div class="sal-card" style="padding:16px">
        <a class="sal-back" href="/ui/salary">\u2190 \u914D\u5E03\u7269\u540D\u4E00\u89A7\u306B\u623B\u308B</a>
        <div id="salMeta" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div class="sal-subtle"></div>
        </div>
        <div id="salBody"></div>
      </div>
    `;const o=l("#salMeta"),d=l("#salBody");if(h(""),!/^\d{4}-\d{2}$/.test(i)){h("\u6708\u306E\u6307\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093");return}T();try{const s=await w(`/api/salary/my?month=${encodeURIComponent(i)}`);if(s?.notPublished){d&&(d.innerHTML=`<div class="sal-empty">${m(s.message||"\u307E\u3060\u516C\u958B\u3055\u308C\u3066\u3044\u307E\u305B\u3093")}</div>`),o&&(o.textContent="");return}const p=i.slice(0,4),u=i.slice(5,7),b=`${p}\u5E74${u}\u6708\u7D66\u4E0E\u660E\u7D30`,g=Array.isArray(s?.employees)&&s.employees.length?s.employees[0]:null,L=g?.\u6C0F\u540D?`${g.\u6C0F\u540D}${g?.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9?`\uFF08${g.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9}\uFF09`:""}`:"\u3042\u306A\u305F",S=await w("/api/salary/my/published").catch(()=>null),k=Array.isArray(S?.items)?S.items.find(f=>String(f.month)===i):null,E=k?.fileName||`${b}.pdf`,P=k?.publishedAt?D(k.publishedAt):"";if(o){const f=s?.companyName||"",x=s?.issueDate||"";o.innerHTML=`<div><span class="sal-chip">${m(f)}</span> <span class="sal-subtle" style="margin-left:8px;">\u767A\u884C\u65E5: ${m(x)}</span></div>`}if(d){d.innerHTML=`
          <div class="sal-tabs">
            <div id="salTabDetails" class="sal-tab active">DETAILS</div>
            <div id="salTabRelated" class="sal-tab">RELATED</div>
          </div>
          <div id="salPaneDetails" class="sal-pane active">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;">
              <div class="sal-detail-title">${m(b)}</div>
              <button id="salOpenPdf" class="sal-btn sal-btn-primary" type="button" style="display:inline-flex;align-items:center;gap:6px;">
                <span aria-hidden="true" style="font-size:16px;">\u{1F441}\uFE0F</span> 
                <span>\u8868\u793A</span>
              </button>
            </div>
            <div class="sal-kv">
              <div class="k">\u6240\u6709\u8005</div><div class="v">${m(L)}</div>
            </div>
          </div>
          <div id="salPaneRelated" class="sal-pane">
            <div class="sal-related-group">
              <div class="sal-related-head">\u30E1\u30E2 & \u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB (1)</div>
              <div class="sal-related-item">
                <div><a href="#" id="salFileLink">${m(E)}</a></div>
                <div class="sal-sub">${m(P)} \u30FB \u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB</div>
              </div>
            </div>
          </div>
        `;const f=x=>{const v=document.getElementById("salTabDetails"),A=document.getElementById("salTabRelated"),$=document.getElementById("salPaneDetails"),I=document.getElementById("salPaneRelated");!v||!A||!$||!I||(x==="details"?(v.classList.add("active"),A.classList.remove("active"),$.classList.add("active"),I.classList.remove("active")):(A.classList.add("active"),v.classList.remove("active"),I.classList.add("active"),$.classList.remove("active")))};document.getElementById("salTabDetails")?.addEventListener("click",()=>f("details")),document.getElementById("salTabRelated")?.addEventListener("click",()=>f("related")),document.querySelector(".sal-back")?.addEventListener("click",x=>{x.preventDefault();try{if(String(document.referrer||"").includes("/ui/salary")&&window.history.length>1){window.history.back();return}}catch{}window.location.replace("/ui/salary")})}document.getElementById("salOpenPdf")?.addEventListener("click",async()=>{await c(i)}),document.getElementById("salFileLink")?.addEventListener("click",async f=>{f.preventDefault(),await c(i)})}catch(s){d&&(d.innerHTML=""),h(s?.message||"\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}finally{z()}},r=async()=>{e.innerHTML=`
      <div class="sal-card" style="padding:16px">
        <div class="sal-header">
          <div>
            <div class="sal-title">\u7D66\u4E0E\u660E\u7D30\u306A\u3069</div>
            <div class="sal-subtle">\u516C\u958B\u6E08\u307F\u306E\u7D66\u4E0E\u660E\u7D30\u304B\u3089\u9078\u629E\u3057\u3001\u8A73\u7D30\u30DA\u30FC\u30B8\u3092\u8868\u793A\u3067\u304D\u307E\u3059</div>
          </div>
        </div>
        <div class="sal-row">
          <div>
            <div id="salList" class="sal-list" style="max-height:520px;overflow:auto;"></div>
          </div>
        </div>
      </div>
    `;const i=l("#salList");if(i){if(!i)return[];try{const o=await w("/api/salary/my/published"),d=Array.isArray(o?.items)?o.items:[],s=N();if(!d.length){i.innerHTML='<div class="sal-sub">\u516C\u958B\u3055\u308C\u305F\u7D66\u4E0E\u660E\u7D30\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}i.innerHTML=`
        <table class="sal-table">
          <thead>
            <tr>
              <th>\u914D\u5E03\u7269\u540D</th>
              <th style="width:180px">\u914D\u4FE1\u5B8C\u4E86\u65E5</th>
            </tr>
          </thead>
          <tbody>
            ${d.map(p=>{const u=String(p.month||""),b=u.slice(0,4),g=u.slice(5,7),L=`${b}\u5E74${g}\u6708\u7D66\u4E0E\u660E\u7D30`,S=p.publishedAt?D(p.publishedAt):"",E=p.isRead||s.has(u)?" is-hidden":"";return`
                <tr data-month="${m(u)}">
                  <td><a href="#" data-month="${m(u)}"><span class="dot${E}"></span><span>${m(L)}</span></a></td>
                  <td>${m(S)}</td>
                </tr>
              `}).join("")}
          </tbody>
        </table>
      `,i.querySelectorAll("a[data-month]").forEach(p=>{p.addEventListener("click",u=>{u.preventDefault();const b=p.getAttribute("data-month")||"";b&&(q(b),window.location.href=`/ui/salary?month=${encodeURIComponent(b)}`)})})}catch{i.innerHTML='<div class="sal-sub">\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F</div>'}}};/^\d{4}-\d{2}$/.test(a)?await y(a):await r()};document.addEventListener("DOMContentLoaded",async()=>{F(),J(),B();try{const e=await U(),t=String(e?.role||"").toLowerCase();if(!e||!(t==="employee"||t==="manager"||t==="admin")){window.location.replace("/ui/login");return}const a=e.username||e.email||"\u30E6\u30FC\u30B6\u30FC",n=l("#userName");n&&(n.textContent=a)}catch{window.location.replace("/ui/login");return}await j()});
