import{delegate as C,$ as y}from"../_shared/dom.js";import{api as b}from"../../shared/api/client.js";async function $({content:l,listDepartments:u,listUsers:m}){if(!l)return;const E=await u(),w=await m();l.innerHTML="";const e=document.createElement("div");e.className="dept-page",e.innerHTML=`
    <div class="dept-head">
      <h3 class="dept-title">\u90E8\u9580\u7BA1\u7406</h3>
      <form id="deptCreateForm" class="dept-create">
        <label class="dept-label" for="deptName">\u65B0\u898F</label>
        <input id="deptName" class="dept-input" placeholder="\u4F8B: \u7DCF\u52D9\u90E8">
        <button type="submit" class="dept-btn primary">\u4F5C\u6210</button>
      </form>
    </div>
  `,l.appendChild(e);const f=e.querySelector("#deptCreateForm");f&&f.addEventListener("submit",async t=>{t.preventDefault();const a=e.querySelector("#deptName"),i=String(a&&a.value!=null?a.value:"").trim();i&&(await b.post("/api/admin/departments",{name:i}),await $({content:l,listDepartments:u,listUsers:m}))});const c=document.createElement("table");c.className="dept-table",c.innerHTML='<thead><tr><th style="width:80px;">ID</th><th style="width:160px;">\u30B3\u30FC\u30C9</th><th>\u540D\u524D</th><th style="width:260px;">\u64CD\u4F5C</th></tr></thead>';const v=document.createElement("tbody");for(const t of E){const a=document.createElement("tr");a.innerHTML=`
      <td>${t.id}</td>
      <td><input class="dept-input dept-input-sm" data-dept-code="${t.id}" value="${t.code||""}" placeholder="\u4F8B: HR, ENG"></td>
      <td><input class="dept-input" data-dept-name="${t.id}" value="${t.name}"></td>
      <td>
        <div class="dept-actions">
          <button class="dept-btn" type="button" data-action="save" data-id="${t.id}">\u4FDD\u5B58</button>
          <button class="dept-btn danger" type="button" data-action="delete" data-id="${t.id}">\u524A\u9664</button>
          <button class="dept-btn" type="button" data-action="users" data-id="${t.id}">\u793E\u54E1\u4E00\u89A7</button>
        </div>
      </td>
    `,v.appendChild(a)}c.appendChild(v);const h=document.createElement("div");h.className="dept-table-wrap",h.appendChild(c),e.appendChild(h);const o=document.createElement("div");o.className="dept-users",e.appendChild(o),C(e,"button[data-action]","click",async(t,a)=>{const i=a.dataset.action||"",s=a.dataset.id||"";if(i==="save"){const p=y(`input[data-dept-name="${s}"]`,e),d=y(`input[data-dept-code="${s}"]`,e),n=String(p&&p.value!=null?p.value:"").trim(),r=String(d&&d.value!=null?d.value:"").trim()||null;await b.patch(`/api/admin/departments/${s}`,{name:n,code:r}),alert("\u4FDD\u5B58\u3057\u307E\u3057\u305F");return}if(i==="delete"){confirm("\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")&&(await b.del(`/api/admin/departments/${s}`),await $({content:l,listDepartments:u,listUsers:m}));return}if(i==="users"){const p=w.filter(n=>String(n.departmentId||"")===String(s));o.innerHTML='<h4 class="dept-users-title">\u6240\u5C5E\u793E\u54E1</h4>';const d=document.createElement("ul");d.className="dept-users-list";for(const n of p){const r=document.createElement("li");r.textContent=`${n.id} ${n.username||n.email}`,d.appendChild(r)}o.appendChild(d)}})}export{$ as mountDepartments};
