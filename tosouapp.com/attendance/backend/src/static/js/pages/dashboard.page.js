import{me as u,refresh as f,logout as b}from"../api/auth.api.js";const i=e=>document.querySelector(e);function y(){try{const e=i("#userName");if(!e)return;const t=sessionStorage.getItem("user")||localStorage.getItem("user")||"",n=t?JSON.parse(t):null,s=n&&(n.username||n.email)?String(n.username||n.email):"";s&&(e.textContent=s)}catch{}}function E(){try{const e=i("#pageSpinner");if(!e)return;e.removeAttribute("hidden"),e.style.display="grid"}catch{}}function m(){try{const e=i("#pageSpinner");if(!e)return;e.setAttribute("hidden",""),e.style.display="none"}catch{}}function g(e){const t=i("#error");t&&(t.style.display="block",t.textContent=e||"\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002")}function c(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}async function v(){let e="";try{e=sessionStorage.getItem("accessToken")||""}catch{}if(e)try{return await u(e)}catch{}try{if(e=(await f())?.accessToken||"",e){try{sessionStorage.setItem("accessToken",e)}catch{}return await u(e)}}catch{}return null}function k(){const e=document.querySelector(".user .user-btn"),t=i("#userDropdown");if(!e||!t)return;e.addEventListener("click",()=>{t.hasAttribute("hidden")?t.removeAttribute("hidden"):t.setAttribute("hidden","")}),document.addEventListener("click",s=>{s.target?.closest?.(".user-menu")||t.setAttribute("hidden","")});const n=i("#btnLogout");n&&n.addEventListener("click",async()=>{try{await b()}catch{}try{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("user")}catch{}try{localStorage.removeItem("refreshToken"),localStorage.removeItem("user")}catch{}window.location.replace("/ui/login")})}function x(){const e=i("#mobileMenuBtn"),t=i("#mobileDrawer"),n=i("#mobileClose"),s=i("#drawerBackdrop");if(!e||!t||e.dataset.bound==="1")return;e.dataset.bound="1";const a=()=>{t.removeAttribute("hidden"),e.setAttribute("aria-expanded","true"),s&&s.removeAttribute("hidden")},o=()=>{t.setAttribute("hidden",""),e.setAttribute("aria-expanded","false"),s&&s.setAttribute("hidden","")};e.addEventListener("click",()=>{t.hasAttribute("hidden")?a():o()}),n&&n.addEventListener("click",o),s&&s.addEventListener("click",o)}function w(e){const t=i("#tiles");if(!t)return;if(t.classList.remove("employee-portal"),t.classList.add("dashboard-profile-host"),t.style.display="block",t.style.gridTemplateColumns="none",t.style.width="100%",t.style.maxWidth="100%",t.style.margin="0",t.style.gap="0",t.style.justifyContent="stretch",!document.getElementById("dashboardProfileStyle")){const d=document.createElement("style");d.id="dashboardProfileStyle",d.textContent=`
      .dashboard-profile-card{
        max-width:900px;
        width:100%;
        background:#fff;
        border:1px solid #d7e4f5;
        border-radius:12px;
        padding:16px 18px;
      }
      .dashboard-profile-host{
        display:block !important;
        grid-template-columns:none !important;
        max-width:980px;
        margin:0 auto;
      }
      .dashboard-profile-title{
        margin:0 0 10px;
        font-size:18px;
        color:#0d2c5b;
      }
      .dashboard-profile-grid{
        display:grid;
        grid-template-columns:minmax(90px,130px) 1fr;
        row-gap:10px;
        column-gap:12px;
      }
      .dashboard-profile-grid .k{
        color:#64748b;
        font-size:13px;
      }
      .dashboard-profile-grid .v{
        color:#0f172a;
        font-weight:600;
        font-size:13px;
        word-break:break-word;
      }
      @media (max-width:480px){
        .dashboard-profile-host{
          max-width:100%;
        }
        .dashboard-profile-card{
          padding:12px 12px;
          border-radius:10px;
        }
        .dashboard-profile-title{
          font-size:16px;
          margin-bottom:8px;
        }
        .dashboard-profile-grid{
          grid-template-columns:96px 1fr;
          row-gap:8px;
          column-gap:10px;
        }
        .dashboard-profile-grid .k,
        .dashboard-profile-grid .v{
          font-size:12px;
          line-height:1.35;
        }
      }
    `,document.head.appendChild(d)}const n=e?.username||e?.name||e?.email||"\u30E6\u30FC\u30B6\u30FC",s=e?.email||"-",a=e?.role||"-",o=e?.employee_code||e?.employeeCode||"-",r=e?.department_name||e?.departmentName||e?.department||"-";t.innerHTML=`
    <section class="card dashboard-profile-card" style="width:100%;box-sizing:border-box;">
      <h2 class="dashboard-profile-title">\u73FE\u5728\u306E\u767B\u9332\u60C5\u5831</h2>
      <div class="dashboard-profile-grid">
        <div class="k">\u30E6\u30FC\u30B6\u30FC\u540D</div><div class="v">${c(n)}</div>
        <div class="k">\u30E1\u30FC\u30EB</div><div class="v">${c(s)}</div>
        <div class="k">\u6A29\u9650</div><div class="v">${c(a)}</div>
        <div class="k">\u793E\u54E1\u30B3\u30FC\u30C9</div><div class="v">${c(o)}</div>
        <div class="k">\u90E8\u7F72</div><div class="v">${c(r)}</div>
      </div>
    </section>
  `}document.addEventListener("DOMContentLoaded",async()=>{y(),k(),x();try{const e=document.querySelector(".topbar-inner .search");if(e&&e.dataset.bound!=="1"){e.dataset.bound="1";const t=e.querySelector('input[type="search"]'),n=e.querySelector(".search-close"),s=e.querySelector(".search-hint"),a=()=>{e.classList.add("active");try{t?.focus(),t?.select()}catch{}},o=()=>{e.classList.remove("active");try{t?.blur()}catch{}};t&&t.addEventListener("focus",a),s&&s.addEventListener("click",r=>{r.preventDefault(),a()}),n&&n.addEventListener("click",r=>{r.preventDefault(),o()}),document.addEventListener("keydown",r=>{if(r.key==="Escape")return o();const d=(r.key==="k"||r.key==="K")&&(r.ctrlKey||r.metaKey),p=(r.key==="k"||r.key==="K")&&!r.ctrlKey&&!r.metaKey&&!r.altKey&&!r.shiftKey;if(d||p){const l=r.target,h=l?.tagName?.toLowerCase()||"";if((l?.isContentEditable||["input","textarea","select"].includes(h))&&!d)return;r.preventDefault(),a()}}),document.addEventListener("click",r=>{e.classList.contains("active")&&(r.target?.closest?.(".topbar-inner .search")||o())})}}catch{}try{const e=await v();if(!e){m(),window.location.replace("/ui/login");return}try{const n=JSON.stringify(e||{});sessionStorage.setItem("user",n),localStorage.setItem("user",n)}catch{}const t=i("#userName");t&&(t.textContent=e.username||e.email||"\u30E6\u30FC\u30B6\u30FC"),w(e)}catch(e){g(`\u8AAD\u8FBC\u30A8\u30E9\u30FC: ${e?.message||"unknown"}`)}finally{m()}});
