import{me as b,refresh as L,logout as A}from"../api/auth.api.js";import{fetchJSONAuth as h}from"../api/http.api.js";const a=s=>document.querySelector(s),I=()=>{try{const s=a("#userName");if(!s)return;const o=sessionStorage.getItem("user")||localStorage.getItem("user")||"",r=o?JSON.parse(o):null,n=r&&(r.username||r.email)?String(r.username||r.email):"";n&&(s.textContent=n)}catch{}},x=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||"")),C=()=>new Date(Date.now()+9*3600*1e3).toISOString().slice(0,10);async function T(){let s=sessionStorage.getItem("accessToken"),o=null;if(s)try{o=await b(s)}catch{}if(!o)try{const r=await L();sessionStorage.setItem("accessToken",r.accessToken),o=await b(r.accessToken)}catch{}if(!o)try{const r=sessionStorage.getItem("user")||localStorage.getItem("user")||"",n=r?JSON.parse(r):null;n&&(n.role==="admin"||n.role==="manager"||n.role==="employee")&&(o=n)}catch{}return o||null}const m=s=>{const o=a("#error");o&&(o.style.display=s?"block":"none",o.textContent=s||"")};document.addEventListener("DOMContentLoaded",async()=>{I();const s=a("#pageSpinner"),o=()=>{},r=await T();if(!r){try{window.location.replace("/ui/login")}catch{window.location.href="/ui/login"}return}try{const e=a("#userName");e&&(e.textContent=r.username||r.email||"\u30E6\u30FC\u30B6\u30FC")}catch{}const n=async()=>{try{await A()}catch{}try{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("user")}catch{}try{localStorage.removeItem("refreshToken"),localStorage.removeItem("user")}catch{}try{window.location.replace("/ui/login")}catch{window.location.href="/ui/login"}};try{const e=document.querySelector(".user-btn"),t=a("#userDropdown");e&&t&&e.dataset.bound!=="1"&&(e.dataset.bound="1",e.addEventListener("click",i=>{i.preventDefault(),t.hasAttribute("hidden")?t.removeAttribute("hidden"):t.setAttribute("hidden","")}),document.addEventListener("click",i=>{i.target?.closest?.(".user-menu")||t.setAttribute("hidden","")}))}catch{}try{a("#btnLogout")?.addEventListener("click",n)}catch{}try{a("#drawerLogout")?.addEventListener("click",n)}catch{}try{const e=a("#mobileMenuBtn"),t=a("#mobileDrawer"),i=a("#mobileClose"),c=a("#drawerBackdrop");if(e&&t){if(e.dataset.bound==="1")return;e.dataset.bound="1";const u=g=>{const k=t.hasAttribute("hidden");(typeof g=="boolean"?g:k)?(t.removeAttribute("hidden"),e.setAttribute("aria-expanded","true"),document.body.classList.add("drawer-open"),c&&c.removeAttribute("hidden")):(t.setAttribute("hidden",""),e.setAttribute("aria-expanded","false"),document.body.classList.remove("drawer-open"),c&&c.setAttribute("hidden",""))};e.addEventListener("click",()=>u()),i&&i.addEventListener("click",()=>u(!1))}}catch{}const f=new URLSearchParams(window.location.search),l=x(f.get("date"))?String(f.get("date")):C(),w=a("#workReport");if(!w)return;try{const e=await h(`/api/attendance/status?date=${encodeURIComponent(l)}`),t=!!e?.open,i=Array.isArray(e?.timesheet?.days)&&e.timesheet.days.length>0;if(t||!i){w.innerHTML=`
        <div class="wr-wrap">
          <div class="wr-title">\u4F5C\u696D\u5831\u544A</div>
          <div class="wr-date">${l}</div>
          <div class="wr-card">
            <div class="wr-status">\u9000\u52E4\u5F8C\u306B\u4F5C\u696D\u5831\u544A\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002</div>
            <div class="wr-actions">
              <a class="btn" href="/ui/today-work">\u672C\u65E5\u306E\u51FA\u52E4\u3078</a>
              <a class="btn" href="/ui/portal">\u30DB\u30FC\u30E0\u3078</a>
            </div>
          </div>
        </div>
      `;return}}catch{}let v=null,d=!1;try{const e=await h(`/api/work-reports/my?date=${encodeURIComponent(l)}`);v=e?.report||null,d=!!e?.closed}catch{}const p=e=>String(e||"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),y=p(v?.site||""),S=p(v?.work||"");w.innerHTML=`
    <div class="wr-wrap">
      <div class="wr-title">\u4F5C\u696D\u5831\u544A</div>
      <div class="wr-date">${l}</div>
      <div class="wr-card">
        <form id="reportForm">
          <div class="wr-row">
            <div class="wr-label">\u73FE\u5834</div>
            <div><input id="site" class="wr-input" placeholder="\u73FE\u5834\u540D" value="${y}" ${d?"disabled":""} required></div>
          </div>
          <div class="wr-row">
            <div class="wr-label">\u4F5C\u696D\u5185\u5BB9</div>
            <div><textarea id="work" class="wr-textarea" placeholder="\u672C\u65E5\u306E\u4F5C\u696D\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" ${d?"disabled":""} required>${S}</textarea></div>
          </div>
          <div class="wr-actions">
            <button type="submit" class="btn" ${d?"disabled":""}>\u4FDD\u5B58</button>
            <a class="btn" href="/ui/today-work">\u672C\u65E5\u306E\u51FA\u52E4\u3078</a>
          </div>
          <div class="wr-note">${d?"\u3053\u306E\u6708\u306F\u7DE0\u3081\u6E08\u307F\u306E\u305F\u3081\u7DE8\u96C6\u3067\u304D\u307E\u305B\u3093\u3002":"\u9000\u52E4\u5F8C\u306E\u4F5C\u696D\u5831\u544A\u306F\u5FC5\u9808\u3067\u3059\u3002"}</div>
          <div id="status" class="wr-status"></div>
        </form>
      </div>
    </div>
  `,a("#reportForm").addEventListener("submit",async e=>{e.preventDefault(),m("");const t=a("#status");if(t&&(t.textContent="\u4FDD\u5B58\u4E2D\u2026"),d){t&&(t.textContent=""),m("\u3053\u306E\u6708\u306F\u7DE0\u3081\u6E08\u307F\u306E\u305F\u3081\u7DE8\u96C6\u3067\u304D\u307E\u305B\u3093\u3002");return}const i=String(a("#site")?.value||"").trim(),c=String(a("#work")?.value||"").trim();if(!i||!c){t&&(t.textContent=""),m("\u73FE\u5834\u3068\u4F5C\u696D\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}try{await h("/api/work-reports",{method:"POST",body:JSON.stringify({date:l,site:i,work:c})}),t&&(t.textContent="\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002")}catch(u){t&&(t.textContent=""),m("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(u?.message||"unknown"))}});try{s&&s.setAttribute("hidden","")}catch{}});
