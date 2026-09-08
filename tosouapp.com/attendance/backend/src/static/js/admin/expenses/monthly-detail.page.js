import{requireAdmin as j}from"../_shared/require-admin.js";import{fetchJSONAuth as y}from"../../api/http.api.js";const d=e=>document.querySelector(e),_=()=>new Date().toLocaleDateString("sv-SE"),z=()=>_().slice(0,7),I=e=>{const i=String(e||"").toLowerCase();return i==="applied"?"\u627F\u8A8D\u5F85\u3061":i==="approved"?"\u627F\u8A8D\u6E08\u307F":i==="rejected"?"\u5DEE\u623B\u3057":i==="draft"?"\u4E0B\u66F8\u304D":i==="pending"?"\u672A\u7533\u8ACB":i==="denied"?"\u5374\u4E0B":i==="paid"?"\u652F\u7D66\u6E08\u307F":i||"-"},R=async()=>{const e=d("#adminContent");if(!e)return;const i=new URLSearchParams(window.location.search||""),p=i.get("month")||z(),c=i.get("userId")||"";e.className="",e.style.maxWidth="1000px",e.style.width="100%",e.style.margin="20px auto",e.style.padding="0 16px",e.innerHTML=`
    <div class="exp-month-detail">
      <style>
        .exp-month-detail { display:grid; gap:10px; color:#0f172a; }
        .exp-month-detail .head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .exp-month-detail .title { margin:0; font-size:20px; font-weight:700; }
        .exp-month-detail .meta { color:#475569; font-size:13px; }
        .exp-month-detail .btn { height:32px; padding:0 12px; border:1px solid #cbd5e1; background:#fff; border-radius:0; cursor:pointer; }
        .exp-month-detail .btn.primary { background:#0b5ed7; border-color:#0b5ed7; color:#fff; }
        .exp-month-detail .table-wrap { border:1px solid #dbe3ee; border-radius:0; background:#fff; overflow-x:auto; padding-bottom:12px; }
        .exp-month-detail table { width:100%; min-width:800px; border-collapse:collapse; border-spacing:0; }
        .exp-month-detail th, .exp-month-detail td { border:1px solid #e5eaf2; padding:10px 12px; font-size:13px; }
        .exp-month-detail th { background:#f8fafc; text-align:left; }
        .print-header { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body * { visibility: hidden; }
          .exp-month-detail, .exp-month-detail * { visibility: visible; }
          .exp-month-detail { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-header { display: block; margin-bottom: 20px; }
          .print-header h2 { text-align: center; margin: 0 0 20px 0; font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .print-header .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; margin-bottom: 15px; }
          .print-header .info-item { display: flex; }
          .print-header .info-label { width: 120px; font-weight: bold; }
          .exp-month-detail .table-wrap { border: none; }
          .exp-month-detail table { border: 1px solid #000; }
          .exp-month-detail th, .exp-month-detail td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
          .exp-month-detail th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .exp-month-detail .head .title { display: none; }
        }
      </style>
      <div class="print-header" id="printHeader"></div>
      <div class="head">
        <h3 class="title">\u4EA4\u901A\u8CBB\u7533\u8ACB\u8A73\u7D30</h3>
        <div style="display:flex;gap:8px;align-items:center;" class="no-print">
          <button id="downloadPdf" class="btn" type="button" style="display:flex; align-items:center; gap:6px; background:#fff; color:#dc2626; border-color:#dc2626; font-weight:bold;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            PDF\u51FA\u529B
          </button>
          <button id="backToExpenseList" class="btn" type="button">\u4E00\u89A7\u3078\u623B\u308B</button>
        </div>
      </div>
      <div id="detailMeta" class="meta"></div>
      <div id="detailTableHost"></div>
    </div>
  `;const a=d("#detailMeta"),h=d("#detailTableHost"),k=d("#backToExpenseList"),m=d("#approveThisMonth"),w=()=>{const n=new URLSearchParams(window.location.search),o=n.get("standalone"),s=n.get("tab");let r="/admin/expenses";const l=[];o&&l.push(`standalone=${encodeURIComponent(o)}`),s?l.push(`tab=${encodeURIComponent(s)}`):l.push("tab=monthly_approval"),l.length>0&&(r+="?"+l.join("&")),window.location.href=r};k?.addEventListener("click",w),m?.addEventListener("click",async()=>{const n=String(c||"").trim(),o=String(p||"").slice(0,7);if(!(!n||!/^\d{4}-\d{2}$/.test(o)||!window.confirm(`${o} \u3092\u6708\u6B21\u627F\u8A8D\u3057\u307E\u3059\u304B\uFF1F`)))try{m.disabled=!0,await y("/api/expenses/admin/months/approve",{method:"POST",body:JSON.stringify({userId:n,month:o})}),w()}catch(r){a&&(a.textContent=`\u6708\u6B21\u627F\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${String(r?.message||"unknown")}`)}finally{m.disabled=!1}});try{const[n,o]=await Promise.all([y("/api/admin/users"),y(`/api/expenses/admin/list?month=${encodeURIComponent(p)}&userId=${encodeURIComponent(c)}&page=1&limit=1000&sortBy=date&sortDir=desc`)]),s=Array.isArray(n)?n:Array.isArray(n?.rows)?n.rows:[],r=Array.isArray(o)?o:Array.isArray(o?.rows)?o.rows:[],f=new Map(s.map(t=>[String(t.id),t.username||t.email||String(t.id)])).get(String(c))||String(c||"\u5168\u54E1");if(!r.length){a&&(a.textContent=`\u5BFE\u8C61: ${f} / ${p} | \u5408\u8A08: \xA50`),h&&(h.innerHTML='<div class="table-wrap"><table><tbody><tr><td>\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr></tbody></table></div>');return}let b=0;const L=r.map(t=>{const g=String(t.date||"").slice(0,10),x=[t.origin||"",t.destination||""].filter(Boolean).join(" \u2192 ")||"-",u=String(t.transport_type||"\u96FB\u8ECA"),A=String(t.trip_type||"one_way")==="round_trip"?"\u5F80\u5FA9":"\u7247\u9053",M=String(t.purpose||""),P=String(t.note||""),T=t.created_at?String(t.created_at).replace("T"," ").slice(0,16):"-",$=Number(t.amount||0);b+=$;const C=$.toLocaleString("ja-JP"),H=I(t.status);return`<tr>
        <td>${g}</td>
        <td>${M}</td>
        <td>${x}</td>
        <td>${u}</td>
        <td>${A}</td>
        <td>${P}</td>
        <td style="text-align:right;">\xA5${C}</td>
        <td>${H}</td>
        <td>${T}</td>
      </tr>`}).join(""),v=d("#downloadPdf");v&&v.addEventListener("click",()=>{window.print()}),a&&(a.innerHTML=`\u5BFE\u8C61: ${f} / ${p} <span style="margin-left:16px; font-weight:bold; font-size:16px; color:#b91c1c;">\u5408\u8A08: \xA5${b.toLocaleString("ja-JP")}</span>`);const S=d("#printHeader");if(S){const t=s.find(u=>String(u.id)===String(c))||{},g=t.employee_code||t.employeeCode||"",x=t.birth_date||t.birthDate?String(t.birth_date||t.birthDate).slice(0,10):"";S.innerHTML=`
        <h2>\u4EA4\u901A\u8CBB\u7CBE\u7B97\u66F8</h2>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">\u4F1A\u793E\u540D</span><span>\u98EF\u585A\u5857\u7814\u682A\u5F0F\u4F1A\u793E</span></div>
          <div class="info-item"><span class="info-label">\u5BFE\u8C61\u6708</span><span>${p}</span></div>
          <div class="info-item"><span class="info-label">\u793E\u54E1\u756A\u53F7</span><span>${g}</span></div>
          <div class="info-item"><span class="info-label">\u6C0F\u540D</span><span>${f}</span></div>
          <div class="info-item"><span class="info-label">\u751F\u5E74\u6708\u65E5</span><span>${x}</span></div>
        </div>
      `}h&&(h.innerHTML=`
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>\u65E5\u4ED8</th>
              <th>\u7528\u9014</th>
              <th>\u7D4C\u8DEF</th>
              <th>\u4EA4\u901A\u6A5F\u95A2</th>
              <th>\u7A2E\u5225</th>
              <th>\u5099\u8003</th>
              <th style="text-align:right;">\u91D1\u984D</th>
              <th>\u72B6\u614B</th>
              <th>\u7533\u8ACB\u65E5\u6642</th>
            </tr></thead>
            <tbody>
              ${L}
              <tr style="background:#f8fafc; font-weight:bold; border-top: 2px solid #e2e8f0;">
                <td colspan="6" style="text-align:right; padding-bottom: 20px;">\u5408\u8A08</td>
                <td style="text-align:right; color:#0f172a; padding-bottom: 20px;">\xA5${b.toLocaleString("ja-JP")}</td>
                <td colspan="2" style="padding-bottom: 20px;"></td>
              </tr>
            </tbody>
          </table>
        </div>
      `)}catch(n){a&&(a.textContent=`\u53D6\u5F97\u5931\u6557: ${String(n?.message||"unknown")}`)}};async function U(){if(await j())return await R()}export{U as mount};
