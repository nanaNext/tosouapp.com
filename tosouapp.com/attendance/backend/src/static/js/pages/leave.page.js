import{myPaidBalance as p,applyPaidLeave as v,listMyRequests as g}from"../api/leave.api.js";const n=t=>document.querySelector(t),u=()=>`se.leaveDraft.v1:${String(window.location.pathname||"")}`,m=()=>{try{const t=localStorage.getItem(u()),e=t?JSON.parse(t):null;return e&&typeof e=="object"?e:null}catch{return null}},y=()=>{try{if(!n("#applyForm"))return;const e={savedAt:Date.now(),startDate:String(n("#startDate")?.value||""),endDate:String(n("#endDate")?.value||""),reason:String(n("#reason")?.value||"")};localStorage.setItem(u(),JSON.stringify(e))}catch{}},f=()=>{try{localStorage.removeItem(u())}catch{}};async function $(){const t=n("#balance");if(!t){await i();return}t.innerHTML="<div>\u6B8B\u6570\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>";try{const e=await p(),s=e.grants||[],o=s.map(a=>`<tr><td>${a.grantDate}</td><td>${a.expiryDate}</td><td>${a.daysGranted}</td><td>${a.daysRemaining}</td></tr>`).join("");t.innerHTML=`
      <h3>\u6B8B\u6570</h3>
      <div>\u4ED8\u4E0E\u5408\u8A08: <strong>${s.reduce((a,r)=>a+r.daysGranted,0)}</strong>\u65E5</div>
      <div>\u4F7F\u7528\u65E5\u6570: <strong>${e.usedDays||0}</strong>\u65E5</div>
      <div>\u6B8B\u65E5\u6570: <strong>${e.totalAvailable}</strong>\u65E5</div>
      <div>\u53D6\u5F97\u7FA9\u52D9(\u5E745\u65E5) \u6B8B\u308A: <strong>${Math.max(0,e.obligation?.remaining||0)}</strong>\u65E5</div>
      <table style="width:100%;margin-top:8px">
        <thead><tr><th>\u4ED8\u4E0E\u65E5</th><th>\u671F\u9650</th><th>\u4ED8\u4E0E</th><th>\u6B8B</th></tr></thead>
        <tbody>${o}</tbody>
      </table>
    `,await i()}catch(e){t&&(t.innerHTML=`<div style="color:#b00">\u53D6\u5F97\u5931\u6557: ${e?.message||"error"}</div>`)}}async function i(){const t=n("#applyResult");try{const s=(await g()).map((a,r)=>{const d=`R-${String(r+1).padStart(7,"0")}`,c=a.type||"\u2014",l=String(a.status||"").toLowerCase();return`
        <tr>
          <td style="white-space:nowrap;"><a href="#">${d}</a></td>
          <td><span class="${l==="approved"?"adj-status-approved":l==="rejected"?"adj-status-rejected":"adj-status-pending"}">${l==="approved"?"\u627F\u8A8D\u6E08\u307F":l==="rejected"?"\u5374\u4E0B":"\u627F\u8A8D\u5F85\u3061"}</span></td>
          <td>${c}</td>
          <td>${a.startDate||""} \u301C ${a.endDate||""}</td>
        </tr>
      `}).join("");t.innerHTML=`
      <div class="adjust-list-header-row">
        <h3 class="adj-list-title">\u7533\u8ACB</h3>
        <div class="adj-toolbar">
          <input id="leaveSearch" placeholder="\u3053\u306E\u30EA\u30B9\u30C8\u3092\u691C\u7D22\u2026" class="adj-search-input">
        </div>
      </div>
      <div class="adj-table-card">
        <table class="adj-table">
          <thead><tr><th>\u7533\u8ACB\u756A\u53F7</th><th>\u30B9\u30C6\u30FC\u30BF\u30B9</th><th>\u30EC\u30B3\u30FC\u30C9\u30BF\u30A4\u30D7</th><th>\u671F\u9593</th></tr></thead>
          <tbody>${s}</tbody>
        </table>
      </div>
    `;const o=document.getElementById("leaveSearch");if(o){let a=0;o.addEventListener("input",()=>{try{clearTimeout(a)}catch{}a=setTimeout(()=>{const r=String(o.value||"").trim().toLowerCase();t.querySelectorAll(".adj-table tbody tr").forEach(d=>{const c=d.textContent.toLowerCase().includes(r);d.style.display=c?"":"none"})},180)})}}catch(e){t.innerHTML="\u5C65\u6B74\u53D6\u5F97\u5931\u6557: "+(e?.message||"error")}}function D(){const t=n("#applyForm"),e=n("#applyResult"),s=m();if(s){try{s.startDate&&(n("#startDate").value=s.startDate)}catch{}try{s.endDate&&(n("#endDate").value=s.endDate)}catch{}try{s.reason!=null&&(n("#reason").value=s.reason)}catch{}}try{const r=globalThis;Array.isArray(r.__draftFlushers)||(r.__draftFlushers=[]),r.__draftFlushers.push(y)}catch{}let o=0;const a=()=>{try{clearTimeout(o)}catch{}o=setTimeout(y,400)};t.addEventListener("input",a),t.addEventListener("change",a),t.addEventListener("submit",async r=>{r.preventDefault();const d=n("#startDate").value,c=n("#endDate").value,l=n("#reason").value||"";if(!d||!c){e.textContent="\u65E5\u4ED8\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044";return}try{await v({startDate:d,endDate:c,reason:l}),e.textContent="\u7533\u8ACB\u3057\u307E\u3057\u305F",f(),await i()}catch(h){e.textContent="\u7533\u8ACB\u5931\u6557: "+(h?.message||"error")}})}document.addEventListener("DOMContentLoaded",async()=>{D(),await i()});
