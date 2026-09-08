import{me as H,refresh as Z,logout as tt}from"../api/auth.api.js";import{fetchJSONAuth as y}from"../api/http.api.js";const i=s=>document.querySelector(s),et=()=>{try{const s=i("#userName");if(!s)return;const n=sessionStorage.getItem("user")||localStorage.getItem("user")||"",e=n?JSON.parse(n):null,r=e&&(e.username||e.email)?String(e.username||e.email):"";r&&(s.textContent=r)}catch{}};async function nt(){let s=sessionStorage.getItem("accessToken"),n=null;if(s)try{n=await H(s)}catch{}if(!n)try{const e=await Z();sessionStorage.setItem("accessToken",e.accessToken),n=await H(e.accessToken)}catch{}if(!n)try{const e=sessionStorage.getItem("user")||localStorage.getItem("user")||"",r=e?JSON.parse(e):null;r&&(r.role==="admin"||r.role==="manager"||r.role==="employee")&&(n=r)}catch{}return n||null}const st=s=>{const n=i("#error");n&&(n.style.display=s?"block":"none",n.textContent=s||"")},g=s=>{if(!s)return"";const n=String(s).trim();return n?n.length>=16?n.slice(11,16):n:""},T=s=>s==="working"?"\u51FA\u52E4\u4E2D":s==="checked_out"?"\u9000\u52E4\u6E08":"\u672A\u51FA\u52E4",ot=(s,n,e)=>{const r=i("#todayWork");if(!r)return;const u=n?.me||{},t=n?.date||"",a=String(s?.role||"").toLowerCase(),d=a==="admin"||a==="manager",l=u.checkIn?u.checkOut?"checked_out":"working":"not_checked_in",v=g(u.checkIn),m=g(u.checkOut),w=Array.isArray(e?.items)?e.items:[],k=Array.isArray(e?.planned)?e.planned:[],B=new Map(k.map(o=>[String(o.userId),o])),f=w.map(o=>{const c=String(o.userId);return{id:c,it:o,plan:B.get(c)||null}}),D=new Set(w.map(o=>String(o.userId)));for(const o of k){const c=String(o.userId);D.has(c)||f.push({id:c,it:null,plan:o})}const b=f.map(({id:o,it:c,plan:p},S,J)=>{const I=c?.employeeCode||p?.employeeCode||`EMP${o.padStart(3,"0")}`,L=c?.username||p?.username||"",A=c?.departmentName||p?.departmentName||"\u2014",C=p?.planned?.shift?.name||"\u2014",E=p?.planned?.shift?.start_time||"\u2014",O=p?.planned?.shift?.end_time||"\u2014",q=g(c?.attendance?.checkIn)||"\u2014",P=g(c?.attendance?.checkOut)||"\u2014",j=c?.attendance?.site||"\u2014",z=c?.attendance?.work||"\u2014",x=String(p?.planned?.status||"")==="leave",N=x?"leave":c?.status||"not_checked_in",K=x?"\u4F11":T(N),_=S>0?J[S-1]:null,h=_&&_.id===o,V=h?`<td style="border-top:none; color:transparent;">${I}</td>`:`<td rowspan="1">${I}</td>`,W=h?`<td style="border-top:none; color:transparent;">${L}</td>`:`<td rowspan="1">${L}</td>`,F=h?`<td style="border-top:none; color:transparent;">${A}</td>`:`<td rowspan="1">${A}</td>`,G=h?`<td style="border-top:none; color:transparent;">${C}</td>`:`<td>${C}</td>`,Q=h?`<td class="text-center" style="border-top:none; color:transparent;">${E}</td>`:`<td class="text-center">${E}</td>`,X=h?`<td class="text-center" style="border-top:none; color:transparent;">${O}</td>`:`<td class="text-center">${O}</td>`,Y=h?'<td style="border-top:none;"></td>':`<td><span class="tw-pill ${N}">${K}</span></td>`;return`
      <tr>
        ${V}
        ${W}
        ${F}
        ${G}
        ${Q}
        ${X}
        <td class="text-center">${q}</td>
        <td class="text-center">${P}</td>
        <td>${j}</td>
        <td>${z}</td>
        ${Y}
      </tr>
    `}).join(""),R=d?`
    <div class="tw-card">
      <div class="tw-section-title">\u672C\u65E5\u306E\u4E88\u5B9A\u30FB\u5B9F\u7E3E</div>
      ${b?`
        <div class="tw-table-wrap">
          <table class="tw-table">
            <thead>
              <tr><th>\u793E\u54E1\u756A\u53F7</th><th>\u6C0F\u540D</th><th>\u90E8\u7F72</th><th>\u30B7\u30D5\u30C8</th><th>\u4E88\u5B9A\u958B\u59CB</th><th>\u4E88\u5B9A\u7D42\u4E86</th><th>\u51FA\u52E4</th><th>\u9000\u52E4</th><th>\u73FE\u5834</th><th>\u4F5C\u696D\u5185\u5BB9</th><th>\u72B6\u614B</th></tr>
            </thead>
            <tbody>${b}</tbody>
          </table>
        </div>
      `:`
        <div class="tw-empty"><div style="font-size:28px;">\u{1F5C2}\uFE0F</div><div>\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div></div>
      `}
    </div>
  `:"",M=d?(()=>{const o=n?.counts||{};return`
      <div class="tw-kpi-grid">
        <div class="tw-card"><div class="tw-kpi-title">\u5BFE\u8C61\u4EBA\u6570</div><div class="tw-kpi-value">${o.targetEmployees==null?0:o.targetEmployees}</div><div class="tw-kpi-sub">Expected employees</div></div>
        <div class="tw-card"><div class="tw-kpi-title">\u51FA\u52E4\u4EBA\u6570</div><div class="tw-kpi-value">${o.checkIn==null?0:o.checkIn}</div><div class="tw-kpi-sub">Checked in</div></div>
        <div class="tw-card"><div class="tw-kpi-title">\u672A\u51FA\u52E4</div><div class="tw-kpi-value">${o.notCheckedIn==null?0:o.notCheckedIn}</div><div class="tw-kpi-sub">Not checked in</div></div>
        <div class="tw-card"><div class="tw-kpi-title">\u672A\u9000\u52E4</div><div class="tw-kpi-value">${o.notCheckedOut==null?0:o.notCheckedOut}</div><div class="tw-kpi-sub">Not checked out</div></div>
      </div>
    `})():"",$=d?"":`
    <div class="tw-card">
      <div class="tw-section-title">\u3042\u306A\u305F\u306E\u72B6\u6CC1</div>
      <div class="tw-row">
        <div class="tw-label">\u72B6\u614B</div><div class="tw-strong">${T(l)}</div>
        <div class="tw-label">\u51FA\u52E4</div><div>${v}</div>
        <div class="tw-label">\u9000\u52E4</div><div>${m}</div>
      </div>
      <div class="tw-actions">
        <a class="btn" href="/ui/attendance">\u52E4\u6020\u5165\u529B\u3078</a>
        <a class="btn" href="/ui/portal">\u30DB\u30FC\u30E0\u3078</a>
      </div>
    </div>
  `,U=$?"tw-grid":"tw-grid tw-grid-1col";r.innerHTML=`
    <div class="today-wrap">
      <div class="today-title">\u672C\u65E5\u306E\u51FA\u52E4</div>
      <div class="today-date">${t}</div>
      ${M}
      <div class="${U}">
        ${R}
        ${$}
      </div>
    </div>
  `},at=s=>{const n=Array.isArray(s)?s:[];if(!n.length)return null;let e=n[0];for(const r of n){const u=String(r?.checkIn||""),t=String(e?.checkIn||"");u&&u>t&&(e=r)}return e},rt=async()=>{const s=new Date(Date.now()+324e5).toISOString().slice(0,10),n=await y(`/api/attendance/date/${encodeURIComponent(s)}`),e=at(n?.segments);return{date:s,me:{attendanceId:e?.id||null,checkIn:e?.checkIn||null,checkOut:e?.checkOut||null}}};document.addEventListener("DOMContentLoaded",async()=>{et();const s=i("#pageSpinner"),n=()=>{},e=await nt();if(!e){try{window.location.replace("/ui/login")}catch{window.location.href="/ui/login"}return}const r=async()=>{try{await tt()}catch{}try{sessionStorage.removeItem("accessToken"),sessionStorage.removeItem("refreshToken"),sessionStorage.removeItem("user")}catch{}try{localStorage.removeItem("refreshToken"),localStorage.removeItem("user")}catch{}try{window.location.replace("/ui/login")}catch{window.location.href="/ui/login"}};try{const t=String(window.location.pathname||"");if((t==="/ui/today-work"||t==="/ui/portal"||t==="/ui/dashboard")&&document.body.dataset.backLoginBound!=="1"){document.body.dataset.backLoginBound="1";try{history.pushState({back_to_login_guard:!0},"",window.location.href)}catch{}window.addEventListener("popstate",async()=>{await r()})}}catch{}try{const t=i("#userName");t&&(t.textContent=e.username||e.email||"\u30E6\u30FC\u30B6\u30FC")}catch{}try{const t=document.querySelector(".user-btn"),a=i("#userDropdown");t&&a&&t.dataset.bound!=="1"&&(t.dataset.bound="1",t.addEventListener("click",d=>{d.preventDefault(),a.hasAttribute("hidden")?a.removeAttribute("hidden"):a.setAttribute("hidden","")}),document.addEventListener("click",d=>{d.target?.closest?.(".user-menu")||a.setAttribute("hidden","")}))}catch{}const u=async()=>{await r()};try{i("#btnLogout")?.addEventListener("click",u)}catch{}try{i("#drawerLogout")?.addEventListener("click",u)}catch{}try{const t=i("#mobileMenuBtn"),a=i("#mobileDrawer"),d=i("#mobileClose"),l=i("#drawerBackdrop");if(t&&a){if(t.dataset.bound==="1")return;t.dataset.bound="1";const v=m=>{const w=a.hasAttribute("hidden");(typeof m=="boolean"?m:w)?(a.removeAttribute("hidden"),t.setAttribute("aria-expanded","true"),document.body.classList.add("drawer-open"),l&&l.removeAttribute("hidden")):(a.setAttribute("hidden",""),t.setAttribute("aria-expanded","false"),document.body.classList.remove("drawer-open"),l&&l.setAttribute("hidden",""))};t.addEventListener("click",()=>v()),d&&d.addEventListener("click",()=>v(!1))}}catch{}try{const t=String(e?.role||"").toLowerCase();let a=null,d=null;if(t==="admin"||t==="manager"){a=await y("/api/attendance/today-summary");try{d=await y("/api/attendance/today-roster")}catch{}}else a=await rt();ot(e,a,d);try{const l=a?.me||{};if((t==="employee"||t==="manager")&&l?.checkOut){const m=a?.date||"";if(!(await y(`/api/work-reports/my?date=${encodeURIComponent(m)}`))?.report){try{window.location.replace(`/ui/work-report?date=${encodeURIComponent(m)}`)}catch{window.location.href=`/ui/work-report?date=${encodeURIComponent(m)}`}return}}}catch{}}catch(t){st("\u30C7\u30FC\u30BF\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(t?.message||"unknown"))}finally{try{s&&s.setAttribute("hidden","")}catch{}}});
