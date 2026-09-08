import{fetchJSONAuth as B}from"../../api/http.api.js";async function z(c={}){const x=c&&c.content||document.querySelector("#adminContent");if(!x)return;x.innerHTML=`
    <div class="audit-page" style="padding:16px;max-width:1200px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">\u76E3\u67FB\u30ED\u30B0</h2>
      
      <!-- Filters -->
      <div class="audit-filters" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">\u30A2\u30AF\u30B7\u30E7\u30F3</label>
          <select id="auditFilterAction" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
            <option value="">\u3059\u3079\u3066</option>
            <option value="admin_user_create">\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210</option>
            <option value="admin_user_update">\u30E6\u30FC\u30B6\u30FC\u66F4\u65B0</option>
            <option value="admin_user_delete">\u30E6\u30FC\u30B6\u30FC\u524A\u9664</option>
            <option value="admin_employee_create">\u793E\u54E1\u4F5C\u6210</option>
            <option value="login">\u30ED\u30B0\u30A4\u30F3</option>
            <option value="logout">\u30ED\u30B0\u30A2\u30A6\u30C8</option>
            <option value="password_change">\u30D1\u30B9\u30EF\u30FC\u30C9\u5909\u66F4</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">\u958B\u59CB\u65E5</label>
          <input type="date" id="auditFilterFrom" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">\u7D42\u4E86\u65E5</label>
          <input type="date" id="auditFilterTo" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
        </div>
        <button id="auditBtnSearch" type="button" style="height:32px;padding:0 14px;background:#0b2c66;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;">\u691C\u7D22</button>
        <button id="auditBtnReset" type="button" style="height:32px;padding:0 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;cursor:pointer;">\u30EA\u30BB\u30C3\u30C8</button>
      </div>

      <!-- Results -->
      <div id="auditStatus" style="font-size:12px;color:#64748b;margin-bottom:8px;"></div>
      <div class="audit-table-wrap" style="border:1px solid #e2e8f0;border-radius:8px;overflow:auto;max-height:65vh;">
        <table class="audit-table" style="width:100%;border-collapse:collapse;min-width:800px;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">\u65E5\u6642</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">\u30E6\u30FC\u30B6\u30FCID</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">\u30A2\u30AF\u30B7\u30E7\u30F3</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">\u30E1\u30BD\u30C3\u30C9</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">\u30D1\u30B9</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">IP</th>
            </tr>
          </thead>
          <tbody id="auditTableBody">
            <tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div id="auditPager" style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:12px;color:#64748b;"></div>
    </div>
  `;let y=1;const r=30,h={admin_user_create:"\u30E6\u30FC\u30B6\u30FC\u4F5C\u6210",admin_user_update:"\u30E6\u30FC\u30B6\u30FC\u66F4\u65B0",admin_user_delete:"\u30E6\u30FC\u30B6\u30FC\u524A\u9664",admin_employee_create:"\u793E\u54E1\u4F5C\u6210",login:"\u30ED\u30B0\u30A4\u30F3",logout:"\u30ED\u30B0\u30A2\u30A6\u30C8",password_change:"\u30D1\u30B9\u30EF\u30FC\u30C9\u5909\u66F4"};function v(t){if(!t)return"-";try{return new Date(t).toLocaleString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(t).slice(0,16)}}function i(t){return String(t||"").replace(/[<>&"']/g,n=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"})[n])}async function o(t=1){y=t;const n=document.getElementById("auditFilterAction")?.value||"",u=document.getElementById("auditFilterFrom")?.value||"",f=document.getElementById("auditFilterTo")?.value||"",a=new URLSearchParams({page:t,pageSize:r});n&&a.set("action",n),u&&a.set("from",u),f&&a.set("to",f);const d=document.getElementById("auditStatus"),l=document.getElementById("auditTableBody"),g=document.getElementById("auditPager");try{d&&(d.textContent="\u8AAD\u307F\u8FBC\u307F\u4E2D...");const p=await B(`/api/admin/audit?${a.toString()}`),{data:b=[],total:m=0,pages:s=1}=p||{};if(d&&(d.textContent=`\u5168 ${m} \u4EF6\u4E2D ${(t-1)*r+1}\u2013${Math.min(t*r,m)} \u4EF6\u3092\u8868\u793A`),b.length?l.innerHTML=b.map(e=>`
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 10px;white-space:nowrap;">${v(e.created_at)}</td>
            <td style="padding:6px 10px;">${i(e.userId||"-")}</td>
            <td style="padding:6px 10px;"><span style="background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${i(h[e.action]||e.action)}</span></td>
            <td style="padding:6px 10px;font-family:monospace;font-size:12px;">${i(e.method||"")}</td>
            <td style="padding:6px 10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${i(e.path)}">${i(e.path||"")}</td>
            <td style="padding:6px 10px;font-size:11px;color:#64748b;">${i(e.ip||"")}</td>
          </tr>
        `).join(""):l.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">\u8A72\u5F53\u3059\u308B\u30ED\u30B0\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>',g){const e=t<=1?"disabled":"",w=t>=s?"disabled":"";g.innerHTML=`
          <span>\u30DA\u30FC\u30B8 ${t} / ${s}</span>
          <div style="display:flex;gap:8px;">
            <button id="auditPrev" ${e} style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">\u524D\u3078</button>
            <button id="auditNext" ${w} style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">\u6B21\u3078</button>
          </div>
        `,document.getElementById("auditPrev")?.addEventListener("click",()=>{t>1&&o(t-1)}),document.getElementById("auditNext")?.addEventListener("click",()=>{t<s&&o(t+1)})}}catch(p){l&&(l.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">\u30A8\u30E9\u30FC: ${i(p.message)}</td></tr>`),d&&(d.textContent="")}}document.getElementById("auditBtnSearch")?.addEventListener("click",()=>o(1)),document.getElementById("auditBtnReset")?.addEventListener("click",()=>{document.getElementById("auditFilterAction").value="",document.getElementById("auditFilterFrom").value="",document.getElementById("auditFilterTo").value="",o(1)}),await o(1)}export{z as mount};
