import{delegate as p}from"../_shared/dom.js";import{downloadWithAuth as n}from"../../shared/api/client.js";async function h({content:c}){c.innerHTML="<h3>\u30EC\u30DD\u30FC\u30C8</h3>";const t=document.createElement("div");t.innerHTML=`
    <h4>\u52E4\u6020CSV</h4>
    <input id="repUserIds" placeholder="userIds (comma)">
    <input id="repFrom" placeholder="From(YYYY-MM-DD)">
    <input id="repTo" placeholder="To(YYYY-MM-DD)">
    <button data-action="export-timesheet">\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8</button>
    <h4>\u4F11\u65E5ICS/CSV</h4>
    <input id="repYear" placeholder="Year" value="${new Date().getUTCFullYear()}">
    <button data-action="export-ics">ICS</button>
    <button data-action="export-csv">CSV</button>
  `,p(t,"[data-action]","click",(d,s)=>{const a=s.dataset.action;if(a==="export-timesheet"){const e=t.querySelector("#repUserIds").value.trim(),r=t.querySelector("#repFrom").value.trim(),o=t.querySelector("#repTo").value.trim();if(!e||!r||!o){alert("userIds, From, To \u3092\u3059\u3079\u3066\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const i=`/api/admin/export/timesheet.csv?userIds=${encodeURIComponent(e)}&from=${encodeURIComponent(r)}&to=${encodeURIComponent(o)}`;n(i,"timesheet.csv").catch(l=>alert("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5931\u6557: "+l.message))}else if(a==="export-ics"){const e=parseInt(t.querySelector("#repYear").value,10);if(!e){alert("Year \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const r=`/api/admin/calendar/export?year=${e}`;n(r,`holidays_${e}.ics`).catch(o=>alert("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5931\u6557: "+o.message))}else if(a==="export-csv"){const e=parseInt(t.querySelector("#repYear").value,10);if(!e){alert("Year \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}const r=`/api/admin/calendar/export.csv?year=${e}`;n(r,`holidays_${e}.csv`).catch(o=>alert("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5931\u6557: "+o.message))}}),c.appendChild(t)}export{h as mountReports};
