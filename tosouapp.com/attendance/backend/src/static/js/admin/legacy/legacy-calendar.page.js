import{escapeHtml as i}from"../_shared/dom.js";import{api as x,downloadWithAuth as T}from"../../shared/api/client.js";let g=null;async function B({content:n}){await D({content:n})}async function D({content:n}){g=new AbortController;const{signal:f}=g,v=e=>String(e).padStart(2,"0"),M=e=>String(e||"").slice(0,7),L=e=>{const a=String(e||"").split(" / ");return{ja:a[0]||"",en:a.length>1?a.slice(1).join(" / "):""}},S=e=>{try{const[a,o,l]=String(e).slice(0,10).split("-").map(t=>parseInt(t,10)),p=new Date(Date.UTC(a,(o||1)-1,l||1));return["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"][p.getUTCDay()]}catch{return""}},q=e=>{try{const[a,o,l]=String(e).slice(0,10).split("-").map(c=>parseInt(c,10)),t=new Date(Date.UTC(a,(o||1)-1,l||1)).getUTCDay();return t===0||t===6}catch{return!1}},w=e=>{const a=String(e||"");return a==="jp_auto"?"\u795D\u65E5":a==="jp_substitute"?"\u632F\u66FF":a==="jp_bridge"?"\u56FD\u6C11\u306E\u4F11\u65E5":a==="fixed"?"\u4F1A\u793E":a==="custom"?"\u4EFB\u610F":a||"\u2014"},$=new Date(Date.now()+9*3600*1e3),m=$.getUTCFullYear(),H=`${m}-${v($.getUTCMonth()+1)}`,O=new URLSearchParams(window.location.search).get("standalone")==="1"?"100dvh":"calc(100vh - var(--topbar-height) - var(--subbar-height))";n.style.margin="0",n.style.padding="0",n.style.width="100%",n.style.height=O,n.style.display="flex",n.style.flexDirection="column",n.style.overflow="hidden",n.style.flex="1",n.style.minWidth="0",n.style.boxSizing="border-box",n.innerHTML=`
    <style>
      .cal-page-content { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: visible; padding: 24px; box-sizing: border-box; width: 100%; }
      .cal-table-wrap { flex: 1 1 0%; min-height: 0; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
      
      .attrec-controls { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
      .attrec-controls .filter-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .cal-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      
      @media (max-width: 768px) {
        .cal-page-content { flex: 1 1 0% !important; min-height: 0 !important; overflow: visible !important; display: flex !important; flex-direction: column !important; padding-top: 12px !important; }
        .cal-table-wrap { flex: 1 1 0% !important; min-height: 0 !important; overflow-y: visible !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
        
        /* Hide original topbar elements (Title, Search) to make room */
        body.admin .topbar .brand,
        body.admin .topbar .search { display: none !important; }
        
        /* In case the layout injects a separate title element inside content */
        .attrec-card h2, .attrec-card .page-title, .page-header, #attHubMobileTitle { display: none !important; }
        
        /* Move controls into the topbar space */
        .attrec-controls { 
          position: fixed !important;
          top: 0 !important;
          left: 48px !important; /* Avoid hamburger */
          right: 0 !important; 
          height: 50px !important;
          z-index: 2147483600 !important;
          flex-direction: row !important; 
          flex-wrap: nowrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          margin: 0 !important;
          padding: 0 8px !important;
          gap: 4px !important;
          background: #F9FAFB !important;
          border-bottom: 1px solid #E5E7EB !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          white-space: nowrap !important;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .attrec-controls::-webkit-scrollbar { display: none; }
        
        .attrec-controls .filter-group { 
          width: auto !important; 
          display: flex !important; 
          flex-direction: row !important; 
          align-items: center !important; 
          gap: 4px !important; 
          flex: 0 0 auto !important;
        }
        #calMonth { 
          width: auto !important; 
          height: 28px !important; 
          padding: 0 20px 0 4px !important;
          font-size: 12px !important;
          border: 1px solid #cbd5e1 !important;
          background-color: #fff !important;
          color: #0f172a !important;
          border-radius: 4px !important;
        }
        #calMonth option { color: #000; background: #fff; }
        
        .cal-checkbox-wrap { padding: 0 !important; }
        .cal-checkbox-wrap label { color: #475569 !important; font-size: 11px !important; margin: 0 !important; gap: 4px !important; }
        .cal-checkbox-wrap input { margin: 0 !important; }
        
        .cal-actions { 
          display: flex !important; 
          flex-direction: row !important; 
          width: auto !important; 
          gap: 4px !important; 
          flex: 0 0 auto !important;
        }
        .cal-actions button { 
          flex: 0 0 auto !important; 
          height: 28px !important; 
          padding: 0 6px !important; 
          font-size: 11px !important; 
          white-space: nowrap !important;
        }
      }
    </style>
    <div class="cal-page-content card attrec-card">
      <div class="attrec-controls">
        <div class="filter-group">
          <select id="calMonth" class="se-time" style="width:120px;height:32px;">
            <option value="">${i(m)}\u5E74 (\u5168\u3066)</option>
            ${Array.from({length:12}).map((e,a)=>{const o=v(a+1),l=`${m}-${o}`;return`<option value="${i(l)}" ${l===H?"selected":""}>${i(m)}\u5E74${o}\u6708</option>`}).join("")}
          </select>
          <div class="cal-checkbox-wrap">
            <label style="display:flex;align-items:center;font-weight:800;color:#475569;">
              <input id="calOnlyOff" type="checkbox" checked>
              \u4F11\u65E5\u306E\u307F
            </label>
          </div>
        </div>
        <div class="cal-actions">
          <button id="calExportCsv" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #cbd5e1;color:#0b2c66;">Excel</button>
          <input type="file" id="calImportFile" accept=".xlsx, .xls" style="display:none;">
          <button id="calImportCsv" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #cbd5e1;color:#0b2c66;">\u30A4\u30F3\u30DD\u30FC\u30C8</button>
          <button id="calReset" type="button" class="se-btn small default" style="height:32px;background:#fff;border:1px solid #fecaca;color:#ef4444;">\u30EA\u30BB\u30C3\u30C8</button>
        </div>
      </div>
      <div id="calInfo" class="attrec-summary" aria-live="polite" style="margin-bottom:12px;"></div>
      <div class="cal-table-wrap">
        <div id="calTable" class="attrec-table"></div>
      </div>
    </div>
  `;const b=n.querySelector("#calInfo"),u=n.querySelector("#calTable"),U=(e,a)=>{if(!u)return;const o=Array.isArray(e)?e:[],l=o.reduce((t,c)=>{const s=String(c&&c.type?c.type:"");return t[s]=(t[s]||0)+1,t},{});if(b){const t=a&&a.ping?`Ping: ${i(a.ping)}`:"OK",c=o.length,s=Object.keys(l).sort().map(r=>`<span class="attrec-pill neutral">${i(w(r))}: ${i(l[r])}</span>`).join(" ");b.innerHTML=`
        <span class="attrec-pill ok">${t}</span>
        <span class="attrec-pill neutral">\u4EF6\u6570: ${i(c)}</span>
        ${s}
      `}if(!o.length){u.innerHTML=`
        <div class="empty-state">
          <div style="font-size:28px;">\u{1F5C2}\uFE0F</div>
          <div>\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</div>
        </div>
      `;return}const p=o.map(t=>{const c=String(t&&t.date?t.date:"").slice(0,10),s=L(t&&t.name?t.name:""),r=Number(t&&t.is_off?t.is_off:0)?"\u4F11":"",d=Number(t&&t.is_off?t.is_off:0)?"attrec-pill ok":"attrec-pill neutral",z=q(c);return`
        <tr class="cal-desktop-row ${Number(t&&t.is_off?t.is_off:0)?"cal-row off":z?"cal-row weekend":"cal-row"}">
          <td>${i(c)}</td>
          <td>${i(S(c))}</td>
          <td>${i(w(t&&t.type?t.type:""))}</td>
          <td><span class="${d}">${i(r||"\u2014")}</span></td>
          <td title="${i(s.ja)}">${i(s.ja||"")}</td>
          <td title="${i(s.en)}">${i(s.en||"")}</td>
        </tr>
        <tr class="cal-mobile-row">
          <td colspan="6" class="cal-mobile-cell">
            <div class="cal-card">
              <div class="cal-card-header">
                <div class="cal-card-date">${i(c)} (${i(S(c))})</div>
                <span class="${d}">${i(r||"\u2014")}</span>
              </div>
              <div class="cal-card-body">
                <div class="cal-card-row">
                  <span class="cal-card-label">\u540D\u79F0</span>
                  <span class="cal-card-value">${i(s.ja||"")}</span>
                </div>
                <div class="cal-card-row">
                  <span class="cal-card-label">English</span>
                  <span class="cal-card-value">${i(s.en||"")}</span>
                </div>
                <div class="cal-card-row">
                  <span class="cal-card-label">\u7A2E\u5225</span>
                  <span class="cal-card-value">${i(w(t&&t.type?t.type:""))}</span>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `}).join("");u.innerHTML=`
      <style>
        .cal-desktop-row { display: table-row; }
        .cal-mobile-row { display: none; }
        @media (max-width: 768px) {
          .cal-dash-table thead { display: none; }
          .cal-desktop-row { display: none; }
          .cal-mobile-row { display: table-row; }
          .cal-mobile-cell { padding: 0 !important; border: none !important; background: transparent !important; }
          .cal-mobile-cell:hover { background: transparent !important; }
          .cal-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); overflow: hidden; }
          .cal-card-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
          .cal-card-date { font-weight: 700; font-size: 15px; color: #0f172a; }
          .cal-card-body { padding: 12px 16px; }
          .cal-card-row { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; }
          .cal-card-label { color: #64748b; width: 60px; flex-shrink: 0; font-weight: 500; }
          .cal-card-value { color: #1e293b; font-weight: 500; }
        }
      </style>
      <table class="dash-table cal-dash-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th>\u65E5\u4ED8</th><th>\u66DC\u65E5</th><th>\u7A2E\u5225</th><th>\u4F11\u65E5</th><th>\u540D\u79F0</th><th>English</th>
          </tr>
        </thead>
        <tbody>
          ${p}
        </tbody>
      </table>
    `},y=async()=>{if(!u)return;u.innerHTML=`
      <div class="empty-state">
        <div style="font-size:28px;">\u23F3</div>
        <div>\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026</div>
      </div>
    `,b&&(b.innerHTML="");const e=n.querySelector("#calMonth"),a=n.querySelector("#calOnlyOff"),o=String(e&&e.value?e.value:""),l=o?parseInt(o.split("-")[0],10):m,p=!!(a&&a.checked),t=await x.get(`/api/admin/calendar/ping?year=${encodeURIComponent(l)}`).catch(()=>null),c=await x.get(`/api/admin/calendar/raw?year=${encodeURIComponent(l)}`).catch(()=>null);let s=c&&Array.isArray(c.rows)?c.rows:[];o&&o.includes("-")&&(s=s.filter(r=>M(r&&r.date?r.date:"")===o)),p&&(s=s.filter(r=>Number(r&&r.is_off?r.is_off:0)===1)),s.sort((r,d)=>String(r&&r.date?r.date:"").localeCompare(String(d&&d.date?d.date:""))||String(r&&r.type?r.type:"").localeCompare(String(d&&d.type?d.type:""))),U(s,{ping:t&&t.version?t.version:null})},k=n.querySelector("#calMonth"),C=n.querySelector("#calOnlyOff");k&&k.addEventListener("change",y,{signal:f}),C&&C.addEventListener("change",y,{signal:f});const E=n.querySelector("#calExportCsv");E&&E.addEventListener("click",async()=>{const e=n.querySelector("#calMonth"),a=String(e&&e.value?e.value:""),o=a?parseInt(a.split("-")[0],10):m,l=`/api/admin/calendar/export.xlsx?year=${encodeURIComponent(o)}&type=jp_auto,jp_substitute,jp_bridge,fixed,custom&include_nonoff=false`;try{await T(l,`company_holidays_${o}.xlsx`)}catch(p){alert(String(p&&p.message?p.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}},{signal:f});const j=n.querySelector("#calExportIcs");j&&j.addEventListener("click",async()=>{const e=n.querySelector("#calMonth"),a=String(e&&e.value?e.value:""),o=a?parseInt(a.split("-")[0],10):m,l=`/api/admin/calendar/export?year=${encodeURIComponent(o)}&include_nonoff=false&lang=ja`;try{await T(l,`company_holidays_${o}.xlsx`)}catch(p){alert(String(p&&p.message?p.message:"\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}},{signal:f});const I=n.querySelector("#calImportCsv"),h=n.querySelector("#calImportFile");I&&h&&(I.addEventListener("click",()=>{h.click()},{signal:f}),h.addEventListener("change",async e=>{const a=e.target.files[0];if(!a)return;const o=new FormData;o.append("file",a);try{const l=await x.upload("/api/admin/calendar/import",o);alert("\u30AB\u30EC\u30F3\u30C0\u30FC\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002"),y()}catch(l){alert("\u30A4\u30F3\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002: "+String(l&&l.message?l.message:""))}finally{h.value=""}},{signal:f}));const _=n.querySelector("#calReset");_&&_.addEventListener("click",async()=>{const e=n.querySelector("#calMonth"),a=String(e&&e.value?e.value:""),o=a?parseInt(a.split("-")[0],10):m;if(confirm(`${o}\u5E74\u306E\u30AB\u30B9\u30BF\u30E0\u4F11\u65E5\uFF08\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u305F\u30C7\u30FC\u30BF\uFF09\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u3066\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3059\u304B\uFF1F
\u203B\u56FD\u6C11\u306E\u795D\u65E5\u306F\u524A\u9664\u3055\u308C\u307E\u305B\u3093\u3002`))try{await x.del(`/api/admin/calendar/jp?year=${encodeURIComponent(o)}`),alert("\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002"),y()}catch(l){alert("\u30EA\u30BB\u30C3\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002: "+String(l&&l.message?l.message:""))}},{signal:f}),await y()}function P(){g&&(g.abort(),g=null)}export{B as mount,D as mountCalendar,P as unmountCalendar};
