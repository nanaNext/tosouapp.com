import{fetchJSONAuth as O}from"../api/http.api.js";const j=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),$=(e,t=document)=>t.querySelector(e),Z=(e,t=document)=>Array.from(t.querySelectorAll(e));let w=null,c=new Date,at={},st=null;const rt=[{value:"paid",label:"\u6709\u7D66\u4F11\u6687"},{value:"unpaid",label:"\u6B20\u52E4 / \u7121\u7D66\u4F11\u6687"},{value:"special",label:"\u7279\u5225\u4F11\u6687"}],lt=[{value:"\u79C1\u7528\u306E\u305F\u3081",label:"\u79C1\u7528\u306E\u305F\u3081"},{value:"\u4F53\u8ABF\u4E0D\u826F",label:"\u4F53\u8ABF\u4E0D\u826F"},{value:"\u5B9A\u671F\u5065\u8A3A",label:"\u5B9A\u671F\u5065\u8A3A"},{value:"other",label:"\u305D\u306E\u4ED6"}],dt=[{value:"OFF",label:"\u4F11\u307F"},{value:"WORKING",label:"\u51FA\u52E4"}];async function Q(){const e=$("#pageSpinner");e&&e.removeAttribute("hidden");try{const t=$("#userName");if(t){const n=sessionStorage.getItem("user")||localStorage.getItem("user")||"",i=n?JSON.parse(n):null,r=i&&(i.username||i.email)?String(i.username||i.email):"";r&&(t.textContent=r)}}catch{}try{if(w=await O("/api/auth/me"),!w||w.error){window.location.replace("/ui/login?next=/ui/shifts-all");return}const t=$("#userName");if(t&&w){const i=w.username||w.email;i&&(t.textContent=i)}try{sessionStorage.setItem("user",JSON.stringify(w)),localStorage.setItem("user",JSON.stringify(w))}catch{}const n=w.employment_type==="full_time"||w.employment_type==="\u6B63\u793E\u54E1";await _(c.getFullYear(),c.getMonth()),q()}catch(t){if(console.error(t),t.message&&(t.message.includes("Invalid or expired token")||t.message.includes("No token provided"))){window.location.replace("/ui/login?next=/ui/shifts-all");return}alert(`\u30E6\u30FC\u30B6\u30FC\u60C5\u5831\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002
`+t.message+`
`+t.stack)}finally{e&&e.setAttribute("hidden",""),document.documentElement.classList.remove("portal-preboot")}}function tt(){if(window.__employeeUserMenuDelegated)return;window.__employeeUserMenuDelegated=!0;const e=document.querySelector("#btnLogout");e&&e.addEventListener("click",async()=>{try{await fetch("/api/auth/logout",{method:"POST"})}catch{}sessionStorage.clear(),localStorage.clear(),window.location.replace("/ui/login")}),document.addEventListener("click",t=>{const n=t.target&&t.target.closest&&t.target.closest(".user .user-btn"),i=t.target&&t.target.closest&&t.target.closest(".user-menu"),r=document.querySelector("#userDropdown"),a=document.querySelector(".user .user-btn");if(n){t.preventDefault(),r&&a&&(r.hasAttribute("hidden")?(r.removeAttribute("hidden"),a.setAttribute("aria-expanded","true")):(r.setAttribute("hidden",""),a.setAttribute("aria-expanded","false")));return}!i&&r&&!r.hasAttribute("hidden")&&(r.setAttribute("hidden",""),a&&a.setAttribute("aria-expanded","false"))})}let A=[],z={};async function _(e,t){try{const n=`${e}-${String(t+1).padStart(2,"0")}`,i=await O(`/api/attendance/shifts/all-employees?month=${n}`);A=Array.isArray(i)?i:[],z={};const r=Y(e,t);await Promise.all(r.map(async a=>{const p=F(a),v=a.getDay();try{const u=await O(`/api/attendance/calendar/day/${encodeURIComponent(p)}`);z[p]=Number(u?.is_off||0)===1}catch{z[p]=v===0||v===6}})),r.forEach(a=>{const p=F(a),v=a.getDay(),u=v===0,o=v===6&&a.getDate()>=22&&a.getDate()<=28;z[`${p}_koujibu`]=u||o})}catch(n){console.error("Failed to load all employees shifts",n),A=[]}}function Y(e,t){const n=new Date(e,t,1),i=[];for(;n.getMonth()===t;)i.push(new Date(n)),n.setDate(n.getDate()+1);return i}function F(e){const t=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),i=String(e.getDate()).padStart(2,"0");return`${t}-${n}-${i}`}function R(e){return["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"][e.getDay()]}function q(){const e=$("#shiftsApp"),t=c.getFullYear(),n=c.getMonth(),i=Y(t,n);let r=`
    <tr>
      <th style="min-width: 150px; position: sticky; left: 0; background: #334155; z-index: 10;">\u5F93\u696D\u54E1\u540D</th>
      <th style="min-width: 100px;">\u90E8\u7F72</th>
      <th style="min-width: 100px;">\u96C7\u7528\u5F62\u614B</th>
      ${i.map(o=>{const h=o.getDay(),l=R(o);let g="#fff";h===0?g="#fca5a5":h===6&&(g="#93c5fd");let f="";try{if(typeof window.Lunar<"u"){const x=window.Lunar.fromDate(o),d=x.getDay(),L=x.getMonth();d===1?f=`${L}/${d}`:f=`${d}`}}catch{}const E=f?`<br><span style="font-size: 10px; color: #94a3b8; font-weight: normal;">${j(f)}</span>`:"";return`<th style="min-width: 40px; color: ${g};">${o.getDate()}<br><span style="font-size: 10px;">${l}</span>${E}</th>`}).join("")}
    </tr>
  `,a="",p='<div class="shift-mobile-list">';A.length===0?(a=`<tr><td colspan="${3+i.length}" style="text-align: center; padding: 20px;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>`,p+='<div style="padding: 20px; text-align: center; color: #94a3b8;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>'):A.forEach(o=>{const h=o.employment_type==="full_time"||o.employment_type==="\u6B63\u793E\u54E1"||o.employment_type==="\u6B63",l=h?"\u6B63":"\u30D1\u30FC\u30C8";let g=`
        <tr>
          <td style="position: sticky; left: 0; background: #fff; z-index: 5; font-weight: bold;">
            <a href="/ui/shifts?userId=${o.id}" style="color: #2563eb; text-decoration: none;" title="\u3053\u306E\u5F93\u696D\u54E1\u306E\u30B7\u30D5\u30C8\u3092\u7DE8\u96C6\u3059\u308B">${j(o.username)}</a>
          </td>
          <td>${j(o.departmentName||"")}</td>
          <td>${l}</td>
      `,f=0;const E=new Date(t,n,1).getDay();let x='<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 0;">';for(let d=0;d<E;d++)x+='<div class="sac-day-item empty" style="border: none; background: transparent;"></div>';i.forEach(d=>{const L=R(d),N=F(d),s=o.schedule&&o.schedule[N];let B="",W="-";const M=d.getDay(),K=String(o.departmentName||"").includes("\u5DE5\u4E8B\u90E8"),C=z[N]===!0,U=M===6&&Math.ceil(d.getDate()/7)===4;let T=!1;K?T=z[`${N}_koujibu`]===!0||C:h?T=M===0||C||U:T=M===0||M===6||C;const P=T;let b="",y="",k="";s&&s.status==="LEAVE"?s.leaveType==="paid"?(b="\u6709\u4F11",y="status-paid",k="#d97706"):s.leaveType==="unpaid"?(b="\u6B20",y="status-unpaid",k="#9333ea"):(b="\u4F11",y="status-holiday",k="#dc2626"):P&&(!s||s.status!=="WORKING")?(b="\u4F11",y="status-holiday",k="#dc2626"):s&&s.status==="WORKING"?(P?(b="\u51FA",y="status-holiday-work",k="#0284c7"):(b="\u51FA\u52E4",y="status-working",k="#16a34a"),f++):s&&s.status==="OFF"?(b="\u4F11",y="status-holiday",k="#dc2626"):(b="-",y="status-empty",k="#94a3b8");let V="";if(s&&s.status==="LEAVE"){const J=s.reason&&s.reason!==""&&s.reason!=="other",X=s.detail&&s.detail.trim()!=="";(J||X)&&(V='<div style="width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; position: absolute; top: 2px; right: 2px;" title="\u7406\u7531\u3042\u308A"></div>')}const H=s&&s.status==="LEAVE"?`\u7406\u7531: ${s.reason||"\u306A\u3057"}${s.detail?` - ${s.detail}`:""}`:"",G=H?`title="${H}"`:"",nt=H?"cursor: help;":"";B=`<div class="shift-cell ${y}" style="color: ${k}; font-weight: bold; font-size: 12px; position: relative; width: 100%; height: 100%; min-height: 20px; display: flex; align-items: center; justify-content: center;" ${G}><span class="shift-text">${b}</span><div class="shift-line"></div>${V}</div>`,W=b,g+=`<td class="print-cell ${y}" style="text-align: center; vertical-align: middle; padding: 4px;">${B}</td>`;let I="#0f172a";M===0?I="#dc2626":M===6&&(I="#2563eb");const m=s||{};let S="",D="#0f172a";m.status==="WORKING"?(S="\u51FA",D="#1e40af"):m.status==="OFF"?(S="\u4F11",D="#ef4444"):m.status==="LEAVE"?(m.leaveType&&m.leaveType!=="paid"&&m.leaveType!=="special"&&m.leaveType!=="absence"?S="\u4F11":m.leaveType==="paid"?S="\u6709\u4F11":m.leaveType==="special"?S="\u7279\u4F11":m.leaveType==="absence"?S="\u6B20\u52E4":S="\u4F11",D="#ef4444"):(S="\u672A",D="#94a3b8"),x+=`
          <div class="sac-day-item" style="border: 1px solid #e2e8f0; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 42px; background: ${D==="#ef4444"?"#fef2f2":"#fff"}; box-sizing: border-box;">
            <div style="font-size: 11px; color: ${I}; font-weight: bold; line-height: 1.2;">${d.getDate()}</div>
            <div style="font-size: 12px; font-weight: bold; color: ${D}; margin-top: 2px;">${S}</div>
          </div>
        `}),x+="</div>",g+="</tr>",a+=g,p+=`
        <div class="sac-card">
          <div class="sac-header">
            <div class="sac-name-wrap">
              <a href="/ui/shifts?userId=${o.id}" style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 14px;">${j(o.username)}</a>
              <span class="${h?"badge-sei":"badge-bai"}">${l}</span>
            </div>
          </div>
          <div class="sac-summary">
            <span class="sac-total-label">\u6708\u8A08 (\u51FA\u52E4\u65E5\u6570):</span>
            <span class="sac-total-val" style="font-weight:700; color:#0f172a;">${f}\u65E5</span>
          </div>
          <div class="sac-days-scroll" style="overflow-x: hidden; display: flex; justify-content: center; padding-bottom: 8px;">
            <div style="width: 100%; max-width: 350px;">
              <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 4px 0 2px 0;">
                ${["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"].map((d,L)=>`<div style="text-align: center; font-size: 11px; font-weight: bold; color: ${L===0?"#ef4444":L===6?"#3b82f6":"#64748b"};">${d}</div>`).join("")}
              </div>
              ${x}
            </div>
          </div>
        </div>
      `}),p+="</div>";const v=`
    <style>
      .shift-line { display: none; }
      .badge-sei { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #bfdbfe; }
      .badge-bai { background: #f8fafc; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #cbd5e1; }
      
      .shift-mobile-list {
        display: none;
        padding: 0;
        flex-direction: column;
        gap: 12px;
      }
      .sac-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
      }
      .sac-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
      }
      .sac-name-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sac-name {
        font-weight: 700;
        font-size: 15px;
        color: #0f172a;
      }
      .sac-summary {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 13px;
        color: #475569;
      }
      .sac-days-scroll {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        padding-bottom: 8px;
        margin-bottom: 8px;
      }
      .sac-day-item {
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #fff;
      }
      .sac-day-header {
        width: 100%;
        text-align: center;
        font-size: 10px;
        background: #f8fafc;
        padding: 2px 0;
        border-bottom: 1px solid #e2e8f0;
        font-weight: 600;
      }
      .sac-day-val {
        width: 100%;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }
      
      @media (max-width: 768px) {
        .shifts-desktop-table { display: none !important; }
        .shift-mobile-list { display: flex !important; }
      }
    </style>
    <div class="shifts-container" style="max-width: 100%; overflow-x: auto;">
      <div class="shifts-header" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #1e3a8a;">
        <div class="shifts-top-nav" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; width: 100%;">
          <div class="shifts-top-nav-left">
            <a href="/ui/shifts" style="padding: 8px 16px; border: 1px solid #d1d5db; background: #f8fafc; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: #334155; display: flex; align-items: center; gap: 6px; text-decoration: none; transition: all 0.2s;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              \u623B\u308B
            </a>
          </div>
          <div class="shifts-top-nav-right" style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
            <div class="modern-month-picker" style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); height: 38px;">
              <button id="prevMonth" class="modern-btn-nav" title="\u5148\u6708" style="padding: 0 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; height: 100%;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div class="modern-month-display" style="padding: 0 16px; font-weight: bold; font-size: 15px; color: #0f172a; min-width: 120px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; height: 100%;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${t}\u5E74 ${String(n+1).padStart(2,"0")}\u6708
              </div>
              <button id="nextMonth" class="modern-btn-nav" title="\u6765\u6708" style="padding: 0 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; height: 100%;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
        
        <hr style="border: none; border-top: 1px dashed #e2e8f0; margin: 2px 0; width: 100%;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="font-weight: bold; font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            \u5168\u54E1\u306E\u30B7\u30D5\u30C8\u72B6\u6CC1
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btnPrint" class="modern-btn" style="background: #64748b; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              \u5370\u5237
            </button>
            <button id="btnExportExcel" class="modern-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Excel\u51FA\u529B
            </button>
          </div>
        </div>
      </div>

      <div class="shifts-desktop-table" style="overflow-x: auto; border: 1px solid #d1d5db; border-radius: 4px; background: white;">
        <table style="width: 100%; border-collapse: collapse; min-width: 800px; font-size: 13px;">
          <thead style="background: #334155; color: white;">
            ${r}
          </thead>
          <tbody>
            ${a}
          </tbody>
        </table>
      </div>
      ${p}
    </div>
  `;e.innerHTML=v;const u=e.querySelector(".shift-mobile-list");if(u){const o=Array.from(u.querySelectorAll(".sac-card")),h=20;if(o.length>h){let l=1;const g=Math.ceil(o.length/h),f=document.createElement("div");f.style.cssText="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-size:13px;color:#475569;font-weight:600;",u.parentNode.insertBefore(f,u.nextSibling);const E=()=>{o.forEach((x,d)=>{x.style.display=d>=(l-1)*h&&d<l*h?"":"none"}),f.innerHTML=`\u30DA\u30FC\u30B8 ${l} / ${g} (${o.length}\u540D)\u3000<button id="shiftMobilePrev" type="button" style="padding:4px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font-weight:700;" ${l<=1?"disabled":""}>\u25C0</button> <button id="shiftMobileNext" type="button" style="padding:4px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font-weight:700;" ${l>=g?"disabled":""}>\u25B6</button>`,f.querySelector("#shiftMobilePrev")?.addEventListener("click",()=>{l>1&&(l--,E(),window.scrollTo({top:0,behavior:"instant"}))}),f.querySelector("#shiftMobileNext")?.addEventListener("click",()=>{l<g&&(l++,E(),window.scrollTo({top:0,behavior:"instant"}))})};E()}}Z(".shifts-desktop-table td, .shifts-desktop-table th",e).forEach(o=>{o.style.border="1px solid #e2e8f0",o.style.padding="8px 4px"}),et()}function et(){$("#prevMonth").addEventListener("click",async()=>{c.setMonth(c.getMonth()-1),await _(c.getFullYear(),c.getMonth()),q()}),$("#nextMonth").addEventListener("click",async()=>{c.setMonth(c.getMonth()+1),await _(c.getFullYear(),c.getMonth()),q()});const e=$("#btnExportExcel");e&&e.addEventListener("click",()=>{const n=c.getFullYear(),i=String(c.getMonth()+1).padStart(2,"0");window.location.href=`/api/attendance/shifts/all-employees/export?year=${n}&month=${i}`});const t=$("#btnPrint");t&&t.addEventListener("click",()=>{const n=document.querySelector(".shifts-desktop-table");if(!n)return;const i=c.getFullYear(),r=String(c.getMonth()+1).padStart(2,"0"),a={};A.forEach(h=>{const l=h.departmentName||"\u672A\u914D\u5C5E";a[l]=(a[l]||0)+1});const p=Object.entries(a).map(([h,l])=>`${h}: ${l}\u540D`).join("\u3000"),v=A,u=window.open("","_blank");if(!u){alert("\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u307E\u3057\u305F\u3002\u30D6\u30E9\u30A6\u30B6\u306E\u8A2D\u5B9A\u3067\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const o=n.innerHTML;u.document.write(`
        <!DOCTYPE html>
        <html lang="ja">
          <head>
            <meta charset="utf-8">
            <title>\u30B7\u30D5\u30C8\u5370\u5237</title>
            <style>
              @page { 
                size: landscape; /* Cho ph\xE9p ng\u01B0\u1EDDi d\xF9ng t\u1EF1 do ch\u1ECDn A3, A4... tr\xEAn h\u1ED9p tho\u1EA1i in */
                margin: 15mm 10mm; /* T\u0103ng l\u1EC1 tr\xEAn \u0111\u1EC3 kh\xF4ng b\u1ECB m\u1EA5t ti\xEAu \u0111\u1EC1 */
              }
              body { 
                font-family: "Noto Sans JP", sans-serif; 
                margin: 0; 
                padding: 0; 
                background: #fff; 
                color: #000; 
              }
              h2 { 
                text-align: center; 
                margin: 0 0 20px 0; 
                font-size: 20px; 
                color: #0f172a;
                padding-top: 10px; /* Th\xEAm padding \u0111\u1EC3 ch\u1EAFc ch\u1EAFn ti\xEAu \u0111\u1EC1 kh\xF4ng d\xEDnh m\xE9p gi\u1EA5y */
              }
              .print-container {
                width: 100%;
              }
              table { 
                width: 100% !important; 
                border-collapse: collapse; 
                table-layout: fixed !important; /* \u0110\u1ED5i th\xE0nh fixed \u0111\u1EC3 \xE9p nh\u1ECF c\xE1c c\u1ED9t ng\xE0y */
              }
              th, td { 
                border: 1px solid #94a3b8 !important; 
                padding: 1px !important; /* Thu nh\u1ECF padding \u0111\u1EC3 ti\u1EBFt ki\u1EC7m di\u1EC7n t\xEDch t\u1ED1i \u0111a */
                text-align: center !important; 
                font-size: 10px !important; 
                word-break: keep-all !important; 
                white-space: nowrap !important; 
                position: static !important; 
                min-width: 0 !important; 
              }
              th { 
                background-color: #334155 !important; 
                color: white !important; 
              }
              th span, th div, td div {
                font-size: 10px !important;
              }
              /* \u1EA8n to\xE0n b\u1ED9 ch\u1EEF khi in, ch\u1EC9 hi\u1EC3n th\u1ECB m\xE0u n\u1EC1n */
              .shift-text { 
                display: none !important; 
              }
              /* V\u1EBD m\u1ED9t v\u1EA1ch ngang \u1EDF gi\u1EEFa \xF4 thay v\xEC t\xF4 full n\u1EC1n */
              .shift-line {
                display: block !important;
                width: 70% !important;
                height: 6px !important;
                border-radius: 2px !important;
                margin: 0 auto !important;
              }
              .shift-cell { 
                display: flex !important; 
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important; 
                height: 18px !important; 
                min-height: 18px !important; 
              }
              
              /* \u0110\u1ECBnh ngh\u0129a m\xE0u s\u1EAFc cho c\xE1c v\u1EA1ch ngang khi in */
              td.status-working .shift-line { background-color: #22c55e !important; } /* Xanh l\xE1: \u51FA\u52E4 */
              td.status-holiday .shift-line { background-color: #f97316 !important; } /* Cam nh\u1EA1t: \u4F11 (thay cho \u0111\u1ECF t\u01B0\u01A1i) */
              td.status-paid .shift-line { background-color: #eab308 !important; } /* V\xE0ng: \u6709\u4F11 */
              td.status-unpaid .shift-line { background-color: #a855f7 !important; } /* T\xEDm: \u6B20 */
              td.status-holiday-work .shift-line { background-color: #06b6d4 !important; } /* Xanh l\u01A1: \u4F11\u65E5\u51FA\u52E4 */
              td.status-empty .shift-line { background-color: #cbd5e1 !important; } /* X\xE1m nh\u1EA1t: Kh\xF4ng c\xF3 l\u1ECBch */

              /* Thu h\u1EB9p t\u1ED1i \u0111a c\xE1c c\u1ED9t ng\xE0y th\xE1ng */
              th:nth-child(n+4), td:nth-child(n+4) {
                width: 15px !important;
              }
              th:nth-child(1) { width: 80px !important; } /* T\xEAn NV */
              th:nth-child(2) { width: 40px !important; } /* B\u1ED9 ph\u1EADn */
              th:nth-child(3) { width: 30px !important; } /* Ch\u1EE9c v\u1EE5 */

              /* B\u1EAFt bu\u1ED9c in m\xE0u n\u1EC1n */
              * { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <h2 style="margin-bottom:4px;">\u98EF\u585A\u5857\u7814\u682A\u5F0F\u4F1A\u793E</h2>
              <h3 style="text-align:center;margin:0 0 4px 0;font-size:16px;color:#334155;">\u5168\u54E1\u306E\u30B7\u30D5\u30C8\u72B6\u6CC1 - ${i}\u5E74${r}\u6708</h3>
              <p style="text-align:center;margin:0 0 12px 0;font-size:11px;color:#64748b;">\u7DCF\u4EBA\u6570: ${v.length}\u540D\u3000\u3000${p}</p>
              ${o}
              <div style="margin-top:16px;padding:8px 0;border-top:1px solid #e2e8f0;">
                <p style="font-weight:bold;font-size:11px;margin:0 0 6px 0;">\u3010\u51E1\u4F8B\u3011\u8272\u306E\u8AAC\u660E</p>
                <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:10px;">
                  <span><span style="display:inline-block;width:20px;height:6px;background:#22c55e;border-radius:2px;vertical-align:middle;"></span> \u51FA\u52E4\uFF08\u901A\u5E38\u52E4\u52D9\uFF09</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#f97316;border-radius:2px;vertical-align:middle;"></span> \u4F11\u65E5\uFF08\u4F1A\u793E\u30AB\u30EC\u30F3\u30C0\u30FC\u4F11\u65E5\uFF09</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#eab308;border-radius:2px;vertical-align:middle;"></span> \u6709\u4F11\uFF08\u6709\u7D66\u4F11\u6687\uFF09</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#a855f7;border-radius:2px;vertical-align:middle;"></span> \u6B20\u52E4\uFF08\u7121\u7D66\uFF09</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#06b6d4;border-radius:2px;vertical-align:middle;"></span> \u4F11\u65E5\u51FA\u52E4</span>
                  <span><span style="display:inline-block;width:20px;height:6px;background:#cbd5e1;border-radius:2px;vertical-align:middle;"></span> \u672A\u767B\u9332</span>
                </div>
                <p style="font-size:9px;color:#64748b;margin:6px 0 0 0;">\u203B \u30D1\u30FC\u30C8\u793E\u54E1\u306F\u56FA\u5B9A\u4F11\u65E5\u306A\u3057\u3002\u767B\u9332\u3057\u305F\u65E5\u306E\u307F\u300C\u51FA\u52E4\u300D\u6271\u3044\u3002</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 300);
              };
            <\/script>
          </body>
        </html>
      `),u.document.close()})}function it(){const e=document.querySelector("#mobileMenuBtn"),t=document.querySelector("#mobileDrawer"),n=document.querySelector("#mobileClose"),i=document.querySelector("#drawerBackdrop");if(!e||!t||e.dataset.bound==="1")return;e.dataset.bound="1";const r=()=>{t.removeAttribute("hidden"),e.setAttribute("aria-expanded","true"),i&&i.removeAttribute("hidden"),document.body.classList.add("drawer-open")},a=()=>{t.setAttribute("hidden",""),e.setAttribute("aria-expanded","false"),i&&i.setAttribute("hidden",""),document.body.classList.remove("drawer-open")};e.addEventListener("click",p=>{p.preventDefault(),t.hasAttribute("hidden")?r():a()}),n&&n.addEventListener("click",a),i&&i.addEventListener("click",a)}document.addEventListener("DOMContentLoaded",()=>{Q(),tt(),it()});
