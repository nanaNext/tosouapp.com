import{fetchJSONAuth as o}from"../../api/http.api.js";async function m({content:a,hideNavSpinner:h}){try{const t=await o("/api/admin/db/check");a.innerHTML="<h3>DB\u691C\u67FB</h3>";const e=document.createElement("div"),l=document.createElement("table");l.style.width="100%",l.innerHTML=`
      <thead><tr><th>\u9805\u76EE</th><th>\u5024</th></tr></thead>
      <tbody>
        <tr><td>Database</td><td>${t.db||""}</td></tr>
        <tr><td>Version</td><td>${t.version||""}</td></tr>
        <tr><td>Users</td><td>${t&&t.users&&t.users.total!=null?t.users.total:0}</td></tr>
        <tr><td>Active</td><td>${t&&t.users&&t.users.active!=null?t.users.active:0}</td></tr>
        <tr><td>Inactive</td><td>${t&&t.users&&t.users.inactive!=null?t.users.inactive:0}</td></tr>
        <tr><td>Retired</td><td>${t&&t.users&&t.users.retired!=null?t.users.retired:0}</td></tr>
        <tr><td>Hire set</td><td>${t&&t.users&&t.users.hire_set!=null?t.users.hire_set:0}</td></tr>
        <tr><td>Hire null</td><td>${t&&t.users&&t.users.hire_null!=null?t.users.hire_null:0}</td></tr>
        <tr><td>Departments</td><td>${t&&t.departments&&t.departments.total!=null?t.departments.total:0}</td></tr>
      </tbody>
    `;const n=document.createElement("table");n.style.width="100%",n.innerHTML="<thead><tr><th>ID</th><th>\u793E\u54E1\u756A\u53F7</th><th>\u6C0F\u540D</th><th>Email</th><th>\u90E8\u7F72ID</th><th>\u72B6\u614B</th><th>\u5165\u793E\u65E5</th></tr></thead>";const c=document.createElement("tbody");for(const d of t.sampleUsers||[]){const r=document.createElement("tr");r.innerHTML=`<td>${d.id}</td><td>${d.employee_code||""}</td><td>${d.username||""}</td><td>${d.email||""}</td><td>${d.departmentId||""}</td><td>${d.employment_status||""}</td><td>${d.hire_date||""}</td>`,c.appendChild(r)}n.appendChild(c);const s=document.createElement("table");s.style.width="100%",s.innerHTML="<thead><tr><th>\u30C6\u30FC\u30D6\u30EB</th><th>\u7167\u5408\u9806\u5E8F</th></tr></thead>";const i=document.createElement("tbody");for(const d of t.collations||[]){const r=document.createElement("tr");r.innerHTML=`<td>${d.table}</td><td>${d.collation}</td>`,i.appendChild(r)}s.appendChild(i),e.appendChild(l),e.appendChild(document.createElement("hr")),e.appendChild(n),e.appendChild(document.createElement("hr")),e.appendChild(s),a.appendChild(e)}catch(t){const e=document.createElement("div");e.style.color="#b00020",e.textContent="DB\u691C\u67FB\u5931\u6557: "+(t&&t.message?t.message:"unknown"),a.appendChild(e)}h&&h()}export{m as mountDbCheck};
