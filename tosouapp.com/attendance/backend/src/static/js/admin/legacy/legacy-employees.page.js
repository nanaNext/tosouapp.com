import{delegate as ke}from"../_shared/dom.js";import{api as F}from"../../shared/api/client.js";import{createPage as Ee}from"../../shared/page/createPage.js";import{createCleanup as Ce}from"../../shared/page/createCleanup.js";let C=0;async function Te({content:h,profile:te,listEmployees:fe,listUsers:G,listDepartments:ie,getEmployee:ae,createEmployee:he,updateEmployee:be,deleteEmployee:le,showNavSpinner:J,hideNavSpinner:P,renderEmployees:E}){const T=Ce(),x=()=>T.run();let k=!0;const re=new AbortController,S=re.signal;T.add(()=>{k=!1}),T.add(()=>re.abort()),T.add(()=>{try{h.innerHTML=""}catch{}});try{const e=document.querySelector(".topbar .brand"),a=e?e.innerHTML:null;T.add(()=>{try{e&&a!==null&&(e.innerHTML=a)}catch{}})}catch{}try{const e=document.querySelector("#adminContent"),a=e?e.style.paddingTop:"",l=e?e.style.marginTop:"",i=document.querySelector(".subbar"),r=i?i.style.display:"";T.add(()=>{try{e&&(e.style.paddingTop=a,e.style.marginTop=l),i&&(i.style.display=r)}catch{}try{document.body.classList.remove("emp-delete-mode"),document.documentElement.classList.remove("emp-delete-mode")}catch{}})}catch{}function oe(e){try{const a=document.querySelector(".topbar .brand");if(a&&document.body.classList.contains("employees-wide")){a.innerHTML=`
          <img src="/static/images/logo1.png" alt="logo" class="icon">
          <span class="logo">IIZUKA</span>
          <div class="brand-menu" style="display:inline-block;position:relative;margin-left:10px;">
            <button id="brandMenuBtn" class="brand-link">\u793E\u54E1\u7BA1\u7406 \u25BE</button>
            <div class="dropdown" id="brandDropdown" hidden>
              <a href="#list" class="item" id="brandList">\u793E\u54E1\u4E00\u89A7</a>
              <a href="#add" class="item" id="brandAdd">\u793E\u54E1\u8FFD\u52A0</a>
              <a href="#edit" class="item" id="brandEdit" aria-disabled="true">\u793E\u54E1\u7DE8\u96C6</a>
              <a href="#delete" class="item" id="brandDelete">\u793E\u54E1\u524A\u9664</a>
            </div>
          </div>
        `;const l=a.querySelector("#brandMenuBtn"),i=a.querySelector("#brandDropdown");if(l&&i){l.addEventListener("click",()=>{!i.hasAttribute("hidden")?i.setAttribute("hidden",""):i.removeAttribute("hidden")});const r=n=>{if(!i)return;n.target.closest(".brand-menu")||i.setAttribute("hidden","")};document.addEventListener("click",r),T.add(()=>{try{document.removeEventListener("click",r)}catch{}}),i.addEventListener("click",async n=>{const s=n.target.closest("a.item");if(!s)return;n.preventDefault();const c=Array.from(document.querySelectorAll(".empSel:checked")).map(d=>d.value),o=s.getAttribute("href")||"#list";if(o==="#list"){try{history.pushState(null,"","/ui/admin?tab=employees#list")}catch{window.location.href="/ui/admin?tab=employees#list";return}await E()}else if(o==="#add"){try{history.pushState(null,"","/ui/admin?tab=employees#add")}catch{window.location.href="/ui/admin?tab=employees#add";return}await E()}else if(o==="#edit"){if(c.length===1){const d=c[0];try{history.pushState(null,"",`/ui/admin?tab=employees&edit=${d}`)}catch{window.location.href=`/ui/admin?tab=employees&edit=${d}`;return}}else try{history.pushState(null,"","/ui/admin?tab=employees#edit")}catch{window.location.href="/ui/admin?tab=employees#edit";return}await E()}else if(o==="#delete"){try{history.pushState(null,"","/ui/admin?tab=employees#delete")}catch{window.location.href="/ui/admin?tab=employees#delete";return}await E()}i.setAttribute("hidden","")})}}}catch{}}try{sessionStorage.getItem("navSpinner")==="1"&&J()}catch{}const M=++C,f=new URLSearchParams(location.search),O=f.get("detail"),R=f.get("edit"),se=f.get("create"),A=String(te&&te.role||"").toLowerCase(),W=location.hash||(O||R||se?"":"#list");let b="list";R?b="edit":se||W==="#add"?b="add":W==="#delete"?b="delete":W==="#edit"&&(b="edit");try{b==="list"&&location.hash!=="#list"&&history.replaceState(null,"","#list")}catch{}try{const e=document.querySelector("#adminContent");e&&(e.style.paddingTop=b==="delete"?"0":"",e.style.marginTop=b==="delete"?"-12px":"");const a=document.querySelector(".subbar");a&&(a.style.display=b==="delete"?"none":"flex");try{b==="delete"?(document.body.classList.add("emp-delete-mode"),document.documentElement.classList.add("emp-delete-mode")):(document.body.classList.remove("emp-delete-mode"),document.documentElement.classList.remove("emp-delete-mode"))}catch{}if(b==="delete")try{window.scrollTo({top:0,behavior:"instant"})}catch{window.scrollTo(0,0)}}catch{}if(O){const e=await ae(O,{signal:S});if(!k||M!==C)return x;let a=[];try{a=A==="manager"?await F.get("/api/manager/departments",{signal:S}):await ie({signal:S})}catch(y){if(y&&y.name==="AbortError")return x;a=[]}if(!k||M!==C)return x;const l=y=>{const q=a.find(D=>String(D.id)===String(y));return q?q.name:""},i=y=>{const q=String(y||"").toLowerCase();return q==="inactive"?"\u7121\u52B9":q==="retired"?"\u9000\u8077":"\u5728\u8077"},r=y=>{if(!y||String(y)==="-"||String(y)==="0000-00-00")return"\u672A\u767B\u9332";const q=String(y),D=q.match(/^(\d{4})-(\d{2})-(\d{2})/);if(D)return`${D[1]}/${D[2]}/${D[3]}`;try{const K=new Date(q);if(!isNaN(K.getTime()))return`${K.getFullYear()}/${String(K.getMonth()+1).padStart(2,"0")}/${String(K.getDate()).padStart(2,"0")}`}catch{}return q};h.innerHTML='<h3 class="excel-header">\u793E\u54E1\u8A73\u7D30</h3>';const n=document.createElement("div");n.className="card detail-card";const s=String(e.role||"").toLowerCase(),c=s==="admin"?"\u7BA1\u7406\u8005":s==="manager"?"\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC":s==="employee"?"\u5F93\u696D\u54E1":e.role||"",o=s==="admin"?"admin":s==="manager"?"manager":"employee",d=String(e.employment_type||"").toLowerCase(),u=d==="full_time"?"\u6B63\u793E\u54E1":d==="part_time"?"\u30D1\u30FC\u30C8\u30FB\u30A2\u30EB\u30D0\u30A4\u30C8":d==="contract"?"\u5951\u7D04\u793E\u54E1":e.employment_type||"",p=d==="full_time"?"full":d==="part_time"?"part":d==="contract"?"contract":"",g=String(e.employment_status||"").toLowerCase(),L=g==="retired"?"retired":g==="inactive"?"inactive":"active",$=(e.username||e.email||"").trim(),H=$?$[0].toUpperCase():"?";let z="";try{let y=A==="manager"?await F.get("/api/manager/users",{signal:S}):await G({signal:S});y=y&&y.rows||y;const q=y.find(D=>String(D.id)===String(e.manager_id));z=q?q.username||q.email:""}catch(y){if(y&&y.name==="AbortError")return x}const j=e.avatar_url?`<img class="avatar-img" src="${e.avatar_url}" alt="avatar">`:`<div class="avatar">${H}</div>`;n.innerHTML=`
      <div class="head">
        ${j}
        <div class="info">
          <div class="title">${e.username||""}</div>
          <div class="subtitle">${e.email||""}</div>
        </div>
        <span class="status-pill ${L}">${i(e.employment_status)}</span>
      </div>
      <div class="detail-row"><div class="label">\u793E\u54E1\u756A\u53F7</div><div class="value">${e.employee_code||"EMP"+String(e.id).padStart(3,"0")}</div></div>
      <div class="detail-row"><div class="label">\u6C0F\u540D</div><div class="value">${e.username||""}</div></div>
      <div class="detail-row"><div class="label">Email</div><div class="value">${e.email||""}</div></div>
      <div class="detail-row"><div class="label">\u96FB\u8A71\u756A\u53F7</div><div class="value">${e.phone||""}</div></div>
      <div class="detail-row"><div class="label">\u751F\u5E74\u6708\u65E5</div><div class="value">${r(e.birth_date)}</div></div>
      <div class="detail-row"><div class="label">\u90E8\u7F72</div><div class="value">${l(e.departmentId)}</div></div>
      <div class="detail-row"><div class="label">\u76F4\u5C5E\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</div><div class="value">${z}</div></div>
      <div class="detail-row"><div class="label">\u30EC\u30D9\u30EB</div><div class="value">${e.level||""}</div></div>
      <div class="detail-row"><div class="label">\u5F79\u5272</div><div class="value"><span class="role-pill ${o}">${c}</span></div></div>
      <div class="detail-row"><div class="label">\u96C7\u7528\u5F62\u614B</div><div class="value"><span class="type-pill ${p}">${u}</span></div></div>
      <div class="detail-row"><div class="label">\u5165\u793E\u65E5</div><div class="value">${r(e.hire_date)}</div></div>
      <div class="detail-row"><div class="label">\u8A66\u7528\u958B\u59CB</div><div class="value">${r(e.probation_date)}</div></div>
      <div class="detail-row"><div class="label">\u6B63\u793E\u54E1\u5316</div><div class="value">${r(e.official_date)}</div></div>
      <div class="detail-row"><div class="label">\u5951\u7D04\u7D42\u4E86</div><div class="value">${r(e.contract_end)}</div></div>
      <div class="detail-row"><div class="label">\u57FA\u672C\u7D66</div><div class="value">${e.base_salary==null?"":e.base_salary}</div></div>
      <div class="detail-row"><div class="label">\u72B6\u614B</div><div class="value"><span class="status-pill ${L}">${i(e.employment_status)}</span></div></div>
      <div class="detail-actions form-actions"><a class="btn" href="/ui/admin?tab=employees&edit=${e.id}">\u7DE8\u96C6</a><a class="btn" href="/ui/admin?tab=employees">\u4E00\u89A7\u3078</a></div>
    `,h.appendChild(n);try{const y=["q","dept","role","status","hireFrom","hireTo","sortKey","sortDir","page"],q=new URLSearchParams;for(const me of y){const ue=f.get(me);ue&&q.set(me,ue)}const D=q.toString(),K=`/ui/admin?tab=employees${D?"&"+D:""}#list`,Le=`/ui/admin?tab=employees&edit=${e.id}${D?"&"+D:""}`,V=n.querySelectorAll("a.btn");V&&V.length>=2&&(V[0].setAttribute("href",Le),V[1].setAttribute("href",K))}catch{}return P(),x}h.innerHTML="",oe(b);let _=[],B=[],I=[];try{let e=A==="manager"?await F.get("/api/manager/users",{signal:S}):await fe({signal:S});_=Array.isArray(e)?e:e&&Array.isArray(e.rows)?e.rows:[]}catch(e){if(e&&e.name==="AbortError")return x;if(I.push(`\u4E00\u89A7: ${e&&e.message?e.message:"unknown"}`),A!=="manager")try{_=await G({signal:S})}catch(a){if(a&&a.name==="AbortError")return x;I.push(`\u4E00\u89A7(\u4E88\u5099): ${a&&a.message?a.message:"unknown"}`),_=[]}else _=[]}if(!k||M!==C)return x;try{B=A==="manager"?await F.get("/api/manager/departments",{signal:S}):await ie({signal:S})}catch(e){if(e&&e.name==="AbortError")return x;I.push(`\u90E8\u7F72: ${e&&e.message?e.message:"unknown"}`),B=[]}if(!k||M!==C)return x;if(I.length){const e=document.createElement("div");e.style.color="#b00020",e.style.margin="8px 0",e.textContent=`\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC: ${I.join(" / ")}`,h.appendChild(e)}if(R){const e=await ae(R,{signal:S});if(!k||M!==C)return x;h.innerHTML="",oe("edit");const a=document.createElement("form");a.innerHTML=`
      <div style="margin-bottom:8px;"><a id="editBack" class="btn" href="#list">\u2190 \u793E\u54E1\u4E00\u89A7\u3078\u623B\u308B</a></div>
      <h4>\u793E\u54E1\u7DE8\u96C6\uFF08${e.employee_code||"EMP"+String(e.id).padStart(3,"0")}\uFF09</h4>
      <div class="emp-form-layout" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; margin-bottom: 20px;">
        <div class="emp-form-section">
          <div class="emp-form-header">\u57FA\u672C\u60C5\u5831</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u793E\u54E1\u756A\u53F7</label><div style="flex:1; padding:8px 12px; background:#fff; color:#0f172a; font-size:14px; border:1px solid transparent; box-sizing:border-box;">${e.employee_code||"EMP"+String(e.id).padStart(3,"0")}</div></div>
            <div class="emp-form-group"><label>\u6C0F\u540D</label><input id="empName" value="${e.username||""}"></div>
            <div class="emp-form-group"><label>\u30E1\u30FC\u30EB</label><input id="empEmail" value="${e.email||""}"></div>
            <div class="emp-form-group"><label>\u30D1\u30B9\u30EF\u30FC\u30C9</label><input id="empPw" type="password" placeholder="\u7A7A\u6B04\u306A\u3089\u5909\u66F4\u306A\u3057"></div>
            <div class="emp-form-group"><label>\u751F\u5E74\u6708\u65E5</label><input id="empBirth" placeholder="YYYY-MM-DD" value="${e.birth_date||""}"></div>
            <div class="emp-form-group"><label>\u6027\u5225</label><select id="empGender"><option value="">\u672A\u8A2D\u5B9A</option><option value="male" ${e.gender==="male"?"selected":""}>\u7537</option><option value="female" ${e.gender==="female"?"selected":""}>\u5973</option><option value="other" ${e.gender==="other"?"selected":""}>\u305D\u306E\u4ED6</option></select></div>
            <div class="emp-form-group"><label>\u96FB\u8A71\u756A\u53F7</label><input id="empPhone" value="${e.phone||""}"></div>
            <div class="emp-form-group"><label>\u4F4F\u6240</label><input id="empAddr" value="${e.address||""}"></div>
          </div>
        </div>
        <div class="emp-form-section">
          <div class="emp-form-header">\u8077\u52D9\u60C5\u5831</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u90E8\u7F72</label><select id="empDept"><option value="">\u90E8\u7F72</option>${B.map(i=>`<option value="${i.id}" ${String(e.departmentId||"")===String(i.id)?"selected":""}>${i.name}</option>`).join("")}</select></div>
            <div class="emp-form-group"><label>\u5F79\u5272</label>
              <select id="empRole">
                <option value="employee" ${e.role==="employee"?"selected":""}>\u5F93\u696D\u54E1</option>
                <option value="manager" ${e.role==="manager"?"selected":""}>\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</option>
                <option value="admin" ${e.role==="admin"?"selected":""}>\u7BA1\u7406\u8005</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u96C7\u7528\u5F62\u614B</label>
              <select id="empType">
                <option value="full_time" ${e.employment_type==="full_time"?"selected":""}>\u6B63\u793E\u54E1</option>
                <option value="part_time" ${e.employment_type==="part_time"?"selected":""}>\u30D1\u30FC\u30C8\u30FB\u30A2\u30EB\u30D0\u30A4\u30C8</option>
                <option value="contract" ${e.employment_type==="contract"?"selected":""}>\u5951\u7D04\u793E\u54E1</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u72B6\u614B</label>
              <select id="empStatus">
                <option value="active" ${String(e.employment_status||"")==="active"?"selected":""}>\u5728\u8077</option>
                <option value="inactive" ${String(e.employment_status||"")==="inactive"?"selected":""}>\u7121\u52B9/\u4F11\u8077</option>
                <option value="retired" ${String(e.employment_status||"")==="retired"?"selected":""}>\u9000\u8077</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u76F4\u5C5E\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</label><select id="empManager"><option value="">\u672A\u8A2D\u5B9A</option>${_.filter(i=>i.role==="manager").map(i=>`<option value="${i.id}" ${String(e.manager_id||"")===String(i.id)?"selected":""}>${i.username||i.email}</option>`).join("")}</select></div>
            <div class="emp-form-group"><label>\u30EC\u30D9\u30EB</label><input id="empLevel" value="${e.level||""}" placeholder="\u4F8B: L1/L2/Senior"></div>
            <div class="emp-form-group"><label>\u5165\u793E\u65E5</label><input id="empHireDate" placeholder="YYYY-MM-DD" value="${e.hire_date||e.join_date||""}"></div>
            <div class="emp-form-group"><label>\u8A66\u7528\u958B\u59CB</label><input id="empProbDate" placeholder="YYYY-MM-DD" value="${e.probation_date||""}"></div>
            <div class="emp-form-group"><label>\u6B63\u793E\u54E1\u5316</label><input id="empOfficialDate" placeholder="YYYY-MM-DD" value="${e.official_date||""}"></div>
            <div class="emp-form-group"><label>\u5951\u7D04\u7D42\u4E86</label><input id="empContractEnd" placeholder="YYYY-MM-DD" value="${e.contract_end||""}"></div>
            <div class="emp-form-group"><label>\u57FA\u672C\u7D66 (\u5186)</label><input id="empBaseSalary" type="number" step="0.01" value="${e.base_salary==null?"":e.base_salary}" placeholder="\u5186"></div>
          </div>
        </div>
        <div class="emp-form-section">
          <div class="emp-form-header">\u305D\u306E\u4ED6</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u5199\u771F\uFF08\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\uFF09</label><div style="flex:1; display:flex; gap:8px; align-items:center; padding:8px 12px;"><input id="empAvatarFile" type="file" accept="image/*" style="flex:1; border:1px solid #cbd5e1; border-radius:4px;"> <button type="button" class="btn" id="btnAvatarUpload">\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9</button> <span id="avatarUploadStatus" style="color:#334155; font-size:13px;"></span></div></div>
          </div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;">
        <button type="submit" class="btn-primary">\u66F4\u65B0</button>
        <a class="btn" id="btnCancelEdit" href="#list">\u30AD\u30E3\u30F3\u30BB\u30EB</a>
      </div>
    `;try{const i=["q","dept","role","status","hireFrom","hireTo","sortKey","sortDir","page","code","showAll"],r=new URLSearchParams;for(const d of i){const u=f.get(d);u&&r.set(d,u)}const n=r.toString(),s=`/ui/admin?tab=employees${n?"&"+n:""}#list`,c=a.querySelector("#editBack"),o=a.querySelector("#btnCancelEdit");c&&c.setAttribute("href",s),o&&o.setAttribute("href",s)}catch{}a.addEventListener("submit",async i=>{i.preventDefault();const r={username:document.querySelector("#empName").value.trim(),email:document.querySelector("#empEmail").value.trim(),role:document.querySelector("#empRole").value,departmentId:document.querySelector("#empDept").value?parseInt(document.querySelector("#empDept").value,10):null,level:(document.querySelector("#empLevel").value||"").trim()||null,managerId:document.querySelector("#empManager").value?parseInt(document.querySelector("#empManager").value,10):null,employmentType:document.querySelector("#empType").value,hireDate:document.querySelector("#empHireDate").value.trim()||null,probationDate:document.querySelector("#empProbDate").value.trim()||null,officialDate:document.querySelector("#empOfficialDate").value.trim()||null,contractEnd:document.querySelector("#empContractEnd").value.trim()||null,baseSalary:(document.querySelector("#empBaseSalary").value||"").trim()||null,birthDate:document.querySelector("#empBirth").value.trim()||null,gender:document.querySelector("#empGender").value||null,phone:(document.querySelector("#empPhone").value||"").trim()||null,employmentStatus:document.querySelector("#empStatus").value,address:(document.querySelector("#empAddr").value||"").trim()||null};await be(e.id,r,{signal:S});const n=document.querySelector("#empPw").value;n&&n.length>=6&&await F.patch(`/api/admin/users/${e.id}/password`,{password:n},{signal:S});try{const s=["q","dept","role","status","hireFrom","hireTo","sortKey","sortDir","page","code","showAll"],c=new URLSearchParams;for(const d of s){const u=f.get(d);u&&c.set(d,u)}const o=c.toString();history.replaceState(null,"",`/ui/admin?tab=employees${o?"&"+o:""}#list`)}catch{}await E()});const l=a.querySelector("#btnAvatarUpload");return l&&l.addEventListener("click",async i=>{i.preventDefault();try{const r=a.querySelector("#empAvatarFile"),n=a.querySelector("#avatarUploadStatus");if(!r||!r.files||!r.files[0]){n&&(n.textContent="\u30D5\u30A1\u30A4\u30EB\u672A\u9078\u629E");return}const s=new FormData;s.append("file",r.files[0]),await F.upload(`/api/admin/employees/${encodeURIComponent(e.id)}/avatar`,s,{signal:S}),n&&(n.textContent="\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u5B8C\u4E86")}catch{}}),a.querySelector("#editBack").addEventListener("click",async i=>{i.preventDefault();try{const r=["q","dept","role","status","hireFrom","hireTo","sortKey","sortDir","page","code","showAll"],n=new URLSearchParams;for(const c of r){const o=f.get(c);o&&n.set(c,o)}const s=n.toString();history.replaceState(null,"",`/ui/admin?tab=employees${s?"&"+s:""}#list`)}catch{}await E()}),a.querySelector("#btnCancelEdit").addEventListener("click",async i=>{i.preventDefault();try{const r=["q","dept","role","status","hireFrom","hireTo","sortKey","sortDir","page","code","showAll"],n=new URLSearchParams;for(const c of r){const o=f.get(c);o&&n.set(c,o)}const s=n.toString();history.replaceState(null,"",`/ui/admin?tab=employees${s?"&"+s:""}#list`)}catch{}await E()}),h.appendChild(a),P(),x}if(b==="edit"){h.innerHTML="";const e=document.createElement("form");e.innerHTML=`
      <div class="form-card form-compact form-sm form-narrow">
        <div class="form-title">\u3010\u793E\u54E1\u7DE8\u96C6\u3011</div>
        <div class="form-sep"></div>
        <div class="form-grid">
          <div class="form-label">\u793E\u54E1\u756A\u53F7</div>
          <div class="form-input">
            <span class="bracket"><input id="editKey" placeholder="EMP001 \u307E\u305F\u306F ID \u6570\u5B57"></span>
          </div>
        </div>
        <div id="editKeyErr" style="color:#b00020;display:none;margin-top:8px;"></div>
        <div class="form-actions" style="margin-top:8px;">
          <button type="submit">\u7DE8\u96C6\u3078</button>
        </div>
      </div>
    `,e.addEventListener("submit",async l=>{l.preventDefault();const i=e.querySelector("#editKeyErr"),r=(document.querySelector("#editKey").value||"").trim();if(!r){i&&(i.style.display="block",i.textContent="\u793E\u54E1\u756A\u53F7\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");try{const s=document.querySelector("#editKey");s&&s.focus&&s.focus()}catch{}return}i&&(i.style.display="none",i.textContent="");let n=null;if(/^\d+$/.test(r))n=parseInt(r,10);else try{J();let s=await Promise.race([F.get(A==="manager"?"/api/manager/users":"/api/admin/employees",{signal:S}),new Promise((o,d)=>setTimeout(()=>d(new Error("timeout")),8e3))]);s=s&&s.rows||s;const c=s.find(o=>{const d=String(o.employee_code||"").toUpperCase(),u=("EMP"+String(o.id).padStart(3,"0")).toUpperCase();return d===r.toUpperCase()||u===r.toUpperCase()});c&&(n=c.id)}catch(s){alert(String(s&&s.message?s.message:"\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC"))}finally{P()}if(!n)return alert("\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");window.location.href=`/ui/admin?tab=employees&edit=${n}`}),h.appendChild(e);try{const l=document.querySelector("#editKey");l&&l.focus&&l.focus()}catch{}const a=h.querySelector(".tabs");return a&&a.addEventListener("click",async l=>{const i=l.target.closest(".btn");if(!i)return;const r=i.getAttribute("href")||"#list";if(i.id==="btnGoHome"){l.preventDefault();try{sessionStorage.setItem("navSpinner","1")}catch{}J(),setTimeout(()=>{window.location.href="/ui/portal"},300);return}if(r.startsWith("#")){l.preventDefault();try{history.pushState(null,"",`/ui/admin?tab=employees${r}`)}catch{window.location.href=`/ui/admin?tab=employees${r}`;return}await E()}}),P(),x}if(b==="add"){const e=document.createElement("form");e.id="add";let a=[];if(A!=="manager")try{a=await G({signal:S})}catch(i){if(i&&i.name==="AbortError")return x;a=[]}if(!k||M!==C)return x;const l=(A!=="manager"?a.filter(i=>String(i.role)==="manager"):[]).map(i=>`<option value="${i.id}">${i.username||i.email}</option>`).join("");e.innerHTML=`
      <div class="form-title" style="margin-bottom:16px;">\u3010\u65B0\u898F\u793E\u54E1\u3011</div>
      <div class="emp-form-layout" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; margin-bottom: 20px;">
        <div class="emp-form-section">
          <div class="emp-form-header">\u57FA\u672C\u60C5\u5831</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u793E\u54E1\u756A\u53F7</label><input id="empCode"></div>
            <div class="emp-form-group"><label>\u6C0F\u540D</label><input id="empName"></div>
            <div class="emp-form-group"><label>\u30E1\u30FC\u30EB</label><input id="empEmail"></div>
            <div class="emp-form-group"><label>\u30D1\u30B9\u30EF\u30FC\u30C9</label><input id="empPass" type="password" autocomplete="new-password"></div>
            <div class="emp-form-group"><label>\u751F\u5E74\u6708\u65E5</label><input id="empBirth" placeholder="YYYY-MM-DD"></div>
            <div class="emp-form-group"><label>\u6027\u5225</label>
              <select id="empGender">
                <option value="">\u672A\u9078\u629E</option>
                <option value="male">\u7537\u6027</option>
                <option value="female">\u5973\u6027</option>
                <option value="other">\u305D\u306E\u4ED6</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u96FB\u8A71\u756A\u53F7</label><input id="empPhone"></div>
            <div class="emp-form-group"><label>\u4F4F\u6240</label><input id="empAddr"></div>
          </div>
        </div>
        <div class="emp-form-section">
          <div class="emp-form-header">\u8077\u52D9\u60C5\u5831</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u90E8\u7F72</label><select id="empDept"><option value="">\u90E8\u7F72</option>${B.map(i=>`<option value="${i.id}">${i.name}</option>`).join("")}</select></div>
            <div class="emp-form-group"><label>\u5F79\u5272</label>
              <select id="empRole">
                <option value="employee">\u5F93\u696D\u54E1</option>
                <option value="manager">\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</option>
                <option value="admin">\u7BA1\u7406\u8005</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u76F4\u5C5E\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</label><select id="empManager"><option value="">\u672A\u8A2D\u5B9A</option>${l}</select></div>
            <div class="emp-form-group"><label>\u30EC\u30D9\u30EB</label><input id="empLevel" placeholder="\u4F8B: L1/L2/Senior"></div>
            <div class="emp-form-group"><label>\u96C7\u7528\u5F62\u614B</label>
              <select id="empType">
                <option value="full_time">\u6B63\u793E\u54E1</option>
                <option value="part_time">\u30D1\u30FC\u30C8\u30FB\u30A2\u30EB\u30D0\u30A4\u30C8</option>
                <option value="contract">\u5951\u7D04\u793E\u54E1</option>
              </select>
            </div>
            <div class="emp-form-group"><label>\u5165\u793E\u65E5</label><input id="empJoinDate" placeholder="YYYY-MM-DD"></div>
            <div class="emp-form-group"><label>\u8A66\u7528\u958B\u59CB</label><input id="empProbDate" placeholder="YYYY-MM-DD"></div>
            <div class="emp-form-group"><label>\u6B63\u793E\u54E1\u5316</label><input id="empOfficialDate" placeholder="YYYY-MM-DD"></div>
            <div class="emp-form-group"><label>\u5951\u7D04\u7D42\u4E86\u65E5\uFF08\u4EFB\u610F\uFF09</label><input id="empContractEnd" placeholder="YYYY-MM-DD"></div>
            <div class="emp-form-group"><label>\u57FA\u672C\u7D66 (\u5186)</label><input id="empBaseSalary" type="number" step="0.01" placeholder="\u5186"></div>
            <div class="emp-form-group"><label>\u72B6\u614B</label>
              <select id="empStatus">
                <option value="active">\u5728\u8077</option>
                <option value="inactive">\u4F11\u8077/\u7121\u52B9</option>
                <option value="retired">\u9000\u8077</option>
              </select>
            </div>
          </div>
        </div>
        <div class="emp-form-section">
          <div class="emp-form-header">\u305D\u306E\u4ED6</div>
          <div class="emp-form-grid">
            <div class="emp-form-group"><label>\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u5199\u771FURL\uFF08\u4EFB\u610F\uFF09</label><input id="empAvatarUrl" placeholder="https://..."></div>
            <div class="emp-form-group"><label>\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u5199\u771F\uFF08\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\uFF09</label><div style="flex:1; display:flex; gap:8px; align-items:center; padding:8px 12px;"><input id="empAvatarFile" type="file" accept="image/*" style="flex:1; border:1px solid #cbd5e1; border-radius:4px;"></div></div>
          </div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;">
        <button type="submit" class="btn-primary">\u4F5C\u6210</button>
      </div>
      <div id="empCreateMsg" style="margin-top:10px;color:#0f172a;font-weight:600;"></div>
    `;try{const i=document.querySelector(".subbar .subnav");if(i){i.style.display="flex";const n=new URLSearchParams(location.search).get("q")||"";i.innerHTML=`
          <div class="fi" style="display:flex;align-items:center;gap:8px;">
            <input id="topEmpQ" placeholder="\u540D\u524D/\u30E1\u30FC\u30EB" value="${n.replace(/"/g,"&quot;")}" style="height:32px;border:1px solid #cbd5e1;border-radius:0;padding:0 10px;">
            <button id="topEmpGoList" class="btn" type="button">\u4E00\u89A7</button>
            <button id="topEmpGoSearch" class="btn" type="button">\u691C\u7D22</button>
          </div>
        `;const s=i.querySelector("#topEmpGoList"),c=i.querySelector("#topEmpGoSearch"),o=i.querySelector("#topEmpQ");s&&s.addEventListener("click",async d=>{d.preventDefault();try{history.pushState(null,"","/ui/admin?tab=employees#list")}catch{window.location.href="/ui/admin?tab=employees#list";return}await E()}),c&&c.addEventListener("click",async d=>{d.preventDefault();const u=o&&o.value?o.value.trim():"",p=new URLSearchParams(location.search);u?p.set("q",u):p.delete("q");try{history.pushState(null,"",`/ui/admin?tab=employees&${p.toString()}#list`)}catch{window.location.href=`/ui/admin?tab=employees&${p.toString()}#list`;return}await E()})}}catch{}return e.addEventListener("submit",async i=>{i.preventDefault();const r=e.querySelector("#empCreateMsg"),n=e.querySelector('button[type="submit"]'),s={employeeCode:document.querySelector("#empCode").value.trim(),username:document.querySelector("#empName").value.trim(),email:document.querySelector("#empEmail").value.trim(),password:document.querySelector("#empPass").value,role:document.querySelector("#empRole").value,departmentId:document.querySelector("#empDept").value?parseInt(document.querySelector("#empDept").value,10):null,level:(document.querySelector("#empLevel").value||"").trim()||null,managerId:document.querySelector("#empManager").value?parseInt(document.querySelector("#empManager").value,10):null,employmentType:document.querySelector("#empType").value,hireDate:document.querySelector("#empJoinDate").value.trim()||null,probationDate:document.querySelector("#empProbDate").value.trim()||null,officialDate:document.querySelector("#empOfficialDate").value.trim()||null,contractEnd:document.querySelector("#empContractEnd").value.trim()||null,baseSalary:(document.querySelector("#empBaseSalary").value||"").trim()||null,birthDate:document.querySelector("#empBirth").value.trim()||null,gender:document.querySelector("#empGender").value||null,phone:(document.querySelector("#empPhone").value||"").trim()||null,address:(document.querySelector("#empAddr").value||"").trim()||null,employmentStatus:document.querySelector("#empStatus").value,avatarUrl:(document.querySelector("#empAvatarUrl").value||"").trim()||null};if(!s.username||!s.email||!s.password){r&&(r.style.color="#b00020",r.textContent="\u6C0F\u540D\u30FB\u30E1\u30FC\u30EB\u30FB\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u5FC5\u9808\u3067\u3059\u3002");return}if(window.confirm("\u4FDD\u5B58\u3057\u307E\u3059\u304B\uFF1F")){r&&(r.style.color="#0f172a",r.textContent="\u4FDD\u5B58\u4E2D\u2026"),n&&(n.disabled=!0);try{const o=await he(s,{signal:S});try{const d=document.querySelector("#empAvatarFile");if(d&&d.files&&d.files[0]&&o&&o.id){const u=new FormData;u.append("file",d.files[0]),await F.upload(`/api/admin/employees/${encodeURIComponent(o.id)}/avatar`,u,{signal:S})}}catch{}r&&(r.style.color="#0f172a",r.textContent="\u4FDD\u5B58\u3057\u307E\u3057\u305F\uFF081\u540D\u8FFD\u52A0\uFF09");try{sessionStorage.setItem("navSpinner","1")}catch{}setTimeout(()=>{window.location.href="/ui/admin?tab=employees#list"},350)}catch(o){const d=String(o&&o.message?o.message:""),u=d.toLowerCase();if(r)if(r.style.color="#b00020",d.includes("\u793E\u54E1\u756A\u53F7")||u.includes("uniq_employee_code")||u.includes("duplicate entry")){r.textContent="\u793E\u54E1\u756A\u53F7\u304C\u65E2\u306B\u5B58\u5728\u3057\u307E\u3059\u3002\u5225\u306E\u756A\u53F7\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";try{const p=document.querySelector("#empCode");p&&p.focus&&p.focus()}catch{}}else if(d.includes("Email")||u.includes("email")){r.textContent=d;try{const p=document.querySelector("#empEmail");p&&p.focus&&p.focus()}catch{}}else r.textContent="\u4FDD\u5B58\u5931\u6557: "+(d||"error")}finally{n&&(n.disabled=!1)}}}),!k||M!==C||(h.appendChild(e),P()),x}const m=document.createElement("div");m.style.margin=b==="delete"?"0 0 8px":"4px 0 12px",m.className=b==="delete"?"emp-filters emp-del-wrap":"emp-filters filter-bar";const ne=`<option value="">\u5168\u3066</option>${B.map(e=>`<option value="${e.id}">${e.name}</option>`).join("")}`;b==="delete"?m.innerHTML=`
      <table class="excel-table emp-del-filter" style="margin:0 0 10px; width:720px; min-width:680px;">
        <thead>
          <tr>
            <th colspan="2">
              <div class="del-head"><div class="form-title">\u3010\u793E\u54E1\u524A\u9664\u3011</div></div>
            </th>
          </tr>
          <tr>
            <th colspan="2">
              <div class="del-tabs">
                <button type="button" id="tabSearch" class="tab active">\u793E\u54E1\u691C\u7D22</button>
                <button type="button" id="tabShowAll" class="tab">\u5168\u54E1\u8868\u793A</button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width:120px;">\u793E\u54E1\u756A\u53F7</td>
            <td><input id="empSearchCode" placeholder="EMP\u756A\u53F7/\u30B3\u30FC\u30C9" style="width: 240px;"></td>
          </tr>
          <tr>
            <td style="width:120px;">\u540D\u524D</td>
            <td><input id="empSearchName" placeholder="\u540D\u524D" style="width: 240px;"></td>
          </tr>
          <tr>
            <td>\u90E8\u7F72</td>
            <td><select id="empDeptFilter">${ne}</select></td>
          </tr>
          <tr>
            <td>\u5F79\u5272</td>
            <td><select id="empRoleFilter"><option value="">\u5168\u3066</option><option value="employee">\u5F93\u696D\u54E1</option><option value="manager">\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</option><option value="admin">\u7BA1\u7406\u8005</option></select></td>
          </tr>
          <tr style="display:none;">
            <td>\u72B6\u614B</td>
            <td><select id="empStatusFilter"><option value="">\u5168\u3066</option><option value="active">\u5728\u8077</option><option value="inactive">\u7121\u52B9</option><option value="retired">\u9000\u8077</option></select></td>
          </tr>
          <tr>
            <td>\u5165\u793E\u65E5</td>
            <td>
              <div class="date-range">
                <input id="empHireFrom" placeholder="YYYY-MM-DD">
                <span class="tilde">\u301C</span>
                <input id="empHireTo" placeholder="YYYY-MM-DD">
              </div>
            </td>
          </tr>
          <tr>
            <td></td>
            <td class="actions"><button type="button" id="btnEmpSearch" class="btn btn-search">\u691C\u7D22</button></td>
          </tr>
        </tbody>
      </table>
      <div id="empListBox" style="display:none"></div>
    `:m.innerHTML=`
      <div class="fi">
        <div class="fi-label">\u691C\u7D22</div>
        <input id="empSearchName" class="fi-name" placeholder="\u540D\u524D">
      </div>
      <div class="fi">
        <div class="fi-label">\u90E8\u7F72</div>
        <select id="empDeptFilter" class="fi-dept">${ne}</select>
      </div>
      <div class="fi">
        <button id="toggleAdv" class="toggle-adv" type="button">\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC</button>
      </div>
      <div class="adv" hidden>
        <div class="fi">
          <div class="fi-label">\u5F79\u5272</div>
          <select id="empRoleFilter" class="fi-role"><option value="">\u5168\u3066</option><option value="employee">\u5F93\u696D\u54E1</option><option value="manager">\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC</option><option value="admin">\u7BA1\u7406\u8005</option></select>
        </div>
        <div class="fi">
          <div class="fi-label">\u72B6\u614B</div>
          <select id="empStatusFilter" class="fi-status"><option value="">\u5168\u3066</option><option value="active">\u5728\u8077</option><option value="inactive">\u7121\u52B9</option><option value="retired">\u9000\u8077</option></select>
        </div>
        <div class="fi fi-range">
          <div class="fi-label">\u5165\u793E\u65E5</div>
          <input id="empHireFrom" class="fi-date" placeholder="YYYY-MM-DD">
          <span class="fi-sep">\u301C</span>
          <input id="empHireTo" class="fi-date" placeholder="YYYY-MM-DD">
        </div>
      </div>
      <div class="fi fi-action">
        <button type="button" id="btnEmpSearch" class="btn">\u691C\u7D22</button>
      </div>
    `;try{const e=document.querySelector(".subbar .subnav");if(e)if(b==="delete"){e.innerHTML="",e.style.display="none",m.style.position="static",m.style.zIndex="auto",h.appendChild(m);try{let a=document.querySelector("#empDelFilterStyle");a||(a=document.createElement("style"),a.id="empDelFilterStyle",a.textContent=`
              html.emp-delete-mode, body.emp-delete-mode { height: 100%; overflow: hidden; }
              .admin.emp-delete-mode .content { height: 100vh; overflow: hidden; box-sizing: border-box; }
              .admin.emp-delete-mode #adminContent { height: calc(100vh - var(--topbar-height) - 24px); overflow: hidden; }
              .emp-del-wrap { display: flex; flex-direction: column; max-width: 1300px; width: 100%; margin: 0 auto; padding: 8px 12px; height: 100%; box-sizing: border-box; }
              .del-head { display: inline-flex; margin-bottom: 0; }
              .del-tabs { display: inline-flex; gap: 8px; margin-bottom: 0; }
              .del-tabs .tab { height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid #d0d8e4; background: #f3f6fb; color: #1f3b63; }
              .del-tabs .tab.active { background: #2b6cb0; color: #fff; border-color: #1e4e8c; }

              .emp-del-filter { table-layout: fixed; border-collapse: separate; border-spacing: 0; background: #fff; border: 1px solid #e5eaf0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
              .emp-del-filter thead th { background: #eaf2ff; color:#0d2c5b; font-weight:600; border-bottom:1px solid #e1e8f5; }
              .emp-del-filter tbody tr { height: 42px; }
              .emp-del-filter tbody tr td:first-child { width: 140px; white-space: nowrap; color: #0d2c5b; background:#f8fbff; border-right:1px solid #e3edf8; }
              .emp-del-filter tbody tr td:not(.actions) > * { width: 100%; }
              .emp-del-filter tbody td { padding: 10px 12px; vertical-align: middle; border-top: 1px solid #eef2f7; }
              .emp-del-filter input,
              .emp-del-filter select {
                height: 36px;
                border-radius: 0;
                background: #fcfdff;
                border: 1.5px solid #bcd0e6;
                padding: 6px 12px;
                box-sizing: border-box;
                display: block;
              }
              .emp-del-filter input::placeholder { color: #94a3b8; }
              .emp-del-filter input:focus,
              .emp-del-filter select:focus {
                border-color: #2b67b3;
                box-shadow: 0 0 0 3px rgba(43,103,179,.12);
                outline: none;
              }
              .emp-del-filter td.actions { text-align: center; }
              .emp-del-filter .date-range { display: flex; align-items: center; gap: 6px; }
              .emp-del-filter .date-range input { flex: 1 1 0; display: inline-block; min-width: 160px; }
              .emp-del-filter .date-range .tilde { width: 12px; text-align: center; color: #64748b; }
              .emp-del-filter .btn-search {
                height: 36px;
                border-radius: 0;
                padding: 0 16px;
                background: #2b6cb0;
                border: 1px solid #1e4e8c;
                color: #fff;
                transition: background-color .15s ease, border-color .15s ease;
              }
              .emp-del-filter .btn-search:hover { background: #255ea7; border-color: #1e4e8c; }
              .emp-del-filter .btn-search:active { background: #1f4e8a; border-color: #163b6e; }
              .emp-del-filter .btn.full { width: 100%; }

              #empListBox { display:block; width:100%; margin-top:0; overflow: auto; flex: 1 1 auto; min-height: 0; }

              .emp-del-list {
                width: 100%;
                table-layout: fixed;
                border-collapse: separate;
                border-spacing: 0;
                background: #f5f5f5;
                border: 1px solid #9ca3af;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(16,24,40,.06);
              }
              .emp-del-list thead { position: static; }
              .emp-del-list thead th {
                background: #f3f4f6;
                text-align: center !important;
                vertical-align: middle;
                color: #111827;
                font-weight: 600;
                border-bottom: 2px solid #9ca3af;
                position: static;
                box-shadow: 0 1px 0 rgba(16,24,40,.06);
              }
              .emp-del-list thead th > * { margin-left: auto; margin-right: auto; }
              .emp-del-list tbody td {
                padding: 4px 8px;
                text-align: left;
                vertical-align: middle;
                background: #fff;
                border-bottom: 1px solid #9ca3af;
                border-right: 1px solid #d1d5db;
                color: #0f172a;
                font-size: 12px;
              }
              .emp-del-list tbody tr:hover td { background: #fff; }
              .emp-del-list tbody tr:last-child td { border-bottom: 0; }
              .emp-del-list tbody tr td:first-child { border-left: 2px solid #9ca3af; }
              .emp-del-list tbody tr td:last-child { border-right: 0; }
              .emp-del-list th, .emp-del-list td { white-space: nowrap; overflow: visible; text-overflow: clip; }
              .emp-del-list td:last-child > div { justify-content: flex-start; }

              .emp-del-list thead th:nth-child(1), .emp-del-list tbody td:nth-child(1) { width: 32px; text-align: center; }
              .emp-del-list thead th:nth-child(2), .emp-del-list tbody td:nth-child(2) { width: 92px; }
              .emp-del-list thead th:nth-child(3), .emp-del-list tbody td:nth-child(3) { width: 140px; }
              .emp-del-list thead th:nth-child(4), .emp-del-list tbody td:nth-child(4) { width: 240px; }
              .emp-del-list thead th:nth-child(5), .emp-del-list tbody td:nth-child(5) { width: 180px; }
              .emp-del-list thead th:nth-child(1), .emp-del-list tbody td:nth-child(1) { width: 40px; text-align: center; }
              .emp-del-list thead th:nth-child(6), .emp-del-list tbody td:nth-child(6) { width: 96px; text-align: center; }
              .emp-del-list thead th:nth-child(7), .emp-del-list tbody td:nth-child(7) { width: 110px; text-align: center; }
              .emp-del-list thead th:nth-child(8), .emp-del-list tbody td:nth-child(8) { width: 90px; text-align: center; }
              .emp-del-list thead th:nth-child(9), .emp-del-list tbody td:nth-child(9) { width: 110px; text-align: center; }
              .emp-del-list thead th:nth-child(10), .emp-del-list tbody td:nth-child(10) { width: 190px; }

              .emp-del-list tbody td:nth-child(1) { padding: 2px 4px; line-height: 1; }
              .emp-del-list td:nth-child(1) input[type="checkbox"] { display:block; margin:0 auto; width:16px; height:16px; appearance:auto; }
              .status-pill { display: inline-flex; align-items: center; justify-content: flex-start; min-height: auto; padding: 0; border-radius: 0; border: none; font-weight: 400; font-size: 14px !important; line-height: 1.4; box-sizing: border-box; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; background: transparent; }
              .status-pill.active { color: #1b7c3f; }
              .status-pill.inactive { color: #8a6d00; }
              .status-pill.retired { color: #6b7280; }

              .emp-action-group { display:flex; gap:8px; align-items:center; flex-wrap:nowrap; }
              .emp-action {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                height: 34px;
                padding: 0 16px;
                border-radius: 8px;
                border: 1px solid #d0d8e4;
                background: #fff;
                color: #1f3b63;
                text-decoration: none;
                font-size: 16px;
                cursor: pointer;
              }
              .emp-action:hover { background: #f3f7ff; border-color: #c3d2ea; }
              .emp-action:active { background: #eaf2ff; border-color: #b6c8e5; }
              .emp-action.danger { background: #eef2ff; border-color: #c7d2fe; color: #1e40af; }
              .emp-action.danger:hover { background: #e0e7ff; border-color: #a5b4fc; }
              .admin .card .excel-table .emp-action-group .emp-action { font-size: 16px !important; height: 34px !important; padding: 0 16px !important; gap: 8px !important; }
              .admin .card .excel-table .emp-action-group .emp-action.danger { font-size: 16px !important; }
              .pager-right { margin-left: auto; display: inline-flex; align-items: center; }
              .emp-del-toolbar { display: flex; justify-content: flex-end; margin: 8px 0 0; position: static; top: auto; z-index: auto; background: transparent; }
              .emp-bulk-disable {
                height: 36px;
                border-radius: 10px;
                padding: 0 16px;
                background: linear-gradient(180deg, #2b6cb0 0%, #255ea7 100%);
                border: 1px solid #1e4e8c;
                color: #fff;
                font-weight: 600;
                letter-spacing: .03em;
                box-shadow: 0 1px 2px rgba(16,24,40,.06);
                transition: background-color .15s ease, border-color .15s ease, transform .02s ease;
              }
              .emp-bulk-disable:hover { background: linear-gradient(180deg, #336fb3 0%, #2b62a9 100%); border-color: #1e4e8c; }
              .emp-bulk-disable:active { transform: translateY(1px); }
              .emp-bulk-disable:focus { outline: 3px solid rgba(43,103,179,.20); outline-offset: 2px; }
              .admin .card { --emp-pill-width: max-content; }
              .admin .card table#list { width: 100%; }

              .text-pill { display:inline-flex; align-items:center; min-height:auto; padding:0; border-radius:0; border:none; background:transparent; color:#1f2937; font-size:14px !important; line-height:1.4; box-sizing:border-box; justify-content:flex-start; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
              .text-pill.neutral { background:transparent; border:none; color:#1f2937; }
              .text-pill a { color: #1e40af; text-decoration: none; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; display:block; width:100%; line-height:inherit; }
              .text-pill a:hover { text-decoration: underline; color: #1e3a8a; }
              .admin .card table#list tbody td .text-pill,
              .admin .card table#list tbody td .status-pill,
              .admin .card table#list tbody td .role-pill,
              .admin .card table#list tbody td .type-pill { width: auto; }
              .admin .card .excel-table th[data-sort="username"],
              .admin .card .excel-table td.col-name { min-width: 140px; }
              .admin .card .excel-table th[data-sort="email"],
              .admin .card .excel-table td.col-email { min-width: 180px; }
              .admin .card .excel-table th[data-sort="department"],
              .admin .card .excel-table td.col-dept { min-width: 140px; }
              .admin .card .excel-table th[data-sort="id"],
              .admin .card .excel-table td.col-code { min-width: 120px; }
              .admin .card .excel-table tbody td.col-name a { font-size: 13px !important; font-weight: 700 !important; color: #1151ac !important; text-decoration: underline !important; display: inline-block; padding: 4px 8px; margin: -4px -8px; border-radius: 4px; transition: background-color 0.2s, color 0.2s; }
              .admin .card .excel-table tbody td.col-name a:hover { text-decoration: none !important; background-color: #1151ac !important; color: #ffffff !important; }
              .admin .card .excel-table th.sel-col,
              .admin .card .excel-table td.sel-col { width: 56px; min-width: 56px; text-align: center; }
              .admin .card .excel-table input.empSel { width: 18px !important; height: 18px !important; padding: 0 !important; margin: 0 !important; }

              .role-pill { display:inline-flex; align-items:center; justify-content:flex-start; min-height:auto; padding:0; border-radius:0; border:none; font-size:14px !important; font-weight:400; line-height:1.4; box-sizing:border-box; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background:transparent; }
              .role-pill.admin { color:#b00020; }
              .role-pill.manager { color:#b45309; }
              .role-pill.employee { color:#1151ac; }

              .type-pill { display:inline-flex; align-items:center; justify-content:flex-start; min-height:auto; padding:0; border-radius:0; border:none; font-size:14px !important; font-weight:400; line-height:1.4; box-sizing:border-box; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background:transparent; }
              .type-pill.full { color:#1b7c3f; }
              .type-pill.part { color:#0f766e; }
              .type-pill.contract { color:#6b21a8; }
              .emp-form-layout { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 20px !important; align-items: start !important; margin-bottom: 20px !important; }
              @media (max-width: 1024px) { .emp-form-layout { grid-template-columns: repeat(2, 1fr) !important; } }
              @media (max-width: 768px) { .emp-form-layout { grid-template-columns: 1fr !important; } }
              .emp-form-section { background: #fff; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 0; }
              .emp-form-header { background: #f8fafc; padding: 10px 16px; font-weight: 600; border-bottom: 1px solid #d1d5db; color: #1e293b; font-size: 14px; }
              .emp-form-grid { display: flex; flex-direction: column; gap: 0; padding: 0; }
              .emp-form-group { display: flex; flex-direction: row; gap: 0; align-items: stretch; justify-content: flex-start; border-bottom: 1px solid #d1d5db; }
              .emp-form-group:last-child { border-bottom: none; }
              .emp-form-group label { width: 140px; font-size: 13px; font-weight: 600; color: #475569; margin: 0; padding: 10px 12px; background: #f8fafc; display: flex; align-items: center; border-right: 1px solid #d1d5db; flex-shrink: 0; box-sizing: border-box; }
              .emp-form-group input, .emp-form-group select { flex: 1; padding: 8px 12px; border: none; font-size: 14px; color: #0f172a; outline: none; box-sizing: border-box; background: #fff; border-radius: 0; margin: 0; }
              .emp-form-group input:focus, .emp-form-group select:focus { background: #f1f5f9; box-shadow: inset 0 0 0 1px #3b82f6; }
              .emp-form-group > div { flex: 1; display: flex; align-items: center; border: none !important; background: #fff !important; }
              @media (max-width: 640px) {
                .emp-form-grid { grid-template-columns: 1fr; }
                .admin.employees-wide .card table#list:not(.emp-del-list) thead,
                .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead,
                .admin.employees-wide .card table#list:not(.emp-del-list) thead th,
                .admin:not(.employees-wide) .card table#list:not(.emp-del-list) thead th {
                  top: auto !important;
                  position: static !important;
                }
              }
            `,document.head.appendChild(a))}catch{}}else e.style.display="",e.innerHTML="",e.appendChild(m);else m.style.position="static",m.style.zIndex="auto",h.appendChild(m)}catch{m.style.position="static",m.style.zIndex="auto",h.appendChild(m)}const U=m.querySelector("#toggleAdv");U&&U.addEventListener("click",()=>{const e=m.querySelector(".adv");if(!e)return;e.hasAttribute("hidden")?(e.removeAttribute("hidden"),m.classList.add("open"),U.textContent="\u7C21\u6613\u8868\u793A"):(e.setAttribute("hidden",""),m.classList.remove("open"),U.textContent="\u8A73\u7D30\u30D5\u30A3\u30EB\u30BF\u30FC")});const t={showAll:!1,searchVisible:!1,code:"",q:"",dept:"",role:"",status:"",hireFrom:"",hireTo:"",sortKey:"hire_date",sortDir:"asc",page:1,pageSize:10};try{t.showAll=(f.get("showAll")||"")==="1"||(f.get("showAll")||"").toLowerCase()==="true",t.searchVisible=(f.get("search")||"")==="1"||(f.get("search")||"").toLowerCase()==="true",t.code=(f.get("code")||"").trim().toLowerCase(),t.q=(f.get("q")||"").trim().toLowerCase(),t.dept=f.get("dept")||"",t.role=f.get("role")||"",t.status=f.get("status")||"",t.hireFrom=f.get("hireFrom")||"",t.hireTo=f.get("hireTo")||"",t.sortKey=f.get("sortKey")||t.sortKey,t.sortDir=f.get("sortDir")||t.sortDir,t.page=parseInt(f.get("page")||String(t.page),10)||t.page}catch{}const v=document.createElement("table");v.id="list",v.className="excel-table"+(b==="delete"?" emp-del-list":""),v.style.tableLayout="auto",v.style.width="100%",v.style.minWidth="100%",v.innerHTML=`
    <thead>
      <tr>
        ${b==="delete"?'<th class="sel-col">\u9078\u629E</th>':""}
        <th data-sort="id">\u793E\u54E1\u756A\u53F7</th>
        <th data-sort="username">\u6C0F\u540D</th>
        <th data-sort="email">\u30E1\u30FC\u30EB</th>
        <th data-sort="department">\u90E8\u7F72</th>
        <th data-sort="role">\u5F79\u5272</th>
        <th data-sort="employment_type">\u96C7\u7528\u5F62\u614B</th>
        <th data-sort="employment_status">\u72B6\u614B</th>
        <th data-sort="hire_date">\u5165\u793E\u65E5</th>
        <th>\u64CD\u4F5C</th>
      </tr>
    </thead>
  `;const Q=document.createElement("tbody");v.appendChild(Q);const w=document.createElement("div");if(w.style.margin="8px 0",w.style.display="flex",w.style.alignItems="center",w.style.justifyContent="space-between",w.innerHTML=`
    <div class="pager-left">
      <button type="button" id="empPrev">\u524D\u3078</button>
      <span id="empPageInfo" style="margin:0 8px;"></span>
      <button type="button" id="empNext">\u6B21\u3078</button>
    </div>
    
  `,b==="delete"){if(!k||M!==C)return x;const e=document.createElement("div");e.className="emp-del-toolbar",e.innerHTML='<div class="pager-right" id="empBulkBox"><button type="button" id="empBulkDisable" class="emp-bulk-disable" aria-label="\u9078\u629E\u3092\u7121\u52B9\u5316">\u9078\u629E\u3092\u7121\u52B9\u5316</button></div>',e.style.display="";const a=m.querySelector("#empListBox");a?(a.appendChild(v),a.appendChild(w),m.appendChild(e)):(m.appendChild(v),m.appendChild(w),m.appendChild(e))}else{if(!k||M!==C)return x;const e=document.createElement("div");e.className="form-title",e.textContent="\u3010\u793E\u54E1\u4E00\u89A7\u3011",h.appendChild(e),h.appendChild(v),h.appendChild(w)}if(b==="delete"){v.style.display="",!t.showAll&&!t.searchVisible&&(w.style.display="none");const e=()=>{try{if(v.style.display==="none")return;const a=v.querySelector("thead th:last-child"),l=m.querySelector("#empBulkBox");if(!a||!l)return;const i=v.getBoundingClientRect(),r=a.getBoundingClientRect(),n=Math.max(0,Math.round(r.left-i.left));l.style.marginLeft=`${n}px`}catch{}};if(t.showAll||t.searchVisible){e();try{window.addEventListener("resize",e,{once:!0})}catch{}}}const Z=e=>"EMP"+String(e).padStart(3,"0"),N=e=>{const a=B.find(l=>String(l.id)===String(e));return a?a.name:""},ve=e=>{const a=String(e||"").toLowerCase();return a==="inactive"?"\u7121\u52B9":a==="retired"?"\u9000\u8077":"\u5728\u8077"},ye=e=>{const a=String(e||"").toLowerCase();return`<span class="status-pill ${a==="inactive"?"inactive":a==="retired"?"retired":"active"}">${ve(a)}</span>`},ge=e=>{const a=String(e||"").toLowerCase();return a==="admin"?"\u7BA1\u7406\u8005":a==="manager"?"\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC":a==="employee"?"\u5F93\u696D\u54E1":e||""},xe=e=>{const a=String(e||"").toLowerCase();return a==="full_time"?"\u6B63\u793E\u54E1":a==="part_time"?"\u30D1\u30FC\u30C8\u30FB\u30A2\u30EB\u30D0\u30A4\u30C8":a==="contract"?"\u5951\u7D04\u793E\u54E1":e||""},Se=e=>{const a=String(e||"").toLowerCase();return`<span class="role-pill ${a==="admin"?"admin":a==="manager"?"manager":"employee"}">${ge(a)}</span>`},we=e=>{const a=String(e||"").toLowerCase();return`<span class="type-pill ${a==="full_time"?"full":a==="part_time"?"part":a==="contract"?"contract":"other"}">${xe(a)}</span>`},X=e=>{if(e==null)return"";const a=String(e).trim();return a&&a!=="-"?a:""},de=e=>{const a=X(e);return a||'<span class="unreg" title="\u672A\u767B\u9332">\u2014</span>'},ce=e=>String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),qe=e=>{if(!e||String(e)==="-"||String(e)==="0000-00-00")return'<span class="unreg" title="\u672A\u767B\u9332">\u2014</span>';const a=String(e),l=a.match(/^(\d{4})-(\d{2})-(\d{2})/);if(l)return`${l[1]}/${l[2]}/${l[3]}`;try{const i=new Date(a);if(!isNaN(i.getTime()))return`${i.getFullYear()}/${String(i.getMonth()+1).padStart(2,"0")}/${String(i.getDate()).padStart(2,"0")}`}catch{}return a},pe=()=>{let e=_.slice();t.code&&(e=e.filter(i=>{const r=String(i.employee_code||"").toLowerCase(),n=("emp"+String(i.id).padStart(3,"0")).toLowerCase();return r.includes(t.code)||n.includes(t.code)})),t.q&&(e=e.filter(i=>String(i.username||"").toLowerCase().includes(t.q))),t.dept&&(e=e.filter(i=>String(i.departmentId||"")===String(t.dept))),t.role&&(e=e.filter(i=>String(i.role||"")===String(t.role))),t.status&&(e=e.filter(i=>String(i.employment_status||"")===String(t.status))),t.hireFrom&&(e=e.filter(i=>{const r=i.hire_date;return r&&String(r)>=t.hireFrom})),t.hireTo&&(e=e.filter(i=>{const r=i.hire_date;return r&&String(r)<=t.hireTo}));const a=t.sortKey,l=t.sortDir==="asc"?1:-1;return e.sort((i,r)=>{const n=o=>String(o&&(o.employee_code||Z(o.id))||"").toUpperCase();if(a==="hire_date"){const o=String(i&&i.hire_date||""),d=String(r&&r.hire_date||"");if(o!==d)return o?d?o.localeCompare(d)*l:-1:1;const u=n(i).localeCompare(n(r));return u!==0?u:Number(i?.id||0)-Number(r?.id||0)}const s=a==="department"?N(i.departmentId):a==="id"?n(i):i[a]||"",c=a==="department"?N(r.departmentId):a==="id"?n(r):r[a]||"";return String(s).localeCompare(String(c))*l}),e},Y=()=>{const e=pe(),a=e.length,l=(t.page-1)*t.pageSize,i=e.slice(l,l+t.pageSize);Q.innerHTML="";for(const c of i){const o=document.createElement("tr"),d=String(c.employment_status||"").toLowerCase();o.className=`emp-row ${d||"active"}`;const u=X(c.email),p=X(N(c.departmentId)),g=`<a class="emp-action" href="/ui/admin?tab=employees&detail=${c.id}">\u{1F441} \u8A73\u7D30</a>`,L=`<a class="emp-action" href="/ui/admin?tab=employees&edit=${c.id}">\u270F\uFE0F \u7DE8\u96C6</a>`,$=A==="admin"?`<button type="button" class="emp-action danger" data-action="disable" data-id="${c.id}">\u{1F6AB} \u7121\u52B9\u5316</button>`:"",H=b==="delete"?`${g}${$}`:`${g}${L}${$}`;o.innerHTML=`
        ${b==="delete"?`<td class="sel-col"><input type="checkbox" class="empSel" value="${c.id}"></td>`:""}
        <td class="col-code"><span class="text-pill neutral">${c.employee_code||Z(c.id)}</span></td>
        <td class="col-name"><span class="text-pill"><a href="/ui/admin?tab=employees&detail=${c.id}">${c.username||""}</a></span></td>
        <td class="col-email"${u?` title="${ce(u)}"`:""}><span class="text-pill neutral">${de(u)}</span></td>
        <td class="col-dept"${p?` title="${ce(p)}"`:""}><span class="text-pill neutral">${de(p)}</span></td>
        <td>${Se(c.role)}</td>
        <td>${we(c.employment_type)}</td>
        <td>${ye(c.employment_status)}</td>
        <td>${qe(c.hire_date)}</td>
        <td>
          <div class="emp-action-group">
            ${H}
          </div>
        </td>
      `,Q.appendChild(o)}const r=Math.min(a,l+1),n=Math.min(a,l+i.length),s=h.querySelector("#empPageInfo");if(s){const c=Math.max(1,Math.ceil(a/t.pageSize));if(s.textContent=`${r}-${n} / ${a}`,c<=1){s.style.display="none";const o=h.querySelector("#empPrev"),d=h.querySelector("#empNext");o&&(o.style.display="none"),d&&(d.style.display="none")}else{s.style.display="";const o=h.querySelector("#empPrev"),d=h.querySelector("#empNext");o&&(o.style.display=""),d&&(d.style.display="")}}};Y();const ee=()=>{try{if(!document.querySelector(".topbar .brand #brandDropdown"))return;const a=Array.from(h.querySelectorAll(".empSel:checked")),l=document.querySelector(".topbar .brand #brandEdit");if(l){const i=a.length===1;l.setAttribute("aria-disabled",i?"false":"true")}}catch{}};v.addEventListener("change",e=>{e.target&&e.target.classList&&e.target.classList.contains("empSel")&&ee()}),v.addEventListener("click",e=>{const a=e&&e.target,l=a&&a.closest?a.closest("td"):null;if(!l||e.target.closest(".emp-action-group")||e.target.closest("a")||e.target.matches("input, button, select, label"))return;const i=l.closest("tr"),r=i?i.querySelector(".empSel"):null;r&&(r.checked=!r.checked,ee())}),ee();try{const e=m.querySelector("#tabSearch"),a=m.querySelector("#tabShowAll");if(e&&a){const u=()=>{const p=m.querySelector("#empListBox"),g=m.querySelector(".emp-del-filter tbody"),L=m.querySelector(".emp-del-toolbar");if(t.showAll)e.classList.remove("active"),a.classList.add("active"),v.style.display="",w.style.display="",g&&(g.style.display="none"),p&&(p.style.display=""),L&&(L.style.display="");else{e.classList.add("active"),a.classList.remove("active");const $=!!t.searchVisible;v.style.display=$?"":"none",w.style.display=$?"":"none",g&&(g.style.display=""),p&&(p.style.display=$?"":"none"),L&&(L.style.display=$?"":"none")}};u(),e.addEventListener("click",()=>{t.showAll=!1,t.searchVisible=!1,u();try{const p=new URLSearchParams;t.code&&p.set("code",t.code),t.q&&p.set("q",t.q),t.dept&&p.set("dept",t.dept),t.role&&p.set("role",t.role),t.status&&p.set("status",t.status),t.hireFrom&&p.set("hireFrom",t.hireFrom),t.hireTo&&p.set("hireTo",t.hireTo),t.sortKey&&t.sortKey!=="hire_date"&&p.set("sortKey",t.sortKey),t.sortDir&&t.sortDir!=="asc"&&p.set("sortDir",t.sortDir),t.page&&t.page>1&&p.set("page",String(t.page));const g=p.toString();history.replaceState(null,"",(g?`?tab=employees&${g}`:"?tab=employees")+"#delete")}catch{}}),a.addEventListener("click",()=>{t.showAll=!0,t.searchVisible=!1,u(),Y();try{const p=new URLSearchParams;t.code&&p.set("code",t.code),t.q&&p.set("q",t.q),t.dept&&p.set("dept",t.dept),t.role&&p.set("role",t.role),t.status&&p.set("status",t.status),t.hireFrom&&p.set("hireFrom",t.hireFrom),t.hireTo&&p.set("hireTo",t.hireTo),t.sortKey&&t.sortKey!=="hire_date"&&p.set("sortKey",t.sortKey),t.sortDir&&t.sortDir!=="asc"&&p.set("sortDir",t.sortDir),t.page&&t.page>1&&p.set("page",String(t.page)),p.set("showAll","1");const g=p.toString();history.replaceState(null,"",(g?`?tab=employees&${g}`:"?tab=employees")+"#delete")}catch{}})}const l=m.querySelector(".emp-del-toolbar");l&&(l.style.display=t.showAll||t.searchVisible?"":"none");const i=m.querySelector("#empSearchCode");i&&(i.value=f.get("code")||"");const r=m.querySelector("#empSearchName");r&&(r.value=f.get("q")||"");const n=m.querySelector("#empDeptFilter");n&&(n.value=f.get("dept")||"");const s=m.querySelector("#empRoleFilter");s&&(s.value=f.get("role")||"");const c=m.querySelector("#empStatusFilter");c&&(c.value=f.get("status")||"");const o=m.querySelector("#empHireFrom");o&&(o.value=f.get("hireFrom")||"");const d=m.querySelector("#empHireTo");d&&(d.value=f.get("hireTo")||"")}catch{}if(m.querySelector("#btnEmpSearch").addEventListener("click",()=>{const e=m.querySelector("#empSearchCode");t.code=String(e&&e.value!=null?e.value:"").trim().toLowerCase(),t.q=(m.querySelector("#empSearchName").value||"").trim().toLowerCase(),t.dept=m.querySelector("#empDeptFilter").value||"",t.role=m.querySelector("#empRoleFilter").value||"",t.status=m.querySelector("#empStatusFilter").value||"",t.hireFrom=(m.querySelector("#empHireFrom").value||"").trim(),t.hireTo=(m.querySelector("#empHireTo").value||"").trim(),t.page=1;const a=!!(t.code||t.q||t.dept||t.role||t.status||t.hireFrom||t.hireTo);if(t.searchVisible=a,!a){try{const l=m.querySelector("#empListBox");l&&(v.style.display="none",w.style.display="none",l.style.display="none")}catch{}alert("\u691C\u7D22\u6761\u4EF6\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");return}Y();try{const l=m.querySelector("#empListBox");l&&(v.style.display="",w.style.display="",l.style.display="")}catch{}try{const l=new URLSearchParams;t.code&&l.set("code",t.code),t.showAll&&l.set("showAll","1"),t.searchVisible&&l.set("search","1"),t.q&&l.set("q",t.q),t.dept&&l.set("dept",t.dept),t.role&&l.set("role",t.role),t.status&&l.set("status",t.status),t.hireFrom&&l.set("hireFrom",t.hireFrom),t.hireTo&&l.set("hireTo",t.hireTo),t.sortKey&&t.sortKey!=="hire_date"&&l.set("sortKey",t.sortKey),t.sortDir&&t.sortDir!=="asc"&&l.set("sortDir",t.sortDir),t.page&&t.page>1&&l.set("page",String(t.page));const i=l.toString();history.replaceState(null,"",(i?`?tab=employees&${i}`:"?tab=employees")+"#list")}catch{}}),b==="delete"){const e=async a=>{if(a.target&&a.target.id==="empBulkDisable"){const l=Array.from(h.querySelectorAll(".empSel:checked")).map(c=>c.value);if(!l.length){alert("\u5BFE\u8C61\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044");return}const i=document.createElement("div");i.className="modal-overlay";const r=document.createElement("div");r.className="modal";const n=l.map(c=>{const o=_.find(g=>String(g.id)===String(c)),d=o&&o.employee_code?o.employee_code:Z(c),u=o&&o.username?o.username:"",p=N(o&&o.departmentId?o.departmentId:null);return`<div class="row"><div>${d}</div><div>${u}\u3000${p}</div></div>`}).join("");r.innerHTML=`
          <div class="modal-head">\u26A0\uFE0F\u3000\u793E\u54E1\u7121\u52B9\u5316\u306E\u78BA\u8A8D</div>
          <div class="modal-body">
            <div>\u4EE5\u4E0B\u306E\u793E\u54E1\u3092\u7121\u52B9\u5316\u3057\u307E\u3059\u304B\uFF1F</div>
            <div class="modal-list">${n}</div>
            <div>\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u3059\u3053\u3068\u304C\u3067\u304D\u307E\u305B\u3093\u3002</div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" id="modalConfirmDisable">\u7121\u52B9\u5316\u3059\u308B</button>
            <button type="button" class="btn" id="modalCancelDisable">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
          </div>
        `,i.appendChild(r),document.body.appendChild(i);const s=()=>{try{document.body.removeChild(i)}catch{}};T.add(s),i.addEventListener("click",c=>{c.target===i&&s()}),r.querySelector("#modalCancelDisable").addEventListener("click",s),r.querySelector("#modalConfirmDisable").addEventListener("click",async()=>{const c=r.querySelector("#modalConfirmDisable");c.disabled=!0;try{for(const o of l)try{await le(o,{signal:S})}catch{}for(const o of l){const d=_.find(u=>String(u.id)===String(o));d&&(d.employment_status="inactive")}Y()}finally{s(),alert("\u7121\u52B9\u5316\u3057\u307E\u3057\u305F\uFF08\u72B6\u614B: \u7121\u52B9/\u4F11\u8077\uFF09")}})}};w.addEventListener("click",e),m.addEventListener("click",e)}const $e=w.querySelector("#empPrev"),De=w.querySelector("#empNext");return $e.addEventListener("click",()=>{if(t.page>1){t.page-=1,Y();try{const e=new URLSearchParams;t.q&&e.set("q",t.q),t.dept&&e.set("dept",t.dept),t.role&&e.set("role",t.role),t.status&&e.set("status",t.status),t.hireFrom&&e.set("hireFrom",t.hireFrom),t.hireTo&&e.set("hireTo",t.hireTo),t.sortKey&&t.sortKey!=="hire_date"&&e.set("sortKey",t.sortKey),t.sortDir&&t.sortDir!=="asc"&&e.set("sortDir",t.sortDir),t.page&&t.page>1&&e.set("page",String(t.page));const a=e.toString();history.replaceState(null,"",(a?`?tab=employees&${a}`:"?tab=employees")+"#list")}catch{}}try{const e=m.querySelector(".emp-del-toolbar");e&&(e.style.display=h.querySelectorAll(".empSel").length?"":"none")}catch{}}),De.addEventListener("click",()=>{const e=pe().length,a=Math.max(1,Math.ceil(e/t.pageSize));if(t.page<a){t.page+=1,Y();try{const l=new URLSearchParams;t.q&&l.set("q",t.q),t.dept&&l.set("dept",t.dept),t.role&&l.set("role",t.role),t.status&&l.set("status",t.status),t.hireFrom&&l.set("hireFrom",t.hireFrom),t.hireTo&&l.set("hireTo",t.hireTo),t.sortKey&&t.sortKey!=="hire_date"&&l.set("sortKey",t.sortKey),t.sortDir&&t.sortDir!=="asc"&&l.set("sortDir",t.sortDir),t.page&&t.page>1&&l.set("page",String(t.page));const i=l.toString();history.replaceState(null,"",(i?`?tab=employees&${i}`:"?tab=employees")+"#list")}catch{}}try{const l=m.querySelector(".emp-del-toolbar");l&&(l.style.display=v.querySelectorAll(".empSel").length?"":"none")}catch{}}),T.add(ke(v,'button[data-action="disable"]',"click",async(e,a)=>{e.preventDefault();try{e.stopPropagation()}catch{}const l=a.dataset.id||"";if(l&&confirm("\u3053\u306E\u793E\u54E1\u3092\u7121\u52B9\u5316\u3057\u307E\u3059\u304B\uFF1F"))try{if(await le(l,{signal:S}),!k)return;const i=_.find(r=>String(r.id)===String(l));i&&(i.employment_status="inactive"),alert("\u7121\u52B9\u5316\u3057\u307E\u3057\u305F\uFF08\u72B6\u614B: \u7121\u52B9/\u4F11\u8077\uFF09"),Y()}catch(i){if(i&&i.name==="AbortError")return;alert(String(i&&i.message?i.message:"\u7121\u52B9\u5316\u306B\u5931\u6557\u3057\u307E\u3057\u305F"))}})),v.addEventListener("click",async e=>{const a=e&&e.target,l=a&&a.closest?a.closest("a"):null;if(l){const i=l.getAttribute("href")||"";if(i.startsWith("/ui/admin?tab=employees&detail=")||i.startsWith("/ui/admin?tab=employees&edit=")){e.preventDefault();const r=new URLSearchParams,n=m.querySelector("#empSearchName"),s=m.querySelector("#empDeptFilter"),c=m.querySelector("#empRoleFilter"),o=m.querySelector("#empStatusFilter"),d=m.querySelector("#empHireFrom"),u=m.querySelector("#empHireTo"),p=String(n&&n.value!=null?n.value:"").trim().toLowerCase(),g=s&&s.value!=null?s.value:"",L=c&&c.value!=null?c.value:"",$=o&&o.value!=null?o.value:"",H=d&&d.value!=null?d.value:"",z=u&&u.value!=null?u.value:"";p&&r.set("q",p),g&&r.set("dept",g),L&&r.set("role",L),$&&r.set("status",$),H&&r.set("hireFrom",H),z&&r.set("hireTo",z),t&&t.sortKey&&t.sortKey!=="hire_date"&&r.set("sortKey",t.sortKey),t&&t.sortDir&&t.sortDir!=="asc"&&r.set("sortDir",t.sortDir),t&&t.page&&t.page>1&&r.set("page",String(t.page));const j=r.toString(),y=i+(j?"&"+j:"");window.location.href=y;return}}}),P(),x}const Me=Ee({mount:Te});async function Ke(h){return Me.mount(h)}export{Me as employeesPage,Ke as mountEmployees};
